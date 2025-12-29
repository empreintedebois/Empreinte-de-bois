(() => {
  const body = document.body;
  const intro = document.getElementById("intro");
  const site = document.getElementById("site");
  const arrow = document.getElementById("scrollArrow");
  const logo = document.getElementById("logoExplode");

  const KEY = "introDone_v4"; // nouvelle clé -> évite les états cassés
  const LOCK_MS = 3000;

  const failOpen = (why) => {
    try { console.warn("Intro fail-open:", why); } catch(e){}
    try { body.classList.remove("intro-lock"); } catch(e){}
    try {
      setTimeout(() => {
        try { site?.classList.remove("site-hidden"); } catch(e){}
        try { document.getElementById("reveal-curtain")?.remove(); } catch(e){}
        try { unlockScroll?.(); } catch(e){}
        try { intro?.remove(); } catch(e){}
      }, 100);
    } catch(e){}
  };

  window.addEventListener("error", (e) => failOpen(e?.message || "error"));
  window.addEventListener("unhandledrejection", (e) => failOpen(e?.reason || "promise"));

  
  // v6: force intro to run every time
  try{ site.classList.add('site-hidden'); }catch(e){}
  try{ body.classList.add('intro-lock'); }catch(e){}
  if (!intro || !site || !logo) { failOpen("missing nodes"); return; }

  // Si déjà fait
    intro.remove();
    site.classList.remove("site-hidden");
    return;
  }

  // --- bloque scroll 3s ---
  let locked = true;
  body.classList.add("intro-lock");
  setTimeout(() => {
    locked = false;
    body.classList.remove("intro-lock");
    arrow?.classList.add("is-visible");
  }, LOCK_MS);

  // --- scroll virtuel (évite la barre d'adresse qui saute) ---
  function prevent(e){ e.preventDefault(); }
  function lockScroll(){
    window.addEventListener("wheel", prevent, { passive:false });
    window.addEventListener("touchmove", prevent, { passive:false });
  }
  function unlockScroll(){
    try { body.classList.remove("intro-lock"); } catch(e){}

    window.removeEventListener("wheel", prevent);
    window.removeEventListener("touchmove", prevent);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("wheel", onWheel);
  }
  lockScroll();

  // --- scale sans flash: on calcule puis on affiche l'intro ---
  function updateScale(){
    try{
      const box = logo.parentElement.getBoundingClientRect();
      const scale = Math.min(box.width / 1200, box.height / 1200);
      logo.style.setProperty("--logoScale", String(scale));
    }catch(e){}
  }
  updateScale();
  requestAnimationFrame(() => {
    updateScale();
    intro.classList.add("intro-ready");
  });
  // micro warmup (1s max)
  let warmFrames = 0;
  const warm = () => {
    warmFrames++;
    updateScale();
    if (warmFrames < 30) requestAnimationFrame(warm);
  };
  requestAnimationFrame(warm);

  // --- meta + pièces ---
  let meta = null;
  let pieces = [];

  // progress virtuelle
  let v = 0;            // 0..1
  let isAuto = false;
  let autoStart = 0;
  let autoV0 = 0;

  // timings
  const AUTO_TRIGGER = 0.30;
  const T_EXPLODE = 1.5;
  const T_FADE = 1.0;
  const T_PAUSE = 0.5;
  const P_EXP_END = 0.70;
  const P_FADE_END = 0.90;

  const clamp01 = (x) => Math.min(1, Math.max(0, x));

  function apply(vv){
    if (!meta) return;
    const explode = clamp01(vv / P_EXP_END);
    const fade = vv <= P_EXP_END ? 0 : clamp01((vv - P_EXP_END) / (P_FADE_END - P_EXP_END));

    const now = performance.now() / 1000;
    const j = (1 - explode);

    for (const el of pieces){
      const id = el.dataset.pid;
      const info = meta.piecesById[id];
      if (!info) continue;

      const tx = info.dir.x * info.mag * explode;
      const ty = info.dir.y * info.mag * explode;

      const jx = Math.sin(now * 2.2 + el.__seed) * 1.1 * j;
      const jy = Math.cos(now * 2.0 + el.__seed * 0.7) * 1.1 * j;

      el.style.transform = `translate3d(${tx + jx}px, ${ty + jy}px, 0)`;
      el.style.opacity = String(1 - fade);
    }
  }

  function startAuto(){
    if (isAuto) return;
    isAuto = true;
    autoStart = performance.now();
    autoV0 = v;
    arrow?.classList.remove("is-visible");
  }

  function finish(){
    try { body.classList.remove("intro-lock"); } catch(e){}


    // L'intro disparaît (fond canvas reste en place => pas de saut)
    intro.remove();

    // Reveal du site avec rideau doux
    site.classList.remove("site-hidden");
    const curtain = document.getElementById("reveal-curtain");
    if (curtain) {
      // démarre légèrement après la fin de fade (tu peux ajuster si besoin)
      requestAnimationFrame(() => curtain.classList.add("reveal-on"));
      setTimeout(() => curtain.remove(), 1900);
    }

    unlockScroll();

    // Empêche de remonter vers l'intro: on force un léger scroll et on nettoie
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  }

  // input
  function onWheel(e){
    if (locked || isAuto) return;
    const delta = Math.max(-60, Math.min(60, e.deltaY));
    v = clamp01(v + delta / 2600);
  }

  let touchY = null;
  function onTouchStart(e){
    if (locked || isAuto) return;
    touchY = e.touches?.[0]?.clientY ?? null;
  }
  function onTouchMove(e){
    if (locked || isAuto || touchY === null) return;
    const y = e.touches?.[0]?.clientY ?? touchY;
    const dy = touchY - y;
    touchY = y;
    const delta = Math.max(-40, Math.min(40, dy));
    v = clamp01(v + delta / 1800);
  }

  arrow?.addEventListener("click", () => {
    if (locked) return;
    v = Math.max(v, AUTO_TRIGGER);
    startAuto();
  });

  function tick(){
    try{
      if (!meta){ requestAnimationFrame(tick); return; }

      if (!locked && !isAuto && v >= AUTO_TRIGGER) startAuto();

      if (isAuto){
        const t = (performance.now() - autoStart) / 1000;
        const total = T_EXPLODE + T_FADE + T_PAUSE;
        const u = clamp01(t / total);
        v = clamp01(autoV0 + (1 - autoV0) * u);
        apply(v);
        if (t >= total){ finish(); return; }
      } else {
        apply(v);
      }

      requestAnimationFrame(tick);
    } catch(err){
      failOpen(err);
    }
  }

  async function init(){
    try{
      const res = await fetch(`assets/intro/shards_meta.json?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("meta fetch failed: " + res.status);
      meta = await res.json();
      meta.piecesById = {};
      for (const p of meta.pieces) meta.piecesById[p.id] = p;

      pieces = Array.from(document.querySelectorAll(".logo-piece"));
      if (!pieces.length) throw new Error("no pieces in DOM");

      pieces.forEach((el, idx) => {
        // Priorité de décodage/chargement (mobile)
        try { el.loading = 'eager'; el.decoding = 'async'; if (idx < 6) el.fetchPriority = 'high'; } catch(e){}

        const m = /piece-(p\\d+)/.exec(el.id);
        el.dataset.pid = m ? m[1] : "";
        el.__seed = idx + 1;
      });

      // masque le site pendant intro
      site.classList.add("site-hidden");

      // écouteurs
      window.addEventListener("wheel", onWheel, { passive:false });
      window.addEventListener("touchstart", onTouchStart, { passive:false });
      window.addEventListener("touchmove", onTouchMove, { passive:false });
      window.addEventListener("resize", updateScale);

      // watchdog anti-écran figé
      setTimeout(() => {
          // si après 8s le site est toujours caché, on fail-open
          failOpen("watchdog stuck");
        }
      }, 8000);

      apply(0);
      requestAnimationFrame(tick);
    } catch(err){
      failOpen(err);
    }
  }

  init();
})();