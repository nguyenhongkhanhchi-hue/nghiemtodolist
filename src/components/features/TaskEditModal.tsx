import { useState } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import {
  X, Save, Calendar, Clock, RotateCcw, Plus, Trash2,
  DollarSign, ChevronDown, ChevronRight, ListTree, Link2,
} from 'lucide-react';
import type { Task, EisenhowerQuadrant, RecurringType, TaskFinance } from '@/types';
import { QUADRANT_LABELS } from '@/types';

const RECURRING_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: 'none', label: 'Không' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekdays', label: 'T2-T6' },
  { value: 'weekly', label: 'Hàng tuần' },
];

interface TaskEditModalProps {
  task: Task;
  onClose: () => void;
}

export function TaskEditModal({ task, onClose }: TaskEditModalProps) {
  const updateTask = useTaskStore(s => s.updateTask);
  const addSubtask = useTaskStore(s => s.addSubtask);
  const tasks = useTaskStore(s => s.tasks);
  const removeTask = useTaskStore(s => s.removeTask);
  const assignAsSubtask = useTaskStore(s => s.assignAsSubtask);
  const unassignSubtask = useTaskStore(s => s.unassignSubtask);

  const [title, setTitle] = useState(task.title);
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>(task.quadrant);
  const [deadlineDate, setDeadlineDate] = useState(task.deadlineDate || '');
  const [deadlineTime, setDeadlineTime] = useState(task.deadlineTime || '');
  const [recurringType, setRecurringType] = useState<RecurringType>(task.recurring?.type || 'none');
  const [notes, setNotes] = useState(task.notes || '');
  const [finance, setFinance] = useState<TaskFinance | undefined>(task.finance);
  const [showFinance, setShowFinance] = useState(!!task.finance);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [xpReward, setXpReward] = useState(task.xpReward || 0);

  const subtasks = tasks.filter(t => t.parentId === task.id);
  // Tasks that can be assigned as subtasks: root tasks (no parentId), not this task, not done
  const availableTasks = tasks.filter(t =>
    !t.parentId && t.id !== task.id && t.status !== 'done' && !task.children?.includes(t.id)
  );
  // Available dependencies: other pending tasks that aren't children
  const availableDeps = tasks.filter(t =>
    t.id !== task.id && !t.parentId !== undefined && t.status !== 'done' && t.parentId !== task.id
  );

  const handleSave = () => {
    let deadline: number | undefined;
    if (deadlineDate) {
      const timeStr = deadlineTime || '23:59';
      deadline = new Date(`${deadlineDate}T${timeStr}:00`).getTime();
    }
    updateTask(task.id, {
      title: title.trim() || task.title,
      quadrant, deadline,
      deadlineDate: deadlineDate || undefined,
      deadlineTime: deadlineTime || undefined,
      recurring: { type: recurringType },
      notes: notes || undefined,
      finance: showFinance && finance ? finance : undefined,
      xpReward: xpReward > 0 ? xpReward : undefined,
    });
    onClose();
  };

  const handleAssignChild = (childId: string) => {
    assignAsSubtask(childId, task.id);
    setShowAddChild(false);
  };

  const handleToggleDependency = (depId: string) => {
    const current = task.dependsOn || [];
    const newDeps = current.includes(depId) ? current.filter(d => d !== depId) : [...current, depId];
    updateTask(task.id, { dependsOn: newDeps.length > 0 ? newDeps : undefined });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Chỉnh sửa việc</h2>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] text-[var(--bg-base)] active:opacity-80 min-h-[40px]">
              <Save size={14} /> Lưu
            </button>
            <button onClick={onClose} className="size-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Tên việc</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px]" />
          </div>

          {/* Quadrant */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Ma trận Eisenhower</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(QUADRANT_LABELS) as EisenhowerQuadrant[]).map(q => {
                const cfg = QUADRANT_LABELS[q];
                return (
                  <button key={q} onClick={() => setQuadrant(q)}
                    className={`py-2.5 rounded-lg text-[11px] font-medium min-h-[40px] border flex items-center justify-center gap-1.5 ${
                      quadrant === q ? 'border-current' : 'border-transparent bg-[var(--bg-surface)]'
                    }`}
                    style={quadrant === q ? { color: cfg.color, backgroundColor: `${cfg.color}15` } : {}}>
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* XP */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Điểm EXP thưởng</label>
            <input type="number" value={xpReward || ''} onChange={e => setXpReward(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0" className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px] font-mono" inputMode="numeric" />
          </div>

          {/* Deadline */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5"><Calendar size={12} /> Hạn chót</label>
            <div className="flex gap-2">
              <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px]" />
              <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px]" />
            </div>
          </div>

          {/* Recurring */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5"><RotateCcw size={12} /> Lặp lại</label>
            <div className="flex gap-1.5">
              {RECURRING_OPTIONS.map(r => (
                <button key={r.value} onClick={() => setRecurringType(r.value)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-medium min-h-[36px] ${
                    recurringType === r.value ? 'bg-[rgba(0,229,204,0.15)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                  }`}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Ghi chú</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú thêm..." rows={3}
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
          </div>

          {/* Subtasks - pick from existing */}
          <div>
            <button onClick={() => setShowSubtasks(!showSubtasks)}
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-2 w-full">
              {showSubtasks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <ListTree size={14} className="text-[var(--accent-primary)]" /> Việc con ({subtasks.length})
            </button>
            {showSubtasks && (
              <div className="space-y-1.5 ml-4">
                {subtasks.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <span className={`text-xs flex-1 ${sub.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{sub.title}</span>
                    <button onClick={() => unassignSubtask(sub.id)} className="text-[var(--text-muted)] active:text-[var(--error)]" title="Gỡ khỏi việc con"><X size={12} /></button>
                  </div>
                ))}
                <button onClick={() => setShowAddChild(!showAddChild)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-[var(--accent-primary)] bg-[var(--accent-dim)] active:opacity-70 min-h-[36px]">
                  <Plus size={12} /> Chọn việc con từ danh sách
                </button>
                {showAddChild && availableTasks.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                    {availableTasks.map(t => (
                      <button key={t.id} onClick={() => handleAssignChild(t.id)}
                        className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] last:border-b-0 min-h-[36px]">
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
                {showAddChild && availableTasks.length === 0 && (
                  <p className="text-[10px] text-[var(--text-muted)] px-3">Không còn việc nào để thêm</p>
                )}
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div>
            <button onClick={() => setShowDependencies(!showDependencies)}
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-2 w-full">
              {showDependencies ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Link2 size={14} className="text-[var(--info)]" /> Phụ thuộc ({task.dependsOn?.length || 0})
            </button>
            {showDependencies && (
              <div className="space-y-1 ml-4 max-h-40 overflow-y-auto">
                {availableDeps.slice(0, 20).map(dep => {
                  const isSelected = task.dependsOn?.includes(dep.id);
                  return (
                    <button key={dep.id} onClick={() => handleToggleDependency(dep.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left min-h-[36px] ${
                        isSelected ? 'bg-[rgba(96,165,250,0.1)] border border-[var(--info)] text-[var(--info)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}>
                      {isSelected ? '✓' : '○'} {dep.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Finance */}
          <div>
            <button onClick={() => { setShowFinance(!showFinance); if (!finance) setFinance({ type: 'expense', amount: 0 }); }}
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-2 w-full">
              {showFinance ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <DollarSign size={14} className="text-[var(--success)]" /> Thu chi
            </button>
            {showFinance && finance && (
              <div className="space-y-2 ml-4">
                <div className="flex gap-2">
                  <button onClick={() => setFinance({ ...finance, type: 'income' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[40px] ${finance.type === 'income' ? 'bg-[rgba(52,211,153,0.2)] text-[var(--success)] border border-[var(--success)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>+ Thu</button>
                  <button onClick={() => setFinance({ ...finance, type: 'expense' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[40px] ${finance.type === 'expense' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)] border border-[var(--error)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>- Chi</button>
                </div>
                <input type="number" value={finance.amount || ''} onChange={e => setFinance({ ...finance, amount: Math.max(0, parseInt(e.target.value) || 0) })}
                  placeholder="Số tiền (VNĐ)" className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px] font-mono" inputMode="numeric" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
