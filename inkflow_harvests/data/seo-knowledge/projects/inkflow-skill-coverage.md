# InkFlow SEO SKILL 覆盖率看板（ink-flows.com）

> 用途：针对 **ink-flows.com（Astro 营销站）+ app.ink-flows.com（React App）** 单个项目，
> 列出已匹配的 SKILL、完成度、未做的、缺什么。配合 `framework/skill-selection-guide.md` 使用。
> 选型依据：InkFlow = **SaaS** → backbone = `seo-saas`。
>
> 生成日期：2026-07-17 ｜ 数据来源：working-memory（53 页 on-page 审计 `scratch/audit_report.md` + 11 页信任层提质工作 + 已知 OPEN 缺口）
> ⚠️ 完成度为**估算**，以最近一次硬审计（53 页）为基线；11 页提质为后续补充，部分项已变化，部署后需重测复核。
>
> 🔁 **本文件已被 App 内「SEO 进度看板」取代（可复用、按项目自动生成）**：在 app.ink-flows.com 的 Dev 后台进入 `/seo-board`（获客 SEO 工具区），每个 SEO 项目自动生成一份进度看板；每个子系统行都挂出驱动它的 skill（✏️ 可编辑，点开看 SKILL.md + 仓库路径）。**新增项目只需在 `src/lib/seoCoverage.ts` 的 `seoProjects` 加一条 + `status` 映射**，看板即自动生成，无需手维护表格。下方为 ink-flows.com 的历史单项目快照，仅供参考。

---

## 一、总览（计数）

| 状态 | 数量 | SKILL |
|---|---|---|
| ✅ 已完成（工具/审计层面） | 2 | `seo-technical-check`、`seo-site-audit` |
| 🟡 进行中 / 部分完成 | 13 | `seo-saas`、`seo-launch-checklist`、`seo-keyword-research`、`seo-competitor-gap`、`seo-keyword-finder`、`seo-content-brief`、`seo-topic-cluster`、`seo-content-writing`、`seo-content-rewrite`、`seo-schema-injector`、`seo-meta-optimizer`、`seo-strategy`、`seo-workflow-growth` |
| 🔴 阻塞（依赖部署/外部） | 2 | `seo-sitemap-config`（IndexNow 阻塞）、`seo-speed-optimizer`（需部署测 CWV） |
| ⚪ 未开始 | 4 | `seo-link-building`、`seo-backlink-audit`、`seo-outreach-writer`、`seo-gsc-analyzer` |

**头号短板**：外链四件套全 0（backlinks=0，是 Noel +156% 头因子）、部署后验证（CWV/GSC）未做。

---

## 二、主覆盖率表（SKILL × 状态 × 缺口）

| SKILL | 阶段 | 状态 | 完成度 | 缺口 / 待办 | 证据 |
|---|---|---|---|---|---|
| **seo-saas**（backbone） | 全程 | 🟡 | ~70% | 对比页 L6 编辑方法论具名未做；评分尺度 /5 未统一 /10；features 页 V3 真实 quote / V5 Capterra 缺真实数据 | 全站按 SaaS 架构建；L/V 规则已落地部分 |
| **seo-launch-checklist** | 0 启动 | 🟡 | ~60% | E-E-A-T 具名未全站；IndexNow 阻塞；CWV 未测；部分页薄（<400 词 占 32%） | 站已上线，但预上线清单有遗留 |
| **seo-keyword-research** | 1 | 🟡 | ~50% | 西语词未研；长尾/程序化未系统化 | `inkflow-keywords.md` 等 exists |
| **seo-competitor-gap** | 1 | 🟡 | ~50% | 仅部分 TOP10 反推，未全词覆盖 | `framework/content-gap-matrix.md` 做过 WaiverKit 等 |
| **seo-keyword-finder** | 1 | ⚪ | ~30% | 5 维评分映射未全做 | — |
| **seo-content-brief** | 2 | 🟡 | ~50% | 多页缺正式 brief | 部分页有 brief |
| **seo-topic-cluster** | 2 | 🟡 | ~50% | 集群拓扑未全；Phase1 内链 242 条已完成 | `scratch` 内链数据 |
| **seo-content-writing** | 3 | 🟡 | ~70% | 11 页 FAQ 为「假设问题」非真实来源；em-dash 滥用待削 | 53 页大量已写；11 页提质 |
| **seo-content-rewrite** | 3 | 🟡 | ~40% | 待统一评分 /10 + L6 具名 + 真实 FAQ 来源 | 11 页已加信任层/FAQ（未提交） |
| **seo-technical-check** | 4 | ✅ | 100%(审计) | 整改未全跟进 | `scratch/audit_pages.py` 跑 53 页 |
| **seo-schema-injector** | 4 | 🟡 | ~60% | Person 作者未全站（compare/features 仍匿名）；V5 Capterra 缺 | about/symbol 页已加 Person+FAQPage+ImageObject |
| **seo-meta-optimizer** | 4 | 🟡 | ~80% | 个别页 meta 待抽查 | SEOHead 组件层统一注入 |
| **seo-sitemap-config** | 4 | 🔴 | ~40% | IndexNow 脚本已建但**阻塞**（线上返 SPA 非 Astro dist） | 需先解部署绑定 |
| **seo-speed-optimizer** | 4 | ⚪ | 0% | 需部署后测 CWV | — |
| **seo-site-audit** | 5 | ✅ | 100%(工具) | 整改跟进中 | `scratch/audit_report.md` |
| **seo-link-building** | 6 | ⚪ | 0% | backlinks=0；来源=G2/Capterra/纹身目录站 `tattoo-niche-backlinks.md` | 完全未启动 |
| **seo-backlink-audit** | 6 | ⚪ | 0% | — | — |
| **seo-outreach-writer** | 6 | ⚪ | 0% | — | — |
| **seo-gsc-analyzer** | 7 | ⚪ | 0% | 需部署 + GSC 接入 | — |
| **seo-strategy** | 8 | 🟡 | ~40% | 增长飞轮未成文 | KB 有部分 |
| **seo-workflow-growth** | 8 | 🟡 | ~30% | PLG/SLG 打法未落地 | KB 有部分 |

---

## 三、按阶段分组的关键缺口

**阶段 0–1（启动/研究）**
- E-E-A-T 具名未全站（仅 about/symbol 页有 Person，compare/features 仍匿名 "our editorial assessment"）
- 西语关键词未研（A 线翻译、B 线本土 VS 页均未启动）
- 全词 SERP gap 未系统化

**阶段 3（内容创作/改写）— 当前主战场**
- 11 页信任层已加但 **3 个待确认点未决**：① L6 具名（Sarah Chen persona 待你点头）② 评分 /5→/10 未统一 ③ FAQ 问题为假设来源（待替换为 Reddit/G2/客服真实问题）
- em-dash 滥用（每个 compare 页 7–14 处）待削减
- 薄页（<400 词 占 32%）待扩写

**阶段 4（技术/Schema）— 阻塞项**
- `seo-sitemap-config`：IndexNow 阻塞（部署绑定问题）
- `seo-speed-optimizer`：CWV 未测（需部署）

**阶段 6（外链）— 头号短板**
- backlinks = 0；`seo-link-building`/`backlink-audit`/`outreach-writer` 全未启动
- 来源已规划：`tattoo-niche-backlinks.md`、G2/Capterra

**阶段 7（监控）**
- `seo-gsc-analyzer` 需部署 + GSC 接入后才可做

---

## 四、优先级建议（下一步做什么）

| 优先级 | 动作 | 对应 SKILL | 阻塞？ |
|---|---|---|---|
| P0 | 解部署（Astro dist 绑定 ink-flows.com）→ 解锁 IndexNow + CWV + GSC | `seo-sitemap-config`/`seo-speed-optimizer`/`seo-gsc-analyzer` | 需用户本地操作 |
| P0 | 外链建设启动（G2/Capterra 认领 + 纹身目录站 outreach） | `seo-link-building` | 需真实账号/URL |
| P1 | 11 页 3 待确认点落地（具名 / 评分 /10 / 真实 FAQ） | `seo-content-rewrite` + `seo-saas` | 等你点头 |
| P1 | 全站 E-E-A-T 具名（Person 作者补到 compare/features） | `seo-schema-injector` | 需真人/persona 决策 |
| P2 | 薄页扩写、em-dash 削减 | `seo-content-writing` | 无 |
| P2 | 西语 A/B 线（翻译 + 本土 VS 页） | `seo-saas` + i18n | 词典/内容 |

---

## 五、维护说明

- 每完成一个 SKILL 的阶段性工作，**更新本表对应行的状态/完成度/证据**，并在 `index.md` 最近更新追加一行。
- 部署后务必重跑 `seo-site-audit` + `seo-speed-optimizer` + `seo-gsc-analyzer`，以实测数据刷新本表（当前多数完成度为估算）。
- 本表与 `framework/skill-selection-guide.md` 联动：guide 告诉「该用哪个」，本表记录「用得怎样」。

---

## 六、与规则 list 对照（对账用）

### A. SKILL 清单完整性对照
基准 = `framework/skill-selection-guide.md` 列出的 **24 个 canonical SKILL**（4 backbone + 20 pipeline）。逐一核对本看板是否覆盖：

| # | Canonical SKILL | 看板中？ | 状态 | 备注 |
|---|---|---|---|---|
| B1 | seo-saas | ✅ | 🟡 ~70% | InkFlow backbone |
| B2 | seo-b2c | ➖ N/A | — | InkFlow 非实物货品 |
| B3 | seo-b2b | ➖ N/A | — | InkFlow 非批发/服务 |
| B4 | seo-content-site | ➖ N/A | — | InkFlow 非内容站 |
| 1 | seo-launch-checklist | ✅ | 🟡 ~60% | |
| 2 | seo-keyword-research | ✅ | 🟡 ~50% | |
| 3 | seo-keyword-finder | ✅ | ⚪ ~30% | |
| 4 | seo-competitor-gap | ✅ | 🟡 ~50% | |
| 5 | seo-content-brief | ✅ | 🟡 ~50% | |
| 6 | seo-topic-cluster | ✅ | 🟡 ~50% | |
| 7 | seo-content-writing | ✅ | 🟡 ~70% | |
| 8 | seo-content-rewrite | ✅ | 🟡 ~40% | |
| 9 | seo-technical-check | ✅ | ✅ 100% | |
| 10 | seo-schema-injector | ✅ | 🟡 ~60% | |
| 11 | seo-meta-optimizer | ✅ | 🟡 ~80% | |
| 12 | seo-sitemap-config | ✅ | 🔴 ~40% | |
| 13 | seo-speed-optimizer | ✅ | ⚪ 0% | |
| 14 | seo-site-audit | ✅ | ✅ 100% | |
| 15 | seo-link-building | ✅ | ⚪ 0% | |
| 16 | seo-backlink-audit | ✅ | ⚪ 0% | |
| 17 | seo-outreach-writer | ✅ | ⚪ 0% | |
| 18 | seo-gsc-analyzer | ✅ | ⚪ 0% | |
| 19 | seo-strategy | ✅ | 🟡 ~40% | |
| 20 | seo-workflow-growth | ✅ | 🟡 ~30% | |

**对账结论**：canonical 24 = 看板 21（含 seo-saas）+ 3 个 N/A（seo-b2c / seo-b2b / seo-content-site，因 InkFlow=SaaS 不适用）。**无遗漏、无多余**。

### B. 缺口 → 规则溯源
看板里写的「缺什么」，逐条对应到具体规则文件与条目，确保有据可查：

| 看板缺口 | 对应规则 | 出处 | 规则原文要点 |
|---|---|---|---|
| 对比页 L6 编辑方法论具名未做 | L6 具名作者/编辑/事实核查 | `serp-top10-rules.md` v2 §L6 | 榜单页信任机制=编辑方法论具名，非客户 quote |
| 评分 /5 未统一 /10 | L2 每产品量化评分/10 | `serp-top10-rules.md` v2 §L2 | worldmetrics 9.2/10（含子维度） |
| features V3 真实 quote 缺 | V3 真实客户 quote | `serp-top10-rules.md` v2 §V3 | 姓名+店名+具体收益，严禁编造 |
| features V5 Capterra 徽章缺 | V5 Capterra/GetApp 真实徽章 | `serp-top10-rules.md` v2 §V5 | 真实账号/URL，待你提供 |
| E-E-A-T 具名未全站 | E-E-A-T 每页必做 | `INKFLOW-SEO-EEAT-PLAN.md` | Person 作者+审核人+2 真实源+日期 |
| FAQ 为假设问题（非真实来源） | FAQ 真实问题 | `faq-writing-standard.md` | 真实客服/竞品评论区>模板假设 |
| IndexNow 阻塞 | IndexNow 推送 | `page-content-checklist.md` / `serp-top10-rules` | 部署后提交 URL |
| CWV 未测 | Core Web Vitals | `page-content-checklist.md` | LCP/CLS/INP 部署后测 |
| 薄页 <400 词 占 32% | 字数下限 | `page-content-checklist.md` | 扩写到达标 |
| 内链 <3 占 28% | 内链网 | `page-content-checklist.md` | 对比页≥3 内链 |
| em-dash 滥用 | 写作文风标准 | `page-content-checklist.md` §5 | 削减滥用 — |

> 用法：每次更新看板状态，同步回查本表 B 列对应规则，确认「做完」的定义与规则一致（避免凭感觉判完成）。
