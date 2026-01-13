// js/app.js
// Point d'entrée unique pour le runtime du site.
// Les modules importés s'auto-initialisent à l'import.

import "./background-canvas.js";
import "./page.js";
import "./gallery.js";

// Share button (mobile share sheet)
const shareBtn = document.getElementById("share-btn");
if (shareBtn){
  shareBtn.addEventListener("click", async () => {
    const url = window.location.href;
    const title = document.title || "Empreinte de Bois";
    if (navigator.share){
      try{
        await navigator.share({ title, url });
        return;
      }catch(_e){}
    }
    try{
      await navigator.clipboard.writeText(url);
      shareBtn.setAttribute("aria-label","Lien copié");
      setTimeout(()=>shareBtn.setAttribute("aria-label","Partager le site"),1200);
    }catch(_e){}
  });
}
