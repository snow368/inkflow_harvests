const Database = require('better-sqlite3');
const db = new Database('data/deep_scan_tasks.db');
const rows = db.prepare("SELECT bot_id, COALESCE(artist_handle,'') as ah, mode, created_at FROM bot_observations ORDER BY id DESC LIMIT 5000").all();
const https = require('https');
const data = JSON.stringify({items: rows.map(r => ({botId: r.bot_id, artistHandle: r.ah, mode: r.mode, createdAt: r.created_at}))});
const req = https.request({
  hostname: 'harvests-api.inkflowapp.workers.dev',
  path: '/api/automation/observations',
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)}
}, r => { let b=''; r.on('data',c=>b+=c); r.on('end',() => console.log('同步结果:', b)); });
req.write(data);
req.end();
