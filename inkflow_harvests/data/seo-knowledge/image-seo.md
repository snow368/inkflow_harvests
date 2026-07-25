# 图片 SEO 完全指南 (2026)

> 最后更新: 2026-07-13
> 来源: Cross-platform research (X/Twitter, Reddit, Quora, Web)

## 为什么图片 SEO 重要

- 图片占现代网站总页面权重的 **60-80%**
- Google 图片搜索是独立的大流量来源
- **ImageObject Schema** + 优化图片 = 提高 AI Overview 引用率
- 正确的图片优化直接影响 **LCP 和 CLS** (Core Web Vitals)

## 技术优化 (占 50% 效果)

### 格式选择

| 格式 | 用途 | 浏览器支持 | 压缩率 vs JPEG |
|------|------|-----------|---------------|
| **WebP** | 主力格式 | 98%+ | 小 25-35% |
| **AVIF** | 渐进增强 | 92-95% | 小 40-50% |
| **SVG** | 图标/Logo | — | 矢量 |
| **PNG** | 含文字截图 | — | 无损 |
| **WebM 视频** | 替代 GIF | — | 远小于 GIF |

来源: [ImageSEO.io](https://imageseo.io/blog/image-optimization-for-seo), [SmartSEOAudit](https://smartseoaudit.com/guides/image-optimization)

### 文件大小预算
- 页面总重量: < **1.5MB** (移动端)
- 主图: < **100KB**
- 次要图片: < **50KB**
- 缩略图: < **20KB**

### 响应式图片
```html
<img
  src="photo.webp"
  srcset="photo-400.webp 400w, photo-800.webp 800w, photo-1200.webp 1200w"
  sizes="(max-width: 600px) 400px, 800px"
  alt="描述性文字"
  loading="lazy"
  width="800"
  height="600"
  decoding="async"
/>
```

### 懒加载规则
- ✅ 折叠以下图片: `loading="lazy"`
- ❌ 永远不: 对 LCP 图片使用懒加载
- ✅ LCP 图片: `loading="eager"` + `fetchpriority="high"` + `<link rel="preload">`

### 缓存策略
```
Cache-Control: public, max-age=31536000, immutable
```

## 语义优化 (占 50% 效果)

### Alt 文本
- 具体、描述性强
- 控制在 **125 字符** 以内
- 自然包含目标关键词 (不堆砌)
- 纯装饰性图片: `alt=""`

### 文件名
- 小写字母、连字符分隔
- 描述性强: `black-ink-dragon-tattoo.jpg` 而非 `IMG_20240101.jpg`

### 说明文字 (Figcaption)
- 用 `<figure>` + `<figcaption>` 包裹
- 读者注意力比正文多 **300%**

### ImageObject Schema
```json
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "contentUrl": "https://example.com/photo.webp",
  "name": "Dragon Tattoo on Forearm",
  "description": "Black ink dragon tattoo with detailed scales on forearm",
  "author": {
    "@type": "Person",
    "name": "Artist Name"
  },
  "license": "https://creativecommons.org/licenses/by/4.0/"
}
```

## 80/20 优先级
只要做这三件事就能获得 80% 效果:
1. ✅ 在所有图片上写描述性 Alt 文本
2. ✅ 将主要图片转换为 WebP 格式
3. ✅ 添加 ImageObject Schema

## 实测效果
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 总重量 | 12.4 MB | 1.6 MB | -87% |
| LCP | 4.8s | 1.4s | -71% |
| PageSpeed | 52 | 97 | +45 分 |

来源: [SmartSEOAudit](https://smartseoaudit.com/guides/image-optimization)
