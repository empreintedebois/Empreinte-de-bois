(() => {
  "use strict";

  // ====== Quick config ======
  // Keep only whites (alpha) over pure black. Increase threshold to remove light grays.
  const CFG = {
    videoSrc: "assets/intro/intro.mp4",
    // luma key (0..255)
    threshold: null, // null => read from CSS var --intro-key-threshold
    softness:  null, // null => read from CSS var --intro-key-softness
    // fallback: if autoplay blocked, we still exit after this delay (ms)
    hardTimeoutMs: 16000,
  };

  const qs = (sel, el=document) => el.querySelector(sel);

  const overlay = qs("#intro-overlay");
  const stage   = qs("#intro-stage");
  const siteRoot = qs("#site-layer");

  if (!overlay || !stage) return;

  // Ensure consistent class state
  document.documentElement.classList.add("intro-active");
  document.body.classList.add("intro-active");
  if (siteRoot) siteRoot.setAttribute("aria-hidden", "true");

  // Replace intro content with video+canvas (idempotent)
  stage.innerHTML = `
    <div id="intro-video-wrap">
      <video id="intro-video" playsinline muted preload="auto"></video>
      <canvas id="intro-canvas"></canvas>
    </div>
  `;

  const video = qs("#intro-video", stage);
  const canvas = qs("#intro-canvas", stage);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Read CSS vars if not set
  const css = getComputedStyle(document.documentElement);
  const readVarInt = (name, fallback) => {
    const v = parseInt(css.getPropertyValue(name).trim(), 10);
    return Number.isFinite(v) ? v : fallback;
  };
  const threshold = CFG.threshold ?? readVarInt("--intro-key-threshold", 190);
  const softness  = CFG.softness  ?? readVarInt("--intro-key-softness",  26);

  // Setup sizing
  let vw=0, vh=0, cw=0, ch=0;
  function resize(){
    vw = Math.max(1, window.innerWidth);
    vh = Math.max(1, window.innerHeight);
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); // cap for perf
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = vw + "px";
    canvas.style.height = vh + "px";
    cw = canvas.width;
    ch = canvas.height;
    ctx.setTransform(1,0,0,1,0,0);
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  // Draw video to canvas with cover scaling
  function drawCover(){
    const vwVid = video.videoWidth || 1;
    const vhVid = video.videoHeight || 1;

    // cover scale in canvas pixels
    const scale = Math.max(cw / vwVid, ch / vhVid);
    const dw = vwVid * scale;
    const dh = vhVid * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.clearRect(0,0,cw,ch);
    ctx.drawImage(video, dx, dy, dw, dh);
  }

  function applyLumaKey(){
    const img = ctx.getImageData(0,0,cw,ch);
    const d = img.data;

    // soft edge bounds
    const t0 = Math.max(0, Math.min(255, threshold - softness));
    const t1 = Math.max(0, Math.min(255, threshold + softness));
    const inv = (t1 - t0) ? (1 / (t1 - t0)) : 1;

    // Luma: Rec.709 approx
    for (let i=0; i<d.length; i+=4){
      const r=d[i], g=d[i+1], b=d[i+2];

      const l = 0.2126*r + 0.7152*g + 0.0722*b; // 0..255
      let a = 0;

      if (l <= t0) a = 0;
      else if (l >= t1) a = 255;
      else a = Math.round((l - t0) * inv * 255);

      // Keep whites "pure": gently push towards white when alpha is high
      if (a > 0){
        const boost = a / 255;
        const rr = r + (255 - r) * boost * 0.35;
        const gg = g + (255 - g) * boost * 0.35;
        const bb = b + (255 - b) * boost * 0.35;
        d[i]   = rr;
        d[i+1] = gg;
        d[i+2] = bb;
      }

      d[i+3] = a;
    }
    ctx.putImageData(img,0,0);
  }

  let raf = 0;
  function loop(){
    if (video.paused || video.ended){
      cancelAnimationFrame(raf);
      return;
    }
    drawCover();
    applyLumaKey();
    raf = requestAnimationFrame(loop);
  }

  function endIntro(){
    // fade out overlay
    overlay.classList.add("intro-hidden");
    // after fade, remove and unlock
    const fadeMs = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--intro-fade-ms")) || 650;
    window.setTimeout(() => {
      overlay.style.display = "none";
      document.documentElement.classList.remove("intro-active");
      document.body.classList.remove("intro-active");
      document.documentElement.classList.add("intro-done");
      if (siteRoot) siteRoot.removeAttribute("aria-hidden");
    }, Math.max(200, fadeMs + 30));
  }

  // Prepare video
  video.src = CFG.videoSrc;

  // Autoplay best-effort (mobile needs muted+playsinline)
  const playPromise = video.play();
  let hardTimer = window.setTimeout(() => {
    // if something went wrong (autoplay blocked), do not freeze the site
    endIntro();
  }, CFG.hardTimeoutMs);

  function onCanPlay(){
    // start render loop once metadata ready
    if (video.readyState >= 2){
      cancelAnimationFrame(raf);
      loop();
    }
  }

  video.addEventListener("loadedmetadata", onCanPlay, { once: true });
  video.addEventListener("playing", () => {
    clearTimeout(hardTimer);
    hardTimer = window.setTimeout(endIntro, Math.max(CFG.hardTimeoutMs, (video.duration||0)*1000 + 1500));
    loop();
  }, { once: true });

  video.addEventListener("ended", () => {
    clearTimeout(hardTimer);
    endIntro();
  }, { once: true });

  // If autoplay was rejected, try again on first user gesture (still no UI)
  if (playPromise && typeof playPromise.catch === "function"){
    playPromise.catch(() => {
      const once = () => {
        window.removeEventListener("pointerdown", once);
        window.removeEventListener("keydown", once);
        video.play().catch(() => {});
      };
      window.addEventListener("pointerdown", once, { once: true, passive: true });
      window.addEventListener("keydown", once, { once: true });
    });
  }
})();
