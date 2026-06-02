import React, { useState, useRef, useCallback } from 'react';
import { read, utils } from 'xlsx';
import {
  FileSpreadsheet, Upload, CheckCircle2, AlertTriangle,
  X, ChevronDown, Database, RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Field, Select, Button } from '../components/UI.jsx';
import { fmt, todayISO } from '../utils.js';

// ── Platts assessment name / code → internal marker ──────────────
const PLATTS_MAP = {
  // Brent
  'brent dated': 'brent', 'dated brent': 'brent', 'bfoe': 'brent',
  'brent': 'brent', 'brnt': 'brent',
  'aavbp00': 'brent', 'pcaas00': 'brent',
  // WTI
  'wti': 'wti', 'cushing wti': 'wti', 'nymex wti': 'wti',
  'west texas intermediate': 'wti',
  // Dubai / Oman
  'dubai': 'dubai', 'oman': 'dubai', 'dme oman': 'dubai',
  'dubai crude': 'dubai', 'dubai platts': 'dubai',
  // Gasoil / Diesel
  'ice gasoil': 'gasoil', 'gasoil': 'gasoil', 'go 0.1': 'gasoil',
  'go': 'gasoil', 'en590': 'gasoil', 'diesel': 'gasoil',
  'gasoil 0.1%': 'gasoil', 'lgo': 'gasoil',
  'ice gasoil 0.1': 'gasoil', 'ice gas oil': 'gasoil',
  // ULSD
  'ulsd': 'ulsd', 'heating oil': 'ulsd', 'ho': 'ulsd',
  'ultra low sulfur diesel': 'ulsd',
  // RBOB
  'rbob': 'rbob', 'gasoline': 'rbob', 'rbob gasoline': 'rbob',
  // Jet
  'jet': 'jet', 'jet a1': 'jet', 'kero': 'jet',
  'jet/kero': 'jet', 'kerosene': 'jet', 'aviation': 'jet',
  // Fuel Oil
  'fuel oil': 'fuel-oil', 'hsfo': 'fuel-oil', 'fo 3.5': 'fuel-oil',
  'hfo': 'fuel-oil', 'high sulfur fuel oil': 'fuel-oil',
  'fo 380': 'fuel-oil', 'ifo 380': 'fuel-oil',
  // Naphtha
  'naphtha': 'naphtha', 'naphthas': 'naphtha',
  'naphtha cif nwe': 'naphtha',
};

const MARKER_LABELS = {
  brent: 'Brent Dated ($/bbl)',
  wti: 'WTI ($/bbl)',
  dubai: 'Dubai ($/bbl)',
  gasoil: 'ICE Gasoil ($/MT)',
  ulsd: 'ULSD ($/bbl)',
  rbob: 'RBOB ($/bbl)',
  jet: 'Jet A1 ($/bbl)',
  'fuel-oil': 'Fuel Oil HSFO ($/MT)',
  naphtha: 'Naphtha ($/MT)',
};

const ALL_MARKERS = Object.keys(MARKER_LABELS);

const MONTH_NAMES = {
  jan:'01', fév:'02', feb:'02', mar:'03', avr:'04', apr:'04',
  mai:'05', may:'05', jun:'06', jui:'07', jul:'07', août:'08', aug:'08',
  sep:'09', oct:'10', nov:'11', déc:'12', dec:'12',
};

// ── Flexible date parser ──────────────────────────────────────────
function parseFlexDate(value) {
  if (!value && value !== 0) return null;

  // Date object (xlsx with cellDates: true)
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  // Excel serial number
  if (typeof value === 'number') {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990) {
      return d.toISOString().slice(0, 10);
    }
    return null;
  }

  const s = String(value).trim();
  if (!s) return null;

  // ISO: 2026-06-01
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // DD/MM/YYYY or DD-MM-YYYY (European, most common in Platts)
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const [, a, b, c] = m;
    const year = c.length === 2 ? '20' + c : c;
    return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  }

  // "01-Jun-2026" or "1-Jun-26"
  m = s.match(/^(\d{1,2})[-\s]([a-zé]{2,4})[-\s](\d{2,4})$/i);
  if (m) {
    const [, day, monthStr, yr] = m;
    const month = MONTH_NAMES[monthStr.toLowerCase()];
    if (month) {
      const year = yr.length === 2 ? '20' + yr : yr;
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // "Jun 01, 2026"
  m = s.match(/^([a-zé]{2,4})\.?\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (m) {
    const [, monthStr, day, year] = m;
    const month = MONTH_NAMES[monthStr.toLowerCase()];
    if (month) return `${year}-${month}-${day.padStart(2, '0')}`;
  }

  // Fallback
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

// ── Map an assessment name to an internal marker ──────────────────
function mapAssessment(name) {
  const key = String(name).toLowerCase().trim();
  if (PLATTS_MAP[key]) return PLATTS_MAP[key];
  // Partial match
  for (const [k, v] of Object.entries(PLATTS_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

// ── Detect if the header row contains dates ───────────────────────
function countDates(row) {
  return row.filter(v => parseFlexDate(v) !== null).length;
}

// ── Parse the sheet into {date → {assessmentName → price}} ───────
function parseSheet(rows) {
  if (!rows || rows.length < 2) return { format: 'empty', data: {} };

  const header = rows[0].map(v => String(v ?? '').trim());

  // ── WIDE FORMAT: assessments as rows, dates as columns ──────────
  // header = ['Assessment', 'code', 'Date 1', 'Date 2', ...]
  const dateCountInHeader = countDates(header.slice(1));
  if (dateCountInHeader >= 1) {
    const dates = header.slice(1).map(parseFlexDate);
    const result = {};
    rows.slice(1).forEach(row => {
      const name = String(row[0] ?? '').trim();
      if (!name || name.toLowerCase().includes('unit') || name.toLowerCase().includes('currency')) return;
      dates.forEach((date, i) => {
        if (!date) return;
        const raw = String(row[i + 1] ?? '').replace(',', '.');
        const price = parseFloat(raw);
        if (!isNaN(price) && price > 0 && price < 10000) {
          if (!result[date]) result[date] = {};
          result[date][name] = price;
        }
      });
    });
    return { format: 'wide-assessment-rows', data: result };
  }

  // ── WIDE FORMAT (transposed): dates as rows, assessments as columns ──
  const dateCountInCol0 = rows.slice(1).filter(r => parseFlexDate(r[0]) !== null).length;
  if (dateCountInCol0 >= Math.floor((rows.length - 1) / 2)) {
    const assessments = header.slice(1);
    const result = {};
    rows.slice(1).forEach(row => {
      const date = parseFlexDate(row[0]);
      if (!date) return;
      assessments.forEach((name, i) => {
        if (!name) return;
        const raw = String(row[i + 1] ?? '').replace(',', '.');
        const price = parseFloat(raw);
        if (!isNaN(price) && price > 0 && price < 10000) {
          if (!result[date]) result[date] = {};
          result[date][name] = price;
        }
      });
    });
    return { format: 'wide-date-rows', data: result };
  }

  // ── LONG FORMAT: each row is one (date, assessment, price) ──────
  const lh = header.map(h => h.toLowerCase());
  const dateIdx  = lh.findIndex(h => h.includes('date') || h.includes('dat'));
  const nameIdx  = lh.findIndex(h =>
    h.includes('assessment') || h.includes('code') || h.includes('symbol') ||
    h.includes('product') || h.includes('produit') || h.includes('description'));
  const priceIdx = lh.findIndex(h =>
    h.includes('close') || h.includes('mid') || h.includes('mean') ||
    h.includes('price') || h.includes('prix') || h.includes('value') || h.includes('settlement'));

  if (dateIdx >= 0 && nameIdx >= 0 && priceIdx >= 0) {
    const result = {};
    rows.slice(1).forEach(row => {
      const date  = parseFlexDate(row[dateIdx]);
      const name  = String(row[nameIdx] ?? '').trim();
      const raw   = String(row[priceIdx] ?? '').replace(',', '.');
      const price = parseFloat(raw);
      if (!date || !name || isNaN(price) || price <= 0 || price > 10000) return;
      if (!result[date]) result[date] = {};
      result[date][name] = price;
    });
    return { format: 'long', data: result };
  }

  return { format: 'unknown', data: {} };
}

// ── Component ─────────────────────────────────────────────────────
const HISTORY_KEY = 'amko_platts_history';

function loadHistory() {
  try {
    const v = localStorage.getItem(HISTORY_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

function saveHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20))); }
  catch {}
}

export default function PlattsImport({ setMarketPrice, marketPrices }) {
  const fileInputRef = useRef(null);
  const [isDragging,    setIsDragging]   = useState(false);
  const [fileName,      setFileName]     = useState('');
  const [workbook,      setWorkbook]     = useState(null);
  const [sheetName,     setSheetName]    = useState('');
  const [parseResult,   setParseResult]  = useState(null); // { format, data }
  const [selectedDate,  setSelectedDate] = useState('');
  // mapping: assessmentName → marker (user can override)
  const [markerMap,     setMarkerMap]    = useState({});
  const [applied,       setApplied]      = useState(false);
  const [history,       setHistory]      = useState(loadHistory);

  // ── Parse a sheet ───────────────────────────────────────────────
  const processSheet = useCallback((wb, name) => {
    const sheet = wb.Sheets[name];
    const rows  = utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    const result = parseSheet(rows);
    setParseResult(result);
    setApplied(false);

    // Auto-select most recent date
    const dates = Object.keys(result.data).sort().reverse();
    setSelectedDate(dates[0] || '');

    // Build initial marker map
    const initialMap = {};
    dates.forEach(d => {
      Object.keys(result.data[d] || {}).forEach(name => {
        if (!(name in initialMap)) {
          initialMap[name] = mapAssessment(name) || '';
        }
      });
    });
    setMarkerMap(initialMap);
  }, []);

  // ── File loading ────────────────────────────────────────────────
  const loadFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setParseResult(null);
    setApplied(false);
    try {
      const ab = await file.arrayBuffer();
      const wb = read(ab, { type: 'array', cellDates: true });
      setWorkbook(wb);
      const first = wb.SheetNames[0];
      setSheetName(first);
      processSheet(wb, first);
    } catch (err) {
      alert('Erreur de lecture du fichier : ' + err.message);
    }
  };

  const onFileChange = (e) => { loadFile(e.target.files[0]); e.target.value = ''; };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    loadFile(e.dataTransfer.files[0]);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const changeSheet = (name) => {
    setSheetName(name);
    if (workbook) processSheet(workbook, name);
  };

  // ── Helpers ─────────────────────────────────────────────────────
  const availableDates = parseResult
    ? Object.keys(parseResult.data).sort().reverse()
    : [];

  const rowsForDate = parseResult && selectedDate
    ? Object.entries(parseResult.data[selectedDate] || {})
    : [];

  const detectedCount = rowsForDate.filter(([name]) => markerMap[name]).length;
  const unknownNames  = rowsForDate.filter(([name]) => !markerMap[name]).map(([n]) => n);

  // ── Apply prices to Dashboard marketPrices ──────────────────────
  const applyPrices = () => {
    if (!parseResult || !selectedDate) return;
    let appliedAny = false;
    rowsForDate.forEach(([name, price]) => {
      const marker = markerMap[name];
      if (marker) {
        setMarketPrice(marker, String(price));
        appliedAny = true;
      }
    });
    if (!appliedAny) { alert('Aucun prix reconnu à appliquer.'); return; }

    // Save to history
    const entry = {
      id: Date.now(),
      date: selectedDate,
      filename: fileName,
      importedAt: new Date().toISOString(),
      prices: Object.fromEntries(
        rowsForDate
          .filter(([n]) => markerMap[n])
          .map(([n, p]) => [markerMap[n], p])
      ),
    };
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    saveHistory(next);
    setApplied(true);
  };

  const resetAll = () => {
    setFileName(''); setWorkbook(null); setSheetName('');
    setParseResult(null); setSelectedDate(''); setMarkerMap({}); setApplied(false);
  };

  const formatLabel = {
    'wide-assessment-rows': 'Platts standard (assessments en lignes, dates en colonnes)',
    'wide-date-rows':       'Matrice transposée (dates en lignes, produits en colonnes)',
    'long':                 'Format tidy / long (une ligne par assessment)',
    'unknown':              'Format non reconnu — vérifier le fichier',
    'empty':                'Feuille vide',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Import Platts / Excel</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Charger un export Platts (.xlsx, .xls, .csv) pour pré-remplir les prix de référence
        </p>
      </div>

      {/* ── Zone de dépôt ─────────────────────────────────────── */}
      {!workbook ? (
        <div
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}>
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-slate-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Déposer le fichier Platts ici ou <span className="text-blue-600 dark:text-blue-400">parcourir</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Formats acceptés : .xlsx, .xls, .csv
          </p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
        </div>
      ) : (
        <Card>
          <CardHeader icon={FileSpreadsheet}
            title={fileName}
            subtitle={`${workbook.SheetNames.length} feuille(s) — format détecté : ${formatLabel[parseResult?.format] || '…'}`}
            action={
              <Button variant="outline" size="sm" icon={X} onClick={resetAll}>Changer de fichier</Button>
            }
          />
          {workbook.SheetNames.length > 1 && (
            <CardBody>
              <Field label="Feuille à analyser">
                <Select value={sheetName} onChange={e => changeSheet(e.target.value)}>
                  {workbook.SheetNames.map(n => <option key={n}>{n}</option>)}
                </Select>
              </Field>
            </CardBody>
          )}
        </Card>
      )}

      {/* ── Résultats du parsing ──────────────────────────────── */}
      {parseResult && parseResult.format !== 'empty' && (
        <>
          {/* Sélecteur de date */}
          {availableDates.length > 0 && (
            <Card>
              <CardHeader icon={ChevronDown} title="Sélectionner la date de pricing" />
              <CardBody>
                <div className="grid md:grid-cols-2 gap-4 items-end">
                  <Field label={`Date (${availableDates.length} disponible(s))`}>
                    <Select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
                      {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                    </Select>
                  </Field>
                  <div className="flex gap-2">
                    <Button variant="primary" icon={Database} onClick={applyPrices}
                      disabled={!selectedDate || detectedCount === 0}>
                      Appliquer au Dashboard ({detectedCount} prix)
                    </Button>
                    {applied && (
                      <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Appliqué
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Table de mapping */}
          {rowsForDate.length > 0 && (
            <Card>
              <CardHeader icon={FileSpreadsheet}
                title={`Assessments détectés pour le ${selectedDate}`}
                subtitle={`${detectedCount}/${rowsForDate.length} mappés vers un marker interne`}
              />
              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                        <th className="text-left py-2 px-4">Assessment (source)</th>
                        <th className="text-right py-2 px-4">Prix</th>
                        <th className="text-left py-2 px-4 w-56">Marker interne</th>
                        <th className="text-center py-2 px-4 w-16">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsForDate.map(([name, price]) => {
                        const marker = markerMap[name] || '';
                        const isOk   = !!marker;
                        return (
                          <tr key={name} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="py-2 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                              {name}
                            </td>
                            <td className="py-2 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                              {fmt(price, 2)}
                            </td>
                            <td className="py-2 px-4">
                              <Select
                                value={marker}
                                onChange={e => setMarkerMap(m => ({ ...m, [name]: e.target.value }))}>
                                <option value="">— Non mappé —</option>
                                {ALL_MARKERS.map(mk => (
                                  <option key={mk} value={mk}>{MARKER_LABELS[mk]}</option>
                                ))}
                              </Select>
                            </td>
                            <td className="py-2 px-4 text-center">
                              {isOk
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                                : <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {unknownNames.length > 0 && (
                  <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-700">
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      <b>{unknownNames.length} assessment(s) non reconnu(s)</b> — sélectionnez un marker manuellement ou ignorez-les.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {parseResult.format === 'unknown' && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4" />
                Format non reconnu
              </div>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                L'application n'a pas pu détecter automatiquement le format du fichier.
                Assurez-vous que le fichier contient une colonne date et des colonnes de prix.
                Formats supportés : Platts standard, matrice date × assessment, tidy (long).
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Historique des imports ────────────────────────────── */}
      {history.length > 0 && (
        <Card>
          <CardHeader icon={Database} title="Historique des imports"
            subtitle={`${history.length} import(s) récent(s)`}
            action={
              <Button variant="outline" size="sm" icon={X}
                onClick={() => { setHistory([]); saveHistory([]); }}>
                Effacer
              </Button>
            }
          />
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {history.map(h => (
                <div key={h.id} className="px-5 py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {h.date}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                        {h.filename}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(h.prices).map(([marker, price]) => (
                        <span key={marker}
                          className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          {MARKER_LABELS[marker] || marker} : {fmt(price, 2)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                    {new Date(h.importedAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Guide format ─────────────────────────────────────────── */}
      <Card>
        <CardHeader icon={FileSpreadsheet} title="Formats de fichiers supportés" />
        <CardBody>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Format 1 — Platts standard (assessments en lignes)</p>
              <pre className="mt-1 text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
{`Assessment        | 2026-06-02 | 2026-06-01 | ...
Brent Dated       | 82.50      | 82.20      | ...
ICE Gasoil 0.1%   | 840.25     | 838.00     | ...
WTI               | 79.20      | 78.90      | ...`}
              </pre>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Format 2 — Matrice transposée (dates en lignes)</p>
              <pre className="mt-1 text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
{`Date       | Brent Dated | ICE Gasoil | WTI
02/06/2026 | 82.50       | 840.25     | 79.20
01/06/2026 | 82.20       | 838.00     | 78.90`}
              </pre>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Format 3 — Long / tidy</p>
              <pre className="mt-1 text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
{`Assessment   | Date       | Close  | High  | Low  | Unit
Brent Dated  | 02/06/2026 | 82.50  | 83.10 | 81.90| $/BBL
ICE Gasoil   | 02/06/2026 | 840.25 | 845.0 | 835.0| $/MT`}
              </pre>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
