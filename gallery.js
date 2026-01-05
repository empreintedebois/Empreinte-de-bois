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
  const lbSelect = document.getElementById("lightbox-select");
  const selectionSummary = document.getElementById("selection-summary");

  // Modal "Voir plus" (ajoutée dans index)
  const moreModal = document.getElementById("galleryMore");
  const moreGrid = moreModal ? moreModal.querySelector(".gallery-more-grid") : null;

  let items = [];
  let currentFilter = "all";

  const isMobileA = () => window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
  const limitCount = () => (isMobileA() ? 6 : 9);

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function parseStructuredCaption(raw) {
    const txt = (raw || "").replace(/\r/g, "").trim();
    const lines = txt.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return { title: "", fields: {}, notes: "" };

    const title = lines[0];
    const fields = {};
    const notes = [];

    for (const line of lines.slice(1)) {
      const m = line.match(/^([^:]{2,30})\s*:\s*(.+)$/);
      if (m) {
        const k = m[1].toLowerCase();
        const v = m[2].trim();
        if (k.startsWith("mati")) fields["Matières"] = v;
        else if (k.startsWith("tech")) fields["Technique"] = v;
        else if (k.startsWith("dim")) fields["Dimensions"] = v;
        else if (k.startsWith("fin")) fields["Finitions"] = v;
        else notes.push(line);
      } else {
        notes.push(line);
      }
    }

    return { title, fields, notes: notes.join("\n") };
  }

  function renderCaption(figcaptionEl, rawCaption) {
    if (!figcaptionEl) return;
    figcaptionEl.innerHTML = "";
    const parsed = parseStructuredCaption(rawCaption);

    const title = document.createElement("div");
    title.className = "lb-title";
    title.textContent = parsed.title || "";
    figcaptionEl.appendChild(title);

    const sep = document.createElement("div");
    sep.className = "lb-sep";
    figcaptionEl.appendChild(sep);

    const order = ["Matières", "Technique", "Dimensions", "Finitions"];
    for (const k of order) {
      if (!parsed.fields[k]) continue;
      const row = document.createElement("div");
      row.className = "lb-row";
      row.innerHTML = `<span class="lb-k">${escapeHtml(k)}</span><span class="lb-v">${escapeHtml(parsed.fields[k])}</span>`;
      figcaptionEl.appendChild(row);
    }

    if (parsed.notes) {
      const notes = document.createElement("div");
      notes.className = "lb-notes";
      notes.textContent = parsed.notes;
      figcaptionEl.appendChild(notes);
    }
  }

  function openLightbox(fullSrc, captionRaw) {
    if (!lightbox || !lbImg || !lbCaption) return;
    lbImg.src = fullSrc;
    const parsed = parseStructuredCaption(captionRaw);
    lbImg.alt = parsed.title || "";
    renderCaption(lbCaption, captionRaw || "");

    // Sélection depuis la lightbox (remonte vers le formulaire Contact)
    if (lbSelect && selectionSummary){
      const label = parsed.title ? `Galerie : ${parsed.title}` : "Galerie : (sans titre)";
      lbSelect.onclick = () => {
        selectionSummary.value = label;
        // scroll vers contact pour donner du sens au bouton
        const contact = document.getElementById("contact");
        if (contact) contact.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    }

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox || !lbImg || !lbCaption) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lbImg.removeAttribute("src");
    lbCaption.innerHTML = "";
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
    const captionRaw = (it.caption || "").trim();
    const parsed = parseStructuredCaption(captionRaw);
    const captionTitle = parsed.title || captionRaw;

    const article = document.createElement("article");
    article.className = "gallery-item";
    article.dataset.cat = cat;

    const btn = document.createElement("button");
    btn.className = "gallery-item__btn";
    btn.type = "button";
    btn.dataset.full = full;
    btn.dataset.caption = captionRaw;

    const media = document.createElement("div");
    media.className = "gallery-item__media";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = thumb;
    img.alt = captionTitle || "";
    media.appendChild(img);

    const cap = document.createElement("div");
    cap.className = "gallery-item__caption";
    cap.textContent = captionTitle;
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
