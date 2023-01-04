import React, { useEffect } from 'react'
import {ui} from '@clientio/rappid/rappid';
import * as joint from '@clientio/rappid';
import { useSelector } from 'react-redux';
export default function Navigator() {
  const paperScroller= useSelector(state=> state.Rappid.paperScroller);
  useEffect(() => {
    
        
    var nav = new ui.Navigator({
        paperScroller: paperScroller,
        width: 140,
        height: 100,
        zoom: true,
        zoomOptions: { max: 4, min: 0.1 },

        
      });
      paperScroller.center();
      nav.updateCurrentView()	
      nav.$el.appendTo('#navigator');
      nav.render();
 

       
   }, [paperScroller])
  
              
    return (
             <div id='navigator'></div> 
    )
}
