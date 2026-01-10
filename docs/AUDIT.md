# Audit rapide (runtime vs legacy)
Analyse basée sur les références `index.html` + JS importés + JSON (`data/*.json`) + `url(...)` CSS.
## Ce qui est requis au runtime
- HTML: `index.html`
- CSS: `css/00-base.css`, `css/10-components.css`, `css/20-site.css`, `assets/intro/intro.css`
- JS: `assets/intro/intro.js`, `js/app.js` (qui importe `page.js`, `background-canvas.js`, `gallery.js`), `js/utils.js`
- Data: `data/models.json`, `data/gallery.json`
- Assets: bandeaux `assets/bandeaux/M01..M10/image.webp`, galerie `assets/galerie/**/thumb|full/*.webp`, fonds `assets/fond/*.webp`, polices + logos intro
## Candidats à archiver (pas supprimés par défaut)
### Données/configs non utilisées (runtime)
- `assets/galerie.json`
- `assets/bandeaux/bandeaux-config.json`
- `assets/galerie/galerie-config.json`
- `assets/galerie/manifest.json`
- `config/site-config.js`
- `config/site-config.json`
- `config/site-config.yaml`
- `config/site-config.yml`
- `config/galerie-config.json`
- `config/materials.json`
- `data/galerie.json`
- `assets/manifest/sizes.json`
- `assets/ui/placeholder.svg`
### Assets potentiellement inutilisés / legacy
- `assets/bandeaux/M*/description.txt`
- `assets/bandeaux/M04/image.png`
- `assets/bandeaux/M04/file_*.png`
- `assets/galerie/galerie01.webp … galerie05.webp`
- `assets/galerie/*/image1.txt`
- `assets/.bot`

## Notes
- Les `description.txt` peuvent servir si tu veux afficher des légendes dans le futur.
- Les PNG de M04 peuvent servir de source si tu veux régénérer des WebP.


## Changements appliqués (260110)
- Archive des fichiers/configs legacy dans `_archive/unused/` : `config/`, `assets/galerie.json`, `assets/galerie/manifest.json`, `assets/galerie/galerie-config.json`, `assets/bandeaux/bandeaux-config.json`, `data/galerie.json`.
- Suppression des fichiers PNG restants (runtime 100% WebP).
