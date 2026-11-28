import {WORLD_CONFIG} from './config.mjs';
import {ARCHETYPES} from './archetypes.mjs';
import {createWorldCache} from './world-cache.mjs';
import {createPlanetRenderer} from './renderer.mjs';
import {cacheWorldsForTier,bakeForTier} from './full-potential.mjs';
// The host owns its animation loop, camera, audio, quality governor and saves.
// WebGL1 dedicated canvas or WebGL2 host context. Host configures framebuffer,
// viewport, depth/blend/scissor, and unpack state. No automatic composition.
export const V10_GENERATOR=10;
export function eligibleWorld(descriptor){
 return !!descriptor&&descriptor.generatorVersion===V10_GENERATOR&&Object.hasOwn(ARCHETYPES,descriptor.type)&&
 (typeof descriptor.seed==='string'||Number.isFinite(descriptor.seed));
}
export function createWorldAdapter({enabled=WORLD_CONFIG.enabled,createCache=createWorldCache,createRenderer=createPlanetRenderer,cosmic=null,onFallback=()=>{}}={}){
 let cache=null,renderer=null,initializing=null,planet=null,controller=null,revision=0,closed=false,failed=false,activeKey=null,pending=null,detailReady=false,bakeRes=WORLD_CONFIG.bakeResolution,bakeSmooth=false,lastTier=2,flowOn=true;
 function release(){detailReady=false;controller?.abort();controller=null;planet?.dispose();planet=null;activeKey=null;}
 function fallback(error){failed=true;release();try{onFallback(error);}catch(_){}}
 async function init(gl){
  if(closed||!enabled||failed)return false;
  if(renderer)return true;
  if(!initializing)initializing=(async()=>{try{const next=await createRenderer(gl,cosmic);if(closed){next.dispose();return false;}renderer=next;cache=createCache();return true;}catch(e){renderer?.dispose();renderer=null;fallback(e);return false;}})();
  return initializing;
 }
 function select(descriptor){
  if(closed||!enabled||failed||!renderer||!cache||!eligibleWorld(descriptor)){revision++;pending=null;release();return Promise.resolve(false);}
  const {type,seed}=descriptor,key=JSON.stringify([type,seed,V10_GENERATOR,bakeRes,bakeSmooth]);
  if(activeKey===key&&planet)return Promise.resolve(true);
  if(pending?.key===key)return pending.promise;
  const id=++revision;release();const abort=new AbortController();controller=abort;
  const promise=(async()=>{try{
   const world=await cache.get(type,seed,bakeRes,{priority:true,smooth:bakeSmooth});
   if(closed||id!==revision||abort.signal.aborted)return false;
   const next=renderer.upload(world);planet=next;activeKey=key;
   // Optional visual resources must never prevent base geometry from appearing.
   void Promise.resolve().then(()=>next.loadDetail(world.natural?.detailBiome,{signal:abort.signal,maxSize:512})).then(()=>{if(id===revision&&!abort.signal.aborted)detailReady=true;},e=>{if(id===revision&&!abort.signal.aborted){detailReady=true;console.warn('[PlanèteDot V10] detail fallback',e);}});
   if(flowOn&&world.type==='earth')void next.loadLiving?.(lastTier,{flow:true}).catch(e=>{if(!abort.signal.aborted)console.warn('[PlanèteDot V10] living cities fallback:',e?.message||e);});
   for(const load of [()=>next.loadLandmarks({signal:abort.signal}),()=>next.loadVegetation({signal:abort.signal})]){
    try{Promise.resolve(load()).catch(e=>{if(!abort.signal.aborted)console.warn('[PlanèteDot V10] optional asset:',e?.message||e);});}catch(e){if(!abort.signal.aborted)console.warn('[PlanèteDot V10] optional asset:',e?.message||e);}
   }
   return true;
  }catch(e){if(!closed&&id===revision)fallback(e);return false;}finally{if(pending?.id===id)pending=null;}})();
  pending={id,key,promise};return promise;
 }
 return {init,select,
  draw(frame){if(!planet||closed||failed)return false;try{renderer.draw(planet,frame);return true;}catch(e){fallback(e);return false;}},
  contextLost(){if(!closed){revision++;pending=null;fallback(new Error('V10 context lost'));}},
  dispose(){if(closed)return;closed=true;revision++;pending=null;release();cache?.dispose();renderer?.dispose();cache=renderer=null;},
  setTier(t,{smooth=false,flow=true}={}){lastTier=Math.max(0,Math.min(3,Math.trunc(t)||0));flowOn=flow!==false;try{cache?.setLimit?.(cacheWorldsForTier(t));}catch(_){}bakeSmooth=!!smooth;bakeRes=bakeSmooth?bakeForTier(t):WORLD_CONFIG.bakeResolution;},get bake(){return {size:bakeRes,smooth:bakeSmooth};},get gpuBytes(){return planet?.gpuBytes?.()??0;},get cities(){return planet?.cities??[];},get cacheBytes(){return cache?.bytes??0;},get ready(){return !!planet&&!closed&&!failed;},get detailReady(){return detailReady;},get failed(){return failed;}
 };
}
