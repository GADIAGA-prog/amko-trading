import React, { useState, useEffect } from 'react';
import { Lock, UserPlus, Eye, EyeOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SESSION_TIMEOUT_MIN } from '../constants.js';
import { loadUsers, saveUsers, saveSession, genSalt, hashPassword, verifyPassword } from './authHelpers.js';
import { Field, Input, Button } from '../components/UI.jsx';
import { AmkoLogo } from '../components/Logo.jsx';

export default function AuthScreen({ onAuth }) {
  const [mode,       setMode]       = useState('login');
  const [users,      setUsers]      = useState(null);
  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [fullName,   setFullName]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [error,      setError]      = useState('');
  const [busy,       setBusy]       = useState(false);

  useEffect(() => { loadUsers().then(setUsers); }, []);

  const isFirstUser = users !== null && users.length === 0;
  useEffect(() => { if (isFirstUser) setMode('signup'); }, [isFirstUser]);

  if (users === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="text-slate-500">Chargement…</div>
      </div>
    );
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
          username: u, fullName: fullName.trim(),
          role: isFirstUser ? 'admin' : 'trader',
          salt, hash,
          createdAt: new Date().toISOString(),
          lastLogin: null, active: true,
        };
        await saveUsers([...users, newUser]);
        await saveSession({ userId: newUser.id, loggedAt: Date.now(), lastActivity: Date.now() });
        onAuth(newUser);
      } else {
        const found = users.find(x => x.username === u);
        if (!found) throw new Error('Identifiant ou mot de passe incorrect.');
        if (!found.active) throw new Error("Compte désactivé. Contactez l'administrateur.");
        const check = await verifyPassword(found, password);
        if (!check.ok) throw new Error('Identifiant ou mot de passe incorrect.');
        let patched = { ...found, lastLogin: new Date().toISOString() };
        // Migration transparente : ancien hash SHA-256 → PBKDF2 au premier login réussi
        if (check.needsRehash) patched.hash = await hashPassword(password, found.salt);
        const updated = users.map(x => x.id === found.id ? patched : x);
        await saveUsers(updated);
        await saveSession({ userId: found.id, loggedAt: Date.now(), lastActivity: Date.now() });
        onAuth(patched);
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
        <div className="bg-white rounded-xl p-6 mb-6 flex items-center justify-center shadow-2xl">
          <AmkoLogo size="xl" showTagline={true} variant="light" />
        </div>
        <p className="text-slate-400 text-xs text-center mb-8 uppercase tracking-widest">
          Petroleum Trading Platform
        </p>

        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              {mode === 'login'
                ? <Lock className="w-5 h-5 text-brand-700" />
                : <UserPlus className="w-5 h-5 text-emerald-700" />}
              <h1 className="text-xl font-bold text-slate-900">
                {mode === 'login' ? 'Connexion' : isFirstUser ? 'Créer le compte administrateur' : 'Créer un compte'}
              </h1>
            </div>
            <p className="text-sm text-slate-500">
              {mode === 'login'
                ? 'Identifiez-vous pour accéder à la plateforme'
                : isFirstUser
                  ? 'Premier accès : le compte créé sera Administrateur'
                  : 'Renseignez vos informations'}
            </p>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            {mode === 'signup' && (
              <Field label="Nom complet" required>
                <Input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Daniel Ndiaye" autoComplete="name" />
              </Field>
            )}
            <Field label="Identifiant" required>
              <Input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="daniel.n" autoComplete="username" autoFocus />
            </Field>
            <Field label="Mot de passe" required hint={mode === 'signup' ? '8 caractères minimum' : undefined}>
              <div className="relative">
                <Input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="pr-10" />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            {mode === 'signup' && (
              <Field label="Confirmer le mot de passe" required>
                <Input type={showPwd ? 'text' : 'password'} value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••"
                  autoComplete="new-password" />
              </Field>
            )}

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}

            <Button type="submit" variant="primary" disabled={busy}
              icon={mode === 'login' ? Lock : UserPlus}>
              <span className="flex-1 text-center">
                {busy ? 'Patientez…' : mode === 'login' ? 'Se connecter' : isFirstUser ? "Créer l'admin" : 'Créer mon compte'}
              </span>
            </Button>

            {!isFirstUser && (
              <div className="text-center pt-2 border-t border-slate-100">
                <button type="button"
                  onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
                  className="text-sm text-brand-700 hover:underline">
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
              <b className="text-slate-200">Sécurité :</b> Mots de passe hachés SHA-256 avec sel. Session inactive déconnectée après {SESSION_TIMEOUT_MIN} min.
              <br /><span className="text-amber-400">Note : protection de niveau prototype. Pour usage entreprise, déployer avec backend serveur.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
