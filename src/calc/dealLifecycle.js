// dealLifecycle.js — Moteur pur du cycle de vie d'un deal : étapes, checklist
// « bon deal », échéancier, alertes datées et verdict global. Sans React.
//
// Un « bon deal » couvre 6 dimensions : capture, pricing validé, couvertures
// (prix + FX), logistique, risque & conformité, résultat (P&L). La checklist
// lit les sous-objets déjà persistés par les modules (deal.pricing, .hedging,
// .fxHedge, .freight, .riskMatrix, .pricingValidation, .lcCheck, .pnl, .lots).

import { SANCTIONED_COUNTRIES } from '../constants.js';
import { analyzeDeal } from './optimizerCalc.js';
import { dealLegPrice } from './positionCalc.js';

const num = (v, f = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : f;
};

// ─── Étapes de vie ───────────────────────────────────────────────────────────
export const DEAL_STAGES = [
  { key: 'open',       label: 'Ouvert' },
  { key: 'contracted', label: 'Contractualisé' },
  { key: 'financed',   label: 'Financé' },
  { key: 'loaded',     label: 'Chargé' },
  { key: 'discharged', label: 'Déchargé' },
  { key: 'closed',     label: 'Soldé' },
];

export function stageIndex(status) {
  const i = DEAL_STAGES.findIndex(s => s.key === (status || 'open'));
  return i >= 0 ? i : 0;
}

// ─── Dates ───────────────────────────────────────────────────────────────────
function addDays(iso, days) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  d.setDate(d.getDate() + num(days));
  return d.toISOString().slice(0, 10);
}

// Estimation de la date de paiement à partir des conditions et de la base BL/laycan.
export function estimatePaymentDate(deal) {
  const base = deal.blDate || deal.laycanTo || deal.laycanFrom;
  const term = String(deal.paymentTerm || '');
  if (!base || !term) return null;
  const t = term.toLowerCase();
  if (t.includes('prépaiement') || t.includes('prepaiement')) {
    return { date: deal.laycanFrom || base, label: 'Prépaiement (avant chargement)', estimated: true };
  }
  const m = t.match(/(\d+)/);
  const days = t.includes('sight') ? 5 : m ? Number(m[1]) : 30;
  return { date: addDays(base, days), label: `Paiement attendu (${term})`, estimated: true };
}

// ─── Checklist « bon deal » ──────────────────────────────────────────────────
// États : ok | warn | missing | bad | na. tab = module cible ('edit' = formulaire deal).
export const CHECK_GROUPS = {
  capture:   'Capture & identité',
  pricing:   'Pricing & validation',
  hedge:     'Couvertures',
  logistics: 'Logistique',
  risk:      'Risque & conformité',
  result:    'Résultat',
};

export function buildChecklist(deal) {
  const items = [];
  const push = (group, key, label, state, detail = '', tab = null) =>
    items.push({ group, key, label, state, detail, tab });

  const isSell   = deal.dealType === 'sell';
  const leg      = dealLegPrice(deal);
  const country  = (deal.counterpartyCountry || '').toLowerCase();
  const sanctioned = !!country && SANCTIONED_COUNTRIES.some(s => country.includes(s));
  const stage    = stageIndex(deal.status);

  // ── Capture & identité
  push('capture', 'counterparty', 'Contrepartie',
    deal.counterparty ? 'ok' : 'missing',
    deal.counterparty ? `${deal.counterparty} (${deal.counterpartyTier || 'tier ?'})` : 'À renseigner', 'edit');
  push('capture', 'country', 'Pays contrepartie',
    deal.counterpartyCountry ? (sanctioned ? 'bad' : 'ok') : 'warn',
    sanctioned ? `${deal.counterpartyCountry} — juridiction potentiellement sous sanctions` :
      (deal.counterpartyCountry || 'Requis pour le filtre sanctions'), 'edit');
  push('capture', 'quantity', 'Quantité',
    num(deal.quantity) > 0 ? 'ok' : 'missing',
    num(deal.quantity) > 0 ? `${deal.quantity} MT (±${deal.tolerance || 0} %) — ${deal.incoterm || '?'}` : 'À renseigner', 'edit');
  const laycanOk = deal.laycanFrom && deal.laycanTo && deal.laycanFrom <= deal.laycanTo;
  push('capture', 'laycan', 'Laycan',
    laycanOk ? 'ok' : (deal.laycanFrom || deal.laycanTo) ? 'bad' : 'missing',
    laycanOk ? `${deal.laycanFrom} → ${deal.laycanTo}` : 'Dates absentes ou inversées', 'edit');
  push('capture', 'bl', 'Date B/L',
    deal.blDate ? 'ok' : 'warn',
    deal.blDate || 'Nécessaire pour le pricing MOP et l\'échéance de paiement', 'edit');
  push('capture', 'vessel', 'Navire',
    deal.vessel ? 'ok' : 'warn', deal.vessel || 'Classe de navire à préciser', 'edit');

  // ── Pricing & validation
  push('pricing', 'legPrice', isSell ? 'Prix de vente' : 'Prix d\'achat',
    leg > 0 ? 'ok' : 'missing',
    leg > 0 ? `${leg.toFixed(2)} $/MT (${deal.priceSource || 'Platts'} ${deal.priceMarker || ''})` : 'À fixer — module Pricing ou MOP', 'pricing');
  push('pricing', 'differential', 'Différentiel / prime',
    deal.differential !== '' && deal.differential != null ? 'ok' : 'warn',
    deal.differential !== '' && deal.differential != null ? `${Number(deal.differential) >= 0 ? '+' : ''}${deal.differential} $/MT` : 'Prime/décote non renseignée', 'pricing');
  const pv = deal.pricingValidation;
  const pvStatus = pv?.verdict?.status;
  push('pricing', 'fxValidation', 'Validation pricing & FX (GO/NO-GO)',
    pv ? (pvStatus === 'GO' ? 'ok' : pvStatus === 'GO_WITH_CONDITIONS' ? 'warn' : 'bad') : 'missing',
    pv
      ? `${pvStatus}${pv.economics?.netMarginForward != null ? ` — marge fwd ${Math.round(pv.economics.netMarginForward).toLocaleString('fr-FR')} ${pv.marginCurrency || 'USD'}` : ''}`
      : 'GO/NO-GO non établi', 'fx-pricing');

  // ── Couvertures
  const h = deal.hedging;
  const targetRatio = num(deal.hedgeRatio);
  if (targetRatio === 0 && !h) {
    push('hedge', 'hedge', 'Hedge prix (futures)', 'na',
      'Ratio cible 0 % — pas de couverture voulue sur ce deal', 'hedging');
  } else {
    push('hedge', 'hedge', 'Hedge prix (futures)',
      h?.validated ? (h.basisRisk ? 'warn' : 'ok') : (stage >= 1 && stage < 5 ? 'missing' : 'warn'),
      h?.validated
        ? `${h.validatedLots} lot(s) ${String(h.contractName || '').split('—')[0].trim()}${h.basisRisk ? ' — ⚠ basis risk' : ''}${h.pnlResult != null ? ` — P&L ${Math.round(h.pnlResult).toLocaleString('fr-FR')} $` : ''}`
        : stage >= 1 ? 'Deal contractualisé sans hedge validé' : 'À préparer avant signature', 'hedging');
  }
  const fxExpected = (pv && (pv.saleCurrency !== 'USD' || pv.purchaseCurrency !== 'USD' || pv.marginCurrency !== 'USD'))
    || /xof|cfa/i.test(`${deal.paymentTerm || ''} ${deal.notes || ''}`);
  push('hedge', 'fxHedge', 'Couverture FX',
    deal.fxHedge?.validated ? 'ok' : fxExpected ? 'warn' : 'na',
    deal.fxHedge?.validated
      ? `${deal.fxHedge.instrument} ${deal.fxHedge.ccyFor}/${deal.fxHedge.ccyDom} — échéance ${deal.fxHedge.dateEch || '?'}`
      : fxExpected ? 'Exposition devise détectée — couvrir via Couverture FX' : 'Pas d\'exposition devise détectée', 'fx-forward');

  // ── Logistique
  push('logistics', 'freight', 'Fret',
    deal.freight?.totalFreight ? 'ok' : 'warn',
    deal.freight?.totalFreight
      ? `${Math.round(deal.freight.totalFreight).toLocaleString('fr-FR')} $ (${(deal.freight.freightPerMT ?? (deal.freight.totalFreight / Math.max(1, num(deal.quantity)))).toFixed(2)} $/MT)`
      : 'Fret non calculé — impacte directement la marge', 'freight');
  push('logistics', 'lots', 'Lots / cargaisons',
    deal.lots?.length ? 'ok' : 'na',
    deal.lots?.length
      ? `${deal.lots.length} lot(s), ${deal.lots.filter(l => l.status === 'priced' || l.status === 'discharged').length} pricé(s)`
      : 'Optionnel — pour les contrats multi-cargaisons', 'lots');
  push('logistics', 'inspector', 'Inspecteur',
    deal.inspector ? 'ok' : 'warn', deal.inspector || 'SGS / Intertek / BV à nommer', 'edit');

  // ── Risque & conformité
  const rm = deal.riskMatrix;
  push('risk', 'riskMatrix', 'Matrice des risques',
    rm ? (rm.status === 'NO_GO' ? 'bad' : rm.status === 'GO_WITH_CONDITIONS' ? 'warn' : 'ok') : 'missing',
    rm ? `Score ${rm.totalScore} — ${rm.level}` : 'Analyse de risque non enregistrée', 'risk');
  const securePay = /lc|sblc|prépaiement|prepaiement/i.test(deal.paymentTerm || '');
  push('risk', 'payment', 'Conditions de paiement',
    deal.paymentTerm ? (securePay ? 'ok' : 'warn') : 'missing',
    deal.paymentTerm || 'À définir', 'lc');
  const isLC = /lc|sblc/i.test(deal.paymentTerm || '');
  const lcCheck = deal.lcCheck;
  push('risk', 'lc', 'LC vérifiée (MT700)',
    lcCheck ? (lcCheck.done >= lcCheck.total ? 'ok' : 'warn') : isLC ? 'warn' : 'na',
    lcCheck ? `${lcCheck.done}/${lcCheck.total} champs contrôlés` : isLC ? 'Checklist MT700 à passer' : 'Pas de LC sur ce deal', 'lc');
  if (isLC) {
    push('risk', 'bank', 'Banque émettrice',
      ['BB', 'lower'].includes(deal.bankRating) ? 'bad' : deal.bankRating ? 'ok' : 'warn',
      deal.bankRating
        ? (['BB', 'lower'].includes(deal.bankRating) ? `Rating ${deal.bankRating} — faire confirmer la LC` : `Rating ${deal.bankRating}`)
        : 'Rating banque non renseigné', 'edit');
  }

  // ── Résultat
  push('result', 'pnl', 'P&L validé (3 niveaux)',
    deal.pnl ? (num(deal.pnl.pnl3) >= 0 ? 'ok' : 'bad') : 'missing',
    deal.pnl
      ? `Marge nette ${Math.round(deal.pnl.pnl3).toLocaleString('fr-FR')} $ (${(deal.pnl.pnl3PerMT ?? 0).toFixed(2)} $/MT)`
      : 'P&L 3 niveaux non validé', 'pnl');

  const scored = items.filter(i => i.state !== 'na');
  const points = scored.reduce((s, i) => s + (i.state === 'ok' ? 1 : i.state === 'warn' ? 0.5 : 0), 0);
  const score  = scored.length ? Math.round((points / scored.length) * 100) : 0;
  const counts = {
    ok:      items.filter(i => i.state === 'ok').length,
    warn:    items.filter(i => i.state === 'warn').length,
    missing: items.filter(i => i.state === 'missing').length,
    bad:     items.filter(i => i.state === 'bad').length,
  };
  return { items, score, counts };
}

// ─── Échéancier du deal ──────────────────────────────────────────────────────
export function dealTimeline(deal) {
  const ev = [];
  if (deal.createdAt)  ev.push({ date: deal.createdAt, label: 'Création du deal', kind: 'creation' });
  if (deal.laycanFrom) ev.push({ date: deal.laycanFrom, label: 'Début laycan', kind: 'laycan' });
  if (deal.laycanTo && deal.laycanTo !== deal.laycanFrom)
    ev.push({ date: deal.laycanTo, label: 'Fin laycan / livraison', kind: 'laycan' });
  if (deal.blDate) ev.push({ date: deal.blDate, label: 'Bill of Lading', kind: 'bl' });
  if (deal.hedging?.maturity) ev.push({ date: deal.hedging.maturity, label: 'Échéance hedge futures', kind: 'hedge' });
  if (deal.fxHedge?.dateEch)  ev.push({ date: deal.fxHedge.dateEch, label: 'Échéance couverture FX', kind: 'fx' });
  const pay = estimatePaymentDate(deal);
  if (pay?.date) ev.push({ date: pay.date, label: pay.label, kind: 'payment', estimated: true });
  return ev.filter(e => e.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// ─── Alertes datées + contrôles Optimizer ────────────────────────────────────
const AREA_TAB = {
  Pricing: 'pricing', Hedging: 'hedging', Sanctions: 'risk',
  'Risque crédit': 'risk', 'Risque bancaire': 'lc',
  Logistique: 'edit', 'Quantité': 'edit',
};

export function dealAlerts(deal, todayISO) {
  if (deal.status === 'closed') return [];
  const today = todayISO || new Date().toISOString().slice(0, 10);
  const stage = stageIndex(deal.status);
  const inDays = (d) => Math.round((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);

  const alerts = (analyzeDeal(deal) || [])
    .filter(i => i.level === 'high' || i.level === 'med')
    .map(i => ({ level: i.level, title: i.title, detail: i.action, tab: AREA_TAB[i.area] || null }));

  if (deal.laycanFrom && stage === 0) {
    const dd = inDays(deal.laycanFrom);
    if (dd >= 0 && dd <= 7) alerts.unshift({
      level: 'high', title: `Laycan dans ${dd} j — deal non contractualisé`,
      detail: 'Finaliser le contrat ou repousser le laycan.', tab: 'edit',
    });
  }
  if (deal.laycanTo && deal.laycanTo < today && stage < 3) alerts.push({
    level: 'med', title: 'Laycan dépassé — statut à mettre à jour',
    detail: `Fin laycan ${deal.laycanTo}. Passer le statut à Chargé/Déchargé si la cargaison a bougé.`, tab: null,
  });
  const pay = estimatePaymentDate(deal);
  if (pay?.date && pay.date < today && stage < 5) alerts.push({
    level: 'high', title: 'Paiement attendu dépassé',
    detail: `Échéance estimée ${pay.date} (${deal.paymentTerm}). Vérifier l'encaissement.`, tab: 'pnl',
  });
  if (deal.hedging?.maturity && deal.hedging.maturity < today && !deal.hedging.exitPrice) alerts.push({
    level: 'med', title: 'Hedge échu sans prix de sortie',
    detail: 'Renseigner le prix de sortie dans Hedging pour figer le résultat de couverture.', tab: 'hedging',
  });
  return alerts;
}

// ─── Verdict global ──────────────────────────────────────────────────────────
export function dealVerdict(checklist, alerts) {
  const bads = checklist.items.filter(i => i.state === 'bad');
  if (bads.length) {
    return { status: 'NO_GO', reasons: bads.map(b => `${b.label} : ${b.detail}`) };
  }
  if (checklist.score < 45) {
    return { status: 'INCOMPLETE', reasons: ['Dossier incomplet — compléter la checklist avant décision'] };
  }
  const opens = checklist.items.filter(i => i.state === 'warn' || i.state === 'missing');
  const highs = alerts.filter(a => a.level === 'high');
  if (highs.length || opens.length) {
    return {
      status: 'GO_WITH_CONDITIONS',
      reasons: [...highs.map(a => a.title), ...opens.slice(0, 5).map(i => `${i.label} — ${i.detail}`)],
    };
  }
  return { status: 'GO', reasons: ['Tous les contrôles au vert'] };
}

// ─── Agrégations portefeuille (Dashboard) ────────────────────────────────────
export function collectUpcomingEvents(deals = [], { days = 30, todayISO } = {}) {
  const today = todayISO || new Date().toISOString().slice(0, 10);
  const limit = addDays(today, days);
  const out = [];
  for (const d of deals) {
    if (d.status === 'closed') continue;
    for (const e of dealTimeline(d)) {
      if (e.kind === 'creation') continue;
      if (e.date >= today && e.date <= limit) {
        out.push({ ...e, dealId: d.id, counterparty: d.counterparty || '—' });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function collectPortfolioAlerts(deals = [], { max = 8, todayISO } = {}) {
  const out = [];
  for (const d of deals) {
    if (d.status === 'closed') continue;
    for (const a of dealAlerts(d, todayISO)) {
      out.push({ ...a, dealId: d.id, counterparty: d.counterparty || '—' });
    }
  }
  const rank = { high: 0, med: 1, low: 2 };
  return out.sort((a, b) => (rank[a.level] ?? 3) - (rank[b.level] ?? 3)).slice(0, max);
}
