import {planetProfile} from './archetypes.mjs';
export const BASE_VERSION=1;
const presets=Object.freeze({earth:[170,0x376c43,0x2367a0],aquatic:[176,0x145c8c,0x38b8b1],rock:[171,0x81715f,0x4a4038],volcanic:[172,0x292323,0xf05a19],ice:[174,0xc5e3ec,0x669fbd],gas:[177,0xc7a17c,0x805d48],spectralMetallic:[175,0x777b9b,0x8663bf]});
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
export function baseWorld(type,seed){const p=planetProfile(type);const [baseSeed,primary,secondary]=presets[type];return {version:BASE_VERSION,type,baseSeed,seed:hash(type+':'+String(seed)),palette:[primary,secondary],...p.base};}
// Descriptors only: actual baked sphere meshes and textures are still required.
