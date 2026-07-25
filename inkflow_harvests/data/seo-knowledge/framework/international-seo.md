# 多语言 / 国际 SEO（2026）

---

## 适用分类
国际化, 多语言

## URL 结构选择

| 方案 | 例子 | 适用场景 |
|------|------|---------|
| **子目录** ✅ 推荐 | example.com/de/ | 90% 的情况用这个 |
| ccTLD | example.de | 大公司，每个国家独立运营 |
| 子域名 | de.example.com | 不推荐，分裂权重 |

**推荐：** 子目录。权重集中，管理简单。

## Hreflang

```
<link rel="alternate" hreflang="en" href="https://example.com/en/" />
<link rel="alternate" hreflang="es" href="https://example.com/es/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/" />
```

**关键规则：**
- 必须双向返回（A→B 则 B→A）
- 每页必须自引用
- 必须包含 x-default（默认语言）
- 用 ISO 语言代码（en-GB，不是 en-UK）

## 本地化 vs 翻译

| 翻译 | 本地化 |
|------|--------|
| 逐字转换 | 适配文化、货币、单位 |
| 不匹配当地搜索意图 | 每个市场独立关键词研究 |
| 30-50% 更低转化 | 更高参与度和转化 |

**做法：** 核心页面全本地化，次要内容机器翻译+人工审。

## InkFlow 执行
- Phase 1：仅英文（/）
- Phase 2：ES / PT / FR（/es/ /pt/ /fr/）
- Phase 3：DE / JP / ZH
- 用子目录结构
- 先翻译 Landing + 3 核心功能页 + 5 热门博客
- Astro 原生支持 i18n 路由
