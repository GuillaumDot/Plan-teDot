// WebGL reports allocation/upload failures through getError rather than exceptions.
// Do not silently accept incomplete textures. The caller owns the GL error queue.
export function assertTextureGL(gl,stage){
 if(gl.isContextLost())throw new Error(stage+': WebGL context lost');
 const error=gl.getError();
 if(error!==gl.NO_ERROR)throw new Error(stage+': WebGL error 0x'+error.toString(16));
}
