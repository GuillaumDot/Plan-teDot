// Run: node --test tests/v10-sharpness.test.mjs — netteté V10fp (cuisson lissée, fenêtre visible, budgets).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bakeWorld} from '../assets/cosmic/world-v10/bake.mjs';
import {visibleWindow,bakeForTier,targetPixelsForTier,budgetTable,fpFlags} from '../assets/cosmic/world-v10/full-potential.mjs';
test('default bake (smooth off) is unchanged and limited to 128',()=>{
 assert.throws(()=>bakeWorld('earth',1,256));
 const a=bakeWorld('rock',3,64),b=bakeWorld('rock',3,64,{smooth:true});
 assert.deepEqual(a.terrain,b.terrain,'non-earth worlds do not depend on the natural grid');
});
test('smooth earth bake: deterministic, continuous coastline, same geography as the generator',()=>{
 const s=bakeWorld('earth',12345,256,{smooth:true}),t=bakeWorld('earth',12345,256,{smooth:true}),o=bakeWorld('earth',12345,128);
 assert.deepEqual(s.terrain,t.terrain);
 const levels=new Set();for(const f of s.terrain)for(let i=1;i<f.length;i+=4)levels.add(f[i]);assert.ok(levels.size>100,'water is no longer binary');
 // Part de terres : à ±3 points de la cuisson d'origine (la côte est affinée, pas déplacée).
 const land=w=>{let n=0,c=0;for(const f of w.terrain)for(let i=1;i<f.length;i+=4){c++;if(f[i]<128)n++;}return n/c;};
 assert.ok(Math.abs(land(s)-land(o))<.03,land(s)+' vs '+land(o));
});
test('visible window: whole planet when it fits, only the visible part when zoomed, within the pixel budget',()=>{
 const small=visibleWindow({x:400,y:400,r:100},800,800,1024*1024);
 assert.deepEqual(small.local.map(v=>+v.toFixed(3)),[-1,-1,1,1]);
 const big=visibleWindow({x:400,y:900,r:2000},800,1600,1024*1024);
 assert.ok(big.local[2]-big.local[0]<1&&big.w*big.h<=1024*1024*1.01);
 assert.equal(visibleWindow({x:-5000,y:0,r:10},800,800,1e6),null);
});
test('bake 256 from tier 2, budgets still fit every tier, rollback flags',()=>{
 assert.deepEqual([0,1,2,3].map(bakeForTier),[128,128,256,256]);
 assert.ok(targetPixelsForTier(0)<targetPixelsForTier(2));
 for(const r of budgetTable())assert.ok(r.fits,'tier '+r.tier);
 assert.equal(fpFlags('').smooth,true);assert.equal(fpFlags('?v10smooth=0').smooth,false);assert.equal(fpFlags('?v10win=0').win,false);
});
