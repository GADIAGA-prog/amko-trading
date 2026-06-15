import React, { useMemo, useRef, useState } from 'react';
import { read, utils, writeFile } from 'xlsx';
import { Download, FileSpreadsheet, Upload, Database, Trash2, CheckCircle2 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Select } from '../components/UI.jsx';
import { fmt } from '../utils.js';
import { buildDatasetFromStore, clearPlattsStore, loadPlattsStore, mergePlattsDataset } from '../utils/plattsStore.js';

const CODE_RE = /^[A-Z]{3,8}\d{2}(-[A-Z]{2,4})?$|^GAS\s?1!?(-[A-Z]+)?$/i;

function dateToISO(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!Number.isNaN(d.getTime()) && d.getUTCFullYear() > 1990) return d.toISOString().slice(0, 10);
  }
  const s = String(value ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);

    // Les fichiers Platts téléchargés en Time Series sont généralement en MM/DD/YYYY.
    // Exemple réel : 06/08/2026 = 08 juin 2026, et 03/31/2026 = 31 mars 2026.
    // Si le deuxième nombre est > 12, c'est forcément MM/DD/YYYY.
    if (b > 12) return dateToISO(year, a, b);

    // Si le premier nombre est > 12, c'est forcément DD/MM/YYYY.
    if (a > 12) return dateToISO(year, b, a);

    // Cas ambigu 06/08/2026 : on privilégie MM/DD/YYYY pour Platts.
    return dateToISO(year, a, b);
  }

  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && d.getFullYear() > 1990 ? d.toISOString().slice(0, 10) : null;
}

function cleanCode(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function parsePrice(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function looksLikeUnitRow(row) {
  const cells = row.slice(1).map(v => cleanCode(v).toLowerCase()).filter(Boolean);
  if (!cells.length) return false;
  const unitHits = cells.filter(v => ['last', 'close', 'mid', 'mean', 'value', 'settlement'].includes(v));
  return unitHits.length >= Math.max(2, Math.floor(cells.length * 0.5));
}

function findDescriptionRow(rows, startIndex) {
  for (let i = startIndex; i < Math.min(rows.length, startIndex + 4); i += 1) {
    const row = rows[i] || [];
    const firstCellIsDate = !!parseDate(row[0]);
    const usefulText = row.slice(1).filter(v => cleanCode(v).length > 4 && !CODE_RE.test(cleanCode(v))).length;
    if (!firstCellIsDate && usefulText >= 2) return i;
  }
  return -1;
}

function findFirstDataRow(rows, startIndex) {
  for (let i = startIndex; i < rows.length; i += 1) {
    if (parseDate(rows[i]?.[0])) return i;
  }
  return rows.length;
}

function parsePlattsWorkbook(wb, sheetName, filename) {
  const sheet = wb.Sheets[sheetName];
  const rows = utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (rows.length < 2) return null;

  const first = rows[0].map(cleanCode);
  const codesInHeader = first.slice(1).filter(v => CODE_RE.test(v));
  const prices = {};
  const descriptions = {};
  const columns = [];

  if (codesInHeader.length >= 2) {
    const codes = first.slice(1).map(cleanCode);
    const unitRowIndex = looksLikeUnitRow(rows[1] || []) ? 1 : -1;
    const descRowIndex = findDescriptionRow(rows, unitRowIndex >= 0 ? 2 : 1);
    const dataStartIndex = findFirstDataRow(rows, descRowIndex >= 0 ? descRowIndex + 1 : 1);
    const desc = descRowIndex >= 0 ? (rows[descRowIndex] || []).slice(1).map(v => cleanCode(v)) : codes;

    codes.forEach((c, i) => {
      const code = cleanCode(c);
      if (!code) return;
      columns.push(code);
      descriptions[code] = desc[i] && desc[i].toLowerCase() !== 'last' ? desc[i] : code;
    });

    rows.slice(dataStartIndex).forEach((row) => {
      const date = parseDate(row[0]);
      if (!date) return;
      if (!prices[date]) prices[date] = {};
      codes.forEach((c, i) => {
        const code = cleanCode(c);
        const price = parsePrice(row[i + 1]);
        if (code && price != null) prices[date][code] = price;
      });
    });
  } else {
    const header = first.map(v => v.toLowerCase());
    const dateIdx = header.findIndex(h => h.includes('date'));
    const codeIdx = header.findIndex(h => h.includes('code') || h.includes('symbol') || h.includes('assessment') || h.includes('product') || h.includes('produit'));
    const descIdx = header.findIndex(h => h.includes('description') || h.includes('assessment') || h.includes('product') || h.includes('produit'));
    const priceIdx = header.findIndex(h => h.includes('price') || h.includes('prix') || h.includes('close') || h.includes('mean') || h.includes('mid') || h.includes('value'));
    if (dateIdx < 0 || codeIdx < 0 || priceIdx < 0) return null;
    rows.slice(1).forEach((row) => {
      const date = parseDate(row[dateIdx]);
      const code = cleanCode(row[codeIdx]);
      const price = parsePrice(row[priceIdx]);
      if (!date || !code || price == null) return;
      if (!prices[date]) prices[date] = {};
      prices[date][code] = price;
      if (!columns.includes(code)) columns.push(code);
      descriptions[code] = cleanCode(row[descIdx]) || code;
    });
  }

  const dates = Object.keys(prices).sort().reverse();
  if (!dates.length || !columns.length) return null;
  return { source: filename, importedAt: new Date().toISOString(), dates, prices, columns, descriptions };
}

function exportStoreExcel() {
  const store = loadPlattsStore();
  const rows = [['Date', ...store.columns]];
  store.dates.forEach((date) => {
    rows.push([date, ...store.columns.map(c => store.prices?.[date]?.[c] ?? '')]);
  });
  const descRows = [['Code', 'Description'], ...store.columns.map(c => [c, store.descriptions?.[c] || c])];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, utils.aoa_to_sheet(rows), 'Platts_Consolide');
  utils.book_append_sheet(wb, utils.aoa_to_sheet(descRows), 'Produits');
  writeFile(wb, `AMKO_Platts_Consolide_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function PlattsImportDynamic({ setMarketPrice, onDatasetLoaded }) {
  const fileRef = useRef(null);
  const [store, setStore] = useState(loadPlattsStore);
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(store.dates?.[0] || '');

  const latestRows = useMemo(() => {
    const date = selectedDate || store.dates?.[0];
    return Object.entries(store.prices?.[date] || {}).sort(([a], [b]) => a.localeCompare(b));
  }, [store, selectedDate]);

  const handleFile = async (file) => {
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = read(ab, { type: 'array', cellDates: true });
      const dataset = parsePlattsWorkbook(wb, wb.SheetNames[0], file.name);
      if (!dataset) { alert('Format Platts non reconnu. Vérifiez les colonnes codes/date/prix.'); return; }
      const merged = mergePlattsDataset(dataset, file.name);
      setStore(merged);
      setSelectedDate(merged.dates[0] || '');
      setMessage(`${dataset.dates.length} date(s) et ${dataset.columns.length} produit(s) intégrés. Les anciennes lignes sont conservées et les nouvelles lignes mises à jour.`);
      if (onDatasetLoaded) onDatasetLoaded(buildDatasetFromStore());
      const latestDate = merged.dates[0];
      const latest = merged.prices?.[latestDate] || {};
      const gasoil = Object.entries(latest).find(([code, price]) => /GAS|GO|AAVJI|AAWZ/i.test(code) && price > 0);
      if (gasoil && setMarketPrice) setMarketPrice('gasoil', String(gasoil[1]));
    } catch (e) {
      alert(`Erreur import Platts : ${e.message}`);
    }
  };

  const resetStore = () => {
    if (!window.confirm('Effacer toute la base Platts consolidée ?')) return;
    clearPlattsStore();
    const empty = loadPlattsStore();
    setStore(empty);
    setSelectedDate('');
    if (onDatasetLoaded) onDatasetLoaded(empty);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Import Platts dynamique</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Importer, consolider, mettre à jour et télécharger la base Platts utilisée par les deals.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" icon={Download} onClick={exportStoreExcel} disabled={!store.columns.length}>Télécharger Platts Excel</Button>
          <Button variant="danger" icon={Trash2} onClick={resetStore} disabled={!store.columns.length}>Effacer base</Button>
        </div>
      </div>

      <Card>
        <CardHeader icon={Upload} title="Importer un fichier Platts Excel" subtitle="Format supporté : Time Series + codes, Last, descriptions, puis dates/prix. Dates Platts lues en MM/DD/YYYY." />
        <CardBody>
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <div className="font-semibold text-slate-700 dark:text-slate-200">Cliquez pour importer le fichier Platts</div>
            <div className="text-xs text-slate-500 mt-1">Formats : .xlsx, .xls, .csv</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {message && <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4" /> {message}</div>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Database} title="Base Platts consolidée" subtitle={`${store.dates.length} date(s), ${store.columns.length} produit(s), ${store.files.length} fichier(s) importé(s)`} />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Field label="Date affichée">
              <Select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
                {store.dates.map(d => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Field>
          </div>
          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50 dark:bg-slate-800"><th className="text-left p-2">Code</th><th className="text-left p-2">Produit Platts</th><th className="text-right p-2">Prix</th></tr></thead>
              <tbody>
                {latestRows.map(([code, price]) => (
                  <tr key={code} className="border-b border-slate-100 dark:border-slate-700"><td className="p-2 font-mono text-xs">{code}</td><td className="p-2">{store.descriptions?.[code] || code}</td><td className="p-2 text-right font-semibold">{fmt(price, 2)}</td></tr>
                ))}
                {!latestRows.length && <tr><td colSpan="3" className="p-6 text-center text-slate-500">Aucune donnée Platts importée.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
