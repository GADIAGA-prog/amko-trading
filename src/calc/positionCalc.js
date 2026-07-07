// positionCalc.js — Agrégation portefeuille : position nette, exposition, couverture,
// mark-to-market et P&L consolidé sur l'ensemble du book. Calcul pur, sans React.
//
// Conventions de signe (position physique) :
//   Achat (buy)  → LONG  la marchandise (+)  → exposé à une BAISSE du prix
//   Vente (sell) → SHORT la marchandise (−)  → exposé à une HAUSSE du prix
//
// Un hedge correct compense la jambe physique :
//   Long physique  → SHORT futures  (hedgeBbl négatif)
//   Short physique → LONG  futures  (hedgeBbl positif)
//   Exposition ouverte nette (bbl) = physique(signé) + hedge(signé) → tend vers 0 si bien couvert.

import { PRODUCTS, CONTRACTS } from '../constants.js';

const num = (v, f = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : f;
};

// Contrat de référence par marker, pour convertir une exposition en « lots équivalents ».
const MARKER_CONTRACT = {
  brent:  { unit: 'bbl', size: 1000, label: 'ICE Brent' },
  wti:    { unit: 'bbl', size: 1000, label: 'NYMEX WTI' },
  dubai:  { unit: 'bbl', size: 1000, label: 'DME Oman' },
  gasoil: { unit: 'MT',  size: 100,  label: 'ICE Gasoil' },
  rbob:   { unit: 'bbl', size: 1000, label: 'NYMEX RBOB' },
  ulsd:   { unit: 'bbl', size: 1000, label: 'NYMEX ULSD' },
};

// Prix de la jambe propre du deal, en $/MT.
export function dealLegPrice(deal) {
  if (deal?.dealType === 'sell') return num(deal.salePrice ?? deal.estimatedPrice);
  return num(deal?.purchasePrice ?? deal?.estimatedPrice);
}

// Prix marché actuel en $/MT : override manuel (par produit) prioritaire, sinon conversion
// du benchmark live. marketPrices : { brent, wti, dubai en $/bbl ; gasoil, jet en $/MT }
export function resolveRefMT(deal, marketPrices = {}, overrides = {}) {
  const ov = overrides?.[deal.product];
  if (ov !== undefined && ov !== '' && Number.isFinite(Number(ov))) {
    return { price: Number(ov), source: 'manuel' };
  }
  const product = PRODUCTS[deal.product];
  if (!product) return { price: null, source: null };
  const bblPerMT = product.bblPerMT ?? 7.45;
  const marker = product.marker;
  const mp = marketPrices || {};
  const b = num(mp.brent), w = num(mp.wti), du = num(mp.dubai), g = num(mp.gasoil), j = num(mp.jet);

  // Jet a le marker 'gasoil' mais dispose d'un prix propre ($/MT)
  if (deal.product === 'jet' && j > 0) return { price: j, source: 'Jet $/MT' };
  if (marker === 'gasoil') return g > 0 ? { price: g, source: 'Gasoil $/MT' } : { price: null, source: null };
  if (marker === 'brent')  return b > 0 ? { price: b * bblPerMT, source: `Brent×${bblPerMT}` } : { price: null, source: null };
  if (marker === 'wti')    return w > 0 ? { price: w * bblPerMT, source: `WTI×${bblPerMT}` } : { price: null, source: null };
  if (marker === 'dubai')  return du > 0 ? { price: du * bblPerMT, source: `Dubai×${bblPerMT}` } : { price: null, source: null };
  return { price: null, source: null };
}

// Barils couverts (valeur absolue) d'un hedge validé sur un deal.
function hedgedAbsoluteBbl(deal) {
  const h = deal.hedging;
  if (!h || !h.validated) return 0;
  if (Number.isFinite(Number(h.effectiveHedgedBarrels))) return num(h.effectiveHedgedBarrels);
  const bblPerMT = PRODUCTS[deal.product]?.bblPerMT ?? 1;
  const perLotBbl = num(h.contractSize) * (h.contractUnit === 'bbl' ? 1 : bblPerMT);
  return num(h.validatedLots) * perLotBbl;
}

// Détail d'un deal pour le book.
export function analyzeDealPosition(deal, marketPrices = {}, overrides = {}) {
  const product  = PRODUCTS[deal.product];
  const bblPerMT = product?.bblPerMT ?? 7.45;
  const marker   = product?.marker || deal.priceMarker || 'n/a';
  const sign     = deal.dealType === 'sell' ? -1 : 1;
  const qtyMT    = num(deal.quantity);

  const physMT  = sign * qtyMT;
  const physBbl = physMT * bblPerMT;

  const h = (deal.hedging && deal.hedging.validated) ? deal.hedging : null;
  const hedgeSign   = h ? (h.direction === 'short' ? -1 : 1) : 0;
  const hedgedBbl   = hedgeSign * hedgedAbsoluteBbl(deal);
  const hedgeMarker = h ? (CONTRACTS[h.contractKey]?.marker || marker) : null;

  const netOpenBbl  = physBbl + hedgedBbl;
  // Ratio de couverture : part de la jambe physique neutralisée par le hedge (0–100+)
  const coverPct = Math.abs(physBbl) > 0
    ? Math.min(100, Math.abs(hedgedBbl) / Math.abs(physBbl) * 100)
    : (h ? 100 : 0);

  const legPrice = dealLegPrice(deal);
  const ref = resolveRefMT(deal, marketPrices, overrides);
  let mtm = null;
  if (ref.price != null && legPrice > 0) {
    mtm = deal.dealType === 'sell'
      ? (legPrice - ref.price) * qtyMT   // short physique : gain si vendu au-dessus du marché actuel
      : (ref.price - legPrice) * qtyMT;  // long physique  : gain si marché actuel au-dessus de l'achat
  }

  const hasBooked = !!deal.pnl;
  const booked = hasBooked ? num(deal.pnl.pnl3) : null;
  // Contribution au P&L total : P&L validé s'il existe (inclut hedge+FX), sinon MtM latent.
  const contribution = hasBooked ? booked : (mtm ?? 0);
  const basisRisk = !!(h && hedgeMarker && hedgeMarker !== marker);

  return {
    id: deal.id,
    dealType: deal.dealType,
    counterparty: deal.counterparty || '—',
    status: deal.status || 'open',
    product: deal.product,
    productName: product?.name || deal.product,
    marker, hedgeMarker,
    qtyMT, physMT, physBbl,
    hedged: !!h, hedgedBbl, hedgeLots: h ? num(h.validatedLots) : 0,
    netOpenBbl, coverPct,
    legPrice, refPrice: ref.price, refSource: ref.source,
    mtm, hasBooked, booked, contribution, basisRisk,
    notional: qtyMT * (legPrice || 0),
  };
}

function lotsEquiv(marker, netBbl) {
  const c = MARKER_CONTRACT[marker];
  if (!c) return null;
  if (c.unit === 'bbl') return netBbl / c.size;
  // contrat en MT : reconvertir bbl → MT via bblPerMT approximatif du marker
  const bblPerMT = marker === 'gasoil' ? 7.5 : 7.45;
  return (netBbl / bblPerMT) / c.size;
}

// Agrégation complète du book.
export function computeBook(deals = [], marketPrices = {}, overrides = {}, opts = {}) {
  const includeClosed = opts.includeClosed ?? false;
  const active = deals.filter(d => includeClosed || d.status !== 'closed');

  const perDeal = active.map(d => analyzeDealPosition(d, marketPrices, overrides));

  const byMarker = {};
  const byProduct = {};
  const byCounterparty = {};

  let grossLongMT = 0, grossShortMT = 0, notional = 0;
  let bookedPnl = 0, latentMtm = 0, bookedCount = 0, mtmCount = 0;
  let hedgedNotional = 0;

  const ensureMarker = (m) => (byMarker[m] ||= { marker: m, longBbl: 0, shortBbl: 0, physBbl: 0, hedgedBbl: 0, deals: 0 });
  const ensureProduct = (k, name) => (byProduct[k] ||= { key: k, name, longMT: 0, shortMT: 0, physMT: 0, hedgedBbl: 0, physBbl: 0, mtm: 0, hasMtm: false, notional: 0, deals: 0 });
  const ensureCp = (n) => (byCounterparty[n] ||= { name: n, notional: 0, longMT: 0, shortMT: 0, deals: 0 });

  for (const p of perDeal) {
    if (p.physMT >= 0) grossLongMT += p.physMT; else grossShortMT += Math.abs(p.physMT);
    notional += p.notional;
    if (p.hasBooked) { bookedPnl += p.booked; bookedCount++; }
    else if (p.mtm != null) { latentMtm += p.mtm; mtmCount++; }
    if (p.hedged) hedgedNotional += p.notional;

    // par marker : physique sur le marker produit, hedge sur le marker contrat
    const pm = ensureMarker(p.marker);
    pm.physBbl += p.physBbl;
    if (p.physBbl >= 0) pm.longBbl += p.physBbl; else pm.shortBbl += Math.abs(p.physBbl);
    pm.deals++;
    if (p.hedged && p.hedgeMarker) ensureMarker(p.hedgeMarker).hedgedBbl += p.hedgedBbl;

    // par produit
    const pp = ensureProduct(p.product, p.productName);
    pp.physMT += p.physMT; pp.physBbl += p.physBbl;
    if (p.physMT >= 0) pp.longMT += p.physMT; else pp.shortMT += Math.abs(p.physMT);
    pp.hedgedBbl += p.hedgedBbl;
    pp.notional += p.notional; pp.deals++;
    if (p.mtm != null) { pp.mtm += p.mtm; pp.hasMtm = true; }

    // par contrepartie
    const pc = ensureCp(p.counterparty);
    pc.notional += p.notional;
    if (p.physMT >= 0) pc.longMT += p.physMT; else pc.shortMT += Math.abs(p.physMT);
    pc.deals++;
  }

  const markers = Object.values(byMarker).map(m => {
    const netOpenBbl = m.physBbl + m.hedgedBbl;
    return { ...m, netOpenBbl, netOpenLots: lotsEquiv(m.marker, netOpenBbl) };
  }).sort((a, b) => Math.abs(b.netOpenBbl) - Math.abs(a.netOpenBbl));

  const products = Object.values(byProduct)
    .map(p => ({ ...p, netOpenBbl: p.physBbl + p.hedgedBbl, coverPct: Math.abs(p.physBbl) > 0 ? Math.min(100, Math.abs(p.hedgedBbl) / Math.abs(p.physBbl) * 100) : 0 }))
    .sort((a, b) => Math.abs(b.physMT) - Math.abs(a.physMT));

  const counterparties = Object.values(byCounterparty).sort((a, b) => b.notional - a.notional);

  const netMT = grossLongMT - grossShortMT;
  const totalOpenBbl = markers.reduce((s, m) => s + Math.abs(m.netOpenBbl), 0);
  const totalPhysBbl = perDeal.reduce((s, p) => s + Math.abs(p.physBbl), 0);
  const bookCoverPct = totalPhysBbl > 0 ? (1 - totalOpenBbl / totalPhysBbl) * 100 : 0;
  const totalPnl = bookedPnl + latentMtm;
  const unhedged = perDeal.filter(p => !p.hedged && Math.abs(p.physMT) > 0 && p.dealType);

  return {
    perDeal, markers, products, counterparties,
    summary: {
      dealCount: perDeal.length,
      grossLongMT, grossShortMT, netMT,
      grossMT: grossLongMT + grossShortMT,
      notional, hedgedNotional,
      bookCoverPct, totalOpenBbl,
      bookedPnl, latentMtm, totalPnl, bookedCount, mtmCount,
      unhedgedCount: unhedged.length,
      unhedgedNotional: unhedged.reduce((s, p) => s + p.notional, 0),
    },
  };
}
