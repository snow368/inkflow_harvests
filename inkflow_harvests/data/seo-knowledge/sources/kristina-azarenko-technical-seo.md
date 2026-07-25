# @KristinaAzarenko — 技术 SEO 专家

**类型：** 🟢 SaaS / 技术 SEO
**专注：** 技术 SEO、Core Web Vitals、JavaScript SEO、GEO（LLM 优化）
**来源：** Moz Whiteboard Friday、MarketingMiner 采访、Sitebulb、iPullRank Podcast、Majestic
**状态：** ✅ 已学（搜索聚合，非 X 直接抓取）

---

## 适用分类
方法论与工具, 技术SEO

## 核心定位

Kristina 是 **MarketingSyrup** 创始人，**SEO Pro Extension** 和 **SEO Challenge Course** 创建者。超过 10 年 SEO 经验，专攻技术 SEO，尤其关注 JavaScript 框架网站的索引问题。

---

## 关键方法论

### 1. 技术 SEO 基础层

| 问题 | 症状 | 正确做法 |
|------|------|---------|
| **按钮当链接用** | `<button>` 通过 `window.location` 跳转 | 导航必须用 `<a href>`，否则 Google 不爬 |
| **CSS 背景图** | 图片通过 CSS background-image 引入 | 搜索引擎视为装饰，不会索引，必须用 `<img src>` |
| **Lazy Loading 陷阱** | Googlebot 不滚动，折叠以下 placeholder 永不加载 | `src` 属性中必须有默认图片 URL |
| **JS 渲染索引** | SPA/CSR 页面内容无法被索引 | SSR 或 proper hydration，保证 Google 能看到 |
| **Crawling vs Indexing** | 混淆 robots.txt 和 meta robots | robots.txt 控制爬取，meta robots/canonical 控制索引 |

### 2. Core Web Vitals = UX 信号

- Core Web Vitals 不是技术勾选框，而是 Google 评估用户体验的核心信号
- 技术 SEO 是地基——CWV 差或页面不可索引，内容营销做得再好也没用
- 她做了 **Squid Game 主题的 CWV 评估工具**（在 iPullRank Podcast 提到）

### 3. 停止痴迷排名，关注 TRevenue

> "Stop obsessing over rankings — focus on user intent, page experience, and **TRevenue** (traffic that brings revenue)"

- 排名本身不是目标，有收入的流量才是
- 用户意图 + 页面体验 = 可持续的 SEO

### 4. Site Migration 常见坑

- 把所有页面 301 到首页 → ❌
- 忘记图片重定向 → ❌
- SEO 团队不早期参与迁移 → ❌

### 5. SEO Pro Extension

免费浏览器扩展，一键显示：
- Page Title / Meta Description / Canonical
- Headings 结构
- 图片索引状态
- Redirect Chain
- **Core Web Vitals**（实时）

---

## 对 InkFlow 的适用性

| 维度 | 判定 |
|------|------|
| **JS 框架提醒** | ⚠️ InkFlow 是 React (Vite) SPA，Kristina 的 JS 索引建议直接相关 |
| **Core Web Vitals** | ✅ PWA 的 CWV 是排名信号，上线前必须跑 Lighthouse |
| **图片索引** | ✅ 纹身作品图不能放 CSS 里，必须用 `<img>` + alt text |
| **Site Migration** | ⏳ 换域名时回顾她的迁移清单 |
| **TRevenue 理念** | ✅ 做 SEO 不只看排名，看哪些页带来预约/付费转化 |

---

## 冲突点

| vs 谁 | 冲突 | 判断 |
|-------|------|------|
| @CoderJeffLee（结构/内容/信任） | CoderJeffLee 侧重系统和内容，Kristina 更偏纯技术 | ✅ 互补，不是冲突。Jeff 适合前期策略，Kristina 适合上线前的技术审计 |

---

## 行动项

- [ ] 上线前跑 Lighthouse CWV 审计
- [ ] 检查 InkFlow 中 `<button>` vs `<a>` 使用场景
- [ ] 确认所有纹身作品图用了 `<img>` 而不是 CSS background
- [ ] 检查 React lazy load 对 Googlebot 的可见性
