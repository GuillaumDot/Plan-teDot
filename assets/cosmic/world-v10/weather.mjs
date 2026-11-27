import {baseWorld} from './base-worlds.mjs';
// Deterministic center, safely away from the polar tangent singularity.
export function stormCenter(type,seed){
 const s=baseWorld(type,seed).seed>>>0;
 const lon=2*Math.PI*((s&65535)/65536),lat=(.16+((s>>>16)&255)/255*.40)*((s&256)?-1:1);
 return [Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon)];
}
