// glossary.js — Glossaire officiel des notions de la plateforme AMKO Trading.
// Source unique utilisée par le Conseiller (outil expliquerNotion).
// Chaque entrée : définition courte, usage concret dans AMKO, exemple chiffré.

export const GLOSSARY = [
  // ── PRICING ─────────────────────────────────────────────────────────────
  { terme: 'Platts / Argus / OPIS', cat: 'pricing', aliases: ['platts', 'argus', 'opis', 'agence de cotation'],
    definition: "Agences de cotation qui publient chaque jour les prix de référence des produits pétroliers physiques par qualité et par zone (ex. Gasoil 0,1%S FOB MED). Les contrats physiques se réfèrent à ces cotations plutôt qu'à un prix fixe.",
    dansAmko: "Import Platts charge le fichier Excel quotidien ; Platts Board l'affiche ; Nouveau deal et Lots calculent les moyennes (MOP) dessus.",
    exemple: "Un contrat stipule « moyenne Platts Gasoil FOB MED des 5 jours autour du B/L + 65,62 $/MT »." },
  { terme: 'MOP (Mean of Platts)', cat: 'pricing', aliases: ['mop', 'mean of platts', 'moyenne platts', 'pricing period'],
    definition: "Moyenne des cotations Platts sur une fenêtre convenue au contrat (ex. 5 jours autour du B/L, ou du B/L à la livraison). C'est elle qui fixe le prix final du physique — pas le prix du jour de signature.",
    dansAmko: "Calculateur MOP dans Nouveau deal (fenêtre autour du B/L et période B/L→livraison) et dans Platts Board ; boutons « → Prix achat / vente ».",
    exemple: "MOP 5 j autour du B/L 18/05 = 1 181,75 $/MT ; + prime 65,62 → prix final 1 247,37 $/MT." },
  { terme: 'Marker / benchmark', cat: 'pricing', aliases: ['marker', 'benchmark', 'indice de référence'],
    definition: "Le sous-jacent de référence auquel un produit est indexé : Brent daté, WTI, Dubai, ICE Gasoil, RBOB, ULSD. Le choix du marker détermine sur quoi hedger.",
    dansAmko: "Chaque produit du référentiel a un marker ; l'Optimiseur du cockpit alerte si le marker du deal diverge de la pratique de marché (source de basis risk).",
    exemple: "Le gasoil ouest-africain est ancré sur ICE Gasoil (LGO) ; un brut nigérian comme Bonny Light sur le Brent daté." },
  { terme: 'Différentiel / prime / décote', cat: 'pricing', aliases: ['differentiel', 'différentiel', 'prime', 'decote', 'décote', 'premium'],
    definition: "L'écart, en $/MT ou $/bbl, entre le prix du physique et son marker : il paie la qualité, la localisation, la logistique et la marge du vendeur. Prime (+) ou décote (−).",
    dansAmko: "Champ « Différentiel / prime » du deal ; additionné au MOP par les calculateurs ; contrôlé par le cockpit (seuil ~150 $/MT raffinés, ~10 $/bbl bruts).",
    exemple: "Platts 1 181,75 + prime Vitol 65,62 = 1 247,37 $/MT." },
  { terme: 'Flat price', cat: 'pricing', aliases: ['flat price', 'prix sec', 'prix fixe'],
    definition: "Le niveau absolu du prix (ex. 1 200 $/MT), par opposition au différentiel. Un trader physique hedge le flat price (le gros du risque) et garde le risque de différentiel (le basis).",
    dansAmko: "Le Hedging neutralise le flat price via les futures ; le basis (différentiel) reste le vrai P&L du trader.",
    exemple: "Hedgé à 100 %, une baisse de 100 $/MT du marché ne change plus la marge : seul le différentiel bouge." },
  { terme: 'Contango', cat: 'pricing', aliases: ['contango', 'report'],
    definition: "Structure de courbe où les échéances lointaines cotent PLUS CHER que les proches (marché bien approvisionné). Favorable au roll d'un SHORT hedge, défavorable à un LONG.",
    dansAmko: "Module Rolling : spread M+1→M+2 positif = contango → crédit de roll pour un short hedger.",
    exemple: "M+1 à 82,50 $, M+2 à 82,80 $ → contango de 0,30 $/bbl : rouler 150 lots short rapporte 0,30 × 150 000 bbl = +45 000 $." },
  { terme: 'Backwardation', cat: 'pricing', aliases: ['backwardation', 'déport', 'deport'],
    definition: "Structure inverse du contango : les échéances proches cotent plus cher que les lointaines (tension sur l'offre immédiate). Favorable au roll d'un LONG hedge, coûteuse pour un SHORT.",
    dansAmko: "Module Rolling : spread négatif = backwardation → coût de roll pour un short hedger, à intégrer au P&L du hedge (roll cumulé).",
    exemple: "M+1 à 84,00 $, M+2 à 83,40 $ → rouler un short de 100 lots coûte 0,60 × 100 000 = −60 000 $." },
  { terme: 'Crack spread', cat: 'pricing', aliases: ['crack', 'crack spread', 'marge de raffinage'],
    definition: "Écart entre le prix d'un produit raffiné et celui du brut (converti dans la même unité) : c'est la marge de raffinage implicite. Sert à jauger si un produit est « cher » relativement au brut.",
    dansAmko: "Platts Board (section Spreads & cracks) calcule les écarts physiques entre codes importés.",
    exemple: "Gasoil 1 100 $/MT ≈ 146,7 $/bbl (÷7,5) contre Brent 84 $/bbl → crack ≈ +62,7 $/bbl." },
  { terme: 'Mark-to-Market (MtM)', cat: 'pricing', aliases: ['mtm', 'mark to market', 'valorisation au marché', 'p&l latent'],
    definition: "Valorisation d'une position ouverte au prix actuel du marché : le gain/perte LATENT si on débouclait aujourd'hui. Différent du P&L réalisé (validé).",
    dansAmko: "Book de position : MtM par deal et par produit à partir des prix de référence saisis ; le P&L total = P&L validé + MtM latent.",
    exemple: "Vendu 15 000 MT à 1 215,24 quand le marché vaut 1 100 → MtM latent +1 728 600 $ (position non encore débouclée)." },
  { terme: 'Notional', cat: 'pricing', aliases: ['notionnel', 'notional', 'valeur nominale'],
    definition: "Valeur faciale d'une position : quantité × prix. Mesure la taille de l'exposition (et du besoin de financement), pas le risque net.",
    dansAmko: "Affiché au Dashboard, au Book (par deal et par contrepartie — concentration crédit) et pré-rempli comme notionnel FX.",
    exemple: "15 000 MT × 1 215,24 $/MT = 18,23 M$ de notional." },
  { terme: 'Facteur bbl/MT', cat: 'pricing', aliases: ['bbl/mt', 'baril par tonne', 'conversion baril tonne', 'bbl per mt'],
    definition: "Nombre de barils par tonne métrique, propre à chaque produit (densité) : ~7,45 pour le Brent, 7,5 pour le gasoil, 8,5 pour l'essence, 11-12,5 pour les GPL. Indispensable pour convertir MT physiques en lots futures.",
    dansAmko: "Référentiel PRODUCTS ; utilisé par Hedging, Pricing et le Book pour toutes les conversions.",
    exemple: "15 000 MT de gasoil × 7,5 = 112 500 bbl." },

  // ── DEAL ────────────────────────────────────────────────────────────────
  { terme: 'Incoterm (FOB, CFR, CIF, DAP…)', cat: 'deal', aliases: ['incoterm', 'fob', 'cif', 'cfr', 'dap', 'des'],
    definition: "Règles ICC définissant qui, du vendeur ou de l'acheteur, paie et supporte le risque du transport, de l'assurance et de la livraison. FOB : l'acheteur prend le risque au chargement ; CFR/CIF : le vendeur paie le fret (± assurance) ; DAP : le vendeur livre à destination.",
    dansAmko: "Champ Incoterm du deal ; le cockpit croise incoterm et paiement (ex. CIF + open credit = double risque signalé).",
    exemple: "Achat FOB Augusta + revente DAP Lomé : vous portez fret, assurance et risque pendant le voyage — d'où le calcul de fret obligatoire." },
  { terme: 'Laycan', cat: 'deal', aliases: ['laycan', 'laydays'],
    definition: "Fenêtre contractuelle (laydays/cancelling) pendant laquelle le navire doit se présenter au chargement. Trop large = incertitude opérationnelle ; dépassée = droit d'annuler.",
    dansAmko: "Champs laycan début/fin du deal ; le cockpit alerte si le laycan approche sans contrat signé ou s'il est dépassé sans mise à jour du statut.",
    exemple: "Laycan 18–22/05 : le navire doit tender NOR dans cette fenêtre, sinon le vendeur peut annuler." },
  { terme: 'B/L (Bill of Lading)', cat: 'deal', aliases: ['bl', 'b/l', 'bill of lading', 'connaissement'],
    definition: "Le connaissement : document émis au chargement, à la fois preuve d'expédition, contrat de transport et TITRE DE PROPRIÉTÉ de la cargaison. Sa date déclenche le pricing MOP et les délais de paiement.",
    dansAmko: "Champ Date B/L ; base du calculateur MOP et de l'échéance de paiement estimée (ex. J+30 après B/L) au cockpit.",
    exemple: "B/L du 18/05 + paiement J+30 → encaissement attendu ~17/06, suivi automatiquement dans l'échéancier." },
  { terme: 'Tolérance (±%)', cat: 'deal', aliases: ['tolerance', 'tolérance', 'moloo'],
    definition: "Marge de quantité admise au contrat (souvent ±5 %, à l'option du vendeur ou de l'acheteur). Une tolérance large fragilise le calcul de marge et le dimensionnement du hedge.",
    dansAmko: "Champ Tolérance du deal ; le cockpit signale au-delà de ±10 %.",
    exemple: "15 000 MT ±5 % : la livraison réelle peut aller de 14 250 à 15 750 MT — le hedge de 150 lots couvre la quantité nominale." },
  { terme: 'Tier de contrepartie', cat: 'deal', aliases: ['tier', 'contrepartie', 'first-class', 'counterparty'],
    definition: "Classement interne de la qualité de crédit d'une contrepartie : first-class (majors, top traders), solid (investment grade), standard, à risque. Il conditionne les termes de paiement acceptables.",
    dansAmko: "Champ du deal ; la matrice des risques et le cockpit croisent tier et paiement (open credit réservé aux first-class).",
    exemple: "Vitol = first-class → LC at sight confortable ; un acheteur « standard » exigera une LC confirmée par une banque de premier rang." },
  { terme: 'Cycle de vie du deal (6 statuts)', cat: 'deal', aliases: ['statut', 'cycle de vie', 'workflow', 'pipeline'],
    definition: "Ouvert (négociation) → Contractualisé (SPA signé) → Financé (LC ouverte) → Chargé (B/L émis) → Déchargé (livré) → Soldé (payé, clos). Chaque étape a ses contrôles.",
    dansAmko: "Pipeline visuel du cockpit, statut modifiable sur place ; les alertes dépendent du statut (ex. laycan passé mais toujours « contractualisé »).",
    exemple: "Passer à « Chargé » dès l'émission du B/L déclenche le suivi du paiement dans l'échéancier." },
  { terme: 'Back-to-back', cat: 'deal', aliases: ['back to back', 'back-to-back', 'adossé'],
    definition: "Montage où l'achat et la revente sont conclus (quasi) simultanément : la marge est verrouillée sur le différentiel des deux contrats, le risque de flat price est porté puis couvert le temps du voyage.",
    dansAmko: "Deux deals liés (achat + vente) ; le P&L consolidé se saisit sur le deal de vente avec les deux jambes ; le hedge porte sur la jambe exposée.",
    exemple: "Achat FOB 1 247,37 + vente DAP 1 215,24 : marge commerciale négative, mais le SHORT futures (+2,19 M$) capte la baisse du marché → marge nette +1,17 M$." },
  { terme: 'Deal ticket', cat: 'deal', aliases: ['deal ticket', 'ticket'],
    definition: "Le dossier récapitulatif d'un deal : identité, pricing, couvertures, logistique, P&L, checklist et décision. Sert d'archive, de support de validation interne et de document de passation.",
    dansAmko: "Bouton « Deal ticket » du cockpit → document imprimable/PDF complet.",
    exemple: "À archiver à chaque étape clé : signature, chargement, solde." },
  { terme: 'Blotter', cat: 'deal', aliases: ['blotter', 'journal', 'piste d\'audit', 'audit'],
    definition: "Journal horodaté de toutes les opérations du desk : qui a fait quoi, quand, sur quel deal. Indispensable pour l'audit, la conformité et la reconstitution d'un dossier.",
    dansAmko: "Onglet Blotter / Journal : chaque action (création, hedge, fret, P&L, LC, statut…) y est tracée automatiquement ; export CSV ; historique visible par deal au cockpit.",
    exemple: "« 07/07 14:32 — HEDGE — D-VITOL — Hedge validé : SHORT 150 lots ICE Gasoil »." },
  { terme: 'Score de complétude & verdict GO/NO-GO', cat: 'deal', aliases: ['score', 'verdict', 'go/no-go', 'go no go', 'checklist'],
    definition: "Mesure de l'avancement du dossier (checklist « bon deal ») et décision synthétique : GO (tout est vert), GO SOUS CONDITIONS (points à lever), NO-GO (bloquant : sanctions, marge négative, NO-GO FX…), INCOMPLET.",
    dansAmko: "Calculés en continu par le cockpit à partir de ce que chaque module a réellement enregistré dans le deal.",
    exemple: "Un deal à 85 % avec « validation FX manquante » passe GO sous conditions : la checklist pointe le module à ouvrir." },

  // ── HEDGE ───────────────────────────────────────────────────────────────
  { terme: 'Hedging (couverture prix)', cat: 'hedge', aliases: ['hedge', 'hedging', 'couverture'],
    definition: "Neutraliser le risque de variation du flat price d'une position physique en prenant la position INVERSE sur les futures : long physique → short futures, short physique → long futures.",
    dansAmko: "Module Hedging : conversion MT → lots, sens recommandé, P&L de couverture, sauvegarde dans le deal (repris au P&L niveau 3).",
    exemple: "Achat 15 000 MT de gasoil → VENDRE 150 lots ICE Gasoil ; si le marché baisse de 146 $/MT, le physique perd mais le futures gagne ~2,19 M$." },
  { terme: 'Hedge ratio', cat: 'hedge', aliases: ['hedge ratio', 'ratio de couverture'],
    definition: "Part de l'exposition physique couverte par les futures (0–100 %). 80–100 % en règle générale une fois le contrat signé ; 0 % est un choix directionnel assumé (ou un back-to-back déjà couvert ailleurs).",
    dansAmko: "Champ du deal + paramètre du module Hedging ; le cockpit alerte si un deal contractualisé reste sous-couvert.",
    exemple: "Ratio 100 % sur 15 000 MT = 150 lots ; ratio 80 % = 120 lots (risque résiduel 3 000 MT)." },
  { terme: 'Lot / contrat futures', cat: 'hedge', aliases: ['lot', 'contrat futures', 'futures', 'ice brent', 'ice gasoil', 'nymex'],
    definition: "Unité de négociation standardisée d'une bourse : ICE Brent = 1 000 bbl/lot, ICE Gasoil = 100 MT/lot, NYMEX WTI = 1 000 bbl, RBOB/ULSD = 42 000 gal. On ne peut acheter/vendre que des lots entiers → sur/sous-couverture résiduelle.",
    dansAmko: "Référentiel CONTRACTS ; Hedging calcule les lots théoriques puis arrondit et signale l'écart.",
    exemple: "112 500 bbl ÷ 1 000 = 112,5 → 112 ou 113 lots Brent ; en ICE Gasoil (MT) : 15 000 ÷ 100 = 150 lots exactement." },
  { terme: 'Short hedge / Long hedge', cat: 'hedge', aliases: ['short', 'long', 'short hedge', 'long hedge', 'sens du hedge'],
    definition: "SHORT hedge : vendre des futures pour protéger un stock ou un achat physique (long). LONG hedge : acheter des futures pour protéger une vente à prix fixe non encore approvisionnée (short).",
    dansAmko: "Sélecteur « Sens du hedge » du module Hedging ; pré-déduit du sens du deal lié.",
    exemple: "Achat Vitol (long physique) → SHORT 150 lots ; vente à prix fixe sans stock → LONG futures." },
  { terme: 'Basis risk', cat: 'hedge', aliases: ['basis', 'basis risk', 'risque de base'],
    definition: "Risque résiduel quand le sous-jacent du hedge n'est pas exactement le produit physique : l'écart (base) entre les deux peut bouger. On neutralise le flat price, pas la base.",
    dansAmko: "Signalé en rouge par Hedging et le cockpit quand le marker du produit ≠ marker du contrat (ex. jet hedgé sur ICE Gasoil).",
    exemple: "Jet A1 hedgé en ICE Gasoil : si le regrade jet/gasoil s'élargit de 10 $/MT, le hedge ne le compense pas." },
  { terme: 'Roll (rolling)', cat: 'hedge', aliases: ['roll', 'rolling', 'roulement'],
    definition: "Déplacer une position futures de l'échéance proche vers une plus lointaine avant expiration (racheter M+1 / revendre M+2 pour un short). Le coût ou crédit dépend de la structure (contango/backwardation).",
    dansAmko: "Module Rolling : calcul du roll, historique par deal, roll cumulé repris automatiquement dans le P&L du hedge.",
    exemple: "Short 150 lots roulé avec spread +0,30 $/bbl → crédit +45 000 $ ajouté au « roll cumulé » du deal." },
  { terme: 'Exposition ouverte', cat: 'hedge', aliases: ['exposition', 'exposition ouverte', 'open exposure', 'position ouverte'],
    definition: "Ce qui reste exposé au marché APRÈS couverture : position physique signée + hedge signé. Une exposition ouverte ≈ 0 signifie flat price neutralisé.",
    dansAmko: "Book de position : « Ouvert net (bbl) » par marker et par deal, converti en lots équivalents ; alerte sur les deals non couverts.",
    exemple: "Achat 112 500 bbl couvert par short 112 500 bbl → ouvert 0 ; la vente non hedgée du back-to-back affiche −112 500 bbl." },

  // ── FX ──────────────────────────────────────────────────────────────────
  { terme: 'Forward ferme (FX)', cat: 'fx', aliases: ['forward', 'forward ferme', 'change à terme', 'terme'],
    definition: "Engagement FERME d'acheter/vendre une devise à un taux fixé aujourd'hui pour une date future. Verrouille le taux (protection totale) mais renonce à tout gain si le spot évolue favorablement.",
    dansAmko: "Module Couverture FX : taux théorique par parité des taux d'intérêt, spread bancaire, commission, coût d'opportunité du dépôt — coût total repris au P&L niveau 3.",
    exemple: "Vente payée en XOF dans 42 j : forward USD/XOF sur 18,2 M USD ; coût total ≈ 37 000 $ pour un taux garanti." },
  { terme: 'Points de terme (swap points)', cat: 'fx', aliases: ['points de terme', 'swap points', 'report', 'déport fx', 'parité des taux'],
    definition: "Écart entre taux forward et spot, découlant du DIFFÉRENTIEL DE TAUX D'INTÉRÊT entre les deux devises (parité couverte) : Forward = Spot × (1 + r_dom×T/360)/(1 + r_étr×T/360). Ce n'est pas une prévision du marché.",
    dansAmko: "Calculés par Couverture FX (théorique vs marché) ; l'écart au théorique révèle la marge de la banque.",
    exemple: "Spot 600, r_XOF 3,5 %, r_USD 5,25 %, 42 j → forward théorique ≈ 598,8 (déport : le USD à taux plus haut cote moins cher à terme)." },
  { terme: 'Parité fixe EUR/XOF', cat: 'fx', aliases: ['xof', 'cfa', 'eur/xof', 'franc cfa', '655.957', '655,957'],
    definition: "Le franc CFA (XOF/XAF) est arrimé à l'euro au taux FIXE de 655,957. Le vrai risque de change d'un flux XOF est donc le risque EUR/USD, traduit en USD/XOF implicite (USD/XOF ≈ 655,957 ÷ EUR/USD).",
    dansAmko: "Constante de la plateforme ; FX Pricing et Couverture FX raisonnent sur ce triangle USD/EUR/XOF.",
    exemple: "EUR/USD 1,08 → USD/XOF implicite ≈ 607,4 ; si l'euro monte à 1,12, le USD/XOF tombe à ~585,7 : un encaissement XOF vaut moins de dollars." },
  { terme: 'Option de change', cat: 'fx', aliases: ['option', 'option de change', 'call devise', 'put devise'],
    definition: "DROIT (non obligation) d'acheter (call) ou vendre (put) une devise à un taux fixé (strike), contre paiement d'une prime immédiate. Protège comme un forward mais laisse profiter d'une évolution favorable — au prix de la prime.",
    dansAmko: "Deuxième instrument du module Couverture FX : prime, breakeven, taux effectif si exercée/non exercée, comparaison forward vs option par scénarios.",
    exemple: "Prime 2 % sur 18,2 M USD = 364 500 $ : si le spot finit meilleur que le strike, on abandonne l'option et on garde le gain, net de la prime." },
  { terme: 'Strike & breakeven (option)', cat: 'fx', aliases: ['strike', 'breakeven', 'prix d\'exercice', 'point mort'],
    definition: "Strike : taux d'exercice de l'option. Breakeven : niveau où l'option devient rentable = strike + coût total ramené au notionnel (prime + courtage). Entre les deux, le forward aurait été préférable.",
    dansAmko: "Affichés par le comparatif de Couverture FX pour chaque scénario de spot à l'échéance.",
    exemple: "Strike 600 + coûts 2,05/unité → breakeven 602,05 : l'option ne « bat » le spot initial qu'au-delà." },
  { terme: 'Arbitrage de devise (facturation)', cat: 'fx', aliases: ['arbitrage', 'arbitrage devise', 'devise de facturation'],
    definition: "Choisir la combinaison devise d'achat × devise de vente qui maximise la marge une fois tout converti dans la devise de marge, aux taux spot ET forward. Peut faire gagner plusieurs $/MT sans toucher au physique.",
    dansAmko: "FX Pricing teste 6 combinaisons USD/EUR/XOF et recommande la meilleure, avec le montant à couvrir et le taux forward correspondant.",
    exemple: "Vendre en XOF plutôt qu'en USD peut améliorer la marge si le forward EUR/USD est porteur — l'outil chiffre l'écart." },
  { terme: 'Stress test FX', cat: 'fx', aliases: ['stress', 'stress test', 'scénarios fx', 'choc fx'],
    definition: "Rejouer l'économie du deal avec des chocs de change (±1/3/5 %) sur les paires exposées pour vérifier que la marge SURVIT au pire scénario raisonnable.",
    dansAmko: "FX Pricing choque toutes les paires exposées (deux jambes) ; le verdict passe en conditions si la marge devient négative au pire cas ; un book 100 % USD affiche « pas d'exposition ».",
    exemple: "Marge 1,17 M$ mais −0,3 M$ à −5 % sur USD/XOF → couvrir le change avant de signer." },

  // ── FRET ────────────────────────────────────────────────────────────────
  { terme: 'Worldscale (WS)', cat: 'fret', aliases: ['worldscale', 'ws', 'points ws', 'flat rate'],
    definition: "Barème mondial du fret pétrolier : un « flat rate » en $/tonne est publié par route ; le marché cote en POINTS WS (% de ce flat). Fret = flat × WS/100 × tonnage, moins la commission d'adresse.",
    dansAmko: "Module Fret (WS) : flat rate, points WS, commission, SECA, autres coûts → total et $/MT sauvegardés dans le deal.",
    exemple: "Flat 18,46 $/t × WS 80 × (1 − 1,25 %) /100 × 30 000 t = 437 502 $." },
  { terme: 'Commission d\'adresse', cat: 'fret', aliases: ['commission', 'address commission', 'adcom'],
    definition: "Remise (souvent 1,25–3,75 %) consentie par l'armateur à l'affréteur, calculée en % du fret brut — pas en points WS.",
    dansAmko: "Champ dédié du module Fret, appliquée correctement en pourcentage du fret.",
    exemple: "Fret brut 443 040 $ × 1,25 % = 5 538 $ de commission → net 437 502 $." },
  { terme: 'Lumpsum', cat: 'fret', aliases: ['lumpsum', 'forfait fret'],
    definition: "Fret négocié en MONTANT FORFAITAIRE pour le voyage, quel que soit le tonnage exact chargé (dans les limites du contrat). Simple et prévisible.",
    dansAmko: "Second mode du module Fret ; divisé par le tonnage pour obtenir le $/MT.",
    exemple: "Lumpsum 450 000 $ pour 15 000 MT = 30 $/MT." },
  { terme: 'Démurrage', cat: 'fret', aliases: ['demurrage', 'démurrage', 'surestaries', 'laytime'],
    definition: "Indemnité due à l'armateur quand le chargement/déchargement dépasse le temps de planche (laytime) contractuel, facturée au taux journalier du charter party.",
    dansAmko: "Champs heures × taux du module Fret ; estimation reprise dans les coûts du P&L.",
    exemple: "36 h de dépassement à 25 000 $/jour = 37 500 $." },
  { terme: 'SECA', cat: 'fret', aliases: ['seca', 'eca', 'zone soufre'],
    definition: "Zones maritimes à émissions contrôlées (Manche, Baltique…) où le navire doit brûler un fuel à très basse teneur en soufre, plus cher : surcoût par mille parcouru dans la zone.",
    dansAmko: "Champs milles SECA × surcoût du module Fret.",
    exemple: "400 nm en SECA à 12 $/nm = 4 800 $ ajoutés au fret." },
  { terme: 'Classes de navires (MR, LR, Aframax…)', cat: 'fret', aliases: ['mr', 'lr1', 'lr2', 'aframax', 'suezmax', 'vlcc', 'panamax', 'handysize', 'navire', 'tanker'],
    definition: "Tailles standards de tankers : Handysize (25-39 kt), MR (40-55 kt), LR1/Panamax (55-80), LR2/Aframax (80-120), Suezmax (120-200), VLCC (200-350), ULCC (>350). Le choix conditionne fret, ports accessibles et lot économique.",
    dansAmko: "Champ « Type de navire » du deal ; un MR est typique pour 15-40 kt de produits raffinés vers l'Afrique de l'Ouest.",
    exemple: "15 000 MT de gasoil → MR ; 130 000 t de brut → Suezmax." },

  // ── FINANCEMENT & RISQUE ────────────────────────────────────────────────
  { terme: 'Lettre de crédit (LC)', cat: 'finance', aliases: ['lc', 'lettre de credit', 'lettre de crédit', 'credoc', 'documentary credit'],
    definition: "Engagement IRRÉVOCABLE d'une banque de payer le vendeur contre présentation de documents strictement conformes (facture, B/L, certificats). Sécurise le paiement : le risque devient bancaire et documentaire, plus commercial.",
    dansAmko: "Champ paiement du deal + LC Checker (22 champs MT700) lié au deal ; la banque émettrice est notée (rating) et contrôlée.",
    exemple: "« LC at sight » : paiement à présentation conforme, ~5 jours ouvrés après documents." },
  { terme: 'MT700', cat: 'finance', aliases: ['mt700', 'swift mt700'],
    definition: "Message SWIFT normalisé d'émission d'une lettre de crédit documentaire. Ses champs numérotés (40A forme, 31D expiration, 44C latest shipment, 45A marchandise, 46A documents…) sont LA référence à vérifier ligne par ligne.",
    dansAmko: "LC Checker parcourt les 22 champs critiques avec les valeurs attendues (IRREVOCABLE, UCP LATEST VERSION…) et sauvegarde la progression dans le deal.",
    exemple: "45A doit reprendre la description marchandise MOT POUR MOT sur la facture, sinon réserve bancaire." },
  { terme: 'UCP 600', cat: 'finance', aliases: ['ucp', 'ucp 600', 'rug 600'],
    definition: "Règles et usances uniformes de l'ICC régissant les crédits documentaires (édition 600). Elles définissent la conformité documentaire, les délais bancaires (5 jours ouvrés d'examen) et les obligations de chaque banque.",
    dansAmko: "Le champ 40E de la LC doit citer « UCP LATEST VERSION » — contrôlé par LC Checker.",
    exemple: "Sous UCP 600, une divergence d'orthographe mineure peut suffire à une réserve : d'où la checklist systématique." },
  { terme: 'SBLC', cat: 'finance', aliases: ['sblc', 'standby', 'standby lc'],
    definition: "Standby Letter of Credit : garantie bancaire de DÉFAUT — elle n'est tirée que si l'acheteur ne paie pas par le canal normal. Moins lourde documentairement qu'une LC classique.",
    dansAmko: "Option des conditions de paiement ; considérée comme paiement sécurisé par le verdict.",
    exemple: "Open credit adossé à une SBLC de banque AA : paiement fluide + filet de sécurité." },
  { terme: 'LC at sight vs différée', cat: 'finance', aliases: ['at sight', 'sight', 'differee', 'différée', 'usance', 'deferred'],
    definition: "At sight : la banque paie dès les documents conformes. Différée (usance 30/60/90 j) : paiement à échéance après B/L — l'acheteur gagne du délai, le vendeur porte (ou escompte) la créance.",
    dansAmko: "Choix des conditions de paiement ; l'échéancier du cockpit estime la date d'encaissement (B/L + délai) et alerte si dépassée.",
    exemple: "« J+30 après B/L » sur B/L 18/05 → paiement attendu ~17/06 ; escomptable auprès de la banque contre intérêts." },
  { terme: 'Confirmation de LC', cat: 'finance', aliases: ['confirmation', 'lc confirmée', 'confirmed lc'],
    definition: "Une seconde banque (souvent au pays du vendeur) ajoute SON engagement de payer : le vendeur est protégé même si la banque émettrice ou son pays fait défaut. Indispensable si la banque émettrice est faible.",
    dansAmko: "Le cockpit exige la confirmation quand le rating de la banque émettrice est BB ou inférieur.",
    exemple: "LC émise par une banque locale notée BB → faire confirmer par une banque internationale de premier rang." },
  { terme: 'Trade finance / coût de financement', cat: 'finance', aliases: ['trade finance', 'financement', 'borrowing base', 'escompte'],
    definition: "Le portage financier de la cargaison entre paiement fournisseur et encaissement client : frais et intérêts de LC, avances sur stock, escompte de créance. C'est le 2e niveau du P&L.",
    dansAmko: "Bloc « Financement » du module P&L (instrument + coût) → P&L 2 = P&L 1 − financement.",
    exemple: "18,7 M$ portés 45 jours à ~4,8 % ≈ 112 000 $ ; dans l'exemple simplifié de la notice : 25 000 $ de frais LC." },
  { terme: 'P&L à 3 niveaux', cat: 'finance', aliases: ['p&l', 'pnl', 'marge brute', 'marge nette', '3 niveaux'],
    definition: "P&L 1 (marge brute) = (vente − achat) × MT − coûts directs (fret, inspection, assurance, démurrage). P&L 2 = P&L 1 − financement. P&L 3 (marge nette) = P&L 2 + résultat hedge + résultat FX. Le niveau 3 est la vérité économique du deal.",
    dansAmko: "Module P&L (hedge et FX repris automatiquement des modules) ; validé dans le deal, affiché au cockpit, consolidé au Book.",
    exemple: "P&L1 −954 950 → P&L2 −979 950 → +hedge 2 187 450 − FX 37 000 = P&L3 +1 170 500 $ (+78,03 $/MT)." },
  { terme: 'Matrice des risques', cat: 'risque', aliases: ['matrice', 'matrice des risques', 'risk matrix', 'probabilité gravité'],
    definition: "Cartographie probabilité × gravité des 10 familles de risque d'un deal (prix, crédit, performance, qualité, quantité, logistique, documentaire, pays/sanctions, bancaire, QHSE), avec mitigations et couvertures recommandées.",
    dansAmko: "Module Risques : score automatique à partir des champs du deal, enregistré dans le deal et repris par le cockpit.",
    exemple: "Score 34 « Élevé » avec blocage « banque BB non confirmée » → NO-GO temporaire jusqu'à confirmation." },
  { terme: 'Sanctions (OFAC / UE)', cat: 'risque', aliases: ['sanctions', 'ofac', 'embargo', 'sdn'],
    definition: "Régimes de sanctions (OFAC américain, UE, UK) interdisant de commercer avec certains pays, entités, navires ou personnes. Une violation expose à des amendes majeures et à la perte d'accès bancaire — contrôle non négociable.",
    dansAmko: "Le pays de la contrepartie est filtré contre une liste sensible ; toute alerte = vérification OFAC SDN / UE / navire (Equasis) avant d'avancer.",
    exemple: "Contrepartie domiciliée dans un pays listé → alerte rouge au cockpit et blocage du verdict." },
];

// ── Recherche d'une notion (insensible aux accents/majuscules) ─────────────
const norm = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim();

export function lookupNotion(query) {
  const q = norm(query);
  if (!q) {
    return {
      notionsDisponibles: GLOSSARY.reduce((acc, g) => {
        (acc[g.cat] ||= []).push(g.terme);
        return acc;
      }, {}),
      note: 'Aucun terme fourni — voici toutes les notions du glossaire, par catégorie.',
    };
  }
  const scored = GLOSSARY.map(g => {
    const hay = [g.terme, ...(g.aliases || [])].map(norm);
    let score = 0;
    if (hay.some(h => h === q)) score = 3;
    else if (hay.some(h => h.includes(q) || q.includes(h))) score = 2;
    else if (norm(g.definition).includes(q)) score = 1;
    return { g, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return {
      error: `Notion « ${query} » absente du glossaire AMKO.`,
      notionsDisponibles: GLOSSARY.map(g => g.terme),
      note: "Explique avec tes connaissances de trader senior en précisant que la définition ne vient pas du glossaire, et propose les notions proches ci-dessus.",
    };
  }
  const best = scored[0].g;
  const liees = GLOSSARY
    .filter(g => g.cat === best.cat && g.terme !== best.terme)
    .slice(0, 4)
    .map(g => g.terme);
  const autresResultats = scored.slice(1, 4).map(x => x.g.terme);
  return { notion: best, notionsLiees: liees, autresCorrespondances: autresResultats };
}
