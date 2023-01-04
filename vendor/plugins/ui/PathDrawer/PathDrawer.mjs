import $ from 'jquery';
import { V, g, util, mvc } from 'jointjs/src/core.mjs';

export const PathDrawer = mvc.View.extend({

    tagName: 'g',

    svgElement: true,

    className: 'path-drawer',

    events: {
        'mousedown .start-point': 'onStartPointPointerDown',
        'mousedown': 'onPointerDown',
        //'mousemove': 'onPointerMove',
        //'mouseup': 'onPointerUp',
        'touchstart .start-point': 'onStartPointPointerDown',
        'touchstart': 'onPointerDown',
        //'touchmove': 'onPointerMove',
        //'touchend': 'onPointerUp',
        'dblclick': 'onDoubleClick',
        'contextmenu': 'onContextMenu'
    },

    documentEvents: {
        'mousemove': 'onPointerMove',
        'touchmove': 'onPointerMove',
        'mouseup': 'onPointerUp',
        'touchend': 'onPointerUp',
        'touchcancel': 'onPointerUp',
    },

    options: {
        pathAttributes: {
            'class': null,
            'fill': '#ffffff',
            'stroke': '#000000',
            'stroke-width': 1,
            'pointer-events': 'none'
        },
        startPointMarkup: '<circle r="5"/>',
        snapRadius: 0
    },

    init: function() {

        var svgTarget = this.svgTarget = V(this.options.target);

        this.$document = $(svgTarget.node.ownerDocument);

        this.action = 'awaiting-input';

        this.render();
    },

    onRemove: function() {

        var pathNode = this.pathNode;

        if (pathNode) {
            V(pathNode).remove();
        }

        this.clear();
    },

    clear: function() {

        var pathNode = this.pathNode;

        if (pathNode && pathNode.pathSegList.numberOfItems <= 1) {
            V(pathNode).remove();
        }

        this.svgStart.remove();
        this.svgControl.remove();

        this.pathNode = null;

        this.undelegateDocumentEvents();
        this.action = 'awaiting-input';

        this.trigger('clear');
    },

    render: function() {

        var options = this.options;

        this.svgPathTemplate = V('path').attr(options.pathAttributes);

        this.svgStart = V(options.startPointMarkup).addClass('start-point');
        this.svgControl = V('path').addClass('control-path');

        this.vel.append(V('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: 'transparent', stroke: 'none' }));

        this.svgTarget.append(this.el)

        return this;
    },

    createPath: function(x, y) {

        var path = this.svgPathTemplate.clone();
        var pathNode = this.pathNode = path.node;
        var start = this.svgStart.translate(x, y, { absolute: true });

        this.trigger('path:create', pathNode);

        this.addMoveSegment(x, y);

        this.vel.before(path);
        this.vel.append(start);
    },

    closePath: function() {

        var el = this.pathNode;

        var first = el.pathSegList.getItem(0);
        var last = el.pathSegList.getItem(el.pathSegList.numberOfItems - 1);

        if (last.pathSegType == SVGPathSeg.PATHSEG_LINETO_ABS) {

            // if last segment is lineto
            // replace with closepath
            el.pathSegList.replaceItem(el.createSVGPathSegClosePath(), el.pathSegList.numberOfItems - 1);

        } else {

            // if last segment is curveto
            // make sure that last segment ends exactly at beginning of path
            last.x = first.x;
            last.y = first.y;

            // add closepath behind it
            el.pathSegList.appendItem(el.createSVGPathSegClosePath());

        }

        this.finishPath('path:close');
    },

    finishPath: function(pathFinishedEventType) {

        var el = this.pathNode;

        if (el && this.numberOfVisibleSegments() > 0) {

            // the new path is not just a single point; users can see it
            this.trigger('path:finish', el);
            this.trigger(pathFinishedEventType, el);

        } else {

            // the path is just a single point; users cannot see it
            // different event is triggered
            this.trigger('path:abort', el);

        }

        this.clear();
    },

    numberOfVisibleSegments: function() {

        var el = this.pathNode;

        var numberOfVisibleSegments = el.pathSegList.numberOfItems;

        numberOfVisibleSegments -= 1; // the initial moveto segment
        if (el.pathSegList.getItem(el.pathSegList.numberOfItems - 1).pathSegType == SVGPathSeg.PATHSEG_CLOSEPATH) {
            numberOfVisibleSegments -= 1; // if path is invisible, adding Z does not make it visible
        }

        return numberOfVisibleSegments;
    },

    addMoveSegment: function(x, y) {

        var el = this.pathNode;

        var move = el.createSVGPathSegMovetoAbs(x, y);

        el.pathSegList.appendItem(move);

        this.trigger('path:segment:add', el);
        this.trigger('path:move-segment:add', el);
    },

    addLineSegment: function(x, y) {

        var el = this.pathNode;

        var line = el.createSVGPathSegLinetoAbs(x, y);

        el.pathSegList.appendItem(line);

        this.trigger('path:segment:add', el);
        this.trigger('path:line-segment:add', el);
    },

    addCurveSegment: function(x, y, x1, y1, x2, y2) {

        var el = this.pathNode;

        var curve = el.createSVGPathSegCurvetoCubicAbs(x, y, x1, y1, x2 || x, y2 || y);

        el.pathSegList.appendItem(curve);

        this.trigger('path:segment:add', el);
        this.trigger('path:curve-segment:add', el);
    },

    adjustLastSegment: function(x, y, x1, y1, x2, y2) {

        var el = this.pathNode;

        var snapRadius = this.options.snapRadius;
        if (snapRadius) {
            var snappedCoords = this.snapLastSegmentCoordinates(x, y, snapRadius);
            x = snappedCoords.x;
            y = snappedCoords.y;
        }

        var segment = el.pathSegList.getItem(el.pathSegList.numberOfItems - 1);

        if (x !== null) segment.x = x;
        if (y !== null) segment.y = y;
        if (x1 !== null) segment.x1 = x1;
        if (y1 !== null) segment.y1 = y1;
        if (x2 !== null) segment.x2 = x2;
        if (y2 !== null) segment.y2 = y2;

        this.trigger('path:edit', el);
        this.trigger('path:last-segment:adjust', el);
    },

    snapLastSegmentCoordinates: function(x, y, radius) {

        var el = this.pathNode;
        var snappedX = false;
        var snappedY = false;
        var snapX = x;
        var snapY = y;
        for (var i = el.pathSegList.numberOfItems - 2; i >= 0; i--) {
            if (snappedX && snappedY) break;
            var segment = el.pathSegList.getItem(i);
            var segmentX = segment.x;
            var segmentY = segment.y;
            if (!snappedX && Math.abs(segmentX - x) < radius) {
                snapX = segmentX;
                snappedX = true;
            }
            if (!snappedY && Math.abs(segmentY - y) < radius) {
                snapY = segmentY;
                snappedY = true;
            }
        }

        return new g.Point(snapX, snapY);
    },

    removeLastSegment: function() {

        var el = this.pathNode;

        el.pathSegList.removeItem(el.pathSegList.numberOfItems - 1);

        this.trigger('path:edit', el);
        this.trigger('path:last-segment:remove', el);
    },

    findControlPoint: function(x, y) {

        var el = this.pathNode;
        var last = el.pathSegList.getItem(el.pathSegList.numberOfItems - 1);

        return g.point(x, y).reflection(last);
    },

    replaceLastSegmentWithCurve: function() {

        var el = this.pathNode;

        var last = el.pathSegList.getItem(el.pathSegList.numberOfItems - 1);
        var prev = el.pathSegList.getItem(el.pathSegList.numberOfItems - 2);

        var curve = el.createSVGPathSegCurvetoCubicAbs(last.x, last.y, prev.x, prev.y, last.x, last.y);

        el.pathSegList.replaceItem(curve, el.pathSegList.numberOfItems - 1);

        this.trigger('path:edit', el);
        this.trigger('path:last-segment:replace-with-curve', el);
    },

    adjustControlPath: function(x1, y1, x2, y2) {

        var el = this.pathNode;
        var control = this.svgControl.node;

        control.pathSegList.initialize(control.createSVGPathSegMovetoAbs(x1, y1));
        control.pathSegList.appendItem(control.createSVGPathSegLinetoAbs(x2, y2));

        this.vel.append(control);

        this.trigger('path:interact', el);
        this.trigger('path:control:adjust', el);
    },

    removeControlPath: function() {

        var el = this.pathNode;
        var control = this.svgControl.node;

        control.pathSegList.clear();

        this.vel.append(control);

        this.trigger('path:interact', el);
        this.trigger('path:control:remove', el);
    },

    //////////////
    // Handlers //
    //////////////

    onPointerDown: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();

        // left button only (or touch)
        if (evt.which > 1) return;

        // first click only (if this was part of a double click)
        if (evt.originalEvent.detail > 1) return;

        // check if we are in the DOM (after remove)
        if (!this.el.parentNode) return;

        var coordinates = this.vel.toLocalPoint(evt.clientX, evt.clientY);

        switch (this.action) {

            case 'awaiting-input':
                this.createPath(coordinates.x, coordinates.y);
                this.action = 'path-created';
                this.delegateDocumentEvents();
                break;

            case 'adjusting-line-end':
                this.action = 'awaiting-line-end';
                break;

            case 'adjusting-curve-end':
                this.action = 'awaiting-curve-control-2';
                break;
        }

        this._timeStamp = evt.timeStamp;
    },

    MOVEMENT_DETECTION_THRESHOLD: 150,

    onPointerMove: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();

        if (this.action == 'awaiting-input') return;

        var start;
        var control;

        var end = this.vel.toLocalPoint(evt.clientX, evt.clientY);

        var timeStamp = this._timeStamp;

        if (!timeStamp) {
            // mouse button is not pressed

            switch (this.action) {

                case 'adjusting-line-end':
                    this.adjustLastSegment(end.x, end.y);
                    break;

                case 'adjusting-curve-end':
                    this.adjustLastSegment(end.x, end.y, null, null, end.x, end.y);
                    break;
            }

        } else if (timeStamp && ((evt.timeStamp - timeStamp) < this.MOVEMENT_DETECTION_THRESHOLD)) {
            // mouse button is pressed but threshold for detecting movement has not been reached yet
            // keep following user pointer to prevent jumpy interface effects

            switch (this.action) {

                case 'path-created':
                    start = this.svgStart.translate();
                    this.adjustControlPath(start.tx, start.ty, end.x, end.y);
                    break;

                case 'awaiting-line-end':
                case 'adjusting-curve-control-1':
                    this.adjustLastSegment(end.x, end.y);
                    break;

                case 'awaiting-curve-control-2':
                    this.adjustLastSegment(end.x, end.y, null, null, end.x, end.y);
                    break;
            }

        } else {
            // mouse button is pressed and movement is being detected

            switch (this.action) {

                case 'path-created':
                    this.action = 'adjusting-curve-control-1';
                    break;

                case 'awaiting-line-end':
                    this.replaceLastSegmentWithCurve();
                    this.action = 'adjusting-curve-control-2';
                    break;

                case 'awaiting-curve-control-2':
                    this.action = 'adjusting-curve-control-2';
                    break;

                case 'adjusting-curve-control-1':
                    start = this.svgStart.translate();
                    this.adjustControlPath(start.tx, start.ty, end.x, end.y);
                    break;

                case 'adjusting-curve-control-2':
                    control = this.findControlPoint(end.x, end.y);
                    this.adjustLastSegment(null, null, null, null, control.x, control.y);
                    this.adjustControlPath(control.x, control.y, end.x, end.y);
                    break;
            }
        }
    },

    onPointerUp: function(e) {

        this._timeStamp = null;

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();

        // left button only (or touch)
        if (evt.which > 1) return;

        // first click only (if this was part of a double click)
        if (evt.originalEvent.detail > 1) return;

        var end = this.vel.toLocalPoint(evt.clientX, evt.clientY);

        switch (this.action) {

            case 'path-created':
            case 'awaiting-line-end':
                this.addLineSegment(end.x, end.y);
                this.action = 'adjusting-line-end';
                break;

            case 'awaiting-curve-control-2':
                this.removeControlPath();
                this.addLineSegment(end.x, end.y);
                this.action = 'adjusting-line-end';
                break;

            case 'adjusting-curve-control-1':
            case 'adjusting-curve-control-2':
                this.addCurveSegment(end.x, end.y, end.x, end.y);
                this.action = 'adjusting-curve-end';
                break;
        }
    },

    onStartPointPointerDown: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();

        // left button only (or touch)
        if (evt.which > 1) return;

        // first click only (if this was part of a double click)
        if (evt.originalEvent.detail > 1) return;

        this.closePath();
    },

    onDoubleClick: function(e) {

        var evt = util.normalizeEvent(e);

        evt.preventDefault();
        evt.stopPropagation();

        // left button only (or touch)
        if (evt.which > 1) return;

        if (this.pathNode && this.numberOfVisibleSegments() > 0) {

            // remove the path element created by first click's mousedown
            this.removeLastSegment();

            this.finishPath('path:stop');
        }
    },

    onContextMenu: function(e) {

        var evt = util.normalizeEvent(e);

        evt.preventDefault();
        evt.stopPropagation();

        // first click only (if this was part of a double click)
        if (evt.originalEvent.detail > 1) return;

        if (this.pathNode && this.numberOfVisibleSegments() > 0) {

            // remove currently edited path segment
            this.removeLastSegment();

            this.finishPath('path:stop');
        }
    }
});
