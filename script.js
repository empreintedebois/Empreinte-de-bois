//
// Script de gestion du formulaire et du contenu dynamique du site Empreinte de Bois.
//
// - Galerie : lit assets/galerie/galerie-config.json (avec cache-busting) et construit le slider.
//   → Plus AUCUN fallback à 5 images : si le JSON est vide/introuvable, on n’affiche rien et on log un warning.
//   → Chaque image a un handler 'error' : si elle ne charge pas, la slide est retirée.
//
// - Bandeaux : lit assets/bandeaux/bandeaux-config.json, puis chaque description.txt.
// - Formulaire : construit un mailto avec CC, type de fichier, texture, support, rendu, quantité.
//

async function initSite() {
  /* --------- Chargement des images du slider --------- */
  let galleryImages = [];
  try {
    const res = await fetch('assets/galerie/galerie-config.json?v=' + Date.now());
    if (res.ok) {
      const files = await res.json();
      // On construit des chemins absolus pour les <img>
      galleryImages = Array.isArray(files)
        ? files.map((file) => `assets/galerie/${file}`)
        : [];
    } else {
      console.warn('⚠️ galerie-config.json introuvable ou HTTP != 200');
    }
  } catch (err) {
    console.error('Erreur lors du chargement de galerie-config.json :', err);
  }

  // IMPORTANT : aucun fallback. Si vide, on n’invente pas d’images.
  if (!galleryImages || galleryImages.length === 0) {
    console.warn('⚠️ Aucune image de galerie trouvée (JSON vide ou non valide).');
    galleryImages = [];
  }

  // Précharger (facultatif mais utile)
  galleryImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  /* --------- Chargement des configurations des matériaux --------- */
  let bandConfig = [];
  try {
    const res = await fetch('assets/bandeaux/bandeaux-config.json?v=' + Date.now());
    if (res.ok) {
      bandConfig = await res.json();
    } else {
      console.warn('⚠️ bandeaux-config.json introuvable ou HTTP != 200');
    }
  } catch (err) {
    console.error('Erreur lors du chargement de bandeaux-config.json :', err);
  }

  // Configuration par défaut si absent (facultatif)
  if (!Array.isArray(bandConfig) || bandConfig.length === 0) {
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
    if (!item || !item.enabled) continue;

    const code = item.code;
    const displayName = item.name || code;
    const imageName = item.image || 'image.png';
    const folderPath = `assets/bandeaux/${code}`;

    // Lire description.txt (multi-lignes)
    let descLines = [];
    try {
      const descRes = await fetch(`${folderPath}/description.txt?v=` + Date.now());
      if (descRes.ok) {
        const txt = await descRes.text();
        descLines = txt.split(/\r?\n/).filter((line) => line.trim().length > 0);
      } else {
        console.warn(`⚠️ description.txt manquant pour ${code}`);
      }
    } catch (err) {
      console.warn(`Impossible de lire description.txt pour ${code}`, err);
    }

    const title = descLines[0] || '';
    const dimensions = descLines[1] || '';
    const extras = descLines.slice(2);
    const labelParts = [title, dimensions, ...extras].filter(Boolean);
    const label = labelParts.join(', ');

    bandData.push({
      code,
      name: displayName,
      image: `${folderPath}/${imageName}`,
      title,
      dimensions,
      extras,
      label
    });
  }

  /* --------- Génération du slider --------- */
  const sliderContainer = document.querySelector('.slider-container');
  if (sliderContainer) {
    galleryImages.forEach((src, index) => {
      const slide = document.createElement('div');
      slide.className = 'slide';

      const img = document.createElement('img');
      img.src = src;
      img.alt = `Réalisation ${String(index + 1).padStart(2, '0')}`;

      // Si l’image échoue à charger → on retire la slide (évite une vignette vide)
      img.addEventListener('error', () => {
        console.warn('Image manquante ou invalide dans la galerie :', src);
        slide.remove();
      });

      slide.appendChild(img);
      sliderContainer.appendChild(slide);
    });

    const slides = sliderContainer.querySelectorAll('.slide');
    let currentSlide = 0;

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
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
      // Afficher la première slide si au moins une existe
      showSlide(0);
    }
  }

  /* --------- Génération des supports (accordéons) --------- */
  const accordionList = document.querySelector('.accordion-list');
  if (accordionList) {
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
          if (selectedMaterialInput) selectedMaterialInput.value = item.dataset.code || '';
          selectedMaterialLabel = item.dataset.label || '';
        } else {
          if (selectedMaterialInput) selectedMaterialInput.value = '';
          selectedMaterialLabel = '';
        }
      });
    });

    const personaliseCheckbox = document.getElementById('personnalise');
    if (personaliseCheckbox) {
      personaliseCheckbox.addEventListener('change', () => {
        if (personaliseCheckbox.checked) {
          accordionItems.forEach((item) => item.classList.remove('active'));
          if (selectedMaterialInput) selectedMaterialInput.value = '';
          selectedMaterialLabel = '';
        }
      });
    }
  }

  /* --------- Soumission du formulaire --------- */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const subjectField = document.getElementById('subject');
      const traitementSlider = document.getElementById('traitement');
      const textureSlider = document.getElementById('texture');
      const quantiteField = document.getElementById('quantite');
      const renduChoice = document.querySelector("input[name='rendu']:checked");
      const emailField = document.getElementById('email');
      const personaliseCheckbox = document.getElementById('personnalise');

      const subject = subjectField && subjectField.value.trim() ? subjectField.value.trim() : 'Demande de gravure';

      const traitementLabels = ['Photo', 'Illustration', 'DXF'];
      const textureLabels = ['Aplat', 'Dégradé', 'Pointillé'];

      const traitement = traitementSlider ? traitementLabels[parseInt(traitementSlider.value, 10)] : '';
      const texture = textureSlider ? textureLabels[parseInt(textureSlider.value, 10)] : '';
      const quantite = quantiteField && quantiteField.value ? quantiteField.value : '1';
      const rendu = renduChoice ? renduChoice.value : '';
      const email = emailField && emailField.value ? emailField.value.trim() : '';

      const bodyLines = [];
      if (personaliseCheckbox && personaliseCheckbox.checked) {
        bodyLines.push('personnalisation');
      }
      if (traitement) bodyLines.push(`Type de fichier : ${traitement}`);
      if (texture) bodyLines.push(`Texture : ${texture}`);
      if (!personaliseCheckbox || !personaliseCheckbox.checked) {
        bodyLines.push(`Support : ${selectedMaterialLabel || 'Non précisé'}`);
      }
      if (rendu) bodyLines.push(`Rendu : ${rendu}`);
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
}

// Lance l'initialisation dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  initSite().catch((err) => console.error(err));
});
