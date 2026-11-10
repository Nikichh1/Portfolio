import { copy } from './copy.mjs';

const root = document.documentElement;
const story = document.querySelector('.drive-story');
const host = document.querySelector('.scene-host');
const canvas = document.getElementById('drive-canvas');
const driveActions = document.querySelector('.drive-actions');
const reviewsHost = document.getElementById('reviews');
const reviewsCanvas = document.getElementById('reviews-canvas');
const about = document.getElementById('zeleni');
const phone = document.querySelector('.phone-scene');
const dock = document.querySelector('.mobile-dock');
const lastCall = document.querySelector('.last-call');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = value => Math.max(0,Math.min(1,value));
const smooth = value => { const t=clamp(value); return t*t*(3-2*t); };
let queued = false;
let scene = null;
let desiredProgress = 0;
let desiredDarkness = 0;
let sceneVisible = true;
let previousSurface = '';
let lastSceneProgress = NaN;
let lastSceneDarkness = NaN;
let lastSceneVisible = null;
let reviews = null;
let reviewsStarting = false;
let reviewsVisible = false;
let lastReviewsVisible = null;

function setLanguage(language) {
  const lang = language === 'en' ? 'en' : 'bg';
  const text = copy[lang];
  root.lang = lang;
  document.title = text.title;
  document.querySelector('meta[name="description"]').content = text.description;
  document.querySelector('meta[property="og:title"]').content = text.title;
  document.querySelector('meta[property="og:description"]').content = text.description;
  for (const el of document.querySelectorAll('[data-i18n]')) if(text[el.dataset.i18n])el.textContent=text[el.dataset.i18n];
  for (const el of document.querySelectorAll('[data-i18n-aria]')) if(text[el.dataset.i18nAria])el.setAttribute('aria-label',text[el.dataset.i18nAria]);
  for (const el of document.querySelectorAll('[data-i18n-alt]')) if(text[el.dataset.i18nAlt])el.alt=text[el.dataset.i18nAlt];
  for (const el of document.querySelectorAll('[data-lang]')) el.setAttribute('aria-pressed',String(el.dataset.lang===lang));
  try { localStorage.setItem('zeleni-site-language',lang); } catch { /* The language switch does not depend on storage. */ }
  queueFrame();
}
let preferredLanguage = 'bg';
try { preferredLanguage=localStorage.getItem('zeleni-site-language')||'bg'; } catch { /* Storage is optional. */ }
setLanguage(preferredLanguage);
for (const button of document.querySelectorAll('[data-lang]'))button.addEventListener('click',()=>setLanguage(button.dataset.lang));
document.getElementById('year').textContent=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Sofia'}).format(new Date());

function applyBackground(darkness) {
  const rgb=[246-241*darkness,247-241*darkness,242-237*darkness].map(Math.round);
  const surface=`rgb(${rgb.join(',')})`;
  if (surface===previousSurface)return;
  previousSurface=surface;
  const luminance=rgb.map(value=>{const s=value/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
  const crossing=darkness>.1&&darkness<.9;
  const ink=crossing?(luminance>.179?'#000000':'#ffffff'):(darkness<.5?'#121710':'#f6f7f2');
  root.style.setProperty('--surface',surface);
  root.style.setProperty('--ink',ink);
  root.style.setProperty('--muted',crossing?ink:(darkness<.5?'#4c5548':'#bfc6b9'));
  root.style.setProperty('--accent',crossing?ink:(darkness<.5?'#526b23':'#b5e447'));
  root.style.setProperty('--line',crossing?(luminance>.179?'#73796d':'#6b7067'):(darkness<.5?'#cfd5c8':'#30372d'));
  root.style.colorScheme=darkness>.75?'dark':'light';
  root.dataset.darkness=darkness.toFixed(3);
  document.querySelector('meta[name="theme-color"]').content=surface;
}

function renderFrame() {
  queued=false;
  const viewport=innerHeight;
  const bounds=story.getBoundingClientRect();
  const track=Math.max(1,bounds.height-viewport);
  const progress=clamp(-bounds.top/track);
  const enter=smooth((progress-.08)/.5);
  const leave=smooth((viewport*.85-about.getBoundingClientRect().top)/(viewport*.9));
  const darkness=reduced.matches?0:enter*(1-leave);
  desiredProgress=progress;
  desiredDarkness=darkness;
  applyBackground(darkness);
  root.style.setProperty('--story-progress',reduced.matches?'0':progress.toFixed(4));
  root.style.setProperty('--hero-opacity',reduced.matches?'1':(1-smooth((progress-.08)/.3)).toFixed(4));
  const opacity=reduced.matches?1:1-smooth((progress-.84)/.16);
  root.style.setProperty('--scene-opacity',opacity.toFixed(4));
  sceneVisible=bounds.bottom>0&&bounds.top<viewport&&!document.hidden&&opacity>.001;
  if(scene){
    if(progress!==lastSceneProgress||darkness!==lastSceneDarkness){scene.setProgress(progress,darkness);lastSceneProgress=progress;lastSceneDarkness=darkness;}
    if(sceneVisible!==lastSceneVisible){scene.setVisible(sceneVisible);lastSceneVisible=sceneVisible;}
  }
  const reviewsBounds=reviewsHost?.getBoundingClientRect();
  reviewsVisible=Boolean(reviewsBounds&&reviewsBounds.top<viewport&&reviewsBounds.bottom>0&&!document.hidden);
  if(reviewsBounds&&!reviews&&!reviewsStarting&&reviewsBounds.top<viewport*1.4&&reviewsBounds.bottom>-100)startReviews();
  if(reviews&&reviewsVisible!==lastReviewsVisible){reviews.setVisible(reviewsVisible);lastReviewsVisible=reviewsVisible;}
  if(!reduced.matches){
    const phoneBounds=phone.getBoundingClientRect();
    const amount=clamp((viewport-phoneBounds.top)/(viewport+phoneBounds.height));
    phone.style.setProperty('--phone-y',`${(70-amount*110).toFixed(1)}px`);
    phone.style.setProperty('--phone-rotate',`${(-8+amount*9).toFixed(2)}deg`);
    phone.style.setProperty('--phone-tilt',`${(12-amount*13).toFixed(2)}deg`);
  }
  const actionBounds=driveActions?.getBoundingClientRect();
  const openingActionsVisible=Boolean(actionBounds&&actionBounds.top>=90&&actionBounds.bottom<=viewport);
  const dockHidden=openingActionsVisible||lastCall.getBoundingClientRect().top<viewport*.85;
  dock.classList.toggle('dock-hidden',dockHidden);
  dock.inert=dockHidden;
  dock.setAttribute('aria-hidden',String(dockHidden));
}
function queueFrame(){if(!queued){queued=true;requestAnimationFrame(renderFrame);}}
addEventListener('scroll',queueFrame,{passive:true});
addEventListener('resize',queueFrame,{passive:true});
addEventListener('pageshow',queueFrame);
document.addEventListener('visibilitychange',queueFrame);
reduced.addEventListener('change',queueFrame);
renderFrame();

async function startScene(){
  root.dataset.scene='loading';
  try{
    const {mountScene}=await import('./scene.mjs');
    scene=await mountScene({canvas,host,onReady(){root.dataset.scene='ready';},onError(){root.dataset.scene='fallback';}});
    if(scene){scene.setProgress(desiredProgress,desiredDarkness);scene.setVisible(sceneVisible);lastSceneProgress=desiredProgress;lastSceneDarkness=desiredDarkness;lastSceneVisible=sceneVisible;}
    else root.dataset.scene='fallback';
  }catch{root.dataset.scene='fallback';}
}
startScene();
async function startReviews(){
  reviewsStarting=true;
  try{
    const {mountReviews}=await import('./reviews.mjs');
    reviews=mountReviews({canvas:reviewsCanvas,host:reviewsHost,reducedMotion:reduced});
    reviews.setVisible(reviewsVisible);lastReviewsVisible=reviewsVisible;
  }catch{ /* The review link and original Google mark work without the decoration. */ }
}
addEventListener('pagehide',event=>{if(!event.persisted){scene?.dispose();reviews?.dispose();scene=null;reviews=null;}});
