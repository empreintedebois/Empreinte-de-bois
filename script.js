document.addEventListener('DOMContentLoaded', () => {
  initSkins().then(()=>initSite().catch(console.error));
});

async function initSite(){
  await buildSlider();
  await buildAccordion();
  bindForm();
}

async function initSkins(){
  try{
    const res = await fetch('assets/skins/blocks/blocks-config.json');
    if(!res.ok) return;
    const cfg = await res.json();
    const secIds = ['intro','galerie','supports','preferences','contact'];
    const skinTo = n => `assets/skins/blocks/${n}.png`;
    secIds.forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      const key = id in cfg ? cfg[id] : (id==='supports'?'brush-light':'brush-dark');
      el.style.setProperty('--skin-url', `url('${skinTo(key)}')`);
      el.style.setProperty('--title-skin-url', `url('${skinTo(cfg.titles||'brush-light')}')`);
    });
  }catch(e){}
}

async function buildSlider(){
  const slider=document.getElementById('slider'); if(!slider) return;
  const exts=['.gif','.webp','.jpg','.jpeg','.png']; const max=80;
  const urls=await probe('assets/galerie/galerie', exts, max);
  if(urls.length===0){
    try{ const r=await fetch('assets/galerie/galerie-config.json'); if(r.ok){ const arr=await r.json(); arr.forEach(f=>urls.push('assets/galerie/'+f)); } }catch(e){}
  }
  await Promise.all(urls.map(preload));
  urls.forEach((src,i)=>{
    const s=document.createElement('div'); s.className='slide'+(i===0?' active':'');
    const im=document.createElement('img'); im.src=src; im.alt='Réalisation '+String(i+1).padStart(2,'0');
    s.appendChild(im); slider.appendChild(s);
  });
  const slides=[...slider.querySelectorAll('.slide')]; let current=0; const show=i=>slides.forEach((el,idx)=>el.classList.toggle('active', idx===i));
  const prev=document.querySelector('.slider-nav.prev'), next=document.querySelector('.slider-nav.next');
  if(prev&&next){ prev.addEventListener('click',()=>{current=(current-1+slides.length)%slides.length;show(current);}); next.addEventListener('click',()=>{current=(current+1)%slides.length;show(current);}); }
}
function probe(prefix, exts, max){
  const tries=[]; for(let i=1;i<=max;i++){ const nn=String(i).padStart(2,'0'); for(const e of exts){ const u=`${prefix}${nn}${e}`; tries.push(test(u).then(ok=>ok?u:null)); } }
  return Promise.all(tries).then(v=>v.filter(Boolean));
}
function test(url){ return new Promise(res=>{ const i=new Image(); let done=false; const f=o=>{if(!done){done=true;res(o);}}; i.onload=()=>f(true); i.onerror=()=>f(false); i.src=url+(url.includes('?')?'&':'?')+'v='+Date.now(); }); }
function preload(u){ return new Promise(r=>{ const i=new Image(); i.onload=i.onerror=()=>r(); i.src=u; }); }

async function buildAccordion(){
  const root=document.getElementById('accordion'); if(!root) return;
  let cfg=[]; try{ const r=await fetch('assets/bandeaux/bandeaux-config.json'); if(r.ok) cfg=await r.json(); }catch(e){}
  if(!Array.isArray(cfg)||cfg.length===0){ cfg=Array.from({length:10},(_,i)=>({code:'M'+String(i+1).padStart(2,'0'),name:'M'+String(i+1).padStart(2,'0'),enabled:true,image:'image.png'})); }
  for(const it of cfg){
    if(!it.enabled) continue;
    const code=it.code, display=it.name||code, folder=`assets/bandeaux/${code}`, image=it.image?`${folder}/${it.image}`:`${folder}/image.png`;
    let title='',dimensions='',extras=[]; try{ const r=await fetch(`${folder}/description.txt?${Date.now()}`); if(r.ok){ const t=await r.text(); const lines=t.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); title=lines[0]||''; dimensions=lines[1]||''; extras=lines.slice(2); } }catch(e){}
    const labelParts=[title,dimensions,...extras].filter(Boolean); const label=labelParts.join(', ');
    const item=document.createElement('div'); item.className='accordion-item'; item.dataset.code=code; item.dataset.label=label;
    const header=document.createElement('div'); header.className='accordion-header';
    const left=document.createElement('div'); left.className='header-left';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.className='material-checkbox'; cb.title='Choisir ce support';
    const name=document.createElement('span'); name.className='material-name'; name.textContent=display;
    const arrow=document.createElement('span'); arrow.className='arrow'; arrow.innerHTML='&#x25BC;';
    left.appendChild(cb); left.appendChild(name); header.appendChild(left); header.appendChild(arrow);
    const content=document.createElement('div'); content.className='accordion-content';
    const detail=document.createElement('div'); detail.className='product-detail';
    const img=document.createElement('img'); img.src=image; img.alt=code;
    const text=document.createElement('div'); text.className='product-text';
    const t1=document.createElement('p'); t1.className='product-title'; t1.textContent=dimensions?`${title} — ${dimensions}`:title; text.appendChild(t1);
    extras.forEach(line=>{ const p=document.createElement('p'); p.className='product-extra'; p.textContent=line; text.appendChild(p); });
    if((display||'').toLowerCase().includes('verre')||(title||'').toLowerCase().includes('verre')){ const vv=document.createElement('p'); vv.className='product-extra'; vv.textContent='Projet personnalisé'; text.appendChild(vv); }
    detail.appendChild(img); detail.appendChild(text); content.appendChild(detail);
    item.appendChild(header); item.appendChild(content); root.appendChild(item);
  }
  const selected=document.getElementById('selected-material'); const items=[...root.querySelectorAll('.accordion-item')];
  items.forEach(it=>{
    const header=it.querySelector('.accordion-header'); const cb=it.querySelector('.material-checkbox');
    header.addEventListener('click',e=>{ if(e.target===cb) return; const is=it.classList.contains('active'); items.forEach(x=>x.classList.remove('active')); if(!is) it.classList.add('active'); });
    cb.addEventListener('change',()=>{ if(cb.checked){ items.forEach(x=>{ const o=x.querySelector('.material-checkbox'); if(o!==cb) o.checked=false; }); selected.value=it.dataset.label||it.dataset.code||''; }else{ if(selected.value===(it.dataset.label||it.dataset.code)) selected.value=''; } });
  });
}

function bindForm(){
  const form=document.getElementById('contact-form'); if(!form) return;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const email=document.getElementById('email').value.trim();
    const subject=(document.getElementById('subject').value.trim()||'Demande de gravure');
    const quantite=(document.getElementById('quantite').value||'1');
    const commentaire=document.getElementById('commentaire').value.trim();
    const selected=document.getElementById('selected-material').value;
    const tIdx=parseInt(document.getElementById('traitement').value,10);
    const traitement=['Photo','Illustration','DXF'][tIdx]||'Photo';
    const xIdx=parseInt(document.getElementById('texture').value,10);
    const texture=['Aplat','Dégradé','Pointillé'][xIdx]||'Aplat';
    const lines=[]; lines.push(`Type de fichier : ${traitement}`); lines.push(`Texture : ${texture}`); if(selected) lines.push(`Support : ${selected}`); lines.push(`Quantité : ${quantite}`); if(commentaire) lines.push(`Commentaire : ${commentaire}`); lines.push('— Merci de joindre vos images —');
    const body=encodeURIComponent(lines.join('\n')); const subj=encodeURIComponent(subject); const cc=email?`&cc=${encodeURIComponent(email)}`:'';
    window.location.href=`mailto:empreinte.de.bois@gmail.com?subject=${subj}${cc}&body=${body}`;
  });
}
