import React, { useState, useMemo, useRef } from 'react';
import { cn } from '../lib/utils';
import { Loader2, Sparkles, Download, Copy, ChevronDown, ChevronUp, Upload, Database, BarChart3 } from 'lucide-react';

// ─── SYNONYM TABLE ──────────────────────────────────────────────
const SYNONYM_MAP: Record<string, string> = {
  seo: 'seo', 'search engine optimization': 'seo', 'search engine': 'seo',
  content: 'content', blogging: 'content', blog: 'content', article: 'content', writing: 'content', copywriting: 'content',
  'social media': 'social', social: 'social',
  email: 'email', newsletter: 'email', mail: 'email',
  ppc: 'ppc', 'pay per click': 'ppc', adwords: 'ppc', 'google ads': 'ppc', advertising: 'ppc', 'paid ads': 'ppc',
  'link building': 'linkbuilding', backlink: 'linkbuilding', backlinks: 'linkbuilding',
  analytics: 'analytics', analysis: 'analytics', reporting: 'analytics',
  conversion: 'conversion', cro: 'conversion',
  keyword: 'keyword', keywords: 'keyword',
  traffic: 'traffic', visitors: 'traffic',
  rank: 'rank', ranking: 'rank',
  'landing page': 'landingpage', landing: 'landingpage',
  funnel: 'funnel', 'sales funnel': 'funnel',
  automation: 'automation', automate: 'automation',
  lead: 'lead', leads: 'lead', 'lead generation': 'lead',
  brand: 'brand', branding: 'brand', awareness: 'brand',
  software: 'tool', platform: 'tool', app: 'tool', application: 'tool', tool: 'tool', tools: 'tool',
  video: 'video', youtube: 'video',
  design: 'design',
  mobile: 'mobile', responsive: 'mobile',
  local: 'local', 'local seo': 'local', map: 'local', maps: 'local',
  ecommerce: 'ecom', ecom: 'ecom', shop: 'ecom', store: 'ecom',
  growth: 'growth', scale: 'growth', scaling: 'growth',
  strategy: 'strategy', strategies: 'strategy', plan: 'strategy',
  schedule: 'schedule', scheduling: 'schedule', scheduler: 'schedule',
  campaign: 'campaign', campaigns: 'campaign',
  organic: 'organic', 'organic search': 'organic',
  roi: 'roi', 'return on investment': 'roi',
  b2b: 'b2b', enterprise: 'b2b',
  b2c: 'b2c', consumer: 'b2c',
  agency: 'agency', agencies: 'agency', consultant: 'agency',
  ai: 'ai', 'artificial intelligence': 'ai', 'machine learning': 'ai', gpt: 'ai', chatgpt: 'ai',
  schema: 'schema', 'structured data': 'schema',
  ctr: 'ctr', 'click through rate': 'ctr',
};

const GENERIC_MODIFIERS = new Set([
  'best', 'top', 'buy', 'cheap', 'free', 'guide', 'alternative', 'price', 'pricing',
  'beginner', 'review', 'vs', 'versus', 'pro', 'premium', 'ultimate',
  'comparison', 'compare', 'cost', 'affordable', 'discount', 'coupon', 'tutorial',
  'how to', 'what is', 'why', 'tips', 'examples', 'ideas', 'online',
  'professional', 'expert', 'advanced', 'easy', 'simple', 'quick', 'fast',
  'complete', 'essential', 'effective', 'powerful',
]);

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'it', 'its', 'are',
  'was', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'can', 'could', 'should', 'may', 'might', 'shall', 'not', 'no', 'nor',
  'so', 'if', 'than', 'that', 'this', 'these', 'those', 'as', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
  'too', 'very', 'just', 'also', 'get', 'got', 'use', 'used', 'using', 'make', 'made',
  'taking', 'need', 'needs', 'help', 'helps', 'work', 'works', 'working',
]);

const INTENT_COLORS: Record<string, string> = {
  tx: '#ef4444', co: '#f59e0b', na: '#3b82f6', in: '#22c55e',
};
const INTENT_LABELS: Record<string, string> = {
  tx: 'Transactional', co: 'Commercial', na: 'Navigational', in: 'Informational',
};
const INTENT_SHORT: Record<string, string> = { tx: 'TX', co: 'CO', na: 'NA', in: 'IN' };
const AUTH_COLORS: Record<string, string> = {
  Hub: 'bg-purple-600', Strong: 'bg-blue-600', Developing: 'bg-amber-600', Thin: 'bg-slate-500',
};

function normalizeKeyword(kw: string) {
  let w = kw.toLowerCase().trim();
  w = w.replace(/[^\w\s,]/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = w.split(',').map(s => s.trim());
  const term = parts[0];
  const volume = parts.length > 1 ? parseInt(parts[1].replace(/[^0-9]/g, '')) || 0 : 0;
  let words = term.replace(/[''-]/g, ' ').split(/\s+/).filter((x: string) => x.length > 0);
  words = words.filter((w: string) => !STOP_WORDS.has(w));
  words = words.map((w: string) => {
    if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) w = w.slice(0, -1);
    if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
    if (w.endsWith('ly') && w.length > 4) w = w.slice(0, -2);
    if (w.endsWith('er') && w.length > 4) w = w.slice(0, -2);
    return w;
  });
  return { term: words.join(' '), words, volume, raw: kw.trim() };
}

function getConcepts(words: string[]) {
  const concepts = new Set<string>();
  const joined = words.join(' ');
  for (const [phrase, concept] of Object.entries(SYNONYM_MAP)) {
    if (phrase.includes(' ') && joined.includes(phrase)) concepts.add(concept);
  }
  for (const w of words) {
    if (GENERIC_MODIFIERS.has(w)) continue;
    const mapped = SYNONYM_MAP[w] || w;
    if (!STOP_WORDS.has(mapped) && mapped.length > 1) concepts.add(mapped);
  }
  return concepts;
}

function classifyIntent(kw: string) {
  const lc = kw.toLowerCase();
  if (['buy', 'purchase', 'order', 'price', 'cost', 'pricing', 'cheap', 'discount', 'coupon', 'free trial', 'demo', 'download', 'subscribe', 'hire', 'rent', 'for sale'].some(p => lc.includes(p))) return 'tx';
  if (['login', 'sign in', 'log in', 'dashboard', 'homepage', 'official', 'portal'].some(p => lc.includes(p))) return 'na';
  if (['best', 'top', 'review', 'vs', 'versus', 'comparison', 'compare', 'alternative', 'pros and cons', 'rating', 'which', 'should', 'worth', 'better', 'guide'].some(p => lc.includes(p))) return 'co';
  return 'in';
}

interface KeywordData { term: string; words: string[]; volume: number; raw: string; concepts: Set<string>; intent: string; }
interface Cluster { id: number; keywords: KeywordData[]; name: string; intent: string; volume: number; pillar: KeywordData; authorityScore: number; authorityLabel: string; intentsPresent: Record<string, boolean>; interlinkTargets: { clusterId: number; strength: number }[]; isStandalone?: boolean; }

function clusterKeywords(keywords: KeywordData[]): Cluster[] {
  const n = keywords.length;
  if (n === 0) return [];
  if (n === 1) return [{ id: 0, keywords, name: keywords[0].term || 'Single', intent: keywords[0].intent, volume: keywords[0].volume, pillar: keywords[0], authorityScore: 0, authorityLabel: 'Thin', intentsPresent: { [keywords[0].intent]: true }, interlinkTargets: [] }];

  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = Array(n).fill(0);
  const find = (x: number): number => { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; };
  const union = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra === rb) return; if (rank[ra] < rank[rb]) parent[ra] = rb; else if (rank[rb] < rank[ra]) parent[rb] = ra; else { parent[rb] = ra; rank[ra]++; } };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const intersection = [...keywords[i].concepts].filter(c => keywords[j].concepts.has(c));
      const overlap = Math.min(keywords[i].concepts.size, keywords[j].concepts.size) > 0
        ? intersection.length / Math.min(keywords[i].concepts.size, keywords[j].concepts.size) : 0;
      if (overlap >= 0.7) union(i, j);
    }
  }

  const groups: Record<number, KeywordData[]> = {};
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups[root]) groups[root] = [];
    groups[root].push(keywords[i]);
  }

  const clusters = Object.values(groups).map((kws, idx) => {
    const totalVol = kws.reduce((s: number, k: KeywordData) => s + k.volume, 0);
    const allConcepts = new Set<string>();
    kws.forEach(k => k.concepts.forEach(c => allConcepts.add(c)));
    const intentCounts: Record<string, number> = { tx: 0, co: 0, na: 0, in: 0 };
    kws.forEach(k => intentCounts[k.intent]++);
    const dominantIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0][0];
    const intentsPresent = Object.fromEntries(Object.entries(intentCounts).map(([k, v]) => [k, v > 0]));
    const pillar = kws.sort((a, b) => b.volume - a.volume)[0];
    const conceptFreq: Record<string, number> = {};
    kws.forEach(k => k.concepts.forEach(c => { conceptFreq[c] = (conceptFreq[c] || 0) + 1; }));
    const sorted = Object.entries(conceptFreq).sort((a, b) => b[1] - a[1]);
    const topicName = sorted.length > 0 ? sorted.slice(0, 3).map(e => e[0]).join(' + ') : 'General';
    const maxSize = Math.max(...Object.values(groups).map(g => g.length), 1);
    const sizeScore = (kws.length / maxSize) * 40;
    const funnelScore = (Object.values(intentsPresent).filter(Boolean).length / 4) * 35;
    const authScore = Math.round(sizeScore + funnelScore);
    return {
      id: idx, keywords: kws, name: topicName.charAt(0).toUpperCase() + topicName.slice(1),
      intent: dominantIntent, volume: totalVol, pillar, authorityScore: authScore,
      authorityLabel: authScore >= 75 ? 'Hub' : authScore >= 50 ? 'Strong' : authScore >= 25 ? 'Developing' : 'Thin',
      intentsPresent, interlinkTargets: [], isStandalone: false,
    };
  });

  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const shared = [...clusters[i].keywords].filter(k => clusters[j].keywords.some(k2 => [...k2.concepts].some(c => k.concepts.has(c))));
      if (shared.length > 0) clusters[i].interlinkTargets.push({ clusterId: j, strength: shared.length });
    }
  }

  const main: Cluster[] = clusters.filter(c => c.keywords.length > 1);
  const singles = clusters.filter(c => c.keywords.length === 1);
  if (singles.length > 0) {
    const allKws = singles.flatMap(c => c.keywords);
    const totalVol = allKws.reduce((s, k) => s + k.volume, 0);
    const intentCounts: Record<string, number> = { tx: 0, co: 0, na: 0, in: 0 };
    allKws.forEach(k => intentCounts[k.intent]++);
    const dominantIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0][0];
    main.push({
      id: -1, keywords: allKws, name: 'Standalone Keywords',
      intent: dominantIntent, volume: totalVol,
      pillar: allKws.sort((a, b) => b.volume - a.volume)[0],
      authorityScore: 0, authorityLabel: 'Standalone',
      intentsPresent: Object.fromEntries(Object.entries(intentCounts).map(([k, v]) => [k, v > 0])),
      interlinkTargets: [], isStandalone: true,
    });
  }
  return main;
}

const SAMPLE_KEYWORDS = `email marketing software, 8100
email marketing platform, 7200
email automation tool, 5400
newsletter software, 3900
best email marketing software, 9500
seo tools, 5400
keyword research tool, 4500
seo audit tool, 3200
rank tracker software, 2400
backlink checker, 2800
best seo tools, 8200
social media scheduler, 2100
social media management tool, 4800
landing page builder, 3600
landing page creator, 2100
best landing page builders, 4200
ai writing tool, 6100
ai content generator, 4800
chatgpt for marketing, 3500
content marketing strategy, 3200
analytics platform, 3100
lead generation tool, 5200
conversion rate optimization tool, 2900`;

export default function SeoKeywordTool() {
  const [input, setInput] = useState('');
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, vol: 0, gscMatched: 0 });
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set());
  const [gscData, setGscData] = useState<Map<string, {impressions: number; clicks: number; position: number}>>(new Map());
  const [gscFileName, setGscFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── GSC CSV Import ──────────────────────────────────────────
  const handleGscImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGscFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const map = new Map<string, {impressions: number; clicks: number; position: number}>();
      // Detect header
      const header = lines[0].toLowerCase();
      const hasHeader = header.includes('query') || header.includes('impression') || header.includes('keyword');
      const startIdx = hasHeader ? 1 : 0;
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 4) continue;
        const query = parts[0].trim().replace(/^"|"$/g, '').toLowerCase();
        const impressions = parseInt(parts[1].replace(/[^0-9]/g, '')) || 0;
        const clicks = parseInt(parts[2].replace(/[^0-9]/g, '')) || 0;
        const position = parseFloat(parts[4]?.replace(/[^0-9.]/g, '') || '0') || 0;
        if (query && impressions > 0) {
          map.set(query, { impressions, clicks, position });
        }
      }
      setGscData(map);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  };

  // ─── Merge GSC data into keyword analysis ───────────────────
  const enrichWithGsc = (kws: KeywordData[], gsc: Map<string, {impressions: number; clicks: number; position: number}>) => {
    let matched = 0;
    for (const kw of kws) {
      const gscEntry = gsc.get(kw.term.toLowerCase());
      if (gscEntry) {
        (kw as any).gscImpressions = gscEntry.impressions;
        (kw as any).gscClicks = gscEntry.clicks;
        (kw as any).gscPosition = gscEntry.position;
        matched++;
      }
    }
    return matched;
  };

  const toggleExpand = (id: number) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runAnalysis = () => {
    if (!input.trim()) return;
    setLoading(true);
    setTimeout(() => {
      try {
        const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 1);
        const kws = lines.map(line => {
          const n = normalizeKeyword(line);
          return { ...n, concepts: getConcepts(n.words), intent: classifyIntent(n.term) };
        }).filter(k => k.term.length > 0);
        const matched = gscData.size > 0 ? enrichWithGsc(kws, gscData) : 0;
        setStats({ total: kws.length, vol: kws.reduce((s, k) => s + k.volume, 0), gscMatched: matched });
        setClusters(clusterKeywords(kws));
      } catch (e) { console.error(e); }
      setLoading(false);
    }, 100);
  };

  const gscHeaders = stats.gscMatched > 0 ? '|Impressions|Clicks|Position|' : '';
  const gscCols = stats.gscMatched > 0 ? '|----------|------|--------|' : '';
  const generateMd = () => {
    if (!clusters) return '';
    let md = '# Topical Authority Analysis\n\n| Cluster | Authority | Intent | Pillar | KW Count | Volume |\n|---------|-----------|--------|--------|----------|--------|\n';
    for (const c of clusters) {
      md += `| ${c.name} | ${c.authorityLabel} ${c.authorityScore} | ${INTENT_LABELS[c.intent]} | ${c.pillar.raw} | ${c.keywords.length} | ${c.volume.toLocaleString()} |\n`;
    }
    md += '\n## Details\n';
    for (const c of clusters) {
      md += `\n### ${c.name}\n- Authority: ${c.authorityLabel} (${c.authorityScore}/100)\n- Intent: ${INTENT_LABELS[c.intent]}\n- Pillar: ${c.pillar.raw}\n- Volume: ${c.volume.toLocaleString()}\n`;
      const missing = ['tx', 'co', 'na', 'in'].filter(i => !c.intentsPresent[i]);
      if (missing.length) md += `- Funnel Gap: Missing ${missing.map(i => INTENT_LABELS[i]).join(', ')}\n`;
      if (c.interlinkTargets.length) md += `- Interlinks: ${c.interlinkTargets.map(l => clusters.find(o => o.id === l.clusterId)?.name).filter(Boolean).join(', ')}\n`;
      md += '- Keywords:\n';
      for (const k of c.keywords) {
        const gsc = (k as any).gscImpressions ? (k as any) : null;
        md += `  - ${k.raw}${k.volume > 0 ? ` (${k.volume.toLocaleString()})` : ''}`;
        if (gsc) md += ` [GSC: ${gsc.gscImpressions.toLocaleString()}imp / ${gsc.gscClicks}clicks / pos ${gsc.gscPosition}]`;
        md += '\n';
      }
    }
    return md;
  };

  const copyMd = async () => { const md = generateMd(); if (md) await navigator.clipboard.writeText(md); };
  const copyCsv = async () => {
    if (!clusters) return;
    let csv = 'Cluster,Authority,Score,Intent,Pillar,Keyword,Volume';
    if (stats.gscMatched > 0) csv += ',GSC_Impressions,GSC_Clicks,GSC_Position';
    csv += '\n';
    for (const c of clusters) {
      for (const k of c.keywords) {
        const gsc = (k as any).gscImpressions ? (k as any) : null;
        csv += `"${c.name}","${c.authorityLabel}",${c.authorityScore},"${INTENT_LABELS[c.intent]}","${c.pillar.raw}","${k.raw}",${k.volume}`;
        if (gsc) csv += `,${gsc.gscImpressions},${gsc.gscClicks},${gsc.gscPosition}`;
        csv += '\n';
      }
    }
    await navigator.clipboard.writeText(csv);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">🔍 Topical Authority Pro</h2>
          <p className="text-xs text-slate-400 mt-0.5">Semantic keyword clustering — heuristic model, not LLM embeddings</p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 space-y-3">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste keywords one per line (optionally with volume after comma)&#10;e.g.&#10;email marketing software, 8100&#10;seo tools, 5400"
          className="w-full h-32 bg-slate-900 text-slate-100 text-sm font-mono rounded-lg p-3 border border-slate-700 resize-y focus:outline-none focus:border-rose-500/50 placeholder:text-slate-600"
        />
        <div className="flex gap-2 flex-wrap">
          <button onClick={runAnalysis} disabled={loading || !input.trim()}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Build Clusters
          </button>
          <button onClick={() => { setInput(SAMPLE_KEYWORDS); setTimeout(runAnalysis, 50); }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors">
            Load Sample
          </button>

          {/* GSC Import */}
          <div className="ml-auto flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleGscImport} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className={cn('px-3 py-2 text-xs rounded-lg border transition-colors flex items-center gap-1.5',
                gscData.size > 0
                  ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400 hover:bg-emerald-800/30'
                  : 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:text-slate-200')}>
              <Database size={12} />
              {gscData.size > 0 ? `📊 GSC: ${gscData.size} KWs` : '📥 Import GSC CSV'}
            </button>
            {gscData.size > 0 && (
              <button onClick={() => { setGscData(new Map()); setGscFileName(''); }}
                className="text-[10px] text-slate-600 hover:text-slate-400">✕</button>
            )}
          </div>
        </div>
        {gscFileName && (
          <div className="text-[10px] text-emerald-500/70 flex items-center gap-1">
            <Database size={10} /> Loaded: {gscFileName} ({gscData.size} keywords)
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-rose-500" />
          <span className="ml-3 text-slate-400 text-sm">Analyzing topical authority...</span>
        </div>
      )}

      {/* Results */}
      {clusters && !loading && (
        <>
          {/* Stats bar */}
          <div className="flex gap-4 flex-wrap text-sm font-mono bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
            <span className="text-slate-400">Keywords: <span className="text-slate-100 font-semibold">{stats.total}</span></span>
            <span className="text-slate-400">Clusters: <span className="text-slate-100 font-semibold">{clusters.length}</span></span>
            <span className="text-slate-400">Volume: <span className="text-slate-100 font-semibold">{stats.vol.toLocaleString()}</span></span>
            <span className="text-slate-400">Hubs: <span className="text-slate-100 font-semibold">{clusters.filter(c => c.authorityLabel === 'Hub').length}</span></span>
            {stats.gscMatched > 0 && (
              <span className="text-emerald-500">GSC matched: <span className="font-semibold">{stats.gscMatched}/{stats.total}</span></span>
            )}
          </div>

          {/* Intent distribution bar */}
          <div className="flex h-5 rounded-lg overflow-hidden">
            {['tx', 'co', 'na', 'in'].map(intent => {
              const count = clusters.reduce((s, c) => s + c.keywords.filter(k => k.intent === intent).length, 0);
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return pct > 0 ? (
                <div key={intent} style={{ width: `${pct}%`, background: INTENT_COLORS[intent] }}
                  className="flex items-center justify-center text-[9px] font-bold text-white first:rounded-l-lg last:rounded-r-lg">
                  {INTENT_SHORT[intent]}
                </div>
              ) : null;
            })}
          </div>

          {/* Cluster cards */}
          <div className="space-y-3">
            {clusters.map((c, idx) => {
              const isHub = c.authorityLabel === 'Hub';
              const missing = ['tx', 'co', 'na', 'in'].filter(i => !c.intentsPresent[i]);
              const spokes = c.keywords.filter(k => k.raw !== c.pillar.raw);
              const expanded = expandedClusters.has(idx);

              return (
                <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                  <button onClick={() => toggleExpand(idx)} className="w-full p-4 flex items-center gap-3 hover:bg-slate-700/30 transition-colors text-left">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                      style={{ background: INTENT_COLORS[c.intent] + '30', color: INTENT_COLORS[c.intent] }}>
                      {INTENT_SHORT[c.intent]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{c.name}</span>
                        {isHub && <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-600/30">HUB</span>}
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full text-white', AUTH_COLORS[c.authorityLabel] || 'bg-slate-600')}>
                          {c.authorityLabel} {c.authorityScore}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {c.pillar.raw} · {c.keywords.length} KWs · {c.volume.toLocaleString()} vol
                        {missing.length > 0 && ` · ⚠ Gap: ${missing.map(i => INTENT_LABELS[i]).join('/')}`}
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 space-y-3">
                      {/* Funnel dots */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-16">Funnel</span>
                        <div className="flex gap-1">
                          {['tx', 'co', 'na', 'in'].map(intent => (
                            <span key={intent} className={cn('w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center text-white',
                              c.intentsPresent[intent] ? '' : 'opacity-25')}
                              style={{ background: INTENT_COLORS[intent] }}>
                              {INTENT_SHORT[intent]}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Interlinks */}
                      {c.interlinkTargets.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-16">Interlinks</span>
                          <div className="flex gap-1 flex-wrap">
                            {c.interlinkTargets.map(link => {
                              const target = clusters.find(o => o.id === link.clusterId);
                              return target ? (
                                <span key={link.clusterId} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                                  {target.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Spokes */}
                      {spokes.length > 0 && (
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">Keywords ({spokes.length})</span>
                          <div className="flex flex-wrap gap-1">
                            {spokes.map((k, i) => {
                              const gsc = (k as any).gscImpressions ? (k as any) : null;
                              return (
                                <span key={i} className={cn('text-[10px] px-2 py-0.5 rounded border',
                                  gsc ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-slate-800 text-slate-400 border-slate-700')}>
                                  {k.raw}
                                  {k.volume > 0 && <span className="text-slate-500 ml-0.5">({k.volume.toLocaleString()})</span>}
                                  {gsc && <span className="text-emerald-500/70 ml-1">⬆{gsc.gscImpressions.toLocaleString()}imp</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Export */}
          <div className="flex gap-2 justify-center pt-2">
            <button onClick={copyMd} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg flex items-center gap-1 transition-colors">
              <Copy size={12} /> Copy Markdown
            </button>
            <button onClick={copyCsv} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg flex items-center gap-1 transition-colors">
              <Copy size={12} /> Copy CSV
            </button>
          </div>

          <div className="text-center text-[10px] text-slate-600 italic pt-2 pb-4">
            ⚡ Heuristic model — not LLM embeddings. Uses synonym table + co-occurrence. Results improve with 30+ keywords.
          </div>
        </>
      )}

      {/* Empty state */}
      {!clusters && !loading && (
        <div className="text-center py-12 text-slate-500">
          <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Paste keywords above and click Build Clusters</p>
        </div>
      )}
    </div>
  );
}
