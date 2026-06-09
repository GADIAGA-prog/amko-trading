export const PLATTS_STORE_KEY = 'amko_platts_consolidated_v1';

function asNumber(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function loadPlattsStore() {
  try {
    const raw = localStorage.getItem(PLATTS_STORE_KEY);
    if (!raw) return { dates: [], prices: {}, columns: [], descriptions: {}, files: [] };
    const parsed = JSON.parse(raw);
    return {
      dates: Array.isArray(parsed.dates) ? parsed.dates : [],
      prices: parsed.prices || {},
      columns: Array.isArray(parsed.columns) ? parsed.columns : [],
      descriptions: parsed.descriptions || {},
      files: Array.isArray(parsed.files) ? parsed.files : [],
    };
  } catch {
    return { dates: [], prices: {}, columns: [], descriptions: {}, files: [] };
  }
}

export function savePlattsStore(store) {
  const dates = Array.from(new Set(store.dates || [])).sort().reverse();
  const columns = Array.from(new Set(store.columns || [])).filter(Boolean).sort();
  const normalized = {
    dates,
    columns,
    descriptions: store.descriptions || {},
    prices: store.prices || {},
    files: (store.files || []).slice(0, 30),
    updatedAt: new Date().toISOString(),
  };
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
    const c = cleanText(code);
    if (c && !next.columns.includes(c)) next.columns.push(c);
  });

  Object.entries(dataset?.descriptions || {}).forEach(([code, desc]) => {
    const c = cleanText(code);
    if (c) next.descriptions[c] = cleanText(desc) || c;
  });

  incomingDates.forEach((date) => {
    if (!date) return;
    if (!next.dates.includes(date)) next.dates.push(date);
    if (!next.prices[date]) next.prices[date] = {};
    Object.entries(dataset.prices?.[date] || {}).forEach(([code, value]) => {
      const c = cleanText(code);
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
    products: next.columns.length,
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
  const clean = cleanText(code).replace(/^platts:/, '');
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
  window.dispatchEvent(new CustomEvent('amko:platts-updated', { detail: null }));
}
