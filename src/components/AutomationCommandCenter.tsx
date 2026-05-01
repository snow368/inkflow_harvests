import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Zap, 
  Clock, 
  Activity, 
  UserCheck, 
  AlertCircle, 
  Play, 
  Pause, 
  RefreshCw,
  Globe,
  Lock,
  Eye,
  MousePointer2,
  MessageSquare,
  UserPlus,
  ChevronRight,
  Monitor,
  Instagram,
  Settings,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useCRM } from '../contexts/CRMContext';
import { InstagramAccount, TaskAssignment } from '../types/crm';
import { toast } from 'sonner';

const StatusBadge = ({ status }: { status: InstagramAccount['status'] }) => {
  const styles = {
    idle: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    running: 'bg-green-500/10 text-green-500 border-green-500/20 animate-pulse',
    cooldown: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    banned: 'bg-red-500/10 text-red-500 border-red-500/20'
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase border", styles[status])}>
      {status}
    </span>
  );
};

export default function AutomationCommandCenter() {
  const { accounts, assignments, artists, assignTaskToAccount, startAutomationSequence } = useCRM();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const activeAssignments = useMemo(() => {
    return assignments.filter(a => a.status === 'pending');
  }, [assignments]);

  const handleStartSequence = async (assignment: TaskAssignment) => {
    await startAutomationSequence(assignment.artistId, assignment.accountId);
  };

  const getArtistHandle = (id: string) => {
    return artists.find(a => a.id === id)?.username || 'Unknown';
  };

  const getAccountHandle = (id: string) => {
    return accounts.find(a => a.id === id)?.username || 'Unknown';
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Accounts', value: accounts.length, icon: Shield, color: 'text-blue-500' },
          { label: 'Pending Tasks', value: activeAssignments.length, icon: Clock, color: 'text-amber-500' },
          { label: 'Daily Actions', value: accounts.reduce((acc, curr) => acc + curr.dailyActionCount, 0), icon: Zap, color: 'text-rose-500' },
          { label: 'Safety Score', value: '98%', icon: UserCheck, color: 'text-green-500' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl bg-zinc-800", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Live</span>
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-xs font-medium text-zinc-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Account Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                <Monitor className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Account Fleet</h3>
                <p className="text-xs text-zinc-500 font-medium">AdsPower / Playwright Orchestration</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors">
              Add Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map(account => (
              <div 
                key={account.id}
                onClick={() => setSelectedAccountId(account.id)}
                className={cn(
                  "p-5 rounded-[2rem] border transition-all cursor-pointer group",
                  selectedAccountId === account.id 
                    ? "bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/30" 
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                      <Instagram className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">@{account.username}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{account.behaviorProfile} Profile</p>
                    </div>
                  </div>
                  <StatusBadge status={account.status} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-zinc-500 uppercase tracking-widest">Daily Limit</span>
                    <span className="text-zinc-300">{account.dailyActionCount} / 50</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500" 
                      style={{ width: `${(account.dailyActionCount / 50) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] font-medium text-zinc-500">Proxy: {account.proxyIp || 'None'}</span>
                  </div>
                  <button className="text-zinc-500 hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Queue */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
              <Activity className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Task Queue</h3>
              <p className="text-xs text-zinc-500 font-medium">Real-time Orchestration</p>
            </div>
          </div>

          <div className="space-y-3">
            {activeAssignments.length > 0 ? (
              activeAssignments.map(assignment => (
                <div key={assignment.id} className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl group hover:border-rose-500/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Target</span>
                      <span className="text-xs font-black text-white">@{getArtistHandle(assignment.artistId)}</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg">Pending</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Via</span>
                    <span className="text-xs font-bold text-zinc-400">@{getAccountHandle(assignment.accountId)}</span>
                  </div>

                  <button 
                    onClick={() => handleStartSequence(assignment)}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Execute Protocol
                  </button>
                </div>
              ))
            ) : (
              <div className="p-10 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-sm font-bold text-zinc-500">No pending tasks</p>
                <p className="text-[10px] text-zinc-600 mt-1">Assign artists from the CRM to start automation</p>
              </div>
            )}
          </div>

          {/* Protocol Visualization */}
          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-[2rem]">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Anti-Ban Protocol
            </h4>
            
            <div className="space-y-6">
              {[
                { label: 'Profile Entry', icon: Eye, delay: '0s' },
                { label: 'Random Scroll', icon: MousePointer2, delay: '12s' },
                { label: 'Like Recent', icon: Heart, delay: '45s' },
                { label: 'AI Comment', icon: MessageSquare, delay: '120s' },
                { label: 'Follow', icon: UserPlus, delay: '180s' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 relative">
                  {i < 4 && <div className="absolute left-4 top-8 bottom-[-1.5rem] w-px bg-zinc-800" />}
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center z-10 border border-zinc-700">
                    <step.icon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-zinc-300">{step.label}</p>
                    <p className="text-[10px] text-zinc-600 font-medium">Jitter Delay: {step.delay}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
