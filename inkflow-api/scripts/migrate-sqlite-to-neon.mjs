/**
 * migrate-sqlite-to-neon.mjs
 * Run ONCE to migrate existing SQLite data to Neon.
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-neon.mjs
 *
 * Requires env vars:
 *   DATABASE_URL=postgres://...  (Neon connection string)
 *   SQLITE_PATH=data/deep_scan_tasks.db  (default)
 */

import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const sqlitePath = process.env.SQLITE_PATH || resolve(__dirname, '..', 'data', 'deep_scan_tasks.db');
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1); }
if (!existsSync(sqlitePath)) { console.error(`SQLite db not found: ${sqlitePath}`); process.exit(1); }

const sqlite = new Database(sqlitePath, { readonly: true });
const pg = neon(dbUrl);

async function migrate(table, mapFn) {
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  if (rows.length === 0) { console.log(`${table}: 0 rows, skip`); return; }

  let ok = 0, fail = 0;
  for (const row of rows) {
    try {
      const mapped = mapFn(row);
      const cols = Object.keys(mapped);
      const vals = Object.values(mapped);
      const placeholders = cols.map((_, i) => `$${i + 1}`);
      await pg(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders.join(',')}) ON CONFLICT DO NOTHING`, vals);
      ok++;
    } catch (e) {
      fail++;
      if (fail <= 3) console.error(`  ${table} row fail:`, e.message);
    }
  }
  console.log(`${table}: ${ok} ok, ${fail} fail (of ${rows.length})`);
}

async function main() {
  console.log('Migrating SQLite → Neon...\n');

  // bot_instances
  await migrate('bot_instances', (r) => ({
    id: r.id, host: r.host || '', version: r.version || '',
    profile: r.profile || null,
    online: r.online || 0,
    last_seen_at: r.last_seen_at || 0,
    created_at: r.created_at || 0,
  }));

  // automation_tasks
  await migrate('automation_tasks', (r) => ({
    id: r.id, payload: typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload),
    status: r.status || 'pending',
    run_at: r.run_at || 0,
    lease_until: r.lease_until || null,
    leased_by: r.leased_by || null,
    attempts: r.attempts || 0,
    max_attempts: r.max_attempts || 3,
    error_reason: r.error_reason || null,
    created_at: r.created_at || 0,
    updated_at: r.updated_at || 0,
  }));

  // bot_observations
  await migrate('bot_observations', (r) => ({
    command_id: r.command_id,
    handle: r.handle,
    summary: r.summary ? (typeof r.summary === 'string' ? r.summary : JSON.stringify(r.summary)) : null,
    facts: r.facts ? (typeof r.facts === 'string' ? r.facts : JSON.stringify(r.facts)) : null,
    created_at: r.created_at || 0,
  }));

  // content_competitors
  await migrate('content_competitors', (r) => ({
    ig_handle: r.ig_handle,
    account_type: r.account_type || 'supply_brand',
    source: r.source || '',
    priority: r.priority || 0,
    notes: r.notes || '',
    category: r.category || '',
    created_at: r.created_at || 0,
    updated_at: r.updated_at || 0,
  }));

  // bot_schedule
  await migrate('bot_schedule', (r) => ({
    id: r.id,
    config: r.config ? (typeof r.config === 'string' ? r.config : JSON.stringify(r.config)) : null,
    state: r.state || 'running',
    updated_at: r.updated_at || 0,
  }));

  console.log('\nDone!');
  sqlite.close();
}

main().catch(console.error);
