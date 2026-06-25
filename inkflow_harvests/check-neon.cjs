const { neon } = require('@neondatabase/serverless');
const https = require('https');
const fs = require('fs');
const url = fs.readFileSync('.env','utf8').split('\n').find(l=>l.startsWith('NEON_DATABASE_URL=')).split('=').slice(1).join('=');
const sql = neon(url);

(async () => {
  // 1. 直查 Neon
  const rows = await sql`SELECT id, bot_id, COALESCE(artist_handle,'') as artist_handle, mode, created_at FROM bot_observations ORDER BY id DESC LIMIT 1`;
  console.log('=== Neon 直查 ===');
  console.log(JSON.stringify(rows, null, 2));

  // 2. 云 API 返回
  console.log('\n=== 云 API ===');
  const data = await new Promise((ok, fail) => {
    https.get('https://harvests-api.inkflowapp.workers.dev/api/automation/observations?limit=1', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>ok(JSON.parse(d))); });
  });
  console.log(JSON.stringify(data, null, 2));
})().catch(e => console.error('失败:', e.message));
