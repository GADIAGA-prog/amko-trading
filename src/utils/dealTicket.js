// dealTicket.js — Génération du deal ticket imprimable (dossier complet du deal).
// Reprend le pattern d'impression de Documents.jsx (window.open + print).

import { PRODUCTS } from '../constants.js';
import { buildChecklist, dealVerdict, dealAlerts, DEAL_STAGES } from '../calc/dealLifecycle.js';

const nf = (v, d = 2) => {
  const x = Number(v);
  return Number.isFinite(x) ? x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
};
const usd = (v, d = 0) => (Number.isFinite(Number(v)) ? `${nf(v, d)} $` : '—');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const or  = (v, fallback = '—') => (v === undefined || v === null || v === '' ? fallback : esc(v));

const VERDICT_FR = {
  GO: 'GO', GO_WITH_CONDITIONS: 'GO SOUS CONDITIONS', NO_GO: 'NO-GO', INCOMPLETE: 'DOSSIER INCOMPLET',
};
const VERDICT_COLOR = {
  GO: '#059669', GO_WITH_CONDITIONS: '#d97706', NO_GO: '#dc2626', INCOMPLETE: '#64748b',
};

function row(label, value) {
  return `<tr><td class="lbl">${label}</td><td>${value}</td></tr>`;
}

export function printDealTicket(deal) {
  if (!deal) return;
  const checklist = buildChecklist(deal);
  const alerts    = dealAlerts(deal);
  const verdict   = dealVerdict(checklist, alerts);
  const product   = PRODUCTS[deal.product]?.name || deal.plattsDescription || deal.product;
  const stage     = DEAL_STAGES.find(s => s.key === (deal.status || 'open'))?.label || deal.status;
  const h  = deal.hedging;
  const fx = deal.fxHedge;
  const pv = deal.pricingValidation;
  const rm = deal.riskMatrix;
  const buy  = deal.purchasePrice ?? (deal.dealType === 'buy'  ? deal.estimatedPrice : '');
  const sell = deal.salePrice     ?? (deal.dealType === 'sell' ? deal.estimatedPrice : '');

  const lotsRows = (deal.lots || []).map(l => {
    const fp = (Number(l.plattsPrice) || 0) + (Number(l.differential) || 0);
    return `<tr><td>${esc(l.name)}</td><td class="num">${nf(l.qty, 0)}</td><td>${esc(l.port)}</td>
      <td class="num">${fp ? nf(fp, 2) : '—'}</td><td>${esc(l.status)}</td></tr>`;
  }).join('');

  const checklistRows = checklist.items
    .filter(i => i.state !== 'na')
    .map(i => {
      const mark = i.state === 'ok' ? '✔' : i.state === 'warn' ? '⚠' : i.state === 'bad' ? '✘' : '○';
      const color = i.state === 'ok' ? '#059669' : i.state === 'warn' ? '#d97706' : i.state === 'bad' ? '#dc2626' : '#94a3b8';
      return `<tr><td style="color:${color};font-weight:bold;text-align:center;width:24px">${mark}</td>
        <td class="lbl">${esc(i.label)}</td><td>${esc(i.detail)}</td></tr>`;
    }).join('');

  const alertRows = alerts.map(a =>
    `<li><b>[${a.level === 'high' ? 'HAUTE' : 'MOY'}]</b> ${esc(a.title)} — ${esc(a.detail)}</li>`
  ).join('');

  const html = `
<h1>DEAL TICKET — ${esc(deal.id)}</h1>
<div class="meta">
  <span><b>${deal.dealType === 'buy' ? 'ACHAT' : 'VENTE'}</b> — ${esc(product)} — ${nf(deal.quantity, 0)} MT</span>
  <span class="verdict" style="background:${VERDICT_COLOR[verdict.status]}">${VERDICT_FR[verdict.status]}</span>
</div>

<h2>1. Identité & contrat</h2>
<table>
  ${row('Contrepartie', `${or(deal.counterparty)} (${or(deal.counterpartyTier, 'tier ?')} — ${or(deal.counterpartyCountry, 'pays ?')})`)}
  ${row('Produit / quantité', `${esc(product)} — ${nf(deal.quantity, 0)} MT ± ${or(deal.tolerance, '0')} %`)}
  ${row('Incoterm / route', `${or(deal.incoterm)} ${or(deal.loadPort, '')} → ${or(deal.dischargePort, '')}`)}
  ${row('Laycan / B/L', `${or(deal.laycanFrom)} → ${or(deal.laycanTo)} — B/L : ${or(deal.blDate)}`)}
  ${row('Navire / inspecteur', `${or(deal.vessel)} / ${or(deal.inspector)}`)}
  ${row('Statut', `${esc(stage)} — créé le ${or(deal.createdAt)}`)}
</table>

<h2>2. Pricing</h2>
<table>
  ${row('Source / marker', `${or(deal.priceSource)} — ${or(deal.priceMarker)}`)}
  ${row('Différentiel / prime', deal.differential !== '' && deal.differential != null ? `${Number(deal.differential) >= 0 ? '+' : ''}${nf(deal.differential, 2)} $/MT` : '—')}
  ${row("Prix d'achat", buy ? `${nf(buy, 2)} $/MT` : '—')}
  ${row('Prix de vente', sell ? `${nf(sell, 2)} $/MT` : '—')}
  ${pv ? row('Validation FX pricing', `${esc(pv.verdict?.status)} — marge nette fwd : ${pv.economics?.netMarginForward != null ? nf(pv.economics.netMarginForward, 0) + ' ' + esc(pv.marginCurrency || 'USD') : '—'}`) : row('Validation FX pricing', 'Non validée')}
</table>

<h2>3. Couvertures</h2>
<table>
  ${h?.validated ? `
    ${row('Hedge futures', `${esc(h.actionLabel || h.direction)} — ${h.validatedLots} lot(s) ${esc(String(h.contractName || '').split('—')[0])}`)}
    ${row('Prix entrée / sortie', `${h.entryPrice != null ? nf(h.entryPrice, 2) : '—'} / ${h.exitPrice != null ? nf(h.exitPrice, 2) : '—'} $/${esc(h.contractUnit || 'bbl')} — roll cumulé : ${usd(h.rollTotal)}`)}
    ${row('Résultat hedge', `${h.pnlResult >= 0 ? '+' : ''}${usd(h.pnlResult)}${h.basisRisk ? ' — ⚠ BASIS RISK' : ''}`)}
    ${row('Échéance / broker', `${or(h.maturity)} — ${or(h.bankBroker)}`)}
  ` : row('Hedge futures', 'Non validé')}
  ${fx?.validated ? `
    ${row('Couverture FX', `${esc(fx.instrument)} ${esc(fx.ccyFor)}/${esc(fx.ccyDom)} — notionnel ${nf(fx.notional, 0)} ${esc(fx.ccyFor)}`)}
    ${row('Taux / échéance FX', `spot ${nf(fx.spotRate, 4)} — forward client ${fx.forwardRate ? nf(fx.forwardRate, 4) : '—'} — échéance ${or(fx.dateEch)}`)}
    ${row('Résultat FX (P&L 3)', `${fx.fxResult >= 0 ? '+' : ''}${usd(fx.fxResult)}`)}
  ` : row('Couverture FX', 'Non enregistrée')}
</table>

<h2>4. Logistique & coûts</h2>
<table>
  ${row('Fret', deal.freight?.totalFreight ? `${usd(deal.freight.totalFreight)} (${nf(deal.freight.freightPerMT ?? (deal.freight.totalFreight / Math.max(1, Number(deal.quantity) || 1)), 2)} $/MT — mode ${esc(deal.freight.mode || 'ws')})` : 'Non calculé')}
  ${row('Paiement', `${or(deal.paymentTerm)} — banque : ${or(deal.bankRating)}`)}
  ${row('LC vérifiée (MT700)', deal.lcCheck ? `${deal.lcCheck.done}/${deal.lcCheck.total} champs contrôlés` : '—')}
  ${row('Matrice des risques', rm ? `Score ${rm.totalScore} — ${esc(rm.level)} — ${esc(rm.status)}` : 'Non enregistrée')}
</table>
${lotsRows ? `
<h3>Lots / cargaisons</h3>
<table class="grid">
  <tr><th>Lot</th><th>Qté (MT)</th><th>Port</th><th>Prix final $/MT</th><th>Statut</th></tr>
  ${lotsRows}
</table>` : ''}

<h2>5. P&amp;L — 3 niveaux</h2>
${deal.pnl ? `
<table class="grid">
  <tr><th></th><th>Montant</th><th>$/MT</th></tr>
  <tr><td>P&amp;L 1 — Marge brute</td><td class="num">${usd(deal.pnl.pnl1)}</td><td class="num">${nf(deal.pnl.pnl1PerMT, 2)}</td></tr>
  <tr><td>P&amp;L 2 — Après financement (${esc(deal.pnl.financingInstrument || 'financement')})</td><td class="num">${usd(deal.pnl.pnl2)}</td><td class="num">${nf(deal.pnl.pnl2PerMT, 2)}</td></tr>
  <tr class="total"><td>P&amp;L 3 — Marge nette (hedge + FX)</td><td class="num">${usd(deal.pnl.pnl3)}</td><td class="num">${nf(deal.pnl.pnl3PerMT, 2)}</td></tr>
</table>` : '<p class="empty">P&L non validé dans le module P&L.</p>'}

<h2>6. Checklist « bon deal » — ${checklist.score} % complet</h2>
<table class="grid checklist">${checklistRows}</table>

${alerts.length ? `<h2>7. Alertes actives</h2><ul>${alertRows}</ul>` : ''}

${deal.notes ? `<h2>Notes</h2><p class="notes">${esc(deal.notes)}</p>` : ''}

<div class="verdict-box" style="border-color:${VERDICT_COLOR[verdict.status]}">
  <b style="color:${VERDICT_COLOR[verdict.status]}">DÉCISION : ${VERDICT_FR[verdict.status]}</b>
  ${verdict.reasons?.length ? `<ul>${verdict.reasons.slice(0, 6).map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
</div>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert("Le navigateur a bloqué la fenêtre d'impression. Autorisez les popups pour ce site."); return; }
  win.document.write(`<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<title>Deal Ticket ${esc(deal.id)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; margin: 1.6cm 1.8cm; color: #0f172a; line-height: 1.45; }
  h1 { font-size: 14pt; letter-spacing: 1px; border-bottom: 3px solid #1d4ed8; padding-bottom: 6px; margin: 0 0 8px; }
  h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #1d4ed8; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin: 16px 0 6px; }
  h3 { font-size: 9.5pt; margin: 10px 0 4px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 3px 6px; vertical-align: top; }
  td.lbl { width: 220px; color: #475569; font-weight: 600; }
  table.grid td, table.grid th { border: 1px solid #cbd5e1; }
  table.grid th { background: #f1f5f9; text-align: left; font-size: 8.5pt; text-transform: uppercase; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { font-weight: bold; background: #f0fdf4; }
  .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .verdict { color: #fff; font-weight: bold; padding: 4px 14px; border-radius: 4px; font-size: 10pt; }
  .verdict-box { border: 2px solid; border-radius: 6px; padding: 10px 14px; margin-top: 18px; }
  .verdict-box ul { margin: 6px 0 0; padding-left: 18px; }
  .notes { white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; }
  .empty { color: #94a3b8; font-style: italic; }
  ul { margin: 4px 0; padding-left: 18px; }
  @media print { body { margin: 1cm 1.2cm; } h2 { page-break-after: avoid; } table { page-break-inside: avoid; } }
</style>
</head><body>${html}
<div style="text-align:center;margin-top:24px;font-size:7.5pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:5px;">
  Deal ticket généré par AMKO TRADING Platform — ${new Date().toLocaleString('fr-FR')}
</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`);
  win.document.close();
}
