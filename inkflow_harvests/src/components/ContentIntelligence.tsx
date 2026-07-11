import { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, RefreshCw, Loader2, Sparkles, Plus, Trash2, ExternalLink, Target, BarChart3, MessageSquare, DollarSign, Package, Zap } from 'lucide-react';

const API = 'https://harvests-cloud-api.inkflowapp.workers.dev';

const SOURCE_META: Record<string, { label: string, icon: any, color: string }> = {
  product_knowledge: { label: '产品知识库', icon: Package, color: '#6366f1' },
  competitor_analysis: { label: '竞品分析', icon: TrendingUp, color: '#f59e0b' },
  artist_insight: { label: 'Artist Analyzer', icon: Target, color: '#22c55e' },
  customer_feedback: { label: '客户反馈', icon: MessageSquare, color: '#3b82f6' },
  sales_data: { label: '销售数据', icon: DollarSign, color: '#a855f7' },
  new_product: { label: '新品', icon: Zap, color: '#ec4899' },
  social_trend: { label: '社媒趋势', icon: BarChart3, color: '#14b8a6' },
  inventory: { label: '库存', icon: Package, color: '#f97316' },
  manual: { label: '人工输入', icon: Plus, color: '#64748b' },
};

export default function ContentIntelligence() {
  const [signals, setSignals] = useState<any[]>([]);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState<'opportunities' | 'briefs'>('opportunities');
  const [filterSource, setFilterSource] = useState('all');

  const loadSignals = async () => {
    setLoading(true);
    try {
      const url = filterSource === 'all' ? API + '/api/content/signals' : API + '/api/content/signals?source=' + filterSource;
      const r = await fetch(url);
      if (r.ok) { const d = await r.json(); setSignals(d.signals || []); }
    } catch {}
    setLoading(false);
  };

  const loadBriefs = async () => {
    try {
      const r = await fetch(API + '/api/content/briefs');
      if (r.ok) { const d = await r.json(); setBriefs(d.briefs || []); }
    } catch {}
  };

  useEffect(() => { loadSignals(); loadBriefs(); }, []);

  const scanOpportunities = async () => {
    setScanning(true);
    try {
      const r = await fetch(API + '/api/content/scan-opportunities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      if (r.ok) { loadSignals(); }
    } catch {}
    setScanning(false);
  };

  const deleteSignal = async (id: string) => {
    try { await fetch(API + '/api/content/signals/' + id, { method: 'DELETE' }); loadSignals(); } catch {}
  };

  const createBriefFromSignal = async (sig: any) => {
    try {
      await fetch(API + '/api/content/briefs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_id: sig.id, title: sig.signal_text,
          source: sig.source, product: sig.related_product || '',
          score: sig.score, format: 'Reel', platform: 'Instagram'
        })
      });
      loadBriefs();
    } catch {}
  };

  const sourceFilterButtons = ['all', ...Object.keys(SOURCE_META)];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">💡 Content Intelligence</h2>
          <p className="text-sm text-slate-400 mt-1">AI Content Opportunity Engine — 发现机会 → 打分 → 生成内容方案</p>
        </div>
        <div className="flex gap-2">
          <button onClick={scanOpportunities} disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI 扫描市场
          </button>
          <button onClick={loadSignals} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('opportunities')}
          className={`px-4 py-1.5 text-xs rounded-md font-semibold ${tab === 'opportunities' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          🔥 机会发现
        </button>
        <button onClick={() => setTab('briefs')}
          className={`px-4 py-1.5 text-xs rounded-md font-semibold ${tab === 'briefs' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          📋 内容方案 ({briefs.length})
        </button>
      </div>

      {/* OPPORTUNITIES TAB */}
      {tab === 'opportunities' && (
        <>
          {/* Source filter pills */}
          <div className="flex gap-1 flex-wrap">
            {sourceFilterButtons.map(src => (
              <button key={src} onClick={() => setFilterSource(src)}
                className={`px-2.5 py-1 text-[10px] rounded-lg font-medium ${filterSource === src ? 'bg-rose-600/30 text-rose-400' : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'}`}>
                {src === 'all' ? '全部' : (SOURCE_META[src]?.label || src)}
              </button>
            ))}
          </div>

          {/* Source distribution */}
          {signals.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(SOURCE_META).map(([key, meta]) => {
                const count = signals.filter(s => s.source === key).length;
                if (count === 0) return null;
                return (
                  <div key={key} className="bg-slate-800/30 border border-slate-700/50 rounded-lg px-3 py-2"
                    style={{ borderLeft: '3px solid ' + meta.color }}>
                    <span className="text-[10px] text-slate-400">{meta.label}</span>
                    <span className="block text-lg font-bold text-slate-200">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Signal cards */}
          {loading ? (
            <div className="text-center py-8 text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline" /> 加载中...</div>
          ) : signals.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无内容机会</p>
              <p className="text-xs text-slate-600 mt-1">点击「AI 扫描市场」发现内容机会</p>
            </div>
          ) : (
            <div className="space-y-3">
              {signals.map((sig, i) => {
                const meta = SOURCE_META[sig.source] || { label: sig.source, icon: Lightbulb, color: '#64748b' };
                const scoreColor = sig.score >= 85 ? '#22c55e' : sig.score >= 70 ? '#f59e0b' : '#64748b';
                return (
                  <div key={sig.id || i}
                    className="bg-slate-800/30 border border-slate-700/50 rounded-xl px-4 py-3 hover:bg-slate-800/50 transition-all">
                    <div className="flex items-start gap-3">
                      {/* Score badge */}
                      <div className="flex flex-col items-center min-w-[40px]">
                        <span className="text-lg font-bold" style={{ color: scoreColor }}>{sig.score}</span>
                        <span className="text-[8px] text-slate-600">得分</span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-200">{sig.signal_text}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                          <span style={{ color: meta.color }}>{meta.label}</span>
                          {sig.related_product && <span>📦 {sig.related_product}</span>}
                          {sig.audience && <span>🎯 {sig.audience}</span>}
                          {sig.pain_point && <span>⚠️ {sig.pain_point}</span>}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button onClick={() => createBriefFromSignal(sig)}
                          className="p-1.5 rounded hover:bg-emerald-900/30 text-slate-500 hover:text-emerald-400" title="生成内容方案">
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteSignal(sig.id)}
                          className="p-1.5 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400" title="删除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: sig.score + '%', background: scoreColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* BRIEFS TAB */}
      {tab === 'briefs' && (
        <div className="space-y-2">
          {briefs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无内容方案</p>
              <p className="text-xs text-slate-600 mt-1">从机会点击✨生成内容方案</p>
            </div>
          ) : (
            briefs.map((b: any) => (
              <div key={b.id} className="flex items-center gap-3 bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{b.title}</span>
                    {b.score > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: b.score >= 85 ? '#14532d40' : '#713f1240', color: b.score >= 85 ? '#22c55e' : '#f59e0b' }}>
                      {b.score}
                    </span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                    <span>{SOURCE_META[b.source]?.label || b.source}</span>
                    {b.product && <span>📦 {b.product}</span>}
                    {b.format && <span>🎬 {b.format}</span>}
                    {b.platform && <span>📱 {b.platform}</span>}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${b.status === 'draft' ? 'bg-slate-700 text-slate-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                  {b.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
