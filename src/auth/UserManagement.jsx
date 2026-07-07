import React, { useState, useEffect } from 'react';
import { UserPlus, KeyRound, Trash2, Save, Info } from 'lucide-react';
import { ROLES } from '../constants.js';
import { loadUsers, saveUsers, genSalt, hashPassword } from './authHelpers.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Button } from '../components/UI.jsx';

export default function UserManagement({ currentUser, onUserUpdate }) {
  const [users,       setUsers]       = useState([]);
  const [showAdd,     setShowAdd]     = useState(false);
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState('');
  const [newUser,     setNewUser]     = useState({ username: '', fullName: '', password: '', role: 'trader' });
  const [resetUserId, setResetUserId] = useState(null);
  const [newPwd,      setNewPwd]      = useState('');

  useEffect(() => { loadUsers().then(setUsers); }, []);

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
      await saveUsers(next); setUsers(next);
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
      if (!window.confirm("Vous allez retirer vos propres droits d'administrateur. Confirmer ?")) return;
    }
    const next = users.map(x => x.id === userId ? { ...x, role } : x);
    await saveUsers(next); setUsers(next);
    if (userId === currentUser.id) onUserUpdate({ ...currentUser, role });
  };

  const deleteUser = async (userId) => {
    if (userId === currentUser.id) { alert('Vous ne pouvez pas supprimer votre propre compte.'); return; }
    if (!window.confirm('Supprimer définitivement cet utilisateur et toutes ses données ?')) return;
    const next = users.filter(x => x.id !== userId);
    await saveUsers(next); setUsers(next);
    try { await window.storage.delete(`deals_user_${userId}`); } catch {}
  };

  const resetPassword = async (userId) => {
    if (newPwd.length < 8) { setError('Mot de passe : 8 caractères minimum.'); return; }
    const u    = users.find(x => x.id === userId);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gestion des utilisateurs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Administration des comptes — {users.length} utilisateur(s)
          </p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => setShowAdd(true)}>
          Ajouter un utilisateur
        </Button>
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
              <Field label="Mot de passe initial" required hint="8 caractères min">
                <Input type="text" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
              </Field>
              <Field label="Rôle" required>
                <Select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                </Select>
              </Field>
            </div>
            {error && <div className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-800 dark:text-red-300">{error}</div>}
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
                <tr className="text-left bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-400">
                  <th className="py-3 px-4">Identifiant</th>
                  <th className="py-3 px-4">Nom</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Dernière connexion</th>
                  <th className="py-3 px-4 w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <React.Fragment key={u.id}>
                    <tr className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-2 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {u.username}
                        {u.id === currentUser.id && <span className="ml-2 text-[10px] text-brand-700 dark:text-brand-400">(vous)</span>}
                      </td>
                      <td className="py-2 px-4 text-slate-800 dark:text-slate-200">{u.fullName}</td>
                      <td className="py-2 px-4">
                        <Select value={u.role} onChange={e => changeRole(u.id, e.target.value)} className="text-xs">
                          {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                        </Select>
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                          {u.active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString('fr-FR') : 'Jamais'}
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => { setResetUserId(u.id); setNewPwd(''); setError(''); }}
                            className="text-xs px-2 py-1 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded flex items-center gap-1">
                            <KeyRound className="w-3 h-3" />Reset
                          </button>
                          <button onClick={() => toggleActive(u.id)} disabled={u.id === currentUser.id}
                            className="text-xs px-2 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-40">
                            {u.active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button onClick={() => deleteUser(u.id)} disabled={u.id === currentUser.id}
                            className="text-xs px-2 py-1 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-40">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {resetUserId === u.id && (
                      <tr className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700">
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
                          {error && <div className="mt-2 text-xs text-red-700 dark:text-red-400">{error}</div>}
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
                <span className="text-slate-600 dark:text-slate-400">{r.desc}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
