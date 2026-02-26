import { useCallback } from 'react';
import { useTaskStore } from '@/stores';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { Play, CheckCircle2, GripVertical, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import type { Task, TabType } from '@/types';

function TaskItem({ task, tab, onStartTimer }: { task: Task; tab: TabType; onStartTimer: (id: string) => void }) {
  const completeTask = useTaskStore((s) => s.completeTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);
  const removeTask = useTaskStore((s) => s.removeTask);
  const timer = useTaskStore((s) => s.timer);

  const isTimerActive = timer.taskId === task.id && timer.isRunning;

  const { swipeState, handlers } = useSwipeGesture({
    threshold: 80,
    onSwipeLeft: tab === 'pending' ? () => completeTask(task.id) : undefined,
  });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div
      {...handlers}
      className="relative overflow-hidden rounded-xl mb-2"
      style={{
        transform: swipeState.isSwiping ? `translateX(${swipeState.offsetX}px)` : 'translateX(0)',
        transition: swipeState.isSwiping ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Swipe reveal background */}
      {tab === 'pending' && (
        <div className="absolute inset-0 bg-[rgba(52,211,153,0.2)] flex items-center justify-end pr-6 rounded-xl">
          <CheckCircle2 size={24} className="text-[var(--success)]" />
        </div>
      )}

      <div className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
        isTimerActive
          ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]'
          : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)]'
      } ${tab === 'done' ? 'opacity-70' : ''}`}>
        {/* Drag handle for pending */}
        {tab === 'pending' && (
          <div className="text-[var(--text-muted)] cursor-grab active:cursor-grabbing touch-none">
            <GripVertical size={16} />
          </div>
        )}

        {/* Complete checkbox */}
        {tab === 'pending' && (
          <button
            onClick={() => completeTask(task.id)}
            className="size-6 rounded-full border-2 border-[var(--text-muted)] flex items-center justify-center flex-shrink-0 active:border-[var(--success)]"
            aria-label="Hoàn thành"
          >
          </button>
        )}

        {tab === 'done' && (
          <div className="size-6 rounded-full bg-[rgba(52,211,153,0.2)] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={14} className="text-[var(--success)]" />
          </div>
        )}

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${
            tab === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
          }`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {task.isRecurring && (
              <span className="flex items-center gap-0.5 text-[10px] text-[var(--accent-primary)]">
                <RotateCcw size={10} /> Lặp lại
              </span>
            )}
            {task.duration && task.duration > 0 && (
              <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">
                {formatDuration(task.duration)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {tab === 'pending' && !isTimerActive && (
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
          {(tab === 'done' || tab === 'overdue') && (
            <button
              onClick={() => removeTask(task.id)}
              className="size-9 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)] active:opacity-70"
              aria-label="Xóa"
            >
              <Trash2 size={14} />
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
        </div>
      </div>
    </div>
  );
}

export function TaskList() {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTab = useTaskStore((s) => s.activeTab);
  const setActiveTab = useTaskStore((s) => s.setActiveTab);
  const reorderTasks = useTaskStore((s) => s.reorderTasks);
  const startTimer = useTaskStore((s) => s.startTimer);
  const timer = useTaskStore((s) => s.timer);

  const filteredTasks = tasks
    .filter((t) => t.status === activeTab)
    .sort((a, b) => (activeTab === 'pending' ? a.order - b.order : (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt)));

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const overdueCount = tasks.filter((t) => t.status === 'overdue').length;

  const handleStartTimer = useCallback((taskId: string) => {
    if (timer.isRunning) return;
    startTimer(taskId);
  }, [timer.isRunning, startTimer]);

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
