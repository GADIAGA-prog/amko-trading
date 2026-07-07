import React, { useRef } from 'react';
import { BookOpen, Printer } from 'lucide-react';
import { Button } from '../components/UI.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// NOTICE D'UTILISATION — source unique : ce HTML est affiché dans l'app (iframe
// « document ») ET imprimé tel quel. Toute mise à jour se fait ici, une fois.
// ─────────────────────────────────────────────────────────────────────────────
const NOTICE_HTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>AMKO Trading — Notice d'utilisation</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.55; color: #0f172a; margin: 0; padding: 28px 40px; background: #fff; }
  h1 { font-size: 17pt; border-bottom: 3px solid #1d4ed8; padding-bottom: 8px; margin: 0 0 4px; }
  .sub { color: #64748b; margin-bottom: 22px; font-size: 9.5pt; }
  h2 { font-size: 12.5pt; color: #1d4ed8; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 26px 0 10px; }
  h3 { font-size: 10.5pt; margin: 16px 0 6px; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.4px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .step { border: 1px solid #dbeafe; border-left: 4px solid #1d4ed8; border-radius: 6px; padding: 10px 14px; margin: 10px 0; background: #f8fafc; page-break-inside: avoid; }
  .step b.t { color: #1d4ed8; }
  .path { display: inline-block; background: #1e293b; color: #fff; border-radius: 4px; padding: 1px 8px; font-size: 8.5pt; font-family: Consolas, monospace; }
  .val { background: #fef3c7; border-radius: 3px; padding: 0 4px; font-weight: 600; white-space: nowrap; }
  .res { background: #dcfce7; border-radius: 3px; padding: 0 4px; font-weight: 700; white-space: nowrap; }
  .warn { background: #fff7ed; border: 1px solid #fdba74; border-radius: 6px; padding: 8px 12px; margin: 8px 0; }
  .tip  { background: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px; padding: 8px 12px; margin: 8px 0; }
  ul, ol { margin: 6px 0; padding-left: 22px; }
  li { margin: 3px 0; }
  .toc { columns: 2; font-size: 9.5pt; }
  .toc div { margin: 2px 0; }
  .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; color: #94a3b8; font-size: 8pt; }
  .formula { font-family: Consolas, monospace; font-size: 9pt; background: #f1f5f9; border-radius: 4px; padding: 2px 6px; }
  @media print { body { padding: 0; } h2 { page-break-after: avoid; } .step, table { page-break-inside: avoid; } }
</style></head><body>

<h1>AMKO Trading — Notice d'utilisation</h1>
<p class="sub">Plateforme de trading physique de produits pétroliers — version 2.0 · juillet 2026</p>

<h2>Sommaire</h2>
<div class="toc">
  <div>1. Présentation &amp; philosophie</div>
  <div>2. Démarrage, comptes et rôles</div>
  <div>3. Les modules et le cycle de vie d'un deal</div>
  <div>4. Exemple complet de A à Z (Vitol → Lomé)</div>
  <div>5. Le Conseiller (chat)</div>
  <div>6. Données, sauvegardes et exports</div>
  <div>7. Dépannage rapide</div>
</div>

<h2>1. Présentation &amp; philosophie</h2>
<p>AMKO Trading couvre <b>tout le cycle de vie d'un deal physique</b> : capture, validation des risques, pricing sur Platts (MOP), couverture prix (futures) et devise (forward/option), fret, lettre de crédit, P&amp;L à 3 niveaux, puis suivi consolidé du portefeuille.</p>
<p>Deux écrans jouent le rôle de <b>postes de pilotage</b> :</p>
<ul>
  <li><b>Cockpit deal</b> — la vue 360° d'UN deal : pipeline de vie, checklist « bon deal », échéancier, alertes, verdict GO/NO-GO, historique et deal ticket imprimable. <i>Réflexe : après chaque action sur un deal, repassez par son cockpit.</i></li>
  <li><b>Book de position</b> — la vue de TOUT le portefeuille : position nette, exposition résiduelle après hedge, mark-to-market, P&amp;L consolidé, concentration par contrepartie.</li>
</ul>
<p>Chaque module spécialisé (Hedging, Fret, P&amp;L…) <b>enregistre son résultat dans le deal</b> : le cockpit, le dashboard et le book se mettent à jour automatiquement, et chaque action laisse une trace au <b>Blotter</b> (journal d'audit).</p>

<h2>2. Démarrage, comptes et rôles</h2>
<ul>
  <li><b>Premier lancement</b> : un compte administrateur est créé automatiquement — identifiant <span class="val">admin</span>, mot de passe <span class="val">amko</span>. <b>Changez-le immédiatement</b> dans <span class="path">Mon profil</span>.</li>
  <li><b>Rôles</b> : <b>Admin</b> (tout + gestion des utilisateurs), <b>Trader</b> (crée et gère ses deals), <b>Viewer</b> (lecture seule).</li>
  <li>Les deals sont <b>cloisonnés par utilisateur</b>. La session expire après 30 min d'inactivité. Thème clair/sombre en bas de la barre latérale.</li>
</ul>
<div class="warn"><b>Important :</b> toutes les données vivent dans le navigateur (localStorage). Faites régulièrement <span class="path">Mes deals → Sauvegarder JSON</span> (voir §6). Vider le cache du navigateur efface les données.</div>

<h2>3. Les modules et le cycle de vie d'un deal</h2>
<p>Un deal traverse 6 statuts : <b>Ouvert → Contractualisé → Financé → Chargé → Déchargé → Soldé</b> (modifiables depuis le cockpit).</p>
<table>
  <tr><th>Module</th><th>À quoi il sert</th><th>Ce qu'il enregistre dans le deal</th></tr>
  <tr><td><b>Nouveau deal</b></td><td>Capture : contrepartie, produit, quantité, incoterm, laycan, B/L, prix, paiement. Calculateur MOP intégré si un Platts est importé.</td><td>Le deal lui-même</td></tr>
  <tr><td><b>Cockpit deal</b></td><td>Pilotage : checklist, verdict, échéances, alertes, économie, historique, deal ticket.</td><td>Statut</td></tr>
  <tr><td><b>Import Platts / Platts Board</b></td><td>Importer le fichier Excel Platts ; consulter cotations, MOP, spreads physiques ; pousser un prix vers un deal.</td><td>Prix de la jambe (si poussé)</td></tr>
  <tr><td><b>Pricing</b></td><td>Construire un prix : marker + spread qualité + ajustements + marge.</td><td><i>pricing</i> + prix de la jambe</td></tr>
  <tr><td><b>FX Pricing</b></td><td>Valider l'économie : marge spot vs forward, arbitrage de devise (USD/EUR/XOF), stress ±5 %, verdict GO/NO-GO.</td><td><i>pricingValidation</i></td></tr>
  <tr><td><b>Hedging</b></td><td>Convertir l'exposition physique en lots futures (ICE/NYMEX/DME), sens SHORT/LONG, P&amp;L de couverture.</td><td><i>hedging</i></td></tr>
  <tr><td><b>Rolling</b></td><td>Coût/crédit du roll d'échéance ; l'historique par deal alimente le « roll cumulé » du Hedging.</td><td>Historique de rolls</td></tr>
  <tr><td><b>Couverture FX</b></td><td>Forward ferme ou option sur devise : frais bancaires complets, comparaison de scénarios.</td><td><i>fxHedge</i> (repris au P&amp;L)</td></tr>
  <tr><td><b>Fret (WS)</b></td><td>Worldscale (flat × WS × (1−commission)) ou Lumpsum, + SECA et démurrage.</td><td><i>freight</i></td></tr>
  <tr><td><b>Lots &amp; cargaisons</b></td><td>Contrats multi-livraisons : pricing Platts par lot, prix moyen pondéré poussable vers le deal.</td><td><i>lots</i> + prix de la jambe</td></tr>
  <tr><td><b>LC Checker</b></td><td>Checklist des 22 champs SWIFT MT700 (UCP 600).</td><td><i>lcCheck</i></td></tr>
  <tr><td><b>Risques</b></td><td>Matrice probabilité × gravité + couvertures recommandées.</td><td><i>riskMatrix</i></td></tr>
  <tr><td><b>P&amp;L</b></td><td>Marge à 3 niveaux : brute → après financement → nette (hedge + FX inclus).</td><td><i>pnl</i></td></tr>
  <tr><td><b>Book de position</b></td><td>Position nette, exposition après hedge, MtM, P&amp;L consolidé, export Excel.</td><td>—</td></tr>
  <tr><td><b>Blotter / Journal</b></td><td>Piste d'audit horodatée de toutes les actions, export CSV.</td><td>—</td></tr>
  <tr><td><b>Conseiller</b></td><td>Chat en lecture seule sur vos données réelles (voir §5).</td><td>—</td></tr>
</table>

<h2>4. Exemple complet de A à Z — achat Vitol, revente Lomé</h2>
<p>Cas réel type : <b>achat de 15 000 MT de gasoil 0,1 %S FOB MED à Vitol</b>, revente <b>DAP Lomé</b>, marché baissier entre l'achat et la livraison, couverture ICE Gasoil et forward USD/XOF. Chaque étape indique où cliquer et quoi saisir. <i>Chiffres illustratifs mais cohérents entre eux du début à la fin.</i></p>
<div class="tip">Raccourci : les boutons <b>« Exemple — Achat Vitol »</b> et <b>« Exemple — Vente Client Lomé »</b> du module Nouveau deal pré-remplissent ces deux deals en un clic.</div>

<div class="step"><b class="t">Étape A — Prix de référence.</b> <span class="path">Tableau de bord</span> : lisez les mini-charts puis saisissez les prix du jour, ex. Brent <span class="val">84,00 $/bbl</span>, Gasoil <span class="val">1 100 $/MT</span>. Ils préremplissent Pricing, P&amp;L et le MtM du Book.</div>

<div class="step"><b class="t">Étape B — (Optionnel) Importer le Platts.</b> <span class="path">Import Platts</span> : chargez le fichier Excel Platts quotidien. Les produits cotés apparaissent alors dans Nouveau deal et le <b>calculateur MOP</b> (Mean of Platts) devient automatique.</div>

<div class="step"><b class="t">Étape C — Créer le deal d'ACHAT.</b> <span class="path">Nouveau deal</span> :
<ul>
<li>Type <span class="val">Achat</span> · Contrepartie <span class="val">Vitol S.A.</span> (first-class, Suisse) · Produit <span class="val">Gasoil / Diesel 10ppm</span> · Quantité <span class="val">15 000 MT</span> ± 5 %</li>
<li>Incoterm <span class="val">FOB</span> · Augusta (MED) → Lomé · Laycan &amp; B/L <span class="val">18/05/2026</span> · Navire MR · Inspecteur SGS</li>
<li>Pricing : source Platts, différentiel (prime Vitol) <span class="val">+65,62 $/MT</span>. Le MOP 5 j autour du B/L donne <span class="val">1 181,75 $/MT</span> → bouton <b>« → Prix achat »</b> : <span class="res">1 247,37 $/MT</span></li>
<li>Paiement <span class="val">LC at sight</span>, banque AA · Statut <span class="val">Contractualisé</span> → <b>Enregistrer</b></li>
</ul></div>

<div class="step"><b class="t">Étape D — Ouvrir le Cockpit.</b> <span class="path">Mes deals → bouton Cockpit</span> : score de complétude ~55 %, verdict « GO sous conditions ». La checklist liste ce qui manque — chaque ligne a un bouton <b>Ouvrir</b> qui lance le bon module avec le deal déjà sélectionné. Suivez-la dans l'ordre des étapes E à H.</div>

<div class="step"><b class="t">Étape E — Valider les risques.</b> <span class="path">Risques</span> (deal pré-sélectionné) : la matrice se calcule seule → <b>« Enregistrer l'analyse dans le deal »</b>. Le score apparaît au cockpit.</div>

<div class="step"><b class="t">Étape F — Valider le pricing &amp; l'économie (GO/NO-GO).</b> <span class="path">FX Pricing</span> : liez le deal — prix, fret et coûts déjà chiffrés sont repris automatiquement. Devises achat/vente/marge <span class="val">USD</span>, seuil de marge 5 $/MT → <b>Calculer</b> → verdict <b>GO_WITH_CONDITIONS</b> (le fret n'est pas encore sauvegardé — normal à ce stade) → <b>Sauvegarder</b>.</div>

<div class="step"><b class="t">Étape G — Hedger l'achat (SHORT futures).</b> <span class="path">Hedging</span> : deal lié → tout se pré-remplit.
<ul>
<li>Contrat <span class="val">ICE Gasoil (LGO) — 100 MT</span>, ratio <span class="val">100 %</span>, sens <span class="val">SHORT</span> (on est long physique)</li>
<li>Calcul : <span class="formula">15 000 MT ÷ 100 MT/lot = 150 lots</span> → recommandation <span class="res">VENDRE 150 lots</span></li>
<li>Prix d'entrée <span class="val">1 233,50 $/MT</span> (18/05). À la liquidation MOP : prix de sortie <span class="val">1 087,67 $/MT</span></li>
<li>P&amp;L hedge : <span class="formula">(1 233,50 − 1 087,67) × 150 × 100 MT</span> = <span class="res">+2 187 450 $</span> → <b>Valider &amp; sauvegarder</b></li>
</ul>
Le marché a baissé de ~146 $/MT : la perte sur le physique sera compensée par ce gain futures. En cas de roll d'échéance avant la sortie : <span class="path">Rolling</span>, lier le deal — le roll cumulé remonte tout seul dans Hedging.</div>

<div class="step"><b class="t">Étape H — Calculer le fret.</b> <span class="path">Fret (WS)</span> : deal lié. Mode Lumpsum <span class="val">450 000 $</span> (≈ 30 $/MT pour 15 000 MT) → <b>Sauvegarder dans le deal</b>.<br>
<i>Pour mémoire, en mode Worldscale :</i> <span class="formula">fret = flat rate × WS×(1−com.) /100 × tonnage</span>. Ex. flat 18,46 $/t, WS 80, commission 1,25 %, 30 000 t → <span class="formula">18,46 × 79/100 × 30 000</span> = 437 502 $.</div>

<div class="step"><b class="t">Étape I — Créer le deal de VENTE.</b> <span class="path">Nouveau deal</span> : Type <span class="val">Vente</span>, Client Lomé (Togo), DAP, livraison <span class="val">12/06/2026</span>. MOP vente B/L→livraison <span class="val">1 076,24 $/MT</span> + prime AMKO <span class="val">+139 $/MT</span> → bouton <b>« → Prix vente »</b> : <span class="res">1 215,24 $/MT</span>. Paiement <span class="val">J+30 (LC irrévocable)</span>. Hedge ratio <span class="val">0 %</span> : c'est un back-to-back, le risque prix est déjà porté et couvert côté achat.</div>

<div class="step"><b class="t">Étape J — Couvrir le change (client payé en XOF).</b> <span class="path">Couverture FX</span> : deal de vente lié.
<ul>
<li>Paire <span class="val">USD/XOF</span> · notionnel <span class="formula">1 215,24 × 15 000 ≈ 18 228 600 USD</span> (pré-rempli) · spot <span class="val">600</span> (repris du FX Pricing s'il existe) · échéance = date de paiement (≈ 42 j)</li>
<li>Frais : spread bancaire 0,20 % ≈ 36 457 $ + commission 500 $ → coût total ≈ <span class="res">−37 000 $</span> → <b>Enregistrer</b> (repris automatiquement au P&amp;L niveau 3)</li>
</ul>
Rappel XOF : la parité EUR/XOF est fixe (655,957) — le vrai risque est EUR/USD, traduit en USD/XOF implicite.</div>

<div class="step"><b class="t">Étape K — (Si livraisons fractionnées) Lots.</b> <span class="path">Lots &amp; cargaisons</span> : créez les lots (ex. 3 × 5 000 MT), pricez chacun à sa fenêtre Platts. Le <b>prix moyen pondéré</b> peut être poussé d'un clic comme prix de vente du deal.</div>

<div class="step"><b class="t">Étape L — Vérifier la LC.</b> <span class="path">LC Checker</span> : liez le deal de vente et cochez les 22 champs MT700 à réception de la LC (40A irrévocable, 31D expiration, 44C latest shipment, 46A documents…) → <b>Sauvegarder</b>. La progression (ex. 22/22) s'affiche au cockpit.</div>

<div class="step"><b class="t">Étape M — Le P&amp;L consolidé (3 niveaux).</b> <span class="path">P&amp;L</span> : liez le <b>deal de vente</b> (il porte la marge du back-to-back) et saisissez les deux jambes :
<table>
<tr><th>Élément</th><th>Calcul</th><th>Montant</th></tr>
<tr><td>Marge commerciale</td><td class="num">(1 215,24 − 1 247,37) × 15 000</td><td class="num">−481 950 $</td></tr>
<tr><td>Coûts directs</td><td class="num">fret 450 000 + inspection 8 000 + assurance 15 000</td><td class="num">−473 000 $</td></tr>
<tr><td><b>P&amp;L 1 — marge brute</b></td><td></td><td class="num"><b>−954 950 $</b></td></tr>
<tr><td>Financement (LC)</td><td class="num"></td><td class="num">−25 000 $</td></tr>
<tr><td><b>P&amp;L 2 — après financement</b></td><td></td><td class="num"><b>−979 950 $</b></td></tr>
<tr><td>Résultat hedge (auto)</td><td class="num"></td><td class="num">+2 187 450 $</td></tr>
<tr><td>Résultat FX (auto)</td><td class="num"></td><td class="num">−37 000 $</td></tr>
<tr><td><b>P&amp;L 3 — marge nette</b></td><td class="num">soit <b>+78,03 $/MT</b> · 6,4 % du revenu</td><td class="num"><b>+1 170 500 $</b></td></tr>
</table>
→ <b>Valider le P&amp;L</b>. <b>La leçon du back-to-back hedgé :</b> sans couverture, le deal perdait ~980 k$ (marché baissier) ; le SHORT futures a capté la baisse et retourne la marge à <b>+1,17 M$</b>.</div>

<div class="step"><b class="t">Étape N — Contrôle final au Cockpit.</b> Score proche de 100 %, verdict <b>GO</b>, l'économie du deal affiche les 3 niveaux et la réconciliation avec la marge FX Pricing. Bouton <b>« Deal ticket »</b> → dossier complet imprimable (à archiver / partager).</div>

<div class="step"><b class="t">Étape O — Vue portefeuille.</b> <span class="path">Book de position</span> : l'achat couvert affiche une exposition ouverte ≈ 0 ; la vente apparaît short 112 500 bbl compensée au niveau book. Saisissez le prix marché actuel par produit pour le MtM. <b>Exporter Excel</b> pour le reporting.</div>

<div class="step"><b class="t">Étape P — Piste d'audit.</b> <span class="path">Blotter / Journal</span> : toutes les actions ci-dessus y sont horodatées (création, hedge 150 lots, fret, LC 22/22, P&amp;L validé…). Filtrez par deal, exportez en CSV. L'historique du deal est aussi visible dans son cockpit.</div>

<div class="step"><b class="t">Étape Q — Vie du deal jusqu'au solde.</b> Avancez le statut depuis le cockpit au fil des événements : <b>Financé</b> (LC ouverte) → <b>Chargé</b> (B/L émis) → <b>Déchargé</b> (livraison Lomé) → encaissement (l'échéancier estime la date : B/L + 30 j ≈ <span class="val">17/06/2026</span>, alerte automatique si dépassée) → <b>Soldé</b>. Terminez par une <b>sauvegarde JSON</b>.</div>

<h2>5. Le Conseiller (chat)</h2>
<ul>
  <li>Le Conseiller lit <b>vos données réelles</b> (deals, cockpit, book, prix, Platts) via des outils en <b>lecture seule</b> — il ne modifie jamais rien, il recommande et explique.</li>
  <li><b>Professeur intégré :</b> il explique toutes les notions de la plateforme à partir du glossaire officiel (~50 notions : MOP, basis risk, contango, Worldscale, démurrage, LC/MT700/UCP 600, points de terme, P&amp;L 3 niveaux…) — définition, usage dans AMKO, exemple chiffré, pièges. Demandez simplement <i>« c'est quoi… ? »</i>.</li>
  <li><b>Conseil selon le marché :</b> il analyse la tendance des cotations Platts importées (variation 5/20 séances, volatilité), la croise avec votre exposition ouverte et chiffre l'impact par scénario avant de recommander (hedger N lots, rouler, repricer, couvrir le change… ou ne rien faire).</li>
  <li>Exemples de questions efficaces : <i>« Conseille-moi selon le marché actuel »</i> · <i>« Explique-moi le basis risk avec un exemple »</i> · <i>« Analyse mon book de position »</i> · <i>« Que manque-t-il au deal D… pour signer ? »</i> · <i>« Compare forward et option pour couvrir 18 M USD/XOF sur 42 jours »</i>.</li>
  <li>Donnez l'ID du deal quand vous le connaissez ; sinon le Conseiller liste vos deals lui-même. Pour un conseil marché pertinent, importez le Platts du jour au préalable.</li>
  <li><b>Prérequis :</b> le chat passe par l'API du déploiement — utilisez la version en ligne (Vercel). En local pur, le reste de la plateforme fonctionne, pas le chat.</li>
</ul>

<h2>6. Données, sauvegardes et exports</h2>
<table>
  <tr><th>Quoi</th><th>Où</th><th>Usage</th></tr>
  <tr><td>Sauvegarde complète des deals (JSON)</td><td>Mes deals → Sauvegarder JSON (ou Mon profil)</td><td><b>Backup de référence</b> : conserve hedge, fret, P&amp;L, LC, tout. Ré-importable à l'identique.</td></tr>
  <tr><td>Export tableur des deals (CSV)</td><td>Mes deals → Exporter CSV</td><td>Liste à plat pour Excel (sans les sous-objets).</td></tr>
  <tr><td>Book de position (Excel, 5 feuilles)</td><td>Book de position → Exporter Excel</td><td>Reporting position/MtM/P&amp;L/contreparties.</td></tr>
  <tr><td>Deal ticket (impression/PDF)</td><td>Cockpit → Deal ticket</td><td>Dossier complet d'un deal.</td></tr>
  <tr><td>Journal d'audit (CSV)</td><td>Blotter → Exporter CSV</td><td>Piste d'audit horodatée.</td></tr>
  <tr><td>Cette notice (impression/PDF)</td><td>Notice d'utilisation → Imprimer</td><td>Support de formation.</td></tr>
</table>
<div class="warn">Les données vivent dans le navigateur : <b>1 navigateur = 1 base</b>. Pour changer de poste, exportez le JSON puis ré-importez-le. Les mots de passe sont hachés en PBKDF2 (aucun mot de passe en clair).</div>

<h2>7. Dépannage rapide</h2>
<table>
  <tr><th>Symptôme</th><th>Cause &amp; solution</th></tr>
  <tr><td>MtM « — » dans le Book</td><td>Aucun prix marché pour ce produit : saisissez-le dans la carte « Prix marché actuel » du Book (ou au Dashboard).</td></tr>
  <tr><td>Le deal ticket ne s'ouvre pas</td><td>Popup bloquée : autorisez les fenêtres pop-up pour le site.</td></tr>
  <tr><td>Le Conseiller affiche une erreur API</td><td>Vous êtes en local : utilisez la version déployée (le chat a besoin de /api/chat).</td></tr>
  <tr><td>Le MOP n'affiche rien dans Nouveau deal</td><td>Pas de données Platts pour ce code/date : importez le fichier Excel couvrant la période (Import Platts).</td></tr>
  <tr><td>« Hedge validé » absent du P&amp;L</td><td>Le hedge doit être <b>validé</b> dans Hedging (bouton Valider &amp; sauvegarder), pas seulement calculé.</td></tr>
  <tr><td>Checklist cockpit : « Validation FX manquante »</td><td>Ouvrez FX Pricing depuis la ligne, cliquez Calculer puis Sauvegarder.</td></tr>
  <tr><td>Un utilisateur ne peut pas créer de deal</td><td>Rôle Viewer = lecture seule. Un admin peut changer le rôle dans Utilisateurs.</td></tr>
</table>

<div class="footer">AMKO TRADING Platform — notice v2.0 · juillet 2026 · générée par la plateforme</div>
</body></html>`;

export default function Guide() {
  const frameRef = useRef(null);

  const print = () => {
    try { frameRef.current?.contentWindow?.print(); }
    catch { window.print(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-700 dark:text-blue-400" /> Notice d'utilisation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Guide complet de la plateforme — avec l'exemple Vitol → Lomé traité de A à Z. Imprimable en PDF.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Printer} onClick={print}>
          Imprimer / PDF
        </Button>
      </div>

      <iframe
        ref={frameRef}
        title="Notice d'utilisation AMKO Trading"
        srcDoc={NOTICE_HTML}
        className="w-full h-[78vh] bg-white rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
      />
    </div>
  );
}
