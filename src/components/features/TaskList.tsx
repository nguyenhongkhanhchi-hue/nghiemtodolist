import { useState, useMemo } from 'react';
import { useTaskStore, useSettingsStore, useTemplateStore } from '@/stores';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { formatTimeRemaining, formatDeadlineDisplay } from '@/lib/notifications';
import { TaskViewModal, DelegateSummaryModal } from '@/components/features/TaskViewModal';
import { TaskEditModal } from '@/components/features/TaskEditModal';
import {
  CheckCircle2, GripVertical, RotateCcw, Trash2, Undo2,
  Clock, Calendar, DollarSign, FileText,
} from 'lucide-react';
import type { Task, TabType, EisenhowerQuadrant } from '@/types';
import { QUADRANT_LABELS } from '@/types';

function formatDuration(s: number) {
  if (s === 0) return '0s';
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function TaskItem({ task, tab, onView }: { task: Task; tab: TabType; onView: (task: Task) => void }) {
  const completeTask = useTaskStore(s => s.completeTask);
  const restoreTask = useTaskStore(s => s.restoreTask);
  const removeTask = useTaskStore(s => s.removeTask);
  const updateTask = useTaskStore(s => s.updateTask);
  const timer = useTaskStore(s => s.timer);
  const timezone = useSettingsStore(s => s.timezone);
  const [showDelegate, setShowDelegate] = useState(false);

  const isTimerActive = timer.taskId === task.id && (timer.isRunning || timer.isPaused);
  const qConfig = QUADRANT_LABELS[task.quadrant];
  const deadlineInfo = task.deadline ? formatTimeRemaining(task.deadline, timezone) : null;
  const deadlineDisplay = task.deadline ? formatDeadlineDisplay(task.deadline, timezone) : null;

  const { handlers } = useSwipeGesture({
    threshold: 80,
    onSwipeLeft: tab === 'pending' || tab === 'paused' ? () => completeTask(task.id) : undefined,
    onSwipeRight: tab === 'pending' || tab === 'paused' ? () => {
      const order: EisenhowerQuadrant[] = ['do_first', 'schedule', 'delegate', 'eliminate'];
      const idx = order.indexOf(task.quadrant);
      const next = order[(idx + 1) % order.length];
      updateTask(task.id, { quadrant: next });
      if (next === 'delegate') setShowDelegate(true);
    } : undefined,
  });

  return (
    <>
      <div {...handlers}
        className={`relative flex flex-col rounded-xl mb-1.5 ${
          isTimerActive ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]'
          : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)]'
        } ${tab === 'done' ? 'opacity-70' : ''}`}>
        <div className="absolute top-0 left-0 w-0.5 h-full rounded-l-xl" style={{ backgroundColor: qConfig.color }} />

        <div className="flex items-start gap-2 px-3 py-2.5 pl-3.5">
          {(tab === 'pending' || tab === 'paused') && <div className="text-[var(--text-muted)] cursor-grab active:cursor-grabbing touch-none mt-1"><GripVertical size={12} /></div>}
          {(tab === 'pending' || tab === 'paused') && (
            <button onClick={() => completeTask(task.id)} className="size-5 rounded-full border-2 flex-shrink-0 mt-0.5" style={{ borderColor: qConfig.color }} />
          )}
          {tab === 'in_progress' && <Clock size={14} className="text-[var(--warning)] flex-shrink-0 mt-0.5 animate-pulse" />}
          {tab === 'done' && <CheckCircle2 size={14} className="text-[var(--success)] flex-shrink-0 mt-0.5" />}
          {tab === 'overdue' && <div className="size-3 rounded-full bg-[var(--error)] flex-shrink-0 mt-1" />}

          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(task)}>
            <p className={`text-sm font-medium break-words leading-snug ${tab === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[9px] font-medium" style={{ color: qConfig.color }}>{qConfig.icon} {qConfig.label}</span>
              {task.showRecurring && task.recurring.type !== 'none' && <span className="text-[9px] text-[var(--info)]"><RotateCcw size={8} className="inline" /></span>}
              {task.showDeadline && deadlineDisplay && (
                <span className={`text-[9px] ${deadlineInfo?.urgent ? 'text-[var(--error)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                  <Calendar size={8} className="inline" /> {deadlineInfo?.text || deadlineDisplay}
                </span>
              )}
              {task.duration && task.duration > 0 && <span className="text-[9px] text-[var(--text-muted)] font-mono"><Clock size={8} className="inline" /> {formatDuration(task.duration)}</span>}
              {task.showFinance && task.finance && (
                <span className={`text-[9px] font-mono ${task.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  {task.finance.type === 'income' ? '+' : '-'}{task.finance.amount.toLocaleString('vi-VN')}đ
                </span>
              )}
              {task.templateId && <FileText size={8} className="text-[var(--text-muted)] inline" />}
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {(tab === 'done' || tab === 'overdue') && (
              <>
                <button onClick={() => restoreTask(task.id)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><Undo2 size={14} /></button>
                <button onClick={() => removeTask(task.id)} className="size-8 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]"><Trash2 size={12} /></button>
              </>
            )}
          </div>
        </div>
      </div>
      {showDelegate && <DelegateSummaryModal task={task} onClose={() => setShowDelegate(false)} />}
    </>
  );
}

export function TaskList() {
  const tasks = useTaskStore(s => s.tasks);
  const activeTab = useTaskStore(s => s.activeTab);
  const setActiveTab = useTaskStore(s => s.setActiveTab);
  const reorderTasks = useTaskStore(s => s.reorderTasks);
  const timer = useTaskStore(s => s.timer);
  const timezone = useSettingsStore(s => s.timezone);
  const [quadrantFilter, setQuadrantFilter] = useState<EisenhowerQuadrant | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Counts per quadrant
  const qCounts = useMemo(() => {
    const counts = { do_first: 0, schedule: 0, delegate: 0, eliminate: 0 };
    tasks.forEach(t => {
      if (t.status === 'pending' || t.status === 'in_progress' || t.status === 'paused') {
        counts[t.quadrant]++;
      }
    });
    return counts;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (activeTab === 'pending') {
        if (t.status !== 'pending') return false;
        if (quadrantFilter && t.quadrant !== quadrantFilter) return false;
        return true;
      }
      if (activeTab === 'in_progress') return t.status === 'in_progress';
      if (activeTab === 'paused') return t.status === 'paused';
      if (activeTab === 'done') return t.status === 'done';
      return t.status === 'overdue';
    }).sort((a, b) => {
      if (activeTab === 'pending') {
        // Sort by remaining time (deadline) if both have deadline
        if (a.deadline && b.deadline) return a.deadline - b.deadline;
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;
        const qo: Record<EisenhowerQuadrant, number> = { do_first: 0, schedule: 1, delegate: 2, eliminate: 3 };
        const d = qo[a.quadrant] - qo[b.quadrant];
        if (d !== 0) return d;
        return a.order - b.order;
      }
      return (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt);
    });
  }, [tasks, activeTab, quadrantFilter, timezone]);

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const pausedCount = tasks.filter(t => t.status === 'paused').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const overdueCount = tasks.filter(t => t.status === 'overdue').length;

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: 'Chưa làm', count: pendingCount },
    { key: 'in_progress', label: 'Đang làm', count: inProgressCount },
    { key: 'paused', label: 'Tạm dừng', count: pausedCount },
    { key: 'done', label: 'Xong', count: doneCount },
    { key: 'overdue', label: 'Quá hạn', count: overdueCount },
  ];

  const quadrantFilters: { key: EisenhowerQuadrant; label: string; count: number }[] = [
    { key: 'do_first', label: '🔴 Làm ngay', count: qCounts.do_first },
    { key: 'schedule', label: '🔵 Lên lịch', count: qCounts.schedule },
    { key: 'delegate', label: '🟡 Ủy thác', count: qCounts.delegate },
    { key: 'eliminate', label: '⚪ Loại bỏ', count: qCounts.eliminate },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Eisenhower quadrant bar - MAIN, full width, prominent */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {quadrantFilters.map(({ key, label, count }) => {
          const cfg = QUADRANT_LABELS[key];
          const isActive = quadrantFilter === key;
          return (
            <button key={key} onClick={() => setQuadrantFilter(isActive ? null : key)}
              className={`py-2 rounded-xl text-center min-h-[44px] border transition-all ${
                isActive ? 'border-current shadow-sm' : 'border-transparent bg-[var(--bg-elevated)]'
              }`}
              style={isActive ? { color: cfg.color, backgroundColor: `${cfg.color}12`, borderColor: cfg.color } : {}}>
              <p className={`text-lg font-bold font-mono tabular-nums leading-none ${isActive ? '' : 'text-[var(--text-primary)]'}`}>{count}</p>
              <p className={`text-[8px] font-medium mt-0.5 ${isActive ? '' : 'text-[var(--text-muted)]'}`}>{label}</p>
            </button>
          );
        })}
      </div>

      {/* Status tabs */}
      <div className="flex gap-0.5 p-0.5 bg-[var(--bg-elevated)] rounded-xl mb-2 overflow-x-auto">
        {tabs.map(({ key, label, count }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium min-h-[32px] flex items-center justify-center gap-1 whitespace-nowrap px-1.5 ${
              activeTab === key ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'
            }`}>
            {label}
            {count > 0 && <span className={`min-w-[16px] h-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1 ${
              activeTab === key ? (key === 'overdue' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' : 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)]') : 'bg-[var(--bg-base)] text-[var(--text-muted)]'
            }`}>{count}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-36 -mx-1 px-1">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-2xl mb-2">{activeTab === 'pending' ? '📋' : activeTab === 'done' ? '✅' : activeTab === 'in_progress' ? '⏱️' : activeTab === 'paused' ? '⏸️' : '⏰'}</span>
            <p className="text-xs text-[var(--text-muted)]">
              {activeTab === 'pending' ? 'Chưa có việc' : activeTab === 'done' ? 'Chưa xong việc nào' : activeTab === 'in_progress' ? 'Không có việc đang làm' : activeTab === 'paused' ? 'Không có việc tạm dừng' : 'Không quá hạn'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <div key={task.id} draggable={activeTab === 'pending'}
              onDragStart={() => setDragIndex(index)} onDragOver={e => { e.preventDefault(); setDragOverIndex(index); }}
              onDrop={() => { if (dragIndex !== null && dragIndex !== index) reorderTasks(dragIndex, index); setDragIndex(null); setDragOverIndex(null); }}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              className={`${dragIndex === index ? 'opacity-40 scale-95' : ''} ${dragOverIndex === index && dragIndex !== index ? 'border-t-2 border-[var(--accent-primary)]' : ''}`}>
              <TaskItem task={task} tab={activeTab} onView={setViewingTask} />
            </div>
          ))
        )}
      </div>

      {viewingTask && <TaskViewModal task={viewingTask} onClose={() => setViewingTask(null)} onEdit={() => { setEditingTask(viewingTask); setViewingTask(null); }} />}
      {editingTask && <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} />}
    </div>
  );
}
