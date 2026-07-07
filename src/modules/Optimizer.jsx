import React, { useState, useMemo, useEffect } from 'react';
import { Lightbulb, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { Card, CardHeader, CardBody, Select, Stat } from '../components/UI.jsx';
import { analyzeDeal } from '../calc/optimizerCalc.js';

export default function Optimizer({ deals, initialDealId }) {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (initialDealId && deals.some(d => d.id === initialDealId)) setSelectedId(initialDealId);
  }, [initialDealId]);
  const deal = deals.find(d => d.id === selectedId);

  const analysis = useMemo(() => analyzeDeal(deal), [deal]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Optimiseur de deal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analyse automatique et suggestions d'amélioration</p>
      </div>

      <Card>
        <CardHeader icon={Lightbulb} title="Sélectionner un deal" />
        <CardBody>
          <Select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">— Choisir un deal à analyser —</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {d.id} — {PRODUCTS[d.product]?.name} — {d.counterparty} ({d.dealType})
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {deal && analysis && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Issues critiques" value={analysis.filter(i => i.level === 'high').length} accent="red" />
            <Stat label="À surveiller"     value={analysis.filter(i => i.level === 'med').length}  accent="gold" />
            <Stat label="Mineures"         value={analysis.filter(i => i.level === 'low').length}  accent="slate" />
            <Stat label="Score santé"
              value={`${Math.max(0,
                100
                - analysis.filter(i => i.level === 'high').length * 25
                - analysis.filter(i => i.level === 'med').length  * 10
                - analysis.filter(i => i.level === 'low').length  *  3
              )}/100`}
              accent="green" />
          </div>

          {analysis.length === 0 ? (
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                  <div>
                    <div className="font-semibold">Aucune issue détectée</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Le deal passe tous les contrôles automatiques.</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {analysis.map((i, idx) => {
                const palette = {
                  high: { bg: 'bg-red-50 dark:bg-red-900/20',     bd: 'border-red-300 dark:border-red-700',     tt: 'text-red-800 dark:text-red-300',     pill: 'bg-red-600 text-white',     Icon: AlertTriangle },
                  med:  { bg: 'bg-amber-50 dark:bg-amber-900/20', bd: 'border-amber-300 dark:border-amber-700', tt: 'text-amber-800 dark:text-amber-300', pill: 'bg-amber-600 text-white',   Icon: AlertTriangle },
                  low:  { bg: 'bg-slate-50 dark:bg-slate-800',    bd: 'border-slate-300 dark:border-slate-600', tt: 'text-slate-700 dark:text-slate-300', pill: 'bg-slate-500 text-white',   Icon: Info },
                  info: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', bd: 'border-emerald-300 dark:border-emerald-700', tt: 'text-emerald-800 dark:text-emerald-300', pill: 'bg-emerald-600 text-white', Icon: CheckCircle2 },
                }[i.level];
                const IcoPalette = palette.Icon;
                return (
                  <div key={idx} className={`rounded-md border ${palette.bd} ${palette.bg} p-4`}>
                    <div className="flex items-start gap-3">
                      <IcoPalette className={`w-5 h-5 mt-0.5 ${palette.tt}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded font-semibold ${palette.pill}`}>{i.level.toUpperCase()}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase">{i.area}</span>
                        </div>
                        <h3 className={`font-semibold ${palette.tt}`}>{i.title}</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{i.detail}</p>
                        <p className="text-sm mt-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Action recommandée : </span>
                          <span className="text-slate-700 dark:text-slate-300">{i.action}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
