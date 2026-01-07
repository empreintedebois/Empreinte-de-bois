/* assets/intro/intro.js
   Auto intro (no click, no scroll), load-gated shards
   Requirements:
   - Group (left + text + right) = 80% viewport width, all same height, no distortion
   - Text shards appear only when fully loaded
   - Text shards explode slightly BEFORE motifs reunion
   - Scroll locked during intro, restored at end
   - Optional loader bar (4 dots) at bottom during loading
   - Curtain reveal auto 1s after intro ends
*/

(() => {
  "use strict";

  const PATH = {
    shardsMeta: "assets/intro/shards_meta.json",
    shardsDir:  "assets/intro/shards/",   // expects meta.files like "shard_001.webp"
  };

  // timings (ms) – tuned to feel snappy but readable
  const T = {
    baseHoldMin: 2000,          // show 3 logos + tremble (>=2s)
    fadeTextToShards: 500,      // fade logo text -> shards
    pullBackDur: 450,           // motifs move outward
    pullBackDistVW: 10,         // each motif moves outward by 10vw (total 20vw gap effect)
    explodeDelayAfterShardShow: 120, // explosion starts slightly after shards become visible
    explodeDur: 1200,           // shards explosion
    mergeDelayAfterExplode: 220,// merge starts AFTER explosion begins (explode slightly before reunion)
    mergeDur: 900,              // motifs come together
    zoomDur: 900,               // zoom motif pair to ~80% viewport width
    shockwaveDur: 400,
    fadeShardsDur: 550,
    fadeOutOverlay: 550,
    afterIntroToCurtain: 1000,  // curtain auto after intro + 1s
    curtainDur: 1000
  };

  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function lockScroll() {
    document.documentElement.classList.add("intro-lock");
    document.body.classList.add("intro-lock");
    try { window.scrollTo(0, 0); } catch {}
  }
  function unlockScroll() {
    document.documentElement.classList.remove("intro-lock");
    document.body.classList.remove("intro-lock");
  }

  function ensureLoader() {
    if (qs("#intro-loader")) return;
    const el = document.createElement("div");
    el.id = "intro-loader";
    el.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    document.body.appendChild(el);
  }
  function removeLoader() {
    const el = qs("#intro-loader");
    if (el) el.remove();
  }

  function wrapForMotion(imgEl, wrapperId) {
    // Create a wrapper so we can animate wrapper.transform and keep tremble on the img
    const w = document.createElement("div");
    w.id = wrapperId;
    w.style.display = "grid";
    w.style.placeItems = "center";
    w.style.willChange = "transform, opacity";
    w.style.transform = "translateX(0px) scale(1)";
    imgEl.parentNode.insertBefore(w, imgEl);
    w.appendChild(imgEl);
    return w;
  }

  function setTremble(el, mode) {
    el.classList.remove("is-tremble-soft", "is-tremble-strong");
    if (mode === "soft") el.classList.add("is-tremble-soft");
    if (mode === "strong") el.classList.add("is-tremble-strong");
  }

  async function fetchJSON(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`Fetch failed ${r.status}: ${url}`);
    return r.json();
  }

  function preloadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("Image load failed: " + src));
      im.src = src;
    });
  }

  async function loadShardsInto(container) {
    // expects shards_meta.json: { "files": ["shard_001.webp", ...], "count": N }
    const meta = await fetchJSON(PATH.shardsMeta);
    const files = Array.isArray(meta?.files) ? meta.files : [];
    if (!files.length) throw new Error("shards_meta.json: files[] vide ou absent");

    // Preload all shards first (guarantee full set before we show/animate)
    await Promise.all(files.map(f => preloadImage(PATH.shardsDir + f)));

    // Create DOM stacked at same origin (container is absolute/inset)
    container.innerHTML = "";
    const els = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const img = document.createElement("img");
      img.className = "intro-shard";
      img.alt = "";
      img.decoding = "async";
      img.loading = "eager";
      img.src = PATH.shardsDir + f;
      container.appendChild(img);
      els.push(img);
    }
    return els;
  }

  // simple curtain laser effect on existing canvas #intro-curtain
  function runCurtain(canvas, duration) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize();

    const start = performance.now();
    return new Promise(resolve => {
      const tick = (t) => {
        const p = Math.min(1, (t - start) / duration);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        ctx.clearRect(0,0,w,h);

        // scan line
        const y = p * h;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,180,40,0.85)";
        ctx.stroke();

        // glow
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.lineWidth = 16;
        ctx.strokeStyle = "rgba(255,180,40,0.22)";
        ctx.stroke();

        // subtle “burn” band
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, w, y);

        ctx.globalAlpha = 1;

        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  async function main() {
    const overlay = qs("#intro-overlay");
    if (!overlay) return;

    lockScroll();
    ensureLoader();

    const motifL = qs("#intro-motif-left");
    const motifR = qs("#intro-motif-right");
    const texteWrap = qs("#intro-texte-wrap");
    const texteImg = qs("#intro-texte");
    const shardsWrap = qs("#intro-shards");
    const curtain = qs("#intro-curtain");

    // Defensive: hide “tap to start”
    const hint = qs("#intro-start-hint");
    if (hint) hint.style.display = "none";

    // Wrap motifs and texte image for motion (avoid transform conflicts with tremble)
    const motifLWrap = wrapForMotion(motifL, "intro-motif-left-wrap");
    const motifRWrap = wrapForMotion(motifR, "intro-motif-right-wrap");
    const texteImgWrap = wrapForMotion(texteImg, "intro-texte-img-wrap");

    // Ensure wraps don't break layout: inherit size constraints
    motifLWrap.style.height = "var(--intro-logoH)";
    motifRWrap.style.height = "var(--intro-logoH)";
    texteImgWrap.style.height = "100%";

    // tremble initial (soft, all 3)
    setTremble(motifL, "soft");
    setTremble(motifR, "soft");
    setTremble(texteImg, "soft");

    // Start shards loading in parallel
    const t0 = performance.now();
    let shards = [];
    try {
      shards = await loadShardsInto(shardsWrap);
    } catch (e) {
      console.error("[INTRO] shards load failed:", e);
      // Fail open
      overlay.classList.add("is-hidden");
      document.body.classList.add("intro-done");
      removeLoader();
      unlockScroll();
      return;
    }

    // Enforce minimum base hold (>=2s visible)
    const elapsed = performance.now() - t0;
    const remain = Math.max(0, T.baseHoldMin - elapsed);
    if (remain) await sleep(remain);

    // Loader off once shards are ready (we still continue the intro)
    removeLoader();

    // G1: fade text -> shards
    shardsWrap.style.transition = `opacity ${T.fadeTextToShards}ms ease`;
    texteImgWrap.style.transition = `opacity ${T.fadeTextToShards}ms ease`;
    shardsWrap.style.opacity = "1";
    texteImgWrap.style.opacity = "0";
    await sleep(T.fadeTextToShards);

    // Stop text tremble (now invisible)
    setTremble(texteImg, null);

    // Make the text wrap collapse so motifs can meet “border to border”
    // Keep shards visible (absolute in wrap) while collapsing layout width
    texteWrap.style.maxWidth = "0px";
    texteWrap.style.width = "0px";
    texteWrap.style.flex = "0 0 0px";
    texteWrap.style.overflow = "visible"; // shards can still fly out

    // Pull-back motifs outward by 10vw each (20% distance feel)
    const dist = Math.max(20, Math.round(window.innerWidth * (T.pullBackDistVW / 100)));
    motifLWrap.animate(
      [{ transform: "translateX(0px) scale(1)" }, { transform: `translateX(${-dist}px) scale(1)` }],
      { duration: T.pullBackDur, easing: "ease-in-out", fill: "forwards" }
    );
    motifRWrap.animate(
      [{ transform: "translateX(0px) scale(1)" }, { transform: `translateX(${dist}px) scale(1)` }],
      { duration: T.pullBackDur, easing: "ease-in-out", fill: "forwards" }
    );

    // Motifs tremble stronger from now until merge is done
    setTremble(motifL, "strong");
    setTremble(motifR, "strong");

    // Explosion starts slightly AFTER shards become visible (but BEFORE motifs reunion)
    await sleep(T.explodeDelayAfterShardShow);

    const maxX = Math.min(window.innerWidth * 0.45, 560);
    const maxY = Math.min(window.innerHeight * 0.35, 380);

    // Ensure shards are visible before animating
    shards.forEach(el => { el.style.opacity = "1"; el.style.transform = "translate(0px,0px) rotate(0deg) scale(1)"; });

    shards.forEach((el, i) => {
      const n = Math.max(1, shards.length);
      const angle = (i / n) * Math.PI * 2;
      const rx = (0.65 + Math.random() * 0.45) * maxX;
      const ry = (0.65 + Math.random() * 0.45) * maxY;

      const dx = Math.cos(angle) * rx;
      const dy = Math.sin(angle) * ry;
      const rot = (Math.random() * 70 - 35);

      el.animate(
        [
          { transform: "translate(0px,0px) rotate(0deg) scale(1)" },
          { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(1)` }
        ],
        { duration: T.explodeDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
      );
    });

    // Merge starts AFTER explosion begins (this is your requirement)
    await sleep(T.mergeDelayAfterExplode);

    // Merge motifs to center (touch)
    const mergeL = motifLWrap.animate(
      [{ transform: `translateX(${-dist}px) scale(1)` }, { transform: "translateX(0px) scale(1)" }],
      { duration: T.mergeDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );
    const mergeR = motifRWrap.animate(
      [{ transform: `translateX(${dist}px) scale(1)` }, { transform: "translateX(0px) scale(1)" }],
      { duration: T.mergeDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );
    await Promise.all([mergeL.finished, mergeR.finished]);

    // Stop motif tremble (stable after reunion)
    setTremble(motifL, null);
    setTremble(motifR, null);

    // Zoom: stop when motifs alone take ~80% of viewport width
    // Compute bounds of the two motif wrappers
    const rectL = motifLWrap.getBoundingClientRect();
    const rectR = motifRWrap.getBoundingClientRect();
    const pairW = Math.max(1, (rectR.right - rectL.left));
    const targetW = window.innerWidth * 0.80;
    const scale = Math.min(1.9, Math.max(1.0, targetW / pairW));

    const row = qs(".intro-row");
    await row.animate(
      [{ transform: "scale(1)" }, { transform: `scale(${scale})` }],
      { duration: T.zoomDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    ).finished;

    // Shockwave hint
    const shock = qs("#intro-shockwave");
    if (shock) {
      shock.style.opacity = "1";
      shock.animate([{ transform: "scale(0.85)", opacity: 0.0 }, { transform: "scale(1.15)", opacity: 0.0 }],
        { duration: T.shockwaveDur, easing: "ease-out" });
    }

    // Fade shards out (they should not remain)
    shardsWrap.style.transition = `opacity ${T.fadeShardsDur}ms ease`;
    shardsWrap.style.opacity = "0";
    await sleep(T.fadeShardsDur);

    // Fade out overlay and hand over to site
    overlay.style.transition = `opacity ${T.fadeOutOverlay}ms ease`;
    overlay.style.opacity = "0";
    await sleep(T.fadeOutOverlay);

    overlay.classList.add("is-hidden");
    document.body.classList.add("intro-done");
    unlockScroll();

    // Curtain reveal auto after 1s
    if (curtain) {
      await sleep(T.afterIntroToCurtain);
      curtain.classList.add("is-on");
      await runCurtain(curtain, T.curtainDur);
      curtain.classList.remove("is-on");
      // keep canvas in DOM but cleared
      const ctx = curtain.getContext("2d", { alpha: true });
      ctx && ctx.clearRect(0,0,curtain.width,curtain.height);
    }
  }

  window.addEventListener("load", () => {
    main().catch(err => {
      console.error("[INTRO] fatal:", err);
      // Fail open
      const overlay = qs("#intro-overlay");
      if (overlay) overlay.classList.add("is-hidden");
      document.body.classList.add("intro-done");
      removeLoader();
      unlockScroll();
    });
  });
})();
