// FxForward.jsx — Calculateur de couverture FX : forward ferme & option sur devise.
// Commissions et frais bancaires inclus. Aucun appel API — calculs 100 % locaux.

import React, { useState, useMemo, useEffect } from 'react';
import { Landmark, Calculator, TrendingUp, TrendingDown, Info, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Row, Stat, Button } from '../components/UI.jsx';
import {
  computeSwapPoints,
  computeForwardFerme,
  computeOptionChange,
  computeHedgeScenarios,
} from '../calc/fxForwardCalc.js';

// ─── Constantes ───────────────────────────────────────────────────────────────
const DEVISE_OPTIONS = ['USD', 'EUR', 'GBP', 'CHF', 'XOF', 'XAF', 'MAD', 'TND', 'GHS'];
const STYLE_OPTIONS  = ['Européenne', 'Américaine'];

function fmtRate(r, digits = 4) {
  if (!r && r !== 0) return '—';
  return Number(r).toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function n(v) { return Number(v) || 0; }

function Badge({ ok, children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border
      ${ok
        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
        : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700'
      }`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {children}
    </span>
  );
}

function ScenarioRow({ s, ccy, ccyDom }) {
  const fwdBetter = s.best === 'forward';
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700 text-sm">
      <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">{fmtRate(s.maturitySpot, 2)}</td>
      <td className={`py-2 px-3 text-center font-semibold ${s.pctVsSpot >= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
        {s.pctVsSpot >= 0 ? '+' : ''}{fmt(s.pctVsSpot, 1)} %
      </td>
      <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{fmtUSD(s.spotPurchase, 0)}</td>
      <td className={`py-2 px-3 text-right font-semibold ${s.forwardGainVsSpot >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
        {s.forwardGainVsSpot >= 0 ? '+' : ''}{fmtUSD(s.forwardGainVsSpot, 0)}
      </td>
      <td className={`py-2 px-3 text-right font-semibold ${s.optionGainVsSpot >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
        {s.optionGainVsSpot >= 0 ? '+' : ''}{fmtUSD(s.optionGainVsSpot, 0)}
        {s.optionExercised && <span className="ml-1 text-xs text-brand-500">(exercée)</span>}
      </td>
      <td className="py-2 px-3 text-center">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${fwdBetter ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
          {fwdBetter ? 'Forward' : 'Option'}
        </span>
      </td>
    </tr>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function FxForward({ deals = [], onFxSaved, initialDealId }) {
  // ── Liaison deal & sauvegarde ─────────────────────────────────────────────
  const [linkedDeal,   setLinkedDeal]   = useState('');
  const [fxInstrument, setFxInstrument] = useState('Forward ferme');
  const [savedMsg,     setSavedMsg]     = useState('');

  // ── Paramètres communs ────────────────────────────────────────────────────
  const [ccyFor,       setCcyFor]       = useState('USD');
  const [ccyDom,       setCcyDom]       = useState('XOF');
  const [notional,     setNotional]     = useState('');
  const [dateOp,       setDateOp]       = useState(() => new Date().toISOString().slice(0, 10));
  const [dateEch,      setDateEch]      = useState('');
  const [spotRate,     setSpotRate]     = useState('');
  const [rateFor,      setRateFor]      = useState('5.25');
  const [rateDom,      setRateDom]      = useState('3.50');

  // ── Forward ferme ─────────────────────────────────────────────────────────
  const [bankSpreadPct,    setBankSpreadPct]    = useState('0.30');
  const [flatCommission,   setFlatCommission]   = useState('500');
  const [marginPct,        setMarginPct]        = useState('10');
  const [opportunityRate,  setOpportunityRate]  = useState('5.00');

  // ── Option ────────────────────────────────────────────────────────────────
  const [strikeRate,    setStrikeRate]    = useState('');
  const [premiumPct,    setPremiumPct]    = useState('2.00');
  const [premiumAbs,    setPremiumAbs]    = useState('');
  const [courtage,      setCourtage]      = useState('300');
  const [optionStyle,   setOptionStyle]   = useState('Européenne');

  // ── Calculs dérivés ───────────────────────────────────────────────────────
  const tenor = useMemo(() => {
    if (!dateOp || !dateEch) return 0;
    return Math.max(0, Math.round((new Date(dateEch) - new Date(dateOp)) / 86400000));
  }, [dateOp, dateEch]);

  const swapCalc = useMemo(() => computeSwapPoints({
    spotRate: spotRate, rateForCurrency: rateFor, rateDomCurrency: rateDom, tenor,
  }), [spotRate, rateFor, rateDom, tenor]);

  const forwardResult = useMemo(() => computeForwardFerme({
    notionalForeign: notional,
    spotRate,
    forwardRateMarket: swapCalc.forwardRateTheoretical,
    bankSpreadPct,
    flatCommission,
    marginPct,
    opportunityRatePct: opportunityRate,
    tenor,
  }), [notional, spotRate, swapCalc, bankSpreadPct, flatCommission, marginPct, opportunityRate, tenor]);

  const optionResult = useMemo(() => computeOptionChange({
    notionalForeign: notional,
    spotRate,
    strikeRate: strikeRate || swapCalc.forwardRateTheoretical,
    premiumPct,
    premiumAbsolute: premiumAbs,
    courtageFlat: courtage,
  }), [notional, spotRate, strikeRate, swapCalc, premiumPct, premiumAbs, courtage]);

  const scenarios = useMemo(() => {
    if (!n(spotRate) || !n(notional)) return [];
    return computeHedgeScenarios({
      notionalForeign: notional,
      spotRate,
      strikeRate: strikeRate || swapCalc.forwardRateTheoretical,
      forwardResult,
      optionResult,
    });
  }, [notional, spotRate, strikeRate, swapCalc, forwardResult, optionResult]);

  const hasData = n(spotRate) > 0 && n(notional) > 0 && tenor > 0;

  // ── Résultat FX retenu pour le P&L (coût de la couverture = perte) ─────────
  const fxResultForPnL = fxInstrument === 'Option sur devise'
    ? -Math.round(optionResult.totalUpfrontCost || 0)
    : -Math.round(forwardResult.totalCost || 0);

  useEffect(() => {
    if (initialDealId && deals.some(d => d.id === initialDealId)) setLinkedDeal(initialDealId);
  }, [initialDealId]);

  // ── Restaurer la couverture FX sauvegardée du deal ────────────────────────
  useEffect(() => {
    if (!linkedDeal) return;
    const d = deals.find(x => x.id === linkedDeal);
    if (!d) return;
    setSavedMsg('');
    const fx = d.fxHedge;
    if (fx) {
      setFxInstrument(fx.instrument || 'Forward ferme');
      if (fx.ccyFor)    setCcyFor(fx.ccyFor);
      if (fx.ccyDom)    setCcyDom(fx.ccyDom);
      if (fx.notional != null)  setNotional(String(fx.notional));
      if (fx.dateOp)    setDateOp(fx.dateOp);
      if (fx.dateEch)   setDateEch(fx.dateEch);
      if (fx.spotRate != null)  setSpotRate(String(fx.spotRate));
      if (fx.rateFor != null)   setRateFor(String(fx.rateFor));
      if (fx.rateDom != null)   setRateDom(String(fx.rateDom));
      if (fx.strikeRate != null) setStrikeRate(String(fx.strikeRate));
    } else {
      // Pré-remplir le notionnel USD depuis le deal si rien n'est saisi
      if (d.estimatedPrice && d.quantity && !notional) {
        setNotional(String(Math.round(Number(d.estimatedPrice) * Number(d.quantity))));
      }
      // Pont avec FX Pricing : reprendre le taux spot déjà saisi dans la validation
      const pvFx = d.pricingValidation?.fx;
      if (pvFx && !spotRate) {
        const pick = {
          'USD/XOF': pvFx.spotUSDXOF,
          'EUR/XOF': pvFx.spotEURXOF,
          'EUR/USD': pvFx.spotEURUSD,
          'USD/EUR': pvFx.spotEURUSD > 0 ? 1 / pvFx.spotEURUSD : 0,
        }[`${ccyFor}/${ccyDom}`];
        if (pick > 0) setSpotRate(String(Math.round(pick * 10000) / 10000));
      }
    }
  }, [linkedDeal, deals]);

  const saveFx = () => {
    if (!linkedDeal) { alert('Sélectionnez d’abord le deal à couvrir.'); return; }
    if (!onFxSaved)  { alert('La sauvegarde FX n’est pas raccordée à la plateforme.'); return; }
    onFxSaved(linkedDeal, {
      validated: true,
      validatedAt: new Date().toISOString(),
      instrument: fxInstrument,
      ccyFor, ccyDom,
      notional: n(notional),
      dateOp, dateEch, tenor,
      spotRate: n(spotRate),
      rateFor: n(rateFor),
      rateDom: n(rateDom),
      forwardRate: forwardResult.clientForwardRate,
      forwardCost: Math.round(forwardResult.totalCost || 0),
      strikeRate: n(strikeRate) || swapCalc.forwardRateTheoretical,
      optionCost: Math.round(optionResult.totalUpfrontCost || 0),
      fxResult: fxResultForPnL, // repris automatiquement dans le P&L (niveau 3)
    });
    setSavedMsg(`Couverture FX (${fxInstrument}) enregistrée dans le deal ${linkedDeal}.`);
    setTimeout(() => setSavedMsg(''), 5000);
  };

  return (
    <div className="space-y-6">
      {/* ── Titre ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Couverture FX — Forward & Option
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Calcul des commissions et frais bancaires pour l'achat forward d'une devise —
          taux à terme ferme ou option sur devise.
        </p>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4" /> {savedMsg}
        </div>
      )}

      {/* ── Liaison deal & enregistrement ── */}
      <Card>
        <CardHeader icon={Landmark} title="Couverture FX du deal"
          subtitle={linkedDeal && deals.find(d => d.id === linkedDeal)?.fxHedge
            ? 'Couverture FX déjà enregistrée — modifiable'
            : 'Liez un deal pour enregistrer la couverture FX'} />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <Field label="Deal lié à couvrir">
              <Select value={linkedDeal} onChange={e => setLinkedDeal(e.target.value)}>
                <option value="">— Calcul libre —</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.id} — {d.counterparty || d.product}{d.fxHedge ? ' ✓' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Instrument retenu pour le P&L">
              <Select value={fxInstrument} onChange={e => setFxInstrument(e.target.value)}>
                <option>Forward ferme</option>
                <option>Option sur devise</option>
              </Select>
            </Field>
            <div className="flex items-center gap-3">
              <Button variant="primary" icon={Save} onClick={saveFx} disabled={!linkedDeal || !hasData}>
                Enregistrer la couverture FX
              </Button>
            </div>
          </div>
          {linkedDeal && (
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Résultat FX retenu pour le P&L :{' '}
              <b className={fxResultForPnL >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                {fxResultForPnL >= 0 ? '+' : ''}{fmtUSD(fxResultForPnL, 0)}
              </b>{' '}
              (coût de la couverture {fxInstrument === 'Option sur devise' ? 'par option' : 'forward'})
              {!hasData && <span className="text-amber-600 dark:text-amber-400"> — complétez montant, spot et dates pour activer l'enregistrement.</span>}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Section 1 : Paramètres communs ── */}
      <Card>
        <CardHeader icon={Landmark} title="Paramètres de l'opération" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Devise à acheter (étrangère)">
              <Select value={ccyFor} onChange={e => setCcyFor(e.target.value)}>
                {DEVISE_OPTIONS.filter(d => d !== ccyDom).map(d => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Devise de financement (domestique)">
              <Select value={ccyDom} onChange={e => setCcyDom(e.target.value)}>
                {DEVISE_OPTIONS.filter(d => d !== ccyFor).map(d => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label={`Montant à acheter (${ccyFor})`}>
              <Input type="number" value={notional} onChange={e => setNotional(e.target.value)}
                placeholder="ex. 500 000" />
            </Field>
            <Field label="Date d'opération (spot)">
              <Input type="date" value={dateOp} onChange={e => setDateOp(e.target.value)} />
            </Field>
            <Field label="Date d'échéance">
              <Input type="date" value={dateEch} onChange={e => setDateEch(e.target.value)} />
            </Field>
            <Field label="Durée calculée">
              <div className={`px-3 py-2 rounded-md border text-sm font-semibold
                ${tenor > 0
                  ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-700 text-brand-900 dark:text-brand-200'
                  : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500'
                }`}>
                {tenor > 0 ? `${tenor} jours` : '— (choisir les dates)'}
              </div>
            </Field>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-3">Données de marché</p>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label={`Cours spot ${ccyFor}/${ccyDom}`}
                hint={`1 ${ccyFor} = X ${ccyDom}`}>
                <Input type="number" step="0.0001" value={spotRate} onChange={e => setSpotRate(e.target.value)}
                  placeholder="ex. 607.50" />
              </Field>
              <Field label={`Taux d'intérêt ${ccyFor} (% an)`}
                hint="Libor / SOFR / taux directeur">
                <Input type="number" step="0.01" value={rateFor} onChange={e => setRateFor(e.target.value)} />
              </Field>
              <Field label={`Taux d'intérêt ${ccyDom} (% an)`}
                hint="Taux créancier domestique">
                <Input type="number" step="0.01" value={rateDom} onChange={e => setRateDom(e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Swap points */}
          {hasData && (
            <div className="mt-4 p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Points de terme calculés (parité de taux d'intérêt)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Taux forward théorique</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{fmtRate(swapCalc.forwardRateTheoretical, 4)}</div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Swap points</span>
                  <div className={`font-bold ${swapCalc.swapPoints >= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {swapCalc.swapPoints >= 0 ? '+' : ''}{fmtRate(swapCalc.swapPoints, 4)}
                    <span className="text-xs font-normal ml-1">({swapCalc.swapPoints >= 0 ? 'report' : 'déport'})</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">En % du spot</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{fmt(swapCalc.swapPointsPct, 3)} %</div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Basis annualisé</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{fmt(swapCalc.annualizedBasis, 2)} % / an</div>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">

        {/* ── Section 2 : Forward ferme ── */}
        <Card>
          <CardHeader icon={TrendingUp} title="Taux à terme ferme" subtitle="Engagement ferme — couverture totale du risque" />
          <CardBody>
            <div className="space-y-3">
              <Field label="Spread bancaire (% du taux forward)" hint="Commission implicite de la banque">
                <Input type="number" step="0.01" value={bankSpreadPct}
                  onChange={e => setBankSpreadPct(e.target.value)} placeholder="ex. 0.30" />
              </Field>
              <Field label={`Commission fixe de mise en place (${ccyDom})`}
                hint="Frais de dossier forfaitaires">
                <Input type="number" value={flatCommission}
                  onChange={e => setFlatCommission(e.target.value)} placeholder="ex. 500" />
              </Field>
              <Field label="Dépôt de garantie (% de la valeur notionnelle spot)"
                hint="Immobilisé pendant toute la durée">
                <Input type="number" step="0.5" value={marginPct}
                  onChange={e => setMarginPct(e.target.value)} placeholder="ex. 10" />
              </Field>
              <Field label="Taux d'opportunité sur le dépôt (% an)"
                hint="Rendement alternatif du capital immobilisé">
                <Input type="number" step="0.1" value={opportunityRate}
                  onChange={e => setOpportunityRate(e.target.value)} placeholder="ex. 5.00" />
              </Field>
            </div>

            {hasData && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Résultats forward</p>
                <Row label={`Taux forward marché`} value={fmtRate(swapCalc.forwardRateTheoretical)} />
                <Row label="Spread bancaire (coût)"
                  value={fmtUSD(forwardResult.spreadCost, 0)}
                  hint={`+${fmt(n(bankSpreadPct), 2)} %`} />
                <Row label="Taux forward client"
                  value={<span className="font-bold text-brand-700 dark:text-brand-400">{fmtRate(forwardResult.clientForwardRate)}</span>} />
                <Row label={`Montant à débourser à l'échéance (${ccyDom})`}
                  value={<span className="font-bold">{fmtUSD(forwardResult.settlementAmount, 0)}</span>} />
                <div className="border-t border-slate-100 dark:border-slate-700 pt-2 mt-2 space-y-2">
                  <Row label="Dépôt de garantie immobilisé"
                    value={fmtUSD(forwardResult.marginAmount, 0)} />
                  <Row label="Coût d'opportunité du dépôt"
                    value={fmtUSD(forwardResult.opportunityCost, 0)} />
                  <Row label={`Commission fixe (${ccyDom})`}
                    value={fmtUSD(forwardResult.flatCommission, 0)} />
                </div>
                <div className={`mt-3 p-3 rounded-md border-2 ${
                  forwardResult.protectionPct <= 0
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-600'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-600'
                }`}>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Coût total des frais</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {fmtUSD(forwardResult.totalCost, 0)}
                        <span className="text-xs font-normal ml-1">({fmt(forwardResult.totalCostPct, 2)} % notionnel)</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Taux de revient effectif</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{fmtRate(forwardResult.effectiveRate)}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs">
                    <Badge ok={forwardResult.protectionPct <= 2}>
                      {forwardResult.protectionPct >= 0 ? 'Surcoût vs spot' : 'Économie vs spot'} :
                      {forwardResult.protectionPct >= 0 ? ' +' : ' '}{fmt(Math.abs(forwardResult.protectionPct), 2)} %
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Section 3 : Option sur devise ── */}
        <Card>
          <CardHeader icon={TrendingDown} title="Option sur devise (Call)" subtitle="Droit d'achat — flexibilité si le cours baisse" />
          <CardBody>
            <div className="space-y-3">
              <Field label={`Prix d'exercice / Strike (${ccyFor}/${ccyDom})`}
                hint={hasData ? `Théorique : ${fmtRate(swapCalc.forwardRateTheoretical)} — laisser vide pour ATM` : 'Laisser vide pour ATM'}>
                <Input type="number" step="0.0001" value={strikeRate}
                  onChange={e => setStrikeRate(e.target.value)}
                  placeholder={hasData ? fmtRate(swapCalc.forwardRateTheoretical, 4) : 'ATM (≈ forward)'} />
              </Field>
              <Field label="Style d'option">
                <Select value={optionStyle} onChange={e => setOptionStyle(e.target.value)}>
                  {STYLE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Prime d'option (% du notionnel spot)"
                hint="Ou saisir le montant absolu ci-dessous">
                <Input type="number" step="0.1" value={premiumPct}
                  onChange={e => { setPremiumPct(e.target.value); setPremiumAbs(''); }}
                  placeholder="ex. 2.00" />
              </Field>
              <Field label={`Prime absolue (${ccyDom}) — si devis bancaire`}
                hint="Remplace le calcul en % si renseigné">
                <Input type="number" value={premiumAbs}
                  onChange={e => { setPremiumAbs(e.target.value); if (e.target.value) setPremiumPct(''); }}
                  placeholder="ex. 12 000" />
              </Field>
              <Field label={`Commission de courtage (${ccyDom})`}
                hint="Frais du broker ou de la banque">
                <Input type="number" value={courtage}
                  onChange={e => setCourtage(e.target.value)} placeholder="ex. 300" />
              </Field>
            </div>

            {hasData && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Résultats option</p>
                <Row label="Strike (prix d'exercice)"
                  value={fmtRate(n(strikeRate) || swapCalc.forwardRateTheoretical)} />
                <Row label="Prime d'option"
                  value={fmtUSD(optionResult.premiumAmount, 0)}
                  hint={`${fmt(optionResult.premiumRatePct, 2)} % du notionnel`} />
                <Row label="Commission de courtage"
                  value={fmtUSD(optionResult.courtage, 0)} />
                <Row label="Coût total à payer maintenant"
                  value={<span className="font-bold">{fmtUSD(optionResult.totalUpfrontCost, 0)}</span>} />
                <div className="border-t border-slate-100 dark:border-slate-700 pt-2 mt-2 space-y-2">
                  <Row label="Taux de revient si exercée"
                    value={<span className="font-semibold text-brand-700 dark:text-brand-400">{fmtRate(optionResult.effectiveRateIfExercised)}</span>} />
                  <Row label="Point mort (breakeven)"
                    value={<span className="font-semibold">{fmtRate(optionResult.breakeven)}</span>}
                    hint="Spot à l'échéance à partir duquel l'option est rentable" />
                  <Row label="Taux de revient si non exercée"
                    value={fmtRate(optionResult.effectiveRateIfNotExercised)}
                    hint="Achat spot + prime" />
                </div>
                <div className="mt-3 p-3 rounded-md bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Prime totale versée</div>
                      <div className="font-bold text-purple-900 dark:text-purple-200">
                        {fmtUSD(optionResult.totalUpfrontCost, 0)}
                        <span className="text-xs font-normal ml-1">({fmt(optionResult.premiumRatePct, 2)} %)</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Moneyness (strike/spot)</div>
                      <div className={`font-bold ${optionResult.moneyness <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {optionResult.moneyness >= 0 ? '+' : ''}{fmt(optionResult.moneyness, 2)} %
                        <span className="text-xs font-normal ml-1">
                          {optionResult.moneyness <= 0 ? '(ATM/ITM)' : '(OTM)'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-purple-800 dark:text-purple-300">
                    L'option protège si le {ccyFor} monte au-dessus de{' '}
                    <b>{fmtRate(optionResult.breakeven)}</b> {ccyDom}
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Section 4 : Comparaison KPIs ── */}
      {hasData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Taux forward client" value={fmtRate(forwardResult.clientForwardRate, 4)} accent="blue" />
          <Stat label="Coût forward total"  value={fmtUSD(forwardResult.totalCost, 0)}
            hint={`${fmt(forwardResult.totalCostPct, 2)} % notionnel`} accent="gold" />
          <Stat label="Strike option (call)" value={fmtRate(n(strikeRate) || swapCalc.forwardRateTheoretical, 4)} accent="slate" />
          <Stat label="Prime option totale" value={fmtUSD(optionResult.totalUpfrontCost, 0)}
            hint={`${fmt(optionResult.premiumRatePct, 2)} % notionnel`} accent="green" />
        </div>
      )}

      {/* ── Section 5 : Tableau de scénarios ── */}
      {hasData && scenarios.length > 0 && (
        <Card>
          <CardHeader icon={Calculator}
            title="Scénarios à l'échéance"
            subtitle={`Gain/perte vs achat spot — sur ${n(notional).toLocaleString('fr-FR')} ${ccyFor}`} />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">
                    <th className="text-left p-3">Spot à l'échéance</th>
                    <th className="text-center p-3">Δ vs aujourd'hui</th>
                    <th className="text-right p-3">Achat spot pur ({ccyDom})</th>
                    <th className="text-right p-3">Forward — économie</th>
                    <th className="text-right p-3">Option — économie</th>
                    <th className="text-center p-3">Meilleur</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s, i) => (
                    <ScenarioRow key={i} s={s} ccy={ccyFor} ccyDom={ccyDom} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <b>Lecture :</b> colonne « Forward — économie » = différence entre achat spot pur à l'échéance
                et coût total du forward (positif = le forward a <b>économisé</b>).
                Colonne « Option » : si le {ccyFor} est au-dessus du strike, l'option est exercée ;
                sinon on achète au spot et on perd seulement la prime.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Message si pas assez de données ── */}
      {!hasData && (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
          <Landmark className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm">Saisissez le montant, le cours spot et les deux dates pour lancer les calculs.</p>
        </div>
      )}
    </div>
  );
}
