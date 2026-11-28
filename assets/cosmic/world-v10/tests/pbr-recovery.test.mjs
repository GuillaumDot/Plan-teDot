import test from 'node:test';
import assert from 'node:assert/strict';
import {createPbrSurface} from '../pbr-surface.mjs';
import {fpFlags,pbrSizeForTier} from '../full-potential.mjs';
test('PBR opt-in, audio and city flags unchanged',()=>{
 assert.equal(fpFlags('?world10=1').pbr,false);
 assert.equal(fpFlags('?world10=1&v10pbr=1').pbr,true);
 assert.equal(fpFlags('?world10=1&v10pbr=0').pbr,false);
 assert.equal(fpFlags('?world10=1').aud,true);
 assert.equal(fpFlags('?world10=1').city,true);
 assert.equal(pbrSizeForTier(0),0);
});
test('PBR loads one pair, releases both, and reports bytes',async()=>{
 let disposed=0,loaded=0;
 const s=createPbrSurface({}, {load:async()=>{loaded++;return {bytes:64,dispose(){disposed++}};}});
 assert.equal(await s.select('ocean',256),true);
 assert.equal(s.bytes,128);
 assert.equal(s.matches('ocean',256),true);
 assert.equal(await s.select('ocean',256),true);
 assert.equal(loaded,2);
 s.release();s.release();
 assert.equal(s.bytes,0);
 assert.equal(disposed,2);
});
test('stale asynchronous results cannot attach after release',async()=>{
 let disposed=0;const pending=[];
 const s=createPbrSurface({}, {load:()=>new Promise(resolve=>pending.push(resolve))});
 const result=s.select('ocean',256);s.release();
 for(const resolve of pending)resolve({bytes:64,dispose(){disposed++}});
 assert.equal(await result,false);
 assert.equal(s.bytes,0);
 assert.equal(disposed,2);
});
test('one failed texture releases its sibling and prevents retry storm',async()=>{
 let disposed=0,loaded=0;
 const s=createPbrSurface({}, {load:async(gl,url)=>{loaded++;if(url.pathname.endsWith('-normal.png'))throw Error('fixture');return {bytes:64,dispose(){disposed++}};}});
 assert.equal(await s.select('ocean',256),false);
 assert.equal(s.bytes,0);
 assert.equal(disposed,1);
 assert.equal(await s.select('ocean',256),false);
 assert.equal(loaded,2);
});
