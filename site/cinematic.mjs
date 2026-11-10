import {copy} from './copy.mjs';
import {createScrollCursor} from './scroll-cursor.mjs';
const root=document.documentElement,story=document.querySelector('.experience-story');
const opening=document.querySelector('.opening-copy'),sunset=document.querySelector('.sunset-photo'),night=document.querySelector('.night-photo');
const phone=document.querySelector('.product-phone'),steps=[...document.querySelectorAll('.story-step')],frames=[...document.querySelectorAll('.demo-frame')];
const closing=document.querySelector('.closing-copy'),footer=document.querySelector('.story-bottom'),credit=document.querySelector('.photo-credit');
const dock=document.querySelector('.mobile-dock'),lastCall=document.querySelector('.last-call'),reviewsHost=document.querySelector('#reviews');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),cursor=createScrollCursor({value:0}),fleetCursor=createScrollCursor({value:0});
const fleet=document.querySelector('.fleet-film'),fleetScenes=[...document.querySelectorAll('.fleet-scene')];
const fleetPosition=document.querySelector('.fleet-position'),fleetSegments=[...document.querySelectorAll('.fleet-progress-segment')],header=document.querySelector('.site-header');
const forcedReduced=new URL(location.href).searchParams.get('motion')==='reduce';
const isReduced=()=>reduced.matches||forcedReduced;
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10);};
const fade=(p,a,b,c,d)=>smooth((p-a)/(b-a))*(1-smooth((p-c)/(d-c)));
let raf=0,nativeProgress=0,nativeFleetProgress=0,renderCount=0,fleetRenderCount=0,storyVisible=false,fleetVisible=false,review=null,reviewStarting=false,reviewVisible=false,filmOn=false,autoFilmAttempted=false,currentLanguage='bg';
let lastStoryProgress=NaN,lastFleetProgress=NaN;
const film=document.querySelector('#demo-film'),filmButton=document.querySelector('.film-toggle');
function language(value){currentLanguage=value==='en'?'en':'bg';const t=copy[currentLanguage];root.lang=currentLanguage;document.title=t.title;for(const key of ['description','og:description'])document.querySelector(`meta[${key==='description'?'name':'property'}="${key}"]`).content=t.description;document.querySelector('meta[property="og:title"]').content=t.title;for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t[el.dataset.i18n];for(const el of document.querySelectorAll('[data-i18n-aria]'))el.setAttribute('aria-label',t[el.dataset.i18nAria]);for(const el of document.querySelectorAll('[data-i18n-alt]'))el.alt=t[el.dataset.i18nAlt];for(const b of document.querySelectorAll('[data-lang]'))b.setAttribute('aria-pressed',String(b.dataset.lang===currentLanguage));filmButton.textContent=t[filmOn?'pauseFilm':'playFilm'];try{localStorage.setItem('zeleni-site-language',currentLanguage);}catch{}sample();}
function surface(d){const rgb=[246-241*d,247-241*d,242-237*d].map(Math.round);const luminance=rgb.map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);const crossing=d>.1&&d<.9,ink=crossing?(luminance>.179?'#000':'#fff'):(d<.5?'#121710':'#f6f7f2');root.style.setProperty('--surface',`rgb(${rgb})`);root.style.setProperty('--ink',ink);root.style.setProperty('--muted',crossing?ink:(d<.5?'#4c5548':'#bdc7b7'));root.style.setProperty('--line',d<.5?'#cfd5c8':'#394333');root.style.colorScheme=d>.75?'dark':'light';document.querySelector('meta[name="theme-color"]').content=`rgb(${rgb})`;root.dataset.darkness=d.toFixed(4);}
function renderGround(p,fp){const primaryD=smooth((p-.06)/.16)*(1-smooth((p-.94)/.06)),fleetD=fleet?smooth((fp-.12)/.20)*(1-smooth((fp-.85)/.15)):0;surface(isReduced()?0:Math.max(primaryD,fleetD));root.dataset.primaryDarkness=primaryD.toFixed(4);root.dataset.fleetDarkness=fleetD.toFixed(4);}
function render(p){root.dataset.reducedMotion=String(isReduced());const narrow=innerWidth<=800,small=innerWidth<=500,landscape=innerHeight<=650&&innerWidth>=600;const reveal=smooth((p-.04)/.13),exit=smooth((p-.75)/.18);
 sunset.style.opacity=String(1-smooth((p-.08)/.15));sunset.style.transform=`scale(${1.035+p*.15}) translate3d(${-p*2}%,${p*3}%,0)`;
 night.style.opacity=String(smooth((p-.72)/.17)*(1-smooth((p-.94)/.06)));night.style.transform=`scale(${1.11-p*.035}) translate3d(${(1-p)*-2}%,0,0)`;
 const openingOpacity=1-smooth((p-.025)/.12);opening.style.opacity=String(openingOpacity);opening.style.transform=`translate3d(0,${-p*160}px,0)`;opening.inert=openingOpacity<.05;
 const phoneVisible=narrow?fade(p,.025,.16,.74,.84):(1-smooth((p-.74)/.10));phone.style.opacity=String(phoneVisible);phone.inert=phoneVisible<.05;const caption=document.querySelector('.demo-caption'),captionOpacity=1-smooth((p-.72)/.06);caption.style.opacity=String(captionOpacity);caption.inert=captionOpacity<.05;
 const startY=narrow?170:40,endY=exit*-160;const translateY=(1-reveal)*startY+endY;const rotation=(1-reveal)*(narrow?5:11)-exit*7;const scale=1+Math.sin(Math.PI*clamp((p-.15)/.7))*(small?.025:.08);phone.style.transform=`translate3d(0,${translateY}px,0) rotate(${rotation}deg) scale(${scale})`;
 phone.style.top=landscape?'23%':small?'30%':narrow?'28%':'15%';
 const weights=[1-smooth((p-.275)/.065),smooth((p-.275)/.065)*(1-smooth((p-.46)/.07)),smooth((p-.46)/.07)*(1-smooth((p-.66)/.07)),smooth((p-.66)/.07)];frames.forEach((frame,i)=>frame.style.opacity=String(weights[i]));
 const ranges=[[.13,.19,.28,.34],[.30,.36,.46,.52],[.48,.54,.74,.80]];steps.forEach((el,i)=>{const a=fade(p,...ranges[i]);el.style.opacity=String(a);el.style.transform=`translate3d(0,${(1-a)*17}px,0)`;el.setAttribute('aria-hidden',String(a<.05));});
 const tap=document.querySelector('.screen-tap'),tapProgress=clamp((p-.38)/.055);tap.style.opacity=String(Math.sin(Math.PI*tapProgress)*.8);tap.style.transform=`translate(-50%,-50%) scale(${.6+tapProgress*.8})`;
 const closingOpacity=fade(p,.82,.90,.96,1);closing.style.opacity=String(closingOpacity);closing.style.transform=`translate3d(0,${(1-exit)*30}px,0)`;closing.inert=closingOpacity<.05;
 const bottomOpacity=1-smooth((p-.025)/.10);footer.style.opacity=String(bottomOpacity);footer.inert=bottomOpacity<.05;
 root.dataset.storyProgress=p.toFixed(5);root.dataset.nativeProgress=nativeProgress.toFixed(5);root.dataset.motionFrames=String(++renderCount);root.dataset.motionState=cursor.snapshot().active?'active':'idle';root.dataset.motionClock=JSON.stringify(cursor.snapshot());
 if(isReduced()){for(const el of [sunset,night,opening,phone,closing,...steps])el.style.transform='none';tap.style.opacity='0';sunset.style.opacity=p<.14?'1':'0';night.style.opacity=p>.82&&p<.96?'1':'0';document.querySelector('.demo-caption').style.color=p>=.14&&p<.82?'var(--ink)':'#d7ddcf';filmButton.style.color='inherit';}
 const creditOpacity=Math.max(Number(sunset.style.opacity),Number(night.style.opacity));credit.style.opacity=String(creditOpacity);credit.inert=creditOpacity<.05;const creditLink=credit.querySelector('a'),creditLabel=copy[currentLanguage][p<.5?'panoramaCredit':'fleetPhotoCredit'];if(creditLink&&creditLink.textContent!==creditLabel){creditLink.textContent=creditLabel;creditLink.href=p<.5?'/site/assets/photos/credits.txt':'/site/assets/fleet/credits.txt';}
 if(!autoFilmAttempted&&!isReduced()&&p>.54&&p<.75&&phoneVisible>.9){autoFilmAttempted=true;playFilm();}
 if(filmOn&&(phoneVisible<.05||document.hidden)){pauseFilm();}
}
function renderFleet(fp){
 if(!fleet)return;
 const firstExit=smooth((fp-.22)/.13),secondExit=smooth((fp-.56)/.14),weights=[1-firstExit,firstExit*(1-secondExit),secondExit];
 const media=fleet.querySelector('.fleet-media'),mediaWidth=media?.clientWidth||0;
 if(media){
  if(innerWidth<=800&&mediaWidth>0){const headerHeight=Math.max(0,header?.getBoundingClientRect().height||0),studioH=mediaWidth*452/768,wideNightH=mediaWidth*3/4,tallH=Math.max(studioH,Math.min(mediaWidth*.95,innerHeight*.60,innerHeight-headerHeight-80-100));media.style.setProperty('--fleet-photo-height',`${studioH+(tallH-studioH)*firstExit-(tallH-wideNightH)*secondExit}px`);}
  else media.style.removeProperty('--fleet-photo-height');
 }
 let activeIndex=0;
 fleetScenes.forEach((scene,index)=>{
  const weight=weights[index]||0;if(weight>(weights[activeIndex]||0))activeIndex=index;
  scene.style.opacity=String(weight);scene.inert=weight<.05;scene.setAttribute('aria-hidden',String(weight<.05));
  const image=scene.querySelector('img');if(!image)return;
  if(index===0||isReduced())image.style.transform='none';
  else{const phase=clamp((fp-(index===1?.22:.56))/(index===1?.48:.44));image.style.transform=`translate3d(0,${(1.5-phase*3).toFixed(3)}%,0) scale(${(1.01+phase*.05).toFixed(5)})`;}
 });
 if(fleetPosition)fleetPosition.textContent=`${activeIndex+1} / ${fleetScenes.length}`;
 fleetSegments.forEach((segment,index)=>{segment.style.setProperty('--fleet-segment-progress',String(clamp(fp*3-index)));segment.dataset.active=String(index===activeIndex);});
 root.dataset.fleetProgress=fp.toFixed(5);root.dataset.nativeFleetProgress=nativeFleetProgress.toFixed(5);root.dataset.fleetMotionFrames=String(++fleetRenderCount);root.dataset.fleetMotionState=fleetCursor.snapshot().active?'active':'idle';root.dataset.fleetMotionClock=JSON.stringify(fleetCursor.snapshot());
}
function renderChapters(force=false){const p=cursor.snapshot().value,fp=fleetCursor.snapshot().value;if(force||p!==lastStoryProgress){render(p);lastStoryProgress=p;}if(force||fp!==lastFleetProgress){renderFleet(fp);lastFleetProgress=fp;}renderGround(p,fp);}
function updateOutside(){const r=story.getBoundingClientRect(),h=innerHeight;const visible=r.bottom>0&&r.top<h;const hideDock=r.bottom>h*.2||lastCall.getBoundingClientRect().top<h*.85;dock.classList.toggle('dock-hidden',hideDock);dock.inert=hideDock;dock.setAttribute('aria-hidden',String(hideDock));const rb=reviewsHost.getBoundingClientRect();reviewVisible=rb.top<h&&rb.bottom>0&&!document.hidden;if(!review&&!reviewStarting&&rb.top<h*1.4&&rb.bottom>-100){reviewStarting=true;import('./reviews.mjs').then(({mountReviews})=>{review=mountReviews({host:reviewsHost,canvas:document.querySelector('#reviews-canvas'),reducedMotion:isReduced()});review.setVisible(reviewVisible);}).catch(()=>{});}review?.setVisible(reviewVisible);return visible;}
function sample(event){
 const b=story.getBoundingClientRect(),headerHeight=Math.max(0,header?.getBoundingClientRect().height||0);nativeProgress=clamp(-b.top/Math.max(1,b.height-innerHeight));storyVisible=updateOutside();
 const fleetBounds=fleet?.getBoundingClientRect();nativeFleetProgress=fleetBounds?clamp((headerHeight-fleetBounds.top)/Math.max(1,fleetBounds.height-innerHeight+headerHeight)):0;fleetVisible=Boolean(fleetBounds&&fleetBounds.bottom>headerHeight&&fleetBounds.top<innerHeight);
 const force=!event||event.type!=='scroll';
 if(isReduced()||document.hidden||(!storyVisible&&!fleetVisible)){if(raf)cancelAnimationFrame(raf);raf=0;cursor.snap(nativeProgress);fleetCursor.snap(nativeFleetProgress);renderChapters(force);return;}
 if(storyVisible)cursor.setTarget(nativeProgress);else cursor.snap(nativeProgress);
 if(fleetVisible)fleetCursor.setTarget(nativeFleetProgress);else fleetCursor.snap(nativeFleetProgress);
 // A chapter leaving the viewport is rendered once at its settled endpoint;
 // its cursor stays inert while the other chapter uses the same RAF owner.
 renderChapters(force);
 if((storyVisible&&cursor.snapshot().active)||(fleetVisible&&fleetCursor.snapshot().active)){if(!raf)raf=requestAnimationFrame(tick);}
}
function tick(time){raf=0;if(document.hidden)return;if(storyVisible)cursor.step(time);if(fleetVisible)fleetCursor.step(time);renderChapters();if((storyVisible&&cursor.snapshot().active)||(fleetVisible&&fleetCursor.snapshot().active))raf=requestAnimationFrame(tick);}
function pauseFilm(){film.pause();filmOn=false;film.style.opacity='0';filmButton.textContent=copy[currentLanguage].playFilm;}
async function playFilm(){try{filmOn=true;film.style.opacity='1';await film.play();filmButton.textContent=copy[currentLanguage].pauseFilm;}catch{pauseFilm();}}
filmButton.addEventListener('click',()=>filmOn?pauseFilm():playFilm());film.addEventListener('ended',pauseFilm);
for(const b of document.querySelectorAll('[data-lang]'))b.addEventListener('click',()=>language(b.dataset.lang));
for(const event of ['scroll','resize','pageshow'])addEventListener(event,sample,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseFilm();sample();});reduced.addEventListener('change',()=>{if(isReduced())pauseFilm();sample();});
addEventListener('pagehide',event=>{pauseFilm();if(!event.persisted){if(raf)cancelAnimationFrame(raf);review?.dispose();}});
document.querySelector('#year').textContent=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Sofia'}).format(new Date());let preferred='bg';try{preferred=localStorage.getItem('zeleni-site-language')||'bg';}catch{}language(preferred);renderChapters(true);
