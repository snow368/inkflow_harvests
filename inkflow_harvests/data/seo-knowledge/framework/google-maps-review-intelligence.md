# Google Maps 评论情报体系

来源：用户分享（Harvests 项目）

---

## 适用分类
商业策略, 本地SEO, 评价

## 核心流程

```
Apify 爬 Google Maps → 原始评论数据 → 4 层输出
```

## 第一层：信号指标

| 指标 | 说明 | 判断标准 |
|------|------|---------|
| Review Velocity | 近100天评论数 | Weekly = 需求活跃 |
| Provider Density | 某niche+地区商家数 | 30=开放市场, 700=饱和 |
| Rating Variance | Top10% vs Bottom10%评分差 | 差距小=进入时机 |
| Incumbency Score | 整体市场满意度 | 低=没人主导 |

## 第二层：Claude 分析

- Review Tags — 客户评价中常出现的词
- Niche Opportunity Score — 低密度+高速度+低固化 = 进入时机
- Cold Outreach List — 评分最低20% = 他们的客户评价已经证明他们有问题

## 第三层：营销资产输出

| 资产 | 来源 |
|------|------|
| 首页文案 | 客户的真实语言 |
| 广告钩子 | 最常见的投诉做痛点钩子 |
| 邮件标题 | 客户自发输入的内容 |
| FAQ | 评价中的常见反对意见 |
| 定位 | "终于有一个能解决问题的niche产品" |

---

## 对 InkFlow 的价值

爬纹身工作室的 Google Maps 评论：
- 知道纹身师最不满意什么（竞品弱点）
- 知道客户找纹身师最关心什么（痛点）
- 直接用来写 Landing Page 文案、对比页、FAQ

## 对任何 niche 网站的价值

这套方法可以复用在任何 niche：换关键词+换城市，重新爬一遍就行。
