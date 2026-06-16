// =============================================================================
// goNoGoCalc.js — Synthèse GO / NO-GO d'un deal.
// Agrège les données DÉJÀ saisies dans les autres modules (pricing, fret,
// hedging, P&L, couverture FX, risques, paiement) et rend un verdict.
// Le SEUL paramètre manuel est le seuil minimum de marge ($/MT).
// Aucune dépendance React.
// =============================================================================

import { assessDealRisks } from './dealRiskEngine.js';

function n(v) { return Number(v) || 0; }
function hasText(v) { return String(v ?? '').trim().length > 0; }

const PAYMENT_SECURED_RE = /(lc|sblc|stand[- ]?by|prépaiement|prepaid|prepayment|escrow|garantie|aval|cad|cash against)/i;

/**
 * Construit la synthèse GO / NO-GO d'un deal.
 * @param {object} deal               — le deal complet (avec pnl, freight, hedging, fxHedge, pricing…)
 * @param {number} minMarginPerMT     — seuil minimum de marge nette en $/MT (saisi manuellement)
 * @returns {object} { status, label, marginPerMT, netPnL, threshold, checks, blockers, risk }
 */
export function computeGoNoGo(deal = {}, minMarginPerMT = 5) {
  const threshold = n(minMarginPerMT);
  const qty = n(deal.quantity);

  // ── Marge nette : issue du module P&L (3e niveau = net) ───────────────
  const pnl = deal.pnl || null;
  const hasPnL = !!pnl;
  const netPnL = hasPnL ? n(pnl.pnl3) : null;
  const marginPerMT = hasPnL
    ? (pnl.pnl3PerMT != null ? n(pnl.pnl3PerMT) : (qty > 0 ? netPnL / qty : 0))
    : null;

  // ── Complétude des modules amont ──────────────────────────────────────
  const hasPricing  = hasText(deal.pricing?.finalPrice) || hasText(deal.estimatedPrice);
  const hasFreight  = n(deal.freight?.totalFreight) > 0;
  const hasHedge    = deal.hedging != null || deal.hedgeRatio != null;
  const hedgeRatio  = n(deal.hedging?.hedgeRatio ?? deal.hedgeRatio);
  const hasFxHedge  = deal.fxHedge != null;
  const paymentSecured = PAYMENT_SECURED_RE.test(deal.paymentTerm || '');

  // ── Moteur de risques (réutilisé tel quel) ────────────────────────────
  const risk = assessDealRisks(deal);

  // ── Checklist de synthèse ─────────────────────────────────────────────
  // status : 'ok' | 'warn' | 'fail'
  const checks = [
    {
      key: 'pnl',
      label: 'P&L calculé',
      status: hasPnL ? (netPnL >= 0 ? 'ok' : 'fail') : 'fail',
      detail: hasPnL
        ? `Marge nette ${marginPerMT.toFixed(2)} $/MT`
        : 'Aucun P&L sauvegardé — ouvrir le module P&L',
    },
    {
      key: 'margin',
      label: `Marge ≥ seuil (${threshold} $/MT)`,
      status: !hasPnL ? 'warn' : (marginPerMT >= threshold ? 'ok' : 'fail'),
      detail: !hasPnL
        ? 'En attente du P&L'
        : (marginPerMT >= threshold
            ? `${marginPerMT.toFixed(2)} $/MT au-dessus du seuil`
            : `${marginPerMT.toFixed(2)} $/MT sous le seuil de ${threshold} $/MT`),
    },
    {
      key: 'pricing',
      label: 'Pricing renseigné',
      status: hasPricing ? 'ok' : 'warn',
      detail: hasPricing ? 'Prix physique défini' : 'Prix non renseigné (module Pricing)',
    },
    {
      key: 'freight',
      label: 'Fret calculé',
      status: hasFreight ? 'ok' : 'warn',
      detail: hasFreight ? `${Math.round(n(deal.freight.totalFreight)).toLocaleString()} $` : 'Fret non calculé (module Fret WS)',
    },
    {
      key: 'hedge',
      label: 'Couverture commodity',
      status: hasHedge ? (hedgeRatio > 0 ? 'ok' : 'warn') : 'warn',
      detail: hasHedge ? `Ratio de couverture ${hedgeRatio}%` : 'Hedging non défini (module Hedging)',
    },
    {
      key: 'fx',
      label: 'Couverture FX',
      status: hasFxHedge ? 'ok' : 'warn',
      detail: hasFxHedge ? 'Forward FX sauvegardé' : 'Pas de couverture FX (module Couverture FX)',
    },
    {
      key: 'payment',
      label: 'Paiement sécurisé',
      status: paymentSecured ? 'ok' : 'fail',
      detail: paymentSecured ? deal.paymentTerm : 'Pas de LC / SBLC / prépaiement / garantie',
    },
    {
      key: 'risk',
      label: 'Profil de risque',
      status: risk.status === 'NO_GO' ? 'fail' : risk.status === 'GO_WITH_CONDITIONS' ? 'warn' : 'ok',
      detail: `${risk.summary} (score ${risk.totalScore})`,
    },
  ];

  // ── Verdict global ────────────────────────────────────────────────────
  const fails = checks.filter(c => c.status === 'fail');
  const warns = checks.filter(c => c.status === 'warn');

  const blockers = [];
  if (hasPnL && netPnL < 0) blockers.push('Marge nette négative.');
  if (hasPnL && marginPerMT < threshold) blockers.push(`Marge (${marginPerMT.toFixed(2)} $/MT) sous le seuil minimum (${threshold} $/MT).`);
  if (!paymentSecured) blockers.push('Paiement non sécurisé (ni LC, ni SBLC, ni prépaiement, ni garantie).');
  if (risk.status === 'NO_GO') blockers.push('Risques critiques non couverts.');
  risk.blockers?.forEach(b => blockers.push(b));

  let status;
  if (!hasPnL) {
    status = 'GO_WITH_CONDITIONS'; // données incomplètes : impossible de trancher GO
  } else if ((hasPnL && netPnL < 0) || risk.status === 'NO_GO') {
    status = 'NO_GO';
  } else if (fails.length > 0 || warns.length > 0 || risk.status === 'GO_WITH_CONDITIONS') {
    status = 'GO_WITH_CONDITIONS';
  } else {
    status = 'GO';
  }

  const label = status === 'GO' ? 'GO'
    : status === 'GO_WITH_CONDITIONS' ? 'GO sous conditions'
    : 'NO-GO';

  return {
    status,
    label,
    threshold,
    marginPerMT,
    netPnL,
    hasPnL,
    checks,
    blockers,
    risk,
    summary: status === 'GO'
      ? 'Tous les voyants sont au vert. Deal validable.'
      : status === 'NO_GO'
        ? 'Deal non validable en l’état.'
        : hasPnL
          ? 'Deal réalisable sous réserve de lever les points en attente.'
          : 'Synthèse incomplète : calculer et sauvegarder le P&L pour trancher.',
  };
}
