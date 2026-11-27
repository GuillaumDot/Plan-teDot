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
