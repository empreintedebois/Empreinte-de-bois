//
// Script de gestion du formulaire et du contenu dynamique du site Empreinte de Bois.
//
// Ce script construit un e‑mail personnalisé en fonction des options choisies par l'utilisateur :
// type de fichier (via un curseur), texture de gravure (second curseur), support sélectionné
// (via des accordéons générés dynamiquement), rendu (boutons radio), quantité et option
// « personnalisé ». Il génère également le carrousel des réalisations et la liste des supports
// à partir de fichiers de configuration situés dans `assets/galerie/galerie-config.json` et
// `assets/bandeaux/bandeaux-config.json`, ainsi que des fichiers `description.txt` dans chaque
// dossier de support.
//
// Les fichiers de configuration permettent d'activer/désactiver des supports (M01 à M10),
// de modifier leur nom d'affichage et l'image associée sans avoir à modifier ce script.
// La galerie de réalisations est également entièrement configurable via un simple fichier JSON.

// Fonction asynchrone principale qui initialise la page après le chargement du DOM.
async function initSite() {
  /* --------- Chargement des images du slider --------- */
  let galleryImages = [];
  try {
    const res = await fetch('assets/galerie/galerie-config.json');
    if (res.ok) {
      const files = await res.json();
      galleryImages = files.map((file) => `assets/galerie/${file}`);
    }
  } catch (err) {
    console.error('Erreur lors du chargement de galerie-config.json :', err);
  }
  // Si le fichier n'existe pas ou est vide, utiliser des images par défaut
  if (!galleryImages || galleryImages.length === 0) {
    galleryImages = [
      'assets/galerie/galerie01.gif',
      'assets/galerie/galerie02.jpg',
      'assets/galerie/galerie03.jpg',
      'assets/galerie/galerie04.jpg',
      'assets/galerie/galerie05.jpg'
    ];
  }
  // Précharger les images pour des transitions plus fluides
  galleryImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  /* --------- Chargement des configurations des matériaux --------- */
  let bandConfig = [];
  try {
    const res = await fetch('assets/bandeaux/bandeaux-config.json');
    if (res.ok) {
      bandConfig = await res.json();
    }
  } catch (err) {
    console.error('Erreur lors du chargement de bandeaux-config.json :', err);
  }
  // Configuration par défaut si le fichier est manquant
  if (!bandConfig || bandConfig.length === 0) {
    bandConfig = [
      { code: 'M01', name: 'M01', enabled: true, image: 'image.png' },
      { code: 'M02', name: 'M02', enabled: true, image: 'image.png' },
      { code: 'M03', name: 'M03', enabled: true, image: 'image.png' },
      { code: 'M04', name: 'M04', enabled: true, image: 'image.gif' },
      { code: 'M05', name: 'M05', enabled: true, image: 'image.png' }
    ];
  }

  // Construire les données des supports à partir des configurations
  const bandData = [];
  for (const item of bandConfig) {
    if (!item.enabled) continue;
    const code = item.code;
    const displayName = item.name || code;
    const imageName = item.image || 'image.png';
    const folderPath = `assets/bandeaux/${code}`;
    // Lire description.txt pour récupérer titre, dimensions et lignes supplémentaires
    let descLines = [];
    try {
      const descRes = await fetch(`${folderPath}/description.txt`);
      if (descRes.ok) {
        const txt = await descRes.text();
        // filtre les lignes vides
        descLines = txt.split(/\r?\n/).filter((line) => line.trim().length > 0);
      }
    } catch (err) {
      console.warn(`Impossible de lire description.txt pour ${code}`, err);
    }
    const title = descLines[0] || '';
    const dimensions = descLines[1] || '';
    const extras = descLines.slice(2);
    const labelParts = [title, dimensions, ...extras].filter(Boolean);
    const label = labelParts.join(', ');
    bandData.push({ code, name: displayName, image: `${folderPath}/${imageName}`, title, dimensions, extras, label });
  }

  /* --------- Génération du slider --------- */
  const sliderContainer = document.querySelector('.slider-container');
  galleryImages.forEach((src, index) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    const img = document.createElement('img');
    img.src = src;
    const num = String(index + 1).padStart(2, '0');
    img.alt = `Réalisation ${num}`;
    slide.appendChild(img);
    sliderContainer.appendChild(slide);
  });
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
    showSlide(0);
  }

  /* --------- Génération des supports (accordéons) --------- */
  const accordionList = document.querySelector('.accordion-list');
  bandData.forEach((data) => {
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.dataset.code = data.code;
    item.dataset.label = data.label;
    const header = document.createElement('div');
    header.className = 'accordion-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'material-name';
    nameSpan.textContent = data.name;
    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'arrow';
    arrowSpan.innerHTML = '&#x25BC;';
    header.appendChild(nameSpan);
    header.appendChild(arrowSpan);
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
    textDiv.appendChild(titleP);
    if (data.dimensions) {
      const dimP = document.createElement('p');
      dimP.className = 'product-dimensions';
      dimP.textContent = data.dimensions;
      textDiv.appendChild(dimP);
    }
    if (data.extras && data.extras.length) {
      data.extras.forEach((line) => {
        const extraP = document.createElement('p');
        extraP.className = 'product-extra';
        extraP.textContent = line;
        textDiv.appendChild(extraP);
      });
    }
    productDetail.appendChild(img);
    productDetail.appendChild(textDiv);
    content.appendChild(productDetail);
    item.appendChild(header);
    item.appendChild(content);
    accordionList.appendChild(item);
  });
  const accordionItems = accordionList.querySelectorAll('.accordion-item');
  const selectedMaterialInput = document.getElementById('selected-material');
  let selectedMaterialLabel = '';
  accordionItems.forEach((item) => {
    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      accordionItems.forEach((i) => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
        selectedMaterialInput.value = item.dataset.code || '';
        selectedMaterialLabel = item.dataset.label || '';
      } else {
        selectedMaterialInput.value = '';
        selectedMaterialLabel = '';
      }
    });
  });
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

  /* --------- Soumission du formulaire --------- */
  const form = document.getElementById('contact-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const subjectField = document.getElementById('subject');
    const traitementSlider = document.getElementById('traitement');
    const textureSlider = document.getElementById('texture');
    const quantiteField = document.getElementById('quantite');
    const renduChoice = document.querySelector("input[name='rendu']:checked");
    const emailField = document.getElementById('email');
    const subject = subjectField.value.trim() || 'Demande de gravure';
    const traitementLabels = ['Photo', 'Illustration', 'DXF'];
    const traitement = traitementLabels[parseInt(traitementSlider.value, 10)];
    const textureLabels = ['Aplat', 'Dégradé', 'Pointillé'];
    const texture = textureLabels[parseInt(textureSlider.value, 10)];
    const quantite = quantiteField.value || '1';
    const rendu = renduChoice ? renduChoice.value : '';
    const email = emailField.value.trim();
    const bodyLines = [];
    if (personaliseCheckbox && personaliseCheckbox.checked) {
      bodyLines.push('personnalisation');
    }
    bodyLines.push(`Type de fichier : ${traitement}`);
    bodyLines.push(`Texture : ${texture}`);
    if (!personaliseCheckbox || !personaliseCheckbox.checked) {
      bodyLines.push(`Support : ${selectedMaterialLabel || 'Non précisé'}`);
    }
    bodyLines.push(`Rendu : ${rendu}`);
    bodyLines.push(`Quantité : ${quantite}`);
    bodyLines.push('');
    bodyLines.push('Télécharger les images');
    const mailtoBody = encodeURIComponent(bodyLines.join('\n'));
    const mailtoSubject = encodeURIComponent(subject);
    let ccParam = '';
    if (email) {
      ccParam = `&cc=${encodeURIComponent(email)}`;
    }
    const mailtoHref = `mailto:empreinte.de.bois@gmail.com?subject=${mailtoSubject}${ccParam}&body=${mailtoBody}`;
    window.location.href = mailtoHref;
  });
}

// Lance l'initialisation dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  initSite().catch((err) => console.error(err));
});