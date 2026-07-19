import { useState } from 'react';
import { cn } from '../lib/utils';
import {
  seoProjects,
  generateBoard,
  boardSummary,
  STATUS_META,
  type SeoProject,
  type CoverageEntry,
  type SkillStatus,
} from '../lib/seoCoverage';
import {
  seoSkills,
  getSkill,
  SKILL_PHASES,
  type SeoSkill,
} from '../lib/seoSkills';

const STATUS_DOT: Record<SkillStatus, string> = {
  'done': '\u2705',
  'doing': '\uD83D\uDFE1',
  'blocked': '\uD83D\uDD34',
  'not-started': '\u26AA',
};

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
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      status === 'done' ? 'bg-emerald-900/40 text-emerald-300' :
      status === 'doing' ? 'bg-amber-900/40 text-amber-300' :
      status === 'blocked' ? 'bg-red-900/40 text-red-300' :
      'bg-slate-700/50 text-slate-400'
    )}>
      <span>{dot}</span>
      <span>{meta.label}</span>
    </span>
  );
}

export default function SeoBoardView() {
  const [activeProjectId, setActiveProjectId] = useState(seoProjects[0]?.id ?? '');
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  const currentProject = seoProjects.find(p => p.id === activeProjectId) ?? seoProjects[0];
  const rows: CoverageEntry[] = currentProject ? generateBoard(currentProject) : [];
  const summary = currentProject ? boardSummary(rows) : null;

  const rowsByPhase = SKILL_PHASES.map(ph => ({
    ...ph,
    rows: rows.filter(r => r.phase === ph.key),
  })).filter(g => g.rows.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">{'\u{1F4CA}'} SEO 进度看板</h2>
        <select
          value={activeProjectId}
          onChange={(e) => setActiveProjectId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200"
        >
          {seoProjects.map(p => (
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
            <span>{'\u2705'} {summary.done} 已完成</span>
            <span>{'\uD83D\uDFE1'} {summary.doing} 进行中</span>
            <span>{'\uD83D\uDD34'} {summary.blocked} 阻塞</span>
            <span>{'\u26AA'} {summary.notStarted} 未开始</span>
          </div>
        </div>
      )}

      {rowsByPhase.map(phase => (
        <div key={phase.key} className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700/50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{phase.label}</span>
          </div>
          <div className="divide-y divide-slate-700/30">
            {phase.rows.map(row => {
              const skill = getSkill(row.skillId);
              return (
                <div key={row.subsystem} className="px-4 py-3 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-sm font-medium text-slate-200 whitespace-nowrap">{row.subsystem}</div>
                    <button
                      onClick={() => setActiveSkill(row.skillId)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono text-purple-400 hover:text-purple-300 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/20 transition-colors shrink-0"
                      title="查看skill详情"
                    >
                      {row.skillId} {'\u270F\uFE0F'}
                    </button>
                  </div>
                  <RowStatus status={row.status} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700/50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">全库 Skill 清单（{seoSkills.length} 个）</span>
        </div>
        <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {seoSkills.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSkill(s.id)}
              className="text-left p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-purple-500/40 transition-colors"
            >
              <div className="text-xs font-mono text-purple-400 truncate">{s.id}</div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{s.description}</div>
              <div className="text-[9px] text-slate-500 mt-1">{s.trigger}</div>
            </button>
          ))}
        </div>
      </div>

      {activeSkill && (() => {
        const skill = getSkill(activeSkill);
        if (!skill) return null;
        return <SkillModal skill={skill} onClose={() => setActiveSkill(null)} />;
      })()}
    </div>
  );
}
