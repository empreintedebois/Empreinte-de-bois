/* Intro animation controller (irregular shards, mobile-safe)
   - Fixed centered stage
   - Wheel/touch scroll drives progress up to 0.30, then autoplay sequence
*/
(() => {
  const INTRO_MIN_HOLD_MS = 3000;          // hold before allowing interaction
  const AUTO_TRIGGER_AT = 0.30;            // when reached, autoplay takes over
  const AUTO_EXPLODE_MS = 1500;            // remaining explosion duration
  const FADE_OUT_MS = 1000;                // fade shards to transparent
  const POST_INTRO_WAIT_MS = 3000;         // wait before revealing site
  const REVEAL_MS = 9000;                  // curtain reveal duration (8-10s requested)
  const MAX_DIST = 520;                    // explosion distance (violent)
  const EXTRA_DIST_JITTER = 0.35;          // per-shard variance
  const MAX_ZOOM = 1.65;                   // "zoom violent" into the explosion center
  const SHA_RD_SCALE = 1.40;               // shards scale as they fly
  const TREMBLE_PX = 1.2;                  // subtle idle tremble
  const TREMBLE_ROT = 0.6;                 // degrees
  const HALO_SCALE_MULT = 1.2;             // +20% halo size
  const HALO_GRAD_MULT = 1.2;              // +20% gradient/blur

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const intro = $("#intro");
  if (!intro) return;

  const stage = $("#introStage");
  const shardsLayer = $("#introShards");
  const arrow = $("#introArrow");
  const site = $("#site");
  const curtain = $("#revealCurtain");

  const state = {
    ready: false,
    locked: true,
    progress: 0,     // 0..1
    mode: "manual",  // manual | auto | done
    t0: performance.now(),
    holdUntil: performance.now() + INTRO_MIN_HOLD_MS,
    pieces: [],
    center: { x: 0, y: 0 },
    baseScale: 1
  };

  // Prevent body scrolling while intro is active
  const lockScroll = (lock) => {
    document.documentElement.classList.toggle("intro-lock", lock);
    document.body.classList.toggle("intro-lock", lock);
  };

  // Compute scale to ensure the full logo fits in viewport
  function computeBaseScale() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // logo base is ~1200x800-ish; use width constraint primarily on mobile
    const scaleW = vw / 1200;
    const scaleH = vh / 900;
    // clamp: never exceed 1, never go below 0.45
    return Math.max(0.45, Math.min(1.0, Math.min(scaleW, scaleH) * 0.92));
  }

  function applyStageTransform() {
    state.baseScale = computeBaseScale();
    stage.style.setProperty("--baseScale", state.baseScale.toFixed(4));
  }

  function setHalosBoost() {
    $$(".halo", intro).forEach(h => {
      h.style.setProperty("--haloScale", (1.44).toString()); // baseline 1.2 * 1.2
      h.style.setProperty("--haloBlur", (72).toString());    // increased blur
      h.style.setProperty("--haloStrength", (1.0).toString());
    });
  }

  function buildShardEl(piece) {
    const img = document.createElement("img");
    img.className = "shard";
    img.alt = "";
    img.decoding = "async";
    img.loading = "eager";
    img.src = piece.src;
    img.style.left = piece.x + "px";
    img.style.top = piece.y + "px";
    img.style.width = piece.w + "px";
    img.style.height = piece.h + "px";
    img.dataset.dx = piece.dx;
    img.dataset.dy = piece.dy;
    // per-shard randomness
    img.dataset.j = (0.85 + Math.random() * 0.45).toFixed(3);
    img.dataset.r = ((Math.random()*2-1) * 22).toFixed(2); // max rotation
    return img;
  }

  function setProgress(p) {
    state.progress = Math.max(0, Math.min(1, p));
    render();
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function easeInOutQuad(t) {
    return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
  }

  function render() {
    if (!state.ready) return;

    const p = state.progress;
    const e = easeOutCubic(p);

    // Zoom towards center progressively
    const zoom = 1 + e * (MAX_ZOOM - 1);
    shardsLayer.style.transform = `scale(${zoom})`;

    // shards transforms
    for (const el of state.pieces) {
      const dx = parseFloat(el.dataset.dx);
      const dy = parseFloat(el.dataset.dy);
      const j = parseFloat(el.dataset.j);
      const rotMax = parseFloat(el.dataset.r);

      const dist = MAX_DIST * e * j * (1 + EXTRA_DIST_JITTER*(j-1));
      const nx = dx === 0 && dy === 0 ? 0 : dx / Math.hypot(dx, dy);
      const ny = dx === 0 && dy === 0 ? 0 : dy / Math.hypot(dx, dy);

      const tx = nx * dist;
      const ty = ny * dist;
      const rot = rotMax * e;

      const scl = 1 + e * (SHA_RD_SCALE - 1);

      el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${scl})`;
      el.style.opacity = "1";
    }

    // Arrow appears after hold and only if not autoplaying
    const now = performance.now();
    const canInteract = now > state.holdUntil;
    state.locked = !canInteract;

    if (arrow) {
      arrow.classList.toggle("visible", canInteract && state.mode === "manual");
    }
  }

  // Idle tremble
  function tickTremble() {
    if (state.mode === "done") return;
    const t = performance.now() * 0.002;
    const tx = Math.sin(t*1.7) * TREMBLE_PX;
    const ty = Math.cos(t*1.3) * TREMBLE_PX;
    const r = Math.sin(t*1.1) * TREMBLE_ROT;
    stage.style.transform = `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${r}deg) scale(var(--baseScale))`;
    requestAnimationFrame(tickTremble);
  }

  // Manual scroll control up to AUTO_TRIGGER_AT
  function onWheel(e) {
    if (state.mode !== "manual") return;
    if (state.locked) { e.preventDefault(); return; }

    const delta = Math.sign(e.deltaY) * Math.min(1, Math.abs(e.deltaY) / 700);
    const next = state.progress + delta * 0.07;
    setProgress(next);

    if (state.progress >= AUTO_TRIGGER_AT) {
      startAutoSequence();
    }
    e.preventDefault();
  }

  // Touch drag to simulate scroll
  let touchY = null;
  function onTouchStart(e) {
    if (state.mode !== "manual") return;
    touchY = e.touches?.[0]?.clientY ?? null;
  }
  function onTouchMove(e) {
    if (state.mode !== "manual") return;
    if (state.locked) { e.preventDefault(); return; }
    const y = e.touches?.[0]?.clientY ?? null;
    if (touchY == null || y == null) return;
    const dy = touchY - y;
    touchY = y;
    const delta = Math.sign(dy) * Math.min(1, Math.abs(dy) / 180);
    const next = state.progress + delta * 0.06;
    setProgress(next);
    if (state.progress >= AUTO_TRIGGER_AT) startAutoSequence();
    e.preventDefault();
  }
  function onTouchEnd() { touchY = null; }

  function startAutoSequence() {
    if (state.mode !== "manual") return;
    state.mode = "auto";
    if (arrow) arrow.classList.remove("visible");

    const startP = state.progress;
    const targetP = 1;

    const tStart = performance.now();
    const animateExplode = (t) => {
      const u = Math.min(1, (t - tStart) / AUTO_EXPLODE_MS);
      const p = startP + (targetP - startP) * easeInOutQuad(u);
      setProgress(p);
      if (u < 1) requestAnimationFrame(animateExplode);
      else fadeOutAndReveal();
    };
    requestAnimationFrame(animateExplode);
  }

  function fadeOutAndReveal() {
    // Fade shards + stage to transparent
    intro.classList.add("fading");
    const t0 = performance.now();
    const fade = (t) => {
      const u = Math.min(1, (t - t0) / FADE_OUT_MS);
      intro.style.setProperty("--introFade", (1 - u).toFixed(4));
      if (u < 1) requestAnimationFrame(fade);
      else {
        // keep background (intro) visible but hide shards layer interactions
        shardsLayer.style.visibility = "hidden";
        stage.style.visibility = "hidden";
        // after wait, reveal site
        setTimeout(startCurtainReveal, POST_INTRO_WAIT_MS);
      }
    };
    requestAnimationFrame(fade);
  }

  function startCurtainReveal() {
    // Make site visible but clipped. Then animate curtain down.
    intro.classList.add("revealing");
    site.classList.add("revealing");
    lockScroll(false); // allow normal scroll once reveal finished (but we will disable going back to intro by removing it)

    const t0 = performance.now();
    const step = (t) => {
      const u = Math.min(1, (t - t0) / REVEAL_MS);
      const e = easeInOutQuad(u);
      // clip-path reveals top->bottom. Soft edge handled by curtain overlay gradient.
      site.style.setProperty("--reveal", e.toFixed(4));
      if (curtain) curtain.style.setProperty("--reveal", e.toFixed(4));
      if (u < 1) requestAnimationFrame(step);
      else {
        // Remove intro from layout to prevent scrolling back
        state.mode = "done";
        intro.remove();
        document.documentElement.classList.remove("intro-lock");
        document.body.classList.remove("intro-lock");
      }
    };
    requestAnimationFrame(step);
  }

  async function init() {
    lockScroll(true);
    applyStageTransform();
    setHalosBoost();

    // Load irregular meta
    const metaUrl = "assets/intro/pieces_irregular_meta.json";
    const res = await fetch(metaUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load shards meta");
    const meta = await res.json();

    // Build shards
    shardsLayer.innerHTML = "";
    const els = [];
    for (const p of meta.pieces) {
      const el = buildShardEl(p);
      shardsLayer.appendChild(el);
      els.push(el);
    }
    state.pieces = els;
    state.ready = true;

    // initial render
    render();
    tickTremble();

    // enable events
    window.addEventListener("resize", () => { applyStageTransform(); }, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    // Arrow click triggers auto immediately
    if (arrow) {
      arrow.addEventListener("click", (e) => {
        e.preventDefault();
        if (state.mode === "manual" && !state.locked) {
          setProgress(AUTO_TRIGGER_AT);
          startAutoSequence();
        }
      });
    }
  }

  init().catch((err) => {
    console.error("[intro] init failed:", err);
    // Fail-safe: show site
    lockScroll(false);
    intro.remove();
    site.classList.add("revealing");
    site.style.setProperty("--reveal", "1");
  });
})();
