import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, getAuthToken } from '../lib/api-auth';
import { clearStoredEmailAuth, logoutUser } from '../lib/firebase';
import { toast } from 'sonner';
import {
  Check,
  X,
  SkipForward,
  Undo2,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Trash2,
  Save,
} from 'lucide-react';

/**
 * 手机审批页（#/review-mobile）
 *
 * 目的：把「审核评论草稿」做成拇指可完成的操作。
 * - 一屏一张卡，文案 16px 起（避免 iOS 聚焦自动放大）
 * - 主操作只有两个大按钮：通过 / 拒绝，**不再逐个弹 confirm**
 * - 通过时把编辑后的文案一并提交（省掉「先保存再通过」两次点击）
 * - 撤销上一步：反向调用后端已有 action（approve ⇄ reject），无需新增后端接口
 * - 删除 = 不可恢复 ⇒ 保留二次确认（按钮变「确认删除」）
 */

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
  approved_at?: string;
  approved_by?: string;
  created_at: string;
};

type Mode = 'pending' | 'approved';
type LastAction = { item: DraftItem; action: 'approve' | 'reject' };

const parseArr = (s: string): string[] => {
  try {
    const a = JSON.parse(s || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};

const at = (h: string) => (h || '').replace(/^@/, '');

export default function ReviewMobile() {
  const [mode, setMode] = useState<Mode>('pending');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 诊断信息：手机上没有控制台，把「HTTP 状态 + 有没有带上登录令牌」直接画在页面上，
  // 这样一眼就能区分「登录态没了」和「后端真的没有待审数据」。
  const [diag, setDiag] = useState<{ status: number | null; tokenSent: boolean }>({ status: null, tokenSent: false });
  const [text, setText] = useState('');
  const [handled, setHandled] = useState(0);
  const [last, setLast] = useState<LastAction | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const delTimer = useRef<number | null>(null);

  const current: DraftItem | undefined = mode === 'pending' ? items[0] : undefined;
  const currentId = current?.id;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const token = await getAuthToken();
      const res = await apiFetch(`/api/drafts?status=${mode}`);
      setDiag({ status: res.status, tokenSent: !!token });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error || '';
        setErr(
          res.status === 401
            ? `登录已过期或未登录（HTTP 401${code ? ' ' + code : ''}）`
            : code || `加载失败（HTTP ${res.status}）`,
        );
        return;
      }
      if (!data) {
        setErr('返回内容不是 JSON（可能是网络/代理页），请点刷新重试');
        return;
      }
      const list: DraftItem[] = Array.isArray(data.items) ? data.items.slice() : [];
      // 最老的先审 —— 与 bot 端 claim-approved 的 ORDER BY id ASC 对齐，避免旧草稿永远排不到
      list.sort((a, b) => a.id - b.id);
      setItems(list);
      const m: Record<string, number> = {};
      for (const c of data.counts || []) m[c.status] = c.n;
      setCounts(m);
    } catch (e: any) {
      setDiag((d) => ({ ...d, status: null }));
      setErr('加载出错：' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setHandled(0);
    setLast(null);
    setConfirmDel(null);
  }, [mode]);

  useEffect(() => {
    setText(current?.proposed_comment || '');
    setConfirmDel(null);
  }, [currentId]);

  useEffect(() => () => {
    if (delTimer.current) window.clearTimeout(delTimer.current);
  }, []);

  const dirty = !!current && text.trim() !== (current.proposed_comment || '').trim();

  const act = async (action: 'approve' | 'reject') => {
    if (!current || busy) return;
    const item = current;
    const payload = text.trim();
    if (action === 'approve' && payload.length < 3) {
      setErr('评论太短（至少 3 个字符），无法通过');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const init: RequestInit = { method: 'POST' };
      if (action === 'approve') {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify({ proposedComment: payload });
      }
      const res = await apiFetch(`/api/drafts/${item.id}/${action}`, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || '操作失败');
        return;
      }
      setItems((prev) => prev.slice(1));
      setHandled((n) => n + 1);
      setLast({ item: { ...item, proposed_comment: action === 'approve' ? payload : item.proposed_comment }, action });
      setCounts((c) => ({
        ...c,
        [item.status]: Math.max(0, (c[item.status] || 1) - 1),
        [action === 'approve' ? 'approved' : 'rejected']: (c[action === 'approve' ? 'approved' : 'rejected'] || 0) + 1,
      }));
    } catch (e: any) {
      setErr('网络出错：' + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!current || busy) return;
    const payload = text.trim();
    if (payload.length < 3) {
      setErr('评论太短（至少 3 个字符）');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/drafts/${current.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedComment: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || '保存失败');
        return;
      }
      setItems((prev) => prev.map((it) => (it.id === current.id ? { ...it, proposed_comment: payload } : it)));
      toast.success('文案已保存，仍留在待审队列');
    } catch (e: any) {
      setErr('保存出错：' + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    if (items.length < 2) return;
    setItems((prev) => [...prev.slice(1), prev[0]]);
  };

  const remove = async (id: number) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/drafts/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || '删除失败');
        return;
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
      setConfirmDel(null);
    } catch (e: any) {
      setErr('删除出错：' + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const askDelete = (id: number) => {
    if (confirmDel === id) {
      remove(id);
      return;
    }
    setConfirmDel(id);
    if (delTimer.current) window.clearTimeout(delTimer.current);
    delTimer.current = window.setTimeout(() => setConfirmDel(null), 4000);
  };

  /** 撤销上一步：反向调用后端已有的 action（approve ⇄ reject）。
   *  后端只允许 pending/approved/rejected 之间流转，**没有回 pending 的接口**，
   *  所以「撤销」= 改判，草稿不会回到待审队列。文案里如实说明结果状态。 */
  const undoLast = async () => {
    if (!last || busy) return;
    const inverse: 'approve' | 'reject' = last.action === 'approve' ? 'reject' : 'approve';
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/drafts/${last.item.id}/${inverse}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          inverse === 'reject'
            ? '无法撤销：该草稿已被发布流程领取，请到「待发布」里处理'
            : '无法撤销：' + (data?.error || '操作失败'),
        );
        setLast(null);
        return;
      }
      setHandled((n) => Math.max(0, n - 1));
      setCounts((c) => {
        const from = inverse === 'approve' ? 'rejected' : 'approved';
        const to = inverse === 'approve' ? 'approved' : 'rejected';
        return { ...c, [from]: Math.max(0, (c[from] || 1) - 1), [to]: (c[to] || 0) + 1 };
      });
      toast.warning(
        inverse === 'reject'
          ? `已撤销：@${at(last.item.handle)} 移出发布队列（现为已拒绝）`
          : `已撤销：@${at(last.item.handle)} 放回发布队列（现为待发布）`,
      );
      setLast(null);
    } catch (e: any) {
      setErr('撤销出错：' + (e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const pendingN = counts.pending || 0;
  const approvedN = counts.approved || 0;

  // 登录态坏掉时一键重来：清掉本地保存的邮箱登录态 + 退出 Firebase，然后重载回到登录页。
  const relogin = async () => {
    try { clearStoredEmailAuth(); } catch { /* ignore */ }
    try { await logoutUser(); } catch { /* ignore */ }
    window.location.reload();
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-2">
      {/* 模式切换 + 进度 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
          {(
            [
              ['pending', `待审 ${err ? '?' : pendingN}`],
              ['approved', `待发布 ${approvedN}`],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m as Mode)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-rose-600/15 text-rose-400' : 'text-zinc-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'pending' && (
            <span className="text-xs text-zinc-500">
              已处理 <b className="text-zinc-200">{handled}</b>
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            刷新
          </button>
        </div>
      </div>

      <div
        className={`rounded-lg p-3 text-sm ${
          err ? 'bg-red-500/10 text-red-300' : 'hidden'
        }`}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-all">{err}</span>
        </div>
        <div className="mt-2 pl-6 text-[11px] leading-relaxed text-red-300/70">
          HTTP {diag.status ?? '—'} · {diag.tokenSent ? '已带上登录令牌' : '没有登录令牌（本机无有效登录态）'}
        </div>
        <div className="mt-3 pl-6">
          <button
            onClick={relogin}
            className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 active:scale-95"
          >
            重新登录
          </button>
        </div>
      </div>

      {/* 待审：一屏一张 */}
      {mode === 'pending' &&
        (loading && !current ? (
          <div className="flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10">
            <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
          </div>
        ) : !current && err ? (
          <div className="rounded-2xl border border-dashed border-red-900/60 bg-red-500/5 p-10 text-center">
            <div className="text-2xl">⚠️</div>
            <p className="mt-3 text-sm text-red-200">没能读到待审队列</p>
            <p className="mt-1 text-xs text-zinc-500">
              具体原因见上方红框。若是登录问题，点「重新登录」再回来。
            </p>
            <button
              onClick={load}
              className="mt-5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-200 active:scale-95"
            >
              刷新
            </button>
          </div>
        ) : !current ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
            <div className="text-2xl">🎉</div>
            <p className="mt-3 text-sm text-zinc-300">待审队列已清空</p>
            <p className="mt-1 text-xs text-zinc-500">
              本次已处理 {handled} 条{approvedN > 0 ? ` · 待发布 ${approvedN} 条` : ''}
            </p>
            <button
              onClick={load}
              className="mt-5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-200 active:scale-95"
            >
              再查一次
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-base font-bold text-white">@{at(current.handle)}</span>
                  {current.lang && <span className="text-[11px] text-zinc-500">{current.lang}</span>}
                  {current.bot_id && <span className="text-[11px] text-cyan-400">{current.bot_id}</span>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[11px] text-zinc-600">#{current.id}</span>
                  {current.post_url && (
                    <a
                      href={current.post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-300 active:scale-95"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      看原帖
                    </a>
                  )}
                </div>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                spellCheck={false}
                className="mt-3 w-full resize-y rounded-xl border border-emerald-500/25 bg-zinc-950/80 px-3 py-3 leading-relaxed text-emerald-200 outline-none focus:border-emerald-400"
                style={{ fontSize: '16px' }}
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-zinc-600">{text.trim().length} 字符</span>
                {dirty && <span className="text-[11px] font-semibold text-amber-400">已修改（通过时会一起保存）</span>}
              </div>

              {parseArr(current.grounding_risks).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {parseArr(current.grounding_risks).map((r) => (
                    <span
                      key={r}
                      className="rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400"
                    >
                      ⚠ {r}
                    </span>
                  ))}
                </div>
              )}
              {parseArr(current.safe_facts).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {parseArr(current.safe_facts).map((f) => (
                    <span
                      key={f}
                      className="rounded border border-zinc-700 bg-zinc-700/40 px-1.5 py-0.5 text-[10px] text-zinc-400"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 动作区：sticky 贴底，始终在拇指区 */}
            <div
              className="sticky bottom-0 z-30 mt-auto -mx-4 border-t border-zinc-800/80 bg-[#0a0a0a]/95 px-4 pt-3 backdrop-blur"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              {last && (
                <button
                  onClick={undoLast}
                  disabled={busy}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 py-2.5 text-sm text-zinc-300 active:scale-[.98] disabled:opacity-50"
                >
                  <Undo2 className="h-4 w-4" />
                  撤销上一步（@{at(last.item.handle)}）
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => act('reject')}
                  disabled={busy}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-base font-bold text-amber-300 active:scale-[.98] disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                  拒绝
                </button>
                <button
                  onClick={() => act('approve')}
                  disabled={busy}
                  className="flex h-14 flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-600/20 active:scale-[.98] disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  通过
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={skip}
                  disabled={busy || items.length < 2}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-400 active:scale-95 disabled:opacity-40"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  跳过（还有 {Math.max(0, items.length - 1)} 条）
                </button>
                {dirty && (
                  <button
                    onClick={saveEdit}
                    disabled={busy}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-600/15 text-xs font-semibold text-sky-300 active:scale-95 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    只保存
                  </button>
                )}
                <button
                  onClick={() => askDelete(current.id)}
                  disabled={busy}
                  className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs active:scale-95 disabled:opacity-50 ${
                    confirmDel === current.id
                      ? 'border-red-500 bg-red-600 font-bold text-white'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {confirmDel === current.id ? '再点一次删除' : '删除'}
                </button>
              </div>
            </div>
          </>
        ))}

      {/* 待发布：紧凑列表，可撤回 */}
      {mode === 'approved' && (
        <div className="space-y-2">
          {loading && items.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">加载中…</div>}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
              暂无待发布草稿
            </div>
          )}
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-white">@{at(it.handle)}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[11px] text-zinc-600">#{it.id}</span>
                  {it.approved_by && <span className="text-[11px] text-emerald-500">{it.approved_by}</span>}
                </div>
              </div>
              <p className="mt-2 border-l-2 border-emerald-500/40 pl-2 text-sm leading-relaxed text-emerald-300">
                {it.proposed_comment}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {it.post_url && (
                  <a
                    href={it.post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-8 items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 text-xs text-sky-300 active:scale-95"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    原帖
                  </a>
                )}
                <button
                  onClick={() => {
                    setLast({ item: it, action: 'approve' });
                    setBusy(true);
                    apiFetch(`/api/drafts/${it.id}/reject`, { method: 'POST' })
                      .then(async (res) => {
                        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || '撤回失败');
                        setItems((prev) => prev.filter((x) => x.id !== it.id));
                        setCounts((c) => ({
                          ...c,
                          approved: Math.max(0, (c.approved || 1) - 1),
                          rejected: (c.rejected || 0) + 1,
                        }));
                        toast.warning(`已撤回 @${at(it.handle)}（现为已拒绝）`);
                      })
                      .catch((e: any) => setErr(e?.message || '撤回失败'))
                      .finally(() => setBusy(false));
                  }}
                  disabled={busy}
                  className="flex h-8 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-600/15 px-2.5 text-xs text-amber-300 active:scale-95 disabled:opacity-50"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  撤回
                </button>
                {last && (
                  <button
                    onClick={undoLast}
                    disabled={busy}
                    className="flex h-8 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 text-xs text-zinc-300 active:scale-95 disabled:opacity-50"
                  >
                    撤销上一步
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
