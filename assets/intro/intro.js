(() => {
  "use strict";

  // Simple MP4 intro (NO luma-key / NO canvas)
  const CFG = {
    videoSrc: "assets/intro/intro.mp4",
    // Safety: never freeze the site if autoplay fails
    hardTimeoutMs: 16000,
  };

  const qs = (sel, el=document) => el.querySelector(sel);

  const overlay  = qs("#intro-overlay");
  const stage    = qs("#intro-stage");
  const siteRoot = qs("#site-root") || qs("main") || null;

  if (!overlay || !stage) return;

  // Lock scroll + hide site content during intro
  document.documentElement.classList.add("intro-active");
  document.body.classList.add("intro-active");
  document.body.classList.add("intro-running");
  if (siteRoot) siteRoot.setAttribute("aria-hidden", "true");

  // Inject video (idempotent)
  stage.innerHTML = `
    <div id="intro-video-wrap">
      <video id="intro-video" playsinline muted preload="auto"></video>
    </div>
  `;

  const video = qs("#intro-video", stage);
  video.src = CFG.videoSrc;

  function getFadeMs(){
    const v = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--intro-fade-ms"), 10);
    return Number.isFinite(v) ? v : 800;
  }

  function endIntro(){
    overlay.classList.add("intro-hidden");

    const fadeMs = getFadeMs();
    window.setTimeout(() => {
      overlay.style.display = "none";
      document.documentElement.classList.remove("intro-active");
      document.body.classList.remove("intro-active", "intro-running");
      document.documentElement.classList.add("intro-done");
      /* force-show-site */
      const siteLayer = qs("#site-layer");
      if (siteLayer){
        siteLayer.style.opacity = "1";
        siteLayer.style.visibility = "visible";
        siteLayer.style.pointerEvents = "auto";
        siteLayer.style.clipPath = "none";
        siteLayer.style.webkitClipPath = "none";
      }

      if (siteRoot) siteRoot.removeAttribute("aria-hidden");
    }, Math.max(200, fadeMs + 30));
  }

  // Best-effort autoplay
  let hardTimer = window.setTimeout(endIntro, CFG.hardTimeoutMs);

  video.play().then(() => {
    // Autoplay ok: reset safety timer based on duration
    clearTimeout(hardTimer);
    const durMs = (video.duration || 0) * 1000;
    hardTimer = window.setTimeout(endIntro, Math.max(CFG.hardTimeoutMs, durMs + 50));
  }).catch(() => {
    // Autoplay blocked: we will still exit after hardTimeoutMs
  });

  video.addEventListener("ended", () => {
    clearTimeout(hardTimer);
    endIntro();
  }, { once: true });

  // If autoplay was rejected, try again on first user gesture (still optional)
  const retry = () => {
    video.play().catch(() => {});
    window.removeEventListener("pointerdown", retry);
    window.removeEventListener("touchstart", retry);
  };
  window.addEventListener("pointerdown", retry, { once: true });
  window.addEventListener("touchstart", retry, { once: true });
})();

  /* watchdog-force-exit */
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      if (document.documentElement.classList.contains("intro-active")) {
        try { endIntro(); } catch(_e){}
      }
      const sl = document.querySelector("#site-layer");
      if (sl){
        sl.style.opacity = "1";
        sl.style.visibility = "visible";
        sl.style.pointerEvents = "auto";
        sl.style.clipPath = "none";
        sl.style.webkitClipPath = "none";
      }
    }, 18000);
  });
