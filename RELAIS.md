# RELAIS PlanèteDot : à lire en premier quand Claude est indisponible

Mis à jour le 27/11/2026 à 3 h 40 (Paris) par Claude. Claude reprend à son retour (quota réinitialisé le mercredi 2/12 à 10 h).

**Règle automatique** : chaque mise en ligne ou étape importante met à jour ce fichier dans le même commit (Claude comme ChatGPT), pour que l'autre puisse toujours reprendre à jour.

## En ligne
- **V9.6 = index.html du commit ac887a0**, remis sur main par ChatGPT le 27/11 à 3 h 27 (commit dccf066) après la disparition des planètes sur iPhone. Balise meta `pd-version` = 9.6.
- V9.7, V9.8 et V9.8.1 (villes dans le shader, b18fd7f) sont suspendues : diagnostic iOS à faire sur une branche avant toute remise en ligne.
- Retour arrière possible : V9.8.1 = b18fd7f, V9.8 = d0916f8, V9.7 = 0d3e938, V9.6 = ac887a0. Revenir = reprendre index.html d'un de ces commits dans un nouveau commit sur main (jamais de réécriture d'historique).

## Branches
- main : version stable publiée + bibliothèque assets/cosmic/ (V1.8 a7d6823, V1.9 9df5744, NATURAL_WORLD_V20.md 4b5d68e, natural-world-v21 de ChatGPT 92004b4, natural-world-v22 de Claude). Aucun de ces modules n'est branché au rendu.
- dev/claude-v99 : V9.9, en pause, pas encore de code (part de b18fd7f, à refaire depuis la version stable une fois le souci iOS compris).
- ChatGPT : branches dev/chatgpt-sujet, créées depuis main.

## Règles absolues
1. index.html sur main ne change qu'avec l'accord explicite de Guillaume (il teste sur iPhone). Tout nouveau code passe par une branche labo, derrière un flag désactivé par défaut.
2. Ne jamais casser le lecteur MP3, la lecture écran verrouillé ni le bouton « ♫ Tester le son ».
3. Ne supprimer aucun compte ni donnée. Aucune modification de Supabase production (tables, buckets, fonctions, auth) sans accord de Guillaume. Aucun secret ni donnée personnelle dans ce dépôt : il est public.
4. Face cachée (sortie le 16/01/2027) : aucune ressource inédite (pochette, sons, visuels, palettes tirées de la pochette) dans ce dépôt avant le dévoilement.
5. Univers existants : jamais régénérés. Toute évolution du générateur passe par une version par planète (les planètes existantes gardent la leur).
6. Rien n'est « résolu » ni « validé » avant le test de Guillaume sur iPhone.
7. Les fichiers .md de main ne doivent pas contenir la syntaxe Liquid (double accolade ouvrante, accolade suivie de pourcentage) : le site est publié par Jekyll et la publication échouerait.

## Pièges connus dans index.html
- Un seul fichier (HTML, CSS, JS, WebGL2). Les shaders sont des chaînes JS : PD93, PD95 (relief et climat, aussi dans le shader de repli), PD96, PD97 (villes, shader principal seulement). Dans ces blocs : ni barre oblique inverse, ni accent grave, ni dollar suivi d'accolade.
- Beaucoup de lignes contiennent plusieurs instructions : un commentaire « // » placé au milieu avale la suite (c'était le bug corrigé en V9.8.1). Commentaires en fin de ligne seulement.
- Toujours vérifier le shader de repli (appareils modestes) en plus du principal.
- Test minimal avant toute mise en ligne : aucune erreur console ni WebGL, la musique avance, l'écran verrouillé garde le son.

## V9.9 « Natural World », étape 1 : décisions moteur (Claude), d'après NATURAL_WORLD_V20.md
- La surface reste calculée par pixel : sphère continue, sans couture ni saut de LOD.
- Version de générateur par planète (`uGen`) : 0 = relief actuel, 1 = nouveau. Planètes existantes en 0.
- Champs planétaires calculés une seule fois par graine dans un Worker, sur une cube-sphère (6 faces × 128²) envoyée au GPU en cube map, cache borné (planète visée + quelques voisines) : altitude grossière, température, humidité (pluies orographiques, ombre pluviométrique), vents par bandes de latitude, drainage jusqu'à la mer, lacs, aptitude à la végétation et aux villes.
- Relief génération 1, méthode inspirée de Minecraft (pas son aspect) : continentalité, érosion, crêtes et vallées combinées ; rivières creusées jusqu'à la mer ; îles ; côtes rocheuses.
- Dual Identity : un champ de transition déterministe (géodésique, modulé par le relief et le climat) mélange palettes et atmosphère, sans changer la géométrie. L'identité Face cachée n'est envoyée aux appareils qu'après la date de sortie, par le serveur (demande l'accord de Guillaume pour Supabase). Palettes définitives tirées des deux pochettes, gardées hors dépôt.
- Musique : modulation lissée et bornée (vagues, lumière, particules), jamais de changement permanent du terrain.

**Natural World V2.2** (assets/cosmic/natural-world-v22/, Claude, 27/11) : analyse de la V2.1 de ChatGPT et base de données du monde (vents, pluies orographiques, drainage, lacs, érosion, biomes de Whittaker, villes, routes, ponts, ports, front Dual Identity, chunks LOD). Le README donne la comparaison, les mesures et le branchement prévu.

Prochaines étapes, dans l'ordre : 1) brancher la V2.2 derrière `?gen=22` (Worker, 2 cube maps, version de générateur par planète) ; 2) shader guidé par les cube maps (climat, rivières, lacs, biomes) ; 3) villes de la V9.8 posées sur les sites, routes, ponts et ports ; 4) Dual Identity en labo avec des palettes provisoires ; 5) tuiles tempérées V1.9 (mission ChatGPT).

## Ce que ChatGPT peut faire en relais
- Ressources et documents dans assets/cosmic/, comme avant.
- Code : sur dev/chatgpt-sujet, derrière un flag, avec un fichier NOTES qui décrit le changement et la façon de le tester. Claude reprend, mesure et intègre.
- Mise en ligne urgente (correctif) : seulement avec l'accord de Guillaume, après le test minimal ci-dessus, et en gardant le commit précédent comme retour arrière.
- Canal : issue #1, format « AGENT | date | chantier | branche | commits | fichiers | blocages | prochaine action ».


## Relais ChatGPT — 27 novembre 2026 — V10
Branche dev/chatgpt-world-v10. Modules dans assets/cosmic/world-v10 : profils, surfaces, bake worker, cache, GPU, shaders, géométrie, renderer et previews. Tests CPU réussis (45991630509). WebGL : première installation Chromium échouée, correctif conteneur b79bce03, nouvelle exécution 45991630345 en cours. Aucun changement main ni Supabase. Les modèles détaillés, Natural World V2.2, textures V1.9 et audio réel ne sont pas encore intégrés au renderer. Prochaine étape : vérifier WebGL, corriger puis intégrer sans régression V9. Ne pas déclarer validé avant test iPhone.

## Relais ChatGPT — V10 — protection des textures GPU
Branche dev/chatgpt-world-v10. Les chargeurs de cube maps et d'albedo rejettent désormais les erreurs WebGL au lieu de renvoyer une texture incomplète. Test navigateur ajouté : chargement réel alpine, plafond de résolution, libération idempotente, exclusion des géantes gazeuses et erreur GPU injectée. Les tests du commit précédent c8154d9 étaient verts (45992914509 et 45992914466). Nouveau commit à vérifier par CI. Aucune modification main, Supabase, audio ou données. Le chargeur albedo n'est pas encore raccordé au rendu de production.

## Relais ChatGPT — V10 — textures de détail dans le rendu labo
Connexion du catalogue albedo au shader de surface via projection triplanaire, modulation bornée, texture neutre de repli et libération/annulation par planète. Aperçu V10 uniquement : test de chargement pour les six familles solides, exclusion gaz. Tests CI du nouveau commit à confirmer, aucun changement main ni Supabase, aucune validation iPhone. Natural World V2.2 et mélange local des biomes restent à intégrer.

## Relais ChatGPT — V10 — Natural World V2.2 cohérent
Grille géographique terrestre fixée à N=64 indépendamment de la résolution GPU, métadonnées des sites/réseaux préservées, signal de rivières et points urbains nocturnes dans le shader labo, sélection de texture par biome terrestre dominant. Test de cohérence des métadonnées entre deux résolutions. Aucun changement main ni sauvegardes. CI et iPhone à confirmer; mélange local et modèles 3D encore à faire.

## Relais ChatGPT — V10 — atlas multi-biomes terrestre
Quatre matériaux V1.9 dans une seule texture 256 px, mélange local par climat et relief, repli sur le matériau dominant. Tests navigateur atlas, libération, mode par famille. Les poids exacts V2.2 et les textures tempérées dédiées restent à faire; performance iPhone non mesurée. Aucun changement main ni données.

## Relais ChatGPT — V10 — ombres locales du relief
Ajout d'une occlusion directionnelle bornée (trois lectures de la cube map, niveaux 2/3 uniquement), séparation de l'émission et de la lumière directe, test des deux niveaux sur terrain synthétique. Les tests du raccordement Natural World 646aaeb sont verts (45995104314 et 45995104412); l'atlas c32350b a passé les contrats CPU, WebGL à confirmer au moment de l'édition. Nouveau commit CI à vérifier. Aucun changement main ni Supabase. Validation visuelle iPhone et ombres des bâtiments encore nécessaires.

## Relais ChatGPT — V10 — océans, atmosphère et enveloppe musicale
Normales animées de l'eau liquide, reflets modulés, dérive des nuages et bandes gazeuses, réutilisation de l'enveloppe audio V2.2 avec entrée externe. Test GPU de variation des images et test CPU des bornes. L'atlas c32350b a passé CPU/WebGL; les ombres fab6305 ont passé CPU, WebGL en cours au début du chantier. Aucun changement main, audio réel ni sauvegardes. CI du nouveau commit et iPhone à vérifier.

## Relais ChatGPT — V10 — premiers volumes urbains
Module cities.mjs : géométrie déterministe en repère tangent sur les sites Natural World, exclusion eau/glace via carte rendue, budget 144 bâtiments, shader jour/nuit et libération des buffers. Rendu aux tiers 2/3, test CPU et test WebGL. Les ombres fab6305 ont passé CPU/WebGL; océans a410855 CPU réussi, WebGL en cours au début du chantier. Les volumes ne sont pas encore les modèles Blender; aucune route géométrique ni croissance intégrée. Aucun changement main ni Supabase, CI et iPhone à confirmer.

## Relais ChatGPT — V10 — réseaux de civilisation
Rubans géométriques des routes Natural World, ponts schématiques sur les cellules de franchissement, quais orientés vers l'eau détectée, budget 768 segments, même buffer urbain et même draw call. Tests CPU de déterminisme et budget, WebGL étendu. Océans a410855 CPU/WebGL verts; villes b92882f CPU vert, WebGL en cours au début de cette édition. Aucun changement main/Supabase. Modèles Blender, zones industrielles et croissance restent à faire; CI et iPhone à confirmer.

## Relais ChatGPT — V10 — croissance urbaine par phases
Ordre déterministe des bâtiments (centres, quartiers, périphéries), paramètre growth avec rendu partiel du même tampon, volumes industriels schématiques aux sites portuaires/fluviaux, curseur labo. Test de monotonie et ordre entre villes, dessin WebGL à trois états. Villes b92882f CPU/WebGL verts; infrastructures 3b80714 CPU vert, WebGL en cours au début du chantier. Aucun changement main/Supabase. CI et iPhone à vérifier; progression persistante et modèles Blender non branchés.

## Relais ChatGPT — V10 — géométrie GLB architecturale réelle
Lecture bornée du cottage world-v11 existant (glTF 2.0 statique, export trimesh), placement tangent de quatre instances maximum sur terre, plafond 12 000 triangles, chargement annulable, tampon libéré. Matériaux texturés et autres modèles non intégrés; proxies gardés. Tests CPU et WebGL ajoutés. Infrastructures 3b80714 CPU/WebGL verts; croissance bad150b CPU vert, WebGL en cours au début de cette étape. Aucun changement main/Supabase; CI et iPhone à confirmer.

## Relais ChatGPT — V10 — diversité des modèles architecturaux
Trois fichiers GLB world-v11 raccordés au catalogue (cottage, tour, usine), routage par site, budget global et protection contre les chargements concurrents. Tests CPU sur les trois fichiers et assertion budget WebGL. Croissance bad150b CPU/WebGL verts; premier GLB 6ad7a33 CPU vert, WebGL en cours au début de l'étape. Les nouveaux tests restent à confirmer. Aucun changement main ni Supabase; matériaux complets, végétation et validation iPhone restent à faire.

## Relais ChatGPT — V10 — végétation 3D
Sélection déterministe des sites sur grille naturelle fixe, trois GLB V1.4 (feuillu/pin/cactus), budget 6 000 triangles et 36 instances, couleur feuille/tronc et repli en cas de ressource absente. Tests CPU et WebGL ajoutés. Premier GLB 6ad7a33 CPU/WebGL verts; diversification f73705e CI en cours au début du chantier. Aucun changement main ou Supabase. Matériaux, densité forestière, vent, intégration application et validation iPhone à faire.

## Relais ChatGPT — V10 — phénomènes naturels visuels
Vortex atmosphérique déterministe (gaz et océans chauds aux tiers 2/3), modulation lente de l'émission volcanique, aucun changement de géographie. Tests CPU/WebGL ajoutés. Diversification f73705e CPU/WebGL verts; végétation 1ce0fd4 CPU vert, WebGL en cours au début du chantier. Nouveau commit CI et iPhone à confirmer. Aucun changement main/Supabase. Vent et densité des forêts restent à traiter.

## Relais ChatGPT — V10 — vent et bosquets
Animation vertex des végétaux sans nouveau buffer, amplitude bornée et enveloppe musicale, bosquets de trois arbres par site si budget et terrain compatibles. Budget 6 000 triangles inchangé, 48 instances maximum. Biomes référencés par nom. Végétation 1ce0fd4 CPU/WebGL verts; phénomènes 0e4bf8c CI en cours au début du chantier. Tests nouveaux à confirmer. Aucun changement main, Supabase, sauvegardes ou moteur audio. Matériaux détaillés et validation iPhone restent nécessaires.

## Relais ChatGPT — V10 — matériaux GLB
Couleurs originales COLOR_0 et facteur de base, rugosité des matériaux conservée dans les sommets des GLB. Reflets directs selon rugosité et éclairage des vitrages, format 44 octets réservé aux modèles; proxies inchangés. Tests CPU sur six ressources et WebGL du format. Phénomènes 0e4bf8c CPU/WebGL verts, vent a142b2b CPU vert, WebGL en cours au début du chantier. Textures et normal maps embarquées pas encore exploitées. Nouveau CI et iPhone à confirmer; aucun changement main, sauvegarde, Supabase ni audio.

## Relais ChatGPT — V10 — microrelief des matériaux planétaires
Cartes de hauteur V1.9 raccordées au même routage que les albedos; normales perturbées par différences finies triplanaires, qualité 2/3 et transition atténuée entre biomes. Une texture supplémentaire bornée, repli albedo seul. Tests WebGL de chargement/libération et variation des pixels. Vent a142b2b CPU/WebGL verts; matériaux 7c176e4 CPU vert, WebGL en cours au début du chantier. Aucun changement main, données ni audio. CI du nouveau commit et iPhone à confirmer; displacement et textures GLB restent distincts.

## Relais ChatGPT — V10 — navigation immersive V1
Caméra orbitale bornée, rotation tactile, pincement, zoom et recentrage dans l'aperçu; lissage et mouvement réduit, un RAF. Tests CPU et navigateur ajoutés. Matériaux 7c176e4 CPU/WebGL verts; microrelief 4f51e5d CPU vert, WebGL en cours au début du chantier. Le zoom est orthographique et non un vol jusqu'au sol. Aucun changement main/Supabase/audio; CI et gestes iPhone à confirmer. Prochaine étape: gouverneur qualité et adaptateur de l'application.

## Relais ChatGPT — V10 — gouverneur graphique
Qualité adaptative dans l'aperçu, résolution et tier synchronisés au budget existant, quatre modes manuels, rendu suspendu quand masqué. Test caméra modifié pour comparer les coefficients numériques avec tolérance (zéros signés suspectés; log détaillé non accessible). Microrelief 4f51e5d CPU/WebGL verts; caméra bce192a CPU rouge, WebGL en cours au début du chantier. CI du correctif à vérifier avant intégration. Aucun changement main/Supabase/audio. Objectif 30 FPS non mesuré sur iPhone.

## Relais ChatGPT — V10 — adaptateur application
App-adapter.mjs : interface pilotée par le client, flag désactivé par défaut, admission explicite version 10 uniquement, aucun changement de sauvegarde, Worker unique et cycle de vie/annulation/repli. Tests CPU et WebGL. Main observé 5197e2a V9.8.3, rendu historique WebGL2 dans renderPlanet/drawBody, boucle pdQueueFrame, audioLvl et régulateur perf existants. Pas de branchement index à ce stade : moteur V10 WebGL1 isolé, adaptation de composition requise. Gouverneur 624ebf5 CPU vert, WebGL en cours au début du chantier; caméra bce192a WebGL vert. Aucun changement main, Supabase ou audio. CI et iPhone à confirmer.

## Relais ChatGPT — V10 — compatibilité WebGL2
Shaders GLSL ES 3.00 générés depuis les sources existantes, VAO isolé et restauration des états de dessin partagés. WebGL1 conservé. Tests CPU et WebGL2 ajoutés; host doit encore gérer composition, états framebuffer/viewport et upload. Gouverneur 624ebf5 CPU/WebGL verts; adaptateur c96e88c CPU vert, WebGL en cours au début du chantier. Aucun changement index/main/Supabase/audio. CI et iPhone à confirmer.

## Relais ChatGPT — V10 — pont de composition de scène
Projection basée sur les axes viewOf et coordonnées écran de renderPlanet, cible RGBA8/profondeur bornée, composition alpha sur le framebuffer hôte et restauration des états. Un contexte WebGL2, pas de RAF supplémentaire. Test CPU et navigateur ajouté. Adaptateur c96e88c CPU/WebGL verts; WebGL2 9b50752 CPU vert, WebGL en cours au début du chantier. Index de branche V9.8.2, main V9.8.3 : aucun changement index ni main. Le pont doit encore être raccordé au chemin drawBody et testé avec GLR/POST et iPhone.

## Relais ChatGPT — V10 — correctif de compilation WebGL2
Le journal CI 140500487670 identifie précisément le mot réservé GLSL 300 `active`. Remplacé par stormActivity. Pont 1ed6c0c CPU vert, WebGL en cours au début de l'étape; compatibilité 9b50752 CPU vert/WebGL rouge. Ne pas raccorder index avant le nouveau CI vert. Aucun changement main/Supabase/audio.

## Relais ChatGPT — V10 — contrôleur focus
focused-host.mjs prépare le branchement de renderPlanet avec conversion explicite de types, generatorVersion 10 uniquement, gestion du cycle de vie et repli. Tests CPU ajoutés. Correctif cdf2bfa CPU vert, WebGL en cours au début du chantier; pont 1ed6c0c WebGL rouge pour le même mot réservé corrigé. Aucun changement index/main/Supabase/audio. Attendre CI WebGL2 vert avant branchement; iPhone non validé.

## Relais ChatGPT — V10 — correction sentinelles WebGL2
Correctif cdf2bfa : compilation et rendu WebGL2 visibles, assertion rouge sur index et erreur 1282 (job 140501658186). Test corrigé avec deux buffers indépendants et contrôle GL avant dessin. Contrôleur focus 325ab40 ajouté. Nouveau CI requis; composition non encore validée. Main/index/Supabase/audio inchangés.

## Relais ChatGPT — V10 — raccordement index expérimental
9cc4b83 CPU/WebGL verts (45998086053/45998086030), composition et états restaurés. Index V9.8.2 de branche raccordé au focused-host dans renderPlanet, import paresseux sous world10=1 et version 10 requise. world10preview=1 opt-in supplémentaire pour apercevoir une planète existante sans mutation ni sauvegarde. Repli immédiat historique, une seule boucle, aucun changement audio/Supabase/main. Contrat syntaxe index ajouté. Avant fusion : réconcilier index main V9.8.3 (5197e2a), tester parcours authentifié et iPhone, MP3 et écran verrouillé, états GLR/POST en conditions réelles.
