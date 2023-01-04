
import React, { useEffect } from 'react'
import $ from 'jquery';
import * as joint from '@clientio/rappid';
import { useSelector } from 'react-redux';

export default function Paper() {
    const paper = useSelector(state => state.Rappid.paper);
    const paperScroller= useSelector(state=> state.Rappid.paperScroller)

    useEffect(() => {
        paper.on('blank:pointerdown', paperScroller.startPanning);
        
        paperScroller.centerContent();
        var element=new joint.dia.Element();
        paperScroller.scrollToElement(element);
      
        $('#paper').append(paperScroller.render().el);
        
    }, [])
    return (
        <div >                                                         
       </div>
    )
}

