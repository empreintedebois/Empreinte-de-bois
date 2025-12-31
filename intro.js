/* Empreinte-de-bois – Intro animation (v15)
   - Voronoi shards built from assets/intro/voronoi-48-16x9.svg
   - logo-texte shards explode + zoom
   - logo-motif left/right recoil then fuse with shockwave + zoom-to-height
   - arrow-only progression (one-way). After intro, normal scroll is restored.

   Expected assets:
     assets/intro/logo-texte.webp
     assets/intro/logo-motif-left.webp
     assets/intro/logo-motif-right.webp
     assets/intro/voronoi-48-16x9.svg
*/

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);

  const overlay = $('#introOverlay');
  if (!overlay) return;

  const arrow = $('#introArrow');
  const shardsHost = $('#introShards');
  const logoTextImg = $('#introLogoText');
  const motifL = $('#introMotifLeft');
  const motifR = $('#introMotifRight');
  const shock = $('#introShockwave');
  const siteRoot = $('#siteRoot');
  const curtain = $('#revealCurtain');

  // --- Config ---
  const VORONOI_SVG = 'assets/intro/voronoi-48-16x9.svg';
  const MAX_SHARDS = 48; // keep it sane on mobile

  // Timeline (normalized 0..1)
  // t in [0..1] is driven by arrow click/hold (not scroll)
  const SPEED = 0.9; // seconds to reach t=1 when holding (approx)
  const HOLD_ACCEL = 6.0;

  // Key moments
  const T_EXPLODE_START = 0.05;
  const T_MOTIF_RECOIL_START = 0.50;
  const T_SHARDS_FADE_START = 0.75;
  const T_MOTIF_FUSE_START = 0.80;
  const T_MOTIF_FUSE_HIT = 0.93;
  const T_END = 1.00;

  // --- Helpers ---
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInCubic = (t) => t * t * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const now = () => performance.now() / 1000;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function lockScroll() {
    document.documentElement.classList.add('intro-lock');
    document.body.classList.add('intro-lock');
  }
  function unlockScroll() {
    document.documentElement.classList.remove('intro-lock');
    document.body.classList.remove('intro-lock');
  }

  // --- Voronoi parsing ---
  function parseVoronoiPathsFromSVGText(svgText) {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) throw new Error('SVG voronoi invalide');

    const viewBox = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
    const vb = {
      x: viewBox[0] || 0,
      y: viewBox[1] || 0,
      w: viewBox[2] || 1920,
      h: viewBox[3] || 1080,
    };

    // Many voronoi SVGs come as a single <path> with many subpaths.
    const paths = Array.from(doc.querySelectorAll('path'));
    const polys = [];

    for (const p of paths) {
      let d = (p.getAttribute('d') || '').trim();
      if (!d) continue;
      // Robust parsing for "M x,y ... Z" subpaths.
      // We don't rely on explicit "L" (some SVG writers omit it) and we accept commas, minus, scientific notation.
      d = d.replace(/,/g, ' ');
      const subpaths = d.split(/\bM\b/i).map((s) => s.trim()).filter(Boolean);
      for (const sp of subpaths) {
        const beforeZ = sp.split(/\bZ\b/i)[0];
        if (!beforeZ) continue;
        const nums = beforeZ.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
        if (nums.length < 6) continue;
        const pts = [];
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const x = parseFloat(nums[i]);
          const y = parseFloat(nums[i + 1]);
          if (isFinite(x) && isFinite(y)) pts.push([x, y]);
        }
        if (pts.length >= 3) polys.push(pts);
      }
    }

    // Fallback: try polygons
    const polyEls = Array.from(doc.querySelectorAll('polygon'));
    for (const pe of polyEls) {
      const ptsRaw = (pe.getAttribute('points') || '').trim();
      if (!ptsRaw) continue;
      const pts = ptsRaw
        .split(/\s+/)
        .map((pair) => pair.split(',').map(Number))
        .filter((a) => a.length === 2 && isFinite(a[0]) && isFinite(a[1]));
      if (pts.length >= 3) polys.push(pts);
    }

    // Remove the largest polygon if it's the outer border.
    function area(pts) {
      let s = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        s += x1 * y2 - x2 * y1;
      }
      return Math.abs(s) / 2;
    }
    const withArea = polys.map((p) => ({ p, a: area(p) })).sort((a, b) => b.a - a.a);
    if (withArea.length > MAX_SHARDS) {
      // If one is absurdly large (outer), drop it.
      const biggest = withArea[0];
      const second = withArea[1];
      if (second && biggest.a > second.a * 2.2) withArea.shift();
    }
    const selected = withArea.slice(0, MAX_SHARDS).map((x) => x.p);

    // Convert to clip-path polygons in percentage.
    const clips = selected.map((pts) => {
      const pct = pts
        .map(([x, y]) => {
          const px = ((x - vb.x) / vb.w) * 100;
          const py = ((y - vb.y) / vb.h) * 100;
          return `${px.toFixed(3)}% ${py.toFixed(3)}%`;
        })
        .join(', ');
      return `polygon(${pct})`;
    });

    return clips;
  }

  async function buildShards() {
    const res = await fetch(VORONOI_SVG, { cache: 'force-cache' });
    if (!res.ok) throw new Error('Voronoi SVG introuvable');
    const svgText = await res.text();
    const clips = parseVoronoiPathsFromSVGText(svgText);

    shardsHost.innerHTML = '';

    // All shards share the same background image (logo-texte) and are clipped.
    // Each shard is positioned inside a fixed-size "logo box" so background alignment is consistent.
    const frag = document.createDocumentFragment();
    for (let i = 0; i < clips.length; i++) {
      const el = document.createElement('div');
      el.className = 'shard';
      el.style.clipPath = clips[i];
      el.style.webkitClipPath = clips[i];
      // Stable per-shard random.
      const r1 = (Math.sin((i + 1) * 999) + 1) / 2;
      const r2 = (Math.sin((i + 1) * 1337) + 1) / 2;
      const angle = r1 * Math.PI * 2;
      const bias = (r2 - 0.5) * 0.35;
      const dxn = Math.cos(angle) + bias;
      const dyn = Math.sin(angle) + bias;
      el.dataset.dxn = String(dxn);
      el.dataset.dyn = String(dyn);
      el.dataset.rot = String((r2 - 0.5) * 38);
      el.dataset.spin = String((r1 - 0.5) * 120);
      frag.appendChild(el);
    }
    shardsHost.appendChild(frag);
  }

  // --- Layout sizing ---
  function updateLogoBoxSizing() {
    // Keep the logo-texte within safe bounds for all viewports.
    // Goal: always fully visible with some breathing room.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const boxW = Math.min(vw * 0.90, 980);
    const boxH = Math.min(vh * 0.42, 420);
    overlay.style.setProperty('--logoBoxW', `${boxW}px`);
    overlay.style.setProperty('--logoBoxH', `${boxH}px`);

    // Motif target: fill height at fusion moment.
    overlay.style.setProperty('--motifTargetH', `${vh}px`);
  }

  // --- Animation driver ---
  let t = 0;
  let isHolding = false;
  let tVel = 0;
  let startTime = 0;
  let done = false;

  function setArrowVisible(v) {
    arrow.classList.toggle('is-hidden', !v);
  }

  function endIntro() {
    if (done) return;
    done = true;
    setArrowVisible(false);
    overlay.classList.add('is-done');
    unlockScroll();

    // Start reveal curtain immediately (no pause)
    curtain.classList.add('reveal-go');

    // Remove overlay after curtain mostly done to avoid accidental interactions.
    setTimeout(() => {
      overlay.remove();
    }, 1500);
  }

  function applyPhaseTransforms(tt) {
    const shards = shardsHost.querySelectorAll('.shard');

    // Jitter always a bit in phase 0/1
    const jitterAmt = lerp(1.6, 0.6, Math.min(1, tt / 0.35));
    const jx = Math.sin((now() * 11.0) + 1.2) * jitterAmt;
    const jy = Math.cos((now() * 13.0) + 0.7) * jitterAmt;

    // Explosion progress
    const expl = clamp01((tt - T_EXPLODE_START) / (T_SHARDS_FADE_START - T_EXPLODE_START));
    const explE = easeOutCubic(expl);

    // Violent zoom on shards (x4 at end of explosion)
    const zoom = lerp(1.0, 4.0, explE);

    // Overshoot distance so shards leave visible area on all formats.
    const distBase = Math.max(window.innerWidth, window.innerHeight) * 1.25;
    const dist = distBase * explE;

    // Shards fade out around T_SHARDS_FADE_START..T_MOTIF_FUSE_START
    const fade = clamp01((tt - T_SHARDS_FADE_START) / (T_MOTIF_FUSE_START - T_SHARDS_FADE_START));
    const alpha = 1 - easeInOut(fade);

    // Apply to each shard
    shards.forEach((el) => {
      const dxn = parseFloat(el.dataset.dxn || '0');
      const dyn = parseFloat(el.dataset.dyn || '0');
      const rot0 = parseFloat(el.dataset.rot || '0');
      const spin = parseFloat(el.dataset.spin || '0');
      const rot = rot0 + spin * explE;
      const x = dxn * dist + jx;
      const y = dyn * dist + jy;
      el.style.opacity = String(alpha);
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${zoom.toFixed(3)})`;
    });

    // Also apply jitter/zoom to the intact logo image under shards (helps when alpha is low)
    logoTextImg.style.transform = `translate3d(${jx.toFixed(2)}px, ${jy.toFixed(2)}px, 0) scale(${lerp(1, 1.08, explE).toFixed(3)})`;
    logoTextImg.style.opacity = String(alpha);

    // Motifs: tremble strong at start, recoil at T_MOTIF_RECOIL_START, then accelerate inward + zoom-to-height
    const trem = Math.max(0.2, 1 - tt) * 1.6;
    const mtX = Math.sin(now() * 10.7) * trem;
    const mtY = Math.cos(now() * 12.3) * trem;

    const recoilP = clamp01((tt - T_MOTIF_RECOIL_START) / (T_MOTIF_FUSE_START - T_MOTIF_RECOIL_START));
    const recoilE = easeOutCubic(recoilP);

    const fuseP = clamp01((tt - T_MOTIF_FUSE_START) / (T_END - T_MOTIF_FUSE_START));
    const fuseE = easeInCubic(fuseP);

    // Base offsets in vw to keep them around the center line.
    const baseGap = Math.min(window.innerWidth * 0.10, 90);
    const recoilOut = lerp(0, Math.min(window.innerWidth * 0.08, 80), recoilE);
    const inMove = lerp(0, baseGap + recoilOut, fuseE);

    // Zoom motif group to fill height as we fuse (dominant by end)
    const motifZoom = lerp(1.0, 2.25, fuseE); // visual zoom; actual fit comes from CSS height
    overlay.style.setProperty('--motifZoom', motifZoom.toFixed(3));

    motifL.style.transform = `translate3d(${(-recoilOut + inMove + mtX).toFixed(2)}px, ${mtY.toFixed(2)}px, 0)`;
    motifR.style.transform = `translate3d(${(recoilOut - inMove + mtX).toFixed(2)}px, ${mtY.toFixed(2)}px, 0)`;

    // Shockwave at hit moment
    const hit = clamp01((tt - T_MOTIF_FUSE_HIT) / 0.03);
    const hitE = easeOutCubic(hit);
    shock.style.opacity = String(lerp(0, 0.55, hitE));
    shock.style.transform = `translate(-50%, -50%) scale(${lerp(0.25, 2.4, hitE).toFixed(3)})`;
  }

  function rafLoop(ts) {
    if (!startTime) startTime = ts;

    // Drive t
    if (isHolding) {
      tVel = Math.min(1.6, tVel + (HOLD_ACCEL / 60));
    } else {
      tVel = Math.max(0, tVel - (HOLD_ACCEL / 45));
    }

    t += (tVel * (1 / Math.max(0.001, SPEED))) * (1 / 60);
    t = clamp01(t);

    applyPhaseTransforms(t);

    if (t >= 0.999) {
      endIntro();
      return;
    }
    requestAnimationFrame(rafLoop);
  }

  function wireArrow() {
    // hold-to-play on mobile + desktop
    const onDown = (e) => {
      e.preventDefault();
      isHolding = true;
    };
    const onUp = () => {
      isHolding = false;
    };

    arrow.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('blur', onUp, { passive: true });
  }

  async function boot() {
    if (prefersReducedMotion()) {
      // Skip intro
      overlay.remove();
      curtain.classList.add('reveal-go');
      return;
    }

    lockScroll();
    setArrowVisible(true);
    updateLogoBoxSizing();
    await buildShards();

    // Make sure shards align with the logo-texte image.
    const imgUrl = getComputedStyle(logoTextImg).getPropertyValue('--logoTextUrl').trim();
    const shards = shardsHost.querySelectorAll('.shard');
    shards.forEach((s) => {
      s.style.backgroundImage = imgUrl || `url(assets/intro/logo-texte.webp)`;
    });

    wireArrow();
    requestAnimationFrame(rafLoop);
  }

  window.addEventListener('resize', () => {
    updateLogoBoxSizing();
  });

  // Start once DOM is ready + images are likely cached.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
