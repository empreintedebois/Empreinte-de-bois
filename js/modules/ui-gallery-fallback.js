export function setupGalleryFallback(cfg){
  const grid = document.querySelector('.gallery-grid');
  if(!grid) return;
  grid.setAttribute('aria-busy','true');
  fetch('config/galerie-config.json').then(r=>r.json()).then(items=>{
    const frag = document.createDocumentFragment();
    (items || []).forEach((src, idx)=>{
      const img = document.createElement('img');
      img.src = src; img.loading = 'lazy'; img.alt = `Image ${idx+1}`; img.setAttribute('role','listitem');
      frag.appendChild(img);
    });
    grid.appendChild(frag); grid.setAttribute('aria-busy','false');
  });
  const prev = document.querySelector('.gal-prev'); const next = document.querySelector('.gal-next');
  prev?.addEventListener('click', ()=>{ grid.scrollBy({ left: -grid.clientWidth * 0.9, behavior: 'smooth' }); });
  next?.addEventListener('click', ()=>{ grid.scrollBy({ left: grid.clientWidth * 0.9, behavior: 'smooth' }); });
  grid.tabIndex = 0;
  grid.addEventListener('keydown', (e)=>{ if(e.key === 'ArrowLeft') prev?.click(); if(e.key === 'ArrowRight') next?.click(); });
  const band = document.getElementById('galerie');
  if (band && cfg?.blocks?.gallery){
    const g = cfg.blocks.gallery;
    band.style.setProperty('--clip-top', g.angleTop || '8%');
    band.style.setProperty('--clip-btm', g.angleBottom || '8%');
    if (g.clipOblique === false){ band.style.clipPath = 'none'; }
    band.style.background = g.background || '#fff';
  }
}