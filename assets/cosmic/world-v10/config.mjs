// Proposed budgets; validate on physical devices before enabling.
export const WORLD_CONFIG=Object.freeze({
 enabled:false,
 targetFPS:30,
 cacheWorlds:4,
 bakeResolution:64,
 transitionSeconds:0.65,
 audioSmoothingSeconds:0.18,
 tiers:Object.freeze([
 {pixelRatio:0.75,terrainLOD:2,particles:64,shadows:false,textureMiB:4},
 {pixelRatio:1,terrainLOD:2,particles:128,shadows:false,textureMiB:8},
 {pixelRatio:1.25,terrainLOD:1,particles:256,shadows:true,textureMiB:16},
 {pixelRatio:1.5,terrainLOD:0,particles:512,shadows:true,textureMiB:24}
 ].map(Object.freeze))
});
export function renderBudget(tier,devicePixelRatio=1,reducedMotion=false){
 const t=WORLD_CONFIG.tiers[Math.max(0,Math.min(3,Math.trunc(Number.isFinite(tier)?tier:0)))];
 return {...t,pixelRatio:Math.min(t.pixelRatio,Math.max(.5,devicePixelRatio)),particles:reducedMotion?0:t.particles,reducedMotion};
}
