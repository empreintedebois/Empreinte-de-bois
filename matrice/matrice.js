(function(){
  const C = window.CONFIG;
  function fillSelect(id, arr){ const el=document.getElementById(id); el.innerHTML=""; arr.forEach(opt=>{ const o=document.createElement('option'); if(Array.isArray(opt)){o.value=opt[0];o.textContent=opt[1];} else {o.value=opt;o.textContent=opt;} el.appendChild(o); }); }
  function initUI(){
    document.getElementById('title').textContent = C.ui.title || document.getElementById('title').textContent;
    document.getElementById('copyNotice').textContent = C.ui.copyNotice || ""; document.getElementById('footerNotice').textContent = C.ui.copyNotice || "";
    fillSelect('materiau_type',C.options.materiau_type); fillSelect('materiau_texture',C.options.materiau_texture); fillSelect('materiau_traitement',C.options.materiau_traitement);
    fillSelect('tolerance',C.options.tolerance); fillSelect('operation_type',C.options.operation_type); fillSelect('complexite_type',C.options.complexite_type);
    const wrap=document.getElementById('presetBtns'); wrap.innerHTML=""; (C.presets||[]).forEach(p=>{ const b=document.createElement('button'); b.className="x-btn x-btn-brown"; b.type="button"; b.textContent=p.label; b.addEventListener('click',()=>applyPreset(p.params)); wrap.appendChild(b); });
  }
  function coef_epaisseur(ep){ if(ep<=0)return 1.0; let b=1.0+Math.max(0,ep-1)*0.10; if(ep>25)b*=2; else if(ep>15)b*=1.5; return b; }
  function choisir_machine(w,h){ const m=Math.max(w,h); if(m<=300)return"petite"; if(m<=1000)return"moyenne"; return"grande"; }
  function coef_quantite(q){ const L=C.quantite.remise; for(let i=0;i<L.length;i++){const [mx,f]=L[i]; if(q<=mx) return f;} return 1.0; }
  function r2(x){return Math.round(x*100)/100} function r3(x){return Math.round(x*1000)/1000}
  function compute(){
    const A=[], g=id=>document.getElementById(id), v=id=>g(id).value;
    const mat=v('materiau_type'), tex=v('materiau_texture'), tr=v('materiau_traitement'); const mask=g('masquage').checked;
    const ep=parseFloat(v('epaisseur_mm')||"0"), w=parseFloat(v('largeur_mm')||"0"), h=parseFloat(v('hauteur_mm')||"0");
    const fix=g('fixations').checked, tol=v('tolerance'), q=parseInt(v('quantite')||"1"), op=v('operation_type'), comp=v('complexite_type');
    const proto=g('prototype').checked, ko=g('fichier_non_optimal').checked;

    let cm=(C.coef.materiau_type_coef[mat]||1.0)*(C.coef.materiau_texture_coef[tex]||1.0)*(C.coef.materiau_traitement_coef[tr]||1.0);
    if(mask) cm*=(C.implication.masquage_coef_vitesse||0.95); cm*=coef_epaisseur(ep);
    let waste=1.0; if(["verre","céramique","fragile"].includes(mat)){ waste+=(C.divers.fragile_material_waste||0.10); A.push(`Matière fragile : marge de ${Math.round((C.divers.fragile_material_waste||0.10)*100)}% prévue.`); }
    const S=(w*h)/1e6; const mach=choisir_machine(w,h); if(mach==="grande") A.push("Format large : machine grand format (coût horaire accru).");
    const ctol=(C.coef.tolerance_coef[tol]||1.0); if(tol==="haute") A.push(`Tolérance stricte : vitesse -${Math.round((ctol-1)*100)}%.`);
    const cq=coef_quantite(q); if(q>1){ if(cq<1.0) A.push(`Économie d'échelle : réduction de ${Math.round((1-cq)*100)}% sur la partie service.`); else A.push("Quantité élevée variée : remise série non applicable."); }

    const opp=C.operation_params[op]||C.operation_params.decoupe; const ccomp=(C.coef.complexite_type_coef[comp]||1.0);
    const peri=2*(w+h); let L=peri*1.0; if(comp!=="simple") L*=ccomp;
    const raster=["aplat","image_NB","photo_gris"].includes(comp); let tps=0.0;
    if(["gravure","gravure_profonde","marquage"].includes(op) && raster){ const ls=0.1; const lines=h/ls; const vscan=300.0; tps=lines*(w/vscan); if(comp==="photo_gris") tps*=1.2; }
    else { const sp=opp.speed_mm_s; let tot=L*(opp.passes||1); tps=tot/sp; }
    tps*=cm*ctol;

    let prep=C.implication.temps_preparation_fichier||10.0;
    if(proto){ prep+=C.implication.supplement_prototype||20.0; A.push(`Prototype/itérations : +${C.implication.supplement_prototype||20} min.`); }
    if(ko){ prep+=C.implication.supplement_correction_fichier||30.0; A.push(`Adaptation fichier : +${C.implication.supplement_correction_fichier||30} min CAO.`); }
    if(fix) prep+=C.implication.fixation_setup_time||15.0;
    if(mask){ prep+=S*(C.implication.masquage_pose_time_per_m2||5.0); A.push("Masquage : pose/retrait ajoutent du temps opérateur."); }

    tps += (prep*60)/Math.max(q,1);
    const T=tps*q, uh=tps/3600.0, th=T/3600.0;
    const H=C.heures, cmach=(H.machine_amortissement+H.machine_entretien+H.machine_usure_optique+H.machine_energie);
    const cmat=S*(C.prix_matiere_m2[mat]||50.0)*waste, cmc=th*cmach, cop=th*(H.tarif_horaire_operateur||30.0);
    let tot=cmat+cmc+cop; tot*=(1.0+(C.divers.marge||0.10));
    let srv=tot-cmat; srv*=cq; tot=cmat+srv;
    if(tot<(C.quantite.min_facturation||8.0)){ tot=(C.quantite.min_facturation||8.0); A.push(`Minimum de facturation (${C.quantite.min_facturation||8} €) appliqué.`); }
    const unit=q>0? tot/q : tot;
    if(uh>1.0) A.push(`Temps unitaire > 1h (${r2(uh)} h). Vérification recommandée.`);
    if(unit>1000) A.push(`Prix unitaire élevé (${r2(unit)} €). Devis manuel conseillé.`);
    if(unit<0.5 && unit*q<(C.quantite.min_facturation||8)) A.push("Prix unitaire très faible — minimum forfaitaire s'appliquera.");

    document.getElementById('prix_unitaire').textContent = `${r2(unit)} €`;
    document.getElementById('prix_total').textContent = `${r2(tot)} €`;
    document.getElementById('t_unitaire').textContent = `${r3(uh)}`;
    document.getElementById('t_total').textContent = `${r2(th)}`;

    const box=document.getElementById('alerts'); box.innerHTML=""; A.forEach(a=>{ const d=document.createElement('div'); d.className="alert"; d.textContent=a; box.appendChild(d); });
  }
  function bind(){
    const inputs=document.querySelectorAll('input,select,textarea');
    inputs.forEach(el=>{ el.addEventListener('change',compute); if(el.type==='number'||el.tagName==='TEXTAREA'||el.type==='text'||el.type==='email'){ el.addEventListener('input',compute);} });
    document.getElementById('resetBtn').addEventListener('click',()=>{
      document.getElementById('materiau_type').value='bois'; document.getElementById('materiau_texture').value='standard'; document.getElementById('materiau_traitement').value='aucun'; document.getElementById('masquage').checked=false;
      document.getElementById('epaisseur_mm').value=3; document.getElementById('largeur_mm').value=200; document.getElementById('hauteur_mm').value=100;
      document.getElementById('fixations').checked=false; document.getElementById('tolerance').value='standard'; document.getElementById('quantite').value=5; document.getElementById('operation_type').value='decoupe'; document.getElementById('complexite_type').value='moyenne'; document.getElementById('prototype').checked=false; document.getElementById('fichier_non_optimal').checked=false; compute();
    });
    document.getElementById('contactForm').addEventListener('submit',(e)=>{
      e.preventDefault(); const name=document.getElementById('name').value||"", email=document.getElementById('email').value||"", msg=document.getElementById('message').value||"";
      const sujet=encodeURIComponent((window.CONFIG.ui.emailSubjectPrefix||"Demande devis — ")+name); const paramsTxt=collectParamsAsText();
      const corps=encodeURIComponent(`Bonjour,%0A%0AJe souhaite un devis :%0A%0A${paramsTxt}%0A%0ACommentaire : ${msg}%0A%0AContact : ${name} — ${email}`);
      window.location.href=`mailto:?subject=${sujet}&body=${corps}`;
    });
  }
  function r2(x){return Math.round(x*100)/100} function r3(x){return Math.round(x*1000)/1000}
  function collectParamsAsText(){ const fields=[["Matière",materiau_type.value],["Texture",materiau_texture.value],["Traitement",materiau_traitement.value],["Masquage",masquage.checked?"Oui":"Non"],["Épaisseur (mm)",epaisseur_mm.value],["Largeur (mm)",largeur_mm.value],["Hauteur (mm)",hauteur_mm.value],["Fixations",fixations.checked?"Oui":"Non"],["Tolérance",tolerance.value],["Quantité",quantite.value],["Opération",operation_type.value],["Complexité",complexite_type.value],["Prototype",prototype.checked?"Oui":"Non"],["Fichier non optimisé",fichier_non_optimal.checked?"Oui":"Non"],["Prix unitaire",prix_unitaire.textContent],["Prix total",prix_total.textContent],["Temps unitaire (h)",t_unitaire.textContent],["Temps total (h)",t_total.textContent]]; return fields.map(([k,v])=>`${k}: ${v}`).join('%0A'); }
  function applyPreset(p){ const set=(id,v)=>{const el=document.getElementById(id); if(typeof v==="boolean") el.checked=v; else el.value=v;}; set('materiau_type',p.materiau_type); set('materiau_texture',p.materiau_texture); set('materiau_traitement',p.materiau_traitement); masquage.checked=!!p.masquage; set('epaisseur_mm',p.epaisseur_mm); set('largeur_mm',p.largeur_mm); set('hauteur_mm',p.hauteur_mm); fixations.checked=!!p.fixations; set('tolerance',p.tolerance); set('quantite',p.quantite); set('operation_type',p.operation_type); set('complexite_type',p.complexite_type); prototype.checked=(p.implication||[]).includes('prototype'); fichier_non_optimal.checked=(p.implication||[]).includes('fichier_non_optimal'); compute(); }
  document.addEventListener('DOMContentLoaded',()=>{ initUI(); bind(); compute(); });
})();