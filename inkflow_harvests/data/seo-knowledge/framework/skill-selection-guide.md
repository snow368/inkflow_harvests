# SEO SKILL 选型指南（站型 × 阶段）

> 本文解决一个问题：**面对一个 SEO 项目/任务，应该 invoke 哪个 SKILL**。
> 配套文档：`skills-master-index.md`（技能→文件横向索引）、`site-type-router.md`（站型分流）、`knowledge-classification.md`（按功能板块查）。
> 适用：所有 SEO 项目，含 InkFlow。

---

## 〇、铁律：先定性站型，再选 SKILL

任何 SEO 任务第一步不是选工具，是**定性站型**。定性看「卖什么 / 转化目标」，不是「卖给谁」。

| 站型 | 判定（卖什么） | 转化目标 | Backbone SKILL |
|---|---|---|---|
| **SaaS** | 订阅制软件（含 B2C SaaS 如 Netflix/Calm） | 注册/试用/付费 | `seo-saas` |
| **B2C 货品** | 实物商品（DTC/电商） | 加购/下单 | `seo-b2c` |
| **B2B** | 批发/代工/企业服务 | 询盘/订单 | `seo-b2b` |
| **内容站** | 无自有产品，靠流量变现 | PV/广告/Affiliate | `seo-content-site` |

⚠️ **B2C 歧义**：B2C 货品（卖实物）→ `seo-b2c`；B2C SaaS（卖订阅软件）→ 仍属 `seo-saas`。定性错了，整套 playbook 全错。

> Backbone SKILL 是「镜头」：后续每个阶段的 pipeline SKILL 都要用它来约束细节（如 compare 页评分规则、外链来源类型）。

---

## 一、按阶段选 pipeline SKILL（第二步）

站型定性后，按项目生命周期的阶段选对应的**执行型 SKILL**。同一阶段，不同站型只是「参数」不同，SKILL 本身通用。

| 阶段 | 目标 | 主用 SKILL | 辅助 / 备注 |
|---|---|---|---|
| **0. 启动/上线前** | 新站从 0 跑通 SEO 基建 | `seo-launch-checklist` | 套 backbone 的启动流程（workflow-saas/b2c/b2b 在各自 SKILL 内） |
| **1. 关键词/竞品研究** | 找词、算差距、定方向 | `seo-keyword-research` → `seo-competitor-gap` | 长尾扩展用 `seo-keyword-finder`；SERP TOP10 反推用 `serp-top10-rules.md` |
| **2. 内容规划** | 出 brief、建集群 | `seo-content-brief` + `seo-topic-cluster` | 对比/替代品词归 BOFU，套 backbone 的对比页规则（L 系列） |
| **3. 内容创作/改写** | 写稿、AEO、提质 | `seo-content-writing`（新写）/ `seo-content-rewrite`（改写） | 须守 FAQ 标准 `faq-writing-standard.md` + 文风标准（反 AI 腔） |
| **4. 技术/Schema** | 结构化、Meta、速度、收录 | `seo-technical-check`（基础设施）→ `seo-schema-injector` → `seo-meta-optimizer` → `seo-sitemap-config` → `seo-speed-optimizer` | 按缺口选，不必全跑 |
| **5. 全站审计** | 150+ 因子体检、出整改单 | `seo-site-audit` | 审计后回到阶段 3/4 修复 |
| **6. 外链/增长** | 链接建设、外链审计、outreach | `seo-link-building` → `seo-backlink-audit` → `seo-outreach-writer` | 来源类型按 backbone（SaaS→G2/Capterra；B2B→协会/商会；B2C→评测/Influencer） |
| **7. 监控/数据** | GSC 表现分析 | `seo-gsc-analyzer` | 排名/CTR/点击，反哺阶段 1-2 |
| **8. 战略** | 全局规划、增长飞轮 | `seo-strategy` + `seo-workflow-growth` | 站型分型后定增长策略（竞品替代/非品牌/程序化/复合） |

---

## 二、站型 × 阶段 组合矩阵（核心速查）

行=阶段，列=站型。**单元格 = 该情况下应 invoke 的 SKILL（Backbone 常驻作为镜头）**。

| 阶段 ↓ \ 站型 → | SaaS | B2C 货品 | B2B | 内容站 |
|---|---|---|---|---|
| 启动 | launch-checklist + **seo-saas** | launch-checklist + **seo-b2c** | launch-checklist + **seo-b2b** | launch-checklist + **seo-content-site** |
| 关键词/竞品 | keyword-research → competitor-gap | 同左 | 同左 + 长尾规格词（"X manufacturer"） | 同左 + 低 KD 长尾优先 |
| 内容规划 | content-brief + topic-cluster（BOFU 对比页） | content-brief（产品/类目页矩阵） | content-brief（案例/白皮书/ROI 计算器） | content-brief（聚合/模板页） |
| 创作/改写 | content-writing/rewrite + **seo-saas** L/V 规则 | content-writing/rewrite + **seo-b2c** Product Schema | content-writing/rewrite + **seo-b2b** 长尾技术词 | content-writing/rewrite（量优先） |
| 技术/Schema | technical-check→schema-injector(SoftwareApplication) | 同左(Product/Offer/AggregateRating) | 同左(Service/Product) | 同左(Article/CollectionPage) |
| 审计 | site-audit | site-audit | site-audit | site-audit |
| 外链/增长 | link-building→backlink-audit→outreach（G2/Capterra/目录） | link-building（评测站/Influencer/Trustpilot） | link-building（协会/商会/Alibaba/ThomasNet） | link-building（客座/Affiliate） |
| 监控 | gsc-analyzer | gsc-analyzer | gsc-analyzer | gsc-analyzer |
| 战略 | strategy + workflow-growth（PLG） | strategy + workflow-growth（ROAS） | strategy + workflow-growth（SLG） | strategy（流量变现） |

> **读法**：每个单元格 = 「通用 pipeline SKILL」+「常驻 backbone 镜头」。Backbone 只在该站型下才加载，不与通用 SKILL 并列 invoke（除非需要其专属规则集，如 SaaS 对比页 L/V 规则）。

---

## 三、冲突裁定（谁优先）

1. **Backbone 站型 SKILL > 通用 pipeline SKILL**：当 `seo-content-writing` 的通用建议与 `seo-saas` 的对比页规则冲突时，听 backbone（如 L6 编辑方法论具名 > 通用"加作者"；V3 真实 quote 禁编造 > 通用"加社会证明"）。
2. **实测规则 > 旧清单**：`serp-top10-rules.md` v2 > `page-content-checklist.md` 里的 v1 残留（已修）。
3. **真实数据禁编造** 跨所有 SKILL 绝对优先（V3/V5 引用、客户 quote、评分来源）。

---

## 四、InkFlow 实例（套用演示）

- **定性**：InkFlow = SaaS（订阅软件，转化=注册/付费）→ backbone = `seo-saas`。
- **当前阶段**：内容质量提升（已建页，补信任层/FAQ）→ 阶段 3。
- **应 invoke**：`seo-content-rewrite`（改写现有页）+ 常驻 `seo-saas` 镜头（L 系列对比页 / V 系列 features 页规则）+ 守 `faq-writing-standard.md`。
- **下一阶段候选**：阶段 6 外链（`seo-link-building`，来源=G2/Capterra/纹身目录站 `tattoo-niche-backlinks.md`）；阶段 7 监控（`seo-gsc-analyzer`，部署后）。

---

## 五、一句话流程

> **定性站型 → 加载 backbone SKILL → 按所处阶段 invoke 对应 pipeline SKILL → 冲突时听 backbone + 实测规则 + 真实数据禁编造。**

新建任意 SEO 任务，先问自己两句：① 这是哪种站型？（定 backbone）② 我现在在哪个阶段？（定 pipeline SKILL）

---

## 六、项目实例看板（InkFlow）

- **InkFlow 实际覆盖率看板** → `projects/inkflow-skill-coverage.md`（21 个相关 SKILL 的状态/完成度/缺口 + §六 与规则 list 对账）。
- 用法：guide 决定「该用哪个 SKILL」，看板记录「InkFlow 用得怎样」，两者联动。
