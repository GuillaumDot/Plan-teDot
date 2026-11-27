// Archetype contract, not yet connected to renderer.
const profile=(id,base,systems,materials,models)=>Object.freeze({id,base:Object.freeze(base),systems:Object.freeze(systems),materials:Object.freeze(materials),models:Object.freeze(models)});
export const ARCHETYPES=Object.freeze({
 earth:profile('earth',{water:.65,atmosphere:1,relief:.55},['tectonics','hydrology','climate','biomes','settlements'],['soil','rock','vegetation','water','snow'],['trees','cities','roads','bridges','ports']),
 aquatic:profile('aquatic',{water:.94,atmosphere:1,relief:.25},['bathymetry','currents','waves','islands','storms'],['deepWater','shallowWater','reef','sand'],['reefs','islands','floatingStructures']),
 rock:profile('rock',{water:0,atmosphere:.08,relief:.8},['craters','faults','dust','erosion'],['basalt','regolith','minerals'],['boulders','cliffs']),
 volcanic:profile('volcanic',{water:0,atmosphere:.5,relief:.9},['tectonics','vents','lavaFlow','ash'],['basalt','obsidian','lava','ash'],['volcanoes','fissures']),
 ice:profile('ice',{water:.1,atmosphere:.3,relief:.6},['glaciers','fractures','snow','iceDrift'],['ice','snow','rock'],['icebergs','iceRidges']),
 gas:profile('gas',{water:0,atmosphere:1,relief:0},['jetStreams','cloudBands','vortices','storms'],['clouds','haze'],[]),
 spectralMetallic:profile('spectralMetallic',{water:0,atmosphere:.15,relief:.45},['craters','crystals','metalVeins','spectralEmission'],['metal','crystal','iridescence'],['crystalClusters','metalRidges'])
});
export function planetProfile(type){if(!Object.hasOwn(ARCHETYPES,type))throw new RangeError('Unknown planet archetype');return ARCHETYPES[type];}
export function allowsSystem(type,system){return planetProfile(type).systems.includes(system);}
export function allowsModel(type,model){return planetProfile(type).models.includes(model);}
