import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { neon } from '@neondatabase/serverless'

type UserInfo = { uid: string; email?: string }

// Neon HTTP query helper — uses Neon SQL-over-HTTP API with Basic auth
async function neonQuery(connStr: string, query: string, params?: any[]): Promise<any[]> {
  if (!connStr) throw new Error('NEON_DATABASE_URL not configured');
  const m = connStr.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (!m) throw new Error('Invalid Neon URL format');
  const [, user, pass, host] = m;
  const basic = btoa(`${user}:${pass}`);
  const body: any = { query };
  if (params && params.length > 0) body.params = params;
  const resp = await fetch(`https://${host}/v2/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${basic}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`Neon ${resp.status}: ${t.slice(0,200)}`); }
  const data: any = await resp.json();
  return data.rows || data;
}

// Bot token verification — shared between bot endpoints
const BOT_SECRET = 'vps-bot-secret-2024';
function checkBotToken(c: any): boolean {
  const auth = c.req.header('Authorization') || '';
  if (auth === `Bearer ${BOT_SECRET}`) return true;
  if (c.req.query('token') === BOT_SECRET) return true;
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

// Health check — no DB dependency
app.get('/_health', (c) => c.json({ ok: true, time: Date.now() }))
app.get('/_ver', (c) => c.json({ ver: 'final-v2', time: Date.now() }))

// ── Firebase JWT verification ──
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

// ── Auth middleware (protects /api/* except whitelisted paths) ──
const PUBLIC_PATHS = new Set([
  '/api/shopify/webhook/orders-create',
  '/api/fulfillment/shopify/callback',
  '/api/automation/bot-account',
  '/api/automation/bot-account/delete',
  '/api/automation/behavior-logs',
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
  '/api/automation/tasks/clear-duplicate-pending',
  '/api/automation/tasks/clear-all-pending',
  '/api/automation/poll-debug',
  '/api/bot/noise-sites',
  '/api/bot/observe',
  '/api/tasks/create',
])

app.use('/api/*', async (c, next) => {
  const path = new URL(c.req.url).pathname
  if (PUBLIC_PATHS.has(path)) return next()
  if (path === '/api/shopify/status' || path === '/api/shopify/orders/deduct') return next()

  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized — missing token' }, 401)
  }
  const user = await verifyToken(auth.slice(7))
  if (!user) {
    return c.json({ error: 'Unauthorized — invalid token' }, 401)
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

app.get('/api/inventory/stock', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT p.*,
      COALESCE((SELECT SUM(quantity) FROM inventory_inbounds WHERE product_sku = p.sku), 0) AS total_in,
      COALESCE((SELECT SUM(quantity) FROM inventory_outbounds WHERE product_sku = p.sku), 0) AS total_out
    FROM inventory_products p ORDER BY p.sku
  `).all()
  const items = (rows.results || []).map((r: any) => ({
    ...r,
    current_stock: (r.total_in || 0) - (r.total_out || 0),
    status: (r.total_in || 0) - (r.total_out || 0) === 0 ? 'out_of_stock'
      : (r.total_in || 0) - (r.total_out || 0) <= (r.reorder_point || 0) ? 'low_stock' : 'healthy'
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
  const allowed = ['name','category','vendor','unit','unit_price','reorder_point','reorder_qty','lead_time_days','moq','carton_qty','source','barcode','image_url']
  if (!allowed.includes(field)) return c.json({ error: 'invalid field' }, 400)
  await c.env.DB.prepare(`UPDATE inventory_products SET ${field}=?, updated_at=? WHERE sku=?`).bind(value, Date.now(), sku).run()
  return c.json({ ok: true })
})

app.delete('/api/inventory/product/:sku', async (c) => {
  await c.env.DB.prepare('DELETE FROM inventory_products WHERE sku=?').bind(c.req.param('sku')).run()
  return c.json({ ok: true })
})

// ============ INBOUND / OUTBOUND ============

app.post('/api/inventory/inbound', async (c) => {
  const { product_sku, quantity, po_number, inbound_date, note } = await c.req.json()
  if (!product_sku || !quantity || !inbound_date) return c.json({ error: 'product_sku, quantity, inbound_date required' }, 400)
  await c.env.DB.prepare('INSERT INTO inventory_inbounds (product_sku,quantity,po_number,inbound_date,note,created_at) VALUES (?,?,?,?,?,?)')
    .bind(product_sku, quantity, po_number||'', inbound_date, note||'', Date.now()).run()
  return c.json({ ok: true })
})

app.post('/api/inventory/outbound', async (c) => {
  const { product_sku, quantity, channel, customer_name, shopify_order_id, outbound_date, note } = await c.req.json()
  if (!product_sku || !quantity || !channel || !outbound_date) return c.json({ error: 'product_sku, quantity, channel, outbound_date required' }, 400)
  if (!['B2C','B2B'].includes(channel)) return c.json({ error: 'channel must be B2C or B2B' }, 400)
  await c.env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(product_sku, quantity, channel, customer_name||'', shopify_order_id||'', outbound_date, note||'', Date.now()).run()
  if (channel === 'B2B' && customer_name) {
    const now = Date.now()
    try {
      await c.env.DB.prepare('INSERT INTO inventory_customers (name,updated_at,created_at) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET updated_at=?')
        .bind(customer_name, now, now, now).run()
    } catch {}
  }
  return c.json({ ok: true })
})

app.get('/api/inventory/inbounds', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM inventory_inbounds ORDER BY inbound_date DESC LIMIT 500').all()
  return c.json({ ok: true, items: rows.results || [] })
})

app.get('/api/inventory/outbounds', async (c) => {
  const channel = c.req.query('channel')
  const sku = c.req.query('sku')
  let sql = 'SELECT * FROM inventory_outbounds WHERE 1=1'
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
    const needleRegex = /(\d{3,4})(RL|RS|RG|RT|F|M)\s*[xX*×]?\s*(\d+)?\s*(盒|箱)?/gi
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
    const posterMatch = note.match(/(小海报|大海报|海报)[\sxX*×]*(\d+)?/i)
    if (posterMatch) gifts.push({ type: 'poster', label: '海报', quantity: parseInt(posterMatch[2] || '1', 10) })
    return gifts
  } catch { return [] }
}

const parseGiftSkus = (note: string): Array<{ sku: string; qty: number; name: string }> => {
  return parseNote(note).map(g => ({
    sku: g.type === 'needle' ? g.label : 'POSTER',
    qty: g.quantity,
    name: g.type === 'needle' ? g.label : '海报'
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

app.post('/api/shopify/orders/deduct', async (c) => {
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any
  if (!config) return c.json({ error: 'Shopify not configured' }, 400)

  const accessToken = config.api_key
  const storeDomain = config.api_base_url ? new URL(config.api_base_url).hostname : 'dptattoo.myshopify.com'
  const apiVersion = '2024-10'
  const now = Date.now()
  let totalOrders = 0
  let deductedItems: any[] = []
  let ordersUrl = `https://${storeDomain}/admin/api/${apiVersion}/orders.json?status=any&fulfillment_status=unfulfilled&created_at_min=${new Date(Date.now() - 7*86400000).toISOString()}&limit=250`

  while (ordersUrl) {
    const resp = await fetch(ordersUrl, { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } })
    if (!resp.ok) return c.json({ error: `Shopify API ${resp.status}: ${(await resp.text()).slice(0,240)}` }, 502)
    const payload = await resp.json() as any
    const orders = Array.isArray(payload?.orders) ? payload.orders : []

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
        if (customerNote) noteParts.push(`客户留言: ${customerNote}`)
        if (item.title) noteParts.push(`商品: ${item.title}`)
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
            .bind(gift.sku, gift.qty, 'B2C', customerName||'Shopify Customer', orderId, outboundDate, `Shopify Order #${orderName} | 赠送品: ${gift.name}`, now).run()
          deductedItems.push({ sku: gift.sku, qty: gift.qty, order: orderName, item: `🎁赠送 ${gift.name}` })
        }
      }
      totalOrders++
    }
    const linkHeader = resp.headers.get('link')
    ordersUrl = linkHeader ? parseNextLink(linkHeader) : null
  }
  return c.json({ ok: true, ordersProcessed: totalOrders, itemsDeducted: deductedItems.length, details: deductedItems })
})

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
    const noteParts = [`Shopify Order #${orderName}`, '来源: webhook']
    if (customerNote) noteParts.push(`客户留言: ${customerNote}`)
    if (item.title) noteParts.push(`商品: ${item.title}`)
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
        .bind(gift.sku, gift.qty, 'B2C', customerName||'Shopify Customer', orderId, outboundDate, `Shopify Order #${orderName} | 赠送品: ${gift.name}`, now).run()
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

// ============ DISTRIBUTOR (needs Neon — keep on VPS) ============

app.get('/api/inventory/distributor-candidates', async (c) => {
  return c.json({ error: 'Distributor import requires Neon DB on VPS' }, 400)
})
app.post('/api/inventory/import-distributor', async (c) => {
  return c.json({ error: 'Distributor import requires Neon DB on VPS' }, 400)
})

// ============ INVENTORY SOURCE LOAD (CSV import — keep on VPS) ============

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

  // Bot accounts
  if (body.accounts) {
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
  // Each query independently — missing tables don't cascade
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
      const sql = neon(connStr);
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

// State progress — per-state coverage from D1 (no Neon dependency)
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
    const sql = neon(connStr);
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
            WHERE d.status = 'done' AND d.updated_at > ${dedupWindow}
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
      const sql = neon(connStr);
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

// ===== Bot 观察数据上报 (called by bot-worker after each profile) =====
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
    const sql = neon(connStr);
    // Ensure table exists
    await sql`CREATE TABLE IF NOT EXISTS bot_observations (id SERIAL PRIMARY KEY, bot_id TEXT NOT NULL, artist_handle TEXT, mode TEXT NOT NULL, created_at BIGINT NOT NULL)`.catch(() => {});
    // Write observation
    await sql`INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES (${botId}, ${artistHandle || null}, ${mode}, ${ts})`;
    // If commandId provided, also mark task done
    if (commandId) {
      await sql`UPDATE automation_tasks SET status = 'done', lease_until = NULL, leased_by = NULL, updated_at = ${ts} WHERE id = ${commandId}`.catch(() => {});
    }
    // Update artists table with IG profile data scraped by bot
    // Use individual UPDATEs via neonQuery (simple queries work with HTTP API)
    if (artistHandle && body.profileFacts) {
      const pf = body.profileFacts;
      try {
        if (pf.followers != null) await neonQuery(connStr, `UPDATE artists SET followers = $1 WHERE LOWER(ig_handle) = $2`, [Number(pf.followers), artistHandle]).catch(() => {});
        if (pf.following != null) await neonQuery(connStr, `UPDATE artists SET "following" = $1 WHERE LOWER(ig_handle) = $2`, [Number(pf.following), artistHandle]).catch(() => {});
        if (pf.postCount != null) await neonQuery(connStr, `UPDATE artists SET posts_count = $1 WHERE LOWER(ig_handle) = $2`, [Number(pf.postCount), artistHandle]).catch(() => {});
        if (pf.bio) await neonQuery(connStr, `UPDATE artists SET bio = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.bio).slice(0, 500), artistHandle]).catch(() => {});
        if (pf.email) await neonQuery(connStr, `UPDATE artists SET email = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.email), artistHandle]).catch(() => {});
        if (pf.externalUrl) await neonQuery(connStr, `UPDATE artists SET website = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.externalUrl), artistHandle]).catch(() => {});
      } catch {}
    }
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: String(e?.message || e) }, 500);
  }
});

// ===== 噪声站点配置（供 bot human mimicry 使用） =====
app.get('/api/bot/noise-sites', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const botId = c.req.query('botId') || '';
  // Default noise sites — can be overridden per bot via D1 bot_config table
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

// ===== Bot 配置管理（供前端 BotConfigSection 使用） =====
app.get('/api/automation/bot-config', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ') && !c.req.query('token')) {
    return c.json({ error: 'unauthorized' }, 401);
  }
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

// ===== 快速检查 Neon 连接 =====
app.get('/api/automation/neon-test', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ ok: false, error: 'NEON_DATABASE_URL not set', hint: 'use wrangler secret put NEON_DATABASE_URL' });
  // 测试正则解析
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

// ===== 快速检查 Neon 连接 =====
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

// ===== 采集数据：读写 Neon =====
async function ensureObservationsTable(connStr: string) {
  try { await neonQuery(connStr, `CREATE TABLE IF NOT EXISTS bot_observations (id SERIAL PRIMARY KEY, bot_id TEXT NOT NULL, artist_handle TEXT, mode TEXT NOT NULL, created_at BIGINT NOT NULL)`); } catch {}
  try { await neonQuery(connStr, `CREATE INDEX IF NOT EXISTS idx_bot_obs_created_at ON bot_observations(created_at DESC)`); } catch {}
}


// Bot worker 上报观测数据到 Neon（也支持批量 {items:[...]}）
app.all('/api/automation/observations', async (c) => {
  if (c.req.method === 'GET') {
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 20));
    // 先试试 VPS Express（有完整数据含 summary_json / profile_facts_json）
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
      const sql = neon(connStr);
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
    // 批量同步
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
    // 单条上报
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
// 删除旧的 sync 端点（已合并到 POST /observations）
// app.post('/api/automation/observations/sync', ...) 已移除

// ===== 数据看板：查询 Neon artists 表（JS 去重，不与 SQL 打架） =====
app.get('/api/automation/artists', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const state = (c.req.query('state') || '').toUpperCase();
    const search = c.req.query('search') || '';
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50')));
    const offset = (page - 1) * limit;
    const fetchLimit = Math.min(200, limit * 4);

    const sql = neon(connStr);
    let dataRes, countRes;
    if (state && search) {
      dataRes = await sql`SELECT id, shop_name, ig_handle, city, import_region, phone, website, rating, followers, reviews FROM artists WHERE ig_handle IS NOT NULL AND ig_handle != '' AND import_region = ${state} AND (LOWER(shop_name) LIKE LOWER(${'%'+search+'%'}) OR LOWER(ig_handle) LIKE LOWER(${'%'+search+'%'}) OR LOWER(city) LIKE LOWER(${'%'+search+'%'})) ORDER BY shop_name ASC LIMIT ${fetchLimit} OFFSET ${offset}`;
      countRes = await sql`SELECT COUNT(*) as cnt FROM (SELECT DISTINCT ig_handle FROM artists WHERE ig_handle IS NOT NULL AND ig_handle != '' AND import_region = ${state} AND (LOWER(shop_name) LIKE LOWER(${'%'+search+'%'}) OR LOWER(ig_handle) LIKE LOWER(${'%'+search+'%'}) OR LOWER(city) LIKE LOWER(${'%'+search+'%'}))) sub`;
    } else if (state) {
      dataRes = await sql`SELECT id, shop_name, ig_handle, city, import_region, phone, website, rating, followers, reviews FROM artists WHERE ig_handle IS NOT NULL AND ig_handle != '' AND import_region = ${state} ORDER BY shop_name ASC LIMIT ${fetchLimit} OFFSET ${offset}`;
      countRes = await sql`SELECT COUNT(*) as cnt FROM (SELECT DISTINCT ig_handle FROM artists WHERE ig_handle IS NOT NULL AND ig_handle != '' AND import_region = ${state}) sub`;
    } else if (search) {
      dataRes = await sql`SELECT id, shop_name, ig_handle, city, import_region, phone, website, rating, followers, reviews FROM artists WHERE ig_handle IS NOT NULL AND ig_handle != '' AND (LOWER(shop_name) LIKE LOWER(${'%'+search+'%'}) OR LOWER(ig_handle) LIKE LOWER(${'%'+search+'%'}) OR LOWER(city) LIKE LOWER(${'%'+search+'%'})) ORDER BY shop_name ASC LIMIT ${fetchLimit} OFFSET ${offset}`;
      countRes = await sql`SELECT COUNT(*) as cnt FROM (SELECT DISTINCT ig_handle FROM artists WHERE ig_handle IS NOT NULL AND ig_handle != '' AND (LOWER(shop_name) LIKE LOWER(${'%'+search+'%'}) OR LOWER(ig_handle) LIKE LOWER(${'%'+search+'%'}) OR LOWER(city) LIKE LOWER(${'%'+search+'%'}))) sub`;
    } else {
      dataRes = await sql`SELECT id, shop_name, ig_handle, city, import_region, phone, website, rating, followers, reviews FROM artists WHERE ig_handle IS NOT NULL AND ig_handle != '' ORDER BY shop_name ASC LIMIT ${fetchLimit} OFFSET ${offset}`;
      countRes = await sql`SELECT COUNT(*) as cnt FROM (SELECT DISTINCT ig_handle FROM artists WHERE ig_handle IS NOT NULL AND ig_handle != '') sub`;
    }
    const rawRows = dataRes?.rows || (Array.isArray(dataRes) ? dataRes : []);

    // JS 去重
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const r of rawRows) {
      const key = String(r.ig_handle || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }

    const total = Number(countRes?.[0]?.cnt || countRes?.rows?.[0]?.cnt || 0);
    const items = deduped.slice(0, limit);

    // 任务状态
    let taskStatusMap: Record<string, string> = {};
    try {
      const handles = items.map((r: any) => r.ig_handle).filter(Boolean);
      if (handles.length > 0) {
        const tasks = await c.env.DB.prepare(
          `SELECT DISTINCT payload->>'artistHandle' as handle, status FROM automation_tasks
           WHERE payload->>'artistHandle' IN (${handles.map(() => '?').join(',')})
           AND status IN ('pending','leased','done','failed')`
        ).bind(...handles).all();
        for (const t of (tasks.results || []) as any) {
          if (t.handle && !taskStatusMap[t.handle]) taskStatusMap[t.handle] = t.status;
        }
      }
    } catch {}

    return c.json({
      ok: true,
      items: items.map((r: any) => ({ ...r, taskStatus: taskStatusMap[r.ig_handle] || null })),
      total, page, limit, pages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// ===== 从 artists 创建任务（批量查询避免 subrequest 上限） =====
app.post('/api/automation/tasks/create-from-artists', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const { artistIds, taskType = 'ig_browse' } = await c.req.json();
    if (!artistIds?.length) return c.json({ error: 'artistIds required' }, 400);
    const ts = Date.now();
    const dedupWindow = ts - 7 * 24 * 60 * 60 * 1000;

    const sql = neon(connStr);
    // 确保表存在
    await sql`CREATE TABLE IF NOT EXISTS automation_tasks (id TEXT PRIMARY KEY, payload TEXT, status TEXT, run_at BIGINT, lease_until BIGINT, leased_by TEXT, attempts INT DEFAULT 0, max_attempts INT DEFAULT 3, error_reason TEXT, created_at BIGINT, updated_at BIGINT)`.catch(() => {});

    // 批量查询所有 artist（1次）
    const ids = artistIds.filter((i: any) => String(i).trim().length > 0);
    if (!ids.length) return c.json({ ok: false, error: 'no valid ids' }, 400);
    const artistRows = await sql`SELECT id, shop_name, ig_handle, city, state FROM artists WHERE id = ANY(${ids})`;
    const artists = artistRows?.rows || (Array.isArray(artistRows) ? artistRows : []);
    if (!artists.length) return c.json({ ok: false, error: 'no artists found' }, 404);

    // 批量查已有任务（1次）
    const handles = artists.map((a: any) => a.ig_handle || a.shop_name).filter(Boolean);
    const existingRows = handles.length ? await sql`SELECT id FROM automation_tasks WHERE payload->>'artistHandle' = ANY(${handles}) AND updated_at > ${dedupWindow}` : null;
    const existingSet = new Set(((existingRows?.rows || []) as any[]).map((r: any) => r.artistHandle || ''));

    let created = 0, skipped = 0;
    for (const a of artists) {
      const h = a.ig_handle || a.shop_name || '';
      if (existingSet.has(h)) { skipped++; continue; }
      await sql`INSERT INTO automation_tasks (id, status, payload, run_at, created_at, updated_at)
         VALUES (${'task_' + h + '_' + ts}, 'pending', ${JSON.stringify({ artistHandle: h, shopName: a.shop_name, taskType })}, ${ts}, ${ts}, ${ts})`;
      created++;
    }
    return c.json({ ok: true, created, skipped, total: artistIds.length });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// ===== 从 VPS 同步任务数据到 D1 =====
app.post('/api/automation/task-list/sync', async (c) => {
  const auth = c.req.header('Authorization') || '';
  if (auth !== 'Bearer vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401);
  try {
    const { tasks } = await c.req.json();
    if (!Array.isArray(tasks) || !tasks.length) return c.json({ error: 'tasks array required' }, 400);
    // 确保 D1 表存在且有需要的列
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

// ===== 从 artist handle 注入任务到 bot =====
app.post('/api/automation/tasks/inject', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const { artistHandles, taskType = 'ig_browse', botId = '' } = await c.req.json();
    if (!artistHandles?.length) return c.json({ error: 'artistHandles required' }, 400);
    const ts = Date.now();
    const dedupWindow = ts - 7 * 24 * 60 * 60 * 1000;
    const sql = neon(connStr);
    let created = 0, skipped = 0;

    for (const handle of artistHandles) {
      const h = String(handle || '').replace(/^@/, '').trim().toLowerCase();
      if (!h) continue;

      // 查重：7天内是否有此 handle 的任务
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

// ===== Scheduler 批量创建任务（ig-scheduler-lite 调用） =====
app.post('/api/tasks/create', async (c) => {
  // 支持 ?token= 认证（scheduler 用 query param）
  const tokenParam = c.req.query('token');
  if (tokenParam !== 'vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401);
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON_DATABASE_URL not configured' }, 500);
  try {
    const { tasks } = await c.req.json();
    if (!Array.isArray(tasks) || !tasks.length) return c.json({ error: 'tasks array required' }, 400);
    const sql = neon(connStr);
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

// ===== 任务状态列表（从 Neon automation_tasks） =====
app.get('/api/automation/task-list', async (c) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(c.req.query('limit')) || 50));
    const status = String(c.req.query('status') || '').trim();
    const connStr = c.env.NEON_DATABASE_URL;
    if (!connStr) return c.json({ ok: false, error: 'NEON not configured', tasks: [] }, 500);
    const sql = neon(connStr);
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

// ===== 清空重复 pending 任务（手动触发，只清已存在 done 的 handle） =====
app.post('/api/automation/tasks/clear-duplicate-pending', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== 'vps-bot-secret-2024') {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON not configured' }, 500);
  try {
    const sql = neon(connStr);
    const dedupWindow = Date.now() - 7 * 24 * 60 * 60 * 1000;
    // 删除 pending 任务，其 handle 已有 done/leased 任务在 dedup 窗口内
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

export default app

// ===== 清空所有 pending 任务 =====
app.post('/api/automation/tasks/clear-all-pending', async (c) => {
  const tokenParam = c.req.query('token');
  const auth = c.req.header('Authorization');
  const authed = tokenParam === 'vps-bot-secret-2024' || auth === 'Bearer vps-bot-secret-2024';
  if (!authed) return c.json({ error: 'unauthorized' }, 401);
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON not configured' }, 500);
  try {
    const sql = neon(connStr);
    const delPending = (await sql`DELETE FROM automation_tasks WHERE status = 'pending' RETURNING id`).length || 0;
    const delLeased = (await sql`DELETE FROM automation_tasks WHERE status = 'leased' RETURNING id`).length || 0;
    return c.json({ ok: true, deleted: delPending + delLeased, pending: delPending, leased: delLeased });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

// ===== Poll 调试端点 =====
app.get('/api/automation/poll-debug', async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: 'NEON not configured' }, 500);
  try {
    const sql = neon(connStr);
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
              WHERE d.status = 'done' AND d.updated_at > ${dedupWindow}
                AND d.payload->>'artistHandle' = automation_tasks.payload->>'artistHandle'
            ))
        ORDER BY run_at ASC LIMIT ${limit}
      `;
      const pRows = pc?.rows || (Array.isArray(pc) ? pc : []);
      pollCandidates = pRows.map((r: any) => ({ id: r.id, run_at: r.run_at }));
      // Also try the UPDATE (without committing — just test)
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
