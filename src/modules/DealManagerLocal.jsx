import React, { useMemo, useState } from 'react';
import { Bot, Send, Trash2, CheckCircle2 } from 'lucide-react';
import { PRODUCTS } from '../constants.js';

function analyse(deal) {
  const alerts = [];
  const actions = [];

  if (!deal.counterparty) { alerts.push('contrepartie manquante'); actions.push('renseigner la contrepartie'); }
  if (!deal.quantity) { alerts.push('quantité manquante'); actions.push('renseigner la quantité'); }
  if (!deal.estimatedPrice) { alerts.push('prix manquant'); actions.push('compléter le prix'); }
  if (!deal.paymentTerm) { alerts.push('paiement non défini'); actions.push('définir le paiement'); }
  if (!deal.laycanFrom || !deal.laycanTo) { alerts.push('laycan incomplet'); actions.push('compléter le laycan'); }
  if (!deal.freight) { alerts.push('fret absent'); actions.push('calculer le fret'); }
  if (Number(deal.hedgeRatio || 0) > 0 && Number(deal.hedgeRatio) < 80) { alerts.push('couverture faible'); actions.push('revoir la couverture'); }

  const level = alerts.length >= 5 ? 'Critique' : alerts.length >= 3 ? 'Élevé' : alerts.length ? 'Normal' : 'Faible';
  const decision = level === 'Critique' ? 'NO-GO temporaire' : level === 'Élevé' ? 'GO sous conditions' : 'GO sous réserve de validation documentaire';
  return { level, alerts, actions, decision };
}

function contextFrom(deals) {
  return deals.map((d) => {
    const diagnostic = analyse(d);
    return {
      id: d.id,
      status: d.status || 'open',
      counterparty: d.counterparty || 'Non renseignée',
      product: PRODUCTS[d.product]?.name || d.product || 'Non renseigné',
      quantity: d.quantity || '',
      price: d.estimatedPrice || '',
      payment: d.paymentTerm || '',
      laycan: `${d.laycanFrom || '?'} → ${d.laycanTo || '?'}`,
      freight: !!d.freight,
      hedge: d.hedgeRatio || '',
      ...diagnostic,
    };
  });
}

function line(d) {
  return `- ${d.id || 'ID ?'} | ${d.counterparty} | ${d.product} | ${d.quantity || 'Qté ?'} MT | priorité ${d.level}`;
}

function portfolioAnswer(items) {
  const critical = items.filter(d => d.level === 'Critique');
  const high = items.filter(d => d.level === 'Élevé');
  const watch = [...critical, ...high];

  return `## Synthèse exécutive\n${items.length} deal(s) analysé(s). ${critical.length} critique(s), ${high.length} à priorité élevée.\n\n## Deals prioritaires\n${watch.length ? watch.map(line).join('\n') : '- Aucun deal critique détecté.'}\n\n## Risques majeurs\n${watch.length ? watch.map(d => `- ${d.id} : ${d.alerts.join(', ')}`).join('\n') : '- Les données actuelles ne signalent pas de blocage majeur.'}\n\n## Actions immédiates\n${watch.length ? watch.flatMap(d => d.actions.slice(0, 2).map(a => `- ${d.id} : ${a}`)).join('\n') : '- Continuer le suivi normal : prix, documents, fret et couverture.'}\n\n## Recommandation finale\n${critical.length ? 'NO-GO temporaire sur les deals critiques.' : high.length ? 'GO sous conditions.' : 'GO sous réserve de validation documentaire.'}`;
}

function checklistAnswer() {
  return `## Checklist opérationnelle\n- Valider produit, quantité et qualité.\n- Vérifier formule de prix, période de pricing et prime.\n- Confirmer port de chargement, port de livraison et laycan.\n- Contrôler le paiement avant engagement.\n- Vérifier documents : facture, certificats qualité/quantité, origine, connaissement, assurance.\n- Calculer fret, coûts annexes et marge nette.\n- Vérifier la couverture si le prix est exposé.\n\n## Recommandation finale\nGO sous conditions après validation de tous les points.`;
}

function messageAnswer(items) {
  const d = items[0];
  if (!d) return 'Aucun deal disponible pour préparer un message.';
  return `## Message proposé\nBonjour,\n\nNous confirmons notre intérêt pour la transaction portant sur ${d.quantity || '[quantité à préciser]'} MT de ${d.product}.\n\nAvant de poursuivre, merci de confirmer :\n1. la formule de prix et la prime ;\n2. les ports et le laycan ;\n3. les documents disponibles ;\n4. les modalités de paiement ;\n5. les conditions d’inspection.\n\nCes éléments sont nécessaires pour avancer dans de bonnes conditions.\n\nCordialement,\n\n## Recommandation\n${d.decision}`;
}

function answer(question, items) {
  const q = question.toLowerCase();
  if (q.includes('checklist') || q.includes('signature') || q.includes('financement')) return checklistAnswer();
  if (q.includes('message') || q.includes('négociation') || q.includes('negociation')) return messageAnswer(items);
  return portfolioAnswer(items);
}

function Message({ role, text }) {
  return (
    <div className={`rounded-xl border p-4 ${role === 'user' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
      <div className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{role === 'user' ? 'Vous' : 'Deal Manager local'}</div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">{text}</div>
    </div>
  );
}

export default function DealManagerLocal({ deals }) {
  const items = useMemo(() => contextFrom(deals), [deals]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Je suis le Deal Manager local. Je fonctionne sans API payante et j’analyse vos deals à partir des règles intégrées.' }]);

  const ask = (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }, { role: 'assistant', text: answer(q, items) }]);
  };

  const counts = items.reduce((a, d) => ({ ...a, [d.level]: (a[d.level] || 0) + 1 }), {});

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Bot className="w-6 h-6 text-blue-700" /> Deal Manager IA local</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Agent gratuit : aucun appel Anthropic, aucune clé API, aucun coût par message.</p>
        </div>
        <button onClick={() => setMessages([])} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"><Trash2 className="w-4 h-4" /> Effacer</button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4"><div className="text-xs uppercase text-slate-500">Deals</div><div className="text-2xl font-bold">{items.length}</div></div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4"><div className="text-xs uppercase text-slate-500">Critiques</div><div className="text-2xl font-bold">{counts.Critique || 0}</div></div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4"><div className="text-xs uppercase text-slate-500">Élevés</div><div className="text-2xl font-bold">{counts['Élevé'] || 0}</div></div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-4"><div className="text-xs uppercase text-slate-500">Sous contrôle</div><div className="text-2xl font-bold">{(counts.Normal || 0) + (counts.Faible || 0)}</div></div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-800 dark:text-emerald-200 flex gap-2"><CheckCircle2 className="w-4 h-4" /> Mode local activé : l’agent ne contacte aucune API externe.</div>

      <div className="flex flex-wrap gap-2">
        {['Analyse mon portefeuille', 'Quels deals sont prioritaires ?', 'Prépare une checklist avant signature', 'Prépare un message de négociation'].map(s => <button key={s} onClick={() => ask(s)} className="px-3 py-2 rounded-full text-xs bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-200">{s}</button>)}
      </div>

      <div className="space-y-3 min-h-[300px]">{messages.map((m, i) => <Message key={i} role={m.role} text={m.text} />)}</div>

      <div className="rounded-xl border bg-white dark:bg-slate-900 p-3">
        <div className="flex gap-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }} rows={2} placeholder="Ex. Analyse mes deals ouverts" className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm dark:bg-slate-950 dark:text-slate-100" />
          <button onClick={() => ask()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold"><Send className="w-4 h-4" /> Envoyer</button>
        </div>
      </div>
    </div>
  );
}
