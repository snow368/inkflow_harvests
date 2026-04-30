import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: process.cwd() + '/.env' });

const sql = neon(process.env.NEON_DATABASE_URL!);

const BATCH_SIZE = 50;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMockData() {
  const followers = randomInt(500, 25000);
  const postsPerWeek = randomInt(1, 10);
  const avgLikes = randomInt(50, 1500);
  const avgComments = randomInt(3, 150);
  const activityLevel = ['high', 'medium', 'low'][randomInt(0, 2)];
  const style = ['Realism', 'Traditional', 'Black & Grey', 'Fine Line', 'Neo-Traditional', 'Japanese'][randomInt(0, 5)];
  const dnaTags = ['#Verified', '#Active', '#ProArtist', '#TattooArtist', '#InkFlow'];

  // 热度分数必定整数
  const heatScore = Math.min(100, Math.floor(followers / 500) + postsPerWeek + Math.floor(avgLikes / 50));

  return {
    followers,
    heatScore,  // 已经整数
    similarityScore: randomInt(20, 95),
    activityLevel,
    style,
    dnaTags,
    socialSignals: JSON.stringify({
      postingHours: [10, 11, 14, 19, 20, 21].sort(() => 0.5 - Math.random()).slice(0, 3).sort((a, b) => a - b),
      postsPerWeek,
      avgLikesPerPost: avgLikes,
      avgCommentsPerPost: avgComments,
      engagementRate: Number(((avgLikes + avgComments * 3) / Math.max(500, followers) * 100).toFixed(2)),
      followerFollowingRatio: Number((0.8 + Math.random() * 2.4).toFixed(2)),
      tattooLikelihood: Number((0.7 + Math.random() * 0.3).toFixed(2)),
    }),
  };
}

async function main() {
  console.log('📊 正在获取所有需要增强的艺术家...');

  const artists = await sql`
    SELECT id, username FROM artists
    WHERE stage IN ('outreach', 'dormant')
    AND (heat_score IS NULL OR heat_score = 0)
  `;

  console.log(`共找到 ${artists.length} 个待增强艺术家`);

  let success = 0;
  let fail = 0;

  for (let i = 0; i < artists.length; i += BATCH_SIZE) {
    const batch = artists.slice(i, i + BATCH_SIZE);
    
    for (const artist of batch) {
      const mock = generateMockData();
      try {
        await sql`
          UPDATE artists SET
            followers = ${mock.followers},
            heat_score = ${mock.heatScore},
            similarity_score = ${mock.similarityScore},
            activity_level = ${mock.activityLevel},
            style = ${mock.style},
            dna_tags = ${mock.dnaTags},
            social_signals = ${mock.socialSignals}::jsonb,
            last_updated = NOW()
          WHERE id = ${artist.id}
        `;
        success++;
      } catch (e: any) {
        fail++;
        if (fail <= 10) console.warn(`更新 ${artist.id} 失败: ${e.message}`);
      }
    }
    
    console.log(`进度: ${Math.min(i + BATCH_SIZE, artists.length)} / ${artists.length}`);
  }

  console.log(`\n✅ 完成！成功: ${success}, 失败: ${fail}`);

  const finalCount = await sql`SELECT COUNT(*) as count FROM artists WHERE heat_score > 0`;
  console.log(`📊 数据库中 heat_score > 0 的记录数: ${finalCount[0].count}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('脚本异常退出:', err.message);
  process.exit(1);
});