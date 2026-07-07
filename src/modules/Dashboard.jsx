import React, { useMemo } from 'react';
import { LayoutDashboard, Plus, Droplets, DollarSign, BellRing, CalendarClock, ChevronRight } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Stat, Button, Field, Input } from '../components/UI.jsx';
import { TVTickerTape, TVMiniChart } from '../components/TradingViewWidgets.jsx';
import { computeBook } from '../calc/positionCalc.js';
import { collectUpcomingEvents, collectPortfolioAlerts } from '../calc/dealLifecycle.js';

const KIND_BADGE = {
  laycan: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  bl: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  payment: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  hedge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  fx: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
};

export default function Dashboard({ deals, goTo, marketPrices, setMarketPrice, openDeal }) {
  const total         = deals.length;
  const openDeals     = deals.filter(d => d.status !== 'closed').length;
  const totalVolume   = deals.reduce((s, d) => s + (Number(d.quantity) || 0), 0);

  // ── Agrégats book + cycle de vie ─────────────────────────────
  const book   = useMemo(() => computeBook(deals, marketPrices, {}), [deals, marketPrices]);
  const events = useMemo(() => collectUpcomingEvents(deals, { days: 30 }), [deals]);
  const alerts = useMemo(() => collectPortfolioAlerts(deals, { max: 6 }), [deals]);
  const s = book.summary;

  const recent = [...deals].slice(-5).reverse();
  const pnlCls = (v) => v >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tableau de bord</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Vue d'ensemble — marché, book et opérations</p>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="px-2 py-2"><TVTickerTape /></div>
        </CardBody>
      </Card>

      {/* ── KPIs opérations ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Deals ouverts"    value={`${openDeals} / ${total}`}         accent="blue" />
        <Stat label="Volume cumulé"    value={fmt(totalVolume, 0) + ' MT'}       accent="slate" />
        <Stat label="Notional book"    value={fmtUSD(s.notional, 0)}             accent="gold" />
        <Stat label="Couverture book"  value={`${fmt(s.bookCoverPct, 0)} %`}
          hint={s.unhedgedCount ? `${s.unhedgedCount} deal(s) non couvert(s)` : 'Tout est couvert'}
          accent={s.bookCoverPct >= 80 ? 'green' : s.bookCoverPct >= 50 ? 'gold' : 'red'} />
      </div>

      {/* ── KPIs P&L ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="P&L validé"
          value={<span className={pnlCls(s.bookedPnl)}>{s.bookedPnl >= 0 ? '+' : ''}{fmtUSD(s.bookedPnl, 0)}</span>}
          hint={`${s.bookedCount} deal(s) validé(s)`} accent={s.bookedPnl >= 0 ? 'green' : 'red'} />
        <Stat label="MtM latent"
          value={<span className={pnlCls(s.latentMtm)}>{s.latentMtm >= 0 ? '+' : ''}{fmtUSD(s.latentMtm, 0)}</span>}
          hint="Positions ouvertes valorisées au marché" accent={s.latentMtm >= 0 ? 'green' : 'red'} />
        <Stat label="P&L total estimé"
          value={<span className={pnlCls(s.totalPnl)}>{s.totalPnl >= 0 ? '+' : ''}{fmtUSD(s.totalPnl, 0)}</span>}
          hint="Validé + latent" accent={s.totalPnl >= 0 ? 'green' : 'red'} />
      </div>

      {/* ── Alertes + Échéances ── */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader icon={BellRing} title={`Alertes portefeuille (${alerts.length})`}
            subtitle="Contrôles automatiques sur tous les deals actifs" />
          <CardBody className="p-0">
            {alerts.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">Aucune alerte — le book est sous contrôle.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {alerts.map((a, i) => (
                  <button key={i} onClick={() => openDeal && openDeal(a.dealId)}
                    className="w-full px-5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${a.level === 'high' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                        {a.level === 'high' ? 'HAUTE' : 'MOY'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{a.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {a.dealId} — {a.counterparty}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={CalendarClock} title={`Échéances — 30 prochains jours (${events.length})`}
            subtitle="Laycans, B/L, paiements estimés, échéances de couverture" />
          <CardBody className="p-0">
            {events.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">Aucune échéance dans les 30 jours.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {events.slice(0, 8).map((e, i) => (
                  <button key={i} onClick={() => openDeal && openDeal(e.dealId)}
                    className="w-full px-5 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                    <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 flex-shrink-0">{e.date}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${KIND_BADGE[e.kind] || 'bg-slate-100 text-slate-600'}`}>
                      {e.kind.toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate flex-1">
                      {e.estimated ? '≈ ' : ''}{e.label}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{e.dealId}</span>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Prix de référence partagés avec Pricing, P&L et Book de position */}
      <Card>
        <CardHeader icon={DollarSign} title="Prix de référence actuels"
          subtitle="Pré-remplissent Pricing, P&L et le Mark-to-Market du Book — lisez sur les mini-charts puis saisissez ici" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: 'brent',  label: 'Brent Dated ($/bbl)' },
              { key: 'wti',    label: 'WTI ($/bbl)' },
              { key: 'gasoil', label: 'Gasoil ($/MT)' },
              { key: 'dubai',  label: 'Dubai ($/bbl)' },
              { key: 'jet',    label: 'Jet/Kero ($/MT)' },
            ].map(({ key, label }) => (
              <Field key={key} label={label}>
                <Input type="number" step="0.01"
                  value={marketPrices[key] ?? ''}
                  onChange={e => setMarketPrice(key, e.target.value)}
                  placeholder="0.00" />
              </Field>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-3 gap-3">
        <TVMiniChart symbol="TVC:UKOIL"  name="Brent — 12 mois" />
        <TVMiniChart symbol="TVC:USOIL"  name="WTI — 12 mois" />
        <TVMiniChart symbol="ICEEUR:G1!" name="ICE Gasoil — 12 mois" />
      </div>

      <Card>
        <CardHeader icon={LayoutDashboard} title="Deals récents"
          subtitle="Cliquez sur une ligne pour ouvrir le cockpit du deal"
          action={
            <Button size="sm" variant="primary" icon={Plus} onClick={() => goTo('new-deal')}>
              Nouveau deal
            </Button>
          }
        />
        <CardBody>
          {recent.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              <Droplets className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm">Aucun deal. Cliquez sur « Nouveau deal » pour commencer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Produit</th>
                    <th className="py-2 pr-4">Qté</th>
                    <th className="py-2 pr-4">Incoterm</th>
                    <th className="py-2 pr-4">Laycan</th>
                    <th className="py-2 pr-4">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(d => (
                    <tr key={d.id} onClick={() => openDeal && openDeal(d.id)}
                      className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-700 dark:text-slate-300">{d.id}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.dealType === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {d.dealType === 'buy' ? 'Achat' : 'Vente'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-800 dark:text-slate-200">{PRODUCTS[d.product]?.name || d.plattsDescription || d.product}</td>
                      <td className="py-2 pr-4 text-slate-800 dark:text-slate-200">{fmt(d.quantity, 0)} MT</td>
                      <td className="py-2 pr-4 text-slate-800 dark:text-slate-200">{d.incoterm}</td>
                      <td className="py-2 pr-4 text-xs text-slate-600 dark:text-slate-400">{d.laycanFrom} → {d.laycanTo}</td>
                      <td className="py-2 pr-4">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                          {d.status || 'open'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
