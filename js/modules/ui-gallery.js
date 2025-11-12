export async function setupGallery(cfg){
  const grid = document.querySelector('.gallery-grid');
  if(!grid) return;

  const res = await fetch('config/galerie-config.json');
  const items = await res.json(); // array of URLs
  grid.setAttribute('aria-busy','true');

  const fragment = document.createDocumentFragment();
  items.forEach((src, idx)=>{
    const img = document.createElement('img');
    img.src = src;
    img.loading = 'lazy';
    img.alt = 'Image ' + (idx+1);
    img.setAttribute('role','listitem');
    fragment.appendChild(img);
  });
  grid.appendChild(fragment);
  grid.setAttribute('aria-busy','false');

  // Navigation buttons (scroll snap style)
  const prev = document.querySelector('.gal-prev');
  const next = document.querySelector('.gal-next');
  const scrollBy = ()=>{
    grid.scrollBy({ left: grid.clientWidth * 0.9, behavior: 'smooth' });
  };
  prev?.addEventListener('click', ()=>{
    grid.scrollBy({ left: -grid.clientWidth * 0.9, behavior: 'smooth' });
  });
  next?.addEventListener('click', scrollBy);

  // Keyboard left/right
  grid.tabIndex = 0;
  grid.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') prev?.click();
    if(e.key === 'ArrowRight') next?.click();
  });

  // Ensure grid doesn't exceed banner zone visually — accomplished via max width and band clip-path
}