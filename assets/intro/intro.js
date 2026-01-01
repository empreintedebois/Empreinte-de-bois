/* assets/intro/intro.js — FIX v21 (no deadlock, responsive, strict shards gating)
   Macro flow (based on our agreed variables):
   - G0: show 3 logos (no shards), strong shake during rest
   - G1: fade-in 0.5s
   - Hold >= 2s with shake while preloading shards
   - T0: wait until ALL shards loaded/decoded
   - Crossfade logo-text -> shards (0.5s)
   - Explosion 1.5s
   - Recoil 1.0s
   - Merge motifs (compute px offsets so they TOUCH, not overlap), stop shake at T4
   - Contemplation 2.0s
   - Fade out overlay -> show site, unlock scroll
*/

(() => {
  "use strict";

  const DUR = {
    fadeIn: 500,
    rest: 2000,
    crossfade: 500,
    explode: 1500,
    recoil: 1000,
    mergeMove: 520,
    contemplation: 2000,
    overlayFadeOut: 650,
  };

  const PATH = {
    left: "assets/intro/logo-motif-left.webp",
    right: "assets/intro/logo-motif-right.webp",
    text: "assets/intro/logo-texte.webp",
    meta: "assets/intro/shards_meta.json",
    shardsDir: "assets/intro/shards/"
  };

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function waitImg(img){
    return new Promise(resolve => {
      if (!img) return resolve(false);
      if (img.complete && img.naturalWidth > 0) return resolve(true);
      img.addEventListener("load", () => resolve(true), { once:true });
      img.addEventListener("error", () => resolve(false), { once:true });
    });
  }

  async function preloadUrl(url){
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;
    const ok = await waitImg(img);
    // decode improves rendering readiness (avoid half shards popping)
    if (ok && img.decode){
      try{ await img.decode(); }catch{}
    }
    return ok;
  }

  function lockScroll(){
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.touchAction = "none";
  }
  function unlockScroll(){
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.documentElement.style.touchAction = "";
  }

  function ensureDom(){
    // overlay
    let overlay = document.getElementById("intro-overlay");
    if (!overlay){
      overlay = document.createElement("div");
      overlay.id = "intro-overlay";
      document.body.appendChild(overlay);
    }

    let stage = document.getElementById("intro-stage");
    if (!stage){
      stage = document.createElement("div");
      stage.id = "intro-stage";
      overlay.appendChild(stage);
    }

    let row = document.getElementById("intro-row");
    if (!row){
      row = document.createElement("div");
      row.id = "intro-row";
      stage.appendChild(row);
    }

    function ensureImg(id, cls, src){
      let el = document.getElementById(id);
      if (!el){
        el = document.createElement("img");
        el.id = id;
        el.className = cls;
        row.appendChild(el);
      }
      el.src = src;
      return el;
    }

    const left = ensureImg("intro-logo-left", "logo-motif left", PATH.left);
    const text = ensureImg("intro-logo-text", "logo-text", PATH.text);
    const right = ensureImg("intro-logo-right", "logo-motif right", PATH.right);

    // shards layer
    let shards = document.getElementById("intro-shards");
    if (!shards){
      shards = document.createElement("div");
      shards.id = "intro-shards";
      stage.appendChild(shards);
    }
    let box = document.getElementById("intro-shards-box");
    if (!box){
      box = document.createElement("div");
      box.id = "intro-shards-box";
      shards.appendChild(box);
    }

    // shockwave
    let shock = document.getElementById("intro-shockwave");
    if (!shock){
      shock = document.createElement("div");
      shock.id = "intro-shockwave";
      stage.appendChild(shock);
    }

    return { overlay, stage, row, left, text, right, shards, box, shock };
  }

  function measureTextBox(wrapEls){
    const { stage, text } = wrapEls;
    const stageRect = stage.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    const w = Math.max(10, textRect.width);
    const h = Math.max(10, textRect.height);
    const pctW = (w / stageRect.width) * 100;
    const pctH = (h / stageRect.height) * 100;
    stage.style.setProperty("--textW", pctW.toFixed(3) + "%");
    stage.style.setProperty("--textH", pctH.toFixed(3) + "%");
  }

  async function loadMetaFiles(){
    try{
      const res = await fetch(PATH.meta, { cache:"no-store" });
      if (!res.ok) return null;
      const j = await res.json();
      if (Array.isArray(j.files) && j.files.length) return j.files;
      if (Array.isArray(j.shards) && j.shards.length) return j.shards.map(s => s.file).filter(Boolean);
      if (Number.isFinite(j.count)){
        const out = [];
        for (let i=1;i<=j.count;i++){
          out.push("shard_" + String(i).padStart(3,"0") + ".webp");
        }
        return out;
      }
      return null;
    }catch{
      return null;
    }
  }

  async function preloadAllShards(files){
    // strict preload: ALL shards must be loaded/decoded before we show them
    const urls = files.map(f => PATH.shardsDir + f);
    const results = await Promise.all(urls.map(preloadUrl));
    const okCount = results.filter(Boolean).length;
    return { urls, results, okCount };
  }

  function buildShardDom(box, urls){
    box.innerHTML = "";
    const frag = document.createDocumentFragment();
    const imgs = [];
    for (const url of urls){
      const img = document.createElement("img");
      img.className = "intro-shard";
      img.alt = "";
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
      frag.appendChild(img);
      imgs.push(img);
    }
    box.appendChild(frag);
    return imgs;
  }

  function setOpacity(el, v){ el.style.opacity = String(v); }

  function addShake(els, on){
    [els.left, els.text, els.right].forEach(e => e.classList.toggle("shake-strong", !!on));
  }

  function ping(els){
    els.shock.classList.remove("ping");
    void els.shock.offsetWidth;
    els.shock.classList.add("ping");
  }

  function computeMergeTouchOffsets(els){
    // Goal: make left/right motifs TOUCH (their inner edges meet), regardless of screen size
    const sb = els.stage.getBoundingClientRect();
    const lb = els.left.getBoundingClientRect();
    const rb = els.right.getBoundingClientRect();
    const center = sb.left + sb.width/2;

    const leftInnerEdge = lb.left + lb.width;
    const rightInnerEdge = rb.left;

    const dxL = center - leftInnerEdge;   // push left toward center
    const dxR = center - rightInnerEdge;  // push right toward center

    return { dxL, dxR };
  }

  async function run(){
    const els = ensureDom();

    // prevent site flash
    document.documentElement.classList.add("intro-pre");
    document.body.classList.add("intro-running");

    lockScroll();

    // G0: preload logos only
    await Promise.all([waitImg(els.left), waitImg(els.text), waitImg(els.right)]);
    if (els.left.decode) { try{ await els.left.decode(); }catch{} }
    if (els.text.decode) { try{ await els.text.decode(); }catch{} }
    if (els.right.decode){ try{ await els.right.decode(); }catch{} }

    // measure after images are ready
    measureTextBox(els);
    window.addEventListener("resize", () => measureTextBox(els), { passive:true });

    // fade-in overlay + logos
    els.overlay.style.opacity = "1";
    setOpacity(els.left, 0); setOpacity(els.text, 0); setOpacity(els.right, 0);

    els.left.animate([{opacity:0},{opacity:1}], { duration:DUR.fadeIn, fill:"forwards", easing:"ease-out" });
    els.text.animate([{opacity:0},{opacity:1}], { duration:DUR.fadeIn, fill:"forwards", easing:"ease-out" });
    els.right.animate([{opacity:0},{opacity:1}],{ duration:DUR.fadeIn, fill:"forwards", easing:"ease-out" });

    // strong shake during rest
    addShake(els, true);

    // Start shards preload during rest
    const files = (await loadMetaFiles()) || [];
    const shardsJob = (files.length ? preloadAllShards(files) : Promise.resolve({urls:[], results:[], okCount:0}));

    // Rest minimum 2s
    await sleep(DUR.rest);

    // T0: wait until ALL shards loaded (strict)
    const shardInfo = await shardsJob;
    const allOk = shardInfo.urls.length > 0 && shardInfo.okCount === shardInfo.urls.length;

    // If shards not all OK, we do NOT switch to shards (avoids "half shards" state)
    // We still continue the sequence using the logo-text as fallback.
    let shardImgs = [];
    if (allOk){
      shardImgs = buildShardDom(els.box, shardInfo.urls);
      // Wait DOM imgs decode too (avoid partial draw)
      await Promise.all(shardImgs.map(waitImg));
      for (const im of shardImgs){
        if (im.decode){ try{ await im.decode(); }catch{} }
      }
      // Allow the browser to paint once
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    // Crossfade text -> shards (0.5s)
    if (allOk){
      // show shards
      shardImgs.forEach(im => setOpacity(im, 1));
      const aText = els.text.animate([{opacity:1},{opacity:0}], { duration:DUR.crossfade, fill:"forwards", easing:"ease-in-out" });
      shardImgs.forEach(im => im.animate([{opacity:0},{opacity:1}], { duration:DUR.crossfade, fill:"forwards", easing:"ease-in-out" }));
      try{ await aText.finished; }catch{}
    }

    // T4: stop shake before explosion/merge
    addShake(els, false);

    // Explosion 1.5s (shards if available, else logo-text)
    const W = window.innerWidth;
    const H = window.innerHeight;
    const radius = Math.hypot(W, H) * 0.75;

    const explodeTargets = allOk ? shardImgs : [els.text];
    const N = explodeTargets.length;

    explodeTargets.forEach((t, i) => {
      const ang = (i / Math.max(1, N)) * Math.PI * 2;
      const dx = Math.cos(ang) * radius;
      const dy = Math.sin(ang) * radius;
      const rot = (Math.random()*140 - 70);
      const sc  = 0.9 + Math.random()*0.7;
      t.animate(
        [{ transform:"translate3d(0,0,0) rotate(0deg) scale(1)", opacity:1 },
         { transform:`translate3d(${dx}px,${dy}px,0) rotate(${rot}deg) scale(${sc})`, opacity:0 }],
        { duration:DUR.explode, fill:"forwards", easing:"cubic-bezier(.2,.9,.2,1)" }
      );
    });

    await sleep(DUR.explode);

    // Recoil 1s (subtle zoom back of the whole stage)
    els.stage.animate([{transform:"scale(1)"},{transform:"scale(0.96)"}], { duration:DUR.recoil, fill:"forwards", easing:"ease-in-out" });
    await sleep(120);

    // Merge: compute px offsets so motifs TOUCH
    const { dxL, dxR } = computeMergeTouchOffsets(els);

    const aL = els.left.animate(
      [{ transform:"translate3d(0,0,0)"},{ transform:`translate3d(${dxL}px,0,0)`}],
      { duration:DUR.mergeMove, fill:"forwards", easing:"cubic-bezier(.2,.9,.2,1)" }
    );
    const aR = els.right.animate(
      [{ transform:"translate3d(0,0,0)"},{ transform:`translate3d(${dxR}px,0,0)`}],
      { duration:DUR.mergeMove, fill:"forwards", easing:"cubic-bezier(.2,.9,.2,1)" }
    );

    await sleep(420);
    ping(els);
    try{ await Promise.all([aL.finished, aR.finished]); }catch{}

    // Contemplation 2s
    await sleep(DUR.contemplation);

    // Fade out overlay -> reveal site
    await els.overlay.animate([{opacity:1},{opacity:0}], { duration:DUR.overlayFadeOut, fill:"forwards", easing:"ease-in-out" }).finished.catch(()=>{});

    // End intro
    try{ els.overlay.remove(); }catch{}
    document.body.classList.remove("intro-running");
    document.body.classList.add("intro-done");
    document.documentElement.classList.remove("intro-pre");

    unlockScroll();
  }

  window.addEventListener("DOMContentLoaded", () => {
    // Start immediately; if it crashes, don't keep the site hidden.
    run().catch(() => {
      document.body.classList.remove("intro-running");
      document.body.classList.add("intro-done");
      document.documentElement.classList.remove("intro-pre");
      unlockScroll();
      const ov = document.getElementById("intro-overlay");
      if (ov) { try{ ov.remove(); }catch{} }
    });
  });
})();
