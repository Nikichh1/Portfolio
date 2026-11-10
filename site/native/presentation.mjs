const EMPTY=Object.freeze({type:'FeatureCollection',features:[]});
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const smooth=value=>{const t=clamp(value);return t*t*t*(t*(t*6-15)+10);};
const TILE_NAMES=new Set(Array.from({length:3},(_,x)=>Array.from({length:3},(_,y)=>`tiles/14/${9317+x}/${6072+y}.pbf`)).flat());
const ASSET_NAMES=new Set(['tilejson.json','route.json','environment.geojson','canopy.geojson','model.glb','build/map-worker.js','build/building-mesh-worker.js','build/building-shadow-worker.js']);

/** Pure, distance-based camera track. Geometry stays on the supplied streets;
 * only the heading and camera approach are eased across the mapped corners. */
export function createNativeRouteTrack(geometry){
 if(!Array.isArray(geometry)||geometry.length<4||geometry.some(point=>!Array.isArray(point)||point.length<2||!point.slice(0,2).every(Number.isFinite)))throw new TypeError('A finite demonstration route is required');
 const coordinates=geometry.map(([lat,lng])=>[lng,lat]),distances=[0],headings=[];
 for(let i=1;i<coordinates.length;i++){
  const a=coordinates[i-1],b=coordinates[i],east=(b[0]-a[0])*Math.cos((a[1]+b[1])*.5*Math.PI/180),north=b[1]-a[1];
  distances.push(distances.at(-1)+Math.hypot(east,north)*111320);
  const angle=Math.atan2(east,north)*180/Math.PI,previous=headings.at(-1);headings.push(previous===undefined?angle:previous+((angle-previous+540)%360+360)%360-180);
 }
 const initialIndex=Math.floor(.08*(coordinates.length-2)),start=distances[initialIndex],length=Math.min(190,distances.at(-1)-start),headingChanges=headings.slice(1).map((heading,i)=>({distance:distances[i+1],delta:heading-headings[i]}));
 const pointAt=distance=>{const d=Math.max(0,Math.min(distances.at(-1),distance));let i=1;while(i<distances.length-1&&distances[i]<d)i++;const t=(d-distances[i-1])/Math.max(.001,distances[i]-distances[i-1]),a=coordinates[i-1],b=coordinates[i];return{lng:a[0]+(b[0]-a[0])*t,lat:a[1]+(b[1]-a[1])*t};};
 const initial=pointAt(start),ahead=pointAt(start+6),initialHeading=Math.atan2((ahead.lng-initial.lng)*Math.cos(initial.lat*Math.PI/180),ahead.lat-initial.lat)*180/Math.PI;
 const easedHeading=distance=>headings[0]+headingChanges.reduce((sum,turn)=>sum+turn.delta*smooth((distance-turn.distance+6)/12),0),headingOrigin=easedHeading(start),headingShift=360*Math.round((headingOrigin-initialHeading)/360),initialBias=initialHeading-(headingOrigin-headingShift);
 const turns=headingChanges.filter(turn=>Math.abs(turn.delta)>45&&turn.distance>start&&turn.distance<start+length).map(turn=>({distance:turn.distance-start,degrees:turn.delta}));
 function sample(value,width=1200){
  const p=clamp(value),distance=Math.min(length,(20*smooth(p/.28)+170*smooth((p-.16)/.84))*length/190),point=pointAt(start+distance),heading=easedHeading(start+distance)-headingShift+initialBias*(1-smooth(distance/14)),pose={...point,heading},orbit=smooth(p/.28),open=smooth((p-.58)/.42),lift=Math.sin(Math.PI*orbit),cornerLift=turns.reduce((sum,turn,i)=>sum+(i?18:10)*smooth((distance-(turn.distance-(i?18:14)))/10)*(1-smooth((distance-(turn.distance+(i?10:5)))/(i?14:12))),0),pitch=58-20*lift-4*smooth(p/.4)-4*open-cornerLift,baseZoom=20.45+.5*smooth((width-350)/550),actualTurns=turns.map(turn=>({...turn,progress:smooth((distance-turn.distance+6)/12)}));
  return {pose,camera:{center:[pose.lng,pose.lat],zoom:baseZoom-1.55*open,pitch,bearing:pose.heading+145-165*orbit,padding:{top:0,bottom:0,left:0,right:0}},distance,length,turnProgress:actualTurns.reduce((sum,turn)=>sum+turn.progress,0)/Math.max(1,actualTurns.length),turns:actualTurns};
 }
 return {sample,length,start,turns};
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
 let disposed=false,requestedVisible=true,progress=0,scene,map,renderFrames=0,lastWidth=0,lastHeight=0,lastDpr=0,ready=false,readinessTimer=0,resolveReady,rejectStart,repaintBudget=0,repaintUntil=0,suppressedRepaints=0,asyncRepaints=0,ownerRepaints=0,originalTrigger=null,preparedMask=0;
 const sourceContent=new Set(),clock=()=>win.performance?.now?.()??performance.now();
 const whenReady=new Promise(resolve=>{resolveReady=resolve;});
 const startDeadline=new Promise((resolve,reject)=>{rejectStart=reject;});
 const nativeRatio=()=>{const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight),cap=2-.75*smooth((width-450)/550),raw=Math.min(win.devicePixelRatio||1,cap,Math.sqrt(2000000/(width*height)));return Math.max(1,Math.floor(raw*20+1e-9)/20);};
 const ratioBudget={ratio:nativeRatio,ceiling:nativeRatio,syncNative:nativeRatio,restore:nativeRatio,sample:nativeRatio};
 const effectiveVisible=()=>requestedVisible&&!doc.hidden&&!disposed;
 const transformRequest=url=>{if(url.startsWith('/site/native/'))url=asset(url.slice('/site/native/'.length));const resolved=resolveStatic(url),name=resolved.pathname.slice(base.pathname.length),virtual=/^tiles\/(1[5-9]|2[0-2])\/(\d+)\/(\d+)\.pbf$/.exec(name);if(virtual){const z=Number(virtual[1]),x=Number(virtual[2]),y=Number(virtual[3]),factor=2**(z-14),parent=`tiles/14/${Math.floor(x/factor)}/${Math.floor(y/factor)}.pbf`;if(TILE_NAMES.has(parent)){host.dataset.nativeVirtualTile=name;return {url:resolved.href};}}return {url:nativePath(url)};};
 function restoreResolver(){if(globalThis.zeleniAssetUrl===assetResolver){if(globalAssetBefore===undefined)delete globalThis.zeleniAssetUrl;else globalThis.zeleniAssetUrl=globalAssetBefore;}}
 function dispose(){if(disposed)return;disposed=true;clearTimeout(readinessTimer);fetchAbort.abort();doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('resize',windowResize);query.removeEventListener?.('change',preference);if(map&&originalTrigger)map.triggerRepaint=originalTrigger;scene?.destroy();restoreResolver();host.dataset.nativeStatus=host.dataset.nativeState='disposed';if(!ready)resolveReady({state:'disposed'});}
 function fallback(){if(disposed)return;if(!ready)resolveReady({state:'fallback'});rejectStart(new Error('Native presentation could not be prepared'));dispose();host.dataset.nativeReady='false';host.dataset.nativeStatus=host.dataset.nativeState='fallback';host.dispatchEvent(new win.CustomEvent('presentation-fallback',{detail:{state:'fallback'}}));}
 function armReadinessDeadline(){clearTimeout(readinessTimer);readinessTimer=0;if(!ready&&effectiveVisible())readinessTimer=setTimeout(fallback,20000);}
 function snapshot(){const canvas=map?.getCanvas();return {progress,reducedMotion:isReduced(),visible:effectiveVisible(),ready,modelReady:Boolean(scene?.modelReady),frames:renderFrames,canvas:canvas?[canvas.width,canvas.height]:[0,0],css:[host.clientWidth,host.clientHeight],dpr:map?.getPixelRatio?.()||0,camera:host.dataset.nativeCamera?JSON.parse(host.dataset.nativeCamera):null,routeDistance:Number(host.dataset.nativeRouteDistance)||0,routeLength:Number(host.dataset.nativeRouteLength)||0,turnProgress:Number(host.dataset.nativeTurnProgress)||0};}
 function repaintDiagnostics(){host.dataset.nativeRepaintBudget=String(repaintBudget);host.dataset.nativeSuppressedRepaints=String(suppressedRepaints);host.dataset.nativeAsyncRepaints=String(asyncRepaints);host.dataset.nativeOwnerRepaints=String(ownerRepaints);host.dataset.nativeSourceAdmissions=String(sourceContent.size);}
 function admit(){repaintBudget=180;repaintUntil=clock()+700;repaintDiagnostics();}
 function admitOwner(){ownerRepaints++;preparedMask=0;admit();}
 function admitPrepared(){let mask=0;for(const [i,layer]of [scene?.worldMaterials,scene?.buildingMaterials,scene?.buildingShadows,scene?.bridgeRoads].entries())if(layer?.isPrepared?.()??true)mask|=1<<i;const newlyPrepared=mask&~preparedMask;preparedMask|=mask;if(ready&&newlyPrepared){asyncRepaints++;admit();}}
 function admitSource(event){if(!event?.sourceId||!['content','metadata'].includes(event.sourceDataType))return;const tile=event.tile?.tileID||event.coord,key=[event.sourceId,event.sourceDataType,tile?.key??[tile?.overscaledZ,tile?.canonical?.z,tile?.canonical?.x,tile?.canonical?.y].join('/'),event.isSourceLoaded===true].join(':');if(sourceContent.has(key))return;sourceContent.add(key);if(ready){preparedMask=0;asyncRepaints++;admit();originalTrigger?.();}}
 function report(){if(disposed)return;const state=snapshot();host.dataset.nativeProgress=progress.toFixed(5);host.dataset.nativeModelReady=String(state.modelReady);host.dataset.nativeFrames=String(renderFrames);host.dataset.nativeCanvas=JSON.stringify(state.canvas);host.dataset.nativeCss=JSON.stringify(state.css);host.dataset.nativeDpr=String(state.dpr);host.dataset.nativeVisible=String(state.visible);host.dataset.nativeReduced=String(state.reducedMotion);host.dataset.nativeLampMode='approved night vehicle lenses and ground lamp spill';if(!ready&&host.dataset.nativeRejectedAsset){fallback();return;}const geometryReady=Boolean(scene?.hasGeography?.()&&map.isSourceLoaded('building-details')&&(scene.buildingMaterials?.isPrepared?.()??true)&&(scene.worldMaterials?.isPrepared?.()??true));if(!ready&&state.modelReady&&geometryReady){ready=true;admit();clearTimeout(readinessTimer);host.dataset.nativeReady='true';const detail={...state,ready:true,geometryReady:true};resolveReady(detail);host.dispatchEvent(new win.CustomEvent('presentation-ready',{detail}));}host.dataset.nativeStatus=host.dataset.nativeState=ready?'ready':'loading';repaintDiagnostics();}
 let routeTrack;
 function paint(){if(!map||disposed||!effectiveVisible())return;admitOwner();const sample=routeTrack.sample(isReduced()?0:progress,host.clientWidth),{pose,camera}=sample;scene.pose={...pose};scene.targetPose={...pose};scene.cameraSpeed=0;scene.follow=false;scene.routeMotion?.setPose(scene.pose);scene.renderPose();map.jumpTo(camera,{passengerFollowFrame:true});map.triggerRepaint();host.dataset.nativeCamera=JSON.stringify(camera);host.dataset.nativePose=JSON.stringify(pose);host.dataset.nativeRouteDistance=sample.distance.toFixed(3);host.dataset.nativeRouteLength=sample.length.toFixed(3);host.dataset.nativeTurnProgress=sample.turnProgress.toFixed(5);host.dataset.nativeRouteTurns=JSON.stringify(sample.turns);report();}
 function resize(force=false){if(!map||disposed)return;const width=host.clientWidth,height=host.clientHeight,dpr=nativeRatio();if(!force&&Math.abs(width-lastWidth)<8&&Math.abs(height-lastHeight)<8&&dpr===lastDpr)return;lastWidth=width;lastHeight=height;lastDpr=dpr;if(map.getPixelRatio()!==dpr)map.setPixelRatio(dpr);scene.appliedPixelRatio=dpr;scene.resizeApproved();if(effectiveVisible())paint();else report();}
 function visibility(){if(disposed)return;armReadinessDeadline();if(!scene)return;scene.setCovered(!effectiveVisible());map?.stop();if(effectiveVisible()){resize(true);paint();}else{scene.suspend();report();}}
 function windowResize(){resize(true);}
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
  host.dataset.nativeAdapterVersion='v7-two-corners-190m-20261110-1';host.dataset.nativeReady='false';host.dataset.nativeStatus=host.dataset.nativeState='loading';
  scene=new NativePresentationScene(host,{appearance:'passenger-ride',mode:'navigation',theme:'dark',displayMode:'3d',displayPreferenceKey:'zeleni-site-native-display-only',qualityPreference:'ultra',center:[42.141017,24.749631],zoom:20,request});
  await Promise.race([scene.ready,startDeadline]);
  if(!scene.map)throw new Error('Native 3D is unavailable');map=scene.map;
  originalTrigger=map.triggerRepaint.bind(map);map.triggerRepaint=function(){if(!effectiveVisible())return map;admitPrepared();const blending=scene.cityDetailBlend?.moving===true;if(ready&&(clock()>repaintUntil||repaintBudget<=0&&!blending)){suppressedRepaints++;repaintDiagnostics();return map;}return originalTrigger();};
  map.setMaxZoom(22);map.setMaxPitch(62);map.stop();scene.follow=false;scene.setRoute(route.geometry);scene.mode='navigation';scene.applyRouteMaterial();host.dataset.nativeVectorSources=JSON.stringify(Object.fromEntries(Object.entries(map.getStyle().sources).filter(([,source])=>source.type==='vector').map(([id,source])=>[id,{type:source.type,url:source.url,minzoom:source.minzoom,maxzoom:source.maxzoom}])));
  map.dragPan.disable();map.scrollZoom.disable();map.boxZoom.disable();map.dragRotate.disable();map.keyboard.disable();map.doubleClickZoom.disable();map.touchZoomRotate.disable();map.touchPitch.disable();
  map.getCanvas().setAttribute('aria-label','Примерен маршрут с реалния 3D автомобил на Зелени такси');map.getCanvas().setAttribute('role','img');map.getCanvas().tabIndex=-1;map.getCanvas().style.pointerEvents='none';map.getCanvasContainer().style.pointerEvents='none';
  map.on('render',()=>{renderFrames++;if(ready&&repaintBudget>0)repaintBudget--;report();});map.on('idle',report);map.on('sourcedata',event=>{if(disposed)return;admitSource(event);host.dataset.nativeSourceState=JSON.stringify(Object.fromEntries(Object.entries(map.getStyle().sources).filter(([,s])=>s.type==='vector').map(([id])=>{const source=map.getSource(id);return[id,{loaded:map.isSourceLoaded(id),minzoom:source.minzoom,maxzoom:source.maxzoom}];})));});map.on('error',event=>{host.dataset.nativeEngineError=String(event.error?.message||'').split('?')[0].slice(0,240);});
  armReadinessDeadline();resize(true);paint();
  return {setProgress(value){if(disposed||!Number.isFinite(value))return;const next=clamp(value);if(next===progress)return;progress=next;paint();},setVisible(value){const next=Boolean(value);if(next===requestedVisible||disposed)return;requestedVisible=next;visibility();},resize,dispose,snapshot,whenReady};
 }catch(error){fallback();throw error;}
}
