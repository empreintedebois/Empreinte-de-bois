/* Intro overlay + shards animation (responsive, load-gated)
   Empreinte-de-bois — v31
*/
(() => {
  "use strict";

  const INTRO = {
    // timings (ms)
    G0_HOLD_MIN: 2000,          // hold before shards swap, while preloading
    FADE_IN_ALL: 500,           // clean fade-in once everything ready (logos visible)
    G1_SWAP_FADE: 420,          // fade text -> shards
    P3BIS_PULL_BACK: 450,       // motifs pull-back (outward)
    P3BIS_MERGE: 450,           // motifs merge (touch)
    P3BIS_ZOOM: 700,            // motifs zoom to 80% viewport
    P2_EXPLODE: 1500,
    P4_SHOCK: 420,
    T1_FADE_SHARDS: 520,
    P3_RECOIL: 650,
    P5_CONTEMPLATE: 2000,
    OUTRO_FADE: 500,
    REVEAL_DELAY_AFTER_INTRO: 1000, // auto curtain reveal after intro + 1s
  };

  const SELECTORS = {
    overlay: "#intro-overlay",
    stage: "#intro-stage",
    row: "#intro-row",
    texte: "#intro-texte",
    motifL: "#intro-motif-left",
    motifLImg: "#intro-motif-left-img",
    motifR: "#intro-motif-right",
    motifRImg: "#intro-motif-right-img",
    shards: "#intro-shards",
    loader: "#intro-loader",
    underlay: "#intro-underlay",
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ----- Build overlay (if not present) -----
  function ensureOverlay() {
    let overlay = document.querySelector(SELECTORS.overlay);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "intro-overlay";
    overlay.setAttribute("aria-hidden", "false");

    overlay.innerHTML = `
      <div id="intro-underlay"></div>
      <div id="intro-stage">
        <div id="intro-row">
          <div id="intro-motif-left" class="intro-motif-wrap"><img id="intro-motif-left-img" class="intro-img" src="assets/intro/logo-motif-g.webp" alt=""></div>
          <div id="intro-texte-wrap">
            <img id="intro-texte" class="intro-img" src="assets/intro/logo-texte.webp" alt="Empreinte de bois">
            <div id="intro-shards"></div>
          </div>
          <div id="intro-motif-right" class="intro-motif-wrap"><img id="intro-motif-right-img" class="intro-img" src="assets/intro/logo-motif-d.webp" alt=""></div>
        </div>

        <button id="intro-start" type="button" aria-label="Démarrer">
          <span>Tap to start</span>
        </button>

        <div id="intro-loader" aria-hidden="true">
          <span class="dot d1"></span>
          <span class="dot d2"></span>
          <span class="dot d3"></span>
          <span class="dot d4"></span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  // ----- Scroll lock -----
  function lockScroll(lock) {
    document.documentElement.classList.toggle("intro-lock", !!lock);
    document.body.classList.toggle("intro-lock", !!lock);
  }

  // ----- Layout (responsive, no stretching) -----
  function updateIntroLayout() {
    const stage = document.querySelector(SELECTORS.stage);
    const row   = document.querySelector(SELECTORS.row);
    const imgT  = document.querySelector(SELECTORS.texte);
    const vw = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 0);
    const vh = Math.max(320, window.innerHeight || document.documentElement.clientHeight || 0);

    // target text width: ~80% viewport width (both mobile & desktop), capped so it doesn't become ridiculous
    const maxTextW = vw >= 900 ? 1000 : 0.80 * vw;
    const targetTextW = clamp(0.80 * vw, 240, maxTextW);

    const ratio = (imgT && imgT.naturalWidth > 0) ? (imgT.naturalWidth / imgT.naturalHeight) : (16/9);
    let targetH = targetTextW / ratio;

    // keep a sane height relative to viewport
    targetH = clamp(targetH, 90, 0.33 * vh);

    // define CSS vars for all logos (same height)
    document.documentElement.style.setProperty("--introH", `${targetH}px`);
    document.documentElement.style.setProperty("--introTextW", `${targetTextW}px`);

    // stage scaling: keep everything centered; allow empty margins around
    // we do NOT want a tiny logo on desktop: ensure stage has room and row is centered
    if (stage) {
      stage.style.width = "100%";
      stage.style.height = "100%";
    }
    if (row) {
      row.style.transform = "translate3d(0,0,0) scale(1)";
    }
  }

  // ----- Image / shards preload -----
  function waitImage(img) {
    return new Promise((resolve) => {
      if (!img) return resolve(false);
      if (img.complete && img.naturalWidth > 0) return resolve(true);
      const done = () => resolve(img.naturalWidth > 0);
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  async function preloadCoreImages() {
    const ok1 = await waitImage(document.querySelector(SELECTORS.texte));
    const ok2 = await waitImage(document.querySelector(SELECTORS.motifLImg));
    const ok3 = await waitImage(document.querySelector(SELECTORS.motifRImg));
    return ok1 && ok2 && ok3;
  }

  async function loadShardsStrict({ timeoutMs = 8000 } = {}) {
    const wrap = document.querySelector("#intro-texte-wrap");
    const shardsRoot = document.querySelector(SELECTORS.shards);
    if (!wrap || !shardsRoot) return { ok: false, count: 0 };

    shardsRoot.innerHTML = "";

    let meta;
    try {
      const r = await fetch("assets/intro/shards_meta.json", { cache: "no-store" });
      meta = await r.json();
    } catch (e) {
      return { ok: false, count: 0 };
    }

    const items = Array.isArray(meta?.items) ? meta.items : [];
    if (!items.length) return { ok: false, count: 0 };

    // create shards at identical origin (center), same height as logos; no reposition needed for initial stack
    const created = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = `assets/intro/${it.src}`;
      img.className = "intro-shard";
      img.style.left = "50%";
      img.style.top = "50%";
      img.style.transform = "translate(-50%, -50%)";
      img.style.opacity = "0";
      img.style.willChange = "transform, opacity";
      shardsRoot.appendChild(img);
      created.push(img);
    }

    // strict wait: all shards loaded (or timeout), then show only loaded ones
    const started = performance.now();
    const promises = created.map(waitImage);
    let results = [];
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve("timeout"), timeoutMs));

    const res = await Promise.race([
      Promise.all(promises).then(r => ({ type: "all", r })),
      timeoutPromise
    ]);

    if (res === "timeout") {
      // collect current state
      results = created.map(img => (img.complete && img.naturalWidth > 0));
    } else {
      results = res.r;
    }

    // remove broken shards (so count matches visuals, and no "explode invisible")
    const okImgs = [];
    for (let i = 0; i < created.length; i++) {
      if (results[i]) {
        okImgs.push(created[i]);
      } else {
        created[i].remove();
      }
    }

    return { ok: okImgs.length > 0, count: okImgs.length, elapsed: performance.now() - started };
  }

  // ----- Visual helpers -----
  function setVisible(el, v) {
    if (!el) return;
    el.style.opacity = v ? "1" : "0";
    el.style.pointerEvents = v ? "auto" : "none";
  }

  async function fade(el, to, ms) {
    if (!el) return;
    el.style.transition = `opacity ${ms}ms ease`;
    // force reflow
    el.getBoundingClientRect();
    el.style.opacity = String(to);
    await sleep(ms + 30);
  }

  async function fadeMany(els, to, ms) {
    els.forEach(el => {
      if (!el) return;
      el.style.transition = `opacity ${ms}ms ease`;
      el.getBoundingClientRect();
      el.style.opacity = String(to);
    });
    await sleep(ms + 30);
  }

  // ----- Shards phases -----
  function showAllShards() {
    const nodes = [...document.querySelectorAll("#intro-shards img.intro-shard")];
    nodes.forEach(img => img.style.opacity = "1");
    return nodes;
  }

  async function swapTextToShards() {
    const text = document.querySelector(SELECTORS.texte);
    const shards = showAllShards();
    // fade text out, shards in (they already exist stacked)
    if (text) text.style.transition = `opacity ${INTRO.G1_SWAP_FADE}ms ease`;
    shards.forEach(img => img.style.transition = `opacity ${INTRO.G1_SWAP_FADE}ms ease`);
    // make shards visible now, then fade text
    shards.forEach(img => img.style.opacity = "1");
    if (text) text.style.opacity = "0";
    await sleep(INTRO.G1_SWAP_FADE + 30);
    return shards;
  }

  async function explodeShards(durationMs = INTRO.P2_EXPLODE) {
    const shards = [...document.querySelectorAll("#intro-shards img.intro-shard")];
    const stage = document.querySelector(SELECTORS.stage);
    if (!shards.length || !stage) return;

    const rect = stage.getBoundingClientRect();
    const maxR = Math.min(rect.width, rect.height) * 0.65;

    shards.forEach((img, i) => {
      const a = (i / shards.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const r = maxR * (0.55 + Math.random() * 0.45);
      const tx = Math.cos(a) * r;
      const ty = Math.sin(a) * r;
      const rot = (Math.random() * 2 - 1) * 40;
      img.style.transition = `transform ${durationMs}ms cubic-bezier(.2,.8,.2,1), opacity ${durationMs}ms ease`;
      img.style.transform = `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
    });

    await sleep(durationMs + 30);
  }

  async function fadeOutShards(ms = INTRO.T1_FADE_SHARDS) {
    const shards = [...document.querySelectorAll("#intro-shards img.intro-shard")];
    await fadeMany(shards, 0, ms);
  }

  // ----- Tremblement (shake) -----
  function setShakeLevel(el, level) {
    if (!el) return;
    el.dataset.shake = level; // "none" | "weak" | "strong"
  }

  // ----- Motifs merge + zoom -----
  async function pullBackMotifs() {
    const l = document.querySelector(SELECTORS.motifL);
    const r = document.querySelector(SELECTORS.motifR);
    const li = document.querySelector(SELECTORS.motifLImg);
    const ri = document.querySelector(SELECTORS.motifRImg);
    const vw = Math.max(320, window.innerWidth || 0);
    const offset = vw * 0.20; // 20% of viewport width
    document.documentElement.style.setProperty("--motifPull", `${offset}px`);

    [l, r].forEach(el => {
      if (!el) return;
      el.style.transition = `transform ${INTRO.P3BIS_PULL_BACK}ms ease`;
    });
    if (l) l.style.transform = `translateX(calc(-1 * var(--motifPull)))`;
    if (r) r.style.transform = `translateX(var(--motifPull))`;

    await sleep(INTRO.P3BIS_PULL_BACK + 30);
  }

  async function mergeMotifsTouching() {
    const l = document.querySelector(SELECTORS.motifL);
    const r = document.querySelector(SELECTORS.motifR);
    const li = document.querySelector(SELECTORS.motifLImg);
    const ri = document.querySelector(SELECTORS.motifRImg);
    const textWrap = document.querySelector("#intro-texte-wrap");

    // hide the text wrap (keeps shards layer, but we'll handle shards separately)
    if (textWrap) {
      textWrap.style.transition = `opacity ${INTRO.P3BIS_MERGE}ms ease`;
      textWrap.style.opacity = "0";
    }

    // bring motifs to center (touching)
    // we do it by removing pull-back and setting a small negative gap via translate
    // then we compute final nudge to avoid visible seam.
    [l, r].forEach(el => {
      if (!el) return;
      el.style.transition = `transform ${INTRO.P3BIS_MERGE}ms ease`;
    });

    if (l) l.style.transform = `translateX(0)`;
    if (r) r.style.transform = `translateX(0)`;
    await sleep(INTRO.P3BIS_MERGE + 60);

    // compute touch: move each motif inward by half the current gap between them
    if (l && r) {
      const rl = l.getBoundingClientRect();
      const rr = r.getBoundingClientRect();
      const gap = rr.left - rl.right; // positive if separated
      const nudge = gap > 0 ? gap / 2 : 0;
      const seam = 1; // 1px overlap to avoid hairline
      l.style.transition = `transform 220ms ease`;
      r.style.transition = `transform 220ms ease`;
      l.style.transform = `translateX(${(nudge + seam)}px)`;
      r.style.transform = `translateX(${-(nudge + seam)}px)`;
      await sleep(260);
    }
  }

  async function zoomMergedMotifsTo80() {
    const row = document.querySelector(SELECTORS.row);
    const l = document.querySelector(SELECTORS.motifL);
    const r = document.querySelector(SELECTORS.motifR);
    const li = document.querySelector(SELECTORS.motifLImg);
    const ri = document.querySelector(SELECTORS.motifRImg);
    if (!row || !l || !r) return;

    const vw = Math.max(320, window.innerWidth || 0);
    const vh = Math.max(320, window.innerHeight || 0);
    const desiredW = vw * 0.80;
    const desiredH = vh * 0.80;

    // bounding box of both motifs combined
    const rl = l.getBoundingClientRect();
    const rr = r.getBoundingClientRect();
    const mergedW = (rr.right - rl.left);
    const mergedH = Math.max(rl.height, rr.height);

    let scale = desiredW / mergedW;
    scale = Math.min(scale, desiredH / mergedH);
    scale = clamp(scale, 1.0, 3.0);

    row.style.transformOrigin = "50% 50%";
    row.style.transition = `transform ${INTRO.P3BIS_ZOOM}ms cubic-bezier(.2,.9,.2,1)`;
    // keep it centered while scaling
    row.style.transform = `translate3d(0,0,0) scale(${scale})`;
    await sleep(INTRO.P3BIS_ZOOM + 40);
  }

  // ----- Site reveal (curtain) -----
  async function runCurtainReveal() {
    // Optional: if a canvas/curtain system exists on the page, trigger it.
    // We'll look for a function exported on window: window.startLaserCurtain()
    if (typeof window.startLaserCurtain === "function") {
      try { window.startLaserCurtain(); } catch(e) {}
      return;
    }
    // Fallback: simple CSS mask reveal on #site-root (if present)
    const root = document.querySelector("#site-root");
    if (!root) return;

    root.classList.add("reveal-curtain");
    await sleep(1100);
    root.classList.remove("reveal-curtain");
  }

  // ----- Main intro sequence -----
  async function runIntroSequence() {
    const overlay = document.querySelector(SELECTORS.overlay);
    const underlay = document.querySelector(SELECTORS.underlay);
    const loader = document.querySelector(SELECTORS.loader);
    const startBtn = document.querySelector("#intro-start");

    const imgT = document.querySelector(SELECTORS.texte);
    const wrapL = document.querySelector(SELECTORS.motifL);
    const imgL = document.querySelector(SELECTORS.motifLImg);
    const wrapR = document.querySelector(SELECTORS.motifR);
    const imgR = document.querySelector(SELECTORS.motifRImg);
    const textWrap = document.querySelector("#intro-texte-wrap");

    // show overlay, lock scroll
    lockScroll(true);
    overlay.classList.add("is-active");

    // ensure clean base state
    if (underlay) underlay.style.opacity = "0.80";
    if (textWrap) textWrap.style.opacity = "1";
    if (imgT) imgT.style.opacity = "1";
    if (wrapL) { wrapL.style.transform = "translateX(0)"; }
    if (imgL) { imgL.style.opacity = "1"; }
    if (wrapR) { wrapR.style.transform = "translateX(0)"; }
    if (imgR) { imgR.style.opacity = "1"; }

    // shake levels per latest spec:
    // text: weak during G0, strong during T0..P2, none after
    setShakeLevel(imgT, "weak");
    setShakeLevel(imgL, "weak");
    setShakeLevel(imgR, "weak");

    // loader ON while preloading (core + shards)
    if (loader) loader.classList.add("on");

    // Wait for core images, update layout once available
    await preloadCoreImages();
    updateIntroLayout();

    // Nice fade-in once ready
    await fadeMany([imgT, imgL, imgR], 1, INTRO.FADE_IN_ALL);

    // Start preloading shards in parallel during G0 hold
    const tStart = performance.now();
    const shardsPromise = loadShardsStrict({ timeoutMs: 8000 });

    // hold at least G0_HOLD_MIN
    const remaining = INTRO.G0_HOLD_MIN - (performance.now() - tStart);
    if (remaining > 0) await sleep(remaining);

    // Ensure shards loaded (or timeout) before continuing
    const shardRes = await shardsPromise;

    // loader OFF once shards are ready (or as ready as possible)
    if (loader) loader.classList.remove("on");

    // If no shards loaded, we still continue, but skip shard-specific effects
    const hasShards = shardRes.ok && shardRes.count > 0;

    // T0 -> strong shake on text up to P2
    setShakeLevel(imgT, "strong");

    // G1 swap text -> shards (only if shards exist)
    if (hasShards) {
      await swapTextToShards();
    }

    // P3bis: motifs pull-back then merge + zoom
    await pullBackMotifs();
    await mergeMotifsTouching();
    await zoomMergedMotifsTo80();

    // P2: explode shards (only if shards exist)
    if (hasShards) {
      await explodeShards(INTRO.P2_EXPLODE);
    }

    // P4 shock: small global pulse
    overlay.classList.add("shock");
    await sleep(INTRO.P4_SHOCK);
    overlay.classList.remove("shock");

    // T1 fade shards away (if any), then stop shaking
    if (hasShards) await fadeOutShards(INTRO.T1_FADE_SHARDS);
    setShakeLevel(imgT, "none");
    setShakeLevel(imgL, "none");
    setShakeLevel(imgR, "none");

    // P3 recoil: subtle pull back of whole row
    const row = document.querySelector(SELECTORS.row);
    if (row) {
      row.style.transition = `transform ${INTRO.P3_RECOIL}ms ease`;
      row.style.transform = "translate3d(0, 12px, 0) scale(0.98)";
      await sleep(INTRO.P3_RECOIL + 40);
      row.style.transition = `transform ${INTRO.P3_RECOIL}ms ease`;
      row.style.transform = "translate3d(0,0,0) scale(1)";
      await sleep(INTRO.P3_RECOIL + 40);
    }

    // P5 contemplation
    await sleep(INTRO.P5_CONTEMPLATE);

    // fade out underlay + overlay
    if (underlay) await fade(underlay, 0, INTRO.OUTRO_FADE);
    await fade(overlay, 0, INTRO.OUTRO_FADE);

    // end
    overlay.classList.remove("is-active");
    overlay.style.display = "none";
    lockScroll(false);

    // auto curtain reveal after intro + 1s
    await sleep(INTRO.REVEAL_DELAY_AFTER_INTRO);
    await runCurtainReveal();
  }

  function init() {
    const overlay = ensureOverlay();
    const startBtn = overlay.querySelector("#intro-start");

    // hide overlay until first paint
    overlay.style.opacity = "1";
    overlay.style.display = "block";

    updateIntroLayout();
    window.addEventListener("resize", () => {
      updateIntroLayout();
    }, { passive: true });

    // by default: block interaction/scroll, but require a click/tap to launch
    lockScroll(true);
    startBtn.addEventListener("click", async () => {
      startBtn.disabled = true;
      startBtn.classList.add("hide");
      await runIntroSequence();
    }, { once: true });
  }

  // Start after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
