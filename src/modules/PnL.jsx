import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, AlertTriangle } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Row, Button } from '../components/UI.jsx';
import { computePnL } from '../calc/pnlCalc.js';

export default function PnL({ deals, marketPrices, onFreightSaved }) {
  const [selectedDealId, setSelectedDealId] = useState('');
  const [buyPrice,   setBuyPrice]   = useState('');
  const [sellPrice,  setSellPrice]  = useState('');
  const [quantity,   setQuantity]   = useState('6500');
  const [bblPerMT,   setBblPerMT]   = useState('7.55');
  const [freight,    setFreight]    = useState('');
  const [financing,  setFinancing]  = useState('25000');
  const [inspection, setInspection] = useState('8000');
  const [insurance,  setInsurance]  = useState('15000');
  const [demurrage,  setDemurrage]  = useState('0');
  const [other,      setOther]      = useState('0');
  const [freightSource, setFreightSource] = useState('manual'); // 'manual' | 'deal'

  useEffect(() => {
    if (!selectedDealId) return;
    const d = deals.find(x => x.id === selectedDealId);
    if (!d) return;
    setQuantity(String(d.quantity || ''));
    setBblPerMT(String(PRODUCTS[d.product]?.bblPerMT || 7.5));
    if (d.estimatedPrice != null && d.estimatedPrice !== '') {
      if (d.dealType === 'buy') setBuyPrice(String(d.estimatedPrice));
      else setSellPrice(String(d.estimatedPrice));
    }
    // Auto-importer le fret sauvegardé dans le deal
    if (d.freight?.totalFreight) {
      setFreight(String(Math.round(d.freight.totalFreight)));
      setFreightSource('deal');
    } else {
      setFreightSource('manual');
    }
  }, [selectedDealId, deals]);

  const importFreightFromDeal = () => {
    const d = deals.find(x => x.id === selectedDealId);
    if (d?.freight?.totalFreight) {
      setFreight(String(Math.round(d.freight.totalFreight)));
      setFreightSource('deal');
    }
  };

  // Fix 3 — prix de référence depuis le Dashboard
  const refBrent = marketPrices?.brent;
  const useBrentRef = () => { if (refBrent) { setBuyPrice(String(refBrent)); setSellPrice(String(refBrent)); } };

  const { totalBbl, revenue, cogs, grossMargin, costs, netMargin, marginPerBbl, marginPct, warnings } =
    computePnL({ buyPrice, sellPrice, quantity, bblPerMT, freight, financing, inspection, insurance, demurrage, other });

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
              <Field label="bbl/MT">
                <Input type="number" step="0.01" value={bblPerMT} onChange={e => setBblPerMT(e.target.value)} />
              </Field>
              <Field label="Prix d'achat ($/bbl)">
                <div className="flex gap-2">
                  <Input type="number" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="Ex. 82.50" />
                  {refBrent && (
                    <Button variant="outline" size="sm" onClick={useBrentRef} title="Utiliser Brent de référence">↗</Button>
                  )}
                </div>
              </Field>
              <Field label="Prix de vente ($/bbl)">
                <Input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="Ex. 84.00" />
              </Field>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">Coûts</p>
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
                <Field label="Financement ($)"> <Input type="number" value={financing}  onChange={e => setFinancing(e.target.value)} /></Field>
                <Field label="Inspection ($)">  <Input type="number" value={inspection} onChange={e => setInspection(e.target.value)} /></Field>
                <Field label="Assurance ($)">   <Input type="number" value={insurance}  onChange={e => setInsurance(e.target.value)} /></Field>
                <Field label="Demurrage ($)">   <Input type="number" value={demurrage}  onChange={e => setDemurrage(e.target.value)} /></Field>
                <Field label="Autres ($)">      <Input type="number" value={other}      onChange={e => setOther(e.target.value)} /></Field>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={netMargin >= 0 ? TrendingUp : TrendingDown} title="Synthèse P&amp;L" />
          <CardBody>
            <div className="space-y-2 text-sm">
              <Row label="Volume total" value={fmt(totalBbl, 0) + ' bbl'} />
              <Row label="Revenu (Sales)" value={fmtUSD(revenue, 0)} />
              <Row label="Coût (COGS)"   value={'− ' + fmtUSD(cogs, 0)} />
              <Row label="Marge brute"   value={fmtUSD(grossMargin, 0)} />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3 space-y-2 text-sm">
              <div className="text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold">Coûts opérationnels</div>
              <Row label="Fret"         value={'− ' + fmtUSD(Number(freight)    || 0, 0)} />
              <Row label="Financement"  value={'− ' + fmtUSD(Number(financing)  || 0, 0)} />
              <Row label="Inspection"   value={'− ' + fmtUSD(Number(inspection) || 0, 0)} />
              <Row label="Assurance"    value={'− ' + fmtUSD(Number(insurance)  || 0, 0)} />
              <Row label="Demurrage"    value={'− ' + fmtUSD(Number(demurrage)  || 0, 0)} />
              <Row label="Autres"       value={'− ' + fmtUSD(Number(other)      || 0, 0)} />
              <Row label="Total coûts"  value={'− ' + fmtUSD(costs, 0)} />
            </div>
            <div className={`mt-4 px-4 py-4 rounded-md border-2 ${netMargin >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-600' : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600'}`}>
              <div className={`text-xs uppercase font-bold ${netMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                Marge nette
              </div>
              <div className={`text-3xl font-bold mt-1 ${netMargin >= 0 ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-900 dark:text-red-300'}`}>
                {fmtUSD(netMargin, 0)}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {fmtUSD(marginPerBbl, 2)} / bbl • {fmt(marginPct, 2)} % du revenu
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
