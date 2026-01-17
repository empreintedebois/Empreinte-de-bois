// adch_80085 - état global
window.STATE = {
  meta: {
    version: 1,
    app: "adch_80085",
    createdAt: null,
    updatedAt: null,
    lastExportAt: null,
    lastExportFile: "",
    lastInjectAt: null,
  },
  counters: {
    mid: 0,
    sid: 0,
  },
  produits: [],
  mouvements: [],
  // commandes ne sert qu'en brouillon/traçage; les ventes sont enregistrées en mouvements VENTE avec sid
  ui: {
    tab: "dashboard",
    period: "30j", // 30j | mois | tout
    dateFrom: "",
    dateTo: "",
    searchProduit: "",
    draft: {
      items: [], // items en attente d'injection
      // commande brouillon
      cmdDate: "",
      cmdLines: [],
    },
    lastMessage: "",
  },
  settings: {
    autoExportAfterInject: true,
    exportReminderDays: 7,
  }
};
