# 技术 SEO 执行手册 (2026)

> 写给谁看：SEO 负责人、开发者
> 目标：将 SEO 知识库中的技术规范转化为可执行的审计—排期—修复工作流
> 最后更新：2026-07-13

---

## 一、技术 SEO 总逻辑

```
抓取 → 渲染 → 索引 → 排名
  ↑       ↑      ↑      ↑
robots   JS     Schema  CWV
sitemap  SSR    canonical  内链
404      移动    hreflang
```

**每一层都可能成为阻断器。技术 SEO 的目标不是"完美"，而是**确保没有阻断器**。

---

## 二、审计—优先级—修复工作流

### 2.1 审计流程（季度执行）

```
Phase 1: 可抓取性审计 (1 天)
  ├→ robots.txt 检查（AI 爬虫 + Googlebot）
  ├→ sitemap.xml 验证（内容完整、无 noindex URL）
  ├→ 404 页面检查（真的返回 404，不是软 404）
  └→ 爬虫模拟（Screaming Frog / Sitebulb 跑一次）

Phase 2: 索引审计 (1 天)
  ├→ GSC Pages 报告（已索引 vs 未索引比）
  ├→ URL Inspection 抽查（10 个关键页面）
  └→ 孤立页面检测（无内链指向的已索引页面）

Phase 3: Schema 审计 (1 天)
  ├→ Schema 覆盖度检查（什么页面缺什么）
  ├→ Rich Results Test（语法有效性）
  └→ Schema 值准确性（非"有了就行"）

Phase 4: 性能审计 (1 天)
  ├→ Core Web Vitals 现场数据（CrUX，非实验室）
  ├→ 移动端内容一致性
  └→ 图片优化检查（格式 + 尺寸 + lazy loading）
```

### 2.2 问题优先级矩阵

| 优先级 | 定义 | 响应时间 | 例子 |
|--------|------|---------|------|
| **P0 阻断器** | 阻止 Google 抓取/索引内容 | 24h 内 | robots.txt 屏蔽了重要页面、noindex 在内容页上、服务器返回 5xx |
| **P1 速赢** | 低投入、直接影响排名 | 本周 | 缺 canonical、缺 Schema、LCP > 2.5s、IndexNow 未配置 |
| **P2 项目** | 需要开发排期 | 本月 | 移动端结构化数据缺失、hreflang 错误、孤立页面 |
| **P3 增强** | 锦上添花 | 按季度 | llms.txt、图片 AVIF 升级、内容修剪 |

**执行规则**:
```
有 P0 → 不做任何其他事，先修 P0
无 P0 → 优先 P1（速赢），本周内排完
P1 全清 → 排 P2，跟开发报排期
P2 完成 → P3 作为季度 OKR
```

---

## 三、P0 阻断器检查清单

### 3.1 Can Googlebot reach every important page?

```
□ robots.txt 没有 Disallow 重要路径
□ 没有 noindex 在需要索引的页面上
□ 所有重要页面返回 200（不是 302/404/5xx）
□ sitemap.xml 包含所有索引页（排除 noindex 页）
□ sitemap 已提交到 GSC
```

### 3.2 Can Googlebot render the content?

```
□ 关键内容在原始 HTML 中就存在（不依赖 JS 渲染）
□ 图片有明确的 width/height（无 CLS）
□ JavaScript 不阻塞内容加载
```

### 3.3 Is the content machine-readable?

```
□ 每个内容页有 Article Schema（headline + author + datePublished）
□ 每页有 canonical 自引用（绝对 URL）
□ 页面可以被 AI 爬虫抓取（GPTBot/Google-Extended 未被屏蔽）
```

---

## 四、P1 速赢清单（按投入产出排序）

### 4.1 IndexNow 配置（0.5 天，0 成本）

**为什么重要**: ChatGPT Search 依赖 Bing 索引。有 IndexNow：5-10 天进入 ChatGPT；无 IndexNow：1-4 周。

**实施三步**:
```
1. 生成 API key（16 进制，8-128 字符）
2. 在域名根目录放 {key}.txt
3. 内容发布/更新时 POST → https://api.indexnow.org/indexnow
```

**如果用了 Cloudflare**：一键集成，无需手动配置。

### 4.2 Schema 覆盖（1 天，低代码）

| 页面类型 | 必须 | 可选 | 优先级 |
|---------|------|------|--------|
| 所有内容页 | Article + BreadcrumbList | Person (作者) | P1 |
| FAQ 页 | FAQPage | — | P1 |
| 首页 | Organization + WebSite | SearchAction | P1 |
| 产品/功能页 | SoftwareApplication | — | P1 |
| 电商产品页 | Product + Offer | AggregateRating | P1 |

**Schema 验证三件套**:
```
1️⃣ Schema.org Validator → 协议合规
2️⃣ Google Rich Results Test → Google 富结果资格
3️⃣ 生产环境预览验证 → 真正渲染的内容
```

### 4.3 Core Web Vitals 快速修复

```
LCP > 2.5s 的修复顺序:
  1. 首屏图加 fetchpriority="high" + <link rel="preload">
  2. 图片转 WebP（效果通常立竿见影）
  3. 移除渲染阻塞 JS/CSS

INP > 200ms 的修复:
  1. 代码分割，延迟非关键 JS
  2. React 站点：检查是否有不必要的重渲染

CLS > 0.1 的修复:
  1. 所有图片/视频加上明确的 width + height
  2. font-display: swap（防止字体加载导致布局偏移）
```

**⚠️ 重要**: 用 CrUX 现场数据判断，不是 PageSpeed Insights 实验室数据。现场数据才是 Google 排名的依据。

### 4.4 内容修剪（0.5 天/季度）

```
过去 12 个月零自然搜索流量的页面:
  ├→ 改进（补充数据、更新内容、加内链）→ 保留
  ├→ 合并（301 到主题集群内最强页面）
  └→ 删除（noindex + 从 sitemap 中移除）

标签页、日期归档页、空分类页 → 默认 noindex
```

---

## 五、P2 项目指南

### 5.1 移动端 Schema 一致性

**常见问题**: 桌面版有 Product Schema，但移动版没有（因为 Schema 在桌面侧边栏小部件中注入）。

**修复**: 把 Schema 移到页面级 HTML `<head>`，不依赖桌面组件。

### 5.2 Hreflang 审计

> 超过 75% 的 hreflang 实施有错误。最致命：缺返回标签（43%）。

**检查规则**:
```
□ 每页有自引用 hreflang 标签
□ A → B 且 B → A（双向互指）
□ x-default 已包含
□ canonical 不跨语言
□ 仅索引页面有 hreflang
□ URL 是绝对路径
□ 语言代码符合 ISO（en-gb 不是 en-uk）
```

### 5.3 内链修复

```
检查:
□ 是否有无内链指向的页面（Screaming Frog crawl → 对比内链报告）
□ 是否有锚文本同类化（同一锚文本指向不同 URL）
□ 是否有超过 3 层才能从首页到达的页面
□ 主题集群：Pillar → Spoke → Spoke 交叉链接

修复优先级:
P0: 有外链或关键词排名的孤立页面 → 接回内链
P1: 锚文本同类化 → 用同义词区分
P2: >3 点击深度 → 加面包屑 + 侧边栏链接
```

---

## 六、P3 季度增强

| 项目 | 投入 | 收益 |
|------|------|------|
| llms.txt 部署 | 1 小时 | AI 引用指导信号 |
| WebP → AVIF 升级 | 1-2 天 | 图片减小 40-50% |
| 图片缓存策略 | 半天 | LCP 改善 |
| `Cache-Control: public, max-age=31536000, immutable` | | |

---

## 七、季度审计日历

```
第 1 个月: 完整审计 → 修复 P0 + P1
  第 1 周: Phase 1-2（可抓取性 + 索引）
  第 2 周: Phase 3（Schema）
  第 3 周: Phase 4（性能）
  第 4 周: 修复 P0/P1 问题

第 2 个月: P2 项目执行
  第 1-2 周: 排名靠前的 P2 项目
  第 3-4 周: 剩余 P2

第 3 个月: P3 + 内容修剪 + 下季度规划
  第 1-2 周: P3 增强
  第 3 周: 内容修剪
  第 4 周: 撰写下季度技术 SEO OKR
```

---

## 八、按业务类型的技术 SEO 差异

### Schema 优先级差异

| Schema 类型 | SaaS | B2C 电商 | B2B |
|------------|------|---------|-----|
| **SoftwareApplication** | ✅ 必须（功能/产品页） | ❌ 不要用 | ❌ 不要用 |
| **Product + Offer** | ⚠️ 如有定价页可用 | ✅ **必须** | ✅ 必要（规格向） |
| **AggregateRating / Review** | ⚠️ G2 集成可用 | ✅ **必须** | ⚠️ 如有评价可用 |
| **LocalBusiness** | ❌ | ❌（品牌时用 Organization） | ✅ 如有线下地址 |
| **Organization + sameAs** | ✅ 必须 | ✅ 必须 | ✅ 必须 |
| **Article** | ✅ 内容页 | ✅ 内容页 | ✅ 内容页 |
| **FAQPage** | ✅ 必须 | ✅ 必须 | ✅ 必须 |

### 核心 Core Web Vitals 目标差异

| 指标 | SaaS | B2C 电商 | B2B |
|------|------|---------|-----|
| **LCP 主要罪犯** | 首屏 SaaS demo 图/动画 | 产品图 | 白皮书 PDF/服务图 |
| **图片数量** | 少（1-3 张关键图） | 多（10-50 张产品图） | 中（5-15 张） |
| **移动端要求** | 响应式 + 交互流畅 | **极重要**（购物场景多在移动端） | 响应式（但桌面端仍是主力） |
| **JS 复杂度** | 中（工具/计算器/登录） | 高（购物车/筛选/推荐） | 低（内容为主） |

### 其他类型差异

| | SaaS | B2C 电商 | B2B |
|--|------|---------|-----|
| **分面导航 canonical** | 不需要 | ✅ **必须**（避免重复分类页） | ⚠️ 可用 |
| **搜索框 SearchAction** | ✅ WebSite Schema 加 | ✅ 有搜索功能就加 | ✅ 有搜索功能就加 |
| **评价 Schema** | Capterra/G2 引用 | **Product Review** 必备 | 案例研究（真人真数据） |
| **P0 阻断器常见项** | 试用登录被屏蔽 | 产品图未加载 | 规格表/PDF 不可抓取 |

---

## 更新记录

| 日期 | 事件 |
|------|------|
| 2026-06-06 | 初始化 |
| 2026-07-13 | 全面重写为执行手册（含审计工作流、P0-P3 优先级矩阵、速赢清单、季度日历） |
| 2026-07-13 | 新增"按业务类型的技术 SEO 差异"章节（Schema 优先级、CWV 目标、其他差异） |
