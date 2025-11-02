# Kit Global de Réparation — Matrice discrète (sans casser le site)

## Ce que contient
- `matrice/` : l'app Matrice (configurable) + l'onglet discret (tab).
  - `matrice.html`, `matrice.css`, `matrice.js`
  - `config.js` (modifiez ici produits, coeffs, textes, presets)
  - `matrice-tab.css`, `matrice-tab.js` (ajoutent un onglet flottant discret + panel centré)

## Intégration — 2 lignes, zéro casse
1. **Copiez** le dossier `matrice/` à la racine de votre site (ne remplace pas vos fichiers core).
2. Dans **votre page** (ex: `index.html`), ajoutez :
   - dans `<head>` :
     ```html
     <link rel="stylesheet" href="matrice/matrice-tab.css">
     ```
   - juste **avant** `</body>` :
     ```html
     <script src="matrice/matrice-tab.js"></script>
     ```

## Option — Onglet à gauche
Ouvrez `matrice/matrice-tab.css` et remplacez l'ancrage côté droit :
```css
.x-tab{ inset-inline-end: 0; }  /* actuel */
```
par :
```css
.x-tab{ inset-inline-start: 0; border-radius: 0 10px 10px 0; }
```

## Option — Uniformiser certains boutons
Utilisez les classes **opt-in** (n'impacte pas vos styles existants) :
```html
<button class="x-btn x-btn-brown">Action</button>
<a class="x-btn x-btn-brown" href="#">Lien</a>
```

## Configurer les prix, remises, coefficients
Tout est centralisé dans `matrice/config.js` :
- `prix_matiere_m2` (€/m²), `coef.*` (matière/texture/traitement/tolérance/complexité),
- `heures` (opérateur/machine), `divers.marge`, `quantite.min_facturation`, `quantite.remise`,
- `operation_params` (vitesse/passes),
- `presets` (vos offres packagées).

## Exemple prêt-à-tester (ne remplace pas votre site)
Ouvrez `index_patch_example.html` pour voir l'intégration **sans** toucher à vos fichiers.
