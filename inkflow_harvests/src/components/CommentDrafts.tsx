import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api-auth';

type DraftItem = {
  id: number;
  draft_id: string;
  bot_id?: string;
  handle: string;
  post_url: string;
  post_key: string;
  proposed_comment: string;
  status: string;
  grounding_risks: string;
  safe_facts: string;
  lang: string;
  created_at: string;
};

type CountItem = { status: string; n: number };

export default function CommentDrafts() {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [counts, setCounts] = useState<CountItem[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'publishing' | 'rejected' | 'posted' | 'all'>('pending');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draftText, setDraftText] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter !== 'all' ? `?status=${filter}` : '';
      const res = await apiFetch('/api/drafts' + q);
      const data = await res.json();
      if (res.ok) {
        const nextItems = data.items || [];
        setItems(nextItems);
        setDraftText(Object.fromEntries(nextItems.map((it: DraftItem) => [it.id, it.proposed_comment || ''])));
        setCounts(data.counts || []);
      } else {
        setMsg({ type: 'err', text: data?.error || '加载失败' });
      }
    } catch (e: any) {
      setMsg({ type: 'err', text: '加载出错：' + (e?.message || e) });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadList(); }, [loadList]);

  const saveEdit = async (id: number) => {
    const proposedComment = String(draftText[id] || '').trim();
    if (proposedComment.length < 3) {
      setMsg({ type: 'err', text: '评论太短，不能保存' });
      return false;
    }
    setBusyId(id);
    setMsg(null);
    try {
      const res = await apiFetch(`/api/drafts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedComment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: 'err', text: data?.error || '保存失败' });
        return false;
      }
      setItems((prev) => prev.map((it) => it.id === id ? { ...it, proposed_comment: proposedComment } : it));
      setMsg({ type: 'ok', text: `已保存 id=${id}` });
      return true;
    } catch (e: any) {
      setMsg({ type: 'err', text: '保存出错：' + (e?.message || e) });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'delete') => {
    const confirmMap = {
      approve: '确定通过这条草稿？当前编辑内容会保存，并标记为可发布。',
      reject: '确定拒绝这条草稿？将从待审移除。',
      delete: '确定删除这条草稿？此操作不可恢复。',
    };
    if (!window.confirm(confirmMap[action])) return;
    setBusyId(id);
    setMsg(null);
    try {
      // 2026-08-22 修复：delete 用 RESTful 路径 /api/drafts/:id（后端有 DELETE 路由），
      // 不再拼 /delete（旧版 404 → JSON 解析报错）。
      const url = action === 'delete' ? `/api/drafts/${id}` : `/api/drafts/${id}/${action}`;
      const init = action === 'approve'
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proposedComment: String(draftText[id] || '').trim() }),
          }
        : { method: action === 'delete' ? 'DELETE' : 'POST' };
      const res = await apiFetch(url, init);
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data?.error || '操作失败' }); return; }
      setItems((prev) => prev.filter((it) => it.id !== id));
      const text = action === 'approve' ? '已通过' : action === 'reject' ? '已拒绝' : '已删除';
      setMsg({ type: 'ok', text: `${text} id=${id}` });
    } catch (e: any) {
      setMsg({ type: 'err', text: '操作出错：' + (e?.message || e) });
    } finally {
      setBusyId(null);
    }
  };

  const countsMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of counts) m[c.status] = c.n;
    return m;
  }, [counts]);

  const badge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      publishing: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      rejected: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
      posted: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    };
    const label: Record<string, string> = { pending: '待审', approved: '待发布', publishing: '发布中', rejected: '已拒绝', posted: '已发布' };
    return <span className={`px-2 py-0.5 rounded-full text-[11px] border ${map[s] || ''}`}>{label[s] || s}</span>;
  };

  const parseArr = (s: string): string[] => {
    try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
  };

  const shortUrl = (u: string) => {
    try {
      const m = new URL(u).pathname.match(/^\/(p|reels?)\/([^/]+)/i);
      return m ? `/${m[1]}/${m[2].slice(0, 12)}…` : u.slice(0, 40);
    } catch { return u.slice(0, 40); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">生成的评论草稿</h2>
          <p className="text-sm text-zinc-400 mt-1">
            bot 基于帖子视觉分析 + DeepSeek 生成的评论（未自动发布，需人工审核）
          </p>
        </div>
        <button
          onClick={loadList}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-200 border border-zinc-700"
        >
          刷新
        </button>
      </div>

      {/* 统计条 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['pending', 'approved', 'publishing', 'rejected', 'posted'] as const).map((s) => (
          <div key={s} className={`p-4 rounded-xl border ${
            s === 'pending' ? 'bg-amber-500/5 border-amber-500/20' :
            s === 'approved' ? 'bg-emerald-500/5 border-emerald-500/20' :
            s === 'publishing' ? 'bg-cyan-500/5 border-cyan-500/20' :
            s === 'rejected' ? 'bg-zinc-500/5 border-zinc-500/20' :
            'bg-sky-500/5 border-sky-500/20'
          }`}>
            <div className="text-2xl font-black text-white">{countsMap[s] || 0}</div>
            <div className="text-xs text-zinc-400 mt-1">
              {{ pending: '待审', approved: '待发布', publishing: '发布中', rejected: '已拒绝', posted: '已发布' }[s]}
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* 筛选 */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'publishing', 'rejected', 'posted', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filter === f
                ? 'bg-rose-600/10 text-rose-400 border-rose-500/30'
                : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {{ pending: '待审', approved: '待发布', publishing: '发布中', rejected: '已拒绝', posted: '已发布', all: '全部' }[f]}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="space-y-3">
        {loading && <div className="text-zinc-500 text-sm p-4">加载中…</div>}
        {!loading && items.length === 0 && (
          <div className="text-zinc-500 text-sm p-8 text-center border border-dashed border-zinc-800 rounded-xl">
            暂无草稿。bot 生成评论后会同步到这里。
          </div>
        )}
        {items.map((it) => (
          <div key={it.id} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* 生成评论 */}
                {it.status === 'pending' || it.status === 'approved' ? (
                  <textarea
                    value={draftText[it.id] ?? it.proposed_comment}
                    onChange={(e) => setDraftText((prev) => ({ ...prev, [it.id]: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg bg-zinc-950/80 border border-emerald-500/25 px-3 py-2 text-sm leading-relaxed text-emerald-200 outline-none focus:border-emerald-400"
                  />
                ) : (
                  <p className="text-emerald-300 text-sm leading-relaxed border-l-2 border-emerald-500/40 pl-3">
                    {it.proposed_comment}
                  </p>
                )}
                {/* 元信息 */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {badge(it.status)}
                  {it.bot_id && <span className="text-[11px] text-cyan-400">{it.bot_id}</span>}
                  {it.handle && <span className="text-[11px] text-zinc-500">@{it.handle}</span>}
                  <span className="text-[11px] text-zinc-600">{it.lang}</span>
                  {it.post_url && (
                    <a href={it.post_url} target="_blank" rel="noreferrer"
                       className="text-[11px] text-sky-400 hover:underline">
                      {shortUrl(it.post_url)}
                    </a>
                  )}
                  {it.created_at && (
                    <span className="text-[11px] text-zinc-600">{new Date(it.created_at).toLocaleString()}</span>
                  )}
                </div>
                {/* 风险标签 */}
                {parseArr(it.grounding_risks).length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {parseArr(it.grounding_risks).map((r) => (
                      <span key={r} className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">
                        ⚠ {r}
                      </span>
                    ))}
                  </div>
                )}
                {/* 事实依据 */}
                {parseArr(it.safe_facts).length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {parseArr(it.safe_facts).map((f) => (
                      <span key={f} className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-700/40 text-zinc-400 border border-zinc-700">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {(it.status === 'pending' || it.status === 'approved') && (
                  <button
                    onClick={() => saveEdit(it.id)}
                    disabled={busyId === it.id}
                    className="px-3 py-1.5 rounded-lg text-xs bg-sky-600/15 text-sky-400 border border-sky-500/30 hover:bg-sky-600/25 disabled:opacity-50"
                  >
                    保存
                  </button>
                )}
                {it.status !== 'approved' && it.status !== 'posted' && (
                  <button
                    onClick={() => handleAction(it.id, 'approve')}
                    disabled={busyId === it.id}
                    className="px-3 py-1.5 rounded-lg text-xs bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/25 disabled:opacity-50"
                  >
                    通过
                  </button>
                )}
                {it.status !== 'rejected' && it.status !== 'posted' && (
                  <button
                    onClick={() => handleAction(it.id, 'reject')}
                    disabled={busyId === it.id}
                    className="px-3 py-1.5 rounded-lg text-xs bg-amber-600/15 text-amber-400 border border-amber-500/30 hover:bg-amber-600/25 disabled:opacity-50"
                  >
                    拒绝
                  </button>
                )}
                <button
                  onClick={() => handleAction(it.id, 'delete')}
                  disabled={busyId === it.id}
                  className="px-3 py-1.5 rounded-lg text-xs bg-red-600/15 text-red-400 border border-red-500/30 hover:bg-red-600/25 disabled:opacity-50"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
