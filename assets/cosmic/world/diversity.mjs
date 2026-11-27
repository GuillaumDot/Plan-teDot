import {hash} from './evolution.mjs';
export function selectZone(profiles,zone,seed,progress,variant){
 const group=profiles.filter(p=>p.biome===zone.biome&&p.family===zone.family);if(!group.length)return null;
 const i=Number.isInteger(variant)?((variant%group.length)+group.length)%group.length:hash(`${seed}:${zone.id}`)%group.length;
 const profile=group[i], t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
 const f=t*(profile.stages.length-1),lo=Math.floor(f),hi=Math.min(lo+1,profile.stages.length-1),b=f-lo;
 return {profile,from:profile.stages[lo],to:profile.stages[hi],blend:b*b*(3-2*b)};
}
