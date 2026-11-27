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

## Ombres du relief
Sondage de l'horizon en trois échantillons de la cube map dans la direction de la lumière. Atténuation bornée de la lumière directe et du spéculaire, sans assombrir l'émission des volcans et villes. Désactivé aux niveaux 0 et 1, sur les géantes gazeuses et atténué sur les surfaces aquatiques. Aucun changement des altitudes enregistrées ni nouveau tampon GPU. Approximation locale, pas d'ombres géométriques des bâtiments ni de mesure de performance iPhone.

## Océans et atmosphère animés
Pentes analytiques de trois trains d'ondes, projetées sur le plan tangent sans couture, réservées à l'eau liquide; variations bornées de rugosité et de force des vagues. Nuages et bandes gazeuses à vitesses différentielles selon latitude. L'enveloppe audio V2.2 est réutilisée avec delta borné, sans moteur audio supplémentaire ni modification du terrain. Le banc d'essai n'est pas encore alimenté par la musique réelle de l'application. Pause de l'horloge d'animation dans l'aperçu. Tests de variation des pixels et de l'enveloppe; pas une simulation hydrodynamique.

## Géométrie urbaine initiale
Sites Natural World terrestres uniquement, neuf volumes simples par ville (144 maximum), repère tangent local, exclusion des cellules d'eau et glace, hauteur déterministe. Un seul tampon et appel de dessin, niveaux 2/3 uniquement, éclairage jour/nuit. Les volumes sont des proxies à échelle visuelle, pas des modèles Blender ni une simulation de croissance; routes, ports, ponts et détails architecturaux restent à intégrer. Repli sur les points lumineux si le programme ou le tampon échoue.

## Infrastructures initiales
Les chemins de V2.2 sont convertis en rubans sur la sphère, dans le même tampon et appel de dessin que les bâtiments. Les segments partagés sont dédupliqués, budget 768; les segments adjacents à une cellule de pont sont élargis et surélevés. Les ports sont des quais schématiques orientés vers une cellule d'eau voisine quand elle est détectée. Aucun nouveau tracé ni changement de géographie. Il s'agit de proxies orbitaux, pas de ponts/ports détaillés, ni d'industries ou trafic animés. Validation iPhone nécessaire.

## Croissance urbaine
Les bâtiments sont ordonnés par phases : centres de toutes les villes, voisins immédiats, puis périphérie. Le paramètre growth (0 à 1, fourni par l'appelant) contrôle le nombre de bâtiments affichés, sans recuire le monde ni réallouer le GPU. Les réseaux apparaissent à la fin de cette première séquence; quelques volumes périphériques bas et larges représentent des bâtiments industriels schématiques sur les sites portuaires/fluviaux. Curseur dans l'aperçu de laboratoire. Aucune horloge d'évolution persistante ou connexion à la progression de l'application n'est encore branchée. Les modèles Blender restent à intégrer.

## Modèles architecturaux GLB
Première intégration d'un fichier réel world-v11/cottage-00.glb : lecture glTF 2.0 limitée aux maillages statiques indexés et matrices de nœuds, normales de faces, géométrie orientée dans le repère tangent. Jusqu'à quatre instances sur terre, 12 000 triangles maximum et tampon supplémentaire, uniquement aux niveaux 2/3 et croissance complète. Les proxies sont conservés si le chargement échoue. Le fichier examiné est exporté par trimesh, non par Blender; couleurs de matériaux simplifiées, textures/normal maps embarquées ignorées pour cette étape. Pas de prétention à un moteur glTF général ni à un rendu photoréaliste. Tests CPU sur le fichier réel et WebGL sur une scène synthétique.

## Diversité architecturale
Catalogue borné de trois GLB world-v11 : cottage, tour, usine. Sélection déterministe selon le site portuaire/fluvial et l'ordre des villes; repli cottage pour un modèle optionnel indisponible. Quatre instances maximum, plafond partagé de 12 000 triangles, sans nouveau draw call par modèle. Échelles visuelles distinctes. Le lecteur statique ignore toujours les textures et normal maps; végétation et rendu rapproché à faire.

## Végétation V1
Sites terrestres déterministes sélectionnés sur les poids de biomes, production végétale, pente et exclusion eau/villes du monde V2.2. Trois modèles V1.4 (feuillu, pin, cactus), matériaux verts/bruns simplifiés, 36 instances et 6 000 triangles supplémentaires maximum, un tampon et un dessin aux niveaux 2/3. Pas encore de forêt dense, d'animation du vent, ni de rendu des textures GLB. Aucune modification de la géographie ou des sauvegardes.

## Phénomènes naturels visuels
Centre de vortex déterministe par graine, dérive lente et bandes spirales sur la sphère, œil et bords progressifs. Sur terre/eau, condition d'océan chaud non gelé au centre; sur gaz, modulation des bandes. Effet de qualité 2/3 seulement. Émission volcanique modulée lentement par une phase spatiale, sans flash ni altération de la lave enregistrée. Aucun nouveau tampon GPU, pas de simulation météorologique ou d'éruption physique. Vent des arbres et densification restent à faire. Tests CPU du centre, WebGL de variation des pixels.

## Vent et bosquets
Vent analytique dans le vertex shader des modèles végétaux, ancrage approximatif au rayon 1, amplitude bornée et modulation légère par enveloppe audio. Les bâtiments ne sont pas déformés. Les sites végétaux sélectionnés sont servis d'abord, puis deux voisins pour les arbres (pas les cactus), en gardant le plafond partagé de 6 000 triangles et 48 instances maximum. Les voisins sont filtrés par eau/glace à l'échelle des cartes de rendu, pas par une nouvelle simulation écologique. Tests de déterminisme et dessin WebGL à temps distincts; aucune mesure FPS iPhone ni validation visuelle du vent.

## Matériaux GLB colorés
Lecture de COLOR_0 normalisé (octets, shorts ou float) et facteur de couleur, rugosité PBR par primitive; conservation des quatre composantes à travers le placement. Attribut supplémentaire seulement pour les GLB (44 octets par sommet contre 28, plafond triangles inchangé); bâtiments simplifiés inchangés. Éclairage direct avec spéculaire dépendant de la rugosité et lumière nocturne des vitrages, sans texture, normal map, transparence ou PBR complet. Tests CPU sur six modèles et contrôle du format de tampon WebGL. Mémoire supplémentaire maximale théorique des modèles GLB : 864 000 octets (18 000 triangles x 3 x 16). iPhone non mesuré.
