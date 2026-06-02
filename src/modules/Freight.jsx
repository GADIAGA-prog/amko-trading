import React, { useState } from 'react';
import { Anchor, Calculator } from 'lucide-react';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Row } from '../components/UI.jsx';

export default function Freight() {
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

  const fr  = Number(flatRate)   || 0;
  const ws  = Number(wsRate)     || 0;
  const ac  = Number(addressCom) || 0;
  const t   = Number(tonnage)    || 0;
  const wsNet       = ws - ac;
  const baseFreight = fr * (wsNet / 100) * t;
  const seca        = (Number(secaNm) || 0) * (Number(secaRate) || 0);
  const other       = Number(otherCosts) || 0;
  const totalWS     = baseFreight + seca + other;
  const demurrage   = (Number(demHours) / 24) * Number(demRate);
  const lumpsumTotal  = (Number(lumpsum) || 0) + seca + other;
  const totalFreight  = mode === 'ws' ? totalWS : lumpsumTotal;
  const freightPerMT  = t > 0 ? totalFreight / t : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Calculateur de fret</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Coût de fret en Worldscale ou Lumpsum</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
