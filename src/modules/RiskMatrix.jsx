import React, { useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardBody, Select } from '../components/UI.jsx';
import { assessDealRisks, formatRiskStatus } from '../calc/dealRiskEngine.js';

function badgeClass(level) {
  if (level === 'Critique') return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800';
  if (level === 'Élevé') return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800';
  if (level === 'Modéré') return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800';
  return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800';
}

function verdictClass(status) {
  if (status === 'NO_GO') return 'bg-red-600 text-white';
  if (status === 'GO_WITH_CONDITIONS') return 'bg-amber-500 text-white';
  return 'bg-emerald-600 text-white';
}

export default function RiskMatrix({ deals, onRiskSaved }) {
  const [selectedDealId, setSelectedDealId] = useState('');
  const selectedDeal = deals.find(d => d.id === selectedDealId) || deals[0] || null;
  const assessment = useMemo(() => selectedDeal ? assessDealRisks(selectedDeal) : null, [selectedDeal]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Matrice des risques & couvertures</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analyse automatique des risques par deal : Platts, FX, Trade Finance, crédit, DAP, prépaiement et couvertures.</p>
      </div>

      <Card>
        <CardHeader icon={ShieldAlert} title="Sélectionner un deal" />
        <CardBody>
          <Select value={selectedDeal?.id || ''} onChange={e => setSelectedDealId(e.target.value)}>
            {deals.length === 0 && <option value="">Aucun deal disponible</option>}
            {deals.map(d => <option key={d.id} value={d.id}>{d.id} — {d.counterparty || 'Contrepartie ?'} — {d.product || 'Produit ?'}</option>)}
          </Select>
        </CardBody>
      </Card>

      {!assessment && (
        <Card><CardBody><p className="text-sm text-slate-500">Créez d'abord un deal pour obtenir une analyse de risque.</p></CardBody></Card>
      )}

      {assessment && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
              <div className="text-xs uppercase text-slate-500">Score total</div>
              <div className="text-3xl font-bold">{assessment.totalScore}</div>
            </div>
            <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
              <div className="text-xs uppercase text-slate-500">Niveau</div>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full border text-sm font-bold ${badgeClass(assessment.level)}`}>{assessment.level}</span>
            </div>
            <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
              <div className="text-xs uppercase text-slate-500">Verdict</div>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold ${verdictClass(assessment.status)}`}>{formatRiskStatus(assessment.status)}</span>
            </div>
            <div className="rounded-xl border bg-white dark:bg-slate-900 p-4">
              <div className="text-xs uppercase text-slate-500">Couvertures</div>
              <div className="text-3xl font-bold">{assessment.hedges.length}</div>
            </div>
          </div>

          {assessment.blockers.length > 0 && (
            <Card>
              <CardHeader icon={AlertTriangle} title="Blocages à lever avant GO" />
              <CardBody>
                <ul className="list-disc pl-5 space-y-1 text-sm text-red-700 dark:text-red-300">
                  {assessment.blockers.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader icon={ShieldAlert} title="Sous-niveaux de risque" subtitle={assessment.summary} />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b">
                      <th className="text-left p-3">Risque</th>
                      <th className="text-center p-3">Prob.</th>
                      <th className="text-center p-3">Gravité</th>
                      <th className="text-center p-3">Score</th>
                      <th className="text-left p-3">Mitigation</th>
                      <th className="text-left p-3">Couverture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessment.risks.map(r => (
                      <tr key={r.name} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="p-3 font-semibold">{r.name}
                          <div className="text-xs text-slate-500 font-normal mt-1">{r.description}</div>
                        </td>
                        <td className="p-3 text-center">{r.probability}/5</td>
                        <td className="p-3 text-center">{r.severity}/5</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded border text-xs font-bold ${badgeClass(r.level)}`}>
                            {r.score} — {r.level}
                          </span>
                        </td>
                        <td className="p-3">{r.mitigation}</td>
                        <td className="p-3">{r.hedge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={TrendingUp} title="Couvertures recommandées" />
            <CardBody>
              <div className="grid md:grid-cols-2 gap-4">
                {assessment.hedges.map((h, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-900 dark:text-slate-100">{h.family}</span>
                    </div>
                    <div className="text-sm font-semibold">{h.instrument}</div>
                    <div className="text-sm mt-2 text-slate-700 dark:text-slate-300"><b>Action :</b> {h.action}</div>
                    <div className="text-sm mt-1 text-slate-700 dark:text-slate-300"><b>Exposition :</b> {h.exposure}</div>
                    <div className="text-sm mt-1 text-slate-700 dark:text-slate-300"><b>Ratio :</b> {h.hedgeRatio}</div>
                    <div className="text-sm mt-1 text-slate-700 dark:text-slate-300"><b>Timing :</b> {h.timing}</div>
                    <div className="text-xs mt-3 text-slate-500 dark:text-slate-400">{h.rationale}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
