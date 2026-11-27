import {selectZone} from './diversity.mjs';
import {fxVariant} from './environment-v07.mjs';
const allowed=[['dust'],['rain','storm'],['storm'],['snow','dust'],['lava','eruption','dust'],['dust'],[],[],['eruption'],['dust'],['dust'],['rain','storm','snow','runoff','dust']];
export function createBridge({profiles,progress,biome,family,zoneId,terrain}){
 for(const f of [progress,biome,family,zoneId,terrain])if(typeof f!=='function')throw Error('Native adapter required');
 const groups=new Map(); for(const p of profiles){const k=p.biome+'|'+p.family;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}
 let enabled=false;
 return {enable(){enabled=true},disable(){enabled=false},zone(p,z){if(!enabled)return null;const id=zoneId(z),b=biome(p,z),f=family(p,z);if(id==null||!Number.isFinite(p.seed))return null;return selectZone(groups.get(b+'|'+f)||[],{id,biome:b,family:f},p.seed,progress(p,z));},effect(p,z,kind){if(!enabled||!allowed[p.type]?.includes(kind))return null;const id=zoneId(z);if(id==null||!Number.isFinite(p.seed))return null;return fxVariant(p.seed,id,kind);},sample(p,q){if(!enabled||[2,6,8].includes(p.type))return null;const v=terrain(p,q);return Number.isFinite(v)?v:null;}};
}
