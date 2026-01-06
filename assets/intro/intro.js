/* =========================
   INTRO TIMELINE (stacked shards, auto)
   Timeline order requested:
     G1 -> P3bis -> P2 -> P4 -> T1 -> P3(P5)
   Notes:
   - Shards are full-frame cutouts: stacking at (0,0) reconstructs logo-texte.
   - Shard count is dynamic from shards_meta.json.
   - No image ratio distortion: we scale only the 16:9 stage.
   - Laser reveal: canvas visual + CSS soft mask reveal.
   Auto start:
   - Wait for window "load" (site assets) then +1000ms, then run intro.
   ========================= */

(() => {
  const qs = (s) => document.querySelector(s);

  const overlay   = qs("#intro-overlay");
  const dim       = qs("#intro-dim");
  const stage     = qs("#intro-stage");
  const row       = qs("#intro-row");
  const motifL    = qs("#intro-motif-left");
  const texte     = qs("#intro-texte");
  const motifR    = qs("#intro-motif-right");
  const shardsBox = qs("#intro-shards");
  const shock     = qs("#intro-shockwave");
  const hint      = qs("#intro-start-hint");

  // Create laser canvas if not present
  let laserCanvas = qs("#laser-canvas");
  if (overlay && !laserCanvas) {
    laserCanvas = document.createElement("canvas");
    laserCanvas.id = "laser-canvas";
    overlay.appendChild(laserCanvas);
  }

  if (!overlay || !stage || !row || !motifL || !texte || !motifR || !shardsBox) return;

  /* -------------------------
     Scroll lock
  ------------------------- */
  let savedY = 0;
  const preventTouch = (e) => e.preventDefault();

  const lockScroll = () => {
    savedY = window.scrollY || 0;
    document.documentElement.classList.add("intro-active");
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    window.addEventListener("touchmove", preventTouch, { passive: false });
  };

  const unlockScroll = () => {
    window.removeEventListener("touchmove", preventTouch);
    document.body.style.position = "";
    const top = document.body.style.top;
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    const y = top ? Math.abs(parseInt(top, 10)) : savedY;
    window.scrollTo(0, y);
  };

  /* -------------------------
     Stage scaling (no ratio distortion)
  ------------------------- */
  const BASE_W = 1920;
  const BASE_H = 1080;

  function updateScale() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / BASE_W, vh / BASE_H) * 0.92;

    document.documentElement.style.setProperty("--introScale", String(scale));
    document.documentElement.style.setProperty("--logoH", `${Math.round(180 * scale / 0.92)}px`);
  }

  updateScale();
  window.addEventListener("resize", updateScale, { passive: true });

  /* -------------------------
     Helpers
  ------------------------- */
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  function setOpacity(el, v) {
    if (!el) return;
    el.style.opacity = String(v);
  }

  /* -------------------------
     Shards loading (stacked full-frame)
  ------------------------- */
  async function fetchMeta() {
    const res = await fetch("assets/intro/shards_meta.json", { cache: "no-store" });
    if (!res.ok) throw new Error("missing shards_meta.json");
    const json = await res.json();
    const files = (json.files || []).filter(Boolean);
    return files;
  }

  function waitDecode(img) {
    if (img.decode) {
      return img.decode().catch(() => new Promise((r) => {
        img.onload = () => r();
        img.onerror = () => r();
      }));
    }
    return new Promise((r) => {
      img.onload = () => r();
      img.onerror = () => r();
    });
  }

  async function buildShards() {
    const files = await fetchMeta();
    shardsBox.innerHTML = "";

    const imgs = files.map((file) => {
      const img = new Image();
      img.src = `assets/intro/shards/${file}`;
      img.className = "intro-shard";
      img.alt = "";
      img.style.opacity = "0";
      img.style.transform = "none";
      shardsBox.appendChild(img);
      return img;
    });

    // Strict: wait all decoded so "stack -> composed logo" is guaranteed
    await Promise.all(imgs.map(waitDecode));

    // Force paint
    await raf2();

    return imgs;
  }

  async function fadeIn(imgs, ms = 220) {
    const t0 = performance.now();
    return new Promise((resolve) => {
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        for (const img of imgs) img.style.opacity = String(k);
        if (k < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  async function fadeOut(imgs, ms = 420) {
    const t0 = performance.now();
    return new Promise((resolve) => {
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        const o = 1 - k;
        for (const img of imgs) img.style.opacity = String(o);
        if (k < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  /* -------------------------
     Motif merge edge-to-edge
  ------------------------- */
  async function mergeMotifs(duration = 850) {
    // ensure stable layout
    motifL.classList.remove("tremble-weak");
    motifR.classList.remove("tremble-weak");

    motifL.style.transform = "";
    motifR.style.transform = "";
    await raf2();

    const rL = motifL.getBoundingClientRect();
    const rR = motifR.getBoundingClientRect();
    const cx = window.innerWidth * 0.5;

    // inner edges to center
    const dxL = cx - rL.right;
    const dxR = cx - rR.left;

    const t0 = performance.now();
    return new Promise((resolve) => {
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        const e = 1 - Math.pow(1 - k, 3);

        // zoom to "take the screen" feeling (height driven by stage scaling)
        const s = 1 + 2.8 * e;

        motifL.style.transform = `translateX(${dxL * e}px) scale(${s})`;
        motifR.style.transform = `translateX(${dxR * e}px) scale(${s})`;

        if (k < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  /* -------------------------
     Shards explosion
  ------------------------- */
  function explode(imgs, duration = 1500) {
    const maxD = Math.max(innerWidth, innerHeight) * 1.25;
    const t0 = performance.now();

    const dirs = imgs.map((_, i) => {
      const a = (i * 137.5) * Math.PI / 180;
      const d = maxD * (0.65 + (i % 7) * 0.05);
      const rot = (i % 2 ? 1 : -1) * (10 + (i % 11));
      return { x: Math.cos(a) * d, y: Math.sin(a) * d, rot };
    });

    return new Promise((resolve) => {
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        const e = 1 - Math.pow(1 - k, 3);

        for (let i = 0; i < imgs.length; i++) {
          const d = dirs[i];
          const s = 1 + 3 * e; // zoom x4
          imgs[i].style.transform = `translate(${d.x * e}px, ${d.y * e}px) rotate(${d.rot * e}deg) scale(${s})`;
        }

        if (k < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  /* -------------------------
     Shockwave
  ------------------------- */
  async function shockwave(duration = 650) {
    if (!shock) return;

    shock.style.opacity = "1";
    const t0 = performance.now();

    return new Promise((resolve) => {
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        shock.style.transform = `translate(-50%, -50%) scale(${1 + 8 * k})`;
        shock.style.opacity = String(1 - k);

        if (k < 1) requestAnimationFrame(tick);
        else {
          shock.style.opacity = "0";
          shock.style.transform = "translate(-50%, -50%) scale(0)";
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  /* -------------------------
     Laser canvas reveal (visual + CSS mask)
  ------------------------- */
  function setupLaserCanvas() {
    if (!laserCanvas) return null;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    laserCanvas.width = w;
    laserCanvas.height = h;
    laserCanvas.style.width = "100%";
    laserCanvas.style.height = "100%";
    const ctx = laserCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  async function laserReveal(duration = 1000) {
    // Make site visible but masked
    document.documentElement.classList.remove("intro-active");
    document.documentElement.classList.add("site-revealing");
    document.documentElement.style.setProperty("--revealY", "0%");

    // Turn on laser overlay visuals
    overlay.classList.add("laser-on");
    const ctx = setupLaserCanvas();

    const t0 = performance.now();
    return new Promise((resolve) => {
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        const e = 1 - Math.pow(1 - k, 3);

        const yPct = e * 100;
        document.documentElement.style.setProperty("--revealY", `${yPct}%`);

        if (ctx) {
          const w = window.innerWidth;
          const h = window.innerHeight;
          ctx.clearRect(0, 0, w, h);

          // soft glow line
          const y = (yPct / 100) * h;

          ctx.globalCompositeOperation = "source-over";

          // outer glow
          ctx.beginPath();
          ctx.rect(0, y - 20, w, 40);
          ctx.fillStyle = "rgba(255, 240, 180, 0.06)";
          ctx.fill();

          // main line
          ctx.beginPath();
          ctx.rect(0, y - 1.5, w, 3);
          ctx.fillStyle = "rgba(255, 240, 180, 0.18)";
          ctx.fill();

          // core line
          ctx.beginPath();
          ctx.rect(0, y - 0.5, w, 1);
          ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
          ctx.fill();
        }

        if (k < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  /* -------------------------
     Timeline (AUTO)
  ------------------------- */
  let started = false;

  async function runIntro() {
    if (started) return;
    started = true;

    overlay.classList.add("started");

    // lock scroll
    lockScroll();

    // G0: show 3 logos (no shards), mild tremble
    motifL.classList.add("tremble-weak");
    motifR.classList.add("tremble-weak");
    texte.classList.add("tremble-weak");

    // Hide shards box until ready
    shardsBox.setAttribute("aria-hidden", "true");

    // Short settle (we're not enforcing 2s here because user changed timeline order)
    await wait(450);

    // T0: load shards now
    let shards = [];
    try {
      shards = await buildShards();
    } catch (e) {
      shards = [];
    }

    // G1: show shards stacked (reconstructs logo). Then hide texte.
    if (shards.length > 0) {
      shardsBox.setAttribute("aria-hidden", "false");
      await fadeIn(shards, 220);
      await wait(180);          // ensures you SEE all shards present
      setOpacity(texte, 0);     // fade texte out after shards are clearly there
    }

    // P3bis: merge motifs + zoom first (requested)
    await mergeMotifs(850);

    // P2: explode shards after merge
    if (shards.length > 0) {
      await explode(shards, 1500);
    } else {
      await wait(700);
    }

    // P4: shockwave
    await shockwave(650);

    // T1: fade shards
    if (shards.length > 0) {
      await fadeOut(shards, 420);
    }

    // P3(P5): short hold / contemplation (grouped)
    await wait(1200);

    // Fade out motifs (leave dim for smoother transition)
    motifL.style.transition = "opacity 650ms ease";
    motifR.style.transition = "opacity 650ms ease";
    motifL.style.opacity = "0";
    motifR.style.opacity = "0";

    // fade dim (overlay black 80%) now
    overlay.classList.add("dim-fade");
    await wait(700);

    // After intro end: wait 1s then reveal site (auto rule)
    await wait(1000);

    // Laser reveal (canvas effect + soft mask)
    await laserReveal(1000);

    // Finalize: remove overlay and enable site
    document.documentElement.classList.remove("site-revealing");
    document.documentElement.classList.add("site-ready");

    overlay.style.transition = "opacity 250ms ease";
    overlay.style.opacity = "0";
    await wait(260);

    overlay.remove();
    unlockScroll();
  }

  // AUTO start: wait for full load then +1s
  function autoStart() {
    // hide hint because auto
    if (hint) hint.style.opacity = "0";
    runIntro().catch(() => {});
  }

  document.documentElement.classList.add("intro-active");
  overlay.style.opacity = "1";

  if (document.readyState === "complete") {
    setTimeout(autoStart, 1000);
  } else {
    window.addEventListener("load", () => setTimeout(autoStart, 1000), { once: true });
  }
})();
