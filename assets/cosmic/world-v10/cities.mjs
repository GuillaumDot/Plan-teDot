import {cellOf} from '../natural-world-v22/world.mjs';
import {infrastructureGeometry} from './infrastructure.mjs';
import {assertTextureGL} from './texture-guard.mjs';
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);};
const shift=(a,b,k)=>a.map((x,i)=>x+b[i]*k);
// Build central sites first across every city, then progressively fill the outskirts.
const BUILD_ORDER=Object.freeze([4,1,3,5,7,0,2,6,8]);
export function growthDrawCount(buildings,progress){
 const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):1;
 return Math.floor(Math.max(0,buildings)*p)*30;
}
export function cityGeometry(world){
 const vertices=[];let buildings=0;
 if(world.type!=='earth'||!world.natural?.cities)return {vertices:new Float32Array(),buildings};
 const size=world.size,area=size*size;
 function onLand(dir){
  const c=cellOf(dir,size),face=Math.floor(c/area),i=(c%area)*4;
  const data=world.terrain[face];return data&&data[i+1]<64&&data[i+2]<128;
 }
 for(const j of BUILD_ORDER)for(const city of world.natural.cities.slice(0,16)){
  if(!Array.isArray(city.dir)||city.dir.length!==3||!city.dir.every(Number.isFinite)||Math.hypot(...city.dir)<.1)continue;
  const n=norm(city.dir),t=norm(cross(Math.abs(n[1])>.9?[1,0,0]:[0,1,0],n)),b=cross(n,t);
   const x=(j%3-1)*.007,y=(Math.floor(j/3)-1)*.007;
   const d=norm(shift(shift(n,t,x),b,y));if(!onLand(d))continue;
   const u=norm(shift(t,d,-dot(t,d))),v=cross(d,u);
   // Low, wide structures at the edge contrast with central towers.
   const industrial=j===8&&(city.port||city.river);
   const width=industrial?.0025:.0017+((city.cell+j*13)%5)*.00017;
   const height=industrial?.003:.004+((city.cell+j*17)%7)*.001+(j===4?.007:0);
   const point=(a,c,z)=>shift(shift(d.map(q=>q*(1+z)),u,a*width),v,c*width);
   const q=[point(-1,-1,-.0006),point(1,-1,-.0006),point(1,1,-.0006),point(-1,1,-.0006),point(-1,-1,height),point(1,-1,height),point(1,1,height),point(-1,1,height)];
   const face=(ids,normal,tone)=>{for(const i of [0,1,2,0,2,3])vertices.push(...q[ids[i]],...normal,tone);};
   face([4,5,6,7],d,.75);face([0,1,5,4],v.map(x=>-x),.54);face([1,2,6,5],u,.63);face([2,3,7,6],v,.54);face([3,0,4,7],u.map(x=>-x),.63);
   buildings++;
 }
 return {vertices:new Float32Array(vertices),buildings};
}
export function uploadCities(gl,world){
 const city=cityGeometry(world),infra=infrastructureGeometry(world),{buildings}=city;
 if(!buildings&&!infra.vertices.length)return null;
 const vertices=new Float32Array(city.vertices.length+infra.vertices.length);vertices.set(city.vertices);vertices.set(infra.vertices,city.vertices.length);
 const old=gl.getParameter(gl.ARRAY_BUFFER_BINDING);let buffer;
 try{buffer=gl.createBuffer();if(!buffer)throw Error('City allocation failed');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);assertTextureGL(gl,'City mesh');}
 catch(e){if(buffer)gl.deleteBuffer(buffer);throw e;}finally{gl.bindBuffer(gl.ARRAY_BUFFER,old);}
 return {buffer,count:vertices.length/7,buildingVertices:city.vertices.length/7,buildings,roads:infra.roads,bridges:infra.bridges,ports:infra.ports,dispose(){if(buffer){gl.deleteBuffer(buffer);buffer=null;}}};
}
export function createCityProgram(gl){
 const shaders=[];let program;
 try{
  for(const [type,source] of [[gl.VERTEX_SHADER,'attribute vec3 aPosition;attribute vec3 aNormal;attribute float aTone;attribute vec4 aMaterial;varying vec4 vMaterial;uniform mat4 uMVP;uniform float uWindTime;uniform float uWindStrength;varying vec3 vNormal;varying vec3 vRadial;varying float vTone;void main(){vNormal=aNormal;vRadial=normalize(aPosition);vTone=aTone;vMaterial=aMaterial;vec3 p=aPosition; if(aTone<0. && uWindStrength>0.){vec3 radial=normalize(p);vec3 axis=vec3(.6,.1,.8);vec3 tangent=axis-radial*dot(axis,radial);float height=max(length(p)-1.,0.);float gust=sin(uWindTime*1.6+dot(radial,vec3(19.,31.,13.)))+.35*sin(uWindTime*3.1+dot(radial,vec3(7.,-11.,23.)));p+=tangent*min(height,.008)*.18*gust*uWindStrength;}gl_Position=uMVP*vec4(p,1.); }'],[gl.FRAGMENT_SHADER,'precision mediump float;uniform vec3 uLight;uniform vec3 uEye;uniform float uHasMaterial;varying vec4 vMaterial;varying vec3 vNormal;varying vec3 vRadial;varying float vTone;void main(){vec3 l=normalize(uLight);float day=max(dot(normalize(vNormal),l),0.);float night=1.-smoothstep(-.18,.1,dot(normalize(vRadial),l));vec3 c=vec3(.55,.59,.65)*vTone*(.12+.88*day)+vec3(.95,.52,.15)*night*.19;if(vTone<0.){c=mix(vec3(.16,.32,.095),vec3(.23,.13,.065),smoothstep(.5,.9,-vTone))*(.15+.85*day);}if(uHasMaterial>.5){vec3 N=normalize(vNormal);vec3 V=normalize(uEye-vRadial);vec3 halfV=l+V;vec3 H=halfV/max(length(halfV),.001);float rough=clamp(vMaterial.a,.08,1.);float spec=pow(max(dot(N,H),0.),mix(80.,5.,rough))*day*(1.-rough)*.45;c=vMaterial.rgb*(.12+.88*day)+vec3(spec);if(vTone>.40&&vTone<.44)c+=vec3(.9,.49,.13)*night*.16;}gl_FragColor=vec4(c,1.); }']]){
   const s=gl.createShader(type);if(!s)throw Error('City shader allocation failed');shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
  }
  program=gl.createProgram();if(!program)throw Error('City program allocation failed');for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const attrs=['aPosition','aNormal','aTone'].map(n=>gl.getAttribLocation(program,n));const m=gl.getUniformLocation(program,'uMVP'),l=gl.getUniformLocation(program,'uLight'),wt=gl.getUniformLocation(program,'uWindTime'),ws=gl.getUniformLocation(program,'uWindStrength'),mat=gl.getAttribLocation(program,'aMaterial'),has=gl.getUniformLocation(program,'uHasMaterial'),eye=gl.getUniformLocation(program,'uEye');
  return {draw(mesh,mvp,light,growth=1,windTime=0,windStrength=0,viewer=[0,0,3]){gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);for(let i=0;i<3;i++){gl.enableVertexAttribArray(attrs[i]);gl.vertexAttribPointer(attrs[i],i===2?1:3,gl.FLOAT,false,(mesh.stride??7)*4,[0,12,24][i]);}const colored=mesh.stride===11;if(colored){gl.enableVertexAttribArray(mat);gl.vertexAttribPointer(mat,4,gl.FLOAT,false,44,28);}else{gl.disableVertexAttribArray(mat);gl.vertexAttrib4f(mat,1,1,1,.8);}gl.uniform1f(has,colored?1:0);gl.uniform3fv(eye,viewer);gl.uniformMatrix4fv(m,false,mvp);gl.uniform3fv(l,light);gl.uniform1f(wt,Number.isFinite(windTime)?windTime:0);gl.uniform1f(ws,Math.max(0,Math.min(1,Number.isFinite(windStrength)?windStrength:0)));const count=growthDrawCount(mesh.buildings,growth);
   if(count===mesh.buildingVertices){gl.drawArrays(gl.TRIANGLES,0,mesh.count);}else if(count>0){gl.drawArrays(gl.TRIANGLES,0,count);}for(const i of attrs)gl.disableVertexAttribArray(i);gl.disableVertexAttribArray(mat);},dispose(){if(program){gl.deleteProgram(program);program=null;}}};
 }catch(e){if(program)gl.deleteProgram(program);throw e;}finally{for(const s of shaders)gl.deleteShader(s);}
}
