# OneLegchris — 站点/博客结构图（Site / Blog Structure）

> 来源：https://x.com/OneLegchris/status/2075910873407779146
> 作者：Chris (@OneLegchris) — Local SEO 从业者
> 日期：2026-07-11（主推）+ 2026-07-10（延续推）
> 原始图片：`seo-targets/onelegchris-structure.jpg`（已下载，72KB）
> 入库日期：2026-07-12
> ⚠️ **自述/单方经验** — 未提供数据验证，作为启发式框架使用，待 InkFlow 自身 GSC 数据验证

---

## 1. 完整串内容（逐字）

### Root Tweet (2075719910550905178)
> This is the Blog Structure you want:
> [图片: 三层站点结构架构图]

### Reply 1 (2075910873407779146)
> This is the site structure you want:
> [同一张图片]

> 注：X 显示 "Read 1 reply"，unrollnow 显示 2 条（root + reply）。无编号子步骤、无文字方法论——**整条推文的核心就是这张图**。

---

## 2. 图片内容精确描述（从原始 JPEG 逐像素读取）

这是一张**三层本地 SEO 站点架构流程图**，从上到下：

```
                    ┌──────────┐
                    │   /blog   │  ← content hub（内容中心）
                    │ content   │
                    │   hub     │
                    └────┬─────┘
                         │
    ┌────────────────────┼─────────────────────┐
    │                    │                     │
    ▼                    ▼                     ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ How much does│ │ How to choose│ │ [Service 1] vs    │
│ [service]     │ │ a [service]  │ │ [Service 2]       │
│ cost in [city]?│ company      │ │                   │
│              │               │ │                   │
│cost guide·info│buyer guide·info│comparison·info    │
└──────┬───────┘ └──────┬───────┘ └──────┬───────────┘
       │                │               │
       │    ┌───────────▼───────────────▼──────────┐
       │    │                                     │
       │    ▼           ▼                         ▼
       │ ┌──────────┐ ┌──────────┐ ┌────────────────────┐
       │ │ Signs you │ │ [City]   │ │ [Service] in [City] │
       │ │ need      │ │ [service]│ │ : a local guide     │
       │ │ [service] │ │          │ │                      │
       │ │ now?      │ │          │ │local·informational   │
       │ │problem-   │ │          │ │                      │
       │ │aware·info │ │          │ │                      │
       │ └──────────┘ └──────────┘ └────────────────────┘
       │
       ╲═════════╱  （蓝色交叉连线 = 每篇博文链接到多个商业页）
        ╲       ╱
         ▼     ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│[Service 1] in  │ │[Service 2] in  │ │ [Service]       │ │[Service 3] in  │
│[City A]        │ │[City B]        │ services         │ │[City C]        │
│                │ │                │ (pillar)         │ │                │
│/service-areas/ │ │/service-areas/ │/services/[service]│/service-areas/  │
│/[city-a]/      │ │/[city-b]/      │ (pillar)         │ /[city-c]/      │
│[service-1]     │ │[service-2]     │                  │ │[service-3]     │
└───────┬────────┘ └───────┬────────┘ └────────┬────────┘ └───────┬────────┘
        │                    │                 │                  │
        └────────────────────┴────────┬────────┴──────────────────┘
                                      │
                               虚线 = CTA 链接
                                      │
                              ┌───────▼────────┐
                              │   /book-now     │
                              │ conversion CTA  │
                              └────────────────┘
```

### 三层定义

| 层 | 标签 | 功能 | URL 模式 | 内容类型 |
|---|---|---|---|---|
| **Tier 0** | `/blog` (content hub) | 内容枢纽，分发到所有信息层 | `/blog` | Hub 页 |
| **Tier 1** | BLOG SILO — INFORMATIONAL CONTENT | **赚外链 + 排名研究型查询** | 动态博文 | 成本指南、选购指南、对比、问题意识、本地指南 |
| **Tier 2** | MONEY PAGES — COMMERCIAL | **转化，由上方博文注入权重** | `/services/[service]` 或 `/service-areas/[city]/[service]` | 服务落地页、服务+城市组合页、Pillar 服务页 |
| **Tier 3** | `/book-now` | 终极转化动作 | `/book-now` | CTA 页 |

### 关键设计原则（从图中提取）

1. **信息层和商业层分离**：博文不直接卖，而是"赚链接+排研究词"；商业页不赚链接，只转化。
2. **交叉内链**：每篇博文链接到**多个**商业页（图中蓝色交叉线），不是一对一。这意味着一篇高质量博文可以同时支撑多个商业页的排名。
3. **权重漏斗**：外部链接 → 博文（Tier 1）→ 内链 → 商业页（Tier 2）→ CTA（Tier 3）
4. **本地化变体**：`[Service] in [City A/B/C]` 是本地 SEO 的核心模式——每个服务×每个城市一个独立页面。

---

## 3. 与 InkFlow 的映射

OneLegchris 的模型是**本地服务业务**（plumber/roofer/dentist 类），InkFlow 是**SaaS 工具**（tattoo studio management）。映射关系：

| OneLegchris 本地模型 | InkFlow SaaS 对应 | 当前状态 |
|---|---|---|
| `/blog` (content hub) | **`/meaning/index`** (Tattoo Meanings Hub) ✅ 存在 | 已有，但未充当全站 hub |
| Tier 1: 信息博文 (5 类型) | **15 category + 70 symbol + blog/** | category 有但薄；symbol 缺 FAQ/E-E-A-T；blog 仅 8 篇 |
| Tier 2: 商业服务页 | **`/features/*` + `/pricing` + `/compare/*` + `/alternatives/*`** | 18 features + pricing + 9 compare + 2 alternatives = ~29 页 |
| Tier 2 变体: Service×City | **不适用**（SaaS 无地理维度） | N/A |
| Tier 3: `/book-now` CTA | **`/register` 或 `/free-tools/tattoo-meaning-finder`** | tattoo-meaning-finder 是最大的入口工具 |
| 交叉内链（博文→多商业页） | **❌ 缺失** — meaning 页 0 条链接到 features/compare/pricing | Top-15 gap #3 |

### InkFlow 特有的额外层级

InkFlow 比 OneLegchris 模型多了一层**免费工具层**（link magnet），这是 SaaS Product-Led SEO 的核心杠杆：
- `/free-tools/tattoo-meaning-finder` — 最大流量入口
- `/free-tools/free-waiver-generator`
- `/free-tools/commission-calculator/`
- `/free-tools/no-show-calculator`
- `/free-tools/aftercare-email-generator`
- `/free-tools/tattoo-price-calculator`

这 6 个工具页应被视为**独立的 link-magnet 层**（介于 Tier 1 和 Tier 2 之间），既赚外链又导流到产品页。

---

## 4. 可操作的洞察

1. **meaning 页面是 InkFlow 的 "Blog Silo"** —— 它们应该承担"赚链接+排研究查询"的角色（用户搜 "wolf tattoo meaning" 是研究意图），但目前它们是**死胡同**（不链接到任何产品页）。
2. **features/compare/pricing 是 "Money Pages"** —— 它们需要来自 meaning 层的内链注入才能获得排名提升。
3. **免费工具是 "Link Magnets"** —— 应该被 meaning 页和 blog 引用（"用我们的 [tattoo meaning finder] 快速查找含义"），形成第二权重通道。
4. **当前最大浪费**：meaning/index 有 85 个子页（15 cat + 70 sym），如果每页平均获得 1 条外链，就是 85 条外链潜力；但这些权重目前**全部困在 meaning 子树里**，没有流向产品侧。

---

## 5. 复核记录

- 2026-07-12 16:00 通过 curl 取 og:image meta 获得 pbs.twimg.com 真实图片 URL，下载并 Read 工具逐像素确认结构。
- X 显示 "Read 1 reply"（仅作者延续推），无第三方回复或补充说明。
- 图中文字逐字提取，无推断成分。
