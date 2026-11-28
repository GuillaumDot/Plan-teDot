// Based on Work's M31 shader. No asset fetch until explicit opt-in + galaxy map.
// PIA08787 display-derived R=Spitzer 24um, G=GALEX UV (combined B/G). Not photometry.
export const M31_CREDIT='NASA/JPL-Caltech — PIA08787 (Spitzer/GALEX)';
const vertex=`#version 300 es
layout(location=0) in vec2 a;
uniform mat4 uVP;
out vec2 vDisc;
void main(){vDisc=a;gl_Position=uVP*vec4(a.x*125.,-1.8,a.y*108.,1.);}`;
const fragment=`#version 300 es
precision highp float;
in vec2 vDisc;out vec4 color;
uniform sampler2D uM31;uniform float uTime;
void main(){
 vec2 signals=texture(uM31,.5+.5*vDisc).rg;
 float r=length(vDisc);
 float veil=1.+.09*sin(dot(vDisc,vec2(4.,-7.))+.13*uTime+5.*r);
 vec3 dust=vec3(.92,.41,.18)*signals.r;
 vec3 uv=vec3(.21,.43,.95)*signals.g*veil;
 color=vec4((dust*.48+uv*.38)*(1.-smoothstep(.88,1.,r)),0.);
}`;
export async function loadAndromeda(gl){
 if(typeof gl.createVertexArray!=='function')throw Error('M31 requires WebGL2');
 const img=new Image();img.src=new URL('./spitzer-galex.png',import.meta.url).href;
 await img.decode();
 if(gl.isContextLost())throw Error('M31 context lost');
 if(img.width!==512||img.height!==512)throw Error('M31 texture must be 512x512');
 const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('M31 canvas unavailable');
 ctx.drawImage(img,0,0);
 const rgba=ctx.getImageData(0,0,img.width,img.height).data,rg=new Uint8Array(img.width*img.height*2);
 for(let i=0,j=0;i<rgba.length;i+=4){rg[j++]=rgba[i];rg[j++]=rgba[i+1];}
 let program=null,texture=null;const shaders=[];
 try{
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
   const shader=gl.createShader(type);if(!shader)throw Error('M31 shader allocation');shaders.push(shader);
   gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
  }
  program=gl.createProgram();if(!program)throw Error('M31 program allocation');
  shaders.forEach(shader=>gl.attachShader(program,shader));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  texture=gl.createTexture();if(!texture)throw Error('M31 texture allocation');
  const previous=gl.getParameter(gl.TEXTURE_BINDING_2D),alignment=gl.getParameter(gl.UNPACK_ALIGNMENT);
  try{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RG8,img.width,img.height,0,gl.RG,gl.UNSIGNED_BYTE,rg);
   gl.generateMipmap(gl.TEXTURE_2D);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   if(gl.getError()!==gl.NO_ERROR)throw Error('M31 upload failed');
  }finally{gl.bindTexture(gl.TEXTURE_2D,previous);gl.pixelStorei(gl.UNPACK_ALIGNMENT,alignment);}
  const u=Object.fromEntries(['uM31','uVP','uTime'].map(n=>[n,gl.getUniformLocation(program,n)]));
  return {draw(quad,vp,time){
   if(!texture||gl.isContextLost())throw Error('M31 unavailable');
   // Host galaxy pass owns program/VAO/blend. Explicit unit 1 fixes Work's binding mismatch.
   gl.useProgram(program);gl.bindVertexArray(quad);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.uniform1i(u.uM31,1);gl.uniformMatrix4fv(u.uVP,false,vp);gl.uniform1f(u.uTime,time);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
   gl.bindTexture(gl.TEXTURE_2D,null);gl.activeTexture(gl.TEXTURE0);
  },dispose(){if(texture)gl.deleteTexture(texture);if(program)gl.deleteProgram(program);texture=program=null;}};
 }catch(e){if(texture)gl.deleteTexture(texture);if(program)gl.deleteProgram(program);throw e;}
 finally{shaders.forEach(shader=>gl.deleteShader(shader));}
}
