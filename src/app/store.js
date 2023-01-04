import { configureStore } from '@reduxjs/toolkit';
import RappidReducer from '../features/Rappid/RappidSlice';
import DataReducer from '../features/Data/DataSlice';
import InspectorReducer from '../features/Inspector/InspectorSlice';
import LayoutReducer from '../features/Layout/LayoutSlice';


export const store = configureStore({
  reducer: {
    Rappid: RappidReducer,
    Layout:LayoutReducer,    
    Data:DataReducer,
    InspectorData:InspectorReducer  },middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware({
    serializableCheck: {
      // Ignore these action types
      ignoredActions: ['Rappid/setGraph','Rappid/setPaper','Rappid/setCommandManager','Rappid/setPaperScroller'],
      // Ignore these field paths in all actions
      ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
      // Ignore these paths in the state
      ignoredPaths: ['Rappid.paper','Rappid.graph',`Rappid.commandManager`,`Rappid.paperScroller`],
    },
  }),
});
