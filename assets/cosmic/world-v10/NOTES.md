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

## Natural World V2.2 — géographie stable
La simulation terre utilise désormais N=64 indépendamment de la taille des cube maps d'affichage. Les données de villes, routes, ponts, ports et volcans sont conservées dans le résultat CPU; le shader utilise un signal de rivière et des points urbains nocturnes discrets. Le matériau de détail terrestre est choisi selon le biome terrestre dominant, avec correspondances temporaires faute de tuiles tempérées. Ce n'est pas un mélange de textures local ni une implantation de bâtiments 3D. Les planètes historiques de l'application ne sont pas migrées.

## Atlas de détail terrestre
Quatre tuiles V1.9 (tropical, désert, alpin, polaire) dans un atlas unique 256 px au maximum dans l'aperçu. Mélanges locaux continus à partir de température, humidité et altitude du moteur, pas encore les onze poids exacts de V2.2. Les coordonnées restent à un demi-texel des bordures pour éviter la contamination entre tuiles. Le budget texture GPU reste identique à celui d'une seule texture 256²; davantage de lectures par fragment, à mesurer sur iPhone. Si l'atlas échoue, retour au matériau dominant, puis au procédural. Pas de modification de géographie.
