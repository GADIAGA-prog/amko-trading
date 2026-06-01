import React, { useState, useEffect, useRef, useMemo } from 'react';

import {
  LayoutDashboard, FilePlus2, Calculator, Ship, DollarSign,
  ScrollText, ShieldAlert, Trash2, Save, Plus,
  TrendingUp, TrendingDown, FileCheck2,
  Droplets, Anchor, Info, ExternalLink, BarChart3, Lightbulb,
  Globe, Newspaper, Activity, BookOpen, Layers, AlertTriangle, CheckCircle2,
  Lock, User, LogOut, UserPlus, Users, Eye, EyeOff, KeyRound, ShieldCheck
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

// ============================================================
// SHIM : window.storage -> localStorage
// (Permet de déployer le code hors de l'environnement Claude.
// localStorage est synchrone, on l'enveloppe en async pour rester
// compatible avec les appels await dispersés dans le code.)
// ============================================================
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key) {
      const v = localStorage.getItem(key);
      return v !== null ? { value: v } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return true;
    },
  };
}

// ============================================================
// CONSTANTES MÉTIER
// ============================================================
const PRODUCTS = {
  'crude-brent':       { name: 'Brut Brent',          bblPerMT: 7.45, type: 'crude',   marker: 'brent' },
  'crude-wti':         { name: 'Brut WTI',            bblPerMT: 7.50, type: 'crude',   marker: 'wti' },
  'crude-bonny':       { name: 'Bonny Light',         bblPerMT: 7.55, type: 'crude',   marker: 'brent' },
  'crude-dubai':       { name: 'Dubai',               bblPerMT: 7.30, type: 'crude',   marker: 'dubai' },
  'crude-arab-light':  { name: 'Arabian Light',       bblPerMT: 7.35, type: 'crude',   marker: 'dubai' },
  'gasoline':          { name: 'Essence (Gasoline)',  bblPerMT: 8.50, type: 'product', marker: 'rbob' },
  'gasoil':            { name: 'Gasoil / Diesel 10ppm', bblPerMT: 7.50, type: 'product', marker: 'gasoil' },
  'jet':               { name: 'Jet A1 / Kérosène',   bblPerMT: 7.90, type: 'product', marker: 'gasoil' },
  'naphtha':           { name: 'Naphta',              bblPerMT: 8.90, type: 'product', marker: 'brent' },
  'fuel-oil':          { name: 'Fuel Oil (HSFO)',     bblPerMT: 6.70, type: 'product', marker: 'brent' },
  'propane':           { name: 'Propane (GPL)',       bblPerMT: 12.50, type: 'gpl',    marker: 'brent' },
  'butane':            { name: 'Butane (GPL)',        bblPerMT: 11.00, type: 'gpl',    marker: 'brent' },
};

const CONTRACTS = {
  'brn-full':  { name: 'ICE Brent (BRN) — 1 000 bbl',           size: 1000, unit: 'bbl', marker: 'brent', tvSymbol: 'ICEEUR:BRN1!' },
  'brn-mini':  { name: 'ICE Brent Mini (BMC) — 100 bbl',         size: 100,  unit: 'bbl', marker: 'brent', tvSymbol: 'ICEEUR:BRN1!' },
  'cl-full':   { name: 'NYMEX WTI (CL) — 1 000 bbl',             size: 1000, unit: 'bbl', marker: 'wti',   tvSymbol: 'NYMEX:CL1!' },
  'cl-mini':   { name: 'NYMEX E-mini WTI (QM) — 500 bbl',        size: 500,  unit: 'bbl', marker: 'wti',   tvSymbol: 'NYMEX:CL1!' },
  'dme-oman':  { name: 'DME Oman / Dubai — 1 000 bbl',           size: 1000, unit: 'bbl', marker: 'dubai', tvSymbol: 'NYMEX:CL1!' },
  'gas-ice':   { name: 'ICE Gasoil (LGO) — 100 MT',              size: 100,  unit: 'MT',  marker: 'gasoil',tvSymbol: 'ICEEUR:G1!' },
  'rb-nymex':  { name: 'NYMEX RBOB Gasoline — 42 000 gal',       size: 1000, unit: 'bbl', marker: 'rbob',  tvSymbol: 'NYMEX:RB1!' },
  'ho-nymex':  { name: 'NYMEX ULSD / Heating Oil — 42 000 gal',  size: 1000, unit: 'bbl', marker: 'ulsd',  tvSymbol: 'NYMEX:HO1!' },
};

const TV_SYMBOLS = {
  brent:  { symbol: 'TVC:UKOIL',     name: 'Brent Crude' },
  wti:    { symbol: 'TVC:USOIL',     name: 'WTI Crude' },
  gasoil: { symbol: 'ICEEUR:G1!',    name: 'ICE Gasoil' },
  ulsd:   { symbol: 'NYMEX:HO1!',    name: 'ULSD / Heating Oil' },
  rbob:   { symbol: 'NYMEX:RB1!',    name: 'RBOB Gasoline' },
  natgas: { symbol: 'NYMEX:NG1!',    name: 'Natural Gas' },
  dxy:    { symbol: 'TVC:DXY',       name: 'US Dollar Index' },
};

const INCOTERMS = ['FOB', 'CFR', 'CIF', 'DAP', 'DES', 'FIP'];
const VESSELS = ['ULCC (>350kt)', 'VLCC (200-350kt)', 'Suezmax (120-200kt)', 'Aframax/LR2 (80-120kt)', 'Panamax/LR1 (55-80kt)', 'MR (40-55kt)', 'Handysize (25-39kt)'];
const PRICE_SOURCES = ['Platts', 'Argus', 'OPIS'];
const RISK_TYPES = [
  'Prix', 'Crédit (paiement)', 'Performance', 'Qualité', 'Quantité',
  'Logistique', 'Documentaire', 'Pays / Sanctions', 'Bancaire', 'QHSE'
];

const SANCTIONED_COUNTRIES = ['russia', 'russie', 'iran', 'cuba', 'north korea', 'corée du nord', 'syria', 'syrie', 'venezuela', 'belarus', 'biélorussie', 'sudan', 'soudan'];

// ============================================================
// LOGO AMKO TRADING (SVG embarqué)
// ============================================================
const AmkoLogo = ({ size = 'md', showTagline = true, variant = 'light' }) => {
  // variants: 'light' (sur fond clair) | 'dark' (sur fond foncé - inverse "TRADING" en blanc)
  const heights = { sm: 32, md: 48, lg: 72, xl: 96 };
  const h = heights[size] || heights.md;
  const w = h * 2.4; // ratio approx du logo

  return (
    <svg viewBox="0 0 480 200" width={w} height={h} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        {/* Dégradé orange de la goutte */}
        <linearGradient id="amkoDrop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#FFD93D" />
          <stop offset="35%" stopColor="#FFA726" />
          <stop offset="70%" stopColor="#FB8C00" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        {/* Dégradé vert des lettres AMK */}
        <linearGradient id="amkoGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7CB342" />
          <stop offset="100%" stopColor="#558B2F" />
        </linearGradient>
        {/* Dégradé vert de la sphère O (mappemonde stylisée) */}
        <radialGradient id="amkoSphere" cx="35%" cy="35%" r="65%">
          <stop offset="0%"  stopColor="#AED581" />
          <stop offset="60%" stopColor="#7CB342" />
          <stop offset="100%" stopColor="#33691E" />
        </radialGradient>
      </defs>

      {/* === Lettres "AMK" === */}
      {/* A */}
      <path d="M 30 130 L 70 30 L 95 30 L 135 130 L 110 130 L 102 108 L 63 108 L 55 130 Z M 72 88 L 93 88 L 82.5 58 Z"
        fill="url(#amkoGreen)" />
      {/* M */}
      <path d="M 150 130 L 150 30 L 178 30 L 200 80 L 222 30 L 250 30 L 250 130 L 228 130 L 228 70 L 210 110 L 190 110 L 172 70 L 172 130 Z"
        fill="url(#amkoGreen)" />
      {/* K */}
      <path d="M 268 130 L 268 30 L 290 30 L 290 70 L 325 30 L 354 30 L 312 76 L 358 130 L 327 130 L 290 86 L 290 130 Z"
        fill="url(#amkoGreen)" />

      {/* === Goutte orange (le "O") === */}
      <path d="M 410 25
               C 410 25, 380 60, 372 90
               C 366 112, 372 138, 392 152
               C 412 166, 438 162, 450 144
               C 462 126, 458 102, 448 82
               C 438 62, 425 42, 410 25 Z"
        fill="url(#amkoDrop)" />

      {/* Sphère verte intégrée dans la goutte */}
      <circle cx="408" cy="105" r="28" fill="url(#amkoSphere)" opacity="0.95" />
      {/* "Continents" stylisés sur la sphère */}
      <path d="M 392 95 Q 398 92 405 96 Q 412 100 418 95 M 388 108 Q 395 112 405 110 Q 415 108 422 113 M 394 122 Q 402 124 410 121"
        stroke="#33691E" strokeWidth="1.8" fill="none" opacity="0.6" strokeLinecap="round" />

      {/* Reflet brillant sur la goutte */}
      <ellipse cx="438" cy="55" rx="8" ry="14" fill="#FFFFFF" opacity="0.5" transform="rotate(-25 438 55)" />

      {/* === TRADING === */}
      <text x="190" y="172" textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="26"
        letterSpacing="6"
        fill={variant === 'dark' ? '#FFFFFF' : '#9E9E9E'}>
        {showTagline ? 'TRADING' : ''}
      </text>

      {/* Soulignement décoratif sous TRADING (filet gris) */}
      {showTagline && (
        <line x1="100" y1="185" x2="280" y2="185"
          stroke={variant === 'dark' ? '#FFFFFF' : '#BDBDBD'} strokeWidth="1.5" opacity="0.6" />
      )}
    </svg>
  );
};

// ============================================================
// UTILITAIRES
// ============================================================
const fmt = (n, d = 2) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtUSD = (n, d = 2) => '$ ' + fmt(n, d);
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => 'D' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
const daysBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
};

// ============================================================
// COMPOSANTS UI DE BASE
// ============================================================
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      {Icon && <div className="p-2 bg-blue-50 rounded-md"><Icon className="w-5 h-5 text-blue-700" /></div>}
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);
const CardBody = ({ children, className = '' }) => <div className={`p-5 ${className}`}>{children}</div>;

const Field = ({ label, children, hint, required }) => (
  <div>
    <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wide">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
);

const Input = (props) => (
  <input {...props}
    className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${props.className || ''}`}
  />
);
const Select = ({ children, ...props }) => (
  <select {...props}
    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
    {children}
  </select>
);
const Textarea = (props) => (
  <textarea {...props}
    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-y"
  />
);

const Button = ({ children, variant = 'primary', icon: Icon, size = 'md', ...props }) => {
  const variants = {
    primary: 'bg-blue-700 text-white hover:bg-blue-800 disabled:bg-slate-300',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    gold: 'bg-amber-600 text-white hover:bg-amber-700',
    outline: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  return (
    <button {...props} className={`rounded-md font-medium flex items-center gap-2 transition ${variants[variant]} ${sizes[size]}`}>
      {Icon && <Icon className="w-4 h-4" />}{children}
    </button>
  );
};

const Stat = ({ label, value, hint, accent = 'blue' }) => {
  const colors = { blue: 'text-blue-700', green: 'text-emerald-700', red: 'text-red-700', gold: 'text-amber-700', slate: 'text-slate-700' };
  return (
    <div className="px-4 py-3 bg-white rounded-md border border-slate-200">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colors[accent]}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between py-1.5 border-b border-slate-100">
    <span className="text-slate-600">{label}</span><span className="font-semibold text-slate-900">{value}</span>
  </div>
);

// ============================================================
// COMPOSANTS TRADINGVIEW (chargement scripts officiels)
// ============================================================
const TVTickerTape = () => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'TVC:UKOIL', title: 'Brent' },
        { proName: 'TVC:USOIL', title: 'WTI' },
        { proName: 'ICEEUR:G1!', title: 'ICE Gasoil' },
        { proName: 'NYMEX:HO1!', title: 'ULSD' },
        { proName: 'NYMEX:RB1!', title: 'RBOB' },
        { proName: 'NYMEX:NG1!', title: 'Natural Gas' },
        { proName: 'TVC:DXY', title: 'USD Index' },
      ],
      isTransparent: false, showSymbolLogo: false, colorTheme: 'light',
      locale: 'fr', displayMode: 'adaptive'
    });
    ref.current.appendChild(script);
  }, []);
  return <div className="tradingview-widget-container" ref={ref}><div className="tradingview-widget-container__widget"></div></div>;
};

const TVAdvancedChart = ({ symbol = 'TVC:UKOIL', height = 500, interval = '60' }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    ref.current.appendChild(widgetDiv);
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true, symbol, interval, timezone: 'Etc/UTC',
      theme: 'light', style: '1', locale: 'fr',
      toolbar_bg: '#f1f3f6', enable_publishing: false,
      allow_symbol_change: true, calendar: false,
      studies: ['MASimple@tv-basicstudies', 'Volume@tv-basicstudies'],
      support_host: 'https://www.tradingview.com'
    });
    ref.current.appendChild(script);
  }, [symbol, interval]);
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: `${height}px`, width: '100%' }}></div>
  );
};

const TVMiniChart = ({ symbol, name }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(widgetDiv);
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol, width: '100%', height: 180, locale: 'fr',
      dateRange: '12M', colorTheme: 'light', trendLineColor: 'rgba(41,98,255,1)',
      underLineColor: 'rgba(41,98,255,0.15)', isTransparent: false, autosize: false,
      largeChartUrl: ''
    });
    ref.current.appendChild(script);
  }, [symbol]);
  return (
    <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-700">{name}</div>
      <div className="tradingview-widget-container" ref={ref}></div>
    </div>
  );
};

const TVTimeline = ({ height = 500 }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(widgetDiv);
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      feedMode: 'all_symbols', isTransparent: false, displayMode: 'regular',
      width: '100%', height, colorTheme: 'light', locale: 'fr'
    });
    ref.current.appendChild(script);
  }, [height]);
  return <div className="tradingview-widget-container" ref={ref}></div>;
};

const TVEconCalendar = ({ height = 500 }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(widgetDiv);
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'light', isTransparent: false, locale: 'fr',
      importanceFilter: '-1,0,1', countryFilter: 'us,eu,gb,fr,de,cn,sa,ru,no,ng',
      width: '100%', height
    });
    ref.current.appendChild(script);
  }, [height]);
  return <div className="tradingview-widget-container" ref={ref}></div>;
};

// ============================================================
// MODULE : MARKET (CHARTS LIVE)
// ============================================================
function Market() {
  const [selected, setSelected] = useState('TVC:UKOIL');
  const [interval, setIntv] = useState('60');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Marché — temps réel</h1>
        <p className="text-sm text-slate-500 mt-1">Cotations live des principaux benchmarks pétroliers (données TradingView)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(TV_SYMBOLS).map(([k, s]) => (
          <button key={k} onClick={() => setSelected(s.symbol)}
            className={`px-4 py-2 rounded-md text-sm font-medium border transition text-left ${selected === s.symbol ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
            {s.name}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader icon={Activity} title="Chart avancé"
          subtitle={Object.values(TV_SYMBOLS).find(s => s.symbol === selected)?.name || 'Marché'}
          action={
            <div className="flex gap-1">
              {['15', '60', 'D', 'W'].map(t => (
                <button key={t} onClick={() => setIntv(t)}
                  className={`px-3 py-1 text-xs rounded ${interval === t ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {t === '15' ? '15m' : t === '60' ? '1h' : t === 'D' ? '1j' : '1s'}
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          <TVAdvancedChart symbol={selected} interval={interval} height={550} />
        </CardBody>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Aperçu global</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.values(TV_SYMBOLS).map(s => <TVMiniChart key={s.symbol} symbol={s.symbol} name={s.name} />)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={Newspaper} title="Fil d'actualités marché" subtitle="Mise à jour temps réel" />
          <CardBody><TVTimeline height={500} /></CardBody>
        </Card>
        <Card>
          <CardHeader icon={Activity} title="Calendrier économique" subtitle="Événements à fort impact" />
          <CardBody><TVEconCalendar height={500} /></CardBody>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// MODULE : FORWARD CURVE (CONTANGO / BACKWARDATION)
// ============================================================
function ForwardCurve() {
  // Courbe forward type — éditable
  const [marker, setMarker] = useState('brent');
  const [prices, setPrices] = useState([
    { month: 'M+1', price: 82.5 }, { month: 'M+2', price: 82.2 },
    { month: 'M+3', price: 81.9 }, { month: 'M+4', price: 81.6 },
    { month: 'M+5', price: 81.3 }, { month: 'M+6', price: 81.0 },
    { month: 'M+9', price: 80.4 }, { month: 'M+12', price: 79.8 },
  ]);

  const updPrice = (i, v) => setPrices(ps => ps.map((p, idx) => idx === i ? { ...p, price: Number(v) } : p));

  const structure = useMemo(() => {
    if (prices.length < 2) return 'Inconnue';
    const slope = prices[prices.length - 1].price - prices[0].price;
    if (slope > 0.5) return 'CONTANGO';
    if (slope < -0.5) return 'BACKWARDATION';
    return 'NEUTRE / FLAT';
  }, [prices]);

  const spreadM1M6 = (prices[5]?.price || 0) - (prices[0]?.price || 0);
  const spreadM1M12 = (prices[7]?.price || 0) - (prices[0]?.price || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Courbe à terme</h1>
        <p className="text-sm text-slate-500 mt-1">Analyse de la structure contango / backwardation et des spreads</p>
      </div>

      <Card>
        <CardHeader icon={Layers} title="Configuration" />
        <CardBody>
          <Field label="Marker">
            <Select value={marker} onChange={e => setMarker(e.target.value)}>
              <option value="brent">Brent</option><option value="wti">WTI</option>
              <option value="dubai">Dubai</option><option value="gasoil">ICE Gasoil</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-3 gap-3">
        <div className={`px-4 py-3 rounded-md border-2 ${structure === 'CONTANGO' ? 'bg-amber-50 border-amber-400' : structure === 'BACKWARDATION' ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-300'}`}>
          <div className="text-xs uppercase text-slate-600 font-semibold">Structure</div>
          <div className="text-2xl font-bold mt-1 text-slate-900">{structure}</div>
        </div>
        <Stat label="Spread M+1 / M+6" value={`${spreadM1M6 > 0 ? '+' : ''}${fmt(spreadM1M6, 2)} $`} accent={spreadM1M6 > 0 ? 'gold' : 'green'} />
        <Stat label="Spread M+1 / M+12" value={`${spreadM1M12 > 0 ? '+' : ''}${fmt(spreadM1M12, 2)} $`} accent={spreadM1M12 > 0 ? 'gold' : 'green'} />
      </div>

      <Card>
        <CardHeader icon={BarChart3} title="Visualisation de la courbe" />
        <CardBody>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={prices} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip />
                <ReferenceLine y={prices[0]?.price} stroke="#94a3b8" strokeDasharray="4 4" label="Spot" />
                <Line type="monotone" dataKey="price" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Prix $/bbl" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Calculator} title="Éditer les prix forward" subtitle="Saisissez vos cotations pour analyser la courbe" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {prices.map((p, i) => (
              <Field key={i} label={p.month}>
                <Input type="number" step="0.01" value={p.price} onChange={e => updPrice(i, e.target.value)} />
              </Field>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Lightbulb} title="Lecture stratégique" />
        <CardBody>
          <div className="text-sm space-y-2 text-slate-700">
            {structure === 'CONTANGO' && (
              <>
                <p className="font-semibold text-amber-700">⚠ Marché en CONTANGO — prix futurs supérieurs au spot.</p>
                <p>Le marché anticipe une amélioration ou il est sur-approvisionné. Le stockage devient rémunérateur (cash-and-carry). Stratégies à envisager : garder les prix flottants à la vente avec un hedge approprié, exploiter les opportunités de stockage si l'écart couvre les coûts (storage, financing, insurance).</p>
              </>
            )}
            {structure === 'BACKWARDATION' && (
              <>
                <p className="font-semibold text-emerald-700">✓ Marché en BACKWARDATION — pénurie ou tension d'approvisionnement.</p>
                <p>Le spot est cher : déstocker, fixer rapidement les prix à la vente, éviter les positions flottantes. Très favorable aux producteurs qui vendent à terme.</p>
              </>
            )}
            {structure.includes('NEUTRE') && (
              <p>Courbe quasiment plate — pas de signal directionnel fort. Concentrez-vous sur les arbitrages géographiques et de qualité plutôt que sur la structure temporelle.</p>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ============================================================
// MODULE : DASHBOARD
// ============================================================
function Dashboard({ deals, goTo }) {
  const total = deals.length;
  const totalVolume = deals.reduce((s, d) => s + (Number(d.quantity) || 0), 0);
  const totalNotional = deals.reduce((s, d) => s + ((Number(d.quantity) || 0) * (Number(d.estimatedPrice) || 0) * (PRODUCTS[d.product]?.bblPerMT || 7.5)), 0);
  const openDeals = deals.filter(d => d.status !== 'closed').length;
  const recent = [...deals].slice(-5).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-500 mt-1">Vue d'ensemble — marché et opérations</p>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="px-2 py-2"><TVTickerTape /></div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Deals total" value={total} accent="blue" />
        <Stat label="Deals ouverts" value={openDeals} accent="gold" />
        <Stat label="Volume cumulé" value={fmt(totalVolume, 0) + ' MT'} accent="slate" />
        <Stat label="Notional estimé" value={fmtUSD(totalNotional, 0)} accent="green" />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <TVMiniChart symbol="TVC:UKOIL" name="Brent — 12 mois" />
        <TVMiniChart symbol="TVC:USOIL" name="WTI — 12 mois" />
        <TVMiniChart symbol="ICEEUR:G1!" name="ICE Gasoil — 12 mois" />
      </div>

      <Card>
        <CardHeader icon={LayoutDashboard} title="Deals récents"
          action={<Button size="sm" variant="primary" icon={Plus} onClick={() => goTo('new-deal')}>Nouveau deal</Button>} />
        <CardBody>
          {recent.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Droplets className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Aucun deal. Cliquez sur « Nouveau deal » pour commencer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="py-2 pr-4">ID</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Produit</th>
                    <th className="py-2 pr-4">Qté</th><th className="py-2 pr-4">Incoterm</th>
                    <th className="py-2 pr-4">Laycan</th><th className="py-2 pr-4">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(d => (
                    <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-4 font-mono text-xs">{d.id}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.dealType === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {d.dealType === 'buy' ? 'Achat' : 'Vente'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{PRODUCTS[d.product]?.name || d.product}</td>
                      <td className="py-2 pr-4">{fmt(d.quantity, 0)} MT</td>
                      <td className="py-2 pr-4">{d.incoterm}</td>
                      <td className="py-2 pr-4 text-xs">{d.laycanFrom} → {d.laycanTo}</td>
                      <td className="py-2 pr-4"><span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{d.status || 'open'}</span></td>
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

// ============================================================
// MODULE : NEW DEAL
// ============================================================
function NewDeal({ onSave, editingDeal, onCancel }) {
  const [form, setForm] = useState(editingDeal || {
    id: uid(), dealType: 'buy', counterparty: '', counterpartyCountry: '',
    product: 'crude-bonny', quantity: '', tolerance: 10,
    incoterm: 'FOB', loadPort: '', dischargePort: '',
    laycanFrom: todayISO(), laycanTo: todayISO(), blDate: '',
    priceSource: 'Platts', priceMarker: 'brent', differential: '',
    estimatedPrice: '', paymentTerm: 'LC at sight',
    vessel: '', inspector: 'SGS', hedgeRatio: 100, notes: '',
    status: 'open', createdAt: todayISO(),
    bankRating: 'A', counterpartyTier: 'first-class',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.counterparty || !form.quantity) {
      alert('Contrepartie et quantité sont obligatoires.');
      return;
    }
    onSave(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{editingDeal ? 'Éditer le deal' : 'Nouveau deal'}</h1>
          <p className="text-sm text-slate-500 mt-1">Phase 1-2 du système : capture du deal</p>
        </div>
        <div className="flex gap-2">
          {onCancel && <Button variant="secondary" onClick={onCancel}>Annuler</Button>}
          <Button variant="primary" icon={Save} onClick={submit}>Enregistrer</Button>
        </div>
      </div>

      <Card>
        <CardHeader icon={FilePlus2} title="Identité du deal" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="ID du deal"><Input value={form.id} disabled /></Field>
            <Field label="Type" required>
              <Select value={form.dealType} onChange={e => update('dealType', e.target.value)}>
                <option value="buy">Achat</option><option value="sell">Vente</option>
              </Select>
            </Field>
            <Field label="Contrepartie" required>
              <Input value={form.counterparty} onChange={e => update('counterparty', e.target.value)} placeholder="Ex. TotalEnergies" />
            </Field>
            <Field label="Pays de la contrepartie" hint="Sert au filtre sanctions">
              <Input value={form.counterpartyCountry} onChange={e => update('counterpartyCountry', e.target.value)} placeholder="Ex. Nigeria" />
            </Field>
            <Field label="Niveau de contrepartie">
              <Select value={form.counterpartyTier} onChange={e => update('counterpartyTier', e.target.value)}>
                <option value="first-class">First-class (Major/Trader top)</option>
                <option value="solid">Solid (Investment grade)</option>
                <option value="standard">Standard</option>
                <option value="risky">À risque</option>
              </Select>
            </Field>
            <Field label="Banque émettrice / rating">
              <Select value={form.bankRating} onChange={e => update('bankRating', e.target.value)}>
                <option value="AAA">AAA</option><option value="AA">AA</option>
                <option value="A">A</option><option value="BBB">BBB</option>
                <option value="BB">BB</option><option value="lower">Lower / unknown</option>
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Droplets} title="Produit, quantité, qualité" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Produit" required>
              <Select value={form.product} onChange={e => update('product', e.target.value)}>
                <optgroup label="Bruts">
                  {Object.entries(PRODUCTS).filter(([_,p]) => p.type === 'crude').map(([k,p]) => <option key={k} value={k}>{p.name}</option>)}
                </optgroup>
                <optgroup label="Produits raffinés">
                  {Object.entries(PRODUCTS).filter(([_,p]) => p.type === 'product').map(([k,p]) => <option key={k} value={k}>{p.name}</option>)}
                </optgroup>
                <optgroup label="GPL">
                  {Object.entries(PRODUCTS).filter(([_,p]) => p.type === 'gpl').map(([k,p]) => <option key={k} value={k}>{p.name}</option>)}
                </optgroup>
              </Select>
            </Field>
            <Field label="Quantité (MT)" required>
              <Input type="number" value={form.quantity} onChange={e => update('quantity', e.target.value)} placeholder="6500" />
            </Field>
            <Field label="Tolérance ± %"><Input type="number" value={form.tolerance} onChange={e => update('tolerance', e.target.value)} /></Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Ship} title="Incoterm & logistique" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Incoterm" required>
              <Select value={form.incoterm} onChange={e => update('incoterm', e.target.value)}>
                {INCOTERMS.map(i => <option key={i}>{i}</option>)}
              </Select>
            </Field>
            <Field label="Port de chargement">
              <Input value={form.loadPort} onChange={e => update('loadPort', e.target.value)} placeholder="Ex. Bonny" />
            </Field>
            <Field label="Port de déchargement">
              <Input value={form.dischargePort} onChange={e => update('dischargePort', e.target.value)} placeholder="Ex. Rotterdam" />
            </Field>
            <Field label="Laycan — début">
              <Input type="date" value={form.laycanFrom} onChange={e => update('laycanFrom', e.target.value)} />
            </Field>
            <Field label="Laycan — fin">
              <Input type="date" value={form.laycanTo} onChange={e => update('laycanTo', e.target.value)} />
            </Field>
            <Field label="Date B/L (si déjà chargé)">
              <Input type="date" value={form.blDate} onChange={e => update('blDate', e.target.value)} />
            </Field>
            <Field label="Type de navire">
              <Select value={form.vessel} onChange={e => update('vessel', e.target.value)}>
                <option value="">— Choisir —</option>{VESSELS.map(v => <option key={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Inspecteur">
              <Select value={form.inspector} onChange={e => update('inspector', e.target.value)}>
                <option>SGS</option><option>Bureau Veritas</option><option>Intertek</option><option>Saybolt</option>
              </Select>
            </Field>
            <Field label="Hedge ratio % cible" hint="Part de l'exposition à couvrir">
              <Input type="number" min="0" max="100" value={form.hedgeRatio} onChange={e => update('hedgeRatio', e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={DollarSign} title="Prix et paiement" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Source de cotation">
              <Select value={form.priceSource} onChange={e => update('priceSource', e.target.value)}>
                {PRICE_SOURCES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Marker / Benchmark">
              <Select value={form.priceMarker} onChange={e => update('priceMarker', e.target.value)}>
                <option value="brent">Brent Dated / BFOE</option><option value="wti">WTI</option>
                <option value="dubai">Dubai</option><option value="gasoil">ICE Gasoil</option>
                <option value="rbob">RBOB</option><option value="ulsd">ULSD / Heating Oil</option>
              </Select>
            </Field>
            <Field label="Différentiel ($/bbl)" hint="Prime (+) ou décote (−)">
              <Input type="number" step="0.01" value={form.differential} onChange={e => update('differential', e.target.value)} placeholder="+1.21" />
            </Field>
            <Field label="Prix estimé ($/bbl)" hint="Pour le notional">
              <Input type="number" step="0.01" value={form.estimatedPrice} onChange={e => update('estimatedPrice', e.target.value)} placeholder="108.00" />
            </Field>
            <Field label="Conditions de paiement">
              <Select value={form.paymentTerm} onChange={e => update('paymentTerm', e.target.value)}>
                <option>LC at sight</option><option>LC deferred 30 days</option>
                <option>LC deferred 60 days</option><option>Open credit</option>
                <option>Prépaiement</option><option>SBLC</option>
              </Select>
            </Field>
            <Field label="Statut">
              <Select value={form.status} onChange={e => update('status', e.target.value)}>
                <option value="open">Ouvert</option><option value="contracted">Contractualisé</option>
                <option value="financed">Financé (LC OK)</option><option value="loaded">Chargé</option>
                <option value="discharged">Déchargé</option><option value="closed">Soldé</option>
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={ScrollText} title="Notes" />
        <CardBody>
          <Textarea rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Spécifications, clauses particulières, points de vigilance…" />
        </CardBody>
      </Card>
    </div>
  );
}

// ============================================================
// MODULE : OPTIMIZER (suggestions intelligentes)
// ============================================================
function Optimizer({ deals }) {
  const [selectedId, setSelectedId] = useState('');
  const deal = deals.find(d => d.id === selectedId);

  const analysis = useMemo(() => {
    if (!deal) return null;
    const issues = [];
    const product = PRODUCTS[deal.product];
    const productMarker = product?.marker;

    // 1. Cohérence marker / produit
    if (productMarker && deal.priceMarker && deal.priceMarker !== productMarker) {
      issues.push({
        level: 'high', area: 'Pricing',
        title: 'Marker incohérent avec le produit',
        detail: `Vous indexez ce ${product.name} sur ${deal.priceMarker.toUpperCase()} alors que la pratique de marché serait ${productMarker.toUpperCase()}. Cela crée un basis risk : votre hedge ne suivra pas exactement le prix physique.`,
        action: `Indexez sur ${productMarker.toUpperCase()} ou hedgez sur ${productMarker.toUpperCase()} via swap, avec hedge ratio ajusté.`
      });
    }

    // 2. Hedge ratio
    const hr = Number(deal.hedgeRatio) || 0;
    if (hr < 80) {
      issues.push({
        level: hr < 50 ? 'high' : 'med', area: 'Hedging',
        title: `Hedge ratio bas (${hr}%)`,
        detail: 'Vous laissez une partie significative de l\'exposition non couverte. C\'est une prise de risque directionnelle (spéculation), pas du trading physique.',
        action: 'Visez 90-100% de couverture sur l\'exposition flat price, sauf décision stratégique consciente.'
      });
    } else if (hr === 100) {
      issues.push({
        level: 'info', area: 'Hedging',
        title: 'Hedge complet en place',
        detail: 'Position quasi neutre sur le flat price : seul le différentiel (basis) génère du P&L.',
        action: 'Surveillez le basis risk (écart marker vs prix physique réel).'
      });
    }

    // 3. Sanctions
    const country = (deal.counterpartyCountry || '').toLowerCase();
    if (SANCTIONED_COUNTRIES.some(s => country.includes(s))) {
      issues.push({
        level: 'high', area: 'Sanctions',
        title: 'Pays potentiellement sous sanctions',
        detail: `La contrepartie semble basée dans une juridiction sensible (${deal.counterpartyCountry}). Risque OFAC / UE / UK / SECO majeur.`,
        action: 'Filtrer la contrepartie sur les listes consolidées (OFAC SDN, UE, HM Treasury), vérifier le navire (Equasis, IMO sanctions), consulter le département conformité avant tout engagement.'
      });
    }

    // 4. Incoterm vs paiement
    if (deal.incoterm === 'CIF' && deal.paymentTerm === 'Open credit') {
      issues.push({
        level: 'med', area: 'Risque crédit',
        title: 'CIF + Open credit = double risque',
        detail: 'Vous portez le risque transport (assurance à votre charge) ET le risque de non-paiement.',
        action: 'Exigez une LC ou SBLC, ou souscrivez une assurance-crédit (silent cover).'
      });
    }
    if (deal.paymentTerm === 'Open credit' && deal.counterpartyTier !== 'first-class') {
      issues.push({
        level: 'high', area: 'Risque crédit',
        title: 'Open credit avec contrepartie non first-class',
        detail: 'L\'open credit n\'est acceptable qu\'avec des Majors / raffineries de premier rang. Ailleurs : risque élevé d\'impayé.',
        action: 'Demander une PCG (Parent Company Guarantee), LC, ou silent cover.'
      });
    }

    // 5. LC vs banque
    if ((deal.paymentTerm || '').includes('LC') && ['BB', 'lower'].includes(deal.bankRating)) {
      issues.push({
        level: 'high', area: 'Risque bancaire',
        title: 'Banque émettrice à risque',
        detail: `La banque émettrice est notée ${deal.bankRating}. Le risque banque peut être pire que celui de la contrepartie.`,
        action: 'Faire confirmer la LC par une banque de premier rang (cost de confirmation à intégrer au pricing).'
      });
    }

    // 6. Laycan
    const laycanDuration = daysBetween(deal.laycanFrom, deal.laycanTo);
    if (laycanDuration > 7) {
      issues.push({
        level: 'med', area: 'Logistique',
        title: `Laycan large (${laycanDuration} jours)`,
        detail: 'Un laycan trop large augmente l\'incertitude opérationnelle et complique le calendrier d\'opération.',
        action: 'Resserrer le laycan à 3-5 jours quand c\'est possible pour faciliter le nominage du navire et le pricing.'
      });
    }
    if (laycanDuration < 0) {
      issues.push({
        level: 'high', area: 'Logistique',
        title: 'Laycan invalide',
        detail: 'La date de fin est antérieure à la date de début.',
        action: 'Corriger les dates de laycan.'
      });
    }

    // 7. Différentiel saisi
    const diff = Number(deal.differential);
    if (isNaN(diff) || deal.differential === '') {
      issues.push({
        level: 'med', area: 'Pricing',
        title: 'Différentiel non renseigné',
        detail: 'Sans différentiel, impossible de comparer le pricing à des benchmarks ou de vérifier la marge.',
        action: 'Renseigner le différentiel (prime/décote) en $/bbl par rapport au marker.'
      });
    } else if (Math.abs(diff) > 10) {
      issues.push({
        level: 'med', area: 'Pricing',
        title: 'Différentiel inhabituel',
        detail: `Un différentiel de ${diff > 0 ? '+' : ''}${diff} $/bbl est très élevé — vérifier qu\'il ne masque pas une erreur de saisie.`,
        action: 'Comparer à un assessment Platts/Argus récent pour valider.'
      });
    }

    // 8. Vessel
    if (!deal.vessel) {
      issues.push({
        level: 'low', area: 'Logistique',
        title: 'Type de navire non spécifié',
        detail: 'Le choix du navire impacte le coût de fret et la compatibilité avec les terminaux.',
        action: 'Préciser la classe de navire envisagée.'
      });
    }

    // 9. Tolérance
    if (Number(deal.tolerance) > 10) {
      issues.push({
        level: 'low', area: 'Quantité',
        title: 'Tolérance supérieure à 10%',
        detail: 'Une tolérance large fragilise le calcul de la marge.',
        action: 'Limiter la tolérance à ±5% si la pratique de marché le permet.'
      });
    }

    return issues;
  }, [deal]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Optimiseur de deal</h1>
        <p className="text-sm text-slate-500 mt-1">Analyse automatique et suggestions d'amélioration</p>
      </div>

      <Card>
        <CardHeader icon={Lightbulb} title="Sélectionner un deal" />
        <CardBody>
          <Select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">— Choisir un deal à analyser —</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.id} — {PRODUCTS[d.product]?.name} — {d.counterparty} ({d.dealType})</option>)}
          </Select>
        </CardBody>
      </Card>

      {deal && analysis && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Issues critiques" value={analysis.filter(i => i.level === 'high').length} accent="red" />
            <Stat label="À surveiller" value={analysis.filter(i => i.level === 'med').length} accent="gold" />
            <Stat label="Mineures" value={analysis.filter(i => i.level === 'low').length} accent="slate" />
            <Stat label="Score santé" value={`${Math.max(0, 100 - analysis.filter(i=>i.level==='high').length*25 - analysis.filter(i=>i.level==='med').length*10 - analysis.filter(i=>i.level==='low').length*3)}/100`} accent="green" />
          </div>

          {analysis.length === 0 ? (
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 text-emerald-700">
                  <CheckCircle2 className="w-8 h-8" />
                  <div>
                    <div className="font-semibold">Aucune issue détectée</div>
                    <div className="text-sm text-slate-600">Le deal passe tous les contrôles automatiques. Validez-le avec votre équipe.</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {analysis.map((i, idx) => {
                const palette = {
                  high: { bg: 'bg-red-50',     bd: 'border-red-300',     tt: 'text-red-800',     pill: 'bg-red-600 text-white',     icon: AlertTriangle },
                  med:  { bg: 'bg-amber-50',   bd: 'border-amber-300',   tt: 'text-amber-800',   pill: 'bg-amber-600 text-white',   icon: AlertTriangle },
                  low:  { bg: 'bg-slate-50',   bd: 'border-slate-300',   tt: 'text-slate-700',   pill: 'bg-slate-500 text-white',   icon: Info },
                  info: { bg: 'bg-emerald-50', bd: 'border-emerald-300', tt: 'text-emerald-800', pill: 'bg-emerald-600 text-white', icon: CheckCircle2 },
                }[i.level];
                const Icon = palette.icon;
                return (
                  <div key={idx} className={`rounded-md border ${palette.bd} ${palette.bg} p-4`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${palette.tt}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded font-semibold ${palette.pill}`}>{i.level.toUpperCase()}</span>
                          <span className="text-xs text-slate-500 uppercase">{i.area}</span>
                        </div>
                        <h3 className={`font-semibold ${palette.tt}`}>{i.title}</h3>
                        <p className="text-sm text-slate-700 mt-1">{i.detail}</p>
                        <p className="text-sm mt-2"><span className="font-semibold">Action recommandée : </span>{i.action}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// MODULE : HEDGING
// ============================================================
function Hedging({ deals }) {
  const [productKey, setProductKey] = useState('crude-bonny');
  const [contractKey, setContractKey] = useState('brn-full');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState('short');
  const [linkedDeal, setLinkedDeal] = useState('');
  const [hedgeRatio, setHedgeRatio] = useState(100);

  useEffect(() => {
    const productMarker = PRODUCTS[productKey]?.marker;
    if (productMarker) {
      const match = Object.entries(CONTRACTS).find(([_, c]) => c.marker === productMarker && c.size >= 500);
      if (match) setContractKey(match[0]);
    }
  }, [productKey]);

  useEffect(() => {
    if (linkedDeal) {
      const d = deals.find(x => x.id === linkedDeal);
      if (d) {
        setProductKey(d.product); setQuantity(String(d.quantity || ''));
        setDirection(d.dealType === 'buy' ? 'short' : 'long');
        if (d.hedgeRatio) setHedgeRatio(Number(d.hedgeRatio));
      }
    }
  }, [linkedDeal, deals]);

  const product = PRODUCTS[productKey];
  const contract = CONTRACTS[contractKey];
  const qty = Number(quantity) || 0;
  const barrels = qty * product.bblPerMT;
  const hedgedBarrels = barrels * (Number(hedgeRatio) / 100);

  let lots = 0;
  if (contract.unit === 'bbl') lots = hedgedBarrels / contract.size;
  else if (contract.unit === 'MT') lots = (qty * Number(hedgeRatio) / 100) / contract.size;

  const lotsRound = Math.round(lots);
  const overHedge = lotsRound - lots;
  const basisRisk = product.marker !== contract.marker;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hedging — calcul de couverture</h1>
        <p className="text-sm text-slate-500 mt-1">Phase 5 du système : convertir l'exposition physique en nombre de lots futures</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={Calculator} title="Paramètres" />
          <CardBody>
            <div className="space-y-4">
              <Field label="Deal lié (optionnel)">
                <Select value={linkedDeal} onChange={e => setLinkedDeal(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.id} — {PRODUCTS[d.product]?.name} — {fmt(d.quantity, 0)} MT</option>)}
                </Select>
              </Field>
              <Field label="Produit (jambe physique)">
                <Select value={productKey} onChange={e => setProductKey(e.target.value)}>
                  <optgroup label="Bruts">
                    {Object.entries(PRODUCTS).filter(([_,p]) => p.type === 'crude').map(([k,p]) => <option key={k} value={k}>{p.name} ({p.bblPerMT} bbl/MT)</option>)}
                  </optgroup>
                  <optgroup label="Produits raffinés">
                    {Object.entries(PRODUCTS).filter(([_,p]) => p.type === 'product').map(([k,p]) => <option key={k} value={k}>{p.name} ({p.bblPerMT} bbl/MT)</option>)}
                  </optgroup>
                  <optgroup label="GPL">
                    {Object.entries(PRODUCTS).filter(([_,p]) => p.type === 'gpl').map(([k,p]) => <option key={k} value={k}>{p.name} ({p.bblPerMT} bbl/MT)</option>)}
                  </optgroup>
                </Select>
              </Field>
              <Field label="Quantité physique (MT)">
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="6500" />
              </Field>
              <Field label="Hedge ratio %" hint="Part de l'exposition à couvrir (90-100% recommandé)">
                <Input type="number" min="0" max="100" value={hedgeRatio} onChange={e => setHedgeRatio(e.target.value)} />
              </Field>
              <Field label="Contrat futures" hint="La taille du lot dépend du contrat choisi">
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
                    <option value="rb-nymex">NYMEX RBOB — 42 000 gal (≈ 1 000 bbl)</option>
                    <option value="ho-nymex">NYMEX ULSD / Heating Oil — 42 000 gal (≈ 1 000 bbl)</option>
                  </optgroup>
                </Select>
              </Field>
              <Field label="Sens du hedge">
                <Select value={direction} onChange={e => setDirection(e.target.value)}>
                  <option value="short">Short (vendre des futures) — je couvre un stock long</option>
                  <option value="long">Long (acheter des futures) — je couvre une vente à découvert</option>
                </Select>
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={TrendingUp} title="Résultat" />
          <CardBody>
            <div className="space-y-3">
              <div className="px-4 py-3 bg-slate-50 rounded-md">
                <div className="text-xs text-slate-500 uppercase">Conversion en barils</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">
                  {fmt(qty, 0)} MT × {product.bblPerMT} bbl/MT = <span className="text-blue-700">{fmt(barrels, 0)} bbl</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">Volume couvert ({hedgeRatio}%) : <b>{fmt(hedgedBarrels, 0)} bbl</b></div>
              </div>

              <div className="px-4 py-3 bg-amber-50 rounded-md border border-amber-200">
                <div className="text-xs text-amber-700 uppercase">Spécification du contrat</div>
                <div className="text-sm text-slate-900 mt-1">{contract.name}</div>
                <div className="text-xs text-slate-600 mt-0.5">Taille : <b>{contract.size} {contract.unit}</b> par lot</div>
              </div>

              {basisRisk && (
                <div className="px-4 py-3 bg-red-50 rounded-md border border-red-300">
                  <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4" /> BASIS RISK
                  </div>
                  <p className="text-xs text-red-800 mt-1">
                    Le produit est ancré au marker <b>{product.marker.toUpperCase()}</b> mais vous hedgez sur <b>{contract.marker.toUpperCase()}</b>. Les deux ne bougent pas à 1:1 — vous gardez une exposition résiduelle.
                  </p>
                </div>
              )}

              <div className="px-4 py-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-xs text-blue-700 uppercase">Lots théorique</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {contract.unit === 'bbl' ? (
                    <>{fmt(hedgedBarrels, 0)} bbl ÷ {contract.size} = {fmt(lots, 2)}</>
                  ) : (
                    <>{fmt(qty * hedgeRatio / 100, 0)} MT ÷ {contract.size} = {fmt(lots, 2)}</>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 bg-emerald-50 rounded-md border-2 border-emerald-300">
                <div className="text-xs text-emerald-700 uppercase font-bold">Recommandation</div>
                <div className="text-3xl font-bold text-emerald-900 mt-1">
                  {direction === 'short' ? 'VENDRE' : 'ACHETER'} {lotsRound} lots
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Couverture effective : {fmt(lotsRound * contract.size * (contract.unit === 'bbl' ? 1 : product.bblPerMT), 0)} bbl équivalents
                </div>
                {Math.abs(overHedge) > 0.01 && (
                  <div className="text-xs text-amber-700 mt-1">
                    {overHedge > 0 ? '⚠ Sur-couverture' : '⚠ Sous-couverture'} de {fmt(Math.abs(overHedge), 2)} lot(s).
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader icon={Activity} title="Chart du contrat futures" subtitle={contract.name} />
        <CardBody><TVAdvancedChart symbol={contract.tvSymbol} height={450} interval="60" /></CardBody>
      </Card>
    </div>
  );
}

// ============================================================
// MODULE : FREIGHT
// ============================================================
function Freight() {
  const [flatRate, setFlatRate] = useState('18.46');
  const [wsRate, setWsRate] = useState('80');
  const [addressCom, setAddressCom] = useState('1.25');
  const [tonnage, setTonnage] = useState('130000');
  const [secaNm, setSecaNm] = useState('423');
  const [secaRate, setSecaRate] = useState('33');
  const [otherCosts, setOtherCosts] = useState('0');
  const [mode, setMode] = useState('ws');
  const [lumpsum, setLumpsum] = useState('');
  const [demHours, setDemHours] = useState('0');
  const [demRate, setDemRate] = useState('25000');

  const fr = Number(flatRate) || 0;
  const ws = Number(wsRate) || 0;
  const ac = Number(addressCom) || 0;
  const t = Number(tonnage) || 0;
  const wsNet = ws - ac;
  const baseFreight = fr * (wsNet / 100) * t;
  const seca = (Number(secaNm) || 0) * (Number(secaRate) || 0);
  const other = Number(otherCosts) || 0;
  const totalWS = baseFreight + seca + other;
  const demurrage = (Number(demHours) / 24) * Number(demRate);
  const lumpsumTotal = (Number(lumpsum) || 0) + seca + other;
  const totalFreight = mode === 'ws' ? totalWS : lumpsumTotal;
  const freightPerMT = t > 0 ? totalFreight / t : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Calculateur de fret</h1>
        <p className="text-sm text-slate-500 mt-1">Coût de fret en Worldscale ou Lumpsum</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={Anchor} title="Paramètres du voyage" />
          <CardBody>
            <Field label="Mode de cotation">
              <Select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="ws">Worldscale (WS)</option><option value="lumpsum">Lumpsum (forfait)</option>
              </Select>
            </Field>
            {mode === 'ws' ? (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Flat Rate ($/MT)"><Input type="number" step="0.01" value={flatRate} onChange={e => setFlatRate(e.target.value)} /></Field>
                <Field label="Niveau WS (base 100)"><Input type="number" step="0.1" value={wsRate} onChange={e => setWsRate(e.target.value)} /></Field>
                <Field label="Address Commission %"><Input type="number" step="0.01" value={addressCom} onChange={e => setAddressCom(e.target.value)} /></Field>
                <Field label="Tonnage (MT)"><Input type="number" value={tonnage} onChange={e => setTonnage(e.target.value)} /></Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Lumpsum total ($)"><Input type="number" value={lumpsum} onChange={e => setLumpsum(e.target.value)} /></Field>
                <Field label="Tonnage (MT)"><Input type="number" value={tonnage} onChange={e => setTonnage(e.target.value)} /></Field>
              </div>
            )}
            <div className="border-t border-slate-200 mt-4 pt-4">
              <p className="text-xs font-semibold text-slate-700 mb-2 uppercase">Coûts additionnels</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="SECA — distance (Nm)"><Input type="number" value={secaNm} onChange={e => setSecaNm(e.target.value)} /></Field>
                <Field label="SECA — taux ($/Nm)"><Input type="number" value={secaRate} onChange={e => setSecaRate(e.target.value)} /></Field>
                <Field label="Autres coûts ($)"><Input type="number" value={otherCosts} onChange={e => setOtherCosts(e.target.value)} /></Field>
              </div>
            </div>
            <div className="border-t border-slate-200 mt-4 pt-4">
              <p className="text-xs font-semibold text-slate-700 mb-2 uppercase">Demurrage (optionnel)</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Heures de dépassement"><Input type="number" value={demHours} onChange={e => setDemHours(e.target.value)} /></Field>
                <Field label="Taux ($/jour)"><Input type="number" value={demRate} onChange={e => setDemRate(e.target.value)} /></Field>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={Calculator} title="Résultat" />
          <CardBody>
            {mode === 'ws' ? (
              <div className="space-y-3">
                <div className="px-4 py-3 bg-slate-50 rounded-md text-sm">
                  <div className="font-semibold mb-2 text-slate-700">Formule</div>
                  <div className="font-mono text-xs text-slate-600">Fret = Flat Rate × (WS − AdrComm) / 100 × Tonnage + SECA + Autres</div>
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="WS net" value={fmt(wsNet, 2)} />
                  <Row label="Fret de base" value={fmtUSD(baseFreight, 0)} />
                  <Row label="SECA" value={fmtUSD(seca, 0)} />
                  <Row label="Autres coûts" value={fmtUSD(other, 0)} />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <Row label="Lumpsum" value={fmtUSD(Number(lumpsum) || 0, 0)} />
                <Row label="SECA" value={fmtUSD(seca, 0)} />
                <Row label="Autres coûts" value={fmtUSD(other, 0)} />
              </div>
            )}
            <div className="mt-4 pt-4 border-t-2 border-blue-200 space-y-2">
              <div className="px-4 py-3 bg-blue-50 rounded-md border-2 border-blue-300">
                <div className="text-xs text-blue-700 uppercase font-bold">Fret total</div>
                <div className="text-3xl font-bold text-blue-900 mt-1">{fmtUSD(totalFreight, 0)}</div>
                <div className="text-xs text-slate-600 mt-1">{fmtUSD(freightPerMT, 2)} par MT</div>
              </div>
              {Number(demHours) > 0 && (
                <div className="px-4 py-3 bg-red-50 rounded-md border border-red-200">
                  <div className="text-xs text-red-700 uppercase">Demurrage</div>
                  <div className="text-xl font-bold text-red-900 mt-1">{fmtUSD(demurrage, 0)}</div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// MODULE : PRICING
// ============================================================
function Pricing() {
  const [marker, setMarker] = useState('brent');
  const [markerPrice, setMarkerPrice] = useState('108');
  const [qualitySpread, setQualitySpread] = useState('1.05');
  const [apiSulphurAdj, setApiSulphurAdj] = useState('0.06');
  const [traderMargin, setTraderMargin] = useState('0.10');
  const [quantityMT, setQuantityMT] = useState('6500');
  const [bblPerMT, setBblPerMT] = useState('7.55');

  const diff = (Number(qualitySpread) || 0) + (Number(apiSulphurAdj) || 0) + (Number(traderMargin) || 0);
  const finalPrice = (Number(markerPrice) || 0) + diff;
  const totalBbl = (Number(quantityMT) || 0) * (Number(bblPerMT) || 0);
  const notional = totalBbl * finalPrice;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Formule de prix</h1>
        <p className="text-sm text-slate-500 mt-1">Construction d'un prix indexé Platts / Argus</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={DollarSign} title="Construction de la formule" />
          <CardBody>
            <div className="space-y-3">
              <Field label="Marker / Benchmark">
                <Select value={marker} onChange={e => setMarker(e.target.value)}>
                  <option value="brent">Platts Mean Brent Dated</option>
                  <option value="wti">WTI</option><option value="dubai">Dubai</option>
                  <option value="argus-asci">Argus ASCI</option>
                </Select>
              </Field>
              <Field label="Prix marker ($/bbl)" hint="Moyenne sur la période de pricing">
                <Input type="number" step="0.01" value={markerPrice} onChange={e => setMarkerPrice(e.target.value)} />
              </Field>
              <div className="border-t border-slate-200 pt-3 mt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2 uppercase">Composantes du différentiel</p>
                <div className="space-y-3">
                  <Field label="Spread brut/marker ($/bbl)"><Input type="number" step="0.01" value={qualitySpread} onChange={e => setQualitySpread(e.target.value)} /></Field>
                  <Field label="Ajustement API/soufre ($/bbl)"><Input type="number" step="0.01" value={apiSulphurAdj} onChange={e => setApiSulphurAdj(e.target.value)} /></Field>
                  <Field label="Marge trader ($/bbl)"><Input type="number" step="0.01" value={traderMargin} onChange={e => setTraderMargin(e.target.value)} /></Field>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2 uppercase">Quantité (notional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantité (MT)"><Input type="number" value={quantityMT} onChange={e => setQuantityMT(e.target.value)} /></Field>
                  <Field label="bbl/MT"><Input type="number" step="0.01" value={bblPerMT} onChange={e => setBblPerMT(e.target.value)} /></Field>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={Calculator} title="Résultat" />
          <CardBody>
            <div className="space-y-2 text-sm">
              <div className="px-4 py-3 bg-slate-50 rounded-md font-mono text-xs">
                Prix = Marker + (Spread + Ajustement + Marge)
              </div>
              <Row label="Marker" value={fmtUSD(Number(markerPrice) || 0, 2) + '/bbl'} />
              <Row label="Spread qualité" value={'+ ' + fmtUSD(Number(qualitySpread) || 0, 2)} />
              <Row label="Ajustement API/S" value={'+ ' + fmtUSD(Number(apiSulphurAdj) || 0, 2)} />
              <Row label="Marge trader" value={'+ ' + fmtUSD(Number(traderMargin) || 0, 2)} />
              <Row label="Différentiel total" value={fmtUSD(diff, 2) + '/bbl'} />
            </div>
            <div className="mt-4 pt-4 border-t-2 border-emerald-200 space-y-2">
              <div className="px-4 py-3 bg-emerald-50 rounded-md border-2 border-emerald-300">
                <div className="text-xs text-emerald-700 uppercase font-bold">Prix final</div>
                <div className="text-3xl font-bold text-emerald-900 mt-1">{fmtUSD(finalPrice, 2)} / bbl</div>
              </div>
              <div className="px-4 py-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-xs text-blue-700 uppercase">Notional de la cargaison</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{fmtUSD(notional, 0)}</div>
                <div className="text-xs text-slate-600 mt-1">{fmt(totalBbl, 0)} bbl × {fmtUSD(finalPrice, 2)}/bbl</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// MODULE : P&L
// ============================================================
function PnL({ deals }) {
  const [selectedDealId, setSelectedDealId] = useState('');
  const [buyPrice, setBuyPrice] = useState('108');
  const [sellPrice, setSellPrice] = useState('110');
  const [quantity, setQuantity] = useState('6500');
  const [bblPerMT, setBblPerMT] = useState('7.55');
  const [freight, setFreight] = useState('1900000');
  const [financing, setFinancing] = useState('25000');
  const [inspection, setInspection] = useState('8000');
  const [insurance, setInsurance] = useState('15000');
  const [demurrage, setDemurrage] = useState('0');
  const [other, setOther] = useState('0');

  useEffect(() => {
    if (selectedDealId) {
      const d = deals.find(x => x.id === selectedDealId);
      if (d) {
        setQuantity(String(d.quantity || ''));
        setBblPerMT(String(PRODUCTS[d.product]?.bblPerMT || 7.5));
        if (d.estimatedPrice) {
          if (d.dealType === 'buy') setBuyPrice(String(d.estimatedPrice));
          else setSellPrice(String(d.estimatedPrice));
        }
      }
    }
  }, [selectedDealId, deals]);

  const qty = Number(quantity) || 0;
  const bp = Number(buyPrice) || 0;
  const sp = Number(sellPrice) || 0;
  const totalBbl = qty * (Number(bblPerMT) || 0);
  const revenue = totalBbl * sp;
  const cogs = totalBbl * bp;
  const grossMargin = revenue - cogs;
  const costs = (Number(freight) || 0) + (Number(financing) || 0) + (Number(inspection) || 0) +
                (Number(insurance) || 0) + (Number(demurrage) || 0) + (Number(other) || 0);
  const netMargin = grossMargin - costs;
  const marginPerBbl = totalBbl > 0 ? netMargin / totalBbl : 0;
  const marginPct = revenue > 0 ? (netMargin / revenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">P&amp;L du deal</h1>
        <p className="text-sm text-slate-500 mt-1">Calcul de la marge finale</p>
      </div>

      <Card>
        <CardHeader icon={BarChart3} title="Lier à un deal (optionnel)" />
        <CardBody>
          <Select value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)}>
            <option value="">— Calcul libre —</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.id} — {PRODUCTS[d.product]?.name} — {fmt(d.quantity, 0)} MT</option>)}
          </Select>
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={DollarSign} title="Prix et quantités" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantité (MT)"><Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} /></Field>
              <Field label="bbl/MT"><Input type="number" step="0.01" value={bblPerMT} onChange={e => setBblPerMT(e.target.value)} /></Field>
              <Field label="Prix d'achat ($/bbl)"><Input type="number" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} /></Field>
              <Field label="Prix de vente ($/bbl)"><Input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} /></Field>
            </div>
            <div className="border-t border-slate-200 mt-4 pt-4">
              <p className="text-xs font-semibold text-slate-700 mb-2 uppercase">Coûts</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fret ($)"><Input type="number" value={freight} onChange={e => setFreight(e.target.value)} /></Field>
                <Field label="Financement ($)"><Input type="number" value={financing} onChange={e => setFinancing(e.target.value)} /></Field>
                <Field label="Inspection ($)"><Input type="number" value={inspection} onChange={e => setInspection(e.target.value)} /></Field>
                <Field label="Assurance ($)"><Input type="number" value={insurance} onChange={e => setInsurance(e.target.value)} /></Field>
                <Field label="Demurrage ($)"><Input type="number" value={demurrage} onChange={e => setDemurrage(e.target.value)} /></Field>
                <Field label="Autres ($)"><Input type="number" value={other} onChange={e => setOther(e.target.value)} /></Field>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={netMargin >= 0 ? TrendingUp : TrendingDown} title="Synthèse P&amp;L" />
          <CardBody>
            <div className="space-y-2 text-sm">
              <Row label="Volume total" value={fmt(totalBbl, 0) + ' bbl'} />
              <Row label="Revenu (Sales)" value={fmtUSD(revenue, 0)} />
              <Row label="Coût (COGS)" value={'− ' + fmtUSD(cogs, 0)} />
              <Row label="Marge brute" value={fmtUSD(grossMargin, 0)} />
            </div>
            <div className="border-t border-slate-200 mt-3 pt-3 space-y-2 text-sm">
              <div className="text-xs uppercase text-slate-500 font-semibold">Coûts opérationnels</div>
              <Row label="Fret" value={'− ' + fmtUSD(Number(freight) || 0, 0)} />
              <Row label="Financement" value={'− ' + fmtUSD(Number(financing) || 0, 0)} />
              <Row label="Inspection" value={'− ' + fmtUSD(Number(inspection) || 0, 0)} />
              <Row label="Assurance" value={'− ' + fmtUSD(Number(insurance) || 0, 0)} />
              <Row label="Demurrage" value={'− ' + fmtUSD(Number(demurrage) || 0, 0)} />
              <Row label="Autres" value={'− ' + fmtUSD(Number(other) || 0, 0)} />
              <Row label="Total coûts" value={'− ' + fmtUSD(costs, 0)} />
            </div>
            <div className={`mt-4 px-4 py-4 rounded-md border-2 ${netMargin >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
              <div className={`text-xs uppercase font-bold ${netMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Marge nette</div>
              <div className={`text-3xl font-bold mt-1 ${netMargin >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>{fmtUSD(netMargin, 0)}</div>
              <div className="text-xs text-slate-600 mt-1">
                {fmtUSD(marginPerBbl, 2)} / bbl • {fmt(marginPct, 2)} % du revenu
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// MODULE : LC CHECKER
// ============================================================
function LCChecker() {
  const fields = [
    { code: '40A', name: 'Form of Credit', expected: 'IRREVOCABLE', tip: 'Doit être irrévocable' },
    { code: '20',  name: 'DC Number', expected: '', tip: 'Référence à citer dans toute correspondance' },
    { code: '31C', name: "Date d'émission", expected: '', tip: 'Date d\'ouverture de la LC' },
    { code: '31D', name: "Date & lieu d'expiration", expected: '', tip: 'Au-delà : plus d\'encaissement possible' },
    { code: '40E', name: 'Règles applicables', expected: 'UCP LATEST VERSION', tip: 'Doit citer UCP 600' },
    { code: '50',  name: 'Applicant (acheteur)', expected: '', tip: 'À reprendre à l\'identique sur la facture' },
    { code: '59',  name: 'Beneficiary (vendeur)', expected: '', tip: 'Vérifier nom et adresse exacts' },
    { code: '32B', name: 'Devise & montant', expected: '', tip: 'Conformité au contrat' },
    { code: '39A', name: 'Tolérance % (montant)', expected: '+/− 10%', tip: 'Souvent 10% par défaut' },
    { code: '41A', name: 'Available With/By', expected: '', tip: 'Doit correspondre à votre banque' },
    { code: '42P', name: 'Conditions de paiement', expected: '', tip: 'AT SIGHT ou BY DEF PAYMENT' },
    { code: '43P', name: 'Partial Shipments', expected: 'ALLOWED', tip: 'Habituellement autorisé' },
    { code: '43T', name: 'Transhipment', expected: 'ALLOWED', tip: 'Habituellement autorisé' },
    { code: '44E', name: 'Port de chargement', expected: '', tip: '' },
    { code: '44F', name: 'Port de déchargement', expected: '', tip: 'Vérifier restrictions embargo' },
    { code: '44C', name: "Date limite d'embarquement", expected: '', tip: 'Latest shipment date' },
    { code: '45A', name: 'Description marchandises', expected: '', tip: 'À reprendre à l\'identique sur la facture' },
    { code: '46A', name: 'Documents requis', expected: '', tip: 'Réduire à l\'essentiel' },
    { code: '47A', name: 'Conditions additionnelles', expected: '', tip: 'Clauses sanctions, etc.' },
    { code: '49',  name: 'Confirmation', expected: 'MAY ADD', tip: 'MAY ADD est préférable côté acheteur' },
    { code: '71D', name: 'Charges', expected: '', tip: 'Qui paie quoi ?' },
    { code: '78',  name: 'Instructions paiement', expected: '', tip: 'Lire les délais' },
  ];
  const [checked, setChecked] = useState({});
  const total = fields.length;
  const done = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vérificateur LC — MT700</h1>
        <p className="text-sm text-slate-500 mt-1">Checklist des champs SWIFT à contrôler</p>
      </div>
      <Card>
        <CardHeader icon={FileCheck2} title={`Progression : ${done} / ${total} champs`} subtitle={`${pct}% complété`} />
        <CardBody>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="p-0">
          <div className="divide-y divide-slate-200">
            {fields.map(f => (
              <label key={f.code} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={!!checked[f.code]} onChange={e => setChecked(c => ({ ...c, [f.code]: e.target.checked }))}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold">{f.code}</span>
                    <span className="text-sm font-medium text-slate-900">{f.name}</span>
                    {f.expected && <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{f.expected}</span>}
                  </div>
                  {f.tip && <p className="text-xs text-slate-500 mt-1">{f.tip}</p>}
                </div>
              </label>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ============================================================
// MODULE : RISK MATRIX
// ============================================================
function RiskMatrix({ deals }) {
  const [selectedDealId, setSelectedDealId] = useState('');
  const [risks, setRisks] = useState({});
  const [mitigations, setMitigations] = useState({});

  const setRisk = (type, val) => setRisks(r => ({ ...r, [type]: val }));
  const setMit = (type, val) => setMitigations(m => ({ ...m, [type]: val }));

  const score = (prob, sev) => (Number(prob) || 0) * (Number(sev) || 0);
  const colorScore = (sc) => {
    if (sc >= 15) return 'bg-red-100 text-red-800 border-red-300';
    if (sc >= 8) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (sc >= 1) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Matrice des risques</h1>
        <p className="text-sm text-slate-500 mt-1">Identifier, coter et mitiger les risques</p>
      </div>
      <Card>
        <CardHeader icon={ShieldAlert} title="Sélectionner un deal" />
        <CardBody>
          <Select value={selectedDealId} onChange={e => setSelectedDealId(e.target.value)}>
            <option value="">— Évaluation libre —</option>
            {deals.map(d => <option key={d.id} value={d.id}>{d.id} — {PRODUCTS[d.product]?.name} — {d.counterparty}</option>)}
          </Select>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                  <th className="text-left py-2 px-3">Risque</th>
                  <th className="text-center py-2 px-3 w-24">Probabilité (1-5)</th>
                  <th className="text-center py-2 px-3 w-24">Gravité (1-5)</th>
                  <th className="text-center py-2 px-3 w-24">Score</th>
                  <th className="text-left py-2 px-3">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {RISK_TYPES.map(rt => {
                  const r = risks[rt] || {};
                  const sc = score(r.prob, r.sev);
                  return (
                    <tr key={rt} className="border-b border-slate-100">
                      <td className="py-2 px-3 font-medium text-slate-800">{rt}</td>
                      <td className="py-2 px-3">
                        <Input type="number" min="0" max="5" value={r.prob || ''} onChange={e => setRisk(rt, { ...r, prob: e.target.value })} className="text-center" />
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" min="0" max="5" value={r.sev || ''} onChange={e => setRisk(rt, { ...r, sev: e.target.value })} className="text-center" />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${colorScore(sc)}`}>{sc || '—'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <Input value={mitigations[rt] || ''} onChange={e => setMit(rt, e.target.value)} placeholder="Action de mitigation" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ============================================================
// MODULE : RESOURCES HUB
// ============================================================
function Resources() {
  const links = [
    {
      category: 'Agences de prix (Price Reporting Agencies)',
      icon: DollarSign, color: 'text-amber-700',
      items: [
        { name: 'S&P Global Platts', desc: 'Référence mondiale — FOB Med, CIF NWE, FOB ARA, Brent Dated', url: 'https://www.spglobal.com/commodity-insights/en' },
        { name: 'Argus Media', desc: 'Très utilisée pour Afrique de l\'Ouest, diesel, essence, fuel oil, LPG', url: 'https://www.argusmedia.com/' },
        { name: 'OPIS (Oil Price Information Service)', desc: 'Référence sur le marché US, downstream', url: 'https://www.opisnet.com/' },
        { name: 'ICIS', desc: 'Pétrochimie et produits raffinés', url: 'https://www.icis.com/' },
      ],
    },
    {
      category: 'Bourses & contrats futures',
      icon: TrendingUp, color: 'text-blue-700',
      items: [
        { name: 'ICE Futures Europe', desc: 'Brent Crude, ICE Gasoil, Low Sulfur Gasoil, Jet Fuel, Fuel Oil', url: 'https://www.ice.com/products/Futures-Options/Energy' },
        { name: 'CME Group / NYMEX', desc: 'WTI, RBOB, ULSD/Heating Oil, Natural Gas', url: 'https://www.cmegroup.com/markets/energy.html' },
        { name: 'DME (Dubai Mercantile Exchange)', desc: 'DME Oman — référence Moyen-Orient / Asie', url: 'https://www.dubaimerc.com/' },
        { name: 'CME Direct', desc: 'Plateforme d\'exécution électronique CME', url: 'https://www.cmegroup.com/cme-direct.html' },
      ],
    },
    {
      category: 'Plateformes physiques & brokers',
      icon: Anchor, color: 'text-slate-700',
      items: [
        { name: 'ICE Chat', desc: 'Standard pour négociations physiques entre traders', url: 'https://www.theice.com/connectivity-and-feeds/ice-chat' },
        { name: 'Trayport', desc: 'Markets énergétiques, accès brokers/exchanges', url: 'https://www.trayport.com/' },
        { name: 'Marex', desc: 'Courtier matières premières', url: 'https://www.marex.com/' },
        { name: 'TP ICAP', desc: 'Broker majeur swaps & produits pétroliers', url: 'https://www.tpicap.com/tpicap/markets/energy' },
        { name: 'BGC Partners', desc: 'Courtier OTC énergie', url: 'https://www.bgcpartners.com/' },
      ],
    },
    {
      category: 'Suivi navires & cargaisons',
      icon: Ship, color: 'text-emerald-700',
      items: [
        { name: 'Kpler', desc: 'Mouvements tankers, origine/destination, stocks mondiaux', url: 'https://www.kpler.com/' },
        { name: 'Vortexa', desc: 'Analyse des flux pétroliers temps réel', url: 'https://www.vortexa.com/' },
        { name: 'MarineTraffic', desc: 'Suivi AIS gratuit', url: 'https://www.marinetraffic.com/' },
        { name: 'VesselFinder', desc: 'Tracking navires (alternative)', url: 'https://www.vesselfinder.com/' },
        { name: 'Equasis', desc: 'Vérification gratuite des navires (vetting, sanctions)', url: 'https://www.equasis.org/' },
      ],
    },
    {
      category: 'Information marché',
      icon: Newspaper, color: 'text-indigo-700',
      items: [
        { name: 'Bloomberg Terminal', desc: 'Standard du secteur — prix, news, chat, calcul de risques', url: 'https://www.bloomberg.com/professional/' },
        { name: 'LSEG Workspace (Reuters Eikon)', desc: 'Alternative à Bloomberg', url: 'https://www.lseg.com/en/data-analytics/workspace' },
        { name: 'OilPrice.com', desc: 'Actualités gratuites du secteur', url: 'https://oilprice.com/' },
        { name: 'Reuters Energy', desc: 'Fil de news gratuit', url: 'https://www.reuters.com/business/energy/' },
      ],
    },
    {
      category: 'Données officielles (gratuit)',
      icon: BookOpen, color: 'text-teal-700',
      items: [
        { name: 'EIA (US Energy Information Admin.)', desc: 'Données US complètes — stocks hebdo, prix, prod.', url: 'https://www.eia.gov/' },
        { name: 'IEA (International Energy Agency)', desc: 'Rapports mensuels Oil Market Report', url: 'https://www.iea.org/' },
        { name: 'OPEC', desc: 'MOMR — Monthly Oil Market Report', url: 'https://www.opec.org/opec_web/en/publications/202.htm' },
        { name: 'JODI Oil', desc: 'Joint Organisations Data Initiative — données mondiales', url: 'https://www.jodidata.org/oil/' },
        { name: 'Baker Hughes Rig Count', desc: 'Comptage des rigs — indicateur production future', url: 'https://rigcount.bakerhughes.com/' },
      ],
    },
    {
      category: 'Sanctions & conformité',
      icon: ShieldAlert, color: 'text-red-700',
      items: [
        { name: 'OFAC SDN List', desc: 'Liste consolidée US — vérifier avant toute transaction', url: 'https://sanctionssearch.ofac.treas.gov/' },
        { name: 'UE Consolidated List', desc: 'Sanctions financières UE', url: 'https://webgate.ec.europa.eu/fsd/fsf' },
        { name: 'UK HM Treasury OFSI', desc: 'Sanctions UK', url: 'https://www.gov.uk/government/publications/the-uk-sanctions-list' },
        { name: 'SECO (Suisse)', desc: 'Sanctions suisses', url: 'https://www.seco.admin.ch/seco/en/home/Aussenwirtschaftspolitik_Wirtschaftliche_Zusammenarbeit/Wirtschaftsbeziehungen/exportkontrollen-und-sanktionen/sanktionen-embargos.html' },
      ],
    },
    {
      category: 'ETRM / CTRM (Commodity Trading & Risk Mgmt)',
      icon: Layers, color: 'text-purple-700',
      items: [
        { name: 'ION Commodities', desc: 'Suite leader CTRM/ETRM (ex-Openlink, Allegro, RightAngle)', url: 'https://iongroup.com/commodities/' },
        { name: 'Allegro Horizon', desc: 'CTRM établi sur les marchés énergétiques', url: 'https://iongroup.com/commodities/allegro/' },
        { name: 'Aspect CTRM', desc: 'CTRM cloud, intéressant pour traders petit/moyen volume', url: 'https://aspectenterprise.com/' },
        { name: 'Eka Software', desc: 'CTRM SaaS', url: 'https://www.ekaplus.com/' },
        { name: 'Brady Technologies', desc: 'CTRM commodities', url: 'https://www.bradyplc.com/' },
      ],
    },
    {
      category: 'Outils techniques & charts',
      icon: Activity, color: 'text-cyan-700',
      items: [
        { name: 'TradingView', desc: 'Charts pro gratuits — Brent, WTI, gasoil, etc.', url: 'https://www.tradingview.com/' },
        { name: 'Investing.com Energy', desc: 'Données et analyses gratuites', url: 'https://www.investing.com/commodities/energy' },
        { name: 'Barchart Energy', desc: 'Charts et données futures', url: 'https://www.barchart.com/futures/energy' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hub Ressources & Plateformes</h1>
        <p className="text-sm text-slate-500 mt-1">Accès direct à toutes les plateformes professionnelles du trading pétrolier</p>
      </div>

      <Card>
        <CardHeader icon={Lightbulb} title="Ensemble minimal pour démarrer (Afrique de l'Ouest, EN590 / Essence / Jet / Fuel Oil)" />
        <CardBody>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <Row label="Prix" value="Platts + Argus" />
            <Row label="Futures" value="ICE Futures" />
            <Row label="Broker OTC" value="TP ICAP ou Marex" />
            <Row label="Suivi navires" value="Kpler" />
            <Row label="Informations" value="Bloomberg" />
            <Row label="Gestion contrats" value="Excel avancé puis CTRM" />
            <Row label="Communication" value="ICE Chat" />
            <Row label="Vérif gratuite navire" value="Equasis" />
          </div>
        </CardBody>
      </Card>

      {links.map(section => {
        const Icon = section.icon;
        return (
          <Card key={section.category}>
            <CardHeader icon={Icon} title={section.category} />
            <CardBody>
              <div className="grid md:grid-cols-2 gap-3">
                {section.items.map(item => (
                  <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="block p-3 border border-slate-200 rounded-md hover:border-blue-400 hover:bg-blue-50 transition group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className={`font-semibold text-sm ${section.color}`}>{item.name}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{item.desc}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
                    </div>
                  </a>
                ))}
              </div>
            </CardBody>
          </Card>
        );
      })}

      <Card>
        <CardHeader icon={Info} title="À savoir sur les accès" />
        <CardBody>
          <div className="text-sm text-slate-700 space-y-2">
            <p><b>Platts, Argus, OPIS, Bloomberg, LSEG, Kpler, Vortexa</b> : abonnements payants (de quelques milliers à plusieurs dizaines de milliers de USD/an). Indispensables pour un trading professionnel.</p>
            <p><b>EIA, IEA, OPEC, JODI, Baker Hughes, OFAC, Equasis</b> : gratuits — incontournables comme socle.</p>
            <p><b>TradingView, Investing.com, Barchart</b> : charts et données futures gratuits ou freemium — vous les avez déjà intégrés dans cette plateforme.</p>
            <p><b>ETRM (ION, Allegro, Aspect)</b> : pour passer d'Excel à un système professionnel quand le volume justifie l'investissement (typiquement à partir d'un certain volume mensuel).</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ============================================================
// MODULE : DEALS LIST
// ============================================================
function DealsList({ deals, onEdit, onDelete }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mes deals</h1>
        <p className="text-sm text-slate-500 mt-1">Liste complète des opérations enregistrées</p>
      </div>
      <Card>
        <CardBody className="p-0">
          {deals.length === 0 ? (
            <div className="text-center py-16 text-slate-500"><p className="text-sm">Aucun deal pour le moment.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                    <th className="py-3 px-4">ID</th><th className="py-3 px-4">Type</th><th className="py-3 px-4">Contrepartie</th>
                    <th className="py-3 px-4">Produit</th><th className="py-3 px-4">Qté (MT)</th>
                    <th className="py-3 px-4">Incoterm</th><th className="py-3 px-4">Laycan</th>
                    <th className="py-3 px-4">Statut</th><th className="py-3 px-4 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...deals].reverse().map(d => (
                    <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono text-xs">{d.id}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.dealType === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {d.dealType === 'buy' ? 'Achat' : 'Vente'}
                        </span>
                      </td>
                      <td className="py-2 px-4">{d.counterparty}</td>
                      <td className="py-2 px-4">{PRODUCTS[d.product]?.name || d.product}</td>
                      <td className="py-2 px-4">{fmt(d.quantity, 0)}</td>
                      <td className="py-2 px-4">{d.incoterm}</td>
                      <td className="py-2 px-4 text-xs">{d.laycanFrom} → {d.laycanTo}</td>
                      <td className="py-2 px-4"><span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{d.status}</span></td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => onEdit(d)} className="text-xs px-2 py-1 text-blue-700 hover:bg-blue-50 rounded">Éditer</button>
                          <button onClick={() => { if (confirm('Supprimer ce deal ?')) onDelete(d.id); }} className="text-xs px-2 py-1 text-red-700 hover:bg-red-50 rounded">
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

// ============================================================
// AUTHENTIFICATION
// ============================================================

// Helpers crypto : hachage SHA-256 avec sel
async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function genSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function hashPassword(password, salt) {
  return sha256(salt + ':' + password);
}

const ROLES = {
  admin:  { label: 'Administrateur', color: 'bg-red-100 text-red-800',     desc: 'Accès total + gestion des utilisateurs' },
  trader: { label: 'Trader',         color: 'bg-blue-100 text-blue-800',   desc: 'Création et gestion de ses propres deals' },
  viewer: { label: 'Viewer',         color: 'bg-slate-100 text-slate-700', desc: 'Lecture seule, pas de création de deals' },
};

const SESSION_TIMEOUT_MIN = 30; // déconnexion auto après 30 min d'inactivité

async function loadUsers() {
  try {
    const res = await window.storage.get('amko_users');
    return res?.value ? JSON.parse(res.value) : [];
  } catch { return []; }
}
async function saveUsers(users) {
  try { await window.storage.set('amko_users', JSON.stringify(users)); }
  catch (e) { console.error('saveUsers failed', e); }
}
async function loadSession() {
  try {
    const res = await window.storage.get('amko_session');
    return res?.value ? JSON.parse(res.value) : null;
  } catch { return null; }
}
async function saveSession(s) {
  try {
    if (s) await window.storage.set('amko_session', JSON.stringify(s));
    else await window.storage.delete('amko_session');
  } catch (e) { console.error('saveSession failed', e); }
}

// ============================================================
// ÉCRAN : LOGIN / SIGNUP
// ============================================================
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login'); // login | signup
  const [users, setUsers] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadUsers().then(setUsers); }, []);

  // Si aucun utilisateur n'existe, on force le mode signup (création de l'admin)
  const isFirstUser = users !== null && users.length === 0;
  useEffect(() => { if (isFirstUser) setMode('signup'); }, [isFirstUser]);

  if (users === null) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="text-slate-500">Chargement…</div></div>;
  }

  const submit = async (e) => {
    e?.preventDefault();
    setError(''); setBusy(true);
    try {
      const u = username.trim().toLowerCase();
      if (!u || !password) throw new Error('Identifiant et mot de passe requis.');

      if (mode === 'signup') {
        if (password.length < 8) throw new Error('Mot de passe : 8 caractères minimum.');
        if (password !== confirmPwd) throw new Error('Les mots de passe ne correspondent pas.');
        if (users.find(x => x.username === u)) throw new Error('Cet identifiant existe déjà.');
        if (!fullName.trim()) throw new Error('Nom complet requis.');

        const salt = genSalt();
        const hash = await hashPassword(password, salt);
        const newUser = {
          id: 'U' + Date.now().toString(36).toUpperCase(),
          username: u,
          fullName: fullName.trim(),
          role: isFirstUser ? 'admin' : 'trader',
          salt, hash,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          active: true,
        };
        const next = [...users, newUser];
        await saveUsers(next);
        const session = { userId: newUser.id, loggedAt: Date.now(), lastActivity: Date.now() };
        await saveSession(session);
        onAuth(newUser);
      } else {
        // login
        const found = users.find(x => x.username === u);
        if (!found) throw new Error('Identifiant ou mot de passe incorrect.');
        if (!found.active) throw new Error('Compte désactivé. Contactez l\'administrateur.');
        const hash = await hashPassword(password, found.salt);
        if (hash !== found.hash) throw new Error('Identifiant ou mot de passe incorrect.');

        const updated = users.map(x => x.id === found.id ? { ...x, lastLogin: new Date().toISOString() } : x);
        await saveUsers(updated);
        const session = { userId: found.id, loggedAt: Date.now(), lastActivity: Date.now() };
        await saveSession(session);
        onAuth({ ...found, lastLogin: new Date().toISOString() });
      }
    } catch (err) {
      setError(err.message || 'Erreur inattendue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo AMKO */}
        <div className="bg-white rounded-xl p-6 mb-6 flex items-center justify-center shadow-2xl">
          <AmkoLogo size="xl" showTagline={true} variant="light" />
        </div>
        <p className="text-slate-400 text-xs text-center mb-8 uppercase tracking-widest">Petroleum Trading Platform</p>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              {mode === 'login' ? <Lock className="w-5 h-5 text-blue-700" /> : <UserPlus className="w-5 h-5 text-emerald-700" />}
              <h1 className="text-xl font-bold text-slate-900">
                {mode === 'login' ? 'Connexion' : (isFirstUser ? 'Créer le compte administrateur' : 'Créer un compte')}
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              {mode === 'login' ? 'Identifiez-vous pour accéder à la plateforme' :
                isFirstUser ? 'Premier accès : le compte créé sera Administrateur' : 'Renseignez vos informations'}
            </p>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            {mode === 'signup' && (
              <Field label="Nom complet" required>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Daniel Ndiaye" autoComplete="name" />
              </Field>
            )}
            <Field label="Identifiant" required>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="daniel.n" autoComplete="username" autoFocus />
            </Field>
            <Field label="Mot de passe" required hint={mode === 'signup' ? '8 caractères minimum' : undefined}>
              <div className="relative">
                <Input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="pr-10" />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            {mode === 'signup' && (
              <Field label="Confirmer le mot de passe" required>
                <Input type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="••••••••" autoComplete="new-password" />
              </Field>
            )}

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}

            <Button type="submit" variant="primary" disabled={busy} icon={mode === 'login' ? Lock : UserPlus}>
              <span className="flex-1 text-center">
                {busy ? 'Patientez…' : (mode === 'login' ? 'Se connecter' : (isFirstUser ? 'Créer l\'admin' : 'Créer mon compte'))}
              </span>
            </Button>

            {!isFirstUser && (
              <div className="text-center pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
                  className="text-sm text-blue-700 hover:underline">
                  {mode === 'login' ? 'Pas de compte ? Créer un compte' : 'Déjà inscrit ? Se connecter'}
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="mt-6 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-md text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <b className="text-slate-200">Sécurité :</b> Mots de passe hachés en SHA-256 avec sel. Session inactive déconnectée après {SESSION_TIMEOUT_MIN} min.
              <br /><span className="text-amber-400">Note : protection de niveau prototype. Pour usage entreprise, déployer avec backend serveur.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODULE : GESTION DES UTILISATEURS (Admin)
// ============================================================
function UserManagement({ currentUser, onUserUpdate }) {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ username: '', fullName: '', password: '', role: 'trader' });
  const [resetUserId, setResetUserId] = useState(null);
  const [newPwd, setNewPwd] = useState('');

  useEffect(() => { loadUsers().then(setUsers); }, []);

  const refresh = async () => setUsers(await loadUsers());

  const addUser = async () => {
    setError(''); setBusy(true);
    try {
      const u = newUser.username.trim().toLowerCase();
      if (!u || !newUser.password || !newUser.fullName.trim()) throw new Error('Tous les champs sont requis.');
      if (newUser.password.length < 8) throw new Error('Mot de passe : 8 caractères minimum.');
      if (users.find(x => x.username === u)) throw new Error('Cet identifiant existe déjà.');
      const salt = genSalt();
      const hash = await hashPassword(newUser.password, salt);
      const created = {
        id: 'U' + Date.now().toString(36).toUpperCase(),
        username: u, fullName: newUser.fullName.trim(), role: newUser.role,
        salt, hash, createdAt: new Date().toISOString(), lastLogin: null, active: true,
      };
      const next = [...users, created];
      await saveUsers(next);
      setUsers(next);
      setNewUser({ username: '', fullName: '', password: '', role: 'trader' });
      setShowAdd(false);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const toggleActive = async (userId) => {
    if (userId === currentUser.id) { alert('Vous ne pouvez pas désactiver votre propre compte.'); return; }
    const next = users.map(x => x.id === userId ? { ...x, active: !x.active } : x);
    await saveUsers(next); setUsers(next);
  };
  const changeRole = async (userId, role) => {
    if (userId === currentUser.id && role !== 'admin') {
      if (!confirm('Vous allez retirer vos propres droits d\'administrateur. Confirmer ?')) return;
    }
    const next = users.map(x => x.id === userId ? { ...x, role } : x);
    await saveUsers(next); setUsers(next);
    if (userId === currentUser.id) onUserUpdate({ ...currentUser, role });
  };
  const deleteUser = async (userId) => {
    if (userId === currentUser.id) { alert('Vous ne pouvez pas supprimer votre propre compte.'); return; }
    if (!confirm('Supprimer définitivement cet utilisateur et toutes ses données ?')) return;
    const next = users.filter(x => x.id !== userId);
    await saveUsers(next); setUsers(next);
    try { await window.storage.delete(`deals_user_${userId}`); } catch {}
  };
  const resetPassword = async (userId) => {
    if (newPwd.length < 8) { setError('Mot de passe : 8 caractères minimum.'); return; }
    const u = users.find(x => x.id === userId);
    const salt = genSalt();
    const hash = await hashPassword(newPwd, salt);
    const next = users.map(x => x.id === userId ? { ...x, salt, hash } : x);
    await saveUsers(next); setUsers(next);
    setResetUserId(null); setNewPwd(''); setError('');
    alert(`Mot de passe réinitialisé pour ${u.username}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des utilisateurs</h1>
          <p className="text-sm text-slate-500 mt-1">Administration des comptes — {users.length} utilisateur(s)</p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => setShowAdd(true)}>Ajouter un utilisateur</Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader icon={UserPlus} title="Nouvel utilisateur"
            action={<Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setError(''); }}>Annuler</Button>} />
          <CardBody>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Nom complet" required>
                <Input value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} />
              </Field>
              <Field label="Identifiant" required>
                <Input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
              </Field>
              <Field label="Mot de passe initial" required hint="8 caractères min — communiquez-le au nouvel utilisateur">
                <Input type="text" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
              </Field>
              <Field label="Rôle" required>
                <Select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                </Select>
              </Field>
            </div>
            {error && <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">{error}</div>}
            <div className="mt-4">
              <Button variant="primary" disabled={busy} onClick={addUser} icon={Save}>Créer l'utilisateur</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                  <th className="py-3 px-4">Identifiant</th><th className="py-3 px-4">Nom</th>
                  <th className="py-3 px-4">Rôle</th><th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Dernière connexion</th><th className="py-3 px-4 w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <React.Fragment key={u.id}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-4 font-mono text-xs">
                        {u.username}
                        {u.id === currentUser.id && <span className="ml-2 text-[10px] text-blue-700">(vous)</span>}
                      </td>
                      <td className="py-2 px-4">{u.fullName}</td>
                      <td className="py-2 px-4">
                        <Select value={u.role} onChange={e => changeRole(u.id, e.target.value)} className="text-xs">
                          {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                        </Select>
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {u.active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-slate-600">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString('fr-FR') : 'Jamais'}
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => { setResetUserId(u.id); setNewPwd(''); setError(''); }}
                            className="text-xs px-2 py-1 text-amber-700 hover:bg-amber-50 rounded flex items-center gap-1">
                            <KeyRound className="w-3 h-3" />Reset
                          </button>
                          <button onClick={() => toggleActive(u.id)} disabled={u.id === currentUser.id}
                            className="text-xs px-2 py-1 text-slate-700 hover:bg-slate-100 rounded disabled:opacity-40">
                            {u.active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button onClick={() => deleteUser(u.id)} disabled={u.id === currentUser.id}
                            className="text-xs px-2 py-1 text-red-700 hover:bg-red-50 rounded disabled:opacity-40">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {resetUserId === u.id && (
                      <tr className="bg-amber-50 border-b border-amber-200">
                        <td colSpan={6} className="py-3 px-4">
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Field label={`Nouveau mot de passe pour ${u.username}`}>
                                <Input type="text" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="8 caractères minimum" />
                              </Field>
                            </div>
                            <Button variant="gold" onClick={() => resetPassword(u.id)} icon={KeyRound} size="sm">Confirmer</Button>
                            <Button variant="outline" onClick={() => { setResetUserId(null); setNewPwd(''); setError(''); }} size="sm">Annuler</Button>
                          </div>
                          {error && <div className="mt-2 text-xs text-red-700">{error}</div>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Info} title="Description des rôles" />
        <CardBody>
          <div className="space-y-2">
            {Object.entries(ROLES).map(([k, r]) => (
              <div key={k} className="flex items-start gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded font-semibold ${r.color}`}>{r.label}</span>
                <span className="text-slate-600">{r.desc}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ============================================================
// MODULE : MON PROFIL (changer son propre mot de passe)
// ============================================================
function MyProfile({ currentUser }) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const changePassword = async () => {
    setError(''); setSuccess(''); setBusy(true);
    try {
      if (!oldPwd || !newPwd) throw new Error('Tous les champs sont requis.');
      if (newPwd.length < 8) throw new Error('Nouveau mot de passe : 8 caractères minimum.');
      if (newPwd !== confirmPwd) throw new Error('Les nouveaux mots de passe ne correspondent pas.');
      const users = await loadUsers();
      const me = users.find(x => x.id === currentUser.id);
      if (!me) throw new Error('Utilisateur introuvable.');
      const oldHash = await hashPassword(oldPwd, me.salt);
      if (oldHash !== me.hash) throw new Error('Ancien mot de passe incorrect.');
      const salt = genSalt();
      const hash = await hashPassword(newPwd, salt);
      const next = users.map(x => x.id === me.id ? { ...x, salt, hash } : x);
      await saveUsers(next);
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      setSuccess('Mot de passe modifié avec succès.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>
        <p className="text-sm text-slate-500 mt-1">Informations et sécurité du compte</p>
      </div>

      <Card>
        <CardHeader icon={User} title="Informations du compte" />
        <CardBody>
          <div className="space-y-2 text-sm">
            <Row label="Identifiant" value={currentUser.username} />
            <Row label="Nom complet" value={currentUser.fullName} />
            <Row label="Rôle" value={ROLES[currentUser.role]?.label || currentUser.role} />
            <Row label="Compte créé le" value={new Date(currentUser.createdAt).toLocaleString('fr-FR')} />
            <Row label="Dernière connexion" value={currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString('fr-FR') : '—'} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={KeyRound} title="Changer mon mot de passe" />
        <CardBody>
          <div className="space-y-4">
            <Field label="Mot de passe actuel" required>
              <Input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="Nouveau mot de passe" required hint="8 caractères minimum">
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirmer le nouveau mot de passe" required>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} autoComplete="new-password" />
            </Field>
            {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">{error}</div>}
            {success && <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800">{success}</div>}
            <Button variant="primary" disabled={busy} onClick={changePassword} icon={Save}>
              {busy ? 'Patientez…' : 'Modifier le mot de passe'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function TradingPlatform() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deals, setDeals] = useState([]);
  const [editingDeal, setEditingDeal] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // -------- AUTH : restore session at load --------
  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();
        if (session) {
          const elapsed = (Date.now() - session.lastActivity) / 60000;
          if (elapsed < SESSION_TIMEOUT_MIN) {
            const users = await loadUsers();
            const u = users.find(x => x.id === session.userId && x.active);
            if (u) {
              setCurrentUser(u);
              await saveSession({ ...session, lastActivity: Date.now() });
            } else {
              await saveSession(null);
            }
          } else {
            await saveSession(null);
          }
        }
      } catch (e) { /* ignore */ }
      setAuthChecked(true);
    })();
  }, []);

  // -------- AUTH : auto-logout sur inactivité --------
  useEffect(() => {
    if (!currentUser) return;
    const tickActivity = async () => {
      const s = await loadSession();
      if (s) await saveSession({ ...s, lastActivity: Date.now() });
    };
    const onActivity = () => tickActivity();
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);

    const interval = setInterval(async () => {
      const s = await loadSession();
      if (!s) return;
      const elapsed = (Date.now() - s.lastActivity) / 60000;
      if (elapsed >= SESSION_TIMEOUT_MIN) {
        alert('Session expirée après ' + SESSION_TIMEOUT_MIN + ' minutes d\'inactivité.');
        await saveSession(null);
        setCurrentUser(null);
      }
    }, 30000); // check toutes les 30 s

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      clearInterval(interval);
    };
  }, [currentUser]);

  // -------- DEALS : isolation par utilisateur --------
  const dealsKey = currentUser ? `deals_user_${currentUser.id}` : null;

  useEffect(() => {
    if (!currentUser) { setDeals([]); setLoaded(false); return; }
    (async () => {
      try {
        const res = await window.storage.get(dealsKey);
        setDeals(res?.value ? JSON.parse(res.value) : []);
      } catch (e) { setDeals([]); }
      setLoaded(true);
    })();
  }, [currentUser, dealsKey]);

  useEffect(() => {
    if (!loaded || !dealsKey) return;
    (async () => {
      try { await window.storage.set(dealsKey, JSON.stringify(deals)); }
      catch (e) { console.error('Save failed', e); }
    })();
  }, [deals, loaded, dealsKey]);

  const handleAuth = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };
  const logout = async () => {
    if (!confirm('Se déconnecter ?')) return;
    await saveSession(null);
    setCurrentUser(null);
    setDeals([]);
    setActiveTab('dashboard');
  };

  const isViewer = currentUser?.role === 'viewer';
  const isAdmin = currentUser?.role === 'admin';

  const saveDeal = (deal) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas créer ou modifier de deals.'); return; }
    setDeals(ds => {
      const idx = ds.findIndex(d => d.id === deal.id);
      if (idx >= 0) { const copy = [...ds]; copy[idx] = deal; return copy; }
      return [...ds, deal];
    });
    setEditingDeal(null);
    setActiveTab('deals');
  };
  const deleteDeal = (id) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas supprimer de deals.'); return; }
    setDeals(ds => ds.filter(d => d.id !== id));
  };
  const editDeal = (d) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas modifier de deals.'); return; }
    setEditingDeal(d); setActiveTab('new-deal');
  };

  // ----- gardes d'auth -----
  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="text-slate-500">Chargement…</div></div>;
  }
  if (!currentUser) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  // ----- navigation -----
  const nav = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, section: 'main' },
    { id: 'market',    label: 'Marché temps réel', icon: Activity, section: 'main' },
    { id: 'curve',     label: 'Courbe à terme',  icon: Layers, section: 'main' },
    { id: 'deals',     label: 'Mes deals',       icon: ScrollText, section: 'deals' },
    ...(!isViewer ? [{ id: 'new-deal',  label: 'Nouveau deal', icon: FilePlus2,  section: 'deals' }] : []),
    { id: 'optimizer', label: 'Optimiseur',      icon: Lightbulb,  section: 'deals' },
    { id: 'hedging',   label: 'Hedging',         icon: TrendingUp, section: 'tools' },
    { id: 'pricing',   label: 'Pricing',         icon: DollarSign, section: 'tools' },
    { id: 'freight',   label: 'Fret (WS)',       icon: Anchor,     section: 'tools' },
    { id: 'pnl',       label: 'P&L',             icon: BarChart3,  section: 'tools' },
    { id: 'lc',        label: 'LC Checker',      icon: FileCheck2, section: 'tools' },
    { id: 'risk',      label: 'Risques',         icon: ShieldAlert,section: 'tools' },
    { id: 'resources', label: 'Hub Ressources',  icon: Globe,      section: 'hub' },
    { id: 'profile',   label: 'Mon profil',      icon: User,       section: 'account' },
    ...(isAdmin ? [{ id: 'users', label: 'Utilisateurs', icon: Users, section: 'account' }] : []),
  ];

  const sections = {
    main:    { label: 'Marché & vue d\'ensemble' },
    deals:   { label: 'Mes opérations' },
    tools:   { label: 'Outils' },
    hub:     { label: 'Ressources externes' },
    account: { label: 'Compte' },
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-60 bg-slate-900 text-white flex flex-col">
        <div className="px-4 py-5 bg-white border-b-2 border-amber-500">
          <div className="flex items-center justify-center">
            <AmkoLogo size="md" showTagline={true} variant="light" />
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {Object.entries(sections).map(([sectionKey, section]) => {
            const items = nav.filter(n => n.section === sectionKey);
            if (items.length === 0) return null;
            return (
              <div key={sectionKey} className="mb-2">
                <div className="px-5 py-1 text-xs uppercase text-slate-500 font-semibold">{section.label}</div>
                {items.map(n => {
                  const Icon = n.icon;
                  const active = activeTab === n.id;
                  return (
                    <button key={n.id} onClick={() => { if (n.id === 'new-deal') setEditingDeal(null); setActiveTab(n.id); }}
                      className={`w-full flex items-center gap-3 px-5 py-2 text-sm transition ${active ? 'bg-blue-700 text-white border-l-4 border-amber-400' : 'text-slate-300 hover:bg-slate-800'}`}>
                      <Icon className="w-4 h-4" />{n.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
              {currentUser.fullName.split(' ').map(s => s[0]).join('').toUpperCase().slice(0,2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{currentUser.fullName}</div>
              <div className="text-[10px] text-slate-400 truncate">
                {ROLES[currentUser.role]?.label} • {deals.length} deal(s)
              </div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-red-700 text-slate-200 hover:text-white rounded-md transition">
            <LogOut className="w-3.5 h-3.5" />Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          {activeTab === 'dashboard' && <Dashboard deals={deals} goTo={setActiveTab} />}
          {activeTab === 'market'    && <Market />}
          {activeTab === 'curve'     && <ForwardCurve />}
          {activeTab === 'deals'     && <DealsList deals={deals} onEdit={editDeal} onDelete={deleteDeal} />}
          {activeTab === 'new-deal'  && !isViewer && <NewDeal onSave={saveDeal} editingDeal={editingDeal} onCancel={editingDeal ? () => { setEditingDeal(null); setActiveTab('deals'); } : null} />}
          {activeTab === 'optimizer' && <Optimizer deals={deals} />}
          {activeTab === 'hedging'   && <Hedging deals={deals} />}
          {activeTab === 'pricing'   && <Pricing />}
          {activeTab === 'freight'   && <Freight />}
          {activeTab === 'pnl'       && <PnL deals={deals} />}
          {activeTab === 'lc'        && <LCChecker />}
          {activeTab === 'risk'      && <RiskMatrix deals={deals} />}
          {activeTab === 'resources' && <Resources />}
          {activeTab === 'profile'   && <MyProfile currentUser={currentUser} />}
          {activeTab === 'users'     && isAdmin && <UserManagement currentUser={currentUser} onUserUpdate={setCurrentUser} />}
        </div>
      </main>
    </div>
  );
}
