/* ============================================================
   gallery.js — Galerie auto (optimisée) V3
   ------------------------------------------------------------
   - data/gallery.json (1 seul fetch)
   - Filtres : all / gravure / accessoire / maquette
   - Grille : A=2 colonnes, B/C=3 colonnes (CSS)
   - Miniatures carrées + légende overlay
   - Limite : A = 6 (2x3), B/C = 9 (3x3)
   - "Voir plus" : ouvre une modal avec toute la grille filtrée
   - Clic dans "Voir plus" -> ouvre la lightbox image normale
   ============================================================ */

(async function () {
  const portfolio = document.querySelector("#portfolio");
  const grid = document.querySelector("#portfolio .gallery-grid");
  if (!portfolio || !grid) return;

  const filterButtons = Array.from(portfolio.querySelectorAll("[data-filter]"));
  const moreBtn = document.getElementById("galleryMoreBtn");

  // Lightbox principale (déjà dans index)
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbCaption = document.getElementById("lightbox-caption");

  // Modal "Voir plus" (ajoutée dans index)
  const moreModal = document.getElementById("galleryMore");
  const moreGrid = moreModal ? moreModal.querySelector(".gallery-more-grid") : null;

  let items = [];
  let currentFilter = "all";

  const isMobileA = () => window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
  const limitCount = () => (isMobileA() ? 6 : 9);

  function openLightbox(fullSrc, caption) {
    if (!lightbox || !lbImg || !lbCaption) return;
    lbImg.src = fullSrc;
    lbImg.alt = caption || "";
    lbCaption.textContent = caption || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox || !lbImg || !lbCaption) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lbImg.removeAttribute("src");
    lbCaption.textContent = "";
    document.body.style.overflow = "";
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
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

    const cap = document.createElement("div");
    cap.className = "gallery-item__caption";
    cap.textContent = caption;
    media.appendChild(cap);

    btn.appendChild(media);
    article.appendChild(btn);
    return article;
  }

  function applyFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach((b) => b.classList.toggle("is-active", (b.dataset.filter || "") === filter));

    const allCards = Array.from(grid.querySelectorAll(".gallery-item"));
    const visible = [];

    for (const card of allCards) {
      const cat = (card.dataset.cat || "").trim();
      const match = filter === "all" || cat === filter;
      card.style.display = match ? "" : "none";
      if (match) visible.push(card);
    }

    // Limitation + Voir plus
    const lim = limitCount();
    let shown = 0;
    for (const card of visible) {
      shown += 1;
      card.style.display = (shown <= lim) ? "" : "none";
    }

    if (moreBtn) moreBtn.style.display = (visible.length > lim) ? "block" : "none";
  }

  function populateMoreGrid() {
    if (!moreGrid) return;
    moreGrid.innerHTML = "";

    const filtered = items.filter(it => currentFilter === "all" || (it.category || "") === currentFilter);
    const frag = document.createDocumentFragment();
    for (const it of filtered) frag.appendChild(buildCard(it));
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

  // Filter events
  filterButtons.forEach((b) => b.addEventListener("click", () => applyFilter(b.dataset.filter || "all")));

  // Click on base grid -> open lightbox
  grid.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".gallery-item__btn");
    if (!btn) return;
    openLightbox(btn.dataset.full || "", btn.dataset.caption || "");
  });

  // "Voir plus" button
  if (moreBtn && moreModal && moreGrid) {
    moreBtn.addEventListener("click", () => {
      populateMoreGrid();
      openModal(moreModal);
    });

    // click on more grid -> close modal then open lightbox
    moreGrid.addEventListener("click", (evt) => {
      const btn = evt.target.closest(".gallery-item__btn");
      if (!btn) return;
      closeModal(moreModal);
      openLightbox(btn.dataset.full || "", btn.dataset.caption || "");
    });

    // close modal by backdrop / close
    moreModal.addEventListener("click", (evt) => {
      if (evt.target.closest("[data-close]")) closeModal(moreModal);
    });
  }

  // close main lightbox
  if (lightbox) {
    lightbox.addEventListener("click", (evt) => {
      if (evt.target.closest("[data-close]")) closeLightbox();
    });
  }

  // Escape closes modals
  document.addEventListener("keydown", (evt) => {
    if (evt.key !== "Escape") return;
    if (moreModal && moreModal.classList.contains("is-open")) closeModal(moreModal);
    if (lightbox && lightbox.classList.contains("is-open")) closeLightbox();
  });

  // Re-apply on resize (A<->B/C)
  window.addEventListener("resize", () => window.requestAnimationFrame(() => applyFilter(currentFilter)), { passive: true });

  // Init
  applyFilter("all");
})();
