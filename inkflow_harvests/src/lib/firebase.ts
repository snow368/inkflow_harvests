import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

const AUTH_API = 'https://harvests-cloud-api.inkflowapp.workers.dev/api/auth';
const AUTH_TIMEOUT = 15000; // 15s — Worker can be slow under GFW

/** Fetch with timeout — wraps AbortController for iOS Safari compat */
async function authFetch(url: string, body: object): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AUTH_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Email auth proxy (bypasses Firebase SDK for GFW users) ──

export type EmailAuthUser = {
  uid: string
  email: string
  idToken: string
  refreshToken: string
}

export function getStoredEmailAuth(): EmailAuthUser | null {
  try {
    const raw = localStorage.getItem('email_auth')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearStoredEmailAuth() {
  localStorage.removeItem('email_auth')
}

export const signInWithGoogle = async () => {
  /* Always use redirect — popups are unreliable on iOS/mobile */
  await signInWithRedirect(auth, googleProvider);
};

export const handleRedirectResult = async (): Promise<void> => {
  try {
    await getRedirectResult(auth);
  } catch (error) {
    console.error("Redirect sign-in error", error);
  }
};

export const logoutUser = async () => {
  clearStoredEmailAuth()
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

function handleFirebaseError(data: any): never {
  const msg = data?.error?.message || ''
  console.log('[auth proxy] error response:', msg)
  const code = msg === 'EMAIL_NOT_FOUND' ? 'auth/user-not-found'
    : msg === 'INVALID_PASSWORD' ? 'auth/wrong-password'
    : msg === 'INVALID_LOGIN_CREDENTIALS' ? 'auth/invalid-credential'
    : msg === 'EMAIL_EXISTS' ? 'auth/email-already-in-use'
    : msg === 'TOO_MANY_ATTEMPTS_TRY_LATER' ? 'auth/too-many-requests'
    : msg === 'INVALID_EMAIL' ? 'auth/invalid-email'
    : msg === 'WEAK_PASSWORD' ? 'auth/weak-password'
    : msg === 'MISSING_PASSWORD' ? 'auth/missing-password'
    : msg === 'OPERATION_NOT_ALLOWED' ? 'auth/operation-not-allowed'
    : msg
  const err: any = new Error(msg)
  err.code = code
  throw err
}

export const signInWithEmail = async (email: string, password: string): Promise<EmailAuthUser> => {
  let res: Response;
  try {
    res = await authFetch(`${AUTH_API}/signin`, { email, password });
  } catch {
    const err: any = new Error('网络连接失败，请检查网络或代理设置')
    err.code = 'auth/network-error'
    throw err
  }
  const data = await res.json()
  if (!res.ok) handleFirebaseError(data)
  const user: EmailAuthUser = {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
  }
  localStorage.setItem('email_auth', JSON.stringify(user))
  return user
};

export const registerWithEmail = async (email: string, password: string): Promise<EmailAuthUser> => {
  let res: Response;
  try {
    res = await authFetch(`${AUTH_API}/signup`, { email, password });
  } catch {
    const err: any = new Error('网络连接失败，请检查网络或代理设置')
    err.code = 'auth/network-error'
    throw err
  }
  const data = await res.json()
  if (!res.ok) handleFirebaseError(data)
  const user: EmailAuthUser = {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
  }
  localStorage.setItem('email_auth', JSON.stringify(user))
  return user
};

export const resetPassword = async (email: string) => {
  let res: Response;
  try {
    res = await authFetch(`${AUTH_API}/reset`, { email });
  } catch {
    const err: any = new Error('网络连接失败，请检查网络或代理设置')
    err.code = 'auth/network-error'
    throw err
  }
  const data = await res.json()
  if (!res.ok) handleFirebaseError(data)
};
