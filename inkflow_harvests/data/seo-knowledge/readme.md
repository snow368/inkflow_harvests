# SEO 知识库

> 本知识库是 InkFlow Manager 项目的 SEO 基础设施。
> 所有 SEO 规则、策略、最佳实践在此沉淀。
> 未来任何新项目可直接引用此知识库。

---

## 目录结构

```
D:\ink-flow-manager\seo-knowledge\
├── index.md                              ← 通用知识库（算法/排名/技术SEO）
├── fetch-x.sh                            ← X 快速抓取工具
│
├── framework/                            ← 通用方法论
│   ├── keyword-research.md               ← 关键词研究 + KD 判断
│   ├── workflow-kickstart.md             ← 建站 9 步启动流程
│   ├── workflow-saas.md                  ← SaaS 站上线工作流
│   ├── workflow-b2b.md                   ← B2B 站上线工作流
│   ├── workflow-b2c.md                   ← B2C 站上线工作流
│   ├── javascript-seo.md                 ← JS SEO 规范
│   ├── international-seo.md              ← 国际化/多语言
│   ├── seo-geo-writing-standard.md       ← GEO 写作标准
│   └── ... (共 26 个文件)
│
├── sources/                              ← 外部来源分析（49 个）
│   ├── ahrefs-blog.md                    ✅ 数据驱动 SEO
│   ├── connor-showler-gsc-optimization.md ✅ GSC 4-20 位优化法
│   ├── david-gquaid-pseo-scaled-content.md ✅ pSEO 增长逻辑
│   ├── kai-cromwell-seo-long-game.md     ✅ SEO 长期心态
│   ├── frontend-prince-cro-homepage-redesign.md ✅ 首页 CRO
│   ├── ali-habib-google-shopping-scaling.md ✅ Google Shopping 路线图
│   ├── irentdumpsters-gbp-verification-traps.md ✅ GBP 验证陷阱
│   ├── CoderJeffLee.md                     ✅ SaaS SEO 最完整
│   ├── JoeyYUDENG.md                       ✅ AI 目录站提交
│   ├── jasminelocalseo-local-ai-citation.md ✅ 本地 AI 引文
│   ├── jasminelocalseo-rankings-vs-recommendations.md ✅ Rankings vs 推荐（GEO）
│   ├── mdanassaif-directory-submission.md   ✅ Manual directory submission
│   ├── semrush-tofu-mofu-bofu-content-funnel.md ✅ TOFU/MOFU/BOFU 内容漏斗
│   ├── 054-agent-reach-tool.md             ✅ AI Agent 互联网内容读取工具
│   ├── 055-email-open-rate-sweet-spot.md   ✅ Email 打开率 45-50% sweet spot
│   ├── 056-saturday-night-seo-tips.md      ✅ Top 3 排名扩张策略
│   ├── 057-ge-ai-visibility-microsoft-clarity.md ✅ GEO 时代 AI Visibility 监控
│   ├── 058-email-open-rate-thread.md       ✅ Email 打开率提升 thread
│   ├── 059-ai-search-local-seo-playbook.md ✅ AI Search 本地 SEO 完全指南
│   ├── 060-seo-ai-future-real-relationships.md ✅ SEO 与 AI：真实关系外链
│   ├── 061-ai-saas-payment-page-checklist.md ✅ AI 工具站支付页避坑清单
│   ├── 062-buyer-decision-tool-local-seo.md ✅ 最佳本地内容 = 买家决策工具
│   ├── 063-25-ai-cited-sources-map-pack.md ✅ 25 个 AI 引用来源清单
│   ├── 064-video-seo-relationship-link-building.md ✅ Dave Quaid 视频：真实关系外链
│   └── ... (共 49 个)
├── projects/                             ← InkFlow 可执行方案（22 个）
│   ├── inkflow-keywords.md               ✅ 56 个词按梯队排
│   ├── inkflow-backlink-list.md          ✅ 精选 25 + 完整池 259
│   ├── inkflow-website-plan.md           ✅ 32+ 页架构 + 导航
│   ├── inkflow-content-plan.md           ✅ 第 1 月 18 篇规划
│   └── inkflow-seo-complete.md           ✅ 完整手册
│
├── keyword-research/
│   └── keywords-all-languages.csv        ← 多语言关键词数据
│
└── decisions/
    └── conflict-log.md                   ← 冲突观点记录
```

---

## 已学来源（59 个）

### 方法论与工具（通用）
| 来源 | 核心贡献 |
|------|---------|
| Ahrefs Blog | 数据驱动 SEO、自动化工作流、GEO 引用分析 |
| Connor Showler | GSC 4-20 位排名优化法 |
| Dave Quaid | pSEO 增长逻辑 + Saturday Night SEO Tips + 真实关系外链视频 |
| Jesper Nissen | Image SEO via YouTube + Schema
| Vibe Marketers HQ (@vibemarketersHQ) | AI 引用内容的 3 条规则 |
| Chris Long (@chris_nectiv) | Accessibility Tree = AI 代理的"高精度地图" |
| Jasmine Local (@jasminelocalseo) | Rankings 不是产品，被推荐才是（GEO） |
| Semrush (@semrush) | TOFU/MOFU/BOFU 内容漏斗模板 |
| @5le / @BrianEDean / @timsoulo / @Kevin_Indig | — |
| @KristinaAzarenko ✅ | 技术 SEO |
| @Kasra_Dash ✅ | SEO 测试方法论 |

### B2B SaaS SEO
| 来源 | 核心贡献 |
|------|---------|
| @CoderJeffLee | SaaS SEO 小册子、seo-audit-skill、GEO |
| @JoeyYUDENG | AI 目录站提交、SaaS SEO |
| coreyhainesco | SaaS 内容营销 |
| connorgillivan | SEO 漏斗策略 |
| ericlancheres | 关键词聚类 |
| dan-rosenthal | LinkedIn 入站引流 |
| linkedin-agency-system | LinkedIn 代理系统 |

### B2C 电商 SEO（参考）
|| 来源 | 核心贡献 |
||------|---------|
|| @Frontend_Prince | 首页 CRO 优化前后对比 |
|| @AliHabibPPC | Google Shopping 从 0 到 $100K/月 |
|| @KaiCromwell | Shopify SEO 博客合集 + 页面设计排名提升 |
|| wannercashcow | Niche Bending 策略 |
|| @IdrisEcom_email | Email 打开率 45-50% sweet spot |

### 本地 SEO
| 来源 | 核心贡献 |
|------|---------|
| @irentdumpsters (Bodhi) | GBP 验证致命细节 + AI Search 本地 SEO 完全指南 |
| @boringlocalseo | 对比页/钱页对比 + 买家决策工具内容 |
| @LocalSEO_Guy | 25 个 AI 引用来源清单（BBB、Clutch、G2 等） |
| irentdumpsters | 本地品牌建设 |
| jasminelocalseo | 本地 AI 引文 / Rankings vs 推荐 |

### 外链建设
| 来源 | 核心贡献 |
|------|---------|
| @mdanassaif | Manual directory submission（30-100 高质量目录） |

### 中文出海圈
| 账号 | 类型 | 核心贡献 |
|------|------|---------|
| @hezhiyan7 | 内容站 | 低KD打法、免费外链、aichuhai.dev |
| @sujingshen | 工具 | backlink-pilot、259 目录站 |
| @anson7956 | 外链打卡 | DR91 免费外链、每日打卡 |
| @houzhongji89090 | 外链分享 | DR80-90 免费外链 |
| @daluoseo | SEO服务 | 5000外链清单、SEO博客 |
| @lvloomystery | 资源 | SEO 0-100 手册大纲 |
| @enzoflow0523 | 技术 | Codex/AI 工具 |
|| @CoderJeffLee | LinkedIn 代理系统
|| @CoderJeffLee | GEO 时代 AI Visibility 监控（微软 Clarity）
|| @xiaojianjian567 | 工具 | Agent Reach（AI Agent 互联网内容读取，22k stars）
