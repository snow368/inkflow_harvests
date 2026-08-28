// 每用户 bot 动作偏好（每会话点赞/评论/关注次数）
// localStorage 做前台缓存；D1 后端做真实配置源，VPS scheduler 按 botId 读取。
import { apiFetch } from './api-auth';

export interface BotActionPrefs {
  likesPerSession: number;     // 每会话点赞次数
  commentsPerSession: number;  // 每会话评论次数（0 = 不评论）
  followsPerSession: number;   // 每会话关注次数（0 = 不关注）
  botId: string;               // 该用户自己 VPS 上的 bot 实例 ID（任务路由用，唯一隔离机制）
  igHandle: string;            // 该 bot 登录的 IG 账号名（仅展示 label，云端不登录）
}

const DEFAULT_PREFS: BotActionPrefs = {
  likesPerSession: 2,
  commentsPerSession: 1,
  followsPerSession: 0,
  botId: 'bot_ig_01',
  igHandle: '',
};

const key = (uid: string) => `inkflow_bot_prefs_${uid}`;

export function getUserBotPrefs(uid: string | undefined): BotActionPrefs {
  if (!uid) return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw);
    return {
      likesPerSession: Number(p.likesPerSession) || 0,
      commentsPerSession: Number(p.commentsPerSession) || 0,
      followsPerSession: Number(p.followsPerSession) || 0,
      botId: (typeof p.botId === 'string' && p.botId.trim()) ? p.botId.trim() : 'bot_ig_01',
      igHandle: typeof p.igHandle === 'string' ? p.igHandle.trim() : '',
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setUserBotPrefs(uid: string | undefined, prefs: BotActionPrefs): void {
  if (!uid) return;
  try {
    localStorage.setItem(key(uid), JSON.stringify(prefs));
  } catch {}
}

export async function saveUserBotPrefsToServer(uid: string | undefined, prefs: BotActionPrefs): Promise<void> {
  if (!uid) return;
  const res = await apiFetch('/api/automation/bot-prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...prefs, uid }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
}

export async function fetchUserBotPrefsFromServer(uid: string | undefined): Promise<BotActionPrefs | null> {
  if (!uid) return null;
  const res = await apiFetch(`/api/automation/bot-prefs?uid=${encodeURIComponent(uid)}`);
  if (!res.ok) return null;
  const d = await res.json().catch(() => ({}));
  if (!d?.prefs) return null;
  const p = d.prefs;
  return {
    likesPerSession: Number(p.likesPerSession) || 0,
    commentsPerSession: Number(p.commentsPerSession) || 0,
    followsPerSession: Number(p.followsPerSession) || 0,
    botId: (typeof p.botId === 'string' && p.botId.trim()) ? p.botId.trim() : 'bot_ig_01',
    igHandle: typeof p.igHandle === 'string' ? p.igHandle.trim() : '',
  };
}
