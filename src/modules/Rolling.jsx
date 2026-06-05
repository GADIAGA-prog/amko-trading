import React, { useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Calculator, Trash2, Save } from 'lucide-react';
import { CONTRACTS } from '../constants.js';
import { fmt, fmtUSD } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Button, Stat, Row } from '../components/UI.jsx';
import { computeRoll } from '../calc/rollCalc.js';

// ── Rolling : explication métier ─────────────────────────────────
// SHORT hedger (couvre un stock physique long) :
//   Roll = racheter M_near + vendre M_far
//   Net roll P&L / bbl = prix M_far − prix M_near = roll spread
//   Contango (spread > 0) → crédit de roll (favorable)
//   Backwardation (spread < 0) → coût de roll (défavorable)
//
// LONG hedger (couvre une vente à terme) :
//   Roll = vendre M_near + acheter M_far
//   Net roll P&L / bbl = prix M_near − prix M_far = −roll spread
//   Contango → coût de roll (défavorable)
//   Backwardation → crédit de roll (favorable)

const ROLL_HISTORY_KEY = 'amko_roll_history';

function loadRollHistory() {
  try { const v = localStorage.getItem(ROLL_HISTORY_KEY); return v ? JSON.parse(v) : []; }
  catch { return []; }
}
function saveRollHistory(h) {
  try { localStorage.setItem(ROLL_HISTORY_KEY, JSON.stringify(h.slice(0, 50))); }
  catch {}
}

const MONTHS = [
  'M+1 (proche)', 'M+2', 'M+3', 'M+4', 'M+5', 'M+6', 'M+7', 'M+8', 'M+9', 'M+10', 'M+11', 'M+12',
];

export default function Rolling({ deals }) {
  const [contractKey, setContractKey] = useState('brn-full');
  const [direction,   setDirection]   = useState('short');
  const [lots,        setLots]        = useState('');
  const [fromMonth,   setFromMonth]   = useState('M+1 (proche)');
  const [toMonth,     setToMonth]     = useState('M+2');
  const [priceNear,   setPriceNear]   = useState('');
  const [priceFar,    setPriceFar]    = useState('');
  const [linkedDeal,  setLinkedDeal]  = useState('');
  const [notes,       setNotes]       = useState('');
  const [history,     setHistory]     = useState(loadRollHistory);

  const nLots = Number(lots)      || 0;
  const pNear = Number(priceNear) || 0;
  const pFar  = Number(priceFar)  || 0;

  const { contract, rollSpread, totalBbl, netPerBbl, totalRoll, isCredit, structure } =
    computeRoll({ position: direction, frontPrice: pNear, nextPrice: pFar, nLots, contractKey });

  const canCalc = nLots > 0 && pNear > 0 && pFar > 0;

  const interpretation = useMemo(() => {
    if (!canCalc) return null;
    if (direction === 'short') {
      if (rollSpread > 0) return {
        color: 'emerald',
        text: `Marché en CONTANGO : vous roulez une position short. Vous rachetez ${fromMonth} à ${fmt(pNear, 2)} $ et revendez ${toMonth} à ${fmt(pFar, 2)} $. Le contango vous génère un crédit de roll.`,
      };
      return {
        color: 'red',
        text: `Marché en BACKWARDATION : vous roulez une position short. Vous rachetez ${fromMonth} à ${fmt(pNear, 2)} $ et revendez ${toMonth} à ${fmt(pFar, 2)} $, moins cher. Le roll vous coûte de l'argent.`,
      };
    } else {
      if (rollSpread > 0) return {
        color: 'red',
        text: `Marché en CONTANGO : vous roulez une position long. Vous vendez ${fromMonth} à ${fmt(pNear, 2)} $ et rachetez ${toMonth} à ${fmt(pFar, 2)} $, plus cher. Le roll vous coûte de l'argent.`,
      };
      return {
        color: 'emerald',
        text: `Marché en BACKWARDATION : vous roulez une position long. Vous vendez ${fromMonth} à ${fmt(pNear, 2)} $ et rachetez ${toMonth} à ${fmt(pFar, 2)} $, moins cher. Le backwardation vous génère un crédit de roll.`,
      };
    }
  }, [canCalc, direction, rollSpread, fromMonth, toMonth, pNear, pFar]);

  const saveRoll = () => {
    if (!canCalc) return;
    const entry = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      contractKey,
      contractName: contract.name,
      direction,
      lots: nLots,
      fromMonth, toMonth,
      priceNear: pNear, priceFar: pFar,
      rollSpread,
      netPerBbl,
      totalRoll,
      linkedDeal: linkedDeal || null,
      notes: notes || '',
      recordedAt: new Date().toISOString(),
    };
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
    saveRollHistory(next);
    setNotes('');
  };

  const deleteEntry = (id) => {
    const next = history.filter(e => e.id !== id);
    setHistory(next); saveRollHistory(next);
  };

  const colorClass = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', bd: 'border-emerald-300 dark:border-emerald-600', txt: 'text-emerald-800 dark:text-emerald-300' },
    red:     { bg: 'bg-red-50 dark:bg-red-900/20',         bd: 'border-red-300 dark:border-red-600',         txt: 'text-red-800 dark:text-red-300' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',     bd: 'border-amber-300 dark:border-amber-600',     txt: 'text-amber-800 dark:text-amber-300' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Rolling de position futures</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Calculer le coût ou le crédit du roll avant l'expiration du contrat proche
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Paramètres ──────────────────────────────────────── */}
        <Card>
          <CardHeader icon={Calculator} title="Paramètres du roll" />
          <CardBody>
            <div className="space-y-4">
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
                    <option value="rb-nymex">NYMEX RBOB — ≈ 1 000 bbl</option>
                    <option value="ho-nymex">NYMEX ULSD — ≈ 1 000 bbl</option>
                  </optgroup>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Position actuelle">
                  <Select value={direction} onChange={e => setDirection(e.target.value)}>
                    <option value="short">SHORT (vendeur de futures)</option>
                    <option value="long">LONG (acheteur de futures)</option>
                  </Select>
                </Field>
                <Field label="Nombre de lots">
                  <Input type="number" min="1" value={lots}
                    onChange={e => setLots(e.target.value)} placeholder="Ex. 50" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Rouler DE">
                  <Select value={fromMonth} onChange={e => setFromMonth(e.target.value)}>
                    {MONTHS.map(m => <option key={m}>{m}</option>)}
                  </Select>
                </Field>
                <Field label="Rouler VERS">
                  <Select value={toMonth} onChange={e => setToMonth(e.target.value)}>
                    {MONTHS.filter(m => m !== fromMonth).map(m => <option key={m}>{m}</option>)}
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={`Prix ${fromMonth} ($/bbl)`}
                  hint="Prix actuel du contrat proche">
                  <Input type="number" step="0.01" value={priceNear}
                    onChange={e => setPriceNear(e.target.value)} placeholder="Ex. 82.50" />
                </Field>
                <Field label={`Prix ${toMonth} ($/bbl)`}
                  hint="Prix actuel du contrat lointain">
                  <Input type="number" step="0.01" value={priceFar}
                    onChange={e => setPriceFar(e.target.value)} placeholder="Ex. 82.80" />
                </Field>
              </div>

              <Field label="Deal lié (optionnel)">
                <Select value={linkedDeal} onChange={e => setLinkedDeal(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.id} — {d.counterparty}</option>)}
                </Select>
              </Field>

              <Field label="Notes">
                <Input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Raison du roll, contexte marché…" />
              </Field>
            </div>
          </CardBody>
        </Card>

        {/* ── Résultat ────────────────────────────────────────── */}
        <Card>
          <CardHeader icon={canCalc ? (isCredit ? TrendingUp : TrendingDown) : Calculator}
            title="Résultat du roll" />
          <CardBody>
            {!canCalc ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                Renseignez les lots et les deux prix pour voir le résultat.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Structure */}
                <div className={`px-4 py-3 rounded-md border-2 ${
                  structure === 'CONTANGO'      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400'    :
                  structure === 'BACKWARDATION' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400' :
                  'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                }`}>
                  <div className="text-xs uppercase font-semibold text-slate-600 dark:text-slate-400">Structure du marché</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{structure}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    Roll spread : <b>{rollSpread >= 0 ? '+' : ''}{fmt(rollSpread, 2)} $/bbl</b>
                    &nbsp;({fromMonth} → {toMonth})
                  </div>
                </div>

                {/* Détail du roll */}
                <div className="space-y-2 text-sm">
                  <Row label="Contrat"          value={contract.name} />
                  <Row label="Position"         value={`${direction.toUpperCase()} × ${nLots} lots`} />
                  <Row label="Volume total"     value={`${fmt(totalBbl, 0)} ${contract.unit}`} />
                  <Row label={`Prix ${fromMonth}`} value={`${fmtUSD(pNear, 2)} / ${contract.unit}`} />
                  <Row label={`Prix ${toMonth}`}   value={`${fmtUSD(pFar,  2)} / ${contract.unit}`} />
                  <Row label="Roll spread"      value={`${rollSpread >= 0 ? '+' : ''}${fmt(rollSpread, 2)} $ / ${contract.unit}`} />
                  <Row label="Net / unité"      value={`${netPerBbl >= 0 ? '+' : ''}${fmt(netPerBbl, 2)} $ / ${contract.unit}`} />
                </div>

                {/* Total net */}
                <div className={`px-4 py-4 rounded-md border-2 ${
                  isCredit
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-600'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-600'
                }`}>
                  <div className={`text-xs uppercase font-bold ${isCredit ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                    {isCredit ? 'Crédit de roll' : 'Coût du roll'}
                  </div>
                  <div className={`text-3xl font-bold mt-1 ${isCredit ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-900 dark:text-red-300'}`}>
                    {isCredit ? '+' : ''}{fmtUSD(totalRoll, 0)}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {fmt(netPerBbl, 2)} $/bbl × {fmt(totalBbl, 0)} {contract.unit}
                  </div>
                </div>

                {/* Interprétation */}
                {interpretation && (
                  <div className={`px-4 py-3 rounded-md border ${colorClass[interpretation.color].bg} ${colorClass[interpretation.color].bd}`}>
                    <p className={`text-xs ${colorClass[interpretation.color].txt}`}>
                      {interpretation.text}
                    </p>
                  </div>
                )}

                <Button variant="primary" icon={Save} onClick={saveRoll}>
                  Enregistrer ce roll
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Historique des rolls ──────────────────────────────── */}
      {history.length > 0 && (
        <Card>
          <CardHeader icon={RefreshCw} title={`Historique des rolls (${history.length})`}
            action={
              <Button variant="outline" size="sm" onClick={() => { setHistory([]); saveRollHistory([]); }}>
                Tout effacer
              </Button>
            }
          />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Contrat</th>
                    <th className="text-left py-2 px-4">Position</th>
                    <th className="text-left py-2 px-4">Roll</th>
                    <th className="text-right py-2 px-4">Spread</th>
                    <th className="text-right py-2 px-4">Total P&L</th>
                    <th className="text-left py-2 px-4">Notes</th>
                    <th className="py-2 px-4 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(e => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-2 px-4 text-slate-700 dark:text-slate-300 text-xs">{e.date}</td>
                      <td className="py-2 px-4 text-slate-800 dark:text-slate-200 text-xs font-mono">{e.contractName.split('—')[0].trim()}</td>
                      <td className="py-2 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${e.direction === 'short' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {e.direction.toUpperCase()} {e.lots}L
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {e.fromMonth} → {e.toMonth}
                      </td>
                      <td className={`py-2 px-4 text-right text-xs font-semibold ${e.rollSpread >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {e.rollSpread >= 0 ? '+' : ''}{fmt(e.rollSpread, 2)}
                      </td>
                      <td className={`py-2 px-4 text-right font-bold ${e.totalRoll >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                        {e.totalRoll >= 0 ? '+' : ''}{fmtUSD(e.totalRoll, 0)}
                      </td>
                      <td className="py-2 px-4 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                        {e.notes || '—'}
                      </td>
                      <td className="py-2 px-4">
                        <button onClick={() => deleteEntry(e.id)}
                          className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
