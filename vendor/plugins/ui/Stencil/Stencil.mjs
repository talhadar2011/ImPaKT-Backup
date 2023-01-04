// JointJS Stencil ui plugin.
// --------------------------

// USAGE:
// var graph = new dia.Graph;
// var paper = new dia.Paper({
//    el: $('#paper'),
//    width: 500,
//    height: 300,
//    gridSize: 20,
//    perpendicularLinks: true,
//    model: graph
// });
//
// var stencil = new ui.Stencil({ graph: graph, paper: paper });
// $('#stencil-holder').append(stencil.render().el);


import $ from 'jquery';
import { g, util, dia, mvc } from 'jointjs/src/core.mjs';
import { PaperScroller } from '../PaperScroller/PaperScroller.mjs';
import { GridLayout } from '../../layout/GridLayout/GridLayout.mjs';

var layoutDefaults = {

    options: function() {
        return {
            columnWidth: this.options.width / 2 - 10,
            columns: 2,
            rowHeight: 80,
            resizeToFit: true,
            dy: 10,
            dx: 10
        };
    },

    /**
     * @param {dia.Graph} graph
     * @param {Object} group Group
     */
    layoutGroup: function(graph, group) {

        var opts = this.options.layout;
        group = group || {};

        if (!GridLayout) {
            throw new Error('joint.ui.Stencil: joint.layout.GridLayout is not available.');
        }

        GridLayout.layout(graph, util.assign({}, opts, group.layout));
    }
};

export const Stencil = mvc.View.extend({

    className: 'stencil',

    events: {
        'click .btn-expand': 'openGroups',
        'click .btn-collapse': 'closeGroups',
        'click .groups-toggle > .group-label': 'openGroups',
        'click .group > .group-label': 'onGroupLabelClick',
        'touchstart .group > .group-label': 'onGroupLabelClick',
        'input .search': 'onSearch',
        'focusin .search': 'pointerFocusIn',
        'focusout .search': 'pointerFocusOut'
    },

    documentEvents: {
        'mousemove': 'onDrag',
        'touchmove': 'onDrag',
        'mouseup': 'onDragEnd',
        'touchend': 'onDragEnd',
        'touchcancel': 'onDragEnd'
    },

    options: {
        width: 200,
        height: 800,
        label: 'Stencil',
        groups: null,
        groupsToggleButtons: false,
        dropAnimation: false,
        search: null,
        layout: null,
        // An instance of Snapline plugin which should display
        // snaplines while dragging an element from the stencil
        snaplines: null,
        // When set to `true` clone views are automatically
        // scaled based on the current paper transformations.
        // Note: this option is ignored when `snaplines` provided.
        scaleClones: false,
        usePaperGrid: false,
        /**
         * @param {dia.Cell} cell
         * @returns {dia.Cell}
         */
        dragStartClone: function(cell) {

            return cell.clone();
        },

        /**
         * @param {dia.Cell} cell
         * @returns {dia.Cell}
         */
        dragEndClone: function(cell) {

            return cell.clone();
        },
        // canDrag: function(elementView, evt) { return false; }
        // Prevent user from dragging the elements
        canDrag: null,
        /** @type {function|null} */
        layoutGroup: null,
        // The options passed into the stencil papers.
        // e.g. { elementView: CustomElementView }
        paperOptions: null,

        paperDragOptions: null,

        paperPadding: 10, // deprecated

        contentOptions: null,

        container: null
    },

    DEFAULT_GROUP: '__default__',

    init: function() {

        this.setPaper(this.options.paperScroller || this.options.paper);

        /** @type {Object.<string, dia.Graph>} */
        this.graphs = {};
        /** @type {Object.<string, dia.Paper>} */
        this.papers = {};
        /** @type {Object.<string, jQuery>} */
        this.$groups = {};

        this.onSearch = util.debounce(this.onSearch, 200);
        // re-delegate the debounced onSearch handler.
        this.delegateEvents();

        this.initializeLayout();
    },

    /**
     * @private
     */
    initializeLayout: function() {

        var layout = this.options.layout;

        if (layout) {

            if (util.isFunction(layout)) {
                this.layoutGroup = layout;
            } else {
                this.layoutGroup = layoutDefaults.layoutGroup.bind(this);
                this.options.layout = util.isObject(layout) ? layout : {};
                util.defaults(this.options.layout, layoutDefaults.options.call(this));
            }
        }
    },

    /**
     * @public
     * @param {dia.Paper | ui.PaperScroller} paper
     */
    setPaper: function(paper) {

        var options = this.options;

        if (paper instanceof dia.Paper) {

            // Allow Stencil to be initialized with a paper only.
            options.paperScroller = null;
            options.paper = paper;
            options.graph = paper.model;

        } else if (typeof PaperScroller === 'function' && paper instanceof PaperScroller) {

            // Paper is a PaperScroller
            options.paperScroller = paper;
            options.paper = paper.options.paper;
            options.graph = paper.options.paper.model;

        } else {

            throw new Error('Stencil: paper required');
        }
    },

    freeze(opt) {
        const { papers } = this;
        Object.keys(papers).forEach(name => {
            papers[name].freeze(opt);
        });
    },

    unfreeze(opt) {
        const { papers } = this;
        Object.keys(papers).forEach(name => {
            papers[name].unfreeze(opt);
        });
    },

    /**
     * @private
     * @returns {jQuery}
     */
    renderContent: function() {

        return $('<div/>').addClass('content');
    },

    /**
     * @private
     * @returns {jQuery}
     */
    renderPaperDrag: function() {

        return $('<div/>').addClass('stencil-paper-drag');
    },

    /**
     * @private
     * @returns {jQuery}
     */
    renderSearch: function() {

        return $('<div/>').addClass('search-wrap').append($('<input/>', {
            type: 'search',
            placeholder: 'search'
        }).addClass('search'));
    },

    /**
     * @private
     * @returns {Array.<jQuery>}
     */
    renderToggleAll: function() {

        return [
            $('<div/>').addClass('groups-toggle')
                .append($('<label/>').addClass('group-label').html(this.options.label))
                .append($('<button/>', { text: '+' }).addClass('btn btn-expand'))
                .append($('<button/>', { text: '-' }).addClass('btn btn-collapse'))
        ];
    },

    /**
     * @private
     * @returns {jQuery}
     */
    renderElementsContainer: function() {

        return $('<div/>').addClass('elements');
    },

    /**
     * @private
     * @param {Object} opt
     * @returns {jQuery}
     */
    renderGroup: function(opt) {

        opt = opt || {};

        var $group = $('<div/>')
            .addClass('group')
            .attr('data-name', opt.name)
            .toggleClass('closed', !!opt.closed);

        var $label = $('<h3/>')
            .addClass('group-label')
            .html(opt.label || opt.name);

        var $elements = this.renderElementsContainer();

        return $group.append($label, $elements);
    },

    /**
     * @public
     * @returns {ui.Stencil}
     */
    render: function() {

        var options = this.options;

        this.$content = this.renderContent();
        this.$paperDrag = this.renderPaperDrag();

        this.$el.empty().append(this.$paperDrag, this.$content);

        if (options.search) {
            this.$el.addClass('searchable').prepend(this.renderSearch());
        }

        if (options.groupsToggleButtons) {
            this.$el.addClass('collapsible').prepend(this.renderToggleAll());
        }

        this.el.dataset.textNoMatchesFound = 'No matches found';

        var groups = Object.keys(options.groups || {});
        var hasGroups = groups.length > 0;
        var paperOptions;

        if (options.paperOptions && !util.isFunction(options.paperOptions) && options.paperOptions.model) {
            throw new Error('ui.Stencil: the `paperOptions` has to be a function if there is the property `model` defined.');
        }

        if (hasGroups) {

            // Render as many papers as there are groups.
            var sortedGroups = util.sortBy(groups, function(key) {
                return this[key].index;
            }.bind(options.groups));

            sortedGroups.forEach(function(name) {

                var group = this.options.groups[name];

                var $group = this.$groups[name] = this.renderGroup({
                    name: name,
                    label: group.label,
                    closed: group.closed
                }).appendTo(this.$content);

                if (group.paperOptions && group.paperOptions.model) {
                    throw new Error('ui.Stencil: the `model` property is not allowed in the `paperOptions` for the groups.');
                }

                paperOptions = util.result(options, 'paperOptions') || {};
                const graph = paperOptions.model || new dia.Graph;
                graph.set('group', name);

                var groupPaperOption = util.assign({}, paperOptions, group.paperOptions, {
                    el: $group.find('.elements'),
                    model: graph,
                    width: group.width || options.width,
                    height: group.height || options.height,
                    interactive: false,
                    preventDefaultBlankAction: false
                });

                var groupPaper = new dia.Paper(groupPaperOption);

                this.graphs[name] = groupPaperOption.model;
                this.papers[name] = groupPaper;

            }, this);

        } else {

            // Groups are not used. Render just one paper for the whole stencil.
            var $elements = this.renderElementsContainer().appendTo(this.$content);

            paperOptions = util.result(options, 'paperOptions') || {};
            var paper = new dia.Paper(util.assign({}, paperOptions, {
                el: $elements,
                model: paperOptions.model || new dia.Graph,
                width: options.width,
                height: options.height,
                interactive: false,
                preventDefaultBlankAction: false
            }));

            // `this.graphs` object contains only one graph in this case that we store under the key `this.DEFAULT_GROUP`.
            this.graphs[this.DEFAULT_GROUP] = paper.model;
            this.papers[this.DEFAULT_GROUP] = paper;
        }

        // Create graph and paper objects for the, temporary, dragging phase.
        // Elements travel the following way when the user drags an element from the stencil and drops
        // it into the main, associated, paper: `[One of the Stencil graphs] -> [_graphDrag] -> [this.options.graph]`.
        paperOptions = util.result(options, 'paperOptions') || {};
        var paperDragOptions = util.result(options, 'paperDragOptions') || {};
        var graphDrag = this._graphDrag = paperDragOptions.model || paperOptions.model || new dia.Graph;

        this._paperDrag = new dia.Paper(util.assign({}, options.paperDragOptions, {
            el: this.$paperDrag,
            width: 1,
            height: 1,
            model: graphDrag,
            sorting: dia.Paper.sorting.NONE
        }));

        this.startListening();

        return this;
    },

    paperEvents: {
        'cell:pointerdown': 'onDragStart'
    },

    startListening: function() {

        this.stopListening();

        const { paperEvents, papers } = this;
        for (let eventName in paperEvents) {
            let method = paperEvents[eventName];
            if (typeof method !== 'function') method = this[method];
            if (!method) continue;
            util.forIn(papers, (paper) => {
                // e.g. `cell:pointerdown` on any of the Stencil papers triggers element dragging.
                this.listenTo(paper, eventName, method);
            });
        }
    },

    /**
     * @public
     * @param {Array.<dia.Element>|Object.<string, Array.<dia.Element>>} cells Array of cells or hash-map
     * of cells where key is group name.
     * @param {string=} group
     */
    load: function(cells, group) {

        if (Array.isArray(cells)) {

            this.loadGroup(cells, group);

        } else if (util.isObject(cells)) {

            util.forIn(this.options.groups, function(group, name) {
                if (cells[name]) {
                    this.loadGroup(cells[name], name);
                }
            }.bind(this));
        }
    },

    /**
     * @public
     * Populate stencil with `cells`. If `group` is passed, only the graph in the named group
     * will be populated
     * @param {Array.<dia.Element>} cells
     * @param {string=} group Mandatory in 'group' mode  - 'options.groups' property is defined
     */
    loadGroup: function(cells, group) {

        const { options } = this;
        const graph = this.getGraph(group);
        graph.resetCells(cells);

        // If height is not defined in neither the global `options.height` or local
        // `height` for this specific group, fit the paper to the content automatically.
        let paperHeight = options.height;
        if (group) {
            paperHeight = this.getGroup(group).height;
        }

        if (this.isLayoutEnabled()) {
            this.layoutGroup(graph, this.getGroup(group));
        }

        if (!paperHeight) {
            this.fitPaperToContent(this.getPaper(group));
        }
    },

    /**
     * @private
     * @returns {boolean}
     */
    isLayoutEnabled: function() {

        return Boolean(this.options.layout);
    },

    /**
     * @public
     * @param {string=} group
     * @returns {dia.Graph}
     */
    getGraph: function(group) {

        var graph = this.graphs[group || this.DEFAULT_GROUP];
        if (!graph) {
            throw new Error('Stencil: group ' + group + ' does not exist.');
        }

        return graph;
    },

    /**
     * @public
     * @param {string} group
     * @returns {dia.Paper}
     */
    getPaper: function(group) {

        return this.papers[group || this.DEFAULT_GROUP];
    },

    preparePaperForDragging: function(cellView, clientX, clientY) {

        const { _paperDrag: paperDrag, _graphDrag: graphDrag, options } = this;
        const { snaplines, usePaperGrid, scaleClones, paper, container } = options

        // Stop listening for changes made by Snaplines
        this.stopListening(graphDrag);

        // Make sure the previous clone has been removed before we add a new one.
        // Clear the animation after previous onDropInvalid.
        paperDrag.$el.stop(true, true);

        // Move the .stencil-paper-drag element to the document body so that even though
        // the stencil is set to overflow: hidden or auto, the .stencil-paper-drag will
        // be visible.
        paperDrag.$el
            .addClass('dragging')
            .appendTo(container || document.body);

        const clone = options.dragStartClone(cellView.model).position(0, 0);
        graphDrag.resetCells([clone]);

        // Leave some padding so that e.g. the cell shadow or thick border is visible.
        // This workaround can be removed once browsers start supporting getStrokeBBox() (http://www.w3.org/TR/SVG2/types.html#__svg__SVGGraphicsElement__getStrokeBBox).
        let padding = 5;

        if (snaplines) {
            padding += snaplines.options.distance;
        }

        if (snaplines || usePaperGrid || scaleClones) {
            // Scaling the paper drag, so the clone view match the
            // size of the resulting size as would be placed in the paper.
            const { sx, sy } = paper.scale();
            paperDrag.scale(sx, sy);
            padding *= Math.max(sx, sy);
        } else {
            // restore scale
            paperDrag.scale(1, 1);
        }

        paperDrag.fitToContent({
            padding,
            allowNewOrigin: 'any'
        });

        const cloneView = clone.findView(paperDrag);
        const cloneGeometryBBox = cloneView.getBBox({ useModelGeometry: true });
        const cloneViewDeltaOrigin = cloneGeometryBBox.origin().difference(cloneView.getBBox().origin());
        const paperDragOffset = this.setPaperDragOffset(clientX, clientY, {
            cloneGeometryBBox,
            cloneViewDeltaOrigin,
            paperDragPadding: padding
        });

        const containerOffset = $(container).offset();
        if (containerOffset) {
            paperDragOffset.left -= containerOffset.left;
            paperDragOffset.top -= containerOffset.top;
        }

        return {
            clone,
            cloneView,
            cloneBBox: clone.getBBox(),
            cloneGeometryBBox,
            cloneViewDeltaOrigin,
            paperDragPadding: padding,
            paperDragInitialOffset: paperDragOffset
        }
    },

    removePaperAfterDragging: function() {

        const { _paperDrag: paperDrag, _graphDrag: graphDrag } = this;

        graphDrag.resetCells([]);

        // Move the .stencil-paper-drag from the document body back to the stencil element.
        this.$el
            .append(paperDrag.$el)
            .removeClass('dragging');

        paperDrag.$el
            .removeClass('dragging');
    },

    setPaperDragOffset: function(clientX, clientY, { cloneViewDeltaOrigin, cloneGeometryBBox, paperDragPadding }) {

        // Safari uses `document.body.scrollTop` only while Firefox uses `document.documentElement.scrollTop` only.
        // Google Chrome is the winner here as it uses both.
        const { body, documentElement } = document;
        const scrollTop = body.scrollTop || documentElement.scrollTop;

        // Offset the paper so that the mouse cursor points to the center of the stencil element.
        // Also, store the original coordinates so that we know where to return if `dropAnimation` is enabled.
        const left = clientX - cloneViewDeltaOrigin.x - cloneGeometryBBox.width / 2 - paperDragPadding;
        const top = clientY - cloneViewDeltaOrigin.y - cloneGeometryBBox.height / 2 - paperDragPadding + scrollTop;
        this._paperDrag.$el.offset({ left, top });

        return { left, top };
    },

    onCloneSnapped: function(clone, position, opt) {

        const { _dragging } = this;
        if (!_dragging) return;
        // Snapline plugin adds `snapped` flag when changing element's position
        const { snapped, tx, ty } = opt;
        if (snapped) {
            const { cloneBBox, cloneView } = _dragging;
            // Set the position of the element to it's original drag paper position
            // and add the snapped offset. This is required by the view `translate` method,
            // which updates the element view position based on the model values.
            clone.position(cloneBBox.x + tx, cloneBBox.y + ty, { silent: true });
            cloneView.translate();
            // Restore the element's local position
            clone.set('position', position, { silent: true });

            _dragging.snapOffset = { x: tx, y: ty };

        } else {

            _dragging.snapOffset = null;
        }
    },

    _dragging: null,

    onDragStart: function(cellView, evt) {

        const { options, _graphDrag } = this;
        const { canDrag, snaplines, usePaperGrid } = options;
        const { group = null } = cellView.model.graph.attributes; // `null` for stencils without groups

        if (typeof canDrag === 'function' && !canDrag.call(this, cellView, evt, group)) {
            // Prevent Element Dragging
            return;
        }

        this.$el.addClass('dragging');

        const { clientX, clientY } = evt;
        const _dragging = this.preparePaperForDragging(cellView, clientX, clientY);
        const { cloneView, clone } = _dragging;
        this._dragging = _dragging;

        const validDropTarget = false;
        const cloneArea = this.getCloneArea(cloneView, evt, validDropTarget && usePaperGrid);
        util.assign(_dragging, { clientX, clientY, validDropTarget, cloneArea });

        clone.position(cloneArea.x, cloneArea.y, { silent: true });

        // snaplines
        if (snaplines) {
            snaplines.captureCursorOffset(cloneView, evt, cloneArea.x, cloneArea.y);
            this.listenTo(_graphDrag, 'change:position', this.onCloneSnapped.bind(this));
        }

        this.delegateDocumentEvents(null, evt.data);
        this.trigger('element:dragstart', cloneView, evt, cloneArea.clone(), validDropTarget);
        // Do not automatically update the cell view while dragging.
        cloneView.stopListening();
        if (this.isDragCanceled()) {
            this.notifyDragEnd(cloneView, evt, cloneArea, validDropTarget);
            this._dragging = null;
        }
    },

    onDrag: function(evt) {

        const { _dragging, options } = this;
        if (!_dragging) return;

        evt.preventDefault();
        const normalizedEvt = util.normalizeEvent(evt);

        if (this.isDragCanceled()) {
            // Drag was canceled by calling cancelDrag() not from the `drag` event callback.
            const { cloneView, validDropTarget, cloneArea } = _dragging;
            this.notifyDragEnd(cloneView, normalizedEvt, cloneArea, validDropTarget);
            this._dragging = null;
            return;
        }

        const  { cloneView } = _dragging;
        const { model: clone } = cloneView;
        const { paper, snaplines, usePaperGrid } = options;

        const validDropTarget = this.insideValidArea({ x: normalizedEvt.clientX, y: normalizedEvt.clientY });
        const cloneArea = this.getCloneArea(cloneView, normalizedEvt, validDropTarget && usePaperGrid);
        const { x: clientX, y: clientY } = paper.localToClientPoint(cloneArea.center());
        util.assign(_dragging, { clientX,  clientY, validDropTarget, cloneArea });

        this.setPaperDragOffset(clientX, clientY, _dragging);

        clone.position(0, 0, { silent: true });
        cloneView.translate();
        clone.position(cloneArea.x, cloneArea.y, { stencil: this.cid });

        if (snaplines) {
            if (validDropTarget) {
                snaplines.snapWhileMoving(cloneView, normalizedEvt, cloneArea.x, cloneArea.y);
            } else {
                snaplines.hide();
            }
        }

        const { embeddingMode } = paper.options;
        if (embeddingMode) {
            cloneView.eventData(normalizedEvt, { paper });
            const data = _dragging.cloneViewEventData = cloneView.eventData(normalizedEvt);
            if (validDropTarget) {
                cloneView.processEmbedding(data);
            } else {
                cloneView.clearEmbedding(data);
            }
        }

        // Allow anyone from outside to change the cloneView model.
        cloneView.startListening();
        this.trigger('element:drag', cloneView, normalizedEvt, cloneArea.clone(), validDropTarget);
        cloneView.stopListening();
        if (this.isDragCanceled()) {
            this.notifyDragEnd(cloneView, normalizedEvt, cloneArea, validDropTarget);
            this._dragging = null;
        }
    },

    onDragEnd: function(evt) {

        const { _dragging, options } = this;
        if (!_dragging) return;

        const normalizedEvt = util.normalizeEvent(evt);

        const { clone: dragClone, clientX, clientY, validDropTarget, cloneArea, cloneView, cloneBBox, snapOffset } = _dragging;

        let x = cloneBBox.x;
        let y = cloneBBox.y;
        // add the element offset caused by the snaplines
        if (snapOffset) {
            x += snapOffset.x;
            y += snapOffset.y;
        }

        // Restore the original clone position if this was changed during the embedding.
        dragClone.position(x, y, { silent: true });

        this.notifyDragEnd(cloneView, normalizedEvt, cloneArea, validDropTarget);
        if (this.isDragCanceled()) {
            // Drag was canceled on drag end
            this._dragging = null;
            return;
        }

        // Check if the cell is dropped inside the paper.
        const dropPoint = options.paper.clientToLocalPoint(clientX, clientY);
        const snapToGrid = !snapOffset;
        if (validDropTarget) {
            this.onDrop(cloneView, normalizedEvt, dropPoint, snapToGrid);
        } else {
            this.onDropInvalid(cloneView, normalizedEvt, dropPoint, snapToGrid);
        }

        this._dragging = null;
    },

    notifyDragEnd: function(cloneView, evt, cloneArea, validDropTarget) {
        // Drag was canceled on dragstart or drag
        // Allow anyone from outside to change the cloneView model.
        cloneView.startListening();
        this.trigger('element:dragend', cloneView, evt, cloneArea.clone(), validDropTarget);
        cloneView.stopListening();
        this.undelegateDocumentEvents();
    },

    onDrop: function(cloneView, evt, point, snapToGrid) {

        const { options } = this;
        const { paper, graph } = options;
        const { embeddingMode } = paper.options;
        const { model: dragClone } = cloneView;

        // Start the dragging batch
        // Batch might contain `add`, `change:parent`, `change:embeds` events.
        graph.startBatch('stencil-drag');

        const endClone = options.dragEndClone(dragClone);

        this.drop(endClone, point, snapToGrid);
        this.removePaperAfterDragging(dragClone);

        // embedding
        if (embeddingMode) {
            cloneView.eventData(evt, { model: endClone, paper });
            cloneView.finalizeEmbedding(cloneView.eventData(evt));
        }

        // snaplines
        // it's hide on document mouseup by the plugin itself

        this.trigger('element:drop', endClone.findView(paper), evt, point.x, point.y);

        // End the dragging batch.
        graph.stopBatch('stencil-drag');
    },

    onDropInvalid: function(cloneView, evt, point, _snapToGrid) {

        const { model: dragClone } = cloneView;
        const endClone = this.options.dragEndClone(dragClone);
        // Tell the outside world that the drop was not successful.
        this.trigger('drop:invalid', evt, endClone, point.x, point.y);
        this.cancelDrag();
    },

    cancelDrag: function({ dropAnimation } = this.options) {

        const { _dragging, options, _paperDrag } = this;
        if (!_dragging) return;

        const { clone, cloneView, cloneViewEventData, paperDragInitialOffset } = _dragging;
        const { paper, snaplines } = options;

        // Clear After Embedding
        if (paper.options.embeddingMode && cloneViewEventData) {
            cloneView.clearEmbedding(cloneViewEventData);
        }

        if (snaplines) {
            snaplines.hide();
        }

        _dragging.canceled = true;

        if (dropAnimation) {

            const { duration = 150, easing = 'swing' } = dropAnimation;

            // clear the view immediately to prevent user's interaction on the returning shape
            _paperDrag.$el.animate(
                paperDragInitialOffset,
                duration,
                easing,
                this.removePaperAfterDragging.bind(this, clone)
            );

        } else {

            this.removePaperAfterDragging(clone);
        }
    },

    isDragCanceled: function() {
        const { _dragging } = this;
        if (!_dragging) return false;
        return Boolean(_dragging.canceled);
    },

    drop: function(endClone, point, snapToGrid) {

        const { options } = this;
        const { paper, graph } = options;
        const bbox = endClone.getBBox();
        const position = new g.Point({
            x: point.x + bbox.x - bbox.width / 2,
            y: point.y + bbox.y - bbox.height / 2
        });

        // Do not snap to grid if the element was previously snapped to certain position.
        if (snapToGrid) {
            position.snapToGrid(paper.options.gridSize);
        }

        // `z` level will be set automatically in the `this.graph.addCell()` method.
        // We don't want the cell to have the same `z` level as it had in the temporary paper.
        endClone.unset('z');
        endClone.position(position.x, position.y);
        graph.addCell(endClone, { stencil: this.cid });
    },

    // Return `true` if the point `p` falls into the valid area for dropping.
    insideValidArea: function(point) {

        const { paper, paperScroller } = this.options;
        const stencilArea = this.getDropArea(this.$el);

        let validArea;

        if (!paperScroller) {

            // No paper scroller used. Use the entire paper area.
            validArea = this.getDropArea(paper.$el);

        } else if (paperScroller.options.autoResizePaper) {

            // The PaperScroller is used with auto-resize enabled.
            // We can use the entire PaperScroller area for the drop.
            validArea = this.getDropArea(paperScroller.$el);

        } else {

            // The PaperScroller is used with auto-resize disabled.
            // The element can be dropped only into the visible part of the paper.
            const scrollerArea = this.getDropArea(paperScroller.$el);
            const paperArea = this.getDropArea(paper.$el);

            validArea = paperArea.intersect(scrollerArea);
        }

        // Check if the cell is dropped inside the paper but not inside the stencil.
        // Check for the stencil is must here, because the paper can go "below" the stencil
        // if the paper is larger than the ui.PaperScroller area.
        if (validArea && validArea.containsPoint(point) && !stencilArea.containsPoint(point)) return true;

        return false;
    },

    getDropArea: function(el) {

        const $el = $(el);
        const { left, top } = $el.offset();
        const { body, documentElement } = document;
        const scrollTop = body.scrollTop || documentElement.scrollTop;
        const scrollLeft = body.scrollLeft || documentElement.scrollLeft;
        const borderLeft = parseInt($el.css('border-left-width'), 10);
        const borderTop = parseInt($el.css('border-top-width'), 10);
        return new g.Rect({
            x: left + borderLeft - scrollLeft,
            y: top + borderTop - scrollTop,
            width: $el.innerWidth(),
            height: $el.innerHeight()
        });
    },

    getCloneArea(cloneView, evt, usePaperGrid) {

        const { paper } = this.options;
        const { model: clone } = cloneView;

        const { clientX, clientY } = evt;
        const { x: localCenterX, y: localCenterY } = paper.clientToLocalPoint(clientX, clientY);
        const { width, height } = clone.size();

        let x = localCenterX - width / 2;
        let y = localCenterY - height / 2;

        if (usePaperGrid) {
            const { x: snapX, y: snapY } = paper.snapToGrid(paper.localToClientPoint(x, y));
            x = snapX;
            y = snapY;
        }

        return new g.Rect(x, y, width, height);
    },

    filter: function(keyword, cellAttributesMap = this.options.search) {

        // We go through each paper.model, filter its cells and watch whether we found a match
        // yet or not.

        var match = Object.keys(this.papers).reduce((wasMatch, group) => {

            var paper = this.papers[group];
            var groupId = (group === this.DEFAULT_GROUP) ? null : group;

            // an array of cells that matches a search criteria
            var matchedCells = paper.model.getCells().filter((cell) => {

                var cellMatch = false;

                if (util.isFunction(cellAttributesMap)) {
                    // A: search is defined as a function
                    cellMatch = cellAttributesMap.call(this, cell, keyword, groupId, this);
                } else {
                    // B: search is defined as an attribute map
                    // SmartCase
                    // a searching mode when the keyword consists of lowercase only
                    // e.g 'keyword' matches 'Keyword' but not other way round
                    cellMatch = this.isCellMatched(cell, keyword, cellAttributesMap, keyword.toLowerCase() !== keyword);
                }

                // each element that does not match a search has 'unmatched' css class
                var cellView = paper.findViewByModel(cell);
                if (cellView) {
                    cellView.vel.toggleClass('unmatched', !cellMatch);
                }

                return cellMatch;

            });

            var isMatch = !util.isEmpty(matchedCells);

            // create a graph contains only filtered elements.
            var options = this.options;
            var paperOptions = util.result(options, 'paperOptions') || {};
            var graph = paperOptions.model || new dia.Graph;
            var filteredGraph = (graph).resetCells(matchedCells);

            // let the outside world know that the group was filtered
            this.trigger('filter', filteredGraph, group, keyword);

            if (this.isLayoutEnabled()) {
                this.layoutGroup(filteredGraph, this.getGroup(group));
            }

            if (this.$groups[group]) {
                // add 'unmatched' class when filter matches no elements in the group
                this.$groups[group].toggleClass('unmatched', !isMatch);
            }

            this.fitPaperToContent(paper);

            return wasMatch || isMatch;

        }, false);

        // When no match found we add 'not-found' class on the stencil element
        this.$el.toggleClass('not-found', !match);
    },

    isCellMatched: function(cell, keyword, cellAttributesMap, caseSensitive) {

        if (!keyword) return true;

        return Object.keys(cellAttributesMap).some(function(type) {
            var paths = cellAttributesMap[type];

            if (type != '*' && cell.get('type') != type) {
                // type is not universal and doesn't match the current cell
                return false;
            }

            // find out if any of specific cell attributes matches a search criteria
            var attributeMatch = paths.some(function(path) {

                var value = util.getByPath(cell.attributes, path, '/');

                if (value === undefined || value === null) {
                    // if value undefined than current attribute doesn't match
                    return false;
                }

                // convert values to string first (e.g value could be a number)
                value = value.toString();

                if (!caseSensitive) {
                    value = value.toLowerCase();
                }

                return value.indexOf(keyword) >= 0;
            });

            return attributeMatch;
        });
    },

    fitPaperToContent: function(paper) {
        const { options } = this;
        const { width: minWidth } = paper.getComputedSize();
        const contentOptions = util.assign({
            minWidth,
            padding: options.paperPadding
        }, options.contentOptions)
        paper.fitToContent(contentOptions);
    },

    /**
     * @private
     * @param {string} name
     * @returns {Object}
     */
    getGroup: function(name) {

        return this.options.groups && this.options.groups[name] || {};
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    onSearch: function(evt) {

        const keyword = evt.target.value;
        this.$el.toggleClass('stencil-filtered', keyword.length > 0);
        this.filter(keyword, this.options.search);
    },

    /**
     * @private
     */
    pointerFocusIn: function() {
        this.$el.addClass('is-focused');
    },

    /**
     * @private
     */
    pointerFocusOut: function() {
        this.$el.removeClass('is-focused');
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    onGroupLabelClick: function(evt) {

        // Prevent touch devices not to handle this event twice.
        // Note that both touchstart and click (evt mousedown) are fired.
        if (evt.type === 'touchstart') {
            this._groupLabelClicked = true;
        } else if (this._groupLabelClicked && evt.type === 'click') {
            this._groupLabelClicked = false;
            return;
        }

        var $group = $(evt.target).closest('.group');
        this.toggleGroup($group.data('name'));
    },

    /**
     * @public
     * @param {string} name
     */
    toggleGroup: function(name) {
        if (this.isGroupOpen(name)) {
            this.closeGroup(name);
        } else {
            this.openGroup(name);
        }
    },

    /**
     * @public
     * @param {string} name
     */
    closeGroup: function(name) {
        var $group = this.$groups[name];
        if (!$group || !this.isGroupOpen(name)) return;
        this.trigger('group:close', name);
        $group.addClass('closed');
    },

    /**
     * @public
     * @param {string} name
     */
    openGroup: function(name) {
        var $group = this.$groups[name];
        if (!$group || this.isGroupOpen(name)) return;
        this.trigger('group:open', name);
        $group.removeClass('closed');
    },

    /**
     * @public
     * @param {string} name
     */
    isGroupOpen: function(name) {
        var $group = this.$groups[name];
        if (!$group) return false;
        return !$group.hasClass('closed');
    },

    /**
     * @public
     */
    closeGroups: function() {
        Object.keys(this.$groups).forEach(function(group) {
            this.closeGroup(group);
        }, this);
    },

    /**
     * @public
     */
    openGroups: function() {
        Object.keys(this.$groups).forEach(function(group) {
            this.openGroup(group);
        }, this);
    },

    /**
     * @private
     */
    onRemove: function() {

        util.invoke(this.papers, 'remove');
        this.papers = {};

        if (this._paperDrag) {
            this._paperDrag.remove();
            this._paperDrag = null;
        }

        this.undelegateDocumentEvents();
    }
});

