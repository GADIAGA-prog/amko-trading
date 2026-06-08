// src/modules/Advisor.jsx
// -----------------------------------------------------------------------------
// Agent conseiller de trading physique pétrolier, intégré à AMKO.
// - Interface chat
// - Boucle d'outils (tool use) : l'agent demande un outil -> le frontend
//   l'exécute en lisant le localStorage et en appelant les fonctions pures
//   de src/calc/ -> renvoie le résultat -> l'agent poursuit ou conclut.
// - 8 outils de LECTURE uniquement. Aucune écriture sur les deals.
//
// Dépendances :
//   ../agentConfig        -> SYSTEM_PROMPT, TOOLS
//   ../calc/optimizerCalc -> analyzeDeal
//   ../calc/pnlCalc       -> computePnL
//   ../calc/hedgeCalc     -> computeHedge
//   ../calc/rollCalc      -> computeRoll
//   ../constants          -> PRODUCTS, CONTRACTS
//   ../components/UI      -> Card, Button (primitives existantes)
// -----------------------------------------------------------------------------

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Wrench } from 'lucide-react';
import { SYSTEM_PROMPT, TOOLS } from '../agentConfig.js';
import { analyzeDeal }  from '../calc/optimizerCalc.js';
import { computePnL }   from '../calc/pnlCalc.js';
import { computeHedge } from '../calc/hedgeCalc.js';
import { computeRoll }  from '../calc/rollCalc.js';
import { PRODUCTS, CONTRACTS } from '../constants.js';
import { Card, Button } from '../components/UI.jsx';

// =============================================================================
// LECTURE DES DEALS DEPUIS LE LOCALSTORAGE
// Les deals sont isolés par utilisateur sous la clé deals_user_<id>.
// On reçoit currentUser en prop pour cibler le bon trousseau.
// =============================================================================
function loadDeals(userId) {
  try {
    const raw = localStorage.getItem(`deals_user_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function findDeal(userId, dealId) {
  return loadDeals(userId).find((d) => d.id === dealId) || null;
}

// =============================================================================
// EXÉCUTEURS D'OUTILS
// Chaque clé correspond à un outil de agentConfig.TOOLS.
// Reçoit (input, ctx) où ctx = { userId, marketPrices }.
// Retourne un objet sérialisable, renvoyé tel quel à l'agent.
// Les exécuteurs NE MODIFIENT JAMAIS de données.
// =============================================================================
function makeToolExecutors(ctx) {
  const { userId, marketPrices } = ctx;

  return {
    // ── listerDeals ──────────────────────────────────────────────────────────
    listerDeals: ({ status, product, counterparty }) => {
      let deals = loadDeals(userId);
      if (status)       deals = deals.filter((d) => d.status === status);
      if (product)      deals = deals.filter((d) => d.product === product);
      if (counterparty) deals = deals.filter((d) =>
        (d.counterparty || '').toLowerCase().includes(counterparty.toLowerCase())
      );
      return {
        count: deals.length,
        deals: deals.map((d) => ({
          id:           d.id,
          dealType:     d.dealType,
          counterparty: d.counterparty,
          product:      d.product,
          quantity:     d.quantity,
          status:       d.status,
        })),
      };
    },

    // ── lireDeal ─────────────────────────────────────────────────────────────
    lireDeal: ({ dealId }) => {
      const deal = findDeal(userId, dealId);
      if (!deal) return { error: `Aucun deal trouvé avec l'id ${dealId}.` };
      return { deal };
    },

    // ── analyserDeal (réutilise analyzeDeal — source de vérité Optimizer) ────
    analyserDeal: ({ dealId }) => {
      const deal = findDeal(userId, dealId);
      if (!deal) return { error: `Aucun deal trouvé avec l'id ${dealId}.` };
      const alerts = analyzeDeal(deal);
      return {
        dealId,
        alertCount: alerts.length,
        byLevel: {
          high: alerts.filter((a) => a.level === 'high').length,
          med:  alerts.filter((a) => a.level === 'med').length,
          info: alerts.filter((a) => a.level === 'info').length,
        },
        alerts,
      };
    },

    // ── calculerHedge (réutilise computeHedge — source de vérité Hedging) ────
    calculerHedge: ({ dealId, hedgeRatio }) => {
      const deal = findDeal(userId, dealId);
      if (!deal) return { error: `Aucun deal trouvé avec l'id ${dealId}.` };
      const product = PRODUCTS[deal.product];
      if (!product) return { error: `Produit inconnu : ${deal.product}.` };
      // Choix du contrat : on prend le premier dont le marker correspond
      // au marker du produit ; le basis risk est signalé si aucun n'est parfait.
      const contractKey =
        Object.keys(CONTRACTS).find((k) => CONTRACTS[k].marker === product.marker)
        || Object.keys(CONTRACTS)[0];
      const ratio = hedgeRatio != null ? hedgeRatio : deal.hedgeRatio;
      const result = computeHedge({
        productKey:  deal.product,
        quantity:    deal.quantity,
        hedgeRatio:  ratio,
        contractKey,
      });
      return { dealId, hedgeRatio: ratio, contractKey, ...result };
    },

    // ── calculerPnL (réutilise computePnL — source de vérité PnL) ────────────
    calculerPnL: ({ dealId }) => {
      const deal = findDeal(userId, dealId);
      if (!deal) return { error: `Aucun deal trouvé avec l'id ${dealId}.` };
      const product  = PRODUCTS[deal.product];
      const bblPerMT = product ? product.bblPerMT : null;
      if (bblPerMT == null)
        return { error: `Facteur bbl/MT introuvable pour ${deal.product}.` };

      // En lecture seule on dispose surtout de estimatedPrice.
      // On signale honnêtement les données manquantes plutôt que d'inventer.
      const freight  = deal.freight ? (deal.freight.totalFreight || 0) : 0;
      const demur    = deal.freight
        ? ((deal.freight.demHours || 0) * (deal.freight.demRate || 0))
        : 0;
      const missing  = [];
      if (deal.estimatedPrice == null) missing.push('estimatedPrice');
      if (!deal.quantity) missing.push('quantity');

      const result = computePnL({
        buyPrice:   deal.dealType === 'buy'  ? deal.estimatedPrice : null,
        sellPrice:  deal.dealType === 'sell' ? deal.estimatedPrice : null,
        quantity:   deal.quantity,
        bblPerMT,
        freight,
        financing:  0,
        inspection: 0,
        insurance:  0,
        demurrage:  demur,
        other:      0,
      });
      return {
        dealId,
        note: "P&L basé sur estimatedPrice et le fret sauvegardé. Les coûts financing/inspection/insurance ne sont pas stockés dans le deal et valent 0 ici : à compléter dans le module PnL pour une marge nette exacte.",
        missing,
        ...result,
      };
    },

    // ── calculerRoll (réutilise computeRoll — source de vérité Rolling) ──────
    calculerRoll: ({ marker, position, frontPrice, nextPrice }) => {
      if (frontPrice == null || nextPrice == null) {
        return {
          error: "frontPrice et nextPrice sont requis pour calculer le roll. Demande-les à l'utilisateur ou récupère-les via lirePrixMarche si disponibles.",
        };
      }
      const contractKey =
        Object.keys(CONTRACTS).find((k) => CONTRACTS[k].marker === marker)
        || Object.keys(CONTRACTS)[0];
      const result = computeRoll({
        position,
        frontPrice,
        nextPrice,
        nLots: 1,
        contractKey,
      });
      return { marker, position, contractKey, perLot: result };
    },

    // ── verifierLC (logique construite de zéro — LCChecker n'a rien à réutiliser)
    // On reconstruit une vérification en mappant les champs du deal aux codes
    // SWIFT clés. Chaque règle est commentée pour faciliter la validation métier.
    verifierLC: ({ dealId }) => {
      const deal = findDeal(userId, dealId);
      if (!deal) return { error: `Aucun deal trouvé avec l'id ${dealId}.` };

      const checks = [];
      const add = (code, label, status, detail) =>
        checks.push({ code, label, status, detail });

      // 31D — Date et lieu d'expiration.
      // La LC doit expirer APRÈS la fin du laycan plus le délai de présentation.
      if (deal.laycanTo)
        add('31D', "Date/lieu d'expiration", 'warning',
          `À vérifier : l'expiration de la LC doit être postérieure au laycan (fin ${deal.laycanTo}) plus le délai de présentation des documents.`);
      else
        add('31D', "Date/lieu d'expiration", 'ko',
          "laycanTo absent : impossible de vérifier la cohérence d'expiration.");

      // 32B — Montant et devise.
      if (deal.estimatedPrice != null && deal.quantity)
        add('32B', 'Montant / devise', 'ok',
          "Montant calculable depuis estimatedPrice × quantity ; vérifier que la devise de la LC correspond à la devise de facturation.");
      else
        add('32B', 'Montant / devise', 'ko',
          "Prix ou quantité manquant : montant de la LC non vérifiable.");

      // 39A — Tolérance (±%). Doit refléter la tolérance opérationnelle du deal.
      if (deal.tolerance != null)
        add('39A', 'Tolérance', 'ok',
          `Tolérance du deal : ±${deal.tolerance}%. Vérifier qu'elle est bien reportée dans la LC (champ 39A) pour éviter une discordance documentaire.`);
      else
        add('39A', 'Tolérance', 'warning',
          "Aucune tolérance définie sur le deal : risque de rejet si le volume chargé diffère.");

      // 44C — Date limite d'expédition vs laycan.
      if (deal.laycanFrom && deal.laycanTo)
        add('44C', "Date limite d'expédition", 'ok',
          `Laycan ${deal.laycanFrom} → ${deal.laycanTo}. La date limite d'expédition de la LC doit englober ce laycan.`);
      else
        add('44C', "Date limite d'expédition", 'ko',
          "Laycan incomplet : date d'expédition non vérifiable.");

      // 46A — Documents requis selon l'incoterm.
      if (deal.incoterm)
        add('46A', 'Documents requis', 'warning',
          `Incoterm ${deal.incoterm} : vérifier que les documents exigés par la LC (B/L, certificat d'origine, certificat qualité/quantité${deal.incoterm === 'CIF' ? ', assurance' : ''}) correspondent à cet incoterm.`);
      else
        add('46A', 'Documents requis', 'ko',
          "Incoterm absent : documents exigibles indéterminés.");

      // Cohérence mode de paiement / LC.
      if (deal.paymentTerm && /lc|credit/i.test(deal.paymentTerm))
        add('PAY', 'Terme de paiement', 'ok',
          `Terme : ${deal.paymentTerm}, cohérent avec une vérification de LC.`);
      else
        add('PAY', 'Terme de paiement', 'warning',
          `Terme de paiement « ${deal.paymentTerm || 'non défini'} » : ce deal n'est peut-être pas réglé par LC.`);

      // Rating banque émettrice.
      if (deal.bankRating && deal.bankRating !== 'lower')
        add('BANK', 'Banque émettrice', 'ok',
          `Rating banque : ${deal.bankRating}.`);
      else
        add('BANK', 'Banque émettrice', 'warning',
          `Rating banque « ${deal.bankRating || 'non défini'} » : risque de contrepartie bancaire à surveiller, envisager une confirmation par une banque de premier ordre.`);

      const summary = {
        ok:      checks.filter((c) => c.status === 'ok').length,
        warning: checks.filter((c) => c.status === 'warning').length,
        ko:      checks.filter((c) => c.status === 'ko').length,
      };
      return {
        dealId,
        summary,
        checks,
        disclaimer: "Vérification indicative reconstruite à partir des champs du deal. Elle ne remplace pas un contrôle UCP 600 complet sur le texte réel de la LC dans le module LCChecker.",
      };
    },

    // ── lirePrixMarche ───────────────────────────────────────────────────────
    lirePrixMarche: () => {
      let platts = null;
      try {
        const hist = localStorage.getItem('amko_platts_history');
        if (hist) {
          const arr = JSON.parse(hist);
          platts = arr && arr.length ? { lastImport: arr[0] } : null;
        }
      } catch {
        platts = null;
      }
      return {
        marketPrices: marketPrices || null,
        plattsLastImport: platts,
        note: marketPrices
          ? "Prix de référence de la plateforme (peuvent dater du dernier rafraîchissement)."
          : "Aucun prix de référence disponible dans l'état de l'application.",
      };
    },
  };
}

// =============================================================================
// APPEL AU RELAIS /api/chat
// =============================================================================
async function callAgent(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: SYSTEM_PROMPT, messages, tools: TOOLS }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${res.status} du serveur.`);
  }
  return res.json();
}

// =============================================================================
// COMPOSANT ADVISOR
// Props : currentUser (pour isoler les deals), marketPrices (état global App)
// =============================================================================
export default function Advisor({ currentUser, marketPrices }) {
  const userId   = currentUser?.id;
  const [history, setHistory] = useState([]); // messages API (user/assistant)
  const [view,    setView]    = useState([]); // messages affichés {role, text, tool?}
  const [input,   setInput]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [view, busy]);

  const executors = makeToolExecutors({ userId, marketPrices });

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput('');
    setBusy(true);

    const userMsg = { role: 'user', content: text };
    let convo = [...history, userMsg];
    setView((v) => [...v, { role: 'user', text }]);

    try {
      // BOUCLE D'OUTILS : on relance tant que l'agent demande des outils.
      // Garde-fou : 8 tours max pour éviter toute boucle infinie.
      let guard = 0;
      while (guard++ < 8) {
        const resp = await callAgent(convo);

        // Blocs texte éventuels
        const textBlocks = (resp.content || [])
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n');
        if (textBlocks)
          setView((v) => [...v, { role: 'assistant', text: textBlocks }]);

        // L'assistant rejoint l'historique avec son contenu complet (texte + tool_use)
        convo = [...convo, { role: 'assistant', content: resp.content }];

        const toolUses = (resp.content || []).filter((b) => b.type === 'tool_use');
        if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) break;

        // Exécuter chaque outil et préparer les tool_result
        const toolResults = [];
        for (const tu of toolUses) {
          setView((v) => [
            ...v,
            { role: 'tool', tool: tu.name, text: `Consultation : ${tu.name}` },
          ]);
          let out;
          try {
            const fn = executors[tu.name];
            out = fn ? fn(tu.input || {}) : { error: `Outil inconnu : ${tu.name}` };
          } catch (e) {
            out = { error: `Échec de l'outil ${tu.name} : ${e.message}` };
          }
          toolResults.push({
            type:        'tool_result',
            tool_use_id: tu.id,
            content:     JSON.stringify(out),
          });
        }
        convo = [...convo, { role: 'user', content: toolResults }];
      }
      setHistory(convo);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Conseiller AMKO</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Agent IA de trading physique — lecture seule, explique chaque raisonnement
        </p>
      </div>

      <Card>
        <div className="flex flex-col h-[70vh]">
          {/* En-tête */}
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
            <Bot className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">Conseiller AMKO</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              lecture seule · explique chaque choix · accès à tes deals
            </span>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
            {view.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pose une question sur un deal, une couverture, une marge, un roll,
                une LC… L'agent lit tes données et explique son raisonnement.
              </p>
            )}
            {view.map((m, i) => {
              if (m.role === 'tool')
                return (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 italic">
                    <Wrench className="w-3 h-3" /> {m.text}
                  </div>
                );
              const mine = m.role === 'user';
              return (
                <div key={i} className={`flex gap-2 ${mine ? 'justify-end' : ''}`}>
                  {!mine && <Bot className="w-4 h-4 mt-1 flex-shrink-0 text-blue-600 dark:text-blue-400" />}
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    mine
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  }`}>
                    {m.text}
                  </div>
                  {mine && <User className="w-4 h-4 mt-1 flex-shrink-0 text-slate-500 dark:text-slate-400" />}
                </div>
              );
            })}
            {busy && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> L'agent réfléchit…
              </div>
            )}
          </div>

          {/* Erreur */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 py-2 border-t border-slate-200 dark:border-slate-700">
              {error}
            </div>
          )}

          {/* Saisie */}
          <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <input
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Ex. : analyse le deal D1ABC et dis-moi si la couverture est suffisante"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={busy}
            />
            <Button onClick={send} disabled={busy || !input.trim()} icon={Send}>
              Envoyer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
