document.addEventListener('DOMContentLoaded', () => {
  // Modal open/close
  (function(){
    const openBtn  = document.querySelector('.matrice-open');
    const modal    = document.getElementById('matrice-modal');
    const closeBtn = modal ? modal.querySelector('.modal-close') : null;
    const backdrop = modal ? modal.querySelector('.modal-backdrop') : null;

    function openModal(){
      if (!modal) return;
      modal.hidden = false;
      document.body.classList.add('modal-open');
    }
    function closeModal(){
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove('modal-open');
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', (e)=>{ if(e.target.dataset.close) closeModal(); });

    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
    });
  })();
});
