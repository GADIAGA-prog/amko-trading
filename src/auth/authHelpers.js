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

export async function hashPassword(password, salt) {
  return sha256(salt + ':' + password);
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
