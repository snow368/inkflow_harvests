import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-auth';

type BotWorker = { id: string; name: string; status: string; memory?: number; cpu?: number; restarts?: number; updatedAt?: number };
type TaskCounts = { pending?: number; total?: number; doneToday?: number; failed?: number };
type CorpusStats = { total: number; approved: number; pending: number; rejected: number };
type DraftCounts = { pending: number; approved: number; rejected: number; posted: number };

export default function CommentOps() {
  const [bots, setBots] = useState<BotWorker[]>([]);
  const [tasks, setTasks] = useState<TaskCounts>({});
  const [corpus, setCorpus] = useState<CorpusStats>({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [drafts, setDrafts] = useState<DraftCounts>({ pending: 0, approved: 0, rejected: 0, posted: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // bot 进程状态
      const br = await apiFetch('/api/bot/workers');
      if (br.ok) {
        const bd = await br.json();
        const arr = Array.isArray(bd?.workers) ? bd.workers : Array.isArray(bd?.items) ? bd.items : [];
        setBots(arr.filter((b: any) => /bot-worker|ig-scheduler/i.test(String(b?.name || b?.id || ''))));
      }
      // 任务计数
      const tr = await apiFetch('/api/automation/task-counts');
      if (tr.ok) {
        const td = await tr.json();
        const c = td?.counts || {};
        setTasks({
          pending: c.pending ?? td?.pending,
          total: c.done ?? td?.total ?? td?.todayCount,
          doneToday: c.done ?? td?.doneToday,
          failed: c.failed ?? td?.failed ?? td?.counts?.failed,
        });
      }
      // 语料统计
      const cr = await apiFetch('/api/corpus/stats');
      if (cr.ok) {
        const cd = await cr.json();
        setCorpus({ total: cd?.total || 0, approved: cd?.approved || 0, pending: (cd?.total || 0) - (cd?.approved || 0), rejected: 0 });
      }
      // 草稿统计 + 最近草稿
      const dr = await apiFetch('/api/drafts?limit=6');
      if (dr.ok) {
        const dd = await dr.json();
        const cm: Record<string, number> = {};
        for (const c of dd?.counts || []) cm[c.status] = c.n;
        setDrafts({ pending: cm.pending || 0, approved: cm.approved || 0, rejected: cm.rejected || 0, posted: cm.posted || 0 });
        setRecent((dd?.items || []).slice(0, 6));
      }
    } catch (e: any) {
      setMsg('加载失败：' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const bot = bots.find((b) => /bot-worker/i.test(String(b.name || b.id))) || null;
  const sched = bots.find((b) => /ig-scheduler/i.test(String(b.name || b.id))) || null;

  const StatusCard = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'green' | 'amber' | 'red' | 'blue' }) => {
    const tones = {
      green: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
      amber: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
      red: 'text-red-400 border-red-500/30 bg-red-500/5',
      blue: 'text-sky-400 border-sky-500/30 bg-sky-500/5',
    };
    return (
      <div className={`p-4 rounded-xl border ${tones[tone || 'blue']}`}>
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-2xl font-black mt-1">{value}</div>
        {sub && <div className="text-[11px] text-zinc-500 mt-1">{sub}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">评论生产中心</h2>
          <p className="text-sm text-zinc-400 mt-1">一屏看全：bot 状态 / 任务 / 采集语料 / 生成评论 / 最近动态</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-200 border border-zinc-700">
            刷新
          </button>
        </div>
      </div>

      {msg && <div className="p-3 rounded-lg text-sm bg-red-500/10 text-red-400">{msg}</div>}
      {loading && <div className="text-zinc-500 text-sm p-4">加载中…</div>}

      {/* 第一排：进程状态 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">bot-worker</span>
            <span className={`flex items-center gap-1.5 text-xs ${bot?.status === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${bot?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {bot?.status || '未知'}
            </span>
          </div>
          {bot && (
            <div className="text-[11px] text-zinc-500 mt-2">
              {bot.memory ? `内存 ${(Number(bot.memory) / 1024 / 1024).toFixed(0)}MB` : ''}
              {bot.restarts ? ` · 重启 ${bot.restarts} 次` : ''}
            </div>
          )}
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">ig-scheduler</span>
            <span className={`flex items-center gap-1.5 text-xs ${sched?.status === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${sched?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {sched?.status || '未知'}
            </span>
          </div>
        </div>
      </div>

      {/* 第二排：产量指标 */}
      <div className="grid grid-cols-4 gap-3">
        <StatusCard label="今日任务" value={String(tasks.doneToday ?? '-')} sub={tasks.total ? `共 ${tasks.total}` : undefined} tone="blue" />
        <StatusCard label="采集语料(总)" value={String(corpus.total)} sub={`已通过 ${corpus.approved}`} tone="green" />
        <StatusCard label="生成评论(待审)" value={String(drafts.pending)} sub={`已通过 ${drafts.approved} · 已发布 ${drafts.posted}`} tone="amber" />
        <StatusCard label="失败任务" value={String(tasks.failed ?? 0)} tone={Number(tasks.failed) > 0 ? 'red' : 'blue'} />
      </div>

      {/* 第三排：最近动态 */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-3">最近生成的评论</div>
        {recent.length === 0 ? (
          <div className="text-zinc-500 text-sm py-4 text-center">
            暂无草稿。bot 生成评论并上报 D1 后会显示在这里（需部署后端 + bot 补丁）。
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((d: any) => (
              <div key={d.id} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-zinc-800/40">
                <div className="min-w-0">
                  <p className="text-sm text-emerald-300 truncate">{d.proposed_comment}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {d.handle ? `@${d.handle}` : 'batch'} · {d.created_at ? new Date(d.created_at).toLocaleString() : ''}
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] border ${
                  d.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                  d.status === 'rejected' ? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' :
                  d.status === 'posted' ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' :
                  'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-3">
        <a href="#/corpus" className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-rose-500/40 transition-colors">
          <div className="text-sm font-medium text-zinc-200">审核采集语料 →</div>
          <div className="text-[11px] text-zinc-500 mt-1">把 bot 采集的评论 approve 后作为生成素材</div>
        </a>
        <a href="#/comment-drafts" className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-rose-500/40 transition-colors">
          <div className="text-sm font-medium text-zinc-200">审核生成评论 →</div>
          <div className="text-[11px] text-zinc-500 mt-1">通过/拒绝 bot 生成的评论草稿</div>
        </a>
      </div>
    </div>
  );
}
