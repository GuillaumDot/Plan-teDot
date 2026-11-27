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

import {createWorldAdapter,eligibleWorld,V10_GENERATOR} from './app-adapter.mjs';
assert.equal(eligibleWorld({type:'earth',seed:42}),false);assert.equal(eligibleWorld({type:'earth',seed:42,generatorVersion:0}),false);
const descriptor=Object.freeze({type:'earth',seed:42,generatorVersion:V10_GENERATOR});assert.equal(eligibleWorld(descriptor),true);
let uploads=0,draws=0,releases=0,cacheStops=0,rendererStops=0,failures=0;
const fakeRenderer=()=>({upload(){uploads++;return {dispose(){releases++;},loadDetail(){return Promise.resolve(false);},loadLandmarks(){return Promise.resolve(false);},loadVegetation(){return Promise.resolve(false);}};},draw(){draws++;},dispose(){rendererStops++;}});
const disabled=createWorldAdapter({createRenderer:()=>{throw Error('Must not initialize');}});assert.equal(await disabled.init(null),false);assert.equal(await disabled.select(descriptor),false);disabled.dispose();
const adapter=createWorldAdapter({enabled:true,createRenderer:async()=>fakeRenderer(),createCache:()=>({get:async()=>smallWorld,dispose(){cacheStops++;}}),onFallback:()=>failures++});
assert.equal(await adapter.init(null),true);assert.equal(await adapter.select(descriptor),true);assert.equal(await adapter.select(descriptor),true);assert.equal(uploads,1);assert.equal(adapter.draw({audio:.5}),true);assert.equal(draws,1);
assert.equal(await adapter.select({...descriptor,generatorVersion:0}),false);assert.equal(adapter.draw({}),false);assert.equal(releases,1);assert.equal(await adapter.select(descriptor),true);adapter.contextLost();assert.equal(adapter.ready,false);assert.equal(failures,1);adapter.dispose();adapter.dispose();assert.equal(releases,2);assert.equal(cacheStops,1);assert.equal(rendererStops,1);
assert.deepEqual(descriptor,{type:'earth',seed:42,generatorVersion:10});
console.log('Application adapter fallback and lifecycle verified');

import {shaderSource} from './gl-compat.mjs';
assert.equal(shaderSource('attribute vec3 p;','vertex',false),'attribute vec3 p;');
assert.ok(shaderSource('attribute vec3 p; varying vec3 v;','vertex',true).includes('in vec3 p; out vec3 v;'));
const modern=shaderSource('precision mediump float; varying vec3 v; void main(){gl_FragColor=textureCube(t,v);}','fragment',true);
assert.ok(modern.startsWith('#version 300 es\n')&&modern.includes('out vec4 pdFragment;')&&modern.includes('pdFragment=texture(t,v)'));
console.log('WebGL2 shader compatibility verified');

import {sceneFrame,sceneRect,SCENE_TARGET_CAP} from './scene-bridge.mjs';
const scene=sceneFrame({basis:[[1,0,0],[0,1,0],[0,0,1]],light:[0,0,1]});assert.deepEqual(scene.eye,[0,0,3]);assert.deepEqual(scene.light,[0,0,1]);assert.ok(Math.abs(scene.mvp[10]+.5)<1e-6);assert.equal(SCENE_TARGET_CAP,1024);
const rect=sceneRect({x:50,y:50,r:23},100,100);assert.ok(rect.every((x,i)=>Math.abs(x-[-.5,-.5,.5,.5][i])<1e-9));assert.equal(sceneRect({x:0,y:0,r:0},100,100),null);
const solarFrame=sceneFrame({basis:[[0,1,0],[-1,0,0],[0,0,1]],light:[1,0,0],sunIntensity:1.1,sunColor:[1,.8,.6]});
assert.deepEqual(solarFrame.light,[0,-1,0]);
assert.deepEqual(solarFrame.viewLight,[1,0,0]);
assert.equal(solarFrame.sunIntensity,1.1);
assert.deepEqual(solarFrame.sunColor,[1,.8,.6]);
const bridgeSource=readFileSync(new URL('./scene-bridge.mjs',import.meta.url),'utf8');
assert.doesNotMatch(bridgeSource,/gl\.getError\s*\(/);
assert.match(bridgeSource,/uHalo/);
const rendererSource=readFileSync(new URL('./renderer.mjs',import.meta.url),'utf8');
assert.match(rendererSource,/gl\.uniform1f\(u\.uSunIntensity/);
assert.match(rendererSource,/gl\.uniform3fv\(u\.uSunColor/);
console.log('Scene projection contracts verified');

import {legacyDescriptor,createFocusedHost} from './focused-host.mjs';
assert.equal(legacyDescriptor({type:11,seed:42}),null);assert.equal(legacyDescriptor({type:8,seed:42,generatorVersion:10}),null);
const hostPlanet=Object.freeze({type:11,seed:42,generatorVersion:10});assert.deepEqual(legacyDescriptor(hostPlanet),{type:'earth',seed:42,generatorVersion:10});
let hostInits=0,hostSelects=0,hostDisposals=0,hostDraws=0,hostFallbacks=0;
const host=createFocusedHost(null,{enabled:true,makeAdapter:()=>({ready:true,async init(){hostInits++;return true;},async select(d){hostSelects++;return !!d;},dispose(){hostDisposals++;}}),makeCompositor:()=>({draw(){hostDraws++;return true;},dispose(){hostDisposals++;}}),onFallback:()=>hostFallbacks++});
const hostFrame={planet:hostPlanet,body:{x:64,y:64,r:40},basis:[[1,0,0],[0,1,0],[0,0,1]],light:[0,0,1],width:128,height:128};
assert.equal(host.draw(hostFrame),false);assert.equal(host.draw(hostFrame),false);await new Promise(r=>setTimeout(r,0));assert.equal(host.state,'ready');assert.equal(host.draw(hostFrame),true);assert.equal(hostInits,1);assert.equal(hostSelects,1);assert.equal(hostDraws,1);host.leave();assert.equal(host.state,'idle');assert.equal(host.draw({...hostFrame,planet:{type:11,seed:42}}),false);assert.equal(hostSelects,2);host.contextLost();assert.equal(host.state,'fallback');assert.equal(hostFallbacks,1);host.dispose();assert.equal(hostDisposals,2);
assert.equal(createFocusedHost(null).draw(hostFrame),false);console.log('Focused host opt-in and lifecycle verified');

import {Script} from 'node:vm';
const legacyIndex=readFileSync(new URL('../../../index.html',import.meta.url),'utf8');
const recoverySource=legacyIndex.slice(legacyIndex.indexOf('function drawBody(o){'),legacyIndex.indexOf('function pdAdvancedBody(o){'));
assert.ok(recoverySource.length>100);
assert.doesNotMatch(recoverySource,/readPixels|getError/);
assert.match(legacyIndex,/name="pd-version" content="10\.0\.4"/);
const inlineScripts=[...legacyIndex.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!m[1].includes('src='));
assert.ok(inlineScripts.length>0);for(const m of inlineScripts)new Script(m[2],{filename:'index.html:inline'});
assert.ok(legacyIndex.includes("PD10_QUERY.get('world10') === '1'")&&legacyIndex.includes("PD10_QUERY.get('world10preview') === '1'"));
assert.ok(legacyIndex.includes('b.pd9===p&&pd10FocusDraw(p,b,dt)')&&legacyIndex.includes('if(PD10Host&&(mode!==\'planet\'||AF))PD10Host.leave()'));
console.log('Main index inline JavaScript syntax and opt-in integration verified');

assert.match(legacyIndex,/name="pd-version" content="10\.\d+\.\d+"/);
assert.ok(legacyIndex.includes('name, type, generatorVersion: 10, size: 1'));
assert.ok(legacyIndex.includes('p.generatorVersion=pd10MigrationVersion(p)')&&legacyIndex.includes('generatorVersion:pd10MigrationVersion(p)'));
console.log('V10 default for new planets; explicit rollback and legacy version preservation');

import {runInNewContext} from 'node:vm';
const migrationSource=legacyIndex.match(/function pd10MigrationVersion\(p\)\{[\s\S]*?\n\}/)?.[0];assert.ok(migrationSource);
const migrate=runInNewContext(migrationSource+';pd10MigrationVersion');
for(const type of [0,1,2,3,4,6,9,10,11]){const p=Object.freeze({type,seed:7.7,tracks:['song'],xp:42});assert.equal(migrate(p),10);assert.equal(p.generatorVersion,undefined);assert.equal(migrate({...p,generatorVersion:0}),10);assert.equal(migrate({...p,generatorVersion:10}),10);}
for(const type of [5,7,8])assert.equal(migrate({type,seed:7}),0);
assert.equal(migrate({type:11,seed:NaN}),0);assert.equal(migrate({type:11,seed:7,generatorVersion:42}),42);
console.log('Existing world migration preserves seed and payload; unsupported families retain legacy');
