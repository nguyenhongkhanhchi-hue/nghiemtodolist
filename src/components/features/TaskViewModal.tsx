import { useState } from 'react';
import { useTaskStore, useSettingsStore, useTemplateStore } from '@/stores';
import { convertYoutubeUrl, isYoutubeUrl } from '@/lib/youtubeUtils';
import { formatTimeRemaining, formatDeadlineDisplay } from '@/lib/notifications';
import {
  X, Calendar, Clock, RotateCcw, DollarSign, ChevronDown, ChevronRight,
  ListTree, Image as ImageIcon, Youtube, Play, CheckCircle2, AlertTriangle,
  Link2, Eye, Edit3, Save,
} from 'lucide-react';
import type { Task, EisenhowerQuadrant, TaskFinance, MediaBlock } from '@/types';
import { QUADRANT_LABELS } from '@/types';

const RECURRING_LABELS: Record<string, string> = {
  none: 'Không', daily: 'Hàng ngày', weekdays: 'T2-T6', weekly: 'Hàng tuần', custom: 'Tùy chọn',
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

interface TaskViewModalProps {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
}

export function TaskViewModal({ task, onClose, onEdit }: TaskViewModalProps) {
  const tasks = useTaskStore(s => s.tasks);
  const updateTask = useTaskStore(s => s.updateTask);
  const completeTask = useTaskStore(s => s.completeTask);
  const startTimer = useTaskStore(s => s.startTimer);
  const timer = useTaskStore(s => s.timer);
  const hasChildren = useTaskStore(s => s.hasChildren);
  const timezone = useSettingsStore(s => s.timezone);
  const templates = useTemplateStore(s => s.templates);

  const subtasks = tasks.filter(t => t.parentId === task.id).sort((a, b) => a.order - b.order);
  const template = task.templateId ? templates.find(t => t.id === task.templateId) : null;
  const qConfig = QUADRANT_LABELS[task.quadrant];
  const deadlineInfo = task.deadline ? formatTimeRemaining(task.deadline, timezone) : null;
  const deadlineDisplay = task.deadline ? formatDeadlineDisplay(task.deadline, timezone) : null;
  const dependencies = task.dependsOn?.map(id => tasks.find(t => t.id === id)).filter(Boolean) as Task[] || [];
  const isTimerRunnable = !hasChildren(task.id) && (task.status === 'pending' || task.status === 'in_progress');
  const isTimerActive = timer.taskId === task.id && (timer.isRunning || timer.isPaused);

  // Finance editing
  const [editingFinance, setEditingFinance] = useState(false);
  const [financeType, setFinanceType] = useState<'income' | 'expense'>(task.finance?.type || 'expense');
  const [financeAmount, setFinanceAmount] = useState(task.finance?.amount || 0);
  const [financeNote, setFinanceNote] = useState(task.finance?.note || '');

  const saveFinance = () => {
    if (financeAmount > 0) {
      updateTask(task.id, { finance: { type: financeType, amount: financeAmount, note: financeNote || undefined } });
    } else {
      updateTask(task.id, { finance: undefined });
    }
    setEditingFinance(false);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-[var(--accent-primary)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Chi tiết việc</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] active:opacity-80 min-h-[40px]">
              <Edit3 size={14} /> Sửa
            </button>
            <button onClick={onClose} className="size-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Title & Status */}
          <div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-6 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: qConfig.color }} />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] break-words leading-relaxed">{task.title}</h3>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap ml-3">
              <span className="text-xs font-medium flex items-center gap-1" style={{ color: qConfig.color }}>
                {qConfig.icon} {qConfig.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                task.status === 'done' ? 'bg-[rgba(52,211,153,0.15)] text-[var(--success)]' :
                task.status === 'overdue' ? 'bg-[rgba(248,113,113,0.15)] text-[var(--error)]' :
                task.status === 'in_progress' ? 'bg-[rgba(251,191,36,0.15)] text-[var(--warning)]' :
                'bg-[var(--bg-surface)] text-[var(--text-muted)]'
              }`}>
                {task.status === 'done' ? 'Hoàn thành' : task.status === 'overdue' ? 'Quá hạn' : task.status === 'in_progress' ? 'Đang làm' : 'Chờ làm'}
              </span>
              {task.recurring.type !== 'none' && (
                <span className="flex items-center gap-0.5 text-xs text-[var(--info)]">
                  <RotateCcw size={10} /> {RECURRING_LABELS[task.recurring.type]}
                </span>
              )}
              {task.xpReward && task.xpReward > 0 && (
                <span className="text-xs font-mono text-[var(--accent-primary)]">+{task.xpReward} XP</span>
              )}
            </div>
          </div>

          {/* Deadline */}
          {deadlineDisplay && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-surface)]">
              <Calendar size={14} className={deadlineInfo?.urgent ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'} />
              <div>
                <span className={`text-sm ${deadlineInfo?.urgent ? 'text-[var(--error)] font-medium' : 'text-[var(--text-primary)]'}`}>
                  {deadlineDisplay}
                </span>
                {deadlineInfo && <span className="text-xs text-[var(--text-muted)] ml-2">({deadlineInfo.text})</span>}
              </div>
            </div>
          )}

          {/* Duration */}
          {task.duration && task.duration > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-surface)]">
              <Clock size={14} className="text-[var(--accent-primary)]" />
              <span className="text-sm text-[var(--text-primary)] font-mono">{formatDuration(task.duration)}</span>
            </div>
          )}

          {/* Dependencies */}
          {dependencies.length > 0 && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><Link2 size={12} /> Phụ thuộc vào</p>
              <div className="space-y-1">
                {dependencies.map(dep => (
                  <div key={dep.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)]">
                    {dep.status === 'done' ? <CheckCircle2 size={12} className="text-[var(--success)]" /> : <AlertTriangle size={12} className="text-[var(--warning)]" />}
                    <span className={`text-xs ${dep.status === 'done' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)]'}`}>{dep.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div className="px-3 py-2.5 rounded-xl bg-[var(--bg-surface)]">
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          {/* Media from template */}
          {template?.media && template.media.length > 0 && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><ImageIcon size={12} /> Nội dung hướng dẫn</p>
              <div className="space-y-2">
                {template.media.map(block => (
                  <div key={block.id} className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    {block.type === 'youtube' && (
                      <div className="aspect-video">
                        <iframe src={block.content} className="w-full h-full" allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                      </div>
                    )}
                    {block.type === 'image' && (
                      <img src={block.content} alt="" className="w-full max-h-48 object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/1A1A25/5A5A6E?text=Image'; }} />
                    )}
                    {block.type === 'text' && (
                      <p className="px-3 py-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">{block.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1">
                <ListTree size={12} /> Việc con ({subtasks.filter(s => s.status === 'done').length}/{subtasks.length})
              </p>
              <div className="space-y-1.5">
                {subtasks.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)]">
                    {sub.status === 'done'
                      ? <CheckCircle2 size={14} className="text-[var(--success)] flex-shrink-0" />
                      : <div className="size-3.5 rounded-full border border-[var(--text-muted)] flex-shrink-0" />
                    }
                    <span className={`text-sm flex-1 ${sub.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finance - editable */}
          <div className="px-3 py-3 rounded-xl bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1"><DollarSign size={12} /> Thu Chi</p>
              <button onClick={() => setEditingFinance(!editingFinance)}
                className="text-[10px] text-[var(--accent-primary)] active:opacity-70">
                {editingFinance ? 'Đóng' : task.finance ? 'Sửa' : 'Thêm'}
              </button>
            </div>
            {task.finance && !editingFinance && (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold font-mono ${task.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  {task.finance.type === 'income' ? '+' : '-'}{task.finance.amount.toLocaleString('vi-VN')}đ
                </span>
                {task.finance.note && <span className="text-xs text-[var(--text-muted)]">{task.finance.note}</span>}
              </div>
            )}
            {editingFinance && (
              <div className="space-y-2 mt-2">
                <div className="flex gap-2">
                  <button onClick={() => setFinanceType('income')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] ${financeType === 'income' ? 'bg-[rgba(52,211,153,0.2)] text-[var(--success)] border border-[var(--success)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                    + Thu
                  </button>
                  <button onClick={() => setFinanceType('expense')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] ${financeType === 'expense' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)] border border-[var(--error)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                    - Chi
                  </button>
                </div>
                <input type="number" value={financeAmount || ''} onChange={e => setFinanceAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Số tiền (VNĐ)" className="w-full bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[36px] font-mono" inputMode="numeric" />
                <input type="text" value={financeNote} onChange={e => setFinanceNote(e.target.value)}
                  placeholder="Ghi chú thu chi" className="w-full bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[36px]" />
                <button onClick={saveFinance}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] active:opacity-80 min-h-[36px] flex items-center justify-center gap-1">
                  <Save size={12} /> Lưu thu chi
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {task.status !== 'done' && (
            <div className="flex gap-2">
              {isTimerRunnable && !isTimerActive && (
                <button onClick={() => { startTimer(task.id); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] active:opacity-80 min-h-[44px]">
                  <Play size={16} fill="currentColor" /> Bắt đầu đếm giờ
                </button>
              )}
              <button onClick={() => { completeTask(task.id); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-[var(--success)] bg-[rgba(52,211,153,0.15)] active:opacity-80 min-h-[44px]">
                <CheckCircle2 size={16} /> Hoàn thành
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
