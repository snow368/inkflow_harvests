import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

// ============ 后端数据结构 (mirrors AI Core seo.ts) ============

type SkillStatus = 'done' | 'doing' | 'blocked' | 'not-started';

interface BoardProject {
  id: string;
  name: string;
  site_type: string;
  created_at: string;
  updated_at: string;
}
interface BoardSummary {
  done: number;
  doing: number;
  blocked: number;
  notStarted: number;
  total: number;
  pct: number;
}
interface BoardEntry {
  subsystemKey: string;
  label: string;
  skillId: string;
  skillName: string;
  description: string;
  trigger: string;
  skillSection: string;
  phase: string;
  status: SkillStatus;
  notes: string;
}
interface SeoSkill {
  id: string;
  name: string;
  description: string;
  trigger: string;
  section: string;
}

const PHASE_LABELS: Record<string, string> = {
  strategy: '战略与体系',
  keywords: '关键词与SERP',
  content: '内容创作',
  technical: '技术SEO',
  links: '外链建设',
  workflow: '工作流与增长',
};

const STATUS_META: Record<SkillStatus, { label: string; order: number }> = {
  done: { label: '已完成', order: 0 },
  doing: { label: '进行中', order: 1 },
  blocked: { label: '阻塞', order: 2 },
  'not-started': { label: '未开始', order: 3 },
};

const STATUS_DOT: Record<SkillStatus, string> = {
  done: '✅',
  doing: '🟡',
  blocked: '🔴',
  'not-started': '⚪',
};

const TOKEN = 'Bearer dev';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`/harvests${path}`, { headers: { Authorization: TOKEN } });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

function SkillModal({ skill, onClose }: { skill: SeoSkill; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg max-h-[80dvh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <div className="text-lg font-bold text-slate-100">{skill.name}</div>
            <div className="text-xs text-slate-400 mt-0.5">{skill.description}</div>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-300">关闭</button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">触发词</div>
            <div className="text-sm font-mono text-slate-300">{skill.trigger}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">所属维度</div>
            <div className="text-sm text-slate-300">{skill.section}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowStatus({ status }: { status: SkillStatus }) {
  const meta = STATUS_META[status];
  const dot = STATUS_DOT[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', status === 'done' ? 'bg-emerald-900/40 text-emerald-300' : status === 'doing' ? 'bg-amber-900/40 text-amber-300' : status === 'blocked' ? 'bg-red-900/40 text-red-300' : 'bg-slate-700/50 text-slate-400')}>
      <span>{dot}</span>
      <span>{meta.label}</span>
    </span>
  );
}

export default function SeoBoardView() {
  const [projects, setProjects] = useState<BoardProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [entries, setEntries] = useState<BoardEntry[]>([]);
  const [summary, setSummary] = useState<BoardSummary | null>(null);
  const [activeSkill, setActiveSkill] = useState<SeoSkill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // load project list
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchJson<{ items: BoardProject[] }>('/seo/board/projects')
      .then((data) => {
        if (!alive) return;
        const list = data.items || [];
        setProjects(list);
        if (list.length > 0) setActiveProjectId(list[0].id);
        setError(null);
      })
      .catch((e) => alive && setError(String(e?.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // load active project detail
  useEffect(() => {
    if (!activeProjectId) return;
    let alive = true;
    fetchJson<{ entries: BoardEntry[]; summary: BoardSummary }>(`/seo/board/projects/${encodeURIComponent(activeProjectId)}`)
      .then((data) => {
        if (!alive) return;
        setEntries(data.entries || []);
        setSummary(data.summary || null);
      })
      .catch((e) => alive && setError(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [activeProjectId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-100">📊 SEO 进度看板</h2>
        <div className="text-sm text-slate-500">加载中…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-100">📊 SEO 进度看板</h2>
        <div className="text-sm text-red-400">加载失败：{error}</div>
        <div className="text-xs text-slate-500">请确认 AI Core 已部署并包含 /seo/board/* 端点。</div>
      </div>
    );
  }

  const rowsByPhase = Object.keys(PHASE_LABELS)
    .map((key) => ({
      key,
      label: PHASE_LABELS[key],
      rows: entries.filter((r) => r.phase === key),
    }))
    .filter((g) => g.rows.length > 0);

  // 全库 skill 清单（从 entries 去重）
  const skillCatalog = entries
    .filter((e, i, arr) => arr.findIndex((x) => x.skillId === e.skillId) === i)
    .map((e) => ({ id: e.skillId, name: e.skillName, description: e.description, trigger: e.trigger, section: e.skillSection }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">📊 SEO 进度看板</h2>
        <select
          value={activeProjectId}
          onChange={(e) => setActiveProjectId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {summary && (
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-400">总进度</span>
            <span className="text-sm text-slate-300">{summary.done}/{summary.total} 完成 ({summary.pct}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden flex">
            {summary.done > 0 && <div className="h-full bg-emerald-500" style={{ width: `${(summary.done / summary.total) * 100}%` }} />}
            {summary.doing > 0 && <div className="h-full bg-amber-500" style={{ width: `${(summary.doing / summary.total) * 100}%` }} />}
            {summary.blocked > 0 && <div className="h-full bg-red-500" style={{ width: `${(summary.blocked / summary.total) * 100}%` }} />}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-400">
            <span>✅ {summary.done} 已完成</span>
            <span>🟡 {summary.doing} 进行中</span>
            <span>🔴 {summary.blocked} 阻塞</span>
            <span>⚪ {summary.notStarted} 未开始</span>
          </div>
        </div>
      )}

      {rowsByPhase.map((phase) => (
        <div key={phase.key} className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{phase.label}</span>
          </div>
          <div className="divide-y divide-slate-700/30">
            {phase.rows.map((row) => (
              <div key={row.subsystemKey} className="px-4 py-3 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-sm font-medium text-slate-200 whitespace-nowrap">{row.label}</div>
                  <button
                    onClick={() => setActiveSkill({ id: row.skillId, name: row.skillName, description: row.description, trigger: row.trigger, section: row.skillSection })}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-400 hover:text-purple-300 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/20 transition-colors shrink-0"
                    title="查看skill详情"
                  >
                    {row.skillId} ✏️
                  </button>
                </div>
                <RowStatus status={row.status} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700/50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">全库 Skill 清单（{skillCatalog.length} 个）</span>
        </div>
        <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {skillCatalog.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSkill(s)}
              className="text-left p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-purple-500/40 transition-colors"
            >
              <div className="text-xs font-mono text-purple-400 truncate">{s.id}</div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{s.description}</div>
              <div className="text-[9px] text-slate-500 mt-1">{s.trigger}</div>
            </button>
          ))}
        </div>
      </div>

      {activeSkill && <SkillModal skill={activeSkill} onClose={() => setActiveSkill(null)} />}
    </div>
  );
}
