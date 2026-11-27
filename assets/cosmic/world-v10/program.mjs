const vertex=`attribute vec3 aPosition;
uniform mat4 uMVP;
varying vec3 vDirection;
void main(){vDirection=aPosition;gl_Position=uMVP*vec4(aPosition,1.);}`;
export async function loadPlanetProgram(gl){
 const sources=await Promise.all(['materials.glsl','relief-atmosphere.glsl','planet-fragment.glsl'].map(async name=>{const r=await fetch(new URL(name,import.meta.url));if(!r.ok)throw new Error(name+': HTTP '+r.status);return r.text();}));
 const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision?'highp':'mediump';
 const shaders=[];let program=null;
 function compile(type,source){const s=gl.createShader(type);if(!s)throw new Error('Shader allocation failed');shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader compile failed');return s;}
 try{
 const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,'precision '+precision+' float;\n'+sources.join('\n'));
 program=gl.createProgram();if(!program)throw new Error('Program allocation failed');gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Program link failed');
 const uniforms=Object.fromEntries(['uMVP','uTerrain','uClimate','uDetail','uDetailStrength','uFamily','uLight','uEye','uAtmosphereTint','uAtmosphereDensity','uRelief','uTexel','uTime','uAudio'].map(n=>[n,gl.getUniformLocation(program,n)]));
 return {program,uniforms,position:gl.getAttribLocation(program,'aPosition'),dispose(){if(program){gl.deleteProgram(program);program=null;}}};
 }catch(e){if(program)gl.deleteProgram(program);throw e;}finally{for(const s of shaders)gl.deleteShader(s);}
}
