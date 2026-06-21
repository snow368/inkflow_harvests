import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_recAJm30vOWR@ep-patient-hill-antvzk6p.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const state = process.argv[2] || 'OR';
  const rows = await sql.query('SELECT ig_handle, shop_name, city FROM artists WHERE state = @0 AND ig_handle IS NOT NULL AND ig_handle != @1', [state, '']);
  console.log('原始:', rows.length);

  const extr = (h: string) => String(h||'').replace(/^@/,'').replace(/^https?:\/\/(www\.)?instagram\.com\//,'').replace(/\/$/,'').trim().toLowerCase();
  const valid = (h: string) => h && h.length >= 2 && h.length <= 30 && /^[a-zA-Z0-9._]+$/.test(h) && !/^\d+$/.test(h) && h !== 'n/a' && h !== 'na';

  const seen = new Set<string>();
  const handles: string[] = [];
  for (const r of rows) {
    const h = extr(r.ig_handle);
    if (!valid(h) || seen.has(h)) continue;
    seen.add(h);
    handles.push(h);
  }
  console.log('有效:', handles.length, '过滤掉:', rows.length - handles.length);

  if (!handles.length) return;

  const now = Date.now();
  let ok = 0, skip = 0;
  for (const h of handles) {
    const id = 'bulk_' + h + '_' + now;
    const payload = JSON.stringify({ id, taskType: 'ig_outreach', botId: 'bot_ig_01', artistHandle: h, source: 'bulk', state, scheduledAt: new Date().toISOString() });
    try {
      await sql.query('INSERT INTO automation_tasks(id,payload,status,run_at,attempts,max_attempts,created_at,updated_at) VALUES(@0,@1::jsonb,@2,@3,@4,@5,@6,@7) ON CONFLICT(id) DO NOTHING', [id, payload, 'pending', now + Math.floor(Math.random()*60000), 0, 3, now, now]);
      ok++;
    } catch { skip++; }
  }
  console.log('已创建:', ok, '| 跳过:', skip);
}
main().catch(e => console.error('Error:', e.message));
