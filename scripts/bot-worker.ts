/* eslint-disable no-console */
type CommandPayload = {
  id: string;
  artistId?: string;
  accountId?: string;
  artistHandle?: string;
  accountHandle?: string;
  behaviorProfile?: string;
  language?: string;
  timestamp?: string;
  protocol?: {
    steps?: Array<{
      action?: string;
      delay?: number;
      duration?: string;
      enabled?: boolean;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  [key: string]: any;
};

const API_BASE = (process.env.BOT_API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
const BOT_ID = process.env.BOT_ID || `bot_${Math.random().toString(36).slice(2, 8)}`;
const BOT_HOST = process.env.BOT_HOST || process.env.HOSTNAME || 'local-dev';
const BOT_VERSION = process.env.BOT_VERSION || '0.1.0';
const ACCOUNT_IDS = (process.env.BOT_ACCOUNT_IDS || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);
const BOT_API_KEY = (process.env.BOT_API_KEY || '').trim();
const POLL_INTERVAL_MS = Math.max(1000, Number(process.env.BOT_POLL_INTERVAL_MS || 3000));
const HEARTBEAT_INTERVAL_MS = Math.max(5000, Number(process.env.BOT_HEARTBEAT_INTERVAL_MS || 15000));
const EXEC_MIN_MS = Math.max(300, Number(process.env.BOT_EXEC_MIN_MS || 800));
const EXEC_MAX_MS = Math.max(EXEC_MIN_MS, Number(process.env.BOT_EXEC_MAX_MS || 2500));
const FAILURE_RATE = Math.min(0.5, Math.max(0, Number(process.env.BOT_FAILURE_RATE || 0)));

let running = true;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (BOT_API_KEY) headers['x-bot-key'] = BOT_API_KEY;
  return headers;
};

const postJson = async (path: string, body: Record<string, any>) => {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body)
  });
  const text = await resp.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText}: ${JSON.stringify(payload)}`);
  }
  return payload;
};

const getJson = async (path: string) => {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders()
  });
  const text = await resp.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText}: ${JSON.stringify(payload)}`);
  }
  return payload;
};

const registerBot = async () => {
  const payload = await postJson('/api/bot/register', {
    botId: BOT_ID,
    accountIds: ACCOUNT_IDS,
    host: BOT_HOST,
    version: BOT_VERSION,
    meta: {
      mode: 'mock-worker',
      startedAt: new Date().toISOString()
    }
  });
  console.log(`[bot] registered: ${BOT_ID}`, payload);
};

const heartbeatBot = async () => {
  await postJson('/api/bot/heartbeat', {
    botId: BOT_ID,
    accountIds: ACCOUNT_IDS,
    host: BOT_HOST,
    version: BOT_VERSION
  });
};

const reportCommand = async (commandId: string, status: 'done' | 'failed', reason?: string) => {
  const payload: Record<string, any> = {
    botId: BOT_ID,
    commandId,
    status
  };
  if (reason) payload.reason = reason;
  await postJson('/api/automation/report', payload);
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const executeCommand = async (command: CommandPayload) => {
  const commandId = command.id;
  const handle = command.artistHandle || command.artistId || 'unknown';
  const account = command.accountHandle || command.accountId || 'unknown';
  console.log(`[bot] executing ${commandId} @${account} -> @${handle}`);

  const randomMs = randomInt(EXEC_MIN_MS, EXEC_MAX_MS);
  await sleep(randomMs);

  if (Math.random() < FAILURE_RATE) {
    const reason = 'mock_failure';
    console.warn(`[bot] failed ${commandId}: ${reason}`);
    await reportCommand(commandId, 'failed', reason);
    return;
  }

  await reportCommand(commandId, 'done');
  console.log(`[bot] done ${commandId} (${randomMs}ms)`);
};

const pollLoop = async () => {
  while (running) {
    try {
      const data = await getJson(`/api/automation/poll?botId=${encodeURIComponent(BOT_ID)}&limit=5`);
      const commands: CommandPayload[] = Array.isArray(data?.commands) ? data.commands : [];
      if (commands.length === 0) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      for (const cmd of commands) {
        if (!running) break;
        try {
          await executeCommand(cmd);
        } catch (err: any) {
          console.error(`[bot] execution error ${cmd?.id || 'unknown'}:`, err?.message || err);
          if (cmd?.id) {
            try {
              await reportCommand(cmd.id, 'failed', 'worker_exception');
            } catch (reportErr: any) {
              console.error('[bot] failed to report execution error:', reportErr?.message || reportErr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[bot] poll error:', err?.message || err);
      await sleep(POLL_INTERVAL_MS);
    }
  }
};

const heartbeatLoop = async () => {
  while (running) {
    try {
      await heartbeatBot();
      await sleep(HEARTBEAT_INTERVAL_MS);
    } catch (err: any) {
      console.error('[bot] heartbeat error:', err?.message || err);
      await sleep(Math.min(HEARTBEAT_INTERVAL_MS, 5000));
    }
  }
};

const shutdown = async (signal: string) => {
  console.log(`[bot] shutting down on ${signal}...`);
  running = false;
  await sleep(300);
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

const main = async () => {
  console.log('[bot] starting worker with config:', {
    API_BASE,
    BOT_ID,
    BOT_HOST,
    BOT_VERSION,
    ACCOUNT_IDS,
    POLL_INTERVAL_MS,
    HEARTBEAT_INTERVAL_MS,
    EXEC_MIN_MS,
    EXEC_MAX_MS,
    FAILURE_RATE
  });

  await registerBot();
  await Promise.all([heartbeatLoop(), pollLoop()]);
};

main().catch((err) => {
  console.error('[bot] fatal error:', err);
  process.exit(1);
});

