
(() => {
  const body = document.body;
  const intro = document.getElementById("intro");
  const spacer = document.getElementById("intro-spacer");
  const site = document.getElementById("site");
  const arrow = document.getElementById("scrollArrow");
  const logo = document.getElementById("logoExplode");

  // already done this session
  if (sessionStorage.getItem("introDone") === "1") {
    if (intro) intro.remove();
    if (spacer) spacer.remove();
    site.classList.remove("site-hidden");
    site.classList.add("site-revealed");
    site.classList.add("reveal");
    requestAnimationFrame(() => site.classList.add("reveal-on"));
    return;
  }

  let pieces = [];
  let meta = null;

  // ---- 3s lock (not tied to full page load) ----
  let locked = true;
  body.classList.add("intro-lock");

  // We use virtual scroll during intro to avoid browser UI/address bar collapsing.
  let v = 0;                 // virtual progress 0..1
  let isAuto = false;
  let autoStart = 0;
  let autoV0 = 0;

  // timings (seconds)
  const T_EXPLODE = 1.5;     // explode to full
  const T_FADE = 1.0;        // fade to transparent (NOT to black)
  const T_PAUSE = 0.5;       // pause after fade
  const T_REVEAL = 1.25;     // reveal site (soft edge)
  const AUTO_TRIGGER = 0.30; // start auto after 30% progress

  // progress phases on v: [0..0.70] explode, [0.70..0.90] fade, [0.90..1] hold->finish
  const P_EXP_END = 0.70;
  const P_FADE_END = 0.90;

  // prevent default scrolling during intro (even after unlock)
  function prevent(e){ e.preventDefault(); }

  window.addEventListener("wheel", prevent, { passive:false });
  window.addEventListener("touchmove", prevent, { passive:false });

  setTimeout(() => {
    locked = false;
    body.classList.remove("intro-lock");
    if (arrow) arrow.classList.add("is-visible");
  }, 3000);

  // compute scale for 1200px logical logo inside responsive container
  function updateScale(){
    const box = logo?.parentElement?.getBoundingClientRect();
    if (!box || !logo) return;
    const scale = Math.min(box.width / 1200, box.height / 1200);
    logo.style.setProperty("--logoScale", String(scale));
  }
  window.addEventListener("resize", updateScale);

  function clamp01(x){ return Math.min(1, Math.max(0, x)); }

  function apply(v){
    // explode from 0..P_EXP_END
    const explode = clamp01(v / P_EXP_END);

    // fade to transparent from P_EXP_END-0.05..P_FADE_END (starts 0.2s before end in time; approx here)
    const fade = v <= P_EXP_END ? 0 : clamp01((v - P_EXP_END) / (P_FADE_END - P_EXP_END));

    // jitter fades out as explode progresses
    const j = (1 - explode);

    const now = performance.now() / 1000;

    pieces.forEach((el) => {
      const id = el.dataset.pid;
      const info = meta.piecesById[id];
      if (!info) return;

      const tx = info.dir.x * info.mag * explode;
      const ty = info.dir.y * info.mag * explode;

      const jx = Math.sin(now * 2.2 + el.__seed) * 1.1 * j;
      const jy = Math.cos(now * 2.0 + el.__seed*0.7) * 1.1 * j;

      el.style.transform = `translate3d(${tx + jx}px, ${ty + jy}px, 0)`;

      // fade to transparent (no black)
      el.style.opacity = String(1 - fade);
    });
  }

  function startAuto(){
    if (isAuto) return;
    isAuto = true;
    autoStart = performance.now();
    autoV0 = v;
    if (arrow) arrow.classList.remove("is-visible");
  }

  function finish(){
    sessionStorage.setItem("introDone", "1");
    // remove intro
    if (intro) intro.remove();
    if (spacer) spacer.remove();

    // reveal site softly
    site.classList.remove("site-hidden");
    site.classList.add("site-revealed", "reveal");
    requestAnimationFrame(() => site.classList.add("reveal-on"));

    // allow normal scroll again
    window.removeEventListener("wheel", prevent);
    window.removeEventListener("touchmove", prevent);
  }

  function tick(){
    if (!meta) { requestAnimationFrame(tick); return; }

    // If user has manually progressed past trigger, start auto sequence
    if (!locked && !isAuto && v >= AUTO_TRIGGER) startAuto();

    if (isAuto){
      const t = (performance.now() - autoStart) / 1000; // seconds
      // Map time to v progression: explode to 1 over 1.5s, fade over 1s, pause 0.5s, reveal 1.25s then finish.
      // We'll drive v until 1 to keep apply() coherent.
      const total = T_EXPLODE + T_FADE + T_PAUSE;
      const u = clamp01(t / total);
      v = autoV0 + (1 - autoV0) * u;
      v = clamp01(v);

      apply(v);

      // after total time, finish + reveal (reveal is CSS transition)
      if (t >= total){
        finish();
        return;
      }
    } else {
      apply(v);
    }

    requestAnimationFrame(tick);
  }

  function onWheel(e){
    if (locked || isAuto) return;
    // clamp delta to slow it down
    const delta = Math.max(-60, Math.min(60, e.deltaY));
    v = clamp01(v + delta / 2600); // slower progression
  }

  let touchY = null;
  function onTouchStart(e){
    if (locked || isAuto) return;
    touchY = e.touches?.[0]?.clientY ?? null;
  }
  function onTouchMove(e){
    if (locked || isAuto || touchY === null) return;
    const y = e.touches?.[0]?.clientY ?? touchY;
    const dy = touchY - y;
    touchY = y;
    const delta = Math.max(-40, Math.min(40, dy));
    v = clamp01(v + delta / 1800);
  }

  if (arrow){
    arrow.addEventListener("click", () => {
      if (locked) return;
      // jump to trigger, then auto
      v = Math.max(v, AUTO_TRIGGER);
      startAuto();
    });
  }

  async function init(){
    try{
      const res = await fetch("assets/intro/shards_meta.json", { cache:"no-store" });
      meta = await res.json();
      meta.piecesById = {};
      meta.pieces.forEach(p => meta.piecesById[p.id] = p);

      pieces = Array.from(document.querySelectorAll(".logo-piece"));
      pieces.forEach((el, idx) => {
        const m = /piece-(p\d+)/.exec(el.id);
        el.dataset.pid = m ? m[1] : "";
        el.__seed = idx + 1;
      });

      updateScale();
      apply(0);

      window.addEventListener("wheel", onWheel, { passive:false });
      window.addEventListener("touchstart", onTouchStart, { passive:false });
      window.addEventListener("touchmove", onTouchMove, { passive:false });

      requestAnimationFrame(tick);
    } catch(err){
      console.error(err);
      // fail open
      finish();
    }
  }

  // keep site hidden until finish
  site.classList.add("site-hidden");
  init();
})();
