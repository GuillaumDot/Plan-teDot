# PlanèteDot — prototype de bibliothèque
Exécuter avec Blender 4.x : `blender -b -P planetedot_assets.py -- ./assets`.
Le générateur prévoit 504 GLB (6 palettes × 28 stades × 3 variantes), et un manifest JSON. Ce sont des prototypes géométriques, pas des rendus finaux. Le script n'a pas été exécuté dans Blender.
## Contrat pour Claude
Charger le manifest, sélectionner biome/family/stage/variant. Conserver la variante déterministe par zone et une graine stable. Charger les GLB à la demande, partager les géométries et matériaux, utiliser l'instancing. Ancrer au sol et orienter l'axe vertical local vers la normale de la planète. GLTF exporte en Y-up. Ajuster l'échelle au rayon de la planète. Faire évoluer les modèles par interpolation d'échelle et transition de visibilité; ne pas recréer la ville à chaque frame. Conserver routes, positions et identifiants. Tester mémoire, FPS, MP3 et sauvegarde sur iPhone avant fusion.
## À compléter
LOD, textures PBR, véritables cratères, terrain continu, réseaux routiers, ports, bâtiments publics, météo, planètes gazeuses, animations et tests visuels. Les palettes aquatiques et glaciaires ne constituent pas encore des géométries spécifiques. Ne pas importer tous les fichiers simultanément. Ne pas remplacer le système V9.7 sans validation.
