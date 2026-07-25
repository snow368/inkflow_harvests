# InkFlow B2B SaaS 排名提升计划（2026-07-15）

> 战略：用户确认 **B2B SaaS 优先**（救钱页：compare / features / pricing / free-tools）。
> 依据：离线审计 `page_topic_audit.md` + 验证。站点官方定性 SaaS，走 `seo-saas` 路线。
> 核心认知：**B2B SaaS 排名的主杠杆是权威（外链/实体），on-page 只是门槛**。改文字救不了 SaaS 红海词，必须配合外链。

---

## 一、为什么"改内容"不够（先对齐预期）

SaaS 对比/功能词（"tattoo studio software"、"Booksy alternative"）是 B2B 红海：
- 竞品（Booksy/Mindbody）有 10 年域名权威 + 海量外链。
- 新站 0 外链，即使 on-page 完美也难破前 3 页。
- 所以本计划 = **技术清理（聚权威）+ on-page 基线（过门槛）+ 外链（主杠杆）+ GSC 快速胜利**。

---

## 二、四步执行

### Step 1 — 技术清理：规范合并（最高杠杆，最低内容成本）

> **⚠️ 关键纠正（2026-07-15，基于 GSC pages 真实导出）**：原计划"给 103 个后台屏加 noindex"是**错误前提**。
> GSC 已索引的 75 个 URL **全是 `.astro` 营销页**（features/compare/free-tools/blog/meaning/pricing/about…），
> **没有任何 `.tsx` SPA 后台屏**（ClientBookingPage/OwnerDashboard/AccountSettings 等）被收录——
> 它们 client-rendered + 登录守卫，且 `index.html` 已把它们 canonical 到 `/`，Google 不予单独收录。
> 给它们加 noindex 是做无用功，且风险高（易误伤公开 SPA 页如 ArtistProfilePage/PublicPortfolioPage）。
> **真实稀释源 = `.astro` 营销页的"带斜杠/不带斜杠 + www + http"双版本都被收录（约 20 对），排名信号被劈两半。**

1. **Canonical 规范化（已执行 ✅）** — `src/components/SEOHead.astro` 的 canonical 从"自引用"改为"规范化"
   （强制 https + 非 www + 结尾斜杠 + 去查询参数）。无论 Google 爬到哪个变体，都指向同一 canonical，自动合并信号。
   - 验证：`/pricing` 与 `/pricing/` 均 → `https://ink-flows.com/pricing/`；`http://`/`www.` 均收敛。
2. **协议/主机 301（已执行 ✅）** — `_redirects` 加 `http://`→`https://` 与 `https://www.`→`https://`(非www) 的 301。
3. **`/PricingPage` 去重（评估：暂不做）** — SPA 路由 `/PricingPage` 未被收录（canonical 到 `/`），且为应用内导航目标，
   加 301 会破坏 in-app 跳转；其权重已通过 canonical 归并到 `/`，故不单独处理。
4. **`robots` meta（已补 ✅）** — SEOHead 现对所有 `.astro` 页输出 `index, follow`（原缺失）。

### Step 2 — on-page 基线（公开营销页）
- 目标页：`/pricing`、`/compare/*`(5)、`/features/*`(关键)、`/free-tools/*`、`/alternatives/*`、`/blog`、`/meaning`。
- 多数已有 FAQ+Schema（审计显示 compare/features/free-tools 覆盖率好）；补缺口：
  - 缺 FAQ 的营销页补 FAQPage Schema + 真实问答。
  - 功能页加 `SoftwareApplication` Schema；定价页加 `Product`/`Offer`。
  - 内链：营销页 ↔ 首页/类目（我们 §3.1 向上链规则）；compare 页互链 + 链回 /pricing。

### Step 3 — 权威/外链（B2B 主杠杆）
1. **G2 / Capterra / Trustpilot** 建档案 + 引真实评价（SaaS 排名硬通货）。
2. **替代页矩阵**：已有 `/compare/booksy·mindbody·…`，补 `/alternatives/inkflow-vs-X` 系列，吃 "X alternative" 词。
3. **行业外链**：纹身行业博客/协会/工作室目录；嘉宾文章。
4. **n8n+Claude 内容放大**（已沉淀 `sources/071-*`）：用于博客/客座内容分发，打品牌提及基础。

### Step 4 — GSC 快速胜利叠加
- 拿到 GSC 导出后跑 `seo-gsc-analyzer`：找「有展现但卡 8–20 名」页 → 优先 Step 2 强化；找「0 展现」页 → 意图错配或需外链。

---

## 三、钱页优先级清单（待 GSC 叠加微调）

| 页 | 类型 | 当前 on-page | 动作 |
|----|------|------|------|
| `/pricing` | 定价 | FAQ+Schema ✓ | 收口 /PricingPage 301；加 Product/Offer |
| `/compare/booksy` 等 5 | 对比 | FAQ+Schema ✓ | 互链 + 链 /pricing；补 InkFlow 差异化 |
| `/features/tattoo-ink-passport` 等 | 功能 | 多数 ✓ | 加 SoftwareApplication；内链回 /pricing |
| `/free-tools/tattoo-price-calculator` 等 | 工具 | ✓ | 保持；CTA 链 /pricing |
| `/alternatives/*` | 替代 | 少 | 扩矩阵吃 "X alternative" |

---

## 四、下一步

1. **先执行 Step 1**（技术清理）——我可先产出「应 noindex 的 app/UI 页清单」供你确认，再批量加 `noindex` + 修定价 301。这是最划算的一步。
2. 你给 **GSC 导出** → 跑 Step 4 快速胜利。
3. Step 3 外链需你提供 G2/Capterra 账号与可接触的行业站资源。

> 注：消费者内容 aftercare 簇（1 支柱 + 6 spoke）已写完并挂入 blog 列表（2026-07-15）；其余 121 页计划待 B2B 钱页排名企稳后继续。Tier 0 快速胜利（8 个 8–20 名词）已优化 + 新建巨浪含义博客。
