import { useRef } from 'react';
import { useTaskStore, useAuthStore, useSettingsStore, useGamificationStore, useTemplateStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, canSendNotification } from '@/lib/notifications';
import { exportData, importData } from '@/lib/dataUtils';
import {
  Type, Volume2, Mic, Trash2, Minus, Plus,
  LogOut, User, Globe, Bell, Download, Upload, Smartphone,
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
  const timezone = useSettingsStore(s => s.timezone);
  const notificationSettings = useSettingsStore(s => s.notificationSettings);
  const setUiScale = useSettingsStore(s => s.setUiScale);
  const setTickSound = useSettingsStore(s => s.setTickSound);
  const setVoiceEnabled = useSettingsStore(s => s.setVoiceEnabled);
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
    <div className="flex flex-col h-full px-4 pt-3 pb-24 overflow-y-auto">
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

      {/* Install App - only if not installed */}
      {!installed && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-accent)] mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone size={16} className="text-[var(--accent-primary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Cài đặt ứng dụng</span>
          </div>
          {os === 'ios' && (
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p>1. Nhấn nút <strong>Chia sẻ</strong> (hình vuông có mũi tên ↑) ở thanh dưới Safari</p>
              <p>2. Cuộn xuống chọn <strong>"Thêm vào Màn hình chính"</strong></p>
              <p>3. Nhấn <strong>"Thêm"</strong> ở góc phải trên</p>
            </div>
          )}
          {os === 'android' && (
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p>1. Nhấn nút <strong>⋮</strong> (menu 3 chấm) ở góc phải trên Chrome</p>
              <p>2. Chọn <strong>"Thêm vào Màn hình chính"</strong> hoặc <strong>"Cài đặt ứng dụng"</strong></p>
              <p>3. Nhấn <strong>"Cài đặt"</strong></p>
            </div>
          )}
          {os === 'other' && (
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p>1. Mở bằng Chrome/Edge trên máy tính</p>
              <p>2. Click biểu tượng <strong>cài đặt</strong> trên thanh địa chỉ</p>
              <p>3. Chọn <strong>"Cài đặt"</strong></p>
            </div>
          )}
        </div>
      )}

      {/* Timezone */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Múi giờ</span>
        </div>
        <select value={timezone} onChange={e => setTimezone(e.target.value)}
          className="w-full bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px]">
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      </div>

      {/* Notifications */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Thông báo</span>
        </div>
        {!notifGranted ? (
          <button onClick={async () => { const g = await requestNotificationPermission(); if (g) setNotificationSettings({ enabled: true }); }}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-[var(--bg-base)] bg-[var(--accent-primary)] min-h-[40px]">
            Bật thông báo
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Nhắc deadline</span>
              <Toggle value={notificationSettings.enabled} onChange={v => setNotificationSettings({ enabled: v })} />
            </div>
            {notificationSettings.enabled && (
              <div className="flex gap-1.5">
                {[5, 15, 30, 60].map(m => (
                  <button key={m} onClick={() => setNotificationSettings({ beforeDeadline: m })}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium min-h-[30px] ${notificationSettings.beforeDeadline === m ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                    {m < 60 ? `${m}p` : '1h'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* UI Scale */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Type size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Phóng to</span>
          <span className="text-xs font-mono text-[var(--accent-primary)] ml-auto tabular-nums">{Math.round(uiScale * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setUiScale(uiScale - 0.1)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)]"><Minus size={14} /></button>
            <input type="range" min="1" max="2" step="0.1" value={uiScale} onChange={(e) => setUiScale(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
            <button onClick={() => setUiScale(uiScale + 0.1)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)]"><Plus size={14} /></button>
        </div>
      </div>

      {/* Sound */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Volume2 size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Âm thanh</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Tiếng tik-tak</span>
            <Toggle value={tickSoundEnabled} onChange={setTickSound} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]"><Mic size={12} className="inline mr-1" />Lucy (giọng nữ)</span>
            <Toggle value={voiceEnabled} onChange={setVoiceEnabled} />
          </div>
        </div>
      </div>

      {/* Import/Export */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Download size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Sao lưu</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[var(--accent-primary)] bg-[var(--accent-dim)] min-h-[40px] flex items-center justify-center gap-1.5">
            <Download size={14} /> Xuất
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] min-h-[40px] flex items-center justify-center gap-1.5">
            <Upload size={14} /> Nhập
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>

      {/* Clear */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)]">
        <button onClick={handleClear} className="w-full py-2.5 rounded-xl text-xs font-medium text-[var(--error)] bg-[rgba(248,113,113,0.1)] min-h-[40px] flex items-center justify-center gap-1.5">
          <Trash2 size={14} /> Xóa toàn bộ dữ liệu
        </button>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors relative ${value ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-surface)]'}`}>
      <div className={`size-4 rounded-full bg-white absolute top-1 transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}
