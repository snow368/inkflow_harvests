import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type SocialPlatform = 'instagram' | 'facebook' | 'tiktok';

interface ShopLookupInput {
  id: string;
  shopName?: string;
  website?: string;
  address?: string;
  phone?: string;
}

interface DeepScanTask {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'running' | 'paused' | 'completed';
  total: number;
  batchSize: number;
  pendingIds: string[];
  leasedUntilById: Record<string, number>;
  completedIds: string[];
  failedIds: string[];
  failedReasonById: Record<string, string>;
  retryCountById: Record<string, number>;
  maxRetries: number;
}

interface BotInstancePayload {
  botId: string;
  accountIds: string[];
  host?: string;
  ip?: string;
  version?: string;
  meta?: Record<string, any>;
}

const normalizeFailedReason = (raw?: string): string => {
  const reason = String(raw || '').trim().toLowerCase();
  if (!reason) return 'unknown';
  const allowed = new Set([
    'network',
    'timeout',
    'ai_empty',
    'social_lookup_empty',
    'social_lookup_error',
    'ai_error',
    'firestore_write',
    'unknown'
  ]);
  return allowed.has(reason) ? reason : 'unknown';
};

const SOCIAL_HOSTS: Record<SocialPlatform, string[]> = {
  instagram: ['instagram.com'],
  facebook: ['facebook.com', 'fb.com'],
  tiktok: ['tiktok.com']
};

const fetchText = async (url: string, timeoutMs: number = 8000): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });
    if (!resp.ok) return '';
    return await resp.text();
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
};

const ensureHttp = (url?: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.includes('.')) return `https://${trimmed}`;
  return null;
};

const normalizeSocialUrl = (raw: string): string => {
  try {
    const u = new URL(raw);
    u.hash = '';
    u.search = '';
    return u.toString().replace(/\/+$/, '');
  } catch {
    return raw.trim();
  }
};

const findSocialLinks = (text: string): { instagram: string[]; facebook: string[]; tiktok: string[]; emails: string[]; whatsapp: string[] } => {
  const result = {
    instagram: [] as string[],
    facebook: [] as string[],
    tiktok: [] as string[],
    emails: [] as string[],
    whatsapp: [] as string[]
  };
  if (!text) return result;

  const socialRegex = /https?:\/\/[^\s"'<>]+/gi;
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const waRegex = /(?:wa\.me\/\d+|whatsapp(?:\.com)?\/(?:send|channel)\/?[^\s"'<>]*)/gi;

  const urls = Array.from(new Set((text.match(socialRegex) || []).map(normalizeSocialUrl)));
  urls.forEach((url) => {
    const lower = url.toLowerCase();
    if (SOCIAL_HOSTS.instagram.some((h) => lower.includes(h))) result.instagram.push(url);
    if (SOCIAL_HOSTS.facebook.some((h) => lower.includes(h))) result.facebook.push(url);
    if (SOCIAL_HOSTS.tiktok.some((h) => lower.includes(h))) result.tiktok.push(url);
  });

  result.emails = Array.from(new Set((text.match(emailRegex) || []).map((e) => e.trim().toLowerCase())));
  result.whatsapp = Array.from(new Set((text.match(waRegex) || []).map((w) => w.trim())));
  return result;
};

const pickBest = (links: string[]): string | null => {
  if (!links || links.length === 0) return null;
  const filtered = links.filter((l) => !l.toLowerCase().includes('/share') && !l.toLowerCase().includes('/intent/'));
  return (filtered[0] || links[0]) ?? null;
};

const scoreCandidate = (candidate: string | null, source: 'website' | 'search', shop: ShopLookupInput): number => {
  if (!candidate) return 0;
  let score = source === 'website' ? 0.78 : 0.58;
  const lower = candidate.toLowerCase();
  if (shop.shopName) {
    const key = shop.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (key.length > 3 && lower.includes(key.slice(0, Math.min(8, key.length)))) score += 0.1;
  }
  if (shop.address) {
    const addr = shop.address.toLowerCase();
    if (addr.includes('tattoo')) score += 0.04;
  }
  return Math.min(0.98, score);
};

const buildSearchQueries = (shop: ShopLookupInput): string[] => {
  const base = [shop.shopName, shop.address].filter(Boolean).join(' ');
  if (!base.trim()) return [];
  return [
    `${base} instagram`,
    `${base} facebook`,
    `${base} tiktok`,
    `${base} tattoo studio social media`
  ];
};

const lookupSocialForShop = async (shop: ShopLookupInput) => {
  const merged = {
    instagram: [] as string[],
    facebook: [] as string[],
    tiktok: [] as string[],
    emails: [] as string[],
    whatsapp: [] as string[]
  };

  const websiteUrl = ensureHttp(shop.website);
  if (websiteUrl) {
    const html = await fetchText(websiteUrl, 9000);
    const found = findSocialLinks(html);
    merged.instagram.push(...found.instagram);
    merged.facebook.push(...found.facebook);
    merged.tiktok.push(...found.tiktok);
    merged.emails.push(...found.emails);
    merged.whatsapp.push(...found.whatsapp);
  }

  if (merged.instagram.length === 0 || merged.facebook.length === 0 || merged.tiktok.length === 0) {
    const queries = buildSearchQueries(shop).slice(0, 3);
    for (const q of queries) {
      const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const searchHtml = await fetchText(ddgUrl, 7000);
      if (!searchHtml) continue;
      const found = findSocialLinks(searchHtml);
      if (merged.instagram.length === 0) merged.instagram.push(...found.instagram);
      if (merged.facebook.length === 0) merged.facebook.push(...found.facebook);
      if (merged.tiktok.length === 0) merged.tiktok.push(...found.tiktok);
      merged.emails.push(...found.emails);
      merged.whatsapp.push(...found.whatsapp);
    }
  }

  const instagram = pickBest(Array.from(new Set(merged.instagram)));
  const facebook = pickBest(Array.from(new Set(merged.facebook)));
  const tiktok = pickBest(Array.from(new Set(merged.tiktok)));
  const emails = Array.from(new Set(merged.emails)).slice(0, 5);
  const whatsapp = Array.from(new Set(merged.whatsapp)).slice(0, 3);

  return {
    id: shop.id,
    instagram,
    facebook,
    tiktok,
    emails,
    whatsapp,
    confidence: {
      instagram: scoreCandidate(instagram, instagram && websiteUrl && merged.instagram.includes(instagram) ? 'website' : 'search', shop),
      facebook: scoreCandidate(facebook, facebook && websiteUrl && merged.facebook.includes(facebook) ? 'website' : 'search', shop),
      tiktok: scoreCandidate(tiktok, tiktok && websiteUrl && merged.tiktok.includes(tiktok) ? 'website' : 'search', shop)
    }
  };
};

async function startServer() {
  try {
    console.log('Starting server initialization...');
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const deepScanDb = new Database(path.join(dataDir, 'deep_scan_tasks.db'));
    deepScanDb.pragma('journal_mode = WAL');
    deepScanDb.exec(`
      CREATE TABLE IF NOT EXISTS deep_scan_tasks (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bot_instances (
        bot_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        last_heartbeat_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS automation_tasks (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        run_at INTEGER NOT NULL,
        lease_until INTEGER,
        leased_by TEXT,
        attempts INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        error_reason TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    const BOT_ONLINE_TTL_MS = 60 * 1000;
    const BOT_LEASE_MS = 90 * 1000;
    const BOT_API_KEY = (process.env.BOT_API_KEY || '').trim();

    const toBotPayload = (raw: any): BotInstancePayload => ({
      botId: String(raw?.botId || '').trim(),
      accountIds: Array.isArray(raw?.accountIds)
        ? raw.accountIds.map((x: any) => String(x || '').trim()).filter(Boolean)
        : [],
      host: raw?.host ? String(raw.host) : undefined,
      ip: raw?.ip ? String(raw.ip) : undefined,
      version: raw?.version ? String(raw.version) : undefined,
      meta: raw?.meta && typeof raw.meta === 'object' ? raw.meta : undefined
    });

    const requireBotAuth = (req: express.Request, res: express.Response): boolean => {
      if (!BOT_API_KEY) return true;
      const incoming = String(req.headers['x-bot-key'] || '');
      if (incoming !== BOT_API_KEY) {
        res.status(401).json({ error: 'Invalid bot auth key' });
        return false;
      }
      return true;
    };

    const upsertBot = (payload: BotInstancePayload) => {
      const now = Date.now();
      deepScanDb
        .prepare(`
          INSERT INTO bot_instances (bot_id, payload, status, last_heartbeat_at, updated_at)
          VALUES (?, ?, 'online', ?, ?)
          ON CONFLICT(bot_id) DO UPDATE SET
            payload = excluded.payload,
            status = 'online',
            last_heartbeat_at = excluded.last_heartbeat_at,
            updated_at = excluded.updated_at
        `)
        .run(payload.botId, JSON.stringify(payload), now, now);
    };

    const getBotRow = (botId: string) => {
      return deepScanDb
        .prepare('SELECT bot_id, payload, status, last_heartbeat_at, updated_at FROM bot_instances WHERE bot_id = ?')
        .get(botId) as
        | { bot_id: string; payload: string; status: string; last_heartbeat_at: number; updated_at: number }
        | undefined;
    };

    const getBotOnlineState = (botId: string): { exists: boolean; online: boolean; staleMs: number } => {
      const row = getBotRow(botId);
      if (!row) return { exists: false, online: false, staleMs: Number.MAX_SAFE_INTEGER };
      const staleMs = Date.now() - Number(row.last_heartbeat_at || 0);
      const online = staleMs <= BOT_ONLINE_TTL_MS;
      return { exists: true, online, staleMs };
    };

    const recycleExpiredAutomationLeases = () => {
      const now = Date.now();
      deepScanDb
        .prepare(`
          UPDATE automation_tasks
          SET status = 'pending',
              lease_until = NULL,
              leased_by = NULL,
              updated_at = ?
          WHERE status IN ('leased','running') AND lease_until IS NOT NULL AND lease_until < ?
        `)
        .run(now, now);
      deepScanDb
        .prepare(`
          UPDATE automation_tasks
          SET status = 'failed',
              error_reason = 'max_attempts',
              updated_at = ?
          WHERE status = 'pending' AND attempts >= max_attempts
        `)
        .run(now);
    };

    const loadDeepTask = (taskId: string): DeepScanTask | null => {
      const row = deepScanDb
        .prepare('SELECT payload FROM deep_scan_tasks WHERE id = ?')
        .get(taskId) as { payload: string } | undefined;
      if (!row) return null;
      try {
        return JSON.parse(row.payload) as DeepScanTask;
      } catch {
        return null;
      }
    };

    const saveDeepTask = (task: DeepScanTask) => {
      task.updatedAt = new Date().toISOString();
      deepScanDb
        .prepare(`
          INSERT INTO deep_scan_tasks (id, payload, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            payload = excluded.payload,
            updated_at = excluded.updated_at
        `)
        .run(task.id, JSON.stringify(task), Date.now());
    };

    const gcDeepTasks = () => {
      const ttlMs = 14 * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - ttlMs;
      deepScanDb.prepare('DELETE FROM deep_scan_tasks WHERE updated_at < ?').run(cutoff);
      deepScanDb.prepare('DELETE FROM automation_tasks WHERE updated_at < ? AND status IN (\'done\', \'failed\')').run(cutoff);
      deepScanDb.prepare('DELETE FROM bot_instances WHERE updated_at < ?').run(cutoff);
    };

    gcDeepTasks();

    const getDeepTask = (taskId: string): DeepScanTask | null => {
      const task = loadDeepTask(taskId);
      if (!task) return null;
      let dirty = false;
      if (!task.failedReasonById || typeof task.failedReasonById !== 'object') {
        task.failedReasonById = {};
        dirty = true;
      }
      const now = Date.now();
      const releasedIds = Object.keys(task.leasedUntilById).filter((id) => task.leasedUntilById[id] <= now);
      if (releasedIds.length > 0) {
        releasedIds.forEach((id) => {
          delete task.leasedUntilById[id];
          if (
            !task.pendingIds.includes(id) &&
            !task.completedIds.includes(id) &&
            !task.failedIds.includes(id)
          ) {
            task.pendingIds.push(id);
          }
        });
        dirty = true;
      }
      if (
        task.status === 'running' &&
        task.pendingIds.length === 0 &&
        Object.keys(task.leasedUntilById).length === 0
      ) {
        task.status = 'completed';
        dirty = true;
      }
      if (dirty) saveDeepTask(task);
      return task;
    };

    const toTaskStatus = (task: DeepScanTask) => ({
      failedReasonStats: task.failedIds.reduce((acc: Record<string, number>, id) => {
        const reason = normalizeFailedReason(task.failedReasonById[id]);
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {}),
      failedItemsSample: task.failedIds.slice(0, 200).map((id) => ({
        id,
        reason: normalizeFailedReason(task.failedReasonById[id])
      })),
      id: task.id,
      status: task.status,
      total: task.total,
      completed: task.completedIds.length,
      failed: task.failedIds.length,
      pending: task.pendingIds.length,
      leased: Object.keys(task.leasedUntilById).length,
      updatedAt: task.updatedAt,
      failedIdsSample: task.failedIds.slice(0, 200)
    });

    const getLatestDeepTask = (): DeepScanTask | null => {
      const row = deepScanDb
        .prepare('SELECT id FROM deep_scan_tasks ORDER BY updated_at DESC LIMIT 1')
        .get() as { id: string } | undefined;
      if (!row?.id) return null;
      return getDeepTask(row.id);
    };

    // API Routes
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'InkFlow AI Server is running' });
    });

    app.post('/api/enrich/social-links', async (req, res) => {
      const input = (req.body?.shops || []) as ShopLookupInput[];
      const shops = input.filter((s) => s && s.id).slice(0, 200);
      if (shops.length === 0) {
        return res.status(400).json({ error: 'No valid shops provided' });
      }

      try {
        const results: any[] = [];
        const concurrency = 8;
        for (let i = 0; i < shops.length; i += concurrency) {
          const chunk = shops.slice(i, i + concurrency);
          const chunkResults = await Promise.all(chunk.map(lookupSocialForShop));
          results.push(...chunkResults);
        }
        return res.json({ results });
      } catch (e: any) {
        return res.status(500).json({ error: e?.message || 'Lookup failed' });
      }
    });

    app.post('/api/deep-scan/start', (req, res) => {
      const artistIdsRaw = req.body?.artistIds;
      const batchSizeRaw = Number(req.body?.batchSize);
      const artistIds = Array.isArray(artistIdsRaw)
        ? Array.from(new Set(artistIdsRaw.map((id: any) => String(id)).filter(Boolean)))
        : [];
      if (artistIds.length === 0) {
        return res.status(400).json({ error: 'artistIds is required' });
      }

      const batchSize = Number.isFinite(batchSizeRaw) && batchSizeRaw > 0
        ? Math.min(200, Math.floor(batchSizeRaw))
        : 50;

      const task: DeepScanTask = {
        id: `dscan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'running',
        total: artistIds.length,
        batchSize,
        pendingIds: [...artistIds],
        leasedUntilById: {},
        completedIds: [],
        failedIds: [],
        failedReasonById: {},
        retryCountById: {},
        maxRetries: 2
      };
      saveDeepTask(task);
      return res.json({ taskId: task.id, ...toTaskStatus(task) });
    });

    app.get('/api/deep-scan/status/:taskId', (req, res) => {
      const task = getDeepTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json(toTaskStatus(task));
    });

    app.get('/api/deep-scan/latest', (req, res) => {
      const task = getLatestDeepTask();
      if (!task) return res.status(404).json({ error: 'No deep scan task found' });
      return res.json(toTaskStatus(task));
    });

    app.post('/api/deep-scan/pause/:taskId', (req, res) => {
      const task = getDeepTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      if (task.status === 'running') {
        task.status = 'paused';
        saveDeepTask(task);
      }
      return res.json(toTaskStatus(task));
    });

    app.post('/api/deep-scan/resume/:taskId', (req, res) => {
      const task = getDeepTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      if (task.status !== 'completed') {
        task.status = 'running';
        saveDeepTask(task);
      }
      return res.json(toTaskStatus(task));
    });

    app.post('/api/deep-scan/retry-failed/:taskId', (req, res) => {
      const task = getDeepTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      const reasonFilter = req.body?.reason ? normalizeFailedReason(req.body.reason) : null;
      const retryIds = reasonFilter
        ? task.failedIds.filter((id) => normalizeFailedReason(task.failedReasonById[id]) === reasonFilter)
        : [...task.failedIds];
      task.failedIds = task.failedIds.filter((id) => !retryIds.includes(id));
      retryIds.forEach((id) => {
        task.retryCountById[id] = 0;
        delete task.failedReasonById[id];
        if (!task.pendingIds.includes(id) && !task.completedIds.includes(id)) {
          task.pendingIds.push(id);
        }
      });
      if (task.status !== 'completed') task.status = 'running';
      saveDeepTask(task);
      return res.json({ retried: retryIds.length, reason: reasonFilter, ...toTaskStatus(task) });
    });

    app.get('/api/deep-scan/failed/:taskId', (req, res) => {
      const task = getDeepTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      const items = task.failedIds.map((id) => ({
        id,
        reason: normalizeFailedReason(task.failedReasonById[id]),
        retryCount: task.retryCountById[id] || 0
      }));
      return res.json({ taskId: task.id, total: items.length, items });
    });

    app.post('/api/deep-scan/next/:taskId', (req, res) => {
      const task = getDeepTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      if (task.status !== 'running') return res.json({ artistIds: [], ...toTaskStatus(task) });

      const requested = Number(req.body?.limit);
      const limit = Number.isFinite(requested) && requested > 0
        ? Math.min(200, Math.floor(requested))
        : task.batchSize;
      const now = Date.now();
      const leaseMs = 2 * 60 * 1000;
      const ids = task.pendingIds.splice(0, limit);
      ids.forEach((id) => {
        task.leasedUntilById[id] = now + leaseMs;
      });
      saveDeepTask(task);
      return res.json({ artistIds: ids, ...toTaskStatus(task) });
    });

    app.post('/api/deep-scan/report/:taskId', (req, res) => {
      const task = getDeepTask(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });

      const successIds = Array.isArray(req.body?.successIds)
        ? req.body.successIds.map((id: any) => String(id)).filter(Boolean)
        : [];
      const failedItemsInput = Array.isArray(req.body?.failedItems)
        ? req.body.failedItems
            .map((item: any) => ({
              id: String(item?.id || '').trim(),
              reason: normalizeFailedReason(item?.reason)
            }))
            .filter((item: { id: string; reason: string }) => Boolean(item.id))
        : [];
      const fallbackFailedIds = Array.isArray(req.body?.failedIds)
        ? req.body.failedIds.map((id: any) => String(id)).filter(Boolean)
        : [];
      const failedItems = [
        ...failedItemsInput,
        ...fallbackFailedIds
          .filter((id: string) => !failedItemsInput.some((item: { id: string }) => item.id === id))
          .map((id: string) => ({ id, reason: 'unknown' }))
      ];

      successIds.forEach((id) => {
        delete task.leasedUntilById[id];
        if (!task.completedIds.includes(id)) task.completedIds.push(id);
        task.failedIds = task.failedIds.filter((x) => x !== id);
        delete task.failedReasonById[id];
      });

      failedItems.forEach(({ id, reason }) => {
        delete task.leasedUntilById[id];
        if (task.completedIds.includes(id)) return;
        const retries = (task.retryCountById[id] || 0) + 1;
        task.retryCountById[id] = retries;
        if (retries <= task.maxRetries) {
          if (!task.pendingIds.includes(id)) task.pendingIds.push(id);
        } else {
          if (!task.failedIds.includes(id)) task.failedIds.push(id);
          task.failedReasonById[id] = normalizeFailedReason(reason);
        }
      });

      saveDeepTask(task);
      const normalized = getDeepTask(task.id);
      return res.json(toTaskStatus(normalized || task));
    });

    app.post('/api/bot/register', (req, res) => {
      if (!requireBotAuth(req, res)) return;
      const payload = toBotPayload(req.body || {});
      if (!payload.botId) {
        return res.status(400).json({ error: 'botId is required' });
      }
      upsertBot(payload);
      const state = getBotOnlineState(payload.botId);
      return res.json({
        ok: true,
        botId: payload.botId,
        online: state.online,
        staleMs: state.staleMs
      });
    });

    app.post('/api/bot/heartbeat', (req, res) => {
      if (!requireBotAuth(req, res)) return;
      const payload = toBotPayload(req.body || {});
      if (!payload.botId) {
        return res.status(400).json({ error: 'botId is required' });
      }
      upsertBot(payload);
      return res.json({ ok: true, botId: payload.botId, ts: Date.now() });
    });

    app.get('/api/bot/online', (req, res) => {
      const rows = deepScanDb
        .prepare('SELECT bot_id, payload, status, last_heartbeat_at, updated_at FROM bot_instances ORDER BY last_heartbeat_at DESC LIMIT 500')
        .all() as Array<{ bot_id: string; payload: string; status: string; last_heartbeat_at: number; updated_at: number }>;
      const now = Date.now();
      const bots = rows.map((row) => {
        let payload: BotInstancePayload | null = null;
        try {
          payload = JSON.parse(row.payload) as BotInstancePayload;
        } catch {
          payload = null;
        }
        const staleMs = now - Number(row.last_heartbeat_at || 0);
        const online = staleMs <= BOT_ONLINE_TTL_MS;
        return {
          botId: row.bot_id,
          accountIds: payload?.accountIds || [],
          host: payload?.host || null,
          ip: payload?.ip || null,
          version: payload?.version || null,
          status: online ? 'online' : 'offline',
          lastHeartbeatAt: new Date(Number(row.last_heartbeat_at || 0)).toISOString(),
          staleMs
        };
      });
      return res.json({ total: bots.length, online: bots.filter((b) => b.status === 'online').length, bots });
    });

    const isHourWithinWindow = (hour: number, startHour: number, endHour: number) => {
      if (startHour === endHour) return true;
      if (startHour < endHour) return hour >= startHour && hour < endHour;
      return hour >= startHour || hour < endHour;
    };

    app.post('/api/automation/start', (req, res) => {
      const { artistId, accountId, behaviorProfile, artistHandle, accountHandle, humanization, accountProfile, language } = req.body;
      
      // 1. Check Sleep Cycle (Hard Stop)
      const localHour = Number.isFinite(humanization?.localHour) ? humanization.localHour : new Date().getHours();
      const sleepStart = accountProfile?.sleepWindow?.startHour ?? 23;
      const sleepEnd = accountProfile?.sleepWindow?.endHour ?? 7;
      const isSleeping = isHourWithinWindow(localHour, sleepStart, sleepEnd);

      if (isSleeping) {
        console.log(`[Automation] REJECTED: @${accountHandle} is currently in SLEEP mode (Night Cycle).`);
        return res.status(403).json({ 
          status: 'rejected', 
          reason: 'account_sleeping',
          message: 'Account is in mandatory night-time sleep cycle to prevent detection.' 
        });
      }

      // 2. Check account active window
      const activeStart = accountProfile?.activeWindow?.startHour ?? 9;
      const activeEnd = accountProfile?.activeWindow?.endHour ?? 21;
      const isOutsideActiveWindow = !isHourWithinWindow(localHour, activeStart, activeEnd);
      if (isOutsideActiveWindow) {
        return res.status(425).json({
          status: 'delayed',
          reason: 'outside_active_window',
          message: `Account is outside active window (${activeStart}:00-${activeEnd}:00).`
        });
      }

      // 3. Check for Random "Coffee Breaks" during work hours
      const breakProbability = accountProfile?.breakProbability ?? 0.15;
      const isOnBreak = Math.random() < breakProbability;
      if (isOnBreak) {
        const breakDuration = 5 + Math.floor(Math.random() * 25); // 5-30 mins
        console.log(`[Automation] DELAYED: @${accountHandle} is taking a random break for ${breakDuration}m.`);
        return res.status(429).json({ 
          status: 'delayed', 
          reason: 'taking_break',
          message: `Account is taking a natural break. Try again in ${breakDuration} minutes.` 
        });
      }

      // 4. Anti-Ban Behavioral Protocol: Dynamic Jitter Calculation
      const jitterRange = humanization?.jitterRange || [30, 180];
      const getJitter = () => Math.floor(Math.random() * (jitterRange[1] - jitterRange[0] + 1)) + jitterRange[0];

      const command = {
        id: `cmd_${Date.now()}`,
        artistId,
        accountId,
        artistHandle,
        accountHandle,
        behaviorProfile,
        language: language || 'en',
        timestamp: new Date().toISOString(),
        accountProfile,
        humanization,
        protocol: {
          steps: [
            { action: 'simulate_app_open', delay: getJitter() },
            { action: 'browse_feed', duration: `${10 + Math.floor(Math.random() * 20)}s`, delay: getJitter() },
            { action: 'enter_profile', target: artistHandle, delay: getJitter() },
            { action: 'random_scroll', duration: `${5 + Math.floor(Math.random() * 15)}s`, delay: getJitter() },
            // Randomized Like Count
            ...Array.from({ length: humanization?.sessionLikes || 1 }).map((_, i) => ({
              action: 'like',
              target: i === 0 ? 'recent_post' : 'random_post',
              delay: getJitter()
            })),
            { 
              action: 'comment', 
              enabled: (behaviorProfile === 'active' || behaviorProfile === 'warmup') && (humanization?.sessionComments > 0),
              type: 'ai_generated', 
              language: language || 'en',
              delay: getJitter() 
            },
            { action: 'exit_profile', delay: getJitter() },
            { action: 'random_scroll', duration: '10s', delay: getJitter() }
          ],
          jitterRange: jitterRange
        }
      };

      const runAt = Number.isFinite(Number(req.body?.runAt))
        ? Math.max(Date.now(), Number(req.body.runAt))
        : Date.now();
      deepScanDb
        .prepare(`
          INSERT INTO automation_tasks (
            id, payload, status, run_at, lease_until, leased_by, attempts, max_attempts, error_reason, created_at, updated_at
          ) VALUES (?, ?, 'pending', ?, NULL, NULL, 0, 3, NULL, ?, ?)
        `)
        .run(command.id, JSON.stringify(command), runAt, Date.now(), Date.now());
      console.log(`[Automation] Command queued: @${accountHandle} -> @${artistHandle} (${behaviorProfile})`);
      res.json({ status: 'queued', commandId: command.id, runAt });
    });

    app.get('/api/automation/poll', (req, res) => {
      if (!requireBotAuth(req, res)) return;
      const botId = String(req.query?.botId || '').trim();
      if (!botId) return res.status(400).json({ error: 'botId is required' });
      const onlineState = getBotOnlineState(botId);
      if (!onlineState.exists) {
        return res.status(404).json({ error: 'Bot not registered' });
      }
      if (!onlineState.online) {
        return res.status(409).json({ error: 'Bot is offline. Send heartbeat first.' });
      }

      const limitRaw = Number(req.query?.limit);
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(50, Math.floor(limitRaw)) : 10;

      recycleExpiredAutomationLeases();
      const now = Date.now();
      const candidates = deepScanDb
        .prepare(`
          SELECT id, payload
          FROM automation_tasks
          WHERE status = 'pending' AND run_at <= ?
          ORDER BY run_at ASC
          LIMIT ?
        `)
        .all(now, Math.max(limit * 3, limit)) as Array<{ id: string; payload: string }>;

      const leased: any[] = [];
      for (const row of candidates) {
        if (leased.length >= limit) break;
        const updated = deepScanDb
          .prepare(`
            UPDATE automation_tasks
            SET status = 'leased',
                lease_until = ?,
                leased_by = ?,
                attempts = attempts + 1,
                updated_at = ?
            WHERE id = ? AND status = 'pending'
          `)
          .run(now + BOT_LEASE_MS, botId, now, row.id);
        if ((updated.changes || 0) > 0) {
          try {
            leased.push(JSON.parse(row.payload));
          } catch {
            // Ignore malformed payload rows
          }
        }
      }

      return res.json({
        botId,
        leaseMs: BOT_LEASE_MS,
        commands: leased
      });
    });

    app.post('/api/automation/report', (req, res) => {
      if (!requireBotAuth(req, res)) return;
      const botId = String(req.body?.botId || '').trim();
      const commandId = String(req.body?.commandId || '').trim();
      const status = String(req.body?.status || '').trim().toLowerCase();
      const errorReason = req.body?.reason ? String(req.body.reason) : null;
      if (!botId || !commandId) {
        return res.status(400).json({ error: 'botId and commandId are required' });
      }
      if (status !== 'done' && status !== 'failed') {
        return res.status(400).json({ error: 'status must be done or failed' });
      }

      const onlineState = getBotOnlineState(botId);
      if (!onlineState.exists) {
        return res.status(404).json({ error: 'Bot not registered' });
      }

      const now = Date.now();
      const updated = deepScanDb
        .prepare(`
          UPDATE automation_tasks
          SET status = ?,
              lease_until = NULL,
              leased_by = NULL,
              error_reason = ?,
              updated_at = ?
          WHERE id = ? AND leased_by = ? AND status IN ('leased','running')
        `)
        .run(status, status === 'failed' ? (errorReason || 'unknown') : null, now, commandId, botId);

      if ((updated.changes || 0) === 0) {
        return res.status(409).json({ error: 'Task not leased by this bot or already resolved' });
      }
      return res.json({ ok: true, commandId, status });
    });

    // Vite Integration
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('CRITICAL: Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(err => {
  console.error('CRITICAL: Unhandled error during startup:', err);
  process.exit(1);
});
