import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { PRODUCTS, CONTRACTS } from '../constants.js';
import { fmt } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select } from '../components/UI.jsx';
import { TVAdvancedChart } from '../components/TradingViewWidgets.jsx';

export default function Hedging({ deals }) {
  const [productKey,  setProductKey]  = useState('crude-bonny');
  const [contractKey, setContractKey] = useState('brn-full');
  const [quantity,    setQuantity]    = useState('');
  const [direction,   setDirection]   = useState('short');
  const [linkedDeal,  setLinkedDeal]  = useState('');
  const [hedgeRatio,  setHedgeRatio]  = useState(100);

  useEffect(() => {
    const productMarker = PRODUCTS[productKey]?.marker;
    if (productMarker) {
      const match = Object.entries(CONTRACTS).find(([, c]) => c.marker === productMarker && c.size >= 500);
      if (match) setContractKey(match[0]);
    }
  }, [productKey]);

  useEffect(() => {
    if (linkedDeal) {
      const d = deals.find(x => x.id === linkedDeal);
      if (d) {
        setProductKey(d.product);
        setQuantity(String(d.quantity || ''));
        setDirection(d.dealType === 'buy' ? 'short' : 'long');
        if (d.hedgeRatio) setHedgeRatio(Number(d.hedgeRatio));
      }
    }
  }, [linkedDeal, deals]);

  const product      = PRODUCTS[productKey];
  const contract     = CONTRACTS[contractKey];
  const qty          = Number(quantity) || 0;
  const barrels      = qty * product.bblPerMT;
  const hedgedBarrels = barrels * (Number(hedgeRatio) / 100);

  let lots = 0;
  if (contract.unit === 'bbl') lots = hedgedBarrels / contract.size;
  else if (contract.unit === 'MT') lots = (qty * Number(hedgeRatio) / 100) / contract.size;

  const lotsRound = Math.round(lots);
  const overHedge = lotsRound - lots;
  const basisRisk  = product.marker !== contract.marker;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hedging — calcul de couverture</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convertir l'exposition physique en nombre de lots futures
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={Calculator} title="Paramètres" />
          <CardBody>
            <div className="space-y-4">
              <Field label="Deal lié (optionnel)">
                <Select value={linkedDeal} onChange={e => setLinkedDeal(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {deals.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.id} — {PRODUCTS[d.product]?.name} — {fmt(d.quantity, 0)} MT
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Produit (jambe physique)">
                <Select value={productKey} onChange={e => setProductKey(e.target.value)}>
                  <optgroup label="Bruts">
                    {Object.entries(PRODUCTS).filter(([, p]) => p.type === 'crude').map(([k, p]) => (
                      <option key={k} value={k}>{p.name} ({p.bblPerMT} bbl/MT)</option>
                    ))}
                  </optgroup>
                  <optgroup label="Produits raffinés">
                    {Object.entries(PRODUCTS).filter(([, p]) => p.type === 'product').map(([k, p]) => (
                      <option key={k} value={k}>{p.name} ({p.bblPerMT} bbl/MT)</option>
                    ))}
                  </optgroup>
                  <optgroup label="GPL">
                    {Object.entries(PRODUCTS).filter(([, p]) => p.type === 'gpl').map(([k, p]) => (
                      <option key={k} value={k}>{p.name} ({p.bblPerMT} bbl/MT)</option>
                    ))}
                  </optgroup>
                </Select>
              </Field>
              <Field label="Quantité physique (MT)">
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="6500" />
              </Field>
              <Field label="Hedge ratio %" hint="Part de l'exposition à couvrir (90-100% recommandé)">
                <Input type="number" min="0" max="100" value={hedgeRatio} onChange={e => setHedgeRatio(e.target.value)} />
              </Field>
              <Field label="Contrat futures">
                <Select value={contractKey} onChange={e => setContractKey(e.target.value)}>
                  <optgroup label="Brent">
                    <option value="brn-full">ICE Brent (BRN) — 1 000 bbl</option>
                    <option value="brn-mini">ICE Brent Mini (BMC) — 100 bbl</option>
                  </optgroup>
                  <optgroup label="WTI">
                    <option value="cl-full">NYMEX WTI (CL) — 1 000 bbl</option>
                    <option value="cl-mini">NYMEX E-mini WTI (QM) — 500 bbl</option>
                  </optgroup>
                  <optgroup label="Dubai">
                    <option value="dme-oman">DME Oman / Dubai — 1 000 bbl</option>
                  </optgroup>
                  <optgroup label="Produits raffinés">
                    <option value="gas-ice">ICE Gasoil (LGO) — 100 MT</option>
                    <option value="rb-nymex">NYMEX RBOB — 42 000 gal (≈ 1 000 bbl)</option>
                    <option value="ho-nymex">NYMEX ULSD / Heating Oil — 42 000 gal</option>
                  </optgroup>
                </Select>
              </Field>
              <Field label="Sens du hedge">
                <Select value={direction} onChange={e => setDirection(e.target.value)}>
                  <option value="short">Short (vendre des futures) — je couvre un stock long</option>
                  <option value="long">Long (acheter des futures) — je couvre une vente à découvert</option>
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={TrendingUp} title="Résultat" />
          <CardBody>
            <div className="space-y-3">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Conversion en barils</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {fmt(qty, 0)} MT × {product.bblPerMT} bbl/MT = <span className="text-blue-700 dark:text-blue-400">{fmt(barrels, 0)} bbl</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Volume couvert ({hedgeRatio}%) : <b>{fmt(hedgedBarrels, 0)} bbl</b>
                </div>
              </div>

              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-700">
                <div className="text-xs text-amber-700 dark:text-amber-400 uppercase">Spécification du contrat</div>
                <div className="text-sm text-slate-900 dark:text-slate-100 mt-1">{contract.name}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Taille : <b>{contract.size} {contract.unit}</b> par lot</div>
              </div>

              {basisRisk && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-300 dark:border-red-700">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4" /> BASIS RISK
                  </div>
                  <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                    Le produit est ancré au marker <b>{product.marker.toUpperCase()}</b> mais vous hedgez sur <b>{contract.marker.toUpperCase()}</b>.
                  </p>
                </div>
              )}

              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700">
                <div className="text-xs text-blue-700 dark:text-blue-400 uppercase">Lots théoriques</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">
                  {contract.unit === 'bbl'
                    ? <>{fmt(hedgedBarrels, 0)} bbl ÷ {contract.size} = {fmt(lots, 2)}</>
                    : <>{fmt(qty * hedgeRatio / 100, 0)} MT ÷ {contract.size} = {fmt(lots, 2)}</>}
                </div>
              </div>

              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border-2 border-emerald-300 dark:border-emerald-600">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-bold">Recommandation</div>
                <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                  {direction === 'short' ? 'VENDRE' : 'ACHETER'} {lotsRound} lots
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Couverture effective : {fmt(lotsRound * contract.size * (contract.unit === 'bbl' ? 1 : product.bblPerMT), 0)} bbl équivalents
                </div>
                {Math.abs(overHedge) > 0.01 && (
                  <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    {overHedge > 0 ? '⚠ Sur-couverture' : '⚠ Sous-couverture'} de {fmt(Math.abs(overHedge), 2)} lot(s).
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader icon={Activity} title="Chart du contrat futures" subtitle={contract.name} />
        <CardBody>
          <TVAdvancedChart symbol={contract.tvSymbol} height={450} interval="60" />
        </CardBody>
      </Card>
    </div>
  );
}
