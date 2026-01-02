/* assets/intro/intro.js — v26 (Option B: JS creates overlay)
   Goals:
   - Single source of truth: no static intro markup required
   - Load motifs + logo text, then shards from shards_meta.json (meta.files)
   - Phases: G0 (3 logos + tremble) -> G1 (fade text->shards) -> P2 explode -> P3 recoil -> P3bis merge+zoom -> P4 shock -> P5 contemplate -> P6 fade -> P7 pause bg -> P8 reveal site
   - Never leave the user stuck: on any error, remove overlay + unlock scroll + show site
*/
(() => {
  "use strict";

  const DUR = {
    bootFade: 500,
    trembleMin: 2000,
    swapToShards: 450,
    explode: 1500,
    recoil: 1000,
    mergeMove: 520,
    shock: 420,
    contemplate: 2000,
    overlayFadeOut: 650,
    bgPause: 1000,
    siteReveal: 1000
  };

  const PATH = {
    left: "assets/intro/logo-motif-left.webp",
    right: "assets/intro/logo-motif-right.webp",
    text: "assets/intro/logo-texte.webp",
    meta: "assets/intro/shards_meta.json",
    shardsDir: "assets/intro/shards/"
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function lockScroll() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.touchAction = "none";
  }
  function unlockScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.documentElement.style.touchAction = "";
  }

  function setSiteHidden(hidden) {
    document.documentElement.classList.toggle("intro-pre", hidden);
    document.body.classList.toggle("intro-running", hidden);
    document.body.classList.toggle("intro-done", !hidden);
  }

  async function fetchMetaFiles() {
    const res = await fetch(PATH.meta, { cache: "no-store" });
    if (!res.ok) throw new Error("meta fetch failed " + res.status);
    const j = await res.json();
    if (Array.isArray(j.files) && j.files.length) return j.files;
    if (Number.isFinite(j.count)) {
      const out = [];
      for (let i = 1; i <= j.count; i++) out.push("shard_" + String(i).padStart(3, "0") + ".webp");
      return out;
    }
    throw new Error("meta has no files");
  }

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "intro-overlay";

    // background (kept behind everything, no black)
    const bg = document.createElement("div");
    bg.className = "intro-bg";
    bg.innerHTML = `
      <div class="intro-bg-layer intro-bg-gray"></div>
      <div class="intro-bg-layer intro-bg-gold"></div>
      <div class="intro-bg-layer intro-bg-halo"></div>
    `;
    overlay.appendChild(bg);

    const stage = document.createElement("div");
    stage.id = "intro-stage";
    overlay.appendChild(stage);

    const shock = document.createElement("div");
    shock.id = "intro-shockwave";
    stage.appendChild(shock);

    const row = document.createElement("div");
    row.id = "intro-row";
    stage.appendChild(row);

    const left = document.createElement("img");
    left.id = "intro-logo-left";
    left.className = "logo-motif";
    left.alt = "";
    left.decoding = "async";
    left.loading = "eager";
    left.src = PATH.left;

    const right = document.createElement("img");
    right.id = "intro-logo-right";
    right.className = "logo-motif";
    right.alt = "";
    right.decoding = "async";
    right.loading = "eager";
    right.src = PATH.right;

    const center = document.createElement("div");
    center.id = "intro-center";

    const text = document.createElement("img");
    text.id = "intro-logo-text";
    text.className = "logo-text";
    text.alt = "";
    text.decoding = "async";
    text.loading = "eager";
    text.src = PATH.text;

    const shards = document.createElement("div");
    shards.id = "intro-shards";
    const box = document.createElement("div");
    box.id = "intro-shards-box";
    shards.appendChild(box);

    center.appendChild(text);
    center.appendChild(shards);

    row.appendChild(left);
    row.appendChild(center);
    row.appendChild(right);

    // reveal curtain (over the site, under overlay fade)
    const reveal = document.createElement("div");
    reveal.id = "intro-reveal";
    reveal.innerHTML = `<div class="laser-head"></div>`;
    overlay.appendChild(reveal);

    document.body.appendChild(overlay);

    return { overlay, bg, stage, row, left, right, center, text, shards, box, shock, reveal };
  }

  function addClass(el, cls, on) {
    if (!el) return;
    el.classList.toggle(cls, !!on);
  }

  function setOpacity(el, v) { el.style.opacity = String(v); }

  function pingShock(els) {
    els.shock.classList.remove("ping");
    void els.shock.offsetWidth;
    els.shock.classList.add("ping");
  }

  function computeMergeTouchOffsets(els) {
    // Make inner edges meet at center
    const sb = els.stage.getBoundingClientRect();
    const lb = els.left.getBoundingClientRect();
    const rb = els.right.getBoundingClientRect();
    const centerX = sb.left + sb.width * 0.5;
    const leftInner = lb.right;   // inner edge
    const rightInner = rb.left;   // inner edge
    return { dxL: centerX - leftInner, dxR: centerX - rightInner };
  }

  function applyResponsiveSizing(els) {
    // target: keep 3 logos visible, same height, across devices
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // space for margins
    const maxH = vh * 0.78;
    const minH = Math.min(520, vh * 0.6);

    // ratios: motif is 1:3 (W=H/3), text is 16:9 (W=H*16/9)
    // total width = H/3 + H*16/9 + H/3 = H*(2/3 + 16/9) = H*(6/9 + 16/9)=H*(22/9)
    const hByWidth = (vw * 0.92) * (9 / 22);

    const H = Math.max(120, Math.min(maxH, Math.max(minH, hByWidth)));
    document.documentElement.style.setProperty("--intro-logo-h", `${H}px`);
  }

  async function buildShards(els, files) {
    const urls = files.map(f => PATH.shardsDir + f);
    // Create img elements first
    const frag = document.createDocumentFragment();
    const imgs = [];
    for (const url of urls) {
      const img = document.createElement("img");
      img.className = "intro-shard";
      img.alt = "";
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
      frag.appendChild(img);
      imgs.push(img);
    }
    els.box.innerHTML = "";
    els.box.appendChild(frag);

    // Wait for all to load
    await Promise.all(imgs.map(im => new Promise((resolve, reject) => {
      if (im.complete && im.naturalWidth) return resolve();
      im.addEventListener("load", () => resolve(), { once: true });
      im.addEventListener("error", () => reject(new Error("shard load failed: " + im.src)), { once: true });
    })));
    return imgs;
  }

  function explodeShards(imgs, strength = 1.0) {
    const n = imgs.length;
    const maxR = 1800 * strength; // will be clamped by viewport implicitly
    const base = Math.min(window.innerWidth, window.innerHeight);
    const radius = Math.max(base * 0.9, base + 300);
    imgs.forEach((img, i) => {
      const t = i / Math.max(1, (n - 1));
      const ang = (t * Math.PI * 2) + (Math.random() * 0.55 - 0.275);
      const r = radius * (0.75 + Math.random() * 0.55);
      const dx = Math.cos(ang) * r;
      const dy = Math.sin(ang) * r;
      const rot = (Math.random() * 70 - 35);
      img.dataset.dx = String(dx);
      img.dataset.dy = String(dy);
      img.dataset.rot = String(rot);
    });
  }

  async function run() {
    // Ensure base sizing
    applyResponsiveSizing(null);
    const els = createOverlay();

    // Hide site & lock scroll
    setSiteHidden(true);
    lockScroll();

    // ensure overlay visible (no flash)
    setOpacity(els.overlay, 0);
    await els.overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DUR.bootFade, fill: "forwards", easing: "ease-out" }).finished.catch(() => {});

    // responsive sizing updates
    applyResponsiveSizing(els);
    window.addEventListener("resize", () => applyResponsiveSizing(els), { passive: true });

    // G0: show 3 logos, weak tremble all, then strong on center when shards are being prepared
    addClass(els.text, "shake-weak", true);
    addClass(els.left, "shake-weak", true);
    addClass(els.right, "shake-weak", true);

    // Load base images
    await Promise.all([
      els.left.decode?.().catch(() => {}),
      els.text.decode?.().catch(() => {}),
      els.right.decode?.().catch(() => {})
    ]);

    // Start loading shards in parallel during the initial 2 seconds
    const metaP = fetchMetaFiles();
    const minP = sleep(DUR.trembleMin);

    // Once we start shard preload, center tremble stronger (text only)
    addClass(els.text, "shake-strong", true);

    const files = await metaP; // may finish before minP; ok
    const shardsP = buildShards(els, files);

    await minP; // guarantee at least 2s of contemplation with 3 logos

    // Wait shards ready
    const imgs = await shardsP;

    // G1: fade text out, shards in (keep motifs visible)
    setOpacity(els.shards, 0);
    els.shards.style.display = "block";
    await Promise.all([
      els.text.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DUR.swapToShards, fill: "forwards", easing: "ease-in-out" }).finished.catch(()=>{}),
      els.shards.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DUR.swapToShards, fill: "forwards", easing: "ease-in-out" }).finished.catch(()=>{})
    ]);
    // stop text tremble after swap (text is hidden anyway)
    addClass(els.text, "shake-weak", false);
    addClass(els.text, "shake-strong", false);

    // P2: explode shards (strong tremble motifs)
    addClass(els.left, "shake-strong", true);
    addClass(els.right, "shake-strong", true);
    addClass(els.left, "shake-weak", false);
    addClass(els.right, "shake-weak", false);

    explodeShards(imgs, 1.0);

    const explodeAnim = imgs.map(img => {
      const dx = Number(img.dataset.dx || 0);
      const dy = Number(img.dataset.dy || 0);
      const rot = Number(img.dataset.rot || 0);
      return img.animate(
        [{ transform: "translate3d(0,0,0) rotate(0deg) scale(1)" },
         { transform: `translate3d(${dx}px,${dy}px,0) rotate(${rot}deg) scale(1.15)` }],
        { duration: DUR.explode, fill: "forwards", easing: "cubic-bezier(.2,.8,.2,1)" }
      );
    });
    await Promise.all(explodeAnim.map(a => a.finished.catch(()=>{})));

    // P3: recoil (subtle zoom back of stage) + tremble motifs continues
    els.stage.animate([{ transform: "scale(1)" }, { transform: "scale(0.92)" }], { duration: DUR.recoil, fill: "forwards", easing: "ease-in-out" });
    await sleep(120);

    // T1: fade shards away
    await els.shards.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520, fill: "forwards", easing: "ease-in-out" }).finished.catch(()=>{});
    els.shards.style.display = "none";

    // P3bis: merge motifs + zoom in
    const { dxL, dxR } = computeMergeTouchOffsets(els);
    const aL = els.left.animate(
      [{ transform: "translate3d(0,0,0)" }, { transform: `translate3d(${dxL}px,0,0)` }],
      { duration: DUR.mergeMove, fill: "forwards", easing: "cubic-bezier(.2,.9,.2,1)" }
    );
    const aR = els.right.animate(
      [{ transform: "translate3d(0,0,0)" }, { transform: `translate3d(${dxR}px,0,0)` }],
      { duration: DUR.mergeMove, fill: "forwards", easing: "cubic-bezier(.2,.9,.2,1)" }
    );

    // Stop motif tremble once merged finishes
    await Promise.all([aL.finished.catch(()=>{}), aR.finished.catch(()=>{})]);
    addClass(els.left, "shake-strong", false);
    addClass(els.right, "shake-strong", false);

    // P4: shockwave
    pingShock(els);
    await sleep(DUR.shock);

    // P5: contemplation
    await sleep(DUR.contemplate);

    // P6: fade out motifs
    await Promise.all([
      els.left.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DUR.overlayFadeOut, fill: "forwards", easing: "ease-in-out" }).finished.catch(()=>{}),
      els.right.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DUR.overlayFadeOut, fill: "forwards", easing: "ease-in-out" }).finished.catch(()=>{})
    ]);

    // P7: pause bg only
    await sleep(DUR.bgPause);

    // P8: reveal site (curtain down)
    document.body.classList.add("intro-revealing");
    await els.reveal.animate([{ transform: "translate3d(0,-100%,0)" }, { transform: "translate3d(0,0%,0)" }], { duration: DUR.siteReveal, fill: "forwards", easing: "ease-in-out" }).finished.catch(()=>{});

    // show site now
    document.body.classList.add("site-revealed");
    setSiteHidden(false);
    unlockScroll();

    // fade overlay out and remove
    await els.overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DUR.overlayFadeOut, fill: "forwards", easing: "ease-in-out" }).finished.catch(()=>{});
    try { els.overlay.remove(); } catch {}

    document.body.classList.remove("intro-running");
    document.body.classList.add("intro-done");
    document.documentElement.classList.remove("intro-pre");
  }

  window.addEventListener("DOMContentLoaded", () => {
    // If it crashes, don't keep the site hidden.
    run().catch((e) => {
      console.error(e);
      try {
        document.getElementById("intro-overlay")?.remove();
      } catch {}
      setSiteHidden(false);
      unlockScroll();
    });
  });
})();
