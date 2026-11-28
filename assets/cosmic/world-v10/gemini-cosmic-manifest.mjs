// Per-page configuration; reads no storage and never mutates a saved world.
export const COSMIC_DEFAULTS = Object.freeze({
  cosmicArtProfilesV1: false, cosmicGasAndRingsV1: false,
  cosmicAquaticIcyV1: false, cosmicRockySpectralV1: false,
  cosmicGalaxyRealismV1: false, cosmicStellarRealismV1: false,
  cosmicOrganicCivV1: false, cosmicPbrCalibratedV1: false, pbrRolloutStage: 0
});
export const TIER_BUDGET_MIB = Object.freeze([4, 8, 16, 24]);
export const AUDIO_LIMITS = Object.freeze({maxEmissiveBoost:.28, maxCloudDriftBoost:.35, maxRimScatterBoost:.16, maxSparkleBoost:.22});
const attack = [.12,.35,.08], release = [.95,1.40,.45];
export const createAudioEnvelopeState = () => new Float32Array(3);
export function updateAudioEnvelopeInPlace(state, rawBass, rawMid, rawHigh, dtSec) {
  const dt = Number.isFinite(dtSec) ? Math.max(0, Math.min(dtSec, 4)) : 0;
  for (let i=0; i<3; i++) {
    const raw = i===0 ? rawBass : i===1 ? rawMid : rawHigh;
    const target = Number.isFinite(raw) ? Math.max(0, Math.min(1,raw)) : 0;
    state[i] += (target-state[i]) * -Math.expm1(-dt/(target>state[i]?attack[i]:release[i]));
  }
  return state;
}
export function readCosmicFlags(search) {
  const q = new URLSearchParams(search), flags = {...COSMIC_DEFAULTS};
  for (const k of Object.keys(flags)) if(k!=='pbrRolloutStage') flags[k]=q.get(k)==='1';
  const stage=q.get('pbrRolloutStage');
  flags.pbrRolloutStage=flags.cosmicPbrCalibratedV1 && /^[123]$/.test(stage) ? Number(stage) : 0;
  return Object.freeze(flags);
}
export function checkTierMemorySafety(tierIndex, otherEngineTextureBytes, requestedBytes=0) {
  return Number.isInteger(tierIndex) && tierIndex>=0 && tierIndex<=3 &&
    Number.isSafeInteger(otherEngineTextureBytes) && otherEngineTextureBytes>=0 &&
    Number.isSafeInteger(requestedBytes) && requestedBytes>=0 &&
    otherEngineTextureBytes+requestedBytes<=TIER_BUDGET_MIB[tierIndex]*1048576;
}
export const FAMILY_KEYS=Object.freeze({earth:'terrestre',aquatic:'aquatique',rock:'rocheuse',volcanic:'volcanique',ice:'glacee',gas:'gazeuse',spectralMetallic:'spectrale_metallique'});
export function resolveGeminiRenderPlan(familyKey,tierIndex,activeFlags=COSMIC_DEFAULTS) {
  const family=FAMILY_KEYS[familyKey]??familyKey;
  if (!Object.values(FAMILY_KEYS).includes(family) || !checkTierMemorySafety(tierIndex,0)) throw RangeError('Invalid cosmic render plan');
  return Object.freeze({family,tier:tierIndex,flags:activeFlags,allowSurfaceCivilization:family==='terrestre'});
}
import {createSharedReliefPool} from './shared-relief-pool.mjs';
const chunks = {cosmicArtProfilesV1:['atmosphere','volcanic']};
export async function prepareCosmicSession(search) {
  const flags=readCosmicFlags(search), sources={};
  await Promise.all(Object.entries(chunks).flatMap(([flag,names])=>flags[flag] ? names.map(async name=>{
    const response=await fetch(new URL('./shaders/cosmic-'+name+'-chunk.glsl',import.meta.url));
    if(!response.ok)throw Error(name+' HTTP '+response.status);
    sources[name]=await response.text();
  }) : []));
  let reserved=0;
  const session={flags,sources,tier:0,pool:createSharedReliefPool(),otherBytes:()=>0,
    reserve(bytes){if(!checkTierMemorySafety(session.tier,session.otherBytes()+reserved,bytes))return false;reserved+=bytes;return true;},
    release(bytes){reserved=Math.max(0,reserved-bytes);},get bytes(){return reserved;},envelope:createAudioEnvelopeState(),updateAudioEnvelopeInPlace,resolveGeminiRenderPlan};
  return session;
}
