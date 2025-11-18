export function initGallery(config) {
  const grid = document.querySelector(".gallery-grid");
  const prevBtn = document.querySelector(".gal-prev");
  const nextBtn = document.querySelector(".gal-next");

  if (!grid) return;

  const images = Array.isArray(config?.galleryImages) && config.galleryImages.length
    ? config.galleryImages
    : [];

  // Nettoyage
  grid.innerHTML = "";

  if (!images.length) {
    const msg = document.createElement("p");
    msg.textContent = "Ajoutez vos images dans assets/galerie et mettez à jour config/site-config.js.";
    msg.style.margin = "0";
    grid.appendChild(msg);
  } else {
    for (const src of images) {
      const img = new Image();
      img.src = src;
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = "";
      grid.appendChild(img);
    }
  }

  const scrollByStep = () => {
    const rect = grid.getBoundingClientRect();
    return rect.width * 0.9;
  };

  const onNavClick = (dir) => {
    grid.scrollBy({
      left: dir * scrollByStep(),
      behavior: "smooth"
    });
  };

  prevBtn?.addEventListener("click", () => onNavClick(-1));
  nextBtn?.addEventListener("click", () => onNavClick(1));

  // Navigation clavier
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "ArrowLeft") {
      onNavClick(-1);
    } else if (evt.key === "ArrowRight") {
      onNavClick(1);
    }
  });
}
