import { useCallback, useState, useRef } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { formatTimeRemaining, formatDeadlineDisplay } from '@/lib/notifications';
import { TaskEditModal } from '@/components/features/TaskEditModal';
import {
  Play, CheckCircle2, GripVertical, RotateCcw, Trash2, Undo2,
  Clock, Calendar, AlertTriangle, ChevronDown, ChevronRight,
  DollarSign, ListTree, Image as ImageIcon, Youtube,
} from 'lucide-react';
import type { Task, TabType, EisenhowerQuadrant } from '@/types';

const QUADRANT_CONFIG: Record<EisenhowerQuadrant, { label: string; color: string; icon: string; short: string }> = {
  do_first: { label: 'Làm ngay', color: 'var(--error)', icon: '🔴', short: 'Q1' },
  schedule: { label: 'Lên lịch', color: 'var(--accent-primary)', icon: '🔵', short: 'Q2' },
  delegate: { label: 'Ủy thác', color: 'var(--warning)', icon: '🟡', short: 'Q3' },
  eliminate: { label: 'Loại bỏ', color: 'var(--text-muted)', icon: '⚪', short: 'Q4' },
};

const RECURRING_LABELS: Record<string, string> = {
  none: '', daily: 'Hàng ngày', weekdays: 'T2-T6', weekly: 'Hàng tuần', custom: 'Tùy chọn',
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

function SubtaskList({ parentId, tab }: { parentId: string; tab: TabType }) {
  const tasks = useTaskStore(s => s.tasks);
  const completeTask = useTaskStore(s => s.completeTask);
  const restoreTask = useTaskStore(s => s.restoreTask);
  const subtasks = tasks.filter(t => t.parentId === parentId).sort((a, b) => a.order - b.order);

  if (subtasks.length === 0) return null;
  const done = subtasks.filter(s => s.status === 'done').length;

  return (
    <div className="mt-1.5 ml-5 space-y-1">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        <span className="text-[9px] text-[var(--text-muted)]">{done}/{subtasks.length} việc con</span>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      {subtasks.map(sub => (
        <div key={sub.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          {sub.status !== 'done' ? (
            <button onClick={() => completeTask(sub.id)} className="size-4 rounded-full border border-[var(--text-muted)] flex-shrink-0" />
          ) : (
            <CheckCircle2 size={14} className="text-[var(--success)] flex-shrink-0" />
          )}
          <span className={`text-xs flex-1 ${sub.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
            {sub.title}
          </span>
        </div>
      ))}
    </div>
  );
}

function TaskItem({ task, tab, onStartTimer, onEdit }: { task: Task; tab: TabType; onStartTimer: (id: string) => void; onEdit: (task: Task) => void }) {
  const completeTask = useTaskStore(s => s.completeTask);
  const restoreTask = useTaskStore(s => s.restoreTask);
  const removeTask = useTaskStore(s => s.removeTask);
  const timer = useTaskStore(s => s.timer);
  const tasks = useTaskStore(s => s.tasks);
  const timezone = useSettingsStore(s => s.timezone);
  const [expanded, setExpanded] = useState(false);

  const isTimerActive = (timer.taskId === task.id) && (timer.isRunning || timer.isPaused);
  const qConfig = QUADRANT_CONFIG[task.quadrant] || QUADRANT_CONFIG.do_first;
  const hasChildren = tasks.some(t => t.parentId === task.id);
  const childCount = tasks.filter(t => t.parentId === task.id).length;
  const childDone = tasks.filter(t => t.parentId === task.id && t.status === 'done').length;
  const hasMedia = (task.media || []).length > 0;

  const { swipeState, handlers } = useSwipeGesture({
    threshold: 80,
    onSwipeLeft: tab === 'pending' ? () => completeTask(task.id) : undefined,
  });

  const deadlineInfo = task.deadline ? formatTimeRemaining(task.deadline, timezone) : null;
  const deadlineDisplay = task.deadline ? formatDeadlineDisplay(task.deadline, timezone) : null;

  // Drag handle refs
  const dragRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative overflow-hidden rounded-xl mb-2"
      style={{
        transform: swipeState.isSwiping ? `translateX(${swipeState.offsetX}px)` : 'translateX(0)',
        transition: swipeState.isSwiping ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {tab === 'pending' && (
        <div className="absolute inset-0 bg-[rgba(52,211,153,0.2)] flex items-center justify-end pr-6 rounded-xl">
          <CheckCircle2 size={24} className="text-[var(--success)]" />
        </div>
      )}

      <div
        {...handlers}
        className={`relative flex flex-col rounded-xl transition-colors ${
          isTimerActive
            ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]'
            : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)]'
        } ${tab === 'done' ? 'opacity-70' : ''}`}
      >
        <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: qConfig.color }} />

        <div className="flex items-start gap-2.5 px-4 py-3 pl-5">
          {tab === 'pending' && (
            <div ref={dragRef} className="text-[var(--text-muted)] cursor-grab active:cursor-grabbing touch-none mt-1">
              <GripVertical size={14} />
            </div>
          )}

          {tab === 'pending' && (
            <button
              onClick={() => completeTask(task.id)}
              className="size-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform mt-0.5"
              style={{ borderColor: qConfig.color }}
              aria-label="Hoàn thành"
            />
          )}

          {tab === 'done' && (
            <div className="size-6 rounded-full bg-[rgba(52,211,153,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 size={14} className="text-[var(--success)]" />
            </div>
          )}

          {tab === 'overdue' && (
            <div className="size-6 rounded-full bg-[rgba(248,113,113,0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={12} className="text-[var(--error)]" />
            </div>
          )}

          {/* Main content - clickable to edit */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
            <p className={`text-sm font-medium leading-relaxed break-words ${
              tab === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
            }`}>
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: qConfig.color }}>
                {qConfig.icon} {qConfig.label}
              </span>

              {task.recurring.type !== 'none' && (
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--info)]">
                  <RotateCcw size={9} /> {RECURRING_LABELS[task.recurring.type]}
                </span>
              )}

              {deadlineDisplay && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
                  deadlineInfo?.urgent ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'
                }`}>
                  <Calendar size={9} /> {deadlineDisplay}
                </span>
              )}

              {deadlineInfo && !deadlineInfo.overdue && (
                <span className={`text-[10px] font-mono tabular-nums ${deadlineInfo.urgent ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'}`}>
                  ({deadlineInfo.text})
                </span>
              )}

              {deadlineInfo?.overdue && tab !== 'overdue' && (
                <span className="text-[10px] font-medium text-[var(--error)]">{deadlineInfo.text}</span>
              )}

              {task.duration && task.duration > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)] font-mono tabular-nums">
                  <Clock size={9} /> {formatDuration(task.duration)}
                </span>
              )}

              {task.status === 'in_progress' && (
                <span className="text-[10px] text-[var(--accent-primary)] font-medium">Đang làm</span>
              )}

              {task.finance && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium font-mono ${task.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  <DollarSign size={9} /> {task.finance.type === 'income' ? '+' : '-'}{task.finance.amount.toLocaleString('vi-VN')}đ
                </span>
              )}

              {hasChildren && (
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
                  className="flex items-center gap-0.5 text-[10px] text-[var(--info)]"
                >
                  <ListTree size={9} /> {childDone}/{childCount}
                  {expanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
                </button>
              )}

              {hasMedia && (
                <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                  {task.media?.some(m => m.type === 'youtube') && <Youtube size={9} />}
                  {task.media?.some(m => m.type === 'image') && <ImageIcon size={9} />}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {(tab === 'pending') && !isTimerActive && (
              <button
                onClick={() => onStartTimer(task.id)}
                className="size-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)] active:opacity-70"
                aria-label="Bắt đầu"
              >
                <Play size={16} fill="currentColor" />
              </button>
            )}
            {(tab === 'done' || tab === 'overdue') && (
              <>
                <button onClick={() => restoreTask(task.id)} className="size-9 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] active:opacity-70">
                  <Undo2 size={16} />
                </button>
                <button onClick={() => removeTask(task.id)} className="size-9 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)] active:opacity-70">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {expanded && hasChildren && (
          <SubtaskList parentId={task.id} tab={tab} />
        )}
      </div>
    </div>
  );
}

export function TaskList() {
  const tasks = useTaskStore(s => s.tasks);
  const activeTab = useTaskStore(s => s.activeTab);
  const setActiveTab = useTaskStore(s => s.setActiveTab);
  const startTimer = useTaskStore(s => s.startTimer);
  const reorderTasks = useTaskStore(s => s.reorderTasks);
  const timer = useTaskStore(s => s.timer);
  const [quadrantFilter, setQuadrantFilter] = useState<EisenhowerQuadrant | 'all'>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Drag reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Only show root-level tasks (no parentId)
  const filteredTasks = tasks
    .filter((t) => {
      if (t.parentId) return false; // hide subtasks from main list
      if (activeTab === 'pending') {
        if (t.status !== 'pending' && t.status !== 'in_progress') return false;
        if (quadrantFilter !== 'all' && t.quadrant !== quadrantFilter) return false;
        return true;
      }
      if (activeTab === 'done') return t.status === 'done';
      return t.status === 'overdue';
    })
    .sort((a, b) => {
      if (activeTab === 'pending') {
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
        const qOrder: Record<EisenhowerQuadrant, number> = { do_first: 0, schedule: 1, delegate: 2, eliminate: 3 };
        const qDiff = qOrder[a.quadrant] - qOrder[b.quadrant];
        if (qDiff !== 0) return qDiff;
        return a.order - b.order;
      }
      return (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt);
    });

  const pendingCount = tasks.filter(t => (t.status === 'pending' || t.status === 'in_progress') && !t.parentId).length;
  const doneCount = tasks.filter(t => t.status === 'done' && !t.parentId).length;
  const overdueCount = tasks.filter(t => t.status === 'overdue' && !t.parentId).length;

  const handleStartTimer = useCallback((taskId: string) => {
    if (timer.isRunning || timer.isPaused) return;
    startTimer(taskId);
  }, [timer.isRunning, timer.isPaused, startTimer]);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      reorderTasks(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: 'Cần làm', count: pendingCount },
    { key: 'done', label: 'Hoàn thành', count: doneCount },
    { key: 'overdue', label: 'Quá hạn', count: overdueCount },
  ];

  const quadrantFilters: { key: EisenhowerQuadrant | 'all'; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'do_first', label: '🔴 Q1' },
    { key: 'schedule', label: '🔵 Q2' },
    { key: 'delegate', label: '🟡 Q3' },
    { key: 'eliminate', label: '⚪ Q4' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-elevated)] rounded-xl mb-3">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
              activeTab === key ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${
                activeTab === key
                  ? key === 'overdue' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' : 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)]'
                  : 'bg-[var(--bg-base)] text-[var(--text-muted)]'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'pending' && pendingCount > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {quadrantFilters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setQuadrantFilter(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors min-h-[32px] ${
                quadrantFilter === key
                  ? 'bg-[rgba(0,229,204,0.15)] text-[var(--accent-primary)] border border-[var(--border-accent)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-transparent'
              }`}
            >{label}</button>
          ))}
        </div>
      )}

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
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <div
              key={task.id}
              draggable={activeTab === 'pending'}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`transition-all ${dragIndex === index ? 'opacity-40 scale-95' : ''} ${dragOverIndex === index && dragIndex !== index ? 'border-t-2 border-[var(--accent-primary)]' : ''}`}
            >
              <TaskItem
                task={task}
                tab={activeTab}
                onStartTimer={handleStartTimer}
                onEdit={setEditingTask}
              />
            </div>
          ))
        )}
      </div>

      {editingTask && (
        <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}
