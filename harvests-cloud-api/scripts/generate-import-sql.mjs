// Import JSON data → D1
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TABLES = [
  'order_boxes',
  'carrier_configs',
  'inventory_products',
  'inventory_inbounds',
  'inventory_outbounds',
  'inventory_customers',
  'purchase_orders',
  'purchase_order_items',
  'orders',
  'order_items',
  'shipments',
];

const dataDir = path.resolve(__dirname, '../data');

for (const table of TABLES) {
  const filePath = path.join(dataDir, `${table}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${table}: file not found`);
    continue;
  }

  const rows = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (rows.length === 0) {
    console.log(`⏭️  ${table}: 0 rows (skip)`);
    continue;
  }

  const cols = Object.keys(rows[0]);
  const placeholders = cols.map(() => '?').join(',');
  const colNames = cols.join(',');

  // Build insert SQL
  const valuesSql = rows.map(row => {
    const vals = cols.map(c => {
      const v = row[c];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    return `(${vals.join(',')})`;
  }).join(',\n');

  const sql = `INSERT OR IGNORE INTO ${table} (${colNames}) VALUES\n${valuesSql};`;

  const sqlPath = path.join(dataDir, `import-${table}.sql`);
  fs.writeFileSync(sqlPath, sql);
  console.log(`✅ ${table}: ${rows.length} rows → ${sqlPath}`);
}

console.log('\nSQL files ready in data/ directory.');
console.log('Run: wrangler d1 execute harvests-db --file=data/import-<table>.sql --remote');
console.log('Or combine all files.');
