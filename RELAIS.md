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

## Relais ChatGPT — V9.8.3 (27/11/2026)

Mise à jour directe demandée par le fondateur. Chargeur d'atlas V10 alpha.15 intégré à la V9.8.2 publique : pack compact 256 px niveau 0, validation des 28 entrées, détection des erreurs GPU, arrêt propre et diagnostic. Gouverneur et atlas habituels conservés. Syntaxe JS, dimensions JPEG et en-tête compact vérifiés ; iPhone et audio verrouillé non vérifiés. Aucun changement Supabase, audio, géographie ou shader. Retour arrière par revert, parent 27b6746dc859d6d6bd04038a9cf338bae3607920. V10 alpha.19 reste sur sa branche.

## Relais ChatGPT — V10 — consolidation de la branche
Intégration de main 5197e2a V9.8.3 dans la branche V10, index V9.8.3 exact + trois hooks V10 vérifiés réversibles, atlas compact copié par SHA du blob. Commit à deux parents. 96262e6 CPU/WebGL verts, mais test réel de l'application et audio verrouillé non validés. Nouveau CI à vérifier. Main inchangée.

## Relais ChatGPT — V10 — validation application complète
Consolidation cdd0c6a CPU/WebGL verts (45998670027/45998669766). Ajout app-smoke.mjs dans le workflow existant, vrai index avec fixture injectée uniquement dans Chromium, réseau externe bloqué, focus V10, sortie et repli, vérification absence de migration. Sept tests historiques render-audio ajoutés au même CI. Pas de modification index/main/Supabase/audio. Nouveau CI à confirmer, parcours authentifié/MP3/écran verrouillé iPhone non testés.

## Relais ChatGPT — V10 — validation app et lecture locale
Run 45998985767 vert : vrai index focus V10, sortie et fallback V9, absence de migration et 7/7 tests historiques. Captures artifact 15197556361. Nouveau test synthétique WAV via playList/load, continuité au repli et pause/reprise. CI à confirmer; pas de validation iPhone, MP3 album ni écran verrouillé. Index/main/Supabase inchangés.

## Relais ChatGPT — candidate V10.0.0
Fondateur autorise publication si prête et demande remise à zéro des comptes. 9181503 CPU/WebGL verts, y compris continuité WAV. Candidate version 10.0.0 : moteur focus activé par défaut, world10=0 repli, nouvelles planètes version 10, copies et anciens mondes conservés, version transmise par snapshot/sanitize. Nouveau CI requis avant publication. Supabase lu uniquement : 9 comptes, 8 systèmes, 29 objets appartenant aux utilisateurs; suppression non exécutée, risque perte audio et blocage Storage. Le versionnement évite le besoin technique d'effacer les comptes. Aucune modification main ni serveur. iPhone/MP3 verrouillé non validés.

## Relais ChatGPT — V10 — remodelage des planètes existantes
4fd35cb CPU/WebGL verts (45999960063/45999959868). Demande du fondateur : remodeler les anciens mondes. Migration du marqueur vers 10 dans fixSys, même règle snapshot/sanitize/copie; graine, ID, playlists, territoires et XP conservés. Sauvegarde normale à la connexion déjà présente. Types non supportés et graines invalides restent historiques. Test de l'index sans preview et égalité du reste du payload ajouté. Aucun compte/fichier supprimé, aucune mutation SQL, main inchangée. Nouveau CI et iPhone requis avant publication.

## Relais — nettoyage et rendu V10 (27/11/2026)
Branche de correction: archives hors runtime (385 fichiers, 10 345 596 octets) retirées de l'arborescence active et de l'inventaire; récupération possible depuis le commit 4427acd. Quatre anciens atlas V8/V8.3 sans référence dans l'index courant retirés de la candidate, à vérifier pour les clients anciens. Rendu: intensité des normales de relief accrue, ombre économique à un échantillon au niveau 1, décodage image de secours WebKit, rotation des galaxies et une seule liste par image. Pas de modification de l'audio, des comptes, ni de la géographie. Validation CI et iPhone requise avant mise en production. Les documents historiques et ressources optionnelles non auditées sont conservés.

## Relais — V10.0.1 : textures persistantes
PR #2 fusionnée après CI CPU et WebGL verts (46019818479, 46019818192). Correctif suivant : choix compact sur mobile niveau 0/1, secours HD → mobile → compact après échec HTTP/en-tête, textures compactes préservées par le gouverneur, libération des textures partielles sur échec, restauration des paramètres UNPACK du contexte partagé et microrelief réduit niveau 1. Journal des échecs de ressources optionnelles. Contrôle automatique de l'inventaire et tests de repli réseau/décodage. Aucun compte, audio ou autre dossier supprimé sans preuve. Validation CI de cette nouvelle candidate et iPhone réel encore nécessaires.


## V10.0.2 — collaboration Gemini / ChatGPT
Normalisation des dimensions avant upload, galaxies limitées à min(512, atlas), décodage Image sur mobile, finalisation mipmaps différée sécurisée, gouverneur sans coupure des textures. Patch Gemini partiel : isolation par famille et changement de signature non intégrés, nécessitent audit des bindings et des uniforms. Dimensions binaires réelles et rendu iOS non vérifiés.

## V10.0.4 — compléments à la V10.0.3 (audit Grok, 27/11/2026)
Branche locale fix/grok-v10.0.4-on-1003 (depuis main f120720, PR #5 conservée en entier). Ajouts : rendu V10 au zoom en opt-in (`?world10=1`), la planète V9 texturée revient par défaut ; atlas 512 px au palier 1 (256 px seulement au palier 0) ; galaxies en 512 px ; mode économie d'énergie iOS détecté (30 images/s sans perte de netteté) ; file de décodage mobile 6 et image libérée après envoi ; cartes V10 cuites en 128 px ; navigateurs intégrés (Instagram, TikTok…) en atlas 256 px avec rendu au palier 1 (décision Dot Design) ; atterrissage cadré côté jour (comme focusOn) et léger biais de lumière V9.6 sur le rendu V9 par défaut. Le tone mapping Reinhard et l'éclairage V10 de la PR #5 sont conservés tels quels. À vérifier sur iPhone : images/s de la vue planète V9, mémoire, écran verrouillé.

## V10 « plein potentiel » — inventaire (Grok, 27/11/2026, branche locale feature/v10-full-potential depuis 39862e4)
Tout reste derrière `?world10=1` (V10 opt-in). Coûts GPU estimés à la main (RGBA8, +1/3 pour les mipmaps), à confirmer sur iPhone.

| Élément | Branché ? | Taille | Stabilité | Coût GPU |
|---|---|---|---|---|
| world-v10/bake.mjs + bake-worker.mjs (cube-sphère 128) | oui, Worker, toutes familles | 2,7 Ko + 0,3 Ko | stable (tests CPU) | 2 cubes × 6 × 128² ≈ 0,5 Mio avec mips |
| natural-world-v22 (hydrologie, biomes Whittaker, villes, routes) | oui, **Terre seulement** (`bakeNatural` grille 64) | 252 Ko | stable | inclus dans les cubes |
| gpu-maps.mjs (cubes terrain/climat, mipmaps PR #5) | oui | 2,4 Ko | stable | voir bake |
| materials.glsl / planet-fragment.glsl / relief-atmosphere.glsl | oui | 2,3 / 6,0 / 3,7 Ko | stable ; palettes fixes par famille (c1/c2 ignorés) | 1 passe plein écran planète, 4 échantillonneurs |
| renderer.mjs (sphère UV LOD 24×12 → 128×64) | oui | 7,6 Ko | stable | 1 draw + villes + monuments + végétation |
| scene-bridge.mjs (cible hors écran + halo) | oui | 7,6 Ko | stable | cible ≤ 1024² RGBA8 + profondeur 16 bits ≈ 6 Mio |
| cities.mjs + infrastructure.mjs (bâtiments, routes, ponts) | oui, Terre, palier ≥ 1, `growth` figé à 1 | 7,4 + 2,4 Ko | stable | ≈ 0,1–0,3 Mio de sommets |
| landmarks.mjs + static-glb.mjs (monuments GLB) | oui, Terre, palier ≥ 2 | 3,0 + 5,9 Ko | stable | < 0,2 Mio |
| vegetation.mjs (3 GLB expansion-v14) | oui, Terre, palier ≥ 2 | 4,7 Ko | stable | < 0,3 Mio |
| terrain-texture.mjs (procedural-v19 albédo + hauteur 512, atlas Terre) | oui, sauf gazeuses | 6,0 Ko | stable | 2 × 512² ≈ 2,7 Mio |
| procedural-v19 (biomes GLB LOD, height, albedo, normals) | albédo + hauteur seulement ; GLB et normales objet non utilisés | 5,3 Mo | stable | — |
| blender/pbr-512 (basalte, désert, gaz, glace, océan ; normales, rugosité) | V9 seulement en `?pbr=1` ; **pas en V10** | 1,9 Mo (512×256, UV sphère) | stable | 512×256 ≈ 0,5 Mio par paquet |
| visual-audio.mjs (enveloppe V2.2) | oui, un seul nombre `b.lv` relissé 0,8 s | 0,4 Ko | stable | 1 uniforme |
| weather.mjs (cyclone) | oui | 0,4 Ko | stable | analytique |
| transitions.mjs, camera.mjs, surface.mjs | surface oui (repli procédural) ; camera non branché ; transitions tests seulement | 1,8 / 1,2 / 2,0 Ko | — | — |
| world/expansion-v14 (Living Infrastructure, 192 GLB, `living.mjs`) | 3 modèles de végétation seulement | 7,0 Mo | prototypes low-poly | ≤ 720 triangles par GLB |
| world/volume-v17 (atmosphère volumétrique GLSL ES 3.00) | non | 20 Ko | prototype | passe supplémentaire, à réserver aux paliers 2–3 |
| world/performance-v18 (budgets communs) | non (budgets repris dans full-potential.mjs) | 140 Ko | doc + helpers | — |
| world/world-v10, world-v11 (GLB gros plans), universe-v13, chemistry-v12 | non | 8,8 / 11 Mo / 16 Ko | prototypes | à instancier plus tard |

## V10 « plein potentiel » — villes procédurales vivantes (Grok, 27/11/2026, branche locale feature/v10-full-potential, commit c04c696, rien poussé)
Cadre : vision de Guillaume copiée dans `docs/VISION_PACK_COSMIQUE.md` (référence de tout le chantier V10).
- **Fichiers** : `assets/cosmic/world-v10/living-cities.mjs` (nouveau), `renderer.mjs`, `focused-host.mjs`, `app-adapter.mjs`, `scene-bridge.mjs`, `full-potential.mjs`, `index.html` (fonction `pd10Extra` + appel V10 seulement), `tests/living-cities.test.mjs` (nouveau).
- **Ressources exploitées** : `world/expansion-v14/models/*.glb` (18 familles d'infrastructure sur 24 ; arbres, arches, flèches de glace et évents laissés à `vegetation.mjs` / Phase 2), `expansion-v14/living.mjs` (`eligible`, filtrage par biome), données `natural-world-v22` (villes, ports, rivières, routes, ponts, température, précipitations). Textures intégrées aux GLB **non chargées** (le décodeur ne lit que géométrie + couleurs de sommets) : 6,5 Mo sur disque, mais seuls les modèles placés sont téléchargés (≈ 25 Ko chacun).
- **Décisions** : placement déterministe (seed) autour de chaque ville (marché, château d'eau, serre ; phare, grues, cargo pour les ports ; gare ; éoliennes ou panneaux solaires selon le climat ; stade, monument, observatoire, paraboles, pas de tir, balise pour les grandes villes) ; ponts aux franchissements du générateur ; véhicules et trains seulement entre deux cellules d'une route existante. Ère minimale par famille (ST_OF 1→5) puis fraction selon l'écoute (`cityGrowth` : plancher 0,5 + 0,5 × avancée de l'ère, croît quand le morceau de la planète joue). Un `drawArraysInstanced` par famille/variante, VAO dédié par lot, élimination de la face cachée dans le vertex shader. Lumières la nuit seulement, sodium `#ffb35a` / LED `#dfe8ff` ; gain basse via `cityLightGain` (≤ +20 %). Trafic : deux horloges continues mélangées selon jour/nuit (plus lent la nuit, règle `activity` de living.mjs).
- **Paliers** (`LIVING_TIER`) : 0 = rien (ni chargement ni dessin) ; 1 = 1 variante/famille, ≤ 96 instances, ≤ 5 000 triangles ; 2 = 2 variantes, ≤ 192 instances, ≤ 12 000 triangles ; 3 = 4 variantes, ≤ 320, ≤ 24 000. Chargement au premier gros plan (LOD ≥ 2) seulement. Repli : toute erreur coupe la couche (`livingBroken`) sans toucher la planète.
- **Rollback** : `?v10city=0`. V9 sans `?world10=1` : code de rendu inchangé (diff d'index.html limité à `pd10Extra` et à l'appel `PD10Host.draw`).
- **Tests réels** : `node --test tests/living-cities.test.mjs` 9/9 (déterminisme, 0 au palier 0, plafonds par palier, 7 types sans villes, véhicules sur routes, ères, budget triangles/mémoire avec les vrais GLB, couleurs, rollback) ; `tests/render-audio.test.cjs` 18/18 ; `world-v10/test.mjs` OK ; les 144 GLB des 18 familles se décodent.
- **Mesures réelles (Chromium SwiftShader, pas un iPhone)** : Terre seed 12345, palier V10 2 : 24–25 appels instanciés, 144 instances ; mémoire GPU suivie par compteur JS 3,00 → 3,43 Mio (+≈ 0,43 Mio pour la couche). Placement CPU 6–12 ms une fois par planète. **Aucune mesure de fps iPhone.**
- **Captures** : `preuves/v10fp-villes-avant-*.png` (main 39862e4) / `v10fp-villes-apres-*.png`, planche `v10fp-villes-planche.png`, gros plan `v10fp-villes-apres-zoom-ville.png`, V9 sans flag `v10fp-v9-avant*.png` / `v10fp-v9-apres-v9.png`.
- **Problèmes / reste** : au gros plan, les structures restent petites et floues car la cible hors écran est plafonnée par palier et le monde est cuit à 128 px par face ; le côté nuit n'a pas été atteint dans le banc (lumières de nuit non vérifiées à l'image) ; écart V9 mesuré au niveau du bruit d'animation (21,2 contre 19,3 de bruit entre deux captures de main), donc pas une preuve pixel à pixel : à refaire avec le temps figé. Interactions (tap ville, panneau ancré) : ébauche hors commit (`patches-v10fp/wip-interactions-index.diff`), le côté module est déjà commité derrière `?v10act=1` (éteint par défaut). Inventaire complet Phase A et registre central : à faire ensuite.

## V10 « plein potentiel » — netteté, lumières de nuit, contrôle V9 (Grok, 27/11/2026, commits ea5d52d et b58a775, rien poussé)
- **Cause des continents en blocs** : la Terre V10 lisait la grille naturelle 64 × 64 par face au plus proche (`cellOf`), avec une eau binaire : chaque cellule devenait un carré de texels, quelle que soit la cuisson. Correctif dans `bake.mjs` : lecture bilinéaire des champs du générateur et côte découpée par un bruit fin. La part de terres reste à ±3 points (test). Cuisson à 256 px par face dès le palier 2. Rollback : `?v10smooth=0` (retour à la cuisson 128 d'origine).
- **Cause du flou au gros plan** : la cible hors écran était un carré de la planète entière plafonné à 1024 px, donc étiré ≈ ×3 au zoom. Correctif dans `scene-bridge.mjs` : seule la partie visible de la planète est rendue, à la résolution du canevas, dans le budget de pixels du palier. Rollback : `?v10win=0`. Budgets estimés : palier 2 ≈ 14,3 Mio sur 16. Mesure SwiftShader au palier 2 : cible 384 × 832, compteur GPU 6,4 Mio (contre 3,4 Mio avant).
- **Captures** : `preuves/v10fp-nettete-ville-avant-apres.png` (jour) et `v10fp-nettete-nuit-avant-apres.png` (nuit) ; gros plan sur les lumières de nuit (sodium et LED) : `v10fp-nuit-lumieres-zoom.png`.
- **Contrôle V9 sans flag, à temps figé** (horloge et `Math.random` simulés, état caméra et orbite remis à zéro, 8 images au pas fixe) : écart moyen main/branche de 2,06 sur 255. Entre deux passes de main seules, il est de 2,64 : le banc n'est pas encore déterministe (inertie de caméra, gouverneur de résolution), donc **pas de preuve pixel à pixel à 0**. Le diff de code d'`index.html` sur le chemin V9 reste nul (seuls `pd10Extra` et l'appel V10 ont changé).
- **Tests** : `tests/v10-sharpness.test.mjs` 4/4, `living-cities` 9/9, `render-audio` 18/18, `world-v10/test.mjs` OK.

## 10.0.5 — préparation publication (local, non poussée) — 27/11/2026 21h45 (Paris)
- Version 10.0.4 → 10.0.5 : `index.html` (meta `pd-version`, import `focused-host.mjs?v=`) + attente de `assets/cosmic/world-v10/test.mjs`.
- Flags éteints par défaut : V10 seulement avec `?world10=1` (ou `world10preview=1`) ; interactions `?v10act=1` en plus. Sans flag, aucune requête `world-v10` n'est faite (vérifié dans le log serveur).
- Tests : render-audio 18/18, living-cities 9/9, v10-sharpness 4/4, world-v10/test.mjs OK, app-smoke OK (SwiftShader, copie locale du script avec playwright-core).
- Smoke sans flag : 0 pageerror, 0 erreur shader ; les 6 `ERR_FAILED` viennent des ressources externes de la sandbox et sont identiques sur main 39862e4.
- Diff V9 accepté par le chef (branche vs main 2.06 < main vs main 2.64). Rien poussé, rien fusionné.

## 10.0.6 — fluidité du gros plan villes (`fix/v10-city-smooth`, local, non poussée) — 28/11/2026 9h40 (Paris)
- Cause : au passage LOD 2 (pincement relâché ou atterrissage déjà proche), les GLB des villes étaient encore chargés et parsés sur le thread principal (séquentiel, ~27 ms de décodage hors iPhone pour 25 lots, fetches encore en cours 2 s après le zoom). En parallèle, la cible hors écran était réallouée à chaque cran de zoom, et les bâtiments apparaissaient sans fondu ; le shader living n'était compilé qu'au premier draw.
- Correctifs (retour `?v10flow=0`) : préchargement dès l'approche (hôte dès 45 px, modèles dès LOD 1 / sélection) ; décodage étalé (budget 6 ms/frame, 4 fetches à la fois) ; upload GPU étalé ; préchauffage du shader ; fondu d'apparition ~300 ms (`uReveal`) ; pas de réduction de la cible pendant un geste, croissance avec marge.
- Mesures Chromium headless + SwiftShader, viewport iPhone, qualité forcée 2, `?world10=1` — **hors appareil réel**. Approche pz 1,6 → 0,22 (pincement simulé puis relâché), frames 4–400 ms.
  - avant (d016fb5) : max 395,8 ms, p95 324,5 ms, 54 frames > 33 ms / 78, 8 réalloc. de tampon pendant l'approche, 11 GLB au total, 0 draw living à la fin.
  - après : max 231,7 ms, p95 184,9 ms, 57 frames > 33 ms / 71 (SwiftShader reste saturé à cette résolution : le taux > 33 ms ne s'améliore pas), 31 GLB, 25 draws living déjà prêts au LOD 2.
- Tests : render-audio 18, living-cities 9, v10-sharpness 4, v10-city-smooth 7, world-v10/test.mjs et app-smoke OK. Flags éteints par défaut. V9 intact. Rien poussé.
## V10fp · Phase A : inventaire du pack et registre central (Grok, 27/11, branche locale `feature/v10fp-interactions`, depuis ea5d52d)
- **Fichiers** :
  - `docs/INVENTAIRE_PACK_COSMIQUE.md` (synthèse, cartographie ressource→shader→moteur, top 10) ;
  - `docs/inventaire-pack-cosmique.json` (914 fichiers, un par ligne) ;
  - `tools/inventaire/inventaire.py` et `tools/inventaire/runtime-paths.mjs` (à relancer après tout ajout au pack) ;
  - `assets/cosmic/world-v10/resource-registry.mjs` (20 jeux, 773 fichiers) ;
  - `tests/resource-registry.test.mjs`.
- **Branchement sans effet sur le rendu** : `trackResource` dans les chargeurs V10 (terrain, végétation, repères, villes) et `PD10Host.stats.registry`.
- **Doublons exacts** : `market == rail_station` et `solar_array 02-08 == 01` étaient téléchargés et envoyés au GPU deux fois. Ils sont maintenant téléchargés et décodés une seule fois (`canonicalPath`), avec un tampon de sommets partagé dans `uploadLiving`.
- **Constats** :
  - aucun fichier de licence dans le pack (seul `world/world-v10/models.json` déclare CC0, pour des GLB non chargés) ;
  - V9 ne lit rien dans `assets/cosmic` ;
  - les hauteurs procedural-v19 font 97² ;
  - les cartes de rugosité pbr-512 sont plates.
- **Test corrigé** : `tests/living-cities.test.mjs` ne dépend plus du nom du dossier `repo/`. Son fetcher échouait dans un worktree.
- **Tests réels** :
  - `node --test tests/resource-registry.test.mjs` 6/6 ;
  - `tests/living-cities.test.mjs` 9/9 ;
  - `node tests/render-audio.test.cjs` 18/18 ;
  - `world-v10/test.mjs` OK.

## V10fp · Interactions finalisées et fluides (Grok, 28/11 matin, branche locale `feature/v10fp-interactions`, rebasée sur d016fb5 = 10.0.5)
- **Rebase** : 382fd0f/3da3c7f/4aba9d4 rejoués sur d016fb5 (seul conflit : RELAIS.md, les deux sections gardées). La modif d'`index.html` non commitée était déjà commitée (réactions qui suivent la planète V10, panneau stable, carte V9 masquée sur une ville V10) : gardée.
- **Tap sur une ville** (`?world10=1&v10act=1`) : un seul glissé temporel de 1,9 s en smootherstep (rotation + approche jusqu'à l'orbite proche pz 0,45, départ et arrivée à vitesse nulle) au lieu de deux lissages exponentiels concurrents ; un geste l'annule tout de suite ; réduire les animations / palier 0 : placement immédiat.
- **Rien de lourd au tap** : panneau de verre créé dès la première image V10 (jamais au tap), rectangle du canvas mis en cache (plus de `getBoundingClientRect` par image), opacité écrite seulement si elle change, `translate3d`, objet `focus` et directions des villes réutilisés (aucune allocation par image) ; renderer : préchauffage en vue lointaine (V10 sans géométrie), une étape lourde par image (programme trafic, tampon trafic, programme villes, modèles) — seulement avec `?v10act=1`.
- **Zone surlignée** : halo rose elliptique au pied du faisceau ; illumination de la ville en montée douce 0,6 s / extinction douce 1,2 s.
- **Tests** : render-audio 18/18, living-cities 9/9, v10-sharpness 4/4, world-v10 1/1, resource-registry 6/6, v10-interactions 10/10 (2 nouveaux : fluidité/aucune allocation au tap, courbe d'approche).
- **Banc Chromium** (`harness/v10act2.mjs`, SwiftShader, port 8140) : palier 2 (glissé .75→.45 progressif, panneau, « 💥 Ça tabasse » sur la ville, nuit), réduire les animations et palier 0 (aucune animation, palier 0 : aucun dessin villes/trafic), sans drapeau (V9 : aucun panneau, statut `disabled`) ; 0 erreur de page, 0 erreur de shader. Captures `preuves/v10fp-interactions-{final,reduit2,palier0,v9}-*.png`, planche `v10fp-interactions-final-planche.png`.
- **Limites** : écarts d'images mesurés sous SwiftShader seulement (médiane ~67 ms, logiciel) : pas une mesure iPhone. Au palier 0, un pic isolé de 1,3 s après le tap dans le banc (non analysé). Le chargement des modèles au premier gros plan hors `?v10act=1` reste le sujet de la branche fluidité (`fix/v10-city-smooth`).

## 10.0.7 — interactions rebasées sur la 10.0.6 (Grok, 28/11, branche locale `feature/v10fp-interactions`, non poussée)
- **Rebase** propre sur `37ed2e3` (même arbre que le main distant `ae35c67`, 10.0.6). Conflits résolus dans `RELAIS.md`, `focused-host.mjs`, `living-cities.mjs` et `renderer.mjs`.
- **Les deux mécanismes sont conservés, sans doublon** :
  - 10.0.6 : préchargement dès l'approche (`shouldWarmHost` / loadLiving dès que `fp.living`, même hors gros plan), décodage et upload GPU étalés, préchauffage du shader living, fondu `uReveal` ~300 ms, cible hors écran qui ne rétrécit pas pendant un geste.
  - interactions : trafic préparé dès que `?v10act=1` (programme + tampon en vue lointaine, dessin seulement si la géométrie est visible) ; registres et tampons de sommets partagés. Le second bloc `else if (!geometry)` qui rappelait `loadLiving` / `createLivingProgram` a été retiré (doublon de la 10.0.6).
- **Version 10.0.7** : meta `pd-version`, import `focused-host.mjs?v=10.0.7`, vérifiés tous les deux par `world-v10/test.mjs`.
- **Pic de 1,3 s au palier 0** : ce n'est pas l'appli. Rejoué sans aucune capture pendant la mesure : médiane 16,7 ms, p95 33,3 ms, max 167 ms (une seule frame, à 333 ms, quand la cible hors écran passe de 192² à 256×320). GPU inchangé, panneau déjà créé. Le 1 300 ms du banc précédent tombait pendant `page.screenshot` (prise au milieu du relevé des images). Une capture isolée après coup donne un max de 183 ms sous SwiftShader. Rien à corriger dans le chemin palier 0.
- **Tests** : living-cities 9/9, resource-registry 6/6, v10-city-smooth 7/7 (fetcher rendu indépendant du dossier `/repo/`), v10-interactions 10/10, v10-sharpness 4/4, render-audio 18/18, world-v10/test.mjs 1/1. Smoke V9 sans flag : version 10.0.7, `PD10_ENABLED=false`, aucun hôte ni panneau, 0 pageerror, 0 erreur de shader. Captures `preuves/v10fp-interactions-spike-palier0.png` et `v10fp-interactions-v9-smoke.png`.
- Inventaire : `docs/inventaire-pack-cosmique.json` fait 420 Ko et `tools/inventaire/` reste minuscule, donc ils restent dans la branche (seuil 500 Ko). Rien poussé, rien fusionné.


## V10 « plein potentiel » — réactions musicales complètes (Grok, 28/11/2026, branche locale feature/v10-audio, rien poussé, aucun numéro de version fixé)
- **Principe** : le spectre précalculé de l'hôte (`readAudio`, `bassLvl`, `SPB[1]`, `SPB[3]`, `audioLvl`, `beatLvl`, `beatT`) est lu dans `pd10Extra` (index.html), multiplié par `PDMS.k` (montée douce de 2,5 s), puis passé à `audioPacket` (full-potential.mjs) qui renvoie un paquet **mis à jour sur place** : basses, médiums, aigus, niveau lissés (attaque 40 ms, retombée 220 ms), kick (enveloppe `exp(−6·temps)`, ≤ 3 flashs/s), phases accumulées des vagues et des cyclones, plafond de lumière. Rien n'est relu côté lecteur : aucun `createMediaElementSource`, `AnalyserNode` ni micro. `audio: b.lv` reste passé en nombre (vent de la végétation, rétrocompatibilité) ; le paquet complet passe par `audioIn`.
- **2 uniforms vec4** (shader planète, `uAudio` supprimé) : `uAudA = (basses, médiums, aigus, niveau)`, `uAudB = (kick, phase des vagues, phase des cyclones, plafond de lumière)`. `timeSinceKick` est encodé dans l'enveloppe du kick et dans `burstAge`.
- **Effets** : lumières de ville (nuit seulement, déjà masquées par le terminateur) `+min(0,12·basses + 0,08·kick, 0,2)` ; vagues d'océan : amplitude `+35 %` sur les basses, phase **accumulée** (`+dt·(1+0,6·basses)`, repli à 20π = multiple exact des 3 fréquences, aucun saut) ; lave `+18 % basses + 7 % kick` (≤ +25 %) ; cyclones : phase accumulée `dt·(1+0,25·basses+0,25·kick)` ; atmosphère `+8 %` et nuages `+6 %` sur les médiums, teinte à peine plus chaude ; vibration des anneaux : inchangée, ils vivent dans le shader V9 (`pdPhTick`/`PDSPW`) et V10 n'a pas encore d'anneaux.
- **Particules** (`particles.mjs`, nouveau) : un seul appel `gl.POINTS`, positions calculées dans le vertex shader depuis 512 graines fixes (8 Ko, aucune texture) ; palier 0 : rien ; palier 1 : 128 sans réaction au son ; palier 2+ : 256 (mobile) / 512 (ordinateur), brillance et taille `×(1+1,5·aigus)` (≤ ×2,5) et gerbe de 8 à 24 particules sur grosse caisse > 0,6. Flag de retour : `?v10part=0`. Aucune particule en « réduire les animations ».
- **Garde-fous** : réactivité Off/Doux/Plein (0/50/100 %) via `?v10react=off|soft|full` ou `localStorage pd.v10react` (pas d'interface : à ajouter dans les réglages) ; défaut Plein dans Safari, Doux dans les navigateurs intégrés. « Réduire les animations » : kick forcé à 0, pas de gerbe, pas de particules, plafond de lumière +20 %, vitesses de vagues et cyclones non modulées. Pause : tout retombe en < 1 s, sans saut. L'audio ne modifie jamais le terrain (le paquet n'est lu qu'après les cartes, uniquement pour lumière, normales d'eau, phases, nuages ; aucun `texSubImage2D`/`bufferSubData`).
- **Allocations** : paquet, options et objets de l'hôte réutilisés ; `matchMedia` n'est plus appelé à chaque image (lu une fois, écouteur `change`). Restent les objets littéraux historiques de l'appel `PD10Host.draw` (hors audio).
- **Fichiers** : `assets/cosmic/world-v10/{full-potential,focused-host,renderer,scene-bridge,program}.mjs`, `planet-fragment.glsl`, `relief-atmosphere.glsl`, `particles.mjs` (nouveau), `index.html` (`pd10Extra` + ses variables seulement), `tests/render-audio.test.cjs` (+7 tests), `tests/living-cities.test.mjs` (le chargeur de test découpait le chemin sur `/repo/` : cassé hors du dossier `repo`, corrigé).
- **Mesures** (Chromium SwiftShader, pas un iPhone ; même planète, même temps, seul le paquet change) : `preuves/v10-audio-static-mesures.json`, planches `v10-audio-planche-{terre,lave-gaz,gerbe}.png` (ligne du haut : rendus, ligne du bas : écart ×12), séquence réelle dans l'appli (audio synthétique à 144 BPM) `v10-audio-terre-jour-*.png` + `-log.json`. Surcoût : +1 appel de dessin (POINTS) au palier ≥ 1, +8 Ko ; aucun fps mesuré sur iPhone.

## 10.0.7 — assemblage release (interactions + audio) — 28/11/2026 (Paris), branche locale `release/10.0.7`
- Base `aa7c078` (interactions rebasées sur la 10.0.6) + cherry-pick de `efcfcaf` et `b68d581` (audio). Conflits résolus en gardant les trois : lissage 10.0.6, interactions (trafic, panneau, registre), audio (`uAudA`/`uAudB`, `particles.mjs`, `pd10Extra` sans allocation, `fp.aud`/`fp.part`). `stats` combine trafic, registre et spectre audio. Chargeurs de test indépendants du nom du dossier et exemption RAF de `living-cities.mjs` (garde audio) conservés. Une seule boucle RAF (6 appels dans `index.html`, comme la 10.0.6) ; `?world10` reste éteint par défaut.
- Tests : living-cities 9, resource-registry 6, v10-city-smooth 7, v10-interactions 10, v10-sharpness 4, render-audio 25, world-v10/test.mjs 1 — tous verts.
- Smokes Chromium SwiftShader (iPhone, palier 2) : V9 sans flag, `?world10=1`, `?world10=1&v10act=1` avec tap sur une ville et audio de test (kick, basses, gerbe de particules mesurés) : 0 pageerror, 0 erreur shader/link, 0 erreur `getError`. Seuls `ERR_FAILED` des ressources externes bloquées dans le banc. Planche `preuves/v10-1007-planche.png`. Pas de mesure iPhone réel.

## Pack cosmique Gemini · branche de test · 28 novembre 2026

Socle cbb8b78. Son arbre aa0fcc51 est identique à becca550 (V10.0.7 avec Apocalypse studio). Les commits a5f1cf1–ae35c67 apportent le préchargement et le fondu des villes. La série 8268656–9a3d283 ajoute trafic, interactions, registre et paquet audio. La branche historique Grok de la V10.0.3 n'est pas un correctif à rejouer.

Le diff à deux extrémités de la branche recovery-pbr (239e46c) touche 13 fichiers : deux textures de matériau, normales, BRDF et changement de sortie dans le même essai. Recovery-cosmic (c499f8e) touche quatre fichiers : un seul cosmic10 changeait soleil, galaxies et carte M31 ; le PNG référencé était absent. La preview 6fa6980 réunit les deux (18 fichiers), puis cbb8b78 restaure l'arbre stable. Les différences observables sont l'exposition, le spéculaire et le contraste du disque, ainsi qu'un repli obligatoire pour M31. Le dépôt ne contient ni capture Safari appariée ni mesure GPU reliant le retrait à un de ces effets en particulier. On les teste indépendamment.

Vague 0 : gemini-cosmic-manifest.mjs, full-potential.mjs, focused-host.mjs, app-adapter.mjs, index.html, tests/gemini-cosmic.test.mjs. Sélection de session par URL, budget unique et enveloppe réutilisée. Source réelle : uAudA.xyz = basses/médiums/aigus ; uAudB = kick/phases/plafond. Aucun analyseur.
