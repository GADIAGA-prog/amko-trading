export const PRODUCTS = {
  'crude-brent':      { name: 'Brut Brent',             bblPerMT: 7.45,  type: 'crude',   marker: 'brent' },
  'crude-wti':        { name: 'Brut WTI',               bblPerMT: 7.50,  type: 'crude',   marker: 'wti' },
  'crude-bonny':      { name: 'Bonny Light',            bblPerMT: 7.55,  type: 'crude',   marker: 'brent' },
  'crude-dubai':      { name: 'Dubai',                  bblPerMT: 7.30,  type: 'crude',   marker: 'dubai' },
  'crude-arab-light': { name: 'Arabian Light',          bblPerMT: 7.35,  type: 'crude',   marker: 'dubai' },
  'gasoline':         { name: 'Essence (Gasoline)',     bblPerMT: 8.50,  type: 'product', marker: 'rbob' },
  'gasoil':           { name: 'Gasoil / Diesel 10ppm',  bblPerMT: 7.50,  type: 'product', marker: 'gasoil' },
  'jet':              { name: 'Jet A1 / Kérosène',      bblPerMT: 7.90,  type: 'product', marker: 'gasoil' },
  'naphtha':          { name: 'Naphta',                 bblPerMT: 8.90,  type: 'product', marker: 'brent' },
  'fuel-oil':         { name: 'Fuel Oil (HSFO)',        bblPerMT: 6.70,  type: 'product', marker: 'brent' },
  'propane':          { name: 'Propane (GPL)',           bblPerMT: 12.50, type: 'gpl',     marker: 'brent' },
  'butane':           { name: 'Butane (GPL)',            bblPerMT: 11.00, type: 'gpl',     marker: 'brent' },
};

export const CONTRACTS = {
  'brn-full': { name: 'ICE Brent (BRN) — 1 000 bbl',          size: 1000, unit: 'bbl', marker: 'brent',  tvSymbol: 'ICEEUR:BRN1!' },
  'brn-mini': { name: 'ICE Brent Mini (BMC) — 100 bbl',        size: 100,  unit: 'bbl', marker: 'brent',  tvSymbol: 'ICEEUR:BRN1!' },
  'cl-full':  { name: 'NYMEX WTI (CL) — 1 000 bbl',            size: 1000, unit: 'bbl', marker: 'wti',    tvSymbol: 'NYMEX:CL1!' },
  'cl-mini':  { name: 'NYMEX E-mini WTI (QM) — 500 bbl',       size: 500,  unit: 'bbl', marker: 'wti',    tvSymbol: 'NYMEX:CL1!' },
  'dme-oman': { name: 'DME Oman / Dubai — 1 000 bbl',          size: 1000, unit: 'bbl', marker: 'dubai',  tvSymbol: 'NYMEX:CL1!' },
  'gas-ice':  { name: 'ICE Gasoil (LGO) — 100 MT',             size: 100,  unit: 'MT',  marker: 'gasoil', tvSymbol: 'ICEEUR:G1!' },
  'rb-nymex': { name: 'NYMEX RBOB Gasoline — 42 000 gal',      size: 1000, unit: 'bbl', marker: 'rbob',   tvSymbol: 'NYMEX:RB1!' },
  'ho-nymex': { name: 'NYMEX ULSD / Heating Oil — 42 000 gal', size: 1000, unit: 'bbl', marker: 'ulsd',   tvSymbol: 'NYMEX:HO1!' },
};

export const TV_SYMBOLS = {
  brent:  { symbol: 'TVC:UKOIL',  name: 'Brent Crude' },
  wti:    { symbol: 'TVC:USOIL',  name: 'WTI Crude' },
  gasoil: { symbol: 'ICEEUR:G1!', name: 'ICE Gasoil' },
  ulsd:   { symbol: 'NYMEX:HO1!', name: 'ULSD / Heating Oil' },
  rbob:   { symbol: 'NYMEX:RB1!', name: 'RBOB Gasoline' },
  natgas: { symbol: 'NYMEX:NG1!', name: 'Natural Gas' },
  dxy:    { symbol: 'TVC:DXY',    name: 'US Dollar Index' },
};

export const INCOTERMS = ['FOB', 'CFR', 'CIF', 'DAP', 'DES', 'FIP'];
export const VESSELS = [
  'ULCC (>350kt)', 'VLCC (200-350kt)', 'Suezmax (120-200kt)',
  'Aframax/LR2 (80-120kt)', 'Panamax/LR1 (55-80kt)', 'MR (40-55kt)', 'Handysize (25-39kt)',
];
export const PRICE_SOURCES = ['Platts', 'Argus', 'OPIS'];
export const RISK_TYPES = [
  'Prix', 'Crédit (paiement)', 'Performance', 'Qualité', 'Quantité',
  'Logistique', 'Documentaire', 'Pays / Sanctions', 'Bancaire', 'QHSE',
];
export const SANCTIONED_COUNTRIES = [
  'russia', 'russie', 'iran', 'cuba', 'north korea', 'corée du nord',
  'syria', 'syrie', 'venezuela', 'belarus', 'biélorussie', 'sudan', 'soudan',
];

export const ROLES = {
  admin:  { label: 'Administrateur', color: 'bg-red-100 text-red-800',     desc: 'Accès total + gestion des utilisateurs' },
  trader: { label: 'Trader',         color: 'bg-brand-100 text-brand-800',   desc: 'Création et gestion de ses propres deals' },
  viewer: { label: 'Viewer',         color: 'bg-slate-100 text-slate-700', desc: 'Lecture seule, pas de création de deals' },
};

export const SESSION_TIMEOUT_MIN = 30;
