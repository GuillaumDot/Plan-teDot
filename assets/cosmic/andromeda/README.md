# Andromède M31 — reprise Work
Branche expérimentale : ajouter cosmic10=1 à l'URL. Les deux shaders d'astres/galaxies conservent leur rendu historique sans ce drapeau. Les points artificiels dans les mini-galaxies sont remplacés par des amas diffus. Granulation et couronne renforcées avec des signaux déjà calculés.

## Source de l'image
NASA/JPL-Caltech, PIA08787, Amazing Andromeda Galaxy, 28 septembre 2006 :
https://science.nasa.gov/photojournal/amazing-andromeda-galaxy/

L'image en fausses couleurs combine Spitzer MIPS 24 microns (rouge), GALEX proche UV (vert) et lointain UV (bleu). Pour un aperçu artistique, convertir une copie locale en carte carrée 512 x 512, sans déformation du cadrage, R = rouge et G = combinaison des deux canaux UV, B = 0. Ne pas présenter cette carte comme une carte de flux calibrée ou une reconstruction 3D mesurée. Ajouter le crédit NASA/JPL-Caltech à l'interface avant publication.

Le PNG spitzer-galex.png de Work n'a pas été récupéré : il reste à produire ou à récupérer. L'application utilise les nuages de points historiques si le fichier est absent, si l'upload échoue ou si le contexte est perdu. Aucun téléchargement distant au runtime.
Le shader d'Andromède utilise RG8 (512 x 512, mipmaps : environ 683 Kio). Les galaxies des utilisateurs et leurs interactions ne sont pas remplacées.
Tests encore nécessaires : compilation réelle, comparaison visuelle Safari/iPhone, zoom/rotation, restauration de contexte et vérification du crédit.

## Génération reproductible
`python assets/cosmic/andromeda/build-m31.py --download` (Pillow requis) ou `--input chemin/PIA08787.jpg` si réseau bloqué. Produit le PNG local et le JSON de provenance (SHA-256 source et texture). Source exacte : https://www.spitzer.caltech.edu/image/sig06-024-amazing-andromeda-galaxy. Crédit étendu : NASA/JPL-Caltech/K. Gordon (Univ. of Arizona) & GALEX Science Team. Le rapport d'aspect est conservé avec marges noires ; G=max(vert, bleu) est un proxy artistique, pas une mesure calibrée. Vérifier le cadrage et le rendu sur iPhone avant publication.
