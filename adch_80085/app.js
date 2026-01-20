// adch_80085 - bootstrap

document.addEventListener("DOMContentLoaded", async () => {
  console.log("adch_80085 init");
  await loadState();

  // Nav tabs
  document.querySelectorAll("button[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      STATE.ui.tab = btn.dataset.tab;
      STATE.ui.lastMessage = "";
      saveState();
      render();
    });
  });

  // Actions
  const exportBtn = document.querySelector("button[data-action='export']");
  const importBtn = document.querySelector("button[data-action='import']");

  exportBtn.addEventListener("click", () => {
    setMessage("Export JSON généré");
    exportState();
    saveState();
    render();
  });

  importBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    // Filtre UI (ce n'est pas une sécurité) : on vise un JSON d'export de l'outil
    input.accept = ".json,application/json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

       // Règle demandée : importer si (et seulement si) le nom contient "atelier_stockflux" et se termine par ".json"
       const name = String(file.name || "").toLowerCase();
       const okName = name.includes("atelier_stockflux") && name.endsWith(".json");
       if (!okName) {
         STATE.ui.lastMessage = "Import refusé : le fichier doit contenir 'atelier_stockflux' et finir par .json";
         render();
         return;
       }

      importStateFromFile(file, (ok, err) => {
        if (!ok) {
          STATE.ui.lastMessage = `Import échoué : ${err}`;
        } else {
          STATE.ui.lastMessage = "Import OK";
        }
        render();
      });
    };
    input.click();
  });

  // Reset est dans l'onglet Aide (pas dans la topbar)

  // Default tab
  STATE.ui.tab ||= "dashboard";
  saveState();
  render();
});
