import {resource,trackResource} from './resource-registry.mjs';
import {checkTierMemorySafety} from './gemini-cosmic-manifest.mjs';
import {decodeTerrainImage,withTerrainUnpack} from './terrain-texture.mjs';
// One 2D atlas on one sampler. Fixed cells have one texel of padding on all sides.
// Only enabled data is downloaded. All requests settle before the single GL upload.
export const MASKS={
  cosmicArtProfilesV1:[['cloud','pack.atmosphere','cloud_00.png'],['lava','pack.fx','lava_00.png'],['vent','pack.fx','eruption_00.png']]
};
export function planMasks(flags,tier) {
  const entries=Object.entries(MASKS).flatMap(([key,rows])=>flags[key]?rows:[]);
  const grid=Math.ceil(Math.sqrt(entries.length))||1, tile=tier===0?32:64, side=grid*tile;
  const defs=entries.map(([name],i)=>'#define PD_'+name.toUpperCase()+' vec2('+ (i%grid).toFixed(1)+','+Math.floor(i/grid).toFixed(1)+')').join('\n');
  return {entries,side,tile,bytes:entries.length?side*side*4:0,defs:defs+'\n#define PD_GRID '+grid.toFixed(1)+'\n#define PD_TILE '+tile.toFixed(1)};
}
export const MASK_SHADER=`uniform sampler2D uCosmicMasks;
uniform float uCosmicMasksReady;
vec3 pdMask(vec2 cell,vec2 uv,vec3 fallback){
  vec2 coord=(cell+(clamp(uv,0.,1.)*(PD_TILE-3.)+1.5)/PD_TILE)/PD_GRID;
  return mix(fallback,texture2D(uCosmicMasks,coord).rgb,uCosmicMasksReady);
}
vec2 pdSphereUV(vec3 n){return vec2(atan(n.z,n.x)*.15915494+.5,asin(clamp(n.y,-1.,1.))*.31830989+.5);}`;
export async function loadMasks(gl,plan,signal) {
  if(!plan.bytes)return null;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=plan.side;
  const c=canvas.getContext('2d'),grid=plan.side/plan.tile;
  await Promise.all(plan.entries.map(async ([,id,file],i)=>{
    const path=resource(id).dir+file,url=new URL('../../../'+path,import.meta.url);
    const response=await fetch(url,{signal});if(!response.ok)throw Error('Mask HTTP '+response.status);
    const blob=await response.blob(),image=await decodeTerrainImage(blob);
    try{c.drawImage(image,i%grid*plan.tile+1,Math.floor(i/grid)*plan.tile+1,plan.tile-2,plan.tile-2);}
    finally{image.close?.();}trackResource(path,'ready',blob.size);
  }));
  if(signal.aborted||gl.isContextLost())return null;
  const old=gl.getParameter(gl.TEXTURE_BINDING_2D),texture=gl.createTexture();
  if(!texture)throw Error('Cosmic atlas allocation');
  try{gl.bindTexture(gl.TEXTURE_2D,texture);
    withTerrainUnpack(gl,()=>gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,canvas));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    if(gl.getError()!==gl.NO_ERROR)throw Error('Cosmic atlas upload');
    return {texture,bytes:plan.bytes,dispose:()=>gl.deleteTexture(texture)};
  }catch(e){gl.deleteTexture(texture);throw e;}finally{gl.bindTexture(gl.TEXTURE_2D,old);}
}
