# V10 — moteur unifié

Base V9.8.2, laboratoire uniquement. Natural World V2.2 est la source de vérité géographique pour les nouvelles planètes. V1.9 fournit les matériaux, V1.8 les budgets, V1.4 les modèles, jamais un second générateur. Les anciens mondes conservent leur version.

## Pipeline
Seed/version/type → géologie → hydrologie → climat → biomes → matériaux → sites et réseaux → modèles → éclairage et animation. Les étoiles et géantes gazeuses n'utilisent pas les règles de civilisation terrestre. Les modèles sont placés dans un repère tangent, avec pente, eau et altitude vérifiées. Les textures de détail suivent le biome et non une sélection aléatoire indépendante.

## Runtime
Un Worker pour la cuisson V2.2, deux cube maps RGBA8 à N=64, cache de quatre mondes maximum, chargement prioritaire de la planète sélectionnée. Pas de boucle RAF supplémentaire. Garder les shaders V9.8.2 pour les anciennes planètes. Les nouveaux mondes utilisent un flag expérimental désactivé par défaut. Si compilation ou chargement échoue, conserver le rendu historique sans modifier les sauvegardes. Les GLB sont réservés aux gros plans, instanciés et limités par budget partagé. Les textures historiques restent disponibles; aucune suppression avant audit de dépendances.

## Qualité et accessibilité
Objectif 30 FPS stable, 60 optionnel. Réduire d'abord particules, ombres, distance des modèles, résolution de rendu; préserver silhouette, couleurs et commandes. Respecter prefers-reduced-motion, proposer réglage manuel et contraste lisible, boutons tactiles 44 px minimum. Audio indépendant du rendu, modulation bornée et lissée, jamais de modification de géométrie persistante.

## Validation
Comparer mêmes graines et caméras sur iPhone, vérifier compilation GLSL principale et secours, absence de coutures, mémoire, audio verrouillé, comptes et sauvegardes. Aucun résultat GPU revendiqué. Intégration Worker, adaptateur de matériaux tempérés et placement des modèles restent à implémenter. Ne pas publier avant validation du rendu.

## Détail de surface V10
Le rendu labo utilise une troisième texture (albedo de terrain, 256 px maximum en aperçu), projetée en triplanaire avec répétition miroir. Elle module uniquement la luminosité de la surface, avec masquage des océans et glaces terrestres; aucune modification de la géographie. Le matériau procédural reste visible si le téléchargement échoue. Les requêtes d'aperçu sont annulées en changeant de planète et les ressources sont libérées avec leur planète. Un seul matériau de détail par famille pour cette étape; le mélange des biomes et les normales restent à faire.
