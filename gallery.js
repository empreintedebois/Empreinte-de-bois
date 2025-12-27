/* ============================================================
   gallery.js — Galerie auto (optimisée) + "Voir plus"
   ------------------------------------------------------------
   - Charge un seul fichier data/gallery.json
   - Affiche Tout + filtres (gravure/accessoire/maquette)
   - Grille = thumbnails, lightbox = full
   - Limite l'affichage : A=2x3 (6), B/C=3x3 (9)
   - Bouton "Voir plus" ouvre une modal avec toute la grille
   ============================================================ */

(async function () {
  const portfolio = document.querySelector("#portfolio");
  const grid = document.querySelector("#portfolio .gallery-grid");
  if (!portfolio || !grid) return;

  const filterButtons = Array.from(portfolio.querySelectorAll("[data-filter]"));
  const moreBtn = document.getElementById("galleryMoreBtn");

  // Main image lightbox (existant dans ton HTML)
  const lightbox = document.getElementById("lightbox");
  const lbImg = lightbox ? lightbox.querySelector("figure img") : null;
  const lbCap = lightbox ? lightbox.querySelector("figure figcaption") : null;

  // "Voir plus" modal
  const moreModal = document.getElementById("galleryMore");
  const moreGrid = moreModal ? moreModal.querySelector(".gallery-more-grid") : null;

  let currentFilter = "all";
  let items = [];

  function isMobileA() {
    return (window.matchMedia && window.matchMedia("(max-width: 640px)").matches);
  }

  function limitCount() {
    return isMobileA() ? 6 : 9;
  }

  function openMainLightbox(fullSrc, caption) {
    if (!lightbox || !lbImg || !lbCap) return;
    lbImg.src = fullSrc;
    lbImg.alt = caption || "";
    lbCap.textContent = caption || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function buildCard(it) {
    const cat = it.category || "";
    const thumb = it.thumb || it.src || "";
    const full = it.full || it.src || thumb;
    const caption = (it.caption || "").trim();

    const article = document.createElement("article");
    article.className = "gallery-item";
    article.dataset.cat = cat;

    const btn = document.createElement("button");
    btn.className = "gallery-item__btn";
    btn.type = "button";
    btn.dataset.full = full;
    btn.dataset.caption = caption;

    const media = document.createElement("div");
    media.className = "gallery-item__media";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = thumb;
    img.alt = caption || "";
    media.appendChild(img);

    // Légende overlay dans le media (pour garder l'image carrée)
    const cap = document.createElement("div");
    cap.className = "gallery-item__caption";
    cap.textContent = caption;
    media.appendChild(cap);

    btn.appendChild(media);
    article.appendChild(btn);
    return article;
  }

  function setActiveFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach((b) => b.classList.toggle("is-active", (b.dataset.filter || "") === filter));

    const allCards = Array.from(grid.querySelectorAll(".gallery-item"));
    const visibleCards = [];

    allCards.forEach((card) => {
      const cat = (card.dataset.cat || "").trim();
      const match = filter === "all" || cat === filter;
      card.style.display = match ? "" : "none";
      if (match) visibleCards.push(card);
    });

    // Limit + Voir plus
    const lim = limitCount();
    let shown = 0;
    visibleCards.forEach((card) => {
      shown += 1;
      card.style.display = (shown <= lim) ? "" : "none";
    });

    if (moreBtn) {
      moreBtn.style.display = (visibleCards.length > lim) ? "block" : "none";
    }
  }

  function populateMoreModal() {
    if (!moreGrid) return;
    moreGrid.innerHTML = "";

    const filtered = items.filter(it => currentFilter === "all" || (it.category || "") === currentFilter);

    const frag = document.createDocumentFragment();
    for (const it of filtered) {
      // In modal, use thumbs too (fast), open main lightbox with full
      const card = buildCard(it);
      frag.appendChild(card);
    }
    moreGrid.appendChild(frag);
  }

  // Load manifest
  try {
    const res = await fetch("data/gallery.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    items = Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    return;
  }

  // Render base grid
  grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const it of items) frag.appendChild(buildCard(it));
  grid.appendChild(frag);

  // Filter button events
  filterButtons.forEach((b) => {
    b.addEventListener("click", () => setActiveFilter(b.dataset.filter || "all"));
  });

  // Grid click opens main lightbox
  grid.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".gallery-item__btn");
    if (!btn) return;
    openMainLightbox(btn.dataset.full || "", btn.dataset.caption || "");
  });

  // More button
  if (moreBtn && moreModal && moreGrid) {
    moreBtn.addEventListener("click", () => {
      populateMoreModal();
      openModal(moreModal);
    });

    moreGrid.addEventListener("click", (evt) => {
      const btn = evt.target.closest(".gallery-item__btn");
      if (!btn) return;
      // close more modal, then open main lightbox
      closeModal(moreModal);
      openMainLightbox(btn.dataset.full || "", btn.dataset.caption || "");
    });

    moreModal.addEventListener("click", (evt) => {
      if (evt.target.closest("[data-close]") || evt.target.classList.contains("lightbox__backdrop")) {
        closeModal(moreModal);
      }
    });
  }

  // Close main lightbox
  if (lightbox) {
    lightbox.addEventListener("click", (evt) => {
      if (evt.target.closest("[data-close]") || evt.target.classList.contains("lightbox__backdrop")) {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        if (lbImg) lbImg.removeAttribute("src");
        if (lbCap) lbCap.textContent = "";
        document.body.style.overflow = "";
      }
    });
  }

  document.addEventListener("keydown", (evt) => {
    if (evt.key !== "Escape") return;
    if (moreModal && moreModal.classList.contains("is-open")) closeModal(moreModal);
    if (lightbox && lightbox.classList.contains("is-open")) {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      if (lbImg) lbImg.removeAttribute("src");
      if (lbCap) lbCap.textContent = "";
      document.body.style.overflow = "";
    }
  });

  // Re-apply limit on resize (A<->B/C)
  window.addEventListener("resize", () => {
    window.requestAnimationFrame(() => setActiveFilter(currentFilter));
  }, { passive: true });

  // Init
  setActiveFilter("all");
})();
