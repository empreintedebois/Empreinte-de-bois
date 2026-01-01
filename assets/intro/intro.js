
// assets/intro/intro.js
(() => {
  "use strict";

  // ---- Réglages macro (adaptés à tes dernières règles) ----
  // G0 OK sans shard
  // G1 fade text et motif
  // T0 jusqu'à chargement des shards
  // T4 plus de tremblement

  const TIMING = {
    fadeInAll: 500,           // G1: 0.5s
    restBeforeExplode: 2000,  // repos + tremblement (3 logos visibles)
    explode: 1500,            // shards explose
    recoil: 1000,             // recul motifs (phase recul)
    contemplationAfterMerge: 2000, // contemplation après réunion
    fadeToSite: 650,
    siteHoldBeforeReveal: 1000
  };

  const SELECTORS = {
    overlay: "#intro-overlay",
    stage: "#intro-stage",
    wrap: ".intro-wrap",
    row: ".intro-row",
    logoText: ".logo-text",
    logoLeft: ".logo-motif.left",
    logoRight: ".logo-motif.right",
    shardsLayer: "#intro-shards",
    shock: "#intro-shockwave"
  };

  const state = {
    shardsReady: false,
    started: false
  };

  function qs(sel, root = document){ return root.querySelector(sel); }
  function qsa(sel, root = document){ return Array.from(root.querySelectorAll(sel)); }

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  function waitImg(img){
    return new Promise((resolve) => {
      if (!img) return resolve();
      if (img.complete && img.naturalWidth > 0) return resolve();
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    });
  }

  function lockScroll(){
    document.documentElement.classList.add("intro-lock");
  }

  function unlockScroll(){
    document.documentElement.classList.remove("intro-lock");
  }

  function ensureOverlayDom(){
    let ov = qs(SELECTORS.overlay);
    if (ov) return ov;

    ov = document.createElement("div");
    ov.id = "intro-overlay";

    const stage = document.createElement("div");
    stage.id = "intro-stage";

    // Structure attendue (si ton index l’a déjà, ça ne gêne pas)
    const wrap = document.createElement("div");
    wrap.className = "intro-wrap";

    const row = document.createElement("div");
    row.className = "intro-row";

    const left = document.createElement("img");
    left.className = "logo-motif left";
    left.alt = "logo motif left";
    left.src = "assets/intro/logo-motif-left.webp";

    const text = document.createElement("img");
    text.className = "logo-text";
    text.alt = "logo texte";
    text.src = "assets/intro/logo-texte.webp";

    const right = document.createElement("img");
    right.className = "logo-motif right";
    right.alt = "logo motif right";
    right.src = "assets/intro/logo-motif-right.webp";

    row.append(left, text, right);

    const shardsLayer = document.createElement("div");
    shardsLayer.id = "intro-shards";

    const shardsBox = document.createElement("div");
    shardsBox.className = "shards-box";
    shardsLayer.appendChild(shardsBox);

    const shock = document.createElement("div");
    shock.id = "intro-shockwave";

    wrap.append(row, shardsLayer, shock);
    stage.appendChild(wrap);
    ov.appendChild(stage);
    document.body.appendChild(ov);

    return ov;
  }

  function measureTextBox(){
    const wrap = qs(SELECTORS.wrap);
    const text = qs(SELECTORS.logoText);
    if (!wrap || !text) return;

    // On calque la boîte shards sur la boîte réelle du logo texte
    const wrapRect = wrap.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();

    const w = Math.max(10, textRect.width);
    const h = Math.max(10, textRect.height);

    // variables CSS en % de wrap pour rester responsive sans recalc d’origines
    const pctW = (w / wrapRect.width) * 100;
    const pctH = (h / wrapRect.height) * 100;

    wrap.style.setProperty("--textW", pctW.toFixed(3) + "%");
    wrap.style.setProperty("--textH", pctH.toFixed(3) + "%");
  }

  async function loadShardsMeta(){
    // accepte plusieurs formats (on ne casse pas ton historique)
    const urls = [
      "assets/intro/shards_meta.json",
      "assets/intro/shards/meta.json",
      "assets/intro/shards_meta.json?cb=" + Date.now()
    ];

    for (const url of urls){
      try{
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const json = await res.json();

        // A) { shards:[{file:"shards/s01.webp"}] }
        if (json && Array.isArray(json.shards) && json.shards.length){
          return json.shards.map(s => s.file).filter(Boolean);
        }

        // B) { files:["shards/s01.webp", ...] }
        if (json && Array.isArray(json.files) && json.files.length){
          return json.files;
        }

        // C) { count:N, prefix:"shards/shard_", ext:".webp" }
        if (json && Number.isFinite(json.count)){
          const out = [];
          const prefix = json.prefix || "shards/shard_";
          const ext = json.ext || ".webp";
          for (let i=1;i<=json.count;i++){
            out.push(prefix + String(i).padStart(3,"0") + ext);
          }
          return out;
        }
      }catch(_e){
        // try next
      }
    }

    // fallback: on tente 48 par défaut (si le meta manque)
    const fallback = [];
    for (let i=1;i<=48;i++){
      fallback.push("shards/shard_" + String(i).padStart(3,"0") + ".webp");
    }
    return fallback;
  }

  async function ensureShardsInDom(){
    const box = qs("#intro-shards .shards-box");
    if (!box) return [];

    if (box.dataset.ready === "1"){
      return qsa("img.intro-shard", box);
    }

    const files = await loadShardsMeta();

    // construit les <img> en full-frame (même origine), pas de recalcul de positions
    box.innerHTML = "";
    const imgs = files.map((file, idx) => {
      const img = document.createElement("img");
      img.className = "intro-shard";
      img.alt = "shard " + (idx+1);
      img.src = "assets/intro/" + file.replace(/^assets\/intro\//, "");
      img.style.opacity = "0";
      box.appendChild(img);
      return img;
    });

    // attendre chargement complet
    await Promise.all(imgs.map(waitImg));
    box.dataset.ready = "1";
    state.shardsReady = true;

    return imgs;
  }

  function setOpacity(el, v){
    if (!el) return;
    el.style.opacity = String(v);
  }

  function animate(el, kf, opt){
    if (!el) return null;
    try { return el.animate(kf, opt); } catch { return null; }
  }

  function addShake(on){
    const left = qs(SELECTORS.logoLeft);
    const right = qs(SELECTORS.logoRight);
    const text = qs(SELECTORS.logoText);
    [left,right,text].forEach(el => {
      if (!el) return;
      el.classList.toggle("shake-strong", !!on);
    });
  }

  function pingShock(){
    const shock = qs(SELECTORS.shock);
    if (!shock) return;
    shock.classList.remove("ping");
    // force reflow
    void shock.offsetWidth;
    shock.classList.add("ping");
  }

  async function runIntro(){
    if (state.started) return;
    state.started = true;

    const ov = ensureOverlayDom();
    const stage = qs(SELECTORS.stage);
    const wrap = qs(SELECTORS.wrap);
    const text = qs(SELECTORS.logoText);
    const left = qs(SELECTORS.logoLeft);
    const right = qs(SELECTORS.logoRight);

    // G0 : overlay ON, sans shards visibles
    lockScroll();
    ov.classList.add("is-on");

    // attend les logos
    await Promise.all([waitImg(left), waitImg(text), waitImg(right)]);

    // force une mesure avant shards (sinon tailles foireuses)
    measureTextBox();
    window.addEventListener("resize", measureTextBox, { passive: true });

    // tout invisible => fade in propre
    setOpacity(left, 0);
    setOpacity(text, 0);
    setOpacity(right, 0);

    // G1 : fade text et motif
    animate(left, [{opacity:0},{opacity:1}], {duration: TIMING.fadeInAll, fill:"forwards", easing:"ease-out"});
    animate(text, [{opacity:0},{opacity:1}], {duration: TIMING.fadeInAll, fill:"forwards", easing:"ease-out"});
    animate(right,[{opacity:0},{opacity:1}], {duration: TIMING.fadeInAll, fill:"forwards", easing:"ease-out"});

    // tremblement fort pendant repos
    addShake(true);

    // T0 : on charge les shards EN PARALLÈLE pendant le repos
    const shardsPromise = ensureShardsInDom();

    // repos minimum (2s)
    await sleep(TIMING.restBeforeExplode);

    // si shards pas prêts, on attend (c’est LA condition que tu demandais)
    const shards = await shardsPromise;

    // Fade 0.5 “propre” (ton point 1)
    // => on garantit que tout est affiché clean avant de passer en phase shards
    await sleep(80);

    // Fade entre logo texte et shards (ton point 2)
    // shards apparaissent au-dessus, logo texte disparaît
    shards.forEach(s => setOpacity(s, 1));
    const fadeDur = 350;

    const a1 = animate(text, [{opacity:1},{opacity:0}], {duration: fadeDur, fill:"forwards", easing:"ease-in-out"});
    // shards déjà opacity 1 (sinon effet “pop”), on peut micro-fader:
    shards.forEach(s => animate(s, [{opacity:0},{opacity:1}], {duration: fadeDur, fill:"forwards", easing:"ease-in-out"}));
    if (a1) await a1.finished.catch(()=>{});

    // T4 : plus de tremblement (tu le veux à partir d’ici)
    addShake(false);

    // PHASE : Explosion shards (1.5s)
    // On envoie les shards hors champ (pas d’effet “mur invisible”)
    const W = window.innerWidth;
    const H = window.innerHeight;
    const radius = Math.hypot(W, H) * 0.65;

    const explodes = shards.map((s, i) => {
      const ang = (i / Math.max(1, shards.length)) * Math.PI * 2;
      const dx = Math.cos(ang) * radius;
      const dy = Math.sin(ang) * radius;
      const rot = (Math.random()*120 - 60);
      const sc  = 0.85 + Math.random()*0.6;

      return animate(s, [
        { transform: "translate3d(0,0,0) rotate(0deg) scale(1)", opacity: 1 },
        { transform: `translate3d(${dx}px,${dy}px,0) rotate(${rot}deg) scale(${sc})`, opacity: 0 }
      ], { duration: TIMING.explode, fill:"forwards", easing:"cubic-bezier(.2,.9,.2,1)" });
    });

    await sleep(TIMING.explode);

    // PHASE : motifs reculent puis fusionnent (recoil ~ 1s)
    // Ils doivent se toucher AU CENTRE sans “coller au texte”
    // Le texte est déjà invisible, donc centre = milieu.
    const recoil = animate(wrap, [
      { transform: "scale(1)" },
      { transform: "scale(0.96)" }
    ], { duration: TIMING.recoil, fill:"forwards", easing:"ease-in-out" });

    await sleep(120);
    // Fusion : on rapproche les motifs vers le centre + onde
    // (On joue sur translate X, pas sur grid)
    const leftA = animate(left, [
      { transform: "translate3d(0,0,0)" },
      { transform: "translate3d(18vw,0,0)" }
    ], { duration: 520, fill:"forwards", easing:"cubic-bezier(.2,.9,.2,1)" });

    const rightA = animate(right, [
      { transform: "translate3d(0,0,0)" },
      { transform: "translate3d(-18vw,0,0)" }
    ], { duration: 520, fill:"forwards", easing:"cubic-bezier(.2,.9,.2,1)" });

    await sleep(420);
    pingShock();

    if (recoil) await recoil.finished.catch(()=>{});
    if (leftA) await leftA.finished.catch(()=>{});
    if (rightA) await rightA.finished.catch(()=>{});

    // contemplation (2s)
    await sleep(TIMING.contemplationAfterMerge);

    // Fade vers site (overlay out)
    const fadeOut = animate(ov, [{opacity:1},{opacity:0}], {duration: TIMING.fadeToSite, fill:"forwards", easing:"ease-in-out"});
    if (fadeOut) await fadeOut.finished.catch(()=>{});

    // On laisse 1s avant reveal (ton dernier point)
    await sleep(TIMING.siteHoldBeforeReveal);

    // OFF
    ov.remove();
    unlockScroll();
  }

  // démarre automatiquement
  window.addEventListener("DOMContentLoaded", () => {
    // si tu as un flag pour désactiver l’intro, gère-le ici (ex: ?noIntro=1)
    const url = new URL(window.location.href);
    if (url.searchParams.get("noIntro") === "1") return;

    runIntro().catch(() => {
      // fallback: si crash, on libère le scroll et on retire overlay
      try{
        const ov = qs(SELECTORS.overlay);
        if (ov) ov.remove();
      }catch(_e){}
      unlockScroll();
    });
  });

})();
