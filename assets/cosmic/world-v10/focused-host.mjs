// Host-driven focused-planet integration; no RAF, audio engine or persistence.
import {createWorldAdapter,eligibleWorld} from './app-adapter.mjs';
import {createSceneCompositor,sceneFrame} from './scene-bridge.mjs';
const TYPES=Object.freeze({0:'rock',1:'aquatic',2:'gas',3:'ice',4:'volcanic',6:'spectralMetallic',9:'spectralMetallic',10:'rock',11:'earth'});
export function legacyDescriptor(p){
 if(!p||!Object.hasOwn(TYPES,p.type))return null;
 const d={type:TYPES[p.type],seed:p.seed,generatorVersion:p.generatorVersion};
 return eligibleWorld(d)?d:null;
}
export function createFocusedHost(gl,{enabled=false,makeAdapter=createWorldAdapter,makeCompositor=createSceneCompositor,onFallback=()=>{}}={}){
 let adapter=null,compositor=null,initializing=null,requested=null,readyKey=null,epoch=0,closed=false,failed=false;
 function stop(){epoch++;requested=readyKey=null;if(adapter)void adapter.select(null).catch(()=>{});}
 function disposeResources(){compositor?.dispose();adapter?.dispose();compositor=adapter=null;}
 function fail(error){if(failed||closed)return;failed=true;epoch++;requested=readyKey=null;disposeResources();try{onFallback(error);}catch(_){}}
 async function initialize(){
  if(closed||failed||!enabled)return false;
  if(initializing)return initializing;
  initializing=(async()=>{try{
   adapter=makeAdapter({enabled:true,onFallback:fail});
   const owner=adapter,ok=await owner.init(gl);
   if(closed||failed||adapter!==owner)return false;
   if(!ok){fail(Error('V10 host initialization failed'));return false;}
   compositor=makeCompositor(gl);return true;
  }catch(e){fail(e);return false;}})();
  return initializing;
 }
 function request(d,key){
  requested=key;readyKey=null;const id=++epoch;
  void (async()=>{if(!await initialize()||closed||failed||id!==epoch)return;
   try{const ok=await adapter.select(d);if(id!==epoch||closed||failed)return;if(ok)readyKey=key;else fail(Error('V10 selection unavailable'));}
   catch(e){if(id===epoch)fail(e);}
  })();
 }
 return {
  draw({planet,body,basis,light,width,height,audio=0,time=0,delta=0,tier=2,growth=1}={}){
   if(closed||failed||!enabled)return false;
   const d=legacyDescriptor(planet);
   if(!d){if(requested!==null)stop();return false;}
   const key=JSON.stringify([d.type,d.seed,d.generatorVersion]);
   if(requested!==key)request(d,key);
   if(readyKey!==key||!adapter?.ready||!compositor||adapter.detailReady===false)return false;
   try{const ok=compositor.draw(adapter,body,sceneFrame({basis,light,audio,time,delta,tier,growth,sunIntensity:body.sunI??1,sunColor:body.sun??[1,1,1]}),width,height);if(!ok)fail(Error('V10 composition failed'));return ok;}
   catch(e){fail(e);return false;}
  },
  leave(){if(requested!==null)stop();},
  contextLost(){fail(Error('V10 context lost'));},
  dispose(){if(closed)return;closed=true;epoch++;requested=readyKey=null;disposeResources();},
  get state(){return closed?'closed':failed?'fallback':!enabled?'disabled':readyKey?'ready':requested?'loading':'idle';}
 };
}
