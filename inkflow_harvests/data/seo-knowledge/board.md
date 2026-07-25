# 📊 InkFlow SEO 进度看板 / 资源中心

> **定位（2026-07-19）**：所有 SEO 知识**单一收口到 harvests**（`InkFlow_Project/inkflow_harvests/data/`）。
>
> **按项目分桶做**（用户 2026-07-19 纠正）：母库在 harvests，但落地应用**分两条业务线**，不混在一个桶：
> - `apply/inkflows-consumer/` = **ink-flows.com 消费侧**（纹身含义内容站，B2C 内容站）
> - `apply/inkflow-b2b/` = **InkFlow B2B SaaS**（harvests 产品 + ink-flow-manager 营销站，卖订阅/软件给工作室与供应商）
> - `sources/`（167 文件 / 132 .md practitioner 情报）与 `learn/`（7 篇提炼原则，含**全量技能库**）**跨项目共用**，不分桶。
>
> **衡量标准不是"攒了多少篇"，而是「每篇 feed 学到没有、用到没有」**——闭环见 `learn/seo-learnings-log.md`。
>
> 三层结构：`sources/`(原料) → `learn/`(提炼) → `apply/`(应用，按项目分桶)。
>
> **🔗 融合（2026-07-19）**：本看板与产品内「技能知识库」(`SeoSkillLibrary.tsx` ← AI Core `seo_playbook_*`) 已双向融合。方法论**全量**落 `learn/seo-skill-library.md` = **6 维度 / 62 模块 / 316 知识点 / 25 技能**（即"几百条 SEO 技能知识库"，由 `D:/harvests-ai-core/scripts/seed-seo.mjs` 抽出，配套 `seo-playbooks.json`），作为 harvests 融合锚点/单一真相源；资源中心 `center.html` 每个板块同时挂载「技能库方法论 + harvests 情报/应用」。AI Core/D1 仅运行态，改以 harvests 文件为准。

## 导航（9 板块）
1. [📡 获客](#1-获客-acquisition)
2. [🔍 SEO 工具](#2-seo-工具)
3. [💡 产品战略](#3-产品战略)
4. [🏷️ Topical Authority](#4-topical-authority)
5. [🔍 OG Checker](#5-og-checker)
6. [📊 Content Gap](#6-content-gap)
7. [📚 技能知识库](#7-技能知识库)
8. [📊 SEO 进度看板](#8-seo-进度看板本页状态)
9. [📣 社媒技能知识库](#9-社媒技能知识库多平台-smm)

---

## 0. 🔁 学→用闭环（核心）

不是收藏夹，是引擎。每个 feed 都要走完：

```
sources/(原料) ──学──▶ learn/(原则) ──用──▶ apply/(页面/审计/外链) ──测──▶ 回到 sources/ 更新
```

- **学到了吗？** → 提炼进 `learn/` 的规则集/清单。
- **用到了吗？** → 落到某项目某页面 / 审计 / 外链动作（标所属项目桶）。
- **追踪表** → `learn/seo-learnings-log.md`（当前覆盖 harvests 补抓 16 篇；sources 167 文件 / 132 .md 全量待扩展）。

---

## 1. 📡 获客 (Acquisition)
把 SEO 流量转为预约 / 注册 / 付费。
- **外链资产（`sources/`，3 篇）**：jakobjelling-geoly-free-backlink（反向教材）、jakobjelling-launchclash-free-backlink、**hridoyreh-startup-backlinks-v7**（Goodfirms / Altern / DevTo 等 16 个高 DR 平台）
- **相关技能**：`seo-backlink-audit`、`seo-link-building`、`seo-outreach-writer`
- **已建页获客角度**：
  - 🟦 B2B：tattoo-software 13 页统一主打「免费独立站 + 零 per-seat 费 + 已被 Google 收录」
  - 🟩 消费侧：ink-flows.com 内容页靠含义/长尾词引流，转工作室预约

## 2. 🔍 SEO 工具
落地 / 排查用工具型技能（跨项目共用）：
- `seo-meta-optimizer`（Title/Desc/OG）、`seo-schema-injector`（结构化数据）、`seo-technical-check`（robots/sitemap/重定向）、`seo-speed-optimizer`（CWV）、`seo-sitemap-config`（sitemap/IndexNow）、`seo-gsc-analyzer`（GSC 数据）、`seo-site-audit`（150+ 因子）、`seo-keyword-finder` / `seo-keyword-research`（挖词）

## 3. 💡 产品战略
SEO 与产品定位对齐：
- **`sources/`（3 篇）**：noelceta-local-seo-review-system、calebtrevino-local-seo-topical-authority、coderjefflee-find-seo-competitors
- **技能**：`seo-strategy`、`seo-workflow-growth`、`seo-saas`（InkFlow = SaaS 站型）
- **差异卖点**：真·独立站 + 开箱即用 + 已被收录 + 免费起步（🟦 B2B 主线）

## 4. 🏷️ Topical Authority
主题权威 / 内容枢纽：
- **`sources/`（3 篇）**：curlh1-agent-seo-template、maks6361-seo-article-pipeline、semrush-content-hub-topical-authority
- **技能**：`seo-topic-cluster`、`seo-content-writing`、`seo-content-brief`
- **已落地主题簇**：
  - 🟦 B2B：`apply/inkflow-b2b/briefs/tattoo-software-cluster-brief.md`（13 页软件簇）
  - 🟩 消费侧：`apply/inkflows-consumer/` 的 tattoo-meaning 内容簇 + longtail 矩阵

## 5. 🔍 OG Checker
Open Graph / 社交分享标签检查：
- **技能**：`seo-meta-optimizer`（OG 标签）、`seo-schema-injector`
- 每页需含 `og:title` / `og:description` / `og:image` / `canonical`（见 `learn/site-content-seo-ruleset.md` 第 3/4 节）

## 6. 📊 Content Gap
内容差距分析：
- **🟦 B2B 已落地**：`apply/inkflow-b2b/briefs/tattoo-software-cluster-gap-analysis.md`（对手 Bookedin / Square / Booksy / Vagaro / Acuity / Tattit / SkunkCRM 等）、`tattoo-software-cluster-brief.md`（13 页逐页结构）
- **🟩 消费侧数据**：`apply/inkflows-consumer/tattoo-meaning-keyword-map.md`、各类 longtail / page_plan / page_topic_audit
- **技能**：`seo-competitor-gap`、`seo-content-brief`、`seo-keyword-research`
- **`sources/`（2 篇）**：okara-bofu-keywords、coderjefflee-search-intent-page-type

## 7. 📚 技能知识库
全部文件级索引 → `kb-index.md`（本目录单一来源）。
- `sources/` 167 文件（132 .md，X 抓取情报，跨项目共用）
- `learn/` 7 篇（规则集 / 清单 / E-E-A-T 计划 / 工作流 / **learnings-log** / **seo-skill-library.md（全量 316 知识点）+ seo-playbooks.json**，跨项目共用）
- `apply/inkflows-consumer/` 16 篇（ink-flows.com 消费侧：tattoo-meaning / longtail / page_plan / gsc / 审计 / changelog）
- `apply/inkflow-b2b/` 17 篇 + `briefs/` + `inkflow-manager/`（InkFlow B2B：tattoo-software briefs / b2b-saas-ranking / 品牌声量 / 架构蓝图 / onelegchris / noel-ceta）
- 📣 **社媒技能知识库（独立目录 `../social-knowledge/`）** — 多平台 SMM（IG/TikTok/X/小红书）**6 维度 / 30 模块 / 226 知识点 / 20 技能**，全量落 `social-skill-library.md` + `social-playbooks.json`。目标挂载 `harvests.pages.dev/#/inkflow-outreach` 的**社媒板块**（见板块 9）。

---

## 8. 📊 SEO 进度看板（本页状态区）

### 8.1 🟦 InkFlow B2B — 已建页面（ink-flow-manager 营销站 13 个 tattoo-software 根页）
| 页面 | 主词 | 内容 | Schema(FAQ+SA) | build | deploy | commit |
|------|------|:---:|:---:|:---:|:---:|:---:|
| tattoo-crm-software | tattoo CRM software | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-appointment-booking | tattoo appointment booking | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-scheduler | tattoo scheduler | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-booking-app | tattoo booking app | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-business-management | tattoo business management software | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-client-management | tattoo client management software | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-commission-software | tattoo commission software | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-consent-form-app | tattoo consent form app | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-deposit-software | tattoo deposit software | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-payment-processing | tattoo payment processing | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-pos-system | tattoo POS system | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-scheduling-software | tattoo scheduling software | ✓ | ✓ | 待 | 待 | 待 |
| tattoo-waiver-app | tattoo waiver app | ✓ | ✓ | 待 | 待 | 待 |

> 内容 + Schema 已齐；统一待 `npm run build` 验证 → push main 部署 → git commit（注意 `gsc-key.json` 等敏感文件勿提交）。
> 蚕食预警：预约家族 4 页（appointment-booking / scheduler / booking-app / scheduling-software）需确认互链到位；预存在根页 `tattoo-appointment-scheduler.astro`（真实内容）待蚕食审计。

### 8.2 🟩 ink-flows.com 消费侧 — 页面状态（待补）
- 内容簇 `tattoo-meaning`（15 分类 × 70 符号）、longtail 矩阵、page_plan 的落地状态见 `apply/inkflows-consumer/`。
- 待补：消费侧各页的「内容 / Schema / build / deploy」状态表（与 B2B 13 页同格式）。
- 已知待办（用户历史）：① 11 个薄页扩至 2000+ 字；② 来源 Wikipedia→Ipsos/IBISWorld/Smithsonian/Jung；③ 修 robots.txt 解除 GPTBot+Google-Extended 封禁。

### 8.3 知识学→用状态（跨项目）
- **sources 共 167 文件（132 .md）**：learnings-log 当前覆盖 harvests 补抓 16 篇（14 applied / 2 pending：crawl budget 检查项、Hridoy 外链执行），全量待扩展 → 详见 `learn/seo-learnings-log.md`
- **待补动作**：Mehrab 委托清单尚未在已收录页执行（GSC Top10 + 每页 3 内链 + FAQ + 刷新日期）

### 8.4 下一步
1. build 验证 B2B 13 页 + push `main` 部署（ink-flow-manager 营销站）
2. 把 `seo-learnings-log.md` 的 2 个 pending 清零（crawl budget 检查项 / Hridoy 外链 outreach）
3. 蚕食审计（预约家族 + tattoo-appointment-scheduler）
4. 补 8.2 消费侧页面状态表

---

---

## 9. 📣 社媒技能知识库（多平台 SMM）

> **新建于 2026-07-19**：此前社媒技能知识库**未建立**，本次在 harvests 首建，独立于 SEO 库（`seo-knowledge/`）成目录 `social-knowledge/`，作为 harvests 知识中心第二根技能支柱。
> 目标挂载点：`https://harvests.pages.dev/#/inkflow-outreach` 的**社媒板块**（本次仅建内容，页面接线待做）。

**规模**：6 维度 · 30 知识模块 · **226 知识点** · 20 操作技能 · 20 看板技能 · 20 子系统 · 1 看板项目。
**平台覆盖**：Instagram · TikTok · X/Twitter · 小红书（含纹身工作室获客场景）。

**6 大维度**：
1. 社媒内容战略（选题/日历/形式/人设/支柱）
2. 钩子与文案（3秒钩子/标题公式/Caption/CTA/故事）
3. 平台战术（IG/TikTok/X/小红书 各成章 + 跨平台矩阵）
4. 涨粉与算法（推荐逻辑/发布时机/互动/合作/热点）
5. 转化与获客（私域引流/纹身工作室/DM话术/落地页/社群）
6. 数据与分析（核心指标/A-B/复盘/工具/数据选题）

**文件**（单一真相源，结构对齐 SEO 库）：
- `social-knowledge/social-skill-library.md` — 全量人类可读
- `social-knowledge/social-playbooks.json` — 机器可读（未来可 seed 进 D1）
- `social-knowledge/index.md` — 社媒库索引

**后续接线（待做）**：AI Core 加 `seed-social.mjs` → D1 `social_playbooks` → 前端 `SocialSkillLibrary.tsx` 拉取 `/harvests/social/playbooks` → outreach 页社媒板块挂载。

---

建议下一步：先 `npm run build` 验证 B2B 13 页并 push `main` 部署；同时清零 learnings-log 的 2 个 pending。
