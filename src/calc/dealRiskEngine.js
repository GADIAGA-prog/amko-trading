import { EUR_XOF_FIXED, normalizeFxRates } from './fxPricingCalc.js';

function n(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function hasText(v) {
  return String(v ?? '').trim().length > 0;
}

function includesAny(value, words) {
  const s = String(value ?? '').toLowerCase();
  return words.some(w => s.includes(w));
}

function scoreLevel(score) {
  if (score >= 20) return 'Critique';
  if (score >= 12) return 'Élevé';
  if (score >= 6) return 'Modéré';
  return 'Faible';
}

function statusFromScore(total) {
  if (total >= 80) return 'NO_GO';
  if (total >= 45) return 'GO_WITH_CONDITIONS';
  return 'GO';
}

function risk(probability, severity, name, description, mitigation, hedge = '') {
  const score = n(probability) * n(severity);
  return { name, probability, severity, score, level: scoreLevel(score), description, mitigation, hedge };
}

function productExposure(deal) {
  const priceSource = String(deal?.priceSource || '').toLowerCase();
  const pricingWindow = String(deal?.pricingWindow || deal?.pricingPeriod || deal?.pricing || '').toLowerCase();
  const isPlatts = priceSource.includes('platts') || hasText(deal?.plattsCode);
  const isMonthlyAverage = pricingWindow.includes('month') || pricingWindow.includes('mois') || pricingWindow.includes('monthly') || pricingWindow.includes('moyenne');
  const hasFixedSale = hasText(deal?.fixedSalePrice) || hasText(deal?.salePrice) || hasText(deal?.clientPriceXOF);
  return { isPlatts, isMonthlyAverage, hasFixedSale };
}

export function inferDealStructure(deal = {}) {
  const incoterm = String(deal.incoterm || '').toUpperCase();
  const paymentTerm = String(deal.paymentTerm || '');
  const supplierPayment = String(deal.supplierPaymentTerm || deal.paymentTerm || '');
  const purchaseCurrency = deal.purchaseCurrency || deal.supplierCurrency || deal.pricingValidation?.purchaseCurrency || 'USD';
  const saleCurrency = deal.saleCurrency || deal.clientCurrency || deal.pricingValidation?.saleCurrency || 'XOF';
  const marginCurrency = deal.marginCurrency || deal.pricingValidation?.marginCurrency || 'USD';
  const tradeFinance = !!deal.tradeFinance || includesAny(paymentTerm, ['lc', 'sblc', 'tr loan', 'trust receipt', 'trade finance', 'crédit', 'credit']);
  const supplierPrepaid = includesAny(supplierPayment, ['avant', 'before', 'prepay', 'prépaiement', 'cash in advance']) || includesAny(paymentTerm, ['prépaiement', 'prepayment']);
  const clientDeferred = includesAny(paymentTerm, ['60', 'deferred', 'différé', 'credit', 'crédit', 'open credit']);
  return { incoterm, paymentTerm, supplierPayment, purchaseCurrency, saleCurrency, marginCurrency, tradeFinance, supplierPrepaid, clientDeferred };
}

export function buildHedgeRecommendations(deal = {}, context = {}) {
  const s = inferDealStructure(deal);
  const qty = n(deal.quantity || deal.quantityMT);
  const legBuy  = deal.dealType === 'buy'  ? deal.estimatedPrice : null;
  const legSell = deal.dealType === 'sell' ? deal.estimatedPrice : null;
  const purchasePrice = n(deal.purchasePrice || deal.finalPurchasePrice || legBuy);
  const salePrice = n(deal.salePrice || deal.finalSalePrice || deal.clientPrice || legSell);
  const fx = normalizeFxRates(context.fx || deal.pricingValidation?.fx || {});
  const product = productExposure(deal);
  const hedges = [];

  if (product.isPlatts && product.isMonthlyAverage) {
    hedges.push({
      family: 'Commodity',
      instrument: 'ICE Gasoil futures / swap gasoil Platts',
      action: product.hasFixedSale ? 'Acheter swap/futures gasoil sur les volumes non encore pricés' : 'Aligner formule achat et formule vente pour réduire le basis risk',
      exposure: qty ? `${qty.toLocaleString('fr-FR')} MT` : 'Volume du deal',
      hedgeRatio: '80 % à 100 % selon certitude du volume et de la fenêtre de pricing',
      timing: 'Dès fixation de la fenêtre Platts ou dès signature commerciale',
      rationale: 'Le prix d’achat indexé Platts peut évoluer avant la facture finale. La couverture neutralise l’effet de ciseaux entre coût Platts et prix local.',
    });
  }

  if (s.purchaseCurrency === 'USD' && s.saleCurrency === 'XOF') {
    const usdAmount = qty && purchasePrice ? qty * purchasePrice : null;
    hedges.push({
      family: 'FX',
      instrument: 'FX forward XOF/EUR/USD ou achat USD à terme',
      action: 'Acheter USD forward contre XOF via la parité EUR/XOF',
      exposure: usdAmount ? `${Math.round(usdAmount).toLocaleString('fr-FR')} USD` : 'Montant fournisseur USD ou dette Trade Finance USD',
      hedgeRatio: '100 % du montant fournisseur si prix et volume fixés ; 80 % si quantité encore incertaine',
      timing: s.tradeFinance ? 'À caler sur la maturité de remboursement de la ligne Trade Finance' : 'À caler sur la date de paiement fournisseur',
      rationale: `Le XOF est fixe contre EUR (${EUR_XOF_FIXED}); le vrai risque est EUR/USD, donc USD/XOF implicite = ${EUR_XOF_FIXED} / EURUSD.`,
      indicativeRate: fx.forwardUSDXOF ? `${fx.forwardUSDXOF.toFixed(2)} XOF/USD` : '',
    });
  }

  if (s.purchaseCurrency === 'EUR' && s.saleCurrency === 'USD') {
    const eurAmount = qty && purchasePrice ? qty * purchasePrice : null;
    hedges.push({
      family: 'FX',
      instrument: 'Achat EUR forward / vente USD forward',
      action: 'Acheter EUR à terme pour couvrir le paiement fournisseur',
      exposure: eurAmount ? `${Math.round(eurAmount).toLocaleString('fr-FR')} EUR` : 'Montant fournisseur EUR',
      hedgeRatio: '100 % si montant fournisseur fixé',
      timing: 'Date de paiement fournisseur ou date de tirage Trade Finance',
      rationale: 'Si l’EUR monte contre USD, le coût fournisseur augmente et peut effacer la marge.',
    });
  }

  if (s.marginCurrency === 'USD' && s.saleCurrency === 'XOF') {
    hedges.push({
      family: 'FX marge',
      instrument: 'Vente EUR forward contre USD après conversion XOF→EUR fixe',
      action: 'Sécuriser la valeur USD de la marge XOF attendue',
      exposure: 'Marge nette attendue après coûts et financement',
      hedgeRatio: '80 % à 100 % de la marge nette attendue',
      timing: 'Date d’encaissement client ou remboursement bancaire',
      rationale: 'La marge économique en XOF/EUR varie en USD avec EUR/USD.',
    });
  }

  if (s.supplierPrepaid) {
    hedges.push({
      family: 'Performance / crédit fournisseur',
      instrument: 'Advance Payment Bond, escrow, inspection indépendante, clause remboursement',
      action: 'Ne libérer le cash fournisseur qu’avec garantie bancaire ou séquestre',
      exposure: '100 % du prépaiement fournisseur',
      hedgeRatio: 'Garantie couvrant 100 % du prépaiement',
      timing: 'Avant tout paiement fournisseur',
      rationale: 'Le paiement avant livraison crée un risque de non-performance, retard, qualité ou quantité.',
    });
  }

  if (s.incoterm === 'DAP') {
    hedges.push({
      family: 'Logistique DAP',
      instrument: 'Provision demurrage + inspection discharge + check douane/port',
      action: 'Provisionner les surestaries et sécuriser le plan de déchargement à Lomé',
      exposure: 'Demurrage, retard douane, freinte, frais portuaires',
      hedgeRatio: 'Provision opérationnelle 0,3 % à 0,5 % volume + demurrage estimé',
      timing: 'Avant nomination navire et avant arrivée Lomé',
      rationale: 'Sous DAP, le vendeur amène la marchandise, mais les blocages au déchargement peuvent impacter la marge.',
    });
  }

  return hedges;
}

export function assessDealRisks(deal = {}, context = {}) {
  const s = inferDealStructure(deal);
  const product = productExposure(deal);
  const risks = [];

  risks.push(risk(
    product.isPlatts ? 4 : 2,
    product.isMonthlyAverage || product.hasFixedSale ? 5 : 3,
    'Risque matière première / Platts',
    'Variation du Gasoil Platts/ICE entre signature, fenêtre de pricing, livraison et facture finale.',
    product.isPlatts ? 'Couvrir par swap/futures ICE Gasoil ou aligner la formule d’achat et de vente.' : 'Confirmer prix fixe fournisseur et prix client.',
    'Commodity swap ou futures ICE Gasoil 80-100 % du volume exposé',
  ));

  const fxSev = s.purchaseCurrency !== s.saleCurrency || s.marginCurrency !== s.saleCurrency ? 5 : 2;
  risks.push(risk(
    fxSev >= 5 ? 4 : 2,
    fxSev,
    'Risque FX',
    `Achat ${s.purchaseCurrency}, vente ${s.saleCurrency}, marge ${s.marginCurrency}. XOF fixe contre EUR, risque central EUR/USD.`,
    'Mettre en place un forward FX calé sur la date de paiement fournisseur ou de remboursement Trade Finance.',
    'FX forward / flexible forward / option USD selon incertitude de date',
  ));

  risks.push(risk(
    s.tradeFinance ? 3 : 4,
    5,
    'Risque financement / liquidité',
    'Décalage entre paiement fournisseur, livraison, encaissement client et remboursement bancaire.',
    'Caler LC, TR Loan ou crédit de campagne sur le cycle réel de cash-flow.',
    'Trade Finance + échéancier + forward sur date de remboursement',
  ));

  risks.push(risk(
    s.supplierPrepaid ? 4 : 2,
    s.supplierPrepaid ? 5 : 3,
    'Risque fournisseur / prépaiement',
    'Paiement avant livraison avec risque de retard, qualité, quantité ou non-performance.',
    'Exiger Advance Payment Bond, escrow, inspection indépendante et clauses de remboursement.',
    'Garantie bancaire couvrant 100 % du prépaiement',
  ));

  risks.push(risk(
    s.incoterm === 'DAP' ? 3 : 2,
    4,
    'Risque logistique DAP / Lomé',
    'Déchargement, douane, stockage, STSL, freinte, demurrage et coordination documentaire.',
    'Préparer clearance, terminal, inspection, plan de pompage et provision demurrage/freinte.',
    'Provision demurrage + freinte 0,3-0,5 % + contrôle documents',
  ));

  risks.push(risk(
    includesAny(s.paymentTerm, ['open credit', '60', 'deferred', 'différé']) ? 4 : 2,
    5,
    'Risque crédit client',
    'Client paie en différé ou en XOF après livraison, créant un risque de recouvrement.',
    'Exiger LC locale, SBLC, garantie bancaire, aval ou escrow client.',
    'Garantie paiement client couvrant montant facture + taxes/frais',
  ));

  const totalScore = risks.reduce((sum, r) => sum + r.score, 0);
  const status = statusFromScore(totalScore);
  const hedges = buildHedgeRecommendations(deal, context);
  const blockers = [];
  if (s.supplierPrepaid) blockers.push('Pas de prépaiement fournisseur sans garantie ou escrow.');
  if (!s.tradeFinance) blockers.push('Ligne Trade Finance non confirmée.');
  if (!hasText(deal.paymentTerm)) blockers.push('Conditions de paiement client non renseignées.');
  if (product.isPlatts && !hasText(deal.pricingWindow || deal.pricingPeriod)) blockers.push('Fenêtre de pricing Platts non renseignée.');

  return {
    totalScore,
    level: scoreLevel(Math.min(25, Math.round(totalScore / risks.length))),
    status,
    risks,
    hedges,
    blockers,
    summary: status === 'NO_GO'
      ? 'NO-GO tant que les risques critiques ne sont pas couverts.'
      : status === 'GO_WITH_CONDITIONS'
        ? 'GO sous conditions avec couverture FX/commodity et garanties documentaires.'
        : 'GO possible sous réserve de suivi opérationnel normal.',
  };
}

export function formatRiskStatus(status) {
  if (status === 'NO_GO') return 'NO-GO';
  if (status === 'GO_WITH_CONDITIONS') return 'GO sous conditions';
  return 'GO';
}
