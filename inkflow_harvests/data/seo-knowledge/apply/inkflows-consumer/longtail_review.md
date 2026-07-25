# InkFlow 长尾词词级审核报告

> 审核对象: **5652** 个 Google Suggest 长尾词 (来源 `longtail_matrix.csv`)
> 方法: 应用 `seo-knowledge` 关键词方法论 (4类意图 + 4道审核闸)
> 生成时间: 2026-07-14

## 一、意图分布 (KB 4 类)

| 意图 | 数量 | 占比 | 对应内容 |
|------|------|------|----------|
| TOFU-信息型 | 5330 | 94.3% | 博客/指南 |
| MOFU-商业型 | 14 | 0.2% | 功能页 |
| BOFU-交易型 | 294 | 5.2% | 对比/产品页 |
| 导航型 | 14 | 0.2% | 品牌页 |

## 二、审核决策 (4 道闸结果)

| 决策 | 数量 | 占比 | 含义 |
|------|------|------|------|
| keep | 5294 | 93.7% | 通过前3闸, KD待哥飞确认 |
| review | 343 | 6.1% | 需人工决定 (蚕食/歧义) |
| reject | 15 | 0.3% | 噪声/无关/竞品词 |

## 三、业务侧分布

- B2B (工作室/艺术家工具向): 62 (1.1%)
- B2C (消费者内容向): 5590 (98.9%)

## 四、各集群 × 决策分布

| 集群 | keep | review | reject | 主要意图 |
|------|------|-------|--------|---------|
| ideas | 711 | 0 | 6 | TOFU-信息型 |
| aftercare | 703 | 0 | 3 | TOFU-信息型 |
| placement | 578 | 0 | 0 | TOFU-信息型 |
| small | 519 | 0 | 0 | TOFU-信息型 |
| problems | 422 | 0 | 0 | TOFU-信息型 |
| color | 408 | 0 | 1 | TOFU-信息型 |
| coverup | 363 | 0 | 1 | TOFU-信息型 |
| removal | 347 | 0 | 0 | TOFU-信息型 |
| meaning | 0 | 343 | 0 | TOFU-信息型 |
| cost | 328 | 0 | 0 | TOFU-信息型 |
| pain | 301 | 0 | 0 | TOFU-信息型 |
| styles | 243 | 0 | 0 | TOFU-信息型 |
| quotes | 173 | 0 | 3 | TOFU-信息型 |
| other | 86 | 0 | 0 | TOFU-信息型 |
| prep | 63 | 0 | 0 | TOFU-信息型 |
| trends | 49 | 0 | 1 | TOFU-信息型 |

## 五、关键结论

1. **TOFU 占比极高** — Google Suggest 长尾天然偏信息型 (how/what/guide/meaning/ideas)。
   按 KB 原则『前期 80% 精力做商业/交易型』, 这批词不能散养, 必须用 **Hub-and-Spoke**
   把 TOFU 权重通过内链导向 MOFU/BOFU 功能页 (即此前 aftercare 博客→工具 的漏斗)。
2. **meaning 簇全部 review** — 已被 Tattoo Meaning Finder 70 页覆盖, 新站不应再建重复页,
   改为在 70 页内做内链即可 (蚕食排查闸3)。
3. **KD 闸未闭合** — 沙箱无法稳定连哥飞, 5652 词暂无难度分。需本地运行:
   `export GEFEI_TOKEN=wc_mcp_7614980ee9bd6ae77d97d9932b054c39e01720b195c63500 && python mine_longtail.py --from-cache --max-kd 100 --out seo-targets/longtail_matrix`
   拿到 KD 后, 对 keep 词按 KD<20(新站)/25(B2C) 阈值二次筛选。
4. **BOFU/MOFU 词是金矿** — 含 best/vs/software/free 的词直接对应对比页/功能页, 优先排进建页。

## 六、keep 样例 (按优先级)

- [high] `app for tattoo placement` → MOFU-商业型 → blog/placement-for-men
- [high] `best antibiotic cream for tattoo infection` → BOFU-交易型 → blog/problems-infection
- [high] `best antibiotic cream for tattoo infection reddit` → BOFU-交易型 → blog/problems-infection
- [high] `best antibiotic for tattoo infection` → BOFU-交易型 → blog/problems-infection
- [high] `best antibiotic ointment for tattoo infection` → BOFU-交易型 → blog/problems-infection
- [high] `best black and grey realism tattoo artists` → BOFU-交易型 → blog/styles-blackwork
- [high] `best black and grey tattoo artist philadelphia` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best black and grey tattoo artists` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best black and grey tattoo artists chicago` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best black and grey tattoo artists denver` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best black and grey tattoo artists in the us` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best black and grey tattoo artists in the world` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best black and grey tattoo artists london` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best black and grey tattoo artists near me` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best black and grey tattoo artists uk` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best black and grey tattoos` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color for tattoo` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color tattoo` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color tattoo aftercare` → BOFU-交易型 → blog/aftercare-color-tattoo
- [high] `best color tattoo artist near me` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color tattoo artists` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color tattoo for dark skin` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color tattoo ink` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color tattoo ink brand` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color tattoo ink for brown skin` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color tattoo ink for dark skin` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best color tattoos near me` → BOFU-交易型 → blog/tattoo-color-guide
- [high] `best fine line tattoo artist brisbane` → BOFU-交易型 → blog/small-tattoo-ideas
- [high] `best fine line tattoo artists` → BOFU-交易型 → blog/small-tattoo-ideas
- [high] `best fine line tattoo artists london` → BOFU-交易型 → blog/small-tattoo-ideas

## 七、reject 样例

- `small tattoo ideas for men pinterest` — competitor-nav(竞品品牌词, 排不上)
- `tattoo aftercare amazon` — competitor-nav(竞品品牌词, 排不上)
- `tattoo aftercare etsy` — competitor-nav(竞品品牌词, 排不上)
- `tattoo aftercare kit amazon` — competitor-nav(竞品品牌词, 排不上)
- `tattoo color กาล ครั้ง 5` — noise(噪声/堆词/乱码)
- `tattoo cover up amazon` — competitor-nav(竞品品牌词, 排不上)
- `tattoo design pinterest` — competitor-nav(竞品品牌词, 排不上)
- `tattoo designs pinterest` — competitor-nav(竞品品牌词, 排不上)
- `tattoo ideas pinterest` — competitor-nav(竞品品牌词, 排不上)
- `tattoo ideas pinterest female` — competitor-nav(竞品品牌词, 排不上)
- `tattoo ideas pinterest men` — competitor-nav(竞品品牌词, 排不上)
- `tattoo quotes for instagram` — competitor-nav(竞品品牌词, 排不上)
- `tattoo quotes instagram` — competitor-nav(竞品品牌词, 排不上)
- `tattoo quotes pinterest` — competitor-nav(竞品品牌词, 排不上)
- `tattoo trend on tiktok` — competitor-nav(竞品品牌词, 排不上)

---
CSV 全量: `seo-targets\longtail_review.csv`
