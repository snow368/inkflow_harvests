import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  Bot, Play, Square, Loader2, Instagram, ShoppingCart, Search,
  MessageSquare, Zap, Activity, Clock, Settings, Globe, Monitor,
  ChevronDown, ChevronRight, RefreshCw, Cpu, Plus, Trash2,
  PlayCircle, StopCircle, User, Shield, Wifi,
  Brain, Target, BarChart3, TrendingUp, MessageCircle, ListTodo
} from 'lucide-react';

type BotConfig = {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text';
  options?: string[];
  default: string | number;
  min?: number;
  max?: number;
  step?: number;
};

type BotFunction = {
  id: string;
  name: string;
  description: string;
  script: string;
  defaultBotId: string | null;
  execMode: string | null;
  taskType: string | null;
  browserMode: string;
  multiAccount: boolean;
  workflow?: string;
  businessValue?: string[];
  outputs?: string[];
  useCases?: string[];
  configs: BotConfig[];
};

type BotWorker = {
  botId: string;
  functionId: string;
  pid: number;
  startedAt: number;
  running: boolean;
};

type AccountEntry = {
  botId: string;
  proxy: string;
  execMode: string;
  speedFactor: number;
};

const STORAGE_KEY = 'inkflow_bot_accounts';

const FUNCTION_ICONS: Record<string, React.ElementType> = {
  ig_outreach: Instagram,
  supply_analysis: ShoppingCart,
  reddit_intel: Search,
  content_pipeline: Zap,
  forum_monitor: MessageSquare,
  product_tracker: Activity,
  supply_comments: MessageCircle,
};

const FUNCTION_COLORS: Record<string, string> = {
  ig_outreach: 'rose',
  supply_analysis: 'cyan',
  reddit_intel: 'orange',
  content_pipeline: 'violet',
  forum_monitor: 'green',
  product_tracker: 'blue',
  supply_comments: 'purple',
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; btn: string; ring: string; dot: string; lightBg: string }> = {
  rose:    { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-500', btn: 'bg-rose-600 hover:bg-rose-500', ring: 'ring-rose-500/30', dot: 'bg-rose-500', lightBg: 'bg-rose-500/5' },
  cyan:    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-500', btn: 'bg-cyan-600 hover:bg-cyan-500', ring: 'ring-cyan-500/30', dot: 'bg-cyan-500', lightBg: 'bg-cyan-500/5' },
  orange:  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500', btn: 'bg-orange-600 hover:bg-orange-500', ring: 'ring-orange-500/30', dot: 'bg-orange-500', lightBg: 'bg-orange-500/5' },
  violet:  { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-500', btn: 'bg-violet-600 hover:bg-violet-500', ring: 'ring-violet-500/30', dot: 'bg-violet-500', lightBg: 'bg-violet-500/5' },
  green:   { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500', btn: 'bg-green-600 hover:bg-green-500', ring: 'ring-green-500/30', dot: 'bg-green-500', lightBg: 'bg-green-500/5' },
  blue:    { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', btn: 'bg-blue-600 hover:bg-blue-500', ring: 'ring-blue-500/30', dot: 'bg-blue-500', lightBg: 'bg-blue-500/5' },
  purple:  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500', btn: 'bg-purple-600 hover:bg-purple-500', ring: 'ring-purple-500/30', dot: 'bg-purple-500', lightBg: 'bg-purple-500/5' },
};

const BROWSER_MODE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  persistent: { label: 'Playwright Persistent', icon: Globe },
  cdp: { label: 'CDP Chrome', icon: Monitor },
  playwright: { label: 'Playwright', icon: Globe },
  none: { label: '无需浏览器', icon: Cpu },
};

// Load/save accounts from localStorage
const loadAccounts = (): AccountEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const saveAccounts = (accounts: AccountEntry[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); } catch {}
};

// ── Bot Account Setup (IG handle + first_used_at) ──
const STAGES = ['new', 'transition', 'growing', 'stable', 'mature'];
function AccountSetupSection() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [botId, setBotId] = useState('bot_ig_01');
  const [igHandle, setIgHandle] = useState('');
  const [firstDate, setFirstDate] = useState('');
  const [vpsName, setVpsName] = useState('');
  const [proxyIp, setProxyIp] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/automation/dashboard');
      const data = await res.json();
      if (data?.accounts) setAccounts(data.accounts);
    } catch {}
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const calcStage = (days: number) =>
    days < 7 ? 'new' : days < 14 ? 'transition' : days < 30 ? 'growing' : days < 60 ? 'stable' : 'mature';
  const calcLimit = (days: number) =>
    days < 7 ? 5 : days < 14 ? 10 : days < 30 ? 20 : days < 60 ? 30 : 50;

  const handleSave = async () => {
    if (!botId || !firstDate) return;
    setSaving(true);
    try {
      const params = new URLSearchParams({ botId });
      if (igHandle) params.set('igHandle', igHandle);
      if (firstDate) params.set('firstUsedAt', firstDate);
      if (vpsName) params.set('vpsName', vpsName);
      if (proxyIp) params.set('proxyIp', proxyIp);
      const res = await fetch('/api/automation/bot-account/set?' + params.toString());
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`${botId} 已设置`);
        setIgHandle(''); setVpsName(''); setProxyIp('');
        fetchAccounts();
      } else {
        toast.error('保存失败', { description: data.error });
      }
    } catch (e: any) {
      toast.error('保存失败', { description: e.message });
    }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6">
      <div className="flex items-center gap-3 mb-5">
        <User className="w-5 h-5 text-rose-500" />
        <h4 className="font-black text-sm text-white">Bot 账号管理</h4>
        <span className="text-[10px] font-bold text-zinc-500">{accounts.length} 个账号</span>
      </div>

      {/* Edit form */}
      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-[100px]">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Bot ID</label>
          <input type="text" value={botId} onChange={e => setBotId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">IG 号</label>
          <input type="text" value={igHandle} onChange={e => setIgHandle(e.target.value)} placeholder="rhyssnkoi"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">启用日期</label>
          <input type="date" value={firstDate} onChange={e => setFirstDate(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1 min-w-[100px]">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">VPS 名称</label>
          <input type="text" value={vpsName} onChange={e => setVpsName(e.target.value)} placeholder="VPS-NY"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-zinc-500" />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">IP / 代理</label>
          <input type="text" value={proxyIp} onChange={e => setProxyIp(e.target.value)} placeholder="163.245.212.169"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-zinc-500" />
        </div>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
          {saving ? '保存中…' : '保存'}
        </button>
      </div>

      {/* Account list */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-600 font-bold text-[10px] uppercase tracking-wider">
              <td className="pb-2 pr-3">Bot ID</td>
              <td className="pb-2 pr-3">IG Handle</td>
              <td className="pb-2 pr-3">VPS</td>
              <td className="pb-2 pr-3">IP</td>
              <td className="pb-2 pr-3">启用日期</td>
              <td className="pb-2 pr-3">天数</td>
              <td className="pb-2 pr-3">阶段</td>
              <td className="pb-2 pr-3">日限额</td>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a: any) => {
              const days = a.firstUsedAt ? Math.floor((Date.now() - new Date(a.firstUsedAt).getTime()) / 86400000) : 0;
              const stage = a.stage || calcStage(days);
              const limit = a.dailyLimit || calcLimit(days);
              return (
                <tr key={a.accountId} className="border-t border-zinc-800/50 text-zinc-300 font-medium">
                  <td className="py-2 pr-3">{a.accountId}</td>
                  <td className="py-2 pr-3">{a.igHandle || '-'}</td>
                  <td className="py-2 pr-3 text-zinc-500">{a.vpsName || '-'}</td>
                  <td className="py-2 pr-3 text-zinc-500 font-mono text-[10px]">{a.proxy || '-'}</td>
                  <td className="py-2 pr-3">{a.firstUsedAt ? new Date(a.firstUsedAt).toLocaleDateString() : '-'}</td>
                  <td className="py-2 pr-3">{days}d</td>
                  <td className="py-2 pr-3">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                      stage === 'new' ? 'bg-blue-500/10 text-blue-400'
                      : stage === 'transition' ? 'bg-amber-500/10 text-amber-400'
                      : stage === 'growing' ? 'bg-green-500/10 text-green-400'
                      : stage === 'stable' ? 'bg-violet-500/10 text-violet-400'
                      : 'bg-rose-500/10 text-rose-400')}>{stage}</span>
                  </td>
                  <td className="py-2 pr-3">{limit}/天</td>
                </tr>
              );
            })}
            {accounts.length === 0 && (
              <tr><td colSpan={6} className="py-4 text-center text-zinc-600">暂无账号，填写表单添加</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ── Behavior Log Viewer ──
const EVENT_COLORS: Record<string, string> = {
  open_profile: 'text-blue-400', open_post: 'text-cyan-400', browse_selection: 'text-violet-400',
  media_opened_total: 'text-green-400', human_break_start: 'text-amber-400',
  fresh_profile: 'text-rose-400', task_done: 'text-emerald-400', task_failed: 'text-red-400',
  action_blocked: 'text-red-500 font-bold', rate_limited: 'text-orange-500 font-bold',
};
const LOG_EVENTS = ['', 'open_profile', 'open_post', 'browse_selection', 'human_break_start', 'task_done', 'task_failed', 'action_blocked', 'rate_limited', 'fresh_profile', 'media_opened_total'];
function BehaviorLogSection() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterBot, setFilterBot] = useState('bot_ig_01');
  const [filterEvent, setFilterEvent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ botId: filterBot, limit: '100' });
      if (filterEvent) params.set('event', filterEvent);
      const res = await fetch(`/api/automation/behavior-logs?${params}`);
      const data = await res.json();
      if (data?.logs) setLogs(data.logs);
    } catch {}
    setLoading(false);
  }, [filterBot, filterEvent]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <ListTodo className="w-5 h-5 text-cyan-500" />
          <h4 className="font-black text-sm text-white">行为日志</h4>
          <span className="text-[10px] font-bold text-zinc-500">{logs.length} 条</span>
        </div>
        <button onClick={fetchLogs} disabled={loading} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
          {loading ? '加载中…' : '刷新'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="w-28">
          <select value={filterBot} onChange={e => setFilterBot(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] text-zinc-300 font-medium focus:outline-none">
            <option value="bot_ig_01">bot_ig_01</option>
          </select>
        </div>
        <div className="w-36">
          <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] text-zinc-300 font-medium focus:outline-none">
            {LOG_EVENTS.map(e => <option key={e} value={e}>{e || '全部事件'}</option>)}
          </select>
        </div>
      </div>

      {/* Log list */}
      <div className="max-h-[400px] overflow-y-auto space-y-1">
        {logs.map((log: any, i: number) => (
          <div key={log.id || i} className="flex items-start gap-2 p-2 rounded-xl hover:bg-zinc-900/50 transition-colors">
            <span className="text-[10px] text-zinc-600 font-mono whitespace-nowrap w-14 flex-shrink-0">
              {log.ts ? new Date(log.ts).toLocaleTimeString() : ''}
            </span>
            <span className={cn("text-[10px] font-mono font-bold whitespace-nowrap flex-shrink-0", EVENT_COLORS[log.event] || 'text-zinc-400')}>
              {log.event}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium truncate min-w-0">
              {log.handle ? `@${log.handle}` : ''}
              {log.mode ? ` [${log.mode}]` : ''}
              {log.reason ? ` ${log.reason}` : ''}
              {log.watchMs ? ` ${Math.round(log.watchMs/1000)}s` : ''}
              {log.breakMs ? ` 休息${Math.round(log.breakMs/1000/60)}m` : ''}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="py-6 text-center text-xs text-zinc-600 font-medium">暂无日志</div>
        )}
      </div>
    </motion.div>
  );
}

export default function BotWorkerManager() {
  const [functions, setFunctions] = useState<BotFunction[]>([]);
  const [workers, setWorkers] = useState<BotWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<Set<string>>(new Set());
  const [stopping, setStopping] = useState<Set<string>>(new Set());
  const [expandedFn, setExpandedFn] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [accounts, setAccounts] = useState<AccountEntry[]>(() => loadAccounts());
  const [learnProfiles, setLearnProfiles] = useState<any[]>([]);
  const [dmTaskCount, setDmTaskCount] = useState(0);
  const [neonTasks, setNeonTasks] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [fnRes, wRes, learnRes, dmStatsRes, neonRes] = await Promise.all([
        fetch('/api/bot/functions'),
        fetch('/api/bot/workers'),
        fetch('/api/bot/learn/status'),
        fetch('/api/marketing/tasks/stats'),
        fetch('/api/automation/neon-tasks?limit=50').catch(() => null),
      ]);
      if (fnRes.ok) {
        const fnData = await fnRes.json();
        setFunctions(fnData.functions || []);
        setConfigs(prev => {
          const next = { ...prev };
          for (const fn of fnData.functions || []) {
            if (!next[fn.id]) {
              next[fn.id] = {};
              for (const cfg of fn.configs || []) {
                next[fn.id][cfg.key] = String(cfg.default ?? '');
              }
            }
          }
          return next;
        });
      }
      if (wRes.ok) {
        const wData = await wRes.json();
        setWorkers(wData.workers || []);
      }
      if (learnRes?.ok) {
        const l = await learnRes.json();
        setLearnProfiles(Array.isArray(l?.profiles) ? l.profiles : []);
      }
      if (dmStatsRes?.ok) {
        const d = await dmStatsRes.json();
        setDmTaskCount(d?.total || 0);
      }
      if (neonRes?.ok) {
        const n = await neonRes.json();
        setNeonTasks(n?.tasks || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-poll worker status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/bot/workers');
        if (res.ok) {
          const data = await res.json();
          setWorkers(data.workers || []);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Persist accounts
  useEffect(() => { saveAccounts(accounts); }, [accounts]);

  const isRunning = (botId: string) => workers.some(w => w.botId === botId && w.running);

  const getWorker = (botId: string) => workers.find(w => w.botId === botId && w.running);

  const uptime = (startedAt: number) => {
    const diff = Date.now() - startedAt;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  // ── Single bot start/stop ──
  const handleStart = async (fn: BotFunction, botId: string, extraEnv?: Record<string, string>) => {
    const key = `${fn.id}:${botId}`;
    setStarting(prev => new Set(prev).add(key));
    try {
      const env: Record<string, string> = { ...configs[fn.id] };
      if (extraEnv) Object.assign(env, extraEnv);
      const res = await fetch('/api/bot/worker/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionId: fn.id, botId, env }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Start failed');
      toast.success(`${fn.name} · ${botId} 已启动`);
      fetchData();
    } catch (e: any) {
      toast.error(`${botId} 启动失败`, { description: e.message });
    } finally {
      setStarting(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  const handleStop = async (botId: string) => {
    setStopping(prev => new Set(prev).add(botId));
    try {
      const res = await fetch(`/api/bot/worker/stop/${botId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Stop failed');
      toast.success(`${botId} 已停止`);
      fetchData();
    } catch (e: any) {
      toast.error(`停止 ${botId} 失败`, { description: e.message });
    } finally {
      setStopping(prev => { const n = new Set(prev); n.delete(botId); return n; });
    }
  };

  // ── Account management for IG Outreach ──
  const getNextBotId = () => {
    const existing = accounts.map(a => {
      const m = a.botId.match(/bot_outreach_(\d+)/);
      return m ? parseInt(m[1]) : 0;
    }).filter(n => n > 0);
    const max = existing.length > 0 ? Math.max(...existing) : 0;
    return `bot_outreach_${String(max + 1).padStart(2, '0')}`;
  };

  const addAccount = () => {
    setAccounts(prev => [...prev, {
      botId: getNextBotId(),
      proxy: '',
      execMode: 'browse_like',
      speedFactor: 1.0,
    }]);
    setExpandedFn('ig_outreach');
  };

  const removeAccount = (botId: string) => {
    if (isRunning(botId)) {
      toast.error(`请先停止 ${botId} 再删除`);
      return;
    }
    setAccounts(prev => prev.filter(a => a.botId !== botId));
  };

  const updateAccount = (botId: string, field: keyof AccountEntry, value: string | number) => {
    setAccounts(prev => prev.map(a => a.botId === botId ? { ...a, [field]: value } : a));
  };

  const startAll = (fn: BotFunction) => {
    for (const acc of accounts) {
      if (!isRunning(acc.botId)) {
        const env: Record<string, string> = {
          BOT_EXEC_MODE: acc.execMode,
          BOT_SPEED_FACTOR: String(acc.speedFactor),
          ...configs[fn.id],
        };
        if (acc.proxy) env['BOT_PROXY_SERVER'] = acc.proxy;
        if (env.BOT_CDP_URL) delete env.BOT_CDP_URL;
        handleStart(fn, acc.botId, env);
      }
    }
  };

  const stopAll = () => {
    for (const acc of accounts) {
      if (isRunning(acc.botId)) handleStop(acc.botId);
    }
  };

  const addBatchAccounts = (count: number) => {
    const newAccounts: AccountEntry[] = [];
    for (let i = 0; i < count; i++) {
      newAccounts.push({
        botId: getNextBotId(),
        proxy: '',
        execMode: 'browse_like',
        speedFactor: 1.0,
      });
    }
    setAccounts(prev => [...prev, ...newAccounts]);
    setExpandedFn('ig_outreach');
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
            <Bot className="w-6 h-6 text-zinc-300" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Bot 工作进程</h3>
            <p className="text-xs text-zinc-500 font-medium">管理所有自动化机器人</p>
          </div>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold rounded-xl transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> 刷新
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '机器人类型', value: functions.length, icon: Bot, color: 'text-blue-500' },
          { label: '运行中', value: workers.filter(w => w.running).length, icon: Activity, color: 'text-green-500' },
          { label: '总账号数', value: accounts.length, icon: User, color: 'text-rose-500' },
          { label: '总进程数', value: workers.length, icon: Cpu, color: 'text-violet-500' },
        ].map((stat, i) => (
          <div key={i} className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2 rounded-xl bg-zinc-800", stat.color)}><stat.icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-xs font-medium text-zinc-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bot Accounts */}
      <AccountSetupSection />

      {/* Behavior Logs */}
      <BehaviorLogSection />

      {/* Bot Intelligence: Learning Status & DM Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Learning profiles */}
        <div className="lg:col-span-2 bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6">
          <div className="flex items-center gap-3 mb-5">
            <Brain className="w-5 h-5 text-violet-500" />
            <h4 className="font-black text-sm text-white">Bot Intelligence — Behavior Learning</h4>
            <span className="text-[10px] font-bold text-zinc-500">{learnProfiles.length} bots learning</span>
          </div>
          {learnProfiles.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-600 font-medium">No learning data yet. Bots auto-analyze every 20 tasks.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {learnProfiles.map((p: any) => {
                const adjustments = p.adjustments || {};
                const adjCount = Object.keys(adjustments).length;
                const confidence = Math.round((p.confidence || 0) * 100);
                return (
                  <div key={p.botId} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", confidence > 50 ? "bg-green-500" : confidence > 20 ? "bg-amber-500" : "bg-zinc-600")} />
                      <span className="text-xs font-bold text-zinc-300 w-32 flex-shrink-0">{p.botId}</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                        confidence > 50 ? "bg-green-500/10 text-green-400" : confidence > 20 ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800 text-zinc-500"
                      )}>confidence: {confidence}%</span>
                      <span className="text-[10px] text-zinc-500">{adjCount} adjustments</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.analyzedAt && <span className="text-[9px] text-zinc-600">Last: {new Date(p.analyzedAt).toLocaleDateString()}</span>}
                      {adjCount > 0 && (
                        <div className="flex gap-1">
                          {Object.entries(adjustments).slice(0, 3).map(([k, v]) => (
                            <span key={k} className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">{k}:{String(v)}</span>
                          ))}
                          {Object.keys(adjustments).length > 3 && <span className="text-[9px] text-zinc-600">+{Object.keys(adjustments).length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DM Pipeline Summary */}
        <div className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6">
          <div className="flex items-center gap-3 mb-5">
            <Target className="w-5 h-5 text-rose-500" />
            <h4 className="font-black text-sm text-white">DM Pipeline</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <span className="text-xs text-zinc-400 flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-purple-500" /> Total Tasks
              </span>
              <span className="text-lg font-black text-white">{dmTaskCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <span className="text-xs text-zinc-400 flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-violet-500" /> Learning Bots
              </span>
              <span className="text-lg font-black text-white">{learnProfiles.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <span className="text-xs text-zinc-400 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-green-500" /> Active Workers
              </span>
              <span className="text-lg font-black text-white">{workers.filter(w => w.running).length}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800/50">
            <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-widest">Profile Scan Cycle</p>
            <p className="text-[10px] text-zinc-400 mt-1 font-medium">Bots analyze behavior every 20 tasks and auto-adjust strategies (like strategy, risk profile, active schedule).</p>
          </div>
        </div>
      </div>

      {/* Bot Task Queue — tasks from Neon automation_tasks */}
      <div className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-cyan-500" />
            <h4 className="text-sm font-bold text-white">Bot 任务队列 (Neon)</h4>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className={`px-2 py-0.5 rounded-full font-medium ${
              neonTasks.filter(t => t.status === 'pending').length > 0
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-zinc-800 text-zinc-500'
            }`}>
              {neonTasks.filter(t => t.status === 'pending').length} pending
            </span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-medium">
              {neonTasks.filter(t => t.status === 'leased').length} leased
            </span>
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
              {neonTasks.filter(t => t.status === 'done').length} done
            </span>
          </div>
        </div>

        {/* Summary by bot */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          {(() => {
            const byBot: Record<string, { pending: number; leased: number; done: number; failed: number; latest: string }> = {};
            for (const t of neonTasks) {
              const bot = String(t.payload?.botId || t.leasedBy || 'unassigned');
              if (!byBot[bot]) byBot[bot] = { pending: 0, leased: 0, done: 0, failed: 0, latest: '' };
              byBot[bot][t.status as keyof typeof byBot[string]]++;
              if (t.status === 'leased' && !byBot[bot].latest) byBot[bot].latest = t.payload?.artistHandle || t.id;
            }
            return Object.entries(byBot).map(([botId, stats]) => {
              const isRunning = workers.some(w => w.botId === botId && w.running);
              const isBusy = stats.leased > 0;
              return (
                <div key={botId} className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${isRunning ? (isBusy ? 'bg-green-500' : 'bg-amber-400') : 'bg-zinc-600'}`} />
                    <span className="text-xs font-bold text-white truncate">{botId}</span>
                  </div>
                  {isBusy ? (
                    <p className="text-[10px] text-cyan-400 truncate" title={stats.latest}>
                      ▶ {stats.latest}
                    </p>
                  ) : (
                    <p className="text-[10px] text-zinc-500">空闲</p>
                  )}
                  <div className="flex gap-2 mt-1 text-[9px] text-zinc-500">
                    <span className={stats.pending > 0 ? 'text-amber-400' : ''}>P:{stats.pending}</span>
                    <span className={stats.leased > 0 ? 'text-cyan-400' : ''}>L:{stats.leased}</span>
                    <span>D:{stats.done}</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Recent tasks table */}
        {neonTasks.filter(t => t.status !== 'done').length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-zinc-600 border-b border-zinc-800/50">
                  <th className="text-left py-2 pr-2 font-medium">Bot</th>
                  <th className="text-left py-2 pr-2 font-medium">Target</th>
                  <th className="text-left py-2 pr-2 font-medium">Status</th>
                  <th className="text-left py-2 pr-2 font-medium">Since</th>
                </tr>
              </thead>
              <tbody>
                {neonTasks.filter(t => t.status !== 'done').slice(0, 10).map(t => (
                  <tr key={t.id} className="border-b border-zinc-800/20">
                    <td className="py-1.5 pr-2 text-zinc-300">{t.payload?.botId || t.leasedBy || '-'}</td>
                    <td className="py-1.5 pr-2 text-zinc-400">
                      {t.payload?.artistHandle || t.payload?.shopName || t.id?.slice(0, 24)}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        t.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        t.status === 'leased' ? 'bg-cyan-500/20 text-cyan-400' :
                        t.status === 'failed' ? 'bg-red-500/20 text-red-400' : ''
                      }`}>{t.status}</span>
                    </td>
                    <td className="py-1.5 text-zinc-500">
                      {t.createdAt ? Math.floor((Date.now() - t.createdAt) / 60000) + 'm ago' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bot Function Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {functions.map(fn => {
          const Icon = FUNCTION_ICONS[fn.id] || Bot;
          const color = FUNCTION_COLORS[fn.id] || 'blue';
          const c = COLOR_MAP[color] || COLOR_MAP.blue;
          const isExpanded = expandedFn === fn.id;
          const bm = BROWSER_MODE_LABELS[fn.browserMode] || BROWSER_MODE_LABELS.none;
          const BmIcon = bm.icon;

          // For multi-account bots
          const fnAccounts = fn.multiAccount ? accounts : [];
          const runningCount = fn.multiAccount
            ? fnAccounts.filter(a => isRunning(a.botId)).length
            : (workers.some(w => w.functionId === fn.id && w.running) ? 1 : 0);

          return (
            <motion.div key={fn.id} layout className={cn("rounded-2xl border transition-all overflow-hidden", runningCount > 0 ? `${c.bg} ${c.border}` : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700")}>
              <div className="p-5">
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", c.bg, c.border)}>
                      <Icon className={cn("w-6 h-6", c.text)} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">{fn.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold", runningCount > 0 ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-zinc-800 text-zinc-500 border border-zinc-700")}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", runningCount > 0 ? "bg-green-500 animate-pulse" : "bg-zinc-600")} />
                          {runningCount > 0 ? `${runningCount} 运行中` : 'Stopped'}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-zinc-600 font-medium">
                          <BmIcon className="w-3 h-3" />{bm.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setExpandedFn(isExpanded ? null : fn.id)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-4">{fn.description}</p>

                {/* Business logic details (when expanded) */}
                {isExpanded && (fn.workflow || fn.businessValue || fn.outputs || fn.useCases) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-3">
                    {fn.workflow && (
                      <div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">业务流程</p>
                        <div className="flex items-start gap-2">
                          <div className="w-1 h-full min-h-[14px] rounded-full bg-zinc-700 mt-1.5 flex-shrink-0" />
                          <p className="text-[11px] text-zinc-300 leading-relaxed">{fn.workflow}</p>
                        </div>
                      </div>
                    )}
                    {fn.businessValue && fn.businessValue.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">业务价值</p>
                        <div className="flex flex-wrap gap-1.5">
                          {fn.businessValue.map((v, i) => (
                            <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-bold">{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {fn.outputs && fn.outputs.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">产出数据</p>
                        <div className="flex flex-wrap gap-1.5">
                          {fn.outputs.map((v, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-bold">{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {fn.useCases && fn.useCases.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">适用场景</p>
                        <div className="flex flex-wrap gap-1.5">
                          {fn.useCases.map((v, i) => (
                            <span key={i} className="px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full text-[9px] font-bold">{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Single-instance: Start/Stop button */}
                {!fn.multiAccount && (
                  <div className="flex gap-2">
                    {runningCount > 0 ? (
                      <button disabled={stopping.has(fn.id)} onClick={() => { const w = workers.find(w => w.functionId === fn.id && w.running); if (w) handleStop(w.botId); }} className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", "bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600/30")}>
                        {stopping.has(fn.id) ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Stopping...</> : <><Square className="w-3.5 h-3.5" /> Stop</>}
                      </button>
                    ) : (
                      <button disabled={starting.has(`${fn.id}:${fn.defaultBotId || fn.id}`)} onClick={() => handleStart(fn, fn.defaultBotId || fn.id)} className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", c.btn, "text-white")}>
                        {starting.has(`${fn.id}:${fn.defaultBotId || fn.id}`) ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...</> : <><Play className="w-3.5 h-3.5 fill-current" /> Start</>}
                      </button>
                    )}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-800/50 space-y-3 w-full">
                        {fn.configs.map(cfg => renderConfig(fn.id, cfg))}
                        <div className="pt-2"><p className="text-[10px] text-zinc-600 font-mono">npx tsx scripts/{fn.script}</p></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Multi-account: Account list + bulk actions */}
                {fn.multiAccount && (
                  <div className="space-y-3">
                    {/* Bulk actions */}
                    <div className="flex gap-2">
                      <button onClick={() => startAll(fn)} className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", c.btn, "text-white")}>
                        <PlayCircle className="w-3.5 h-3.5" /> Start All
                      </button>
                      <button onClick={stopAll} className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600/30">
                        <StopCircle className="w-3.5 h-3.5" /> Stop All
                      </button>
                    </div>

                    {/* Account list (visible when expanded) */}
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2 border-t border-zinc-800/50">
                        {/* Default config */}
                        <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Settings className="w-3 h-3" /> 默认配置（所有账号继承）
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {fn.configs.map(cfg => (
                              <div key={cfg.key}>
                                <label className="text-[9px] text-zinc-600 font-medium">{cfg.label}</label>
                                {cfg.type === 'select' ? (
                                  <div className="flex gap-1 mt-0.5">
                                    {(cfg.options || []).map(opt => (
                                      <button key={opt} onClick={() => updateConfig(fn.id, cfg.key, opt)} className={cn("flex-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all", (configs[fn.id]?.[cfg.key] || cfg.default) === opt ? "bg-zinc-700 text-white border border-zinc-600" : "bg-zinc-800/50 text-zinc-500 border border-transparent")}>
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <input type={cfg.type} min={cfg.min} max={cfg.max} step={cfg.step} value={configs[fn.id]?.[cfg.key] ?? cfg.default} onChange={(e) => updateConfig(fn.id, cfg.key, e.target.value)} className="mt-0.5 w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-[10px] text-white font-medium focus:outline-none focus:border-zinc-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Account header + add */}
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">账号列表（{fnAccounts.length}）</p>
                          <div className="flex gap-1.5">
                            <button onClick={addAccount} className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] font-bold rounded-lg transition-colors">
                              <Plus className="w-3 h-3" /> 添加账号
                            </button>
                            <button onClick={() => addBatchAccounts(10)} className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] font-bold rounded-lg transition-colors">
                              +10
                            </button>
                            <button onClick={() => addBatchAccounts(50)} className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] font-bold rounded-lg transition-colors">
                              +50
                            </button>
                          </div>
                        </div>

                        {fnAccounts.length === 0 ? (
                          <div className="p-8 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl text-center">
                            <User className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                            <p className="text-xs text-zinc-600 font-medium">暂无账号</p>
                            <p className="text-[10px] text-zinc-700 mt-1">点击"添加账号"开始创建 IG Outreach bot 实例</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-96 overflow-y-auto">
                            {fnAccounts.map(acc => {
                              const running = isRunning(acc.botId);
                              const worker = getWorker(acc.botId);
                              const isStarting = starting.has(`${fn.id}:${acc.botId}`);
                              const isStopping = stopping.has(acc.botId);
                              return (
                                <div key={acc.botId} className={cn("flex items-center gap-2 p-2.5 rounded-xl border transition-all", running ? "bg-green-500/5 border-green-500/20" : "bg-zinc-900/50 border-zinc-800")}>
                                  {/* Status dot */}
                                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", running ? "bg-green-500 animate-pulse" : "bg-zinc-600")} />

                                  {/* Bot ID */}
                                  <span className="text-xs font-bold text-zinc-300 w-28 flex-shrink-0">{acc.botId}</span>

                                  {/* Proxy */}
                                  <div className="flex-1 flex items-center gap-1 min-w-0">
                                    <Wifi className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                                    <input type="text" value={acc.proxy} onChange={(e) => updateAccount(acc.botId, 'proxy', e.target.value)} placeholder="socks5://127.0.0.1:10808" className="w-full bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-zinc-500 text-[10px] text-zinc-400 font-medium px-1 py-0.5 outline-none transition-colors placeholder:text-zinc-700" />
                                  </div>

                                  {/* Exec Mode */}
                                  <select value={acc.execMode} onChange={(e) => updateAccount(acc.botId, 'execMode', e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg text-[9px] text-zinc-400 font-bold px-1.5 py-1 outline-none">
                                    <option value="browse_like">Like</option>
                                    <option value="browse_only">Browse</option>
                                  </select>

                                  {/* Uptime */}
                                  {running && worker && (
                                    <span className="text-[9px] text-zinc-500 font-medium w-14 text-right">
                                      {uptime(worker.startedAt)}
                                    </span>
                                  )}

                                  {/* Start / Stop */}
                                  <button
                                    disabled={isStarting || isStopping}
                                    onClick={() => running ? handleStop(acc.botId) : handleStart(fn, acc.botId, { BOT_EXEC_MODE: acc.execMode, BOT_SPEED_FACTOR: String(acc.speedFactor), ...(acc.proxy ? { BOT_PROXY_SERVER: acc.proxy } : {}), ...configs[fn.id] })}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 flex-shrink-0",
                                      running ? "bg-red-600/20 text-red-500 hover:bg-red-600/30" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                    )}
                                  >
                                    {isStarting ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : isStopping ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : running ? <Square className="w-3 h-3" />
                                      : <Play className="w-3 h-3 fill-current" />}
                                    {isStarting ? '' : isStopping ? '' : running ? 'Stop' : 'Start'}
                                  </button>

                                  {/* Remove */}
                                  <button onClick={() => removeAccount(acc.botId)} disabled={running} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  // ── Config field renderer ──
  function renderConfig(fnId: string, cfg: BotConfig) {
    return (
      <div key={cfg.key}>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{cfg.label} ({cfg.key})</label>
        {cfg.type === 'select' ? (
          <div className="flex gap-1.5 mt-1">
            {(cfg.options || []).map(opt => (
              <button key={opt} onClick={() => updateConfig(fnId, cfg.key, opt)} className={cn("flex-1 px-2 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all", (configs[fnId]?.[cfg.key] || cfg.default) === opt ? "bg-zinc-700 text-white border border-zinc-600" : "bg-zinc-800/50 text-zinc-500 border border-transparent hover:border-zinc-700")}>
                {opt}
              </button>
            ))}
          </div>
        ) : cfg.type === 'number' ? (
          <input type="number" min={cfg.min} max={cfg.max} step={cfg.step} value={configs[fnId]?.[cfg.key] ?? cfg.default} onChange={(e) => updateConfig(fnId, cfg.key, e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-zinc-500" />
        ) : (
          <input type="text" value={configs[fnId]?.[cfg.key] ?? cfg.default} onChange={(e) => updateConfig(fnId, cfg.key, e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-zinc-500" />
        )}
      </div>
    );
  }

  function updateConfig(fnId: string, key: string, value: string) {
    setConfigs(prev => ({ ...prev, [fnId]: { ...prev[fnId], [key]: value } }));
  }
}
