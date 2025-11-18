Empreinte de Bois – gabarit avec header image + galerie + matériaux

Ce dossier contient les fichiers à copier dans votre dépôt existant
(en remplaçant les fichiers du même nom) :

- index.html
- styles.css
- config/site-config.js
- js/main.js
- js/modules/ui-gallery.js
- js/modules/ui-accordion.js
- js/modules/ui-modal.js

Les images ne sont PAS incluses : vous devez garder vos fichiers dans :
- assets/header01.png          (image du header)
- assets/hero-bgw640.webp      (fond du bloc hero)
- assets/logo.png              (logo)
- assets/galerie/...           (images de la galerie)

Pour configurer :
- Modifier `config/site-config.js` pour :
  - le titre du site,
  - le sous-titre,
  - la liste des images de la galerie (`galleryImages`),
  - les matériaux visibles (M01..M10 via `materialsVisibility`).

Le bouton "Ouvrir la matrice" en bas de page ouvre la page
`matrice/matrice.html` dans une modale.
