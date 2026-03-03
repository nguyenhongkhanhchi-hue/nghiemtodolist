import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { Mail, KeyRound, User, ArrowRight } from 'lucide-react';

type AuthStep = 'choose' | 'otp_email' | 'otp_verify' | 'admin_login';

const ADMIN_CODE = '2026Phattrien$';

export default function AuthPage() {
  const [step, setStep] = useState<AuthStep>('choose');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setUser = useAuthStore(s => s.setUser);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true); setError('');
    try {
      const { error: e } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (e) throw e;
      setStep('otp_verify');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setLoading(true); setError('');
    try {
      const { data, error: e } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (e) throw e;
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email!, username: data.user.user_metadata?.username || email.split('@')[0] });
      }
    } catch (e: any) {
      setError(e.message === 'Token has expired or is invalid' ? 'Mã OTP không đúng hoặc đã hết hạn' : e.message);
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminCode !== ADMIN_CODE) { setError('Mã đăng nhập không đúng'); return; }
    setUser({ id: 'admin', email: 'admin@nghiemwork.app', username: 'Admin' });
  };

  const handleKeyDown = (e: React.KeyboardEvent, fn: () => void) => { if (e.key === 'Enter') fn(); };

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

        {step === 'choose' && (
          <div className="space-y-3">
            <button onClick={() => { setStep('otp_email'); setError(''); }}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] active:border-[var(--border-accent)] transition-colors min-h-[56px]">
              <div className="size-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center">
                <Mail size={18} className="text-[var(--accent-primary)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Đăng nhập / Đăng ký</p>
                <p className="text-[11px] text-[var(--text-muted)]">Nhận mã OTP qua email</p>
              </div>
              <ArrowRight size={16} className="text-[var(--text-muted)] ml-auto" />
            </button>
            <button onClick={() => { setStep('admin_login'); setError(''); }}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] active:border-[var(--border-accent)] transition-colors min-h-[56px]">
              <div className="size-10 rounded-xl bg-[rgba(251,191,36,0.1)] flex items-center justify-center">
                <KeyRound size={18} className="text-[var(--warning)]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Admin</p>
                <p className="text-[11px] text-[var(--text-muted)]">Đăng nhập nhanh bằng mã</p>
              </div>
              <ArrowRight size={16} className="text-[var(--text-muted)] ml-auto" />
            </button>
          </div>
        )}

        {step === 'otp_email' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)] text-center mb-2">Nhập email để nhận mã xác thực</p>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => handleKeyDown(e, handleSendOtp)}
                placeholder="Email" autoComplete="email" autoFocus
                className="w-full bg-[var(--bg-elevated)] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px]" />
            </div>
            <button onClick={handleSendOtp} disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-40 active:opacity-80 min-h-[48px]">
              {loading ? 'Đang gửi...' : 'Gửi mã xác thực'}
            </button>
            <button onClick={() => { setStep('choose'); setError(''); }} className="w-full py-2 text-xs text-[var(--text-muted)]">← Quay lại</button>
          </div>
        )}

        {step === 'otp_verify' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)] text-center mb-2">
              Nhập mã 4 số đã gửi đến <span className="text-[var(--accent-primary)] font-medium">{email}</span>
            </p>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={e => handleKeyDown(e, handleVerifyOtp)}
                placeholder="Mã OTP" maxLength={4} inputMode="numeric" autoComplete="one-time-code" autoFocus
                className="w-full bg-[var(--bg-elevated)] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px] text-center tracking-[0.5em] font-mono text-lg" />
            </div>
            <button onClick={handleVerifyOtp} disabled={loading || otp.length < 4}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-40 active:opacity-80 min-h-[48px]">
              {loading ? 'Đang xác thực...' : 'Xác thực'}
            </button>
            <button onClick={handleSendOtp} disabled={loading} className="w-full py-2 text-xs text-[var(--text-muted)]">Gửi lại mã</button>
            <button onClick={() => { setStep('otp_email'); setError(''); }} className="w-full py-2 text-xs text-[var(--text-muted)]">← Quay lại</button>
          </div>
        )}

        {step === 'admin_login' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)] text-center mb-2">Nhập mã đăng nhập Admin</p>
            <div className="relative">
              <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="password" value={adminCode} onChange={e => setAdminCode(e.target.value)} onKeyDown={e => handleKeyDown(e, handleAdminLogin)}
                placeholder="Mã đăng nhập" autoFocus
                className="w-full bg-[var(--bg-elevated)] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px]" />
            </div>
            <button onClick={handleAdminLogin} disabled={!adminCode.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-40 active:opacity-80 min-h-[48px]">
              Đăng nhập Admin
            </button>
            <button onClick={() => { setStep('choose'); setError(''); }} className="w-full py-2 text-xs text-[var(--text-muted)]">← Quay lại</button>
          </div>
        )}
      </div>
    </div>
  );
}
