
(() => {
  "use strict";
const siteRoot = document.getElementById("site-root");
document.documentElement.classList.add("intro-active");
if (siteRoot) siteRoot.setAttribute("aria-hidden", "true");
  document.body.classList.add("intro-active");
// ...

  // === Config chemins ===
  const PATH = {
    logoText:   "assets/intro/logo-texte.webp",
    logoLeft:   "assets/intro/logo-motif-left.webp",
    logoRight:  "assets/intro/logo-motif-right.webp",
    shardsMeta: "assets/intro/shards_meta.json",
    shardsDir:  "assets/intro/shards/"
  };

  // === Timings DEMO (toutes les étapes = 2s) ===
  const D = 2000;
  const T = {
    baseHold: D,            // affichage de base des 3 logos
    textToShards: D,        // transition logo-texte -> shards empilées
    preExplode: D,          // tempo avant explosion
    explode: D,             // explosion des shards
    motifsPullBack: D,      // recul des motifs (20% de distance)
    motifsMerge: D,         // réunion motifs
    zoomTogether: D,        // zoom final motifs réunis
    fadeOut: D,             // fade out overlay/logos
    curtain: 1000          // rideau laser (ms)
  };

  // === DOM helpers ===
  const qs = (s, r=document)=>r.querySelector(s);
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

  // Lire translateX courant (en px) depuis transform
  function getTranslateX(el){
    const t = getComputedStyle(el).transform;
    if(!t || t==="none") return 0;
    try{
      const m = new DOMMatrixReadOnly(t);
      return m.m41 || 0;
    }catch{ return 0; }
  }

  // Verrouillage scroll
  let __scrollY = 0;

function lockScrollIntro(){
  __scrollY = window.scrollY || 0;
  document.documentElement.classList.add("intro-active");
  document.body.classList.add("intro-active");
  document.body.style.top = `-${__scrollY}px`;
}

function unlockScrollIntro(){
  document.documentElement.classList.remove("intro-active");
  document.body.classList.remove("intro-active");
  const y = __scrollY;
  document.body.style.top = "";
  window.scrollTo(0, y);
}

  // Preload image
  function preload(src){
    return new Promise((res,rej)=>{
      const im = new Image();
      im.onload = ()=>res(im);
      im.onerror = ()=>rej(new Error("load fail: "+src));
      im.src = src;
    });
  }

  async function fetchJSON(url){
    const r = await fetch(url, {cache:"no-store"});
    if(!r.ok) throw new Error("fetch fail "+url);
    return r.json();
  }

  // === Build overlay structure si absente ===
  function ensureOverlay(){
    if(qs("#intro-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "intro-overlay";

    const stage = document.createElement("div");
    stage.id = "intro-stage";

    const row = document.createElement("div");
    row.id = "intro-row";

    const left = document.createElement("img");
    left.id = "intro-logo-left";
    left.className = "intro-motif";
    left.alt = "";
    left.src = PATH.logoLeft;

    const center = document.createElement("div");
    center.id = "intro-center";

    const text = document.createElement("img");
    text.id = "intro-logo-text";
    text.alt = "";
    text.src = PATH.logoText;

    const shards = document.createElement("div");
    shards.id = "intro-shards";

    center.appendChild(text);
    center.appendChild(shards);

    const right = document.createElement("img");
    right.id = "intro-logo-right";
    right.className = "intro-motif";
    right.alt = "";
    right.src = PATH.logoRight;

    row.appendChild(left);
    row.appendChild(center);
    row.appendChild(right);

    stage.appendChild(row);
    overlay.appendChild(stage);

    const loader = document.createElement("div");
    loader.id = "intro-loader";
    loader.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    overlay.appendChild(loader);

    const curtain = document.createElement("div");
    curtain.id = "intro-curtain";
    document.body.appendChild(curtain);

    document.body.appendChild(overlay);
  }

  // Calage du ratio du bloc central + hauteur commune (--logoH)
  function syncGeometry(){
    const center = qs("#intro-center");
    const img = qs("#intro-logo-text");
    if(!center || !img || !img.naturalWidth || !img.naturalHeight) return;

    const w = center.clientWidth;                         // 60vw
    const r = img.naturalHeight / img.naturalWidth;       // ratio H/W du logo-texte
    const h = Math.max(120, Math.round(w * r));           // hauteur calculée

    // impose cette hauteur comme référence commune
    document.documentElement.style.setProperty("--logoH", h + "px");

    // rien d’autre à faire: les shards étant en object-fit:contain; inset:0, elles matcheront la zone du logo-texte
  }

  // Charge les shards d’après le meta
  async function buildShards(){
    const meta = await fetchJSON(PATH.shardsMeta);
    const files = Array.isArray(meta.files) ? meta.files : [];
    if(!files.length) throw new Error("shards_meta.json vide");

    const host = qs("#intro-shards");
    host.innerHTML = "";

    // preload strict
    await Promise.all(files.map(f => preload(PATH.shardsDir + f)));

    // injecte en pile (empilées)
    files.forEach((f, i)=>{
      const im = document.createElement("img");
      im.className = "shard";
      im.alt = "";
      im.dataset.i = String(i);
      im.src = PATH.shardsDir + f;
      host.appendChild(im);
    });

    return Array.from(host.querySelectorAll(".shard"));
  }

  // Séquence complète (2s par étape)
  
  document.documentElement.classList.remove("intro-active");
if (siteRoot) siteRoot.removeAttribute("aria-hidden");
  document.body.classList.remove("intro-active");
  
  // Rideau laser : révèle uniquement #site-layer (le fond reste visible)
  async function runCurtain(duration=1000){
    // Nouveau : scan laser + particules, uniquement sur les éléments (pas le fond)
    // (les images sont masquées par leur alpha => pas de laser dans les zones transparentes)
    if (typeof window.runLaserReveal === "function") {
      await window.runLaserReveal({
        duration,
        root: "#site-layer",
        exclude: ".hero__bg, #background-canvas"
      });
      return;
    }

    // Fallback minimal (si le script n'est pas chargé)
    document.body.classList.add("curtain-running");
    const line = document.createElement("div");
    line.id = "laser-line";
    document.body.appendChild(line);
    const h = window.innerHeight || 800;
    const a = line.animate(
      [{ transform: "translateY(0)", opacity: 1 },
       { transform: `translateY(${h}px)`, opacity: 0.9 }],
      { duration, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );
    await a.finished.catch(()=>{});
    line.remove();
    document.body.classList.remove("curtain-running");
  }

async function runIntro(){
    ensureOverlay();
    lockScroll();

    const overlay = qs("#intro-overlay");
    const left = qs("#intro-logo-left");
    const right = qs("#intro-logo-right");
    const text = qs("#intro-logo-text");
    const center = qs("#intro-center");

    // Preload 3 logos + sync géométrie
    await Promise.all([preload(PATH.logoLeft), preload(PATH.logoRight), preload(PATH.logoText)]);
    syncGeometry();
    window.addEventListener("resize", syncGeometry, {passive:true});

    // Étape base : 3 logos visibles, tremblement léger, shards en cours de chargement
    left.classList.add("is-tremble-soft");
    right.classList.add("is-tremble-soft");
    text.classList.add("is-tremble-soft");

    // Charge les shards en parallèle
    const shards = await buildShards();
    // Shards empilées mais invisibles (opacity:0) pour l’instant

    // Maintient 2s d’état stable
    await sleep(T.baseHold);

    // Transition logo-texte -> shards empilées (les shards deviennent visibles PENDANT que le texte s’efface)
    {
      text.animate([{opacity:1},{opacity:0}], {duration:T.textToShards, easing:"ease", fill:"forwards"});
      shards.forEach(im=>{
        im.animate([{opacity:0},{opacity:1}], {duration:T.textToShards, easing:"ease", fill:"forwards"});
      });
      await sleep(T.textToShards);
      text.classList.remove("is-tremble-soft");
    }

    // Tempo 2s (shards empilées visibles)
    await sleep(T.preExplode);

    // Explosion des shards (depuis le centre)
    {
      const maxX = Math.min(window.innerWidth * 0.45, 520);
      const maxY = Math.min(window.innerHeight * 0.35, 360);
      shards.forEach((el, i)=>{
        const a = (i / Math.max(1, shards.length)) * Math.PI * 2;
        const rx = (0.7 + 0.3*Math.random()) * maxX;
        const ry = (0.7 + 0.3*Math.random()) * maxY;
        const dx = Math.cos(a) * rx;
        const dy = Math.sin(a) * ry;
        const rot = (Math.random()*60 - 30);
        el.animate(
          [{ transform:"translate(0,0) rotate(0deg) scale(1)" },
           { transform:`translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(1)` }],
          { duration:T.explode, easing:"cubic-bezier(.2,.9,.2,1)", fill:"forwards" }
        );
      });
      // pendant l’explosion, les motifs reculent de 20% chacun
      const pull = Math.round(window.innerWidth * 0.20); // 20% du viewport POUR CHAQUE motif
      const aL = left.animate(
        [{ transform:`translateX(${getTranslateX(left)}px)` }, { transform:`translateX(${getTranslateX(left)+pull}px)` }],
        { duration:T.motifsPullBack, easing:"ease-in-out", fill:"forwards" }
      );
      const aR = right.animate(
        [{ transform:`translateX(${getTranslateX(right)}px)` }, { transform:`translateX(${getTranslateX(right)-pull}px)` }],
        { duration:T.motifsPullBack, easing:"ease-in-out", fill:"forwards" }
      );
      await Promise.all([aL.finished, aR.finished, sleep(T.explode)]);
    }

    // Réunion motifs (bord à bord)
    {
      const rL = left.getBoundingClientRect();
      const rR = right.getBoundingClientRect();
      const gap = rR.left - rL.right;      // espace entre les deux (px)
      const half = gap / 2;

      const curL = getTranslateX(left);
      const curR = getTranslateX(right);

      const mL = left.animate(
        [{ transform:`translateX(${curL}px)` }, { transform:`translateX(${curL + half}px)` }],
        { duration:T.motifsMerge, easing:"ease-in-out", fill:"forwards" }
      );
      const mR = right.animate(
        [{ transform:`translateX(${curR}px)` }, { transform:`translateX(${curR - half}px)` }],
        { duration:T.motifsMerge, easing:"ease-in-out", fill:"forwards" }
      );
      await Promise.all([mL.finished, mR.finished]);
    }

    // Zoom final des motifs réunis pour occuper ~80% de la largeur
    {
      const row = qs("#intro-row");
      const rect = row.getBoundingClientRect();
      const targetW = window.innerWidth * 0.80;
      const s = Math.min(1.8, Math.max(1.0, targetW / Math.max(1, rect.width)));
      await row.animate(
        [{ transform:"scale(1)" }, { transform:`scale(${s})` }],
        { duration:T.zoomTogether, easing:"cubic-bezier(.2,.9,.2,1)", fill:"forwards" }
      ).finished;
    }

    // Fade out général (logos + shards)
    {
      const fadeList = [left, right, ...shards];
      fadeList.forEach(el => el.animate([{opacity:1},{opacity:0}], {duration:T.fadeOut, easing:"ease", fill:"forwards"}));
      await sleep(T.fadeOut);
    }

    // Fin intro → overlay out, rendu scroll
    const overlay = qs("#intro-overlay");
    overlay.classList.add("is-hidden");
    await sleep(600);
    overlay.remove();
    unlockScroll();

    // Rideau laser (1s après la fin intro)
    await sleep(1000);
    await runCurtain(T.curtain);

    // signal fin
    window.dispatchEvent(new CustomEvent("intro:done"));
  }

  window.addEventListener("load", ()=>{
    runIntro().catch(e=>{
      console.error("[INTRO]", e);
      // fail-open : on débloque le site si crash
      const ov = document.getElementById("intro-overlay");
      ov && ov.remove();
      unlockScroll();
    });
  });
})();
