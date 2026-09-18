import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Loader2, MinusCircle, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api-auth';

/**
 * 系统健康面板 —— 坏掉的板块变红。
 *
 * 为什么需要它：2026-09-18 那次卡死持续了 13 小时没人发现，因为所有信号都
 * "看起来正常" —— pm2 是 online、心跳每分钟都在刷新。心跳是假绿灯：它和任务
 * 主循环在 Promise.all 里并发跑，主循环挂住时心跳照跳。所以这里每个板块都用
 * 「产出类判据」（最后事件时间、活跃租约、待派任务数），而不是进程状态灯。
 *
 * 阈值与判定全部在后端 /api/system/health 里算，前端只负责把 down 画红。
 */

type HealthStatus = 'ok' | 'warn' | 'down' | 'idle' | 'unknown';

type HealthBlock = {
  id: string;
  label: string;
  status: HealthStatus;
  value: string;
  detail: string;
  evidence?: string;
  metrics?: Record<string, string | number | null>;
};

type HealthData = {
  ok: boolean;
  botId: string;
  checkedAt: number;
  status: HealthStatus;
  downBlocks: string[];
  warnBlocks: string[];
  blocks: HealthBlock[];
  errors: string[];
  bot?: {
    host?: string;
    version?: string;
    status?: string;
    heartbeatAgeSec?: number | null;
    dailyProgress?: any;
  } | null;
  cache?: { hit: boolean; ageMs: number; ttlMs: number };
};

const TONE: Record<HealthStatus, {
  card: string; border: string; text: string; dot: string; chip: string; label: string;
}> = {
  ok: {
    card: 'bg-emerald-500/[0.07]', border: 'border-emerald-500/30', text: 'text-emerald-400',
    dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: '正常',
  },
  warn: {
    card: 'bg-amber-500/[0.07]', border: 'border-amber-500/40', text: 'text-amber-400',
    dot: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: '注意',
  },
  down: {
    card: 'bg-red-500/[0.10]', border: 'border-red-500/50', text: 'text-red-400',
    dot: 'bg-red-500', chip: 'bg-red-500/20 text-red-300 border-red-500/40', label: '故障',
  },
  idle: {
    card: 'bg-zinc-900/60', border: 'border-zinc-700/60', text: 'text-zinc-400',
    dot: 'bg-zinc-600', chip: 'bg-zinc-800 text-zinc-400 border-zinc-700', label: '空闲',
  },
  unknown: {
    card: 'bg-sky-500/[0.06]', border: 'border-sky-500/25', text: 'text-sky-300',
    dot: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-300 border-sky-500/25', label: '未知',
  },
};

const StatusIcon = ({ status, className }: { status: HealthStatus; className?: string }) => {
  if (status === 'ok') return <CheckCircle2 className={className} />;
  if (status === 'warn') return <AlertTriangle className={className} />;
  if (status === 'down') return <XCircle className={className} />;
  if (status === 'idle') return <MinusCircle className={className} />;
  return <Activity className={className} />;
};

const timeAgo = (ms?: number | null) => {
  if (!ms) return '—';
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} 秒前`;
  if (s < 3600) return `${Math.round(s / 60)} 分钟前`;
  return `${(s / 3600).toFixed(1)} 小时前`;
};

export default function SystemHealth({ botId = 'bot_ig_01', className }: { botId?: string; className?: string }) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (fresh = false) => {
    if (fresh) setRefreshing(true);
    try {
      const r = await apiFetch(
        `/api/system/health?botId=${encodeURIComponent(botId)}${fresh ? '&fresh=1' : ''}`
      );
      if (!r.ok) {
        setErr(`健康接口返回 ${r.status}${r.status === 403 ? '（无权限）' : ''}`);
        return;
      }
      const d = (await r.json()) as HealthData;
      if (d?.ok === false) {
        setErr(String((d as any)?.error || '未知错误'));
        return;
      }
      setData(d);
      setErr(null);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [botId]);

  useEffect(() => {
    load();
    // 后端有 90 秒缓存，前端 120 秒轮询既能看到状态又不会把 D1 读量打上去。
    const t = setInterval(() => load(), 120000);
    return () => clearInterval(t);
  }, [load]);

  const overall: HealthStatus = err ? 'down' : (data?.status || 'unknown');
  const tone = TONE[overall];
  const blocks = data?.blocks || [];
  const down = data?.downBlocks || [];
  const warn = data?.warnBlocks || [];
  const broken = blocks.filter((b) => b.status === 'down' || b.status === 'warn');

  return (
    <div className={cn('bg-[#111] border border-zinc-800/50 p-6 rounded-[2rem]', className)}>
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center border',
            broken.length ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
          )}>
            <Activity className={cn('w-5 h-5', broken.length ? 'text-red-400' : 'text-emerald-400')} />
          </div>
          <div>
            <h3 className="font-black text-white flex items-center gap-2">
              系统健康
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black border', tone.chip)}>
                {err ? '接口不通' : `${tone.label}${down.length ? ` · ${down.length} 块故障` : ''}`}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {data
                ? `检查于 ${new Date(data.checkedAt).toLocaleTimeString('zh-CN')} · ${data.bot?.host || 'unknown host'}${data.cache?.hit ? '（服务端缓存）' : ''}`
                : '正在读取后端健康状态…'}
            </p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-[11px] font-black text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3 py-2 transition-colors disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          立即检查
        </button>
      </div>

      {/* hard failure to even talk to the API */}
      {err && (
        <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/40">
          <div className="flex items-center gap-2 text-[12px] font-black text-red-300">
            <XCircle className="w-4 h-4" />
            无法读取健康状态：{err}
          </div>
          <div className="text-[11px] text-red-200/70 mt-1">
            （这一格本身就是最严重的信号：前端连不上后端，其余判据一律不可信）
          </div>
        </div>
      )}

      {/* red banner naming exactly which blocks are broken */}
      {!err && (down.length > 0 || warn.length > 0) && (
        <div className={cn(
          'mb-4 p-3 rounded-2xl border',
          down.length ? 'bg-red-500/10 border-red-500/40' : 'bg-amber-500/10 border-amber-500/30'
        )}>
          <div className={cn('flex items-center gap-2 text-[12px] font-black', down.length ? 'text-red-300' : 'text-amber-300')}>
            {down.length ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {down.length ? `${down.length} 个板块故障` : `${warn.length} 个板块需注意`}
            {warn.length > 0 && down.length > 0 && <span className="text-zinc-400 font-bold">· {warn.length} 个需注意</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {down.map((b) => (
              <span key={b} className="px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-[10px] font-black text-red-200">
                {b}
              </span>
            ))}
            {warn.map((b) => (
              <span key={b} className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] font-black text-amber-200">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* blocks */}
      {loading && !data ? (
        <div className="py-8 flex items-center justify-center gap-2 text-[12px] text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          读取中…
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {blocks.map((b) => {
            const t = TONE[b.status];
            const metrics = Object.entries(b.metrics || {}).filter(([, v]) => v !== null && v !== undefined);
            return (
              <div key={b.id} className={cn('rounded-2xl border p-3.5', t.card, t.border)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-zinc-300 truncate">{b.label}</span>
                  <span className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    t.dot,
                    b.status === 'down' && 'animate-pulse ring-2 ring-red-500/30'
                  )} />
                </div>
                <div className={cn('text-[15px] font-black mt-2 leading-tight', t.text)}>{b.value}</div>
                <div className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{b.detail}</div>
                {b.evidence && <div className="text-[9px] text-zinc-600 mt-1 leading-relaxed">{b.evidence}</div>}
                {metrics.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {metrics.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-zinc-600 truncate">{k}</span>
                        <span className="text-[9px] font-bold text-zinc-400">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* backend-side query failures must be visible, never swallowed */}
      {(data?.errors?.length || 0) > 0 && (
        <div className="mt-3 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <div className="text-[10px] font-black text-amber-300 mb-1">后端查询异常（{data!.errors.length}）</div>
          <div className="space-y-0.5">
            {data!.errors.map((e, i) => (
              <div key={i} className="text-[10px] text-amber-200/70 font-mono break-all">{e}</div>
            ))}
          </div>
        </div>
      )}

      {/* footer hint */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-600">
        <span>判定全部来自「产出」：最后行为事件 · 活跃租约 · 待派任务</span>
        <span className="hidden sm:inline">·</span>
        <span>心跳新鲜但零产出会显示为故障（假绿灯）</span>
        <span className="hidden sm:inline">·</span>
        <span>数据 {data ? timeAgo(Date.now() - data.checkedAt) : '—'}缓存</span>
      </div>
    </div>
  );
}
