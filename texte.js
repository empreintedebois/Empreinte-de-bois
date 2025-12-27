/* ============================================================
   texte.js — Textes + Variables CSS (héritées de styles.css)
   ------------------------------------------------------------
   Tu modifies UNIQUEMENT ce fichier pour :
   - Changer les textes (CONTENT)
   - Ajuster les variables CSS pilotables (VARS + MODES)

   MODES (auto) :
   A = Téléphone (<= 640px)
   B = Téléphone "version ordinateur" / tablette (tactile <= 1024px)
   C = Ordinateur (le reste)

   IMPORTANT :
   - Les bandeaux/fond animé/halos restent dans index.html
   - La mise en page reste dans styles.css (ce fichier ne change que des VARS)
   ============================================================ */

/* =========================
   1) TEXTES — MODIFIE ICI
   ========================= */
window.TEXTE = {
  CONTENT: {
  "documentTitle": "Empreinte de Bois – Portfolio 3D",
  "headerLogoText": "Empreinte de Bois",
  "nav": {
    "#portfolio": "Galerie",
    "#process": "Démarche",
    "#models": "Modèles",
    "#about": "À propos",
    "#contact": "Contact"
  },
  "hero": {
    "eyebrow": "Conception 3D & gravure",
    "title": "Donner du relief à la matière.",
    "subtitle": "Images, volumes et textures au service de la fabrication. Un pont entre rendu numérique et pièce physique.",
    "btnPrimary": "Voir la galerie",
    "btnGhost": "Discuter d’un projet",
    "hint": "Scroll pour explorer la galerie ↓",
    "cardCaption": ""
  },
  "sections": {
    "portfolio": {
      "title": "Galerie",
      "desc": "Une sélection de projets récents : matières, essais de lumière, compositions et maquettes préparatoires."
    },
    "process": {
      "title": "Démarche",
      "desc": "Une boucle courte entre idée, simulation 3D et test matière."
    },
    "models": {
      "title": "Modèles & déclinaisons",
      "desc": "Choisissez un support et explorez ses variantes de matière ou de couleur."
    },
    "about": {
      "title": "À propos",
      "p1": "Je conçois des images et des volumes destinés à devenir des objets physiques : gravures, panneaux, pièces uniques ou petites séries.",
      "p2": "Mon travail mélange outils 3D, sens de la matière et contraintes réelles d’atelier. L’objectif : garder un rendu fort, mais fabriquable.",
      "tagsTitle": "",
      "tags": []
    },
    "contact": {
      "title": "Contact",
      "desc": "Un projet, une idée ou juste une question sur la faisabilité d’une pièce ? Envoyez quelques lignes, éventuellement des visuels, et on voit ce qui est réaliste."
    }
  },
  "contactForm": {
    "labelName": "Nom",
    "labelEmail": "Email",
    "labelMessage": "Message",
    "labelSelection": "Sélection",
    "btnSend": "Envoyer",
    "mailtoAction": "mailto:empreinte.de.bois@example.com"
  },
  "footer": {
    "text": "© Empreinte de Bois – Adam",
    "backToTop": "Retour en haut"
  }
},

  /* =========================
     2) VARIABLES CSS — MODIFIE ICI
        (valeurs "héritées" : mêmes noms que dans styles.css)
     ========================= */
  VARS: {
  "--t-body-size": "1.05rem",
  "--t-h1-size": "3.25rem",
  "--t-h1-lh": "1",
  "--t-eyebrow-size": "0.90rem",
  "--t-section-h2-size": "1.75rem",
  "--t-nav-size": "0.90rem",
  "--t-btn-size": "1.00rem",
  "--gold": "#b88a3b",
  "--frame-border-w": "clamp(1px, 0.18vw, 3px)",
  "--frame-bg-solid": "rgba(0,0,0,1)",
  "--frame-bg-soft": "rgba(0,0,0,0.9)",
  "--header-offset": "72px"
},

  /* =========================
     3) SURCHARGES PAR MODE — MODIFIE ICI
     ========================= */
  MODES: {
  "A": {
    "--t-body-size": "0.95rem",
    "--t-h1-size": "2.25rem",
    "--t-h1-lh": "1.05",
    "--t-eyebrow-size": "0.80rem",
    "--t-section-h2-size": "1.35rem",
    "--t-nav-size": "0.72rem",
    "--t-btn-size": "0.95rem",
    "--header-offset": "64px"
  },
  "B": {
    "--t-body-size": "1.00rem",
    "--t-h1-size": "2.75rem",
    "--t-h1-lh": "1.02",
    "--t-eyebrow-size": "0.85rem",
    "--t-section-h2-size": "1.55rem",
    "--t-nav-size": "0.80rem",
    "--t-btn-size": "1.00rem",
    "--header-offset": "68px"
  },
  "C": {
    "--t-body-size": "1.05rem",
    "--t-h1-size": "3.25rem",
    "--t-h1-lh": "1.00",
    "--t-eyebrow-size": "0.90rem",
    "--t-section-h2-size": "1.75rem",
    "--t-nav-size": "0.90rem",
    "--t-btn-size": "1.00rem",
    "--header-offset": "72px"
  }
}
};

/* ============================================================
   MOTEUR — injection des textes + application des variables CSS
   ============================================================ */
(function main() {
  "use strict";

  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  const setText = (sel, value) => {
    if (value === undefined || value === null) return;
    const el = qs(sel);
    if (!el) return;
    el.textContent = String(value);
  };

  const setAttr = (sel, attr, value) => {
    if (value === undefined || value === null) return;
    const el = qs(sel);
    if (!el) return;
    el.setAttribute(attr, String(value));
  };

  const setLabelText = (labelEl, value) => {
    if (!labelEl || value === undefined || value === null) return;
    const v = String(value) + " ";
    const first = labelEl.childNodes[0];
    if (first && first.nodeType === Node.TEXT_NODE) {
      first.nodeValue = v;
    } else {
      labelEl.insertBefore(document.createTextNode(v), labelEl.firstChild);
    }
  };

  function getMode() {
    const w = Math.min(window.innerWidth || 0, window.screen?.width || 9999);
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

    if (w <= 640) return "A";
    if (coarse && w <= 1024) return "B";
    return "C";
  }

  function applyCssVars(baseVars, modeVars) {
    const root = document.documentElement;
    const all = Object.assign({}, baseVars || {}, modeVars || {});
    for (const [k, v] of Object.entries(all)) {
      root.style.setProperty(k, String(v));
    }
  }

  function applyTexts(C) {
    if (!C) return;

    if (C.documentTitle) document.title = C.documentTitle;

    // Header
    setText(".site-logo__text", C.headerLogoText);
    if (C.nav) {
      for (const [href, txt] of Object.entries(C.nav)) {
        setText(`header.site-header nav.site-nav a[href="${href}"]`, txt);
      }
    }

    // Hero
    setText(".hero .eyebrow", C.hero?.eyebrow);
    setText(".hero h1", C.hero?.title);
    setText(".hero .hero__subtitle", C.hero?.subtitle);
    setText('.hero .btn--primary[href="#portfolio"]', C.hero?.btnPrimary);
    setText('.hero .btn--ghost[href="#contact"]', C.hero?.btnGhost);
    setText(".hero .hero__hint", C.hero?.hint);
    setText(".hero .hero-card__caption", C.hero?.cardCaption);

    // Sections headers
    for (const id of ["portfolio","process","models"]) {
      setText(`section#${id} .section__hdr h2`, C.sections?.[id]?.title);
      setText(`section#${id} .section__hdr p`, C.sections?.[id]?.desc);
    }

    // About
    if (C.sections?.about) {
      setText("section#about h2", C.sections.about.title);
      const ps = qsa("section#about .about__text p");
      if (ps[0] && C.sections.about.p1) ps[0].textContent = String(C.sections.about.p1);
      if (ps[1] && C.sections.about.p2) ps[1].textContent = String(C.sections.about.p2);
      setText("section#about .about__tags h3", C.sections.about.tagsTitle);
      if (Array.isArray(C.sections.about.tags)) {
        const lis = qsa("section#about .taglist li");
        C.sections.about.tags.forEach((val, i) => { if (lis[i]) lis[i].textContent = String(val); });
      }
    }

    // Contact
    setText("section#contact h2", C.sections?.contact?.title);
    setText("section#contact .contact__text p", C.sections?.contact?.desc);

    const labels = qsa("section#contact form label");
    setLabelText(labels[0], C.contactForm?.labelName);
    setLabelText(labels[1], C.contactForm?.labelEmail);
    setLabelText(labels[2], C.contactForm?.labelMessage);
    setLabelText(labels[3], C.contactForm?.labelSelection);

    setText("section#contact form button.btn--primary", C.contactForm?.btnSend);
    setAttr("section#contact form.contact__form", "action", C.contactForm?.mailtoAction);

    // Footer
    setText("footer.site-footer p", C.footer?.text);
    setText('footer.site-footer a[href="#top"]', C.footer?.backToTop);
  }

  function refresh() {
    const T = window.TEXTE || {};
    const mode = getMode();
    applyCssVars(T.VARS, (T.MODES || {})[mode]);
  }

  window.addEventListener("resize", () => window.requestAnimationFrame(refresh), { passive: true });

  document.addEventListener("DOMContentLoaded", () => {
    // Variables CSS (avant layout)
    refresh();
    // Textes
    applyTexts(window.TEXTE?.CONTENT);
  });
})();
