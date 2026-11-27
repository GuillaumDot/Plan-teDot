import assert from 'node:assert/strict';
import {ARCHETYPES} from './archetypes.mjs';
import {makeSurface} from './surface.mjs';
import {bakeWorld,cubeDirection} from './bake.mjs';
import {terrainAssets} from './asset-routing.mjs';
import {earthWeights,qualityStep} from './transitions.mjs';
for(const type of Object.keys(ARCHETYPES)){
 const a=bakeWorld(type,123,16),b=bakeWorld(type,123,16);
 assert.deepEqual(a,b);assert.equal(a.bytes,48*16*16);
 assert.equal(a.terrain.length,6);assert.equal(a.climate.length,6);
 const sample=makeSurface(type,123);
 for(let f=0;f<6;f++)for(const u of [-1,0,1])for(const v of [-1,0,1]){
 const p=sample(...cubeDirection(f,u,v));for(const x of Object.values(p))assert.ok(Number.isFinite(x)&&x>=0&&x<=1,type);
 if(type==='gas')assert.equal(p.height,0);
 }
 assert.deepEqual(sample(1,0,-1),sample(2,0,-2));
}
assert.equal(terrainAssets('gas','alpine'),null);
assert.equal(terrainAssets('earth','alpine',2).triangles,1152);
assert.throws(()=>bakeWorld('earth',0,129));
for(const temperature of [-30,0,20,40])for(const humidity of [0,.5,1])for(const elevation of [0,.5,1]){
 const w=earthWeights({temperature,humidity,elevation});assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-6);
}
let q={tier:3,average:50};for(let i=0;i<30;i++)q=qualityStep(q,50,.1);assert.ok(q.tier<3);
console.log('V10 CPU contracts passed');

import {validateCatalog,worldCatalog} from './catalog.mjs';
import {existsSync} from 'node:fs';
import {strict as catalogAssert} from 'node:assert';
const catalogCheck=validateCatalog();catalogAssert.equal(catalogCheck.ok,true,catalogCheck.errors.join('; '));
for(const entry of worldCatalog())for(const terrain of entry.terrain)for(const lod of terrain.lods)for(const key of ['mesh','albedo','height','normal'])catalogAssert.ok(existsSync(new URL('../../../'+lod[key],import.meta.url)), 'Missing asset: '+lod[key]);
console.log('Catalog and referenced assets verified');

import {resolveTerrain} from './catalog.mjs';
for(const entry of worldCatalog()){
 const fallback=resolveTerrain(entry.type,'unknown-biome');
 if(entry.type==='gas'){catalogAssert.equal(fallback,null);continue;}
 catalogAssert.equal(fallback.fallback,true);
 catalogAssert.ok(entry.terrain.some(t=>t.biome===fallback.resolved));
 for(const t of entry.terrain)for(const lod of [0,1,2]){const resolved=resolveTerrain(entry.type,t.biome,lod);catalogAssert.equal(resolved.fallback,false);catalogAssert.equal(resolved.mesh,t.lods[lod].mesh);}
}
console.log('Terrain fallback contracts verified');

import {NATURAL_GRID,naturalDetailBiome} from './bake.mjs';
const smallWorld=bakeWorld('earth',7,8),largeWorld=bakeWorld('earth',7,32);
assert.equal(smallWorld.natural.grid,NATURAL_GRID);
assert.deepEqual(smallWorld.natural,largeWorld.natural,'Geography must be independent of GPU resolution');
assert.equal(smallWorld.natural.gen,22);
assert.ok(smallWorld.natural.cities.every(c=>c.cell>=0&&c.cell<6*NATURAL_GRID*NATURAL_GRID));
assert.equal(naturalDetailBiome({desert:.2,rainforest:.1}), 'desert');
assert.equal(bakeWorld('gas',7,8).natural,null);
console.log('Natural World geography and biome routing verified');

import {visualAudio} from './visual-audio.mjs';
let energy=visualAudio(0,1,.016);assert.ok(energy>0&&energy<1);
const peak=energy;energy=visualAudio(energy,0,.016);assert.ok(energy<peak&&energy>0);
assert.equal(visualAudio(.5,1,0),.5);
assert.equal(visualAudio(NaN,Infinity,-1),0);
assert.ok(visualAudio(0,10,10)<=1);
console.log('Bounded visual audio envelope verified');

import {cityGeometry} from './cities.mjs';
const size=8,land=Array.from({length:6},()=>new Uint8Array(size*size*4));
const cityWorld={type:'earth',size,terrain:land,natural:{cities:[{cell:1,dir:[0,0,-1]}]}};
const cityMesh=cityGeometry(cityWorld);assert.equal(cityMesh.buildings,9);assert.equal(cityMesh.vertices.length,9*30*7);
assert.deepEqual(cityMesh,cityGeometry(cityWorld));assert.ok(cityMesh.vertices.every(Number.isFinite));
assert.equal(cityGeometry({...cityWorld,type:'gas'}).buildings,0);
const ocean=land.map(a=>a.map((x,i)=>i%4===1?255:0));assert.equal(cityGeometry({...cityWorld,terrain:ocean}).buildings,0);
console.log('Deterministic city geometry and land exclusion verified');

import {infrastructureGeometry,ROAD_SEGMENT_LIMIT} from './infrastructure.mjs';
const networkWorld={...cityWorld,natural:{grid:8,cities:[],roads:[{cells:[0,1,2]},{cells:[2,1]}],bridges:[{cell:1}]}};
const network=infrastructureGeometry(networkWorld);
assert.equal(network.roads,2);assert.equal(network.bridges,2);assert.equal(network.vertices.length,84);assert.ok(network.vertices.every(Number.isFinite));
assert.deepEqual(network,infrastructureGeometry(networkWorld));
assert.equal(infrastructureGeometry({...networkWorld,type:'gas'}).roads,0);
const realNetwork=infrastructureGeometry(bakeWorld('earth',7,64));assert.ok(realNetwork.roads>0&&realNetwork.roads<=ROAD_SEGMENT_LIMIT);
console.log('Natural infrastructure geometry verified');
