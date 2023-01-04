import * as joint from '@clientio/rappid';
import { useEffect } from 'react';
import attributs from './ElementsAttributes';
import linkattributs from './ElementsLinkAtributes';
import { useSelector,useDispatch } from 'react-redux';
import {
    setGraph
    
  } from '../features/Rappid/RappidSlice';
import { setExpandingNodes,setExpandingEdges,setExpandedNodeids,setNodesDepth} from '../features/Data/DataSlice';
import { concat } from 'lodash';
import Halo from './Halo.js';
import * as dagre from 'dagre';

export default function Elements() {
    const graph= useSelector(state=> state.Rappid.graph)
    const paper= useSelector(state=> state.Rappid.paper)
    const paperScroller= useSelector(state=> state.Rappid.paperScroller)

    const Nodes = useSelector(state => state.Data.Nodes);
    const Nodesdepth = useSelector(state => state.Data.NodesDepth);
    const Edges= useSelector(state=> state.Data.Edges);
    const filterNodes = useSelector(state => state.Data.FilterNodes);
    const filterEdges= useSelector(state=> state.Data.FilterEdges);
    const RootNode= useSelector(state=> state.Data.RootNode)
    const Layoutstyle= useSelector(state=> state.Layout.layoutStyle)

    const dispatch=useDispatch()
    //set up nodes for node expanstion
    const ExpandingNodes= useSelector(state=> state.Data.ExpandingNodes)
    const ExpandingEdges= useSelector(state=> state.Data.ExpandingEdges)
    const ExpandedNodeids= useSelector(state=> state.Data.ExpandedNodeids)


   
    useEffect(()=>{
      var counter=0
      
      if(filterNodes.length>3)
      {
        filterNodes.forEach((shape)=>{
          let name=shape.Name||shape.name;
          let id=shape.id;
          let type=shape.type||shape.Type;
          let prop=shape.properties;
          let description=shape.Description;
          let trace=shape.Info;
          let depth=shape.depth;

          let width =type==='Software Requirements'?350:
          type==='System requirements'?350:
          300;
          let height =type==='Software Requirements'?200:
          type==='System requirements'?100:
          100; 
         CreateShape( id, width, height, name,type,prop,description,trace,depth )  
          }) 
          filterEdges.forEach((Relationship)=>{
            let id=Relationship.id;
            let label=Relationship.label;
            let source=Relationship.source;
            let target=Relationship.target;  
            let depth=Relationship.depth;    
            createEdges(id,source,target,label,depth)   
             
            })
      }
      else if(ExpandingNodes.length>0 && filterNodes.length===0)
      {
        let X=0;
        ExpandingNodes.forEach((shape,index)=>{
          if(index+1<RootNode.length)
          {
            let name=shape.Name||shape.name;
            let id=shape.id;
            let type=shape.type||shape.Type;
            let prop=shape.properties;
            let description=shape.Description;
            let trace=shape.Info;
            let depth=shape.depth;
            X=X+400;
            let width =type==='Software Requirements'?350:
            type==='System requirements'?350:
            300;
            let height =type==='Software Requirements'?200:
            type==='System requirements'?100:
            100; 
            CreateRoots( X,id, width, height, name,type,prop,description,trace,depth )  

          }else
          {
            let name=shape.Name||shape.name;
            let id=shape.id;
            let type=shape.type||shape.Type;
            let prop=shape.properties;
            let description=shape.Description;
            let trace=shape.Info;
            let depth=shape.depth;
            let width =type==='Software Requirements'?350:
            type==='System requirements'?350:
            300;
            let height =type==='Software Requirements'?200:
            type==='System requirements'?100:
            100; 
            CreateShape( id, width, height, name,type,prop,description,trace,depth ) 
          }
          
      
          }) 
          ExpandingEdges.forEach((Relationship)=>{
            let id=Relationship.id;
            let label=Relationship.label;
            let source=Relationship.source;
            let target=Relationship.target;   
            let depth=Relationship.depth;   

            createEdges(id,source,target,label,depth)   
             
            })
      }
      else
      {         
         let X=0;
        RootNode.forEach((shape)=>{
          let name=shape.Name||shape.name;
          let id=shape.id;
          let type=shape.type||shape.Type;
          let prop=shape.properties;
          let description=shape.Description;
          let trace=shape.Info;
          let depth=shape.depth;
          X=X+400;
          let width =type==='Software Requirements'?350:
          type==='System requirements'?350:
          300;
          let height =type==='Software Requirements'?200:
          type==='System requirements'?100:
          100; 
         CreateRoots( X,id, width, height, name,type,prop,description,trace,depth )  
          }) 
         
      }
      
     
    },[RootNode,filterNodes,ExpandingNodes,ExpandingEdges,Layoutstyle,Edges])

function CreateRoots( X,id, width, height, name,type,properties,description,trace,depth ){
   
    var uml = joint.shapes.uml;
   
  
    var propertyKeys=properties?Object.keys(properties):properties
    var propertyValues=properties?Object.values(properties):properties
    var fullname=name
    var name= name?.length>25? name.substr(0,25-1) + ' ...':name;
    let createState =  new uml.State({
  id,
  depth,
  trace,
  description,
  // source:source,
  // target:target,
   position: {
     x: X ,
  //   y: 300,
   },
  size: {
    width,
    height
  },
  shapeType:type,
  fullname,
  name,
  events:propertyValues,
  propertyKeys,
  // label:label,
  // description:description,
  attrs:attributs.Root
  });
  dispatch(setGraph( graph.addCell(createState))) 
  paper.fitToContent({
    allowNewOrigin: 'any',
    allowNegativeBottomRight: true
  });
  
}   
function CreateShape( id, width, height, name,type,properties,description,trace,depth ){
  var uml = joint.shapes.uml;
  let attribute =type==='Software Requirements'?attributs.Type_A:
  type==='System requirements'?attributs.Type_B:
  type==='RFL'?attributs.Root:
  type==='Requirements Type'?attributs.RequirmentTypes:
  attributs.Type_C;

  var propertyKeys=properties?Object.keys(properties):properties
  var propertyValues=properties?Object.values(properties):properties
  var fullname=name
  var name= name?.length>25? name.substr(0,25-1) + ' ...':name;
  let createState =  new uml.State({
id,
depth,
trace,
description,
// source:source,
// target:target,
// position: {
//   x: 200 ,
//   y: 300,
// },
size: {
  width,
  height
},
shapeType:type,
fullname,
name,
events:propertyValues,
propertyKeys,
// label:label,
// description:description,
attrs:attribute
});

dispatch(setGraph( graph.addCell(createState))) 
// const restrictedArea = paper.getArea().center();
// graph.getElements()[0].position(restrictedArea.x,restrictedArea.y)


}
function createEdges(id,sid, tid,label,depth){
  // let Type=sid[0].slice(0,2)
  let Type=sid[0]
  //console.log(Type)
  let attribute =Type==='Software Requirements'?linkattributs.Type_A:
  Type==='System requirements'?linkattributs.Type_B:
  Type==="ROOT"?linkattributs.Root:
  Type==='Requirements Type'?linkattributs.RequirmentTypes:
  linkattributs.Type_C;
    var link= new joint.shapes.standard.Link({
      source: { id: sid },
      target: { id: tid },
      id:id,
      attrs: attribute,
      depth:depth
    });
    
  link.appendLabel({
    attrs: {
        text: {
            text: label
        }
    }
});
//  link.vertices(bendPoints)
// link.connector('jumpover') 
link.router('manhattan', {
  paddingTop: 10
});
//link.connector('jumpover')
dispatch(setGraph(graph.addCell(link)))
// var graphLayout = new joint.layout.TreeLayout({
//     graph: graph,
//     parentGap: 80,
//     siblingGap: 20,
//     direction:Layoutstyle,
    
    
    
// });


// graphLayout.layout()
  //props.addEdge(link);

   joint.layout.DirectedGraph.layout(graph,{
            dagre:dagre,
            graphlib:dagre.graphlib,
            nodeSep: 90,
            edgeSep: 90,
            rankDir:Layoutstyle
                })
                // var root = graph.getElements()[0].position(200, 200);
               
}
//node Expanding Function
function nodeExpantion(id,depth){
  var found = ExpandedNodeids.some(el => el.id === id);
      if(ExpandingNodes.length===0)
      {
        var nextNode=[]
        dispatch(setExpandedNodeids([{id}]))

      //for nextedges
      var newrelations= Edges.filter(relationship=>relationship.source[0]===id )
      dispatch(setExpandingEdges(newrelations));
          var nextNodesids=[]
          newrelations.map((nextNode,index)=>{
            var target=nextNode.target
            nextNodesids=[...nextNodesids,{target} ]
          })
        nextNode=[...RootNode,...ExpandingNodes]
        nextNodesids.map((node,index)=>{
          
            var expandingnode=Nodes.filter(Node=> Node.id===node.target[0] );
            nextNode=[...nextNode,expandingnode[0]]; 

        
        })
        dispatch(setExpandingNodes(nextNode))
        dispatch(setNodesDepth(depth+1))
        graph.resetCells(); 
    

      }else 
      if(found===false)
      {
        dispatch(setExpandedNodeids([...ExpandedNodeids,{id}]))

        var nextNode=[]

      //for nextedges
      var newrelations= [...ExpandingEdges,...Edges.filter(relationship=>relationship.source[0]===id )]
      dispatch(setExpandingEdges(newrelations));
          var relations= Edges.filter(relationship=>  relationship.source[0]===id )
          // console.log(relations,"realationon expanding")
          var nextNodesids=[]
          relations.map((nextNode,index)=>{
            var target=nextNode.target
            var checkforallreadyRender = ExpandingNodes.some(el => el.id === target[0]);
          //console.log(target,"target")
            if(checkforallreadyRender===false)
            {
              nextNodesids=[...nextNodesids,{target} ]

            }
            else{
              nextNodesids=nextNodesids
            }
          })
        nextNode=ExpandingNodes
        nextNodesids.map((node,index)=>{
          
            var expandingnode=Nodes.filter(Node=> Node.id===node.target[0] );
            nextNode=[...nextNode,expandingnode[0]]; 

        
        })
        dispatch(setExpandingNodes(nextNode))
        dispatch(setNodesDepth(depth+1))
        graph.resetCells(); 
    
      }
      else
      {
        var SameNodes=concat(ExpandingNodes)
        var sameEdges=concat(ExpandingEdges)
        dispatch(setExpandingEdges(sameEdges));
        dispatch(setExpandingNodes(SameNodes))
        graph.resetCells(); 


      }
}
function nodeCollapsing(id,depth)
     {    
     // console.log(id,depth,'id & depth')
 
        //Roots
        var RootsLen=RootNode.length
        var ExpandingNodesLen=ExpandingNodes.length
      
        
        if(RootsLen===ExpandingNodesLen){
          dispatch(setExpandingNodes([]))
          dispatch(setExpandingEdges([]))
          dispatch(setExpandedNodeids([]))
          dispatch(setNodesDepth(depth))

          graph.resetCells()
        }
        else{
            // for parent
            var element=graph.getCell(id)
            var Successors=graph.getSuccessors(element ,{deep:true})
            var SuccessorsID=[]
           
            Successors.map((Successor)=>{
              SuccessorsID=[...SuccessorsID,Successor.id]
                          })
                         
            var findingconnectededges=ExpandingEdges.filter((relationship)=>SuccessorsID.includes(relationship.source[0]===id&&relationship.target[0])) 
            var edgesvalue=[]
            findingconnectededges.map((edge)=>{
              
                 edgesvalue=[...edgesvalue,ExpandingEdges.filter((relations)=>relations.target[0]===edge.target[0])]
                
            })
            var newEdges=[]
            var newIds=[]
            if(edgesvalue[0].length>1){
              newEdges=ExpandingEdges.filter((relationship)=>!SuccessorsID.includes(relationship.source[0]===id&&relationship.target[0])  )
              var nodes=[]
              newEdges.map((node)=>{
               nodes=[...nodes,node.source[0]] 
             })
            nodes=[...new Set(nodes)]
            nodes.map((node)=>{
             newIds= [...newIds,...ExpandedNodeids.filter((el)=>el.id==node)]

            })
            dispatch(setExpandedNodeids(newIds))

            }else
            {
               newEdges=ExpandingEdges.filter((relationship)=>!SuccessorsID.includes(relationship.target[0])  )
               var nodes=[]
               newEdges.map((node)=>{
                nodes=[...nodes,node.source[0]] 
              })
             nodes=[...new Set(nodes)]
             nodes.map((node)=>{
              newIds= [...newIds,...ExpandedNodeids.filter((el)=>el.id==node)]
 
             })
            
             dispatch(setExpandedNodeids(newIds))


            }
     
          var newNode=[]
             newEdges.map((edges)=>{
            
              newNode=[...newNode,...ExpandingNodes.filter(node=>node.id==edges.target[0])]
             })
         
           
             newNode=[...RootNode,...newNode]
           
             dispatch(setExpandingEdges(newEdges))
             dispatch(setExpandingNodes(newNode))
             
             //depth update on closing nodes
             var lastExpandednodeid=null
             ExpandedNodeids.map(id=>{
              lastExpandednodeid=id.id
             })
             console.log(lastExpandednodeid)
             var lastExpandednode=ExpandingNodes.filter(node=>node.id===lastExpandednodeid)
             console.log(lastExpandednode)
             var lastExpandednodeDepth=lastExpandednode[0].depth

             dispatch(setNodesDepth(lastExpandednodeDepth+1))

             graph.resetCells()
          
       


        }
        
          
      

}
function QueryExpesion(type,id){
  var newExpandedNodesIds=[...ExpandedNodeids,{id}]
  dispatch(setExpandedNodeids(newExpandedNodesIds))
  var Depth=Nodesdepth
  var QueryNodes=Nodes.filter(node=>node.depth<=Depth&&node.type===id)
  var QueryEdges=[]
  QueryEdges=Edges.filter(edge=>edge.source[0]===id)
  QueryNodes.map((nodes)=>{
    var leafnode=!Edges.some(el=>el.source[0]===nodes.id)
    if(leafnode===false&& nodes.depth<Depth)
    {
      var id=nodes.id
      
      dispatch(setExpandedNodeids([...newExpandedNodesIds,{id}]))
    }
     QueryEdges=[...QueryEdges,...Edges.filter(edge=>edge.source[0]===nodes.id&&edge.depth<=Depth)]
  })
  var newExpandedNodes=[...ExpandingNodes,...QueryNodes]
  var newExpandedEdges=[...ExpandingEdges,...QueryEdges]
  dispatch(setExpandingEdges(newExpandedEdges))
  dispatch(setExpandingNodes(newExpandedNodes))


}
  paper.on('element:contextmenu', (cellView) => {
      var id=cellView.model.attributes.id;
       var element=graph.getCell(id)
       joint.highlighters.mask.add(cellView,{ selector: 'root'},'my-element-highlight',{
        deep: true,
        attrs: {
            'stroke': '#FF4365',
            'stroke-width': 5
        }
    });
      var neighbors=graph.getSuccessors(element,{deep:true})
      var neighboursID=neighbors.map(neighbor=>{
        return(neighbor.id)
      })
      var neighboursCellView=neighboursID.map((neighbor)=>{
        return(paper.findViewByModel(neighbor))
      })
      neighboursCellView.map((neighbor)=>{
       

        joint.highlighters.mask.add(neighbor,{ selector: 'root'},'my-element-highlight',{
          deep: true,
          attrs: {
              'stroke': '#3262a8',
              'stroke-width': 5
          }
      });
      })
      
  });
  
  paper.on('blank:pointerdown', (cellView) => {
     
     
    joint.highlighters.mask.remove(cellView);
        });
    return (
        <div>
          
          <Halo
          nodeExpantion={nodeExpantion}
          nodeCollapsing={nodeCollapsing}
          QueryExpansion={QueryExpesion}
          />
          
        </div>
    )
}