// V10fp — villes procédurales vivantes (pack cosmique v18 : expansion-v14, 24 familles × 8 variantes).
// Placement déterministe à partir des données du générateur (natural-world-v22 : villes, routes, ponts, ports),
// apparition par ère et par écoute, instancing strict (un appel de dessin par famille/variante), aucun hit-testing.
import {faceDir,cellOf,hash4} from '../natural-world-v22/world.mjs';
import {decodeStaticGLB,MODEL_VERTEX_STRIDE} from './static-glb.mjs';
import {eligible,lod as livingLod} from '../world/expansion-v14/living.mjs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(a[0],a[1],a[2]);return l>1e-9?[a[0]/l,a[1]/l,a[2]/l]:null;};
const add=(a,b,k)=>[a[0]+b[0]*k,a[1]+b[1]*k,a[2]+b[2]*k];
// Règles de placement (famille, ère minimale 0..5 = ST_OF, taille angulaire, éclairage de nuit).
// minEra suit les ères de PlanèteDot : 1 village, 2 bourg, 3 ville, 4 métropole, 5 âge spatial.
export const LIVING_RULES=Object.freeze({
 market:{era:1,size:.0045,glow:1},water_tower:{era:1,size:.004,glow:.3},lighthouse:{era:1,size:.0045,glow:1},
 monument:{era:2,size:.005,glow:.6},greenhouse:{era:2,size:.0045,glow:.8},harbor_crane:{era:2,size:.0055,glow:.4},
 rail_station:{era:3,size:.005,glow:1},bridge:{era:3,size:.007,glow:.5},road_vehicle:{era:3,size:.0022,glow:.7,moving:1},
 cargo_ship:{era:3,size:.006,glow:.5,moving:1,sea:1},wind_turbine:{era:3,size:.006,glow:.2},solar_array:{era:3,size:.005,glow:0},
 train:{era:4,size:.004,glow:.8,moving:1},stadium:{era:4,size:.008,glow:1},
 observatory:{era:5,size:.006,glow:.5},satellite_dish:{era:5,size:.0045,glow:.3},launch_pad:{era:5,size:.007,glow:.6},space_beacon:{era:5,size:.005,glow:1}
});
// Familles de nature du pack (arbres, arches, flèches de glace, évents) : gérées par vegetation.mjs / Phase 2.
// Échelle lisible au gros plan (le monde V10 est cuit à 128 px par face : une maquette, pas une carte à l'échelle).
export const LIVING_SCALE=2.4,LIVING_SPREAD=1.5;
export const LIVING_FAMILIES=Object.freeze(Object.keys(LIVING_RULES));
// Palier V10 → variantes par famille, instances max, triangles max. Palier 0 : rien (lumières de la carte seulement).
export const LIVING_TIER=Object.freeze([{variants:0,instances:0,triangles:0},{variants:1,instances:96,triangles:5000},{variants:2,instances:192,triangles:12000},{variants:4,instances:320,triangles:24000}]);
export const livingTier=t=>LIVING_TIER[Math.max(0,Math.min(3,Math.trunc(t)||0))];
export const modelPath=(family,variant)=>'assets/cosmic/world/expansion-v14/models/'+family+'-0'+(1+variant)+'.glb';
function climate(city){const t=city.tempC??12,p=city.precipMm??700;return t<0?'cold':p<350&&t>12?'arid':'temperate';}
export function livingPlacement(world,{tier=3}={}){
 const w=world?.natural,N=w?.grid,cfg=livingTier(tier);
 if(world?.type!=='earth'||!Number.isInteger(N)||!cfg.instances||!Array.isArray(w.cities))return [];
 const size=world.size,A=size*size,seed=(world.seed??0)|0;
 const texel=n=>{const c=cellOf(n,size);return world.terrain?.[Math.floor(c/A)]?.subarray?.((c%A)*4,(c%A)*4+4)??world.terrain?.[Math.floor(c/A)]?.slice((c%A)*4,(c%A)*4+4);};
 const land=n=>{const t=texel(n);return !!t&&t[1]<64&&t[2]<128;};
 const water=n=>{const t=texel(n);return !!t&&t[1]>192;};
 const dirOf=c=>Number.isInteger(c)&&c>=0&&c<6*N*N?faceDir(Math.floor(c/(N*N)),2*(c%N+.5)/N-1,2*(Math.floor((c%(N*N))/N)+.5)/N-1,[0,0,0]):null;
 const out=[];const taken=[];
 const variantOf=(family,key)=>{const v=Math.max(1,cfg.variants);return Math.floor(hash4(key,LIVING_FAMILIES.indexOf(family),seed,71)*v)%v;};
 const free=d=>taken.every(t=>dot(t,d)<.9999);
 function put(family,d,key,extra={}){
  const r=LIVING_RULES[family];if(!d||!r)return false;
  const biome=extra.biome??'temperate';if(!eligible({biomes:['temperate','arid','cold']},{solid:true,biome,stage:r.era}))return false;
  if(!extra.allowClose&&!free(d))return false;taken.push(d);
  out.push({family,variant:variantOf(family,key),dir:d,to:extra.to??d,size:r.size*LIVING_SCALE*(extra.scale??1),era:r.era,glow:r.glow,moving:r.moving?1:0,yaw:hash4(key,seed,13,5)*Math.PI*2,phase:hash4(key,seed,29,3),city:extra.city??-1,rank:hash4(key,seed,41,LIVING_FAMILIES.indexOf(family))});
  return true;
 }
 // Point sur la couronne d'une ville (hors du centre déjà occupé par les immeubles de cities.mjs).
 function ring(city,k,dist,want=land){
  dist*=LIVING_SPREAD;
  const n=norm(city.dir),t=norm(cross(Math.abs(n[1])>.9?[1,0,0]:[0,1,0],n)),b=cross(n,t);
  for(let i=0;i<8;i++){const a=(k*2.399+i*.785+hash4(city.cell,k,seed,3)*6.28),d=norm(add(add(n,t,Math.cos(a)*dist),b,Math.sin(a)*dist));if(want(d)&&free(d))return d;}
  return null;
 }
 const cities=w.cities.slice(0,16).filter(c=>Array.isArray(c.dir)&&c.dir.length===3&&c.dir.every(Number.isFinite));
 const bySuit=cities.map((c,i)=>[c,i]).sort((a,b)=>(b[0].suit??0)-(a[0].suit??0));
 cities.forEach((c,i)=>{
  const biome=climate(c),key=c.cell;
  put('market',ring(c,0,.012),key*3+1,{city:i,biome});
  if(i<12)put('water_tower',ring(c,1,.014),key*3+2,{city:i,biome});
  if(biome!=='arid'&&biome!=='cold'&&i<10)put('greenhouse',ring(c,2,.017),key*3+3,{city:i,biome});
  if(c.port){
   // Phare sur la dernière terre avant l'eau, grues sur le quai, cargo au large.
   const coast=ring(c,3,.02,d=>land(d)&&[.006,.01].some(s=>{const n=norm(c.dir),q=norm(add(d,add(d,n,-1),s/.02));return q&&water(q);}))??ring(c,3,.016);
   put('lighthouse',coast,key*5+1,{city:i,biome});
   put('harbor_crane',ring(c,4,.015),key*5+2,{city:i,biome});put('harbor_crane',ring(c,5,.016),key*5+3,{city:i,biome});
   const sea=ring(c,6,.035,water);if(sea){const far=ring(c,7,.06,water)??sea;put('cargo_ship',sea,key*5+4,{city:i,biome,to:far});}
  }
  if(c.river||c.port||i<6)put('rail_station',ring(c,8,.019),key*7+1,{city:i,biome});
  if(biome==='arid'){put('solar_array',ring(c,9,.03),key*7+2,{city:i,biome});put('solar_array',ring(c,10,.033),key*7+3,{city:i,biome});}
  else for(let k=0;k<3;k++)put('wind_turbine',ring(c,11+k,.032+k*.004),key*7+4+k,{city:i,biome});
 });
 const capital=bySuit[0]?.[0],ci=bySuit[0]?.[1];
 if(capital){put('monument',ring(capital,15,.009),capital.cell*11+1,{city:ci});put('space_beacon',ring(capital,16,.022),capital.cell*11+2,{city:ci});}
 bySuit.slice(0,3).forEach(([c,i],k)=>put('stadium',ring(c,17,.024),c.cell*13+k,{city:i}));
 bySuit.slice(0,2).forEach(([c,i],k)=>put('satellite_dish',ring(c,18,.027),c.cell*17+k,{city:i}));
 const cold=[...cities].sort((a,b)=>(a.tempC??0)-(b.tempC??0))[0];if(cold)put('observatory',ring(cold,19,.025),cold.cell*19,{city:cities.indexOf(cold)});
 const equator=cities.filter(c=>c.port).sort((a,b)=>Math.abs(a.dir[1])-Math.abs(b.dir[1]))[0];if(equator)put('launch_pad',ring(equator,20,.04),equator.cell*23,{city:cities.indexOf(equator)});
 // Ponts : là où le générateur fait franchir une rivière à une route, orientés selon la route.
 for(const br of (w.bridges??[]).slice(0,24)){const d=dirOf(br.cell),road=(w.roads??[]).find(r=>r.from===br.from&&r.to===br.to),k=road?.cells?.indexOf(br.cell)??-1,prev=k>0?dirOf(road.cells[k-1]):null;if(d)put('bridge',d,br.cell*29,{to:prev?norm(add(d,add(prev,d,-1),-1))??d:d,allowClose:true});}
 // Véhicules : uniquement sur une route existante (jamais sans route compatible), d'une cellule de la route à une autre.
 let v=0;for(const road of (w.roads??[]))for(let k=2;k<(road.cells?.length??0)-2&&v<24;k+=5){const a=dirOf(road.cells[k-2]),b=dirOf(road.cells[k+2]);if(a&&b&&land(a)&&land(b)&&dot(a,b)>.995&&put('road_vehicle',a,road.cells[k]*31,{to:b,allowClose:true}))v++;}
 let tr=0;for(const road of (w.roads??[]).filter(r=>(r.cells?.length??0)>12).slice(0,4)){const a=dirOf(road.cells[2]),b=dirOf(road.cells[Math.min(road.cells.length-3,12)]);if(a&&b&&dot(a,b)>.99&&put('train',a,road.cells[2]*37+tr,{to:b,allowClose:true}))tr++;}
 // Ordre d'apparition : par ère, puis rang déterministe. Plafond d'instances par palier.
 out.sort((a,b)=>a.era-b.era||a.rank-b.rank);
 return out.slice(0,cfg.instances);
}
// Regroupe par modèle : un appel de dessin instancié par (famille, variante).
export function livingBatches(instances){
 const map=new Map();
 for(const it of instances){const k=it.family+'-0'+(1+it.variant);if(!map.has(k))map.set(k,{key:k,family:it.family,variant:it.variant,items:[]});map.get(k).items.push(it);}
 return [...map.values()];
}
// Instances visibles d'un lot : ère atteinte, puis fraction de croissance (écoute).
export function visibleCount(items,era=0,growth=1){
 const g=Number.isFinite(growth)?Math.max(0,Math.min(1,growth)):0;let eligibleN=0;
 for(const it of items)if(it.era<=era)eligibleN++;
 return Math.min(eligibleN,Math.ceil(eligibleN*g));
}
export const LIVING_INSTANCE_FLOATS=16;
export function instanceData(items){
 const a=new Float32Array(items.length*LIVING_INSTANCE_FLOATS);
 items.forEach((it,i)=>{const o=i*LIVING_INSTANCE_FLOATS;a.set(it.dir,o);a[o+3]=it.size;a.set(it.to,o+4);a[o+7]=it.moving;a[o+8]=it.yaw;a[o+9]=it.phase;a[o+10]=it.glow;a[o+11]=it.city;a[o+12]=it.era;});
 return a;
}
// Modèle normalisé : centré en x/z, pied à y=0, plus grande dimension = 1.
export function normalizeModel(m){
 const ext=Math.max(...m.max.map((x,k)=>x-m.min[k]));if(!(ext>0))return null;
 const v=new Float32Array(m.vertices),cx=(m.min[0]+m.max[0])/2,cz=(m.min[2]+m.max[2])/2;
 for(let i=0;i<v.length;i+=MODEL_VERTEX_STRIDE){v[i]=(v[i]-cx)/ext;v[i+1]=(v[i+1]-m.min[1])/ext;v[i+2]=(v[i+2]-cz)/ext;}
 return {vertices:v,triangles:m.triangles};
}
export function livingBytes(models,instances){let b=0;for(const m of Object.values(models))b+=m.vertices.byteLength;return b+instances*LIVING_INSTANCE_FLOATS*4;}
// Chargement à la demande (premier gros plan, palier ≥ 1), séquentiel, annulable, plafonné en triangles.
export async function loadLivingModels(batches,{signal,tier=1,fetcher=fetch}={}){
 const cfg=livingTier(tier),models={};let tris=0;
 for(const b of batches){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  try{const r=await fetcher(new URL('../../../'+modelPath(b.family,b.variant),import.meta.url),{signal});if(!r.ok)throw Error('HTTP '+r.status);
   const m=normalizeModel(decodeStaticGLB(await r.arrayBuffer(),{maxTriangles:2000}));if(!m||tris+m.triangles>cfg.triangles)continue;tris+=m.triangles;models[b.key]=m;}
  catch(e){if(signal?.aborted)throw e;console.warn('[PlanèteDot V10] living model fallback:',b.key,e.message);}
 }
 return models;
}
export {livingLod};
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in float aTone;layout(location=3) in vec4 aMaterial;
layout(location=4) in vec4 iA;layout(location=5) in vec4 iB;layout(location=6) in vec4 iMeta;layout(location=7) in vec4 iMeta2;
uniform mat4 uMVP;uniform vec3 uEye;uniform float uTime;uniform float uMotion;uniform float uWind;uniform float uReveal;uniform float uFocusCity;uniform float uFocus;uniform float uPop;uniform vec3 uLightV;
out vec3 vNormal;out vec3 vRadial;out vec4 vMaterial;out float vTone;out float vGlow;out float vFocus;
void main(){
 vec3 a=normalize(iA.xyz),b=normalize(iB.xyz);
 // Circulation (living.mjs activity : trafic × (0,25 + 0,75 × jour)) : deux horloges continues, mélangées selon la nuit au départ du trajet.
 float tD=.5-.5*cos(6.2831853*fract(iMeta.y+uTime*uMotion*.035)),tN=.5-.5*cos(6.2831853*fract(iMeta.y+uTime*uMotion*.009));
 float nightA=1.-smoothstep(-.1,.15,dot(a,normalize(uLightV)));float t=iB.w>.5?mix(tD,tN,nightA):0.;
 vec3 up=normalize(mix(a,b,t));vec3 ref=abs(up.y)>.9?vec3(1.,0.,0.):vec3(0.,1.,0.);
 vec3 fw=iB.w>.5&&length(b-a)>1e-5?normalize(b-a-up*dot(b-a,up)):normalize(cross(ref,up));
 vec3 rt=normalize(cross(up,fw));if(iB.w<.5){float c=cos(iMeta.x),s=sin(iMeta.x);vec3 r2=rt*c+fw*s;fw=rt*-s+fw*c;rt=r2;}
 float sc=iA.w*(1.+.35*uPop*step(abs(iMeta.w-uFocusCity),.5));
 vec3 p=aPosition;if(aTone<0.&&uWind>0.){p.x+=sin(uTime*1.6+iMeta.y*40.)*p.y*p.y*.18*uWind;}
 vec3 world=up*(1.-.0006+p.y*sc)+rt*p.x*sc+fw*p.z*sc;
 vNormal=rt*aNormal.x+up*aNormal.y+fw*aNormal.z;vRadial=up;vMaterial=aMaterial;vTone=aTone;vGlow=iMeta.z;vFocus=uFocus*step(abs(iMeta.w-uFocusCity),.5);
 gl_Position=dot(up,normalize(uEye))<-.05?vec4(2.,2.,2.,1.):uMVP*vec4(world,1.);   // face cachée : éliminée avant le rastériseur
}`;
const FS=`#version 300 es
precision mediump float;
in vec3 vNormal;in vec3 vRadial;in vec4 vMaterial;in float vTone;in float vGlow;in float vFocus;
uniform vec3 uLight;uniform vec3 uSodium;uniform vec3 uLed;uniform float uGain;out vec4 o;
void main(){vec3 l=normalize(uLight);float day=max(dot(normalize(vNormal),l),0.);float night=1.-smoothstep(-.12,.12,dot(normalize(vRadial),l));
 vec3 c=vMaterial.rgb*(.22+.95*day);float win=vTone>.40&&vTone<.44?1.:.18;
 c+=mix(uSodium,uLed,step(.9,vGlow))*night*vGlow*win*.55*uGain;c+=uSodium*vFocus*(.25+.5*night)*win;o=vec4(c,1.);}`;
export function createLivingProgram(gl){
 if(typeof WebGL2RenderingContext==='undefined'||!(gl instanceof WebGL2RenderingContext))throw Error('Living cities require WebGL2');
 const shaders=[];let program=null;
 try{for(const [type,src] of [[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,FS]]){const s=gl.createShader(type);if(!s)throw Error('Living shader allocation failed');shaders.push(s);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));}
  program=gl.createProgram();for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 }catch(e){if(program)gl.deleteProgram(program);throw e;}finally{for(const s of shaders)gl.deleteShader(s);}
 const U=Object.fromEntries(['uMVP','uEye','uTime','uMotion','uWind','uReveal','uLight','uSodium','uLed','uGain','uFocusCity','uFocus','uPop','uLightV'].map(n=>[n,gl.getUniformLocation(program,n)]));
 return {program,U,dispose(){if(program){gl.deleteProgram(program);program=null;}}};
}
// Envoi GPU : un VAO + deux tampons par lot. Retourne null s'il n'y a rien.
export function uploadLiving(gl,instances,models){
 const batches=[];let bytes=0;const oldVAO=gl.getParameter(gl.VERTEX_ARRAY_BINDING),oldArray=gl.getParameter(gl.ARRAY_BUFFER_BINDING);
 try{for(const b of livingBatches(instances)){const m=models[b.key];if(!m)continue;
  const vao=gl.createVertexArray(),vb=gl.createBuffer(),ib=gl.createBuffer();if(!vao||!vb||!ib)throw Error('Living allocation failed');
  const inst=instanceData(b.items);gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,m.vertices,gl.STATIC_DRAW);const S=MODEL_VERTEX_STRIDE*4;
  for(const [loc,n,off] of [[0,3,0],[1,3,12],[2,1,24],[3,4,28]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,S,off);gl.vertexAttribDivisor(loc,0);}
  gl.bindBuffer(gl.ARRAY_BUFFER,ib);gl.bufferData(gl.ARRAY_BUFFER,inst,gl.STATIC_DRAW);
  for(let k=0;k<4;k++){gl.enableVertexAttribArray(4+k);gl.vertexAttribPointer(4+k,4,gl.FLOAT,false,LIVING_INSTANCE_FLOATS*4,k*16);gl.vertexAttribDivisor(4+k,1);}
  bytes+=m.vertices.byteLength+inst.byteLength;batches.push({...b,vao,vb,ib,count:m.vertices.length/MODEL_VERTEX_STRIDE});}
 }catch(e){for(const b of batches){gl.deleteVertexArray(b.vao);gl.deleteBuffer(b.vb);gl.deleteBuffer(b.ib);}throw e;}
 finally{gl.bindVertexArray(oldVAO);gl.bindBuffer(gl.ARRAY_BUFFER,oldArray);}
 if(!batches.length)return null;
 return {batches,bytes,instances:batches.reduce((s,b)=>s+b.items.length,0),dispose(){for(const b of batches){gl.deleteVertexArray(b.vao);gl.deleteBuffer(b.vb);gl.deleteBuffer(b.ib);}batches.length=0;}};
}
const SODIUM=[1,.702,.353],LED=[.875,.91,1];   // #ffb35a et #dfe8ff (Dot Visuels), jamais le bleu d'interface
export function drawLiving(gl,prog,mesh,{mvp,eye,light,time=0,era=0,growth=1,motion=1,wind=0,gain=1,focusCity=-1,focus=0,pop=0}){
 if(!mesh||!prog?.program)return 0;let draws=0;const oldVAO=gl.getParameter(gl.VERTEX_ARRAY_BINDING),U=prog.U;
 gl.useProgram(prog.program);gl.uniformMatrix4fv(U.uMVP,false,mvp);gl.uniform3fv(U.uEye,eye);gl.uniform3fv(U.uLight,light);gl.uniform1f(U.uTime,time);gl.uniform1f(U.uMotion,motion);gl.uniform1f(U.uWind,wind);gl.uniform1f(U.uGain,gain);gl.uniform3fv(U.uSodium,SODIUM);gl.uniform3fv(U.uLed,LED);gl.uniform1f(U.uFocusCity,focusCity);gl.uniform1f(U.uFocus,focus);gl.uniform1f(U.uPop,pop);gl.uniform3fv(U.uLightV,light);
 for(const b of mesh.batches){const n=visibleCount(b.items,era,growth);if(!n)continue;gl.bindVertexArray(b.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,b.count,n);draws++;}
 gl.bindVertexArray(oldVAO);return draws;
}
