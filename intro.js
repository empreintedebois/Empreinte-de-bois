(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const body = document.body;
  const intro = $('#introOverlay');
  const arrow = $('#introArrow');
  const obj = $('#introSvgObj');
  const logoWrap = $('#introLogoWrap');
  const siteRoot = $('#siteRoot');
  const revealMask = $('#site-reveal-mask');
  const revealEdge = $('#site-reveal-edge');

  if (!intro || !obj || !siteRoot) return;

  // ---- config ----
  const START_LOCK_MS = 0;          // no forced wait
  const EXPLODE_DIST = 520;       // outward distance at progress=1
  const ZOOM_MAX = 3;              // zoom 1..4 during explosion
  const FADE_MS = 1000;           // shards fade to transparent
  const WAIT_BEFORE_REVEAL_MS = 0; // no extra wait (reveal starts after fade)
  const REVEAL_MS = 9000;         // 8-10s, choose 9s
  const EDGE_SOFTNESS = 0.22;     // edge height fraction of viewport (for softness)

  // ---- state ----
  let shards = [];
  let shardMeta = [];
  let progress = 0;               // 0..1
  let targetProgress = 0;
  let ready = false;
  let completed = false;
  let rafId = null;
  let lastT = 0;
  let touchY = null;

  function lockScroll() {
    document.documentElement.classList.add('intro-lock');
    body.classList.add('intro-lock');
    document.documentElement.classList.add('reveal-lock');
    body.classList.add('reveal-lock');
    window.scrollTo(0, 0);
  }
  function unlockScroll() {
    document.documentElement.classList.remove('intro-lock');
    body.classList.remove('intro-lock');
    document.documentElement.classList.remove('reveal-lock');
    body.classList.remove('reveal-lock');
  }

  lockScroll();

  // Ensure site is hidden behind reveal until we start revealing.
  siteRoot.style.clipPath = 'inset(0 0 100% 0)';
  siteRoot.style.willChange = 'clip-path';
  revealMask.classList.add('is-on');
  revealEdge.classList.add('is-on');

  function setReveal(p) {
    // p: 0..1
    const bottom = Math.max(0, 100 - (p * 100));
    siteRoot.style.clipPath = `inset(0 0 ${bottom}% 0)`;

    const y = window.innerHeight * p;
    const edgeH = window.innerHeight * EDGE_SOFTNESS;
    revealEdge.style.top = `${Math.max(-edgeH/2, y - edgeH/2)}px`;
    revealEdge.style.height = `${edgeH}px`;
    revealEdge.style.opacity = p === 0 ? '0' : '0.85';
  }

  function easeOutCubic(x){ return 1 - Math.pow(1 - x, 3); }

  function updateShards(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    // smooth progress
    const k = 10; // responsiveness
    progress += (targetProgress - progress) * (1 - Math.exp(-k * dt));
    progress = Math.max(0, Math.min(1, progress));

    const p = progress;
    const pe = easeOutCubic(p);

    // Wrapper zoom: "rentrer dans l'explosion"
    const zoom = 1 + pe * ZOOM_MAX;
    logoWrap.style.transform = `scale(${zoom.toFixed(4)})`;

    // per-shard transform
    for (let i = 0; i < shards.length; i++) {
      const el = shards[i];
      const m = shardMeta[i];

      // gentle tremble always (less when exploding)
      const trembleAmp = (1 - pe) * 1.8 + 0.3;
      const wob = Math.sin(t*0.002 + m.phase) * trembleAmp;

      // direction from center + small curve
      const dist = pe * (EXPLODE_DIST * m.distMul);
      const curve = Math.sin(pe * Math.PI) * (70 * m.curveMul);

      const tx = (m.nx * dist) + (m.px * curve) + wob;
      const ty = (m.ny * dist) + (m.py * curve) - wob;

      const rot = (pe * m.rotMax) + (Math.sin(t*0.0018 + m.phase*2) * trembleAmp * 0.25);

      el.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) rotate(${rot.toFixed(2)} ${m.cx.toFixed(2)} ${m.cy.toFixed(2)})`);
    }

    // If completed, keep final pose
    rafId = requestAnimationFrame(updateShards);
  }

  function startRAF() {
    if (rafId) cancelAnimationFrame(rafId);
    lastT = performance.now();
    rafId = requestAnimationFrame(updateShards);
  }

  function setupFromSvg(svgDoc) {
    const svg = svgDoc.querySelector('svg');
    if (!svg) return false;

    shards = $$('[id^="shard-"]', svg);
    if (!shards.length) return false;

    shardMeta = shards.map((el, i) => {
      const cx = parseFloat(el.getAttribute('data-cx') || '500');
      const cy = parseFloat(el.getAttribute('data-cy') || '500');
      const dx = cx - 500;
      const dy = cy - 500;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / len, ny = dy / len;
      // perpendicular
      const px = -ny, py = nx;

      return {
        cx, cy, nx, ny, px, py,
        phase: Math.random() * Math.PI * 2,
        distMul: 0.85 + Math.random() * 0.45, // 85%..130%
        curveMul: -1 + Math.random() * 2,
        rotMax: (-18 + Math.random() * 36)   // -18..+18 deg
      };
    });

    startRAF();
    return true;
  }

  function allowInteraction() {
    ready = true;
    arrow.classList.add('is-ready');
  }

  function onWheel(e){ e.preventDefault(); return false; })();