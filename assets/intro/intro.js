/* assets/intro/intro.js — v2 (click-to-start + mobile-safe + new shards)
   Spec (Adam):
   - Overlay fixed, site hidden during intro
   - Start on click, scroll blocked during intro only
   - 3 logos same height in G0, no shards visible
   - Shards apply ONLY to logo-texte
   - Transition texte -> shards only when shards are created (and preferably loaded)
   - Explosion shards 1.5s, then recoil, fade shards
   - Motifs merge border-to-border, then zoom, shockwave
   - Contemplation, fade logos + dim overlay, pause, curtain reveal, then site interactive
*/
(() => {
  const html = document.documentElement;
  const $ = (sel) => document.querySelector(sel);

  const overlay = $("#intro-overlay");
  const siteRoot = $("#site-root");
  if (!overlay || !siteRoot) return;

  const stage = overlay.querySelector(".intro-stage");
  const row = overlay.querySelector(".intro-row");
  const motifL = $("#intro-motif-left-wrap") || $("#intro-motif-left");
  const motifR = $("#intro-motif-right-wrap") || $("#intro-motif-right");
  const texteWrap = $("#intro-texte-wrap");
  const texteImg = $("#intro-texte");
  const shardsWrap = $("#intro-shards");
  const shock = $("#intro-shockwave");

  const SHARDS_META_URL = "assets/intro/shards_meta.json";

  // ---------- helpers ----------
  function commitAnimations(el){
    try{
      const anims = el.getAnimations ? el.getAnimations() : [];
      anims.forEach(a => {
        if (a.commitStyles) a.commitStyles();
        a.cancel();
      });
    }catch(_e){}
  }

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function setReveal(v){
    siteRoot.style.setProperty("--reveal", String(clamp(v, 0, 1)));
  }

  function updateIntroLayout(){
    if (!stage) return;
    const vh = window.innerHeight || 800;
    const vw = window.innerWidth || 1200;
    // Base height for all three logos (same height at start)
    let h = clamp(vh * 0.22, 120, 280);
    // Prevent oversize in landscape mobile
    h = Math.min(h, vw * 0.50);
    stage.style.setProperty("--introH", `${Math.round(h)}px`);
  }

  // Disable scroll/touch during intro
  function lockScroll(){
    html.classList.add("intro-active");
    // force overflow lock even if we temporarily remove intro-active to reveal the site
    const b = document.body;
    if (!b.dataset.__overflowPrev) b.dataset.__overflowPrev = b.style.overflow || "";
    b.style.overflow = "hidden";
    // extra safety on mobile: prevent touchmove
    window.__introTouchBlock = (e) => {
      if (!html.classList.contains("intro-active")) return;
      e.preventDefault();
    };
    window.addEventListener("touchmove", window.__introTouchBlock, { passive: false });
  }
  function unlockScroll(){
    html.classList.remove("intro-active");
    const b = document.body;
    if (b && b.dataset.__overflowPrev !== undefined){
      b.style.overflow = b.dataset.__overflowPrev;
      delete b.dataset.__overflowPrev;
    }
    if (window.__introTouchBlock){
      window.removeEventListener("touchmove", window.__introTouchBlock);
      window.__introTouchBlock = null;
    }
  }

  // Tremble intensity via CSS classes already present
  function trembleWeakText(){
    if (texteImg){
      texteImg.classList.remove("tremble-strong");
      texteImg.classList.add("tremble-soft");
    }
  }
  function trembleStrongText(){
    if (texteImg){
      texteImg.classList.remove("tremble-soft");
      texteImg.classList.add("tremble-strong");
    }
  }
  function trembleNoneText(){
    if (texteImg){
      texteImg.classList.remove("tremble-soft", "tremble-strong");
    }
  }
  function trembleWeakMotifs(){
    [motifL, motifR].filter(Boolean).forEach(el => {
      el.classList.remove("tremble-strong");
      el.classList.add("tremble-soft");
    });
  }
  function trembleStrongMotifs(){
    [motifL, motifR].filter(Boolean).forEach(el => {
      el.classList.remove("tremble-soft");
      el.classList.add("tremble-strong");
    });
  }
  function trembleNoneMotifs(){
    [motifL, motifR].filter(Boolean).forEach(el => el.classList.remove("tremble-soft","tremble-strong"));
  }

  function fadeIn(el, dur=300){
    if (!el) return Promise.resolve();
    el.animate([{opacity:0},{opacity:1}], {duration:dur, easing:"ease", fill:"forwards"});
    return wait(dur+30);
  }
  function fadeOut(el, dur=300){
    if (!el) return Promise.resolve();
    el.animate([{opacity:1},{opacity:0}], {duration:dur, easing:"ease", fill:"forwards"});
    return wait(dur+30);
  }

  async function waitForUserStart(){
    overlay.classList.add("is-waiting");
    // allow click anywhere on overlay
    return new Promise((resolve) => {
      const onStart = () => {
        overlay.classList.remove("is-waiting");
        overlay.removeEventListener("pointerdown", onStart);
        overlay.removeEventListener("keydown", onKey);
        resolve();
      };
      const onKey = (e) => {
        if (e.key === "Enter" || e.key === " "){
          e.preventDefault();
          onStart();
        }
      };
      overlay.addEventListener("pointerdown", onStart, { once: true });
      overlay.addEventListener("keydown", onKey);
      // make focusable to accept key
      overlay.tabIndex = 0;
      overlay.focus({ preventScroll: true });
    });
  }

  // ---------- shards ----------
  async function loadShardsWithTimeout(){
    if (!shardsWrap) return [];

    let meta = null;
    try{
      const res = await fetch(SHARDS_META_URL, { cache: "no-store" });
      meta = await res.json();
    }catch(e){
      console.warn("[intro] shards_meta.json unreadable", e);
      return [];
    }

    const files0 = (meta && meta.files) ? meta.files : [];
    const files = files0.map(f => (f.includes("/") ? f : ("assets/intro/shards/" + f)));

    // Clear existing (safety)
    shardsWrap.innerHTML = "";

    // Create shard <img> nodes now (so DOM is complete even if some never load)
    const imgs = files.map((src, i) => {
      const im = document.createElement("img");
      im.src = src;
      im.alt = "";
      im.decoding = "async";
      im.loading = "eager";
      im.dataset.i = String(i);
      im.style.opacity = "0";
      im.style.transform = "translate(-50%,-50%)";
      shardsWrap.appendChild(im);
      return im;
    });

    // Start loading/decoding, but do not hard-block forever (Adam choice: force)
    const perImg = (im) => new Promise((resolve) => {
      let done = false;
      const finish = (ok) => { if (done) return; done = true; resolve(ok); };
      const t = setTimeout(() => finish(false), 900);
      im.onload = () => { clearTimeout(t); finish(true); };
      im.onerror = () => { clearTimeout(t); finish(false); };
      // if already cached
      if (im.complete && im.naturalWidth > 0) { clearTimeout(t); finish(true); }
    });

    // Wait a short window so most shards appear before G1
    await Promise.race([
      Promise.allSettled(imgs.map(perImg)),
      wait(2500)
    ]);

    // Give paint 2 frames
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    return imgs;
  }

  function showShards(imgs, dur=450){
    imgs.forEach((im) => {
      im.style.opacity = "1";
      im.animate([{opacity:0},{opacity:1}], {duration:dur, easing:"ease", fill:"forwards"});
    });
  }
  function hideShards(imgs, dur=650){
    imgs.forEach((im) => im.animate([{opacity:1},{opacity:0}], {duration:dur, easing:"ease", fill:"forwards"}));
  }

  function explode(imgs, durationMs){
    const maxR = Math.max(window.innerWidth, window.innerHeight) * 1.30;
    imgs.forEach((im, i) => {
      const a = (i * 137.5) * (Math.PI / 180);
      const r = maxR * (0.55 + (i % 9) / 18);
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      im.animate([
        { transform: "translate(-50%,-50%) translate(0px,0px) scale(1)", opacity: 1 },
        { transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(4)`, opacity: 1 }
      ], { duration: durationMs, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    });
  }

  
  // ---------- merge + zoom ----------
  async function mergeMotifsAndZoom(){
    if (!motifL || !motifR || !stage) { await wait(900); return; }

    // Ensure texte is not fighting for space
    if (texteWrap) {
      texteWrap.style.display = "none";
    }

    // Freeze previous animations to avoid jumps
    commitAnimations(motifL);
    commitAnimations(motifR);
    commitAnimations(stage);

    // Read current rects (after recoil animations)
    const rectL = motifL.getBoundingClientRect();
    const rectR = motifR.getBoundingClientRect();

    // If the right motif wrapped to another line, force layout update via scale recalculation
    if (Math.abs(rectL.top - rectR.top) > (Math.min(rectL.height, rectR.height) * 0.25)) {
      updateIntroLayout();
      await new Promise((r) => requestAnimationFrame(r));
    }

    const rL = motifL.getBoundingClientRect();
    const rR = motifR.getBoundingClientRect();

    // Target meeting point = midpoint between inner edges
    const meetX = (rL.right + rR.left) / 2;
    const dxL = meetX - rL.right;
    const dxR = meetX - rR.left;

    const dur = 900;
    const ease = "cubic-bezier(.2,.8,.2,1)";

    const leftAnim = motifL.animate(
      [{ transform: getComputedStyle(motifL).transform === "none" ? "translateX(0px)" : getComputedStyle(motifL).transform },
       { transform: `translateX(${dxL}px)` }],
      { duration: dur, easing: ease, fill: "forwards" }
    );

    const rightAnim = motifR.animate(
      [{ transform: getComputedStyle(motifR).transform === "none" ? "translateX(0px)" : getComputedStyle(motifR).transform },
       { transform: `translateX(${dxR}px)` }],
      { duration: dur, easing: ease, fill: "forwards" }
    );

    // Zoom stage so motifs height ~95% of viewport (use current motif height)
    const vh = window.innerHeight || 800;
    const motifH = Math.max(1, Math.max(rL.height, rR.height));
    const targetScale = clamp((vh * 0.95) / motifH, 1.0, 4.0);

    const zoomAnim = stage.animate(
      [{ transform: getComputedStyle(stage).transform === "none" ? "scale(1)" : getComputedStyle(stage).transform },
       { transform: `scale(${targetScale})` }],
      { duration: dur, easing: ease, fill: "forwards" }
    );

    await Promise.allSettled([leftAnim.finished, rightAnim.finished, zoomAnim.finished]);
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
    // Reveal site with CSS mask, then mark ready
    // Show the site, but keep overflow locked until reveal ends
    html.classList.remove("intro-active");
    html.classList.add("site-revealing");
    setReveal(0);
    await wait(40);

    const dur = 1000;
    const start = performance.now();
    return new Promise((resolve) => {
      function tick(now){
        const t = (now - start) / dur;
        const u = t < 0 ? 0 : t > 1 ? 1 : t;
        const e = 1 - Math.pow(1 - u, 3); // easeOutCubic
        setReveal(e);
        if (u >= 1){
          html.classList.remove("site-revealing");
          html.classList.add("site-ready");
          unlockScroll();
          resolve();
        }else{
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);
    });
  }

  // ---------- main timeline ----------
  async function run(){
    updateIntroLayout();

    // Initial visible state
    trembleWeakMotifs();
    trembleWeakText();

    // Start shards preload in parallel once user clicks
    await waitForUserStart();

    // Ensure layout is correct at the moment we start
    updateIntroLayout();

    // G0: 3 logos visible, tremble, >= 2s, no shards
    if (shardsWrap) shardsWrap.style.opacity = "1"; // container visible, imgs hidden
    await wait(2000);

    // T0: preload shards (in parallel)
    trembleStrongText(); // strong text from T0 until P2
    const shardsPromise = loadShardsWithTimeout();

    // G1: when shards created/mostly loaded -> fade texte -> shards
    const shards = await shardsPromise;

    // Swap texte -> shards
    if (texteImg){
      texteImg.animate([{opacity:1},{opacity:0}], {duration:450, easing:"ease", fill:"forwards"});
    }
    showShards(shards, 450);
    await wait(480);

    // P2: explosion shards (1.5s)
    trembleStrongMotifs(); // motifs stronger during explosion->merge
    explode(shards, 1500);
    await wait(1500);

    // P3: recoil + tremble
    const recoilDur = 1000;
    [motifL, motifR].filter(Boolean).forEach((el, idx) => {
      const dir = idx === 0 ? -1 : 1;
      el.animate([
        { transform: "translateX(0px) scale(1)" },
        { transform: `translateX(${dir * 14}px) scale(0.97)` }
      ], { duration: recoilDur, easing:"ease-in-out", direction:"alternate", iterations:2, fill:"forwards" });
    });
    await wait(recoilDur);

    // T1: fade shards out
    hideShards(shards, 650);
    await wait(680);

    // stop text tremble (text invisible anyway)
    trembleNoneText();

    // P3bis: merge motifs + zoom
    await mergeMotifsAndZoom();

    // P4: shockwave
    shockwave();
    await wait(2500);

    // P5: contemplation 2s
    await wait(2000);

    // P6: fade logos + fade dim
    trembleNoneMotifs();
    overlay.classList.add("is-dim-fade");
    await fadeOutLogos();

    // P7: pause fond seul
    await wait(450);

    // P8: curtain reveal -> show site
    await curtainRevealDown();

    // Remove overlay
    overlay.classList.add("is-fading");
    await wait(700);
    overlay.style.display = "none";
  }

  // init
  lockScroll();
  updateIntroLayout();
  window.addEventListener("resize", updateIntroLayout, { passive: true });

  // Always start fresh (no session logic here)
  run();
})();
