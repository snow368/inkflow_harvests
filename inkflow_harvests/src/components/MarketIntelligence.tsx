import { useState, useEffect } from 'react';
import { BarChart3, Globe, TrendingUp, Plus, Trash2, RefreshCw, Loader2, Lightbulb, Target } from 'lucide-react';

const API = '';
const COUNTRIES = ['USA','Germany','UK','France','Italy','Spain','Canada','Australia','Japan','Brazil'];

export default function MarketIntelligence() {
  const [categories, setCategories] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selCat, setSelCat] = useState('cartridge');
  const [selCountry, setSelCountry] = useState('USA');
  const [tab, setTab] = useState<'overview' | 'scores' | 'opportunities'>('overview');
  const [showScoreForm, setShowScoreForm] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cr, sr, rr, mr] = await Promise.all([
        fetch(API + '/api/market/categories'),
        fetch(API + `/api/market/scores?category=${selCat}&country=${selCountry}`),
        fetch(API + '/api/market/reports'),
        fetch(API + '/api/market/summary'),
      ]);
      if (cr.ok) { const d = await cr.json(); setCategories(d.categories || []); }
      if (sr.ok) { const d = await sr.json(); setScores(d.scores || []); }
      if (rr.ok) { const d = await rr.json(); setReports(d.reports || []); }
      if (mr.ok) { const d = await mr.json(); setSummary(d.summary || []); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [selCat, selCountry]);

  const createScore = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const body: any = {};
    fd.forEach((v, k) => body[k] = v);
    body.category = selCat;
    body.country = selCountry;
    try {
      const r = await fetch(API + '/api/market/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { setShowScoreForm(false); loadAll(); }
    } catch {}
  };

  const deleteScore = async (id: number) => {
    if (!confirm('Delete this score?')) return;
    try { await fetch(API + '/api/market/scores/' + id, { method: 'DELETE' }); loadAll(); } catch {}
  };

  const createOpportunity = async () => {
    try {
      const r = await fetch(API + '/api/market/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selCat, country: selCountry, report: 'Manual opportunity entry', ai_summary: 'Analyze market gap in ' + selCat + ' for ' + selCountry, opportunity: '' })
      });
      if (r.ok) loadAll();
    } catch {}
  };

  const brandColors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#a855f7','#ec4899','#14b8a6'];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">📊 Market Intelligence</h2>
          <p className="text-sm text-slate-400 mt-1">市场份额分析 — 按品类 × 国家 × 品牌</p>
        </div>
        <button onClick={loadAll} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Category + Country selector */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 flex-wrap">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelCat(cat.id)}
              className={`px-3 py-1.5 text-xs rounded-md font-semibold ${selCat === cat.id ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {cat.name}
            </button>
          ))}
        </div>
        <select value={selCountry} onChange={e => setSelCountry(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none">
          {COUNTRIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        {(['overview','scores','opportunities'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs rounded-md font-semibold ${tab === t ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t === 'overview' ? '📊 概览' : t === 'scores' ? '🏆 品牌排名' : '💡 机会发现'}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline" /> 加载中...</div>
          ) : (
            summary.filter(s => s.id === selCat).map(cat => (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">{cat.name} — 各国市场</h3>
                {cat.countries?.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {cat.countries.map((c: any) => (
                      <div key={c.country} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-slate-200">{c.country}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>🏷 {c.brands} 个品牌</span>
                          <span>📊 均分 {Number(c.avg_score).toFixed(1)}</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: Math.min(100, c.avg_score) + '%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">暂无数据</p>
                    <p className="text-xs text-slate-600 mt-1">切换到「品牌排名」选项卡添加品牌得分</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SCORES TAB */}
      {tab === 'scores' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              {selCat} / {selCountry} — 品牌排名
            </h3>
            <button onClick={() => setShowScoreForm(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold">
              <Plus className="w-3 h-3" /> 添加得分
            </button>
          </div>

          {/* Bar chart visualization */}
          {scores.length > 0 && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
              {scores.map((s, i) => (
                <div key={s.id || i} className="flex items-center gap-3 mb-2 last:mb-0">
                  <span className="w-5 text-xs font-bold text-slate-500 text-right">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-slate-200">{s.brand}</span>
                      <span className="text-[10px] text-slate-400">{Number(s.score).toFixed(0)}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: s.score + '%', background: brandColors[i % brandColors.length] }} />
                    </div>
                  </div>
                  <button onClick={() => deleteScore(s.id)} className="p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Sub-scores breakdown */}
          {scores.length > 0 && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400">
                    <th className="text-left p-2">品牌</th>
                    <th className="text-center p-2">总分</th>
                    <th className="text-center p-2">Google</th>
                    <th className="text-center p-2">Amazon</th>
                    <th className="text-center p-2">社媒</th>
                    <th className="text-center p-2">艺术家</th>
                    <th className="text-center p-2">渠道</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s, i) => (
                    <tr key={s.id || i} className="border-t border-slate-700/30 text-slate-300">
                      <td className="p-2 font-medium">{s.brand}</td>
                      <td className="p-2 text-center font-bold text-emerald-400">{Number(s.score).toFixed(0)}</td>
                      <td className="p-2 text-center">{Number(s.google_score).toFixed(0)}</td>
                      <td className="p-2 text-center">{Number(s.amazon_score).toFixed(0)}</td>
                      <td className="p-2 text-center">{Number(s.social_score).toFixed(0)}</td>
                      <td className="p-2 text-center">{Number(s.artist_score).toFixed(0)}</td>
                      <td className="p-2 text-center">{Number(s.dist_score).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {scores.length === 0 && !loading && (
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无品牌得分</p>
              <p className="text-xs text-slate-600 mt-1">点击「添加得分」录入品牌市场数据</p>
            </div>
          )}

          {showScoreForm && (
            <form onSubmit={createScore} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">🏆 添加品牌得分 — {selCat} / {selCountry}</h3>
              <div className="grid grid-cols-3 gap-3">
                <input name="brand" required placeholder="品牌名..." className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none" />
                <input name="score" type="number" placeholder="总分 (0-100)" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none" />
                <input name="rank" type="number" placeholder="排名" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none" />
                <input name="google_score" type="number" placeholder="Google 搜索分" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none" />
                <input name="amazon_score" type="number" placeholder="Amazon 分" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none" />
                <input name="social_score" type="number" placeholder="社媒影响力分" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none" />
                <input name="artist_score" type="number" placeholder="艺术家使用分" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none" />
                <input name="dist_score" type="number" placeholder="渠道覆盖分" className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 outline-none" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold">保存</button>
                <button type="button" onClick={() => setShowScoreForm(false)} className="px-4 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs">取消</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* OPPORTUNITIES TAB */}
      {tab === 'opportunities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">💡 市场机会 — {selCat} / {selCountry}</h3>
            <button onClick={createOpportunity}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold">
              <Lightbulb className="w-3 h-3" /> 记录机会
            </button>
          </div>

          {/* Auto opportunity detection */}
          {scores.length > 0 && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-slate-300 mb-3">🤖 AI 机会分析</h4>
              {(function() {
                const top = scores[0]?.score || 0;
                const gap = 100 - top;
                if (gap > 20) {
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">市场空缺指数:</span>
                        <span className="text-lg font-bold" style={{ color: gap > 50 ? '#22c55e' : '#f59e0b' }}>{gap}%</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {gap > 50 ? '🟢 高潜力市场，竞争较低，适合进入' : '🟡 中等竞争，需要差异化策略'}
                      </p>
                      <p className="text-xs text-slate-500">前 3 品牌平均分: {Number(scores.slice(0,3).reduce((s: number, x: any) => s + x.score, 0) / Math.min(3, scores.length)).toFixed(0)}</p>
                    </div>
                  );
                }
                return <p className="text-xs text-slate-500">市场已较饱和，建议细分品类寻找机会</p>;
              })()}
            </div>
          )}

          {/* Reports list */}
          <h4 className="text-xs font-semibold text-slate-300">📋 市场报告</h4>
          {reports.filter(r => r.category === selCat).length === 0 ? (
            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无市场报告</p>
            </div>
          ) : (
            reports.filter(r => r.category === selCat).map(r => (
              <div key={r.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200">{r.country || 'Global'}</span>
                  {r.ai_summary && <span className="text-[10px] text-slate-400">{r.ai_summary}</span>}
                </div>
                {r.report && <p className="text-xs text-slate-500 mt-1">{r.report}</p>}
                {r.opportunity && (
                  <div className="mt-1 px-2 py-1 bg-emerald-900/20 border border-emerald-700/30 rounded text-[10px] text-emerald-400">
                    💡 {r.opportunity}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
