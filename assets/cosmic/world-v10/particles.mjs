// V10 audio : particules (poussières, braises) sur la planète focalisée. Un seul appel gl.POINTS, aucun buffer par image,
// aucune texture. Palier 0 : rien ; palier 1 : 128 sans réaction au son ; palier 2+ : 256 / 512, aigus + gerbe sur grosse caisse forte.
// Positions et mouvements calculés dans le vertex shader à partir de 4 nombres fixes par particule ; l'audio ne déplace rien de façon permanente.
import {shaderSource,isWebGL2} from './gl-compat.mjs';
export const PARTICLE_MAX=512;
const VS=`attribute vec4 aSeed;
uniform mat4 uMVP;uniform vec3 uLight;uniform float uTime;uniform float uPx;uniform float uCount;
uniform vec4 uPart;uniform vec3 uTint;
varying float vA;varying vec3 vC;
float h1(float x){return fract(sin(x*127.1+311.7)*43758.5453);}
void main(){
 float a=aSeed.x*6.2831853,z=aSeed.y*2.-1.,r=sqrt(max(0.,1.-z*z));
 vec3 d=vec3(r*cos(a),z,r*sin(a));
 float h=1.012+.05*aSeed.z;
 float burstable=step(aSeed.w,.06);
 float size=1.2+1.6*aSeed.z;
 float alpha=.2+.3*aSeed.w;
 // dérive lente (rotation autour de l'axe), très lente : jamais pilotée par l'audio
 float ang=uTime*(.01+.03*aSeed.w)*(aSeed.z>.5?1.:-1.);float c=cos(ang),s=sin(ang);d=vec3(c*d.x+s*d.z,d.y,-s*d.x+c*d.z);
 float vis=1.-burstable;
 if(burstable>.5){
  // gerbe de 8 à 24 particules : visible seulement après une grosse caisse forte, part d'un point de la planète et retombe en ~2 s
  float age=uPart.z,bs=uPart.w;
  float ba=h1(bs*7.31)*6.2831853,bz=h1(bs*3.17)*2.-1.,br=sqrt(max(0.,1.-bz*bz));
  vec3 o=vec3(br*cos(ba),bz,br*sin(ba));
  vec3 t=normalize(cross(abs(o.y)>.9?vec3(1.,0.,0.):vec3(0.,1.,0.),o)),b=cross(o,t);
  float spread=aSeed.x*6.2831853,sp=.04+.10*aSeed.y;
  d=normalize(o+(t*cos(spread)+b*sin(spread))*sp*(1.-exp(-age*2.2)));
  h=1.006+.07*(1.-exp(-age*2.6))*(.5+aSeed.z);
  vis=step(age,2.4)*exp(-age*1.5);
  size*=1.8;alpha=.85;
 }
 float lit=.3+.7*smoothstep(-.15,.45,dot(d,normalize(uLight)));
 float react=1.+1.5*uPart.x*uPart.y;   // aigus : jusqu'à ×2,5, seulement au palier 2+
 vA=alpha*lit*vis*react;
 vC=mix(vec3(1.),uTint,.6);
 gl_PointSize=max(1.,size*uPx*(1.+.35*uPart.x*uPart.y));
 gl_Position=uMVP*vec4(d*h,1.);
}`;
const FS=`precision mediump float;varying float vA;varying vec3 vC;
void main(){float f=smoothstep(.5,.05,length(gl_PointCoord-.5));float a=clamp(vA,0.,1.)*f;gl_FragColor=vec4(vC*a,a);}`;
// Générateur déterministe (mulberry32) : mêmes particules à chaque lancement, sans hasard du navigateur.
function seeds(n){const out=new Float32Array(n*4);let t=0x9e3779b9;for(let i=0;i<out.length;i++){t=(t+0x6d2b79f5)|0;let x=Math.imul(t^(t>>>15),1|t);x=(x+Math.imul(x^(x>>>7),61|x))^x;out[i]=((x^(x>>>14))>>>0)/4294967296;}return out;}
export function createParticleProgram(gl){
 if(!isWebGL2(gl))return null;   // gl_PointSize + attributs seuls : WebGL2 uniquement, comme le compositeur V10
 const web2=true,shaders=[];let program=null,buffer=null,vao=null;
 function compile(type,src){const s=gl.createShader(type);if(!s)throw Error('Particle shader allocation');shaders.push(s);gl.shaderSource(s,shaderSource(src,type===gl.VERTEX_SHADER?'vertex':'fragment',web2));gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Particle shader');return s;}
 try{
  program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,VS));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Particle link');
  buffer=gl.createBuffer();vao=gl.createVertexArray();if(!buffer||!vao)throw Error('Particle buffer allocation');
  const loc=gl.getAttribLocation(program,'aSeed');
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,seeds(PARTICLE_MAX),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,4,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
 }catch(e){if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);if(vao)gl.deleteVertexArray(vao);throw e;}finally{for(const s of shaders)gl.deleteShader(s);}
 const U=Object.fromEntries(['uMVP','uLight','uTime','uPx','uCount','uPart','uTint'].map(n=>[n,gl.getUniformLocation(program,n)]));
 return {bytes:PARTICLE_MAX*16,
  // Appelé à l'intérieur de la passe V10 (cible hors écran, test de profondeur actif). Rétablit blend et masque de profondeur.
  draw({mvp,light,time,count,px,reactive,high,burstAge,burstSeed,tint}){
   if(!(count>0))return 0;const wasBlend=gl.isEnabled(gl.BLEND);
   gl.useProgram(program);gl.bindVertexArray(vao);
   gl.uniformMatrix4fv(U.uMVP,false,mvp);gl.uniform3fv(U.uLight,light);gl.uniform3fv(U.uTint,tint);gl.uniform1f(U.uTime,time);gl.uniform1f(U.uPx,px);gl.uniform1f(U.uCount,count);
   gl.uniform4f(U.uPart,reactive?1:0,high,burstAge,burstSeed);
   gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.ONE,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   gl.drawArrays(gl.POINTS,0,Math.min(PARTICLE_MAX,count|0));
   gl.depthMask(true);if(!wasBlend)gl.disable(gl.BLEND);return 1;
  },
  dispose(){if(program){gl.deleteProgram(program);gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);program=null;}}};
}
