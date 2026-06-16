// src/modules/GoNoGo.jsx
// Synthèse GO / NO-GO d'un deal.
// Agrège automatiquement pricing, fret, hedging, P&L, couverture FX et risques.
// Seul le seuil minimum de marge ($/MT) est saisi manuellement.

import React, { useState, useMemo } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Save, Gauge } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Button, Stat } from '../components/UI.jsx';
import { computeGoNoGo } from '../calc/goNoGoCalc.js';

const VERDICT_STYLE = {
  GO:                 { bg: 'bg-emerald-50 dark:bg-emerald-900/20', bd: 'border-emerald-400', txt: 'text-emerald-800 dark:text-emerald-300', icon: CheckCircle2, badge: '✓ GO' },
  GO_WITH_CONDITIONS: { bg: 'bg-amber-50 dark:bg-amber-900/20',    bd: 'border-amber-400',    txt: 'text-amber-800 dark:text-amber-300',    icon: AlertTriangle, badge: '⚠ GO sous conditions' },
  NO_GO:              { bg: 'bg-red-50 dark:bg-red-900/20',        bd: 'border-red-400',      txt: 'text-red-800 dark:text-red-300',        icon: XCircle, badge: '✗ NO-GO' },
};

const CHECK_ICON = {
  ok:   { sym: '🟢', cls: 'text-emerald-700 dark:text-emerald-400' },
  warn: { sym: '🟡', cls: 'text-amber-700 dark:text-amber-400' },
  fail: { sym: '🔴', cls: 'text-red-700 dark:text-red-400' },
};

export default function GoNoGo({ deals = [], onPricingValidated, currentUser }) {
  const [dealId, setDealId]       = useState('');
  const [minMargin, setMinMargin] = useState('5');
  const [saved, setSaved]         = useState(false);

  const deal = useMemo(() => deals.find(d => d.id === dealId) || null, [deals, dealId]);
  const result = useMemo(
    () => (deal ? computeGoNoGo(deal, Number(minMargin) || 0) : null),
    [deal, minMargin]
  );

  const VS = result ? VERDICT_STYLE[result.status] : null;

  const saveToDeal = () => {
    if (!deal || !result || !onPricingValidated) return;
    onPricingValidated(dealId, {
      validated: result.status === 'GO',
      validatedAt: new Date().toISOString(),
      validatedBy: currentUser?.fullName || null,
      minMarginPerMT: result.threshold,
      marginPerMT: result.marginPerMT,
      netPnL: result.netPnL,
      verdict: { status: result.status, reasons: result.blockers, requiredActions: result.blockers },
      goNoGo: {
        status: result.status,
        checks: result.checks,
        blockers: result.blockers,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">GO / NO-GO</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Synthèse automatique du deal · Pricing · Fret · Hedging · P&amp;L · FX · Risques · 100 % local
        </p>
      </div>

      {/* ── Sélection & seuil (seule saisie manuelle) ───────────────── */}
      <Card>
        <CardHeader icon={Gauge} title="Deal & seuil de décision" />
        <CardBody>
          <div className="grid md:grid-cols-2 gap-4 items-end">
            <Field label="Deal à évaluer">
              <Select value={dealId} onChange={e => { setDealId(e.target.value); setSaved(false); }}>
                <option value="">— Choisir un deal —</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.id} — {PRODUCTS[d.product]?.name || d.product} — {d.counterparty}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seuil minimum de marge ($/MT)" hint="Seule valeur saisie manuellement">
              <Input type="number" step="0.5" value={minMargin} onChange={e => setMinMargin(e.target.value)} placeholder="5" />
            </Field>
          </div>
        </CardBody>
      </Card>

      {!result && (
        <div className="flex items-center justify-center h-40 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <p className="text-sm">Sélectionnez un deal pour afficher la synthèse GO / NO-GO</p>
        </div>
      )}

      {result && VS && (
        <div className="grid md:grid-cols-2 gap-6 items-start">

          {/* ── Verdict + chiffres clés ────────────────────────────── */}
          <div className="space-y-4">
            <div className={`rounded-lg border-2 p-5 ${VS.bg} ${VS.bd}`}>
              <div className="flex items-center gap-3 mb-2">
                <VS.icon className={`w-8 h-8 ${VS.txt}`} />
                <div className={`text-3xl font-bold ${VS.txt}`}>{VS.badge}</div>
              </div>
              <p className={`text-sm ${VS.txt}`}>{result.summary}</p>
            </div>

            <Card>
              <CardHeader icon={ShieldCheck} title="Chiffres clés" />
              <CardBody>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Marge nette /MT"
                    value={result.hasPnL ? fmt(result.marginPerMT, 2) + ' $/MT' : '—'}
                    accent={result.hasPnL && result.marginPerMT >= result.threshold ? 'blue' : 'slate'} />
                  <Stat label="Seuil minimum" value={fmt(result.threshold, 2) + ' $/MT'} accent="slate" />
                  <Stat label="P&L net total"
                    value={result.hasPnL ? fmtUSD(result.netPnL, 0) : '—'}
                    accent={result.hasPnL && result.netPnL >= 0 ? 'blue' : 'slate'} />
                  <Stat label="Score de risque" value={String(result.risk.totalScore)} hint={result.risk.level} accent="slate" />
                </div>
              </CardBody>
            </Card>

            {result.blockers.length > 0 && (
              <Card>
                <CardHeader icon={AlertTriangle} title="Points à lever" />
                <CardBody>
                  <ul className="space-y-1">
                    {result.blockers.map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300">→ {b}</li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            <Button variant="primary" icon={Save} onClick={saveToDeal} disabled={!onPricingValidated}>
              {saved ? '✓ Synthèse sauvegardée' : 'Sauvegarder dans le deal'}
            </Button>
          </div>

          {/* ── Checklist de synthèse ──────────────────────────────── */}
          <Card>
            <CardHeader icon={CheckCircle2} title="Checklist de synthèse" subtitle="Données agrégées depuis les autres modules" />
            <CardBody className="p-0">
              <ul>
                {result.checks.map(c => {
                  const ci = CHECK_ICON[c.status] || CHECK_ICON.warn;
                  return (
                    <li key={c.key} className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <span className="text-base leading-5">{ci.sym}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.label}</div>
                        <div className={`text-xs ${ci.cls}`}>{c.detail}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
