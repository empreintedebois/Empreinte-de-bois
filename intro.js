
(() => {
  "use strict";

  const body = document.body;
  const intro = document.getElementById("intro");
  const site  = document.getElementById("site");
  const arrow = document.getElementById("scrollArrow");
  const logoWrap = document.getElementById("logoExplode");
  const logoInner = document.getElementById("logoInner") || logoWrap;
  const spacer = document.getElementById("intro-spacer");

  if (!intro || !site || !logoWrap || !spacer) {
    console.warn("[intro] missing nodes, fail-open");
    return;
  }

  // Always start with intro active
  site.classList.add("site-hidden");
  body.classList.add("intro-lock");

  // --- Scroll lock: max 3s (prevents accidental skip, never bricks mobile) ---
  const prevent = (e) => { try { e.preventDefault(); } catch (_) {} };
  const lockScroll = () => {
    window.addEventListener("wheel", prevent, { passive: false });
    window.addEventListener("touchmove", prevent, { passive: false });
  };
  const unlockScroll = () => {
    window.removeEventListener("wheel", prevent);
    window.removeEventListener("touchmove", prevent);
    body.classList.remove("intro-lock");
  };

  lockScroll();
  setTimeout(unlockScroll, 3000);

  // --- Responsive layout: fit 1200x1200 design into viewport ---
  const DESIGN = 1200;
  const layout = () => {
    const vv = window.visualViewport;
    const vw = Math.max(320, vv ? vv.width  : window.innerWidth);
    const vh = Math.max(480, vv ? vv.height : window.innerHeight);

    // target: keep margins, also limit by height (mobile safe)
    const maxW = vw * 0.88;
    const maxH = vh * 0.62;
    const size = Math.max(220, Math.min(maxW, maxH, 760));

    logoWrap.style.width = `${size}px`;
    logoWrap.style.height = `${size}px`;
    const s = size / DESIGN;
    logoInner.style.transform = `scale(${s})`;
  };

  // initial layout before paint + on resize/orientation
  layout();
  window.addEventListener("resize", layout, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", layout, { passive: true });
    window.visualViewport.addEventListener("scroll", layout, { passive: true });
  }

  // --- Shard offsets (from meta, fallback radial) ---
  const pieces = Array.from(intro.querySelectorAll(".logo-piece"));
  pieces.forEach(p => p.classList.add("idle"));

  const fallbackOffsets = () => {
    // compute offsets based on element position in design space
    pieces.forEach((el) => {
      const left = parseFloat(el.style.left || "0");
      const top  = parseFloat(el.style.top  || "0");
      const cx = left + (parseFloat(el.style.width||"0")/2);
      const cy = top  + (parseFloat(el.style.height||"0")/2);
      const vx = cx - DESIGN/2;
      const vy = cy - DESIGN/2;
      const len = Math.max(1, Math.hypot(vx, vy));
      const ux = vx / len;
      const uy = vy / len;
      // explode distance tuned for mobile (design px)
      el.dataset.dx = String(ux * 260);
      el.dataset.dy = String(uy * 260);
      el.dataset.rot = String((Math.random()*14-7));
    });
  };

  const applyMeta = (meta) => {
    // meta expected: { "p01": {dx,dy,rot}, ... } in design px
    pieces.forEach((el) => {
      const id = (el.id || "").replace("piece-", "");
      const m = meta[id] || meta[(id||"").toLowerCase()] || null;
      if (m && typeof m.dx === "number" && typeof m.dy === "number") {
        el.dataset.dx = String(m.dx);
        el.dataset.dy = String(m.dy);
        el.dataset.rot = String(m.rot || 0);
      }
    });
    // fill missing with fallback
    pieces.forEach((el) => {
      if (el.dataset.dx == null || el.dataset.dy == null) {
        // mark so we only fill once
        el.dataset.dx = el.dataset.dx ?? "0";
      }
    });
    // if lots are zeros, use fallback
    const nonZero = pieces.filter(p => Math.abs(parseFloat(p.dataset.dx||"0")) + Math.abs(parseFloat(p.dataset.dy||"0")) > 0.1).length;
    if (nonZero < Math.floor(pieces.length * 0.6)) fallbackOffsets();
  };

  fetch("assets/intro/shards_meta.json", { cache: "no-store" })
    .then(r => r.ok ? r.json() : Promise.reject(new Error("meta http " + r.status)))
    .then(applyMeta)
    .catch((e) => {
      console.warn("[intro] meta load failed, using fallback", e);
      fallbackOffsets();
    });

  // --- Animation driven by scroll progress ---
  let introDone = false;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  const setProgress = (p) => {
    // p: 0..1 explode, then fade out afterwards via CSS variable
    const explodeP = clamp01(p);
    const ease = explodeP*explodeP*(3-2*explodeP); // smoothstep
    const dist = 1 + ease;

    pieces.forEach((el) => {
      const dx = parseFloat(el.dataset.dx || "0") * ease;
      const dy = parseFloat(el.dataset.dy || "0") * ease;
      const rot = parseFloat(el.dataset.rot || "0") * ease;
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;
      el.style.opacity = "1";
      el.classList.toggle("idle", explodeP < 0.02);
    });
  };

  const fadeLogo = (t01) => {
    const o = 1 - clamp01(t01);
    pieces.forEach((el) => { el.style.opacity = String(o); });
  };

  const revealSite = () => {
    // remove intro overlay after reveal
    site.classList.remove("site-hidden");
    // curtain reveal if present
    const curtain = document.getElementById("reveal-curtain");
    if (curtain) {
      curtain.classList.add("reveal");
      setTimeout(() => curtain.remove(), 1400);
    }
    // prevent going back to intro
    setTimeout(() => {
      intro.remove();
      spacer.remove();
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 900);
  };

  const onScroll = () => {
    if (introDone) return;

    const maxScroll = Math.max(1, spacer.offsetHeight - window.innerHeight);
    const y = window.scrollY || 0;
    const p = clamp01(y / maxScroll);

    // explode 0..0.6, then auto-finish (explode to max in 1.5s, fade 1s, reveal)
    if (p < 0.6) {
      setProgress(p / 0.6);
      return;
    }

    introDone = true;

    // finish explode quickly
    const start = performance.now();
    const finishExplode = (now) => {
      const t = clamp01((now - start) / 1500);
      setProgress(1);
      if (t < 1) requestAnimationFrame(finishExplode);
    };
    requestAnimationFrame(finishExplode);

    // start fade slightly before end
    setTimeout(() => {
      const f0 = performance.now();
      const step = (now) => {
        const t = clamp01((now - f0) / 1000);
        fadeLogo(t);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 1300);

    // reveal after small pause
    setTimeout(revealSite, 2800);
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  // Arrow triggers scroll progression (mobile-friendly)
  const go = () => {
    unlockScroll();
    window.scrollTo({ top: Math.round(window.innerHeight * 0.75), behavior: "smooth" });
  };
  arrow?.addEventListener("click", (e) => { e.preventDefault(); go(); });
  arrow?.addEventListener("touchstart", (e) => { e.preventDefault(); go(); }, { passive: false });

  // Kick initial state
  setProgress(0);

})();
