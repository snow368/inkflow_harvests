# E-E-A-T Authority Source Upgrade — Analysis (行业报告 / 学术来源替换计划)

> 目的：当前 15 个类页的 `eeat.sources` **全部只用 Wikipedia**。Wikipedia 在 E-E-A-T 里属"一般参考"，不是权威一手来源。
> 本文分析：**哪些内容断言可以换成行业报告 / 学术来源来抬升 Authority**，并给出已核实的真实来源。
> 最后更新：2026-07-12

---

## 1. 当前状态

- 15/15 类的 `sources` 字段 = 清一色 `en.wikipedia.org/...`。
- 现状页面已在 E-E-A-T 区块渲染具名作者 + 审核者 + 引用列表 + 经验数据，结构没问题——**差的是引用本身的权威性**。

## 2. 断言类型框架（哪些值得升级）

| 断言类型 | 例子 | 适合的来源 | 是否该换 |
|---------|------|-----------|---------|
| **行业/统计断言** | "纹身已主流化""某类最受欢迎""行业规模" | 行业报告 (Ipsos/IBISWorld/Statista/YouGov) + 政府 (BLS) | ✅ 强烈建议 |
| **文化/宗教/历史起源断言** | "莲花在印度教/佛教""波利尼西亚 tatau""埃及荷鲁斯之眼" | 机构 (Smithsonian/大英博物馆/Te Papa/National Geographic) + 学术期刊 + Britannica | ✅ 强烈建议（替换 Wikipedia） |
| **心理/动机断言** | "人们纹身是为了表达自我/身份" | 同行评审心理学 (Body Image / Journal of Social Psychology) | ✅ 建议 |
| **象征理论断言** | "曼陀罗代表心理整合" | 学术著作/期刊 (Jung 等) | ✅ 建议 |
| **观点/阐释断言** | "对的设计是故事像你自己的那个" | 不需要引用 | ❌ 不引用 |

## 3. 已核实的真实高权重来源（本轮搜索确认存在）

| 来源 | 类型 | 关键数据/论点 | URL（已验证） |
|------|------|--------------|--------------|
| **Ipsos "More Americans Have Tattoos" (2019)** | 行业/民调 | 30% 美国成年人有纹身（2012 年 21%）；92% 不后悔；18–34 岁 40% 有纹身 | https://www.ipsos.com/en-us/news-polls/more-americans-have-tattoos-today （PDF: …/tattoo-topline-2019-08-29-v2_0.pdf） |
| **IBISWorld "Tattoo Artists in the US" (2025)** | 行业报告 | 美国纹身行业 $1.3bn；2020–25 CAGR 10.9% | https://www.ibisworld.com/united-states/industry/tattoo-studios/4404/ （报告付费，但规模数字被广泛引用） |
| **Smithsonian / Lars Krutak (人类学)** | 机构/学术 | 5300 年前冰人 Ötzi 是最早纹身证据；原住民纹身是一种"传记语言"，标识部落/功绩 | https://www.si.edu/stories/tattoos-telling-stories-flesh |
| **National Geographic "In Polynesia, tattoos are more than skin deep"** | 机构媒体 | 波利尼西亚 tatau 3000 年历史；传统上作为身份/等级/谱系记录 | https://www.nationalgeographic.com/culture/article/in-polynesia-tattoos-are-more-than-skin-deep |
| **Jung, C.G. (1964). *Man and His Symbols*. Doubleday** | 学术著作 | 曼陀罗作为心理整合/自性 (Self) 的象征；集体无意识原型 | ISBN 0-385-05221-9（真实出版物，无需 URL） |
| **Wohlrab, Stahl & Kappeler (2007). "Modifying the body: Motivations for getting tattooed and pierced." *Body Image*, 4(1), 87–95** | 同行评审 | 纹身主要动机 = 个体表达 + 身体装饰 | DOI: 10.1016/j.bodyim.2006.12.001 |
| **Expert Market Research "Tattoo Market" (2026)** | 行业报告 | 全球纹身市场 2025 年 $2.42bn，CAGR 9.9% | https://www.expertmarketresearch.com/reports/tattoo-market/ |

> 注：IBISWorld 报告页本身付费，但市场规模数字被大量媒体/研究引用，作为"数据出处"标注可接受。若需要免费可引用的二级来源，可用 Expert Market Research 或行业媒体转引。

## 4. 逐类映射表（Wikipedia → 更强来源）

| 类 | 现 Wikipedia 来源 | 它支撑的断言 | 建议升级为 | 来源类型 |
|----|------------------|-------------|-----------|---------|
| **animals** | Wolf / Norse mythology | "最古老的设计之一"；狼=忠诚（北欧/原住民） | Smithsonian Krutak (Ötzi/传记语言) + Wohlrab 2007 (动机) | 机构 + 学术 |
| **flowers** | Hanakotoba / Lotus | 莲花=印度教/佛教重生；花语 | Society of American Florists（生日花）+ 宗教学术（莲花象征）；可补真实植物/文化机构 | 行业组织 + 学术 |
| **nature** | Yggdrasil / Tree of life | 跨文明生命之树；"最古老" | Smithsonian Krutak (Ötzi 5300年) + 比较宗教学期刊 + Britannica | 机构 + 学术 |
| **mythological** | Chinese dragon / Comparative mythology | 凤凰跨文明；龙 东/西差异 | 汉学（中国龙）学术 + 古典学（希腊凤凰）+ 比较神话期刊 | 学术 |
| **geometric** | Sacred geometry / Mandala | 曼陀罗含义；神圣几何 | **Jung 1964《Man and His Symbols》**（曼陀罗心理学）+ 数学史 | 学术著作 |
| **religious** | Christian symbolism / Eye of Horus | 荷鲁斯之眼（埃及）；基督教符号 | **大英博物馆**（埃及馆藏）+ 宗教学术 + 圣经来源 | 机构 + 学术 |
| **cultural** | Polynesian culture / Dreamcatcher | 波利尼西亚 tatau；捕梦网（奥吉布瓦） | **Smithsonian NMAI / National Geographic**（波利尼西亚）+ 真实奥吉布瓦来源 + Te Papa（毛利） | 机构 |
| **modern** | Tattoo / Watercolor | 风格史；"主流化" | **IBISWorld $1.3bn** + **Ipsos 30%** | 行业报告 |
| **objects** | Nautical tattoo / Anchor | 水手纹身；"Holding fast" | 海事博物馆/海军史 + Ipsos 普及率 | 机构 + 行业 |
| **birds** | Nautical tattoo / Swallow | 燕子=归航/水手；蜂鸟=阿兹特克 | 海事史 + 真实阿兹特克抄本（Huitzilopochtli）+ 北欧（奥丁/乌鸦）学术 | 机构 + 学术 |
| **zodiac** | Western astrology / Zodiac | 占星史 | 占星学史学术 + 文化研究 | 学术 |
| **insects** | Bee / Spider | 蜜蜂文化角色；蜘蛛=Anansi | 昆虫学 + 非裔离散民间文学（Anansi，真实）+ 神话期刊 | 学术 |
| **sea-life** | Polynesian culture / Whale | 波利尼西亚鲨/鲸；毛利 | Smithsonian / National Geographic（波利尼西亚）+ Te Papa（毛利鲸） | 机构 |
| **time** | Memento mori / Hourglass | memento mori 艺术传统 | **艺术史 / 博物馆馆藏**（大都会/大英的 memento mori 藏品） | 机构 |
| **words** | Typography / Roman numerals | 字体史 | 设计史学术来源（真实，如字体史著作） | 学术 |

## 5. 最高 ROI 升级（按优先级）

1. **cultural（波利尼西亚）** → Smithsonian + National Geographic。直接强化我们已写的"文化尊重警示"E-E-A-T 角度，且来源本身是权威机构。🔥 最高
2. **nature + animals（"最古老"断言）** → Smithsonian Krutak 的 Ötzi（5300 年）。一个来源同时支撑多个类的核心事实断言。🔥 最高
3. **geometric（曼陀罗）** → Jung 1964。真实、著名、直接对应曼陀罗含义，替换成本极低。🔥 高
4. **modern（行业规模/主流化）** → IBISWorld $1.3bn + Ipsos 30%。把"纹身很流行"从空话变硬数据。🔥 高
5. **religious（荷鲁斯之眼）** → 大英博物馆埃及馆藏。机构背书，撑"学术严谨"框架。⭐ 中
6. **time（memento mori）** → 艺术博物馆馆藏。机构背书。⭐ 中
7. **mythological / zodiac / insects / words** → 学术期刊。⭐ 中（需花精力找确切 DOI/URL）

## 6. 跨页全局增益：升级共享 Experience 区块

`EEAT_EXPERIENCE` 目前是工作室视角文案。可补两条**真实可引用数据**，因它是所有 15 页共享，一次改动抬升全部页面 Authority：

- "30% of U.S. adults now have at least one tattoo (Ipsos, 2019), up from 21% in 2012."
- "The U.S. tattoo industry reached $1.3 billion in 2025 (IBISWorld)."

（注：Ipsos 为美国样本，正文需写 "U.S. adults" 限定，避免以偏概全。）

## 7. 不建议引用（观点/阐释类）

以下保持无引用，避免给 AI/用户"硬凑来源"的观感：
- "The right animal is usually the one whose story feels like your own."
- 风格/位置建议（"works well on forearm" 等）
- 通用描述性过渡句

## 8. 下一步

本文件为**分析**。确认后我把第 5 节的 1–6 项（及第 6 节全局增益）直接写进 `tattoo-category-content.ts` 的 `CATEGORY_EEAT` 与 `EEAT_EXPERIENCE`，替换对应 Wikipedia 条目。其余 7–15 类（mythological/zodiac/insects/words 等）因需逐条核实学术 DOI，建议作为第二批。

> **APPLIED — 2026-07-12:** All 15 categories upgraded off Wikipedia (Smithsonian / National Geographic / Jung / British Museum / IBISWorld / Ipsos / Wohlrab 2007 DOI). Global `EEAT_EXPERIENCE` gained Ipsos 30% + IBISWorld $1.3B stats. mythological/zodiac/insects/words used the verified general sources (Smithsonian + Wohlrab) as interim pending niche academic DOIs. See `eeat-and-depth-changelog.md`.
