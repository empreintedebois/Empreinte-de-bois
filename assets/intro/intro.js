/* assets/intro/intro.js — INTRO v24 (responsive + strict gating + full sequence)
   Sequence (macro actions):
   G0: show 3 logos (motif L + texte + motif R) WITHOUT shards, strong tremble (>=2s)
   T0: shards preload in background; when all shards loaded => fade text->shards (G1)
   P2: explode shards (~1.5s) + motifs recoil+shake
   P3: motifs accelerate+merge while camera zooms so motif fills height
   P4: reunite shards to original positions + swap back to logo-texte
   P5: contemplation 2s (full logo visible)
   P6: fade logos, keep dynamic background
   P7: 1s pause with background only
   P8: laser-curtain reveal (1s) then remove overlay, show site
*/

(() => {
  const qs = (s, r=document) => r.querySelector(s);

  const BASE = 'assets/intro';
  const PATHS = {
    left:  `${BASE}/logo-motif-left.webp`,
    right: `${BASE}/logo-motif-right.webp`,
    text:  `${BASE}/logo-texte.webp`,
    meta:  `${BASE}/shards_meta.json`,
    shardsDir: `${BASE}/shards`,
    bg:    `assets/fond/fond-gris-h.webp`,
  };

  const DUR = {
    trembleMin: 2000,
    explode: 1500,
    recoil: 1000,
    merge: 900,
    reunite: 900,
    contemplate: 2000,
    fadeOut: 700,
    bgPause: 1000,
    reveal: 1000,
    bootFade: 500,
  };

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function createOverlay(){
    const ov = document.createElement('div');
    ov.className = 'intro-overlay';
    ov.innerHTML = `
      <div class="intro-bg" aria-hidden="true">
        <div class="bg-layer bg-base"></div>
        <div class="bg-layer bg-glow"></div>
        <div class="bg-layer bg-noise"></div>
      </div>
      <div class="intro-stage" id="intro-stage">
        <div class="intro-logo-row" id="intro-row">
          <img id="intro-motif-left" class="intro-logo intro-motif" alt="" decoding="async" />
          <div class="intro-center">
            <img id="intro-logo-text" class="intro-logo intro-text" alt="" decoding="async" />
            <div id="intro-shards" class="shards-box" aria-hidden="true"></div>
          </div>
          <img id="intro-motif-right" class="intro-logo intro-motif" alt="" decoding="async" />
        </div>
      </div>
      <div class="intro-reveal" id="intro-reveal" aria-hidden="true">
        <div class="laser-head"></div>
      </div>
    `;
    document.body.appendChild(ov);

    // Background assets
    ov.querySelector('.bg-base').style.backgroundImage = `url('${PATHS.bg}')`;
    return ov;
  }

  function loadImage(url){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load ' + url));
      img.src = url;
    });
  }

  async function fetchJSON(url){
    const res = await fetch(url, {cache: 'no-store'});
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    return await res.json();
  }

  function computeLayout(){
    const vw = Math.max(320, window.innerWidth);
    const vh = Math.max(480, window.innerHeight);

    // Aspect ratios
    const arText = 16/9;
    const arMotif = 1/3; // width/height

    // Total width coef: 2*arMotif + arText + gapCoef
    const gapCoef = 0.06;
    const totalCoef = (2*arMotif) + arText + gapCoef;

    let hFromWidth = (vw * 0.95) / totalCoef;
    let hFromHeight = vh * 0.52;
    const h = clamp(Math.min(hFromWidth, hFromHeight), 120, 520);

    const motifW = h * arMotif;
    const textW = h * arText;
    const gap = h * gapCoef;

    return { vw, vh, h, motifW, textW, gap };
  }

  function applyLayout(stage){
    const {h, motifW, textW, gap} = computeLayout();
    stage.style.setProperty('--logoH', `${h}px`);
    stage.style.setProperty('--motifW', `${motifW}px`);
    stage.style.setProperty('--textW', `${textW}px`);
    stage.style.setProperty('--logoGap', `${gap}px`);
  }

  function setVisibility(el, on){
    el.style.opacity = on ? '1' : '0';
    el.style.pointerEvents = on ? 'auto' : 'none';
  }

  function startTremble(row){
    row.classList.add('tremble');
  }
  function stopTremble(row){
    row.classList.remove('tremble');
  }

  function makeShardEl(src){
    const img = document.createElement('img');
    img.className = 'shard';
    img.decoding = 'async';
    img.alt = '';
    img.draggable = false;
    img.src = src;
    return img;
  }

  function getRect(el){
    const r = el.getBoundingClientRect();
    return {x:r.left, y:r.top, w:r.width, h:r.height};
  }

  function randomSigned(){ return (Math.random()*2-1); }

  async function run(){
    const html = document.documentElement;
    html.classList.add('intro-active');

    const overlay = createOverlay();
    const stage = qs('#intro-stage', overlay);
    const row = qs('#intro-row', overlay);
    const imgL = qs('#intro-motif-left', overlay);
    const imgR = qs('#intro-motif-right', overlay);
    const imgT = qs('#intro-logo-text', overlay);
    const shardsBox = qs('#intro-shards', overlay);
    const reveal = qs('#intro-reveal', overlay);

    // Bind assets
    imgL.src = PATHS.left;
    imgR.src = PATHS.right;
    imgT.src = PATHS.text;

    // Layout
    const relayout = () => applyLayout(stage);
    relayout();
    window.addEventListener('resize', relayout);

    // Boot fade so everything appears cleanly
    overlay.style.opacity = '0';
    requestAnimationFrame(() => {
      overlay.style.transition = `opacity ${DUR.bootFade}ms ease`;
      overlay.style.opacity = '1';
    });

    // G0: show logos without shards
    shardsBox.innerHTML = '';
    shardsBox.classList.remove('on');
    setVisibility(imgT, true);

    startTremble(row);

    // Start shards preload in parallel
    let meta, shardUrls = [];
    try {
      meta = await fetchJSON(PATHS.meta);
      const count = Number(meta.count) || 0;
      for (let i=0;i<count;i++) shardUrls.push(`${PATHS.shardsDir}/${String(i).padStart(2,'0')}.webp`);
    } catch(e){
      console.warn('[intro] shards_meta missing/invalid', e);
    }

    // Preload core images first (motifs + text) so they don't pop
    await Promise.allSettled([loadImage(PATHS.left), loadImage(PATHS.right), loadImage(PATHS.text)]);

    const shardLoadTimeout = 12000;
    const shardLoadStart = performance.now();

    let shardOk = false;
    if (shardUrls.length){
      const results = await Promise.allSettled(shardUrls.map(loadImage));
      const ok = results.filter(r => r.status==='fulfilled').length;
      shardOk = ok === shardUrls.length;
      if (!shardOk) console.warn(`[intro] shards loaded ${ok}/${shardUrls.length}`);
    }

    // Ensure tremble lasts at least DUR.trembleMin even if shards load fast
    const elapsed = performance.now() - shardLoadStart;
    if (elapsed < DUR.trembleMin) await sleep(DUR.trembleMin - elapsed);

    // G1: if shards ready -> fade text to shards
    if (shardOk){
      // Build shard elements
      shardsBox.innerHTML = '';
      shardUrls.forEach((u) => shardsBox.appendChild(makeShardEl(u)));
      shardsBox.classList.add('on');

      // Align shardsBox exactly over text image
      // (It already shares the same center box; sizing via CSS vars)

      // Crossfade
      imgT.style.transition = 'opacity 400ms ease';
      shardsBox.style.transition = 'opacity 400ms ease';
      setVisibility(imgT, false);
      shardsBox.style.opacity = '1';
      await sleep(450);
    } else {
      // Stay on text only
      shardsBox.style.opacity = '0';
    }

    // P2: explode shards
    stopTremble(row);

    const shards = Array.from(shardsBox.querySelectorAll('img.shard'));
    const boxRect = getRect(shardsBox);

    // Prime positions so reunite works
    shards.forEach((s) => {
      s.style.position = 'absolute';
      s.style.inset = '0';
      s.style.transform = 'translate3d(0,0,0) rotate(0deg) scale(1)';
      s.dataset.tx0 = '0';
      s.dataset.ty0 = '0';
      s.dataset.r0 = '0';
    });

    // Explosion (only if we have shards)
    if (shards.length){
      const maxTravel = Math.max(boxRect.w, boxRect.h) * 1.6;
      const centerBias = 0.25;

      shards.forEach((s, idx) => {
        const a = (idx / shards.length) * Math.PI*2;
        const jitter = randomSigned() * 0.6;
        const dirx = Math.cos(a) + jitter;
        const diry = Math.sin(a) - 0.2 + randomSigned()*0.5;
        const len = maxTravel * (0.65 + Math.random()*0.55);

        const tx = dirx * len;
        const ty = diry * len;
        const rot = randomSigned() * (30 + Math.random()*60);
        const sc = 1 + Math.random()*0.25;

        s.dataset.tx1 = String(tx);
        s.dataset.ty1 = String(ty);
        s.dataset.r1 = String(rot);
        s.dataset.s1 = String(sc);

        s.style.transition = `transform ${DUR.explode}ms cubic-bezier(.2,.9,.2,1), opacity ${DUR.explode}ms ease`;
        s.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${sc})`;
        s.style.opacity = '1';
      });

      // Fade shards slightly near end so they don't stick in view
      setTimeout(() => {
        shards.forEach((s)=>{ s.style.opacity = '0.0'; });
      }, Math.max(0, DUR.explode - 400));

      // Motifs recoil while shards explode
      row.classList.add('recoil');
      await sleep(DUR.explode);
      row.classList.remove('recoil');
    }

    // P3: motifs merge + strong zoom (motif fills screen height)
    // We zoom the whole row while moving motifs toward center.
    row.classList.add('merge');
    await sleep(DUR.merge);
    row.classList.remove('merge');

    // P4: reunite shards and swap back to logo text
    if (shards.length){
      shards.forEach((s) => {
        s.style.transition = `transform ${DUR.reunite}ms cubic-bezier(.2,.7,.2,1), opacity ${DUR.reunite}ms ease`;
        s.style.transform = 'translate3d(0,0,0) rotate(0deg) scale(1)';
        s.style.opacity = '1';
      });
      await sleep(DUR.reunite);

      // Swap back
      shardsBox.style.transition = 'opacity 350ms ease';
      imgT.style.transition = 'opacity 350ms ease';
      shardsBox.style.opacity = '0';
      setVisibility(imgT, true);
      await sleep(380);
      shardsBox.classList.remove('on');
      shardsBox.innerHTML = '';
    }

    // P5: contemplation
    startTremble(row);
    await sleep(300);
    stopTremble(row);
    await sleep(DUR.contemplate);

    // P6: fade logos out, keep bg
    row.style.transition = `opacity ${DUR.fadeOut}ms ease`;
    row.style.opacity = '0';
    await sleep(DUR.fadeOut + 30);

    // P7: pause on background only
    await sleep(DUR.bgPause);

    // P8: laser curtain reveal
    reveal.classList.add('on');
    await sleep(DUR.reveal);

    // Done
    html.classList.remove('intro-active');
    html.classList.add('intro-done');

    overlay.style.transition = 'opacity 400ms ease';
    overlay.style.opacity = '0';
    await sleep(420);
    overlay.remove();
  }

  // Kick ASAP (works with defer)
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, {once:true});
    } else {
      run();
    }
  } catch(e){
    console.error('[intro] fatal', e);
    document.documentElement.classList.remove('intro-active');
    document.documentElement.classList.add('intro-done');
  }
})();
