import { useState, useEffect } from 'react';
import { Building2, Package, MessageSquare, Plus, Trash2, RefreshCw, Loader2, ExternalLink, Lightbulb } from 'lucide-react';

const API = 'https://harvests-cloud-api.inkflowapp.workers.dev';
const CATEGORIES = ['Cartridge', 'Tattoo Machine', 'Transfer Paper', 'Printer', 'Power Supply', 'Pedal', 'Grip', 'Ink', 'Aftercare', 'Packaging', 'Other'];
const SOURCES = ['website', 'instagram', 'amazon', 'tattoo_expo', 'forum', 'manual'];

export default function CompetitorIntelligence() {
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [tab, setTab] = useState<'brands' | 'products'>('brands');
  const [search, setSearch] = useState('');

  const loadSummary = async () => {
    setLoading(true);
    try {
      const r = await fetch(API + '/api/competitor/summary');
      if (r.ok) { const d = await r.json(); setBrands(d.brands || []); setCounts(d.counts || {}); }
    } catch {}
    setLoading(false);
  };

  const loadProducts = async (brandId?: string) => {
    try {
      const url = brandId ? API + '/api/competitor/products?brand_id=' + brandId : API + '/api/competitor/products';
      const r = await fetch(url);
      if (r.ok) { const d = await r.json(); setProducts(d.products || []); }
    } catch {}
  };

  useEffect(() => { loadSummary(); }, []);

  const createBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const body: any = {};
    fd.forEach((v, k) => body[k] = v);
    try {
      const r = await fetch(API + '/api/competitor/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { setShowBrandForm(false); loadSummary(); }
    } catch {}
  };

  const deleteBrand = async (id: string) => {
    if (!confirm('Delete this brand and all its products?')) return;
    try { await fetch(API + '/api/competitor/brands/' + id, { method: 'DELETE' }); loadSummary(); } catch {}
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const body: any = {};
    fd.forEach((v, k) => body[k] = v);
    body.brand_id = selectedBrand;
    try {
      const r = await fetch(API + '/api/competitor/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { setShowProductForm(false); loadProducts(selectedBrand || undefined); }
    } catch {}
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try { await fetch(API + '/api/competitor/products/' + id, { method: 'DELETE' }); loadProducts(selectedBrand || undefined); } catch {}
  };

  const selectBrand = (id: string) => {
    setSelectedBrand(id);
    setTab('products');
    loadProducts(id);
  };

  const filteredProducts = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">🔍 Competitor Intelligence</h2>
          <p className="text-sm text-slate-400 mt-1">竞品产品情报 — 覆盖 Cartridge / 纹身笔 / 转印纸 / 打印机 / 配件全品类</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSummary} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300">
            <RefreshCw className="w-4 h-4" />
          </button>
          {tab === 'brands' && (
            <button onClick={() => setShowBrandForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> 添加竞品
            </button>
          )}
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('brands')}
          className={`px-4 py-1.5 text-xs rounded-md font-semibold ${tab === 'brands' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <Building2 className="w-3.5 h-3.5 inline mr-1" /> 竞品品牌
        </button>
        <button onClick={() => setTab('products')}
          className={`px-4 py-1.5 text-xs rounded-md font-semibold ${tab === 'products' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <Package className="w-3.5 h-3.5 inline mr-1" /> 产品记录
          {selectedBrand && <span className="ml-1 text-[10px] opacity-70">({brands.find(b => b.id === selectedBrand)?.name})</span>}
        </button>
      </div>

      {tab === 'brands' && (
        <>
          {showBrandForm && (
            <form onSubmit={createBrand} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">🏢 添加竞品品牌</h3>
              <div className="grid grid-cols-2 gap-3">
                <input name="name" required placeholder="品牌名 (e.g. Kwadron)..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <input name="website" placeholder="官网..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <select name="category" className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none">
                  <option value="">全品类</option>
                  <option value="Cartridge">Cartridge</option>
                  <option value="Machine">纹身机</option>
                  <option value="Supply">耗材</option>
                  <option value="Accessory">配件</option>
                </select>
                <input name="notes" placeholder="备注..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold">保存</button>
                <button type="button" onClick={() => setShowBrandForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">取消</button>
              </div>
            </form>
          )}

          {/* Brand cards */}
          {loading ? (
            <div className="text-center py-8 text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline" /> 加载中...</div>
          ) : brands.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无竞品品牌</p>
              <p className="text-xs text-slate-600 mt-1">点击「添加竞品」开始</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {brands.map(b => (
                <div key={b.id}
                  onClick={() => selectBrand(b.id)}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 cursor-pointer hover:border-rose-500/30 hover:bg-slate-800/80 transition-all">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-200">{b.name}</h3>
                    <button onClick={(e) => { e.stopPropagation(); deleteBrand(b.id); }}
                      className="p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {b.category && <span className="text-[10px] text-slate-500 mt-1 block">{b.category}</span>}
                  {b.website && <a href={b.website} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
                    <ExternalLink className="w-2.5 h-2.5" /> {b.website.replace(/https?:\/\//, '').slice(0, 30)}
                  </a>}
                  <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                    <span>📦 {counts[b.id]?.products || 0} 产品</span>
                    <span>💬 {counts[b.id]?.mentions || 0} 提及</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'products' && (
        <>
          {/* Back button + search */}
          <div className="flex items-center gap-3">
            <button onClick={() => { setTab('brands'); setSelectedBrand(null); setProducts([]); }}
              className="text-xs text-slate-400 hover:text-slate-200">← 返回品牌</button>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索产品..." className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none" />
            {selectedBrand && (
              <button onClick={() => setShowProductForm(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold">
                <Plus className="w-3 h-3" /> 添加产品
              </button>
            )}
          </div>

          {showProductForm && (
            <form onSubmit={createProduct} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">📦 添加竞品产品</h3>
              <div className="grid grid-cols-2 gap-3">
                <input name="name" required placeholder="产品名..." className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <select name="category" className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <input name="subcategory" placeholder="子类别..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <input name="price" placeholder="价格..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <input name="target_user" placeholder="目标用户..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <input name="launch_date" placeholder="发布日期..." className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <input name="source_url" placeholder="来源链接..." className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none" />
                <textarea name="features" placeholder="功能特点（逗号分隔）..." rows={2} className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none resize-none" />
                <textarea name="packaging" placeholder="包装设计..." rows={2} className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none resize-none" />
                <textarea name="claims" placeholder="卖点/宣称..." rows={2} className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none resize-none" />
                <textarea name="notes" placeholder="备注..." rows={2} className="col-span-2 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 outline-none resize-none" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold">保存</button>
                <button type="button" onClick={() => setShowProductForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">取消</button>
              </div>
            </form>
          )}

          {/* Product list */}
          <div className="space-y-2">
            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">暂无产品记录</p>
                <p className="text-xs text-slate-600 mt-1">选择竞品品牌后添加产品</p>
              </div>
            )}
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{p.name}</span>
                      {p.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{p.category}</span>}
                      {p.price && <span className="text-xs text-emerald-400">${p.price}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                      {p.brand_name && <span>🏢 {p.brand_name}</span>}
                      {p.subcategory && <span>{p.subcategory}</span>}
                      {p.target_user && <span>🎯 {p.target_user}</span>}
                      {p.launch_date && <span>📅 {p.launch_date}</span>}
                    </div>
                    {p.features && <p className="text-xs text-slate-500 mt-1 truncate">✨ {p.features}</p>}
                    {p.packaging && <p className="text-xs text-slate-500 mt-0.5 truncate">📦 {p.packaging}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    {p.source_url && (
                      <a href={p.source_url} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-blue-900/30 text-slate-500 hover:text-blue-400">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
