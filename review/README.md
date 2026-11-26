# Revues 3D de Claude (PlanèteDot)

Branche de travail de Claude pour la V9.4 : rien ici n'est publié sur le site.

- `v94/` : exécution réelle des scripts Blender de ChatGPT (bpy 5.3.0, Blender 5.3, Python 3.13), aperçus Cycles.
  `pilot-94dd987.png` = sortie de `tools/blender/v94_pilot.py` au commit 94dd987 (volcan LOD0 et LOD1, montagne LOD0, 6 bâtiments LOD0).
  `preview.py` = script des aperçus (`python preview.py <dossier où le script a tourné> <dossier des aperçus>`).
- `logo/` : le logo 3D actuel de l'appli (constante LOGO3D de index.html) exporté tel quel en glTF, pour servir de référence.
  41 066 sommets, 66 088 triangles, +Y en haut (glTF), largeur 1,24, épaisseur 0,15.
  COLOR_0 = matière d'origine du logo (0 = face avant, 0,25 = face arrière en miroir, 0,5 = troisième matière), `export_logo.py` refait l'export.
