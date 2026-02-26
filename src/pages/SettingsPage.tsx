import { useTaskStore, useAuthStore, useSettingsStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, canSendNotification } from '@/lib/notifications';
import { Type, Volume2, Mic, Trash2, AlertTriangle, Minus, Plus as PlusIcon, LogOut, User, Globe, Bell, BellOff } from 'lucide-react';

const TIMEZONES = [
  { label: 'Việt Nam (GMT+7)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'Nhật Bản (GMT+9)', value: 'Asia/Tokyo' },
  { label: 'Hàn Quốc (GMT+9)', value: 'Asia/Seoul' },
  { label: 'Singapore (GMT+8)', value: 'Asia/Singapore' },
  { label: 'Thái Lan (GMT+7)', value: 'Asia/Bangkok' },
  { label: 'Ấn Độ (GMT+5:30)', value: 'Asia/Kolkata' },
  { label: 'Úc (GMT+10)', value: 'Australia/Sydney' },
  { label: 'Mỹ PST (GMT-8)', value: 'America/Los_Angeles' },
  { label: 'Mỹ EST (GMT-5)', value: 'America/New_York' },
  { label: 'Anh (GMT+0)', value: 'Europe/London' },
  { label: 'Pháp (GMT+1)', value: 'Europe/Paris' },
  { label: 'Dubai (GMT+4)', value: 'Asia/Dubai' },
];

const NOTIFY_BEFORE_OPTIONS = [
  { label: '5 phút', value: 5 },
  { label: '15 phút', value: 15 },
  { label: '30 phút', value: 30 },
  { label: '1 giờ', value: 60 },
  { label: '2 giờ', value: 120 },
];

export default function SettingsPage() {
  const clearAllData = useTaskStore((s) => s.clearAllData);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const tickSoundEnabled = useSettingsStore((s) => s.tickSoundEnabled);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const timezone = useSettingsStore((s) => s.timezone);
  const notificationSettings = useSettingsStore((s) => s.notificationSettings);
  const setFontScale = useSettingsStore((s) => s.setFontScale);
  const setTickSound = useSettingsStore((s) => s.setTickSound);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
  const setTimezone = useSettingsStore((s) => s.setTimezone);
  const setNotificationSettings = useSettingsStore((s) => s.setNotificationSettings);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const fontSizes = [
    { label: 'Nhỏ', value: 0.85 },
    { label: 'Vừa', value: 1 },
    { label: 'Lớn', value: 1.15 },
    { label: 'Rất lớn', value: 1.3 },
  ];

  const handleClear = () => {
    if (window.confirm('Xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.')) {
      clearAllData();
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    if (user?.id !== 'guest') {
      await supabase.auth.signOut();
    }
    logout();
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationSettings({ enabled: true });
    } else {
      alert('Bạn đã từ chối quyền thông báo. Vui lòng bật lại trong cài đặt trình duyệt.');
    }
  };

  const notifGranted = canSendNotification();

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24 overflow-y-auto">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">Cài đặt</h1>

      {/* User info */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center">
            <User size={20} className="text-[var(--accent-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.username || 'Khách'}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.id === 'guest' ? 'Chế độ khách' : user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-surface)] text-xs text-[var(--text-muted)] active:opacity-70 min-h-[40px]"
          >
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2.5 mb-3">
          <Globe size={18} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Múi giờ</span>
        </div>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px] appearance-none"
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* Notifications */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2.5 mb-3">
          <Bell size={18} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Thông báo đẩy</span>
        </div>

        {!notifGranted ? (
          <button
            onClick={handleEnableNotifications}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[var(--bg-base)] bg-[var(--accent-primary)] active:opacity-80 min-h-[44px]"
          >
            <Bell size={16} />
            Bật thông báo đẩy
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Thông báo deadline</span>
              <button
                onClick={() => setNotificationSettings({ enabled: !notificationSettings.enabled })}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  notificationSettings.enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-surface)]'
                }`}
              >
                <div className={`size-5 rounded-full bg-white absolute top-1 transition-transform ${
                  notificationSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {notificationSettings.enabled && (
              <>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1.5">Nhắc trước deadline</p>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTIFY_BEFORE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setNotificationSettings({ beforeDeadline: opt.value })}
                        className={`px-3 py-2 rounded-lg text-[11px] font-medium min-h-[36px] transition-colors ${
                          notificationSettings.beforeDeadline === opt.value
                            ? 'bg-[rgba(0,229,204,0.15)] text-[var(--accent-primary)] border border-[var(--border-accent)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-transparent'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Font size */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2.5 mb-3">
          <Type size={18} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Cỡ chữ</span>
          <span className="text-xs font-mono text-[var(--accent-primary)] tabular-nums ml-auto">
            {Math.round(fontScale * 100)}%
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {fontSizes.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFontScale(value)}
              className={`py-2.5 rounded-lg text-xs font-medium min-h-[44px] transition-colors ${
                fontScale === value
                  ? 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)] border border-[var(--border-accent)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={() => setFontScale(Math.max(0.7, Math.round((fontScale - 0.05) * 100) / 100))}
            className="size-10 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] active:opacity-70"
            aria-label="Giảm cỡ chữ"
          >
            <Minus size={16} />
          </button>
          <p className="text-[var(--text-primary)] font-medium transition-all" style={{ fontSize: `${16 * fontScale}px` }}>
            Xem trước
          </p>
          <button
            onClick={() => setFontScale(Math.min(1.5, Math.round((fontScale + 0.05) * 100) / 100))}
            className="size-10 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] active:opacity-70"
            aria-label="Tăng cỡ chữ"
          >
            <PlusIcon size={16} />
          </button>
        </div>
      </div>

      {/* Sound settings */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-2.5 mb-3">
          <Volume2 size={18} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Âm thanh</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Tiếng tik-tak</span>
            <button
              onClick={() => setTickSound(!tickSoundEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                tickSoundEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-surface)]'
              }`}
              aria-label="Bật/tắt tiếng tik-tak"
            >
              <div className={`size-5 rounded-full bg-white absolute top-1 transition-transform ${
                tickSoundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic size={14} className="text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-secondary)]">Giọng nói thông báo</span>
            </div>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                voiceEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-surface)]'
              }`}
              aria-label="Bật/tắt giọng nói"
            >
              <div className={`size-5 rounded-full bg-white absolute top-1 transition-transform ${
                voiceEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Data management */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5 mb-3">
          <AlertTriangle size={18} className="text-[var(--error)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Dữ liệu</span>
        </div>
        <button
          onClick={handleClear}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-[var(--error)] bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)] active:opacity-70 min-h-[44px]"
        >
          <Trash2 size={16} />
          Xóa toàn bộ dữ liệu
        </button>
      </div>
    </div>
  );
}
