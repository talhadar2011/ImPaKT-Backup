import {createSlice } from '@reduxjs/toolkit';

const initialState = {
  Node:{
    Clicked:false,  
    ClickedShape: [],
    ClickedId:null,
    ClickedName:null,
    ClickedTrace:null,
    ClickedDescription:null,
    ClickedPropertyKeys:[],
    ClickedShapeType:null
  },
  Edge:{
    EdgeClicked:false,  
    ClickedEdgeId:null,
    ClickedEdgeLabel:null,
    ClickedEdgeSource:null,
    ClickedEdgeTarget:null

  }

};

export const InspectorSlice = createSlice({
  name: 'Inspector',
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    setClicked: (state,action) => {
      state.Node.Clicked=action.payload
      
    },
    setClickedShape: (state,action) => {
      state.Node.ClickedShape = action.payload
      
    },
    setClickedId: (state,action) => {
      
      state.Node.ClickedId=action.payload
    },
    setClickedName: (state,action) => {
      
      state.Node.ClickedName=action.payload
    },
    setClickedTrace: (state,action) => {
        state.Node.ClickedTrace = action.payload
        
      },
    setClickedDescription: (state,action) => {
        state.Node.ClickedDescription = action.payload
        
      },  
    setClickedPropertyKeys: (state,action) => {
        state.Node.ClickedPropertyKeys = action.payload
        
      },
    setClickedShapeType: (state,action) => {
        state.Node.ClickedShapeType = action.payload
        
      },
      setEdgeClicked: (state,action) => {
        state.Edge.EdgeClicked=action.payload
        
      },
      setClickedEdgeId: (state,action) => {
        state.Edge.ClickedEdgeId=action.payload
        
      },
      setClickedEdgeSource: (state,action) => {
        state.Edge.ClickedEdgeSource=action.payload
        
      },
      setClickedEdgeTarget: (state,action) => {
        state.Edge.ClickedEdgeTarget=action.payload
        
      },
      setClickedEdgeLabel: (state,action) => {
        state.Edge.ClickedEdgeLabel=action.payload
        
      },
    


   
   
  },
 
});

export const {setClicked,setClickedId,setClickedName,
              setClickedShape,setClickedDescription,
              setClickedPropertyKeys,setClickedShapeType,
              setClickedTrace,setEdgeClicked,setClickedEdgeId,setClickedEdgeSource,
              setClickedEdgeTarget,setClickedEdgeLabel } = InspectorSlice.actions;



export default InspectorSlice.reducer;
