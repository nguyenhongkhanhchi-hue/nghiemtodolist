import { useEffect } from 'react';
import { useTaskStore } from '@/stores';
import { TaskList } from '@/components/features/TaskList';
import { AddTaskInput } from '@/components/features/AddTaskInput';
import { CalendarDays, Flame } from 'lucide-react';

export default function TasksPage() {
  const timer = useTaskStore((s) => s.timer);
  const markOverdue = useTaskStore((s) => s.markOverdue);
  const tasks = useTaskStore((s) => s.tasks);
  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

  useEffect(() => {
    markOverdue();
    // Check overdue every minute
    const interval = setInterval(markOverdue, 60000);
    return () => clearInterval(interval);
  }, [markOverdue]);

  const today = new Date();
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[today.getDay()];
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

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
          {inProgressCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)]">
              <Flame size={14} className="text-[var(--warning)]" />
              <span className="text-sm font-semibold text-[var(--warning)] tabular-nums">{inProgressCount}</span>
              <span className="text-xs text-[var(--text-muted)]">đang làm</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)]">
            <CalendarDays size={14} className="text-[var(--accent-primary)]" />
            <span className="text-sm font-semibold text-[var(--accent-primary)] tabular-nums">{pendingCount}</span>
            <span className="text-xs text-[var(--text-muted)]">việc</span>
          </div>
        </div>
      </div>

      <TaskList />
      <AddTaskInput />
    </div>
  );
}
