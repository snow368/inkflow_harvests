// server.mjs — 知识入库提交入口（本地零依赖 HTTP 服务）
// 运行：node server.mjs   然后浏览器开 http://localhost:8787
// 环境变量见 classify.mjs（GEMINI_API_KEY / GEMINI_ENDPOINT / GEMINI_MODEL）

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ingest } from "./ingest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.INTAKE_PORT || 8787;
const LOG_FILE = path.join(__dirname, "routing-log.jsonl");
const TAXONOMY = JSON.parse(fs.readFileSync(path.join(__dirname, "taxonomy.json"), "utf-8"));

function readBody(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => {
      try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); }
    });
  });
}
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}
function recent(n = 20) {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, "utf-8").split("\n").filter(Boolean);
  return lines.slice(-n).reverse().map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/") {
    const html = fs.readFileSync(path.join(__dirname, "portal.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(html);
  }
  if (req.method === "GET" && url.pathname === "/api/taxonomy") {
    return json(res, 200, TAXONOMY);
  }
  if (req.method === "GET" && url.pathname === "/api/recent") {
    return json(res, 200, { items: recent(20) });
  }
  if (req.method === "POST" && (url.pathname === "/api/preview" || url.pathname === "/api/ingest")) {
    const b = await readBody(req);
    if (!b.text || !b.text.trim()) return json(res, 400, { error: "空输入" });
    const opts = {
      sourceUrl: b.sourceUrl || null,
      kbHint: b.kbHint || null,
      platformHint: b.platformHint || null,
      dimHint: b.dimHint || null,
      dryRun: url.pathname === "/api/preview",
    };
    try {
      const r = await ingest(b.text, opts);
      return json(res, 200, r);
    } catch (e) {
      return json(res, 500, { error: e.message || String(e) });
    }
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`\n📥 知识入库提交入口已启动`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   分类引擎：${process.env.GEMINI_API_KEY ? "Gemini（LLM）" : "规则兜底（未设 GEMINI_API_KEY）"}`);
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_ENDPOINT) {
    console.log(`   ⚠️ 未设 GEMINI_ENDPOINT，将直连 Google（国内可能被墙）。建议设为你的 CF Worker 代理。`);
  }
  console.log("");
});
