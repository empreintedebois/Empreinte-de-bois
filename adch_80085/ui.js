// adch_80085 - rendu UI

const PRODUCT_CATEGORIES = ["Bois", "Matières", "Lumières", "Composants", "Support"]; // classes demandées

function fmtDateFR(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (!isFinite(d.getTime())) return "—";
    return d.toLocaleString("fr-FR");
  } catch {
    return "—";
  }
}

function renderBackupBanner() {
  const lastExportAt = STATE.meta.lastExportAt;
  const lastInjectAt = STATE.meta.lastInjectAt;
  const reminderDays = Number(STATE.settings.exportReminderDays || 7);

  let needs = false;
  if (!lastExportAt) needs = true;
  if (lastInjectAt && lastExportAt) {
    try { needs = new Date(lastExportAt).getTime() < new Date(lastInjectAt).getTime(); } catch {}
  }
  if (lastExportAt) {
    const ageMs = Date.now() - new Date(lastExportAt).getTime();
    if (isFinite(ageMs) && ageMs > reminderDays * 24 * 3600 * 1000) needs = true;
  }

  const cls = needs ? "banner warn" : "banner ok";
  const title = needs ? "Pense à exporter" : "Sauvegarde locale OK";
  const file = STATE.meta.lastExportFile ? `(${escapeHTML(STATE.meta.lastExportFile)})` : "";
  return `
    <div class="${cls}">
      <div>
        <b>${title}</b>
        <div class="small">Dernier export : <b>${escapeHTML(fmtDateFR(lastExportAt))}</b> ${file} · Dernière injection : <b>${escapeHTML(fmtDateFR(lastInjectAt))}</b></div>
      </div>
      <div class="actions">
        <button class="btn" data-action="export_inline">Exporter maintenant</button>
      </div>
    </div>
  `;
}

function drawMiniChart(canvas, series) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { labels, ventes, depenses, rentabilite } = series;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // axes
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40,10);
  ctx.lineTo(40,H-20);
  ctx.lineTo(W-10,H-20);
  ctx.stroke();

  const all = [...ventes, ...depenses, ...rentabilite];
  const maxV = Math.max(0, ...all);
  const minV = Math.min(0, ...all);
  const span = (maxV - minV) || 1;

  const x0 = 40, y0 = H-20, x1 = W-10, y1 = 10;
  const n = labels.length;
  const xStep = n > 1 ? (x1 - x0) / (n - 1) : 0;
  const yMap = (v) => y0 - ((v - minV) / span) * (y0 - y1);

  function plot(arr, stroke) {
    if (!arr.length) return;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i=0;i<arr.length;i++) {
      const x = x0 + i*xStep;
      const y = yMap(arr[i]);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  // courbes sobres
  plot(ventes, "rgba(255,255,255,0.85)");
  plot(depenses, "rgba(200,200,200,0.65)");
  plot(rentabilite, "rgba(160,160,160,0.85)");

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "12px system-ui";
  ctx.fillText("Ventes", 48, 18);
  ctx.fillStyle = "rgba(200,200,200,0.7)";
  ctx.fillText("Dépenses", 100, 18);
  ctx.fillStyle = "rgba(160,160,160,0.7)";
  ctx.fillText("Net", 170, 18);
}

function setActiveTabButtons() {
  document.querySelectorAll("button[data-tab]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === STATE.ui.tab);
  });
}

function setMessage(msg) {
  STATE.ui.lastMessage = msg;
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  setActiveTabButtons();

  const banner = renderBackupBanner();
  const msg = STATE.ui.lastMessage ? `<div class="card small">${escapeHTML(STATE.ui.lastMessage)}</div>` : "";

  if (STATE.ui.tab === "dashboard") {
    const metrics = sumDashboardMetrics();
    const totalProducts = STATE.produits.length;
    const totalMovs = STATE.mouvements.length;

    const negCount = STATE.produits.filter(p => currentStock(p.id) < 0).length;

    app.innerHTML = `
      ${banner}
      ${msg}
      <div class="grid cols3">
        <div class="card">
          <h2>Stock</h2>
          <div class="kpi"><div class="label">Produits</div><div class="value">${fmtNum(totalProducts)}</div></div>
          <div class="kpi"><div class="label">Valeur stock</div><div class="value">${fmtEUR(STATE.produits.reduce((acc,p)=>acc+stockValue(p.id),0))}</div></div>
          ${negCount>0?`<div class="pill red">${negCount} stock(s) négatif(s)</div>`:`<div class="pill green">OK</div>`}
        </div>
        <div class="card">
          <h2>Dépenses</h2>
          <div class="kpi"><div class="label">Globales (période)</div><div class="value">${fmtEUR(metrics.depensesGlobales)}</div></div>
          <div class="kpi"><div class="label">Achat stock (période)</div><div class="value">${fmtEUR(metrics.depensesStock)}</div></div>
          <div class="small muted">Pertes incluses dans globales via valorisation à l’instant T.</div>
        </div>
        <div class="card">
          <h2>Ventes</h2>
          <div class="kpi"><div class="label">Ventes (période)</div><div class="value">${fmtEUR(metrics.ventes)}</div></div>
          <div class="kpi"><div class="label">Coût matière (période)</div><div class="value">${fmtEUR(metrics.coutMatiereVendu)}</div></div>
          <div class="kpi"><div class="label">Marge (période)</div><div class="value">${fmtEUR(metrics.marge)}</div></div>
        </div>
      </div>

      <div class="card">
        <h2>Période</h2>
        <div class="row">
          <button class="btn" data-period="30j">30j</button>
          <button class="btn" data-period="mois">Mois</button>
          <button class="btn" data-period="tout">Tout</button>
          <span class="spacer"></span>
          <span class="pill">Actuel : <b>${escapeHTML(STATE.ui.period)}</b></span>
        </div>
        <div class="small muted">Filtre : dépenses, ventes, rentabilité. Le stock est toujours global.</div>
      </div>

      <div class="card">
        <h2>Courbes (période)</h2>
        <canvas id="miniChart" width="680" height="180" class="chart"></canvas>
        <div class="small muted">Courbes : <b>ventes</b>, <b>dépenses</b> (achats + globales + pertes), <b>rentabilité</b> (jour = ventes − dépenses).</div>
      </div>

      <div class="card">
        <h2>Rentabilité</h2>
        <div class="kpi"><div class="label">Rentabilité (période)</div><div class="value">${fmtEUR(metrics.rentabilite)}</div></div>
        <div class="small muted">Formule : ventes − dépenses globales − achats stock</div>
      </div>

      <div class="card">
        <h2>État</h2>
        <div class="small muted">Mouvements totaux (brut) : ${fmtNum(totalMovs)} | Effectifs : ${fmtNum(effectiveMovements().length)} | Version: ${STATE.meta.version}</div>
      </div>
    `;

    // Bind period buttons
    app.querySelectorAll("button[data-period]").forEach(b => {
      b.onclick = () => {
        STATE.ui.period = b.dataset.period;
        saveState();
        render();
      };
    });

    // Inline export from banner
    const ex = app.querySelector("button[data-action='export_inline']");
    if (ex) {
      ex.onclick = () => {
        exportState();
        setMessage("Export JSON généré");
        render();
      };
    }

    // Draw mini chart
    drawMiniChart(app.querySelector("#miniChart"), dailySeries());

    return;
  }

  if (STATE.ui.tab === "produits") {
    const q = (STATE.ui.searchProduit || "").trim().toLowerCase();
    const list = STATE.produits
      .filter(p => {
        if (!q) return true;
        return (p.id || "").toLowerCase().includes(q) || (p.nom || "").toLowerCase().includes(q);
      })
      .sort((a,b)=>String(a.id).localeCompare(String(b.id)));

    const catOptions = [`<option value="">—</option>`].concat(PRODUCT_CATEGORIES.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`)).join("");

    app.innerHTML = `
      ${banner}
      ${msg}
      <div class="card">
        <h2>Ajouter / modifier un produit</h2>
        <div class="row">
          <div class="field"><label>ID (unique)</label><input id="p_id" placeholder="CP23X3"></div>
          <div class="field"><label>Nom</label><input id="p_nom" placeholder="Contreplaqué 3mm"></div>
          <div class="field"><label>Classe</label><select id="p_cat">${catOptions}</select></div>
          <div class="field"><label>Unités / lot (défaut)</label><input id="p_upl" type="number" min="1" step="1" placeholder="16"></div>
        </div>
        <div class="row">
          <div class="field"><label>Description 1</label><input id="p_desc1" placeholder="ex: bouleau"></div>
          <div class="field"><label>Description 2</label><input id="p_desc2" placeholder="ex: 3mm"></div>
          <div class="field"><label>Description 3</label><input id="p_desc3" placeholder="ex: 100x200"></div>
        </div>
        <div class="actions">
          <button class="btn" id="p_save">Enregistrer</button>
          <button class="linkbtn" id="p_clear">Vider</button>
        </div>
        <div class="small muted">Unité = vérité. Lot = format d’achat.</div>
      </div>

      <div class="card">
        <h2>Liste produits</h2>
        <div class="row">
          <div class="field"><label>Recherche</label><input id="p_search" placeholder="ID ou nom" value="${escapeHTML(STATE.ui.searchProduit||"")}"></div>
        </div>
        <div style="overflow:auto">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Classe</th>
                <th>Stock</th>
                <th>Prix moyen</th>
                <th>Valeur stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(p=>{
                const st = currentStock(p.id);
                const avg = currentAvgPrice(p.id);
                const val = stockValue(p.id);
                const pill = st < 0 ? `<span class="pill red">${fmtNum(st)}</span>` : `<span class="pill green">${fmtNum(st)}</span>`;
                return `
                  <tr>
                    <td><b>${escapeHTML(p.id)}</b></td>
                    <td>${escapeHTML(p.nom||"")}</td>
                    <td>${escapeHTML(p.category||"")}</td>
                    <td>${pill}</td>
                    <td>${fmtEUR(avg)}</td>
                    <td>${fmtEUR(val)}</td>
                    <td>
                      <button class="btn" data-edit="${escapeHTML(p.id)}">Éditer</button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const elSearch = app.querySelector("#p_search");
    elSearch.oninput = () => {
      STATE.ui.searchProduit = elSearch.value;
      saveState();
      render();
    };

    app.querySelector("#p_clear").onclick = () => {
      app.querySelector("#p_id").value = "";
      app.querySelector("#p_nom").value = "";
      app.querySelector("#p_cat").value = "";
      app.querySelector("#p_upl").value = "";
      app.querySelector("#p_desc1").value = "";
      app.querySelector("#p_desc2").value = "";
      app.querySelector("#p_desc3").value = "";
    };

    app.querySelector("#p_save").onclick = () => {
      const id = String(app.querySelector("#p_id").value || "").trim();
      if (!id) {
        setMessage("ID obligatoire");
        render();
        return;
      }
      const nom = String(app.querySelector("#p_nom").value || "").trim();
      const category = String(app.querySelector("#p_cat").value || "").trim();
      const upl = Number(app.querySelector("#p_upl").value || "");
      const d1 = String(app.querySelector("#p_desc1").value || "").trim();
      const d2 = String(app.querySelector("#p_desc2").value || "").trim();
      const d3 = String(app.querySelector("#p_desc3").value || "").trim();
      const descriptions = [d1, d2, d3].filter(Boolean);

      const existing = productById(id);
      if (existing) {
        existing.nom = nom;
        existing.category = category;
        existing.unitsPerLotDefault = (upl && upl>0) ? Math.floor(upl) : existing.unitsPerLotDefault;
        existing.descriptions = descriptions;
        setMessage(`Produit ${id} modifié`);
      } else {
        STATE.produits.push({
          id,
          nom,
          category,
          unitsPerLotDefault: (upl && upl>0) ? Math.floor(upl) : 1,
          descriptions,
        });
        setMessage(`Produit ${id} créé`);
      }
      saveState();
      render();
    };

    app.querySelectorAll("button[data-edit]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.edit;
        const p = productById(id);
        if (!p) return;
        app.querySelector("#p_id").value = p.id;
        app.querySelector("#p_nom").value = p.nom || "";
        app.querySelector("#p_cat").value = p.category || "";
        app.querySelector("#p_upl").value = p.unitsPerLotDefault || 1;
        const dd = p.descriptions || [];
        app.querySelector("#p_desc1").value = dd[0] || "";
        app.querySelector("#p_desc2").value = dd[1] || "";
        app.querySelector("#p_desc3").value = dd[2] || "";
        setMessage(`Édition ${id}`);
        saveState();
        render();
      };
    });

    // Inline export from banner
    const ex = app.querySelector("button[data-action='export_inline']");
    if (ex) {
      ex.onclick = () => {
        exportState();
        setMessage("Export JSON généré");
        render();
      };
    }

    return;
  }

  if (STATE.ui.tab === "journal") {
    const tags = uniqueTags();
    const prodOptions = STATE.produits
      .slice()
      .sort((a,b)=>String(a.id).localeCompare(String(b.id)))
      .map(p=>`<option value="${escapeHTML(p.id)}">${escapeHTML(p.id)} — ${escapeHTML(p.nom||"")}</option>`)
      .join("");

    const draft = STATE.ui.draft;

    const warn = validateDraftAll();

    const journalSearch = (STATE.ui.journalSearch || "").trim().toLowerCase();
    const journalCat = String(STATE.ui.journalCategory || "").trim();
    const catOptions = [`<option value="">Toutes</option>`].concat(PRODUCT_CATEGORIES.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`)).join("");

    const movementsFiltered = STATE.mouvements
      .slice()
      .sort((a,b)=>movementDateISO(b).localeCompare(movementDateISO(a)))
      .filter(m => {
        // catégorie
        if (journalCat) {
          const pids = [];
          if (m.productId) pids.push(m.productId);
          if (m.type === "VENTE_CMD" && Array.isArray(m.lines)) pids.push(...m.lines.map(x=>x?.productId).filter(Boolean));
          const ok = pids.some(pid => (productById(pid)?.category || "") === journalCat);
          if (!ok && m.type !== "DEPENSE") return false;
        }

        if (!journalSearch) return true;

        const pids = [];
        if (m.productId) pids.push(m.productId);
        if (m.type === "VENTE_CMD" && Array.isArray(m.lines)) pids.push(...m.lines.map(x=>x?.productId).filter(Boolean));
        const names = pids.map(pid => productById(pid)?.nom || "").join(" ");

        const hay = [m.mid, m.type, m.date, m.productId, m.sid, m.label, m.note, ...(m.tags||[]), ...(pids||[]), names]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(journalSearch);
      });

    app.innerHTML = `
      ${banner}
      ${msg}
      <div class="split">
        <div class="card">
          <h2>Injection (brouillon → journal)</h2>

          <div class="warnbox" style="margin-bottom:12px">
            <div class="small"><b>Règles :</b> journal immuable. Correction = annulation + nouvelle écriture. Pertes/ventes valorisées à la date.</div>
          </div>

          <div class="grid cols2">
            <div class="card" style="background:var(--panel2)">
              <h2>Achat (stock + prix)</h2>
              <div class="row">
                <div class="field"><label>Date</label><input id="a_date" type="date"></div>
                <div class="field"><label>Produit</label><select id="a_pid">${prodOptions}</select></div>
              </div>
              <div class="row">
                <div class="field"><label>Quantité (unités)</label><input id="a_units" type="number" min="1" step="1" placeholder="16"></div>
                <div class="field"><label>OU Quantité (lots)</label><input id="a_lots" type="number" min="0" step="1" placeholder="1"></div>
                <div class="field"><label>Unités / lot (si lots)</label><input id="a_upl" type="number" min="1" step="1" placeholder="16"></div>
              </div>
              <div class="row">
                <div class="field"><label>Prix du lot (€)</label><input id="a_priceLot" type="number" min="0" step="0.01" placeholder="18.95"></div>
              </div>
              <div class="actions">
                <button class="btn" id="a_add">Ajouter au brouillon</button>
              </div>
              <div class="small muted">Le prix moyen se recalcule automatiquement (pondéré).</div>
            </div>

            <div class="card" style="background:var(--panel2)">
              <h2>Perte (stock - / dépense globale +)</h2>
              <div class="row">
                <div class="field"><label>Date</label><input id="p_date" type="date"></div>
                <div class="field"><label>Produit</label><select id="p_pid">${prodOptions}</select></div>
              </div>
              <div class="row">
                <div class="field"><label>Quantité perdue (unités)</label><input id="p_units" type="number" min="1" step="1" placeholder="5"></div>
              </div>
              <div class="row">
                <div class="field"><label>Tags (optionnel)</label>
                  <input id="p_tags" list="tagsList" placeholder="casse, rebut…">
                </div>
              </div>
              <div class="actions">
                <button class="btn" id="p_add">Ajouter au brouillon</button>
              </div>
              <div class="small muted">Coût perte = qté × prix moyen à la date (figé).</div>
            </div>
          </div>

          <div class="grid cols2" style="margin-top:12px">
            <div class="card" style="background:var(--panel2)">
              <h2>Dépense (global)</h2>
              <div class="row">
                <div class="field"><label>Date</label><input id="d_date" type="date"></div>
                <div class="field"><label>Montant (€)</label><input id="d_amount" type="number" min="0" step="0.01" placeholder="12.00"></div>
              </div>
              <div class="row">
                <div class="field"><label>Tags</label><input id="d_tags" list="tagsList" placeholder="laser, huile…"></div>
              </div>
              <div class="row">
                <div class="field"><label>Note</label><input id="d_note" placeholder="optionnel"></div>
              </div>
              <div class="actions">
                <button class="btn" id="d_add">Ajouter au brouillon</button>
              </div>
            </div>

            <div class="card" style="background:var(--panel2)">
              <h2>Création / Commande (vente groupée)</h2>
              <div class="row">
                <div class="field"><label>Date</label><input id="c_date" type="date" value="${escapeHTML(draft.cmdDate||"")}"></div>
                <div class="field"><label>Nom création (optionnel)</label><input id="c_label" placeholder="ex: Cadre LED A4" value="${escapeHTML(draft.cmdLabel||"")}"></div>
              </div>
              <div class="row">
                <div class="field"><label>Produit</label><select id="c_pid">${prodOptions}</select></div>
                <div class="field"><label>Qté utilisée/vendue (unités)</label><input id="c_units" type="number" min="1" step="1" placeholder="2"></div>
              </div>
              <div class="actions">
                <button class="btn" id="c_addLine">Ajouter ligne (matières)</button>
                <button class="linkbtn" id="c_clear">Vider création</button>
              </div>

              <div class="card" style="margin-top:10px">
                <div class="small"><b>Lignes</b> (la vente sera enregistrée en 1 seule écriture liée)</div>
                ${draft.cmdLines.length ? `
                  <table class="table" style="margin-top:8px">
                    <thead><tr><th>ID</th><th>Qté</th><th>Coût estimé</th><th></th></tr></thead>
                    <tbody>
                      ${draft.cmdLines.map((ln,i)=>{
                        const isoAt = parseDateInputToISO(draft.cmdDate||new Date().toISOString().slice(0,10));
                        const avg = avgPriceAtDate(ln.productId, isoAt);
                        const cost = Number(ln.qtyUnits||0) * avg;
                        return `
                          <tr>
                            <td><b>${escapeHTML(ln.productId)}</b></td>
                            <td>${fmtNum(ln.qtyUnits||0)}</td>
                            <td>${fmtEUR(cost)}</td>
                            <td><button class="danger" data-cmd-del="${i}">X</button></td>
                          </tr>
                        `;
                      }).join("")}
                    </tbody>
                  </table>
                ` : `<div class="small muted" style="margin-top:8px">Aucune ligne</div>`}
              </div>

              <div class="row" style="margin-top:10px">
                <div class="field"><label>Prix total vente (€)</label><input id="c_saleTotal" type="number" min="0" step="0.01" placeholder="40" value="${escapeHTML(draft.cmdSaleTotal||"")}"></div>
              </div>
              <div class="actions">
                <button class="btn" id="c_addCmd">Ajouter la création au brouillon</button>
              </div>
              <div class="small muted">Une création = plusieurs lignes produit (matières consommées) + 1 prix total de vente. Coût matière calculé à la date (prix moyen pondéré jusqu’à la date).</div>
            </div>
          </div>

          <datalist id="tagsList">
            ${tags.map(t=>`<option value="${escapeHTML(t)}"></option>`).join("")}
          </datalist>

          <div class="card" style="margin-top:12px">
            <h2>Brouillon</h2>
            ${warn.blocks.length ? `
              <div class="${warn.hasBlocking?"errbox":"warnbox"}">
                <div><b>${warn.hasBlocking?"Bloquants":"Warnings"}</b></div>
                <ul>
                  ${warn.blocks.map(w=>`<li class="small">${escapeHTML(w)}</li>`).join("")}
                </ul>
              </div>
            ` : `<div class="small muted">Aucun warning</div>`}

            <div style="overflow:auto; margin-top:10px">
              <table class="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Date</th>
                    <th>ID</th>
                    <th>Qté</th>
                    <th>Montant</th>
                    <th>Détails</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${draft.items.map((it, idx) => {
                    const det = it.type === "ACHAT" ? `unit=${fmtEUR(it.unitPrice)} / total=${fmtEUR(it.totalCost)}`
                      : it.type === "PERTE" ? `coût perte=${fmtEUR(it.perteCost)}`
                      : it.type === "DEPENSE" ? `tags=${escapeHTML((it.tags||[]).join(", "))}`
                      : it.type === "VENTE" ? `sale=${fmtEUR(it.saleTotal)} / coût=${fmtEUR(it.costMatiere)} / marge=${fmtEUR(it.margin)}`
                      : it.type === "VENTE_CMD" ? `${escapeHTML(it.label||"Création")}: ${fmtNum((it.lines||[]).length)} ligne(s) · sale=${fmtEUR(it.saleTotal)} / coût=${fmtEUR(it.costMatiere)} / marge=${fmtEUR(it.margin)}`
                      : "";
                    const amount = it.type === "DEPENSE" ? fmtEUR(it.amount)
                      : it.type === "ACHAT" ? fmtEUR(it.totalCost)
                      : it.type === "VENTE" ? fmtEUR(it.saleTotal)
                      : it.type === "VENTE_CMD" ? fmtEUR(it.saleTotal)
                      : it.type === "PERTE" ? fmtEUR(it.perteCost)
                      : "—";
                    const idCell = it.type === "VENTE_CMD" ? (it.label || "Création") : (it.productId || "—");
                    return `
                      <tr>
                        <td><span class="pill">${escapeHTML(it.type)}</span></td>
                        <td>${escapeHTML(it.date)}</td>
                        <td>${escapeHTML(idCell)}</td>
                        <td>${it.qtyUnits!==undefined?fmtNum(it.qtyUnits):"—"}</td>
                        <td>${amount}</td>
                        <td class="small">${det}</td>
                        <td><button class="danger" data-draft-del="${idx}">X</button></td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>

            <div class="actions" style="margin-top:10px">
              <button class="btn" id="inject" ${warn.hasBlocking?"disabled":""}>Injecter</button>
              <button class="linkbtn" id="draft_clear">Vider brouillon</button>
            </div>
            <div class="small muted">Auto-export après injection : ${STATE.settings.autoExportAfterInject ? "Oui" : "Non"}</div>
          </div>
        </div>

        <div>
          <div class="card">
            <h2>Journal</h2>
            <div class="row">
              <div class="field"><label>Recherche</label><input id="j_search" placeholder="MID / ID / nom / tag / SID" value="${escapeHTML(STATE.ui.journalSearch||"")}"></div>
              <div class="field"><label>Classe</label><select id="j_cat">${catOptions}</select></div>
            </div>
            <div class="small muted">Annulation = contre-écriture. Les lignes annulées sont ignorées dans les calculs.</div>
          </div>
          <div class="card" style="overflow:auto">
            <table class="table">
              <thead>
                <tr>
                  <th>MID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>ID</th>
                  <th>Qté</th>
                  <th>Montant</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${movementsFiltered
                  .map(m => {
                    const annulled = isMovementAnnulled(m.mid);
                    const statusPill = m.type === "ANNUL" ? `<span class="pill orange">ANNUL → ${escapeHTML(m.refMid||"")}</span>`
                      : annulled ? `<span class="pill red">ANNULÉ</span>` : `<span class="pill green">OK</span>`;

                    const amount = m.type === "ACHAT" ? fmtEUR(m.totalCost)
                      : (m.type === "VENTE" || m.type === "VENTE_CMD") ? fmtEUR(m.saleTotal)
                      : m.type === "PERTE" ? fmtEUR(m.perteCost)
                      : m.type === "DEPENSE" ? fmtEUR(m.amount)
                      : "—";

                    const idCell = m.type === "VENTE_CMD"
                      ? `${escapeHTML(m.sid||"")} ${m.label?`— ${escapeHTML(m.label)}`:""}`.trim()
                      : escapeHTML(m.productId||"—");

                    const qtyCell = m.type === "VENTE_CMD"
                      ? `<span class="pill">${fmtNum((m.lines||[]).length)} ligne(s)</span>`
                      : (m.qtyUnits!==undefined?fmtNum(m.qtyUnits):"—");

                    const canCancel = (!annulled && m.type !== "ANNUL");

                    return `
                      <tr>
                        <td><b>${escapeHTML(m.mid)}</b></td>
                        <td>${escapeHTML(m.date)}</td>
                        <td>${escapeHTML(m.type)}</td>
                        <td>${idCell}</td>
                        <td>${qtyCell}</td>
                        <td>${amount}</td>
                        <td>${statusPill}</td>
                        <td>${canCancel ? `<button class="danger" data-cancel="${escapeHTML(m.mid)}">Annuler</button>` : ""}</td>
                      </tr>
                    `;
                  }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Bind add draft actions
    const todayStr = new Date().toISOString().slice(0,10);
    const setDefaultDate = (id) => {
      const el = app.querySelector(id);
      if (el && !el.value) el.value = todayStr;
    };
    setDefaultDate("#a_date");
    setDefaultDate("#p_date");
    setDefaultDate("#d_date");
    setDefaultDate("#c_date");

    // Journal filtres
    const elJS = app.querySelector("#j_search");
    if (elJS) {
      elJS.oninput = () => {
        STATE.ui.journalSearch = elJS.value;
        saveState();
        render();
      };
    }
    const elJC = app.querySelector("#j_cat");
    if (elJC) {
      elJC.value = STATE.ui.journalCategory || "";
      elJC.onchange = () => {
        STATE.ui.journalCategory = elJC.value;
        saveState();
        render();
      };
    }

    // Achat
    app.querySelector("#a_add").onclick = () => {
      const date = app.querySelector("#a_date").value;
      const pid = app.querySelector("#a_pid").value;
      const units = Number(app.querySelector("#a_units").value || 0);
      const lots = Number(app.querySelector("#a_lots").value || 0);
      const upl = Number(app.querySelector("#a_upl").value || 0);
      const priceLot = Number(app.querySelector("#a_priceLot").value || 0);

      let qtyUnits = 0;
      let meta = {};
      if (lots > 0) {
        const product = productById(pid);
        const unitsPerLotUsed = upl > 0 ? Math.floor(upl) : Math.floor(product?.unitsPerLotDefault || 1);
        qtyUnits = Math.floor(lots) * unitsPerLotUsed;
        meta = { qtyLots: Math.floor(lots), unitsPerLotUsed, priceLot };
      } else {
        qtyUnits = Math.floor(units);
        meta = { qtyLots: 0, unitsPerLotUsed: 0, priceLot };
      }
      const unitPrice = (qtyUnits > 0) ? (priceLot / qtyUnits) : 0;
      const totalCost = qtyUnits * unitPrice;

      STATE.ui.draft.items.push({
        type: "ACHAT",
        date,
        productId: pid,
        qtyUnits,
        unitPrice,
        totalCost,
        meta,
      });
      setMessage("Achat ajouté au brouillon");
      saveState();
      render();
    };

    // Perte
    app.querySelector("#p_add").onclick = () => {
      const date = app.querySelector("#p_date").value;
      const pid = app.querySelector("#p_pid").value;
      const unitsLost = Math.floor(Number(app.querySelector("#p_units").value || 0));
      const tagStr = String(app.querySelector("#p_tags").value || "").trim();
      const tags = tagStr ? tagStr.split(",").map(x=>x.trim()).filter(Boolean) : [];

      const isoAt = parseDateInputToISO(date);
      const avg = avgPriceAtDate(pid, isoAt);
      const perteCost = unitsLost * avg;

      STATE.ui.draft.items.push({
        type: "PERTE",
        date,
        productId: pid,
        qtyUnits: -Math.abs(unitsLost),
        perteCost,
        tags,
      });
      setMessage("Perte ajoutée au brouillon");
      saveState();
      render();
    };

    // Depense
    app.querySelector("#d_add").onclick = () => {
      const date = app.querySelector("#d_date").value;
      const amount = Number(app.querySelector("#d_amount").value || 0);
      const tagStr = String(app.querySelector("#d_tags").value || "").trim();
      const note = String(app.querySelector("#d_note").value || "").trim();
      const tags = tagStr ? tagStr.split(",").map(x=>x.trim()).filter(Boolean) : [];

      STATE.ui.draft.items.push({
        type: "DEPENSE",
        date,
        amount,
        tags,
        note,
      });
      setMessage("Dépense ajoutée au brouillon");
      saveState();
      render();
    };

    // Création/Commande (vente groupée)
    const elCDate = app.querySelector("#c_date");
    const elCLabel = app.querySelector("#c_label");
    const elCSale = app.querySelector("#c_saleTotal");

    elCDate.oninput = () => { STATE.ui.draft.cmdDate = elCDate.value; saveState(); };
    elCLabel.oninput = () => { STATE.ui.draft.cmdLabel = elCLabel.value; saveState(); };
    elCSale.oninput = () => { STATE.ui.draft.cmdSaleTotal = elCSale.value; saveState(); };

    app.querySelector("#c_addLine").onclick = () => {
      const date = elCDate.value;
      const pid = app.querySelector("#c_pid").value;
      const units = Math.floor(Number(app.querySelector("#c_units").value || 0));
      if (!date) { setMessage("Création : date obligatoire"); render(); return; }
      if (!pid) { setMessage("Création : produit obligatoire"); render(); return; }
      if (!units || units <= 0) { setMessage("Création : quantité invalide"); render(); return; }

      STATE.ui.draft.cmdDate = date;
      // merge si même produit déjà présent
      const existing = STATE.ui.draft.cmdLines.find(x => x.productId === pid);
      if (existing) existing.qtyUnits = Number(existing.qtyUnits || 0) + Math.abs(units);
      else STATE.ui.draft.cmdLines.push({ productId: pid, qtyUnits: Math.abs(units) });

      setMessage("Ligne ajoutée à la création");
      saveState();
      render();
    };

    // Supprimer une ligne de création
    app.querySelectorAll("button[data-cmd-del]").forEach(b => {
      b.onclick = () => {
        const idx = Number(b.dataset.cmdDel);
        STATE.ui.draft.cmdLines.splice(idx, 1);
        saveState();
        render();
      };
    });

    // Ajouter la création au brouillon (1 seul item)
    app.querySelector("#c_addCmd").onclick = () => {
      const date = elCDate.value;
      const saleTotal = Number(elCSale.value || 0);
      const label = String(elCLabel.value || "").trim();
      const lines = (STATE.ui.draft.cmdLines || []).map(x => ({ productId: x.productId, qtyUnits: Number(x.qtyUnits || 0) }));
      if (!date) { setMessage("Création : date obligatoire"); render(); return; }
      if (!lines.length) { setMessage("Création : ajoute au moins 1 ligne produit"); render(); return; }
      if (!isFinite(saleTotal) || saleTotal < 0) { setMessage("Création : prix total invalide"); render(); return; }

      const isoAt = parseDateInputToISO(date);
      let costMatiere = 0;
      for (const ln of lines) {
        const avg = avgPriceAtDate(ln.productId, isoAt);
        costMatiere += Number(ln.qtyUnits || 0) * avg;
      }
      const margin = saleTotal - costMatiere;

      STATE.ui.draft.items.push({
        type: "VENTE_CMD",
        date,
        label,
        lines,
        saleTotal,
        costMatiere,
        margin,
      });

      // Clear commande draft
      STATE.ui.draft.cmdDate = "";
      STATE.ui.draft.cmdLabel = "";
      STATE.ui.draft.cmdSaleTotal = "";
      STATE.ui.draft.cmdLines = [];

      setMessage("Création ajoutée au brouillon");
      saveState();
      render();
    };

    app.querySelector("#c_clear").onclick = () => {
      STATE.ui.draft.cmdDate = "";
      STATE.ui.draft.cmdLabel = "";
      STATE.ui.draft.cmdSaleTotal = "";
      STATE.ui.draft.cmdLines = [];
      setMessage("Création vidée");
      saveState();
      render();
    };

    // Remove draft item
    app.querySelectorAll("button[data-draft-del]").forEach(b => {
      b.onclick = () => {
        const idx = Number(b.dataset.draftDel);
        STATE.ui.draft.items.splice(idx, 1);
        saveState();
        render();
      };
    });

    // Draft clear
    app.querySelector("#draft_clear").onclick = () => {
      STATE.ui.draft.items = [];
      STATE.ui.draft.cmdDate = "";
      STATE.ui.draft.cmdLines = [];
      STATE.ui.draft.cmdSaleTotal = "";
      STATE.ui.draft.cmdLabel = "";
      setMessage("Brouillon vidé");
      saveState();
      render();
    };

    // Inject
    const injectBtn = app.querySelector("#inject");
    injectBtn.onclick = () => {
      const validation = validateDraftAll();
      if (validation.hasBlocking) {
        setMessage("Injection bloquée : corrige les erreurs");
        render();
        return;
      }
      injectDraftToJournal();
      setMessage("Injection effectuée + sauvegarde + export JSON");
      saveState();
      render();
    };

    // Cancel movement
    app.querySelectorAll("button[data-cancel]").forEach(b => {
      b.onclick = () => {
        const target = b.dataset.cancel;
        // Crée une contre-écriture ANNUL
        const original = STATE.mouvements.find(x => x.mid === target);
        if (!original) return;

        const annul = {
          mid: nextMID(),
          date: new Date().toISOString().slice(0,10),
          type: "ANNUL",
          refMid: target,
          note: `Annulation de ${target}`,
        };
        STATE.mouvements.push(annul);
        saveState();
        setMessage(`Mouvement ${target} annulé`);
        render();
      };
    });

    // Inline export from banner
    const ex = app.querySelector("button[data-action='export_inline']");
    if (ex) {
      ex.onclick = () => {
        exportState();
        setMessage("Export JSON généré");
        render();
      };
    }

    return;
  }

  if (STATE.ui.tab === "aide") {
    app.innerHTML = `
      ${banner}
      ${msg}
      <div class="card">
        <h2>Aide (V1)</h2>
        <ul class="small">
          <li><b>Unité = vérité</b>. Le lot sert uniquement à convertir un achat en unités.</li>
          <li><b>Journal immuable</b>. Pour corriger : Annuler une ligne puis réécrire la bonne.</li>
          <li><b>Pertes</b> : diminuent le stock et génèrent une <b>dépense globale</b> via valorisation à la date.</li>
          <li><b>Ventes</b> : une <b>création/commande</b> = plusieurs lignes produit (matières consommées) + <b>un seul prix total</b>. Injection = 1 mouvement <b>VENTE_CMD</b> avec un <b>SID</b> et la liste des lignes.</li>
          <li><b>Coût matière</b> : calculé au moment de l’injection selon le <b>prix moyen pondéré jusqu’à la date</b>.</li>
          <li><b>Multi-appareils</b> : Export / Import JSON (pas de sync auto).</li>
        </ul>
      </div>

      <div class="card">
        <h2>Diagnostic rapide</h2>
        <div class="small muted">Ouvre la console (F12) : tu dois voir “adch_80085 init”.</div>
      </div>
    `;
    return;
  }
}

function validateDraftAll() {
  const blocks = [];
  let hasBlocking = false;

  const items = STATE.ui.draft.items;
  if (!items.length) {
    blocks.push("Brouillon vide : rien à injecter");
    hasBlocking = true;
  }

  for (const it of items) {
    if (!it.date) {
      blocks.push(`${it.type} : date manquante`);
      hasBlocking = true;
    }

    if (it.type === "ACHAT") {
      if (!it.productId) { blocks.push("ACHAT : produit manquant"); hasBlocking = true; }
      if (!it.qtyUnits || it.qtyUnits <= 0) { blocks.push("ACHAT : quantité unités invalide"); hasBlocking = true; }
      if (!isFinite(it.totalCost) || it.totalCost < 0) { blocks.push("ACHAT : prix invalide"); hasBlocking = true; }
    }

    if (it.type === "PERTE") {
      if (!it.productId) { blocks.push("PERTE : produit manquant"); hasBlocking = true; }
      if (!it.qtyUnits || it.qtyUnits >= 0) { blocks.push("PERTE : quantité invalide"); hasBlocking = true; }
    }

    if (it.type === "DEPENSE") {
      if (!isFinite(it.amount) || it.amount < 0) { blocks.push("DEPENSE : montant invalide"); hasBlocking = true; }
    }

    if (it.type === "VENTE") {
      if (!it.productId) { blocks.push("VENTE : produit manquant"); hasBlocking = true; }
      if (!it.qtyUnits || it.qtyUnits >= 0) { blocks.push("VENTE : quantité invalide"); hasBlocking = true; }
      if (!isFinite(it.saleTotal) || it.saleTotal < 0) { blocks.push("VENTE : prix total invalide"); hasBlocking = true; }
      // warning stock négatif
      const st = currentStock(it.productId);
      const after = st + Number(it.qtyUnits || 0);
      if (after < 0) {
        blocks.push(`WARNING : stock négatif potentiel pour ${it.productId} (après vente = ${after})`);
      }
    }

    if (it.type === "VENTE_CMD") {
      const lines = Array.isArray(it.lines) ? it.lines : [];
      if (!lines.length) { blocks.push("VENTE_CMD : lignes manquantes"); hasBlocking = true; }
      if (!isFinite(it.saleTotal) || it.saleTotal < 0) { blocks.push("VENTE_CMD : prix total invalide"); hasBlocking = true; }
      for (const ln of lines) {
        if (!ln.productId) { blocks.push("VENTE_CMD : productId manquant"); hasBlocking = true; continue; }
        const q = Number(ln.qtyUnits || 0);
        if (!q || q <= 0) { blocks.push(`VENTE_CMD : quantité invalide pour ${ln.productId}`); hasBlocking = true; continue; }
        const st = currentStock(ln.productId);
        const after = st - q;
        if (after < 0) blocks.push(`WARNING : stock négatif potentiel pour ${ln.productId} (après création = ${after})`);
      }
    }
  }

  return { blocks, hasBlocking };
}

function injectDraftToJournal() {
  const items = STATE.ui.draft.items.slice();

  for (const it of items) {
    const mid = nextMID();

    if (it.type === "ACHAT") {
      STATE.mouvements.push({
        mid,
        date: it.date,
        type: "ACHAT",
        productId: it.productId,
        qtyUnits: Math.abs(Math.floor(it.qtyUnits)),
        unitPrice: Number(it.unitPrice || 0),
        totalCost: Number(it.totalCost || 0),
        meta: it.meta || {},
        tags: [],
        note: "",
      });
    }

    if (it.type === "PERTE") {
      STATE.mouvements.push({
        mid,
        date: it.date,
        type: "PERTE",
        productId: it.productId,
        qtyUnits: -Math.abs(Math.floor(it.qtyUnits)),
        perteCost: Number(it.perteCost || 0),
        tags: it.tags || [],
        note: "",
      });
    }

    if (it.type === "DEPENSE") {
      STATE.mouvements.push({
        mid,
        date: it.date,
        type: "DEPENSE",
        amount: Number(it.amount || 0),
        tags: it.tags || [],
        note: it.note || "",
      });
    }

    if (it.type === "VENTE") {
      STATE.mouvements.push({
        mid,
        date: it.date,
        type: "VENTE",
        sid: it.sid || "",
        productId: it.productId,
        qtyUnits: -Math.abs(Math.floor(it.qtyUnits)),
        saleTotal: Number(it.saleTotal || 0),
        costMatiere: Number(it.costMatiere || 0),
        margin: Number(it.margin || 0),
        note: "",
      });
    }

    if (it.type === "VENTE_CMD") {
      const sid = nextSID();
      STATE.mouvements.push({
        mid,
        date: it.date,
        type: "VENTE_CMD",
        sid,
        label: it.label || "",
        lines: Array.isArray(it.lines) ? it.lines : [],
        saleTotal: Number(it.saleTotal || 0),
        costMatiere: Number(it.costMatiere || 0),
        margin: Number(it.margin || 0),
        note: "",
      });
    }
  }

  // Clear draft
  STATE.ui.draft.items = [];
  STATE.ui.draft.cmdDate = "";
  STATE.ui.draft.cmdLines = [];
  STATE.ui.draft.cmdSaleTotal = "";
  STATE.ui.draft.cmdLabel = "";

  STATE.meta.lastInjectAt = nowISO();

  saveState();

  if (STATE.settings.autoExportAfterInject) {
    exportState();
  }
}
