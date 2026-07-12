import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRemoteJWKSet, jwtVerify } from 'jose'
// Neon ��y?Y?a2��?�� ?a ��1��? HTTP D-�����ꡧ/sql endpoint��?��?����?a WebSocket ?�� Worker ?D2??��?��
// @neondatabase/serverless ��? neon() o����y?������ WebSocket��??�� Cloudflare Worker ?D����o?����?��
// ??��? HTTP neonQuery��?��??��?��?����?

type UserInfo = { uid: string; email?: string }

// Neon HTTP query helper ?a uses Neon SQL-over-HTTP API (new /sql endpoint)
async function neonQuery(connStr: string, query: string, params?: any[]): Promise<any[]> {
  if (!connStr) throw new Error('NEON_DATABASE_URL not configured');
  const m = connStr.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (!m) throw new Error('Invalid Neon URL format');
  const [, , , host] = m;
  const baseConnStr = connStr.replace(/\?.*$/, '');
  const body: any = { query };
  if (params && params.length > 0) body.params = params;
  const resp = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'neon-connection-string': baseConnStr },
    body: JSON.stringify(body),
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`Neon ${resp.status}: ${t.slice(0,200)}`); }
  const data: any = await resp.json();
  return data.rows || data;
}

// ??��Y neon() ?���?��?������? SQL ����??o����y ?a �̡�2?��? HTTP
function neonSql(connStr: string) {
  return async (strings: TemplateStringsArray, ...values: any[]): Promise<{rows: any[]}> => {
    let query = strings[0];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (typeof v === 'number') query += v;
      else if (typeof v === 'string') query += `'${v.replace(/'/g, "''")}'`;
      else if (v === null || v === undefined) query += 'NULL';
      else query += `'${String(v).replace(/'/g, "''")}'`;
      query += strings[i + 1];
    }
    const rows = await neonQuery(connStr, query);
    return { rows };
  };
}

// Bot token verification ?a shared between bot endpoints
const BOT_SECRET = 'vps-bot-secret-2024';
function checkBotToken(c: any): boolean {
  const auth = c.req.header('Authorization') || '';
  if (auth === `Bearer ${BOT_SECRET}`) return true;
  if (c.req.query('token') === BOT_SECRET) return true;
  // Bot worker authenticates via the `x-bot-key` header (see harvests-engine
  // buildHeaders). Accept it so the real VPS bot can reach bot-token endpoints.
  if (c.req.header('x-bot-key') === BOT_SECRET) return true;
  return false;
}

// Module-level table init flag (avoids redundant CREATE TABLE on every warm request)
let _behaviorLogsTableReady: Promise<void> | null = null;
const ensureBehaviorLogsTable = (db: any): Promise<void> => {
  if (!_behaviorLogsTableReady) {
    _behaviorLogsTableReady = db.prepare(`CREATE TABLE IF NOT EXISTS bot_behavior_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      bot_id TEXT NOT NULL,
      event TEXT NOT NULL,
      data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run().then(() => {}).catch(() => {});
  }
  return _behaviorLogsTableReady;
};

type Bindings = {
  DB: D1Database
  NEON_DATABASE_URL: string
  FIREBASE_PROJECT_ID?: string
  FIREBASE_API_KEY?: string
}

type Variables = {
  user: UserInfo
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
app.use('/*', cors())

// Health check ?a no DB dependency
app.get('/_health', (c) => c.json({ ok: true, time: Date.now() }))
app.get('/_ver', (c) => c.json({ ver: 'final-v2', time: Date.now() }))

// ?��?�� Firebase JWT verification ?��?��
const FIREBASE_PROJECT_ID = 'harvests-3b238'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const JWKS = createRemoteJWKSet(new URL(JWKS_URL))

async function verifyToken(token: string): Promise<UserInfo | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    })
    return { uid: payload.sub as string, email: payload.email as string }
  } catch { return null }
}

// ?��?�� Auth middleware (protects /api/* except whitelisted paths) ?��?��
const PUBLIC_PATHS = new Set([
  '/api/shopify/webhook/orders-create',
  '/api/fulfillment/shopify/callback',
  '/api/automation/bot-account',
  '/api/automation/bot-account/delete',
  '/api/automation/behavior-logs',
  '/api/automation/bot-config',
  '/api/bot/register',
  '/api/bot/heartbeat',
  '/api/automation/poll',
  '/api/automation/report',
  '/api/automation/artists',
  '/api/automation/observations',
  '/api/automation/neon-test',
  '/api/automation/tasks/create-from-artists',
  '/api/automation/tasks/inject',
  '/api/automation/task-list',
  '/api/automation/task-counts',
  '/api/automation/task-counts-debug',
  '/api/automation/task-list/sync',
  '/api/shopify/order',
  '/api/shopify/fix-name',
  '/api/automation/tasks/clear-duplicate-pending',
  '/api/automation/tasks/clear-all-pending',
  '/api/automation/poll-debug',
  '/api/bot/noise-sites',
  '/api/bot/observe',
  '/api/tasks/create',
  '/api/tasks/count',
  '/api/amazon/pending',
  '/api/amazon/report',
  '/api/voice/log',
  '/api/inventory/stock',
  '/api/inventory/stocktake',
  '/api/inventory/alerts',
  '/api/inventory/inbounds',
  '/api/inventory/outbounds',
  '/api/inventory/customers',
  '/api/inventory/inbound-summary',
  '/api/inventory/outbound-summary',
  '/api/inventory/inbound',
  '/api/inventory/outbound',
  '/api/inventory/product',
  '/api/inventory/customer',
  '/api/inventory/customer-orders',
  '/api/inventory/picked',
  '/api/inventory/distributor-candidates',
  '/api/inventory/import-distributor',
  '/api/inventory/trends',
  '/api/inventory/po',
  '/api/inventory/b2b-order',
  '/api/inventory/b2b-orders',
  '/api/inventory/b2b-fix-pack',
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/reset',
  '/api/auth/register',
  '/api/auth/register-status',
  '/api/auth/refresh',
  '/api/auth/google',
  '/api/migrate-users',
  '/api/artists',
  '/api/artists/bulk-import',
  '/api/states',
  '/api/publish/ingest',
  '/api/automation/create-marketing-task',
  '/api/marketing/tasks/poll',
  '/api/marketing/tasks/report',
  '/api/marketing/tasks/mark-converted',
  '/api/marketing/scripts/select'
])

app.use('/api/*', async (c, next) => {
  const path = new URL(c.req.url).pathname
  if ([...PUBLIC_PATHS].some(p => path === p || path.startsWith(p + '/'))) return next()
  if (path === '/api/shopify/status' || path === '/api/shopify/orders/deduct' || path.startsWith('/api/shopify/order/') || path.startsWith('/api/shopify/fix-name/')) return next()

  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized ?a missing token' }, 401)
  }
  const user = await verifyToken(auth.slice(7))
  if (!user) {
    return c.json({ error: 'Unauthorized ?a invalid token' }, 401)
  }
  c.set('user', user)

  // Auto-register user on first API call
  try {
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE user_id = ?').bind(user.uid).first()
    if (!existing) {
      const now = Date.now()
      const role = user.email === 'snow368@gmail.com' ? 'admin' : 'user'
      await c.env.DB.prepare(`
        INSERT INTO users (user_id, email, role, quota_daily_scrape, quota_total_scrape, created_at, updated_at)
        VALUES (?, ?, ?, 10, 100, ?, ?)
      `).bind(user.uid, user.email || '', role, now, now).run()
    } else {
      // Update last_active_at
      await c.env.DB.prepare('UPDATE users SET last_active_at = ?, updated_at = ? WHERE user_id = ?').bind(Date.now(), Date.now(), user.uid).run()
    }
  } catch {}
  await next()
})

// ============ STOCK / PRODUCTS ============

app.get('/api/health', async (c) => c.json({ ok: true, ts: Date.now() }))

// GET /api/states?country=US — static reference list for the country/state dropdown
// (ShopOutreach falls back to a local constant if this is unavailable, so it's safe to keep public)
app.get('/api/states', (c) => {
  const country = (c.req.query('country') || 'US').toUpperCase();
  const STATES: Record<string, string[]> = {
    US: ['AZ', 'CA', 'FL', 'NY', 'TX', 'NV', 'WA', 'IL', 'GA', 'PA', 'OR', 'CO', 'NC', 'OH', 'MI', 'NJ', 'MA', 'TN', 'VA'],
    CA: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
  };
  return c.json({ states: STATES[country] || [] });
})

app.get('/api/inventory/stock', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT p.*,
      COALESCE((SELECT SUM(quantity) FROM inventory_inbounds WHERE product_sku = p.sku), 0) AS total_inbound,
      COALESCE((SELECT SUM(quantity) FROM inventory_outbounds WHERE product_sku = p.sku), 0) AS total_outbound
    FROM inventory_products p ORDER BY p.sku
  `).all()
  const items = (rows.results || []).map((r: any) => ({
    ...r,
    status: (r.total_inbound || 0) - (r.total_outbound || 0) === 0 ? 'out_of_stock'
      : (r.total_inbound || 0) - (r.total_outbound || 0) <= (r.reorder_point || 0) ? 'low_stock' : 'healthy'
  }))
  return c.json({ ok: true, items })
})

app.get('/api/inventory/stock/:sku', async (c) => {
  const sku = c.req.param('sku')
  const product = await c.env.DB.prepare('SELECT * FROM inventory_products WHERE sku = ?').bind(sku).first()
  if (!product) return c.json({ error: 'not found' }, 404)
  const inbounds = await c.env.DB.prepare('SELECT * FROM inventory_inbounds WHERE product_sku = ? ORDER BY inbound_date DESC').bind(sku).all()
  const outbounds = await c.env.DB.prepare('SELECT * FROM inventory_outbounds WHERE product_sku = ? ORDER BY outbound_date DESC').bind(sku).all()
  return c.json({ product, inbounds: inbounds.results || [], outbounds: outbounds.results || [] })
})

app.get('/api/inventory/alerts', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT p.sku, p.name, p.category, p.reorder_point, p.reorder_qty, p.lead_time_days, p.moq, p.carton_qty,
      COALESCE(inb.total_in, 0) as total_inbound, COALESCE(out.total_out, 0) as total_outbound,
      COALESCE(inb.total_in, 0) - COALESCE(out.total_out, 0) as current_stock
    FROM inventory_products p
    LEFT JOIN (SELECT product_sku, SUM(quantity) as total_in FROM inventory_inbounds GROUP BY product_sku) inb ON p.sku = inb.product_sku
    LEFT JOIN (SELECT product_sku, SUM(quantity) as total_out FROM inventory_outbounds GROUP BY product_sku) out ON p.sku = out.product_sku
    WHERE (COALESCE(inb.total_in, 0) - COALESCE(out.total_out, 0)) <= p.reorder_point
    ORDER BY current_stock ASC
  `).all()
  return c.json({ ok: true, alerts: rows.results || [] })
})

app.get('/api/inventory/trends', async (c) => {
  const days = parseInt(c.req.query('days') || '90')
  const dateStr = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  const products = await c.env.DB.prepare('SELECT sku, name FROM inventory_products').all()
  const trends: any[] = []
  for (const p of (products.results || []) as any[]) {
    const out = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM inventory_outbounds WHERE product_sku = ? AND outbound_date >= ?'
    ).bind(p.sku, dateStr).first() as any
    const total = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(quantity),0) as total_in FROM inventory_inbounds WHERE product_sku = ?'
    ).bind(p.sku).first() as any
    const outTotal = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(quantity),0) as total_out FROM inventory_outbounds WHERE product_sku = ?'
    ).bind(p.sku).first() as any
    trends.push({
      sku: p.sku, name: p.name,
      period_sold: out?.total || 0,
      avg_daily: Math.round(((out?.total || 0) / days) * 100) / 100,
      current_stock: (total?.total_in || 0) - (outTotal?.total_out || 0)
    })
  }
  return c.json({ ok: true, trends })
})

app.post('/api/inventory/product', async (c) => {
  const body = await c.req.json()
  const { sku, name, category, vendor, unit, unit_price, reorder_point, reorder_qty, lead_time_days, moq, carton_qty, source, shopify_variant_id, id } = body
  const now = Date.now()
  if (id) {
    await c.env.DB.prepare(`UPDATE inventory_products SET name=?, category=?, vendor=?, unit=?, unit_price=?, reorder_point=?, reorder_qty=?, lead_time_days=?, moq=?, carton_qty=?, source=?, shopify_variant_id=?, updated_at=? WHERE id=?`)
      .bind(name, category||'General', vendor||'', unit||'Box', unit_price||0, reorder_point||50, reorder_qty||1000, lead_time_days||45, moq||500, carton_qty||100, source||'manual', shopify_variant_id||null, now, id).run()
    return c.json({ ok: true, action: 'updated', sku })
  }
  try {
    await c.env.DB.prepare(`INSERT INTO inventory_products (sku,name,category,vendor,unit,unit_price,reorder_point,reorder_qty,lead_time_days,moq,carton_qty,source,shopify_variant_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(sku, name, category||'General', vendor||'', unit||'Box', unit_price||0, reorder_point||50, reorder_qty||1000, lead_time_days||45, moq||500, carton_qty||100, source||'manual', shopify_variant_id||null, now, now).run()
    return c.json({ ok: true, action: 'created', sku })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: `SKU ${sku} already exists` }, 409)
    throw e
  }
})

app.post('/api/inventory/product/:sku/field', async (c) => {
  const sku = c.req.param('sku')
  const { field, value } = await c.req.json()
  const allowed = ['name','category','vendor','unit','unit_price','reorder_point','reorder_qty','lead_time_days','moq','carton_qty','source','barcode','image_url','current_stock','status']
  if (!allowed.includes(field)) return c.json({ error: 'invalid field' }, 400)
  await c.env.DB.prepare(`UPDATE inventory_products SET ${field}=?, updated_at=? WHERE sku=?`).bind(value, Date.now(), sku).run()
  return c.json({ ok: true })
})

// ?��?�� Stocktake API (D1 persistent) ?��?��
app.post('/api/inventory/stocktake', async (c) => {
  try {
    const { location, sku, expected_qty, actual_qty, notes, clear } = await c.req.json();
    const now = Date.now();
    if (clear) {
      await c.env.DB.prepare('DELETE FROM inventory_stocktakes').run();
      return c.json({ ok: true, cleared: true });
    }
    const existing = await c.env.DB.prepare('SELECT id FROM inventory_stocktakes WHERE location=? AND sku=?').bind(location, sku).first();
    const diff = (actual_qty || 0) - (expected_qty || 0);
    if (existing) {
      await c.env.DB.prepare('UPDATE inventory_stocktakes SET expected_qty=?, actual_qty=?, difference=?, notes=?, created_at=? WHERE id=?')
        .bind(expected_qty||0, actual_qty||0, diff, notes||'', now, (existing as any).id).run();
    } else {
      await c.env.DB.prepare('INSERT INTO inventory_stocktakes (location,sku,expected_qty,actual_qty,difference,notes,created_at) VALUES (?,?,?,?,?,?,?)')
        .bind(location, sku, expected_qty||0, actual_qty||0, diff, notes||'', now).run();
    }
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500); }
});
app.post('/api/inventory/stocktake/batch', async (c) => {
  try {
    const { records } = await c.req.json();
    if (!Array.isArray(records) || !records.length) return c.json({ ok: false, error: 'records required' }, 400);
    const now = Date.now(); let count = 0;
    for (const r of records) {
      const { location, sku, expected_qty, actual_qty, notes } = r;
      const existing = await c.env.DB.prepare('SELECT id FROM inventory_stocktakes WHERE location=? AND sku=?').bind(location, sku).first();
      const diff = (actual_qty||0) - (expected_qty||0);
      if (existing) {
        await c.env.DB.prepare('UPDATE inventory_stocktakes SET expected_qty=?, actual_qty=?, difference=?, notes=?, created_at=? WHERE id=?')
          .bind(expected_qty||0, actual_qty||0, diff, notes||'', now, (existing as any).id).run();
      } else {
        await c.env.DB.prepare('INSERT INTO inventory_stocktakes (location,sku,expected_qty,actual_qty,difference,notes,created_at) VALUES (?,?,?,?,?,?,?)')
          .bind(location, sku, expected_qty||0, actual_qty||0, diff, notes||'', now).run();
      }
      count++;
    }
    return c.json({ ok: true, count });
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500); }
});
app.get('/api/inventory/stocktake', async (c) => {
  try {
    const location = c.req.query('location') || '';
    const rows = await c.env.DB.prepare(
      `SELECT s.*, p.name as product_name FROM inventory_stocktakes s LEFT JOIN inventory_products p ON s.sku=p.sku ${location ? 'WHERE s.location=?': ''} ORDER BY s.location ASC, s.sku ASC`
    ).bind(...(location ? [location] : [])).all();
    return c.json({ ok: true, items: rows.results || [] });
  } catch (e: any) { return c.json({ ok: false, items: [], error: e.message }, 500); }
});
app.delete('/api/inventory/stocktake', async (c) => {
  try { await c.env.DB.prepare('DELETE FROM inventory_stocktakes').run(); return c.json({ ok: true }); }
  catch (e: any) { return c.json({ ok: false, error: e.message }, 500); }
});
app.delete('/api/inventory/stocktake/:id', async (c) => {
  try { await c.env.DB.prepare('DELETE FROM inventory_stocktakes WHERE id=?').bind(c.req.param('id')).run(); return c.json({ ok: true }); }
  catch (e: any) { return c.json({ ok: false, error: e.message }, 500); }
});

app.delete('/api/inventory/product/:sku', async (c) => {
  await c.env.DB.prepare('DELETE FROM inventory_products WHERE sku=?').bind(c.req.param('sku')).run()
  return c.json({ ok: true })
})

// ============ INBOUND / OUTBOUND ============

app.post('/api/inventory/inbound', async (c) => {
  const { product_sku, quantity, large_case_qty, small_box_qty, po_number, inbound_date, note, sterilized } = await c.req.json()
  if (!product_sku || !inbound_date) return c.json({ error: 'product_sku, inbound_date required' }, 400)
  // ��??��??������y��?��o1�䨮??=2D???=100oD��?1D???=50oD
  const lq = Math.max(0, parseInt(large_case_qty) || 0)
  const sq = Math.max(0, parseInt(small_box_qty) || 0)
  const totalQty = lq * 100 + sq * 50 + (parseInt(quantity) || 0)
  if (totalQty <= 0) return c.json({ error: '������y��?��?D?�䨮����0' }, 400)
  try { await c.env.DB.prepare(`ALTER TABLE inventory_inbounds ADD COLUMN sterilized INTEGER DEFAULT 0`).run() } catch {}
  try { await c.env.DB.prepare(`ALTER TABLE inventory_inbounds ADD COLUMN large_case_qty INTEGER DEFAULT 0`).run() } catch {}
  try { await c.env.DB.prepare(`ALTER TABLE inventory_inbounds ADD COLUMN small_box_qty INTEGER DEFAULT 0`).run() } catch {}
  await c.env.DB.prepare('INSERT INTO inventory_inbounds (product_sku,quantity,large_case_qty,small_box_qty,po_number,inbound_date,note,sterilized,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(product_sku, totalQty, lq, sq, po_number||'', inbound_date, note||'', sterilized ? 1 : 0, Date.now()).run()
  return c.json({ ok: true })
})

const VALID_CHANNELS = ['B2C','B2B','sample_b2b','sample_b2c']

app.post('/api/inventory/outbound', async (c) => {
  try {
    const { product_sku, quantity, channel, customer_name, shopify_order_id, outbound_date, note, pack_source } = await c.req.json()
    if (!product_sku || !quantity || !channel || !outbound_date) return c.json({ error: 'product_sku, quantity, channel, outbound_date required' }, 400)
    if (!VALID_CHANNELS.includes(channel)) return c.json({ error: `channel must be one of: ${VALID_CHANNELS.join(', ')}` }, 400)
    try { await c.env.DB.prepare(`ALTER TABLE inventory_outbounds ADD COLUMN pack_source TEXT DEFAULT ''`).run() } catch {}
    await c.env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,pack_source,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(product_sku, quantity, channel, customer_name||'', shopify_order_id||'', outbound_date, note||'', pack_source||'', Date.now()).run()
    if ((channel === 'B2B' || channel === 'sample_b2b') && customer_name) {
      const now = Date.now()
      try { await c.env.DB.prepare('INSERT INTO inventory_customers (name,updated_at,created_at) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET updated_at=?').bind(customer_name, now, now, now).run() } catch {}
    }
    return c.json({ ok: true })
  } catch (e: any) {
    console.error('[outbound] error:', e?.message || e)
    return c.json({ ok: false, error: e?.message || String(e) }, 500)
  }
})

app.put('/api/inventory/outbound/:id', async (c) => {
  try {
    const id = c.req.param('id'); const data = await c.req.json()
    const sets: string[] = []; const vals: any[] = []
    for (const [key, val] of Object.entries(data)) {
      if (['product_sku','quantity','channel','customer_name','shopify_order_id','outbound_date','note','pack_source'].includes(key)) {
        sets.push(`${key}=?`); vals.push(val)
      }
    }
    if (!sets.length) return c.json({ error: 'no valid fields' }, 400)
    vals.push(id); await c.env.DB.prepare(`UPDATE inventory_outbounds SET ${sets.join(',')} WHERE id=?`).bind(...vals).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.delete('/api/inventory/outbound/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM inventory_outbounds WHERE id=?').bind(id).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.put('/api/inventory/inbound/:id', async (c) => {
  try {
    const id = c.req.param('id'); const data = await c.req.json()
    const sets: string[] = []; const vals: any[] = []
    for (const [key, val] of Object.entries(data)) {
      if (['product_sku','quantity','large_case_qty','small_box_qty','po_number','inbound_date','note','sterilized'].includes(key)) {
        sets.push(`${key}=?`); vals.push(val)
      }
    }
    if (!sets.length) return c.json({ error: 'no valid fields' }, 400)
    vals.push(id); await c.env.DB.prepare(`UPDATE inventory_inbounds SET ${sets.join(',')} WHERE id=?`).bind(...vals).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.delete('/api/inventory/inbound/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM inventory_inbounds WHERE id=?').bind(id).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.delete('/api/inventory/outbounds/:customer_name', async (c) => {
  try {
    const name = c.req.param('customer_name')
    await c.env.DB.prepare('DELETE FROM inventory_outbounds WHERE customer_name=?').bind(name).run()
    return c.json({ ok: true, deleted: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.get('/api/inventory/inbounds', async (c) => {
  const rows = await c.env.DB.prepare('SELECT i.*, p.name as product_name FROM inventory_inbounds i LEFT JOIN inventory_products p ON i.product_sku = p.sku ORDER BY i.inbound_date DESC LIMIT 500').all()
  return c.json({ ok: true, items: rows.results || [] })
})

// ��??a??������o��䨨??��+D��o?+???? ��?������3??
app.get('/api/inventory/inbound-summary', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT inbound_date, product_sku, p.name as product_name, sterilized,
           SUM(quantity) as total_qty, COUNT(*) as batch_count,
           SUM(large_case_qty) as total_cases, SUM(small_box_qty) as total_boxes
    FROM inventory_inbounds i
    LEFT JOIN inventory_products p ON i.product_sku = p.sku
    GROUP BY inbound_date, product_sku, sterilized
    ORDER BY inbound_date DESC, product_sku ASC
    LIMIT 1000
  `).all()
  return c.json({ ok: true, items: rows.results || [] })
})

// �̣�???��?��?��D��o???��?oD��y
app.get('/api/inventory/customer-orders/:name', async (c) => {
  const name = c.req.param('name')
  const rows = await c.env.DB.prepare(`
    SELECT product_sku, p.name as product_name, SUM(quantity) as total_qty, COUNT(*) as order_count,
           MIN(outbound_date) as first_date, MAX(outbound_date) as last_date
    FROM inventory_outbounds o
    LEFT JOIN inventory_products p ON o.product_sku = p.sku
    WHERE o.customer_name = ?
    GROUP BY product_sku
    ORDER BY total_qty DESC
  `).bind(name).all()
  const details = await c.env.DB.prepare(`
    SELECT id, product_sku, quantity, channel, outbound_date, note, pack_source, shopify_order_id
    FROM inventory_outbounds
    WHERE customer_name = ?
    ORDER BY outbound_date DESC
    LIMIT 200
  `).bind(name).all()
  return c.json({ ok: true, items: rows.results || [], details: details.results || [] })
})

// 3??a??������o���?��?��+?t�̨���3??
app.get('/api/inventory/outbound-summary', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT o.customer_name, o.channel, COUNT(*) as total_orders, SUM(o.quantity) as total_qty, MAX(o.outbound_date) as last_date,
           CASE WHEN o.channel = 'B2B' OR o.channel = 'sample_b2b'
             THEN COALESCE((SELECT SUM(b.quantity) - COALESCE((SELECT SUM(o2.quantity) FROM inventory_outbounds o2 WHERE o2.customer_name = b.customer_name), 0) FROM b2b_order_items b WHERE b.customer_name = o.customer_name), SUM(o.quantity))
             ELSE COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders ord ON oi.order_id = ord.id WHERE ord.customer_name = o.customer_name), SUM(o.quantity))
           END as total_order_qty
    FROM inventory_outbounds o
    WHERE o.customer_name != ''
    GROUP BY o.customer_name, o.channel
    ORDER BY total_qty DESC
    LIMIT 500
  `).all()
  return c.json({ ok: true, items: rows.results || [] })
})

app.get('/api/inventory/outbounds', async (c) => {
  const channel = c.req.query('channel')
  const sku = c.req.query('sku')
  let sql = 'SELECT o.*, p.name as product_name FROM inventory_outbounds o LEFT JOIN inventory_products p ON o.product_sku = p.sku WHERE 1=1'
  const binds: any[] = []
  if (channel && channel !== 'all') { sql += ' AND channel = ?'; binds.push(channel) }
  if (sku) { sql += ' AND product_sku = ?'; binds.push(sku) }
  sql += ' ORDER BY outbound_date DESC LIMIT 500'
  const rows = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json({ ok: true, items: rows.results || [] })
})

// ============ CUSTOMERS ============

app.get('/api/inventory/customers', async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM inventory_customers ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END, total_orders DESC").all()
  return c.json({ ok: true, items: rows.results || [] })
})

app.post('/api/inventory/customer', async (c) => {
  const body = await c.req.json()
  const { name, email, instagram, country, customer_type, status, notes } = body
  if (!name) return c.json({ error: 'name required' }, 400)
  const now = Date.now()
  try {
    await c.env.DB.prepare(`
      INSERT INTO inventory_customers (name,email,instagram,country,customer_type,status,notes,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(name) DO UPDATE SET email=excluded.email, instagram=excluded.instagram, country=excluded.country, customer_type=excluded.customer_type, status=excluded.status, notes=excluded.notes, updated_at=excluded.updated_at
    `).bind(name, email||'', instagram||'', country||'', customer_type||'Retail', status||'active', notes||'', now, now).run()
  } catch (e: any) {
    // fallback: insert
    await c.env.DB.prepare('INSERT INTO inventory_customers (name,email,instagram,country,customer_type,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(name, email||'', instagram||'', country||'', customer_type||'Retail', status||'active', notes||'', now, now).run()
  }
  return c.json({ ok: true })
})

app.post('/api/inventory/customers/sync', async (c) => {
  const { orders } = await c.req.json()
  if (!Array.isArray(orders)) return c.json({ error: 'orders array required' }, 400)
  const now = Date.now()
  let count = 0
  for (const o of orders) {
    const name = o.customer_name || o.shopify_customer_name || 'Unknown'
    await c.env.DB.prepare(`
      INSERT INTO inventory_customers (name,email,last_order_date,first_order_date,total_orders,total_spent,updated_at,created_at)
      VALUES (?,?,?,?,1,?,?,?)
      ON CONFLICT(name) DO UPDATE SET total_orders=total_orders+1, total_spent=total_spent+?, last_order_date=?, updated_at=?
    `).bind(name, o.customer_email||'', o.order_date||'', o.order_date||'', o.total_spent||0, now, now, o.total_spent||0, o.order_date||'', now).run()
    count++
  }
  return c.json({ ok: true, synced: count })
})

// ?��?�� Picked SKUs tracking (database-backed) ?��?��
app.post('/api/inventory/picked', async (c) => {
  try {
    const { customer_name, product_sku } = await c.req.json()
    if (!customer_name || !product_sku) return c.json({ error: 'customer_name and product_sku required' }, 400)
    try { await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS inventory_picked_skus (customer_name TEXT, product_sku TEXT, picked_at INTEGER, created_at INTEGER, PRIMARY KEY (customer_name, product_sku))`).run() } catch {}
    await c.env.DB.prepare('INSERT OR IGNORE INTO inventory_picked_skus (customer_name, product_sku, picked_at, created_at) VALUES (?,?,?,?)')
      .bind(customer_name, product_sku, Date.now(), Date.now()).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.delete('/api/inventory/picked/:customer_name/:product_sku', async (c) => {
  try {
    const cn = c.req.param('customer_name'); const sku = c.req.param('product_sku')
    await c.env.DB.prepare('DELETE FROM inventory_picked_skus WHERE customer_name=? AND product_sku=?').bind(cn, sku).run()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.get('/api/inventory/picked/:customer_name', async (c) => {
  try {
    try { await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS inventory_picked_skus (customer_name TEXT, product_sku TEXT, picked_at INTEGER, created_at INTEGER, PRIMARY KEY (customer_name, product_sku))`).run() } catch {}
    const cn = c.req.param('customer_name')
    const rows = await c.env.DB.prepare('SELECT product_sku FROM inventory_picked_skus WHERE customer_name=?').bind(cn).all()
    return c.json({ ok: true, skus: (rows.results || []).map(r => r.product_sku) })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.delete('/api/inventory/picked/reset/:customer_name', async (c) => {
  try {
    const cn = c.req.param('customer_name')
    await c.env.DB.prepare('DELETE FROM inventory_picked_skus WHERE customer_name=?').bind(cn).run()
    return c.json({ ok: true, reset: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

// ── B2B Orders（存订单，不扣库存，拣货才出库）──
app.post('/api/inventory/b2b-order', async (c) => {
  try {
    const { customer_name, items, order_no, order_date } = await c.req.json()
    if (!customer_name || !items?.length) return c.json({ error: 'customer_name and items required' }, 400)
    try { await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS b2b_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT, customer_name TEXT, product_sku TEXT, quantity INTEGER DEFAULT 0, pack_source TEXT DEFAULT '', picked INTEGER DEFAULT 0, created_at INTEGER)`).run() } catch {}
    // 防重复：同客户+同型号+同包装不重复插入
    for (const item of items) {
      const existing = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM b2b_order_items WHERE customer_name=? AND product_sku=? AND pack_source=?').bind(customer_name, item.sku, item.pack_source||'').first() as any
      if (existing && existing.cnt > 0) {
        item.skipped = true
      }
    }
    const newItems = items.filter(i => !i.skipped)
    if (!newItems.length) return c.json({ ok: true, count: 0, skipped: true })
    for (const item of newItems) {
      await c.env.DB.prepare('INSERT INTO b2b_order_items (order_no, customer_name, product_sku, quantity, pack_source, picked, created_at) VALUES (?,?,?,?,?,0,?)')
        .bind(order_no||'', customer_name, item.sku, item.quantity, item.pack_source||'', Date.now()).run()
    }
    return c.json({ ok: true, count: newItems.length })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.get('/api/inventory/b2b-orders/:customer_name', async (c) => {
  try {
    try { await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS b2b_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT, customer_name TEXT, product_sku TEXT, quantity INTEGER DEFAULT 0, pack_source TEXT DEFAULT '', picked INTEGER DEFAULT 0, created_at INTEGER)`).run() } catch {}
    const cn = c.req.param('customer_name')
    const rows = await c.env.DB.prepare(`
      SELECT oi.id, oi.order_no, oi.customer_name, oi.product_sku, oi.quantity, oi.pack_source, oi.picked, oi.created_at, p.name as product_name, p.category,
             COALESCE((SELECT SUM(o.quantity) FROM inventory_outbounds o WHERE o.customer_name = ? AND o.product_sku = oi.product_sku), 0) as shipped
      FROM b2b_order_items oi
      LEFT JOIN inventory_products p ON oi.product_sku = p.sku
      WHERE oi.customer_name = ?
      ORDER BY oi.product_sku
    `).bind(cn, cn).all()
    return c.json({ ok: true, items: rows.results || [] })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.get('/api/inventory/b2b-orders', async (c) => {
  try {
    try { await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS b2b_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT, customer_name TEXT, product_sku TEXT, quantity INTEGER DEFAULT 0, pack_source TEXT DEFAULT '', picked INTEGER DEFAULT 0, created_at INTEGER)`).run() } catch {}
    const rows = await c.env.DB.prepare(`
      SELECT customer_name, product_sku, SUM(quantity) as total_qty, 
             COALESCE((SELECT SUM(o.quantity) FROM inventory_outbounds o WHERE o.customer_name = b.customer_name AND o.product_sku = b.product_sku), 0) as shipped
      FROM b2b_order_items b
      GROUP BY customer_name, product_sku
      ORDER BY customer_name
    `).all()
    return c.json({ ok: true, items: rows.results || [] })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.delete('/api/inventory/b2b-order/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM b2b_order_items WHERE id=?').bind(id).run()
    return c.json({ ok: true, deleted: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

app.delete('/api/inventory/b2b-orders/:customer_name', async (c) => {
  try {
    const cn = c.req.param('customer_name')
    await c.env.DB.prepare('DELETE FROM b2b_order_items WHERE customer_name=?').bind(cn).run()
    return c.json({ ok: true, deleted: true })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

// TEMP FIX: update 10装 records that were stored as 20pcs
app.post('/api/inventory/b2b-fix-pack', async (c) => {
  try {
    const result = await c.env.DB.prepare("UPDATE b2b_order_items SET pack_source='10pcs' WHERE order_no LIKE '%-si%' AND pack_source='20pcs'").run()
    return c.json({ ok: true, changes: result.meta?.changes || 0 })
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500) }
})

// ============ PURCHASE ORDERS ============

app.post('/api/inventory/po/create', async (c) => {
  const { items, supplier, expected_date, notes } = await c.req.json()
  if (!items?.length || !supplier) return c.json({ error: 'items and supplier required' }, 400)
  const now = Date.now()
  const poNumber = 'PO-' + now
  const r = await c.env.DB.prepare('INSERT INTO purchase_orders (po_number,supplier,order_date,expected_date,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(poNumber, supplier, new Date().toISOString().split('T')[0], expected_date||'', notes||'', now, now).run()
  const poId = r.meta.last_row_id
  const stmt = c.env.DB.prepare('INSERT INTO purchase_order_items (po_id,product_sku,quantity,unit_cost) VALUES (?,?,?,?)')
  for (const item of items) {
    await stmt.bind(poId, item.sku, item.quantity, item.unit_cost||0).run()
  }
  return c.json({ ok: true, poNumber })
})

app.get('/api/inventory/po', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC').all()
  return c.json({ ok: true, items: rows.results || [] })
})

app.get('/api/inventory/po/:id/items', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').bind(c.req.param('id')).all()
  return c.json({ ok: true, items: rows.results || [] })
})

// ============ FULFILLMENT: BOXES ============

app.get('/api/fulfillment/boxes', async (c) => {
  const rows = await c.env.DB.prepare("SELECT *, CASE WHEN stock <= stock_alert THEN 1 ELSE 0 END as low_stock FROM order_boxes WHERE enabled = 1 ORDER BY max_units ASC").all()
  return c.json(rows.results || [])
})

app.post('/api/fulfillment/boxes', async (c) => {
  const { name, length_cm, width_cm, height_cm, max_units, weight_g, carrier, stock, stock_alert } = await c.req.json()
  if (!name || !length_cm || !width_cm || !height_cm) return c.json({ error: 'name/length/width/height required' }, 400)
  await c.env.DB.prepare('INSERT INTO order_boxes (name,length_cm,width_cm,height_cm,max_units,weight_g,carrier,enabled,stock,stock_alert,created_at) VALUES (?,?,?,?,?,?,?,1,?,?,?)')
    .bind(name, length_cm, width_cm, height_cm, max_units||0, weight_g||0, carrier||'', stock||0, stock_alert||50, Date.now()).run()
  return c.json({ ok: true })
})

app.post('/api/fulfillment/boxes/inbound', async (c) => {
  const { box_id, quantity } = await c.req.json()
  if (!box_id || !quantity || quantity <= 0) return c.json({ error: 'box_id and quantity > 0 required' }, 400)
  const box = await c.env.DB.prepare('SELECT * FROM order_boxes WHERE id = ? AND enabled = 1').bind(box_id).first() as any
  if (!box) return c.json({ error: 'box not found' }, 404)
  await c.env.DB.prepare('UPDATE order_boxes SET stock = stock + ? WHERE id = ?').bind(quantity, box_id).run()
  return c.json({ ok: true, newStock: (box.stock||0) + quantity, box: box.name, inboundQty: quantity })
})

app.delete('/api/fulfillment/boxes/:id', async (c) => {
  await c.env.DB.prepare('UPDATE order_boxes SET enabled = 0 WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ============ FULFILLMENT: CARRIERS ============

app.get('/api/fulfillment/carriers', async (c) => {
  const rows = await c.env.DB.prepare('SELECT id, carrier, label, api_base_url, enabled FROM carrier_configs ORDER BY carrier').all()
  return c.json(rows.results || [])
})

app.post('/api/fulfillment/carriers', async (c) => {
  const { id, api_key, api_secret, extra_config } = await c.req.json()
  if (!id) return c.json({ error: 'id required' }, 400)
  if (api_key) await c.env.DB.prepare('UPDATE carrier_configs SET api_key = ? WHERE id = ?').bind(api_key, id).run()
  if (api_secret) await c.env.DB.prepare('UPDATE carrier_configs SET api_secret = ? WHERE id = ?').bind(api_secret, id).run()
  if (extra_config) await c.env.DB.prepare('UPDATE carrier_configs SET extra_config = ? WHERE id = ?').bind(JSON.stringify(extra_config), id).run()
  return c.json({ ok: true })
})

// ============ FULFILLMENT: ORDERS ============

app.get('/api/fulfillment/orders', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')))
  const offset = (page - 1) * limit
  const status = c.req.query('status')
  let sql = 'SELECT * FROM orders WHERE 1=1'
  const binds: any[] = []
  if (status) { sql += ' AND status = ?'; binds.push(status) }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  binds.push(limit, offset)
  const orders = await c.env.DB.prepare(sql).bind(...binds).all()
  const total = await c.env.DB.prepare('SELECT COUNT(*) as c FROM orders').first() as any
  return c.json({ orders: orders.results || [], total: total?.c || 0, page, limit })
})

app.get('/api/fulfillment/orders/:id', async (c) => {
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(c.req.param('id')).first()
  if (!order) return c.json({ error: 'not found' }, 404)
  const items = await c.env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(c.req.param('id')).all()
  const shipments = await c.env.DB.prepare('SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at DESC').bind(c.req.param('id')).all()
  return c.json({ ...order as any, items: items.results || [], shipments: shipments.results || [] })
})

app.post('/api/fulfillment/orders', async (c) => {
  const { order_number, customer_name, country, state, city, zip_code, address, phone, items, notes } = await c.req.json()
  if (!order_number || !customer_name || !country) return c.json({ error: 'order_number/customer_name/country required' }, 400)
  const now = Date.now()
  const r = await c.env.DB.prepare(`INSERT INTO orders (order_number,customer_name,country,state,city,zip_code,address,phone,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(order_number, customer_name, country, state||'', city||'', zip_code||'', address||'', phone||'', notes||'', now, now).run()
  const orderId = r.meta.last_row_id
  if (items && Array.isArray(items)) {
    for (const item of items) {
      await c.env.DB.prepare('INSERT INTO order_items (order_id,sku,product_name,quantity,unit_price) VALUES (?,?,?,?,?)')
        .bind(orderId, item.sku||'', item.product_name||'Item', item.quantity||1, item.unit_price||0).run()
    }
  }
  return c.json({ ok: true, id: orderId })
})

app.delete('/api/fulfillment/orders/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM shipments WHERE order_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// ============ SHOPIFY ============

const parseNote = (note: string): any[] => {
  try {
    const gifts: any[] = []
    const needleRegex = /(\d{3,4})(RL|RS|RG|RT|F|M)\s*[xX*]?\s*(\d+)?\s*(oD|20)?/gi
    const seen = new Set<string>()
    let match
    while ((match = needleRegex.exec(note)) !== null) {
      const label = match[1].toUpperCase() + match[2].toUpperCase()
      if (seen.has(label)) continue
      seen.add(label)
      const qty = parseInt(match[3] || '1', 10)
      gifts.push({ type: 'needle', label, quantity: qty })
    }
    // bare codes
    const bareRegex = /\b(\d{3,4})(RL|RS|RG|RT|F|M)\b/gi
    while ((match = bareRegex.exec(note)) !== null) {
      const label = match[1].toUpperCase() + match[2].toUpperCase()
      if (seen.has(label)) continue
      seen.add(label)
      gifts.push({ type: 'needle', label, quantity: 1 })
    }
    const posterMatch = note.match(/(D?o�����|�䨮o�����|o�����)[\sxX*?��]*(\d+)?/i)
    if (posterMatch) gifts.push({ type: 'poster', label: 'o�����', quantity: parseInt(posterMatch[2] || '1', 10) })
    return gifts
  } catch { return [] }
}

const parseGiftSkus = (note: string): Array<{ sku: string; qty: number; name: string }> => {
  return parseNote(note).map(g => ({
    sku: g.type === 'needle' ? g.label : 'POSTER',
    qty: g.quantity,
    name: g.type === 'needle' ? g.label : 'o�����'
  }))
}

app.get('/api/shopify/status', async (c) => {
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any
  if (!config) return c.json({ connected: false, store: null })

  const storeDomain = config.api_base_url ? new URL(config.api_base_url).hostname : 'dptattoo.myshopify.com'
  const lastOutbound = await c.env.DB.prepare("SELECT MAX(created_at) as last_sync FROM inventory_outbounds WHERE note LIKE '%Shopify Order%'").first() as any
  const outboundStats = await c.env.DB.prepare("SELECT COUNT(DISTINCT shopify_order_id) as dedup_orders, COUNT(*) as total_lines FROM inventory_outbounds WHERE shopify_order_id != ''").first() as any
  const lastOrder = await c.env.DB.prepare('SELECT created_at FROM orders ORDER BY created_at DESC LIMIT 1').first() as any

  return c.json({
    connected: true,
    store: storeDomain.replace('.myshopify.com', ''),
    lastDeduct: lastOutbound?.last_sync || null,
    deductedOrders: outboundStats?.dedup_orders || 0,
    deductedLines: outboundStats?.total_lines || 0,
    lastFulfillmentOrder: lastOrder?.created_at || null,
    hasToken: !!config.api_key
  })
})

app.get('/api/shopify/orders/deduct', async (c) => {
  const forceOrder = c.req.query('force');
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any
  if (!config) return c.json({ error: 'Shopify not configured' }, 400)

  // Allow updating token via ?token=xxx&client_id=xxx&client_secret=xxx
  const newToken = c.req.query('token');
  const newClientId = c.req.query('client_id');
  const newClientSecret = c.req.query('client_secret');
  if (newToken) {
    await c.env.DB.prepare('UPDATE carrier_configs SET api_key = ? WHERE id = ?').bind(newToken, config.id).run();
    config.api_key = newToken;
  }
  if (newClientId) {
    await c.env.DB.prepare('UPDATE carrier_configs SET api_secret = ? WHERE id = ?').bind(newClientId, config.id).run();
  }
  if (newClientSecret) {
    await c.env.DB.prepare('UPDATE carrier_configs SET extra_config = ? WHERE id = ?').bind(JSON.stringify({client_secret: newClientSecret}), config.id).run();
  }

  const accessToken = config.api_key
  const storeDomain = config.api_base_url ? new URL(config.api_base_url).hostname : 'dptattoo.myshopify.com'
  const apiVersion = '2024-10'
  const now = Date.now()
  let totalOrders = 0
  let deductedItems: any[] = []
  let ordersUrl = `https://${storeDomain}/admin/api/${apiVersion}/orders.json?status=any&fulfillment_status=any&created_at_min=${new Date(Date.now() - 7*86400000).toISOString()}&limit=250`

  while (ordersUrl) {
    const resp = await fetch(ordersUrl, { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } })
    if (!resp.ok) return c.json({ error: `Shopify API ${resp.status}: ${(await resp.text()).slice(0,240)}` }, 502)
    const payload = await resp.json() as any
    const orders = Array.isArray(payload?.orders) ? payload.orders : []

    // Force import a specific order by number
    if (forceOrder && orders.length === 0) {
      const forceResp = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/orders.json?name=%23${forceOrder}&status=any&limit=1`, {
        headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
      });
      if (forceResp.ok) {
        const forceData = await forceResp.json() as any;
        if (forceData.orders?.length) orders.push(forceData.orders[0]);
      }
    }

    for (const order of orders) {
      const orderId = String(order.id)
      const orderName = String(order.order_number || '')
      const customerNote = String(order.note || '').trim()
      const customerName = order.customer ? `${order.customer.first_name||''} ${order.customer.last_name||''}`.trim() : ''

      const existing = await c.env.DB.prepare('SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? LIMIT 1').bind(orderId).first()
      if (existing) continue

      for (const item of (order.line_items || [])) {
        const sku = String(item.sku || '').trim()
        const qty = Number(item.quantity) || 0
        if (!sku || qty <= 0) continue
        const product = await c.env.DB.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind(sku).first()
        if (!product) continue
        const outboundDate = new Date().toISOString().split('T')[0]
        const noteParts = [`Shopify Order #${orderName}`]
        if (customerNote) noteParts.push(`?��?�쨢???: ${customerNote}`)
        if (item.title) noteParts.push(`����?��: ${item.title}`)
        await c.env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
          .bind(sku, qty, 'B2C', customerName||'Shopify Customer', orderId, outboundDate, noteParts.join(' | '), now).run()
        deductedItems.push({ sku, qty, order: orderName })
      }

      // Gift deduction from notes
      if (customerNote) {
        for (const gift of parseGiftSkus(customerNote)) {
          const gp = await c.env.DB.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind(gift.sku).first()
          if (!gp) continue
          const outboundDate = new Date().toISOString().split('T')[0]
          await c.env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
            .bind(gift.sku, gift.qty, 'B2C', customerName||'Shopify Customer', orderId, outboundDate, `Shopify Order #${orderName} | ?��?��?��: ${gift.name}`, now).run()
          deductedItems.push({ sku: gift.sku, qty: gift.qty, order: orderName, item: `???��?�� ${gift.name}` })
        }
      }
      totalOrders++
    }
    const linkHeader = resp.headers.get('link')
    ordersUrl = linkHeader ? parseNextLink(linkHeader) : null
  }
  return c.json({ ok: true, ordersProcessed: totalOrders, itemsDeducted: deductedItems.length, details: deductedItems })
})

app.get('/api/shopify/order/:orderNumber', async (c) => {
  const orderNumber = c.req.param('orderNumber');
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any;
  if (!config) return c.json({ error: 'Shopify not configured' }, 400);
  const accessToken = config.api_key;
  const storeDomain = config.api_base_url ? new URL(config.api_base_url).hostname : 'dptattoo.myshopify.com';
  const apiVersion = '2024-10';
  const resp = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/orders.json?name=%23${orderNumber}&status=any&limit=10`, {
    headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
  });
  if (!resp.ok) return c.json({ error: `Shopify ${resp.status}` }, 502);
  const data = await resp.json() as any;
  const order = data.orders?.[0];
  if (!order) return c.json({ error: 'Order not found' }, 404);
  const items = (order.line_items || []).map((item: any) => ({
    sku: item.sku || item.variant_sku || '',
    name: item.name || '',
    quantity: item.quantity || 0,
    price: item.price || 0
  }));
  return c.json({
    ok: true,
    order: {
      id: order.id,
      order_number: order.order_number,
      name: '#' + order.order_number,
      customer: order.customer?.firstName + ' ' + order.customer?.lastName || order.customer?.email || '',
      created_at: order.created_at,
      items
    }
  });
});

app.get('/api/shopify/order/:orderNumber/import', async (c) => {
  const orderNumber = c.req.param('orderNumber');
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any;
  if (!config) return c.json({ error: 'Shopify not configured' }, 400);
  const accessToken = config.api_key;
  const storeDomain = config.api_base_url ? new URL(config.api_base_url).hostname : 'dptattoo.myshopify.com';
  const apiVersion = '2024-10';
  const resp = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/orders.json?name=%23${orderNumber}&status=any&limit=1`, {
    headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' }
  });
  if (!resp.ok) return c.json({ error: `Shopify ${resp.status}` }, 502);
  const data = await resp.json() as any;
  const order = data.orders?.[0];
  if (!order) return c.json({ error: 'Order not found' }, 404);
  
  const orderId = '#' + orderNumber;
  const customerName = (order.customer?.firstName || '') + ' ' + (order.customer?.lastName || '') || order.shipping_address?.name || order.customer?.email || order.email || 'Shopify Customer';
  const outboundDate = (order.createdAt || '').slice(0,10) || new Date().toISOString().slice(0,10);
  let imported = 0; let failed = 0;
  
  for (const item of (order.line_items || [])) {
    const rawSku = (item.sku || item.variant_sku || '').toUpperCase();
    // Strip PEACH- prefix if the SKU doesn't exist
    let sku = rawSku;
    const exists = await c.env.DB.prepare('SELECT id FROM inventory_products WHERE sku = ? LIMIT 1').bind(sku).first();
    if (!exists && sku.startsWith('PEACH-')) {
      sku = sku.replace('PEACH-', '');
      // Try CON- or COG- prefix for numeric SKUs
      if (/^PEACH-CON-/i.test(rawSku)) sku = rawSku.replace(/^PEACH-CON-/i, 'CON-');
      if (/^PEACH-COG-/i.test(rawSku)) sku = rawSku.replace(/^PEACH-COG-/i, 'COG-');
      if (/^PEACH-AES-/i.test(rawSku)) sku = rawSku.replace(/^PEACH-AES-/i, 'AES-');
    }
    // Manual SKU mapping
    const skuMap: Record<string, string> = { 'PEACH-IC-1': 'PIC-BLACK', 'PEACH-IC-2': 'PIC-PINK' };
    if (skuMap[sku]) sku = skuMap[sku];
    if (skuMap[rawSku]) sku = skuMap[rawSku];
    if (!sku || item.quantity <= 0) { failed++; continue; }
    try {
      await c.env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(sku, item.quantity, 'B2C', customerName, orderId, outboundDate, 'Shopify Order #' + orderNumber, Date.now()).run();
      imported++;
    } catch { failed++; }
  }
  
  return c.json({ ok: true, order: '#' + orderNumber, imported, failed });
});

app.get('/api/shopify/fix-name/:orderNumber/:name', async (c) => {
  const orderNo = c.req.param('orderNumber');
  const name = c.req.param('name');
  await c.env.DB.prepare('UPDATE inventory_outbounds SET customer_name = ? WHERE shopify_order_id = ?').bind(name, '#' + orderNo).run();
  return c.json({ ok: true, fixed: '#' + orderNo, name });
});

const parseNextLink = (linkHeader: string | null): string | null => {
  if (!linkHeader) return null
  for (const part of linkHeader.split(',')) {
    if (!part.includes('rel="next"')) continue
    const m = part.match(/<([^>]+)>/)
    if (m?.[1]) return m[1]
  }
  return null
}

// ============ Shopify Fulfillment Sync ============

app.post('/api/fulfillment/shopify/sync', async (c) => {
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any
  if (!config) return c.json({ error: 'Shopify not configured, run OAuth first' }, 400)
  const token = config.api_key
  const baseUrl = config.api_base_url || 'https://dptattoo.myshopify.com/admin/api/2024-04'
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  let page = 1, synced = 0, hasMore = true

  while (hasMore) {
    const r = await fetch(baseUrl + '/orders.json?limit=50&created_at_min=' + since + '&page=' + page, {
      headers: { 'X-Shopify-Access-Token': token }
    })
    const data = await r.json() as any
    const orders = data.orders || []
    if (orders.length === 0) { hasMore = false; break }

    for (const o of orders) {
      const addr = o.shipping_address || o.customer?.default_address || {}
      const now = Date.now()
      const r2 = await c.env.DB.prepare(`INSERT OR IGNORE INTO orders (order_number,source,status,customer_name,customer_email,country,state,city,zip_code,address,phone,currency,notes,created_at,updated_at) VALUES (?,'shopify','pending',?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(String(o.order_number), o.shipping_address?.name||o.customer?.name||'', o.email||'', addr.country_code||addr.country||'', addr.province||'', addr.city||'', addr.zip||'', addr.address1||'', addr.phone||'', o.currency||'USD', o.note||'', new Date(o.created_at).getTime()||now, now).run()
      if (r2.meta.changes > 0) {
        const orderId = r2.meta.last_row_id
        for (const item of (o.line_items || [])) {
          await c.env.DB.prepare('INSERT OR IGNORE INTO order_items (order_id,sku,product_name,quantity,unit_price) VALUES (?,?,?,?,?)')
            .bind(orderId, item.sku||'', item.name||'', item.quantity||1, Number(item.price)||0).run()
        }
        synced++
      }
    }
    page++
  }
  return c.json({ ok: true, synced, message: `Synced ${synced} orders` })
})

// ============ Shopify Webhook ============

app.post('/api/shopify/webhook/orders-create', async (c) => {
  const order = await c.req.json() as any
  if (!order?.id) return c.json({ error: 'Invalid payload' }, 400)

  const orderId = String(order.id)
  const orderName = String(order.order_number || '')
  const existing = await c.env.DB.prepare('SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? LIMIT 1').bind(orderId).first()
  if (existing) return c.json({ ok: true, skipped: true, reason: 'already processed' })

  const financialStatus = String(order.financial_status || '').toLowerCase()
  if (financialStatus !== 'paid' && financialStatus !== 'partially_paid') {
    return c.json({ ok: true, skipped: true, reason: `not paid (${financialStatus})` })
  }

  const customerName = order.customer ? `${order.customer.first_name||''} ${order.customer.last_name||''}`.trim() : ''
  const customerNote = String(order.note || '').trim()
  const now = Date.now()
  let deductedCount = 0

  for (const item of (order.line_items || [])) {
    const sku = String(item.sku || '').trim()
    const qty = Number(item.quantity) || 0
    if (!sku || qty <= 0) continue
    const product = await c.env.DB.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind(sku).first()
    if (!product) continue
    const outboundDate = new Date().toISOString().split('T')[0]
    const noteParts = [`Shopify Order #${orderName}`, '����?��: webhook']
    if (customerNote) noteParts.push(`?��?�쨢???: ${customerNote}`)
    if (item.title) noteParts.push(`����?��: ${item.title}`)
    await c.env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(sku, qty, 'B2C', customerName||'Shopify Customer', orderId, outboundDate, noteParts.join(' | '), now).run()
    deductedCount++
  }

  // Gift deduction
  if (customerNote) {
    for (const gift of parseGiftSkus(customerNote)) {
      const gp = await c.env.DB.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind(gift.sku).first()
      if (!gp) continue
      const outboundDate = new Date().toISOString().split('T')[0]
      await c.env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(gift.sku, gift.qty, 'B2C', customerName||'Shopify Customer', orderId, outboundDate, `Shopify Order #${orderName} | ?��?��?��: ${gift.name}`, now).run()
      deductedCount++
    }
  }

  // Also write to orders table for fulfillment
  try {
    const addr = order.shipping_address || order.customer?.default_address || {}
    await c.env.DB.prepare(`INSERT OR IGNORE INTO orders (order_number,source,status,customer_name,customer_email,country,state,city,zip_code,address,phone,currency,notes,created_at,updated_at) VALUES (?,'shopify','pending',?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(orderName, customerName||'Shopify Customer', order.email||'', addr.country_code||addr.country||'', addr.province||'', addr.city||'', addr.zip||'', addr.address1||'', addr.phone||'', order.currency||'USD', order.note||'', new Date(order.created_at).getTime()||now, now).run()
  } catch {}

  return c.json({ ok: true, orderId, orderName, itemsDeducted: deductedCount })
})

// ============ SHIP (via carrier API, need to keep on VPS) ============
// Ship creation requires local carrier scripts (yanwen/equick API calls from Node.js)
// This endpoint on Worker is a stub; actual ship calls still hit the VPS Express server

app.post('/api/fulfillment/orders/:id/ship', async (c) => {
  return c.json({ error: 'Shipping requires local carrier API integration on VPS. Use VPS Express server for ship operations.' }, 400)
})

// ============ DISTRIBUTOR (needs Neon ?a keep on VPS) ============

app.get('/api/inventory/distributor-candidates', async (c) => {
  return c.json({ error: 'Distributor import requires Neon DB on VPS' }, 400)
})
app.post('/api/inventory/import-distributor', async (c) => {
  return c.json({ error: 'Distributor import requires Neon DB on VPS' }, 400)
})

// ============ INVENTORY SOURCE LOAD (CSV import ?a keep on VPS) ============

app.post('/api/inventory/source/load', async (c) => {
  return c.json({ error: 'CSV import requires local filesystem access on VPS' }, 400)
})

// ============ USER SCRAPE CONFIGS ============

app.get('/api/scrape/configs', async (c) => {
  const { uid } = c.get('user')
  const rows = await c.env.DB.prepare(
    'SELECT * FROM user_scrape_configs WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(uid).all()
  return c.json({ ok: true, items: rows.results || [] })
})

app.post('/api/scrape/configs', async (c) => {
  const { uid, email } = c.get('user')
  const { keyword, city, country } = await c.req.json()
  if (!keyword || !city) return c.json({ error: 'keyword and city required' }, 400)

  // Check quota
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE user_id = ?').bind(uid).first() as any
  if (user) {
    const today = new Date().toISOString().split('T')[0]
    const todayCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as c FROM user_scrape_configs WHERE user_id = ? AND date(created_at / 1000, 'unixepoch') = ?"
    ).bind(uid, today).first() as any
    if (todayCount && todayCount.c >= (user.quota_daily_scrape || 10)) {
      return c.json({ error: `Daily quota exceeded (${user.quota_daily_scrape}/day)` }, 429)
    }
  }

  const now = Date.now()
  await c.env.DB.prepare(`
    INSERT INTO user_scrape_configs (user_id, user_email, keyword, city, country, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(uid, email || '', keyword, city, country || 'US', now, now).run()
  // Log usage
  try { await c.env.DB.prepare('INSERT INTO usage_logs (user_id, action, metadata, created_at) VALUES (?, ?, ?, ?)')
    .bind(uid, 'scrape_submit', JSON.stringify({ keyword, city, country }), now).run()
  } catch {}

  return c.json({ ok: true })
})

app.delete('/api/scrape/configs/:id', async (c) => {
  const { uid } = c.get('user')
  const r = await c.env.DB.prepare(
    'DELETE FROM user_scrape_configs WHERE id = ? AND user_id = ?'
  ).bind(c.req.param('id'), uid).run()
  return c.json({ ok: true, deleted: r.meta.changes > 0 })
})

// ============ VPS POLL ENDPOINT ============
// The VPS bot polls this endpoint to get pending scrape tasks

app.get('/api/scrape/pending', async (c) => {
  const token = c.req.query('token')
  if (token !== 'vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401)
  const rows = await c.env.DB.prepare(
    "SELECT * FROM user_scrape_configs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5"
  ).all()
  return c.json({ ok: true, items: rows.results || [] })
})

app.post('/api/scrape/update-status', async (c) => {
  const { token } = c.req.query()
  if (token !== 'vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401)
  const { id, status, result } = await c.req.json()
  if (!id || !status) return c.json({ error: 'id and status required' }, 400)
  const now = Date.now()
  await c.env.DB.prepare('UPDATE user_scrape_configs SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, now, id).run()
  if (status === 'running') {
    try { await c.env.DB.prepare('INSERT INTO usage_logs (user_id, action, metadata, created_at) VALUES (?, ?, ?, ?)')
      .bind('system', 'scrape_start', JSON.stringify({ configId: id }), now).run()
    } catch {}
  }
  return c.json({ ok: true })
})





// ============ USER REGISTRATION & APPROVAL ============


// GET /api/auth/permissions/:email
app.get('/api/auth/permissions/:email', async (c) => {
  await ensurePermsTable(c.env.DB);
  const { email } = c.req.param();
  const row = await c.env.DB.prepare('SELECT tabs FROM user_permissions WHERE email = ?').bind(email).first() as any;
  return c.json({ tabs: row ? JSON.parse(row.tabs) : null });
});

// POST /api/auth/permissions/:email
app.post('/api/auth/permissions/:email', async (c) => {
  await ensurePermsTable(c.env.DB);
  const { uid, email: callerEmail } = c.get('user');
  // Allow hardcoded superuser (matches frontend + middleware logic) OR D1 admin role
  let isAdmin = callerEmail === 'snow368@gmail.com';
  if (!isAdmin) {
    const me = await c.env.DB.prepare('SELECT role FROM users WHERE user_id = ?').bind(uid).first() as any;
    isAdmin = me?.role === 'admin';
  }
  if (!isAdmin) return c.json({ error: 'forbidden' }, 403);
  const { email } = c.req.param();
  const { tabs } = await c.req.json();
  await c.env.DB.prepare('INSERT OR REPLACE INTO user_permissions (email, tabs, updated_at) VALUES (?,?,?)')
    .bind(email, JSON.stringify(tabs || []), Date.now()).run();
  return c.json({ ok: true });
});

// Ensure perms table on first use
async function ensurePermsTable(db) {
  try { await db.prepare('CREATE TABLE IF NOT EXISTS user_permissions (email TEXT PRIMARY KEY, tabs TEXT, updated_at INTEGER)').run(); } catch {}
}
async function ensureUsersTable(db: D1Database) {
  try { await db.prepare("CREATE TABLE IF NOT EXISTS access_requests (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, reason TEXT, status TEXT DEFAULT 'pending', role TEXT DEFAULT 'user', created_at INTEGER, approved_at INTEGER, approved_by TEXT)").run(); } catch {}
  try { await db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run(); } catch {}
  try { await db.prepare("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'").run(); } catch {}
}

// POST /api/auth/register
app.post('/api/auth/register', async (c) => {
  await ensureUsersTable(c.env.DB);
  const { email, name, reason } = await c.req.json();
  if (!email) return c.json({ error: 'email required' }, 400);
  const existing = await c.env.DB.prepare('SELECT status FROM access_requests WHERE email = ?').bind(email).first() as any;
  if (existing?.status === 'approved') return c.json({ ok: true, message: 'already approved' });
  if (existing?.status === 'pending') return c.json({ ok: true, message: 'already pending' });
  const id = 'req-' + Date.now().toString(36);
  await c.env.DB.prepare('INSERT INTO access_requests (id,email,name,reason,status,created_at) VALUES (?,?,?,?,?,?)')
    .bind(id, email, name||'', reason||'', 'pending', Date.now()).run();
  return c.json({ ok: true, id });
});

// GET /api/auth/register-status/:email
app.get('/api/auth/register-status/:email', async (c) => {
  await ensureUsersTable(c.env.DB);
  const { email } = c.req.param();
  const d = await c.env.DB.prepare('SELECT status, role FROM access_requests WHERE email = ?').bind(email).first() as any;
  if (d?.status === 'approved') return c.json({ ok: true, status: 'approved', role: d.role || 'user' });
  if (d?.status === 'pending') return c.json({ ok: false, status: 'pending', message: 'Waiting for admin approval' });
  if (d?.status === 'rejected') return c.json({ ok: false, status: 'rejected', message: 'Access denied' });
  return c.json({ ok: false, status: 'none', message: 'Not registered. Please request access.' });
});

// GET /api/auth/pending-users (admin only)
app.get("/api/auth/pending-users", async (c) => {
  await ensureUsersTable(c.env.DB);
  const { uid } = c.get("user");
  const me = await c.env.DB.prepare("SELECT role FROM users WHERE user_id = ?").bind(uid).first() as any;
  if (me?.role !== "admin") return c.json({ error: "forbidden" }, 403);
  const { results } = await c.env.DB.prepare("SELECT * FROM access_requests ORDER BY created_at DESC LIMIT 100").all();
  return c.json({ users: results });
});

// POST /api/auth/approve (admin only)
app.post("/api/auth/approve", async (c) => {
  await ensureUsersTable(c.env.DB);
  const { uid } = c.get("user");
  const me = await c.env.DB.prepare("SELECT role FROM users WHERE user_id = ?").bind(uid).first() as any;
  if (me?.role !== "admin") return c.json({ error: "forbidden" }, 403);
  const { id, action } = await c.req.json();
  if (action === 'approve') {
    await c.env.DB.prepare("UPDATE access_requests SET status = 'approved', approved_at = ? WHERE id = ?").bind(Date.now(), id).run();
    const rd = await c.env.DB.prepare("SELECT email FROM access_requests WHERE id = ?").bind(id).first() as any;
    if (rd?.email) await c.env.DB.prepare("INSERT OR IGNORE INTO users (user_id, email, role, status, created_at) VALUES (?,?,?,?,?)").bind('email_' + rd.email, rd.email, 'user', 'active', Date.now()).run();
  } else {
    await c.env.DB.prepare("UPDATE access_requests SET status = 'rejected' WHERE id = ?").bind(id).run();
  }
  return c.json({ ok: true });
});





// GET /api/migrate-users — public endpoint, checks admin via query param
app.get('/api/migrate-users', async (c) => {
  const adminEmail = c.req.query('admin') || '';
  if (adminEmail !== 'snow368@gmail.com') {
    // Try JWT auth
    try {
      const { uid } = c.get('user');
      const me = await c.env.DB.prepare('SELECT role FROM users WHERE user_id = ?').bind(uid).first() as any;
      if (me?.role !== 'admin') throw new Error('not admin');
    } catch {
      return c.json({ error: 'forbidden' }, 403);
    }
  }
  try {
    const approved = await c.env.DB.prepare("SELECT email FROM access_requests WHERE status = 'approved'").all();
    const results = [];
    for (const r of (approved.results || [])) {
      const email = (r as any).email;
      if (email) {
        const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (!existing) {
          await c.env.DB.prepare('INSERT INTO users (user_id, email, role, quota_daily_scrape, quota_total_scrape, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
            .bind('email_' + email, email, 'user', 10, 100, Date.now(), Date.now()).run();
          results.push('inserted ' + email);
        } else {
          results.push('exists ' + email);
        }
      }
    }
    const all = await c.env.DB.prepare('SELECT email FROM users ORDER BY created_at DESC').all();
    return c.json({ migrated: results.length, details: results, users: (all.results || []).map(r => (r as any).email) });
  } catch (e: any) {
    return c.json({ error: e?.message || String(e) }, 500);
  }
});
// ============ AUTH PROXY (Firebase REST API bypass) ============

// POST /api/auth/signin
app.post('/api/auth/signin', async (c) => {
  const { email, password } = await c.req.json();
  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCiCeZ7cyqtDW6NeLk6Ikvv3H3MX1_UbXs';
  const resp = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await resp.json();
  if (resp.ok && data.localId) {
    await c.env.DB.prepare("INSERT OR IGNORE INTO users (user_id, email, role, status, created_at) VALUES (?,?,?,?,?)")
      .bind('email_' + data.email, data.email, 'user', 'active', Date.now()).run();
  }
  return c.json(data, resp.ok ? 200 : 400);
});

// POST /api/auth/signup
app.post('/api/auth/signup', async (c) => {
  const { email, password } = await c.req.json();
  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCiCeZ7cyqtDW6NeLk6Ikvv3H3MX1_UbXs';
  const resp = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await resp.json();
  return c.json(data, resp.ok ? 200 : 400);
});

// POST /api/auth/refresh
// Refreshes a Firebase ID token using the long-lived refresh token.
// Runs on Cloudflare -> Google (NOT browser -> Google), so it works behind the GFW
// where identitytoolkit.googleapis.com is blocked from the client.
app.post('/api/auth/refresh', async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) return c.json({ error: 'refreshToken required' }, 400);
  const url = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyCiCeZ7cyqtDW6NeLk6Ikvv3H3MX1_UbXs';
  try {
    const resp = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken })
    });
    const data = await resp.json();
    if (!resp.ok) return c.json(data, 400);
    return c.json({
      idToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    });
  } catch (e: any) {
    return c.json({ error: 'refresh_failed', detail: e?.message || String(e) }, 502);
  }
});

// POST /api/auth/reset
app.post('/api/auth/reset', async (c) => {
  const { email } = await c.req.json();
  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=AIzaSyCiCeZ7cyqtDW6NeLk6Ikvv3H3MX1_UbXs';
  const resp = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, requestType: 'PASSWORD_RESET' })
  });
  const data = await resp.json();
  return c.json(data, resp.ok ? 200 : 400);
});

// POST /api/auth/google
app.post('/api/auth/google', async (c) => {
  const { idToken } = await c.req.json();
  if (!idToken) return c.json({ error: 'idToken required' }, 400);
  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=AIzaSyCiCeZ7cyqtDW6NeLk6Ikvv3H3MX1_UbXs';
  const resp = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestUri: 'http://localhost',
      postBody: 'id_token=' + idToken + '&providerId=google.com',
      returnSecureToken: true
    })
  });
  const data = await resp.json();
  if (!resp.ok) return c.json(data, 400);
  return c.json({
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    displayName: data.displayName,
    photoUrl: data.photoUrl
  });
});
// ============ AUTH CHECK ============

app.get('/api/auth/me', async (c) => {
  const user = c.get('user')
  return c.json({ ok: true, uid: user.uid, email: user.email })
})

// ============ ADMIN: USER MANAGEMENT ============

app.get('/api/admin/users', async (c) => {
  const { uid } = c.get('user')
  const me = await c.env.DB.prepare('SELECT role FROM users WHERE user_id = ?').bind(uid).first() as any
  if (me?.role !== 'admin') return c.json({ error: 'forbidden' }, 403)
  // Sync approved access_requests into users table
  try {
    const approved = await c.env.DB.prepare("SELECT email FROM access_requests WHERE status = 'approved'").all()
    for (const r of (approved.results || [])) {
      const email: string = (r as any).email
      if (email) {
        await c.env.DB.prepare("INSERT OR IGNORE INTO users (user_id, email, role, quota_daily_scrape, quota_total_scrape, created_at, updated_at) VALUES (?,?,?,?,?,?,?)")
          .bind('email_' + email, email, 'user', 10, 100, Date.now(), Date.now()).run()
      }
    }
  } catch (e: any) { console.error('sync error:', e?.message || e) }
  const rows = await c.env.DB.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM user_scrape_configs WHERE user_id = u.user_id) as total_tasks,
      (SELECT COUNT(*) FROM user_scrape_configs WHERE user_id = u.user_id AND status = 'completed') as completed_tasks
    FROM users u ORDER BY u.created_at DESC
  `).all()
  return c.json({ ok: true, users: rows.results || [] })
})

app.post('/api/admin/users/:uid/quota', async (c) => {
  const { uid: adminUid } = c.get('user')
  const me = await c.env.DB.prepare('SELECT role FROM users WHERE user_id = ?').bind(adminUid).first() as any
  if (me?.role !== 'admin') return c.json({ error: 'forbidden' }, 403)
  const targetUid = c.req.param('uid')
  const { quota_daily_scrape, quota_total_scrape, role } = await c.req.json()
  if (quota_daily_scrape) await c.env.DB.prepare('UPDATE users SET quota_daily_scrape = ? WHERE user_id = ?').bind(quota_daily_scrape, targetUid).run()
  if (quota_total_scrape) await c.env.DB.prepare('UPDATE users SET quota_total_scrape = ? WHERE user_id = ?').bind(quota_total_scrape, targetUid).run()
  if (role) await c.env.DB.prepare('UPDATE users SET role = ? WHERE user_id = ?').bind(role, targetUid).run()
  return c.json({ ok: true })
})

app.get('/api/admin/stats', async (c) => {
  const { uid } = c.get('user')
  const me = await c.env.DB.prepare('SELECT role FROM users WHERE user_id = ?').bind(uid).first() as any
  if (me?.role !== 'admin') return c.json({ error: 'forbidden' }, 403)
  const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as c FROM users').first() as any
  const totalTasks = await c.env.DB.prepare('SELECT COUNT(*) as c FROM user_scrape_configs').first() as any
  const pendingTasks = await c.env.DB.prepare("SELECT COUNT(*) as c FROM user_scrape_configs WHERE status = 'pending'").first() as any
  return c.json({ ok: true, stats: {
    totalUsers: totalUsers?.c || 0,
    totalTasks: totalTasks?.c || 0,
    pendingTasks: pendingTasks?.c || 0,
  }})
})

// ============ BOT ACCOUNT CONFIG (write to Neon, read D1 dashboard) ============

app.post('/api/automation/bot-account', async (c) => {
  try {
    const { account_id, ig_handle } = await c.req.json();
    if (!account_id) return c.json({ error: 'account_id required' }, 400);
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_accounts (account_id TEXT PRIMARY KEY, ig_handle TEXT, created_at TEXT, stage TEXT DEFAULT 'new', daily_task_limit INTEGER DEFAULT 5, speed_factor REAL DEFAULT 2.5, first_used_at TEXT, vps_name TEXT, proxy TEXT)`).run();
    try { await c.env.DB.prepare('ALTER TABLE bot_accounts ADD COLUMN created_at TEXT').run(); } catch {}
    const now = new Date().toISOString();
    // D???o?�������?������??��?��?��D??o?2??2??
    const existing = await c.env.DB.prepare('SELECT created_at FROM bot_accounts WHERE account_id=?').bind(account_id).first() as any;
    if (existing?.created_at) {
      await c.env.DB.prepare('UPDATE bot_accounts SET ig_handle=? WHERE account_id=?').bind(ig_handle || '', account_id).run();
    } else {
      await c.env.DB.prepare('INSERT INTO bot_accounts (account_id, ig_handle, created_at) VALUES (?, ?, ?)').bind(account_id, ig_handle || '', now).run();
    }
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500); }
});

app.get('/api/automation/bot-account', async (c) => {
  const botId = c.req.query('botId');
  if (!botId) return c.json({ error: 'botId required' }, 400);
  try {
    // Ensure table exists
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_accounts (
      account_id TEXT PRIMARY KEY, ig_handle TEXT, stage TEXT DEFAULT 'new',
      daily_task_limit INTEGER DEFAULT 5, speed_factor REAL DEFAULT 2.5,
      first_used_at TEXT, vps_name TEXT, proxy TEXT
    )`).run();
    try { await c.env.DB.prepare('ALTER TABLE bot_accounts ADD COLUMN vps_name TEXT').run(); } catch {}
    try { await c.env.DB.prepare('ALTER TABLE bot_accounts ADD COLUMN proxy TEXT').run(); } catch {}
    try { await c.env.DB.prepare('ALTER TABLE bot_accounts ADD COLUMN first_used_at TEXT').run(); } catch {}
    await c.env.DB.prepare('DELETE FROM bot_accounts WHERE account_id=?').bind(botId).run();
    await c.env.DB.prepare(`INSERT INTO bot_accounts (account_id, ig_handle, first_used_at, vps_name, proxy) VALUES (?, ?, ?, ?, ?)`)
      .bind(botId, c.req.query('igHandle') || null, c.req.query('firstUsedAt') || null,
            c.req.query('vpsName') || null, c.req.query('proxyIp') || null).run();
    // Return all accounts so frontend can update table directly
    const all = await c.env.DB.prepare('SELECT account_id, ig_handle, stage, daily_task_limit, speed_factor, first_used_at, vps_name, proxy FROM bot_accounts').all();
    return c.json({
      ok: true,
      accounts: (all.results || []).map((a: any) => ({
        accountId: a.account_id, igHandle: a.ig_handle, stage: a.stage,
        dailyLimit: a.daily_task_limit, speed: a.speed_factor,
        firstUsedAt: a.first_used_at || null,
        vpsName: a.vps_name || null, proxy: a.proxy || null,
      })),
    });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

app.get('/api/automation/bot-account/delete', async (c) => {
  const botId = c.req.query('botId');
  if (!botId) return c.json({ error: 'botId required' }, 400);
  try {
    await c.env.DB.prepare('DELETE FROM bot_accounts WHERE account_id=?').bind(botId).run();
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

// ============ SYNC ENDPOINT (called by VPS server to push data to D1) ============

app.post('/api/automation/sync', async (c) => {
  const token = c.req.header('x-sync-token');
  if (token !== 'vps-sync-token-2026') return c.json({ error: 'unauthorized' }, 401);
  const body: any = await c.req.json();

  // Migrate D1 schema if needed
  try { await c.env.DB.prepare('ALTER TABLE bot_accounts ADD COLUMN first_used_at TEXT').run(); } catch {}
  try { await c.env.DB.prepare('ALTER TABLE bot_accounts ADD COLUMN vps_name TEXT').run(); } catch {}
  try { await c.env.DB.prepare('ALTER TABLE bot_accounts ADD COLUMN proxy TEXT').run(); } catch {}

  // Insert/update sync data
  if (body.counts) {
    try {
      await c.env.DB.prepare('DELETE FROM automation_tasks').run();
      for (const [status, cnt] of Object.entries(body.counts)) {
        if (Number(cnt) > 0) {
          await c.env.DB.prepare('INSERT INTO automation_tasks (id, status, created_at) VALUES (?, ?, ?)')
            .bind(`sync_${status}`, status, Date.now()).run();
        }
      }
    } catch { /* table may not exist yet */ }
  }

  // Daily stats
  if (body.daily) {
    try {
      await c.env.DB.prepare('DELETE FROM daily_task_stats').run();
      for (const d of body.daily) {
        await c.env.DB.prepare('INSERT INTO daily_task_stats (day, status, cnt) VALUES (?, ?, ?)')
          .bind(d.day, d.status, d.cnt).run();
      }
    } catch {}
  }

  // Bot accounts�ꡧ??��y����2?��|������?����?1?��??��?
  if (body.accounts?.length) {
    try {
      await c.env.DB.prepare('DELETE FROM bot_accounts').run();
      for (const a of body.accounts) {
        await c.env.DB.prepare('INSERT INTO bot_accounts (account_id, ig_handle, stage, daily_task_limit, speed_factor, first_used_at, vps_name, proxy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(a.account_id, a.ig_handle, a.stage, a.daily_task_limit, a.speed_factor, a.first_used_at || null, a.vps_name || null, a.proxy || null).run();
      }
    } catch {}
  }

  return c.json({ ok: true });
});

// ============ DASHBOARD (read from D1) ============

app.get('/api/automation/dashboard', async (c) => {
  // Each query independently ?a missing tables don't cascade
  let counts: Record<string, number> = { pending: 0, leased: 0, done: 0, failed: 0 };
  let byDay: Record<string, any> = {};
  let accountsList: any[] = [];

  try {
    const summary = await c.env.DB.prepare('SELECT status, COUNT(*) as cnt FROM automation_tasks GROUP BY status').all();
    for (const r of (summary.results || []) as any) counts[r.status] = Number(r.cnt || 0);
  } catch {}

  try {
    const daily = await c.env.DB.prepare('SELECT day, status, cnt FROM daily_task_stats ORDER BY day DESC LIMIT 56').all();
    for (const r of (daily.results || []) as any) {
      if (!byDay[r.day]) byDay[r.day] = { day: r.day, pending: 0, leased: 0, done: 0, failed: 0, total: 0 };
      byDay[r.day][r.status] = Number(r.cnt || 0);
      byDay[r.day].total += Number(r.cnt || 0);
    }
  } catch {}

  try {
    const accounts = await c.env.DB.prepare('SELECT account_id, ig_handle, stage, daily_task_limit, speed_factor, first_used_at, vps_name, proxy FROM bot_accounts').all();
    accountsList = (accounts.results || []).map((a: any) => ({
      accountId: a.account_id, igHandle: a.ig_handle, stage: a.stage,
      dailyLimit: a.daily_task_limit, speed: a.speed_factor,
      firstUsedAt: a.first_used_at || null,
      vpsName: a.vps_name || null, proxy: a.proxy || null,
    }));
  } catch {}

  return c.json({
    ok: true,
    total: Object.values(counts).reduce((a: number, b: number) => a + b, 0),
    counts,
    days: Object.values(byDay).sort((a: any, b: any) => String(b.day).localeCompare(String(a.day))),
    accounts: accountsList,
  });
});

// Frontend DataDashboard: task counts summary (Neon tasks + D1 daily stats)
app.get('/api/automation/task-counts', async (c) => {
  let counts: Record<string, number> = { pending: 0, leased: 0, done: 0, failed: 0 };
  // D1 daily_task_stats (historical sync from VPS)
  try {
    const stats = await c.env.DB.prepare(
      `SELECT status, SUM(cnt) as total FROM daily_task_stats GROUP BY status`
    ).all();
    for (const r of (stats.results || []) as any) {
      const total = Number(r.total || 0);
      if (r.status === 'pending') counts.pending += total;
      else if (r.status === 'leased' || r.status === 'running') counts.leased += total;
      else if (r.status === 'done') counts.done += total;
      else if (r.status === 'failed') counts.failed += total;
    }
  } catch {}
  // VPS Express (has historical data in SQLite)
  try {
    const vps = await fetch(`http://163.245.212.169:3000/api/dashboard/status-counts`, { signal: AbortSignal.timeout(3000) });
    if (vps.ok) {
      const d = await vps.json() as any;
      if (d?.counts) {
        const v = d.counts;
        if (v.pending) counts.pending = Math.max(counts.pending, v.pending);
        if (v.leased) counts.leased = Math.max(counts.leased, v.leased);
        if (v.done) counts.done = Math.max(counts.done, v.done);
        if (v.failed) counts.failed = Math.max(counts.failed, v.failed);
      }
    }
  } catch {}
  // Neon automation_tasks (use neon WebSQL, not HTTP API)
  try {
    const connStr = c.env.NEON_DATABASE_URL;
    if (connStr) {
      const sql = neonSql(connStr);
      const rows = await sql`SELECT status, COUNT(*)::int as cnt FROM automation_tasks GROUP BY status`;
      const results = rows?.rows || (Array.isArray(rows) ? rows : []);
      for (const r of results) {
        const cnt = Number(r.cnt || 0);
        if (r.status === 'pending') counts.pending += cnt;
        else if (r.status === 'leased' || r.status === 'running') counts.leased += cnt;
        else if (r.status === 'done') counts.done += cnt;
        else if (r.status === 'failed') counts.failed += cnt;
      }
    }
  } catch {}
  return c.json({ ok: true, counts });
});

// Debug: check VPS + Neon + D1 raw data
app.get('/api/automation/task-counts-debug', async (c) => {
  const result: any = { vps: null, neon: null, d1: null, error: null };
  try {
    const vps = await fetch(`http://163.245.212.169:3000/api/dashboard/status-counts`, { signal: AbortSignal.timeout(3000) });
    if (vps.ok) result.vps = await vps.json();
    else result.vps = { status: vps.status, statusText: vps.statusText };
  } catch (e: any) { result.vps = { error: e?.message || 'vps timeout/refused' }; }
  try {
    const connStr = c.env.NEON_DATABASE_URL;
    if (connStr) result.neon = await neonQuery(connStr,
      `SELECT status, COUNT(*) as cnt FROM automation_tasks GROUP BY status`
    );
    else result.neon = 'NEON not configured';
  } catch (e: any) { result.neon = { error: e?.message }; }
  try {
    const stats = await c.env.DB.prepare(`SELECT status, SUM(cnt) as total FROM daily_task_stats GROUP BY status`).all();
    result.d1 = stats.results || [];
  } catch (e: any) { result.d1 = { error: e?.message }; }
  return c.json(result);
});

// Also expose legacy path for the frontend
app.get('/api/automation/stats/dashboard', async (c) => {
  const resp = await c.req.raw.clone();
  return (await c.env.ASSETS?.fetch?.(new URL('/api/automation/dashboard', c.req.url))) || c.redirect('/api/automation/dashboard');
});

// ============ BEHAVIOR LOGS (receive from bot worker, serve to frontend) ============

app.post('/api/automation/behavior-logs', async (c) => {
  const { logs } = await c.req.json();
  if (!Array.isArray(logs) || logs.length === 0) return c.json({ ok: true });
  try {
    await ensureBehaviorLogsTable(c.env.DB);
    // Batch insert via D1 batch API (~10x faster than row-by-row)
    const stmts = logs.map((row: any) =>
      c.env.DB.prepare('INSERT INTO bot_behavior_logs (ts, bot_id, event, data) VALUES (?, ?, ?, ?)')
        .bind(row.ts, row.botId || 'unknown', row.event, JSON.stringify(row))
    );
    await c.env.DB.batch(stmts);
    return c.json({ ok: true, count: logs.length });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

app.get('/api/automation/behavior-logs', async (c) => {
  // Require auth (bot token)
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const botId = c.req.query('botId') || '';
  const event = c.req.query('event') || '';
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit')) || 100));
  const offset = Math.max(0, Number(c.req.query('offset')) || 0);
  try {
    await ensureBehaviorLogsTable(c.env.DB);
    let query = 'SELECT * FROM bot_behavior_logs';
    const wheres: string[] = [];
    const params: any[] = [];
    // Default TTL: last 30 days
    wheres.push("created_at >= datetime('now', '-30 days')");
    if (botId) { wheres.push('bot_id=?'); params.push(botId); }
    if (event) { wheres.push('event=?'); params.push(event); }
    query += ' WHERE ' + wheres.join(' AND ');
    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const stmt = c.env.DB.prepare(query).bind(...params);
    const result = await stmt.all();
    return c.json({ ok: true, logs: (result.results || []).map((r: any) => {
      try { return { ...JSON.parse(r.data || '{}'), id: r.id, ts: r.ts, botId: r.bot_id, event: r.event }; }
      catch { return { id: r.id, ts: r.ts, botId: r.bot_id, event: r.event }; }
    }), offset, limit });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

// Return unique bot IDs for frontend dropdown
app.get('/api/automation/behavior-bots', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    await ensureBehaviorLogsTable(c.env.DB);
    const result = await c.env.DB.prepare(
      "SELECT DISTINCT bot_id FROM bot_behavior_logs WHERE created_at >= datetime('now', '-30 days') ORDER BY bot_id"
    ).all();
    return c.json({ ok: true, bots: (result.results || []).map((r: any) => r.bot_id) });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

// ============ BOT TASK ENDPOINTS (cloud-native, replaces local server 3000) ============
// These use bot token auth (Bearer or ?token=) and read/write Neon automation_tasks directly.

app.post('/api/bot/register', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const { botId, host, version, meta } = await c.req.json();
  if (!botId) return c.json({ error: 'botId required' }, 400);
  await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_instances (
    bot_id TEXT PRIMARY KEY, host TEXT, version TEXT, status TEXT DEFAULT 'online',
    registered_at INTEGER, last_heartbeat INTEGER, meta TEXT
  )`).run();
  try { await c.env.DB.prepare('ALTER TABLE bot_instances ADD COLUMN meta TEXT').run(); } catch {}
  const now = Date.now();
  await c.env.DB.prepare(`INSERT INTO bot_instances (bot_id,host,version,status,registered_at,last_heartbeat,meta)
    VALUES (?,?,?,'online',?,?,?) ON CONFLICT(bot_id) DO UPDATE SET
    host=excluded.host, version=excluded.version, status='online', last_heartbeat=excluded.last_heartbeat, meta=excluded.meta
  `).bind(botId, host||'', version||'', now, now, meta ? JSON.stringify(meta) : null).run();
  return c.json({ ok: true, botId, online: true, staleMs: 0 });
});

app.post('/api/bot/heartbeat', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const { botId, host, version } = await c.req.json();
  if (!botId) return c.json({ error: 'botId required' }, 400);
  const now = Date.now();
  await c.env.DB.prepare(`INSERT INTO bot_instances (bot_id,host,version,status,registered_at,last_heartbeat)
    VALUES (?,?,?,'online',?,?) ON CONFLICT(bot_id) DO UPDATE SET
    status='online', last_heartbeat=excluded.last_heartbeat, host=excluded.host, version=excluded.version
  `).bind(botId, host||'', version||'', now, now).run();
  return c.json({ ok: true, botId, ts: now });
});

// Ensure bot tables exist in D1
async function ensureBotTables(db: D1Database) {
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS bot_tasks (
    id TEXT PRIMARY KEY, payload TEXT, status TEXT DEFAULT 'pending',
    run_at INTEGER, lease_until INTEGER, leased_by TEXT,
    attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3,
    error_reason TEXT, created_at INTEGER, updated_at INTEGER
  )`).run(); } catch {}
  for (const col of ['run_at','lease_until','leased_by','attempts','max_attempts','error_reason','updated_at']) {
    try { await db.prepare(`ALTER TABLE bot_tasks ADD COLUMN ${col} INTEGER`).run(); } catch {}
  }
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS bot_instances (
    bot_id TEXT PRIMARY KEY, host TEXT, version TEXT, status TEXT DEFAULT 'online',
    registered_at INTEGER, last_heartbeat INTEGER, meta TEXT
  )`).run(); } catch {}
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS bot_config (
    bot_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT, updated_at INTEGER,
    PRIMARY KEY (bot_id, key)
  )`).run(); } catch {}
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS bot_profile_adjustments (
    bot_id TEXT PRIMARY KEY, adjustments_json TEXT, analysis_json TEXT,
    confidence REAL DEFAULT 0, analyzed_at INTEGER, updated_at INTEGER
  )`).run(); } catch {}
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS bot_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, bot_id TEXT, command_id TEXT, artist_handle TEXT,
    mode TEXT, summary_json TEXT, profile_facts_json TEXT, created_at INTEGER
  )`).run(); } catch {}
  try { await db.prepare(`ALTER TABLE bot_observations ADD COLUMN artist_handle TEXT`).run(); } catch {}
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS daily_task_stats (
    day TEXT NOT NULL, status TEXT NOT NULL, cnt INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, status)
  )`).run(); } catch {}
}

app.get('/api/automation/neon-tasks', async (c) => {
  await ensureBotTables(c.env.DB);
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit')) || 50));
  const status = c.req.query('status') || '';
  try {
    let sql = 'SELECT id, status, leased_by as leasedBy, payload, created_at, updated_at, error_reason FROM bot_tasks';
    const binds: any[] = [];
    const wheres: string[] = [];
    if (status) { wheres.push('status=?'); binds.push(status); }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    sql += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(limit);
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    const tasks = (rows.results || []).map((t: any) => {
      let payload: any = {};
      try { payload = JSON.parse(t.payload || '{}'); } catch {}
      return { id: t.id, status: t.status, leasedBy: t.leasedBy || null, payload, createdAt: t.created_at, updatedAt: t.updated_at, errorReason: t.error_reason || null };
    });
    return c.json({ ok: true, total: tasks.length, tasks });
  } catch (e: any) {
    return c.json({ ok: false, tasks: [], error: String(e?.message || e) }, 500);
  }
});

// State progress ?a per-state coverage from D1 (no Neon dependency)
app.get('/api/automation/state-progress', async (c) => {
  try {
    await ensureBotTables(c.env.DB);

    // 1. Total tasks per state from D1
    let artists: any[] = [];
    try {
      const rows = await c.env.DB.prepare(`
      SELECT json_extract(payload, '$.state') as state, COUNT(*) as total
      FROM bot_tasks WHERE payload IS NOT NULL
      GROUP BY json_extract(payload, '$.state')
    `).all();
    artists = (rows.results || []).map((r: any) => ({
      state: r.state || 'UNKNOWN', total: Number(r.total || 0),
    }));
  } catch (e1: any) {
    return c.json({ ok: false, error: 'D1: ' + String(e1?.message || e1).slice(0, 120) }, 500);
  }

    // 2. Done/failed per state from D1
    let doneRows: any[] = [];
    try {
      const done = await c.env.DB.prepare(`
        SELECT json_extract(payload, '$.state') as state,
          COUNT(DISTINCT json_extract(payload, '$.artistId')) as visited
        FROM bot_tasks WHERE status IN ('done','failed') AND payload IS NOT NULL
        GROUP BY json_extract(payload, '$.state')
      `).all();
      doneRows = (done.results || []).map((r: any) => ({
        state: r.state || 'UNKNOWN', visited: Number(r.visited || 0),
      }));
    } catch {}

    // 3. Daily rate (last 7 days)
    const weekAgo = Date.now() - 7 * 86400000;
    let recentCount = 0;
    try {
      const row = await c.env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM bot_tasks WHERE status='done' AND updated_at>=?"
      ).bind(weekAgo).first() as any;
      recentCount = row?.cnt || 0;
    } catch {}
    const dailyRate = Math.max(1, Math.round(recentCount / 7));

    // 4. Merge
    const progress = (artists || []).map((a: any) => {
      const state = a.state || 'UNKNOWN';
      const doneRow = (doneRows || []).find((r: any) => r.state === state);
      const total = Number(a.total || 0);
      const visited = Number(doneRow?.visited || 0);
      const pct = total > 0 ? Math.round(visited / total * 100) : 0;
      const remaining = total - visited;
      const daysLeft = dailyRate > 0 ? Math.ceil(remaining / dailyRate) : null;
      return { state, total, visited, pct, remaining, daysLeft };
    });

    return c.json({ ok: true, progress, dailyRate });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 300) }, 500);
  }
});
app.get('/api/automation/poll', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const botId = c.req.query('botId') || '';
  const limit = Math.min(10, Math.max(1, Number(c.req.query('limit')) || 1));
  if (!botId) return c.json({ error: 'botId required' }, 400);
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  const now = Date.now();
  const dedupWindow = now - 7 * 24 * 60 * 60 * 1000;
  try {
    const sql = neonSql(connStr);
    // Recycle expired leases
    await sql`UPDATE automation_tasks SET status = 'pending', leased_by = NULL, lease_until = NULL, updated_at = ${now}
              WHERE status = 'leased' AND lease_until IS NOT NULL AND lease_until < ${now}`.catch(() => {});

    // SELECT pending tasks with dedup
    const candidates = await sql`
      SELECT id, payload FROM automation_tasks
      WHERE status = 'pending' AND run_at <= ${now}
        AND (payload->>'artistHandle' IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM automation_tasks d
            WHERE d.id != automation_tasks.id
              AND d.status IN ('pending','leased') AND d.updated_at > ${dedupWindow}
              AND d.payload->>'artistHandle' = automation_tasks.payload->>'artistHandle'
          ))
      ORDER BY run_at ASC LIMIT ${limit}
    `;
    const rows = candidates?.rows || (Array.isArray(candidates) ? candidates : []);
    const commands: any[] = [];
    for (const r of rows) {
      await sql`UPDATE automation_tasks SET status = 'leased', leased_by = ${botId}, lease_until = ${now + 120_000}, updated_at = ${now}
                WHERE id = ${r.id} AND status = 'pending'`;
      let payload: any = {};
      try { payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {}); } catch {}
      commands.push({ ...payload, id: r.id });
    }
    // Update bot heartbeat
    await c.env.DB.prepare(`INSERT INTO bot_instances (bot_id,status,registered_at,last_heartbeat)
      VALUES (?,'online',?,?) ON CONFLICT(bot_id) DO UPDATE SET status='online', last_heartbeat=excluded.last_heartbeat
    `).bind(botId, now, now).run().catch(() => {});
    return c.json({ ok: true, commands });
  } catch (e: any) {
    console.error('[poll] Neon error:', e?.message || e);
    return c.json({ ok: true, commands: [] });
  }
});

app.post('/api/automation/report', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const { botId, commandId, status, reason } = await c.req.json();
    if (!botId || !commandId) return c.json({ error: 'botId and commandId required' }, 400);
    if (status !== 'done' && status !== 'failed') return c.json({ error: 'status must be done or failed' }, 400);
    const connStr = c.env.NEON_DATABASE_URL;
    if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
    const now = Date.now();
    try {
      const sql = neonSql(connStr);
      await sql`UPDATE automation_tasks SET status = ${status}, lease_until = NULL, leased_by = NULL, error_reason = ${status === 'failed' ? (reason || 'unknown') : null}, updated_at = ${now}
                WHERE id = ${commandId} AND leased_by = ${botId} AND status IN ('leased','running')`;
    } catch (e: any) {
      console.error('[report] Neon error:', e?.message || e);
    }
    try {
      const day = new Date().toISOString().slice(0, 10);
      await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_task_stats (
        day TEXT NOT NULL, status TEXT NOT NULL, cnt INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, status)
      )`).run().catch(() => {});
      await c.env.DB.prepare(
        `INSERT INTO daily_task_stats (day, status, cnt) VALUES (?, ?, 1)
         ON CONFLICT(day, status) DO UPDATE SET cnt = cnt + 1`
      ).bind(day, status === 'done' ? 'done' : 'failed').run().catch(() => {});
    } catch {}
    return c.json({ ok: true, commandId, status });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// ===== Bot 1?2����y?Y��?���� (called by bot-worker after each profile) =====
app.post('/api/bot/observe', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON not configured' }, 500);
  try {
    const body = await c.req.json();
    const botId = String(body.botId || '').trim();
    const artistHandle = String(body.artistHandle || body.artist_handle || '').replace(/^@/, '').trim();
    const mode = String(body.mode || '').trim();
    const commandId = String(body.commandId || body.command_id || '');
    if (!botId || !mode) return c.json({ error: 'botId and mode required' }, 400);
    const ts = Date.now();
    const sql = neonSql(connStr);
    // Ensure table exists
    await sql`CREATE TABLE IF NOT EXISTS bot_observations (id SERIAL PRIMARY KEY, bot_id TEXT NOT NULL, artist_handle TEXT, mode TEXT NOT NULL, created_at BIGINT NOT NULL)`.catch(() => {});
    // Write observation
    await sql`INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES (${botId}, ${artistHandle || null}, ${mode}, ${ts})`;
    // If commandId provided, also mark task done
    if (commandId) {
      await sql`UPDATE automation_tasks SET status = 'done', lease_until = NULL, leased_by = NULL, updated_at = ${ts} WHERE id = ${commandId}`.catch(() => {});
    }
    // Update artists table with IG profile data scraped by bot
    // First ensure columns exist, then update
    if (artistHandle && body.profileFacts) {
      const pf = body.profileFacts;
      try {
        // Add columns if not exist (safe, no-op if already there)
        await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS "following" BIGINT DEFAULT 0`.catch(() => {});
        await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS post_count BIGINT DEFAULT 0`.catch(() => {});
        await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT ''`.catch(() => {});
        await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS category TEXT DEFAULT ''`.catch(() => {});
        // Update fields
        if (pf.followers != null) await neonQuery(connStr, `UPDATE artists SET followers = $1 WHERE LOWER(ig_handle) = $2`, [Number(pf.followers), artistHandle]).catch(() => {});
        if (pf.following != null) await neonQuery(connStr, `UPDATE artists SET "following" = $1 WHERE LOWER(ig_handle) = $2`, [Number(pf.following), artistHandle]).catch(() => {});
        if (pf.postCount != null) await neonQuery(connStr, `UPDATE artists SET post_count = $1 WHERE LOWER(ig_handle) = $2`, [Number(pf.postCount), artistHandle]).catch(() => {});
        if (pf.bio) await neonQuery(connStr, `UPDATE artists SET bio = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.bio).slice(0, 500), artistHandle]).catch(() => {});
        if (pf.email) await neonQuery(connStr, `UPDATE artists SET email = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.email), artistHandle]).catch(() => {});
        if (pf.externalUrl) await neonQuery(connStr, `UPDATE artists SET website = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.externalUrl), artistHandle]).catch(() => {});
        if (pf.category) await neonQuery(connStr, `UPDATE artists SET category = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.category), artistHandle]).catch(() => {});
      } catch {}
    }
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: String(e?.message || e) }, 500);
  }
});

// ===== ??����??��?????�ꡧ1? bot human mimicry ��1��?��? =====
app.get('/api/bot/noise-sites', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const botId = c.req.query('botId') || '';
  // Default noise sites ?a can be overridden per bot via D1 bot_config table
  const defaultSites = [
    'https://www.cnn.com',
    'https://www.nydailynews.com',
    'https://www.youtube.com',
    'https://www.nytimes.com',
    'https://www.bbc.com/news',
    'https://www.reddit.com',
    'https://weather.com',
    'https://www.espn.com',
  ];
  // Check D1 for per-bot override
  let customSites: string[] = [];
  try {
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_config (
      bot_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT, updated_at INTEGER,
      PRIMARY KEY (bot_id, key)
    )`).run().catch(() => {});
    const row = await c.env.DB.prepare(
      'SELECT value FROM bot_config WHERE bot_id = ? AND key = ?'
    ).bind(botId, 'noise_sites').first() as any;
    if (row?.value) {
      try { customSites = JSON.parse(row.value); } catch {}
    }
  } catch {}
  const sites = customSites.length > 0 ? customSites : defaultSites;
  return c.json({ ok: true, sites });
});

// ===== Bot ????1�������ꡧ1??��?? BotConfigSection ��1��?��? =====
app.get('/api/automation/bot-config', async (c) => {
  try {
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_accounts (
      account_id TEXT PRIMARY KEY, ig_handle TEXT, stage TEXT DEFAULT 'new',
      daily_task_limit INTEGER DEFAULT 5, speed_factor REAL DEFAULT 2.5,
      first_used_at TEXT, vps_name TEXT, proxy TEXT
    )`).run().catch(() => {});
    // Try to add columns that might be missing
    for (const col of ['vps_name', 'proxy', 'first_used_at', 'ig_handle', 'bot_status', 'allowed_actions', 'enabled']) {
      try { await c.env.DB.prepare(`ALTER TABLE bot_accounts ADD COLUMN ${col} TEXT`).run(); } catch {}
    }
    const rows = await c.env.DB.prepare('SELECT * FROM bot_accounts ORDER BY account_id').all();
    return c.json({ ok: true, items: rows.results || [] });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

app.put('/api/automation/bot-config/:botId', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ') && !c.req.query('token')) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  try {
    const botId = c.req.param('botId');
    const body = await c.req.json();
    const now = Date.now();
    const fields = ['ig_handle', 'stage', 'daily_task_limit', 'speed_factor', 'first_used_at', 'vps_name', 'proxy', 'bot_status', 'allowed_actions', 'enabled'];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        sets.push(`${f}=?`);
        vals.push(body[f]);
      }
    }
    if (sets.length === 0) return c.json({ error: 'no fields to update' }, 400);
    sets.push('updated_at=?');
    vals.push(now);
    vals.push(botId);
    await c.env.DB.prepare(`INSERT INTO bot_accounts (account_id, ${sets.map(s => s.split('=')[0]).join(', ')}, created_at) VALUES (?, ${sets.map(() => '?').join(', ')}, ?) ON CONFLICT(account_id) DO UPDATE SET ${sets.join(', ')}`)
      .bind(botId, ...vals.slice(0, -1), now).run().catch(() => {
        // Fallback: direct UPDATE
        const updateFields = sets.join(', ').replace('updated_at=?', 'updated_at=?');
        c.env.DB.prepare(`UPDATE bot_accounts SET ${updateFields} WHERE account_id=?`).bind(...vals).run().catch(() => {});
      });
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

app.patch('/api/automation/bot-config/:botId/toggle', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ') && !c.req.query('token')) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  try {
    const botId = c.req.param('botId');
    const row = await c.env.DB.prepare('SELECT enabled FROM bot_accounts WHERE account_id=?').bind(botId).first() as any;
    const newEnabled = row?.enabled === 'true' ? 'false' : 'true';
    await c.env.DB.prepare('UPDATE bot_accounts SET enabled=? WHERE account_id=?').bind(newEnabled, botId).run();
    return c.json({ ok: true, enabled: newEnabled === 'true' });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

// ===== ?��?��?��2�� Neon ��??�� =====
app.get('/api/automation/neon-test', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ ok: false, error: 'NEON_DATABASE_URL not set', hint: 'use wrangler secret put NEON_DATABASE_URL' });
  // 2a��??y?��?a??
  const m = connStr.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (!m) return c.json({ ok: false, error: 'URL regex no match', url: connStr.slice(0, 50) + '...' });
  try {
    const basic = btoa(`${m[1]}:${m[2]}`);
    const resp = await fetch(`https://${m[3]}/v2/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${basic}` },
      body: JSON.stringify({ query: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name" }),
    });
    const text = await resp.text();
    if (!resp.ok) return c.json({ ok: false, error: `Neon ${resp.status}`, detail: text.slice(0, 300) });
    const data = JSON.parse(text);
    const tables = (data.rows || data || []).map((t: any) => t.table_name);
    const countResp = await fetch(`https://${m[3]}/v2/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${basic}` },
      body: JSON.stringify({ query: "SELECT COUNT(*) as cnt FROM artists" }),
    });
    const countData = await countResp.json();
    const cnt = (countData.rows || [])[0]?.cnt || 0;
    return c.json({ ok: true, tables, artistCount: cnt, user: m[1], host: m[3] });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message, stack: e.stack?.slice(0, 500) });
  }
});

// ===== ?��?��?��2�� Neon ��??�� =====
app.get('/api/automation/neon-check', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ ok: false, error: 'NEON_DATABASE_URL not set' });
  try {
    const tables = await neonQuery(connStr, "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    const artistCount = await neonQuery(connStr, "SELECT COUNT(*) as cnt FROM artists");
    return c.json({ ok: true, tables: tables.map((t: any) => t.table_name), artistCount: artistCount[0]?.cnt || 0 });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message });
  }
});

// ===== 2��?����y?Y��o?��D�� Neon =====
async function ensureObservationsTable(connStr: string) {
  try { await neonQuery(connStr, `CREATE TABLE IF NOT EXISTS bot_observations (id SERIAL PRIMARY KEY, bot_id TEXT NOT NULL, artist_handle TEXT, mode TEXT NOT NULL, created_at BIGINT NOT NULL)`); } catch {}
  try { await neonQuery(connStr, `CREATE INDEX IF NOT EXISTS idx_bot_obs_created_at ON bot_observations(created_at DESC)`); } catch {}
}


// Bot worker ��?����1?2a��y?Y��? Neon�ꡧ��2?��3??����? {items:[...]}��?
app.all('/api/automation/observations', async (c) => {
  if (c.req.method === 'GET') {
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 20));
    // ?����?��? VPS Express�ꡧ��D����??��y?Yo? summary_json / profile_facts_json��?
    try {
      const vps = await fetch(`http://163.245.212.169:3000/api/bot/observations?limit=${limit}`, { signal: AbortSignal.timeout(3000) });
      if (vps.ok) {
        const data = await vps.json() as any;
        const items = (data.observations || []).map((o: any) => ({
          bot_id: o.botId, artist_handle: o.artistHandle || '', mode: o.mode,
          summary_json: JSON.stringify(o.summary || {}), profile_facts_json: JSON.stringify(o.profileFacts || {}),
          created_at: o.createdAt
        }));
        return c.json({ ok: true, items });
      }
    } catch {}
    // Fallback: Neon
    try {
      const connStr = c.env.NEON_DATABASE_URL;
      if (!connStr) return c.json({ ok: false, error: 'NEON not configured', items: [] }, 500);
      const sql = neonSql(connStr);
      await sql`CREATE TABLE IF NOT EXISTS bot_observations (id SERIAL PRIMARY KEY, bot_id TEXT NOT NULL, artist_handle TEXT, mode TEXT NOT NULL, created_at BIGINT NOT NULL)`;
      const obsRes = await sql`SELECT id, bot_id, COALESCE(artist_handle, '') as artist_handle, mode, COALESCE(summary_json, '{}') as summary_json, COALESCE(profile_facts_json, '{}') as profile_facts_json, created_at FROM bot_observations ORDER BY created_at DESC LIMIT ${limit}`;
      const rows = obsRes?.rows || (Array.isArray(obsRes) ? obsRes : []);
      return c.json({ ok: true, items: rows });
    } catch (e: any) { return c.json({ ok: false, error: e.message, items: [] }, 500); }
  }
  try {
    const body = await c.req.json();
    const connStr = c.env.NEON_DATABASE_URL;
    if (!connStr) return c.json({ error: 'NEON not configured' }, 500);
    await ensureObservationsTable(connStr);
    // ?����?��?2?
    if (body.items && Array.isArray(body.items)) {
      let synced = 0;
      for (const o of body.items) {
        const botId = String(o.botId || o.bot_id || '').trim();
        const ah = String(o.artistHandle || o.artist_handle || '').replace(/^@/, '').trim();
        const mode = String(o.mode || '').trim();
        const ts = Number(o.createdAt || o.created_at || Date.now());
        if (!botId || !mode) continue;
        await neonQuery(connStr, `INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES ($1, $2, $3, $4)`, [botId, ah || null, mode, ts]);
        synced++;
      }
      return c.json({ ok: true, synced });
    }
    // �̣���?��?����
    const botId = String(body.botId || body.bot_id || '').trim();
    const artistHandle = String(body.artistHandle || body.artist_handle || '').replace(/^@/, '').trim();
    const mode = String(body.mode || '').trim();
    if (!botId || !mode) return c.json({ error: 'botId and mode required' }, 400);
    await neonQuery(connStr, `INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES ($1, $2, $3, $4)`, [botId, artistHandle || null, mode, Date.now()]);
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
// ��?3y?����? sync ??��?�ꡧ��?o?2���? POST /observations��?
// app.post('/api/automation/observations/sync', ...) ��?��?3y

// ===== ��y?Y?���?��o2��?�� Neon artists �����ꡧSQL 2?����??��?��3��? =====
app.get('/api/automation/artists', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const state = (c.req.query('state') || '').toUpperCase();
    const search = c.req.query('search') || '';
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50')));
    const offset = (page - 1) * limit;

    // Build filter WHERE clause (shared between count + data queries)
    const wheres: string[] = [`ig_handle IS NOT NULL AND ig_handle != ''`];
    if (state) wheres.push(`import_region = '${state.replace(/'/g, "''")}'`);
    if (search) {
      const s = search.replace(/'/g, "''");
      wheres.push(`(LOWER(shop_name) LIKE LOWER('%${s}%') OR LOWER(ig_handle) LIKE LOWER('%${s}%') OR LOWER(city) LIKE LOWER('%${s}%'))`);
    }
    const whereClause = wheres.join(' AND ');

    // Count: unique ig_handle only
    const countRows = await neonQuery(connStr, `SELECT COUNT(*) as cnt FROM (SELECT DISTINCT ig_handle FROM artists WHERE ${whereClause}) sub`);
    const total = Number(countRows?.[0]?.cnt || 0);

    // Data: dedup via GROUP BY, then paginate on deduped rows
    const cols = `id, shop_name, ig_handle, city, import_region, phone, website, rating, followers, reviews, "following", post_count, category`;
    const dataRows = await neonQuery(connStr,
      `SELECT ${cols} FROM artists WHERE id IN (
        SELECT MIN(id) FROM artists WHERE ${whereClause} GROUP BY ig_handle
        ORDER BY MIN(shop_name) ASC LIMIT ${limit} OFFSET ${offset}
      ) ORDER BY shop_name ASC`
    );
    const items = dataRows || [];

    // ��???���䨬? ?a �䨮 D1 o�� Neon o?2��
    let taskStatusMap: Record<string, string> = {};
    try {
      const handles = items.map((r: any) => r.ig_handle).filter(Boolean);
      if (handles.length > 0) {
        // D1 (?����y?Y)
        const tasks = await c.env.DB.prepare(
          `SELECT DISTINCT payload->>'artistHandle' as handle, status FROM automation_tasks
           WHERE payload->>'artistHandle' IN (${handles.map(() => '?').join(',')})
           AND status IN ('pending','leased','done','failed')`
        ).bind(...handles).all();
        for (const t of (tasks.results || []) as any) {
          if (t.handle && !taskStatusMap[t.handle]) taskStatusMap[t.handle] = t.status;
        }
        // Neon (D?��y?Y��??2?? D1 ?D1y������? pending ���䨬?)
        try {
          const connStr = c.env.NEON_DATABASE_URL;
          if (connStr) {
            const sql = neonSql(connStr);
            const handleList = handles.map(h => `'${h.replace(/'/g, "''")}'`).join(',');
            const neoRows = await neonQuery(connStr,
              `SELECT DISTINCT payload->>'artistHandle' as handle, status FROM automation_tasks
               WHERE payload->>'artistHandle' IN (${handleList})
               AND status IN ('pending','leased','done','failed')`
            );
            for (const r of (neoRows || [])) {
              if (r.handle) taskStatusMap[r.handle] = r.status;
            }
          }
        } catch {}
      }
    } catch {}

    return c.json({
      ok: true,
      items: items.map((r: any) => ({ ...r, taskStatus: taskStatusMap[r.ig_handle] || null })),
      total, page, limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      hasMore: items.length >= limit,
    });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// ===== �䨮 artists ���?����???�ꡧ?����?2��?������?a subrequest ��??T��? =====
app.post('/api/automation/tasks/create-from-artists', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const { artistIds, taskType = 'ig_browse' } = await c.req.json();
    if (!artistIds?.length) return c.json({ error: 'artistIds required' }, 400);
    const ts = Date.now();
    const dedupWindow = ts - 7 * 24 * 60 * 60 * 1000;

    const sql = neonSql(connStr);
    // �������������??��
    await sql`CREATE TABLE IF NOT EXISTS automation_tasks (id TEXT PRIMARY KEY, payload TEXT, status TEXT, run_at BIGINT, lease_until BIGINT, leased_by TEXT, attempts INT DEFAULT 0, max_attempts INT DEFAULT 3, error_reason TEXT, created_at BIGINT, updated_at BIGINT)`.catch(() => {});

    // ?����?2��?��?����D artist�ꡧ1��?��?
    const ids = artistIds.filter((i: any) => String(i).trim().length > 0);
    if (!ids.length) return c.json({ ok: false, error: 'no valid ids' }, 400);
    const idList = ids.map((i: any) => `'${String(i).replace(/'/g, "''")}'`).join(',');
    const artistRows = await neonQuery(connStr, `SELECT id, shop_name, ig_handle, city, state FROM artists WHERE id IN (${idList})`);
    const artists = artistRows || [];
    if (!artists.length) return c.json({ ok: false, error: 'no artists found' }, 404);

    // ?����?2����?��D��???�ꡧ7 ����?����?o?���䨬???��?1y��?o? done��?
    const handles = artists.map((a: any) => a.ig_handle || a.shop_name).filter(Boolean);
    let existingRows: any[] = [];
    if (handles.length) {
      const handleList = handles.map((h: string) => `'${h.replace(/'/g, "''")}'`).join(',');
      existingRows = await neonQuery(connStr, `SELECT payload->>'artistHandle' as h FROM automation_tasks WHERE payload->>'artistHandle' IN (${handleList}) AND updated_at > ${dedupWindow}`);
    }
    const existingSet = new Set((existingRows || []).map((r: any) => r.h || '').filter(Boolean));

    let created = 0, skipped = 0;
    const taskIds: string[] = [], payloads: string[] = [], runAts: number[] = [];
    for (const a of artists) {
      const h = a.ig_handle || a.shop_name || '';
      if (existingSet.has(h)) { skipped++; continue; }
      taskIds.push('task_' + h + '_' + ts);
      payloads.push(JSON.stringify({ artistHandle: h, shopName: a.shop_name, taskType }));
      runAts.push(ts);
      created++;
    }
    if (taskIds.length > 0) {
      // Build multi-row INSERT with proper JSON casting
      const rows = taskIds.map((id, i) => ({
        id, status: 'pending', payload: payloads[i], run_at: runAts[i], ts
      }));
      // Use batched individual inserts ?a but batch 5 at a time to stay under subrequest limit
      const batchSize = 5;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await Promise.all(batch.map(r =>
          sql`INSERT INTO automation_tasks (id, status, payload, run_at, created_at, updated_at)
              VALUES (${r.id}, ${r.status}, ${r.payload}::jsonb, ${r.run_at}, ${r.ts}, ${r.ts})`
            .catch(() => {})
        ));
      }
    }
    return c.json({ ok: true, created, skipped, total: artistIds.length });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// ===== �䨮 VPS ��?2?��???��y?Y��? D1 =====
app.post('/api/automation/task-list/sync', async (c) => {
  const auth = c.req.header('Authorization') || '';
  if (auth !== 'Bearer vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401);
  try {
    const { tasks } = await c.req.json();
    if (!Array.isArray(tasks) || !tasks.length) return c.json({ error: 'tasks array required' }, 400);
    // �������� D1 ������??��?����DD����a��?��D
    try { await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS automation_tasks (id TEXT PRIMARY KEY, payload TEXT, status TEXT, created_at INTEGER, updated_at INTEGER)`).run(); } catch {}
    try { await c.env.DB.prepare(`ALTER TABLE automation_tasks ADD COLUMN payload TEXT`).run(); } catch {}
    try { await c.env.DB.prepare(`ALTER TABLE automation_tasks ADD COLUMN updated_at INTEGER`).run(); } catch {}
    let inserted = 0, skipped = 0;
    let firstError = '';
    for (const t of tasks) {
      if (!t.id || !t.status) { skipped++; continue; }
      try {
        // Use as TEXT id to avoid type mismatch
        const id = String(t.id);
        const payload = typeof t.payload === 'string' ? t.payload : JSON.stringify(t.payload || {});
        const status = String(t.status);
        const created = Math.floor(Number(t.created_at || Date.now()));
        const updated = Math.floor(Number(t.updated_at || Date.now()));
        await c.env.DB.prepare(
          `INSERT OR REPLACE INTO automation_tasks (id, payload, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(id, payload, status, created, updated).run();
        inserted++;
      } catch (e: any) {
        skipped++;
        if (!firstError) firstError = String(e?.message || e).slice(0, 200);
      }
    }
    return c.json({ ok: true, inserted, skipped, total: tasks.length, firstError });
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500); }
});

// ===== �䨮 artist handle ���騨?��???��? bot =====
app.post('/api/automation/tasks/inject', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const { artistHandles, taskType = 'ig_browse', botId = '' } = await c.req.json();
    if (!artistHandles?.length) return c.json({ error: 'artistHandles required' }, 400);
    const ts = Date.now();
    const dedupWindow = ts - 7 * 24 * 60 * 60 * 1000;
    const sql = neonSql(connStr);
    let created = 0, skipped = 0;

    for (const handle of artistHandles) {
      const h = String(handle || '').replace(/^@/, '').trim().toLowerCase();
      if (!h) continue;

      // 2��??��o7����?����?��?��D��? handle ��?��???
      const existing = await sql`SELECT id FROM automation_tasks WHERE payload->>'artistHandle' = ${h} AND updated_at > ${dedupWindow} LIMIT 1`;
      if (existing?.rows?.length || existing?.length) { skipped++; continue; }

      const leasedBy = botId || null;
      await sql`INSERT INTO automation_tasks (id, status, payload, run_at, leased_by, created_at, updated_at)
        VALUES (${`inject_${ts}_${h}`}, 'pending', ${JSON.stringify({ artistHandle: h, targetBot: botId })}, ${ts}, ${leasedBy}, ${ts}, ${ts})`;
      created++;
    }
    return c.json({ ok: true, created, skipped, total: artistHandles.length });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// ===== Scheduler ��?????2��?���ꡧig-scheduler-lite �̡¨�?��? =====
app.get('/api/tasks/count', async (c) => {
  const tokenParam = c.req.query('token');
  if (tokenParam !== 'vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401);
  const botId = c.req.query('botId') || '';
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON not configured' }, 500);
  try {
    const sql = neonSql(connStr);
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const rows = await sql`SELECT COUNT(*) as cnt FROM automation_tasks WHERE created_at >= ${startOfDay}`;
    const todayCount = Number(rows?.[0]?.cnt || 0);
    return c.json({ ok: true, todayCount });
  } catch (e: any) {
    return c.json({ ok: true, todayCount: 0 });
  }
});

// ===== Scheduler ?����?���?����???�ꡧig-scheduler-lite �̡¨�?��? =====
app.post('/api/tasks/create', async (c) => {
  // ?��3? ?token= ��??��ꡧscheduler ��? query param��?
  const tokenParam = c.req.query('token');
  if (tokenParam !== 'vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401);
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const { tasks } = await c.req.json();
    if (!Array.isArray(tasks) || !tasks.length) return c.json({ error: 'tasks array required' }, 400);
    const sql = neonSql(connStr);
    const ts = Date.now();
    const dedupWindow = ts - 7 * 24 * 60 * 60 * 1000; // 7-day dedup (match poll)
    let created = 0, skipped = 0;

    for (const t of tasks) {
      if (!t.id || !t.payload) { skipped++; continue; }
      // Extract artistHandle from payload for dedup check
      const payload = typeof t.payload === 'object' ? t.payload : (() => { try { return JSON.parse(t.payload); } catch { return {}; } })();
      const handle = String(payload?.artistHandle || '').trim().toLowerCase();
      if (!handle) { skipped++; continue; }

      // Dedup: skip if this handle already has a non-failed task in dedup window
      try {
        const existing = await sql`
          SELECT id FROM automation_tasks
          WHERE payload->>'artistHandle' = ${handle}
            AND status IN ('pending','leased','done')
            AND updated_at > ${dedupWindow}
          LIMIT 1
        `;
        if (existing?.rows?.length || (Array.isArray(existing) && existing.length > 0)) {
          skipped++;
          continue;
        }
      } catch { /* fall through to insert */ }

      const runAt = Number(t.runAt) || ts;
      const payloadStr = typeof t.payload === 'object' ? JSON.stringify(t.payload) : String(t.payload);
      try {
        await sql`INSERT INTO automation_tasks (id, status, payload, run_at, created_at, updated_at)
          VALUES (${String(t.id)}, 'pending', ${payloadStr}, ${runAt}, ${ts}, ${ts})`;
        created++;
      } catch (e: any) {
        skipped++;
      }
    }
    return c.json({ ok: true, created, skipped });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// ===== ��???���䨬?��D�����ꡧ�䨮 Neon automation_tasks��? =====
app.get('/api/automation/task-list', async (c) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(c.req.query('limit')) || 50));
    const status = String(c.req.query('status') || '').trim();
    const connStr = c.env.NEON_DATABASE_URL;
    if (!connStr) return c.json({ ok: false, error: 'NEON not configured', tasks: [] }, 500);
    const sql = neonSql(connStr);
    let rows;
    if (status) {
      rows = await sql`SELECT id, status, leased_by, payload, error_reason, created_at, updated_at FROM automation_tasks WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limit}`;
    } else {
      rows = await sql`SELECT id, status, leased_by, payload, error_reason, created_at, updated_at FROM automation_tasks ORDER BY created_at DESC LIMIT ${limit}`;
    }
    const tasks = (rows?.rows || rows || []).map((t: any) => {
      let payload: any = {};
      try { payload = typeof t.payload === 'string' ? JSON.parse(t.payload) : (t.payload || {}); } catch {}
      return { id: t.id, status: t.status, artistHandle: payload.artistHandle || '', leasedBy: t.leased_by, errorReason: t.error_reason, createdAt: t.created_at, updatedAt: t.updated_at };
    });
    return c.json({ ok: true, tasks });
  } catch (e: any) { return c.json({ ok: false, error: e.message, tasks: [] }, 500); }
});

// ===== ???????�� pending ��???�ꡧ��??���䣤�����?????��?��??�� done ��? handle��? =====
app.post('/api/automation/tasks/clear-duplicate-pending', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== 'vps-bot-secret-2024') {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON not configured' }, 500);
  try {
    const sql = neonSql(connStr);
    const dedupWindow = Date.now() - 7 * 24 * 60 * 60 * 1000;
    // ��?3y pending ��???��??? handle ��?��D done/leased ��????�� dedup ���?��?��
    const result = await sql`
      DELETE FROM automation_tasks
      WHERE status = 'pending'
        AND EXISTS (
          SELECT 1 FROM automation_tasks d
          WHERE d.status IN ('done','leased')
            AND d.updated_at > ${dedupWindow}
            AND d.payload->>'artistHandle' = automation_tasks.payload->>'artistHandle'
        )
    `;
    return c.json({ ok: true, deleted: result?.count || 0 });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// ===== ?????����D pending ��??? =====
app.post('/api/automation/tasks/clear-all-pending', async (c) => {
  const tokenParam = c.req.query('token');
  const auth = c.req.header('Authorization');
  const authed = tokenParam === 'vps-bot-secret-2024' || auth === 'Bearer vps-bot-secret-2024';
  if (!authed) return c.json({ error: 'unauthorized' }, 401);
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON not configured' }, 500);
  try {
    const sql = neonSql(connStr);
    const delPending = (await sql`DELETE FROM automation_tasks WHERE status = 'pending' RETURNING id`).length || 0;
    const delLeased = (await sql`DELETE FROM automation_tasks WHERE status = 'leased' RETURNING id`).length || 0;
    return c.json({ ok: true, deleted: delPending + delLeased, pending: delPending, leased: delLeased });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

// ===== Poll �̡¨�???��? =====
app.post('/api/voice/log', async (c) => {
  try { const { transcript, parsed_sku, parsed_qty, matched_product, success } = await c.req.json();
    await c.env.DB.prepare('INSERT INTO voice_logs (transcript,parsed_sku,parsed_qty,matched_product,success,created_at) VALUES (?,?,?,?,?,?)')
      .bind(transcript||'', parsed_sku||'', parsed_qty||0, matched_product||'', success?1:0, Date.now()).run();
    return c.json({ ok: true }); }
  catch (e: any) { return c.json({ ok: false, error: e.message }, 500); }
});

app.get('/api/automation/poll-debug', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON not configured' }, 500);
  try {
    const sql = neonSql(connStr);
    const now = Date.now();
    const dedupWindow = now - 7 * 24 * 60 * 60 * 1000;

    // 1. Total pending count
    const totalPending = await sql`SELECT COUNT(*) as cnt FROM automation_tasks WHERE status = 'pending'`;
    const pendingCount = Number(totalPending?.[0]?.cnt || 0);

    // 2. Pending with run_at <= now
    const readyPending = await sql`SELECT COUNT(*) as cnt FROM automation_tasks WHERE status = 'pending' AND run_at <= ${now}`;
    const readyCount = Number(readyPending?.[0]?.cnt || 0);

    // 3. Pending where handle already done in dedup window
    const dedupBlocked = await sql`SELECT COUNT(*) as cnt FROM automation_tasks t WHERE status = 'pending' AND EXISTS (SELECT 1 FROM automation_tasks d WHERE d.status = 'done' AND d.updated_at > ${dedupWindow} AND d.payload->>'artistHandle' = t.payload->>'artistHandle')`;
    const dedupBlockedCount = Number(dedupBlocked?.[0]?.cnt || 0);

    // 4. Sample tasks with run_at
    const sampleTasks = await sql`SELECT id, status, run_at, created_at, updated_at, payload FROM automation_tasks WHERE status = 'pending' LIMIT 3`;

    // 5. Exact poll query simulation
    const limit = 3;
    let pollCandidates: any[] = [];
    try {
      const pc = await sql`
        SELECT id, payload FROM automation_tasks
        WHERE status = 'pending' AND run_at <= ${now}
          AND (payload->>'artistHandle' IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM automation_tasks d
              WHERE d.id != automation_tasks.id
                AND d.status IN ('pending','leased') AND d.updated_at > ${dedupWindow}
                AND d.payload->>'artistHandle' = automation_tasks.payload->>'artistHandle'
            ))
        ORDER BY run_at ASC LIMIT ${limit}
      `;
      const pRows = pc?.rows || (Array.isArray(pc) ? pc : []);
      pollCandidates = pRows.map((r: any) => ({ id: r.id, run_at: r.run_at }));
      // Also try the UPDATE (without committing ?a just test)
      if (pRows.length > 0) {
        const first = pRows[0];
        try {
          await sql`UPDATE automation_tasks SET status = 'pending', lease_until = NULL, leased_by = NULL, updated_at = ${now}
                    WHERE id = ${first.id} AND status = 'pending'`;
          // Revert the test update
          await sql`UPDATE automation_tasks SET updated_at = ${now} WHERE id = ${first.id}`;
          pollCandidates[0].updateOk = true;
        } catch (e_u: any) {
          pollCandidates[0].updateError = String(e_u?.message || e_u).slice(0, 200);
        }
      }
    } catch (e: any) {
      pollCandidates = [{ error: String(e?.message || e).slice(0, 200) }];
    }

    // 5. (skip bot_instances)
    return c.json({
      debug: {
        now,
        nowReadable: new Date(now).toISOString(),
        dedupWindow,
        pendingCount,
        readyCount,
        dedupBlockedCount,
        pollCandidates,
        sampleTasks: (sampleTasks?.rows || sampleTasks || []).map((t: any) => ({
          id: t.id,
          status: t.status,
          run_at: t.run_at,
          run_at_readable: t.run_at ? new Date(Number(t.run_at)).toISOString() : null,
          created_at: t.created_at ? new Date(Number(t.created_at)).toISOString() : null,
          handle: typeof t.payload === 'string' ? (() => { try { return JSON.parse(t.payload).artistHandle; } catch { return null; } })() : t.payload?.artistHandle,
        })),
      }
    });
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack?.slice(0, 500) }, 500);
  }
});

// ============ AMAZON INTEL ROUTES ============

// Ensure Amazon tables exist in D1
async function ensureAmazonTables(db: D1Database) {
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS amazon_products (
    asin TEXT PRIMARY KEY, title TEXT NOT NULL, price TEXT, currency TEXT DEFAULT 'USD',
    rating REAL DEFAULT 0, review_count INTEGER DEFAULT 0, image_url TEXT,
    product_url TEXT, domain TEXT DEFAULT 'www.amazon.com', search_keyword TEXT,
    category TEXT, scraped_at INTEGER, created_at INTEGER
  )`).run(); } catch {}
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS amazon_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, asin TEXT NOT NULL, product_title TEXT,
    domain TEXT DEFAULT 'www.amazon.com', reviewer_name TEXT, reviewer_url TEXT,
    rating INTEGER, title TEXT, review_text TEXT, review_date TEXT,
    verified INTEGER DEFAULT 0, helpful_count INTEGER DEFAULT 0,
    images TEXT, review_url TEXT, scraped_at INTEGER, created_at INTEGER
  )`).run(); } catch {}
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_amz_r_asin ON amazon_reviews(asin)`).run(); } catch {}
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_amz_r_domain ON amazon_reviews(domain)`).run(); } catch {}
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS amazon_tasks (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, user_id TEXT DEFAULT 'system',
    params TEXT, status TEXT DEFAULT 'pending', progress TEXT,
    result_summary TEXT, error_message TEXT, created_at INTEGER,
    updated_at INTEGER, completed_at INTEGER
  )`).run(); } catch {}
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_amz_t_status ON amazon_tasks(status)`).run(); } catch {}
}

// POST /api/amazon/search - create product search task
app.post('/api/amazon/search', async (c) => {
  const user = c.get('user');
  const { keyword, domain } = await c.req.json();
  if (!keyword) return c.json({ error: 'keyword required' }, 400);
  await ensureAmazonTables(c.env.DB);
  const now = Date.now();
  const taskId = 'amz-search-' + now + '-' + Math.random().toString(36).slice(2, 6);
  await c.env.DB.prepare('INSERT INTO amazon_tasks (id, type, user_id, params, status, created_at, updated_at) VALUES (?, ?, ?, ?, "pending", ?, ?)')
    .bind(taskId, 'search', (user?.uid || 'system'), JSON.stringify({ keyword, domain: domain || 'www.amazon.com' }), now, now).run();
  return c.json({ ok: true, taskId, message: 'Search task created. VPS will process shortly.' });
});

// POST /api/amazon/scrape - create review scrape task
app.post('/api/amazon/scrape', async (c) => {
  const user = c.get('user');
  const { asins, domains, minStars, maxStars, maxPages } = await c.req.json();
  if (!asins?.length) return c.json({ error: 'asins array required' }, 400);
  await ensureAmazonTables(c.env.DB);
  const now = Date.now();
  const results: any[] = [];
  for (const asin of asins) {
    const taskId = 'amz-scrape-' + now + '-' + Math.random().toString(36).slice(2, 6);
    const asinCode = typeof asin === 'object' ? asin.asin : asin;
    const productName = typeof asin === 'object' ? asin.name : asin;
    await c.env.DB.prepare('INSERT INTO amazon_tasks (id, type, user_id, params, status, created_at, updated_at) VALUES (?, "scrape", ?, ?, "pending", ?, ?)')
      .bind(taskId, (user?.uid || 'system'),
        JSON.stringify({ asin: asinCode, productName, domains: domains || ['www.amazon.com'], minStars: minStars ?? 1, maxStars: maxStars ?? 5, maxPages: maxPages ?? 3 }),
        now, now).run();
    results.push({ asin: asinCode, taskId });
  }
  return c.json({ ok: true, count: asins.length, tasks: results, message: asins.length + ' scrape tasks created.' });
});

// GET /api/amazon/products - query searched products
app.get('/api/amazon/products', async (c) => {
  try {
    await ensureAmazonTables(c.env.DB);
    const keyword = c.req.query('keyword') || '';
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')));
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM amazon_products WHERE 1=1';
    const binds: any[] = [];
    if (keyword) { sql += ' AND search_keyword = ?'; binds.push(keyword); }
    sql += ' ORDER BY review_count DESC LIMIT ? OFFSET ?';
    binds.push(limit, offset);
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    const total = await c.env.DB.prepare('SELECT COUNT(*) as c FROM amazon_products' + (keyword ? ' WHERE search_keyword = ?' : ''))
      .bind(...(keyword ? [keyword] : [])).first();
    return c.json({ ok: true, items: rows.results || [], total: (total as any)?.c || 0, page, limit });
  } catch (e: any) { return c.json({ ok: false, error: e.message, items: [] }, 500); }
});

// GET /api/amazon/reviews - query scraped reviews
app.get('/api/amazon/reviews', async (c) => {
  try {
    await ensureAmazonTables(c.env.DB);
    const asin = c.req.query('asin') || '';
    const domain = c.req.query('domain') || '';
    const minRating = parseInt(c.req.query('minRating') || '0');
    const maxRating = parseInt(c.req.query('maxRating') || '5');
    const search = c.req.query('search') || '';
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(c.req.query('limit') || '50')));
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM amazon_reviews WHERE 1=1';
    const wheres: string[] = [];
    const binds: any[] = [];
    if (asin) { wheres.push('asin = ?'); binds.push(asin); }
    if (domain) { wheres.push('domain = ?'); binds.push(domain); }
    if (minRating > 0) { wheres.push('rating >= ?'); binds.push(minRating); }
    if (maxRating < 5) { wheres.push('rating <= ?'); binds.push(maxRating); }
    if (search) { wheres.push('(review_text LIKE ? OR title LIKE ?)'); binds.push('%' + search + '%', '%' + search + '%'); }
    const wc = wheres.length ? ' AND ' + wheres.join(' AND ') : '';
    const rows = await c.env.DB.prepare(sql + wc + ' ORDER BY scraped_at DESC LIMIT ? OFFSET ?').bind(...binds, limit, offset).all();
    const total = await c.env.DB.prepare('SELECT COUNT(*) as c FROM amazon_reviews WHERE 1=1' + wc).bind(...binds).first();
    const items = (rows.results || []).map((r: any) => ({ ...r, images: r.images ? JSON.parse(r.images) : [] }));
    return c.json({ ok: true, items, total: (total as any)?.c || 0, page, limit });
  } catch (e: any) { return c.json({ ok: false, error: e.message, items: [] }, 500); }
});

// GET /api/amazon/tasks - query task status
app.get('/api/amazon/tasks', async (c) => {
  try {
    await ensureAmazonTables(c.env.DB);
    const type = c.req.query('type') || '';
    const status = c.req.query('status') || '';
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM amazon_tasks WHERE 1=1';
    const binds: any[] = [];
    if (type) { sql += ' AND type = ?'; binds.push(type); }
    if (status) { sql += ' AND status = ?'; binds.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    binds.push(limit, offset);
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    return c.json({ ok: true, items: rows.results || [], page, limit });
  } catch (e: any) { return c.json({ ok: false, error: e.message, items: [] }, 500); }
});

// DELETE /api/amazon/reviews - clear reviews for an ASIN
app.delete('/api/amazon/reviews', async (c) => {
  const asin = c.req.query('asin') || '';
  if (!asin) return c.json({ error: 'asin required' }, 400);
  try {
    await ensureAmazonTables(c.env.DB);
    await c.env.DB.prepare('DELETE FROM amazon_reviews WHERE asin = ?').bind(asin).run();
    return c.json({ ok: true, message: 'Deleted reviews for ' + asin });
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500); }
});

// --- VPS POLL / REPORT ENDPOINTS ---

// GET /api/amazon/pending - VPS polls pending tasks
app.get('/api/amazon/pending', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    await ensureAmazonTables(c.env.DB);
    const type = c.req.query('type') || '';
    const limit = Math.min(5, Math.max(1, Number(c.req.query('limit')) || 3));
    let sql = 'SELECT * FROM amazon_tasks WHERE status = "pending"';
    const binds: any[] = [];
    if (type) { sql += ' AND type = ?'; binds.push(type); }
    sql += ' ORDER BY created_at ASC LIMIT ?';
    binds.push(limit);
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    const items = (rows.results || []).map((r: any) => ({ ...r, params: r.params ? JSON.parse(r.params) : {} }));
    return c.json({ ok: true, items });
  } catch (e: any) { return c.json({ ok: false, error: e.message, items: [] }, 500); }
});

// POST /api/amazon/report - VPS reports task results
app.post('/api/amazon/report', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const { taskId, status, products, reviews, error } = await c.req.json();
  if (!taskId || !status) return c.json({ error: 'taskId and status required' }, 400);
  const now = Date.now();
  try {
    await ensureAmazonTables(c.env.DB);
    await c.env.DB.prepare(
      'UPDATE amazon_tasks SET status = ?, updated_at = ?, completed_at = ?, error_message = ?, result_summary = ? WHERE id = ?'
    ).bind(status, now, status === 'completed' ? now : null, error || null,
      JSON.stringify({ productsCount: products?.length || 0, reviewsCount: reviews?.length || 0 }), taskId).run();
    if (products?.length) {
      const stmt = c.env.DB.prepare('INSERT OR REPLACE INTO amazon_products (asin, title, price, currency, rating, review_count, image_url, product_url, domain, search_keyword, scraped_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const p of products) {
        await stmt.bind(p.asin, p.title, p.price || '', p.currency || 'USD', p.rating || 0, p.reviewCount || 0, p.imageUrl || '', p.productUrl || '', p.domain || 'www.amazon.com', p.searchKeyword || '', now, now).run();
      }
    }
    if (reviews?.length) {
      const stmt = c.env.DB.prepare('INSERT INTO amazon_reviews (asin, product_title, domain, reviewer_name, reviewer_url, rating, title, review_text, review_date, verified, helpful_count, images, review_url, scraped_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const r of reviews) {
        await stmt.bind(r.asin, r.productTitle || '', r.domain || 'www.amazon.com', r.reviewerName || '', r.reviewerUrl || '', r.rating, r.title || '', r.text || '', r.date || '', r.verified ? 1 : 0, r.helpfulCount || 0, r.images?.length ? JSON.stringify(r.images) : '[]', r.reviewUrl || '', now, now).run();
      }
    }
    return c.json({ ok: true, taskId, status, stored: { products: products?.length || 0, reviews: reviews?.length || 0 } });
  } catch (e: any) { return c.json({ ok: false, error: e.message }, 500); }
});



// ============ COMPETITOR INTELLIGENCE ROUTES ============

async function ensureCompetitorTables(db: D1Database) {
  try { await db.prepare(```CREATE TABLE IF NOT EXISTS competitor_brands (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, website TEXT, category TEXT,
    notes TEXT, status TEXT DEFAULT 'active', created_at INTEGER
)```).run(); } catch {}
  try { await db.prepare(```CREATE TABLE IF NOT EXISTS competitor_products (
    id TEXT PRIMARY KEY, brand_id TEXT, name TEXT NOT NULL, category TEXT,
    subcategory TEXT, launch_date TEXT, target_user TEXT, price TEXT,
    features TEXT, packaging TEXT, images TEXT, claims TEXT,
    source_url TEXT, notes TEXT, created_at INTEGER, updated_at INTEGER
)```).run(); } catch {}
  try { await db.prepare(```CREATE TABLE IF NOT EXISTS competitor_mentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id TEXT, product_id TEXT,
    source TEXT NOT NULL, source_url TEXT, content TEXT, sentiment TEXT,
    mention_type TEXT, author TEXT, platform TEXT, mentioned_at INTEGER,
    created_at INTEGER
)```).run(); } catch {}
}

// BRANDS
app.get('/api/competitor/brands', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const { results } = await c.env.DB.prepare('SELECT * FROM competitor_brands ORDER BY name ASC').all();
  return c.json({ brands: results });
});

app.post('/api/competitor/brands', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const body: any = await c.req.json();
  const id = 'cb-' + Date.now().toString(36);
  await c.env.DB.prepare(```INSERT INTO competitor_brands (id,name,website,category,notes,status,created_at) VALUES (?,?,?,?,?,?,?)```).bind(id, body.name, body.website||'', body.category||'', body.notes||'', 'active', Date.now()).run();
  return c.json({ ok: true, id });
});

app.put('/api/competitor/brands/:id', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const fields = ['name','website','category','notes','status'];
  const sets = fields.filter(f => body[f] !== undefined).map(f => f + ' = ?');
  if (!sets.length) return c.json({ ok: false });
  const vals = fields.filter(f => body[f] !== undefined).map(f => body[f]);
  await c.env.DB.prepare(`UPDATE competitor_brands SET ` + sets.join(',') + ' WHERE id = ?').bind(...vals, id).run();
  return c.json({ ok: true });
});

app.delete('/api/competitor/brands/:id', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const { id } = c.req.param();
  await c.env.DB.prepare(`DELETE FROM competitor_brands WHERE id = ?`).bind(id).run();
  await c.env.DB.prepare(`DELETE FROM competitor_products WHERE brand_id = ?`).bind(id).run();
  return c.json({ ok: true });
});

// PRODUCTS
app.get('/api/competitor/products', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const brandId = c.req.query('brand_id');
  let sql = 'SELECT cp.*, cb.name as brand_name FROM competitor_products cp LEFT JOIN competitor_brands cb ON cp.brand_id = cb.id';
  if (brandId) sql += ' WHERE cp.brand_id = ?';
  sql += ' ORDER BY cp.created_at DESC LIMIT 100';
  const stmt = brandId ? c.env.DB.prepare(sql).bind(brandId) : c.env.DB.prepare(sql);
  const { results } = await stmt.all();
  return c.json({ products: results });
});

app.post('/api/competitor/products', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const body: any = await c.req.json();
  const id = 'cpr-' + Date.now().toString(36);
  await c.env.DB.prepare(```INSERT INTO competitor_products (id,brand_id,name,category,subcategory,launch_date,target_user,price,features,packaging,images,claims,source_url,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)```).bind(id, body.brand_id||'', body.name, body.category||'', body.subcategory||'', body.launch_date||'', body.target_user||'', body.price||'', body.features||'', body.packaging||'', body.images||'', body.claims||'', body.source_url||'', body.notes||'', Date.now(), Date.now()).run();
  return c.json({ ok: true, id });
});

app.put('/api/competitor/products/:id', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const fields = ['brand_id','name','category','subcategory','launch_date','target_user','price','features','packaging','images','claims','source_url','notes'];
  const sets = fields.filter(f => body[f] !== undefined).map(f => f + ' = ?');
  if (!sets.length) return c.json({ ok: false });
  sets.push('updated_at = ?');
  const vals = fields.filter(f => body[f] !== undefined).map(f => body[f]);
  vals.push(Date.now());
  await c.env.DB.prepare(`UPDATE competitor_products SET ` + sets.join(',') + ' WHERE id = ?').bind(...vals, id).run();
  return c.json({ ok: true });
});

app.delete('/api/competitor/products/:id', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const { id } = c.req.param();
  await c.env.DB.prepare(`DELETE FROM competitor_products WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

// MENTIONS
app.get('/api/competitor/mentions', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const brandId = c.req.query('brand_id');
  let sql = 'SELECT cm.*, cb.name as brand_name FROM competitor_mentions cm LEFT JOIN competitor_brands cb ON cm.brand_id = cb.id';
  if (brandId) sql += ' WHERE cm.brand_id = ?';
  sql += ' ORDER BY cm.mentioned_at DESC LIMIL 100';
  const stmt = brandId ? c.env.DB.prepare(sql).bind(brandId) : c.env.DB.prepare(sql);
  const { results } = await stmt.all();
  return c.json({ mentions: results });
});

app.post('/api/competitor/mentions', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const body: any = await c.req.json();
  await c.env.DB.prepare(```INSERT INTO competitor_mentions (brand_id,product_id,source,source_url,content,sentiment,mention_type,author,platform,mentioned_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)```).bind(body.brand_id||'', body.product_id||'', body.source||'manual', body.source_url||'', body.content||'', body.sentiment||'', body.mention_type||'', body.author||'', body.platform||'', body.mentioned_at||Date.now(), Date.now()).run();
  return c.json({ ok: true });
});

// SUMMARY
app.get('/api/competitor/summary', async (c) => {
  await ensureCompetitorTables(c.env.DB);
  const brands = await c.env.DB.prepare('SELECT id, name, category, status FROM competitor_brands ORDER BY name ASC').all();
  const counts = {} as any;
  for (const b of (brands.results || [])) {
    const p = await c.env.DB.prepare('SELECT COUNT(*) as c FROM competitor_products WHERE brand_id = ?').bind(b.id).first() as any;
    const m = await c.env.DB.prepare('SELECT COUNT(*) as c FROM competitor_mentions WHERE brand_id = ?').bind(b.id).first() as any;
    counts[b.id] = { products: p?.c || 0, mentions: m?.c || 0 };
  }
  return c.json({ brands: brands.results, counts });
});



// ============ MARKET INTELLIGENCE ROUTES ============

async function ensureMarketTables(db: D1Database) {
  try { await db.prepare(```CREATE TABLE IF NOT EXISTS market_categories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, parent TEXT, sort_order INTEGER DEFAULT 0,
    created_at INTEGER
)```).run(); } catch {}
  try { await db.prepare(```CREATE TABLE IF NOT EXISTS market_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, country TEXT NOT NULL,
    brand TEXT NOT NULL, score REAL DEFAULT 0, google_score REAL DEFAULT 0,
    amazon_score REAL DEFAULT 0, social_score REAL DEFAULT 0, artist_score REAL DEFAULT 0,
    dist_score REAL DEFAULT 0, rank INTEGER, updated_at INTEGER,
    UNIQUE(category, country, brand)
)```).run(); } catch {}
  try { await db.prepare(```CREATE TABLE IF NOT EXISTS market_reports (
    id TEXT PRIMARY KEY, category TEXT, country TEXT, report TEXT,
    ai_summary TEXT, opportunity TEXT, created_at INTEGER
)```).run(); } catch {}
}

// SEED default categories on first call
const DEFAULT_CATEGORIES = [
  {id:'cartridge',name:'Tattoo Cartridge',parent:'supplies',sort_order:1},
  {id:'machine',name:'Tattoo Machine',parent:'equipment',sort_order:2},
  {id:'ink',name:'Tattoo Ink',parent:'supplies',sort_order:3},
  {id:'printer',name:'Tattoo Printer',parent:'equipment',sort_order:4},
  {id:'powersupply',name:'Power Supply',parent:'equipment',sort_order:5},
  {id:'pmu',name:'PMU Cartridge',parent:'supplies',sort_order:6},
  {id:'needle',name:'Needle & Grip',parent:'supplies',sort_order:7},
  {id:'transfer',name:'Transfer Paper',parent:'supplies',sort_order:8},
  {id:'aftercare',name:'Aftercare',parent:'supplies',sort_order:9},
  {id:'packaging',name:'Packaging',parent:'',sort_order:99},
];
const DEFAULT_COUNTRIES = ['USA','Germany','UK','France','Italy','Spain','Canada','Australia','Japan','Brazil'];

// CATEGORIES
app.get('/api/market/categories', async (c) => {
  await ensureMarketTables(c.env.DB);
  // Seed if empty
  const { results: existing } = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM market_categories').all();
  if (!existing[0]?.cnt) {
    for (const cat of DEFAULT_CATEGORIES) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO market_categories (id,name,parent,sort_order,created_at) VALUES (?,?,?,?,?)')
        .bind(cat.id, cat.name, cat.parent, cat.sort_order, Date.now()).run();
    }
  }
  const { results } = await c.env.DB.prepare('SELECT * FROM market_categories ORDER BY sort_order ASC').all();
  return c.json({ categories: results });
});

app.post('/api/market/categories', async (c) => {
  await ensureMarketTables(c.env.DB);
  const body: any = await c.req.json();
  const id = body.id || 'cat-' + Date.now().toString(36);
  await c.env.DB.prepare('INSERT OR REPLACE INTO market_categories (id,name,parent,sort_order,created_at) VALUES (?,?,?,?,?)')
    .bind(id, body.name, body.parent||'', body.sort_order||0, Date.now()).run();
  return c.json({ ok: true, id });
});

app.delete('/api/market/categories/:id', async (c) => {
  await ensureMarketTables(c.env.DB);
  const { id } = c.req.param();
  await c.env.DB.prepare('DELETE FROM market_categories WHERE id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM market_scores WHERE category = ?').bind(id).run();
  return c.json({ ok: true });
});

// SCORES
app.get('/api/market/scores', async (c) => {
  await ensureMarketTables(c.env.DB);
  const category = c.req.query('category') || '';
  const country = c.req.query('country') || '';
  let sql = 'SELECT * FROM market_scores';
  const params: any[] = [];
  const wheres: string[] = [];
  if (category) { wheres.push('category = ?'); params.push(category); }
  if (country) { wheres.push('country = ?'); params.push(country); }
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' ORDER BY score DESC';
  const { results } = await (params.length ? c.env.DB.prepare(sql).bind(...params) : c.env.DB.prepare(sql)).all();
  return c.json({ scores: results });
});

app.post('/api/market/scores', async (c) => {
  await ensureMarketTables(c.env.DB);
  const body: any = await c.req.json();
  await c.env.DB.prepare(```INSERT OR REPLACE INTO market_scores (category,country,brand,score,google_score,amazon_score,social_score,artist_score,dist_score,rank,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)```).bind(body.category, body.country, body.brand, body.score||0, body.google_score||0, body.amazon_score||0, body.social_score||0, body.artist_score||0, body.dist_score||0, body.rank||0, Date.now()).run();
  return c.json({ ok: true });
});

app.delete('/api/market/scores/:id', async (c) => {
  await ensureMarketTables(c.env.DB);
  const { id } = c.req.param();
  await c.env.DB.prepare('DELETE FROM market_scores WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// REPORTS (Opportunity Finder)
app.get('/api/market/reports', async (c) => {
  await ensureMarketTables(c.env.DB);
  const { results } = await c.env.DB.prepare('SELECT * FROM market_reports ORDER BY created_at DESC LIMIT 50').all();
  return c.json({ reports: results });
});

app.post('/api/market/reports', async (c) => {
  await ensureMarketTables(c.env.DB);
  const body: any = await c.req.json();
  const id = 'mr-' + Date.now().toString(36);
  await c.env.DB.prepare(```INSERT INTO market_reports (id,category,country,report,ai_summary,opportunity,created_at) VALUES (?,?,?,?,?,?,?)```).bind(id, body.category||'', body.country||'', body.report||'', body.ai_summary||'', body.opportunity||'', Date.now()).run();
  return c.json({ ok: true, id });
});

app.delete('/api/market/reports/:id', async (c) => {
  await ensureMarketTables(c.env.DB);
  const { id } = c.req.param();
  await c.env.DB.prepare('DELETE FROM market_reports WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// OPPORTUNITY FINDER (AI-powered analysis stub)
app.get('/api/market/opportunities', async (c) => {
  await ensureMarketTables(c.env.DB);
  const category = c.req.query('category') || '';
  const country = c.req.query('country') || '';
  // Get top brands in this category+country
  let sql = 'SELECT * FROM market_scores';
  const params: any[] = [];
  const wheres: string[] = ['score > 0'];
  if (category) { wheres.push('category = ?'); params.push(category); }
  if (country) { wheres.push('country = ?'); params.push(country); }
  sql += ' WHERE ' + wheres.join(' AND ') + ' ORDER BY score DESC LIMIT 20';
  const { results: scores } = await (params.length ? c.env.DB.prepare(sql).bind(...params) : c.env.DB.prepare(sql)).all();
  // Simple opportunity detection: if demand zone exists but few brands score high
  const opportunities = [];
  const topScore = (scores[0]?.score || 0);
  const gap = 100 - topScore;
  if (gap > 30) {
    opportunities.push({
      type: 'market_gap',
      category, country,
      gap_percent: Math.round(gap),
      recommendation: gap > 50 ? 'High potential market with low competition' : 'Moderate competition, niche opportunity',
    });
  }
  return c.json({ scores, opportunities });
});

// SUMMARY — get all categories with brand count
app.get('/api/market/summary', async (c) => {
  await ensureMarketTables(c.env.DB);
  const { results: categories } = await c.env.DB.prepare('SELECT * FROM market_categories ORDER BY sort_order ASC').all();
  const summary = [];
  for (const cat of (categories || [])) {
    const { results: scores } = await c.env.DB.prepare('SELECT DISTINCT country, COUNT(*) as brands, AVG(score) as avg_score FROM market_scores WHERE category = ? GROUP BY country ORDER BY avg_score DESC').bind(cat.id).all();
    summary.push({ ...cat, countries: scores || [] });
  }
  return c.json({ summary });
});



// ============ CONTENT OPPORTUNITY ENGINE ============

async function ensureOppTables(db: D1Database) {
  try { await db.prepare(```CREATE TABLE IF NOT EXISTS opportunity_signals (
    id TEXT PRIMARY KEY, source TEXT NOT NULL, signal_text TEXT NOT NULL,
    related_product TEXT, related_brand TEXT, score INTEGER DEFAULT 50,
    audience TEXT, pain_point TEXT, content_format TEXT, platform TEXT,
    status TEXT DEFAULT 'active', created_at INTEGER
  )```).run(); } catch {}
  try { await db.prepare(```CREATE TABLE IF NOT EXISTS content_briefs (
    id TEXT PRIMARY KEY, signal_id TEXT, title TEXT NOT NULL,
    hook TEXT, audience TEXT, pain_point TEXT, product TEXT,
    format TEXT, platform TEXT, score INTEGER, source TEXT,
    status TEXT DEFAULT 'draft', created_at INTEGER
  )```).run(); } catch {}
}


app.get('/api/content/signals', async (c) => {
  await ensureOppTables(c.env.DB);
  const source = c.req.query('source') || '';
  const limit = parseInt(c.req.query('limit') || '50');
  let sql = 'SELECT * FROM opportunity_signals WHERE status = ?';
  const params: any[] = ['active'];
  if (source) { sql += ' AND source = ?'; params.push(source); }
  sql += ' ORDER BY score DESC LIMIT ' + limit;
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ signals: results });
});

app.post('/api/content/signals', async (c) => {
  await ensureOppTables(c.env.DB);
  const body: any = await c.req.json();
  const id = 'sig-' + Date.now().toString(36);
  await c.env.DB.prepare(```INSERT INTO opportunity_signals (id,source,signal_text,related_product,related_brand,score,audience,pain_point,content_format,platform,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)```)
    .bind(id, body.source||'manual', body.signal_text, body.related_product||'', body.related_brand||'',
      body.score||50, body.audience||'', body.pain_point||'', body.content_format||'', body.platform||'', 'active', Date.now()).run();
  return c.json({ ok: true, id });
});

app.put('/api/content/signals/:id', async (c) => {
  await ensureOppTables(c.env.DB);
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const fields = ['signal_text','related_product','related_brand','score','audience','pain_point','content_format','platform','status'];
  const sets = fields.filter(f => body[f] !== undefined).map(f => f + ' = ?');
  if (!sets.length) return c.json({ ok: false });
  const vals = fields.filter(f => body[f] !== undefined).map(f => body[f]);
  await c.env.DB.prepare(`UPDATE opportunity_signals SET ` + sets.join(',') + ' WHERE id = ?').bind(...vals, id).run();
  return c.json({ ok: true });
});

app.delete('/api/content/signals/:id', async (c) => {
  await ensureOppTables(c.env.DB);
  const { id } = c.req.param();
  await c.env.DB.prepare(`DELETE FROM opportunity_signals WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

app.get('/api/content/briefs', async (c) => {
  await ensureOppTables(c.env.DB);
  const { results } = await c.env.DB.prepare('SELECT * FROM content_briefs ORDER BY score DESC LIMIT 50').all();
  return c.json({ briefs: results });
});

app.post('/api/content/briefs', async (c) => {
  await ensureOppTables(c.env.DB);
  const body: any = await c.req.json();
  const id = 'br-' + Date.now().toString(36);
  await c.env.DB.prepare(```INSERT INTO content_briefs (id,signal_id,title,hook,audience,pain_point,product,format,platform,score,source,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)```)
    .bind(id, body.signal_id||'', body.title, body.hook||'', body.audience||'', body.pain_point||'',
      body.product||'', body.format||'', body.platform||'', body.score||0, body.source||'', 'draft', Date.now()).run();
  return c.json({ ok: true, id });
});

// AI OPPORTUNITY SCAN
app.post('/api/content/scan-opportunities', async (c) => {
  await ensureOppTables(c.env.DB);
  const body: any = await c.req.json();
  const focus = body.focus || '';
  const signals = [];
  const now = Date.now();
  // Product signals
  try {
    const stocks = await c.env.DB.prepare('SELECT sku, name, current_stock, total_in, total_out FROM products ORDER BY total_out DESC LIMIT 10').all();
    for (const p of (stocks.results || [])) {
      const isHot = (p.total_out || 0) > 50;
      signals.push({
        source: isHot ? 'sales_data' : 'inventory',
        signal_text: isHot ? 'Hot product: ' + (p.name||p.sku) : 'Slow moving: ' + (p.name||p.sku) + ' stock: ' + (p.current_stock||0),
        related_product: p.sku, score: isHot ? 85 : 60,
      });
    }
  } catch {}
  // Competitor signals
  try {
    const comps = await c.env.DB.prepare('SELECT id, name FROM competitor_brands ORDER BY RANDOM() LIMIT 5').all();
    for (const b of (comps.results || [])) {
      const postCount = await c.env.DB.prepare('SELECT COUNT(*) as c FROM competitor_mentions WHERE brand_id = ?').bind(b.id).first() as any;
      if ((postCount?.c || 0) > 0) {
        signals.push({ source: 'competitor_analysis', signal_text: 'Competitor ' + (b.name||'') + ' has ' + postCount.c + ' mentions', related_product: '', score: 75 });
      }
    }
  } catch {}
  // Fallback if no real signals found
  if (signals.length < 3) {
    const sources = ['product_knowledge','competitor_analysis','artist_insight','customer_feedback','sales_data','new_product','social_trend'];
    const topics = focus ? [focus] : ['Fine line cartridge education','PMU needle guide','Tattoo machine comparison','Aftercare content','Supply storage tips'];
    for (const topic of topics) {
      signals.push({
        source: sources[Math.floor(Math.random() * sources.length)],
        signal_text: topic + ' — trending opportunity',
        related_product: '', score: 70 + Math.floor(Math.random() * 25),
      });
    }
  }
  const results = [];
  for (const s of signals) {
    const id = 'sig-' + now.toString(36) + '-' + Math.random().toString(36).slice(2,6);
    await c.env.DB.prepare(```INSERT INTO opportunity_signals (id,source,signal_text,related_product,related_brand,score,audience,pain_point,content_format,platform,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)```)
      .bind(id, s.source, s.signal_text, s.related_product||'', '', s.score||50, '', '', '', '', 'active', now).run();
    results.push({ id: id, source: s.source, signal_text: s.signal_text, score: s.score, related_product: s.related_product });
  }
  return c.json({ ok: true, signals: results });
});

// ============ CRM ARTISTS (Neon primary source, proxied via Pages Function) ============
// Called same-origin from the browser (harvests.pages.dev/api/artists) WITHOUT a Firebase
// token, so both paths are whitelisted in PUBLIC_PATHS. The Pages Function proxies
// /api/* -> this Worker, keeping traffic Cloudflare->Cloudflare (GFW-safe, no CORS).

// GET /api/artists — full list from Neon, used to populate the CRM dashboard
app.get('/api/artists', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const limit = Math.min(5000, Math.max(1, parseInt(c.req.query('limit') || '5000')));
    const rows = await neonQuery(connStr, `SELECT * FROM artists ORDER BY shop_name ASC LIMIT ${limit}`);
    return c.json(rows || []);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /api/artists/bulk-import — upsert artists from a CSV import (best-effort, per-row safe)
const ARTIST_WHITELIST = ['shop_name','ig_handle','city','state','import_region','phone','website','email','rating','followers','reviews','category','full_name','address','profile_pic','conversion_score','country'];
app.post('/api/artists/bulk-import', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ ok: false, error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const { rows, importRegion, defaultCountry = 'USA' } = await c.req.json();
    if (!Array.isArray(rows) || rows.length === 0) return c.json({ ok: true, inserted: 0, updated: 0 });
    let inserted = 0, updated = 0;
    for (const r of rows) {
      try {
        const igRaw = String(r.ig_handle || '').replace(/^@/, '').trim();
        const ig = igRaw.toLowerCase();
        const shop = String(r.shop_name || '').trim();
        if (!ig && !shop) continue;
        let existing: any[] = [];
        if (ig) existing = await neonQuery(connStr, `SELECT id FROM artists WHERE LOWER(ig_handle) = $1`, [ig]);
        if ((!existing || existing.length === 0) && shop) existing = await neonQuery(connStr, `SELECT id FROM artists WHERE LOWER(shop_name) = $1`, [shop.toLowerCase()]);

        const cols: string[] = [];
        const vals: any[] = [];
        const norm: any = { ...r };
        norm.import_region = r.import_region || importRegion;
        norm.country = r.country || defaultCountry;
        for (const k of ARTIST_WHITELIST) {
          if (norm[k] === undefined || norm[k] === null || norm[k] === '') continue;
          cols.push(k); vals.push(norm[k]);
        }
        if (ig && !cols.includes('ig_handle')) { cols.push('ig_handle'); vals.push(ig); }
        if (!ig && shop && !cols.includes('shop_name')) { cols.push('shop_name'); vals.push(shop); }
        if (cols.length === 0) continue;

        if (existing && existing.length) {
          const setClause = cols.map((c2, i) => `${c2} = $${i + 1}`).join(', ');
          await neonQuery(connStr, `UPDATE artists SET ${setClause} WHERE id = $${cols.length + 1}`, [...vals, existing[0].id]);
          updated++;
        } else {
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
          await neonQuery(connStr, `INSERT INTO artists (${cols.join(', ')}) VALUES (${placeholders})`, vals);
          inserted++;
        }
      } catch (rowErr: any) {
        console.warn('[bulk-import] row skipped:', rowErr?.message || rowErr);
      }
    }
    return c.json({ ok: true, inserted, updated });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// ============ MARKETING SCRIPTS & PUBLISH TASKS ============
function safeJson(v: any, fallback: any) {
  try { return typeof v === 'string' ? JSON.parse(v) : (v ?? fallback); } catch { return fallback; }
}

async function ensureMarketingScriptsTable(db: D1Database) {
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS marketing_scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT 'general',
    direction TEXT NOT NULL DEFAULT 'general',
    title TEXT,
    content TEXT NOT NULL,
    tone TEXT,
    tags TEXT,
    match_conditions TEXT,
    usage_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at INTEGER,
    updated_at INTEGER
  )`).run(); } catch {}
}

async function ensurePublishTables(db: D1Database) {
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS publish_tasks (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'pending',
    platform TEXT DEFAULT 'instagram',
    caption TEXT,
    payload TEXT,
    media_files TEXT,
    scheduled_at INTEGER,
    published_at INTEGER,
    created_at INTEGER,
    updated_at INTEGER,
    error_reason TEXT,
    platform_post_id TEXT
  )`).run(); } catch {}
}

// ---------- Marketing Tasks table + script picker (DM pipeline) ----------
async function ensureMarketingTasksTable(db: D1Database) {
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS marketing_tasks (
    id TEXT PRIMARY KEY,
    target_handle TEXT,
    target_name TEXT,
    category TEXT DEFAULT 'industry_talk',
    direction TEXT,
    intent TEXT,
    script_id INTEGER,
    script_content TEXT,
    lead_score INTEGER DEFAULT 0,
    touch_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    leased_by TEXT,
    lease_until BIGINT,
    attempts INTEGER DEFAULT 0,
    error_reason TEXT,
    sent_at BIGINT,
    reply_at BIGINT,
    converted_at BIGINT,
    created_at BIGINT,
    updated_at BIGINT
  )`).run(); } catch {}
}

// Pick the best-performing active script for a category (server-side fill, 方案 A)
async function selectBestScript(db: D1Database, category: string, _intent?: string): Promise<{ id: number; content: string } | null> {
  let sql = 'SELECT id, content FROM marketing_scripts WHERE active = 1';
  const params: any[] = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY success_rate DESC, usage_count DESC, id DESC LIMIT 1';
  const { results } = params.length
    ? await db.prepare(sql).bind(...params).all()
    : await db.prepare(sql).all();
  const row: any = (results || [])[0];
  if (!row) return null;
  return { id: Number(row.id), content: String(row.content || '') };
}

// ---------- Marketing Scripts (protected; frontend uses apiFetch) ----------
app.get('/api/marketing/scripts', async (c) => {
  await ensureMarketingScriptsTable(c.env.DB);
  const category = c.req.query('category') || '';
  const active = c.req.query('active'); // 'true' | 'false' | undefined
  const wheres: string[] = [];
  const params: any[] = [];
  // active=true -> only active; active=false OR missing -> full library (matches frontend semantics)
  if (active === 'true') wheres.push('active = 1');
  if (category) { wheres.push('category = ?'); params.push(category); }
  let sql = 'SELECT * FROM marketing_scripts';
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' ORDER BY usage_count DESC, id DESC';
  const { results } = await (params.length ? c.env.DB.prepare(sql).bind(...params) : c.env.DB.prepare(sql)).all();
  return c.json({ scripts: results || [] });
});

app.post('/api/marketing/scripts', async (c) => {
  await ensureMarketingScriptsTable(c.env.DB);
  const b: any = await c.req.json().catch(() => ({}));
  if (!b.content) return c.json({ ok: false, error: 'content required' }, 400);
  const now = Date.now();
  const mc = typeof b.match_conditions === 'string' ? b.match_conditions : (b.match_conditions ? JSON.stringify(b.match_conditions) : null);
  if (b.id) {
    await c.env.DB.prepare(`UPDATE marketing_scripts SET category=?, direction=?, title=?, content=?, tone=?, tags=?, match_conditions=?, active=?, updated_at=? WHERE id=?`)
      .bind(b.category || 'general', b.direction || 'general', b.title || null, b.content, b.tone || null, b.tags || null, mc, b.active === false ? 0 : 1, now, b.id).run();
    return c.json({ ok: true, id: b.id });
  }
  const res: any = await c.env.DB.prepare(`INSERT INTO marketing_scripts (category,direction,title,content,tone,tags,match_conditions,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(b.category || 'general', b.direction || 'general', b.title || null, b.content, b.tone || null, b.tags || null, mc, b.active === false ? 0 : 1, now, now).run();
  return c.json({ ok: true, id: Number(res?.meta?.last_row_id) || null });
});

app.delete('/api/marketing/scripts/:id', async (c) => {
  await ensureMarketingScriptsTable(c.env.DB);
  const { id } = c.req.param();
  await c.env.DB.prepare('DELETE FROM marketing_scripts WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

app.get('/api/marketing/scripts/ab-test', async (c) => {
  await ensureMarketingScriptsTable(c.env.DB);
  const { results } = await c.env.DB.prepare(`SELECT category, COUNT(*) as count, AVG(success_rate) as avgSuccessRate, MAX(usage_count) as maxUsage FROM marketing_scripts WHERE active=1 GROUP BY category`).all();
  const categories = (results || []).map((r: any) => ({
    category: r.category,
    count: r.count,
    avgSuccessRate: Math.round((Number(r.avgSuccessRate) || 0) * 100) / 100,
    topScriptTitle: null,
    recommendedDirection: null,
  }));
  return c.json({ categories });
});

app.post('/api/marketing/scripts/auto-optimize', async (c) => {
  // STUB: real optimization needs Gemini to rewrite low success_rate scripts.
  await ensureMarketingScriptsTable(c.env.DB);
  return c.json({ ok: true, changed: [], note: 'stub: wire Gemini to rewrite low success_rate scripts' });
});

// ---------- Marketing Tasks (DM pipeline) ----------
// Bot injects a DM task on follow-back detection; Worker fills script_content server-side.
app.post('/api/automation/create-marketing-task', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  await ensureMarketingTasksTable(c.env.DB);
  await ensureMarketingScriptsTable(c.env.DB);
  try {
    const b: any = await c.req.json().catch(() => ({}));
    const targetHandle = String(b.targetHandle || '').replace(/^@/, '').trim();
    if (!targetHandle) return c.json({ error: 'targetHandle required' }, 400);
    const now = Date.now();
    const dedupWindow = now - 7 * 24 * 60 * 60 * 1000;
    const dup: any = await c.env.DB.prepare(
      `SELECT id FROM marketing_tasks WHERE target_handle = ? AND status IN ('pending','leased','sent','replied','converted') AND updated_at > ? LIMIT 1`
    ).bind(targetHandle, dedupWindow).first();
    if (dup) return c.json({ ok: true, created: false, skipped: true, id: dup.id, reason: 'duplicate' });

    const category = String(b.category || 'industry_talk');
    const intent = b.intent ? String(b.intent) : null;
    let scriptId: number | null = null;
    let scriptContent: string | null = null;
    if (b.scriptId) {
      const sr: any = await c.env.DB.prepare('SELECT id, content FROM marketing_scripts WHERE id = ?').bind(Number(b.scriptId)).first();
      if (sr) { scriptId = Number(sr.id); scriptContent = String(sr.content || ''); }
    }
    if (!scriptContent) {
      const best = await selectBestScript(c.env.DB, category, intent || undefined);
      if (best) { scriptId = best.id; scriptContent = best.content; }
    }
    const id = `mt_${now}_${Math.random().toString(36).slice(2, 8)}`;
    await c.env.DB.prepare(`INSERT INTO marketing_tasks
      (id, target_handle, target_name, category, direction, intent, script_id, script_content, lead_score, touch_count, status, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,'pending',?,?)`)
      .bind(id, targetHandle, b.targetName ? String(b.targetName) : null, category,
        b.direction ? String(b.direction) : null, intent, scriptId, scriptContent,
        Number(b.leadScore || 0), Number(b.touchCount || 0), now, now).run();
    if (scriptId) await c.env.DB.prepare('UPDATE marketing_scripts SET usage_count = usage_count + 1 WHERE id = ?').bind(scriptId).run().catch(() => {});
    return c.json({ ok: true, created: true, id, scriptId, scriptFilled: !!scriptContent });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// Bot leases one pending task (only those with a script pre-filled).
app.get('/api/marketing/tasks/poll', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const botId = c.req.query('botId') || '';
  const limit = Math.min(10, Math.max(1, Number(c.req.query('limit')) || 1));
  if (!botId) return c.json({ error: 'botId required' }, 400);
  await ensureMarketingTasksTable(c.env.DB);
  const now = Date.now();
  try {
    await c.env.DB.prepare(`UPDATE marketing_tasks SET status='pending', leased_by=NULL, lease_until=NULL, updated_at=? WHERE status='leased' AND lease_until IS NOT NULL AND lease_until < ?`)
      .bind(now, now).run().catch(() => {});
    const { results } = await c.env.DB.prepare(
      `SELECT id, target_handle, target_name, category, direction, intent, script_id, script_content, lead_score, touch_count, status
       FROM marketing_tasks WHERE status='pending' AND script_content IS NOT NULL ORDER BY created_at ASC LIMIT ?`
    ).bind(limit).all();
    const tasks: any[] = results || [];
    for (const t of tasks) {
      await c.env.DB.prepare(`UPDATE marketing_tasks SET status='leased', leased_by=?, lease_until=?, updated_at=? WHERE id=? AND status='pending'`)
        .bind(botId, now + 120_000, now, t.id).run().catch(() => {});
    }
    await c.env.DB.prepare(`INSERT INTO bot_instances (bot_id,status,registered_at,last_heartbeat) VALUES (?,'online',?,?) ON CONFLICT(bot_id) DO UPDATE SET status='online', last_heartbeat=excluded.last_heartbeat`)
      .bind(botId, now, now).run().catch(() => {});
    return c.json({ ok: true, tasks });
  } catch (e: any) {
    console.error('[marketing poll]', e?.message || e);
    return c.json({ ok: true, tasks: [] });
  }
});

// Bot reports task result.
//  - sent/failed: the send outcome (requires lease ownership; original queue transition)
//  - replied/converted: post-send lifecycle signals (lease already cleared, so no lease check).
//    replied  = target replied to our outbound DM (bot detects inbound reply)
//    converted = lead became a customer (order flow / manual). See also mark-converted.
app.post('/api/marketing/tasks/report', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  await ensureMarketingTasksTable(c.env.DB);
  try {
    const b: any = await c.req.json();
    let taskId = String(b.taskId || '');
    const status = String(b.status || '');
    const botId = String(b.botId || '');
    const targetHandleRaw = b.targetHandle ? String(b.targetHandle).replace(/^@/, '').trim() : '';
    const ALLOWED = ['sent', 'failed', 'replied', 'converted'];
    if (!ALLOWED.includes(status)) return c.json({ error: `status must be one of ${ALLOWED.join('|')}` }, 400);
    if (!taskId && !targetHandleRaw) return c.json({ error: 'taskId or targetHandle required' }, 400);
    const now = Date.now();

    // Post-send statuses (replied/converted) may arrive from the bot's inbox check,
    // which only knows the conversation partner's handle — resolve it to the most
    // recent engaged task. No-op (matched:false) when no such task exists.
    if (!taskId && targetHandleRaw && (status === 'replied' || status === 'converted')) {
      const handleStatuses = status === 'replied'
        ? "status IN ('sent','replied')"
        : "status IN ('sent','replied','converted')";
      const row: any = await c.env.DB.prepare(
        `SELECT id FROM marketing_tasks WHERE target_handle=? AND ${handleStatuses} ORDER BY updated_at DESC LIMIT 1`
      ).bind(targetHandleRaw).first();
      if (!row) return c.json({ ok: true, matched: false, reason: 'no engaged task for handle', status });
      taskId = String(row.id);
    }

    let res: any;
    if (status === 'sent' || status === 'failed') {
      // Original send report — requires this bot to hold the lease.
      if (!taskId) return c.json({ error: 'taskId required for sent/failed' }, 400);
      if (!botId) return c.json({ error: 'botId required for sent/failed' }, 400);
      res = await c.env.DB.prepare(`UPDATE marketing_tasks SET status=?, leased_by=NULL, lease_until=NULL, error_reason=?, sent_at=?, attempts=attempts+1, updated_at=? WHERE id=? AND leased_by=? AND status IN ('leased','pending')`)
        .bind(status, status === 'failed' ? (b.reason || 'unknown') : null, status === 'sent' ? now : null, now, taskId, botId).run();
      if (status === 'sent') {
        const t: any = await c.env.DB.prepare('SELECT script_id FROM marketing_tasks WHERE id = ?').bind(taskId).first();
        if (t?.script_id) await c.env.DB.prepare('UPDATE marketing_scripts SET usage_count = usage_count + 1 WHERE id = ?').bind(t.script_id).run().catch(() => {});
      }
    } else if (status === 'replied') {
      // Post-send: only a task we already sent (or previously replied) can flip to replied.
      res = await c.env.DB.prepare(`UPDATE marketing_tasks SET status='replied', reply_at=?, updated_at=? WHERE id=? AND status IN ('sent','replied')`)
        .bind(now, now, taskId).run();
    } else {
      // converted: terminal win state; also backfill reply_at if the reply was never recorded.
      res = await c.env.DB.prepare(`UPDATE marketing_tasks SET status='converted', converted_at=?, reply_at=COALESCE(reply_at, ?), updated_at=? WHERE id=? AND status IN ('sent','replied','converted')`)
        .bind(now, now, now, taskId).run();
      // bump script success on conversion
      const t: any = await c.env.DB.prepare('SELECT script_id FROM marketing_tasks WHERE id = ?').bind(taskId).first();
      if (t?.script_id) await c.env.DB.prepare('UPDATE marketing_scripts SET success_rate = MIN(1.0, success_rate + 0.02) WHERE id = ?').bind(t.script_id).run().catch(() => {});
    }
    return c.json({ ok: true, taskId, status, changes: res?.meta?.changes || 0 });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// Order flow / manual: mark a lead as converted by IG handle (or taskId).
// Orders don't yet carry an IG handle, so this is the hook the order pipeline
// (or an admin action) calls once handle↔order linking exists. Bot-token protected.
app.post('/api/marketing/tasks/mark-converted', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  await ensureMarketingTasksTable(c.env.DB);
  try {
    const b: any = await c.req.json().catch(() => ({}));
    const taskId = b.taskId ? String(b.taskId) : '';
    const targetHandle = b.targetHandle ? String(b.targetHandle).replace(/^@/, '').trim() : '';
    if (!taskId && !targetHandle) return c.json({ error: 'taskId or targetHandle required' }, 400);
    const now = Date.now();
    let res: any;
    if (taskId) {
      res = await c.env.DB.prepare(`UPDATE marketing_tasks SET status='converted', converted_at=?, reply_at=COALESCE(reply_at, ?), updated_at=? WHERE id=? AND status IN ('sent','replied','converted')`)
        .bind(now, now, now, taskId).run();
    } else {
      // Convert the most recent engaged task for this handle.
      const row: any = await c.env.DB.prepare(`SELECT id FROM marketing_tasks WHERE target_handle=? AND status IN ('sent','replied','converted') ORDER BY updated_at DESC LIMIT 1`)
        .bind(targetHandle).first();
      if (!row) return c.json({ ok: true, matched: false, reason: 'no engaged task for handle' });
      res = await c.env.DB.prepare(`UPDATE marketing_tasks SET status='converted', converted_at=?, reply_at=COALESCE(reply_at, ?), updated_at=? WHERE id=?`)
        .bind(now, now, now, row.id).run();
    }
    return c.json({ ok: true, matched: (res?.meta?.changes || 0) > 0, changes: res?.meta?.changes || 0 });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// Bot picks a reply script by category+intent (used by inbound DM auto-reply).
app.post('/api/marketing/scripts/select', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  await ensureMarketingScriptsTable(c.env.DB);
  try {
    const b: any = await c.req.json().catch(() => ({}));
    const category = String(b.category || '');
    const best = await selectBestScript(c.env.DB, category, b.intent ? String(b.intent) : undefined);
    if (!best) return c.json({ selected: null });
    await c.env.DB.prepare('UPDATE marketing_scripts SET usage_count = usage_count + 1 WHERE id = ?').bind(best.id).run().catch(() => {});
    return c.json({ selected: { id: best.id, content: best.content, category } });
  } catch (e: any) {
    return c.json({ selected: null, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// Frontend (protected; apiFetch) — recent sent/failed tasks.
app.get('/api/marketing/tasks/history', async (c) => {
  await ensureMarketingTasksTable(c.env.DB);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 20));
  const { results } = await c.env.DB.prepare(
    `SELECT id, target_handle, target_name, category, direction, intent, script_id, lead_score, touch_count, status, sent_at, reply_at, converted_at, created_at, updated_at
     FROM marketing_tasks WHERE status IN ('sent','failed','replied','converted') ORDER BY updated_at DESC LIMIT ?`
  ).bind(limit).all();
  return c.json({ tasks: results || [], limit });
});

// Frontend (protected; apiFetch) — aggregate counts + conversion rate.
app.get('/api/marketing/tasks/stats', async (c) => {
  await ensureMarketingTasksTable(c.env.DB);
  const { results } = await c.env.DB.prepare('SELECT status, COUNT(*) as c FROM marketing_tasks GROUP BY status').all();
  const counts: any = { pending: 0, sent: 0, replied: 0, converted: 0, failed: 0 };
  for (const r of (results || [])) {
    const s = String(r.status);
    if (s in counts) counts[s] = Number(r.c);
  }
  const denom = counts.sent + counts.converted;
  const conversionRate = denom > 0 ? Math.round((counts.converted / denom) * 1000) / 10 : 0;
  return c.json({ counts, conversionRate });
});

// ---------- Publish Tasks (protected; frontend uses apiFetch) ----------
app.get('/api/publish/tasks', async (c) => {
  await ensurePublishTables(c.env.DB);
  const limit = Math.min(2000, Math.max(1, Number(c.req.query('limit')) || 500));
  const { results } = await c.env.DB.prepare('SELECT * FROM publish_tasks ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT ?').bind(limit).all();
  return c.json({ rows: results || [] });
});

app.get('/api/publish/tasks/pending-media', async (c) => {
  await ensurePublishTables(c.env.DB);
  const { results } = await c.env.DB.prepare(`SELECT * FROM publish_tasks WHERE (media_files IS NULL OR media_files = '[]') AND status IN ('pending','pending_media','scheduled') ORDER BY created_at DESC`).all();
  const tasks = (results || []).map((r: any) => ({
    id: r.id,
    status: r.status,
    platform: r.platform,
    payload: safeJson(r.payload, {}),
    mediaFiles: safeJson(r.media_files, []),
  }));
  return c.json({ tasks });
});

app.post('/api/publish/tasks/:id/attach-media', async (c) => {
  await ensurePublishTables(c.env.DB);
  const { id } = c.req.param();
  const b: any = await c.req.json().catch(() => ({}));
  const mediaFiles = Array.isArray(b.mediaFiles) ? JSON.stringify(b.mediaFiles) : (typeof b.mediaFiles === 'string' ? b.mediaFiles : '[]');
  await c.env.DB.prepare(`UPDATE publish_tasks SET media_files=?, status='pending_media', updated_at=? WHERE id=?`).bind(mediaFiles, Date.now(), id).run();
  return c.json({ ok: true });
});

// Bot-authenticated ingest endpoint — lets the publish pipeline (VPS bot / harvests-engine)
// create publish tasks. Whichever caller holds BOT_SECRET can POST here.
app.post('/api/publish/ingest', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  await ensurePublishTables(c.env.DB);
  const b: any = await c.req.json().catch(() => ({}));
  const id = b.id || ('pt-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  const payload = b.payload ? (typeof b.payload === 'string' ? b.payload : JSON.stringify(b.payload)) : null;
  const mediaFiles = b.mediaFiles ? JSON.stringify(Array.isArray(b.mediaFiles) ? b.mediaFiles : [b.mediaFiles]) : null;
  const now = Date.now();
  await c.env.DB.prepare(`INSERT OR REPLACE INTO publish_tasks (id,status,platform,caption,payload,media_files,scheduled_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(id, b.status || 'pending', b.platform || 'instagram', b.caption || null, payload, mediaFiles, b.scheduled_at || null, now, now).run();
  return c.json({ ok: true, id });
});

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    console.log('[scheduled] triggered at', new Date().toISOString());
    try {
      const config = await env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any;
      if (!config) { console.log('[scheduled] Shopify not configured'); return; }
      const accessToken = config.api_key;
      const storeDomain = config.api_base_url ? new URL(config.api_base_url).hostname : 'dptattoo.myshopify.com';
      const apiVersion = '2024-10';
      let ordersUrl = `https://${storeDomain}/admin/api/${apiVersion}/orders.json?status=any&fulfillment_status=any&created_at_min=${new Date(Date.now() - 7*86400000).toISOString()}&limit=250`;
      let totalOrders = 0, deductedItems: any[] = [];
      while (ordersUrl) {
        const resp = await fetch(ordersUrl, { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } });
        if (!resp.ok) { console.log('[scheduled] Shopify error:', resp.status); break; }
        const payload = await resp.json() as any;
        const orders = payload.orders || [];
        for (const order of orders) {
          const orderId = '#' + (order.order_number || order.name || '');
          totalOrders++;
          const existing = await env.DB.prepare('SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? LIMIT 1').bind(orderId).first();
          if (existing) continue;
          for (const item of (order.line_items || [])) {
            const sku = (item.sku || item.variant_sku || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
            if (!sku || item.quantity <= 0) continue;
            const note = `Shopify Order ${orderId}`;
            await env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
              .bind(sku, item.quantity, 'B2C', (order.customer?.firstName||'')+' '+(order.customer?.lastName||'') || order.customer?.email || '', orderId, (order.createdAt||'').slice(0,10), note, Date.now()).run();
            deductedItems.push({ sku, qty: item.quantity });
          }
        }
        ordersUrl = null;
        const linkHeader = resp.headers.get('link') || '';
        const relNext = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (relNext) ordersUrl = relNext[1];
      }
      console.log('[scheduled] done:', totalOrders, 'orders,' , deductedItems.length, 'items');
    } catch (e: any) { console.log('[scheduled] error:', e?.message || e); }
  }
};

