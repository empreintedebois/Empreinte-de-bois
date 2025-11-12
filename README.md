# Empreinte de Bois – Template sans images

Ce paquet contient une base **sans images** respectant tes contraintes :

- **Header sticky** noir translucide configurable.
- **Sous-titre** avec ornement (antique/moderne) défilant.
- **Galerie** dans bandes obliques, vignettes carrées, **flèches géantes** (diamètre = 1/8 de la largeur de la page), ombre, lazy-load, clavier accessible.
- **Bouton Matrice** ouvrant **une modale** (overlay + ESC + focus trap) chargeant `matrice/matrice.html`.
- **Matériaux M01…** en **accordéon un-à-la-fois**.
- **Contact** aligné **bas-à-bas** avec Matériaux.
- **Config centrale** dans `config/site-config.json` (aucune image requise).
- **A11y**: rôles ARIA, ordre tab, contrastes, tailles tap-targets, ESC, labels.

> **Intouchables** : tes dossiers `Mxx` et `gallery` restent séparés. Tu ne remplaces que les fichiers ici et ajoutes tes images dans `assets/gallery/`.

## Installation rapide
1. Copie ce dossier dans ton dépôt GitHub (branche `main`).
2. Place tes images dans `assets/gallery/` (ou garde ton dossier `gallery` existant et mets à jour `config/galerie-config.json`).
3. Ouvre `config/site-config.json` et ajuste les valeurs (hauteur header, opacité, ombres, tailles…).

## Fichiers clés
- `index.html` — structure de la page.
- `styles.css` — styles globaux (N&B + gris permis).
- `js/main.js` — bootstrap (charge la config + modules).
- `js/modules/ui-header.js` — header sticky configuré.
- `js/modules/ui-modal.js` — fenêtre modale accessible.
- `js/modules/ui-gallery.js` — galerie carrée + flèches géantes + clip oblique.
- `js/modules/ui-accordion.js` — accordéon Matériaux (un seul panneau).
- `config/site-config.json` — **tous les réglages** modifiables sans coder.
- `config/galerie-config.json` — liste de tes images (chemins relatifs).
- `docs/CHANGEMENTS.txt` — changelog simple.
- `docs/COMMENT_MODIFIER.txt` — pas-à-pas pour adapter.

