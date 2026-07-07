import React, { useMemo, useState } from 'react';
import { History, Download, Trash2, Gauge } from 'lucide-react';
import { PRODUCTS } from '../constants.js';
import { fmt } from '../utils.js';
import { Card, CardHeader, CardBody, Select, Button, Stat } from '../components/UI.jsx';
import { loadAudit, clearAudit, ACTION_META } from '../utils/auditLog.js';

function fmtTs(ts) {
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return ts; }
}

export default function Blotter({ userId, deals = [], onOpenDeal, isAdmin }) {
  const [dealFilter,   setDealFilter]   = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [refresh,      setRefresh]      = useState(0);

  const entries = useMemo(() => loadAudit(userId), [userId, refresh]);
  const filtered = entries.filter(e =>
    (!dealFilter || e.dealId === dealFilter) &&
    (!actionFilter || e.action === actionFilter),
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = entries.filter(e => String(e.ts).slice(0, 10) === today).length;
  const dealsTouched = new Set(entries.filter(e => e.dealId).map(e => e.dealId)).size;
  const actionsPresent = [...new Set(entries.map(e => e.action))];

  const exportCSV = () => {
    if (!filtered.length) return;
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = filtered.map(e => [e.ts, e.dealId || '', ACTION_META[e.action]?.label || e.action, e.label].map(esc).join(';'));
    const csv = '﻿' + ['Horodatage;Deal;Action;Détail', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amko-blotter-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wipe = () => {
    if (!window.confirm('Vider tout le journal d’audit ? Cette action est irréversible.')) return;
    clearAudit(userId);
    setRefresh(r => r + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-brand-700 dark:text-brand-400" /> Blotter — journal d'audit
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Trace horodatée de toutes les actions sur vos deals : création, pricing, hedge, P&L, statuts…
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" icon={Download} disabled={!filtered.length} onClick={exportCSV}>
            Exporter CSV
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" icon={Trash2} disabled={!entries.length} onClick={wipe}>
              Vider
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Événements"      value={fmt(entries.length, 0)} accent="blue" />
        <Stat label="Aujourd'hui"     value={fmt(todayCount, 0)}     accent="gold" />
        <Stat label="Deals concernés" value={fmt(dealsTouched, 0)}   accent="slate" />
      </div>

      <Card>
        <CardBody>
          <div className="grid md:grid-cols-2 gap-3">
            <Select value={dealFilter} onChange={e => setDealFilter(e.target.value)}>
              <option value="">— Tous les deals —</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>
                  {d.id} — {PRODUCTS[d.product]?.name || d.product} — {d.counterparty || '?'}
                </option>
              ))}
            </Select>
            <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
              <option value="">— Toutes les actions —</option>
              {actionsPresent.map(a => (
                <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-slate-500 dark:text-slate-400">
              <History className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm">Aucun événement — les actions sur les deals apparaîtront ici automatiquement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4 w-40">Horodatage</th>
                    <th className="py-3 px-4 w-36">Deal</th>
                    <th className="py-3 px-4 w-32">Action</th>
                    <th className="py-3 px-4">Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((e, i) => {
                    const meta = ACTION_META[e.action] || { label: e.action, cls: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-2 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">{fmtTs(e.ts)}</td>
                        <td className="py-2 px-4">
                          {e.dealId ? (
                            <button onClick={() => onOpenDeal && onOpenDeal(e.dealId)}
                              className="font-mono text-xs text-brand-700 dark:text-brand-400 hover:underline flex items-center gap-1">
                              <Gauge className="w-3 h-3" /> {e.dealId}
                            </button>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                        </td>
                        <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{e.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length > 200 && (
                <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">
                  200 événements affichés sur {filtered.length} — affinez les filtres ou exportez en CSV.
                </p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
