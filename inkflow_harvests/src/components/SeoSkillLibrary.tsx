import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, ChevronRight, BookOpen, Target, Search, PenLine, Wrench, Link2, Rocket, Zap } from 'lucide-react';

// ============ 后端数据结构 (mirrors AI Core seo.ts) ============

interface SkillChapterBackend {
  id: string;
  label: string;
  items: string[];
  sort_order: number;
}
interface SubSkillBackend {
  id: string;
  name: string;
  desc: string;
  trigger: string;
  sort_order: number;
}
interface SkillSectionBackend {
  id: string;
  title: string;
  icon: string;
  color: string;
  summary: string;
  sort_order: number;
  chapters: SkillChapterBackend[];
  subskills: SubSkillBackend[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Target: <Target size={16} />,
  Search: <Search size={16} />,
  PenLine: <PenLine size={16} />,
  Wrench: <Wrench size={16} />,
  Link2: <Link2 size={16} />,
  Rocket: <Rocket size={16} />,
};
function iconOf(name: string): React.ReactNode {
  return ICON_MAP[name] ?? <BookOpen size={16} />;
}

const TOKEN = 'Bearer dev';

async function fetchPlaybooks(): Promise<SkillSectionBackend[]> {
  const res = await fetch('/api/seo/playbooks', {
    headers: { Authorization: TOKEN },
  });
  if (!res.ok) throw new Error(`seo/playbooks ${res.status}`);
  const data = await res.json();
  return (data.items || []) as SkillSectionBackend[];
}

// ============ 组件 ============

export default function SeoSkillLibrary() {
  const [sections, setSections] = useState<SkillSectionBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPlaybooks()
      .then((data) => {
        if (!alive) return;
        setSections(data);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e?.message ?? e));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const toggleChapter = (chapterKey: string) => {
    setExpandedChapters((prev) => ({ ...prev, [chapterKey]: !prev[chapterKey] }));
  };
  const expandAll = () => {
    const allSections: Record<string, boolean> = {};
    const allChapters: Record<string, boolean> = {};
    sections.forEach((s) => {
      allSections[s.id] = true;
      s.chapters.forEach((_, ci) => {
        allChapters[`${s.id}-${ci}`] = true;
      });
    });
    setExpandedSections(allSections);
    setExpandedChapters(allChapters);
  };
  const collapseAll = () => {
    setExpandedSections({});
    setExpandedChapters({});
  };

  const colorClasses: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', dot: 'bg-rose-500' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-500' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', dot: 'bg-cyan-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', dot: 'bg-purple-500' },
  };

  const totalItems = sections.reduce((sum, s) => sum + s.chapters.length, 0);
  const totalPoints = sections.reduce((sum, s) => sum + s.chapters.reduce((c, ch) => c + ch.items.length, 0), 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BookOpen size={18} className="text-rose-400" /> SEO 技能知识库
        </h3>
        <div className="text-sm text-slate-500">加载中…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BookOpen size={18} className="text-rose-400" /> SEO 技能知识库
        </h3>
        <div className="text-sm text-red-400">加载失败：{error}</div>
        <div className="text-xs text-slate-500">请确认 Cloud API 已部署并包含 /api/seo/playbooks 端点。</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpen size={18} className="text-rose-400" />
            SEO 技能知识库
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {sections.length} 个维度 · {totalItems} 个知识模块 · {totalPoints} 个技能点 — 数据源：AI Core 后端 (seo_playbooks)
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors">
            全部展开
          </button>
          <button onClick={collapseAll} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors">
            全部折叠
          </button>
        </div>
      </div>

      {/* 技能列表 */}
      <div className="space-y-3">
        {sections.map((section) => {
          const colors = colorClasses[section.color] ?? colorClasses.rose;
          const isExpanded = !!expandedSections[section.id];

          return (
            <div key={section.id} className={cn('rounded-xl border transition-all duration-200', colors.border, colors.bg, isExpanded ? 'bg-opacity-20' : 'bg-opacity-10')}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-110 transition-colors"
              >
                <div className={cn('p-1.5 rounded-lg', colors.bg)}>
                  <span className={colors.text}>{iconOf(section.icon)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-200">{section.title}</h4>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', colors.bg, colors.text)}>
                      {section.chapters.length} 模块
                    </span>
                    {section.subskills.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-400">
                        {section.subskills.length} 操作技能
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{section.summary}</p>
                </div>
                <ChevronDown size={16} className={cn('text-slate-500 transition-transform duration-200', isExpanded && 'rotate-180')} />
              </button>

              {/* Chapters */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {section.chapters.map((chapter, ci) => {
                    const chapterKey = `${section.id}-${ci}`;
                    const chapterExpanded = !!expandedChapters[chapterKey];

                    return (
                      <div key={chapterKey} className="rounded-lg bg-slate-900/50 border border-slate-700/50 overflow-hidden">
                        <button
                          onClick={() => toggleChapter(chapterKey)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/50 transition-colors"
                        >
                          <ChevronRight size={12} className={cn('text-slate-500 transition-transform duration-200 shrink-0', chapterExpanded && 'rotate-90')} />
                          <span className="text-xs font-medium text-slate-300">{chapter.label}</span>
                          <span className="text-[10px] text-slate-600 ml-auto">{chapter.items.length} 条</span>
                        </button>

                        {chapterExpanded && (
                          <div className="px-4 pb-3 pt-1 space-y-1.5">
                            {chapter.items.map((item, ii) => (
                              <div key={ii} className="flex items-start gap-2">
                                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', colors.dot)} />
                                <p className="text-xs text-slate-400 leading-relaxed">{item}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 细分操作技能（可直接操作网站） */}
                  {section.subskills.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap size={12} className="text-amber-400" />
                        <span className="text-[11px] font-semibold text-amber-400">操作技能</span>
                        <span className="text-[10px] text-slate-600">— 直接对网站执行读写操作</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {section.subskills.map((ss) => (
                          <div key={ss.id} className="rounded-lg bg-slate-800/60 border border-slate-700/40 px-3 py-2 hover:border-amber-500/40 hover:bg-slate-800/80 transition-all cursor-pointer group" title={`触发词: ${ss.trigger}`}>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="text-xs font-medium text-slate-200 group-hover:text-amber-300 transition-colors">{ss.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{ss.desc}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 italic">{ss.trigger}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 pt-2">
        数据源：Cloud API 打包的 seo_playbooks（与 AI Core 同源） · 6 个知识维度 + 25 个操作技能
      </div>
    </div>
  );
}
