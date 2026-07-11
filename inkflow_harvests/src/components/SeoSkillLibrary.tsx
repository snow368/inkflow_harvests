import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, ChevronRight, BookOpen, Target, Search, PenLine, Wrench, Link2, Rocket, Zap } from 'lucide-react';

// ============ 技能数据定义 ============

interface SkillItem {
  label: string;
  items: string[];
}

interface SubSkill {
  id: string;
  name: string;
  desc: string;
  trigger: string;
}

interface SkillSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  summary: string;
  chapters: SkillItem[];
  subSkills: SubSkill[];
}

const SKILL_DATA: SkillSection[] = [
  {
    id: 'seo-strategy',
    title: 'SEO 战略与排名体系',
    icon: <Target size={16} />,
    color: 'rose',
    summary: '150个策略速查 · 排名因子 · 竞品计分卡 · 算法应对 · 实战案例',
    chapters: [
      { label: '150个SEO策略', items: [
        'A. 关键词策略 (20个) — PAA选题、GSC高曝光低点击、长尾词、对比/替代品/地区词',
        'B. 内容策略 (25个) — 终极指南、原创研究、模板/清单、对比页、常见错误页',
        'C. 页面优化 (20个) — 标题公式、BLUF首段、FAQ Schema、对比表、信任背书',
        'D. 技术SEO (20个) — Sitemap、Canonical、301、CWV、面包屑、Hreflang',
        'E. 外链策略 (25个) — Broken Link、Guest Post、HARO、免费工具、Skyscraper',
        'F. AI SEO (20个) — FAQ结构化、简短结论、表格化、Organization Schema、Reddit布局',
        'G. 增长转化 (20个) — 免费工具引流、邮件订阅、A/B测试、再营销、GSC复盘',
      ]},
      { label: 'Google 排名因子', items: [
        '① 内容质量（最高权重）— 原创性、深度、E-E-A-T信号、用户满意度',
        '② 反向链接（高权重）— 域名多样性>总数量、DA/DR质量、相关性、自然度',
        '③ 技术SEO — CWV、移动端、HTTPS、可抓取性、结构化数据',
        '④ 页面体验 — LCP<2.5s、INP<200ms、CLS<0.1',
        '⑤ 搜索意图匹配 — 页面内容格式与query意图一致',
        '⑥ 品牌信号 — 品牌搜索量、品牌词提及、品牌权威性',
        'SaaS特有: Product-Led SEO、Content-to-Product漏斗、对比页排名能力',
      ]},
      { label: '竞品分析计分卡', items: [
        'Niche竞争度: 0-3 Easy (SERP<1000/DA<30) | 4-6 Medium | 7-10 Hard (SERP>10000/DA>60)',
        '手动KD检查: Reddit/论坛排首页=低KD ✅ | Forbes/HubSpot排首页=高KD ❌',
        '低KD信号: 0-2广告、搜索结果<5000万条、内容过时文章在前排',
        '高KD信号: Wikipedia在首页、全是Landing Page、4+广告',
      ]},
      { label: '实战案例', items: [
        '新加坡B2B站 — 3个月55.6K点击、CTR 8.3%→15.8%、平均排名6.2',
        '户外装备站 — 4个月450→3,200流量、移动端LCP 6.8s→2.1s、非品牌词15%→58%',
        '共通规律: 4-8周静默期、重视内链布局、长尾词转化率是头部词3-5倍',
        '核心数据: Ahrefs分析10亿页面 — 排名前20%页面中64.7%流量来自月搜索量<100的长尾词',
      ]},
      { label: '站点类型 × SEO策略矩阵', items: [
        'SaaS: 对比页>功能页>定价 | G2/Capterra外链 | KD<20 | 20-50页精品',
        'B2C电商: 产品页>分类页>导购 | 评测站/导购站外链 | KD<25 | 产品数决定',
        'B2B供应商: 产品规格页>认证页 | 行业目录外链 | KD<15 | SKU数决定',
        '内容站: 聚合页>模板页 | 靠量取胜 | KD<10 | 数百到数百万页',
        '品牌站: 品牌故事>PR>案例 | 媒体报道外链 | 少而精',
      ]},
      { label: 'Google 算法更新应对', items: [
        'Helpful Content (2022.9+) — 低质SEO内容排名下降 → 内容先有价值再谈SEO',
        'Core Web Vitals (持续) — LCP/INP/CLS硬指标 → Astro天然CWV优秀',
        'AI Overviews (2024+) — AI摘要改变点击模式 → 结构化答案争取AI引用',
        'Spam Update (2024+) — 批量模板页受罚 → 每页需有真实差异化内容',
        'Reviews Update (2024) — 虚假评论打击 → 评价必须真实可验证',
        'E-E-A-T强信号: 作者实际行业经验、内容有具体数据/案例/截图、展示真实团队',
      ]},
      { label: 'SEO 冲突观点决策', items: [
        '内容量vs质量 → SaaS/品牌选B(精品质量)；内容站可混合',
        'BOFU vs TOFU先做 → 新站先BOFU(转化页)，有DA后再TOFU',
        'KD值可信吗 → LP/产品页信KD<20；博客放宽到30-40',
        '外链数量vs质量 → 新站先注册目录，不急买外链',
        'Programmatic SEO → 每页需真实差异化内容（不只是换词）',
        'X发链接vs不发 → 2026年X算法已反转，link-in-reply战术有效',
      ]},
    ],
    subSkills: [
      { id: 'seo-site-audit', name: '网站 SEO 审计', desc: '29项逐页检查，输出整改清单', trigger: '"审计网站SEO"' },
      { id: 'seo-competitor-gap', name: '竞品差距分析', desc: '页面/关键词/内容/技术四维对比', trigger: '"分析竞品"' },
    ],
  },
  {
    id: 'seo-keyword',
    title: '关键词研究与主题集群',
    icon: <Search size={16} />,
    color: 'amber',
    summary: '5维评分 · 意图判断 · 长尾扩展 · 分组聚合 · 主题集群 · 月度审计',
    chapters: [
      { label: '关键词 5 维评分系统', items: [
        'KD（竞争度）⭐⭐⭐⭐⭐ — 0-15起步、15-30积累期',
        '搜索意图 ⭐⭐⭐⭐⭐ — 商业/交易型>信息型',
        '商业价值 ⭐⭐⭐⭐ — 注册概率: 对比页>功能页>博客',
        '搜索量 ⭐⭐⭐ — 太低没流量、太高做不上去',
        '内容匹配度 ⭐⭐⭐ — 能否自然融入已有内容结构',
        '评分示例: digital tattoo consent form app → 总分40/50 ✅ 做',
      ]},
      { label: '手动判断 KD（无需工具）', items: [
        '打开Google搜目标词 → 看首页结果 → 判断KD',
        '低KD信号: Reddit/Quora/论坛排首页、博客文章排名、0-2个广告、内容过时文章在前排',
        '高KD信号: Forbes/HubSpot/Shopify排首页、Wikipedia在首页、全是LP、4+广告',
        '站点KD范围: SaaS<20 | B2C<25 | B2B<15 | 内容站<10',
      ]},
      { label: '搜索意图判断（4+3种分类）', items: [
        '交易型 (10-20%转化) — vs/best/review/pricing → 对比页/替代品页',
        '商业型 (6-10%转化) — software/app/system/tool → 功能页',
        '信息型 (0.5-2%转化) — how to/guide/what is → 博客/指南',
        '导航型 — 品牌名/产品名 → 品牌页',
        '购买词: "best trail running shoes 2025" — 转化率最高，竞争最激烈',
        '痛点词: "knee pain after running" — 搜索量小但用户忠诚度高',
        '场景词: "running shoes for marathon training" — 适合做对比页/选购指南',
        '意图分配: SaaS 40% BOFU·35% MOFU·25% TOFU | B2C 30·30·40 | B2B 25·40·35',
      ]},
      { label: '长尾词扩展（按站点类型）', items: [
        'SaaS: [场景]+[痛点]+[解决方案] — "how to manage tattoo shop appointments online"',
        'B2C: [产品]+[属性]+[使用场景] — "wireless earbuds long battery life running"',
        'B2B: [产品规格]+[供应商]+[地域] — "3mm rubber sheet supplier in california"',
        '内容站: [问题]+[指南]+[对比] — "best way to remove tattoo at home"',
        'B2C品类矩阵: 按材质/尺寸/功能/风格维度各建独立品类页',
        '扩展方法: Google Autocomplete、竞品内页、Related Searches、Reddit/论坛提取',
      ]},
      { label: '关键词类型 × 竞争力 × 转化率对照（新站必读）', items: [
        '核心大词 (Dress / LED Light): 搜索量极高、竞争度极高、转化率极低 → 只适合亚马逊/行业巨头',
        '长尾关键词 (bohemian floral maxi dress for summer): 搜索量中等、竞争度较低、转化率极高 → 新站首选',
        '长尾优势: 大卖家看不上/顾及不到; 搜Dress的人只想看图片; 搜长尾的人手已经摸到信用卡',
        '新站策略: 放弃大词 → 找30个长尾 → 平摊到产品页和博客',
      ]},
      { label: '关键词扩展 5 大方法', items: [
        '① Google Autocomplete — 种子词+不同前缀(what/how/best/vs/for)',
        '② Google Related Searches — 搜索结果底部相关搜索',
        '③ Reddit/社区自然用语挖掘 — 用户原话=真实搜索意图',
        '④ 竞品SERP分析 — 分析Top10标题/H1/长度/FAQ找内容缺口',
        '⑤ 问题词库扩展 — What is/How to/Best/X vs Y/X alternative/X for [persona]',
      ]},
      { label: '关键词分组聚合', items: [
        '原则: 同一搜索意图的词归一组 → 一页覆盖一组词',
        '分组方法: 找出相关词 → 看搜索意图 → 同一意图一组 → 选最低KD做H1 → 其他做H2/H3',
        '一页只做一个意图，不要混用',
      ]},
      { label: '主题集群架构 (Hub-and-Spoke)', items: [
        '支柱页(Pillar): 覆盖大主题的概述性文章 — 如"纹身工作室管理完整指南"',
        '集群页(Cluster): 深入子话题 — 如"纹身预约系统选择"',
        '链接方向: 集群页→支柱页，合适位置→产品页（权重通道）',
        '规划步骤: AI列15个购买前最可能搜的问题 → 确认支柱页 → 补集群页间链接 → AI批量找链接机会',
      ]},
      { label: '竞品关键词差距分析', items: [
        '手动: 找3个竞品 → site:competitor.com → 找他们排了你没做的词',
        '用AITDK插件: 打开竞品网站 → Traffic Analysis → top keywords → 抄有流量的词',
      ]},
      { label: '月度关键词审计流程', items: [
        'Step1: 列关键词 → GSC查流量',
        'Step2: 找新词 → AITDK看竞品新增 / Reddit新话题',
        'Step3: 5维打分 → KD 0-15排最前 + 商业/交易型优先',
        'Step4: 分配到内容日历 → 最高分排这周',
      ]},
    ],
    subSkills: [
      { id: 'seo-keyword-finder', name: '关键词研究与建议', desc: '5维评分+意图判断+关键词映射', trigger: '"找关键词"' },
      { id: 'seo-topic-cluster', name: '主题集群规划', desc: 'Hub-and-Spoke架构+内链拓扑', trigger: '"规划主题集群"' },
    ],
  },
  {
    id: 'seo-content',
    title: '内容创作与 GEO/AEO 写作',
    icon: <PenLine size={16} />,
    color: 'cyan',
    summary: '内容矩阵 · AEO优化 · BLUF写作法 · 案例研究 · AI内容引擎',
    chapters: [
      { label: '内容矩阵（9种页面类型×格式×Schema）', items: [
        '首页/LP: Hero+功能网格+HowItWorks | SoftwareApplication | 3000+字',
        '功能页: Problem→Solution→Features→数据→FAQ | 1200-1500字',
        '对比页: Verdict→对比表→定价→场景→FAQ | FAQPage | 1500-2000字',
        '替代品页: 问题→替代方案表→迁移→CTA | FAQPage | 1500-2000字',
        '博客/指南: 首段答案→分段→列表/表格→FAQ | Article | 1000-1500字',
        '定价页: 层级→功能矩阵→FAQ | Product+Offer',
        '免费工具: 界面→用法→数据→FAQ | WebPage | 800-1200字',
        '工具榜单: 横向评测→优劣→排名推荐(定期更新) | 1500-2000字',
        '教程页: Step-by-step+截图→H3分步→信任→转化 | 1000-1500字',
      ]},
      { label: 'AEO 回答引擎优化', items: [
        '核心: 传统SEO优化"点击"，AEO优化"被AI引用"',
        'AEO vs SEO: 直接结构化答案 vs 深度长文、问题-答案配对 vs 关键词密度',
        'AEO四法则: ①H2下第一段40-60字直接回答 ②问题-答案对 ③列表表格(准确率+30-40%) ④FAQ Schema',
        'AEO关键词优先: What is X > How to X > Best X for Y > X vs Y',
      ]},
      { label: 'SEO+GEO 写作标准（3大原则）', items: [
        '原则1 BLUF: 首段直接给答案 — "Digital waivers reduce check-in time from 5min to 30s"',
        '原则2 段落自包含: 拿走一段就能独立理解 — 不用"as we discussed above"',
        '原则3 列表表格优先: AI提取准确率比段落高30-40%',
        '额外收益: Google容易提取开头段落作为Featured Snippet，排在排名第一页面上方',
      ]},
      { label: '8 种内容类型矩阵', items: [
        '对比页 — "A vs B"类，决策最后阶段，转化率最高',
        '替代页 — "XXX alternatives"，客观公正比较差异',
        '工具榜单 — "best tools for XXX"，横向评测，每季度更新',
        '教程页 — "how to XXX"，步骤清晰图文并茂，H3分隔每步',
        '免费工具页 — 获取自然外链最有效方式（如"跑步配速计算器"）',
        '内容更新 — 更新过时数据/产品信息/年份，投入产出比高于新写',
      ]},
      { label: '每页 SEO 检查清单', items: [
        '□ H1含目标关键词 □ Title≤60字关键词前置 □ Description≤160字含CTA',
        '□ 首段BLUF □ 每段独立可引用 □ ≥1个列表或表格 □ FAQ 3-5个',
        '□ 字数按类型调整 □ Canonical URL □ OG/Twitter Card □ ≥3条内链',
        '□ ≥1个CTA □ 信息增益: 至少一个"只有你能写"的元素',
      ]},
      { label: '内容生产 10 步流程', items: [
        '①选题→关键词矩阵找KD 0-15 ②搜SERP→看首页格式 ③找差距→信息增益',
        '④定格式→对照矩阵选 ⑤写H1-H3→按关键词规划 ⑥写内容→BLUF',
        '⑦写FAQ→3-5个真实问题 ⑧加内链→≥3条 ⑨加Schema→按类型 ⑩加CTA',
      ]},
      { label: '高转化案例研究 7 段结构', items: [
        '①Hook(3句): 公司类型+问题+stakes+约束 ②Stakes: 商业后果+个人压力',
        '③Diagnosis: 表面症状→数据→根因 ④Strategic Shift: 关键洞察+反直觉赌注',
        '⑤Implementation: 3阶段执行(月1-2→3-4→5-6) ⑥Results: 商业/效能/辅助',
        '⑦Validation: 客户证言+第三方验证（好证言=具体故事+署名+职位+公司）',
        '多格式: 长文2500-3500字 + 1页PDF + PPT 12-15页 + 5-7分钟视频 + LinkedIn 5帖',
      ]},
      { label: 'AI 内容生产 5 阶段引擎', items: [
        'Phase1 Research: 竞品分析、SERP结构提取、PAA差距',
        'Phase2 Draft: 按品牌语气写初稿（AI写你审）',
        'Phase3 SEO优化: Meta、标题、可读性',
        'Phase4 CMS格式化: 根据框架(Astro/WordPress/Hugo)格式化',
        'Phase5 分发: X link-in-reply + LinkedIn + Reddit + Newsletter',
        'Daily SOP: 选词→写页面→提交索引→追踪排名',
      ]},
    ],
    subSkills: [
      { id: 'seo-content-brief', name: '内容大纲生成', desc: '按页面类型生成完整Content Brief', trigger: '"写内容大纲"' },
      { id: 'seo-meta-optimizer', name: 'Meta标签优化', desc: '批量检查优化Title/Desc/OG', trigger: '"优化meta"' },
      { id: 'seo-content-rewrite', name: '内容重写优化', desc: 'AEO/GEO标准诊断重写页面', trigger: '"重写内容"' },
    ],
  },
  {
    id: 'seo-technical',
    title: '技术 SEO 规范',
    icon: <Wrench size={16} />,
    color: 'emerald',
    summary: 'URL/Schema/Meta · 内链规则 · CWV优化 · JS SEO · 多语言 · 工具库',
    chapters: [
      { label: 'URL 结构规范（5条铁律）', items: [
        '全小写+连字符-、不用下划线_',
        '包含核心关键词',
        '简短 ≤60字符、去掉停用词',
        'URL一旦发布就不改、301重定向代价大',
        '尾部斜杠统一（推荐加/）',
        '推荐结构: /blog/<slug> · /features/<name> · /compare/<competitor> · /free-tools/<name>',
      ]},
      { label: 'Schema 结构化数据（9种页面对照表）', items: [
        '首页: Organization + SoftwareApplication + WebSite + BreadcrumbList',
        '功能页: SoftwareApplication + WebPage',
        '对比页/替代品页: FAQPage（3-5问答）',
        '定价页: Product + Offer',
        '博客: Article + BreadcrumbList',
        '关于页: Organization | 联系页: ContactPage | 免费工具: WebPage + SoftwareApplication',
      ]},
      { label: 'Meta 标签规则', items: [
        'Title: ≤60字符、关键词前置、品牌放最后、格式 "关键词 — 价值点 | 品牌名"',
        'Description: ≤155字符、含关键词+价值点+CTA、每页唯一',
        'OG/Twitter Card: og:title/description/image/url + twitter:card=summary_large_image',
        '不要用: keywords标签(不再排名)、H1完全=Title',
      ]},
      { label: 'H1-H6 层级规范', items: [
        'H1=页面主题(每页1个、含目标关键词) | H2=主要章节(4-7个、含相关长尾词)',
        'H3=子章节(每H2下2-4个) | H4-H6=几乎不用',
        '常见错误: 跳级H1→H3、多个H1、H1没关键词、H1≈Title（完全一样）',
      ]},
      { label: '内部链接规则（6条）', items: [
        'R1: 每页≥3个内链(内容区，非nav/footer)',
        'R2: 功能页底部互链3个最相关功能',
        'R3: 对比页链对应功能页+底部CTA链定价页',
        'R4: 博客≥3个功能页链接 → "博客提到的功能都要可点击"',
        'R5: 免费工具链2个相关功能页',
        'R6: 核心页链回首页(about/contact/privacy)',
        '审计重点: 修复死胡同(无出链)、重要页藏太深(3+次点击)、锚文本不匹配',
      ]},
      { label: 'Core Web Vitals + 优化案例', items: [
        'LCP ≤2.5s | INP ≤200ms (2024.3替代FID) | CLS ≤0.1',
        '真实案例: 户外装备站 — 移动端LCP 6.8s→2.1s，两周后流量+31%',
        '手段: 4MB hero图→180KB WebP + 延迟加载 + 移除渲染阻塞CSS/JS',
        '移动端教训: Google爬虫先评估移动端 → 导航栏折叠 → 流量-40%',
      ]},
      { label: 'AI 驱动性能优化实战：PageSpeed 69→94', items: [
        '方法: PageSpeed Insights 诊断 → AI 逐条修复 → 重新部署 → 验证',
        '移动端: 69→94 | 桌面端: 71→94 | Accessibility/SEO 保持100',
        '关键: 问题集中在Performance，其他维度满分说明技术基础不差，只需专注瓶颈',
      ]},
      { label: '技术 SEO 检查清单（14项）', items: [
        '□ Sitemap □ robots.txt □ Canonical □ 301重定向 □ 修复404',
        '□ 修复重复Title/Description □ 修复Noindex误伤 □ JS渲染检查(GSC URL工具)',
        '□ 图片压缩+Lazy Loading+WebP/AVIF □ 面包屑 □ HTML语义结构',
        '□ Hreflang(多语言) □ 防止参数页索引 □ GSC+GA4监控',
      ]},
      { label: 'JavaScript SEO', items: [
        '核心问题: SPA中<div id="root"></div> → Google两轮索引：第一轮抓HTML，第二轮渲染JS',
        '检查方法: curl -A "Googlebot" https://yoursite.com → 看原始HTML',
        '推荐: 新项目首选Next.js(SSR)或Astro(SSG)；已有CSR用预渲染过渡',
        '关键: Meta title/description须在初始HTML、内链用<a href>不用onClick',
      ]},
      { label: '多语言 / 国际 SEO', items: [
        'URL方案: 子目录(推荐) > ccTLD(大公司) > 子域名(不推荐)',
        'Hreflang关键: 双向返回(A→B则B→A)、每页自引用、必须含x-default',
        '本地化vs翻译: 翻译逐字转换 → 30-50%更低转化；核心页面全本地化',
      ]},
      { label: 'SEO 工具库', items: [
        'Google Search Console — 免费关键词排名数据',
        'Ahrefs/Semrush — 付费外链分析+关键词研究',
        'Screaming Frog — 网站爬虫技术审计',
        'TinyPNG/ShortPixel — 图片压缩',
        'Cloudflare Workers/Pages — 边缘计算+静态托管',
      ]},
      { label: '战术速查：5 Fixes Before Dinner', items: [
        'Step1: GSC→按点击量排序前10页 Step2: 每页加3条内链',
        'Step3: Title改成精确匹配目标关键词 Step4: 底部加FAQ block(3-5个GEO问答)',
        'Step5: 把超过200KB的图片压缩 → 一顿饭的功夫',
        '11-20排名优化法: GSC筛选位置11-20→挑前5→H1精确匹配+5条内链+扩展答案段 → 2-3周上首页',
      ]},
    ],
    subSkills: [
      { id: 'seo-schema-injector', name: 'Schema 注入', desc: '按页面类型注入JSON-LD结构化数据', trigger: '"加schema"' },
      { id: 'seo-speed-optimizer', name: '页面速度优化', desc: 'CWV达标优化(图片/JS/CSS/字体)', trigger: '"提升速度"' },
      { id: 'seo-technical-check', name: '技术SEO检查', desc: '32项基础设施逐项诊断', trigger: '"技术SEO检查"' },
      { id: 'seo-sitemap-config', name: 'Sitemap/Robots配置', desc: '生成sitemap+robots+IndexNow', trigger: '"配置sitemap"' },
    ],
  },
  {
    id: 'seo-link',
    title: '外链建设全攻略',
    icon: <Link2 size={16} />,
    color: 'blue',
    summary: '25种策略 · 质量评估 · B2B/B2C差异化 · Niche资源 · Webinar策略',
    chapters: [
      { label: '外链质量铁律（4条）', items: [
        '域名多样性>总数量 — 100个不同域名>1000个同域名',
        '质量优先(DA/DR) — 高权威链接远大于低质链接',
        '相关性 — 同行业链接价值更高（纹身行业链接>通用链接）',
        '自然度 — 不买链接、不过度优化锚文本、增长曲线自然',
      ]},
      { label: '主动获取型策略（12种）', items: [
        'Broken Link Building ⭐⭐ — 找失效链接推荐替代内容',
        'Resource Page Link Building ⭐⭐ — 让你加入资源列表',
        'Best-of List Outreach ⭐⭐⭐ — 让编辑把你加入榜单',
        'Brand Mention Reclamation ⭐ — 被提到但没链接→联系补上',
        'Guest Post ⭐⭐⭐ — 投稿留作者链接',
        'HARO ⭐⭐ — 回应记者提问，被引用带链接',
        'Skyscraper Technique ⭐⭐⭐⭐ — 写更全面内容，让原引用换链接',
        'Podcast Guest ⭐⭐ · Original Data Outreach ⭐⭐⭐ · Feeler Email ⭐⭐',
      ]},
      { label: '内容吸引型策略（7种）', items: [
        'Free Tool Backlink — 免费工具被大量引用（最有效）',
        'Template Backlink · Calculator Backlink · Infographic Backlink',
        'Statistics Page Backlink · Original Research — 爬数据整理报告，媒体主动找',
        'Case Study — 真实案例展示',
      ]},
      { label: '提交积累型策略（6种）', items: [
        'Directory Submission — 行业目录提交',
        'SaaS/Tool Listing — 提交到工具聚合页面',
        'Local Citation — Google My Business等本地目录',
        'Partner Page Link · Customer Story Link · Sponsor Page Link',
        '执行节奏: 每天3-5个，细水长流，第一月累积30-60个外链',
      ]},
      { label: 'B2B 第一梯队外链目录（DA 70+）', items: [
        'Google Business Profile (DA100) · LinkedIn Company Page (DA98)',
        'Bloomberg (DA94) · Dun & Bradstreet (DA91) · Crunchbase (DA91)',
        'Trustpilot (DA90) · G2 (DA89) · Capterra (DA87) · Product Hunt (DA88)',
        'Yelp/Yellow Pages (DA88) · Chamber of Commerce (DA64-85)',
        '执行顺序: 第1周GBP+LinkedIn+Crunchbase+Trustpilot → 第4周Clutch/GoodFirms',
      ]},
      { label: '纹身行业 Niche 外链资源', items: [
        '目录站: tattoolove.es、tattoospotlight.com、tattooed.co、inkstinct.co',
        '博客/媒体: tattoodo.com、tattoo.com、inkedmag.com、tattooing101.com',
        '行业协会: Alliance of Professional Tattooists、National Tattoo Association',
        '展会站: London Tattoo Convention、Berlin Tattoo Expo(赞助/参展链接)',
        'Outreach清单: 搜"best tattoo software"→记录页面→联系添加；行业Newsletter投稿',
      ]},
      { label: 'Webinar 外链策略', items: [
        '每场权威型Webinar=140+外链 · 案例: 340人注册→3个月187条外链23次媒体报道',
        '5步框架: 选独特角度→联合知名主持人→创建可分享发现→策略性分发→复用便于引用',
        '分发时间线: 前2周联系记者→前1周邮件通知→当天直播→后1周复用→后3周新闻稿',
        '预算: $500-2K/场 | 一年2-4场可规模化',
      ]},
      { label: '免费工具外链分发计划', items: [
        '6大渠道: ①SEO拦截(每个工具独立页面) ②目录站(alternative.me/saashub.com)',
        '③嵌入挂件(iframe嵌入=别人帮你做外链) ④资源页外联(50封outreach)',
        '⑤社媒推广(X link-in-reply+LinkedIn+Reddit) ⑥Product Hunt(DA88外链)',
        '执行节奏: 第1周工具SEO+10个目录站 → 第4周数据复盘',
      ]},
      { label: '外链找需求（竞品监控）', items: [
        '分析竞品外链(Ahrefs/Similarweb) → 找竞品外链来源 → 逐个攻克相同来源',
        '竞品新获得的外链=你的机会信号',
        'Google的3种方法: 论坛提问+自然留链接、Chrome扩展页面、Google Sites/Docs建页面',
      ]},
    ],
    subSkills: [
      { id: 'seo-backlink-audit', name: '外链审计与策略', desc: '25种策略+分阶段执行计划', trigger: '"外链审计"' },
      { id: 'seo-outreach-writer', name: 'Outreach 邮件', desc: '8种场景邮件模板+跟进节奏', trigger: '"写外链邮件"' },
    ],
  },
  {
    id: 'seo-workflow',
    title: 'SEO 工作流与增长执行',
    icon: <Rocket size={16} />,
    color: 'purple',
    summary: '建站流程 · 增长策略 · CRO转化 · 社媒分发 · 出海 · GSC复盘',
    chapters: [
      { label: '建站 9 步完整启动流程', items: [
        '①需求分析(站点类型+转化路径) ②主关键词(10-20个、KD<20) ③长尾词(100-500个)',
        '④意图分组(按BOFU/MOFU/TOFU比例) ⑤架构(首页>功能页>对比页>定价>博客>工具)',
        '⑥写页面(按模板) ⑦技术地基(HTTPS/GSC/Sitemap/Schema/CWV)',
        '⑧上线推广(域名→外部引用源→社媒) ⑨数据驱动(每月GSC复盘→Experiment Log)',
        '上线前必做: 域名+HTTPS、GSC+GA4验证、sitemap提交、Lighthouse CWV审计',
      ]},
      { label: 'AI 搜索就绪策略（3阶段）', items: [
        'Phase1(0-3月): 只做基础SEO — Helpful content+Schema+CWV+外部引用源',
        'Phase2(3-6月): AI-aware期 — 维护Schema、监控AI引用、暂不做llms.txt',
        'Phase3(6月+): AI>10% organic traffic → 分析AI引用差异、评估llms.txt实验',
      ]},
      { label: '三种业务类型工作流', items: [
        'SaaS: 官网框架→对比页(高转化)→功能页→博客→增长杠杆→外链→转化优化→规模化',
        'B2B: 官网→服务页>案例页>博客→本地SEO(GBP+目录+Review)→行业白皮书',
        'B2C: 产品页+分类页(Product+Offer Schema)→Review/VS/Guide博客→KOL外链',
      ]},
      { label: '增长策略（4种）', items: [
        '竞品替代: 跟踪竞品排名，写更好版本抢占位置',
        '非品牌增长: 非品牌词占自然流量>60%才算健康（户外装备站: 15%→58%/4个月）',
        '程序化增长: 程序化SEO+内容集群=可复制引擎（前提: 50-100篇手写+一定DA）',
        '复合增长飞轮: SEO→社交分发→品牌搜索↑→外链自然增长→排名↑→更多流量',
      ]},
      { label: '转化率优化（CRO）', items: [
        '落地页: Hero标题清晰→功能网格→信任信号→CTA',
        '定价页: 3层心理学定价(免费/Pro/Enterprise)',
        'CTA优化: 具体>泛泛("Start Free Trial">"Learn More")',
        '信任徽章: SSL/退换货/支付方式/Featured in',
        '漏斗: 博客→内嵌产品卡片→对比页→定价页→注册',
      ]},
      { label: 'B2C 邮件营销互动层级', items: [
        'L1 Open(弱) | L2 Click(尚可) | L3 Reply(强) — 引导回复获取专属折扣',
        'L4 Move to inbox(更强) | L5 Add as contact(最强) — Welcome email引导添加',
        '标准流程: Welcome→畅销品推荐(24h)→Back in Stock(GIF)→Abandoned Cart(1h)→Post-Purchase',
      ]},
      { label: 'B2B 冷邮件 + Reddit 冷启动', items: [
        '冷邮件3阶段: 验证PMF(手动20个)→系统化(50封/周)→规模化(500封/周)',
        'Reddit 3阶段: 纯回答问题1-2周(300+karma)→分享经验3-4周→自然引导5周+',
      ]},
      { label: 'Social SEO 分发', items: [
        '社媒3作用: 内容分发+品牌搜索+外链触发',
        '分发节奏: Day1 IndexNow+X推广 → Day3 X重推 → Day7 LinkedIn → Week2案例角度',
        'GSC可加入社媒平台: Ins/FB/Twitter → 查看社媒在Google搜索展现数据',
      ]},
      { label: '月度 GSC 复盘 + Experiment Log', items: [
        '看流量趋势→找上升最快页面(复制模式)→找下降页面(翻新/update影响)',
        '找高曝光低点击词(优化Title/Description)→排名11-20词(优化+内链冲刺首页)',
        '找新收录页面→有曝光无点击词(Meta+内容补强)',
        'Experiment Log模板: Date|Page|Change|Expected Impact|CTR Before|CTR After|Result',
      ]},
      { label: '新站前 3 个月 5 步行动计划', items: [
        '① 确认GSC绑定 → Sitemap提交 → 检查无Noindex误伤',
        '② 放弃大词 → 找30个长尾关键词 → 平摊到产品页和博客',
        '③ 优化速度 → 大图压缩替换(≤200KB WebP)',
        '④ 保持更新 → 每周1-2篇高质量博客(雷打不动)',
        '⑤ 多渠道引流 → 社媒发帖，别死等Google自然流量',
        '心态: SEO是复利效应 — 前3月像无用功，第6/9月流量爆发',
      ]},
      { label: '出海基础 + 账号速查', items: [
        '必备: 美国公司注册(WY LLC)、Stripe收款+VAT、法律合规(Privacy/Terms/GDPR)',
        '中文出海圈: @hezhiyan7(SaaS低KD) · @sujingshen(259目录站) · @yidabuilds(AI+GEO)',
        '国际大V: @Kevin_Indig(企业SaaS) · @BrianEDean(Skyscraper) · @KristinaAzarenko(技术)',
        '新手5大错误: 只追大词/无集群/忽略技术/期望短期/只做SEO不做多渠道',
      ]},
    ],
    subSkills: [
      { id: 'seo-launch-checklist', name: '新站上线清单', desc: '9步上线流程逐项验证', trigger: '"网站上线"' },
      { id: 'seo-gsc-analyzer', name: 'GSC 数据分析', desc: '关键词/页面/CTR四象限分析', trigger: '"分析GSC"' },
    ],
  },
];

// ============ 组件 ============

export default function SeoSkillLibrary() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleChapter = (chapterKey: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapterKey]: !prev[chapterKey] }));
  };

  const expandAll = () => {
    const allSections: Record<string, boolean> = {};
    const allChapters: Record<string, boolean> = {};
    SKILL_DATA.forEach(s => {
      allSections[s.id] = true;
      s.chapters.forEach((_, ci) => { allChapters[`${s.id}-${ci}`] = true; });
    });
    setExpandedSections(allSections);
    setExpandedChapters(allChapters);
  };

  const collapseAll = () => {
    setExpandedSections({});
    setExpandedChapters({});
  };

  const colorClasses: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    rose:    { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', dot: 'bg-rose-500' },
    amber:   { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-500' },
    cyan:    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', dot: 'bg-cyan-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    blue:    { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' },
    purple:  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', dot: 'bg-purple-500' },
  };

  const totalItems = SKILL_DATA.reduce((sum, s) => sum + s.chapters.length, 0);
  const totalPoints = SKILL_DATA.reduce((sum, s) => sum + s.chapters.reduce((c, ch) => c + ch.items.length, 0), 0);

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookOpen size={18} className="text-rose-400" />
            SEO 技能知识库
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            6 个维度 · {totalItems} 个知识模块 · {totalPoints} 个技能点 — 来源: ink-flow-manager/seo-knowledge/
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors">
            全部展开
          </button>
          <button onClick={collapseAll} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors">
            全部折叠
          </button>
        </div>
      </div>

      {/* 技能列表 */}
      <div className="space-y-3">
        {SKILL_DATA.map((section) => {
          const colors = colorClasses[section.color];
          const isExpanded = !!expandedSections[section.id];

          return (
            <div key={section.id}
              className={cn(
                'rounded-xl border transition-all duration-200',
                colors.border, colors.bg,
                isExpanded ? 'bg-opacity-20' : 'bg-opacity-10'
              )}>
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-110 transition-colors"
              >
                <div className={cn('p-1.5 rounded-lg', colors.bg)}>
                  <span className={colors.text}>{section.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-200">{section.title}</h4>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', colors.bg, colors.text)}>
                      {section.chapters.length} 模块
                    </span>
                    {section.subSkills.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-400">
                        {section.subSkills.length} 操作技能
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{section.summary}</p>
                </div>
                <ChevronDown size={16} className={cn(
                  'text-slate-500 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )} />
              </button>

              {/* Chapters */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {section.chapters.map((chapter, ci) => {
                    const chapterKey = `${section.id}-${ci}`;
                    const chapterExpanded = !!expandedChapters[chapterKey];

                    return (
                      <div key={chapterKey}
                        className="rounded-lg bg-slate-900/50 border border-slate-700/50 overflow-hidden">
                        <button
                          onClick={() => toggleChapter(chapterKey)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/50 transition-colors"
                        >
                          <ChevronRight size={12} className={cn(
                            'text-slate-500 transition-transform duration-200 shrink-0',
                            chapterExpanded && 'rotate-90'
                          )} />
                          <span className="text-xs font-medium text-slate-300">{chapter.label}</span>
                          <span className="text-[10px] text-slate-600 ml-auto">{chapter.items.length} 条</span>
                        </button>

                        {chapterExpanded && (
                          <div className="px-4 pb-3 pt-1 space-y-1.5">
                            {chapter.items.map((item, ii) => (
                              <div key={ii} className="flex items-start gap-2">
                                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', colors.dot)} />
                                <p className="text-xs text-slate-400 leading-relaxed">{item}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 细分操作技能（可直接操作网站） */}
                  {section.subSkills.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap size={12} className="text-amber-400" />
                        <span className="text-[11px] font-semibold text-amber-400">操作技能</span>
                        <span className="text-[10px] text-slate-600">— 直接对网站执行读写操作</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {section.subSkills.map((ss) => (
                          <div key={ss.id}
                            className="rounded-lg bg-slate-800/60 border border-slate-700/40 px-3 py-2 hover:border-amber-500/40 hover:bg-slate-800/80 transition-all cursor-pointer group"
                            title={`触发词: ${ss.trigger}`}>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="text-xs font-medium text-slate-200 group-hover:text-amber-300 transition-colors">
                                {ss.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{ss.desc}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 italic">{ss.trigger}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 pt-2">
        知识来源: ink-flow-manager/seo-knowledge/ (199个文件) | Skills: ~/.workbuddy/skills/seo-*/
        <br />
        6 个知识型技能 + 15 个操作型技能 · 新知识入库后自动拆入对应技能维度
      </div>
    </div>
  );
}
