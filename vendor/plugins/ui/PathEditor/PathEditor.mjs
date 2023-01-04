import $ from 'jquery';
import { V, g, util, mvc } from 'jointjs/src/core.mjs';

export const PathEditor = mvc.View.extend({

    tagName: 'g',

    svgElement: true,

    className: 'path-editor',

    events: {
        'mousedown .anchor-point': 'onAnchorPointPointerDown',
        'mousedown .control-point': 'onControlPointPointerDown',
        'mousedown .segment-path': 'onSegmentPathPointerDown',
        //'mousemove': 'onPointerMove', // only bound (while mousedown), see `documentEvents`
        //'mouseup': 'onPointerUp', // only bound (ends mousedown), see `documentEvents`
        'touchstart .anchor-point': 'onAnchorPointPointerDown',
        'touchstart .control-point': 'onControlPointPointerDown',
        'touchstart .segment-path': 'onSegmentPathPointerDown',
        //'touchmove': 'onPointerMove', // only bound (while touch), see `documentEvents`
        //'touchup': 'onPointerUp', // only bound (ends touch), see `documentEvents`
        //'touchcancel': 'onPointerUp', // only bound (ends touch), see `documentEvents`
        'dblclick .anchor-point': 'onAnchorPointDoubleClick',
        'dblclick .control-point': 'onControlPointDoubleClick',
        'dblclick .segment-path': 'onSegmentPathDoubleClick'
    },

    documentEvents: {
        'mousemove': 'onPointerMove',
        'touchmove': 'onPointerMove',
        'mouseup': 'onPointerUp',
        'touchend': 'onPointerUp',
        'touchcancel': 'onPointerUp',
    },

    options: {
        anchorPointMarkup: '<circle r="2.5"/>',
        controlPointMarkup: '<circle r="2.5"/>'
    },

    init: function() {

        var pathNode = this.pathNode = V(this.options.pathElement).normalizePath().node;

        this.segList = pathNode.pathSegList;
        this.svgRoot = V(pathNode.ownerSVGElement);
        this.$document = $(pathNode.ownerDocument);

        this.render();
    },

    onRemove: function() {

        this.undelegateDocumentEvents();
        this.clear();
    },

    clear: function() {

        var vel = this.vel;
        vel.empty();

        this.directionPaths = [];
        this.segmentPaths = [];
        this.controlPoints = [];
        this.anchorPoints = [];

        // first subPath always starts at index '0'
        this._subPathIndices = [0];

        this.trigger('clear', this.pathNode);
    },

    _transformPoint: function(x, y, matrix) {

        return V.transformPoint(new g.Point(x, y), matrix);
    },

    _getPathCTM: function() {

        return this.pathNode.getCTM();
    },

    render: function() {

        this.clear();

        var vel = this.vel;

        var ctm = this._getPathCTM();

        var anchorTpl = V(this.options.anchorPointMarkup).addClass('anchor-point');
        var controlTpl = V(this.options.controlPointMarkup).addClass('control-point');
        var directionPathTpl = V('<path class="direction-path"/>');
        var segPathTpl = V('<path class="segment-path"/>');

        var segList = this.segList;

        var anchorPoints = this.anchorPoints;
        var controlPoints = this.controlPoints;
        var directionPaths = this.directionPaths;
        var segmentPaths = this.segmentPaths;

        var _subPathIndices = this._subPathIndices;

        var index;
        var prevX;
        var prevY;
        for (index = 0, prevX = 0, prevY = 0; index < segList.numberOfItems; index++) {

            var seg = segList.getItem(index);

            // convert to transformed coordinates to match how path is rendered on screen
            var segCoords = this._transformPoint(seg.x, seg.y, ctm);
            var x = segCoords.x;
            var y = segCoords.y;

            if (seg.pathSegType != SVGPathSeg.PATHSEG_CLOSEPATH) {
                anchorPoints[index] = anchorTpl.clone().attr({
                    index: index,
                    cx: x,
                    cy: y
                });
            }

            if (seg.pathSegType != SVGPathSeg.PATHSEG_MOVETO_ABS) {
                var segPath = segPathTpl.clone().attr('index', index).node;
                segPath.pathSegList.initialize(segPath.createSVGPathSegMovetoAbs(prevX, prevY));

                switch (seg.pathSegType) {
                    case SVGPathSeg.PATHSEG_CLOSEPATH:
                        var subPathStartSeg = segList.getItem(_subPathIndices[0]);

                        var subPathStartSegPoint = this._transformPoint(subPathStartSeg.x, subPathStartSeg.y, ctm);
                        x = subPathStartSegPoint.x;
                        y = subPathStartSegPoint.y;

                        segPath.pathSegList.appendItem(segPath.createSVGPathSegLinetoAbs(x, y));
                        _subPathIndices.unshift(index + 1);
                        break;

                    case SVGPathSeg.PATHSEG_LINETO_ABS:
                        segPath.pathSegList.appendItem(segPath.createSVGPathSegLinetoAbs(x, y));
                        break;

                    case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
                        var controlSegCoords1 = this._transformPoint(seg.x1, seg.y1, ctm);
                        var controlPoint1 = controlTpl.clone().attr({
                            index: index,
                            'attribute-index': 1,
                            cx: controlSegCoords1.x,
                            cy: controlSegCoords1.y
                        });

                        var controlSegCoords2 = this._transformPoint(seg.x2, seg.y2, ctm);
                        var controlPoint2 = controlTpl.clone().attr({
                            index: index,
                            'attribute-index': 2,
                            cx: controlSegCoords2.x,
                            cy: controlSegCoords2.y
                        });

                        controlPoints[index] = [controlPoint1, controlPoint2];

                        segPath.pathSegList.appendItem(segPath.createSVGPathSegCurvetoCubicAbs(x, y, controlSegCoords1.x, controlSegCoords1.y, controlSegCoords2.x, controlSegCoords2.y));

                        directionPaths[index] = [
                            directionPathTpl.clone().attr('d', ['M', prevX, prevY, 'L', controlSegCoords1.x, controlSegCoords1.y].join(' ')),
                            directionPathTpl.clone().attr('d', ['M', x, y, 'L', controlSegCoords2.x, controlSegCoords2.y].join(' '))
                        ];
                        break;
                }

                segmentPaths[index] = segPath;
            }

            prevX = x;
            prevY = y;
        }

        var elements = [];
        segmentPaths.forEach(function(segment) {
            if (segment) elements.push(segment)
        });
        directionPaths.forEach(function(direction) {
            if (direction) Array.prototype.push.apply(elements, direction);
        })
        anchorPoints.forEach(function(anchor) {
            if (anchor) elements.push(anchor)
        });
        controlPoints.forEach(function(control) {
            if (control) Array.prototype.push.apply(elements, control);
        });

        vel.append(elements);

        this.svgRoot.append(vel);
    },

    startMoving: function(e) {

        var evt = util.normalizeEvent(e);

        var $point = this.$point = $(evt.target);

        this.prevClientX = evt.clientX;
        this.prevClientY = evt.clientY;

        var index = parseInt(this.$point.attr('index'), 10);

        // TODO major release: args should be = this.pathNode, evt
        this.trigger('path:interact');
        if ($point.hasClass('anchor-point')) {
            // TODO major release (breaking change): args should be = this.pathNode, evt, { index, segPoint }
            this.trigger('path:anchor-point:select', index);
            // first clickable anchor point is 0
        } else if ($point.hasClass('control-point')) {
            var controlPointIndex = parseInt(this.$point.attr('attribute-index'), 10);
            // TODO major release (breaking change): args should be = this.pathNode, evt, { index, controlPointIndex, segPoint }
            this.trigger('path:control-point:select', index, controlPointIndex);
            // the index refers to the index of the curveto segment this control point belongs to
            // curveto segment's control point 1 has index 1, control point 2 has index 2
            // first clickable control point is at 1, 1 (even though the point has a direction path connected to anchor point 0)
        } else {
            // TODO major release (breaking change): args should be = this.pathNode, evt, { index }
            this.trigger('path:segment:select', index);
            // first clickable segment is segment 1
            // segment 0 is the first M segment (which has no path)
        }

        evt.stopPropagation();
        evt.preventDefault();

        // clear values of movement variables
        this.index = undefined;
        this.controlPointIndex = undefined;
        this.segPoint = undefined;

        this.pathEditedEventType = undefined;
    },

    move: function(e) {

        var $point = this.$point;

        if (!$point) return;

        // move anchor and control points
        var evt = util.normalizeEvent(e);
        var dx = evt.clientX - this.prevClientX;
        var dy = evt.clientY - this.prevClientY;

        var index = parseInt($point.attr('index'), 10);

        if ($point.hasClass('anchor-point')) {
            // move anchor point
            this.adjustAnchorPoint(index, dx, dy, evt);

        } else if ($point.hasClass('control-point')) {
            // move control point
            var controlPointIndex = parseInt($point.attr('attribute-index'), 10);
            this.adjustControlPoint(index, controlPointIndex, dx, dy, evt);

        } else {
            // move segment
            this.adjustSegment(index, dx, dy, evt);
        }

        // move the direction paths
        this.prevClientX = evt.clientX;
        this.prevClientY = evt.clientY;
    },

    // note that `evt` is normalized event
    adjustSegment: function(index, dx, dy, evt, { dry = undefined } = {}) {

        this.adjustAnchorPoint(index - 1, dx, dy, { dry: true });
        this.adjustAnchorPoint(index, dx, dy, { dry: true });

        if (!dry) {
            // preserve values of movement variables
            this.pathEditedEventType = 'path:segment:adjust';
            this.index = index;

            // trigger movement events
            this.trigger('path:editing', this.pathNode, evt);
            this.trigger('path:segment:adjusting', this.pathNode, evt, { index });
        }
    },

    // note that `evt` is normalized event
    adjustControlPoint: function(index, controlPointIndex, dx, dy, evt, { dry = undefined } = {}) {

        // get the path transformation matrix
        var ctm = this._getPathCTM();

        var segList = this.segList;

        // the raw path data is not transformed
        var seg = segList.getItem(index);

        var controlPoints = this.controlPoints;

        // the client movement data is transformed because it comes from interaction events in a transformed viewport
        // convert to untransformed coordinates to match the path's underlying representation (untransformed)
        var inverseCTM = ctm.inverse();
        // translations are ignored since we are interested in differences in position
        inverseCTM.e = 0;
        inverseCTM.f = 0;
        var moveCoords = this._transformPoint(dx, dy, inverseCTM);

        // apply untransformed client movement data to untransformed path data
        var xA = 'x' + controlPointIndex;
        var yA = 'y' + controlPointIndex;
        seg[xA] += moveCoords.x;
        seg[yA] += moveCoords.y;

        // convert to transformed coordinates to match how path is rendered on screen
        var controlSegCoords = this._transformPoint(seg[xA], seg[yA], ctm);
        var segPoint = new g.Point(controlSegCoords); // save a copy for later
        var controlPoint = controlPoints[index][controlPointIndex - 1].attr({
            cx: controlSegCoords.x,
            cy: controlSegCoords.y
        });

        if (controlPoint.hasClass('locked')) {
            // this control point is locked with another control point
            // we also need to modify the bound control point
            var boundIndex = this.getBoundIndex(index, controlPointIndex);
            var boundControlPointIndex = ((controlPointIndex === 1) ? 2 : 1);
            var bindSeg = segList.getItem(boundIndex);

            // recalculate bound point with untransformed coordinates
            var xB = 'x' + boundControlPointIndex;
            var yB = 'y' + boundControlPointIndex;
            var center = new g.Point(((controlPointIndex === 1) ? bindSeg.x : seg.x), ((controlPointIndex === 1) ? bindSeg.y : seg.y));
            var controlPos = new g.Point(seg[xA], seg[yA]);
            var distance = center.distance(new g.Point(bindSeg[xB], bindSeg[yB]));
            var bindControlPos = center.move(controlPos, distance);
            bindSeg[xB] = bindControlPos.x;
            bindSeg[yB] = bindControlPos.y;

            // convert to transformed coordinates
            var bindControlSegCoords = this._transformPoint(bindSeg[xB], bindSeg[yB], ctm);
            controlPoints[boundIndex][boundControlPointIndex - 1].attr({
                cx: bindControlSegCoords.x,
                cy: bindControlSegCoords.y
            });

            // update paths involving bound control point
            this.updateDirectionPaths(boundIndex);
            this.updateSegmentPath(boundIndex);
        }

        // update paths involving control point
        this.updateDirectionPaths(index);
        this.updateSegmentPath(index);

        if (!dry) {
            // preserve values of movement variables
            this.pathEditedEventType = 'path:control-point:adjust';
            this.index = index;
            this.controlPointIndex = controlPointIndex;
            this.segPoint = segPoint;

            // trigger movement events
            this.trigger('path:editing', this.pathNode, evt);
            this.trigger('path:control-point:adjusting', this.pathNode, evt, { index, controlPointIndex, segPoint });
        }
    },

    findSubpathIndex: function(index) {

        var indices = this._subPathIndices;
        for (var i = 0, n = indices.length; i < n; i++) {
            if (indices[i] < index) return indices[i];
        }
        return undefined;
    },

    findReversedSubpathIndex: function(index) {

        var indices = this._subPathIndices;
        for (var i = indices.length - 1; i >= 0; i--) {
            if (indices[i] > index) return indices[i];
        }
        return undefined;
    },

    // note that `evt` is normalized event
    adjustAnchorPoint: function(index, dx, dy, evt, { dry = undefined } = {}) {

        // get the path transformation matrix
        var ctm = this._getPathCTM();

        var segList = this.segList;

        // the raw path data is not transformed
        var seg = segList.getItem(index);
        if (seg.pathSegType == SVGPathSeg.PATHSEG_CLOSEPATH) {
            index = this.findSubpathIndex(index);
            seg = segList.getItem(index);
        }

        var anchorPoints = this.anchorPoints;
        var controlPoints = this.controlPoints;

        // if we move either endpoint, control points across start anchor point must be unlocked
        var lastIndex = anchorPoints.length - 1;
        if ((index === 0 || index === lastIndex) && controlPoints[1] && controlPoints[lastIndex]) {
            var controlPoint1 = controlPoints[1][0];
            var controlPoint2 = controlPoints[lastIndex][1];

            if (controlPoint1 && controlPoint1.hasClass('locked')) controlPoint1.removeClass('locked');
            if (controlPoint2 && controlPoint2.hasClass('locked')) controlPoint2.removeClass('locked');
        }

        // the client movement data is transformed because it comes from interaction events in a transformed viewport
        // convert to untransformed coordinates to match the path's underlying representation (untransformed)
        var inverseCTM = ctm.inverse();
        // translations are ignored since we are interested in differences in position
        inverseCTM.e = 0;
        inverseCTM.f = 0;
        var moveCoords = this._transformPoint(dx, dy, inverseCTM);

        // apply untransformed client movement data to untransformed path data
        seg.x += moveCoords.x;
        seg.y += moveCoords.y;

        // convert to transformed coordinates to match how path is rendered on screen
        var segCoords = this._transformPoint(seg.x, seg.y, ctm);
        var segPoint = new g.Point(segCoords); // save a copy for later
        anchorPoints[index].attr({
            cx: segCoords.x,
            cy: segCoords.y
        });

        if (seg.pathSegType == SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS) {
            // apply untransformed client movement data to untransformed path data
            seg.x2 += moveCoords.x;
            seg.y2 += moveCoords.y;

            // convert to transformed coordinates
            var controlSegCoords = this._transformPoint(seg.x2, seg.y2, ctm);
            controlPoints[index][1].attr({
                cx: controlSegCoords.x,
                cy: controlSegCoords.y
            });
        }

        var nextSeg = ((index + 1) < segList.numberOfItems) ? segList.getItem(index + 1) : 0;

        if (nextSeg) {
            if (nextSeg.pathSegType == SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS) {
                // apply untransformed client movement data to untransformed path data
                nextSeg.x1 += moveCoords.x;
                nextSeg.y1 += moveCoords.y;

                // convert to transformed coordinates
                var nextControlSegCoords = this._transformPoint(nextSeg.x1, nextSeg.y1, ctm);
                controlPoints[index + 1][0].attr({
                    cx: nextControlSegCoords.x,
                    cy: nextControlSegCoords.y
                });

                // update control paths involving next anchor point
                this.updateDirectionPaths(index + 1);
            }

            // update segment path involving next anchor point
            this.updateSegmentPath(index + 1);
        }

        // update paths involving this anchor point
        this.updateDirectionPaths(index);
        this.updateSegmentPath(index);

        if (!dry) {
            // preserve values of movement variables
            this.pathEditedEventType = 'path:anchor-point:adjust';
            this.index = index;
            this.segPoint = segPoint;

            // trigger movement events
            this.trigger('path:editing', this.pathNode, evt);
            this.trigger('path:anchor-point:adjusting', this.pathNode, evt, { index, segPoint });
        }
    },

    // updates paths from a given segment to control points
    updateDirectionPaths: function(index) {

        // get the path transformation matrix
        var ctm = this._getPathCTM();

        var segList = this.segList;

        // raw path data is unconverted
        // convert to transformed coordinates to match how path is rendered on screen
        var seg = segList.getItem(index);
        var segCoords = this._transformPoint(seg.x, seg.y, ctm);

        // make sure that previous segment exists
        var prevSeg = (index > 0) ? segList.getItem(index - 1) : null;
        var prevSegCoords = prevSeg ? this._transformPoint(prevSeg.x, prevSeg.y, ctm) : null;

        // for each direction path from this anchor point
        var directionPaths = this.directionPaths[index];
        if (!Array.isArray(directionPaths)) return;
        directionPaths.forEach(function(directionPath, i) {

            i++;

            var controlSegCoords = this._transformPoint(seg['x' + i], seg['y' + i], ctm);

            // update the path with transformed coordinates
            directionPath.attr('d', [
                'M',
                (i > 1 || !prevSeg) ? segCoords.x : prevSegCoords.x,
                (i > 1 || !prevSeg) ? segCoords.y : prevSegCoords.y,
                controlSegCoords.x,
                controlSegCoords.y
            ].join(' '));

        }, this);
    },

    // updates given path
    updateSegmentPath: function(index) {

        var segList = this.segList;

        var _subPathIndices = this._subPathIndices;

        if (_subPathIndices.includes(index)) {
            var segMaxIndex = this.findReversedSubpathIndex(index) || segList.numberOfItems;

            segMaxIndex--;

            if (segList.getItem(segMaxIndex).pathSegType != SVGPathSeg.PATHSEG_CLOSEPATH) return;

            index = segMaxIndex;
        }

        // first segment (index = 0) is always 'M' and such it has no segmentPath
        var segPath = this.segmentPaths[index];
        if (!segPath) return;

        // get the path transformation matrix
        var ctm = this._getPathCTM();

        // there is always a previous segment because we are skipping over the first segment
        // raw path data is untransformed
        // convert to transformed coordinates to match how path is rendered on screen
        var prevSeg = segList.getItem(index - 1);
        var prevSegCoords = this._transformPoint(prevSeg.x, prevSeg.y, ctm);
        // create the updated path
        var item = segPath.createSVGPathSegMovetoAbs(prevSegCoords.x, prevSegCoords.y);
        segPath.pathSegList.initialize(item);

        // transform path data to match path rendering
        var seg = segList.getItem(index);
        var segCoords = this._transformPoint(seg.x, seg.y, ctm);

        switch (seg.pathSegType) {
            case SVGPathSeg.PATHSEG_CLOSEPATH:
                // transform path data to match path rendering
                var nextSeg = segList.getItem(this.findSubpathIndex(index));
                var nextSegCoords = this._transformPoint(nextSeg.x, nextSeg.y, ctm);
                item = segPath.createSVGPathSegLinetoAbs(nextSegCoords.x, nextSegCoords.y);
                break;

            case SVGPathSeg.PATHSEG_LINETO_ABS:
                item = segPath.createSVGPathSegLinetoAbs(segCoords.x, segCoords.y);
                break;

            case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
                // transform control point data to match path rendering
                var controlSegCoords1 = this._transformPoint(seg.x1, seg.y1, ctm);
                var controlSegCoords2 = this._transformPoint(seg.x2, seg.y2, ctm);
                item = segPath.createSVGPathSegCurvetoCubicAbs(segCoords.x, segCoords.y, controlSegCoords1.x, controlSegCoords1.y, controlSegCoords2.x, controlSegCoords2.y);
                break;
        }

        segPath.pathSegList.appendItem(item);
    },

    stopMoving: function(e) {

        var evt = util.normalizeEvent(e);

        this.$point = undefined;

        // trigger 'path:edit' events only if:
        // - an `adjust` method has been called at least once, and
        // - the `adjust` method has not been called as `dry`
        if (this.pathEditedEventType) {
            var pathNode = this.pathNode;
            var index = this.index;
            var controlPointIndex = this.controlPointIndex;
            var segPoint = this.segPoint;

            this.trigger('path:edit', pathNode, evt);
            this.trigger(this.pathEditedEventType, pathNode, evt, { index, controlPointIndex, segPoint });
        }

        // clear values of movement variables
        this.index = undefined;
        this.controlPointIndex = undefined;
        this.segPoint = undefined;

        this.pathEditedEventType = undefined;
    },

    createAnchorPoint: function(e) {

        const evt = util.normalizeEvent(e);
        const index = V(evt.target).attr('index');
        const pathNode = this.pathNode;
        const segList = this.segList;

        const coords = V(pathNode).toLocalPoint(evt.pageX, evt.pageY);
        const seg = segList.getItem(index);
        const prevSeg = segList.getItem(index - 1);

        switch (seg.pathSegType) {
            // we assume that it is not possible to trigger this function at moveto segment
            case SVGPathSeg.PATHSEG_CLOSEPATH: {
                // option 1: we are dividing a closepath segment
                // TODO fix: we are assuming this closepath is at the end of the path
                // this means PathEditor is only able to deal with contiguous paths!
                // (no in-between closepath segments)
                // (when this is fixed, remove the incompatibility note from documentation too!)
                // (note: same problem appears in `convertSegementPath()`)
                const nextSeg = segList.getItem(0);
                // create a g.Line from `seg`
                const start = new g.Point(prevSeg.x, prevSeg.y);
                const end = new g.Point(nextSeg.x, nextSeg.y);
                const line = new g.Line(start, end);
                // divide `seg` into two lines at point closest to `coords` of user click
                var closestPoint = line.closestPoint(coords);
                // insert new line into `segList` with closestPoint's coordinates
                // the original closepath `seg` adjusts to come after this new segment
                segList.insertItemBefore(pathNode.createSVGPathSegLinetoAbs(closestPoint.x, closestPoint.y), index);
                break;
            }

            case SVGPathSeg.PATHSEG_LINETO_ABS: {
                // option 2: we are dividing a lineto segment
                // create a g.Line from `seg`
                const start = new g.Point(prevSeg.x, prevSeg.y);
                const end = new g.Point(seg.x, seg.y);
                const line = new g.Line(start, end);
                // divide `seg` into two lines at point closest to `coords` of user click
                const closestPoint = line.closestPoint(coords);
                // insert new line into `segList` with closestPoint's coordinates
                // the original `seg` adjusts to come after this new segment
                segList.insertItemBefore(pathNode.createSVGPathSegLinetoAbs(closestPoint.x, closestPoint.y), index);
                break;
            }

            case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS: {
                // option 3: we are dividing a curveto segment
                // create a g.Curve from `seg`
                const p1 = new g.Point(prevSeg.x, prevSeg.y);
                const p2 = new g.Point(seg.x1, seg.y1);
                const p3 = new g.Point(seg.x2, seg.y2);
                const p4 = new g.Point(seg.x, seg.y);
                const curve = new g.Curve(p1, p2, p3, p4);
                // divide `seg` into two curves at point closest to `coords` of user click
                // (in `closestPointT()`, we are using the default `precision === 3`)
                const t = curve.closestPointT(coords);
                const curves = curve.divideAtT(t);
                // insert new curve into `segList` that looks like the first curve from division
                // - start = prevSeg's end (unchanged)
                // - controlPoint1 = first curve's controlPoint1
                // - controlPoint2 = first curve's controlPoint2
                // - end = first curve's end
                // (inserting before `seg`)
                segList.insertItemBefore(pathNode.createSVGPathSegCurvetoCubicAbs(
                    curves[0].end.x,
                    curves[0].end.y,
                    curves[0].controlPoint1.x,
                    curves[0].controlPoint1.y,
                    curves[0].controlPoint2.x,
                    curves[0].controlPoint2.y
                ), index);
                // change the original `seg` to look like the second curve from division
                // - start = first curve's end (see above)
                // - controlPoint1 = second curve's controlPoint1
                // - controlPoint2 = second curve's controlPoint2
                // - end = seg's (unchanged)
                seg.x1 = curves[1].controlPoint1.x;
                seg.y1 = curves[1].controlPoint1.y;
                seg.x2 = curves[1].controlPoint2.x;
                seg.y2 = curves[1].controlPoint2.y;
                break;
            }
        }

        this.render();

        this.trigger('path:edit', pathNode, evt);
        this.trigger('path:anchor-point:create', pathNode, evt);
    },

    removeAnchorPoint: function(e) {

        var evt = util.normalizeEvent(e);
        var index = parseInt($(evt.target).attr('index'), 10);

        var pathNode = this.pathNode;
        var segList = this.segList;

        var seg = segList.getItem(index);

        var nextSeg;
        var replacingSeg;

        switch (seg.pathSegType) {
            case SVGPathSeg.PATHSEG_MOVETO_ABS:
                // replace following segment with a moveto segment
                // then delete this segment
                nextSeg = segList.getItem(index + 1);
                replacingSeg = pathNode.createSVGPathSegMovetoAbs(nextSeg.x, nextSeg.y);
                segList.replaceItem(replacingSeg, index + 1);
                segList.removeItem(index);
                break;

            case SVGPathSeg.PATHSEG_LINETO_ABS:
                // just remove this segment
                segList.removeItem(index);
                break;

            case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS:
                // replace following curve's control point 1 with this curve's control point 1
                // if not followed by a curve, then discard the curve information
                // then delete this curveto segment
                if ((index + 1) <= (segList.numberOfItems - 1)) {
                    nextSeg = segList.getItem(index + 1);
                    if (nextSeg.pathSegType == SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS) {
                        nextSeg.x1 = seg.x1;
                        nextSeg.y1 = seg.y1;
                    }
                }
                segList.removeItem(index);
                break;
        }

        this.render();

        this.trigger('path:edit', pathNode, evt);
        this.trigger('path:anchor-point:remove', pathNode, evt);

        var numAnchorPoints = segList.numberOfItems;
        if (segList.getItem(segList.numberOfItems - 1).pathSegType == SVGPathSeg.PATHSEG_CLOSEPATH) {
            numAnchorPoints -= 1;
        }

        if (numAnchorPoints < 2) {
            // the path has too few points to be seen
            this.trigger('path:invalid', pathNode, evt);
        }
    },

    lockControlPoint: function(e) {

        var evt = util.normalizeEvent(e);
        var evtTarget = $(evt.target);

        var index = parseInt(evtTarget.attr('index'));
        var controlPointIndex = parseInt(evtTarget.attr('attribute-index'), 10);

        var boundIndex = this.getBoundIndex(index, controlPointIndex);
        var boundControlPointIndex = ((controlPointIndex === 1) ? 2 : 1);
        var boundControlPoint = this.controlPoints[boundIndex];

        if (boundControlPoint) {
            var isLocked = evtTarget.hasClass('locked');

            evtTarget.toggleClass('locked');
            boundControlPoint[boundControlPointIndex - 1].toggleClass('locked');

            // TODO major release: args should be = this.pathNode, evt
            this.trigger('path:interact');
            if (!isLocked) {
                // TODO major release (breaking change): args should be = this.pathNode, evt, { index, controlPointIndex, segPoint }
                this.trigger('path:control-point:lock', index, controlPointIndex);
                // automatically adjust bound control point according to the clicked control point:
                this.adjustControlPoint(index, controlPointIndex, 0, 0, { dry: true });
                // TODO: the path changes because of the above action:
                // - question 1: should this trigger edit/editing events too?
                // - question 2: should the 'path:control-point:lock' opt object contain information about the changed control point?
                // - OR: should we trigger an extra 'path:control-point:locked' event with information about the changed control point?
            } else {
                // TODO major release (breaking change): args should be = this.pathNode, evt, { index, controlPointIndex, segPoint }
                this.trigger('path:control-point:unlock', index, controlPointIndex);
            }
        }
    },

    getBoundIndex: function(index, controlPointIndex) {

        var boundIndex;

        var segList = this.segList;
        var lastSegIndex;
        var lastSegType;
        var closepathPresent;

        var anchorPoints = this.anchorPoints;
        var lastIndex = anchorPoints.length - 1;
        var endpointsIdenticalX;
        var endpointsIdenticalY;

        if (controlPointIndex === 1) {
            boundIndex = index - 1;

            if (boundIndex === 0) {
                // if we are trying to wrap past the start element:
                lastSegIndex = segList.numberOfItems - 1;
                lastSegType = segList.getItem(lastSegIndex).pathSegType;
                closepathPresent = (lastSegType == SVGPathSeg.PATHSEG_CLOSEPATH);

                endpointsIdenticalX = anchorPoints[0].attr('cx') === anchorPoints[lastIndex].attr('cx');
                endpointsIdenticalY = anchorPoints[0].attr('cy') === anchorPoints[lastIndex].attr('cy');

                if (closepathPresent && endpointsIdenticalX && endpointsIdenticalY) {
                    // there is a closepath segment between the start element and the last element AND
                    // the start element and the last element have the same coordinates
                    // (that is, the two curves look like any other curve join in the path)
                    boundIndex = lastIndex; // wrap to the last element
                }
                // else: leave the index at 0 (no control points correspond to the index)
            }

        } else {
            boundIndex = index + 1;

            if (boundIndex === (lastIndex + 1)) {
                // if we are trying to wrap past the last element:
                lastSegIndex = segList.numberOfItems - 1;
                lastSegType = segList.getItem(lastSegIndex).pathSegType;
                closepathPresent = (lastSegType == SVGPathSeg.PATHSEG_CLOSEPATH);

                endpointsIdenticalX = anchorPoints[0].attr('cx') === anchorPoints[lastIndex].attr('cx');
                endpointsIdenticalY = anchorPoints[0].attr('cy') === anchorPoints[lastIndex].attr('cy');

                if (closepathPresent && endpointsIdenticalX && endpointsIdenticalY) {
                    // there is a closepath segment between the last element and the start element AND
                    // the start element and the last element have the same coordinates
                    // (that is, the two curves look like any other curve join in the path)
                    boundIndex = 1; // wrap to the first element
                }
                // else: leave the index at (lastIndex + 1) (no control points correspond to the index)
            }
        }

        return boundIndex;
    },

    getControlPointLockedStates: function() {

        var controlPoints = this.controlPoints;

        var lockedStates = [];
        for (var index = 0; index < controlPoints.length; index++) {

            if (!controlPoints[index]) continue;

            lockedStates[index] = [];
            for (var j = 0; j <= 1; j++) {

                if (!controlPoints[index][j]) continue;

                var controlPointIndex = j + 1;

                if (controlPoints[index][j].hasClass('locked')) {
                    lockedStates[index][controlPointIndex] = true;

                } else {
                    lockedStates[index][controlPointIndex] = false;
                }
            }
        }

        return lockedStates;
    },

    setControlPointLockedStates: function(lockedStates) {

        var controlPoints = this.controlPoints;

        for (var index = 0; index < controlPoints.length; index++) {

            if (!lockedStates[index]) continue;
            if (!controlPoints[index]) continue;

            for (var controlPointIndex = 1; controlPointIndex <= 2; controlPointIndex++) {

                if (!lockedStates[index][controlPointIndex]) continue;
                if (!controlPoints[index][controlPointIndex - 1]) continue;

                if (lockedStates[index][controlPointIndex] === true) {
                    controlPoints[index][controlPointIndex - 1].addClass('locked');
                } else {
                    controlPoints[index][controlPointIndex - 1].removeClass('locked');
                }
            }
        }
    },

    convertSegmentPath: function(e) {

        const evt = util.normalizeEvent(e);
        const index = V(evt.target).attr('index');
        const pathNode = this.pathNode;
        const segList = this.segList;

        const seg = segList.getItem(index);

        switch (seg.pathSegType) {
            case SVGPathSeg.PATHSEG_CLOSEPATH: {
                // option 1: convert closepath segment to curveto segment
                // takes the coordinates of the initial path point as destination coordinates
                // creates a duplicate target point at initial point (no way around this in SVG)
                // (no way to reverse this duplication - unless SVG2 is released)
                // the original closepath segment now connects the two duplicate points together
                const prevSeg = segList.getItem(index - 1);
                // TODO fix: we are assuming this closepath is at the end of the path
                // this means PathEditor is only able to deal with contiguous paths!
                // (no in-between closepath segments)
                // (when this is fixed, remove the incompatibility note from documentation too!)
                // (note: same problem appears in `createAnchorPoint()`)
                const nextSeg = segList.getItem(0);
                segList.insertItemBefore(pathNode.createSVGPathSegCurvetoCubicAbs(nextSeg.x, nextSeg.y, prevSeg.x, prevSeg.y, nextSeg.x, nextSeg.y), index);
                break;

            } case SVGPathSeg.PATHSEG_LINETO_ABS: {
                // option 2: convert lineto segment to curveto segment
                // puts control points at the locations of the two endpoints of the original segment
                const prevSeg = segList.getItem(index - 1);
                segList.replaceItem(pathNode.createSVGPathSegCurvetoCubicAbs(seg.x, seg.y, prevSeg.x, prevSeg.y, seg.x, seg.y), index);
                break;

            } case SVGPathSeg.PATHSEG_CURVETO_CUBIC_ABS: {
                // option 3: convert curveto segment to lineto segment
                // segment endpoints stay endpoints, but curve control point information discarded
                segList.replaceItem(pathNode.createSVGPathSegLinetoAbs(seg.x, seg.y), index);
                break;
            }
        }

        this.render();

        this.trigger('path:edit', pathNode, evt);
        this.trigger('path:segment:convert', pathNode, evt);
    },

    addClosePathSegment: function(e) {

        var evt = util.normalizeEvent(e);
        var index = parseInt($(evt.target).attr('index'), 10);

        var segList = this.segList;

        if (index === 0 || index === segList.numberOfItems - 1) {
            // if the first or last anchor was selected:
            var seg = segList.getItem(segList.numberOfItems - 1);
            if (seg.pathSegType != SVGPathSeg.PATHSEG_CLOSEPATH) {
                var pathNode = this.pathNode;

                // if the last segment of path is not closepath:
                // add closepath at the end of path
                segList.appendItem(pathNode.createSVGPathSegClosePath());

                this.render();

                this.trigger('path:edit', pathNode, evt);
                this.trigger('path:closepath-segment:add', pathNode, evt);
            }
        }
    },

    removeClosePathSegment: function(e) {

        var evt = util.normalizeEvent(e);
        var index = V(evt.target).attr('index');

        var segList = this.segList;

        var seg = segList.getItem(index);

        if (seg.pathSegType == SVGPathSeg.PATHSEG_CLOSEPATH) {
            var pathNode = this.pathNode;

            segList.removeItem(index);

            this.render();

            this.trigger('path:edit', pathNode, evt);
            this.trigger('path:closepath-segment:remove', pathNode, evt);
        }
    },

    // if needed, `isMoreThanSecondClick()` is extremely easy to derive from this code
    // create another `clickCounter` and `timeout` variables
    // and then change `this.clickCounter >= 2` to `3`
    isMoreThanFirstClick: function() {

        const DOUBLE_CLICK_THRESHOLD = 400;

        // create or increment counter
        this.clickCounter = this.clickCounter || 0;
        this.clickCounter += 1;

        // renew timeout
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(function() {
            // if second click does not come within time threshold,
            // reset click counter back to `0`
            this.clickCounter = 0;
        }, DOUBLE_CLICK_THRESHOLD);

        // evaluate click counter
        if (this.clickCounter >= 2) {
            // this is a second click (or more)
            // stop timer and return `true`
            this.clickCounter = 0;
            clearTimeout(this.timeout);
            return true;
        } else {
            // this is a first click
            // keep timer running and return `false`
            return false;
        }
    },

    //////////////
    // Handlers //
    //////////////

    onAnchorPointPointerDown: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();

        // left button only
        if (evt.which !== 1) return;

        // first click only (if this was part of a double click)
        if (this.isMoreThanFirstClick()) return;

        this.startMoving(evt);

        this.delegateDocumentEvents();
    },

    onControlPointPointerDown: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();

        // left button only
        if (evt.which !== 1) return;

        // first click only (if this was part of a double click)
        if (this.isMoreThanFirstClick()) return;

        this.startMoving(evt);

        this.delegateDocumentEvents();
    },

    onSegmentPathPointerDown: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();

        // left button only
        if (evt.which !== 1) return;

        // first click only (if this was part of a double click)
        if (this.isMoreThanFirstClick()) return;

        this.startMoving(evt);

        this.delegateDocumentEvents();
    },

    onPointerMove: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();

        this.move(evt);
    },

    onPointerUp: function(e) {

        this.undelegateDocumentEvents();

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();

        this.stopMoving(evt);
    },

    onAnchorPointDoubleClick: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();
        evt.preventDefault();

        // left button only
        if (evt.which !== 1) return;

        this.removeAnchorPoint(evt); // default user interaction method

        // alternative method that could be called by this interaction:
        //this.addClosePathSegment(evt);
    },

    onControlPointDoubleClick: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();
        evt.preventDefault();

        // left button only
        if (evt.which !== 1) return;

        this.lockControlPoint(evt);
    },

    onSegmentPathDoubleClick: function(e) {

        var evt = util.normalizeEvent(e);

        evt.stopPropagation();
        evt.preventDefault();

        // left button only
        if (evt.which !== 1) return;

        this.createAnchorPoint(evt); // default user interaction method

        // alternative methods that could be called by this interaction:
        //this.convertSegmentPath(evt);
        //this.removeClosePathSegment(evt);
    }
});
