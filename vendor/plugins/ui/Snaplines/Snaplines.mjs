//  Snaplines plugin
//-------------------

// Snaplines plugin helps creating diagramms by snapping elements to better-looking positions
// (aligned with other elements) while they are dragged. It's an alternative to layout algorithms.

import $ from 'jquery';
import { g, util, mvc } from 'jointjs/src/core.mjs';

const HandlePosition = {
    N: 'n', NW: 'nw',
    W: 'w', SW: 'sw',
    S: 's', SE: 'se',
    E: 'e', NE: 'ne'
}

export const Snaplines = mvc.View.extend({

    options: {
        paper: undefined,
        distance: 10
    },

    className: 'snaplines',

    documentEvents: {
        mouseup: 'hide',
        touchend: 'hide'
    },

    init: function() {

        util.bindAll(this, 'hide');

        this.render();
        this.startListening();
        this.prepareFilters();
    },

    render: function() {

        const { $el, options } = this;
        const $horizontal = this.$horizontal = $('<div>').addClass('snapline horizontal');
        const $vertical = this.$vertical = $('<div>').addClass('snapline vertical');

        $el.hide()
            .append([$horizontal, $vertical])
            .appendTo(options.paper.el);
    },

    startListening: function() {

        this.stopListening();

        this.listenTo(this.options.paper, 'element:pointerdown', this.captureCursorOffset);
        this.listenTo(this.options.paper, 'element:pointermove', this.snapWhileMoving);
        this.listenTo(this.options.paper.model, 'batch:stop', this.onBatchStop);

        this.delegateDocumentEvents();
    },

    prepareFilters: function() {

        // Cache filters and make them a hash table for easier and faster access.
        // `options.filter` can contain either strings in which case they are considered
        // cell types that should be filtered out or objects in which case they must
        // be cells that should be filtered out from snapping. Alternatively,
        // `options.filter` can be a function that is passed an element and must
        // return `true` if the element should be filtered out of the snapping.
        this.filterTypes = {};
        this.filterCells = {};
        this.filterFunction = undefined;

        if (Array.isArray(this.options.filter)) {

            this.options.filter.forEach(function(item) {

                if (util.isString(item)) {
                    this.filterTypes[item] = true;
                } else {
                    this.filterCells[item.id] = true;
                }

            }, this);

        } else if (util.isFunction(this.options.filter)) {

            this.filterFunction = this.options.filter;
        }
    },

    onBatchStop: function(data) {

        data = data || {};

        if (data.batchName === 'resize') {

            this.snapWhileResizing(data.cell, data);
        }
    },

    captureCursorOffset: function(cellView, evt, x, y) {

        var view = cellView.getDelegatedView();

        if (!view || !this.canElementMove(view)) return;

        var cellPosition = view.model.get('position');

        // store the difference between top-left corner and pointer coordinates
        this._cursorOffset = {
            x: x - cellPosition.x,
            y: y - cellPosition.y
        };
    },

    snapWhileResizing: function(cell, opt) {

        if (!opt.ui || opt.snapped || !opt.direction || !opt.trueDirection) return;

        var cellView = this.options.paper.findViewByModel(cell);

        if (!cellView || !cellView.model.isElement()) {
            return ;
        }

        var cellBBox = cell.getBBox();
        var cellBBoxRotated = cellBBox.bbox(cell.get('angle'));
        var cellTopLeft = cellBBoxRotated.origin();
        var cellBottomRight = cellBBoxRotated.corner();
        var normalizedAngle = g.normalizeAngle(cell.get('angle'));
        var distance = this.options.distance;
        var vertical = null;
        var horizontal = null;

        // The vertical and horizontal lines to use when checking for snaplines.
        var cellLine = { vertical: 0, horizontal: 0 };

        var direction = opt.direction;
        var trueDirection = opt.trueDirection;
        var relativeDirection = opt.relativeDirection;

        if (trueDirection.indexOf('right') !== -1) {
            cellLine.vertical = cellBottomRight.x;
        } else {
            cellLine.vertical = cellTopLeft.x;
        }

        if (trueDirection.indexOf('bottom') !== -1) {
            cellLine.horizontal = cellBottomRight.y;
        } else {
            cellLine.horizontal = cellTopLeft.y;
        }

        this.options.paper.model.getElements().find(function(snapElement) {

            if (
                snapElement.id === cell.id ||
                snapElement.isEmbeddedIn(cell) ||
                this.filterTypes[snapElement.get('type')] ||
                this.filterCells[snapElement.id] ||
                (this.filterFunction && this.filterFunction(snapElement))
            ) {
                return false;
            }

            var snapBBox = snapElement.getBBox().bbox(snapElement.get('angle'));
            var snapTopLeft = snapBBox.origin();
            var snapBottomRight = snapBBox.corner();

            var snapLinesByAxis = {
                vertical: [
                    snapTopLeft.x,
                    snapBottomRight.x
                ],
                horizontal: [
                    snapTopLeft.y,
                    snapBottomRight.y
                ]
            };

            util.forIn(snapLinesByAxis, function(snapLines, axis) {

                snapLines = snapLines.map(function(snapLine) {

                    return {
                        position: snapLine,
                        // Calculate the distance to each snapline.
                        distance: Math.abs(snapLine - cellLine[axis])
                    };
                });

                // Filter out snaplines that are too far away.
                snapLines = snapLines.filter(function(snapLine) {
                    return snapLine.distance < distance;
                });

                // Sort by distance.
                snapLines = util.sortBy(snapLines, function(snapLine) {
                    return snapLine.distance
                });

                snapLinesByAxis[axis] = snapLines;
            });

            if (vertical === null && snapLinesByAxis.vertical.length > 0) {

                vertical = snapLinesByAxis.vertical[0].position;
            }

            if (horizontal === null && snapLinesByAxis.horizontal.length > 0) {

                horizontal = snapLinesByAxis.horizontal[0].position;
            }

            // keeps looking until all elements processed or both vertical and horizontal line found
            return util.isNumber(vertical) && util.isNumber(horizontal);

        }, this);

        this.hide();

        if (util.isNumber(vertical) || util.isNumber(horizontal)) {

            var diffX = 0;

            if (util.isNumber(vertical)) {

                if (trueDirection.indexOf('right') !== -1) {
                    diffX = vertical - cellBBoxRotated.corner().x;
                } else {
                    diffX = cellBBoxRotated.origin().x - vertical;
                }
            }

            var diffY = 0;

            if (util.isNumber(horizontal)) {

                if (trueDirection.indexOf('bottom') !== -1) {
                    diffY = horizontal - cellBBoxRotated.corner().y;
                } else {
                    diffY = cellBBoxRotated.origin().y - horizontal;
                }
            }

            var diffWidth = 0;
            var diffHeight = 0;
            var isAtRightAngle = !(normalizedAngle % 90);

            if (isAtRightAngle) {

                if (normalizedAngle === 90 || normalizedAngle === 270) {

                    diffWidth = diffY;
                    diffHeight = diffX;

                } else {

                    diffWidth = diffX;
                    diffHeight = diffY;
                }

            } else {

                // A little bit more complicated.

                // See:
                // https://www.mathsisfun.com/algebra/trig-four-quadrants.html
                var quadrant;

                if (normalizedAngle >= 0 && normalizedAngle < 90) {
                    quadrant = 1;
                } else if (normalizedAngle >= 90 && normalizedAngle < 180) {
                    quadrant = 4;
                } else if (normalizedAngle >= 180 && normalizedAngle < 270) {
                    quadrant = 3;
                } else {
                    quadrant = 2;
                }

                if (horizontal && vertical) {

                    // Use only one of the snaplines.
                    // Pick the closest snapline.
                    if (diffY > diffX) {
                        diffY = 0;
                        horizontal = null;
                    } else {
                        diffX = 0;
                        vertical = null;
                    }
                }

                var angleInRadians = g.toRad(normalizedAngle % 90);

                if (diffX) {
                    if (quadrant === 3) {
                        diffWidth = diffX / Math.cos(angleInRadians);
                    } else {
                        diffWidth = diffX / Math.sin(angleInRadians);
                    }
                }

                if (diffY) {
                    if (quadrant === 3) {
                        diffHeight = diffY / Math.cos(angleInRadians);
                    } else {
                        diffHeight = diffY / Math.sin(angleInRadians);
                    }
                }

                var isQuadrantOneOrThree = quadrant === 1 || quadrant === 3;

                switch (relativeDirection) {

                    case 'top':
                    case 'bottom':

                        if (diffY) {
                            diffHeight = diffY / (isQuadrantOneOrThree ? Math.cos(angleInRadians) : Math.sin(angleInRadians));
                        } else {
                            diffHeight = diffX / (isQuadrantOneOrThree ? Math.sin(angleInRadians) : Math.cos(angleInRadians));
                        }
                        break;

                    case 'left':
                    case 'right':

                        if (diffX) {
                            diffWidth = diffX / (isQuadrantOneOrThree ? Math.cos(angleInRadians) : Math.sin(angleInRadians));
                        } else {
                            diffWidth = diffY / (isQuadrantOneOrThree ? Math.sin(angleInRadians) : Math.cos(angleInRadians));
                        }
                        break;
                }
            }

            switch (relativeDirection) {

                case 'top':
                case 'bottom':
                    // Keep the width the same.
                    diffWidth = 0;
                    break;

                case 'left':
                case 'right':
                    // Keep the height the same.
                    diffHeight = 0;
                    break;
            }

            var gridSize = this.options.paper.options.gridSize;
            var newWidth = Math.max(cellBBox.width + diffWidth, gridSize);
            var newHeight = Math.max(cellBBox.height + diffHeight, gridSize);

            if (opt.minWidth && opt.minWidth > gridSize) {
                newWidth = Math.max(newWidth, opt.minWidth);
            }

            if (opt.minHeight && opt.minHeight > gridSize) {
                newHeight = Math.max(newHeight, opt.minHeight);
            }

            if (opt.maxWidth) {
                newWidth = Math.min(newWidth, opt.maxWidth);
            }

            if (opt.maxHeight) {
                newHeight = Math.min(newHeight, opt.maxHeight);
            }

            if (opt.preserveAspectRatio) {

                if (diffWidth > diffHeight) {
                    newHeight = newWidth * (cellBBox.height / cellBBox.width);
                } else {
                    newWidth = newHeight * (cellBBox.width / cellBBox.height);
                }
            }

            if (newWidth !== cellBBox.width || newHeight !== cellBBox.height) {

                cell.resize(newWidth, newHeight, {
                    snaplines: this.cid,
                    restrictedArea: this.options.paper.getRestrictedArea(cellView),
                    direction: direction,
                    relativeDirection: relativeDirection,
                    trueDirection: trueDirection,
                    // backwards compatibility
                    snapped: true
                });
            }

            // Due to the applying minimal/maximal width/height the element might not be
            // snapped to a snapline in the end. We need to check this.
            var resBBox = cell.getBBox().bbox(normalizedAngle);
            var precision = 1;
            if (
                vertical &&
                (Math.abs(resBBox.x - vertical) > precision) &&
                (Math.abs(resBBox.width + resBBox.x - vertical) > precision)
            ) {
                vertical = null;
            }
            if (
                horizontal &&
                (Math.abs(resBBox.y - horizontal) > precision) &&
                (Math.abs(resBBox.height + resBBox.y - horizontal) > precision)
            ) {
                horizontal = null;
            }

            this.show({ vertical: vertical, horizontal: horizontal });
        }
    },

    canElementMove: function(cellView) {

        return cellView && cellView.model.isElement() && cellView.can('elementMove');
    },

    snapWhileMoving: function(cellView, evt, x, y) {

        var data = cellView.eventData(evt);
        var view = data.delegatedView || cellView;

        if (!this.canElementMove(view)) {
            return ;
        }

        var cell = view.model;
        var currentPosition = cell.get('position');
        var currentSize = cell.get('size');
        var cellBBox = g.rect(util.assign({
            x: x - this._cursorOffset.x,
            y: y - this._cursorOffset.y
        }, currentSize));
        var cellCenter = cellBBox.center();
        var cellBBoxRotated = cellBBox.bbox(cell.get('angle'));
        var cellTopLeft = cellBBoxRotated.origin();
        var cellBottomRight = cellBBoxRotated.corner();

        var distance = this.options.distance;
        var vertical = null;
        var horizontal = null;
        var verticalFix = 0;
        var horizontalFix = 0;

        // find vertical and horizontal lines by comparing top-left, bottom-right and center bbox points
        this.options.paper.model.getElements().find(function(snapElement) {

            if (
                snapElement === cell ||
                snapElement.isEmbeddedIn(cell) ||
                this.filterTypes[snapElement.get('type')] ||
                this.filterCells[snapElement.id] ||
                (this.filterFunction && this.filterFunction(snapElement))
            ) {
                return false;
            }

            var snapBBox = snapElement.getBBox().bbox(snapElement.get('angle'));
            var snapCenter = snapBBox.center();
            var snapTopLeft = snapBBox.origin();
            var snapBottomRight = snapBBox.corner();

            if (vertical === null) {

                if (Math.abs(snapCenter.x - cellCenter.x) < distance) {
                    vertical = snapCenter.x;
                    verticalFix = 0.5;
                } else if (Math.abs(snapTopLeft.x - cellTopLeft.x) < distance) {
                    vertical = snapTopLeft.x;
                } else if (Math.abs(snapTopLeft.x - cellBottomRight.x) < distance) {
                    vertical = snapTopLeft.x;
                    verticalFix = 1;
                } else if (Math.abs(snapBottomRight.x - cellBottomRight.x) < distance) {
                    vertical = snapBottomRight.x;
                    verticalFix = 1;
                } else if (Math.abs(snapBottomRight.x - cellTopLeft.x) < distance) {
                    vertical = snapBottomRight.x;
                }
            }

            if (horizontal === null) {

                if (Math.abs(snapCenter.y - cellCenter.y) < distance) {
                    horizontal = snapCenter.y;
                    horizontalFix = 0.5;
                } else if (Math.abs(snapTopLeft.y - cellTopLeft.y) < distance) {
                    horizontal = snapTopLeft.y;
                } else if (Math.abs(snapTopLeft.y - cellBottomRight.y) < distance) {
                    horizontal = snapTopLeft.y;
                    horizontalFix = 1;
                } else if (Math.abs(snapBottomRight.y - cellBottomRight.y) < distance) {
                    horizontal = snapBottomRight.y;
                    horizontalFix = 1;
                } else if (Math.abs(snapBottomRight.y - cellTopLeft.y) < distance) {
                    horizontal = snapBottomRight.y;
                }
            }

            // keeps looking until all elements processed or both vertical and horizontal line found
            return util.isNumber(vertical) && util.isNumber(horizontal);

        }, this);

        this.hide();

        if (util.isNumber(vertical) || util.isNumber(horizontal)) {

            if (util.isNumber(vertical)) {
                cellBBoxRotated.x = vertical - (verticalFix * cellBBoxRotated.width);
            }

            if (util.isNumber(horizontal)) {
                cellBBoxRotated.y = horizontal - (horizontalFix * cellBBoxRotated.height);
            }

            // find x and y of the unrotated cell
            var newCellCenter = cellBBoxRotated.center();
            var newX = newCellCenter.x - (cellBBox.width / 2);
            var newY = newCellCenter.y - (cellBBox.height / 2);

            cell.translate(newX - currentPosition.x, newY - currentPosition.y, {
                restrictedArea: this.options.paper.getRestrictedArea(view),
                snapped: true
            });

            this.show({ vertical: vertical, horizontal: horizontal });
        }
    },

    show: function(opt = {}) {

        const { vertical, horizontal } = opt;
        const { options, $horizontal, $vertical, $el } = this;
        const { a: sx, d: sy, e: tx, f: ty } = options.paper.matrix();

        if (util.isNumber(horizontal)) {
            $horizontal.css('top', horizontal * sy + ty).show();
        } else {
            $horizontal.hide();
        }

        if (util.isNumber(vertical)) {
            $vertical.css('left', vertical * sx + tx).show();
        } else {
            $vertical.hide();
        }

        $el.show();
    },

    hide: function() {

        this.$el.hide();
    }
}, {
    HandlePosition: HandlePosition
});
