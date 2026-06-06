import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FilePlus2, ScrollText, TrendingUp,
  DollarSign, Anchor, BarChart3, FileCheck2, ShieldAlert, Globe,
  Activity, Layers, Lightbulb, Users, User, LogOut, Moon, Sun,
  FileSpreadsheet, RefreshCw, ClipboardList, Zap, Package, MessageSquare,
  ClipboardCheck,
} from 'lucide-react';

import { ROLES, SESSION_TIMEOUT_MIN } from './constants.js';
import { uid, todayISO } from './utils.js';
import { loadUsers, loadSession, saveSession } from './auth/authHelpers.js';
import { AmkoLogo } from './components/Logo.jsx';

import AuthScreen from './auth/AuthScreen.jsx';
import UserManagement from './auth/UserManagement.jsx';
import MyProfile from './auth/MyProfile.jsx';

import Dashboard from './modules/Dashboard.jsx';
import Market from './modules/Market.jsx';
import ForwardCurve from './modules/ForwardCurve.jsx';
import NewDeal from './modules/NewDeal.jsx';
import DealsList from './modules/DealsList.jsx';
import Optimizer from './modules/Optimizer.jsx';
import Hedging from './modules/Hedging.jsx';
import Freight from './modules/Freight.jsx';
import Pricing from './modules/Pricing.jsx';
import PnL from './modules/PnL.jsx';
import LCChecker from './modules/LCChecker.jsx';
import RiskMatrix from './modules/RiskMatrix.jsx';
import Resources from './modules/Resources.jsx';
import Spreads from './modules/Spreads.jsx';
import PlattsImport from './modules/PlattsImport.jsx';
import PlattsBoard from './modules/PlattsBoard.jsx';
import Rolling from './modules/Rolling.jsx';
import Documents from './modules/Documents.jsx';
import Lots from './modules/Lots.jsx';
import AgentChat from './modules/AgentChat.jsx';
import DealManagerAgent from './modules/DealManagerAgent.jsx';

function getInitialDarkMode() {
  try { return localStorage.getItem('amko_theme') === 'dark'; }
  catch { return false; }
}

export default function TradingPlatform() {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deals, setDeals] = useState([]);
  const [editingDeal, setEditingDeal] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [marketPrices, setMarketPrices] = useState({ brent: '', wti: '', gasoil: '' });
  const [plattsDataset, setPlattsDataset] = useState(null);

  useEffect(() => {
    try { localStorage.setItem('amko_theme', darkMode ? 'dark' : 'light'); }
    catch {}
  }, [darkMode]);

  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();
        if (session) {
          const elapsed = (Date.now() - session.lastActivity) / 60000;
          if (elapsed < SESSION_TIMEOUT_MIN) {
            const users = await loadUsers();
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
    window.addEventListener('keydown', tickActivity);
    window.addEventListener('click', tickActivity);

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
      window.removeEventListener('keydown', tickActivity);
      window.removeEventListener('click', tickActivity);
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
      } catch {
        setDeals([]);
      }
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

  const handleAuth = (user) => { setCurrentUser(user); setActiveTab('dashboard'); };

  const logout = async () => {
    if (!window.confirm('Se déconnecter ?')) return;
    await saveSession(null);
    setCurrentUser(null);
    setDeals([]);
    setActiveTab('dashboard');
  };

  const isViewer = currentUser?.role === 'viewer';
  const isAdmin = currentUser?.role === 'admin';

  const saveDeal = (deal) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas créer ou modifier de deals.'); return; }
    setDeals(ds => {
      const idx = ds.findIndex(d => d.id === deal.id);
      if (idx >= 0) { const copy = [...ds]; copy[idx] = deal; return copy; }
      return [...ds, deal];
    });
    setEditingDeal(null);
    setActiveTab('deals');
  };

  const deleteDeal = (id) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas supprimer de deals.'); return; }
    setDeals(ds => ds.filter(d => d.id !== id));
  };

  const editDeal = (d) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas modifier de deals.'); return; }
    setEditingDeal(d);
    setActiveTab('new-deal');
  };

  const duplicateDeal = (d) => {
    if (isViewer) { alert('Les utilisateurs Viewer ne peuvent pas créer de deals.'); return; }
    const newDeal = {
      ...d,
      id: uid(),
      status: 'open',
      createdAt: todayISO(),
      notes: `[Dupliqué de ${d.id}] ${d.notes || ''}`.trim(),
    };
    setDeals(ds => [...ds, newDeal]);
    setEditingDeal(newDeal);
    setActiveTab('new-deal');
  };

  const importDeals = (imported) => {
    setDeals(existing => {
      const existingIds = new Set(existing.map(d => d.id));
      const fresh = imported.filter(d => !existingIds.has(d.id));
      return [...existing, ...fresh];
    });
  };

  const restoreDeals = (imported) => { setDeals(imported); };
  const setMarketPrice = (key, val) => setMarketPrices(prev => ({ ...prev, [key]: val }));
  const saveFreight = (dealId, freightData) => setDeals(ds => ds.map(d => d.id === dealId ? { ...d, freight: freightData } : d));
  const saveLots = (dealId, lots) => setDeals(ds => ds.map(d => d.id === dealId ? { ...d, lots } : d));

  const pushMopToDeal = (dealId, plattsCode, priceBbl) => {
    setDeals(ds => ds.map(d =>
      d.id === dealId
        ? { ...d, estimatedPrice: String(Math.round(priceBbl * 1000) / 1000) }
        : d,
    ));
  };

  if (!authChecked) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
          <div className="text-slate-500 dark:text-slate-400">Chargement…</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <AuthScreen onAuth={handleAuth} />
      </div>
    );
  }

  const nav = [
    { id: 'agent', label: 'Agent conseiller', icon: MessageSquare, section: 'main' },
    { id: 'deal-manager-agent', label: 'Deal Manager IA', icon: ClipboardCheck, section: 'main' },
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, section: 'main' },
    { id: 'market', label: 'Marché temps réel', icon: Activity, section: 'main' },
    { id: 'curve', label: 'Courbe à terme', icon: Layers, section: 'main' },
    { id: 'deals', label: 'Mes deals', icon: ScrollText, section: 'deals' },
    ...(!isViewer ? [{ id: 'new-deal', label: 'Nouveau deal', icon: FilePlus2, section: 'deals' }] : []),
    { id: 'lots', label: 'Lots & cargaisons', icon: Package, section: 'deals' },
    { id: 'optimizer', label: 'Optimiseur', icon: Lightbulb, section: 'deals' },
    { id: 'hedging', label: 'Hedging', icon: TrendingUp, section: 'tools' },
    { id: 'pricing', label: 'Pricing', icon: DollarSign, section: 'tools' },
    { id: 'freight', label: 'Fret (WS)', icon: Anchor, section: 'tools' },
    { id: 'pnl', label: 'P&L', icon: BarChart3, section: 'tools' },
    { id: 'lc', label: 'LC Checker', icon: FileCheck2, section: 'tools' },
    { id: 'risk', label: 'Risques', icon: ShieldAlert, section: 'tools' },
    { id: 'spreads', label: 'Spreads', icon: TrendingUp, section: 'tools' },
    { id: 'rolling', label: 'Rolling', icon: RefreshCw, section: 'tools' },
    { id: 'platts-board', label: 'Platts Board', icon: Zap, section: 'tools' },
    { id: 'platts', label: 'Import Platts', icon: FileSpreadsheet, section: 'tools' },
    { id: 'documents', label: 'Procédures & Docs', icon: ClipboardList, section: 'docs' },
    { id: 'resources', label: 'Hub Ressources', icon: Globe, section: 'hub' },
    { id: 'profile', label: 'Mon profil', icon: User, section: 'account' },
    ...(isAdmin ? [{ id: 'users', label: 'Utilisateurs', icon: Users, section: 'account' }] : []),
  ];

  const sections = {
    main: { label: "Marché & vue d'ensemble" },
    deals: { label: 'Mes opérations' },
    tools: { label: 'Outils' },
    docs: { label: 'Procédures & Documents' },
    hub: { label: 'Ressources externes' },
    account: { label: 'Compte' },
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex">
        <aside className="w-60 bg-slate-900 text-white flex flex-col flex-shrink-0">
          <div className="px-4 py-5 bg-white dark:bg-slate-800 border-b-2 border-amber-500">
            <div className="flex items-center justify-center">
              <AmkoLogo size="md" showTagline={true} variant="light" />
            </div>
          </div>

          <nav className="flex-1 py-3 overflow-y-auto">
            {Object.entries(sections).map(([sectionKey, section]) => {
              const items = nav.filter(n => n.section === sectionKey);
              if (items.length === 0) return null;
              return (
                <div key={sectionKey} className="mb-2">
                  <div className="px-5 py-1 text-xs uppercase text-slate-500 font-semibold">
                    {section.label}
                  </div>
                  {items.map(n => {
                    const Icon = n.icon;
                    const active = activeTab === n.id;
                    return (
                      <button
                        key={n.id}
                        onClick={() => { if (n.id === 'new-deal') setEditingDeal(null); setActiveTab(n.id); }}
                        className={`w-full flex items-center gap-3 px-5 py-2 text-sm transition ${
                          active
                            ? 'bg-blue-700 text-white border-l-4 border-amber-400'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />{n.label}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <div className="border-t border-slate-700 p-4 space-y-3">
            <button
              onClick={() => setDarkMode(d => !d)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-md transition"
            >
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

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-red-700 text-slate-200 hover:text-white rounded-md transition"
            >
              <LogOut className="w-3.5 h-3.5" />Se déconnecter
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {activeTab === 'agent' && (
              <AgentChat deals={deals} marketPrices={marketPrices} plattsDataset={plattsDataset} />
            )}
            {activeTab === 'deal-manager-agent' && (
              <DealManagerAgent deals={deals} marketPrices={marketPrices} plattsDataset={plattsDataset} />
            )}
            {activeTab === 'dashboard' && (
              <Dashboard deals={deals} goTo={setActiveTab} marketPrices={marketPrices} setMarketPrice={setMarketPrice} />
            )}
            {activeTab === 'market' && <Market />}
            {activeTab === 'curve' && <ForwardCurve />}
            {activeTab === 'deals' && (
              <DealsList deals={deals} onEdit={editDeal} onDelete={deleteDeal} onDuplicate={duplicateDeal} onImportDeals={importDeals} />
            )}
            {activeTab === 'new-deal' && !isViewer && (
              <NewDeal onSave={saveDeal} editingDeal={editingDeal} onCancel={editingDeal ? () => { setEditingDeal(null); setActiveTab('deals'); } : null} />
            )}
            {activeTab === 'optimizer' && <Optimizer deals={deals} />}
            {activeTab === 'hedging' && <Hedging deals={deals} />}
            {activeTab === 'pricing' && <Pricing marketPrices={marketPrices} />}
            {activeTab === 'freight' && <Freight deals={deals} onFreightSaved={saveFreight} />}
            {activeTab === 'lots' && <Lots deals={deals} onLotsUpdated={saveLots} />}
            {activeTab === 'pnl' && <PnL deals={deals} marketPrices={marketPrices} />}
            {activeTab === 'lc' && <LCChecker />}
            {activeTab === 'risk' && <RiskMatrix deals={deals} />}
            {activeTab === 'spreads' && <Spreads />}
            {activeTab === 'rolling' && <Rolling deals={deals} />}
            {activeTab === 'platts-board' && (
              <PlattsBoard plattsDataset={plattsDataset} setMarketPrice={setMarketPrice} deals={deals} onPushToDeal={pushMopToDeal} />
            )}
            {activeTab === 'platts' && (
              <PlattsImport setMarketPrice={setMarketPrice} marketPrices={marketPrices} onDatasetLoaded={setPlattsDataset} />
            )}
            {activeTab === 'documents' && <Documents deals={deals} />}
            {activeTab === 'resources' && <Resources />}
            {activeTab === 'profile' && <MyProfile currentUser={currentUser} onRestoreDeals={restoreDeals} />}
            {activeTab === 'users' && isAdmin && <UserManagement currentUser={currentUser} onUserUpdate={setCurrentUser} />}
          </div>
        </main>
      </div>
    </div>
  );
}
