export interface SeoSkill {
  id: string;
  name: string;
  description: string;
  trigger: string;
  section: string;
}

export interface SeoSubsystem {
  key: string;
  label: string;
  skillId: string;
  phase: string;
}

export const SKILL_PHASES: { key: string; label: string }[] = [
  { key: 'strategy', label: '战略与体系' },
  { key: 'keywords', label: '关键词与SERP' },
  { key: 'content', label: '内容创作' },
  { key: 'technical', label: '技术SEO' },
  { key: 'links', label: '外链建设' },
  { key: 'workflow', label: '工作流与增长' },
];

const SKILLS_DATA: SeoSkill[] = [
  { id: 'seo-site-audit', name: '网站 SEO 审计', description: '29项逐页检查，输出整改清单', trigger: '"审计网站SEO"', section: 'strategy' },
  { id: 'seo-competitor-gap', name: '竞品差距分析', description: '页面/关键词/内容/技术四维对比，找排名差距', trigger: '"分析竞品"', section: 'strategy' },
  { id: 'seo-competitor-analysis', name: '竞品深度分析', description: '页面结构/关键词覆盖/内容策略/技术指标全面对比', trigger: '"竞品深度分析"', section: 'strategy' },
  { id: 'seo-keyword-finder', name: '关键词研究与建议', description: '找词来源（GSC/AITDK/Google Suggest/Reddit）+5维评分选词+意图判断+分配到页面类型', trigger: '"找关键词"', section: 'keywords' },
  { id: 'seo-topic-cluster', name: '主题集群规划', description: '支柱页选型→集群拆分→内链双向→长尾词分配到H2/H3→权重通道', trigger: '"规划主题集群"', section: 'keywords' },
  { id: 'seo-serp-analysis', name: 'SERP 竞争分析', description: '逐条拆解首页10条结果找表层Gap+用户真实需求信息增益，输出页面策略', trigger: '"分析SERP"', section: 'keywords' },
  { id: 'seo-rank-tracker', name: '排名追踪', description: '目标关键词排名变化监控、高曝光低点击优化、11-20名冲刺', trigger: '"追踪排名"', section: 'keywords' },
  { id: 'seo-content-brief', name: '内容大纲生成', description: '按页面类型生成完整Content Brief（标题/大纲/FAQ/内链/Schema）', trigger: '"写内容大纲"', section: 'content' },
  { id: 'seo-content-writer', name: 'SEO 内容写作', description: '按Brief+AEO标准写正文（BLUF首段/段落自包含/列表表格优先/FAQ结构化）', trigger: '"写SEO文章"', section: 'content' },
  { id: 'seo-content-quality', name: '内容质量审核', description: '评估AI引用潜力：信息增量/BLUF结构/EEAT信号/FAQ真实来源/反AI腔', trigger: '"审核内容质量"', section: 'content' },
  { id: 'seo-meta-optimizer', name: 'Meta标签优化', description: '批量检查优化Title/Desc/OG/Twitter Card，含写作规则', trigger: '"优化meta"', section: 'content' },
  { id: 'seo-content-rewrite', name: '内容重写优化', description: '按SERP gap + AEO/GEO标准诊断重写旧页面', trigger: '"重写内容"', section: 'content' },
  { id: 'seo-content-refresher', name: '内容刷新', description: '已排名页面数据/年份/链接轻度更新，维持排名位置', trigger: '"刷新内容"', section: 'content' },
  { id: 'seo-technical-check', name: '技术SEO检查', description: '32项基础设施逐项诊断（robots/sitemap/重定向/Canonical/Hreflang/JS SEO/爬取）', trigger: '"技术SEO检查"', section: 'technical' },
  { id: 'seo-sitemap-config', name: 'Sitemap/Robots配置', description: '生成sitemap+robots+IndexNow，提高爬虫发现效率', trigger: '"配置sitemap"', section: 'technical' },
  { id: 'seo-schema-injector', name: 'Schema 注入', description: '按页面类型注入JSON-LD结构化数据（Article/FAQ/SoftwareApplication/BreadcrumbList/ImageObject）', trigger: '"加schema"', section: 'technical' },
  { id: 'seo-speed-optimizer', name: '页面速度优化', description: 'CWV达标优化（LCP/INP/CLS）+ 图片/JS/CSS/字体降耗', trigger: '"提升速度"', section: 'technical' },
  { id: 'seo-internal-linking', name: '内链优化', description: '内链策略/锚文本/权重分配/主题聚类，每页≥3条非nav内链', trigger: '"优化内链"', section: 'technical' },
  { id: 'seo-entity-optimizer', name: '实体优化', description: '识别关键实体并强化其在内容中的主题实体信号', trigger: '"优化实体"', section: 'technical' },
  { id: 'seo-geo-optimizer', name: 'GEO/AEO 优化', description: 'AI Overview适配+结构化答案+FAQ被AI引用机会优化', trigger: '"优化GEO"', section: 'technical' },
  { id: 'seo-alert-monitor', name: 'SEO 监控告警', description: '排名/流量/异常变化自动监控与通知', trigger: '"设置监控"', section: 'technical' },
  { id: 'seo-backlink-audit', name: '外链审计与策略', description: '25种策略+分阶段执行计划+免费目录提交', trigger: '"外链审计"', section: 'links' },
  { id: 'seo-outreach-writer', name: 'Outreach 邮件', description: '8种场景邮件模板+跟进节奏', trigger: '"写外链邮件"', section: 'links' },
  { id: 'seo-launch-checklist', name: '新站上线清单', description: '9步上线流程逐项验证（域名/HTTPS/GSC/Sitemap/Schema/CWV）', trigger: '"网站上线"', section: 'workflow' },
  { id: 'seo-gsc-analyzer', name: 'GSC 数据分析', description: '关键词/页面/CTR四象限分析+Experiment Log', trigger: '"分析GSC"', section: 'workflow' },
];

export const seoSkills: SeoSkill[] = SKILLS_DATA;

export function getSkill(id: string): SeoSkill | undefined {
  return SKILLS_DATA.find(s => s.id === id);
}

export const SUBSYSTEMS: SeoSubsystem[] = [
  { key: 'site-audit', label: '站内SEO审计', skillId: 'seo-site-audit', phase: 'strategy' },
  { key: 'competitor-gap', label: '竞品差距', skillId: 'seo-competitor-gap', phase: 'strategy' },
  { key: 'competitor-deep', label: '竞品深度分析', skillId: 'seo-competitor-analysis', phase: 'strategy' },
  { key: 'keyword-find', label: '关键词研究', skillId: 'seo-keyword-finder', phase: 'keywords' },
  { key: 'topic-cluster', label: '主题集群', skillId: 'seo-topic-cluster', phase: 'keywords' },
  { key: 'serp-analysis', label: 'SERP分析', skillId: 'seo-serp-analysis', phase: 'keywords' },
  { key: 'rank-track', label: '排名追踪', skillId: 'seo-rank-tracker', phase: 'keywords' },
  { key: 'content-brief', label: '内容大纲', skillId: 'seo-content-brief', phase: 'content' },
  { key: 'content-write', label: 'SEO内容写作', skillId: 'seo-content-writer', phase: 'content' },
  { key: 'content-quality', label: '内容质量审核', skillId: 'seo-content-quality', phase: 'content' },
  { key: 'meta-optimize', label: 'Meta标签', skillId: 'seo-meta-optimizer', phase: 'content' },
  { key: 'content-rewrite', label: '内容重写', skillId: 'seo-content-rewrite', phase: 'content' },
  { key: 'content-refresh', label: '内容刷新', skillId: 'seo-content-refresher', phase: 'content' },
  { key: 'tech-check', label: '技术SEO检查', skillId: 'seo-technical-check', phase: 'technical' },
  { key: 'sitemap', label: 'Sitemap配置', skillId: 'seo-sitemap-config', phase: 'technical' },
  { key: 'schema', label: 'Schema注入', skillId: 'seo-schema-injector', phase: 'technical' },
  { key: 'speed', label: '速度优化', skillId: 'seo-speed-optimizer', phase: 'technical' },
  { key: 'internal-link', label: '内链优化', skillId: 'seo-internal-linking', phase: 'technical' },
  { key: 'entity', label: '实体优化', skillId: 'seo-entity-optimizer', phase: 'technical' },
  { key: 'geo-aeo', label: 'GEO/AEO优化', skillId: 'seo-geo-optimizer', phase: 'technical' },
  { key: 'alert', label: '监控告警', skillId: 'seo-alert-monitor', phase: 'technical' },
  { key: 'backlink', label: '外链审计', skillId: 'seo-backlink-audit', phase: 'links' },
  { key: 'outreach', label: 'Outreach邮件', skillId: 'seo-outreach-writer', phase: 'links' },
  { key: 'launch', label: '上线清单', skillId: 'seo-launch-checklist', phase: 'workflow' },
  { key: 'gsc', label: 'GSC分析', skillId: 'seo-gsc-analyzer', phase: 'workflow' },
];
