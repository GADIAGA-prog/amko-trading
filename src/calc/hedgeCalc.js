// Calcul pur du nombre de contrats futures pour couvrir une position physique.
// Dépendances : référentiels statiques PRODUCTS et CONTRACTS.

import { PRODUCTS, CONTRACTS } from '../constants.js';

export function computeHedge({ productKey, quantity, hedgeRatio, contractKey }) {
  const product  = PRODUCTS[productKey];
  const contract = CONTRACTS[contractKey];

  const qty           = Number(quantity)   || 0;
  const ratio         = Number(hedgeRatio) || 0;
  const barrels       = qty * product.bblPerMT;
  const hedgedBarrels = barrels * (ratio / 100);

  let lots = 0;
  if (contract.unit === 'bbl') {
    lots = hedgedBarrels / contract.size;
  } else if (contract.unit === 'MT') {
    lots = (qty * ratio / 100) / contract.size;
  }

  const lotsRound = Math.round(lots);
  const overHedge = lotsRound - lots;
  const basisRisk = product.marker !== contract.marker;

  return { product, contract, qty, barrels, hedgedBarrels, lots, lotsRound, overHedge, basisRisk };
}

// P&L réalisé d'une couverture futures/swap :
//   - jambe marché : (entrée − sortie) pour un SHORT, (sortie − entrée) pour un LONG
//   - + roll cumulé (crédit/coût des rolls de position)
// Prix exprimés dans l'unité du contrat (bbl ou MT). Volume = lots × taille.
export function computeHedgePnL({ direction, entryPrice, exitPrice, lots, contractSize, rollTotal }) {
  const entry = Number(entryPrice);
  const exit  = Number(exitPrice);
  const n     = Number(lots)         || 0;
  const size  = Number(contractSize) || 0;
  const roll  = Number(rollTotal)    || 0;

  const hasEntry  = Number.isFinite(entry) && entry > 0;
  const hasExit   = Number.isFinite(exit)  && exit  > 0;
  const hasPrices = hasEntry && hasExit;

  const volume  = n * size; // unités du contrat (bbl ou MT)
  // SHORT : on a vendu les futures à l'entrée, on les rachète à la sortie → gain si la sortie est plus basse.
  // LONG  : on a acheté les futures à l'entrée, on les revend à la sortie  → gain si la sortie est plus haute.
  const perUnit   = !hasPrices ? 0 : (direction === 'short' ? (entry - exit) : (exit - entry));
  const marketPnL = perUnit * volume;
  const totalPnL  = marketPnL + roll;

  return { hasEntry, hasExit, hasPrices, volume, perUnit, marketPnL, rollTotal: roll, totalPnL };
}
