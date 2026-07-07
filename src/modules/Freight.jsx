import React, { useState, useEffect } from 'react';
import { Anchor, Calculator, Save, CheckCircle2 } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Row, Button } from '../components/UI.jsx';

// Construit un objet freight sauvegardable depuis les états locaux
function buildFreightData(mode, flatRate, wsRate, addressCom, tonnage, secaNm, secaRate, otherCosts, lumpsum, demHours, demRate, totalFreight, freightPerMT) {
  return {
    mode,
    flatRate: Number(flatRate) || 0,
    wsRate: Number(wsRate) || 0,
    addressCom: Number(addressCom) || 0,
    tonnage: Number(tonnage) || 0,
    secaNm: Number(secaNm) || 0,
    secaRate: Number(secaRate) || 0,
    otherCosts: Number(otherCosts) || 0,
    lumpsum: Number(lumpsum) || 0,
    demHours: Number(demHours) || 0,
    demRate: Number(demRate) || 0,
    totalFreight,
    freightPerMT,
    savedAt: new Date().toISOString(),
  };
}

export default function Freight({ deals = [], onFreightSaved, initialDealId }) {
  const [linkedDealId, setLinkedDealId] = useState('');
  const [saved,        setSaved]        = useState(false);

  const [flatRate,    setFlatRate]    = useState('18.46');
  const [wsRate,      setWsRate]      = useState('80');
  const [addressCom,  setAddressCom]  = useState('1.25');
  const [tonnage,     setTonnage]     = useState('130000');
  const [secaNm,      setSecaNm]      = useState('423');
  const [secaRate,    setSecaRate]    = useState('33');
  const [otherCosts,  setOtherCosts]  = useState('0');
  const [mode,        setMode]        = useState('ws');
  const [lumpsum,     setLumpsum]     = useState('');
  const [demHours,    setDemHours]    = useState('0');
  const [demRate,     setDemRate]     = useState('25000');

  useEffect(() => {
    if (initialDealId && deals.some(d => d.id === initialDealId)) setLinkedDealId(initialDealId);
  }, [initialDealId]);

  // ── Pré-remplir depuis le deal sélectionné ────────────────────
  useEffect(() => {
    if (!linkedDealId) return;
    const d = deals.find(x => x.id === linkedDealId);
    if (!d) return;
    setSaved(false);

    // Si le deal a un fret sauvegardé → restaurer tous les champs
    if (d.freight) {
      const fr = d.freight;
      setMode(fr.mode || 'ws');
      setFlatRate(String(fr.flatRate ?? 18.46));
      setWsRate(String(fr.wsRate ?? 80));
      setAddressCom(String(fr.addressCom ?? 1.25));
      setTonnage(String(fr.tonnage || d.quantity || 130000));
      setSecaNm(String(fr.secaNm ?? 0));
      setSecaRate(String(fr.secaRate ?? 0));
      setOtherCosts(String(fr.otherCosts ?? 0));
      setLumpsum(String(fr.lumpsum ?? ''));
      setDemHours(String(fr.demHours ?? 0));
      setDemRate(String(fr.demRate ?? 25000));
    } else {
      // Pré-remplir la tonnage depuis la quantité du deal
      if (d.quantity) setTonnage(String(d.quantity));
    }
  }, [linkedDealId]);

  const fr  = Number(flatRate)   || 0;
  const ws  = Number(wsRate)     || 0;
  const ac  = Number(addressCom) || 0;
  const t   = Number(tonnage)    || 0;
  // La commission d'adresse est un % du fret brut (usage marché), pas des points WS.
  const wsNet       = ws * (1 - ac / 100);
  const baseFreight = fr * (wsNet / 100) * t;
  const seca        = (Number(secaNm) || 0) * (Number(secaRate) || 0);
  const other       = Number(otherCosts) || 0;
  const totalWS     = baseFreight + seca + other;
  const demurrage   = (Number(demHours) / 24) * Number(demRate);
  const lumpsumTotal  = (Number(lumpsum) || 0) + seca + other;
  const totalFreight  = mode === 'ws' ? totalWS : lumpsumTotal;
  const freightPerMT  = t > 0 ? totalFreight / t : 0;

  // ── Sauvegarder dans le deal ─────────────────────────────────
  const saveToDeal = () => {
    if (!linkedDealId || !onFreightSaved) return;
    const data = buildFreightData(
      mode, flatRate, wsRate, addressCom, tonnage,
      secaNm, secaRate, otherCosts, lumpsum, demHours, demRate,
      totalFreight, freightPerMT,
    );
    onFreightSaved(linkedDealId, data);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const linkedDeal = deals.find(d => d.id === linkedDealId);
  const hasSavedFreight = !!(linkedDeal?.freight);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Calculateur de fret</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Coût de fret en Worldscale ou Lumpsum — liaison directe avec un deal
        </p>
      </div>

      {/* ── Liaison deal ─────────────────────────────────────── */}
      <Card>
        <CardHeader icon={Anchor} title="Lier à un deal"
          subtitle={hasSavedFreight ? `Fret sauvegardé le ${linkedDeal.freight.savedAt?.slice(0,10)}` : 'Pré-remplit la tonnage depuis la quantité du deal'}
          action={
            linkedDealId ? (
              <div className="flex gap-2 items-center">
                {saved && (
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Sauvegardé
                  </div>
                )}
                <Button variant="primary" size="sm" icon={Save} onClick={saveToDeal}>
                  Enregistrer dans le deal
                </Button>
              </div>
            ) : null
          }
        />
        <CardBody>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Deal lié (optionnel)">
              <Select value={linkedDealId} onChange={e => setLinkedDealId(e.target.value)}>
                <option value="">— Calcul libre —</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.id} — {PRODUCTS[d.product]?.name || d.product} — {d.counterparty}
                    {d.freight ? ' ✓' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            {linkedDeal && (
              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <span>Quantité deal : <b className="text-slate-900 dark:text-slate-100">{linkedDeal.quantity} MT</b></span>
                {linkedDeal.vessel && <span>Navire : <b className="text-slate-900 dark:text-slate-100">{linkedDeal.vessel}</b></span>}
                <span className={hasSavedFreight ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400'}>
                  {hasSavedFreight ? '✓ Fret enregistré' : '⚡ Nouveau calcul'}
                </span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Paramètres ──────────────────────────────────────── */}
        <Card>
          <CardHeader icon={Anchor} title="Paramètres du voyage" />
          <CardBody>
            <Field label="Mode de cotation">
              <Select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="ws">Worldscale (WS)</option>
                <option value="lumpsum">Lumpsum (forfait)</option>
              </Select>
            </Field>

            {mode === 'ws' ? (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Flat Rate ($/MT)">
                  <Input type="number" step="0.01" value={flatRate} onChange={e => setFlatRate(e.target.value)} />
                </Field>
                <Field label="Niveau WS (base 100)">
                  <Input type="number" step="0.1" value={wsRate} onChange={e => setWsRate(e.target.value)} />
                </Field>
                <Field label="Address Commission %">
                  <Input type="number" step="0.01" value={addressCom} onChange={e => setAddressCom(e.target.value)} />
                </Field>
                <Field label="Tonnage (MT)">
                  <Input type="number" value={tonnage} onChange={e => setTonnage(e.target.value)} />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Lumpsum total ($)">
                  <Input type="number" value={lumpsum} onChange={e => setLumpsum(e.target.value)} />
                </Field>
                <Field label="Tonnage (MT)">
                  <Input type="number" value={tonnage} onChange={e => setTonnage(e.target.value)} />
                </Field>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Coûts additionnels</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="SECA — distance (Nm)">
                  <Input type="number" value={secaNm} onChange={e => setSecaNm(e.target.value)} />
                </Field>
                <Field label="SECA — taux ($/Nm)">
                  <Input type="number" value={secaRate} onChange={e => setSecaRate(e.target.value)} />
                </Field>
                <Field label="Autres coûts ($)">
                  <Input type="number" value={otherCosts} onChange={e => setOtherCosts(e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Demurrage (optionnel)</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Heures de dépassement">
                  <Input type="number" value={demHours} onChange={e => setDemHours(e.target.value)} />
                </Field>
                <Field label="Taux ($/jour)">
                  <Input type="number" value={demRate} onChange={e => setDemRate(e.target.value)} />
                </Field>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── Résultat ─────────────────────────────────────────── */}
        <Card>
          <CardHeader icon={Calculator} title="Résultat" />
          <CardBody>
            {mode === 'ws' ? (
              <div className="space-y-3">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-md text-sm">
                  <div className="font-semibold mb-2 text-slate-700 dark:text-slate-300">Formule</div>
                  <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    Fret = Flat Rate × (WS − AdrComm) / 100 × Tonnage + SECA + Autres
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="WS net"       value={fmt(wsNet, 2)} />
                  <Row label="Fret de base" value={fmtUSD(baseFreight, 0)} />
                  <Row label="SECA"         value={fmtUSD(seca, 0)} />
                  <Row label="Autres coûts" value={fmtUSD(other, 0)} />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <Row label="Lumpsum"      value={fmtUSD(Number(lumpsum) || 0, 0)} />
                <Row label="SECA"         value={fmtUSD(seca, 0)} />
                <Row label="Autres coûts" value={fmtUSD(other, 0)} />
              </div>
            )}

            <div className="mt-4 pt-4 border-t-2 border-blue-200 dark:border-blue-700 space-y-2">
              <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border-2 border-blue-300 dark:border-blue-600">
                <div className="text-xs text-blue-700 dark:text-blue-400 uppercase font-bold">Fret total</div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-200 mt-1">{fmtUSD(totalFreight, 0)}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{fmtUSD(freightPerMT, 2)} par MT</div>
              </div>
              {Number(demHours) > 0 && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-700">
                  <div className="text-xs text-red-700 dark:text-red-400 uppercase">Demurrage</div>
                  <div className="text-xl font-bold text-red-900 dark:text-red-300 mt-1">{fmtUSD(demurrage, 0)}</div>
                </div>
              )}
            </div>

            {/* ── Récap si deal lié ──────────────────────────── */}
            {linkedDeal && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Impact sur le deal</p>
                <div className="space-y-1.5 text-sm">
                  <Row label="Volume deal"   value={`${linkedDeal.quantity} MT`} />
                  <Row label="Fret / MT"     value={fmtUSD(freightPerMT, 2)} />
                  <Row
                    label="Fret total deal"
                    value={fmtUSD(freightPerMT * (Number(linkedDeal.quantity) || 0), 0)}
                  />
                </div>
                <Button
                  variant="primary" icon={Save} onClick={saveToDeal}
                  className="w-full mt-3 justify-center">
                  Enregistrer ce fret dans le deal {linkedDeal.id}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
