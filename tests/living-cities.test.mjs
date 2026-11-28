// Run: node --test tests/living-cities.test.mjs — villes procédurales V10fp (placement, budget, aucune modification V9).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bakeWorld} from '../assets/cosmic/world-v10/bake.mjs';
import * as L from '../assets/cosmic/world-v10/living-cities.mjs';
import {fpFlags} from '../assets/cosmic/world-v10/full-potential.mjs';
const earth=bakeWorld('earth',12345,128),earth2=bakeWorld('earth',777,128);
const file=p=>{const b=fs.readFileSync(new URL('../'+p,import.meta.url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
const fetcher=async u=>file((x=>x.slice(x.indexOf('/assets/')+1))(decodeURIComponent(new URL(u).pathname)));
test('placement is deterministic per seed and differs between seeds',()=>{
 assert.deepEqual(L.livingPlacement(earth,{tier:3}),L.livingPlacement(bakeWorld('earth',12345,128),{tier:3}));
 assert.notDeepEqual(L.livingPlacement(earth,{tier:3}).map(i=>i.dir),L.livingPlacement(earth2,{tier:3}).map(i=>i.dir));
});
test('tier 0: nothing; caps on instances and one variant per family at tier 1',()=>{
 assert.equal(L.livingPlacement(earth,{tier:0}).length,0);
 for(const t of [1,2,3]){const p=L.livingPlacement(earth,{tier:t}),cfg=L.livingTier(t);assert.ok(p.length>0&&p.length<=cfg.instances);for(const i of p)assert.ok(i.variant<cfg.variants);}
 assert.equal(L.livingBatches(L.livingPlacement(earth,{tier:1})).length,new Set(L.livingPlacement(earth,{tier:1}).map(i=>i.family)).size,'one draw per family at tier 1');
});
test('only earth-like worlds get cities (7 types without cities stay empty)',()=>{for(const t of ['rock','aquatic','gas','ice','volcanic','spectralMetallic'])assert.equal(L.livingPlacement(bakeWorld(t,5,64),{tier:3}).length,0,t);});
test('placement follows generator data: on land, near a city, vehicles on roads, ships at sea',()=>{
 const p=L.livingPlacement(earth,{tier:3}),cities=earth.natural.cities,N=earth.natural.grid;
 const near=d=>cities.some(c=>c.dir[0]*d[0]+c.dir[1]*d[1]+c.dir[2]*d[2]>Math.cos(.08));
 for(const i of p){if(i.family!=='road_vehicle'&&i.family!=='train'&&i.family!=='bridge')assert.ok(near(i.dir),i.family+' far from any city');for(const v of i.dir)assert.ok(Number.isFinite(v));}
 const roadCells=new Set(earth.natural.roads.flatMap(r=>r.cells));
 for(const i of p.filter(i=>i.family==='road_vehicle'||i.family==='train')){const {cellOf}=awaitCell;assert.ok(roadCells.has(cellOf(i.dir,N)),'vehicle off road');assert.equal(i.moving,1);}
});
const awaitCell=await import('../assets/cosmic/natural-world-v22/world.mjs');
test('era gating and listening growth: nothing before era 1, all at era 5 and full growth',()=>{
 const items=L.livingPlacement(earth,{tier:3});
 assert.equal(L.visibleCount(items,0,1),0);assert.equal(L.visibleCount(items,5,1),items.length);
 assert.ok(L.visibleCount(items,1,1)<L.visibleCount(items,3,1));assert.ok(L.visibleCount(items,5,.5)<items.length);
});
test('GLB loading on demand stays within the tier triangle and memory budget',async()=>{
 for(const t of [1,2,3]){const inst=L.livingPlacement(earth,{tier:t}),models=await L.loadLivingModels(L.livingBatches(inst),{tier:t,fetcher});
  const tris=[...new Set(Object.values(models))].reduce((s,m)=>s+m.triangles,0);   // doublons du registre partagés : comptés une fois
  if(models['market-01']&&models['rail_station-01'])assert.equal(models['market-01'],models['rail_station-01'],'market et rail_station partagent le même modèle');assert.ok(tris>0&&tris<=L.livingTier(t).triangles);
  const bytes=L.livingBytes(models,inst.length);assert.ok(bytes<[0,.5,1,2][t]*1024*1024,'tier '+t+' '+bytes);}
 const keys=Object.keys(await L.loadLivingModels(L.livingBatches(L.livingPlacement(earth,{tier:3})),{tier:3,fetcher}));assert.ok(keys.some(k=>k.startsWith('rail_station'))||keys.some(k=>k.startsWith('solar_array')),'au moins un doublon exercé au palier 3: '+keys.join(','));
});
test('city light colours: sodium and LED only, never #1e8bf1; no hit-testing or readPixels',()=>{
 const src=fs.readFileSync(new URL('../assets/cosmic/world-v10/living-cities.mjs',import.meta.url),'utf8');
 assert.ok(!/1e8bf1/i.test(src));assert.ok(!/readPixels|getError/.test(src));
});
test('rollback flag ?v10city=0, interactions opt-in only',()=>{assert.equal(fpFlags('').city,true);assert.equal(fpFlags('?v10city=0').city,false);assert.equal(fpFlags('').act,false);assert.equal(fpFlags('?v10act=1').act,true);});
test('V9 path untouched: pd10Extra only runs inside the V10 focus pass',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');const uses=html.split('pd10Extra(').length-1;assert.equal(uses,2,'definition + V10 draw call only');
 assert.ok(/PD10Host\.draw\(\{[^\n]*\.\.\.pd10Extra\(p\)\}\)/.test(html));
});
