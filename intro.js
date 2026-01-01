/* Empreinte-de-bois Intro v16 (static shards from assets/intro/shards_meta.json)
   - logo-motif-left + logo-texte (shards) + logo-motif-right
   - responsive sizing based on viewport
   - black treated as transparent in provided webp assets
*/
(() => {
  const ASSET_BASE = 'assets/intro';
  const META_URL = `${ASSET_BASE}/shards_meta.json`;
  const LOGO_TEXT_URL = `${ASSET_BASE}/logo-texte.webp`;
  const MOTIF_L_URL = `${ASSET_BASE}/logo-motif-left.webp`;
  const MOTIF_R_URL = `${ASSET_BASE}/logo-motif-right.webp`;

  // Timing (seconds)
  const T = {
    // phase 0 start
    explodeStart: 0.0,
    recoilStart: 0.5,
    shardsFadeStart: 0.75,
    mergeStart: 1.0,
    mergeEnd: 1.9,
    overlayFadeStart: 2.0,
    overlayFadeEnd: 2.35,
    revealStart: 2.0,   // starts right after merge, no pause
    revealEnd: 2.8
  };

  // Motion
  const EXPLODE = {
    duration: 1.0,     // from explodeStart
    zoomTo: 4.0,       // global zoom during explosion
    maxTravel: 1.25,   // as fraction of viewport max(vw,vh)
    rotMaxDeg: 22
  };

  const MOTIF = {
    trembleAmpPx: 6,
    trembleFreqHz: 20,
    recoilPx: 26,
    mergeOvershootPx: 6
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInCubic = (t) => t * t * t;
  const easeInOutCubic = (t) => (t < 0.5) ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

  const rand = (seed) => {
    // simple deterministic RNG (LCG)
    let s = seed >>> 0;
    return () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  function ensureOverlay() {
    let overlay = document.getElementById('intro-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'intro-overlay';
    overlay.innerHTML = `
      <div class="intro-bg"></div>
      <div class="intro-stage" aria-hidden="true">
        <div class="intro-row">
          <img class="intro-motif intro-motif-left" alt="" />
          <div class="intro-textwrap">
            <img class="intro-logo-text-fallback" alt="" />
            <div class="intro-shards" aria-hidden="true"></div>
          </div>
          <img class="intro-motif intro-motif-right" alt="" />
        </div>
        <div class="intro-shockwave" aria-hidden="true"></div>
      </div>
      <button class="intro-skip" type="button">Passer</button>
      <div class="intro-reveal" aria-hidden="true"></div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function setResponsiveSizing(overlay) {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    // The important constraint: logo-motif and logo-texte must share the same HEIGHT base.
    // We set a base height that works on mobile and desktop.
    const baseH = clamp(vh * 0.46, 220, 620); // px
    overlay.style.setProperty('--intro-base-h', `${baseH}px`);

    // Horizontal spacing shrinks on mobile
    overlay.style.setProperty('--intro-gap', `${clamp(vw * 0.02, 8, 22)}px`);
  }

  async function loadMeta() {
    const res = await fetch(META_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Intro meta load failed: ${res.status}`);
    return res.json();
  }

  function buildShards(overlay, meta) {
    const container = overlay.querySelector('.intro-shards');
    container.innerHTML = '';
    const files = meta.files || [];

    // seed based on files length for determinism
    const r = rand(1337 + files.length);
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const travel = Math.max(vw, vh) * EXPLODE.maxTravel;

    // Precompute shard motion targets
    const shardData = files.map((fn, i) => {
      // angle spread with some jitter
      const a = (i / files.length) * Math.PI * 2 + (r() - 0.5) * 0.35;
      const dist = lerp(travel * 0.35, travel * 1.0, Math.pow(r(), 0.55));
      const dx = Math.cos(a) * dist;
      const dy = Math.sin(a) * dist;
      const rot = (r() - 0.5) * 2 * EXPLODE.rotMaxDeg;
      const z = 0.2 + r() * 0.8; // for slight depth ordering
      return { fn, dx, dy, rot, z };
    }).sort((a,b) => a.z - b.z);

    for (const d of shardData) {
      const img = document.createElement('img');
      img.className = 'intro-shard';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = `${ASSET_BASE}/shards/${d.fn}`;
      img.dataset.dx = String(d.dx);
      img.dataset.dy = String(d.dy);
      img.dataset.rot = String(d.rot);
      container.appendChild(img);
    }
    return shardData;
  }

  function showFallbackUntilShards(overlay, visible) {
    const fb = overlay.querySelector('.intro-logo-text-fallback');
    const shards = overlay.querySelector('.intro-shards');
    if (visible) {
      fb.style.opacity = '1';
      shards.style.opacity = '0';
    } else {
      fb.style.opacity = '0';
      shards.style.opacity = '1';
    }
  }

  function startTimeline(overlay) {
    const t0 = performance.now();

    const stage = overlay.querySelector('.intro-stage');
    const row = overlay.querySelector('.intro-row');
    const motifL = overlay.querySelector('.intro-motif-left');
    const motifR = overlay.querySelector('.intro-motif-right');
    const shock = overlay.querySelector('.intro-shockwave');
    const shardsWrap = overlay.querySelector('.intro-shards');
    const reveal = overlay.querySelector('.intro-reveal');

    let finished = false;

    const tick = () => {
      if (finished) return;

      const now = performance.now();
      const t = (now - t0) / 1000;

      // Strong tremble early (T0 -> T1)
      const tremblePhase = clamp(t / T.mergeStart, 0, 1);
      const trembleAmt = (1 - tremblePhase) * MOTIF.trembleAmpPx;
      const tremble = (Math.sin(t * MOTIF.trembleFreqHz * Math.PI * 2) + Math.sin(t * (MOTIF.trembleFreqHz * 0.77) * Math.PI * 2)) * 0.5;
      const trembleX = tremble * trembleAmt;
      const trembleY = Math.cos(t * MOTIF.trembleFreqHz * Math.PI * 2) * trembleAmt * 0.6;

      // Motif recoil starts at 0.5
      let recoil = 0;
      if (t >= T.recoilStart && t < T.mergeStart) {
        const u = clamp((t - T.recoilStart) / (T.mergeStart - T.recoilStart), 0, 1);
        recoil = easeOutCubic(u) * MOTIF.recoilPx;
      }

      // Explosion progress
      let explodeU = 0;
      if (t >= T.explodeStart && t <= (T.explodeStart + EXPLODE.duration)) {
        explodeU = clamp((t - T.explodeStart) / EXPLODE.duration, 0, 1);
      } else if (t > (T.explodeStart + EXPLODE.duration)) {
        explodeU = 1;
      }
      const e = easeOutCubic(explodeU);
      const globalZoom = lerp(1.0, EXPLODE.zoomTo, e);

      // Apply shard transforms (only logo-texte shards)
      const shardImgs = shardsWrap.querySelectorAll('.intro-shard');
      shardImgs.forEach((el) => {
        const dx = parseFloat(el.dataset.dx || '0');
        const dy = parseFloat(el.dataset.dy || '0');
        const rot = parseFloat(el.dataset.rot || '0');
        const tx = dx * e;
        const ty = dy * e;
        const rz = rot * e;
        el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rz}deg) scale(${globalZoom})`;
      });

      // Shards fade out from 0.75 -> 1.0
      let shardAlpha = 1;
      if (t >= T.shardsFadeStart && t < T.mergeStart) {
        const u = clamp((t - T.shardsFadeStart) / (T.mergeStart - T.shardsFadeStart), 0, 1);
        shardAlpha = 1 - easeInOutCubic(u);
      } else if (t >= T.mergeStart) {
        shardAlpha = 0;
      }
      shardsWrap.style.opacity = String(shardAlpha);

      // Motifs: early tremble + recoil
      motifL.style.transform = `translate(${trembleX - recoil}px, ${trembleY}px)`;
      motifR.style.transform = `translate(${trembleX + recoil}px, ${trembleY}px)`;

      // Merge phase: motifs rush to center + zoom to fill height, then shockwave
      if (t >= T.mergeStart && t <= T.mergeEnd) {
        const u = clamp((t - T.mergeStart) / (T.mergeEnd - T.mergeStart), 0, 1);
        const m = easeInCubic(u);

        // bring motifs into center
        const mergeDx = lerp(recoil, -MOTIF.mergeOvershootPx, m);
        motifL.style.transform = `translate(${mergeDx}px, 0px)`;
        motifR.style.transform = `translate(${-mergeDx}px, 0px)`;

        // zoom stage so motif fills viewport height (approx)
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const baseH = parseFloat(getComputedStyle(overlay).getPropertyValue('--intro-base-h')) || (vh*0.46);
        const targetScale = clamp((vh * 0.92) / baseH, 1.0, 3.2);
        const s = lerp(1.0, targetScale, easeInOutCubic(u));
        stage.style.transform = `scale(${s})`;
      } else if (t > T.mergeEnd) {
        // keep stage at final scale
      }

      // Shockwave pulse at mergeEnd
      if (t >= (T.mergeEnd - 0.08) && t <= (T.mergeEnd + 0.28)) {
        const u = clamp((t - (T.mergeEnd - 0.08)) / 0.36, 0, 1);
        const s = lerp(0.2, 2.6, easeOutCubic(u));
        const a = 1 - easeOutCubic(u);
        shock.style.opacity = String(a);
        shock.style.transform = `translate(-50%, -50%) scale(${s})`;
      } else {
        shock.style.opacity = '0';
      }

      // Overlay fade out
      if (t >= T.overlayFadeStart && t <= T.overlayFadeEnd) {
        const u = clamp((t - T.overlayFadeStart) / (T.overlayFadeEnd - T.overlayFadeStart), 0, 1);
        overlay.style.opacity = String(1 - easeInOutCubic(u));
      } else if (t > T.overlayFadeEnd) {
        overlay.style.opacity = '0';
      }

      // Laser-engraving reveal: a bright band sweeping down
      if (t >= T.revealStart && t <= T.revealEnd) {
        const u = clamp((t - T.revealStart) / (T.revealEnd - T.revealStart), 0, 1);
        reveal.style.opacity = '1';
        reveal.style.transform = `translateY(${lerp(-30, 120, u)}vh)`;
      } else if (t > T.revealEnd) {
        reveal.style.opacity = '0';
      }

      if (t > (T.revealEnd + 0.1)) {
        finished = true;
        overlay.remove();
        document.documentElement.classList.remove('intro-lock');
        document.body.classList.remove('intro-lock');
      } else {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  async function init() {
    const overlay = ensureOverlay();

    // lock scroll only during overlay; but keep minimal blocking: allow user to still scroll after merge/fade quickly
    document.documentElement.classList.add('intro-lock');
    document.body.classList.add('intro-lock');

    setResponsiveSizing(overlay);
    window.addEventListener('resize', () => setResponsiveSizing(overlay), { passive: true });

    const motifL = overlay.querySelector('.intro-motif-left');
    const motifR = overlay.querySelector('.intro-motif-right');
    const fb = overlay.querySelector('.intro-logo-text-fallback');
    motifL.src = MOTIF_L_URL;
    motifR.src = MOTIF_R_URL;
    fb.src = LOGO_TEXT_URL;

    // skip button
    overlay.querySelector('.intro-skip').addEventListener('click', () => {
      overlay.remove();
      document.documentElement.classList.remove('intro-lock');
      document.body.classList.remove('intro-lock');
    });

    // load meta + build shards; keep fallback visible until first shard loads
    showFallbackUntilShards(overlay, true);
    let meta;
    try {
      meta = await loadMeta();
    } catch (e) {
      // fallback only, no crash
      console.warn(e);
      startTimeline(overlay);
      return;
    }
    buildShards(overlay, meta);

    // wait first shard decode (best effort)
    const first = overlay.querySelector('.intro-shard');
    if (first && first.decode) {
      try { await first.decode(); } catch (_) {}
    }
    showFallbackUntilShards(overlay, false);

    startTimeline(overlay);
  }

  // Only run on homepage / when intro.js is present
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
