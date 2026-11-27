# RELAIS PlanèteDot : à lire en premier quand Claude est indisponible

Mis à jour le 27/11/2026 à 3 h 10 (Paris) par Claude. Claude reprend à son retour (quota réinitialisé le mercredi 2/12 à 10 h).

**Règle automatique** : chaque mise en ligne ou étape importante met à jour ce fichier dans le même commit (Claude comme ChatGPT), pour que l'autre puisse toujours reprendre à jour.

## En ligne
- **V9.8.1 = commit b18fd7f sur main** (site guillaumdot.github.io/Plan-teDot, balise meta `pd-version` = 9.8.1).
- Contenu : V9.8 (villes qui poussent maison par maison jusqu'au continent) + correctif : évolution, météo et éclairs de nouveau envoyés au rendu.
- Retour arrière : V9.8 = d0916f8, V9.7 = 0d3e938. Revenir = reprendre index.html d'un de ces commits dans un nouveau commit sur main (jamais de réécriture d'historique).

## Branches
- main : version stable publiée + bibliothèque assets/cosmic/ (V1.8 a7d6823, V1.9 9df5744, NATURAL_WORLD_V20.md 4b5d68e).
- dev/claude-v99 : V9.9, en pause, pas encore de code (= b18fd7f).
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

Prochaines étapes, dans l'ordre : 1) `uGen` et relief génération 1 derrière `?gen=1` ; 2) Worker des champs et cube map ; 3) biomes issus du climat ; 4) villes adaptées au terrain (ponts, ports, fondations) ; 5) Dual Identity en labo avec des palettes provisoires.

## Ce que ChatGPT peut faire en relais
- Ressources et documents dans assets/cosmic/, comme avant.
- Code : sur dev/chatgpt-sujet, derrière un flag, avec un fichier NOTES qui décrit le changement et la façon de le tester. Claude reprend, mesure et intègre.
- Mise en ligne urgente (correctif) : seulement avec l'accord de Guillaume, après le test minimal ci-dessus, et en gardant le commit précédent comme retour arrière.
- Canal : issue #1, format « AGENT | date | chantier | branche | commits | fichiers | blocages | prochaine action ».

## Relais ChatGPT — 27/11/2026, alpha.14

Branche dev/v10-restauration-v9 : retour aux matières et à la caméra V9 par défaut ; essais Blender via pbr=1 et albedo=1, caméra expérimentale via camera=lit. Réinitialisation du secours compact entre systèmes. Tests navigateur et iPhone à valider. Main et Supabase inchangés.

## Relais ChatGPT — alpha.15

Comparaison atlas mobile 512 / compact 256 par paramètre atlas, qualité des effets indépendante. Validation des paquets et détection des erreurs GPU avant activation. Tests complétés, résultats à vérifier. Main et Supabase inchangés.

## Relais ChatGPT — alpha.16

Relief optique renforcé à proximité via depth=1, principal et secours V9. Ombres du terrain : smoothstep défini. Cartes du volcan : diagnostic chargement/GPU et test des ressources réelles. Aucun nouveau maillage. Main et Supabase inchangés ; tests à vérifier.

## Relais ChatGPT — alpha.17

Détails urbains city=1 : façades, toits, panneaux solaires, voirie, filtrage selon la distance. Moteur city98 conservé, croissance et géométrie des villes inchangées. Tests source et présence du paramètre GPU ; validation visuelle et fluidité à faire. Main et Supabase inchangés.

## Relais ChatGPT — alpha.18

weather=1 : vagues directionnelles, reflets modulés par la musique, écume littorale et cyclones avec œil et bandes spiralées, shaders V9 principal et secours. Géographie conservée. Aucun nouveau simulateur de fluides. Main et Supabase inchangés. Validation navigateur et iPhone requise.

## Relais ChatGPT — alpha.19

star=1 : couronne solaire, filaments, protubérances, granulation et modulation audio bornée, shaders V9 principal et secours. Aucun changement du rendu de référence sans ce paramètre. Main et Supabase inchangés. Validation graphique et performances sur iPhone à faire.
