# Inventaire du pack cosmique : Phase A (V10fp, 27/11/2026)

Audit demandé par la vision de Guillaume (`docs/VISION_PACK_COSMIQUE.md`, §2 et §10 Phase A). Fait par Grok sur la branche locale `feature/v10fp-interactions`. **Rien n'a été déplacé ni supprimé.**

## Méthode (reproductible)
- `python3 tools/inventaire/inventaire.py` relit **chaque fichier** de `assets/cosmic/` et `assets/blender/` : 914 fichiers, 57,3 Mo. Pour chacun il relève :
  - le poids et le sha256 ;
  - la résolution et le mode, lus dans l'image avec PIL ;
  - le nombre d'images des GIF et WebP ;
  - pour les GLB, les triangles, sommets, matériaux et images embarquées, lus dans le JSON du GLB ;
  - les doublons exacts (même sha256) ;
  - la licence : recherche d'un fichier LICENSE, COPYING ou CREDITS dans le dossier et ses parents, et du champ `license` des `models.json` ;
  - l'état d'usage.
  Résultat fichier par fichier : `docs/inventaire-pack-cosmique.json`.
- **Usage réel**, jamais supposé :
  - `tools/inventaire/runtime-paths.mjs` évalue les modules V10 eux-mêmes pour lister les chemins demandés à l'exécution : `modelPath` × `LIVING_TIER`, `VEGETATION_PATHS`, `CITY_MODEL_PATHS`, `resolveTerrain` pour les 7 familles. Il en sort 92 chemins.
  - Le graphe d'import est parcouru depuis `focused-host.mjs` et `bake-worker.mjs`.
  - index.html a été relu (V9) : `assets/blender/relief/` est chargé par défaut, `assets/blender/pbr-512/` seulement sous `?pbr=1`, et `assets/cosmic/world-v10/focused-host.mjs` seulement sous `?world10=1`. **V9 ne lit aucun fichier de `assets/cosmic/`.**
- Coût GPU estimé :
  - image : RGBA8 + mipmaps = l × h × 4 × 4/3 ;
  - GLB tel que V10 le décode : triangles dépliés × 3 sommets × 11 floats × 4 octets ;
  - GIF et WebP : 0, car ils sont affichés dans le DOM et ne passent pas par le GPU.
  La colonne GPU du tableau donne le coût **si tout le dossier était chargé**. Les coûts réels par palier sont dans le registre.
- Registre central : `assets/cosmic/world-v10/resource-registry.mjs`, 20 jeux et 773 fichiers listés. Le test `tests/resource-registry.test.mjs` vérifie que chaque fichier existe, que chaque image ou GLB du pack est couvert, que chaque chemin demandé par V10 y figure et que les doublons sont identiques au bit près.

## Bilan
- **145 fichiers utilisés** : 32 modules et 3 shaders V10, 75 GLB d'infrastructure, 3 de végétation, 3 de repères, 14 textures de terrain, 4 de relief V9 et 15 PBR en opt-in `?pbr=1`.
- **142 sous-exploités** : le jeu est branché, mais ce fichier n'est jamais chargé.
- **627 inutilisés à l'exécution**, dont des docs, des scripts et des tests.
- **Licences : aucun fichier LICENSE dans tout le pack.** Seul `world/world-v10/models.json` déclare `CC0-1.0`, pour 96 GLB qu'aucun module ne charge. Tous les fichiers chargés aujourd'hui sont sans licence écrite. Ce sont des prototypes générés par les scripts du dépôt (`generate.py`, `build.py`) ou des bakes Blender internes. Il faut ajouter un `LICENSE` ou `CREDITS` par dossier avant toute publication large. C'est déjà signalé par Dot Visuels pour `world/textures`.
- **60 fichiers en double exact** :
  - expansion-v14 : `market-0N == rail_station-0N` (8 paires), et `solar_array-02..08 == solar_array-01` ;
  - world-v11 : barn, chalet et cottage identiques sur les variantes impaires, `chalet == cottage` sur les paires, `market == station`.
  - Les deux premiers groupes étaient chargés et envoyés au GPU deux fois. **C'est corrigé** : `canonicalPath` dans le registre, un seul téléchargement et décodage par contenu dans `loadLivingModels`, et un seul tampon de sommets par modèle dans `uploadLiving`.
- Images embarquées dans les GLB : 8 images 64² distinctes, répétées dans 919 GLB. V10 les ignore et utilise les couleurs par sommet, donc aucun coût GPU.
- Cartes plates : les 5 `*-roughness.png` de pbr-512 n'ont qu'une seule valeur. Elles sont déjà remplacées par des uniformes (`PBR_ROUGHNESS`) et ne doivent pas être chargées.
- Hauteurs procedural-v19 : **97 × 97 en 16 bits seulement**, ce qui donne un micro-relief très doux. C'est un candidat à un pré-traitement hors ligne.

## Par dossier
Colonnes : fichiers ; types ; résolution ; poids disque ; GPU si tout est chargé ; utilisés / sous-exploités / inutilisés ; doublons ; licence.

| Dossier | N | Types | Résolution | Disque | GPU max | U/S/I | Doublons | Licence |
|---|---|---|---|---|---|---|---|---|
| `blender/pbr-512` | 16 | 15 texture, 1 données | 512×256 (15) | 1.84 Mio | 10.00 Mio | 15/0/1 | — | aucune |
| `blender/relief` | 5 | 4 texture, 1 données | 512×512 (2), 1024×1024 (2) | 1.47 Mio | 13.33 Mio | 4/0/1 | — | aucune |
| `cosmic` | 5 | 4 doc, 1 données | — | 155 Kio | — | 0/0/5 | — | aucune |
| `cosmic/natural-world-v21` | 1 | 1 module JS | — | 2 Kio | — | 0/0/1 | — | aucune |
| `cosmic/natural-world-v22` | 4 | 2 module JS, 1 doc, 1 texture | 512×512 (1) | 240 Kio | 1.33 Mio | 1/0/3 | — | aucune |
| `cosmic/procedural-v19` | 46 | 21 texture, 21 modèle 3D, 2 doc, 1 script hors ligne, 1 données | 512×512 (7), 97×97 I;16 (7), 97×97 (7); 1152–18432 tri | 5.12 Mio | 31.32 Mio | 14/28/4 | — | aucune |
| `cosmic/social` | 18 | 8 module JS, 4 doc, 2 données, 2 style, 1 script hors ligne, 1 shader | — | 33 Kio | — | 0/0/18 | — | aucune |
| `cosmic/social/assets` | 138 | 90 texture, 48 animation | 576×384 RGBA (42), 128×128 P ×24 img (42), 96×96 RGBA (42) | 11.79 Mio | 58.78 Mio | 0/0/138 | — | aucune |
| `cosmic/world` | 30 | 7 script hors ligne, 7 module JS, 6 doc, 6 données, 4 shader | — | 3.75 Mio | — | 0/0/30 | — | aucune |
| `cosmic/world-v10` | 40 | 33 module JS, 3 shader, 2 doc, 2 page de test | — | 193 Kio | — | 32/0/8 | — | aucune |
| `cosmic/world/atmosphere` | 33 | 32 texture, 1 données | 256×256 (32) | 2.26 Mio | 10.67 Mio | 0/0/33 | — | aucune |
| `cosmic/world/chemistry-v12` | 3 | 2 module JS, 1 doc | — | 5 Kio | — | 0/0/3 | — | aucune |
| `cosmic/world/detail-masks-v09` | 12 | 12 texture | 128×128 (12) | 409 Kio | 1024 Kio | 0/0/12 | — | aucune |
| `cosmic/world/expansion-v14` | 3 | 2 module JS, 1 données | — | 44 Kio | — | 1/0/2 | — | aucune |
| `cosmic/world/expansion-v14/models` | 192 | 192 modèle 3D | 60–720 tri | 6.23 Mio | 3.90 Mio | 75/93/24 | 24 | aucune |
| `cosmic/world/expansion-v14/textures` | 12 | 12 texture | 128×128 L (12) | 146 Kio | 1024 Kio | 0/0/12 | — | aucune |
| `cosmic/world/fx-v07` | 65 | 64 texture, 1 données | 256×256 (64) | 3.85 Mio | 21.33 Mio | 0/0/65 | — | aucune |
| `cosmic/world/performance-v18` | 4 | 2 module JS, 1 doc, 1 données | — | 128 Kio | — | 0/0/4 | — | aucune |
| `cosmic/world/textures` | 49 | 48 texture, 1 données | 128×128 (24), 128×128 L (24) | 681 Kio | 4.00 Mio | 0/0/49 | — | aucune |
| `cosmic/world/universe-v13` | 3 | 2 module JS, 1 doc | — | 4 Kio | — | 0/0/3 | — | aucune |
| `cosmic/world/volume-v17` | 4 | 2 module JS, 1 doc, 1 shader | — | 5 Kio | — | 0/0/4 | — | aucune |
| `cosmic/world/world-v10` | 100 | 96 modèle 3D, 2 doc, 1 script hors ligne, 1 données | 116–876 tri | 8.58 Mio | 4.17 Mio | 0/0/100 | — | CC0 (models.json) |
| `cosmic/world/world-v11` | 131 | 128 modèle 3D, 1 doc, 1 script hors ligne, 1 données | 116–1080 tri | 10.42 Mio | 5.21 Mio | 3/21/107 | 36 | aucune |

## Cartographie ressource → shader → moteur
| Ressource | Chargée par | Shader, unité | Moteur | Quand | Repli |
|---|---|---|---|---|---|
| `textures84-{compact,mobile,hd}.bin` (racine, hors pack : 28 textures Figma) | `pdAtlasCandidates`, `pdAtlasLoad`, `pdTxFetch`, `pdTxPut`, `pdTxFin` | planète, ciel, galaxies (`arr`, `gal`, `gz`) | V9 | au toucher du logo ; compact au palier 0 et dans les navigateurs intégrés | compact, puis rendu procédural V8.0 (`pdAtlasFail`) |
| `textures9-{mobile,hd}.bin` (racine) | `pd9BrFetch` | souffles, unité 14 (`uBreath.z`) | V9 | après l'atlas | souffles procéduraux |
| `blender/relief/volcan-hn(-512)`, `volcan-ao(-512)` | bloc PDRV (l. 3690) | unités 5 et 6, `uVS0`/`uVS1`, `uVSOn` | V9 | par défaut ; 512 au palier 0 | texture neutre 1 × 1, `?relief=0` |
| `blender/pbr-512/*-albedo`, `*-normal` | `pd9PbrInit` | unité 4, `uPDNormal` | V9 | **`?pbr=1` seulement** (orientation UV non validée) | normale neutre |
| `procedural-v19/*_albedo.png` | `terrain-texture.mjs` (`loadEarthDetailAtlas`, `loadTerrainAlbedo`) | `uDetail`, unité 2, de `planet-fragment.glsl` | V10 | sélection de la planète | gris neutre |
| `procedural-v19/*_height.png` | `loadTerrainHeight` | `uHeight`, unité 3 | V10 | avec l'albédo | `uMicroStrength = 0` |
| `natural-world-v22/world.mjs` | `bake.mjs` (Worker) | cubes `uTerrain` (unité 0) et `uClimate` (unité 1) | V10 | sélection | rendu V9 |
| `expansion-v14/models/<18 familles>-0N.glb` | `living-cities.mjs` | programme instancié propre (sodium #ffb35a, LED #dfe8ff) | V10 | premier gros plan au palier ≥ 1 ; variantes 1 / 2 / 4 selon le palier | lumières de la carte |
| `expansion-v14/models/{broadleaf,pine,cactus}-01.glb` | `vegetation.mjs` | `cities.mjs` (cityProgram) | V10 | palier ≥ 2 | aucune végétation |
| `world-v11/{cottage,tower,factory}-00.glb` | `static-glb.mjs`, `landmarks.mjs` | cityProgram | V10 | palier ≥ 2 et croissance complète | immeubles procéduraux |
| `expansion-v14/living.mjs` | `living-cities.mjs` | — (règles CPU : `eligible`, `lod`) | V10 | — | — |
| `world-v10/materials.glsl`, `relief-atmosphere.glsl`, `planet-fragment.glsl` | `program.mjs` | programme planète V10 | V10 | initialisation | V9 (`PD10Failed`) |

**Points de contact V9 ↔ V10** à surveiller (vision §9) :
- V10 dessine dans le même contexte WebGL2 que V9. `withSharedGL` sauvegarde et restaure le VAO, le programme, les unités 0 à 3 et les samplers. Le compositeur sauvegarde et restaure le framebuffer, le viewport, les masques et les drapeaux.
- V10 n'utilise jamais les unités 4, 5, 6, 14 ni 15, réservées à V9 (PBR, relief, souffles, réactions). Aucun `pdTx*`, `pdAtlas*` ni `pdGov` n'est appelé par V10.
- `pdGov` peut baisser `TIER` : V10 suit `appTier` à chaque image (`v10Tier`), sans état propre.

## Top 10 : meilleur rapport qualité / coût GPU à intégrer ensuite
Classement par gain visible pour la vision (§3), divisé par le coût mémoire au palier 2 de l'iPhone (16 Mio), puis par le risque.
1. **Relief des volcans V9 partagé avec V10** (`blender/relief`, déjà en mémoire) : **0 octet de plus**. Il suffit de lier la texture V9 existante dans le shader V10 des planètes volcaniques. On gagne de vraies coulées et ravines.
2. **Nuages animés** (`world/atmosphere/cloud_00..07`, 256²) : 0,33 Mio par masque, 1 ou 2 suffisent. On anime le décalage UV dans la boucle existante. Ce sont les nuages animés de la vision §3.
3. **Variantes 05 à 08 des 18 familles d'infrastructure** : environ 0,1 Mio de tampons et zéro code nouveau, le registre et le palier 3 sont déjà prêts. La diversité des villes double.
4. **PBR 512 en V10** (`blender/pbr-512`, albédo et normale du préréglage de la planète focalisée seulement) : 1,33 Mio au palier 2, 0,33 Mio au palier 1. Le chargeur manque, les préréglages existent, la rugosité passe en uniforme. Il faut d'abord valider l'orientation UV.
5. **Bandes des géantes gazeuses** (`world/atmosphere/gas_00..07`) : 0,33 Mio. La famille gas n'a aujourd'hui aucun détail (`supportedTerrain('gas') = []`).
6. **Masques d'éruption et de lave** (`world/fx-v07/eruption_*`, `lava_*`) : 0,33 Mio chacun. À piloter par les kicks (spec de Dot Son & Com) sur les planètes volcaniques.
7. **Arches, flèches de glace, évents** (`expansion-v14/models/{rock_arch,ice_spire,volcanic_vent}`) : environ 40 Kio de GPU par famille et par variante. Ce serait la première géométrie 3D sur les planètes rocheuses, glacées et volcaniques, qui n'ont rien aujourd'hui.
8. **Poussière des anneaux** (`detail-masks-v09/ringdust.png`, 128²) : 85 Kio. Ce sont les anneaux détaillés de la vision, contre des ellipses aujourd'hui.
9. **Réactions animées** (`social/assets/<émote>-N-atlas.png`, 576 × 384) : 1,1 Mio par réaction active, au plus 3 avec `ReactionPool`, soit 3,4 Mio. Le poster 96² (48 Kio) sert au palier 0 et en « réduire les animations ». Elles remplacent l'émoji plat sur les zones et les villes.
10. **Repères world-v11 supplémentaires** (église, moulin, phare, château : 0,1 à 0,14 Mio chacun) : ils signent les capitales selon le climat. Seuls cottage, tower et factory sont chargés aujourd'hui.

À **ne pas** intégrer :
- `world/world-v10/*.glb`, remplacé par world-v11 ;
- `procedural-v19/*_lod*.glb`, des tuiles locales de 18 k triangles, sans intérêt pour une sphère par pixel ;
- `*_normal_object.png`, en espace objet d'une tuile ;
- les 5 cartes de rugosité plates ;
- les GIF sociaux au palier 0, où il faut prendre les posters.

## Reste à faire (inventaire)
- Ajouter un fichier `LICENSE` ou `CREDITS` dans chaque dossier du pack. Il n'y en a aucun aujourd'hui, et c'est bloquant avant une publication large des ressources.
- Régénérer hors ligne les hauteurs procedural-v19, qui ne font que 97², en 512 × 16 bits. Coût : 1,33 Mio pour la tuile chargée.
- Afficher le registre dans le bandeau `?debug=1` : à faire avec une modification de V9, après validation. Les états sont déjà lisibles dans `PD10Host.stats.registry`.
