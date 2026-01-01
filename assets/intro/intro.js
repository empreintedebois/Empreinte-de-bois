/*
INTRO META FIX PATCH
Fix: supports shards_meta.json formats:
A) { shards: [{file, x?, y?, w?, h?}, ...] }
B) { count: N, files: ["shard_001.webp", ...] }

Also:
- Only crossfade logo-text -> shards if shards actually exist.
- Adds body class 'has-shards' when shards were instantiated or already present.
*/

const state = { logosReady:false, shardsReady:false, hasShards:false };

function waitImg(img){
  const timeoutMs = 4000;
  const p = img.decode
    ? img.decode().catch(()=>new Promise(r=>img.onload=()=>r()))
    : new Promise(r=>img.onload=()=>r());
  return Promise.race([p, new Promise(r=>setTimeout(r, timeoutMs))]);
}

async function loadLogos(){
  const imgs = document.querySelectorAll('.logo-text,.logo-motif');
  await Promise.all([...imgs].map(waitImg));
  state.logosReady = true;
}

async function ensureShardsInDom(){
  const layer = document.getElementById('shards-layer');
  if(!layer) return;

  // already present
  if(layer.querySelector('.shard')){
    state.hasShards = true;
    document.body.classList.add('has-shards');
    return;
  }

  try{
    const res = await fetch('assets/intro/shards_meta.json', { cache:'no-store' });
    if(!res.ok) return;
    const meta = await res.json();

    let shardList = [];
    if (meta && Array.isArray(meta.shards)) {
      shardList = meta.shards.map(s => ({ file: s.file, x: s.x, y: s.y, w: s.w, h: s.h }));
    } else if (meta && Array.isArray(meta.files)) {
      shardList = meta.files.map(f => ({ file: f }));
    }

    if(!shardList.length) return;

    const frag = document.createDocumentFragment();
    for(const s of shardList){
      if(!s.file) continue;
      const img = document.createElement('img');
      img.className = 'shard';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = `assets/intro/shards/${s.file}`;

      // If per-shard positioning exists, apply it; otherwise keep full inset (same origin canvas)
      if (Number.isFinite(s.x)) img.style.left = s.x + 'px';
      if (Number.isFinite(s.y)) img.style.top  = s.y + 'px';
      if (Number.isFinite(s.w)) img.style.width  = s.w + 'px';
      if (Number.isFinite(s.h)) img.style.height = s.h + 'px';

      frag.appendChild(img);
    }
    layer.appendChild(frag);

    // Mark availability
    if(layer.querySelector('.shard')){
      state.hasShards = true;
      document.body.classList.add('has-shards');
    }
  } catch(_) {}
}

async function loadShards(){
  await ensureShardsInDom();
  const shards = document.querySelectorAll('.shard');
  if(!shards.length){
    state.shardsReady = true;
    return;
  }
  await Promise.all([...shards].map(waitImg));
  state.shardsReady = true;
}

function endIntroFallback(){
  // Never block the site
  const ov = document.getElementById('intro-overlay');
  if(ov) ov.remove();
}

async function start(){
  try{
    // G0
    await loadLogos();

    // G1 fade-in overlay (logos only)
    document.body.classList.add('intro-visible');

    // T0 wait shards decoded (with 6s failsafe)
    const shardsPromise = (async()=>{ await loadShards(); })();
    await Promise.race([shardsPromise, new Promise(r=>setTimeout(r, 6000))]);

    // Only switch to shards mode if shards exist
    if (state.hasShards) {
      document.body.classList.add('shards-visible'); // crossfade text -> shards
    }

    document.body.classList.add('explode'); // continues timeline hooks
    setTimeout(()=>document.body.classList.add('recoil'),1500);
    setTimeout(()=>document.body.classList.add('merge'),2500);

  } catch(e){
    endIntroFallback();
  }
}

window.addEventListener('DOMContentLoaded', start);
