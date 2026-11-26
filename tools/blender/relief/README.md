# Relief cuit dans Blender (V9.4, essai)

Le shader de la planète lit des images « vues de dessus » d'un relief fait dans Blender, au lieu de poser des maillages sur la sphère.
Ondes, ombres du relief, atmosphère, nuit et teintes de chaque planète s'appliquent donc au relief cuit sans rien ajouter au dessin.

## Format (une variante = deux images RGB 8 bits, sans alpha)
- Cadrage : carré, d dans [-1,25 ; 1,25] dans les deux sens, rayon 1 = pied du volcan (même repère que `vH93` dans index.html). Hauteur nulle au bord.
- Blender : X = u, Y = v, Z = hauteur. Le haut de l'image = +v.
- `<nom>-hn.png` : R, G = normale tangente (OpenGL, X = +u, Y = +v, codée ×0,5 + 0,5) ; B = hauteur / hmax.
- `<nom>-ao.png` : R = occlusion ambiante cuite par Cycles ; G = lave ; B = ravines.
- `<nom>.json` / `manifest.json` : hmax, taille, cadrage, version de Blender.
- Tailles : 1024 (appareils récents) et 512 (appareils modestes, `TIER === 0`).
- Pas d'alpha : Safari dégrade les couleurs des PNG à alpha, les données seraient abîmées.

## Règle : la lave suit le relief (Guillaume, 26/11/2026)
Pour tous les modèles : la lave part de la lèvre du cratère (ou du sommet), descend par la plus grande pente, donc par les ravines, et s'arrête dans la plaine ou dans une cuvette. Jamais sur une crête, jamais par-dessus un cône.
- `lava_relief.py` trace cette lave sur le relief cuit (cuvettes comblées puis plus bas voisin, coulée étroite à la source qui s'élargit en descendant, une ou deux s'arrêtent à mi-pente) et en déduit les ravines (creux par rapport au voisinage).
- `bake_relief.py --lave auto` (par défaut) utilise cette lave. `--lave modele` garde le masque peint dans le modèle, mais la cuisson affiche le contrôle « x % sur les crêtes, y % dans les ravines » et une ALERTE si crêtes > 0,5 × ravines.
- Mesures du 26/11 : volcan V9.4 première version 25 % / 29 % (refusée) ; lave tracée 18 % / 42 %. Pilote glTF de ChatGPT : son masque 27 % / 28 % (alerte) ; lave tracée 8 % / 44 %.

## Fabrication
1. Un script de modèle produit le relief : maillage Blender (ou champ de hauteur `.npz` comme `gen_volcano.py`, qui simule l'érosion des flancs).
2. `bake_relief.py` le rend en orthographique vu de dessus avec Cycles : une passe hauteur, une passe normales, une passe occlusion (96 échantillons), une passe masques (attribut de couleur `mask` : R lave, G ravines), trace la lave sur le relief (voir la règle), puis écrit les deux PNG et le JSON.

```
python3 gen_volcano.py volcan.npz 24 .12
python bake_relief.py --npz volcan.npz --out sortie --name volcan --size 1024 --coulees 5 --graine 11 --preview
python bake_relief.py --glb modele.glb --out sortie --name volcan2 --size 1024          # un modèle glTF : même chose
```
Blender 4.x (CI Ubuntu) ou 5.x (module `bpy` de PyPI : `pip install bpy==5.3.0`, Python 3.13). Environ 3 minutes sur 4 cœurs.

## Dans index.html
- `PD93` : `uVS0` (hn, unité 5), `uVS1` (ao, unité 6), `uVSOn` ; `vsM(sd)` tourne et retourne l'image selon la graine de la zone.
- `volc93` : la hauteur et les normales cuites remplacent `vH93` pour le volcan principal (niveaux 2 à 3, pas la caldeira), l'occlusion assombrit les ravines, la lave cuite remplace les coulées tracées au hasard. Ombres portées, lac de lave, panache, gerbes : inchangés.
- `pdRvInit()` charge les images 2,5 s après l'ouverture ; s'il manque une image, le volcan V9.3 reste tel quel. `?relief=0` coupe le relief pour comparer.
- Lave des zones « Coulées de lave » (`fz0`, `biomeC`) : rien sur le cône ; autour d'un volcan, le lit des coulées rayonne depuis son pied (la pente) puis rejoint le réseau de la plaine ; la lueur descend la pente ; le lit est creusé dans le relief de la texture. Les cratères d'impact coupent les coulées sur leur rempart (`gZr93`, `gBem93`).
- Lave de la planète (`solid84`) : seulement dans les creux du relief (`gGh84`), en contrebas de ses rives (`txS`), croûte refroidie sur les hauteurs, et rien sur les cônes ni les remparts.
