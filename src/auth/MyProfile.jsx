import React, { useState, useRef } from 'react';
import { User, KeyRound, Save, Download, Upload } from 'lucide-react';
import { ROLES } from '../constants.js';
import { loadUsers, saveUsers, hashPassword, genSalt } from './authHelpers.js';
import { Card, CardHeader, CardBody, Field, Input, Button, Row } from '../components/UI.jsx';

export default function MyProfile({ currentUser, onRestoreDeals }) {
  const [oldPwd,     setOldPwd]     = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [busy,       setBusy]       = useState(false);
  const fileInputRef = useRef(null);

  const changePassword = async () => {
    setError(''); setSuccess(''); setBusy(true);
    try {
      if (!oldPwd || !newPwd) throw new Error('Tous les champs sont requis.');
      if (newPwd.length < 8) throw new Error('Nouveau mot de passe : 8 caractères minimum.');
      if (newPwd !== confirmPwd) throw new Error('Les nouveaux mots de passe ne correspondent pas.');
      const users = await loadUsers();
      const me    = users.find(x => x.id === currentUser.id);
      if (!me) throw new Error('Utilisateur introuvable.');
      const oldHash = await hashPassword(oldPwd, me.salt);
      if (oldHash !== me.hash) throw new Error('Ancien mot de passe incorrect.');
      const salt = genSalt();
      const hash = await hashPassword(newPwd, salt);
      await saveUsers(users.map(x => x.id === me.id ? { ...x, salt, hash } : x));
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      setSuccess('Mot de passe modifié avec succès.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  // ─── Sauvegarde complète (Fix 1 via profil) ───────────────────
  const backupDeals = async () => {
    try {
      const res   = await window.storage.get(`deals_user_${currentUser.id}`);
      const deals = res?.value ? JSON.parse(res.value) : [];
      const blob  = new Blob([JSON.stringify(deals, null, 2)], { type: 'application/json' });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href      = url;
      a.download  = `amko-backup-${currentUser.username}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erreur lors de la sauvegarde : ' + err.message);
    }
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('Le fichier ne contient pas un tableau de deals.');
        if (window.confirm(`Restaurer ${imported.length} deal(s) ? Cela remplacera tous vos deals actuels.`)) {
          await window.storage.set(`deals_user_${currentUser.id}`, JSON.stringify(imported));
          onRestoreDeals(imported);
          alert('Sauvegarde restaurée avec succès.');
        }
      } catch (err) {
        alert('Fichier JSON invalide : ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mon profil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Informations et sécurité du compte</p>
      </div>

      <Card>
        <CardHeader icon={User} title="Informations du compte" />
        <CardBody>
          <div className="space-y-2 text-sm">
            <Row label="Identifiant"     value={currentUser.username} />
            <Row label="Nom complet"     value={currentUser.fullName} />
            <Row label="Rôle"            value={ROLES[currentUser.role]?.label || currentUser.role} />
            <Row label="Compte créé le"  value={new Date(currentUser.createdAt).toLocaleString('fr-FR')} />
            <Row label="Dernière connexion" value={currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString('fr-FR') : '—'} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={KeyRound} title="Changer mon mot de passe" />
        <CardBody>
          <div className="space-y-4">
            <Field label="Mot de passe actuel" required>
              <Input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="Nouveau mot de passe" required hint="8 caractères minimum">
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirmer le nouveau mot de passe" required>
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} autoComplete="new-password" />
            </Field>
            {error   && <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md text-sm text-red-800 dark:text-red-300">{error}</div>}
            {success && <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-md text-sm text-emerald-800 dark:text-emerald-300">{success}</div>}
            <Button variant="primary" disabled={busy} onClick={changePassword} icon={Save}>
              {busy ? 'Patientez…' : 'Modifier le mot de passe'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Fix 1 — Sauvegarde complète des deals */}
      <Card>
        <CardHeader icon={Download} title="Sauvegarde des données"
          subtitle="Export / import de tous vos deals" />
        <CardBody>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Téléchargez une copie locale de vos deals ou restaurez-les depuis un fichier de sauvegarde.
              <br />
              <span className="text-amber-600 dark:text-amber-400 text-xs">
                La restauration remplace tous vos deals actuels — effectuez une sauvegarde avant.
              </span>
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" icon={Download} onClick={backupDeals}>
                Télécharger une sauvegarde complète
              </Button>
              <Button variant="outline" icon={Upload} onClick={() => fileInputRef.current?.click()}>
                Restaurer une sauvegarde
              </Button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden"
                onChange={handleRestoreFile} />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
