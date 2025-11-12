export function applyHeader(cfg){
  const header = document.getElementById('site-header');
  if(!header) return;

  // Heights from config
  const isDesktop = () => window.matchMedia('(min-width:768px)').matches;
  const setHeight = () => {
    const h = isDesktop() ? cfg.header.heightDesktop : cfg.header.heightMobile;
    header.style.minHeight = h + 'px';
    document.body.style.setProperty('--hdrh', h + 'px');
    document.body.setAttribute('data-hdrh','1');
    document.documentElement.style.setProperty('--hdr-opacity', cfg.header.opacity);
    document.documentElement.style.setProperty('--hdr-shadow', cfg.header.shadow);
  };
  setHeight();
  window.addEventListener('resize', setHeight);
}