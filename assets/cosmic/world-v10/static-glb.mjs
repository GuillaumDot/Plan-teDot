// Restricted glTF 2.0 reader for our static, embedded, indexed triangle models.
// No external buffers, compression, skins, animation or texture decoding.
import {trackResource} from './resource-registry.mjs';
export const MODEL_TRIANGLE_BUDGET=12000;
export const MODEL_VERTEX_STRIDE=11;
const clamp01=x=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):1;
export const CITY_MODEL_PATH='assets/cosmic/world/world-v11/cottage-00.glb';
export const CITY_MODEL_PATHS=Object.freeze({cottage:CITY_MODEL_PATH,tower:'assets/cosmic/world/world-v11/tower-00.glb',factory:'assets/cosmic/world/world-v11/factory-00.glb'});
const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mul(a,b){return Array.from({length:16},(_,i)=>{const col=i>>2,row=i%4;return a[row]*b[col*4]+a[4+row]*b[col*4+1]+a[8+row]*b[col*4+2]+a[12+row]*b[col*4+3];});}
function point(m,p){return [0,1,2].map(i=>m[i]*p[0]+m[4+i]*p[1]+m[8+i]*p[2]+m[12+i]);}
const norm=a=>{const l=Math.hypot(...a);return l>1e-9?a.map(x=>x/l):[0,1,0];};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function decodeStaticGLB(buffer,{maxTriangles=MODEL_TRIANGLE_BUDGET}={}){
 const d=new DataView(buffer);
 if(d.byteLength<28||d.byteLength>4*1024*1024||d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==d.byteLength)throw Error('Invalid GLB');
 const length=d.getUint32(12,true),bin=20+length;
 if(bin+8>d.byteLength||d.getUint32(16,true)!==0x4e4f534a||d.getUint32(bin+4,true)!==0x004e4942||bin+8+d.getUint32(bin,true)!==d.byteLength)throw Error('Invalid GLB chunks');
 const j=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length)));
 if(j.buffers?.length!==1||j.buffers[0].uri||j.extensionsRequired?.length)throw Error('Unsupported GLB buffers/extensions');
 function accessor(index,type,allowed){
  const a=j.accessors?.[index],v=j.bufferViews?.[a?.bufferView];
  if(!a||!v||a.type!==type||!allowed.includes(a.componentType)||a.sparse||v.buffer!==0||!Number.isInteger(a.count)||a.count<1)throw Error('Unsupported GLB accessor');
  const count=type==='VEC4'?4:type==='VEC3'?3:1,bytes=a.componentType===5121?1:a.componentType===5123?2:4,stride=v.byteStride??count*bytes,offset=(v.byteOffset??0)+(a.byteOffset??0),end=offset+(a.count-1)*stride+count*bytes;
  if(offset<0||stride<count*bytes||end>(v.byteOffset??0)+v.byteLength||end>d.getUint32(bin,true))throw Error('GLB accessor outside buffer');
  return {count:a.count,read(i){if(!Number.isInteger(i)||i<0||i>=a.count)throw Error('GLB index outside accessor');const p=bin+8+offset+i*stride;return Array.from({length:count},(_,k)=>a.componentType===5126?d.getFloat32(p+k*bytes,true):a.componentType===5121?d.getUint8(p+k*bytes):a.componentType===5123?d.getUint16(p+k*bytes,true):d.getUint32(p+k*bytes,true));}};
 }
 const vertices=[];let triangles=0;
 function visit(index,parent,depth=0){
  if(depth>16)throw Error('GLB node depth');
  const n=j.nodes?.[index];if(!n||n.translation||n.rotation||n.scale||n.skin!==undefined)throw Error('Unsupported GLB node transform');
  const m=mul(parent,n.matrix??identity);
  if(n.mesh!==undefined)for(const p of j.meshes[n.mesh].primitives){
   if((p.mode??4)!==4||p.indices===undefined)throw Error('GLB requires indexed triangles');
   const positions=accessor(p.attributes.POSITION,'VEC3',[5126]),indices=accessor(p.indices,'SCALAR',[5123,5125]);
   if(indices.count%3||triangles+indices.count/3>maxTriangles)throw Error('GLB triangle budget exceeded');
   const mat=j.materials?.[p.material],material=mat?.name,pbr=mat?.pbrMetallicRoughness;
   const tone=material==='leaf'?-.45:material==='wood'?-.9:material==='glass'?.42:.73;
   const factor=pbr?.baseColorFactor??[1,1,1,1],roughness=clamp01(pbr?.roughnessFactor??.8);
   const ci=p.attributes.COLOR_0,ca=j.accessors?.[ci];
   if(ca&&(!['VEC3','VEC4'].includes(ca.type)||ca.count!==positions.count||(ca.componentType!==5126&&!ca.normalized)))throw Error('Invalid GLB vertex colors');
   const colors=ca?accessor(ci,ca.type,[5121,5123,5126]):null;
   const divisor=ca?.componentType===5121?255:ca?.componentType===5123?65535:1;
   for(let i=0;i<indices.count;i+=3){
    const ids=[0,1,2].map(k=>indices.read(i+k)[0]);const q=ids.map(id=>point(m,positions.read(id)));
    if(q.flat().some(x=>!Number.isFinite(x)))throw Error('Nonfinite GLB vertex');
    const normal=norm(cross(q[1].map((x,k)=>x-q[0][k]),q[2].map((x,k)=>x-q[0][k])));
    for(let k=0;k<3;k++){const rgb=colors?colors.read(ids[k]):[1,1,1];vertices.push(...q[k],...normal,tone,...[0,1,2].map(c=>clamp01(rgb[c]/divisor*factor[c])),roughness);}
    triangles++;
   }
  }
  for(const child of n.children??[])visit(child,m,depth+1);
 }
 for(const node of j.scenes?.[j.scene??0]?.nodes??[])visit(node,identity);
 if(!triangles)throw Error('Empty GLB');
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<vertices.length;i+=MODEL_VERTEX_STRIDE)for(let k=0;k<3;k++){min[k]=Math.min(min[k],vertices[i+k]);max[k]=Math.max(max[k],vertices[i+k]);}
 return {vertices:new Float32Array(vertices),triangles,min,max};
}
export async function loadCityModel({signal,kind='cottage'}={}){
 if(!Object.hasOwn(CITY_MODEL_PATHS,kind))throw new RangeError('Unknown city model');
 const response=await fetch(new URL('../../../'+CITY_MODEL_PATHS[kind],import.meta.url),{signal});
 if(!response.ok){trackResource(CITY_MODEL_PATHS[kind],'failed');throw Error('City GLB HTTP '+response.status);}
 const buffer=await response.arrayBuffer();if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const model=decodeStaticGLB(buffer);trackResource(CITY_MODEL_PATHS[kind],'ready',buffer.byteLength);return model;
}

export async function loadCityModels(options={}){
 const models={};
 for(const kind of Object.keys(CITY_MODEL_PATHS)){
  if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
  try{models[kind]=await loadCityModel({...options,kind});}catch(e){if(options.signal?.aborted)throw e;if(kind==='cottage')throw e;console.warn('Optional city model fallback:',kind,e.message);}
 }
 return models;
}
