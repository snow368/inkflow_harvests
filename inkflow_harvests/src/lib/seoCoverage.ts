import { seoSkills, SUBSYSTEMS, getSkill, type SeoSubsystem } from './seoSkills';

export type SkillStatus = 'done' | 'doing' | 'blocked' | 'not-started';

export interface CoverageEntry {
  subsystem: string;
  skillId: string;
  skillName: string;
  description: string;
  phase: string;
  status: SkillStatus;
}

export interface SeoProject {
  id: string;
  name: string;
  siteType: string;
  status: Record<string, SkillStatus>;
}

export const STATUS_META: Record<SkillStatus, { label: string; order: number }> = {
  'done': { label: '已完成', order: 0 },
  'doing': { label: '进行中', order: 1 },
  'blocked': { label: '阻塞', order: 2 },
  'not-started': { label: '未开始', order: 3 },
};

export function generateBoard(project: SeoProject): CoverageEntry[] {
  const userStatus = project.status || {};
  return SUBSYSTEMS.map((ss: SeoSubsystem) => {
    const skill = getSkill(ss.skillId);
    return {
      subsystem: ss.label,
      skillId: ss.skillId,
      skillName: ss.skillId,
      description: skill?.description || '',
      phase: ss.phase,
      status: userStatus[ss.key] || 'not-started',
    };
  });
}

export function boardSummary(rows: CoverageEntry[]): { done: number; doing: number; blocked: number; notStarted: number; total: number; pct: number } {
  const done = rows.filter(r => r.status === 'done').length;
  const doing = rows.filter(r => r.status === 'doing').length;
  const blocked = rows.filter(r => r.status === 'blocked').length;
  const notStarted = rows.filter(r => r.status === 'not-started').length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, doing, blocked, notStarted, total, pct };
}

export const seoProjects: SeoProject[] = [
  {
    id: 'ink-flows.com',
    name: 'InkFlow Marketing',
    siteType: 'SaaS',
    status: {
      'site-audit': 'done',
      'competitor-gap': 'done',
      'keyword-find': 'done',
      'topic-cluster': 'doing',
      'content-brief': 'done',
      'content-write': 'done',
      'content-quality': 'doing',
      'meta-optimize': 'doing',
      'content-rewrite': 'doing',
      'content-refresh': 'not-started',
      'tech-check': 'done',
      'sitemap': 'blocked',
      'schema': 'done',
      'speed': 'blocked',
      'internal-link': 'done',
      'launch': 'blocked',
      'gsc': 'not-started',
      'backlink': 'not-started',
      'outreach': 'not-started',
    },
  },
];
