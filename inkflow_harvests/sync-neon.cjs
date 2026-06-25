const Database = require('better-sqlite3');
const db = new Database('data/deep_scan_tasks.db');
const https = require('https');
const fs = require('fs');

// 读取 .env
const envText = fs.readFileSync('.env', 'utf8');
const NEON_URL = envText.split('\n').find(l => l.startsWith('NEON_DATABASE_URL='))?.split('=').slice(1).join('=');
if (!NEON_URL) { console.error('NEON_DATABASE_URL not found in .env'); process.exit(1); }

const rows = db.prepare("SELECT bot_id, COALESCE(artist_handle,'') as ah, mode, created_at FROM bot_observations ORDER BY id DESC LIMIT 5000").all();
console.log(`读取 ${rows.length} 条观测数据，开始同步...`);

const m = NEON_URL.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
if (!m) { console.error('无法解析 NEON URL'); process.exit(1); }
const basic = Buffer.from(`${m[1]}:${m[2]}`).toString('base64');
const host = m[3];

function neonQuery(query, params) {
  return new Promise((ok, fail) => {
    const body = JSON.stringify({query, params: params || []});
    const req = https.request({hostname:host, path:'/v2/query', method:'POST', headers:{'Content-Type':'application/json','Authorization':`Basic ${basic}`,'Content-Length':Buffer.byteLength(body)}}, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>r.statusCode<300?ok(JSON.parse(d)):fail(new Error(d.slice(0,200)))); });
    req.write(body); req.end();
  });
}

(async () => {
  // 建表
  try { await neonQuery('CREATE TABLE IF NOT EXISTS bot_observations (id SERIAL PRIMARY KEY, bot_id TEXT NOT NULL, artist_handle TEXT, mode TEXT NOT NULL, created_at BIGINT NOT NULL)'); } catch {}
  try { await neonQuery('CREATE INDEX IF NOT EXISTS idx_bot_obs_created_at ON bot_observations(created_at DESC)'); } catch {}

  // 逐条插入
  let synced = 0, errors = 0;
  for (const r of rows) {
    try {
      await neonQuery('INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES ($1, $2, $3, $4)', [r.bot_id, r.ah||null, r.mode, r.created_at]);
      synced++;
    } catch (e) { errors++; if (errors === 1) console.log('错误示例:', r.bot_id, e.message || e); }
    if ((synced + errors) % 200 === 0) console.log(`进度: ${synced} 成功, ${errors} 失败 / ${rows.length}`);
  }
  console.log(`同步完成! ${synced} 成功, ${errors} 失败`);
})().catch(e => console.error('脚本失败:', e.message));
