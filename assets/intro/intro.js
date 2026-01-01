/*
INTRO BLACKFIX PATCH
Fixes black screen by:
- Correct asset paths (assets/intro/*)
- Never keeping body at opacity:0 (overlay handles fade)
- Gating: G0 loads logos only (no shards visible)
- G1 fades in text+motif
- T0 waits until shards decoded (with timeout failsafe)
- T4 disables tremble during merge
*/

const state = { logosReady:false, shardsReady:false };

function waitImg(img){
  // If 404, neither decode nor load will resolve reliably; we add timeout.
  const timeoutMs = 3000;
  const p = img.decode ? img.decode().catch(()=>new Promise(r=>img.onload=()=>r())) : new Promise(r=>img.onload=()=>r());
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
  if(layer.querySelector('.shard')) return;

  try{
    const res = await fetch('assets/intro/shards_meta.json', { cache:'no-store' });
    if(!res.ok) return;
    const meta = await res.json();
    if(!meta || !Array.isArray(meta.shards)) return;

    const frag = document.createDocumentFragment();
    for(const s of meta.shards){
      const img = document.createElement('img');
      img.className = 'shard';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = `assets/intro/shards/${s.file}`;
      frag.appendChild(img);
    }
    layer.appendChild(frag);
  }catch(_){}
}

async function loadShards(){
  await ensureShardsInDom();
  const shards = document.querySelectorAll('.shard');
  if(!shards.length){ state.shardsReady=true; return; }
  await Promise.all([...shards].map(waitImg));
  state.shardsReady = true;
}

function endIntroFallback(){
  // If something goes wrong, remove overlay and let site work.
  document.body.classList.add('intro-skip');
  const ov = document.getElementById('intro-overlay');
  if(ov) ov.remove();
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

async function start(){
  try{
    // G0
    await loadLogos();
    document.body.classList.add('intro-visible'); // G1 fade in overlay

    // T0: wait shards (failsafe 6s)
    const shardsPromise = (async()=>{ await loadShards(); })();
    await Promise.race([
      shardsPromise,
      new Promise(r=>setTimeout(r, 6000))
    ]);

    // Continue even if shards not ready after timeout (but better than black screen)
    document.body.classList.add('shards-visible'); // T1
    document.body.classList.add('explode');        // T2
    setTimeout(()=>document.body.classList.add('recoil'),1500); // T3
    setTimeout(()=>document.body.classList.add('merge'),2500);  // T4

  }catch(e){
    endIntroFallback();
  }
}

window.addEventListener('DOMContentLoaded', start);
