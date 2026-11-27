import {faceDir,cellOf} from '../natural-world-v22/world.mjs';
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const l=Math.hypot(...a);return l>1e-9?a.map(x=>x/l):null;};
const add=(a,b,k)=>a.map((x,i)=>x+b[i]*k);
export const ROAD_SEGMENT_LIMIT=768;
export function infrastructureGeometry(world){
 const vertices=[];let roads=0,bridges=0,ports=0;
 const out=()=>({vertices:new Float32Array(vertices),roads,bridges,ports});
 const w=world.natural,N=w?.grid;
 if(world.type!=='earth'||!Number.isInteger(N)||N<8||N>128)return out();
 const area=N*N;
 function direction(c){
  if(!Number.isInteger(c)||c<0||c>=6*area)return null;
  return faceDir(Math.floor(c/area),2*(c%N+.5)/N-1,2*(Math.floor((c%area)/N)+.5)/N-1);
 }
 function ribbon(a,b,width,radius,tone){
  if(!a||!b)return false;
  const side=unit(cross(a,b));if(!side||dot(a,b)<.95)return false;
  const p=(n,k)=>unit(add(n,side,k*width)).map(x=>x*radius);
  const q=[p(a,-1),p(a,1),p(b,1),p(b,-1)];
  for(const i of [0,1,2,0,2,3])vertices.push(...q[i],...unit(q[i]),tone);
  return true;
 }
 const crossing=new Set((w.bridges??[]).map(b=>b.cell));
 const seen=new Set();
 for(const road of w.roads??[]){
  const cells=road.cells??[];
  for(let i=1;i<cells.length&&roads<ROAD_SEGMENT_LIMIT;i++){
   const a=cells[i-1],b=cells[i],key=a<b?a+'/'+b:b+'/'+a;if(seen.has(key))continue;
   const bridge=crossing.has(b)||crossing.has(a);
   if(ribbon(direction(a),direction(b),bridge?.0015:.0008,bridge?1.003:1.0017,bridge?.82:.28)){seen.add(key);roads++;if(bridge)bridges++;}
  }
  if(roads>=ROAD_SEGMENT_LIMIT)break;
 }
 // Ports are small piers only if a nearby sampled water cell exists.
 const size=world.size,A=size*size;
 function water(n){const c=cellOf(n,size),face=Math.floor(c/A);return (world.terrain[face]?.[(c%A)*4+1]??0)>192;}
 for(const city of (w.cities??[]).filter(c=>c.port).slice(0,16)){
  const a=direction(city.cell);if(!a||water(a))continue;
  const t=unit(cross(Math.abs(a[1])>.9?[1,0,0]:[0,1,0],a)),b=cross(a,t);
  let target=null;
  for(const distance of [.012,.024,.04,.06]){
   for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,n=unit(add(add(a,t,Math.cos(angle)*distance),b,Math.sin(angle)*distance));
    if(water(n)){target=n;break;}
   }
   if(target)break;
  }
  if(target&&ribbon(a,target,.002,1.0024,.68))ports++;
 }
 return out();
}
