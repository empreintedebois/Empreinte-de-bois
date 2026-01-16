// adch_80085 - stockage local + import/export
const STORAGE_KEY = "adch_80085_state_v1";

function nowISO() {
  return new Date().toISOString();
}

function saveState() {
  STATE.meta.updatedAt = nowISO();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
  } catch (e) {
    console.warn("saveState failed", e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      STATE.meta.createdAt = nowISO();
      STATE.meta.updatedAt = nowISO();
      return;
    }
    const parsed = JSON.parse(raw);
    // Merge shallow (préserve le schéma)
    Object.assign(STATE, parsed);
    // Sécu champs manquants
    STATE.meta ||= { version: 1, app: "adch_80085", createdAt: nowISO(), updatedAt: nowISO() };
    STATE.counters ||= { mid: 0, sid: 0 };
    STATE.produits ||= [];
    STATE.mouvements ||= [];
    STATE.ui ||= { tab: "dashboard", period: "30j", dateFrom: "", dateTo: "", searchProduit: "", draft: { items: [], cmdDate: "", cmdLines: [] }, lastMessage: "" };
    STATE.settings ||= { autoExportAfterInject: true };
    STATE.ui.draft ||= { items: [], cmdDate: "", cmdLines: [] };
    STATE.ui.draft.items ||= [];
    STATE.ui.draft.cmdLines ||= [];
  } catch (e) {
    console.warn("loadState failed", e);
  }
}

function downloadJSON(filename, dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportState() {
  downloadJSON("atelier_stockflux.json", STATE);
}

function importStateFromFile(file, onDone) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(String(e.target.result || ""));
      if (!parsed || typeof parsed !== "object") throw new Error("JSON invalide");
      // Remplace l'état mais garde schema minimum
      Object.assign(STATE, parsed);
      // Normalisation
      STATE.meta ||= { version: 1, app: "adch_80085", createdAt: nowISO(), updatedAt: nowISO() };
      STATE.counters ||= { mid: 0, sid: 0 };
      STATE.produits ||= [];
      STATE.mouvements ||= [];
      STATE.ui ||= { tab: "dashboard", period: "30j", dateFrom: "", dateTo: "", searchProduit: "", draft: { items: [], cmdDate: "", cmdLines: [] }, lastMessage: "" };
      STATE.settings ||= { autoExportAfterInject: true };
      STATE.ui.draft ||= { items: [], cmdDate: "", cmdLines: [] };
      STATE.ui.draft.items ||= [];
      STATE.ui.draft.cmdLines ||= [];
      saveState();
      onDone?.(true);
    } catch (err) {
      console.error(err);
      onDone?.(false, String(err?.message || err));
    }
  };
  reader.readAsText(file);
}

function hardReset() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}
