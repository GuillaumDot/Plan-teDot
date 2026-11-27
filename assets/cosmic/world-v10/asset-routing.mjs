import {planetProfile} from './archetypes.mjs';
const root='assets/cosmic/procedural-v19/';
const routes=Object.freeze({earth:['alpine','desert','tropical','polar','island'],aquatic:['island','tropical','polar'],rock:['desert','alpine'],volcanic:['volcanic'],ice:['polar','alpine'],gas:[],spectralMetallic:['alien']});
export function terrainAssets(type,biome,lod=2){planetProfile(type);if(!Number.isInteger(lod)||lod<0||lod>2)throw new RangeError('LOD must be 0..2');if(!routes[type].includes(biome))return null;return {mesh:root+biome+'_lod'+lod+'.glb',albedo:root+biome+'_albedo.png',height:root+biome+'_height.png',normal:root+biome+'_normal_object.png',normalSpace:'object',triangles:[18432,4608,1152][lod]};}
export function supportedTerrain(type){planetProfile(type);return [...routes[type]];}
// These are local terrain tiles, not complete planet meshes.
// Temperate materials, ocean surface and gas atmosphere require dedicated assets.
