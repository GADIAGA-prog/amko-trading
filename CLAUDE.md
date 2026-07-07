# AMKO Trading — Guide Claude Code

Plateforme de trading de produits pétroliers (Brent, WTI, Gasoil, ULSD, RBOB, Natural Gas).
Stack : React + JavaScript (JSX) + Vite + Tailwind CSS. Tout le state est local (pas de backend, sauf `api/chat.js` pour les agents IA).

## Structure du projet

- [src/TradingPlatform.jsx](src/TradingPlatform.jsx) — routage principal, layout, handlers de sauvegarde des deals
- [src/modules/](src/modules/) — modules métier (Cockpit deal, Book de position, hedging, pricing, P&L, fret, LC, risques, FX…)
- [src/calc/](src/calc/) — logique de calcul pure sans React (hedge, P&L, FX, position, cycle de vie du deal)
- [src/components/](src/components/) — primitives UI (Card, Field, Stat…), widgets TradingView, logo
- [src/auth/](src/auth/) — écrans et helpers d'authentification (localStorage)
- [src/utils/](src/utils/) — stores localStorage (Platts, rolls) ; [src/utils.js](src/utils.js) — helpers (fmt, uid…)
- [src/constants.js](src/constants.js) — référentiels PRODUCTS, CONTRACTS, rôles, sanctions

## Modèle de données

Un tableau `deals` par utilisateur (clé `deals_user_<id>` en localStorage). Chaque module
enrichit le deal d'un sous-objet persistant : `deal.pricing`, `.pricingValidation`, `.hedging`,
`.fxHedge`, `.freight`, `.lots`, `.riskMatrix`, `.lcCheck`, `.pnl`. Le Cockpit deal et le
Book de position agrègent ces sous-objets — toute nouvelle donnée métier doit suivre ce motif.

## Commandes

```bash
npm run dev      # serveur dev sur http://localhost:5173
npm run build    # build de production
npm run preview  # tester le build
```

## Les 4 principes de Karpathy

### 1. Give in to the vibes — Lâche prise, entre dans le flux

Ne résiste pas à l'élan de l'IA. Si une direction émerge naturellement dans la session, suis-la.
Formule des demandes en langage naturel, orientées comportement : "le bouton doit afficher le P&L net en rouge quand négatif", pas "modifie la ligne 42 de PnLPanel.tsx".

### 2. Don't read the code — Fais confiance au comportement, pas aux lignes

Ne relis pas chaque ligne modifiée. Vérifie que l'app se comporte correctement dans le navigateur.
Ce qui compte : est-ce que le calcul de hedging est juste ? est-ce que la courbe à terme s'affiche ? Pas : est-ce que la syntaxe de la map() est élégante ?

### 3. Run it to test — Lance et observe, itère vite

Lance `npm run dev` après chaque changement significatif. Observe le comportement réel.
Ne spécule pas sur ce qui va marcher — teste-le. Les bugs de calcul (P&L, Worldscale, différentiel Platts) ne se voient qu'à l'exécution.

### 4. Describe what you see, not what you think — Décris le symptôme, pas la cause supposée

Quand quelque chose ne marche pas, décris ce que tu vois : "le champ Laycan affiche NaN quand je change la date", pas "je pense que le problème vient du parser de date".
Colle le message d'erreur exact. Screenshot si nécessaire. Laisse Claude diagnostiquer.

## Domaine métier

- **Pricing** : formule différentielle sur Platts/Argus (ex. Dated Brent + $1.50/bbl)
- **Hedging** : conversion MT → lots ICE/NYMEX/DME, calcul du ratio de couverture
- **Fret** : Worldscale flat rate × WS points, ou Lumpsum ; demurrage en $/heure
- **P&L** : (prix vente − prix achat − fret − autres coûts) × volume en MT
- **LC** : vérification des 22 champs SWIFT MT700 selon UCP 600
- **Risques** : matrice probabilité × gravité sur 10 catégories (prix, crédit, opérationnel…)

## Conventions

- Composants en PascalCase, utilitaires en camelCase
- Pas de backend : toutes les données sont dans le state React local
- Tailwind pour le style, pas de CSS modules
- TypeScript strict — pas de `any` sauf cas documenté
