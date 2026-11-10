import {copy} from './copy.mjs';
import {createScrollCursor} from './scroll-cursor.mjs';
import {surfacePalette,clamp,smooth} from './v6-layout.mjs';
import {storyTimeline} from './v7-timeline.mjs';
import {presentationFrame,openingComposition,nativePlaneFrame,backgroundDarkness,sceneTimeline,scenePhase,addressOffset,carrierFrame,flowCoordinates,carrierVisible} from './v11-motion.mjs';
const root=document.documentElement,header=document.querySelector('.site-header'),story=document.querySelector('.product-story'),marker=document.querySelector('.product-start'),pin=document.querySelector('.product-pin'),windowEl=document.querySelector('.native-window'),plane=document.querySelector('.native-viewport');
const intro=document.querySelector('.product-intro'),car=document.querySelector('.hero-car'),host=document.querySelector('#native-host'),fallback=document.querySelector('#native-fallback'),install=document.querySelector('#app-install'),rideNote=document.querySelector('.ride-note'),reviews=document.querySelector('#reviews'),dock=document.querySelector('.mobile-dock'),last=document.querySelector('#last-call');
const media=matchMedia('(prefers-reduced-motion: reduce)'),forcedReduced=new URL(location.href).searchParams.get('motion')==='reduce',reduced=()=>media.matches||forcedReduced,query={get matches(){return reduced();},addEventListener(...args){media.addEventListener(...args);},removeEventListener(...args){media.removeEventListener(...args);}};
const cursor=createScrollCursor();
let lang='bg',native,reviewEffect,ready=false,disposed=false,activated=false,enhanced=false,layout=null,raf=0,frames=0,scrollPosition=scrollY,lastSurface='',dockHidden=null,lastNativeSize='';
root.dataset.introRevision='v11-road-app-compositor-1';
root.dataset.motionState='idle';

// Geometry is read only on real layout changes, never on native scroll events.
function measure(snap=false){
 if(disposed)return;
 scrollPosition=scrollY;root.dataset.reducedMotion=String(reduced());
 if(ready&&!reduced()&&!activated&&install.getBoundingClientRect().top>innerHeight*1.2)activated=true;
 enhanced=activated&&ready&&!reduced();root.dataset.handoff=enhanced?'active':'ordinary';
 // A real layout change may alter the install section's negative overlap.
 // Apply it before caching its document coordinates, once at this boundary.
 root.style.setProperty('--handoff-overlap',pin.clientHeight+(pin.clientHeight+header.getBoundingClientRect().height)*.35+'px');
 const pinRect=pin.getBoundingClientRect(),w=pin.clientWidth,h=pin.clientHeight,hh=header.getBoundingClientRect().height,b=story.getBoundingClientRect(),start=marker.getBoundingClientRect().top,introRect=intro.getBoundingClientRect(),ib=install.getBoundingClientRect(),rb=reviews.getBoundingClientRect(),lb=last.getBoundingClientRect();
 const device=install.querySelector('.install-phone--address .install-device'),rect=device.getBoundingClientRect(),style=getComputedStyle(device),oldProgress=Number(root.dataset.installProgress)||0,offset=addressOffset(oldProgress,w<=700),shift=enhanced?(parseFloat(install.style.getPropertyValue('--handoff-scroll-offset'))||0):0;
 const destination={cx:rect.left+rect.width/2-offset.x,cy:rect.top+rect.height/2-offset.y-start-shift,width:parseFloat(style.width),height:parseFloat(style.height),radius:parseFloat(style.borderRadius),padding:parseFloat(style.paddingLeft)};
 const opening=openingComposition({width:w,height:h,introBottom:introRect.bottom-pinRect.top+18*(1-parseFloat(intro.style.getPropertyValue('--intro-opacity')||'1'))});
 layout={width:w,height:h,header:hh,viewport:enhanced?h+hh:innerHeight,markerDocTop:start+scrollPosition,storySpan:b.height,installTop:ib.top+scrollPosition-shift,installHeight:ib.height,reviewTop:rb.top+scrollPosition,reviewHeight:rb.height,lastTop:lb.top+scrollPosition,destination,opening};
 for(const [key,value]of Object.entries({x:opening.car.x,y:opening.car.y,width:opening.car.width}))pin.style.setProperty('--opening-car-'+key,value+'px');
 pin.style.setProperty('--road-y',opening.car.y-110+'px');pin.style.setProperty('--road-height',opening.car.height+200+'px');
 plane.style.setProperty('--plane-width',w+'px');plane.style.setProperty('--plane-height',h+'px');host.dataset.presentationViewport=JSON.stringify([w,h]);
 const nativeSize=w+'x'+h;if(native&&nativeSize!==lastNativeSize){lastNativeSize=nativeSize;native.resize(true);}
 const geometry=currentGeometry(),timeline=sceneTimeline({...geometry,viewport:layout.viewport,storyBottom:geometry.markerTop+layout.storySpan},enhanced);
 if(snap||reduced()||document.hidden)cursor.snap(timeline.target);else cursor.setTarget(timeline.target);
 schedule();
}
function currentGeometry(){
 const markerTop=layout.markerDocTop-scrollPosition,storyBottom=markerTop+layout.storySpan;
 return {header:layout.header,markerTop,storySpan:layout.storySpan,pinHeight:layout.height,pinTop:enhanced?Math.min(Math.max(layout.header,markerTop),storyBottom-layout.height):markerTop};
}
function setSurface(d){
 const palette=surfacePalette(d),key=palette.surface+palette.ink+palette.line;
 if(key!==lastSurface){lastSurface=key;for(const name of['surface','ink','muted','line'])root.style.setProperty('--'+name,palette[name]);root.style.colorScheme=palette.scheme;document.querySelector('meta[name="theme-color"]').content=palette.surface;}
 root.dataset.darkness=d.toFixed(5);
}
function render(){
 if(!layout||disposed)return;
 const geometry=currentGeometry(),input={...geometry,viewport:layout.viewport,storyBottom:geometry.markerTop+layout.storySpan,installTop:layout.installTop-scrollPosition,installHeight:layout.installHeight},timeline=sceneTimeline(input,enhanced),legacy=storyTimeline(input),distance=cursor.snapshot().value*timeline.total,phase=scenePhase(distance,timeline);
 const p=enhanced?phase.drive:clamp(distance/timeline.runway),exit=clamp((distance-timeline.runway)/legacy.exitDistance),installP=reduced()?1:enhanced?phase.handoff:smooth((distance-legacy.installStart)/legacy.installSpan);
 const base=presentationFrame({width:layout.width,height:layout.height,progress:p,ready,reduced:reduced(),opening:layout.opening}),flow=enhanced?flowCoordinates(geometry,distance,phase.screen):{shift:0,pinTop:geometry.pinTop},flowShift=enhanced&&phase.handoff>0?flow.shift:0;
 if(enhanced&&distance>0)base.y+=flow.pinTop-geometry.pinTop;
 const offset=addressOffset(installP,layout.width<=700),destination=layout.destination,end={x:destination.cx+offset.x-destination.width/2,y:geometry.markerTop+destination.cy+offset.y+flowShift-geometry.pinTop-destination.height/2,width:destination.width,height:destination.height,radius:destination.radius,padding:destination.padding},f=enhanced?carrierFrame(base,end,phase.carrier):base;
 const showNative=carrierVisible({enhanced,visible:geometry.markerTop+layout.storySpan>layout.header&&geometry.markerTop<layout.viewport,hidden:document.hidden,screen:phase.screen,top:geometry.pinTop+f.y,height:f.height,viewport:layout.viewport});
 // Update real native pixels once, before the DOM writes below. The render
 // plane's dimensions are fixed through the complete scroll; no resize here.
 native?.setVisible(showNative);native?.setProgress(phase.native);
 const planeFrame=nativePlaneFrame(f,layout);
 plane.style.setProperty('--plane-scale',String(planeFrame.scale));plane.style.setProperty('--plane-x',planeFrame.x+'px');plane.style.setProperty('--plane-y',planeFrame.y+'px');
 install.style.setProperty('--handoff-scroll-offset',flowShift+'px');
 for(const name of['x','y','width','height','radius','padding'])windowEl.style.setProperty('--native-'+name,f[name].toFixed(3)+'px');
 const shadow=layout.width<=700?[13,22,42,.17]:[17,26,57,.18];
 windowEl.style.setProperty('--native-shadow',enhanced&&phase.handoff?shadow[0]*phase.carrier+'px '+shadow[1]*phase.carrier+'px '+shadow[2]*phase.carrier+'px rgba(5,18,8,'+shadow[3]*phase.carrier+')':'0 '+20*(1-f.expand)+'px '+50*(1-f.expand)+'px rgba(5,18,8,'+.19*(1-f.expand)+')');
 windowEl.style.setProperty('--native-rotation',(f.rotation||0)+'deg');windowEl.style.setProperty('--carrier-opacity',String(enhanced?1-phase.screen:1));windowEl.setAttribute('aria-hidden',String(enhanced&&phase.screen>=1));windowEl.style.setProperty('--phone-lens-opacity',String(1-smooth(f.expand/.5)));windowEl.style.setProperty('--app-preview-opacity',String(1-smooth((f.expand-.04)/.38)));
 pin.style.setProperty('--scene-expansion',String(f.expand));pin.style.setProperty('--road-opacity',String(f.car));intro.style.setProperty('--intro-opacity',String(f.intro));intro.style.setProperty('--intro-y',-18*(1-f.intro)+'px');intro.inert=f.intro<.05;
 car.style.setProperty('--car-opacity',String(f.car));car.style.setProperty('--car-x',-30*(1-f.car)+'px');car.style.setProperty('--car-y',8*(1-f.car)+'px');
 const note=ready&&!reduced()?smooth((f.progress-.5)/.12)*(1-smooth((f.progress-.91)/.07))*(1-phase.handoff):0;rideNote?.style.setProperty('--ride-note-opacity',String(note));rideNote?.style.setProperty('--ride-note-y',14*(1-note)+'px');
 for(const [name,value]of Object.entries({'install-progress':installP,'handoff-screen':phase.screen,'handoff-booking':phase.booking,'handoff-copy':phase.copy}))install.style.setProperty('--'+name,String(value));
 setSurface(enhanced?backgroundDarkness(f.expand,phase.handoff,reduced()):reduced()?0:smooth((f.progress-.09)/.35)*(1-smooth(exit)));
 reviewEffect?.setVisible(!document.hidden&&layout.reviewTop-scrollPosition<layout.viewport&&layout.reviewTop+layout.reviewHeight-scrollPosition>layout.header);
 const hideDock=geometry.markerTop+layout.storySpan>layout.viewport*.2||layout.lastTop-scrollPosition<layout.viewport*.8;if(hideDock!==dockHidden){dockHidden=hideDock;dock.classList.toggle('dock-hidden',hideDock);dock.inert=hideDock;dock.setAttribute('aria-hidden',String(hideDock));}
 root.dataset.appProgress=f.progress.toFixed(5);root.dataset.motionState=cursor.snapshot().active?'active':'idle';root.dataset.motionFrames=String(++frames);root.dataset.motionClock=JSON.stringify(cursor.snapshot());root.dataset.nativeExpansion=f.expand.toFixed(5);root.dataset.installProgress=installP.toFixed(5);root.dataset.handoffProgress=phase.handoff.toFixed(5);root.dataset.handoffRaw=phase.rawHandoff.toFixed(5);root.dataset.handoffScreen=phase.screen.toFixed(5);root.dataset.handoffEndpoint=JSON.stringify(end);root.dataset.handoffCarrier=JSON.stringify({x:f.x,y:f.y,width:f.width,height:f.height,rotation:f.rotation||0});root.dataset.handoffFlowShift=flowShift.toFixed(3);root.dataset.nativePlane=JSON.stringify(planeFrame);
}
function tick(time){raf=0;if(disposed||document.hidden)return;cursor.step(time);render();if(cursor.snapshot().active)schedule();}
function schedule(){if(!raf&&!disposed&&!document.hidden)raf=requestAnimationFrame(tick);}
function scrollSample(){if(!layout||disposed)return;scrollPosition=scrollY;if(ready&&!reduced()&&!activated&&layout.installTop-scrollPosition>layout.viewport*1.2){measure(false);return;}const geometry=currentGeometry(),timeline=sceneTimeline({...geometry,viewport:layout.viewport,storyBottom:geometry.markerTop+layout.storySpan},enhanced);cursor.setTarget(timeline.target);schedule();}
function language(next){
 lang=next==='en'?'en':'bg';const t=copy[lang];root.lang=lang;document.title=t.title;
 document.querySelector('meta[name="description"]').content=t.description;document.querySelector('meta[property="og:description"]').content=t.description;document.querySelector('meta[property="og:title"]').content=t.title;
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t[el.dataset.i18n];
 for(const el of document.querySelectorAll('[data-i18n-aria]'))el.setAttribute('aria-label',t[el.dataset.i18nAria]);
 for(const el of document.querySelectorAll('[data-i18n-alt]'))el.alt=t[el.dataset.i18nAlt];
 for(const el of document.querySelectorAll('[data-lang]'))el.setAttribute('aria-pressed',String(el.dataset.lang===lang));
 windowEl.setAttribute('role','img');windowEl.setAttribute('aria-label',t.v6NativeLabel);
 try{localStorage.setItem('zeleni-site-language',lang);}catch{}
 measure(true);
}

function useFallback(){ready=false;root.dataset.nativePresentation='fallback';fallback.style.opacity='1';host.style.opacity='0';measure(true);}
for(const button of document.querySelectorAll('[data-lang]'))button.addEventListener('click',()=>language(button.dataset.lang));
addEventListener('scroll',scrollSample,{passive:true});addEventListener('resize',()=>{if(layout&&pin.clientWidth===layout.width&&pin.clientHeight===layout.height&&header.getBoundingClientRect().height===layout.header)return;measure(true);},{passive:true});addEventListener('pageshow',()=>measure(true),{passive:true});media.addEventListener('change',()=>measure(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;native?.setVisible(false);reviewEffect?.setVisible(false);}else measure(true);});
document.addEventListener('focusin',event=>{if(event.target.closest?.('.app-install'))measure(true);});
addEventListener('pagehide',event=>{if(raf)cancelAnimationFrame(raf);raf=0;native?.setVisible(false);reviewEffect?.setVisible(false);if(!event.persisted){disposed=true;native?.dispose();reviewEffect?.dispose();}});
document.fonts?.ready.then(()=>{if(!disposed)measure(false);});
document.querySelector('#year').textContent=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Sofia'}).format(new Date());let preferred='bg';try{preferred=localStorage.getItem('zeleni-site-language')||'bg';}catch{}language(preferred);
if(new URL(location.href).searchParams.get('graphics')==='off')useFallback();else import('./native/presentation.mjs?v=11').then(async({mountNativePresentation})=>{const instance=await mountNativePresentation({host,reducedMotion:query});if(disposed){instance.dispose();return;}native=instance;lastNativeSize=layout.width+'x'+layout.height;const result=await native.whenReady;if(disposed||result.state==='disposed')return;if(result.state==='fallback'){useFallback();return;}ready=true;fallback.style.opacity='0';host.style.opacity='1';root.dataset.nativePresentation='ready';measure(true);}).catch(()=>{if(!disposed)useFallback();});
import('./reviews.mjs').then(({mountReviews})=>{if(disposed)return;reviewEffect=mountReviews({host:reviews,canvas:document.querySelector('#reviews-canvas'),reducedMotion:query});schedule();}).catch(()=>{});
