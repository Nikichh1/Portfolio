const EMPTY=Object.freeze({type:'FeatureCollection',features:[]});
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
const TILE_NAMES=new Set(Array.from({length:3},(_,x)=>Array.from({length:3},(_,y)=>`tiles/14/${9317+x}/${6072+y}.pbf`)).flat());
const ASSET_NAMES=new Set(['tilejson.json','route.json','environment.geojson','canopy.geojson','model.glb','build/map-worker.js','build/building-mesh-worker.js','build/building-shadow-worker.js']);

/** One arc-length clock through the visible scene and handoff. Only local C2
 * street fillets alter the displayed line; route.json and its real goal stay exact. */
export function createNativeRouteTrack(geometry){
 if(!Array.isArray(geometry)||geometry.length<4||geometry.some(point=>!Array.isArray(point)||point.length<2||!point.slice(0,2).every(Number.isFinite)))throw new TypeError('A finite demonstration route is required');
 const source=geometry.map(([lat,lng])=>({lat,lng})),startIndex=Math.floor(.08*(source.length-2)),origin=source[startIndex],scaleX=111320*Math.cos(origin.lat*Math.PI/180),length=60;
 const metric=p=>({x:(p.lng-origin.lng)*scaleX,y:(p.lat-origin.lat)*111320}),geo=p=>({lng:origin.lng+p.x/scaleX,lat:origin.lat+p.y/111320}),points=source.map(metric),sourceDistances=[0],parts=[],fillets=[];
 const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}),add=(a,b)=>({x:a.x+b.x,y:a.y+b.y}),mul=(a,k)=>({x:a.x*k,y:a.y*k}),norm=a=>Math.hypot(a.x,a.y),mix=(a,b,t)=>add(mul(a,1-t),mul(b,t)),angle=a=>Math.atan2(a.x,a.y)*180/Math.PI,wrap=a=>(a+540)%360-180;
 for(let i=1;i<points.length;i++)sourceDistances.push(sourceDistances.at(-1)+norm(sub(points[i],points[i-1])));
 if(sourceDistances.at(-1)-sourceDistances[startIndex]<length)throw new TypeError('The static route must contain the full visible demonstration');
 const bezier=(control,t)=>{let row=control;while(row.length>1)row=row.slice(1).map((p,i)=>mix(row[i],p,t));return row[0];};
 let cursor=points[0],total=0,start=0,lastHeading;
 function append(kind,control,meta=null){
  const derivative=kind==='line'?[sub(control[1],control[0])]:control.slice(1).map((p,i)=>mul(sub(p,control[i]),5)),second=kind==='line'?[]:derivative.slice(1).map((p,i)=>mul(sub(p,derivative[i]),4));
  const table=[{t:0,distance:0}],steps=kind==='line'?1:192;let previous=control[0];
  for(let i=1;i<=steps;i++){const t=i/steps,point=kind==='line'?mix(control[0],control[1],t):bezier(control,t);table.push({t,distance:table.at(-1).distance+norm(sub(point,previous))});previous=point;}
  const partLength=table.at(-1).distance;if(partLength<1e-9)return;
  const rawStart=angle(derivative[0]),headingStart=lastHeading===undefined?rawStart:lastHeading+wrap(rawStart-lastHeading),endTangent=derivative.at(-1);lastHeading=headingStart+wrap(angle(endTangent)-headingStart);
  parts.push({kind,control,derivative,second,table,start:total,end:total+partLength,length:partLength,headingStart,meta});total+=partLength;cursor=control.at(-1);
 }
 const lineTo=p=>append('line',[cursor,p]);
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],incoming=sub(b,a),outgoing=sub(c,b),inLength=norm(incoming),outLength=norm(outgoing),turn=wrap(angle(outgoing)-angle(incoming)),trim=Math.min(4,inLength*.45,outLength*.45);
  if(i>startIndex&&sourceDistances[i]-sourceDistances[startIndex]<=length+8&&Math.abs(turn)>.05&&trim>.1){
   const u=mul(incoming,1/inLength),v=mul(outgoing,1/outLength),entry=add(b,mul(u,-trim)),exit=add(b,mul(v,trim));lineTo(entry);
   const control=[entry,add(entry,mul(u,trim*.4)),add(entry,mul(u,trim*.8)),add(exit,mul(v,-trim*.8)),add(exit,mul(v,-trim*.4)),exit],meta={sourceIndex:i,sourceDistance:sourceDistances[i]-sourceDistances[startIndex],turnDegrees:turn,trimMetres:trim};
   append('curve',control,meta);fillets.push({...meta,start:parts.at(-1).start,end:parts.at(-1).end,control});
  }else lineTo(b);
  if(i===startIndex)start=total;
 }
 lineTo(points.at(-1));
 let headingOffset=0;
 function position(distance){
  const d=Math.max(0,Math.min(total,distance));let lo=0,hi=parts.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(parts[mid].end<=d)lo=mid+1;else hi=mid;}
  const part=parts[lo],local=Math.max(0,Math.min(part.length,d-part.start));let t;
  if(part.kind==='line')t=local/part.length;else{let a=0,b=part.table.length-1;while(a+1<b){const mid=(a+b)>>1;if(part.table[mid].distance<local)a=mid;else b=mid;}const from=part.table[a],to=part.table[b];t=from.t+(to.t-from.t)*(local-from.distance)/Math.max(1e-12,to.distance-from.distance);}
  const point=part.kind==='line'?mix(part.control[0],part.control[1],t):bezier(part.control,t),tangent=part.kind==='line'?part.derivative[0]:bezier(part.derivative,t),acceleration=part.kind==='line'?{x:0,y:0}:bezier(part.second,t),heading=part.headingStart+wrap(angle(tangent)-part.headingStart)-headingOffset,speed=norm(tangent),curvature=(tangent.x*acceleration.y-tangent.y*acceleration.x)/Math.max(1e-12,speed**3);
  return {pose:{...geo(point),heading},metric:point,curvature,partIndex:lo,partT:t};
 }
 const rawInitial=position(start).pose;headingOffset=360*Math.round((rawInitial.heading-angle(sub(points[startIndex+1],points[startIndex])))/360);
 const initial=position(start).pose,bearing=35,endpoint={...source.at(-1)};
 const mercator=p=>({x:(p.lng+180)/360,y:(1-Math.log(Math.tan(p.lat*Math.PI/180)+1/Math.cos(p.lat*Math.PI/180))/Math.PI)/2});
 function project(point,camera,width,height){
  const a=mercator(point),b=mercator({lng:camera.center[0],lat:camera.center[1]}),world=512*2**camera.zoom,dx=(a.x-b.x)*world,dy=(a.y-b.y)*world,r=camera.bearing*Math.PI/180,x=dx*Math.cos(r)+dy*Math.sin(r),y=-dx*Math.sin(r)+dy*Math.cos(r),pitch=camera.pitch*Math.PI/180,focal=height*1.5,denominator=focal-y*Math.sin(pitch);
  return denominator<=0?{x:Infinity,y:Infinity}:{x:width/2+x*focal/denominator,y:height/2+y*Math.cos(pitch)*focal/denominator};
 }
 function overview(frame){
  return {zoom:19.55,pitch:58,bearing,reference:{width:Math.max(1,Number(frame?.width)||1200),height:Math.max(1,Number(frame?.height)||800)},scope:'restrained local route context',actualEndpoint:{...endpoint},actualEndpointClaimedVisible:false};
 }
 function sample(value,width=1200,frame={width,height:800}){
  const p=clamp(value),distance=length*p,state=position(start+distance),pullback=p>=.6?1:smooth((p-.15)/.45),end=overview(frame),zoom=20.45,focus=position(start+distance+2*smooth(p/.15)).pose,camera={center:[focus.lng,focus.lat],zoom:zoom+(end.zoom-zoom)*pullback,pitch:58,bearing,padding:{top:0,bottom:0,left:0,right:0}};
  const turns=fillets.filter(f=>Math.abs(f.turnDegrees)>45).map(f=>({distance:(f.start+f.end)/2-start,degrees:f.turnDegrees,progress:clamp((start+distance-f.start)/(f.end-f.start))}));
  return {pose:state.pose,camera,distance,length,start,phase:'continuous-scroll',speedMetresPerProgress:length,curvature:state.curvature,overviewProgress:pullback,endpoint:{...endpoint},overview:end,turns,turnProgress:turns.reduce((sum,turn)=>sum+turn.progress,0)/Math.max(1,turns.length)};
 }
 const displayed=[];for(const part of parts)for(let i=0;i<part.table.length;i++){if(displayed.length&&i===0)continue;const t=part.table[i].t,p=part.kind==='line'?mix(part.control[0],part.control[1],t):bezier(part.control,t),g=geo(p);displayed.push([g.lat,g.lng]);}
 const displayStart=geo(points[0]),displayEnd=source.at(-1);displayed[0]=[displayStart.lat,displayStart.lng];displayed[displayed.length-1]=[displayEnd.lat,displayEnd.lng];
 return {sample,positionAtDistance:distance=>position(start+distance),length,start,geometry:displayed,sourceGeometry:geometry,sourceEndpoint:endpoint,bearing,fillets,parts,overview,project};
}

/**
 * Native-resolution presentation of the application's unchanged MapScene.
 * The caller owns progress/easing/RAF. This adapter never starts a movie or an
 * independent camera loop. Native tile/geometry preparation paints finitely.
 * Include native/maplibre.css on the page before mounting.
 */
export async function mountNativePresentation({host,assetBase=new URL('./',import.meta.url),reducedMotion}={}){
 if(!host?.ownerDocument)throw new TypeError('A connected native presentation host is required');
 const doc=host.ownerDocument,win=doc.defaultView||window,base=new URL(assetBase,location.href);
 if(base.origin!==location.origin||base.username||base.password||base.search||base.hash)throw new Error('Native assets must use one same-origin directory');
 if(!base.pathname.endsWith('/'))base.pathname+='/';
 const asset=name=>new URL(name,base).href;
 const resolveStatic=url=>{const resolved=new URL(url,location.href);if(resolved.origin!==base.origin||resolved.username||resolved.password||resolved.search||resolved.hash||!resolved.pathname.startsWith(base.pathname))throw new Error('Native presentation rejects external or decorated assets');return resolved;};
 const nativePath=url=>{const resolved=resolveStatic(url),name=resolved.pathname.slice(base.pathname.length);if(!ASSET_NAMES.has(name)&&!TILE_NAMES.has(name)){host.dataset.nativeRejectedAsset=name.slice(0,200);throw new Error(`Native presentation rejects unknown static asset: ${name.slice(0,200)}`);}return resolved.href;};
 const fetchAbort=new AbortController();
 const fetchStatic=async name=>{const url=nativePath(asset(name)),response=await fetch(url,{credentials:'omit',cache:'force-cache',signal:fetchAbort.signal});if(!response.ok)throw new Error(`Native asset unavailable: ${name}`);return response.json();};
 const globalAssetBefore=globalThis.zeleniAssetUrl;
 const assetResolver=path=>{const name=path==='/models/passenger-hyundai-ioniq.glb'?'model.glb':path==='/shared/maps/map-worker.js'?'build/map-worker.js':path==='/shared/maps/building-mesh-worker.js'?'build/building-mesh-worker.js':path==='/shared/maps/building-shadow-worker.js'?'build/building-shadow-worker.js':null;if(!name)throw new Error('Native presentation rejects an unknown engine asset');return asset(name);};
 globalThis.zeleniAssetUrl=assetResolver;
 const query=typeof reducedMotion==='object'&&reducedMotion?reducedMotion:win.matchMedia('(prefers-reduced-motion: reduce)');
 const isReduced=()=>reducedMotion===true||query.matches===true;
 let disposed=false,requestedVisible=true,progress=0,scene,map,renderFrames=0,lastWidth=0,lastHeight=0,lastDpr=0,ready=false,readinessTimer=0,resolveReady,rejectStart,repaintBudget=0,repaintUntil=0,suppressedRepaints=0,asyncRepaints=0,ownerRepaints=0,originalTrigger=null,preparedMask=0,openingWidth=0,overviewReference=null,lastPreparation=null,worldRefreshOriginal=null,worldRefreshObserved=null,worldRefreshLayer=null,reporting=false;
 const sourceContent=new Set(),clock=()=>win.performance?.now?.()??performance.now();
 const whenReady=new Promise(resolve=>{resolveReady=resolve;});
 const startDeadline=new Promise((resolve,reject)=>{rejectStart=reject;});
 const nativeRatio=()=>{
  const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
  const desktopCap=2-.75*smooth((width-450)/550);
  const cap=width<=700?Math.min(1.65,desktopCap):desktopCap;
  const raw=Math.min(win.devicePixelRatio||1,cap,Math.sqrt(2000000/(width*height)));
  return Math.max(1,Math.floor(raw*20+1e-9)/20);
 };
 const ratioBudget={ratio:nativeRatio,ceiling:nativeRatio,syncNative:nativeRatio,restore:nativeRatio,sample:nativeRatio};
 const effectiveVisible=()=>requestedVisible&&!doc.hidden&&!disposed;
 const transformRequest=url=>{if(url.startsWith('/site/native/'))url=asset(url.slice('/site/native/'.length));const resolved=resolveStatic(url),name=resolved.pathname.slice(base.pathname.length),virtual=/^tiles\/(1[5-9]|2[0-2])\/(\d+)\/(\d+)\.pbf$/.exec(name);if(virtual){const z=Number(virtual[1]),x=Number(virtual[2]),y=Number(virtual[3]),factor=2**(z-14),parent=`tiles/14/${Math.floor(x/factor)}/${Math.floor(y/factor)}.pbf`;if(TILE_NAMES.has(parent)){host.dataset.nativeVirtualTile=name;return {url:resolved.href};}}return {url:nativePath(url)};};
 function restoreResolver(){if(globalThis.zeleniAssetUrl===assetResolver){if(globalAssetBefore===undefined)delete globalThis.zeleniAssetUrl;else globalThis.zeleniAssetUrl=globalAssetBefore;}}
 function dispose(){if(disposed)return;disposed=true;clearTimeout(readinessTimer);if(worldRefreshLayer?.refresh===worldRefreshObserved)worldRefreshLayer.refresh=worldRefreshOriginal;fetchAbort.abort();doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('resize',windowResize);query.removeEventListener?.('change',preference);if(map&&originalTrigger)map.triggerRepaint=originalTrigger;scene?.destroy();restoreResolver();host.dataset.nativeStatus=host.dataset.nativeState='disposed';if(!ready)resolveReady({state:'disposed'});}
 function fallback(){if(disposed)return;if(!ready)resolveReady({state:'fallback'});rejectStart(new Error('Native presentation could not be prepared'));dispose();host.dataset.nativeReady='false';host.dataset.nativeStatus=host.dataset.nativeState='fallback';host.dispatchEvent(new win.CustomEvent('presentation-fallback',{detail:{state:'fallback'}}));}
 function armReadinessDeadline(){clearTimeout(readinessTimer);readinessTimer=0;if(!ready&&effectiveVisible())readinessTimer=setTimeout(fallback,20000);}
 function snapshot(){const canvas=map?.getCanvas();return {progress,reducedMotion:isReduced(),visible:effectiveVisible(),ready,modelReady:Boolean(scene?.modelReady),frames:renderFrames,canvas:canvas?[canvas.width,canvas.height]:[0,0],css:[host.clientWidth,host.clientHeight],dpr:map?.getPixelRatio?.()||0,preparation:lastPreparation?{...lastPreparation}:null,camera:host.dataset.nativeCamera?JSON.parse(host.dataset.nativeCamera):null,routeDistance:Number(host.dataset.nativeRouteDistance)||0,routeLength:Number(host.dataset.nativeRouteLength)||0,turnProgress:Number(host.dataset.nativeTurnProgress)||0};}
 function repaintDiagnostics(){host.dataset.nativeRepaintBudget=String(repaintBudget);host.dataset.nativeSuppressedRepaints=String(suppressedRepaints);host.dataset.nativeAsyncRepaints=String(asyncRepaints);host.dataset.nativeOwnerRepaints=String(ownerRepaints);host.dataset.nativeSourceAdmissions=String(sourceContent.size);}
 function admit(){repaintBudget=180;repaintUntil=clock()+700;repaintDiagnostics();}
 function admitOwner(){ownerRepaints++;preparedMask=0;admit();}
 function admitPrepared(){let mask=0;for(const [i,layer]of [scene?.worldMaterials,scene?.buildingMaterials,scene?.buildingShadows,scene?.bridgeRoads].entries())if(layer?.isPrepared?.()??true)mask|=1<<i;const newlyPrepared=mask&~preparedMask;preparedMask|=mask;if(ready&&newlyPrepared){asyncRepaints++;admit();}}
 function admitSource(event){if(!event?.sourceId||!['content','metadata'].includes(event.sourceDataType))return;const tile=event.tile?.tileID||event.coord,key=[event.sourceId,event.sourceDataType,tile?.key??[tile?.overscaledZ,tile?.canonical?.z,tile?.canonical?.x,tile?.canonical?.y].join('/'),event.isSourceLoaded===true].join(':');if(sourceContent.has(key))return;sourceContent.add(key);if(ready){preparedMask=0;asyncRepaints++;admit();originalTrigger?.();}}
 // Shadow preparation reconciles admitted source/caster coverage. Ask every
 // real layer eagerly on an existing report; a short-circuited material check
 // can otherwise leave that reconciliation unobserved. No new render loop.
 function readPreparation(){return {shadows:scene?.buildingShadows?.isPrepared?.()??true,bridge:scene?.bridgeRoads?.isPrepared?.()??true,world:scene?.worldMaterials?.isPrepared?.()??true,buildings:scene?.buildingMaterials?.isPrepared?.()??true};}
 function observeWorldPreparation(){
  const layer=scene?.worldMaterials;if(typeof layer?.refresh!=='function')return;worldRefreshLayer=layer;worldRefreshOriginal=layer.refresh;
  // The engine's existing140ms scheduler calls this.refresh(). Its unchanged
  // selection fast path can clear dirty coverage without asking for a frame.
  // Observe that real completion; do not force new refreshes or poll for it.
  worldRefreshObserved=function(...args){const value=worldRefreshOriginal.apply(this,args);if(!disposed&&!ready&&!reporting&&effectiveVisible()&&originalTrigger){const wasPrepared=lastPreparation?.world===true;report();if(!wasPrepared&&lastPreparation?.world===true)originalTrigger();}return value;};layer.refresh=worldRefreshObserved;
 }
 function report(){if(disposed||reporting)return;reporting=true;try{lastPreparation=readPreparation();const state=snapshot();host.dataset.nativePreparation=JSON.stringify(state.preparation);host.dataset.nativeProgress=progress.toFixed(5);host.dataset.nativeModelReady=String(state.modelReady);host.dataset.nativeFrames=String(renderFrames);host.dataset.nativeCanvas=JSON.stringify(state.canvas);host.dataset.nativeCss=JSON.stringify(state.css);host.dataset.nativeDpr=String(state.dpr);host.dataset.nativeVisible=String(state.visible);host.dataset.nativeReduced=String(state.reducedMotion);host.dataset.nativeLampMode='approved night vehicle lenses and ground lamp spill';if(!ready&&host.dataset.nativeRejectedAsset){fallback();return;}const geometryReady=Boolean(scene?.hasGeography?.()&&map.isSourceLoaded('building-details')&&Object.values(lastPreparation).every(Boolean));if(!ready&&state.modelReady&&geometryReady){ready=true;admit();clearTimeout(readinessTimer);host.dataset.nativeReady='true';const detail={...state,ready:true,geometryReady:true};resolveReady(detail);host.dispatchEvent(new win.CustomEvent('presentation-ready',{detail}));}host.dataset.nativeStatus=host.dataset.nativeState=ready?'ready':'loading';repaintDiagnostics();}finally{reporting=false;}}
 let routeTrack;
 function referenceFrame(refresh=false){let declared;try{declared=JSON.parse(host.dataset.presentationViewport||'null');}catch{}if(Array.isArray(declared)&&declared.length===2&&declared.every(value=>Number.isFinite(value)&&value>0&&value<=16384)){if(!overviewReference||overviewReference.width!==declared[0]||overviewReference.height!==declared[1])overviewReference={width:declared[0],height:declared[1]};}else if(refresh||!overviewReference)overviewReference={width:Math.max(1,host.clientWidth),height:Math.max(1,host.clientHeight)};return overviewReference;}
 function paint(){if(!map||disposed||!effectiveVisible())return;admitOwner();if(!openingWidth)openingWidth=Math.max(1,host.clientWidth);const sample=routeTrack.sample(isReduced()?0:progress,openingWidth,referenceFrame()),{pose,camera}=sample;scene.pose={...pose};scene.targetPose={...pose};scene.cameraSpeed=0;scene.follow=false;scene.routeMotion?.setPose(scene.pose);scene.renderPose();map.jumpTo(camera,{passengerFollowFrame:true});map.triggerRepaint();host.dataset.nativeCamera=JSON.stringify(camera);host.dataset.nativePose=JSON.stringify(pose);host.dataset.nativeRouteDistance=sample.distance.toFixed(3);host.dataset.nativeRouteLength=sample.length.toFixed(3);host.dataset.nativeTurnProgress=sample.turnProgress.toFixed(5);host.dataset.nativeRouteTurns=JSON.stringify(sample.turns);host.dataset.nativeOverview=JSON.stringify({progress:sample.overviewProgress,reference:overviewReference,endpoint:sample.endpoint,fit:sample.overview});report();}
 function resize(force=false){if(!map||disposed)return;const width=host.clientWidth,height=host.clientHeight,dpr=nativeRatio();if(width===lastWidth&&height===lastHeight&&dpr===lastDpr)return;if(!force&&Math.abs(width-lastWidth)<8&&Math.abs(height-lastHeight)<8&&dpr===lastDpr)return;lastWidth=width;lastHeight=height;lastDpr=dpr;if(map.getPixelRatio()!==dpr)map.setPixelRatio(dpr);scene.appliedPixelRatio=dpr;scene.resizeApproved();if(effectiveVisible())paint();else report();}
 function visibility(){if(disposed)return;armReadinessDeadline();if(!scene)return;scene.setCovered(!effectiveVisible());map?.stop();if(effectiveVisible()){resize(true);paint();}else{scene.suspend();report();}}
 function windowResize(){referenceFrame(true);if(progress===0)openingWidth=Math.max(1,host.clientWidth);resize(true);}
 function preference(){paint();}
 doc.addEventListener('visibilitychange',visibility);win.addEventListener('resize',windowResize);query.addEventListener?.('change',preference);armReadinessDeadline();
 try{
  const route=await Promise.race([fetchStatic('route.json'),startDeadline]);routeTrack=createNativeRouteTrack(route.geometry);
  const config={vector_url:asset('tilejson.json'),direct_osm_tiles_url:asset('tilejson.json'),building_tiles_url:asset('tilejson.json'),glyphs_url:asset('unused-glyphs/')+'{fontstack}/{range}.pbf',building_source_layer:'building',environment_url:asset('environment.geojson'),canopy_url:asset('canopy.geojson'),road_structures_url:asset('empty.geojson'),center:[24.749631,42.141017],bounds:[[24.72,42.12],[24.78,42.17]],exploration_bounds:[[24.72,42.12],[24.78,42.17]],development:true};
  const request=async url=>{if(url==='/api/public/config')return {active_ride_map:config};if(url==='/api/public/map/building-overrides'||url===config.road_structures_url)return EMPTY;if(url===config.environment_url)return fetchStatic('environment.geojson');if(url===config.canopy_url)return fetchStatic('canopy.geojson');throw new Error('Native static adapter rejects an unknown endpoint');};
  const [{MapScene},{navigationStyle}]=await Promise.race([Promise.all([import('./build/native-engine.js'),import('./build/native-style.js')]),startDeadline]);
  class NativePresentationScene extends MapScene{
   updateSceneAppearance(){this.sceneMaterialWeight=0;return 0;}
   async start(replacement=null){this.rasterBudget=ratioBudget;const style=navigationStyle(config,{appearance:'passenger-ride',themeWeight:0});style.layers=style.layers.filter(layer=>layer.type!=='symbol');for(const source of Object.values(style.sources))if(source.type==='vector'){source.minzoom=14;source.maxzoom=14;}const result=await super.start({config,view:{...(replacement?.view||{}),style,transformRequest,interactive:false,zoomLevelsToOverscale:4}});this.dataRefresh?.stop();this.dataRefresh=null;return result;}
   addLayers(){super.addLayers();for(const layer of this.map.getStyle().layers)if(layer.type==='symbol')this.map.removeLayer(layer.id);}
   scheduleRasterRestore(){}
   resize(){if(!this.map||!this.loaded)return super.resize();return resize(false);}
   resizeApproved(){return super.resize();}
  }
  host.dataset.nativeAdapterVersion='v11-oblique-stable-plane-20261110-1';host.dataset.nativeReady='false';host.dataset.nativeStatus=host.dataset.nativeState='loading';
  scene=new NativePresentationScene(host,{appearance:'passenger-ride',mode:'navigation',theme:'dark',displayMode:'3d',displayPreferenceKey:'zeleni-site-native-display-only',qualityPreference:'ultra',center:[42.141017,24.749631],zoom:20,request});
  await Promise.race([scene.ready,startDeadline]);
  if(!scene.map)throw new Error('Native 3D is unavailable');map=scene.map;
  observeWorldPreparation();originalTrigger=map.triggerRepaint.bind(map);map.triggerRepaint=function(){if(!effectiveVisible())return map;admitPrepared();const blending=scene.cityDetailBlend?.moving===true;if(ready&&(clock()>repaintUntil||repaintBudget<=0&&!blending)){suppressedRepaints++;repaintDiagnostics();return map;}return originalTrigger();};
  map.setMaxZoom(22);map.setMaxPitch(62);map.stop();scene.follow=false;scene.setRoute(routeTrack.geometry);scene.setTarget?.(route.dropoff,{kind:'dropoff',label:'Plovdiv Plaza'});host.dataset.nativeDestination=JSON.stringify({lat:route.dropoff.lat,lng:route.dropoff.lng,label:'Plovdiv Plaza',example:true});scene.mode='navigation';scene.applyRouteMaterial();host.dataset.nativeVectorSources=JSON.stringify(Object.fromEntries(Object.entries(map.getStyle().sources).filter(([,source])=>source.type==='vector').map(([id,source])=>[id,{type:source.type,url:source.url,minzoom:source.minzoom,maxzoom:source.maxzoom}])));
  map.dragPan.disable();map.scrollZoom.disable();map.boxZoom.disable();map.dragRotate.disable();map.keyboard.disable();map.doubleClickZoom.disable();map.touchZoomRotate.disable();map.touchPitch.disable();
  map.getCanvas().setAttribute('aria-label','Примерен маршрут с реалния 3D автомобил на Зелени такси');map.getCanvas().setAttribute('role','img');map.getCanvas().tabIndex=-1;map.getCanvas().style.pointerEvents='none';map.getCanvasContainer().style.pointerEvents='none';
  map.on('render',()=>{renderFrames++;if(ready&&repaintBudget>0)repaintBudget--;report();});map.on('idle',report);map.on('sourcedata',event=>{if(disposed)return;admitSource(event);host.dataset.nativeSourceState=JSON.stringify(Object.fromEntries(Object.entries(map.getStyle().sources).filter(([,s])=>s.type==='vector').map(([id])=>{const source=map.getSource(id);return[id,{loaded:map.isSourceLoaded(id),minzoom:source.minzoom,maxzoom:source.maxzoom}];})));});map.on('error',event=>{host.dataset.nativeEngineError=String(event.error?.message||'').split('?')[0].slice(0,240);});
  armReadinessDeadline();resize(true);paint();
  return {setProgress(value){if(disposed||!Number.isFinite(value))return;const next=clamp(value);if(next===progress)return;progress=next;paint();},setVisible(value){const next=Boolean(value);if(next===requestedVisible||disposed)return;requestedVisible=next;visibility();},resize,dispose,snapshot,whenReady};
 }catch(error){fallback();throw error;}
}
