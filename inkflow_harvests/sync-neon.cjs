const Database = require('better-sqlite3');
const { neon } = require('@neondatabase/serverless');
const db = new Database('data/deep_scan_tasks.db');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const NEON_URL = envText.split('\n').find(l => l.startsWith('NEON_DATABASE_URL='))?.split('=').slice(1).join('=');
if (!NEON_URL) { console.error('NEON_DATABASE_URL not found'); process.exit(1); }

const rows = db.prepare("SELECT bot_id, COALESCE(artist_handle,'') as ah, mode, created_at, COALESCE(summary_json,'{}') as sj, COALESCE(profile_facts_json,'{}') as pf FROM bot_observations ORDER BY id DESC LIMIT 5000").all();
console.log(`读取 ${rows.length} 条观测数据`);

const sql = neon(NEON_URL);

(async () => {
  try { await sql`SELECT 1`; console.log('Neon 连接成功'); }
  catch (e) { console.error('Neon 连接失败:', e.message); process.exit(1); }

  try { await sql`DROP TABLE IF EXISTS bot_observations`; } catch {}
  try { await sql`CREATE TABLE bot_observations (id SERIAL PRIMARY KEY, bot_id TEXT NOT NULL, artist_handle TEXT, mode TEXT NOT NULL, summary_json TEXT DEFAULT '{}', profile_facts_json TEXT DEFAULT '{}', created_at BIGINT NOT NULL)`; console.log('表已重建'); } catch (e) { console.error('建表失败:', e.message); process.exit(1); }

  let synced = 0, errors = 0;
  for (const r of rows) {
    try {
      await sql`INSERT INTO bot_observations (bot_id, artist_handle, mode, summary_json, profile_facts_json, created_at) VALUES (${r.bot_id}, ${r.ah||null}, ${r.mode}, ${r.sj||'{}'}, ${r.pf||'{}'}, ${r.created_at})`;
      synced++;
    } catch (e) { errors++; if (errors===1) console.log('错误示例:', r.bot_id, e.message.slice(0,100)); }
    if ((synced + errors) % 100 === 0) console.log(`进度: ${synced}/${rows.length}`);
  }
  console.log(`同步完成! ${synced} 成功, ${errors} 失败`);
})().catch(e => console.error('脚本失败:', e.message));
