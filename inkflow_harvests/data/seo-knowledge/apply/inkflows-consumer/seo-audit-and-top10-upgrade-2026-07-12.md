# SEO 内容审核 + 超越 Top10 内容升级 + 技术排查（2026-07-12）

## 一、技术 SEO 排查（seo-technical-check 流程）

### 已修复
| # | 问题 | 修复 | 文件 |
|---|------|------|------|
| T1 | **缺 `404.astro`**（Astro 不自动生成） | 新建静态 404 页，含返回首页 / 纹身含义 / 工具 / 博客入口 | `src/pages/404.astro` |
| T2 | **`SEOHead` 给所有内容页注入了 `SoftwareApplication` schema** —— 分类/符号/博客/about 应是 Article/CollectionPage | `SEOHead` 加 `appSchema?: boolean`（默认 true）；内容页传 `appSchema={false}` 关闭错误 schema | `src/components/SEOHead.astro` + 8 博客页 + 分类页 + 符号页 + `about.astro` |
| T3 | **符号页（70 个）完全无结构化数据** | 加 `Article` + `BreadcrumbList` 双 JSON-LD（数据驱动，一次覆盖全部符号页） | `src/pages/meaning/[symbol].astro` |

### 核验通过（无需改）
- **Canonical**：内容页经 `SEOHead` 用 `Astro.url.href` 自引用，绝对 URL（含 `https://ink-flows.com`），正确。
- **robots.txt**：`Allow: /` + `Sitemap: https://ink-flows.com/sitemap-index.xml` + 已放行 OAI-SearchBot / Claude-SearchBot / PerplexityBot / GPTBot / Google-Extended（AEO/GEO 友好）。无 `Disallow` 误屏蔽。
- **sitemap**：`@astrojs/sitemap` v3 已配，排除 `/book/`，带 `lastmod`。
- **noindex / nofollow**：源码无遗留（仅 `.agents/skills/` 文档中出现，非线上页）。

## 二、内容审核（15 个分类 head-term 页）

量化脚本结论（正文词数 = h1+intro+deepDive+choosingGuide+placementGuide+didYouKnow+popularSymbols+FAQ）：

| 页面 | 词数 | FAQ | dataInsights | choosingGuide | placementGuide | popularSymbols | E-E-A-T(2源) |
|------|------|-----|------|------|------|------|------|
| animals | 978 | 5 | Y | Y | Y | Y | Y |
| flowers | 905 | 5 | Y | Y | Y | Y | Y |
| mythological | 877 | 5 | Y | Y | Y | Y | Y |
| nature | 849 | 5 | Y | Y | Y | Y | Y |
| geometric | 933 | 5 | Y | Y | Y | Y | Y |
| religious | 930 | 5 | Y | Y | Y | Y | Y |
| cultural | 905 | 5 | Y | Y | Y | Y | Y |
| objects | 874 | 5 | Y | Y | Y | Y | Y |
| modern | 830 | 5 | Y | Y | Y | Y | Y |
| birds | 833 | 5 | Y | Y | Y | Y | Y |
| zodiac | 846 | 5 | Y | Y | Y | Y | Y |
| insects | 820 | 10 | Y | Y | Y | Y | Y |
| time | 839 | 5 | Y | Y | Y | Y | Y |
| words | 861 | 5 | Y | Y | Y | Y | Y |
| sea-life | (同档) | 5 | Y | Y | Y | Y | Y |

**关键发现**：`animals / flowers / nature / mythological` 这 4 个"原始厚页"此前漏做深度扩展，一度最短（~550 词、缺 choosingGuide/placementGuide/popularSymbols）——现已补齐至与其余 11 个同等水平。

> E-E-A-T 说明：`CATEGORY_EEAT` 是对象字面量（键为复数 `animals/flowers/...`），每类 2 条权威来源（Smithsonian/Krutak、Wohlrab 2007 DOI、Jung、British Museum、IBISWorld、Ipsos 等），于前序工作已落地——此前脚本误报 `src=0` 是键名匹配错误，实际达标。

## 三、SERP Top10 差距分析（15 主词，委托子代理 WebSearch）

跨 15 词的共同缺口（来自真实竞品 top-3：tattmag、tattoobond、oracletattoogallery、46tattoo、tattoostours 等）：

- **放置指引** → 我们 11 个已扩页有，4 个漏网页已补（✅ 已闭）
- **颜色/风格含义**（blackwork vs watercolor vs fine-line；同花不同色义）→ 部分覆盖（flowers/animals 的 deepDive 已含），**可作为下一步差异化卖点**
- **历史文化起源 hook** → deepDive/didYouKnow 已覆盖（✅）
- **文化尊重声明**（宗教/文化 appropriation）→ religious/cultural 的 deepDive 已含（✅）
- **Aftercare/ longevity** → 我们有 aftercare 工具页，可加内容钩子
- **按项结构化索引（A–Z / 12 星座 / 25 风格）** → 多符号分类已靠符号网格覆盖；**单符号分类（birds/zodiac/insects/sea-life/time/words）符号网格偏薄**，popularSymbols 列表已补 3–4 例缓解

## 四、已实施的内容升级
- 4 个漏网分类页补齐 `choosingGuide` + `placementGuide` + `popularSymbols`（用真实符号：animals→Wolf/Lion/Butterfly/Eagle；flowers→Rose/Lotus/Cherry Blossom/Sunflower；mythological→Phoenix/Dragon/Koi/Griffin；nature→Tree of Life/Wave/Mountain/Feather）。
- 全部 15 页现结构对齐 Top10 页大纲：intro + 历史文化(deepDive) + didYouKnow + 如何选择 + 放置 + 流行设计 + FAQ(5–10) + E-E-A-T + dataInsights。

## 五、剩余建议（下一步，未做）
1. **跨页颜色/风格含义 glossary**（flowers/animals/geometric/words 高价值差异化）
2. **符号页 E-E-A-T**：加 FAQ + 每页 author/reviewer + 已有 MedicalDisclaimer 复用
3. **外链 = 0**（Noel Ceta 模型中 +156% 最大因子，当前唯一 0 分项）→ 最大排名杠杆
4. **IndexNow 自动提交钩子**（加速收录，静默期唯一可主动加速项）
5. **CWV / PageSpeed 实测**（CWV 是排名因子）
6. **单符号分类扩符号数据集**或 richer popularSymbols

## 六、验证
- `tsc --noEmit`：本次改动的数据文件 **0 错误**（其余 466 为预存 React/.tsx `noImplicitAny`，astro build 的 esbuild 忽略）。
- `.astro` 改动（SEOHead 条件渲染 / 404 / 符号 schema / 11 处 `appSchema={false}`）语法已核对；沙箱拦截 `dist/` 写入无法跑完整 build，**需你本地 `npm run build` → `wrangler pages deploy dist --project-name ink-flow` 确认**。
