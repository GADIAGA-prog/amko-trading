import React, { useEffect, useMemo, useState } from 'react';
import {
  Gauge, CheckCircle2, AlertTriangle, XCircle, Circle, Minus, Pencil,
  CalendarClock, BellRing, Wallet, ArrowRight, ChevronRight,
} from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Stat, Select, Button } from '../components/UI.jsx';
import {
  DEAL_STAGES, stageIndex, buildChecklist, CHECK_GROUPS,
  dealTimeline, dealAlerts, dealVerdict,
} from '../calc/dealLifecycle.js';
import { analyzeDealPosition } from '../calc/positionCalc.js';

// ─── Styles d'état de checklist ───────────────────────────────────────────────
const STATE_UI = {
  ok:      { Icon: CheckCircle2,  cls: 'text-emerald-600 dark:text-emerald-400' },
  warn:    { Icon: AlertTriangle, cls: 'text-amber-500 dark:text-amber-400' },
  missing: { Icon: Circle,        cls: 'text-slate-300 dark:text-slate-600' },
  bad:     { Icon: XCircle,       cls: 'text-red-600 dark:text-red-400' },
  na:      { Icon: Minus,         cls: 'text-slate-300 dark:text-slate-600' },
};

const VERDICT_UI = {
  GO:                 { label: 'GO',                cls: 'bg-emerald-600 text-white' },
  GO_WITH_CONDITIONS: { label: 'GO sous conditions', cls: 'bg-amber-500 text-white' },
  NO_GO:              { label: 'NO-GO',             cls: 'bg-red-600 text-white' },
  INCOMPLETE:         { label: 'Dossier incomplet',  cls: 'bg-slate-500 text-white' },
};

const KIND_LABEL = {
  laycan: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  bl: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  payment: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  hedge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  fx: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  creation: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export default function DealCockpit({
  deals = [], marketPrices = {}, initialDealId,
  onOpenModule, onEdit, onUpdateStatus, isViewer,
}) {
  const [selectedId, setSelectedId] = useState(initialDealId || deals[deals.length - 1]?.id || '');
  useEffect(() => {
    if (initialDealId && deals.some(d => d.id === initialDealId)) setSelectedId(initialDealId);
  }, [initialDealId]);

  const deal = deals.find(d => d.id === selectedId) || null;
  const today = new Date().toISOString().slice(0, 10);

  const checklist = useMemo(() => deal ? buildChecklist(deal) : null, [deal]);
  const alerts    = useMemo(() => deal ? dealAlerts(deal, today) : [], [deal, today]);
  const timeline  = useMemo(() => deal ? dealTimeline(deal) : [], [deal]);
  const verdict   = useMemo(() => checklist ? dealVerdict(checklist, alerts) : null, [checklist, alerts]);
  const position  = useMemo(() => deal ? analyzeDealPosition(deal, marketPrices, {}) : null, [deal, marketPrices]);

  const openItem = (item) => {
    if (!deal) return;
    if (item.tab === 'edit') { if (onEdit && !isViewer) onEdit(deal); return; }
    if (item.tab && onOpenModule) onOpenModule(item.tab, deal.id);
  };

  const nextEvent = timeline.find(e => e.date >= today && e.kind !== 'creation');
  const stage = deal ? stageIndex(deal.status) : 0;
  const vUI = verdict ? VERDICT_UI[verdict.status] : null;

  // Regrouper la checklist
  const grouped = useMemo(() => {
    if (!checklist) return [];
    return Object.entries(CHECK_GROUPS)
      .map(([key, label]) => ({ key, label, items: checklist.items.filter(i => i.group === key) }))
      .filter(g => g.items.length);
  }, [checklist]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Gauge className="w-6 h-6 text-blue-700 dark:text-blue-400" /> Cockpit du deal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Vue 360° — cycle de vie, checklist « bon deal », échéances, alertes et économie du deal
          </p>
        </div>
        {deal && onEdit && !isViewer && (
          <Button variant="outline" size="sm" icon={Pencil} onClick={() => onEdit(deal)}>
            Éditer le deal
          </Button>
        )}
      </div>

      {/* ── Sélecteur ──────────────────────────────────────────── */}
      <Card>
        <CardBody>
          <Select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">— Choisir un deal —</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {d.id} — {d.dealType === 'buy' ? 'Achat' : 'Vente'} — {PRODUCTS[d.product]?.name || d.product} — {d.counterparty || '?'} — {fmt(d.quantity, 0)} MT
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {!deal ? (
        <Card><CardBody>
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Gauge className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm">Sélectionnez un deal — ou créez-en un depuis « Nouveau deal ».</p>
          </div>
        </CardBody></Card>
      ) : (
        <>
          {/* ── Bandeau identité + verdict ─────────────────────── */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${deal.dealType === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {deal.dealType === 'buy' ? 'ACHAT' : 'VENTE'}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {PRODUCTS[deal.product]?.name || deal.plattsDescription || deal.product} — {fmt(deal.quantity, 0)} MT
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {deal.counterparty || 'Contrepartie ?'} • {deal.incoterm} {deal.loadPort ? `• ${deal.loadPort}` : ''}{deal.dischargePort ? ` → ${deal.dischargePort}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold">Statut</div>
                    <select
                      value={deal.status || 'open'}
                      disabled={isViewer || !onUpdateStatus}
                      onChange={e => onUpdateStatus && onUpdateStatus(deal.id, e.target.value)}
                      className="text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                      {DEAL_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  {vUI && (
                    <span className={`px-4 py-2 rounded-lg text-sm font-bold ${vUI.cls}`} title={verdict.reasons.join(' • ')}>
                      {vUI.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Pipeline de vie */}
              <div className="mt-5 flex items-center gap-1 overflow-x-auto pb-1">
                {DEAL_STAGES.map((s, i) => {
                  const done = i < stage, current = i === stage;
                  return (
                    <React.Fragment key={s.key}>
                      {i > 0 && <div className={`h-0.5 flex-1 min-w-3 ${i <= stage ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition
                          ${current ? 'bg-blue-700 border-blue-700 text-white shadow' :
                            done ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                            'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'}`}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span className={`text-[10px] font-medium whitespace-nowrap ${current ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {s.label}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Barre de complétude */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${checklist.score >= 75 ? 'bg-emerald-600' : checklist.score >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${checklist.score}%` }} />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {checklist.score} % complet — {checklist.counts.ok} ✓ / {checklist.counts.warn + checklist.counts.missing} à traiter{checklist.counts.bad ? ` / ${checklist.counts.bad} bloquant(s)` : ''}
                </span>
              </div>
            </CardBody>
          </Card>

          {/* ── KPIs ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Marge nette (P&L 3)"
              value={deal.pnl ? (
                <span className={deal.pnl.pnl3 >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                  {deal.pnl.pnl3 >= 0 ? '+' : ''}{fmtUSD(deal.pnl.pnl3, 0)}
                </span>
              ) : '—'}
              hint={deal.pnl ? `${fmt(deal.pnl.pnl3PerMT, 2)} $/MT` : 'P&L non validé'}
              accent={deal.pnl ? (deal.pnl.pnl3 >= 0 ? 'green' : 'red') : 'slate'} />
            <Stat label={position?.hasBooked ? 'Contribution book' : 'MtM latent'}
              value={position && position.contribution != null && (position.hasBooked || position.mtm != null)
                ? <span className={position.contribution >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                    {position.contribution >= 0 ? '+' : ''}{fmtUSD(position.contribution, 0)}
                  </span>
                : '—'}
              hint={position?.refPrice != null ? `Marché ${fmt(position.refPrice, 2)} $/MT (${position.refSource})` : 'Saisir un prix marché (Book de position)'}
              accent="slate" />
            <Stat label="Couverture"
              value={`${fmt(position?.coverPct ?? 0, 0)} %`}
              hint={deal.hedging?.validated ? `${deal.hedging.validatedLots} lot(s) validé(s)` : 'Hedge non validé'}
              accent={(position?.coverPct ?? 0) >= 80 ? 'green' : (position?.coverPct ?? 0) > 0 ? 'gold' : 'red'} />
            <Stat label="Prochaine échéance"
              value={nextEvent ? nextEvent.date : '—'}
              hint={nextEvent ? nextEvent.label : 'Aucune échéance à venir'}
              accent="blue" />
          </div>

          {/* ── Alertes ────────────────────────────────────────── */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader icon={BellRing} title={`Alertes (${alerts.length})`} />
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {alerts.map((a, i) => (
                    <div key={i} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${a.level === 'high' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                          {a.level === 'high' ? 'HAUTE' : 'MOY'}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{a.detail}</div>
                        </div>
                      </div>
                      {a.tab && (
                        <button onClick={() => openItem(a)}
                          className="text-xs text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5 flex-shrink-0">
                          Traiter <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* ── Checklist « bon deal » ────────────────────────── */}
            <Card>
              <CardHeader icon={CheckCircle2} title="Checklist du deal"
                subtitle="Chaque ligne lit ce que les modules ont réellement sauvegardé dans le deal" />
              <CardBody className="p-0">
                {grouped.map(g => (
                  <div key={g.key}>
                    <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/60 border-y border-slate-100 dark:border-slate-700 text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wide">
                      {g.label}
                    </div>
                    {g.items.map(item => {
                      const ui = STATE_UI[item.state] || STATE_UI.na;
                      const Icon = ui.Icon;
                      const actionable = item.tab && item.state !== 'na';
                      return (
                        <div key={item.key}
                          className={`px-5 py-2.5 flex items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-700/50 ${actionable ? 'hover:bg-slate-50 dark:hover:bg-slate-700/40' : ''}`}>
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ui.cls}`} />
                            <div className="min-w-0">
                              <div className={`text-sm font-medium ${item.state === 'na' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                {item.label}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.detail}</div>
                            </div>
                          </div>
                          {actionable && (
                            <button onClick={() => openItem(item)}
                              className="text-xs text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5 flex-shrink-0">
                              Ouvrir <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardBody>
            </Card>

            <div className="space-y-6">
              {/* ── Échéancier ──────────────────────────────────── */}
              <Card>
                <CardHeader icon={CalendarClock} title="Échéancier du deal"
                  subtitle="≈ : dates estimées (paiement dérivé des conditions et du B/L)" />
                <CardBody className="p-0">
                  {timeline.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">Aucune date renseignée.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {timeline.map((e, i) => {
                        const past = e.date < today, isToday = e.date === today;
                        return (
                          <div key={i} className={`px-5 py-2.5 flex items-center gap-3 ${past ? 'opacity-50' : ''} ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                            <span className={`font-mono text-xs font-semibold ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                              {e.date}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${KIND_LABEL[e.kind] || KIND_LABEL.creation}`}>
                              {e.kind.toUpperCase()}
                            </span>
                            <span className="text-sm text-slate-800 dark:text-slate-200">
                              {e.estimated ? '≈ ' : ''}{e.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* ── Économie du deal ────────────────────────────── */}
              <Card>
                <CardHeader icon={Wallet} title="Économie du deal" />
                <CardBody>
                  <div className="space-y-1.5 text-sm">
                    <EcoRow label="Prix d'achat" value={deal.purchasePrice ? `${fmt(Number(deal.purchasePrice), 2)} $/MT` : deal.dealType === 'buy' && deal.estimatedPrice ? `${fmt(Number(deal.estimatedPrice), 2)} $/MT` : '—'} />
                    <EcoRow label="Prix de vente" value={deal.salePrice ? `${fmt(Number(deal.salePrice), 2)} $/MT` : deal.dealType === 'sell' && deal.estimatedPrice ? `${fmt(Number(deal.estimatedPrice), 2)} $/MT` : '—'} />
                    <EcoRow label="Différentiel / prime" value={deal.differential !== '' && deal.differential != null ? `${Number(deal.differential) >= 0 ? '+' : ''}${fmt(Number(deal.differential), 2)} $/MT` : '—'} />
                    <EcoRow label="Fret" value={deal.freight?.totalFreight ? fmtUSD(deal.freight.totalFreight, 0) : '—'} />
                    <EcoRow label="Résultat hedge" value={deal.hedging?.pnlResult != null ? `${deal.hedging.pnlResult >= 0 ? '+' : ''}${fmtUSD(deal.hedging.pnlResult, 0)}` : '—'}
                      tone={deal.hedging?.pnlResult != null ? (deal.hedging.pnlResult >= 0 ? 'pos' : 'neg') : null} />
                    <EcoRow label="Résultat couverture FX" value={deal.fxHedge?.fxResult != null ? `${deal.fxHedge.fxResult >= 0 ? '+' : ''}${fmtUSD(deal.fxHedge.fxResult, 0)}` : '—'}
                      tone={deal.fxHedge?.fxResult != null ? (deal.fxHedge.fxResult >= 0 ? 'pos' : 'neg') : null} />
                    {deal.pnl ? (
                      <>
                        <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
                        <EcoRow label="P&L 1 — marge brute" value={fmtUSD(deal.pnl.pnl1, 0)} tone={deal.pnl.pnl1 >= 0 ? 'pos' : 'neg'} />
                        <EcoRow label="P&L 2 — après financement" value={fmtUSD(deal.pnl.pnl2, 0)} tone={deal.pnl.pnl2 >= 0 ? 'pos' : 'neg'} />
                        <EcoRow label="P&L 3 — marge nette" value={fmtUSD(deal.pnl.pnl3, 0)} tone={deal.pnl.pnl3 >= 0 ? 'pos' : 'neg'} bold />
                      </>
                    ) : (
                      <div className="mt-3 flex items-center justify-between rounded-md border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">P&L 3 niveaux non validé pour ce deal.</span>
                        <button onClick={() => onOpenModule && onOpenModule('pnl', deal.id)}
                          className="text-xs text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                          Calculer <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EcoRow({ label, value, tone = null, bold = false }) {
  const toneCls = tone === 'pos' ? 'text-emerald-700 dark:text-emerald-400'
    : tone === 'neg' ? 'text-red-700 dark:text-red-400'
    : 'text-slate-900 dark:text-slate-100';
  return (
    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className={`font-semibold ${toneCls} ${bold ? 'text-base' : ''}`}>{value}</span>
    </div>
  );
}
