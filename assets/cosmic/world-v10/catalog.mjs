import {ARCHETYPES,planetProfile} from './archetypes.mjs';
import {supportedTerrain,terrainAssets} from './asset-routing.mjs';
import {baseWorld} from './base-worlds.mjs';
export const CATALOG_VERSION=1;
export const GENERATOR_VERSION=10;
export function worldCatalog(){
 return Object.keys(ARCHETYPES).map(type=>({type,profile:planetProfile(type),base:baseWorld(type,0),terrain:supportedTerrain(type).map(biome=>({biome,lods:[0,1,2].map(lod=>terrainAssets(type,biome,lod))}))}));
}
export function validateCatalog(){
 const entries=worldCatalog(),errors=[];
 if(entries.length!==7)errors.push('Expected seven families');
 for(const e of entries){
 if(e.type==='gas'&&e.terrain.length)errors.push('Gas must not use solid terrain');
 for(const t of e.terrain)for(const a of t.lods)for(const k of ['mesh','albedo','height','normal'])if(typeof a?.[k]!=='string'||!a[k].startsWith('assets/cosmic/'))errors.push(e.type+': invalid '+k);
 }
 return {ok:errors.length===0,errors,version:CATALOG_VERSION};
}
// Derived catalog: no duplicate asset paths or archetype definitions.
// Persistent account data and legacy generator versions are not migrated here.

export function resolveTerrain(type,biome,lod=2){
 const supported=supportedTerrain(type);
 if(!supported.length)return null;
 const fallback={earth:'tropical',aquatic:'island',rock:'desert',volcanic:'volcanic',ice:'polar',spectralMetallic:'alien'};
 const resolved=supported.includes(biome)?biome:fallback[type];
 return {requested:biome,resolved,fallback:resolved!==biome,...terrainAssets(type,resolved,lod)};
}
