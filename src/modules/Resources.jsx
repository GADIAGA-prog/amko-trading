import React from 'react';
import {
  DollarSign, TrendingUp, Anchor, Ship, Newspaper,
  BookOpen, ShieldAlert, Activity, ExternalLink, Lightbulb, Info, Layers,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Row } from '../components/UI.jsx';

const LINKS = [
  {
    category: 'Agences de prix (Price Reporting Agencies)',
    icon: DollarSign, color: 'text-amber-700 dark:text-amber-400',
    items: [
      { name: 'S&P Global Platts', desc: 'Référence mondiale — FOB Med, CIF NWE, FOB ARA, Brent Dated', url: 'https://www.spglobal.com/commodity-insights/en' },
      { name: 'Argus Media', desc: "Très utilisée pour Afrique de l'Ouest, diesel, essence, fuel oil, LPG", url: 'https://www.argusmedia.com/' },
      { name: 'OPIS', desc: 'Référence sur le marché US, downstream', url: 'https://www.opisnet.com/' },
      { name: 'ICIS', desc: 'Pétrochimie et produits raffinés', url: 'https://www.icis.com/' },
    ],
  },
  {
    category: 'Bourses & contrats futures',
    icon: TrendingUp, color: 'text-brand-700 dark:text-brand-400',
    items: [
      { name: 'ICE Futures Europe', desc: 'Brent Crude, ICE Gasoil, Low Sulfur Gasoil, Jet Fuel, Fuel Oil', url: 'https://www.ice.com/products/Futures-Options/Energy' },
      { name: 'CME Group / NYMEX', desc: 'WTI, RBOB, ULSD/Heating Oil, Natural Gas', url: 'https://www.cmegroup.com/markets/energy.html' },
      { name: 'DME (Dubai Mercantile Exchange)', desc: 'DME Oman — référence Moyen-Orient / Asie', url: 'https://www.dubaimerc.com/' },
      { name: 'CME Direct', desc: "Plateforme d'exécution électronique CME", url: 'https://www.cmegroup.com/cme-direct.html' },
    ],
  },
  {
    category: 'Plateformes physiques & brokers',
    icon: Anchor, color: 'text-slate-700 dark:text-slate-300',
    items: [
      { name: 'ICE Chat', desc: 'Standard pour négociations physiques entre traders', url: 'https://www.theice.com/connectivity-and-feeds/ice-chat' },
      { name: 'Trayport', desc: 'Markets énergétiques, accès brokers/exchanges', url: 'https://www.trayport.com/' },
      { name: 'Marex', desc: 'Courtier matières premières', url: 'https://www.marex.com/' },
      { name: 'TP ICAP', desc: 'Broker majeur swaps & produits pétroliers', url: 'https://www.tpicap.com/tpicap/markets/energy' },
      { name: 'BGC Partners', desc: 'Courtier OTC énergie', url: 'https://www.bgcpartners.com/' },
    ],
  },
  {
    category: 'Suivi navires & cargaisons',
    icon: Ship, color: 'text-emerald-700 dark:text-emerald-400',
    items: [
      { name: 'Kpler', desc: 'Mouvements tankers, origine/destination, stocks mondiaux', url: 'https://www.kpler.com/' },
      { name: 'Vortexa', desc: 'Analyse des flux pétroliers temps réel', url: 'https://www.vortexa.com/' },
      { name: 'MarineTraffic', desc: 'Suivi AIS gratuit', url: 'https://www.marinetraffic.com/' },
      { name: 'VesselFinder', desc: 'Tracking navires (alternative)', url: 'https://www.vesselfinder.com/' },
      { name: 'Equasis', desc: 'Vérification gratuite des navires (vetting, sanctions)', url: 'https://www.equasis.org/' },
    ],
  },
  {
    category: 'Information marché',
    icon: Newspaper, color: 'text-indigo-700 dark:text-indigo-400',
    items: [
      { name: 'Bloomberg Terminal', desc: 'Standard du secteur — prix, news, chat, calcul de risques', url: 'https://www.bloomberg.com/professional/' },
      { name: 'LSEG Workspace (Reuters Eikon)', desc: 'Alternative à Bloomberg', url: 'https://www.lseg.com/en/data-analytics/workspace' },
      { name: 'OilPrice.com', desc: 'Actualités gratuites du secteur', url: 'https://oilprice.com/' },
      { name: 'Reuters Energy', desc: 'Fil de news gratuit', url: 'https://www.reuters.com/business/energy/' },
    ],
  },
  {
    category: 'Données officielles (gratuit)',
    icon: BookOpen, color: 'text-teal-700 dark:text-teal-400',
    items: [
      { name: 'EIA', desc: 'Données US complètes — stocks hebdo, prix, prod.', url: 'https://www.eia.gov/' },
      { name: 'IEA', desc: 'Rapports mensuels Oil Market Report', url: 'https://www.iea.org/' },
      { name: 'OPEC', desc: 'MOMR — Monthly Oil Market Report', url: 'https://www.opec.org/opec_web/en/publications/202.htm' },
      { name: 'JODI Oil', desc: 'Joint Organisations Data Initiative — données mondiales', url: 'https://www.jodidata.org/oil/' },
      { name: 'Baker Hughes Rig Count', desc: 'Comptage des rigs — indicateur production future', url: 'https://rigcount.bakerhughes.com/' },
    ],
  },
  {
    category: 'Sanctions & conformité',
    icon: ShieldAlert, color: 'text-red-700 dark:text-red-400',
    items: [
      { name: 'OFAC SDN List', desc: 'Liste consolidée US — vérifier avant toute transaction', url: 'https://sanctionssearch.ofac.treas.gov/' },
      { name: 'UE Consolidated List', desc: 'Sanctions financières UE', url: 'https://webgate.ec.europa.eu/fsd/fsf' },
      { name: 'UK HM Treasury OFSI', desc: 'Sanctions UK', url: 'https://www.gov.uk/government/publications/the-uk-sanctions-list' },
      { name: 'SECO (Suisse)', desc: 'Sanctions suisses', url: 'https://www.seco.admin.ch/seco/en/home/Aussenwirtschaftspolitik_Wirtschaftliche_Zusammenarbeit/Wirtschaftsbeziehungen/exportkontrollen-und-sanktionen/sanktionen-embargos.html' },
    ],
  },
  {
    category: 'ETRM / CTRM',
    icon: Layers, color: 'text-purple-700 dark:text-purple-400',
    items: [
      { name: 'ION Commodities', desc: 'Suite leader CTRM/ETRM (ex-Openlink, Allegro, RightAngle)', url: 'https://iongroup.com/commodities/' },
      { name: 'Allegro Horizon', desc: 'CTRM établi sur les marchés énergétiques', url: 'https://iongroup.com/commodities/allegro/' },
      { name: 'Aspect CTRM', desc: 'CTRM cloud, intéressant pour traders petit/moyen volume', url: 'https://aspectenterprise.com/' },
      { name: 'Eka Software', desc: 'CTRM SaaS', url: 'https://www.ekaplus.com/' },
      { name: 'Brady Technologies', desc: 'CTRM commodities', url: 'https://www.bradyplc.com/' },
    ],
  },
  {
    category: 'Outils techniques & charts',
    icon: Activity, color: 'text-cyan-700 dark:text-cyan-400',
    items: [
      { name: 'TradingView', desc: 'Charts pro gratuits — Brent, WTI, gasoil, etc.', url: 'https://www.tradingview.com/' },
      { name: 'Investing.com Energy', desc: 'Données et analyses gratuites', url: 'https://www.investing.com/commodities/energy' },
      { name: 'Barchart Energy', desc: 'Charts et données futures', url: 'https://www.barchart.com/futures/energy' },
    ],
  },
];

export default function Resources() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hub Ressources & Plateformes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Accès direct à toutes les plateformes professionnelles du trading pétrolier
        </p>
      </div>

      <Card>
        <CardHeader icon={Lightbulb} title="Ensemble minimal pour démarrer (Afrique de l'Ouest, EN590 / Essence / Jet / Fuel Oil)" />
        <CardBody>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <Row label="Prix"                value="Platts + Argus" />
            <Row label="Futures"             value="ICE Futures" />
            <Row label="Broker OTC"          value="TP ICAP ou Marex" />
            <Row label="Suivi navires"        value="Kpler" />
            <Row label="Informations"         value="Bloomberg" />
            <Row label="Gestion contrats"    value="Excel avancé puis CTRM" />
            <Row label="Communication"        value="ICE Chat" />
            <Row label="Vérif gratuite navire" value="Equasis" />
          </div>
        </CardBody>
      </Card>

      {LINKS.map(section => {
        const Icon = section.icon;
        return (
          <Card key={section.category}>
            <CardHeader icon={Icon} title={section.category} />
            <CardBody>
              <div className="grid md:grid-cols-2 gap-3">
                {section.items.map(item => (
                  <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="block p-3 border border-slate-200 dark:border-slate-700 rounded-md hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className={`font-semibold text-sm ${section.color}`}>{item.name}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{item.desc}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 flex-shrink-0 mt-0.5" />
                    </div>
                  </a>
                ))}
              </div>
            </CardBody>
          </Card>
        );
      })}

      <Card>
        <CardHeader icon={Info} title="À savoir sur les accès" />
        <CardBody>
          <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
            <p><b>Platts, Argus, OPIS, Bloomberg, LSEG, Kpler, Vortexa</b> : abonnements payants. Indispensables pour un trading professionnel.</p>
            <p><b>EIA, IEA, OPEC, JODI, Baker Hughes, OFAC, Equasis</b> : gratuits — incontournables comme socle.</p>
            <p><b>TradingView, Investing.com, Barchart</b> : charts et données futures gratuits ou freemium — déjà intégrés dans cette plateforme.</p>
            <p><b>ETRM (ION, Allegro, Aspect)</b> : pour passer d'Excel à un système professionnel quand le volume justifie l'investissement.</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
