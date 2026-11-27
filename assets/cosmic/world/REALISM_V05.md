# V0.5 — Cinematic Procedural Realism
V0.4 conservée intégralement. Les nouveaux fichiers sont optionnels. Source moteur inspectée : blob 66cad1a150c140dfc8878f8b3cec529679030dd2. Aucun nouveau système de sauvegarde.

## Installation
`python patch_realism.py index.html index-realism.html` : ajoute uniquement le détail de surface des toits et façades aux trois ancres V9.7 observées. Peut suivre patch.py si les ancres restent présentes. Échec explicite si source différente. Compiler sur branche de test. Les autres helpers sont inactifs par défaut.

## Systèmes proposés et points de raccordement
- Relief : terraH, appliquer une érosion analytique bornée identiquement aux chemins gTQ et détaillé, préserver côtes et masques urbains. Crêtes alpines, mesas, karst, vallées glaciaires, dunes, caldeiras, falaises. Ne pas simuler une érosion hydraulique globale par pixel.
- Climat : terraCol/terraBiome, utiliser T, M, alt, pente et masques existants. Neige selon altitude, roche exposée sur pente, humidité des vallées, transition progressive. Ne pas repeindre les océans.
- Eau : branche océanique existante, Fresnel, écume selon côte/pente, absorption selon profondeur si disponible, deux échelles de vagues, reflets solaires. Ne pas ajouter de seconde passe par défaut.
- Villes : city97/lot97/blk97, catalogue architectural ci-dessous. Les boîtes doivent rester dans le lot, et la même géométrie doit être utilisée par shd97, ray traversal et vue du dessus. Les toits inclinés et retraits nécessitent une vraie intersection supplémentaire; ne pas les simuler par une boîte incohérente.
- Atmosphère : nuages existants, ombres synchronisées, brume de vallée, diffusion à l'horizon, pluie locale et éclairs; respecter uGD et wx. Éviter les doubles ombres.
- Musique : beat/lv/bs existants modulent lumière, vent, houle et émission, jamais seed ou implantation. Lissage temporel et plafonds; pas de flash stroboscopique.
- LOD : conserver k2/k3, tp, uQual et budgets de rayons. Détail microstructure uniquement de près. Pas de nouvelles textures GPU obligatoires.

## Textures livrées
12 matériaux procéduraux, 4 cartes PNG 128×128 par matériau : albedo, normale, rugosité, hauteur. Carreaux périodiques, références synthétiques non photogrammétriques. Claude peut les intégrer à son pipeline de textures binaires après vérification du format, ou reproduire leur aspect dans GLSL. Ne pas remplacer les bins existants.

## Validation
Compiler GLSL WebGL2; comparer mêmes seeds et progression, jour/nuit, zoom, qualité, audio. Mesurer temps GPU et mémoire sur iPhone. Vérifier ombres, continuité des côtes, aliasing et absence de changement de sauvegarde. Les helpers optionnels et modèles paramétriques ne sont pas des fonctionnalités intégrées. Aucun rendu WebGL ou Blender validé ici.
