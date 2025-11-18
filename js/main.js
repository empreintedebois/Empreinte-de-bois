import { initGallery } from "./modules/ui-gallery.js";
import { initAccordion } from "./modules/ui-accordion.js";

function applySiteConfig() {
  const cfg = window.EDB_CONFIG || {};
  const titleEl = document.getElementById("site-title");
  const subtitleEl = document.getElementById("subtitle");
  const logoEl = document.getElementById("brand-logo");

  if (cfg.siteTitle && titleEl) {
    titleEl.textContent = cfg.siteTitle;
    document.title = cfg.siteTitle;
  }

  if (cfg.subtitle && subtitleEl) {
    subtitleEl.textContent = cfg.subtitle;
  }

  if (cfg.brandLogoSrc && logoEl) {
    logoEl.src = cfg.brandLogoSrc;
  }
}

function initHeaderParallax() {
  const root = document.documentElement;
  const factor = Number.parseFloat(getComputedStyle(root).getPropertyValue("--header-parallax-factor")) || 0.5;
  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const offset = -scrollY * factor;
    root.style.setProperty("--header-parallax-offset", offset + "px");
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  });

  updateParallax();
}

document.addEventListener("DOMContentLoaded", () => {
  applySiteConfig();
  initHeaderParallax();
  initGallery(window.EDB_CONFIG);
  initAccordion(window.EDB_CONFIG);
});
