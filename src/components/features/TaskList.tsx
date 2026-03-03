import { useCallback, useState } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { formatTimeRemaining, formatDeadlineDisplay } from '@/lib/notifications';
import { TaskViewModal } from '@/components/features/TaskViewModal';
import { TaskEditModal } from '@/components/features/TaskEditModal';
import {
  Play, CheckCircle2, GripVertical, RotateCcw, Trash2, Undo2,
  Clock, Calendar, AlertTriangle, ChevronDown, ChevronRight,
  DollarSign, ListTree, Link2, Lock, Search, X,
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

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--accent-primary)] transition-all" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-[9px] font-mono text-[var(--accent-primary)] tabular-nums">{percent}%</span>
    </div>
  );
}

function TaskItem({ task, tab, onStartTimer, onView }: { task: Task; tab: TabType; onStartTimer: (id: string) => void; onView: (task: Task) => void }) {
  const completeTask = useTaskStore(s => s.completeTask);
  const restoreTask = useTaskStore(s => s.restoreTask);
  const removeTask = useTaskStore(s => s.removeTask);
  const updateTask = useTaskStore(s => s.updateTask);
  const timer = useTaskStore(s => s.timer);
  const canStartTask = useTaskStore(s => s.canStartTask);
  const hasChildren = useTaskStore(s => s.hasChildren);
  const getGroupProgress = useTaskStore(s => s.getGroupProgress);
  const timezone = useSettingsStore(s => s.timezone);
  const [expanded, setExpanded] = useState(false);

  const isTimerActive = timer.taskId === task.id && (timer.isRunning || timer.isPaused);
  const qConfig = QUADRANT_LABELS[task.quadrant];
  const hasChildTasks = hasChildren(task.id);
  const canStart = canStartTask(task.id);
  const depsBlocked = (task.dependsOn?.length || 0) > 0 && !canStart;
  const isTimerRunnable = !hasChildTasks && canStart;
  const progress = hasChildTasks ? getGroupProgress(task.id) : null;
  const deadlineInfo = task.deadline ? formatTimeRemaining(task.deadline, timezone) : null;
  const deadlineDisplay = task.deadline ? formatDeadlineDisplay(task.deadline, timezone) : null;

  // Swipe right to cycle quadrant
  const { swipeState, handlers } = useSwipeGesture({
    threshold: 80,
    onSwipeLeft: tab === 'pending' ? () => completeTask(task.id) : undefined,
    onSwipeRight: tab === 'pending' ? () => {
      const order: EisenhowerQuadrant[] = ['do_first', 'schedule', 'delegate', 'eliminate'];
      const idx = order.indexOf(task.quadrant);
      const next = order[(idx + 1) % order.length];
      updateTask(task.id, { quadrant: next });
    } : undefined,
  });

  return (
    <div className="relative overflow-hidden rounded-xl mb-1.5"
      style={{
        transform: swipeState.isSwiping ? `translateX(${swipeState.offsetX}px)` : 'translateX(0)',
        transition: swipeState.isSwiping ? 'none' : 'transform 0.3s ease-out',
      }}>
      {tab === 'pending' && (
        <>
          <div className="absolute inset-0 bg-[rgba(52,211,153,0.2)] flex items-center justify-end pr-6 rounded-xl">
            <CheckCircle2 size={20} className="text-[var(--success)]" />
          </div>
          <div className="absolute inset-0 bg-[rgba(251,191,36,0.2)] flex items-center justify-start pl-6 rounded-xl">
            <RotateCcw size={20} className="text-[var(--warning)]" />
          </div>
        </>
      )}

      <div {...handlers}
        className={`relative flex flex-col rounded-xl ${
          isTimerActive ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]'
          : depsBlocked ? 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] opacity-50'
          : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)]'
        } ${tab === 'done' ? 'opacity-70' : ''}`}>
        <div className="absolute top-0 left-0 w-0.5 h-full rounded-l-xl" style={{ backgroundColor: qConfig.color }} />

        <div className="flex items-start gap-2 px-3 py-2.5 pl-3.5">
          {tab === 'pending' && <div className="text-[var(--text-muted)] cursor-grab active:cursor-grabbing touch-none mt-1"><GripVertical size={12} /></div>}
          {tab === 'pending' && (
            <button onClick={() => completeTask(task.id)} className="size-5 rounded-full border-2 flex-shrink-0 mt-0.5" style={{ borderColor: qConfig.color }} />
          )}
          {tab === 'done' && <CheckCircle2 size={14} className="text-[var(--success)] flex-shrink-0 mt-0.5" />}
          {tab === 'overdue' && <AlertTriangle size={12} className="text-[var(--error)] flex-shrink-0 mt-1" />}

          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(task)}>
            <p className={`text-sm font-medium break-words leading-snug ${tab === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
              {depsBlocked && <Lock size={9} className="inline mr-1 text-[var(--warning)]" />}
              {task.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[9px] font-medium" style={{ color: qConfig.color }}>{qConfig.icon} {qConfig.label}</span>
              {task.recurring.type !== 'none' && <span className="text-[9px] text-[var(--info)]"><RotateCcw size={8} className="inline" /></span>}
              {deadlineDisplay && <span className={`text-[9px] ${deadlineInfo?.urgent ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'}`}><Calendar size={8} className="inline" /> {deadlineDisplay}</span>}
              {task.duration && task.duration > 0 && <span className="text-[9px] text-[var(--text-muted)] font-mono"><Clock size={8} className="inline" /> {formatDuration(task.duration)}</span>}
              {task.finance && <span className={`text-[9px] font-mono ${task.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{task.finance.type === 'income' ? '+' : '-'}{task.finance.amount.toLocaleString('vi-VN')}đ</span>}
              {task.xpReward && <span className="text-[9px] text-[var(--accent-primary)] font-mono">+{task.xpReward}XP</span>}
              {hasChildTasks && (
                <button onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} className="text-[9px] text-[var(--info)] flex items-center">
                  <ListTree size={8} className="inline" /> {progress?.done}/{progress?.total}
                  {expanded ? <ChevronDown size={8} /> : <ChevronRight size={8} />}
                </button>
              )}
            </div>
            {progress && <ProgressBar percent={progress.percent} />}
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {tab === 'pending' && isTimerRunnable && !isTimerActive && (
              <button onClick={() => onStartTimer(task.id)} className="size-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]">
                <Play size={14} fill="currentColor" />
              </button>
            )}
            {(tab === 'done' || tab === 'overdue') && (
              <>
                <button onClick={() => restoreTask(task.id)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><Undo2 size={14} /></button>
                <button onClick={() => removeTask(task.id)} className="size-8 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]"><Trash2 size={12} /></button>
              </>
            )}
          </div>
        </div>

        {expanded && hasChildTasks && <SubtaskList parentId={task.id} />}
      </div>
    </div>
  );
}

function SubtaskList({ parentId }: { parentId: string }) {
  const tasks = useTaskStore(s => s.tasks);
  const completeTask = useTaskStore(s => s.completeTask);
  const startTimer = useTaskStore(s => s.startTimer);
  const timer = useTaskStore(s => s.timer);
  const subtasks = tasks.filter(t => t.parentId === parentId).sort((a, b) => a.order - b.order);
  if (!subtasks.length) return null;

  return (
    <div className="px-3 pb-2 space-y-1">
      {subtasks.map(sub => (
        <div key={sub.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)]">
          {sub.status !== 'done' ? (
            <button onClick={() => completeTask(sub.id)} className="size-3.5 rounded-full border border-[var(--text-muted)] flex-shrink-0" />
          ) : (
            <CheckCircle2 size={12} className="text-[var(--success)] flex-shrink-0" />
          )}
          <span className={`text-[11px] flex-1 ${sub.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{sub.title}</span>
          {sub.duration && sub.duration > 0 && <span className="text-[8px] text-[var(--text-muted)] font-mono">{formatDuration(sub.duration)}</span>}
          {sub.status !== 'done' && !(timer.isRunning || timer.isPaused) && (
            <button onClick={() => startTimer(sub.id)} className="size-6 rounded flex items-center justify-center text-[var(--accent-primary)]">
              <Play size={10} fill="currentColor" />
            </button>
          )}
        </div>
      ))}
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
  const searchQuery = useTaskStore(s => s.searchQuery);
  const setSearchQuery = useTaskStore(s => s.setSearchQuery);
  const [quadrantFilter, setQuadrantFilter] = useState<EisenhowerQuadrant | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const query = searchQuery.toLowerCase().trim();
  const filteredTasks = tasks.filter(t => {
    if (t.parentId) return false;
    if (query && !t.title.toLowerCase().includes(query)) return false;
    if (activeTab === 'pending') {
      if (t.status !== 'pending' && t.status !== 'in_progress') return false;
      if (quadrantFilter && t.quadrant !== quadrantFilter) return false;
      return true;
    }
    if (activeTab === 'done') return t.status === 'done';
    return t.status === 'overdue';
  }).sort((a, b) => {
    if (activeTab === 'pending') {
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
      const qo: Record<EisenhowerQuadrant, number> = { do_first: 0, schedule: 1, delegate: 2, eliminate: 3 };
      const d = qo[a.quadrant] - qo[b.quadrant];
      if (d !== 0) return d;
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

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: 'Cần làm', count: pendingCount },
    { key: 'done', label: 'Xong', count: doneCount },
    { key: 'overdue', label: 'Quá hạn', count: overdueCount },
  ];

  const quadrantFilters: { key: EisenhowerQuadrant; label: string }[] = [
    { key: 'do_first', label: '🔴 Làm ngay' },
    { key: 'schedule', label: '🔵 Lên lịch' },
    { key: 'delegate', label: '🟡 Ủy thác' },
    { key: 'eliminate', label: '⚪ Loại bỏ' },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-0.5 p-0.5 bg-[var(--bg-elevated)] rounded-xl flex-1">
          {tabs.map(({ key, label, count }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-medium min-h-[38px] flex items-center justify-center gap-1 ${activeTab === key ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
              {label}
              {count > 0 && <span className={`size-4 rounded-full text-[8px] font-bold flex items-center justify-center ${activeTab === key ? (key === 'overdue' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' : 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)]') : 'bg-[var(--bg-base)] text-[var(--text-muted)]'}`}>{count}</span>}
            </button>
          ))}
        </div>
        <button onClick={() => setShowSearch(!showSearch)}
          className={`size-9 rounded-xl flex items-center justify-center ${showSearch ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
          <Search size={14} />
        </button>
      </div>

      {showSearch && (
        <div className="relative mb-2">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm..." autoFocus
            className="w-full bg-[var(--bg-elevated)] rounded-xl pl-8 pr-8 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[36px]" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><X size={12} /></button>}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="flex gap-1 mb-2 overflow-x-auto pb-0.5">
          {quadrantFilters.map(({ key, label }) => (
            <button key={key} onClick={() => setQuadrantFilter(quadrantFilter === key ? null : key)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium min-h-[28px] ${quadrantFilter === key ? 'bg-[rgba(0,229,204,0.15)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-36 -mx-1 px-1">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-2xl mb-2">{activeTab === 'pending' ? '📋' : activeTab === 'done' ? '✅' : '⏰'}</span>
            <p className="text-xs text-[var(--text-muted)]">
              {query ? 'Không tìm thấy' : activeTab === 'pending' ? 'Chưa có việc' : activeTab === 'done' ? 'Chưa xong việc nào' : 'Không quá hạn'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <div key={task.id} draggable={activeTab === 'pending'}
              onDragStart={() => setDragIndex(index)} onDragOver={e => { e.preventDefault(); setDragOverIndex(index); }}
              onDrop={() => { if (dragIndex !== null && dragIndex !== index) reorderTasks(dragIndex, index); setDragIndex(null); setDragOverIndex(null); }}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              className={`${dragIndex === index ? 'opacity-40 scale-95' : ''} ${dragOverIndex === index && dragIndex !== index ? 'border-t-2 border-[var(--accent-primary)]' : ''}`}>
              <TaskItem task={task} tab={activeTab} onStartTimer={handleStartTimer} onView={setViewingTask} />
            </div>
          ))
        )}
      </div>

      {viewingTask && <TaskViewModal task={viewingTask} onClose={() => setViewingTask(null)} onEdit={() => { setEditingTask(viewingTask); setViewingTask(null); }} />}
      {editingTask && <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} />}
    </div>
  );
}
