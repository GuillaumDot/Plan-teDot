# Reprise Work — matériaux V10
Base V10.0.7, commit becca550 ; ne pas remplacer renderer, focused-host ou planet-fragment par les anciennes sources complètes de Work (elles précèdent trafic, particules et audio multibande).
Activation : world10=1 et v10pbr=1, ou ajouter v10pbr=1 au mode preview autorisé. Les textures sont réservées au gros plan LOD 2, palier >= 1, et libérées hors LOD 2. Les gazeuses conservent leurs bandes procédurales.
Les quatre échantillonneurs historiques restent inchangés ; deux supplémentaires pour normale et albédo en mode PBR. Carte de rugosité uniforme (d'après le préréglage existant). Plafond d'énergie et ACES uniquement en mode expérimental. Pas d'IBL complet.
Vérifications : exécuter node --test assets/cosmic/world-v10/tests/pbr-recovery.test.mjs. Tests de cycle de vie simulés dans la session de reprise, pas de validation GPU réelle. Le Playwright de Work devra être rebasé sur les hooks de la V10.0.7. Vérifier WebKit/iPhone, palettes, terminator, continuité de lecture, 0 erreur WebGL, mémoire en entrée/sortie du gros plan.
Aucune modification audio, index ou Supabase dans ce chantier. Fusion sur main seulement après validation et coordination Grok.

## Test navigateur isolé
`node assets/cosmic/world-v10/tests/pbr-webgl.mjs` (Playwright Chromium installé) ; `--webkit` pour WebKit desktop. Compile le vrai programme avec et sans PBR, dessine les sept familles avec textures de test, puis charge les véritables textures océaniques et vérifie leur libération. Ne valide pas les performances iPhone ni le smoke test complet de l'application. Le contexte WebGL2 de Chromium dans la session ChatGPT a été indisponible : ce nouveau test reste à exécuter sur une machine avec WebGL.
