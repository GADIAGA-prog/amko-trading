// Calcul pur du P&L d'un deal — sans dépendances React.
// Toutes les entrées sont des nombres (ou des strings convertibles en nombres).
// Prix en $/MT, quantité en MT. Résultat en 3 niveaux de marge :
//   P&L 1 — Marge brute            = (Vente − Achat) × MT − coûts directs
//   P&L 2 — Marge après financement = P&L 1 − coût du financement (trade finance)
//   P&L 3 — Marge nette            = P&L 2 + résultat hedging + résultat couverture FX

export function computePnL({
  buyPrice, sellPrice, quantity,
  freight, inspection, insurance, demurrage, other,
  financing,
  hedgingResult, fxResult,
}) {
  const warnings = [];

  if (!buyPrice && buyPrice !== 0)   warnings.push("Prix d'achat non renseigné");
  if (!sellPrice && sellPrice !== 0) warnings.push('Prix de vente non renseigné');
  if (!quantity  || Number(quantity) <= 0) warnings.push('Quantité non renseignée');

  const qty = Number(quantity) || 0;
  const bp  = Number(buyPrice)  || 0; // $/MT
  const sp  = Number(sellPrice) || 0; // $/MT

  const revenue          = qty * sp;
  const cogs             = qty * bp;
  const commercialMargin = revenue - cogs;

  // Coûts directs / opérationnels de la cargaison physique
  const operationalCosts =
    (Number(freight)    || 0) +
    (Number(inspection) || 0) +
    (Number(insurance)  || 0) +
    (Number(demurrage)  || 0) +
    (Number(other)      || 0);

  // ── P&L 1 — Marge brute ───────────────────────────────────────
  const pnl1 = commercialMargin - operationalCosts;

  // ── P&L 2 — Marge après financement ───────────────────────────
  const financingCost = Number(financing) || 0;
  const pnl2 = pnl1 - financingCost;

  // ── P&L 3 — Marge nette (hedging + FX) ────────────────────────
  const hedge = Number(hedgingResult) || 0; // gain (+) / perte (−)
  const fx    = Number(fxResult)      || 0; // gain (+) / perte (−)
  const pnl3 = pnl2 + hedge + fx;

  const perMT = (v) => (qty > 0 ? v / qty : 0);
  const pct   = (v) => (revenue > 0 ? (v / revenue) * 100 : 0);

  return {
    qty, revenue, cogs, commercialMargin, operationalCosts,
    financingCost, hedge, fx,
    pnl1, pnl2, pnl3,
    pnl1PerMT: perMT(pnl1), pnl2PerMT: perMT(pnl2), pnl3PerMT: perMT(pnl3),
    pnl1Pct: pct(pnl1), pnl2Pct: pct(pnl2), pnl3Pct: pct(pnl3),
    warnings,
  };
}
