import React, { useEffect } from 'react';

import { useSelector,useDispatch } from 'react-redux';
import {
  setGraph,
  setPaper,
  setPaperScroller,
  setCommandManager
  
} from './features/Rappid/RappidSlice';
import { getData } from './features/Data/DataSlice';
import { setExpandingNodes,setExpandingEdges} from './features/Data/DataSlice';

import {dia,ui} from '@clientio/rappid/rappid';
import * as joint from '@clientio/rappid';
import Navbar from './Components/Navbar';
import Paper from './Components/Paper';
import Toolbar from './Components/Toolbar';
import Navigator from './Components/Navigator';
import Elements from './Components/Elements';
import Inspector from './Components/Inspector';
function App() {
  const paper = useSelector(state => state.Rappid.paper);
  const graph= useSelector(state=> state.Rappid.graph)
  const commandManager= useSelector(state=> state.Rappid.commandManager)
  const paperScroller= useSelector(state=> state.Rappid.paperScroller)
  const Nodes = useSelector(state => state.Data.Nodes);
  const Edges= useSelector(state=> state.Data.Edges)
  const dispatch=useDispatch()
  useEffect(() => {
      //Creating Raddid   
      joint.setTheme('modern')
      const graph = new dia.Graph();
      const commandManager = new dia.CommandManager({ graph: graph });
      const paper = new dia.Paper({
          model: graph,
          gridSize: 1,
          drawGrid: true,
          width: 1300,
          height: 1000,
          background: {
            color: '#F8F9FA',
          },
          async: true,
          interactive: { linkMove: false },
              sorting: joint.dia.Paper.sorting.APPROX,
              snapLabels: true,
    interactive: {
        linkMove: false,
        labelMove: true,
        arrowheadMove: false,
        vertexMove: false,
        vertexAdd: false,
        vertexRemove: false,
        useLinkTools: false
    }
        });
      var paperScroller = new ui.PaperScroller({
          paper: paper,
               autoResizePaper: true,
              scrollWhileDragging: true,
              cursor: 'grab',


      });


      dispatch(setGraph(graph))    
      dispatch(setPaper(paper))
      dispatch(setPaperScroller(paperScroller))
      dispatch(setCommandManager(commandManager))
      dispatch(getData())
      

  }, [])
  
 

  
  if(paper===null||graph===null||paperScroller===null||commandManager===null)
  {return(<></>)}
  else{
      return (
          <>
               <Navbar/>  
               <div id='container' className='container-flud' style={{paddingRight:'20px'}}>
               <div className='col-12'>
               <Toolbar/> 
                <div className='row'style={{marginTop:'5px'
                  }}>
                  <div className='col-8'
                  style={{paddingLeft:'0px',
                  paddingRight:'0px'
                  }} >
                   <div className='row'>
                       <div className='container'
                       style={{height:'500px',
                       paddingLeft:'0px',
                       paddingRight:'0px'
                       }}
                       >
                           <div id='paper'
                           style={{height:'100%',
                                   width:'100%',
                                   }}
                           className='paper-container' 
                           >
                               <Paper/>                              
                               <Elements/> 
                           </div>
                           {/* <Selection
                           paper={paper}
                           /> */}
                            {/* <Halo/>   */}
                       </div>
                   </div>
                   
                   <div className='row'>
                        <Navigator/>          
                   </div>   
               </div>
               <div  className='col-4 '>
                         <Inspector 
                       />              
                   
               </div> 
           </div> 
           </div>
           </div>
              
          </>
      )
  }
}

export default App;
