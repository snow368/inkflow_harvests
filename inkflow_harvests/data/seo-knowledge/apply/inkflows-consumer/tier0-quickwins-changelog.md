# Tier 0 快速胜利改动记录（2026-07-15）

基于 GSC 导出（2026-06-16 ~ 2026-07-15，172 查询 / 695 曝光 / 2 点击 / 平均排名 67.6），
针对 **8 个卡在 8–20 名的快速胜利词**，做了一轮纯 on-page 优化（不依赖外链、不改主题方向）。

## 改动清单

### 1. 新建博客 `/blog/great-wave-kanagawa-tattoo-meaning`
- **目标词**：`great wave tattoo meaning`(≈10) / `kanagawa tattoo meaning`(≈14) / `hokusai wave tattoo meaning`(≈18)
- 之前**无对应页**（`/meaning/` 目录只有 `.bak` 备份）→ 净新增，一页吞 3 个同义词
- 含：BLUF 开头、历史（Hokusai 1831 / 富岳三十六景）、3 层含义 H2（great wave / kanagawa / hokusai）、设计+部位、文化挪用小节
- **E-E-A-T**：BlogSchema(author=InkFlow Team, publishedDate=2026-07-15, tags) + 2 真实引用（Wikipedia Great Wave + Britannica Hokusai）+ FAQPage + 内链到 `/free-tools/tattoo-meaning-finder`
- 题图：`public/images/blog/great-wave-kanagawa.svg`（新建）

### 2. `/compare/booksy` （pos 9, 词 `booksy`）
- 补 **FAQSchema**（3 条，含 "Booksy 价格 / 是否适合纹身店 / 最佳替代"）
- 新增「Compare Booksy to Other Tattoo Software」内链区 → 链 `/compare/tattoo-studio-pro`、`/compare/tattoogenda`、`/compare/best-tattoo-studio-software`
- 承接查询 `tattoo studio pro vs booksy`（pos 17.5）的横向对比意图

### 3. `/compare/tattoogenda` （pos 14, 词 `tattoogenda`）
- 补 **FAQSchema**（3 条）
- 新增内链区 → 链 booksy / tattoo-studio-pro / best-tattoo-studio-software

### 4. `/compare/tattoo-studio-pro` （pos 17.5, 词 `tattoo studio pro vs booksy`）
- 补 **FAQSchema**（3 条，含 TSP vs Booksy 直接对比）
- 新增「Tattoo Studio Pro vs Booksy」专段（含链接到 `/compare/booksy`）+ 内链区
- 与 booksy 页形成双向对比锚点，合力吃下该查询

### 5. `/free-tools/tattoo-meaning-finder` （pos 11.9, 词 `tattoo meaning finder`）
- 新增「Deep-Dive: Great Wave Off Kanagawa」CTA 段 → 内链到新博客（借现有排名页权重给新页导流）
- 标题/FAQ 已含 "finder" 词，本次只补内链

## 未做（留在后续）
- **E-E-A-T 全量**：对比页仅加了 FAQ + 内链；未建「具名作者 bio + 审核人 + about 页链接」体系（需单独的作者组件/页面，作为单独任务）
- **Tier 1 技术清理**（35 后台屏 noindex + 定价页 301）未动 —— 见 `b2b-saas-ranking-plan.md`
- **Tier 2 外链**（G2/Capterra）未动 —— B2B 钱词排 60–100 的根因是 0 外链，on-page 推不动

## 验证方法（2–4 周后回 GSC 看）
1. 打开 GSC → 效果 → 过滤 **页面 = 上述 5 个 URL**
2. 看 **平均排名** 是否从 9–18 区间进入前 10；看 **点击** 是否增长
3. 也可过滤 **查询** = `booksy` / `tattoogenda` / `tattoo meaning finder` / `great wave tattoo meaning` 等，观察位置曲线
4. 新博客需等 GSC 抓取+收录（提交 sitemap / 站内已内链，通常 1–2 周收录）

> 沙箱无法构建验证（无 node_modules + egress 仅 google.com）。请在本地 `npm install && npm run build` 确认无报错后再部署。
