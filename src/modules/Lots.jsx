import React, { useState } from 'react';
import { Layers, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { PRODUCTS, INCOTERMS } from '../constants.js';
import { fmt, fmtUSD, uid, todayISO } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Button, Stat } from '../components/UI.jsx';

const PORTS = [
  'Cotonou (Bénin)', 'Lomé (Togo)', 'Abidjan (Côte d\'Ivoire)',
  'Dakar (Sénégal)', 'Lagos (Nigeria)', 'Bingo', 'Autre',
];

const PRICING_WINDOWS = [
  '3 After B/L', '5 After B/L', '5 Around B/L',
  '3 After NOR', 'Calendar Month', 'Dates fixes',
];

function blankLot(index, deal) {
  return {
    id: uid(),
    name: `Lot ${index + 1}`,
    qty: deal ? Math.round((Number(deal.quantity) || 5000) / Math.max(1, (deal.lots?.length || 0) + 1)) : 5000,
    port: deal?.dischargePort || 'Cotonou (Bénin)',
    pricingWindow: '5 Around B/L',
    pricingDates: '',
    plattsPrice: Number(deal?.estimatedPrice) || 0,
    differential: Number(deal?.differential) || 0,
    finalPrice: 0,
    status: 'pending',     // pending | priced | loaded | discharged
    blDate: '',
    notes: '',
  };
}

const STATUS_LABELS = {
  pending:    { label: 'À pricer',   color: 'bg-amber-100 text-amber-700' },
  priced:     { label: 'Pricé ✓',   color: 'bg-blue-100 text-blue-700' },
  loaded:     { label: 'Chargé',     color: 'bg-purple-100 text-purple-700' },
  discharged: { label: 'Déchargé ✓', color: 'bg-emerald-100 text-emerald-700' },
};

export default function Lots({ deals, onLotsUpdated }) {
  const [selectedDealId, setSelectedDealId] = useState('');
  const [editing, setEditing] = useState(null); // lot id being edited

  const deal = deals.find(d => d.id === selectedDealId);
  const lots = deal?.lots || [];

  const save = (updatedLots) => {
    if (!deal || !onLotsUpdated) return;
    onLotsUpdated(deal.id, updatedLots);
  };

  const addLot = () => {
    const newLot = blankLot(lots.length, deal);
    const updated = [...lots, newLot];
    save(updated);
    setEditing(newLot.id);
  };

  const deleteLot = (id) => {
    if (!window.confirm('Supprimer ce lot ?')) return;
    save(lots.filter(l => l.id !== id));
    if (editing === id) setEditing(null);
  };

  const updateLot = (id, key, value) => {
    const updated = lots.map(l => {
      if (l.id !== id) return l;
      const patch = { ...l, [key]: value };
      // Recalcul du prix final
      patch.finalPrice = (Number(patch.plattsPrice) || 0) + (Number(patch.differential) || 0);
      return patch;
    });
    save(updated);
  };

  // Statistiques globales
  const totalQty       = lots.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const dealQty        = Number(deal?.quantity) || 0;
  const pricedLots     = lots.filter(l => l.status === 'priced' || l.status === 'discharged');
  const pendingLots    = lots.filter(l => l.status === 'pending');
  const avgPlatts      = pricedLots.length
    ? pricedLots.reduce((s, l) => s + (Number(l.plattsPrice) || 0), 0) / pricedLots.length
    : 0;
  const weightedAvgPrice = pricedLots.length && totalQty > 0
    ? pricedLots.reduce((s, l) => s + (Number(l.finalPrice) || 0) * (Number(l.qty) || 0), 0) /
      pricedLots.reduce((s, l) => s + (Number(l.qty) || 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Lots & cargaisons</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gérez les lots d'un contrat multi-cargaisons — pricing Platts par lot, suivi d'avancement
        </p>
      </div>

      {/* Sélecteur de deal */}
      <Card>
        <CardHeader icon={Layers} title="Sélectionner un deal" />
        <CardBody>
          <Select value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)}>
            <option value="">— Choisir un deal —</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {d.id} — {PRODUCTS[d.product]?.name || d.product} — {d.counterparty}
                {(d.lots?.length) ? ` (${d.lots.length} lot(s))` : ''}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {!deal && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p>Sélectionnez un deal pour gérer ses lots.</p>
        </div>
      )}

      {deal && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Lots"         value={lots.length}                          accent="blue" />
            <Stat label="Volume total" value={`${fmt(totalQty, 0)} MT`}
              hint={dealQty ? `Deal : ${fmt(dealQty, 0)} MT` : undefined}
              accent={Math.abs(totalQty - dealQty) < 50 ? 'green' : 'gold'} />
            <Stat label="Lots pricés"  value={`${pricedLots.length}/${lots.length}`} accent="green" />
            <Stat label="Prix moyen pondéré"
              value={weightedAvgPrice ? fmtUSD(weightedAvgPrice, 2) + '/bbl' : '—'}
              accent="slate" />
          </div>

          {/* Barre d'avancement */}
          {pendingLots.length > 0 && (
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <b>{pendingLots.length} lot(s) à pricer</b> : {pendingLots.map(l => l.name).join(', ')}.
                Renseignez le Platts moyen dès que la fenêtre de cotation est atteinte.
              </p>
            </div>
          )}

          {/* Bouton ajouter */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Lots du deal — {deal.id}
            </h2>
            <Button variant="primary" icon={Plus} onClick={addLot}>
              Ajouter un lot
            </Button>
          </div>

          {/* Liste des lots */}
          {lots.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              <p className="text-sm">Aucun lot. Ajoutez les cargaisons de ce contrat.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lots.map((lot, idx) => {
                const isOpen = editing === lot.id;
                const finalP = (Number(lot.plattsPrice) || 0) + (Number(lot.differential) || 0);
                const lotValue = finalP * (Number(lot.qty) || 0) * (PRODUCTS[deal.product]?.bblPerMT || 7.5);
                const st = STATUS_LABELS[lot.status] || STATUS_LABELS.pending;

                return (
                  <Card key={lot.id}>
                    {/* En-tête lot */}
                    <div
                      className="px-5 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
                      onClick={() => setEditing(isOpen ? null : lot.id)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-400">
                          {idx + 1}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{lot.name}</span>
                          <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                            {fmt(lot.qty, 0)} MT · {lot.port}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {lot.status === 'priced' || lot.status === 'discharged' ? (
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {fmtUSD(finalP, 2)}/bbl
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Platts {fmtUSD(lot.plattsPrice, 2)} + {fmt(lot.differential, 2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400">À pricer</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${st.color}`}>
                          {st.label}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteLot(lot.id); }}
                          className="text-red-400 hover:text-red-600 dark:hover:text-red-300 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Corps édition */}
                    {isOpen && (
                      <CardBody>
                        <div className="grid md:grid-cols-3 gap-3">
                          <Field label="Nom du lot">
                            <Input value={lot.name}
                              onChange={e => updateLot(lot.id, 'name', e.target.value)} />
                          </Field>
                          <Field label="Quantité (MT)">
                            <Input type="number" value={lot.qty}
                              onChange={e => updateLot(lot.id, 'qty', Number(e.target.value))} />
                          </Field>
                          <Field label="Port de déchargement">
                            <Select value={lot.port}
                              onChange={e => updateLot(lot.id, 'port', e.target.value)}>
                              {PORTS.map(p => <option key={p}>{p}</option>)}
                            </Select>
                          </Field>
                          <Field label="Fenêtre de pricing">
                            <Select value={lot.pricingWindow}
                              onChange={e => updateLot(lot.id, 'pricingWindow', e.target.value)}>
                              {PRICING_WINDOWS.map(w => <option key={w}>{w}</option>)}
                            </Select>
                          </Field>
                          <Field label="Dates de pricing" hint="Ex. 12–18 déc. 2025">
                            <Input value={lot.pricingDates}
                              onChange={e => updateLot(lot.id, 'pricingDates', e.target.value)}
                              placeholder="Ex. 12–18/12/2025" />
                          </Field>
                          <Field label="Date B/L">
                            <Input type="date" value={lot.blDate}
                              onChange={e => updateLot(lot.id, 'blDate', e.target.value)} />
                          </Field>
                        </div>

                        {/* Pricing */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase">
                            Pricing Platts
                          </p>
                          <div className="grid md:grid-cols-4 gap-3">
                            <Field label="Platts moyen ($/bbl)" hint="MOP de la fenêtre">
                              <Input type="number" step="0.001" value={lot.plattsPrice}
                                onChange={e => updateLot(lot.id, 'plattsPrice', e.target.value)}
                                placeholder="Ex. 82.500" />
                            </Field>
                            <Field label="Différentiel ($/bbl)" hint="Prime (+) ou décote (−)">
                              <Input type="number" step="0.01" value={lot.differential}
                                onChange={e => updateLot(lot.id, 'differential', e.target.value)}
                                placeholder="Ex. +1.20" />
                            </Field>
                            <Field label="Prix final calculé">
                              <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-md text-sm font-bold text-emerald-900 dark:text-emerald-200">
                                {fmtUSD(finalP, 3)} /bbl
                              </div>
                            </Field>
                            <Field label="Valeur du lot">
                              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md text-sm font-semibold text-blue-900 dark:text-blue-200">
                                {fmtUSD(lotValue, 0)}
                              </div>
                            </Field>
                          </div>
                        </div>

                        {/* Statut + notes */}
                        <div className="mt-4 grid md:grid-cols-2 gap-3">
                          <Field label="Statut du lot">
                            <Select value={lot.status}
                              onChange={e => updateLot(lot.id, 'status', e.target.value)}>
                              <option value="pending">À pricer</option>
                              <option value="priced">Pricé ✓</option>
                              <option value="loaded">Chargé</option>
                              <option value="discharged">Déchargé ✓</option>
                            </Select>
                          </Field>
                          <Field label="Notes">
                            <Input value={lot.notes}
                              onChange={e => updateLot(lot.id, 'notes', e.target.value)}
                              placeholder="Spécifications, clauses…" />
                          </Field>
                        </div>
                      </CardBody>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Récap tarifaire */}
          {pricedLots.length > 0 && (
            <Card>
              <CardHeader icon={CheckCircle2} title="Récapitulatif des lots pricés" />
              <CardBody className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                      <th className="text-left py-2 px-4">Lot</th>
                      <th className="text-right py-2 px-4">Qté (MT)</th>
                      <th className="text-right py-2 px-4">Platts $/bbl</th>
                      <th className="text-right py-2 px-4">Diff.</th>
                      <th className="text-right py-2 px-4">Prix final</th>
                      <th className="text-right py-2 px-4">Valeur ($)</th>
                      <th className="text-left py-2 px-4">Fenêtre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricedLots.map(l => {
                      const fp = (Number(l.plattsPrice) || 0) + (Number(l.differential) || 0);
                      const val = fp * (Number(l.qty) || 0) * (PRODUCTS[deal.product]?.bblPerMT || 7.5);
                      return (
                        <tr key={l.id} className="border-b border-slate-100 dark:border-slate-700">
                          <td className="py-2 px-4 font-medium text-slate-800 dark:text-slate-200">{l.name}</td>
                          <td className="py-2 px-4 text-right text-slate-700 dark:text-slate-300">{fmt(l.qty, 0)}</td>
                          <td className="py-2 px-4 text-right text-slate-700 dark:text-slate-300">{fmt(l.plattsPrice, 3)}</td>
                          <td className={`py-2 px-4 text-right font-medium ${Number(l.differential) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                            {Number(l.differential) >= 0 ? '+' : ''}{fmt(l.differential, 2)}
                          </td>
                          <td className="py-2 px-4 text-right font-bold text-slate-900 dark:text-slate-100">{fmtUSD(fp, 3)}</td>
                          <td className="py-2 px-4 text-right font-semibold text-blue-700 dark:text-blue-400">{fmtUSD(val, 0)}</td>
                          <td className="py-2 px-4 text-xs text-slate-600 dark:text-slate-400">{l.pricingDates || l.pricingWindow}</td>
                        </tr>
                      );
                    })}
                    {/* Total */}
                    <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
                      <td className="py-2 px-4 text-slate-900 dark:text-slate-100">TOTAL pricé</td>
                      <td className="py-2 px-4 text-right text-slate-900 dark:text-slate-100">
                        {fmt(pricedLots.reduce((s, l) => s + (Number(l.qty) || 0), 0), 0)}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400">
                        MOP : {fmtUSD(avgPlatts, 3)}
                      </td>
                      <td className="py-2 px-4"></td>
                      <td className="py-2 px-4 text-right text-emerald-700 dark:text-emerald-400">
                        {fmtUSD(weightedAvgPrice, 3)}
                      </td>
                      <td className="py-2 px-4 text-right text-blue-700 dark:text-blue-400">
                        {fmtUSD(pricedLots.reduce((s, l) => {
                          const fp = (Number(l.plattsPrice) || 0) + (Number(l.differential) || 0);
                          return s + fp * (Number(l.qty) || 0) * (PRODUCTS[deal.product]?.bblPerMT || 7.5);
                        }, 0), 0)}
                      </td>
                      <td className="py-2 px-4"></td>
                    </tr>
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
