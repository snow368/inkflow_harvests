# B2C / 电商站上线工作流

**适用：** 电商 / DTC / 卖货
**目标：** 直接销售产品
**转化路径：** 搜索 → 产品页 → 加购 → 下单

---

## 适用分类
建站流程, B2C

## Phase 0：上线前 2 周（建地基）

### 技术地基

与 SaaS 相同的技术标准：

| # | 事项 | 来源 |
|---|------|------|
| 1 | 注册域名 + HTTPS | — |
| 2 | Google Search Console + GA4 | @foley_seo |
| 3 | sitemap.xml 提交 | @KristinaAzarenko |
| 4 | Lighthouse CWV 审计 | @KristinaAzarenko |
| 5 | 图片全用 `<img>` 不是 CSS background | @KristinaAzarenko |
| 6 | 移动端优先（B2C 流量 >60% 来自移动端） | — |
| 7 | 页面加载速度优化（B2C 每慢 1s = 7% 转化损失） | — |

### Schema 结构化数据

| 页面类型 | Schema 类型 |
|---------|------------|
| 产品页 | `Product` + `Offer` + `AggregateRating` |
| 分类页 | `ItemList` + `BreadcrumbList` |
| 购物车 | 不需要特殊 Schema |
| 评价/评论 | `Review` + `Rating` |
| 博客 | `Article` |

B2C 特有的关键 Schema：**`Product` + `AggregateRating`（评分聚合）+ `Review`**。评价数据是 B2C 转化的核心信任信号，用 Schema 标记后可以在搜索结果中显示星评。

### 外部引用源

B2C 的外链来源和 SaaS/B2B 都不同：

| 优先级 | 源 | 价值 |
|--------|---|------|
| 🔴 | Trustpilot | DR 90+，消费者信任 |
| 🟡 | 评测站（行业相关） | 定向流量 + 外链 |
| 🟡 | Influencer 合作 | 内容 + 外链 + 品牌曝光 |
| 🟡 | 导购站 / buying guides | 高转化流量 |
| 🟢 | Pinterest / Instagram | 视觉搜索流量 |

B2C 不需要 G2/Capterra（那是 SaaS 用的），也不需要 Alibaba（那是 B2B 用的）。

---

## Phase 1：上线日（核心页）

### 1.1 首页 Hero 🔴

来源：@Goldikam（+44% CVR / +289% Rev/visitor）

B2C 的 Hero 比任何其他类型都重要——它是**3 秒内向陌生人推销**。

```
测试 3 个变体：

A（控制）: "Crafted with care for modern living."
B（痛点导向）: "Luxury bedding designed for hot sleepers."
C（预期胜出）: "European bedding. Hotel-quality. Free shipping over $100."

模板: [是什么] + [质量参照] + [消除决策障碍]
```

**B2C 特有:** 促销/优惠信息（Free shipping / 30-day returns / Discount code）可以直接放 Hero。

### 1.2 产品页 🔴🔴

来源：@Goldikam + @Frontend_Prince（CRO）

B2C 的产品页是**最核心的页面**，也是 CRO 优化的主战场。

**产品页结构：**
```
  H1: [产品名] + 价值点
  ↓
  Hero Product Image（主图 — 高质）
    → 多角度 / 使用场景 / 细节特写
  ↓
  价格 + 优惠信息（标价、折扣、分期）
  ↓
  CTA: Add to Cart（大按钮）
  ↓
  信任信号: 评价数量+星级、销量、库存
  ↓
  产品详情（Features + Benefits）
  ↓
  Shipping & Returns 信息
  ↓
  FAQ
  ↓
  Reviews / UGC（用户评价 + 晒图）
  ↓
  推荐/交叉销售
```

**A/B 测试重点（@Goldikam + @Frontend_Prince）：**
- Hero 图片 vs 视频
- CTA 颜色/大小/文案
- 评价显示位置
- 免费 shipping 门槛

### 1.3 图片 SEO 🔴

来源：@Kasra_Dash（图片排名测试）

B2C 的流量中很大一部分来自 Google Images。电商产品图特别需要优化图片：

| 维度 | 要求 | 来源 |
|------|------|------|
| 尺寸 | 1920×1080 px | @Kasra_Dash |
| 文字覆盖 | ≥50% 图片面积（用于信息图） | @Kasra_Dash |
| 对比度 | 强对比（文字和背景差异大） | @Kasra_Dash |
| 文件名 | "product-name-material-color.jpg"（不是 IMG_001.jpg）| @Kasra_Dash |
| 上下文 | 周围文字 + subheading 帮助排名 | @Kasra_Dash |
| Alt text | 描述性 alt（含关键词） | — |

### 1.4 产品分类 / 品类页

来源：@vibemarketersHQ Programmatic SEO 模板

如果产品量多，可以用 pSEO 生成品类页：

```
H1: [Category] — [Year] Buyer's Guide
H2: Top [Category] Products
H2: What to Look for in [Category]
H2: [Category] Price Range
FAQ: 3-5 个买家常问问题
```

### 1.5 长尾词策略 🟡

来源：知识库通用原则

B2C 的长尾词是 **产品属性 + 使用场景 + 买家意图** 组合：

| 类型 | 例子 | KD | 优先级 |
|------|------|----|--------|
| 属性词 | "wireless earbuds with long battery life for running" | 中低 | 🟡 Phase 1 |
| 场景词 | "best shoes for standing all day" | 中 | 🟡 Phase 1 |
| 导购词 | "what size yoga mat do I need" | 低 | 🟡 Phase 1 |
| 评价词 | "product vs competitor review" | 中 | 🟢 Phase 2 |

**怎么用：**
- 长尾词 = 品类页/导购页的最佳内容来源
- 每个导购词一篇短文（600-800 字，精准匹配 intent）
- 内链指向具体产品页

### 1.5b 品类关键词矩阵覆盖 🔴🔴

来源：@KaiCromwell（Shopify SEO）2026/06/08

99% 的电商品牌只做一个大词（如 "bed frames"），然后祈祷。
真正聪明的品牌会**把产品按所有可能的分类方式拆解，每个变体都建一个页面试图排名。**

**案例：木制床架销售商**

| 关键词 | 月搜索量 |
|--------|---------|
| queen size bed frame | 52k |
| wooden bed frame | 12k |
| storage bed frame | 6.7k |
| oak bed frame | 1.9k |

**核心打法：**
1. 找出你的产品可以被用户分类的**所有维度**（材质、尺寸、风格、功能、场景）
2. 对每个维度的搜索词，都建一个独立的品类页/产品页
3. 这些页面之间做 internal link 互相传递权重
4. 覆盖用户搜索你产品的**每一种表达方式**

**应用到 Peach 纹身用品：**
- 主线粉绿：按颜色分 → "green tattoo supplies", "pink tattoo kit"
- 按用途分 → "tattoo machine for beginners", "professional tattoo gun"
- 按针型分 → "shader needles", "liner needles", "magnetic needles"
- 按人群分 → "tattoo supplies for men", "PMU supplies kit"

**关键指标：**
- 每个品类关键词单独优化一个页面（不是挤在同一页）
- 内链形成品类矩阵（父品类 → 子品类 → 具体产品）
- 这是 eCommerce SEO 最直接的增长杠杆：用户搜索你产品的每一种说法，都给他一个落地页

### 1.6 邮件营销流程 🔴

来源：@Max_Alexxander（Back in Stock + Welcome Email）

B2C 的邮件营销是**最高 ROI 的渠道**。上线前就建好流程：

**邮件互动层级（@IdrisEcom_email 2026/06/08）：**

大多数品牌只优化最弱的信号（打开率），聪明人会直接瞄准最强信号。

| 层级 | 行为 | 信号强度 |
|------|------|---------|
| 1 | Open（打开） | 弱 |
| 2 | Click（点击链接） | 尚可 |
| 3 | Reply（回复邮件） | 强 |
| 4 | Move to inbox（从垃圾邮件移到收件箱） | 更强 |
| 5 | Add as contact（添加为联系人） | 最强 |

**启示：**
- 不要只追求打开率（打开是弱信号，可能被预览框触发）
- 邮件设计要**引导回复**（比如用 CTA："直接回复 'MORE' 获取专属折扣"）
- 确保送达率（避免进垃圾邮件），让用户手动移到收件箱
- 目标：让用户把你的域名存为通讯录（Add as contact）→ 永久提高送达率

### 1.6b 邮件策略分层

**Phase 1（冷启动）：** 以打开率和点击率为核心指标
- 测试 subject line → 最大化打开
- 优化 CTABtn → 最大化点击

**Phase 2（成熟期）：** 以回复率和送达率为核心指标
- 用互动触发器引导回复（"Reply 1 要案例 / Reply 2 要报价"）
- 持续净化列表（移除不互动的人）→ 提高整体送达率
- 引导用户添加为联系人（welcome email 里加 instruction）

### 1.6c 标准邮件流程

**B2C 自动邮件流程（@Max_Alexxander）：**

| 邮件类型 | 时机 | 优化建议 |
|---------|------|---------|
| Welcome Email 1 | 注册后立即 | Hero + 大 CTA 按钮 |
| Welcome Email 2 | 注册后 24h | 推荐畅销品 |
| Back in Stock | 库存恢复时 | GIF 展示 top 3 + urgency CTA |
| Abandoned Cart | 放弃购物车 1h | 产品图 + 评价 + 折扣 |
| Post-Purchase | 下单后 | 追加销售 + 评价邀请 |

**Back in Stock 邮件优化（@Max_Alexxander 具体案例）：**
1. Hero 图 → 标题放顶部 + CTA 按钮大 + 去掉冗余 banner
2. 产品展示 → 3 个品类 GIF（不是 14 项文字列表）
3. CTA → 底部加 urgency（"卖完前下单"）+ 大按钮

---

## Phase 2：上线后 1 个月（建信任）

### 2.1 GSC 数据驱动

同 @David_mduw + @foley_seo，但 B2C 关注的关键词类型不同：

- 关注产品词的 impression → CTR → CVR 链路
- 发现"展示高点击低"的词 → 改 title/OG 卡
- B2C 的 CTR 波动比 B2B 大（季节性和营销活动影响）

### 2.2 案例研究 / Case Study 🔴🔴

来源：@noelcetaSEO（Noel Ceta, Apollo Digital）2026/06/07

大多数案例研究只获得 30 秒注意力。一个 agency 的案例研究模板将 **34% 的合格读者转化为销售对话**。秘诀不是复杂，而是跟随买家真正的决策路径。

**七个销售型章节结构：**

**1. The Hook（钩子）— 3 句话**
- 句 1: 具体公司类型 + 核心问题
  > "年营收 800 万的中型 SaaS 公司遇到增长天花板。"
- 句 2:  stakes / 紧迫感
  > "董事会要求在 18 个月内实现 3 倍增长，否则考虑被收购。"
- 句 3: 让挑战变难的约束
  > "零品牌知名度，竞争对手拥有 10 倍营销预算。"

**好钩子的 4 个元素：**
- 公司规模（可共鸣）
- 具体数据（可量化）
- 时间压力（紧迫）
- 个人 stakes（人情味）

**2. The Stakes（ stakes ）— 1 段**
- 商业后果：错过增长目标意味着什么
- 个人压力：这是高管的第一次/executive 角色吗？
- 战略重要性：决定了公司能否实现什么

**3. The Diagnosis（诊断）— 2-3 段**
- 表面症状 → 但这些只是症状，不是根因
- 深入数据：具体发现（带数字）
- 根因识别：解释为什么之前的尝试失败了

**诊断可信度 = 诊断深度**

**4. The Strategic Shift（战略转向）— 2 段**
- 发现的关键洞察
- 反直觉的赌注（不按常规出牌）
- 推理：为什么这行得通
- 承认取舍（牺牲了什么换取什么）
- **诚实建立信任**

**5. The Implementation（执行）— 3-4 段**
按阶段展示（不是只列战术）：
- Phase 1（月 1-2）：基础建设 + 遇到的挑战 + 怎么解决
- Phase 2（月 3-4）：执行 + 根据数据的调整
- Phase 3（月 5-6）：优化 + 结果出现 + 进一步调整
- **时间线和挑战的透明度**

**6. The Results（结果）— 分层指标**
Tier 1 - 商业影响：营收 / 管线
Tier 2 - 效能指标：获客成本 / 转化率
Tier 3 - 辅助指标：SEO 表现等
**先给商业结果，再给过程指标**
**附时间线和备注（比如流量下降但营收飙升）**

**7. The Validation（验证）— 证据堆栈**
- 客户证言（具体的，带姓名 + 职位）
- 第三方验证（可被引荐 / LinkedIn 推荐 / 持续合作状态）
- 辅助证据（匿名截图 / 时间线 / 奖项 / 媒体报道）
- **只放可验证的证据**

**好证言 vs 差证言：**

差: "Great to work with! Highly recommend."

好: 具体故事 — 之前花了多少钱、换了几个 agency、战略转向初期的风险、恢复后的结果。最后署名带职位和公司。

**多格式策略：**
- 长文（网站）: 2,500-3,500 字，SEO 优化
- 1 页 PDF: 高管摘要 + 关键指标可视化
- PPT（12-15 页）: 会议用
- 视频（5-7 分钟）: 客户采访 + 结果展示
- LinkedIn 系列: 5 条帖子，每周 1 条

**部署时机：**
- 发现阶段: 倾听痛点 → 找到最相关案例 → 24 小时内发送
- 提案阶段: 附带相关案例 → 引用具体章节 → 证明能力
- 决策阶段: 愿意提供引荐联系 → 提供辅助案例 → 解决最终顾虑
- 成交后: 用于 onboarding → 展示可能性 → 设定期望

**核心原则：**
> 潜在客户不想要泛泛的成功故事。
> 他们想要相关证据——证明你能解决他们**具体问题**的证据。
> 用钩子吸引，通过故事推进，用数据转化。

### 2.2b UGC / 评价收集 🔴

来源：@natiakourdadze（Whop Content Rewards）

B2C 用户在做购买决策前会看评价。

**获取 UGC 的渠道：**
- 购买后邮件邀请评价（自动化）
- Whop Content Rewards 找创作者（@natiakourdadze 方法）
- 社媒用户晒单（鼓励 #hashtag）
- 评测站合作

### 2.3 社媒内容生产 🔴

来源：@ErnestoSOFTWARE AI UGC + @RomielClarke（Strategist vs Editor）

```
内容生产流程（源自 @vibemarketersHQ 的 YouTube 系统）:
  search → study → find gap → build concept → film → signal check → repeat

应用到 B2C:
  search: 找出用户的痛点和搜索词
  study: 分析竞品内容
  find gap: 找内容缺口
  build concept: 定内容方案（这部分是 strategist 的工作）
  film: AI UGC 方式生产（@ErnestoSOFTWARE）
  signal check: 看数据反馈
  repeat: 规模化
```

**AI 视频生产（@ErnestoSOFTWARE 5 步法）：**
1. Higgsfield MCP 连接
2. 创建 AI 角色（或产品演示角色）
3. MCP + Claude 生成 Seedance 2.0 视频
4. Postbridge 排期发布
5. 多账号矩阵分发

**B2C 特别适合这种方法**——产品展示不需要真人出镜，AI 角色+产品图就够了。

---

## Phase 3：上线后 2-3 个月（规模化）

### 3.1 Hero Headline A/B 持续测试

来源：@Goldikam

B2C 中 Hero 标题对转化率的影响比 SaaS 还大。持续测试：

- 每月换一个 Hero 变体
- 结合季节性/促销
- 胜出的变体移到下一轮做对照组

### 3.2 邮件营销规模化

来源：@Max_Alexxander

- 建 welcome flow → 培育 flow → re-engagement flow
- 每个 flow 用 @Max_Alexxander 的 CRO 框架检查（Hero/分类/CTA）
- 分段发送（新用户/老用户/高价值用户不同内容）

### 3.3 付费流量（可选）

B2C 比其他类型更适合投付费广告（@foley_seo 的优先级里，B2C 可以在更早阶段投广告）：

| 渠道 | 适合 | 来源 |
|------|------|------|
| Meta/IG Ads | 视觉产品 | @ConnorShowler（竞品被提及） |
| TikTok Ads | 年轻用户 | — |
| Google Shopping | 电商标准配置 | — |
| Influencer | 信任建设 | @foley_seo |

---

## B2C 特有注意事项

| 维度 | 做法 | 来源 |
|------|------|------|
| Hero 标题 | 🔴 最优先 A/B 测试 | @Goldikam |
| 产品图 | 1920×1080 + 关键词文件名 | @Kasra_Dash |
| 邮件营销 | Welcome + Back in Stock + Abandoned Cart | @Max_Alexxander |
| UGC 获取 | Whop 找创作者 / 购买后自动邀请 | @natiakourdadze |
| 视频 | AI UGC + 产品展示 | @ErnestoSOFTWARE |
| Schema | Product + Review + AggregateRating | — |
| 广告 | 比其他类型更早投 | @foley_seo 优先级调整 |
| 移动端 | 流量 >60% 来自手机 | — |

---

**来源索引：**
- @Goldikam → Hero A/B + 产品页 CRO
- @Kasra_Dash → 图片 SEO
- @Max_Alexxander → 邮件 CRO
- @ErnestoSOFTWARE → AI UGC 视频
- @natiakourdadze → Whop Content Rewards
- @RomielClarke → Strategist vs Editor
- @vibemarketersHQ → 内容系统
- @Frontend_Prince → CRO 细节
- @foley_seo → GSC + Distribution
- @KristinaAzarenko → 技术 SEO
- @KaiCromwell → 品类关键词矩阵覆盖（Shopify SEO）
- @IdrisEcom_email → 邮件互动层级（Reply > Open）
- @noelcetaSEO → 高转化案例研究 7 段结构（Hook → Stakes → Diagnosis → Strategic Shift → Implementation → Results → Validation）
