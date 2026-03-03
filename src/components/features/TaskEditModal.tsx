import { useState } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import {
  X, Save, Calendar, RotateCcw, Plus, DollarSign, ChevronDown, ChevronRight, ListTree, Link2, Check,
} from 'lucide-react';
import type { Task, EisenhowerQuadrant, RecurringType, TaskFinance } from '@/types';
import { QUADRANT_LABELS } from '@/types';

interface TaskEditModalProps { task: Task; onClose: () => void; }

export function TaskEditModal({ task, onClose }: TaskEditModalProps) {
  const updateTask = useTaskStore(s => s.updateTask);
  const tasks = useTaskStore(s => s.tasks);
  const assignAsSubtask = useTaskStore(s => s.assignAsSubtask);
  const unassignSubtask = useTaskStore(s => s.unassignSubtask);

  const [title, setTitle] = useState(task.title);
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>(task.quadrant);
  const [deadlineDate, setDeadlineDate] = useState(task.deadlineDate || '');
  const [deadlineTime, setDeadlineTime] = useState(task.deadlineTime || '');
  const [recurringType, setRecurringType] = useState<RecurringType>(task.recurring?.type || 'none');
  const [notes, setNotes] = useState(task.notes || '');
  const [finance, setFinance] = useState<TaskFinance | undefined>(task.finance);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [xpReward, setXpReward] = useState(task.xpReward || 0);
  const [showDeadline, setShowDeadline] = useState(!!task.deadline);
  const [showRecurring, setShowRecurring] = useState(task.recurring?.type !== 'none');
  const [showFinance, setShowFinance] = useState(!!task.finance);
  const [showNotes, setShowNotes] = useState(!!task.notes);

  const subtasks = tasks.filter(t => t.parentId === task.id);
  const availableTasks = tasks.filter(t => !t.parentId && t.id !== task.id && t.status !== 'done');
  const availableDeps = tasks.filter(t => t.id !== task.id && t.status !== 'done' && t.parentId !== task.id);

  const handleSave = () => {
    let deadline: number | undefined;
    if (showDeadline && deadlineDate) {
      deadline = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).getTime();
    }
    updateTask(task.id, {
      title: title.trim() || task.title, quadrant, deadline,
      deadlineDate: showDeadline ? deadlineDate : undefined, deadlineTime: showDeadline ? deadlineTime : undefined,
      recurring: { type: showRecurring ? recurringType : 'none' },
      notes: showNotes ? notes : undefined,
      finance: showFinance && finance ? finance : undefined,
      xpReward: xpReward > 0 ? xpReward : undefined,
    });
    onClose();
  };

  const toggles = [
    { key: 'deadline', label: '⏰ Hạn chót', active: showDeadline, toggle: () => setShowDeadline(!showDeadline) },
    { key: 'recurring', label: '🔁 Lặp lại', active: showRecurring, toggle: () => setShowRecurring(!showRecurring) },
    { key: 'finance', label: '💰 Thu/Chi', active: showFinance, toggle: () => { setShowFinance(!showFinance); if (!finance) setFinance({ type: 'expense', amount: 0 }); } },
    { key: 'notes', label: '📝 Ghi chú', active: showNotes, toggle: () => setShowNotes(!showNotes) },
  ];

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Chỉnh sửa</h2>
          <div className="flex gap-1.5">
            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-primary)] text-[var(--bg-base)] min-h-[32px]"><Save size={12} /> Lưu</button>
            <button onClick={onClose} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px]" />

          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(QUADRANT_LABELS) as EisenhowerQuadrant[]).map(q => {
              const cfg = QUADRANT_LABELS[q];
              return (
                <button key={q} onClick={() => setQuadrant(q)}
                  className={`py-2 rounded-lg text-[10px] font-medium min-h-[36px] border flex items-center justify-center gap-1 ${quadrant === q ? 'border-current' : 'border-transparent bg-[var(--bg-surface)]'}`}
                  style={quadrant === q ? { color: cfg.color, backgroundColor: `${cfg.color}15` } : {}}>
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>

          {/* XP */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-[var(--text-muted)]">EXP:</label>
            <input type="number" value={xpReward || ''} onChange={e => setXpReward(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] font-mono min-h-[32px]" inputMode="numeric" />
          </div>

          {/* Toggle options - side by side */}
          <div className="grid grid-cols-2 gap-2">
            {toggles.map(opt => (
              <button key={opt.key} onClick={opt.toggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium min-h-[34px] border ${opt.active ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                <div className={`size-3.5 rounded border flex items-center justify-center ${opt.active ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
                  {opt.active && <Check size={8} className="text-[var(--bg-base)]" />}
                </div>
                {opt.label}
              </button>
            ))}
          </div>

          {showDeadline && (
            <div className="flex gap-2 p-2 rounded-lg bg-[var(--bg-surface)]">
              <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
              <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
            </div>
          )}

          {showRecurring && (
            <div className="flex gap-1.5 p-2 rounded-lg bg-[var(--bg-surface)]">
              {(['none', 'daily', 'weekdays', 'weekly'] as RecurringType[]).map(r => (
                <button key={r} onClick={() => setRecurringType(r)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-medium min-h-[30px] ${recurringType === r ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                  {r === 'none' ? 'Không' : r === 'daily' ? 'Hàng ngày' : r === 'weekdays' ? 'T2-T6' : 'Hàng tuần'}
                </button>
              ))}
            </div>
          )}

          {showFinance && finance && (
            <div className="flex gap-2 p-2 rounded-lg bg-[var(--bg-surface)]">
              <select value={finance.type} onChange={e => setFinance({ ...finance, type: e.target.value as any })}
                className="bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px]">
                <option value="income">Thu</option><option value="expense">Chi</option>
              </select>
              <input type="number" value={finance.amount || ''} onChange={e => setFinance({ ...finance, amount: Math.max(0, parseInt(e.target.value) || 0) })}
                placeholder="Số tiền" className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px] font-mono" inputMode="numeric" />
            </div>
          )}

          {showNotes && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú..." rows={3}
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
          )}

          {/* Subtasks */}
          <div>
            <button onClick={() => setShowSubtasks(!showSubtasks)} className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-secondary)] mb-1.5">
              {showSubtasks ? <ChevronDown size={12} /> : <ChevronRight size={12} />} <ListTree size={12} /> Việc con ({subtasks.length})
            </button>
            {showSubtasks && (
              <div className="space-y-1 ml-3">
                {subtasks.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-surface)]">
                    <span className="text-[10px] flex-1 text-[var(--text-primary)]">{sub.title}</span>
                    <button onClick={() => unassignSubtask(sub.id)} className="text-[var(--text-muted)]"><X size={10} /></button>
                  </div>
                ))}
                <button onClick={() => setShowAddChild(!showAddChild)} className="text-[10px] text-[var(--accent-primary)] px-2 py-1"><Plus size={10} className="inline" /> Chọn việc con</button>
                {showAddChild && availableTasks.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)]">
                    {availableTasks.map(t => (
                      <button key={t.id} onClick={() => { assignAsSubtask(t.id, task.id); setShowAddChild(false); }}
                        className="w-full text-left px-3 py-1.5 text-[10px] text-[var(--text-primary)] border-b border-[var(--border-subtle)] last:border-b-0 min-h-[32px]">{t.title}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dependencies */}
          <div>
            <button onClick={() => setShowDeps(!showDeps)} className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-secondary)] mb-1.5">
              {showDeps ? <ChevronDown size={12} /> : <ChevronRight size={12} />} <Link2 size={12} /> Phụ thuộc ({task.dependsOn?.length || 0})
            </button>
            {showDeps && (
              <div className="space-y-1 ml-3 max-h-32 overflow-y-auto">
                {availableDeps.slice(0, 15).map(dep => {
                  const sel = task.dependsOn?.includes(dep.id);
                  return (
                    <button key={dep.id} onClick={() => {
                      const cur = task.dependsOn || [];
                      updateTask(task.id, { dependsOn: sel ? cur.filter(d => d !== dep.id) : [...cur, dep.id] });
                    }} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] text-left min-h-[30px] ${sel ? 'bg-[rgba(96,165,250,0.1)] text-[var(--info)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}>
                      {sel ? '✓' : '○'} {dep.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
