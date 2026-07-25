# 站型路由 / 类型闸门（基于 Gingiris 分类体系）

> 用途：**拿到任何一个站点，先过这个路由，决定调哪个 per-type SEO skill**，避免把 SaaS 打法无脑套到 B2C 站。
> 来源：生姜Iris（Gingiris-1031）SEO/GEO 蓝本体系（4 份已存档 SKILL：`gingiris-seo-geo` / `gingiris-seo-geo-agent` / `gingiris-b2b-growth` / `2c-adaptation`）。
> 性质：**第三方蓝本参考**，非本项目原创；数据部分多为 SELF-REPORTED / 公开口径，引用时标注年份与来源。
> 配合文档：`site-types.md`（5 类图谱）、`knowledge-classification.md` 第十板块（站型工作流）。

---

## 一、Gingiris 的两轴分类模型

Gingiris 不按"卖什么"分，而按 **「卖给谁 + 怎么增长」** 分。它把企业分成两条主轨 + 增长模式轴：

```
                卖给企业 / 开发者
                       │
        ┌──────────────┴───────────────┐
        │  B2B / 开源 / 开发者工具（默认）  │  ← 主轨 A
        │  · 开发者工具 / OSS / B2B SaaS    │
        │  · 增长模式：PLG vs SLG（见下）   │
        └──────────────┬───────────────┘
                       │
                卖给消费者（2C）
        ┌──────────────┴───────────────┐
        │  2C（教育 / 应用 / 游戏 / 消费品 / 内容订阅）│  ← 主轨 B
        │  · 关键词双轨（红利词+长尾）         │
        │  · 区域渠道 + YMYL + KOL 分层       │
        └──────────────────────────────┘
```

| 轴 | Gingiris 取值 | 我们怎么用 |
|---|---|---|
| **卖给谁** | B2B/开源 vs 2C | 决定调 `seo-saas`+`seo-b2b` vs `seo-b2c`+`seo-content-site` |
| **怎么增长（仅 B2B SaaS）** | PLG vs SLG | 决定内容/外链/定价的侧重（见第三节） |
| **站型本质（我们自有轴）** | SaaS / B2C货品 / B2B批发 / 内容站 | 真正的执行分层（见第二节） |

> 关键认知差异：Gingiris 的「B2B SaaS」在我们的体系里 = **`seo-saas`**（卖订阅软件）；
> Gingiris 的「2C 消费品/应用」 = 我们的 **`seo-b2c`**（卖实物货品）；
> Gingiris 的「2C 内容订阅」 = 我们的 **`seo-content-site`**（流量变现）。

---

## 二、路由器：任何站点 → 我们的 per-type skill

**第一步：定性「卖什么」（铁律，先看这个）**

| 判断 | 站型 | 调哪个 skill |
|---|---|---|
| 卖**订阅制软件**，转化=注册/试用/付费 | **SaaS**（含 B2B/B2C SaaS）| `seo-saas` |
| 卖**实物商品**，转化=加购/下单 | **B2C 货品（电商/DTC）** | `seo-b2c` |
| 卖**批发/代工/服务**，转化=询盘/演示 | **B2B 供应商** | `seo-b2b` |
| 靠**流量变现**（广告/Affiliate），无自有产品 | **内容站** | `seo-content-site` |

> ⚠️ 「B2C」一词有歧义：B2C **货品**（卖实物）= `seo-b2c`；B2C **SaaS**（Netflix/Calm 卖给个人）= 仍属 `seo-saas`。
> 区别在「卖的是货还是软件订阅」，不是「卖给企业还是个人」。详见 `seo-b2c` Step 0 警示。

**第二步：若是 SaaS，再判 PLG / SLG（仅影响增长侧重，不改变 skill）**

| 信号 | 增长引擎 | 内容/外链侧重 |
|---|---|---|
| ACV < $1k/年 **且** 决策 < 1 周 | **PLG**（产品驱动）| 免费工具 + 自助文档 + Product Hunt |
| ACV > $10k/年 **且** 决策 > 1 月 | **SLG**（销售驱动）| 案例研究 + ROI 计算器 + 销售辅助内容 |
| 中间 | **PLG→SLG 混合** | 两者结合 |

> InkFlow = SaaS、且纹身工作室决策快、客单价中低 → **偏 PLG**，用 `seo-saas` 的免费工具引流杠杆。

**第三步：Gingiris 的"扩展类型"如何映射到我们的 4 型**

Gingiris 目录里还有 OSS / App(ASO) / Hardware / Local 等标签，但它们本质是我们的基础 4 型的**垂直变体**，不必新开 skill：

| Gingiris 标签 | 本质 | 映射到 | 备注 |
|---|---|---|---|
| 开源 OSS（GitHub stars）| 开发者工具 = B2B SaaS 子集 | `seo-saas` | 加 GitHub README/社区作为外链与信任源 |
| 移动应用 App（ASO）| 消费者应用 | `seo-b2c`（应用商店页）+ ASO 专项 | 70% 商店访客用搜索发现 App（Apple 官方）|
| 硬件 Hardware | 消费硬件 / 企业硬件 | `seo-b2c`（消费）/ `seo-b2b`（企业）| 众筹→$100M ARR 路线（Plaud/Insta360）|
| 本地 Local | 本地商家 | `seo-b2c` + `local-seo.md` | 地图包 + 本地评测 |
| 社区/KOL | 增长渠道（非站型）| 跨 `seo-b2c`/`seo-content-site` | 见 `九、平台特指` |

> 结论：**我们的 4 型体系已覆盖 Gingiris 全部站型**，无需新增 skill；差异只是垂直细节，用「基础 skill + 该垂直的 KB 章节」组合即可。

---

## 三、B2B SaaS 增长阶段（PLG/SLG 后的路径，来自 `gingiris-b2b-growth`）

路由到 `seo-saas` 后，按当前 ARR 阶段决定 SEO/内容投入侧重：

| 阶段 | ARR | 内容/SEO 侧重 |
|---|---|---|
| **Pre-PMF** | $0–$100k | 先做用户访谈确认 must-have；内容极少，不为 SEO 扩量 |
| **Early PMF** | $100k–$1M | **投 1–2 个渠道做深**（如对比页 + Product Hunt），不广撒网 |
| **Growth** | $1M–$5M | 加 affiliate + 集成伙伴；PLG 加 sales-assist 内容 |
| **Scale** | $5M–$10M | Enterprise 内容（合规/SOC2/ROI 计算器）+ 渠道加码 |
| **Ecosystem** | $10M+ | 开放平台内容 + 代理/机构分销内容 |

**2B 内容公式（SaaS 内容页必须）：**
- 80% 讲「如何帮客户成功」+ 20% 讲客户；deck/案例「先讲痛点，再讲解法」
- **必须有可验证案例**（ROI / 省时 / 省人力，如 "customer X saved Y hours/month"）
- **必须有 CFO 友好定价页**（ROI 计算器 + 年付折扣 + 合规文档）
- ❌ 不用 B2C 话术（"amazing"、"magical"）

**反模式：** 没 PMF 就投流（烧钱比学习快 10x）；只看 ARR 不看 NRR（NRR<100% = 漏水桶）；一个合同模板套所有人。

---

## 四、2C 专属分支（来自 `2c-adaptation`，路由到 `seo-b2c` 后启用）

2C 站（尤其是教育/金融/医疗/出海）与 B2B 默认参数不同，需切换：

| 维度 | B2B 默认 | 2C 调整 |
|---|---|---|
| 关键词 volume 下限 | 300 | **50**（长尾高转化词量少但值得做）|
| 关键词策略 | 单轨 BOFU+长尾 | **双轨**：红利词（时间窗口）+ 长尾高转化 |
| E-E-A-T | 创始人真实声音 | YMYL 品类需可验证资质 + 方法论透明页 |
| 启动渠道 | PH/GitHub/HN | 区域社区（抖音/小红书/Naver/KakaoTalk/Reddit）|
| 程序化页面 | 风险低 | 需「每页独有价值」，防 doorway penalty |
| 外链来源 | 技术媒体/dev blog | 行业媒体/学校机构/垂直 KOL |

> 详细操作（双轨关键词、区域渠道数据、YMYL 五动作、KOL 分层、程序化质量闸）见 `seo-b2c` 第十一~十四节，及 `九、平台特指`、`十一、算法与趋势`。

---

## 五、与本项目执行档案的对接

- **InkFlow** → 已被钦定 = `seo-saas`（B2B SaaS，偏 PLG）。本路由仅用于 InkFlow 未来接的新站型，或客户项目定性。
- **类型不确定时**：先读 `site-types.md` 5 类图谱 → 回到第二节路由表 → 调对应 skill。
- **不要用本路由替代执行**：路由只决定「调哪个 skill」，具体动作在对应 per-type skill 里。

---

> 本文件为「按企业类型做 SEO」系列的**分类枢纽**，对照 Gingiris 蓝本整理。四套 per-type skill（seo-saas/b2c/b2b/content-site）为可执行层；本文件为分类决策层。
