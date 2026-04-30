import { neon } from '@neondatabase/serverless';
import { db } from '../src/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 兼容 ESM 环境，获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env 文件
dotenv.config({ path: resolve(__dirname, '../.env') });

const sql = neon(process.env.NEON_DATABASE_URL!);

async function syncArtists(uid: string) {
  console.log('开始同步艺术家数据...');
  const q = query(collection(db, 'artists'), where('uid', '==', uid));
  const snapshot = await getDocs(q);
  
  for (const doc of snapshot.docs) {
    const a = doc.data();
    await sql`
      INSERT INTO artists (id, uid, username, full_name, shop_name, stage, heat_score, similarity_score, dna_tags, followers, order_count, total_spent, location, city, state, country, style, last_interaction_date, last_order_date, is_high_intent)
      VALUES (${a.id}, ${a.uid}, ${a.username || ''}, ${a.fullName || ''}, ${a.shopName || ''}, ${a.stage || 'outreach'}, ${a.heatScore || 0}, ${a.similarityScore || 0}, ${a.dnaTags || []}, ${a.followers || 0}, ${a.orderCount || 0}, ${a.totalSpent || 0}, ${a.location || ''}, ${a.city || ''}, ${a.state || ''}, ${a.country || ''}, ${a.style || ''}, ${a.lastInteractionDate || ''}, ${a.lastOrderDate || ''}, ${a.isHighIntent || false})
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        stage = EXCLUDED.stage,
        heat_score = EXCLUDED.heat_score,
        last_updated = NOW()
    `;
  }
  console.log(`同步了 ${snapshot.size} 条艺术家数据`);
}

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error('请提供你的 Firebase 用户 UID 作为参数');
    console.error('示例: npx tsx scripts/sync-to-neon.ts YOUR_UID');
    process.exit(1);
  }
  await syncArtists(uid);
  console.log('同步完成！');
  process.exit(0);
}

main();