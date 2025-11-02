// Dark page 'Matrice' — live calculation
const materiau_type_coef = { bois:1.0, acrylique:1.1, acier:1.3, alu:1.2, inox:1.4, verre:1.5 };
const materiau_texture_coef = { standard:1.0, rugueux:1.1, miroir:1.2 };
const materiau_traitement_coef = { aucun:1.0, peint:1.05, anodise:1.0, verni:1.1 };

const MASQUAGE_POSE_TIME_PER_M2 = 5.0; // min / m²
const masquage_coef_vitesse = 0.95;
const fragile_material_waste = 0.10;

function coef_epaisseur(ep){
  if (ep <= 0) return 1.0;
  let base = 1.0 + Math.max(0, ep - 1) * 0.10;
  if (ep > 25) base *= 2;
  else if (ep > 15) base *= 1.5;
  return base;
}

function choisir_machine(width_mm, height_mm){
  const max_dim = Math.max(width_mm, height_mm);
  if (max_dim <= 300) return "petite";
  if (max_dim <= 1000) return "moyenne";
  return "grande";
}

const machine_cost_hour = { petite:50.0, moyenne:70.0, grande:100.0 };
const fixation_setup_time = 15.0; // minutes

const tolerance_coef = { standard:1.0, haute:1.2 };

function coef_quantite(q){
  if (q <= 1) return 1.0;
  if (q < 5) return 0.95;
  if (q < 10) return 0.90;
  if (q < 50) return 0.80;
  return 0.70;
}

const MIN_FACTURATION = 8.0;

const operation_params = {
  decoupe: { speed_mm_s:5.0, through:true },
  gravure: { speed_mm_s:50.0, through:false },
  gravure_profonde: { speed_mm_s:40.0, through:false, passes:3 },
  marquage: { speed_mm_s:60.0, through:false }
};

const complexite_type_coef = { simple:1.0, moyenne:1.2, elevee:1.5, aplat:1.3, image_NB:1.3, photo_gris:1.5 };

const temps_preparation_fichier = 10.0; // minutes
const supplement_prototype = 20.0;
const supplement_correction_fichier = 30.0;

const tarif_horaire_operateur = 30.0;
const machine_amortissement = 20.0;
const machine_entretien = 5.0;
const machine_usure_optique = 5.0;
const machine_energie = 5.0;
const cout_machine_base = machine_amortissement + machine_entretien + machine_usure_optique + machine_energie; // 35 €/h
const marge = 0.10;

const prix_matiere_m2 = { bois:30.0, acrylique:50.0, acier:100.0, alu:120.0, inox:150.0, verre:80.0 };

function round2(x){ return Math.round(x * 100) / 100; }
function round3(x){ return Math.round(x * 1000) / 1000; }

function calculerDevis(){
  const alerts = [];

  const mat_type = document.getElementById('materiau_type').value;
  const mat_texture = document.getElementById('materiau_texture').value;
  const mat_trait = document.getElementById('materiau_traitement').value;
  const has_mask = document.getElementById('masquage').checked;

  const ep = parseFloat(document.getElementById('epaisseur_mm').value || "0");
  const width = parseFloat(document.getElementById('largeur_mm').value || "0");
  const height = parseFloat(document.getElementById('hauteur_mm').value || "0");
  const fixations = document.getElementById('fixations').checked;
  const tol = document.getElementById('tolerance').value;
  const qty = parseInt(document.getElementById('quantite').value || "1");
  const op = document.getElementById('operation_type').value;
  const comp = document.getElementById('complexite_type').value;
  const prototype = document.getElementById('prototype').checked;
  const fichierKO = document.getElementById('fichier_non_optimal').checked;

  let coef_mat = (materiau_type_coef[mat_type] || 1.0)
               * (materiau_texture_coef[mat_texture] || 1.0)
               * (materiau_traitement_coef[mat_trait] || 1.0);
  if (has_mask) coef_mat *= masquage_coef_vitesse;
  coef_mat *= coef_epaisseur(ep);

  let waste_factor = 1.0;
  if (["verre","céramique","fragile"].includes(mat_type)){
    waste_factor += fragile_material_waste;
    alerts.push(`Matière fragile : une marge de ${Math.round(fragile_material_waste*100)}% de matière en surplus est prévue.`);
  }

  const surface_m2 = (width * height) / 1e6;
  const machine_size = choisir_machine(width, height);
  if (machine_size === "grande") alerts.push("Format large : machine grand format nécessaire (coût horaire plus élevé).");

  const coef_tol = tolerance_coef[tol] || 1.0;
  if (tol === "haute") alerts.push(`Tolérance stricte : vitesse de traitement réduite de ${Math.round((coef_tol-1)*100)}%.`);

  const coef_qty = coef_quantite(qty);
  if (qty > 1){
    if (coef_qty < 1.0) alerts.push(`Économie d'échelle : réduction de ${Math.round((1-coef_qty)*100)}% sur la partie service.`);
    else alerts.push("Quantité élevée avec variations : pas de remise de série applicable.");
  }

  const op_param = operation_params[op] || operation_params['decoupe'];
  const coef_comp = complexite_type_coef[comp] || 1.0;

  const perimetre = 2 * (width + height);
  let base_length = perimetre * 1.0;
  if (!["simple"].includes(comp)) base_length *= coef_comp;

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

  let prep_time_min = temps_preparation_fichier;
  if (prototype){
    prep_time_min += supplement_prototype;
    alerts.push(`Prototype/itérations : temps de préparation supplémentaire ajouté (${supplement_prototype} min).`);
  }
  if (fichierKO){
    prep_time_min += supplement_correction_fichier;
    alerts.push(`Adaptation fichier : ${supplement_correction_fichier} minutes de travail CAO facturées.`);
  }
  if (fixations) prep_time_min += 15.0;
  if (has_mask){
    prep_time_min += surface_m2 * MASQUAGE_POSE_TIME_PER_M2;
    alerts.push("Masquage de protection : pose/retrait ajoutent du temps opérateur.");
  }

  time_per_piece_s += (prep_time_min * 60) / Math.max(qty,1);
  const total_time_s = time_per_piece_s * qty;
  const time_per_piece_h = time_per_piece_s / 3600.0;
  const total_time_h = total_time_s / 3600.0;

  const cost_material = surface_m2 * (prix_matiere_m2[mat_type] || 50.0) * waste_factor;
  const cost_machine = total_time_h * (20+5+5+5);
  const cost_operator = total_time_h * 30.0;
  let cost_total = cost_material + cost_machine + cost_operator;
  cost_total *= (1.0 + 0.10);

  const cost_material_total = cost_material;
  let cost_service_total = cost_total - cost_material_total;
  cost_service_total *= coef_qty;
  cost_total = cost_material_total + cost_service_total;

  if (cost_total < MIN_FACTURATION){
    cost_total = MIN_FACTURATION;
    alerts.push(`Montant minimum de facturation (${MIN_FACTURATION} €) appliqué.`);
  }

  const cost_unit = qty > 0 ? cost_total / qty : cost_total;

  if (time_per_piece_h > 1.0){
    alerts.push(`Attention : temps unitaire > 1h (${round2(time_per_piece_h)} h). Projet complexe ou volumineux, vérification recommandée.`);
  }
  if (cost_unit > 1000){
    alerts.push(`Prix unitaire très élevé (${round2(cost_unit)} €). Cas extrême - un devis manuel est suggéré.`);
  }
  if (cost_unit < 0.5 && cost_unit * qty < MIN_FACTURATION){
    alerts.push("Prix unitaire très faible. Le minimum forfaitaire s'appliquera sur la commande.");
  }

  document.getElementById('prix_unitaire').textContent = `${round2(cost_unit)} €`;
  document.getElementById('prix_total').textContent = `${round2(cost_total)} €`;
  document.getElementById('t_unitaire').textContent = `${round3(time_per_piece_h)}`;
  document.getElementById('t_total').textContent = `${round2(total_time_h)}`;

  const alertsBox = document.getElementById('alerts');
  alertsBox.innerHTML = "";
  alerts.forEach(a => {
    const div = document.createElement('div');
    div.className = "alert";
    div.textContent = a;
    alertsBox.appendChild(div);
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

function bind(){
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(el => {
    el.addEventListener('change', calculerDevis);
    if (el.type === 'number' || el.tagName === 'TEXTAREA' || el.type === 'text' || el.type === 'email'){
      el.addEventListener('input', calculerDevis);
    }
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    document.querySelectorAll('input[type=number]').forEach(n => n.value = n.id.includes('epaisseur') ? 3 : (n.id.includes('largeur')?200:(n.id.includes('hauteur')?100: (n.id.includes('quantite')?5: n.value))));
    document.getElementById('materiau_type').value = 'bois';
    document.getElementById('materiau_texture').value = 'standard';
    document.getElementById('materiau_traitement').value = 'aucun';
    document.getElementById('masquage').checked = false;
    document.getElementById('fixations').checked = false;
    document.getElementById('tolerance').value = 'standard';
    document.getElementById('operation_type').value = 'decoupe';
    document.getElementById('complexite_type').value = 'moyenne';
    document.getElementById('prototype').checked = false;
    document.getElementById('fichier_non_optimal').checked = false;
    calculerDevis();
  });

  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value || "";
    const email = document.getElementById('email').value || "";
    const msg = document.getElementById('message').value || "";
    const sujet = encodeURIComponent(`Demande devis — ${name}`);
    const corps = encodeURIComponent(`Bonjour,%0A%0AJe souhaite un devis pour le projet suivant :%0A%0A${collectParamsAsText()}%0A%0ACommentaire : ${msg}%0A%0AContact : ${name} — ${email}`);
    window.location.href = `mailto:?subject=${sujet}&body=${corps}`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bind();
  calculerDevis();
});
