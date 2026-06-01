# Guide de déploiement — AMKO TRADING

Ce guide te conduit pas à pas de l'installation locale jusqu'au déploiement public sur Vercel.

---

## PARTIE 1 — Installation locale dans VS Code

### Étape 1.1 — Installer les prérequis

Si tu ne les as pas déjà :

1. **Node.js 18+** — télécharge sur [nodejs.org](https://nodejs.org) et installe (la version LTS).
   Vérifie dans un terminal :
   ```bash
   node --version
   npm --version
   ```

2. **VS Code** — [code.visualstudio.com](https://code.visualstudio.com/)

3. **Git** — [git-scm.com](https://git-scm.com/) (sur Windows, prend "Git for Windows" qui inclut Git Bash)

### Étape 1.2 — Ouvrir le projet dans VS Code

1. Décompresse le dossier `amko-trading` quelque part (ex. `Documents/projets/amko-trading`)
2. Dans VS Code : **Fichier → Ouvrir le dossier** → choisis `amko-trading`
3. Ouvre le terminal intégré : **Affichage → Terminal** (ou `Ctrl + ù` sur Windows / `Ctrl + ` ` sur Mac)

### Étape 1.3 — Installer les dépendances

Dans le terminal de VS Code :

```bash
npm install
```

Cela télécharge React, Vite, Tailwind, etc. (créé le dossier `node_modules`). Compte ~1 minute.

### Étape 1.4 — Lancer en local

```bash
npm run dev
```

Le terminal affiche :
```
  VITE v6.0.7  ready in 432 ms
  ➜  Local:   http://localhost:5173/
```

Ouvre [http://localhost:5173](http://localhost:5173) dans ton navigateur. **C'est ta plateforme.**

Modifie un fichier, sauvegarde — la page se met à jour automatiquement.

Pour arrêter : `Ctrl + C` dans le terminal.

---

## PARTIE 2 — Mettre le code sur GitHub

### Étape 2.1 — Créer un compte GitHub

Si pas déjà fait : [github.com](https://github.com) → Sign up. C'est gratuit.

### Étape 2.2 — Créer un dépôt

1. Sur GitHub, clique sur le **+** en haut à droite → **New repository**
2. Nom du dépôt : `amko-trading` (ou autre, peu importe)
3. **Important** : laisse-le **Private** si tu ne veux pas que le code soit public
4. Ne coche **aucune** des options "Add README", "Add .gitignore", etc. (on les a déjà)
5. Clique **Create repository**

GitHub t'affiche une page avec des commandes. Ne ferme pas cet onglet.

### Étape 2.3 — Initialiser Git en local

Dans le terminal de VS Code (dans le dossier `amko-trading`) :

```bash
git init
git add .
git commit -m "Initial commit - AMKO TRADING Platform"
```

Si Git te demande de configurer ton identité :

```bash
git config --global user.email "ton.email@example.com"
git config --global user.name "Ton Nom"
```

Puis relance `git commit -m "..."`.

### Étape 2.4 — Connecter et pousser sur GitHub

Sur la page GitHub que tu as ouverte, **copie les deux lignes** sous "...or push an existing repository". Elles ressemblent à :

```bash
git remote add origin https://github.com/TON-USERNAME/amko-trading.git
git branch -M main
git push -u origin main
```

Colle-les dans ton terminal VS Code. À la première fois, GitHub te demandera de t'authentifier (un navigateur s'ouvre, tu te connectes, c'est fait).

Rafraîchis l'onglet GitHub : ton code est en ligne. 🎉

---

## PARTIE 3 — Déployer sur Vercel

### Étape 3.1 — Créer un compte Vercel

[vercel.com](https://vercel.com) → **Sign up** → choisis **Continue with GitHub**. C'est gratuit pour un usage personnel.

### Étape 3.2 — Importer le projet

1. Sur le dashboard Vercel, clique **Add New... → Project**
2. Vercel liste tes dépôts GitHub. Clique **Import** à côté de `amko-trading`
3. Vercel détecte automatiquement Vite. Laisse tout par défaut :
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. Clique **Deploy**

Compte 1 à 2 minutes. Vercel installe les dépendances, build le projet, et te donne une URL publique du type :

```
https://amko-trading-xxx.vercel.app
```

**Ta plateforme est en ligne, accessible 24/7 depuis n'importe où.**

### Étape 3.3 — Mises à jour automatiques

Désormais, à chaque fois que tu pousses du nouveau code sur GitHub :

```bash
git add .
git commit -m "description du changement"
git push
```

Vercel **redéploie automatiquement** en 1-2 minutes. Tu n'as plus à toucher Vercel.

---

## PARTIE 4 — Nom de domaine personnalisé (optionnel)

Pour avoir `app.amkotrading.com` au lieu de `amko-trading-xxx.vercel.app` :

### Étape 4.1 — Acheter un domaine

Si tu n'en as pas, achète sur :
- [Namecheap](https://www.namecheap.com) (~10 €/an)
- [OVH](https://www.ovhcloud.com) (~8 €/an)
- [Google Domains](https://domains.google) (~12 €/an)

### Étape 4.2 — Connecter à Vercel

1. Sur Vercel, va dans ton projet → **Settings → Domains**
2. Tape le nom de domaine choisi (ex. `app.amkotrading.com`) → **Add**
3. Vercel te donne des **enregistrements DNS** à ajouter chez ton registrar (CNAME ou A)
4. Va sur le site de ton registrar, configure le DNS comme indiqué
5. Attends 10 minutes à 24 heures (généralement < 1 h)

Ton URL personnalisée fonctionne. HTTPS est automatique et gratuit (Let's Encrypt).

---

## PARTIE 5 — Maintenance et workflow quotidien

### Modifier le code

1. Ouvre le projet dans VS Code
2. Modifie ce que tu veux
3. Test en local : `npm run dev`
4. Quand tu es satisfait :
   ```bash
   git add .
   git commit -m "ajout fonctionnalité X"
   git push
   ```
5. Vercel redéploie tout seul

### Sauvegardes

- Le code est sauvegardé sur GitHub (sûr)
- Les **données utilisateurs/deals** sont dans `localStorage` du navigateur **de chaque utilisateur**. Elles ne sont **pas** dans le code, pas sur GitHub, pas sur Vercel
- Conseil : pour exporter périodiquement les deals, je peux ajouter une fonction d'export JSON dans la plateforme — demande-le

### Si tu casses tout

GitHub conserve l'historique. Pour revenir en arrière :

```bash
git log                    # voir l'historique
git revert HEAD            # annuler le dernier commit
git push                   # pousser l'annulation
```

Vercel redéploie la version précédente automatiquement.

---

## Limitations actuelles (à connaître)

1. **Pas de partage de données entre utilisateurs.** Chaque utilisateur a ses propres deals dans son propre navigateur. Si tu veux un vrai multi-utilisateurs partagé, il faut migrer vers Supabase (étape suivante possible).

2. **Pas de récupération de mot de passe par email.** Si un utilisateur oublie son mot de passe, l'admin doit le réinitialiser depuis la console de gestion.

3. **Sécurité de niveau prototype.** Convient pour usage personnel ou petite équipe de confiance.

---

## Aide

Si tu bloques à une étape, retourne-moi :
- L'étape précise
- Le message d'erreur (capture d'écran ou copier-coller)

Je débloque.
