document.addEventListener("DOMContentLoaded", () => {
  // Gestion des filtres de la galerie
  const filterButtons = Array.from(document.querySelectorAll(".chip"));
  const galleryItems = Array.from(document.querySelectorAll(".gallery-item"));

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      // toggle active class on chips
      filterButtons.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", b === btn);
      });
      // show/hide gallery items
      galleryItems.forEach((item) => {
        const cat = item.dataset.cat || "";
        if (filter === "all" || cat.includes(filter)) {
          item.style.display = "";
        } else {
          item.style.display = "none";
        }
      });
    });
  });

  // Lightbox pour la galerie
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbCaption = document.getElementById("lightbox-caption");

  document.addEventListener("click", (evt) => {
    // si clic sur un bouton de galerie
    const btn = evt.target.closest(".gallery-item__btn");
    if (btn) {
      const fullSrc = btn.getAttribute("data-full");
      const title = btn.querySelector(".gallery-item__meta h3").textContent.trim();
      const desc = btn.querySelector(".gallery-item__meta p").textContent.trim();
      lbImg.src = fullSrc;
      lbImg.alt = title;
      lbCaption.textContent = `${title} — ${desc}`;
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      return;
    }
    // fermeture de la lightbox
    if (
      evt.target.dataset.close === "1" ||
      evt.target.classList.contains("lightbox__close")
    ) {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      lbImg.src = "";
    }
  });
  // fermer avec échappement
  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && lightbox.classList.contains("is-open")) {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      lbImg.src = "";
    }
  });

  // Données pour les modèles M01 à M10
  const designs = [
    {
      id: "M01",
      name: "Rond Sapin",
      desc: "Rond Sapin\nÉpaisseur: 15 mm — Diamètre: 100 mm\nLot: 4 pièces minimum",
      image: "assets/bandeaux/M01/image.png",
      thumb: "assets/bandeaux/M01/image.png",
      variants: [],
    },
    {
      id: "M02",
      name: "Rond Contreplaqué",
      desc: "Rond Contreplaqué\nÉpaisseur: 20 mm — Diamètre: 100 mm\nLot: 4 pièces minimum",
      image: "assets/bandeaux/M02/image.png",
      thumb: "assets/bandeaux/M02/image.png",
      variants: [
        "assets/bandeaux/M02/file_0000000019b8620aaf763fc03240ef9d_w640.webp",
      ],
    },
    {
      id: "M03",
      name: "Rond Similicuir blanc",
      desc: "Rond Similicuir blanc\nCouleur: blanc\nLot: 6 pièces minimum",
      image: "assets/bandeaux/M03/image.png",
      thumb: "assets/bandeaux/M03/image.png",
      variants: [
        "assets/bandeaux/M03/file_0000000019b8620aaf763fc03240ef9d_w640.webp",
      ],
    },
    {
      id: "M04",
      name: "Rond Similicuir rouge",
      desc: "Rond Similicuir rouge\nCouleur: rouge\nLot: 6 pièces minimum",
      image: "assets/bandeaux/M04/image.png",
      thumb: "assets/bandeaux/M04/image.png",
      variants: [
        "assets/bandeaux/M04/file_0000000019b8620aaf763fc03240ef9d_w640.webp",
      ],
    },
    {
      id: "M05",
      name: "Carré Bois Sapin",
      desc: "Carré Bois 100×100 mm\nÉpaisseur: 5 mm\nEssence: Sapin",
      image: "assets/bandeaux/M05/image.png",
      thumb: "assets/bandeaux/M05/image.png",
      variants: [
        "assets/bandeaux/M05/file_0000000019b8620aaf763fc03240ef9d_w640.webp",
      ],
    },
    {
      id: "M06",
      name: "Carré Bois Noyer",
      desc: "Carré Bois 100×100 mm\nÉpaisseur: 5 mm\nEssence: Noyer",
      image: "assets/bandeaux/M06/image.png",
      thumb: "assets/bandeaux/M06/image.png",
      variants: [
        "assets/bandeaux/M06/file_0000000019b8620aaf763fc03240ef9d_w640.webp",
      ],
    },
    {
      id: "M07",
      name: "Carré Bois décaissé",
      desc: "Carré Bois décaissé 100×100 mm\nÉpaisseur: 5 mm\nEssence: Noyer",
      image: "assets/bandeaux/M07/image.png",
      thumb: "assets/bandeaux/M07/image.png",
      variants: [
        "assets/bandeaux/M07/file_0000000019b8620aaf763fc03240ef9d_w640.webp",
      ],
    },
    {
      id: "M08",
      name: "Carte métal",
      desc: "Carte de visite en métal !\nFormat: 85×55 mm",
      image: "assets/bandeaux/M08/image.png",
      thumb: "assets/bandeaux/M08/image.png",
      variants: [],
    },
    {
      id: "M09",
      name: "À vous de jouer !",
      desc: "À vous de jouer !\nPièce customisable à volonté",
      image: "assets/bandeaux/M09/image.png",
      thumb: "assets/bandeaux/M09/image.png",
      variants: [],
    },
    {
      id: "M10",
      name: "Planche 200×300 mm",
      desc: "Planche 200×300 mm\nÉpaisseur: 5 mm\nEssence: Contreplaqué",
      image: "assets/bandeaux/M10/image.png",
      thumb: "assets/bandeaux/M10/image.png",
      variants: [
        "assets/bandeaux/M10/file_0000000019b8620aaf763fc03240ef9d_w640.webp",
      ],
    },
  ];

  // Création de la liste dans le DOM
  const listContainer = document.querySelector(".models-list");
  const previewContainer = document.querySelector(".model-preview");
  const modelImg = previewContainer.querySelector(".model-main img");
  const modelTitle = previewContainer.querySelector(".model-info h3");
  const modelDesc = previewContainer.querySelector(".model-info p");
  const variantsContainer = previewContainer.querySelector(".model-variants");
  const addBtn = previewContainer.querySelector(".add-selection");
  const selectionSummary = document.getElementById("selection-summary");

  let selectedModel = null;
  let selectedVariantIndex = 0;

  function updatePreview(model) {
    selectedModel = model;
    selectedVariantIndex = 0;
    modelImg.src = model.image;
    modelImg.alt = model.name;
    modelTitle.textContent = model.name;
    modelDesc.textContent = model.desc;
    variantsContainer.innerHTML = "";
    // Base image always considered variant index 0
    const baseThumb = document.createElement("div");
    baseThumb.className = "variant active";
    const baseImg = document.createElement("img");
    baseImg.src = model.thumb;
    baseImg.alt = `${model.name} (variante 0)`;
    baseThumb.appendChild(baseImg);
    baseThumb.addEventListener("click", () => {
      selectedVariantIndex = 0;
      modelImg.src = model.image;
      // toggle active
      variantsContainer
        .querySelectorAll(".variant")
        .forEach((el) => el.classList.remove("active"));
      baseThumb.classList.add("active");
    });
    variantsContainer.appendChild(baseThumb);
    // Additional variants
    model.variants.forEach((vSrc, idx) => {
      const variantDiv = document.createElement("div");
      variantDiv.className = "variant";
      const vImg = document.createElement("img");
      vImg.src = vSrc;
      vImg.alt = `${model.name} (variante ${idx + 1})`;
      variantDiv.appendChild(vImg);
      variantDiv.addEventListener("click", () => {
        selectedVariantIndex = idx + 1;
        modelImg.src = vSrc;
        variantsContainer
          .querySelectorAll(".variant")
          .forEach((el) => el.classList.remove("active"));
        variantDiv.classList.add("active");
      });
      variantsContainer.appendChild(variantDiv);
    });
  }

  // Populate list
  designs.forEach((model) => {
    const li = document.createElement("div");
    li.className = "models-item";
    li.innerHTML = `<h4>${model.name}</h4><p>${model.desc.split("\n")[0]}</p>`;
    li.addEventListener("click", () => {
      // highlight current selection
      listContainer
        .querySelectorAll(".models-item")
        .forEach((el) => el.classList.remove("active"));
      li.classList.add("active");
      updatePreview(model);
    });
    listContainer.appendChild(li);
  });
  // Select first by default
  if (designs.length > 0) {
    listContainer.firstChild.classList.add("active");
    updatePreview(designs[0]);
  }

  // Handle adding to selection summary
  addBtn.addEventListener("click", () => {
    if (!selectedModel) return;
    const baseName = selectedModel.name;
    const variantSuffix = selectedVariantIndex > 0 ? ` (Variante ${selectedVariantIndex})` : "";
    const entry = `${baseName}${variantSuffix}`;
    // Avoid duplicates
    const current = selectionSummary.value.split("\n").filter((l) => l.trim());
    if (!current.includes(entry)) {
      current.push(entry);
    }
    selectionSummary.value = current.join("\n");
  });
});