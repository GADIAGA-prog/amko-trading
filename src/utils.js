// localStorage shim — keeps the code compatible with the window.storage async API
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

export const fmt = (n, d = 2) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
};
export const fmtUSD = (n, d = 2) => '$ ' + fmt(n, d);
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const uid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'D' + crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 16);
  }
  return 'D' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
};
export const daysBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
};
