(() => {
  const body = document.body;
  const intro = document.getElementById("intro");
  const spacer = document.getElementById("intro-spacer"); // peut exister ou non
  const site = document.getElementById("site");
  const arrow = document.getElementById("scrollArrow");
  const logo = document.getElementById("logoExplode");

  // ---------- FAIL-OPEN (zéro écran noir) ----------
  const failOpen = (why) => {
    try { console.warn("Intro fail-open:", why); } catch(e){}
    try { sessionStorage.setItem("introDone", "1"); } catch(e){}
    try { if (intro) intro.remove(); } catch(e){}
    try { if (spacer) spacer.remove(); } catch(e){}
    try {
      site.classList.remove("site-hidden");
      site.classList.add("site-revealed", "reveal");
      requestAnimationFrame(() => site.classList.add("reveal-on"));
    } catch(e){}
    try { window.removeEventListener("wheel", prevent); } catch(e){}
    try { window.removeEventListener("touchmove", prevent); } catch(e){}
    try { window.removeEventListener("touchstart", onTouchStart); } catch(e){}
  };

  window.addEventListener("error", (e) => failOpen(e?.message || "error"));
  window.addEventListener("unhandledrejection", (e) => failOpen(e?.reason || "promise"));

  // Si déjà passé dans cette session
  if (sessionStorage.getItem("introDone") === "1") {
    if (intro) intro.remove();
    if (spacer) spacer.remove();
    site.classList.remove("site-hidden");
    site.classList.add("site-revealed", "reveal");
    requestAnimationFrame(() => site.classList.add("reveal-on"));
    return;
  }

  if (!intro || !site || !logo) {
    failOpen("missing dom nodes");
    return;
  }

  // ---------- blocage 3 secondes ----------
  let locked = true;
  body.classList.add("intro-lock");

  setTimeout(() => {
    locked = false;
    body.classList.remove("intro-lock");
    if (arrow) arrow.classList.add("is-visible");
  }, 3000);

  // ---------- scroll virtuel (pas de scroll de page pendant l’intro) ----------
  function prevent(e){ e.preventDefault(); }
  window.addEventListener("wheel", prevent, { passive:false });
  window.addEventListener("touchmove", prevent, { passive:false });

  // ---------- timings ----------
  const T_EXPLODE = 1.5;
  const T_FADE = 1.0;     // vers transparence (pas noir)
  const T_PAUSE = 0.5;
  const AUTO_TRIGGER = 0.30; // 30% => auto

  // mapping v -> phases (v 0..1)
  const P_EXP_END = 0.70;   // fin de l'éclatement
  const P_FADE_END = 0.90;  // fin du fade

  let meta = null;
  let pieces = [];

  // progress virtuelle 0..1
  let v = 0;
  let isAuto = false;
  let autoStart = 0;
  let autoV0 = 0;

  function clamp01(x){ return Math.min(1, Math.max(0, x)); }

  // ---------- scale responsive (logo 1200 logique) ----------
  function updateScale(){
    try {
      const box = logo.parentElement.getBoundingClientRect();
      const scale = Math.min(box.width / 1200, box.height / 1200);
      logo.style.setProperty("--logoScale", String(scale));
    } catch(e){}
  }
  window.addEventListener("resize", updateScale);

  // ---------- transform shards ----------
  function apply(vv){
    if (!meta) return;

    const explode = clamp01(vv / P_EXP_END);
    const fade = vv <= P_EXP_END ? 0 : clamp01((vv - P_EXP_END) / (P_FADE_END - P_EXP_END));

    const now = performance.now() / 1000;
    const j = (1 - explode); // jitter diminue quand ça s'ouvre

    for (const el of pieces) {
      const id = el.dataset.pid;
      const info = meta.piecesById[id];
      if (!info) continue;

      const tx = info.dir.x * info.mag * explode;
      const ty = info.dir.y * info.mag * explode;

      // jitter léger (pas random lourd)
      const jx = Math.sin(now * 2.2 + el.__seed) * 1.1 * j;
      const jy = Math.cos(now * 2.0 + el.__seed * 0.7) * 1.1 * j;

      el.style.transform = `translate3d(${tx + jx}px, ${ty + jy}px, 0)`;

      // fade => transparence uniquement
      el.style.opacity = String(1 - fade);
    }
  }

  function startAuto(){
    if (isAuto) return;
    isAuto = true;
    autoStart = performance.now();
    autoV0 = v;
    if (arrow) arrow.classList.remove("is-visible");
  }

  function finish(){
    sessionStorage.setItem("introDone", "1");

    // retirer intro
    intro.remove();
    if (spacer) spacer.remove();

    // révéler site
    site.classList.remove("site-hidden");
    site.classList.add("site-revealed", "reveal");
    requestAnimationFrame(() => site.classList.add("reveal-on"));

    // rendre scroll normal
    window.removeEventListener("wheel", prevent);
    window.removeEventListener("touchmove", prevent);
    window.removeEventListener("touchstart", onTouchStart);
  }

  // ---------- wheel/touch => progression lente ----------
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

  // flèche => déclenche auto à partir du trigger
  if (arrow) {
    arrow.addEventListener("click", () => {
      if (locked) return;
      v = Math.max(v, AUTO_TRIGGER);
      startAuto();
    });
  }

  // ---------- boucle ----------
  function tick(){
    try {
      if (!meta) { requestAnimationFrame(tick); return; }

      // auto à partir de 30% dès que l'utilisateur a “touché”
      if (!locked && !isAuto && v >= AUTO_TRIGGER) startAuto();

      if (isAuto) {
        const t = (performance.now() - autoStart) / 1000;
        const total = T_EXPLODE + T_FADE + T_PAUSE;
        const u = clamp01(t / total);
        v = clamp01(autoV0 + (1 - autoV0) * u);

        apply(v);

        if (t >= total) {
          finish();
          return;
        }
      } else {
        apply(v);
      }

      requestAnimationFrame(tick);
    } catch (err) {
      failOpen(err);
    }
  }

  // ---------- init ----------
  async function init(){
    try {
      // Cache bust simple pour GitHub Pages
      const res = await fetch(`assets/intro/shards_meta.json?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("meta fetch failed: " + res.status);

      meta = await res.json();
      meta.piecesById = {};
      for (const p of meta.pieces) meta.piecesById[p.id] = p;

      pieces = Array.from(document.querySelectorAll(".logo-piece"));
      if (!pieces.length) throw new Error("no pieces found in DOM");

      pieces.forEach((el, idx) => {
        const m = /piece-(p\d+)/.exec(el.id);
        el.dataset.pid = m ? m[1] : "";
        el.__seed = idx + 1;
      });

      // masquer le site tant qu'on n'a pas fini
      site.classList.add("site-hidden");

      updateScale();
      apply(0);

      // écouteurs progression
      window.addEventListener("wheel", onWheel, { passive:false });
      window.addEventListener("touchstart", onTouchStart, { passive:false });
      window.addEventListener("touchmove", onTouchMove, { passive:false });

      // watchdog anti-écran noir (si stuck)
      setTimeout(() => {
        if (sessionStorage.getItem("introDone") !== "1" && site.classList.contains("site-hidden") && !locked) {
          // si au bout de 7s le site est toujours caché, fail-open
          failOpen("watchdog stuck");
        }
      }, 7000);

      requestAnimationFrame(tick);
    } catch (err) {
      failOpen(err);
    }
  }

  init();
})();
