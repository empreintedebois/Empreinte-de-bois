// adch_80085 - bootstrap

document.addEventListener("DOMContentLoaded", () => {
  console.log("adch_80085 init");
  loadState();

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
  const resetBtn = document.querySelector("button[data-action='reset']");

  exportBtn.addEventListener("click", () => {
    setMessage("Export JSON généré");
    exportState();
    saveState();
    render();
  });

  importBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
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

  resetBtn.addEventListener("click", () => {
    const ok = confirm("Reset total ? (efface l'état local)\nPense à exporter avant.");
    if (!ok) return;
    hardReset();
  });

  // Default tab
  STATE.ui.tab ||= "dashboard";
  saveState();
  render();
});
