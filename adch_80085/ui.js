// adch_80085 - rendu UI

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

  const msg = STATE.ui.lastMessage ? `<div class="card small">${escapeHTML(STATE.ui.lastMessage)}</div>` : "";

  if (STATE.ui.tab === "dashboard") {
    const metrics = sumDashboardMetrics();
    const totalProducts = STATE.produits.length;
    const totalMovs = STATE.mouvements.length;

    const negCount = STATE.produits.filter(p => currentStock(p.id) < 0).length;

    app.innerHTML = `
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

    app.innerHTML = `
      ${msg}
      <div class="card">
        <h2>Ajouter / modifier un produit</h2>
        <div class="row">
          <div class="field"><label>ID (unique)</label><input id="p_id" placeholder="CP23X3"></div>
          <div class="field"><label>Nom</label><input id="p_nom" placeholder="Contreplaqué 3mm"></div>
          <div class="field"><label>Unités / lot (défaut)</label><input id="p_upl" type="number" min="1" step="1" placeholder="16"></div>
        </div>
        <div class="row">
          <div class="field"><label>Descriptions (optionnel)</label><input id="p_desc" placeholder="desc1 | desc2 | ..."></div>
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
      app.querySelector("#p_upl").value = "";
      app.querySelector("#p_desc").value = "";
    };

    app.querySelector("#p_save").onclick = () => {
      const id = String(app.querySelector("#p_id").value || "").trim();
      if (!id) {
        setMessage("ID obligatoire");
        render();
        return;
      }
      const nom = String(app.querySelector("#p_nom").value || "").trim();
      const upl = Number(app.querySelector("#p_upl").value || "");
      const descRaw = String(app.querySelector("#p_desc").value || "").trim();
      const descriptions = descRaw ? descRaw.split("|").map(x=>x.trim()).filter(Boolean) : [];

      const existing = productById(id);
      if (existing) {
        existing.nom = nom;
        existing.unitsPerLotDefault = (upl && upl>0) ? Math.floor(upl) : existing.unitsPerLotDefault;
        existing.descriptions = descriptions;
        setMessage(`Produit ${id} modifié`);
      } else {
        STATE.produits.push({
          id,
          nom,
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
        app.querySelector("#p_upl").value = p.unitsPerLotDefault || 1;
        app.querySelector("#p_desc").value = (p.descriptions||[]).join(" | ");
        setMessage(`Édition ${id}`);
        saveState();
        render();
      };
    });

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

    app.innerHTML = `
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
              <h2>Commande (vente multi-lignes)</h2>
              <div class="row">
                <div class="field"><label>Date</label><input id="c_date" type="date" value="${escapeHTML(draft.cmdDate||"")}"></div>
              </div>
              <div class="row">
                <div class="field"><label>Produit</label><select id="c_pid">${prodOptions}</select></div>
                <div class="field"><label>Quantité vendue (unités)</label><input id="c_units" type="number" min="1" step="1" placeholder="2"></div>
              </div>
              <div class="row">
                <div class="field"><label>Prix total ligne (€)</label><input id="c_total" type="number" min="0" step="0.01" placeholder="40"></div>
              </div>
              <div class="actions">
                <button class="btn" id="c_addLine">Ajouter ligne commande</button>
                <button class="linkbtn" id="c_clear">Vider commande</button>
              </div>
              <div class="small muted">À l’injection : 1 SID + 1 mouvement VENTE par ligne (coût matière calculé à date).</div>
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
                      : "";
                    const amount = it.type === "DEPENSE" ? fmtEUR(it.amount)
                      : it.type === "ACHAT" ? fmtEUR(it.totalCost)
                      : it.type === "VENTE" ? fmtEUR(it.saleTotal)
                      : it.type === "PERTE" ? fmtEUR(it.perteCost)
                      : "—";
                    return `
                      <tr>
                        <td><span class="pill">${escapeHTML(it.type)}</span></td>
                        <td>${escapeHTML(it.date)}</td>
                        <td>${escapeHTML(it.productId||"—")}</td>
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
                ${STATE.mouvements
                  .slice()
                  .sort((a,b)=>movementDateISO(b).localeCompare(movementDateISO(a)))
                  .map(m => {
                    const annulled = isMovementAnnulled(m.mid);
                    const statusPill = m.type === "ANNUL" ? `<span class="pill orange">ANNUL → ${escapeHTML(m.refMid||"")}</span>`
                      : annulled ? `<span class="pill red">ANNULÉ</span>` : `<span class="pill green">OK</span>`;

                    const amount = m.type === "ACHAT" ? fmtEUR(m.totalCost)
                      : m.type === "VENTE" ? fmtEUR(m.saleTotal)
                      : m.type === "PERTE" ? fmtEUR(m.perteCost)
                      : m.type === "DEPENSE" ? fmtEUR(m.amount)
                      : "—";

                    const canCancel = (!annulled && m.type !== "ANNUL");

                    return `
                      <tr>
                        <td><b>${escapeHTML(m.mid)}</b></td>
                        <td>${escapeHTML(m.date)}</td>
                        <td>${escapeHTML(m.type)}</td>
                        <td>${escapeHTML(m.productId||"—")}</td>
                        <td>${m.qtyUnits!==undefined?fmtNum(m.qtyUnits):"—"}</td>
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

    // Commande lines
    app.querySelector("#c_addLine").onclick = () => {
      const date = app.querySelector("#c_date").value;
      const pid = app.querySelector("#c_pid").value;
      const unitsSold = Math.floor(Number(app.querySelector("#c_units").value || 0));
      const saleTotal = Number(app.querySelector("#c_total").value || 0);

      STATE.ui.draft.cmdDate = date;
      STATE.ui.draft.cmdLines.push({ productId: pid, qtyUnits: Math.abs(unitsSold), saleTotal });

      // Ajoute aussi une prévisualisation VENTE dans le brouillon (sans mid/sid)
      // On calcule coût matière à la date de la commande
      const isoAt = parseDateInputToISO(date);
      const avg = avgPriceAtDate(pid, isoAt);
      const costMatiere = Math.abs(unitsSold) * avg;
      const margin = saleTotal - costMatiere;

      STATE.ui.draft.items.push({
        type: "VENTE",
        date,
        productId: pid,
        qtyUnits: -Math.abs(unitsSold),
        saleTotal,
        costMatiere,
        margin,
        _fromCmd: true,
      });

      setMessage("Ligne de commande ajoutée");
      saveState();
      render();
    };

    app.querySelector("#c_clear").onclick = () => {
      STATE.ui.draft.cmdDate = "";
      STATE.ui.draft.cmdLines = [];
      // Retire les ventes provenant de commande du brouillon
      STATE.ui.draft.items = STATE.ui.draft.items.filter(x => !x._fromCmd);
      setMessage("Commande vidée");
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

    return;
  }

  if (STATE.ui.tab === "aide") {
    app.innerHTML = `
      ${msg}
      <div class="card">
        <h2>Aide (V1)</h2>
        <ul class="small">
          <li><b>Unité = vérité</b>. Le lot sert uniquement à convertir un achat en unités.</li>
          <li><b>Journal immuable</b>. Pour corriger : Annuler une ligne puis réécrire la bonne.</li>
          <li><b>Pertes</b> : diminuent le stock et génèrent une <b>dépense globale</b> via valorisation à la date.</li>
          <li><b>Ventes</b> : commandes multi-lignes. Chaque ligne crée un mouvement VENTE, avec <b>prix total</b> saisi.</li>
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
  }

  return { blocks, hasBlocking };
}

function injectDraftToJournal() {
  const items = STATE.ui.draft.items.slice();

  // Gestion commande : on met un sid si des items _fromCmd existent
  const hasCmd = items.some(x => x.type === "VENTE" && x._fromCmd);
  const sid = hasCmd ? nextSID() : "";

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
        sid: sid || "",
        productId: it.productId,
        qtyUnits: -Math.abs(Math.floor(it.qtyUnits)),
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

  saveState();

  if (STATE.settings.autoExportAfterInject) {
    exportState();
  }
}
