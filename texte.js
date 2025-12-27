/* texte.js — centralisation des textes du site
   Modifie uniquement ce fichier pour changer les textes (hors fond animé / halos).
   GitHub Pages friendly (aucune dépendance). */

window.TEXTE = {
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
    "desc": "Un projet, une idée ou juste une question sur la faisabilité d’une pièce ? Envoyez quelques lignes, éventuellement des visuels, et on voit ce qui est réaliste.",
    "labelName": "Nom",
    "labelEmail": "Email",
    "labelMessage": "Message",
    "labelSelection": "Sélection",
    "btnSend": "Envoyer",
    "mailto": "mailto:empreinte.de.bois@example.com"
  },
  "footer": {
    "text": "© Empreinte de Bois – Adam",
    "backToTop": "Retour en haut"
  }
};

(function applyTexte() {
  function qs(sel) { return document.querySelector(sel); }
  function setText(sel, value) {
    const el = qs(sel);
    if (!el) return;
    el.textContent = value;
  }
  function setAttr(sel, attr, value) {
    const el = qs(sel);
    if (!el) return;
    el.setAttribute(attr, value);
  }
  function setLabelText(labelEl, value) {
    // <label>Texte <input/></label> -> remplace uniquement le texte (sans casser l'input)
    if (!labelEl) return;
    const first = labelEl.childNodes[0];
    if (first && first.nodeType === Node.TEXT_NODE) {
      first.nodeValue = value + " ";
    } else {
      labelEl.insertBefore(document.createTextNode(value + " "), labelEl.firstChild);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const t = window.TEXTE || {};

    // Titre du document
    if (t.documentTitle) document.title = t.documentTitle;

    // Header
    if (t.headerLogoText) setText(".site-logo__text", t.headerLogoText);

    if (t.nav) {
      for (const [href, txt] of Object.entries(t.nav)) {
        setText(`header.site-header nav.site-nav a[href="${href}"]`, txt);
      }
    }

    // HERO
    if (t.hero) {
      if (t.hero.eyebrow) setText(".hero .eyebrow", t.hero.eyebrow);
      if (t.hero.title) setText(".hero h1", t.hero.title);
      if (t.hero.subtitle) setText(".hero .hero__subtitle", t.hero.subtitle);
      if (t.hero.btnPrimary) setText('.hero .btn--primary[href="#portfolio"]', t.hero.btnPrimary);
      if (t.hero.btnGhost) setText('.hero .btn--ghost[href="#contact"]', t.hero.btnGhost);
      if (t.hero.hint) setText(".hero .hero__hint", t.hero.hint);
      if (t.hero.cardCaption) setText(".hero .hero-card__caption", t.hero.cardCaption);
    }

    // Sections avec .section__hdr
    for (const id of ["portfolio","process","models"]) {
      if (!t[id]) continue;
      if (t[id].title) setText(`section#${id} .section__hdr h2`, t[id].title);
      if (t[id].desc) setText(`section#${id} .section__hdr p`, t[id].desc);
    }

    // À propos
    if (t.about) {
      if (t.about.title) setText("section#about h2", t.about.title);
      const ps = document.querySelectorAll("section#about .about__text p");
      if (ps[0] && t.about.p1) ps[0].textContent = t.about.p1;
      if (ps[1] && t.about.p2) ps[1].textContent = t.about.p2;
      if (t.about.tagsTitle) setText("section#about .about__tags h3", t.about.tagsTitle);
      if (Array.isArray(t.about.tags)) {
        const lis = document.querySelectorAll("section#about .taglist li");
        t.about.tags.forEach((val, i) => { if (lis[i]) lis[i].textContent = val; });
      }
    }

    // Contact
    if (t.contact) {
      if (t.contact.title) setText("section#contact h2", t.contact.title);
      if (t.contact.desc) setText("section#contact .contact__text p", t.contact.desc);

      const labels = document.querySelectorAll("section#contact form label");
      // Ordre attendu : Nom, Email, Message, Sélection
      if (labels[0] && t.contact.labelName) setLabelText(labels[0], t.contact.labelName);
      if (labels[1] && t.contact.labelEmail) setLabelText(labels[1], t.contact.labelEmail);
      if (labels[2] && t.contact.labelMessage) setLabelText(labels[2], t.contact.labelMessage);
      if (labels[3] && t.contact.labelSelection) setLabelText(labels[3], t.contact.labelSelection);

      if (t.contact.btnSend) setText("section#contact form button.btn--primary", t.contact.btnSend);
      if (t.contact.mailto) setAttr("section#contact form.contact__form", "action", t.contact.mailto);
    }

    // Footer
    if (t.footer) {
      if (t.footer.text) setText("footer.site-footer p", t.footer.text);
      if (t.footer.backToTop) setText('footer.site-footer a[href="#top"]', t.footer.backToTop);
    }
  });
})();
