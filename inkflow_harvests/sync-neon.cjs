const Database = require('better-sqlite3');
const db = new Database('data/deep_scan_tasks.db');
const https = require('https');

const NEON_URL = process.env.NEON_DATABASE_URL || require('fs').readFileSync('.env','utf8').match(/NEON_DATABASE_URL=(.+)/)?.[1];
if (!NEON_URL) { console.error('NEON_DATABASE_URL not found'); process.exit(1); }

const rows = db.prepare("SELECT bot_id, COALESCE(artist_handle,'') as ah, mode, created_at FROM bot_observations ORDER BY id DESC LIMIT 5000").all();

const m = NEON_URL.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
const basic = Buffer.from(`${m[1]}:${m[2]}`).toString('base64');
const host = m[3];

let synced = 0;
(async () => {
  for (const r of rows) {
    const q = `INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES ($1, $2, $3, $4)`;
    const params = [r.bot_id, r.ah || null, r.mode, r.created_at];
    const body = JSON.stringify({query: q, params});
    await new Promise((ok, fail) => {
      const req = https.request({hostname: host, path: '/v2/query', method: 'POST', headers: {'Content-Type':'application/json','Authorization':`Basic ${basic}`,'Content-Length':Buffer.byteLength(body)}}, res => { let d=''; res.on('data',c=>d+=c); res.on('end',() => { if (res.statusCode < 300) ok(); else fail(d); }); });
      req.write(body); req.end();
    });
    synced++;
    if (synced % 100 === 0) console.log(`进度: ${synced}/${rows.length}`);
  }
  console.log(`同步完成! ${synced} 条`);
})().catch(e => console.error('失败:', e.message));
