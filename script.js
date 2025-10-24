//
// Script de gestion du formulaire et du contenu dynamique du site Empreinte de Bois.
//
// Ce script construit un e‑mail personnalisé en fonction des options choisies
// par l'utilisateur : traitement (via un curseur), support (sélectionné via les
// accordéons générés dynamiquement), rendu (boutons radio), quantité et option
// « personnalisé ». Il génère également le carrousel des réalisations et la
// liste des supports à partir du contenu des dossiers assets/galerie et
// assets/bandeaux. Les tableaux galleryImages et bandData sont injectés à
// l'exécution (voir en haut de ce fichier) afin de refléter l'arborescence
// utilisée.

// Liste des images de la galerie : l'ordre d'apparition dans le slider dépend du tri alpha-numérique des noms
// (galerie01, galerie02, etc.). Ces chemins sont relatifs à la racine du site.
const galleryImages = [
  'assets/galerie/galerie01.png',
  'assets/galerie/galerie02.png',
  'assets/galerie/galerie03.png',
  'assets/galerie/galerie04.gif',
  'assets/galerie/galerie05.gif'
];

// Informations sur les supports : pour chaque dossier dans assets/bandeaux,
// les propriétés suivantes sont définies :
// - code : identifiant de la matière (nom du dossier)
// - image : chemin vers l'image carrée
// - title : titre affiché en gras et souligné
// - dimensions : description des dimensions
// - extra : informations complémentaires
// - label : combinaison des informations utilisée dans le corps du mail
const bandData = [
  {
    code: 'M01',
    image: 'assets/bandeaux/M01/image.png',
    title: 'Rond Sapin Ø100 mm',
    dimensions: 'Épaisseur: 15 mm — Diamètre: 100 mm',
    extra: 'Lot: 4 pièces minimum',
    label: 'Rond Sapin Ø100 mm, Épaisseur: 15 mm — Diamètre: 100 mm, Lot: 4 pièces minimum'
  },
  {
    code: 'M02',
    image: 'assets/bandeaux/M02/image.png',
    title: 'Rond Contreplaqué Ø100 mm',
    dimensions: 'Épaisseur: 3 mm — Diamètre: 100 mm',
    extra: 'Lot: 4 pièces minimum',
    label: 'Rond Contreplaqué Ø100 mm, Épaisseur: 3 mm — Diamètre: 100 mm, Lot: 4 pièces minimum'
  },
  {
    code: 'M03',
    image: 'assets/bandeaux/M03/image.png',
    title: 'Rond Similicuir Ø100 mm',
    dimensions: 'Couleurs: blanc ou rouge — Lot: 6 pièces',
    extra: 'Support inclus',
    label: 'Rond Similicuir Ø100 mm, Couleurs: blanc ou rouge — Lot: 6 pièces, Support inclus'
  },
  {
    code: 'M04',
    image: 'assets/bandeaux/M04/image.gif',
    title: 'Carré Bois 100×100 mm',
    dimensions: 'Épaisseur: 5 mm',
    extra: 'Essences: Noyer ou Sapin — Lot: 4 pièces minimum',
    label: 'Carré Bois 100×100 mm, Épaisseur: 5 mm, Essences: Noyer ou Sapin — Lot: 4 pièces minimum'
  },
  {
    code: 'M05',
    image: 'assets/bandeaux/M05/image.png',
    title: 'Carré Bois décaissé 100×100 mm',
    dimensions: 'Épaisseur: 5 mm — Légère cavité',
    extra: 'Essences: Noyer ou Sapin',
    label: 'Carré Bois décaissé 100×100 mm, Épaisseur: 5 mm — Légère cavité, Essences: Noyer ou Sapin'
  },
  {
    code: 'M06',
    image: 'assets/bandeaux/M06/image.png',
    title: 'Carte Acier',
    dimensions: 'Épaisseur: 0,2 mm',
    extra: 'Pas de minimum',
    label: 'Carte Acier, Épaisseur: 0,2 mm, Pas de minimum'
  },
  {
    code: 'M07',
    image: 'assets/bandeaux/M07/image.png',
    title: 'Similicuir avec support',
    dimensions: 'Lot: 6 pièces — Couleurs: blanc ou rouge',
    extra: 'Support inclus',
    label: 'Similicuir avec support, Lot: 6 pièces — Couleurs: blanc ou rouge, Support inclus'
  },
  {
    code: 'M08',
    image: 'assets/bandeaux/M08/image.png',
    title: 'Verre',
    dimensions: 'Projet personnalisé',
    extra: 'Contactez-nous pour un devis',
    label: 'Verre, Projet personnalisé, Contactez-nous pour un devis'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  // Préchargement des images de la galerie pour des transitions fluides
  galleryImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  // Génération dynamique du slider
  const sliderContainer = document.querySelector('.slider-container');
  galleryImages.forEach((src, index) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    const img = document.createElement('img');
    img.src = src;
    // Numérote l'image pour l'attribut alt : 01, 02, etc.
    const num = String(index + 1).padStart(2, '0');
    img.alt = `Réalisation ${num}`;
    slide.appendChild(img);
    sliderContainer.appendChild(slide);
  });
  // Une fois les slides créées, on peut les sélectionner
  const slides = sliderContainer.querySelectorAll('.slide');
  let currentSlide = 0;
  function showSlide(index) {
    slides.forEach((slide, i) => {
      if (i === index) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });
  }
  const prevBtn = document.querySelector('.slider-nav.prev');
  const nextBtn = document.querySelector('.slider-nav.next');
  if (prevBtn && nextBtn && slides.length > 0) {
    prevBtn.addEventListener('click', () => {
      currentSlide = (currentSlide - 1 + slides.length) % slides.length;
      showSlide(currentSlide);
    });
    nextBtn.addEventListener('click', () => {
      currentSlide = (currentSlide + 1) % slides.length;
      showSlide(currentSlide);
    });
    // Affiche la première image au chargement
    showSlide(0);
  }

  // Génération dynamique des supports (accordéons)
  const accordionList = document.querySelector('.accordion-list');
  bandData.forEach((data) => {
    const item = document.createElement('div');
    item.className = 'accordion-item';
    // Stocke code et label dans dataset pour une utilisation ultérieure (formulaire)
    item.dataset.code = data.code;
    item.dataset.label = data.label;
    // Création de l'en‑tête avec le nom du matériau et une flèche
    const header = document.createElement('div');
    header.className = 'accordion-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'material-name';
    nameSpan.textContent = data.code;
    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'arrow';
    arrowSpan.innerHTML = '&#x25BC;';
    header.appendChild(nameSpan);
    header.appendChild(arrowSpan);
    // Contenu dépliable
    const content = document.createElement('div');
    content.className = 'accordion-content';
    const productDetail = document.createElement('div');
    productDetail.className = 'product-detail';
    const img = document.createElement('img');
    img.src = data.image;
    img.alt = data.code;
    const textDiv = document.createElement('div');
    textDiv.className = 'product-text';
    const titleP = document.createElement('p');
    titleP.className = 'product-title';
    titleP.textContent = data.title;
    const dimP = document.createElement('p');
    dimP.className = 'product-dimensions';
    dimP.textContent = data.dimensions;
    const extraP = document.createElement('p');
    extraP.className = 'product-extra';
    extraP.textContent = data.extra;
    textDiv.appendChild(titleP);
    textDiv.appendChild(dimP);
    textDiv.appendChild(extraP);
    productDetail.appendChild(img);
    productDetail.appendChild(textDiv);
    content.appendChild(productDetail);
    item.appendChild(header);
    item.appendChild(content);
    accordionList.appendChild(item);
  });

  // Après création, sélectionne tous les nouveaux items pour lier les événements
  const accordionItems = accordionList.querySelectorAll('.accordion-item');
  const selectedMaterialInput = document.getElementById('selected-material');
  let selectedMaterialLabel = '';
  accordionItems.forEach((item) => {
    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      // Ferme tous les autres accordéons
      accordionItems.forEach((i) => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
        // Mémorise le code et le label pour le formulaire
        selectedMaterialInput.value = item.dataset.code || '';
        selectedMaterialLabel = item.dataset.label || '';
      } else {
        // Si on reclique, on ferme l'élément et on réinitialise la sélection
        selectedMaterialInput.value = '';
        selectedMaterialLabel = '';
      }
    });
  });

  // Gestion de l'option personnalisé : réinitialise la sélection de support si cochée
  const personaliseCheckbox = document.getElementById('personnalise');
  if (personaliseCheckbox) {
    personaliseCheckbox.addEventListener('change', () => {
      if (personaliseCheckbox.checked) {
        accordionItems.forEach((item) => item.classList.remove('active'));
        selectedMaterialInput.value = '';
        selectedMaterialLabel = '';
      }
    });
  }

  // Soumission du formulaire : construit l'URL mailto avec CC
  const form = document.getElementById('contact-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const subjectField = document.getElementById('subject');
    const traitementSlider = document.getElementById('traitement');
    const quantiteField = document.getElementById('quantite');
    const renduChoice = document.querySelector("input[name='rendu']:checked");
    const emailField = document.getElementById('email');

    const subject = subjectField.value.trim() || 'Demande de gravure';
    const traitementLabels = ['Brut', 'Moyen', 'Précis'];
    const traitement = traitementLabels[parseInt(traitementSlider.value, 10)];
    const quantite = quantiteField.value || '1';
    const rendu = renduChoice ? renduChoice.value : '';
    const email = emailField.value.trim();

    const bodyLines = [];
    if (personaliseCheckbox && personaliseCheckbox.checked) {
      bodyLines.push('personnalisation');
    }
    bodyLines.push(`Traitement : ${traitement}`);
    if (!personaliseCheckbox || !personaliseCheckbox.checked) {
      bodyLines.push(`Support : ${selectedMaterialLabel || 'Non précisé'}`);
    }
    bodyLines.push(`Rendu : ${rendu}`);
    bodyLines.push(`Quantité : ${quantite}`);
    bodyLines.push('');
    bodyLines.push('Télécharger les images');

    const mailtoBody = encodeURIComponent(bodyLines.join('\n'));
    const mailtoSubject = encodeURIComponent(subject);
    // Ajout du champ CC avec l'adresse e‑mail saisie par l'utilisateur (si valide)
    let ccParam = '';
    if (email) {
      ccParam = `&cc=${encodeURIComponent(email)}`;
    }
    const mailtoHref = `mailto:empreinte.de.bois@gmail.com?subject=${mailtoSubject}${ccParam}&body=${mailtoBody}`;
    window.location.href = mailtoHref;
  });
});