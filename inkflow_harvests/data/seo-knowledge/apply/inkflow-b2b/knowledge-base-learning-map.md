# InkFlow SEO 知识库 — 逐文件学习地图（Learning Map）

**生成：** 2026-07-12 ｜ **触发：** 用户问"知识库里面的你都挨个学习了吗" → 此前只按需读过约 7 个技能，本次用 Explore 子代理系统通读全部 21 个 seo-* SKILL.md + 8 份 seo-targets 文档 + 营销站源码，逐文件标注核心方法 / 硬规则 / 在 InkFlow 的落地状态 / 缺口。

**总判定：** 页面内 SEO（Meta、Schema、BLUF、AEO/FAQ、内链、技术地基 robots/sitemap/IndexNow）已 IMPLEMENTED/PARTIAL，质量扎实。最大短板集中在 **off-page 外链、E-E-A-T 权威来源升级、内容深度、GSC 数据迭代、符号页结构化数据、CWV 实测** 六项——正好对应排名模型权重最高的杠杆（+156% 外链、+89% 原创数据、+92% 意图匹配）。

状态统计：**IMPLEMENTED 3 · PARTIAL 9 · NOT-STARTED 9**（21 个技能）。

---

## 逐技能地图

| # | 技能 | 状态 | 一句话落地判定 |
|---|------|------|----------------|
| 1 | seo-backlink-audit | NOT-STARTED | `backlinks_day1=0`，无任何外链追踪表 |
| 2 | seo-competitor-gap | NOT-STARTED | 无竞品 SEO 差距矩阵（仅产品对比页） |
| 3 | seo-content-brief | PARTIAL | 模板已实现结构，但无逐页 Brief 文档 |
| 4 | seo-content-rewrite | PARTIAL | 已加 dataInsights，但薄页扩写/来源升级未执行 |
| 5 | seo-content-writing | IMPLEMENTED | `[category].astro` 严格遵循 BLUF+FAQ+自包含；品牌声音已落地 |
| 6 | seo-gsc-analyzer | NOT-STARTED | 无 GSC 数据，未检 GA4/GSC 代码 |
| 7 | seo-keyword-finder | PARTIAL | keyword-map.csv 已做意图映射，但无 5 维评分 |
| 8 | seo-keyword-research | PARTIAL | 长尾/分组思想已体现，5 维打分未产出 |
| 9 | seo-launch-checklist | PARTIAL | 技术项已落地，但无核对报告、GA4/GSC 缺失 |
| 10 | seo-link-building | NOT-STARTED | 零外链活动、目录提交、outreach |
| 11 | seo-meta-optimizer | IMPLEMENTED | `SEOHead.astro` 集中注入 Title/Desc/OG/Twitter/hreflang |
| 12 | seo-outreach-writer | NOT-STARTED | 无 outreach 邮件草稿（依赖 #10 启动） |
| 13 | seo-schema-injector | PARTIAL | category 页 Schema 完整；**70 符号页缺 Article/FAQPage** |
| 14 | seo-site-audit | NOT-STARTED | 无审计产出物，但基础设施已达标 |
| 15 | seo-sitemap-config | IMPLEMENTED | `@astrojs/sitemap` + robots Allow AI + IndexNow key 就位 |
| 16 | seo-speed-optimizer | PARTIAL | Astro SSG 利于 CWV，但无 Lighthouse 实测 |
| 17 | seo-strategy | PARTIAL | 零散落地，无整合战略文档/竞品计分卡 |
| 18 | seo-technical | PARTIAL | URL/canonical/OG/Schema/面包屑达标；来源仍全 Wikipedia |
| 19 | seo-technical-check | PARTIAL | 基础设施齐，未跑 32 项正式检查报告 |
| 20 | seo-topic-cluster | PARTIAL | meaning 集群合格；跨板块（blog↔features↔meaning）弱 |
| 21 | seo-workflow-growth | PARTIAL | 9 步已落地；无 GSC 复盘/分发节奏/CRO |

---

## 各技能核心方法与缺口（详解）

### IMPLEMENTED（3）
- **seo-content-writing**：14 维「页面类型×格式×Schema」矩阵 + AEO 四法则（直接回答/问答/列表表格/FAQ Schema）。已落地：`[category].astro` 的 BLUF 首段、`All X Meanings` 网格、FAQ、Original Data 段；`inkflow-brand-voice-style-guide.md` 落地 4 组件品牌声音。**下一步**：把声音测试协议（4 指标≥8）应用到 11 薄页 + 70 符号页。
- **seo-meta-optimizer**：Title≤60 前置、Description≤160 含 CTA、OG 5 项、Twitter Card。**已落地**：`SEOHead.astro` 全站注入，category/symbol 页均调用。**缺口**：少数非 meaning 页 og:image 用默认图，需跑全站扫描确认无重复。
- **seo-sitemap-config**：robots 含 Sitemap 声明、Astro `@astrojs/sitemap`（`site` 必填）、IndexNow key。**已落地**：`astro.config.mjs` 集成 + `public/robots.txt` 显式 Allow AI 爬虫 + `inkflow-indexnow-key-2026.txt`。**小优化**：sitemap 加 changefreq/priority。

### PARTIAL（9）
- **seo-content-brief**：标准 Brief（Title/Meta/H1/大纲/关键词/内链/Schema/Snippet 目标）。模板已体现结构（BLUF+H2+FAQ+网格内链+dataInsights），但**无逐页 Brief 文档**。
- **seo-content-rewrite**：50 分制（BLUF/EEAT/深度/可读/转化）+ AEO 四法则。已加 dataInsights；**薄页 350→2000 词扩写与来源升级未执行**。
- **seo-keyword-finder / seo-keyword-research**：5 维评分 + 意图分类 + 分组聚合 + Hub-and-Spoke。**已做**：keyword-map.csv 意图映射 + 长尾思想。**未做**：`kd` 列仍 `TBD`，5 维未产出打分；meaning 集群未正式定义为站点级支柱。
- **seo-launch-checklist / seo-technical-check**：9 步上线 + 32 项基础设施检查。**技术项已落地，但无核对报告，GA4/GSC 验证代码缺失**（grep 无 `gtag/G-/GTM-`）。
- **seo-schema-injector**：按页型注入 JSON-LD。**category 页完整（CollectionPage+Person+FAQPage+SoftwareApplication+Org+BreadcrumbList）；70 符号页 `[symbol].astro` 缺 Article/FAQPage/dataInsights**（grep 命中 0）。
- **seo-speed-optimizer / seo-technical**：CWV 目标 LCP≤2.5s/INP≤200ms/CLS≤0.1。Astro SSG 天生友好，**但无 Lighthouse 实测，未验证 WebP/LCP 预加载**。
- **seo-strategy / seo-workflow-growth / seo-topic-cluster**：150 策略 + 9 步工作流 + Hub-and-Spoke。**零散落地，缺整合战略文档、月度 GSC 复盘、Social SEO Day1/3/7 分发、跨板块内链**。

### NOT-STARTED（9）
- **seo-backlink-audit / seo-link-building / seo-outreach-writer**：外链完全为零。最大缺口——Ceta 模型「发布日外链」单因子 +156%。需从 B2B 目录（G2/Capterra/Trustpilot）+ 纹身 Niche（tattoodo/inkstinct/展会）起步，建追踪表，每天 3–5 个。
- **seo-competitor-gap**：无竞品差距矩阵。需挑 3 个纹身 SaaS（Booksy/Mangomint）抓页面对比。
- **seo-gsc-analyzer**：无 GSC/GA4 数据。需部署验证 → 四象限分析（高排高点击/高排低点击/低排高展示/低排低点击）。
- **seo-site-audit**：未跑正式审计产出。
- **seo-outreach-writer**：需 3 套邮件（资源页/GP/免费工具）对应 Niche 清单。

---

## 跨知识库最高杠杆缺口（按优先级）

1. **外链 off-page = 0**（#1/#10）—— 分数模型最大单因子 +156%。行动：B2B 目录 + 纹身 Niche，建追踪表。
2. **E-E-A-T 来源仍全 Wikipedia**（#18/#4）—— `eeat-authority-source-plan.md` 已核实 Smithsonian/IBISWorld/Ipsos/Jung/大英博物馆，待落地 1–6 类 + 全局 `EEAT_EXPERIENCE`。
3. **薄页深度**（#4）—— 11 类 ~350 词、4 类 ~1000 词，距 2000+ 词（Ceta +25 分）差距大；70 符号页偏薄。优先扩 geometric→cultural/religious。
4. **GSC/GA4 未接入**（#6/#9）—— 无数据无法月度复盘、11–20 冲刺、CTR 优化。
5. **70 符号页 Schema 缺口**（#13）—— 最高搜索量页缺 Article/FAQPage，最可惜。
6. **CWV 未实测**（#16）—— 跑移动端 PageSpeed，5 个快速修复。
7. **发布/分发未完成**（#9/#21）—— 核对报告、激活 GSC/GA4、Social SEO Day1/3/7。
8. **竞品差距 + 关键词 5 维评分**（#2/#7/#8）—— 对 keyword-map 中 `gap` 30+ 词打分，产出竞品矩阵。

---

## 建议的 90 天执行序列

- **第 1–2 周（权威 + 深度）**：落地 E-E-A-T 来源升级（1–6 类 + 全局）；扩 geometric/cultural/religious 到 2000+ 词；给 70 符号页加 Article+FAQPage Schema。
- **第 3–4 周（数据 + 技术）**：部署 GA4/GSC/Bing 验证；跑 PageSpeed + sitemap/robots/32 项检查出报告。
- **第 5–8 周（off-page）**：B2B 目录提交 + 纹身 Niche 外链 + 3 套 outreach 邮件；建外链追踪表。
- **第 9–12 周（迭代）**：首份 GSC 四象限复盘 + 月度节奏；竞品差距矩阵；跨板块主题集群内链。

> 注：以上状态为 2026-07-12 通读结论。X 推文（Ceta 排名模型 + 品牌声音）已分别入库并落成工具，不计入上述 21 技能，见 `noel-ceta-*` 与 `inkflow-brand-voice-style-guide.md`。
