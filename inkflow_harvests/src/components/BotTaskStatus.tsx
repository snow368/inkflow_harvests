import React, { useState, useEffect } from 'react';
import { Bot, Loader2, RefreshCw, ListTodo } from 'lucide-react';
import { apiFetch } from '../lib/api-auth';

type NeoTask = {
  id: string;
  payload: any;
  status: string;
  leasedBy: string | null;
  createdAt: number;
};

type BotSummary = {
  botId: string;
  pending: number;
  leased: number;
  done: number;
  failed: number;
  busy: boolean;
  currentTarget: string;
};

export default function BotTaskStatus() {
  const [tasks, setTasks] = useState<NeoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [useWorker, setUseWorker] = useState(true); // try Worker first

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Try Cloudflare Worker first (works on harvests.pages.dev)
      if (useWorker) {
        const res = await apiFetch('/api/automation/tasks?limit=50');
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
          return;
        }
      }
      // Fallback to local VPS server (works on localhost:3000)
      const res = await fetch('/api/automation/neon-tasks?limit=50');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setUseWorker(false);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  // Auto-refresh every 10s
  useEffect(() => {
    const iv = setInterval(fetchTasks, 10000);
    return () => clearInterval(iv);
  }, []);

  // Group by bot
  const byBot = new Map<string, BotSummary>();
  for (const t of tasks) {
    const bot = String(t.payload?.botId || t.leasedBy || 'unassigned');
    if (!byBot.has(bot)) byBot.set(bot, { botId: bot, pending: 0, leased: 0, done: 0, failed: 0, busy: false, currentTarget: '' });
    const s = byBot.get(bot)!;
    if (t.status === 'pending') s.pending++;
    else if (t.status === 'leased') { s.leased++; s.busy = true; s.currentTarget = t.payload?.artistHandle || ''; }
    else if (t.status === 'done') s.done++;
    else if (t.status === 'failed') s.failed++;
  }
  const bots = Array.from(byBot.values());

  const totalPending = tasks.filter(t => t.status === 'pending').length;
  const totalLeased = tasks.filter(t => t.status === 'leased').length;
  const totalDone = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-cyan-500" />
          <h4 className="text-sm font-bold text-white">Bot 任务队列</h4>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 text-[10px] font-medium">
            <span className={`px-2 py-0.5 rounded-full ${totalPending > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
              {totalPending} pending
            </span>
            <span className={`px-2 py-0.5 rounded-full ${totalLeased > 0 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>
              {totalLeased} leased
            </span>
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">{totalDone} done</span>
          </div>
          <button onClick={fetchTasks} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
            {loading ? <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />}
          </button>
        </div>
      </div>

      {bots.length === 0 ? (
        <div className="text-center py-8 text-zinc-600">
          <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-medium">暂无任务数据</p>
          <p className="text-[10px] mt-1">等待调度器创建任务...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {bots.map(bot => (
            <div key={bot.botId} className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${bot.busy ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-zinc-600'}`} />
                <span className="text-xs font-bold text-white truncate" title={bot.botId}>{bot.botId}</span>
              </div>
              {bot.busy ? (
                <p className="text-[10px] text-cyan-400 truncate" title={bot.currentTarget}>▶ {bot.currentTarget}</p>
              ) : (
                <p className="text-[10px] text-zinc-500">空闲</p>
              )}
              <div className="flex gap-2 mt-1.5 text-[9px] text-zinc-500">
                <span className={bot.pending > 0 ? 'text-amber-400' : ''}>待:{bot.pending}</span>
                <span className={bot.leased > 0 ? 'text-cyan-400' : ''}>跑:{bot.leased}</span>
                <span>完:{bot.done}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
