import {copy} from './copy.mjs';
import {createScrollCursor} from './scroll-cursor.mjs';
import {presentationFrame,surfacePalette,clamp,smooth} from './v6-layout.mjs';
import {storyTimeline} from './v7-timeline.mjs';
import {sceneTimeline,scenePhase,addressOffset,carrierFrame,flowCoordinates,carrierVisible} from './v9-motion.mjs';

const root=document.documentElement,header=document.querySelector('.site-header'),story=document.querySelector('.product-story');
const marker=document.querySelector('.product-start'),pin=document.querySelector('.product-pin'),windowEl=document.querySelector('.native-window');
const intro=document.querySelector('.product-intro'),car=document.querySelector('.hero-car'),host=document.querySelector('#native-host'),fallback=document.querySelector('#native-fallback');
const install=document.querySelector('#app-install'),rideNote=document.querySelector('.ride-note');
const reviews=document.querySelector('#reviews'),dock=document.querySelector('.mobile-dock'),last=document.querySelector('#last-call');
const media=matchMedia('(prefers-reduced-motion: reduce)'),forcedReduced=new URL(location.href).searchParams.get('motion')==='reduce';
const reduced=()=>media.matches||forcedReduced,query={get matches(){return reduced();},addEventListener(...args){media.addEventListener(...args);},removeEventListener(...args){media.removeEventListener(...args);}};
const cursor=createScrollCursor();
let lang='bg',native,reviewEffect,ready=false,disposed=false,visible=false,installVisible=false,reviewVisible=false,raf=0,frames=0,runway=1,total=1,exitDistance=1,installStart=0,installSpan=1;
let activated=false,enhanced=false,nativeActive=false,destination,geometry,timeline;

function measureDestination(markerTop,pinTop){
 const device=install.querySelector('.install-phone--address .install-device'),rect=device.getBoundingClientRect();
 const offset=addressOffset(Number(root.dataset.installProgress)||0,pin.clientWidth<=700),style=getComputedStyle(device),shift=parseFloat(install.style.getPropertyValue('--handoff-scroll-offset'))||0;
 return {cx:rect.left+rect.width/2-offset.x,cy:rect.top+rect.height/2-offset.y-markerTop-shift,width:parseFloat(style.width),height:parseFloat(style.height),radius:parseFloat(style.borderRadius),padding:parseFloat(style.paddingLeft),markerTop,pinTop};
}

function setSurface(d){
 const palette=surfacePalette(d);
 for(const name of ['surface','ink','muted','line'])root.style.setProperty(`--${name}`,palette[name]);
 root.style.colorScheme=palette.scheme;document.querySelector('meta[name="theme-color"]').content=palette.surface;
 root.dataset.darkness=d.toFixed(5);
}
function render(){
 const distance=cursor.snapshot().value*total,phase=scenePhase(distance,timeline||{driveRunway:runway,handoffSpan:0});
 const p=enhanced?phase.drive:clamp(distance/runway),exit=clamp((distance-runway)/exitDistance),installP=reduced()?1:enhanced?phase.handoff:smooth((distance-installStart)/installSpan);
 const base=presentationFrame({width:pin.clientWidth,height:pin.clientHeight,progress:p,ready,reduced:reduced()});
 const flow=enhanced&&geometry?flowCoordinates(geometry,distance,phase.screen):{shift:0,pinTop:geometry?.pinTop||0};
 const flowShift=phase.handoff>0?flow.shift:0;
 install.style.setProperty('--handoff-scroll-offset',`${flowShift}px`);
 if(enhanced&&distance>0)base.y+=flow.pinTop-geometry.pinTop;
 const offset=addressOffset(installP,pin.clientWidth<=700);
 const end=destination?{x:destination.cx+offset.x-destination.width/2,y:destination.markerTop+destination.cy+offset.y+flowShift-destination.pinTop-destination.height/2,width:destination.width,height:destination.height,radius:destination.radius,padding:destination.padding}:base;
 const f=enhanced?carrierFrame(base,end,phase.carrier):base;
 for(const name of ['x','y','width','height','radius','padding'])windowEl.style.setProperty(`--native-${name}`,`${f[name].toFixed(3)}px`);
 const shadow=pin.clientWidth<=700?[13,22,42,.17]:[17,26,57,.18];
 windowEl.style.setProperty('--native-shadow',enhanced&&phase.handoff?`${shadow[0]*phase.carrier}px ${shadow[1]*phase.carrier}px ${shadow[2]*phase.carrier}px rgba(5,18,8,${shadow[3]*phase.carrier})`:`0 ${20*(1-f.expand)}px ${50*(1-f.expand)}px rgba(5,18,8,${.19*(1-f.expand)})`);
 windowEl.style.setProperty('--native-rotation',`${f.rotation||0}deg`);
 windowEl.style.setProperty('--carrier-opacity',String(enhanced?1-phase.screen:1));
 windowEl.setAttribute('aria-hidden',String(enhanced&&phase.screen>=1));
 windowEl.style.setProperty('--phone-lens-opacity',String(1-smooth(f.expand/.5)));
 intro.style.setProperty('--intro-opacity',String(f.intro));intro.style.setProperty('--intro-y',`${-32*(1-f.intro)}px`);intro.inert=f.intro<.05;
 car.style.setProperty('--car-opacity',String(f.car));car.style.setProperty('--car-x',`${-70*(1-f.car)}px`);car.style.setProperty('--car-y',`${15*(1-f.car)}px`);
 const note=ready&&!reduced()?smooth((f.progress-.5)/.12)*(1-smooth((f.progress-.91)/.07))*(1-phase.handoff):0;
 rideNote?.style.setProperty('--ride-note-opacity',String(note));rideNote?.style.setProperty('--ride-note-y',`${14*(1-note)}px`);
 install?.style.setProperty('--install-progress',String(installP));
 install?.style.setProperty('--handoff-screen',String(phase.screen));
 install?.style.setProperty('--handoff-booking',String(phase.booking));
 install?.style.setProperty('--handoff-copy',String(phase.copy));
 // The canvas itself receives the new bounds, rather than scaling a movie.
 const showNative=carrierVisible({enhanced,visible,hidden:document.hidden,screen:phase.screen,top:(geometry?.pinTop||0)+f.y,height:f.height,viewport:innerHeight});
 native?.setVisible(showNative);native?.setProgress(phase.native);native?.resize(showNative&&!nativeActive);nativeActive=showNative;
 setSurface(reduced()?0:smooth((f.progress-.09)/.35)*(1-(enhanced?phase.handoff:smooth(exit))));
 root.dataset.appProgress=f.progress.toFixed(5);root.dataset.motionState=cursor.snapshot().active?'active':'idle';root.dataset.motionFrames=String(++frames);root.dataset.motionClock=JSON.stringify(cursor.snapshot());
 root.dataset.nativeExpansion=f.expand.toFixed(5);root.dataset.installProgress=installP.toFixed(5);
 root.dataset.handoffProgress=phase.handoff.toFixed(5);root.dataset.handoffScreen=phase.screen.toFixed(5);
 root.dataset.handoffEndpoint=JSON.stringify(end);root.dataset.handoffCarrier=JSON.stringify({x:f.x,y:f.y,width:f.width,height:f.height,rotation:f.rotation||0});
 root.dataset.handoffFlowShift=flowShift.toFixed(3);
}
function tick(time){raf=0;if(document.hidden||disposed)return;cursor.step(time);render();if(cursor.snapshot().active)raf=requestAnimationFrame(tick);else native?.resize(true);}
function sample(snap=false){
 if(disposed)return;
 root.dataset.reducedMotion=String(reduced());
 const h=innerHeight;
 // A slow native download must never move an already visible install chapter.
 if(ready&&!reduced()&&!activated&&install.getBoundingClientRect().top>h*1.2)activated=true;
 enhanced=activated&&ready&&!reduced();root.dataset.handoff=enhanced?'active':'ordinary';
 root.style.setProperty('--handoff-overlap',`${pin.clientHeight+h*.35}px`);
 const hh=header.getBoundingClientRect().height,b=story.getBoundingClientRect(),start=marker.getBoundingClientRect().top;
 host.dataset.presentationViewport=JSON.stringify([pin.clientWidth,pin.clientHeight]);
 const stage=install?.querySelector('.install-stage')?.getBoundingClientRect();
 const input={header:hh,viewport:h,storyBottom:b.bottom,markerTop:start,pinHeight:pin.clientHeight,installTop:stage?.top,installHeight:stage?.height};
 timeline=sceneTimeline(input,enhanced);
 const legacy=storyTimeline(input);({exitDistance,installStart,installSpan}=legacy);({runway,total}=timeline);
 geometry={header:hh,markerTop:start,storySpan:b.bottom-start,pinTop:pin.getBoundingClientRect().top,pinHeight:pin.clientHeight};
 destination=enhanced?measureDestination(start,geometry.pinTop):null;
 const target=timeline.target;visible=b.bottom>hh&&start<h&&!document.hidden;
 const ib=install?.getBoundingClientRect();installVisible=!!ib&&ib.bottom>hh&&ib.top<h&&!document.hidden;
 reviewVisible=reviews.getBoundingClientRect().top<h&&reviews.getBoundingClientRect().bottom>hh&&!document.hidden;
 reviewEffect?.setVisible(reviewVisible);
 const hideDock=b.bottom>h*.2||last.getBoundingClientRect().top<h*.8;
 dock.classList.toggle('dock-hidden',hideDock);dock.inert=hideDock;dock.setAttribute('aria-hidden',String(hideDock));
 if(snap||reduced()||document.hidden||!visible&&!installVisible){if(raf)cancelAnimationFrame(raf);raf=0;cursor.snap(target);render();native?.resize(true);return;}
 cursor.setTarget(target);render();if(cursor.snapshot().active&&!raf)raf=requestAnimationFrame(tick);
}
function language(next){
 lang=next==='en'?'en':'bg';const t=copy[lang];root.lang=lang;document.title=t.title;
 document.querySelector('meta[name="description"]').content=t.description;document.querySelector('meta[property="og:description"]').content=t.description;document.querySelector('meta[property="og:title"]').content=t.title;
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t[el.dataset.i18n];
 for(const el of document.querySelectorAll('[data-i18n-aria]'))el.setAttribute('aria-label',t[el.dataset.i18nAria]);
 for(const el of document.querySelectorAll('[data-i18n-alt]'))el.alt=t[el.dataset.i18nAlt];
 for(const el of document.querySelectorAll('[data-lang]'))el.setAttribute('aria-pressed',String(el.dataset.lang===lang));
 windowEl.setAttribute('role','img');windowEl.setAttribute('aria-label',t.v6NativeLabel);
 try{localStorage.setItem('zeleni-site-language',lang);}catch{}
 sample(true);
}
function useFallback(){ready=false;root.dataset.nativePresentation='fallback';fallback.style.opacity='1';host.style.opacity='0';sample(true);}
for(const button of document.querySelectorAll('[data-lang]'))button.addEventListener('click',()=>language(button.dataset.lang));
for(const event of ['scroll','resize','pageshow'])addEventListener(event,()=>sample(event!=='scroll'),{passive:true});
media.addEventListener('change',()=>sample(true));document.addEventListener('visibilitychange',()=>sample(true));
document.addEventListener('focusin',event=>{if(event.target.closest?.('.app-install'))sample(true);});
addEventListener('pagehide',event=>{if(raf)cancelAnimationFrame(raf);raf=0;native?.setVisible(false);reviewEffect?.setVisible(false);if(!event.persisted){disposed=true;native?.dispose();reviewEffect?.dispose();}});
document.querySelector('#year').textContent=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Sofia'}).format(new Date());
let preferred='bg';try{preferred=localStorage.getItem('zeleni-site-language')||'bg';}catch{}
language(preferred);

// Readiness is a promise/event boundary, never an idle camera polling loop.
if(new URL(location.href).searchParams.get('graphics')==='off')useFallback();
else import('./native/presentation.mjs?v=9').then(async({mountNativePresentation})=>{
 const instance=await mountNativePresentation({host,reducedMotion:query});
 if(disposed){instance.dispose();return;}native=instance;sample(true);
 const result=await native.whenReady;if(disposed||result.state==='disposed')return;if(result.state==='fallback'){useFallback();return;}
 ready=true;fallback.style.opacity='0';host.style.opacity='1';root.dataset.nativePresentation='ready';cursor.snap(0);sample();
}).catch(()=>{if(!disposed)useFallback();});
import('./reviews.mjs').then(({mountReviews})=>{if(disposed)return;reviewEffect=mountReviews({host:reviews,canvas:document.querySelector('#reviews-canvas'),reducedMotion:query});reviewEffect.setVisible(reviewVisible);}).catch(()=>{});
