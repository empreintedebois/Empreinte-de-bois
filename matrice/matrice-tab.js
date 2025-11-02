(function(){
  function mount(){
    const tab = document.createElement('button');
    tab.className = 'x-tab'; tab.type = 'button'; tab.textContent = 'Matrice';
    document.body.appendChild(tab);

    const panel = document.createElement('div');
    panel.className = 'x-panel'; panel.setAttribute('hidden','');
    panel.innerHTML = '<div class="x-backdrop" data-close="1"></div>\
      <div class="x-dialog" role="dialog" aria-modal="true" aria-labelledby="xTitle">\
        <div class="x-head"><h3 id="xTitle" style="margin:0;font:600 14px/1.2 Inter,system-ui,Arial">Matrice de devis</h3>\
          <button type="button" class="x-close" aria-label="Fermer">×</button></div>\
        <div class="x-body"><iframe class="x-frame" src="matrice/matrice.html" loading="lazy"></iframe></div>\
      </div>';
    document.body.appendChild(panel);

    const closeBtn = panel.querySelector('.x-close');
    const backdrop = panel.querySelector('.x-backdrop');
    function open(){ panel.hidden = false; document.body.style.overflow = 'hidden'; }
    function close(){ panel.hidden = true; document.body.style.overflow = ''; }
    tab.addEventListener('click', ()=>{ if(panel.hidden) open(); else close(); });
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target.dataset.close) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();