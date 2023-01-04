
const Tools=[
//    {
//         type: 'undo',
//         name: 'undo',
//         group: 'undo-redo',
//         attrs: {
//             button: {
//                 'data-tooltip': 'Undo',
//                 'data-tooltip-position': 'top',
//                 'data-tooltip-position-selector': '.toolbar-container'
//             }
//         }
//     },
    
//     {
//         type: 'redo',
//         name: 'redo',
//         group: 'undo-redo',
//         attrs: {
//             button: {
//                 'data-tooltip': 'Redo',
//                 'data-tooltip-position': 'top',
//                 'data-tooltip-position-selector': '.toolbar-container'
//             }
//         }
//     },
{
        type: 'separator',
        group: 'undo-redo'
    },
    
    {
        type: 'button',
        name: 'png',
        group: 'export',
        text: 'Export PNG',
        attrs: {
            button: {
                id: 'btn-png',
                'data-tooltip': 'Open as PNG in a pop-up',
                'data-tooltip-position': 'top',
                'data-tooltip-position-selector': '.toolbar-container'
            }
        }
    },
    {
        type: 'button',
        name: 'svg',
        group: 'export',
        text: 'Export SVG',
        attrs: {
            button: {
                id: 'btn-svg',
                'data-tooltip': 'Open as SVG in a pop-up',
                'data-tooltip-position': 'top',
                'data-tooltip-position-selector': '.toolbar-container'
            }
        }
    },
    
    {
        type: 'button',
        name: 'print',
        group: 'print',
        text:'Print Graph',
        attrs: {
            button: {
                id: 'btn-print',
                'data-tooltip': 'Open a Print Dialog',
                'data-tooltip-position': 'top',
                'data-tooltip-position-selector': '.toolbar-container'
            }
        }
    },
    {
        type: 'separator',
        group: 'print'
    },
   {
        type: 'zoom-to-fit',
        name: 'zoom-to-fit',
        group: 'zoom',
        attrs: {
            button: {
                'data-tooltip': 'Zoom To Fit',
                'data-tooltip-position': 'top',
                'data-tooltip-position-selector': '.toolbar-container'
            }
        }
    },
    {
        type: 'zoom-out',
        name: 'zoom-out',
        group: 'zoom',
        attrs: {
            button: {
                'data-tooltip': 'Zoom Out',
                'data-tooltip-position': 'top',
                'data-tooltip-position-selector': '.toolbar-container'
            }
        }
    },
    {
        type: 'label',
        name: 'zoom-slider-label',
        group: 'zoom',
        text: 'Zoom:'
    },
    {
        type: 'zoom-slider',
        name: 'zoom-slider',
        group: 'zoom'
    },
    {
        type: 'zoom-in',
        name: 'zoom-in',
        group: 'zoom',
        attrs: {
            button: {
                'data-tooltip': 'Zoom In',
                'data-tooltip-position': 'top',
                'data-tooltip-position-selector': '.toolbar-container'
            }
        }
    },
    // {
    //     type: 'separator',
    //     group: 'grid'
    // },
    // {
    //     type: 'label',
    //     name: 'grid-size-label',
    //     group: 'grid',
    //     text: 'Grid size:',
    //     attrs: {
    //         label: {
    //             'data-tooltip': 'Change Grid Size',
    //             'data-tooltip-position': 'top',
    //             'data-tooltip-position-selector': '.toolbar-container'
    //         }
    //     }
    // },
    // {
    //     type: 'range',
    //     name: 'grid-size',
    //     group: 'grid',
    //     text: 'Grid size:',
    //     min: 1,
    //     max: 50,
    //     step: 1,
    //     value: 10
    // },
    // {
    //     type: 'separator',
    //     group: 'snapline'
    // },
 
    {
        type: 'fullscreen',
        name: 'fullscreen',
        group: 'fullscreen',
        attrs: {
            button: {
                'data-tooltip': 'Toggle Fullscreen Mode',
                'data-tooltip-position': 'top',
                'data-tooltip-position-selector': '.toolbar-container'
            }
        }
    },
    {
        type: 'separator',
        group: 'layout'
    },
    {
        type: 'label',
        name: 'Select-Layout-label',
        group: 'layout',
        text: 'Select Layout:',
        attrs: {
            label: {
                'data-tooltip': 'Change Layout Style',
                'data-tooltip-position': 'top',
                'data-tooltip-position-selector': '.toolbar-container'
            }
        }
    },
    {
        type: 'SelectBox',
        name: 'LayoutSelector',
        group: 'LayoutSelector',
        options: [
            { content: 'Select Layout Style', selected: true,placeholder:-1 }, 
            { content: 'Top to Bottom',value:'TB' },
            { content: 'Bottom to Top',value:'BT' },
            { content: 'Left to Right',value:'LR' },
            { content: 'Right to Left',value:'RL' }
        ]
    },

    
   
]
export{Tools}