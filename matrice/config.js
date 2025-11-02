// Configuration centrale (modifiable)
window.CONFIG = {
  ui: { title: "Matrice — Devis Gravure / Découpe", emailSubjectPrefix: "Demande devis — ", copyNotice: "Estimation indicative — modèle interne." },
  options: {
    materiau_type: ["bois","acrylique","acier","alu","inox","verre"],
    materiau_texture: ["standard","rugueux","miroir"],
    materiau_traitement: ["aucun","peint","anodise","verni"],
    tolerance: ["standard","haute"],
    operation_type: ["decoupe","gravure","gravure_profonde","marquage"],
    complexite_type: [["simple","Simple (texte / formes)"],["moyenne","Moyenne (illustration détaillée)"],["aplat","Aplat (zones pleines)"],["image_NB","Image N&B"],["photo_gris","Photo niveaux de gris"],["elevee","Élevée (très complexe)"]]
  },
  prix_matiere_m2: { bois:30.0, acrylique:50.0, acier:100.0, alu:120.0, inox:150.0, verre:80.0 },
  coef: {
    materiau_type_coef: { bois:1.0, acrylique:1.1, acier:1.3, alu:1.2, inox:1.4, verre:1.5 },
    materiau_texture_coef: { standard:1.0, rugueux:1.1, miroir:1.2 },
    materiau_traitement_coef: { aucun:1.0, peint:1.05, anodise:1.0, verni:1.1 },
    tolerance_coef: { standard:1.0, haute:1.2 },
    complexite_type_coef: { simple:1.0, moyenne:1.2, elevee:1.5, aplat:1.3, image_NB:1.3, photo_gris:1.5 }
  },
  heures: { tarif_horaire_operateur: 30.0, machine_amortissement: 20.0, machine_entretien: 5.0, machine_usure_optique: 5.0, machine_energie: 5.0 },
  quantite: { min_facturation: 8.0, remise: [[1,1.0],[4,0.95],[9,0.90],[49,0.80],[999999,0.70]] },
  operation_params: { decoupe:{speed_mm_s:5.0,through:true}, gravure:{speed_mm_s:50.0,through:false}, gravure_profonde:{speed_mm_s:40.0,through:false,passes:3}, marquage:{speed_mm_s:60.0,through:false} },
  implication: { temps_preparation_fichier:10.0, supplement_prototype:20.0, supplement_correction_fichier:30.0, masquage_pose_time_per_m2:5.0, masquage_coef_vitesse:0.95, fixation_setup_time:15.0 },
  divers: { fragile_material_waste:0.10, marge:0.10 },
  presets: [
    { label:"Tampon personnalisé (≈10€)", params:{materiau_type:"bois",materiau_texture:"standard",materiau_traitement:"aucun",masquage:false,epaisseur_mm:3,largeur_mm:50,hauteur_mm:50,fixations:false,tolerance:"standard",quantite:1,operation_type:"gravure",complexite_type:"simple",implication:[]} },
    { label:"6 dessous de verre (≈30€ le lot)", params:{materiau_type:"bois",materiau_texture:"standard",materiau_traitement:"aucun",masquage:false,epaisseur_mm:3,largeur_mm:100,hauteur_mm:100,fixations:false,tolerance:"standard",quantite:6,operation_type:"gravure",complexite_type:"moyenne",implication:[]} },
    { label:"Cartes métal 20u (≈0,5€/u)", params:{materiau_type:"acier",materiau_texture:"standard",materiau_traitement:"anodise",masquage:false,epaisseur_mm:0.2,largeur_mm:85,hauteur_mm:54,fixations:false,tolerance:"haute",quantite:20,operation_type:"marquage",complexite_type:"simple",implication:[]} }
  ]
};
