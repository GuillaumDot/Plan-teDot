import {cellOf} from '../natural-world-v22/world.mjs';
import {MODEL_TRIANGLE_BUDGET,MODEL_VERTEX_STRIDE} from './static-glb.mjs';
import {assertTextureGL} from './texture-guard.mjs';
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);};
export function landmarkKind(city,index){
 if(city.port||city.river)return 'factory';
 return index%3===1?'tower':'cottage';
}
export function landmarkGeometry(world,models){
 const out=[];let instances=0,triangles=0;const kinds={};
 if(world.type!=='earth'||!models)return {vertices:new Float32Array(),instances,triangles,kinds};
 const size=world.size,area=size*size;
 for(const [index,city] of (world.natural?.cities??[]).entries()){
  if(instances>=4)break;
  const requested=landmarkKind(city,index),kind=models.triangles?'cottage':models[requested]?requested:'cottage';
  const model=models.triangles?models:models[kind];
  if(!model?.triangles||triangles+model.triangles>MODEL_TRIANGLE_BUDGET)continue;
  const extent=Math.max(...model.max.map((x,i)=>x-model.min[i]));
  if(!Number.isFinite(extent)||extent<=0||!Array.isArray(city.dir)||!city.dir.every(Number.isFinite)||Math.hypot(...city.dir)<.1)continue;
  const scale=(kind==='tower'?.019:kind==='factory'?.016:.012)/extent;
  const n=norm(city.dir),t=norm(cross(Math.abs(n[1])>.9?[1,0,0]:[0,1,0],n)),b=cross(t,n);
  const d=norm(n.map((x,i)=>x+t[i]*.020));const cell=cellOf(d,size),data=world.terrain[Math.floor(cell/area)],offset=(cell%area)*4;
  if(!data||data[offset+1]>=64||data[offset+2]>=128)continue;
  const right=norm(cross(Math.abs(d[1])>.9?[1,0,0]:[0,1,0],d)),forward=cross(right,d);
  for(let i=0;i<model.vertices.length;i+=MODEL_VERTEX_STRIDE){
   const a=model.vertices,x=(a[i]-(model.min[0]+model.max[0])/2)*scale,y=(a[i+1]-model.min[1])*scale,z=(a[i+2]-(model.min[2]+model.max[2])/2)*scale;
   const p=d.map((q,k)=>q*(1-.0004+y)+right[k]*x+forward[k]*z);
   const normal=d.map((q,k)=>right[k]*a[i+3]+q*a[i+4]+forward[k]*a[i+5]);
   out.push(...p,...normal,...a.subarray(i+6,i+MODEL_VERTEX_STRIDE));
  }
  instances++;triangles+=model.triangles;kinds[kind]=(kinds[kind]??0)+1;
 }
 return {vertices:new Float32Array(out),instances,triangles,kinds};
}
export function uploadLandmarks(gl,world,model){
 const {vertices,instances,triangles,kinds}=landmarkGeometry(world,model);if(!instances)return null;
 const old=gl.getParameter(gl.ARRAY_BUFFER_BINDING);let buffer;
 try{buffer=gl.createBuffer();if(!buffer)throw Error('Landmark allocation failed');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);assertTextureGL(gl,'Landmark upload');}
 catch(e){if(buffer)gl.deleteBuffer(buffer);throw e;}finally{gl.bindBuffer(gl.ARRAY_BUFFER,old);}
 return {buffer,instances,triangles,kinds,count:vertices.length/MODEL_VERTEX_STRIDE,stride:MODEL_VERTEX_STRIDE,buildings:0,buildingVertices:0,dispose(){if(buffer){gl.deleteBuffer(buffer);buffer=null;}}};
}
