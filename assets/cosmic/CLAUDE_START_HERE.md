# PlanèteDot — Cosmic Asset Suite
## Ordre d'intégration (Claude pilote le moteur)
1. Sauvegarder la branche stable, inspecter le moteur actuel (les ancres V9.7 sont historiques). Créer une branche laboratoire. Aucun patch automatique sur main.
2. `world/INTEGRATION_V08.md`, `world/OPTIMISATION_V09.md` : adapter les budgets et le bridge au moteur actuel. Un seul RAF, un seul cache GPU, une seule progression native. Flags désactivés par défaut.
3. `world/README.md`, `REALISM_V05.md`, `DIVERSITY_V06.md`, `ENVIRONMENT_V07.md` (dans world) : matériaux, biomes, météo. Garder les shaders natifs et les masques de terrain cohérents. Ne pas appliquer les patchs V04/V05 aveuglément ni en parallèle. Pas de villes sur étoiles/gaz.
4. `world/world-v10`, `world/world-v11` : GLB optionnels pour gros plans; utiliser instancing, culling, LOD et matériaux partagés. V11 prioritaire pour construction modulaire, V10 complément. `world/chemistry-v12` : règles contextuelles, pas de second générateur. `world/universe-v13` : ADN persistant pour nouveaux mondes uniquement, migration explicite pour anciens.
5. `social/VIDEO_INTEGRATION.md`, puis `social/SILENT_SIGNALS.md` : V6 remplace uniquement le rendu texte V5. Réutiliser atlas et animations V4/V5, ne pas faire tourner Events et SilentSignals en parallèle. Respecter les IDs, permissions, cooldown, audio verrouillé et export vidéo.
6. `asset-inventory.json` : index de fichiers et empreintes. `archive_reference` contient seulement les fichiers historiques non identiques aux versions cumulatives, à consulter si nécessaire, jamais à déployer intégralement.
## Contrat commun
Le moteur fournit temps monotone, projection, visibilité, occultation, éclairage, BPM fiable, qualité, seed stable. Les modules sont des helpers, pas un moteur de remplacement. Charger à la demande; budgets textures proposés 4/8/16/24 MiB à partager entre monde et social, pas à additionner. Priorité terrain et UI; réduire réactions à une sur qualité basse, utiliser posters si nécessaire. Pas de nouveaux RAF, pas de mutation audio, sauvegardes ou XP. Ne pas exposer ADN privé: signature sociale à partir d'un identifiant public stable.
## Validation avant fusion
Tests Node fournis; compilation GLSL réelle, captures mêmes seeds/caméras, test iPhone mémoire/thermique/FPS, jour/nuit, multi-comptes, reconnexion, audio verrouillé, export 15/30/60 s, accessibilité et modération. Rollback par flags. Aucun benchmark GPU ni test moteur effectué dans ce pack. Les sprites CGI ne sont pas des personnages riggés; les GLB historiques par pose ne sont pas destinés au runtime. Aucun asset externe téléchargé. Les modèles sont des prototypes low-poly, pas des rendus Blender validés.

## Extension V1.4 — Living Infrastructure
`world/expansion-v14/manifest.json` : 192 nouveaux GLB, 24 familles × 8 variantes. Prototypes géométriques originaux, certains partagent une silhouette; 720 triangles maximum par fichier. Y-up, origine au sol, dimensions normalisées; adapter échelle et orientation au repère tangent natif. Pas de rig ni de matériaux PBR. Les 12 masques de détail sont génériques, non des textures photographiques. `living.mjs` fournit activité jour/nuit, budget de circulation, échantillonnage de trajet, LOD, vent et filtrage biome. Le moteur doit fournir routes valides, collisions, eau, éclairage et instancing; aucun véhicule ne doit circuler sans route compatible. Les modèles maritimes nécessitent un placement sur eau, les ponts des appuis et les installations spatiales un stade avancé. Ne pas ajouter de RAF ni de progression. Les effets sont optionnels, flags off par défaut. Tests unitaires `node world/expansion-v14/test.mjs`; validation visuelle et GPU à effectuer. Priorité à la stabilité et à Silent Signals avant activation de cette extension.

## Polish V1.5
Lire POLISH.md avant intégration. Les GLB ont des normales plates et un matériau mat explicite; contrôler repères et budget sommets. Silent Signals CSS affiné. Les anciens manifests peuvent contenir des statistiques de sommets historiques; inventaire SHA actualisé.

## V1.6
Lire RELIEF_V16.md avant intégration des GLB. Les matériaux et normales de détail sont embarqués; ne pas les remplacer par le matériau mat V1.5.

## V1.7 — Atmosphère volumétrique
Lire world/volume-v17/README.md. Helper GLSL ES 3.00 et qualité adaptative, optionnels; remplacer localement les anciens effets, pas de double rendu.

## V1.8 — Performance & Fidelity
Lire world/performance-v18/README.md en premier pour les budgets communs et la mutualisation. Remplace les politiques de cache concurrentes, pas le moteur.
