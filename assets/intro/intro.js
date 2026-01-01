/*
INTRO PATCH v17
Arborescence:
- index.html (root)
- assets/intro/intro.js
- assets/intro/intro.css
- assets/intro/assets/*  (vos webp + shards_meta + shards/)
*/

const state = { logosReady:false, shardsReady:false };

function waitImg(img){
  if (img.decode) return img.decode().catch(()=>new Promise(r=>img.onload=()=>r()));
  return new Promise(r=>img.onload=()=>r());
}

async function loadLogos(){
  const imgs=document.querySelectorAll('.logo-text,.logo-motif');
  await Promise.all([...imgs].map(waitImg));
  state.logosReady=true;
}

async function ensureShardsInDom(){
  const layer=document.getElementById('shards-layer');
  if(!layer) return;
  if(layer.querySelector('.shard')) return;

  // Create shard <img> from meta if available
  try{
    const res=await fetch('assets/intro/assets/shards_meta.json',{cache:'no-store'});
    if(!res.ok) return;
    const meta=await res.json();
    if(!meta || !Array.isArray(meta.shards)) return;

    const frag=document.createDocumentFragment();
    for(const s of meta.shards){
      const img=document.createElement('img');
      img.className='shard';
      img.alt='';
      img.decoding='async';
      img.loading='eager';
      img.src=`assets/intro/assets/shards/${s.file}`;
      // All shards share same origin/canvas => keep inset:0 via CSS
      // If you want per-shard offsets, uncomment:
      // img.style.left=(s.x||0)+'px'; img.style.top=(s.y||0)+'px';
      frag.appendChild(img);
    }
    layer.appendChild(frag);
  }catch(_){}
}

async function loadShards(){
  await ensureShardsInDom();
  const shards=document.querySelectorAll('.shard');
  if(!shards.length){ state.shardsReady=true; return; }
  await Promise.all([...shards].map(waitImg));
  state.shardsReady=true;
}

async function start(){
  // G0: load only logos (no shards visible)
  await loadLogos();

  // G1: fade in logos/text/motif
  document.body.classList.add('intro-visible');

  // T0: wait until shards loaded (still not visible)
  loadShards();
  await new Promise(r=>{
    const t=setInterval(()=>{ if(state.shardsReady){clearInterval(t);r();}},50);
  });

  // T1: crossfade text -> shards
  document.body.classList.add('shards-visible');

  // Continue with your existing timeline hooks:
  document.body.classList.add('explode');        // T2 (duration handled in your CSS/JS)
  setTimeout(()=>document.body.classList.add('recoil'),1500); // T3
  setTimeout(()=>document.body.classList.add('merge'),2500);  // T4 (no tremble)
}

window.addEventListener('DOMContentLoaded', start);
