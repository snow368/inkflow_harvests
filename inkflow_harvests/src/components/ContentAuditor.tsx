import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { FileText, Upload, Copy, ChevronDown, ChevronUp, Search, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink, Database } from 'lucide-react';

type ContentStatus = 'good' | 'needs-update' | 'thin' | 'rewrite' | 'remove';
interface ContentPage {
  id: number;
  url: string;
  title: string;
  wordCount: number;
  status: ContentStatus;
  lastUpdated: string;
  score: number;
  issues: string[];
  gscImpressions?: number;
  gscClicks?: number;
  gscPosition?: number;
}

const STATUS_META: Record<ContentStatus, { label: string; color: string; icon: string }> = {
  good: { label: 'Good', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30', icon: '✅' },
  'needs-update': { label: 'Needs Update', color: 'bg-amber-600/20 text-amber-400 border-amber-600/30', icon: '🔄' },
  thin: { label: 'Thin Content', color: 'bg-red-600/20 text-red-400 border-red-600/30', icon: '⚠️' },
  rewrite: { label: 'Rewrite', color: 'bg-purple-600/20 text-purple-400 border-purple-600/30', icon: '✍️' },
  remove: { label: 'Remove', color: 'bg-slate-600/20 text-slate-400 border-slate-600/30', icon: '🗑️' },
};

const QUALITY_CHECKS = [
  { id: 'wordcount', label: '📏 Word Count', desc: 'Aim for 1500+ words for pillar pages, 800+ for supporting', severity: 'high' },
  { id: 'freshness', label: '📅 Freshness', desc: 'Content older than 12 months should be reviewed and updated', severity: 'high' },
  { id: 'title', label: '🏷️ Title Tag', desc: '50-60 chars, includes primary keyword, unique per page', severity: 'high' },
  { id: 'meta', label: '📝 Meta Description', desc: '150-200 chars with keyword and CTA', severity: 'medium' },
  { id: 'headings', label: '📑 Heading Structure', desc: 'Single H1, logical H2/H3 hierarchy, keywords in headings', severity: 'medium' },
  { id: 'internal', label: '🔗 Internal Links', desc: '2-5 internal links per page, descriptive anchor text', severity: 'medium' },
  { id: 'external', label: '🌐 External Links', desc: 'Link to authoritative sources for credibility (E-E-A-T)', severity: 'low' },
  { id: 'images', label: '🖼️ Images & Alt', desc: 'At least 1 relevant image per 500 words, all with alt text', severity: 'medium' },
  { id: 'schema', label: '🔍 Schema Markup', desc: 'Article/FAQ/Product schema as appropriate for content type', severity: 'medium' },
  { id: 'cta', label: '🎯 Call to Action', desc: 'Clear next step: subscribe, buy, download, contact', severity: 'low' },
  { id: 'eeat', label: '⭐ E-E-A-T Signals', desc: 'Author byline, credentials, cited sources, original research', severity: 'high' },
  { id: 'readability', label: '📖 Readability', desc: 'Short paragraphs, bullet points, grade 8-10 reading level', severity: 'medium' },
];

const SAMPLE_PAGES: ContentPage[] = [
  { id: 1, url: '/seo-guide', title: 'Complete SEO Guide for 2026', wordCount: 3200, status: 'good', lastUpdated: '2026-03-15', score: 85, issues: [], gscImpressions: 12400, gscClicks: 580, gscPosition: 4.2 },
  { id: 2, url: '/keyword-research', title: 'Keyword Research Tips', wordCount: 1200, status: 'needs-update', lastUpdated: '2025-01-20', score: 55, issues: ['Content 14 months old', 'No schema markup', 'Missing CTA'], gscImpressions: 3400, gscClicks: 92, gscPosition: 8.7 },
  { id: 3, url: '/backlink-strategy', title: 'Backlink Building', wordCount: 450, status: 'thin', lastUpdated: '2025-06-10', score: 30, issues: ['Only 450 words', 'No original data', 'No author byline'], gscImpressions: 890, gscClicks: 15, gscPosition: 15.3 },
  { id: 4, url: '/old-product', title: 'Legacy Product Review 2023', wordCount: 2100, status: 'rewrite', lastUpdated: '2023-11-01', score: 25, issues: ['3 years old', 'Product discontinued', 'Competitors surpassed'], gscImpressions: 210, gscClicks: 3, gscPosition: 22.1 },
];

export default function ContentAuditor() {
  const [pages, setPages] = useState<ContentPage[]>(SAMPLE_PAGES);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ContentStatus | 'all'>('all');
  const [selectedPage, setSelectedPage] = useState<ContentPage | null>(null);
  const [gscData, setGscData] = useState<Map<string, {impressions: number; clicks: number; position: number}>>(new Map());
  const [gscFileName, setGscFileName] = useState('');

  const handleGscImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGscFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const map = new Map<string, {impressions: number; clicks: number; position: number}>();
      const startIdx = lines[0].toLowerCase().includes('query') ? 1 : 0;
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 4) continue;
        const query = parts[0].trim().replace(/^"|"$/g, '').toLowerCase();
        const impressions = parseInt(parts[1].replace(/[^0-9]/g, '')) || 0;
        const clicks = parseInt(parts[2].replace(/[^0-9]/g, '')) || 0;
        const position = parseFloat(parts[4]?.replace(/[^0-9.]/g, '') || '0') || 0;
        if (query && impressions > 0) map.set(query, { impressions, clicks, position });
      }
      setGscData(map);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filtered = pages
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => !search || p.url.includes(search) || p.title.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: pages.length,
    good: pages.filter(p => p.status === 'good').length,
    'needs-update': pages.filter(p => p.status === 'needs-update').length,
    thin: pages.filter(p => p.status === 'thin').length,
    rewrite: pages.filter(p => p.status === 'rewrite').length,
  };

  const avgScore = pages.length > 0 ? Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">📋 内容审核</h2>
          <p className="text-xs text-slate-400 mt-0.5">Content audit & quality checks — find thin content, update opportunities & E-E-A-T gaps</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-2">
        {(['all', 'good', 'needs-update', 'thin', 'rewrite'] as const).map(k => (
          <button key={k} onClick={() => setFilter(k)}
            className={cn('rounded-lg p-2 text-center border transition-colors cursor-pointer',
              filter === k ? 'border-rose-500/50 bg-rose-900/20' : 'border-slate-700/50 bg-slate-800/30')}>
            <div className={cn('text-lg font-bold',
              k === 'all' ? 'text-slate-100' : k === 'good' ? 'text-emerald-400' : k === 'thin' ? 'text-red-400' : k === 'needs-update' ? 'text-amber-400' : 'text-purple-400')}>
              {counts[k]}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">{k === 'all' ? 'All' : STATUS_META[k].label}</div>
          </button>
        ))}
        <div className="rounded-lg p-2 text-center border border-slate-700/50 bg-slate-800/30">
          <div className="text-lg font-bold text-rose-400">{avgScore}</div>
          <div className="text-[9px] text-slate-500 mt-0.5">Avg Score</div>
        </div>
      </div>

      {/* Search + Import */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search pages..." className="w-full bg-slate-900 text-slate-100 text-xs rounded-lg pl-8 pr-3 py-2 border border-slate-700 focus:outline-none focus:border-rose-500/50" />
        </div>
        <div className="relative">
          <input type="file" accept=".csv" onChange={handleGscImport} className="hidden" id="gsc-upload-audit" />
          <label htmlFor="gsc-upload-audit" className={cn('px-3 py-2 text-xs rounded-lg border cursor-pointer flex items-center gap-1.5 transition-colors',
            gscData.size > 0 ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400' : 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:text-slate-200')}>
            <Database size={12} /> {gscData.size > 0 ? `GSC ${gscData.size}` : 'GSC CSV'}
          </label>
        </div>
      </div>

      {/* Page list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Page list */}
        <div className="lg:col-span-2 space-y-1 max-h-96 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} onClick={() => setSelectedPage(p)}
              className={cn('w-full text-left px-3 py-2 rounded-lg border transition-colors',
                selectedPage?.id === p.id ? 'bg-rose-900/20 border-rose-500/30' : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50')}>
              <div className="flex items-center gap-2">
                <span className={cn('px-1 py-0.5 rounded text-[9px] font-medium border', STATUS_META[p.status].color)}>
                  {STATUS_META[p.status].icon} {STATUS_META[p.status].label}
                </span>
                <span className={cn('text-[10px] font-mono font-bold',
                  p.score >= 70 ? 'text-emerald-400' : p.score >= 50 ? 'text-amber-400' : 'text-red-400')}>
                  {p.score}
                </span>
              </div>
              <div className="text-xs text-slate-200 mt-1 truncate">{p.title}</div>
              <div className="text-[9px] text-slate-500 truncate">{p.url}</div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selectedPage ? (
            <div className="space-y-3">
              {/* Page header */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-100">{selectedPage.title}</h3>
                    <code className="text-[10px] text-slate-500">{selectedPage.url}</code>
                  </div>
                  <a href={selectedPage.url} target="_blank" rel="noopener" className="p-1.5 hover:bg-slate-700 rounded">
                    <ExternalLink size={12} className="text-slate-500" />
                  </a>
                </div>
                <div className="flex gap-3 mt-3 text-[10px] text-slate-400">
                  <span>{selectedPage.wordCount.toLocaleString()} words</span>
                  <span>Updated: {selectedPage.lastUpdated}</span>
                  {selectedPage.gscImpressions && <span className="text-emerald-500">{selectedPage.gscImpressions.toLocaleString()} imp</span>}
                  {selectedPage.gscPosition && <span>Pos: {selectedPage.gscPosition}</span>}
                </div>
                <div className={cn('mt-2 text-[10px] px-2 py-1 rounded inline-block border', STATUS_META[selectedPage.status].color)}>
                  {STATUS_META[selectedPage.status].icon} {STATUS_META[selectedPage.status].label}
                </div>
              </div>

              {/* Issues */}
              {selectedPage.issues.length > 0 && (
                <div className="bg-red-900/10 border border-red-700/20 rounded-xl p-3">
                  <h4 className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Issues ({selectedPage.issues.length})</h4>
                  {selectedPage.issues.map((issue, i) => (
                    <div key={i} className="text-[10px] text-slate-400 flex items-start gap-1.5 py-0.5">
                      <AlertTriangle size={10} className="text-red-500 mt-0.5 shrink-0" />
                      {issue}
                    </div>
                  ))}
                </div>
              )}

              {/* Quality checklist */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Quality Checklist</h4>
                <div className="space-y-1">
                  {QUALITY_CHECKS.map(check => {
                    const status = selectedPage.score >= 70 ? 'pass' : selectedPage.score >= 40 ? 'partial' : 'fail';
                    return (
                      <div key={check.id} className="flex items-start gap-2 px-2 py-1 rounded hover:bg-slate-700/20">
                        {status === 'pass'
                          ? <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 shrink-0" />
                          : <AlertTriangle size={10} className={cn('mt-0.5 shrink-0', status === 'partial' ? 'text-amber-500' : 'text-red-500')} />
                        }
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-slate-300">{check.label}</span>
                          <span className="text-[9px] text-slate-500 ml-1">{check.desc}</span>
                        </div>
                        <span className={cn('text-[8px] px-1 rounded shrink-0',
                          check.severity === 'high' ? 'bg-red-900/30 text-red-400' :
                          check.severity === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                          'bg-slate-700 text-slate-500')}>
                          {check.severity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                {selectedPage.status === 'needs-update' && (
                  <button className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] rounded-lg">Mark as Updated</button>
                )}
                {selectedPage.status === 'thin' && (
                  <button className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[10px] rounded-lg">Plan Rewrite</button>
                )}
                {selectedPage.status === 'good' && (
                  <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] rounded-lg">✅ Reviewed</button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-8 text-center text-slate-500">
              <FileText size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Select a page to review</p>
            </div>
          )}
        </div>
      </div>

      {/* E-E-A-T tip */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
        <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
          <span className="text-rose-400 font-semibold">💡 E-E-A-T Tip:</span>
          Google's HCU algorithm applies site-wide — even one thin page can drag down your whole site's rankings. Regular content audits are essential.
        </p>
      </div>
    </div>
  );
}
