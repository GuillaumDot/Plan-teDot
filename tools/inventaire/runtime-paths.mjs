// Chemins réellement demandés à l'exécution par le moteur V10 (évalués depuis les modules, pas supposés).
import {LIVING_FAMILIES,LIVING_TIER,modelPath} from '../../assets/cosmic/world-v10/living-cities.mjs';
import {VEGETATION_PATHS} from '../../assets/cosmic/world-v10/vegetation.mjs';
import {CITY_MODEL_PATHS} from '../../assets/cosmic/world-v10/static-glb.mjs';
import {resolveTerrain} from '../../assets/cosmic/world-v10/catalog.mjs';
import {EARTH_DETAIL_TILES} from '../../assets/cosmic/world-v10/terrain-texture.mjs';
import {ARCHETYPES} from '../../assets/cosmic/world-v10/archetypes.mjs';
import {supportedTerrain} from '../../assets/cosmic/world-v10/asset-routing.mjs';
const out={};const add=(p,why)=>{(out[p]??=[]).push(why);};
for(const [t,cfg] of LIVING_TIER.entries())for(const f of LIVING_FAMILIES)for(let v=0;v<cfg.variants;v++)add(modelPath(f,v),'living-cities palier '+t);
for(const p of Object.values(VEGETATION_PATHS))add(p,'vegetation (palier ≥ 2)');
for(const p of Object.values(CITY_MODEL_PATHS))add(p,'landmarks (palier ≥ 2)');
for(const b of EARTH_DETAIL_TILES){const a=resolveTerrain('earth',b);add(a.albedo,'atlas détail Terre');add(a.height,'atlas relief Terre');}
for(const type of Object.keys(ARCHETYPES))for(const b of [...supportedTerrain(type),'?']){const a=resolveTerrain(type,b);if(a){add(a.albedo,'détail '+type);add(a.height,'relief '+type);}}
for(const k of Object.keys(out))out[k]=[...new Set(out[k])];
console.log(JSON.stringify(out));
