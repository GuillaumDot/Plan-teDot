import {assertTextureGL} from './texture-guard.mjs';
// Caller owns texture unit allocation and shader sampler binding.
export function uploadWorldMaps(gl,world){
 const size=world.size;
 if(!Number.isInteger(size)||size<8||size>gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE))throw new RangeError('Unsupported cube size');
 for(const faces of [world.terrain,world.climate])if(faces.length!==6||faces.some(a=>!(a instanceof Uint8Array)||a.length!==size*size*4))throw new TypeError('Invalid cube data');
 assertTextureGL(gl,'Before world map upload');
 const previous=gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP),alignment=gl.getParameter(gl.UNPACK_ALIGNMENT),flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),premultiply=gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL),colorspace=gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL);
 const textures=[];
 try{
 gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
 for(const faces of [world.terrain,world.climate]){
 const t=gl.createTexture();if(!t)throw new Error('Texture allocation failed');textures.push(t);gl.bindTexture(gl.TEXTURE_CUBE_MAP,t);
 for(let i=0;i<6;i++)gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,gl.RGBA,size,size,0,gl.RGBA,gl.UNSIGNED_BYTE,faces[i]);
 for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_CUBE_MAP,p,gl.LINEAR);
 for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_CUBE_MAP,p,gl.CLAMP_TO_EDGE);
 assertTextureGL(gl,'World cube map upload');
 }
 }catch(e){textures.forEach(t=>gl.deleteTexture(t));throw e;}finally{
 gl.bindTexture(gl.TEXTURE_CUBE_MAP,previous);gl.pixelStorei(gl.UNPACK_ALIGNMENT,alignment);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,premultiply);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,colorspace);
 }
 let disposed=false;return {terrain:textures[0],climate:textures[1],bytes:world.bytes,dispose(){if(!disposed){disposed=true;textures.forEach(t=>gl.deleteTexture(t));}}};
}
// Renderer must check GL errors and available sampler slots, and recreate after context restoration.
