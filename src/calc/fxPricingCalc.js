// =============================================================================
// fxPricingCalc.js — Calculs purs : FX, pricing physique, P&L, arbitrage,
// scénarios de stress et verdict GO/NO-GO.
// Aucune dépendance React. Toutes les entrées sont des scalaires ou objets plain.
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// CONVENTION DES TAUX DE CHANGE
//   spotEURUSD  : 1 EUR = X USD   (ex. 1.08)
//   spotUSDXOF  : 1 USD = X XOF   (ex. 600)
//   spotEURXOF  : 1 EUR = X XOF   (ex. 655.957)
// Les forwards suivent la même convention.
// Fallback : si un taux forward est 0 ou absent, on utilise le spot.
// ─────────────────────────────────────────────────────────────────────────────

function safeRate(fwd, spot) {
  return Number(fwd) > 0 ? Number(fwd) : Number(spot) || 1;
}

/**
 * Convertit un montant d'une devise vers une autre.
 * @param {number}  amount
 * @param {'USD'|'EUR'|'XOF'} fromCcy
 * @param {'USD'|'EUR'|'XOF'} toCcy
 * @param {object}  rates  — { spotEURUSD, spotUSDXOF, spotEURXOF, forwardEURUSD, forwardUSDXOF, forwardEURXOF }
 * @param {boolean} useForward
 */
export function convertCurrency(amount, fromCcy, toCcy, rates, useForward = false) {
  if (fromCcy === toCcy) return Number(amount);
  const amt = Number(amount) || 0;

  const eurusd = useForward
    ? safeRate(rates.forwardEURUSD, rates.spotEURUSD)
    : (Number(rates.spotEURUSD) || 1.08);
  const usdxof = useForward
    ? safeRate(rates.forwardUSDXOF, rates.spotUSDXOF)
    : (Number(rates.spotUSDXOF) || 600);
  const eurxof = useForward
    ? safeRate(rates.forwardEURXOF, rates.spotEURXOF)
    : (Number(rates.spotEURXOF) || 655.957);

  if (fromCcy === 'USD' && toCcy === 'EUR') return amt / eurusd;
  if (fromCcy === 'EUR' && toCcy === 'USD') return amt * eurusd;
  if (fromCcy === 'USD' && toCcy === 'XOF') return amt * usdxof;
  if (fromCcy === 'XOF' && toCcy === 'USD') return amt / usdxof;
  if (fromCcy === 'EUR' && toCcy === 'XOF') return amt * eurxof;
  if (fromCcy === 'XOF' && toCcy === 'EUR') return amt / eurxof;

  return amt; // fallback (ne devrait pas arriver)
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIX PHYSIQUE FINAL (USD/MT)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} p
 * @param {number} p.averagePrice  — Platts moyen sur la période
 * @param {'USD/MT'|'USD/bbl'} p.unit
 * @param {number} p.bblPerMT      — facteur de conversion (ex. 7.45)
 * @param {number} p.premium       — prime vendeur ($/MT)
 * @param {number} p.differential  — différentiel qualité/localisation ($/MT)
 */
export function computePhysicalPrice({ averagePrice, unit, bblPerMT, premium, differential }) {
  let pricePerMT = Number(averagePrice) || 0;
  if (unit === 'USD/bbl' && Number(bblPerMT) > 0) {
    pricePerMT = pricePerMT * Number(bblPerMT);
  }
  return pricePerMT + (Number(premium) || 0) + (Number(differential) || 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉCONOMIE DU DEAL — SPOT ET FORWARD
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Calcule tous les indicateurs financiers pour une combinaison achat/vente/marge.
 * @param {object} p
 * @param {number} p.purchasePrice   — $/MT prix d'achat
 * @param {number} p.salePrice       — $/MT prix de vente
 * @param {number} p.quantityMT
 * @param {'USD'|'EUR'|'XOF'} p.purchaseCcy
 * @param {'USD'|'EUR'|'XOF'} p.saleCcy
 * @param {'USD'|'EUR'|'XOF'} p.marginCcy
 * @param {object} p.fx              — taux spot + forward
 * @param {object} p.costs           — { freightCost, insuranceCost, inspectionCost, financingCost, demurrageEstimate, otherCosts }
 */
export function computeEconomics({ purchasePrice, salePrice, quantityMT, purchaseCcy, saleCcy, marginCcy, fx, costs }) {
  const qty = Number(quantityMT) || 0;
  const pp  = Number(purchasePrice) || 0;
  const sp  = Number(salePrice)     || 0;

  const c = costs || {};
  const freightCost      = Number(c.freightCost)      || 0;
  const insuranceCost    = Number(c.insuranceCost)    || 0;
  const inspectionCost   = Number(c.inspectionCost)   || 0;
  const financingCost    = Number(c.financingCost)    || 0;
  const demurrageEstimate = Number(c.demurrageEstimate) || 0;
  const otherCosts       = Number(c.otherCosts)       || 0;
  const totalCosts = freightCost + insuranceCost + inspectionCost +
                     financingCost + demurrageEstimate + otherCosts;

  const purchaseAmt = pp * qty; // dans purchaseCcy
  const saleAmt     = sp * qty; // dans saleCcy

  // ── Spot ──────────────────────────────────────────────────────
  const purchaseSpot   = convertCurrency(purchaseAmt, purchaseCcy, marginCcy, fx, false);
  const saleSpot       = convertCurrency(saleAmt,     saleCcy,     marginCcy, fx, false);
  const grossMarginSpot = saleSpot - purchaseSpot;
  const netMarginSpot   = grossMarginSpot - totalCosts;

  // ── Forward ───────────────────────────────────────────────────
  const purchaseFwd    = convertCurrency(purchaseAmt, purchaseCcy, marginCcy, fx, true);
  const saleFwd        = convertCurrency(saleAmt,     saleCcy,     marginCcy, fx, true);
  const grossMarginFwd  = saleFwd - purchaseFwd;
  const netMarginFwd    = grossMarginFwd - totalCosts;

  const marginPerMTSpot    = qty > 0 ? netMarginSpot  / qty : 0;
  const marginPerMTForward = qty > 0 ? netMarginFwd   / qty : 0;
  const marginPercentSpot  = saleSpot > 0 ? (netMarginSpot / saleSpot) * 100 : 0;
  const marginPercentForward = saleFwd > 0 ? (netMarginFwd  / saleFwd)  * 100 : 0;

  return {
    purchaseAmountOriginalCurrency: purchaseAmt,
    saleAmountOriginalCurrency:     saleAmt,
    purchaseAmountMarginCurrencySpot:    purchaseSpot,
    saleAmountMarginCurrencySpot:        saleSpot,
    grossMarginSpot,
    purchaseAmountMarginCurrencyForward: purchaseFwd,
    saleAmountMarginCurrencyForward:     saleFwd,
    grossMarginForward: grossMarginFwd,
    freightCost, insuranceCost, inspectionCost, financingCost, demurrageEstimate, otherCosts,
    totalCosts,
    netMarginSpot,
    netMarginForward: netMarginFwd,
    marginPerMTSpot,
    marginPerMTForward,
    marginPercentSpot,
    marginPercentForward,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARBITRAGE FX — 6 COMBINAISONS DEVISE ACHAT × VENTE
// ─────────────────────────────────────────────────────────────────────────────
const FX_PAIRS = [
  { buy: 'USD', sell: 'USD' },
  { buy: 'EUR', sell: 'USD' },
  { buy: 'USD', sell: 'EUR' },
  { buy: 'EUR', sell: 'EUR' },
  { buy: 'USD', sell: 'XOF' },
  { buy: 'EUR', sell: 'XOF' },
];

export function computeArbitrage({ purchasePrice, salePrice, quantityMT, marginCcy, fx, costs }) {
  const results = FX_PAIRS.map(({ buy, sell }) => {
    const eco = computeEconomics({
      purchasePrice, salePrice, quantityMT,
      purchaseCcy: buy, saleCcy: sell, marginCcy, fx, costs,
    });
    return {
      label:             `Achat ${buy} / Vente ${sell}`,
      purchaseCcy:       buy,
      saleCcy:           sell,
      netMarginSpot:     eco.netMarginSpot,
      netMarginForward:  eco.netMarginForward,
      marginPerMTFwd:    eco.marginPerMTForward,
    };
  });

  results.sort((a, b) => b.netMarginForward - a.netMarginForward);
  const best = results[0];
  const qty  = Number(quantityMT) || 1;

  // Identifier l'exposition FX résiduelle et le montant à couvrir
  // Exposition = différence entre la devise de vente et la devise de marge
  const recommendedHedgeCcy = best.saleCcy !== marginCcy ? best.saleCcy : best.purchaseCcy;
  const saleAmt  = Number(salePrice)     * qty;
  const buyAmt   = Number(purchasePrice) * qty;
  const hedgeAmt = recommendedHedgeCcy === best.saleCcy ? saleAmt : buyAmt;

  // Taux forward recommandé pour cette paire
  let recommendedFwdRate = 1;
  if (recommendedHedgeCcy === 'USD' && marginCcy === 'EUR') recommendedFwdRate = safeRate(fx.forwardEURUSD, fx.spotEURUSD);
  if (recommendedHedgeCcy === 'USD' && marginCcy === 'XOF') recommendedFwdRate = safeRate(fx.forwardUSDXOF, fx.spotUSDXOF);
  if (recommendedHedgeCcy === 'EUR' && marginCcy === 'XOF') recommendedFwdRate = safeRate(fx.forwardEURXOF, fx.spotEURXOF);

  // Gain/perte FX : comparaison de la meilleure combinaison en forward vs spot
  const bestSpot    = results.reduce((m, r) => r.netMarginSpot > m ? r.netMarginSpot : m, -Infinity);
  const fxGainLoss  = best.netMarginForward - bestSpot;
  const fxGainLossPerMT = qty > 0 ? fxGainLoss / qty : 0;

  // Recommandation textuelle
  let recommendation = '';
  if (best.netMarginForward > bestSpot) {
    recommendation = `Le forward améliore la marge. Couvrir l'exposition ${recommendedHedgeCcy}/${marginCcy} au taux forward saisi.`;
  } else if (best.netMarginForward < bestSpot && best.netMarginForward > 0) {
    recommendation = `Le forward réduit légèrement la marge attendue mais sécurise contre une dégradation FX. Recommandé si l'objectif est la protection.`;
  } else if (best.netMarginForward <= 0) {
    recommendation = `NO-GO : la marge forward est négative. Renégocier le prix, la prime ou le fret.`;
  } else {
    recommendation = `Combinaison optimale : achat en ${best.purchaseCcy}, vente en ${best.saleCcy}.`;
  }

  return {
    bestSaleCurrency:       best.saleCcy,
    bestPurchaseCurrency:   best.purchaseCcy,
    allCombinations:        results,
    fxGainLossVsSpot:       fxGainLoss,
    fxGainLossPerMT,
    recommendedHedgeCurrency:  recommendedHedgeCcy,
    recommendedHedgeAmount:    hedgeAmt,
    recommendedForwardRate:    recommendedFwdRate,
    recommendation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCÉNARIOS DE STRESS FX (±1 %, ±3 %, ±5 %)
// On choque le taux FX entre la devise de vente et la devise de marge.
// ─────────────────────────────────────────────────────────────────────────────
function applyShock(fx, saleCcy, marginCcy, pct) {
  const f = 1 + pct / 100;
  const shocked = { ...fx };
  // Choque la paire pertinente
  if (saleCcy === 'USD' && marginCcy === 'EUR') {
    shocked.spotEURUSD    = (Number(fx.spotEURUSD)    || 1.08) * f;
    shocked.forwardEURUSD = (Number(fx.forwardEURUSD) || fx.spotEURUSD || 1.08) * f;
  } else if (saleCcy === 'XOF' && marginCcy === 'USD') {
    shocked.spotUSDXOF    = (Number(fx.spotUSDXOF)    || 600) * f;
    shocked.forwardUSDXOF = (Number(fx.forwardUSDXOF) || fx.spotUSDXOF || 600) * f;
  } else if (saleCcy === 'EUR' && marginCcy === 'USD') {
    shocked.spotEURUSD    = (Number(fx.spotEURUSD)    || 1.08) * f;
    shocked.forwardEURUSD = (Number(fx.forwardEURUSD) || fx.spotEURUSD || 1.08) * f;
  } else if (saleCcy === 'XOF' && marginCcy === 'EUR') {
    shocked.spotEURXOF    = (Number(fx.spotEURXOF)    || 655.957) * f;
    shocked.forwardEURXOF = (Number(fx.forwardEURXOF) || fx.spotEURXOF || 655.957) * f;
  }
  return shocked;
}

export function computeScenarios({ purchasePrice, salePrice, quantityMT, purchaseCcy, saleCcy, marginCcy, fx, costs }) {
  const shocks = [-5, -3, -1, 1, 3, 5];
  const scenarioResults = {};

  shocks.forEach(pct => {
    const shockedFx = applyShock(fx, saleCcy, marginCcy, pct);
    const eco = computeEconomics({ purchasePrice, salePrice, quantityMT, purchaseCcy, saleCcy, marginCcy, fx: shockedFx, costs });
    const key = `fx${pct > 0 ? 'Plus' : 'Minus'}${Math.abs(pct)}Percent`;
    scenarioResults[key] = Math.round(eco.netMarginForward * 100) / 100;
  });

  const margins = Object.values(scenarioResults);
  return {
    ...scenarioResults,
    worstCaseMargin: Math.min(...margins),
    bestCaseMargin:  Math.max(...margins),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VERDICT : GO / GO_WITH_CONDITIONS / NO_GO
// ─────────────────────────────────────────────────────────────────────────────
export function computeVerdict({ economics, scenarios, deal, minMarginPerMT = 5, pricingComplete = true }) {
  const { netMarginForward, marginPerMTForward, purchaseAmountOriginalCurrency, saleAmountOriginalCurrency } = economics;
  const reasons  = [];
  const required = [];

  // ── NO-GO immédiat ───────────────────────────────────────────
  if (netMarginForward < 0) {
    reasons.push('Marge nette forward négative');
    required.push('Renégocier le prix, réduire les coûts ou refuser le deal');
    return { status: 'NO_GO', reasons, requiredActions: required };
  }
  if (purchaseAmountOriginalCurrency > 0 && saleAmountOriginalCurrency > 0 &&
      purchaseAmountOriginalCurrency > saleAmountOriginalCurrency) {
    reasons.push("Prix d'achat supérieur au prix de vente");
    required.push('Revoir la formule de prix');
    return { status: 'NO_GO', reasons, requiredActions: required };
  }
  if (scenarios.worstCaseMargin < 0) {
    reasons.push('Marge devient négative dans le pire scénario FX (−5 %)');
    required.push('Couvrir le risque FX par un forward ou revoir le prix');
  }

  // ── Conditions ───────────────────────────────────────────────
  let conditioned = false;
  const threshold = Number(minMarginPerMT) || 5;

  if (marginPerMTForward < threshold) {
    reasons.push(`Marge par MT (${marginPerMTForward.toFixed(2)} $/MT) en-dessous du seuil (${threshold} $/MT)`);
    required.push('Renégocier la prime ou réduire les coûts');
    conditioned = true;
  }
  if (!pricingComplete) {
    reasons.push('Pricing incomplet (prix moyen Platts ou période non renseignée)');
    required.push('Compléter le pricing avant validation');
    conditioned = true;
  }
  if (!deal?.paymentTerm || !/(lc|prépaiement|sblc)/i.test(deal.paymentTerm)) {
    reasons.push('Paiement non sécurisé (pas de LC, SBLC ou prépaiement)');
    required.push('Exiger une LC irrévocable confirmée ou un prépaiement');
    conditioned = true;
  }
  if (!deal?.freight) {
    reasons.push('Fret non calculé et non sauvegardé dans le deal');
    required.push('Calculer et sauvegarder le fret dans le module Fret (WS)');
    conditioned = true;
  }

  if (conditioned || reasons.length > 0) {
    reasons.unshift('Marge forward positive mais conditions à lever');
    return { status: 'GO_WITH_CONDITIONS', reasons, requiredActions: required };
  }

  reasons.push('Marge forward positive et au-dessus du seuil minimum');
  reasons.push('Pricing complet, paiement sécurisé, fret inclus');
  return { status: 'GO', reasons, requiredActions: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTION DU PRICINGVALIDATION COMPLET (objet à sauvegarder dans le deal)
// ─────────────────────────────────────────────────────────────────────────────
export function buildPricingValidation({
  deal,
  pricingPeriod,
  differential,
  premium,
  finalPurchasePrice,
  finalSalePrice,
  purchaseCcy,
  saleCcy,
  marginCcy,
  fx,
  costs,
  minMarginPerMT,
  validatedBy,
}) {
  const qty      = Number(deal?.quantity) || 0;
  const tol      = Number(deal?.tolerance) || 0;
  const product  = deal?.product || '';
  const pricingComplete = !!(pricingPeriod?.averagePrice && pricingPeriod?.startDate);

  const economics = computeEconomics({
    purchasePrice: finalPurchasePrice,
    salePrice:     finalSalePrice,
    quantityMT:    qty,
    purchaseCcy, saleCcy, marginCcy, fx, costs,
  });

  const arbitrage = computeArbitrage({
    purchasePrice: finalPurchasePrice,
    salePrice:     finalSalePrice,
    quantityMT: qty, marginCcy, fx, costs,
  });

  const scenarios = computeScenarios({
    purchasePrice: finalPurchasePrice,
    salePrice:     finalSalePrice,
    quantityMT: qty, purchaseCcy, saleCcy, marginCcy, fx, costs,
  });

  const verdict = computeVerdict({ economics, scenarios, deal, minMarginPerMT, pricingComplete });

  return {
    validated:    verdict.status === 'GO',
    validatedAt:  new Date().toISOString(),
    validatedBy:  validatedBy || null,

    product, quantityMT: qty, quantityTolerance: tol,

    priceSource:  deal?.priceSource || 'Platts',
    priceMarker:  deal?.priceMarker || '',
    pricingPeriod: {
      startDate:    pricingPeriod?.startDate   || '',
      endDate:      pricingPeriod?.endDate     || '',
      averagePrice: Number(pricingPeriod?.averagePrice) || 0,
      unit:         pricingPeriod?.unit        || 'USD/MT',
    },

    differential:        Number(differential)  || 0,
    premium:             Number(premium)        || 0,
    finalPhysicalPrice:  Number(finalPurchasePrice) || 0,

    purchaseCurrency: purchaseCcy,
    saleCurrency:     saleCcy,
    marginCurrency:   marginCcy,

    fx: {
      spotEURUSD:    Number(fx.spotEURUSD)    || 0,
      spotUSDXOF:    Number(fx.spotUSDXOF)    || 0,
      spotEURXOF:    Number(fx.spotEURXOF)    || 0,
      forwardEURUSD: Number(fx.forwardEURUSD) || 0,
      forwardUSDXOF: Number(fx.forwardUSDXOF) || 0,
      forwardEURXOF: Number(fx.forwardEURXOF) || 0,
      forwardDate:   fx.forwardDate   || '',
      forwardSource: fx.forwardSource || 'Manual',
    },

    economics,
    arbitrage,
    scenarios,
    verdict,
  };
}
