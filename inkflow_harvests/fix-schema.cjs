const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const url = fs.readFileSync('.env','utf8').split('\n').find(l=>l.startsWith('NEON_DATABASE_URL=')).split('=').slice(1).join('=');
const sql = neon(url);

(async () => {
  // 看看当前表结构
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='bot_observations'`;
  console.log('当前列:', cols.map(c=>c.column_name).join(', '));

  // bot_observations 表可能之前被云 API 创建了不同的结构，重建
  await sql`DROP TABLE IF EXISTS bot_observations`;
  await sql`CREATE TABLE bot_observations (id SERIAL PRIMARY KEY, bot_id TEXT NOT NULL, artist_handle TEXT, mode TEXT NOT NULL, created_at BIGINT NOT NULL)`;
  console.log('表已重建');
})().catch(e => console.error('失败:', e.message));
