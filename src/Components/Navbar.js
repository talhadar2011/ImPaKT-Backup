import React from 'react'
import logo from '../Impactlogo.png'
import { useSelector,useDispatch } from 'react-redux';
import { setnewNodes,setnewEdges,setFilterNodes,setFilterEdges } from '../features/Data/DataSlice';
import {
    setGraph,
  } from '../features/Rappid/RappidSlice';
export default function Navbar({subgraph}) {
    const graph= useSelector(state=> state.Rappid.graph)
    const Nodes= useSelector(state=> state.Data.Nodes)
    const Edges= useSelector(state=> state.Data.Edges)
    const RootNodes= useSelector(state=> state.Data.RootNode)
    const ExpandedNodes= useSelector(state=> state.Data.ExpandingNodes)
    const ExpandedEdges= useSelector(state=> state.Data.ExpandingEdges)

    const dispatch=useDispatch()
    let key=''

    function subgraph(key){
        let keyvalue=key
        if(keyvalue==='Impact')
        {   graph.resetCells()         
            dispatch(setFilterEdges([])) 
            dispatch(setFilterNodes([])) 
            dispatch(setGraph(graph))
            // setGraph(graph) 
        }
        else
        {
            graph.resetCells()
            let filterrelations= ExpandedEdges.filter(relationship=> relationship.label===keyvalue||relationship.label==="requirments" )
            let filternodes=ExpandedNodes.filter(node =>filterrelations.some(item => item.target[0] === node.id));
            filternodes=[...RootNodes,...filternodes]
           
            dispatch(setFilterEdges(filterrelations))
            dispatch(setFilterNodes(filternodes))
       
           
        }
        
    }
    return (
        <div>
            <nav className="navbar navbar-dark bg-dark">
                
                <img src={logo} style={{maxHeight:'50px'}} onClick={()=>subgraph(key='Impact')}/> 
                <div className="dropdown" >
  <button className="btn btn-secondary dropdown-toggle" style={{backgroundColor:'#90C4E7',marginRight:'90px',color:'#003A80'}} type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
    Traceability Filter
  </button>
  <div className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                    <a className="dropdown-item" href="#" onClick={()=>{subgraph(key='required');  }}>Required</a>
                    <a className="dropdown-item" href="#" onClick={()=>subgraph(key='required_By')}>Required_By</a>
                    <a className="dropdown-item" href="#" onClick={()=>subgraph(key='refined')}>Refined</a>
                    <a className="dropdown-item" href="#" onClick={()=>subgraph(key='refined_By')}>Refined_By</a>

                </div>
</div>
                
                {/* <a classNameName="navbar-brand"  >
                    Software Requirment
                </a>
                <a classNameName="navbar-brand"  >
                    System Requirment
                </a>
                <a classNameName="navbar-brand"  >
                    Stackholder Requirment
                </a> */}
            </nav>
        </div>
    )
}
