import { Hono } from 'hono'
import { cors } from 'hono/cors'
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
  return c.json([])
})

// ── Auth ──
function requireBotAuth(c: any): boolean {
  const key = c.req.header('x-bot-key') || ''
  return key === c.env.BOT_API_KEY
}

export default app

// ── INK PASSPORT (EU REACH Compliance) ──

let _passportTableReady: Promise<void> | null = null;
const ensurePassportTable = (db: any): Promise<void> => {
  if (!_passportTableReady) {
    _passportTableReady = db.prepare(`CREATE TABLE IF NOT EXISTS ink_passports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL DEFAULT '',
      client_email TEXT DEFAULT '',
      artist_name TEXT NOT NULL DEFAULT '',
      session_date TEXT NOT NULL DEFAULT '',
      studio_name TEXT DEFAULT '',
      ink_brand TEXT NOT NULL DEFAULT '',
      ink_name TEXT DEFAULT '',
      ink_color TEXT DEFAULT '',
      batch_number TEXT DEFAULT '',
      expiration_date TEXT DEFAULT '',
      supplier TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      pdf_generated INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`).run().then(() => {}).catch(() => {});
  }
  return _passportTableReady;
};

let _brandPresetsReady: Promise<void> | null = null;
const ensureBrandPresetsTable = (db: any): Promise<void> => {
  if (!_brandPresetsReady) {
    _brandPresetsReady = db.prepare(`CREATE TABLE IF NOT EXISTS ink_brand_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_name TEXT NOT NULL UNIQUE,
      colors TEXT NOT NULL DEFAULT '[]',
      region TEXT DEFAULT '',
      supplier TEXT DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`).run().then(() => {}).catch(() => {});
  }
  return _brandPresetsReady;
};

// List passports
app.get('/api/ink-passport/list', async (c) => {
  const db = c.env.INKFLOW_DB
  await ensurePassportTable(db)
  const page = Math.max(1, parseInt(c.req.query('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')))
  const offset = (page - 1) * limit
  const search = c.req.query('search') || ''
  let sql = 'SELECT * FROM ink_passports WHERE 1=1'
  const binds: any[] = []
  if (search) {
    sql += " AND (client_name LIKE ? OR artist_name LIKE ? OR ink_brand LIKE ? OR batch_number LIKE ? OR studio_name LIKE ?)"
    const q = `%${search}%`
    binds.push(q, q, q, q, q)
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  binds.push(limit, offset)
  const rows = await db.prepare(sql).bind(...binds).all()
  const total = await db.prepare('SELECT COUNT(*) as c FROM ink_passports').first() as any
  return c.json({ ok: true, items: rows.results || [], total: total?.c || 0, page, limit })
})

// Stats
app.get('/api/ink-passport/stats', async (c) => {
  const db = c.env.INKFLOW_DB
  await ensurePassportTable(db)
  const total = await db.prepare('SELECT COUNT(*) as c FROM ink_passports').first() as any
  const withPdf = await db.prepare("SELECT COUNT(*) as c FROM ink_passports WHERE pdf_generated=1").first() as any
  const recent = await db.prepare("SELECT COUNT(*) as c FROM ink_passports WHERE session_date >= date('now', '-30 days')").first() as any
  return c.json({ ok: true, stats: { total: total?.c || 0, withPdf: withPdf?.c || 0, recent30d: recent?.c || 0 } })
})

// Brands list
app.get('/api/ink-passport/brands', async (c) => {
  const db = c.env.INKFLOW_DB
  await ensureBrandPresetsTable(db)
  const rows = await db.prepare('SELECT * FROM ink_brand_presets ORDER BY brand_name ASC').all()
  return c.json({ ok: true, brands: rows.results || [] })
})

// Create passport
app.post('/api/ink-passport', async (c) => {
  const db = c.env.INKFLOW_DB
  const body = await c.req.json()
  const { client_name, client_email, artist_name, session_date, studio_name, ink_brand, ink_name, ink_color, batch_number, expiration_date, supplier, notes } = body
  if (!client_name || !artist_name || !session_date || !ink_brand) {
    return c.json({ error: 'client_name, artist_name, session_date, ink_brand required' }, 400)
  }
  await ensurePassportTable(db)
  const now = Math.floor(Date.now() / 1000)
  await db.prepare(`INSERT INTO ink_passports (client_name, client_email, artist_name, session_date, studio_name, ink_brand, ink_name, ink_color, batch_number, expiration_date, supplier, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(client_name, client_email||'', artist_name, session_date, studio_name||'', ink_brand, ink_name||'', ink_color||'', batch_number||'', expiration_date||'', supplier||'', notes||'', now, now).run()
  return c.json({ ok: true })
})

// Get single passport
app.get('/api/ink-passport/:id', async (c) => {
  const db = c.env.INKFLOW_DB
  await ensurePassportTable(db)
  const row = await db.prepare('SELECT * FROM ink_passports WHERE id = ?').bind(c.req.param('id')).first()
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json({ ok: true, item: row })
})

// Update passport
app.put('/api/ink-passport/:id', async (c) => {
  const db = c.env.INKFLOW_DB
  const body = await c.req.json()
  await ensurePassportTable(db)
  const now = Math.floor(Date.now() / 1000)
  const sets: string[] = []; const vals: any[] = []
  const fields = ['client_name','client_email','artist_name','session_date','studio_name','ink_brand','ink_name','ink_color','batch_number','expiration_date','supplier','notes','pdf_generated']
  for (const f of fields) { if (body[f] !== undefined) { sets.push(`${f}=?`); vals.push(body[f]) } }
  if (!sets.length) return c.json({ error: 'no fields to update' }, 400)
  sets.push('updated_at=?'); vals.push(now)
  vals.push(c.req.param('id'))
  await db.prepare(`UPDATE ink_passports SET ${sets.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ ok: true })
})

// Delete passport
app.delete('/api/ink-passport/:id', async (c) => {
  const db = c.env.INKFLOW_DB
  await ensurePassportTable(db)
  await db.prepare('DELETE FROM ink_passports WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// Add brand preset
app.post('/api/ink-passport/brands', async (c) => {
  const db = c.env.INKFLOW_DB
  const { brand_name, colors, region, supplier } = await c.req.json()
  if (!brand_name) return c.json({ error: 'brand_name required' }, 400)
  await ensureBrandPresetsTable(db)
  try {
    await db.prepare('INSERT INTO ink_brand_presets (brand_name, colors, region, supplier) VALUES (?,?,?,?)')
      .bind(brand_name, JSON.stringify(colors||[]), region||'', supplier||'').run()
    return c.json({ ok: true })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'brand already exists' }, 409)
    throw e
  }
})

// Delete brand preset
app.delete('/api/ink-passport/brands/:id', async (c) => {
  const db = c.env.INKFLOW_DB
  await ensureBrandPresetsTable(db)
  await db.prepare('DELETE FROM ink_brand_presets WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// Seed brands
app.all('/api/ink-passport/brands/seed', async (c) => {
  const db = c.env.INKFLOW_DB
  let clear = false
  if (c.req.method === 'POST') { try { const b = await c.req.json(); clear = b.clear } catch {} }
  else { clear = c.req.query('clear') === '1' }
  await ensureBrandPresetsTable(db)
  if (clear) await db.prepare('DELETE FROM ink_brand_presets').run()
  const EU_BRANDS = [
    { brand_name: 'Intenze', colors: ['Zuper Black', 'Lining Black', 'Shading Black', 'Gen-Z Black', 'Muddy Brown', 'Dark Brown', 'White Wash', 'Opaque Red', 'True Blue', 'Purple', 'Orange', 'Yellow', 'Pink', 'Navy'], region: 'US/EU', supplier: 'Intenze Products' },
    { brand_name: 'Eternal Ink', colors: ['Lining Black', 'Shading Black', 'Ultra Black', 'White', 'Alchemy Orange', 'Sacrament Burgundy', 'Effigy Green', 'Species Green', 'Dystopia Magenta', 'Grey Scale Set', 'Navy', 'Red', 'Blue', 'Purple', 'Yellow', 'Pink', 'Brown'], region: 'US/EU (APEX)', supplier: 'Eternal Ink' },
    { brand_name: 'World Famous', colors: ['Triple Black', 'Lining Black', 'Grey Wash Set', 'White', 'Navy', 'Cardinal Red', 'Bright Yellow', 'Emerald Green', 'Vibrant Purple', 'Electric Blue', 'Tropical Orange', 'Cotton Candy Pink', 'Limitless Black'], region: 'US/EU', supplier: 'World Famous Ink / Limitless' },
    { brand_name: 'Kuro Sumi Imperial', colors: ['Lining Black', 'Shading Black', 'Sumi Black', 'Grey Wash 5', 'Grey Wash 10', 'Grey Wash 15', 'Grey Wash 20', 'White', 'Imperial Red', 'Royal Blue', 'Mango Pulp', 'Olive Green', 'Vibrant Yellow', 'Deep Purple'], region: 'EU/JP', supplier: 'Kuro Sumi International' },
    { brand_name: 'Dynamic', colors: ['Black', 'Ultra Black', 'Grey Wash', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Viking Black', 'Platinum Grey'], region: 'EU (Viking/Platinum)', supplier: 'Dynamic Ink Co.' },
    { brand_name: 'Panthera', colors: ['Black Gold', 'Dark Sumy', 'Light Sumy', 'Smooth Finish', 'Smooth Blending', 'Grey Wash Dark', 'Grey Wash Medium', 'Grey Wash Light', 'White'], region: 'IT', supplier: 'Futura / Panthera Italy' },
    { brand_name: 'Radiant Colors', colors: ['Radiant Black', 'White', 'Red', 'Blue', 'Green', 'Purple', 'Orange', 'Yellow', 'Pink', 'Navy', 'Brown', 'Grey', 'Teal', 'Magenta'], region: 'EU (Evolved)', supplier: 'Radiant Colors EU' },
    { brand_name: 'I AM INK', colors: ['Sumi Black', '3 Sumi', '5 Sumi', 'White', 'Grey Wash 1', 'Grey Wash 2', 'Grey Wash 3', 'Grey Wash 4', 'Grey Wash 5'], region: 'AT', supplier: 'I AM INK (Austria)' },
    { brand_name: 'Raw Premium Pigments', colors: ['Raw Black', 'Platinum Black', 'White', 'Red', 'Blue', 'Green', 'Purple', 'Orange', 'Yellow', 'Pink', 'Navy', 'Brown'], region: 'EU (Platinum)', supplier: 'Raw Premium Pigments' },
    { brand_name: 'Quantum', colors: ['Quantum Black', 'White', 'Red', 'Blue', 'Green', 'Purple', 'Orange', 'Yellow', 'Pink', 'Navy', 'Grey'], region: 'EU', supplier: 'Quantum Tattoo Ink' },
    { brand_name: 'Premier Products', colors: ['Greywash 1', 'Greywash 2', 'Greystar 1', 'Greystar 2', 'Greystar 3', 'Greystar 4', 'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow'], region: 'EU', supplier: 'Premier Products' },
    { brand_name: 'Carbon Black', colors: ['Carbon Black', 'White', 'Grey Wash Set'], region: 'EU', supplier: 'Carbon Black Tattoo Ink' },
    { brand_name: 'Kwadron', colors: ['Enriched Black', 'White', 'Red', 'Blue', 'Green', 'Yellow'], region: 'EU', supplier: 'Kwadron Inx' },
  ]
  let count = 0
  for (const b of EU_BRANDS) {
    try { await db.prepare('INSERT OR IGNORE INTO ink_brand_presets (brand_name, colors, region, supplier) VALUES (?,?,?,?)').bind(b.brand_name, JSON.stringify(b.colors), b.region, b.supplier).run(); count++ } catch {}
  }
  return c.json({ ok: true, seeded: count, total: EU_BRANDS.length, brands: EU_BRANDS.map(b => b.brand_name) })
})

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
