import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FilePlus2, ScrollText, TrendingUp, TrendingDown,
  DollarSign, Anchor, BarChart3, FileCheck2, ShieldAlert, Globe,
  Activity, Layers, Lightbulb, Users, User, LogOut, Moon, Sun,
  FileSpreadsheet, RefreshCw, ClipboardList, Zap, Package, Bot, ShieldCheck,
  ChevronDown, Landmark, Scale, Gauge, History, BookOpen,
} from 'lucide-react';

import { ROLES, SESSION_TIMEOUT_MIN } from './constants.js';
import { uid, todayISO }              from './utils.js';
import { buildDatasetFromStore }      from './utils/plattsStore.js';
import { loadUsers, saveUsers, loadSession, saveSession, genSalt, hashPassword } from './auth/authHelpers.js';
import { AmkoLogo }                   from './components/Logo.jsx';

import AuthScreen      from './auth/AuthScreen.jsx';
import UserManagement  from './auth/UserManagement.jsx';
import MyProfile       from './auth/MyProfile.jsx';

import Dashboard    from './modules/Dashboard.jsx';
import Market       from './modules/Market.jsx';
import NewDeal      from './modules/NewDeal.jsx';
import DealsList    from './modules/DealsList.jsx';
import Hedging      from './modules/Hedging.jsx';
import Freight      from './modules/Freight.jsx';
import Pricing      from './modules/Pricing.jsx';
import PnL          from './modules/PnL.jsx';
import LCChecker    from './modules/LCChecker.jsx';
import RiskMatrix   from './modules/RiskMatrix.jsx';
import Resources     from './modules/Resources.jsx';
import PlattsImport  from './modules/PlattsImportDynamic.jsx';
import PlattsBoard   from './modules/PlattsBoard.jsx';
import Rolling       from './modules/Rolling.jsx';
import Documents     from './modules/Documents.jsx';
import Lots             from './modules/Lots.jsx';
import Advisor          from './modules/Advisor.jsx';
import FxPricingValidator  from './modules/FxPricingValidator.jsx';
import FxForward           from './modules/FxForward.jsx';
import PositionBook         from './modules/PositionBook.jsx';
import DealCockpit          from './modules/DealCockpit.jsx';
import Blotter              from './modules/Blotter.jsx';
import Guide                from './modules/Guide.jsx';
import { logAction }        from './utils/auditLog.js';

const TAB_SECTION_MAP = {
  advisor: 'main', dashboard: 'main', position: 'main', market: 'main',
  cockpit: 'deals', deals: 'deals', 'new-deal': 'deals', lots: 'deals', blotter: 'deals',
  hedging: 'tools', pricing: 'tools', freight: 'tools', pnl: 'tools', lc: 'tools',
  risk: 'tools', 'fx-pricing': 'tools', 'fx-forward': 'tools', rolling: 'tools',
  'platts-board': 'tools', platts: 'tools',
  guide: 'docs', documents: 'docs', resources: 'hub', profile: 'account', users: 'account',
};

function getInitialDarkMode() {
  try { return localStorage.getItem('amko_theme') === 'dark'; }
  catch { return false; }
}

export default function TradingPlatform() {
  const [darkMode,     setDarkMode]     = useState(getInitialDarkMode);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [authChecked,  setAuthChecked]  = useState(false);
  const [activeTab,    setActiveTab]    = useState('dashboard');
  const [deals,        setDeals]        = useState([]);
  const [editingDeal,  setEditingDeal]  = useState(null);
  const [focusDealId,  setFocusDealId]  = useState('');
  const [loaded,       setLoaded]       = useState(false);
  const [marketPrices,  setMarketPrices]  = useState({ brent: '', wti: '', gasoil: '', dubai: '', jet: '' });
  const [plattsDataset, setPlattsDataset] = useState(() => {
    const ds = buildDatasetFromStore();
    return ds.dates?.length ? ds : null;
  });
  const [openSections, setOpenSections] = useState(() => new Set([TAB_SECTION_MAP['dashboard'] ?? 'main']));

  useEffect(() => {
    const refreshPlatts = () => {
      const ds = buildDatasetFromStore();
      setPlattsDataset(ds.dates?.length ? ds : null);
    };
    refreshPlatts();
    window.addEventListener('amko:platts-updated', refreshPlatts);
    return () => window.removeEventListener('amko:platts-updated', refreshPlatts);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('amko_theme', darkMode ? 'dark' : 'light'); }
    catch {}
  }, [darkMode]);

  useEffect(() => {
    (async () => {
      try {
        const users = await loadUsers();
        if (users.length === 0) {
          const salt  = genSalt();
          const admin = {
            id:        'U' + Date.now().toString(36).toUpperCase(),
            username:  'admin',
            fullName:  'Administrateur',
            role:      'admin',
            salt,
            hash:      await hashPassword('amko', salt),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            active:    true,
          };
          await saveUsers([admin]);
          await saveSession({ userId: admin.id, loggedAt: Date.now(), lastActivity: Date.now() });
          setCurrentUser(admin);
          setAuthChecked(true);
          return;
        }
        const session = await loadSession();
        if (session) {
          const elapsed = (Date.now() - session.lastActivity) / 60000;
          if (elapsed < SESSION_TIMEOUT_MIN) {
            const u = users.find(x => x.id === session.userId && x.active);
            if (u) {
              setCurrentUser(u);
              await saveSession({ ...session, lastActivity: Date.now() });
            } else {
              await saveSession(null);
            }
          } else {
            await saveSession(null);
          }
        }
      } catch {}
      setAuthChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const tickActivity = async () => {
      const s = await loadSession();
      if (s) await saveSession({ ...s, lastActivity: Date.now() });
    };
    window.addEventListener('mousemove', tickActivity);
    window.addEventListener('keydown',   tickActivity);
    window.addEventListener('click',     tickActivity);
    const interval = setInterval(async () => {
      const s = await loadSession();
      if (!s) return;
      if ((Date.now() - s.lastActivity) / 60000 >= SESSION_TIMEOUT_MIN) {
        alert(`Session expirée après ${SESSION_TIMEOUT_MIN} minutes d'inactivité.`);
        await saveSession(null);
        setCurrentUser(null);
      }
    }, 30000);
    return () => {
      window.removeEventListener('mousemove', tickActivity);
      window.removeEventListener('keydown',   tickActivity);
      window.removeEventListener('click',     tickActivity);
      clearInterval(interval);
    };
  }, [currentUser]);

  const dealsKey = currentUser ? `deals_user_${currentUser.id}` : null;

  useEffect(() => {
    if (!currentUser) { setDeals([]); setLoaded(false); return; }
    (async () => {
      try {
        const res = await window.storage.get(dealsKey);
        setDeals(res?.value ? JSON.parse(res.value) : []);
      } catch { setDeals([]); }
      setLoaded(true);
    })();
  }, [currentUser, dealsKey]);

  useEffect(() => {
    if (!loaded || !dealsKey) return;
    (async () => {
      try { await window.storage.set(dealsKey, JSON.stringify(deals)); }
      catch (e) { console.error('Save failed', e); }
    })();
  }, [deals, loaded, dealsKey]);

  // ── Navigation helpers ────────────────────────────────────────
  const navigateTo = (tabId) => {
    setActiveTab(tabId);
    const section = TAB_SECTION_MAP[tabId];
    if (section) setOpenSections(prev => new Set([...prev, section]));
  };

  const toggleSection = (key) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Ouvre un module avec un deal pré-sélectionné (navigation deal-centrique).
  const openDealIn = (tabId, dealId) => {
    if (dealId) setFocusDealId(dealId);
    navigateTo(tabId);
  };

  // ── Auth handlers ─────────────────────────────────────────────
  const handleAuth = (user) => { setCurrentUser(user); navigateTo('dashboard'); };

  const logout = async () => {
    if (!window.confirm('Se déconnecter ?')) return;
    await saveSession(null);
    setCurrentUser(null);
    setDeals([]);
    navigateTo('dashboard');
  };

  const isViewer = currentUser?.role === 'viewer';
  const isAdmin  = currentUser?.role === 'admin';

  // Journal d'audit (blotter) — trace horodatée de chaque action métier.
  const audit = (action, dealId, label) => logAction(currentUser?.id, { action, dealId, label });

  // ── Deal handlers ─────────────────────────────────────────────
  const saveDeal = (deal) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas créer ou modifier de deals.'); return; }
    const exists = deals.some(d => d.id === deal.id);
    setDeals(ds => {
      const idx = ds.findIndex(d => d.id === deal.id);
      if (idx >= 0) { const copy = [...ds]; copy[idx] = deal; return copy; }
      return [...ds, deal];
    });
    audit(exists ? 'updated' : 'created', deal.id,
      `${deal.dealType === 'sell' ? 'Vente' : 'Achat'} ${deal.quantity || '?'} MT — ${deal.counterparty || '?'}`);
    setEditingDeal(null);
    navigateTo('deals');
  };

  const deleteDeal = (id) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas supprimer de deals.'); return; }
    setDeals(ds => ds.filter(d => d.id !== id));
    audit('deleted', id, 'Deal supprimé');
  };

  const editDeal = (d) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas modifier de deals.'); return; }
    setEditingDeal(d); navigateTo('new-deal');
  };

  const duplicateDeal = (d) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas créer de deals.'); return; }
    const newDeal = { ...d, id: uid(), status: 'open', createdAt: todayISO(), notes: `[Dupliqué de ${d.id}] ${d.notes || ''}`.trim() };
    setDeals(ds => [...ds, newDeal]);
    audit('duplicated', newDeal.id, `Dupliqué depuis ${d.id}`);
    setEditingDeal(newDeal);
    navigateTo('new-deal');
  };

  const importDeals = (imported) => {
    setDeals(existing => {
      const existingIds = new Set(existing.map(d => d.id));
      const fresh = imported.filter(d => !existingIds.has(d.id));
      audit('import', null, `${fresh.length} deal(s) importé(s) depuis JSON`);
      return [...existing, ...fresh];
    });
  };

  const restoreDeals = (imported) => {
    setDeals(imported);
    audit('restore', null, `Restauration complète : ${imported.length} deal(s)`);
  };

  // Mise à jour partielle d'un deal (statut depuis le cockpit, etc.)
  const updateDealFields = (dealId, patch) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas modifier de deals.'); return; }
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, ...patch } : d));
    if (patch.status) audit('status', dealId, `Statut → ${patch.status}`);
  };

  // ── Sub-module save handlers ──────────────────────────────────
  const setMarketPrice      = (key, val) => setMarketPrices(prev => ({ ...prev, [key]: val }));
  const saveFreight         = (dealId, freightData) => {
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, freight: freightData } : d));
    audit('freight', dealId, `Fret sauvegardé : ${Math.round(freightData.totalFreight || 0).toLocaleString('fr-FR')} $`);
  };
  // Pas d'audit sur saveLots : appelé à chaque frappe dans le module Lots.
  const saveLots            = (dealId, lots) => setDeals(ds => ds.map(d => d.id === dealId ? { ...d, lots } : d));
  const saveHedge           = (dealId, hedgeData) => {
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, hedging: hedgeData, hedgeRatio: hedgeData.hedgeRatio } : d));
    audit('hedge', dealId, `Hedge validé : ${hedgeData.actionLabel || hedgeData.direction} — ${hedgeData.validatedLots} lot(s) ${String(hedgeData.contractName || '').split('—')[0].trim()}`);
  };
  const saveRiskMatrix      = (dealId, riskData) => {
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, riskMatrix: riskData } : d));
    audit('risk', dealId, `Analyse risques : score ${riskData.totalScore} — ${riskData.level} — ${riskData.status}`);
  };
  const savePnLFreight      = (dealId, freightAmount) => {
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, freight: { ...(d.freight || {}), totalFreight: freightAmount } } : d));
    audit('freight', dealId, `Fret saisi depuis P&L : ${Math.round(freightAmount).toLocaleString('fr-FR')} $`);
  };
  const savePnL             = (dealId, pnlData) => {
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, pnl: pnlData } : d));
    audit('pnl', dealId, `P&L validé : marge nette ${Math.round(pnlData.pnl3).toLocaleString('fr-FR')} $ (${(pnlData.pnl3PerMT ?? 0).toFixed(2)} $/MT)`);
  };
  const saveFxHedge         = (dealId, fxData) => {
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, fxHedge: fxData } : d));
    audit('fx', dealId, `Couverture FX : ${fxData.instrument} ${fxData.ccyFor}/${fxData.ccyDom} — résultat ${Math.round(fxData.fxResult || 0).toLocaleString('fr-FR')} $`);
  };
  const saveLCCheck         = (dealId, lcData) => {
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, lcCheck: lcData } : d));
    audit('lc', dealId, `LC vérifiée : ${lcData.done}/${lcData.total} champs MT700`);
  };
  // Reporte le prix moyen pondéré des lots comme prix de la jambe du deal.
  const pushDealLegPrice    = (dealId, price) => {
    setDeals(ds => ds.map(d => {
      if (d.id !== dealId) return d;
      const p = String(Math.round(price * 100) / 100);
      const leg = d.dealType === 'sell' ? { salePrice: p } : { purchasePrice: p };
      return { ...d, estimatedPrice: p, ...leg };
    }));
    audit('price', dealId, `Prix moyen pondéré des lots → jambe du deal : ${Math.round(price * 100) / 100} $/MT`);
  };
  const savePricingValidation = (dealId, pvData) => {
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, pricingValidation: pvData } : d));
    audit('fx-pricing', dealId, `Validation FX pricing : ${pvData.verdict?.status}${pvData.economics?.netMarginForward != null ? ` — marge fwd ${Math.round(pvData.economics.netMarginForward).toLocaleString('fr-FR')} ${pvData.marginCurrency || 'USD'}` : ''}`);
  };
  const savePricing         = (dealId, pricingData) => {
    setDeals(ds => ds.map(d => {
      if (d.id !== dealId) return d;
      const fp = String(pricingData.finalPrice);
      const leg = d.dealType === 'sell' ? { salePrice: fp } : { purchasePrice: fp };
      return { ...d, pricing: pricingData, estimatedPrice: fp, ...leg };
    }));
    audit('pricing', dealId, `Pricing sauvegardé : ${pricingData.finalPrice} $/MT (${pricingData.marker})`);
  };
  const pushMopToDeal       = (dealId, plattsCode, priceBbl) => {
    setDeals(ds => ds.map(d => {
      if (d.id !== dealId) return d;
      const p = String(Math.round(priceBbl * 1000) / 1000);
      const leg = d.dealType === 'sell' ? { salePrice: p } : { purchasePrice: p };
      return { ...d, estimatedPrice: p, plattsCode, ...leg };
    }));
    audit('price', dealId, `MOP Platts ${plattsCode} → jambe du deal : ${Math.round(priceBbl * 1000) / 1000} $/MT`);
  };

  // ── Gardes ───────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
          <div className="text-slate-500 dark:text-slate-400">Chargement…</div>
        </div>
      </div>
    );
  }

  if (!currentUser) return <div className={darkMode ? 'dark' : ''}><AuthScreen onAuth={handleAuth} /></div>;

  // ── Navigation ────────────────────────────────────────────────
  const nav = [
    { id: 'advisor',            label: 'Conseiller',         icon: Bot,             section: 'main' },
    { id: 'dashboard',          label: 'Tableau de bord',    icon: LayoutDashboard, section: 'main' },
    { id: 'position',           label: 'Book de position',   icon: Scale,           section: 'main' },
    { id: 'market',    label: 'Marché temps réel', icon: Activity,        section: 'main' },
    { id: 'cockpit',   label: 'Cockpit deal',      icon: Gauge,           section: 'deals' },
    { id: 'deals',     label: 'Mes deals',         icon: ScrollText,      section: 'deals' },
    ...(!isViewer ? [{ id: 'new-deal', label: 'Nouveau deal', icon: FilePlus2, section: 'deals' }] : []),
    { id: 'lots',      label: 'Lots & cargaisons', icon: Package,         section: 'deals' },
    { id: 'blotter',   label: 'Blotter / Journal', icon: History,         section: 'deals' },
    { id: 'hedging',   label: 'Hedging',           icon: TrendingUp,      section: 'tools' },
    { id: 'pricing',   label: 'Pricing',           icon: DollarSign,      section: 'tools' },
    { id: 'freight',   label: 'Fret (WS)',         icon: Anchor,          section: 'tools' },
    { id: 'pnl',       label: 'P&L',              icon: BarChart3,       section: 'tools' },
    { id: 'lc',        label: 'LC Checker',        icon: FileCheck2,      section: 'tools' },
    { id: 'risk',          label: 'Risques',           icon: ShieldAlert,  section: 'tools' },
    { id: 'fx-pricing',   label: 'FX Pricing',        icon: ShieldCheck,  section: 'tools' },
    { id: 'fx-forward',  label: 'Couverture FX',     icon: Landmark,     section: 'tools' },
    { id: 'rolling',  label: 'Rolling',           icon: RefreshCw,       section: 'tools' },
    { id: 'platts-board', label: 'Platts Board',   icon: Zap,             section: 'tools' },
    { id: 'platts',   label: 'Import Platts',     icon: FileSpreadsheet, section: 'tools' },
    { id: 'guide',     label: "Notice d'utilisation", icon: BookOpen,     section: 'docs' },
    { id: 'documents', label: 'Procédures & Docs', icon: ClipboardList,   section: 'docs' },
    { id: 'resources', label: 'Hub Ressources',   icon: Globe,           section: 'hub' },
    { id: 'profile',   label: 'Mon profil',        icon: User,            section: 'account' },
    ...(isAdmin ? [{ id: 'users', label: 'Utilisateurs', icon: Users, section: 'account' }] : []),
  ];

  const sections = {
    main:    { label: "Marché & vue d'ensemble" },
    deals:   { label: 'Mes opérations' },
    tools:   { label: 'Outils' },
    docs:    { label: 'Procédures & Documents' },
    hub:     { label: 'Ressources externes' },
    account: { label: 'Compte' },
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex">

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className="w-60 bg-slate-900 text-white flex flex-col flex-shrink-0">
          <div className="px-4 py-5 bg-white dark:bg-slate-800 border-b-2 border-amber-500">
            <div className="flex items-center justify-center">
              <AmkoLogo size="md" showTagline={true} variant="light" />
            </div>
          </div>

          <nav className="flex-1 py-2 overflow-y-auto">
            {Object.entries(sections).map(([sectionKey, section]) => {
              const items     = nav.filter(n => n.section === sectionKey);
              if (items.length === 0) return null;
              const isOpen    = openSections.has(sectionKey);
              const hasActive = items.some(n => n.id === activeTab);
              return (
                <div key={sectionKey} className="mb-1">
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-xs uppercase font-semibold transition
                      ${hasActive
                        ? 'text-amber-400 bg-slate-800/60'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                      }`}>
                    <span>{section.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                  </button>

                  <div style={{
                    maxHeight: isOpen ? `${items.length * 44}px` : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.22s ease',
                  }}>
                    {items.map(n => {
                      const Icon   = n.icon;
                      const active = activeTab === n.id;
                      return (
                        <button key={n.id}
                          onClick={() => { if (n.id === 'new-deal') setEditingDeal(null); navigateTo(n.id); }}
                          className={`w-full flex items-center gap-3 pr-4 py-2 text-sm transition ${
                            active
                              ? 'bg-blue-700 text-white border-l-4 border-amber-400 pl-5'
                              : 'text-slate-300 hover:bg-slate-800 border-l-4 border-transparent pl-6'
                          }`}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{n.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Dark mode + user info */}
          <div className="border-t border-slate-700 p-4 space-y-3">
            <button onClick={() => setDarkMode(d => !d)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-md transition">
              {darkMode
                ? <><Sun className="w-4 h-4 text-amber-400" /> Mode clair</>
                : <><Moon className="w-4 h-4 text-slate-400" /> Mode sombre</>}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {currentUser.fullName.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  {ROLES[currentUser.role]?.label} • {deals.length} deal(s)
                </div>
              </div>
            </div>
            <button onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-red-700 text-slate-200 hover:text-white rounded-md transition">
              <LogOut className="w-3.5 h-3.5" />Se déconnecter
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {activeTab === 'advisor'            && <Advisor currentUser={currentUser} marketPrices={marketPrices} deals={deals} goTo={openDealIn} />}
            {activeTab === 'dashboard'          && <Dashboard deals={deals} goTo={navigateTo} marketPrices={marketPrices} setMarketPrice={setMarketPrice} openDeal={(id) => openDealIn('cockpit', id)} />}
            {activeTab === 'position'           && <PositionBook deals={deals} marketPrices={marketPrices} setMarketPrice={setMarketPrice} />}
            {activeTab === 'market'    && <Market />}
            {activeTab === 'cockpit'   && (
              <DealCockpit deals={deals} marketPrices={marketPrices} initialDealId={focusDealId}
                onOpenModule={openDealIn} onEdit={editDeal} isViewer={isViewer} userId={currentUser.id}
                onUpdateStatus={(id, status) => updateDealFields(id, { status })} />
            )}
            {activeTab === 'blotter'   && <Blotter userId={currentUser.id} deals={deals} isAdmin={isAdmin} onOpenDeal={(id) => openDealIn('cockpit', id)} />}
            {activeTab === 'deals'     && <DealsList deals={deals} onEdit={editDeal} onDelete={deleteDeal} onDuplicate={duplicateDeal} onImportDeals={importDeals} onOpen={(d) => openDealIn('cockpit', d.id)} />}
            {activeTab === 'new-deal' && !isViewer && (
              <NewDeal onSave={saveDeal} editingDeal={editingDeal}
                onCancel={editingDeal ? () => { setEditingDeal(null); navigateTo('deals'); } : null} />
            )}
            {activeTab === 'hedging'    && <Hedging deals={deals} onHedgeSaved={saveHedge} userId={currentUser.id} initialDealId={focusDealId} />}
            {activeTab === 'pricing'    && <Pricing marketPrices={marketPrices} deals={deals} onPricingSaved={savePricing} initialDealId={focusDealId} />}
            {activeTab === 'freight'    && <Freight deals={deals} onFreightSaved={saveFreight} initialDealId={focusDealId} />}
            {activeTab === 'lots'       && <Lots deals={deals} onLotsUpdated={saveLots} onPushPrice={pushDealLegPrice} initialDealId={focusDealId} />}
            {activeTab === 'pnl'        && <PnL deals={deals} marketPrices={marketPrices} onFreightSaved={savePnLFreight} onPnLSaved={savePnL} initialDealId={focusDealId} />}
            {activeTab === 'lc'         && <LCChecker deals={deals} onLCSaved={saveLCCheck} initialDealId={focusDealId} />}
            {activeTab === 'risk'       && <RiskMatrix deals={deals} onRiskSaved={saveRiskMatrix} initialDealId={focusDealId} />}
            {activeTab === 'fx-pricing'  && <FxPricingValidator deals={deals} onPricingValidated={savePricingValidation} currentUser={currentUser} initialDealId={focusDealId} />}
            {activeTab === 'fx-forward'  && <FxForward deals={deals} onFxSaved={saveFxHedge} initialDealId={focusDealId} />}
            {activeTab === 'rolling'    && <Rolling deals={deals} userId={currentUser.id} initialDealId={focusDealId} />}
            {activeTab === 'platts-board' && <PlattsBoard plattsDataset={plattsDataset} setMarketPrice={setMarketPrice} deals={deals} onPushToDeal={pushMopToDeal} />}
            {activeTab === 'platts'    && <PlattsImport setMarketPrice={setMarketPrice} marketPrices={marketPrices} onDatasetLoaded={setPlattsDataset} />}
            {activeTab === 'guide'     && <Guide />}
            {activeTab === 'documents' && <Documents deals={deals} />}
            {activeTab === 'resources' && <Resources />}
            {activeTab === 'profile'   && <MyProfile currentUser={currentUser} onRestoreDeals={restoreDeals} />}
            {activeTab === 'users' && isAdmin && <UserManagement currentUser={currentUser} onUserUpdate={setCurrentUser} />}
          </div>
        </main>
      </div>
    </div>
  );
}
