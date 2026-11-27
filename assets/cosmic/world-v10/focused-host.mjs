// Host-driven focused-planet integration; no RAF, audio engine or persistence.
import {createWorldAdapter,eligibleWorld} from './app-adapter.mjs';
import {createSceneCompositor,sceneFrame} from './scene-bridge.mjs';
import {fpFlags,v10Tier,lodLevel,targetCapForTier,targetPixelsForTier,audioPacket,cityGrowth,cityLightGain,fadeStep,defaultReactivity} from './full-potential.mjs';
const TYPES=Object.freeze({0:'rock',1:'aquatic',2:'gas',3:'ice',4:'volcanic',6:'spectralMetallic',9:'spectralMetallic',10:'rock',11:'earth'});
export function legacyDescriptor(p){
 if(!p||!Object.hasOwn(TYPES,p.type))return null;
 const d={type:TYPES[p.type],seed:p.seed,generatorVersion:p.generatorVersion};
 return eligibleWorld(d)?d:null;
}
export function createFocusedHost(gl,{enabled=false,makeAdapter=createWorldAdapter,makeCompositor=createSceneCompositor,onFallback=()=>{},search=''}={}){
 const fx=fpFlags(search);let lod=null,lastTier=-1,aud={},grow=0,growKey=null,fade=0;
 let focusI=-1,focusT=9;
 const fp={reduced:false,pop:0,living:false,era:5,growth:1,motion:1,wind:0,gain:1,focusCity:-1,focus:0,draws:0};
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
   compositor=makeCompositor(gl);if(lastTier>=0)owner.setTier?.(lastTier,{smooth:fx.smooth});return true;
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
  draw({planet,body,basis,light,width,height,audio=0,time=0,delta=0,tier=2,growth=1,appTier,mobile=true,px,gesture=false,era=5,eraPc=1,playing=false,reducedMotion=false,inApp=false,audioIn=null,reactivity}={}){
   if(closed||failed||!enabled)return false;
   let targetCap=0;
   if(fx.lod&&appTier!==undefined){
    // Dot Design §0 et §2 : palier V10 0..3, cache par palier, LOD selon la taille à l'écran (V9 sous 64 px).
    tier=v10Tier(appTier,mobile);targetCap=targetCapForTier(tier);
    lod=lodLevel(lod,px,gesture);
    if(tier!==lastTier){lastTier=tier;adapter?.setTier?.(tier,{smooth:fx.smooth});}
    if(lod===0){if(requested!==null)stop();return false;}
   }
   const d=legacyDescriptor(planet);
   if(!d){if(requested!==null)stop();return false;}
   const key=JSON.stringify([d.type,d.seed,d.generatorVersion]);
   if(requested!==key)request(d,key);
   // V10fp villes : ère atteinte, croissance pendant l'écoute du morceau de la planète, lumière la nuit suivant la basse.
   if(growKey!==key){growKey=key;grow=0;fade=0;}
   grow=cityGrowth(grow,{floor:.5+.5*(Number.isFinite(eraPc)?eraPc:1),playing,dt:delta,reducedMotion});
   fade=fadeStep(fade,lod===null||lod>=2,delta);
   aud=audioPacket(fx.aud?(audioIn??{level:audio,live:audio>0?1:0}):{live:0},aud,delta,{reducedMotion,reactivity:reactivity??defaultReactivity(inApp)});
   fp.living=!!fx.city&&tier>=1;fp.era=Math.max(0,Math.min(5,Math.trunc(era)||0));fp.growth=grow;fp.motion=reducedMotion||tier<1?0:1;fp.wind=reducedMotion||tier<2?0:.6+.4*aud.level;fp.gain=fade*cityLightGain(aud,1);fp.draws=0;fp.reduced=!!reducedMotion;
   // Interactions (?v10act=1) : la ville touchée s'illumine 0,5 s, tient 5 s, s'éteint en 1 s ; en « réduire les animations », lumière seule.
   if(fx.act&&focusI>=0){focusT+=gesture?0:Math.max(0,Math.min(.25,delta||0));const f=focusT<.5?focusT/.5:focusT<5.5?1:Math.max(0,1-(focusT-5.5));fp.focusCity=focusI;fp.focus=f;fp.pop=reducedMotion||tier<1?0:f;if(f<=0&&focusT>5.5)focusI=-1;}
   else{fp.focusCity=-1;fp.focus=fp.pop=0;}
   if(readyKey!==key||!adapter?.ready||!compositor||adapter.detailReady===false)return false;
   try{const ok=compositor.draw(adapter,body,sceneFrame({basis,light,audio,time,delta,tier,growth,sunIntensity:body.sunI??1,sunColor:body.sun??[1,1,1],lod:fx.lod&&lod!==null?lod:2,targetCap,fp,targetPixels:fx.win&&appTier!==undefined?targetPixelsForTier(tier):0}),width,height);if(!ok)fail(Error('V10 composition failed'));return ok;}
   catch(e){fail(e);return false;}
  },
  // Picking sans hit-testing GPU : direction du point touché (rayon/sphère côté hôte), puis ville la plus proche dans les données CPU.
  pickCity(dir,maxAngle=.09){
   if(!fx.act||!adapter?.ready||!Array.isArray(dir)||dir.length!==3)return null;const l=Math.hypot(...dir);if(!(l>0))return null;
   let best=-1,bd=Math.cos(maxAngle);adapter.cities.forEach((c,i)=>{const d=(c.dir[0]*dir[0]+c.dir[1]*dir[1]+c.dir[2]*dir[2])/l;if(d>bd){bd=d;best=i;}});
   if(best<0)return null;const c=adapter.cities[best];return {index:best,dir:c.dir.slice(),port:!!c.port,river:!!c.river,tempC:c.tempC};
  },
  focusCity(i){if(!fx.act)return false;focusI=Number.isInteger(i)?i:-1;focusT=0;return focusI>=0;},
  get cities(){return adapter?.ready?adapter.cities.map(c=>c.dir):[];},
  get focus(){return {city:focusI,level:fp.focus};},
  leave(){focusI=-1;if(requested!==null)stop();},
  contextLost(){fail(Error('V10 context lost'));},
  dispose(){if(closed)return;closed=true;epoch++;requested=readyKey=null;disposeResources();},
  get stats(){return {bake:adapter?.bake??null,target:compositor?.size??null,targetBytes:compositor?.bytes??0,lod,tier:lastTier,flags:fx,growth:grow,draws:fp.draws,focus:{city:focusI,level:fp.focus},audio:{bass:aud.bass,kick:aud.kick,cap:aud.cap},gpuBytes:adapter?.gpuBytes??0,cacheBytes:adapter?.cacheBytes??0};},
  get state(){return closed?'closed':failed?'fallback':!enabled?'disabled':readyKey?'ready':requested?'loading':'idle';}
 };
}
