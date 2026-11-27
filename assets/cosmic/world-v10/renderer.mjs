import {loadPlanetProgram} from './program.mjs';
import {uploadSphere,SPHERE_LODS} from './sphere.mjs';
import {uploadWorldMaps} from './gpu-maps.mjs';
import {ARCHETYPES,planetProfile} from './archetypes.mjs';
import {loadTerrainAlbedo,loadEarthDetailAtlas} from './terrain-texture.mjs';
import {assertTextureGL} from './texture-guard.mjs';
import {visualAudio} from './visual-audio.mjs';
import {createCityProgram,uploadCities} from './cities.mjs';
import {loadCityModels} from './static-glb.mjs';
import {uploadLandmarks} from './landmarks.mjs';
const families=Object.keys(ARCHETYPES);
const tints=[[.18,.45,1],[.12,.65,1],[.45,.38,.3],[1,.25,.08],[.4,.7,1],[.9,.65,.4],[.5,.3,1]];
// Dedicated context or caller-managed GL state. No animation loop is created.
export async function createPlanetRenderer(gl){
 if(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)<3)throw new Error('Three fragment samplers required');
 const p=await loadPlanetProgram(gl),meshes=new Map();let disposed=false,neutral=null,cityProgram=null;
 try{
 const previous=gl.getParameter(gl.TEXTURE_BINDING_2D);
 try{neutral=gl.createTexture();if(!neutral)throw Error('Detail fallback allocation failed');gl.bindTexture(gl.TEXTURE_2D,neutral);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,128,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);assertTextureGL(gl,'Detail fallback');}finally{gl.bindTexture(gl.TEXTURE_2D,previous);}
 }catch(e){if(neutral)gl.deleteTexture(neutral);p.dispose();throw e;}
 try{cityProgram=createCityProgram(gl);}catch(e){console.warn('City shader fallback:',e.message);}
 return {
 upload(world){if(disposed)throw new Error('Renderer disposed');const profile=planetProfile(world.type),maps=uploadWorldMaps(gl,world);let alive=true,revision=0,landmarkRevision=0,cityMesh=null;
 if(cityProgram)try{cityMesh=uploadCities(gl,world);}catch(e){console.warn('City mesh fallback:',e.message);}
 const planet={maps,profile,type:world.type,family:families.indexOf(world.type),size:world.size,detail:null,audioEnergy:0,cityMesh,landmarks:null,
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
 planet.detail?.dispose();planet.detail=asset;return !!asset;
 },
 dispose(){if(!alive)return;alive=false;revision++;planet.detail?.dispose();planet.detail=null;cityMesh?.dispose();planet.cityMesh=null;planet.landmarks?.dispose();planet.landmarks=null;maps.dispose();}
 };return planet;},
 draw(planet,{mvp,eye=[0,0,3],light=[-.45,.35,.82],tier=2,time=0,audio=0,delta=1/60,detailStrength=.8,growth=1}){
 if(disposed||gl.isContextLost())return;
 tier=Math.max(0,Math.min(3,Math.trunc(tier)||0));if(!meshes.has(tier))meshes.set(tier,uploadSphere(gl,...SPHERE_LODS[tier]));
 const mesh=meshes.get(tier),u=p.uniforms;
 gl.useProgram(p.program);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertex);gl.enableVertexAttribArray(p.position);gl.vertexAttribPointer(p.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_CUBE_MAP,planet.maps.terrain);gl.uniform1i(u.uTerrain,0);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_CUBE_MAP,planet.maps.climate);gl.uniform1i(u.uClimate,1);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,planet.detail?.texture??neutral);gl.uniform1i(u.uDetail,2);gl.uniform1f(u.uDetailAtlas,planet.detail?.atlas?1:0);gl.uniform1f(u.uDetailInset,planet.detail?.atlas?0.5/planet.detail.width:0);gl.uniform1f(u.uDetailStrength,planet.detail?Math.max(0,Math.min(1,Number(detailStrength)||0)):0);
 gl.uniformMatrix4fv(u.uMVP,false,mvp);gl.uniform3fv(u.uEye,eye);gl.uniform3fv(u.uLight,light);gl.uniform1i(u.uFamily,planet.family);gl.uniform3fv(u.uAtmosphereTint,tints[planet.family]);gl.uniform1f(u.uAtmosphereDensity,planet.profile.base.atmosphere);gl.uniform1f(u.uRelief,planet.profile.base.relief*.08);gl.uniform1f(u.uShadowQuality,tier>=2?1:0);gl.uniform1f(u.uTexel,2/planet.size);gl.uniform1f(u.uTime,Number.isFinite(time)?time:0);planet.audioEnergy=visualAudio(planet.audioEnergy,audio,delta);gl.uniform1f(u.uAudio,planet.audioEnergy);
 gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
 if(tier>=2&&planet.cityMesh&&cityProgram)cityProgram.draw(planet.cityMesh,mvp,light,growth);
 if(tier>=2&&growth>=1&&planet.landmarks&&cityProgram)cityProgram.draw(planet.landmarks,mvp,light,1);
 },
 dispose(){if(!disposed){disposed=true;for(const mesh of meshes.values())mesh.dispose();meshes.clear();gl.deleteTexture(neutral);cityProgram?.dispose();p.dispose();}}
 };
}
// Uploaded planets are caller-owned and must be disposed separately.
