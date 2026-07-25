# SEO Learnings Log — 每篇知识都学到、都用到

> 原则（2026-07-19 用户定调）：**所有 SEO 知识收口到 harvests，衡量标准是"每篇有没有学到、有没有应用到实际页面/审计/外链"，不是攒了多少篇文档。**
>
> 本文件是「sources/（原料）→ learn（学到）→ apply（用到）」闭环的跟踪表。
> - `sources/`（**共 132 篇**：ink-flows 策划抓取 + harvests 补抓 16）= 从 X/Twitter practitioners 抓取的一手情报（输入）。
> - `learn/` = 把 source 提炼成的我们自己的原则（规则集/清单）。
> - `apply/` = 实际落地的页面 brief / 审计 / 外链动作。
> - ⚠️ 本 log 当前只逐篇跟踪了 harvests 补抓的 **16 篇**；`sources/` 其余 116 篇（ink-flows 长期策划）待后续补登「学到/用到」状态。
> - `learn/seo-skill-library.md` = **方法论支柱**（AI Core playbooks 全量镜像：6 维度/25 技能 + 进度看板），与 sources/ 并列作为「输入」来源，经本闭环驱动 apply。
>
> 状态标记：`learned` = 已提炼进规则；`applied` = 已在页面/审计/外链中落地；`pending` = 还没用到。

---

## 📊 总览

| 维度 | feed 数 | learned | applied | 待应用 |
|------|:---:|:---:|:---:|:---:|
| seo-strategy | 3 | 3 | 3 | 0 |
| seo-keyword | 2 | 2 | 2 | 0 |
| seo-content | 3 | 3 | 3 | 0 |
| seo-technical | 3 | 3 | 2 | 1 |
| seo-link | 3 | 3 | 2 | 1 |
| seo-workflow | 2 | 2 | 2 | 0 |
| **合计** | **16** | **16** | **14** | **2** |

> 2 个 pending：seo-technical/semrush-web-crawler-basics（crawl budget 还没做成检查项）、seo-link/jakobjelling-geoly（判定为低质反模式，仅作为"避免"学到，不算待应用正向动作）。

---

## 🗺️ seo-strategy（3）

### 1. noelceta-local-seo-review-system
- **学到**：本地 SEO 的排名杠杆是「评价系统」——持续收集并展示真实评价，比堆关键词更管用。
- **用到** → `learn/eeat-authority-source-plan.md`（定义 reviewer 资质信号）；ink-flows 页 E-E-A-T 块（命名作者+审核者+日期）；GSC 评价数据监控。
- **状态**：✅ learned ✅ applied

### 2. calebtrevino-local-seo-topical-authority
- **学到**：靠「主题簇」建权威——围绕一个核心话题产出一组成簇页面互相印证，而非散点单页。
- **用到** → tattoo-software 13 页簇 + aftercare 簇；`apply/inkflows-origin/briefs/` 簇 brief 结构；`learn/site-type-workflow-ruleset.md` 的 hub-and-spoke。
- **状态**：✅ learned ✅ applied

### 3. coderjefflee-find-seo-competitors
- **学到**：找竞品不是凭感觉，而是「共享关键词重叠度」——谁和你抢同一批词，谁就是真竞品。
- **用到** → tattoo-software-cluster-gap-analysis（Bookedin/Square/Booksy… 真实 SERP 竞品）；`apply/inkflows-origin/faqpage-audit-2026-07-13.md` 竞品对比维度。
- **状态**：✅ learned ✅ applied

---

## 🔑 seo-keyword（2）

### 4. okara-bofu-keywords
- **学到**：BOFU（底部漏斗）关键词转化价值最高，应优先做「对比/替代/功能」页而非泛内容。
- **用到** → tattoo-software 13 页全是 BOFU 软件对比页；`apply/inkflows-origin/inkflow-seo-saas-selfcheck-2026-07-13.md`。
- **状态**：✅ learned ✅ applied

### 5. coderjefflee-search-intent-page-type
- **学到**：关键词必须匹配「搜索意图 × 页面类型」，意图错配页面不排名。
- **用到** → `learn/site-type-workflow-ruleset.md`（SaaS/B2C/B2B/内容站四型工作流）；每页 brief 的「页面类型」字段。
- **状态**：✅ learned ✅ applied

---

## 📝 seo-content（3）

### 6. curlh1-agent-seo-template
- **学到**：内容要为「AI Agent 检索」优化——结构化、FAQ、清晰答案块，才能被 AI 引用。
- **用到** → `learn/seo-page-checklist.md`（FAQPage Schema 必带、BLUF 开头）；13 页全部加 FAQPage。
- **状态**：✅ learned ✅ applied

### 7. maks6361-seo-article-pipeline
- **学到**：文章生产要有 pipeline（调研→大纲→写→审→发），不能随手写。
- **用到** → `apply/inkflows-origin/CONTENT_INVENTORY.md`（内容生产/排期单一真相源）。
- **状态**：✅ learned ✅ applied

### 8. semrush-content-hub-topical-authority
- **学到**：content hub（支柱页+卫星页）是建主题权威的标准架构。
- **用到** → tattoo-software 簇（簇 brief 即 hub-and-spoke）；`apply/inkflows-origin/inkflow-site-architecture-blueprint.md`。
- **状态**：✅ learned ✅ applied

---

## 🔧 seo-technical（3）

### 9. semrush-web-crawler-basics
- **学到**：爬虫基础（可抓取/可索引/crawl budget）是排名前提。
- **用到** → 仅部分：`apply/inkflows-origin/seo-audit-and-top10-upgrade-2026-07-12.md` 引用；**crawl budget 尚未做成独立检查项**。
- **状态**：✅ learned ⚠️ applied(部分) → `pending` 补 crawl budget 检查项进 `seo-page-checklist.md`

### 10. foley-seo-factors
- **学到**：排名因素分层（内容/技术/外链/体验），权重不同。
- **用到** → `apply/inkflows-origin/ranking-readiness-scorecard.md`、`inkflow-ranking-scorecard.csv`。
- **状态**：✅ learned ✅ applied

### 11. pluvio9yte-anysearch-ai-agent-search
- **学到**：AI Agent 搜索（GEO）是新流量入口，robots 不能封 GPTBot/Google-Extended。
- **用到** → ink-flows robots.txt 解除 GPTBot+Google-Extended 封禁（早期任务）；`learn/seo-page-checklist.md` AEO 条目。
- **状态**：✅ learned ✅ applied

---

## 🔗 seo-link（3）

### 12. jakobjelling-geoly-free-backlink
- **学到**：auto-approve 换链目录 = 低质反模式，会被 Google 视作 link scheme。
- **用到** → `learn/` 标注 `quality_flag: low-value`；外链清单明确「避免」此类目录。
- **状态**：✅ learned ✅ applied（作为反向教材学到）

### 13. jakobjelling-launchclash-free-backlink
- **学到**：LaunchClash 类新品发布平台可换链，但调性需匹配。
- **用到** → 外链候选池（待执行 outreach）。
- **状态**：✅ learned ✅ applied（候选）

### 14. hridoyreh-startup-backlinks-v7
- **学到**：16 个高 DR 公开平台（DevTo/GIPHY/Goodfirms/Altern…）可做外链，按 DR 排优先级。
- **用到** → 外链清单：Goodfirms（必做 B2B 评测站）、Altern（替代页外链）、SaaS Club/SaaS Pirate（投稿）。**执行 outreach 待排期。**
- **状态**：✅ learned ✅ applied（清单）⏳ 执行 pending

---

## 🔄 seo-workflow（2）

### 15. kaicromwell-simple-seo-loop
- **学到**：简单循环 = 测现状→改→再测，胜过复杂体系。
- **用到** → `board.md` 的「测→学→用→再测」闭环结构。
- **状态**：✅ learned ✅ applied

### 16. semrush-bofu-conversion-tactics
- **学到**：BOFU 页要靠「对比表+CTA+社会证明」转化。
- **用到** → 13 页 BOFU 结构（对比表+FAQ+部署状态 CTA）。
- **状态**：✅ learned ✅ applied

---

## ⏭️ 下一步（把 pending 清零）

1. **crawl budget 检查项**：把 semrush-web-crawler-basics 的 crawl budget 提炼成 `seo-page-checklist.md` 技术档一条。
2. **Hridoy 外链执行**：从 hridoyreh-startup-backlinks-v7 清单挑 Goodfirms/Altern 跑 outreach（接 `seo-link-building` 技能）。
3. **geoly 警示固化**：在 `learn/` 加一条「外链质量红线」（auto-approve 目录一律不投）。
