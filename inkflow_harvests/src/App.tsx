import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Instagram, 
  MapPin, 
  Settings, 
  ChevronRight,
  TrendingUp,
  Users,
  ShoppingBag,
  Clock,
  Flame,
  Search,
  Target,
  BarChart3,
  LogIn,
  LogOut,
  Loader2,
  Zap,
  Box,
  ListTodo,
  Bot,
  Calendar,
  Database,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { Toaster, toast } from 'sonner';
import { CRMProvider, useCRM } from './contexts/CRMContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, getStoredEmailAuth } from './lib/firebase';
import { apiFetch } from './lib/api-auth';

// Components
import Dashboard from './components/Dashboard';
import ChatTrainer from './components/ChatTrainer';
import ArtistAnalyzer from './components/ArtistAnalyzer';
import CRMManager from './components/CRMManager';
import DualListManager from './components/DualListManager';
import AutomationSettings from './components/AutomationSettings';
import ShopOutreach from './components/ShopOutreach';
import AutomationCommandCenter from './components/AutomationCommandCenter';
import TaskManager from './components/TaskManager';

import InventoryManager from './components/InventoryManager';
import ProductCatalog from './components/ProductCatalog';
import NewArrivals from './components/NewArrivals';
import SalesChat from './components/SalesChat';
import OrderManager from './components/OrderManager';
import BotWorkerManager from './components/BotWorkerManager';
import BotTaskStatus from './components/BotTaskStatus';
import PublishCalendar from './components/PublishCalendar';
import MarketIntelligence from './components/MarketIntelligence';
import ContentOperations from './components/ContentOperations';

import InkFlowOutreach from './components/InkFlowOutreach';
import EmailAuthForm from './components/EmailAuthForm';
import ScrapeConfig from './components/ScrapeConfig';
import AdminUsers from './components/AdminUsers';


type Tab = 'dashboard' | 'outreach' | 'analyzer' | 'training' | 'crm' | 'market-intelligence' | 'inventory' | 'orders' | 'tasks' | 'automation' | 'botworkers' | 'settings' | 'publish' | 'scrape' | 'product-catalog' | 'new-arrivals' | 'sales-chat' | 'admin' | 'inkflow-outreach';

const DynamicLoad = ({ component: load, fallback }: { component: () => Promise<any>, fallback?: any }) => {
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => { load().then(m => setComp(() => m.default || m)); }, []);
  return Comp ? <Comp /> : fallback || null;
};

const Sidebar = ({ activeTab, setActiveTab, userTabs, setUserTabs }: { activeTab: Tab, setActiveTab: (tab: Tab) => void, userTabs: string[] | null, setUserTabs: (tabs: string[] | null) => void }) => {
  const { artists, user, logout } = useCRM();
  
  const getHighIntentCount = () => {
    return artists.filter(a => a.stage === 'engaged' && a.heatScore >= 80).length;
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'outreach', label: 'Shop Outreach', icon: Search },
    { id: 'analyzer', label: 'Artist Analyzer', icon: Instagram },
    { id: 'training', label: 'AI Training', icon: MessageSquare },
    { id: 'crm', label: 'CRM (Lifecycle)', icon: Users },
    { id: 'market-intelligence', label: 'Market Intelligence', icon: BarChart3 },
    { id: 'inventory', label: 'Inventory', icon: Box },
    { id: 'product-catalog', label: '商品知识库', icon: Database },
    { id: 'new-arrivals', label: '新品情报', icon: Sparkles },
    { id: 'sales-chat', label: '聊单情报', icon: MessageSquare },
    { id: 'orders', label: 'Orders', icon: Box },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'publish', label: 'Content Operations', icon: Calendar },
    { id: 'botworkers', label: 'Bot Workers', icon: Bot },
    { id: 'scrape', label: 'Scrape', icon: Search },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Admin-only tabs
  const isSnow368 = user?.email === 'snow368@gmail.com';
  const inkflowTab = { id: 'inkflow-outreach', label: 'InkFlow 获客', icon: Target };
  const adminTab = { id: 'admin', label: 'Admin', icon: Users };
  const allowedTabs = userTabs === null ? tabs : tabs.filter(t => userTabs.includes(t.id));
  const showAdmin = isSnow368 || (userTabs !== null && userTabs.includes('admin'));
  const showInkflow = isSnow368 || (userTabs !== null && userTabs.includes('inkflow-outreach'));
  let allTabs = [...allowedTabs];
  if (showInkflow) allTabs.push(inkflowTab);
  if (showAdmin) allTabs.push(adminTab);

  
  const renderTab = (tab: typeof tabs[0]) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    const highIntentCount = tab.id === 'crm' ? getHighIntentCount() : 0;

    return (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id as Tab)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative",
          isActive 
            ? "bg-rose-600/10 text-rose-500 border border-rose-500/20" 
            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("w-5 h-5", isActive ? "text-rose-500" : "text-zinc-500 group-hover:text-zinc-300")} />
          <span className="font-medium">{tab.label}</span>
        </div>
        
        {highIntentCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white shadow-lg shadow-red-600/20 animate-pulse">
              {highIntentCount}
            </span>
            {highIntentCount >= 5 && <Flame className="w-3 h-3 text-red-500 animate-bounce" />}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#111] border-r border-zinc-800/50 z-50" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="p-6" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/20">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h1 className="font-bold text-xl tracking-tight text-white">HarvestsAI</h1>
              <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/50">
                {artists.length}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Tattoo Supply Automator</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Main</p>
            {allTabs.filter(t => ['dashboard','outreach','analyzer'].includes(t.id)).map(renderTab)}
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Intelligence</p>
            {allTabs.filter(t => ['training','crm','market-intelligence'].includes(t.id)).map(renderTab)}
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">System</p>
            {allTabs.filter(t => ['inventory','orders','tasks','automation','publish','botworkers','scrape','settings','product-catalog','new-arrivals','sales-chat'].includes(t.id)).map(renderTab)}
          </div>

          {isSnow368 && (
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-black text-rose-600/50 uppercase tracking-widest mb-2">Snow Only</p>
              {renderTab(inkflowTab)}
              {renderTab(adminTab)}
            </div>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0 }} className="p-6 border-t border-zinc-800/50 bg-[#111]">
        <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 mb-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName || 'Active User'}</p>
            <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          onTouchEnd={(e) => { e.preventDefault(); logout(); }}
          className="w-full flex items-center gap-3 px-4 py-2 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/5 rounded-lg transition-all group"
          style={{ touchAction: 'manipulation' }}
        >
          <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

const MainContent = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (tab: Tab) => void }) => {
  const { user, login, isAuthReady, registerStatus, registerUser } = useCRM();
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<'login'|'register'>('login');
  const [regForm, setRegForm] = useState({ name: '', reason: '' });
  const [regSaving, setRegSaving] = useState(false);

  if (!isAuthReady) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen ml-64">
        <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
      </div>
    );
  }

  // Registration gate — after login, check approval
  if (user && registerStatus === 'pending') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen ml-64">
        <div className="w-20 h-20 bg-amber-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-amber-600/20 mb-8">
          <Clock className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4 tracking-tighter">Access Pending</h1>
        <p className="text-zinc-500 text-center max-w-md mb-4 font-medium leading-relaxed">
          Your access request has been submitted and is waiting for admin approval.
        </p>
        <p className="text-xs text-zinc-600 text-center max-w-sm">
          Please wait for snow368 to approve your account. You will be able to sign in once approved.
        </p>
      </div>
    );
  }

  if (user && registerStatus === 'none') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen ml-64">
        <div className="w-20 h-20 bg-rose-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-600/20 mb-8">
          <ShoppingBag className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4 tracking-tighter">Request Access</h1>
        <p className="text-zinc-500 text-center max-w-md mb-6 text-sm">
          Your Google account ({user.email}) is not registered. Please submit a request to get access.
        </p>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 w-full max-w-sm space-y-3">
          <input value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Your name" className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
          <textarea value={regForm.reason} onChange={e => setRegForm(p => ({ ...p, reason: e.target.value }))}
            placeholder="Why do you need access?" rows={3}
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none resize-none" />
          <button onClick={async () => {
            if (!regForm.name) return;
            setRegSaving(true);
            await registerUser(regForm.name, regForm.reason);
            setRegSaving(false);
          }} disabled={regSaving || !regForm.name}
            className="w-full px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-sm font-semibold">
            {regSaving ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen ml-64">
        <div className="w-20 h-20 bg-rose-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-600/20 mb-8">
          <ShoppingBag className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">HarvestsAI</h1>
        <p className="text-zinc-500 text-center max-w-md mb-12 font-medium leading-relaxed">
          Welcome back. Please sign in to access your CRM data and cloud-synced outreach pipeline.
        </p>
        {showEmailAuth ? (
          <EmailAuthForm
            key={emailAuthMode}
            defaultMode={emailAuthMode}
            onBackToGoogle={() => setShowEmailAuth(false)}
            onSuccess={() => window.location.reload()} />
        ) : (
          <>
          <button 
            onClick={login}
            className="flex items-center gap-4 px-10 py-5 bg-white text-black rounded-[2rem] font-black text-lg hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
          >
            <LogIn className="w-6 h-6" />
            Sign in with Google
          </button>
          <div className="flex gap-2 mt-3">
          <button
            onClick={() => { setShowEmailAuth(true); setEmailAuthMode('login'); }}
            className="flex-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 rounded-xl py-2"
          >
            Sign in with Email
          </button>
          <button
            onClick={() => { setShowEmailAuth(true); setEmailAuthMode('register'); }}
            className="flex-1 text-xs text-emerald-500 hover:text-emerald-300 transition-colors border border-emerald-800/30 rounded-xl py-2"
          >
            Register
          </button>
          </div>
          </>
        )}
        <p className="mt-8 text-zinc-600 text-[10px] uppercase tracking-[0.2em] font-black">
          Secure Cloud Persistence Enabled
        </p>
      </div>
    );
  }

  const labels: Record<Tab, string> = {
    dashboard: 'Dashboard',
    outreach: 'Shop Outreach',
    analyzer: 'Artist Analyzer',
    training: 'AI Training',
    crm: 'CRM (Lifecycle)',
    inventory: 'Inventory Manager',
    tasks: 'Task Manager',
    automation: 'Automation Center',
    botworkers: 'Bot Workers',
    settings: 'Settings',
    publish: 'Publish Calendar',
    'inkflow-outreach': 'InkFlow 获客',
    scrape: 'Scrape',
    'product-catalog': '商品知识库',
    'new-arrivals': '新品情报',
    'sales-chat': '聊单情报',
    admin: 'Admin'
  };

  const descriptions: Record<Tab, string> = {
    dashboard: "Overview of total leads, conversion rates, and daily hot leads.",
    outreach: "A large searchable table of tattoo artists and shops.",
    analyzer: "A deep-dive profile page for a single artist and post analysis.",
    training: "Manage AI personas and chat history to refine automation.",
    crm: "Manage 'Engaged' and 'Customers' through the lifecycle funnel.",
    inventory: "Master stock management, SKU tracking, and AI-driven restocking alerts.",
    tasks: "View automation tasks, dispatch supply analysis, and track bot progress.",
    automation: "AdsPower & Playwright multi-account orchestration command center.",
    botworkers: "Start, stop, and manage bot worker processes...",
    settings: "Configure API keys and automation safety settings.",
    publish: "Schedule and publish content to social platforms.",
    'inkflow-outreach': "Shared resource pool for InkFlow customer outreach. Only visible to dev users.",
    scrape: 'Configure and submit data scraping tasks by keyword and location.',
    'product-catalog': 'AI Core 商品知识库：从 harvests-db 导入的纹身器材商品，支持搜索与一键重新导入。',
    'new-arrivals': '新品情报：竞品上新聚合（跨品牌）+ 我方选品候选池，按首见时间窗筛选。',
    'sales-chat': '聊单情报：意大利等本土客户聊天录音/文本入库，自动分析情感与信号，区分批发商/纹身师，跟踪成交阶段。',
    admin: 'User management, quotas, and system stats.'
  };

  return (
    <main className="ml-64 p-8">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1 text-white">
            {labels[activeTab]}
          </h2>
          <p className="text-zinc-500">
            {descriptions[activeTab]}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-zinc-400">AI Engine Active</span>
          </div>
          <button 
            onClick={() => {
              setActiveTab('automation');
              toast.success("Campaign Engine Initialized", {
                description: "Redirecting to Automation Command Center..."
              });
            }}
            className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-rose-600/20"
          >
            Start Campaign
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === 'outreach' && <ShopOutreach onNavigate={setActiveTab} />}
          {activeTab === 'analyzer' && <ArtistAnalyzer />}
          {activeTab === 'training' && <ChatTrainer />}
              {activeTab === 'market-intelligence' && <MarketIntelligence />}
          {activeTab === 'crm' && <CRMManager />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'product-catalog' && <ProductCatalog />}
          {activeTab === 'new-arrivals' && <NewArrivals />}
          {activeTab === 'sales-chat' && <SalesChat />}
          {activeTab === 'orders' && <OrderManager />}
          {activeTab === 'tasks' && <TaskManager />}
          {activeTab === 'automation' && <AutomationCommandCenter />}
          {activeTab === 'botworkers' && (
            <div className="space-y-6">
              <BotTaskStatus />
              <BotWorkerManager />
            </div>
          )}
          {activeTab === 'publish' && <ContentOperations />}
          {activeTab === 'settings' && <AutomationSettings />}
          {activeTab === 'scrape' && <ScrapeConfig />}
          {activeTab === 'admin' && <><AdminUsers />
          <DynamicLoad component={() => import('./components/UserPermissions')} fallback={null} />
        </>}
          {activeTab === 'inkflow-outreach' && <InkFlowOutreach />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const validTabs: Tab[] = ['dashboard','outreach','analyzer','training','crm','inventory','orders','tasks','automation','botworkers','settings','publish','scrape','product-catalog','new-arrivals','sales-chat','admin','inkflow-outreach'];
    return validTabs.includes(hash as Tab) ? (hash as Tab) : 'dashboard';
  });
  const [userTabs, setUserTabs] = useState<string[] | null>(null);

  // Load user permissions from API (D1, not Firestore)
  useEffect(() => {
    const checkPerms = async (email: string) => {
      try {
        const res = await apiFetch(`/api/auth/permissions/${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setUserTabs(data.tabs && data.tabs.length > 0 ? data.tabs : null);
        } else {
          setUserTabs(null);
        }
      } catch { setUserTabs(null); }
    };

    // Check email auth proxy user first
    const stored = getStoredEmailAuth();
    if (stored?.email && stored.email !== 'snow368@gmail.com') {
      checkPerms(stored.email);
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u?.email) {
        // If no Firebase SDK user but has stored email auth, already checked above
        if (!stored?.email || stored.email === 'snow368@gmail.com') {
          setUserTabs(null);
        }
        return;
      }
      if (u.email === 'snow368@gmail.com') { setUserTabs(null); return; }
      checkPerms(u.email);
    });
    return unsub;
  }, []);

  
  useEffect(() => {
    const hash = activeTab === 'dashboard' ? '' : activeTab;
    if (window.location.hash.replace(/^#\/?/, '') !== hash) {
      window.history.replaceState(null, '', `#/${hash}`);
    }
  }, [activeTab]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const validTabs: Tab[] = ['dashboard','outreach','analyzer','training','crm','inventory','orders','tasks','automation','botworkers','settings','publish','scrape','product-catalog','new-arrivals','sales-chat','admin','inkflow-outreach'];
      if (validTabs.includes(hash as Tab)) setActiveTab(hash as Tab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <CRMProvider>
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-rose-500/30">
        <Toaster position="top-right" theme="dark" richColors />
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userTabs={userTabs} setUserTabs={setUserTabs} />
        <MainContent activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </CRMProvider>
  );
}
