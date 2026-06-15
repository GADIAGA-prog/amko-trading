export const PLATTS_STORE_KEY = 'amko_platts_consolidated_v2';
const LEGACY_PLATTS_KEYS = ['amko_platts_consolidated_v1', 'amko_platts_dataset', 'plattsDataset'];

const CODE_ALIASES = {
  'GAS 1!-ICE': 'GAS1',
  'GAS 1!': 'GAS1',
  'GAS1': 'GAS1',
};

function asNumber(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizePlattsCode(value) {
  const raw = cleanText(value).toUpperCase();
  if (!raw) return '';
  if (CODE_ALIASES[raw]) return CODE_ALIASES[raw];
  return raw.replace(/-PLM$/i, '');
}

function normalizeStore(parsed) {
  const result = { dates: [], prices: {}, columns: [], descriptions: {}, files: [] };
  result.dates = Array.from(new Set(parsed?.dates || [])).sort().reverse();
  result.files = Array.isArray(parsed?.files) ? parsed.files : [];

  Object.entries(parsed?.descriptions || {}).forEach(([code, desc]) => {
    const c = normalizePlattsCode(code);
    if (c) result.descriptions[c] = cleanText(desc) || c;
  });

  (parsed?.columns || []).forEach((code) => {
    const c = normalizePlattsCode(code);
    if (c && !result.columns.includes(c)) result.columns.push(c);
    if (c && !result.descriptions[c]) result.descriptions[c] = c;
  });

  Object.entries(parsed?.prices || {}).forEach(([date, row]) => {
    if (!date) return;
    if (!result.dates.includes(date)) result.dates.push(date);
    if (!result.prices[date]) result.prices[date] = {};
    Object.entries(row || {}).forEach(([code, value]) => {
      const c = normalizePlattsCode(code);
      const v = asNumber(value);
      if (!c || v == null) return;
      result.prices[date][c] = v;
      if (!result.columns.includes(c)) result.columns.push(c);
      if (!result.descriptions[c]) result.descriptions[c] = c;
    });
  });

  result.dates = Array.from(new Set(result.dates)).sort().reverse();
  result.columns = Array.from(new Set(result.columns)).filter(Boolean).sort();
  return result;
}

export function loadPlattsStore() {
  try {
    const raw = localStorage.getItem(PLATTS_STORE_KEY);
    if (!raw) return { dates: [], prices: {}, columns: [], descriptions: {}, files: [] };
    return normalizeStore(JSON.parse(raw));
  } catch {
    return { dates: [], prices: {}, columns: [], descriptions: {}, files: [] };
  }
}

export function savePlattsStore(store) {
  const normalized = normalizeStore(store);
  normalized.updatedAt = new Date().toISOString();
  normalized.files = (store.files || normalized.files || []).slice(0, 30);
  localStorage.setItem(PLATTS_STORE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('amko:platts-updated', { detail: normalized }));
  return normalized;
}

export function mergePlattsDataset(dataset, filename = '') {
  const current = loadPlattsStore();
  const next = {
    dates: [...current.dates],
    prices: { ...current.prices },
    columns: [...current.columns],
    descriptions: { ...current.descriptions },
    files: [...current.files],
  };

  const incomingDates = dataset?.dates || Object.keys(dataset?.prices || {});
  const incomingColumns = dataset?.columns || [];

  incomingColumns.forEach((code) => {
    const c = normalizePlattsCode(code);
    if (c && !next.columns.includes(c)) next.columns.push(c);
  });

  Object.entries(dataset?.descriptions || {}).forEach(([code, desc]) => {
    const c = normalizePlattsCode(code);
    if (c) next.descriptions[c] = cleanText(desc) || c;
  });

  incomingDates.forEach((date) => {
    if (!date) return;
    if (!next.dates.includes(date)) next.dates.push(date);
    if (!next.prices[date]) next.prices[date] = {};
    Object.entries(dataset.prices?.[date] || {}).forEach(([code, value]) => {
      const c = normalizePlattsCode(code);
      const v = asNumber(value);
      if (!c || v == null) return;
      next.prices[date][c] = v;
      if (!next.columns.includes(c)) next.columns.push(c);
      if (!next.descriptions[c]) next.descriptions[c] = c;
    });
  });

  next.files.unshift({
    filename: filename || dataset?.source || 'Import Platts',
    importedAt: new Date().toISOString(),
    rows: incomingDates.length,
    products: incomingColumns.length,
  });

  return savePlattsStore(next);
}

export function getPlattsProductOptions() {
  const store = loadPlattsStore();
  return (store.columns || []).map((code) => ({
    code,
    value: `platts:${code}`,
    label: `${store.descriptions?.[code] || code} (${code})`,
    description: store.descriptions?.[code] || code,
  }));
}

export function getLatestPlattsPrice(code) {
  const store = loadPlattsStore();
  const clean = normalizePlattsCode(String(code).replace(/^platts:/, ''));
  for (const date of store.dates || []) {
    const price = store.prices?.[date]?.[clean];
    if (price != null) return { date, price, code: clean, description: store.descriptions?.[clean] || clean };
  }
  return null;
}

export function buildDatasetFromStore() {
  const store = loadPlattsStore();
  return {
    source: 'Platts consolidé local',
    importedAt: store.updatedAt || new Date().toISOString(),
    dates: store.dates || [],
    prices: store.prices || {},
    columns: store.columns || [],
    descriptions: store.descriptions || {},
  };
}

export function clearPlattsStore() {
  localStorage.removeItem(PLATTS_STORE_KEY);
  LEGACY_PLATTS_KEYS.forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent('amko:platts-updated', { detail: null }));
}
