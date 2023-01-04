import {createSlice } from '@reduxjs/toolkit';

const initialState = {
  paper: null,
  graph:null,
  commandManager:null,
  paperScroller:null,
  status: 'idle',
};

export const RappidSlice = createSlice({
  name: 'Rappid',
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    setGraph: (state,action) => {
      state.graph=action.payload
      
    },
    setPaper: (state,action) => {
      state.paper = action.payload
      
    },
    setPaperScroller: (state,action) => {
      
      state.paperScroller=action.payload
    },
    setCommandManager: (state,action) => {
      
      state.commandManager=action.payload
    },
    


   
   
  },
 
});

export const { setGraph,setCommandManager,setPaper,setPaperScroller} = RappidSlice.actions;



export default RappidSlice.reducer;
