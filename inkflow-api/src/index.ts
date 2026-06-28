import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon } from '@neondatabase/serverless'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()
app.use('/*', cors())

// ── Health (no auth) ──
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// ── Home ──
app.get('/', (c) => c.text('InkFlow API is running'))

// ── Bot Registration & Heartbeat ──
app.post('/api/bot/register', async (c) => {
  if (!requireBotAuth(c)) return c.json({ error: 'unauthorized' }, 401)
  const sql = neon(c.env.DATABASE_URL)
  const { botId, host, version, profile } = await c.req.json()
  const now = Date.now()
  await sql`
    INSERT INTO bot_instances (id, host, version, profile, online, last_seen_at, created_at)
    VALUES (${botId}, ${host || ''}, ${version || ''}, ${profile ? JSON.stringify(profile) : null}, 1, ${now}, ${now})
    ON CONFLICT (id) DO UPDATE SET online = 1, last_seen_at = ${now}, host = ${host || ''}
  `
  return c.json({ ok: true })
})

app.post('/api/bot/heartbeat', async (c) => {
  if (!requireBotAuth(c)) return c.json({ error: 'unauthorized' }, 401)
  const sql = neon(c.env.DATABASE_URL)
  const { botId } = await c.req.json()
  await sql`UPDATE bot_instances SET last_seen_at = ${Date.now()} WHERE id = ${botId}`
  return c.json({ ok: true })
})

app.get('/api/bot/online', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const rows = await sql`
    SELECT id, host, version, online, last_seen_at, created_at
    FROM bot_instances
    ORDER BY last_seen_at DESC
  `
  return c.json({ bots: rows })
})

// ── Task Polling (core: supply_analysis, ig_outreach) ──
app.get('/api/automation/poll', async (c) => {
  if (!requireBotAuth(c)) return c.json({ error: 'unauthorized' }, 401)
  const sql = neon(c.env.DATABASE_URL)
  const botId = c.req.query('botId') || ''
  const limitRaw = Number(c.req.query('limit'))
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(50, Math.floor(limitRaw)) : 10
  const taskType = (c.req.query('taskType') || '').trim()

  // Check bot is online
  const [bot] = await sql`SELECT online FROM bot_instances WHERE id = ${botId}`
  if (!bot) return c.json({ error: 'Bot not registered' }, 404)
  if (!bot.online) return c.json({ error: 'Bot is offline. Send heartbeat first.' }, 409)

  // Recycle expired leases
  await sql`
    UPDATE automation_tasks
    SET status = 'pending', leased_by = NULL, lease_until = NULL
    WHERE status = 'leased' AND lease_until < ${Date.now()}
  `

  // Mark stale duplicates as done (7-day dedup)
  const dedupWindow = Date.now() - 7 * 24 * 60 * 60 * 1000
  await sql`
    UPDATE automation_tasks
    SET status = 'done', updated_at = ${Date.now()}
    WHERE status = 'pending'
      AND EXISTS (
        SELECT 1 FROM automation_tasks d
        WHERE d.status = 'done'
          AND d.payload->>'artistHandle' = automation_tasks.payload->>'artistHandle'
          AND d.payload->>'artistHandle' IS NOT NULL
          AND d.updated_at > ${dedupWindow}
      )
  `

  // Claim tasks
  const leaseTime = Date.now()
  const leaseDuration = 5 * 60 * 1000 // 5 min
  const candidates = await (taskType === 'supply_analysis'
    ? sql`
      SELECT id, payload
      FROM automation_tasks
      WHERE status = 'pending' AND run_at <= ${leaseTime} AND payload->>'taskType' = 'supply_analysis'
      ORDER BY run_at ASC
      LIMIT ${limit}
    `
    : taskType === 'ig_outreach'
    ? sql`
      SELECT id, payload
      FROM automation_tasks
      WHERE status = 'pending' AND run_at <= ${leaseTime} AND (payload->>'taskType' IS NULL OR payload->>'taskType' = 'ig_outreach')
      ORDER BY run_at ASC
      LIMIT ${limit}
    `
    : taskType
    ? sql`
      SELECT id, payload
      FROM automation_tasks
      WHERE status = 'pending' AND run_at <= ${leaseTime} AND payload->>'taskType' = ${taskType}
      ORDER BY run_at ASC
      LIMIT ${limit}
    `
    : sql`
      SELECT id, payload
      FROM automation_tasks
      WHERE status = 'pending' AND run_at <= ${leaseTime}
      ORDER BY run_at ASC
      LIMIT ${limit}
    `
  )

  const leased: any[] = []
  for (const row of candidates) {
    await sql`
      UPDATE automation_tasks
      SET status = 'leased', leased_by = ${botId}, lease_until = ${leaseTime + leaseDuration}, updated_at = ${leaseTime}
      WHERE id = ${row.id} AND status = 'pending'
    `
    leased.push({ id: row.id, ...JSON.parse(row.payload as string) })
  }

  return c.json({ commands: leased })
})

// ── Task Report ──
app.post('/api/automation/report', async (c) => {
  if (!requireBotAuth(c)) return c.json({ error: 'unauthorized' }, 401)
  const sql = neon(c.env.DATABASE_URL)
  const { commandId, status, errorReason } = await c.req.json()
  const now = Date.now()
  await sql`
    UPDATE automation_tasks
    SET status = ${status}, error_reason = ${errorReason || null}, updated_at = ${now}
    WHERE id = ${commandId}
  `
  return c.json({ ok: true })
})

// ── Generate Tasks from Competitors ──
app.post('/api/automation/generate-from-competitors', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const body = await c.req.json() as Record<string, unknown>
  const accountType = body.accountType as string | undefined
  const limitRaw = Number(body.limit ?? 24)
  const handlesRaw = body.handles as string[] | undefined
  const safeLimit = Math.min(50, Math.max(1, limitRaw))

  let competitors
  if (Array.isArray(handlesRaw) && handlesRaw.length > 0) {
    // Manual mode: only selected handles
    competitors = await sql`
      SELECT * FROM content_competitors
      WHERE ig_handle = ANY(${handlesRaw.map((h: string) => h.replace(/^@/, '').trim().toLowerCase())})
      ORDER BY priority ASC, updated_at ASC
    `
  } else if (accountType) {
    competitors = await sql`
      SELECT * FROM content_competitors
      WHERE account_type = ${accountType}
      ORDER BY priority ASC, updated_at ASC
      LIMIT ${safeLimit}
    `
  } else {
    competitors = await sql`
      SELECT * FROM content_competitors
      ORDER BY priority ASC, updated_at ASC
      LIMIT ${safeLimit}
    `
  }

  const now = Date.now()
  let created = 0, skipped = 0

  for (const comp of competitors) {
    const artistHandle = comp.ig_handle?.replace(/^@/, '').trim()
    if (!artistHandle) { skipped++; continue }

    // Check 7-day dedup
    const dedupWindow = now - 7 * 24 * 60 * 60 * 1000
    const [existing] = await sql`
      SELECT 1 FROM automation_tasks
      WHERE status = 'done'
        AND payload->>'artistHandle' = ${artistHandle}
        AND updated_at > ${dedupWindow}
      LIMIT 1
    `
    if (existing) { skipped++; continue }

    const id = `task_${now}_${artistHandle}_${Math.random().toString(36).slice(2, 6)}`
    const payload = {
      id,
      artistHandle,
      accountType: comp.account_type || accountType || 'supply_brand',
      taskType: 'supply_analysis',
      competitorSource: comp.source || '',
      competitorNotes: comp.notes || '',
    }

    await sql`
      INSERT INTO automation_tasks (id, payload, status, run_at, attempts, max_attempts, created_at, updated_at)
      VALUES (${id}, ${JSON.stringify(payload)}, 'pending', ${now}, 0, 3, ${now}, ${now})
    `
    created++
  }

  return c.json({
    ok: true, accountType: accountType || 'all', total: competitors.length,
    created, skipped, manual: Array.isArray(handlesRaw),
    competitors: competitors.slice(0, 5).map((c: any) => c.ig_handle)
  })
})

// ── Task List ──
app.get('/api/automation/tasks', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const status = (c.req.query('status') || '').trim()
  const limit = Math.min(200, Number(c.req.query('limit')) || 50)

  const statusFilter = status ? sql`WHERE status = ${status}` : sql``
  const rows = await sql`
    SELECT id, payload, status, run_at, leased_by, attempts, error_reason, created_at, updated_at
    FROM automation_tasks ${statusFilter}
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `
  return c.json(rows.map(normalizeTask))
})

// ── Task Stats ──
app.get('/api/automation/stats', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const rows = await sql`
    SELECT status, COUNT(*) as count
    FROM automation_tasks
    GROUP BY status
  `
  const counts: Record<string, number> = { pending: 0, leased: 0, running: 0, done: 0, failed: 0 }
  for (const r of rows) counts[r.status] = Number(r.count)
  return c.json(counts)
})

// ── Observations ──
app.post('/api/bot/observe', async (c) => {
  if (!requireBotAuth(c)) return c.json({ error: 'unauthorized' }, 401)
  const sql = neon(c.env.DATABASE_URL)
  const { commandId, handle, summary, facts } = await c.req.json()
  const now = Date.now()
  await sql`
    INSERT INTO bot_observations (command_id, handle, summary, facts, created_at)
    VALUES (${commandId}, ${handle}, ${JSON.stringify(summary)}, ${facts ? JSON.stringify(facts) : null}, ${now})
  `
  // Mark task done
  if (commandId) {
    await sql`
      UPDATE automation_tasks SET status = 'done', updated_at = ${now} WHERE id = ${commandId}
    `
  }
  return c.json({ ok: true })
})

app.get('/api/bot/observations', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const limit = Math.min(200, Number(c.req.query('limit')) || 50)
  const rows = await sql`
    SELECT o.*, t.payload->>'accountType' as account_type
    FROM bot_observations o
    LEFT JOIN automation_tasks t ON t.id = o.command_id
    ORDER BY o.created_at DESC
    LIMIT ${limit}
  `
  return c.json(rows)
})

// ── Competitors ──
app.get('/api/content/competitors', async (c) => {
  const sql = neon(c.env.DATABASE_URL)
  const rows = await sql`
    SELECT * FROM content_competitors ORDER BY priority ASC, ig_handle ASC
  `
  return c.json(rows)
})

// ── Auth ──
function requireBotAuth(c: any): boolean {
  const key = c.req.header('x-bot-key') || ''
  return key === c.env.BOT_API_KEY
}

export default app

// ── Proxy: forward missing endpoints to harvests-cloud-api ──
// (frontend still calls harvests-api — these make it work without redeploy)
const CLOUD_API = 'https://harvests-cloud-api.inkflowapp.workers.dev';

app.get('/api/automation/task-counts', async (c) => {
  const resp = await fetch(`${CLOUD_API}/api/automation/task-counts`);
  return c.json(await resp.json());
});
app.get('/api/automation/task-counts-debug', async (c) => {
  const resp = await fetch(`${CLOUD_API}/api/automation/task-counts-debug`);
  return c.json(await resp.json());
});
app.get('/api/automation/artists', async (c) => {
  const qs = c.req.raw.url?.includes('?') ? c.req.raw.url.split('?')[1] : '';
  const resp = await fetch(`${CLOUD_API}/api/automation/artists${qs ? '?' + qs : ''}`);
  return c.json(await resp.json());
});
app.post('/api/automation/tasks/create-from-artists', async (c) => {
  const body = await c.req.json();
  const resp = await fetch(`${CLOUD_API}/api/automation/tasks/create-from-artists`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return c.json(await resp.json());
});
app.get('/api/automation/dashboard', async (c) => {
  const resp = await fetch(`${CLOUD_API}/api/automation/dashboard`);
  return c.json(await resp.json());
});
app.get('/api/automation/state-progress', async (c) => {
  const resp = await fetch(`${CLOUD_API}/api/automation/state-progress`);
  return c.json(await resp.json());
});
app.post('/api/automation/tasks/inject', async (c) => {
  const body = await c.req.json();
  const resp = await fetch(`${CLOUD_API}/api/automation/tasks/inject`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return c.json(await resp.json());
});
