/*
INTRO PATCH v18
- G0: load & decode logos only (shards not visible)
- G1: fade-in text + motifs (overlay opacity)
- T0: wait until all shards decoded; ONLY then proceed
- T4: no tremble during merge (CSS: body.merge)
Paths (relative to root):
- assets/intro/logo-texte.webp
- assets/intro/logo-motif-left.webp
- assets/intro/logo-motif-right.webp
- assets/intro/shards_meta.json
- assets/intro/shards/shard_XXX.webp
*/

const state = { logosReady:false, shardsReady:false };

function waitImg(img, timeoutMs = 8000){
  const p = (img.decode ? img.decode().catch(()=>new Promise(r=>img.onload=()=>r())) : new Promise(r=>img.onload=()=>r()));
  return Promise.race([p, new Promise(r=>setTimeout(r, timeoutMs))]);
}

async function loadLogos(){
  const imgs = document.querySelectorAll('.logo-text, .logo-motif');
  await Promise.all([...imgs].map(i => waitImg(i, 5000)));
  state.logosReady = true;
}

async function mountShardsIfNeeded(){
  const layer = document.getElementById('shards-layer');
  if(!layer) return [];
  // if already mounted, return list
  const existing = [...layer.querySelectorAll('img.shard')];
  if(existing.length) return existing;

  // mount from meta
  try{
    const res = await fetch('assets/intro/shards_meta.json', { cache: 'no-store' });
    if(!res.ok) return [];
    const meta = await res.json();
    if(!meta || !Array.isArray(meta.shards)) return [];

    const frag = document.createDocumentFragment();
    const shards = [];
    for(const s of meta.shards){
      const img = document.createElement('img');
      img.className = 'shard';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = `assets/intro/shards/${s.file}`;
      // If your shards are full-canvas (same origin), keep inset:0 (CSS).
      // If you later switch to per-shard bbox positioning, you can use s.x/s.y/s.w/s.h here.
      frag.appendChild(img);
      shards.push(img);
    }
    layer.appendChild(frag);
    return shards;
  }catch(_){
    return [];
  }
}

async function loadShards(){
  const shards = await mountShardsIfNeeded();
  if(!shards.length){
    // No shards: don't block forever. Mark ready to avoid black screen.
    state.shardsReady = true;
    return;
  }
  await Promise.all(shards.map(i => waitImg(i, 8000)));
  state.shardsReady = true;
}

function failSafeSkip(){
  document.body.classList.add('intro-skip');
  const ov = document.getElementById('intro-overlay');
  if(ov) ov.remove();
}

async function start(){
  try{
    // G0: logos only
    await loadLogos();

    // G1: fade-in overlay (text+motifs visible)
    document.body.classList.add('intro-visible');

    // T0: hold until shards are ready (shards still hidden)
    await loadShards();

    // If shards failed to load, we still continue (but the effect will be degraded)
    document.body.classList.add('shards-visible'); // T1 crossfade text->shards

    // Hooks: your existing animation code can key off these classes
    document.body.classList.add('explode');        // T2
    // Timings as discussed earlier (can be refined later)
    setTimeout(()=>document.body.classList.add('recoil'), 1500); // T3
    setTimeout(()=>document.body.classList.add('merge'), 2500);  // T4 (no tremble)
  }catch(e){
    failSafeSkip();
  }
}

window.addEventListener('DOMContentLoaded', start);
