import {bakeWorld as bakeNatural,worldSample,BIOMES} from '../natural-world-v22/world.mjs';
import {baseWorld} from './base-worlds.mjs';
import {makeSurface} from './surface.mjs';
import {vegetationSites} from './vegetation.mjs';
import {WORLD_CONFIG} from './config.mjs';
// Fixed simulation grid: changing the GPU map resolution must not change geography.
export const NATURAL_GRID=64;
const routes={ice:'polar',tundra:'polar',taiga:'polar',temperate_forest:'tropical',grassland:'tropical',desert:'desert',savanna:'desert',rainforest:'tropical',alpine_rock:'alpine',wetland:'tropical'};
export function naturalDetailBiome(share){
 const ranked=Object.keys(routes).sort((a,b)=>(share[b]||0)-(share[a]||0));
 return routes[ranked[0]];
}

// WebGL cube face order +X,-X,+Y,-Y,+Z,-Z; rows follow texture t.
export function cubeDirection(face,u,v){switch(face){case 0:return [1,-v,-u];case 1:return [-1,-v,u];case 2:return [u,1,v];case 3:return [u,-1,-v];case 4:return [u,-v,1];case 5:return [-u,-v,-1];default:throw new RangeError('Invalid face');}}
const byte=x=>Math.round(Math.max(0,Math.min(1,x))*255);
// V10fp · cause des continents « en blocs » : la Terre lisait la grille naturelle 64 × 64 par face au plus proche (cellOf), donc chaque
// cellule devenait un carré de 2 × 2 texels (128) ou 4 × 4 (256), et l'eau binaire dessinait un escalier. Échantillonnage bilinéaire des
// champs du générateur + côte découpée par un bruit fin (le tracé des continents reste celui du générateur, seule la frontière est affinée).
const fadeN=t=>t*t*(3-2*t);
function hashN(x,y,z,s){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1274126177)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function vnoise(x,y,z,s){const a=Math.floor(x),b=Math.floor(y),c=Math.floor(z),u=fadeN(x-a),v=fadeN(y-b),w=fadeN(z-c),L=k=>{const p=hashN(a,b,k,s)+(hashN(a+1,b,k,s)-hashN(a,b,k,s))*u,q=hashN(a,b+1,k,s)+(hashN(a+1,b+1,k,s)-hashN(a,b+1,k,s))*u;return p+(q-p)*v;};const l0=L(c);return l0+(L(c+1)-l0)*w;}
const fbm=(x,y,z,s)=>.5*vnoise(x*24,y*24,z*24,s)+.3*vnoise(x*53,y*53,z*53,s^7)+.2*vnoise(x*111,y*111,z*111,s^13);
export function naturalSmooth(d,w){
 const N=w.N,F=w.fields,ax=Math.abs(d[0]),ay=Math.abs(d[1]),az=Math.abs(d[2]);let f,sc,tc,ma;
 if(ax>=ay&&ax>=az){ma=ax;if(d[0]>0){f=0;sc=-d[2];}else{f=1;sc=d[2];}tc=-d[1];}
 else if(ay>=az){ma=ay;sc=d[0];if(d[1]>0){f=2;tc=d[2];}else{f=3;tc=-d[2];}}
 else{ma=az;tc=-d[1];if(d[2]>0){f=4;sc=d[0];}else{f=5;sc=-d[0];}}
 const u=Math.min(N-1,Math.max(0,(sc/ma+1)*.5*N-.5)),v=Math.min(N-1,Math.max(0,(tc/ma+1)*.5*N-.5));
 const i0=Math.min(N-2,Math.floor(u)),j0=Math.min(N-2,Math.floor(v)),fu=u-i0,fv=v-j0,base=f*N*N;
 const cells=[base+j0*N+i0,base+j0*N+i0+1,base+(j0+1)*N+i0,base+(j0+1)*N+i0+1],wt=[(1-fu)*(1-fv),fu*(1-fv),(1-fu)*fv,fu*fv];
 const ice=BIOMES.indexOf('ice'),nb=BIOMES.length;let elev=0,T=0,P=0,water=0,river=0,ic=0;
 for(let k=0;k<4;k++){const c=cells[k],q=wt[k];elev+=F.elev01[c]*q;T+=F.T[c]*q;P+=F.P[c]*q;water+=(F.water[c]===1||F.water[c]===2?1:0)*q;river+=(F.water[c]===3?1:0)*q;ic+=F.weights[c*nb+ice]*q;}
 return {elev,T,P,water,river,ice:ic};
}
export function bakeWorld(type,seed,size=WORLD_CONFIG.bakeResolution,{smooth=false}={}){
 if(!Number.isInteger(size)||size<8||size>256||(!smooth&&size>128))throw new RangeError('Resolution 8..128 (256 en mode lissé)');
 const fallback=makeSurface(type,seed),terrain=[],climate=[];
 const natural=type==='earth'?bakeNatural({seed:baseWorld(type,seed).seed,N:NATURAL_GRID,landFraction:.3}):null;
 const cityCells=new Set(natural?.cities.map(c=>c.cell)??[]);
 const clamp01=x=>x<0?0:x>1?1:x,ss=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
 const smoothSample=(x,y,z)=>{const p=fallback(x,y,z);const l=Math.hypot(x,y,z),d=[x/l,y/l,z/l],n=naturalSmooth(d,natural),c=worldSample(d,natural.seed,natural),k=fbm(d[0],d[1],d[2],natural.seed|0)-.5;
  // Côte : seuil 0,5 du champ d'eau interpolé, déplacé par le bruit seulement près de la côte (4w(1-w)), fondu sur ≈ 1/3 de cellule.
  const coast=Math.min(1,6*n.water*(1-n.water)),wf=n.water+k*.8*coast,water=ss(.44,.56,wf);
  return {...p,height:clamp01(n.elev+k*.05*(1-water)),water,heat:clamp01((n.T+30)/60),humidity:clamp01(Math.log1p(n.P)/Math.log1p(4000)),ice:Math.max(n.ice,0),metal:cityCells.has(c.cell)?1:0,emission:ss(.35,.75,n.river)*(1-water)};};
 const sample=(x,y,z)=>{if(natural&&smooth)return smoothSample(x,y,z);const p=fallback(x,y,z);if(!natural)return p;const w=worldSample([x,y,z],natural.seed,natural);return {...p,height:w.elevation,water:w.water===1||w.water===2?1:0,heat:w.temperature,humidity:w.humidity,ice:Math.max(w.weights.ice||0,0),metal:cityCells.has(w.cell)?1:0,emission:w.water===3?1:0};};
 for(let face=0;face<6;face++){const a=new Uint8Array(size*size*4),b=new Uint8Array(a.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const p=sample(...cubeDirection(face,2*(x+.5)/size-1,2*(y+.5)/size-1)),i=4*(y*size+x);a[i]=byte(p.height);a[i+1]=byte(p.water);a[i+2]=byte(p.ice);a[i+3]=byte(p.metal);b[i]=byte(p.heat);b[i+1]=byte(p.humidity);b[i+2]=byte(p.cloud);b[i+3]=byte(p.emission);}
 terrain.push(a);climate.push(b);}
 return {type,seed,size,smooth:!!smooth,terrain,climate,bytes:48*size*size,natural:natural?{gen:natural.gen,grid:natural.N,stats:natural.stats,cities:natural.cities,roads:natural.roads,bridges:natural.bridges,seaRoutes:natural.seaRoutes,volcanoes:natural.volcanoes,vegetation:vegetationSites(natural),detailBiome:naturalDetailBiome(natural.stats.biomeShare)}:null};
}
// Data maps, not color textures; upload as linear RGBA8 without sRGB conversion.
