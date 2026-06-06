import React, { useMemo, useState } from 'react';
import { Bot, Send, Trash2, ClipboardCheck, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { DEAL_MANAGER_SYSTEM_PROMPT, DEAL_MANAGER_SUGGESTIONS } from '../dealManagerAgentConfig.js';
import { PRODUCTS } from '../constants.js';

function getDealPriority(deal) {
  const alerts = [];
  const status = deal.status || 'open';
  const hedgeRatio = Number(deal.hedgeRatio) || 0;
  const tolerance = Number(deal.tolerance) || 0;
  const hasFreight = !!deal.freight;
  const hasLots = Array.isArray(deal.lots) && deal.lots.length > 0;

  if (!deal.counterparty) alerts.push('Contrepartie non renseignée');
  if (!deal.quantity) alerts.push('Quantité non renseignée');
  if (!deal.estimatedPrice) alerts.push('Prix estimatif absent');
  if (!deal.paymentTerm) alerts.push('Terme de paiement absent');
  if (!deal.laycanFrom || !deal.laycanTo) alerts.push('Laycan incomplet');
  if (!hasFreight) alerts.push('Fret non sauvegardé');
  if (!hasLots && ['contracted', 'financed', 'loaded'].includes(status)) alerts.push('Lots/cargaisons non détaillés');
  if (hedgeRatio > 0 && hedgeRatio < 80) alerts.push(`Hedge ratio faible (${hedgeRatio}%)`);
  if (tolerance > 10) alerts.push(`Tolérance élevée (${tolerance}%)`);
  if (deal.paymentTerm === 'Open credit' && deal.counterpartyTier !== 'first-class') alerts.push('Open credit avec contrepartie non first-class');

  let level = 'Normal';
  if (alerts.length >= 5 || alerts.some(a => a.includes('Open credit') || a.includes('Prix'))) level = 'Critique';
  else if (alerts.length >= 3) level = 'Élevé';
  else if (alerts.length <= 1 && status !== 'open') level = 'Faible';

  return { level, alerts };
}

function buildPortfolioContext(deals, marketPrices, plattsDataset) {
  const enrichedDeals = deals.map((d) => {
    const product = PRODUCTS[d.product]?.name || d.product || 'Non renseigné';
    const priority = getDealPriority(d);
    return {
      id: d.id,
      status: d.status,
      dealType: d.dealType,
      counterparty: d.counterparty,
      counterpartyTier: d.counterpartyTier,
      bankRating: d.bankRating,
      product,
      quantityMT: d.quantity,
      tolerancePercent: d.tolerance,
      incoterm: d.incoterm,
      loadPort: d.loadPort,
      dischargePort: d.dischargePort || d.dischPort,
      laycanFrom: d.laycanFrom,
      laycanTo: d.laycanTo,
      priceSource: d.priceSource,
      priceMarker: d.priceMarker,
      differential: d.differential,
      estimatedPrice: d.estimatedPrice,
      paymentTerm: d.paymentTerm,
      hedgeRatio: d.hedgeRatio,
      hasFreight: !!d.freight,
      lotsCount: d.lots?.length || 0,
      priorityLevel: priority.level,
      alerts: priority.alerts,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    portfolio: {
      totalDeals: deals.length,
      openDeals: deals.filter(d => d.status === 'open').length,
      contractedDeals: deals.filter(d => d.status === 'contracted').length,
      financedDeals: deals.filter(d => d.status === 'financed').length,
      loadedDeals: deals.filter(d => d.status === 'loaded').length,
      closedDeals: deals.filter(d => d.status === 'closed').length,
    },
    marketPrices: {
      brent: marketPrices?.brent || null,
      wti: marketPrices?.wti || null,
      gasoil: marketPrices?.gasoil || null,
    },
    plattsDataset: plattsDataset
      ? { source: plattsDataset.source || 'Import Platts', hasPrices: !!plattsDataset.prices }
      : null,
    deals: enrichedDeals,
  };
}

function localFallbackAnswer(question, context) {
  const critical = context.deals.filter(d => d.priorityLevel === 'Critique');
  const high = context.deals.filter(d => d.priorityLevel === 'Élevé');
  const open = context.deals.filter(d => d.status === 'open');

  return `## Synthèse exécutive\n${context.portfolio.totalDeals} deal(s) dans le portefeuille, dont ${context.portfolio.openDeals} ouvert(s). ${critical.length} deal(s) critique(s) et ${high.length} deal(s) à priorité élevée.\n\n## Niveau de priorité\n${critical.length ? 'Critique' : high.length ? 'Élevé' : 'Normal'}\n\n## Risques majeurs\n${[...critical, ...high].slice(0, 5).map(d => `- ${d.id} — ${d.counterparty || 'Contrepartie non renseignée'} : ${d.alerts.join('; ') || 'Alerte non détaillée'}`).join('\n') || '- Aucun risque critique détecté avec les données disponibles.'}\n\n## Actions immédiates à mener\n- Compléter les champs manquants dans le module Deals.\n- Vérifier le pricing dans Pricing ou Platts Board.\n- Vérifier le hedge dans Hedging.\n- Sauvegarder le fret dans Freight.\n- Contrôler la LC dans LC Checker avant financement.\n\n## Données manquantes\n${open.length ? '- Certains deals ouverts peuvent nécessiter une contrepartie, un prix, un laycan, un terme de paiement, un fret ou une couverture.' : '- Aucune donnée manquante majeure détectée dans les deals ouverts.'}\n\n## Recommandation finale\n${critical.length ? 'NO-GO temporaire sur les deals critiques jusqu’à correction des alertes.' : high.length ? 'GO sous conditions après correction des alertes prioritaires.' : 'GO opérationnel sous réserve de validation documentaire.'}\n\n> Analyse locale générée sans appel IA externe. Question reçue : ${question}`;
}

function Message({ role, text }) {
  return (
    <div className={`rounded-xl border p-4 ${role === 'user' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
        {role === 'user' ? 'Vous' : 'AMKO Deal Manager'}
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">{text}</div>
    </div>
  );
}

export default function DealManagerAgent({ deals, marketPrices, plattsDataset }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Bonjour. Je suis AMKO Deal Manager Agent. Je peux prioriser vos deals, détecter les blocages opérationnels, préparer vos checklists et formuler des recommandations GO / NO-GO.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const context = useMemo(() => buildPortfolioContext(deals, marketPrices, plattsDataset), [deals, marketPrices, plattsDataset]);

  const ask = async (rawText) => {
    const question = (rawText ?? input).trim();
    if (!question || loading) return;

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: DEAL_MANAGER_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Contexte AMKO au format JSON:\n${JSON.stringify(context, null, 2)}\n\nDemande utilisateur:\n${question}`,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error(`API indisponible ou mal configurée : HTTP ${res.status}`);
      const data = await res.json();
      const answer = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('') || localFallbackAnswer(question, context);
      setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      const fallback = localFallbackAnswer(question, context);
      setError(`${err.message}. Une analyse locale a été générée.`);
      setMessages(prev => [...prev, { role: 'assistant', text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setMessages([
      {
        role: 'assistant',
        text: "Conversation réinitialisée. Je peux reprendre l’analyse opérationnelle de vos deals.",
      },
    ]);
    setError(null);
  };

  const priority = context.deals.reduce((acc, d) => {
    acc[d.priorityLevel] = (acc[d.priorityLevel] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-700 dark:text-blue-400" /> AMKO Deal Manager Agent
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Agent séparé dédié à la gestion opérationnelle, aux priorités et aux décisions GO / NO-GO.
          </p>
        </div>
        <button onClick={clear} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
          <Trash2 className="w-4 h-4" /> Effacer
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs uppercase text-slate-500">Deals</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{context.portfolio.totalDeals}</div>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <div className="text-xs uppercase text-red-600 dark:text-red-300">Critiques</div>
          <div className="text-2xl font-bold text-red-800 dark:text-red-200">{priority.Critique || 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="text-xs uppercase text-amber-700 dark:text-amber-300">Priorité élevée</div>
          <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">{priority['Élevé'] || 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="text-xs uppercase text-emerald-700 dark:text-emerald-300">Sous contrôle</div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{(priority.Normal || 0) + (priority.Faible || 0)}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <ClipboardCheck className="w-4 h-4" /> Questions rapides
        </div>
        <div className="flex flex-wrap gap-2">
          {DEAL_MANAGER_SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} className="px-3 py-2 rounded-full text-xs bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-200">
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5" /> {error}
        </div>
      )}

      <div className="space-y-3 min-h-[320px]">
        {messages.map((m, idx) => <Message key={idx} role={m.role} text={m.text} />)}
        {loading && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Analyse opérationnelle en cours...
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
            rows={2}
            placeholder="Ex. Quels deals dois-je traiter en priorité avant signature ou financement ?"
            className="flex-1 resize-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => ask()} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Cet agent est indépendant de l’Agent conseiller existant.
        </div>
      </div>
    </div>
  );
}
