import React from 'react'
import {dia,ui} from '@clientio/rappid/rappid';
import { useSelector,useDispatch } from 'react-redux';
import { setupdatingNodes,setupdatingEdges,setFilterNodes,setFilterEdges,setExpandedNodeids,setExpandingEdges,setExpandingNodes } from '../features/Data/DataSlice';

import CompressIcon from '../compress.PNG'
import ExpandIcon from '../Expand.PNG'

export default function Halo(props) {
    var paper = useSelector(state => state.Rappid.paper);
    var graph= useSelector(state=> state.Rappid.graph)
    var Nodes= useSelector(state=> state.Data.Nodes)
    var RootNodes= useSelector(state=> state.Data.RootNode)
    var Depth= useSelector(state=> state.Data.NodesDepth)
    var Edges= useSelector(state=> state.Data.Edges)
    var FilterNodes= useSelector(state => state.Data.FilterNodes);
    var FilterEdges= useSelector(state=> state.Data.FilterEdges)
    var ExpandedNodeids= useSelector(state=> state.Data.ExpandedNodeids)
    var ExpandingNodes= useSelector(state=> state.Data.ExpandingNodes)
    var ExpandingEdges= useSelector(state=> state.Data.ExpandingEdges)
    var RootNode= useSelector(state=> state.Data.RootNode)
    var checkforfilterhalo=FilterNodes.length
    var Position = ui.Halo.HandlePosition;
    var dispatch=useDispatch()

    function RemoveShape(id){
       
        if(FilterNodes.length>0)
        { graph.resetCells()
          const newshapes = FilterNodes.filter(shape => shape.id !== id );
          const newrelationships= FilterEdges.filter(relationship=> relationship.target[0]!==id  )  
          const Impactnewshapes = Nodes.filter(shape => shape.id !== id );
          const Impactnewrelationships= Edges.filter(relationship=> relationship.target[0]!==id  )  
         
           
           dispatch(setupdatingEdges(Impactnewrelationships)) 
           dispatch(setupdatingNodes(Impactnewshapes))
           dispatch(setFilterEdges(newrelationships))
           dispatch(setFilterNodes(newshapes))
          
        //  setClicked(false)

          
        }else
        
         {   
        var element=graph.getCell(id)
        var neighbors=graph.getSuccessors(element ,{deep:true})
        var neighborsID=[]

        neighbors.map((neighbor)=>{
            neighborsID=[...neighborsID,neighbor.id]
        })
       
      var newEdges=ExpandingEdges.filter((relationship)=>!neighborsID.includes(relationship.target[0])&&relationship.target[0]!==id  )
      var newNode=[]
         
         newEdges.map((edges)=>{
          newNode=[...newNode,...ExpandingNodes.filter(node=>node.id==edges.target[0]&&node.id!==id)]
         })
         newNode=[...RootNode,...newNode]
         console.log(newNode,'node')
         dispatch(setExpandingEdges(newEdges))
         dispatch(setExpandingNodes(newNode))
         dispatch(setExpandedNodeids(ExpandedNodeids.filter(node=>node.id!=id)))
         //updatingMainGraph
         const Impactnewshapes = Nodes.filter(shape => shape.id !== id );
        const Impactnewrelationships= Edges.filter(relationship=> relationship.target[0]!==id  )  
          dispatch(setupdatingEdges(Impactnewrelationships)) 
          dispatch(setupdatingNodes(Impactnewshapes))
        //  dispatch(setNodesDepth(depth)
         graph.resetCells()  
        }
        
    }
    var ExpandingandCollapsingoption={}
    var QueryExpandingoption={}
   
    paper.on('element:mouseover', function(cellView) {
         // We don't want a Halo for links.
         if (cellView.model instanceof dia.Link) return;
        
         var id=cellView.model.attributes.id;
         var depth=cellView.model.attributes.depth;
         var type=cellView.model.attributes.shapeType;
         var leafnode=[]
         var allreadyExpanded = ExpandedNodeids.some(el => el.id === id);
         var element=graph.getCell(id)
         var findingparent =  graph.getPredecessors(element)
         var parentofnode=null
       
         if(findingparent.length===0)
         {
           //  console.log("rootNOde")
         }else
         {
            parentofnode=findingparent[0].id
         }
         
         var checkForParentisRoot=RootNodes.some(node=>node.id===parentofnode)
        //  if(FilterNodes.length===0)
        //  {
             leafnode=!Edges.some(el=>el.source[0]===id)
        //  }else
        //  {
        //      leafnode=!FilterEdges.some(el=>el.source[0]===id)
        //  }
        //Epanding,collapsin and leaf node detection 
        if(allreadyExpanded)
        {
            
            ExpandingandCollapsingoption={
                name: 'CompressNOde',
                icon:CompressIcon,
                position: Position.S,
                events: { pointerup:()=>{
                    props.nodeCollapsing(id,depth)
                    // props.setClicked(false)
                         }
                       ,pointerdown: 'CollapsingNOde' },
                attrs: {
                    '.handle': {
                        'data-tooltip-class-name': 'small',
                        'data-tooltip': 'Click to Compress the node',
                        'data-tooltip-position': 'bottom',
                        'data-tooltip-padding': 15
                    }
                }
            }   
               

        }
        else if(leafnode===true)
        {   
            ExpandingandCollapsingoption={}
            
        }
        else if(!allreadyExpanded){
           
          
            ExpandingandCollapsingoption={
                name: 'ExpandNOde',
                icon:ExpandIcon,
                position: Position.S,
                events: { pointerup:()=>{
                    // if(ExpandedNodeids.length===0 )
                    // {
                    //  dispatch(setExpandedNodeids([{id}]))
                 
                    // }else if(ExpandedNodeids.length>0 && !allreadyExpanded)
                    // {
                    //  dispatch(setExpandedNodeids([...ExpandedNodeids,{id}]))
                    // }
                    // else
                    // {
                    //  dispatch(setExpandedNodeids(ExpandedNodeids))
                 
                    // }
                    props.nodeExpantion(id,depth)
                    // props.setClicked(false)
                         }
                       ,pointerdown: 'ExpandingNOde' },
                attrs: {
                    '.handle': {
                        'data-tooltip-class-name': 'small',
                        'data-tooltip': 'Click to Expand the node',
                        'data-tooltip-position': 'bottom',
                        'data-tooltip-padding': 15
                    }
                }
            }
        }
        //QueryExpansion Logic
        if(type!=="RFL"&&allreadyExpanded===false&&leafnode===false&&Depth>1&&checkForParentisRoot===true)
        {
            QueryExpandingoption={
                name: 'fork',
                position: Position.N,
                events: { pointerup:()=>{
                    props.QueryExpansion(type,id)
                    // props.setClicked(false)
                         }
                       ,pointerdown: 'QueryExpansion' },
                attrs: {
                    '.handle': {
                        'data-tooltip-class-name': 'small',
                        'data-tooltip': 'Click for Query Expansion',
                        'data-tooltip-position': 'top',
                        'data-tooltip-padding': 15
                    }
                }
            } 
        }
        else
        {
            QueryExpandingoption={}
        }

        
        
        var halo = new ui.Halo({
            cellView: cellView,
            // type:'toolbar',
            handles:[
                {
                    name: 'remove',
                    position: Position.NW,
                    events: {
                       pointerup:()=>{
                      RemoveShape(id)
                      // props.setClicked(false)
                           }
                         ,
                      pointerdown: 'removeElement',
                    
               },
                    attrs: {
                        '.handle': {
                            'data-tooltip-class-name': 'small',
                            'data-tooltip': 'Click to remove the object',
                            'data-tooltip-position': 'bottom',
                            'data-tooltip-padding': 15
                        }
                    }
                },
                {
                    name: 'resize',
                    position: Position.NE,
                    events: { pointerdown: 'startResizing', pointermove: 'doResize', pointerup: 'stopBatch' },
                    attrs: {
                        '.handle': {
                            'data-tooltip-class-name': 'small',
                            'data-tooltip': 'Click and drag to resize',
                            'data-tooltip-position': 'bottom',
                            'data-tooltip-padding': 15
                        }
                    }
                },
                ExpandingandCollapsingoption,    
                QueryExpandingoption,         
                { 
                    name: 'rotate',
                    position: Position.SW,
                    events: { pointerdown: 'startRotating', pointermove: 'doRotate', pointerup: 'stopBatch' },
                    attrs: {
                        '.handle': {
                            'data-tooltip-class-name': 'small',
                            'data-tooltip': 'Click and drag to rotate the object',
                            'data-tooltip-position': 'bottom',
                            'data-tooltip-padding': 15
                        }
                    }
                }
            ]
            
            }
            
            );

         halo.render();
         if(checkforfilterhalo>0)
            {
                halo.remove()
            }
        
     });
   

    return (
    <></>
        
    )
}
