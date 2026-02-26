import { useCallback, useState } from 'react';
import { useTaskStore } from '@/stores';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import {
  Play, CheckCircle2, GripVertical, RotateCcw, Trash2, Undo2,
  Flag, Clock, Calendar, AlertTriangle, ChevronDown, ChevronUp, Pencil,
} from 'lucide-react';
import type { Task, TabType, Priority } from '@/types';

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'var(--text-muted)',
  medium: 'var(--accent-primary)',
  high: 'var(--warning)',
  urgent: 'var(--error)',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Thấp',
  medium: 'TB',
  high: 'Cao',
  urgent: 'Khẩn',
};

const RECURRING_LABELS: Record<string, string> = {
  none: '',
  daily: 'Hàng ngày',
  weekdays: 'T2-T6',
  weekly: 'Hàng tuần',
  custom: 'Tùy chọn',
};

function formatDuration(secs: number) {
  if (secs === 0) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDeadline(ts: number) {
  const date = new Date(ts);
  const now = new Date();
  const diff = ts - now.getTime();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  if (diff < 0) return { text: `Quá hạn`, urgent: true };
  if (isToday) return { text: `Hôm nay ${time}`, urgent: diff < 3600000 };
  if (isTomorrow) return { text: `Ngày mai ${time}`, urgent: false };
  return { text: `${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} ${time}`, urgent: false };
}

function TaskItem({ task, tab, onStartTimer }: { task: Task; tab: TabType; onStartTimer: (id: string) => void }) {
  const completeTask = useTaskStore((s) => s.completeTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);
  const removeTask = useTaskStore((s) => s.removeTask);
  const timer = useTaskStore((s) => s.timer);
  const [expanded, setExpanded] = useState(false);

  const isTimerActive = (timer.taskId === task.id) && (timer.isRunning || timer.isPaused);
  const priorityColor = PRIORITY_COLORS[task.priority];

  const { swipeState, handlers } = useSwipeGesture({
    threshold: 80,
    onSwipeLeft: tab === 'pending' ? () => completeTask(task.id) : undefined,
  });

  const deadlineInfo = task.deadline ? formatDeadline(task.deadline) : null;

  return (
    <div
      {...handlers}
      className="relative overflow-hidden rounded-xl mb-2"
      style={{
        transform: swipeState.isSwiping ? `translateX(${swipeState.offsetX}px)` : 'translateX(0)',
        transition: swipeState.isSwiping ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Swipe reveal */}
      {tab === 'pending' && (
        <div className="absolute inset-0 bg-[rgba(52,211,153,0.2)] flex items-center justify-end pr-6 rounded-xl">
          <CheckCircle2 size={24} className="text-[var(--success)]" />
        </div>
      )}

      <div className={`relative flex flex-col rounded-xl transition-colors ${
        isTimerActive
          ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]'
          : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)]'
      } ${tab === 'done' ? 'opacity-70' : ''}`}>

        {/* Priority indicator strip */}
        <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: priorityColor }} />

        <div className="flex items-center gap-2.5 px-4 py-3 pl-5">
          {/* Drag handle */}
          {tab === 'pending' && (
            <div className="text-[var(--text-muted)] cursor-grab active:cursor-grabbing touch-none">
              <GripVertical size={14} />
            </div>
          )}

          {/* Status indicator */}
          {tab === 'pending' && (
            <button
              onClick={() => completeTask(task.id)}
              className="size-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
              style={{ borderColor: priorityColor }}
              aria-label="Hoàn thành"
            />
          )}

          {tab === 'done' && (
            <div className="size-6 rounded-full bg-[rgba(52,211,153,0.2)] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={14} className="text-[var(--success)]" />
            </div>
          )}

          {tab === 'overdue' && (
            <div className="size-6 rounded-full bg-[rgba(248,113,113,0.2)] flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={12} className="text-[var(--error)]" />
            </div>
          )}

          {/* Task content */}
          <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
            <p className={`text-sm font-medium truncate ${
              tab === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
            }`}>
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {/* Priority badge */}
              <span className="text-[10px] font-medium" style={{ color: priorityColor }}>
                {PRIORITY_LABELS[task.priority]}
              </span>

              {/* Recurring badge */}
              {task.recurring.type !== 'none' && (
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--info)]">
                  <RotateCcw size={9} /> {RECURRING_LABELS[task.recurring.type]}
                </span>
              )}

              {/* Deadline */}
              {deadlineInfo && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
                  deadlineInfo.urgent ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'
                }`}>
                  <Calendar size={9} /> {deadlineInfo.text}
                </span>
              )}

              {/* Duration */}
              {task.duration && task.duration > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] font-mono tabular-nums">
                  <Clock size={9} /> {formatDuration(task.duration)}
                </span>
              )}

              {/* In progress indicator */}
              {task.status === 'in_progress' && (
                <span className="text-[10px] text-[var(--accent-primary)] font-medium">
                  Đang làm
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {(tab === 'pending') && !isTimerActive && (
              <button
                onClick={() => onStartTimer(task.id)}
                className="size-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)] active:opacity-70"
                aria-label="Bắt đầu đếm giờ"
              >
                <Play size={16} fill="currentColor" />
              </button>
            )}
            {tab === 'done' && (
              <button
                onClick={() => restoreTask(task.id)}
                className="size-9 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] active:opacity-70"
                aria-label="Khôi phục"
              >
                <Undo2 size={16} />
              </button>
            )}
            {tab === 'overdue' && (
              <button
                onClick={() => restoreTask(task.id)}
                className="size-9 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] active:opacity-70"
                aria-label="Khôi phục"
              >
                <Undo2 size={16} />
              </button>
            )}
            {(tab === 'done' || tab === 'overdue') && (
              <button
                onClick={() => removeTask(task.id)}
                className="size-9 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)] active:opacity-70"
                aria-label="Xóa"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskList() {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTab = useTaskStore((s) => s.activeTab);
  const setActiveTab = useTaskStore((s) => s.setActiveTab);
  const startTimer = useTaskStore((s) => s.startTimer);
  const timer = useTaskStore((s) => s.timer);

  const filteredTasks = tasks
    .filter((t) => {
      if (activeTab === 'pending') return t.status === 'pending' || t.status === 'in_progress';
      if (activeTab === 'done') return t.status === 'done';
      return t.status === 'overdue';
    })
    .sort((a, b) => {
      if (activeTab === 'pending') {
        // In progress first, then by priority, then by order
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
        const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return a.order - b.order;
      }
      return (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt);
    });

  const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const overdueCount = tasks.filter((t) => t.status === 'overdue').length;

  const handleStartTimer = useCallback((taskId: string) => {
    if (timer.isRunning || timer.isPaused) return;
    startTimer(taskId);
  }, [timer.isRunning, timer.isPaused, startTimer]);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: 'Cần làm', count: pendingCount },
    { key: 'done', label: 'Hoàn thành', count: doneCount },
    { key: 'overdue', label: 'Quá hạn', count: overdueCount },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-elevated)] rounded-xl mb-4">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
              activeTab === key
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${
                activeTab === key
                  ? key === 'overdue'
                    ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]'
                    : 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)]'
                  : 'bg-[var(--bg-base)] text-[var(--text-muted)]'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto pb-32 -mx-1 px-1">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
              {activeTab === 'pending' && <span className="text-2xl">📋</span>}
              {activeTab === 'done' && <span className="text-2xl">✅</span>}
              {activeTab === 'overdue' && <span className="text-2xl">⏰</span>}
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-1">
              {activeTab === 'pending' && 'Chưa có việc nào'}
              {activeTab === 'done' && 'Chưa hoàn thành việc nào'}
              {activeTab === 'overdue' && 'Không có việc quá hạn'}
            </p>
            {activeTab === 'pending' && (
              <p className="text-xs text-[var(--text-muted)]">Bấm + để thêm việc mới</p>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              tab={activeTab}
              onStartTimer={handleStartTimer}
            />
          ))
        )}
      </div>
    </div>
  );
}
