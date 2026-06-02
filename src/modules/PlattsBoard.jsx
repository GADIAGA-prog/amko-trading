import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Zap, AlertTriangle, CheckCircle2,
  BarChart3, Activity, Globe, ArrowUpDown, Layers,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardBody, Select, Button } from '../components/UI.jsx';
import { fmt } from '../utils.js';

// ─────────────────────────────────────────────────────────────────
// MÉTADONNÉES DES 16 ASSESSMENTS PLATTS DU FICHIER AMKO
// ─────────────────────────────────────────────────────────────────
export const PLATTS_COLS = [
  { code: 'PCAAS00', name: 'Dated Brent',               abbr: 'Brent',            unit: 'bbl', bblMT: 7.45, type: 'crude',   region: 'Global',      color: '#1d4ed8', chartColor: '#3b82f6' },
  { code: 'AAWZB00', name: 'Gasoline CIF Med 10ppm',    abbr: 'Gasoline CIF Med', unit: 'MT',  bblMT: 8.50, type: 'product', region: 'Europe Med',  color: '#7c3aed', chartColor: '#a855f7' },
  { code: 'GAS1',    name: 'ICE Gasoil Futures',         abbr: 'Gasoil Fut ICE',   unit: 'MT',  bblMT: 7.50, type: 'futures', region: 'ICE',         color: '#0891b2', chartColor: '#06b6d4' },
  { code: 'AAVJI00', name: 'Gasoil 0.1%S FOB Med',      abbr: 'Gasoil FOB Med',   unit: 'MT',  bblMT: 7.50, type: 'product', region: 'Europe Med',  color: '#0284c7', chartColor: '#0ea5e9' },
  { code: 'PJAAU00', name: 'Jet A1 CIF NWE',             abbr: 'Jet CIF NWE',      unit: 'MT',  bblMT: 7.90, type: 'product', region: 'NW Europe',   color: '#dc2626', chartColor: '#ef4444' },
  { code: 'AAIDL00', name: 'Jet A1 FOB Med',             abbr: 'Jet FOB Med',      unit: 'MT',  bblMT: 7.90, type: 'product', region: 'Europe Med',  color: '#ea580c', chartColor: '#f97316' },
  { code: 'PUAAK00', name: 'FO 1%S FOB Med',             abbr: 'FO 1% FOB Med',    unit: 'MT',  bblMT: 6.70, type: 'product', region: 'Europe Med',  color: '#78716c', chartColor: '#a8a29e' },
  { code: 'PUAAL00', name: 'FO 1%S CIF NWE',             abbr: 'FO 1% CIF NWE',    unit: 'MT',  bblMT: 6.70, type: 'product', region: 'NW Europe',   color: '#57534e', chartColor: '#78716c' },
  { code: 'PUABA00', name: 'FO 3.5%S CIF NWE (HSFO)',    abbr: 'HSFO CIF NWE',     unit: 'MT',  bblMT: 6.70, type: 'product', region: 'NW Europe',   color: '#44403c', chartColor: '#57534e' },
  { code: 'PMAAL00', name: 'Butane FOB NWE Seagoing',    abbr: 'Butane NWE',       unit: 'MT',  bblMT: 11.00,type: 'gpl',     region: 'NW Europe',   color: '#16a34a', chartColor: '#22c55e' },
  { code: 'PMAAM00', name: 'Butane FOB West Med Coaster',abbr: 'Butane W.Med',     unit: 'MT',  bblMT: 11.00,type: 'gpl',     region: 'W. Med',      color: '#15803d', chartColor: '#4ade80' },
  { code: 'AAIDT00', name: 'Gasoil 10ppm FOB Arab Gulf', abbr: 'Gasoil FOB AG',    unit: 'bbl', bblMT: 7.50, type: 'product', region: 'Arab Gulf',   color: '#b45309', chartColor: '#f59e0b' },
  { code: 'AFUJK00', name: 'Gasoil FOB Fujairah',        abbr: 'Gasoil Fujairah',  unit: 'bbl', bblMT: 7.50, type: 'product', region: 'Fujairah',   color: '#a16207', chartColor: '#fbbf24' },
  { code: 'AAICY00', name: 'Gasoline 95 RON FOB AG',     abbr: 'Gas 95R AG',       unit: 'bbl', bblMT: 8.50, type: 'product', region: 'Arab Gulf',   color: '#9333ea', chartColor: '#c084fc' },
  { code: 'PGAEY00', name: 'Gasoline 92 RON FOB Spore',  abbr: 'Gas 92R Spore',    unit: 'bbl', bblMT: 8.50, type: 'product', region: 'Singapore',  color: '#7e22ce', chartColor: '#a855f7' },
  { code: 'AAWZA00', name: 'Gasoline 10ppm FOB Med',     abbr: 'Gas FOB Med',      unit: 'MT',  bblMT: 8.50, type: 'product', region: 'Europe Med',  color: '#6d28d9', chartColor: '#8b5cf6' },
];

// Données Platts pré-chargées depuis le fichier du 01/06/2026
// Toutes les valeurs en $/MT (les valeurs $/bbl ont été converties × bblMT)
const PRELOADED = {
  source: 'F New Platts - 01.06.26.xlsx',
  importedAt: '2026-06-01',
  dates: [
    '2026-06-01','2026-05-29','2026-05-28','2026-05-27','2026-05-26',
    '2026-05-22','2026-05-21','2026-05-20','2026-05-19','2026-05-18',
    '2026-05-15','2026-05-14','2026-05-13','2026-05-12','2026-05-11',
    '2026-05-08','2026-05-07','2026-05-06','2026-05-05','2026-05-01',
  ],
  prices: {
    '2026-06-01': { PCAAS00:100.30, AAWZB00:1053.00, GAS1:1095.25, AAVJI00:1079.75, PJAAU00:1179.50, AAIDL00:1142.75, PUAAK00:585.75, PUAAL00:599.50, PUABA00:580.00, PMAAL00:589.00, PMAAM00:753.00, AAIDT00:1034.25 },
    '2026-05-29': { PCAAS00:93.56,  AAWZB00:1014.00, GAS1:1009.50, AAVJI00:1000.00, PJAAU00:1096.25, AAIDL00:1055.00, PUAAK00:553.00, PUAAL00:565.25, PUABA00:551.00, PMAAL00:546.00, PMAAM00:703.00, AAIDT00:991.0,  AFUJK00:998.8,  AAICY00:921.1, PGAEY00:967.1, AAWZA00:992.75 },
    '2026-05-28': { PCAAS00:96.80,  AAWZB00:1034.25, GAS1:1032.00, AAVJI00:1024.50, PJAAU00:1124.00, AAIDL00:1081.00, PUAAK00:572.50, PUAAL00:587.25, PUABA00:572.25, PMAAL00:566.00, PMAAM00:721.00, AAIDT00:1013.9, AFUJK00:1023.5, AAICY00:953.3, PGAEY00:999.3, AAWZA00:1011.75 },
    '2026-05-27': { PCAAS00:99.59,  AAWZB00:1035.00, GAS1:1047.00, AAVJI00:1035.75, PJAAU00:1135.00, AAIDL00:1092.00, PUAAK00:565.75, PUAAL00:580.75, PUABA00:568.50, PMAAL00:575.00, PMAAM00:733.00, AAWZA00:1012.50 },
    '2026-05-26': { PCAAS00:103.78, AAWZB00:1099.50, GAS1:1083.50, AAVJI00:1074.25, PJAAU00:1183.50, AAIDL00:1136.00, PUAAK00:589.00, PUAAL00:606.25, PUABA00:588.00, PMAAL00:614.00, PMAAM00:777.00, AAIDT00:1039.5, AFUJK00:1066.1, AAICY00:1006.2, PGAEY00:1052.6, AAWZA00:1074.50 },
    '2026-05-22': { PCAAS00:107.23, AAWZB00:1140.50, GAS1:1135.25, AAVJI00:1114.00, PJAAU00:1253.00, AAIDL00:1200.25, PUAAK00:610.25, PUAAL00:627.75, PUABA00:611.00, PMAAL00:644.00, PMAAM00:814.00, AAIDT00:1108.2, AAWZA00:1112.75 },
    '2026-05-21': { PCAAS00:111.71, AAWZB00:1177.50, GAS1:1172.50, AAVJI00:1153.00, PJAAU00:1304.75, AAIDL00:1249.75, PUAAK00:627.00, PUAAL00:645.25, PUABA00:628.00, PMAAL00:667.00, PMAAM00:843.00, AAWZA00:1148.50 },
    '2026-05-20': { PCAAS00:109.83, AAWZB00:1192.00, GAS1:1171.00, AAVJI00:1152.75, PJAAU00:1302.75, AAIDL00:1247.75, PUAAK00:615.50, PUAAL00:634.00, PUABA00:628.75, PMAAL00:674.00, PMAAM00:861.00, AAWZA00:1163.00 },
    '2026-05-19': { PCAAS00:114.68, AAWZB00:1227.00, GAS1:1210.00, AAVJI00:1198.50, PJAAU00:1358.50, AAIDL00:1304.25, PUAAK00:645.75, PUAAL00:666.00, PUABA00:666.75, PMAAL00:708.00, PMAAM00:915.00, AAWZA00:1198.50 },
    '2026-05-18': { PCAAS00:114.90, AAWZB00:1243.25, GAS1:1233.50, AAVJI00:1222.25, PJAAU00:1376.25, AAIDL00:1324.25, PUAAK00:651.50, PUAAL00:672.00, PUABA00:679.00, PMAAL00:673.00, PMAAM00:922.00, AAWZA00:1216.00 },
    '2026-05-15': { PCAAS00:112.20, AAWZB00:1219.25, GAS1:1204.25, AAVJI00:1193.50, PJAAU00:1341.00, AAIDL00:1288.25, PUAAK00:639.00, PUAAL00:659.25, PUABA00:663.00, PMAAL00:663.00, PMAAM00:927.00, AAWZA00:1191.50 },
    '2026-05-14': { PCAAS00:109.59, AAWZB00:1186.50, GAS1:1146.25, AAVJI00:1141.75, PJAAU00:1284.25, AAIDL00:1231.50, PUAAK00:620.50, PUAAL00:635.25, PUABA00:640.25, PMAAL00:657.25, PMAAM00:919.00, AAWZA00:1158.75 },
    '2026-05-13': { PCAAS00:111.20, AAWZB00:1217.00, GAS1:1191.50, AAVJI00:1181.50, PJAAU00:1325.00, AAIDL00:1267.00, PUAAK00:632.25, PUAAL00:648.00, PUABA00:649.25, PMAAL00:744.00, PMAAM00:949.00, AAWZA00:1186.25 },
    '2026-05-12': { PCAAS00:110.83, AAWZB00:1224.25, GAS1:1207.25, AAVJI00:1199.50, PJAAU00:1343.50, AAIDL00:1284.00, PUAAK00:645.75, PUAAL00:657.25, PUABA00:646.50, PMAAL00:760.00, PMAAM00:968.00, AAWZA00:1192.75 },
    '2026-05-11': { PCAAS00:105.24, AAWZB00:1184.25, GAS1:1178.50, AAVJI00:1156.25, PJAAU00:1302.50, AAIDL00:1241.50, PUAAK00:623.50, PUAAL00:633.25, PUABA00:637.25, PMAAL00:745.00, PMAAM00:950.00, AAWZA00:1152.00 },
    '2026-05-08': { PCAAS00:104.72, AAWZB00:1158.00, GAS1:1192.00, AAVJI00:1154.25, PJAAU00:1269.00, AAIDL00:1207.50, PUAAK00:616.75, PUAAL00:624.75, PUABA00:635.25, PMAAL00:715.00, PMAAM00:912.00, AAWZA00:1125.50 },
    '2026-05-07': { PCAAS00:100.59, AAWZB00:1120.75, GAS1:1141.25, AAVJI00:1105.00, PJAAU00:1218.25, AAIDL00:1155.75, PUAAK00:596.50, PUAAL00:603.25, PUABA00:622.00, PMAAL00:677.00, PMAAM00:863.00, AAWZA00:1087.50 },
    '2026-05-06': { PCAAS00:104.19, AAWZB00:1129.25, GAS1:1188.00, AAVJI00:1148.25, PJAAU00:1286.00, AAIDL00:1222.00, PUAAK00:609.00, PUAAL00:607.75, PUABA00:644.50, PMAAL00:708.00, PMAAM00:903.00, AAWZA00:1095.25 },
    '2026-05-05': { PCAAS00:114.99, AAWZB00:1194.00, GAS1:1294.75, AAVJI00:1242.50, PJAAU00:1427.00, AAIDL00:1357.00, PUAAK00:652.50, PUAAL00:647.25, PUABA00:661.25, PMAAL00:777.00, PMAAM00:991.00, AAWZA00:1156.75 },
    '2026-05-01': { PCAAS00:117.95, AAWZB00:1175.50, GAS1:1298.50, AAVJI00:1253.00, PJAAU00:1449.25, AAIDL00:1379.25, PUAAK00:614.00, PUAAL00:612.25, PUABA00:613.50, PMAAL00:778.00, PMAAM00:992.00, AAWZA00:1138.25 },
  },
};

// ─────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────

/** Récupère le prix d'un code sur une date donnée (cherche dans dataset puis PRELOADED) */
function getPrice(dataset, code, date) {
  const d = dataset ?? PRELOADED;
  return d.prices[date]?.[code] ?? null;
}

/** Toutes les dates triées desc */
function getDates(dataset) {
  const d = dataset ?? PRELOADED;
  return [...d.dates].sort().reverse();
}

/** D-1 calendaire = date précédente disponible */
function prevDate(dates, date) {
  const idx = dates.indexOf(date);
  return idx >= 0 && idx < dates.length - 1 ? dates[idx + 1] : null;
}

/** Date N semaines avant */
function dateNWeeksAgo(dates, date, n) {
  const target = new Date(date);
  target.setDate(target.getDate() - n * 7);
  const iso = target.toISOString().slice(0, 10);
  return dates.find(d => d <= iso) ?? null;
}

/** Convertit un prix en $/MT si la colonne est en $/bbl */
function toMT(price, col) {
  if (!price) return null;
  return col.unit === 'bbl' ? price * col.bblMT : price;
}

/** Crack spread $/MT et $/bbl */
function crackSpread(productMT, brentBbl, bblMT) {
  if (!productMT || !brentBbl) return null;
  const brentMT = brentBbl * bblMT;
  return {
    mt: productMT - brentMT,
    bbl: productMT / bblMT - brentBbl,
  };
}

/** Couleur de variation */
function varColor(v, invert = false) {
  if (v === null || v === undefined) return 'text-slate-500 dark:text-slate-400';
  const pos = invert ? v < 0 : v > 0;
  if (pos) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0 && !invert) return 'text-red-600 dark:text-red-400';
  if (v > 0 && invert) return 'text-red-600 dark:text-red-400';
  return 'text-slate-500 dark:text-slate-400';
}

function fmtVar(v, dec = 2) {
  if (v === null || v === undefined) return '—';
  return (v > 0 ? '+' : '') + fmt(v, dec);
}

// ─────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────

function PriceCard({ col, price, d1, d1pct }) {
  const isUp = d1 > 0;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">{col.code}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{col.abbr}</div>
        </div>
        <span className="text-xs px-1.5 py-0.5 rounded text-white flex-shrink-0"
          style={{ backgroundColor: col.color }}>
          {col.region}
        </span>
      </div>
      <div className="mt-2">
        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {price ? fmt(price, 2) : '—'}
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">$/{col.unit}</span>
        </div>
        {d1 !== null && (
          <div className={`text-xs mt-0.5 font-medium ${varColor(d1)}`}>
            {isUp ? '▲' : '▼'} {fmtVar(d1)} ({fmtVar(d1pct, 1)}%)
          </div>
        )}
      </div>
    </div>
  );
}

function CrackCard({ label, spreadMT, spreadBbl, d1MT, accent = 'blue' }) {
  const colors = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', bd: 'border-blue-300 dark:border-blue-700', txt: 'text-blue-900 dark:text-blue-200', sub: 'text-blue-700 dark:text-blue-400' },
    red:  { bg: 'bg-red-50 dark:bg-red-900/20',   bd: 'border-red-300 dark:border-red-700',   txt: 'text-red-900 dark:text-red-200',   sub: 'text-red-700 dark:text-red-400' },
    green:{ bg: 'bg-emerald-50 dark:bg-emerald-900/20', bd: 'border-emerald-300 dark:border-emerald-700', txt: 'text-emerald-900 dark:text-emerald-200', sub: 'text-emerald-700 dark:text-emerald-400' },
    slate:{ bg: 'bg-slate-50 dark:bg-slate-800', bd: 'border-slate-300 dark:border-slate-600', txt: 'text-slate-900 dark:text-slate-100', sub: 'text-slate-600 dark:text-slate-400' },
  }[accent] ?? colors.blue;

  return (
    <div className={`rounded-md border p-3 ${colors.bg} ${colors.bd}`}>
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">{label}</div>
      <div className={`text-xl font-bold ${colors.txt}`}>
        {spreadMT !== null ? `${fmtVar(spreadMT)} $/MT` : '—'}
      </div>
      <div className={`text-xs ${colors.sub} mt-0.5`}>
        {spreadBbl !== null ? `${fmtVar(spreadBbl, 2)} $/bbl` : ''}
        {d1MT !== null && <span className={`ml-2 ${varColor(d1MT)}`}>(D-1: {fmtVar(d1MT)})</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────
export default function PlattsBoard({ plattsDataset, setMarketPrice }) {
  const dataset = plattsDataset ?? PRELOADED;
  const dates = getDates(dataset);
  const latestDate = dates[0] ?? '';

  const [selectedDate, setSelectedDate]   = useState(latestDate);
  const [chartSeries,  setChartSeries]    = useState(['PCAAS00', 'AAVJI00', 'PJAAU00']);
  const [activeSection, setActiveSection] = useState('snapshot');

  const prevD  = prevDate(dates, selectedDate);
  const prevW  = dateNWeeksAgo(dates, selectedDate, 1);
  const prevM  = dateNWeeksAgo(dates, selectedDate, 4);

  // ── Données de la date sélectionnée ──────────────────────────
  const colByCode = Object.fromEntries(PLATTS_COLS.map(c => [c.code, c]));

  const getP = (code) => getPrice(dataset, code, selectedDate);
  const brent = getP('PCAAS00');

  // Calcul de tous les prix en $/MT
  const toMTp = (code) => {
    const p = getP(code);
    const col = colByCode[code];
    return col && p ? toMT(p, col) : null;
  };

  // ── Crack spreads ─────────────────────────────────────────────
  const cracks = useMemo(() => {
    if (!brent) return {};
    const calc = (code) => {
      const col = colByCode[code];
      if (!col) return null;
      const pMT = toMTp(code);
      if (!pMT) return null;
      const cs = crackSpread(pMT, brent, col.bblMT);
      // D-1 crack
      let d1 = null;
      if (prevD) {
        const bD1 = getPrice(dataset, 'PCAAS00', prevD);
        const pD1 = getPrice(dataset, code, prevD);
        const colD1 = colByCode[code];
        const pMTD1 = colD1 && pD1 ? toMT(pD1, colD1) : null;
        if (bD1 && pMTD1) {
          const csD1 = crackSpread(pMTD1, bD1, col.bblMT);
          d1 = cs.mt - csD1.mt;
        }
      }
      return { ...cs, d1 };
    };
    return {
      gasoline: calc('AAWZB00'),
      gasoil:   calc('AAVJI00'),
      jet:      calc('PJAAU00'),
      fo1:      calc('PUAAK00'),
      fo35:     calc('PUABA00'),
      butane:   calc('PMAAL00'),
    };
  }, [selectedDate, brent, dataset]);

  // ── Spreads de localisation et qualité ───────────────────────
  const spreads = useMemo(() => {
    const jetNWE   = toMTp('PJAAU00');
    const jetMed   = toMTp('AAIDL00');
    const go0Med   = toMTp('AAVJI00');
    const goFut    = toMTp('GAS1');
    const fo1Med   = toMTp('PUAAK00');
    const fo1NWE   = toMTp('PUAAL00');
    const fo35NWE  = toMTp('PUABA00');
    const butNWE   = toMTp('PMAAL00');
    const butWMed  = toMTp('PMAAM00');
    const gasNWE   = toMTp('AAWZB00');
    const gasMed   = toMTp('AAWZA00');
    const goAG     = toMTp('AAIDT00');

    return [
      { label: 'Jet CIF NWE vs FOB Med',       value: jetNWE && jetMed ? jetNWE - jetMed : null,        signal: 'NWE premium' },
      { label: 'Gasoil FOB Med vs Futures ICE', value: go0Med && goFut ? go0Med - goFut : null,          signal: 'Physical vs paper' },
      { label: 'Gasoil FOB Med vs FOB AG',      value: go0Med && goAG ? go0Med - goAG : null,            signal: 'Arbitrage Med↔AG' },
      { label: 'FO 1%S CIF NWE vs FOB Med',     value: fo1NWE && fo1Med ? fo1NWE - fo1Med : null,        signal: 'NWE premium freight' },
      { label: 'FO 1%S vs 3.5%S CIF NWE',      value: fo1NWE && fo35NWE ? fo1NWE - fo35NWE : null,      signal: 'Low-S premium IMO2020' },
      { label: 'Butane FOB W.Med vs NWE',       value: butWMed && butNWE ? butWMed - butNWE : null,      signal: 'Arb W.Med → NWE?' },
      { label: 'Gasoline CIF Med vs FOB Med',   value: gasNWE && gasMed ? gasNWE - gasMed : null,        signal: 'CIF premium (fret incl.)' },
    ];
  }, [selectedDate, dataset]);

  // ── Signaux de marché ─────────────────────────────────────────
  const signals = useMemo(() => {
    const sigs = [];
    if (brent && prevD) {
      const bD1 = getPrice(dataset, 'PCAAS00', prevD);
      if (bD1) {
        const pctChg = (brent - bD1) / bD1 * 100;
        if (Math.abs(pctChg) > 3) sigs.push({ level: 'high', text: `Brent ${pctChg > 0 ? '↑' : '↓'} ${fmt(Math.abs(pctChg), 1)}% vs J-1 — mouvement exceptionnel sur le brut.` });
      }
    }
    if (cracks.jet?.mt > 350) sigs.push({ level: 'bull', text: `Jet crack à ${fmt(cracks.jet.mt, 0)} $/MT — aviation exceptionnelle, privilégier les ventes de Jet.` });
    else if (cracks.jet?.mt > 200) sigs.push({ level: 'info', text: `Jet crack solide (${fmt(cracks.jet?.mt ?? 0, 0)} $/MT).` });
    if (cracks.gasoil?.mt > 300) sigs.push({ level: 'bull', text: `Gasoil crack à ${fmt(cracks.gasoil.mt, 0)} $/MT — marché distillat moyen très fort.` });
    if (cracks.fo35?.mt < -100) sigs.push({ level: 'bear', text: `Fuel Oil HSFO crack négatif (${fmt(cracks.fo35?.mt ?? 0, 0)} $/MT) — éviter l'accumulation de FO 3.5%.` });
    const butSpread = spreads.find(s => s.label.includes('Butane FOB W.Med'));
    if (butSpread?.value > 100) sigs.push({ level: 'arb', text: `Spread Butane W.Med/NWE à +${fmt(butSpread.value, 0)} $/MT — arbitrage à étudier (NWE → W.Med).` });
    const physFut = spreads.find(s => s.label.includes('Futures ICE'));
    if (physFut?.value && Math.abs(physFut.value) > 20) sigs.push({ level: physFut.value < 0 ? 'info' : 'info', text: `Gasoil physique ${physFut.value < 0 ? 'décote' : 'prime'} de ${fmt(Math.abs(physFut.value), 1)} $/MT vs ICE Futures — ${physFut.value < 0 ? 'contango physique' : 'backwardation physique'}.` });
    return sigs;
  }, [cracks, spreads, brent, prevD, dataset]);

  // ── Données chart ─────────────────────────────────────────────
  const chartData = useMemo(() => {
    const cols = chartSeries.map(code => colByCode[code]).filter(Boolean);
    return [...dates].reverse().map(date => {
      const entry = { date };
      cols.forEach(col => {
        const p = getPrice(dataset, col.code, date);
        entry[col.code] = p ? toMT(p, col) : null;
      });
      return entry;
    });
  }, [chartSeries, dates, dataset]);

  // ── Appliquer au Dashboard ─────────────────────────────────────
  const applyToDashboard = () => {
    if (brent && setMarketPrice) setMarketPrice('brent', String(brent));
    const gasoil = getP('AAVJI00');
    if (gasoil && setMarketPrice) setMarketPrice('gasoil', String(gasoil));
    const go_ag = getP('AAIDT00');
    // wti not in file — skip
  };

  const sections = [
    { id: 'snapshot',     label: 'Snapshot' },
    { id: 'cracks',       label: 'Crack Spreads' },
    { id: 'differentials',label: 'Différentiels' },
    { id: 'chart',        label: 'Graphique' },
    { id: 'signals',      label: `Signaux (${signals.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Platts Board</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Source : <b>{dataset.source ?? 'Import Platts'}</b> — {dates.length} jour(s) disponibles
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="!w-auto text-sm">
            {dates.map(d => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Button variant="primary" onClick={applyToDashboard} icon={Zap} size="sm">
            Appliquer au Dashboard
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-slate-200 dark:border-slate-700">
        {sections.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveSection(id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition ${
              activeSection === id
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── SNAPSHOT ──────────────────────────────────────────── */}
      {activeSection === 'snapshot' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PLATTS_COLS.filter(c => ['PCAAS00','AAVJI00','PJAAU00','AAWZB00','PUABA00','PMAAL00','PMAAM00','AAIDT00'].includes(c.code)).map(col => {
              const p   = getP(col.code);
              const pMT = p ? toMT(p, col) : null;
              const d1p  = prevD ? getPrice(dataset, col.code, prevD) : null;
              const d1MT = d1p ? toMT(d1p, col) : null;
              const d1   = pMT && d1MT ? pMT - d1MT : null;
              const d1pct = d1 && d1MT ? d1 / d1MT * 100 : null;
              return <PriceCard key={col.code} col={col} price={col.unit === 'bbl' ? p : pMT} d1={d1} d1pct={d1pct} />;
            })}
          </div>

          {/* Full price table */}
          <Card>
            <CardHeader icon={Activity} title="Tous les assessments Platts"
              subtitle={`Date : ${selectedDate}`} />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">
                      <th className="text-left py-2 px-3 w-28">Code</th>
                      <th className="text-left py-2 px-3">Assessment</th>
                      <th className="text-left py-2 px-3 w-20">Région</th>
                      <th className="text-right py-2 px-3">Prix</th>
                      <th className="text-right py-2 px-3">Unité</th>
                      <th className="text-right py-2 px-3">D-1</th>
                      <th className="text-right py-2 px-3">D-1 %</th>
                      <th className="text-right py-2 px-3">S-1</th>
                      <th className="text-right py-2 px-3">M-1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLATTS_COLS.map(col => {
                      const p    = getP(col.code);
                      if (!p) return null;
                      const pMT  = toMT(p, col);
                      const d1p  = prevD ? getPrice(dataset, col.code, prevD) : null;
                      const d1MT = d1p ? toMT(d1p, col) : null;
                      const d1   = pMT && d1MT ? pMT - d1MT : null;
                      const d1pc = d1 && d1MT ? d1 / d1MT * 100 : null;
                      const w1p  = prevW ? getPrice(dataset, col.code, prevW) : null;
                      const w1MT = w1p ? toMT(w1p, col) : null;
                      const w1   = pMT && w1MT ? pMT - w1MT : null;
                      const m1p  = prevM ? getPrice(dataset, col.code, prevM) : null;
                      const m1MT = m1p ? toMT(m1p, col) : null;
                      const m1   = pMT && m1MT ? pMT - m1MT : null;
                      return (
                        <tr key={col.code} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                          <td className="py-2 px-3 font-mono text-xs" style={{ color: col.color }}>{col.code}</td>
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-xs">{col.name}</td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: col.color }}>
                              {col.region}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {fmt(col.unit === 'bbl' ? p : pMT, 2)}
                          </td>
                          <td className="py-2 px-3 text-right text-xs text-slate-500 dark:text-slate-400">$/{col.unit}</td>
                          <td className={`py-2 px-3 text-right text-xs font-semibold ${varColor(d1)}`}>{fmtVar(d1)}</td>
                          <td className={`py-2 px-3 text-right text-xs ${varColor(d1pc)}`}>{d1pc ? fmtVar(d1pc, 1) + '%' : '—'}</td>
                          <td className={`py-2 px-3 text-right text-xs ${varColor(w1)}`}>{fmtVar(w1)}</td>
                          <td className={`py-2 px-3 text-right text-xs ${varColor(m1)}`}>{fmtVar(m1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {/* ── CRACK SPREADS ─────────────────────────────────────── */}
      {activeSection === 'cracks' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md text-xs text-blue-800 dark:text-blue-300">
            <b>Méthode :</b> Crack spread ($/MT) = Prix produit $/MT − (Brent $/bbl × bbl/MT du produit) &nbsp;|&nbsp; Crack ($/bbl) = Prix produit $/bbl − Brent $/bbl
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <CrackCard label="Gasoil 0.1% FOB Med" spreadMT={cracks.gasoil?.mt} spreadBbl={cracks.gasoil?.bbl} d1MT={cracks.gasoil?.d1} accent="blue" />
            <CrackCard label="Jet A1 CIF NWE"      spreadMT={cracks.jet?.mt}    spreadBbl={cracks.jet?.bbl}    d1MT={cracks.jet?.d1}    accent="red" />
            <CrackCard label="Gasoline CIF Med"    spreadMT={cracks.gasoline?.mt} spreadBbl={cracks.gasoline?.bbl} d1MT={cracks.gasoline?.d1} accent="green" />
            <CrackCard label="HSFO 3.5%S CIF NWE"  spreadMT={cracks.fo35?.mt}   spreadBbl={cracks.fo35?.bbl}   d1MT={cracks.fo35?.d1}   accent="slate" />
            <CrackCard label="FO 1%S FOB Med"      spreadMT={cracks.fo1?.mt}    spreadBbl={cracks.fo1?.bbl}    d1MT={cracks.fo1?.d1}    accent="slate" />
            <CrackCard label="Butane FOB NWE"      spreadMT={cracks.butane?.mt} spreadBbl={cracks.butane?.bbl} d1MT={cracks.butane?.d1} accent="green" />
          </div>
          {/* Table synthèse */}
          <Card>
            <CardHeader icon={BarChart3} title="Synthèse cracking margins" subtitle="Crack vs Dated Brent" />
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">
                    <th className="text-left py-2 px-4">Produit</th>
                    <th className="text-right py-2 px-4">Prix $/MT</th>
                    <th className="text-right py-2 px-4">Brent conv. $/MT</th>
                    <th className="text-right py-2 px-4">Crack $/MT</th>
                    <th className="text-right py-2 px-4">Crack $/bbl</th>
                    <th className="text-left py-2 px-4">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: 'AAVJI00', label: 'Gasoil 0.1%S FOB Med', c: cracks.gasoil  },
                    { code: 'AAWZB00', label: 'Gasoline CIF Med',     c: cracks.gasoline},
                    { code: 'PJAAU00', label: 'Jet A1 CIF NWE',       c: cracks.jet     },
                    { code: 'AAIDL00', label: 'Jet A1 FOB Med',       c: (() => { const col = colByCode['AAIDL00']; const p = toMTp('AAIDL00'); return p && brent ? { ...crackSpread(p, brent, col.bblMT), d1: null } : null; })() },
                    { code: 'PUAAK00', label: 'FO 1%S FOB Med',       c: cracks.fo1     },
                    { code: 'PUABA00', label: 'HSFO 3.5%S CIF NWE',   c: cracks.fo35    },
                  ].map(({ code, label, c }) => {
                    if (!c) return null;
                    const col = colByCode[code];
                    const brentConv = brent ? brent * col.bblMT : null;
                    const signal = c.mt > 300 ? '🔥 Exceptionnel' : c.mt > 150 ? '✅ Fort' : c.mt > 50 ? '📊 Normal' : c.mt < 0 ? '⚠️ Négatif' : '📉 Faible';
                    return (
                      <tr key={code} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{label}</td>
                        <td className="py-2 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">{fmt(toMTp(code), 2)}</td>
                        <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-400">{brentConv ? fmt(brentConv, 2) : '—'}</td>
                        <td className={`py-2 px-4 text-right font-bold ${c.mt > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                          {fmtVar(c.mt)}
                        </td>
                        <td className={`py-2 px-4 text-right text-sm ${c.bbl > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                          {fmtVar(c.bbl, 2)}
                        </td>
                        <td className="py-2 px-4 text-sm text-slate-700 dark:text-slate-300">{signal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── DIFFÉRENTIELS ─────────────────────────────────────── */}
      {activeSection === 'differentials' && (
        <div className="space-y-4">
          <Card>
            <CardHeader icon={ArrowUpDown} title="Spreads de localisation & qualité"
              subtitle="Opportunités d'arbitrage et primes géographiques" />
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">
                    <th className="text-left py-2 px-4">Spread</th>
                    <th className="text-right py-2 px-4">$/MT</th>
                    <th className="text-right py-2 px-4">$/bbl</th>
                    <th className="text-left py-2 px-4">Signal trader</th>
                    <th className="text-left py-2 px-4">Interprétation</th>
                  </tr>
                </thead>
                <tbody>
                  {spreads.map(s => {
                    if (s.value === null) return null;
                    const abs = Math.abs(s.value);
                    let interpretation = '';
                    let signal = '';
                    if (s.label.includes('Butane FOB W.Med')) {
                      signal = s.value > 150 ? '🚀 Arb ouvert' : s.value > 80 ? '👀 À surveiller' : '➡️ Spread normal';
                      interpretation = s.value > 150 ? `Écart élevé — envisager un flux NWE→W.Med si le fret le permet` : `Spread W.Med/NWE standard pour la saisonnalité`;
                    } else if (s.label.includes('Jet CIF NWE vs FOB Med')) {
                      interpretation = `Prime NWE sur Med = freight + prime qualité air NWE`;
                      signal = s.value > 40 ? '✈️ Flux Med→NWE rentable' : '📊 Normal';
                    } else if (s.label.includes('FOB Med vs Futures ICE')) {
                      signal = s.value < -15 ? '📉 Contango physique' : s.value > 15 ? '📈 Backwardation physique' : '➡️ Proche convergence';
                      interpretation = s.value < 0 ? `Physique décote de ${fmt(Math.abs(s.value), 1)} $/MT vs futures — acheteurs attendent` : `Physique prime de ${fmt(s.value, 1)} $/MT — demande immédiate forte`;
                    } else if (s.label.includes('FO 1%S vs 3.5%S')) {
                      signal = s.value > 25 ? '♻️ Spread IMO2020 élevé' : '📊 Spread bas-soufre standard';
                      interpretation = `Prime low-sulfur post-IMO2020 — écart bunker LSFO/HSFO`;
                    } else if (s.label.includes('FOB Med vs FOB AG')) {
                      signal = s.value > 50 ? '🌍 Med cher vs AG' : s.value < 0 ? '🌍 AG cher vs Med' : '➡️ Parité régionale';
                      interpretation = `Différentiel Med/AG gasoil = arbitrage shipping possible`;
                    } else {
                      signal = abs > 30 ? '📌 Notable' : '➡️ Standard';
                      interpretation = `${s.signal}`;
                    }
                    return (
                      <tr key={s.label} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2 px-4 text-slate-800 dark:text-slate-200 text-xs">{s.label}</td>
                        <td className={`py-2 px-4 text-right font-bold text-sm ${varColor(s.value)}`}>{fmtVar(s.value)}</td>
                        <td className={`py-2 px-4 text-right text-xs ${varColor(s.value)}`}>
                          {fmt(s.value / 7.5, 2)}
                        </td>
                        <td className="py-2 px-4 text-xs">{signal}</td>
                        <td className="py-2 px-4 text-xs text-slate-600 dark:text-slate-400">{interpretation}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>

          {/* AG market */}
          <Card>
            <CardHeader icon={Globe} title="Marché Arab Gulf & Asie"
              subtitle="Assessments AG et Singapore — absents des plateformes standard" />
            <CardBody>
              <div className="grid md:grid-cols-2 gap-4">
                {['AAIDT00','AFUJK00','AAICY00','PGAEY00'].map(code => {
                  const col = colByCode[code];
                  if (!col) return null;
                  const p = getP(code);
                  if (!p) return <div key={code} className="text-xs text-slate-400 dark:text-slate-500 p-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-md">
                    {col.abbr} — données non disponibles pour cette date
                  </div>;
                  const pMT = toMT(p, col);
                  const d1p = prevD ? getPrice(dataset, code, prevD) : null;
                  const d1MT = d1p ? toMT(d1p, col) : null;
                  const d1 = pMT && d1MT ? pMT - d1MT : null;
                  const crack = brent ? crackSpread(pMT, brent, col.bblMT) : null;
                  return (
                    <div key={code} className="p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-xs text-amber-600 dark:text-amber-400">{col.code}</span>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{col.name}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded text-white bg-amber-600">{col.region}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Prix</div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{fmt(p, 2)} $/{col.unit}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">D-1</div>
                          <div className={`font-semibold ${varColor(d1)}`}>{fmtVar(d1)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Crack</div>
                          <div className={`font-semibold ${crack ? varColor(crack.bbl) : ''}`}>
                            {crack ? fmtVar(crack.bbl, 2) + ' $/bbl' : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── CHART ─────────────────────────────────────────────── */}
      {activeSection === 'chart' && (
        <div className="space-y-4">
          <Card>
            <CardHeader icon={BarChart3} title="Historique des prix"
              subtitle="Sélectionner les séries à afficher ($/MT normalisé)"
              action={
                <div className="flex flex-wrap gap-1">
                  {PLATTS_COLS.filter(c => ['PCAAS00','AAVJI00','PJAAU00','AAWZB00','PUABA00','PMAAM00'].includes(c.code)).map(col => (
                    <button key={col.code}
                      onClick={() => setChartSeries(prev =>
                        prev.includes(col.code) ? prev.filter(c => c !== col.code) : [...prev, col.code]
                      )}
                      className={`text-xs px-2 py-1 rounded-md border transition ${
                        chartSeries.includes(col.code)
                          ? 'text-white'
                          : 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                      style={chartSeries.includes(col.code) ? { backgroundColor: col.color, borderColor: col.color } : {}}>
                      {col.abbr}
                    </button>
                  ))}
                </div>
              }
            />
            <CardBody>
              <div style={{ height: 420 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={d => d.slice(5)} />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(val, name) => {
                        const col = colByCode[name];
                        return [`${fmt(val, 2)} $/MT`, col?.abbr ?? name];
                      }}
                      labelFormatter={l => `Date : ${l}`}
                    />
                    <Legend formatter={name => colByCode[name]?.abbr ?? name} />
                    {chartSeries.map(code => {
                      const col = colByCode[code];
                      if (!col) return null;
                      return (
                        <Line key={code} type="monotone" dataKey={code}
                          stroke={col.chartColor} strokeWidth={2}
                          dot={false} activeDot={{ r: 4 }}
                          connectNulls={false} />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── SIGNAUX ───────────────────────────────────────────── */}
      {activeSection === 'signals' && (
        <div className="space-y-3">
          {signals.length === 0 && (
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 py-4">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="text-sm">Aucun signal particulier détecté pour cette date.</span>
                </div>
              </CardBody>
            </Card>
          )}
          {signals.map((s, i) => {
            const palette = {
              high: { bg: 'bg-red-50 dark:bg-red-900/20',     bd: 'border-red-300 dark:border-red-700',     tt: 'text-red-800 dark:text-red-300',     ico: AlertTriangle },
              bull: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', bd: 'border-emerald-300 dark:border-emerald-700', tt: 'text-emerald-800 dark:text-emerald-300', ico: TrendingUp },
              bear: { bg: 'bg-amber-50 dark:bg-amber-900/20', bd: 'border-amber-300 dark:border-amber-700', tt: 'text-amber-800 dark:text-amber-300', ico: TrendingDown },
              arb:  { bg: 'bg-blue-50 dark:bg-blue-900/20',   bd: 'border-blue-300 dark:border-blue-700',   tt: 'text-blue-800 dark:text-blue-300',   ico: Layers },
              info: { bg: 'bg-slate-50 dark:bg-slate-800',    bd: 'border-slate-200 dark:border-slate-600', tt: 'text-slate-700 dark:text-slate-300',  ico: Activity },
            }[s.level] ?? { bg: 'bg-slate-50 dark:bg-slate-800', bd: 'border-slate-200', tt: 'text-slate-700', ico: Activity };
            const Icon = palette.ico;
            return (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-md border ${palette.bg} ${palette.bd}`}>
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${palette.tt}`} />
                <p className={`text-sm ${palette.tt}`}>{s.text}</p>
              </div>
            );
          })}

          {/* Analyse rapide de la date */}
          <Card>
            <CardHeader icon={Activity} title={`Analyse rapide — ${selectedDate}`} />
            <CardBody>
              <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {brent && <p>• <b>Brent Dated à {fmt(brent, 2)} $/bbl</b> — {prevD && getPrice(dataset,'PCAAS00',prevD) ? `${fmtVar((brent - getPrice(dataset,'PCAAS00',prevD)) / getPrice(dataset,'PCAAS00',prevD) * 100, 1)}% vs J-1` : ''}.</p>}
                {cracks.gasoil && <p>• Crack <b>Gasoil</b> : {fmtVar(cracks.gasoil.mt)} $/MT ({fmtVar(cracks.gasoil.bbl, 2)} $/bbl) — {cracks.gasoil.mt > 300 ? 'margin refinery exceptionnelle, forte demande distillats.' : cracks.gasoil.mt > 150 ? 'bonne marge gasoil.' : 'marge modérée.'}</p>}
                {cracks.jet    && <p>• Crack <b>Jet A1 CIF NWE</b> : {fmtVar(cracks.jet.mt)} $/MT — {cracks.jet.mt > 350 ? 'aviation très forte, excellent pour fret AMKO en Jet.' : 'crack jet solide.'}</p>}
                {cracks.fo35   && <p>• Crack <b>HSFO 3.5%S</b> : {fmtVar(cracks.fo35.mt)} $/MT ({cracks.fo35.mt < 0 ? 'négatif — FO se vend sous la valeur du brut.' : 'positif.'}).</p>}
                {spreads.find(s => s.label.includes('Butane FOB W.Med'))?.value != null && <p>• Spread <b>Butane W.Med/NWE</b> : +{fmt(spreads.find(s => s.label.includes('Butane FOB W.Med'))?.value, 0)} $/MT — {(spreads.find(s => s.label.includes('Butane FOB W.Med'))?.value ?? 0) > 100 ? 'arbitrage potentiel à étudier.' : 'spread dans les normes.'}</p>}
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
