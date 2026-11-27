import {cellOf} from '../natural-world-v22/world.mjs';
import {MODEL_TRIANGLE_BUDGET} from './static-glb.mjs';
import {assertTextureGL} from './texture-guard.mjs';
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);};
export function landmarkGeometry(world,model){
 const out=[];let instances=0;
 if(world.type!=='earth'||!model?.triangles)return {vertices:new Float32Array(),instances};
 const extent=Math.max(...model.max.map((x,i)=>x-model.min[i]));
 if(!Number.isFinite(extent)||extent<=0)return {vertices:new Float32Array(),instances};
 const scale=.012/extent,size=world.size,area=size*size;
 for(const city of world.natural?.cities??[]){
  if(instances>=4||(instances+1)*model.triangles>MODEL_TRIANGLE_BUDGET)break;
  const n=norm(city.dir),t=norm(cross(Math.abs(n[1])>.9?[1,0,0]:[0,1,0],n)),b=cross(t,n);
  const d=norm(n.map((x,i)=>x+t[i]*.020));const cell=cellOf(d,size),data=world.terrain[Math.floor(cell/area)],offset=(cell%area)*4;
  if(!data||data[offset+1]>=64||data[offset+2]>=128)continue;
  const right=norm(cross(Math.abs(d[1])>.9?[1,0,0]:[0,1,0],d)),forward=cross(right,d);
  for(let i=0;i<model.vertices.length;i+=7){
   const a=model.vertices,x=(a[i]-(model.min[0]+model.max[0])/2)*scale,y=(a[i+1]-model.min[1])*scale,z=(a[i+2]-(model.min[2]+model.max[2])/2)*scale;
   const p=d.map((q,k)=>q*(1-.0004+y)+right[k]*x+forward[k]*z);
   const normal=d.map((q,k)=>right[k]*a[i+3]+q*a[i+4]+forward[k]*a[i+5]);
   out.push(...p,...normal,a[i+6]);
  }
  instances++;
 }
 return {vertices:new Float32Array(out),instances};
}
export function uploadLandmarks(gl,world,model){
 const {vertices,instances}=landmarkGeometry(world,model);if(!instances)return null;
 const old=gl.getParameter(gl.ARRAY_BUFFER_BINDING);let buffer;
 try{buffer=gl.createBuffer();if(!buffer)throw Error('Landmark allocation failed');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);assertTextureGL(gl,'Landmark upload');}
 catch(e){if(buffer)gl.deleteBuffer(buffer);throw e;}finally{gl.bindBuffer(gl.ARRAY_BUFFER,old);}
 return {buffer,instances,count:vertices.length/7,buildings:0,buildingVertices:0,dispose(){if(buffer){gl.deleteBuffer(buffer);buffer=null;}}};
}
