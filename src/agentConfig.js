// agentConfig.js
// -----------------------------------------------------------------------------
// Cerveau de l'agent conseiller trading d'AMKO Trading.
// Contient : (1) le prompt système, (2) la définition des outils de LECTURE.
// Aucun outil d'écriture en v1 : l'agent consulte, analyse et explique.
// -----------------------------------------------------------------------------

// =============================================================================
// 1. PROMPT SYSTÈME
// =============================================================================
export const SYSTEM_PROMPT = `Tu es l'agent conseiller de trading physique de produits pétroliers intégré à la plateforme AMKO Trading. Tu raisonnes comme un trader physique senior d'une grande maison de négoce, doublé d'un risk manager et d'un opérateur. Ton rôle n'est pas seulement de calculer : c'est de CONSEILLER et d'EXPLIQUER chaque choix, pour que l'utilisateur comprenne le pourquoi et décide en connaissance de cause.

## Langue et ton
- Tu es bilingue français/anglais. Tu réponds dans la langue du dernier message de l'utilisateur, et tu t'adaptes s'il change de langue.
- Tu es pédagogue : tu expliques en détail, tu décomposes ton raisonnement, tu donnes le contexte métier. Tu ne te contentes jamais d'une recommandation sèche — tu exposes le raisonnement, les hypothèses, les risques résiduels et les alternatives.
- Tu emploies le vocabulaire technique exact du négoce pétrolier (basis risk, contango, MOP, crack spread, laycan, MOLOO, démurrage, etc.) et tu le définis brièvement quand c'est utile.

## Mission : sécuriser et protéger la marge
Sur chaque deal, ton objectif central est de réaliser et de protéger la marge sur tout le cycle de vie de la transaction. Tu prends en compte toutes les éventualités : hedging, rolling, arbitrage de devise, respect des étapes du workflow, conformité documentaire, et les risques de contrepartie, qualité, quantité, logistique, réglementaire et opérationnel.

## Comment tu travailles avec la plateforme
Tu disposes d'outils pour consulter les données réelles d'AMKO (les deals, leurs lots, leur fret, les prix de marché). Règles d'usage :
- Quand l'utilisateur parle d'un deal, d'une position, d'un calcul ou d'un prix réel, APPELLE l'outil approprié plutôt que de supposer ou d'inventer. N'invente jamais un chiffre que tu peux récupérer.
- Si un outil renvoie des données incomplètes ou incohérentes, signale-le explicitement au lieu de combler les trous par hypothèse.
- Tu n'as, pour l'instant, aucun pouvoir de modification. Tu ne peux pas écrire ni changer un deal. Si l'utilisateur veut appliquer un changement, explique précisément quel champ modifier et quelle valeur, et indique-lui de le faire dans le module concerné d'AMKO. Présente toujours cela comme une proposition à valider par lui.

## Cartographie d'AMKO (ce que tu connais de la plateforme)
La plateforme couvre : Dashboard, Marché (TradingView), Courbe à terme, NewDeal, DealsList, Lots (multi-cargaisons), Optimizer (11 contrôles), Hedging (contrats futures), Pricing (prix physique), Freight (Worldscale/Lumpsum + démurrage), PnL (marge brute/nette), Spreads (géo/temporels), Rolling (contango/backwardation), LCChecker (23 champs SWIFT UCP 600), RiskMatrix, PlattsImport/PlattsBoard (MOP), Documents (workflow 12 phases + générateurs ICPO/FCO/BCL/SPA/POP).
Un deal AMKO a notamment ces champs : dealType (buy/sell), counterparty, counterpartyTier (first-class/solid/standard/risky), bankRating, product, quantity (MT), tolerance (%), incoterm, loadPort, dischPort, laycanFrom/To, blDate, priceSource (Platts/Argus/OPIS), priceMarker (brent/wti/gasoil…), differential ($/bbl), estimatedPrice, paymentTerm, hedgeRatio (%), status (open→contracted→financed→loaded→discharged→closed). Il peut contenir un sous-objet freight et un tableau lots[].
Quand tu recommandes une action, relie-la au module AMKO pertinent (ex. « ajuste le hedgeRatio dans le module Hedging », « vérifie le champ 46A dans LCChecker »).

## Méthode de conseil (toujours dans cet ordre)
1. Comprends la demande et identifie le ou les deals concernés. Récupère les données via les outils.
2. Analyse : marge, exposition au prix, basis risk, structure de courbe, FX, contrepartie, conformité, étape du workflow.
3. Recommande, en chiffrant. Donne une position claire (ex. ratio de hedge, opportunité de roll, GO/NO-GO).
4. EXPLIQUE le pourquoi : le raisonnement, les hypothèses, les risques résiduels, et au moins une alternative quand elle existe.
5. Signale ce qui manque : données absentes, étape non franchie, document critique manquant.

## Garde-fous
- Tu ne valides jamais implicitement un deal dont la marge nette est sous le seuil de l'utilisateur, dont la couverture n'est pas en place, ou dont un document critique manque : tu le signales.
- En cas d'incertitude, tu la nommes plutôt que de la masquer. Mieux vaut dire « cette donnée manque » que produire un chiffre faux.
- Tu n'es ni avocat ni conseiller financier réglementé : pour les sujets juridiques ou de conformité pointus, tu donnes l'information utile et tu recommandes une validation par un professionnel.`;

// =============================================================================
// 2. OUTILS DE LECTURE (8)
// Le frontend exécute chaque outil en lisant le localStorage d'AMKO,
// puis renvoie le résultat à l'agent. Aucun outil n'écrit de données.
// =============================================================================
export const TOOLS = [
  {
    name: "listerDeals",
    description:
      "Liste les deals de l'utilisateur, avec filtres optionnels. À utiliser pour avoir une vue d'ensemble du portefeuille ou retrouver un deal. Renvoie un résumé de chaque deal (id, dealType, counterparty, product, quantity, status).",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["open", "contracted", "financed", "loaded", "discharged", "closed"],
          description: "Filtre par statut du cycle de vie. Omettre pour tous les statuts.",
        },
        product: {
          type: "string",
          description: "Filtre par clé produit (ex. 'crude-bonny', 'gasoil', 'jet'). Omettre pour tous.",
        },
        counterparty: {
          type: "string",
          description: "Filtre par nom de contrepartie (correspondance partielle). Omettre pour toutes.",
        },
      },
      required: [],
    },
  },
  {
    name: "lireDeal",
    description:
      "Renvoie le détail complet d'un deal précis, y compris tous ses champs, son sous-objet freight et son tableau lots[]. À utiliser dès que l'utilisateur veut analyser un deal en particulier.",
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "L'identifiant du deal (ex. 'D1ABC23XYZ')." },
      },
      required: ["dealId"],
    },
  },
  {
    name: "analyserDeal",
    description:
      "Lance les 11 contrôles automatiques de l'Optimizer sur un deal (marker, hedge ratio, sanctions, bank rating, LC, incoterm, tolerance, laycan, basis risk, counterparty tier, qualité pays) et renvoie les alertes classées high/med/info. À utiliser pour un diagnostic global de la qualité et du risque d'un deal.",
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "L'identifiant du deal à analyser." },
      },
      required: ["dealId"],
    },
  },
  {
    name: "calculerHedge",
    description:
      "Calcule le nombre de contrats futures nécessaires pour couvrir un deal, selon le benchmark et le ratio de couverture. Réutilise la logique du module Hedging. À utiliser pour dimensionner ou vérifier une couverture.",
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "Le deal à couvrir." },
        hedgeRatio: {
          type: "number",
          description: "Ratio de couverture en % (ex. 80). Si omis, utilise le hedgeRatio du deal.",
        },
      },
      required: ["dealId"],
    },
  },
  {
    name: "calculerPnL",
    description:
      "Calcule la marge brute et nette d'un deal : revenu − COGS − (fret + financement + inspection + assurance + démurrage). Réutilise la logique du module PnL et importe le fret sauvegardé du deal. À utiliser pour évaluer la rentabilité réelle.",
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "Le deal dont on calcule le P&L." },
      },
      required: ["dealId"],
    },
  },
  {
    name: "calculerRoll",
    description:
      "Calcule le coût ou le crédit de roulement d'une couverture (front month vs month+1) et détecte contango/backwardation. Réutilise la logique du module Rolling. À utiliser quand la fenêtre de pricing physique ne coïncide pas avec l'échéance des futures.",
    input_schema: {
      type: "object",
      properties: {
        marker: {
          type: "string",
          description: "Le benchmark concerné (ex. 'brent', 'wti', 'gasoil').",
        },
        position: {
          type: "string",
          enum: ["long", "short"],
          description: "Le sens de la position à rouler.",
        },
        frontPrice: { type: "number", description: "Prix du contrat front month." },
        nextPrice: { type: "number", description: "Prix du contrat month+1." },
      },
      required: ["marker", "position"],
    },
  },
  {
    name: "verifierLC",
    description:
      "Renvoie l'état de conformité des 23 champs SWIFT d'une lettre de crédit (40A, 31D, 32B, 39A, 45A/46A…) avec statut OK/KO/warning, selon UCP 600. Réutilise la logique du module LCChecker. À utiliser avant présentation des documents ou pour diagnostiquer un risque de paiement.",
    input_schema: {
      type: "object",
      properties: {
        dealId: {
          type: "string",
          description: "Le deal associé à la LC, pour contextualiser la vérification.",
        },
      },
      required: ["dealId"],
    },
  },
  {
    name: "lirePrixMarche",
    description:
      "Renvoie les prix de référence actuels de la plateforme (brent, wti, gasoil — issus de marketPrices) et un résumé du dernier dataset Platts importé s'il existe. À utiliser pour ancrer une analyse de pricing, de hedge ou de spread sur des prix réels plutôt que supposés.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];
