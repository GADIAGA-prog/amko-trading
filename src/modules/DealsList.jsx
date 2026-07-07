import React, { useRef } from 'react';
import { Trash2, Download, Upload, Copy, FileJson, Gauge } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt } from '../utils.js';
import { Card, CardBody, Button } from '../components/UI.jsx';

function escapeCSV(v) {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"';
}

export default function DealsList({ deals, onEdit, onDelete, onDuplicate, onImportDeals, onOpen }) {
  const fileInputRef = useRef(null);

  // ─── CSV Export ───────────────────────────────────────────────
  const exportCSV = () => {
    if (!deals.length) return;
    const BOM = '﻿';
    const headers = [
      'ID', 'Type', 'Contrepartie', 'Pays', 'Produit',
      'Quantité (MT)', 'Tolérance (%)', 'Incoterm',
      'Port chargement', 'Port déchargement',
      'Laycan début', 'Laycan fin', 'Date B/L',
      'Marker', 'Différentiel', 'Prix estimé ($/MT)',
      'Paiement', 'Statut', 'Notes', 'Date création',
    ];
    const rows = deals.map(d => [
      d.id,
      d.dealType === 'buy' ? 'Achat' : 'Vente',
      d.counterparty,
      d.counterpartyCountry,
      PRODUCTS[d.product]?.name || d.product,
      d.quantity,
      d.tolerance,
      d.incoterm,
      d.loadPort,
      d.dischargePort,
      d.laycanFrom,
      d.laycanTo,
      d.blDate || '',
      d.priceMarker,
      d.differential,
      d.estimatedPrice,
      d.paymentTerm,
      d.status,
      (d.notes || '').replace(/;/g, ','),
      d.createdAt,
    ].map(escapeCSV).join(';'));

    const csv  = BOM + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `amko-deals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── JSON Export (Fix 1 — data portability) ──────────────────
  const exportJSON = () => {
    if (!deals.length) return;
    const blob = new Blob([JSON.stringify(deals, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `amko-deals-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── JSON Import (Fix 1 — data sharing) ──────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('Le fichier ne contient pas un tableau de deals.');
        if (window.confirm(`Importer ${imported.length} deal(s) ? Les deals dont l'ID existe déjà seront ignorés.`)) {
          onImportDeals(imported);
        }
      } catch (err) {
        alert('Fichier JSON invalide : ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mes deals</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Liste complète des opérations enregistrées</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" icon={Upload}
            onClick={() => fileInputRef.current?.click()}>
            Importer JSON
          </Button>
          <Button variant="outline" size="sm" icon={FileJson}
            disabled={!deals.length} onClick={exportJSON}>
            Sauvegarder JSON
          </Button>
          <Button variant="primary" size="sm" icon={Download}
            disabled={!deals.length} onClick={exportCSV}>
            Exporter CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden"
            onChange={handleFileChange} />
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {deals.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
              <p className="text-sm">Aucun deal pour le moment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Contrepartie</th>
                    <th className="py-3 px-4">Produit</th>
                    <th className="py-3 px-4">Qté (MT)</th>
                    <th className="py-3 px-4">Prix A/V ($/MT)</th>
                    <th className="py-3 px-4">Incoterm</th>
                    <th className="py-3 px-4">Laycan</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Pricing FX</th>
                    <th className="py-3 px-4 w-36">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...deals].reverse().map(d => (
                    <tr key={d.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-2 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">{d.id}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.dealType === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {d.dealType === 'buy' ? 'Achat' : 'Vente'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{d.counterparty}</td>
                      <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{PRODUCTS[d.product]?.name || d.product}</td>
                      <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{fmt(d.quantity, 0)}</td>
                      <td className="py-2 px-4 text-xs">
                        {(() => {
                          const buy  = d.purchasePrice ?? (d.dealType === 'buy'  ? d.estimatedPrice : '');
                          const sell = d.salePrice     ?? (d.dealType === 'sell' ? d.estimatedPrice : '');
                          const hasBuy  = buy  != null && buy  !== '';
                          const hasSell = sell != null && sell !== '';
                          if (!hasBuy && !hasSell) return <span className="text-slate-400 dark:text-slate-500 italic">—</span>;
                          return (
                            <div className="leading-tight">
                              <div className="text-emerald-700 dark:text-emerald-400">A {hasBuy ? fmt(Number(buy), 2) : '—'}</div>
                              <div className="text-brand-700 dark:text-brand-400">V {hasSell ? fmt(Number(sell), 2) : '—'}</div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{d.incoterm}</td>
                      <td className="py-2 px-4 text-xs text-slate-600 dark:text-slate-400">{d.laycanFrom} → {d.laycanTo}</td>
                      <td className="py-2 px-4">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                          {d.status}
                        </span>
                      </td>
                      {/* Colonne FX Pricing Validator */}
                      <td className="py-2 px-4">
                        {d.pricingValidation ? (() => {
                          const pv = d.pricingValidation;
                          const s  = pv.verdict?.status;
                          const bg = s === 'GO' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300' :
                                     s === 'GO_WITH_CONDITIONS' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300' :
                                     'bg-red-50 dark:bg-red-900/20 border-red-300';
                          const txt = s === 'GO' ? 'text-emerald-700 dark:text-emerald-400' :
                                      s === 'GO_WITH_CONDITIONS' ? 'text-amber-700 dark:text-amber-400' :
                                      'text-red-700 dark:text-red-400';
                          return (
                            <div className={`text-xs rounded border px-2 py-1 ${bg}`}>
                              <div className={`font-bold ${txt}`}>{s === 'GO' ? '✓ GO' : s === 'GO_WITH_CONDITIONS' ? '⚠ Conditions' : '✗ NO-GO'}</div>
                              {pv.economics?.netMarginForward != null && (
                                <div className="text-slate-600 dark:text-slate-400">
                                  {Number(pv.economics.netMarginForward).toLocaleString('fr-FR', {maximumFractionDigits:0})} {pv.marginCurrency}
                                </div>
                              )}
                              {pv.arbitrage?.bestSaleCurrency && <div className="text-slate-500 dark:text-slate-400">→ {pv.arbitrage.bestSaleCurrency}</div>}
                            </div>
                          );
                        })() : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1">
                          {onOpen && (
                            <button onClick={() => onOpen(d)} title="Ouvrir le cockpit du deal"
                              className="text-xs px-2 py-1 flex items-center gap-1 text-white bg-brand-700 hover:bg-brand-800 rounded font-medium">
                              <Gauge className="w-3.5 h-3.5" /> Cockpit
                            </button>
                          )}
                          <button onClick={() => onEdit(d)}
                            className="text-xs px-2 py-1 text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded">
                            Éditer
                          </button>
                          <button onClick={() => onDuplicate(d)} title="Dupliquer"
                            className="text-xs px-2 py-1 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { if (window.confirm('Supprimer ce deal ?')) onDelete(d.id); }}
                            className="text-xs px-2 py-1 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
