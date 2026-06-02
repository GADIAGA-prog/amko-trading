import React, { useState, useEffect } from 'react';
import { DollarSign, Calculator } from 'lucide-react';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Row, Button } from '../components/UI.jsx';

const MARKER_TO_KEY = { brent: 'brent', wti: 'wti', gasoil: 'gasoil', dubai: 'brent', 'argus-asci': 'brent' };

export default function Pricing({ marketPrices }) {
  const [marker,         setMarker]        = useState('brent');
  const [markerPrice,    setMarkerPrice]   = useState('');
  const [qualitySpread,  setQualitySpread] = useState('1.05');
  const [apiSulphurAdj,  setApiSulphurAdj] = useState('0.06');
  const [traderMargin,   setTraderMargin]  = useState('0.10');
  const [quantityMT,     setQuantityMT]    = useState('6500');
  const [bblPerMT,       setBblPerMT]      = useState('7.55');

  // Fix 3 — pré-remplit le prix marker depuis les prix de référence du Dashboard
  const useRefPrice = () => {
    const key = MARKER_TO_KEY[marker] || 'brent';
    const ref = marketPrices?.[key];
    if (ref) setMarkerPrice(String(ref));
  };

  const hasRefPrice = !!marketPrices?.[MARKER_TO_KEY[marker] || 'brent'];

  const diff       = (Number(qualitySpread) || 0) + (Number(apiSulphurAdj) || 0) + (Number(traderMargin) || 0);
  const finalPrice = (Number(markerPrice) || 0) + diff;
  const totalBbl   = (Number(quantityMT) || 0) * (Number(bblPerMT) || 0);
  const notional   = totalBbl * finalPrice;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Formule de prix</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Construction d'un prix indexé Platts / Argus</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={DollarSign} title="Construction de la formule" />
          <CardBody>
            <div className="space-y-3">
              <Field label="Marker / Benchmark">
                <Select value={marker} onChange={e => setMarker(e.target.value)}>
                  <option value="brent">Platts Mean Brent Dated</option>
                  <option value="wti">WTI</option>
                  <option value="dubai">Dubai</option>
                  <option value="argus-asci">Argus ASCI</option>
                </Select>
              </Field>
              <Field label="Prix marker ($/bbl)" hint="Moyenne sur la période de pricing">
                <div className="flex gap-2">
                  <Input type="number" step="0.01" value={markerPrice}
                    onChange={e => setMarkerPrice(e.target.value)} placeholder="Ex. 82.50" />
                  {hasRefPrice && (
                    <Button variant="outline" size="sm" onClick={useRefPrice}
                      title="Utiliser le prix de référence du Dashboard">
                      ↗ Réf.
                    </Button>
                  )}
                </div>
              </Field>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Composantes du différentiel</p>
                <div className="space-y-3">
                  <Field label="Spread brut/marker ($/bbl)">
                    <Input type="number" step="0.01" value={qualitySpread} onChange={e => setQualitySpread(e.target.value)} />
                  </Field>
                  <Field label="Ajustement API/soufre ($/bbl)">
                    <Input type="number" step="0.01" value={apiSulphurAdj} onChange={e => setApiSulphurAdj(e.target.value)} />
                  </Field>
                  <Field label="Marge trader ($/bbl)">
                    <Input type="number" step="0.01" value={traderMargin} onChange={e => setTraderMargin(e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Quantité (notional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantité (MT)">
                    <Input type="number" value={quantityMT} onChange={e => setQuantityMT(e.target.value)} />
                  </Field>
                  <Field label="bbl/MT">
                    <Input type="number" step="0.01" value={bblPerMT} onChange={e => setBblPerMT(e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={Calculator} title="Résultat" />
          <CardBody>
            <div className="space-y-2 text-sm">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-md font-mono text-xs text-slate-600 dark:text-slate-400">
                Prix = Marker + (Spread + Ajustement + Marge)
              </div>
              <Row label="Marker"           value={fmtUSD(Number(markerPrice) || 0, 2) + '/bbl'} />
              <Row label="Spread qualité"   value={'+ ' + fmtUSD(Number(qualitySpread) || 0, 2)} />
              <Row label="Ajustement API/S" value={'+ ' + fmtUSD(Number(apiSulphurAdj) || 0, 2)} />
              <Row label="Marge trader"     value={'+ ' + fmtUSD(Number(traderMargin)  || 0, 2)} />
              <Row label="Différentiel total" value={fmtUSD(diff, 2) + '/bbl'} />
            </div>
            <div className="mt-4 pt-4 border-t-2 border-emerald-200 dark:border-emerald-700 space-y-2">
              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border-2 border-emerald-300 dark:border-emerald-600">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-bold">Prix final</div>
                <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{fmtUSD(finalPrice, 2)} / bbl</div>
              </div>
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
                <div className="text-xs text-blue-700 dark:text-blue-400 uppercase">Notional de la cargaison</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">{fmtUSD(notional, 0)}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {fmt(totalBbl, 0)} bbl × {fmtUSD(finalPrice, 2)}/bbl
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
