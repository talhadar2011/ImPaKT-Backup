import {createSlice } from '@reduxjs/toolkit';

const initialState = {
  layoutStyle: 'B',
};

export const LayoutSlice = createSlice({
  name: 'Layout',
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    setlayoutStyle: (state,action) => {
      state.layoutStyle=action.payload
      
    }   
  
   
  },
 
});

export const { setlayoutStyle} = LayoutSlice.actions;



export default LayoutSlice.reducer;
