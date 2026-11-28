// Host-driven focused-planet integration; no RAF, audio engine or persistence.
import {createWorldAdapter,eligibleWorld} from './app-adapter.mjs';
import {createSceneCompositor,sceneFrame} from './scene-bridge.mjs';
import {registrySnapshot} from './resource-registry.mjs';
import {fpFlags,v10Tier,lodLevel,targetCapForTier,targetPixelsForTier,audioPacket,cityGrowth,cityLightGain,fadeStep,defaultReactivity,shouldWarmHost,CITY_FADE_SEC} from './full-potential.mjs';
const NOLIVE=Object.freeze({live:0});
const TYPES=Object.freeze({0:'rock',1:'aquatic',2:'gas',3:'ice',4:'volcanic',6:'spectralMetallic',9:'spectralMetallic',10:'rock',11:'earth'});
export function legacyDescriptor(p){
 if(!p||!Object.hasOwn(TYPES,p.type))return null;
 const d={type:TYPES[p.type],seed:p.seed,generatorVersion:p.generatorVersion};
 return eligibleWorld(d)?d:null;
}
export function createFocusedHost(gl,{enabled=false,makeAdapter=createWorldAdapter,makeCompositor=createSceneCompositor,onFallback=()=>{},search='',cosmic=null}={}){
 if(cosmic) cosmic.otherBytes=()=>Math.max(cosmic.baseReserve??0,(adapter?.gpuBytes??0)+(compositor?.bytes??0));
 const fx=fpFlags(search);let lod=null,lastTier=-1,grow=0,growKey=null,fade=0;
 const aud={},audOpts={reducedMotion:false,reactivity:'full'};   // paquet audio et options réutilisés : aucune allocation par image
 let focusI=-1,focusT=9,cityDirs=null,cityKey=null;const focusOut={city:-1,level:0};   // objets réutilisés : aucune allocation par image ni au tap
 const ease=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
 const fp={aud,part:false,partAudio:true,reduced:false,pop:0,living:false,traffic:false,trafficDraws:0,era:5,growth:1,motion:1,wind:0,gain:1,focusCity:-1,focus:0,draws:0};
 let adapter=null,compositor=null,initializing=null,requested=null,readyKey=null,epoch=0,closed=false,failed=false;
 function stop(){epoch++;requested=readyKey=null;if(adapter)void adapter.select(null).catch(()=>{});}
 function disposeResources(){compositor?.dispose();adapter?.dispose();compositor=adapter=null;}
 function fail(error){if(failed||closed)return;failed=true;epoch++;requested=readyKey=null;disposeResources();try{onFallback(error);}catch(_){}}
 async function initialize(){
  if(closed||failed||!enabled)return false;
  if(initializing)return initializing;
  initializing=(async()=>{try{
   adapter=makeAdapter({enabled:true,onFallback:fail,cosmic});
   const owner=adapter,ok=await owner.init(gl);
   if(closed||failed||adapter!==owner)return false;
   if(!ok){fail(Error('V10 host initialization failed'));return false;}
   compositor=makeCompositor(gl);if(lastTier>=0)owner.setTier?.(lastTier,{smooth:fx.smooth,flow:fx.flow});return true;
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
    if(tier!==lastTier){lastTier=tier;adapter?.setTier?.(tier,{smooth:fx.smooth,flow:fx.flow});}
    if(lod===0){
     // ?v10flow : préparer cuisson et modèles dès l'approche, tout en laissant V9 à l'écran tant que le LOD est 0.
     const d0=legacyDescriptor(planet),warm=fx.flow&&shouldWarmHost(px)&&d0;
     if(warm){const key=JSON.stringify([d0.type,d0.seed,d0.generatorVersion]);if(requested!==key)request(d0,key);}
     else if(requested!==null)stop();
     return false;
    }
   }
   const d=legacyDescriptor(planet);
   if(!d){if(requested!==null)stop();return false;}
   const key=JSON.stringify([d.type,d.seed,d.generatorVersion]);
   if(requested!==key)request(d,key);
   // V10fp villes : ère atteinte, croissance pendant l'écoute du morceau de la planète, lumière la nuit suivant la basse.
   if(growKey!==key){growKey=key;grow=0;fade=0;}
   grow=cityGrowth(grow,{floor:.5+.5*(Number.isFinite(eraPc)?eraPc:1),playing,dt:delta,reducedMotion});
   const wantHouses=lod===null||lod>=2;
   fade=reducedMotion||!fx.flow?(wantHouses?1:0):fadeStep(fade,wantHouses,delta,CITY_FADE_SEC);
   audOpts.reducedMotion=!!reducedMotion;audOpts.reactivity=reactivity??defaultReactivity(inApp);
   audioPacket(fx.aud?(audioIn??(audio>0?audio:NOLIVE)):NOLIVE,aud,delta,audOpts);
   if(cosmic) cosmic.updateAudioEnvelopeInPlace(cosmic.envelope,aud.u[0],aud.u[1],aud.u[2],delta);
   fp.part=!!fx.part&&tier>=1;
   fp.living=!!fx.city&&tier>=1;fp.flow=!!fx.flow;fp.reveal=fx.flow?fade:1;fp.era=Math.max(0,Math.min(5,Math.trunc(era)||0));fp.growth=grow;fp.motion=reducedMotion||tier<1?0:1;fp.wind=reducedMotion||tier<2?0:.6+.4*aud.level;fp.gain=fade*cityLightGain(aud,1);fp.draws=0;fp.reduced=!!reducedMotion;fp.traffic=!!fx.act&&tier>=1;fp.trafficDraws=0;
   // Interactions (?v10act=1) : la ville touchée s'illumine 0,5 s, tient 5 s, s'éteint en 1 s ; en « réduire les animations », lumière seule.
   if(fx.act&&focusI>=0){focusT+=gesture?0:Math.max(0,Math.min(.25,delta||0));const f=tier<1||reducedMotion?(focusT<5.5?1:0):focusT<.6?ease(focusT/.6):focusT<5.5?1:ease(1-(focusT-5.5)/1.2);/* palier 0 ou réduire les animations : rien d'animé (allumé puis éteint net) */fp.focusCity=focusI;fp.focus=f;fp.pop=reducedMotion||tier<1?0:f;if(f<=0&&focusT>5.5)focusI=-1;}
   else{fp.focusCity=-1;fp.focus=fp.pop=0;}
   if(readyKey!==key||!adapter?.ready||!compositor||adapter.detailReady===false)return false;
   try{const ok=compositor.draw(adapter,body,sceneFrame({basis,light,audio,time,delta,tier,growth,sunIntensity:body.sunI??1,sunColor:body.sun??[1,1,1],lod:fx.lod&&lod!==null?lod:2,targetCap,fp,gesture,flow:fx.flow,targetPixels:fx.win&&appTier!==undefined?targetPixelsForTier(tier):0}),width,height);if(!ok)fail(Error('V10 composition failed'));return ok;}
   catch(e){fail(e);return false;}
  },
  // Picking sans hit-testing GPU : direction du point touché (rayon/sphère côté hôte), puis ville la plus proche dans les données CPU.
  pickCity(dir,maxAngle=.09){
   if(!fx.act||!adapter?.ready||!Array.isArray(dir)||dir.length!==3)return null;const l=Math.hypot(...dir);if(!(l>0))return null;
   let best=-1,bd=Math.cos(maxAngle);adapter.cities.forEach((c,i)=>{const d=(c.dir[0]*dir[0]+c.dir[1]*dir[1]+c.dir[2]*dir[2])/l;if(d>bd){bd=d;best=i;}});
   if(best<0)return null;const c=adapter.cities[best];return {index:best,dir:c.dir.slice(),port:!!c.port,river:!!c.river,tempC:c.tempC};
  },
  focusCity(i){if(!fx.act)return false;focusI=Number.isInteger(i)?i:-1;focusT=0;return focusI>=0;},
  get cities(){if(!adapter?.ready)return [];if(cityKey!==adapter.cities){cityKey=adapter.cities;cityDirs=cityKey.map(c=>c.dir);}return cityDirs;},
  get focus(){focusOut.city=focusI;focusOut.level=fp.focus;return focusOut;},
  leave(){focusI=-1;if(requested!==null)stop();},
  contextLost(){fail(Error('V10 context lost'));},
  dispose(){if(closed)return;closed=true;epoch++;requested=readyKey=null;disposeResources();},
  get stats(){return {bake:adapter?.bake??null,target:compositor?.size??null,targetBytes:compositor?.bytes??0,lod,tier:lastTier,flags:fx,growth:grow,draws:fp.draws,trafficDraws:fp.trafficDraws,focus:{city:focusI,level:fp.focus},audio:{bass:aud.sb,mid:aud.sm,high:aud.sh,level:aud.sl,kick:aud.kick,wave:aud.wave,storm:aud.storm,burstAge:aud.burstAge,cap:aud.cap},gpuBytes:adapter?.gpuBytes??0,cacheBytes:adapter?.cacheBytes??0,registry:registrySnapshot()};},
  get state(){return closed?'closed':failed?'fallback':!enabled?'disabled':readyKey?'ready':requested?'loading':'idle';}
 };
}
