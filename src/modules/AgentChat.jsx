import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Trash2, Loader2, Wrench, AlertCircle } from 'lucide-react';
import { SYSTEM_PROMPT, TOOLS } from '../agentConfig.js';
import { PRODUCTS, CONTRACTS, SANCTIONED_COUNTRIES } from '../constants.js';
import { daysBetween } from '../utils.js';

// =============================================================================
// RENDU MARKDOWN LÉGER (pas de dépendance externe)
// =============================================================================
function inline(text) {
  const parts = [];
  // Matches **bold**, `code`, *italic* in order
  const re = /\*\*([^*\n]+)\*\*|`([^`\n]+)`|\*([^*\n]+)\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<strong key={m.index}>{m[1]}</strong>);
    else if (m[2] !== undefined) parts.push(
      <code key={m.index} className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs font-mono">{m[2]}</code>
    );
    else if (m[3] !== undefined) parts.push(<em key={m.index}>{m[3]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

function MD({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const nodes = [];
  let listBuf = [];

  const flushList = () => {
    if (!listBuf.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="my-1 space-y-0.5">
        {listBuf.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-slate-400 flex-shrink-0 select-none">•</span>
            <span>{inline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  lines.forEach((line, i) => {
    if (/^###\s/.test(line)) {
      flushList();
      nodes.push(<h4 key={i} className="font-bold text-sm mt-3 mb-0.5">{inline(line.slice(4))}</h4>);
    } else if (/^##\s/.test(line)) {
      flushList();
      nodes.push(<h3 key={i} className="font-semibold text-base mt-3 mb-1">{inline(line.slice(3))}</h3>);
    } else if (/^#\s/.test(line)) {
      flushList();
      nodes.push(<h2 key={i} className="font-bold text-lg mt-3 mb-1">{inline(line.slice(2))}</h2>);
    } else if (/^[-*•]\s/.test(line)) {
      listBuf.push(line.replace(/^[-*•]\s/, ''));
    } else if (/^\d+\.\s/.test(line)) {
      // Numbered items: treat as list for simplicity
      listBuf.push(line.replace(/^\d+\.\s/, ''));
    } else if (/^---+$/.test(line.trim())) {
      flushList();
      nodes.push(<hr key={i} className="border-slate-200 dark:border-slate-600 my-2" />);
    } else if (line.trim() === '') {
      flushList();
      nodes.push(<div key={i} className="h-1.5" />);
    } else {
      flushList();
      nodes.push(<p key={i} className="leading-relaxed">{inline(line)}</p>);
    }
  });
  flushList();
  return <div className="text-sm space-y-0">{nodes}</div>;
}

// =============================================================================
// EXÉCUTION DES OUTILS — lecture uniquement, jamais d'écriture
// =============================================================================

// Réplique exacte de la logique Optimizer.jsx
function runOptimizerAnalysis(deal) {
  const issues = [];
  const product = PRODUCTS[deal.product];
  const productMarker = product?.marker;

  if (productMarker && deal.priceMarker && deal.priceMarker !== productMarker) {
    issues.push({
      level: 'high', area: 'Pricing',
      title: 'Marker incohérent avec le produit',
      detail: `${product.name} devrait être indexé sur ${productMarker.toUpperCase()}, mais ${deal.priceMarker.toUpperCase()} est utilisé. Basis risk potentiel.`,
      action: `Indexez sur ${productMarker.toUpperCase()} ou hedgez via swap.`,
    });
  }

  const hr = Number(deal.hedgeRatio) || 0;
  if (hr < 80) {
    issues.push({
      level: hr < 50 ? 'high' : 'med', area: 'Hedging',
      title: `Hedge ratio bas (${hr}%)`,
      detail: "Exposition directionnelle non couverte. Risque flat price significatif.",
      action: "Visez 90-100% de couverture sauf décision stratégique consciente.",
    });
  } else if (hr === 100) {
    issues.push({
      level: 'info', area: 'Hedging',
      title: 'Hedge complet en place',
      detail: 'Seul le différentiel (basis) génère du P&L.',
    });
  }

  const country = (deal.counterpartyCountry || '').toLowerCase();
  if (SANCTIONED_COUNTRIES.some(s => country.includes(s))) {
    issues.push({
      level: 'high', area: 'Sanctions',
      title: 'Pays potentiellement sous sanctions',
      detail: `${deal.counterpartyCountry} — risque OFAC/UE/UK majeur.`,
      action: 'Filtrer OFAC SDN, UE, HM Treasury. Vérifier le navire (Equasis). Consulter compliance.',
    });
  }

  if (deal.incoterm === 'CIF' && deal.paymentTerm === 'Open credit') {
    issues.push({
      level: 'med', area: 'Risque crédit',
      title: 'CIF + Open credit = double risque',
      detail: 'Vous portez le risque transport ET le risque de non-paiement.',
      action: 'Exigez une LC ou SBLC, ou souscrivez une assurance-crédit.',
    });
  }
  if (deal.paymentTerm === 'Open credit' && deal.counterpartyTier !== 'first-class') {
    issues.push({
      level: 'high', area: 'Risque crédit',
      title: 'Open credit avec contrepartie non first-class',
      detail: "L'open credit n'est acceptable qu'avec des Majors / raffineries de premier rang.",
      action: 'Demander une PCG, LC, ou silent cover.',
    });
  }

  if ((deal.paymentTerm || '').includes('LC') && ['BB', 'lower'].includes(deal.bankRating)) {
    issues.push({
      level: 'high', area: 'Risque bancaire',
      title: `Banque émettrice à risque (${deal.bankRating})`,
      detail: 'Le risque banque peut être pire que celui de la contrepartie.',
      action: 'Faire confirmer la LC par une banque de premier rang.',
    });
  }

  const laycanDuration = daysBetween(deal.laycanFrom, deal.laycanTo);
  if (laycanDuration > 7) {
    issues.push({
      level: 'med', area: 'Logistique',
      title: `Laycan large (${laycanDuration} jours)`,
      detail: 'Incertitude opérationnelle accrue.',
      action: 'Resserrer à 3–5 jours quand possible.',
    });
  }
  if (laycanDuration < 0) {
    issues.push({
      level: 'high', area: 'Logistique',
      title: 'Laycan invalide (fin < début)',
      action: 'Corriger les dates de laycan.',
    });
  }

  const diff = Number(deal.differential);
  if (deal.differential === '' || isNaN(diff)) {
    issues.push({
      level: 'med', area: 'Pricing',
      title: 'Différentiel non renseigné',
      action: 'Renseigner la prime/décote en $/bbl.',
    });
  } else if (Math.abs(diff) > 10) {
    issues.push({
      level: 'med', area: 'Pricing',
      title: `Différentiel inhabituel (${diff > 0 ? '+' : ''}${diff} $/bbl)`,
      action: 'Comparer à un assessment Platts/Argus récent.',
    });
  }

  if (!deal.vessel) {
    issues.push({
      level: 'low', area: 'Logistique',
      title: 'Type de navire non spécifié',
      action: 'Préciser la classe de navire envisagée.',
    });
  }

  if (Number(deal.tolerance) > 10) {
    issues.push({
      level: 'low', area: 'Quantité',
      title: 'Tolérance > 10%',
      action: 'Limiter à ±5% si le marché le permet.',
    });
  }

  const high = issues.filter(i => i.level === 'high').length;
  const med  = issues.filter(i => i.level === 'med').length;
  const low  = issues.filter(i => i.level === 'low').length;

  return {
    dealId: deal.id,
    counterparty: deal.counterparty,
    product: product?.name || deal.product,
    status: deal.status,
    issues,
    summary: { high, med, low, info: issues.filter(i => i.level === 'info').length },
    healthScore: Math.max(0, 100 - high * 25 - med * 10 - low * 3),
    verdict: high > 0
      ? '⚠ Alertes critiques — à traiter avant de continuer'
      : med > 0 ? 'Deal acceptable avec réserves'
      : 'Deal bien structuré ✓',
  };
}

function makeExecutor(deals, marketPrices, plattsDataset) {
  return function execute(name, input) {
    switch (name) {

      case 'listerDeals': {
        let r = [...deals];
        if (input.status)       r = r.filter(d => d.status === input.status);
        if (input.product)      r = r.filter(d => d.product === input.product);
        if (input.counterparty) r = r.filter(d =>
          d.counterparty.toLowerCase().includes(input.counterparty.toLowerCase())
        );
        if (!r.length) return { result: 'Aucun deal correspondant aux filtres.' };
        return r.map(d => ({
          id: d.id, dealType: d.dealType, counterparty: d.counterparty,
          product: d.product, productName: PRODUCTS[d.product]?.name,
          quantity_MT: d.quantity, status: d.status, createdAt: d.createdAt,
          estimatedPrice: d.estimatedPrice || null,
          purchasePrice: d.purchasePrice || null,
          salePrice: d.salePrice || null,
          hasFreight: !!d.freight,
          lotsCount: d.lots?.length || 0,
        }));
      }

      case 'lireDeal': {
        const d = deals.find(x => x.id === input.dealId);
        if (!d) return { error: `Deal "${input.dealId}" introuvable.` };
        return { ...d, productName: PRODUCTS[d.product]?.name };
      }

      case 'analyserDeal': {
        const d = deals.find(x => x.id === input.dealId);
        if (!d) return { error: `Deal "${input.dealId}" introuvable.` };
        return runOptimizerAnalysis(d);
      }

      case 'calculerHedge': {
        const d = deals.find(x => x.id === input.dealId);
        if (!d) return { error: `Deal "${input.dealId}" introuvable.` };
        const product   = PRODUCTS[d.product];
        const bblPerMT  = product?.bblPerMT || 7.5;
        const totalBbl  = Number(d.quantity) * bblPerMT;
        const ratio     = input.hedgeRatio ?? Number(d.hedgeRatio) ?? 100;
        const hedgeBbl  = totalBbl * ratio / 100;
        const match     = Object.entries(CONTRACTS)
          .find(([, c]) => c.marker === product?.marker && c.size >= 500);
        const contractSize = match?.[1]?.size || 1000;
        const nbContracts  = Math.round(hedgeBbl / contractSize);
        const notional     = hedgeBbl * (Number(d.estimatedPrice) || 0);
        return {
          dealId: d.id, product: product?.name,
          quantity_MT: d.quantity, bblPerMT,
          totalBbl: Math.round(totalBbl),
          hedgeRatio: ratio,
          hedgeBbl: Math.round(hedgeBbl),
          contract: match?.[1]?.name || 'À déterminer (marker non mappé)',
          contractSize,
          nbContracts,
          direction: d.dealType === 'buy' ? 'SHORT (couverture achat physique)' : 'LONG (couverture vente physique)',
          notionalUSD: Math.round(notional),
          note: notional === 0 ? 'estimatedPrice absent — notionnel non calculé.' : null,
        };
      }

      case 'calculerPnL': {
        const d = deals.find(x => x.id === input.dealId);
        if (!d) return { error: `Deal "${input.dealId}" introuvable.` };
        const product  = PRODUCTS[d.product];
        const bblPerMT = product?.bblPerMT || 7.5;
        const totalBbl = Number(d.quantity) * bblPerMT;
        const price    = (Number(d.estimatedPrice) || 0) + (Number(d.differential) || 0);
        const notional = totalBbl * price;
        const freight  = d.freight;
        const buyMT    = Number(d.purchasePrice) || 0;
        const sellMT   = Number(d.salePrice) || 0;
        const freightUSD = Number(freight?.totalFreight) || 0;
        const grossMarginPerMT = buyMT && sellMT ? sellMT - buyMT : null;
        const netMarginUSD = buyMT && sellMT
          ? (sellMT - buyMT) * Number(d.quantity || 0) - freightUSD
          : null;
        return {
          dealId: d.id, dealType: d.dealType,
          product: product?.name, quantity_MT: d.quantity,
          totalBbl: Math.round(totalBbl),
          estimatedPrice: d.estimatedPrice || 'Non renseigné',
          purchasePrice_MT: buyMT || 'Non renseigné',
          salePrice_MT: sellMT || 'Non renseigné',
          grossMarginPerMT_USD: grossMarginPerMT != null ? grossMarginPerMT.toFixed(2) : 'Requiert prix achat ET vente',
          netMarginAfterFreight_USD: netMarginUSD != null ? Math.round(netMarginUSD) : 'Requiert prix achat ET vente',
          differential: d.differential || 0,
          effectivePrice_bbl: price || 'Non calculable',
          notionalUSD: price ? Math.round(notional) : 'Non calculable',
          freight: freight
            ? { total_USD: Math.round(freight.totalFreight || 0), perMT_USD: Number(freight.freightPerMT || 0).toFixed(2), mode: freight.mode }
            : 'Non sauvegardé — utilisez le module Freight puis enregistrez dans le deal.',
          lots: d.lots?.length
            ? { count: d.lots.length, priced: d.lots.filter(l => l.status !== 'pending').length }
            : 'Aucun lot défini.',
          note: (buyMT && sellMT)
            ? 'Marge brute = prix vente − prix achat. Marge nette = marge brute × quantité − fret. Coûts financing/inspection/assurance non inclus ici (module PnL pour la marge nette complète).'
            : 'Renseignez le prix achat ET le prix vente du deal pour obtenir la marge. Coûts détaillés dans le module PnL.',
        };
      }

      case 'calculerRoll': {
        const front = Number(input.frontPrice);
        const next  = Number(input.nextPrice);
        if (!input.frontPrice || !input.nextPrice || isNaN(front) || isNaN(next)) {
          return {
            error: 'frontPrice et nextPrice sont requis pour calculer le roulement.',
            hint: 'Lisez les prix dans le module Platts Board → Snapshot ou entrez-les manuellement.',
          };
        }
        const spread    = next - front;
        const structure = Math.abs(spread) < 0.005 ? 'flat' : spread > 0 ? 'contango' : 'backwardation';
        const isLong    = input.position === 'long';
        const rollPnL   = isLong ? -spread : spread;
        return {
          marker: input.marker, position: input.position,
          frontPrice: front, nextPrice: next,
          spread_bbl: Number(spread.toFixed(3)),
          structure,
          rollPnL_bbl: Number(rollPnL.toFixed(3)),
          type: rollPnL >= 0 ? 'crédit de roulement' : 'coût de roulement',
          interpretation: isLong
            ? (spread > 0
                ? `Position LONG en CONTANGO : rouler coûte ${Math.abs(spread).toFixed(3)} $/bbl (rachat du mois suivant plus cher).`
                : `Position LONG en BACKWARDATION : rouler génère ${Math.abs(spread).toFixed(3)} $/bbl de crédit.`)
            : (spread > 0
                ? `Position SHORT en CONTANGO : rouler génère ${Math.abs(spread).toFixed(3)} $/bbl de crédit.`
                : `Position SHORT en BACKWARDATION : rouler coûte ${Math.abs(spread).toFixed(3)} $/bbl.`),
        };
      }

      case 'verifierLC': {
        const d = deals.find(x => x.id === input.dealId);
        if (!d) return { error: `Deal "${input.dealId}" introuvable.` };
        const product  = PRODUCTS[d.product];
        const bblPerMT = product?.bblPerMT || 7.5;
        const notional = Number(d.quantity) * bblPerMT * (Number(d.estimatedPrice) || 0);
        return {
          dealContext: {
            id: d.id, counterparty: d.counterparty,
            paymentTerm: d.paymentTerm, bankRating: d.bankRating,
            product: product?.name, quantity_MT: d.quantity, tolerance: d.tolerance,
            loadPort: d.loadPort, dischargePort: d.dischargePort,
          },
          criticalFieldsToVerify: [
            { code: '40A', name: 'Form of Credit',        required: 'IRREVOCABLE' },
            { code: '40E', name: 'Applicable Rules',       required: 'UCP 600' },
            { code: '31D', name: 'Date & Place of Expiry', alert: 'Couvre le délai de présentation docs (21 j après B/L)' },
            { code: '32B', name: 'Amount',                 expected: notional ? `~$${Math.round(notional).toLocaleString('fr-FR')}` : 'Non calculable (prix absent)', alert: `${d.quantity} MT × ${bblPerMT} bbl/MT × ${d.estimatedPrice} $/bbl` },
            { code: '39A', name: 'Tolerance %',            required: `±${d.tolerance}%`, alert: 'Doit correspondre exactement à la tolérance contractuelle' },
            { code: '44E', name: 'Port of Loading',        required: d.loadPort || 'Non renseigné' },
            { code: '44F', name: 'Port of Discharge',      required: d.dischargePort || 'Non renseigné', alert: 'Vérifier restrictions embargo' },
            { code: '45A', name: 'Description of Goods',   required: product?.name || d.product },
            { code: '46A', name: 'Documents Required',     alert: 'Doit inclure : B/L, COQ, COO, CIQ, Certificate of Insurance' },
            { code: '49',  name: 'Confirmation',            recommendation: ['BB', 'lower'].includes(d.bankRating) ? 'CONFIRM — bank rating dégradé' : 'MAY ADD' },
          ],
          note: 'Utilisez le module LCChecker pour valider chaque champ ligne par ligne avec les valeurs réelles de la LC.',
        };
      }

      case 'lirePrixMarche': {
        const has = Object.values(marketPrices).some(v => v);
        let platts = null;
        if (plattsDataset?.prices) {
          const dates = Object.keys(plattsDataset.prices).sort();
          const last  = dates[dates.length - 1];
          const snap  = plattsDataset.prices[last] || {};
          platts = {
            source: plattsDataset.source || 'Import Platts',
            latestDate: last,
            prices: Object.fromEntries(
              Object.entries(snap)
                .filter(([, v]) => v != null)
                .map(([k, v]) => [k, Number(v).toFixed(3)])
            ),
          };
        }
        return {
          marketPrices: {
            brent:  marketPrices.brent  || 'Non renseigné',
            wti:    marketPrices.wti    || 'Non renseigné',
            gasoil: marketPrices.gasoil || 'Non renseigné',
          },
          plattsDataset: platts || 'Aucun fichier Platts importé.',
          status: has
            ? 'Prix de référence disponibles (Dashboard AMKO).'
            : 'Aucun prix de référence — importez un fichier Platts ou saisissez dans le Dashboard.',
        };
      }

      default:
        return { error: `Outil inconnu : "${name}"` };
    }
  };
}

// =============================================================================
// BOUCLE AGENTIQUE
// =============================================================================
const MAX_TURNS = 12;

async function runAgentLoop(apiMessages, executor) {
  let msgs = [...apiMessages];
  const toolLog = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: SYSTEM_PROMPT, messages: msgs, tools: TOOLS }),
    });

    if (!res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('json')) {
        const e = await res.json();
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      throw new Error(
        res.status === 404
          ? 'Endpoint /api/chat introuvable. En développement local, utilisez `vercel dev` au lieu de `npm run dev`.'
          : `HTTP ${res.status}`
      );
    }

    const response = await res.json();
    const toolUseBlocks = (response.content || []).filter(b => b.type === 'tool_use');

    if (response.stop_reason !== 'tool_use' || !toolUseBlocks.length) {
      const text = (response.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      msgs = [...msgs, { role: 'assistant', content: response.content }];
      return { text, apiMessages: msgs, toolLog };
    }

    // Exécution des outils
    const toolResults = toolUseBlocks.map(tb => {
      const result = executor(tb.name, tb.input);
      toolLog.push({ name: tb.name, input: tb.input, result });
      return { type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) };
    });

    msgs = [
      ...msgs,
      { role: 'assistant', content: response.content },
      { role: 'user',      content: toolResults },
    ];
  }

  throw new Error(`Limite de ${MAX_TURNS} tours atteinte sans réponse finale.`);
}

// =============================================================================
// SUGGESTIONS INITIALES
// =============================================================================
const SUGGESTIONS = [
  "Analyse mon portefeuille et identifie les deals à risque critique.",
  "Calcule le hedge pour mon dernier deal ouvert.",
  "Explique-moi comment fonctionne le coût de roulement (rolling) en contango.",
  "Quels documents dois-je vérifier avant de présenter ma LC ?",
];

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================
export default function AgentChat({ deals, marketPrices, plattsDataset }) {
  // Messages affichés dans l'UI
  const [displayMsgs, setDisplayMsgs] = useState([]);
  // Messages pour l'API (historique complet)
  const [apiMessages,  setApiMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const bottomRef  = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMsgs, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px';
  }, [input]);

  const executor = makeExecutor(deals, marketPrices, plattsDataset);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setError(null);

    const userDisplay = { id: Date.now(), role: 'user', text: msg };
    setDisplayMsgs(prev => [...prev, userDisplay]);

    const newApiMsgs = [...apiMessages, { role: 'user', content: msg }];
    setApiMessages(newApiMsgs);
    setLoading(true);

    try {
      const { text: answer, apiMessages: updatedMsgs, toolLog } = await runAgentLoop(newApiMsgs, executor);
      setApiMessages(updatedMsgs);
      setDisplayMsgs(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: answer, toolLog },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    if (!window.confirm('Effacer la conversation ?')) return;
    setDisplayMsgs([]);
    setApiMessages([]);
    setError(null);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>

      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Agent conseiller
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Trader physique senior · Lecture seule · {deals.length} deal(s) en mémoire
          </p>
        </div>
        {displayMsgs.length > 0 && (
          <button onClick={clear}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition mt-1">
            <Trash2 className="w-3.5 h-3.5" />Effacer
          </button>
        )}
      </div>

      {/* ── Zone de chat ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-2">

        {/* État vide — intro + suggestions */}
        {displayMsgs.length === 0 && !loading && (
          <div className="space-y-4">
            <div className="flex gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-semibold text-base">Bonjour. Je suis votre conseiller de trading pétrolier.</p>
                <p className="mt-1 text-blue-800 dark:text-blue-300">
                  J'analyse vos deals, calcule vos couvertures, évalue vos marges et vous accompagne
                  sur tout le cycle de vie d'une transaction physique. Je consulte vos données AMKO
                  en temps réel, mais je ne les modifie jamais.
                </p>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wide">
              Suggestions
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="text-left text-sm p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-slate-700 dark:text-slate-300">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {displayMsgs.map(msg => (
          <div key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[82%]`}>
              {/* Outils utilisés */}
              {msg.toolLog?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.toolLog.map((tc, i) => (
                    <span key={i}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-600">
                      <Wrench className="w-3 h-3" />{tc.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Bulle */}
              <div className={`px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm text-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
              }`}>
                {msg.role === 'user'
                  ? <span className="whitespace-pre-wrap">{msg.text}</span>
                  : <MD text={msg.text} />
                }
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-500 dark:bg-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Indicateur de chargement */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-slate-500 dark:text-slate-400">Analyse en cours…</span>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erreur</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Zone de saisie ───────────────────────────────────────── */}
      <div className="flex-shrink-0 mt-3 space-y-1.5">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            placeholder="Posez une question sur vos deals, marges, couvertures…"
            className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50 leading-snug"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-center text-slate-400 dark:text-slate-500">
          ↵ Entrée pour envoyer · Shift+↵ pour un saut de ligne
        </p>
      </div>
    </div>
  );
}
