<!-- Copie fidèle de equipe/vision-pack-cosmique-guillaume.md (vision de Guillaume, 27/11/2026) : cadre de référence du chantier V10. -->

MISSION — Exploitation maximale du pack cosmique de PlanèteDot

1. Contexte et prise de fonction

Tu rejoins l’équipe de développement de PlanèteDot, composée de Claude, ChatGPT et Grok.

Dépôt GitHub : https://github.com/GuillaumDot/Plan-teDot

Application : https://guillaumdot.github.io/Plan-teDot/

PlanèteDot est une application musicale immersive dans laquelle les utilisateurs explorent des univers, des galaxies et des planètes représentant leur musique.

La version actuelle fonctionne. Tu dois impérativement préserver ses acquis.

Ta mission consiste à exploiter au maximum le potentiel du pack cosmique, tant sur le plan artistique que technique, sans dégrader la fluidité ni la stabilité de l’application.

2. Audit préalable obligatoire

Avant toute modification :

* Récupère la dernière version de main.
* Consulte RELAIS.md, AGENTS.md et la documentation technique disponible.
* Analyse index.html et les modules du moteur V10.
* Inspecte intégralement le dossier assets/cosmic.
* Identifie les ressources déjà exploitées, sous-exploitées, inutilisées ou mal intégrées.
* Vérifie les formats, résolutions, dépendances, licences et coûts GPU des ressources.
* Identifie les éventuels doublons.
* Établis une cartographie des relations entre les ressources, les shaders et les moteurs de rendu.

Ne suppose jamais qu’une ressource existe sans l’avoir vérifiée.

3. Exploitation du pack cosmique

Utilise toutes les ressources pertinentes et compatibles disponibles dans le pack.

Planètes et satellites

* Textures photographiques.
* Cartes de relief et de normales.
* Rugosité et propriétés des matériaux.
* Éclairage directionnel du soleil.
* Ombres naturelles.
* Atmosphères volumétriques ou simulées.
* Diffusion atmosphérique.
* Nuages animés.
* Calottes glaciaires.
* Océans et reflets.
* Anneaux planétaires détaillés.
* Transitions réalistes entre le jour et la nuit.

Lorsque certaines cartes de matériaux sont absentes, envisage leur génération procédurale ou leur prétraitement hors ligne, sans prétendre obtenir des données physiques exactes à partir d’une simple texture couleur.

Environnements planétaires

Préserve l’identité artistique de chaque planète existante et améliore ses caractéristiques :

* Montagnes et canyons.
* Volcans et coulées de lave.
* Vagues et océans.
* Cyclones et phénomènes météorologiques.
* Forêts et végétation.
* Villes, gratte-ciel et éclairages urbains.
* Usines et environnements industriels.
* Surfaces métalliques et cristallines.
* Déserts et environnements glacés.

Les environnements doivent présenter une véritable sensation de profondeur, de volume et de mouvement.

Évite les simples motifs plaqués sur des sphères lorsque des techniques de relief plus convaincantes sont disponibles.

Galaxies et univers

Exploite le pack pour enrichir :

* Les bras spiraux des galaxies.
* Les noyaux galactiques.
* Les nébuleuses.
* Les champs d’étoiles.
* Les poussières cosmiques.
* Les amas stellaires.
* Les disques d’accrétion.
* Les trous noirs, lorsque les ressources le permettent.
* Les transitions entre les galaxies et les systèmes planétaires.

Les galaxies du menu doivent être vivantes, animées et reconnaissables.

Évite les rotations uniformes donnant l’impression d’une simple image plate.

Étoiles et soleils

Améliore :

* La granulation de surface.
* Les protubérances solaires.
* Les coronas.
* Les éruptions.
* Les halos lumineux.
* Les effets de bloom.
* Les variations lumineuses naturelles.

L’étoile centrale doit éclairer de manière cohérente les planètes environnantes.

4. Direction artistique

Inspire-toi des références suivantes :

* Elite Dangerous : immensité et crédibilité spatiale.
* Star Citizen : matériaux et éclairages.
* SpaceEngine : représentation astronomique.
* Interstellar : profondeur et composition cinématographique.
* No Man’s Sky : exploration et diversité des environnements.
* Apple Music : élégance et sobriété de l’interface.

Ne copie pas leurs ressources propriétaires. Inspire-toi uniquement de leurs principes visuels et techniques.

PlanèteDot doit conserver sa propre identité.

Je privilégie le photoréalisme, la profondeur, la fluidité et l’immersion plutôt qu’une accumulation d’effets artificiels.

5. Interaction avec la musique

Le pack cosmique doit également servir l’expérience musicale.

Exploite les données audio réellement accessibles pour synchroniser certains phénomènes :

* Pulsations lumineuses.
* Ondes atmosphériques.
* Activité solaire.
* Variations des nuages.
* Éruptions volcaniques.
* Vibrations des anneaux.
* Particules et poussières cosmiques.
* Intensité des animations galactiques.

Utilise les basses, médiums, aigus, transitoires et variations d’énergie lorsque l’analyse audio est techniquement possible.

Les réactions doivent être progressives, naturelles et propres à chaque environnement.

Ne transforme pas l’application en simple visualiseur musical clignotant.

Préserve la lecture audio en arrière-plan et les intégrations musicales existantes.

6. Architecture intelligente des ressources

Organise le pack cosmique autour d’un registre central de ressources, compatible avec l’architecture existante.

Pour chaque ressource, identifie :

* Son emplacement.
* Son type.
* Sa résolution.
* Son environnement de destination.
* Ses dépendances.
* Son coût mémoire estimé.
* Son niveau de détail.
* Ses solutions de remplacement.
* Son état de chargement.

Évite les chargements redondants et la duplication des textures en mémoire GPU.

Utilise le chargement progressif, la mutualisation des matériaux et la libération contrôlée des ressources inutilisées.

Ne réorganise les dossiers que si cela apporte un bénéfice réel et mesurable.

7. Optimisation iPhone prioritaire

L’application doit rester utilisable sur Safari iOS et sur des appareils mobiles de puissance moyenne.

Mets en place ou améliore, selon les capacités existantes :

* Les niveaux de détail adaptatifs (LOD).
* Le chargement asynchrone.
* Les textures compressées lorsque les formats sont compatibles.
* Les mipmaps.
* Le filtrage anisotrope.
* Le regroupement des objets similaires.
* L’instanciation GPU.
* Le culling.
* La résolution dynamique.
* La réduction des effets hors champ.
* La gestion de la mémoire GPU.
* La récupération après perte du contexte WebGL.

Objectif : viser 60 FPS lorsque l’appareil le permet et maintenir une expérience stable autour de 30 FPS sur les appareils plus limités.

Ne présente jamais ces objectifs comme des performances mesurées sans tests.

8. Hiérarchie des sacrifices graphiques

En cas de surcharge GPU, réduis les coûts dans cet ordre :

1. Particules secondaires.
2. Fréquence des animations éloignées.
3. Résolution des effets de post-traitement.
4. Qualité des ombres secondaires.
5. Complexité géométrique des objets éloignés.
6. Résolution de rendu.
7. Résolution des textures via un atlas compatible de secours.

Ne supprime pas brutalement toutes les textures photographiques.

Ne reviens pas à des sphères simplifiées sans nécessité technique démontrée.

Préserve en priorité les textures principales, l’éclairage, les reliefs et l’identité visuelle des planètes.

9. Prévention des anciennes régressions

Les précédentes versions ont rencontré des problèmes concernant :

* Les textures absentes ou pixelisées.
* Les planètes sans relief.
* Les lumières et ombres disparues.
* Les galaxies immobiles.
* Les anneaux simplifiés.
* Les erreurs de chargement des atlas.
* La compilation des shaders.
* Les performances sur iPhone.

Vérifie systématiquement les interactions entre le pack cosmique, les fonctions pdTx*, pdAtlas*, pdGov et le moteur V10.

Ne remplace pas les mécanismes actuellement fonctionnels sans démontrer la supériorité du remplacement.

Isole les erreurs par ressource lorsque cela est possible.

Conserve le bandeau de diagnostic accessible via ?debug=1.

10. Méthode de développement

Travaille par étapes courtes et vérifiables :

Phase A : inventaire complet du pack et audit de son exploitation actuelle.

Phase B : identification des ressources présentant le meilleur rapport qualité visuelle/coût GPU.

Phase C : intégration et optimisation des matériaux, textures et reliefs.

Phase D : amélioration des animations, éclairages et galaxies.

Phase E : intégration des réactions musicales.

Phase F : optimisation, tests et validation.

Phase G : publication des modifications validées.

Crée une branche dédiée pour tes modifications. Ne fusionne sur main qu’après vérification des tests et de l’absence de régression.

Ne modifie pas simultanément plusieurs systèmes critiques sans possibilité de retour arrière.

11. Collaboration avec Claude et ChatGPT

Considère RELAIS.md comme le journal technique commun de l’équipe.

Pour chaque intervention, indique :

* Les fichiers modifiés.
* Les ressources exploitées.
* Les décisions techniques.
* Les problèmes rencontrés.
* Les tests réellement effectués.
* Les performances réellement mesurées.
* Les éléments restant à améliorer.
* Les commits correspondants.

Ne supprime pas le travail des autres agents sans justification.

Si une opération nécessite un accès GitHub dont tu ne disposes pas, fournis à ChatGPT un patch complet et directement exploitable.

12. Autonomie et résultat attendu

Tu disposes d’une liberté technique et artistique importante, dans les limites de la stabilité de l’application et de son architecture.

Recherche les meilleures techniques disponibles dans le développement de jeux vidéo, le rendu spatial, la simulation astronomique et les applications mobiles modernes.

Ne te contente pas de proposer des idées : implémente les améliorations que tes accès permettent réellement de réaliser.

Je veux que chaque ressource pertinente du pack cosmique soit exploitée intelligemment, sans gaspillage de mémoire ni surcharge graphique.

Le résultat final doit donner l’impression d’explorer un véritable univers musical vivant, cohérent, profond et réaliste.

Commence par l’audit du dépôt et du pack cosmique, puis poursuis les phases d’implémentation sans attendre une validation pour chaque décision technique mineure.

Ne prétends jamais avoir effectué une opération, un test ou un commit que tu n’as pas réellement réalisé.

🤝