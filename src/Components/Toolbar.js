import React, { useEffect } from 'react'
import {ui} from '@clientio/rappid/rappid';
import { Tools } from './ToolbarTools';
import { useSelector,useDispatch } from 'react-redux';
import {
     setlayoutStyle
    
  } from '../features/Layout/LayoutSlice';
export default function Toolbar() {
    const paper = useSelector(state => state.Rappid.paper);
    const graph= useSelector(state=> state.Rappid.graph);
    const paperScroller= useSelector(state=> state.Rappid.paperScroller);
    const commandManager= useSelector(state=> state.Rappid.commandManager);
    const dispatch=useDispatch()

useEffect(() => {
    var toolbar = new ui.Toolbar({

        groups: {
            // 'undo-redo': { index: 1 },
            'export': { index: 2 },
            'print': { index: 3 },
            'fullscreen': { index: 4 },
            'order': { index: 5 },
            'zoom': { index: 6},
            //  'grid': { index: 7 },
            "layout":{index:7},
            'LayoutSelector':{index:8}
        },
        
        tools: Tools,
        
    autoToggle:true,
    references: {
        paperScroller: paperScroller,
        commandManager: commandManager
    }
});
toolbar.$el.appendTo('.toolbar-container');
toolbar.render();
var exportStylesheet = '.scalable * { vector-effect: non-scaling-stroke }';
toolbar.on('LayoutSelector:option:select',function(event){
    var layoutSelector=new ui.SelectBox()
    console.log('hello',event.value)
    dispatch(setlayoutStyle(event.value))

})

// toolbar.getWidgetByName('undo').enable();
// toolbar.getWidgetByName('redo').enable();


// toolbar.on('grid-size:mouseover',function(event) {
//     paper.setGridSize(event)
// }
// );
toolbar.on('print:pointerclick',function() {
    

    paper.print({
        sheet:{ width: 1000 }, // A4 - landscape
    sheetUnit: 'mm',
    margin: { left: 0.4, top: 0.3, bottom: 0.2, right: 1.4 },
    marginUnit: 'in',
    padding: 20
        
    })
    
    
}
);
toolbar.on('addelement:pointerclick',function() {
    
   window.$('#exampleModal').modal('show')
 }
);
toolbar.on('clear:pointerclick',function() {
    graph.clear(graph)
}
);
toolbar.on('svg:pointerclick',function() {
    paper.openAsSVG(graph._nodes);
  
}
);
toolbar.on('png:pointerclick',function() {
    paper.openAsPNG(graph._nodes);
}
);   

paper.on('element:mouseenter', function(cellView) {
    new ui.Tooltip({
        rootTarget: document.body,
        target: '[data-tooltip]',
        padding: 15
       });

});
}, [graph,paper,paperScroller,commandManager])
   
    return (
        <div>
            
            <div  style={{marginTop:'20px',}} className='toolbar-container'></div>
            
        </div>
    )
}
