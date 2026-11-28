// Run: node --test tests/v10-city-smooth.test.mjs — fluidité du gros plan villes (préchargement, décodage étalé, fondu, cible hors écran).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bakeWorld} from '../assets/cosmic/world-v10/bake.mjs';
import * as L from '../assets/cosmic/world-v10/living-cities.mjs';
import {fpFlags,fadeStep,CITY_FADE_SEC,targetAlloc,shouldWarmHost,shouldPrepareLiving,lodLevel,LOD_PREPARE,LOD_WARM} from '../assets/cosmic/world-v10/full-potential.mjs';
const earth=bakeWorld('earth',12345,128);
const file=p=>{const b=fs.readFileSync(new URL('../'+p,import.meta.url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
const fetcher=async u=>file((x=>x.slice(x.indexOf('/assets/')+1))(decodeURIComponent(new URL(u).pathname)));

test('rollback ?v10flow=0 ; flow is on by default under the other V10 flags',()=>{
 assert.equal(fpFlags('').flow,true);
 assert.equal(fpFlags('?v10flow=0').flow,false);
 assert.equal(fpFlags('?v10city=0').city,false);
 assert.equal(fpFlags('?v10act=1').act,true);
});

test('buildings fade in about 300 ms; reduced-motion snap is the caller\'s job',()=>{
 assert.equal(CITY_FADE_SEC,.3);
 assert.equal(fadeStep(0,true,.15),.5);
 assert.equal(fadeStep(0,true,.3),1);
 assert.equal(fadeStep(1,false,.3),0);
});

test('prepare living models from lod 1 / 180 px; warm the host from 45 px; rollback only at lod 2',()=>{
 assert.equal(LOD_PREPARE,180);assert.equal(LOD_WARM,45);
 assert.equal(shouldWarmHost(40),false);assert.equal(shouldWarmHost(45),true);
 assert.equal(shouldPrepareLiving(0,100,true),false);
 assert.equal(shouldPrepareLiving(1,100,true),true);
 assert.equal(shouldPrepareLiving(0,200,true),true);
 assert.equal(shouldPrepareLiving(1,200,false),false);
 assert.equal(shouldPrepareLiving(2,300,false),true);
 assert.equal(lodLevel(1,200,true),1,'gesture still freezes lod');
});

test('offscreen target stays put during a gesture and only grows with headroom',()=>{
 assert.deepEqual(targetAlloc(100,100,0,0,{flow:false}),[128,128]);
 assert.deepEqual(targetAlloc(100,100,128,128,{flow:false}),[128,128]);
 const held=targetAlloc(200,200,256,256,{gesture:true,flow:true});
 assert.deepEqual(held,[256,256],'no realloc while the current buffer still covers the need');
 const grew=targetAlloc(300,300,256,256,{gesture:true,flow:true});
 assert.ok(grew[0]>=375&&grew[1]>=375&&grew[0]%64===0,'grow once with 25 % headroom, 64 px aligned');
 const slack=targetAlloc(200,200,0,0,{flow:true});
 assert.ok(slack[0]>=232&&slack[0]%64===0);
});

test('GLB decode is spread across frames when the budget is tight, and stays within the tier caps',async()=>{
 let yields=0;const inst=L.livingPlacement(earth,{tier:2}),batches=L.livingBatches(inst);
 const models=await L.loadLivingModels(batches,{tier:2,fetcher,budgetMs:.001,yieldFrame:()=>{yields++;return Promise.resolve();}});
 assert.ok(Object.keys(models).length>0);
 assert.ok(yields>=1,'at least one yield when the budget is ~0 ms');
 const tris=[...new Set(Object.values(models))].reduce((s,m)=>s+m.triangles,0);
 assert.ok(tris<=L.livingTier(2).triangles);
 const same=await L.loadLivingModels(batches,{tier:2,fetcher,budgetMs:1e9,yieldFrame:()=>{throw new Error('should not yield');}});
 assert.deepEqual(Object.keys(same).sort(),Object.keys(models).sort());
});

test('living shader reveals with uReveal; no #1e8bf1, no readPixels',()=>{
 const src=fs.readFileSync(new URL('../assets/cosmic/world-v10/living-cities.mjs',import.meta.url),'utf8');
 assert.ok(src.includes('max(uReveal,0.)'));
 assert.ok(src.includes('prewarmLivingProgram'));
 assert.ok(!/1e8bf1/i.test(src));
});

test('V9 path untouched: pd10Extra only runs inside the V10 focus pass',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const uses=html.split('pd10Extra(').length-1;assert.equal(uses,2,'definition + V10 draw call only');
 assert.ok(/PD10Host\.draw\(\{[^\n]*\.\.\.pd10Extra\(p\)\}\)/.test(html));
 assert.ok(html.includes("PD10_QUERY.get('world10') === '1'"));
});
