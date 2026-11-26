# Revues 3D de Claude (PlanèteDot)

Branche de travail de Claude pour la V9.4 : rien ici n'est publié sur le site.

- `v94/` : exécution réelle des scripts Blender de ChatGPT (bpy 5.3.0, Blender 5.3, Python 3.13), aperçus Cycles.
  `pilot-94dd987.png` = sortie de `tools/blender/v94_pilot.py` au commit 94dd987 (volcan LOD0 et LOD1, montagne LOD0, 6 bâtiments LOD0).
  `preview.py` = script des aperçus (`python preview.py <dossier où le script a tourné> <dossier des aperçus>`).
- `logo/` : le logo 3D actuel de l'appli (constante LOGO3D de index.html) exporté tel quel en glTF, pour servir de référence.
  41 066 sommets, 66 088 triangles, +Y en haut (glTF), largeur 1,24, épaisseur 0,15.
  COLOR_0 = matière d'origine du logo (0 = face avant, 0,25 = face arrière en miroir, 0,5 = flanc chromé, visible seulement là où l'image est claire au bord ; dans index.html : aT 0, 1, 2), `export_logo.py` refait l'export.

## Relief cuit (essai V9.4, 26/11)
- `v94/relief/avant-apres-volcan.png` : même planète volcanique, volcan de niveau 2,6, à gauche le volcan V9.3 calculé, à droite le relief cuit dans Blender (jour, soleil rasant, nuit). Rendu du labo (SwiftShader).
- `v94/relief/volcan-blender-apercu.png` : le relief d'essai rendu en perspective dans Cycles (érosion simulée, quatre coulées dans les ravines).
- `v94/relief/volcan-images-cuites.png` : les deux images lues par le shader (`-hn` normales + hauteur, `-ao` occlusion + lave + ravines).
- Code : branche `dev/claude-v94` (a160420), `tools/blender/relief/` (format, recette, scripts).

## La lave suit le relief (essai V9.4, 26/11)
Règle du fondateur (26/11) : pour tous les modèles, la lave part de la lèvre ou du sommet, descend par la plus grande pente, donc par les ravines, et s'arrête dans la plaine ou une cuvette. Jamais sur une crête, jamais par-dessus un cône.
- `v94/lave/lave-relief-volcan.png` : volcan de niveau 2,6, avant / après (jour, soleil rasant, nuit). Plus aucune fissure de zone sur le cône ; les coulées partent de son pied et descendent la pente.
- `v94/lave/lave-relief-autres.png` : grand volcan (niveau 3,3), cratère d'impact, montagnes métalliques (métal en fusion dans les vallées).
- `v94/lave/lave-tracee.png` : lave des images cuites. En haut, volcan d'essai : première cuisson (une partie sur les crêtes) / lave tracée sur le relief. En bas, pilote glTF de ChatGPT (`v94_pilot.py`) : son masque COLOR_0 (morcelé, indépendant du relief) / lave tracée.
- Outil : `tools/blender/relief/lava_relief.py` (branche `dev/claude-v94`, 1d9c4ed) ; `bake_relief.py --lave auto` (par défaut) trace la lave et affiche le contrôle « x % sur les crêtes, y % dans les ravines », avec une alerte si crêtes > 0,5 × ravines. Pilote de ChatGPT : son masque 27 % / 28 % (alerte), lave tracée 8 % / 44 %.
