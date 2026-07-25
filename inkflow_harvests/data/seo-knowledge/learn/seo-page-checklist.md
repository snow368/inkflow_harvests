# InkFlow 页面 SEO 检查清单（Pre-Build / Post-Build）

> 固化自 `site-content-seo-ruleset.md`（§3/5/7/8/9）+ 用户硬规则（Title=H1=第一段主词字面一致）+ Mehrab 委托式清单。
> 用法：每建/改一页，自上而下逐条打勾；**任一 🔴 项未过，不允许 build。**

---

## 🔴 第一档：关键词咬合（铁律，不对齐不许 build）

- [ ] **1. Title = H1 = 第一段主词，字面完全一致**（非语义一致）。Title 与 H1 含完全相同短语；第一段前两句自然带出完整主推词短语。
- [ ] **2. 一页一主词**，不换词、不塞两个主推词。
- [ ] **3. Title ≤ 60 字符且全站唯一**；Description ≤ 160 字符、含 1 次主词、写"用户能获得什么"。

## 🟠 第二档：标题层级（H2–H6）

- [ ] **4. 精确主词主场只在 Title/H1/第一段**；H2–H6 再重复精确主词 = 页内自蚕食 + 堆砌，禁止。
- [ ] **5. H2 = 把主词拆开讲**：最多 1 个 H2 自然带精确主词（定义/对比式），其余用长尾变体 + 角度词 + 相关实体展开。
- [ ] **6. H3–H6 无关键词配额**，只当 H2 下的细分结构（对比维度 / FAQ 子问 / 步骤）。
- [ ] **7. 全文主推词密度 < 3%**；长尾变体正文出现 3–6 次覆盖同义问法。

## 🟡 第三档：防蚕食（同义词簇差异化）

- [ ] **8. 同簇各页主词必须全分开**（如 tattoo-software 簇 13 页各自独立主词，见 `briefs/tattoo-software-cluster-brief.md`）。
- [ ] **9. 近义家族靠「角度隔离 + 强制互链」分流**（如预约家族 4 页 appointment-booking / scheduler / booking-app / scheduling-software）。
- [ ] **10. 建新页前核对是否已有近义根页抢词**（如已存在 `tattoo-appointment-scheduler.astro`），必要时做蚕食审计。

## 🟢 第四档：Schema & E-E-A-T（结构化数据必带）

- [ ] **11. 每页 SoftwareApplication + FAQPage Schema 各 1 份**。
- [ ] **12. FAQPage 必须实际渲染 `<FAQSchema questions={[...]} />`**（只 import 不渲染 = 漏）。
- [ ] **13. E-E-A-T**：命名作者 + 头衔 + bio 链接、审核者资质、2+ 真实引用源（不编造 URL）、发布 + 更新日期、第一手经验信号（工作室/产品数据）。

## 🔵 第五档：内链 & 流程

- [ ] **14. 每页 3–8 条同集群内链**，锚文本用主推词变体（Mehrab 清单第 2 项）；出链不超 15。
- [ ] **15. 建页不跳步**：SERP 调研 → gap 分析 → cluster brief（含每页结构）→ 按 brief 建页，**禁止硬填字数**。
- [ ] **16. 标 `[suggest verify]` 的待核数据必须刷新或删**；`lastUpdated` 改当日。

## ⚫ 第六档：技术 & 部署红线

- [ ] **17. Astro 根页 import 路径用 `../`**（非 `../../`），否则 build 失败。
- [ ] **18. 先 `npm run build` 本地验证再部署**；部署只 push **main**（绝不 master）。
- [ ] **19. git 安全**：`gsc-key.json` 等敏感文件不提交；`profiles/` 已 gitignore；精确实路径 add，绝不 `git add -A`。
- [ ] **20. 已收录页面 slug 绝不改**（改即丢权重）；新页一次做对。
- [ ] **21. consent-form-app / waiver-app 必须含「非法律建议」免责声明。**

---

### 附：Mehrab 委托式维护清单（周期性提权，来源 @mehrab_build）
1. 从 GSC 拉 Top 10 页面作维护队列
2. 每页加 3 条情境化内链（锚文本用主推词变体）
3. Meta Title 对齐精确目标词（= H1 = 主词）
4. 底部加 FAQ 块 + 注入 FAQPage Schema
5. 更新发布日期 + 刷新过时数据/案例
