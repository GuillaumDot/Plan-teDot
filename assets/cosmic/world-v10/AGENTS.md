# PlanèteDot V10 — contrat de collaboration
## Point d'entrée
Lire RELAIS.md à la racine, puis NOTES.md dans ce dossier. Vérifier HEAD et les changements récents avant toute édition.
## Modules
- archetypes.mjs : familles et règles autorisées.
- base-worlds.mjs : identité et version des bases planétaires.
- asset-routing.mjs : correspondance des ressources et niveaux de détail.
- transitions.mjs : mélanges continus et qualité adaptative.
- Futurs modules : génération Worker, cache borné, adaptateur renderer, audio réactif, tests.
## Règles
Une seule source de vérité par fonctionnalité. Pas de second RAF, cache ou moteur audio. Pas de migration silencieuse des sauvegardes. Préserver les versions de générateur et les textures existantes. Les nouveaux modules restent indépendants du DOM et testables. Les ressources générées doivent inclure provenance, licence, taille et format. Ne jamais committer de secrets.
## Collaboration
Avant modification, vérifier les commits et le chantier de l'autre agent. Utiliser des commits atomiques et documenter les interfaces. Mettre à jour RELAIS.md lors des étapes significatives et signaler le chantier dans issue #1. Ne pas écraser les modifications concurrentes. Ne pas fusionner main sans accord et vérifications. Ne pas déclarer validé sur iPhone sans preuve.
## Critères
Tests déterministes, continuité des biomes, budgets mémoire et GPU, récupération WebGL, audio indépendant, sauvegardes compatibles. Les modules présents sont des fondations non intégrées, pas une V10 livrée.
