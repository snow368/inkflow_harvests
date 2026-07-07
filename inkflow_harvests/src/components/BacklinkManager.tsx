import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { ExternalLink, Plus, Trash2, CheckCircle2, RefreshCw, AlertTriangle, Copy, ChevronDown, ChevronUp, Search } from 'lucide-react';

type BkStatus = 'target' | 'outreached' | 'live' | 'lost' | 'rejected';
interface Backlink {
  id: number;
  domain: string;
  url: string;
  status: BkStatus;
  method: string;
  notes: string;
  dateAdded: string;
}

const STATUS_META: Record<BkStatus, { label: string; color: string; icon: string }> = {
  target: { label: '目标', color: 'bg-slate-600 text-slate-200', icon: '🎯' },
  outreached: { label: '已联系', color: 'bg-blue-600/20 text-blue-400 border-blue-600/30', icon: '📤' },
  live: { label: '已上线', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30', icon: '✅' },
  lost: { label: '已丢失', color: 'bg-red-600/20 text-red-400 border-red-600/30', icon: '❌' },
  rejected: { label: '被拒', color: 'bg-amber-600/20 text-amber-400 border-amber-600/30', icon: '🚫' },
};

const STRATEGY_CHECKLIST = [
  { id: 'unlinked', label: '🔗 品牌未标注提及', desc: '找到提到你但没加链接的页面，请求加链', detail: '转化率最高的方式。Google搜"品牌名 -site:你的域名"找未标注提及' },
  { id: 'intermediate', label: '📄 中间页策略', desc: '用高权重的信息类页内链指向核心商业页', detail: '找出你网站上外链最多的5-10篇文章，加上通向核心页面的内链' },
  { id: 'data', label: '📊 数据资产', desc: '发布调研/工具/案例研究让别人主动引用', detail: '免费在线工具的引用量是博客文章的3-5倍' },
  { id: 'podcast', label: '🎙️ 播客嘉宾', desc: '成为播客嘉宾，Show Notes自带链接', detail: '几乎无竞争的高质量外链渠道' },
  { id: 'wikipedia', label: '📖 Wikipedia断链替换', desc: '找领域词条的失效链接，用你的内容替换', detail: 'Wikipedia外链虽nofollow但增强实体可信度' },
  { id: 'stripe', label: '💳 Stripe Climate', desc: '开启Climate捐赠，自动生成DR94外链', detail: '一分钱不花，DR94（别用真实交易账号）' },
  { id: 'medium', label: '✍️ Medium投稿', desc: '写技术文章自然附链接', detail: 'Medium本身权重高，软植入不会被判操控' },
  { id: 'nav', label: '🗂️ 导航站提交', desc: '新站上线后去出海导航站提交', detail: '权重不高但干净，加速Google收录' },
  { id: 'digitalpr', label: '📰 数字PR', desc: '制作有新闻价值的内容向记者推介', detail: '最接近白帽满分的外链策略。Qwoted/SourceBottle替代已关闭的HARO' },
  { id: 'gap', label: '🔍 竞品外链缺口', desc: '用Ahrefs Link Intersect找对手有而你没有的来源', detail: '优先处理多个竞争对手都有的来源网站' },
  { id: 'disavow', label: '⚠️ 拒绝坏链', desc: '定期审查并拒绝垃圾外链', detail: '来自赌博/成人/制药站的链接需要提交Disavow' },
];

const SAMPLE_BACKLINKS: Backlink[] = [
  { id: 1, domain: 'example.com', url: 'https://example.com/seo-tools', status: 'live', method: 'Guest Post', notes: 'Guest post about SEO tools', dateAdded: '2026-06-15' },
  { id: 2, domain: 'medium.com', url: 'https://medium.com/@user/my-article', status: 'live', method: 'Medium', notes: 'Technical article', dateAdded: '2026-06-20' },
  { id: 3, domain: 'competitor-review.com', url: 'https://competitor-review.com/best-tools', status: 'target', method: 'Unlinked Mention', notes: 'They mentioned our tool without link', dateAdded: '2026-06-25' },
  { id: 4, domain: 'podcastshow.com', url: 'https://podcastshow.com/episode-42', status: 'outreached', method: 'Podcast', notes: 'Appeared as guest, waiting for show notes', dateAdded: '2026-06-28' },
];

export default function BacklinkManager() {
  const [backlinks, setBacklinks] = useState<Backlink[]>(SAMPLE_BACKLINKS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ domain: '', url: '', method: '', notes: '' });
  const [filter, setFilter] = useState<BkStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>('checklist');
  const [expandedStrategyInner, setExpandedStrategyInner] = useState<string | null>(null);

  const addBacklink = () => {
    if (!form.domain || !form.url) return;
    const bk: Backlink = {
      id: Date.now(),
      domain: form.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      url: form.url.startsWith('http') ? form.url : 'https://' + form.url,
      status: 'target',
      method: form.method || 'Manual',
      notes: form.notes,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setBacklinks([bk, ...backlinks]);
    setForm({ domain: '', url: '', method: '', notes: '' });
    setShowForm(false);
  };

  const updateStatus = (id: number, status: BkStatus) => {
    setBacklinks(backlinks.map(b => b.id === id ? { ...b, status } : b));
  };

  const deleteBk = (id: number) => {
    setBacklinks(backlinks.filter(b => b.id !== id));
  };

  const filtered = backlinks
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => !search || b.domain.includes(search) || b.url.includes(search) || b.notes.includes(search));

  const counts = {
    all: backlinks.length,
    target: backlinks.filter(b => b.status === 'target').length,
    outreached: backlinks.filter(b => b.status === 'outreached').length,
    live: backlinks.filter(b => b.status === 'live').length,
    lost: backlinks.filter(b => b.status === 'lost').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">🔗 Backlink Manager</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track your backlink acquisition pipeline & strategy checklist</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {(['all', 'target', 'outreached', 'live', 'lost'] as const).map(k => (
          <button key={k} onClick={() => setFilter(k)}
            className={cn('rounded-lg p-2 text-center border transition-colors cursor-pointer',
              filter === k ? 'border-rose-500/50 bg-rose-900/20' : 'border-slate-700/50 bg-slate-800/30')}>
            <div className={cn('text-lg font-bold',
              k === 'all' ? 'text-slate-100' : k === 'live' ? 'text-emerald-400' : k === 'lost' ? 'text-red-400' : 'text-slate-400')}>
              {counts[k]}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">{STATUS_META[k as BkStatus]?.label || 'All'}</div>
          </button>
        ))}
      </div>

      {/* Search + Add */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search domains..." className="w-full bg-slate-900 text-slate-100 text-xs rounded-lg pl-8 pr-3 py-2 border border-slate-700 focus:outline-none focus:border-rose-500/50" />
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-lg flex items-center gap-1">
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-2">
          <input value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })}
            placeholder="Domain (e.g. example.com)" className="w-full bg-slate-900 text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-rose-500/50" />
          <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
            placeholder="URL with backlink" className="w-full bg-slate-900 text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-rose-500/50" />
          <div className="flex gap-2">
            <input value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}
              placeholder="Method (Guest Post, etc.)" className="flex-1 bg-slate-900 text-slate-100 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-rose-500/50" />
            <button onClick={addBacklink} disabled={!form.domain || !form.url}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs rounded-lg font-semibold">Save</button>
          </div>
        </div>
      )}

      {/* Backlink list */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">No backlinks yet. Add your first one!</div>
        ) : filtered.map(b => (
          <div key={b.id} className="bg-slate-800/30 border border-slate-700/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium border', STATUS_META[b.status].color)}>
              {STATUS_META[b.status].icon} {STATUS_META[b.status].label}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-200 truncate">{b.domain}</div>
              <div className="text-[9px] text-slate-500 truncate">{b.method}{b.notes ? ` · ${b.notes}` : ''}</div>
            </div>
            <div className="flex items-center gap-1">
              <a href={b.url} target="_blank" rel="noopener" className="p-1 hover:bg-slate-700 rounded"><ExternalLink size={10} className="text-slate-500" /></a>
              {/* Quick status buttons */}
              {b.status !== 'live' && (
                <button onClick={() => updateStatus(b.id, 'live')} className="p-1 hover:bg-emerald-900/30 rounded" title="Mark live">
                  <CheckCircle2 size={10} className="text-emerald-600/70" />
                </button>
              )}
              {b.status === 'target' && (
                <button onClick={() => updateStatus(b.id, 'outreached')} className="p-1 hover:bg-blue-900/30 rounded" title="Mark outreached">
                  <RefreshCw size={10} className="text-blue-600/70" />
                </button>
              )}
              {(b.status === 'live') && (
                <button onClick={() => updateStatus(b.id, 'lost')} className="p-1 hover:bg-red-900/30 rounded" title="Mark lost">
                  <AlertTriangle size={10} className="text-red-600/70" />
                </button>
              )}
              <button onClick={() => deleteBk(b.id)} className="p-1 hover:bg-red-900/30 rounded">
                <Trash2 size={10} className="text-slate-600 hover:text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Strategy section with tabs */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex gap-1 bg-slate-800/30 rounded-lg p-0.5 border border-slate-700/30 w-fit mb-3">
          {(['strategies', 'competitors', 'checklist'] as const).map(t => (
            <button key={t} onClick={() => setExpandedStrategy(t)}
              className={cn('px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors',
                expandedStrategy === t ? 'bg-rose-600/30 text-rose-400' : 'text-slate-500 hover:text-slate-300')}>
              {t === 'strategies' ? '📚 策略库' : t === 'competitors' ? '🏢 竞品' : '📋 清单'}
            </button>
          ))}
        </div>

        {expandedStrategy === 'strategies' && (
          <div className="space-y-1">
            {/* Strategy classification header */}
            <div className="grid grid-cols-6 gap-1 px-2 py-1 text-[9px] text-slate-600 font-medium uppercase tracking-wider">
              <span className="col-span-2">Strategy</span>
              <span>Type</span>
              <span>Stage</span>
              <span>Difficulty</span>
              <span>Status</span>
            </div>
            {[
              { name: 'AlternativeTo 免费提交', type: 'B2B SaaS', stage: '冷启动', diff: '简单', door: '🟠审核', dr: '79', status: '可用' },
              { name: '免费工具引链策略', type: 'B2B SaaS', stage: '冷启动~增长', diff: '复杂', door: '需开发', dr: '—', status: '可用' },
              { name: '品牌未标注提及', type: '通用', stage: '全阶段', diff: '简单', door: '🟡发邮件', dr: '—', status: '可用' },
              { name: 'Stripe Climate', type: '通用', stage: '全阶段', diff: '简单', door: '🟢秒发', dr: '94', status: '可用' },
              { name: 'Medium 投稿', type: '通用', stage: '全阶段', diff: '简单', door: '🟡注册', dr: '高', status: '可用' },
              { name: '播客嘉宾', type: '通用', stage: '爬坡+', diff: '中等', door: '🟠审核', dr: '高', status: '可用' },
              { name: 'Wikipeda 断链替换', type: '通用', stage: '增长+', diff: '中等', door: '🟠审核', dr: 'nofollow', status: '可用' },
              { name: '竞品外链缺口', type: '通用', stage: '增长+', diff: '中等', door: '🟡工具', dr: '—', status: '可用' },
              { name: '数字 PR', type: '通用', stage: '权威', diff: '复杂', door: '🔴高门槛', dr: '最高', status: '可用' },
              { name: '导航站提交', type: '通用', stage: '冷启动', diff: '简单', door: '🟢秒发', dr: '低', status: '可用' },
              { name: '中间页策略（内链）', type: '通用', stage: '全阶段', diff: '简单', door: '🟢内链', dr: '—', status: '可用' },
              { name: '数据资产引链', type: '通用', stage: '增长+', diff: '复杂', door: '需开发', dr: '高', status: '可用' },
            ].map((s, i) => (
              <div key={i} className="grid grid-cols-6 gap-1 px-2 py-1.5 rounded text-[10px] hover:bg-slate-700/20 items-center">
                <span className="text-slate-200 col-span-2 truncate">{s.name}</span>
                <span className="text-slate-400">{s.type}</span>
                <span className="text-slate-400">{s.stage}</span>
                <span className={cn(
                  s.diff === '简单' ? 'text-emerald-400' : s.diff === '中等' ? 'text-amber-400' : 'text-red-400'
                )}>{s.diff} {s.door}</span>
                <span className={cn(
                  s.status === '可用' ? 'text-emerald-400' : 'text-slate-500'
                )}>{s.status}</span>
              </div>
            ))}
          </div>
        )}

        {expandedStrategy === 'competitors' && (
          <div>
            <div className="grid grid-cols-5 gap-1 px-2 py-1 text-[9px] text-slate-600 font-medium uppercase tracking-wider">
              <span className="col-span-2">Competitor</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            {[
              { name: 'InkBook', url: 'inkbook.com', pri: 'P0', status: '⏳ 待跑' },
              { name: 'Tattoo Studio Pro', url: 'tattoostudiosoftware.com', pri: 'P0', status: '⏳ 待跑' },
              { name: 'TimetoTat', url: 'timetotat.com', pri: 'P1', status: '⏳ 待跑' },
              { name: 'Boujee', url: 'boujee.co', pri: 'P1', status: '⏳ 待跑' },
              { name: 'MyTattooStudio', url: 'mytattoostudio.com', pri: 'P1', status: '⏳ 待跑' },
              { name: 'TattooGo', url: 'tattoogoapp.com', pri: 'P2', status: '⏳ 待跑' },
              { name: 'Vagaro', url: 'vagaro.com', pri: 'P2', status: '⏳ 待跑' },
              { name: 'Booksy', url: 'booksy.com', pri: 'P2', status: '⏳ 待跑' },
            ].map((c, i) => (
              <div key={i} className="grid grid-cols-5 gap-1 px-2 py-1.5 rounded text-[10px] hover:bg-slate-700/20 items-center">
                <span className="text-slate-200 col-span-2 truncate">{c.name}</span>
                <span className={cn(c.pri === 'P0' ? 'text-rose-400' : c.pri === 'P1' ? 'text-amber-400' : 'text-slate-400')}>{c.pri}</span>
                <span className="text-slate-400">{c.status}</span>
                <a href={`https://${c.url}`} target="_blank" rel="noopener" className="text-rose-400 hover:text-rose-300">
                  Open <ExternalLink size={10} className="inline" />
                </a>
              </div>
            ))}
          </div>
        )}

        {expandedStrategy === 'checklist' && (
          <div className="space-y-1">
            {STRATEGY_CHECKLIST.map(s => (
              <div key={s.id}>
                <button onClick={() => setExpandedStrategyInner(expandedStrategyInner === s.id ? null : s.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-700/30 text-left">
                  <span className="text-xs text-slate-300 flex-1">{s.label}</span>
                  <span className="text-[9px] text-slate-500">{s.desc}</span>
                  {expandedStrategyInner === s.id ? <ChevronUp size={10} className="text-slate-500" /> : <ChevronDown size={10} className="text-slate-500" />}
                </button>
                {expandedStrategyInner === s.id && (
                  <div className="px-3 pb-2 text-[10px] text-slate-400 leading-relaxed border-t border-slate-700/30 pt-1.5 mt-0.5">
                    {s.detail}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
