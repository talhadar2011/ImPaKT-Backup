import { V, dia, util } from 'jointjs/src/core.mjs';
import { activityIcons, activityMarkers } from './icons.mjs';
import { borderSetAttributeWrapper, iconSetAttributeWrapper, borderStyleSetAttribute, iconsPositionAttribute, iconsSetAttributeWrapper, IconsFlows, IconsOrigins  } from './attributes.mjs';

export const Activity = dia.Element.define('bpmn2.Activity', {
    size: { width: 120, height: 100 },
    attrs: {
        root: {
            magnetSelector: 'background',
            highlighterSelector: 'background'
        },
        background: {
            refWidth: '100%',
            refHeight: '100%',
            fill: '#FFFFFF',
            rx: 10,
            ry: 10
        },
        border: {
            stroke: '#333333',
            fillRule: 'evenodd',
            borderType: 'single',
            borderStyle: 'solid',
            borderRadius: 10,
            strokeWidth: 2
        },
        icon: {
            iconColor: '#333333',
            iconType: 'none',
            x: 5,
            y: 0,
            width: 30,
            height: 30,
        },
        label: {
            refY: '50%',
            refX: '50%',
            textVerticalAnchor: 'middle',
            textAnchor: 'middle',
            fontSize: 12,
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            textWrap: {
                width: -10,
                height: -50,
                ellipsis: true
            }
        },
        markers: {
            event: 'element:marker:pointerdown',
            iconSize: 16,
            iconColor: '#333333',
            iconTypes: [''],
            iconsOrigin: IconsOrigins.bottomMiddle,
            iconsFlow: IconsFlows.row,
            refX: '50%',
            refY: '100%',
            refY2: -5
        }
    }
}, {
    markup: [{
        tagName: 'rect',
        selector: 'background'
    }, {
        tagName: 'image',
        selector: 'icon'
    }, {
        tagName: 'path',
        selector: 'border'
    }, {
        tagName: 'text',
        selector: 'label'
    }, {
        tagName: 'g',
        selector: 'markers'
    }]
}, {
    attributes: {
        borderType: {
            set: borderSetAttributeWrapper((rect, attrs, offset) => {
                const { borderRadius = 0 } = attrs;
                const radius = Math.max(Math.min(borderRadius, 2), borderRadius - offset);
                const roundedRect = rect.toJSON();
                roundedRect.rx = roundedRect.ry = radius;
                return V.rectToPath(roundedRect);
            })
        },

        borderStyle: {
            set: borderStyleSetAttribute
        },

        iconType: {
            set: iconSetAttributeWrapper('ACTIVITY_TYPE_ICONS')
        },

        iconTypes: {
            set: iconsSetAttributeWrapper('ACTIVITY_MARKER_ICONS'),
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
        borderRadius: {
            // borderType parameter
        }
    },

    ACTIVITY_TYPE_ICONS: activityIcons,
    ACTIVITY_MARKER_ICONS: util.omit(activityMarkers, 'none')
});

