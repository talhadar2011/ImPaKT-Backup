import $ from 'jquery';
import { V, g, util, mvc } from 'jointjs/src/core.mjs';

export const FreeTransform = mvc.View.extend({

    className: 'free-transform',

    events: {
        'mousedown .resize': 'startResizing',
        'mousedown .rotate': 'startRotating',
        'touchstart .resize': 'startResizing',
        'touchstart .rotate': 'startRotating'
    },

    DIRECTIONS : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    POSITIONS: ['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left'],

    options: {
        cellView: undefined,
        rotateAngleGrid: 15,
        resizeGrid: undefined,
        preserveAspectRatio: false,
        minWidth: 0,
        minHeight: 0,
        maxWidth: Infinity,
        maxHeight: Infinity,
        allowOrthogonalResize: true,
        resizeDirections: null,
        allowRotation: true,
        clearAll: true,
        clearOnBlankPointerdown: true,
        usePaperScale: false,
        padding: 3
    },

    documentEvents: {
        'mousemove': 'pointermove',
        'touchmove': 'pointermove',
        'mouseup': 'pointerup',
        'touchend': 'pointerup'
    },

    init: function() {

        var options = this.options;
        if (options.cellView) {
            // The freetransform can be initalized by passing a single cellView option or
            // historically by passing all required references (cell, paper & graph).
            util.defaults(options, {
                cell: options.cellView.model,
                paper: options.cellView.paper,
                graph: options.cellView.paper.model
            });
        } else if (options.paper && options.cell) {
            util.defaults(options, {
                cellView: options.cell.findView(options.paper),
                graph: options.paper.model
            });
        }

        const { paper, clearAll } = options;

        if (clearAll) {
            // Remove any existing freetransforms.
            this.constructor.clear(paper);
        }

        this.startListening();

        paper.$el.append(this.el);

        // Register this freetransform instance.
        this.constructor.registerInstanceToPaper(this, paper);
    },

    startListening: function() {

        const { cell, paper, graph, clearOnBlankPointerdown } = this.options;

        // Update the freeTransform when the graph is changed.
        this.listenTo(cell, 'change:size change:position change:angle', this.onCellAttributeChange);
        this.listenTo(paper, 'scale translate', () => this.requestUpdate());

        // Remove the freeTransform when the model is removed.
        this.listenTo(graph, 'reset', () => this.remove());
        this.listenTo(cell, 'remove', () => this.remove());

        if (clearOnBlankPointerdown) {
            // Hide the freeTransform when the user clicks anywhere in the paper
            this.listenTo(paper, 'blank:pointerdown', () => this.remove());
        }
    },

    onCellAttributeChange: function(_cell, _changed, opt) {
        // Prevent `Maximum call stack size exceeded`
        // see `joint.dia.Element.prototype.sgResize`
        if (opt.updateHandled) return;
        this.requestUpdate();
    },

    renderHandles: function() {

        const { options, POSITIONS } = this;
        var $handleTemplate = $('<div/>').prop('draggable', false);
        var $rotateHandle = $handleTemplate.clone().addClass('rotate');
        var resize$Handles = POSITIONS.map((position) => {
            return $handleTemplate.clone().addClass('resize').attr('data-position', position);
        });
        // Show/Hide handles specified via `resizeDirections`
        const { resizeDirections } = options;
        if (Array.isArray(resizeDirections)) {
            resize$Handles.forEach(($handle, index) => {
                if (!resizeDirections.includes(POSITIONS[index])) $handle.hide();
            });
        }

        this.$el.empty().append(resize$Handles, $rotateHandle);
    },

    render: function() {

        const { options, $el } = this;
        const  { cell, preserveAspectRatio, allowRotation, allowOrthogonalResize } = options;
        // We have to use `attr` as jQuery `data` doesn't update DOM
        $el.attr('data-type', cell.get('type'));

        // Note that preserve aspect ratio option enabled implicates no resize handles on the sides.
        $el.toggleClass('no-orthogonal-resize', preserveAspectRatio || !allowOrthogonalResize);
        $el.toggleClass('no-rotation', !allowRotation);

        this.renderHandles();
        this.requestUpdate();
    },

    requestUpdate: function(opt) {
        const { UPDATE_PRIORITY, options } = this;
        options.paper.requestViewUpdate(this, 1, UPDATE_PRIORITY, opt);
    },

    confirmUpdate: function() {
        this.update();
    },

    update: function() {
        if (this.options.usePaperScale) {
            this.updateFrameScaled();
        } else {
            this.updateFrameNoScale();
        }
        this.updateHandleDirections();
    },

    updateFrameScaled: function() {
        const { paper, cell, padding } = this.options;
        const { left, right, top, bottom } = util.normalizeSides(padding);
        let { x, y, width, height } = cell.getBBox().moveAndExpand({
            x: -left,
            y: -top,
            width: left + right,
            height: top + bottom
        });
        const angle = cell.angle();
        const transformMatrix = paper.matrix() // transform-origin at 0 0
            .translate(x, y)
            .translate(width / 2, height / 2) // move transform-origin at 50% 50%
            .rotate(angle)
            .translate(-width / 2, -height / 2);
        const transformString = V.matrixToTransformString(transformMatrix);
        this.$el.css({
            'width': width,
            'height': height,
            'left': 0,
            'top': 0,
            'transform-origin': '0 0',
            'transform': transformString,
            '-webkit-transform': transformString, // chrome + safari
            '-ms-transform': transformString // IE 9
        });
    },

    updateFrameNoScale: function() {
        const { paper, cell, padding } = this.options;
        const { left, right, top, bottom } = util.normalizeSides(padding);
        const { a, d, e, f } =  paper.matrix();
        const bbox = cell.getBBox()
        const angle = cell.angle();
        // Calculate the free transform size and position in viewport coordinate system.
        // TODO: take a viewport rotation in account.
        bbox.x *= a;
        bbox.x += e;
        bbox.y *= d;
        bbox.y += f;
        bbox.width *= a;
        bbox.height *= d;
        bbox.moveAndExpand({
            x: -left,
            y: -top,
            width: left + right,
            height: top + bottom
        });
        const transformString =  `rotate(${angle}deg)`;
        this.$el.css({
            'width': bbox.width,
            'height': bbox.height,
            'left': bbox.x,
            'top': bbox.y,
            'transform-origin': '50% 50%',
            'transform': transformString,
            '-webkit-transform': transformString, // chrome + safari
            '-ms-transform': transformString // IE 9
        });
    },

    updateHandleDirections: function() {

        var angle = this.options.cell.angle();

        // Update the directions on the halo divs while the element being rotated. The directions are represented
        // by cardinal points (N,S,E,W). For example the div originally pointed to north needs to be changed
        // to point to south if the element was rotated by 180 degrees.
        var shift = Math.floor(angle * (this.DIRECTIONS.length / 360));

        if (shift != this._previousDirectionsShift) {

            // Create the current directions array based on the calculated shift.
            var directions = this.DIRECTIONS.slice(shift).concat(this.DIRECTIONS.slice(0, shift));

            // Apply the array on the halo divs.
            this.$('.resize').removeClass(this.DIRECTIONS.join(' ')).each(function(index, el) {
                $(el).addClass(directions[index]);
            });

            this._previousDirectionsShift = shift;
        }
    },

    calculateTrueDirection: function(relativeDirection) {

        var cell = this.options.cell;
        var normalizedAngle = g.normalizeAngle(cell.get('angle'));
        var trueDirectionIndex = this.POSITIONS.indexOf(relativeDirection);

        trueDirectionIndex += Math.floor(normalizedAngle * (this.POSITIONS.length / 360));
        trueDirectionIndex %= this.POSITIONS.length;

        return this.POSITIONS[trueDirectionIndex];
    },

    startResizing: function(evt) {

        evt.stopPropagation();

        this.options.graph.startBatch('free-transform', { freeTransform: this.cid });

        // Target's data attribute can contain one of 8 positions. Each position defines the way how to
        // resize an element. Whether to change the size on x-axis, on y-axis or on both.

        // The direction relative to itself.
        var relativeDirection = $(evt.target).data('position');
        var trueDirection = this.calculateTrueDirection(relativeDirection);
        var rx = 0;
        var ry = 0;

        relativeDirection.split('-').forEach(function(singleDirection) {

            rx = { 'left': -1, 'right': 1 }[singleDirection] || rx;
            ry = { 'top': -1, 'bottom': 1 }[singleDirection] || ry;
        });

        // The direction has to be one of the 4 directions the element's resize method would accept (TL,BR,BL,TR).
        var direction = this.toValidResizeDirection(relativeDirection);

        // The selector holds a function name to pick a corner point on a rectangle.
        // See object `rect` in `src/geometry.js`.
        var selector = {
            'top-right' : 'bottomLeft',
            'top-left': 'corner',
            'bottom-left': 'topRight',
            'bottom-right': 'origin'
        }[direction];

        // Expose the initial setup, so `pointermove` method can access it.
        const data = {
            action: 'resize',
            angle: g.normalizeAngle(this.options.cell.get('angle') || 0),
            resizeX: rx, // to resize, not to resize or flip coordinates on x-axis (1,0,-1)
            resizeY: ry, // to resize, not to resize or flip coordinates on y-axis (1,0,-1)
            selector: selector,
            direction: direction,
            relativeDirection: relativeDirection,
            trueDirection: trueDirection
        };

        this.startOp(evt.target);

        this.delegateDocumentEvents(null, data);
    },

    toValidResizeDirection: function(direction) {

        return {
            'top': 'top-left',
            'bottom': 'bottom-right',
            'left' : 'bottom-left',
            'right': 'top-right'
        }[direction] || direction;
    },

    startRotating: function(evt) {

        evt.stopPropagation();

        this.options.graph.startBatch('free-transform', { freeTransform: this.cid });

        var center = this.options.cell.getBBox().center();

        var clientCoords = this.options.paper.snapToGrid({ x: evt.clientX, y: evt.clientY });

        // Expose the initial setup, so `pointermove` method can acess it.
        const data = {
            action: 'rotate',
            // the centre of the element is the centre of the rotation
            centerRotation: center,
            // an angle of the element before the rotating starts
            modelAngle: g.normalizeAngle(this.options.cell.get('angle') || 0),
            // an angle between the line starting at mouse coordinates, ending at the center of rotation
            // and y-axis
            startAngle: g.point(clientCoords).theta(center)
        };

        this.startOp(evt.target);

        this.delegateDocumentEvents(null, data);
    },

    pointermove: function(evt) {

        var i = evt.data;
        const action = i.action;
        if (!action) return;

        evt = util.normalizeEvent(evt);

        var options = this.options;
        var clientCoords = options.paper.snapToGrid({ x: evt.clientX, y: evt.clientY });
        var gridSize = options.paper.options.gridSize;
        var resizeGrid = options.resizeGrid || {};
        var horizontalGrid = resizeGrid.width || gridSize;
        var verticalGrid = resizeGrid.height || gridSize;
        var minWidth = options.minWidth || horizontalGrid;
        var minHeight = options.minHeight || verticalGrid;

        var model = options.cell;

        switch (action) {

            case 'resize':
                var currentRect = model.getBBox();

                // The requested element's size has to be find on the unrotated element. Therefore we
                // are rotating a mouse coordinates back (coimageCoords) by an angle the element is rotated by and
                // with the center of rotation equals to the center of the unrotated element.
                var coimageCoords = g.point(clientCoords).rotate(currentRect.center(), i.angle);

                // The requested size is the difference between the fixed point and coimaged coordinates.
                var requestedSize = coimageCoords.difference(currentRect[i.selector]());

                // Calculate the new dimensions. `resizeX`/`resizeY` can hold a zero value if the resizing
                // on x-axis/y-axis is not allowed.
                var width = i.resizeX ? requestedSize.x * i.resizeX : currentRect.width;
                var height = i.resizeY ? requestedSize.y * i.resizeY : currentRect.height;

                // Fitting into a grid
                width = g.snapToGrid(width, horizontalGrid);
                height = g.snapToGrid(height, verticalGrid);
                // Minimum
                width = Math.max(width, minWidth);
                height = Math.max(height, minHeight);
                // Maximum
                width = Math.min(width, options.maxWidth);
                height = Math.min(height, options.maxHeight);

                if (options.preserveAspectRatio) {

                    var candidateWidth = currentRect.width * height / currentRect.height;
                    var candidateHeight = currentRect.height * width / currentRect.width;

                    candidateWidth > width ? (height = candidateHeight) : (width = candidateWidth);
                }

                // Resize the element only if the dimensions are changed.
                if (currentRect.width != width || currentRect.height != height) {

                    model.resize(width, height, {
                        freeTransform: this.cid,
                        direction: i.direction,
                        relativeDirection: i.relativeDirection,
                        trueDirection: i.trueDirection,
                        ui: true,
                        // The rest of properties are important for the Snapline plugin.
                        minWidth: options.minWidth,
                        minHeight: options.minHeight,
                        maxWidth: options.maxWidth,
                        maxHeight: options.maxHeight,
                        preserveAspectRatio: options.preserveAspectRatio
                    });
                }
                break;

            case 'rotate':
                // Calculate an angle between the line starting at mouse coordinates, ending at the centre
                // of rotation and y-axis and deduct the angle from the start of rotation.
                var theta = i.startAngle - g.point(clientCoords).theta(i.centerRotation);

                model.rotate(g.snapToGrid(i.modelAngle + theta, options.rotateAngleGrid), true, null, { freeTransform: this.cid });
                break;
        }
    },

    pointerup: function(evt) {

        this.undelegateDocumentEvents();

        if (!evt.data.action) return;

        this.stopOp();

        this.options.graph.stopBatch('free-transform', { freeTransform: this.cid });
    },

    onRemove: function() {

        FreeTransform.unregisterInstanceFromPaper(this, this.options.paper);
    },

    startOp: function(el) {

        if (el) {
            // Add a class to the element we are operating with
            $(el).addClass('in-operation');
            this._elementOp = el;
        }

        this.$el.addClass('in-operation');

        this.options.paper.undelegateEvents();
    },

    stopOp: function() {

        if (this._elementOp) {
            // Remove a class from the element we were operating with
            $(this._elementOp).removeClass('in-operation');
            this._elementOp = null;
        }

        this.$el.removeClass('in-operation');

        this.options.paper.delegateEvents();
    }

}, {

    instancesByPaper: {},

    // Removes all freetransforms from the paper.
    clear: function(paper) {

        // Keep this for backwards compatibility.
        paper.trigger('freetransform:create');

        this.removeInstancesForPaper(paper);
    },

    removeInstancesForPaper: function(paper) {

        util.invoke(this.getInstancesForPaper(paper), 'remove');
    },

    getInstancesForPaper: function(paper) {

        return this.instancesByPaper[paper.cid] || {};
    },

    registerInstanceToPaper: function(instance, paper) {

        this.instancesByPaper[paper.cid] || (this.instancesByPaper[paper.cid] = {});
        this.instancesByPaper[paper.cid][instance.cid] = instance;
    },

    unregisterInstanceFromPaper: function(instance, paper) {

        if (this.instancesByPaper[paper.cid]) {
            this.instancesByPaper[paper.cid][instance.cid] = null;
        }
    }
});
