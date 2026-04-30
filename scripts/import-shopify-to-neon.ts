import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sql = neon(process.env.NEON_DATABASE_URL!);

// ===== 在这里修改你的Shopify CSV文件路径 =====
const CSV_FILE = 'D:\\MyCrawler_System\\Data\\Shopify\\customers_export 04-10.CSV';
// =============================================

const UID = '6L5jF9zmRvcnyS9SRb559SnasxF3';
const BATCH_SIZE = 100;

interface ShopifyRow {
  'Customer ID': string; 'First Name': string; 'Last Name': string;
  'Email': string; 'Accepts Email Marketing': string; 'Default Address Company': string;
  'Default Address Address1': string; 'Default Address Address2': string; 'Default Address City': string;
  'Default Address Province Code': string; 'Default Address Country Code': string;
  'Default Address Zip': string; 'Default Address Phone': string; 'Phone': string;
  'Accepts SMS Marketing': string; 'Total Spent': string; 'Total Orders': string;
  'Note': string; 'Tax Exempt': string; 'Tags': string; 'sourceType': string;
  'entityType': string; 'importRegion': string;
}

function clean(val: any): string {
  if (typeof val !== 'string') return String(val ?? '');
  return val.replace(/\uFFFD/g, '').trim();
}

async function main() {
  console.log(`正在读取 Shopify CSV 文件: ${CSV_FILE}`);
  const rows: ShopifyRow[] = [];
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(CSV_FILE)
      .pipe(csvParser())
      .on('data', (data: ShopifyRow) => {
        const cleanData: any = {};
        Object.keys(data).forEach(key => {
          const cleanKey = key.replace(/^"+|"+$/g, '').trim();
          cleanData[cleanKey] = data[key];
        });
        rows.push(cleanData);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`读取到 ${rows.length} 行数据`);

  console.log('正在加载现有艺术家数据...');
  const existingArtists = await sql`
    SELECT id, email, phone, shop_name, order_count, total_spent, total_items, dna_tags
    FROM artists WHERE uid = ${UID}
  `;

  const emailIndex = new Map<string, any>();
  const phoneIndex = new Map<string, any>();
  const nameIndex = new Map<string, any>();

  for (const a of existingArtists) {
    if (a.email) emailIndex.set(a.email.toLowerCase().trim(), a);
    if (a.phone) phoneIndex.set(a.phone.replace(/\D/g, ''), a);
    if (a.shop_name) nameIndex.set(a.shop_name.toLowerCase().trim(), a);
  }

  let updatedCount = 0, createdCount = 0, failCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (row, batchIdx) => {
      const index = i + batchIdx;
      try {
        const email = clean(row['Email'] || '').toLowerCase();
        const phone = clean(row['Phone'] || row['Default Address Phone'] || '').replace(/\D/g, '');
        const firstName = clean(row['First Name'] || '');
        const lastName = clean(row['Last Name'] || '');
        const company = clean(row['Default Address Company'] || '');
        const fullName = company || `${firstName} ${lastName}`.trim() || 'Shopify Customer';
        const totalOrders = parseInt(row['Total Orders'] || '0') || 1;
        const totalSpent = parseFloat(row['Total Spent'] || '0') || 0;
        const totalItems = parseInt(row['Note'] || '0') || 0;
        const address = [clean(row['Default Address Address1'] || ''), clean(row['Default Address City'] || ''), clean(row['Default Address Province Code'] || ''), clean(row['Default Address Country Code'] || '')].filter(Boolean).join(', ');
        const city = clean(row['Default Address City'] || '');
        const importRegion = clean(row['importRegion'] || '');
        const country = clean(row['Default Address Country Code'] || 'USA');

        const matchedArtist = email ? emailIndex.get(email) : phone ? phoneIndex.get(phone) : fullName.toLowerCase() !== 'shopify customer' ? nameIndex.get(fullName.toLowerCase()) : undefined;

        if (matchedArtist) {
          const newOrderCount = (matchedArtist.order_count || 0) + totalOrders;
          const newTotalSpent = (matchedArtist.total_spent || 0) + totalSpent;
          await sql`UPDATE artists SET order_count = ${newOrderCount}, total_spent = ${newTotalSpent}, last_order_date = NOW(), stage = 'customers', last_updated = NOW() WHERE id = ${matchedArtist.id}`;
          updatedCount++;
        } else {
          const id = `shopify_${index}_${Date.now()}`;
          const username = email.split('@')[0] || `shopify_user_${index}`;
          await sql`INSERT INTO artists (id, uid, username, full_name, shop_name, stage, order_count, total_spent, location, city, country, last_order_date, customer_tier, last_updated) VALUES (${id}, ${UID}, ${username}, ${fullName}, ${fullName}, 'customers', ${totalOrders}, ${totalSpent}, ${city}, ${city}, ${country}, NOW(), ${totalOrders >= 2 ? 'loyal' : 'new'}, NOW())`;
          createdCount++;
        }
      } catch (e: any) { failCount++; if (failCount <= 10) console.error(`[${index + 1}] 失败: ${e.message?.slice(0, 80)}`); }
    });
    await Promise.all(promises);
    console.log(`进度: ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  const total = await sql`SELECT COUNT(*) as count FROM artists`;
  console.log(`\n✅ 完成！更新: ${updatedCount}, 新建: ${createdCount}, 失败: ${failCount}`);
  console.log(`📊 数据库总记录: ${total[0].count}`);
  process.exit(0);
}

main();
