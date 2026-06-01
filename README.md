# AMKO TRADING — Petroleum Trading Platform

Plateforme intégrée de trading de produits pétroliers.

## Fonctionnalités

- 📊 Marché temps réel (charts TradingView : Brent, WTI, ICE Gasoil, ULSD, RBOB, Natural Gas)
- 📈 Courbe à terme (analyse contango/backwardation)
- 💼 Gestion de deals (achat/vente, qualité, Incoterms, laycan)
- 🤖 Optimiseur de deal (analyse automatique et suggestions)
- ⚖️ Hedging (conversion MT → lots avec tous les contrats ICE / NYMEX / DME)
- 💵 Pricing (formule Platts / Argus avec différentiel)
- 🚢 Calculateur de fret (Worldscale / Lumpsum + demurrage)
- 💰 P&L (marge brute, marge nette, P&L/bbl)
- 📄 LC Checker (vérification des 22 champs SWIFT MT700)
- 🛡️ Matrice de risques (10 catégories × probabilité × gravité)
- 🌐 Hub Ressources (Platts, Argus, ICE, CME, Kpler, Bloomberg, EIA, OFAC, etc.)
- 🔐 Authentification multi-utilisateurs (3 rôles : Admin / Trader / Viewer)

## Installation locale

### Prérequis

- [Node.js](https://nodejs.org) 18 ou supérieur
- [VS Code](https://code.visualstudio.com/) (recommandé)
- [Git](https://git-scm.com/)

### Démarrage

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173) dans ton navigateur.

### Build de production

```bash
npm run build       # produit le dossier dist/
npm run preview     # teste le build localement
```

## Déploiement sur Vercel

Voir le fichier `DEPLOY.md` pour le guide pas-à-pas (GitHub + Vercel).

## Données

Les données (utilisateurs, deals, sessions) sont stockées dans le `localStorage` du navigateur de chaque utilisateur.

**Limitation importante** : avec ce mode de stockage, les données ne sont **pas partagées entre navigateurs ou appareils**. Chaque utilisateur a ses propres données locales. Pour un multi-utilisateurs en équipe avec données partagées, il faut migrer vers une base de données cloud (Supabase recommandé).

## Sécurité

- Mots de passe hachés en SHA-256 avec sel aléatoire (jamais stockés en clair)
- Session expirée après 30 minutes d'inactivité
- Premier compte créé = administrateur

⚠️ **Niveau de sécurité prototype** : convient pour un usage personnel ou en petite équipe de confiance. Pour un usage entreprise avec données sensibles, déployer avec un vrai backend serveur.

## Structure du projet

```
amko-trading/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx              # Point d'entrée React
│   ├── index.css             # Tailwind
│   └── TradingPlatform.jsx   # Code principal (tout est dedans)
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Tech stack

- **React 18** — UI
- **Vite** — build tool
- **Tailwind CSS** — styles
- **Lucide React** — icônes
- **Recharts** — graphiques (courbe à terme)
- **TradingView** — widgets de marché live (chargés en CDN)

## Licence

Propriétaire — AMKO TRADING SA
