import { useState } from 'react';
import { signInWithEmail, registerWithEmail, resetPassword } from '../lib/firebase';
import { toast } from 'sonner';

interface Props {
  onBackToGoogle: () => void;
  onSuccess: () => void;
  defaultMode?: 'login' | 'register';
}

export default function EmailAuthForm({ onBackToGoogle, onSuccess, defaultMode = 'login' }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(defaultMode === 'register');
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
        try {
          await registerWithEmail(email, password);
          toast.success('账号注册成功！');
          onSuccess();
        } catch (err: any) {
          const code = err?.code || '';
          if (code === 'auth/email-already-in-use') {
            // Email already registered, auto-switch to login
            try {
              await signInWithEmail(email, password);
              toast.success('登录成功！');
              onSuccess();
              return;
            } catch {}
          }
          throw err;
        }
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
      else if (code === 'auth/network-error') setError('网络连接失败，请检查网络或代理设置');
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
      <div className="w-full" style={{ maxWidth: 360 }}>
        <h3 className="text-lg font-bold text-[#fafafa] mb-1.5">找回密码</h3>
        <p className="text-xs text-zinc-500 mb-4">
          输入注册邮箱，我们将发送重置链接。
        </p>
        {resetSent ? (
          <div className="bg-green-900/50 rounded-xl p-5 text-center border border-green-500/20">
            <p className="text-lg mb-2">✅</p>
            <p className="text-sm font-semibold text-green-400">重置邮件已发送</p>
            <p className="text-xs text-green-400/70 mt-1">请检查 {email} 的收件箱（包括垃圾箱）</p>
            <button onClick={() => { setShowReset(false); setResetSent(false); setError(''); }}
              className="mt-4 px-5 py-2 border border-green-500 text-green-400 rounded-xl text-xs font-bold bg-transparent active:scale-95 transition-all">
              返回登录
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="text-[11px] text-zinc-500 font-semibold block mb-1">Email</label>
              <input
                type="email" inputMode="email" autoComplete="email"
                value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="your@email.com"
                className="w-full px-3.5 py-3 rounded-xl border border-zinc-700 bg-[#0c0c0e] text-[#fafafa] text-base outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700"
              />
            </div>
            {error && <div className="bg-red-900/50 border border-red-500/20 px-3 py-2 rounded-xl text-xs text-red-400 mb-3">{error}</div>}
            <button onClick={handleResetPassword} disabled={loading || !email}
              className="w-full py-3 rounded-xl border-none text-white font-bold text-sm active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100"
              style={{ background: loading || !email ? '#27272a' : '#06b6d4' }}>
              {loading ? '发送中...' : '发送重置链接'}
            </button>
            <button onClick={() => { setShowReset(false); setError(''); }}
              className="mt-2 w-full py-2.5 rounded-xl border border-zinc-800 bg-transparent text-zinc-400 text-xs active:scale-[0.97] transition-all">
              返回登录
            </button>
          </>
        )}
      </div>
    );
  }

  const inputClass = "w-full px-3.5 py-3 rounded-xl border border-zinc-700 bg-[#0c0c0e] text-[#fafafa] text-base outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700";

  return (
    <div className="w-full" style={{ maxWidth: 360 }}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-[11px] text-zinc-500 font-semibold block mb-1">Email</label>
          <input
            type="email" inputMode="email" autoComplete="email"
            value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
            placeholder="your@email.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[11px] text-zinc-500 font-semibold block mb-1">Password</label>
          <input
            type="password" autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        {!isRegister && (
          <div className="text-right -mt-1">
            <button onClick={() => { setShowReset(true); setError(''); }}
              className="bg-none border-none text-zinc-500 text-[11px] font-semibold underline active:text-zinc-300 transition-colors cursor-pointer">
              Forgot password?
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500/20 px-3 py-2 rounded-xl text-xs text-red-400">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full py-3 rounded-xl border-none text-sm font-bold active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100"
          style={{
            background: loading || !email || !password ? '#27272a' : 'white',
            color: loading || !email || !password ? '#71717a' : 'black',
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
              {isRegister ? '注册中...' : '登录中...'}
            </span>
          ) : (
            isRegister ? 'Register' : 'Sign In'
          )}
        </button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <button
        onClick={onBackToGoogle}
        className="w-full py-3 rounded-xl border border-zinc-800 bg-transparent text-zinc-400 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Sign in with Google
      </button>

      <p className="text-center mt-4 text-xs text-zinc-600">
        {isRegister ? (
          <>已有账号？ <button onClick={() => { setIsRegister(false); setError(''); }} className="bg-none border-none text-cyan-500 text-xs font-semibold underline cursor-pointer active:text-cyan-400">Sign In</button></>
        ) : (
          <>没有账号？ <button onClick={() => { setIsRegister(true); setError(''); }} className="bg-none border-none text-cyan-500 text-xs font-semibold underline cursor-pointer active:text-cyan-400">Register</button></>
        )}
      </p>
    </div>
  );
}
