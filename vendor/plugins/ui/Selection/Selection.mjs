// Selection
// =============

// `Selection` implements selecting group of elements and moving the selected elements in one go.
// Typically, the selection will be bound to the `Shift` key
// and selecting/deselecting individual elements to the `Ctrl` key.

// Example usage:

// var graph = new dia.Graph;
// var paper = new dia.Paper({ model: graph });
// var selectionItems = new Backbone.Collection;
// var selection = new ui.Selection({ paper: paper, graph: graph, model: selectionItems });

// // Bulk selecting group of elements by creating a rectangular selection area.
// paper.on('blank:pointerdown', selection.startSelecting);

// // Selecting individual elements with click and the `Ctrl`/`Command` key.
// paper.on('cell:pointerup', function(cellView, evt) {
//      if ((evt.ctrlKey || evt.metaKey) && !(cellView.model instanceof dia.Link)) {
//              selectionItems.add(cellView.model);
//      }
// });

// // Deselecting previously selected elements with click and the `Ctrl`/`Command` key.
// selection.on('selection-box:pointerdown', function(evt) {
//      if (evt.ctrlKey || evt.metaKey) {
//              var cell = selectionItems.get($(evt.target).data('model'));
//              selectionItems.reset(selectionItems.without(cell));
//              selection.destroySelectionBox(paper.findViewByModel(cell));
//      }
// });

import $ from 'jquery';
import Backbone from 'backbone';
import { g, util, mvc } from 'jointjs/src/core.mjs';

const HandlePosition = {
    N: 'n', NW: 'nw',
    W: 'w', SW: 'sw',
    S: 's', SE: 'se',
    E: 'e', NE: 'ne'
}

// Alternative to `graph.getCellsBBox()` which takes cell `angle` into account
const getUnrotatedBBox = cells => cells.reduce((memo, cell) => {
    const rect = cell.getBBox();
    if (!rect) return memo;
    if (memo) {
        return memo.union(rect);
    }
    return rect;
}, null);

export const Selection = mvc.View.extend({

    options: {
        paper: undefined,
        graph: undefined,
        boxContent: function(boxElement) {
            return util.template('<%= length %> elements selected.')({
                length: this.model.length
            });
        },
        handles: [{
            name: 'remove',
            position: 'nw',
            events: {
                pointerdown: 'removeElements'
            }
        }, {
            name: 'rotate',
            position: 'sw',
            events: {
                pointerdown: 'startRotating',
                pointermove: 'doRotate',
                pointerup: 'stopBatch'
            }
        }, {
            name: 'resize',
            position: 'se',
            events: {
                pointerdown: 'startResizing',
                pointermove: 'doResize',
                pointerup: 'stopBatch'
            }
        }],
        useModelGeometry: false,
        strictSelection: false,
        rotateAngleGrid: 15,
        allowTranslate: true
    },

    className: 'selection',

    events: {
        'mousedown .selection-box': 'onSelectionBoxPointerDown',
        'touchstart .selection-box': 'onSelectionBoxPointerDown',
        'mousedown .handle': 'onHandlePointerDown',
        'touchstart .handle': 'onHandlePointerDown'
    },

    documentEvents: {
        'mousemove': 'adjustSelection',
        'touchmove': 'adjustSelection',
        'mouseup': 'pointerup',
        'touchend': 'pointerup',
        'touchcancel': 'pointerup'
    },

    _action: null,

    /**
     * @private
     */
    init: function() {

        // For backwards compatibility:
        if (this.options.model) {
            this.options.collection = this.options.model;
        }

        var collection = this.collection = this.options.collection || this.collection || new Backbone.Collection;

        if (!collection.comparator) {
            // Make sure the elements are always sorted from the parents to their children.
            // That is necessary for translating selected elements.
            collection.comparator = this.constructor.depthComparator;
            collection.sort();
        }

        // For backwards compatibility:
        this.model = collection;

        if (this.options.paper) {
            // Allow selection to be initialized with a paper only.
            util.defaults(this.options, { graph: this.options.paper.model });
        } else {
            throw new Error('Selection: paper required');
        }

        util.bindAll(this, 'startSelecting', 'stopSelecting', 'adjustSelection', 'pointerup');

        this.options.paper.$el.append(this.$el);

        // A counter of existing boxes. We don't want to update selection boxes on
        // each graph change when no selection boxes exist.
        this._boxCount = 0;

        this.$selectionWrapper = this.createSelectionWrapper();

        // Add handles.
        this.handles = [];
        util.toArray(this.options.handles).forEach(this.addHandle, this);

        this.startListening();
    },

    startListening: function() {

        var paper = this.options.paper;
        this.listenTo(paper, 'scale translate', this.onPaperTransformation);

        var graph = this.options.graph;
        this.listenTo(graph, 'reset', this.cancelSelection);
        this.listenTo(graph, 'change remove', this.onGraphChange);

        var collection = this.collection;
        this.listenTo(collection, 'remove', this.onRemoveElement);
        this.listenTo(collection, 'reset', this.onResetElements);
        this.listenTo(collection, 'add', this.onAddElement);
    },

    onPaperTransformation: function() {
        this.updateSelectionBoxes({ async: false });
    },

    onGraphChange: function(_, opt) {
        // Do not react on changes that happened inside the selection.
        if (opt.selection === this.cid) return;
        this.updateSelectionBoxes();
    },

    cancelSelection: function() {

        this.model.reset([], { ui: true });
    },

    /**
     * @public
     * @param {object} opt
     * @returns {Selection}
     */
    addHandle: function(opt) {

        this.handles.push(opt);

        var $handle = $('<div/>', {
            'class': 'handle ' + (opt.position || '') + ' ' + (opt.name || ''),
            'data-action': opt.name
        });
        if (opt.icon) {
            $handle.css('background-image', 'url(' + opt.icon + ')');
        }

        $handle.html(opt.content || '');

        // `opt.attrs` allows for setting arbitrary attributes on the generated HTML.
        // This object is of the form: `<selector> : { <attributeName> : <attributeValue>, ... }`
        util.setAttributesBySelector($handle, opt.attrs);

        this.$selectionWrapper.append($handle);

        util.forIn(opt.events, function(method, event) {

            if (util.isString(method)) {
                this.on('action:' + opt.name + ':' + event, this[method], this);
            } else {
                // Otherwise, it must be a function.
                this.on('action:' + opt.name + ':' + event, method);
            }

        }.bind(this));

        return this;
    },

    /**
     * @public
     * @param {jQuery.Event} evt
     */
    stopSelecting: function(evt) {

        var localPoint;
        var paper = this.options.paper;

        var data = this.eventData(evt);
        var action = data.action;

        switch (action) {

            case 'selecting':

                var offset = this.$el.offset();
                var width = this.$el.width();
                var height = this.$el.height();

                // Convert offset coordinates to the local point of the <svg> root element viewport.
                localPoint = paper.pageToLocalPoint(offset.left, offset.top);

                // Convert width and height to take current viewport scale into account
                var paperScale = paper.scale();
                width /= paperScale.sx;
                height /= paperScale.sy;

                var selectedArea = g.rect(localPoint.x, localPoint.y, width, height);
                var elementViews = this.getElementsInSelectedArea(selectedArea);

                var filter = this.options.filter;
                if (Array.isArray(filter)) {

                    elementViews = elementViews.filter(function(view) {
                        return !filter.includes(view.model) && !filter.includes(view.model.get('type'));
                    });

                } else if (util.isFunction(filter)) {

                    elementViews = elementViews.filter(function(view) {
                        return !filter(view.model);
                    });
                }

                var models = elementViews.map(function(view) {
                    return view.model;
                });
                this.model.reset(models, { ui: true });

                break;

            case 'translating':

                this.options.graph.stopBatch('selection-translate');
                localPoint = paper.snapToGrid(evt.clientX, evt.clientY);
                this.notify('selection-box:pointerup', evt, localPoint.x, localPoint.y);
                // Everything else is done during the translation.
                break;

            default:
                if (!action) {
                    // Hide selection if the user clicked somewhere else in the document.
                    this.cancelSelection();
                }
                break;
        }

        this._action = null;
    },

    /**
     * @public
     * @param {string} name
     * @returns {Selection}
     */
    removeHandle: function(name) {

        var handleIdx = util.toArray(this.handles).findIndex(function(item) {
            return item.name === name;
        });

        var handle = this.handles[handleIdx];
        if (handle) {

            util.forIn(handle.events, function(method, event) {
                this.off('action:' + name + ':' + event);
            }.bind(this));

            this.$('.handle.' + name).remove();

            this.handles.splice(handleIdx, 1);
        }

        return this;
    },

    /**
     * @public
     * @param {jQuery.Event} evt
     */
    startSelecting: function(evt) {

        evt = util.normalizeEvent(evt);

        this.cancelSelection();

        var paperElement = this.options.paper.el;
        var offsetX, offsetY;

        if (evt.offsetX != null && evt.offsetY != null && $.contains(paperElement, evt.target)) {

            offsetX = evt.offsetX;
            offsetY = evt.offsetY;

        } else {

            // We do not use `evt.offsetX` and `evt.offsetY` event properties when the event target
            // is not inside the the paper element or properties are not defined (FF).

            var paperOffset = $(paperElement).offset();
            var paperScrollLeft = paperElement.scrollLeft;
            var paperScrollTop = paperElement.scrollTop;

            offsetX = evt.clientX - paperOffset.left + window.pageXOffset + paperScrollLeft;
            offsetY = evt.clientY - paperOffset.top + window.pageYOffset + paperScrollTop;
        }

        this.$el.css({ width: 1, height: 1, left: offsetX, top: offsetY });
        this.showLasso();

        this.eventData(evt, {
            action: 'selecting',
            clientX: evt.clientX,
            clientY: evt.clientY,
            offsetX: offsetX,
            offsetY: offsetY
        });
        this.delegateDocumentEvents(null, evt.data);

        this._action = 'selecting';
    },

    /**
     * @param {string} name
     * @param {Object} opt
     * @returns {Selection}
     */
    changeHandle: function(name, opt) {

        var handle = util.toArray(this.handles).find(function(item) {
            return item && item.name === name;
        });

        if (handle) {

            this.removeHandle(name);
            this.addHandle(util.merge({ name: name }, handle, opt));
        }

        return this;
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    onSelectionBoxPointerDown: function(evt) {

        evt.stopPropagation();
        evt = util.normalizeEvent(evt);

        // Start translating selected elements.
        if (this.options.allowTranslate) {
            this.startTranslatingSelection(evt);
        }

        this.eventData(evt, {
            activeElementView: this.getCellView(evt.target)
        });
        var localPoint = this.options.paper.snapToGrid(evt.clientX, evt.clientY);
        this.notify('selection-box:pointerdown', evt, localPoint.x, localPoint.y);
        this.delegateDocumentEvents(null, evt.data);
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    startTranslatingSelection: function(evt) {

        this.options.graph.startBatch('selection-translate');

        var snappedClientCoords = this.options.paper.snapToGrid(evt.clientX, evt.clientY);
        this.eventData(evt, {
            action: 'translating',
            snappedClientX: snappedClientCoords.x,
            snappedClientY: snappedClientCoords.y
        });

        this._action = 'translating';
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    adjustSelection: function(evt) {

        evt = util.normalizeEvent(evt);

        var dx;
        var dy;

        var data = this.eventData(evt);
        var action = data.action;

        switch (action) {

            case 'selecting':

                dx = evt.clientX - data.clientX;
                dy = evt.clientY - data.clientY;

                var left = parseInt(this.$el.css('left'), 10);
                var top = parseInt(this.$el.css('top'), 10);

                this.$el.css({
                    left: dx < 0 ? data.offsetX + dx : left,
                    top: dy < 0 ? data.offsetY + dy : top,
                    width: Math.abs(dx),
                    height: Math.abs(dy)
                });
                break;

            case 'translating':

                var snappedClientCoords = this.options.paper.snapToGrid(evt.clientX, evt.clientY);
                var snappedClientX = snappedClientCoords.x;
                var snappedClientY = snappedClientCoords.y;

                dx = snappedClientX - data.snappedClientX;
                dy = snappedClientY - data.snappedClientY;

                // restrict to area
                var restrictedArea = this.options.paper.getRestrictedArea();
                if (restrictedArea) {

                    var elements = this.model.toArray();
                    var selectionBBox = this.options.graph.getCellsBBox(elements);

                    // restrict movement to ensure that all elements within selection stay inside restricted area
                    var minDx = restrictedArea.x - selectionBBox.x;
                    var minDy = restrictedArea.y - selectionBBox.y;
                    var maxDx = (restrictedArea.x + restrictedArea.width) - (selectionBBox.x + selectionBBox.width);
                    var maxDy = (restrictedArea.y + restrictedArea.height) - (selectionBBox.y + selectionBBox.height);

                    if (dx < minDx) dx = minDx;
                    if (dy < minDy) dy = minDy;

                    if (dx > maxDx) dx = maxDx;
                    if (dy > maxDy) dy = maxDy;
                }

                if (dx || dy) {

                    this.translateSelectedElements(dx, dy);

                    if (!this.boxesUpdated) {

                        var paperScale = this.options.paper.scale();

                        // Translate each of the `selection-box` and `selection-wrapper`.
                        this.$el.children('.selection-box').add(this.$selectionWrapper)
                            .css({
                                left: '+=' + (dx * paperScale.sx),
                                top: '+=' + (dy * paperScale.sy)
                            });

                    } else if (this.model.length > 1) {

                        // If there is more than one cell in the selection, we need to update
                        // the selection boxes again. e.g when the first element went over the
                        // edge of the paper, a translate event was triggered, which updated the selection
                        // boxes. After that all remaining elements were translated but the selection
                        // boxes stayed unchanged.
                        this.updateSelectionBoxes();
                    }

                    data.snappedClientX = snappedClientX;
                    data.snappedClientY = snappedClientY;
                }

                this.notify('selection-box:pointermove', evt, snappedClientX, snappedClientY);
                break;

            default:
                if (action) {
                    this.pointermove(evt);
                }
                break;
        }

        this.boxesUpdated = false;
    },

    translateSelectedElements: function(dx, dy) {

        // This hash of flags makes sure we're not adjusting vertices of one link twice.
        // This could happen as one link can be an inbound link of one element in the selection
        // and outbound link of another at the same time.
        var processedCells = {};

        this.model.each(function(element) {

            // TODO: snap to grid.
            if (processedCells[element.id]) return;

            // Make sure that selection won't update itself when not necessary
            var opt = { selection: this.cid };

            // Translate the element itself.
            element.translate(dx, dy, opt);

            element.getEmbeddedCells({ deep: true }).forEach(function(embed) {
                processedCells[embed.id] = true;
            });

            // Translate link vertices as well.
            var connectedLinks = this.options.graph.getConnectedLinks(element);

            connectedLinks.forEach(function(link) {

                if (processedCells[link.id]) return;

                link.translate(dx, dy, opt);

                processedCells[link.id] = true;
            });

        }.bind(this));
    },

    /**
     * @private
     * @param {string} eventName
     * @param {jQuery.Event} event
     */
    notify: function(eventName, evt) {

        var data = this.eventData(evt);
        var args = Array.prototype.slice.call(arguments, 1);

        this.trigger.apply(this, [eventName, data.activeElementView].concat(args));
    },

    /**
     * @private
     * @param {g.rect} selectedArea
     * @returns {Object.<string, dia.Element>}
     */
    getElementsInSelectedArea: function(selectedArea) {

        var paper = this.options.paper;

        var filterOpt = {
            strict: this.options.strictSelection
        };

        if (this.options.useModelGeometry) {
            var models = paper.model.findModelsInArea(selectedArea, filterOpt);
            return models.map(paper.findViewByModel, paper).filter(function(item) {
                return !!item;
            });
        }

        return paper.findViewsInArea(selectedArea, filterOpt);
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    pointerup: function(evt) {

        var data = this.eventData(evt);
        var action = data.action;
        if (!action) return;

        this.triggerAction(action, 'pointerup', evt);
        this.stopSelecting(evt);
        this.undelegateDocumentEvents();

        this._action = null;
    },

    /**
     * @private
     * @param {dia.Element} element
     */
    destroySelectionBox: function(element) {

        this.$('[data-model="' + element.get('id') + '"]').remove();

        if (this.$el.children('.selection-box').length === 0) {
            this.hide();
        }

        this._boxCount = Math.max(0, this._boxCount - 1);
    },

    /**
     * @private
     */
    hide: function() {
        this.$el.removeClass('lasso selected');
    },

    /**
     * @private
     */
    showSelected: function() {
        this.$el.addClass('selected');
    },

    /**
     * @private
     */
    showLasso: function() {
        this.$el.addClass('lasso');
    },

    /**
     * @private
     */
    destroyAllSelectionBoxes: function() {

        this.hide();
        this.$el.children('.selection-box').remove();
        this._boxCount = 0;
    },

    /**
     * @private
     * @param {dia.Element} element
     */
    createSelectionBox: function(element) {

        var elementView = element.findView(this.options.paper);
        if (elementView) {
            var viewBBox = elementView.getBBox({ useModelGeometry: this.options.useModelGeometry });
            $('<div/>')
                .addClass('selection-box')
                .attr('data-model', element.get('id'))
                .css({ left: viewBBox.x, top: viewBBox.y, width: viewBBox.width, height: viewBBox.height })
                .appendTo(this.el);
            this.showSelected();
            this._boxCount++;
        }
    },

    /**
     * @private
     * @returns {jQuery}
     */
    createSelectionWrapper: function() {

        var $selectionWrapper = $('<div/>', { 'class': 'selection-wrapper' });
        var $box = $('<div/>', { 'class': 'box' });
        $selectionWrapper.append($box);
        $selectionWrapper.attr('data-selection-length', this.model.length);
        this.$el.prepend($selectionWrapper);
        return $selectionWrapper;
    },

    /**
     * @private
     */
    updateSelectionWrapper: function() {

        // Find the position and dimension of the rectangle wrapping
        // all the element views.
        var origin = { x: Infinity, y: Infinity };
        var corner = { x: 0, y: 0 };

        this.model.each(function(cell) {

            var view = this.options.paper.findViewByModel(cell);
            if (view) {
                var bbox = view.getBBox({ useModelGeometry: this.options.useModelGeometry });
                origin.x = Math.min(origin.x, bbox.x);
                origin.y = Math.min(origin.y, bbox.y);
                corner.x = Math.max(corner.x, bbox.x + bbox.width);
                corner.y = Math.max(corner.y, bbox.y + bbox.height);
            }
        }.bind(this));

        this.$selectionWrapper.css({
            left: origin.x,
            top: origin.y,
            width: (corner.x - origin.x),
            height: (corner.y - origin.y)
        }).attr('data-selection-length', this.model.length);

        if (util.isFunction(this.options.boxContent)) {

            var $box = this.$('.box');
            var content = this.options.boxContent.call(this, $box[0]);

            // don't append empty content. (the content might had been created inside boxContent()
            if (content) {
                $box.html(content);
            }
        }
    },

    updateSelectionBoxes: function(opt) {
        if (this.collection.length === 0) return;
        // When an user drags selection boxes over the edge of the paper and the paper gets resized,
        // we update the selection boxes here (giving them exact position) and we do not want
        // the selection boxes to be shifted again based on the mousemove.
        // See adjustSelection() method.
        this.boxesUpdated = true;
        this.options.paper.requestViewUpdate(this, 1, this.UPDATE_PRIORITY, opt);
    },

    confirmUpdate: function() {
        this._updateSelectionBoxes();
    },
    /**
     * @private
     */
    _updateSelectionBoxes: function() {

        if (!this._boxCount) return;

        this.hide();

        var children = this.$el.children('.selection-box');
        for (var i = 0, n = children.length; i < n; i++) {
            var element = children[i];

            var removedId = $(element).remove().attr('data-model');

            // try to find an element with the same id in the selection collection and
            // find the view for this model.
            var removedModel = this.model.get(removedId);

            if (removedModel) {
                // The view doesn't need to exist on the paper anymore as we use this method
                // as a handler for element removal.
                this.createSelectionBox(removedModel);
            }
        }
        this.updateSelectionWrapper();
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    onHandlePointerDown: function(evt) {

        var action = $(evt.currentTarget).attr('data-action');
        if (!action) return;

        evt.preventDefault();
        evt.stopPropagation();
        evt = util.normalizeEvent(evt);

        this.triggerAction(action, 'pointerdown', evt);
        this.eventData(evt, {
            action: action,
            clientX: evt.clientX,
            clientY: evt.clientY,
            startClientX: evt.clientX,
            startClientY: evt.clientY
        });
        this.delegateDocumentEvents(null, evt.data);

        this._action = action;
    },

    /**
     * @private
     * @param {HTMLElement} element
     * @returns {dia.Element}
     */
    getCellView: function(element) {

        var cell = this.model.get(element.getAttribute('data-model'));
        return cell && cell.findView(this.options.paper);
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    pointermove: function(evt) {

        var data = this.eventData(evt);
        var action = data.action;
        if (!action) return;

        var clientCoords = this.options.paper.snapToGrid(evt.clientX, evt.clientY);
        var oldClientCoords = this.options.paper.snapToGrid(data.clientX, data.clientY);
        var dx = clientCoords.x - oldClientCoords.x;
        var dy = clientCoords.y - oldClientCoords.y;

        this.triggerAction(action, 'pointermove', evt, dx, dy, evt.clientX - data.startClientX, evt.clientY - data.startClientY);

        data.clientX = evt.clientX;
        data.clientY = evt.clientY;
    },

    /**
     * Trigger an action on the Selection object. `evt` is a DOM event
     * @private
     * @param {string} action
     * @param {string} eventName abstracted JointJS event name (pointerdown, pointermove, pointerup).
     * @param {jQuery.Event} evt
     */
    triggerAction: function(action, eventName, evt) {

        var args = Array.prototype.slice.call(arguments, 2);
        args.unshift('action:' + action + ':' + eventName);
        this.trigger.apply(this, args);
    },

    // Handle actions.

    /**
     * @private
     * @param {dia.Element} element
     */
    onRemoveElement: function(element) {

        this.destroySelectionBox(element);
        this.updateSelectionWrapper();
    },

    /**
     * @private
     * @param {Backbone.Collection.<dia.Cell>} elements
     */
    onResetElements: function(elements) {

        this.destroyAllSelectionBoxes();

        elements.each(this.createSelectionBox.bind(this));

        this.updateSelectionWrapper();
    },

    /**
     * @private
     * @param {dia.Element} element
     */
    onAddElement: function(element) {

        this.createSelectionBox(element);
        this.updateSelectionWrapper();
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    removeElements: function(evt) {

        // Store cells before `cancelSelection()` resets the selection collection.
        var cells = this.collection.toArray();
        this.cancelSelection();
        this.options.graph.removeCells(cells, { selection: this.cid });
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    startRotating: function(evt) {

        this.options.graph.trigger('batch:start');

        var center = this.options.graph.getCellsBBox(this.model.models).center();
        var clientCoords = this.options.paper.snapToGrid(evt.clientX, evt.clientY);
        var initialAngles = this.model.toArray().reduce(function(res, element) {
            res[element.id] = g.normalizeAngle(element.get('angle') || 0);
            return res;
        }, {});

        this.eventData(evt, {
            center: center,
            clientAngle: g.point(clientCoords).theta(center),
            initialAngles: initialAngles
        });
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    startResizing: function(evt) {

        var paper = this.options.paper;
        var graph = this.options.graph;
        var grid = paper.options.gridSize;
        var elements = this.model.toArray();

        var selectionBBox = getUnrotatedBBox(elements);
        var elBBoxes = util.invoke(elements, 'getBBox');
        var minElWidth = elBBoxes.reduce(function(min, bBox) {
            return bBox.width < min ? bBox.width : min;
        }, Infinity);
        var minElHeight = elBBoxes.reduce(function(min, bBox) {
            return bBox.height < min ? bBox.height : min;
        }, Infinity);

        this.eventData(evt, {
            cells: graph.getSubgraph(elements),
            bbox: selectionBBox,
            minWidth: grid * selectionBBox.width / minElWidth,
            minHeight: grid * selectionBBox.height / minElHeight
        });

        graph.trigger('batch:start');
    },

    /**
     * @param {jQuery.Event} evt
     * @param {number} dx
     * @param {number} dy
     */
    doResize: function(evt, dx, dy) {

        var data = this.eventData(evt);
        var bbox = data.bbox;
        var cells = data.cells;
        var prevWidth = bbox.width;
        var prevHeight = bbox.height;
        var width = Math.max(prevWidth + dx, data.minWidth);
        var height = Math.max(prevHeight + dy, data.minHeight);

        if (Math.abs(prevWidth - width) > 1e-3 || Math.abs(prevHeight - height) > 1e-3) {

            // TODO: solve the issue of resizing multiple rotated elements
            // this.options.graph.resizeCells(width, height, data.cells, {
            //     selection: this.cid
            // });
            var bbox2 = getUnrotatedBBox(cells);
            // Copy from joint/src/dia/Graph.mjs resizeCells()
            const sx = Math.max(width / bbox2.width, 0);
            const sy = Math.max(height / bbox2.height, 0);
            cells.forEach(cell => cell.scale(sx, sy, bbox2.origin(), { selection: this.cid }));

            // update selection bbox
            bbox.width = width;
            bbox.height = height;

            this.updateSelectionBoxes();
        }
    },

    /**
     * @private
     * @param {jQuery.Event} evt
     */
    doRotate: function(evt) {

        var data = this.eventData(evt);

        // Calculate an angle between the line starting at mouse coordinates, ending at the centre
        // of rotation and y-axis and deduct the angle from the start of rotation.
        var angleGrid = this.options.rotateAngleGrid;
        var clientCoords = this.options.paper.snapToGrid(evt.clientX, evt.clientY);
        var theta = data.clientAngle - g.point(clientCoords).theta(data.center);

        if (Math.abs(theta) > 1e-3) {

            this.collection.each(function(element) {
                var newAngle = g.snapToGrid(data.initialAngles[element.id] + theta, angleGrid);
                element.rotate(newAngle, true, data.center, { selection: this.cid });
            }.bind(this));

            this.updateSelectionBoxes();
        }
    },

    /**
     * @private
     */
    stopBatch: function() {

        this.options.graph.trigger('batch:stop');
    },

    /**
     * @private
     * Return the current action of the Selection.
     * This can be one of:
     * 'translating' | 'selecting' or any custom action.
     * This is especially useful if you want to prevent from something happening
     * while the selection is taking place (e.g. in the 'selecting' state and you are
     * handling the mouseover event).
     * @returns {string}
     */
    getAction: function() {

        return this._action;
    }
}, {

    depthComparator: function(element) {
        // Where depth is a number of ancestors.
        return element.getAncestors().length;
    },

    HandlePosition: HandlePosition
});

// An alias for backwards compatibility
export const SelectionView = Selection;
