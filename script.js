// === Script principal Empreinte de Bois ===
document.addEventListener('DOMContentLoaded', () => {
  initSite().catch(err => console.error(err));
});
async function initSite(){
  await buildSlider();
  await buildAccordion();
  bindForm();
}
/* ---------- Galerie dynamique ---------- */
async function buildSlider(){
  const slider = document.getElementById('slider');
  if(!slider) return;
  const exts = ['.gif','.webp','.jpg','.jpeg','.png'];
  const max = 50;
  const urls = await probeGallery('assets/galerie/galerie', exts, max);
  if(urls.length === 0){
    try {
      const r = await fetch('assets/galerie/galerie-config.json');
      if(r.ok){
        const arr = await r.json();
        for(const f of arr){ urls.push('assets/galerie/'+f); }
      }
    } catch(e){ /* noop */ }
  }
  await preloadImages(urls);
  urls.forEach((src, i) => {
    const slide = document.createElement('div');
    slide.className = 'slide' + (i===0 ? ' active' : '');
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Réalisation ' + String(i+1).padStart(2,'0');
    img.loading = 'eager';
    img.decoding = 'async';
    slide.appendChild(img);
    slider.appendChild(slide);
  });
  const slides = Array.from(slider.querySelectorAll('.slide'));
  let current = 0;
  const show = idx => slides.forEach((s, j) => s.classList.toggle('active', j === idx));
  const prev = document.querySelector('.slider-nav.prev');
  const next = document.querySelector('.slider-nav.next');
  if(prev && next){
    prev.addEventListener('click', () => { current = (current - 1 + slides.length) % slides.length; show(current); });
    next.addEventListener('click', () => { current = (current + 1) % slides.length; show(current); });
  }
}
function probeGallery(prefix, exts, max){
  const tries = [];
  for(let i=1;i<=max;i++){
    const nn = String(i).padStart(2,'0');
    for(const ext of exts){
      const url = `${prefix}${nn}${ext}`;
      tries.push(testImage(url).then(ok => ok ? url : null));
    }
  }
  return Promise.all(tries).then(res => res.filter(Boolean));
}
function testImage(url){
  return new Promise(resolve => {
    const img = new Image();
    let done = false;
    const finish = ok => { if(!done){ done=true; resolve(ok); } };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url + (url.includes('?')?'&':'?') + 'v=' + Date.now();
  });
}
function preloadImages(urls){
  return Promise.all(urls.map(u => new Promise(res => {
    const img = new Image(); img.onload = img.onerror = () => res(); img.src = u;
  })));
}
/* ---------- Bandeaux Mxx ---------- */
async function buildAccordion(){
  const root = document.getElementById('accordion');
  if(!root) return;
  let config = [];
  try {
    const r = await fetch('assets/bandeaux/bandeaux-config.json');
    if(r.ok) config = await r.json();
  } catch(e){ /* noop */ }
  if(!Array.isArray(config) || config.length===0){
    config = Array.from({length:10}, (_,i) => ({code:'M'+String(i+1).padStart(2,'0'), name:'M'+String(i+1).padStart(2,'0'), enabled:true, image:'image.png'}));
  }
  const items = [];
  for(const it of config){
    if(!it.enabled) continue;
    const code = it.code;
    const display = it.name || code;
    const folder = `assets/bandeaux/${code}`;
    const image = it.image ? `${folder}/${it.image}` : `${folder}/image.png`;
    let title='', dimensions='', extras=[];
    try {
      const r = await fetch(`${folder}/description.txt?${Date.now()}`);
      if(r.ok){
        const t = await r.text();
        const lines = t.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        title = lines[0] || '';
        dimensions = lines[1] || '';
        extras = lines.slice(2);
      }
    } catch(e){ /* noop */ }
    const labelParts = [title, dimensions, ...extras].filter(Boolean);
    const label = labelParts.join(', ');
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.dataset.code = code;
    item.dataset.label = label;
    const header = document.createElement('div');
    header.className = 'accordion-header';
    const left = document.createElement('div');
    left.className = 'header-left';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'material-checkbox';
    checkbox.title = 'Choisir ce support';
    const name = document.createElement('span');
    name.className = 'material-name';
    name.textContent = display;
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.innerHTML = '&#x25BC;';
    left.appendChild(checkbox);
    left.appendChild(name);
    header.appendChild(left);
    header.appendChild(arrow);
    const content = document.createElement('div');
    content.className = 'accordion-content';
    const detail = document.createElement('div');
    detail.className = 'product-detail';
    const img = document.createElement('img');
    img.src = image; img.alt = code;
    const text = document.createElement('div');
    text.className = 'product-text';
    const t1 = document.createElement('p'); t1.className='product-title'; t1.textContent = dimensions ? `${title} — ${dimensions}` : title; text.appendChild(t1);
    extras.forEach(line => { const p=document.createElement('p'); p.className='product-extra'; p.textContent=line; text.appendChild(p); });
    if ((display || '').toLowerCase().includes('verre') || (title || '').toLowerCase().includes('verre')) {
      const vv = document.createElement('p'); vv.className = 'product-extra'; vv.textContent = 'Projet personnalisé'; text.appendChild(vv);
    }
    detail.appendChild(img); detail.appendChild(text);
    content.appendChild(detail);
    item.appendChild(header); item.appendChild(content);
    root.appendChild(item);
    items.push(item);
  }
  const selectedInput = document.getElementById('selected-material');
  const itemsEl = Array.from(root.querySelectorAll('.accordion-item'));
  itemsEl.forEach(it => {
    const header = it.querySelector('.accordion-header');
    const checkbox = it.querySelector('.material-checkbox');
    header.addEventListener('click', (e) => {
      if(e.target === checkbox) return;
      const isActive = it.classList.contains('active');
      itemsEl.forEach(x => x.classList.remove('active'));
      if(!isActive) it.classList.add('active');
    });
    checkbox.addEventListener('change', () => {
      if(checkbox.checked){
        itemsEl.forEach(x => { const cb = x.querySelector('.material-checkbox'); if(cb!==checkbox) cb.checked = false; });
        selectedInput.value = it.dataset.label || it.dataset.code || '';
      } else {
        if(selectedInput.value === (it.dataset.label || it.dataset.code)) selectedInput.value='';
      }
    });
  });
}
/* ---------- Formulaire ---------- */
function bindForm(){
  const form = document.getElementById('contact-form');
  if(!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const subject = (document.getElementById('subject').value.trim() || 'Demande de gravure');
    const quantite = (document.getElementById('quantite').value || '1');
    const commentaire = document.getElementById('commentaire').value.trim();
    const selected = document.getElementById('selected-material').value;
    const tIdx = parseInt(document.getElementById('traitement').value,10);
    const traitement = ['Photo','Illustration','DXF'][tIdx] || 'Photo';
    const xIdx = parseInt(document.getElementById('texture').value,10);
    const texture = ['Aplat','Dégradé','Pointillé'][xIdx] || 'Aplat';
    const lines = [];
    lines.push(`Type de fichier : ${traitement}`);
    lines.push(`Texture : ${texture}`);
    if(selected) lines.push(`Support : ${selected}`);
    lines.push(`Quantité : ${quantite}`);
    if(commentaire) lines.push(`Commentaire : ${commentaire}`);
    lines.push('— Merci de joindre vos images —');
    const body = encodeURIComponent(lines.join('\n'));
    const subj = encodeURIComponent(subject);
    const cc = email ? `&cc=${encodeURIComponent(email)}` : '';
    const href = `mailto:empreinte.de.bois@gmail.com?subject=${subj}${cc}&body=${body}`;
    window.location.href = href;
  });
}
