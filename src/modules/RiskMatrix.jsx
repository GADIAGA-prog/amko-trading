import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Save } from 'lucide-react';
import { PRODUCTS, RISK_TYPES } from '../constants.js';
import { Card, CardHeader, CardBody, Select, Input } from '../components/UI.jsx';

const FREE_KEY = 'amko_risk_free';

export default function RiskMatrix({ deals, onRiskSaved }) {
  const [selectedDealId, setSelectedDealId] = useState('');
  const [risks,       setRisks]       = useState({});
  const [mitigations, setMitigations] = useState({});
  const isInitialLoad = useRef(true);

  // Charger les données quand le deal change
  useEffect(() => {
    isInitialLoad.current = true;
    if (!selectedDealId) {
      try {
        const saved = localStorage.getItem(FREE_KEY);
        if (saved) {
          const { risks: r, mitigations: m } = JSON.parse(saved);
          setRisks(r || {});
          setMitigations(m || {});
        } else {
          setRisks({});
          setMitigations({});
        }
      } catch { setRisks({}); setMitigations({}); }
    } else {
      const deal = deals.find(d => d.id === selectedDealId);
      if (deal?.riskMatrix) {
        setRisks(deal.riskMatrix.risks || {});
        setMitigations(deal.riskMatrix.mitigations || {});
      } else {
        setRisks({});
        setMitigations({});
      }
    }
    // Laisser un tick avant d'activer la sauvegarde auto
    setTimeout(() => { isInitialLoad.current = false; }, 0);
  }, [selectedDealId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sauvegarder automatiquement quand les données changent
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!selectedDealId) {
      try { localStorage.setItem(FREE_KEY, JSON.stringify({ risks, mitigations })); } catch {}
    } else if (onRiskSaved) {
      onRiskSaved(selectedDealId, { risks, mitigations });
    }
  }, [risks, mitigations]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRisk = (type, val) => setRisks(r => ({ ...r, [type]: val }));
  const setMit  = (type, val) => setMitigations(m => ({ ...m, [type]: val }));

  const score      = (prob, sev) => (Number(prob) || 0) * (Number(sev) || 0);
  const colorScore = (sc) => {
    if (sc >= 15) return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
    if (sc >= 8)  return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
    if (sc >= 1)  return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Matrice des risques</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Identifier, coter et mitiger les risques</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <Save className="w-3.5 h-3.5" />
          {selectedDealId ? 'Sauvegardé dans le deal' : 'Sauvegardé localement'}
        </div>
      </div>

      <Card>
        <CardHeader icon={ShieldAlert} title="Sélectionner un deal" />
        <CardBody>
          <Select value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)}>
            <option value="">— Évaluation libre —</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {d.id} — {PRODUCTS[d.product]?.name} — {d.counterparty}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                  <th className="text-left py-2 px-3">Risque</th>
                  <th className="text-center py-2 px-3 w-28">Probabilité (1-5)</th>
                  <th className="text-center py-2 px-3 w-28">Gravité (1-5)</th>
                  <th className="text-center py-2 px-3 w-20">Score</th>
                  <th className="text-left py-2 px-3">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {RISK_TYPES.map(rt => {
                  const r  = risks[rt] || {};
                  const sc = score(r.prob, r.sev);
                  return (
                    <tr key={rt} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{rt}</td>
                      <td className="py-2 px-3">
                        <Input type="number" min="0" max="5"
                          value={r.prob || ''}
                          onChange={e => setRisk(rt, { ...r, prob: e.target.value })}
                          className="text-center" />
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" min="0" max="5"
                          value={r.sev || ''}
                          onChange={e => setRisk(rt, { ...r, sev: e.target.value })}
                          className="text-center" />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${colorScore(sc)}`}>
                          {sc || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <Input value={mitigations[rt] || ''}
                          onChange={e => setMit(rt, e.target.value)}
                          placeholder="Action de mitigation" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
