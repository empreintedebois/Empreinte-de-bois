// INTRO GOOD PATCH
// Fixes: broken sizing, missing animations, wrong gating behavior.
// Implements:
// - G0: show only logos (no shards visible)
// - G1: fade-in overlay (0.5s) with tremble
// - T0: hold until shards are decoded
// - T1: crossfade text -> shards (only if shards exist)
// - T2: explode (1.5s), then fade shards + recoil + merge hooks
// - T4: stop tremble on merge

const state = { logosReady:false, shardsReady:false, hasShards:false };

function waitImg(img){
  const timeoutMs = 5000;
  const p = (img.decode ? img.decode() : new Promise(r => img.onload = () => r()))
    .catch(() => new Promise(r => img.onload = () => r()));
  return Promise.race([p, new Promise(r => setTimeout(r, timeoutMs))]);
}

async function loadLogos(){
  const imgs = document.querySelectorAll('#intro-stage .logo-text, #intro-stage .logo-motif');
  await Promise.all([...imgs].map(waitImg));
  state.logosReady = true;
}

async function ensureShardsInDom(){
  const layer = document.getElementById('shards-layer');
  if(!layer) return;

  if(layer.querySelector('.shard')){
    state.hasShards = true;
    document.body.classList.add('has-shards');
    return;
  }

  // Support both meta formats:
  // A) { shards:[{file,...}] }
  // B) { count:N, files:["shard_001.webp", ...] }
  try{
    const res = await fetch('assets/intro/shards_meta.json', { cache:'no-store' });
    if(!res.ok) return;
    const meta = await res.json();

    let files = [];
    if (meta && Array.isArray(meta.shards)) files = meta.shards.map(s => s.file).filter(Boolean);
    else if (meta && Array.isArray(meta.files)) files = meta.files.slice();

    if(!files.length) return;

    const frag = document.createDocumentFragment();
    // Create img shards with per-shard outward vectors (so CSS can explode without extra JS)
    const n = files.length;
    for(let i=0;i<n;i++){
      const file = files[i];
      const img = document.createElement('img');
      img.className = 'shard';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = `assets/intro/shards/${file}`;

      // Direction: spread around circle + jitter
      const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const dist = 140 + Math.random() * 260;        // px outward (scaled by CSS via stage size effect)
      const dx = Math.cos(a) * dist;
      const dy = Math.sin(a) * dist;
      const ds = 1.0 + Math.random() * 0.25;         // slight scale variation
      img.style.setProperty('--dx', dx.toFixed(1) + 'px');
      img.style.setProperty('--dy', dy.toFixed(1) + 'px');
      img.style.setProperty('--ds', ds.toFixed(3));

      frag.appendChild(img);
    }
    layer.appendChild(frag);

    state.hasShards = true;
    document.body.classList.add('has-shards');
  }catch(_){}
}

async function loadShards(){
  await ensureShardsInDom();
  const shards = document.querySelectorAll('#shards-layer .shard');
  if(!shards.length){
    // No shards => don't block timeline forever
    state.shardsReady = true;
    return;
  }
  await Promise.all([...shards].map(waitImg));
  state.shardsReady = true;
}

function safeRemoveOverlay(){
  const ov = document.getElementById('intro-overlay');
  if(ov) ov.remove();
  document.body.classList.add('intro-skip');
}

async function start(){
  // If intro markup missing, do nothing.
  if(!document.getElementById('intro-overlay')) return;

  try{
    // G0: load logos only (no shards visible)
    await loadLogos();

    // G1: fade-in + tremble
    document.body.classList.add('intro-visible');
    document.body.classList.add('tremble');

    // T0: load shards in background; hold until ready
    const shardsPromise = loadShards();
    await shardsPromise;

    // T1: crossfade text -> shards (only if shards exist)
    if(state.hasShards){
      // wait 2 frames to ensure shards are painted before we hide text
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      document.body.classList.add('shards-visible');
    }

    // T2: explode (1.5s)
    document.body.classList.add('explode');

    // After explosion, fade shards (optional) then recoil + merge
    setTimeout(() => {
      if(state.hasShards) document.body.classList.add('fade-shards');
    }, 1500);

    // T3 recoil
    setTimeout(() => document.body.classList.add('recoil'), 1500);

    // T4 merge (stop tremble)
    setTimeout(() => {
      document.body.classList.add('merge');
      document.body.classList.remove('tremble');
    }, 2500);

  }catch(e){
    // never block the user with black screen
    safeRemoveOverlay();
  }
}

window.addEventListener('DOMContentLoaded', start);
