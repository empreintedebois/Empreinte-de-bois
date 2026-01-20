// adch_80085 - stockage IndexedDB (PWA/mobile) + import/export
// Objectif: remplacer localStorage par IndexedDB de manière transparente.

const STORAGE_KEY = "adch_80085_state_v1";
const DB_NAME = "adch_80085_db";
const DB_VERSION = 1;
const STORE_NAME = "kv";

function nowISO() {
  return new Date().toISOString();
}

let _dbPromise = null;
function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB non disponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Ouverture IndexedDB échouée"));
  });
  return _dbPromise;
}

async function idbGet(key) {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const st = tx.objectStore(STORE_NAME);
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error || new Error("IndexedDB get échoué"));
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const st = tx.objectStore(STORE_NAME);
    const req = st.put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error || new Error("IndexedDB put échoué"));
  });
}

async function idbDel(key) {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const st = tx.objectStore(STORE_NAME);
    const req = st.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error || new Error("IndexedDB delete échoué"));
  });
}

// --- API utilisée par le reste de l'app ---

let _saveTimer = null;

function normalizeStateShape() {
  // Sécu champs manquants
  STATE.meta ||= { version: 1, app: "adch_80085", createdAt: nowISO(), updatedAt: nowISO(), lastExportAt: null, lastExportFile: "", lastInjectAt: null };
  STATE.meta.lastExportAt ??= null;
  STATE.meta.lastExportFile ??= "";
  STATE.meta.lastInjectAt ??= null;

  STATE.counters ||= { mid: 0, sid: 0 };
  STATE.produits ||= [];
  STATE.mouvements ||= [];
  STATE.settings ||= { autoExportAfterInject: true, exportReminderDays: 7 };
  STATE.settings.exportReminderDays ??= 7;
  // Catégories produits extensibles (base)
  STATE.settings.productCategories ||= ["Bois", "Matières", "Lumières", "Composants", "Support"];

  STATE.ui ||= {
    tab: "dashboard",
    period: "30j",
    analysisPeriod: "tout",
    dateFrom: "",
    dateTo: "",
    searchProduit: "",
    journalSearch: "",
    journalCategory: "",
    draft: { items: [], cmdDate: "", cmdLines: [], cmdSaleTotal: "", cmdLabel: "" },
    lastMessage: ""
  };

  STATE.ui.draft ||= { items: [], cmdDate: "", cmdLines: [], cmdSaleTotal: "", cmdLabel: "" };
  STATE.ui.analysisPeriod ??= "tout";
  STATE.ui.draft.items ||= [];
  STATE.ui.draft.cmdLines ||= [];
  STATE.ui.draft.cmdSaleTotal ??= "";
  STATE.ui.draft.cmdLabel ??= "";
  STATE.ui.journalSearch ??= "";
  STATE.ui.journalCategory ??= "";
}

async function loadState() {
  try {
    const raw = await idbGet(STORAGE_KEY);
    if (!raw) {
      STATE.meta.createdAt = nowISO();
      STATE.meta.updatedAt = nowISO();
      normalizeStateShape();
      return;
    }
    const parsed = JSON.parse(String(raw));
    Object.assign(STATE, parsed);
    normalizeStateShape();
  } catch (e) {
    console.warn("loadState failed", e);
    // Fallback: si IndexedDB échoue, garder l'état par défaut (pas de crash)
    normalizeStateShape();
  }
}

function saveState() {
  // Déclenche une sauvegarde asynchrone (debounce) pour éviter d'écrire en boucle.
  STATE.meta.updatedAt = nowISO();
  normalizeStateShape();

  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      await idbSet(STORAGE_KEY, JSON.stringify(STATE));
    } catch (e) {
      console.warn("saveState failed", e);
    }
  }, 300);
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
  // Format demandé : atelier_stockflux_YYYY-MM-DD.json (date locale)
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const filename = `atelier_stockflux_${yyyy}-${mm}-${dd}.json`;

  STATE.meta.lastExportAt = nowISO();
  STATE.meta.lastExportFile = filename;
  saveState();
  downloadJSON(filename, STATE);
}

function importStateFromFile(file, onDone) {
  const name = String(file?.name || "").toLowerCase();
  const okName = name.includes("atelier_stockflux") && name.endsWith(".json");
  if (!okName) {
    onDone?.(false, "Nom invalide : doit contenir 'atelier_stockflux' et finir par .json");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(String(e.target.result || ""));
      if (!parsed || typeof parsed !== "object") throw new Error("JSON invalide");
      Object.assign(STATE, parsed);
      normalizeStateShape();
      saveState();
      onDone?.(true);
    } catch (err) {
      console.error(err);
      onDone?.(false, String(err?.message || err));
    }
  };
  reader.readAsText(file);
}

async function hardReset() {
  try {
    await idbDel(STORAGE_KEY);
  } catch (e) {
    console.warn("hardReset failed", e);
  }
  location.reload();
}
