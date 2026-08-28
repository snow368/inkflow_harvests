import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { parseOrderNote } from './lib/parse-order-notes'
// SEO 技能图谱数据源（单一真相源 = inkflow_harvests/data/seo-knowledge/learn/seo-playbooks.json）。
// 之前前端走 /harvests/seo/playbooks 代理到 AI Core worker，但该端点未正常返回 JSON
// （回退逻辑把请求 URL 当字符串返回，导致 "Unexpected token 'h', harvests-a..."）。
// 改为由本 worker 直接提供，避免依赖 AI Core 部署状态。
import seoPlaybooks from './seo-playbooks.json'
// Neon ��y?Y?a2��?�� ?a ��1��? HTTP D-�����ꡧ/sql endpoint��?��?����?a WebSocket ?�� Worker ?D2??��?��
// @neondatabase/serverless ��? neon() o����y?������ WebSocket��??�� Cloudflare Worker ?D����o?����?��
// ??��? HTTP neonQuery��?��??��?��?����?

type UserInfo = { uid: string; email?: string }

// Neon HTTP query helper ?a uses Neon SQL-over-HTTP API (new /sql endpoint)
// ===== D1 (SQLite) query helpers =====
// 兼容原 neonQuery(参数化)/neonSql(模板拼串) 调用签名，但内部走 Cloudflare D1。
// 自动转换 Postgres 语法： $N→? ， json_extract(payload, '$.x')→json_extract(payload,'$.x') ， 去掉 ::type
// （Neon 已于 2026-07-21 因 Free tier compute quota 耗尽 402，全面迁 D1）

function pgToSqlite(sql: string): string {
  return sql
    .replace(/payload->>'(\w+)'/g, "json_extract(payload, '$.$1')")
    .replace(/::\w+/g, '')
    .replace(/\$\d+/g, '?');
}

async function d1All(db: D1Database, query: string, params?: any[]): Promise<any[]> {
  const q = pgToSqlite(query);
  const stmt = params && params.length ? db.prepare(q).bind(...params) : db.prepare(q);
  const res: any = await stmt.all();
  return res.results || [];
}

function d1Sql(db: D1Database) {
  return async (strings: TemplateStringsArray, ...values: any[]): Promise<{ rows: any[] }> => {
    let query = strings[0];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (typeof v === 'number') query += v;
      else if (typeof v === 'string') query += `'${v.replace(/'/g, "''")}'`;
      else if (v === null || v === undefined) query += 'NULL';
      else query += `'${String(v).replace(/'/g, "''")}'`;
      query += strings[i + 1];
    }
    query = pgToSqlite(query);
    const res: any = await db.prepare(query).all();
    return { rows: res.results || [] };
  };
}

// Lazy-create the three tables migrated from Neon (first request only).
let _d1TablesReady: Promise<void> | null = null;
async function ensureD1Tables(db: D1Database): Promise<void> {
  if (!_d1TablesReady) {
    _d1TablesReady = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_name TEXT, ig_handle TEXT, city TEXT, state TEXT, import_region TEXT,
        phone TEXT, website TEXT, email TEXT, rating REAL, followers INTEGER,
        reviews INTEGER, following INTEGER, post_count INTEGER, bio TEXT, category TEXT,
        full_name TEXT, address TEXT, profile_pic TEXT, conversion_score REAL, country TEXT
      )`).run().catch(() => {});
      // 幂等补列：stage(接触阶段, bot 回写) / last_updated(最近接触时间) / location / username / social_signals
      // 归属账号：每张抓取数据必须标明属于哪个系统账号(A 纹身 / B 衣服...)，防止多号数据混在一起。
      // 带 DEFAULT 的 ADD COLUMN 会把存量行自动回填为默认号，避免"无主"数据。
      await db.prepare(`ALTER TABLE artists ADD COLUMN owner_account TEXT DEFAULT 'raiha8833'`).run().catch(() => {});
      for (const col of ['stage TEXT', 'last_updated INTEGER', 'location TEXT', 'username TEXT', 'full_name TEXT', 'social_signals TEXT']) {
        await db.prepare(`ALTER TABLE artists ADD COLUMN ${col}`).run().catch(() => {});
      }
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_artists_owner_account ON artists(owner_account)`).run().catch(() => {});
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_artists_ig_handle ON artists(ig_handle)`).run().catch(() => {});
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_artists_shop_name ON artists(shop_name)`).run().catch(() => {});

      await db.prepare(`CREATE TABLE IF NOT EXISTS automation_tasks (
        id TEXT PRIMARY KEY, status TEXT NOT NULL, payload TEXT,
        run_at INTEGER, lease_until INTEGER, leased_by TEXT,
        attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3, error_reason TEXT,
        created_at INTEGER, updated_at INTEGER
      )`).run().catch(() => {});
      for (const col of ['run_at INTEGER', 'lease_until INTEGER', 'leased_by TEXT', 'attempts INTEGER DEFAULT 0', 'max_attempts INTEGER DEFAULT 3', 'error_reason TEXT']) {
        await db.prepare(`ALTER TABLE automation_tasks ADD COLUMN ${col}`).run().catch(() => {});
      }
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON automation_tasks(status)`).run().catch(() => {});
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON automation_tasks(created_at)`).run().catch(() => {});
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_tasks_payload ON automation_tasks(payload)`).run().catch(() => {});

      await db.prepare(`CREATE TABLE IF NOT EXISTS bot_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, bot_id TEXT NOT NULL, artist_handle TEXT,
        mode TEXT NOT NULL, created_at INTEGER NOT NULL, summary_json TEXT, profile_facts_json TEXT
      )`).run().catch(() => {});
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_bot_obs_created_at ON bot_observations(created_at)`).run().catch(() => {});
    })();
  }
  return _d1TablesReady;
}

// ??��Y neon() ?���?��?������? SQL ����??o����y ?a �̡�2?��? HTTP
function neonSql(db: D1Database) {
  return d1Sql(db);
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
  BOT_API_TOKEN?: string
  FIREBASE_PROJECT_ID?: string
  FIREBASE_API_KEY?: string
}

type Variables = {
  user: UserInfo
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
app.use('/*', cors())
// 首次请求时惰性建好三张从 Neon 迁移来的 D1 表（artists / automation_tasks / bot_observations）
app.use('/*', async (c, next) => { await ensureD1Tables(c.env.DB); await next(); });

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
  '/api/shopify/callback',
  '/api/fulfillment/shopify/callback',
  '/api/automation/bot-account',
  '/api/automation/bot-account/delete',
  '/api/automation/behavior-logs',
  '/api/automation/bot-daily-stats',
  '/api/automation/bot-config',
  '/api/bot/register',
  '/api/bot/heartbeat',
  '/api/automation/poll',
  '/api/automation/report',
  '/api/automation/interaction',
  '/api/automation/interaction-timeline',
  '/api/automation/tasks/retry-failed',
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
  '/api/bot/functions',
  '/api/bot/workers',
  '/api/bot/learn/status',
  '/api/bot/commands',
  '/api/bot/commands/report',
  '/api/bot/control/heartbeat',
  '/api/tasks/create',
  '/api/tasks/count',
  '/api/amazon/pending',
  '/api/amazon/report',
  '/api/voice/log',
  '/api/inventory/stock',
  '/api/inventory/stock/reset',
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
  '/api/inventory/gift-reviews',
  '/api/inventory/gift-review',
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
  '/api/marketing/scripts/select',
  // Maps-Scrape 只读地理参考接口：国家/州/城市列表，纯参考数据无写操作，公开以便前端下拉无需登录
  '/api/maps-scrape/countries',
  '/api/maps-scrape/states',
  '/api/maps-scrape/regions',
  '/api/maps-scrape/cities',
  // Maps-Scrape 任务队列读写：VPS 调度器用 bot token 调用 creator/fetcher/status，
  // handler 内部 mapsScrapeActor→checkBotToken 已校验，公开以便绕过全局 Firebase 鉴权
  // （与 /api/artists/bulk-import 同模式）。覆盖 /jobs、/jobs/:id/status、/jobs/:id。
  '/api/maps-scrape/jobs',
  // ShopOutreach 旧抓取 UI 桥接（2026-08-06）：/api/scrape/* 已桥接到 maps_scrape_jobs+artists。
  // 查询类（tasks/status/results/export/deep-scan）公开（同 /api/artists）；写类（python/pause/resume/cancel）
  // handler 内部 mapsScrapeActor 校验 bot token 或登录用户。
  '/api/scrape/python',
  '/api/scrape/tasks',
  '/api/scrape/status',
  '/api/scrape/results',
  '/api/scrape/pause',
  '/api/scrape/resume',
  '/api/scrape/cancel',
  '/api/scrape/export',
  '/api/deep-scan/failed',
  // 用户 bot 动作偏好（点赞/评论/关注次数）：前台保存/读取，ig-scheduler 生成任务时读取
  '/api/automation/bot-prefs',
  '/api/automation/comment-chain-health',
  // 互动漏斗只读聚合：bot token 校验（checkBotToken），供实验/监控测量 like->follow->follow_back->dm
  '/api/automation/funnel',
  // 评论语料库（2026-08-21）：bot 上报用 bot-token（ingest handler 校验）；
  // 前台读/审核接口 handler 内部 requireTab('inkflow-outreach') 门禁，故绕过全局 Firebase 放行。
  '/api/corpus',
  // 评论草稿（2026-08-21）：bot 上报生成评论草稿，前台查看/审核，鉴权同 corpus。
  '/api/drafts'
])

app.use('/api/*', async (c, next) => {
  const path = new URL(c.req.url).pathname
  if ([...PUBLIC_PATHS].some(p => path === p || path.startsWith(p + '/'))) return next()
  if (path === '/api/shopify/status' || path === '/api/shopify/orders/deduct' || path.startsWith('/api/shopify/order/') || path.startsWith('/api/shopify/fix-name/') || path === '/api/shopify/retro-gifts' || path === '/api/shopify/reset-baseline') return next()
  // Manual Shopify backfill uses its own bot-token check (?token=), not Firebase auth
  if (path === '/api/sync/shopify-orders') return next()

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
  // US: 全量 50 州（从 US_STATES 常量读，与 maps-scrape 同一份数据，缺 AL 是旧硬编码 bug 已修）
  if (country === 'US') {
    return c.json({ states: (US_STATES || []).map((s: any) => s.ab) });
  }
  const STATES: Record<string, string[]> = {
    CA: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
  };
  return c.json({ states: STATES[country] || [] });
})

// 一键清零库存（破坏性操作）。仅将 current_stock 置 0，出库/入库流水与历史记录保留以便审计。
// 防误触：必须 body.confirm === 'RESET-ALL-STOCK'；可选 STOCK_RESET_KEY 环境变量做二次防护。
// 重要：清零后必须先重新盘点填数（CSV 导入写入 current_stock），再让 Shopify 订单从指定日起扣减，
// 否则订单会从 0 开始扣成负数（超卖）。配合 SHOPIFY_SYNC_FROM 使用。
app.post('/api/inventory/stock/reset', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as any
    if (body?.confirm !== 'RESET-ALL-STOCK') {
      return c.json({ error: 'confirm_required', hint: "body must include { confirm: 'RESET-ALL-STOCK' }" }, 400)
    }
    const key = c.env.STOCK_RESET_KEY
    if (key && body?.key !== key) {
      return c.json({ error: 'invalid_key' }, 403)
    }
    const res = await c.env.DB.prepare('UPDATE inventory_products SET current_stock = 0, updated_at = ?').bind(Date.now()).run() as any
    const changes = res?.meta?.changes ?? res?.changes ?? 0
    return c.json({ ok: true, updated: changes })
  } catch (e: any) {
    return c.json({ error: String(e?.message || e) }, 500)
  }
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
    status: (r.current_stock || 0) <= 0 ? 'out_of_stock'
      : (r.current_stock || 0) <= (r.reorder_point || 0) ? 'low_stock' : 'healthy'
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
      COALESCE(p.current_stock, 0) as current_stock
    FROM inventory_products p
    LEFT JOIN (SELECT product_sku, SUM(quantity) as total_in FROM inventory_inbounds GROUP BY product_sku) inb ON p.sku = inb.product_sku
    LEFT JOIN (SELECT product_sku, SUM(quantity) as total_out FROM inventory_outbounds GROUP BY product_sku) out ON p.sku = out.product_sku
    WHERE COALESCE(p.current_stock, 0) <= p.reorder_point
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
  // SKU 目录封死：手动录入是唯一的产品创建入口。PEACH- 前缀一并归一，目录永不残留 PEACH-。
  const baseSku = (sku || '').startsWith('PEACH-') ? String(sku).slice(6) : sku
  if (id) {
    await c.env.DB.prepare(`UPDATE inventory_products SET name=?, category=?, vendor=?, unit=?, unit_price=?, reorder_point=?, reorder_qty=?, lead_time_days=?, moq=?, carton_qty=?, source=?, shopify_variant_id=?, updated_at=? WHERE id=?`)
      .bind(name, category||'General', vendor||'', unit||'Box', unit_price||0, reorder_point||50, reorder_qty||1000, lead_time_days||45, moq||500, carton_qty||100, source||'manual', shopify_variant_id||null, now, id).run()
    return c.json({ ok: true, action: 'updated', sku: baseSku })
  }
  try {
    await c.env.DB.prepare(`INSERT INTO inventory_products (sku,name,category,vendor,unit,unit_price,reorder_point,reorder_qty,lead_time_days,moq,carton_qty,source,shopify_variant_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(baseSku, name, category||'General', vendor||'', unit||'Box', unit_price||0, reorder_point||50, reorder_qty||1000, lead_time_days||45, moq||500, carton_qty||100, source||'manual', shopify_variant_id||null, now, now).run()
    return c.json({ ok: true, action: 'created', sku: baseSku })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: `SKU ${baseSku} already exists` }, 409)
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
  sql += ' ORDER BY outbound_date DESC LIMIT 5000'
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

/**
 * 从订单 line_items 中推断系列（CON/COG/AES）
 * 如果所有 line_items 都是同一个系列 → 返回该系列作为默认
 * 如果混合多个系列或无系列 → 返回 null（不确定，需要人工处理）
 */
function inferSeriesFromItems(items: any[]): string | null {
  const series = new Set<string>();
  for (const item of items) {
    let sku = (item.sku || item.variant_sku || '').toUpperCase();
    sku = sku.startsWith('PEACH-') ? sku.slice(6) : sku; // 归一：PEACH- 前缀变体（如 PEACH-CON-1225SEM → CON-1225SEM）
    const m = sku.match(/^(CON|COG|AES)[-_]/);
    if (m) series.add(m[1]);
  }
  if (series.size === 1) return [...series][0];
  return null; // 0 或 2+ 系列 → 无法确定
}

/**
 * Shopify 订单备注 = order.note (单字符串) + order.note_attributes (键值对数组)。
 * 很多店铺把「备注」做成结账页自定义字段，值落在 note_attributes，
 * order.note 反而是空的。这里把两者合并，避免漏抓备注内容。
 * 例：#4737 的备注（"备注" / IG链接 / "1013SEM*2"）就存在 note_attributes 里。
 */
function shopifyNoteText(order: any): string {
  const parts: string[] = [];
  if (order?.note) parts.push(String(order.note));
  const attrs = order?.note_attributes;
  if (Array.isArray(attrs)) {
    for (const a of attrs) {
      if (!a) continue;
      const name = a.name ? String(a.name) : '';
      const value = a.value != null ? String(a.value) : '';
      if (value) parts.push(name ? `${name}: ${value}` : value);
    }
  }
  return parts.join('\n').trim();
}

/**
 * 解析赠品针的库存 SKU。
 * 规则（用户定：客人订单是 CON、备注没写 CON/COG/AES 就直接按订单系列来）：
 *   1. 系列优先级：备注显式系列 > 订单推断系列(defaultSeries via inferSeriesFromItems)
 *   2. 库存 SKU 形态为 SERIES-LABEL（如 CON-1013SEM）。注意：本函数只处理「订单备注里的赠品针」匹配；
 *      Shopify 订单 line_item 的 PEACH- 前缀由同步入口统一归一（剥 PEACH- 前缀映射到基 SKU，见 4412/4679/1037），不在此处处理。
 *   3. 精确匹配 SERIES-LABEL；失败则「仅在同系列内」做尾部模糊兜底
 *   4. 绝不跨系列 LIKE 瞎猜（否则库存里同时有 CON-1013SEM / COG-1013SEM 时会扣错货）；
 *      系列无法确定时只认恰好等于 label 的裸 SKU，仍匹配不到就返回 null（跳过，交人工）
 * @returns 命中的库存 sku，或 null（无法安全确定时）
 */
async function resolveGiftSku(db: any, gift: any, defaultSeries: string | null): Promise<string | null> {
  if (gift.type === 'poster') {
    const p = await db.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind('POSTER').first();
    return (p?.sku as string) || null;
  }
  if (gift.type !== 'needle') return null;
  const series = gift.series || defaultSeries || null;
  if (series) {
    // 已知系列：精确 SERIES-LABEL
    const exact = await db.prepare('SELECT sku FROM inventory_products WHERE sku = ?')
      .bind(`${series}-${gift.label}`).first();
    if (exact?.sku) return exact.sku as string;
    // 同系列内尾部模糊兜底（如库存写法略有差异），限定 SERIES- 前缀，绝不跨系列
    const scoped = await db.prepare('SELECT sku FROM inventory_products WHERE sku LIKE ? AND sku LIKE ?')
      .bind(`${series}-%`, `%${gift.label}`).first();
    return (scoped?.sku as string) || null;
  }
  // 系列无法确定（订单混合/无系列 + 备注也没写）→ 只认恰好等于 label 的裸 SKU，绝不跨系列瞎猜
  const bare = await db.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind(gift.label).first();
  return (bare?.sku as string) || null;
}

// ── 待人工审核的赠品队列 ──────────────────────────────────────────────
// 当备注里的赠品型号解析不出「安全 SKU」（典型：订单没买针 + 只写裸型号 0803RL 分不清 CON/COG/AES）
// 不能瞎猜系列扣错货，也不该静默跳过 —— 记入此表，前端醒目提示转人工审核。
async function ensureGiftReviewTable(db: any) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS inventory_gift_review (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shopify_order_id TEXT,
    order_name TEXT,
    gift_label TEXT,
    gift_type TEXT,
    detected_series TEXT,
    note TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER
  )`).run();
  // 增量列（幂等：列已存在则 ALTER 抛错，忽略即可）
  for (const col of ['resolved_sku TEXT', 'resolved_series TEXT', 'resolution TEXT', 'resolved_at INTEGER']) {
    try { await db.prepare(`ALTER TABLE inventory_gift_review ADD COLUMN ${col}`).run(); } catch {}
  }
}

/**
 * 人工审核确认后，按所选系列把赠品真实扣减出库（写 inventory_outbounds + 扣 current_stock）。
 * 幂等：同一 (shopify_order_id, sku) 已存在出库行则跳过。与 deductGiftsFromNote 的扣减逻辑一致。
 */
async function applyManualGiftDeduction(db: any, review: any, sku: string, series: string) {
  const orderId = review.shopify_order_id || '';
  const qty = 1;
  const existing = await db.prepare('SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? AND product_sku = ? LIMIT 1').bind(orderId, sku).first();
  if (existing) return { already: true };
  const note = `Shopify Order #${review.order_name || ''} | Gift: ${sku} (manual review, series=${series})`;
  await db.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(sku, qty, 'B2C', review.order_name || 'Manual', orderId, new Date().toISOString().slice(0, 10), note, Date.now()).run();
  await db.prepare('UPDATE inventory_products SET current_stock = COALESCE(current_stock,0) - ? WHERE sku = ?').bind(qty, sku).run();
  return { already: false };
}

async function recordGiftReview(db: any, orderId: string, orderName: string, gift: any, defaultSeries: string | null, rawNote: string) {
  try {
    await ensureGiftReviewTable(db);
    // 幂等：同一订单同一型号「存在过记录」就不再重建（含已 resolved 的）。
    // ⚠️ 2026-08-06 修复：之前只查 status='pending'，用户 resolve 后旧记录变 resolved，
    //    下次同步又重建一条新的 pending → 审核项永远显示、反复要求人工处理。
    const existing = await db.prepare('SELECT id FROM inventory_gift_review WHERE shopify_order_id=? AND gift_label=? LIMIT 1')
      .bind(orderId, gift.label).first();
    if (existing) return;
    await db.prepare('INSERT INTO inventory_gift_review (shopify_order_id,order_name,gift_label,gift_type,detected_series,note,status,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind(orderId, orderName, gift.label, gift.type, gift.series || defaultSeries || null, rawNote, 'pending', Date.now()).run();
  } catch (e: any) { console.log('[gift-review] record failed:', e?.message || e); }
}

/**
 * 统一赠品扣减：从订单备注解析「送的型号」并写入出库 + 扣库存。
 * 防重复扣关键：若赠品 SKU 已在本订单 line_items 中（已作为购买项扣过），则跳过。
 * 幂等：同一 (shopify_order_id, sku) 已存在出库行则跳过。
 * 供 manual deduct / cron / runShopifySync / webhook / retro-gifts 共用，避免各路逻辑漂移。
 */
async function deductGiftsFromNote(db: any, order: any, orderId: string, orderName: string): Promise<number> {
  const customerNote = shopifyNoteText(order);
  if (!customerNote) return 0;
  // 收集本订单已购买的 line_item SKU（归一 PEACH- 前缀），用于跳过已购买赠品
  const lineItemSkus = new Set<string>();
  for (const item of (order.line_items || [])) {
    let sku = String(item.sku || item.variant_sku || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    sku = sku.startsWith('PEACH-') ? sku.slice(6) : sku;
    if (sku) lineItemSkus.add(sku);
  }
  const defaultSeries = inferSeriesFromItems(order.line_items || []);
  const parsedGifts = parseOrderNote(customerNote, { defaultSeries: defaultSeries || undefined });
  const custName = ((order.customer?.firstName || '') + ' ' + (order.customer?.lastName || '')).trim() || order.customer?.email || 'Shopify Customer';
  const outboundDate = (order.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
  let deducted = 0;
  for (const gift of parsedGifts) {
    const resolved = await resolveGiftSku(db, gift, defaultSeries);
    if (!resolved) {
      // 解析不出安全 SKU：记入待人工审核队列（醒目提示），不静默跳过、也不瞎猜扣错货
      await recordGiftReview(db, orderId, orderName, gift, defaultSeries, customerNote);
      continue;
    }
    // 解析成功：若此前误记了待审核，自动清掉
    await db.prepare('UPDATE inventory_gift_review SET status=\'resolved\' WHERE shopify_order_id=? AND gift_label=? AND status=\'pending\'')
      .bind(orderId, gift.label).run();
    if (lineItemSkus.has(resolved)) continue; // 已作为购买项扣过 → 跳过，防重复扣
    const giftExisting = await db.prepare('SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? AND product_sku = ? LIMIT 1').bind(orderId, resolved).first();
    if (giftExisting) continue; // 幂等
    const giftNote = `Shopify Order #${orderName} | Gift: ${resolved}`;
    try {
      await db.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(resolved, gift.quantity, 'B2C', custName, orderId, outboundDate, giftNote, Date.now()).run();
      await db.prepare('UPDATE inventory_products SET current_stock = COALESCE(current_stock,0) - ? WHERE sku = ?').bind(gift.quantity, resolved).run();
      deducted++;
    } catch (e: any) { console.log('[gift] insert failed for', resolved, ':', e?.message || e); }
  }
  return deducted;
}

// 待审核赠品队列（前端醒目提示用）
app.get('/api/inventory/gift-reviews', async (c) => {
  await ensureGiftReviewTable(c.env.DB);
  const status = c.req.query('status') || 'pending';
  const rows = await c.env.DB.prepare('SELECT * FROM inventory_gift_review WHERE status=? ORDER BY created_at DESC').bind(status).all();
  return c.json({ reviews: rows.results || [], count: (rows.results || []).length });
});

app.post('/api/inventory/gift-review/:id/resolve', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const series = (body.series || '').toString().trim().toUpperCase() || null;
  const resolution = body.resolution || (series ? 'applied' : 'dismissed');
  const review = await c.env.DB.prepare('SELECT * FROM inventory_gift_review WHERE id=?').bind(id).first() as any;
  if (!review) return c.json({ ok: false, error: '审核项不存在' }, 404);
  if (review.status === 'resolved') return c.json({ ok: true, already: true });

  if (series) {
    // 所选系列下精确/同系列模糊匹配 SKU；型号统一大写后拼（DB 形态如 CON-0803RL）
    const sku = await resolveGiftSku(c.env.DB, { label: review.gift_label.toUpperCase(), type: review.gift_type || 'needle', quantity: 1, series }, series);
    if (!sku) return c.json({ ok: false, error: `系列 ${series} 下找不到 ${review.gift_label.toUpperCase()} 对应的库存 SKU（${series}-${review.gift_label.toUpperCase()}）` }, 422);
    await applyManualGiftDeduction(c.env.DB, review, sku, series);
    await c.env.DB.prepare('UPDATE inventory_gift_review SET status=?, resolved_sku=?, resolved_series=?, resolution=?, resolved_at=? WHERE id=?')
      .bind('resolved', sku, series, 'applied', Date.now(), id).run();
    return c.json({ ok: true, applied: true, sku });
  }

  // 无系列：仅忽略，不扣库存（如赠品已线下发出、或录入错误）
  await c.env.DB.prepare('UPDATE inventory_gift_review SET status=?, resolution=?, resolved_at=? WHERE id=?')
    .bind('resolved', 'dismissed', Date.now(), id).run();
  return c.json({ ok: true, applied: false });
});

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
  let ordersUrl = `https://${storeDomain}/admin/api/${apiVersion}/orders.json?status=any&fulfillment_status=any&updated_at_min=${new Date(Date.now() - 7*86400000).toISOString()}&limit=250`

  while (ordersUrl) {
    const resp = await fetch(ordersUrl, { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } })
    if (!resp.ok) return c.json({ error: `Shopify API ${resp.status}: ${(await resp.text()).slice(0,240)}` }, 502)
    const payload = await resp.json() as any
    let orders = Array.isArray(payload?.orders) ? payload.orders : []

    // Force import a specific order by number (覆盖其他订单)
    if (forceOrder) {
      orders = [];
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
      const customerNote = shopifyNoteText(order)
      const customerName = order.customer ? `${order.customer.first_name||''} ${order.customer.last_name||''}`.trim() : ''
      // 时间门槛：SHOPIFY_SYNC_FROM 之后的订单才扣（非 force 模式），不回溯历史
      const syncFrom = c.env.SHOPIFY_SYNC_FROM;
      if (!forceOrder && syncFrom && order.created_at && new Date(order.created_at) < new Date(syncFrom)) continue;

      const existing = await c.env.DB.prepare('SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? LIMIT 1').bind(orderId).first()
      if (!existing) {
        for (const item of (order.line_items || [])) {
          let sku = String(item.sku || '').trim()
          sku = sku.startsWith('PEACH-') ? sku.slice(6) : sku; // 归一：PEACH- 前缀变体与基 SKU 合并
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
      }

      // Gift deduction from notes (统一防重复扣 + 幂等)
      // 已同步订单(existing)也补抓赠品：备注常滞后于首次抓取，否则赠品会永久漏掉
      const giftCount = await deductGiftsFromNote(c.env.DB, order, orderId, orderName);
      if (giftCount > 0) deductedItems.push({ order: orderName, item: `Gift x${giftCount}` });
      totalOrders++
    }
    // Force mode: only process the single requested order, then stop (don't loop all recent orders)
    if (forceOrder) {
      console.log('[deduct] force mode: processed', totalOrders, 'order, returning');
      return c.json({ ok: true, ordersProcessed: totalOrders, itemsDeducted: deductedItems.length, details: deductedItems });
    }
    const linkHeader = resp.headers.get('link')
    ordersUrl = linkHeader ? parseNextLink(linkHeader) : null
  }
  return c.json({ ok: true, ordersProcessed: totalOrders, itemsDeducted: deductedItems.length, details: deductedItems })
})

// One-time retroactive: parse gifts from notes of ALL existing outbounds that have a 备注
// but no Gift row yet. Reuses parseOrderNote + resolveGiftSku. Idempotent (skips existing Gift rows).
app.post('/api/shopify/retro-gifts', async (c) => {
  const token = c.req.query('token');
  if (token !== 'vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401);
  try {
    // 1) group outbounds by order id, collect note + infer series from existing line-item SKUs
    const rows = await c.env.DB.prepare(
      "SELECT shopify_order_id, note, product_sku FROM inventory_outbounds WHERE note LIKE '%备注%' OR note LIKE '%Gift%' OR note LIKE '%送%'"
    ).all() as any;
    const byOrder: Record<string, { note: string; series: Set<string>; skus: Set<string>; hasGift: boolean }> = {};
    for (const r of (rows.results || [])) {
      const oid = r.shopify_order_id;
      if (!byOrder[oid]) byOrder[oid] = { note: '', series: new Set(), skus: new Set(), hasGift: false };
      if (r.note) {
        if (/备注|送/.test(r.note)) byOrder[oid].note = r.note;
        if (/Gift:/.test(r.note)) byOrder[oid].hasGift = true;
      }
      const sku = r.product_sku || '';
      if (sku) byOrder[oid].skus.add(sku);
      const m = sku.match(/^([A-Z]+)-/);
      if (m) byOrder[oid].series.add(m[1]);
    }
    let processed = 0, added = 0;
    for (const [oid, info] of Object.entries(byOrder)) {
      if (info.hasGift) continue; // already has gift rows
      const noteText = info.note.replace(/^.*?备注:\s*/s, '').trim();
      if (!noteText) continue;
      // default series = the most common series among this order's line items
      const defaultSeries = [...info.series][0] || null;
      const parsed = parseOrderNote(noteText, { defaultSeries: defaultSeries || undefined });
      let custName = '';
      try {
        const o = await c.env.DB.prepare('SELECT customer_name FROM inventory_outbounds WHERE shopify_order_id = ? LIMIT 1').bind(oid).first() as any;
        custName = o?.customer_name || 'Shopify Customer';
      } catch {}
      const orderNameMatch = info.note.match(/#(\d+)/);
      const orderName = orderNameMatch ? orderNameMatch[1] : oid;
      for (const gift of parsed) {
        const resolved = await resolveGiftSku(c.env.DB, gift, defaultSeries);
        if (!resolved) continue;
        if (info.skus.has(resolved)) continue; // 已作为购买项扣过 → 跳过，防重复扣
        const giftExisting = await c.env.DB.prepare('SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? AND product_sku = ? AND note LIKE ?')
          .bind(oid, resolved, '%Gift%').first();
        if (giftExisting) continue;
        const outboundDate = (info.note.match(/(\d{4}-\d{2}-\d{2})/) || ['', new Date().toISOString().slice(0,10)])[1];
        try {
          await c.env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
            .bind(resolved, gift.quantity, 'B2C', custName, oid, outboundDate, `Shopify Order #${orderName} | Gift: ${resolved}`, Date.now()).run();
          await c.env.DB.prepare('UPDATE inventory_products SET current_stock = COALESCE(current_stock,0) - ? WHERE sku = ?').bind(gift.quantity, resolved).run();
          added++;
        } catch (e: any) { console.log('[retro-gifts] insert failed for', resolved, ':', e?.message || e); }
      }
      processed++;
    }
    return c.json({ ok: true, ordersScanned: Object.keys(byOrder).length, ordersProcessed: processed, giftsAdded: added });
  } catch (e: any) {
    return c.json({ ok: false, error: e?.message || String(e) }, 200);
  }
});

// One-time: 将库存基线重置到「今天」。撤销所有历史出库扣减并清空出库流水，
// 仅保留 SHOPIFY_SYNC_FROM 之后的订单在后续同步中重新扣减。token 校验（与 bot 端点一致）。
// ⚠️ 破坏性：执行前务必已备份 inventory_outbounds / inventory_products。
app.post('/api/shopify/reset-baseline', async (c) => {
  const token = c.req.query('token');
  if (token !== 'vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401);
  try {
    const rows = await c.env.DB.prepare('SELECT product_sku, quantity FROM inventory_outbounds').all() as any;
    let reversed = 0;
    for (const r of (rows.results || [])) {
      await c.env.DB.prepare('UPDATE inventory_products SET current_stock = COALESCE(current_stock,0) + ? WHERE sku = ?').bind(r.quantity, r.product_sku).run();
      reversed++;
    }
    const del = await c.env.DB.prepare('DELETE FROM inventory_outbounds').run();
    return c.json({ ok: true, rowsReversed: reversed, rowsDeleted: del.meta?.changes ?? 0 });
  } catch (e: any) {
    return c.json({ ok: false, error: e?.message || String(e) }, 200);
  }
});

app.get('/api/shopify/order/:orderNumber', async (c) => {
  const orderNumber = c.req.param('orderNumber');
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any;
  if (!config) return c.json({ error: 'Shopify not configured' }, 400);
  const accessToken = config.api_key;
  let storeDomain = 'dptattoo.myshopify.com';
  if (config.api_base_url) {
    try { storeDomain = new URL(config.api_base_url).hostname; }
    catch { storeDomain = String(config.api_base_url).replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }
  }
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
  let storeDomain = 'dptattoo.myshopify.com';
  if (config.api_base_url) {
    try { storeDomain = new URL(config.api_base_url).hostname; }
    catch { storeDomain = String(config.api_base_url).replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }
  }
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
    // 归一：PEACH- 前缀变体一律映射到基 SKU（与订单同步入口一致），避免 PEACH- 孤儿出库
    if (sku.startsWith('PEACH-')) {
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
    // SKU 目录封死：只记录已存在于目录的 SKU，未知 SKU 跳过（不建产品、不产生孤儿出库）
    const prod = await c.env.DB.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind(sku).first();
    if (!prod) { failed++; continue; }
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
  const mode = c.req.query('mode') || 'incremental'
  // incremental: 最近30天 updated_at; full: 从 2020 年起 created_at
  const since = mode === 'full'
    ? new Date('2020-01-01').toISOString()
    : new Date(Date.now() - 30 * 86400000).toISOString()
  let ordersUrl = baseUrl + `/orders.json?limit=250&${mode === 'full' ? 'created_at_min' : 'updated_at_min'}=${since}`
  let synced = 0, updated = 0

  while (ordersUrl) {
    const r = await fetch(ordersUrl, {
      headers: { 'X-Shopify-Access-Token': token }
    })
    if (!r.ok) return c.json({ error: `Shopify ${r.status}: ${(await r.text()).slice(0,240)}` }, 502)
    const data = await r.json() as any
    const orders = data.orders || []
    if (orders.length === 0) break

    for (const o of orders) {
      const addr = o.shipping_address || o.customer?.default_address || {}
      const now = Date.now()
      const customerNote = shopifyNoteText(o)

      // UPSERT into orders table
      const r2 = await c.env.DB.prepare(`
        INSERT INTO orders (order_number,source,status,customer_name,customer_email,country,state,city,zip_code,address,phone,currency,notes,created_at,updated_at)
        VALUES (?,'shopify','pending',?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(order_number) DO UPDATE SET
          notes=excluded.notes, updated_at=excluded.updated_at, status='pending',
          customer_name=excluded.customer_name, customer_email=excluded.customer_email,
          country=excluded.country, state=excluded.state, city=excluded.city,
          zip_code=excluded.zip_code, address=excluded.address, phone=excluded.phone
      `)
        .bind(String(o.order_number), o.shipping_address?.name||o.customer?.name||'', o.email||'',
          addr.country_code||addr.country||'', addr.province||'', addr.city||'', addr.zip||'',
          addr.address1||'', addr.phone||'', o.currency||'USD', shopifyNoteText(o),
          new Date(o.created_at).getTime()||now, now).run()

      if (r2.meta.changes > 0) synced++
      else updated++

      // Always refresh order_items (delete old + re-insert)
      const orderRow = await c.env.DB.prepare('SELECT id FROM orders WHERE order_number = ?').bind(String(o.order_number)).first() as any
      if (orderRow) {
        const orderId = orderRow.id
        await c.env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(orderId).run()

        // Shopify line items
        for (const item of (o.line_items || [])) {
          await c.env.DB.prepare('INSERT INTO order_items (order_id,sku,product_name,quantity,unit_price) VALUES (?,?,?,?,?)')
            .bind(orderId, item.sku||'', item.name||'', item.quantity||1, Number(item.price)||0).run()
        }

        // Parsed gifts from note
        if (customerNote) {
          const defaultSeries = inferSeriesFromItems(o.line_items || []);
          const parsedGifts = parseOrderNote(customerNote, { defaultSeries: defaultSeries || undefined });
          for (const gift of parsedGifts) {
          const resolved = await resolveGiftSku(c.env.DB, gift, defaultSeries);
          if (!resolved) continue;
          await c.env.DB.prepare('INSERT INTO order_items (order_id,sku,product_name,quantity,unit_price) VALUES (?,?,?,?,?)')
            .bind(orderId, resolved, `Gift: ${resolved}`, gift.quantity, 0).run()
          }
        }
      }
    }

    // Cursor-based pagination via Link header
    const linkHeader = r.headers.get('link') || ''
    const relNext = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
    ordersUrl = relNext ? relNext[1] : null
  }
  return c.json({ ok: true, synced, updated, message: `Synced ${synced} new + ${updated} updated orders` })
})

// ============ Shopify OAuth Callback ============

app.get('/api/fulfillment/shopify/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.text('Missing code', 400);
  try {
    // 获取 Shopify 配置中的 client_id 和 client_secret
    const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any;
    if (!config) return c.text('Shopify not configured', 400);
    let storeDomain = 'dptattoo.myshopify.com';
  if (config.api_base_url) {
    try { storeDomain = new URL(config.api_base_url).hostname; }
    catch { storeDomain = String(config.api_base_url).replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }
  }
    let clientId = '7b5a3625ac60ba058a54ca02d675e47a';
    let clientSecret = '';
    if (config.extra_config) {
      try {
        const ec = JSON.parse(config.extra_config);
        if (ec.client_id) clientId = ec.client_id;
      } catch {}
    }
    if (config.api_secret) clientSecret = config.api_secret;

    const r = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });
    const data = await r.json() as any;
    const accessToken = data.access_token;
    if (!accessToken) return c.text('Failed to get token: ' + JSON.stringify(data), 400);

    // 保存到 carrier_configs
    const now = Date.now();
    await c.env.DB.prepare(`
      INSERT INTO carrier_configs (carrier, label, api_base_url, api_key, api_secret, extra_config, enabled, created_at)
      VALUES ('shopify', 'Shopify', ?, ?, ?, ?, 1, ?)
      ON CONFLICT(carrier) DO UPDATE SET
        api_key = excluded.api_key, api_secret = excluded.api_secret, extra_config = excluded.extra_config
    `).bind(
      `https://${storeDomain}/admin/api/2024-10`,
      accessToken,
      clientSecret,
      JSON.stringify({ scopes: data.scope || '', client_id: clientId }),
      now
    ).run();

    return c.text('✅ Shopify 授权成功！可以关闭此页面。');
  } catch (e: any) {
    return c.text('Error: ' + e.message, 500);
  }
})

// ============ Shopify OAuth Callback (正确路径) ============

app.get('/api/shopify/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) return c.text('Missing code', 400);
  try {
    const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any;
    if (!config) return c.text('Shopify not configured', 400);
    let storeDomain = 'dptattoo.myshopify.com';
  if (config.api_base_url) {
    try { storeDomain = new URL(config.api_base_url).hostname; }
    catch { storeDomain = String(config.api_base_url).replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }
  }
    let clientId = '7b5a3625ac60ba058a54ca02d675e47a';
    let clientSecret = '';
    if (config.extra_config) {
      try {
        const ec = JSON.parse(config.extra_config);
        if (ec.client_id) clientId = ec.client_id;
      } catch {}
    }
    if (config.api_secret) clientSecret = config.api_secret;

    const r = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });
    const data = await r.json() as any;
    const accessToken = data.access_token;
    if (!accessToken) return c.text('Failed to get token: ' + JSON.stringify(data), 400);

    const now = Date.now();
    await c.env.DB.prepare(`
      INSERT INTO carrier_configs (carrier, label, api_base_url, api_key, api_secret, extra_config, enabled, created_at)
      VALUES ('shopify', 'Shopify', ?, ?, ?, ?, 1, ?)
      ON CONFLICT(carrier) DO UPDATE SET
        api_key = excluded.api_key, api_secret = excluded.api_secret, extra_config = excluded.extra_config
    `).bind(
      `https://${storeDomain}/admin/api/2024-10`,
      accessToken,
      clientSecret,
      JSON.stringify({ scopes: data.scope || '', client_id: clientId }),
      now
    ).run();

    return c.text('✅ Shopify 授权成功！可以关闭此页面。');
  } catch (e: any) {
    return c.text('Error: ' + e.message, 500);
  }
})

// ============ Shopify Webhook ============

// 校验 Shopify webhook 签名（X-Shopify-Hmac-SHA256）。
// 需在 wrangler 配置 SHOPIFY_WEBHOOK_SECRET（Shopify 后台 Webhook 签名密钥）。
// 未配置时仅告警不拒绝（过渡期，避免断单）；生产环境必须配置，否则任何人可伪造扣减请求。
async function verifyShopifyWebhook(c: any, rawBody: string): Promise<boolean> {
  const secret = c.env?.SHOPIFY_WEBHOOK_SECRET as string | undefined
  const hmac = c.req.header('X-Shopify-Hmac-SHA256')
  if (!secret) { console.warn('[webhook] SHOPIFY_WEBHOOK_SECRET 未配置，跳过 HMAC 校验（请尽快配置）'); return true }
  if (!hmac) return false
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
    const computed = btoa(String.fromCharCode(...new Uint8Array(sig)))
    return computed === hmac
  } catch (e: any) { console.error('[webhook] HMAC 校验异常', e?.message || e); return false }
}

app.post('/api/shopify/webhook/orders-create', async (c) => {
  const rawBody = await c.req.text()
  if (!verifyShopifyWebhook(c, rawBody)) return c.json({ error: 'Invalid signature' }, 401)
  let order: any
  try { order = JSON.parse(rawBody) } catch { return c.json({ error: 'Invalid payload' }, 400) }
  if (!order?.id) return c.json({ error: 'Invalid payload' }, 400)

  const orderId = String(order.id)
  const orderName = String(order.order_number || '')
  const existing = await c.env.DB.prepare('SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? LIMIT 1').bind(orderId).first()
  if (existing) return c.json({ ok: true, skipped: true, reason: 'already processed' })

  // 仅当订单已发货/已履约才扣减（用户决策：Shopify 显示已发货再减库存）
  const fulfillmentStatus = String(order.fulfillment_status || '').toLowerCase()
  if (fulfillmentStatus !== 'fulfilled' && fulfillmentStatus !== 'shipped') {
    return c.json({ ok: true, skipped: true, reason: `not fulfilled (${fulfillmentStatus})` })
  }

  // 时间门槛：仅处理 SHOPIFY_SYNC_FROM 之后的订单（用户决策：从指定日起才扣库存，不回溯历史）
  const syncFrom = c.env.SHOPIFY_SYNC_FROM
  if (syncFrom && order.created_at && new Date(order.created_at) < new Date(syncFrom)) {
    return c.json({ ok: true, skipped: true, reason: `before SHOPIFY_SYNC_FROM (${syncFrom})` })
  }

  const customerName = order.customer ? `${order.customer.first_name||''} ${order.customer.last_name||''}`.trim() : ''
  const customerNote = shopifyNoteText(order)
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
    try {
      await c.env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(sku, qty, 'B2C', customerName||'Shopify Customer', orderId, outboundDate, noteParts.join(' | '), now).run()
      // 写穿扣减：直接减 current_stock；允许为负（负值=超卖，页面预警）
      await c.env.DB.prepare('UPDATE inventory_products SET current_stock = COALESCE(current_stock,0) - ? WHERE sku = ?').bind(qty, sku).run()
      deductedCount++
    } catch (e: any) { console.error('[webhook] deduct failed for', sku, e?.message || e) }
  }

  // Gift deduction (统一防重复扣 + 幂等)
  deductedCount += await deductGiftsFromNote(c.env.DB, order, orderId, orderName);

  // Also write to orders table for fulfillment
  try {
    const addr = order.shipping_address || order.customer?.default_address || {}
    await c.env.DB.prepare(`INSERT OR IGNORE INTO orders (order_number,source,status,customer_name,customer_email,country,state,city,zip_code,address,phone,currency,notes,created_at,updated_at) VALUES (?,'shopify','pending',?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(orderName, customerName||'Shopify Customer', order.email||'', addr.country_code||addr.country||'', addr.province||'', addr.city||'', addr.zip||'', addr.address1||'', addr.phone||'', order.currency||'USD', shopifyNoteText(order), new Date(order.created_at).getTime()||now, now).run()
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





// ============ MAPS SCRAPE COVERAGE ============
// Tracks the Google-Maps tattoo-shop scraper runs by (country, state) so the
// frontend can show what's been scraped, what hasn't, and queue new regions.
// The scraper (harvests-engine/scripts/python_scraper.py) self-registers a job
// and reports progress; the operator can also pre-create jobs from the UI.

const US_STATES: { ab: string; name: string }[] = [
  { ab: 'AL', name: 'Alabama' }, { ab: 'AK', name: 'Alaska' }, { ab: 'AZ', name: 'Arizona' },
  { ab: 'AR', name: 'Arkansas' }, { ab: 'CA', name: 'California' }, { ab: 'CO', name: 'Colorado' },
  { ab: 'CT', name: 'Connecticut' }, { ab: 'DE', name: 'Delaware' }, { ab: 'FL', name: 'Florida' },
  { ab: 'GA', name: 'Georgia' }, { ab: 'HI', name: 'Hawaii' }, { ab: 'ID', name: 'Idaho' },
  { ab: 'IL', name: 'Illinois' }, { ab: 'IN', name: 'Indiana' }, { ab: 'IA', name: 'Iowa' },
  { ab: 'KS', name: 'Kansas' }, { ab: 'KY', name: 'Kentucky' }, { ab: 'LA', name: 'Louisiana' },
  { ab: 'ME', name: 'Maine' }, { ab: 'MD', name: 'Maryland' }, { ab: 'MA', name: 'Massachusetts' },
  { ab: 'MI', name: 'Michigan' }, { ab: 'MN', name: 'Minnesota' }, { ab: 'MS', name: 'Mississippi' },
  { ab: 'MO', name: 'Missouri' }, { ab: 'MT', name: 'Montana' }, { ab: 'NE', name: 'Nebraska' },
  { ab: 'NV', name: 'Nevada' }, { ab: 'NH', name: 'New Hampshire' }, { ab: 'NJ', name: 'New Jersey' },
  { ab: 'NM', name: 'New Mexico' }, { ab: 'NY', name: 'New York' }, { ab: 'NC', name: 'North Carolina' },
  { ab: 'ND', name: 'North Dakota' }, { ab: 'OH', name: 'Ohio' }, { ab: 'OK', name: 'Oklahoma' },
  { ab: 'OR', name: 'Oregon' }, { ab: 'PA', name: 'Pennsylvania' }, { ab: 'RI', name: 'Rhode Island' },
  { ab: 'SC', name: 'South Carolina' }, { ab: 'SD', name: 'South Dakota' }, { ab: 'TN', name: 'Tennessee' },
  { ab: 'TX', name: 'Texas' }, { ab: 'UT', name: 'Utah' }, { ab: 'VT', name: 'Vermont' },
  { ab: 'VA', name: 'Virginia' }, { ab: 'WA', name: 'Washington' }, { ab: 'WV', name: 'West Virginia' },
  { ab: 'WI', name: 'Wisconsin' }, { ab: 'WY', name: 'Wyoming' }, { ab: 'DC', name: 'District of Columbia' },
];

const COUNTRY_ALIAS: Record<string, string> = {
  USA: 'US', 'UNITED STATES': 'US', 'UNITED STATES OF AMERICA': 'US', UK: 'GB',
};
function normalizeCountry(c: string): string {
  const u = (c || 'US').toUpperCase().trim();
  return COUNTRY_ALIAS[u] || u;
}

// Countries selectable in the Maps-Scrape UI.
// `api` is the country name expected by the geo provider (countriesnow.space).
const SCRAPE_COUNTRIES: { code: string; name: string; flag: string; api: string }[] = [
  { code: 'US', name: '美国', flag: '🇺🇸', api: 'United States' },
  { code: 'CA', name: '加拿大', flag: '🇨🇦', api: 'Canada' },
  { code: 'GB', name: '英国', flag: '🇬🇧', api: 'United Kingdom' },
  { code: 'IE', name: '爱尔兰', flag: '🇮🇪', api: 'Ireland' },
  { code: 'AU', name: '澳大利亚', flag: '🇦🇺', api: 'Australia' },
  { code: 'NZ', name: '新西兰', flag: '🇳🇿', api: 'New Zealand' },
  { code: 'DE', name: '德国', flag: '🇩🇪', api: 'Germany' },
  { code: 'FR', name: '法国', flag: '🇫🇷', api: 'France' },
  { code: 'IT', name: '意大利', flag: '🇮🇹', api: 'Italy' },
  { code: 'ES', name: '西班牙', flag: '🇪🇸', api: 'Spain' },
  { code: 'PT', name: '葡萄牙', flag: '🇵🇹', api: 'Portugal' },
  { code: 'NL', name: '荷兰', flag: '🇳🇱', api: 'Netherlands' },
  { code: 'BE', name: '比利时', flag: '🇧🇪', api: 'Belgium' },
  { code: 'CH', name: '瑞士', flag: '🇨🇭', api: 'Switzerland' },
  { code: 'AT', name: '奥地利', flag: '🇦🇹', api: 'Austria' },
  { code: 'SE', name: '瑞典', flag: '🇸🇪', api: 'Sweden' },
  { code: 'NO', name: '挪威', flag: '🇳🇴', api: 'Norway' },
  { code: 'DK', name: '丹麦', flag: '🇩🇰', api: 'Denmark' },
  { code: 'FI', name: '芬兰', flag: '🇫🇮', api: 'Finland' },
  { code: 'PL', name: '波兰', flag: '🇵🇱', api: 'Poland' },
  { code: 'CZ', name: '捷克', flag: '🇨🇿', api: 'Czech Republic' },
  { code: 'HU', name: '匈牙利', flag: '🇭🇺', api: 'Hungary' },
  { code: 'RO', name: '罗马尼亚', flag: '🇷🇴', api: 'Romania' },
  { code: 'GR', name: '希腊', flag: '🇬🇷', api: 'Greece' },
  { code: 'TR', name: '土耳其', flag: '🇹🇷', api: 'Turkey' },
  { code: 'JP', name: '日本', flag: '🇯🇵', api: 'Japan' },
  { code: 'KR', name: '韩国', flag: '🇰🇷', api: 'South Korea' },
  { code: 'CN', name: '中国', flag: '🇨🇳', api: 'China' },
  { code: 'SG', name: '新加坡', flag: '🇸🇬', api: 'Singapore' },
  { code: 'MY', name: '马来西亚', flag: '🇲🇾', api: 'Malaysia' },
  { code: 'TH', name: '泰国', flag: '🇹🇭', api: 'Thailand' },
  { code: 'PH', name: '菲律宾', flag: '🇵🇭', api: 'Philippines' },
  { code: 'ID', name: '印度尼西亚', flag: '🇮🇩', api: 'Indonesia' },
  { code: 'VN', name: '越南', flag: '🇻🇳', api: 'Vietnam' },
  { code: 'IN', name: '印度', flag: '🇮🇳', api: 'India' },
  { code: 'AE', name: '阿联酋', flag: '🇦🇪', api: 'United Arab Emirates' },
  { code: 'ZA', name: '南非', flag: '🇿🇦', api: 'South Africa' },
  { code: 'BR', name: '巴西', flag: '🇧🇷', api: 'Brazil' },
  { code: 'MX', name: '墨西哥', flag: '🇲🇽', api: 'Mexico' },
  { code: 'AR', name: '阿根廷', flag: '🇦🇷', api: 'Argentina' },
  { code: 'CL', name: '智利', flag: '🇨🇱', api: 'Chile' },
  { code: 'CO', name: '哥伦比亚', flag: '🇨🇴', api: 'Colombia' },
  { code: 'PE', name: '秘鲁', flag: '🇵🇪', api: 'Peru' },
];

function countryApiName(code: string): string {
  const hit = SCRAPE_COUNTRIES.find(c => c.code === code);
  return hit ? hit.api : code;
}

// ---- Geo cache (regions / cities resolved from the external provider) ----
const GEO_API_BASE = 'https://countriesnow.space/api/v0.1';
const GEO_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

async function ensureGeoCacheTable(db: any) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS maps_geo_cache (
      k TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER
    )`).run();
  } catch {}
}

async function geoCacheGet(db: any, k: string): Promise<any | null> {
  try {
    const row = await db.prepare('SELECT data, updated_at FROM maps_geo_cache WHERE k = ?').bind(k).first() as any;
    if (!row) return null;
    if (Date.now() - (row.updated_at || 0) > GEO_TTL_MS) return null;
    return JSON.parse(row.data);
  } catch { return null; }
}

async function geoCachePut(db: any, k: string, data: any): Promise<void> {
  try {
    await db.prepare(
      'INSERT INTO maps_geo_cache (k, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
    ).bind(k, JSON.stringify(data), Date.now()).run();
  } catch {}
}

// Strip county/parish style entries — the scraper searches "<keyword> <city>, <state>",
// so administrative areas would just duplicate results.
function cleanCityList(list: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list || []) {
    const s = String(raw || '').trim();
    if (!s || s.length > 60) continue;
    if (/\b(County|Parish|Census Area|Metropolitan Area)\b/i.test(s)) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

async function getRegions(db: any, country: string): Promise<{ ab: string; name: string }[]> {
  if (country === 'US') return US_STATES;
  await ensureGeoCacheTable(db);
  const key = `regions:${country}`;
  const cached = await geoCacheGet(db, key);
  if (cached && Array.isArray(cached) && cached.length) return cached;
  try {
    const resp = await fetch(`${GEO_API_BASE}/countries/states/q?country=${encodeURIComponent(countryApiName(country))}`, {
      headers: { accept: 'application/json' },
    });
    if (!resp.ok) return cached || [];
    const j = await resp.json() as any;
    const regions = (j?.data?.states || [])
      .map((s: any) => ({ ab: String(s.state_code || s.name || '').trim(), name: String(s.name || '').trim() }))
      .filter((r: any) => r.name);
    if (regions.length) await geoCachePut(db, key, regions);
    return regions;
  } catch {
    return cached || [];
  }
}

async function getCities(db: any, country: string, stateName: string): Promise<string[]> {
  await ensureGeoCacheTable(db);
  const key = `cities:${country}:${stateName.toLowerCase()}`;
  const cached = await geoCacheGet(db, key);
  if (cached && Array.isArray(cached) && cached.length) return cached;
  try {
    const url = `${GEO_API_BASE}/countries/state/cities/q?country=${encodeURIComponent(countryApiName(country))}&state=${encodeURIComponent(stateName)}`;
    const resp = await fetch(url, { headers: { accept: 'application/json' } });
    if (!resp.ok) return cached || [];
    const j = await resp.json() as any;
    const cities = cleanCityList(j?.data || []);
    if (cities.length) await geoCachePut(db, key, cities);
    return cities;
  } catch {
    return cached || [];
  }
}

async function ensureMapsScrapeTable(db: any) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS maps_scrape_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country TEXT NOT NULL,
      state TEXT NOT NULL,
      cities TEXT,
      status TEXT DEFAULT 'pending',
      cities_total INTEGER DEFAULT 0,
      cities_done INTEGER DEFAULT 0,
      artists_found INTEGER DEFAULT 0,
      error_text TEXT,
      created_by TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      UNIQUE(country, state)
    )`).run();
  } catch {}
}

// Allow either a logged-in user (UI) or the VPS bot token (scraper self-register).
function mapsScrapeActor(c: any): { ok: boolean; uid: string } {
  if (checkBotToken(c)) return { ok: true, uid: 'bot' };
  const u = c.get('user');
  if (u && (u.uid || u.user_id)) return { ok: true, uid: u.uid || u.user_id };
  return { ok: false, uid: '' };
}

app.get('/api/maps-scrape/countries', async (c) => {
  return c.json({ ok: true, countries: SCRAPE_COUNTRIES.map(x => ({ code: x.code, name: x.name, flag: x.flag })) });
});

app.get('/api/maps-scrape/states', async (c) => {
  const country = normalizeCountry(c.req.query('country') || 'US');
  const states = await getRegions(c.env.DB, country);
  return c.json({ ok: true, country, states });
});

// Regions (states / provinces / prefectures) of a country.
app.get('/api/maps-scrape/regions', async (c) => {
  const country = normalizeCountry(c.req.query('country') || 'US');
  const regions = await getRegions(c.env.DB, country);
  return c.json({ ok: true, country, regions });
});

// All cities of a region — powers the city picker in the UI and the VPS scheduler.
app.get('/api/maps-scrape/cities', async (c) => {
  const country = normalizeCountry(c.req.query('country') || 'US');
  const state = String(c.req.query('state') || '').trim();
  if (!state) return c.json({ error: 'state required' }, 400);
  let stateName = String(c.req.query('name') || '').trim();
  if (!stateName) {
    const regions = await getRegions(c.env.DB, country);
    const hit = regions.find(r => r.ab.toUpperCase() === state.toUpperCase())
      || regions.find(r => r.name.toLowerCase() === state.toLowerCase());
    stateName = hit ? hit.name : state;
  }
  const cities = await getCities(c.env.DB, country, stateName);
  return c.json({ ok: true, country, state, stateName, count: cities.length, cities });
});

app.get('/api/maps-scrape/coverage', async (c) => {
  const actor = mapsScrapeActor(c);
  if (!actor.ok) return c.json({ error: 'unauthorized' }, 401);
  const country = normalizeCountry(c.req.query('country') || 'US');
  await ensureMapsScrapeTable(c.env.DB);
  const rows = await c.env.DB.prepare(
    'SELECT * FROM maps_scrape_jobs WHERE country = ? ORDER BY updated_at DESC'
  ).bind(country).all();
  const jobs = (rows.results || []) as any[];
  const jobByState: Record<string, any> = {};
  for (const j of jobs) jobByState[j.state] = j;

  let states: any[] = [];
  let notRun: string[] = [];
  const regions = await getRegions(c.env.DB, country);
  if (regions.length) {
    states = regions.map(s => ({
      ab: s.ab,
      name: s.name,
      job: jobByState[s.ab] || jobByState[(s.ab || '').toUpperCase()] || jobByState[s.name.toUpperCase()] || null,
    }));
    notRun = states.filter(s => !s.job).map(s => s.ab);
  } else {
    states = jobs.map(j => ({ ab: j.state, name: j.state, job: j }));
  }

  const summary = {
    total: states.length,
    ran: jobs.filter(j => j.status === 'completed').length,
    running: jobs.filter(j => j.status === 'running').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    pending: jobs.filter(j => j.status === 'pending').length,
    notRun: notRun.length,
    artistsFound: jobs.reduce((a, j) => a + (j.artists_found || 0), 0),
  };
  return c.json({ ok: true, country, states, notRun, summary });
});

app.get('/api/maps-scrape/jobs', async (c) => {
  const actor = mapsScrapeActor(c);
  if (!actor.ok) return c.json({ error: 'unauthorized' }, 401);
  await ensureMapsScrapeTable(c.env.DB);
  const rows = await c.env.DB.prepare(
    'SELECT * FROM maps_scrape_jobs ORDER BY updated_at DESC'
  ).all();
  return c.json({ ok: true, items: rows.results || [] });
});

app.post('/api/maps-scrape/jobs', async (c) => {
  const actor = mapsScrapeActor(c);
  if (!actor.ok) return c.json({ error: 'unauthorized' }, 401);
  await ensureMapsScrapeTable(c.env.DB);
  const body = await c.req.json().catch(() => ({}));
  const country = normalizeCountry(body.country || 'US');
  const state = String(body.state || '').trim().toUpperCase();
  if (!state) return c.json({ error: 'state required' }, 400);
  const now = Date.now();
  let citiesArr: string[] = [];
  if (Array.isArray(body.cities)) citiesArr = body.cities.map((x: any) => String(x).trim()).filter(Boolean);
  else if (body.cities) citiesArr = String(body.cities).split(',').map((x: string) => x.trim()).filter(Boolean);
  const existing = await c.env.DB.prepare('SELECT * FROM maps_scrape_jobs WHERE country = ? AND state = ?')
    .bind(country, state).first() as any;
  // Re-queueing an existing state is a resume by default. A destructive reset
  // must be explicit so UI retries cannot silently erase city progress/counts.
  if (existing && body.reset !== true) {
    await c.env.DB.prepare(`UPDATE maps_scrape_jobs SET status='pending', error_text=NULL, updated_at=? WHERE id=?`)
      .bind(now, existing.id).run();
    const resumed = await c.env.DB.prepare('SELECT * FROM maps_scrape_jobs WHERE id=?').bind(existing.id).first();
    return c.json({ ok: true, job: resumed, resumed: true });
  }
  await c.env.DB.prepare(`
    INSERT INTO maps_scrape_jobs (country, state, cities, status, cities_total, cities_done, artists_found, error_text, created_by, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, 0, 0, NULL, ?, ?, ?)
    ON CONFLICT(country, state) DO UPDATE SET
      cities = excluded.cities,
      status = 'pending',
      cities_total = excluded.cities_total,
      cities_done = 0,
      artists_found = 0,
      error_text = NULL,
      created_by = excluded.created_by,
      updated_at = excluded.updated_at
  `).bind(country, state, JSON.stringify(citiesArr), citiesArr.length, actor.uid, now, now).run();
  const row = await c.env.DB.prepare('SELECT * FROM maps_scrape_jobs WHERE country = ? AND state = ?')
    .bind(country, state).first();
  return c.json({ ok: true, job: row });
});

app.post('/api/maps-scrape/jobs/:id/status', async (c) => {
  const actor = mapsScrapeActor(c);
  if (!actor.ok) return c.json({ error: 'unauthorized' }, 401);
  await ensureMapsScrapeTable(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { status, cities_done, cities_total, artists_found, error } = body;
  const now = Date.now();
  const sets: string[] = ['updated_at = ?'];
  const binds: any[] = [now];
  if (status) { sets.push('status = ?'); binds.push(String(status)); }
  if (typeof cities_done === 'number') { sets.push('cities_done = ?'); binds.push(cities_done); }
  if (typeof cities_total === 'number') { sets.push('cities_total = ?'); binds.push(cities_total); }
  if (typeof artists_found === 'number') { sets.push('artists_found = ?'); binds.push(artists_found); }
  if (error !== undefined) { sets.push('error_text = ?'); binds.push(error || null); }
  binds.push(id);
  await c.env.DB.prepare(`UPDATE maps_scrape_jobs SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  return c.json({ ok: true });
});

app.delete('/api/maps-scrape/jobs/:id', async (c) => {
  const actor = mapsScrapeActor(c);
  if (!actor.ok) return c.json({ error: 'unauthorized' }, 401);
  await ensureMapsScrapeTable(c.env.DB);
  const id = c.req.param('id');
  const r = await c.env.DB.prepare('DELETE FROM maps_scrape_jobs WHERE id = ?').bind(id).run();
  return c.json({ ok: true, deleted: (r.meta?.changes || 0) > 0 });
});

// ============ ShopOutreach 旧 UI 桥接到真任务系统（2026-08-06）============
// ShopOutreach 页面的 /api/scrape/* 是老一套抓取 UI，接口从未在后端实现（一直 401）。
// 这里把它们桥接到真实的 maps_scrape_jobs 任务队列 + D1 artists 表：
//   - 启动抓取 = 创建/重置 maps-scrape job（VPS/本机调度器自动消费）
//   - 状态/结果 = 从 maps_scrape_jobs / artists 读真数据
// 鉴权：启动抓取接受 bot token 或登录用户（同 mapsScrapeActor）；查询类接口公开（同 /api/artists）。

// POST /api/scrape/python — 启动/重置一个州的抓取任务（等价于 maps-scrape jobs 创建）
app.post('/api/scrape/python', async (c) => {
  const actor = mapsScrapeActor(c);
  if (!actor.ok) return c.json({ error: 'Unauthorized' }, 401);
  await ensureMapsScrapeTable(c.env.DB);
  const body = await c.req.json().catch(() => ({}));
  const state = String(body.state || '').trim().toUpperCase();
  if (!state) return c.json({ error: 'state required' }, 400);
  const country = normalizeCountry(body.country || 'US');
  const now = Date.now();
  let citiesArr: string[] = [];
  if (Array.isArray(body.cities)) citiesArr = body.cities.map((x: any) => String(x).trim()).filter(Boolean);
  else if (body.cities) citiesArr = String(body.cities).split(',').map((x: string) => x.trim()).filter(Boolean);
  // cities 为空 = 全州自动抓（调度器从 cloud-api 拉全州城市）；显式传了才覆盖 job 城市列表
  const citiesJson = citiesArr.length ? JSON.stringify(citiesArr) : JSON.stringify([]);
  const citiesTotal = citiesArr.length || null;
  try {
    await c.env.DB.prepare(`
      INSERT INTO maps_scrape_jobs (country, state, cities, status, cities_total, cities_done, artists_found, error_text, created_by, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', COALESCE(?, 0), 0, 0, NULL, ?, ?, ?)
      ON CONFLICT(country, state) DO UPDATE SET
        cities = CASE WHEN excluded.cities = '[]' THEN maps_scrape_jobs.cities ELSE excluded.cities END,
        status = 'pending',
        cities_total = CASE WHEN excluded.cities = '[]' THEN maps_scrape_jobs.cities_total ELSE excluded.cities_total END,
        cities_done = 0,
        artists_found = 0,
        error_text = NULL,
        created_by = excluded.created_by,
        updated_at = excluded.updated_at
    `).bind(country, state, citiesJson, citiesTotal, actor.uid, now, now).run();
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
  const row = await c.env.DB.prepare('SELECT * FROM maps_scrape_jobs WHERE country = ? AND state = ?').bind(country, state).first() as any;
  return c.json({ ok: true, taskId: String(row?.id || ''), state, status: 'pending' });
});

// GET /api/scrape/tasks — 任务列表（等价 maps-scrape jobs 列表）
app.get('/api/scrape/tasks', async (c) => {
  await ensureMapsScrapeTable(c.env.DB);
  const rows = await d1All(c.env.DB, `SELECT id, state, status, cities_total, cities_done, artists_found, updated_at FROM maps_scrape_jobs ORDER BY updated_at DESC LIMIT 100`);
  return c.json((rows || []).map((r: any) => ({
    id: String(r.id),
    state: r.state,
    status: r.status,
    completed: Number(r.cities_done || 0),
    total: Number(r.cities_total || 0),
    shopsSaved: Number(r.artists_found || 0),
    updatedAt: r.updated_at,
  })));
});

// GET /api/scrape/status/:taskId — 任务进度（等价 maps-scrape job 详情）
app.get('/api/scrape/status/:taskId', async (c) => {
  await ensureMapsScrapeTable(c.env.DB);
  const id = c.req.param('taskId');
  const row = await c.env.DB.prepare('SELECT * FROM maps_scrape_jobs WHERE id = ?').bind(id).first() as any;
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({
    id: String(row.id),
    state: row.state,
    status: row.status,
    completed: Number(row.cities_done || 0),
    total: Number(row.cities_total || 0),
    shopsSaved: Number(row.artists_found || 0),
    errorText: row.error_text || null,
    logs: [],
  });
});

// GET /api/scrape/results/:taskId — 该任务的抓取结果（从 D1 artists 按 state 查）
app.get('/api/scrape/results/:taskId', async (c) => {
  await ensureMapsScrapeTable(c.env.DB);
  const id = c.req.param('taskId');
  const row = await c.env.DB.prepare('SELECT * FROM maps_scrape_jobs WHERE id = ?').bind(id).first() as any;
  if (!row) return c.json({ rows: [], warning: 'task_not_found' });
  const limit = Math.min(500, Math.max(1, parseInt(String(c.req.query('limit') || '100'))));
  const rows = await d1All(c.env.DB, `SELECT id, shop_name, ig_handle, city, state, import_region, email, phone, website, rating, reviews, followers, stage, last_updated FROM artists WHERE state = ? OR import_region = ? ORDER BY shop_name ASC LIMIT ${limit}`, [row.state, row.state]);
  return c.json({ rows: rows || [], warning: undefined });
});

// POST /api/scrape/pause|resume|cancel/:taskId — 任务状态切换
app.post('/api/scrape/pause/:taskId', async (c) => {
  const actor = mapsScrapeActor(c);
  if (!actor.ok) return c.json({ error: 'Unauthorized' }, 401);
  await ensureMapsScrapeTable(c.env.DB);
  const id = c.req.param('taskId');
  await c.env.DB.prepare(`UPDATE maps_scrape_jobs SET status = 'paused', updated_at = ? WHERE id = ?`).bind(Date.now(), id).run();
  return c.json({ ok: true, status: 'paused' });
});
app.post('/api/scrape/resume/:taskId', async (c) => {
  const actor = mapsScrapeActor(c);
  if (!actor.ok) return c.json({ error: 'Unauthorized' }, 401);
  await ensureMapsScrapeTable(c.env.DB);
  const id = c.req.param('taskId');
  await c.env.DB.prepare(`UPDATE maps_scrape_jobs SET status = 'pending', updated_at = ? WHERE id = ?`).bind(Date.now(), id).run();
  return c.json({ ok: true, status: 'pending' });
});
app.post('/api/scrape/cancel/:taskId', async (c) => {
  const actor = mapsScrapeActor(c);
  if (!actor.ok) return c.json({ error: 'Unauthorized' }, 401);
  await ensureMapsScrapeTable(c.env.DB);
  const id = c.req.param('taskId');
  await c.env.DB.prepare(`UPDATE maps_scrape_jobs SET status = 'cancelled', updated_at = ? WHERE id = ?`).bind(Date.now(), id).run();
  return c.json({ ok: true, status: 'cancelled' });
});

// GET /api/scrape/export/:taskId — 导出该州抓取结果 CSV（直接流式返回）
app.get('/api/scrape/export/:taskId', async (c) => {
  await ensureMapsScrapeTable(c.env.DB);
  const id = c.req.param('taskId');
  const row = await c.env.DB.prepare('SELECT * FROM maps_scrape_jobs WHERE id = ?').bind(id).first() as any;
  const state = row?.state || '';
  const rows = state ? await d1All(c.env.DB, `SELECT shop_name, ig_handle, city, state, import_region, email, phone, website, rating, reviews, followers, stage FROM artists WHERE state = ? OR import_region = ? ORDER BY shop_name ASC`, [state, state]) : [];
  const header = ['Shop Name', 'Instagram', 'City', 'State', 'Import Region', 'Email', 'Phone', 'Website', 'Rating', 'Reviews', 'Followers', 'Stage'];
  const esc = (v: any) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [header.join(',')];
  (rows || []).forEach((r: any) => lines.push([r.shop_name, r.ig_handle, r.city, r.state, r.import_region, r.email, r.phone, r.website, r.rating, r.reviews, r.followers, r.stage].map(esc).join(',')));
  return c.body(lines.join('\n'), 200, { 'Content-Type': 'text/csv;charset=utf-8', 'Content-Disposition': `attachment; filename="scrape_${id}.csv"` });
});

// GET /api/deep-scan/failed/:taskId — 深扫失败项（尚未实现深扫，返回空列表）
app.get('/api/deep-scan/failed/:taskId', async (c) => {
  return c.json({ items: [] });
});

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

// Current task queue counts. When state is supplied, only tasks whose payload
// belongs to that state are counted. Historical daily totals are intentionally
// not mixed in: doing so made the live queue look much larger than it was.
app.get('/api/automation/task-counts', async (c) => {
  const counts: Record<string, number> = { pending: 0, leased: 0, done: 0, failed: 0 };
  const state = String(c.req.query('state') || '').trim().toUpperCase();
  try {
    await ensureD1Tables(c.env.DB);
    const where = state
      ? `WHERE UPPER(COALESCE(
          json_extract(payload, '$.state'),
          json_extract(payload, '$.artistState'),
          (SELECT COALESCE(a.import_region, a.state) FROM artists a
           WHERE LOWER(a.ig_handle) = LOWER(json_extract(automation_tasks.payload, '$.artistHandle')) LIMIT 1),
          ''
        )) = ?`
      : '';
    const query = `SELECT status, COUNT(*) AS cnt FROM automation_tasks ${where} GROUP BY status`;
    const rows = state
      ? await c.env.DB.prepare(query).bind(state).all()
      : await c.env.DB.prepare(query).all();
    for (const r of (rows.results || []) as any) {
      const count = Number(r.cnt || 0);
      if (r.status === 'pending') counts.pending += count;
      else if (r.status === 'leased' || r.status === 'running') counts.leased += count;
      else if (r.status === 'done') counts.done += count;
      else if (r.status === 'failed' || r.status === 'error') counts.failed += count;
    }
  } catch {}
  return c.json({ ok: true, counts, state: state || null, source: 'automation_tasks' });
});

// Debug: check VPS + Neon + D1 raw data
app.get('/api/automation/task-counts-debug', async (c) => {
  const result: any = { vps: null, neon: null, d1: null, error: null };
  result.vps = 'VPS :3000 已于 2026-06 迁云废弃，历史数据取自 D1/Neon';
  try {
    const connStr = c.env.NEON_DATABASE_URL;
    if (connStr) result.neon = await d1All(c.env.DB,
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

app.get('/api/automation/bot-daily-stats', async (c) => {
  const date = c.req.query('date') || new Date().toISOString().slice(0, 10);
  const days = Math.min(30, Math.max(1, Number(c.req.query('days')) || 7));
  const botId = String(c.req.query('botId') || '').trim();
  try {
    await ensureBehaviorLogsTable(c.env.DB);
    const botWhere = botId ? ' AND bot_id = ?' : '';
    const botParams = botId ? [botId] : [];
    const dayRows = await c.env.DB.prepare(`
      SELECT
        bot_id,
        SUM(CASE WHEN event = 'task_done' THEN 1 ELSE 0 END) AS tasks_done,
        SUM(CASE WHEN event = 'task_failed' THEN 1 ELSE 0 END) AS tasks_failed,
        SUM(CASE WHEN event = 'like_post' THEN 1 ELSE 0 END) AS likes,
        SUM(CASE WHEN event = 'follow_done' THEN 1 ELSE 0 END) AS follows,
        SUM(CASE WHEN event = 'comment_posted' THEN 1 ELSE 0 END) AS comments,
        SUM(CASE WHEN event = 'comment_review_queued' THEN 1 ELSE 0 END) AS comment_candidates,
        SUM(CASE WHEN event IN ('comment_vision_blocked','comment_grounding_blocked','comment_capture_blocked','comment_post_failed') THEN 1 ELSE 0 END) AS comment_blocked,
        SUM(CASE WHEN event = 'like_session_done' THEN CAST(COALESCE(json_extract(data, '$.attempted'), 0) AS INTEGER) ELSE 0 END) AS like_attempted,
        SUM(CASE WHEN event = 'like_session_done' THEN CAST(COALESCE(json_extract(data, '$.liked'), 0) AS INTEGER) ELSE 0 END) AS like_reported
      FROM bot_behavior_logs
      WHERE substr(ts, 1, 10) = ?${botWhere}
      GROUP BY bot_id
      ORDER BY bot_id
    `).bind(date, ...botParams).all();

    const trendRows = await c.env.DB.prepare(`
      SELECT
        substr(ts, 1, 10) AS day,
        bot_id,
        SUM(CASE WHEN event = 'task_done' THEN 1 ELSE 0 END) AS tasks_done,
        SUM(CASE WHEN event = 'task_failed' THEN 1 ELSE 0 END) AS tasks_failed,
        SUM(CASE WHEN event = 'like_post' THEN 1 ELSE 0 END) AS likes,
        SUM(CASE WHEN event = 'follow_done' THEN 1 ELSE 0 END) AS follows,
        SUM(CASE WHEN event = 'comment_posted' THEN 1 ELSE 0 END) AS comments
      FROM bot_behavior_logs
      WHERE ts >= datetime(?, '-' || ? || ' days')${botWhere}
      GROUP BY day, bot_id
      ORDER BY day DESC, bot_id
    `).bind(`${date}T23:59:59Z`, days - 1, ...botParams).all();

    const bots = (dayRows.results || []).map((row: any) => {
      const tasksDone = Number(row.tasks_done || 0);
      const likes = Number(row.likes || 0);
      const follows = Number(row.follows || 0);
      const comments = Number(row.comments || 0);
      const likeAttempted = Number(row.like_attempted || 0);
      const likeReported = Number(row.like_reported || 0);
      return {
        botId: row.bot_id,
        tasksDone,
        tasksFailed: Number(row.tasks_failed || 0),
        likes,
        follows,
        comments,
        commentCandidates: Number(row.comment_candidates || 0),
        commentBlocked: Number(row.comment_blocked || 0),
        likeAttempted,
        likeReported,
        likeRate: tasksDone ? Math.round((likes / tasksDone) * 100) : 0,
        followRate: tasksDone ? Math.round((follows / tasksDone) * 100) : 0,
        commentRate: tasksDone ? Math.round((comments / tasksDone) * 100) : 0,
        likeSuccessRate: likeAttempted ? Math.round((likeReported / likeAttempted) * 100) : 0,
      };
    });

    const totals = bots.reduce((acc: any, row: any) => {
      for (const key of ['tasksDone','tasksFailed','likes','follows','comments','commentCandidates','commentBlocked','likeAttempted','likeReported']) {
        acc[key] = Number(acc[key] || 0) + Number(row[key] || 0);
      }
      return acc;
    }, {});
    totals.likeRate = totals.tasksDone ? Math.round((totals.likes / totals.tasksDone) * 100) : 0;
    totals.followRate = totals.tasksDone ? Math.round((totals.follows / totals.tasksDone) * 100) : 0;
    totals.commentRate = totals.tasksDone ? Math.round((totals.comments / totals.tasksDone) * 100) : 0;
    totals.likeSuccessRate = totals.likeAttempted ? Math.round((totals.likeReported / totals.likeAttempted) * 100) : 0;

    return c.json({ ok: true, date, days, botId: botId || null, bots, totals, trend: trendRows.results || [] });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e), bots: [], totals: {}, trend: [] }, 500);
  }
});

// Return unique bot IDs for frontend dropdown
app.get('/api/automation/behavior-bots', async (c) => {
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
  const { botId, host, version, meta } = await c.req.json();
  if (!botId) return c.json({ error: 'botId required' }, 400);
  const now = Date.now();
  await c.env.DB.prepare(`INSERT INTO bot_instances (bot_id,host,version,status,registered_at,last_heartbeat,meta)
    VALUES (?,?,?,'online',?,?,?) ON CONFLICT(bot_id) DO UPDATE SET
    status='online', last_heartbeat=excluded.last_heartbeat, host=excluded.host, version=excluded.version, meta=excluded.meta
  `).bind(botId, host||'', version||'', now, now, meta ? JSON.stringify(meta) : null).run();
  return c.json({ ok: true, botId, ts: now });
});

// ============ BOT FRONTEND READ ENDPOINTS (A-layer: light up BotWorkerManager) ============
// Frontend BotWorkerManager already fetches these 3 paths; they were missing server-side,
// leaving the panel empty. These are read-only mirrors of bot_instances / bot_profile_adjustments
// plus a static function catalog. No control-plane (start/stop) here.

// Static catalog of the 7 bot functions (ids must match FUNCTION_ICONS/FUNCTION_COLORS in frontend).
const BOT_FUNCTION_CATALOG: any[] = [
  {
    id: 'ig_outreach',
    name: 'IG 拓客机器人',
    description: '登录 Instagram 自动浏览/点赞目标纹身师主页与帖子，模拟真人行为积累互动，为主账号沉淀潜在客户。',
    businessValue: ['沉淀高意向纹身师线索', '提升主页自然触达', '低成本规模化获客'],
    outputs: ['behavior_logs 行为日志', '潜在客户画像', '互动记录'],
    useCases: ['新账号冷启动', '日常养号互动', '定向州/标签拓客'],
    workflow: 'poll → 打开主页 → 浏览/点赞 → 记录行为 → 心跳',
    browserMode: 'cdp',
    multiAccount: false,
    configs: [],
  },
  {
    id: 'supply_analysis',
    name: '供应商分析机器人',
    description: '分析纹身耗材供应商页面与竞品，提取价格/品类/评分，沉淀供应链情报。',
    businessValue: ['供应商比价', '品类缺口发现', '成本优化'],
    outputs: ['供应商档案', '比价表', '缺货预警'],
    useCases: ['选品决策', '补货规划', '竞品对标'],
    workflow: '抓取供应商页 → 解析字段 → 入库 → 生成情报',
    browserMode: 'playwright',
    multiAccount: false,
    configs: [],
  },
  {
    id: 'reddit_intel',
    name: 'Reddit 舆情机器人',
    description: '监控 Reddit 纹身相关版块，提取需求与口碑信号，反哺内容选题。',
    businessValue: ['需求洞察', '口碑监测', '选题灵感'],
    outputs: ['舆情信号', '热点话题', '用户痛点'],
    useCases: ['选题挖掘', '品牌监听'],
    workflow: '订阅版块 → 抓取热帖 → NLP 打标 → 入库',
    browserMode: 'none',
    multiAccount: false,
    configs: [],
  },
  {
    id: 'content_pipeline',
    name: '内容生产机器人',
    description: '将采集的素材按品牌调性生成图文/短视频草稿，推进发布队列。',
    businessValue: ['规模化内容产出', '品牌一致性', '降低人力'],
    outputs: ['内容草稿', '发布队列任务'],
    useCases: ['社媒日更', '促销素材', '教程类内容'],
    workflow: 'claim → 生成 → 审核 → 入队',
    browserMode: 'persistent',
    multiAccount: false,
    configs: [],
  },
  {
    id: 'forum_monitor',
    name: '论坛监测机器人',
    description: '监测纹身垂类论坛与社区，提取讨论热点与潜在客户。',
    businessValue: ['社区洞察', '长尾线索', '趋势预判'],
    outputs: ['讨论摘要', '线索列表'],
    useCases: ['社区运营', '趋势捕捉'],
    workflow: '抓取帖子 → 聚类 → 入库',
    browserMode: 'none',
    multiAccount: false,
    configs: [],
  },
  {
    id: 'product_tracker',
    name: '竞品商品追踪机器人',
    description: '追踪竞品店铺上新与价格变动，输出竞品情报。',
    businessValue: ['竞品上新监控', '价格变动预警', '选品参考'],
    outputs: ['竞品 SKU', '价格曲线', '上新提醒'],
    useCases: ['竞品对标', '定价参考'],
    workflow: '抓竞品页 → diff → 告警',
    browserMode: 'cdp',
    multiAccount: false,
    configs: [],
  },
  {
    id: 'supply_comments',
    name: '供应商评论分析机器人',
    description: '分析耗材商品评论，提取质量反馈与差评信号。',
    businessValue: ['质量反馈', '差评预警', '选品避坑'],
    outputs: ['评论摘要', '差评信号'],
    useCases: ['选品质检', '供应商评估'],
    workflow: '抓评论 → 情感分析 → 入库',
    browserMode: 'none',
    multiAccount: false,
    configs: [],
  },
  {
    id: 'general_intel',
    name: '通用行业情报机器人',
    description: '面向任意行业/产品的通用情报采集：追踪竞品新品、产品改进方向、客户抱怨与差评等一系列信号，沉淀可复用的产品与市场情报。不写死垂类，通过配置指定行业/品牌/目标源，可复制到任意新行业。',
    businessValue: ['跨行业复用', '新品机会发现', '产品改进线索', '客户之声(VoC)监测', '差评/抱怨预警'],
    outputs: ['行业情报档案', '新品/改进机会清单', '客户抱怨与差评摘要', '竞品对标报告'],
    useCases: ['新行业市场调研', '新品开发方向', '产品迭代改进', '客户满意度监测', '差评根因分析'],
    workflow: '配置行业/品牌/目标源 → 抓取竞品页/评论/社区 → AI 分类(新品/改进/抱怨/差评/口碑) → 情感与主题打标 → 入库通用情报表 → 生成机会清单与预警',
    browserMode: 'none',
    multiAccount: false,
    devOnly: true,
    researchMode: true,
    defaultBotId: 'general_intel_01',
    configs: [
      { key: 'TARGET_INDUSTRY', label: '目标行业', type: 'text', default: '' },
      { key: 'TARGET_BRANDS', label: '品牌/竞品(逗号分隔)', type: 'text', default: '' },
      { key: 'SOURCE_URLS', label: '目标源 URL(逗号分隔)', type: 'text', default: '' },
      { key: 'KEYWORDS', label: '关键词(逗号分隔)', type: 'text', default: '' },
      { key: 'INTEL_FOCUS', label: '情报聚焦', type: 'select', options: ['new_product', 'improvement', 'complaints', 'reviews', 'all'], default: 'all' },
    ],
  },
];

// Map a bot_instances.meta → functionId (best-effort). Unmatched bots still count in the
// top "运行中" counter via workers[].running; they just won't light a specific card.
function inferFunctionId(meta: any): string | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const mode = String(meta.mode || '').toLowerCase();
  const role = String(meta.role || '').toLowerCase();
  if (mode === 'persistent') return 'content_pipeline';
  if (role === 'data') return 'supply_analysis';
  if (mode.includes('comment')) return 'supply_comments';
  if (mode.includes('supply') || mode.includes('competitive')) return 'supply_analysis';
  if (mode.includes('real') || mode.includes('browse') || mode.includes('ig')) return 'ig_outreach';
  return undefined;
}

app.get('/api/bot/functions', async (c) => {
  return c.json({ ok: true, functions: BOT_FUNCTION_CATALOG });
});

app.get('/api/bot/workers', async (c) => {
  try {
    await ensureBotTables(c.env.DB);
    const rows = await c.env.DB.prepare(
      'SELECT bot_id, host, version, status, registered_at, last_heartbeat, meta FROM bot_instances'
    ).all();
    const now = Date.now();
    const STALE_MS = 3 * 60 * 1000; // treat heartbeats older than 3 min as not running
    const workers = (rows.results || []).map((r: any) => {
      let meta: any = {};
      try { meta = r.meta ? JSON.parse(r.meta) : {}; } catch {}
      const lastHb = Number(r.last_heartbeat || 0);
      const running = r.status === 'online' && (now - lastHb) < STALE_MS;
      return {
        botId: r.bot_id,
        host: r.host || '',
        version: r.version || '',
        running,
        functionId: inferFunctionId(meta),
        startedAt: Number(r.registered_at || lastHb || 0),
        lastHeartbeat: lastHb,
      };
    });
    return c.json({ ok: true, workers });
  } catch (e: any) {
    return c.json({ ok: false, workers: [], error: String(e?.message || e) }, 500);
  }
});

app.get('/api/automation/comment-chain-health', async (c) => {
  if (!checkBotToken(c)) {
    if (!c.get('user')) {
      const auth = c.req.header('Authorization') || '';
      if (auth.startsWith('Bearer ')) {
        const user = await verifyToken(auth.slice(7));
        if (user) c.set('user', user);
      }
    }
    if (!(await requireTab(c, 'inkflow-outreach'))) {
      return c.json({ error: 'not_authorized' }, 403);
    }
  }
  const botId = String(c.req.query('botId') || 'bot_ig_01').trim() || 'bot_ig_01';
  const now = Date.now();
  const since24 = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  try {
    await ensureBotTables(c.env.DB);
    await ensureBehaviorLogsTable(c.env.DB);
    await ensureDraftsTable(c.env.DB);
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_action_prefs (
      uid TEXT PRIMARY KEY, likes_per_session INTEGER DEFAULT 2, comments_per_session INTEGER DEFAULT 1,
      follows_per_session INTEGER DEFAULT 0, bot_id TEXT DEFAULT 'bot_ig_01', ig_handle TEXT DEFAULT '',
      updated_at INTEGER
    )`).run().catch(() => {});

    const worker = await c.env.DB.prepare(
      'SELECT bot_id, host, version, status, last_heartbeat, registered_at FROM bot_instances WHERE bot_id = ?'
    ).bind(botId).first() as any;
    const lastHeartbeat = Number(worker?.last_heartbeat || 0);
    const workerRunning = !!worker && worker.status === 'online' && (now - lastHeartbeat) < 3 * 60 * 1000;

    const prefsRow = await c.env.DB.prepare(`
      SELECT * FROM bot_action_prefs
       WHERE bot_id = ?
       ORDER BY updated_at DESC
       LIMIT 1
    `).bind(botId).first() as any;
    const prefs = prefsRow ? {
      likesPerSession: Number(prefsRow.likes_per_session || 0),
      commentsPerSession: Number(prefsRow.comments_per_session || 0),
      followsPerSession: Number(prefsRow.follows_per_session || 0),
      botId: prefsRow.bot_id || botId,
      igHandle: prefsRow.ig_handle || '',
      updatedAt: Number(prefsRow.updated_at || 0),
    } : null;

    const taskRows = await c.env.DB.prepare(`
      SELECT id, status, created_at, updated_at,
             json_extract(payload, '$.artistHandle') AS handle,
             json_extract(payload, '$.targetBotId') AS target_bot_id,
             CAST(COALESCE(json_extract(payload, '$.likesPerSession'), 0) AS INTEGER) AS likes_per_session,
             CAST(COALESCE(json_extract(payload, '$.commentsPerSession'), 0) AS INTEGER) AS comments_per_session,
             CAST(COALESCE(json_extract(payload, '$.followsPerSession'), 0) AS INTEGER) AS follows_per_session
        FROM automation_tasks
       WHERE json_extract(payload, '$.targetBotId') = ?
          OR leased_by = ?
       ORDER BY created_at DESC
       LIMIT 12
    `).bind(botId, botId).all();
    const recentTasks = (taskRows.results || []).map((r: any) => ({
      id: r.id,
      status: r.status,
      handle: r.handle || '',
      targetBotId: r.target_bot_id || '',
      likesPerSession: Number(r.likes_per_session || 0),
      commentsPerSession: Number(r.comments_per_session || 0),
      followsPerSession: Number(r.follows_per_session || 0),
      createdAt: Number(r.created_at || 0),
      updatedAt: Number(r.updated_at || 0),
    }));
    const recentTasksWithComments = recentTasks.filter((t: any) => t.commentsPerSession > 0).length;

    const draftCountsRows = await c.env.DB.prepare(`
      SELECT status, COUNT(*) AS n
        FROM comment_drafts
       WHERE bot_id = ?
       GROUP BY status
    `).bind(botId).all();
    const draftCounts: Record<string, number> = {};
    for (const r of (draftCountsRows.results || []) as any[]) draftCounts[String(r.status)] = Number(r.n || 0);

    const eventRows = await c.env.DB.prepare(`
      SELECT event, COUNT(*) AS n, MAX(ts) AS last_ts
        FROM bot_behavior_logs
       WHERE bot_id = ?
         AND ts >= ?
         AND event IN (
          'task_start','task_done','task_failed','like_post','like_session_done',
          'comment_review_queued','comment_review_queue_failed',
          'comment_skip_no_tattoo_intent','comment_skip_blacklist','comment_skip_unknown',
          'comment_waiting_human_review','comment_approved_publish_start',
          'comment_approved_publish_failed','comment_approved_publish_error','comment_posted'
         )
       GROUP BY event
    `).bind(botId, since24).all();
    const events: Record<string, { count: number; lastTs: string | null }> = {};
    for (const r of (eventRows.results || []) as any[]) {
      events[String(r.event)] = { count: Number(r.n || 0), lastTs: r.last_ts || null };
    }

    const breaks: string[] = [];
    if (!workerRunning) breaks.push('worker_not_running_or_stale');
    if (!prefs) breaks.push('prefs_not_saved_for_bot');
    if (prefs && prefs.commentsPerSession <= 0) breaks.push('prefs_comments_zero');
    if (recentTasks.length > 0 && recentTasksWithComments === 0) breaks.push('recent_tasks_comments_zero');
    if ((events.comment_review_queue_failed?.count || 0) > 0) breaks.push('draft_queue_errors_last_24h');
    if ((events.comment_review_queued?.count || 0) === 0) breaks.push('no_drafts_queued_last_24h');
    if ((draftCounts.pending || 0) === 0 && (draftCounts.approved || 0) === 0) breaks.push('no_pending_or_approved_drafts');

    return c.json({
      ok: true,
      botId,
      checkedAt: now,
      breaks,
      worker: worker ? {
        botId,
        host: worker.host || '',
        version: worker.version || '',
        status: worker.status || '',
        running: workerRunning,
        lastHeartbeat,
        heartbeatAgeSec: lastHeartbeat ? Math.round((now - lastHeartbeat) / 1000) : null,
      } : null,
      prefs,
      recentTasks,
      recentTasksWithComments,
      draftCounts,
      events,
    });
  } catch (e: any) {
    return c.json({ ok: false, botId, error: String(e?.message || e).slice(0, 300) }, 500);
  }
});

app.get('/api/bot/learn/status', async (c) => {
  try {
    await ensureBotTables(c.env.DB);
    const rows = await c.env.DB.prepare(
      'SELECT bot_id, adjustments_json, analysis_json, confidence, analyzed_at FROM bot_profile_adjustments'
    ).all();
    const profiles = (rows.results || []).map((r: any) => {
      let adjustments: any = {};
      try { adjustments = r.adjustments_json ? JSON.parse(r.adjustments_json) : {}; } catch {}
      return {
        botId: r.bot_id,
        adjustments,
        confidence: Number(r.confidence || 0),
        analyzedAt: Number(r.analyzed_at || 0),
      };
    });
    return c.json({ ok: true, profiles });
  } catch (e: any) {
    return c.json({ ok: false, profiles: [], error: String(e?.message || e) }, 500);
  }
});

// ── Host-aware process control plane ─────────────────────────────────────
// Commands are addressed to one listener host. This prevents a VPS listener
// from accidentally claiming a command intended for the local headed browser.
const FUNCTION_TO_PM2: Record<string, string> = {
  ig_outreach: 'bot-worker',
  ig_scheduler: 'ig-scheduler',
  maps_scraper: 'maps-scrape-scheduler',
  maps_bridge: 'maps-d1-bridge',
  competitor_ig: 'competitor-ig-monitor',
  supply_analysis: 'backlink-worker',
  reddit_intel: 'backlink-worker',
  content_pipeline: 'bot-worker',
  general_intel: 'general-intel',
};

const DEFAULT_FUNCTION_HOST: Record<string, string> = {
  maps_scraper: 'local-windows',
  maps_bridge: 'vps-windows',
  ig_scheduler: 'vps-windows',
  ig_outreach: 'vps-windows',
};

type ControlAction = 'start' | 'stop' | 'pause' | 'resume' | 'restart';

async function enqueueProcessCommand(c: any, action: ControlAction, suppliedBody?: any) {
  await ensureBotTables(c.env.DB);
  const body = suppliedBody ?? await c.req.json().catch(() => ({}));
  const functionId = String(body.functionId || body.botId || '').trim();
  if (!functionId) return c.json({ ok: false, error: 'functionId required' }, 400);
  if (!FUNCTION_TO_PM2[functionId]) {
    return c.json({ ok: false, error: `no runnable process for function ${functionId}` }, 400);
  }
  const targetHost = String(body.targetHost || DEFAULT_FUNCTION_HOST[functionId] || '').trim();
  if (!targetHost) return c.json({ ok: false, error: 'targetHost required' }, 400);
  const id = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const envJson = body.env ? JSON.stringify(body.env) : null;
  await c.env.DB.prepare(
    `INSERT INTO bot_commands (id, function_id, action, status, env, target_host, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(id, functionId, action, 'pending', envJson, targetHost, now, now).run();
  return c.json({
    ok: true,
    commandId: id,
    functionId,
    action,
    targetHost,
    pm2: FUNCTION_TO_PM2[functionId],
    status: 'pending',
  });
}

// Enqueue a start command for a function.
app.post('/api/bot/worker/start', async (c) => {
  try { return await enqueueProcessCommand(c, 'start'); }
  catch (e: any) { return c.json({ ok: false, error: String(e?.message || e) }, 500); }
});

// Enqueue a stop command for a function.
app.post('/api/bot/worker/stop', async (c) => {
  try { return await enqueueProcessCommand(c, 'stop'); }
  catch (e: any) { return c.json({ ok: false, error: String(e?.message || e) }, 500); }
});

// Enqueue a pause command (warm pause): VPS listener writes a local flag file;
// the worker reads it each loop and skips new actions WITHOUT stopping the
// process or closing Chrome — second-level recovery, no restart needed.
app.post('/api/bot/worker/pause', async (c) => {
  try { return await enqueueProcessCommand(c, 'pause'); }
  catch (e: any) { return c.json({ ok: false, error: String(e?.message || e) }, 500); }
});

// Enqueue a resume command: VPS listener removes the local flag; worker resumes
// on its next loop iteration.
app.post('/api/bot/worker/resume', async (c) => {
  try { return await enqueueProcessCommand(c, 'resume'); }
  catch (e: any) { return c.json({ ok: false, error: String(e?.message || e) }, 500); }
});

app.post('/api/bot/process/control', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const action = String(body.action || '') as ControlAction;
    if (!['start', 'stop', 'pause', 'resume', 'restart'].includes(action)) {
      return c.json({ ok: false, error: 'invalid action' }, 400);
    }
    return await enqueueProcessCommand(c, action, body);
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

// VPS listener polls this (guarded by BOT_API_TOKEN). Returns pending commands
// and marks them claimed so each is executed exactly once.
app.get('/api/bot/commands', async (c) => {
  try {
    await ensureBotTables(c.env.DB);
    const token = c.req.query('token');
    const expected = c.env.BOT_API_TOKEN || 'vps-bot-secret-2024';
    if (token !== expected) return c.json({ ok: false, error: 'invalid token' }, 401);
    const hostId = String(c.req.query('hostId') || '').trim();
    if (!hostId) return c.json({ ok: false, error: 'hostId required' }, 400);
    const rows = await c.env.DB.prepare(
      `SELECT * FROM bot_commands
       WHERE status = 'pending' AND (target_host = ? OR (target_host IS NULL AND ? = 'vps-windows'))
       ORDER BY created_at ASC LIMIT 20`
    ).bind(hostId, hostId).all();
    const cmds = (rows.results || []).map((r: any) => ({
      id: r.id, functionId: r.function_id, action: r.action,
      pm2: FUNCTION_TO_PM2[r.function_id] || null,
      env: r.env ? (() => { try { return JSON.parse(r.env); } catch { return {}; } })() : {},
    }));
    for (const r of (rows.results || [])) {
      await c.env.DB.prepare(`UPDATE bot_commands SET status='claimed', claimed_by=?, updated_at=? WHERE id=? AND status='pending'`)
        .bind(hostId, Date.now(), r.id).run();
    }
    return c.json({ ok: true, commands: cmds });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

app.post('/api/bot/control/heartbeat', async (c) => {
  try {
    await ensureBotTables(c.env.DB);
    const body = await c.req.json().catch(() => ({}));
    const token = c.req.query('token') || body.token;
    const expected = c.env.BOT_API_TOKEN || 'vps-bot-secret-2024';
    if (token !== expected) return c.json({ ok: false, error: 'invalid token' }, 401);
    const hostId = String(body.hostId || '').trim();
    if (!hostId) return c.json({ ok: false, error: 'hostId required' }, 400);
    const now = Date.now();
    await c.env.DB.prepare(`
      INSERT INTO control_agents (host_id, label, status, processes, meta, last_heartbeat)
      VALUES (?, ?, 'online', ?, ?, ?)
      ON CONFLICT(host_id) DO UPDATE SET label=excluded.label, status='online',
        processes=excluded.processes, meta=excluded.meta, last_heartbeat=excluded.last_heartbeat
    `).bind(
      hostId,
      String(body.label || hostId),
      JSON.stringify(body.processes || {}),
      JSON.stringify(body.meta || {}),
      now,
    ).run();
    return c.json({ ok: true, hostId, lastHeartbeat: now });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

app.get('/api/bot/control/status', async (c) => {
  try {
    await ensureBotTables(c.env.DB);
    const [agentRows, commandRows] = await Promise.all([
      c.env.DB.prepare(`SELECT host_id, label, status, processes, meta, last_heartbeat FROM control_agents ORDER BY host_id`).all(),
      c.env.DB.prepare(`SELECT id, function_id, action, target_host, status, claimed_by, error_reason, created_at, updated_at
        FROM bot_commands ORDER BY created_at DESC LIMIT 30`).all(),
    ]);
    const now = Date.now();
    const agents = (agentRows.results || []).map((row: any) => {
      let processes: any = {};
      let meta: any = {};
      try { processes = JSON.parse(row.processes || '{}'); } catch {}
      try { meta = JSON.parse(row.meta || '{}'); } catch {}
      const lastHeartbeat = Number(row.last_heartbeat || 0);
      return {
        hostId: row.host_id,
        label: row.label || row.host_id,
        online: now - lastHeartbeat < 60_000,
        lastHeartbeat,
        processes,
        meta,
      };
    });
    const commands = (commandRows.results || []).map((row: any) => ({
      id: row.id,
      functionId: row.function_id,
      action: row.action,
      targetHost: row.target_host,
      status: row.status,
      claimedBy: row.claimed_by,
      error: row.error_reason,
      createdAt: Number(row.created_at || 0),
      updatedAt: Number(row.updated_at || 0),
    }));
    return c.json({ ok: true, agents, commands });
  } catch (e: any) {
    return c.json({ ok: false, agents: [], commands: [], error: String(e?.message || e) }, 500);
  }
});

// Listener reports execution result (optional, for frontend status display).
app.post('/api/bot/commands/report', async (c) => {
  try {
    await ensureBotTables(c.env.DB);
    const body = await c.req.json().catch(() => ({}));
    const token = c.req.query('token') || body.token;
    const expected = c.env.BOT_API_TOKEN || 'vps-bot-secret-2024';
    if (token !== expected) return c.json({ ok: false, error: 'invalid token' }, 401);
    const { id, ok, error } = body;
    if (!id) return c.json({ ok: false, error: 'id required' }, 400);
    await c.env.DB.prepare(`UPDATE bot_commands SET status=?, error_reason=?, updated_at=? WHERE id=?`)
      .bind(ok ? 'done' : 'error', error || null, Date.now(), id).run();
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
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
  // Control-plane command queue: frontend (or API) enqueues start/stop; the
  // VPS bot-control-listener polls and executes via pm2.
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS bot_commands (
    id TEXT PRIMARY KEY, function_id TEXT NOT NULL, action TEXT NOT NULL,
    status TEXT DEFAULT 'pending', claimed_by TEXT, error_reason TEXT,
    created_at INTEGER, updated_at INTEGER
  )`).run(); } catch {}
  try { await db.prepare(`ALTER TABLE bot_commands ADD COLUMN env TEXT`).run(); } catch {}
  try { await db.prepare(`ALTER TABLE bot_commands ADD COLUMN target_host TEXT`).run(); } catch {}
  try { await db.prepare(`CREATE TABLE IF NOT EXISTS control_agents (
    host_id TEXT PRIMARY KEY, label TEXT, status TEXT DEFAULT 'online',
    processes TEXT, meta TEXT, last_heartbeat INTEGER
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
// ===== 前端「启动序列」→ 写任务（多用户：payload 带 owner_uid + targetBotId + humanization）=====
// 兼容前端 CRMContext.startAutomationSequence 的调用；userId 来自前端 user.uid（Phase 1 暂未强制 token 校验）
app.post('/api/automation/start', async (c) => {
  try {
    const body = await c.req.json();
    const userId = String(body.userId || body.user_uid || '').trim();
    const artistHandle = String(body.artistHandle || '').replace(/^@/, '').trim().toLowerCase();
    const accountHandle = String(body.accountHandle || body.account_handle || '').replace(/^@/, '').trim();
    const artistId = String(body.artistId || '');
    const accountId = String(body.accountId || '');
    if (!artistHandle) return c.json({ error: 'artistHandle required' }, 400);

    const humanization = body.humanization && typeof body.humanization === 'object' ? body.humanization : {};
    const targetBotId = String(body.targetBotId || body.target_bot_id || 'bot_ig_01').trim();
    const ts = Date.now();
    const dedupWindow = ts - 7 * 24 * 60 * 60 * 1000;
    const sql = d1Sql(c.env.DB);

    // 7 天去重：同 artistHandle 已有 pending/leased 则跳过（避免重复派发）
    const existing = await sql`
      SELECT id FROM automation_tasks
      WHERE json_extract(payload, '$.artistHandle') = ${artistHandle}
        AND status IN ('pending','leased')
        AND updated_at > ${dedupWindow}
      LIMIT 1
    `;
    const existingId = existing?.rows?.[0]?.id || (Array.isArray(existing) && existing[0]?.id) || null;
    if (existingId) {
      return c.json({ ok: true, skipped: true, reason: 'duplicate in window', taskId: existingId });
    }

    const payload = {
      artistId,
      accountId,
      artistHandle,
      accountHandle,
      owner_uid: userId,
      targetBotId,
      humanization,
      suggestedExecMode: 'browse_like',
      source: 'frontend-start'
    };
    const taskId = `start_${ts}_${artistHandle}`;
    await sql`INSERT INTO automation_tasks (id, status, payload, run_at, created_at, updated_at)
      VALUES (${taskId}, 'pending', ${JSON.stringify(payload)}, ${ts}, ${ts}, ${ts})`;
    return c.json({ ok: true, taskId, artistHandle, targetBotId, owner_uid: userId });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 300) }, 500);
  }
});

// ===== 用户 bot 动作偏好（2026-08-06）：前台「动作偏好」面板 ↔ D1 持久化 =====
// ig-scheduler 生成任务时读取该偏好，把点赞/评论/关注次数写进任务 payload，
// bot 按 payload 执行 → 前台改的设置真正作用于引流（此前只存 localStorage，bot 不读）。
app.get('/api/automation/bot-prefs', async (c) => {
  try {
    const uid = String(c.req.query('uid') || '').trim();
    if (!uid) return c.json({ ok: false, error: 'uid required' }, 400);
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_action_prefs (
      uid TEXT PRIMARY KEY, likes_per_session INTEGER DEFAULT 2, comments_per_session INTEGER DEFAULT 1,
      follows_per_session INTEGER DEFAULT 0, bot_id TEXT DEFAULT 'bot_ig_01', ig_handle TEXT DEFAULT '',
      updated_at INTEGER
    )`).run().catch(() => {});
    const row = await c.env.DB.prepare('SELECT * FROM bot_action_prefs WHERE uid = ?').bind(uid).first() as any;
    if (!row) return c.json({ ok: true, prefs: null });
    return c.json({ ok: true, prefs: {
      likesPerSession: Number(row.likes_per_session || 0),
      commentsPerSession: Number(row.comments_per_session || 0),
      followsPerSession: Number(row.follows_per_session || 0),
      botId: row.bot_id || 'bot_ig_01',
      igHandle: row.ig_handle || '',
    }});
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

app.post('/api/automation/bot-prefs', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as any;
    const uid = String(body.uid || '').trim();
    if (!uid) return c.json({ ok: false, error: 'uid required' }, 400);
    const likes = Math.max(0, Math.min(10, Number(body.likesPerSession) || 0));
    const comments = Math.max(0, Math.min(10, Number(body.commentsPerSession) || 0));
    const follows = Math.max(0, Math.min(10, Number(body.followsPerSession) || 0));
    const botId = String(body.botId || 'bot_ig_01').trim() || 'bot_ig_01';
    const igHandle = String(body.igHandle || '').trim();
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_action_prefs (
      uid TEXT PRIMARY KEY, likes_per_session INTEGER DEFAULT 2, comments_per_session INTEGER DEFAULT 1,
      follows_per_session INTEGER DEFAULT 0, bot_id TEXT DEFAULT 'bot_ig_01', ig_handle TEXT DEFAULT '',
      updated_at INTEGER
    )`).run().catch(() => {});
    await c.env.DB.prepare(`INSERT INTO bot_action_prefs (uid, likes_per_session, comments_per_session, follows_per_session, bot_id, ig_handle, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        likes_per_session = excluded.likes_per_session,
        comments_per_session = excluded.comments_per_session,
        follows_per_session = excluded.follows_per_session,
        bot_id = excluded.bot_id,
        ig_handle = excluded.ig_handle,
        updated_at = excluded.updated_at
    `).bind(uid, likes, comments, follows, botId, igHandle, Date.now()).run();
    return c.json({ ok: true, saved: true });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// GET /api/automation/bot-prefs/by-bot?botId=xx — ig-scheduler 用：按 botId 找偏好（取最新一条）
app.get('/api/automation/bot-prefs/by-bot', async (c) => {
  try {
    const botId = String(c.req.query('botId') || '').trim() || 'bot_ig_01';
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_action_prefs (
      uid TEXT PRIMARY KEY, likes_per_session INTEGER DEFAULT 2, comments_per_session INTEGER DEFAULT 1,
      follows_per_session INTEGER DEFAULT 0, bot_id TEXT DEFAULT 'bot_ig_01', ig_handle TEXT DEFAULT '',
      updated_at INTEGER
    )`).run().catch(() => {});
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_accounts (
      account_id TEXT PRIMARY KEY, ig_handle TEXT, created_at TEXT, stage TEXT DEFAULT 'new',
      daily_task_limit INTEGER DEFAULT 5, speed_factor REAL DEFAULT 2.5,
      first_used_at TEXT, vps_name TEXT, proxy TEXT
    )`).run().catch(() => {});
    const row = await c.env.DB.prepare(`
      SELECT p.*, a.first_used_at, a.stage AS account_stage, a.daily_task_limit, a.speed_factor
      FROM bot_action_prefs p
      LEFT JOIN bot_accounts a ON a.account_id = p.bot_id
      WHERE p.bot_id = ?
      ORDER BY p.updated_at DESC
      LIMIT 1
    `).bind(botId).first() as any;
    if (!row) return c.json({ ok: true, prefs: null });
    const firstUsedAt = row.first_used_at || null;
    const firstTs = firstUsedAt ? Date.parse(firstUsedAt) : NaN;
    const accountAgeDays = Number.isFinite(firstTs) ? Math.max(0, Math.floor((Date.now() - firstTs) / 86400000)) : 0;
    return c.json({ ok: true, prefs: {
      likesPerSession: Number(row.likes_per_session || 0),
      commentsPerSession: Number(row.comments_per_session || 0),
      followsPerSession: Number(row.follows_per_session || 0),
      botId: row.bot_id || 'bot_ig_01',
      igHandle: row.ig_handle || '',
      accountStage: row.account_stage || 'new',
      accountAgeDays,
      dailyTaskLimit: Number(row.daily_task_limit || 0),
      speedFactor: Number(row.speed_factor || 0),
      firstUsedAt,
    }});
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

app.get('/api/automation/poll', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const botId = c.req.query('botId') || '';
  const limit = Math.min(10, Math.max(1, Number(c.req.query('limit')) || 1));
  if (!botId) return c.json({ error: 'botId required' }, 400);
  const now = Date.now();
  const dedupWindow = now - 7 * 24 * 60 * 60 * 1000;
  try {
    const sql = d1Sql(c.env.DB);
    // Recycle expired leases
    await sql`UPDATE automation_tasks SET status = 'pending', leased_by = NULL, lease_until = NULL, updated_at = ${now}
              WHERE status = 'leased' AND lease_until IS NOT NULL AND lease_until < ${now}`.catch(() => {});

    // SELECT pending tasks with dedup（多账号：只拿本 bot 账号的任务；NULL 兼容 ig-scheduler 旧任务）
    const candidates = await sql`
      SELECT id, payload FROM automation_tasks
      WHERE status = 'pending' AND (run_at IS NULL OR run_at <= ${now})
        AND (json_extract(payload, '$.targetBotId') IS NULL OR json_extract(payload, '$.targetBotId') = '' OR json_extract(payload, '$.targetBotId') = ${botId})
        AND (json_extract(payload, '$.artistHandle') IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM automation_tasks d
            WHERE d.id != automation_tasks.id
              AND d.status IN ('pending','leased') AND d.updated_at > ${dedupWindow}
              AND json_extract(d.payload, '$.artistHandle') = json_extract(automation_tasks.payload, '$.artistHandle')
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
    const now = Date.now();
    try {
      const sql = d1Sql(c.env.DB);
      await sql`UPDATE automation_tasks SET status = ${status}, lease_until = NULL, leased_by = NULL, error_reason = ${status === 'failed' ? (reason || 'unknown') : null}, updated_at = ${now}
                WHERE id = ${commandId} AND leased_by = ${botId} AND status IN ('leased','running')`;
    } catch (e: any) {
      console.error('[report] Neon error:', e?.message || e);
    }
    // ---- 2026-08-06: bot 任务 done → 回写 artists.stage（outreach→engaged），供 ShopOutreach 看接触进展 ----
    if (status === 'done') {
      try {
        const rows = await d1All(c.env.DB, `SELECT payload FROM automation_tasks WHERE id = ?`, [commandId]).catch(() => [] as any[]);
        const p = rows && rows[0] ? (rows[0] as any).payload : null;
        let handle = '';
        if (typeof p === 'string') { try { handle = (JSON.parse(p) as any).artistHandle || ''; } catch {} }
        else if (p && typeof p === 'object') { handle = (p as any).artistHandle || ''; }
        if (handle) {
          await d1All(c.env.DB, `UPDATE artists SET stage = 'engaged', last_updated = ? WHERE LOWER(ig_handle) = LOWER(?)`, [now, handle]).catch(() => {});
          // 2026-08-07: 同时写入互动时间线，前台可见
          await c.env.DB.prepare(
            `INSERT INTO artist_interactions (bot_id, artist_handle, event_type, detail, created_at) VALUES (?, ?, 'engaged', ?, ?)`
          ).bind(botId, String(handle).replace(/^@/, '').toLowerCase(), JSON.stringify({ commandId }), now).run().catch(() => {});
        }
      } catch {}
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

// ===== Artist interaction timeline（记录 bot 每次互动，前台可见每个 lead 的接触历史） =====
// 2026-08-07: like/comment/follow/dm/follow_back/engaged 等事件写进 artist_interactions，
// 并同步 artists.stage / follow_back_at，使 ShopOutreach 前台能看到互动时间线。
const ensureArtistInteractionTables = async (db: any) => {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS artist_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id TEXT,
      artist_handle TEXT,
      event_type TEXT NOT NULL,
      detail TEXT,
      created_at INTEGER NOT NULL
    )`).run().catch(() => {});
  } catch {}
  try {
    await db.prepare(`ALTER TABLE artists ADD COLUMN follow_back_at INTEGER`).run().catch(() => {});
  } catch {}
};

const STAGE_BY_INTERACTION: Record<string, string> = {
  follow: 'followed',
  follow_back: 'followback',
  dm: 'dm_sent',
  engaged: 'engaged',
  converted: 'converted'
};

app.post('/api/automation/interaction', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const b = await c.req.json();
    const botId = String(b.botId || '').trim();
    const handle = String(b.artistHandle || b.artist_handle || '').replace(/^@/, '').trim().toLowerCase();
    const eventType = String(b.eventType || '').trim();
    if (!eventType) return c.json({ error: 'eventType required' }, 400);
    const detail = b.detail ? (typeof b.detail === 'string' ? b.detail : JSON.stringify(b.detail)) : null;
    const now = Date.now();
    await ensureArtistInteractionTables(c.env.DB);
    if (handle) {
      await c.env.DB.prepare(
        `INSERT INTO artist_interactions (bot_id, artist_handle, event_type, detail, created_at) VALUES (?, ?, ?, ?, ?)`
      ).bind(botId, handle, eventType, detail, now).run().catch(() => {});
      const stage = STAGE_BY_INTERACTION[eventType];
      if (stage) {
        await c.env.DB.prepare(`UPDATE artists SET stage = ?, last_updated = ? WHERE LOWER(ig_handle) = ?`)
          .bind(stage, now, handle).run().catch(() => {});
      }
      if (eventType === 'follow_back') {
        await c.env.DB.prepare(`UPDATE artists SET follow_back_at = ? WHERE LOWER(ig_handle) = ?`)
          .bind(now, handle).run().catch(() => {});
      }
    }
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// ===== Artist interaction timeline (READ, public) =====
// 2026-08-09: 前台 InkFlowOutreach「互动时间线」读取每个 lead 的接触历史 + 分诊标签，
// 把 bot 写进 artist_interactions 的数据反向指导 DM（谁回关→可发DM、谁沉睡→停放）。
app.get('/api/automation/interaction-timeline', async (c) => {
  const botId = (c.req.query('botId') || 'bot_ig_01').trim();
  const days = Math.min(180, Math.max(1, Number(c.req.query('days') || 90)));
  const since = Date.now() - days * 86400_000;
  const DORMANT_DAYS = 30; // 未回关且超过此天数无互动 → 沉睡停放
  try {
    const rows = await c.env.DB.prepare(
      `SELECT id, artist_handle, event_type, detail, created_at
       FROM artist_interactions
       WHERE bot_id = ? AND created_at >= ?
       ORDER BY artist_handle, created_at DESC`
    ).bind(botId, since).all();
    const map: Record<string, any> = {};
    for (const r of (rows.results || []) as any) {
      const h = r.artist_handle;
      if (!map[h]) map[h] = { handle: h, events: [], followedAt: null, followBackAt: null, dmSentAt: null, lastEventAt: 0 };
      map[h].events.push({ eventType: r.event_type, detail: r.detail, createdAt: r.created_at });
      map[h].lastEventAt = Math.max(map[h].lastEventAt, r.created_at);
      if (r.event_type === 'follow' && !map[h].followedAt) map[h].followedAt = r.created_at;
      if (r.event_type === 'follow_back' && !map[h].followBackAt) map[h].followBackAt = r.created_at;
      if (r.event_type === 'dm' && !map[h].dmSentAt) map[h].dmSentAt = r.created_at;
    }
    const list = Object.values(map).map((a: any) => {
      const hasFollowBack = !!a.followBackAt;
      const ageDays = (Date.now() - a.lastEventAt) / 86400_000;
      let triage: 'dm_ready' | 'active' | 'dormant';
      if (hasFollowBack) triage = 'dm_ready';
      else if (ageDays <= DORMANT_DAYS) triage = 'active';
      else triage = 'dormant';
      const counts: Record<string, number> = {};
      for (const e of a.events) counts[e.eventType] = (counts[e.eventType] || 0) + 1;
      return {
        handle: a.handle,
        triage,
        followedAt: a.followedAt,
        followBackAt: a.followBackAt,
        dmSentAt: a.dmSentAt,
        lastEventAt: a.lastEventAt,
        eventCounts: counts,
        events: a.events.slice(0, 50),
      };
    });
    list.sort((x: any, y: any) => Number(y.followBackAt || y.lastEventAt) - Number(x.followBackAt || x.lastEventAt));
    return c.json({ ok: true, botId, days, total: list.length, leads: list });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// ===== Funnel 聚合（只读，供实验/监控测量 like->follow->follow_back->dm 转化） =====
app.get('/api/automation/funnel', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  const botId = (c.req.query('botId') || 'bot_ig_01').trim();
  const days = Math.min(120, Math.max(1, Number(c.req.query('days') || 30)));
  const since = Date.now() - days * 86400_000;
  try {
    const rows = await c.env.DB.prepare(
      `SELECT event_type, COUNT(*) as cnt FROM artist_interactions
       WHERE bot_id = ? AND created_at >= ? GROUP BY event_type`
    ).bind(botId, since).all();
    const eventCounts: Record<string, number> = {};
    for (const r of (rows.results || []) as any) eventCounts[r.event_type] = Number(r.cnt || 0);

    const uniq = async (ev: string) => {
      const r = await c.env.DB.prepare(
        `SELECT COUNT(DISTINCT artist_handle) as c FROM artist_interactions
         WHERE bot_id = ? AND event_type = ? AND created_at >= ?`
      ).bind(botId, ev, since).all();
      return Number(((r.results || []) as any)[0]?.c || 0);
    };
    const followedUnique = await uniq('follow');
    const followBackUnique = await uniq('follow_back');
    const dmUnique = await uniq('dm');

    const pct = (a: number, b: number) => (b > 0 ? +((a / b) * 100).toFixed(1) : null);
    return c.json({
      ok: true, botId, days,
      eventCounts,
      followedUnique, followBackUnique, dmUnique,
      conv: {
        follow_to_followback: pct(followBackUnique, followedUnique),
        followback_to_dm: pct(dmUnique, followBackUnique),
      },
    });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// ===== Retry failed tasks（把 status='failed' 的任务重置为 pending，供 VPS bot 重新认领） =====
// 2026-08-07: 之前因 bot 登出/超时失败的 860 个任务，调用本接口即可重新进入队列。
app.post('/api/automation/tasks/retry-failed', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const b = (await c.req.json().catch(() => ({}))) || {};
    const olderThanHours = Number(b.olderThanHours || 0);
    let sql = `UPDATE automation_tasks SET status = 'pending', leased_by = NULL, lease_until = NULL, error_reason = NULL WHERE status = 'failed'`;
    const binds: any[] = [];
    if (olderThanHours > 0) {
      sql += ` AND updated_at < ?`;
      binds.push(Date.now() - olderThanHours * 3600_000);
    }
    const res = await c.env.DB.prepare(sql).bind(...binds).run().catch((e: any) => ({ error: String(e?.message || e) }));
    return c.json({ ok: true, info: res });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 200) }, 500);
  }
});

// ===== Bot 1?2����y?Y��?���� (called by bot-worker after each profile) =====
app.post('/api/bot/observe', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const body = await c.req.json();
    const botId = String(body.botId || '').trim();
    const artistHandle = String(body.artistHandle || body.artist_handle || '').replace(/^@/, '').trim();
    const mode = String(body.mode || '').trim();
    const commandId = String(body.commandId || body.command_id || '');
    if (!botId || !mode) return c.json({ error: 'botId and mode required' }, 400);
    const ts = Date.now();
    const sql = d1Sql(c.env.DB);
    // Ensure table exists
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
        // Update fields
        if (pf.followers != null) await d1All(c.env.DB, `UPDATE artists SET followers = $1 WHERE LOWER(ig_handle) = $2`, [Number(pf.followers), artistHandle]).catch(() => {});
        if (pf.following != null) await d1All(c.env.DB, `UPDATE artists SET "following" = $1 WHERE LOWER(ig_handle) = $2`, [Number(pf.following), artistHandle]).catch(() => {});
        if (pf.postCount != null) await d1All(c.env.DB, `UPDATE artists SET post_count = $1 WHERE LOWER(ig_handle) = $2`, [Number(pf.postCount), artistHandle]).catch(() => {});
        if (pf.bio) await d1All(c.env.DB, `UPDATE artists SET bio = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.bio).slice(0, 500), artistHandle]).catch(() => {});
        if (pf.email) await d1All(c.env.DB, `UPDATE artists SET email = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.email), artistHandle]).catch(() => {});
        if (pf.externalUrl) await d1All(c.env.DB, `UPDATE artists SET website = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.externalUrl), artistHandle]).catch(() => {});
        if (pf.category) await d1All(c.env.DB, `UPDATE artists SET category = $1 WHERE LOWER(ig_handle) = $2`, [String(pf.category), artistHandle]).catch(() => {});
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
  try {
    const tables = await c.env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
    const cntRes = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM artists`).first() as any;
    return c.json({ ok: true, engine: 'D1', tables: (tables.results || []).map((t: any) => t.name), artistCount: cntRes?.cnt || 0 });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message });
  }
});

// ===== ?��?��?��2�� Neon ��??�� =====
app.get('/api/automation/neon-check', async (c) => {
  try {
    const tables = await c.env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
    const artistCount = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM artists`).first() as any;
    return c.json({ ok: true, engine: 'D1', tables: (tables.results || []).map((t: any) => t.name), artistCount: artistCount?.cnt || 0 });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message });
  }
});

// ===== 2��?����y?Y��o?��D�� Neon =====

// Bot worker ��?����1?2a��y?Y��? Neon�ꡧ��2?��3??����? {items:[...]}��?
app.all('/api/automation/observations', async (c) => {
  if (c.req.method === 'GET') {
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 20));
    // ?����?��? VPS Express�ꡧ��D����??��y?Yo? summary_json / profile_facts_json��?
    // VPS :3000 已于 2026-06 迁云废弃，数据直接取自 Neon
    // Fallback: Neon
    try {
      const sql = d1Sql(c.env.DB);
      // bot_observations 已由全局 ensureD1Tables 建表（含 summary_json / profile_facts_json）
      const obsRes = await sql`SELECT id, bot_id, COALESCE(artist_handle, '') as artist_handle, mode, COALESCE(summary_json, '{}') as summary_json, COALESCE(profile_facts_json, '{}') as profile_facts_json, created_at FROM bot_observations ORDER BY created_at DESC LIMIT ${limit}`;
      const rows = obsRes?.rows || (Array.isArray(obsRes) ? obsRes : []);
      return c.json({ ok: true, items: rows });
    } catch (e: any) { return c.json({ ok: false, error: e.message, items: [] }, 500); }
  }
  try {
    const body = await c.req.json();
    // ?����?��?2?
    if (body.items && Array.isArray(body.items)) {
      let synced = 0;
      for (const o of body.items) {
        const botId = String(o.botId || o.bot_id || '').trim();
        const ah = String(o.artistHandle || o.artist_handle || '').replace(/^@/, '').trim();
        const mode = String(o.mode || '').trim();
        const ts = Number(o.createdAt || o.created_at || Date.now());
        if (!botId || !mode) continue;
        await d1All(c.env.DB, `INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES ($1, $2, $3, $4)`, [botId, ah || null, mode, ts]);
        synced++;
      }
      return c.json({ ok: true, synced });
    }
    // �̣���?��?����
    const botId = String(body.botId || body.bot_id || '').trim();
    const artistHandle = String(body.artistHandle || body.artist_handle || '').replace(/^@/, '').trim();
    const mode = String(body.mode || '').trim();
    if (!botId || !mode) return c.json({ error: 'botId and mode required' }, 400);
    await d1All(c.env.DB, `INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES ($1, $2, $3, $4)`, [botId, artistHandle || null, mode, Date.now()]);
    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
// ��?3y?����? sync ??��?�ꡧ��?o?2���? POST /observations��?
// app.post('/api/automation/observations/sync', ...) ��?��?3y

// ===== ��y?Y?���?��o2��?�� Neon artists �����ꡧSQL 2?����??��?��3��? =====
app.get('/api/automation/artists', async (c) => {
  try {
    const state = (c.req.query('state') || '').toUpperCase();
    const search = c.req.query('search') || '';
    const ownerAccount = (c.req.query('ownerAccount') || '').trim();
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50')));
    const offset = (page - 1) * limit;
    // 2026-08-22 scheduler 选号：排除 7 天内已有任务的账号（避免造任务被去重跳过）。
    const excludeRecentlyTasked = c.req.query('excludeRecentlyTasked') === '1';

    // Build filter WHERE clause (shared between count + data queries)
    const wheres: string[] = [`ig_handle IS NOT NULL AND ig_handle != ''`];
    if (state) wheres.push(`import_region = '${state.replace(/'/g, "''")}'`);
    if (ownerAccount) wheres.push(`owner_account = '${ownerAccount.replace(/'/g, "''")}'`);
    if (search) {
      const s = search.replace(/'/g, "''");
      wheres.push(`(LOWER(shop_name) LIKE LOWER('%${s}%') OR LOWER(ig_handle) LIKE LOWER('%${s}%') OR LOWER(city) LIKE LOWER('%${s}%'))`);
    }
    const whereClause = wheres.join(' AND ');
    // 排除 7 天窗口内已在 automation_tasks 出现过的 handle（与 tasks/inject 去重一致）
    const dedupJoin = excludeRecentlyTasked
      ? ` AND LOWER(ig_handle) NOT IN (SELECT LOWER(json_extract(payload, '$.artistHandle')) FROM automation_tasks WHERE created_at > ${Date.now() - 7 * 24 * 60 * 60 * 1000} AND json_extract(payload, '$.artistHandle') IS NOT NULL)`
      : '';

    // Count: unique ig_handle only（dedupJoin 排除 7 天内已跑过的）
    const countRows = await d1All(c.env.DB, `SELECT COUNT(*) as cnt FROM (SELECT DISTINCT ig_handle FROM artists WHERE ${whereClause}${dedupJoin}) sub`);
    const total = Number(countRows?.[0]?.cnt || 0);

    // Data: dedup via GROUP BY, then paginate on deduped rows
    const cols = `id, shop_name, ig_handle, city, state, import_region, owner_account, phone, website, rating, followers, reviews, "following", post_count, category`;
    const dataRows = await d1All(c.env.DB,
      `SELECT ${cols} FROM artists WHERE id IN (
        SELECT MIN(id) FROM artists WHERE ${whereClause}${dedupJoin} GROUP BY ig_handle
        ORDER BY MIN(shop_name) ASC LIMIT ${limit} OFFSET ${offset}
      ) ORDER BY shop_name ASC`
    );
    const items = dataRows || [];

    // ��???���䨬? ?a �䨮 D1 o�� Neon o?2��
    let taskStatusMap: Record<string, string> = {};
    let executingIgMap: Record<string, string> = {};
    try {
      const handles = items.map((r: any) => r.ig_handle).filter(Boolean);
      if (handles.length > 0) {
        // D1 (?����y?Y)
        const tasks = await c.env.DB.prepare(
          `SELECT DISTINCT json_extract(payload, '$.artistHandle') as handle, status, json_extract(payload, '$.targetBotId') as targetBotId FROM automation_tasks
           WHERE json_extract(payload, '$.artistHandle') IN (${handles.map(() => '?').join(',')})
           AND status IN ('pending','leased','done','failed')`
        ).bind(...handles).all();
        for (const t of (tasks.results || []) as any) {
          if (t.handle && !taskStatusMap[t.handle]) taskStatusMap[t.handle] = t.status;
          if (t.handle && !executingIgMap[t.handle] && t.targetBotId) executingIgMap[t.handle] = t.targetBotId;
        }
        // Neon (D?��y?Y��??2?? D1 ?D1y������? pending ���䨬?)
        try {
          const connStr = c.env.NEON_DATABASE_URL;
          if (connStr) {
            const sql = d1Sql(c.env.DB);
            const handleList = handles.map(h => `'${h.replace(/'/g, "''")}'`).join(',');
            const neoRows = await d1All(c.env.DB,
              `SELECT DISTINCT json_extract(payload, '$.artistHandle') as handle, status, json_extract(payload, '$.targetBotId') as targetBotId FROM automation_tasks
               WHERE json_extract(payload, '$.artistHandle') IN (${handleList})
               AND status IN ('pending','leased','done','failed')`
            );
            for (const r of (neoRows || [])) {
              if (r.handle) taskStatusMap[r.handle] = r.status;
              if (r.handle && !executingIgMap[r.handle] && (r as any).targetBotId) executingIgMap[r.handle] = (r as any).targetBotId;
            }
          }
        } catch {}
      }
    } catch {}

    return c.json({
      ok: true,
      items: items.map((r: any) => ({ ...r, taskStatus: taskStatusMap[r.ig_handle] || null, executingIg: executingIgMap[r.ig_handle] || null })),
      total, page, limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      hasMore: items.length >= limit,
    });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});

// ===== �䨮 artists ���?����???�ꡧ?����?2��?������?a subrequest ��??T��? =====
// ===== DELETE /api/artists/delete — 人工删选：从 artists 池移除指定 artist =====
// 按 ig_handle（推荐，与列表去重键一致，会清掉该 handle 全部重复行）或 id 删除。
// 鉴权：不在 PUBLIC_PATHS，走全局 Firebase Bearer 中间件。
app.post('/api/artists/delete', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as any;
    const ownerAccount = (body?.ownerAccount || '').trim();
    const handles: string[] = Array.isArray(body?.handles)
      ? body.handles.map((h: any) => String(h ?? '').replace(/^@/, '').trim().toLowerCase()).filter(Boolean)
      : [];
    const ids: number[] = Array.isArray(body?.ids)
      ? body.ids.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
      : [];
    if (!handles.length && !ids.length) {
      return c.json({ error: 'handles or ids required' }, 400);
    }
    let deleted = 0;
    if (handles.length) {
      let sql = `DELETE FROM artists WHERE LOWER(ig_handle) IN (${handles.map(() => '?').join(',')})`;
      const binds: any[] = [...handles];
      if (ownerAccount) { sql += ` AND owner_account = ?`; binds.push(ownerAccount); }
      const res: any = await c.env.DB.prepare(sql).bind(...binds).run();
      deleted += (res?.meta?.changes ?? res?.changes ?? 0);
    }
    if (ids.length) {
      let sql = `DELETE FROM artists WHERE id IN (${ids.map(() => '?').join(',')})`;
      const binds: any[] = [...ids];
      if (ownerAccount) { sql += ` AND owner_account = ?`; binds.push(ownerAccount); }
      const res: any = await c.env.DB.prepare(sql).bind(...binds).run();
      deleted += (res?.meta?.changes ?? res?.changes ?? 0);
    }
    return c.json({ ok: true, deleted, handles: handles.length, ids: ids.length });
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});

// ===== 用于 artists 批量建任务（create-from-artists）subrequest =====
app.post('/api/automation/tasks/create-from-artists', async (c) => {
  try {
    const { artistIds, taskType = 'ig_browse' } = await c.req.json();
    if (!artistIds?.length) return c.json({ error: 'artistIds required' }, 400);
    const ts = Date.now();
    const dedupWindow = ts - 7 * 24 * 60 * 60 * 1000;

    const sql = d1Sql(c.env.DB);
    // �������������??��
    await sql`CREATE TABLE IF NOT EXISTS automation_tasks (id TEXT PRIMARY KEY, payload TEXT, status TEXT, run_at BIGINT, lease_until BIGINT, leased_by TEXT, attempts INT DEFAULT 0, max_attempts INT DEFAULT 3, error_reason TEXT, created_at BIGINT, updated_at BIGINT)`.catch(() => {});

    // ?����?2��?��?����D artist�ꡧ1��?��?
    const ids = artistIds.filter((i: any) => String(i).trim().length > 0);
    if (!ids.length) return c.json({ ok: false, error: 'no valid ids' }, 400);
    const idList = ids.map((i: any) => `'${String(i).replace(/'/g, "''")}'`).join(',');
    const artistRows = await d1All(c.env.DB, `SELECT id, shop_name, ig_handle, city, state, country, location FROM artists WHERE id IN (${idList})`);
    const artists = artistRows || [];
    if (!artists.length) return c.json({ ok: false, error: 'no artists found' }, 404);

    // ?����?2����?��D��???�ꡧ7 ����?����?o?���䨬???��?1y��?o? done��?
    const handles = artists.map((a: any) => a.ig_handle || a.shop_name).filter(Boolean);
    let existingRows: any[] = [];
    if (handles.length) {
      const handleList = handles.map((h: string) => `'${h.replace(/'/g, "''")}'`).join(',');
      existingRows = await d1All(c.env.DB, `SELECT json_extract(payload, '$.artistHandle') as h FROM automation_tasks WHERE json_extract(payload, '$.artistHandle') IN (${handleList}) AND updated_at > ${dedupWindow}`);
    }
    const existingSet = new Set((existingRows || []).map((r: any) => r.h || '').filter(Boolean));

    let created = 0, skipped = 0;
    const taskIds: string[] = [], payloads: string[] = [], runAts: number[] = [];
    for (const a of artists) {
      const h = a.ig_handle || a.shop_name || '';
      if (existingSet.has(h)) { skipped++; continue; }
      taskIds.push('task_' + h + '_' + ts);
      payloads.push(JSON.stringify({
        artistHandle: h,
        shopName: a.shop_name,
        taskType,
        country: a.country || null,
        state: a.state || null,
        city: a.city || null,
      }));
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
  try {
    const { artistHandles, taskType = 'ig_browse', botId = '' } = await c.req.json();
    if (!artistHandles?.length) return c.json({ error: 'artistHandles required' }, 400);
    const ts = Date.now();
    const dedupWindow = ts - 7 * 24 * 60 * 60 * 1000;
    const sql = d1Sql(c.env.DB);
    let created = 0, skipped = 0;

    for (const handle of artistHandles) {
      const h = String(handle || '').replace(/^@/, '').trim().toLowerCase();
      if (!h) continue;

      // 2��??��o7����?����?��?��D��? handle ��?��???
      const existing = await sql`SELECT id FROM automation_tasks WHERE json_extract(payload, '$.artistHandle') = ${h} AND updated_at > ${dedupWindow} LIMIT 1`;
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
  try {
    const sql = d1Sql(c.env.DB);
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
  try {
    const { tasks } = await c.req.json();
    if (!Array.isArray(tasks) || !tasks.length) return c.json({ error: 'tasks array required' }, 400);
    const sql = d1Sql(c.env.DB);
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
          WHERE json_extract(payload, '$.artistHandle') = ${handle}
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
    const ownerUid = String(c.req.query('ownerUid') || c.req.query('owner_uid') || '').trim();
    const sql = d1Sql(c.env.DB);
    let rows;
    if (status && ownerUid) {
      rows = await sql`SELECT id, status, leased_by, payload, error_reason, created_at, updated_at FROM automation_tasks WHERE status = ${status} AND json_extract(payload, '$.owner_uid') = ${ownerUid} ORDER BY created_at DESC LIMIT ${limit}`;
    } else if (status) {
      rows = await sql`SELECT id, status, leased_by, payload, error_reason, created_at, updated_at FROM automation_tasks WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limit}`;
    } else if (ownerUid) {
      rows = await sql`SELECT id, status, leased_by, payload, error_reason, created_at, updated_at FROM automation_tasks WHERE json_extract(payload, '$.owner_uid') = ${ownerUid} ORDER BY created_at DESC LIMIT ${limit}`;
    } else {
      rows = await sql`SELECT id, status, leased_by, payload, error_reason, created_at, updated_at FROM automation_tasks ORDER BY created_at DESC LIMIT ${limit}`;
    }
    const tasks = (rows?.rows || rows || []).map((t: any) => {
      let payload: any = {};
      try { payload = typeof t.payload === 'string' ? JSON.parse(t.payload) : (t.payload || {}); } catch {}
      return { id: t.id, status: t.status, artistHandle: payload.artistHandle || '', ownerUid: payload.owner_uid || '', targetBotId: payload.targetBotId || '', leasedBy: t.leased_by, errorReason: t.error_reason, createdAt: t.created_at, updatedAt: t.updated_at };
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
  try {
    const sql = d1Sql(c.env.DB);
    const dedupWindow = Date.now() - 7 * 24 * 60 * 60 * 1000;
    // ��?3y pending ��???��??? handle ��?��D done/leased ��????�� dedup ���?��?��
    const result = await sql`
      DELETE FROM automation_tasks
      WHERE status = 'pending'
        AND EXISTS (
          SELECT 1 FROM automation_tasks d
          WHERE d.status IN ('done','leased')
            AND d.updated_at > ${dedupWindow}
            AND json_extract(d.payload, '$.artistHandle') = json_extract(automation_tasks.payload, '$.artistHandle')
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
  try {
    const sql = d1Sql(c.env.DB);
    const delPending = (await c.env.DB.prepare(`DELETE FROM automation_tasks WHERE status = 'pending'`).run()).changes || 0;
    const delLeased = (await c.env.DB.prepare(`DELETE FROM automation_tasks WHERE status = 'leased'`).run()).changes || 0;
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
  try {
    const sql = d1Sql(c.env.DB);
    const now = Date.now();
    const dedupWindow = now - 7 * 24 * 60 * 60 * 1000;

    // 1. Total pending count
    const totalPending = await sql`SELECT COUNT(*) as cnt FROM automation_tasks WHERE status = 'pending'`;
    const pendingCount = Number(totalPending?.[0]?.cnt || 0);

    // 2. Pending with run_at <= now
    const readyPending = await sql`SELECT COUNT(*) as cnt FROM automation_tasks WHERE status = 'pending' AND run_at <= ${now}`;
    const readyCount = Number(readyPending?.[0]?.cnt || 0);

    // 3. Pending where handle already done in dedup window
    const dedupBlocked = await sql`SELECT COUNT(*) as cnt FROM automation_tasks t WHERE status = 'pending' AND EXISTS (SELECT 1 FROM automation_tasks d WHERE d.status = 'done' AND d.updated_at > ${dedupWindow} AND json_extract(d.payload, '$.artistHandle') = json_extract(t.payload, '$.artistHandle'))`;
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
          AND (json_extract(payload, '$.artistHandle') IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM automation_tasks d
              WHERE d.id != automation_tasks.id
                AND d.status IN ('pending','leased') AND d.updated_at > ${dedupWindow}
                AND json_extract(d.payload, '$.artistHandle') = json_extract(automation_tasks.payload, '$.artistHandle')
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
  try { await db.prepare(```CREATE TABLE IF NOT EXISTS content_packages (
    id TEXT PRIMARY KEY, idea_id TEXT, title TEXT NOT NULL,
    platform TEXT DEFAULT 'Instagram', content_type TEXT DEFAULT 'Reel',
    product TEXT, caption TEXT, hashtags TEXT,
    media_type TEXT, media_blob TEXT,
    status TEXT DEFAULT 'draft', created_at INTEGER, updated_at INTEGER
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

// ============ CONTENT PACKAGES (选题 → Package → 审核 → 队列 → 发布) ============

// GET /api/content/packages — list all packages
app.get('/api/content/packages', async (c) => {
  await ensureOppTables(c.env.DB);
  const { results } = await c.env.DB.prepare('SELECT * FROM content_packages ORDER BY created_at DESC LIMIT 100').all();
  return c.json({ packages: results });
});

// POST /api/content/packages — create a package (optionally from a brief via idea_id)
app.post('/api/content/packages', async (c) => {
  await ensureOppTables(c.env.DB);
  const body: any = await c.req.json();
  const id = 'pkg-' + Date.now().toString(36);
  const now = Date.now();
  await c.env.DB.prepare(```INSERT INTO content_packages (id,idea_id,title,platform,content_type,product,caption,hashtags,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)```)
    .bind(id, body.idea_id || '', body.title, body.platform || 'Instagram',
      body.content_type || 'Reel', body.product || '', body.caption || '',
      body.hashtags || '', body.status || 'draft', now, now).run();
  return c.json({ ok: true, id });
});

// PUT /api/content/packages/:id — update status or fields (draft→review→approved→queued→published)
app.put('/api/content/packages/:id', async (c) => {
  await ensureOppTables(c.env.DB);
  const { id } = c.req.param();
  const body: any = await c.req.json();
  const fields = ['title','platform','content_type','product','caption','hashtags','media_type','media_blob','status'];
  const sets = fields.filter(f => body[f] !== undefined).map(f => f + ' = ?');
  sets.push('updated_at = ?');
  if (sets.length === 1) return c.json({ ok: false });
  const vals = fields.filter(f => body[f] !== undefined).map(f => body[f]);
  await c.env.DB.prepare(`UPDATE content_packages SET ` + sets.join(',') + ' WHERE id = ?').bind(...vals, Date.now(), id).run();
  return c.json({ ok: true });
});

// DELETE /api/content/packages/:id
app.delete('/api/content/packages/:id', async (c) => {
  await ensureOppTables(c.env.DB);
  const { id } = c.req.param();
  await c.env.DB.prepare(`DELETE FROM content_packages WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

// POST /api/content/packages/:id/media — upload media (base64) for a package
app.post('/api/content/packages/:id/media', async (c) => {
  await ensureOppTables(c.env.DB);
  const { id } = c.req.param();
  const body: any = await c.req.json();
  await c.env.DB.prepare(`UPDATE content_packages SET media_type = ?, media_blob = ?, updated_at = ? WHERE id = ?`)
    .bind(body.media_type || 'image/png', body.media_blob || '', Date.now(), id).run();
  return c.json({ ok: true });
});

// POST /api/content/packages/:id/generate-caption — AI caption from title/product (template-based; DeepSeek-ready)
app.post('/api/content/packages/:id/generate-caption', async (c) => {
  await ensureOppTables(c.env.DB);
  const { id } = c.req.param();
  const pkg = await c.env.DB.prepare('SELECT * FROM content_packages WHERE id = ?').bind(id).first() as any;
  if (!pkg) return c.json({ error: 'not_found' }, 404);
  const product = pkg.product || pkg.title || 'our premium PMU cartridge';
  const title = pkg.title || product;
  // Template-based caption (DeepSeek API can replace this later; Worker has no AI key yet)
  const caption = `${title}.\n\nPrecision matters when it's permanent. Our ${product} is individually sterilized and sealed — consistent performance, zero compromise. Trust your work to tools that don't let you down.\n\nDM for details / wholesale pricing.`;
  await c.env.DB.prepare(`UPDATE content_packages SET caption = ?, updated_at = ? WHERE id = ?`).bind(caption, Date.now(), id).run();
  return c.json({ ok: true, caption });
});

// DELETE /api/content/briefs/:id — delete a brief (was missing)
app.delete('/api/content/briefs/:id', async (c) => {
  await ensureOppTables(c.env.DB);
  const { id } = c.req.param();
  await c.env.DB.prepare(`DELETE FROM content_briefs WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

// ============ CRM ARTISTS (Neon primary source, proxied via Pages Function) ============
// Called same-origin from the browser (harvests.pages.dev/api/artists) WITHOUT a Firebase
// token, so both paths are whitelisted in PUBLIC_PATHS. The Pages Function proxies
// /api/* -> this Worker, keeping traffic Cloudflare->Cloudflare (GFW-safe, no CORS).

// GET /api/artists — full list from Neon, used to populate the CRM dashboard
app.get('/api/artists', async (c) => {
  try {
    const limit = Math.min(5000, Math.max(1, parseInt(c.req.query('limit') || '5000')));
    const rows = await d1All(c.env.DB, `SELECT * FROM artists ORDER BY shop_name ASC LIMIT ${limit}`);
    return c.json(rows || []);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// POST /api/artists/bulk-import — upsert artists from a CSV import (best-effort, per-row safe)
const ARTIST_WHITELIST = ['shop_name','ig_handle','city','state','import_region','phone','website','email','rating','followers','reviews','category','full_name','address','profile_pic','conversion_score','country','owner_account'];
app.post('/api/artists/bulk-import', async (c) => {
  try {
    const { rows, importRegion, defaultCountry = 'USA', ownerAccount } = await c.req.json();
    if (!Array.isArray(rows) || rows.length === 0) return c.json({ ok: true, inserted: 0, updated: 0 });
    let inserted = 0, updated = 0;
    for (const r of rows) {
      try {
        const igRaw = String(r.ig_handle || '').replace(/^@/, '').trim();
        const ig = igRaw.toLowerCase();
        const shop = String(r.shop_name || '').trim();
        if (!ig && !shop) continue;
        let existing: any[] = [];
        if (ig) existing = await d1All(c.env.DB, `SELECT id FROM artists WHERE LOWER(ig_handle) = $1`, [ig]);
        if ((!existing || existing.length === 0) && shop) existing = await d1All(c.env.DB, `SELECT id FROM artists WHERE LOWER(shop_name) = $1`, [shop.toLowerCase()]);

        const cols: string[] = [];
        const vals: any[] = [];
        const norm: any = { ...r };
        norm.import_region = r.import_region || importRegion;
        norm.country = r.country || defaultCountry;
        norm.owner_account = r.owner_account || ownerAccount || 'raiha8833';
        for (const k of ARTIST_WHITELIST) {
          if (norm[k] === undefined || norm[k] === null || norm[k] === '') continue;
          cols.push(k); vals.push(norm[k]);
        }
        if (ig && !cols.includes('ig_handle')) { cols.push('ig_handle'); vals.push(ig); }
        if (!ig && shop && !cols.includes('shop_name')) { cols.push('shop_name'); vals.push(shop); }
        if (cols.length === 0) continue;

        if (existing && existing.length) {
          const setClause = cols.map((c2, i) => `${c2} = $${i + 1}`).join(', ');
          await d1All(c.env.DB, `UPDATE artists SET ${setClause} WHERE id = $${cols.length + 1}`, [...vals, existing[0].id]);
          updated++;
        } else {
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
          await d1All(c.env.DB, `INSERT INTO artists (${cols.join(', ')}) VALUES (${placeholders})`, vals);
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

// Deterministic string hash (FNV-1a-ish) for stable per-target rotation.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Pick an active script for a category with per-target ROTATION (方案 A, 防 DM 千篇一律).
// - Same target_handle → always the same variant (stable across retries/re-sends).
// - Different targets → spread across all active variants for that category (no repetition per category).
async function selectBestScript(db: D1Database, category: string, targetHandle: string, _intent?: string): Promise<{ id: number; content: string } | null> {
  let sql = 'SELECT id, content FROM marketing_scripts WHERE active = 1';
  const params: any[] = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY id ASC';
  const { results } = params.length
    ? await db.prepare(sql).bind(...params).all()
    : await db.prepare(sql).all();
  const rows: any[] = results || [];
  if (!rows.length) return null;
  const idx = hashString(targetHandle || 'anon') % rows.length;
  const row = rows[idx];
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
  const categories: any[] = [];
  for (const r of (results || [])) {
    const { results: scripts } = await c.env.DB.prepare(
      `SELECT id, title, content, active, success_rate, usage_count FROM marketing_scripts WHERE active=1 AND category=? ORDER BY success_rate DESC, usage_count DESC`
    ).bind(r.category).all();
    const scriptList = (scripts || []).map((s: any) => {
      const sr = Number(s.success_rate) || 0;
      return {
        id: Number(s.id),
        title: s.title || '(untitled)',
        active: Number(s.active) === 1,
        // success_rate may be stored as 0-1 (fraction) or 0-100 (percent); normalize to percent.
        conversionRate: sr <= 1 ? Math.round(sr * 100) : Math.round(sr),
        // Per-script send/reply/converted counts aren't tracked in the table yet;
        // usage_count is the best available proxy for "times sent".
        taskSentCount: Number(s.usage_count) || 0,
        taskRepliedCount: 0,
        taskConvertedCount: 0,
      };
    });
    const best = scriptList[0] || null;
    categories.push({
      category: r.category,
      scriptCount: Number(r.count) || scriptList.length,
      avgSuccessRate: Math.round((Number(r.avgSuccessRate) || 0) * 100) / 100,
      scripts: scriptList,
      bestScript: best ? { id: best.id, title: best.title, conversionRate: best.conversionRate } : null,
      topScriptTitle: best ? best.title : null,
      recommendedDirection: null,
    });
  }
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
    // 允许调用方直接带文案（bot 回关建任务时自带 scriptContent），优先于 DB 兜底选取。
    let scriptContent: string | null = b.scriptContent ? String(b.scriptContent) : null;
    if (b.scriptId) {
      const sr: any = await c.env.DB.prepare('SELECT id, content FROM marketing_scripts WHERE id = ?').bind(Number(b.scriptId)).first();
      if (sr) { scriptId = Number(sr.id); scriptContent = String(sr.content || ''); }
    }
    if (!scriptContent) {
      const best = await selectBestScript(c.env.DB, category, targetHandle, intent || undefined);
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
    const best = await selectBestScript(c.env.DB, category, b.targetHandle ? String(b.targetHandle) : '', b.intent ? String(b.intent) : undefined);
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

// Shared: sync shipped Shopify orders into inventory_outbounds (idempotent via per-item dedup).
// opts.full = true → ignore the 7-day updated_at window and sweep ALL shipped orders (backfill mode).
// Shared: sync shipped Shopify orders into inventory_outbounds (idempotent via per-item dedup).
// opts.full = true → ignore the 7-day updated_at window and sweep ALL shipped orders (backfill mode).
// opts.sinceId → resume cursor (Shopify order id). opts.maxOrders → hard cap per invocation so a
//   single Worker request NEVER exceeds Cloudflare's request/CPU limit — the full sweep is chunked,
//   the caller loops passing nextSinceId until done=true. (Returning one giant page loop inside one
//   request was getting the Worker killed silently on large stores.)
async function runShopifySync(env: any, opts: { full?: boolean; sinceId?: number; maxOrders?: number } = {}) {
  const config = await env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any;
  if (!config) { console.log('[shopify-sync] not configured'); return { processed: 0, items: 0, skippedNoSku: [] as string[], done: true, nextSinceId: null }; }
  const accessToken = config.api_key;
  let storeDomain = 'dptattoo.myshopify.com';
  if (config.api_base_url) {
    try { storeDomain = new URL(config.api_base_url).hostname; }
    catch { storeDomain = String(config.api_base_url).replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }
  }
  const apiVersion = '2024-10';
  const maxOrders = opts.maxOrders ?? 50;
  let sinceId = opts.sinceId || 0;
  let totalOrders = 0, deductedItems = 0, skippedNoSku: string[] = [];
  let lastProcessedId = sinceId;
  let reachedCap = false;
  while (true) {
    let ordersUrl = `https://${storeDomain}/admin/api/${apiVersion}/orders.json?status=any&fulfillment_status=shipped&limit=250&since_id=${sinceId}`;
    if (!opts.full) {
      // Incremental mode: only orders updated in the last 7 days (efficient for the normal case).
      // NOTE: any shipped order NOT updated in 7+ days is permanently outside this window — use
      // the full-backfill endpoint (POST /api/sync/shopify-orders) to catch that historical backlog.
      ordersUrl += `&updated_at_min=${new Date(Date.now() - 7 * 86400000).toISOString()}`;
    }
    const resp = await fetch(ordersUrl, { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } });
    if (!resp.ok) { console.log('[shopify-sync] Shopify error:', resp.status); break; }
    const orders = ((await resp.json()) as any).orders || [];
    if (orders.length === 0) break;
    for (const order of orders) {
      if (totalOrders >= maxOrders) { reachedCap = true; break; }
      const orderNumber = String(order.order_number || '');
      // Store the human order name "#4737" (NOT the internal numeric Shopify id) so the
      // frontend can display/search it directly. Matches the manual import interface.
      const orderId = String(order.id);
      totalOrders++;
      lastProcessedId = Number(order.id);
      let hadSku = false;
      for (const item of (order.line_items || [])) {
        let sku = (item.sku || item.variant_sku || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
        sku = sku.startsWith('PEACH-') ? sku.slice(6) : sku; // 归一：PEACH- 前缀变体与基 SKU 合并，避免 SKU 翻倍
        if (!sku || item.quantity <= 0) continue;
          hadSku = true;
          // Ensure the parent product exists (inventory_outbounds.product_sku → inventory_products.sku FK).
          // Shopify SKUs may not yet live in the warehouse products table, so create a minimal stub if missing.
          try {
            // [2026-07-31] 不再自动建产品：以 harvests 库存表为准，Shopify 同步只记录出库流水，不污染 products 表。
            const prod = await env.DB.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind(sku).first();
            if (!prod) {
              console.log('[shopify-sync] skip auto-create for unknown SKU', sku, '(records outbound only)');
            }
          } catch (e: any) { console.log('[shopify-sync] stub product ensure failed for', sku, ':', e?.message || e); }
          // Dedup per (order, sku) so a prior partial/mismatched row never blocks a correct re-sync.
          const existing = await env.DB.prepare('SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? AND product_sku = ? LIMIT 1').bind(orderId, sku).first();
        if (existing) continue;
        const prod = await env.DB.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind(sku).first();
        if (!prod) { console.log('[shopify-sync] skip unknown SKU', sku, '(no matching inventory product)'); continue; }
        const note = `Shopify Order #${orderNumber}`;
        try {
          await env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
            .bind(sku, item.quantity, 'B2C', ((order.customer?.firstName || '') + ' ' + (order.customer?.lastName || '')).trim() || order.customer?.email || '', orderId, (order.created_at || '').slice(0, 10), note, Date.now()).run();
          // 写穿扣减：直接减 current_stock（允许为负=超卖预警）
          await env.DB.prepare('UPDATE inventory_products SET current_stock = COALESCE(current_stock,0) - ? WHERE sku = ?').bind(item.quantity, sku).run();
          deductedItems++;
        } catch (e: any) { console.log('[shopify-sync] insert/deduct failed for', sku, ':', e?.message || e); }
      }
      // Gift deduction from notes (统一防重复扣 + 幂等)
      deductedItems += await deductGiftsFromNote(env.DB, order, orderId, orderNumber);
      if (!hadSku) skippedNoSku.push('#' + orderNumber);
    }
    if (reachedCap) break;
    if (orders.length < 250) break; // last page → sweep complete
    sinceId = lastProcessedId;
  }
  const done = !reachedCap;
  console.log('[shopify-sync] chunk:', totalOrders, 'orders,', deductedItems, 'items; done=', done, 'nextSinceId=', done ? null : lastProcessedId, '; skipped(no-sku):', skippedNoSku.join(','));
  return { processed: totalOrders, items: deductedItems, skippedNoSku, done, nextSinceId: done ? null : lastProcessedId };
}

// Manual full backfill — sweeps ALL shipped orders (no 7-day window) to recover missed history
// like #4737/#4738. Auth mirrors the bot endpoints (token=vps-bot-secret-2024).
app.post('/api/sync/shopify-orders', async (c) => {
  const token = c.req.query('token');
  if (token !== 'vps-bot-secret-2024') return c.json({ error: 'unauthorized' }, 401);
  const sinceId = Number(c.req.query('since_id') || 0) || 0;
  try {
    const result = await runShopifySync(c.env, { full: true, sinceId });
    return c.json({ ok: true, ...result });
  } catch (e: any) {
    console.log('[shopify-sync] endpoint error:', e?.message || e, e?.stack || '');
    return c.json({ ok: false, error: e?.message || String(e), stack: e?.stack || '' }, 200);
  }
});

// ============ KB INTAKE（SEO/社媒知识库摄入 + 浏览，DEV-ONLY）============
// 入口：知识采集后台（harvests.pages.dev/#/kb），仅 dev（snow368@gmail.com）可见可操作，
// 不进前台公共 tab。服务端抓 URL 内容 + 规则分类 + 去重 + 存 D1。

let _kbTableReady: Promise<void> | null = null;
const ensureKbTable = (db: any): Promise<void> => {
  if (!_kbTableReady) {
    _kbTableReady = db.prepare(`CREATE TABLE IF NOT EXISTS kb_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kb TEXT NOT NULL,
      platform TEXT,
      dimension TEXT NOT NULL,
      bucket TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      source_url TEXT,
      tags TEXT,
      summary TEXT,
      fingerprint TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run().then(() => {}).catch(() => {});
  }
  return _kbTableReady;
};

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function stripHtml(html: string): string {
  let t = html.replace(/<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  t = t.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n');
  return t.trim();
}

async function fetchExtract(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InkFlowKB/1.0)', 'Accept': 'text/html,application/xhtml+xml,text/plain,*/*' },
    redirect: 'follow',
  });
  if (!resp.ok) throw new Error('fetch_failed ' + resp.status);
  const ct = resp.headers.get('content-type') || '';
  const raw = await resp.text();
  let text = raw;
  if (ct.includes('html') || raw.trimStart().startsWith('<')) text = stripHtml(raw);
  const lines = text.split(/\n+/).map((l: string) => l.trim()).filter(Boolean);
  return lines.join('\n').slice(0, 40000);
}

// 规则分类：根据关键词把文本分到 {kb, platform, dimension}
const KB_RULES: Record<string, { dim: string; kw: string[] }[]> = {
  seo: [
    { dim: 'strategy', kw: ['seo strategy', '排名因素', 'e-a-t', 'eeat', 'topical authority', ' topical ', '搜索策略', 'ranking factor'] },
    { dim: 'keyword', kw: ['keyword', '关键词', '搜素词', '长尾', 'long-tail', 'search volume', '搜索量', '搜索意图'] },
    { dim: 'content', kw: ['content', '内容营销', '博客', '文章', 'brief', '大纲', 'content gap', '内容差距'] },
    { dim: 'technical', kw: ['technical seo', '技术seo', 'core web vitals', 'crawl', '抓取', 'sitemap', 'robots', 'schema', '结构化数据', 'canonical'] },
    { dim: 'link', kw: ['backlink', '外链', 'link building', 'domain authority', ' guest post', '外链建设', '锚文本', 'link juice'] },
    { dim: 'workflow', kw: ['workflow', '流程', 'sop', '自动化', '脚本', 'pipeline', '部署'] },
  ],
  social: [
    { dim: 'strategy', kw: ['内容战略', 'content strategy', '社媒策略', '定位', 'persona', '品牌声量'] },
    { dim: 'hooks', kw: ['hook', '钩子', '开头', '前3秒', '前 3 秒', 'curiosity gap', '好奇缺口', 'hook formula'] },
    { dim: 'platforms', kw: ['算法', 'algorithm', '推荐', 'feed', '平台战术', 'reach', '曝光'] },
    { dim: 'growth', kw: ['涨粉', 'follower', 'growth', '粉丝', '爆款', 'virality', '病毒', 'engagement'] },
    { dim: 'conversion', kw: ['转化', 'conversion', '获客', 'lead', '私信', 'dm', '引流', 'cta', '落地'] },
    { dim: 'analytics', kw: ['analytics', '数据', 'metrics', 'roi', '指标', 'dashboard', 'ab test', 'a/b'] },
  ],
};
const SOCIAL_PLATFORMS: Record<string, string[]> = {
  instagram: ['instagram', 'ig ', 'reels', 'story', 'insta', 'grid'],
  tiktok: ['tiktok', '短视频', 'douyin'],
  x: ['twitter', 'x.com', '推特', 'x 平台', 'tweet'],
  xiaohongshu: ['xiaohongshu', '小红书', 'red note', 'xhs', '种草'],
  cross: ['cross-platform', '矩阵', '多平台', '跨平台', 'omni'],
};

function classifyKb(text: string): { kb: string; platform: string | null; dimension: string } {
  const t = ' ' + text.toLowerCase() + ' ';
  // 先判库（seo vs social）
  let seoScore = 0, socialScore = 0;
  for (const r of KB_RULES.seo) for (const k of r.kw) if (t.includes(k.toLowerCase())) seoScore++;
  for (const r of KB_RULES.social) for (const k of r.kw) if (t.includes(k.toLowerCase())) socialScore++;
  const kb = socialScore > seoScore ? 'social' : 'seo';
  // 维度
  let bestDim = KB_RULES[kb][0].dim, bestDimScore = -1;
  for (const r of KB_RULES[kb]) {
    let s = 0; for (const k of r.kw) if (t.includes(k.toLowerCase())) s++;
    if (s > bestDimScore) { bestDimScore = s; bestDim = r.dim; }
  }
  // 平台（仅 social）
  let platform: string | null = null;
  if (kb === 'social') {
    let bestP = '', bestPScore = -1;
    for (const [p, kws] of Object.entries(SOCIAL_PLATFORMS)) {
      let s = 0; for (const k of kws) if (t.includes(k.toLowerCase())) s++;
      if (s > bestPScore) { bestPScore = s; bestP = p; }
    }
    platform = bestP || 'cross';
  }
  return { kb, platform, dimension: bestDim };
}

function requireDev(c: any): any | null {
  const u = c.get('user');
  if (!u || u.email !== 'snow368@gmail.com') return null;
  return u;
}

// 授权账号门禁：snow368 / role=admin / user_permissions 里被授予指定 tab 的账号。
// 用于「知识/内容」类端点——不是所有登录用户都能用，必须被授权过对应板块。
async function requireTab(c: any, tab: string): Promise<any | null> {
  const u = c.get('user');
  if (!u) return null;
  if (u.email === 'snow368@gmail.com') return u;
  try {
    const roleRow = await c.env.DB.prepare('SELECT role FROM users WHERE user_id = ?').bind(u.uid).first() as any;
    if (roleRow?.role === 'admin') return u;
  } catch {}
  try {
    await ensurePermsTable(c.env.DB);
    const row = await c.env.DB.prepare('SELECT tabs FROM user_permissions WHERE email = ?').bind(u.email || '').first() as any;
    if (row) {
      const tabs = JSON.parse(row.tabs || '[]');
      if (Array.isArray(tabs) && tabs.includes(tab)) return u;
    }
  } catch {}
  return null;
}

app.post('/api/kb-intake', async (c) => {
  if (!requireDev(c)) return c.json({ error: 'dev_only' }, 403);
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'bad_json' }, 400); }
  const { url, content, title, kb: kbOv, platform: pOv, dimension: dOv, tags } = body || {};
  let text = (content || '').toString();
  let sourceUrl: string | null = url || null;
  if (!text.trim() && url) {
    try { text = await fetchExtract(url); }
    catch (e: any) { return c.json({ error: 'fetch_failed', detail: String(e?.message || e) }, 502); }
  }
  if (!text || !text.trim()) return c.json({ error: 'empty_content' }, 400);

  const cls = classifyKb(text + ' ' + (title || ''));
  const kb = kbOv || cls.kb;
  const platform = kb === 'social' ? (pOv || cls.platform) : null;
  const dimension = dOv || cls.dimension;
  const bucket = platform ? `${kb}:${platform}:${dimension}` : `${kb}:${dimension}`;
  const fingerprint = await sha256hex(text.trim());
  const summary = (text.trim().split('\n')[0] || '').slice(0, 200);

  await ensureKbTable(c.env.DB);
  const existing = await c.env.DB.prepare('SELECT id FROM kb_entries WHERE fingerprint = ?').bind(fingerprint).first();
  if (existing) return c.json({ ok: true, id: (existing as any).id, status: 'duplicate', classification: { kb, platform, dimension, bucket } });

  const res = await c.env.DB.prepare(
    `INSERT INTO kb_entries (kb, platform, dimension, bucket, title, content, source_url, tags, summary, fingerprint, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?, datetime('now'))`
  ).bind(kb, platform, dimension, bucket, (title || summary.slice(0, 80)), text.trim(), sourceUrl, JSON.stringify(tags || []), summary, fingerprint).run();
  return c.json({ ok: true, id: (res as any).meta?.lastRowId ?? null, status: 'created', classification: { kb, platform, dimension, bucket }, preview: text.trim().slice(0, 300) });
});

app.get('/api/kb', async (c) => {
  // 只读列表仅对「授权账号」开放：snow368 / admin / 被授予 inkflow-outreach tab 的账号。
  // 写操作（/api/kb-intake 入库、DELETE /api/kb/:id 删除）仍 requireDev(snow368) 双重门禁。
  if (!(await requireTab(c, 'inkflow-outreach'))) return c.json({ error: 'not_authorized' }, 403);
  const kb = c.req.query('kb') || null;
  const bucket = c.req.query('bucket') || null;
  const limit = Math.min(parseInt(c.req.query('limit') || '200', 10) || 200, 500);
  await ensureKbTable(c.env.DB);
  const where: string[] = []; const params: any[] = [];
  if (kb) { where.push('kb = ?'); params.push(kb); }
  if (bucket) { where.push('bucket = ?'); params.push(bucket); }
  const sql = `SELECT id, kb, platform, dimension, bucket, title, summary, source_url, tags, created_at FROM kb_entries`
    + (where.length ? ' WHERE ' + where.join(' AND ') : '')
    + ' ORDER BY id DESC LIMIT ?';
  params.push(limit);
  const rows = await c.env.DB.prepare(sql).bind(...params).all();
  const counts = await c.env.DB.prepare('SELECT kb, COUNT(*) as n FROM kb_entries GROUP BY kb').all();
  const buckets = await c.env.DB.prepare('SELECT bucket, COUNT(*) as n FROM kb_entries GROUP BY bucket ORDER BY n DESC').all();
  return c.json({ ok: true, items: (rows as any).results || [], counts: (counts as any).results || [], buckets: (buckets as any).results || [] });
});

// 删除单条已采集知识（dev-only 双重门禁，与 intake/list 一致）。
app.delete('/api/kb/:id', async (c) => {
  if (!requireDev(c)) return c.json({ error: 'dev_only' }, 403);
  const id = parseInt(c.req.param('id') || '', 10);
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: 'bad_id' }, 400);
  await ensureKbTable(c.env.DB);
  const existing = await c.env.DB.prepare('SELECT id FROM kb_entries WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'not_found' }, 404);
  await c.env.DB.prepare('DELETE FROM kb_entries WHERE id = ?').bind(id).run();
  return c.json({ ok: true, id });
});

// ============ COMMENT CORPUS（IG 公开评论语料库：采集上报 + 前台审核）============
// 链路：VPS bot 采集公开评论 → POST /api/corpus/ingest 上报 → 前台 #/corpus 审核
//       (pending→approved/rejected) → 已 approved 语料供评论生成检索增强。
// 匿名化：只存文本/语言/标签，不存用户名/主页 URL/DM。

let _corpusTableReady: Promise<void> | null = null;
const ensureCorpusTable = (db: any): Promise<void> => {
  if (!_corpusTableReady) {
    _corpusTableReady = db.prepare(`CREATE TABLE IF NOT EXISTS comment_corpus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      source_hash TEXT,
      handle TEXT,
      lang TEXT DEFAULT 'en',
      image_tags TEXT,
      comment_tags TEXT,
      quality TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )`).run().then(() => {}).catch(() => {});
  }
  return _corpusTableReady;
};

// bot 上报新采集的评论（token 鉴权，幂等：同 source_hash+同文本哈希跳过）。
// 2026-08-21 增强：过滤咨询/问价类噪音（用户反馈：采集的评论很多不能用）。
const CORPUS_BLOCK: RegExp[] = [
  /\bhttps?:\/\//i,
  /(^|\s)@[A-Za-z0-9_.]+\b/i,
  /\b(dm me|send me a dm|check (?:my|our) (?:bio|link)|buy|order|shop now|discount|promo|wholesale|supplier|supplies|appointment|booking|available slot|price|pricing|how much|cost|for sale|quoted|quote|rates?)\b/i,
  /\$\s?\d+/i, // "$10" 问价
  /^(how|what|where|when|which|who|why|can|do|does|is|are|will|would|did|have|has|should|could|any)\b/i, // 疑问句开头（咨询类）
  /^[ \t]*[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]+[ \t]*$/u, // 纯表情
];
const corpusIsBlocked = (t: string): boolean => CORPUS_BLOCK.some((re) => re.test(t.trim()));

app.post('/api/corpus/ingest', async (c) => {
  const auth = c.req.header('Authorization') || '';
  const tokenParam = c.req.query('token') || '';
  const okAuth = auth === 'Bearer vps-bot-secret-2024' || tokenParam === 'vps-bot-secret-2024';
  if (!okAuth) return c.json({ error: 'unauthorized' }, 401);
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'bad_json' }, 400); }
  const comments: any[] = Array.isArray(body?.comments) ? body.comments : [];
  if (!comments.length) return c.json({ ok: true, added: 0, skipped: 0 });
  await ensureCorpusTable(c.env.DB);
  let added = 0; let skipped = 0;
  // 已入库文本哈希集合（幂等去重）
  const existing = await c.env.DB.prepare('SELECT text FROM comment_corpus').all();
  const seen = new Set<string>();
  for (const r of (existing as any).results || []) seen.add(String((r as any).text || '').trim().toLowerCase());
  for (const cm of comments) {
    const text = String(cm?.text || '').replace(/\s+/g, ' ').trim();
    if (text.length < 4) { skipped++; continue; }
    if (corpusIsBlocked(text)) { skipped++; continue; }
    const key = text.toLowerCase();
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    const lang = String(cm?.lang || 'en').slice(0, 8);
    const imageTags = JSON.stringify(Array.isArray(cm?.imageTags) ? cm.imageTags : []);
    const commentTags = JSON.stringify(Array.isArray(cm?.commentTags) ? cm.commentTags : []);
    const handle = String(cm?.handle || '').slice(0, 120);
    const sourceHash = String(cm?.sourceHash || '').slice(0, 40);
    await c.env.DB.prepare(
      `INSERT INTO comment_corpus (text, source_hash, handle, lang, image_tags, comment_tags, quality, created_at)
       VALUES (?,?,?,?,?,?,'pending', datetime('now'))`
    ).bind(text, sourceHash, handle, lang, imageTags, commentTags).run();
    added++;
  }
  return c.json({ ok: true, added, skipped });
});

// 前台列表：按 quality 筛 + 语言/标签统计。登录用户即可读（板块公开，数据按账号/行业隔离后续加）；
// bot-token 也可读（VPS 侧核对）。
app.get('/api/corpus', async (c) => {
  const quality = c.req.query('quality') || null;
  const limit = Math.min(parseInt(c.req.query('limit') || '200', 10) || 200, 500);
  await ensureCorpusTable(c.env.DB);
  const where: string[] = []; const params: any[] = [];
  if (quality) { where.push('quality = ?'); params.push(quality); }
  const sql = `SELECT id, text, source_hash, handle, lang, image_tags, comment_tags, quality, created_at FROM comment_corpus`
    + (where.length ? ' WHERE ' + where.join(' AND ') : '')
    + ' ORDER BY id DESC LIMIT ?';
  params.push(limit);
  const rows = await c.env.DB.prepare(sql).bind(...params).all();
  const counts = await c.env.DB.prepare('SELECT quality, COUNT(*) as n FROM comment_corpus GROUP BY quality').all();
  const langs = await c.env.DB.prepare('SELECT lang, COUNT(*) as n FROM comment_corpus GROUP BY lang ORDER BY n DESC LIMIT 20').all();
  return c.json({ ok: true, items: (rows as any).results || [], counts: (counts as any).results || [], langs: (langs as any).results || [] });
});

// 前台审核：approve（pending→approved，进入正式语料）或 reject（丢弃）。
// 板块公开，审核操作靠前端登录态保护（PUBLIC_PATHS 放行后无 user 上下文，故不 requireTab）。
app.post('/api/corpus/:id/:action', async (c) => {
  const id = parseInt(c.req.param('id') || '', 10);
  const action = c.req.param('action') || '';
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: 'bad_id' }, 400);
  if (action !== 'approve' && action !== 'reject') return c.json({ error: 'bad_action' }, 400);
  await ensureCorpusTable(c.env.DB);
  const quality = action === 'approve' ? 'approved' : 'rejected';
  const res = await c.env.DB.prepare('UPDATE comment_corpus SET quality = ? WHERE id = ?').bind(quality, id).run();
  if (!(res as any).meta?.changes) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true, id, quality });
});

// 统计：approved 语料按标签分布（供评论生成检索增强评估）。bot-token 也可读（总览板用）。
app.get('/api/corpus/stats', async (c) => {
  await ensureCorpusTable(c.env.DB);
  const total = await c.env.DB.prepare('SELECT COUNT(*) as n FROM comment_corpus').first() as any;
  const approved = await c.env.DB.prepare("SELECT COUNT(*) as n FROM comment_corpus WHERE quality='approved'").first() as any;
  const tagRows = await c.env.DB.prepare("SELECT image_tags, comment_tags FROM comment_corpus WHERE quality='approved'").all();
  const tagCount: Record<string, number> = {};
  for (const r of (tagRows as any).results || []) {
    for (const t of [...JSON.parse((r as any).image_tags || '[]'), ...JSON.parse((r as any).comment_tags || '[]')]) {
      tagCount[t] = (tagCount[t] || 0) + 1;
    }
  }
  return c.json({ ok: true, total: (total as any)?.n || 0, approved: (approved as any)?.n || 0, tagCount });
});

// 前台删除单条语料（硬删除，彻底移除）。板块公开，删除靠前端登录态保护。
app.delete('/api/corpus/:id', async (c) => {
  const id = parseInt(c.req.param('id') || '', 10);
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: 'bad_id' }, 400);
  await ensureCorpusTable(c.env.DB);
  const res = await c.env.DB.prepare('DELETE FROM comment_corpus WHERE id = ?').bind(id).run();
  if (!(res as any).meta?.changes) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true, id });
});

// ============ COMMENT DRAFTS（生成的评论草稿：bot 上报 + 前台审核/查看）============
// 链路：bot 生成评论 → POST /api/drafts/ingest 上报 → 前台 #/comment-drafts 查看/审核
//       （approve→posted 候选；reject/delete 丢弃）。草稿含帖子上下文+生成评论+风险标签。

let _draftsTableReady: Promise<void> | null = null;
const ensureDraftsTable = (db: any): Promise<void> => {
  if (!_draftsTableReady) {
    _draftsTableReady = db.prepare(`CREATE TABLE IF NOT EXISTS comment_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id TEXT,
      bot_id TEXT,
      handle TEXT,
      post_url TEXT,
      post_key TEXT,
      proposed_comment TEXT,
      status TEXT DEFAULT 'pending',
      grounding_risks TEXT,
      safe_facts TEXT,
      lang TEXT DEFAULT 'en',
      created_at TEXT DEFAULT (datetime('now'))
    )`).run()
      .then(() => db.prepare('ALTER TABLE comment_drafts ADD COLUMN bot_id TEXT').run().catch(() => {}))
      .then(() => db.prepare('CREATE INDEX IF NOT EXISTS idx_comment_drafts_status_bot ON comment_drafts(status, bot_id)').run().catch(() => {}))
      .then(() => {})
      .catch(() => {});
  }
  return _draftsTableReady;
};

async function requireDraftReviewer(c: any): Promise<any | null> {
  if (!c.get('user')) {
    const auth = c.req.header('Authorization') || '';
    if (auth.startsWith('Bearer ') && auth !== `Bearer ${BOT_SECRET}`) {
      const user = await verifyToken(auth.slice(7));
      if (user) c.set('user', user);
    }
  }
  return requireTab(c, 'inkflow-outreach');
}

// bot 上报新生成的评论草稿（token 鉴权，draft_id 幂等）。
app.post('/api/drafts/ingest', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'unauthorized' }, 401);
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'bad_json' }, 400); }
  const drafts: any[] = Array.isArray(body?.drafts) ? body.drafts : [];
  if (!drafts.length) return c.json({ ok: true, added: 0, skipped: 0 });
  await ensureDraftsTable(c.env.DB);
  let added = 0; let skipped = 0;
  for (const d of drafts) {
    const draftId = String(d?.id || '');
    const comment = String(d?.proposedComment || '').trim();
    if (!draftId || comment.length < 3) { skipped++; continue; }
    const existing = await c.env.DB.prepare('SELECT id FROM comment_drafts WHERE draft_id = ?').bind(draftId).first();
    if (existing) { skipped++; continue; }
    const handle = String(d?.handle || '').slice(0, 120);
    const botId = String(d?.botId || body?.botId || '').slice(0, 120);
    const postUrl = String(d?.postUrl || '').slice(0, 300);
    const postKey = String(d?.postKey || '').slice(0, 100);
    const risks = JSON.stringify(Array.isArray(d?.groundingRisks) ? d.groundingRisks : []);
    const facts = JSON.stringify(Array.isArray(d?.safeFacts) ? d.safeFacts : []);
    const lang = String(d?.lang || 'en').slice(0, 8);
    await c.env.DB.prepare(
      `INSERT INTO comment_drafts (draft_id, bot_id, handle, post_url, post_key, proposed_comment, status, grounding_risks, safe_facts, lang, created_at)
       VALUES (?,?,?,?,?,?,'pending',?,?,?, datetime('now'))`
    ).bind(draftId, botId, handle, postUrl, postKey, comment, risks, facts, lang).run();
    added++;
  }
  return c.json({ ok: true, added, skipped });
});

// 前台列表：按 status 筛。读接口需授权 tab（与 corpus 一致）。
app.get('/api/drafts', async (c) => {
  if (!(await requireDraftReviewer(c))) return c.json({ error: 'not_authorized' }, 403);
  const status = c.req.query('status') || null;
  const limit = Math.min(parseInt(c.req.query('limit') || '200', 10) || 200, 500);
  await ensureDraftsTable(c.env.DB);
  const where: string[] = []; const params: any[] = [];
  if (status) { where.push('status = ?'); params.push(status); }
  const sql = `SELECT id, draft_id, bot_id, handle, post_url, post_key, proposed_comment, status, grounding_risks, safe_facts, lang, created_at FROM comment_drafts`
    + (where.length ? ' WHERE ' + where.join(' AND ') : '')
    + ' ORDER BY id DESC LIMIT ?';
  params.push(limit);
  const rows = await c.env.DB.prepare(sql).bind(...params).all();
  const counts = await c.env.DB.prepare('SELECT status, COUNT(*) as n FROM comment_drafts GROUP BY status').all();
  return c.json({ ok: true, items: (rows as any).results || [], counts: (counts as any).results || [] });
});

// 前台操作草稿：approve（标记可发布）/ reject / delete。板块公开，靠前端登录态保护。
// 注：前端 delete 用 DELETE 方法，故同时注册 DELETE 路由。
app.delete('/api/drafts/:id', async (c) => {
  if (!(await requireDraftReviewer(c))) return c.json({ error: 'not_authorized' }, 403);
  const id = parseInt(c.req.param('id') || '', 10);
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: 'bad_id' }, 400);
  await ensureDraftsTable(c.env.DB);
  const res = await c.env.DB.prepare('DELETE FROM comment_drafts WHERE id = ?').bind(id).run();
  if (!(res as any).meta?.changes) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true, id, action: 'delete' });
});
app.put('/api/drafts/:id', async (c) => {
  if (!(await requireDraftReviewer(c))) return c.json({ error: 'not_authorized' }, 403);
  const id = parseInt(c.req.param('id') || '', 10);
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: 'bad_id' }, 400);
  let body: any = {};
  try { body = await c.req.json(); } catch {}
  const comment = String(body?.proposedComment || '').trim();
  if (comment.length < 3) return c.json({ error: 'comment_too_short' }, 400);
  await ensureDraftsTable(c.env.DB);
  const res = await c.env.DB.prepare('UPDATE comment_drafts SET proposed_comment = ? WHERE id = ? AND status IN (\'pending\', \'approved\')')
    .bind(comment, id).run();
  if (!(res as any).meta?.changes) return c.json({ error: 'not_found_or_locked' }, 404);
  return c.json({ ok: true, id, action: 'edit', proposedComment: comment });
});

// Bot-only claim: atomically reserve one human-approved draft so multiple bot
// workers cannot publish the same comment.
app.post('/api/drafts/claim-approved', async (c) => {
  if (!checkBotToken(c)) return c.json({ error: 'unauthorized' }, 401);
  const body = await c.req.json().catch(() => ({})) as any;
  const botId = String(body?.botId || '').trim();
  await ensureDraftsTable(c.env.DB);
  const row = await c.env.DB.prepare(`
    UPDATE comment_drafts
       SET status = 'publishing'
     WHERE id = (
       SELECT id FROM comment_drafts
        WHERE status = 'approved'
          AND bot_id = ?
        ORDER BY id ASC
        LIMIT 1
     )
     RETURNING id, draft_id, bot_id, handle, post_url, post_key, proposed_comment, status, grounding_risks, safe_facts, lang, created_at
  `).bind(botId).first() as any;
  return c.json({ ok: true, item: row || null });
});

app.post('/api/drafts/:id/:action', async (c) => {
  const rawId = c.req.param('id') || '';
  const action = c.req.param('action') || '';
  if (action !== 'approve' && action !== 'reject' && action !== 'delete' && action !== 'posted' && action !== 'release') return c.json({ error: 'bad_action' }, 400);
  await ensureDraftsTable(c.env.DB);
  if ((action === 'posted' || action === 'release') && !checkBotToken(c)) return c.json({ error: 'unauthorized' }, 401);
  // bot 回写 posted 时用 draft_id 匹配（bot 只知本地 id 而非 D1 数字 id）。
  if (action === 'posted' || action === 'release') {
    const row = await c.env.DB.prepare('SELECT id FROM comment_drafts WHERE draft_id = ? OR id = ?').bind(rawId, rawId).first() as any;
    if (!row) return c.json({ error: 'not_found' }, 404);
    const nextStatus = action === 'posted' ? 'posted' : 'approved';
    const res = await c.env.DB.prepare('UPDATE comment_drafts SET status = ? WHERE id = ? AND status = \'publishing\'')
      .bind(nextStatus, row.id).run();
    if (!(res as any).meta?.changes) return c.json({ error: 'not_in_publishing_state' }, 409);
    return c.json({ ok: true, id: row.id, action, status: nextStatus });
  }
  if (!(await requireDraftReviewer(c))) return c.json({ error: 'not_authorized' }, 403);
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) return c.json({ error: 'bad_id' }, 400);
  if (action === 'delete') {
    const res = await c.env.DB.prepare('DELETE FROM comment_drafts WHERE id = ?').bind(id).run();
    if (!(res as any).meta?.changes) return c.json({ error: 'not_found' }, 404);
    return c.json({ ok: true, id, action });
  }
  const quality = action === 'approve' ? 'approved' : action === 'posted' ? 'posted' : 'rejected';
  let body: any = {};
  try { body = await c.req.json(); } catch {}
  const editedComment = String(body?.proposedComment || '').trim();
  const res = action === 'approve' && editedComment.length >= 3
    ? await c.env.DB.prepare('UPDATE comment_drafts SET proposed_comment = ?, status = ? WHERE id = ?')
      .bind(editedComment, quality, id).run()
    : await c.env.DB.prepare('UPDATE comment_drafts SET status = ? WHERE id = ?').bind(quality, id).run();
  if (!(res as any).meta?.changes) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true, id, action, status: quality });
});



// 前端「InkFlow 获客 → SEO 工具 → 📚 技能知识库 → 技能图谱」读取此端点。
// 数据来自打包进 worker 的 seo-playbooks.json（与 AI Core seo_playbooks 同源）。
// 组件期望 { items: Section[] }，而 JSON 顶层为 { sections, skills, ... }，故映射为 items。
app.get('/api/seo/playbooks', async (c) => {
  // 已从 PUBLIC_PATHS 移除：需有效 Firebase token + 授权（snow368/admin/inkflow-outreach tab）。
  if (!(await requireTab(c, 'inkflow-outreach'))) return c.json({ error: 'not_authorized' }, 403);
  const sections = Array.isArray(seoPlaybooks?.sections) ? seoPlaybooks.sections : [];
  return c.json({ items: sections });
});

// Scheduled cron: sweep ALL shipped Shopify orders in the last 7 days into inventory_outbounds.
// Restored to the long-standing inline logic that "ran fine for a long time" — one scheduled
// invocation processes the ENTIRE window via Link-header pagination (no per-run order cap, which
// previously caused the cron to only ever touch the first ~50 orders and silently miss the rest).
// Idempotent via per-order dedup. Safety: ensure parent product exists (FK) and never let one bad
// row abort the whole batch.
export default {
  fetch: app.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    console.log('[scheduled] triggered at', new Date().toISOString());
    try {
      const config = await env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first() as any;
      if (!config) { console.log('[scheduled] Shopify not configured'); return; }
      const accessToken = config.api_key;
      let storeDomain = 'dptattoo.myshopify.com';
      if (config.api_base_url) {
        try { storeDomain = new URL(config.api_base_url).hostname; }
        catch { storeDomain = String(config.api_base_url).replace(/^https?:\/\//, '').replace(/\/.*$/, ''); }
      }
      const apiVersion = '2024-10';
      // 时间门槛：默认扫最近 7 天；若设了 SHOPIFY_SYNC_FROM，则从该日起扣（不回溯历史）
      // 注意：必须用 updated_at_min（不是 created_at_min），因为发货会更新订单的 updated_at。
      // 用 created_at_min 会漏掉创建日期早于门槛但近期才发货的订单。
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      let minUpdatedAt = sevenDaysAgo;
      try {
        const fromEnv = env.SHOPIFY_SYNC_FROM;
        if (fromEnv) {
          const d = new Date(fromEnv);
          if (!isNaN(d.getTime()) && d.getTime() > new Date(sevenDaysAgo).getTime()) {
            minUpdatedAt = d.toISOString();
          }
        }
      } catch {}
      let ordersUrl = `https://${storeDomain}/admin/api/${apiVersion}/orders.json?status=any&fulfillment_status=shipped&updated_at_min=${minUpdatedAt}&limit=250`;
      let totalOrders = 0, deductedItems = 0;
      while (ordersUrl) {
        const resp = await fetch(ordersUrl, { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } });
        if (!resp.ok) { console.log('[scheduled] Shopify error:', resp.status); break; }
        const payload = await resp.json() as any;
        const orders = payload.orders || [];
        for (const order of orders) {
          const orderNumber = String(order.order_number || '');
          // Store the human order name "#4737" (NOT the internal numeric Shopify id) so the
          // frontend can display/search it directly. Matches the manual import interface.
          // 统一幂等键 = Shopify 内部数字 id（与 webhook 一致），避免两路重复扣
          const orderId = String(order.id);
          totalOrders++;
          const existing = await env.DB.prepare('SELECT id, note FROM inventory_outbounds WHERE shopify_order_id = ? LIMIT 1').bind(orderId).first();
          if (existing) {
            // 备注回填：订单首次抓取时可能无备注，后续 Shopify 补了备注后，下次 cron 自动同步。
            const customerNote = shopifyNoteText(order);
            const newNote = customerNote
              ? `Shopify Order #${orderNumber} | 备注: ${customerNote}`
              : `Shopify Order #${orderNumber}`;
            const oldNote = (existing as any).note || '';
            if (newNote !== oldNote) {
              try {
                await env.DB.prepare('UPDATE inventory_outbounds SET note = ? WHERE shopify_order_id = ?')
                  .bind(newNote, orderId).run();
                console.log('[scheduled] note backfilled for', orderId);
              } catch (e: any) { console.log('[scheduled] note update failed for', orderId, ':', e?.message || e); }
            }
            // 已同步订单：备注可能后续才补全，需补抓赠品（统一防重复扣 + 幂等）
            deductedItems += await deductGiftsFromNote(env.DB, order, orderId, orderNumber);
            continue;
          }
          for (const item of (order.line_items || [])) {
            let sku = (item.sku || item.variant_sku || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
            sku = sku.startsWith('PEACH-') ? sku.slice(6) : sku; // 归一：PEACH- 前缀变体与基 SKU 合并，避免 SKU 翻倍
            if (!sku || item.quantity <= 0) continue;
            const prod = await env.DB.prepare('SELECT sku FROM inventory_products WHERE sku = ?').bind(sku).first();
            if (!prod) {
              console.log('[scheduled] skip unknown SKU', sku, '(no matching inventory product)');
              continue;
            }
          const customerNoteInit = shopifyNoteText(order);
          const note = customerNoteInit
            ? `Shopify Order #${orderNumber} | 备注: ${customerNoteInit}`
            : `Shopify Order #${orderNumber}`;
            try {
              await env.DB.prepare('INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)')
                .bind(sku, item.quantity, 'B2C', ((order.customer?.firstName || '') + ' ' + (order.customer?.lastName || '')).trim() || order.customer?.email || '', orderId, (order.created_at || '').slice(0, 10), note, Date.now()).run();
              // 写穿扣减：直接减 current_stock（允许为负=超卖预警）
              await env.DB.prepare('UPDATE inventory_products SET current_stock = COALESCE(current_stock,0) - ? WHERE sku = ?').bind(item.quantity, sku).run();
              deductedItems++;
            } catch (e: any) { console.log('[scheduled] insert/deduct failed for', sku, ':', e?.message || e); }
          }
          // Gift deduction from notes (统一防重复扣 + 幂等)
          deductedItems += await deductGiftsFromNote(env.DB, order, orderId, orderNumber);
        }
        ordersUrl = null;
        const linkHeader = resp.headers.get('link') || '';
        const relNext = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (relNext) ordersUrl = relNext[1];
      }
      // Rolling retention (user-approved): keep only the newest 5000 outbound rows.
      // Beyond that, old records are physically purged from D1 ("new replaces old").
      // Keep D1 lean: hot inventory data only; bulky/cold data (reviews, chat transcripts,
      // competitor snapshots) goes to R2 later. 2000 rows ≈ 1-2 months of B2C traceability.
      // Currently a no-op at 609 rows; self-manages once we approach 2000.
      try {
        const del = await env.DB.prepare(
          `DELETE FROM inventory_outbounds WHERE id IN (SELECT id FROM inventory_outbounds ORDER BY id DESC LIMIT -1 OFFSET 2000)`
        ).run();
        if (del.meta && del.meta.changes) console.log('[scheduled] retention purged', del.meta.changes, 'old rows');
      } catch (e: any) { console.log('[scheduled] retention cleanup error:', e?.message || e); }
      console.log('[scheduled] done:', totalOrders, 'orders,', deductedItems, 'items');
    } catch (e: any) { console.log('[scheduled] error:', e?.message || e); }
  }
};
