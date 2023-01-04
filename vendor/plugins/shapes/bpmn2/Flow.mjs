import { dia, util } from 'jointjs/src/core.mjs';
import { defaultLabel } from './labels.mjs';

const setSourceMarker = dia.attributes.sourceMarker.set;
const setTargetMarker = dia.attributes.targetMarker.set;

const FlowTypes = {
    sequence: 'sequence',
    default: 'default',
    conditional: 'conditional',
    message: 'message'
};

export const Flow = dia.Link.define('bpmn2.Flow', {
    attrs: {
        line: {
            connection: true,
            stroke: '#333333',
            strokeWidth: 2,
            strokeLinejoin: 'round',
            flowType: 'sequence'
        },
        wrapper: {
            connection: true,
            strokeWidth: 10,
            strokeLinejoin: 'round'
        }
    }
}, {
    defaultLabel,
    markup: [{
        tagName: 'path',
        selector: 'wrapper',
        attributes: {
            'fill': 'none',
            'cursor': 'pointer',
            'stroke': 'transparent',
            'stroke-linecap': 'round'
        }
    }, {
        tagName: 'path',
        selector: 'line',
        attributes: {
            'fill': 'none',
            'pointer-events': 'none'
        }
    }]
}, {
    attributes: {
        flowType: {
            set: function(type, refBBox, node, attrs) {
                const { markerFill = '#FFFFFF', strokeWidth = 2 } = attrs;
                const attributes = {
                    'stroke-dasharray': 'none',
                    'marker-start': null,
                    'marker-end': null
                };
                let source;
                let target;
                switch (type) {

                    case FlowTypes.default: {
                        source = {
                            'd': 'M 5 -5 15 5',
                            'stroke-width': strokeWidth
                        };
                        target = {
                            'type': 'path',
                            'd': 'M 12 -5 0 0 12 5 z'
                        };
                        break;
                    }

                    case FlowTypes.conditional: {
                        source = {
                            'd': 'M 0 0 9 -5 18 0 9 5 Z',
                            'stroke-width': strokeWidth,
                            'fill': markerFill
                        };
                        target = {
                            'type': 'path',
                            'd': 'M 12 -5 0 0 12 5 z'
                        };
                        break;
                    }

                    case FlowTypes.message: {
                        attributes['stroke-dasharray'] = '5,2';
                        source = {
                            'type': 'circle',
                            'cx': 5,
                            'r': 5,
                            'stroke-width': strokeWidth,
                            'fill': markerFill
                        };
                        target = {
                            'type': 'path',
                            'd': 'M 12 -5 0 0 12 5 z',
                            'stroke-width': strokeWidth,
                            'fill': markerFill
                        };
                        break;
                    }

                    case FlowTypes.sequence:
                    default: {
                        target = {
                            'type': 'path',
                            'd': 'M 12 -5 0 0 12 5 z'
                        };
                        break;
                    }
                }

                if (source) {
                    util.assign(attributes, setSourceMarker.call(this, source, refBBox, node, attrs));
                }

                if (target) {
                    util.assign(attributes, setTargetMarker.call(this, target, refBBox, node, attrs));
                }

                return attributes;
            }
        },
        markerFill: {
            // `flowType` option
        }
    },

    FLOW_TYPES: FlowTypes

});
