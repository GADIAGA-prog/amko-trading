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
