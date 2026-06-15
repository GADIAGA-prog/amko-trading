import React, { useRef, useEffect } from 'react';

export const TVTickerTape = () => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'TVC:UKOIL',  title: 'Brent' },
        { proName: 'TVC:USOIL',  title: 'WTI' },
        { proName: 'ICEEUR:G1!', title: 'ICE Gasoil' },
        { proName: 'NYMEX:HO1!', title: 'ULSD' },
        { proName: 'NYMEX:RB1!', title: 'RBOB' },
        { proName: 'NYMEX:NG1!', title: 'Natural Gas' },
        { proName: 'TVC:DXY',    title: 'USD Index' },
      ],
      isTransparent: false, showSymbolLogo: false,
      colorTheme: 'light', locale: 'fr', displayMode: 'adaptive',
    });
    ref.current.appendChild(s);
  }, []);
  return (
    <div className="tradingview-widget-container" ref={ref}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
};

export const TVAdvancedChart = ({ symbol = 'TVC:UKOIL', height = 500, interval = '60' }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const wd = document.createElement('div');
    wd.className = 'tradingview-widget-container__widget';
    wd.style.height = '100%';
    wd.style.width = '100%';
    ref.current.appendChild(wd);
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      autosize: true, symbol, interval, timezone: 'Etc/UTC',
      theme: 'light', style: '1', locale: 'fr',
      toolbar_bg: '#f1f3f6', enable_publishing: false,
      allow_symbol_change: true, calendar: false,
      studies: ['MASimple@tv-basicstudies', 'Volume@tv-basicstudies'],
      support_host: 'https://www.tradingview.com',
    });
    ref.current.appendChild(s);
  }, [symbol, interval]);
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: `${height}px`, width: '100%' }} />
  );
};

export const TVMiniChart = ({ symbol, name }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const wd = document.createElement('div');
    wd.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(wd);
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      symbol, width: '100%', height: 180, locale: 'fr',
      dateRange: '12M', colorTheme: 'light',
      trendLineColor: 'rgba(41,98,255,1)',
      underLineColor: 'rgba(41,98,255,0.15)',
      isTransparent: false, autosize: false, largeChartUrl: '',
    });
    ref.current.appendChild(s);
  }, [symbol]);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
        {name}
      </div>
      <div className="tradingview-widget-container" ref={ref} />
    </div>
  );
};

export const TVTimeline = ({ height = 500 }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const wd = document.createElement('div');
    wd.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(wd);
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      feedMode: 'all_symbols', isTransparent: false,
      displayMode: 'regular', width: '100%', height, colorTheme: 'light', locale: 'fr',
    });
    ref.current.appendChild(s);
  }, [height]);
  return <div className="tradingview-widget-container" ref={ref} />;
};

export const TVMarketOverview = ({ tabs = [], height = 550 }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const wd = document.createElement('div');
    wd.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(wd);
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      colorTheme: 'light', dateRange: '1D', showChart: true,
      locale: 'fr', width: '100%', height,
      largeChartUrl: '', isTransparent: false,
      showSymbolLogo: false, showFloatingTooltip: false,
      plotLineColorGrowing: 'rgba(41,98,255,1)',
      plotLineColorFalling: 'rgba(220,38,38,1)',
      gridLineColor: 'rgba(240,243,250,0)',
      scaleFontColor: 'rgba(19,23,34,1)',
      belowLineFillColorGrowing: 'rgba(41,98,255,0.12)',
      belowLineFillColorFalling: 'rgba(220,38,38,0.12)',
      symbolActiveColor: 'rgba(41,98,255,0.12)',
      tabs,
    });
    ref.current.appendChild(s);
  }, [JSON.stringify(tabs), height]);
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: `${height}px`, width: '100%' }} />
  );
};

export const TVSingleQuote = ({ symbol = 'ICEEUR:G1!', width = '100%' }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const wd = document.createElement('div');
    wd.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(wd);
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      symbol, width, isTransparent: false, colorTheme: 'light', locale: 'fr',
    });
    ref.current.appendChild(s);
  }, [symbol]);
  return <div className="tradingview-widget-container" ref={ref} />;
};

export const TVEconCalendar = ({ height = 500 }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const wd = document.createElement('div');
    wd.className = 'tradingview-widget-container__widget';
    ref.current.appendChild(wd);
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      colorTheme: 'light', isTransparent: false, locale: 'fr',
      importanceFilter: '-1,0,1',
      countryFilter: 'us,eu,gb,fr,de,cn,sa,ru,no,ng',
      width: '100%', height,
    });
    ref.current.appendChild(s);
  }, [height]);
  return <div className="tradingview-widget-container" ref={ref} />;
};
