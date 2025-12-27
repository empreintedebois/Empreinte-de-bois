/* ============================================================
   gallery.js — Galerie auto (optimisée)
   ------------------------------------------------------------
   - Charge un seul fichier data/gallery.json
   - Affiche Tout + filtres (gravure/accessoire/maquette)
   - Grille = thumbnails, lightbox = full
   - Compatible GitHub Pages (pas de listing de dossier côté navigateur)
   ============================================================ */

(async function () {
  const grid = document.querySelector("#portfolio .gallery-grid");
  if (!grid) return;

  const filterButtons = Array.from(document.querySelectorAll("#portfolio [data-filter]"));
  const lightbox = document.getElementById("lightbox");

  let lbImg = null;
  let lbCap = null;
  if (lightbox) {
    lbImg = lightbox.querySelector("figure img");
    lbCap = lightbox.querySelector("figure figcaption");
  }

  function setActiveFilter(filter) {
    filterButtons.forEach((b) => b.classList.toggle("is-active", (b.dataset.filter || "") === filter));
    const cards = Array.from(grid.querySelectorAll(".gallery-item"));
    cards.forEach((card) => {
      const cat = (card.dataset.cat || "").trim();
      const show = filter === "all" || cat === filter;
      card.style.display = show ? "" : "none";
    });
  }

  // Load manifest
  let data;
  try {
    const res = await fetch("data/gallery.json", { cache: "no-store" });
    if (!res.ok) return;
    data = await res.json();
  } catch (e) {
    return;
  }

  const items = Array.isArray(data.items) ? data.items : [];

  // Render
  const frag = document.createDocumentFragment();
  grid.innerHTML = "";

  for (const it of items) {
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

    const media = document.createElement("div");
    media.className = "gallery-item__media";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = thumb;
    img.alt = caption || "";
    media.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "gallery-item__meta";

    // Affichage sous la photo : on met la légende dans <p>
    const p = document.createElement("p");
    p.textContent = caption;
    meta.appendChild(p);

    btn.appendChild(media);
    btn.appendChild(meta);
    article.appendChild(btn);
    frag.appendChild(article);
  }

  grid.appendChild(frag);

  // Filter events
  filterButtons.forEach((b) => {
    b.addEventListener("click", () => setActiveFilter(b.dataset.filter || "all"));
  });
  setActiveFilter("all");

  // Lightbox open/close
  if (lightbox && lbImg && lbCap) {
    function openLB(fullSrc, caption) {
      lbImg.src = fullSrc;
      lbImg.alt = caption || "";
      lbCap.textContent = caption || "";
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function closeLB() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      lbImg.removeAttribute("src");
      lbCap.textContent = "";
      document.body.style.overflow = "";
    }

    grid.addEventListener("click", (evt) => {
      const btn = evt.target.closest(".gallery-item__btn");
      if (!btn) return;
      const card = btn.closest(".gallery-item");
      const caption = card ? (card.querySelector(".gallery-item__meta p")?.textContent || "") : "";
      openLB(btn.dataset.full || "", caption);
    });

    lightbox.addEventListener("click", (evt) => {
      if (evt.target.closest("[data-close]") || evt.target.classList.contains("lightbox__backdrop")) {
        closeLB();
      }
    });

    document.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape" && lightbox.getAttribute("aria-hidden") === "false") closeLB();
    });
  }
})();
