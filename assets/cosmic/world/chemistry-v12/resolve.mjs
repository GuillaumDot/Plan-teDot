// Original contextual rules. Local tangent-plane coordinates, consistent units.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function resolve({walls=[],paths=[],buildings=[],terrain,water=()=>false,humidity=0,stage=0,solid=true}){
 if(!solid)return [];
 const out=[]; const emit=(kind,id,data)=>out.push({kind,id,...data});
 const cross=(a,b)=>a[0]*b[1]-a[1]*b[0]; const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
 for(const w of walls){const r=sub(w.b,w.a),len=Math.hypot(...r);if(!len)continue;
 for(const p of paths){const s=sub(p.b,p.a),d=cross(r,s);if(Math.abs(d)<1e-8)continue;const q=sub(p.a,w.a),t=cross(q,s)/d,u=cross(q,r)/d;if(t<=0||t>=1||u<0||u>1)continue;
 const width=p.width*Math.hypot(...s)*len/Math.abs(d),half=Math.min(t,1-t)*len; if(width/2>half)continue;
 emit(w.height<1.2?'gate':w.height<3?'lintel':'arch',`${w.id}:${p.id}`,{wall:w.id,t,width,height:Math.min(w.height*.8,Math.max(1,width)),base:terrain([w.a[0]+r[0]*t,w.a[1]+r[1]*t]),pillars:width>3});}
 }
 for(const p of paths){const n=16;let wet=[];for(let i=0;i<=n;i++){const t=i/n,q=p.a.map((x,j)=>x+(p.b[j]-x)*t);wet.push(water(q));}for(let i=0;i<=n;i++){if(!wet[i])continue;let j=i;while(j<n&&wet[j+1])j++;if(i>0&&j<n)emit('bridge',`${p.id}:${i}`,{path:p.id,from:(i-1)/n,to:(j+1)/n});i=j;}
 const len=Math.hypot(...sub(p.b,p.a));if(len&& !wet.some(Boolean)){const rise=terrain(p.b)-terrain(p.a);if(Math.abs(rise)/len>.25)emit('stairs',p.id,{count:Math.min(64,Math.ceil(Math.abs(rise)/.18)),rise});}}
 for(const b of buildings){const corners=b.corners||[];if(!corners.length)continue;const h=corners.map(terrain),base=Math.max(...h);emit('foundation',b.id,{base,posts:h.map(x=>base-x)});if(humidity>.6&&stage>.2)emit('ivy',b.id,{coverage:clamp(humidity*stage*.65,0,.65)});}
 return out.sort((a,b)=>a.id.localeCompare(b.id)||a.kind.localeCompare(b.kind));}
