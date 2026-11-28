import {BIOMES,hash4,cellOf} from '../natural-world-v22/world.mjs';
import {decodeStaticGLB,MODEL_VERTEX_STRIDE} from './static-glb.mjs';
import {assertTextureGL} from './texture-guard.mjs';
import {trackResource} from './resource-registry.mjs';
export const VEGETATION_BUDGET=6000;
export const VEGETATION_PATHS=Object.freeze(Object.fromEntries(['broadleaf','pine','cactus'].map(k=>[k,'assets/cosmic/world/expansion-v14/models/'+k+'-01.glb'])));
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return a.map(x=>x/l);};
export function vegetationSites(w){
 if(!w)return [];
 const f=w.fields,candidates=[],n=BIOMES.length;
 for(let c=0;c<w.cells;c++){
  if(f.water[c]!==0||f.slope[c]>.8)continue;
  const a=f.weights.subarray(c*n,(c+1)*n);
  const weight=name=>a[BIOMES.indexOf(name)]??0;
  const scores=[weight('temperate_forest')+weight('rainforest')+weight('wetland')*.5,weight('tundra')*.3+weight('taiga')*.9,weight('desert')+weight('savanna')*.35];
  const k=scores.indexOf(Math.max(...scores));if(scores[k]<.38||k!==2&&f.npp[c]<250)continue;
  const dir=Array.from(f.dir.subarray(c*3,c*3+3));
  if(w.cities.some(city=>dot(city.dir,dir)>.999))continue;
  candidates.push({cell:c,dir,kind:['broadleaf','pine','cactus'][k],rank:hash4(c,w.seed,89,11)});
 }
 candidates.sort((a,b)=>a.rank-b.rank);
 const selected=[];
 // Reserve opportunities for each supported biome, then use the shared cap.
 for(const kind of ['broadleaf','pine','cactus'])for(const p of candidates){
  if(p.kind!==kind||selected.filter(s=>s.kind===kind).length>=12)continue;
  if(selected.some(s=>dot(s.dir,p.dir)>.997))continue;
  selected.push({cell:p.cell,dir:p.dir,kind});
 }
 return selected;
}
export async function loadVegetationModels({signal}={}){
 const models={};
 for(const [kind,path] of Object.entries(VEGETATION_PATHS)){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  try{const r=await fetch(new URL('../../../'+path,import.meta.url),{signal});if(!r.ok)throw Error('Vegetation HTTP '+r.status);const buf=await r.arrayBuffer();models[kind]=decodeStaticGLB(buf,{maxTriangles:VEGETATION_BUDGET});trackResource(path,'ready',buf.byteLength);}
  catch(e){if(signal?.aborted)throw e;trackResource(path,'failed');console.warn('Vegetation fallback:',kind,e.message);}
 }
 return models;
}
export function vegetationGeometry(world,models){
 const out=[];let instances=0,triangles=0;const kinds={};
 if(world.type!=='earth')return {vertices:new Float32Array(),instances,triangles,kinds};
 const size=world.size,area=size*size;
 const sites=world.natural?.vegetation??[];
 // Give every selected site a first tree before adding neighbouring trees.
 const expanded=[...sites];
 for(const site of sites){
  if(site.kind==='cactus')continue;
  const n=norm(site.dir),t=norm(cross(Math.abs(n[1])>.9?[1,0,0]:[0,1,0],n)),b=cross(n,t);
  for(const sign of [-1,1])expanded.push({...site,dir:norm(n.map((x,i)=>x+sign*.009*t[i]+.006*b[i]))});
 }
 for(const site of expanded){
  const m=models[site.kind];if(!m||triangles+m.triangles>VEGETATION_BUDGET||instances>=48)continue;
  const d=norm(site.dir),cell=cellOf(d,size),a=world.terrain[Math.floor(cell/area)],i=cell%area*4;
  if(!a||a[i+1]>=64||a[i+2]>=128)continue;
  const right=norm(cross(Math.abs(d[1])>.9?[1,0,0]:[0,1,0],d)),forward=cross(right,d);
  const extent=Math.max(...m.max.map((x,k)=>x-m.min[k]));if(!(extent>0))continue;
  const scale=(site.kind==='cactus'?.004:.006)/extent;
  for(let i=0;i<m.vertices.length;i+=MODEL_VERTEX_STRIDE){
   const a=m.vertices,x=(a[i]-(m.min[0]+m.max[0])/2)*scale,y=(a[i+1]-m.min[1])*scale,z=(a[i+2]-(m.min[2]+m.max[2])/2)*scale;
   const p=d.map((q,k)=>q*(1-.0003+y)+right[k]*x+forward[k]*z);
   const normal=d.map((q,k)=>right[k]*a[i+3]+q*a[i+4]+forward[k]*a[i+5]);
   out.push(...p,...normal,a[i+6]<0?a[i+6]:-.9,...a.subarray(i+7,i+MODEL_VERTEX_STRIDE));
  }
  triangles+=m.triangles;instances++;kinds[site.kind]=(kinds[site.kind]??0)+1;
 }
 return {vertices:new Float32Array(out),instances,triangles,kinds};
}
export function uploadVegetation(gl,world,models){
 const {vertices,instances,triangles,kinds}=vegetationGeometry(world,models);if(!instances)return null;
 const old=gl.getParameter(gl.ARRAY_BUFFER_BINDING);let buffer;
 try{buffer=gl.createBuffer();if(!buffer)throw Error('Vegetation allocation failed');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);assertTextureGL(gl,'Vegetation upload');}
 catch(e){if(buffer)gl.deleteBuffer(buffer);throw e;}finally{gl.bindBuffer(gl.ARRAY_BUFFER,old);}
 return {buffer,count:vertices.length/MODEL_VERTEX_STRIDE,stride:MODEL_VERTEX_STRIDE,instances,triangles,kinds,buildings:0,buildingVertices:0,dispose(){if(buffer){gl.deleteBuffer(buffer);buffer=null;}}};
}
