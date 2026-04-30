import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { processArtistBatchAI } from '../src/lib/gemini';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

dotenv.config({ path: process.cwd() + '/.env' });

const sql = neon(process.env.NEON_DATABASE_URL!);
const BASE = 'http://localhost:3000';
const UID = '6L5jF9zmRvcnyS9SRb559SnasxF3';

async function main() {
  console.log('🚀 开始驱动 Deep Scan（真实 AI 增强）...');

  let latest;
  try {
    const latestRes = await fetch(`${BASE}/api/deep-scan/latest`);
    latest = await latestRes.json();
  } catch (e: any) {
    console.error('❌ 无法连接后端，请确保 npm run dev 已在另一个窗口运行');
    throw e;
  }

  if (!latest || !latest.id) {
    console.log('❌ 没有找到任务，请先在页面上点击一次 DEEP SCAN ALL');
    return;
  }

  const taskId = latest.id;
  console.log(`📋 任务ID: ${taskId}, 当前进度: ${latest.completed}/${latest.total}`);

  while (true) {
    let nextData;
    try {
      const nextRes = await fetch(`${BASE}/api/deep-scan/next/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 3 }),
      });
      nextData = await nextRes.json();
    } catch (e: any) {
      console.warn('获取下一批失败，5秒后重试...', e.message);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    const { artistIds, status } = nextData;
    if (status !== 'running' || artistIds.length === 0) {
      const statusRes = await fetch(`${BASE}/api/deep-scan/status/${taskId}`);
      const finalStatus = await statusRes.json();
      console.log(`✅ 任务结束。状态: ${finalStatus.status}, 完成: ${finalStatus.completed}/${finalStatus.total}`);
      break;
    }

    // 1. 从 Neon 获取这批艺术家的基本信息
    const artistsInfo = await sql`
      SELECT id, username FROM artists WHERE id = ANY(${artistIds})
    `;
    const infoMap = new Map(artistsInfo.map((a: any) => [a.id, a.username]));

    // 2. 调用真实 AI 增强
    const artistInputs = artistIds.map(id => ({
      id,
      username: infoMap.get(id) || `user_${id}`,
      shopName: '', // 如需要可预先查 shop_name，但 AI 会根据 username 推测
      bio: ''
    }));

    let aiResults: Record<string, any> = {};
    try {
      aiResults = await processArtistBatchAI(artistInputs, false);
      console.log(`🤖 AI 增强完成，获取到 ${Object.keys(aiResults).length} 条结果`);
    } catch (e: any) {
      console.error('AI 调用失败，跳过本批', e.message);
      continue;
    }

    // 3. 将 AI 结果写入 Neon（整数化处理）
    for (const id of artistIds) {
      const enriched = aiResults[id];
      if (!enriched) {
        console.warn(`⚠️ AI 未返回 ${id} 的数据，跳过`);
        continue;
      }

      const followers = Math.round(enriched.followers || 0);
      const heatScore = Math.round(
        (followers / 500) + (enriched.postsPerWeek || 0) + ((enriched.avgLikes || 0) / 50)
      );
      const similarityScore = enriched.similarityScore != null ? Math.round(enriched.similarityScore) : 50;
      const activityLevel = enriched.activityLevel || 'medium';
      const style = enriched.style || 'Various';
      const dnaTags = enriched.dnaTags || ['#TattooArtist'];
      const socialSignals = JSON.stringify({
        postingHours: enriched.postingHours || [10, 14, 19],
        postsPerWeek: enriched.postsPerWeek || 0,
        avgLikesPerPost: enriched.avgLikes || 0,
        avgCommentsPerPost: enriched.avgComments || 0,
        engagementRate: enriched.engagementRate || 0,
        followerFollowingRatio: enriched.followerFollowingRatio || 0,
        tattooLikelihood: enriched.tattooLikelihood || 0
      });

      try {
        await sql`
          UPDATE artists SET
            username = ${enriched.realUsername || enriched.username || id},
            followers = ${followers},
            heat_score = ${heatScore},
            similarity_score = ${similarityScore},
            style = ${style},
            activity_level = ${activityLevel},
            dna_tags = ${dnaTags},
            social_signals = ${socialSignals}::jsonb,
            last_updated = NOW()
          WHERE id = ${id} AND uid = ${UID}
        `;
      } catch (e: any) {
        console.warn(`更新 ${id} 失败: ${e.message}`);
      }
    }

    // 4. 带重试的 report 请求
    let retries = 3;
    while (retries > 0) {
      try {
        await fetch(`${BASE}/api/deep-scan/report/${taskId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ successIds: artistIds, failedItems: [] }),
        });
        break;
      } catch (e: any) {
        retries--;
        if (retries === 0) {
          console.error('report 请求多次失败，退出当前批次');
          break;
        }
        console.warn(`report 请求失败，剩余重试 ${retries} 次...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    console.log(`✅ 处理 ${artistIds.length} 个，已写入 Neon`);
  }
  console.log('🎉 全部完成，真实 AI 数据已写入 Neon！');
}

main().catch(err => {
  console.error('脚本异常退出:', err.message);
  console.log('5秒后自动重试...');
  setTimeout(() => main().catch(console.error), 5000);
});