import {clamp,smooth} from './v6-layout.mjs';
import {storyTimeline as previousTimeline} from './v7-timeline.mjs';

// The photograph, copy and real canvas occupy the same pinned stage. Their
// exit follows the expanding aperture, rather than an unrelated early clock.
export function presentationFrame({width,height,progress=0,ready=true,reduced=false}){
 const w=Math.max(1,width),h=Math.max(1,height),mobile=w<=700;
 const phoneWidth=mobile?Math.min(250,w*.68):Math.min(w-32,w<=1000?304:w<=1400?330:390);
 const phoneHeight=mobile?Math.min(600,Math.max(430,h*.84)):Math.min(660,Math.max(160,h-32));
 const p=reduced||!ready?0:clamp(progress),expand=smooth((p-.04)/.40);
 const startX=mobile?w-phoneWidth-20:w-phoneWidth-w*.12;
 const startY=mobile?Math.max(216,h*.3):Math.max(16,(h-phoneHeight)/2);
 const mix=(a,b)=>a+(b-a)*expand;
 return {x:mix(startX,0),y:mix(startY,0),width:mix(phoneWidth,w),height:mix(phoneHeight,h),radius:mix(mobile?30:34,0),padding:mix(mobile?6:7,0),expand,camera:smooth((p-.18)/.82),intro:1-smooth((expand-.08)/.30),car:1-smooth((expand-.18)/.44),progress:p};
}

export function backgroundDarkness(expansion,handoff,reduced=false){
 return reduced?0:smooth((expansion-.04)/.70)*(1-smooth((handoff-.18)/.44));
}

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
 return {drive,native,handoff,carrier:clamp(smooth(handoff/.86)),screen:clamp(smooth((handoff-.86)/.14)),booking:clamp(smooth((handoff-.08)/.50)),copy:clamp(smooth((handoff-.55)/.12))};
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
