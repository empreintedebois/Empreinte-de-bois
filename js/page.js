/* ============================================================
   page.js — interactions page (modèles + sélection)
   ------------------------------------------------------------
   - Charge data/models.json (généré automatiquement par workflow)
   - Affiche les modèles sous forme de miniatures (sans texte)
   - Lightbox modèle : déclinaisons (matières), finitions, quantité, série
   - Un seul matériau sélectionné à la fois : la sélection remplace la précédente
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const modelsGrid = document.getElementById("modelsGrid");
  const modelbox = document.getElementById("modelbox");
  const modelboxImg = document.getElementById("modelbox-img");
  const modelboxContent = document.querySelector("#modelbox .modelbox-meta") || document.getElementById("modelbox-content");
  const selectionSummary = document.getElementById("selection-summary");

  if (!modelsGrid || !modelbox || !modelboxImg || !modelboxContent || !selectionSummary) {
    return;
  }

  /** @type {{models: any[]}} */
  let manifest = { models: [] };

  // Cache des descriptions .txt (évite de refetch en boucle)
  const textCache = new Map();
  async function fetchText(url){
    if (!url) return "";
    if (textCache.has(url)) return textCache.get(url);
    try{
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const t = (await res.text()).trim();
      textCache.set(url, t);
      return t;
    }catch(_e){
      textCache.set(url, "");
      return "";
    }
  }
  function dirOf(p){
    if (!p) return "";
    const parts = String(p).split("/");
    parts.pop();
    return parts.join("/");
  }
  async function getVariantDescription(model, variant){
    const base = dirOf(variant?.full || variant?.thumb || model?.full || model?.thumb || "");
    const id = variant?.id ? String(variant.id) : "";
    // 1) texte spécifique à la déclinaison (si présent)
    if (base && id){
      const t1 = await fetchText(`${base}/${id}.txt`);
      if (t1) return t1;
    }
    // 2) texte générique du modèle (description.txt)
    if (base){
      const t2 = await fetchText(`${base}/description.txt`);
      if (t2) return t2;
    }
    // 3) fallback: champ notes du JSON
    return (variant?.notes || "").trim();
  }

  let currentModel = null;
  let currentVariantIndex = 0;
  let selectedFinition = null;
  let quantityValue = "";
  let isSerie = false;

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function openModal() {
    modelbox.hidden = false;
    modelbox.classList.add("is-open");
    modelbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modelbox.classList.remove("is-open");
    modelbox.setAttribute("aria-hidden", "true");
    modelboxImg.removeAttribute("src");
    modelboxImg.removeAttribute("alt");
    if (modelboxContent) if (modelboxContent) modelboxContent.innerHTML = "";
    modelbox.hidden = true;
    document.body.style.overflow = "";
  }

  function resetOptions() {
    selectedFinition = null;
    quantityValue = "";
    isSerie = false;
  }

  function getVariant(model, index) {
    const vars = Array.isArray(model?.variants) ? model.variants : [];
    return vars[Math.max(0, Math.min(index, vars.length - 1))] || null;
  }

  function renderModelbox() {
    if (!currentModel) return;
    const v = getVariant(currentModel, currentVariantIndex);
    if (!v) return;

    // Reset content
    if (modelboxContent) modelboxContent.innerHTML = "";

    // Image (full width, contained)
    const imgSrc = v.full || currentModel.full || v.thumb || currentModel.thumb || "";
    modelboxImg.src = imgSrc;
    modelboxImg.alt = v.name ? `${currentModel.title || currentModel.id} — ${v.name}` : (currentModel.title || currentModel.id || "");

    // Variants strip (max 6 displayed, left-aligned, no placeholders)
    const stripWrap = document.createElement("div");
    stripWrap.className = "modelbox__section";
    const strip = document.createElement("div");
    strip.className = "variant-strip";
    const variants = (currentModel.variants || []).slice(0, 6);
    variants.forEach((vv, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `variant-chip ${idx === currentVariantIndex ? "is-active" : ""}`;
      const im = document.createElement("img");
      im.loading = "lazy";
      im.decoding = "async";
      im.src = vv.thumb || vv.full || "";
      im.alt = vv.name || `Variante ${idx + 1}`;
      b.appendChild(im);
      b.addEventListener("click", () => {
        currentVariantIndex = idx;
        renderModelbox();
      });
      strip.appendChild(b);
    });
    stripWrap.appendChild(strip);

    // Caption (h3 + 4 lines, no scroll)
    const h3 = document.createElement("h3");
    h3.textContent = (v.name || currentModel.title || currentModel.id || "Modèle");
    const p = document.createElement("p");
    p.textContent = "";

    // Copy button (models only)
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn btn--primary modelbox__copy";
    copyBtn.textContent = "Copier dans le formulaire de contact";

    // Load txt (can contain <h3>...</h3><p>...</p>)
    getVariantDescription(currentModel, v).then((t) => {
      if (!t) return;
      // If it looks like HTML with tags, inject as HTML but keep only h3/p inside modal text area
      const looksHtml = /<\s*h3|<\s*p/i.test(t);
      if (looksHtml){
        const tmp = document.createElement("div");
        tmp.innerHTML = t;
        const hh = tmp.querySelector("h3");
        const pp = tmp.querySelector("p");
        if (hh) h3.textContent = hh.textContent.trim();
        if (pp) p.textContent = pp.textContent.trim();
        else p.textContent = tmp.textContent.trim();
      } else {
        // otherwise use plain text: first line = title, rest = body
        const lines = String(t).replace(/\r/g,"").split("\n").map(s=>s.trim()).filter(Boolean);
        if (lines.length){
          h3.textContent = lines[0];
          p.textContent = lines.slice(1).join(" ");
        }
      }
    });

    copyBtn.addEventListener("click", async () => {
      // compose
      const parts = [];
      parts.push(`${currentModel.title || currentModel.id}`);
      if (h3.textContent) parts.push(h3.textContent);
      if (p.textContent) parts.push(p.textContent);
      const msg = parts.join("\n\n");
      const ta = document.querySelector('textarea[name="message"]');
      if (ta) ta.value = msg;
      const contact = document.getElementById("contact");
      if (contact) contact.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Assemble order: image already in DOM, then strip, then text + button
    if (modelboxContent){
      modelboxContent.appendChild(stripWrap);
      modelboxContent.appendChild(h3);
      modelboxContent.appendChild(p);
      modelboxContent.appendChild(copyBtn);
    }
  }


  function openModel(model) {
    currentModel = model;
    currentVariantIndex = 0;
    resetOptions();
    renderModelbox();
    openModal();
  }

  function renderGrid() {
    modelsGrid.innerHTML = "";
    const frag = document.createDocumentFragment();
    (manifest.models || []).forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "model-tile";
      btn.setAttribute("aria-label", m.title || m.id);
      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = m.thumb || "";
      img.alt = m.title || m.id;
      btn.appendChild(img);
      btn.addEventListener("click", () => openModel(m));
      frag.appendChild(btn);
    });
    modelsGrid.appendChild(frag);
  }

  async function loadModels() {
    try {
      const fromFolders = await loadModelsFromBandeaux();
      if (fromFolders && Array.isArray(fromFolders.models) && fromFolders.models.length){
        manifest = fromFolders;
        renderGrid();
        return;
      }
      const res = await fetch("data/models.json", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      manifest = data && Array.isArray(data.models) ? data : { models: [] };
      renderGrid();
    } catch (e) {
      // fallback: no models
      modelsGrid.innerHTML = "<p style=\"opacity:.8\">Aucun modèle disponible pour le moment.</p>";
    }
  }

  // Close handlers
  modelbox.addEventListener("click", (evt) => {
    if (evt.target === modelbox) closeModal();
    if (evt.target.closest("[data-close], .modelbox-close")) closeModal();
  });
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && modelbox.classList.contains("is-open")) closeModal();
  });

  loadModels();
});
async function loadModelsFromBandeaux() {
  // Folder convention:
  // /bandeaux/M01/Image.webp + description.txt
  // /bandeaux/M01/Image01.webp + description01.txt ... (variants)
  const candidates = [];
  // probe M01..M30
  for (let i=1;i<=30;i++){
    const id = "M" + String(i).padStart(2,"0");
    const baseImg = `bandeaux/${id}/Image.webp`;
    const baseTxt = `bandeaux/${id}/description.txt`;
    try{
      const r = await fetch(baseImg, {method:"HEAD", cache:"no-store"});
      if(!r.ok) continue;
    }catch(e){ continue; }
    // base exists
    const model = { id, title: id, thumb: baseImg, full: baseImg, variants: [] };
    // base description if exists
    model.descriptionTxt = baseTxt;
    // variants 01..20
    for (let v=1; v<=20; v++){
      const vv = String(v).padStart(2,"0");
      const img = `bandeaux/${id}/Image${vv}.webp`;
      try{
        const rr = await fetch(img, {method:"HEAD", cache:"no-store"});
        if(!rr.ok) break;
      }catch(e){ break; }
      model.variants.push({
        name: `Déclinaison ${v}`,
        thumb: img,
        full: img,
        descriptionTxt: `bandeaux/${id}/description${vv}.txt`
      });
    }
    // If no numbered variants, still create 1 variant = base
    if(!model.variants.length){
      model.variants.push({ name: "Déclinaison", thumb: baseImg, full: baseImg, descriptionTxt: baseTxt });
    }
    candidates.push(model);
  }
  return { models: candidates };
}

