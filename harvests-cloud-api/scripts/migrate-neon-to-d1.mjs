// 迁移 Neon `artists` 表 → Cloudflare D1 (SQLite)
// 仅在 Neon 配额恢复后运行（当前 402 状态连不上）。
//
// 用法：
//   NEON_DATABASE_URL=postgres://user:pass@host/db node scripts/migrate-neon-to-d1.mjs
//   → 生成 scripts/artists-import.sql
//   → 再执行： wrangler d1 execute harvests-db --remote --file=scripts/artists-import.sql
//
// 说明：D1 的 artists 表已由 cloud-api 运行时 ensureD1Tables 建好（空表）。
//       本脚本只负责把 Neon 里的生产数据导出灌入，artists 表为空故无 PK 冲突。

const connStr = process.env.NEON_DATABASE_URL;
if (!connStr) { console.error('NEON_DATABASE_URL not set'); process.exit(1); }
const m = connStr.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
if (!m) { console.error('bad NEON_DATABASE_URL'); process.exit(1); }
const [, user, pass, host] = m;

const COLS = ['id','shop_name','ig_handle','city','state','import_region','phone','website','email',
  'rating','followers','reviews','following','post_count','bio','category','full_name',
  'address','profile_pic','conversion_score','country'];

async function neonSql(query) {
  const resp = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'neon-connection-string': connStr.replace(/\?.*$/, '') },
    body: JSON.stringify({ query })
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`Neon ${resp.status}: ${t.slice(0, 200)}`); }
  const data = await resp.json();
  return data.rows || [];
}

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

(async () => {
  const rows = await neonSql(`SELECT ${COLS.join(', ')} FROM artists`);
  let sql = '';
  for (const r of rows) {
    const vals = COLS.map((c) => esc(r[c]));
    sql += `INSERT INTO artists (${COLS.join(', ')}) VALUES (${vals.join(', ')});\n`;
  }
  const fs = await import('node:fs');
  const out = new URL('./artists-import.sql', import.meta.url);
  fs.writeFileSync(out, sql);
  console.log(`Exported ${rows.length} artists → ${out.pathname}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
