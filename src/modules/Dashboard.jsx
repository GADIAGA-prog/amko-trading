import React from 'react';
import { LayoutDashboard, Plus, Droplets, DollarSign } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Stat, Button, Field, Input } from '../components/UI.jsx';
import { TVTickerTape, TVMiniChart } from '../components/TradingViewWidgets.jsx';

export default function Dashboard({ deals, goTo, marketPrices, setMarketPrice }) {
  const total         = deals.length;
  const openDeals     = deals.filter(d => d.status !== 'closed').length;
  const totalVolume   = deals.reduce((s, d) => s + (Number(d.quantity) || 0), 0);
  const totalNotional = deals.reduce(
    (s, d) => s + (Number(d.quantity) || 0) * (Number(d.estimatedPrice) || 0) * (PRODUCTS[d.product]?.bblPerMT || 7.5),
    0,
  );
  const recent = [...deals].slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tableau de bord</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Vue d'ensemble — marché et opérations</p>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="px-2 py-2"><TVTickerTape /></div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Deals total"      value={total}                            accent="blue" />
        <Stat label="Deals ouverts"    value={openDeals}                        accent="gold" />
        <Stat label="Volume cumulé"    value={fmt(totalVolume, 0) + ' MT'}      accent="slate" />
        <Stat label="Notional estimé"  value={fmtUSD(totalNotional, 0)}         accent="green" />
      </div>

      {/* Fix 3 — prix de référence partagés avec Pricing & P&L */}
      <Card>
        <CardHeader icon={DollarSign} title="Prix de référence actuels"
          subtitle="Pré-remplissent les calculateurs Pricing et P&L — lisez sur les mini-charts puis saisissez ici" />
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
                    <tr key={d.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-700 dark:text-slate-300">{d.id}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.dealType === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {d.dealType === 'buy' ? 'Achat' : 'Vente'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-800 dark:text-slate-200">{PRODUCTS[d.product]?.name || d.product}</td>
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
