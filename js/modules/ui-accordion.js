export function initAccordion(config) {
  const allDetails = Array.from(document.querySelectorAll("details.acc"));

  if (!allDetails.length) return;

  // Visibilité des matériaux via config
  const visibleMap = config?.materialsVisibility || {};
  for (const d of allDetails) {
    const id = d.dataset.material;
    if (id && Object.prototype.hasOwnProperty.call(visibleMap, id)) {
      d.hidden = !visibleMap[id];
    }
  }

  // Un seul ouvert à la fois
  allDetails.forEach((details) => {
    details.addEventListener("toggle", () => {
      if (details.open) {
        allDetails.forEach((other) => {
          if (other !== details) other.open = false;
        });
      }
    });
  });
}
