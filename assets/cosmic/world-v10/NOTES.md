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

## Microreliefs V1
Chargement des cartes de hauteur V1.9 existantes, même atlas que les albedos ou tuile unique de secours. Perturbation des normales par différences finies triplanaires, bornée et limitée aux tiers 2/3; atténuée près des transitions de biome, absente des océans et glaces terrestres. Échec de hauteur sans perte de l'albedo. Une texture 256² RGBA8 supplémentaire maximum dans l'aperçu (256 Kio), neuf lectures supplémentaires dans la branche active, à mesurer sur iPhone. Ne change ni maillage, ni géographie ni altitude sauvegardée. Tests navigateur chargement/libération et différence de pixels. Pas de véritable déplacement géométrique.

## Navigation immersive V1
Caméra orbitale yaw/pitch et zoom orthographique borné 0,8–3,2, lissage exponentiel réutilisant transitions.mjs, boutons/roue/clavier et gestes pointeurs à un ou deux doigts. Rotation automatique suspendue pendant le geste; mode mouvement réduit sans interpolation. Une seule boucle RAF dans l'aperçu. Le zoom rapproche la vue sans vol au sol, sans nouvelle géométrie ni déplacement de caméra en perspective. Tests CPU des limites et navigateur des boutons; gestes iPhone non vérifiés.

## Gouverneur de qualité raccordé
L'aperçu applique qualityStep existant au temps réel entre images (hors chargement de textures, reprise de visibilité et grandes interruptions), puis renderBudget au DPR et au tier du renderer. Choix Auto/Éco/Standard/Élevée/Ultra. En arrière-plan pas de dessin; un seul RAF. L'objectif 30 FPS n'est pas une mesure iPhone; aucune mesure batterie. Test caméra corrigé pour ne pas distinguer -0 et +0 dans les matrices. Tests CPU de baisse/remontée de qualité et navigateur de résolution.

## Adaptateur application V1
Module app-adapter.mjs désactivé par défaut. Contrat explicite generatorVersion:10, type et seed; descripteur non modifié, aucun monde historique admis. Le propriétaire du rendu fournit caméra, audio, delta, temps, qualité et croissance, sans second RAF ni moteur audio. Initialisation paresseuse, un cache Worker, planète active unique, déduplication, annulation, ressources optionnelles, arrêt sur erreur/perte de contexte et repli demandé au client. Le contexte doit être WebGL1 isolé, car index.html V9.8.3 utilise WebGL2 et des états GPU spécifiques; aucune insertion dans index à cette étape. Test CPU du contrat et WebGL du chemin réel. Les performances du second contexte et l'intégration de l'interface principale restent à valider.

## Compatibilité WebGL2
Conversion contrôlée des shaders V10 en GLSL ES 3.00 à la compilation, chemin WebGL1 conservé. VAO dédié en WebGL2 et restauration des programmes, buffers, VAO, unités 0–3, textures et samplers après dessin; attribut générique de matériau restauré. Le client reste responsable du framebuffer, viewport, profondeur, mélange, scissor, masques, états d'upload et composition. Pas encore de branchement dans index.html. Tests CPU de conversion et navigateur sur contexte WebGL2 avec états sentinelles et modèles. Coût des lectures d'état à mesurer sur iPhone.

## Pont de composition de scène
scene-bridge.mjs traduit les trois axes viewOf du moteur historique et ses coordonnées écran vers le moteur V10. Une cible WebGL2 RGBA8 + profondeur 16 bits, 512² maximum (1,5 Mio théoriques), rend la planète avec transparence avant composition dans le framebuffer du client. Un seul contexte et aucune nouvelle boucle. Restauration des états utilisés, rendu en arrière-plan et erreurs à gérer par le client. Test CPU de projection et navigateur de composition et restauration. Le pont n'est pas encore appelé dans index.html; ordre des satellites, post-traitements, cache d'états GLR, restauration de contexte et iPhone restent à valider.

## Correctif WebGL2 bloquant
Le journal du job 140500487670 (commit 9b50752) confirme que `active` est réservé en GLSL ES 3.00. Renommage en stormActivity dans le shader source commun. Le test de composition 1ed6c0c a passé les contrats CPU; le rendu WebGL2 doit repasser avant insertion dans index.html. Aucun changement fonctionnel aux cyclones ni aux sauvegardes.

## Contrôleur de scène principale
focused-host.mjs relie la typologie numérique historique aux familles V10 seulement si generatorVersion vaut explicitement 10. Étoiles, cristallines et mystiques restent historiques (pas de correspondance validée). Initialisation paresseuse, déduplication des sélections, annulation lors de la sortie, composition au rythme de l'appelant et repli permanent de la session sur erreur. Aucun RAF, compte, audio ou sauvegarde. Tests de contrat avec doublures; le module n'est pas encore appelé depuis index.html. Le raccordement doit conserver l'ordre drawBody, les labels et GLR/POST, et attendre validation WebGL2.

## Correctif du test WebGL2 partagé
Le job 140501658186 confirme que le shader compile, la planète et les modèles sont visibles, les états sentinelles sauf index restaurés, mais GL_INVALID_OPERATION 1282. Le test liait le même objet tampon aux cibles ARRAY_BUFFER et ELEMENT_ARRAY_BUFFER, interdit en WebGL2. Deux tampons distincts et contrôle d'erreur immédiatement après la préparation du test. Le nouveau résultat doit confirmer l'hypothèse avant toute intégration index.

## Raccordement effectif index (branche V10)
Le test 45998086030 est vert (WebGL2, composition, états restaurés), CPU 45998086053 vert. Index de branche V9.8.2 raccordé dans renderPlanet uniquement, via import paresseux et paramètre world10=1. Rendu V9 par défaut, et sur échec/chargement/récupération safe. Les mondes historiques restent sur V9; pour visualiser temporairement le moteur sur une planète existante, ajouter explicitement world10preview=1, qui construit un descripteur éphémère sans mutation ni sauvegarde. Aucun nouveau RAF/audio, aucune écriture Supabase. Axe viewOf, lumière repère local et audio existant; tier matériel historique, croissance fixée à 1. La scène système, les étoiles et types non compatibles restent V9. Test syntaxique complet index et gate; parcours réel authentifié, fidélité visuelle iPhone, audio verrouillé et réconciliation de l'index V9.8.3 de main restent à faire. Ne pas fusionner automatiquement.
