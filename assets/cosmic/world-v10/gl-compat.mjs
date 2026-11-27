// Convert our controlled GLSL ES 1.00 sources, not arbitrary third-party shaders.
export function isWebGL2(gl){return typeof gl.createVertexArray==='function'&&typeof gl.bindVertexArray==='function';}
export function shaderSource(source,stage,webgl2){
 if(!webgl2)return source;
 let code=source.replace(/\battribute\b/g,'in').replace(/\bvarying\b/g,stage==='vertex'?'out':'in').replace(/\btexture(?:2D|Cube)\b/g,'texture');
 if(stage==='fragment'){
  code=code.replace(/\bgl_FragColor\b/g,'pdFragment');
  const precision=/precision\s+(?:lowp|mediump|highp)\s+float\s*;/;
  if(!precision.test(code))throw Error('Fragment precision required');
  code=code.replace(precision,m=>m+'\nout vec4 pdFragment;');
 }
 return '#version 300 es\n'+code;
}
// VAO isolates index/attribute state. Host retains framebuffer, viewport,
// depth, blending, scissor and color mask; caller must configure those.
export function withSharedGL(gl,vao,draw){
 if(!vao)return draw();
 const oldVAO=gl.getParameter(gl.VERTEX_ARRAY_BINDING),oldProgram=gl.getParameter(gl.CURRENT_PROGRAM),oldArray=gl.getParameter(gl.ARRAY_BUFFER_BINDING),oldUnit=gl.getParameter(gl.ACTIVE_TEXTURE);
 const textures=[];
 try{
  for(let i=0;i<4;i++){gl.activeTexture(gl.TEXTURE0+i);textures.push([gl.getParameter(gl.TEXTURE_BINDING_2D),gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP),gl.getParameter(gl.SAMPLER_BINDING)]);gl.bindSampler(i,null);}
  gl.bindVertexArray(vao);
  return draw();
 }finally{
  gl.bindVertexArray(oldVAO);gl.bindBuffer(gl.ARRAY_BUFFER,oldArray);gl.useProgram(oldProgram);
  for(let i=0;i<textures.length;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i][0]);gl.bindTexture(gl.TEXTURE_CUBE_MAP,textures[i][1]);gl.bindSampler(i,textures[i][2]);}
  gl.activeTexture(oldUnit);
 }
}
