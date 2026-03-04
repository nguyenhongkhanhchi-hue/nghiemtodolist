import { useState, useMemo } from 'react';
import { useTemplateStore, useTopicStore } from '@/stores';
import { convertYoutubeUrl, isYoutubeUrl } from '@/lib/youtubeUtils';
import {
  Plus, Trash2, Edit3, X, Save, ListTree, Youtube, Type, DollarSign, ArrowRight,
  Download, Upload, Tag, Check, Image as ImageIcon, Eye,
} from 'lucide-react';
import type { TaskTemplate, EisenhowerQuadrant, MediaBlock, TaskFinance, RecurringType } from '@/types';
import { QUADRANT_LABELS } from '@/types';

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── Template Info Modal ──
function TemplateInfoModal({ template, onClose }: { template: TaskTemplate; onClose: () => void }) {
  const topics = useTopicStore(s => s.topics);
  const topic = topics.find(t => t.id === template.topicId);

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-[var(--accent-primary)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Chi tiết mẫu</h2>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{template.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {topic && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(96,165,250,0.15)] text-[var(--info)]"><Tag size={8} className="inline" /> {topic.name}</span>}
            {template.xpReward && <span className="text-[10px] font-mono text-[var(--accent-primary)]">+{template.xpReward}XP</span>}
            {template.finance && <span className={`text-[10px] font-mono ${template.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{template.finance.type === 'income' ? '+' : '-'}{template.finance.amount.toLocaleString('vi-VN')}đ</span>}
          </div>
          {template.notes && <div className="px-3 py-2 rounded-xl bg-[var(--bg-surface)]"><p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{template.notes}</p></div>}
          {template.subtasks && template.subtasks.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-muted)] mb-1"><ListTree size={10} className="inline" /> Việc con ({template.subtasks.length})</p>
              {template.subtasks.map((sub, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] mb-1">
                  <div className="size-3 rounded-full border border-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-primary)]">{sub.title}</span>
                </div>
              ))}
            </div>
          )}
          {template.media && template.media.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-muted)] mb-1">Đa phương tiện</p>
              {template.media.map(block => (
                <div key={block.id} className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] mb-2">
                  {block.type === 'youtube' && <div className="aspect-video"><iframe src={block.content} className="w-full h-full" allowFullScreen /></div>}
                  {block.type === 'image' && <img src={block.content} alt="" className="w-full max-h-48 object-cover" />}
                  {block.type === 'text' && <p className="px-3 py-2 text-xs text-[var(--text-primary)] whitespace-pre-wrap">{block.content}</p>}
                </div>
              ))}
            </div>
          )}
          {template.richContent && (
            <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2">
              <div className="text-xs text-[var(--text-primary)] [&_img]:max-w-full [&_img]:rounded-lg" dangerouslySetInnerHTML={{ __html: template.richContent }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add to Todo Dialog ──
function AddToTodoDialog({ template, onClose }: { template: TaskTemplate; onClose: () => void }) {
  const createTaskFromTemplate = useTemplateStore(s => s.createTaskFromTemplate);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>('do_first');
  const [recurringType, setRecurringType] = useState<RecurringType>(template.recurring?.type || 'none');
  const [notes, setNotes] = useState('');
  const [finType, setFinType] = useState<'income' | 'expense'>(template.finance?.type || 'expense');
  const [finAmount, setFinAmount] = useState(template.finance?.amount || 0);
  const [showDeadline, setShowDeadline] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showFinance, setShowFinance] = useState(!!template.finance);
  const [showNotes, setShowNotes] = useState(false);

  const handleAdd = () => {
    const finance: TaskFinance | undefined = showFinance && finAmount > 0 ? { type: finType, amount: finAmount } : template.finance;
    createTaskFromTemplate(template.id, finance, showDeadline ? deadlineDate || undefined : undefined, showDeadline ? deadlineTime || undefined : undefined, quadrant, { type: showRecurring ? recurringType : 'none' }, notes || undefined);
    onClose();
  };

  const toggles = [
    { key: 'deadline', label: '⏰ Hạn chót', active: showDeadline, toggle: () => setShowDeadline(!showDeadline) },
    { key: 'recurring', label: '🔁 Lặp lại', active: showRecurring, toggle: () => setShowRecurring(!showRecurring) },
    { key: 'finance', label: '💰 Thu/Chi', active: showFinance, toggle: () => setShowFinance(!showFinance) },
    { key: 'notes', label: '📝 Ghi chú', active: showNotes, toggle: () => setShowNotes(!showNotes) },
  ];

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[80vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Thêm vào DS việc</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg px-3 py-2">{template.title}</p>

          {/* Quadrant */}
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(QUADRANT_LABELS) as EisenhowerQuadrant[]).map(q => {
              const cfg = QUADRANT_LABELS[q];
              return (
                <button key={q} onClick={() => setQuadrant(q)}
                  className={`py-2 rounded-lg text-[10px] font-medium min-h-[34px] border flex items-center justify-center gap-1 ${quadrant === q ? 'border-current' : 'border-transparent bg-[var(--bg-surface)]'}`}
                  style={quadrant === q ? { color: cfg.color, backgroundColor: `${cfg.color}15` } : {}}>
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Toggles */}
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
            <div className="flex gap-2">
              <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
                className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
              <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)}
                className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
            </div>
          )}
          {showRecurring && (
            <div className="flex gap-1.5">
              {(['none', 'daily', 'weekdays', 'weekly'] as RecurringType[]).map(r => (
                <button key={r} onClick={() => setRecurringType(r)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-medium min-h-[30px] ${recurringType === r ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  {r === 'none' ? 'Không' : r === 'daily' ? 'Hàng ngày' : r === 'weekdays' ? 'T2-T6' : 'Hàng tuần'}
                </button>
              ))}
            </div>
          )}
          {showFinance && (
            <div className="flex gap-2">
              <select value={finType} onChange={e => setFinType(e.target.value as any)} className="bg-[var(--bg-surface)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]">
                <option value="income">Thu</option><option value="expense">Chi</option>
              </select>
              <input type="number" value={finAmount || ''} onChange={e => setFinAmount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="Số tiền" inputMode="numeric" className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px] font-mono" />
            </div>
          )}
          {showNotes && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú..." rows={2}
              className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
          )}

          <button onClick={handleAdd} className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] active:opacity-80 min-h-[44px] flex items-center justify-center gap-2">
            <ArrowRight size={16} /> Nhân bản vào DS việc
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template Editor ──
function TemplateEditor({ template, onSave, onCancel }: {
  template?: TaskTemplate;
  onSave: (data: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const topics = useTopicStore(s => s.topics);
  const addTopic = useTopicStore(s => s.addTopic);
  const [title, setTitle] = useState(template?.title || '');
  const [notes, setNotes] = useState(template?.notes || '');
  const [subtasks, setSubtasks] = useState<{ title: string }[]>(template?.subtasks || []);
  const [newSub, setNewSub] = useState('');
  const [media, setMedia] = useState<MediaBlock[]>(template?.media || []);
  const [mediaInput, setMediaInput] = useState('');
  const [mediaType, setMediaType] = useState<'auto' | 'text'>('auto');
  const [finance, setFinance] = useState<TaskFinance | undefined>(template?.finance);
  const [showFinance, setShowFinance] = useState(!!template?.finance);
  const [showNotes, setShowNotes] = useState(!!template?.notes);
  const [xpReward, setXpReward] = useState(template?.xpReward || 0);
  const [richContent, setRichContent] = useState(template?.richContent || '');
  const [topicId, setTopicId] = useState(template?.topicId || '');
  const [newTopic, setNewTopic] = useState('');
  const [showNewTopic, setShowNewTopic] = useState(false);

  const handleAddMedia = () => {
    const val = mediaInput.trim();
    if (!val) return;
    if (mediaType === 'text') {
      setMedia([...media, { id: genId(), type: 'text', content: val }]);
    } else if (isYoutubeUrl(val)) {
      const embed = convertYoutubeUrl(val);
      if (embed) setMedia([...media, { id: genId(), type: 'youtube', content: embed }]);
    } else {
      setMedia([...media, { id: genId(), type: 'image', content: val }]);
    }
    setMediaInput('');
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      type: 'single',
      notes: showNotes ? notes || undefined : undefined,
      richContent: richContent || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      media: media.length > 0 ? media : undefined,
      finance: showFinance ? finance : undefined,
      xpReward: xpReward > 0 ? xpReward : undefined,
      topicId: topicId || undefined,
    });
  };

  const toggles = [
    { key: 'finance', label: '💰 Thu chi', active: showFinance, toggle: () => { setShowFinance(!showFinance); if (!finance) setFinance({ type: 'expense', amount: 0 }); } },
    { key: 'notes', label: '📝 Ghi chú', active: showNotes, toggle: () => setShowNotes(!showNotes) },
  ];

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-accent)] p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{template ? 'Sửa mẫu' : 'Tạo mẫu'}</h3>
        <button onClick={onCancel} className="text-[var(--text-muted)]"><X size={16} /></button>
      </div>

      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên việc mẫu"
        className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[44px]" />

      {/* Topic - compact redesign */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tag size={12} className="text-[var(--text-muted)]" />
        {topics.map(t => (
          <button key={t.id} onClick={() => setTopicId(topicId === t.id ? '' : t.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
              topicId === t.id ? 'border-[var(--accent-primary)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'
            }`}>
            {t.name}
          </button>
        ))}
        {showNewTopic ? (
          <div className="flex items-center gap-1">
            <input type="text" value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Tên" autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && newTopic.trim()) { const id = addTopic(newTopic.trim()); setTopicId(id); setNewTopic(''); setShowNewTopic(false); } }}
              className="w-20 bg-[var(--bg-surface)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none border border-[var(--border-subtle)]" />
            <button onClick={() => { if (newTopic.trim()) { const id = addTopic(newTopic.trim()); setTopicId(id); setNewTopic(''); setShowNewTopic(false); } }}
              className="size-6 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)]"><Check size={10} /></button>
            <button onClick={() => setShowNewTopic(false)} className="text-[var(--text-muted)]"><X size={12} /></button>
          </div>
        ) : (
          <button onClick={() => setShowNewTopic(true)} className="px-2 py-1 rounded-full text-[10px] border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)]">+ Mới</button>
        )}
      </div>

      {/* Side by side toggles + XP */}
      <div className="grid grid-cols-3 gap-2">
        {toggles.map(opt => (
          <button key={opt.key} onClick={opt.toggle}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-medium min-h-[34px] border ${opt.active ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
            <div className={`size-3.5 rounded border flex items-center justify-center ${opt.active ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
              {opt.active && <Check size={8} className="text-[var(--bg-base)]" />}
            </div>
            {opt.label}
          </button>
        ))}
        <div className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <span className="text-[9px] text-[var(--text-muted)]">XP</span>
          <input type="number" value={xpReward || ''} onChange={e => setXpReward(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0" className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none font-mono min-h-[20px]" inputMode="numeric" />
        </div>
      </div>

      {showFinance && finance && (
        <div className="flex gap-2 p-2 rounded-lg bg-[var(--bg-surface)]">
          <select value={finance.type} onChange={e => setFinance({ ...finance, type: e.target.value as any })} className="bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px]">
            <option value="income">Thu</option><option value="expense">Chi</option>
          </select>
          <input type="number" value={finance.amount || ''} onChange={e => setFinance({ ...finance, amount: Math.max(0, parseInt(e.target.value) || 0) })}
            placeholder="Số tiền" className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px] font-mono" inputMode="numeric" />
        </div>
      )}

      {showNotes && (
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú hướng dẫn..." rows={2}
          className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
      )}

      {/* Subtasks */}
      <div>
        <p className="text-[10px] text-[var(--text-muted)] mb-1 flex items-center gap-1"><ListTree size={10} /> Việc con mẫu</p>
        {subtasks.map((sub, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="text-xs text-[var(--text-secondary)] flex-1">{sub.title}</span>
            <button onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))} className="text-[var(--text-muted)]"><Trash2 size={10} /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <input type="text" value={newSub} onChange={e => setNewSub(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newSub.trim()) { setSubtasks([...subtasks, { title: newSub.trim() }]); setNewSub(''); } }}
            placeholder="+ Việc con" className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
        </div>
      </div>

      {/* Media */}
      <div>
        <p className="text-[10px] text-[var(--text-muted)] mb-1 flex items-center gap-1"><ImageIcon size={10} /> Đa phương tiện</p>
        {media.map(block => (
          <div key={block.id} className="relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] mb-2">
            {block.type === 'youtube' && <div className="aspect-video"><iframe src={block.content} className="w-full h-full" allowFullScreen /></div>}
            {block.type === 'image' && <img src={block.content} alt="" className="w-full max-h-40 object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/1A1A25/5A5A6E?text=Image'; }} />}
            {block.type === 'text' && <p className="px-3 py-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">{block.content}</p>}
            <button onClick={() => setMedia(media.filter(m => m.id !== block.id))} className="absolute top-1 right-1 size-6 rounded bg-black/60 flex items-center justify-center text-white"><X size={10} /></button>
          </div>
        ))}
        <div className="flex gap-1.5 mb-1">
          <button onClick={() => setMediaType('auto')} className={`px-2 py-1 rounded-lg text-[9px] font-medium ${mediaType === 'auto' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}><Youtube size={9} className="inline mr-0.5" />Link</button>
          <button onClick={() => setMediaType('text')} className={`px-2 py-1 rounded-lg text-[9px] font-medium ${mediaType === 'text' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}><Type size={9} className="inline mr-0.5" />Văn bản</button>
        </div>
        <div className="flex gap-2">
          {mediaType === 'text' ? (
            <textarea value={mediaInput} onChange={e => setMediaInput(e.target.value)} placeholder="Nhập nội dung..." rows={2}
              className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
          ) : (
            <input type="text" value={mediaInput} onChange={e => setMediaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMedia()}
              placeholder="Dán link YouTube / ảnh..." className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
          )}
          <button onClick={handleAddMedia} className="size-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]"><Plus size={12} /></button>
        </div>
      </div>

      {/* Rich content */}
      <div>
        <p className="text-[10px] text-[var(--text-muted)] mb-1">Nội dung bài viết (copy-paste)</p>
        <div contentEditable suppressContentEditableWarning
          onBlur={e => setRichContent(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: richContent }}
          className="w-full min-h-[60px] bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] overflow-y-auto max-h-40 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2" />
      </div>

      <button onClick={handleSave} disabled={!title.trim()}
        className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 active:opacity-80 min-h-[44px] flex items-center justify-center gap-2">
        <Save size={14} /> {template ? 'Cập nhật' : 'Tạo mẫu'}
      </button>
    </div>
  );
}

// ── Templates Page ──
export default function TemplatesPage() {
  const { templates, addTemplate, updateTemplate, removeTemplate, exportTemplates, importTemplates } = useTemplateStore();
  const topics = useTopicStore(s => s.topics);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [addingToTodo, setAddingToTodo] = useState<TaskTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<TaskTemplate | null>(null);
  const [tab, setTab] = useState<'single' | 'group'>('single');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  const singleTemplates = useMemo(() => templates.filter(t => t.type === 'single'), [templates]);
  const groupTemplates = useMemo(() => templates.filter(t => t.type === 'group'), [templates]);

  const displayTemplates = useMemo(() => (tab === 'single' ? singleTemplates : groupTemplates)
    .filter(t => topicFilter === 'all' || t.topicId === topicFilter), [tab, singleTemplates, groupTemplates, topicFilter]);

  const topicCounts = useMemo(() => topics.map(t => ({
    ...t,
    count: templates.filter(tpl => tpl.topicId === t.id).length,
  })), [topics, templates]);

  const handleSave = (data: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, data);
    } else {
      addTemplate(data);
    }
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const handleExport = () => {
    const json = exportTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nghiemwork-templates.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const count = importTemplates(json);
      alert(count > 0 ? `Đã nhập ${count} mẫu` : 'Không nhập được mẫu nào');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full px-4 pt-3 pb-24 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Việc Mẫu</h1>
        <div className="flex gap-1.5">
          <button onClick={handleExport} className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]" title="Xuất"><Download size={14} /></button>
          <label className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] cursor-pointer" title="Nhập">
            <Upload size={14} /><input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={() => { setEditingTemplate(null); setShowEditor(!showEditor); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-primary)] text-[var(--bg-base)] min-h-[32px]">
            <Plus size={12} /> Tạo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-[var(--bg-elevated)] rounded-xl mb-3">
        <button onClick={() => setTab('single')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] flex items-center justify-center gap-1.5 ${tab === 'single' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          Việc Đơn <span className="text-[9px] font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded">{singleTemplates.length}</span>
        </button>
        <button onClick={() => setTab('group')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] flex items-center justify-center gap-1.5 ${tab === 'group' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          Nhóm Việc <span className="text-[9px] font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded">{groupTemplates.length}</span>
        </button>
      </div>

      {/* Topic filter */}
      {topicCounts.length > 0 && (
        <div className="flex gap-1 mb-3 overflow-x-auto pb-0.5">
          <button onClick={() => setTopicFilter('all')}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-medium min-h-[26px] ${topicFilter === 'all' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
            Tất cả
          </button>
          {topicCounts.map(t => (
            <button key={t.id} onClick={() => setTopicFilter(topicFilter === t.id ? 'all' : t.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-medium min-h-[26px] flex items-center gap-1 ${topicFilter === t.id ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
              {t.name} <span className="font-mono">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {showEditor && <div className="mb-3"><TemplateEditor template={editingTemplate || undefined} onSave={handleSave} onCancel={() => { setShowEditor(false); setEditingTemplate(null); }} /></div>}

      {displayTemplates.length === 0 && !showEditor ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-2xl mb-2">📋</span>
          <p className="text-xs text-[var(--text-muted)]">{tab === 'single' ? 'Chưa có việc đơn nào' : 'Chưa có nhóm việc nào'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayTemplates.map(template => {
            const topic = topics.find(t => t.id === template.topicId);
            // Find which group templates contain this single template
            const parentGroups = tab === 'single' ? groupTemplates.filter(g => g.templateIds?.includes(template.id)) : [];
            return (
              <div key={template.id} className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-3 active:border-[var(--border-accent)] transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingTemplate(template)}>
                    <p className="text-sm font-medium text-[var(--text-primary)] break-words">{template.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {topic && <span className="text-[9px] text-[var(--info)] flex items-center gap-0.5"><Tag size={7} /> {topic.name}</span>}
                      {parentGroups.length > 0 && <span className="text-[9px] text-[var(--text-muted)]">📂 {parentGroups.map(g => g.title).join(', ')}</span>}
                      {template.subtasks && template.subtasks.length > 0 && <span className="text-[9px] text-[var(--text-muted)]"><ListTree size={7} className="inline" /> {template.subtasks.length}</span>}
                      {template.xpReward && <span className="text-[9px] text-[var(--accent-primary)] font-mono">+{template.xpReward}XP</span>}
                      {template.finance && <span className={`text-[9px] font-mono ${template.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{template.finance.type === 'income' ? '+' : '-'}{template.finance.amount.toLocaleString('vi-VN')}đ</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setAddingToTodo(template)} className="px-2.5 py-1.5 rounded-lg bg-[var(--accent-dim)] text-[9px] font-semibold text-[var(--accent-primary)] min-h-[30px]">+ Thêm</button>
                    <button onClick={() => { setEditingTemplate(template); setShowEditor(true); }} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><Edit3 size={12} /></button>
                    <button onClick={() => removeTemplate(template.id)} className="size-7 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addingToTodo && <AddToTodoDialog template={addingToTodo} onClose={() => setAddingToTodo(null)} />}
      {viewingTemplate && <TemplateInfoModal template={viewingTemplate} onClose={() => setViewingTemplate(null)} />}
    </div>
  );
}
