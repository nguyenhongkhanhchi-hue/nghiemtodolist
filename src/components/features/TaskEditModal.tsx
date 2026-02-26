import { useState, useEffect } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { convertYoutubeUrl, isYoutubeUrl } from '@/lib/youtubeUtils';
import {
  X, Save, Calendar, Clock, RotateCcw, Plus, Trash2, Image,
  Youtube, Type, DollarSign, ChevronDown, ChevronRight, ListTree,
} from 'lucide-react';
import type { Task, EisenhowerQuadrant, RecurringType, MediaBlock, TaskFinance } from '@/types';

const QUADRANT_CONFIG = [
  { value: 'do_first' as const, label: 'Q1 Làm ngay', icon: '🔴', color: 'var(--error)' },
  { value: 'schedule' as const, label: 'Q2 Lên lịch', icon: '🔵', color: 'var(--accent-primary)' },
  { value: 'delegate' as const, label: 'Q3 Ủy thác', icon: '🟡', color: 'var(--warning)' },
  { value: 'eliminate' as const, label: 'Q4 Loại bỏ', icon: '⚪', color: 'var(--text-muted)' },
];

const RECURRING_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: 'none', label: 'Không' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekdays', label: 'T2-T6' },
  { value: 'weekly', label: 'Hàng tuần' },
];

function generateBlockId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

interface TaskEditModalProps {
  task: Task;
  onClose: () => void;
}

export function TaskEditModal({ task, onClose }: TaskEditModalProps) {
  const updateTask = useTaskStore(s => s.updateTask);
  const addSubtask = useTaskStore(s => s.addSubtask);
  const tasks = useTaskStore(s => s.tasks);
  const removeTask = useTaskStore(s => s.removeTask);

  const [title, setTitle] = useState(task.title);
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>(task.quadrant);
  const [deadlineDate, setDeadlineDate] = useState(task.deadlineDate || '');
  const [deadlineTime, setDeadlineTime] = useState(task.deadlineTime || '');
  const [recurringType, setRecurringType] = useState<RecurringType>(task.recurring?.type || 'none');
  const [notes, setNotes] = useState(task.notes || '');
  const [mediaBlocks, setMediaBlocks] = useState<MediaBlock[]>(task.media || []);
  const [finance, setFinance] = useState<TaskFinance | undefined>(task.finance);
  const [showFinance, setShowFinance] = useState(!!task.finance);
  const [showMedia, setShowMedia] = useState((task.media || []).length > 0);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [newSubtask, setNewSubtask] = useState('');
  const [mediaInput, setMediaInput] = useState('');

  const subtasks = tasks.filter(t => t.parentId === task.id);

  const handleSave = () => {
    let deadline: number | undefined;
    if (deadlineDate) {
      const timeStr = deadlineTime || '23:59';
      deadline = new Date(`${deadlineDate}T${timeStr}:00`).getTime();
    }
    updateTask(task.id, {
      title: title.trim() || task.title,
      quadrant,
      deadline,
      deadlineDate: deadlineDate || undefined,
      deadlineTime: deadlineTime || undefined,
      recurring: { type: recurringType },
      notes: notes || undefined,
      media: mediaBlocks.length > 0 ? mediaBlocks : undefined,
      finance: showFinance ? finance : undefined,
    });
    onClose();
  };

  const addMediaBlock = (type: MediaBlock['type'], content: string) => {
    const block: MediaBlock = { id: generateBlockId(), type, content };
    setMediaBlocks(prev => [...prev, block]);
  };

  const removeMediaBlock = (id: string) => {
    setMediaBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleAddMedia = () => {
    const val = mediaInput.trim();
    if (!val) return;
    if (isYoutubeUrl(val)) {
      const embedUrl = convertYoutubeUrl(val);
      if (embedUrl) {
        addMediaBlock('youtube', embedUrl);
      }
    } else if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(val)) {
      addMediaBlock('image', val);
    } else {
      addMediaBlock('text', val);
    }
    setMediaInput('');
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    addSubtask(task.id, newSubtask.trim(), quadrant);
    setNewSubtask('');
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Chỉnh sửa việc</h2>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] text-[var(--bg-base)] active:opacity-80 min-h-[40px]">
              <Save size={14} /> Lưu
            </button>
            <button onClick={onClose} className="size-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Tên việc</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px]"
            />
          </div>

          {/* Quadrant */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1.5 block">Ma trận Eisenhower</label>
            <div className="grid grid-cols-2 gap-1.5">
              {QUADRANT_CONFIG.map(q => (
                <button
                  key={q.value}
                  onClick={() => setQuadrant(q.value)}
                  className={`py-2.5 rounded-lg text-[11px] font-medium min-h-[40px] border flex items-center justify-center gap-1.5 transition-colors ${
                    quadrant === q.value ? 'border-current' : 'border-transparent bg-[var(--bg-surface)]'
                  }`}
                  style={quadrant === q.value ? { color: q.color, backgroundColor: `${q.color}15` } : {}}
                >
                  {q.icon} {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
              <Calendar size={12} /> Hạn chót
            </label>
            <div className="flex gap-2">
              <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[40px]" />
              <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[40px]" />
            </div>
          </div>

          {/* Recurring */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
              <RotateCcw size={12} /> Lặp lại
            </label>
            <div className="flex gap-1.5">
              {RECURRING_OPTIONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRecurringType(r.value)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-medium min-h-[36px] transition-colors ${
                    recurringType === r.value
                      ? 'bg-[rgba(0,229,204,0.15)] text-[var(--accent-primary)] border border-[var(--border-accent)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-transparent'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Ghi chú</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ghi chú thêm..."
              rows={3}
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] resize-none"
            />
          </div>

          {/* Subtasks */}
          <div>
            <button
              onClick={() => setShowSubtasks(!showSubtasks)}
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-2 w-full"
            >
              {showSubtasks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <ListTree size={14} className="text-[var(--accent-primary)]" />
              Việc con ({subtasks.length})
            </button>
            {showSubtasks && (
              <div className="space-y-1.5 ml-4">
                {subtasks.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <span className={`text-xs flex-1 ${sub.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                      {sub.title}
                    </span>
                    <button onClick={() => removeTask(sub.id)} className="text-[var(--text-muted)] active:text-[var(--error)]">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Thêm việc con..."
                    className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[36px]"
                  />
                  <button onClick={handleAddSubtask} className="size-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Media blocks */}
          <div>
            <button
              onClick={() => setShowMedia(!showMedia)}
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-2 w-full"
            >
              {showMedia ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Image size={14} className="text-[var(--accent-primary)]" />
              Nội dung đa phương tiện ({mediaBlocks.length})
            </button>
            {showMedia && (
              <div className="space-y-2">
                {mediaBlocks.map(block => (
                  <div key={block.id} className="relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    {block.type === 'youtube' && (
                      <div className="aspect-video">
                        <iframe src={block.content} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                      </div>
                    )}
                    {block.type === 'image' && (
                      <img src={block.content} alt="" className="w-full max-h-48 object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/1A1A25/5A5A6E?text=Image'; }} />
                    )}
                    {block.type === 'text' && (
                      <p className="px-3 py-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">{block.content}</p>
                    )}
                    <button
                      onClick={() => removeMediaBlock(block.id)}
                      className="absolute top-2 right-2 size-7 rounded-lg bg-black/60 flex items-center justify-center text-white active:opacity-70"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mediaInput}
                    onChange={e => setMediaInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMedia()}
                    placeholder="Dán link YouTube, ảnh, hoặc nhập text..."
                    className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[36px]"
                  />
                  <button onClick={handleAddMedia} className="size-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => addMediaBlock('text', '')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] bg-[var(--bg-surface)] text-[var(--text-muted)]">
                    <Type size={10} /> Text
                  </button>
                  <button onClick={() => { setMediaInput(''); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] bg-[var(--bg-surface)] text-[var(--text-muted)]">
                    <Youtube size={10} /> YouTube
                  </button>
                  <button onClick={() => { setMediaInput(''); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] bg-[var(--bg-surface)] text-[var(--text-muted)]">
                    <Image size={10} /> Ảnh
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Finance */}
          <div>
            <button
              onClick={() => { setShowFinance(!showFinance); if (!finance) setFinance({ type: 'expense', amount: 0 }); }}
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-2 w-full"
            >
              {showFinance ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <DollarSign size={14} className="text-[var(--success)]" />
              Thu chi {finance ? `(${finance.type === 'income' ? '+' : '-'}${finance.amount.toLocaleString('vi-VN')}đ)` : ''}
            </button>
            {showFinance && finance && (
              <div className="space-y-2 ml-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFinance({ ...finance, type: 'income' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[40px] ${
                      finance.type === 'income' ? 'bg-[rgba(52,211,153,0.2)] text-[var(--success)] border border-[var(--success)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    + Thu
                  </button>
                  <button
                    onClick={() => setFinance({ ...finance, type: 'expense' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[40px] ${
                      finance.type === 'expense' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)] border border-[var(--error)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    - Chi
                  </button>
                </div>
                <input
                  type="number"
                  value={finance.amount || ''}
                  onChange={e => setFinance({ ...finance, amount: Math.max(0, parseInt(e.target.value) || 0) })}
                  placeholder="Số tiền (VNĐ)"
                  className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px] font-mono"
                  inputMode="numeric"
                />
                <input
                  type="text"
                  value={finance.note || ''}
                  onChange={e => setFinance({ ...finance, note: e.target.value })}
                  placeholder="Ghi chú thu chi"
                  className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[40px]"
                />
                <button
                  onClick={() => { setShowFinance(false); setFinance(undefined); }}
                  className="text-[10px] text-[var(--error)]"
                >
                  Xóa thu chi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
