import { dia, g, util } from 'jointjs/src/core.mjs';

export const Pool = dia.Element.define('bpmn2.Pool', {
    size: {
        width: 600,
        height: 300
    },

    lanes: null,

    milestones: null,

    milestonesSize: 20,

    milestoneLabelRightPadding: 8,

    padding: 0,

    headerSize: 20,

    attrs: {
        body: {
            refWidth: '100%',
            refHeight: '100%',
            fill: 'transparent',
        },

        laneGroups: {
            laneContainerPosition: true
        },

        laneHeaders: {
            fill: '#ffffff',
            stroke: '#333333',
            strokeWidth: 2,
            headerSize: true,
            shapeRendering: 'optimizespeed'
        },

        laneLabels: {
            fontSize: 14,
            fill: '#333333',
            transform: 'rotate(-90)',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            fontFamily: 'sans-serif',
            labelPosition: true,
            laneLabel: {
                textWrap: true,
                ellipsis: true
            }
        },

        lanes: {
            stroke: '#333333',
            strokeWidth: 2,
            fill: '#ffffff',
            laneSize: true,
            shapeRendering: 'optimizespeed'
        },

        milestoneGroups: {
            milestoneContainerPosition: true,
        },

        milestoneHeaders: {
            fill: '#ffffff',
            stroke: '#333333',
            strokeWidth: 2,
            milestoneHeaderSize: true,
            shapeRendering: 'optimizespeed'
        },

        milestoneLabels: {
            fontSize: 14,
            fill: '#333333',
            fontFamily: 'sans-serif',
            textAnchor: 'end',
            textVerticalAnchor: 'middle',
            milestoneLabelPosition: true,
            milestoneLabel: {
                textWrap: true,
                ellipsis: true
            }
        },

        milestoneLines: {
            stroke: '#333333',
            strokeWidth: 2,
            milestoneLinePosition: true,
            shapeRendering: 'optimizespeed'
        }
    }
}, {
    metrics: null,

    markup: [{
        tagName: 'rect',
        selector: 'body'
    }],

    markupAttributes: [
        'lanes',
        'padding',
        'milestones',
        'headerSize',
        'milestonesSize'
    ],

    initialize: function() {
        dia.Element.prototype.initialize.apply(this, arguments);
        this.on('change', this.onChange, this);
        this.buildMarkup();
    },

    anyHasChanged: function(attributes) {
        if (!Array.isArray(attributes)) return false;
        return attributes.some(function(attrName) {
            return this.hasChanged(attrName);
        }, this);
    },

    onChange: function(_, opt) {
        if (opt.pool !== this.id && this.hasChanged('markup')) error('Markup can not be modified.');
        if (this.anyHasChanged(this.markupAttributes)) this.buildMarkup(opt);
    },

    buildMarkup: function(opt) {
        const markup = util.cloneDeep(this.markup);
        if (!Array.isArray(markup)) error('Expects Prototype JSON Markup.');

        const lanes = this.attributes.lanes || [{}];
        if (!Array.isArray(lanes)) error('Expects lanes to be an array.');

        const milestones = this.attributes.milestones || [];
        if (!Array.isArray(milestones)) error('Expects milestones to be an array.');

        const metrics = this.metrics = {};
        metrics.lanes = {};
        metrics.nameCache = {};
        metrics.milestones = {};
        metrics.totalTakenHeightSpace = 0;
        metrics.topLaneGroupsCount = lanes.length;
        metrics.padding = util.normalizeSides(this.attributes.padding);

        this.buildLanesMarkupRecursively(lanes, markup, '', 1, 0);
        this.buildMilestones(milestones, markup);

        const flags = util.assign({ pool: this.id, dry: true }, opt);
        this.set('markup', markup, flags);
        this.autoresize(flags);
    },

    buildLanesMarkupRecursively: function(sublanes, parentMarkupChildrenArray, parentId, currentNestLevel, parentSublanesCount) {
        if (!Array.isArray(sublanes)) error('Expects lanes to be an array.');
        let takenUpSpaceByLaneAndSublanes = 0;

        sublanes.forEach((sublane, index) => {
            let spaceTakenByFixedSublanes = 0;
            const uniqueId = parentId ? `${parentId}_${index}` : `${index}`;
            const laneGroupUniqueId = `lanes_${uniqueId}`;

            const gContainerMarkup = this.getLaneGroupMarkup(laneGroupUniqueId);
            parentMarkupChildrenArray.push(gContainerMarkup);

            const laneSize = Number.isFinite(sublane.size) ? Math.max(sublane.size, 0) : undefined;
            const laneMarkup = this.getLaneMarkup(uniqueId, laneGroupUniqueId);
            gContainerMarkup.children.push(laneMarkup);

            const label = sublane.label;
            const hasLabel = typeof sublane.label === 'string';
            const headerSize = hasLabel ? (Number.isFinite(sublane.headerSize) ? Math.max(sublane.headerSize, 0) : this.attributes.headerSize) : 0;

            if (hasLabel) {
                const headerMarkup = this.getHeaderMarkup(uniqueId, laneGroupUniqueId);
                const labelMarkup = this.getLabelMarkup(uniqueId, laneGroupUniqueId);
                gContainerMarkup.children.push(headerMarkup);
                gContainerMarkup.children.push(labelMarkup);
            }

            // recursion start
            if (sublane.sublanes && !Array.isArray(sublane.sublanes)) {
                error('Expects sublanes to be an array.');
            }
            const childSublanes = sublane.sublanes || [];

            if (childSublanes.length) {
                const markupChildrenArray = gContainerMarkup.children;
                const childrenNestLevel = currentNestLevel + 1;

                spaceTakenByFixedSublanes = this.buildLanesMarkupRecursively(
                    childSublanes,
                    markupChildrenArray,
                    uniqueId,
                    childrenNestLevel,
                    childSublanes.length
                );
            }

            spaceTakenByFixedSublanes = (laneSize && laneSize > spaceTakenByFixedSublanes) ? laneSize : spaceTakenByFixedSublanes;
            takenUpSpaceByLaneAndSublanes += spaceTakenByFixedSublanes;

            const laneGroupMetrics = {
                nestLevel: currentNestLevel,
                laneIndexWithinGroup: index,
                parentId: parentId ? `lanes_${parentId}` : '',
                parentSublanesCount,
                headerSize,
                label,
                hasLabel,
                size: laneSize,
                takenUpSpaceByLaneAndSublanes: spaceTakenByFixedSublanes,
                sublanesCount: childSublanes.length,
                name: sublane.id
            }
            this.addLaneGroupMetrics(uniqueId, laneGroupMetrics);
        });

        return takenUpSpaceByLaneAndSublanes;
    },

    buildMilestones: function(milestones, markup) {
        const { metrics } = this;
        metrics.milestonesCount = milestones.length;
        metrics.padding.top += milestones.length ? this.attributes.milestonesSize : 0;

        milestones.forEach((milestone, index) => {
            const milestoneGroupId = `milestone_${index}`;
            const gContainerMarkup = this.getMilestoneGroupMarkup(milestoneGroupId);

            markup.push(gContainerMarkup);

            const header = this.getMilestoneHeaderMarkup(index);
            const label = this.getMilestoneLabelMarkup(index);
            const name = milestone.id;

            metrics.milestones[milestoneGroupId] = {
                label: typeof milestone.label === 'string' ? milestone.label : '',
                indexWithin: index,
                size: Number.isFinite(milestone.size) ? Math.max(milestone.size, 0) : undefined,
                name: name
            };

            // custom id alias
            if (name) {
                if (metrics.nameCache[name]) error('Duplicate milestone group id: ' + name);
                metrics.nameCache[name] = milestoneGroupId;
            }

            if (index !== milestones.length - 1) {
                const line = this.getMilestoneLineMarkup(index);
                gContainerMarkup.children.push(line);
            }

            gContainerMarkup.children.push(header);
            gContainerMarkup.children.push(label);
        });
    },

    addLaneGroupMetrics: function(uniqueId, laneGroupMetrics) {
        const laneGroupId = `lanes_${uniqueId}`;
        const { laneSize, name } = laneGroupMetrics;
        const { metrics } = this;

        metrics.lanes[laneGroupId] = laneGroupMetrics;

        if (Number.isFinite(laneSize)) {
            metrics.totalTakenHeightSpace += laneSize;
        }

        if (name) {
            if (metrics.nameCache[name]) {
                error('Duplicate lane group id: ' + name);
            }
            metrics.nameCache[name] = laneGroupId;
        }
    },

    autoresize: function(flags) {
        const minSize = this.getMinimalSize();
        const currentSize = this.attributes.size;
        this.resize(Math.max(minSize.width, currentSize.width), Math.max(minSize.height, currentSize.height), flags);
    },

    getMinimalSize: function() {
        const { metrics } = this;
        const padding = metrics.padding;
        let minWidth;
        let minHeight;
        let laneHeadersWidth = 0;
        let laneHeights = 0
        let milestonesWidth = 0;
        const milestonesHeight = this.attributes.milestonesSize;

        const lanes = metrics.lanes;
        const milestones = metrics.milestones;

        Object.keys(lanes).forEach(key => {
            const lane = lanes[key];
            let tempId = key;
            let tempHeadersWidth = 0;
            while (tempId) {
                const parentLane = metrics.lanes[tempId];
                tempHeadersWidth += parentLane.headerSize || 0;
                tempId = parentLane.parentId;
            }

            laneHeadersWidth = tempHeadersWidth > laneHeadersWidth ? tempHeadersWidth : laneHeadersWidth;

            if (lane.nestLevel === 1) {
                laneHeights += lane.takenUpSpaceByLaneAndSublanes || 0;
            }
        });

        Object.keys(milestones).forEach(key => {
            milestonesWidth += milestones[key].size || 0;
        });

        minWidth = laneHeadersWidth > milestonesWidth ? laneHeadersWidth : milestonesWidth;
        minHeight = (metrics.milestonesCount && milestonesHeight > laneHeights) ? 0 : laneHeights;

        return { height: minHeight + padding.top + padding.bottom, width: minWidth + padding.left + padding.right };

    },

    getLaneGroupMarkup: function(laneGroupUniqueId) {
        return {
            tagName: 'g',
            selector: laneGroupUniqueId,
            groupSelector: 'laneGroups',
            attributes: {
                laneGroupId: laneGroupUniqueId,
            },
            children: []
        }
    },

    getMilestoneGroupMarkup: function(milestoneGroupUniqueId) {
        return {
            tagName: 'g',
            selector: milestoneGroupUniqueId,
            groupSelector: 'milestoneGroups',
            attributes: {
                milestoneGroupId: milestoneGroupUniqueId,
            },
            children: []
        }
    },

    getLaneMarkup: function(id, laneGroupUniqueId) {
        return {
            tagName: 'rect',
            selector: `lane_${id}`,
            groupSelector: 'lanes',
            children: [],
            attributes: {
                laneGroupId: laneGroupUniqueId
            }
        }
    },

    getHeaderMarkup: function(id, laneGroupUniqueId) {
        return {
            tagName: 'rect',
            selector: `header_${id}`,
            groupSelector: 'laneHeaders',
            attributes: {
                laneGroupId: laneGroupUniqueId,
            }
        }
    },

    getLabelMarkup: function(id, laneGroupUniqueId) {
        return {
            tagName: 'text',
            selector: `label_${id}`,
            groupSelector: 'laneLabels',
            attributes: {
                laneGroupId: laneGroupUniqueId
            }
        }
    },

    getMilestoneHeaderMarkup: function(id) {
        return {
            tagName: 'rect',
            selector: `milestoneHeader_${id}`,
            groupSelector: 'milestoneHeaders',
            attributes: {
                milestoneGroupId: `milestone_${id}`
            }
        }
    },

    getMilestoneLabelMarkup: function(id) {
        return {
            tagName: 'text',
            selector: `milestoneLabel_${id}`,
            groupSelector: 'milestoneLabels',
            attributes: {
                milestoneGroupId: `milestone_${id}`
            }
        }
    },

    getMilestoneLineMarkup: function(id) {
        return {
            tagName: 'line',
            selector: `milestoneLine_${id}`,
            groupSelector: 'milestoneLines',
            attributes: {
                milestoneGroupId: `milestone_${id}`
            }
        }
    },

    getParentIndexesArray: function(laneGroupId) {
        let indexesPath = [];
        let tempParentLaneGroupId = laneGroupId;

        while (tempParentLaneGroupId) {
            indexesPath.push(tempParentLaneGroupId);
            const parentCache = this.metrics.lanes[tempParentLaneGroupId];
            tempParentLaneGroupId = parentCache.parentId;
        }
        return indexesPath.reverse();
    },

    getFlexAndFixedLaneSizesWithinGroup: function(laneGroupId) {
        const { metrics } = this;
        const laneGroupCache = metrics.lanes[laneGroupId];

        let parentId = laneGroupCache.parentId;
        let totalFixedSize = 0;
        let flexLanesWithinGroupCount = 0;
        let tempLaneIndexWithin = laneGroupCache.parentSublanesCount - 1;

        if (!parentId) {
            parentId = 'lanes';
            tempLaneIndexWithin = metrics.topLaneGroupsCount - 1;
        }

        while (tempLaneIndexWithin >= 0) {
            const tempId = `${parentId}_${tempLaneIndexWithin}`;
            const tempLaneGroupCache = metrics.lanes[tempId];

            if (Number.isFinite(tempLaneGroupCache.size)) {
                totalFixedSize += Math.max(tempLaneGroupCache.size, tempLaneGroupCache.takenUpSpaceByLaneAndSublanes);
            } else {
                flexLanesWithinGroupCount++;
            }
            tempLaneIndexWithin--;
        }

        return { totalFixedSize, flexLanesWithinGroupCount };
    },

    getLaneWidth: function(laneGroupId) {
        const { metrics } = this;
        const padding = metrics.padding;
        const indexesPath = this.getParentIndexesArray(laneGroupId);
        const shapeCurrentWidth = this.attributes.size.width - padding.left - padding.right;
        let tempHeaderHeights = 0;

        indexesPath.forEach(parentId => {
            const parentCache = metrics.lanes[parentId];
            tempHeaderHeights += parentCache.headerSize;
        });
        return Math.max(shapeCurrentWidth - tempHeaderHeights, 0);
    },

    getLaneHeight: function(laneGroupId) {
        const { metrics } = this;
        const laneGroupCache = metrics.lanes[laneGroupId];
        const padding = metrics.padding;
        let parentIndexesPath = this.getParentIndexesArray(laneGroupId);
        const shapeCurrentHeight = this.attributes.size.height - padding.top - padding.bottom;
        const parentId = laneGroupCache.parentId;
        let leftFlexHeight = shapeCurrentHeight;

        // last lane in group - extend it to take the remaining space
        if (parentId) {
            const parentCache = metrics.lanes[parentId];
            const parentSublanesCount = parentCache.sublanesCount;
            const laneIndexWithin = laneGroupCache.laneIndexWithinGroup;
            const isBottomMostSublane = laneIndexWithin === parentSublanesCount - 1;

            if (isBottomMostSublane) {
                const { y } = this.getLaneContainerPosition(laneGroupId);
                const parentHeight = this.getLaneHeight(parentId);
                return Math.max(parentHeight - y - padding.bottom, 0);
            }
        }

        // lane has fixed height
        if (Number.isFinite(laneGroupCache.size)) {
            // fixed lane is one of the top lanes
            if (!parentId && (laneGroupCache.laneIndexWithinGroup === metrics.topLaneGroupsCount - 1)) {
                const { y } = this.getLaneContainerPosition(laneGroupId);
                return Math.max(this.attributes.size.height - y - padding.bottom, 0);
            } else {
                const childrenFixedSize = laneGroupCache.takenUpSpaceByLaneAndSublanes;
                return Math.max(childrenFixedSize, laneGroupCache.size, 0);
            }
        }

        // check if some of the parents has fixed size
        const idOfParentWithFixedSize = parentIndexesPath.map(p => p).reverse().find(p => metrics.lanes[p].size);

        if (idOfParentWithFixedSize) {
            let parentIndexesPathClone = parentIndexesPath.map(p => p);
            const parentIndex = parentIndexesPathClone.indexOf(idOfParentWithFixedSize);
            parentIndexesPath = parentIndexesPathClone.slice(parentIndex + 1);
            leftFlexHeight = metrics.lanes[idOfParentWithFixedSize].size;
        }

        // lane doesn't have specified size - so calculate flex size for it
        // to do that, all fixed lanes and all lanes with fixed children need to be taken into account
        parentIndexesPath.forEach(pId => {
            const tempSizes = this.getFlexAndFixedLaneSizesWithinGroup(pId); // will return all lanes with height set
            const currentPathCache = metrics.lanes[pId];
            const cacheParentId = currentPathCache.parentId;
            const tempParentSublanesCount = metrics.lanes[pId].parentSublanesCount;
            const topLaneGroupsCount = metrics.topLaneGroupsCount;

            // if lane doesn't have parent then it's one of the top lanes
            let overflowingFixedLaneSizes = 0;
            let overflowingFixedLanesCount = 0;

            // calculate optimal flex size - it will be used to check if lane fits in this size
            let baseFlexSize = (leftFlexHeight - tempSizes.totalFixedSize) / ((tempSizes.flexLanesWithinGroupCount) || 1);

            let tempIndexWithin = cacheParentId ? tempParentSublanesCount - 1 : topLaneGroupsCount - 1;

            // now count all lanes that are actually overflowing
            while (tempIndexWithin >= 0) {
                const tempId =`${cacheParentId ? cacheParentId : 'lanes'}_${tempIndexWithin}`;

                // skip oneself
                if (tempId === laneGroupId) {
                    tempIndexWithin--;
                    continue;
                }

                const tempCacheOfLaneWithinThisGroup = metrics.lanes[tempId];
                const tempSublanesFixedSize = tempCacheOfLaneWithinThisGroup.takenUpSpaceByLaneAndSublanes;

                if (!tempCacheOfLaneWithinThisGroup.size && (tempSublanesFixedSize > baseFlexSize)) {
                    overflowingFixedLaneSizes += tempSublanesFixedSize;
                    overflowingFixedLanesCount++;
                }
                tempIndexWithin--;
            }

            leftFlexHeight -= (tempSizes.totalFixedSize + overflowingFixedLaneSizes);
            leftFlexHeight /= Math.max(tempSizes.flexLanesWithinGroupCount - overflowingFixedLanesCount, 1);
        });

        // if this lane is overflowing - fit it to its content
        const fixedSizeByLaneSublanes = laneGroupCache.takenUpSpaceByLaneAndSublanes;
        const result = fixedSizeByLaneSublanes > leftFlexHeight ? fixedSizeByLaneSublanes : leftFlexHeight;

        return Math.max(result, 0);
    },

    getMilestoneWidth: function(milestoneGroupId) {
        const { metrics } = this;
        const padding = metrics.padding;
        const shapeWidth = this.attributes.size.width - padding.left - padding.right;
        const milestoneCache = metrics.milestones[milestoneGroupId];
        const milestonesCount = metrics.milestonesCount;

        if (Number.isFinite(milestoneCache.size)) {
            return milestoneCache.size;
        }

        let tempMilestonesCountIndex = milestonesCount - 1;
        let takenFixedWidth = 0;
        let fixedMilestonesCount = 0;

        while (tempMilestonesCountIndex >= 0) {
            const tempMilestoneId = `milestone_${tempMilestonesCountIndex}`;
            const tempCache = metrics.milestones[tempMilestoneId];

            if (Number.isFinite(tempCache.size)) {
                takenFixedWidth += tempCache.size;
                fixedMilestonesCount++;
            }
            tempMilestonesCountIndex--;
        }

        const flexWidth = (shapeWidth - takenFixedWidth) / ((milestonesCount - fixedMilestonesCount) || 1);
        return Math.max(flexWidth, 0);
    },

    getLaneContainerPosition: function(laneGroupId) {
        const { metrics } = this;
        const padding = metrics.padding;
        const laneGroupCache = metrics.lanes[laneGroupId];
        const { laneIndexWithinGroup, nestLevel, parentId } = laneGroupCache;
        const parentLabelWidth = parentId ? metrics.lanes[parentId].headerSize : 0;

        let x = parentLabelWidth;
        let y = 0;

        if (nestLevel === 1) {
            x += padding.left;
            y += padding.top;
        }

        let laneUpHeights = 0;
        let tempIndex = laneIndexWithinGroup - 1;

        while (tempIndex >= 0) {
            const tempId = parentId ? `${parentId}_${tempIndex}` : `lanes_${tempIndex}`;
            laneUpHeights += this.getLaneHeight(tempId);
            tempIndex--;
        }

        return new g.Point(x, y + laneUpHeights);
    },

    getMilestoneContainerPosition: function(milestoneGroupId) {
        const { metrics } = this;
        const milestoneGroupCache = metrics.milestones[milestoneGroupId];
        const indexWithin = milestoneGroupCache.indexWithin;
        const padding = metrics.padding;

        let tempCacheIndex = indexWithin - 1;
        let takenWidth = 0;

        while (tempCacheIndex >= 0) {
            const tempId = `milestone_${tempCacheIndex}`;
            const tempWidth = this.getMilestoneWidth(tempId);
            takenWidth += tempWidth;
            tempCacheIndex--;
        }

        const milestoneHeight = this.attributes.milestonesSize;
        const x = takenWidth + padding.left;
        const y = padding.top - milestoneHeight;

        return new g.Point(x, y);
    },

    getLaneBBox: function(laneGroupId) {
        if (typeof laneGroupId !== 'string') error('Expects id to be a string');
        const { metrics } = this;
        const poolPosition = this.position();

        let laneCache = metrics.lanes[laneGroupId];

        if (!laneCache) {
            laneGroupId = metrics.nameCache[laneGroupId];
            laneCache = metrics.lanes[laneGroupId];
        }

        if (!laneCache) {
            return new g.Rect();
        }

        const parentId = laneCache.parentId;
        const headerSize = laneCache.headerSize;
        let parentLaneOriginPoint = { x: 0, y: 0 };

        if (parentId) {
            const parentBBox = this.getLaneBBox(parentId);
            parentLaneOriginPoint.x += parentBBox.x - poolPosition.x;
            parentLaneOriginPoint.y += parentBBox.y - poolPosition.y;
        }

        const { x, y } = this.getLaneContainerPosition(laneGroupId);
        const width = this.getLaneWidth(laneGroupId);
        const height = this.getLaneHeight(laneGroupId);

        return new g.Rect({
            x: x + parentLaneOriginPoint.x + poolPosition.x,
            y: y + parentLaneOriginPoint.y + poolPosition.y,
            width: width + headerSize,
            height
        });
    },

    getMilestoneBBox: function(milestoneGroupId) {
        if (typeof milestoneGroupId !== 'string') error('Expects id to be a string');
        const { metrics } = this;

        let milestoneCache = metrics.milestones[milestoneGroupId];

        if (!milestoneCache) {
            milestoneGroupId = metrics.nameCache[milestoneGroupId];
            milestoneCache = metrics.milestones[milestoneGroupId];
        }

        if (!milestoneCache) {
            return new g.Rect();
        }

        const poolPosition = this.position();
        const width = this.getMilestoneWidth(milestoneGroupId);
        const height = this.attributes.milestonesSize;
        const { x, y } = this.getMilestoneContainerPosition(milestoneGroupId);

        return new g.Rect(x + poolPosition.x, y + poolPosition.y, width, height);
    },

    getLanesFromPoint: function(point) {
        if (!point) {
            error('Expects point to be defined');
        }

        if (!this.getBBox().containsPoint(point)) {
            return [];
        }

        const { metrics } = this;
        const result = [];

        const recursion = (parentId) => {
            let tempIndex = parentId ? metrics.lanes[parentId].sublanesCount - 1 : metrics.topLaneGroupsCount - 1;

            while (tempIndex >= 0) {
                const tempId = parentId ? `${parentId}_${tempIndex}` : `lanes_${tempIndex}`;
                const bbox = this.getLaneBBox(tempId);

                if (bbox.containsPoint(point)) {
                    result.push(tempId);
                    recursion(tempId);
                    break;
                }
                tempIndex--;
            }
        }
        recursion();

        return result.reverse();
    },

    getMilestoneFromPoint: function(point) {
        if (!point) {
            error('Expects point to be defined');
        }

        if (!this.getBBox().containsPoint(point)) {
            return '';
        }

        let tempIndex = this.metrics.milestonesCount;

        while (tempIndex >= 0) {
            const tempId = `milestone_${tempIndex}`;
            if (this.getMilestoneBBox(tempId).containsPoint(point)) {
                return tempId;
            }
            tempIndex--;
        }
        return '';
    },

    toJSON: function() {
        const json = dia.Element.prototype.toJSON.apply(this, arguments);
        delete json.markup;
        return json;
    }

}, {
    attributes: {
        laneContainerPosition: {
            position: function(_, refBBox, node) {
                const laneGroupId = node.getAttribute('laneGroupId');
                return this.model.getLaneContainerPosition(laneGroupId);
            }
        },

        laneSize: {
            set: function(_, refBBox, node) {
                const { model } = this;
                const laneGroupId = node.getAttribute('laneGroupId');
                const laneWidth = model.getLaneWidth(laneGroupId);
                const laneHeight = model.getLaneHeight(laneGroupId);
                const headerSize = model.metrics.lanes[laneGroupId].headerSize;

                return { width: laneWidth + headerSize, height: laneHeight };
            }
        },

        headerSize: {
            set: function(_, refBBox, node) {
                const laneGroupId = node.getAttribute('laneGroupId');
                const laneGroupCache = this.model.metrics.lanes[laneGroupId];

                const headerSize = laneGroupCache.headerSize;
                const height = Math.max(this.model.getLaneHeight(laneGroupId), 0);

                return { width: headerSize, height: height }
            }
        },

        labelPosition: {
            position: function(_, refBBox, node) {
                const { model } = this;
                const laneGroupId = node.getAttribute('laneGroupId');
                const laneGroupCache = model.metrics.lanes[laneGroupId];
                const headerSize = laneGroupCache.headerSize;

                const currentLaneHeight = model.getLaneHeight(laneGroupId);

                const centerX = headerSize / 2;
                const centerY = currentLaneHeight / 2;

                return new g.Point(centerX, centerY);
            }
        },

        laneLabel: {
            set: function(opt, refBBox, node, attrs) {
                if (!util.isPlainObject(opt)) {
                    return null;
                }
                const { model } = this;
                const laneGroupId = node.getAttribute('laneGroupId');
                const laneGroupCache = model.metrics.lanes[laneGroupId];
                const width = laneGroupCache.headerSize;
                const height = model.getLaneHeight(laneGroupId);
                const text = laneGroupCache.label;

                const bbox = new g.Rect(0, 0, height, width);

                let textAttribute;
                let textValue;

                if (opt.textWrap) {
                    textAttribute = 'textWrap';
                    textValue = {
                        text: text,
                        ellipsis: opt.ellipsis,
                    };
                } else {
                    textAttribute = 'text';
                    textValue = text;
                }

                this.getAttributeDefinition(textAttribute).set.call(this, textValue, bbox, node, attrs);
            }
        },

        milestoneContainerPosition: {
            position: function(_, refBBox, node) {
                const milestoneGroupId = node.getAttribute('milestoneGroupId');
                return this.model.getMilestoneContainerPosition(milestoneGroupId);
            }
        },

        milestoneHeaderSize: {
            set: function(_, refBBox, node) {
                const { model } = this;
                const milestoneGroupId = node.getAttribute('milestoneGroupId');

                const width = model.getMilestoneWidth(milestoneGroupId);
                const height = model.attributes.milestonesSize;

                return { width: width, height: height };
            }
        },

        milestoneLabelPosition: {
            position: function(_, refBBox, node) {
                const { model } = this;
                const milestoneGroupId = node.getAttribute('milestoneGroupId');
                const rightPadding = model.attributes.milestoneLabelRightPadding;
                const width = model.getMilestoneWidth(milestoneGroupId);
                const height = model.attributes.milestonesSize;
                const centerX = width - rightPadding;
                const centerY = height / 2;

                return new g.Point(centerX, centerY);
            }
        },

        milestoneLabel: {
            set: function(opt, refBBox, node, attrs) {
                if (!util.isPlainObject(opt)) {
                    return null;
                }
                const { model } = this;
                const milestoneLabelId = node.getAttribute('milestoneGroupId');
                const milestoneLabelCache = model.metrics.milestones[milestoneLabelId];
                const rightPadding = model.attributes.milestoneLabelRightPadding;
                const width = model.getMilestoneWidth(milestoneLabelId);
                const height = model.attributes.milestonesSize;
                const text = milestoneLabelCache.label;

                const bbox = new g.Rect(0, 0, width - rightPadding, height);

                let textAttribute;
                let textValue;

                if (opt.textWrap) {
                    textAttribute = 'textWrap';
                    textValue = {
                        text: text,
                        ellipsis: opt.ellipsis,
                    };
                } else {
                    textAttribute = 'text';
                    textValue = text;
                }

                this.getAttributeDefinition(textAttribute).set.call(this, textValue, bbox, node, attrs);
            }
        },

        milestoneLinePosition: {
            set: function(_, refBBox, node) {
                const { model } = this;
                const milestoneLabelId = node.getAttribute('milestoneGroupId');
                const padding = model.metrics.padding;

                const milestoneWidth = model.getMilestoneWidth(milestoneLabelId);
                const milestoneHeight = model.attributes.milestonesSize;
                const y1 = padding.top - milestoneHeight;
                const y2 = refBBox.height - padding.bottom - padding.top + milestoneHeight;

                return { x1: milestoneWidth, x2: milestoneWidth, y1: y1, y2: y2 };
            }
        },

        textVertical: {
            set: function(opt, refBBox, node, attrs) {
                return { transform: 'rotate(-90)' };
            }
        },

        textWrap: {
            set: function(opt, refBBox, node, attrs) {
                if (attrs.textVertical) {
                    const width = refBBox.width;
                    refBBox.width = refBBox.height;
                    refBBox.height = width;
                }
                dia.attributes.textWrap.set.call(this, opt, refBBox, node, attrs);
            }
        }
    }
});


export const HeaderedPool = Pool.define('bpmn2.HeaderedPool', {
    padding: { top: 0, left: 30, right: 0, bottom: 0 },
    attrs: {
        header: {
            width: 30,
            refHeight: '100%',
            stroke: '#333333',
            strokeWidth: 2,
            fill: '#ffffff',
            shapeRendering: 'optimizespeed'
        },
        headerLabel: {
            textVertical: true,
            textWrap: {
                width: -10,
                ellipsis: true,
                maxLineCount: 1
            },
            refX: 15,
            refY: '50%',
            fontSize: 20,
            fill: '#333333',
            fontFamily: 'sans-serif',
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
        }
    }
}, {
    markup: [{
        tagName: 'rect',
        selector: 'body'
    }, {
        tagName: 'rect',
        selector: 'header'
    }, {
        tagName: 'text',
        selector: 'headerLabel'
    }],
});


// Views

const PoolViewPresentationAttributes = Pool.prototype.markupAttributes.reduce(function(presentationAttributes, attribute) {
    presentationAttributes[attribute] = ['UPDATE'];
    return presentationAttributes;
}, {});

export const PoolView = dia.ElementView.extend({
    presentationAttributes: dia.ElementView.addPresentationAttributes(PoolViewPresentationAttributes)
});

export const HeaderedPoolView = PoolView;

function error(message) {
    throw new Error('shapes.bpmn2.Pool: ' + message);
}
