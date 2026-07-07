// Logique pure des 11 contrôles de l'Optimizer — sans dépendances React.
// Entrée : un objet deal complet. Sortie : tableau d'alertes { level, area, title, detail, action }.

import { PRODUCTS, SANCTIONED_COUNTRIES } from '../constants.js';
import { daysBetween } from '../utils.js';

export function analyzeDeal(deal) {
  if (!deal) return null;

  const issues = [];
  const product      = PRODUCTS[deal.product];
  const productMarker = product?.marker;

  // 1. Marker incohérent avec le produit
  if (productMarker && deal.priceMarker && deal.priceMarker !== productMarker) {
    issues.push({
      level: 'high', area: 'Pricing',
      title: 'Marker incohérent avec le produit',
      detail: `Vous indexez ce ${product.name} sur ${deal.priceMarker.toUpperCase()} alors que la pratique de marché serait ${productMarker.toUpperCase()}. Cela crée un basis risk.`,
      action: `Indexez sur ${productMarker.toUpperCase()} ou hedgez sur ${productMarker.toUpperCase()} via swap.`,
    });
  }

  // 2. Hedge ratio
  const hr = Number(deal.hedgeRatio) || 0;
  if (hr < 80) {
    issues.push({
      level: hr < 50 ? 'high' : 'med', area: 'Hedging',
      title: `Hedge ratio bas (${hr}%)`,
      detail: "Vous laissez une partie significative de l'exposition non couverte. C'est une prise de risque directionnelle.",
      action: "Visez 90-100% de couverture sur l'exposition flat price, sauf décision stratégique consciente.",
    });
  } else if (hr === 100) {
    issues.push({
      level: 'info', area: 'Hedging',
      title: 'Hedge complet en place',
      detail: 'Position quasi neutre sur le flat price : seul le différentiel (basis) génère du P&L.',
      action: 'Surveillez le basis risk (écart marker vs prix physique réel).',
    });
  }

  // 3. Sanctions
  const country = (deal.counterpartyCountry || '').toLowerCase();
  if (SANCTIONED_COUNTRIES.some(s => country.includes(s))) {
    issues.push({
      level: 'high', area: 'Sanctions',
      title: 'Pays potentiellement sous sanctions',
      detail: `La contrepartie semble basée dans une juridiction sensible (${deal.counterpartyCountry}). Risque OFAC / UE / UK majeur.`,
      action: 'Filtrer sur les listes OFAC SDN, UE, HM Treasury. Vérifier le navire (Equasis). Consulter compliance.',
    });
  }

  // 4. CIF + Open credit
  if (deal.incoterm === 'CIF' && deal.paymentTerm === 'Open credit') {
    issues.push({
      level: 'med', area: 'Risque crédit',
      title: 'CIF + Open credit = double risque',
      detail: 'Vous portez le risque transport ET le risque de non-paiement.',
      action: 'Exigez une LC ou SBLC, ou souscrivez une assurance-crédit.',
    });
  }

  // 5. Open credit avec contrepartie non first-class
  if (deal.paymentTerm === 'Open credit' && deal.counterpartyTier !== 'first-class') {
    issues.push({
      level: 'high', area: 'Risque crédit',
      title: 'Open credit avec contrepartie non first-class',
      detail: "L'open credit n'est acceptable qu'avec des Majors / raffineries de premier rang.",
      action: 'Demander une PCG, LC, ou silent cover.',
    });
  }

  // 6. LC avec banque à risque
  if ((deal.paymentTerm || '').includes('LC') && ['BB', 'lower'].includes(deal.bankRating)) {
    issues.push({
      level: 'high', area: 'Risque bancaire',
      title: 'Banque émettrice à risque',
      detail: `La banque émettrice est notée ${deal.bankRating}. Le risque banque peut être pire que celui de la contrepartie.`,
      action: 'Faire confirmer la LC par une banque de premier rang.',
    });
  }

  // 7. Laycan trop large
  const laycanDuration = daysBetween(deal.laycanFrom, deal.laycanTo);
  if (laycanDuration > 7) {
    issues.push({
      level: 'med', area: 'Logistique',
      title: `Laycan large (${laycanDuration} jours)`,
      detail: "Un laycan trop large augmente l'incertitude opérationnelle.",
      action: 'Resserrer à 3-5 jours quand possible pour faciliter le nominage du navire.',
    });
  }

  // 8. Laycan invalide
  if (laycanDuration < 0) {
    issues.push({
      level: 'high', area: 'Logistique',
      title: 'Laycan invalide',
      detail: 'La date de fin est antérieure à la date de début.',
      action: 'Corriger les dates de laycan.',
    });
  }

  // 9a. Différentiel absent — unité selon le produit : $/bbl pour un brut, $/MT pour un raffiné/GPL
  const diff = Number(deal.differential);
  const diffIsCrude   = product?.type === 'crude';
  const diffUnit      = diffIsCrude ? '$/bbl' : '$/MT';
  const diffThreshold = diffIsCrude ? 10 : 150;
  if (isNaN(diff) || deal.differential === '') {
    issues.push({
      level: 'med', area: 'Pricing',
      title: 'Différentiel non renseigné',
      detail: 'Sans différentiel, impossible de comparer le pricing à des benchmarks.',
      action: `Renseigner le différentiel (prime/décote) en ${diffUnit}.`,
    });
  // 9b. Différentiel inhabituel
  } else if (Math.abs(diff) > diffThreshold) {
    issues.push({
      level: 'med', area: 'Pricing',
      title: 'Différentiel inhabituel',
      detail: `Un différentiel de ${diff > 0 ? '+' : ''}${diff} ${diffUnit} est très élevé.`,
      action: 'Comparer à un assessment Platts/Argus récent pour valider.',
    });
  }

  // 10. Navire non spécifié
  if (!deal.vessel) {
    issues.push({
      level: 'low', area: 'Logistique',
      title: 'Type de navire non spécifié',
      detail: 'Le choix du navire impacte le coût de fret et la compatibilité avec les terminaux.',
      action: 'Préciser la classe de navire envisagée.',
    });
  }

  // 11. Tolérance excessive
  if (Number(deal.tolerance) > 10) {
    issues.push({
      level: 'low', area: 'Quantité',
      title: 'Tolérance supérieure à 10%',
      detail: 'Une tolérance large fragilise le calcul de la marge.',
      action: 'Limiter à ±5% si la pratique de marché le permet.',
    });
  }

  return issues;
}
