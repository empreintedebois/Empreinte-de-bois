/* assets/intro/intro.js — RESPONSIVE + NO-FLASH + NO-DEADLOCK v19
   Goals:
   - Site hidden until intro ends (body.intro-done toggled)
   - G0: logos preload only, shards hidden
   - G1: fade-in motifs+text
   - T0: hold until shards fully decoded (with timeout fallback)
   - Explosion 1.5s
   - Recoil 1.0s
   - Merge without tremble (T4: stop shake before merge)
*/

(() => {
  "use strict";

  const DUR = {
    fadeIn: 500,
    restMin: 2000,
    explode: 1500,
    recoil: 1000,
    merge: 520,
    contemplate: 2000,
    fadeOut: 650,
    beforeReveal: 1000,
    shardWaitMax: 8000
  };

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const overlay = $("#intro-overlay");
  const stage = $("#intro-stage");
  const siteRoot = $("#site-root");
  const shardsLayer = $("#shards-layer");

  if (!overlay || !stage) {
    // Nothing to do; ensure site visible
    document.body.classList.remove("intro-running");
    document.body.classList.add("intro-done");
    return;
  }

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function waitImg(img){
    return new Promise((resolve) => {
      if (!img) return resolve(false);
      if (img.complete && img.naturalWidth > 0) return resolve(true);
      const done = () => resolve(img.naturalWidth > 0);
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  async function decodeSafe(img){
    if (!img) return false;
    try {
      if (img.decode) {
        await img.decode();
        return true;
      }
    } catch {}
    return await waitImg(img);
  }

  function fade(el, from, to, ms){
    if (!el) return Promise.resolve();
    el.style.opacity = String(from);
    const a = el.animate([{opacity: from},{opacity: to}], { duration: ms, fill:"forwards", easing:"ease-in-out" });
    return a.finished.catch(()=>{});
  }

  function computeShardsBox(){
    const text = stage.querySelector(".logo-text");
    if (!text || !shardsLayer) return;

    const sb = stage.getBoundingClientRect();
    const tb = text.getBoundingClientRect();

    // size shards layer to match the text logo area, relative to stage
    const w = Math.max(10, tb.width);
    const h = Math.max(10, tb.height);
    const pctW = (w / sb.width) * 100;
    const pctH = (h / sb.height) * 100;

    stage.style.setProperty("--shardsW", pctW.toFixed(3) + "%");
    stage.style.setProperty("--shardsH", pctH.toFixed(3) + "%");
  }

  async function loadShardsMeta(){
    // supports {count, files} or {shards:[{file}]}
    const metaUrls = [
      "assets/intro/shards_meta.json",
      "assets/intro/shards/meta.json"
    ];
    for (const url of metaUrls){
      try{
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const j = await res.json();
        if (Array.isArray(j?.shards) && j.shards.length){
          return j.shards.map(x => x.file).filter(Boolean);
        }
        if (Array.isArray(j?.files) && j.files.length){
          return j.files;
        }
        if (Number.isFinite(j?.count)) {
          const out = [];
          for (let i=1;i<=j.count;i++){
            out.push(`shards/shard_${String(i).padStart(3,"0")}.webp`);
          }
          return out;
        }
      }catch{}
    }
    // fallback: try to load 48 by convention
    return Array.from({length:48}, (_,i)=>`shards/shard_${String(i+1).padStart(3,"0")}.webp`);
  }

  async function ensureShardsInDom(){
    if (!shardsLayer) return [];
    if (shardsLayer.querySelector(".shard")) {
      return $$(".shard", shardsLayer);
    }

    const files = await loadShardsMeta();
    const frag = document.createDocumentFragment();

    const imgs = files.map((f) => {
      const img = document.createElement("img");
      img.className = "shard";
      img.alt = "";
      img.decoding = "async";
      img.loading = "eager";
      // file can be "shards/..." already
      const rel = f.startsWith("shards/") ? f : `shards/${f}`;
      img.src = `assets/intro/${rel}`;
      frag.appendChild(img);
      return img;
    });

    shardsLayer.appendChild(frag);
    return imgs;
  }

  function makeShakeAnimations(els){
    // Web Animations shake (no CSS transform conflicts)
    const anims = [];
    for (const el of els){
      if (!el) continue;
      const a = el.animate(
        [
          { transform: "translate3d(0,0,0)" },
          { transform: "translate3d(2px,-1px,0)" },
          { transform: "translate3d(-2px,1px,0)" },
          { transform: "translate3d(1px,2px,0)" },
          { transform: "translate3d(-1px,-2px,0)" },
          { transform: "translate3d(0,0,0)" }
        ],
        { duration: 180, iterations: Infinity, easing: "linear" }
      );
      anims.push(a);
    }
    return anims;
  }

  function stopAnims(anims){
    for (const a of anims){
      try{ a.cancel(); }catch{}
    }
  }

  async function run(){
    // Ensure site hidden immediately
    document.body.classList.remove("intro-done");
    document.body.classList.add("intro-running");

    const left = stage.querySelector(".logo-motif-left");
    const text = stage.querySelector(".logo-text");
    const right = stage.querySelector(".logo-motif-right");

    // G0: preload logos only
    await Promise.all([decodeSafe(left), decodeSafe(text), decodeSafe(right)]);
    computeShardsBox();

    // G1: fade-in logos (0.5s)
    await Promise.all([
      fade(left, 0, 1, DUR.fadeIn),
      fade(text, 0, 1, DUR.fadeIn),
      fade(right,0, 1, DUR.fadeIn),
    ]);

    // T0: strong shake + hold min 2s, while loading shards in parallel
    const shakeAnims = makeShakeAnimations([left, text, right]);

    const shardsPromise = (async()=>{
      const imgs = await ensureShardsInDom();
      // decode all shards (but don't block forever)
      const decodeAll = Promise.all(imgs.map(decodeSafe));
      await Promise.race([decodeAll, sleep(DUR.shardWaitMax)]);
      return imgs;
    })();

    // minimum rest time
    await sleep(DUR.restMin);

    // wait for shards to be present/decoded (bounded)
    const shards = await shardsPromise;

    // compute shards box again (viewport may have changed)
    computeShardsBox();

    // Transition text -> shards ONLY if we have shards
    if (shards && shards.length){
      // show shards + hide text (crossfade)
      shards.forEach(s => (s.style.opacity = "0"));
      // force rAF to avoid "blocked frame"
      await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));

      const fadeDur = 350;
      const tHide = text ? text.animate([{opacity:1},{opacity:0}], {duration:fadeDur, fill:"forwards", easing:"ease-in-out"}) : null;
      shards.forEach(s => s.animate([{opacity:0},{opacity:1}], {duration:fadeDur, fill:"forwards", easing:"ease-in-out"}));
      if (tHide) await tHide.finished.catch(()=>{});
    }

    // Stop shake BEFORE merge phase (T4 no tremble)
    stopAnims(shakeAnims);

    // Explosion shards (1.5s) — send out of view for all viewports
    if (shards && shards.length){
      const W = window.innerWidth;
      const H = window.innerHeight;
      const radius = Math.hypot(W, H) * 0.75;

      shards.forEach((s, i) => {
        const ang = (i / shards.length) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * (Math.PI / 10);
        const a = ang + jitter;
        const dx = Math.cos(a) * radius;
        const dy = Math.sin(a) * radius;
        const rot = (Math.random()*160 - 80);
        const sc  = 0.9 + Math.random()*0.6;

        s.animate(
          [
            { transform: "translate3d(0,0,0) rotate(0deg) scale(1)", opacity: 1 },
            { transform: `translate3d(${dx}px,${dy}px,0) rotate(${rot}deg) scale(${sc})`, opacity: 0 }
          ],
          { duration: DUR.explode, fill:"forwards", easing: "cubic-bezier(.2,.9,.2,1)" }
        );
      });

      await sleep(DUR.explode);
    }

    // Recoil (1s): slight scale down
    stage.animate([{transform:"translateZ(0) scale(1)"},{transform:"translateZ(0) scale(0.96)"}],
      { duration: DUR.recoil, fill:"forwards", easing:"ease-in-out" }
    );
    await sleep(120);

    // Merge: compute px offsets so L/R touch each other (independent of viewport)
    const sb = stage.getBoundingClientRect();
    const lb = left.getBoundingClientRect();
    const rb = right.getBoundingClientRect();
    const centerX = sb.left + sb.width / 2;

    // target: inner edges meet at centerX
    const dxL = (centerX - (lb.left + lb.width));
    const dxR = (centerX - rb.left);

    const aL = left.animate(
      [{ transform: "translate3d(0,0,0)" }, { transform: `translate3d(${dxL}px,0,0)` }],
      { duration: DUR.merge, fill:"forwards", easing:"cubic-bezier(.2,.9,.2,1)" }
    );
    const aR = right.animate(
      [{ transform: "translate3d(0,0,0)" }, { transform: `translate3d(${dxR}px,0,0)` }],
      { duration: DUR.merge, fill:"forwards", easing:"cubic-bezier(.2,.9,.2,1)" }
    );

    await Promise.all([aL.finished.catch(()=>{}), aR.finished.catch(()=>{})]);

    // Contemplation
    await sleep(DUR.contemplate);

    // Fade overlay out
    await fade(overlay, 1, 0, DUR.fadeOut);

    // End: show site + remove overlay + unlock scroll
    document.body.classList.remove("intro-running");
    document.body.classList.add("intro-done");
    overlay.remove();

    // Optional wait before your reveal starts (if you trigger reveal elsewhere)
    await sleep(DUR.beforeReveal);
  }

  // Start safely. If anything crashes: show site.
  window.addEventListener("DOMContentLoaded", () => {
    // ensure overlay visible (but logos are opacity 0 until JS fade)
    overlay.style.opacity = "1";
    computeShardsBox();
    window.addEventListener("resize", computeShardsBox, { passive: true });

    run().catch(() => {
      document.body.classList.remove("intro-running");
    document.body.classList.remove("intro-running");
      document.body.classList.add("intro-done");
      try { overlay.remove(); } catch {}
    });
  });
})();
