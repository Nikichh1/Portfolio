import {copy} from './copy.mjs';
import {createScrollCursor} from './scroll-cursor.mjs';
import {presentationFrame,surfacePalette,clamp,smooth} from './v6-layout.mjs';
import {storyTimeline} from './v7-timeline.mjs';

const root=document.documentElement,header=document.querySelector('.site-header'),story=document.querySelector('.product-story');
const marker=document.querySelector('.product-start'),pin=document.querySelector('.product-pin'),windowEl=document.querySelector('.native-window');
const intro=document.querySelector('.product-intro'),car=document.querySelector('.hero-car'),host=document.querySelector('#native-host'),fallback=document.querySelector('#native-fallback');
const install=document.querySelector('#app-install'),rideNote=document.querySelector('.ride-note');
const reviews=document.querySelector('#reviews'),dock=document.querySelector('.mobile-dock'),last=document.querySelector('#last-call');
const media=matchMedia('(prefers-reduced-motion: reduce)'),forcedReduced=new URL(location.href).searchParams.get('motion')==='reduce';
const reduced=()=>media.matches||forcedReduced,query={get matches(){return reduced();},addEventListener(...args){media.addEventListener(...args);},removeEventListener(...args){media.removeEventListener(...args);}};
const cursor=createScrollCursor();
let lang='bg',native,reviewEffect,ready=false,disposed=false,visible=false,installVisible=false,reviewVisible=false,raf=0,frames=0,runway=1,total=1,exitDistance=1,installStart=0,installSpan=1;

function setSurface(d){
 const palette=surfacePalette(d);
 for(const name of ['surface','ink','muted','line'])root.style.setProperty(`--${name}`,palette[name]);
 root.style.colorScheme=palette.scheme;document.querySelector('meta[name="theme-color"]').content=palette.surface;
 root.dataset.darkness=d.toFixed(5);
}
function render(){
 const distance=cursor.snapshot().value*total,p=clamp(distance/runway),exit=clamp((distance-runway)/exitDistance),installP=reduced()?1:smooth((distance-installStart)/installSpan);
 const f=presentationFrame({width:pin.clientWidth,height:pin.clientHeight,progress:p,ready,reduced:reduced()});
 for(const name of ['x','y','width','height','radius','padding'])windowEl.style.setProperty(`--native-${name}`,`${f[name].toFixed(3)}px`);
 windowEl.style.setProperty('--native-shadow',`0 ${20*(1-f.expand)}px ${50*(1-f.expand)}px rgba(5,18,8,${.19*(1-f.expand)})`);
 windowEl.style.setProperty('--phone-lens-opacity',String(1-smooth(f.expand/.5)));
 intro.style.setProperty('--intro-opacity',String(f.intro));intro.style.setProperty('--intro-y',`${-32*(1-f.intro)}px`);intro.inert=f.intro<.05;
 car.style.setProperty('--car-opacity',String(f.car));car.style.setProperty('--car-x',`${-70*(1-f.car)}px`);car.style.setProperty('--car-y',`${15*(1-f.car)}px`);
 const note=ready&&!reduced()?smooth((f.progress-.5)/.12)*(1-smooth((f.progress-.91)/.07)):0;
 rideNote?.style.setProperty('--ride-note-opacity',String(note));rideNote?.style.setProperty('--ride-note-y',`${14*(1-note)}px`);
 install?.style.setProperty('--install-progress',String(installP));
 // The canvas itself receives the new bounds, rather than scaling a movie.
 native?.resize();native?.setProgress(f.camera);
 setSurface(reduced()?0:smooth((f.progress-.09)/.35)*(1-smooth(exit)));
 root.dataset.appProgress=f.progress.toFixed(5);root.dataset.motionState=cursor.snapshot().active?'active':'idle';root.dataset.motionFrames=String(++frames);root.dataset.motionClock=JSON.stringify(cursor.snapshot());
 root.dataset.nativeExpansion=f.expand.toFixed(5);root.dataset.installProgress=installP.toFixed(5);
}
function tick(time){raf=0;if(document.hidden||disposed)return;cursor.step(time);render();if(cursor.snapshot().active)raf=requestAnimationFrame(tick);else native?.resize(true);}
function sample(snap=false){
 if(disposed)return;
 root.dataset.reducedMotion=String(reduced());
 const hh=header.getBoundingClientRect().height,b=story.getBoundingClientRect(),start=marker.getBoundingClientRect().top,h=innerHeight;
 const stage=install?.querySelector('.install-stage')?.getBoundingClientRect();
 const timeline=storyTimeline({header:hh,viewport:h,storyBottom:b.bottom,markerTop:start,pinHeight:pin.clientHeight,installTop:stage?.top,installHeight:stage?.height});
 ({runway,total,exitDistance,installStart,installSpan}=timeline);
 const target=timeline.target;visible=b.bottom>hh&&start<h&&!document.hidden;
 const ib=install?.getBoundingClientRect();installVisible=!!ib&&ib.bottom>hh&&ib.top<h&&!document.hidden;
 reviewVisible=reviews.getBoundingClientRect().top<h&&reviews.getBoundingClientRect().bottom>hh&&!document.hidden;
 native?.setVisible(visible);reviewEffect?.setVisible(reviewVisible);
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
addEventListener('pagehide',event=>{if(raf)cancelAnimationFrame(raf);raf=0;native?.setVisible(false);reviewEffect?.setVisible(false);if(!event.persisted){disposed=true;native?.dispose();reviewEffect?.dispose();}});
document.querySelector('#year').textContent=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Sofia'}).format(new Date());
let preferred='bg';try{preferred=localStorage.getItem('zeleni-site-language')||'bg';}catch{}
language(preferred);

// Readiness is a promise/event boundary, never an idle camera polling loop.
if(new URL(location.href).searchParams.get('graphics')==='off')useFallback();
else import('./native/presentation.mjs?v=7').then(async({mountNativePresentation})=>{
 const instance=await mountNativePresentation({host,reducedMotion:query});
 if(disposed){instance.dispose();return;}native=instance;sample(true);
 const result=await native.whenReady;if(disposed||result.state==='disposed')return;if(result.state==='fallback'){useFallback();return;}
 ready=true;fallback.style.opacity='0';host.style.opacity='1';root.dataset.nativePresentation='ready';cursor.snap(0);sample();
}).catch(()=>{if(!disposed)useFallback();});
import('./reviews.mjs').then(({mountReviews})=>{if(disposed)return;reviewEffect=mountReviews({host:reviews,canvas:document.querySelector('#reviews-canvas'),reducedMotion:query});reviewEffect.setVisible(reviewVisible);}).catch(()=>{});
