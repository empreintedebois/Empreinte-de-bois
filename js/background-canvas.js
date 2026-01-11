// background-canvas.js (extracted from inline script)

// ===============================
  // PARAMÈTRES (à modifier)
  // ===============================
  const IMG_GREY_V = "assets/fond/fond-gris-v.webp";
  const IMG_GOLD_V = "assets/fond/fond-dore-v.webp";

  const IMG_GREY_H = "assets/fond/fond-gris-h.webp";
  const IMG_GOLD_H = "assets/fond/fond-dore-h.webp";

  const MAX_COVER_SCALE = 1.15;

  // Halos en ratio (relatifs à l'écran)
  const MIN_DIAMETER_RATIO = 0.06;
  const MAX_DIAMETER_RATIO = 0.32;

  // Timings (ms)
  const FADE_IN  = 3800;
  const FADE_OUT = 800;
  const SPAWN_DELAY = 800;

  // Profil du halo (0.35 = bord plus net / 0.75 = très diffus)
  const SOFT_EDGE = 0.65;

  // Densité / perf
  const MAX_PULSES = 20;
  const MAX_PULSES_PER_SPAWN = 3;

  // Perf (mobile)
  const MAX_DPR = 1.5;

  // Anti "micro-zoom" Android/Chrome
  const VIEWPORT_HYSTERESIS_PX = 80;
  // ===============================

  const canvas = document.getElementById("background-canvas");
  const ctx = canvas.getContext("2d");

  const maskCanvas = document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d");

  const goldCanvas = document.createElement("canvas");
  const goldCtx = goldCanvas.getContext("2d");

  let w = 0, h = 0, dpr = 1;
  let pulses = [];
  let lastSpawn = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    const newW = window.innerWidth;
    const newH = window.innerHeight;

    // Android/Chrome : la barre d’adresse fait varier innerHeight au scroll
    // -> on ignore si c’est un petit delta, pour éviter le “zoom”
    if (w && newW === w && Math.abs(newH - h) < VIEWPORT_HYSTERESIS_PX) return;

    w = newW;
    h = newH;

    for (const c of [canvas, maskCanvas, goldCanvas]) {
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
    }

    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    ctx.setTransform(dpr,0,0,dpr,0,0);
    maskCtx.setTransform(dpr,0,0,dpr,0,0);
    goldCtx.setTransform(dpr,0,0,dpr,0,0);
  }

  function load(src) {
    return new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image introuvable: " + src));
      i.src = src;
    });
  }

  function pickBackgroundByOrientation() {
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    return isPortrait
      ? { grey: IMG_GREY_V, gold: IMG_GOLD_V }
      : { grey: IMG_GREY_H, gold: IMG_GOLD_H };
  }

  function drawCover(ctx2d, img) {
    const iw = img.width, ih = img.height;
    const rawScale = Math.max(w / iw, h / ih);
    const scale = Math.min(rawScale, MAX_COVER_SCALE);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    ctx2d.drawImage(img, dx, dy, dw, dh);
  }

  function spawn(now) {
    if (pulses.length >= MAX_PULSES) return;

    // 1 → MAX_PULSES_PER_SPAWN halos (apparitions groupées)
    const count = 1 + Math.floor(Math.random() * MAX_PULSES_PER_SPAWN);

    const base = Math.min(w, h);
    const minD = base * MIN_DIAMETER_RATIO;
    const maxD = base * MAX_DIAMETER_RATIO;

    for (let i = 0; i < count; i++) {
      if (pulses.length >= MAX_PULSES) break;

      const d = minD + Math.random() * (maxD - minD);

      pulses.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: d / 2,
        born: now + Math.random() * 250,                 // désynchronise un peu le cluster
        die:  now + FADE_IN + FADE_OUT + 250
      });
    }
  }

  function opacity(p, now) {
    const t = now - p.born;
    if (t < 0) return 0;
    if (t < FADE_IN) return t / FADE_IN;
    if (t < FADE_IN + FADE_OUT) return 1 - (t - FADE_IN) / FADE_OUT;
    return 0;
  }

  (async function () {
    let grey, gold;

    try {
      const picked = pickBackgroundByOrientation();
      [grey, gold] = await Promise.all([load(picked.grey), load(picked.gold)]);
    } catch (e) {
      console.error("[Fond animé]", e);
      return;
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });

    window.addEventListener("orientationchange", async () => {
      try {
        const picked = pickBackgroundByOrientation();
        [grey, gold] = await Promise.all([load(picked.grey), load(picked.gold)]);
        resize();
      } catch (e) {
        console.error("[Fond animé] reload orientation", e);
      }
    }, { passive: true });

    function frame(now) {
      if (now - lastSpawn > SPAWN_DELAY) {
        spawn(now);
        lastSpawn = now;
      }

      pulses = pulses.filter(p => now < p.die);

      // base gris
      ctx.clearRect(0,0,w,h);
      drawCover(ctx, grey);

      // couche dorée
      goldCtx.clearRect(0,0,w,h);
      drawCover(goldCtx, gold);

      // masque radial
      maskCtx.clearRect(0,0,w,h);
      for (const p of pulses) {
        const a = opacity(p, now);
        if (!a) continue;

        const g = maskCtx.createRadialGradient(
          p.x, p.y, p.r * (1 - SOFT_EDGE),
          p.x, p.y, p.r
        );
        g.addColorStop(0, `rgba(255,255,255,${a})`);
        g.addColorStop(1, "rgba(255,255,255,0)");

        maskCtx.fillStyle = g;
        maskCtx.beginPath();
        maskCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        maskCtx.fill();
      }

      goldCtx.globalCompositeOperation = "destination-in";
      goldCtx.drawImage(maskCanvas, 0, 0, w, h);
      goldCtx.globalCompositeOperation = "source-over";

      ctx.drawImage(goldCanvas, 0, 0, w, h);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  })();
