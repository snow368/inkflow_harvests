import React, { useState, useEffect } from 'react';
import { Bot, Loader2, RefreshCw, ListTodo, BarChart3, Calendar } from 'lucide-react';
import { apiFetch } from '../lib/api-auth';

type BotAccount = {
  accountId: string;
  igHandle: string;
  stage: string;
  dailyLimit: number;
  speed: number;
};

type BotStat = {
  bot: string;
  pending: number;
  leased: number;
  done: number;
  failed: number;
  total: number;
};

type DayStat = {
  day: string;
  pending: number;
  leased: number;
  done: number;
  failed: number;
  total: number;
};

type Dashboard = {
  total: number;
  counts: Record<string, number>;
  days: DayStat[];
  accounts: BotAccount[];
};

const STAGE_LABELS: Record<string, string> = {
  new: '萌芽',
  transition: '过渡',
  growing: '成长',
  stable: '稳定',
  mature: '成熟',
};

const STAGE_COLORS: Record<string, string> = {
  new: 'text-zinc-400',
  transition: 'text-amber-400',
  growing: 'text-green-400',
  stable: 'text-blue-400',
  mature: 'text-purple-400',
};

export default function BotTaskStatus() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    // Try Cloudflare Worker (D1-based, no Neon needed)
    const tryPath = async (path: string) => {
      try {
        const r = await apiFetch(path);
        if (r.ok) { const d = await r.json(); if (d.ok) return d; }
      } catch {}
      try {
        const r = await fetch(path);
        if (r.ok) { const d = await r.json(); if (d.ok) return d; }
      } catch {}
      return null;
    };

    const data = await tryPath('/api/automation/dashboard');
    if (data) { setDashboard(data); setLoading(false); return; }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { const iv = setInterval(fetchData, 12 * 60 * 60 * 1000); return () => clearInterval(iv); }, []);

  if (loading && !dashboard) {
    return (
      <div className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6 text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-zinc-500" />
        <p className="text-xs text-zinc-500 mt-2">加载任务数据...</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6 text-center">
        <Bot className="w-8 h-8 mx-auto text-zinc-600" />
        <p className="text-xs text-zinc-500 mt-2">暂无任务数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 账号概览 */}
      {dashboard.accounts.length > 0 && (
        <div className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-rose-500" />
            <h4 className="text-sm font-bold text-white">Bot 账号</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboard.accounts.map(a => (
              <div key={a.accountId} className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${a.stage === 'new' ? 'bg-zinc-500' : a.stage === 'transition' ? 'bg-amber-500' : a.stage === 'growing' ? 'bg-green-500' : a.stage === 'stable' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                  <span className="text-xs font-bold text-white">@{a.igHandle}</span>
                  <span className={`text-[9px] font-medium ${STAGE_COLORS[a.stage] || 'text-zinc-500'}`}>{STAGE_LABELS[a.stage] || a.stage}</span>
                </div>
                <div className="text-[10px] text-zinc-500">
                  日 {a.dailyLimit} 任务 · 速度 {a.speed}x
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 累计统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '累计任务', value: dashboard.total, color: 'text-blue-500', icon: BarChart3 },
          { label: '待处理', value: dashboard.counts?.pending || 0, color: 'text-amber-500', icon: ListTodo },
          { label: '执行中', value: dashboard.counts?.leased || 0, color: 'text-cyan-500', icon: Loader2 },
          { label: '已完成', value: dashboard.counts?.done || 0, color: 'text-green-500', icon: RefreshCw },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-[#111] border border-zinc-800/50 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className="text-[10px] text-zinc-500">{stat.label}</span>
            </div>
            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 任务分布条 */}
      {dashboard.counts && (
        <div className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-500" />
            <h4 className="text-sm font-bold text-white">任务分布</h4>
          </div>
          <div className="flex h-3 rounded-full bg-zinc-800 overflow-hidden">
            {dashboard.counts.done > 0 && <div className="bg-green-600 h-full" style={{ width: `${(dashboard.counts.done/dashboard.total)*100}%` }} />}
            {dashboard.counts.leased > 0 && <div className="bg-cyan-600 h-full" style={{ width: `${(dashboard.counts.leased/dashboard.total)*100}%` }} />}
            {dashboard.counts.pending > 0 && <div className="bg-amber-600 h-full" style={{ width: `${(dashboard.counts.pending/dashboard.total)*100}%` }} />}
            {dashboard.counts.failed > 0 && <div className="bg-red-600 h-full" style={{ width: `${(dashboard.counts.failed/dashboard.total)*100}%` }} />}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-zinc-500">
            <span className="text-green-500">✓ {dashboard.counts.done}</span>
            <span className="text-cyan-500">▶ {dashboard.counts.leased}</span>
            <span className="text-amber-500">○ {dashboard.counts.pending}</span>
            {dashboard.counts.failed > 0 && <span className="text-red-500">✗ {dashboard.counts.failed}</span>}
          </div>
        </div>
      )}

      {/* 每日趋势 */}
      {dashboard.days.length > 0 && (
        <div className="bg-[#111] border border-zinc-800/50 rounded-[2rem] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-violet-500" />
            <h4 className="text-sm font-bold text-white">每日任务</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-zinc-600 border-b border-zinc-800/50">
                  <th className="text-left py-2 pr-3 font-medium">日期</th>
                  <th className="text-right py-2 pr-3 font-medium">总计</th>
                  <th className="text-right py-2 pr-3 font-medium">完成</th>
                  <th className="text-right py-2 pr-3 font-medium">进行中</th>
                  <th className="text-right py-2 font-medium">等待</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.days.map(d => (
                  <tr key={d.day} className="border-b border-zinc-800/20">
                    <td className="py-1.5 pr-3 text-zinc-300">{d.day}</td>
                    <td className="py-1.5 pr-3 text-right text-zinc-400">{d.total}</td>
                    <td className="py-1.5 pr-3 text-right text-green-500">{d.done || 0}</td>
                    <td className="py-1.5 pr-3 text-right text-cyan-500">{d.leased || 0}</td>
                    <td className="py-1.5 text-right text-amber-500">{d.pending || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
