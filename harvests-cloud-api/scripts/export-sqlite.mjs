// Export SQLite data → JSON files for D1 import
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const dbPath = path.resolve(__dirname, '../../inkflow_harvests/data/deep_scan_tasks.db');

const Database = require('better-sqlite3');
const db = new Database(dbPath);

const TABLES = [
  'inventory_products',
  'inventory_inbounds',
  'inventory_outbounds',
  'inventory_customers',
  'purchase_orders',
  'purchase_order_items',
  'orders',
  'order_items',
  'shipments',
  'order_boxes',
  'carrier_configs',
];

const outDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const table of TABLES) {
  try {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
    console.log(`✅ ${table}: ${rows.length} rows exported`);
  } catch (e) {
    console.log(`❌ ${table}: ${e.message}`);
  }
}

db.close();
console.log('\nDone!');
