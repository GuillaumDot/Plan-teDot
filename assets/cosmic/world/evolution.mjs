// Pure helpers; renderer and persistence remain owned by Claude.
export function hash(s){let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0}
export function evolution(catalog, zone, progress){
 const family=catalog.filter(x=>x.biome===zone.biome&&x.family===zone.family);
 if(!family.length)return null;
 const max=Math.max(...family.map(x=>x.stage));const variant=hash(zone.id)%8;
 const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
 const stage=1+p*(max-1),lo=Math.floor(stage),hi=Math.min(max,lo+1),t=stage-lo;
 const blend=t*t*(3-2*t);const find=s=>family.find(x=>x.stage===s&&x.variant===variant);
 return {id:zone.id,variant,from:find(lo),to:find(hi),blend,position:zone.position};
}
export function suitability(f,{altitude=0,moisture=.5,temperature=.5,waterDepth=0,slope=0}={}){
 if(f==='forest')return waterDepth>0?0:Math.max(0,moisture*(1-Math.abs(temperature-.55))* (1-slope));
 if(f==='housing'||f==='industry')return waterDepth>0?0:Math.max(0,1-slope*2);
 if(f==='reef')return waterDepth>0&&waterDepth<.25?temperature:0;
 if(f==='ice')return Math.max(0,altitude-temperature);
 if(f==='dune')return waterDepth>0?0:(1-moisture)*temperature;
 return 1;
}
