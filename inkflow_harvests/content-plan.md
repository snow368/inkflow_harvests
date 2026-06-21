# Content Material Planning

## 1. Content Source Matrix

| Source | Content Type | Feasibility | Per Account Target | Total Required |
|--------|-------------|-------------|-------------------|----------------|
| 合作纹身师作品授权转发 | 纹身作品图/视频 | ✅ 核心来源 | 20-30 posts | 400-600 posts |
| 主号 UGC 改编 | 客户作品/反馈 | ✅ 有现成素材 | 10-15 posts | 200-300 posts |
| AI 教育图文 | 针型指南/技术帖 | ✅ 无限量 | 30-50 posts | 600-1000 posts |
| AI 行业资讯 | 行业趋势/展会 | ✅ 无限量 | 10-15 posts | 200-300 posts |
| 产品使用场景 | 开箱/评测/对比 | ⏳ 需拍摄更多产品图 | 10-15 posts | 200-300 posts |
| 幕后工作室日常 | 工作场景/过程 | ⏳ 需积累素材 | 10-15 posts | 200-300 posts |

**Total needed: ~1800-2800 pieces of content across 20 accounts**

## 2. Tattoo Artist Partners (合作纹身师)

### Sourcing
- From existing database of 600+ shops with IG handles
- Focus on high-quality artists who post consistently (3+ posts/week)
- Categorize by style: fine line, traditional, blackwork, realism, PMU, color

### Selection Criteria per Bot Account
- 3-5 partner artists per bot × 20 bots = 60-100 partner artists
- Each bot's partners share a consistent style aesthetic
- Partners are in similar geographic area or style niche

### Engagement Model
1. Bot follows partner artist, likes and comments genuinely
2. After follow-back or established interaction, bot sends DM proposing cross-promotion
3. Agreement: bot gets permission to repost artist's work (with credit)
4. Artist gets exposure to bot's audience + potential product samples

### Post Format
- Repost with: "@artist_handle 的新作 — [简短点评]"
- First-person voice: "这位客户想要 geometric sleeve，我们用 COG #12M1 做铺色..."
- Always credit the original artist

## 3. Main Account UGC Adaptation (主号素材利用)

### Sources
- @peachcartridge — product-focused posts, customer tags
- @peachtattoos — tattoo work showcases
- Customer posts tagging @peachcartridge

### Processing Rules
- **DO**: Use customer result images from main account (with permission or public repost)
- **DO**: Rewrite caption from bot's own perspective
- **DO**: Credit original customer/artist
- **DON'T**: Copy main account captions verbatim
- **DON'T**: Post same image on multiple bot accounts without different cropping/perspective

### Per-Image Usage
| Bot Account | Angle | Caption Focus |
|-------------|-------|---------------|
| bot_01 | "看看这个客户用了我们的产品效果" | 产品质量角度 |
| bot_02 | "这位纹身师的手法很细腻" | 纹身技巧角度 |
| bot_03 | "客人反馈说恢复期很顺利" | 客户体验角度 |

### How to Get Different Angles from One Image
- AI (DeepSeek) takes the original caption and generates 3-4 different perspectives
- Each bot gets a unique rewrite based on its persona
- Same image used across different bots only after 30-day interval

## 4. AI-Generated Education Content (教育类图文)

### Topic Bank (generateable from brand knowledge)

**Needle & Cartridge Education (30+ topics)**
- "RL vs RS — 什么时候用 Round Liner, 什么时候用 Round Shader"
- "Magnum 针的三种类型: M1 / M2 / Curved Magnum 区别"
- "针号对照表: #08 #10 #12 #14 分别适合什么风格"
- "Cartridge 结构拆解: membrane, housing, needle 各部件作用"
- "为什么 316L 外科级不锈钢是行业标准"
- "EO 气体灭菌 vs 高温高压灭菌区别"
- "Backflow 是什么意思？为什么防回流膜很重要"
- "如何判断针头是否需要更换"
- "Cartridge 针兼容性: 为什么 universal 接口是必须的"

**Technique & Tips (25+ topics)**
- "Fine line 入门: 合适的针号 + 手法 + 机器参数"
- "Color packing 技巧: 什么样的针最有效"
- "做线条手抖？可能是针的 vibration 没控制好"
- "Stipple shading 怎么入门"
- "不同皮肤类型的针选择建议"
- "如何减少 tatto 过程中的 trauma"

**PMU Specific (15+ topics)**
- "PMU 针头怎么选: #06 #08 #10 分别适合眉毛/眼线/嘴唇"
- "半永久色料导入深度控制技巧"
- "不同皮肤类型的 PMU 留色率对比"

**Aftercare (10+ topics)**
- "纹身后恢复期注意什么"
- " tattoo 保养常见误区"

### Generation Strategy
1. Each account gets a random subset of 15-20 topics
2. DeepSeek generates unique 80-150 word captions per topic × per account
3. Mix up image: some topics use product photos, others use AI-generated illustrations
4. Each account maintains consistent tone (casual / professional / educational / etc.)

## 5. Account Content Mix

| Bot Account Type | Education | Partner Repost | Product/UGC | Total Posts |
|-----------------|-----------|---------------|-------------|-------------|
| Education-focused | 50% (30 posts) | 30% (18 posts) | 20% (12 posts) | ~60 |
| Showcase-focused | 20% (12 posts) | 60% (36 posts) | 20% (12 posts) | ~60 |
| PMU-focused | 40% (24 posts) | 30% (18 posts) | 30% (18 posts) | ~60 |
| Behind-the-scenes | 30% (18 posts) | 30% (18 posts) | 40% (24 posts) | ~60 |

## 6. Content Calendar System

### Per Account Posting Schedule
- **Phase 1 (建立期)**: 3-4 posts/week for 4 weeks → ~14 posts
  - Mix: 2 partner reposts + 1 education + 1 product/UGC
- **Phase 2 (稳定期)**: 2-3 posts/week ongoing
  - Mix: 1 partner repost + 1 education + 0-1 product/UGC

### Scheduling Rules
- Content created 2 weeks in advance, stored as content_publish_tasks
- publish-worker picks up tasks at scheduled time
- Post times: staggered across accounts (not all posting at same hour)
- At least 24h between consecutive posts on same account

## 7. Image/Media Requirements

### What We Have Now
| Category | Files | Issues |
|----------|-------|--------|
| products/ | 15 (COG + AES + transfer paper) | Only product flat lays, no in-use shots |
| results/ | 4 (tattoo work) | Too few, no variety |
| _generated/ | empty | Not used yet |

### What We Need to Create
1. **Product styling shots** (50+): Show products with tattoo equipment, in studio setting
2. **Step-by-step process** (20+): Unboxing, setup, needle change demo
3. **Comparison shots** (10+): COG vs traditional needle vibration, different needle gauges side by side
4. **Flat lay compositions** (30+): Product + tools + sketchbook aesthetic
5. **AI-generated illustrations** (100+): Educational diagrams (needle structure, size comparison charts)

## 8. Implementation Roadmap

### Step 1: Add Main Accounts & Partner Artists to Content Pipeline
- Add @peachcartridge and @peachtattoos to content_competitors
- Run supply_analysis to scrape their posts into content_samples
- Start identifying potential partner artists

### Step 2: Run AI Education Content Generation
- Use topic bank + DeepSeek to generate first batch of educational posts
- Create 5-10 education posts per account

### Step 3: Build Partner Artist Relationships
- Bot accounts start engaging target partner artists
- Track follow-back rate and interaction depth
- DM outreach after minimum 3 touches

### Step 4: Establish Regular Posting Cadence
- Activate content-creator for automated generation
- Activate publish-worker for automated posting
- Monitor engagement and adjust content mix
