import React, { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Flame, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/UI.jsx';
import { TVAdvancedChart, TVMarketOverview, TVSingleQuote, TVMiniChart } from '../components/TradingViewWidgets.jsx';

const ICE_STRIP = [
  { sym: 'ICEEUR:G1!',   label: 'Gasoil M1', desc: 'Front Month' },
  { sym: 'ICEEUR:G2!',   label: 'Gasoil M2', desc: '2ème mois' },
  { sym: 'ICEEUR:G3!',   label: 'Gasoil M3', desc: '3ème mois' },
  { sym: 'ICEEUR:G4!',   label: 'Gasoil M4', desc: '4ème mois' },
  { sym: 'ICEEUR:G5!',   label: 'Gasoil M5', desc: '5ème mois' },
  { sym: 'ICEEUR:G6!',   label: 'Gasoil M6', desc: '6ème mois' },
];

const MARKET_TABS = [
  {
    title: 'ICE Gasoil (GOB)',
    symbols: [
      { s: 'ICEEUR:G1!',   d: 'Gasoil Front Month (M1)' },
      { s: 'ICEEUR:G2!',   d: 'Gasoil 2ème mois (M2)' },
      { s: 'ICEEUR:G3!',   d: 'Gasoil 3ème mois (M3)' },
      { s: 'ICEEUR:G4!',   d: 'Gasoil 4ème mois (M4)' },
      { s: 'ICEEUR:G5!',   d: 'Gasoil 5ème mois (M5)' },
      { s: 'ICEEUR:G6!',   d: 'Gasoil 6ème mois (M6)' },
    ],
    originalTitle: 'ICE Gasoil',
  },
  {
    title: 'ICE Brent (BRN)',
    symbols: [
      { s: 'ICEEUR:BRN1!', d: 'Brent Front Month (M1)' },
      { s: 'ICEEUR:BRN2!', d: 'Brent 2ème mois (M2)' },
      { s: 'ICEEUR:BRN3!', d: 'Brent 3ème mois (M3)' },
      { s: 'ICEEUR:BRN4!', d: 'Brent 4ème mois (M4)' },
      { s: 'ICEEUR:BRN5!', d: 'Brent 5ème mois (M5)' },
      { s: 'ICEEUR:BRN6!', d: 'Brent 6ème mois (M6)' },
    ],
    originalTitle: 'ICE Brent',
  },
  {
    title: 'NYMEX',
    symbols: [
      { s: 'NYMEX:CL1!',  d: 'WTI Crude M1' },
      { s: 'NYMEX:CL2!',  d: 'WTI Crude M2' },
      { s: 'NYMEX:HO1!',  d: 'ULSD / Heating Oil M1' },
      { s: 'NYMEX:HO2!',  d: 'ULSD M2' },
      { s: 'NYMEX:RB1!',  d: 'RBOB Gasoline M1' },
      { s: 'NYMEX:NG1!',  d: 'Natural Gas M1' },
    ],
    originalTitle: 'NYMEX',
  },
];

const CHART_SYMBOLS = [
  { sym: 'ICEEUR:G1!',   name: 'ICE Gasoil M1' },
  { sym: 'ICEEUR:BRN1!', name: 'ICE Brent M1' },
  { sym: 'TVC:UKOIL',    name: 'Brent Spot' },
  { sym: 'NYMEX:CL1!',   name: 'WTI M1' },
  { sym: 'NYMEX:HO1!',   name: 'ULSD M1' },
  { sym: 'NYMEX:RB1!',   name: 'RBOB M1' },
];

export default function ICEBoard() {
  const [chartSym, setChartSym]   = useState('ICEEUR:G1!');
  const [interval, setInterval]   = useState('D');

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          ICE & NYMEX — Cotations Futures
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Strip ICE Gasoil (GOB) · ICE Brent (BRN) · NYMEX — Données TradingView temps réel
        </p>
      </div>

      {/* ── Cotations monoprix ICE Gasoil strip (M1→M6) ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          Strip ICE Gasoil — Prix instantanés (GOB, USD/MT)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ICE_STRIP.map(c => (
            <button
              key={c.sym}
              onClick={() => setChartSym(c.sym)}
              className={`rounded-lg border overflow-hidden text-left transition ${
                chartSym === c.sym
                  ? 'border-blue-500 ring-2 ring-blue-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              <div className="bg-slate-800 text-white text-xs font-semibold px-2 py-1 flex justify-between">
                <span>{c.label}</span>
                <span className="text-slate-400">{c.desc}</span>
              </div>
              <TVSingleQuote symbol={c.sym} width="100%" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart avancé ── */}
      <Card>
        <CardHeader
          icon={Activity}
          title="Graphique avancé"
          subtitle={CHART_SYMBOLS.find(s => s.sym === chartSym)?.name || chartSym}
          action={
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1">
                {CHART_SYMBOLS.map(s => (
                  <button key={s.sym} onClick={() => setChartSym(s.sym)}
                    className={`px-2 py-1 text-xs rounded ${
                      chartSym === s.sym
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}>
                    {s.name.replace(' M1', '')}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 border-l pl-2 ml-1">
                {['15', '60', 'D', 'W'].map(t => (
                  <button key={t} onClick={() => setInterval(t)}
                    className={`px-2 py-1 text-xs rounded ${
                      interval === t
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}>
                    {t === '15' ? '15m' : t === '60' ? '1h' : t === 'D' ? '1j' : '1s'}
                  </button>
                ))}
              </div>
            </div>
          }
        />
        <CardBody>
          <TVAdvancedChart symbol={chartSym} interval={interval} height={500} />
        </CardBody>
      </Card>

      {/* ── Market Overview — Strip complet ── */}
      <Card>
        <CardHeader
          icon={BarChart3}
          title="Tableau de cotations — ICE · NYMEX"
          subtitle="Strip complet par échéance · Cours · Variation · Volume"
        />
        <CardBody>
          <TVMarketOverview tabs={MARKET_TABS} height={580} />
        </CardBody>
      </Card>

      {/* ── Mini charts strip ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Synthèse 12 mois
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ICE_STRIP.map(c => (
            <TVMiniChart key={c.sym} symbol={c.sym} name={`${c.label} — ${c.desc}`} />
          ))}
        </div>
      </div>

      {/* ── Note d'utilisation pour le deal Vitol ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <div className="font-semibold mb-1 flex items-center gap-2">
          <TrendingDown className="w-4 h-4" />
          Utilisation pour le deal Gasoil Vitol → Lomé
        </div>
        <ul className="space-y-1 text-xs">
          <li>• <strong>Contrat de référence :</strong> ICE Gasoil JUL26 (GOB) — 100 MT/lot</li>
          <li>• <strong>Nombre de contrats :</strong> 150 lots SHORT pour couvrir 15 000 MT</li>
          <li>• <strong>Prix d'entrée cible :</strong> lire le cours ICE Gasoil M1 ci-dessus et saisir dans Hedging → Prix d'entrée</li>
          <li>• <strong>Direction :</strong> SHORT (vente de futures) — AMKO est long physique</li>
          <li>• <strong>Platts MED Gasoil 0,1%S</strong> ≈ ICE Gasoil GOB + basis MED/ARA (~+6 USD/MT)</li>
          <li>• <strong>Période de pricing vente :</strong> 01/06 → 15/06/2026 (11 jours ouvrables) → lever 14 lots/jour</li>
        </ul>
      </div>
    </div>
  );
}
