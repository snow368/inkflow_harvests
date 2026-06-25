const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const url = fs.readFileSync('.env','utf8').split('\n').find(l=>l.startsWith('NEON_DATABASE_URL=')).split('=').slice(1).join('=');
const sql = neon(url);

(async () => {
  const rows = await sql`SELECT id, bot_id, artist_handle, mode FROM bot_observations ORDER BY id DESC LIMIT 3`;
  console.log(JSON.stringify(rows, null, 2));
})().catch(e => console.error('失败:', e.message));
