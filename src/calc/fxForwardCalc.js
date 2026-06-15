// fxForwardCalc.js — Calculs purs : couverture FX par forward ferme ou option sur devise.
// Aucune dépendance React. Toutes les entrées sont des scalaires (nombres ou strings numériques).

// ─── Constantes ───────────────────────────────────────────────────────────────
export const EUR_XOF = 655.957; // parité fixe CFA/BCEAO

// ─── Helpers ──────────────────────────────────────────────────────────────────
function n(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// POINTS DE TERME (SWAP POINTS)
// Parité de taux d'intérêt couverte :
//   Forward = Spot × (1 + r_dom × T/360) / (1 + r_for × T/360)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} p
 * @param {number} p.spotRate          1 unité devise étrangère = X devise domestique
 * @param {number} p.rateForCurrency   taux d'intérêt devise étrangère en % annuel
 * @param {number} p.rateDomCurrency   taux d'intérêt devise domestique en % annuel
 * @param {number} p.tenor             durée en jours
 * @returns {{ forwardRateTheoretical, swapPoints, swapPointsPct, annualizedBasis }}
 */
export function computeSwapPoints({ spotRate, rateForCurrency, rateDomCurrency, tenor }) {
  const spot = n(spotRate, 1);
  const rf   = n(rateForCurrency) / 100;
  const rd   = n(rateDomCurrency) / 100;
  const T    = n(tenor);

  const forwardRateTheoretical = T > 0
    ? spot * (1 + rd * T / 360) / (1 + rf * T / 360)
    : spot;

  const swapPoints    = forwardRateTheoretical - spot;
  const swapPointsPct = spot > 0 ? (swapPoints / spot) * 100 : 0;
  const annualizedBasis = T > 0 ? swapPointsPct * (360 / T) : 0;

  return { forwardRateTheoretical, swapPoints, swapPointsPct, annualizedBasis };
}

// ─────────────────────────────────────────────────────────────────────────────
// TAUX À TERME FERME (OUTRIGHT FORWARD)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} p
 * @param {number} p.notionalForeign     montant en devise étrangère à acheter
 * @param {number} p.spotRate            taux spot actuel
 * @param {number} p.forwardRateMarket   taux forward de marché (avant spread)
 * @param {number} p.bankSpreadPct       spread bancaire en % du taux forward (ex: 0.30)
 * @param {number} p.flatCommission      commission fixe en devise domestique
 * @param {number} p.marginPct           dépôt de garantie en % de la valeur spot notionnelle
 * @param {number} p.opportunityRatePct  taux d'opportunité annuel sur le dépôt (%)
 * @param {number} p.tenor               durée en jours
 * @returns {object} détail complet du forward ferme
 */
export function computeForwardFerme({
  notionalForeign, spotRate, forwardRateMarket,
  bankSpreadPct, flatCommission, marginPct, opportunityRatePct, tenor,
}) {
  const notional   = n(notionalForeign);
  const spot       = n(spotRate, 1);
  const fwdMarket  = n(forwardRateMarket, spot);
  const spreadPct  = n(bankSpreadPct) / 100;
  const commission = n(flatCommission);
  const marginR    = n(marginPct) / 100;
  const oppRate    = n(opportunityRatePct) / 100;
  const days       = n(tenor);

  const clientForwardRate  = fwdMarket * (1 + spreadPct);
  const settlementAmount   = notional * clientForwardRate;
  const spotNotional       = notional * spot;

  const spreadCost         = notional * (clientForwardRate - fwdMarket);
  const marginAmount       = spotNotional * marginR;
  const opportunityCost    = days > 0 ? marginAmount * oppRate * (days / 360) : 0;
  const totalCost          = spreadCost + commission + opportunityCost;

  // Taux effectif = (settlement + frais fixes) / notionnel
  const effectiveRate      = notional > 0
    ? (settlementAmount + commission + opportunityCost) / notional
    : 0;

  // Protection : combien le forward protège par rapport au spot actuel (en %)
  const protectionPct      = spot > 0 ? ((clientForwardRate / spot) - 1) * 100 : 0;

  // Coût total en % du notionnel spot
  const totalCostPct       = spotNotional > 0 ? (totalCost / spotNotional) * 100 : 0;

  return {
    clientForwardRate,
    settlementAmount,
    spotNotional,
    spreadCost,
    marginAmount,
    opportunityCost,
    flatCommission: commission,
    totalCost,
    totalCostPct,
    effectiveRate,
    protectionPct,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION SUR DEVISE (CALL = droit d'ACHETER la devise étrangère)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} p
 * @param {number} p.notionalForeign   montant en devise étrangère
 * @param {number} p.spotRate          taux spot actuel
 * @param {number} p.strikeRate        prix d'exercice (strike)
 * @param {number} p.premiumPct        prime en % du notionnel spot (si premiumAbsolute absent)
 * @param {number} p.premiumAbsolute   prime en montant absolu en devise domestique
 * @param {number} p.courtageFlat      commission de courtage en devise domestique
 * @returns {object} détail complet de l'option
 */
export function computeOptionChange({
  notionalForeign, spotRate, strikeRate,
  premiumPct, premiumAbsolute, courtageFlat,
}) {
  const notional  = n(notionalForeign);
  const spot      = n(spotRate, 1);
  const strike    = n(strikeRate, spot);
  const courtage  = n(courtageFlat);
  const spotNotional = notional * spot;

  const premiumAmount = n(premiumAbsolute) > 0
    ? n(premiumAbsolute)
    : spotNotional * (n(premiumPct) / 100);

  const premiumRatePct   = spotNotional > 0 ? (premiumAmount / spotNotional) * 100 : 0;
  const totalUpfrontCost = premiumAmount + courtage;

  // Si exercée : settlement au strike + prime + courtage
  const settlementIfExercised    = notional * strike;
  const effectiveRateIfExercised = notional > 0
    ? (settlementIfExercised + totalUpfrontCost) / notional
    : 0;

  // Point mort (breakeven pour un call) : strike + coût total / notionnel
  const breakeven = notional > 0 ? strike + totalUpfrontCost / notional : 0;

  // Si non exercée : on achète au spot
  const settlementIfNotExercised    = notional * spot;
  const effectiveRateIfNotExercised = notional > 0
    ? (settlementIfNotExercised + totalUpfrontCost) / notional
    : 0;

  // Gain maximal de l'option (si spot monte fortement) : économie vs spot élevé
  const moneyness = spot > 0 ? ((strike / spot) - 1) * 100 : 0; // négatif = OTM call si strike > spot

  return {
    premiumAmount,
    premiumRatePct,
    courtage,
    totalUpfrontCost,
    settlementIfExercised,
    effectiveRateIfExercised,
    breakeven,
    settlementIfNotExercised,
    effectiveRateIfNotExercised,
    spotNotional,
    moneyness,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCÉNARIOS DE COMPARAISON (forward ferme vs option vs achat spot)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} p
 * @param {number} p.notionalForeign
 * @param {number} p.spotRate           taux spot de référence
 * @param {number} p.strikeRate         strike de l'option
 * @param {object} p.forwardResult      résultat de computeForwardFerme
 * @param {object} p.optionResult       résultat de computeOptionChange
 * @param {number[]} [p.scenarioRates]  taux spot à l'échéance à tester
 * @returns {object[]} tableau de scénarios
 */
export function computeHedgeScenarios({
  notionalForeign, spotRate, strikeRate, forwardResult, optionResult, scenarioRates,
}) {
  const notional = n(notionalForeign);
  const spot     = n(spotRate, 1);
  const strike   = n(strikeRate, spot);

  if (!scenarioRates?.length) {
    scenarioRates = [-15, -10, -5, -3, 0, 3, 5, 10, 15, 20]
      .map(pct => Math.round(spot * (1 + pct / 100) * 10000) / 10000);
  }

  const forwardFixed = forwardResult.settlementAmount
    + forwardResult.flatCommission
    + forwardResult.opportunityCost;

  return scenarioRates.map(maturitySpot => {
    const spotPurchase = notional * maturitySpot;

    // Forward ferme : coût immuable (engagement ferme)
    const forwardGainVsSpot = spotPurchase - forwardFixed;

    // Option : si spot > strike → exercée (achat au strike) ; sinon → achat au spot
    const optionExercised = maturitySpot > strike;
    const optionCost = optionExercised
      ? optionResult.settlementIfExercised + optionResult.totalUpfrontCost
      : notional * maturitySpot + optionResult.totalUpfrontCost;
    const optionGainVsSpot = spotPurchase - optionCost;

    const pctVsSpot = spot > 0 ? ((maturitySpot / spot) - 1) * 100 : 0;
    const best = forwardGainVsSpot >= optionGainVsSpot ? 'forward' : 'option';

    return {
      maturitySpot,
      pctVsSpot,
      spotPurchase,
      forwardFixed,
      forwardGainVsSpot,
      optionCost,
      optionExercised,
      optionGainVsSpot,
      best,
    };
  });
}
