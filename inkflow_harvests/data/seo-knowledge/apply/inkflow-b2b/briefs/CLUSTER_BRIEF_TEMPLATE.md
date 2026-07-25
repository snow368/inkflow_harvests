# {Cluster Name} Cluster — Content Brief（模板）

> **用途**：按 cluster 整簇书写的规范模板。复制本文件为 `seo-targets/briefs/{cluster}-cluster-brief.md`。
> **流水线**：SERP 差距 → Content Brief（本文件）→ 写页（先 Pillar，再 Spoke）→ 注入 Meta/Title/H1/Schema/内链 → 品牌语气自检（目标 8+/10）。
> **E-E-A-T 作者/审核者为占位**，发布前替换真实具名并补 about 页链接；引用须真实一手来源（医疗用 AAD/NHS/Mayo，禁 Wikipedia）。

> ⚠️ **使用原则：这是「护栏 + 定制」模板，不是填空卷。** 模板只强制**跨簇一致的质量下限**（E-E-A-T、内链拓扑 §3.1、BLUF 开头、FAQ、Schema 字段齐全）；但每簇的**页面类型、主意图、角度形态、Schema 类型、字数范围都必须按簇/按页重新判断**，禁止逐簇套同一结构。各节「按簇定制」提示 + 文末 §5.1 防生搬硬套检查必须过。

---

## 0. 簇概览

| 页面 | 类型 | slug | 词量 | 决策 |
|------|------|------|------|------|
| {cluster}-general | pillar | `/blog/{cluster}-guide` | {N} | **保留（先写）** |
| {cluster}-{sub1} | spoke | `/blog/{cluster}-{sub1}` | {n} | 保留 |
| … | spoke | … | … | 保留 |
| {cluster}-{thin1} | spoke | — | {<10} | **并入** 支柱（"{子主题}"小节） |

**实际产出 = {X} 页**（支柱吸收薄页为小节）。

---

## 1. 独家角度（Exclusive Angle）— 按意图适配，勿硬编

> **按簇定制**：角度形态随簇的主意图走。**不要对每个簇都强行找"竞品没覆盖的独家 POV"**—— transactional 簇硬编角度会显得假、反而伤信任。

- **TOFU 信息簇**（ideas / aftercare / color / placement）：找差异化 POV（竞品无系统覆盖、可作 Featured Snippet）。
  - 竞品 Top 页现状（工作室视角 / 按 X 一刀切 / 带货口吻…）：
  - 我们的差异点（须吃下本簇多个子主题）：
  - 与 InkFlow 功能衔接点（如 design-discovery / meaning 场景）：
- **MOFU/BOFU 商业簇**（cost / removal / coverup / problems）：角度通常是「最清晰的结构 / 最可信的比较 / 最强信任信号」，而非新奇观点。
  - 用户真实决策痛点（比价难 / 怕被坑 / 不知选哪种）：
  - 我们的信任/结构优势（数据透明 / 真实案例 / 中立不带货）：
  - 与 InkFlow 转化衔接点：

---

## 2. E-E-A-T 通用块（全簇复用）

- **Author（具名 + 职称 + bio + about 链接）**：{占位}
- **Reviewer（具名 + 资质）**：{占位}
- **真实引用（2+ 稳定一手来源，禁 Wikipedia）**：{AAD/NHS/Mayo 等}
- **发布/更新日期**：published {YYYY-MM-DD} ｜ updated 同（每 6 个月复核）
- **第一手经验信号**：{InkFlow 用户数据/案例；无真实数据支撑则删除}

---

## 3. Schema 计划（按页面类型选，勿全簇套 Article+FAQPage）

> **按簇定制**：Schema 类型取决于每页的「页面类型」，不是一律 Article+FAQPage。对照 `seo-content-brief` 技能的「内容矩阵对照表」：
> - 指南/博客 → `Article` + `FAQPage`（可选 `HowTo`）
> - 对比页 → `FAQPage`（+ 对比表）
> - 工具页 → `SoftwareApplication`
> - 产品/定价 → `Product` / `Offer`

| 页面 | 页面类型 | Schema 类型 |
|------|---------|------------|
| {cluster}-general（支柱） | 指南 | `Article` + `FAQPage`（可选 `HowTo`） |
| {spoke} | {指南 / 对比 / 工具} | 按上表选，勿全簇相同 |
| 全簇 | — | 每页含 `BreadcrumbList`（Home › Blog › {Cluster}） |

### 3.1 内链拓扑规则（全簇强制，Hub-and-Spoke 修正版）

> **写页套站点模板会自动带第 ④ 层**，但此处显式列出，防止漏链。这是每个簇 Brief 都必须遵守的「内容蜂巢」拓扑。

1. **Spoke → Pillar（硬规则）**：每支撑页必须含 ≥1 条**描述性锚文本**链向本簇支柱页，不用 "点击这里"。
2. **Pillar → Spoke（按相关性）**：支柱正文相关段落自然链回 spoke；其余放 "相关阅读" 模块，不强制每 spoke 各塞一条相同锚文本。
3. **Spoke ↔ Spoke（横向互链）**：相关支撑页之间互链，增强簇内凝聚力。
4. **Pillar → 类目/首页（向上链，强制）**：支柱页必须链向 `/blog`（博客枢纽）与 `/`（首页），让簇是「连在全站上的主题模块」而非孤儿岛。spoke 经 pillar 间接归属全站。
   - 此层由**站点模板**自动保证：header 全站导航 + footer 全站链接 + `BreadcrumbList`（Home › Blog › {Cluster}）。写页套模板即带，**不用在正文单独写**，但正文相关处也鼓励自然链一下。
5. **BreadcrumbList**：每页 `Home › Blog › {Cluster}`，与层级导航一致。

---

## 4. 逐页 Brief

> 顺序：先写 Pillar，再写各 Spoke。**每页先定「页面类型」，再选结构**：指南用 BLUF+H2+FAQ；对比页用 Verdict+对比表+FAQ；工具页用 输入+结果+CTA。各类型结构见 `seo-content-brief` 技能 Step 4。每页含 Title（≤60）/Meta（≤160）/H1/BLUF 开头/大纲/关键词融入/Featured Snippet 目标/Schema/内链。

### 4.1 Pillar — {Cluster Title}

| 字段 | 值 |
|------|-----|
| 目标主词 | {primary} |
| 副关键词 | {secondary…} |
| 路径 | `/blog/{cluster}-guide` |
| 页面类型 | 指南（意图：{TOFU/MOFU/BOFU}） |
| 目标字数 | {range，按类型：指南 2000–4000 / 对比 2000–4000 / 工具 1000–2000} |

**H1**：{…} ｜ **Title 方案**（≤60）：{1/2/3} ｜ **Meta**（≤160）：{…}
**大纲（BLUF 开头）**：{H2/H3 结构，把薄页吸收为小节}
**关键词融入**：{主词位置} ｜ **Featured Snippet 目标**：{40–60 字精华}

---

### 4.2 Spoke — {Sub1 Title}

| 字段 | 值 |
|------|-----|
| 主词 | {…} |
| 路径 | `/blog/{cluster}-{sub1}` |
| 页面类型 | {指南 / 对比 / 工具 / 列表}（意图：{…}） |
| 字数 | {range，按类型定，勿统一填 2000} |

**H1**：{…} ｜ **结构**（按页面类型选）：{指南=H2+H3+FAQ / 对比=Verdict+对比表+FAQ / 工具=输入+结果+CTA}
**Schema**：{按 §3 选，勿默认 Article+FAQPage} ｜ **内链**：↑ 支柱；→ {相关 spoke}；→ {跨簇待建/已建}

---

（重复 4.2 结构至所有 spoke）

---

## 5. 内链矩阵（全簇）

| 从 → 到 | 锚文本 | 位置 |
|---------|--------|------|
| 支柱 → spoke1 | {描述性} | 相关段 |
| 支柱 → spoke2 | {描述性} | 相关段 |
| 每 spoke → 支柱 | {cluster} guide | 开头/结尾回链 |
| spokeA → spokeB | {描述性} | 相关段 |
| **支柱 → /blog（博客枢纽）** | all {cluster} guides | header/footer + 相关阅读 |
| **支柱 → /（首页）** | {Brand} | header logo + footer |
| 每 spoke → /blog（向上链，经模板） | blog | header/footer 全站导航 |

> **向上链说明**：`支柱 → /blog` 与 `支柱 → /` 由站点模板（header 全站导航 + footer + BreadcrumbList）自动保证，写页套模板即带；此处显式列出以防漏链。spoke 经 pillar 间接归属全站。
> 跨簇链接等对应簇 Brief 产出后再回填，避免断链。

---

## 5.1 写簇前「防生搬硬套」检查（必须过）

复制模板后、动笔前，先答这 5 条；任一条答"否"都说明在套模板而非定制：
1. 本簇主意图是 TOFU 还是 MOFU/BOFU？→ 决定角度形态（§1）与 CTA 强弱。
2. 每页的「页面类型」都标了吗（指南/对比/工具/列表）？→ 决定结构（§4）与 Schema（§3），**禁止全簇指南**。
3. 薄页（kw<10）是否并入支柱而非硬开页？→ 见 §0 决策列。
4. 字数按类型定了吗（指南 2000–4000 / 对比 2000–4000 / 工具 1000–2000）？→ 不统一填一个数。
5. 跨簇链接是否留待对应簇 Brief 回填（不提前写死断链）？

---

## 6. 下一步

1. **你审本 Brief**：独家角度是否成立 / 作者占位是否替换 / CTA 与 InkFlow 功能是否吻合。
2. 确认后按 Brief 逐页写正文（先 Pillar，再 Spoke），注入 Meta/Title/H1/Schema/内链。
3. 写完后跑品牌语气自检（目标 8+/10）与 E-E-A-T 校验。
4. 本簇跑通后，复制流程到同级 Tier 簇。
