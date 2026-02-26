import { useEffect } from 'react';
import { useTaskStore } from '@/stores';
import { TaskList } from '@/components/features/TaskList';
import { AddTaskInput } from '@/components/features/AddTaskInput';
import { CalendarDays } from 'lucide-react';

export default function TasksPage() {
  const timer = useTaskStore((s) => s.timer);
  const markOverdue = useTaskStore((s) => s.markOverdue);
  const pendingCount = useTaskStore((s) => s.tasks.filter(t => t.status === 'pending').length);

  useEffect(() => {
    markOverdue();
  }, [markOverdue]);

  const today = new Date();
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[today.getDay()];
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return (
    <div className="flex flex-col h-full px-4" style={{ paddingTop: timer.isRunning ? '72px' : '0' }}>
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-4">
        <div>
          <p className="text-xs text-[var(--text-muted)] font-medium">{dayName}</p>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{dateStr}</h1>
        </div>
        <div className="flex items-center gap-2">
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
