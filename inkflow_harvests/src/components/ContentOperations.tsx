import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, RefreshCw, Loader2, CheckCircle2, Clock, Send, X } from 'lucide-react';

const API = 'https://harvests-cloud-api.inkflowapp.workers.dev';

const STATUSES = ['draft', 'review', 'approved', 'queued', 'published', 'failed'];
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-600', review: 'bg-amber-500', approved: 'bg-emerald-500',
  queued: 'bg-blue-500', published: 'bg-green-600', failed: 'bg-red-500',
};

export default function ContentOperations() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadPackages = async () => {
    setLoading(true);
    try {
      const r = await fetch(API + '/api/content/packages');
      if (r.ok) { const d = await r.json(); setPackages(d.packages || []); }
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadPackages(); }, []);

  const createPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const body: any = {};
    fd.forEach((v, k) => body[k] = v);
    try {
      const r = await fetch(API + '/api/content/packages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (r.ok) { setShowNew(false); loadPackages(); }
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

  const displayPackages = filter === 'all' ? packages : packages.filter(p => p.status === filter);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">📦 Content Operations</h2>
          <p className="text-sm text-slate-400 mt-1">制作 → 审核 → 队列 → Bot 发布</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadPackages} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold">
            <Plus className="w-4 h-4" /> 新建 Package
          </button>
        </div>
      </div>

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
            <input name="media_url" placeholder="素材 URL..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
            <textarea name="caption" placeholder="Caption..." rows={2} className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none resize-none" />
            <input name="hashtags" placeholder="Hashtags (逗号分隔)..." className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold">创建</button>
            <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">取消</button>
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
          </div>
        ) : (
          displayPackages.map(pkg => (
            <div key={pkg.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 truncate">{pkg.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold text-white ${STATUS_COLORS[pkg.status] || 'bg-slate-600'}`}>
                      {pkg.status}
                    </span>
                    {pkg.platform && <span className="text-[10px] text-slate-500">📱 {pkg.platform}</span>}
                  </div>
                  {pkg.caption && <p className="text-xs text-slate-500 mt-1 truncate">{pkg.caption}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600">
                    {pkg.content_type && <span>{pkg.content_type}</span>}
                    {pkg.product && <span>📦 {pkg.product}</span>}
                    {pkg.assigned_bot && <span>🤖 {pkg.assigned_bot}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
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
          ))
        )}
      </div>
    </div>
  );
}
