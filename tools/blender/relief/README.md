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

## Fabrication
1. Un script de modèle produit le relief : maillage Blender (ou champ de hauteur `.npz` comme `gen_volcano.py`, qui simule l'érosion des flancs et trace la lave dans les ravines).
2. `bake_relief.py` le rend en orthographique vu de dessus avec Cycles : une passe hauteur, une passe normales, une passe occlusion (96 échantillons), une passe masques (attribut de couleur `mask` : R lave, G ravines), puis écrit les deux PNG et le JSON.

```
python3 gen_volcano.py volcan.npz 24 .12
python bake_relief.py --npz volcan.npz --out sortie --name volcan --size 1024 --preview
```
Blender 4.x (CI Ubuntu) ou 5.x (module `bpy` de PyPI : `pip install bpy==5.3.0`, Python 3.13). Environ 3 minutes sur 4 cœurs.

## Dans index.html
- `PD93` : `uVS0` (hn, unité 5), `uVS1` (ao, unité 6), `uVSOn` ; `vsM(sd)` tourne et retourne l'image selon la graine de la zone.
- `volc93` : la hauteur et les normales cuites remplacent `vH93` pour le volcan principal (niveaux 2 à 3, pas la caldeira), l'occlusion assombrit les ravines, la lave cuite remplace les coulées tracées au hasard. Ombres portées, lac de lave, panache, gerbes : inchangés.
- `pdRvInit()` charge les images 2,5 s après l'ouverture ; s'il manque une image, le volcan V9.3 reste tel quel. `?relief=0` coupe le relief pour comparer.
