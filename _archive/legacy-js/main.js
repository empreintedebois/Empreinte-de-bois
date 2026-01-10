async function loadJSON(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Impossible de charger " + url + ": " + response.status);
  }
  return await response.json();
}

/* Applique la configuration générale du site (titre, sous-titre, images...) */
function applySiteConfig() {
  const cfg = window.SITE_CONFIG || {};
  const titleEl = document.getElementById("site-title");
  const subtitleEl = document.getElementById("site-subtitle");
  const headerImg = document.getElementById("header-image");

  if (cfg.siteTitle && titleEl) {
    titleEl.textContent = cfg.siteTitle;
    document.title = cfg.siteTitle;
  }

  if (cfg.ctaBand?.title && titleEl) {
    // Si besoin, on pourrait différencier, mais pour l'instant même texte
  }

  if (cfg.subtitle && subtitleEl) {
    subtitleEl.textContent = cfg.subtitle;
  } else if (cfg.ctaBand?.subtitle && subtitleEl) {
    subtitleEl.textContent = cfg.ctaBand.subtitle;
  }

  if (cfg.headerImage && headerImg) {
    headerImg.src = cfg.headerImage;
  }
}

/* Parallaxe sur le header : l'image monte 1.5x plus vite que le scroll */
function initHeaderParallax() {
  const root = document.documentElement;
  const headerImg = document.getElementById("header-image");
  if (!headerImg) return;

  const factorStr = getComputedStyle(root).getPropertyValue("--header-parallax-factor");
  const factor = Number.parseFloat(factorStr) || 1.5;
  let ticking = false;

  function update() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const offset = -scrollY * factor;
    root.style.setProperty("--header-parallax-offset", offset + "px");
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  });

  update();
}

/* Galerie simple : une image au centre, boucle sur elle-même */
function initGallery() {
  const cfg = window.SITE_CONFIG || {};
  const images = Array.isArray(cfg.galleryImages) ? cfg.galleryImages : [];
  const imgEl = document.getElementById("gallery-image");
  const prevBtn = document.querySelector(".gal-nav--prev");
  const nextBtn = document.querySelector(".gal-nav--next");

  if (!imgEl || !images.length) return;

  let index = 0;

  function show(idx) {
    index = (idx + images.length) % images.length;
    imgEl.src = images[index];
  }

  prevBtn?.addEventListener("click", () => show(index - 1));
  nextBtn?.addEventListener("click", () => show(index + 1));

  document.addEventListener("keydown", (evt) => {
    if (evt.key === "ArrowLeft") show(index - 1);
    if (evt.key === "ArrowRight") show(index + 1);
  });

  show(0);
}

/* Matériaux : construit les bandeaux à partir de config/materials.json */
async function initMaterials() {
  const container = document.getElementById("materials");
  if (!container) return;

  let data;
  try {
    data = await loadJSON("config/materials.json");
  } catch (err) {
    container.textContent = "Impossible de charger la configuration des matériaux.";
    console.error(err);
    return;
  }

  const materials = Array.isArray(data) ? data : [];
  const form = document.getElementById("contact-form");
  const summaryField = document.getElementById("selection-summary");

  const selections = new Map(); // idMat => { checked, optionLabel }

  function updateSummary() {
    if (!summaryField) return;
    const parts = [];
    for (const [id, info] of selections.entries()) {
      if (info.checked) {
        const label = info.optionLabel || "Neutre";
        parts.append ? parts.append : null
        parts.push(id + " — " + label);
      }
    }
    summaryField.value = parts.join("\n");
  }

  function createMaterial(mat) {
    const details = document.createElement("details");
    details.className = "material";
    details.dataset.materialId = mat.id;

    // Sommaire
    const summary = document.createElement("summary");
    summary.className = "material__summary";

    const checkboxWrap = document.createElement("span");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "material__checkbox";
    checkbox.name = "materials";
    checkbox.value = mat.id;
    checkboxWrap.appendChild(checkbox);

    const titleSpan = document.createElement("span");
    titleSpan.className = "material__title";
    titleSpan.textContent = mat.title || mat.id;

    summary.appendChild(checkboxWrap);
    summary.appendChild(titleSpan);
    details.appendChild(summary);

    // Panneau interne
    const panel = document.createElement("div");
    panel.className = "material__panel";

    const imgWrap = document.createElement("div");
    imgWrap.className = "material__image-wrap";
    const img = new Image();
    img.className = "material__image";
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = mat.title || mat.id;
    img.dataset.src = mat.imageBase || "";
    imgWrap.appendChild(img);
    panel.appendChild(imgWrap);

    // Options
    const optionsWrap = document.createElement("div");
    optionsWrap.className = "material__options";

    const opts = Array.isArray(mat.options) && mat.options.length
      ? mat.options
      : [{
          id: "neutre",
          label: "Neutre",
          image: mat.imageBase || "",
          formTag: mat.id + ":Neutre"
        }];

    opts.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "material__option-btn" + (idx === 0 ? " material__option-btn--active" : "");
      btn.textContent = opt.label || opt.id;
      btn.dataset.image = opt.image || "";
      btn.dataset.formTag = opt.formTag || (mat.id + ":" + (opt.label || opt.id));
      btn.addEventListener("click", () => {
        // toggle visuel actif
        optionsWrap.querySelectorAll(".material__option-btn").forEach((b) => {
          b.classList.toggle("material__option-btn--active", b === btn);
        });
        // change l'image
        if (btn.dataset.image) {
          img.src = btn.dataset.image;
        } else if (img.dataset.src) {
          img.src = img.dataset.src;
        }
        // enregistre la sélection
        const info = selections.get(mat.id) || { checked: checkbox.checked, optionLabel: null };
        info.optionLabel = btn.textContent;
        selections.set(mat.id, info);
        updateSummary();
      });
      optionsWrap.appendChild(btn);
    });

    panel.appendChild(optionsWrap);

    const text = document.createElement("div");
    text.className = "material__text";
    const descP = document.createElement("p");
    descP.textContent = mat.description || "";
    const subP = document.createElement("p");
    subP.textContent = mat.subtext || "";
    text.appendChild(descP);
    text.appendChild(subP);
    panel.appendChild(text);

    details.appendChild(panel);

    // Quand on ouvre, on charge l'image si pas déjà faite
    details.addEventListener("toggle", () => {
      if (details.open) {
        // fermer les autres
        document.querySelectorAll("details.material").forEach((other) => {
          if (other !== details) other.open = false;
        });
        if (!img.src && img.dataset.src) {
          img.src = img.dataset.src;
        }
      }
    });

    // Màj des sélections lors du clic sur la case
    checkbox.addEventListener("change", () => {
      const info = selections.get(mat.id) || {};
      info.checked = checkbox.checked;
      if (!info.optionLabel) {
        const activeBtn = optionsWrap.querySelector(".material__option-btn--active");
        info.optionLabel = activeBtn ? activeBtn.textContent : "Neutre";
      }
      selections.set(mat.id, info);
      updateSummary();
    });

    return details;
  }

  materials.forEach((mat) => {
    container.appendChild(createMaterial(mat));
  });
}

/* G. Boutons de bas de page */
function initBottomButtons() {
  const cfg = window.SITE_CONFIG || {};
  const wrap = document.getElementById("cta-buttons");
  if (!wrap) return;
  const buttons = Array.isArray(cfg.bottomButtons) ? cfg.bottomButtons : [];
  buttons.forEach((btnCfg) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = btnCfg.label || btnCfg.id;
    wrap.appendChild(btn);
  });
}

/* Titre de la section info */
function initInfoTitle() {
  const cfg = window.SITE_CONFIG || {};
  const el = document.getElementById("info-title-text");
  if (!el) return;
  el.textContent = cfg.infoBand?.title || "Matériaux et contact";
}

document.addEventListener("DOMContentLoaded", () => {
  applySiteConfig();
  initHeaderParallax();
  initGallery();
  initMaterials().catch(console.error);
  initBottomButtons();
  initInfoTitle();
});
