import '../utils.js'; // ensures window.storage shim is initialized

export async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function genSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── PBKDF2 (SHA-256, 150 000 itérations) ─────────────────────────
// Format stocké : "pbkdf2$<itérations>$<hex>".
// Les anciens hashes (SHA-256 simple, 64 hex) restent vérifiables et sont
// re-hashés en PBKDF2 au premier login réussi (migration transparente).
const PBKDF2_ITERATIONS = 150000;

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export async function pbkdf2Hash(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations },
    keyMaterial, 256,
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, salt) {
  const h = await pbkdf2Hash(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${h}`;
}

/** Vérifie un mot de passe contre user.hash (PBKDF2 ou legacy SHA-256).
 *  @returns {{ok: boolean, needsRehash: boolean}} needsRehash = legacy vérifié → re-hasher. */
export async function verifyPassword(user, password) {
  if (!user?.hash || !user?.salt) return { ok: false, needsRehash: false };
  if (String(user.hash).startsWith('pbkdf2$')) {
    const [, iterStr, stored] = String(user.hash).split('$');
    const h = await pbkdf2Hash(password, user.salt, Number(iterStr) || PBKDF2_ITERATIONS);
    return { ok: h === stored, needsRehash: false };
  }
  const legacy = await sha256(user.salt + ':' + password);
  const ok = legacy === user.hash;
  return { ok, needsRehash: ok };
}

export async function loadUsers() {
  try {
    const res = await window.storage.get('amko_users');
    return res?.value ? JSON.parse(res.value) : [];
  } catch { return []; }
}

export async function saveUsers(users) {
  try { await window.storage.set('amko_users', JSON.stringify(users)); }
  catch (e) { console.error('saveUsers failed', e); }
}

export async function loadSession() {
  try {
    const res = await window.storage.get('amko_session');
    return res?.value ? JSON.parse(res.value) : null;
  } catch { return null; }
}

export async function saveSession(s) {
  try {
    if (s) await window.storage.set('amko_session', JSON.stringify(s));
    else await window.storage.delete('amko_session');
  } catch (e) { console.error('saveSession failed', e); }
}
