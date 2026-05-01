import React, { useState } from 'react';
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
  LogIn,
  LogOut,
  Loader2,
  Zap,
  Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { Toaster, toast } from 'sonner';
import { CRMProvider, useCRM } from './contexts/CRMContext';

// Components
import Dashboard from './components/Dashboard';
import ChatTrainer from './components/ChatTrainer';
import ArtistAnalyzer from './components/ArtistAnalyzer';
import CRMManager from './components/CRMManager';
import DualListManager from './components/DualListManager';
import AutomationSettings from './components/AutomationSettings';
import ShopOutreach from './components/ShopOutreach';
import AutomationCommandCenter from './components/AutomationCommandCenter';

import InventoryManager from './components/InventoryManager';

type Tab = 'dashboard' | 'outreach' | 'analyzer' | 'training' | 'crm' | 'inventory' | 'automation' | 'settings';

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (tab: Tab) => void }) => {
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
    { id: 'inventory', label: 'Inventory', icon: Box },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#111] border-r border-zinc-800/50 z-50 overflow-y-auto scrollbar-hide">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-600/20">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h1 className="font-bold text-xl tracking-tight text-white">InkFlow AI</h1>
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
            {tabs.slice(0, 3).map(renderTab)}
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Intelligence</p>
            {tabs.slice(3, 5).map(renderTab)}
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">System</p>
            {tabs.slice(5).map(renderTab)}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6 border-t border-zinc-800/50 bg-[#111]">
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
          className="w-full flex items-center gap-3 px-4 py-2 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/5 rounded-lg transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

const MainContent = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (tab: Tab) => void }) => {
  const { user, login, isAuthReady } = useCRM();

  if (!isAuthReady) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen ml-64">
        <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen ml-64">
        <div className="w-20 h-20 bg-rose-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-600/20 mb-8">
          <ShoppingBag className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">InkFlow AI</h1>
        <p className="text-zinc-500 text-center max-w-md mb-12 font-medium leading-relaxed">
          Welcome back. Please sign in to access your CRM data and cloud-synced outreach pipeline.
        </p>
        <button 
          onClick={login}
          className="flex items-center gap-4 px-10 py-5 bg-white text-black rounded-[2rem] font-black text-lg hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
        >
          <LogIn className="w-6 h-6" />
          Sign in with Google
        </button>
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
    automation: 'Automation Center',
    settings: 'Settings'
  };

  const descriptions: Record<Tab, string> = {
    dashboard: "Overview of total leads, conversion rates, and daily hot leads.",
    outreach: "A large searchable table of tattoo artists and shops.",
    analyzer: "A deep-dive profile page for a single artist and post analysis.",
    training: "Manage AI personas and chat history to refine automation.",
    crm: "Manage 'Engaged' and 'Customers' through the lifecycle funnel.",
    inventory: "Master stock management, SKU tracking, and AI-driven restocking alerts.",
    automation: "AdsPower & Playwright multi-account orchestration command center.",
    settings: "Configure API keys and automation safety settings."
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
          {activeTab === 'crm' && <DualListManager />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'automation' && <AutomationCommandCenter />}
          {activeTab === 'settings' && <AutomationSettings />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <CRMProvider>
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-rose-500/30">
        <Toaster position="top-right" theme="dark" richColors />
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <MainContent activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </CRMProvider>
  );
}
