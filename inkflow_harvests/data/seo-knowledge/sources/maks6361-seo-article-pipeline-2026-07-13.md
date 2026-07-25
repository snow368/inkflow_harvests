---
source: "x"
url: "https://x.com/maks6361/status/2076589639553397155"
author: "Max / maks6361"
date: "2026-07-13"
dimension: "seo-content"
related_skills: ["seo-content-writer", "seo-content-quality", "seo-content-brief", "seo-serp-analysis"]
added: "2026-07-18"
---

# The steps my SEO pipeline runs before it publishes — SEO 文章流水线

## Summary
Google 不禁止 AI 内容，但要求内容的 **EEAT（经验/专业/权威/信任）信号足够强**。maks6361 的 SEO 流水线覆盖从关键词研究到发布的完整流程，核心是在 AI 写作之上叠加多层质量检查。

## Key Takeaways

### 流水线全流程
1. **Research** → 用 DataForSEO API 获取实时搜索量/CPC/关键词难度
2. **Analyze Competition** → 搜 Google，抓首页前5条竞品，找「都做了什么」和「都没做什么」
3. **Topic Research** → 真实数据源：官方文档/研究报告/公司博客，不做二手资料堆叠
4. **Write Article** → 按 CORE-EEAT 清单逐条检查：intent对齐/首段直接回答/覆盖查询变体
5. **Image Generation** → 生成配图+页眉图，转 webp
6. **SEO Self-Score** → 目标8/10以上
7. **Fact-Check** → 针对原始资料逐一验证
8. **AI Tone Humanize** → 消除常见AI写作模式，确保自然人性化声音
9. **Assemble & Publish** → 带 frontmatter 的 markdown 推送到 git

### CORE-EEAT 清单要点
- **Intent Alignment** — Title 承诺与内容交付完全匹配
- **Direct Answer** — 核心答案在前150词提供
- **Query Coverage** — 覆盖≥3个查询变体/同义词
- **引用密度** — 每500词至少1个外部链接
- **AI语调检查** — 消除10+种常见AI写作模式

### 关键原则
- Google 不关心谁写的（AI或人类），关心内容有没有 EEAT 信号
- 发布后不是结束：提交 sitemap、Request Indexing

## Apply to Skills
- `seo-content-writer`：写作阶段融入 Topic Research（真实数据源优先）、CORE-EEAT 清单、Direct Answer 前150词规则
- `seo-content-quality`：测评维度新增 CORE-EEAT 清单 + AI语调检查 + 引用密度检查 + SEO自评分（目标8/10）
- `seo-serp-analysis`：竞品分析增加「都做了什么」「都没做什么」两层gap产出的标准化方法
- `seo-content-brief`：Brief 阶段引入「keyword map」（主关键词→title/H1/intro，次关键词→H2/H3，LSI→通篇散布）
