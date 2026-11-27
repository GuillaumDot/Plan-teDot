import {hash} from './evolution.mjs';
const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const stages=['Hameau','Village','Bourg','Petite ville','Ville','Métropole','Région','Pays','Continent'];
export function zoneProfile(id,progress){const p=clamp(progress),s=p*8;return {seed:hash(id)%65521,stage:Math.floor(s),blend:smooth(s%1),density:smooth(p),height:smooth((p-.18)/.82),extent:.2+.8*smooth(p),industry:smooth((p-.25)/.75),green:.65-.25*p};}
export function lotProfile(id,x,y,progress){const z=zoneProfile(id,progress),h=hash(`${id}:${x}:${y}`)/4294967296;const variant=hash(`${id}:${x}:${y}:shape`)%16;return {variant,visibility:smooth((z.density-h)*8+.5),height:.12+z.height*(.25+1.6*h),roof:variant%4,facade:Math.floor(variant/4),seed:h};}
export function terrainProfile(progress){const p=clamp(progress);return {relief:.15+.85*smooth(p),ridge:smooth((p-.25)/.75),forest:smooth((p-.1)/.9),snow:smooth((p-.55)/.45)};}
