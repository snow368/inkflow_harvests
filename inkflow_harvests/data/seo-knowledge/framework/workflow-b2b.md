# B2B 站上线工作流

**适用：** 批发 / 代工 / 企业服务 / 供应商
**目标：** 获取询盘（Inquiry/Lead）
**转化路径：** 搜索 → 产品/服务页 → 询盘 → 订单

---

## 适用分类
建站流程, B2B

## Phase 0：上线前 2 周（建地基）

### 技术地基

与 SaaS 相同的技术标准（@KristinaAzarenko 通用原则）：

| # | 事项 |
|---|------|
| 1 | 注册域名 + HTTPS |
| 2 | Google Search Console + GA4 |
| 3 | sitemap.xml 提交 |
| 4 | Lighthouse CWV 审计 |
| 5 | 移动端适配 |
| 6 | robots.txt 正确配置 |

### Schema 结构化数据

| 页面类型 | Schema 类型 |
|---------|------------|
| 产品页 | `Product` + `Offer` + `ShippingDeliveryTime` |
| 公司页 | `Organization` + `Manufacturer` |
| 分类页 | `ItemList` + `BreadcrumbList` |
| 资质/认证页 | `CreativeWork`（认证证书）|
| 联系方式 | `ContactPoint` + `PostalAddress` |

B2B 特有的 Schema 需求：`Product` 需要包含 **定价范围、最小起订量（MOQ）、交货时间**等信息。AI 在推荐供应商时会优先引用结构化的产品数据。

### 外部引用源

B2B 的外链来源和 SaaS 不同，主要靠行业目录：

| 优先级 | 源 | 价值 |
|--------|---|------|
| 🔴 | Alibaba / Made-in-China / Global Sources | B2B 基础，不只是外链 |
| 🔴 | 行业目录（按行业不同） | 定向外链 + 流量 |
| 🟡 | ThomasNet（制造业） | 北美制造业 |
| 🟡 | Kompass（全球） | 全球 B2B 目录 |
| 🟡 | 行业协会官网 | 高信任度外链 |
| 🟡 | Yellow Pages / 黄页 | 传统外链仍有效 |
| 🟢 | 供应商审核平台 | 特定行业 |

B2B 不需要 G2/Capterra（那是 SaaS 用的）。

---

## Phase 1：上线日（核心页）

### 1.1 首页 Hero

B2B 首页 Hero 和 B2C/SaaS 不同——不是情感驱动，是**专业度驱动**：

```
好:
"ISO 9001 Certified [Product] Manufacturer — 15 Years of Export Experience"

不好:
"Discover Our Amazing Products"（对 B2B 买家太虚）
```

B2B 买家在乎：资质、经验、最小起订量、交货时间。这些要在 Hero 区域或首屏展示。

### 1.2 产品页 🔴🔴

B2B 的**核心页面不是首页，是产品详情页**。买家通常直接搜产品词。

**产品页必备内容：**
```
  H1: [产品名] — [规格/型号]
  ↓
  Section 1: 产品规格表（参数/材料/尺寸/公差）
  ↓
  Section 2: 产品和竞品的对比（质量/价格/交期）
  ↓
  Section 3: 认证/资质展示（ISO/CE/FDA...）
  ↓
  Section 4: 生产流程/工厂实拍
  ↓
  Section 5: 询盘表单（CTA）
  ↓
  FAQ: 关于MOQ、样品、交期、付款方式
```

### 1.3 长尾产品词优化

来源：框架中"5 种类型"已有记录

B2B 的长尾词以产品规格为主（"3mm thick rubber sheet supplier"、"custom stainless steel parts manufacturer"）。
这些词 KD 天然低，新站也能排。

> 注意：长尾词不只 B2B 能用。SaaS 长尾 = 场景+痛点词，B2C 长尾 = 属性+意图词。**所有类型都能用长尾词策略**，只是词的形态不同。

**策略：**
- 每个产品型号一个独立页面
- 页面 title = 长尾搜索词精确匹配
- 规格表用表格+结构数据

### 1.4 OG 卡

B2B 同样需要 OG 卡（@WeiYipei），但内容方向不同：

| 页面 | OG 卡内容 |
|------|----------|
| 产品页 | 产品图 + 规格 + "Get Wholesale Price" |
| 公司页 | 工厂/团队图 + 年产量 + 经验 |

---

## Phase 2：上线后 1 个月（建信任）

### 2.1 GSC 数据驱动

同 @David_mduw + @foley_seo 方法论，但 B2B 关注的关键词类型不同：

- 关注长尾产品词的 impression 和 CTR
- 发现"展示高点击低"的词 → 检查 title 是否匹配搜索意图
- B2B 的 CTR 通常比 B2C 低，因为买家会多看几家再决定

### 2.2 冷邮件 🔴🔴

来源：@ConnorShowler + @Alexzartarian

对 B2B 来说，**冷邮件的优先级远高于 SaaS 和 B2C**。B2B 买家习惯通过邮件询盘。

**冷邮件流程：**
```
Phase 1（验证）:
  □ 手动找 20 个潜在买家
  □ 个性化邮件（提到他们的业务和你的产品关联）
  □ 目标：验证产品市场匹配

Phase 2（系统化）:
  □ 用免费工具建列表
  □ 1 个域名 + 1 个邮箱
  □ 每周 50 封

Phase 3（规模化）:
  □ 多域名 + 多邮箱
  □ 每周 500 封
  □ A/B 测试标题/正文
```

**B2B 冷邮件和 SaaS 的不同：**
- SaaS 冷邮件推免费试用
- B2B 冷邮件推样品/目录/报价
- B2B 的客单价更高，所以手动个性化更值得

### 2.3 LinkedIn 内容 + 社交销售

来源：@dan__rosenthal + @askOkara

B2B 买家在 LinkedIn 上做决策研究：

```
内容策略:
  □ 每周 3 篇行业知识帖
  □ 分享生产流程/质量控制内容
  □ 认证/资质更新
  □ 客户案例（匿名）

获客:
  □ 连接潜在买家（进口商/分销商）
  □ 不硬推，通过内容展示专业度
  □ DM 回复具体问题
```

---

## Phase 3：上线后 2-3 个月（规模化）

### 3.1 案例研究 / 白皮书

B2B 买家在做采购决策时需要**信任基础**：
- 生产流程透明化（视频/图文）
- 质量控制标准文档
- 合作案例（用量/结果数据）
- 常见问题 QA（行业知识展现）

### 3.2 多语言

B2B 的多语言优先级比 B2C 和 SaaS 都高，因为很多 B2B 买家不是英语母语。

| 语言 | 优先级 | 理由 |
|------|--------|------|
| 英语 | 🔴 | B2B 通用语言 |
| 德语 | 🟡 | 工业/制造业强市场 |
| 法语 | 🟡 | 非洲/欧洲市场 |
| 西语 | 🟡 | 拉美市场 |
| 阿拉伯语 | 🟢 | 中东贸易 |

**不要第一期就做多语言**（来源：之前确认的策略 — 等确定市场后再做）。

### 3.3 视频 / 工厂实拍

来源：@ErnestoSOFTWARE AI UGC + @VincentLogic 视频生产范式

- 工厂/生产线实拍（信任感）
- AI 后期改善画质/打光（不需要重拍）
- 产品演示视频（白墙拍，AI 后期改背景）

---

## B2B 特有注意事项

| 维度 | 做法 | 原因 |
|------|------|------|
| 关键词 | 长尾产品词优先 | KD 低，新站可排 |
| 冷邮件 | 🔴 最高优先级 | B2B 买家习惯邮件询盘 |
| LinkedIn | 内容 + 社交销售 | B2B 决策者最活跃的平台 |
| Schema | Product + Organization + 规格数据 | AI 引用供应商数据 |
| 信任建设 | 认证/工厂实拍/案例 | B2B 买家需要信任基础 |
| 多语言 | 英语必做，其他等市场确认 | — |
| COLD EMAIL > SEO | B2B 中冷邮件和 SEO 同样重要 | B2B 买家更习惯被联系 |

---

**来源索引：**
- @ConnorShowler → 冷邮件 B2B 方法论
- @dan__rosenthal + @askOkara → LinkedIn 获客
- @foley_seo → GSC 数据驱动
- @TheCoolestCool → 社区信任建设
- @ErnestoSOFTWARE + @VincentLogic → 视频生产
- 框架原有 site-types.md → B2B 长尾词策略
