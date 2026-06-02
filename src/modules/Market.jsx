import React, { useState } from 'react';
import { Activity, Newspaper } from 'lucide-react';
import { TV_SYMBOLS } from '../constants.js';
import { Card, CardHeader, CardBody } from '../components/UI.jsx';
import { TVAdvancedChart, TVMiniChart, TVTimeline, TVEconCalendar } from '../components/TradingViewWidgets.jsx';

export default function Market() {
  const [selected, setSelected] = useState('TVC:UKOIL');
  const [interval, setIntv] = useState('60');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Marché — temps réel</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cotations live des principaux benchmarks pétroliers (données TradingView)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(TV_SYMBOLS).map(([k, s]) => (
          <button key={k} onClick={() => setSelected(s.symbol)}
            className={`px-4 py-2 rounded-md text-sm font-medium border transition text-left ${
              selected === s.symbol
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}>
            {s.name}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader icon={Activity} title="Chart avancé"
          subtitle={Object.values(TV_SYMBOLS).find(s => s.symbol === selected)?.name || 'Marché'}
          action={
            <div className="flex gap-1">
              {['15', '60', 'D', 'W'].map(t => (
                <button key={t} onClick={() => setIntv(t)}
                  className={`px-3 py-1 text-xs rounded ${
                    interval === t
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}>
                  {t === '15' ? '15m' : t === '60' ? '1h' : t === 'D' ? '1j' : '1s'}
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          <TVAdvancedChart symbol={selected} interval={interval} height={550} />
        </CardBody>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Aperçu global</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.values(TV_SYMBOLS).map(s => (
            <TVMiniChart key={s.symbol} symbol={s.symbol} name={s.name} />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon={Newspaper} title="Fil d'actualités marché" subtitle="Mise à jour temps réel" />
          <CardBody><TVTimeline height={500} /></CardBody>
        </Card>
        <Card>
          <CardHeader icon={Activity} title="Calendrier économique" subtitle="Événements à fort impact" />
          <CardBody><TVEconCalendar height={500} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
