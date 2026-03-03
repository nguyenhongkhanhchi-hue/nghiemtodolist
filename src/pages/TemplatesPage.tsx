import { useState } from 'react';
import { useTemplateStore, useTopicStore } from '@/stores';
import { convertYoutubeUrl, isYoutubeUrl } from '@/lib/youtubeUtils';
import {
  Plus, Trash2, Edit3, X, Save, ListTree, Youtube, Type, DollarSign, ArrowRight,
  Download, Upload, Tag, Check, Image as ImageIcon,
} from 'lucide-react';
import type { TaskTemplate, EisenhowerQuadrant, MediaBlock, TaskFinance, RecurringType } from '@/types';
import { QUADRANT_LABELS } from '@/types';

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── Add to Todo Dialog ──
function AddToTodoDialog({ template, onClose }: { template: TaskTemplate; onClose: () => void }) {
  const createTaskFromTemplate = useTemplateStore(s => s.createTaskFromTemplate);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>(template.quadrant);
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
    createTaskFromTemplate(template.id, finance, deadlineDate || undefined, deadlineTime || undefined, quadrant, { type: recurringType }, notes || undefined);
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
          <p className="text-xs text-[var(--text-secondary)]">{template.title}</p>

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

          {/* Toggle options */}
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
            <ArrowRight size={16} /> Thêm vào danh sách
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template Editor ──
function TemplateEditor({ template, onSave, onCancel }: {
  template?: TaskTemplate;
  onSave: (data: Omit<TaskTemplate, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const topics = useTopicStore(s => s.topics);
  const addTopic = useTopicStore(s => s.addTopic);
  const [title, setTitle] = useState(template?.title || '');
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>(template?.quadrant || 'do_first');
  const [notes, setNotes] = useState(template?.notes || '');
  const [subtasks, setSubtasks] = useState<{ title: string; quadrant: EisenhowerQuadrant }[]>(template?.subtasks || []);
  const [newSub, setNewSub] = useState('');
  const [media, setMedia] = useState<MediaBlock[]>(template?.media || []);
  const [mediaInput, setMediaInput] = useState('');
  const [mediaType, setMediaType] = useState<'auto' | 'text'>('auto');
  const [finance, setFinance] = useState<TaskFinance | undefined>(template?.finance);
  const [showFinance, setShowFinance] = useState(!!template?.finance);
  const [xpReward, setXpReward] = useState(template?.xpReward || 0);
  const [richContent, setRichContent] = useState(template?.richContent || '');
  const [topicId, setTopicId] = useState(template?.topicId || '');
  const [newTopic, setNewTopic] = useState('');

  const handleAddMedia = () => {
    const val = mediaInput.trim();
    if (!val) return;
    if (mediaType === 'text') {
      setMedia([...media, { id: genId(), type: 'text', content: val }]);
    } else if (isYoutubeUrl(val)) {
      const embed = convertYoutubeUrl(val);
      if (embed) setMedia([...media, { id: genId(), type: 'youtube', content: embed }]);
    } else if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(val)) {
      setMedia([...media, { id: genId(), type: 'image', content: val }]);
    } else {
      setMedia([...media, { id: genId(), type: 'image', content: val }]);
    }
    setMediaInput('');
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(), quadrant, recurring: { type: 'none' },
      notes: notes || undefined, richContent: richContent || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      media: media.length > 0 ? media : undefined,
      finance: showFinance ? finance : undefined,
      xpReward: xpReward > 0 ? xpReward : undefined,
      topicId: topicId || undefined,
      isGroup: subtasks.length > 0,
    });
  };

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-accent)] p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{template ? 'Sửa mẫu' : 'Tạo mẫu'}</h3>
        <button onClick={onCancel} className="text-[var(--text-muted)]"><X size={16} /></button>
      </div>

      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên việc mẫu"
        className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[44px]" />

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

      {/* Topic */}
      <div>
        <label className="text-[10px] text-[var(--text-muted)] mb-1 flex items-center gap-1"><Tag size={10} /> Chủ đề *</label>
        <div className="flex gap-2">
          <select value={topicId} onChange={e => setTopicId(e.target.value)}
            className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]">
            <option value="">Chọn chủ đề</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="flex gap-1">
            <input type="text" value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="+ Mới"
              className="w-20 bg-[var(--bg-surface)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
            <button onClick={() => { if (newTopic.trim()) { const id = addTopic(newTopic.trim()); setTopicId(id); setNewTopic(''); } }}
              className="size-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]"><Plus size={12} /></button>
          </div>
        </div>
      </div>

      {/* XP + Finance side by side */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-[var(--text-muted)]">EXP thưởng</label>
          <input type="number" value={xpReward || ''} onChange={e => setXpReward(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="0" className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px] font-mono" inputMode="numeric" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <button onClick={() => { setShowFinance(!showFinance); if (!finance) setFinance({ type: 'expense', amount: 0 }); }}
              className={`size-3.5 rounded border flex items-center justify-center ${showFinance ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
              {showFinance && <Check size={8} className="text-[var(--bg-base)]" />}
            </button>
            Thu chi
          </label>
          {showFinance && finance && (
            <input type="number" value={finance.amount || ''} onChange={e => setFinance({ ...finance, amount: Math.max(0, parseInt(e.target.value) || 0) })}
              placeholder="0" className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px] font-mono" inputMode="numeric" />
          )}
        </div>
      </div>

      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú hướng dẫn..." rows={2}
        className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />

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
            onKeyDown={e => { if (e.key === 'Enter' && newSub.trim()) { setSubtasks([...subtasks, { title: newSub.trim(), quadrant }]); setNewSub(''); } }}
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

      {/* Rich content editor */}
      <div>
        <p className="text-[10px] text-[var(--text-muted)] mb-1">Nội dung bài viết (copy-paste từ nguồn khác)</p>
        <div contentEditable suppressContentEditableWarning
          onBlur={e => setRichContent(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: richContent }}
          className="w-full min-h-[80px] bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] overflow-y-auto max-h-40 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2" />
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
  const [tab, setTab] = useState<'single' | 'group'>('single');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  const singleTemplates = templates.filter(t => !t.isGroup && (!t.subtasks || t.subtasks.length === 0));
  const groupTemplates = templates.filter(t => t.isGroup || (t.subtasks && t.subtasks.length > 0));
  const displayTemplates = (tab === 'single' ? singleTemplates : groupTemplates)
    .filter(t => topicFilter === 'all' || t.topicId === topicFilter);

  const topicCounts = topics.map(t => ({
    ...t,
    count: templates.filter(tpl => tpl.topicId === t.id).length,
  }));

  const handleSave = (data: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
    if (editingTemplate) updateTemplate(editingTemplate.id, data);
    else addTemplate(data);
    setShowEditor(false); setEditingTemplate(null);
  };

  const handleExport = () => {
    const json = exportTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nghiemwork-templates.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(json => {
      const count = importTemplates(json);
      if (count > 0) alert(`Đã nhập ${count} mẫu`);
      else alert('Không nhập được mẫu nào');
    });
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

      {/* Tabs: Single vs Group */}
      <div className="flex gap-0.5 p-0.5 bg-[var(--bg-elevated)] rounded-xl mb-3">
        <button onClick={() => setTab('single')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] flex items-center justify-center gap-1.5 ${tab === 'single' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          Việc đơn <span className="text-[9px] font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded">{singleTemplates.length}</span>
        </button>
        <button onClick={() => setTab('group')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] flex items-center justify-center gap-1.5 ${tab === 'group' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          Nhóm việc <span className="text-[9px] font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded">{groupTemplates.length}</span>
        </button>
      </div>

      {/* Topic tabs */}
      {topicCounts.length > 0 && (
        <div className="flex gap-1 mb-3 overflow-x-auto pb-0.5">
          <button onClick={() => setTopicFilter('all')}
            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-medium min-h-[26px] ${topicFilter === 'all' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
            Tất cả
          </button>
          {topicCounts.map(t => (
            <button key={t.id} onClick={() => setTopicFilter(topicFilter === t.id ? 'all' : t.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-medium min-h-[26px] flex items-center gap-1 ${topicFilter === t.id ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
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
            const q = QUADRANT_LABELS[template.quadrant];
            const topic = topics.find(t => t.id === template.topicId);
            return (
              <div key={template.id} className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] break-words">{template.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[9px] font-medium" style={{ color: q.color }}>{q.icon} {q.label}</span>
                      {topic && <span className="text-[9px] text-[var(--info)] flex items-center gap-0.5"><Tag size={7} /> {topic.name}</span>}
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
    </div>
  );
}
