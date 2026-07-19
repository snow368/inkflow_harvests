import { auth, getStoredEmailAuth } from './firebase';

// NOTE: Use a RELATIVE path (empty base) so requests go through the Pages
// Function proxy (/api/* -> cloud-api Worker, CF->CF) instead of hitting
// `*.workers.dev` directly. Direct workers.dev URLs are DNS-poisoned / blocked
// behind the GFW in China, which made every apiFetch call fail there.
const API_BASE = '';
const API_TIMEOUT = 20000; // 20s — Worker can be slow under GFW

/** fetch with timeout wrapper */
async function fetchWithTimeout(url: string, options: RequestInit, timeout = API_TIMEOUT): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

/** Refresh a Firebase ID token via the Worker proxy (Cloudflare -> Google).
 *  This avoids the browser -> identitytoolkit.googleapis.com call that is
 *  blocked behind the GFW, so tokens can be refreshed from China. */
async function refreshTokenViaWorker(): Promise<string | null> {
  // Source 1: Firebase SDK current user (holds a refreshToken internally)
  const user = auth.currentUser;
  let refreshToken: string | undefined = (user as any)?.refreshToken;
  // Source 2: stored email-auth refresh token (proxy login users)
  if (!refreshToken) {
    const stored = getStoredEmailAuth();
    refreshToken = stored?.refreshToken;
  }
  if (!refreshToken) return null;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.idToken) {
      cachedToken = data.idToken;
      // Persist refreshed token for email-auth users too
      const stored = getStoredEmailAuth();
      if (stored) {
        try { localStorage.setItem('email_auth', JSON.stringify({ ...stored, idToken: data.idToken, refreshToken: data.refreshToken || refreshToken })); } catch {}
      }
      return data.idToken;
    }
  } catch { /* network error — fall through */ }
  return null;
}

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;

  // Try Firebase SDK first (Google auth users) — works if not behind GFW
  const user = auth.currentUser;
  if (user) {
    if (!tokenPromise) {
      tokenPromise = new Promise(async (resolve) => {
        try {
          const token = await user.getIdToken();
          cachedToken = token;
          resolve(token);
        } catch {
          // GFW may block the refresh — fall back to Worker proxy
          const proxied = await refreshTokenViaWorker();
          resolve(proxied);
        }
      });
    }
    const token = await tokenPromise;
    tokenPromise = null;
    return token;
  }

  // Fallback: stored email auth token (proxy auth users)
  const stored = getStoredEmailAuth();
  if (stored?.idToken) {
    cachedToken = stored.idToken;
    return stored.idToken;
  }

  return null;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers });

  // If 401, token might be expired — refresh via Worker proxy and retry once
  if (res.status === 401) {
    cachedToken = null;
    const newToken = await refreshTokenViaWorker();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      return fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  return res;
}

// Listen for auth state changes to clear cached token
auth.onIdTokenChanged((user) => {
  cachedToken = null;
  if (user) {
    user.getIdToken().then(t => { cachedToken = t; });
  }
});
