(function(){
  function makeIcon(){
    return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/>      <path d="M7 8h10M7 12h10M7 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  function mount(){
    // Trouve le header existant : essaye <header>, sinon un conteneur .header ou .site-header, sinon body
    var header = document.querySelector('header, .header, .site-header') || document.body;
    // Bouton discret dans le header (ne casse pas la mise en page)
    var btn = document.createElement('button');
    btn.className = 'x-matrix-btn';
    btn.type = 'button';
    btn.innerHTML = makeIcon() + '<span>Matrice</span>';
    // Insertion : en fin de header pour minimiser l'impact sur la grille
    header.appendChild(btn);

    // Panel superposé
    var panel = document.createElement('div');
    panel.className = 'x-panel'; panel.setAttribute('hidden','');
    panel.innerHTML = '<div class="x-backdrop" data-close="1"></div>\
      <div class="x-dialog" role="dialog" aria-modal="true" aria-labelledby="xTitle">\
        <div class="x-head"><h3 id="xTitle" style="margin:0;font:600 14px/1.2 Inter,system-ui,Arial">Matrice de devis</h3>\
          <button type="button" class="x-close" aria-label="Fermer">×</button></div>\
        <div class="x-body"><iframe class="x-frame" src="matrice/matrice.html" loading="lazy" referrerpolicy="no-referrer"></iframe></div>\
      </div>';
    document.body.appendChild(panel);

    var closeBtn = panel.querySelector('.x-close');
    var backdrop = panel.querySelector('.x-backdrop');
    function open(){ panel.hidden = false; document.body.style.overflow = 'hidden'; }
    function close(){ panel.hidden = true; document.body.style.overflow = ''; }
    btn.addEventListener('click', ()=>{ if(panel.hidden) open(); else close(); });
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target.dataset.close) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
