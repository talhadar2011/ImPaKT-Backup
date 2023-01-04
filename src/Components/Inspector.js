import React, { useEffect,useState } from 'react'
import'../inspector.css'
import { useSelector,useDispatch } from 'react-redux';
import {
    setClicked,setClickedId,
    setClickedName,setClickedShape,
    setClickedDescription,setClickedPropertyKeys,
    setClickedShapeType,setClickedTrace, setEdgeClicked, setClickedEdgeId, setClickedEdgeLabel, setClickedEdgeSource, setClickedEdgeTarget
    
  } from '../features/Inspector/InspectorSlice';
  import { setupdatingNodes,setupdatingEdges, setFilterNodes,setExpandingNodes, setExpandingEdges} from '../features/Data/DataSlice';
import { event } from 'jquery';
export default function Inspector() {
        const graph= useSelector(state=> state.Rappid.graph)
        const paper = useSelector(state => state.Rappid.paper);
        const Nodes = useSelector(state => state.Data.Nodes);
        const Edges = useSelector(state => state.Data.Edges);

        const Expandingnodes=useSelector(state => state.Data.ExpandingNodes)
        const ExpandingEdges=useSelector(state => state.Data.ExpandingEdges)

        const FilterNodes = useSelector(state => state.Data.FilterNodes);
        const dispatch=useDispatch()
        const Clicked=useSelector(state => state.InspectorData.Node.Clicked);
        const EdgeClicked=useSelector(state => state.InspectorData.Edge.EdgeClicked);

        //Set properties of Clicked Shape
        const ClickedShape=useSelector(state => state.InspectorData.Node.ClickedShape);
        //Set ClickedShapeId
        const ClickedId =useSelector(state => state.InspectorData.Node.ClickedId);
        const ClickedName =useSelector(state => state.InspectorData.Node.ClickedName);
        const ClickedTrace =useSelector(state => state.InspectorData.Node.ClickedTrace);
        const ClickedDescription =useSelector(state => state.InspectorData.Node.ClickedDescription);
        const ClickedPropertyKeys =useSelector(state => state.InspectorData.Node.ClickedPropertyKeys);
        const ClickedShapeType  = useSelector(state => state.InspectorData.Node.ClickedShapeType);
        //clickedEdgeID
        const ClickedEdgeId  = useSelector(state => state.InspectorData.Edge.ClickedEdgeId);
        const ClickedEdgeSource = useSelector(state => state.InspectorData.Edge.ClickedEdgeSource);
        const ClickedEdgeTarget = useSelector(state => state.InspectorData.Edge.ClickedEdgeTarget);
        const ClickedEdgeLabel = useSelector(state => state.InspectorData.Edge.ClickedEdgeLabel);

   useEffect(() => {
    paper.on('element:pointerclick', (cellView)=> {
        dispatch(setClicked(true))
        dispatch(setEdgeClicked(false))
        // open the inspector when the user interacts with an element
        var elements=cellView.model.attributes.events;
        var id=cellView.model.attributes.id;
        var name=cellView.model.attributes.fullname;
        var type=cellView.model.attributes.shapeType;
        var Description=cellView.model.attributes.description;
        var Keys=cellView.model.attributes.propertyKeys;
        var Trace=cellView.model.attributes.trace
        //Clearing Inspector

         dispatch(setClickedEdgeId(null))
         dispatch(setClickedEdgeLabel(null))
         dispatch(setClickedEdgeSource(null))
         dispatch(setClickedEdgeTarget(null))
        //setting values
        dispatch(setClickedShape(elements))
        dispatch(setClickedName(name))
        dispatch(setClickedTrace(Trace))
        dispatch(setClickedId(id))
        dispatch(setClickedDescription(Description))
        dispatch(setClickedPropertyKeys(Keys))
        dispatch(setClickedShapeType(type))
        

        });
    // for Edges
    paper.on('link:pointerclick', (cellView)=> {
        dispatch(setClicked(false))
        dispatch(setEdgeClicked(true))
        // open the inspector when the user interacts with an element
        var id=cellView.model.attributes.id;
        var label=cellView.model.attributes.labels[0].attrs.text.text;
        var source=cellView.model.attributes.source.id[0];
        var target=cellView.model.attributes.target.id[0]
        //Clearing Inspector
        dispatch(setClickedShape([]))
        dispatch(setClickedName(null))
        dispatch(setClickedTrace(null))
        dispatch(setClickedId(null))
        dispatch(setClickedDescription(null))
        dispatch(setClickedPropertyKeys([]))
        dispatch(setClickedShapeType(null))
        //setting values
         dispatch(setClickedEdgeId(id))
         dispatch(setClickedEdgeLabel(label))
         dispatch(setClickedEdgeSource(source))
         dispatch(setClickedEdgeTarget(target))


       
        

        });
       
   }, [Nodes,FilterNodes,Edges,ExpandingEdges])

    const  onChange=(event)=>{
            const {name,value}= event.target;
            const findValue=ClickedShape.find((value)=>value===name)
            const properties=Object.assign([],ClickedShape)
            const index=properties.findIndex(user=>user===findValue)
            properties[index]=value
            dispatch(setClickedShape(properties))

                }

    function UpdateProperties(properties,id,keys){
        
        if(FilterNodes.length>0)
        {
            //Updating Sub Graph
            graph.resetCells()
            let prop = {};
            keys.forEach((key, i) => prop[key] = properties[i]);
            let subShapes = JSON.parse(JSON.stringify(FilterNodes));
            let subindex=subShapes.findIndex((shape)=>shape.id===id)
            let subfindShape=subShapes.find((shape)=>shape.id===id)
            subfindShape.properties=prop
            let subnewShapes=Object.assign([],subShapes)
            subnewShapes[subindex]=subfindShape     
            dispatch(setFilterNodes(subnewShapes))
            //Updating Main Graph
            let Shapes = JSON.parse(JSON.stringify(Nodes));
            let index=Shapes.findIndex((shape)=>shape.id===id)
            let findShape=Shapes.find((shape)=>shape.id===id)
            findShape.properties=prop
            let newShapes=Object.assign([],Shapes)
            newShapes[index]=findShape     
            dispatch(setupdatingNodes(newShapes))
            dispatch(setClicked(false))
        }
        else
        {
            graph.resetCells()
            let prop = {};
            keys.forEach((key, i) => prop[key] = properties[i]);
            let Shapes = JSON.parse(JSON.stringify(Nodes));
            let ExpandingnodesTemp=JSON.parse(JSON.stringify(Expandingnodes))
            Shapes.find((shape)=>shape.id===id).properties=prop
            ExpandingnodesTemp.find((shape)=>shape.id===id).properties=prop
            dispatch(setupdatingNodes(Shapes))
            dispatch(setExpandingNodes(ExpandingnodesTemp))
            dispatch(setClicked(false))
        }
        
            
    }
    function updateEdgeLabel(id,event)
    {
        graph.resetCells()
        dispatch(setEdgeClicked(false))
        const {name,value}= event.target;
        var newAllEdges=JSON.parse(JSON.stringify(Edges));
        var newExpandingEdges=JSON.parse(JSON.stringify(ExpandingEdges));
        newAllEdges.find((Edge)=>Edge.id===id).label=value
        newExpandingEdges.find((Edge)=>Edge.id===id).label=value
        dispatch(setExpandingEdges(newExpandingEdges))
        dispatch(setupdatingEdges(newAllEdges))
       
    }
    const  onsubmit=()=>{
       
      UpdateProperties(ClickedShape,ClickedId,ClickedPropertyKeys)
    
    }

    
        
        var properties=[]
        properties=ClickedShape.map((property,index)=>{
            return(
                ClickedPropertyKeys?(
                    <div key={index+1}>

            <label className='label'>{ClickedPropertyKeys[index]}:</label>
             <div className='row'>
                 
             <input className="form-control input" id={index+1} value={property} onChange={onChange} type='text' name={property} ></input>
             </div>
             </div>
                ):<div></div>
                
            )
            
         });
        
         paper.on('blank:pointerdown', function(cellView) {
            dispatch(setClicked(false))
            dispatch(setEdgeClicked(false))
            dispatch(setClickedShape([]))
            dispatch(setClickedName(null))
            dispatch(setClickedTrace(null))
            dispatch(setClickedId(null))
            dispatch(setClickedDescription(null))
            dispatch(setClickedPropertyKeys([]))
            dispatch(setClickedShapeType(null))
                });
if(EdgeClicked===false && Clicked===true)
    return (
        
        <div id='inspector'>
            {Clicked===true?(<>
            <div className='Background'>
               
               <div className='title'>
             <h1>Information of {ClickedId}</h1>
                 </div>
                 <div className='Id'>
               
                 <h1>Id: {ClickedId}</h1>
             
                 </div>
                 <div className='Name'>
                 <label className='label'>Name:</label>

               <h1>{ClickedName}</h1>
           
               </div>
                 <div className='Type'>
                <label className='label'>Type:</label>
                 <h1>{ClickedShapeType}</h1>
             
                 </div>
                 <div className='Trace'>
                <label className='label'>Trace:</label>
                 <h1>{ClickedTrace}</h1>
             
                 </div>
                 <div className='Description'>
                <label className='label'>Description:</label>
                 <h1>{ClickedDescription}</h1>
             
                 </div>
               
                {properties}
                
                <hr></hr>
                <button  onClick={onsubmit} className='btn btn-primary btn-lg'>Save Changes</button>
               
            </div>
            </>):(<></>)}
            
        </div>
    )
else
{
    return(
        <div id='inspector'>
        {EdgeClicked===true?(<>
        <div className='Background'>
           
           <div className='title'>
         <h1>Information of Edge {ClickedEdgeId}</h1>
             </div>
             <div className='Id'>
           
             <h1>Id: {ClickedEdgeId}</h1>
         
             </div>
             <div className='Source'>
             <label className='label'>Edge Source:</label>

           <h1>{ClickedEdgeSource}</h1>
       
           </div>
             <div className='Target'>
            <label className='label'>Edge Target:</label>
             <h1>{ClickedEdgeTarget}</h1>
         
             </div>
             <div className='Edge Label'>
            <label className='label'>Current Label:</label>
             <h1>{ClickedEdgeLabel}</h1>
         
             </div>
             <div className='Change Label'>
            <label className='label'>Change Label:</label>
           
            <select value={ClickedEdgeLabel} onChange={event=>updateEdgeLabel(ClickedEdgeId,event)} name="Chaneg-label" id="change-label">
            
            <option value="required">required</option>
            <option value="required_By">required_By</option>
            <option value="refined">refined</option>
            <option value="refined_By">refined_By</option>

            </select>
             </div>
           
        </div>
        </>):(<></>)}
        
    </div>
    )
  
}
}

