import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, RefreshCw, Loader2, CheckCircle2, Clock, Send, X, Lightbulb, ArrowRight, Sparkles, Upload, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const API = '';

const STATUSES = ['draft', 'review', 'approved', 'queued', 'published', 'failed'];
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-600', review: 'bg-amber-500', approved: 'bg-emerald-500',
  queued: 'bg-blue-500', published: 'bg-green-600', failed: 'bg-red-500',
};

const SOURCE_LABELS: Record<string, string> = {
  product_knowledge: '产品知识库',
  competitor_analysis: '竞品分析',
  gap_analysis: 'Gap 分析',
  customer_feedback: '客户反馈',
  sales_data: '销售数据',
  new_product: '新品',
  social_trend: '社媒趋势',
  manual: '人工输入',
};

function mediaSrc(pkg: any): string | null {
  if (pkg.media_blob) return `data:${pkg.media_type || 'image/png'};base64,${pkg.media_blob}`;
  if (pkg.media_url) return pkg.media_url;
  return null;
}

function readFileAsBase64(file: File): Promise<{ data: string; type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // data:<type>;base64,<data>
      const m = result.match(/^data:(.*?);base64,(.*)$/);
      if (m) resolve({ data: m[2], type: m[1] });
      else reject(new Error('Cannot read file'));
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

export default function ContentOperations() {
  const [tab, setTab] = useState<'briefs' | 'packages'>('briefs');
  const [packages, setPackages] = useState<any[]>([]);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');

  // 媒体上传相关状态
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [genCaption, setGenCaption] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadBriefs = async () => {
    try {
      const r = await fetch(API + '/api/content/briefs');
      if (r.ok) { const d = await r.json(); setBriefs(d.briefs || []); }
    } catch { }
  };

  const loadPackages = async () => {
    setLoading(true);
    try {
      const r = await fetch(API + '/api/content/packages');
      if (r.ok) { const d = await r.json(); setPackages(d.packages || []); }
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadBriefs(); loadPackages(); }, []);

  const uploadMedia = async (id: string, file: File) => {
    const { data, type } = await readFileAsBase64(file);
    await fetch(API + `/api/content/packages/${id}/media`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: type, media_blob: data }),
    });
  };

  const generateCaption = async (id: string) => {
    try {
      await fetch(API + `/api/content/packages/${id}/generate-caption`, { method: 'POST' });
      loadPackages();
    } catch { toast.error('AI 生成失败'); }
  };

  const createPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.target as HTMLFormElement);
    const body: any = {};
    fd.forEach((v, k) => { if (k !== 'media_file') body[k] = v; });
    try {
      const r = await fetch(API + '/api/content/packages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (r.ok) {
        const d = await r.json();
        const id = d.id;
        if (mediaFile) { try { await uploadMedia(id, mediaFile); } catch { toast.error('素材上传失败'); } }
        if (genCaption && (body.title || body.product)) { await generateCaption(id); }
        setShowNew(false); setMediaFile(null); setMediaPreview(null); setGenCaption(false);
        loadPackages();
      }
    } catch { toast.error('创建失败'); }
    setBusy(false);
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setMediaFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setMediaPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else setMediaPreview(null);
  };

  /** Convert a brief into a package (pre-fill fields) */
  const briefToPackage = async (brief: any) => {
    try {
      const r = await fetch(API + '/api/content/packages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: brief.title,
          idea_id: brief.id,
          platform: brief.platform || 'Instagram',
          content_type: brief.format === 'Reel' ? 'Reel' : brief.format || 'Reel',
          product: brief.product || '',
          caption: brief.hook || brief.title,
          hashtags: '',
        })
      });
      if (r.ok) { loadPackages(); setTab('packages'); }
    } catch { }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(API + '/api/content/packages/' + id, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
      });
      loadPackages();
    } catch { }
  };

  const deletePackage = async (id: string) => {
    if (!confirm('Delete this package?')) return;
    try { await fetch(API + '/api/content/packages/' + id, { method: 'DELETE' }); loadPackages(); } catch { }
  };

  const deleteBrief = async (id: string) => {
    if (!confirm('Delete this brief?')) return;
    try { await fetch(API + '/api/content/briefs/' + id, { method: 'DELETE' }); loadBriefs(); } catch { }
  };

  const displayPackages = filter === 'all' ? packages : packages.filter(p => p.status === filter);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">📦 Content Operations</h2>
          <p className="text-sm text-slate-400 mt-1">选题 → Package → 审核 → 队列 → Bot 发布</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadBriefs(); loadPackages(); }} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300">
            <RefreshCw className="w-4 h-4" />
          </button>
          {tab === 'packages' && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> 新建 Package
            </button>
          )}
        </div>
      </div>

      {/* Tab bar: Briefs | Packages */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('briefs')}
          className={`px-4 py-1.5 text-xs rounded-md font-semibold ${tab === 'briefs' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          💡 选题方案 ({briefs.length})
        </button>
        <button onClick={() => setTab('packages')}
          className={`px-4 py-1.5 text-xs rounded-md font-semibold ${tab === 'packages' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          📦 Packages ({packages.length})
        </button>
      </div>

      {/* ── BRIEFS TAB ── */}
      {tab === 'briefs' && (
        <div className="space-y-2">
          {briefs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无选题方案</p>
              <p className="text-xs text-slate-600 mt-1">从「新品情报」点击「+ 生成选题」创建</p>
            </div>
          ) : (
            briefs.map((b: any) => (
              <div key={b.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">{b.title}</span>
                      {b.score > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: b.score >= 85 ? '#14532d40' : '#713f1240', color: b.score >= 85 ? '#22c55e' : '#f59e0b' }}>
                        {b.score}
                      </span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-medium">
                        {SOURCE_LABELS[b.source] || b.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                      {b.hook && <span>🎯 {b.hook}</span>}
                      {b.audience && <span>👥 {b.audience}</span>}
                      {b.format && <span>🎬 {b.format}</span>}
                      {b.platform && <span>📱 {b.platform}</span>}
                    </div>
                    {b.pain_point && <p className="text-xs text-slate-500 mt-1 truncate">⚠️ {b.pain_point}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button onClick={() => briefToPackage(b)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-[10px] text-rose-300 font-medium transition-colors"
                      title="转为 Package">
                      <ArrowRight className="w-3.5 h-3.5" /> 转 Package
                    </button>
                    <button onClick={() => deleteBrief(b.id)} className="p-1.5 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400" title="删除">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── PACKAGES TAB ── */}
      {tab === 'packages' && (
        <>
          {/* Status filter tabs */}
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
            {['all', ...STATUSES].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors ${filter === s ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {s === 'all' ? '全部' : s === 'draft' ? '草稿' : s === 'review' ? '审核中' : s === 'approved' ? '已通过' : s === 'queued' ? '队列中' : s === 'published' ? '已发布' : '失败'}
              </button>
            ))}
          </div>

          {/* New Package Form */}
          {showNew && (
            <form onSubmit={createPackage} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">📦 新建 Content Package</h3>
              <div className="grid grid-cols-2 gap-3">
                <input name="title" required placeholder="标题..." className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <input name="idea_id" placeholder="关联选题 ID (可选)..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <select name="platform" className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none">
                  <option value="Instagram">Instagram</option><option value="TikTok">TikTok</option><option value="YouTube">YouTube</option>
                </select>
                <select name="content_type" className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none">
                  <option value="Reel">Reel</option><option value="Image">图片</option><option value="Carousel">轮播</option><option value="Story">Story</option>
                </select>
                <input name="product" placeholder="关联产品..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <input name="media_url" placeholder="或粘贴素材 URL..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
              </div>

              {/* Media upload + preview */}
              <div className="col-span-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-rose-500/40 transition-colors">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-300">{mediaFile ? mediaFile.name : '上传图片/视频（≤5MB，存为素材预览）'}</span>
                  <input type="file" name="media_file" accept="image/*,video/*" onChange={onFilePick} className="hidden" />
                </label>
                {mediaPreview && (
                  <div className="mt-2">
                    {mediaFile?.type.startsWith('video') ? (
                      <video src={mediaPreview} controls className="w-32 h-32 object-cover rounded-lg border border-slate-700" />
                    ) : (
                      <img src={mediaPreview} alt="preview" className="w-32 h-32 object-cover rounded-lg border border-slate-700" />
                    )}
                  </div>
                )}
              </div>

              <textarea name="caption" placeholder="Caption（留空可让 AI 生成）..." rows={2} className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none resize-none" />
              <input name="hashtags" placeholder="Hashtags (逗号分隔)..." className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />

              <label className="flex items-center gap-2 text-xs text-slate-300 col-span-2 cursor-pointer">
                <input type="checkbox" checked={genCaption} onChange={e => setGenCaption(e.target.checked)} className="accent-rose-500" />
                <Wand2 className="w-3.5 h-3.5 text-rose-400" /> 创建后用 AI 自动生成文案（基于标题/产品）
              </label>

              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  {busy ? '创建中...' : '创建'}
                </button>
                <button type="button" onClick={() => { setShowNew(false); setMediaFile(null); setMediaPreview(null); setGenCaption(false); }} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">取消</button>
              </div>
            </form>
          )}

          {/* Packages List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline" /> 加载中...</div>
            ) : displayPackages.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">暂无 Content Package</p>
                <p className="text-xs text-slate-600 mt-1">从「选题方案」tab 点击「转 Package」创建</p>
              </div>
            ) : (
              displayPackages.map(pkg => {
                const src = mediaSrc(pkg);
                const isVideo = (pkg.media_type && pkg.media_type.startsWith('video')) ||
                  (pkg.media_url && /\.(mp4|mov|webm)$/i.test(pkg.media_url));
                return (
                  <div key={pkg.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-3">
                    <div className="flex items-start gap-3">
                      {/* media thumbnail */}
                      {src && (
                        <div className="shrink-0">
                          {isVideo ? (
                            <video src={src} controls className="w-20 h-20 object-cover rounded-lg border border-slate-700" />
                          ) : (
                            <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-700" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200 truncate">{pkg.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold text-white ${STATUS_COLORS[pkg.status] || 'bg-slate-600'}`}>
                            {pkg.status}
                          </span>
                          {pkg.platform && <span className="text-[10px] text-slate-500">📱 {pkg.platform}</span>}
                        </div>
                        {pkg.caption && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{pkg.caption}</p>}
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600">
                          {pkg.content_type && <span>{pkg.content_type}</span>}
                          {pkg.product && <span>📦 {pkg.product}</span>}
                          {pkg.assigned_bot && <span>🤖 {pkg.assigned_bot}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => generateCaption(pkg.id)} className="p-1.5 rounded hover:bg-rose-900/30 text-slate-500 hover:text-rose-400" title="AI 生成文案">
                          <Wand2 className="w-3.5 h-3.5" />
                        </button>
                        {pkg.status === 'draft' && (
                          <button onClick={() => updateStatus(pkg.id, 'review')} className="p-1.5 rounded hover:bg-amber-900/30 text-slate-500 hover:text-amber-400" title="提交审核"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                        )}
                        {pkg.status === 'review' && (
                          <button onClick={() => updateStatus(pkg.id, 'approved')} className="p-1.5 rounded hover:bg-emerald-900/30 text-slate-500 hover:text-emerald-400" title="通过"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                        )}
                        {pkg.status === 'approved' && (
                          <button onClick={() => updateStatus(pkg.id, 'queued')} className="p-1.5 rounded hover:bg-blue-900/30 text-slate-500 hover:text-blue-400" title="加入队列"><Send className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => deletePackage(pkg.id)} className="p-1.5 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400" title="删除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
