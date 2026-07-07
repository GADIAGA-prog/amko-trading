// Calcul pur du coût / crédit de roulement d'une position futures.
// position : 'short' | 'long'
// frontPrice / nextPrice en $/bbl (ou $/MT selon le contrat).

import { CONTRACTS } from '../constants.js';

export function computeRoll({ position, frontPrice, nextPrice, nLots, contractKey }) {
  const contract = CONTRACTS[contractKey];

  const pNear      = Number(frontPrice) || 0;
  const pFar       = Number(nextPrice)  || 0;
  const rollSpread = pFar - pNear;                          // M_far − M_near
  const totalBbl   = nLots * contract.size;
  const netPerBbl  = position === 'short' ? rollSpread : -rollSpread;
  const totalRoll  = netPerBbl * totalBbl;
  const isCredit   = totalRoll > 0;
  // Seuil de structure adapté à l'unité du contrat (≈ 0,1 $/bbl ↔ 0,75 $/MT)
  const flatEps    = contract.unit === 'MT' ? 0.75 : 0.1;
  const structure  =
    rollSpread >  flatEps ? 'CONTANGO' :
    rollSpread < -flatEps ? 'BACKWARDATION' : 'FLAT';

  return { contract, rollSpread, totalBbl, netPerBbl, totalRoll, isCredit, structure };
}
