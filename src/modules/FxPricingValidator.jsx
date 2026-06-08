// src/modules/FxPricingValidator.jsx
// Validation pricing + arbitrage FX + verdict GO/NO-GO.
// Calculs 100 % locaux — aucun appel API externe.

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Calculator, Save, RotateCcw, Download, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Button, Stat, Row } from '../components/UI.jsx';
import {
  computePhysicalPrice,
  computeEconomics,
  computeArbitrage,
  computeScenarios,
  computeVerdict,
  buildPricingValidation,
} from '../calc/fxPricingCalc.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CCY  = ['USD', 'EUR', 'XOF'];
const SOURCES = ['Platts', 'Argus', 'OPIS', 'Manual'];
const UNITS    = ['USD/MT', 'USD/bbl'];
const FWD_SRC  = ['Manual', 'Bank quote', 'Broker quote'];

function n(v)  { return Number(v) || 0; }
function fmtV(v, d = 2) { return fmt(v, d); }

const VERDICT_STYLE = {
  GO:                  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', bd: 'border-emerald-400', txt: 'text-emerald-800 dark:text-emerald-300', icon: CheckCircle2 },
  GO_WITH_CONDITIONS:  { bg: 'bg-amber-50 dark:bg-amber-900/20',    bd: 'border-amber-400',    txt: 'text-amber-800 dark:text-amber-300',    icon: AlertTriangle },
  NO_GO:               { bg: 'bg-red-50 dark:bg-red-900/20',        bd: 'border-red-400',      txt: 'text-red-800 dark:text-red-300',        icon: XCircle },
};

const BLANK_FX = {
  spotEURUSD: '1.08', spotUSDXOF: '600', spotEURXOF: '655.957',
  forwardEURUSD: '', forwardUSDXOF: '', forwardEURXOF: '',
  forwardDate: '', forwardSource: 'Manual',
};
const BLANK_COSTS = {
  freightCost: '', insuranceCost: '', inspectionCost: '',
  financingCost: '', demurrageEstimate: '', otherCosts: '',
};

// ─── Composant ────────────────────────────────────────────────────────────────
export default function FxPricingValidator({ deals = [], onPricingValidated, currentUser }) {
  const [dealId,       setDealId]       = useState('');
  const [product,      setProduct]      = useState('crude-bonny');
  const [quantityMT,   setQuantityMT]   = useState('');
  const [tolerance,    setTolerance]    = useState('5');

  // Pricing
  const [priceSource,  setPriceSource]  = useState('Platts');
  const [priceMarker,  setPriceMarker]  = useState('brent');
  const [avgPrice,     setAvgPrice]     = useState('');
  const [priceUnit,    setPriceUnit]    = useState('USD/MT');
  const [periodStart,  setPeriodStart]  = useState('');
  const [periodEnd,    setPeriodEnd]    = useState('');
  const [premium,      setPremium]      = useState('0');
  const [differential, setDifferential] = useState('0');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice,    setSalePrice]    = useState('');

  // Devises
  const [purchaseCcy,  setPurchaseCcy]  = useState('USD');
  const [saleCcy,      setSaleCcy]      = useState('USD');
  const [marginCcy,    setMarginCcy]    = useState('USD');
  const [minMargin,    setMinMargin]    = useState('5');

  // FX
  const [fx, setFx] = useState(BLANK_FX);
  const setFxField = (k, v) => setFx(p => ({ ...p, [k]: v }));

  // Coûts
  const [costs, setCosts] = useState(BLANK_COSTS);
  const setCostField = (k, v) => setCosts(p => ({ ...p, [k]: v }));

  // Résultats
  const [results,   setResults]   = useState(null);
  const [saved,     setSaved]     = useState(false);
  const [validated, setValidated] = useState(false);

  // ── Auto-calcul du prix physique ──────────────────────────────
  useEffect(() => {
    const bblPerMT = PRODUCTS[product]?.bblPerMT || 7.5;
    const computed = computePhysicalPrice({ averagePrice: n(avgPrice), unit: priceUnit, bblPerMT, premium: n(premium), differential: n(differential) });
    if (computed > 0 && !purchasePrice) setPurchasePrice(String(Math.round(computed * 100) / 100));
  }, [avgPrice, priceUnit, product, premium, differential]);

  // ── Pré-remplir depuis le deal ────────────────────────────────
  useEffect(() => {
    if (!dealId) return;
    const d = deals.find(x => x.id === dealId);
    if (!d) return;
    setProduct(d.product || 'crude-bonny');
    setQuantityMT(String(d.quantity || ''));
    setTolerance(String(d.tolerance || '5'));
    setPriceSource(d.priceSource || 'Platts');
    setPriceMarker(d.priceMarker || 'brent');
    setDifferential(String(d.differential || '0'));

    if (d.pricingValidation) {
      const pv = d.pricingValidation;
      setAvgPrice(String(pv.pricingPeriod?.averagePrice || ''));
      setPriceUnit(pv.pricingPeriod?.unit || 'USD/MT');
      setPeriodStart(pv.pricingPeriod?.startDate || '');
      setPeriodEnd(pv.pricingPeriod?.endDate || '');
      setPremium(String(pv.premium || '0'));
      setPurchasePrice(String(pv.finalPhysicalPrice || ''));
      setSalePrice(String(pv.economics?.saleAmountOriginalCurrency / n(d.quantity) || ''));
      setPurchaseCcy(pv.purchaseCurrency || 'USD');
      setSaleCcy(pv.saleCurrency || 'USD');
      setMarginCcy(pv.marginCurrency || 'USD');
      if (pv.fx) setFx({ ...BLANK_FX, ...Object.fromEntries(Object.entries(pv.fx).map(([k,v]) => [k, String(v)])) });
      const ec = pv.economics || {};
      setCosts({
        freightCost:       String(ec.freightCost       || ''),
        insuranceCost:     String(ec.insuranceCost     || ''),
        inspectionCost:    String(ec.inspectionCost    || ''),
        financingCost:     String(ec.financingCost     || ''),
        demurrageEstimate: String(ec.demurrageEstimate || ''),
        otherCosts:        String(ec.otherCosts        || ''),
      });
    } else {
      if (d.estimatedPrice) setPurchasePrice(String(d.estimatedPrice));
      if (d.freight?.totalFreight) setCostField('freightCost', String(Math.round(d.freight.totalFreight)));
      if (d.pricing) {
        setAvgPrice(String(d.pricing.markerPrice || ''));
        setPremium(String(d.pricing.traderMargin || '0'));
      }
    }
    setSaved(false); setValidated(false); setResults(null);
  }, [dealId]);

  // ── Calcul principal ──────────────────────────────────────────
  const calculate = useCallback(() => {
    const fxObj = Object.fromEntries(Object.entries(fx).map(([k,v]) => [k, isNaN(Number(v)) ? v : Number(v)]));
    const costsObj = Object.fromEntries(Object.entries(costs).map(([k,v]) => [k, n(v)]));
    const deal = deals.find(x => x.id === dealId) || {};
    const qty  = n(quantityMT);

    const economics = computeEconomics({
      purchasePrice: n(purchasePrice), salePrice: n(salePrice), quantityMT: qty,
      purchaseCcy, saleCcy, marginCcy, fx: fxObj, costs: costsObj,
    });
    const arbitrage = computeArbitrage({
      purchasePrice: n(purchasePrice), salePrice: n(salePrice), quantityMT: qty,
      marginCcy, fx: fxObj, costs: costsObj,
    });
    const scenarios = computeScenarios({
      purchasePrice: n(purchasePrice), salePrice: n(salePrice), quantityMT: qty,
      purchaseCcy, saleCcy, marginCcy, fx: fxObj, costs: costsObj,
    });
    const pricingComplete = !!(n(avgPrice) && periodStart);
    const verdict = computeVerdict({ economics, scenarios, deal, minMarginPerMT: n(minMargin), pricingComplete });

    setResults({ economics, arbitrage, scenarios, verdict, fxObj, costsObj });
  }, [deals, dealId, purchasePrice, salePrice, quantityMT, purchaseCcy, saleCcy, marginCcy, fx, costs, avgPrice, periodStart, minMargin]);

  // ── Sauvegarder / Valider ─────────────────────────────────────
  const saveToDoc = (validate = false) => {
    if (!dealId || !results) return;
    const deal = deals.find(x => x.id === dealId) || {};
    const pv = buildPricingValidation({
      deal,
      pricingPeriod: { startDate: periodStart, endDate: periodEnd, averagePrice: n(avgPrice), unit: priceUnit },
      differential: n(differential), premium: n(premium),
      finalPurchasePrice: n(purchasePrice), finalSalePrice: n(salePrice),
      purchaseCcy, saleCcy, marginCcy,
      fx: results.fxObj, costs: results.costsObj,
      minMarginPerMT: n(minMargin),
      validatedBy: validate ? (currentUser?.fullName || null) : null,
    });
    if (validate) { pv.validated = true; pv.validatedAt = new Date().toISOString(); }
    if (onPricingValidated) onPricingValidated(dealId, pv);
    if (validate) setValidated(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const reset = () => {
    setDealId(''); setAvgPrice(''); setPurchasePrice(''); setSalePrice('');
    setFx(BLANK_FX); setCosts(BLANK_COSTS); setResults(null); setSaved(false); setValidated(false);
  };

  const exportJSON = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify({ dealId, purchasePrice, salePrice, ...results }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `fx-pricing-${dealId || 'calc'}-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  const eco = results?.economics;
  const arb = results?.arbitrage;
  const sc  = results?.scenarios;
  const vrd = results?.verdict;
  const VS  = vrd ? VERDICT_STYLE[vrd.status] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">FX Pricing Validator</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Validation pricing · Arbitrage FX · Verdict GO / NO-GO · 100 % local
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {results && <Button variant="outline" size="sm" icon={Download} onClick={exportJSON}>Export JSON</Button>}
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={reset}>Réinitialiser</Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FORMULAIRE — deux colonnes sur desktop
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* ── Colonne gauche : saisies ──────────────────────────── */}
        <div className="space-y-4">

          {/* Deal & Produit */}
          <Card>
            <CardHeader icon={ShieldCheck} title="Deal & Produit" />
            <CardBody>
              <div className="space-y-3">
                <Field label="Deal lié">
                  <Select value={dealId} onChange={e => setDealId(e.target.value)}>
                    <option value="">— Calcul libre —</option>
                    {deals.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.id} — {PRODUCTS[d.product]?.name || d.product} — {d.counterparty}
                        {d.pricingValidation ? ' ✓' : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Produit">
                    <Select value={product} onChange={e => setProduct(e.target.value)}>
                      {Object.entries(PRODUCTS).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Quantité (MT)">
                    <Input type="number" value={quantityMT} onChange={e => setQuantityMT(e.target.value)} placeholder="6500" />
                  </Field>
                  <Field label="Tolérance (%)">
                    <Input type="number" value={tolerance} onChange={e => setTolerance(e.target.value)} />
                  </Field>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Pricing physique */}
          <Card>
            <CardHeader icon={Calculator} title="Pricing physique" />
            <CardBody>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Source"><Select value={priceSource} onChange={e => setPriceSource(e.target.value)}>{SOURCES.map(s=><option key={s}>{s}</option>)}</Select></Field>
                  <Field label="Marker / Benchmark"><Input value={priceMarker} onChange={e => setPriceMarker(e.target.value)} placeholder="brent" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Période — début"><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></Field>
                  <Field label="Période — fin"><Input type="date" value={periodEnd}   onChange={e => setPeriodEnd(e.target.value)}   /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Prix moyen Platts/Argus"><Input type="number" step="0.001" value={avgPrice} onChange={e => setAvgPrice(e.target.value)} placeholder="Ex. 82.50" /></Field>
                  <Field label="Unité"><Select value={priceUnit} onChange={e => setPriceUnit(e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</Select></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Prime ($/MT)"><Input type="number" step="0.01" value={premium} onChange={e => setPremium(e.target.value)} placeholder="27" /></Field>
                  <Field label="Différentiel ($/MT)"><Input type="number" step="0.01" value={differential} onChange={e => setDifferential(e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Prix achat final ($/MT)" hint="Auto-calculé ou manuel">
                    <Input type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="font-semibold" />
                  </Field>
                  <Field label="Prix vente final ($/MT)">
                    <Input type="number" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="font-semibold" />
                  </Field>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Devises */}
          <Card>
            <CardHeader icon={ShieldCheck} title="Devises & seuil de marge" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Devise achat"><Select value={purchaseCcy} onChange={e => setPurchaseCcy(e.target.value)}>{CCY.map(c=><option key={c}>{c}</option>)}</Select></Field>
                <Field label="Devise vente"><Select value={saleCcy} onChange={e => setSaleCcy(e.target.value)}>{CCY.map(c=><option key={c}>{c}</option>)}</Select></Field>
                <Field label="Devise de marge"><Select value={marginCcy} onChange={e => setMarginCcy(e.target.value)}>{CCY.map(c=><option key={c}>{c}</option>)}</Select></Field>
                <Field label="Seuil minimum $/MT" hint="Pour le verdict GO">
                  <Input type="number" step="0.5" value={minMargin} onChange={e => setMinMargin(e.target.value)} placeholder="5" />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* Taux FX */}
          <Card>
            <CardHeader icon={Calculator} title="Taux de change (manuels)" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Spot EUR/USD"><Input type="number" step="0.0001" value={fx.spotEURUSD}    onChange={e => setFxField('spotEURUSD',    e.target.value)} placeholder="1.0800" /></Field>
                <Field label="Forward EUR/USD"><Input type="number" step="0.0001" value={fx.forwardEURUSD} onChange={e => setFxField('forwardEURUSD', e.target.value)} placeholder="1.0750" /></Field>
                <Field label="Spot USD/XOF"><Input type="number" step="1" value={fx.spotUSDXOF}    onChange={e => setFxField('spotUSDXOF',    e.target.value)} placeholder="600" /></Field>
                <Field label="Forward USD/XOF"><Input type="number" step="1" value={fx.forwardUSDXOF} onChange={e => setFxField('forwardUSDXOF', e.target.value)} placeholder="598" /></Field>
                <Field label="Spot EUR/XOF"><Input type="number" step="1" value={fx.spotEURXOF}    onChange={e => setFxField('spotEURXOF',    e.target.value)} placeholder="655.957" /></Field>
                <Field label="Forward EUR/XOF"><Input type="number" step="1" value={fx.forwardEURXOF} onChange={e => setFxField('forwardEURXOF', e.target.value)} placeholder="648" /></Field>
                <Field label="Date maturité forward"><Input type="date" value={fx.forwardDate} onChange={e => setFxField('forwardDate', e.target.value)} /></Field>
                <Field label="Source cotation"><Select value={fx.forwardSource} onChange={e => setFxField('forwardSource', e.target.value)}>{FWD_SRC.map(s=><option key={s}>{s}</option>)}</Select></Field>
              </div>
            </CardBody>
          </Card>

          {/* Coûts */}
          <Card>
            <CardHeader icon={Calculator} title="Coûts opérationnels ($)" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fret ($)"><Input type="number" value={costs.freightCost}       onChange={e => setCostField('freightCost',       e.target.value)} /></Field>
                <Field label="Assurance ($)"><Input type="number" value={costs.insuranceCost}    onChange={e => setCostField('insuranceCost',    e.target.value)} /></Field>
                <Field label="Inspection ($)"><Input type="number" value={costs.inspectionCost}  onChange={e => setCostField('inspectionCost',  e.target.value)} /></Field>
                <Field label="Financement ($)"><Input type="number" value={costs.financingCost}   onChange={e => setCostField('financingCost',   e.target.value)} /></Field>
                <Field label="Demurrage ($)"><Input type="number" value={costs.demurrageEstimate} onChange={e => setCostField('demurrageEstimate', e.target.value)} /></Field>
                <Field label="Autres ($)"><Input type="number" value={costs.otherCosts}        onChange={e => setCostField('otherCosts',        e.target.value)} /></Field>
              </div>
            </CardBody>
          </Card>

          {/* Bouton Calculer */}
          <Button variant="primary" icon={Calculator} onClick={calculate} className="w-full justify-center text-base py-3">
            Calculer la marge et le verdict FX
          </Button>
        </div>

        {/* ── Colonne droite : résultats ────────────────────────── */}
        <div className="space-y-4">
          {!results && (
            <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
              <p className="text-sm">Remplissez les champs puis cliquez sur « Calculer »</p>
            </div>
          )}

          {results && eco && (
            <>
              {/* Synthèse prix */}
              <Card>
                <CardHeader icon={ShieldCheck} title="Prix & volumes" />
                <CardBody>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Prix achat"   value={fmtUSD(n(purchasePrice),2) + '/MT'} accent="slate" />
                    <Stat label="Prix vente"   value={fmtUSD(n(salePrice),2)     + '/MT'} accent="blue" />
                    <Stat label="Montant achat" value={fmtUSD(eco.purchaseAmountOriginalCurrency,0)} hint={purchaseCcy} accent="slate" />
                    <Stat label="Montant vente" value={fmtUSD(eco.saleAmountOriginalCurrency,0)}    hint={saleCcy}    accent="blue" />
                  </div>
                </CardBody>
              </Card>

              {/* Marges */}
              <Card>
                <CardHeader icon={Calculator} title={`Marges en ${marginCcy}`} />
                <CardBody>
                  <div className="space-y-2 text-sm mb-3">
                    <Row label="Marge brute spot"     value={fmtUSD(eco.grossMarginSpot, 0)} />
                    <Row label="Marge brute forward"  value={fmtUSD(eco.grossMarginForward, 0)} />
                    <Row label="Total coûts"          value={'- ' + fmtUSD(eco.totalCosts, 0)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`px-3 py-3 rounded-md border-2 ${eco.netMarginSpot >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border-red-300'}`}>
                      <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Marge nette SPOT</div>
                      <div className={`text-xl font-bold mt-1 ${eco.netMarginSpot >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>{fmtUSD(eco.netMarginSpot, 0)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{fmtV(eco.marginPerMTSpot)} $/MT · {fmtV(eco.marginPercentSpot, 1)}%</div>
                    </div>
                    <div className={`px-3 py-3 rounded-md border-2 ${eco.netMarginForward >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300' : 'bg-red-50 dark:bg-red-900/20 border-red-300'}`}>
                      <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Marge nette FORWARD</div>
                      <div className={`text-xl font-bold mt-1 ${eco.netMarginForward >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-red-800 dark:text-red-300'}`}>{fmtUSD(eco.netMarginForward, 0)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{fmtV(eco.marginPerMTForward)} $/MT · {fmtV(eco.marginPercentForward, 1)}%</div>
                    </div>
                  </div>
                  <div className={`mt-3 px-3 py-2 rounded-md text-sm font-semibold text-center ${eco.netMarginForward > eco.netMarginSpot ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
                    Gain/perte FX grâce au forward : {eco.netMarginForward > eco.netMarginSpot ? '+' : ''}{fmtUSD(eco.netMarginForward - eco.netMarginSpot, 0)}
                    {' '}({fmtV((eco.netMarginForward - eco.netMarginSpot) / (n(quantityMT) || 1), 2)} $/MT)
                  </div>
                </CardBody>
              </Card>

              {/* Arbitrage */}
              {arb && (
                <Card>
                  <CardHeader icon={Calculator} title="Arbitrage FX — 6 combinaisons" subtitle={`Devise de marge : ${marginCcy}`} />
                  <CardBody className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase">
                          <th className="py-2 px-3 text-left">Combinaison</th>
                          <th className="py-2 px-3 text-right">Marge FWD</th>
                          <th className="py-2 px-3 text-right">$/MT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arb.allCombinations.map((c, i) => (
                          <tr key={i} className={`border-b border-slate-100 dark:border-slate-700 ${i === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 font-semibold' : ''}`}>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{c.label} {i === 0 && '⭐'}</td>
                            <td className={`py-2 px-3 text-right ${c.netMarginForward >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{fmtUSD(c.netMarginForward, 0)}</td>
                            <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{fmtV(c.marginPerMTFwd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 text-xs text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20">
                      <b>Recommandation :</b> {arb.recommendation}
                      {' · '}<b>Couvrir :</b> {fmtUSD(arb.recommendedHedgeAmount, 0)} {arb.recommendedHedgeCurrency}
                      {arb.recommendedForwardRate > 1 && ` @ ${fmtV(arb.recommendedForwardRate, 4)}`}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Scénarios de stress */}
              {sc && (
                <Card>
                  <CardHeader icon={AlertTriangle} title="Scénarios de stress FX" subtitle="Impact sur la marge nette forward" />
                  <CardBody className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase">
                          <th className="py-2 px-3 text-left">Choc FX</th>
                          <th className="py-2 px-3 text-right">Marge nette</th>
                          <th className="py-2 px-3 text-right">Signal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['−5 %', sc.fxMinus5Percent], ['−3 %', sc.fxMinus3Percent], ['−1 %', sc.fxMinus1Percent],
                          ['+1 %', sc.fxPlus1Percent],  ['+3 %', sc.fxPlus3Percent],  ['+5 %', sc.fxPlus5Percent],
                        ].map(([label, val]) => (
                          <tr key={label} className={`border-b border-slate-100 dark:border-slate-700 ${val < 0 ? 'bg-red-50 dark:bg-red-900/20' : val < n(minMargin) * n(quantityMT) ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}>
                            <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">{label}</td>
                            <td className={`py-2 px-3 text-right font-semibold ${val < 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{fmtUSD(val, 0)}</td>
                            <td className="py-2 px-3 text-right">{val < 0 ? '🔴 Négatif' : val < n(minMargin) * n(quantityMT) ? '🟡 Sous seuil' : '🟢 OK'}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 dark:bg-slate-800/40 font-semibold text-xs border-t border-slate-200 dark:border-slate-700">
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300">Pire cas / Meilleur cas</td>
                          <td colSpan={2} className="py-2 px-3 text-right">
                            <span className="text-red-700 dark:text-red-400">{fmtUSD(sc.worstCaseMargin, 0)}</span>
                            <span className="text-slate-500 dark:text-slate-400 mx-2">→</span>
                            <span className="text-emerald-700 dark:text-emerald-400">{fmtUSD(sc.bestCaseMargin, 0)}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </CardBody>
                </Card>
              )}

              {/* Verdict */}
              {vrd && VS && (
                <div className={`rounded-lg border-2 p-5 ${VS.bg} ${VS.bd}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <VS.icon className={`w-7 h-7 ${VS.txt}`} />
                    <div className={`text-2xl font-bold ${VS.txt}`}>
                      {vrd.status === 'GO' ? '✓ GO' : vrd.status === 'GO_WITH_CONDITIONS' ? '⚠ GO sous conditions' : '✗ NO-GO'}
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    {vrd.reasons.map((r, i) => <p key={i} className={`text-sm ${VS.txt}`}>• {r}</p>)}
                  </div>
                  {vrd.requiredActions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-current/20">
                      <p className="text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase">Actions requises</p>
                      {vrd.requiredActions.map((a, i) => <p key={i} className="text-xs text-slate-700 dark:text-slate-300">→ {a}</p>)}
                    </div>
                  )}
                  {/* Boutons d'action */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button variant="primary" icon={Save} onClick={() => saveToDoc(false)}>
                      {saved ? '✓ Sauvegardé' : 'Sauvegarder dans le deal'}
                    </Button>
                    <Button variant="gold" icon={ShieldCheck} onClick={() => saveToDoc(true)}
                      disabled={!dealId || validated}>
                      {validated ? '✓ Pricing validé' : 'Valider le pricing'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
