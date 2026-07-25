# AI Agent SEO 自动化体系

来源：Gingiris SEO/GEO Agent + aaron-he-zhu/seo-geo-claude-skills + CoderJeffLee

---

## 适用分类
内容策略, AI自动化

## 核心模式：Daily SOP

```
每天自动跑：
  1. 选词（TheKeyword / 爬虫找低KD词）
  2. 写页面（按模板生成 SEO 内容）
  3. 提交索引（IndexNow 推送）
  4. 追踪排名（GSC API → 数据反馈）
```

生姜Iris 用这套 1 个月从 0 → 32,000 Google impressions。

---

## 组件

### Keyword Research Skill
- 种子词提取
- 自动补全 + 相关搜索
- 竞品反向工程
- 多平台发现（Reddit、Quora、社媒）
- 搜索意图分类
- 长尾扩展
- 关键词聚类 & 主题映射（支柱页-集群模型）

### Content Engine Skill
- **Phase 1**: Research（竞品分析、结构提取、PAA、差距）
- **Phase 2**: Draft（按品牌语气写初稿）
- **Phase 3**: SEO 优化（meta、标题、可读性）
- **Phase 4**: CMS 格式化（Astro、WordPress、Notion、Hugo）
- **Phase 5**: 推广（X、LinkedIn、Reddit、Newsletter）

### Technical SEO Skill
- robots.txt 检查
- 站点地图验证
- Core Web Vitals
- Schema 标记
- 索引状态

---

## InkFlow 落地

| 环节 | 自动化方式 | 来源 |
|------|-----------|------|
| 关键词发现 | TheKeyword API / 爬虫爬 Reddit | Gingiris |
| 内容生成 | 按模板写初稿（我写你审） | 自建 |
| 技术 SEO | seo-audit-skill | CoderJeffLee |
| 索引推送 | IndexNow | 通用 |
| 排名追踪 | GSC API + n8n | 王施帆 |
| 内容推广 | X link-in-reply + LinkedIn | 通用 |

---

## 可复用性

这套不只在 InkFlow 能用，任何内容站/SaaS 都可以：

```
换个 niche + 换套关键词 + 换内容模板
  = 另一套 SEO 自动化系统
```

比如：
- InkFlow → 纹身工作室关键词
- Peach → 纹身耗材关键词
- 其他站 → 对应 niche 关键词
