# JavaScript SEO（2026）

---

## 适用分类
技术SEO

## 核心问题

搜索引擎和 AI 爬虫看到 React SPA 时可能只看到一个空的 `<div id="root"></div>`。

Google 有两轮索引：第一轮抓原始 HTML，第二轮（几小时到几天后）渲染 JS。其他搜索引擎和 AI 爬虫的 JS 渲染能力更差。

## InkFlow 的情况

| 部分 | 方案 | SEO 影响 |
|------|------|---------|
| 营销官网（Astro） | SSG ✅ | 完全没问题，零 JS Landing Page |
| PWA（React） | CSR ⚠️ | 搬到 /app/ 后，营销站不受影响 |

## 推荐方案

**新项目首选：** Next.js（SSR/SSG）或 Astro（SSG）
**已有 CSR 项目：** 用预渲染工具过渡

## 检查清单

1. 用 `curl -A "Googlebot" https://yoursite.com` 检查原始 HTML
2. 如果看到 `<div id="root"></div>` → CSR 问题
3. Meta title/description 必须在初始 HTML 中，不能通过 JS 注入
4. 内链用 `<a href="/page">` 而不是 `onClick`
5. robots.txt 显式允许 AI 爬虫
6. 动态 sitemap
7. JSON-LD 结构化数据

## InkFlow 执行
- 营销站用 Astro（SSG）→ 正确 ✅
- PWA 搬到 /app/ → 不影响营销站 SEO ✅
- 不需要担心 JS SEO 问题
