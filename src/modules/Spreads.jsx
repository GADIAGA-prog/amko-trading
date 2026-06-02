import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { fmt } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Button } from '../components/UI.jsx';

const GEO_PRESETS  = [
  { l1: 'Brent', l2: 'Dubai' },
  { l1: 'Brent', l2: 'WTI' },
  { l1: 'WTI',   l2: 'Dubai' },
  { l1: 'Brent', l2: 'ICE Gasoil ($/bbl)' },
];
const TEMP_PRESETS = [
  { l1: 'M+1', l2: 'M+6' },
  { l1: 'M+1', l2: 'M+3' },
  { l1: 'M+1', l2: 'M+12' },
];

function suggestion(absSpread) {
  if (absSpread > 5) return { text: 'Arbitrage potentiel à étudier — l\'écart justifie une analyse logistique et de pricing.', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700' };
  if (absSpread > 2) return { text: 'Spread notable — surveiller l\'évolution. Peut signaler un déséquilibre régional.', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' };
  return { text: 'Spread dans les normes du marché. Pas d\'opportunité évidente à ce stade.', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' };
}

export default function Spreads() {
  const [mode,    setMode]    = useState('geo');
  const [label1,  setLabel1]  = useState('Brent');
  const [label2,  setLabel2]  = useState('Dubai');
  const [price1,  setPrice1]  = useState('');
  const [price2,  setPrice2]  = useState('');
  const [history, setHistory] = useState([]);

  const applyPreset = (l1, l2) => { setLabel1(l1); setLabel2(l2); };

  const p1  = Number(price1) || 0;
  const p2  = Number(price2) || 0;
  const raw = p1 - p2;
  const abs = Math.abs(raw);
  const pct = p2 !== 0 ? (raw / p2) * 100 : 0;
  const canCalc = p1 > 0 && p2 > 0;

  const higher = raw >= 0 ? label1 : label2;
  const lower  = raw >= 0 ? label2 : label1;
  const sg = canCalc ? suggestion(abs) : null;

  const calculate = () => {
    if (!canCalc) return;
    const entry = {
      id: Date.now(),
      mode,
      label1: label1 || 'Prix 1',
      label2: label2 || 'Prix 2',
      price1: p1, price2: p2,
      spread: raw, pct,
      ts: new Date().toLocaleString('fr-FR'),
    };
    setHistory(h => [entry, ...h].slice(0, 5));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analyse des spreads</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Spread géographique ou temporel — interprétation automatique
        </p>
      </div>

      <Card>
        <CardHeader icon={TrendingUp} title="Paramètres" />
        <CardBody>
          <div className="space-y-4">
            <Field label="Mode">
              <div className="flex gap-2">
                {[
                  { v: 'geo',  l: 'Spread géographique' },
                  { v: 'temp', l: 'Spread temporel' },
                ].map(({ v, l }) => (
                  <button key={v} onClick={() => {
                    setMode(v);
                    if (v === 'geo')  { setLabel1('Brent'); setLabel2('Dubai'); }
                    else              { setLabel1('M+1');   setLabel2('M+6'); }
                    setPrice1(''); setPrice2('');
                  }}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition ${
                      mode === v
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Préréglages rapides</p>
              <div className="flex flex-wrap gap-2">
                {(mode === 'geo' ? GEO_PRESETS : TEMP_PRESETS).map(({ l1, l2 }) => (
                  <button key={l1 + l2} onClick={() => applyPreset(l1, l2)}
                    className="px-3 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600">
                    {l1} / {l2}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Field label={mode === 'geo' ? 'Produit 1 (nom)' : 'Échéance 1 (nom)'}>
                  <Input value={label1} onChange={e => setLabel1(e.target.value)} placeholder="Ex. Brent" />
                </Field>
                <Field label="Prix $/bbl">
                  <Input type="number" step="0.01" value={price1}
                    onChange={e => setPrice1(e.target.value)} placeholder="Ex. 82.50" />
                </Field>
              </div>
              <div className="space-y-3">
                <Field label={mode === 'geo' ? 'Produit 2 (nom)' : 'Échéance 2 (nom)'}>
                  <Input value={label2} onChange={e => setLabel2(e.target.value)} placeholder="Ex. Dubai" />
                </Field>
                <Field label="Prix $/bbl">
                  <Input type="number" step="0.01" value={price2}
                    onChange={e => setPrice2(e.target.value)} placeholder="Ex. 79.80" />
                </Field>
              </div>
            </div>

            <Button variant="primary" icon={TrendingUp} onClick={calculate} disabled={!canCalc}>
              Calculer & enregistrer
            </Button>
          </div>
        </CardBody>
      </Card>

      {canCalc && (
        <div className="grid md:grid-cols-3 gap-3">
          <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Spread absolu</div>
            <div className={`text-2xl font-bold mt-1 ${raw >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'}`}>
              {raw >= 0 ? '+' : ''}{fmt(raw, 2)} $/bbl
            </div>
          </div>
          <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Spread %</div>
            <div className={`text-2xl font-bold mt-1 ${pct >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'}`}>
              {pct >= 0 ? '+' : ''}{fmt(pct, 2)} %
            </div>
          </div>
          <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Interprétation</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
              {higher} &gt; {lower} de {fmt(abs, 2)} $/bbl
            </div>
          </div>
        </div>
      )}

      {sg && (
        <div className={`px-4 py-3 rounded-md border ${sg.bg}`}>
          <div className={`text-sm font-semibold ${sg.color}`}>{sg.text}</div>
        </div>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader icon={TrendingUp} title="Historique des 5 derniers calculs" />
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {history.map(e => (
                <div key={e.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                  <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                    {e.mode === 'geo' ? 'Géo' : 'Temp'}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {e.label1} / {e.label2}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {fmt(e.price1, 2)} vs {fmt(e.price2, 2)} $/bbl
                  </span>
                  <span className={`font-bold ${e.spread >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'}`}>
                    {e.spread >= 0 ? '+' : ''}{fmt(e.spread, 2)} $/bbl
                  </span>
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{e.ts}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
