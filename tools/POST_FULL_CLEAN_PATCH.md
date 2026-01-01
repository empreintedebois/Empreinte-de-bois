# Post Full Clean Patch

This patch fixes broken paths after FULL CLEAN:
- heroBackground path -> assets/hero-bg.webp
- materials images -> assets/bandeaux/Mxx/image.webp (removes assets/materiaux refs)
- models.json thumb/full/variants -> assets/bandeaux/Mxx/image.webp
- removes two unused invalid JSON files that referenced missing JPGs:
  - assets/galerie.json
  - data/galerie.json

## Manual deletions (if applying patch manually)
Delete:
- assets/galerie.json
- data/galerie.json
