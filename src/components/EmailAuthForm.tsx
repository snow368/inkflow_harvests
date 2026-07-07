import { useState } from 'react';
import { signInWithEmail, registerWithEmail, resetPassword } from '../lib/firebase';
import { toast } from 'sonner';

interface Props {
  onBackToGoogle: () => void;
  onSuccess: () => void;
}

export default function EmailAuthForm({ onBackToGoogle, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('请输入邮箱和密码'); return; }
    if (password.length < 6) { setError('密码至少6位'); return; }

    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await registerWithEmail(email, password);
        toast.success('账号注册成功！');
      } else {
        await signInWithEmail(email, password);
        toast.success('登录成功！');
      }
      onSuccess();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setError('该邮箱已注册');
      else if (code === 'auth/user-not-found') setError('账号不存在，请先注册');
      else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError('密码错误');
      else if (code === 'auth/invalid-email') setError('邮箱格式不正确');
      else if (code === 'auth/weak-password') setError('密码太弱，至少6位');
      else if (code === 'auth/too-many-requests') setError('操作太频繁，请稍后再试');
      else setError(err?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) { setError('请输入邮箱地址'); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setResetSent(true);
      toast.success('密码重置邮件已发送！请检查邮箱');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') setError('该邮箱未注册');
      else if (code === 'auth/invalid-email') setError('邮箱格式不正确');
      else if (code === 'auth/too-many-requests') setError('操作太频繁，请稍后再试');
      else setError(err?.message || '发送失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // Reset password flow
  if (showReset) {
    return (
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fafafa', margin: '0 0 8px' }}>找回密码</h3>
        <p style={{ fontSize: 12, color: '#71717a', marginBottom: 16 }}>
          输入注册邮箱，我们将发送重置链接。
        </p>
        {resetSent ? (
          <div style={{ background: '#14532d', borderRadius: 10, padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 16, margin: '0 0 8px' }}>✅</p>
            <p style={{ fontSize: 13, color: '#86efac', fontWeight: 600, margin: 0 }}>重置邮件已发送</p>
            <p style={{ fontSize: 11, color: '#86efac', marginTop: 4 }}>请检查 {email} 的收件箱（包括垃圾箱）</p>
            <button onClick={() => { setShowReset(false); setResetSent(false); setError(''); }}
              style={{ marginTop: 16, background: 'none', border: '1px solid #22c55e', color: '#22c55e', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              返回登录
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4, fontWeight: 600 }}>Email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="your@email.com"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {error && <div style={{ background: '#7f1d1d', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>{error}</div>}
            <button onClick={handleResetPassword} disabled={loading || !email}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: loading || !email ? '#27272a' : '#06b6d4', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : !email ? 'not-allowed' : 'pointer' }}>
              {loading ? '发送中...' : '发送重置链接'}
            </button>
            <button onClick={() => { setShowReset(false); setError(''); }}
              style={{ marginTop: 8, width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #27272a', background: 'transparent', color: '#a1a1aa', fontSize: 12, cursor: 'pointer' }}>
              返回登录
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4, fontWeight: 600 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="your@email.com"
            autoComplete="email"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa',
              fontSize: 14, outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4, fontWeight: 600 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="••••••••"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa',
              fontSize: 14, outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {!isRegister && (
          <div style={{ textAlign: 'right', marginTop: -4 }}>
            <button onClick={() => { setShowReset(true); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 11, fontWeight: 600, textDecoration: 'underline' }}>
              Forgot password?
            </button>
          </div>
        )}

        {error && (
          <div style={{ background: '#7f1d1d', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: loading || !email || !password ? '#27272a' : 'white',
            color: loading || !email || !password ? '#71717a' : 'black',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : !email || !password ? 'not-allowed' : 'pointer',
            marginTop: 4
          }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, border: '2px solid #71717a', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
              {isRegister ? '注册中...' : '登录中...'}
            </span>
          ) : (
            isRegister ? 'Register' : 'Sign In'
          )}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#27272a' }} />
        <span style={{ fontSize: 11, color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>or</span>
        <div style={{ flex: 1, height: 1, background: '#27272a' }} />
      </div>

      <button
        onClick={onBackToGoogle}
        style={{
          width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #27272a',
          background: 'transparent', color: '#a1a1aa', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Sign in with Google
      </button>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#52525b' }}>
        {isRegister ? (
          <>已有账号？ <button onClick={() => { setIsRegister(false); setError(''); }} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>Sign In</button></>
        ) : (
          <>没有账号？ <button onClick={() => { setIsRegister(true); setError(''); }} style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}>Register</button></>
        )}
      </p>
    </div>
  );
}
