import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api-auth';
import { cn } from '../lib/utils';
import { BookOpen, Link2, FileText, Upload, Send, RefreshCw, CheckCircle2, AlertCircle, Eye, Trash2 } from 'lucide-react';

// ============ 知识采集后台（DEV-ONLY）============
// 入口：InkFlow 获客 → SEO 工具 → 📚 技能知识库 → 「📥 知识库(采集)」内嵌视图（仅 dev 可见）。
// 门禁：① 前端 isDev（snow368）才显示该内嵌视图；② 后端 /api/kb* 全部 requireDev 双重门禁。
// 功能：① 粘贴链接 → 服务端抓取页面正文 → 自动分类预览；② 直接粘贴/上传具体内容 → 提交入库；
//       ③ 浏览已采集的 SEO/社媒知识（含 316 SEO + 226 社媒种子）。

const KB_OPTIONS = [
  { value: 'seo', label: 'SEO' },
  { value: 'social', label: '社媒' },
];
const SEO_DIMS = ['strategy', 'keyword', 'content', 'technical', 'link', 'workflow'];
const SOCIAL_DIMS = ['strategy', 'hooks', 'platforms', 'growth', 'conversion', 'analytics'];
const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'x', label: 'X / Twitter' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'cross', label: '跨平台' },
];

interface KbItem {
  id: number;
  kb: string;
  platform: string | null;
  dimension: string;
  bucket: string;
  title: string | null;
  summary: string | null;
  source_url: string | null;
  tags: string | null;
  created_at: string;
}

export default function KnowledgeIntake() {
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [kb, setKb] = useState('seo');
  const [platform, setPlatform] = useState('instagram');
  const [dimension, setDimension] = useState('strategy');

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [lastPreview, setLastPreview] = useState<string>('');

  const [items, setItems] = useState<KbItem[]>([]);
  const [counts, setCounts] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [filterKb, setFilterKb] = useState<string>('all');
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const dims = kb === 'social' ? SOCIAL_DIMS : SEO_DIMS;

  // 抓取链接内容（仅预览，不入库）
  const handleFetch = async () => {
    if (!url.trim()) { setMsg({ type: 'err', text: '请先填写链接' }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await apiFetch('/api/kb-intake', {
        method: 'POST',
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data?.error || '抓取失败' }); return; }
      const cls = data.classification || {};
      setContent(data.preview || '');
      setLastPreview(data.preview || '');
      if (cls.kb) setKb(cls.kb);
      if (cls.platform) setPlatform(cls.platform);
      if (cls.dimension) setDimension(cls.dimension);
      setMsg({ type: 'ok', text: `已抓取并自动分类 → ${cls.kb}/${cls.platform || ''}/${cls.dimension}（${data.status === 'duplicate' ? '内容已存在，跳过' : '可提交入库'}）` });
    } catch (e: any) {
      setMsg({ type: 'err', text: '抓取出错：' + (e?.message || e) });
    } finally { setBusy(false); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setContent(String(reader.result || '')); setMsg({ type: 'ok', text: `已读取文件：${f.name}` }); };
    reader.readAsText(f);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { setMsg({ type: 'err', text: '内容为空，无法入库' }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await apiFetch('/api/kb-intake', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim(),
          title: title.trim() || undefined,
          url: url.trim() || undefined,
          kb,
          platform: kb === 'social' ? platform : undefined,
          dimension,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data?.error || '入库失败' }); return; }
      setMsg({ type: 'ok', text: data.status === 'duplicate' ? '内容已存在，跳过重复。' : `入库成功（id=${data.id}）→ ${kb}/${kb === 'social' ? platform + '/' : ''}${dimension}` });
      setContent(''); setTitle(''); setUrl(''); setTags(''); setLastPreview('');
      loadList();
    } catch (e: any) {
      setMsg({ type: 'err', text: '提交出错：' + (e?.message || e) });
    } finally { setBusy(false); }
  };

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const q = filterKb !== 'all' ? `?kb=${filterKb}` : '';
      const res = await apiFetch('/api/kb' + q);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setCounts(data.counts || []);
        setBuckets(data.buckets || []);
      }
    } catch { /* ignore */ } finally { setLoadingList(false); }
  }, [filterKb]);

  useEffect(() => { loadList(); }, [loadList]);

  // 删除单条已采集知识（乐观更新本地列表，失败回滚提示）
  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除这条已采集知识？此操作不可恢复。')) return;
    setDeletingId(id);
    try {
      const res = await apiFetch('/api/kb/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data?.error || '删除失败' }); return; }
      setItems((prev) => prev.filter((it) => it.id !== id));
      setMsg({ type: 'ok', text: `已删除 id=${id}` });
    } catch (e: any) {
      setMsg({ type: 'err', text: '删除出错：' + (e?.message || e) });
    } finally { setDeletingId(null); }
  };

  const totalCount = counts.reduce((a: number, c: any) => a + (c.n || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen size={26} className="text-emerald-500" />
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">SEO / 社媒知识库（采集后台）</h1>
          <p className="text-sm text-slate-500">仅 dev 可见 · 粘贴链接自动抓取分类，或直接投递内容入库</p>
        </div>
      </div>

      {msg && (
        <div className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-sm', msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
          {msg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* 采集区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
            <Link2 size={16} /> 1. 链接抓取（自动分类预览）
          </div>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://x.com/... 或任意文章链接"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900"
            />
            <button
              onClick={handleFetch}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
            >
              {busy ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />} 抓取
            </button>
          </div>
          <div className="text-xs text-slate-400">服务端（Cloudflare 边缘）抓取页面正文，绕过 GFW，按规则自动判库/平台/维度。</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
            <FileText size={16} /> 2. 投递内容
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-emerald-600 hover:text-emerald-700">
            <Upload size={14} /> 上传文件（.txt/.md）
            <input type="file" accept=".txt,.md,.json,.csv" onChange={handleFile} className="hidden" />
          </label>
          <div className="text-xs text-slate-400">或直接在下方的文本框粘贴具体内容。</div>
          <div className="grid grid-cols-3 gap-2">
            <select value={kb} onChange={(e) => setKb(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900">
              {KB_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {kb === 'social' && (
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900">
                {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            )}
            <select value={dimension} onChange={(e) => setDimension(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900">
              {dims.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（可选，留空取首句）"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签（逗号分隔，可选）"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">知识正文</span>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
          >
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} 提交入库
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="粘贴或编辑要入库的知识内容……（抓取链接后会自动填入）"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900"
        />
      </div>

      {/* 浏览区 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
            <BookOpen size={16} /> 已采集（共 {totalCount} 条）
          </div>
          <div className="flex items-center gap-2">
            <select value={filterKb} onChange={(e) => setFilterKb(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900">
              <option value="all">全部</option>
              <option value="seo">SEO</option>
              <option value="social">社媒</option>
            </select>
            <button onClick={loadList} disabled={loadingList} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700 flex items-center gap-1">
              {loadingList ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} 刷新
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {counts.map((c: any) => (
            <span key={c.kb} className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-700 dark:text-slate-200">{c.kb}: {c.n}</span>
          ))}
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
          {items.length === 0 && <div className="py-6 text-center text-sm text-slate-400">暂无数据</div>}
          {items.map((it) => (
            <div key={it.id} className="py-2.5 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{it.kb}</span>
                  {it.platform && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{it.platform}</span>}
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-200">{it.dimension}</span>
                  {it.source_url && <a href={it.source_url} target="_blank" rel="noreferrer" className="text-[11px] text-sky-600 hover:underline truncate max-w-[200px]">{it.source_url}</a>}
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-200 mt-1">{it.title || it.summary}</div>
              </div>
              <button
                onClick={() => handleDelete(it.id)}
                disabled={deletingId === it.id}
                title="删除这条"
                className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-400 hover:text-red-600 hover:border-red-300 disabled:opacity-50 dark:border-slate-600 dark:hover:border-red-500/50"
              >
                {deletingId === it.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
