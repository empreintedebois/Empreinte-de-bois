/* assets/intro/intro.js — v1.0 (Option A: HTML overlay, intro bloquante)
   Timeline: G0 (>=2s) -> shards preload -> G1 fade texte->shards -> P2 explode (1.5s)
             -> P3 recoil -> T1 fade shards -> P3bis merge motifs + zoom -> P4 shockwave
             -> P5 2s -> P6 fade out -> P7 pause -> P8 curtain reveal (down) -> site ready
*/
(() => {
  const html = document.documentElement;

  const $ = (sel) => document.querySelector(sel);
  const overlay = $("#intro-overlay");
  const siteRoot = $("#site-root");

  // Safety: if any critical node missing, do not block the site.
  if (!overlay || !siteRoot) return;

  html.classList.add("intro-active");

  // Layout: unifie la hauteur des 3 logos pour éviter les débordements mobile/desktop
  const stage = overlay.querySelector(".intro-stage");
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function updateIntroLayout(){
    if (!stage) return;
    const vh = window.innerHeight || 800;
    const vw = window.innerWidth || 1200;
    // base: 22vh, borné, et borné aussi par la largeur pour éviter un logo trop grand en paysage
    let h = clamp(vh * 0.22, 120, 260);
    h = Math.min(h, vw * 0.45);
    stage.style.setProperty("--introH", `${Math.round(h)}px`);
  }
  updateIntroLayout();
  window.addEventListener("resize", () => {
    // Ne pas recalculer en plein milieu des animations lourdes
    if (!html.classList.contains("site-ready")) updateIntroLayout();
  });

  const motifL = $("#intro-motif-left");
  const motifR = $("#intro-motif-right");
  const texteImg = $("#intro-texte");
  const shardsWrap = $("#intro-shards");
  const shock = $("#intro-shockwave");

  const SHARDS_META_URL = "assets/intro/shards_meta.json";

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function setReveal(v){
    siteRoot.style.setProperty("--reveal", String(clamp(v, 0, 1)));
  }

  // Tremble states
  function trembleWeak(){
    if (motifL) motifL.classList.add("tremble-soft");
    if (motifR) motifR.classList.add("tremble-soft");
    if (texteImg) texteImg.classList.add("tremble-soft");
  }
  function trembleStrongText(){
    if (texteImg){
      texteImg.classList.remove("tremble-soft");
      texteImg.classList.add("tremble-strong");
    }
  }
  function trembleStrongMotifs(){
    if (motifL){
      motifL.classList.remove("tremble-soft");
      motifL.classList.add("tremble-strong");
    }
    if (motifR){
      motifR.classList.remove("tremble-soft");
      motifR.classList.add("tremble-strong");
    }
  }
  function stopAllTremble(){
    [motifL, motifR, texteImg].forEach(el => {
      if (!el) return;
      el.classList.remove("tremble-soft","tremble-strong");
    });
  }

  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function loadShards(){
    let meta;
    try{
      const res = await fetch(SHARDS_META_URL, { cache: "no-store" });
      meta = await res.json();
    }catch(e){
      console.warn("[intro] shards_meta.json unreadable", e);
      return [];
    }
    const files0 = (meta && meta.files) ? meta.files : [];
    const files = files0.map(f => (f.includes('/') ? f : ('assets/intro/shards/' + f)));
    const loaded = [];

    // Preload all images (network)
    await Promise.all(files.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    })));

    // Create shard imgs in DOM (all share same origin: center)
    files.forEach((src, i) => {
      const im = document.createElement("img");
      im.src = src;
      im.alt = "";
      im.dataset.i = String(i);
      im.style.opacity = "0";
      im.style.transform = "translate(-50%,-50%)";
      shardsWrap.appendChild(im);
      loaded.push(im);
    });

    // Wait for decode/paint to ensure every shard is drawable before the timeline continues
    const waitDecode = (im) => {
      if (!im) return Promise.resolve();
      if (im.decode) return im.decode().catch(() => new Promise((r) => (im.onload = () => r())));
      return new Promise((r) => (im.onload = () => r()));
    };
    await Promise.all(loaded.map(waitDecode));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    return loaded;
  }

  function explode(shards, durationMs){
    const maxR = Math.max(window.innerWidth, window.innerHeight) * 1.25;
    shards.forEach((im, i) => {
      // deterministic-ish pseudo random vector
      const a = (i * 137.5) * (Math.PI/180);
      const r = maxR * (0.55 + (i % 7) / 14);
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      im.animate([
        { transform: "translate(-50%,-50%) translate(0px,0px) scale(1)", opacity: 1 },
        { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(4)`, opacity: 1 }
      ], { duration: durationMs, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    });
  }

  function fadeOut(shards, durationMs){
    shards.forEach((im) => {
      im.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], { duration: durationMs, easing: "ease", fill: "forwards" });
    });
  }

  async function mergeMotifsAndZoom(){
    // Move motifs toward each other so they touch (no overlap), then zoom
    if (!motifL || !motifR) {
      await wait(900);
      return;
    }

    const dur = 900;
    const ease = "cubic-bezier(.2,.8,.2,1)";

    // Gap between motifs at the moment we start merging
    const rectL = motifL.getBoundingClientRect();
    const rectR = motifR.getBoundingClientRect();
    const gap = rectR.left - rectL.right;

    // If negative gap (already overlapping), keep a small separation instead of pushing more
    const safeGap = Math.max(gap, 16);
    const dx = safeGap / 2;

    const leftAnim = motifL.animate([
      { transform: "translateX(0px) scale(1)" },
      { transform: `translateX(${dx}px) scale(3.8)` }
    ], { duration: dur, easing: ease, fill: "forwards" });

    const rightAnim = motifR.animate([
      { transform: "translateX(0px) scale(1)" },
      { transform: `translateX(${-dx}px) scale(3.8)` }
    ], { duration: dur, easing: ease, fill: "forwards" });

    // Hide texte (already faded earlier)
    if (texteImg){
      texteImg.animate([{ opacity: 0 }, { opacity: 0 }], { duration: dur, fill:"forwards" });
    }

    await wait(dur);
    leftAnim.cancel();
    rightAnim.cancel();
  }

    await wait(dur);
    if (leftAnim) leftAnim.cancel();
    if (rightAnim) rightAnim.cancel();
  }

  function shockwave(){
    if (!shock) return;
    shock.animate([
      { opacity: 0, transform: "translate(-50%,-50%) scale(0.2)" },
      { opacity: 1, transform: "translate(-50%,-50%) scale(1.0)" },
      { opacity: 0, transform: "translate(-50%,-50%) scale(9.0)" }
    ], { duration: 650, easing: "ease-out", fill: "forwards" });
  }

  async function fadeOutLogos(){
    const els = [motifL, motifR, texteImg].filter(Boolean);
    els.forEach(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing:"ease", fill:"forwards" }));
    await wait(720);
  }

  async function curtainRevealDown(){
    // Make site visible but masked, then animate mask down
    html.classList.remove("intro-active");
    html.classList.add("site-revealing");
    setReveal(0);
    // start a tiny bit later (few ms)
    await wait(40);

    const dur = 1000;
    const start = performance.now();
    return new Promise((resolve) => {
      function tick(now){
        const t = (now - start) / dur;
        const e = t < 0 ? 0 : t > 1 ? 1 : (1 - Math.pow(1 - t, 3)); // easeOutCubic
        setReveal(e);
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  async function run(){
    // Initial state
    trembleWeak();
    // Hide shards until ready
    if (shardsWrap) shardsWrap.setAttribute("aria-hidden","true");

    // G0 : 2s contemplation
    await wait(2000);

    // T0: preload shards
    const shards = await loadShards();
    // Barrière: s'assurer que tous les shards sont bien présents avant la transition
    if (shards && shards.length){
      await new Promise((r)=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      // force opacity baseline (évite le cas "quelques shards seulement")
      shards.forEach(im => { im.style.opacity = "0"; });
    }

    // G1: fade texte -> shards (only when shards ready)
    if (texteImg) texteImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing:"ease", fill:"forwards" });
    shards.forEach(im => {
      im.style.opacity = "1";
      im.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing:"ease", fill:"forwards" });
    });
    if (shardsWrap) shardsWrap.setAttribute("aria-hidden","false");

    // Strong tremble on text until P2
    trembleStrongText();

    await wait(500);

    // P2 explode shards 1.5s
    explode(shards, 1500);
    // motifs strong tremble during explosion -> merge
    trembleStrongMotifs();
    await wait(1500);

    // P3 recoil (1s) — small push back
    const recoilDur = 1000;
    [motifL, motifR].filter(Boolean).forEach((el, idx) => {
      const dir = idx === 0 ? -1 : 1;
      el.animate([
        { transform: "translateX(0px) scale(1)" },
        { transform: `translateX(${dir * 14}px) scale(0.97)` }
      ], { duration: recoilDur, easing:"ease-in-out", direction:"alternate", iterations:2, fill:"forwards" });
    });
    await wait(recoilDur);

    // T1 fade shards out
    fadeOut(shards, 650);
    await wait(680);

    // stop text tremble (text is invisible anyway)
    if (texteImg) texteImg.classList.remove("tremble-strong","tremble-soft");

    // P3bis merge motifs + zoom
    await mergeMotifsAndZoom();

    // P4 shockwave
    shockwave();
    await wait(650);

    // P5 contemplation 2s
    await wait(2000);

    // P6 fade out logos
    stopAllTremble();
    await fadeOutLogos();

    // P7 pause fond seul (still overlay present but empty)
    await wait(350);

    // Fade overlay itself out
    overlay.classList.add("is-fading");
    await wait(700);

    // P8 reveal site with curtain down
    await curtainRevealDown();
    html.classList.remove("site-revealing");
    html.classList.add("site-ready");

    // Remove overlay from DOM to avoid blocking
    overlay.remove();
  }

  // Start immediately (works even if DOMContentLoaded already passed)
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", run, { once: true });
  }else{
    run();
  }
})();