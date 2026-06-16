import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, AlertTriangle, Save, CheckCircle2 } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Row, Button } from '../components/UI.jsx';
import { computePnL } from '../calc/pnlCalc.js';

const FINANCING_INSTRUMENTS = [
  'Lettre de crédit (LC)',
  'Standby LC (SBLC)',
  'Avance sur stock / Borrowing base',
  'Prêt transactionnel',
  'Escompte / Discounting',
  'Fonds propres',
  'Autre',
];

export default function PnL({ deals, marketPrices, onFreightSaved, onPnLSaved }) {
  const [selectedDealId, setSelectedDealId] = useState('');
  const [buyPrice,   setBuyPrice]   = useState('');
  const [sellPrice,  setSellPrice]  = useState('');
  const [quantity,   setQuantity]   = useState('6500');
  const [freight,    setFreight]    = useState('');
  const [financing,  setFinancing]  = useState('25000');
  const [financingInstrument, setFinancingInstrument] = useState('Lettre de crédit (LC)');
  const [inspection, setInspection] = useState('8000');
  const [insurance,  setInsurance]  = useState('15000');
  const [demurrage,  setDemurrage]  = useState('0');
  const [other,      setOther]      = useState('0');
  const [hedgingResult, setHedgingResult] = useState('0');
  const [fxResult,      setFxResult]      = useState('0');
  const [freightSource, setFreightSource] = useState('manual'); // 'manual' | 'deal'

  useEffect(() => {
    if (!selectedDealId) return;
    const d = deals.find(x => x.id === selectedDealId);
    if (!d) return;
    setQuantity(String(d.quantity || ''));

    // 1) Si un P&L a déjà été validé pour ce deal → restaurer toutes ses hypothèses
    if (d.pnl) {
      const p = d.pnl;
      setBuyPrice(String(p.buyPrice ?? ''));
      setSellPrice(String(p.sellPrice ?? ''));
      setFreight(String(p.freight ?? ''));
      setInspection(String(p.inspection ?? '0'));
      setInsurance(String(p.insurance ?? '0'));
      setDemurrage(String(p.demurrage ?? '0'));
      setOther(String(p.other ?? '0'));
      setFinancingInstrument(p.financingInstrument ?? 'Lettre de crédit (LC)');
      setFinancing(String(p.financing ?? '0'));
      setHedgingResult(String(p.hedgingResult ?? '0'));
      setFxResult(String(p.fxResult ?? '0'));
      setFreightSource('manual');
      return;
    }

    // 2) Sinon, pré-remplir depuis les autres modules du deal
    //    Prix achat et prix vente sont désormais portés par le deal.
    const dealBuy  = d.purchasePrice ?? (d.dealType === 'buy'  ? d.estimatedPrice : '');
    const dealSell = d.salePrice     ?? (d.dealType === 'sell' ? d.estimatedPrice : '');
    if (dealBuy  != null && dealBuy  !== '') setBuyPrice(String(dealBuy));
    if (dealSell != null && dealSell !== '') setSellPrice(String(dealSell));
    // Fret sauvegardé
    if (d.freight?.totalFreight) {
      setFreight(String(Math.round(d.freight.totalFreight)));
      setFreightSource('deal');
    } else {
      setFreightSource('manual');
    }
    // Résultat hedging (module Hedging)
    if (d.hedging?.pnlResult != null) {
      setHedgingResult(String(Math.round(d.hedging.pnlResult)));
    }
    // Résultat couverture FX (module Couverture FX)
    if (d.fxHedge?.fxResult != null) {
      setFxResult(String(Math.round(d.fxHedge.fxResult)));
    }
  }, [selectedDealId, deals]);

  const importFreightFromDeal = () => {
    const d = deals.find(x => x.id === selectedDealId);
    if (d?.freight?.totalFreight) {
      setFreight(String(Math.round(d.freight.totalFreight)));
      setFreightSource('deal');
    }
  };

  const {
    qty, revenue, cogs, commercialMargin, operationalCosts, financingCost, hedge, fx,
    pnl1, pnl2, pnl3,
    pnl1PerMT, pnl2PerMT, pnl3PerMT,
    pnl1Pct, pnl2Pct, pnl3Pct,
    warnings,
  } = computePnL({
    buyPrice, sellPrice, quantity,
    freight, inspection, insurance, demurrage, other,
    financing,
    hedgingResult, fxResult,
  });

  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(false); }, [selectedDealId]);

  const savePnLToDeal = () => {
    if (!selectedDealId || !onPnLSaved) return;
    onPnLSaved(selectedDealId, {
      buyPrice: Number(buyPrice) || 0,
      sellPrice: Number(sellPrice) || 0,
      quantity: qty,
      freight: Number(freight) || 0,
      inspection: Number(inspection) || 0,
      insurance: Number(insurance) || 0,
      demurrage: Number(demurrage) || 0,
      other: Number(other) || 0,
      financingInstrument,
      financing: financingCost,
      hedgingResult: hedge,
      fxResult: fx,
      pnl1, pnl2, pnl3,
      pnl1PerMT, pnl2PerMT, pnl3PerMT,
      savedAt: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">P&amp;L du deal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Calcul de la marge finale</p>
      </div>

      <Card>
        <CardHeader icon={BarChart3} title="Lier à un deal (optionnel)" />
        <CardBody>
          <Select value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)}>
            <option value="">— Calcul libre —</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {d.id} — {PRODUCTS[d.product]?.name} — {fmt(d.quantity, 0)} MT
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {warnings.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <ul className="space-y-0.5">{warnings.map(w => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={DollarSign} title="Prix et quantités" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantité (MT)">
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </Field>
              <div />
              <Field label="Prix d'achat ($/MT)">
                <Input type="number" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="Ex. 1181.75" />
              </Field>
              <Field label="Prix de vente ($/MT)">
                <Input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="Ex. 1320.75" />
              </Field>
            </div>

            {/* ── Coûts directs (P&L 1) ─────────────────────────── */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Coûts directs (jambe physique)</p>
                {selectedDealId && deals.find(d => d.id === selectedDealId)?.freight && freightSource !== 'deal' && (
                  <button onClick={importFreightFromDeal}
                    className="text-xs text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1">
                    ⬇ Importer le fret sauvegardé du deal
                  </button>
                )}
                {freightSource === 'deal' && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Fret du deal
                  </span>
                )}
                {freightSource === 'manual' && selectedDealId && freight && onFreightSaved && (
                  <button onClick={() => onFreightSaved(selectedDealId, Number(freight))}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1">
                    ↑ Enregistrer ce fret dans le deal
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fret ($)" hint={freightSource === 'deal' ? `Fret calculateur : ${fmtUSD(Number(freight)||0,0)}` : undefined}>
                  <Input type="number" value={freight} onChange={e => { setFreight(e.target.value); setFreightSource('manual'); }} /></Field>
                <Field label="Inspection ($)">  <Input type="number" value={inspection} onChange={e => setInspection(e.target.value)} /></Field>
                <Field label="Assurance ($)">   <Input type="number" value={insurance}  onChange={e => setInsurance(e.target.value)} /></Field>
                <Field label="Demurrage ($)">   <Input type="number" value={demurrage}  onChange={e => setDemurrage(e.target.value)} /></Field>
                <Field label="Autres ($)">      <Input type="number" value={other}      onChange={e => setOther(e.target.value)} /></Field>
              </div>
            </div>

            {/* ── Financement (P&L 2) ───────────────────────────── */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">Financement (trade finance)</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Instrument de financement">
                  <Select value={financingInstrument} onChange={e => setFinancingInstrument(e.target.value)}>
                    {FINANCING_INSTRUMENTS.map(i => <option key={i}>{i}</option>)}
                  </Select>
                </Field>
                <Field label="Coût du financement ($)" hint="Intérêts + frais de l'instrument">
                  <Input type="number" value={financing} onChange={e => setFinancing(e.target.value)} />
                </Field>
              </div>
            </div>

            {/* ── Hedging & FX (P&L 3) ──────────────────────────── */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-2">Couverture (hedging & FX)</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Résultat hedging ($)" hint="Gain (+) / perte (−) sur futures/swap">
                  <Input type="number" value={hedgingResult} onChange={e => setHedgingResult(e.target.value)} />
                </Field>
                <Field label="Résultat couverture FX ($)" hint="Gain (+) / perte (−) sur forward FX">
                  <Input type="number" value={fxResult} onChange={e => setFxResult(e.target.value)} />
                </Field>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={pnl3 >= 0 ? TrendingUp : TrendingDown} title="Synthèse P&amp;L — 3 niveaux" />
          <CardBody>
            {/* Base commerciale */}
            <div className="space-y-2 text-sm">
              <Row label="Volume" value={fmt(qty, 0) + ' MT'} />
              <Row label="Revenu (vente)" value={fmtUSD(revenue, 0)} />
              <Row label="Coût (achat)"   value={'− ' + fmtUSD(cogs, 0)} />
              <Row label="Marge commerciale" value={fmtUSD(commercialMargin, 0)} />
              <Row label="Coûts directs"  value={'− ' + fmtUSD(operationalCosts, 0)} />
            </div>

            {/* ── P&L 1 — Marge brute ──────────────────────────── */}
            <PnLLevel
              n={1} label="Marge brute" sub="Vente − Achat − coûts directs"
              value={pnl1} perMT={pnl1PerMT} pct={pnl1Pct} accent="slate" />

            {/* Financement */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3 space-y-2 text-sm">
              <Row label={`Financement — ${financingInstrument}`} value={'− ' + fmtUSD(financingCost, 0)} />
            </div>

            {/* ── P&L 2 — Marge après financement ──────────────── */}
            <PnLLevel
              n={2} label="Marge après financement" sub="P&L 1 − coût du financement"
              value={pnl2} perMT={pnl2PerMT} pct={pnl2Pct} accent="blue" />

            {/* Couverture */}
            <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3 space-y-2 text-sm">
              <Row label="Résultat hedging" value={(hedge >= 0 ? '+ ' : '− ') + fmtUSD(Math.abs(hedge), 0)} />
              <Row label="Résultat couverture FX" value={(fx >= 0 ? '+ ' : '− ') + fmtUSD(Math.abs(fx), 0)} />
            </div>

            {/* ── P&L 3 — Marge nette ──────────────────────────── */}
            <PnLLevel
              n={3} label="Marge nette" sub="P&L 2 + hedging + couverture FX"
              value={pnl3} perMT={pnl3PerMT} pct={pnl3Pct} accent="result" big />

            {/* ── Validation ───────────────────────────────────── */}
            <div className="mt-4 flex items-center justify-end gap-3">
              {saved && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> P&amp;L validé dans le deal
                </span>
              )}
              <Button variant="primary" icon={Save} onClick={savePnLToDeal} disabled={!selectedDealId}>
                Valider le P&amp;L
              </Button>
            </div>
            {!selectedDealId && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1">
                Liez un deal ci-dessus pour pouvoir valider.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// Bloc de niveau de P&L (badge numéroté + montant + marge/MT + %)
function PnLLevel({ n, label, sub, value, perMT, pct, accent = 'slate', big = false }) {
  const pos = value >= 0;
  const theme = accent === 'result'
    ? (pos
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-600'
        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600')
    : accent === 'blue'
      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600';
  const valueColor = accent === 'result'
    ? (pos ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-900 dark:text-red-300')
    : !pos ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-slate-100';
  return (
    <div className={`mt-3 px-4 py-3 rounded-md border-2 ${theme}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {n}
          </span>
          <div>
            <div className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300">P&amp;L {n} — {label}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`${big ? 'text-3xl' : 'text-xl'} font-bold ${valueColor}`}>{fmtUSD(value, 0)}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            {fmtUSD(perMT, 2)} /MT • {fmt(pct, 2)} %
          </div>
        </div>
      </div>
    </div>
  );
}
