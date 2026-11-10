import {clamp,smooth} from './v6-layout.mjs';
import {storyTimeline as previousTimeline} from './v7-timeline.mjs';

// The photograph, copy and real canvas occupy the same pinned stage. Their
// exit follows the expanding aperture, rather than an unrelated early clock.
export function presentationFrame({width,height,progress=0,ready=true,reduced=false,opening}){
 const w=Math.max(1,width),h=Math.max(1,height),mobile=w<=700;
 const phoneWidth=opening?.phone.width??(mobile?Math.min(250,w*.68):Math.min(w-32,w<=1000?304:w<=1400?330:390));
 const phoneHeight=opening?.phone.height??(mobile?Math.min(600,Math.max(430,h*.84)):Math.min(660,Math.max(160,h-32)));
 const p=reduced||!ready?0:clamp(progress),liftProgress=mobile?smooth(p/.18):0,lift=(opening?.lift||0)*liftProgress,expand=mobile?smooth((p-.18)/.34):smooth((p-.04)/.40);
 const startX=opening?.phone.x??(mobile?w-phoneWidth-20:w-phoneWidth-w*.12);
 const startY=opening?.phone.y??(mobile?Math.max(216,h*.3):Math.max(16,(h-phoneHeight)/2));
 const mix=(a,b)=>a+(b-a)*expand;
 return {x:mix(startX,0),y:mix(startY-lift,0),width:mix(phoneWidth,w),height:mix(phoneHeight,h),radius:mix(mobile?30:34,0),padding:mix(mobile?6:7,0),expand,lift,camera:smooth((p-.18)/.82),intro:mobile?1-smooth(p/.135):1-smooth((expand-.08)/.30),car:mobile?1-smooth((p-.025)/.155):1-smooth((expand-.18)/.44),progress:p};
}

export function backgroundDarkness(expansion,handoff,reduced=false){
 return reduced?0:smooth((expansion-.04)/.70)*(1-smooth((handoff-.18)/.44));
}

// The review chapter shares the page surface, including the sticky header.
// Cached document bounds make the light/night/light passage independent of
// the native journey and require no per-scroll DOM measurement.
export function reviewDarkness({top,height,viewport,header=0}){
 const span=Math.max(1,viewport*.55);
 return smooth((viewport-top)/span)*smooth((top+height-header)/span);
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
export function scenePhase(distance,timeline,mobile=false){
 const originalRunway=timeline.originalRunway||timeline.driveRunway,drive=clamp(distance/originalRunway);
 const native=clamp(distance/timeline.runway);
 const rawHandoff=timeline.handoffSpan?clamp((distance-timeline.driveRunway)/timeline.handoffSpan):0;
 const handoff=smooth(rawHandoff);
 // The screen begins dissolving while the handset is still settling. The
 // tall mobile carrier approaches the final screen ratio earlier.
 const release=.90;
 const dissolveStart=mobile?.48:.62;
 const carrier=smooth(rawHandoff/release);
 const screen=smooth((rawHandoff-dissolveStart)/(release-dissolveStart));
 const booking=smooth((rawHandoff-.18)/.46);
 const copy=smooth((rawHandoff-.43)/.18);
 return {drive,native,handoff,rawHandoff,carrier,screen,booking,copy};
}
export function addressOffset(progress,mobile){
 return {x:-progress*(mobile?112:14),y:(1-progress)*(mobile?20:34)};
}
export function flowCoordinates({header,markerTop,storySpan,pinHeight},distance,{rawHandoff,screen}){
 const rawDistance=header-markerTop;
 // Engage scroll compensation gradually, then release it as the screenshot
 // takes over. Both edges have zero slope even after a large touch scroll.
 const shift=(rawDistance-distance)*smooth(rawHandoff/.26)*(1-screen);
 const displayedMarker=header-distance;
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

// Both subjects share one measured media stage; the app image keeps its actual
//390x843 aspect, including the same physical shell padding as the carrier.
export function openingComposition({width,height,introBottom=190}){
 const w=Math.max(1,width),h=Math.max(1,height),mobile=w<=700,padding=mobile?6:7,ratio=843/390;
 const phoneFromHeight=requestedHeight=>{const height=Math.min(requestedHeight,(Math.max(1,w-40)-2*padding)*ratio+2*padding);return {height,width:(height-2*padding)/ratio+2*padding,padding};};
 let phone,car;
 if(mobile){
  const carWidth=w*1.12,carHeight=carWidth*415/1088,carY=introBottom+22;
  const phoneWidth=Math.min(250,w*.66,(Math.max(100,h-40)-2*padding)/ratio+2*padding),phoneHeight=(phoneWidth-2*padding)*ratio+2*padding,phoneY=carY+carHeight+22;
  phone={width:phoneWidth,height:phoneHeight,padding,x:(w-phoneWidth)/2,y:phoneY};
  car={x:(w-carWidth)/2,y:carY,width:carWidth,height:carHeight};
 }else{
  const ph=Math.min(660,h-32);phone={...phoneFromHeight(ph),y:Math.max(16,(h-ph)/2)};phone.x=w-phone.width-w*.06;
  const x=w*.025,space=phone.x-x-24,availableHeight=Math.max(40,h-introBottom-38),carWidth=Math.max(80,Math.min(900,space,availableHeight*1088/415)),carHeight=carWidth*415/1088;
  car={x,y:Math.min(h-carHeight-18,Math.max(introBottom+20,h*.48)),width:carWidth,height:carHeight};
 }
 return {phone,car,lift:mobile?Math.max(0,phone.y-Math.max(20,(h-phone.height)/2)):0};
}

// Native pixels stay on one stable plane. A uniform compositor transform and
// center crop match each carrier height without deforming the vehicle.
export function nativePlaneFrame({width,height,padding=0},reference){
 const innerWidth=Math.max(1,width-2*padding),innerHeight=Math.max(1,height-2*padding),scale=Math.max(innerWidth/reference.width,innerHeight/reference.height);
 return {width:reference.width,height:reference.height,scale,x:(innerWidth-reference.width*scale)/2,y:(innerHeight-reference.height*scale)/2};
}
