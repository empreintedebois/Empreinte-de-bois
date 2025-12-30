/* Empreinte-de-bois - Intro controller */
(() => {
  'use strict';

  // --- Tunables ---
  const LOCK_MS = 3000;              // hard lock at load
  const EXPLODE_MS = 1500;           // forced explode duration
  const FADE_MS = 1000;              // shards fade-out
  const PAUSE_MS = 500;              // pause between fade and reveal
  const REVEAL_MS = 9000;            // site reveal (8-10s)
  const BASE_ZOOM = 1.0;
  const EXPLODE_ZOOM = 1.35;         // “zoom violent” into the center
  const MAX_EXPLODE = 1.2;           // 120% outward travel multiplier

  // --- Helpers ---
  const $ = (sel, root = document) => root.querySelector(sel);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const now = () => performance.now();
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  // Ensure reload always starts at top (avoids “already exploded after refresh”)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function hardScrollTop() {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  // --- State ---
  let started = false;
  let allowTrigger = false;
  let shardsReady = false;
  let shardNodes = [];
  let shardMeta = []; // { el, vx, vy, rot, cx, cy }
  let rafId = null;

  function lockScroll() {
    document.body.classList.add('intro-locked');
    // prevent iOS rubber-band scroll
    document.addEventListener('touchmove', prevent, { passive: false });
    document.addEventListener('wheel', prevent, { passive: false });
  }

  function unlockScroll() {
    document.body.classList.remove('intro-locked');
    document.removeEventListener('touchmove', prevent);
    document.removeEventListener('wheel', prevent);
  }

  function prevent(e) {
    // allow internal clicks (arrow, etc.), but block scroll gestures while locked
    if (document.body.classList.contains('intro-locked')) e.preventDefault();
  }

  function showArrow(show) {
    const arrow = $('#intro-arrow');
    if (!arrow) return;
    arrow.style.opacity = show ? '1' : '0';
    arrow.style.pointerEvents = show ? 'auto' : 'none';
  }

  function setIntroOpacity(a) {
    const overlay = $('#intro-overlay');
    if (overlay) overlay.style.opacity = String(a);
  }

  function setShardsOpacity(a) {
    const obj = $('#intro-shards');
    if (obj) obj.style.opacity = String(a);
  }

  function setZoom(z) {
    const wrap = $('#intro-logo-wrap');
    if (!wrap) return;
    wrap.style.transform = `translate(-50%, -50%) scale(${z})`;
  }

  function applyExplosion(progress) {
    const p = clamp01(progress);
    const z = BASE_ZOOM + (EXPLODE_ZOOM - BASE_ZOOM) * easeInOut(p);
    setZoom(z);

    // “tremble” at idle is handled in CSS animation on wrapper,
    // but once we start exploding we drive transforms per shard.
    for (let i = 0; i < shardMeta.length; i++) {
      const m = shardMeta[i];
      const t = easeOutCubic(p) * MAX_EXPLODE;
      const dx = m.vx * t;
      const dy = m.vy * t;
      const r = m.rot * t;
      m.el.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${r.toFixed(2)} ${m.cx.toFixed(2)} ${m.cy.toFixed(2)})`);
    }
  }

  function buildShardMeta(svgDoc) {
    // In shards.svg we generate <g class="shard" data-cx data-cy>
    const nodes = Array.from(svgDoc.querySelectorAll('g.shard'));
    shardNodes = nodes;
    if (!nodes.length) return false;

    // determine global center from average of centroids
    let cx = 0, cy = 0;
    const centers = nodes.map((el) => {
      const x = parseFloat(el.getAttribute('data-cx') || '0');
      const y = parseFloat(el.getAttribute('data-cy') || '0');
      cx += x; cy += y;
      return { x, y };
    });
    cx /= centers.length; cy /= centers.length;

    const meta = nodes.map((el, idx) => {
      const c = centers[idx];
      // vector away from center + randomness
      let vx = c.x - cx;
      let vy = c.y - cy;
      const len = Math.hypot(vx, vy) || 1;
      vx /= len; vy /= len;

      // outward distance (px) scaled by viewport; we pick a range so it looks violent on mobile
      const dist = 220 + Math.random() * 480;
      // add angular jitter
      const jitter = (Math.random() - 0.5) * 0.55;
      const ang = Math.atan2(vy, vx) + jitter;
      vx = Math.cos(ang) * dist;
      vy = Math.sin(ang) * dist;

      const rot = (Math.random() - 0.5) * 80; // degrees

      return { el, vx, vy, rot, cx: c.x, cy: c.y };
    });

    shardMeta = meta;
    return true;
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function animate(durationMs, onFrame) {
    return new Promise((resolve) => {
      const t0 = now();
      const tick = () => {
        const t = (now() - t0) / durationMs;
        const p = clamp01(t);
        onFrame(p);
        if (p >= 1) {
          resolve();
          return;
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    });
  }

  async function runSequence() {
    if (started) return;
    started = true;

    // make sure top
    hardScrollTop();

    // Start: explode quickly to 100%
    showArrow(false);
    await animate(EXPLODE_MS, (p) => applyExplosion(p));

    // Fade shards to transparent (not black)
    await animate(FADE_MS, (p) => {
      setShardsOpacity(1 - p);
    });

    await wait(PAUSE_MS);

    // Start reveal AFTER fade is done (your “timer after fade”)
    document.body.classList.add('site-revealing');
    const edge = $('#site-reveal-edge');
    if (edge) edge.style.opacity = '1';

    await animate(REVEAL_MS, (p) => {
      const eased = easeInOut(p);
      // revealTop goes from 100% (hidden) to 0% (fully visible)
      const topPct = (100 - eased * 100).toFixed(2) + '%';
      document.documentElement.style.setProperty('--revealTop', topPct);

      if (edge) {
        // Place the soft “curtain edge” at the reveal line
        edge.style.top = `calc(${(eased * 100).toFixed(2)}vh - 120px)`;
        edge.style.opacity = String(0.9 * (1 - eased * 0.15));
      }
    });

    // End state
    document.body.classList.remove('site-revealing');
    document.body.classList.add('site-ready');
    if (edge) edge.style.opacity = '0';
    setIntroOpacity(0);
    unlockScroll();

    const overlay = $('#intro-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function initIntro() {
    hardScrollTop();
    lockScroll();
    showArrow(false);

    // Make site hidden and ready for reveal
    document.documentElement.style.setProperty('--revealTop', '100%');
    document.body.classList.remove('site-ready');
    document.body.classList.remove('site-revealing');

    // Load shards SVG
    const obj = $('#intro-shards');
    if (!obj) return;

    const onSvgLoad = () => {
      try {
        const svgDoc = obj.contentDocument;
        if (!svgDoc) return;
        shardsReady = buildShardMeta(svgDoc);
        if (!shardsReady) return;

        // reset transforms
        for (const m of shardMeta) m.el.removeAttribute('transform');
        setShardsOpacity(1);
        setIntroOpacity(1);
        setZoom(BASE_ZOOM);

        // Allow trigger after LOCK_MS
        setTimeout(() => {
          allowTrigger = true;
          unlockScroll();     // allow the user gesture to be seen
          lockScroll();       // ...but keep it locked until we trigger sequence
          showArrow(true);
        }, LOCK_MS);

      } catch (e) {
        // If anything fails, do not block the site forever.
        console.error('[intro] SVG init error', e);
        document.body.classList.add('site-ready');
        setIntroOpacity(0);
        unlockScroll();
      }
    };

    // rebind load (works even on bfcache)
    obj.addEventListener('load', onSvgLoad, { once: true });

    // If already loaded (some browsers), call manually
    if (obj.contentDocument) onSvgLoad();

    // Trigger methods
    const trigger = (e) => {
      if (!allowTrigger) return;
      e.preventDefault();
      runSequence();
    };

    const arrow = $('#intro-arrow');
    if (arrow) {
      arrow.addEventListener('click', (e) => {
        if (!allowTrigger) return;
        e.preventDefault();
        runSequence();
      });
    }

    // Wheel / touch / key to trigger
    window.addEventListener('wheel', (e) => {
      if (!allowTrigger) return;
      trigger(e);
    }, { passive: false });

    window.addEventListener('touchstart', (e) => {
      if (!allowTrigger) return;
      trigger(e);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (!allowTrigger) return;
      if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
        runSequence();
      }
    });

    // Avoid partial states when navigating back/forward
    window.addEventListener('pageshow', () => {
      hardScrollTop();
    });
  }

  document.addEventListener('DOMContentLoaded', initIntro, { once: true });
})();
