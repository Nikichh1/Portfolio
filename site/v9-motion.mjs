import {clamp,smooth} from './v6-layout.mjs';
import {storyTimeline as previousTimeline} from './v7-timeline.mjs';

// The handset handoff and the moving car share the whole visible story clock.
// The car never reaches an internal stop before its native carrier disappears.
export function sceneTimeline(input,enhanced=true){
 if(!enhanced){const t=previousTimeline(input);return {...t,originalRunway:t.runway,driveRunway:t.runway,tailSpan:0,handoffSpan:0};}
 const {header,viewport,storyBottom,markerTop,pinHeight}=input;
 const runway=Math.max(1,storyBottom-markerTop-pinHeight);
 const occupiedViewport=pinHeight+header;
 const handoffSpan=Math.min(occupiedViewport*.9,runway*.7),driveRunway=Math.max(1,runway-handoffSpan);
 const tailSpan=Math.min(occupiedViewport*.35,driveRunway*.3),originalRunway=Math.max(1,driveRunway-tailSpan);
 return {runway,originalRunway,driveRunway,tailSpan,handoffSpan,total:runway,target:clamp((header-markerTop)/runway)};
}
export function scenePhase(distance,timeline){
 const originalRunway=timeline.originalRunway||timeline.driveRunway,drive=clamp(distance/originalRunway);
 const native=clamp(distance/timeline.runway);
 const handoff=timeline.handoffSpan?clamp(smooth((distance-timeline.driveRunway)/timeline.handoffSpan)):0;
 return {drive,native,handoff,carrier:clamp(smooth(handoff/.86)),screen:clamp(smooth((handoff-.86)/.14)),booking:clamp(smooth((handoff-.02)/.38)),copy:clamp(smooth((handoff-.55)/.12))};
}
export function addressOffset(progress,mobile){
 return {x:-progress*(mobile?112:14),y:(1-progress)*(mobile?20:34)};
}
export function flowCoordinates({header,markerTop,storySpan,pinHeight},distance,screen){
 const rawDistance=header-markerTop;
 const shift=(rawDistance-distance)*(1-screen),displayedMarker=header-distance;
 const pinTop=Math.min(Math.max(header,displayedMarker),storySpan+displayedMarker-pinHeight);
 return {shift,pinTop};
}
export function carrierVisible({enhanced,visible,hidden,screen,top,height,viewport}){
 return !hidden&&(enhanced?screen<1&&top+height>0&&top<viewport:visible);
}
export function carrierFrame(start,destination,handoff){
 const frame={...start},mix=(a,b)=>a+(b-a)*handoff;
 for(const key of ['x','y','width','height','radius','padding'])frame[key]=mix(start[key],destination[key]);
 frame.rotation=handoff?-3*handoff:0;
 return frame;
}
