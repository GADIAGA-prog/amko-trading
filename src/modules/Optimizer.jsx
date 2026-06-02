import React, { useState, useMemo } from 'react';
import { Lightbulb, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { PRODUCTS, SANCTIONED_COUNTRIES } from '../constants.js';
import { daysBetween } from '../utils.js';
import { Card, CardHeader, CardBody, Select, Stat } from '../components/UI.jsx';

export default function Optimizer({ deals }) {
  const [selectedId, setSelectedId] = useState('');
  const deal = deals.find(d => d.id === selectedId);

  const analysis = useMemo(() => {
    if (!deal) return null;
    const issues = [];
    const product = PRODUCTS[deal.product];
    const productMarker = product?.marker;

    if (productMarker && deal.priceMarker && deal.priceMarker !== productMarker) {
      issues.push({
        level: 'high', area: 'Pricing',
        title: 'Marker incohérent avec le produit',
        detail: `Vous indexez ce ${product.name} sur ${deal.priceMarker.toUpperCase()} alors que la pratique de marché serait ${productMarker.toUpperCase()}. Cela crée un basis risk.`,
        action: `Indexez sur ${productMarker.toUpperCase()} ou hedgez sur ${productMarker.toUpperCase()} via swap.`,
      });
    }

    const hr = Number(deal.hedgeRatio) || 0;
    if (hr < 80) {
      issues.push({
        level: hr < 50 ? 'high' : 'med', area: 'Hedging',
        title: `Hedge ratio bas (${hr}%)`,
        detail: "Vous laissez une partie significative de l'exposition non couverte. C'est une prise de risque directionnelle.",
        action: 'Visez 90-100% de couverture sur l\'exposition flat price, sauf décision stratégique consciente.',
      });
    } else if (hr === 100) {
      issues.push({
        level: 'info', area: 'Hedging',
        title: 'Hedge complet en place',
        detail: 'Position quasi neutre sur le flat price : seul le différentiel (basis) génère du P&L.',
        action: 'Surveillez le basis risk (écart marker vs prix physique réel).',
      });
    }

    const country = (deal.counterpartyCountry || '').toLowerCase();
    if (SANCTIONED_COUNTRIES.some(s => country.includes(s))) {
      issues.push({
        level: 'high', area: 'Sanctions',
        title: 'Pays potentiellement sous sanctions',
        detail: `La contrepartie semble basée dans une juridiction sensible (${deal.counterpartyCountry}). Risque OFAC / UE / UK majeur.`,
        action: 'Filtrer sur les listes OFAC SDN, UE, HM Treasury. Vérifier le navire (Equasis). Consulter compliance.',
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
        title: 'Banque émettrice à risque',
        detail: `La banque émettrice est notée ${deal.bankRating}. Le risque banque peut être pire que celui de la contrepartie.`,
        action: 'Faire confirmer la LC par une banque de premier rang.',
      });
    }

    const laycanDuration = daysBetween(deal.laycanFrom, deal.laycanTo);
    if (laycanDuration > 7) {
      issues.push({
        level: 'med', area: 'Logistique',
        title: `Laycan large (${laycanDuration} jours)`,
        detail: 'Un laycan trop large augmente l\'incertitude opérationnelle.',
        action: 'Resserrer à 3-5 jours quand possible pour faciliter le nominage du navire.',
      });
    }
    if (laycanDuration < 0) {
      issues.push({
        level: 'high', area: 'Logistique',
        title: 'Laycan invalide',
        detail: 'La date de fin est antérieure à la date de début.',
        action: 'Corriger les dates de laycan.',
      });
    }

    const diff = Number(deal.differential);
    if (isNaN(diff) || deal.differential === '') {
      issues.push({
        level: 'med', area: 'Pricing',
        title: 'Différentiel non renseigné',
        detail: 'Sans différentiel, impossible de comparer le pricing à des benchmarks.',
        action: 'Renseigner le différentiel (prime/décote) en $/bbl.',
      });
    } else if (Math.abs(diff) > 10) {
      issues.push({
        level: 'med', area: 'Pricing',
        title: 'Différentiel inhabituel',
        detail: `Un différentiel de ${diff > 0 ? '+' : ''}${diff} $/bbl est très élevé.`,
        action: 'Comparer à un assessment Platts/Argus récent pour valider.',
      });
    }

    if (!deal.vessel) {
      issues.push({
        level: 'low', area: 'Logistique',
        title: 'Type de navire non spécifié',
        detail: 'Le choix du navire impacte le coût de fret et la compatibilité avec les terminaux.',
        action: 'Préciser la classe de navire envisagée.',
      });
    }

    if (Number(deal.tolerance) > 10) {
      issues.push({
        level: 'low', area: 'Quantité',
        title: 'Tolérance supérieure à 10%',
        detail: 'Une tolérance large fragilise le calcul de la marge.',
        action: 'Limiter à ±5% si la pratique de marché le permet.',
      });
    }

    return issues;
  }, [deal]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Optimiseur de deal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analyse automatique et suggestions d'amélioration</p>
      </div>

      <Card>
        <CardHeader icon={Lightbulb} title="Sélectionner un deal" />
        <CardBody>
          <Select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">— Choisir un deal à analyser —</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {d.id} — {PRODUCTS[d.product]?.name} — {d.counterparty} ({d.dealType})
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {deal && analysis && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Issues critiques" value={analysis.filter(i => i.level === 'high').length} accent="red" />
            <Stat label="À surveiller"     value={analysis.filter(i => i.level === 'med').length}  accent="gold" />
            <Stat label="Mineures"         value={analysis.filter(i => i.level === 'low').length}  accent="slate" />
            <Stat label="Score santé"
              value={`${Math.max(0,
                100
                - analysis.filter(i => i.level === 'high').length * 25
                - analysis.filter(i => i.level === 'med').length  * 10
                - analysis.filter(i => i.level === 'low').length  *  3
              )}/100`}
              accent="green" />
          </div>

          {analysis.length === 0 ? (
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                  <div>
                    <div className="font-semibold">Aucune issue détectée</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Le deal passe tous les contrôles automatiques.</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {analysis.map((i, idx) => {
                const palette = {
                  high: { bg: 'bg-red-50 dark:bg-red-900/20',     bd: 'border-red-300 dark:border-red-700',     tt: 'text-red-800 dark:text-red-300',     pill: 'bg-red-600 text-white',     Icon: AlertTriangle },
                  med:  { bg: 'bg-amber-50 dark:bg-amber-900/20', bd: 'border-amber-300 dark:border-amber-700', tt: 'text-amber-800 dark:text-amber-300', pill: 'bg-amber-600 text-white',   Icon: AlertTriangle },
                  low:  { bg: 'bg-slate-50 dark:bg-slate-800',    bd: 'border-slate-300 dark:border-slate-600', tt: 'text-slate-700 dark:text-slate-300', pill: 'bg-slate-500 text-white',   Icon: Info },
                  info: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', bd: 'border-emerald-300 dark:border-emerald-700', tt: 'text-emerald-800 dark:text-emerald-300', pill: 'bg-emerald-600 text-white', Icon: CheckCircle2 },
                }[i.level];
                const IcoPalette = palette.Icon;
                return (
                  <div key={idx} className={`rounded-md border ${palette.bd} ${palette.bg} p-4`}>
                    <div className="flex items-start gap-3">
                      <IcoPalette className={`w-5 h-5 mt-0.5 ${palette.tt}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded font-semibold ${palette.pill}`}>{i.level.toUpperCase()}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase">{i.area}</span>
                        </div>
                        <h3 className={`font-semibold ${palette.tt}`}>{i.title}</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{i.detail}</p>
                        <p className="text-sm mt-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Action recommandée : </span>
                          <span className="text-slate-700 dark:text-slate-300">{i.action}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
