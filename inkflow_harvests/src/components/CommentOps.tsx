import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-auth';

type BotWorker = { botId?: string; id?: string; name?: string; status?: string; running?: boolean; lastHeartbeat?: number; memory?: number; cpu?: number; restarts?: number; updatedAt?: number };
type TaskCounts = { pending?: number; total?: number; doneToday?: number; failed?: number };
type CorpusStats = { total: number; approved: number; pending: number; rejected: number };
type DraftCounts = { pending: number; approved: number; rejected: number; posted: number };
type ChainHealth = {
  ok: boolean;
  botId: string;
  breaks: string[];
  worker?: { running?: boolean; status?: string; heartbeatAgeSec?: number | null; lastHeartbeat?: number };
  prefs?: { likesPerSession: number; commentsPerSession: number; followsPerSession: number; botId: string; igHandle?: string; updatedAt?: number } | null;
  recentTasks?: Array<{ id: string; status: string; handle: string; likesPerSession: number; commentsPerSession: number; followsPerSession: number; createdAt: number }>;
  recentTasksWithComments?: number;
  draftCounts?: Record<string, number>;
  events?: Record<string, { count: number; lastTs?: string | null }>;
};

export default function CommentOps() {
  const [bots, setBots] = useState<BotWorker[]>([]);
  const [tasks, setTasks] = useState<TaskCounts>({});
  const [corpus, setCorpus] = useState<CorpusStats>({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [drafts, setDrafts] = useState<DraftCounts>({ pending: 0, approved: 0, rejected: 0, posted: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState('bot_ig_01');
  const [health, setHealth] = useState<ChainHealth | null>(null);
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
        setBots(arr);
      }
      const hr = await apiFetch(`/api/automation/comment-chain-health?botId=${encodeURIComponent(selectedBotId)}`);
      if (hr.ok) {
        const hd = await hr.json();
        setHealth(hd);
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
  }, [selectedBotId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const bot = bots.find((b) => String(b.botId || b.id || b.name) === selectedBotId) || null;
  const sched = bots.find((b) => /ig-scheduler/i.test(String(b.name || b.id || b.botId))) || null;
  const workerRunning = Boolean(bot?.running || bot?.status === 'online' || health?.worker?.running);

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
  const breakText: Record<string, string> = {
    worker_not_running_or_stale: 'worker 没在线或心跳过期',
    prefs_not_saved_for_bot: '这个 bot 没有云端动作偏好',
    prefs_comments_zero: '云端动作偏好 commentsPerSession = 0',
    recent_tasks_comments_zero: '最近任务 payload 里的 comments 都是 0',
    draft_queue_errors_last_24h: '最近 24 小时草稿入队有报错',
    no_drafts_queued_last_24h: '最近 24 小时没有生成过待审草稿',
    no_pending_or_approved_drafts: '草稿表里没有待审或待发布评论',
  };
  const eventCount = (event: string) => Number(health?.events?.[event]?.count || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">评论生产中心</h2>
          <p className="text-sm text-zinc-400 mt-1">一屏看全：bot 状态 / 任务 / 采集语料 / 生成评论 / 最近动态</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedBotId}
            onChange={(e) => setSelectedBotId(e.target.value || 'bot_ig_01')}
            className="px-3 py-2 rounded-lg bg-zinc-900 text-sm text-zinc-200 border border-zinc-700 outline-none"
          >
            {Array.from(new Set(['bot_ig_01', ...bots.map((b) => String(b.botId || b.id || b.name || '')).filter(Boolean)])).map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
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
            <span className={`flex items-center gap-1.5 text-xs ${workerRunning ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${workerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {workerRunning ? 'online' : '离线/过期'}
            </span>
          </div>
          {(bot || health?.worker) && (
            <div className="text-[11px] text-zinc-500 mt-2">
              {health?.worker?.heartbeatAgeSec != null ? `心跳 ${health.worker.heartbeatAgeSec}s 前` : ''}
              {bot?.memory ? ` · 内存 ${(Number(bot.memory) / 1024 / 1024).toFixed(0)}MB` : ''}
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

      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium text-zinc-300">评论闭环检查</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">配置 → 新任务 → worker → 待审草稿 → 人工通过 → 发布回写</div>
          </div>
          <span className={`px-2 py-1 rounded-full text-[10px] border ${
            health && health.breaks?.length === 0
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }`}>
            {health && health.breaks?.length === 0 ? '闭环正常' : `断点 ${health?.breaks?.length || 0}`}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatusCard
            label="云端评论配置"
            value={String(health?.prefs?.commentsPerSession ?? '-')}
            sub={health?.prefs ? `赞 ${health.prefs.likesPerSession} · 关 ${health.prefs.followsPerSession}` : '未保存'}
            tone={(health?.prefs?.commentsPerSession || 0) > 0 ? 'green' : 'amber'}
          />
          <StatusCard
            label="最近任务带评论"
            value={String(health?.recentTasksWithComments ?? '-')}
            sub={`最近 ${health?.recentTasks?.length || 0} 个任务`}
            tone={(health?.recentTasksWithComments || 0) > 0 ? 'green' : 'amber'}
          />
          <StatusCard
            label="24h 生成草稿"
            value={String(eventCount('comment_review_queued'))}
            sub={`入队失败 ${eventCount('comment_review_queue_failed')}`}
            tone={eventCount('comment_review_queued') > 0 ? 'green' : 'amber'}
          />
          <StatusCard
            label="可发布草稿"
            value={String((health?.draftCounts?.pending || 0) + (health?.draftCounts?.approved || 0))}
            sub={`待审 ${health?.draftCounts?.pending || 0} · 待发布 ${health?.draftCounts?.approved || 0}`}
            tone={(health?.draftCounts?.pending || 0) + (health?.draftCounts?.approved || 0) > 0 ? 'green' : 'amber'}
          />
        </div>

        {health?.breaks?.length ? (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="text-[11px] font-bold text-amber-300 mb-1">当前断点</div>
            <div className="flex flex-wrap gap-1.5">
              {health.breaks.map((b) => (
                <span key={b} className="px-2 py-1 rounded bg-zinc-950/60 text-[11px] text-amber-200 border border-amber-500/20">
                  {breakText[b] || b}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {health?.recentTasks?.length ? (
          <div className="mt-3 text-[11px] text-zinc-500">
            最近任务：
            {health.recentTasks.slice(0, 4).map((t) => (
              <span key={t.id} className="ml-2 text-zinc-400">
                @{t.handle || '-'} c={t.commentsPerSession}
              </span>
            ))}
          </div>
        ) : null}
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
