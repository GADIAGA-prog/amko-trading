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
  const structure  =
    rollSpread >  0.1 ? 'CONTANGO' :
    rollSpread < -0.1 ? 'BACKWARDATION' : 'FLAT';

  return { contract, rollSpread, totalBbl, netPerBbl, totalRoll, isCredit, structure };
}
