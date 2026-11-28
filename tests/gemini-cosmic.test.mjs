import test from 'node:test';
import assert from 'node:assert/strict';
import {COSMIC_DEFAULTS,checkTierMemorySafety,readCosmicFlags,createAudioEnvelopeState,updateAudioEnvelopeInPlace,resolveGeminiRenderPlan} from '../assets/cosmic/world-v10/gemini-cosmic-manifest.mjs';
test('explicit URL gates and independent exposure rollout',()=>{
  assert.deepEqual(readCosmicFlags('?world10=1&pbrRolloutStage=3&cosmic10=1'),COSMIC_DEFAULTS);
  assert.equal(readCosmicFlags('?cosmicPbrCalibratedV1=1&pbrRolloutStage=3').pbrRolloutStage,3);
  assert.equal(resolveGeminiRenderPlan('gas',0).allowSurfaceCivilization,false);
});
test('one budget, including other allocations',()=>{
  [4,8,16,24].forEach((m,t)=>{const limit=m*1048576;assert.ok(checkTierMemorySafety(t,limit-1,1));assert.ok(!checkTierMemorySafety(t,limit,1));});
  assert.ok(!checkTierMemorySafety(0,NaN));
});
test('asymmetric envelopes reuse storage and are independent of frame rate',()=>{
  const a=createAudioEnvelopeState(),b=createAudioEnvelopeState();
  for(let i=0;i<60;i++)assert.equal(updateAudioEnvelopeInPlace(a,1,1,1,1/60),a);
  updateAudioEnvelopeInPlace(b,1,1,1,1);
  a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-6));
  updateAudioEnvelopeInPlace(a,0,0,0,1);
  assert.ok(a[1]>a[0]&&a[0]>a[2]);
});
