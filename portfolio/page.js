/*
 * JavaScript pour le portfolio Empreinte de Bois.
 * Gère les filtres de la galerie et la lightbox pour les visuels.
 */

document.addEventListener("DOMContentLoaded", () => {
  const chips = Array.from(document.querySelectorAll(".chip"));
  const items = Array.from(document.querySelectorAll(".gallery-item"));
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbCaption = document.getElementById("lightbox-caption");

  // Filtrage des projets
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      chips.forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      items.forEach((item) => {
        if (filter === "all") {
          item.style.display = "";
          return;
        }
        const cat = item.dataset.cat || "";
        // un item peut avoir plusieurs catégories séparées par des espaces
        item.style.display = cat.split(/\s+/).includes(filter) ? "" : "none";
      });
    });
  });

  // Affichage du lightbox au clic
  document.addEventListener("click", (evt) => {
    const btn = evt.target.closest(".gallery-item__btn");
    if (btn) {
      const fullSrc = btn.getAttribute("data-full");
      const title = btn.querySelector(".gallery-item__meta h3").textContent.trim();
      const desc = btn.querySelector(".gallery-item__meta p").textContent.trim();
      lbImg.src = fullSrc;
      lbImg.alt = title;
      lbCaption.textContent = `${title} — ${desc}`;
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      return;
    }
    // fermer si clic sur backdrop ou bouton
    if (evt.target.dataset.close === "1" || evt.target.classList.contains("lightbox__close")) {
      closeLightbox();
    }
  });

  // Ferme la lightbox avec la touche Échap
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lbImg.src = "";
  }
});