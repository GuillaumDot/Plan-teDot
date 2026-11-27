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
