import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Calculator, Database, Download, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardBody, Select, Button, Field, Input } from '../components/UI.jsx';
import { fmt } from '../utils.js';
import { buildDatasetFromStore } from '../utils/plattsStore.js';

export const PLATTS_COLS = [
  { code: 'PCAAS00', name: 'Dated Brent', abbr: 'Brent', unit: 'bbl', bblMT: 7.45, type: 'crude' },
  { code: 'AAWZB00', name: 'Gasoline CIF Med 10ppm', abbr: 'Gasoline CIF Med', unit: 'MT', bblMT: 8.50, type: 'product' },
  { code: 'GAS1', name: 'ICE Gasoil Futures', abbr: 'Gasoil Fut ICE', unit: 'MT', bblMT: 7.50, type: 'futures' },
  { code: 'AAVJI00', name: 'Gasoil 0.1%S FOB Med', abbr: 'Gasoil FOB Med', unit: 'MT', bblMT: 7.50, type: 'product' },
  { code: 'PJAAU00', name: 'Jet A1 CIF NWE', abbr: 'Jet CIF NWE', unit: 'MT', bblMT: 7.90, type: 'product' },
  { code: 'AAIDL00', name: 'Jet A1 FOB Med', abbr: 'Jet FOB Med', unit: 'MT', bblMT: 7.90, type: 'product' },
  { code: 'PUAAK00', name: 'FO 1%S FOB Med', abbr: 'FO 1% FOB Med', unit: 'MT', bblMT: 6.70, type: 'product' },
  { code: 'PUAAL00', name: 'FO 1%S CIF NWE', abbr: 'FO 1% CIF NWE', unit: 'MT', bblMT: 6.70, type: 'product' },
  { code: 'PUABA00', name: 'FO 3.5%S CIF NWE', abbr: 'HSFO CIF NWE', unit: 'MT', bblMT: 6.70, type: 'product' },
  { code: 'PMAAL00', name: 'Butane FOB NWE', abbr: 'Butane NWE', unit: 'MT', bblMT: 11.00, type: 'gpl' },
  { code: 'PMAAM00', name: 'Butane FOB West Med', abbr: 'Butane W.Med', unit: 'MT', bblMT: 11.00, type: 'gpl' },
  { code: 'AAIDT00', name: 'Gasoil 10ppm FOB Arab Gulf', abbr: 'Gasoil FOB AG', unit: 'bbl', bblMT: 7.50, type: 'product' },
  { code: 'AFUJK00', name: 'Gasoil FOB Fujairah', abbr: 'Gasoil Fujairah', unit: 'bbl', bblMT: 7.50, type: 'product' },
  { code: 'AAICY00', name: 'Gasoline 95 RON FOB AG', abbr: 'Gas 95R AG', unit: 'bbl', bblMT: 8.50, type: 'product' },
  { code: 'PGAEY00', name: 'Gasoline 92 RON FOB Spore', abbr: 'Gas 92R Spore', unit: 'bbl', bblMT: 8.50, type: 'product' },
  { code: 'AAWZA00', name: 'Gasoline 10ppm FOB Med', abbr: 'Gas FOB Med', unit: 'MT', bblMT: 8.50, type: 'product' },
];

const COLOR_POOL = ['#2563eb', '#0891b2', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#64748b', '#0f766e'];

function ddmmyyyy(date) {
  if (!date) return '';
  const [y, m, d] = String(date).slice(0, 10).split('-');
  return y && m && d ? `${d}${m}${y}` : String(date);
}

function getCodeMeta(code, descriptions = {}) {
  return PLATTS_COLS.find(c => c.code === code) || { code, name: descriptions?.[code] || code, abbr: code, unit: 'MT', bblMT: 1, type: 'imported' };
}

function getDates(dataset) {
  return Array.isArray(dataset?.dates) ? dataset.dates : Object.keys(dataset?.prices || {}).sort().reverse();
}

function getPrice(dataset, code, date) {
  const value = dataset?.prices?.[date]?.[code];
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toMT(price, meta) {
  if (price == null) return null;
  return meta.unit === 'bbl' ? price * (meta.bblMT || 1) : price;
}

function prevDate(dates, date) {
  const idx = dates.indexOf(date);
  return idx >= 0 ? dates[idx + 1] : null;
}

function computeVariation(dataset, code, date, dates) {
  const current = getPrice(dataset, code, date);
  const previousDate = prevDate(dates, date);
  const previous = previousDate ? getPrice(dataset, code, previousDate) : null;
  if (current == null || previous == null || previous === 0) return null;
  return { abs: current - previous, pct: ((current - previous) / previous) * 100, previousDate };
}

function crackSpread(productMT, brentBbl, bblMT) {
  if (productMT == null || brentBbl == null) return null;
  const brentMT = brentBbl * bblMT;
  return { mt: productMT - brentMT, bbl: productMT / bblMT - brentBbl };
}

function exportCsv(dataset) {
  const dates = getDates(dataset);
  const cols = dataset.columns || [];
  const header = ['Date', ...cols].join(';');
  const lines = dates.map(date => [ddmmyyyy(date), ...cols.map(c => dataset.prices?.[date]?.[c] ?? '')].join(';'));
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AMKO_Platts_Board_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SnapshotCard({ row }) {
  const { code, meta, price, variation } = row;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold">{code}</div>
      <div className="text-sm text-slate-700 dark:text-slate-300 truncate" title={meta.name}>{meta.abbr || meta.name}</div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{fmt(price, 2)} <span className="text-xs font-normal text-slate-500">$/{meta.unit}</span></div>
      {variation && (
        <div className={`text-xs mt-1 ${variation.abs >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {variation.abs >= 0 ? '▲' : '▼'} {fmt(variation.abs, 2)} ({fmt(variation.pct, 2)}%) vs {ddmmyyyy(variation.previousDate)}
        </div>
      )}
    </div>
  );
}

export default function PlattsBoard({ plattsDataset, setMarketPrice, deals = [], onPushToDeal }) {
  const [localDataset, setLocalDataset] = useState(() => {
    const ds = buildDatasetFromStore();
    return ds.dates?.length ? ds : null;
  });
  const [activeSection, setActiveSection] = useState('snapshot');
  const [selectedDate, setSelectedDate] = useState('');
  const [chartCodes, setChartCodes] = useState([]);
  const [mopCode, setMopCode] = useState('AAVJI00');
  const [mopDays, setMopDays] = useState('5');
  const [mopDiff, setMopDiff] = useState('0');
  const [mopDealId, setMopDealId] = useState('');

  useEffect(() => {
    const refresh = () => {
      const ds = buildDatasetFromStore();
      setLocalDataset(ds.dates?.length ? ds : null);
    };
    window.addEventListener('amko:platts-updated', refresh);
    refresh();
    return () => window.removeEventListener('amko:platts-updated', refresh);
  }, []);

  const dataset = plattsDataset?.dates?.length ? plattsDataset : localDataset;
  const dates = useMemo(() => getDates(dataset), [dataset]);
  const columns = useMemo(() => dataset?.columns?.length ? dataset.columns : Object.keys(dataset?.prices?.[dates[0]] || {}), [dataset, dates]);

  useEffect(() => {
    if (!selectedDate && dates.length) setSelectedDate(dates[0]);
    if (selectedDate && dates.length && !dates.includes(selectedDate)) setSelectedDate(dates[0]);
  }, [dates, selectedDate]);

  useEffect(() => {
    if (!chartCodes.length && columns.length) setChartCodes(columns.slice(0, 3));
    if (!columns.includes(mopCode) && columns.length) setMopCode(columns.includes('AAVJI00') ? 'AAVJI00' : columns[0]);
  }, [columns, chartCodes.length, mopCode]);

  const rows = useMemo(() => {
    if (!dataset || !selectedDate) return [];
    return columns.map((code) => {
      const meta = getCodeMeta(code, dataset.descriptions);
      const price = getPrice(dataset, code, selectedDate);
      const variation = computeVariation(dataset, code, selectedDate, dates);
      return { code, meta, price, variation };
    }).filter(r => r.price != null);
  }, [dataset, selectedDate, columns, dates]);

  const chartData = useMemo(() => {
    if (!dataset) return [];
    return [...dates].reverse().map((date) => {
      const point = { date: ddmmyyyy(date) };
      chartCodes.forEach((code) => { point[code] = getPrice(dataset, code, date); });
      return point;
    });
  }, [dataset, dates, chartCodes]);

  const spreads = useMemo(() => {
    const brent = getPrice(dataset, 'PCAAS00', selectedDate);
    const pMT = (code) => toMT(getPrice(dataset, code, selectedDate), getCodeMeta(code, dataset?.descriptions));
    const spread = (label, a, b) => ({ label, value: a != null && b != null ? a - b : null });
    const gasoil = pMT('AAVJI00');
    const gasoilFut = pMT('GAS1');
    const jetCif = pMT('PJAAU00');
    const jetFob = pMT('AAIDL00');
    const gasCif = pMT('AAWZB00');
    const gasFob = pMT('AAWZA00');
    const fo1 = pMT('PUAAK00');
    const fo35 = pMT('PUABA00');
    return {
      cracks: [
        { label: 'Crack Gasoil FOB Med vs Brent', value: gasoil != null && brent != null ? crackSpread(gasoil, brent, 7.5) : null },
        { label: 'Crack Jet CIF NWE vs Brent', value: jetCif != null && brent != null ? crackSpread(jetCif, brent, 7.9) : null },
        { label: 'Crack Gasoline FOB Med vs Brent', value: gasFob != null && brent != null ? crackSpread(gasFob, brent, 8.5) : null },
      ],
      diffs: [
        spread('Gasoil FOB Med vs ICE Futures', gasoil, gasoilFut),
        spread('Jet CIF NWE vs Jet FOB Med', jetCif, jetFob),
        spread('Gasoline CIF Med vs FOB Med', gasCif, gasFob),
        spread('FO 1%S FOB Med vs FO 3.5%S CIF NWE', fo1, fo35),
      ],
    };
  }, [dataset, selectedDate]);

  const mopValues = useMemo(() => {
    if (!dataset || !mopCode) return null;
    const meta = getCodeMeta(mopCode, dataset.descriptions);
    const n = Math.max(1, Number(mopDays) || 1);
    const asc = [...dates].reverse()
      .map(date => ({ date, raw: getPrice(dataset, mopCode, date) }))
      .filter(x => x.raw != null)
      .map(x => ({ ...x, mt: toMT(x.raw, meta) }));
    const window = asc.slice(-n);
    if (!window.length) return null;
    const avgMT = window.reduce((s, x) => s + x.mt, 0) / window.length;
    const diff = Number(mopDiff) || 0;
    const finalMT = avgMT + diff;
    return { meta, window, avgMT, diff, finalMT, avgBbl: meta.unit === 'MT' ? avgMT / (meta.bblMT || 1) : avgMT };
  }, [dataset, dates, mopCode, mopDays, mopDiff]);

  const pushKeyPrices = () => {
    if (!setMarketPrice || !dataset || !selectedDate) return;
    const brent = getPrice(dataset, 'PCAAS00', selectedDate);
    const gasoil = getPrice(dataset, 'AAVJI00', selectedDate) ?? getPrice(dataset, 'GAS1', selectedDate);
    if (brent != null) setMarketPrice('brent', String(brent));
    if (gasoil != null) setMarketPrice('gasoil', String(gasoil));
    alert('Prix clés envoyés au Dashboard.');
  };

  const pushMop = () => {
    if (!onPushToDeal || !mopDealId || !mopValues) return;
    onPushToDeal(mopDealId, mopCode, mopValues.finalMT);
    alert('MOP envoyé vers le deal sélectionné.');
  };

  if (!dataset || !dates.length) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Platts Board</h1><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Aucune donnée Platts importée.</p></div>
        <Card><CardHeader icon={Database} title="Aucune base Platts disponible" /><CardBody><p className="text-sm text-slate-600 dark:text-slate-300">Allez dans <b>Outils → Import Platts</b>, importez votre fichier Excel, puis revenez sur ce Board.</p></CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Platts Board</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Source : {dataset.source || 'Platts importé'} — {dates.length} date(s), {columns.length} produit(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" icon={RefreshCw} onClick={() => setLocalDataset(buildDatasetFromStore())}>Recharger</Button>
          <Button variant="outline" icon={Download} onClick={() => exportCsv(dataset)}>Exporter CSV</Button>
          <Button variant="primary" icon={TrendingUp} onClick={pushKeyPrices}>Envoyer prix Dashboard</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[['snapshot', 'Snapshot'], ['mop', 'MOP Calculator'], ['spreads', 'Spreads & cracks'], ['chart', 'Graphique'], ['table', 'Table complète']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveSection(id)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === id ? 'bg-blue-700 text-white' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}`}>{label}</button>
        ))}
      </div>

      <Card>
        <CardHeader icon={BarChart3} title="Sélection" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Date Platts">
              <Select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>{dates.map(d => <option key={d} value={d}>{ddmmyyyy(d)}</option>)}</Select>
            </Field>
            <Field label="Produit principal graphique">
              <Select value={chartCodes[0] || ''} onChange={e => setChartCodes([e.target.value])}>{columns.map(code => <option key={code} value={code}>{getCodeMeta(code, dataset.descriptions).name} ({code})</option>)}</Select>
            </Field>
            <Field label="Date source affichée"><div className="px-3 py-2 rounded border bg-slate-50 dark:bg-slate-800 text-sm">{ddmmyyyy(selectedDate)}</div></Field>
          </div>
        </CardBody>
      </Card>

      {activeSection === 'snapshot' && (
        <>
          <div className="grid md:grid-cols-4 gap-4">{rows.slice(0, 16).map(row => <SnapshotCard key={row.code} row={row} />)}</div>
          <Card><CardHeader icon={Zap} title="Signaux rapides" /><CardBody><div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {spreads.cracks.map((c, i) => c.value && <div key={i}>• {c.label} : <b>{fmt(c.value.mt, 2)} $/MT</b> soit <b>{fmt(c.value.bbl, 2)} $/bbl</b></div>)}
            {!spreads.cracks.some(c => c.value) && <div>Aucun signal calculable avec les données disponibles.</div>}
          </div></CardBody></Card>
        </>
      )}

      {activeSection === 'mop' && (
        <Card>
          <CardHeader icon={Calculator} title="MOP Calculator — Moyenne de période" subtitle="Calcule une moyenne sur les N dernières cotations disponibles, avec différentiel." />
          <CardBody>
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <Field label="Code Platts"><Select value={mopCode} onChange={e => setMopCode(e.target.value)}>{columns.map(code => <option key={code} value={code}>{getCodeMeta(code, dataset.descriptions).name} ({code})</option>)}</Select></Field>
              <Field label="Nombre de jours"><Input type="number" min="1" value={mopDays} onChange={e => setMopDays(e.target.value)} /></Field>
              <Field label="Différentiel / prime"><Input type="number" step="0.01" value={mopDiff} onChange={e => setMopDiff(e.target.value)} /></Field>
              <Field label="Pousser vers deal"><Select value={mopDealId} onChange={e => setMopDealId(e.target.value)}><option value="">— Aucun —</option>{deals.map(d => <option key={d.id} value={d.id}>{d.id} — {d.counterparty}</option>)}</Select></Field>
            </div>
            {mopValues && (
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="rounded-xl border p-4 bg-slate-50 dark:bg-slate-800"><div className="text-xs uppercase text-slate-500">Moyenne</div><div className="text-2xl font-bold">{fmt(mopValues.avgMT, 2)} $/MT</div></div>
                <div className="rounded-xl border p-4 bg-slate-50 dark:bg-slate-800"><div className="text-xs uppercase text-slate-500">Moyenne $/bbl</div><div className="text-2xl font-bold">{fmt(mopValues.avgBbl, 2)}</div></div>
                <div className="rounded-xl border p-4 bg-slate-50 dark:bg-slate-800"><div className="text-xs uppercase text-slate-500">Différentiel</div><div className="text-2xl font-bold">{fmt(mopValues.diff, 2)}</div></div>
                <div className="rounded-xl border p-4 bg-blue-50 dark:bg-blue-950/30"><div className="text-xs uppercase text-blue-700">Prix final</div><div className="text-2xl font-bold">{fmt(mopValues.finalMT, 2)} $/MT</div></div>
              </div>
            )}
            <Button variant="primary" icon={TrendingUp} onClick={pushMop} disabled={!mopDealId || !mopValues}>Envoyer MOP vers le deal</Button>
            <div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead><tr className="bg-slate-50 dark:bg-slate-800"><th className="p-2 text-left">Date</th><th className="p-2 text-right">Prix</th></tr></thead><tbody>{mopValues?.window.map(x => <tr key={x.date} className="border-b"><td className="p-2">{ddmmyyyy(x.date)}</td><td className="p-2 text-right font-semibold">{fmt(x.mt, 2)}</td></tr>)}</tbody></table></div>
          </CardBody>
        </Card>
      )}

      {activeSection === 'spreads' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card><CardHeader icon={Activity} title="Crack spreads" /><CardBody><div className="space-y-3">{spreads.cracks.map((c, i) => <div key={i} className="rounded-lg border p-3"><div className="font-semibold">{c.label}</div><div className="text-sm text-slate-500">{c.value ? `${fmt(c.value.mt, 2)} $/MT | ${fmt(c.value.bbl, 2)} $/bbl` : 'Non calculable'}</div></div>)}</div></CardBody></Card>
          <Card><CardHeader icon={Zap} title="Spreads physiques" /><CardBody><div className="space-y-3">{spreads.diffs.map((s, i) => <div key={i} className="rounded-lg border p-3"><div className="font-semibold">{s.label}</div><div className={`text-sm ${s.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{s.value != null ? `${s.value >= 0 ? '+' : ''}${fmt(s.value, 2)} $/MT` : 'Non calculable'}</div></div>)}</div></CardBody></Card>
        </div>
      )}

      {activeSection === 'chart' && (
        <Card><CardHeader icon={TrendingUp} title="Évolution" /><CardBody><div className="h-96"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" minTickGap={24} /><YAxis /><Tooltip /><Legend />{chartCodes.map((code, i) => <Line key={code} type="monotone" dataKey={code} stroke={COLOR_POOL[i % COLOR_POOL.length]} dot={false} connectNulls name={`${getCodeMeta(code, dataset.descriptions).abbr || code} (${code})`} />)}</LineChart></ResponsiveContainer></div></CardBody></Card>
      )}

      {activeSection === 'table' && (
        <Card><CardHeader icon={Database} title={`Prix Platts du ${ddmmyyyy(selectedDate)}`} /><CardBody className="p-0"><div className="overflow-x-auto max-h-[560px]"><table className="w-full text-sm"><thead><tr className="bg-slate-50 dark:bg-slate-800 border-b"><th className="text-left p-3">Code</th><th className="text-left p-3">Produit</th><th className="text-right p-3">Prix</th><th className="text-right p-3">Variation J-1</th></tr></thead><tbody>{rows.map(({ code, meta, price, variation }) => <tr key={code} className="border-b border-slate-100 dark:border-slate-700"><td className="p-3 font-mono text-xs">{code}</td><td className="p-3">{meta.name}</td><td className="p-3 text-right font-semibold">{fmt(price, 2)}</td><td className={`p-3 text-right ${variation?.abs >= 0 ? 'text-emerald-600' : variation ? 'text-red-600' : 'text-slate-400'}`}>{variation ? `${variation.abs >= 0 ? '+' : ''}${fmt(variation.abs, 2)} / ${fmt(variation.pct, 2)}%` : '—'}</td></tr>)}</tbody></table></div></CardBody></Card>
      )}
    </div>
  );
}
