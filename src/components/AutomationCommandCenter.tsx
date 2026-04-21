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
import { InstagramAccount, TaskAssignment, PipelineStageKey } from '../types/crm';
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
  const {
    accounts,
    assignments,
    artists,
    interactions,
    orders,
    importMetrics,
    deepScanTask,
    pipelineConfig,
    updatePipelineConfig,
    updatePipelineStage,
    assignTaskToAccount,
    startAutomationSequence
  } = useCRM();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const getCapTotal = (account: InstagramAccount) => {
    if (!account.dailyCaps) return 50;
    return (account.dailyCaps.likes || 0) + (account.dailyCaps.comments || 0) + (account.dailyCaps.follows || 0) + (account.dailyCaps.dms || 0);
  };

  const getWindowLabel = (account: InstagramAccount) => {
    const w = account.activeWindow;
    if (!w) return '09:00-21:00';
    return `${w.startHour.toString().padStart(2, '0')}:00-${w.endHour.toString().padStart(2, '0')}:00`;
  };

  const activeAssignments = useMemo(() => {
    return assignments.filter(a => a.status === 'pending');
  }, [assignments]);

  const stageProgress = useMemo(() => {
    const pendingTasks = assignments.filter(a => a.status === 'pending').length;
    const doneTasks = assignments.filter(a => a.status === 'completed').length;
    return {
      data_import: `${importMetrics.validRows.toLocaleString()} valid / ${importMetrics.rawRows.toLocaleString()} raw`,
      deep_scan: deepScanTask
        ? `${deepScanTask.completed + deepScanTask.failed}/${deepScanTask.total}`
        : `${importMetrics.enrichSuccess + importMetrics.enrichFailed}/${importMetrics.deepScanTargets}`,
      quality_scoring: `${artists.filter(a => (a.heatScore || 0) > 0).length} scored`,
      review_queue: `${pendingTasks} pending review`,
      outreach_execution: `${doneTasks} executed`,
      result_writeback: `${interactions.length} interactions logged`,
      daily_recap: `${orders.length} orders tracked`
    } as Record<PipelineStageKey, string>;
  }, [assignments, importMetrics, deepScanTask, artists, interactions.length, orders.length]);

  const handleStartSequence = async (assignment: TaskAssignment) => {
    await startAutomationSequence(assignment.artistId, assignment.accountId);
  };

  const updateNumericConfig = async (key: 'hourlyTaskCap' | 'dailyTaskCap' | 'minActionIntervalSeconds' | 'quietHoursStart' | 'quietHoursEnd', value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    await updatePipelineConfig({ [key]: safe } as any);
  };

  const getArtistHandle = (id: string) => {
    return artists.find(a => a.id === id)?.username || 'Unknown';
  };

  const getAccountHandle = (id: string) => {
    return accounts.find(a => a.id === id)?.username || 'Unknown';
  };

  return (
    <div className="space-y-8">
      <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-3xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white">Pipeline Control</h3>
            <p className="text-xs text-zinc-500 font-medium">7-step workflow timing and operation limits</p>
          </div>
          <button
            onClick={() => updatePipelineConfig({ globalPause: !pipelineConfig.globalPause })}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border",
              pipelineConfig.globalPause
                ? "bg-red-500/15 text-red-300 border-red-500/30"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            )}
          >
            {pipelineConfig.globalPause ? 'Global Paused' : 'Global Running'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'hourlyTaskCap', label: 'Hourly Cap', value: pipelineConfig.hourlyTaskCap },
            { key: 'dailyTaskCap', label: 'Daily Cap', value: pipelineConfig.dailyTaskCap },
            { key: 'minActionIntervalSeconds', label: 'Min Interval(s)', value: pipelineConfig.minActionIntervalSeconds },
            { key: 'quietHoursStart', label: 'Quiet Start', value: pipelineConfig.quietHoursStart },
            { key: 'quietHoursEnd', label: 'Quiet End', value: pipelineConfig.quietHoursEnd }
          ].map((item) => (
            <label key={item.key} className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">{item.label}</p>
              <input
                type="number"
                value={item.value}
                onChange={(e) => updateNumericConfig(item.key as any, Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-200"
              />
            </label>
          ))}
          <label className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl flex items-center justify-between">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Manual Review</span>
            <input
              type="checkbox"
              checked={pipelineConfig.requireManualReview}
              onChange={(e) => updatePipelineConfig({ requireManualReview: e.target.checked })}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {pipelineConfig.stages.map((stage) => (
            <div key={stage.key} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-white">{stage.label}</p>
                <input
                  type="checkbox"
                  checked={stage.enabled}
                  onChange={(e) => updatePipelineStage(stage.key, { enabled: e.target.checked })}
                />
              </div>
              <p className="text-[10px] text-zinc-500">Progress: {stageProgress[stage.key]}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  Target Min
                  <input
                    type="number"
                    value={stage.targetMinutes}
                    onChange={(e) => updatePipelineStage(stage.key, { targetMinutes: Math.max(1, Number(e.target.value) || 1) })}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-200"
                  />
                </label>
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                  Cooldown(s)
                  <input
                    type="number"
                    value={stage.cooldownSeconds}
                    onChange={(e) => updatePipelineStage(stage.key, { cooldownSeconds: Math.max(0, Number(e.target.value) || 0) })}
                    className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-200"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                    <span className="text-zinc-300">{account.dailyActionCount} / {getCapTotal(account)}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500" 
                      style={{ width: `${Math.min(100, (account.dailyActionCount / Math.max(1, getCapTotal(account))) * 100)}%` }}
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {account.language || 'en'}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {account.speedProfile || 'balanced'}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {account.timezone || 'UTC'}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {getWindowLabel(account)}
                  </span>
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
