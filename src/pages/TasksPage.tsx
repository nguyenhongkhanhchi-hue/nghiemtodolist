import { useTaskStore, useSettingsStore } from '@/stores';
import { TaskList } from '@/components/features/TaskList';
import { AddTaskInput } from '@/components/features/AddTaskInput';
import { CalendarDays, Flame } from 'lucide-react';
import type {} from '@/types';
import { getNowInTimezone } from '@/lib/notifications';

export default function TasksPage() {
  const timer = useTaskStore((s) => s.timer);
  const tasks = useTaskStore((s) => s.tasks);
  const timezone = useSettingsStore((s) => s.timezone);
  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const overdueCount = tasks.filter(t => t.status === 'overdue').length;

  const now = getNowInTimezone(timezone);
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[now.getDay()];
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const hasTimer = timer.isRunning || timer.isPaused;

  return (
    <div className="flex flex-col h-full px-4" style={{ paddingTop: hasTimer ? '72px' : '0' }}>
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-4">
        <div>
          <p className="text-xs text-[var(--text-muted)] font-medium">{dayName}</p>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{dateStr}</h1>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)]">
              <span className="text-sm font-semibold text-[var(--error)] tabular-nums">{overdueCount}</span>
              <span className="text-xs text-[var(--text-muted)]">quá hạn</span>
            </div>
          )}
          {inProgressCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)]">
              <Flame size={14} className="text-[var(--warning)]" />
              <span className="text-sm font-semibold text-[var(--warning)] tabular-nums">{inProgressCount}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)]">
            <CalendarDays size={14} className="text-[var(--accent-primary)]" />
            <span className="text-sm font-semibold text-[var(--accent-primary)] tabular-nums">{pendingCount}</span>
          </div>
        </div>
      </div>

      <TaskList />
      <AddTaskInput />
    </div>
  );
}
