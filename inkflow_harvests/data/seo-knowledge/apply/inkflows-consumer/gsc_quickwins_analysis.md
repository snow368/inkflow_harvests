# GSC 快速胜利分析 — ink-flows.com

> 数据源:`ink-flows.com-Performance-on-Search-2026-07-15.xlsx`(GSC 导出)
> 日期范围:**Last 3 months**,但实际数据自 **2026-06-16** 起(约 1 个月真实收录数据)。
> 生成:`scripts/analyze_gsc.py`(读 XLSX → CSV + 本分析)

## 1. 总体概况

- 总查询词:**172** 个
- 总曝光:**695** | 总点击:**2**
- 有位置词的加权平均排名:**67.6** 名
- 站点处于**新站低权威期**:绝大多数词排在 30 名开外,但**有 8 个词已卡在 8–20 名快速胜利区**(多为已有页面,只需轻量优化即可进前 10)。

## 2. 位置分布

| 区间 | 词数 | 说明 |
|------|------|------|
| Top 3 | 0 | 已基本上榜 |
| Top 10 (4-7) | 2 | 首页内但未到顶 |
| **快速胜利 8-20** | **8** | **已有页面,轻量优化可进前 10(本次重点)** |
| 21-30 | 6 | 接近第二页头部 |
| 31-50 | 20 | 中深 |
| 50+ 深 | 136 | 几乎无展现权重(含全部高量 B2B 钱词) |
| 无位置 | 0 | — |

> **关键修正**:快速胜利词(8–20)有 **8 个**,不是"几乎没有"。但它们**曝光都很小(1–7)**,且是
> "含义工具词 + B2B 对比/竞品词"的混合;真正高曝光(30–40)的 B2B 钱词(tattoo studio software 等)
> 全在 **60–100 名深区**——那些靠 on-page 微调推不动,得靠权威/外链。

## 3. 快速胜利词(8–20 名)→ 目标页 + 动作

> 8 个里有 1 个是噪声、1 个是弱品牌词,实际可操作 **6 个**,且几乎都已有对应页面。

| 查询 | 曝光 | 位置 | 目标页(本地已有) | 动作(低成本) |
|------|------|------|------------------|--------------|
| tattoo meaning finder | 7 | 11.9 | `/free-tools/tattoo-meaning-finder` | **已拿 1 点击!** 标题/H1 加 "finder",补 FAQ,内链到 `/meaning` |
| tattoo studio pro vs booksy | 4 | 17.5 | `/compare/tattoo-studio-pro` + `/compare/booksy` | 两页互链、各自标题含对方品牌;或建专属对比页 |
| great wave tattoo meaning | 3 | 10.0 | `/meaning`(建巨浪含义页) | 新建"神奈川冲浪里 tattoo meaning"博客,吃 B2C 低竞争词 |
| tattoogenda | 2 | 14.0 | `/compare/tattoogenda` | 已排 14,优化 title+FAQ 推前 10 |
| kanagawa wave tattoo meaning | 2 | 18.5 | `/meaning`(同上巨浪页) | 与 great wave **合并一篇**,覆盖 3 个同义查询 |
| booksy | 1 | 9.0 | `/compare/booksy` | 已排 9,优化推前 5 |
| inklow | 2 | 8.5 | (无) | 竞品/品牌词,量小暂不强做 |
| "ip address geolocation" -site:… | 2 | 9.5 | — | **噪声,忽略** |

**核心动作**:为 `/free-tools/tattoo-meaning-finder`、`/compare/booksy`、`/compare/tattoogenda`、
`/compare/tattoo-studio-pro` 做标题/FAQ/内链微调;新建 1 篇"神奈川冲浪里纹身含义"吞掉 great wave / kanagawa / hokusai 三个词。
这 6 个从 9–18 推到前 10,是**本周就能交的便宜胜利**。

## 4. 高曝光词(按曝光降序,即使位置深)

| 查询 | 曝光 | 位置 | 点击 | 区间 |
|------|------|------|------|------|
| inkflow | 44 | 30.3 | 1 | near_top |
| tattoo meaning finder | 7 | 11.9 | 1 | quick_win |
| tattoo shop pos system | 40 | 81.4 | 0 | deep |
| tattoo studio software | 37 | 87.4 | 0 | deep |
| tattoo shop pos | 35 | 83.9 | 0 | deep |
| best tattoo studio software | 30 | 63.2 | 0 | deep |
| tattoo pos | 29 | 88.1 | 0 | deep |
| tattoo appointment scheduling software | 28 | 80.2 | 0 | deep |
| tattoo pos software | 25 | 84.4 | 0 | deep |
| tattoo shop management software | 17 | 81.2 | 0 | deep |
| tattoo scheduling software | 17 | 86.8 | 0 | deep |
| tattoo studio scheduling software | 16 | 76.3 | 0 | deep |
| tattoo shop appointment software | 13 | 81.7 | 0 | deep |
| tattoo scheduling app | 13 | 89.9 | 0 | deep |
| tattoo client management software | 13 | 90.2 | 0 | deep |

## 5. B2B 软件钱词(高商业价值,当前位置深)

> 这些词有真实搜索量(13–40 曝光/词)但排在 60–100 名,是 B2B SaaS 计划的核心目标。
> **一旦权威/外链起来,它们最先受益**;当前 on-page 优化是打地基,单靠它推不动深排名。

| 查询 | 曝光 | 当前位置 | 建议目标页 |
|------|------|----------|------------|
| tattoo shop pos system | 40 | 81.4 | /tattoo-pos-system |
| tattoo studio software | 37 | 87.4 | /features (或 /tattoo-business-management) |
| tattoo shop pos | 35 | 83.9 | /tattoo-pos-system |
| best tattoo studio software | 30 | 63.2 | /compare/best-tattoo-studio-software |
| tattoo pos | 29 | 88.1 | /tattoo-pos-system |
| tattoo appointment scheduling software | 28 | 80.2 | /tattoo-scheduling-software |
| tattoo pos software | 25 | 84.4 | /tattoo-pos-system |
| tattoo shop management software | 17 | 81.2 | /tattoo-business-management |
| tattoo scheduling software | 17 | 86.8 | /tattoo-scheduling-software |
| tattoo studio scheduling software | 16 | 76.3 | /tattoo-scheduling-software |
| tattoo shop appointment software | 13 | 81.7 | /tattoo-scheduling-software |
| tattoo scheduling app | 13 | 89.9 | /tattoo-booking-app |
| tattoo client management software | 13 | 90.2 | /tattoo-client-management |
| tattoo studio workflow software | 12 | 70.4 | /tattoo-business-management |
| tattoo deposit booking system | 11 | 87.9 | /tattoo-deposit-software |

(另含 crm / waiver / payment / consent 等 50+ 长尾,完整见 `gsc_queries.csv`)

## 6. 表现最好的页面(按曝光)

| 页面 | 曝光 | 位置 | 点击 |
|------|------|------|------|
| https://ink-flows.com/ | 125 | 29.7 | 1 |
| https://ink-flows.com/free-tools/tattoo-meaning-finder | (见查询) | — | — |
| https://ink-flows.com/features | 140 | 80.6 | 0 |
| https://ink-flows.com/compare | 81 | 77.8 | 0 |
| https://ink-flows.com/features/tattoo-aftercare-software-automation | 79 | 72.2 | 0 |
| https://ink-flows.com/features/tattoo-supply-brands | 72 | 62.3 | 0 |

> 首页 `/` 拿最多曝光(125)却排 29.7 —— 主页权威不足,印证"整站低权威"。
> `/features`、`/compare` 等钱页有大量曝光但排 70–80 —— 目标页 on-page 已不错,缺的是**权威**。

## 7. 修订后的优先级(叠加进 b2b-saas-ranking-plan)

**Tier 0 — 本周便宜胜利(快速胜利词,已有页)**
- 优化 6 个快速胜利页的 Title/H1/FAQ/内链(见 §3 表)。
- 新建 1 篇"神奈川冲浪里纹身含义"博客,吞 great wave / kanagawa / hokusai 三词。
- 预期:6 个词从 9–18 → 前 10,直接增点击(meaning finder 已验证可拿点击)。

**Tier 1 — 结构清理(集中有限权重)**
- 35 个后台屏 noindex + `/PricingPage`→`/pricing` 301(见 `noindex_candidates.csv`)。
- 全站位置深 = 权重被后台屏稀释,清理后钱页更易爬、更易集权。

**Tier 2 — 权威/外链(撬动深排名的主杠杆)**
- B2B 钱词(§5)排 60–100,根因是新站 0 外链 vs Booksy/Mindbody 10 年域名权。
- 优先:G2 / Capterra 上架 + 替代页矩阵互链 + 行业站客座/目录。
- 钱页 on-page(FAQ/Schema)先补好打地基,等外链一到即承接排名。

**Tier 3 — 消费者内容长期线**
- aftercare / ideas 簇继续写(已写 aftercare Brief),吃顶部流量;短期不解决 B2B 深排名,但建主题权威、反哺整站。

**复盘节奏**:1 个月后重跑 `analyze_gsc.py`,看 Tier 2 外链生效后是否出现新的 8–20 快速胜利词。

---
*附产出:`gsc_queries.csv`(172 词全量+区间标注)、`gsc_pages.csv`(页面级曝光/位置)。*
