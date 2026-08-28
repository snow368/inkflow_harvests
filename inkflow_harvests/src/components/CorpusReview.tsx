import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api-auth';

type CorpusItem = {
  id: number;
  text: string;
  source_hash: string;
  handle: string;
  lang: string;
  image_tags: string;
  comment_tags: string;
  quality: string;
  created_at: string;
};

type CountItem = { quality: string; n: number };

export default function CorpusReview() {
  const [items, setItems] = useState<CorpusItem[]>([]);
  const [counts, setCounts] = useState<CountItem[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter !== 'all' ? `?quality=${filter}` : '';
      const res = await apiFetch('/api/corpus' + q);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
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

  // 通过（pending→approved，进入正式语料供评论生成检索）
  const handleAction = async (id: number, action: 'approve' | 'reject' | 'delete') => {
    const confirmMap = {
      approve: '确定通过这条语料？将进入正式语料库供评论生成参考。',
      reject: '确定拒绝这条语料？将从待审核移除。',
      delete: '确定删除这条语料？此操作不可恢复。',
    };
    if (!window.confirm(confirmMap[action])) return;
    setBusyId(id);
    setMsg(null);
    try {
      const url = action === 'delete' ? '/api/corpus/' + id : `/api/corpus/${id}/${action}`;
      const res = await apiFetch(url, { method: action === 'delete' ? 'DELETE' : 'POST' });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data?.error || '操作失败' }); return; }
      setItems((prev) => prev.filter((it) => it.id !== id));
      const actionText = action === 'approve' ? '已通过' : action === 'reject' ? '已拒绝' : '已删除';
      setMsg({ type: 'ok', text: `${actionText} id=${id}` });
    } catch (e: any) {
      setMsg({ type: 'err', text: '操作出错：' + (e?.message || e) });
    } finally {
      setBusyId(null);
    }
  };

  const countsMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of counts) m[c.quality] = c.n;
    return m;
  }, [counts]);

  const total = countsMap.pending || 0;
  const approvedN = countsMap.approved || 0;
  const rejectedN = countsMap.rejected || 0;

  const badge = (q: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      rejected: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    };
    const label: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] border ${map[q] || ''}`}>
        {label[q] || q}
      </span>
    );
  };

  const parseTags = (s: string): string[] => {
    try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">评论语料库</h2>
          <p className="text-sm text-zinc-400 mt-1">
            VPS bot 采集的公开评论 → 审核通过后进入正式语料，供评论生成检索增强参考
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
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="text-2xl font-black text-amber-400">{total}</div>
          <div className="text-xs text-zinc-400 mt-1">待审核</div>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="text-2xl font-black text-emerald-400">{approvedN}</div>
          <div className="text-xs text-zinc-400 mt-1">已通过（正式语料）</div>
        </div>
        <div className="p-4 rounded-xl bg-zinc-500/5 border border-zinc-500/20">
          <div className="text-2xl font-black text-zinc-400">{rejectedN}</div>
          <div className="text-xs text-zinc-400 mt-1">已拒绝</div>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {msg.text}
        </div>
      )}

      {/* 筛选 */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filter === f
                ? 'bg-rose-600/10 text-rose-400 border-rose-500/30'
                : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {{ pending: '待审核', approved: '已通过', rejected: '已拒绝', all: '全部' }[f]}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="space-y-2">
        {loading && <div className="text-zinc-500 text-sm p-4">加载中…</div>}
        {!loading && items.length === 0 && (
          <div className="text-zinc-500 text-sm p-8 text-center border border-dashed border-zinc-800 rounded-xl">
            暂无语料。bot 采集的评论会自动上报到这里。
          </div>
        )}
        {items.map((it) => (
          <div key={it.id} className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-zinc-100 text-sm leading-relaxed">{it.text}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {badge(it.quality)}
                  {it.handle && <span className="text-[11px] text-zinc-500">@{it.handle}</span>}
                  <span className="text-[11px] text-zinc-600">{it.lang}</span>
                  {it.created_at && (
                    <span className="text-[11px] text-zinc-600">
                      {new Date(it.created_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {parseTags(it.image_tags).length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {parseTags(it.image_tags).map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {it.quality !== 'approved' && (
                  <button
                    onClick={() => handleAction(it.id, 'approve')}
                    disabled={busyId === it.id}
                    className="px-3 py-1.5 rounded-lg text-xs bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/25 disabled:opacity-50"
                  >
                    通过
                  </button>
                )}
                {it.quality !== 'rejected' && (
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
