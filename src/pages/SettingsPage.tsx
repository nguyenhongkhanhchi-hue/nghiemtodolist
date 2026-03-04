import { useRef } from 'react';
import { useTaskStore, useAuthStore, useSettingsStore, useGamificationStore, useTemplateStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, canSendNotification } from '@/lib/notifications';
import { exportData, importData } from '@/lib/dataUtils';
import {
  Type, Volume2, Mic, Trash2, Minus, Plus,
  LogOut, User, Globe, Bell, Download, Upload, Smartphone, Timer,
} from 'lucide-react';

const TIMEZONES = [
  { label: 'Việt Nam (GMT+7)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'Nhật Bản (GMT+9)', value: 'Asia/Tokyo' },
  { label: 'Singapore (GMT+8)', value: 'Asia/Singapore' },
  { label: 'Thái Lan (GMT+7)', value: 'Asia/Bangkok' },
  { label: 'Úc (GMT+10)', value: 'Australia/Sydney' },
  { label: 'Mỹ PST (GMT-8)', value: 'America/Los_Angeles' },
  { label: 'Anh (GMT+0)', value: 'Europe/London' },
];

function getOS(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export default function SettingsPage() {
  const clearAllData = useTaskStore(s => s.clearAllData);
  const tasks = useTaskStore(s => s.tasks);
  const templates = useTemplateStore(s => s.templates);
  const gamState = useGamificationStore(s => s.state);
  const uiScale = useSettingsStore(s => s.uiScale);
  const tickSoundEnabled = useSettingsStore(s => s.tickSoundEnabled);
  const voiceEnabled = useSettingsStore(s => s.voiceEnabled);
  const voiceCountdownEnabled = useSettingsStore(s => s.voiceCountdownEnabled);
  const voiceTickEnabled = useSettingsStore(s => s.voiceTickEnabled);
  const voiceSpeed = useSettingsStore(s => s.voiceSpeed);
  const timezone = useSettingsStore(s => s.timezone);
  const notificationSettings = useSettingsStore(s => s.notificationSettings);

  const setUiScale = useSettingsStore(s => s.setUiScale);
  const setTickSound = useSettingsStore(s => s.setTickSound);
  const setVoiceEnabled = useSettingsStore(s => s.setVoiceEnabled);
  const setVoiceCountdown = useSettingsStore(s => s.setVoiceCountdown);
  const setVoiceTick = useSettingsStore(s => s.setVoiceTick);
  const setVoiceSpeed = useSettingsStore(s => s.setVoiceSpeed);
  const setTimezone = useSettingsStore(s => s.setTimezone);
  const setNotificationSettings = useSettingsStore(s => s.setNotificationSettings);

  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const os = getOS();
  const installed = isStandalone();
  const notifGranted = canSendNotification();

  const handleClear = () => {
    if (window.confirm('Xóa toàn bộ dữ liệu?')) { clearAllData(); window.location.reload(); }
  };

  const handleLogout = async () => {
    if (user?.id !== 'admin') await supabase.auth.signOut();
    logout();
  };

  const handleExport = () => {
    exportData(tasks, templates, gamState, { uiScale, tickSoundEnabled, voiceEnabled, timezone, notificationSettings });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importData(file);
    if (result.error) { alert(result.error); return; }
    if (window.confirm(`Nhập ${result.tasks?.length || 0} việc, ${result.templates?.length || 0} mẫu?`)) {
      if (result.tasks) {
        const key = user?.id && user.id !== 'admin' ? `nw_tasks_${user.id}` : 'nw_tasks';
        localStorage.setItem(key, JSON.stringify(result.tasks));
      }
      if (result.templates) {
        const key = user?.id && user.id !== 'admin' ? `nw_templates_${user.id}` : 'nw_templates';
        localStorage.setItem(key, JSON.stringify(result.templates));
      }
      window.location.reload();
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-4 pt-3 pb-24 overflow-y-auto">
      <h1 className="text-lg font-bold text-[var(--text-primary)] mb-4">Cài đặt</h1>

      {/* User */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center">
            <User size={18} className="text-[var(--accent-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.username || 'Admin'}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.id === 'admin' ? 'Quản trị viên' : user?.email}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[var(--bg-surface)] text-xs text-[var(--text-muted)] min-h-[36px]">
            <LogOut size={12} /> Đăng xuất
          </button>
        </div>
      </div>

      {/* Install App */}
      {!installed && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-accent)] mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone size={16} className="text-[var(--accent-primary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Cài đặt ứng dụng</span>
          </div>
          <div className="text-xs text-[var(--text-secondary)] space-y-1">
            {os === 'ios' ? (
              <>
                <p>1. Nhấn nút <strong>Chia sẻ</strong> (↑) Safari</p>
                <p>2. Chọn <strong>"Thêm vào Màn hình chính"</strong></p>
              </>
            ) : os === 'android' ? (
              <p>Nhấn <strong>⋮</strong> chọn <strong>"Cài đặt ứng dụng"</strong></p>
            ) : (
              <p>Click biểu tượng <strong>cài đặt</strong> trên thanh địa chỉ trình duyệt</p>
            )}
          </div>
        </div>
      )}

      {/* UI Scale - PHÓNG TO TOÀN BỘ */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Type size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Phóng to giao diện</span>
          <span className="text-xs font-mono text-[var(--accent-primary)] ml-auto tabular-nums">{Math.round(uiScale * 100)}%</span>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setUiScale(uiScale - 0.1)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] active:scale-90"><Minus size={14} /></button>
            <input type="range" min="1" max="2" step="0.05" value={uiScale} onChange={(e) => setUiScale(parseFloat(e.target.value))} className="flex-1 h-1.5 bg-[var(--bg-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]" />
            <button onClick={() => setUiScale(uiScale + 0.1)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] active:scale-90"><Plus size={14} /></button>
        </div>
        <p className="text-[9px] text-[var(--text-muted)] mt-2 italic text-center">* Áp dụng cho toàn bộ nút, icon và chữ của ứng dụng</p>
      </div>

      {/* Voice & Sound */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3 space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Âm thanh & Giọng nói</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-primary)]">Tiếng tik-tak</span>
              <span className="text-[9px] text-[var(--text-muted)]">Phát khi timer đang chạy</span>
            </div>
            <Toggle value={tickSoundEnabled} onChange={setTickSound} />
          </div>

          <div className="h-px bg-[var(--border-subtle)]" />

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-[var(--text-primary)] flex items-center gap-1"><Mic size={12} className="text-[var(--info)]" /> Trợ lý Lucy</span>
              <span className="text-[9px] text-[var(--text-muted)]">Bật/Tắt tất cả giọng nói</span>
            </div>
            <Toggle value={voiceEnabled} onChange={setVoiceEnabled} />
          </div>

          {voiceEnabled && (
            <div className="pl-4 space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-secondary)]">Thông báo đếm ngược</span>
                <Toggle value={voiceCountdownEnabled} onChange={setVoiceCountdown} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-secondary)]">Đếm giây cuối (10-1)</span>
                <Toggle value={voiceTickEnabled} onChange={setVoiceTick} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[11px] text-[var(--text-secondary)]">Tốc độ nói</span>
                  <span className="text-[10px] font-mono text-[var(--accent-primary)]">{voiceSpeed}x</span>
                </div>
                <input type="range" min="0.5" max="2" step="0.1" value={voiceSpeed} onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-[var(--bg-surface)] rounded-lg appearance-none accent-[var(--accent-primary)]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timezone & Backups */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Vùng & Sao lưu</span>
        </div>
        <select value={timezone} onChange={e => setTimezone(e.target.value)}
          className="w-full bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)]">
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
        
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex-1 py-2 rounded-xl text-[10px] font-medium text-[var(--accent-primary)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center gap-1.5"><Download size={12} /> Xuất dữ liệu</button>
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 rounded-xl text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] flex items-center justify-center gap-1.5"><Upload size={12} /> Nhập dữ liệu</button>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>

      {/* Clear */}
      <button onClick={handleClear} className="w-full py-3 rounded-xl text-xs font-medium text-[var(--error)] bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.1)] flex items-center justify-center gap-1.5 active:bg-[rgba(248,113,113,0.1)]"><Trash2 size={14} /> Xóa toàn bộ dữ liệu máy này</button>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-9 h-5 rounded-full transition-colors relative ${value ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-surface)]'}`}>
      <div className={`size-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${value ? 'translate-x-4.5' : 'translate-x-1'}`} />
    </button>
  );
}
