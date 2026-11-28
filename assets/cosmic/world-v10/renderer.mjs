import {isWebGL2,withSharedGL} from './gl-compat.mjs';
import {loadPlanetProgram} from './program.mjs';
import {uploadSphere,SPHERE_LODS} from './sphere.mjs';
import {uploadWorldMaps} from './gpu-maps.mjs';
import {ARCHETYPES,planetProfile} from './archetypes.mjs';
import {loadTerrainAlbedo,loadEarthDetailAtlas,loadTerrainHeight} from './terrain-texture.mjs';
import {assertTextureGL} from './texture-guard.mjs';
import {visualAudio} from './visual-audio.mjs';
import {createCityProgram,uploadCities} from './cities.mjs';
import {loadCityModels} from './static-glb.mjs';
import {uploadLandmarks} from './landmarks.mjs';
import {loadVegetationModels,uploadVegetation} from './vegetation.mjs';
import {livingPlacement,livingBatches,loadLivingModels,uploadLiving,uploadLivingAsync,createLivingProgram,prewarmLivingProgram,drawLiving,trafficPlacement,uploadTraffic,createTrafficProgram,drawTraffic} from './living-cities.mjs';
import {stormCenter} from './weather.mjs';
import {createParticleProgram} from './particles.mjs';
import {WAVE_PERIOD,STORM_PERIOD,particleBudget} from './full-potential.mjs';
const families=Object.keys(ARCHETYPES);
const tints=[[.18,.45,1],[.12,.65,1],[.45,.38,.3],[1,.25,.08],[.4,.7,1],[.9,.65,.4],[.5,.3,1]];
// Dedicated context or caller-managed GL state. No animation loop is created.
export async function createPlanetRenderer(gl){
 if(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)<4)throw new Error('Four fragment samplers required');
 const p=await loadPlanetProgram(gl),meshes=new Map();let disposed=false,neutral=null,cityProgram=null,vao=null,livingProgram=null,livingBroken=false,trafficProgram=null,trafficBroken=false,particles=null,particlesBroken=false;const fallbackAudio=new Float32Array(8);
 try{
 if(isWebGL2(gl)){vao=gl.createVertexArray();if(!vao)throw Error('V10 VAO allocation failed');}
 const previous=gl.getParameter(gl.TEXTURE_BINDING_2D);
 try{neutral=gl.createTexture();if(!neutral)throw Error('Detail fallback allocation failed');gl.bindTexture(gl.TEXTURE_2D,neutral);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,128,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);assertTextureGL(gl,'Detail fallback');}finally{gl.bindTexture(gl.TEXTURE_2D,previous);}
 }catch(e){if(neutral)gl.deleteTexture(neutral);if(vao)gl.deleteVertexArray(vao);p.dispose();throw e;}
 try{cityProgram=createCityProgram(gl);}catch(e){console.warn('City shader fallback:',e.message);}
 try{if(isWebGL2(gl)){livingProgram=createLivingProgram(gl);prewarmLivingProgram(gl,livingProgram);}}catch(e){livingBroken=true;console.warn('[PlanèteDot V10] living cities fallback:',e?.message||e);}
 return {
 upload(world){if(disposed)throw new Error('Renderer disposed');const profile=planetProfile(world.type),maps=uploadWorldMaps(gl,world);let alive=true,revision=0,landmarkRevision=0,vegetationRevision=0,cityMesh=null;
 if(cityProgram)try{cityMesh=uploadCities(gl,world);}catch(e){console.warn('City mesh fallback:',e.message);}
 const planet={maps,profile,type:world.type,family:families.indexOf(world.type),size:world.size,stormCenter:stormCenter(world.type,world.seed??0),detail:null,heightDetail:null,audioEnergy:0,cityMesh,landmarks:null,vegetation:null,living:null,cities:(world.natural?.cities??[]).slice(0,16),livingTier:-1,livingInstances:null,traffic:null,trafficTier:-1,
 // V10fp interactions (?v10act=1) : trafic lumineux sur les routes, placé en CPU une fois par palier, sans téléchargement.
 ensureTraffic(tier){if(!alive||disposed||world.type!=='earth'||planet.trafficTier===tier)return planet.traffic;planet.trafficTier=tier;planet.traffic?.dispose();planet.traffic=uploadTraffic(gl,trafficPlacement(world,{tier}));return planet.traffic;},
 // V10fp villes procédurales : modèles chargés au premier gros plan seulement (palier ≥ 1), jamais au palier 0.
 async loadLiving(tier,{flow=true}={}){
  if(!alive||disposed||world.type!=='earth'||tier<1||planet.livingTier===tier)return false;
  planet.livingTier=tier;
  const instances=planet.livingInstances&&planet.livingInstances._tier===tier?planet.livingInstances:livingPlacement(world,{tier});
  instances._tier=tier;planet.livingInstances=instances;if(!instances.length)return false;
  const models=await loadLivingModels(livingBatches(instances),{tier});if(!alive||disposed||planet.livingTier!==tier)return false;
  const next=flow?await uploadLivingAsync(gl,instances,models):uploadLiving(gl,instances,models);if(!alive||disposed||planet.livingTier!==tier){next?.dispose();return false;}
  planet.living?.dispose();planet.living=next;return !!next;
 },
 async loadVegetation(options){
 if(!alive||disposed||world.type!=='earth'||!cityProgram||!world.natural?.vegetation?.length)return false;
 const id=++vegetationRevision,models=await loadVegetationModels(options);if(!alive||disposed||id!==vegetationRevision||options?.signal?.aborted)return false;
 const next=uploadVegetation(gl,world,models);planet.vegetation?.dispose();planet.vegetation=next;return !!next;
 },
 async loadLandmarks(options){
 if(!alive||disposed||world.type!=='earth'||!cityProgram)return false;
 const id=++landmarkRevision,model=await loadCityModels(options);if(!alive||disposed||id!==landmarkRevision||options?.signal?.aborted)return false;
 const next=uploadLandmarks(gl,world,model);planet.landmarks?.dispose();planet.landmarks=next;return !!next;
 },
 async loadDetail(biome,options){
 if(!alive||disposed)return false;
 const id=++revision;
 let asset;
 if(world.type==='earth'){
  try{asset=await loadEarthDetailAtlas(gl,options);}catch(e){if(options?.signal?.aborted||gl.isContextLost())throw e;asset=await loadTerrainAlbedo(gl,world.type,biome,options);}
 }else asset=await loadTerrainAlbedo(gl,world.type,biome,options);
 if(!alive||disposed||id!==revision){asset?.dispose();return false;}
 planet.detail?.dispose();planet.heightDetail?.dispose();planet.heightDetail=null;planet.detail=asset;
 if(asset){try{const height=await loadTerrainHeight(gl,world.type,biome,{...options,atlas:!!asset.atlas});if(!alive||disposed||id!==revision){height?.dispose();return false;}planet.heightDetail=height;}catch(e){if(!options?.signal?.aborted)console.warn('Height detail fallback:',e.message);}}
 return alive&&!disposed&&id===revision&&!!asset;
 },
 gpuBytes(){return (maps.bytes||0)+(planet.detail?.bytes||0)+(planet.heightDetail?.bytes||0)+(planet.pbr?.bytes||0)+(cityMesh?.bytes||0)+(planet.living?.bytes||0)+(planet.traffic?.bytes||0);},
 dispose(){if(!alive)return;alive=false;revision++;planet.detail?.dispose();planet.detail=null;planet.heightDetail?.dispose();planet.heightDetail=null;cityMesh?.dispose();planet.cityMesh=null;planet.landmarks?.dispose();planet.landmarks=null;planet.vegetation?.dispose();planet.vegetation=null;planet.living?.dispose();planet.living=null;planet.traffic?.dispose();planet.traffic=null;maps.dispose();}
 };return planet;},
 draw(planet,{mvp,eye=[0,0,3],light=[-.45,.35,.82],tier=2,time=0,audio=0,delta=1/60,detailStrength=.8,microStrength=.8,growth=1,sunIntensity=1,sunColor=[1,1,1],lod=2,fp=null,viewPx=480}){
 if(disposed||gl.isContextLost())return;
 return withSharedGL(gl,vao,()=>{
 tier=Math.max(0,Math.min(3,Math.trunc(tier)||0));if(!meshes.has(tier))meshes.set(tier,uploadSphere(gl,...SPHERE_LODS[tier]));
 const mesh=meshes.get(tier),u=p.uniforms;
 gl.useProgram(p.program);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertex);gl.enableVertexAttribArray(p.position);gl.vertexAttribPointer(p.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_CUBE_MAP,planet.maps.terrain);gl.uniform1i(u.uTerrain,0);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_CUBE_MAP,planet.maps.climate);gl.uniform1i(u.uClimate,1);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,planet.detail?.texture??neutral);gl.uniform1i(u.uDetail,2);gl.uniform1f(u.uDetailAtlas,planet.detail?.atlas?1:0);gl.uniform1f(u.uDetailInset,planet.detail?.atlas?0.5/planet.detail.width:0);gl.uniform1f(u.uDetailStrength,planet.detail?Math.max(0,Math.min(1,Number(detailStrength)||0)):0);
 gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,planet.heightDetail?.texture??neutral);gl.uniform1i(u.uHeight,3);gl.uniform1f(u.uMicroStrength,planet.heightDetail?(tier===0?.25:tier===1?.65:1)*Math.max(0,Math.min(1,Number(microStrength)||0))*Math.max(0,Math.min(1,Number(detailStrength)||0)):0);
 gl.uniformMatrix4fv(u.uMVP,false,mvp);gl.uniform3fv(u.uEye,eye);gl.uniform3fv(u.uLight,light);gl.uniform1f(u.uSunIntensity,Math.max(0,Math.min(3,Number.isFinite(sunIntensity)?sunIntensity:1)));gl.uniform3fv(u.uSunColor,sunColor?.length===3&&Array.from(sunColor).every(Number.isFinite)?sunColor:[1,1,1]);gl.uniform1i(u.uFamily,planet.family);gl.uniform3fv(u.uAtmosphereTint,tints[planet.family]);gl.uniform1f(u.uAtmosphereDensity,planet.profile.base.atmosphere);gl.uniform1f(u.uRelief,planet.profile.base.relief*.12);gl.uniform1f(u.uShadowQuality,tier>=2?1:.35);gl.uniform3fv(u.uStormCenter,planet.stormCenter);gl.uniform1f(u.uTexel,2/planet.size);gl.uniform1f(u.uTime,Number.isFinite(time)?time:0);planet.audioEnergy=visualAudio(planet.audioEnergy,audio,delta);
 // Audio V10 : paquet complet de l'hôte (2 vec4) ; sans paquet (anciens appelants), seul le niveau global existe et les phases suivent le temps.
 const au=fp?.aud?.u??(fallbackAudio[3]=planet.audioEnergy,fallbackAudio[5]=(Number.isFinite(time)?time:0)%WAVE_PERIOD,fallbackAudio[6]=(Number.isFinite(time)?time:0)%STORM_PERIOD,fallbackAudio[7]=1,fallbackAudio);
 gl.uniform4f(u.uAudA,au[0],au[1],au[2],au[3]);gl.uniform4f(u.uAudB,au[4],au[5],au[6],au[7]);
 gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
 const geometry=lod>=2;   // V10fp : sous 256 px à l'écran, les villes ne sont que des lumières dans la carte
 const reveal=fp?.reveal==null?1:fp.reveal,shown=geometry&&reveal>0;
 if(shown&&tier>=1&&planet.cityMesh&&cityProgram)cityProgram.draw(planet.cityMesh,mvp,light,growth*reveal);
 if(shown&&tier>=2&&growth>=1&&planet.landmarks&&cityProgram&&reveal>.15)cityProgram.draw(planet.landmarks,mvp,light,1,0,0,eye);
 if(shown&&tier>=2&&planet.vegetation&&cityProgram&&reveal>.15)cityProgram.draw(planet.vegetation,mvp,light,1,time,fp?.reduced?0:.65+.35*planet.audioEnergy,eye);
 if(fp?.living&&tier>=1&&planet.type==='earth'&&!livingBroken){
  if(planet.livingTier!==tier)void planet.loadLiving(tier,{flow:fp.flow!==false}).catch(e=>{console.warn('[PlanèteDot V10] living cities fallback:',e?.message||e);});
  if(shown&&planet.living){try{livingProgram??=createLivingProgram(gl);fp.draws=drawLiving(gl,livingProgram,planet.living,{mvp,eye,light,time,era:fp.era??5,growth:fp.growth??1,motion:fp.motion??1,wind:fp.wind??0,gain:fp.gain??1,focusCity:fp.focusCity??-1,focus:fp.focus??0,pop:fp.pop??0,reveal});}
  catch(e){livingBroken=true;console.warn('[PlanèteDot V10] living cities disabled:',e?.message||e);}}
 }
 if(fp?.traffic&&tier>=1&&planet.type==='earth'&&!trafficBroken){
  // V10fp interactions : préchauffage du programme et du tampon dès la vue lointaine (comme loadLiving), dessin seulement une fois la géométrie visible.
  try{if(!trafficProgram)trafficProgram=createTrafficProgram(gl);const mesh=planet.ensureTraffic(tier);if(shown&&mesh)fp.trafficDraws=drawTraffic(gl,trafficProgram,mesh,{mvp,eye,light,time,motion:fp.motion??1,era:fp.era??5,growth:fp.growth??1,focusCity:fp.focusCity??-1,focus:fp.focus??0});}
  catch(e){trafficBroken=true;console.warn('[PlanèteDot V10] traffic disabled:',e?.message||e);}
 }
 // Particules : palier 1 = 128 sans réaction au son ; palier 2+ = réaction aux aigus et gerbe sur grosse caisse forte ; palier 0 = rien. Un seul appel POINTS.
 if(geometry&&tier>=1&&fp?.part&&!fp.reduced&&!particlesBroken){
  try{particles??=createParticleProgram(gl)||false;
   if(particles){const pb=particleBudget(tier),reactive=pb.audio&&fp.partAudio!==false,A=fp.aud;
    fp.draws=(fp.draws||0)+particles.draw({mvp,light,time:Number.isFinite(time)?time:0,count:pb.count,px:Math.max(.8,Math.min(2.2,viewPx/520)),reactive,high:reactive?au[2]:0,burstAge:reactive&&A?A.burstAge:9,burstSeed:A?.burstSeed??0,tint:tints[planet.family]});
    if(vao)gl.bindVertexArray(vao);}}
  catch(e){particlesBroken=true;console.warn('[PlanèteDot V10] particles disabled:',e?.message||e);}}
 });
 },
 dispose(){if(!disposed){disposed=true;for(const mesh of meshes.values())mesh.dispose();meshes.clear();gl.deleteTexture(neutral);if(vao)gl.deleteVertexArray(vao);cityProgram?.dispose();livingProgram?.dispose();trafficProgram?.dispose();particles?.dispose();p.dispose();}}
 };
}
// Uploaded planets are caller-owned and must be disposed separately.
