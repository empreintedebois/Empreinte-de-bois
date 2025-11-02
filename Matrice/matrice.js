// Matrice — configurable via window.CONFIG (config.js)
(function(){
  const C = window.CONFIG;

  // Populate UI options from CONFIG
  function fillSelect(id, arr){
    const el = document.getElementById(id);
    el.innerHTML = "";
    arr.forEach(opt => {
      if (Array.isArray(opt)){
        const [val, label] = opt;
        const o = document.createElement('option'); o.value = val; o.textContent = label; el.appendChild(o);
      } else {
        const o = document.createElement('option'); o.value = opt; o.textContent = opt; el.appendChild(o);
      }
    });
  }

  function initUI(){
    document.getElementById('title').textContent = C.ui.title || document.getElementById('title').textContent;
    document.getElementById('copyNotice').textContent = C.ui.copyNotice || "";
    document.getElementById('footerNotice').textContent = C.ui.copyNotice || "";

    fillSelect('materiau_type', C.options.materiau_type);
    fillSelect('materiau_texture', C.options.materiau_texture);
    fillSelect('materiau_traitement', C.options.materiau_traitement);
    fillSelect('tolerance', C.options.tolerance);
    fillSelect('operation_type', C.options.operation_type);
    fillSelect('complexite_type', C.options.complexite_type);

    // Presets
    const wrap = document.getElementById('presetBtns');
    wrap.innerHTML = "";
    (C.presets || []).forEach(p => {
      const b = document.createElement('button');
      b.className = "btn btn-brown";
      b.type = "button";
      b.textContent = p.label;
      b.addEventListener('click', ()=> applyPreset(p.params));
      wrap.appendChild(b);
    });
  }

  // Helpers & coefficients from CONFIG
  function coef_epaisseur(ep){
    if (ep <= 0) return 1.0;
    let base = 1.0 + Math.max(0, ep - 1) * 0.10;
    if (ep > 25) base *= 2;
    else if (ep > 15) base *= 1.5;
    return base;
  }
  function choisir_machine(w, h){
    const maxd = Math.max(w, h);
    if (maxd <= 300) return "petite";
    if (maxd <= 1000) return "moyenne";
    return "grande";
  }
  function coef_quantite(q){
    const lines = C.quantite.remise;
    for (let i=0;i<lines.length;i++){
      const [maxQ, factor] = lines[i];
      if (q <= maxQ) return factor;
    }
    return 1.0;
  }
  function round2(x){ return Math.round(x*100)/100 }
  function round3(x){ return Math.round(x*1000)/1000 }

  // Core compute
  function compute(){
    const alerts = [];
    const get = id => document.getElementById(id);
    const val = id => get(id).value;

    const mat_type = val('materiau_type');
    const mat_texture = val('materiau_texture');
    const mat_trait = val('materiau_traitement');
    const has_mask = get('masquage').checked;

    const ep = parseFloat(val('epaisseur_mm') || "0");
    const width = parseFloat(val('largeur_mm') || "0");
    const height = parseFloat(val('hauteur_mm') || "0");
    const fixations = get('fixations').checked;
    const tol = val('tolerance');
    const qty = parseInt(val('quantite') || "1");
    const op = val('operation_type');
    const comp = val('complexite_type');
    const prototype = get('prototype').checked;
    const fichierKO = get('fichier_non_optimal').checked;

    // Coefs
    const tcoef = C.coef;
    let coef_mat = (tcoef.materiau_type_coef[mat_type] || 1.0)
                 * (tcoef.materiau_texture_coef[mat_texture] || 1.0)
                 * (tcoef.materiau_traitement_coef[mat_trait] || 1.0);
    if (has_mask) coef_mat *= (C.implication.masquage_coef_vitesse || 0.95);
    coef_mat *= coef_epaisseur(ep);

    let waste_factor = 1.0;
    if (["verre","céramique","fragile"].includes(mat_type)){
      waste_factor += (C.divers.fragile_material_waste || 0.10);
      alerts.push(`Matière fragile : marge de ${Math.round((C.divers.fragile_material_waste||0.10)*100)}% prévue.`);
    }

    const surface_m2 = (width * height) / 1e6;
    const machine_size = choisir_machine(width, height);
    if (machine_size === "grande") alerts.push("Format large : machine grand format (coût horaire accru).");

    const coef_tol = (tcoef.tolerance_coef[tol] || 1.0);
    if (tol === "haute") alerts.push(`Tolérance stricte : vitesse -${Math.round((coef_tol-1)*100)}%.`);

    const coef_qty = coef_quantite(qty);
    if (qty > 1){
      if (coef_qty < 1.0) alerts.push(`Économie d'échelle : réduction de ${Math.round((1-coef_qty)*100)}% sur la partie service.`);
      else alerts.push("Quantité élevée variée : remise série non applicable.");
    }

    const op_param = C.operation_params[op] || C.operation_params['decoupe'];
    const coef_comp = (tcoef.complexite_type_coef[comp] || 1.0);

    const perimetre = 2 * (width + height);
    let base_length = perimetre * 1.0;
    if (comp !== "simple") base_length *= coef_comp;

    const is_raster = ["aplat","image_NB","photo_gris"].includes(comp);
    let time_per_piece_s = 0.0;

    if (["gravure","gravure_profonde","marquage"].includes(op) && is_raster){
      const line_spacing = 0.1;
      const lines = height / line_spacing;
      const vitesse_scan = 300.0;
      time_per_piece_s = lines * (width / vitesse_scan);
      if (comp === "photo_gris") time_per_piece_s *= 1.2;
    } else {
      const speed = op_param.speed_mm_s;
      let total_length = base_length;
      const passes = op_param.passes || 1;
      total_length *= passes;
      time_per_piece_s = total_length / speed;
    }

    time_per_piece_s *= coef_mat * coef_tol;

    // Implication
    let prep_time_min = C.implication.temps_preparation_fichier || 10.0;
    if (prototype){
      prep_time_min += (C.implication.supplement_prototype || 20.0);
      alerts.push(`Prototype/itérations : +${C.implication.supplement_prototype||20} min.`);
    }
    if (fichierKO){
      prep_time_min += (C.implication.supplement_correction_fichier || 30.0);
      alerts.push(`Adaptation fichier : +${C.implication.supplement_correction_fichier||30} min CAO.`);
    }
    if (fixations) prep_time_min += (C.implication.fixation_setup_time || 15.0);
    if (has_mask){
      prep_time_min += surface_m2 * (C.implication.masquage_pose_time_per_m2 || 5.0);
      alerts.push("Masquage : pose/retrait ajoutent du temps opérateur.");
    }

    time_per_piece_s += (prep_time_min * 60) / Math.max(qty,1);
    const total_time_s = time_per_piece_s * qty;
    const time_per_piece_h = time_per_piece_s / 3600.0;
    const total_time_h = total_time_s / 3600.0;

    // coûts
    const H = C.heures;
    const cout_machine_base = (H.machine_amortissement + H.machine_entretien + H.machine_usure_optique + H.machine_energie);
    const cost_material = surface_m2 * (C.prix_matiere_m2[mat_type] || 50.0) * waste_factor;
    const cost_machine  = total_time_h * cout_machine_base;
    const cost_operator = total_time_h * (H.tarif_horaire_operateur || 30.0);
    let cost_total = cost_material + cost_machine + cost_operator;
    cost_total *= (1.0 + (C.divers.marge || 0.10));

    const cost_material_total = cost_material;
    let cost_service_total = cost_total - cost_material_total;
    cost_service_total *= coef_qty;
    cost_total = cost_material_total + cost_service_total;

    if (cost_total < (C.quantite.min_facturation || 8.0)){
      cost_total = (C.quantite.min_facturation || 8.0);
      alerts.push(`Minimum de facturation (${C.quantite.min_facturation||8} €) appliqué.`);
    }

    const cost_unit = qty > 0 ? cost_total / qty : cost_total;

    if (time_per_piece_h > 1.0) alerts.push(`Temps unitaire > 1h (${round2(time_per_piece_h)} h). Vérification recommandée.`);
    if (cost_unit > 1000) alerts.push(`Prix unitaire élevé (${round2(cost_unit)} €). Devis manuel conseillé.`);
    if (cost_unit < 0.5 && cost_unit * qty < (C.quantite.min_facturation||8)) alerts.push("Prix unitaire très faible — minimum forfaitaire s'appliquera.");

    // UI
    document.getElementById('prix_unitaire').textContent = `${round2(cost_unit)} €`;
    document.getElementById('prix_total').textContent    = `${round2(cost_total)} €`;
    document.getElementById('t_unitaire').textContent    = `${round3(time_per_piece_h)}`;
    document.getElementById('t_total').textContent       = `${round2(total_time_h)}`;

    const alertsBox = document.getElementById('alerts');
    alertsBox.innerHTML = "";
    alerts.forEach(a => {
      const div = document.createElement('div');
      div.className = "alert";
      div.textContent = a;
      alertsBox.appendChild(div);
    });
  }

  function bind(){
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(el => {
      el.addEventListener('change', compute);
      if (el.type === 'number' || el.tagName === 'TEXTAREA' || el.type === 'text' || el.type === 'email'){
        el.addEventListener('input', compute);
      }
    });

    document.getElementById('resetBtn').addEventListener('click', ()=>{
      document.getElementById('materiau_type').value = 'bois';
      document.getElementById('materiau_texture').value = 'standard';
      document.getElementById('materiau_traitement').value = 'aucun';
      document.getElementById('masquage').checked = false;
      document.getElementById('epaisseur_mm').value = 3;
      document.getElementById('largeur_mm').value = 200;
      document.getElementById('hauteur_mm').value = 100;
      document.getElementById('fixations').checked = false;
      document.getElementById('tolerance').value = 'standard';
      document.getElementById('quantite').value = 5;
      document.getElementById('operation_type').value = 'decoupe';
      document.getElementById('complexite_type').value = 'moyenne';
      document.getElementById('prototype').checked = false;
      document.getElementById('fichier_non_optimal').checked = false;
      compute();
    });

    document.getElementById('contactForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('name').value || "";
      const email = document.getElementById('email').value || "";
      const msg = document.getElementById('message').value || "";
      const sujet = encodeURIComponent((window.CONFIG.ui.emailSubjectPrefix || "Demande devis — ") + name);
      const paramsTxt = collectParamsAsText();
      const corps = encodeURIComponent(`Bonjour,%0A%0AJe souhaite un devis :%0A%0A${paramsTxt}%0A%0ACommentaire : ${msg}%0A%0AContact : ${name} — ${email}`);
      window.location.href = `mailto:?subject=${sujet}&body=${corps}`;
    });
  }

  function collectParamsAsText(){
    const fields = [
      ["Matière", document.getElementById('materiau_type').value],
      ["Texture", document.getElementById('materiau_texture').value],
      ["Traitement", document.getElementById('materiau_traitement').value],
      ["Masquage", document.getElementById('masquage').checked ? "Oui":"Non"],
      ["Épaisseur (mm)", document.getElementById('epaisseur_mm').value],
      ["Largeur (mm)", document.getElementById('largeur_mm').value],
      ["Hauteur (mm)", document.getElementById('hauteur_mm').value],
      ["Fixations", document.getElementById('fixations').checked ? "Oui":"Non"],
      ["Tolérance", document.getElementById('tolerance').value],
      ["Quantité", document.getElementById('quantite').value],
      ["Opération", document.getElementById('operation_type').value],
      ["Complexité", document.getElementById('complexite_type').value],
      ["Prototype", document.getElementById('prototype').checked ? "Oui":"Non"],
      ["Fichier non optimisé", document.getElementById('fichier_non_optimal').checked ? "Oui":"Non"],
      ["Prix unitaire", document.getElementById('prix_unitaire').textContent],
      ["Prix total", document.getElementById('prix_total').textContent],
      ["Temps unitaire (h)", document.getElementById('t_unitaire').textContent],
      ["Temps total (h)", document.getElementById('t_total').textContent]
    ];
    return fields.map(([k,v]) => `${k}: ${v}`).join('%0A');
  }

  function applyPreset(params){
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (typeof v === "boolean") el.checked = v;
      else el.value = v;
    };
    set('materiau_type', params.materiau_type);
    set('materiau_texture', params.materiau_texture);
    set('materiau_traitement', params.materiau_traitement);
    document.getElementById('masquage').checked = !!params.masquage;
    set('epaisseur_mm', params.epaisseur_mm);
    set('largeur_mm', params.largeur_mm);
    set('hauteur_mm', params.hauteur_mm);
    document.getElementById('fixations').checked = !!params.fixations;
    set('tolerance', params.tolerance);
    set('quantite', params.quantite);
    set('operation_type', params.operation_type);
    set('complexite_type', params.complexite_type);
    document.getElementById('prototype').checked = (params.implication||[]).includes('prototype');
    document.getElementById('fichier_non_optimal').checked = (params.implication||[]).includes('fichier_non_optimal');
    compute();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initUI(); bind(); compute();
  });
})();