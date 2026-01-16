/* Atelier — Stock & Flux (V1)
   - Journal immuable (annulation/contre-ecriture)
   - Produits + Mouvements + Commandes (ventes multi-lignes)
   - Prix moyen pondéré à l'instant T (jusqu'à la date)
   - Pertes valorisées à l'instant T
   - Export/Import JSON + localStorage (par appareil)
*/

(() => {
  'use strict';

  const STORAGE_KEY = 'atelier_stockflux_v1';
  const FORMAT_VERSION = 1;

  /** @typedef {'ACHAT'|'VENTE'|'PERTE'|'DEPENSE'|'ANNUL'} MoveType */

  /**
   * @returns {import('./types').State|any}
   */
  function defaultState() {
    return {
      formatVersion: FORMAT_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextMid: 1,
      nextSid: 1,
      products: [],
      movements: [],
      sales: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultState();
      if (parsed.formatVersion !== FORMAT_VERSION) {
        // Future: migration
        return { ...defaultState(), ...parsed, formatVersion: FORMAT_VERSION };
      }
      return parsed;
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function pad(n, width) {
    const s = String(n);
    return s.length >= width ? s : '0'.repeat(width - s.length) + s;
  }

  function newMid() {
    const id = `M${pad(state.nextMid, 6)}`;
    state.nextMid += 1;
    return id;
  }

  function newSid() {
    const id = `S${pad(state.nextSid, 6)}`;
    state.nextSid += 1;
    return id;
  }

  function parseDateISO(dateStr) {
    // Expect YYYY-MM-DD
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) return null;
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  function isoToday() {
    const d = new Date();
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1, 2);
    const da = pad(d.getDate(), 2);
    return `${y}-${m}-${da}`;
  }

  function money(n) {
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  }

  function num(n) {
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat('fr-FR').format(n);
  }

  function toast(msg, kind = 'info') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    if (kind === 'danger') el.style.borderColor = 'rgba(255,77,77,.5)';
    if (kind === 'warn') el.style.borderColor = 'rgba(255,191,58,.5)';
    if (kind === 'ok') el.style.borderColor = 'rgba(61,220,151,.5)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function normalizeTag(t) {
    return String(t || '').trim();
  }

  function uniqueNonEmpty(arr) {
    const out = [];
    const seen = new Set();
    for (const a of arr) {
      const v = normalizeTag(a);
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  }

  // --- Domain helpers ---

  function getProductById(id) {
    return state.products.find(p => p.id === id) || null;
  }

  function listAllTags() {
    const tags = [];
    for (const mv of state.movements) {
      if (Array.isArray(mv.tags)) tags.push(...mv.tags);
    }
    return uniqueNonEmpty(tags);
  }

  function buildAnnulSet() {
    const set = new Set();
    for (const mv of state.movements) {
      if (mv.type === 'ANNUL' && mv.refMid) set.add(mv.refMid);
    }
    return set;
  }

  function movementEffective(mv, annulSet) {
    if (!mv || typeof mv !== 'object') return false;
    if (mv.type === 'ANNUL') return true; // keep annul events in history
    if (annulSet.has(mv.mid)) return false;
    return true;
  }

  function compareDateThenId(a, b) {
    // sort by date asc, then mid
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.mid < b.mid) return -1;
    if (a.mid > b.mid) return 1;
    return 0;
  }

  function computeAverageUnitPriceAt(productId, dateISO, annulSet) {
    // Weighted average of purchases up to dateISO (inclusive)
    let totalCost = 0;
    let totalUnits = 0;
    for (const mv of state.movements) {
      if (!movementEffective(mv, annulSet)) continue;
      if (mv.type !== 'ACHAT') continue;
      if (mv.productId !== productId) continue;
      if (mv.date > dateISO) continue;
      const qty = Number(mv.qtyUnits) || 0;
      const unitPrice = Number(mv.unitPrice) || 0;
      if (qty <= 0) continue;
      totalUnits += qty;
      totalCost += qty * unitPrice;
    }
    if (totalUnits <= 0) return null;
    return totalCost / totalUnits;
  }

  function computeStockAt(productId, dateISO, annulSet) {
    // Stock as sum of deltas up to dateISO
    let stock = 0;
    for (const mv of state.movements) {
      if (!movementEffective(mv, annulSet)) continue;
      if (!mv.productId || mv.productId !== productId) continue;
      if (mv.date > dateISO) continue;
      const qty = Number(mv.qtyUnits) || 0;
      if (mv.type === 'ACHAT') stock += qty;
      else if (mv.type === 'VENTE') stock -= qty;
      else if (mv.type === 'PERTE') stock -= qty;
      // DEPENSE has no productId
    }
    return stock;
  }

  function computeSnapshots(range) {
    // range: {fromISO, toISO} inclusive
    const annulSet = buildAnnulSet();

    const toISO = range.toISO;

    // Products snapshot today
    const productRows = state.products.map(p => {
      const stock = computeStockAt(p.id, toISO, annulSet);
      const avg = computeAverageUnitPriceAt(p.id, toISO, annulSet);
      const value = avg == null ? null : stock * avg;
      return {
        id: p.id,
        name: p.name || '',
        stock,
        avg,
        value,
        unitsPerLotDefault: p.unitsPerLotDefault || null
      };
    });

    // Period sums
    let depensesGlobales = 0;
    let depensesStock = 0;
    let ventes = 0;
    let coutMatiereVendu = 0;

    for (const mv of state.movements) {
      if (!movementEffective(mv, annulSet)) continue;
      if (mv.date < range.fromISO || mv.date > range.toISO) continue;

      if (mv.type === 'DEPENSE') {
        depensesGlobales += Number(mv.amount) || 0;
      }

      if (mv.type === 'ACHAT') {
        const cost = (Number(mv.qtyUnits) || 0) * (Number(mv.unitPrice) || 0);
        depensesStock += cost;
      }

      if (mv.type === 'PERTE') {
        depensesGlobales += Number(mv.lossCost) || 0;
      }

      if (mv.type === 'VENTE') {
        ventes += Number(mv.saleTotal) || 0;
        coutMatiereVendu += Number(mv.materialCost) || 0;
      }
    }

    const rentabilite = ventes - (depensesGlobales + depensesStock);
    const marge = ventes - coutMatiereVendu;

    // Build negative stock list
    const negatives = productRows.filter(r => r.stock < 0);

    return {
      productRows,
      depensesGlobales,
      depensesStock,
      ventes,
      coutMatiereVendu,
      marge,
      rentabilite,
      negatives,
      annulSet
    };
  }

  // --- UI ---

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function initEls() {
    els.btnExport = $('btnExport');
    els.btnImport = $('btnImport');
    els.btnReset = $('btnReset');

    els.rangeFrom = $('rangeFrom');
    els.rangeTo = $('rangeTo');
    els.btnRange30 = $('btnRange30');
    els.btnRangeMonth = $('btnRangeMonth');

    els.kpiStockValue = $('kpiStockValue');
    els.kpiStockCount = $('kpiStockCount');
    els.kpiDepGlobal = $('kpiDepGlobal');
    els.kpiDepStock = $('kpiDepStock');
    els.kpiVentes = $('kpiVentes');
    els.kpiMarge = $('kpiMarge');
    els.kpiRent = $('kpiRent');

    els.negList = $('negList');

    els.productsTableBody = $('productsTableBody');
    els.productsSearch = $('productsSearch');
    els.btnProductAdd = $('btnProductAdd');

    els.draftType = $('draftType');
    els.draftDate = $('draftDate');
    els.draftNote = $('draftNote');
    els.draftTags = $('draftTags');
    els.draftProductId = $('draftProductId');
    els.draftQtyUnits = $('draftQtyUnits');

    els.blockPurchase = $('blockPurchase');
    els.purchaseQtyLots = $('purchaseQtyLots');
    els.purchaseUnitsPerLot = $('purchaseUnitsPerLot');
    els.purchasePriceLot = $('purchasePriceLot');

    els.blockExpense = $('blockExpense');
    els.expenseAmount = $('expenseAmount');

    els.blockSale = $('blockSale');
    els.saleLines = $('saleLines');
    els.btnSaleAddLine = $('btnSaleAddLine');

    els.btnDraftAdd = $('btnDraftAdd');
    els.btnDraftClear = $('btnDraftClear');

    els.draftsList = $('draftsList');
    els.injectWarnings = $('injectWarnings');
    els.btnInject = $('btnInject');

    els.journalTableBody = $('journalTableBody');
    els.journalFilter = $('journalFilter');

    els.tagSuggestions = $('tagSuggestions');

    els.dlgProduct = $('dlgProduct');
    els.productId = $('productId');
    els.productName = $('productName');
    els.productDesc = $('productDesc');
    els.productUnitsPerLot = $('productUnitsPerLot');
    els.btnProductSave = $('btnProductSave');

    els.dlgImport = $('dlgImport');
    els.importFile = $('importFile');
    els.btnImportGo = $('btnImportGo');
  }

  function setActiveTab(tabKey) {
    document.querySelectorAll('.tab').forEach(b => {
      b.classList.toggle('is-active', b.dataset.tab === tabKey);
    });
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('is-active', v.id === `view-${tabKey}`);
    });
  }

  function setDraftTypeUI(type) {
    // Show/hide blocks and enable required inputs
    els.blockPurchase.hidden = type !== 'ACHAT';
    els.blockExpense.hidden = type !== 'DEPENSE';
    els.blockSale.hidden = type !== 'VENTE';

    const needsProduct = (type === 'ACHAT' || type === 'PERTE' || type === 'VENTE');
    els.draftProductId.closest('.field').hidden = !needsProduct && type !== 'VENTE';

    // VENTE uses lines, not qtyUnits at top
    const qtyField = els.draftQtyUnits.closest('.field');
    qtyField.hidden = type === 'VENTE' || type === 'DEPENSE';

    // Tags are mainly for DEPENSE/PERTE
    const tagsField = els.draftTags.closest('.field');
    tagsField.hidden = !(type === 'DEPENSE' || type === 'PERTE');

    const noteField = els.draftNote.closest('.field');
    noteField.hidden = false;
  }

  function clearDraftForm() {
    els.draftType.value = 'ACHAT';
    els.draftDate.value = isoToday();
    els.draftNote.value = '';
    els.draftTags.value = '';
    els.draftProductId.value = '';
    els.draftQtyUnits.value = '';

    els.purchaseQtyLots.value = '';
    els.purchaseUnitsPerLot.value = '';
    els.purchasePriceLot.value = '';

    els.expenseAmount.value = '';

    // reset sale lines
    els.saleLines.innerHTML = '';
    addSaleLine();

    setDraftTypeUI('ACHAT');
    refreshTagSuggestions();
  }

  function refreshTagSuggestions() {
    const tags = listAllTags();
    els.tagSuggestions.innerHTML = '';
    for (const t of tags.slice(0, 30)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t;
      b.addEventListener('click', () => {
        const current = uniqueNonEmpty((els.draftTags.value || '').split(',').map(s => s.trim()));
        current.push(t);
        els.draftTags.value = uniqueNonEmpty(current).join(', ');
      });
      els.tagSuggestions.appendChild(b);
    }
  }

  // Drafts queue
  let drafts = [];

  function addDraft(draft) {
    drafts.push(draft);
    renderDrafts();
  }

  function removeDraft(idx) {
    drafts.splice(idx, 1);
    renderDrafts();
  }

  function renderDrafts() {
    els.draftsList.innerHTML = '';
    const warnAll = [];

    // Precompute snapshot to validate negative stock if injected
    const today = els.rangeTo.value || isoToday();
    const baseRange = { fromISO: '0000-01-01', toISO: today };
    const snapNow = computeSnapshots(baseRange);

    // Simulate applying drafts to detect negative stock after injection
    const simState = deepClone(state);
    const simDraftToMoves = draftsToMovements(drafts, simState, /*simulateOnly*/ true);
    // Apply simulation
    simState.movements = simState.movements.concat(simDraftToMoves.movements);
    // For sales, simulation adds sale movements too
    const simAnnulSet = (() => {
      const set = new Set();
      for (const mv of simState.movements) {
        if (mv.type === 'ANNUL' && mv.refMid) set.add(mv.refMid);
      }
      return set;
    })();

    const negativeAfter = [];
    for (const p of simState.products) {
      const stock = (function computeStockSim(pid) {
        let s = 0;
        for (const mv of simState.movements) {
          if (mv.type === 'ANNUL') continue;
          if (simAnnulSet.has(mv.mid)) continue;
          if (mv.productId !== pid) continue;
          if (mv.type === 'ACHAT') s += Number(mv.qtyUnits) || 0;
          if (mv.type === 'VENTE') s -= Number(mv.qtyUnits) || 0;
          if (mv.type === 'PERTE') s -= Number(mv.qtyUnits) || 0;
        }
        return s;
      })(p.id);
      if (stock < 0) negativeAfter.push({ id: p.id, stock });
    }

    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      const li = document.createElement('div');
      li.className = 'draftItem';

      const title = document.createElement('div');
      title.className = 'draftTitle';
      title.textContent = `${d.type} — ${d.date}${d.sid ? ' • ' + d.sid : ''}`;

      const desc = document.createElement('div');
      desc.className = 'draftDesc';
      desc.textContent = draftSummary(d);

      const warn = validateDraft(d);
      const warnBox = document.createElement('div');
      warnBox.className = 'draftWarn';
      if (warn.length) {
        warnBox.innerHTML = warn.map(w => `<span class="pill ${w.level}">${escapeHtml(w.msg)}</span>`).join(' ');
        warnAll.push(...warn);
      } else {
        warnBox.innerHTML = `<span class="pill ok">OK</span>`;
      }

      const btns = document.createElement('div');
      btns.className = 'draftBtns';
      const rm = document.createElement('button');
      rm.className = 'btn btnSm';
      rm.textContent = 'Retirer';
      rm.addEventListener('click', () => removeDraft(i));
      btns.appendChild(rm);

      li.appendChild(title);
      li.appendChild(desc);
      li.appendChild(warnBox);
      li.appendChild(btns);
      els.draftsList.appendChild(li);
    }

    // Global warnings
    const blocking = warnAll.filter(w => w.level === 'danger');
    const nonblocking = warnAll.filter(w => w.level !== 'danger');

    const lines = [];
    if (drafts.length === 0) {
      lines.push('Aucun brouillon.');
    } else {
      lines.push(`Brouillons: ${drafts.length}.`);
    }

    if (negativeAfter.length) {
      lines.push(`⚠ Stock négatif après injection: ${negativeAfter.map(n => `${n.id} (${n.stock})`).join(', ')}`);
    }

    if (blocking.length) {
      lines.push(`⛔ Bloquants: ${blocking.map(b => b.msg).join(' | ')}`);
    } else if (nonblocking.length) {
      lines.push(`⚠ Warnings: ${nonblocking.map(w => w.msg).join(' | ')}`);
    }

    els.injectWarnings.textContent = lines.join('\n');
    els.btnInject.disabled = drafts.length === 0 || blocking.length > 0;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function draftSummary(d) {
    if (d.type === 'ACHAT') {
      const p = d.productId || '—';
      return `${p} • +${d.qtyUnits} u • lot: ${d.qtyLots || 0} • €/lot: ${d.priceLot} • €/u: ${round2(d.unitPrice)}`;
    }
    if (d.type === 'PERTE') {
      return `${d.productId || '—'} • -${d.qtyUnits} u • coût perte (estimé): ${money(d.lossCostEst)}`;
    }
    if (d.type === 'DEPENSE') {
      return `ID000 • ${money(d.amount)} • tags: ${(d.tags || []).join(', ') || '—'}`;
    }
    if (d.type === 'VENTE') {
      const total = d.lines.reduce((a, l) => a + (Number(l.saleTotal) || 0), 0);
      const items = d.lines.map(l => `${l.productId || '—'} x${l.qtyUnits} (${money(Number(l.saleTotal)||0)})`).join(' ; ');
      return `${d.sid || ''} • total: ${money(total)} • ${items}`;
    }
    return '—';
  }

  function round2(n) {
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100) / 100;
  }

  function validateDraft(d) {
    const out = [];

    if (!parseDateISO(d.date)) out.push({ level: 'danger', msg: 'Date invalide.' });

    if (d.type === 'ACHAT') {
      if (!d.productId) out.push({ level: 'danger', msg: 'Produit requis (achat).' });
      if (!getProductById(d.productId)) out.push({ level: 'danger', msg: `Produit inconnu: ${d.productId}` });
      if (!(Number(d.qtyUnits) > 0)) out.push({ level: 'danger', msg: 'Quantité (unités) > 0 requise.' });
      if (!(Number(d.priceLot) > 0)) out.push({ level: 'danger', msg: 'Prix/lot > 0 requis.' });
      if (!(Number(d.unitsPerLotUsed) > 0)) out.push({ level: 'danger', msg: 'Unités/lot > 0 requis.' });
    }

    if (d.type === 'PERTE') {
      if (!d.productId) out.push({ level: 'danger', msg: 'Produit requis (perte).' });
      if (!getProductById(d.productId)) out.push({ level: 'danger', msg: `Produit inconnu: ${d.productId}` });
      if (!(Number(d.qtyUnits) > 0)) out.push({ level: 'danger', msg: 'Quantité perdue > 0 requise.' });
    }

    if (d.type === 'DEPENSE') {
      if (!(Number(d.amount) > 0)) out.push({ level: 'danger', msg: 'Montant dépense > 0 requis.' });
    }

    if (d.type === 'VENTE') {
      if (!Array.isArray(d.lines) || d.lines.length === 0) {
        out.push({ level: 'danger', msg: 'Au moins 1 ligne de vente.' });
      } else {
        for (const [idx, l] of d.lines.entries()) {
          if (!l.productId) out.push({ level: 'danger', msg: `Ligne ${idx + 1}: produit requis.` });
          else if (!getProductById(l.productId)) out.push({ level: 'danger', msg: `Ligne ${idx + 1}: produit inconnu ${l.productId}` });
          if (!(Number(l.qtyUnits) > 0)) out.push({ level: 'danger', msg: `Ligne ${idx + 1}: quantité > 0.` });
          if (!(Number(l.saleTotal) >= 0)) out.push({ level: 'danger', msg: `Ligne ${idx + 1}: prix total >= 0.` });
        }
      }
    }

    // Non-blocking warnings
    if (d.type === 'DEPENSE') {
      if ((d.tags || []).length === 0) out.push({ level: 'warn', msg: 'Dépense sans tag.' });
    }

    if (d.type === 'PERTE') {
      if (d.lossCostEst == null) out.push({ level: 'warn', msg: 'Perte sans prix moyen disponible (coût estimé = 0).' });
    }

    return out;
  }

  function draftsToMovements(draftsArr, st, simulateOnly) {
    const movements = [];
    const sales = [];

    const annulSet = (function buildAnnulFrom(st0) {
      const set = new Set();
      for (const mv of st0.movements) {
        if (mv.type === 'ANNUL' && mv.refMid) set.add(mv.refMid);
      }
      return set;
    })(st);

    // We'll compute avg price based on state+already generated movements
    function avgAt(pid, dateISO) {
      // Create a lightweight view of movements = existing + pending
      const combined = st.movements.concat(movements);
      let totalCost = 0;
      let totalUnits = 0;
      for (const mv of combined) {
        if (mv.type === 'ANNUL') continue;
        if (annulSet.has(mv.mid)) continue;
        if (mv.type !== 'ACHAT') continue;
        if (mv.productId !== pid) continue;
        if (mv.date > dateISO) continue;
        const qty = Number(mv.qtyUnits) || 0;
        const unitPrice = Number(mv.unitPrice) || 0;
        if (qty <= 0) continue;
        totalUnits += qty;
        totalCost += qty * unitPrice;
      }
      if (totalUnits <= 0) return null;
      return totalCost / totalUnits;
    }

    for (const d of draftsArr) {
      if (d.type === 'ACHAT') {
        const mv = {
          mid: simulateOnly ? '(sim)' : `M${pad(st.nextMid, 6)}`,
          date: d.date,
          type: 'ACHAT',
          productId: d.productId,
          qtyUnits: Number(d.qtyUnits),
          qtyLots: Number(d.qtyLots) || 0,
          unitsPerLotUsed: Number(d.unitsPerLotUsed),
          priceLot: Number(d.priceLot),
          unitPrice: Number(d.unitPrice),
          note: d.note || ''
        };
        if (!simulateOnly) st.nextMid += 1;
        movements.push(mv);
      }

      if (d.type === 'PERTE') {
        const avg = avgAt(d.productId, d.date);
        const lossCost = (Number(d.qtyUnits) || 0) * (avg || 0);
        const mv = {
          mid: simulateOnly ? '(sim)' : `M${pad(st.nextMid, 6)}`,
          date: d.date,
          type: 'PERTE',
          productId: d.productId,
          qtyUnits: Number(d.qtyUnits),
          lossCost: lossCost,
          lossUnitPrice: avg,
          tags: Array.isArray(d.tags) ? d.tags : [],
          note: d.note || ''
        };
        if (!simulateOnly) st.nextMid += 1;
        movements.push(mv);
      }

      if (d.type === 'DEPENSE') {
        const mv = {
          mid: simulateOnly ? '(sim)' : `M${pad(st.nextMid, 6)}`,
          date: d.date,
          type: 'DEPENSE',
          productId: 'ID000',
          amount: Number(d.amount),
          tags: Array.isArray(d.tags) ? d.tags : [],
          note: d.note || ''
        };
        if (!simulateOnly) st.nextMid += 1;
        movements.push(mv);
      }

      if (d.type === 'VENTE') {
        const sid = d.sid || (simulateOnly ? '(simS)' : `S${pad(st.nextSid, 6)}`);
        if (!simulateOnly && !d.sid) st.nextSid += 1;

        const order = {
          sid,
          date: d.date,
          note: d.note || '',
          lines: d.lines.map(l => ({
            productId: l.productId,
            qtyUnits: Number(l.qtyUnits),
            saleTotal: Number(l.saleTotal)
          }))
        };

        // Generate movements VENTE per line
        for (const l of order.lines) {
          const avg = avgAt(l.productId, order.date);
          const materialCost = (Number(l.qtyUnits) || 0) * (avg || 0);
          const mv = {
            mid: simulateOnly ? '(sim)' : `M${pad(st.nextMid, 6)}`,
            date: order.date,
            type: 'VENTE',
            productId: l.productId,
            qtyUnits: Number(l.qtyUnits),
            saleTotal: Number(l.saleTotal),
            materialCost: materialCost,
            materialUnitPrice: avg,
            sid: sid,
            note: order.note || ''
          };
          if (!simulateOnly) st.nextMid += 1;
          movements.push(mv);
        }

        sales.push(order);
      }
    }

    return { movements, sales };
  }

  function applyDrafts() {
    if (drafts.length === 0) return;

    // Validate all
    const blocking = drafts.flatMap(validateDraft).filter(w => w.level === 'danger');
    if (blocking.length) {
      toast('Injection impossible: erreurs bloquantes.', 'danger');
      return;
    }

    const pack = draftsToMovements(drafts, state, /*simulateOnly*/ false);
    state.movements.push(...pack.movements);
    state.sales.push(...pack.sales);

    saveState();

    // Auto export
    exportJSON(true);

    drafts = [];
    renderAll();
    toast('Injecté + export JSON.', 'ok');
  }

  function exportJSON(auto = false) {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    a.download = `atelier_stockflux_${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (!auto) toast('Export JSON.', 'ok');
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ''));
          if (!parsed || typeof parsed !== 'object') throw new Error('JSON invalide');
          if (parsed.formatVersion !== FORMAT_VERSION) throw new Error('Version incompatible');
          if (!Array.isArray(parsed.products) || !Array.isArray(parsed.movements)) throw new Error('Structure invalide');
          state = parsed;
          saveState();
          renderAll();
          toast('Import OK.', 'ok');
          resolve(true);
        } catch (e) {
          toast('Import échoué: ' + (e?.message || 'Erreur'), 'danger');
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('Lecture fichier impossible'));
      reader.readAsText(file);
    });
  }

  function resetAll() {
    if (!confirm('Reset: supprimer toutes les données locales (cet appareil). Continuer ?')) return;
    state = defaultState();
    saveState();
    drafts = [];
    renderAll();
    toast('Reset OK.', 'warn');
  }

  function renderDashboard() {
    const fromISO = els.rangeFrom.value;
    const toISO = els.rangeTo.value;
    const snap = computeSnapshots({ fromISO, toISO });

    const stockValue = snap.productRows.reduce((a, r) => a + (r.value || 0), 0);

    els.kpiStockValue.textContent = money(stockValue);
    els.kpiStockCount.textContent = `${snap.productRows.length} produit(s)`;
    els.kpiDepGlobal.textContent = money(snap.depensesGlobales);
    els.kpiDepStock.textContent = money(snap.depensesStock);
    els.kpiVentes.textContent = money(snap.ventes);
    els.kpiMarge.textContent = money(snap.marge);
    els.kpiRent.textContent = money(snap.rentabilite);

    // Negatives list
    els.negList.innerHTML = '';
    if (snap.negatives.length === 0) {
      const li = document.createElement('div');
      li.className = 'muted';
      li.textContent = 'Aucun stock négatif.';
      els.negList.appendChild(li);
    } else {
      for (const n of snap.negatives) {
        const li = document.createElement('div');
        li.className = 'negItem';
        li.textContent = `${n.id}: ${n.stock}`;
        els.negList.appendChild(li);
      }
    }
  }

  function renderProducts() {
    const q = (els.productsSearch.value || '').trim().toLowerCase();
    const toISO = els.rangeTo.value;
    const annulSet = buildAnnulSet();

    const rows = state.products
      .map(p => {
        const stock = computeStockAt(p.id, toISO, annulSet);
        const avg = computeAverageUnitPriceAt(p.id, toISO, annulSet);
        const value = avg == null ? null : stock * avg;
        return {
          id: p.id,
          name: p.name || '',
          stock,
          avg,
          value,
          upl: p.unitsPerLotDefault || null
        };
      })
      .filter(r => {
        if (!q) return true;
        return r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    els.productsTableBody.innerHTML = '';

    for (const r of rows) {
      const tr = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.innerHTML = `<div class="mono">${escapeHtml(r.id)}</div>`;

      const tdName = document.createElement('td');
      tdName.innerHTML = `<div>${escapeHtml(r.name)}</div>`;

      const tdStock = document.createElement('td');
      tdStock.innerHTML = `<div class="right ${r.stock < 0 ? 'bad' : ''}">${escapeHtml(String(r.stock))}</div>`;

      const tdAvg = document.createElement('td');
      tdAvg.innerHTML = `<div class="right">${r.avg == null ? '—' : money(r.avg)}</div>`;

      const tdVal = document.createElement('td');
      tdVal.innerHTML = `<div class="right">${r.value == null ? '—' : money(r.value)}</div>`;

      const tdBtn = document.createElement('td');
      tdBtn.className = 'right';
      const btn = document.createElement('button');
      btn.className = 'btn btnSm';
      btn.textContent = 'Éditer';
      btn.addEventListener('click', () => openProductDialog(r.id));
      tdBtn.appendChild(btn);

      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdStock);
      tr.appendChild(tdAvg);
      tr.appendChild(tdVal);
      tr.appendChild(tdBtn);
      els.productsTableBody.appendChild(tr);
    }
  }

  function renderJournal() {
    const filter = (els.journalFilter.value || '').trim().toLowerCase();
    const annulSet = buildAnnulSet();

    const rows = state.movements
      .slice()
      .sort(compareDateThenId)
      .map(mv => {
        const effective = movementEffective(mv, annulSet);
        return { mv, effective, isAnnulled: annulSet.has(mv.mid) };
      })
      .filter(r => {
        if (!filter) return true;
        const mv = r.mv;
        const parts = [mv.mid, mv.type, mv.date, mv.productId, mv.sid, mv.note].filter(Boolean).join(' ').toLowerCase();
        return parts.includes(filter);
      });

    els.journalTableBody.innerHTML = '';

    for (const r of rows) {
      const mv = r.mv;
      const tr = document.createElement('tr');
      if (!r.effective && mv.type !== 'ANNUL') tr.classList.add('dim');

      const tdDate = document.createElement('td');
      tdDate.textContent = mv.date;

      const tdMid = document.createElement('td');
      tdMid.innerHTML = `<span class="mono">${escapeHtml(mv.mid)}</span>`;

      const tdType = document.createElement('td');
      tdType.innerHTML = `<span class="pill ${mv.type === 'ANNUL' ? 'warn' : 'ok'}">${escapeHtml(mv.type)}</span>`;

      const tdPid = document.createElement('td');
      tdPid.innerHTML = mv.productId ? `<span class="mono">${escapeHtml(mv.productId)}</span>` : '—';

      const tdDelta = document.createElement('td');
      tdDelta.className = 'right';
      let delta = '';
      if (mv.type === 'ACHAT') delta = `+${mv.qtyUnits}`;
      else if (mv.type === 'VENTE') delta = `-${mv.qtyUnits}`;
      else if (mv.type === 'PERTE') delta = `-${mv.qtyUnits}`;
      else delta = '—';
      tdDelta.textContent = delta;

      const tdAmount = document.createElement('td');
      tdAmount.className = 'right';
      let amount = '—';
      if (mv.type === 'ACHAT') amount = money((Number(mv.qtyUnits)||0) * (Number(mv.unitPrice)||0));
      if (mv.type === 'DEPENSE') amount = money(Number(mv.amount)||0);
      if (mv.type === 'PERTE') amount = money(Number(mv.lossCost)||0);
      if (mv.type === 'VENTE') amount = money(Number(mv.saleTotal)||0);
      tdAmount.textContent = amount;

      const tdNote = document.createElement('td');
      tdNote.textContent = mv.note || '';

      const tdActions = document.createElement('td');
      tdActions.className = 'right';

      if (mv.type !== 'ANNUL' && !annulSet.has(mv.mid)) {
        const btn = document.createElement('button');
        btn.className = 'btn btnSm';
        btn.textContent = 'Annuler';
        btn.addEventListener('click', () => annulMovement(mv.mid));
        tdActions.appendChild(btn);
      } else {
        tdActions.textContent = '';
      }

      tr.appendChild(tdDate);
      tr.appendChild(tdMid);
      tr.appendChild(tdType);
      tr.appendChild(tdPid);
      tr.appendChild(tdDelta);
      tr.appendChild(tdAmount);
      tr.appendChild(tdNote);
      tr.appendChild(tdActions);
      els.journalTableBody.appendChild(tr);
    }
  }

  function annulMovement(mid) {
    const mv = state.movements.find(m => m.mid === mid);
    if (!mv) return;
    if (!confirm(`Annuler ${mid} ? (contre-écriture, l’original restera visible)`)) return;

    const ann = {
      mid: newMid(),
      date: isoToday(),
      type: 'ANNUL',
      refMid: mid,
      note: `Annulation de ${mid}`
    };
    state.movements.push(ann);
    saveState();
    renderAll();
    toast(`${mid} annulé.`, 'warn');
  }

  // --- Products CRUD ---

  let productDialogMode = 'create';

  function openProductDialog(productId = null) {
    if (!productId) {
      productDialogMode = 'create';
      els.productId.value = '';
      els.productId.disabled = false;
      els.productName.value = '';
      els.productDesc.value = '';
      els.productUnitsPerLot.value = '';
      els.dlgProduct.showModal();
      return;
    }

    const p = getProductById(productId);
    if (!p) return;
    productDialogMode = 'edit';
    els.productId.value = p.id;
    els.productId.disabled = true;
    els.productName.value = p.name || '';
    els.productDesc.value = Array.isArray(p.descriptions) ? p.descriptions.join('\n') : '';
    els.productUnitsPerLot.value = p.unitsPerLotDefault != null ? String(p.unitsPerLotDefault) : '';
    els.dlgProduct.showModal();
  }

  function saveProductFromDialog() {
    const id = (els.productId.value || '').trim();
    const name = (els.productName.value || '').trim();
    const desc = (els.productDesc.value || '').split('\n').map(s => s.trim()).filter(Boolean);
    const uplRaw = (els.productUnitsPerLot.value || '').trim();
    const upl = uplRaw ? Number(uplRaw) : null;

    if (!id) {
      toast('ID produit requis.', 'danger');
      return false;
    }
    if (!/^[A-Za-z0-9_\-]+$/.test(id)) {
      toast('ID invalide (utilise lettres/chiffres/_/-).', 'danger');
      return false;
    }
    if (!name) {
      toast('Nom produit requis.', 'danger');
      return false;
    }
    if (upl != null && !(upl > 0)) {
      toast('Unités/lot doit être > 0.', 'danger');
      return false;
    }

    if (productDialogMode === 'create') {
      if (getProductById(id)) {
        toast('ID déjà existant.', 'danger');
        return false;
      }
      state.products.push({ id, name, descriptions: desc, unitsPerLotDefault: upl });
    } else {
      const p = getProductById(id);
      if (!p) return false;
      p.name = name;
      p.descriptions = desc;
      p.unitsPerLotDefault = upl;
    }

    saveState();
    renderAll();
    toast('Produit enregistré.', 'ok');
    return true;
  }

  // --- Sales lines ---

  function addSaleLine() {
    const line = document.createElement('div');
    line.className = 'saleLine';

    const pid = document.createElement('input');
    pid.placeholder = 'ID produit';
    pid.className = 'input mono';

    const qty = document.createElement('input');
    qty.placeholder = 'Qté (u)';
    qty.type = 'number';
    qty.min = '0';
    qty.step = '1';
    qty.className = 'input';

    const total = document.createElement('input');
    total.placeholder = 'Prix total (€)';
    total.type = 'number';
    total.min = '0';
    total.step = '0.01';
    total.className = 'input';

    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'btn btnSm';
    rm.textContent = '—';
    rm.title = 'Retirer ligne';
    rm.addEventListener('click', () => {
      line.remove();
    });

    line.appendChild(pid);
    line.appendChild(qty);
    line.appendChild(total);
    line.appendChild(rm);
    els.saleLines.appendChild(line);
  }

  function readSaleLines() {
    const lines = [];
    els.saleLines.querySelectorAll('.saleLine').forEach(line => {
      const inputs = line.querySelectorAll('input');
      const productId = (inputs[0].value || '').trim();
      const qtyUnits = Number(inputs[1].value || 0);
      const saleTotal = Number(inputs[2].value || 0);
      if (!productId && !qtyUnits && !saleTotal) return; // ignore empty line
      lines.push({ productId, qtyUnits, saleTotal });
    });
    return lines;
  }

  // --- Create draft from form ---

  function createDraftFromForm() {
    const type = els.draftType.value;
    const date = (els.draftDate.value || '').trim();
    const note = (els.draftNote.value || '').trim();
    const tags = uniqueNonEmpty((els.draftTags.value || '').split(',').map(s => s.trim()));

    if (type === 'ACHAT') {
      const productId = (els.draftProductId.value || '').trim();
      const qtyLots = Number(els.purchaseQtyLots.value || 0);
      const unitsPerLotUsed = Number(els.purchaseUnitsPerLot.value || 0);
      const priceLot = Number(els.purchasePriceLot.value || 0);
      const qtyUnits = Number(els.draftQtyUnits.value || 0);

      // If qtyUnits omitted, compute from lots
      let qUnits = qtyUnits;
      if (!(qUnits > 0) && (qtyLots > 0) && (unitsPerLotUsed > 0)) {
        qUnits = qtyLots * unitsPerLotUsed;
      }

      const unitPrice = (unitsPerLotUsed > 0) ? (priceLot / unitsPerLotUsed) : 0;

      return {
        type,
        date,
        note,
        productId,
        qtyUnits: Math.round(qUnits),
        qtyLots,
        unitsPerLotUsed,
        priceLot,
        unitPrice
      };
    }

    if (type === 'PERTE') {
      const productId = (els.draftProductId.value || '').trim();
      const qtyUnits = Math.round(Number(els.draftQtyUnits.value || 0));
      const annulSet = buildAnnulSet();
      const avg = computeAverageUnitPriceAt(productId, date, annulSet);
      const lossCostEst = qtyUnits * (avg || 0);
      return { type, date, note, tags, productId, qtyUnits, lossCostEst };
    }

    if (type === 'DEPENSE') {
      const amount = Number(els.expenseAmount.value || 0);
      return { type, date, note, tags, amount };
    }

    if (type === 'VENTE') {
      const sid = newSid();
      const lines = readSaleLines();
      return { type, date, note, sid, lines };
    }

    return null;
  }

  // --- Render all ---

  function renderAll() {
    // Update tag suggestions and draft UI
    refreshTagSuggestions();

    renderDashboard();
    renderProducts();
    renderDrafts();
    renderJournal();
  }

  // --- Range helpers ---

  function setRangeLast30() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    els.rangeTo.value = isoFromDate(to);
    els.rangeFrom.value = isoFromDate(from);
    renderAll();
  }

  function setRangeMonth() {
    const d = new Date();
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    els.rangeFrom.value = isoFromDate(from);
    els.rangeTo.value = isoFromDate(to);
    renderAll();
  }

  function isoFromDate(d) {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1, 2);
    const da = pad(d.getDate(), 2);
    return `${y}-${m}-${da}`;
  }

  // --- Bootstrap ---

  let state = loadState();

  function ensureMinimalData() {
    // Keep empty by default, but a tiny example can help first run.
    // Do not auto-create products to avoid polluting.
  }

  function bindEvents() {
    // Tabs
    document.querySelectorAll('.tab').forEach(b => {
      b.addEventListener('click', () => setActiveTab(b.dataset.tab));
    });

    // Range
    els.rangeFrom.addEventListener('change', renderAll);
    els.rangeTo.addEventListener('change', renderAll);
    els.btnRange30.addEventListener('click', setRangeLast30);
    els.btnRangeMonth.addEventListener('click', setRangeMonth);

    // Top actions
    els.btnExport.addEventListener('click', () => exportJSON(false));
    els.btnImport.addEventListener('click', () => {
      els.importFile.value = '';
      els.dlgImport.showModal();
    });
    els.btnImportGo.addEventListener('click', (e) => {
      e.preventDefault();
      const f = els.importFile.files?.[0];
      if (!f) {
        toast('Choisis un fichier JSON.', 'warn');
        return;
      }
      importJSON(f).finally(() => {
        try { els.dlgImport.close(); } catch { /* noop */ }
      });
    });

    els.btnReset.addEventListener('click', resetAll);

    // Products
    els.btnProductAdd.addEventListener('click', () => openProductDialog(null));
    els.productsSearch.addEventListener('input', renderProducts);

    els.btnProductSave.addEventListener('click', (e) => {
      e.preventDefault();
      const ok = saveProductFromDialog();
      if (ok) els.dlgProduct.close();
    });

    // Draft form
    els.draftType.addEventListener('change', () => {
      setDraftTypeUI(els.draftType.value);
      renderDrafts();
    });

    els.btnSaleAddLine.addEventListener('click', addSaleLine);

    els.btnDraftAdd.addEventListener('click', () => {
      const d = createDraftFromForm();
      if (!d) return;
      // If purchase unitsPerLot not filled, use product default
      if (d.type === 'ACHAT') {
        const p = getProductById(d.productId);
        if (p && !(d.unitsPerLotUsed > 0) && (p.unitsPerLotDefault > 0)) {
          d.unitsPerLotUsed = Number(p.unitsPerLotDefault);
          d.qtyUnits = Math.round((Number(d.qtyLots) || 0) * d.unitsPerLotUsed);
          d.unitPrice = (d.unitsPerLotUsed > 0) ? (Number(d.priceLot) / d.unitsPerLotUsed) : 0;
        }
      }
      const warn = validateDraft(d);
      const blocking = warn.filter(w => w.level === 'danger');
      if (blocking.length) {
        toast(blocking[0].msg, 'danger');
        return;
      }
      addDraft(d);
      toast('Brouillon ajouté.', 'ok');
    });

    els.btnDraftClear.addEventListener('click', () => {
      if (!confirm('Vider les brouillons ?')) return;
      drafts = [];
      renderDrafts();
    });

    els.btnInject.addEventListener('click', applyDrafts);

    // Journal
    els.journalFilter.addEventListener('input', renderJournal);
  }

  function initDefaultRange() {
    const today = isoToday();
    els.rangeTo.value = today;
    // default: month
    const d = new Date();
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    els.rangeFrom.value = isoFromDate(from);
  }

  function initDraftDefaults() {
    els.draftDate.value = isoToday();
    addSaleLine();
    setDraftTypeUI('ACHAT');
  }

  function main() {
    initEls();
    ensureMinimalData();
    saveState();

    initDefaultRange();
    initDraftDefaults();
    bindEvents();
    clearDraftForm();

    // Helpful hint on first run
    if (state.products.length === 0 && state.movements.length === 0) {
      toast('Commence par créer tes produits (onglet Produits).', 'info');
    }

    renderAll();
  }

  document.addEventListener('DOMContentLoaded', main);

})();
