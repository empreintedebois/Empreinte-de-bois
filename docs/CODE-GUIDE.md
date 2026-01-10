# Guide de code (Empreinte-de-bois)

## Objectif
- Modifs faciles sans casser le reste.
- Un point d’entrée JS (`js/app.js`).
- CSS en 3 niveaux: base → components → site.

## CSS
Ordre de chargement (dans `index.html`):
1. `css/00-base.css` : tokens/reset/typo/utilities
2. `css/10-components.css` : composants réutilisables (btn, card, modal, form)
3. `css/20-site.css` : styles spécifiques (sections, overrides)
4. `assets/intro/intro.css` : intro isolée

Règles:
- Pas de styles de section dans `00-base.css`.
- Les patchs temporaires doivent être commentés et résorbés.

## JS
- `js/app.js` importe les modules runtime.
- Les modules actuels s'auto-initialisent à l'import; à terme, on pourra passer à `init()` par section.

## Data
- Contenus listés: `data/models.json`, `data/gallery.json`.
- Idéal: éviter de multiplier `config/*` si non utilisés.

