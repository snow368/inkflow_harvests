import { auth } from './firebase';

const API_BASE = 'https://harvests-cloud-api-production.inkflowapp.workers.dev';

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;

  if (!tokenPromise) {
    tokenPromise = new Promise(async (resolve) => {
      try {
        const user = auth.currentUser;
        if (!user) { resolve(null); return; }
        const token = await user.getIdToken();
        cachedToken = token;
        resolve(token);
      } catch { resolve(null); }
    });
  }

  const token = await tokenPromise;
  tokenPromise = null;
  return token;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // If 401, token might be expired — refresh and retry once
  if (res.status === 401) {
    cachedToken = null;
    const newToken = await getAuthToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      return fetch(`${API_BASE}${path}`, { ...options, headers });
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
