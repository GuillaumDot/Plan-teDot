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

import {growthDrawCount} from './cities.mjs';
assert.equal(growthDrawCount(9,0),0);assert.equal(growthDrawCount(9,1),270);
assert.equal(growthDrawCount(9,.5),120);assert.equal(growthDrawCount(9,-5),0);assert.equal(growthDrawCount(9,2),270);
let previous=0;for(let i=0;i<=100;i++){const count=growthDrawCount(144,i/100);assert.ok(count>=previous&&count%30===0);previous=count;}
const twoCities=cityGeometry({...cityWorld,natural:{cities:[{cell:1,dir:[0,0,-1]},{cell:2,dir:[0,0,1]}]}});
assert.equal(twoCities.buildings,18);assert.ok(twoCities.vertices[2]<0&&twoCities.vertices[30*7+2]>0,'First growth phase spans both cities');
console.log('Monotonic civilization growth verified');

import {readFileSync} from 'node:fs';
import {decodeStaticGLB,CITY_MODEL_PATH,MODEL_TRIANGLE_BUDGET} from './static-glb.mjs';
import {landmarkGeometry} from './landmarks.mjs';
const modelBytes=readFileSync(new URL('../../../'+CITY_MODEL_PATH,import.meta.url));
const model=decodeStaticGLB(modelBytes.buffer.slice(modelBytes.byteOffset,modelBytes.byteOffset+modelBytes.byteLength));
assert.ok(model.triangles>0&&model.triangles<=MODEL_TRIANGLE_BUDGET);assert.ok(model.vertices.every(Number.isFinite));
const placed=landmarkGeometry(cityWorld,model);assert.equal(placed.instances,1);assert.ok(placed.vertices.every(Number.isFinite));
assert.equal(landmarkGeometry({...cityWorld,terrain:ocean},model).instances,0);
assert.throws(()=>decodeStaticGLB(new ArrayBuffer(32)));
console.log('Real GLB geometry and placement verified');

import {CITY_MODEL_PATHS} from './static-glb.mjs';
import {landmarkKind} from './landmarks.mjs';
const variants={};for(const [kind,path] of Object.entries(CITY_MODEL_PATHS)){const bytes=readFileSync(new URL('../../../'+path,import.meta.url));variants[kind]=decodeStaticGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));assert.ok(variants[kind].triangles>0);}
assert.equal(landmarkKind({port:true},0),'factory');assert.equal(landmarkKind({},1),'tower');
const diverse=landmarkGeometry({...cityWorld,natural:{cities:[{dir:[0,0,-1]},{dir:[0,0,1]},{dir:[1,0,0],port:true}]}},variants);
assert.ok(diverse.instances>=1&&diverse.triangles<=MODEL_TRIANGLE_BUDGET);assert.ok(diverse.vertices.every(Number.isFinite));assert.deepEqual(diverse,landmarkGeometry({...cityWorld,natural:{cities:[{dir:[0,0,-1]},{dir:[0,0,1]},{dir:[1,0,0],port:true}]}},variants));
console.log('Architectural model catalog and shared budget verified');

import {VEGETATION_PATHS,VEGETATION_BUDGET,vegetationGeometry} from './vegetation.mjs';
const plants={};for(const [kind,path] of Object.entries(VEGETATION_PATHS)){const bytes=readFileSync(new URL('../../../'+path,import.meta.url));plants[kind]=decodeStaticGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));assert.ok(plants[kind].triangles>0);}
const plantWorld={...cityWorld,natural:{vegetation:[{dir:[0,0,-1],kind:'pine'},{dir:[1,0,0],kind:'cactus'},{dir:[0,1,0],kind:'broadleaf'}]}};
const forest=vegetationGeometry(plantWorld,plants);assert.equal(forest.instances,7);assert.ok(forest.triangles<=VEGETATION_BUDGET&&forest.vertices.every(Number.isFinite));assert.deepEqual(forest,vegetationGeometry(plantWorld,plants));assert.equal(vegetationGeometry({...plantWorld,terrain:ocean},plants).instances,0);
assert.ok(smallWorld.natural.vegetation.length<=36);assert.deepEqual(smallWorld.natural.vegetation,largeWorld.natural.vegetation);
console.log('Vegetation GLBs and deterministic biome placement verified');

import {stormCenter} from './weather.mjs';
for(const seed of [0,1,42,'abc']){const center=stormCenter('earth',seed);assert.ok(center.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...center)-1)<1e-9);assert.ok(Math.abs(center[1])<.6);assert.deepEqual(center,stormCenter('earth',seed));}
console.log('Deterministic storm center verified');

const cluster=vegetationGeometry({...plantWorld,natural:{vegetation:[{dir:[0,0,-1],kind:'pine'}]}},plants);
assert.equal(cluster.instances,3);assert.ok(cluster.triangles<=VEGETATION_BUDGET);
assert.deepEqual(cluster,vegetationGeometry({...plantWorld,natural:{vegetation:[{dir:[0,0,-1],kind:'pine'}]}},plants));
assert.ok(cluster.vertices.every(Number.isFinite));
console.log('Bounded deterministic forest clusters verified');

import {MODEL_VERTEX_STRIDE} from './static-glb.mjs';
for(const mesh of [...Object.values(variants),...Object.values(plants)]){
 assert.equal(mesh.vertices.length,mesh.triangles*3*MODEL_VERTEX_STRIDE);
 for(let i=0;i<mesh.vertices.length;i+=MODEL_VERTEX_STRIDE)for(let k=7;k<11;k++)assert.ok(mesh.vertices[i+k]>=0&&mesh.vertices[i+k]<=1);
}
const shades=new Set();for(let i=0;i<model.vertices.length;i+=MODEL_VERTEX_STRIDE)shades.add(Array.from(model.vertices.subarray(i+7,i+11)).join(','));assert.ok(shades.size>1,'Original materials must differ');
assert.equal(placed.vertices.length,model.vertices.length);
assert.deepEqual(placed.vertices.slice(7,11),model.vertices.slice(7,11));
console.log('GLB vertex colors and roughness preserved through placement');

import {cameraTarget,cameraStep,cameraFrame,CAMERA_LIMITS} from './camera.mjs';
const start={yaw:0,pitch:0,zoom:1},goal=cameraTarget(start,{yaw:1,pitch:9,zoom:99});
assert.equal(goal.pitch,CAMERA_LIMITS.maxPitch);assert.equal(goal.zoom,CAMERA_LIMITS.maxZoom);
assert.equal(cameraTarget(start,{zoom:0}).zoom,CAMERA_LIMITS.minZoom);
const step=cameraStep(start,goal,.016);assert.ok(step.zoom>1&&step.zoom<goal.zoom);assert.deepEqual(cameraStep(start,goal,0,true),goal);
const view=cameraFrame(start);assert.ok(view.mvp.every((value,i)=>Math.abs(value-[.83,0,0,0,0,.83,0,0,0,0,.5,0,0,0,0,1][i])<1e-6));assert.ok(cameraFrame(goal).mvp.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...cameraFrame(goal).eye)-3)<1e-9);
console.log('Camera bounds and smoothing verified');

import {renderBudget} from './config.mjs';
let adaptive={tier:3,average:33.33};for(let i=0;i<100;i++)adaptive=qualityStep(adaptive,60,.1);assert.equal(adaptive.tier,0);
for(let i=0;i<300;i++)adaptive=qualityStep(adaptive,16,.1);assert.equal(adaptive.tier,3);
assert.equal(qualityStep(adaptive,NaN,.1),adaptive);assert.equal(renderBudget(0,3).pixelRatio,.75);assert.equal(renderBudget(3,3).pixelRatio,1.5);
console.log('Quality governor recovery and render budgets verified');
