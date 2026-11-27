import {bakeWorld as bakeNatural,worldSample} from '../natural-world-v22/world.mjs';
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
export function bakeWorld(type,seed,size=WORLD_CONFIG.bakeResolution){
 if(!Number.isInteger(size)||size<8||size>128)throw new RangeError('Resolution 8..128');
 const fallback=makeSurface(type,seed),terrain=[],climate=[];
 const natural=type==='earth'?bakeNatural({seed:baseWorld(type,seed).seed,N:NATURAL_GRID,landFraction:.3}):null;
 const cityCells=new Set(natural?.cities.map(c=>c.cell)??[]);
 const sample=(x,y,z)=>{const p=fallback(x,y,z);if(!natural)return p;const w=worldSample([x,y,z],natural.seed,natural);return {...p,height:w.elevation,water:w.water===1||w.water===2?1:0,heat:w.temperature,humidity:w.humidity,ice:Math.max(w.weights.ice||0,0),metal:cityCells.has(w.cell)?1:0,emission:w.water===3?1:0};};
 for(let face=0;face<6;face++){const a=new Uint8Array(size*size*4),b=new Uint8Array(a.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const p=sample(...cubeDirection(face,2*(x+.5)/size-1,2*(y+.5)/size-1)),i=4*(y*size+x);a[i]=byte(p.height);a[i+1]=byte(p.water);a[i+2]=byte(p.ice);a[i+3]=byte(p.metal);b[i]=byte(p.heat);b[i+1]=byte(p.humidity);b[i+2]=byte(p.cloud);b[i+3]=byte(p.emission);}
 terrain.push(a);climate.push(b);}
 return {type,seed,size,terrain,climate,bytes:48*size*size,natural:natural?{gen:natural.gen,grid:natural.N,stats:natural.stats,cities:natural.cities,roads:natural.roads,bridges:natural.bridges,seaRoutes:natural.seaRoutes,volcanoes:natural.volcanoes,vegetation:vegetationSites(natural),detailBiome:naturalDetailBiome(natural.stats.biomeShare)}:null};
}
// Data maps, not color textures; upload as linear RGBA8 without sRGB conversion.
