import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { Mail, Lock, User, ArrowRight, KeyRound, Eye, EyeOff } from 'lucide-react';

type AuthStep = 'login' | 'register_email' | 'register_otp' | 'register_password';

export default function AuthPage() {
  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setUser = useAuthStore((s) => s.setUser);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email!, username: data.user.user_metadata?.username || email.split('@')[0] });
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Email hoặc mật khẩu không đúng' : err.message);
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (otpError) throw otpError;
      setStep('register_otp');
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (verifyError) throw verifyError;
      setStep('register_password');
    } catch (err: any) {
      setError(err.message === 'Token has expired or is invalid' ? 'Mã OTP không đúng hoặc đã hết hạn' : err.message);
    }
    setLoading(false);
  };

  const handleSetPassword = async () => {
    if (!password.trim() || password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    setLoading(true);
    setError('');
    try {
      const finalUsername = username.trim() || email.split('@')[0];
      const { data, error: updateError } = await supabase.auth.updateUser({ password, data: { username: finalUsername } });
      if (updateError) throw updateError;
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email!, username: finalUsername });
      }
    } catch (err: any) { setError(err.message); setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => { if (e.key === 'Enter') action(); };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-[var(--bg-base)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center border border-[var(--border-accent)]">
            <span className="text-3xl font-bold text-[var(--accent-primary)]">N</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">NghiemWork</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Quản lý công việc thông minh</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)]">
            <p className="text-xs text-[var(--error)]">{error}</p>
          </div>
        )}

        {step === 'login' && (
          <div className="space-y-3">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                placeholder="Email" className="w-full bg-[var(--bg-elevated)] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px]" autoComplete="email" />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                placeholder="Mật khẩu" className="w-full bg-[var(--bg-elevated)] rounded-xl pl-11 pr-12 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px]" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button onClick={handleLogin} disabled={loading || !email.trim() || !password.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-40 active:opacity-80 min-h-[48px] flex items-center justify-center gap-2">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              {!loading && <ArrowRight size={16} />}
            </button>
            <div className="text-center pt-2">
              <button onClick={() => { setStep('register_email'); setError(''); setPassword(''); }}
                className="text-sm text-[var(--accent-primary)] active:opacity-70">
                Chưa có tài khoản? <span className="font-semibold">Đăng ký</span>
              </button>
            </div>
          </div>
        )}

        {step === 'register_email' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)] text-center mb-2">Nhập email để nhận mã xác thực</p>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleSendOtp)}
                placeholder="Email của bạn" className="w-full bg-[var(--bg-elevated)] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px]" />
            </div>
            <button onClick={handleSendOtp} disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-40 active:opacity-80 min-h-[48px]">
              {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
            </button>
            <div className="text-center pt-2">
              <button onClick={() => { setStep('login'); setError(''); }} className="text-sm text-[var(--text-muted)]">
                Đã có tài khoản? <span className="text-[var(--accent-primary)] font-semibold">Đăng nhập</span>
              </button>
            </div>
          </div>
        )}

        {step === 'register_otp' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)] text-center mb-2">
              Nhập mã 4 số đã gửi đến <span className="text-[var(--accent-primary)] font-medium">{email}</span>
            </p>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={(e) => handleKeyDown(e, handleVerifyOtp)}
                placeholder="Mã OTP" className="w-full bg-[var(--bg-elevated)] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px] text-center tracking-[0.5em] font-mono text-lg"
                maxLength={4} inputMode="numeric" autoComplete="one-time-code" />
            </div>
            <button onClick={handleVerifyOtp} disabled={loading || otp.length < 4}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-40 active:opacity-80 min-h-[48px]">
              {loading ? 'Đang xác thực...' : 'Xác thực'}
            </button>
            <button onClick={handleSendOtp} disabled={loading} className="w-full py-2 text-xs text-[var(--text-muted)]">Gửi lại mã</button>
          </div>
        )}

        {step === 'register_password' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)] text-center mb-2">Thiết lập tài khoản của bạn</p>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tên hiển thị (tùy chọn)"
                className="w-full bg-[var(--bg-elevated)] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px]" />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleSetPassword)}
                placeholder="Mật khẩu (tối thiểu 6 ký tự)" className="w-full bg-[var(--bg-elevated)] rounded-xl pl-11 pr-12 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px]" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button onClick={handleSetPassword} disabled={loading || password.length < 6}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-40 active:opacity-80 min-h-[48px]">
              {loading ? 'Đang tạo tài khoản...' : 'Hoàn tất đăng ký'}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button onClick={() => setUser({ id: 'guest', email: 'guest@local', username: 'Khách' })}
            className="text-xs text-[var(--text-muted)] underline underline-offset-2 active:opacity-70">
            Dùng không cần đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
