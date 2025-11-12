export function setupModal(){
  const modal = document.getElementById('modal-root');
  const openBtn = document.getElementById('btn-matrice');
  if(!modal || !openBtn) return;
  const content = modal.querySelector('.modal__content');
  const overlay = modal.querySelector('.modal__overlay');
  const closeBtn = modal.querySelector('.modal__close');
  let prevFocus = null;
  const onKey = (e)=>{
    if(e.key === 'Escape') close();
    if(e.key === 'Tab'){
      const f = content.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if(!f.length) return;
      const first = f[0], last = f[f.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  };
  const open = () => { modal.setAttribute('aria-hidden','false'); prevFocus = document.activeElement; setTimeout(()=>closeBtn.focus(), 0); document.addEventListener('keydown', onKey); };
  const close = () => { modal.setAttribute('aria-hidden','true'); document.removeEventListener('keydown', onKey); if (prevFocus) prevFocus.focus(); };
  openBtn.addEventListener('click', open);
  overlay.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if(e.target.dataset.close) close(); });
}