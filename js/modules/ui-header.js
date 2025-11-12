export function applyHeader(cfg){
  const header = document.getElementById('site-header');
  const body = document.body;
  if(!header) return;
  const isDesktop = () => matchMedia('(min-width:768px)').matches;
  const setHeight = () => {
    const h = isDesktop() ? (cfg.header?.heightDesktop ?? 72) : (cfg.header?.heightMobile ?? 56);
    header.style.minHeight = h + 'px';
    body.style.setProperty('--hdrh', h + 'px');
    body.setAttribute('data-hdrh','1');
  };
  setHeight(); addEventListener('resize', setHeight);
}