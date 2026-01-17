// adch_80085 - calculs

function pad(n, width) {
  const s = String(n);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

function nextMID() {
  STATE.counters.mid = (STATE.counters.mid || 0) + 1;
  return `M${pad(STATE.counters.mid, 6)}`;
}

function nextSID() {
  STATE.counters.sid = (STATE.counters.sid || 0) + 1;
  return `S${pad(STATE.counters.sid, 6)}`;
}

function parseDateInputToISO(dateStr) {
  // input type=date -> YYYY-MM-DD
  if (!dateStr) return "";
  // Fixe à midi pour éviter les soucis de TZ
  return `${dateStr}T12:00:00.000Z`;
}

function movementDateISO(m) {
  // m.date stockée en YYYY-MM-DD (simplifié)
  return parseDateInputToISO(m.date);
}

function isAnnulMovement(m) {
  return m.type === "ANNUL";
}

function isMovementAnnulled(mid) {
  return STATE.mouvements.some(x => x.type === "ANNUL" && x.refMid === mid);
}

function effectiveMovements() {
  // Exclut les mouvements annulés (cibles) et les mouvements ANNUL eux-mêmes (ils ne comptent pas dans stock)
  return STATE.mouvements.filter(m => !isAnnulMovement(m) && !isMovementAnnulled(m.mid));
}

function productById(id) {
  return STATE.produits.find(p => p.id === id);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function fmtEUR(n) {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return round2(v).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function fmtNum(n) {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return v.toLocaleString("fr-FR");
}

function withinRangeISO(iso, fromISO, toISO) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (fromISO) {
    const f = new Date(fromISO).getTime();
    if (t < f) return false;
  }
  if (toISO) {
    const to = new Date(toISO).getTime();
    if (t > to) return false;
  }
  return true;
}

function getPeriodRangeISO() {
  // returns {fromISO,toISO} for filtering dashboard metrics
  const p = STATE.ui.period;
  const now = new Date();
  // bornes inclusives : début/fin de journée en local
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const toISO = endOfToday.toISOString();

  if (p === "tout") return { fromISO: "", toISO: "" };
  if (p === "mois") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { fromISO: from.toISOString(), toISO };
  }
  // default 30j
  // 30 jours inclusifs : aujourd'hui + 29 jours précédents
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  from.setDate(from.getDate() - 29);
  return { fromISO: from.toISOString(), toISO };
}

function avgPriceAtDate(productId, isoAt) {
  // prix moyen pondéré des achats jusqu'à la date (incluse)
  const at = new Date(isoAt).getTime();
  let totalCost = 0;
  let totalUnits = 0;

  for (const m of effectiveMovements()) {
    if (m.type !== "ACHAT") continue;
    if (m.productId !== productId) continue;
    const d = new Date(movementDateISO(m)).getTime();
    if (d > at) continue;
    const q = Number(m.qtyUnits || 0);
    const c = Number(m.totalCost || 0);
    if (q > 0 && c >= 0) {
      totalUnits += q;
      totalCost += c;
    }
  }

  if (totalUnits <= 0) return 0;
  return totalCost / totalUnits;
}

function currentStock(productId) {
  let s = 0;
  for (const m of effectiveMovements()) {
    if (m.type === "VENTE_CMD") {
      const lines = Array.isArray(m.lines) ? m.lines : [];
      for (const ln of lines) {
        if (ln?.productId === productId) s += Number(ln.qtyUnits || 0) * -1;
      }
      continue;
    }
    if (!m.productId || m.productId !== productId) continue;
    if (m.type === "ACHAT" || m.type === "VENTE" || m.type === "PERTE") s += Number(m.qtyUnits || 0);
  }
  return s;
}

function currentAvgPrice(productId) {
  // prix moyen global sur tous achats effectifs
  let totalCost = 0;
  let totalUnits = 0;
  for (const m of effectiveMovements()) {
    if (m.type !== "ACHAT") continue;
    if (m.productId !== productId) continue;
    const q = Number(m.qtyUnits || 0);
    const c = Number(m.totalCost || 0);
    if (q > 0 && c >= 0) {
      totalUnits += q;
      totalCost += c;
    }
  }
  return totalUnits > 0 ? totalCost / totalUnits : 0;
}

function stockValue(productId) {
  const s = currentStock(productId);
  const p = currentAvgPrice(productId);
  return s * p;
}

function sumDashboardMetrics() {
  const { fromISO, toISO } = getPeriodRangeISO();

  let depensesGlobales = 0; // DEPENSE + pertes valorisées (perteCost)
  let depensesStock = 0;    // ACHAT totalCost
  let ventes = 0;           // VENTE saleTotal
  let coutMatiereVendu = 0; // VENTE costMatiere

  for (const m of effectiveMovements()) {
    const iso = movementDateISO(m);
    if (!withinRangeISO(iso, fromISO, toISO)) continue;

    if (m.type === "ACHAT") {
      depensesStock += Number(m.totalCost || 0);
    }

    if (m.type === "DEPENSE") {
      depensesGlobales += Number(m.amount || 0);
    }

    if (m.type === "PERTE") {
      depensesGlobales += Number(m.perteCost || 0);
    }

    if (m.type === "VENTE") {
      ventes += Number(m.saleTotal || 0);
      coutMatiereVendu += Number(m.costMatiere || 0);
    }

    if (m.type === "VENTE_CMD") {
      ventes += Number(m.saleTotal || 0);
      coutMatiereVendu += Number(m.costMatiere || 0);
    }
  }

  const rentabilite = ventes - depensesGlobales - depensesStock;
  const marge = ventes - coutMatiereVendu;

  return {
    range: { fromISO, toISO },
    depensesGlobales,
    depensesStock,
    ventes,
    rentabilite,
    coutMatiereVendu,
    marge,
  };
}

function dailySeries() {
  // Série journalière (ventes, dépenses, rentabilité) sur la période dashboard
  const { fromISO, toISO } = getPeriodRangeISO();
  const from = fromISO ? new Date(fromISO) : null;
  const to = toISO ? new Date(toISO) : null;
  if (!from || !to) return { labels: [], ventes: [], depenses: [], rentabilite: [] };

  const days = [];
  const cur = new Date(from.getTime());
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to.getTime());
  end.setHours(0, 0, 0, 0);
  while (cur.getTime() <= end.getTime()) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }

  const ventesBy = Object.create(null);
  const depBy = Object.create(null);

  for (const key of days) { ventesBy[key] = 0; depBy[key] = 0; }

  for (const m of effectiveMovements()) {
    const iso = movementDateISO(m);
    if (!withinRangeISO(iso, fromISO, toISO)) continue;
    const key = String(m.date || "");
    if (!key || !(key in ventesBy)) continue;

    if (m.type === "ACHAT") depBy[key] += Number(m.totalCost || 0);
    if (m.type === "DEPENSE") depBy[key] += Number(m.amount || 0);
    if (m.type === "PERTE") depBy[key] += Number(m.perteCost || 0);
    if (m.type === "VENTE" || m.type === "VENTE_CMD") ventesBy[key] += Number(m.saleTotal || 0);
  }

  const ventes = days.map(k => ventesBy[k] || 0);
  const depenses = days.map(k => depBy[k] || 0);
  const rentabilite = days.map((_, i) => ventes[i] - depenses[i]);

  return { labels: days, ventes, depenses, rentabilite };
}

function uniqueTags() {
  const tags = new Set();
  for (const m of effectiveMovements()) {
    (m.tags || []).forEach(t => tags.add(String(t)));
  }
  return Array.from(tags).sort((a,b)=>a.localeCompare(b));
}
