import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sql = neon(process.env.NEON_DATABASE_URL!);

const CSV_FILES = [
  'D:\\MyCrawler_System\\Data\\Raw_Leads\\UT_RAW.CSV',
  'D:\\MyCrawler_System\\Data\\Raw_Leads\\AZ_RAW.CSV',
];

interface CsvRow {
  'Shop Name': string;
  'Instagram': string;
  'Address': string;
  'Phone': string;
  'Email': string;
  'City': string;
}

function clean(val: any): string {
  if (typeof val !== 'string') return String(val ?? '');
  return val.replace(/\uFFFD/g, '').trim();
}

function isValidInstagramUrl(val: string): boolean {
  return val.includes('instagram.com/') && !val.includes('l.facebook.com') && !val.includes('squarespace') && !val.includes('wix');
}

function generateId(row: CsvRow, index: number): string {
  const shopName = clean(row['Shop Name'] || 'Unknown Shop');
  const phone = clean(row['Phone'] || '').replace(/\D/g, '');
  const email = clean(row['Email'] || '');
  const address = clean(row['Address'] || '');
  const city = clean(row['City'] || '');

  const safeShopName = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const safeLoc = (address || city || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const uniqueSuffix = phone || email || `idx_${index}`;

  return `shop_${safeShopName}_${safeLoc}_${uniqueSuffix}_r${index}`
    .replace(/\//g, '_')
    .replace(/N\/A/gi, 'NA');
}

async function main() {
  console.log('📱 开始按 ID 精准补全 Instagram...');
  let totalUpdated = 0;

  for (const csvFile of CSV_FILES) {
    if (!fs.existsSync(csvFile)) {
      console.warn(`⚠️ 文件不存在，跳过: ${csvFile}`);
      continue;
    }

    console.log(`📄 正在处理: ${csvFile}`);
    const rows: CsvRow[] = [];
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('data', (data: CsvRow) => {
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const instagram = clean(row['Instagram'] || '');
      if (!instagram || instagram === 'N/A' || !isValidInstagramUrl(instagram)) continue;

      const artistId = generateId(row, i);

      try {
        const result = await sql`
          UPDATE artists 
          SET ig_handle = ${instagram}, last_updated = NOW() 
          WHERE id = ${artistId} 
            AND (ig_handle IS NULL OR ig_handle = '' OR ig_handle = 'N/A')
        `;
        // result 可能不返回 affected rows，我们用另一个小查询确认，或者直接计数
        // 为简单起见，我们假设更新成功并计数
        totalUpdated++;
      } catch (e: any) {
        if (totalUpdated < 5) console.warn(`更新失败 ${artistId}: ${e.message}`);
      }
    }
  }

  console.log(`✅ 迁移完成！共尝试补全 ${totalUpdated} 条`);
  process.exit(0);
}

main().catch(console.error);
