import { useState } from 'react';
import { useTemplateStore, useTaskStore } from '@/stores';
import { convertYoutubeUrl, isYoutubeUrl } from '@/lib/youtubeUtils';
import {
  Plus, Trash2, Play, Edit3, X, Save, ChevronDown, ChevronRight,
  ListTree, Image, Youtube, Type, DollarSign,
} from 'lucide-react';
import type { TaskTemplate, EisenhowerQuadrant, MediaBlock, TaskFinance } from '@/types';

const QUADRANT_CONFIG = [
  { value: 'do_first' as const, label: 'Q1 Làm ngay', icon: '🔴', color: 'var(--error)' },
  { value: 'schedule' as const, label: 'Q2 Lên lịch', icon: '🔵', color: 'var(--accent-primary)' },
  { value: 'delegate' as const, label: 'Q3 Ủy thác', icon: '🟡', color: 'var(--warning)' },
  { value: 'eliminate' as const, label: 'Q4 Loại bỏ', icon: '⚪', color: 'var(--text-muted)' },
];

function generateBlockId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function TemplateEditor({ template, onSave, onCancel }: {
  template?: TaskTemplate;
  onSave: (data: Omit<TaskTemplate, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(template?.title || '');
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>(template?.quadrant || 'do_first');
  const [notes, setNotes] = useState(template?.notes || '');
  const [subtasks, setSubtasks] = useState<{ title: string; quadrant: EisenhowerQuadrant }[]>(template?.subtasks || []);
  const [newSub, setNewSub] = useState('');
  const [media, setMedia] = useState<MediaBlock[]>(template?.media || []);
  const [mediaInput, setMediaInput] = useState('');
  const [finance, setFinance] = useState<TaskFinance | undefined>(template?.finance);
  const [showFinance, setShowFinance] = useState(!!template?.finance);

  const handleAddMedia = () => {
    const val = mediaInput.trim();
    if (!val) return;
    if (isYoutubeUrl(val)) {
      const embed = convertYoutubeUrl(val);
      if (embed) media.push({ id: generateBlockId(), type: 'youtube', content: embed });
    } else if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(val)) {
      media.push({ id: generateBlockId(), type: 'image', content: val });
    } else {
      media.push({ id: generateBlockId(), type: 'text', content: val });
    }
    setMedia([...media]);
    setMediaInput('');
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      quadrant,
      recurring: { type: 'none' },
      notes: notes || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      media: media.length > 0 ? media : undefined,
      finance: showFinance ? finance : undefined,
    });
  };

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-accent)] p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{template ? 'Chỉnh sửa mẫu' : 'Tạo mẫu mới'}</h3>
        <button onClick={onCancel} className="text-[var(--text-muted)]"><X size={16} /></button>
      </div>

      <input
        type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Tên việc mẫu"
        className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px]"
      />

      <div className="grid grid-cols-2 gap-1.5">
        {QUADRANT_CONFIG.map(q => (
          <button key={q.value} onClick={() => setQuadrant(q.value)}
            className={`py-2 rounded-lg text-[11px] font-medium min-h-[36px] border flex items-center justify-center gap-1 ${
              quadrant === q.value ? 'border-current' : 'border-transparent bg-[var(--bg-surface)]'
            }`}
            style={quadrant === q.value ? { color: q.color, backgroundColor: `${q.color}15` } : {}}
          >{q.icon} {q.label}</button>
        ))}
      </div>

      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú..." rows={2}
        className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />

      {/* Subtasks */}
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><ListTree size={12} /> Việc con mẫu</p>
        {subtasks.map((sub, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[var(--text-secondary)] flex-1">{sub.title}</span>
            <button onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))} className="text-[var(--text-muted)]"><Trash2 size={12} /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <input type="text" value={newSub} onChange={e => setNewSub(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newSub.trim()) { setSubtasks([...subtasks, { title: newSub.trim(), quadrant }]); setNewSub(''); } }}
            placeholder="Thêm việc con mẫu..." className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[36px]" />
          <button onClick={() => { if (newSub.trim()) { setSubtasks([...subtasks, { title: newSub.trim(), quadrant }]); setNewSub(''); } }}
            className="size-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]"><Plus size={14} /></button>
        </div>
      </div>

      {/* Media */}
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1"><Image size={12} /> Nội dung đa phương tiện</p>
        {media.map(block => (
          <div key={block.id} className="flex items-center gap-2 mb-1 px-2 py-1.5 rounded-lg bg-[var(--bg-surface)]">
            <span className="text-[10px] text-[var(--text-muted)]">{block.type === 'youtube' ? '🎬' : block.type === 'image' ? '🖼️' : '📝'}</span>
            <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">{block.content.slice(0, 60)}</span>
            <button onClick={() => setMedia(media.filter(m => m.id !== block.id))} className="text-[var(--text-muted)]"><X size={12} /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <input type="text" value={mediaInput} onChange={e => setMediaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMedia()}
            placeholder="Link YouTube, ảnh, hoặc text..." className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[36px]" />
          <button onClick={handleAddMedia} className="size-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]"><Plus size={14} /></button>
        </div>
      </div>

      {/* Finance */}
      <div>
        <button onClick={() => { setShowFinance(!showFinance); if (!finance) setFinance({ type: 'expense', amount: 0 }); }}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
          <DollarSign size={12} /> Thu chi {showFinance ? '▼' : '▶'}
        </button>
        {showFinance && finance && (
          <div className="flex gap-2">
            <select value={finance.type} onChange={e => setFinance({ ...finance, type: e.target.value as 'income' | 'expense' })}
              className="bg-[var(--bg-surface)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[36px]">
              <option value="income">Thu</option>
              <option value="expense">Chi</option>
            </select>
            <input type="number" value={finance.amount || ''} onChange={e => setFinance({ ...finance, amount: Math.max(0, parseInt(e.target.value) || 0) })}
              placeholder="Số tiền" className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[36px] font-mono" inputMode="numeric" />
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={!title.trim()}
        className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 active:opacity-80 min-h-[44px] flex items-center justify-center gap-2">
        <Save size={16} /> {template ? 'Cập nhật' : 'Tạo mẫu'}
      </button>
    </div>
  );
}

export default function TemplatesPage() {
  const { templates, addTemplate, updateTemplate, removeTemplate, createTaskFromTemplate } = useTemplateStore();
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);

  const handleSave = (data: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, data);
    } else {
      addTemplate(data);
    }
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const handleEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleUse = (templateId: string) => {
    createTaskFromTemplate(templateId);
  };

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Việc Mẫu</h1>
        <button
          onClick={() => { setEditingTemplate(null); setShowEditor(!showEditor); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] text-[var(--bg-base)] active:opacity-80 min-h-[40px]"
        >
          <Plus size={14} /> Tạo mẫu
        </button>
      </div>

      {showEditor && (
        <div className="mb-4">
          <TemplateEditor
            template={editingTemplate || undefined}
            onSave={handleSave}
            onCancel={() => { setShowEditor(false); setEditingTemplate(null); }}
          />
        </div>
      )}

      {templates.length === 0 && !showEditor ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-1">Chưa có việc mẫu nào</p>
          <p className="text-xs text-[var(--text-muted)]">Tạo mẫu hoặc nhờ AI tạo giùm</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(template => {
            const q = QUADRANT_CONFIG.find(q => q.value === template.quadrant);
            return (
              <div key={template.id} className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] break-words">{template.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-medium" style={{ color: q?.color }}>{q?.icon} {q?.label}</span>
                      {template.subtasks && template.subtasks.length > 0 && (
                        <span className="text-[10px] text-[var(--info)] flex items-center gap-0.5">
                          <ListTree size={9} /> {template.subtasks.length} việc con
                        </span>
                      )}
                      {template.media && template.media.length > 0 && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {template.media.length} media
                        </span>
                      )}
                      {template.finance && (
                        <span className={`text-[10px] font-mono ${template.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                          {template.finance.type === 'income' ? '+' : '-'}{template.finance.amount.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </div>
                    {template.notes && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-2">{template.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleUse(template.id)}
                      className="size-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)] active:opacity-70" title="Sử dụng mẫu">
                      <Play size={16} fill="currentColor" />
                    </button>
                    <button onClick={() => handleEdit(template)}
                      className="size-9 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] active:opacity-70" title="Sửa">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => removeTemplate(template.id)}
                      className="size-9 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)] active:opacity-70" title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
