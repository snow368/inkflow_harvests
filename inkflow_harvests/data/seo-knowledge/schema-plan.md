# ink-flows.com Schema 类型对照表

按知识库 `workflow-saas.md` + `seo-geo-writing-standard.md` 标准

| 页面 | Schema 类型 | 说明 |
|------|------------|------|
| **首页** `/` | `SoftwareApplication` + `Organization` | 品牌 + 产品 |
| **功能页** `/features/*` | `SoftwareApplication` + `WebPage` | 每个功能是一个软件功能点 |
| **对比页** `/compare/*` | `FAQPage`（3-5问答） | 对比页面用 FAQ 格式，不是 Product |
| **定价页** `/pricing` | `Product` + `Offer` | 已有，保持 |
| **博客** `/blog/*` | `Article` + `BreadcrumbList` | 文章 + 面包屑 |
| **关于页** `/about` | `Organization` | 公司信息 |
| **联系页** `/contact` | `WebPage` | 简单页 |
| **免费工具** `/free-tools/*` | `WebPage` + `SoftwareApplication` | 工具也是软件 |

### 优先级顺序
1. 🔴 功能页加 `SoftwareApplication`（17页，影响最大）
2. 🔴 对比页改 `FAQPage`（7页）
3. 🟡 首页加 `Organization`
4. 🟡 博客加 `Article`
5. 🟢 关于/联系加基础Schema
