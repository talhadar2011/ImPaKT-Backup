import { g, util, dia } from 'jointjs/src/core.mjs';

var Element = dia.Element;
var ElementView = dia.ElementView;
var ElementViewPrototype = ElementView.prototype;

// Models

export const Record = Element.define('standard.Record', {
    size: { width: 100 },
    padding: 0,
    items: [],
    itemHeight: 20,
    itemOffset: 20,
    itemMinLabelWidth: 10,
    itemButtonSize: 10,
    itemIcon: { width: 16, height: 16, padding: 2 },
    itemOverflow: false,
    attrs: {
        bodiesGroups: {
            fill: 'transparent',
            stroke: 'none'
        },
        labelsGroups: {
            fill: '#333333'
        },
        buttonsGroups: {
            fill: 'transparent',
            stroke: '#333333',
            strokeWidth: 1
        },
        forksGroups: {
            stroke: '#333333'
        },
        groups: {
            groupPosition: true
        },
        itemBodies: {
            groupWidth: true,
            itemHighlight: {
                'fill': '#eeeeee'
            }
        },
        itemLabels: {
            fontSize: 16,
            textVerticalAnchor: 'middle',
            pointerEvents: 'bounding-box',
            itemText: {
                textWrap: true,
                ellipsis: true
            },
            itemHighlight: {
                'fill': 'red'
            }
        }
    }
}, {

    markup: [],

    metrics: null,

    markupAttributes: [
        'items',
        'itemHeight',
        'itemOffset',
        'itemIcon',
        'itemMinLabelWidth',
        'itemButtonSize',
        'itemOverflow',
        'padding'
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
        if (opt.record !== this.id && this.hasChanged('markup')) error('Markup can not be modified.');
        if (this.anyHasChanged(this.markupAttributes)) this.buildMarkup(opt);
    },

    buildMarkup: function(opt) {

        var metrics = this.metrics = {};
        var cache = metrics.items = {};

        var attributes = this.attributes;
        var defaultItemHeight = attributes.itemHeight;
        var itemOffset = attributes.itemOffset;
        var itemOverflow = !!attributes.itemOverflow;
        var groups = attributes.items;
        if (!Array.isArray(groups)) groups = [];
        var groupsCount = groups.length;
        var groupY = 0;
        var markup = util.cloneDeep(this.markup);
        if (!Array.isArray(markup)) error('Expects Prototype JSON Markup.');
        var padding = util.normalizeSides(attributes.padding);
        var minGroupWidth = 0;

        for (var i = 0; i < groupsCount; i++) {

            var itemBodiesMarkup = [];
            var labelsMarkup = [];
            var buttonsMarkup = [];
            var iconsMarkup = [];
            var forks = [];

            var items = Array.from(groups[i]);
            var queue = this.createQueue(items, 0, [], null);
            var y = 0;
            var minItemWidth = 0;

            while (queue.length > 0) {

                var queueItem = queue.pop();
                var path = queueItem.path;
                var level = queueItem.level;
                var item = queueItem.item;
                var parent = queueItem.parent;
                if (level === 0) path.splice(1, 0, i);

                var itemId = item.id;
                var visible = level !== -1;
                var itemHeight = item.height || defaultItemHeight;
                var icon = item.icon;
                var subItems = item.items;
                var highlighted = !!item.highlighted;
                var collapsed = !!item.collapsed;
                var hasSubItems = Array.isArray(subItems) && subItems.length > 0;

                if (!itemId) error('Item id required.');
                if (cache.hasOwnProperty(itemId)) error('Duplicated item id.');

                var itemCache = cache[itemId] = {
                    path: path,
                    visible: visible,
                    parent: parent,
                    label: item.label,
                    height: itemHeight,
                    group: i,
                    hasSubItems: hasSubItems,
                    highlighted: highlighted,
                    collapsed: collapsed
                };

                if (hasSubItems) {
                    itemCache.children = subItems.map(function(subItem) {
                        return subItem.id
                    });
                    Array.prototype.push.apply(queue, this.createQueue(subItems, (collapsed || !visible) ? -1 : level + 1, path, itemId));
                }

                if (!visible) continue;

                // Generate Markup
                var x = itemOffset * level;
                itemCache.x = x + itemOffset;
                itemCache.y = y;
                itemCache.cx = x + itemOffset / 2;
                itemCache.cy = y + itemHeight / 2;
                itemCache.span = item.span || 1;
                if (itemId) {
                    var bodyMarkup = this.getItemBodyMarkup(item, x, y, i, (itemOverflow && i === 0) ? padding.left : 0);
                    itemBodiesMarkup.push(bodyMarkup);
                    var labelMarkup = this.getItemLabelMarkup(item, x, y, i);
                    labelsMarkup.push(labelMarkup);
                    if (hasSubItems) {
                        buttonsMarkup.push(this.getButtonMarkup(item, x, y, i));
                        if (!collapsed) {
                            forks.push(itemId);
                        }
                    }
                    if (icon) {
                        iconsMarkup.push(this.getIconMarkup(item, x, y, i));
                        itemCache.x += attributes.itemIcon.width + attributes.itemIcon.padding;
                    }
                }

                minItemWidth = Math.max(minItemWidth, itemCache.x + attributes.itemMinLabelWidth);
                y += itemHeight;
            }

            minGroupWidth = Math.max(minItemWidth, minGroupWidth);

            groupY = Math.max(groupY, y);

            var groupItems = [];

            markup.push({
                tagName: 'g',
                selector: this.getSelector('group', i),
                groupSelector: 'groups',
                attributes: {
                    'record-group': i
                },
                children: groupItems
            });
            // Items
            groupItems.push({
                tagName: 'g',
                selector: this.getSelector('bodiesGroup', i),
                groupSelector: 'bodiesGroups',
                children: itemBodiesMarkup
            }, {
                tagName: 'g',
                selector: this.getSelector('labelsGroup', i),
                groupSelector: 'labelsGroups',
                children: labelsMarkup
            });
            // Forks
            if (forks.length > 0) {
                groupItems.push({
                    tagName: 'g',
                    selector: this.getSelector('forksGroup', i),
                    groupSelector: 'forksGroups',
                    children: forks.map(this.getForkMarkup, this)
                });
            }
            // Buttons
            if (buttonsMarkup.length > 0) {
                groupItems.push({
                    tagName: 'g',
                    selector: this.getSelector('buttonsGroup', i),
                    groupSelector: 'buttonsGroups',
                    children: buttonsMarkup
                });
            }
            // Icons
            if (iconsMarkup.length > 0) {
                groupItems.push({
                    tagName: 'g',
                    selector: this.getSelector('iconsGroup', i),
                    groupSelector: 'iconsGroups',
                    children: iconsMarkup
                });
            }
        }

        metrics.padding = padding;
        metrics.groupsCount = groupsCount;
        metrics.overflow = itemOverflow;
        metrics.minHeight = groupY + padding.top + padding.bottom;
        metrics.minWidth = minGroupWidth * groupsCount + padding.left + padding.right;

        // Use `dry` flag to let the command manager know not to record this change.
        var flags = util.assign({ record: this.id, dry: true }, opt);
        this.set('markup', markup, flags);
        this.autoresize(flags);
    },

    autoresize: function(opt) {
        var minSize = this.getMinimalSize();
        var width = this.attributes.size.width;
        this.resize(Math.max(width, minSize.width), minSize.height, opt);
    },

    getMinimalSize: function() {
        var metrics = this.metrics;
        return {
            width: metrics.minWidth,
            height: metrics.minHeight
        }
    },

    removeInvalidLinks: function(opt) {
        var graph = this.graph;
        if (!graph) return [];
        return graph.getConnectedLinks(this).filter(this.isLinkInvalid, this).map(function(link) {
            return link.remove(opt);
        });
    },

    isLinkInvalid: function(link) {
        var id = this.id;
        var items = this.metrics.items;
        var source = link.source();
        if (source.id === id && source.hasOwnProperty('port') && !(items[source.port] || this.hasPort(source.port))) return true;
        var target = link.target();
        if (target.id === id && target.hasOwnProperty('port') && !(items[target.port] || this.hasPort(target.port))) return true;
        return false;
    },

    createQueue: function(items, level, path, parent) {
        var length = items.length;
        return Array.from({ length: length }, function(_, i) {
            var itemIndex = length - i - 1;
            return {
                path: path.concat(['items', itemIndex]),
                item: items[itemIndex],
                level: level,
                parent: parent
            };
        });
    },

    getGroupSelector: function(selector) {
        var ids = Array.prototype.slice.call(arguments, 1);
        var groupSelector = [selector];
        for (var i = 0, n = ids.length; i < n; i++) {
            var groups = ids[i];
            if (groups === null || groups === undefined) continue;
            if (!Array.isArray(groups)) groups = [groups];
            for (var j = 0, m = groups.length; j < m; j++) {
                groupSelector.push(this.getSelector(selector, groups[j]));
            }
        }
        return groupSelector;
    },

    getItemLabelMarkup: function(item, x, y, i) {
        var attributes = this.attributes;
        var itemOffset = attributes.itemOffset;
        var itemHeight = item.height || attributes.itemHeight;
        var itemId = item.id;
        var textX = x + itemOffset;
        if (item.icon) {
            textX += attributes.itemIcon.width + 2 * attributes.itemIcon.padding;
        }
        return {
            tagName: 'text',
            className: 'record-item-label',
            selector: this.getSelector('itemLabel', itemId),
            groupSelector: this.getGroupSelector('itemLabels', i, item.group),
            attributes: {
                'x': textX,
                'y': y + itemHeight / 2,
                'item-id': itemId
            }
        };
    },

    getItemBodyMarkup: function(item, _, y, i, overflow) {
        var itemHeight = item.height || this.attributes.itemHeight;
        var x = 0;
        if (overflow) x -= overflow;
        var attributes = {
            'x': x,
            'y': y,
            'height': itemHeight,
            'item-id': item.id
        };
        var itemSpan = item.span;
        if (itemSpan) {
            attributes['item-span'] = itemSpan;
        }
        return {
            tagName: 'rect',
            selector: this.getSelector('itemBody', item.id),
            groupSelector: this.getGroupSelector('itemBodies', i, item.group),
            className: 'record-item-body',
            attributes: attributes
        };
    },

    getButtonMarkup: function(item, x, y) {
        var attributes = this.attributes;
        var buttonSize = attributes.itemButtonSize;
        var itemOffset = attributes.itemOffset;
        var itemHeight = item.height || attributes.itemHeight;
        return {
            tagName: 'path',
            className: 'record-item-button',
            attributes: {
                'd': this.getButtonPathData(x + itemOffset / 2, y + itemHeight / 2, buttonSize / 2, item.collapsed),
                'item-id': item.id,
                'cursor': 'pointer',
                'shape-rendering': 'geometricprecision'
            }
        };
    },

    getIconMarkup: function(item, x, y) {
        var attributes = this.attributes;
        var itemOffset = attributes.itemOffset;
        var itemIcon = attributes.itemIcon;
        var itemHeight = item.height || attributes.itemHeight;
        return {
            tagName: 'image',
            className: 'record-item-icon',
            attributes: {
                'x': x + itemOffset + itemIcon.padding,
                'y': y + (itemHeight - itemIcon.height) / 2,
                'width': itemIcon.width,
                'height': itemIcon.height,
                'xlink:href': item.icon
            }
        };
    },

    getForkMarkup: function(itemId) {
        return {
            tagName: 'path',
            attributes: {
                'd': this.getForkPathData(itemId),
                'fill': 'none'
            }
        }
    },

    getButtonPathData: function(x, y, r, collapsed) {
        var path = [
            'M',
            x - r, y - r,
            x + r, y - r,
            x + r, y + r,
            x - r, y + r,
            'Z',
            'M',
            x - r / 2, y,
            x + r / 2, y,
        ];
        if (collapsed) {
            Array.prototype.push.apply(path, [
                'M',
                x, y - r / 2,
                x, y + r / 2
            ]);
        }
        return path.join(' ');
    },

    getForkPathData: function(itemId) {
        var cache = this.metrics.items;
        if (!cache) return null;
        var itemCache = cache[itemId];
        if (!itemCache) return null;
        var children = itemCache.children;
        if (!children || children.length === 0) return null;
        var buttonSize = this.attributes.itemButtonSize;
        var d = [];
        var childCache;
        for (var i = 0, n = children.length; i < n; i++) {
            childCache = cache[children[i]];
            var x = childCache.cx + ((childCache.hasSubItems) ? -1 : 1) * buttonSize / 2;
            d.push('M', itemCache.cx, childCache.cy, x, childCache.cy);
        }
        d.push('M', itemCache.cx, itemCache.cy + buttonSize / 2, itemCache.cx, childCache.cy);
        return d.join(' ');
    },

    item: function(itemId, value, opt) {
        var pathArray = this.getItemPathArray(itemId);
        if (!pathArray) return null;
        if (value === undefined) {
            return this.prop(pathArray);
        }
        return this.prop(pathArray, value, opt);
    },

    toggleItemCollapse: function(itemId, opt) {
        var pathArray = this.getItemPathArray(itemId);
        if (!pathArray) return this;
        pathArray.push('collapsed');
        var collapsed = !!this.prop(pathArray);
        this.prop(pathArray, !collapsed, opt);
        return this;
    },

    toggleItemHighlight: function(itemId, opt) {
        var pathArray = this.getItemPathArray(itemId);
        if (!pathArray) return this;
        pathArray.push('highlighted');
        var highlighted = !!this.prop(pathArray);
        this.prop(pathArray, !highlighted, opt);
        return this;
    },

    isItemVisible: function(itemId) {
        return this.getItemCacheAttribute(itemId, 'visible');
    },

    isItemCollapsed: function(itemId) {
        return this.getItemCacheAttribute(itemId, 'collapsed');
    },

    isItemHighlighted: function(itemId) {
        return this.getItemCacheAttribute(itemId, 'highlighted');
    },

    getItemParentId: function(itemId) {
        return this.getItemCacheAttribute(itemId, 'parent');
    },

    getItemGroupIndex: function(itemId) {
        return this.getItemCacheAttribute(itemId, 'group');
    },

    getItemPathArray: function(itemId) {
        var path = this.getItemCacheAttribute(itemId, 'path');
        if (path) return path.slice();
        return null;
    },

    getItemSide: function(itemId) {
        var groupIndex = this.getItemGroupIndex(itemId);
        if (groupIndex === null) return null;
        var metrics = this.metrics;
        var groupsCount = metrics.groupsCount;
        if (groupsCount > 1) {
            if (groupIndex === 0) return 'left';
            if (groupIndex + metrics.items[itemId].span - 1 === groupsCount - 1) return 'right';
        }
        return 'middle';
    },

    getItemCacheAttribute: function(itemId, attribute) {
        if (!attribute) return null;
        var cache = this.metrics.items;
        if (!cache) return null;
        var itemCache = cache[itemId];
        if (!itemCache) return null;
        return itemCache[attribute];
    },

    getSelector: function(type, id) {
        return type + '_' + id;
    },

    removeItem: function(itemId, opt) {
        var parentPathArray = this.getItemPathArray(itemId);
        if (!parentPathArray) return this;
        var index = parentPathArray.pop();
        var items = this.prop(parentPathArray).slice();
        if (items.length > 1) {
            // Removing a single item from items array. Items won't become empty.
            items.splice(index, 1);
            this.prop(parentPathArray, items, util.assign({ rewrite: true }, opt));
        } else if (parentPathArray.length > 2) {
            // Removing the last child of a nested item
            this.removeProp(parentPathArray, opt);
        } else {
            // Removing the last child from the top level group
            index = parentPathArray.pop();
            items = this.get('items').slice();
            items.splice(index, 1, []);
            this.prop(parentPathArray, items, util.assign({ rewrite: true }, opt));
        }
        return this;
    },

    addNextSibling: function(siblingId, item, opt) {
        var siblingPathArray = this.getItemPathArray(siblingId);
        if (!siblingPathArray) return this;
        var parentId = this.getItemParentId(siblingId) || this.getItemGroupIndex(siblingId);
        var index = siblingPathArray[siblingPathArray.length - 1] + 1;
        return this.addItemAtIndex(parentId, index, item, opt);
    },

    addPrevSibling: function(siblingId, item, opt) {
        var siblingPathArray = this.getItemPathArray(siblingId);
        if (!siblingPathArray) return this;
        var parentId = this.getItemParentId(siblingId) || this.getItemGroupIndex(siblingId);
        var index = siblingPathArray[siblingPathArray.length - 1];
        return this.addItemAtIndex(parentId, index, item, opt);
    },

    addItemAtIndex: function(itemId, index, item, opt) {
        if (!item) return this;
        var itemsPathArray;
        switch (typeof itemId) {
            case 'number':
                var groups = this.prop('items');
                var groupIndex = Math.min(Math.max(itemId, 0), groups.length);
                itemsPathArray = ['items', groupIndex];
                break;
            case 'string':
                itemsPathArray = this.getItemPathArray(itemId);
                if (!itemsPathArray) return this; // item does not exists
                itemsPathArray.push('items');
                break;
            default:
                error('Requires an item id.');
        }
        var newItems = this.prop(itemsPathArray);
        if (Array.isArray(newItems)) {
            newItems = newItems.slice();
        } else {
            newItems = [];
        }
        var newIndex = Math.min(Math.max(index, 0), newItems.length);
        newItems.splice(newIndex, 0, item);
        return this.prop(itemsPathArray, newItems, util.assign({ rewrite: true }, opt));
    },

    toJSON: function() {
        var json = dia.Element.prototype.toJSON.apply(this, arguments);
        delete json.markup;
        return json;
    }

}, {

    attributes: {
        // Public Attributes
        itemText: {
            set: function(opt, refBBox, node, attrs) {
                if (!util.isPlainObject(opt)) return null;
                var model = this.model;
                var itemId = node.getAttribute('item-id');
                var cache = model.metrics.items[itemId];
                if (!cache) return;
                var text = cache.label;
                var padding = model.metrics.padding;
                var groupsCount = model.metrics.groupsCount;
                var x1 = cache.x;
                var x2 = (refBBox.width - padding.left - padding.right) / groupsCount * cache.span - x1
                var bbox = new g.Rect(x1, cache.y, x2, cache.height);
                var textAttribute, textValue;
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
        itemHighlight: {
            set: function(highlightAttributes, _, node, attrs) {
                if (!util.isPlainObject(highlightAttributes)) return null;
                var model = this.model;
                var itemId = node.getAttribute('item-id');
                var highlighted = model.getItemCacheAttribute(itemId, 'highlighted');
                switch (highlighted) {
                    case true:
                        return highlightAttributes;
                    case null:
                    case false:
                        return Object.keys(highlightAttributes).reduce(function(res, attrName) {
                            var attrDefined = attrs.hasOwnProperty(attrName) || attrs.hasOwnProperty(util.camelCase(attrName));
                            if (!attrDefined && node.getAttribute(attrName)) {
                                // Remove the node attribute
                                res[attrName] = null;
                            }
                            return res;
                        }, {});
                }
            }
        },
        // Private Attributes
        groupWidth: {
            set: function(_, refBBox, node) {
                var metrics = this.model.metrics;
                var padding = metrics.padding;
                var groupsCount = metrics.groupsCount;
                var width = (refBBox.width - padding.left - padding.right) / groupsCount;
                var span = node.getAttribute('item-span');
                if (span) width *= Number(span);
                if (metrics.overflow) {
                    var groupIndex = Number(this.findAttribute('record-group', node));
                    if (groupIndex === 0) width += padding.left;
                    if (groupIndex === groupsCount - 1) width += padding.right;
                }
                return { width: width }
            }
        },
        groupPosition: {
            position: function(_, refBBox, node) {
                var groupIndex = Number(node.getAttribute('record-group'));
                var metrics = this.model.metrics;
                var groupsCount = metrics.groupsCount;
                var padding = metrics.padding;
                var width = (refBBox.width - padding.left - padding.right) / groupsCount;
                var x = padding.left + groupIndex * width;
                var y = padding.top;
                return new g.Point(x, y);
            }
        }
    }
});

export const BorderedRecord = Record.define('standard.BorderedRecord', {
    padding: 0,
    attrs: {
        body: {
            refWidth: '100%',
            refHeight: '100%',
            stroke: '#000000',
            fill: '#FFFFFF'
        }
    }
}, {
    markup: [{
        tagName: 'rect',
        selector: 'body'
    }]
});

export const HeaderedRecord = Record.define('standard.HeaderedRecord', {
    padding: { top: 30, left: 0, right: 0, bottom: 0 },
    attrs: {
        body: {
            refWidth: '100%',
            refHeight: '100%',
            stroke: '#000000',
            fill: '#FFFFFF'
        },
        header: {
            refWidth: '100%',
            height: 30,
            stroke: '#000000',
            fill: 'transparent'
        },
        headerLabel: {
            refX: '50%',
            refY: 15,
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            fontSize: 20,
            fill: '#333333'
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
    }]
});

// Views

var RecordViewPresentationAttributes = Record.prototype.markupAttributes.reduce(function(presentationAttributes, attribute) {
    presentationAttributes[attribute] = ['UPDATE'];
    return presentationAttributes;
}, {});

export const RecordView = dia.ElementView.extend({

    events: {
        'mousedown .record-item-button': 'onItemButtonClick',
        'touchstart .record-item-button': 'onItemButtonClick'
    },

    presentationAttributes: dia.ElementView.addPresentationAttributes(RecordViewPresentationAttributes),

    getLinkEnd: function(magnet, ...args) {
        const end = {
            id: this.model.id,
            port: this.findAttribute('item-id', magnet) || this.findAttribute('port', magnet)
        };
        return this.customizeLinkEnd(end, magnet, ...args);
    },

    getMagnetFromLinkEnd: function(end) {
        var itemId = end.port;
        var model = this.model;
        while (itemId && !model.isItemVisible(itemId)) itemId = model.getItemParentId(itemId);
        if (!itemId) {
            // The connected magnet is not an item (it's a port or arbitrary sub-node)
            return ElementViewPrototype.getMagnetFromLinkEnd.apply(this, arguments);
        }
        var selector = model.getSelector('itemBody', itemId);
        return this.findBySelector(selector, this.el, this.selectors)[0];
    },

    onItemButtonClick: function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var itemId = evt.currentTarget.getAttribute('item-id');
        this.model.toggleItemCollapse(itemId, { ui: true });
    }

});

export const BorderedRecordView = RecordView;
export const HeaderedRecordView = RecordView;

function error(message) {
    throw new Error('shapes.standard.Record: ' + message);
}

