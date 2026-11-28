import {resolveTerrain} from './catalog.mjs';
import {assertTextureGL} from './texture-guard.mjs';
import {isWebGL2} from './gl-compat.mjs';
import {trackResource} from './resource-registry.mjs';
const isPOT=n=>n>0&&(n&(n-1))===0;
// WebKit may reject createImageBitmap for otherwise valid image blobs.
async function decodeTerrainImage(blob){
 if(typeof createImageBitmap==='function'){try{return await createImageBitmap(blob);}catch(_){}}
 const url=URL.createObjectURL(blob);
 try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Terrain image decode failed'));img.src=url;});}
 finally{URL.revokeObjectURL(url);}
}
// Shared pixel-store state: uploads must not inherit the legacy logo/atlas settings.
function withTerrainUnpack(gl,fn){
 const keys=[gl.UNPACK_FLIP_Y_WEBGL,gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,gl.UNPACK_ALIGNMENT,gl.UNPACK_COLORSPACE_CONVERSION_WEBGL];
 const old=keys.map(k=>gl.getParameter(k));
 try{[false,false,4,gl.NONE].forEach((v,i)=>gl.pixelStorei(keys[i],v));return fn();}
 finally{keys.forEach((k,i)=>gl.pixelStorei(k,old[i]));}
}
export async function loadTerrainAlbedo(gl,type,biome,{maxSize=512,signal,channel='albedo'}={}){
 const asset=resolveTerrain(type,biome);if(!asset)return null;
 if(!['albedo','height'].includes(channel))throw new RangeError('Invalid terrain channel');
 const url=new URL('../../../'+asset[channel],import.meta.url);
 const response=await fetch(url,{signal});if(!response.ok){trackResource(asset[channel],'failed');throw new Error('Terrain HTTP '+response.status);}
 const blob=await response.blob();trackResource(asset[channel],'ready',blob.size);
 const bitmap=await decodeTerrainImage(blob);
 let texture=null;
 try{
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const cap=Math.min(maxSize,gl.getParameter(gl.MAX_TEXTURE_SIZE));
 if(!Number.isFinite(cap)||cap<1)throw new RangeError('Invalid texture cap');
 const scale=Math.min(1,cap/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(bitmap.width*scale));canvas.height=Math.max(1,Math.floor(bitmap.height*scale));
 canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
 assertTextureGL(gl,'Before terrain upload');
 const old=gl.getParameter(gl.TEXTURE_BINDING_2D);
 try{texture=gl.createTexture();if(!texture)throw new Error('Texture allocation failed');gl.bindTexture(gl.TEXTURE_2D,texture);withTerrainUnpack(gl,()=>gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas));const mip=isWebGL2(gl)||(isPOT(canvas.width)&&isPOT(canvas.height));if(mip)gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mip?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);assertTextureGL(gl,'Terrain upload');}finally{gl.bindTexture(gl.TEXTURE_2D,old);}
 return {texture,biome:asset.resolved,fallback:asset.fallback,width:canvas.width,height:canvas.height,bytes:Math.ceil(canvas.width*canvas.height*4*4/3),dispose(){if(texture){gl.deleteTexture(texture);texture=null;}}};
 }catch(e){if(texture)gl.deleteTexture(texture);throw e;}finally{bitmap.close?.();}
}
// Caller owns texture unit, color conversion, caching and context restoration.

// A single bounded atlas for four terrestrial detail materials. Canvas rows
// are uploaded without Y flipping: the first row corresponds to v=0.
export const EARTH_DETAIL_TILES=Object.freeze(['tropical','desert','alpine','polar']);
export async function loadEarthDetailAtlas(gl,{maxSize=256,signal,channel='albedo'}={}){
 if(!['albedo','height'].includes(channel))throw new RangeError('Invalid atlas channel');
 const cap=Math.min(maxSize,gl.getParameter(gl.MAX_TEXTURE_SIZE));
 if(!Number.isFinite(cap)||cap<2)throw new RangeError('Invalid atlas cap');
 const tile=Math.floor(cap/2),size=tile*2;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Atlas canvas unavailable');
 for(const [i,biome] of EARTH_DETAIL_TILES.entries()){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const asset=resolveTerrain('earth',biome);
  const response=await fetch(new URL('../../../'+asset[channel],import.meta.url),{signal});
  if(!response.ok){trackResource(asset[channel],'failed');throw Error('Atlas '+biome+' HTTP '+response.status);}
  const blob=await response.blob();trackResource(asset[channel],'ready',blob.size);
  const bitmap=await decodeTerrainImage(blob);
  try{ctx.drawImage(bitmap,(i%2)*tile,Math.floor(i/2)*tile,tile,tile);}finally{bitmap.close?.();}
 }
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 assertTextureGL(gl,'Before detail atlas');
 const old=gl.getParameter(gl.TEXTURE_BINDING_2D),flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
 let texture=null;
 try{
  texture=gl.createTexture();if(!texture)throw Error('Atlas allocation failed');
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  withTerrainUnpack(gl,()=>gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas));
  // Atlas tiles share borders: retain bilinear filtering until padded mip levels exist.
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  assertTextureGL(gl,'Earth detail atlas');
  return {texture,atlas:true,width:size,height:size,bytes:size*size*4,dispose(){if(texture){gl.deleteTexture(texture);texture=null;}}};
 }catch(e){if(texture)gl.deleteTexture(texture);throw e;}finally{gl.bindTexture(gl.TEXTURE_2D,old);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);}
}

// Same layout as the corresponding albedo texture, with independent ownership.
export function loadTerrainHeight(gl,type,biome,{atlas=false,...options}={}){
 return atlas&&type==='earth'?loadEarthDetailAtlas(gl,{...options,channel:'height'}):loadTerrainAlbedo(gl,type,biome,{...options,channel:'height'});
}
