// js/app.js
// Point d'entrée unique pour le runtime du site.
// Objectif: une seule balise <script type="module"> dans index.html.
//
// Notes:
// - Les modules importés ci-dessous s'auto-initialisent à l'import (pattern actuel).
// - Si on veut aller plus loin, on pourra leur faire exposer un init() explicite.

import "./page.js";
import "./background-canvas.js";
import "./gallery.js";
