
(() => {
  const body = document.body;
  const intro = document.getElementById("intro");
  const spacer = document.getElementById("intro-spacer");
  const site = document.getElementById("site");
  const arrow = document.getElementById("scrollArrow");

  // Skip intro if already passed in this session
  if (sessionStorage.getItem("introDone") === "1") {
    if (intro) intro.remove();
    if (spacer) spacer.remove();
    site.classList.remove("site-hidden");
    site.classList.add("site-revealed", "reveal", "reveal-on");
    body.classList.remove("intro-lock");
    return;
  }

  let pieces = [];
  let meta = null;
  let canScroll = false;
  let done = false;

  // lock scroll for 3 seconds (not waiting full page load)
  const lockStart = () => {
    body.classList.add("intro-lock");
    // hard block wheel/touch during lock
    const block = (e) => { if (!canScroll) e.preventDefault(); };
    window.__introBlockWheel = block;
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
  };

  const unlock = () => {
    canScroll = true;
    body.classList.remove("intro-lock");
    if (arrow) arrow.classList.add("is-visible");
    // remove blockers
    if (window.__introBlockWheel) {
      window.removeEventListener("wheel", window.__introBlockWheel);
      window.removeEventListener("touchmove", window.__introBlockWheel);
      window.__introBlockWheel = null;
    }
  };

  lockStart();
  setTimeout(unlock, 3000);

  // Progress mapping:
  // p in [0..1] over INTRO_SCROLL_PX
  const getIntroScrollPx = () => Math.max(1, Math.round(window.innerHeight * 1.05));

  function getP() {
    const px = getIntroScrollPx();
    return Math.min(1, Math.max(0, window.scrollY / px));
  }

  // explode 0..0.55 ; fade-to-black 0.55..1
  function applyTransforms(p) {
    const explode = Math.min(1, p / 0.55);
    const fadeT = p < 0.55 ? 0 : Math.min(1, (p - 0.55) / 0.45);

    pieces.forEach((el) => {
      const id = el.dataset.pid;
      const info = meta.pieces.find(x => x.id === id);
      if (!info) return;

      const mag = info.mag; // px at full explode
      const tx = info.dir.x * mag * explode;
      const ty = info.dir.y * mag * explode;

      // jitter decreases as it explodes
      const j = (1 - explode);
      const jx = (Math.sin((performance.now()/1000) * 2.2 + el.__seed) * 1.2) * j;
      const jy = (Math.cos((performance.now()/1000) * 2.0 + el.__seed*0.7) * 1.2) * j;

      el.style.transform = `translate3d(${tx + jx}px, ${ty + jy}px, 0)`;

      // Fade to black: brightness(0) turns white to black. Then fade out slightly.
      el.style.filter = `brightness(${1 - fadeT})`;
      el.style.opacity = String(1 - fadeT * 0.95);
    });
  }

  function finishIntro() {
    if (done) return;
    done = true;
    sessionStorage.setItem("introDone", "1");

    // Remove intro visuals
    if (intro) intro.remove();
    if (spacer) spacer.remove();

    // Reset scroll to top of real site (no way back)
    window.scrollTo({ top: 0, behavior: "auto" });

    // Reveal site from top to bottom
    site.classList.remove("site-hidden");
    site.classList.add("site-revealed", "reveal");
    requestAnimationFrame(() => site.classList.add("reveal-on"));

    // Hard guard: if user tries to scroll negative, there's nothing above anyway.
  }

  function onScroll() {
    if (!canScroll || done) return;
    const p = getP();
    applyTransforms(p);

    if (p >= 1) {
      finishIntro();
    }
  }

  // Arrow scrolls to end of intro
  if (arrow) {
    arrow.addEventListener("click", () => {
      const px = getIntroScrollPx();
      window.scrollTo({ top: px + 2, behavior: "smooth" });
    });
  }

  // Load pieces meta, then init
  async function init() {
    try {
      const res = await fetch("assets/intro/shards_meta.json", { cache: "no-store" });
      meta = await res.json();

      pieces = Array.from(document.querySelectorAll(".logo-piece"));
      pieces.forEach((el, idx) => {
        // pid is like p01
        const m = /piece-(p\d+)/.exec(el.id);
        el.dataset.pid = m ? m[1] : "";
        el.__seed = idx + 1;
      });

      // init state
      applyTransforms(0);

      // animate loop for jitter (so it updates even without scroll)
      const loop = () => {
        if (done) return;
        if (canScroll) applyTransforms(getP());
        else applyTransforms(0);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", () => { if (canScroll && !done) applyTransforms(getP()); });

    } catch (e) {
      console.error("Intro init failed", e);
      // fail open
      unlock();
      finishIntro();
    }
  }

  // Ensure site stays hidden until intro ends
  site.classList.add("site-hidden");

  init();
})();
