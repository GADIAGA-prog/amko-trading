import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, AlertTriangle, Activity, Save, CheckCircle2 } from 'lucide-react';
import { PRODUCTS, CONTRACTS } from '../constants.js';
import { fmt } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Button } from '../components/UI.jsx';
import { TVAdvancedChart } from '../components/TradingViewWidgets.jsx';
import { computeHedge } from '../calc/hedgeCalc.js';

export default function Hedging({ deals, onHedgeSaved }) {
  const [productKey,  setProductKey]  = useState('crude-bonny');
  const [contractKey, setContractKey] = useState('brn-full');
  const [quantity,    setQuantity]    = useState('');
  const [direction,   setDirection]   = useState('short');
  const [linkedDeal,  setLinkedDeal]  = useState('');
  const [hedgeRatio,  setHedgeRatio]  = useState(100);
  const [entryPrice,  setEntryPrice]  = useState('');
  const [maturity,    setMaturity]    = useState('');
  const [bankBroker,  setBankBroker]  = useState('');
  const [notes,       setNotes]       = useState('');
  const [savedMsg,    setSavedMsg]    = useState('');

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
        if (d.hedging) {
          setContractKey(d.hedging.contractKey || contractKey);
          setEntryPrice(d.hedging.entryPrice || '');
          setMaturity(d.hedging.maturity || '');
          setBankBroker(d.hedging.bankBroker || '');
          setNotes(d.hedging.notes || '');
        }
      }
    }
  }, [linkedDeal, deals]);

  const { product, contract, qty, barrels, hedgedBarrels, lots, lotsRound, overHedge, basisRisk } =
    computeHedge({ productKey, quantity, hedgeRatio, contractKey });

  const saveHedge = () => {
    if (!linkedDeal) {
      alert('Sélectionnez d’abord le deal à couvrir.');
      return;
    }
    if (!onHedgeSaved) {
      alert('La sauvegarde du hedge n’est pas encore raccordée à la plateforme.');
      return;
    }
    const hedgeData = {
      validated: true,
      validatedAt: new Date().toISOString(),
      dealId: linkedDeal,
      productKey,
      productName: product.name,
      contractKey,
      contractName: contract.name,
      contractSize: contract.size,
      contractUnit: contract.unit,
      tvSymbol: contract.tvSymbol,
      direction,
      action: direction === 'short' ? 'SELL_FUTURES' : 'BUY_FUTURES',
      actionLabel: direction === 'short' ? 'Vendre futures / swap' : 'Acheter futures / swap',
      physicalQuantityMT: qty,
      physicalBarrels: barrels,
      hedgeRatio: Number(hedgeRatio) || 0,
      hedgedBarrels,
      theoreticalLots: lots,
      validatedLots: lotsRound,
      overHedgeLots: overHedge,
      effectiveHedgedBarrels: lotsRound * contract.size * (contract.unit === 'bbl' ? 1 : product.bblPerMT),
      basisRisk,
      entryPrice: entryPrice ? Number(entryPrice) : null,
      maturity,
      bankBroker,
      notes,
      status: 'VALIDATED',
    };
    onHedgeSaved(linkedDeal, hedgeData);
    setSavedMsg(`Hedge validé et sauvegardé dans le deal ${linkedDeal}.`);
    setTimeout(() => setSavedMsg(''), 5000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hedging — calcul et validation de couverture</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Convertir l'exposition physique en lots futures puis sauvegarder le hedge validé dans le deal
        </p>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4" /> {savedMsg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={Calculator} title="Paramètres" />
          <CardBody>
            <div className="space-y-4">
              <Field label="Deal lié à couvrir" required>
                <Select value={linkedDeal} onChange={e => setLinkedDeal(e.target.value)}>
                  <option value="">— Sélectionner un deal —</option>
                  {deals.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.id} — {PRODUCTS[d.product]?.name || d.product} — {fmt(d.quantity, 0)} MT {d.hedging?.validated ? '— hedge validé' : ''}
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
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="15000" />
              </Field>
              <Field label="Hedge ratio %" hint="Part de l'exposition à couvrir. 80-100 % recommandé selon certitude du volume.">
                <Input type="number" min="0" max="100" value={hedgeRatio} onChange={e => setHedgeRatio(e.target.value)} />
              </Field>
              <Field label="Contrat futures / swap">
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
                  <option value="short">Short — vendre futures/swap pour couvrir un achat physique ou stock long</option>
                  <option value="long">Long — acheter futures/swap pour couvrir une vente physique à prix fixe</option>
                </Select>
              </Field>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Prix/taux d’entrée"><Input type="number" step="0.01" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="ex. 1149.25" /></Field>
                <Field label="Maturité"><Input type="date" value={maturity} onChange={e => setMaturity(e.target.value)} /></Field>
                <Field label="Banque / broker"><Input value={bankBroker} onChange={e => setBankBroker(e.target.value)} placeholder="ex. Banque / ICE broker" /></Field>
              </div>
              <Field label="Notes de validation"><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="ex. Couverture 80% moyenne du mois Platts" /></Field>
              <Button variant="primary" icon={Save} onClick={saveHedge} disabled={!linkedDeal}>
                Valider & sauvegarder le hedge dans le deal
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={TrendingUp} title="Résultat" />
          <CardBody>
            <div className="space-y-3">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                {contract.unit === 'MT' ? (
                  <>
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Volume physique (MT)</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      <span className="text-blue-700 dark:text-blue-400">{fmt(qty, 0)} MT</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Volume couvert ({hedgeRatio}%) : <b>{fmt(qty * hedgeRatio / 100, 0)} MT</b>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Conversion en barils</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      {fmt(qty, 0)} MT × {product.bblPerMT} bbl/MT = <span className="text-blue-700 dark:text-blue-400">{fmt(barrels, 0)} bbl</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Volume couvert ({hedgeRatio}%) : <b>{fmt(hedgedBarrels, 0)} bbl</b>
                    </div>
                  </>
                )}
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
                    ? <>{fmt(hedgedBarrels, 0)} bbl ÷ {contract.size} bbl/lot = {fmt(lots, 2)} lots</>
                    : <>{fmt(qty * hedgeRatio / 100, 0)} MT ÷ {contract.size} MT/lot = {fmt(lots, 2)} lots</>}
                </div>
              </div>

              <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border-2 border-emerald-300 dark:border-emerald-600">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-bold">Recommandation</div>
                <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">
                  {direction === 'short' ? 'VENDRE' : 'ACHETER'} {lotsRound} lots
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {contract.unit === 'MT'
                    ? <>Couverture effective : {fmt(lotsRound * contract.size, 0)} MT ({lotsRound} lots × {contract.size} MT/lot)</>
                    : <>Couverture effective : {fmt(lotsRound * contract.size, 0)} bbl ({lotsRound} lots × {contract.size} bbl/lot)</>}
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
