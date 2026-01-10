/* ============================================================
   page.js — interactions page (modèles + sélection)
   ------------------------------------------------------------
   - Charge data/models.json (généré automatiquement par workflow)
   - Affiche les modèles sous forme de miniatures (sans texte)
   - Lightbox modèle : déclinaisons (matières), finitions, quantité, série
   - Un seul matériau sélectionné à la fois : la sélection remplace la précédente
   ============================================================ */

import { fetchJSON } from "./utils.js";


document.addEventListener("DOMContentLoaded", () => {
  const modelsGrid = document.getElementById("modelsGrid");
  const modelbox = document.getElementById("modelbox");
  const modelboxImg = document.getElementById("modelbox-img");
  const modelboxContent = document.getElementById("modelbox-content");
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
    modelbox.classList.add("is-open");
    modelbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modelbox.classList.remove("is-open");
    modelbox.setAttribute("aria-hidden", "true");
    // Décharger l'image grande pour libérer mémoire
    modelboxImg.removeAttribute("src");
    modelboxImg.removeAttribute("alt");
    modelboxContent.innerHTML = "";
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

    // Image
    const imgSrc = v.full || currentModel.full || v.thumb || currentModel.thumb || "";
    modelboxImg.src = imgSrc;
    modelboxImg.alt = v.name ? `${currentModel.title} — ${v.name}` : (currentModel.title || "");

    // Content
    modelboxContent.innerHTML = "";

    // Header
    const title = document.createElement("div");
    title.className = "lb-title";
    title.textContent = currentModel.title || currentModel.id || "Modèle";
    modelboxContent.appendChild(title);
    const sep = document.createElement("div");
    sep.className = "lb-sep";
    modelboxContent.appendChild(sep);

    // Bloc infos
    const fields = v.fields || {};
    const rows = [];
    // Matière affichée = nom de variante si dispo
    if (v.name) rows.push(["Matières", v.name]);
    if (fields.Technique || fields["Technique"]) rows.push(["Technique", fields.Technique || fields["Technique"]]);
    if (fields.Dimensions || fields["Dimensions"]) rows.push(["Dimensions", fields.Dimensions || fields["Dimensions"]]);

    // Finitions (liste possible)
    const finList = Array.isArray(v.finitions) ? v.finitions : [];
    if (finList.length) rows.push(["Finitions", finList.join(", ")]);

    for (const [k, val] of rows) {
      const row = document.createElement("div");
      row.className = "lb-row";
      row.innerHTML = `<span class="lb-k">${escapeHtml(k)}</span><span class="lb-v">${escapeHtml(val)}</span>`;
      modelboxContent.appendChild(row);
    }
    // Description (txt) — modèle + déclinaison
    const notes = document.createElement("div");
    notes.className = "lb-notes";
    notes.textContent = "";
    modelboxContent.appendChild(notes);
    getVariantDescription(currentModel, v).then((t) => {
      if (t) notes.textContent = t;
    });


    // Choix des déclinaisons
    const decla = document.createElement("div");
    decla.className = "modelbox__section";
    decla.innerHTML = `<div class="modelbox__sectionTitle">Choix des déclinaisons</div>`;
    const strip = document.createElement("div");
    strip.className = "variant-strip";
    (currentModel.variants || []).forEach((vv, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      if (idx === currentVariantIndex) b.classList.add("is-active");
      b.className = `variant-chip ${idx === currentVariantIndex ? "is-active" : ""}`;
      const im = document.createElement("img");
      im.loading = "lazy";
      im.decoding = "async";
      im.src = vv.thumb || vv.full || "";
      im.alt = vv.name || `Variante ${idx + 1}`;
      b.appendChild(im);
      b.addEventListener("click", () => {
        // Changement de matière => reset options
        currentVariantIndex = idx;
        resetOptions();
        renderModelbox();
      });
      strip.appendChild(b);
    });
    decla.appendChild(strip);
    modelboxContent.appendChild(decla);

    // Finitions optionnelles
    const fin = document.createElement("div");
    fin.className = "modelbox__section";
    fin.innerHTML = `<div class="modelbox__sectionTitle">Finitions (optionnel)</div>`;
    const pills = document.createElement("div");
    pills.className = "pills";
    if (finList.length) {
      finList.forEach((f) => {
        const p = document.createElement("button");
        p.type = "button";
        p.className = `pill ${selectedFinition === f ? "is-active" : ""}`;
        p.textContent = f;
        p.addEventListener("click", () => {
          selectedFinition = (selectedFinition === f) ? null : f;
          renderModelbox();
        });
        pills.appendChild(p);
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "lb-notes";
      empty.textContent = "Aucune finition définie pour cette matière.";
      fin.appendChild(empty);
    }
    fin.appendChild(pills);
    modelboxContent.appendChild(fin);

    // Quantité + série
    const qty = document.createElement("div");
    qty.className = "modelbox__section";
    qty.innerHTML = `<div class="modelbox__sectionTitle">Quantité (optionnel)</div>`;

    const row = document.createElement("div");
    row.className = "qty-row";
    const lab = document.createElement("span");
    lab.className = "qty-label";
    lab.textContent = "Quantité";

    const input = document.createElement("input");
    input.className = "qty-input";
    input.type = "number";
    input.min = "1";
    input.step = "1";
    input.placeholder = "—";
    input.value = quantityValue;
    input.addEventListener("input", () => {
      quantityValue = input.value;
    });

    const serieWrap = document.createElement("div");
    serieWrap.className = "serie-wrap";
    const ck = document.createElement("input");
    ck.type = "checkbox";
    ck.checked = !!isSerie;
    ck.addEventListener("change", () => { isSerie = ck.checked; });
    const ckLab = document.createElement("label");
    ckLab.textContent = "Série";
    serieWrap.appendChild(ck);
    serieWrap.appendChild(ckLab);

    row.appendChild(lab);
    row.appendChild(input);
    row.appendChild(serieWrap);
    qty.appendChild(row);
    modelboxContent.appendChild(qty);

    // Bouton final
    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "btn btn--primary modelbox__choose";
    choose.textContent = "Je choisis ce model";
    choose.addEventListener("click", () => {
      // Un seul matériau dans le formulaire : on remplace
      const parts = [];
      parts.push(`${currentModel.title || currentModel.id}`);
      if (v.name) parts.push(`Matière : ${v.name}`);
      if (fields.Technique || fields["Technique"]) parts.push(`Technique : ${fields.Technique || fields["Technique"]}`);
      if (fields.Dimensions || fields["Dimensions"]) parts.push(`Dimensions : ${fields.Dimensions || fields["Dimensions"]}`);
      if (selectedFinition) parts.push(`Finition : ${selectedFinition}`);
      if (quantityValue) parts.push(`Quantité : ${quantityValue}`);
      if (isSerie) parts.push(`Série : oui`);
      selectionSummary.value = parts.join("\n");

      closeModal();
      // Amène l'utilisateur vers le contact
      const contact = document.getElementById("contact");
      if (contact) contact.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    modelboxContent.appendChild(choose);
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
      const data = await fetchJSON("data/models.json");
      manifest = data && Array.isArray(data.models) ? data : { models: [] };
      renderGrid();
    } catch (e) {
      // fallback: no models
      modelsGrid.innerHTML = "<p style=\"opacity:.8\">Aucun modèle disponible pour le moment.</p>";
    }
  }

  // Close handlers
  modelbox.addEventListener("click", (evt) => {
    if (evt.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && modelbox.classList.contains("is-open")) closeModal();
  });

  loadModels();
});
