// Calcul pur du P&L d'un deal — sans dépendances React.
// Toutes les entrées sont des nombres (ou des strings convertibles en nombres).

export function computePnL({
  buyPrice, sellPrice, quantity, bblPerMT,
  freight, financing, inspection, insurance, demurrage, other,
}) {
  const warnings = [];

  if (!buyPrice && buyPrice !== 0)   warnings.push("Prix d'achat non renseigné");
  if (!sellPrice && sellPrice !== 0) warnings.push('Prix de vente non renseigné');
  if (!quantity  || Number(quantity) <= 0) warnings.push('Quantité non renseignée');

  const qty         = Number(quantity) || 0;
  const bp          = Number(buyPrice)  || 0;
  const sp          = Number(sellPrice) || 0;
  const totalBbl    = qty * (Number(bblPerMT) || 0);

  const revenue     = totalBbl * sp;
  const cogs        = totalBbl * bp;
  const grossMargin = revenue - cogs;

  const costs =
    (Number(freight)    || 0) +
    (Number(financing)  || 0) +
    (Number(inspection) || 0) +
    (Number(insurance)  || 0) +
    (Number(demurrage)  || 0) +
    (Number(other)      || 0);

  const netMargin    = grossMargin - costs;
  const marginPerBbl = totalBbl > 0 ? netMargin / totalBbl : 0;
  const marginPct    = revenue   > 0 ? (netMargin / revenue) * 100 : 0;

  return { totalBbl, revenue, cogs, grossMargin, costs, netMargin, marginPerBbl, marginPct, warnings };
}
