import Database from 'better-sqlite3'
import { neon } from '@neondatabase/serverless'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1) }

const sqlitePath = resolve(__dirname, '..', '..', 'inkflow_harvests', 'data', 'deep_scan_tasks.db')
const sqlite = new Database(sqlitePath, { readonly: true })
const pg = neon(dbUrl)

const rows = sqlite.prepare(`SELECT * FROM content_competitors`).all()

console.log(`Found ${rows.length} competitors in SQLite\n`)

let ok = 0, fail = 0, skip = 0
for (const r of rows) {
  try {
    const now = Date.now()
    const handle = String(r.handle || '').replace(/^@/, '').trim().toLowerCase()
    if (!handle) { fail++; continue }

    // Check if already exists by ig_handle
    const [existing] = await pg`SELECT id FROM content_competitors WHERE ig_handle = ${handle} LIMIT 1`
    if (existing) { skip++; continue }

    await pg`
      INSERT INTO content_competitors (ig_handle, account_type, source, priority, notes, category, created_at, updated_at)
      VALUES (${handle}, ${r.account_type || 'supply_brand'}, ${r.source || ''}, 0, ${r.notes || ''}, '', ${now}, ${now})
    `
    ok++
  } catch (e) {
    fail++
    if (fail <= 3) console.error(`  fail row:`, e.message)
  }
}

console.log(`Done: ${ok} imported, ${fail} failed`)
sqlite.close()
