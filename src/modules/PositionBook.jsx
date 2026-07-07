import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Layers, TrendingUp, TrendingDown, AlertTriangle, Anchor, Building2,
  Scale, DollarSign, ShieldCheck, RefreshCw, FileSpreadsheet,
} from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Stat, Field, Input, Button } from '../components/UI.jsx';
import { computeBook, resolveRefMT } from '../calc/positionCalc.js';

const MARKER_LABEL = {
  brent: 'Brent', wti: 'WTI', dubai: 'Dubai', gasoil: 'Gasoil (ICE)',
  rbob: 'RBOB', ulsd: 'ULSD', 'n/a': 'Non indexé',
};

const signCls = (v) => v > 0.5 ? 'text-emerald-700 dark:text-emerald-400'
  : v < -0.5 ? 'text-red-700 dark:text-red-400'
  : 'text-slate-500 dark:text-slate-400';

const posLabel = (v) => v > 0.5 ? 'LONG' : v < -0.5 ? 'SHORT' : 'PLAT';

export default function PositionBook({ deals = [], marketPrices = {}, setMarketPrice }) {
  const [overrides, setOverrides] = useState({});
  const [includeClosed, setIncludeClosed] = useState(false);

  const book = useMemo(
    () => computeBook(deals, marketPrices, overrides, { includeClosed }),
    [deals, marketPrices, overrides, includeClosed],
  );
  const s = book.summary;

  // Produits distincts présents dans le book → grille de prix marché actuel
  const productsInBook = useMemo(() => {
    const seen = new Map();
    for (const d of deals) {
      if (!includeClosed && d.status === 'closed') continue;
      if (!seen.has(d.product)) {
        const ref = resolveRefMT(d, marketPrices, {});
        seen.set(d.product, {
          key: d.product,
          name: PRODUCTS[d.product]?.name || d.product,
          defaultRef: ref.price,
          source: ref.source,
        });
      }
    }
    return [...seen.values()];
  }, [deals, marketPrices, includeClosed]);

  const hasDeals = book.perDeal.length > 0;

  // ── Export Excel : synthèse + position marker + produits + détail deals ──
  const exportExcel = () => {
    const s2 = book.summary;
    const wb = XLSX.utils.book_new();

    const synthese = XLSX.utils.aoa_to_sheet([
      ['AMKO Trading — Book de position', new Date().toISOString().slice(0, 10)],
      [],
      ['Deals actifs', s2.dealCount],
      ['Position nette (MT)', Math.round(s2.netMT)],
      ['Long brut (MT)', Math.round(s2.grossLongMT)],
      ['Short brut (MT)', Math.round(s2.grossShortMT)],
      ['Notional book ($)', Math.round(s2.notional)],
      ['Taux de couverture (%)', Math.round(s2.bookCoverPct)],
      ['Exposition ouverte (bbl)', Math.round(s2.totalOpenBbl)],
      ['P&L validé ($)', Math.round(s2.bookedPnl)],
      ['MtM latent ($)', Math.round(s2.latentMtm)],
      ['P&L total estimé ($)', Math.round(s2.totalPnl)],
      ['Deals non couverts', s2.unhedgedCount],
    ]);
    XLSX.utils.book_append_sheet(wb, synthese, 'Synthèse');

    const markers = XLSX.utils.aoa_to_sheet([
      ['Marker', 'Long (bbl)', 'Short (bbl)', 'Physique net (bbl)', 'Hedge (bbl)', 'Ouvert net (bbl)', '≈ Lots'],
      ...book.markers.map(m => [
        MARKER_LABEL[m.marker] || m.marker, Math.round(m.longBbl), Math.round(m.shortBbl),
        Math.round(m.physBbl), Math.round(m.hedgedBbl), Math.round(m.netOpenBbl),
        m.netOpenLots != null ? Math.round(m.netOpenLots * 10) / 10 : '',
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, markers, 'Position marker');

    const products = XLSX.utils.aoa_to_sheet([
      ['Produit', 'Achat (MT)', 'Vente (MT)', 'Net (MT)', 'Couverture (%)', 'Notional ($)', 'MtM latent ($)'],
      ...book.products.map(p => [
        p.name, Math.round(p.longMT), Math.round(p.shortMT), Math.round(p.physMT),
        Math.round(p.coverPct), Math.round(p.notional), p.hasMtm ? Math.round(p.mtm) : '',
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, products, 'Produits');

    const dealsSheet = XLSX.utils.aoa_to_sheet([
      ['Deal', 'Sens', 'Contrepartie', 'Produit', 'Qté (MT)', 'Prix deal ($/MT)', 'Marché ($/MT)',
       'Hedgé', 'Lots', 'Ouvert (bbl)', 'MtM ($)', 'P&L validé ($)', 'Contribution ($)', 'Statut'],
      ...book.perDeal.map(p => [
        p.id, p.dealType === 'buy' ? 'Achat' : 'Vente', p.counterparty, p.productName,
        Math.round(p.qtyMT), p.legPrice || '', p.refPrice != null ? Math.round(p.refPrice * 100) / 100 : '',
        p.hedged ? 'Oui' : 'Non', p.hedgeLots || '', Math.round(p.hedged ? p.netOpenBbl : p.physBbl),
        p.mtm != null ? Math.round(p.mtm) : '', p.hasBooked ? Math.round(p.booked) : '',
        Math.round(p.contribution), p.status,
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, dealsSheet, 'Deals');

    const cps = XLSX.utils.aoa_to_sheet([
      ['Contrepartie', 'Deals', 'Achat (MT)', 'Vente (MT)', 'Notional ($)', '% du book'],
      ...book.counterparties.map(c => [
        c.name, c.deals, Math.round(c.longMT), Math.round(c.shortMT), Math.round(c.notional),
        s2.notional > 0 ? Math.round(c.notional / s2.notional * 100) : 0,
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, cps, 'Contreparties');

    XLSX.writeFile(wb, `amko-book-position-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-brand-700 dark:text-brand-400" /> Book de position &amp; Mark-to-Market
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Position nette, exposition ouverte après couverture et P&amp;L consolidé sur l'ensemble du portefeuille
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={includeClosed} onChange={e => setIncludeClosed(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600" />
            Inclure les deals soldés
          </label>
          <Button variant="primary" size="sm" icon={FileSpreadsheet} disabled={!hasDeals} onClick={exportExcel}>
            Exporter Excel
          </Button>
        </div>
      </div>

      {!hasDeals ? (
        <Card><CardBody>
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Layers className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm">Aucune position active. Créez des deals pour alimenter le book.</p>
          </div>
        </CardBody></Card>
      ) : (
        <>
          {/* ── KPIs ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Deals actifs" value={s.dealCount} accent="blue" />
            <Stat label="Position nette"
              value={<span className={signCls(s.netMT)}>{s.netMT >= 0 ? '+' : ''}{fmt(s.netMT, 0)} MT</span>}
              hint={`${posLabel(s.netMT)} — L ${fmt(s.grossLongMT, 0)} / S ${fmt(s.grossShortMT, 0)}`}
              accent="slate" />
            <Stat label="Taux de couverture book"
              value={`${fmt(s.bookCoverPct, 0)} %`}
              hint={`${fmt(s.totalOpenBbl, 0)} bbl ouverts`}
              accent={s.bookCoverPct >= 80 ? 'green' : s.bookCoverPct >= 50 ? 'gold' : 'red'} />
            <Stat label="Notional book" value={fmtUSD(s.notional, 0)}
              hint={`${fmt(s.grossMT, 0)} MT bruts`} accent="slate" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Stat label="P&L validé (verrouillé)"
              value={<span className={signCls(s.bookedPnl)}>{s.bookedPnl >= 0 ? '+' : ''}{fmtUSD(s.bookedPnl, 0)}</span>}
              hint={`${s.bookedCount} deal(s) avec P&L validé`}
              accent={s.bookedPnl >= 0 ? 'green' : 'red'} />
            <Stat label="MtM latent (positions ouvertes)"
              value={<span className={signCls(s.latentMtm)}>{s.latentMtm >= 0 ? '+' : ''}{fmtUSD(s.latentMtm, 0)}</span>}
              hint={`${s.mtmCount} deal(s) valorisé(s) au marché`}
              accent={s.latentMtm >= 0 ? 'green' : 'red'} />
            <Stat label="P&L total estimé"
              value={<span className={signCls(s.totalPnl)}>{s.totalPnl >= 0 ? '+' : ''}{fmtUSD(s.totalPnl, 0)}</span>}
              hint="Validé + MtM latent"
              accent={s.totalPnl >= 0 ? 'green' : 'red'} />
          </div>

          {/* ── Alerte exposition non couverte ───────────────────── */}
          {s.unhedgedCount > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-md text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="text-amber-800 dark:text-amber-300">
                <b>{s.unhedgedCount} deal(s) sans couverture validée</b> — exposition flat price de {fmtUSD(s.unhedgedNotional, 0)} de notional.
                Passez par le module Hedging pour neutraliser le risque directionnel.
              </div>
            </div>
          )}

          {/* ── Exposition par marker (décision de hedge) ────────── */}
          <Card>
            <CardHeader icon={Anchor} title="Exposition par marker"
              subtitle="Position physique nette (signée) compensée par les hedges — cible : exposition ouverte ≈ 0" />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                      <th className="py-3 px-4">Marker</th>
                      <th className="py-3 px-4 text-right">Long (bbl)</th>
                      <th className="py-3 px-4 text-right">Short (bbl)</th>
                      <th className="py-3 px-4 text-right">Physique net (bbl)</th>
                      <th className="py-3 px-4 text-right">Hedge (bbl)</th>
                      <th className="py-3 px-4 text-right">Ouvert net (bbl)</th>
                      <th className="py-3 px-4 text-right">≈ Lots</th>
                      <th className="py-3 px-4">Sens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.markers.map(m => (
                      <tr key={m.marker} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{MARKER_LABEL[m.marker] || m.marker}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">{fmt(m.longBbl, 0)}</td>
                        <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400">{fmt(m.shortBbl, 0)}</td>
                        <td className={`py-2.5 px-4 text-right font-medium ${signCls(m.physBbl)}`}>{m.physBbl >= 0 ? '+' : ''}{fmt(m.physBbl, 0)}</td>
                        <td className="py-2.5 px-4 text-right text-brand-700 dark:text-brand-400">{m.hedgedBbl >= 0 ? '+' : ''}{fmt(m.hedgedBbl, 0)}</td>
                        <td className={`py-2.5 px-4 text-right font-bold ${signCls(m.netOpenBbl)}`}>{m.netOpenBbl >= 0 ? '+' : ''}{fmt(m.netOpenBbl, 0)}</td>
                        <td className={`py-2.5 px-4 text-right ${signCls(m.netOpenBbl)}`}>{m.netOpenLots != null ? (m.netOpenLots >= 0 ? '+' : '') + fmt(m.netOpenLots, 1) : '—'}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            Math.abs(m.netOpenBbl) < 500 ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            : m.netOpenBbl > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                            {Math.abs(m.netOpenBbl) < 500 ? 'Couvert' : posLabel(m.netOpenBbl)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">
                « Ouvert net » &gt; 0 = position longue résiduelle (risque de baisse) ; &lt; 0 = short résiduel (risque de hausse). Les lots sont indicatifs (contrat standard du marker).
              </p>
            </CardBody>
          </Card>

          {/* ── Prix marché actuel (drive le MtM) ────────────────── */}
          <Card>
            <CardHeader icon={RefreshCw} title="Prix marché actuel — base du Mark-to-Market"
              subtitle="Pré-remplis depuis les prix de référence (Dashboard). Ajustez en $/MT pour inclure le différentiel courant de chaque qualité." />
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {productsInBook.map(p => (
                  <Field key={p.key}
                    label={p.name}
                    hint={overrides[p.key] ? 'manuel' : p.defaultRef != null ? `auto : ${p.source}` : 'aucun benchmark'}>
                    <Input type="number" step="0.01"
                      value={overrides[p.key] ?? ''}
                      placeholder={p.defaultRef != null ? fmt(p.defaultRef, 2) : '— saisir —'}
                      onChange={e => setOverrides(o => ({ ...o, [p.key]: e.target.value }))} />
                  </Field>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* ── Position par produit ─────────────────────────────── */}
          <Card>
            <CardHeader icon={Layers} title="Position par produit" />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                      <th className="py-3 px-4">Produit</th>
                      <th className="py-3 px-4 text-right">Achat (MT)</th>
                      <th className="py-3 px-4 text-right">Vente (MT)</th>
                      <th className="py-3 px-4 text-right">Net (MT)</th>
                      <th className="py-3 px-4 text-right">Couverture</th>
                      <th className="py-3 px-4 text-right">Notional</th>
                      <th className="py-3 px-4 text-right">MtM latent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.products.map(p => (
                      <tr key={p.key} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{p.name}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">{fmt(p.longMT, 0)}</td>
                        <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400">{fmt(p.shortMT, 0)}</td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${signCls(p.physMT)}`}>{p.physMT >= 0 ? '+' : ''}{fmt(p.physMT, 0)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">{fmt(p.coverPct, 0)} %</td>
                        <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">{fmtUSD(p.notional, 0)}</td>
                        <td className={`py-2.5 px-4 text-right font-medium ${p.hasMtm ? signCls(p.mtm) : 'text-slate-400'}`}>
                          {p.hasMtm ? `${p.mtm >= 0 ? '+' : ''}${fmtUSD(p.mtm, 0)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* ── Détail par deal ──────────────────────────────────── */}
          <Card>
            <CardHeader icon={DollarSign} title="Détail par deal"
              subtitle="MtM latent = valorisation flat price au marché ; P&L validé = résultat verrouillé (inclut hedge + FX)" />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                      <th className="py-3 px-4">Deal</th>
                      <th className="py-3 px-4">Sens</th>
                      <th className="py-3 px-4">Produit</th>
                      <th className="py-3 px-4 text-right">Qté (MT)</th>
                      <th className="py-3 px-4 text-right">Prix deal</th>
                      <th className="py-3 px-4 text-right">Marché</th>
                      <th className="py-3 px-4 text-right">Ouvert (bbl)</th>
                      <th className="py-3 px-4 text-right">Contribution P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.perDeal.map(p => (
                      <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">{p.id}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.dealType === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {p.dealType === 'buy' ? 'Achat' : 'Vente'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">
                          {p.productName}
                          {p.basisRisk && <span title="Basis risk : hedge sur un autre marker" className="ml-1 text-amber-600 dark:text-amber-400">⚠</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">{fmt(p.qtyMT, 0)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">{p.legPrice > 0 ? fmt(p.legPrice, 2) : '—'}</td>
                        <td className="py-2.5 px-4 text-right text-slate-500 dark:text-slate-400">{p.refPrice != null ? fmt(p.refPrice, 2) : '—'}</td>
                        <td className={`py-2.5 px-4 text-right ${p.hedged ? signCls(p.netOpenBbl) : 'text-amber-600 dark:text-amber-400'}`}>
                          {p.hedged ? `${p.netOpenBbl >= 0 ? '+' : ''}${fmt(p.netOpenBbl, 0)}` : `${fmt(p.physBbl, 0)} ⚠`}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${signCls(p.contribution)}`}>
                          {p.contribution >= 0 ? '+' : ''}{fmtUSD(p.contribution, 0)}
                          <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">{p.hasBooked ? 'validé' : p.mtm != null ? 'MtM' : 'n/a'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* ── Concentration contrepartie (risque crédit) ───────── */}
          <Card>
            <CardHeader icon={Building2} title="Concentration par contrepartie"
              subtitle="Exposition notionnelle agrégée — surveiller les limites de crédit" />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                      <th className="py-3 px-4">Contrepartie</th>
                      <th className="py-3 px-4 text-right">Deals</th>
                      <th className="py-3 px-4 text-right">Achat (MT)</th>
                      <th className="py-3 px-4 text-right">Vente (MT)</th>
                      <th className="py-3 px-4 text-right">Notional</th>
                      <th className="py-3 px-4 text-right">% du book</th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.counterparties.map(c => (
                      <tr key={c.name} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                        <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">{c.deals}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400">{fmt(c.longMT, 0)}</td>
                        <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400">{fmt(c.shortMT, 0)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300">{fmtUSD(c.notional, 0)}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`font-semibold ${s.notional > 0 && c.notional / s.notional > 0.4 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {s.notional > 0 ? fmt(c.notional / s.notional * 100, 0) : 0} %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
