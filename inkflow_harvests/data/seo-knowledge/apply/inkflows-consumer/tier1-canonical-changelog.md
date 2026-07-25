# Tier 1 结构清理 — 执行记录（2026-07-15，修正版）

> 背景：原计划"给 35 个后台屏加 noindex"基于一份**错误的审计 CSV**（把 `.agents/skills` 噪声 + 误判的路由算进了根目录页）。
> 拿到 GSC pages 真实导出后纠正：**被索引的 75 个 URL 全是 `.astro` 营销页，没有任何 `.tsx` SPA 后台屏**。
> 真正的权重稀释源 = `.astro` 营销页的「带斜杠/不带斜杠 + www + http」双版本都被收录（约 20 对）。

## 已改文件（2 个，零风险，不碰后台代码）

### 1. `src/components/SEOHead.astro`
- **canonical 规范化**：从 `canonical || Astro.url.href`（自引用，不合并）改为 `normalizeCanonical()`：
  - 强制 `https:` 协议
  - 强制 host = `ink-flows.com`（去 www）
  - 强制结尾 `/`（除首页）
  - 去除 query / hash
- 同步用于 `og:url`。
- 新增 `<meta name="robots" content="index, follow">`（原 `.astro` 页缺失 robots meta）。
- 新增可选 `noindex` prop（默认 false），供未来按需 noindex 单页。

### 2. `_redirects`（Cloudflare Pages / Netlify 兼容格式）
- 新增两条 301：
  ```
  http://ink-flows.com/*    https://ink-flows.com/:splat    301
  https://www.ink-flows.com/*    https://ink-flows.com/:splat    301
  ```

## 验证（node 单测，规范逻辑正确）
```
/pricing                    => https://ink-flows.com/pricing/
/pricing/                   => https://ink-flows.com/pricing/
http://ink-flows.com/compare/booksy        => https://ink-flows.com/compare/booksy/
https://www.ink-flows.com/features/...     => https://ink-flows.com/features/.../
https://ink-flows.com/meaning/lotus?ref=x   => https://ink-flows.com/meaning/lotus/
```

## 效果预期
- 约 20 对重复 URL（/pricing↔/pricing/、/compare/booksy↔/compare/booksy/、http↔https、www↔非www）的排名信号合并到唯一 canonical。
- 不 404 任何现有链接（trailingSlash 保持默认 ignore，Cloudflare 对目录索引同时响应带/不带斜杠）。
- 后台 SPA 屏维持原状（它们 canonical 到 `/`，本就不单独收录，无需动）。

## 未做（及原因）
- ❌ 给 35 个后台屏加 noindex：它们未被收录，做了无用且易误伤公开 SPA 页（ArtistProfilePage 等）。
- ❌ `/PricingPage`→`/pricing` 301：SPA 路由未被收录，且为应用内导航目标，加 301 会破坏 in-app 跳转。

## 本地验证步骤（沙箱无法 build）
1. `npm install`
2. `npm run build`
3. 抽查 `dist/compare/booksy/index.html` 的 `<link rel="canonical">` 应为 `https://ink-flows.com/compare/booksy/`
4. 部署后 GSC → 效果 → 选几个原重复 URL，2–4 周后看是否合并到 canonical、平均排名是否回升。

## 关联文档
- 计划：`b2b-saas-ranking-plan.md`（Step 1 已改写为修正版）
- 数据源：`gsc_pages.csv`（真实索引 URL，75 条）
- 过时文件：`noindex_candidates.csv`（基于错误审计，**已作废**，请勿采用）
