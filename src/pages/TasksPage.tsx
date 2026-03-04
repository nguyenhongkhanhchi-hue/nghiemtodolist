import { useTaskStore, useSettingsStore } from '@/stores';
import { TaskList } from '@/components/features/TaskList';
import { Plus } from 'lucide-react';
import { getNowInTimezone } from '@/lib/notifications';
import { useState, useEffect } from 'react';
import { AddTaskSheet } from '@/components/features/AddTaskInput';

export default function TasksPage() {
  const timer = useTaskStore(s => s.timer);
  const timezone = useSettingsStore(s => s.timezone);
  const [showAdd, setShowAdd] = useState(false);
  const [now, setNow] = useState(getNowInTimezone(timezone));

  useEffect(() => {
    const i = setInterval(() => setNow(getNowInTimezone(timezone)), 1000);
    return () => clearInterval(i);
  }, [timezone]);

  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[now.getDay()];
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const hasTimer = timer.isRunning || timer.isPaused;

  return (
    <div className="flex flex-col h-full px-4" style={{ paddingTop: hasTimer ? '60px' : '0' }}>
      {/* Header */}
      <div className="flex items-center justify-between pt-3 pb-2">
        <div>
          <p className="text-[11px] text-[var(--text-muted)] font-medium">{dayName}</p>
          <p className="text-base font-bold text-[var(--text-primary)]">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono font-bold text-[var(--accent-primary)] tabular-nums">{timeStr}</p>
        </div>
      </div>

      <TaskList />

      {/* Floating Add Button */}
      <button onClick={() => setShowAdd(true)}
        className="fixed z-[61] size-11 rounded-full bg-[var(--warning)] text-[var(--bg-base)] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 124px)', right: '18px' }}
        aria-label="Thêm việc">
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {showAdd && <AddTaskSheet onClose={() => setShowAdd(false)} />}
    </div>
  );
}
