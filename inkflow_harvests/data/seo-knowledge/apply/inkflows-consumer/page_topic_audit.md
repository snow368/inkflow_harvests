# InkFlow 页面主题审计（离线，2026-07-15）

> 范围：扫描 `src/pages` 全部真实站点页（已排除 `.agents` 噪声），共 **152 页**。
> 目的：在拿到 GSC 排名前，先摸清"每页到底是什么主题、映射到我们 122 页计划没有、缺什么"。
> 方法：`audit_pages_topics.py` 抽 title/H1/字数/FAQ/Schema，并按关键词映射到 122 页聚类框架。
> 原始数据：`seo-targets/page_topic_audit.csv`

---

## 0. 重大发现：站点实际是「SaaS + 消费者工具」双受众，不是纯内容站

根目录 103 个页面清一色是**纹身店管理软件的应用/后台页**：

`AccountSettings / AnalyticsPage / AppointmentForm / ArtistLandingPage / ClientBookingPage / PricingPage / CompetitorsPage / EmbedBookingPage / HealthChecklistPage …`

加上 `/compare/booksy·mindbody·square-appointments·vagaro·tattoogenda`（典型 SaaS 对比页）、`/features/*`（功能页）、`/free-tools/*`（线索工具）。

→ **InkFlow 本体是纹身店管理 SaaS**（预约/客户/收款/排班），外加一个消费者向的 `tattoo-meaning-finder` 工具（`/meaning`、`/meaning/style-guide`）。这与「InkFlow 官方定性 SaaS」一致，也说明我们的 SEO 应走 **seo-saas（对比/替代/功能/免费工具 + G2/Capterra 外链）** 路线，而非纯内容站路线。

**这直接改变了"没排名"的诊断**：
- 被索引的 80 页大部分是 **SaaS 应用/功能/对比页**，它们该排的是「纹身店软件」类 B2B 词，不是消费者「aftercare/ideas」词。
- 消费者向的信息内容（我们 122 页计划的对象）实际**几乎还没建**——详见 §2。

---

## 1. 目录分布（152 真实页）

| 目录 | 页数 | 性质 |
|------|-----|------|
| `/`（根） | 103 | 应用/后台 UI（SaaS） |
| `/features` | 17 | SaaS 功能页 |
| `/blog` | 8 | 内容（半数偏 SaaS 自动化） |
| `/compare` | 8 | SaaS 对比页 |
| `/free-tools` | 5 | 线索工具 |
| `/meaning` | 3 | 消费者 meaning 工具 |
| `/alternatives` | 2 | 替代页 |
| 其他 | 6 | book/templates/business/blog-topic 等 |

**薄页（<300 词）：76 / 152 ｜ 无 FAQ：105 / 152 ｜ 无 Schema：102 / 152** → on-page 基础普遍偏弱。

---

## 2. 现有页 → 122 页聚类映射（计划 vs 现有）

> ⚠️ 注意：关键词匹配器会把含 tattoo 词的 SaaS 页也归进簇（如 `/compare/booksy` 被归 color），所以"现有 N 页"里混有 SaaS 产品页。**真正的消费者信息指南极少。**

| 簇 | 计划 | 现有(含SaaS污染) | 真实情况 |
|----|------|------|---------|
| aftercare | 9 | 8 | 多为 SaaS 自动化/合规页；真消费者指南仅 `/blog/tattoo-aftercare-guide` 等 1–2 篇 |
| color | 11 | 11 | 6 篇是 `/compare/*` 对比页，非颜色科普 |
| cost | 3 | 6 | ⚠️ **匹配器误报，非真冗余**：实际为 `/pricing`(688词) 与 `/PricingPage`(226词) **疑似重复定价路由** + 2 功能页(competitor-intelligence/inventory-management) + 2 工具页(no-show/price-calculator)。真问题=定价页可能重复，需 301 合并 |
| ideas | 10 | 6 | 多为 meaning 工具页，真 ideas 指南少 |
| placement | 14 | 2 | 严重不足 |
| small | 9 | 1 | 严重不足 |
| coverup | 13 | **0** | **完全空白，需新建** |
| pain | 6 | **0** | 空白 |
| prep | 5 | **0** | 空白 |
| problems | 5 | **0** | 空白 |
| quotes | 11 | **0** | 空白 |
| removal | 14 | **0** | 空白 |
| styles | 8 | **0** | 空白 |
| trends | 2 | **0** | 空白 |
| meaning | 1 | 0(工具页另算) | 空白 |
| other | 1 | **0** | 空白 |

**结论**：10 个整簇（约 73 个计划页）**零现有内容**；消费者信息内容 corpus 几乎不存在 → 这些词不可能有排名，因为页都没有。

> ⚠️ **修正（验证后）**：`cost` 簇"6 页"是匹配器误报，真实问题是 `/pricing` vs `/PricingPage` 疑似重复路由，其余是功能/工具页，非冗余。

### 2.5 关键技术隐患：103 个 app/UI 页可能被错误收录

根目录 103 页（`ClientBookingPage / AnalyticsPage / AccountSettings / AppointmentForm …`）绝大多数是**登录后后台/应用页**，本应 `noindex` 或置于鉴权后。若它们被 Google 收录：
- 浪费抓取预算，稀释全站主题焦点（Google 以为这是个后台工具站而非纹身 SaaS）
- 制造大量"收录但不该排"的页面 → 正是用户说的"80 索引没排名"的主体
→ **首要技术修复：给非营销页加 `noindex` / 移出 `src/pages` / 鉴权拦截**，只让公开营销页（compare/features/free-tools/pricing/blog/meaning/alternatives）被收录。

---

## 3. 四项诊断（对应诊断树）

1. **页面类型错配（主因）**：被索引的 80 页多为 SaaS 应用/功能页，它们不为消费者信息词排名；消费者信息词对应的页还没建。
2. **主题模糊/自相残杀**：`cost` 簇现有 6 页（计划仅 3）→ 明显过度建设，需合并。SaaS 页与消费者页共用 tattoo 词，Google 难判站点主题。
3. **无权威/无外链**：SaaS 对比/功能词是 B2B 红海，新站 0 外链难破前排。
4. **on-page 偏弱**：76/152 薄页、105 无 FAQ、102 无 Schema → 即便有排名潜力也被拖。

---

## 4. 「每页主题敲定」当前状态 + 决策规则

- **SaaS 应用/功能页（根 103 + features 17）**：主题已明确（各自功能），不应硬塞进消费者内容簇；保持，但需补 FAQ/Schema、统一内链。它们排 B2B 词，靠外链。
- **消费者信息页（blog/meaning 真内容）**：极少，需按 122 计划逐簇建设；每页锁 1 主题。
- **`cost` 簇 6 页**：合并到 3 个清晰页（定价 / 对比 / 计算器），消除自残。
- **10 个空白簇**：按 122 计划新建，优先级见下。

---

## 5. 需你拍板的战略问题（决定精力往哪投）

站点有**两个受众**：
- **B2B 纹身店老板**（买管理软件）→ 钱在 `/compare` `/features` `/pricing` `/free-tools`，需 SaaS 外链（G2/Capterra/行业站）。
- **B2C 消费者**（读 aftercare/ideas、用 meaning 工具）→ 钱在 122 页消费者内容，靠内容量 + 内链。

「80 页没排名」到底要先救哪边？这决定我们"敲定主题 + 改内容"的具体对象。

---

## 6. GSC 导出叠加后的下一步

拿到 GSC 导出（queries + pages + position + impressions + clicks）后，我跑 `seo-gsc-analyzer`：
- 找「有展现但卡 8–20 名」的快速胜利页 → 优先改 on-page + 内链。
- 找「0 展现」页 → 意图错配或需外链，不硬改。
- 与本文 §2 矩阵叠加 → 产出「先改哪 20 页」清单。
