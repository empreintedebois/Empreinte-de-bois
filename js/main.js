import { applyHeader } from './modules/ui-header.js';
import { setupModal } from './modules/ui-modal.js';
import { setupGallery } from './modules/ui-gallery.js';
import { setupAccordion } from './modules/ui-accordion.js';

(async function init(){
  const res = await fetch('config/site-config.json');
  const cfg = await res.json();

  // expose CSS vars from config
  document.documentElement.style.setProperty('--gallery-maxvw', cfg.gallery.maxWidthVW + 'vw');
  document.documentElement.style.setProperty('--gallery-card-shadow', cfg.gallery.cardShadow);
  document.documentElement.style.setProperty('--gallery-banner-h', cfg.gallery.whiteBannerHeight + 'px');
  document.documentElement.style.setProperty('--gallery-nav-d', cfg.gallery.navDiameterVW + 'vw');

  applyHeader(cfg);
  setupModal();
  setupGallery(cfg);
  setupAccordion();

  // Ornament style on subtitle
  const wrap = document.querySelector('.subtitle-wrap');
  if (wrap && cfg.subtitle?.ornament){
    wrap.classList.add('orn-' + cfg.subtitle.ornament);
  }
})();