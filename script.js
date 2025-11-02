(function(){
  // Header matrix button opens overlay
  const btn = document.getElementById('btnMatrix');
  const panel = document.getElementById('xPanel');
  const closeBtn = panel.querySelector('.x-close');
  const backdrop = panel.querySelector('.x-backdrop');
  function open(){ panel.hidden = false; document.body.style.overflow = 'hidden'; }
  function close(){ panel.hidden = true; document.body.style.overflow = ''; }
  btn.addEventListener('click', ()=>{ panel.hidden ? open() : close(); });
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target.dataset.close) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });

  // Gallery resilient loader
  const grid = document.getElementById('galleryGrid');
  fetch('assets/galerie.json').then(r => r.json()).then(list => {
    list.forEach(item => {
      const card = document.createElement('article');
      card.className = 'card';
      const img = document.createElement('img');
      img.className = 'ph';
      img.alt = item.alt || '';
      img.src = item.src; // keep original path
      img.onerror = () => {
        // fallback placeholder (keeps layout even if image missing)
        const svg = 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800\" height=\"500\"><rect width=\"100%\" height=\"100%\" fill=\"#0f1218\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" fill=\"#5b657d\" font-family=\"Arial\" font-size=\"22\">Aperçu indisponible</text></svg>');
        img.src = svg;
      };
      const meta = document.createElement('div'); meta.className = 'meta';
      meta.innerHTML = '<div class="alt">'+(item.alt||'')+'</div><div>'+item.src+'</div>';
      card.appendChild(img); card.appendChild(meta);
      grid.appendChild(card);
    });
  }).catch(err => {
    const msg = document.createElement('div');
    msg.style.color = '#ffc'; msg.textContent = 'Galerie non disponible.';
    grid.appendChild(msg);
    console.warn('Galerie JSON introuvable:', err);
  });
})();