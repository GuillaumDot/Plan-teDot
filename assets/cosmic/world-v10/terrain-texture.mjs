import {resolveTerrain} from './catalog.mjs';
import {assertTextureGL} from './texture-guard.mjs';
export async function loadTerrainAlbedo(gl,type,biome,{maxSize=512,signal}={}){
 const asset=resolveTerrain(type,biome);if(!asset)return null;
 const url=new URL('../../../'+asset.albedo,import.meta.url);
 const response=await fetch(url,{signal});if(!response.ok)throw new Error('Terrain HTTP '+response.status);
 const bitmap=await createImageBitmap(await response.blob());
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
 try{texture=gl.createTexture();if(!texture)throw new Error('Texture allocation failed');gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);assertTextureGL(gl,'Terrain upload');}finally{gl.bindTexture(gl.TEXTURE_2D,old);}
 return {texture,biome:asset.resolved,fallback:asset.fallback,width:canvas.width,height:canvas.height,bytes:canvas.width*canvas.height*4,dispose(){if(texture){gl.deleteTexture(texture);texture=null;}}};
 }catch(e){if(texture)gl.deleteTexture(texture);throw e;}finally{bitmap.close?.();}
}
// Caller owns texture unit, color conversion, caching and context restoration.
