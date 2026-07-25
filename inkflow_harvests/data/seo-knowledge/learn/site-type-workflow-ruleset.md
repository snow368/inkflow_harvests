# 按站点类型执行 SEO 的规范（审核 / 添加 / 调整）

> **铁律:任何站点在审核/添加/调整之前,先定性,再套对应工作流。** 不要把 SaaS 打法无脑套到 B2C/B2B 上。
> 知识库权威来源:`seo-knowledge/framework/site-types.md`、`b2c-b2b-seo-differences.md`、`workflow-saas.md`、`workflow-b2b.md`、`workflow-b2c.md`(经 `seo-workflow-growth` 技能加载)。

---

## Step 0 — 先分类(决策规则)

| 问题 | 是 → 类型 |
|---|---|
| 卖的是**订阅制软件**,转化=注册试用/付费? | **SaaS** |
| 卖的是**实物商品**,转化=加购/下单? | **B2C 电商/DTC** |
| 卖的是**批发/代工/服务**,转化=询盘/演示/开户? | **B2B 供应商** |
| 主要**靠流量变现**(广告/Affiliate),无自有产品? | **内容站** |

> **InkFlow = SaaS**(知识库钦定,`site-types.md` L8 / `b2c-b2b-seo-differences.md` L81)。
> 纹身寓意内容中心 = SaaS 打法里的 **TOFU 内容 + 免费工具引流杠杆**,不是 B2C 电商。

---

## SaaS 规范(InkFlow 当前适用)

| 环节 | 标准 |
|---|---|
| **审核重点** | 对比页/替代品页是否齐(转化最高)、功能页是否每功能一独立落地页、免费工具是否内嵌产品 CTA、注册漏斗是否顺畅 |
| **添加** | BOFU 对比页(`[产品] vs [竞品]`)、替代品页、功能落地页、免费工具(计算器/生成器/模板) |
| **调整** | Title 加"software/app/tool"限定词;定价页 3 层心理学定价;CTA 用"Start Free Trial" |
| **关键词** | 功能词/对比词/替代品词/痛点词,KD<20 起步 |
| **Schema** | SoftwareApplication(仅产品/功能页)、内容页用 Article/CollectionPage、FAQPage |
| **外链** | G2/Capterra、集成伙伴目录、SaaS 目录、Product Hunt |
| **KPI** | 注册转化率、付费转化率 |

## B2C 电商/DTC 规范

| 环节 | 标准 |
|---|---|
| **审核重点** | 产品页是否有 Product/Offer/Review Schema、分类页(集合页)结构、移动端体验、图片加载(≤200KB WebP)、评价/星级/FAQ 是否触发 Rich Snippet |
| **添加** | 产品页(原创描述,别抄厂商)、分类页(加购买指南+对比表+教育内容)、"Best of"列表、A vs B 对比页、用户评价/UGC 模块 |
| **调整** | 分类名匹配搜索习惯;分面导航用 canonical 防重复;漏斗对齐(发现→教育,考虑→对比,决策→信任信号) |
| **关键词** | 购买意图优先:"buy X"/"best X"/"X vs Y";追转化率而非纯搜索量;产品词可接受中高 KD |
| **Schema** | **Product + Offer + AggregateRating/Review 必备**、BreadcrumbList |
| **外链** | 评测站、导购站、Influencer、社媒(IG/TikTok/FB) |
| **KPI** | 加购率、下单率、ROAS |

## B2B 供应商/批发规范

| 环节 | 标准 |
|---|---|
| **审核重点** | 产品/服务目录深度、规格表/资质认证/工厂介绍是否齐、案例是否带真实数据、ROI 计算器/白皮书是否有、分类是否≤3 层 |
| **添加** | 服务/产品详情页、规格表、案例研究(真实数据)、行业白皮书、ROI 计算器、思想领导力文章 |
| **调整** | 长内容深度化;转化改"询价/演示/开户"而非"加购";销售周期长→培育型内容 |
| **关键词** | 长尾技术/规格词:"X manufacturer/supplier"、"wholesale X"、"how to source X" |
| **Schema** | Organization、Product(规格向)、BreadcrumbList、FAQPage、Product Schema(含 MPN) |
| **外链** | 行业协会/商会/BBB、Dun&Bradstreet/Kompass/ThomasNet、商业平台(Alibaba/IndiaMART)、认证机构(见 `b2b-backlink-sources.md`) |
| **KPI** | 询盘量 |

### B2B 产品页信任信号清单 (TanTan)

**反直觉策略**: 不要告诉买家你什么都能做。主动划定边界让专业采购商更信任。

```
✅ 写法: We work with medical device manufacturers requiring FDA compliance.
如果不是医疗行业的——有更好的选择。
❌ 写法: We support OEM, customization, 1MOQ, global shipping...
→ 暗示"我们什么都能做"= 可能什么都不精通
```

**隐性信任信号**（比文字评价更难造假）：
1. **真实工序图** — 每个产品页 3-5 张焊接/质检/包装实拍
2. **出货细节** — 包装照片、货柜装箱视频
3. **规格实物对比** — 产品旁放钢尺、不同型号并排拍
4. **认证文件局部截图** — 比光写"ISO 9001"说服力高一个数量级
5. **FAQ 顾虑驱动型** — FAQ 不是重复参数表，是消灭买家顾虑

**FAQ 正确写法**:
```
Q: What if product doesn't match spec?
A: We provide inspection report before shipment. If deviates, 
   we rework or replace at our cost.
```

**90 秒测试**: 一个从未见过你的采购商，在页面停留 90 秒后，对跟你合作会发生的场景是否有具体画面？有 = 页面在工作。

来源: [TanTan B2B 产品页优化 (065)](sources/065-tantan-b2b-product-page-trust.md)

## 内容站规范(广告/Affiliate)

| 环节 | 标准 |
|---|---|
| **审核重点** | 每页是否有真实价值(Google 2026 杀纯模板)、聚合/模板页结构、Title CTR |
| **添加** | 批量信息型长尾内容、聚合页、模板页 |
| **调整** | 低 KD(<10)优先;Title 优化提 CTR |
| **外链** | 不重要,靠量 |
| **KPI** | PV、广告点击率、Affiliate 转化 |

---

## 跨类型通用铁律(任何类型都成立)

1. 先 BOFU(对比/替代/产品页,转化最高)再 TOFU(博客/指南)。
2. E-E-A-T 每页必做(作者+审核+2 条真实来源+日期+Person/Article schema)。
3. 外链质量 > 数量(10 个 DA60+ > 100 个 DA20)。
4. 内容质量 > 数量(Google 2026 惩罚低质)。
5. 同意图关键词分组优化,一页覆盖一组。
6. 技术地基:HTTPS/GSC+GA4/Sitemap/Schema/CWV/robots.txt/canonical/404。

---

_创建 2026-07-12 · 依据 InkFlow SEO 知识库 · 后续新站按 Step 0 定性后套对应列执行_
