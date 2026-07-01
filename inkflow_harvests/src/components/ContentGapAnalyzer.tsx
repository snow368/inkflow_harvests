import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Loader2, Sparkles, Copy, ArrowRight, ArrowLeft, X } from 'lucide-react';

const INTENT_COLORS: Record<string, string> = {
  tx: '#ef4444', co: '#f59e0b', na: '#3b82f6', in: '#22c55e',
};
const INTENT_SHORT: Record<string, string> = { tx: 'TX', co: 'CO', na: 'NA', in: 'IN' };
const INTENT_LABELS: Record<string, string> = {
  tx: 'Transactional', co: 'Commercial', na: 'Navigational', in: 'Informational',
};

function classifyIntent(kw: string) {
  const lc = kw.toLowerCase();
  if (['buy', 'purchase', 'order', 'price', 'cost', 'pricing', 'cheap', 'discount', 'coupon', 'free trial', 'demo', 'download', 'subscribe', 'hire', 'rent', 'for sale'].some(p => lc.includes(p))) return 'tx';
  if (['login', 'sign in', 'log in', 'dashboard', 'homepage', 'official', 'portal'].some(p => lc.includes(p))) return 'na';
  if (['best', 'top', 'review', 'vs', 'versus', 'comparison', 'compare', 'alternative', 'pros and cons', 'rating', 'which', 'should', 'worth', 'better', 'guide'].some(p => lc.includes(p))) return 'co';
  return 'in';
}

const SAMPLE_MINE = `seo audit tool
keyword research tool
rank tracker software
backlink checker
email marketing software
landing page builder
ai writing tool
social media scheduler
content marketing strategy
analytics platform`;

const SAMPLE_COMPETITOR = `seo audit tool
keyword research tool
rank tracker software
backlink analyzer
email automation tool
landing page creator
ai content generator
social media management tool
content calendar app
analytics dashboard
site speed tester
schema markup generator
competitor analysis tool
serp features tracker`;

export default function ContentGapAnalyzer() {
  const [myKws, setMyKws] = useState('');
  const [compKws, setCompKws] = useState('');
  const [result, setResult] = useState<{
    overlap: string[]; myOnly: string[]; compOnly: string[];
    myIntents: Record<string, number>; compIntents: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'overlap' | 'my-only' | 'gap'>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const analyze = () => {
    if (!myKws.trim() || !compKws.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const mine = new Set<string>(myKws.split('\n').map(l => l.split(',')[0].trim().toLowerCase()).filter(Boolean));
      const comp = new Set<string>(compKws.split('\n').map(l => l.split(',')[0].trim().toLowerCase()).filter(Boolean));
      const overlap = [...mine].filter(k => comp.has(k));
      const myOnly = [...mine].filter(k => !comp.has(k));
      const compOnly = [...comp].filter(k => !mine.has(k));
      const myIntents: Record<string, number> = { tx: 0, co: 0, na: 0, in: 0 };
      const compIntents: Record<string, number> = { tx: 0, co: 0, na: 0, in: 0 };
      myOnly.forEach(k => myIntents[classifyIntent(k)]++);
      compOnly.forEach(k => compIntents[classifyIntent(k)]++);
      setResult({ overlap, myOnly, compOnly, myIntents, compIntents });
      setLoading(false);
    }, 80);
  };

  const copyResult = () => {
    if (!result) return;
    let text = `# Content Gap Analysis\n\n`;
    text += `## Overlap (${result.overlap.length})\n${result.overlap.join('\n')}\n\n`;
    text += `## My Keywords Only (${result.myOnly.length})\n${result.myOnly.join('\n')}\n\n`;
    text += `## Gap — Competitor Has, I Don't (${result.compOnly.length})\n${result.compOnly.join('\n')}\n`;
    navigator.clipboard.writeText(text);
  };

  const hasGscData = false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">📊 内容缺口分析</h2>
          <p className="text-xs text-slate-400 mt-0.5">Compare your keyword coverage against competitors — find gaps & opportunities</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3">
          <label className="text-xs text-slate-500 font-medium mb-2 block">My Keywords (one per line)</label>
          <textarea
            value={myKws}
            onChange={e => setMyKws(e.target.value)}
            placeholder="Paste your keywords..."
            className="w-full h-28 bg-slate-900 text-slate-100 text-xs font-mono rounded-lg p-2.5 border border-slate-700 resize-y focus:outline-none focus:border-rose-500/50 placeholder:text-slate-700"
          />
          <button onClick={() => setMyKws(SAMPLE_MINE)} className="text-[10px] text-slate-500 hover:text-slate-300 mt-1">Load Sample</button>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3">
          <label className="text-xs text-slate-500 font-medium mb-2 block">Competitor Keywords (one per line)</label>
          <textarea
            value={compKws}
            onChange={e => setCompKws(e.target.value)}
            placeholder="Paste competitor keywords..."
            className="w-full h-28 bg-slate-900 text-slate-100 text-xs font-mono rounded-lg p-2.5 border border-slate-700 resize-y focus:outline-none focus:border-rose-500/50 placeholder:text-slate-700"
          />
          <button onClick={() => setCompKws(SAMPLE_COMPETITOR)} className="text-[10px] text-slate-500 hover:text-slate-300 mt-1">Load Sample</button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={analyze} disabled={loading || !myKws.trim() || !compKws.trim()}
          className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg flex items-center gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Analyze Gap
        </button>
      </div>

      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{result.overlap.length}</div>
              <div className="text-xs text-slate-400 mt-1">Overlap</div>
              <div className="text-[10px] text-emerald-600/70">We both rank for these</div>
            </div>
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{result.myOnly.length}</div>
              <div className="text-xs text-slate-400 mt-1">My Unique</div>
              <div className="text-[10px] text-blue-600/70">Only I have these</div>
            </div>
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{result.compOnly.length}</div>
              <div className="text-xs text-slate-400 mt-1">Gap</div>
              <div className="text-[10px] text-amber-600/70">Competitor has, I don't</div>
            </div>
          </div>

          {/* Intent comparison */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Intent Distribution Gap</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-blue-400 font-medium mb-2">My Unique Keywords</p>
                <div className="space-y-1.5">
                  {['tx', 'co', 'na', 'in'].map(intent => {
                    const count = result.myIntents[intent] || 0;
                    const total = result.myOnly.length || 1;
                    const pct = (count / total) * 100;
                    return (
                      <div key={intent} className="flex items-center gap-2 text-[10px]">
                        <span className="w-16 text-slate-400">{INTENT_LABELS[intent]}</span>
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: INTENT_COLORS[intent] }} />
                        </div>
                        <span className="w-10 text-right text-slate-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-amber-400 font-medium mb-2">Gap (Comp Has, I Don't)</p>
                <div className="space-y-1.5">
                  {['tx', 'co', 'na', 'in'].map(intent => {
                    const count = result.compIntents[intent] || 0;
                    const total = result.compOnly.length || 1;
                    const pct = (count / total) * 100;
                    return (
                      <div key={intent} className="flex items-center gap-2 text-[10px]">
                        <span className="w-16 text-slate-400">{INTENT_LABELS[intent]}</span>
                        <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: INTENT_COLORS[intent] }} />
                        </div>
                        <span className="w-10 text-right text-slate-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Gap keywords list */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {filter === 'all' ? `All Results (${result.overlap.length + result.myOnly.length + result.compOnly.length})` :
                 filter === 'overlap' ? `Overlap (${result.overlap.length})` :
                 filter === 'my-only' ? `My Unique (${result.myOnly.length})` :
                 `Gap — Priority Targets (${result.compOnly.length})`}
              </h3>
              <div className="flex gap-1">
                {(['all', 'overlap', 'my-only', 'gap'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={cn('px-2 py-0.5 text-[10px] rounded transition-colors',
                      filter === f ? 'bg-rose-600/30 text-rose-400' : 'text-slate-500 hover:text-slate-300')}>
                    {f === 'all' ? 'All' : f === 'overlap' ? 'Overlap' : f === 'my-only' ? 'Mine' : 'Gap'}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {/* Overlap */}
              {(filter === 'all' || filter === 'overlap') && result.overlap.map((kw, i) => (
                <div key={`o-${i}`} className="flex items-center gap-2 px-2 py-1 rounded bg-emerald-900/10 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-300">{kw}</span>
                  <span className="text-[9px] text-emerald-600/70 ml-auto">Both</span>
                </div>
              ))}
              {/* My only */}
              {(filter === 'all' || filter === 'my-only') && result.myOnly.map((kw, i) => (
                <div key={`m-${i}`} className="flex items-center gap-2 px-2 py-1 rounded bg-blue-900/10 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-slate-300">{kw}</span>
                  <span className="text-[9px] text-blue-600/70 ml-auto">Mine</span>
                </div>
              ))}
              {/* Gap (comp only) */}
              {(filter === 'all' || filter === 'gap') && result.compOnly.map((kw, i) => (
                <div key={`c-${i}`} className="flex items-center gap-2 px-2 py-1 rounded bg-amber-900/10 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-300">{kw}</span>
                    <span className="ml-1.5 text-[9px] px-1 rounded" style={{ background: INTENT_COLORS[classifyIntent(kw)] + '30', color: INTENT_COLORS[classifyIntent(kw)] }}>
                      {INTENT_SHORT[classifyIntent(kw)]}
                    </span>
                  </div>
                  <span className="text-[9px] text-amber-600/70 shrink-0">Gap</span>
                </div>
              ))}
              {result.compOnly.length === 0 && (filter === 'all' || filter === 'gap') && (
                <div className="text-xs text-slate-500 text-center py-4">🎉 No gaps found! You cover everything your competitor does.</div>
              )}
            </div>
          </div>

          {/* Priority recommendations */}
          {result.compOnly.length > 0 && (
            <div className="bg-amber-900/10 border border-amber-700/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">🎯 Priority Recommendations</h3>
              <div className="text-xs text-slate-400 space-y-1.5">
                <p>• Create content for the <strong className="text-amber-300">{result.compOnly.length} gap keywords</strong> your competitor ranks for</p>
                <p>• Focus on <strong className="text-slate-200">Commercial & Transactional</strong> gaps — these drive conversions</p>
                <p>• Use the <strong className="text-slate-200">🏷️ Topical Authority</strong> tool to cluster these gap keywords into content hubs</p>
              </div>
              <button onClick={copyResult} className="mt-3 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs rounded-lg flex items-center gap-1.5">
                <Copy size={11} /> Copy Full Report
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
