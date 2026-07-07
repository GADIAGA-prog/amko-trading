// auditLog.js — Journal d'audit horodaté (blotter), cloisonné par utilisateur.
// Chaque action métier sur un deal y laisse une trace : qui, quand, quoi.

const keyFor = (userId) => `amko_audit_${userId || 'anon'}`;
const MAX_ENTRIES = 600;

export function loadAudit(userId) {
  try {
    const v = localStorage.getItem(keyFor(userId));
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export function logAction(userId, { dealId = null, action, label = '' }) {
  try {
    const list = loadAudit(userId);
    list.unshift({ ts: new Date().toISOString(), dealId, action, label });
    localStorage.setItem(keyFor(userId), JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {}
}

export function clearAudit(userId) {
  try { localStorage.removeItem(keyFor(userId)); } catch {}
}

// Libellés et couleurs d'affichage par type d'action.
export const ACTION_META = {
  created:      { label: 'Création',        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  updated:      { label: 'Édition',         cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  duplicated:   { label: 'Duplication',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  deleted:      { label: 'Suppression',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  status:       { label: 'Statut',          cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  pricing:      { label: 'Pricing',         cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  'fx-pricing': { label: 'Validation FX',   cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  hedge:        { label: 'Hedge',           cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  fx:           { label: 'Couverture FX',   cls: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
  freight:      { label: 'Fret',            cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  lots:         { label: 'Lots',            cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  pnl:          { label: 'P&L',             cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  risk:         { label: 'Risques',         cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  lc:           { label: 'LC',              cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  price:        { label: 'Prix',            cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  import:       { label: 'Import',          cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  restore:      { label: 'Restauration',    cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
};
