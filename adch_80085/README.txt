adch_80085 - Stock & Flux (outil interne)

Accès:
- https://empreintedebois.github.io/Empreinte-de-bois/adch_80085/

Fonctions V1:
- Dashboard: Stock/valeur stock + Dépenses globales & stock + Ventes + Rentabilité + filtre période (30j/mois/tout)
- Produits: CRUD simple + recherche
- Journal & Injection:
  - Achat: unités ou lots (conversion) + recalcul prix moyen pondéré
  - Perte: stock- + dépense globale via valorisation à la date
  - Dépense: dépenses globales (tags libres)
  - Commande (vente multi-lignes): 1 SID + 1 mouvement VENTE par ligne, prix total saisi, coût matière calculé à date
  - Brouillon multi-items + warnings + bouton Injecter
  - Journal immuable: Annuler = contre-écriture type ANNUL

Multi-appareils:
- Pas de sync. Utilise Export/Import JSON.

Diagnostic:
- Console doit afficher "adch_80085 init".
