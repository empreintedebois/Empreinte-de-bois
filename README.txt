Empreinte de Bois — Réparation propre (sans images)

- Header compact et sticky (~1–2 cm), logo réduit, titre centré, bouton "Matrice" très discret à gauche.
- Défilement rétabli (body scroll), rien ne bloque l'arrière-plan.
- Galerie résiliente : assets/galerie.json liste les chemins d'images. Les fichiers d'images ne sont pas fournis,
  mais le site ne casse pas : un placeholder s'affiche si une image manque.
- Matrice en overlay (iframe) mobile-friendly.

Intégration :
1) Déposez ce dossier sur votre hébergement (remplacez ancien site si besoin).
2) Conservez vos images aux mêmes chemins (assets/logo.png, assets/galerie/*.jpg, etc.).
3) Mettez à jour assets/galerie.json avec vos vrais chemins et alt.
4) Ouvrez index.html dans un navigateur.

Ajustements rapides :
- Hauteur header : .header-inner { min-height:72px } et .logo { height:40px }.
- Bouton matrice : .btn-matrix (couleurs brunes).
- Grille : .grid (breakpoints 1024 / 820 / 520 px).