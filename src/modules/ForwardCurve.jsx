import React, { useState, useMemo } from 'react';
import { BarChart3, Calculator, Lightbulb, Layers } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardBody, Field, Input, Select, Stat } from '../components/UI.jsx';
import { fmt } from '../utils.js';

export default function ForwardCurve() {
  const [marker, setMarker] = useState('brent');
  const [prices, setPrices] = useState([
    { month: 'M+1', price: 82.5 }, { month: 'M+2', price: 82.2 },
    { month: 'M+3', price: 81.9 }, { month: 'M+4', price: 81.6 },
    { month: 'M+5', price: 81.3 }, { month: 'M+6', price: 81.0 },
    { month: 'M+9', price: 80.4 }, { month: 'M+12', price: 79.8 },
  ]);

  const updPrice = (i, v) =>
    setPrices(ps => ps.map((p, idx) => idx === i ? { ...p, price: Number(v) } : p));

  const structure = useMemo(() => {
    if (prices.length < 2) return 'Inconnue';
    const slope = prices[prices.length - 1].price - prices[0].price;
    if (slope > 0.5) return 'CONTANGO';
    if (slope < -0.5) return 'BACKWARDATION';
    return 'NEUTRE / FLAT';
  }, [prices]);

  const spreadM1M6  = (prices[5]?.price || 0) - (prices[0]?.price || 0);
  const spreadM1M12 = (prices[7]?.price || 0) - (prices[0]?.price || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Courbe à terme</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Analyse de la structure contango / backwardation et des spreads
        </p>
      </div>

      <Card>
        <CardHeader icon={Layers} title="Configuration" />
        <CardBody>
          <Field label="Marker">
            <Select value={marker} onChange={e => setMarker(e.target.value)}>
              <option value="brent">Brent</option>
              <option value="wti">WTI</option>
              <option value="dubai">Dubai</option>
              <option value="gasoil">ICE Gasoil</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-3 gap-3">
        <div className={`px-4 py-3 rounded-md border-2 ${
          structure === 'CONTANGO'
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400'
            : structure === 'BACKWARDATION'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
        }`}>
          <div className="text-xs uppercase text-slate-600 dark:text-slate-400 font-semibold">Structure</div>
          <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{structure}</div>
        </div>
        <Stat label="Spread M+1 / M+6"  value={`${spreadM1M6  > 0 ? '+' : ''}${fmt(spreadM1M6,  2)} $`} accent={spreadM1M6  > 0 ? 'gold' : 'green'} />
        <Stat label="Spread M+1 / M+12" value={`${spreadM1M12 > 0 ? '+' : ''}${fmt(spreadM1M12, 2)} $`} accent={spreadM1M12 > 0 ? 'gold' : 'green'} />
      </div>

      <Card>
        <CardHeader icon={BarChart3} title="Visualisation de la courbe" />
        <CardBody>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={prices} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip />
                <ReferenceLine y={prices[0]?.price} stroke="#94a3b8" strokeDasharray="4 4" label="Spot" />
                <Line type="monotone" dataKey="price" stroke="#1d4ed8" strokeWidth={2.5}
                  dot={{ r: 4 }} activeDot={{ r: 6 }} name="Prix $/bbl" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Calculator} title="Éditer les prix forward"
          subtitle="Saisissez vos cotations pour analyser la courbe" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {prices.map((p, i) => (
              <Field key={i} label={p.month}>
                <Input type="number" step="0.01" value={p.price}
                  onChange={e => updPrice(i, e.target.value)} />
              </Field>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Lightbulb} title="Lecture stratégique" />
        <CardBody>
          <div className="text-sm space-y-2 text-slate-700 dark:text-slate-300">
            {structure === 'CONTANGO' && (
              <>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  ⚠ Marché en CONTANGO — prix futurs supérieurs au spot.
                </p>
                <p>Le marché anticipe une amélioration ou il est sur-approvisionné. Le stockage devient rémunérateur (cash-and-carry). Stratégies à envisager : garder les prix flottants à la vente avec un hedge approprié, exploiter les opportunités de stockage si l'écart couvre les coûts.</p>
              </>
            )}
            {structure === 'BACKWARDATION' && (
              <>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  ✓ Marché en BACKWARDATION — pénurie ou tension d'approvisionnement.
                </p>
                <p>Le spot est cher : déstocker, fixer rapidement les prix à la vente, éviter les positions flottantes. Très favorable aux producteurs qui vendent à terme.</p>
              </>
            )}
            {structure.includes('NEUTRE') && (
              <p>Courbe quasiment plate — pas de signal directionnel fort. Concentrez-vous sur les arbitrages géographiques et de qualité plutôt que sur la structure temporelle.</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
