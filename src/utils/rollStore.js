// rollStore.js — Historique des rolls futures, cloisonné PAR UTILISATEUR.
// (l'ancienne clé globale 'amko_roll_history' fuyait les rolls entre comptes)
// Migration : au premier accès d'un utilisateur, l'historique legacy global
// est rapatrié sur sa clé puis supprimé.

const LEGACY_KEY = 'amko_roll_history';
const keyFor = (userId) => (userId ? `amko_roll_history_${userId}` : LEGACY_KEY);

export function loadRollHistory(userId) {
  try {
    const key = keyFor(userId);
    let v = localStorage.getItem(key);
    if (v == null && userId) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy != null) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_KEY);
        v = legacy;
      }
    }
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export function saveRollHistory(userId, hist) {
  try { localStorage.setItem(keyFor(userId), JSON.stringify(hist.slice(0, 50))); }
  catch {}
}

// Somme du roll cumulé (crédit +/coût −) des rolls enregistrés pour un deal donné.
export function rollTotalForDeal(userId, dealId) {
  if (!dealId) return 0;
  return loadRollHistory(userId)
    .filter(e => e.linkedDeal === dealId)
    .reduce((s, e) => s + (Number(e.totalRoll) || 0), 0);
}
