// PaperScroller
// =============


// `PaperScroller` wraps the paper root element and implements panning and centering of the paper.

// Example usage:

//      var paperScroller = new PaperScroller;
//      var paper = new Paper({ el: paperScroller.el });
//      paperScroller.options.paper = paper;
//      $appElement.append(paperScroller.render().el);

//      paperScroller.center();
//      paper.on('blank:pointerdown', paperScroller.startPanning);

import $ from 'jquery';
import { V, g, util, dia, mvc, env } from 'jointjs/src/core.mjs';

export const PaperScroller = mvc.View.extend({

    className: 'paper-scroller',

    options: {
        paper: undefined,
        // Default padding makes sure the paper inside the paperScroller is always panable
        // all the way left, right, bottom and top.
        // It also makes sure that there is always at least a fragment of the paper visible.
        // Example usage:
        //   padding: 10
        //   padding: { left: 20, right: 20 }
        //   padding: function() { return 10; }
        padding: function() {

            var clientSize = this.getClientSize();
            var minVisibleSize = Math.max(this.options.minVisiblePaperSize, 1) || 1;
            var padding = {};

            padding.left = padding.right = Math.max(clientSize.width - minVisibleSize, 0);
            padding.top = padding.bottom = Math.max(clientSize.height - minVisibleSize, 0);

            return padding;
        },
        scrollWhileDragging: false,
        // Minimal size (px) of the paper that has to stay visible.
        // Used by the default padding method only.
        minVisiblePaperSize: 50,
        autoResizePaper: false,
        baseWidth: undefined,
        baseHeight: undefined,
        contentOptions: undefined,
        cursor: 'default'
    },

    // Internal padding storage
    _padding: { left: 0, top: 0 },

    init: function() {

        util.bindAll(this, 'startPanning', 'stopPanning', 'pan', 'onBackgroundEvent');

        const { options, el } = this;
        const { paper, autoResizePaper, scrollWhileDragging, cursor } = options;

        // keep scale values for a quicker access
        var initScale = paper.scale();
        this._sx = initScale.sx;
        this._sy = initScale.sy;

        // if the base paper dimension is not specified use the paper size.
        options.baseWidth === undefined && (options.baseWidth = paper.options.width);
        options.baseHeight === undefined && (options.baseHeight = paper.options.height);

        this.$background = $('<div/>').addClass('paper-scroller-background')
            .css({ width: paper.options.width, height: paper.options.height })
            .append(paper.el)
            .appendTo(el);

        this.listenTo(paper, 'scale', this.onScale)
            .listenTo(paper, 'resize', this.onResize)
            .listenTo(paper, 'beforeprint beforeexport', this.storeScrollPosition)
            .listenTo(paper, 'afterprint afterexport', this.restoreScrollPosition);

        // automatically resize the paper
        if (autoResizePaper) {
            this.listenTo(paper, 'render:done', this.onPaperRenderDone);
        }

        if (scrollWhileDragging) {
            this.listenTo(paper, 'cell:pointermove', this.onCellPointermove);
            this.listenTo(paper, 'cell:pointerup', this.onCellPointerup);
        }

        this.$el.on('scroll', (evt) => this.trigger('scroll', evt));

        this.delegateBackgroundEvents();
        this.setCursor(cursor);
    },

    onCellPointermove: function(_, evt, x, y) {
        const { scrollWhileDragging } = this.options;
        if (!scrollWhileDragging) return;
        this.scrollWhileDragging(evt, x, y, scrollWhileDragging);
    },

    onCellPointerup: function(_, evt) {
        this.stopScrollWhileDragging(evt);
    },

    scrollWhileDragging: function(evt, x, y, opt = {}) {
        const { el } = this;
        const {
            interval = 25,
            padding = -20,
            scrollingFunction = (distance) => distance < 20 ? 5 : 20
        } = opt;

        let { scrollId } = this.eventData(evt);

        const coordinates = new g.Point(x, y);
        const { top, left, right, bottom } = util.normalizeSides(padding);
        const area = this.getVisibleArea().moveAndExpand({
            x: -top,
            y: -left,
            width: left + right,
            height: top + bottom
        });

        if (area.containsPoint(coordinates)) {
            clearInterval(scrollId);
            this.eventData(evt, { scrollId: null });
            return;
        }

        const areaPoint = area.pointNearestToPoint(coordinates);
        const distance = areaPoint.distance(coordinates);
        const scrollPerTick = scrollingFunction.call(this, distance, evt);

        // Find Scroll Direction
        const { x: areaX, y: areaY, width: areaWidth, height: areaHeight } = area;
        const scrollX = (x < areaX) ? -1 : (x > areaX + areaWidth) ? 1 : 0;
        const scrollY = (y < areaY) ? -1 : (y > areaY + areaHeight) ? 1 : 0;

        this.eventData(evt, { scrollX, scrollY, scrollPerTick, container: el });

        if (scrollId) return;

        const data = this.eventData(evt);
        // Start Scrolling
        scrollId = setInterval(({ scrollPerTick, scrollX, scrollY, container }) => {
            container.scrollLeft += scrollPerTick * scrollX;
            container.scrollTop += scrollPerTick * scrollY;
        }, interval, data);

        data.scrollId = scrollId;
    },

    stopScrollWhileDragging: function(evt) {
        const { scrollId } = this.eventData(evt);
        if (scrollId) clearInterval(scrollId);
    },

    onPaperRenderDone: function(stats) {
        // Adjust paper for cell updates only
        if (stats.priority < 2) this.adjustPaper();
    },

    lock: function() {
        this.$el.css('overflow', 'hidden');
        return this;
    },

    unlock: function() {
        this.$el.css('overflow', 'scroll');
        return this;
    },

    setCursor: function(cursor) {

        switch (cursor) {
            case 'grab':
                // Make a special case for the cursor above
                // due to bad support across browsers.
                // It's handled in `layout.css`.
                this.$el.css('cursor', '');
                break;
            default:
                this.$el.css('cursor', cursor);
                break;
        }

        this.$el.attr('data-cursor', cursor);
        this.options.cursor = cursor;

        return this;
    },

    // Set up listeners for passing events from outside the paper to the paper
    delegateBackgroundEvents: function(events) {

        events || (events = util.result(this.options.paper, 'events'));

        var normalizedEvents = this.paperEvents = Object.keys(events || {}).reduce(normalizeEvents.bind(this), {});

        Object.keys(normalizedEvents).forEach(delegateBackgroundEvent, this);

        function normalizeEvents(res, event) {
            var listener = events[event];
            // skip events with selectors
            if (event.indexOf(' ') === -1) {
                res[event] = util.isFunction(listener) ? listener : this.options.paper[listener];
            }
            return res;
        }

        function delegateBackgroundEvent(event) {
            // Sending event data with `guarded=false` to prevent events from
            // being guarded by the paper.
            this.delegate(event, { guarded: false }, this.onBackgroundEvent);
        }

        return this;
    },

    // Pass the event outside the paper to the paper.
    onBackgroundEvent: function(evt) {

        if (this.$background.is(evt.target)) {
            var listener = this.paperEvents[evt.type];
            if (util.isFunction(listener)) {
                listener.apply(this.options.paper, arguments);
            }
        }
    },

    onResize: function() {

        // Move scroller so the user sees the same area as before the resizing.
        if (this._center) this.center(this._center.x, this._center.y);
    },

    onScale: function(sx, sy, ox, oy) {

        this.adjustScale(sx, sy);

        // update scale values for a quicker access
        this._sx = sx;
        this._sy = sy;

        // Move scroller to scale origin.
        if (ox || oy) this.center(ox, oy);

        if (typeof this.options.contentOptions === 'function') this.adjustPaper();
    },

    storeScrollPosition: function() {

        this._scrollLeftBeforePrint = this.el.scrollLeft;
        this._scrollTopBeforePrint = this.el.scrollTop;
    },

    restoreScrollPosition: function() {

        // Set the paper element to the scroll position before printing.
        this.el.scrollLeft = this._scrollLeftBeforePrint;
        this.el.scrollTop = this._scrollTopBeforePrint;

        // Clean-up.
        this._scrollLeftBeforePrint = null;
        this._scrollTopBeforePrint = null;
    },

    beforePaperManipulation: function() {

        if (env.test('msie') || env.test('msedge')) {
            // IE is trying to show every frame while we manipulate the paper.
            // That makes the viewport kind of jumping while zooming for example.
            // Make the paperScroller invisible fixes this.
            // MSEDGE seems to have a problem with text positions after the animation.
            this.$el.css('visibility', 'hidden');
        }
    },

    afterPaperManipulation: function() {

        if (env.test('msie') || env.test('msedge')) {
            this.$el.css('visibility', 'visible');
        }
    },

    clientToLocalPoint: function(x, y) {

        var ctm = this.options.paper.matrix();

        x += this.el.scrollLeft - this._padding.left - ctm.e;
        x /= ctm.a;


        y += this.el.scrollTop - this._padding.top - ctm.f;
        y /= ctm.d;

        return new g.Point(x, y);
    },

    localToBackgroundPoint: function(x, y) {

        var localPoint = new g.Point(x, y);
        var ctm = this.options.paper.matrix();
        var padding = this._padding;
        return V.transformPoint(localPoint, ctm).offset(padding.left, padding.top);
    },

    adjustPaper: function() {

        // store the current mid point of visible paper area, so we can center the paper
        // to the same point after the resize
        var clientSize = this.getClientSize();
        this._center = this.clientToLocalPoint(clientSize.width / 2, clientSize.height / 2);

        var contentOptions = this.options.contentOptions;
        if (typeof contentOptions === 'function') {
            contentOptions = contentOptions.call(this, this);
        }

        var options = util.assign({
            gridWidth: this.options.baseWidth,
            gridHeight: this.options.baseHeight,
            allowNewOrigin: 'negative'
        }, contentOptions);

        this.options.paper.fitToContent(this.transformContentOptions(options));

        return this;
    },

    adjustScale: function(sx, sy) {

        var paperOptions = this.options.paper.options;
        var fx = sx / this._sx;
        var fy = sy / this._sy;

        this.options.paper.setOrigin(paperOptions.origin.x * fx, paperOptions.origin.y * fy);
        this.options.paper.setDimensions(paperOptions.width * fx, paperOptions.height * fy);
    },

    // Recalculates content options taking the current scale into account.
    transformContentOptions: function(opt) {

        var sx = this._sx;
        var sy = this._sy;

        if (opt.gridWidth) opt.gridWidth *= sx;
        if (opt.gridHeight) opt.gridHeight *= sy;
        if (opt.minWidth) opt.minWidth *= sx;
        if (opt.minHeight) opt.minHeight *= sy;

        if (util.isObject(opt.padding)) {
            opt.padding = {
                left: (opt.padding.left || 0) * sx,
                right: (opt.padding.right || 0) * sx,
                top: (opt.padding.top || 0) * sy,
                bottom: (opt.padding.bottom || 0) * sy
            };
        } else if (util.isNumber(opt.padding)) {
            opt.padding = opt.padding * sx;
        }

        return opt;
    },

    // Adjust the paper position so the point [x,y] (local units) is moved
    // to the center of paperScroller element.
    // If neither `x` nor `y` provided, center to paper center.
    // If `x` or `y` not provided, only center in the dimensions we know.
    // Difference from scroll() is that center() adds padding to paper to
    // make sure x, y will actually be centered.
    center: function(x, y, opt) {

        var ctm = this.options.paper.matrix();

        // the paper rectangle
        // x1,y1 ---------
        // |             |
        // ----------- x2,y2
        var x1 = -ctm.e;
        var y1 = -ctm.f;
        var x2 = x1 + this.options.paper.options.width;
        var y2 = y1 + this.options.paper.options.height;

        var xIsNumber = util.isNumber(x);
        var yIsNumber = util.isNumber(y);

        var localOpt;

        if (!xIsNumber && !yIsNumber) {
            // no coordinates provided

            localOpt = x;

            // find center of the paper
            x = (x1 + x2) / 2;
            y = (y1 + y2) / 2;

        } else {
            localOpt = opt;

            // if one of the coords not provided, substitute with middle
            // of visible area in that dimension
            var visibleAreaCenter = this.getVisibleArea().center();

            if (xIsNumber) x *= ctm.a; // convert x to local
            else x = visibleAreaCenter.x; // default

            if (yIsNumber) y *= ctm.d; // convert y to local
            else y = visibleAreaCenter.y; // default
        }

        var clientSize = this.getClientSize();

        var p = this.getPadding();
        var cx = clientSize.width / 2;
        var cy = clientSize.height / 2;

        // calculate paddings
        var left = cx - p.left - x + x1;
        var right = cx - p.right + x - x2;
        var top = cy - p.top - y + y1;
        var bottom = cy - p.bottom + y - y2;

        this.addPadding(
            Math.max(left, 0),
            Math.max(right, 0),
            Math.max(top, 0),
            Math.max(bottom, 0)
        );

        this.scroll(x, y, localOpt);

        return this;
    },

    // Position the paper so that the center of content (local units) is at
    // the center of client area.
    centerContent: function(opt) {

        return this.positionContent('center', opt);
    },

    // Position the paper so that the center of element (local units) is at
    // the center of client area.
    centerElement: function(element, opt) {

        this.checkElement(element, 'centerElement');

        return this.positionElement(element, 'center', opt);
    },

    // Position the paper so that the `positionName`-determined point of
    // content is at `positionName`-determined point of client area.
    positionContent: function(positionName, opt) {

        var contentArea = this.options.paper.getContentArea(opt); // local units
        return this.positionRect(contentArea, positionName, opt);
    },

    // Position the paper so that the `positionName`-determined point of
    // element area is at `positionName`-determined point of client area.
    positionElement: function(element, positionName, opt) {

        this.checkElement(element, 'positionElement');

        var elementArea = element.getBBox(); // local units
        return this.positionRect(elementArea, positionName, opt);
    },

    // Position the paper so that the `positionName`-determined point of
    // `rect` is at `positionName`-determined point of client area.
    // For example, to position the paper so that the top-left corner of
    // `rect` is in the top-left corner of client area and 10px away from
    // edges:
    // - `positionRect('top-left', { padding: 10 });`
    positionRect: function(rect, positionName, opt) {

        var point;
        switch (positionName) {
            case 'center':
                point = rect.center();
                return this.positionPoint(point, '50%', '50%', opt);

            case 'top':
                point = rect.topMiddle();
                return this.positionPoint(point, '50%', 0, opt);

            case 'top-right':
                point = rect.topRight();
                return this.positionPoint(point, '100%', 0, opt);

            case 'right':
                point = rect.rightMiddle();
                return this.positionPoint(point, '100%', '50%', opt);

            case 'bottom-right':
                point = rect.bottomRight();
                return this.positionPoint(point, '100%', '100%', opt);

            case 'bottom':
                point = rect.bottomMiddle();
                return this.positionPoint(point, '50%', '100%', opt);

            case 'bottom-left':
                point = rect.bottomLeft();
                return this.positionPoint(point, 0, '100%', opt);

            case 'left':
                point = rect.leftMiddle();
                return this.positionPoint(point, 0, '50%', opt);

            case 'top-left':
                point = rect.topLeft();
                return this.positionPoint(point, 0, 0, opt);

            default:
                throw new Error('Provided positionName (\'' + positionName + '\') was not recognized.')
        }
    },

    // Position the paper so that `point` is `x` and `y` away from the (left
    // and top) edges of the client area.
    // Optional padding from edges with `opt.padding`.
    // Optional animation with `opt.animation`.
    // Percentages are allowed; they are understood with reference to the area
    // of the client area that is inside padding.
    // Negative values/percentages mean start counting from the other edge of
    // the client area (right and/or bottom).
    positionPoint: function(point, x, y, opt) {

        opt = opt || {};
        var padding = util.normalizeSides(opt.padding); // client units

        var clientRect = new g.Rect(this.getClientSize());
        var restrictedClientRect = clientRect.clone().moveAndExpand({
            x: padding.left,
            y: padding.top,
            width: -padding.right - padding.left,
            height: -padding.top - padding.bottom
        });

        var xIsPercentage = util.isPercentage(x);
        x = parseFloat(x); // ignores the final %
        if (xIsPercentage) x = (x / 100) * Math.max(0, restrictedClientRect.width);
        if (x < 0) x = restrictedClientRect.width + x; // if negative, start counting from other edge

        var yIsPercentage = util.isPercentage(y);
        y = parseFloat(y); // ignores the final %
        if (yIsPercentage) y = (y / 100) * Math.max(0, restrictedClientRect.height);
        if (y < 0) y = restrictedClientRect.height + y; // if negative, start counting from other edge

        var target = restrictedClientRect.origin().offset(x, y); // client units
        var center = clientRect.center();
        var centerVector = center.difference(target);

        var scale = this.zoom();

        var localCenterVector = centerVector.scale(1 / scale, 1 / scale); // local units
        var localCenter = point.clone().offset(localCenterVector);
        return this.center(localCenter.x, localCenter.y, opt);
    },

    // Put the point at [x,y] in the paper (local units) to the center of
    // paperScroller window.
    // Less aggresive than center() as it only changes position of scrollbars
    // without adding paddings - it won't actually move view onto the position
    // if there isn't enough room for it!
    // If `x` or `y` is not provided, only scroll in the directions we know.
    // Optionally you can specify `animation` key in option argument
    // to make the scroll animated; object is passed into $.animate
    scroll: function(x, y, opt) {

        var ctm = this.options.paper.matrix();

        var clientSize = this.getClientSize();

        var change = {};

        if (util.isNumber(x)) {
            var cx = clientSize.width / 2;
            change['scrollLeft'] = x - cx + ctm.e + (this._padding.left || 0);
        }

        if (util.isNumber(y)) {
            var cy = clientSize.height / 2;
            change['scrollTop'] = y - cy + ctm.f + (this._padding.top || 0);
        }

        if (opt && opt.animation) this.$el.animate(change, opt.animation);
        else this.$el.prop(change);
    },

    // Simple wrapper around scroll method that finds center of paper
    // content and scrolls to it.
    // Accepts same `opt` objects as the scroll() method (`opt.animation`).
    scrollToContent: function(opt) {

        var center = this.options.paper.getContentArea(opt).center();
        var sx = this._sx;
        var sy = this._sy;

        center.x *= sx;
        center.y *= sy;

        return this.scroll(center.x, center.y, opt);
    },

    // Simple wrapper around scroll method that finds center of specified
    // element and scrolls to it.
    // Accepts same `opt` objects as the scroll() method (`opt.animation`).
    scrollToElement: function(element, opt) {

        this.checkElement(element, 'scrollToElement');

        var center = element.getBBox().center();
        var sx = this._sx;
        var sy = this._sy;

        center.x *= sx;
        center.y *= sy;

        return this.scroll(center.x, center.y, opt);
    },

    // Position the paper inside the paper wrapper and resize the wrapper.
    addPadding: function(left, right, top, bottom) {

        var base = this.getPadding();

        var padding = this._padding = {
            left: Math.round(base.left + (left || 0)),
            top: Math.round(base.top + (top || 0)),
            bottom: Math.round(base.bottom + (bottom || 0)),
            right: Math.round(base.right + (right || 0))
        };

        this.$background.css({
            width: padding.left + this.options.paper.options.width + padding.right,
            height: padding.top + this.options.paper.options.height + padding.bottom
        });
        this.options.paper.$el.css({
            left: padding.left,
            top: padding.top
        });

        return this;
    },

    zoom: function(value, opt = {}) {

        if (value === undefined) {
            return this._sx;
        }

        var clientSize = this.getClientSize();

        var center = this.clientToLocalPoint(clientSize.width / 2, clientSize.height / 2);
        var sx = value;
        var sy = value;
        var ox;
        var oy;

        if (!opt.absolute) {
            sx += this._sx;
            sy += this._sy;
        }

        if (opt.grid) {
            sx = Math.round(sx / opt.grid) * opt.grid;
            sy = Math.round(sy / opt.grid) * opt.grid;
        }

        // check if the new scale won't exceed the given boundaries
        if (opt.max) {
            sx = Math.min(opt.max, sx);
            sy = Math.min(opt.max, sy);
        }

        if (opt.min) {
            sx = Math.max(opt.min, sx);
            sy = Math.max(opt.min, sy);
        }

        if (opt.ox === undefined || opt.oy === undefined) {

            // if the origin is not specified find the center of the paper's visible area.
            ox = center.x;
            oy = center.y;

        } else {

            var fsx = sx / this._sx;
            var fsy = sy / this._sy;

            ox = opt.ox - ((opt.ox - center.x) / fsx);
            oy = opt.oy - ((opt.oy - center.y) / fsy);
        }

        this.beforePaperManipulation();

        this.options.paper.scale(sx, sy);
        this.center(ox, oy);

        this.afterPaperManipulation();

        return this;
    },

    zoomToRect: function(rect, opt = {}) {

        // rect accepts simple objects with `{ x, y, width, height }` (= `dia.BBox`)
        rect = new g.Rect(rect);

        const paper = this.options.paper;
        const paperOrigin = util.assign({}, paper.options.origin);

        // `opt.fittingBBox` is the exact size of this PaperScroller's viewport
        opt.fittingBBox = opt.fittingBBox || util.assign({}, new g.Point(paperOrigin), {
            width: this.$el.width(),
            height: this.$el.height()
        });

        // `opt.contentArea` is the area we want to zoom to = `rect`
        opt.contentArea = rect;

        this.beforePaperManipulation();

        // scale the paper so the fitting bbox fits `rect`
        // (if no `rect` was provided, then no `opt.contentArea` was set)
        // (and thus, `paper.scaleContentToFit()` scales to fit all graph content)
        paper.scaleContentToFit(opt);

        // center the paper at the center of `rect`
        const center = rect.center();
        this.adjustPaper();
        this.center(center.x, center.y);

        this.afterPaperManipulation();

        return this;
    },

    zoomToFit: function(opt = {}) {

        const paper = this.options.paper;
        const contentArea = paper.getContentArea(opt);

        this.zoomToRect(contentArea, opt);
        return this;
    },

    transitionClassName: 'transition-in-progress',
    transitionEventName: 'transitionend.paper-scroller-transition',

    transitionToPoint: function(x, y, opt) {

        // Allow both `transition(point, options)` and `transition(x, y, options)`
        if (util.isObject(x)) {
            opt = y;
            y = x.y;
            x = x.x;
        }

        opt || (opt = {});

        var oldScale = this._sx;
        var scale = Math.max(opt.scale || oldScale, 1e-6);

        var clientSize = this.getClientSize();

        var localPoint = new g.Point(x, y);
        var localCenter = this.clientToLocalPoint(clientSize.width / 2, clientSize.height / 2);
        var transform, transformOrigin;

        if (oldScale === scale) {
            // Tranlate only
            var translate = localCenter.difference(localPoint).scale(oldScale, oldScale).round();
            transform = 'translate(' + translate.x + 'px,' + translate.y + 'px)';

        } else {
            // Translate and scale concurrently
            var distance = scale / (oldScale - scale) * localPoint.distance(localCenter);
            var localOrigin = localCenter.clone().move(localPoint, distance);
            var origin = this.localToBackgroundPoint(localOrigin).round();
            transform = 'scale(' + (scale / oldScale) + ')';
            transformOrigin = origin.x + 'px ' + origin.y + 'px';
        }

        this.$el
            .addClass(this.transitionClassName);
        this.$background
            .off(this.transitionEventName)
            .on(this.transitionEventName, function(evt) {

                var paperScroller = this.paperScroller;
                paperScroller.syncTransition(this.scale, { x: this.x, y: this.y });
                // Trigger a callback
                var onTransitionEnd = this.onTransitionEnd;
                if (util.isFunction(onTransitionEnd)) {
                    onTransitionEnd.call(paperScroller, evt);
                }
            }.bind({
                // TransitionEnd handler context
                paperScroller: this,
                scale: scale,
                x: x,
                y: y,
                onTransitionEnd: opt.onTransitionEnd
            }))
            .css({
                transition: 'transform',
                transitionDuration: opt.duration || '1s',
                transitionDelay: opt.delay,
                transitionTimingFunction: opt.timingFunction,
                transformOrigin: transformOrigin,
                transform: transform
            });

        return this;
    },

    syncTransition: function(scale, center) {

        this.beforePaperManipulation();

        this.options.paper.scale(scale);

        this.removeTransition()
            .center(center.x, center.y);

        this.afterPaperManipulation();

        return this;
    },

    removeTransition: function() {

        this.$el
            .removeClass(this.transitionClassName);
        this.$background
            .off(this.transitionEventName)
            .css({
                transition: '',
                transitionDuration: '',
                transitionDelay: '',
                transitionTimingFunction: '',
                transform: '',
                transformOrigin: ''
            });

        return this;
    },

    transitionToRect: function(rect, opt = {}) {

        rect = new g.Rect(rect);
        const maxScale = opt.maxScale || Infinity;
        const minScale = opt.minScale || Number.MIN_VALUE;
        const scaleGrid = opt.scaleGrid || null;
        const visibility = opt.visibility || 1;
        const center = (opt.center) ? new g.Point(opt.center) : rect.center();

        const clientSize = this.getClientSize();

        const clientWidth = clientSize.width * visibility;
        const clientHeight = clientSize.height * visibility;
        const clientRect = new g.Rect({
            x: center.x - clientWidth / 2,
            y: center.y - clientHeight / 2,
            width: clientWidth,
            height: clientHeight
        });

        // scale the paper so all the corner points are in the viewport.
        let scale = clientRect.maxRectUniformScaleToFit(rect, center);
        scale = Math.min(scale, maxScale);
        if (scaleGrid) {
            scale = Math.floor(scale / scaleGrid) * scaleGrid;
        }
        scale = Math.max(minScale, scale);

        this.transitionToPoint(center, util.defaults({ scale: scale }, opt));
        return this;
    },

    startPanning: function(evt) {

        evt = util.normalizeEvent(evt);

        this._clientX = evt.clientX;
        this._clientY = evt.clientY;

        this.$el.addClass('is-panning');
        this.trigger('pan:start', evt);

        $(document.body).on({
            'mousemove.panning touchmove.panning': this.pan,
            'mouseup.panning touchend.panning': this.stopPanning
        });

        $(window).on('mouseup.panning', this.stopPanning);
    },

    pan: function(evt) {

        evt = util.normalizeEvent(evt);

        var dx = evt.clientX - this._clientX;
        var dy = evt.clientY - this._clientY;

        this.el.scrollTop -= dy;
        this.el.scrollLeft -= dx;

        this._clientX = evt.clientX;
        this._clientY = evt.clientY;
    },

    stopPanning: function(evt) {

        $(document.body).off('.panning');
        $(window).off('.panning');
        this.$el.removeClass('is-panning');
        this.trigger('pan:stop', evt);
    },

    // Return the client dimensions in pixels as reported by browser.
    // "What is the size of the window through which the user can see the paper?"
    getClientSize: function() {
        const { clientWidth, clientHeight } = this.el;
        return { width: clientWidth, height: clientHeight };
    },

    getPadding: function() {

        var padding = this.options.padding;
        if (util.isFunction(padding)) {
            padding = padding.call(this, this);
        }

        return util.normalizeSides(padding);
    },

    // Return the dimensions of the visible area in local units.
    // "What part of the paper can be seen by the user, taking zooming and panning into account?"
    getVisibleArea: function() {

        var ctm = this.options.paper.matrix();
        var clientSize = this.getClientSize(); // client units

        var area = {
            x: this.el.scrollLeft || 0,
            y: this.el.scrollTop || 0,
            width: clientSize.width,
            height: clientSize.height
        }; // client units

        var transformedArea = V.transformRect(area, ctm.inverse()); // local units

        transformedArea.x -= (this._padding.left || 0) / this._sx;
        transformedArea.y -= (this._padding.top || 0) / this._sy;

        return new g.Rect(transformedArea);
    },

    isElementVisible: function(element, opt) {

        this.checkElement(element, 'isElementVisible');

        opt = opt || {};
        var method = opt.strict ? 'containsRect' : 'intersect';
        return !!this.getVisibleArea()[method](element.getBBox());
    },

    isPointVisible: function(point) {

        return this.getVisibleArea().containsPoint(point);
    },

    // some method require element only because link is missing some tools (eg. bbox)
    checkElement: function(element, methodName) {

        if (!(element && element instanceof dia.Element)) {
            throw new TypeError('ui.PaperScroller.' + methodName + '() accepts instance of dia.Element only');
        }
    },

    onRemove: function() {

        this.stopPanning();
    }

});

env.addTest('msie', function() {
    var userAgent = window.navigator.userAgent;
    return userAgent.indexOf('MSIE') !== -1 || userAgent.indexOf('Trident') !== -1;
});

env.addTest('msedge', function() {
    return /Edge\/\d+/.test(window.navigator.userAgent);
});
