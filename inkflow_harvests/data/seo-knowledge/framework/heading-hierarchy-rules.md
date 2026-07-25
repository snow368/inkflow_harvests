# H1-H6 层级规则（SEO）

---

## 适用分类
内容结构, H标签

## 核心原则

```
H1 = 页面主题（每页只有一个）
H2 = 主要章节（每章一个）
H3 = 子章节（H2 下的细分）
H4-H6 = 几乎不用（除非内容特别深）
```

就像一本书：
```
书名 = H1
章  = H2
节  = H3
小 节 = H4
```

---

## 各层级规则

### H1
| 规则 | 说明 |
|------|------|
| 数量 | **每页只有一个** |
| 关键词 | 必须含目标关键词 |
| 跟 Title 的关系 | 可以相似但不能一样 |
| 位置 | 页面最顶部 |
| 长度 | 30-60 字符 |
| 例子 | "Digital Waivers for Tattoo Studios" |

### H2
| 规则 | 说明 |
|------|------|
| 数量 | 每页 4-7 个 |
| 关键词 | 含相关长尾词 |
| 作用 | 划分主要章节 |
| 顺序 | 逻辑递进（痛点→方案→功能→FAQ） |
| 例子 | "How InkFlow Fixes Booking" → "Deposit-Required Scheduling" |

### H3
| 规则 | 说明 |
|------|------|
| 数量 | 每个 H2 下 2-4 个 |
| 关键词 | 细分场景、具体功能 |
| 作用 | 细分 H2 的内容 |
| 例子 | H2: "How InkFlow Fixes Booking" → H3: "Deposit-Required Scheduling" |

### H4-H6
| 规则 | 说明 |
|------|------|
| 使用频率 | 很少用 |
| 什么时候用 | 技术文档、长教程 |
| 营销页 | 基本不需要 |

---

## 错误示范

```
❌ 跳级
  H1 → H3（跳过了 H2）
  应该是 H1 → H2 → H3

❌ 多个 H1
  H1: "Digital Waivers"
  H1: "Booking Software"（一页只能一个 H1）

❌ H1 没有关键词
  H1: "Welcome to Our Website"

❌ H1 = Title
  Title: "Digital Waivers for Tattoo Studios | InkFlow"
  H1:   "Digital Waivers for Tattoo Studios"
  太相似了，至少换措辞
```

---

## InkFlow 页面示例

```
/features/booking

H1: Smart Booking Software for Tattoo Studios
  H2: The Problem with Traditional Booking
  H2: How InkFlow Fixes Booking
    H3: Deposit-Required Scheduling
    H3: Automated Reminders
    H3: Multi-Artist Calendar
    H3: Online Booking Widget
  H2: Booking Feature Comparison
  H2: Pricing
  H2: FAQ
    H3: （FAQ 不需要 H3，直接 Q&A）
```
