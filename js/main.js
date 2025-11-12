import { applyHeader } from './modules/ui-header.js';
import { setupModal } from './modules/ui-modal.js';
import { setupAccordion } from './modules/ui-accordion.js';
import { setupGalleryFallback } from './modules/ui-gallery-fallback.js';

(function init(){
  const cfg = window.SITE_CONFIG || {};
  document.documentElement.style.setProperty('--hdr-opacity', cfg.header?.opacity ?? .85);
  document.documentElement.style.setProperty('--hdr-shadow', cfg.header?.shadow ?? '0 10px 28px rgba(0,0,0,.35)');
  document.documentElement.style.setProperty('--gallery-maxvw', (cfg.gallery?.maxWidthVW ?? 66) + 'vw');
  document.documentElement.style.setProperty('--gallery-card-shadow', cfg.gallery?.cardShadow ?? '0 10px 24px rgba(0,0,0,.25)');
  document.documentElement.style.setProperty('--gallery-banner-h', (cfg.gallery?.whiteBannerHeight ?? 64) + 'px');
  document.documentElement.style.setProperty('--gallery-nav-d', (cfg.gallery?.navDiameterVW ?? 12.5) + 'vw');

  applyHeader(cfg);

  const hero = document.getElementById('hero');
  const overlay = hero?.querySelector('.hero__overlay');
  const subtitle = document.getElementById('subtitle');
  const titleEl = document.getElementById('site-title');
  const logoEl = document.getElementById('brand-logo');

  if (hero){
    const isDesktop = () => matchMedia('(min-width:768px)').matches;
    const applyHero = () => {
      hero.style.minHeight = (isDesktop() ? (cfg.hero?.minHeightDesktop ?? 420) : (cfg.hero?.minHeightMobile ?? 300)) + 'px';
    };
    hero.style.backgroundImage = cfg.hero?.backgroundImage ? `url('${cfg.hero.backgroundImage}')` : 'none';
    hero.style.backgroundSize = 'cover'; hero.style.backgroundPosition = 'center';
    if (overlay && cfg.hero?.overlay) overlay.style.background = cfg.hero.overlay;
    applyHero(); addEventListener('resize', applyHero);
  }

  if (titleEl) titleEl.textContent = cfg.brand?.title ?? 'Empreinte de Bois';
  if (logoEl && cfg.brand?.logoSrc) { logoEl.src = cfg.brand.logoSrc; }

  if (subtitle){
    subtitle.textContent = cfg.subtitle?.text ?? '';
    const ornStyle = cfg.subtitle?.ornament ?? 'none';
    if (ornStyle !== 'none'){
      document.querySelectorAll('.subtitle-ornament').forEach(el => el.style.display = 'block');
    }
  }

  setupModal();
  setupAccordion();

  if (typeof window.setupGallery === 'function'){
    window.setupGallery(cfg);
  } else {
    setupGalleryFallback(cfg);
  }
})();