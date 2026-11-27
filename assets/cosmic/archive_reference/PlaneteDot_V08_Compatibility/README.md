# PlanèteDot V0.4 — adaptation native V9.7
Source inspectée : branche main, blob index.html 66cad1a150c140dfc8878f8b3cec529679030dd2 (SHA de blob, pas de commit).

## Installation sélective
`python patch.py index.html index-v04.html` applique uniquement les variantes urbaines conservatrices aux ancres vérifiées. Ne modifie jamais le fichier source. Compiler et tester avant fusion. Les autres profils sont des propositions à raccorder aux branches correspondantes, pas des shaders déjà intégrés.

## Contrat moteur observé
- TYPES : 0 Tellurique, 1 Océanique, 2 Géante gazeuse, 3 Glacée, 4 Volcanique, 5 Cristalline, 6 Spectrale, 7 Mystique, 8 Étoile, 9 Métallique, 10 Rocheuse, 11 Terre.
- makePlanet : id,name,type,size,c1,c2,atH,atmo,ring,ringH,ringTilt,ringRoll,moons,clouds,spin,tilt,seed,phase,tracks,isPublic,terr,org,emo,origin,auto,xp,path,last,ghosts. Ne pas remplacer ces valeurs ni le système de sauvegarde.
- planetBody0 : stageF(p), pathOf(p), conquest(p), liveMix, beat, lv, bs, wx, flash, seed, clouds, sun, sunI. Ne pas créer un second système de progression. Ne pas utiliser l'audio pour choisir une identité aléatoire.
- city97 réservé à uGD>.5 dans l'appel observé; city93 reste la voie des autres mondes. Ne pas étendre city97 automatiquement.
- blk97 renvoie densité, type de quartier, taille de lot, hauteur maximale. Types 0 prés/bois, 1 maisons, 2 immeubles, 3 tours, 4 parc, 5 industrie, 6 ferme. Conserver grille 5, avenues 15, LS et I.w.
- lot97 renvoie hauteur et boîte bx, lh stable. Utilisé par ray traversal, sol, ombres. Toute géométrie nouvelle doit être partagée par ces chemins. Patch fourni réduit légèrement l'emprise et la hauteur sans dépasser I.w; fermes inchangées.
- roof97/wall97 : variation RGB bornée, sans changement de géométrie. fld97 : champs, haies, bois; gnd97 : rues et éclairages. Ne pas modifier sans test.
- city97 : cnt, r0, ph, zw, e4,w2,w3,km,lw,Bl,pxr,bio,hc; gHc97=.45+1.85*w2+3.9*w3*e4; quatre centres maximum dans cette fonction. Les neuf stades du catalogue sont éditoriaux, pas neuf nouveaux stades moteur. Conserver les valeurs natives et les transitions k2/k3, uQual, tp.
- terraH : seed, uType, uGD, gTQ, det, uR, gFs; terraCol : température, humidité, altitude, uStage; terraBiome(T,M,n). Relief identique entre chemins rapide/détaillé. Ne pas changer les côtes, la mer ou les masques de ville sans test. Le helper pd04Relief est optionnel et non activé.

## Catalogue de choix pour Claude
planet-profiles.json : 384 profils proposés (12 types × 4 familles × 8 variantes), paramètres relatifs et non des uniformes existants. Choisir un profil par seed/type stable; appliquer seulement aux branches compatibles après inspection. Ne pas créer de bâtiments sur étoile ou géante gazeuse. Pour montagnes, préserver les masques climatiques; volcans, préserver les masques de lave; cyclones, préserver la phase et le mouvement natifs. Les familles sont des directions artistiques, pas des géométries livrées.
Le catalogue V0.2 et son générateur Blender sont conservés à titre complémentaire, pas nécessaires au runtime.

## Validation requise
Comparer original et patch sur mêmes seeds, mêmes stages, même caméra, jour/nuit, niveaux qualité, audio actif/inactif. Vérifier compilation GLSL, limites des lots, ombres, transitions, stabilité iPhone et temps GPU. Ne pas fusionner si régression. Aucun test WebGL réel effectué ici.

## V0.7
Voir ENVIRONMENT_V07.md, environment-v07.glsl, environment-v07.mjs et fx-v07/manifest.json.

## V0.8
Lire INTEGRATION_V08.md en premier. Adaptateur optionnel, audit non destructif, test Node : `node test-v08.mjs`.
