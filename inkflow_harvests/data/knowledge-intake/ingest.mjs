// ingest.mjs — 路由落库：分类结果 → 写结构化 md → 去重 → 更新索引/日志 → 驱动 SKILL 促成
// 零依赖，Node 18+。被 server.mjs 调用，也可 CLI 单条投喂。
//
// 导出：ingest(text, opts) -> { status, path, classification, skillPromoted }
//   opts: { sourceUrl, platformHint, dimHint, kbHint, dryRun }

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { classify } from "./classify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARVESTS_DATA = path.resolve(__dirname, ".."); // inkflow_harvests/data
const TAXONOMY = JSON.parse(fs.readFileSync(path.join(__dirname, "taxonomy.json"), "utf-8"));

const LOG_FILE = path.join(__dirname, "routing-log.jsonl");
const REGISTRY_FILE = path.join(__dirname, "skills-registry.json");
const SKILLS_TODO = path.join(__dirname, "skills-todo.md");

// ---------- 工具 ----------
function fingerprint(text) {
  return crypto.createHash("sha256").update(text.trim().replace(/\s+/g, " ")).digest("hex").slice(0, 12);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function slugify(title, fp) {
  const ascii = (title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return ascii && ascii.length >= 3 ? `${ascii.slice(0, 40)}-${fp.slice(0, 6)}` : `note-${fp}`;
}

// ---------- 目标路径 ----------
function targetDir(c) {
  const kb = TAXONOMY.kbs[c.kb];
  // intake_dir 形如 "seo-knowledge/sources/_intake"，HARVESTS_DATA = inkflow_harvests/data
  const full = path.join(HARVESTS_DATA, kb.intake_dir);
  const bucket = c.kb === "social" ? c.platform : c.dimension;
  return path.join(full, bucket);
}

// ---------- 去重 ----------
function isDuplicate(fp) {
  if (!fs.existsSync(LOG_FILE)) return false;
  const lines = fs.readFileSync(LOG_FILE, "utf-8").split("\n").filter(Boolean);
  return lines.some((l) => {
    try { return JSON.parse(l).id === fp; } catch { return false; }
  });
}

// ---------- 写条目 md ----------
function writeEntry(dir, fp, c, text, sourceUrl) {
  fs.mkdirSync(dir, { recursive: true });
  const slug = slugify(c.title, fp);
  const file = path.join(dir, `${today()}-${slug}.md`);
  const fm = [
    "---",
    `id: ${fp}`,
    `date: ${today()}`,
    `kb: ${c.kb}`,
    `dimension: ${c.dimension}`,
    `platform: ${c.platform || "-"}`,
    `category: ${JSON.stringify(c.category || "")}`,
    `tags: [${(c.tags || []).map((t) => JSON.stringify(t)).join(", ")}]`,
    `confidence: ${c.confidence}`,
    `engine: ${c.engine}`,
    `status: raw`,
    `source_url: ${sourceUrl || "-"}`,
    "---",
    "",
    `# ${c.title}`,
    "",
    `> 分类依据：${c.reason || "-"}${c.needsReview ? "  ⚠️ 低置信度，待人工复核" : ""}`,
    "",
    "## 核心提炼",
    c.summary || "(待补)",
    "",
    "## 原文",
    text.trim(),
    "",
    "## 学 → 用（闭环，逐步补）",
    "- [ ] 已提炼成规则/清单：",
    "- [ ] 已应用到页面/审计/外链：",
    "- [ ] 已沉淀为 SKILL：",
    "",
  ].join("\n");
  fs.writeFileSync(file, fm, "utf-8");
  return file;
}

// ---------- 追加路由日志 ----------
function appendLog(rec) {
  fs.appendFileSync(LOG_FILE, JSON.stringify(rec) + "\n", "utf-8");
}

// ---------- 更新每库 _intake/index.md 计数 ----------
function rebuildIntakeIndex(kb) {
  const root = path.join(HARVESTS_DATA, TAXONOMY.kbs[kb].intake_dir);
  if (!fs.existsSync(root)) return;
  const buckets = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  let total = 0;
  const rows = [];
  for (const b of buckets.sort((a, z) => a.name.localeCompare(z.name))) {
    const files = fs.readdirSync(path.join(root, b.name)).filter((f) => f.endsWith(".md"));
    total += files.length;
    rows.push(`| \`${b.name}/\` | ${files.length} |`);
  }
  const axisLabel = kb === "social" ? "平台" : "维度";
  const md = [
    `# ${TAXONOMY.kbs[kb].label} — 自动入库索引 (_intake)`,
    "",
    `> 由 \`knowledge-intake/ingest.mjs\` 自动维护，请勿手改。最后更新 ${today()}。`,
    `> 这是**投喂自动分流**进来的原料，与人工策划的 \`sources/\` 主库并列。`,
    "",
    `**总计：${total} 条**`,
    "",
    `| ${axisLabel}桶 | 条数 |`,
    "|---|---|",
    ...rows,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(root, "index.md"), md, "utf-8");
  return total;
}

// ---------- SKILL 促成 ----------
function loadRegistry() {
  if (fs.existsSync(REGISTRY_FILE)) return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"));
  return { version: "1.0.0", threshold: TAXONOMY.skill_promotion.threshold, buckets: {}, promoted: [] };
}
function promoteSkill(c) {
  const reg = loadRegistry();
  const key = c.kb === "social" ? `${c.kb}/${c.platform}/${c.dimension}` : `${c.kb}/${c.dimension}`;
  reg.buckets[key] = (reg.buckets[key] || 0) + 1;
  let promoted = null;
  const threshold = reg.threshold || 5;
  if (reg.buckets[key] >= threshold) {
    const dimLabel = TAXONOMY.kbs[c.kb].dimensions[c.dimension].label;
    const platLabel = c.platform ? TAXONOMY.kbs.social.platforms[c.platform].label : "";
    const candidate = {
      key,
      label: `${platLabel ? platLabel + " · " : ""}${dimLabel} 实操技能`,
      count_at_promotion: reg.buckets[key],
      date: today(),
      status: "candidate",
    };
    reg.promoted.push(candidate);
    reg.buckets[key] = 0; // 清零，继续累积可促成进阶技能
    promoted = candidate;
    // 追加 skills-todo.md
    const line = `- [ ] **${candidate.label}** （桶 \`${key}\`，累积 ${candidate.count_at_promotion} 条触发，${today()}）→ 待把这批条目提炼成一个可执行 SKILL\n`;
    if (!fs.existsSync(SKILLS_TODO)) {
      fs.writeFileSync(SKILLS_TODO, `# SKILL 待建清单（自动触发）\n\n> 每个桶累积到 ${threshold} 条自动触发一个候选。逐条把原料提炼成可执行技能。\n\n`, "utf-8");
    }
    fs.appendFileSync(SKILLS_TODO, line, "utf-8");
  }
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(reg, null, 2), "utf-8");
  return promoted;
}

// ---------- 主入口 ----------
export async function ingest(text, opts = {}) {
  const fp = fingerprint(text);
  if (isDuplicate(fp)) {
    return { status: "duplicate", id: fp, message: "该知识已入库（指纹重复），跳过" };
  }
  const c = await classify(text, opts);

  if (opts.dryRun) {
    return { status: "preview", id: fp, classification: c };
  }

  const dir = targetDir(c);
  const file = writeEntry(dir, fp, c, text, opts.sourceUrl);
  const rel = path.relative(HARVESTS_DATA, file).replace(/\\/g, "/");
  appendLog({
    id: fp, date: new Date().toISOString(), kb: c.kb, dimension: c.dimension,
    platform: c.platform, confidence: c.confidence, engine: c.engine,
    needsReview: !!c.needsReview, file: rel, source_url: opts.sourceUrl || null,
  });
  const total = rebuildIntakeIndex(c.kb);
  const skillPromoted = promoteSkill(c);

  return {
    status: "ingested",
    id: fp,
    classification: c,
    file: rel,
    bucketTotalInKb: total,
    skillPromoted,
  };
}

// CLI: node ingest.mjs "知识文本" [sourceUrl]
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("ingest.mjs")) {
  const text = process.argv[2];
  const url = process.argv[3];
  if (text) {
    ingest(text, { sourceUrl: url }).then((r) => console.log(JSON.stringify(r, null, 2)));
  } else {
    console.log('用法: node ingest.mjs "知识文本" [来源URL]');
  }
}
