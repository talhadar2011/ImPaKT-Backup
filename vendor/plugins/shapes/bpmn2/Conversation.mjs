import { dia, util } from 'jointjs/src/core.mjs';
import { activityMarkers } from './icons.mjs';
import { iconsPositionAttribute, iconsSetAttributeWrapper, IconsFlows, IconsOrigins  } from './attributes.mjs';

export const Conversation = dia.Element.define('bpmn2.Conversation', {
    size: { width: 58, height: 47 },
    attrs: {
        root: {
            magnetSelector: 'body',
            highlighterSelector: 'body',
        },
        body: {
            fill: '#FFFFFF',
            stroke: '#333333',
            refPoints: '1,0 3,0, 4,1 3,2 1,2 0,1, 1,0',
            strokeLinejoin: 'round',
            strokeWidth: 2
        },
        markers: {
            event: 'element:marker:pointerdown',
            iconSize: 16,
            iconColor: '#333333',
            iconTypes: [],
            iconsOrigin: IconsOrigins.bottomMiddle,
            iconsFlow: IconsFlows.row,
            refX: '50%',
            refY: '100%'
        },
        label: {
            refDy: 10,
            refX: '50%',
            textVerticalAnchor: 'top',
            textAnchor: 'middle',
            fontSize: 12,
            fontFamily: 'sans-serif',
            fontWeight: 'bold'
        }
    }
}, {
    markup: [{
        tagName: 'polygon',
        selector: 'body'
    }, {
        tagName: 'text',
        selector: 'label'
    }, {
        tagName: 'g',
        selector: 'markers'
    }]
}, {
    attributes: {

        iconTypes: {
            set: iconsSetAttributeWrapper('CONVERSATION_MARKER_ICONS'),
            position: iconsPositionAttribute
        },

        iconSize: {
            // iconTypes attribute
        },
        iconsOrigin: {
            // iconTypes attribute
        },
        iconsFlow: {
            // iconTypes attribute
        },
        iconColor: {
            // iconType & iconTypes parameter
        },

    },

    CONVERSATION_MARKER_ICONS: util.omit(activityMarkers, 'none')

});

// function toPolygonPathData(bbox) {
//     const { x, y, width, height } = bbox;
//     const h = width / 4;
//     const v = height / 2;
//     return `M ${x+h},${y} ${x+3*h},${y} ${x+width},${y+v} ${x+3*h},${y+height} ${y+h},${y+height} ${x},${y+v} Z`;
// }
