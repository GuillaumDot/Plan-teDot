// V10fp — registre central des ressources du pack cosmique (Phase A, vision de Guillaume §6).
// Une entrée par jeu de ressources : emplacement, type, résolution, destination, dépendances, coût mémoire, LOD, repli, état.
// Chiffres relevés sur disque par tools/inventaire/inventaire.py (détail fichier par fichier : docs/inventaire-pack-cosmique.json).
// Sans DOM, sans RAF, sans effet sur le rendu : le moteur V10 ne fait qu'y noter ce qu'il charge (trackResource) et y lire
// le chemin canonique d'un fichier en double (canonicalPath), pour ne jamais télécharger ni envoyer deux fois le même contenu.
export const REGISTRY_VERSION=1;
const MiB=1048576;
const range=(n,f)=>Array.from({length:n},(_,i)=>f(i));
const v2=i=>String(i).padStart(2,'0');
const INFRA=['market','water_tower','lighthouse','monument','greenhouse','harbor_crane','rail_station','bridge','road_vehicle','cargo_ship','wind_turbine','solar_array','train','stadium','observatory','satellite_dish','launch_pad','space_beacon'];
const NATURE=['broadleaf','pine','cactus'],NATURE_FREE=['ice_spire','rock_arch','volcanic_vent'];
const BIOMES=['alien','alpine','desert','island','polar','tropical','volcanic'];
const PBR=['basalt','desert','gas','ice','ocean'];
const V11=['apartment','barn','castle','chalet','church','cottage','factory','fort','greenhouse','lighthouse','market','station','tower','townhouse','warehouse','windmill'];
const EMOTES=['applause','bass','chills','diamond','fire','headphones','love','magic','mind','music','night','repeat','sad','space'],DANCES=['hiphop','salsa','groove'];
const FX=['dust','eruption','lava','meteor','rain','runoff','snow','storm'],ATMO=['cloud','dust','gas','spectral'];
const MAT=['asphalt','basalt','brick','concrete','granite','grass','ice','lava','metal','sand','slate','snow'];
const C='assets/cosmic/',W=C+'world/',E=W+'expansion-v14/';
// state : 'utilisée' (chargée par défaut ou derrière un drapeau), 'sous-exploitée' (jeu branché en partie), 'inutilisée' (jamais demandée à l'exécution).
// load : quand elle est demandée. gpu : octets GPU estimés (RGBA8 + mipmaps pour une image ; 11 floats × 3 sommets × triangles pour un GLB décodé par V10).
export const RESOURCES=Object.freeze([
 {id:'v9.relief.volcan',dir:'assets/blender/relief/',files:['volcan-hn.png','volcan-ao.png','volcan-hn-512.png','volcan-ao-512.png'],type:'texture',format:'PNG RGB',res:'1024² (paliers 1-2) / 512² (palier 0)',dest:'V9 (index.html, unités 5 et 6, uVS0/uVS1 du shader planète)',deps:['manifest.json (hn = normale RG + hauteur B ; ao = occlusion, lave, ravines)'],gpu:{t0:2796202,t1:11184810},lod:'512 au palier 0, 1024 au-delà',fallback:'texture neutre 1×1 (uVSOn=0), ?relief=0',state:'utilisée',load:'défaut V9, après le logo',licence:'aucun fichier (bake Blender interne, manifest.json)'},
 {id:'v9.pbr512',dir:'assets/blender/pbr-512/',files:PBR.flatMap(p=>[p+'-albedo.png',p+'-normal.png',p+'-roughness.png']),type:'texture',format:'PNG RGB',res:'512×256',dest:'V9 opt-in ?pbr=1 (PD9PBR, unité 4 uPDNormal) ; V10 : préréglages par type (full-potential.mjs PBR_PRESETS), chargeur pas encore branché',deps:['manifest.json (UV sphère Blender, normale +X+Y+Z)'],gpu:{perPreset:1398100,roughnessFlat:0},lod:'aucun au palier 0, 256 au palier 1, 512 aux paliers 2-3 (TIER_PBR_SIZE)',fallback:'rugosité en uniforme (cartes plates : PBR_ROUGHNESS) ; sans PBR = rendu V9 actuel',state:'sous-exploitée',load:'opt-in ?pbr=1 (V9) ; jamais en V10 pour l’instant',licence:'aucun fichier',notes:'Les 5 cartes de rugosité sont une valeur unique : à ne pas charger (uniforme).'},
 {id:'v10.terrain.albedo',dir:C+'procedural-v19/',files:BIOMES.map(b=>b+'_albedo.png'),type:'texture',format:'PNG RGB',res:'512²',dest:'V10 terrain-texture.mjs → renderer uDetail (unité 2) de planet-fragment.glsl',deps:['asset-routing.mjs','catalog.mjs (resolveTerrain)'],gpu:{each:1398101,atlasEarth:349525},lod:'atlas Terre 2×2 tuiles (256 au palier 0), sinon une tuile plafonnée à 512',fallback:'texture neutre grise 128 (uDetailStrength=0)',state:'utilisée',load:'V10 à la sélection d’une planète (?world10=1)',licence:'aucun fichier (généré par generate.py du dossier)'},
 {id:'v10.terrain.height',dir:C+'procedural-v19/',files:BIOMES.map(b=>b+'_height.png'),type:'texture',format:'PNG 16 bits niveaux de gris',res:'97²',dest:'V10 renderer uHeight (unité 3), micro-relief',deps:['v10.terrain.albedo'],gpu:{each:50181},lod:'force 0,25 / 0,65 / 1 selon le palier',fallback:'neutre (uMicroStrength=0)',state:'utilisée',load:'avec l’albédo',licence:'aucun fichier',notes:'97 px seulement : relief très doux ; candidat à un pré-traitement hors ligne plus fin.'},
 {id:'v10.terrain.normal',dir:C+'procedural-v19/',files:BIOMES.map(b=>b+'_normal_object.png'),type:'texture',format:'PNG RGB (normale espace objet)',res:'97²',dest:'aucune (espace objet d’une tuile locale, pas d’une planète)',deps:[],gpu:{each:50181},lod:'—',fallback:'normale dérivée de la hauteur',state:'sous-exploitée',load:'jamais',licence:'aucun fichier'},
 {id:'v10.terrain.meshes',dir:C+'procedural-v19/',files:BIOMES.flatMap(b=>[0,1,2].map(l=>b+'_lod'+l+'.glb')),type:'modèle 3D',format:'GLB',res:'18 432 / 4 608 / 1 152 triangles',dest:'aucune (tuiles de terrain locales, citées par catalog.mjs seulement)',deps:[],gpu:{lod0:2433024,lod1:608256,lod2:152064},lod:'3 niveaux fournis',fallback:'relief par pixel du shader',state:'sous-exploitée',load:'jamais',licence:'aucun fichier'},
 {id:'v10.generator',dir:C+'natural-world-v22/',files:['world.mjs'],type:'module JS',format:'ES module',res:'grille par face selon la cuisson',dest:'V10 bake.mjs (CPU, Worker) → cartes cube uTerrain/uClimate',deps:['base-worlds.mjs','surface.mjs'],gpu:{bakeT01:524288,bakeT23:2097152},lod:'cuisson 128 px/face (paliers 0-1), 256 lissée (paliers 2-3)',fallback:'rendu V9',state:'utilisée',load:'V10',licence:'aucun fichier (code de l’équipe)'},
 {id:'v10.living.infra',dir:E+'models/',files:INFRA.flatMap(f=>range(8,i=>f+'-'+v2(i+1)+'.glb')),type:'modèle 3D',format:'GLB (couleurs par sommet ; image 64² embarquée ignorée)',res:'60 à 332 triangles',dest:'V10 living-cities.mjs (programme instancié propre)',deps:['living.mjs (activity, lod, eligible)','natural-world-v22 (villes, routes, ponts)'],gpu:{tier1:325248,tier3Max:1300992},lod:'variantes par famille 0/1/2/4 (paliers 0..3), géométrie au-dessus de 256 px à l’écran',fallback:'lumières de ville de la carte cuite',state:'sous-exploitée',load:'au premier gros plan, palier ≥ 1 (?v10city=0 coupe)',licence:'aucun fichier',notes:'Variantes 05 à 08 jamais chargées. market == rail_station et solar_array 02-08 == 01 au bit près (canonicalPath).'},
 {id:'v10.living.nature',dir:E+'models/',files:NATURE.flatMap(f=>range(8,i=>f+'-'+v2(i+1)+'.glb')),type:'modèle 3D',format:'GLB',res:'voir manifest.json',dest:'V10 vegetation.mjs (cities.mjs cityProgram)',deps:['natural-world-v22 (végétation)'],gpu:{loaded:66792},lod:'palier ≥ 2, géométrie seulement',fallback:'aucune végétation',state:'sous-exploitée',load:'V10, variante 01 seulement',licence:'aucun fichier'},
 {id:'v10.living.natureFree',dir:E+'models/',files:NATURE_FREE.flatMap(f=>range(8,i=>f+'-'+v2(i+1)+'.glb')),type:'modèle 3D',format:'GLB',res:'voir manifest.json',dest:'à brancher (arches, flèches de glace, évents volcaniques : planètes rocheuses, glacées, volcaniques)',deps:[],gpu:{all:950400},lod:'—',fallback:'—',state:'inutilisée',load:'jamais',licence:'aucun fichier'},
 {id:'v10.living.rules',dir:E,files:['living.mjs'],type:'module JS',format:'ES module',res:'—',dest:'V10 living-cities.mjs',deps:[],gpu:{},lod:'lod() par pixels écran',fallback:'—',state:'utilisée',load:'V10',licence:'aucun fichier'},
 {id:'pack.expansion.detail',dir:E+'textures/',files:range(12,i=>'detail-'+v2(i)+'.png'),type:'texture',format:'PNG niveaux de gris',res:'128²',dest:'à brancher (détail des façades/sols des GLB)',deps:[],gpu:{each:87381},lod:'—',fallback:'couleurs par sommet',state:'inutilisée',load:'jamais',licence:'aucun fichier'},
 {id:'v10.landmarks',dir:W+'world-v11/',files:V11.flatMap(f=>range(8,i=>f+'-'+v2(i)+'.glb')),type:'modèle 3D',format:'GLB (parties nommées)',res:'116 à 1 080 triangles',dest:'V10 landmarks.mjs (cottage-00, tower-00, factory-00 seulement)',deps:['static-glb.mjs'],gpu:{loaded:120000},lod:'palier ≥ 2 et croissance complète',fallback:'immeubles procéduraux de cities.mjs',state:'sous-exploitée',load:'V10',licence:'aucun fichier',notes:'Doublons exacts : barn/chalet/cottage (variantes impaires), chalet == cottage (paires), market == station.'},
 {id:'pack.world-v10.models',dir:W+'world-v10/',files:V11.flatMap(f=>range(6,i=>f+'-'+v2(i)+'.glb')),type:'modèle 3D',format:'GLB',res:'116 à 876 triangles',dest:'aucune (remplacé par world-v11)',deps:[],gpu:{all:4375008},lod:'—',fallback:'world-v11',state:'inutilisée',load:'jamais',licence:'CC0-1.0 déclarée dans models.json (seul jeu avec une licence écrite), aucun fichier LICENSE'},
 {id:'pack.atmosphere',dir:W+'atmosphere/',files:ATMO.flatMap(a=>range(8,i=>a+'_'+v2(i)+'.png')),type:'texture',format:'PNG RGB linéaire (R densité, G détail, B émission)',res:'256²',dest:'à brancher : nuages animés, bandes des gazeuses, poussière, halos spectraux',deps:['manifest.json (typeIds)'],gpu:{each:349525},lod:'—',fallback:'bruit procédural du shader',state:'inutilisée',load:'jamais',licence:'aucun fichier'},
 {id:'pack.fx',dir:W+'fx-v07/',files:FX.flatMap(a=>range(8,i=>a+'_'+v2(i)+'.png')),type:'texture',format:'PNG RGB linéaire (masques locaux)',res:'256²',dest:'à brancher : éruptions, coulées, orages, pluie, neige, météores',deps:['manifest.json'],gpu:{each:349525},lod:'—',fallback:'—',state:'inutilisée',load:'jamais',licence:'aucun fichier'},
 {id:'pack.detailMasks',dir:W+'detail-masks-v09/',files:['aurora','canopy','comet','fog','moraine','reef','ringdust','roadwear','roofweather','sediment','strata','wetness'].map(n=>n+'.png'),type:'texture',format:'PNG RGB',res:'128²',dest:'à brancher : aurores, anneaux poussiéreux, brouillard, récifs, usure des routes, toits patinés, strates',deps:['asset-index-v09.json'],gpu:{each:87381},lod:'—',fallback:'—',state:'inutilisée',load:'jamais',licence:'aucun fichier'},
 {id:'pack.materials128',dir:W+'textures/',files:MAT.flatMap(m=>['albedo','height','normal','roughness'].map(k=>m+'_'+k+'.png')),type:'texture',format:'PNG RGB / niveaux de gris',res:'128²',dest:'tuiles de référence (manifest : « not wired »)',deps:['manifest.json'],gpu:{each:87381},lod:'—',fallback:'—',state:'inutilisée',load:'jamais',licence:'aucun fichier (Dot Visuels : licence à documenter avant tout usage)'},
 {id:'pack.social.reactions',dir:C+'social/assets/',files:[...EMOTES.flatMap(e=>[1,2,3].flatMap(k=>[e+'-'+k+'-atlas.png',e+'-'+k+'.gif',e+'-'+k+'.png'])),...DANCES.flatMap(d=>[d+'-atlas.png',d+'.gif',d+'.webp',d+'.png'])],type:'animation',format:'atlas PNG 4×4 + GIF/WebP + poster',res:'atlas 576×384 (émotes) / 768² (danses), GIF 128² × 24 images',dest:'à brancher : réactions animées posées sur les zones/villes (ReactionPool de reactions.mjs)',deps:['manifest.json','effects-manifest.json','reactions.mjs','sprite.glsl'],gpu:{emoteAtlas:1179648,danceAtlas:3145728},lod:'poster si « réduire les animations »',fallback:'émoji texte de la réaction V9 (PD9_RX)',state:'inutilisée',load:'jamais',licence:'aucun fichier'},
 {id:'pack.code',dir:C,files:null,type:'code et docs',format:'mjs, glsl, py, md, json, css, html',res:'—',dest:'référence (volume-v17, chemistry-v12, universe-v13, performance-v18, social/*.mjs, world/*.glsl, natural-world-v21…)',deps:[],gpu:{},lod:'—',fallback:'—',state:'inutilisée',load:'jamais (sauf modules V10 importés)',licence:'aucun fichier'}
]);
const byId=new Map(RESOURCES.map(r=>[r.id,r]));
export const resource=id=>byId.get(id)??null;
export function resourceFiles(r){return Array.isArray(r?.files)?r.files.map(f=>r.dir+f):[];}
const pathIndex=new Map();for(const r of RESOURCES)for(const p of resourceFiles(r))if(!pathIndex.has(p))pathIndex.set(p,r.id);
export const resourceForPath=path=>{const id=pathIndex.get(String(path).replace(/^\.?\//,''));return id?byId.get(id):null;};
// Doublons exacts (sha256 identique, relevé par l'inventaire) : chemin -> chemin canonique.
const DUP=[
 ...range(8,i=>[E+'models/rail_station-'+v2(i+1)+'.glb',E+'models/market-'+v2(i+1)+'.glb']),
 ...range(7,i=>[E+'models/solar_array-'+v2(i+2)+'.glb',E+'models/solar_array-01.glb']),
 ...[1,3,5,7].flatMap(i=>[[W+'world-v11/chalet-'+v2(i)+'.glb',W+'world-v11/barn-'+v2(i)+'.glb'],[W+'world-v11/cottage-'+v2(i)+'.glb',W+'world-v11/barn-'+v2(i)+'.glb']]),
 ...[0,2,4,6].map(i=>[W+'world-v11/cottage-'+v2(i)+'.glb',W+'world-v11/chalet-'+v2(i)+'.glb']),
 ...range(8,i=>[W+'world-v11/station-'+v2(i)+'.glb',W+'world-v11/market-'+v2(i)+'.glb'])
];
export const DUPLICATES=Object.freeze(Object.fromEntries(DUP));
export const canonicalPath=path=>DUPLICATES[path]??path;
// États de chargement à l'exécution (loading → ready | failed → released), avec les octets téléchargés. Mémoire seulement, jamais persistée.
// (La mémoire GPU réelle reste suivie par le compteur JS du moteur : PD10Host.stats.gpuBytes.)
const live=new Map();
export function trackResource(path,state,bytes=0){   // bytes : octets téléchargés
 if(!['loading','ready','failed','released'].includes(state))return;
 const prev=live.get(path),b=state==='ready'?Math.max(0,bytes|0):0;live.set(path,{state,bytes:b,id:resourceForPath(path)?.id??null,t:prev?.t??0});
}
export function registrySnapshot(){
 const out={ready:0,loading:0,failed:0,released:0,bytes:0,byId:{}};
 for(const [p,v] of live){out[v.state]++;out.bytes+=v.bytes;const k=v.id??'hors registre';(out.byId[k]??={ready:0,bytes:0,failed:0});if(v.state==='ready'){out.byId[k].ready++;out.byId[k].bytes+=v.bytes;}if(v.state==='failed')out.byId[k].failed++;}
 return out;
}
export function resetRegistryTracking(){live.clear();}
export const registryMiB=s=>Math.round((s?.bytes??0)/MiB*100)/100;
