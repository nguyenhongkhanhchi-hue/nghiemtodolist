import { useState, useMemo } from 'react';
import { useTemplateStore, useTopicStore } from '@/stores';
import { convertYoutubeUrl, isYoutubeUrl } from '@/lib/youtubeUtils';
import {
  Plus, Trash2, Edit3, X, Save, ListTree, Youtube, Type, ArrowRight,
  Download, Upload, Tag, Check, Image as ImageIcon, Eye, FileText,
} from 'lucide-react';
import type { TaskTemplate, EisenhowerQuadrant, MediaBlock, TaskFinance, RecurringType } from '@/types';
import { QUADRANT_LABELS } from '@/types';

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── Template Info Modal ──
function TemplateInfoModal({ template, onClose }: { template: TaskTemplate; onClose: () => void }) {
  const topics = useTopicStore(s => s.topics);
  const allTemplates = useTemplateStore(s => s.templates);
  const topic = topics.find(t => t.id === template.topicId);

  const subTemplates = useMemo(() => {
    if (template.type === 'group' && template.templateIds) {
      return template.templateIds.map(id => allTemplates.find(t => t.id === id)).filter(Boolean) as TaskTemplate[];
    }
    return [];
  }, [template, allTemplates]);

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-[var(--accent-primary)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">{template.type === 'single' ? 'Chi tiết việc đơn' : 'Chi tiết nhóm việc'}</h2>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{template.title}</h3>
          
          {template.type === 'single' ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                {topic && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(96,165,250,0.15)] text-[var(--info)]"><Tag size={8} className="inline" /> {topic.name}</span>}
                {template.xpReward && <span className="text-[10px] font-mono text-[var(--accent-primary)]">+{template.xpReward}XP</span>}
                {template.finance && <span className={`text-[10px] font-mono ${template.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{template.finance.type === 'income' ? '+' : '-'}{template.finance.amount.toLocaleString('vi-VN')}đ</span>}
              </div>
              {template.notes && <div className="px-3 py-2 rounded-xl bg-[var(--bg-surface)]"><p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{template.notes}</p></div>}
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
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Danh sách việc đơn trong nhóm:</p>
              {subTemplates.map(st => (
                <div key={st.id} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <p className="text-xs font-medium text-[var(--text-primary)]">{st.title}</p>
                  <div className="flex gap-2 mt-1">
                     {st.xpReward && <span className="text-[9px] text-[var(--accent-primary)]">+{st.xpReward}XP</span>}
                     {st.finance && <span className={`text-[9px] ${st.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{st.finance.type === 'income' ? '+' : '-'}{st.finance.amount.toLocaleString('vi-VN')}đ</span>}
                  </div>
                </div>
              ))}
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
  const [recurringType, setRecurringType] = useState<RecurringType>('none');
  const [notes, setNotes] = useState('');
  const [showDeadline, setShowDeadline] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const handleAdd = () => {
    createTaskFromTemplate(template.id, undefined, showDeadline ? deadlineDate || undefined : undefined, showDeadline ? deadlineTime || undefined : undefined, quadrant, { type: showRecurring ? recurringType : 'none' }, notes || undefined);
    onClose();
  };

  const toggles = [
    { key: 'deadline', label: '⏰ Hạn chót', active: showDeadline, toggle: () => setShowDeadline(!showDeadline) },
    { key: 'recurring', label: '🔁 Lặp lại', active: showRecurring, toggle: () => setShowRecurring(!showRecurring) },
    { key: 'notes', label: '📝 Ghi chú', active: showNotes, toggle: () => setShowNotes(!showNotes) },
  ];

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[80vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Load vào DS việc</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg px-3 py-2">{template.title} {template.type === 'group' && '(Nhóm việc)'}</p>

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

          <div className="grid grid-cols-3 gap-2">
            {toggles.map(opt => (
              <button key={opt.key} onClick={opt.toggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium min-h-[34px] border ${opt.active ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
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
          {showNotes && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú tùy biến..." rows={2}
              className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
          )}

          <button onClick={handleAdd} className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] active:opacity-80 min-h-[44px] flex items-center justify-center gap-2">
            <ArrowRight size={16} /> {template.type === 'single' ? 'Load vào DS' : 'Giải nén vào DS'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single Template Editor ──
function SingleTemplateEditor({ template, onSave, onCancel }: {
  template?: TaskTemplate;
  onSave: (data: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const topics = useTopicStore(s => s.topics);
  const addTopic = useTopicStore(s => s.addTopic);
  const [title, setTitle] = useState(template?.title || '');
  const [notes, setNotes] = useState(template?.notes || '');
  const [media, setMedia] = useState<MediaBlock[]>(template?.media || []);
  const [mediaInput, setMediaInput] = useState('');
  const [mediaType, setMediaType] = useState<'auto' | 'text'>('auto');
  const [finance, setFinance] = useState<TaskFinance | undefined>(template?.finance);
  const [showFinance, setShowFinance] = useState(!!template?.finance);
  const [showNotes, setShowNotes] = useState(!!template?.notes);
  const [showMedia, setShowMedia] = useState(!!template?.media);
  const [xpReward, setXpReward] = useState(template?.xpReward || 0);
  const [richContent, setRichContent] = useState(template?.richContent || '');
  const [topicId, setTopicId] = useState(template?.topicId || '');
  const [newTopic, setNewTopic] = useState('');
  const [showNewTopic, setShowNewTopic] = useState(false);

  const handleAddMedia = () => {
    const val = mediaInput.trim();
    if (!val) return;
    if (mediaType === 'text') setMedia([...media, { id: genId(), type: 'text', content: val }]);
    else if (isYoutubeUrl(val)) {
      const embed = convertYoutubeUrl(val);
      if (embed) setMedia([...media, { id: genId(), type: 'youtube', content: embed }]);
    } else setMedia([...media, { id: genId(), type: 'image', content: val }]);
    setMediaInput('');
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(), type: 'single',
      notes: showNotes ? notes : undefined,
      richContent: richContent || undefined,
      media: showMedia ? media : undefined,
      finance: showFinance ? finance : undefined,
      xpReward: xpReward > 0 ? xpReward : undefined,
      topicId: topicId || undefined,
      showMedia, showNotes, showFinance
    });
  };

  const toggles = [
    { key: 'media', label: '🎬 Đa phương tiện', active: showMedia, toggle: () => setShowMedia(!showMedia) },
    { key: 'finance', label: '💰 Thu chi', active: showFinance, toggle: () => { setShowFinance(!showFinance); if (!finance) setFinance({ type: 'expense', amount: 0 }); } },
    { key: 'notes', label: '📝 Ghi chú', active: showNotes, toggle: () => setShowNotes(!showNotes) },
  ];

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-accent)] p-4 space-y-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{template ? 'Sửa Việc Đơn' : 'Tạo Việc Đơn'}</h3>
        <button onClick={onCancel} className="text-[var(--text-muted)]"><X size={16} /></button>
      </div>

      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên việc mẫu"
        className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[44px]" />

      <div className="flex items-center gap-2 flex-wrap">
        <Tag size={12} className="text-[var(--text-muted)]" />
        {topics.map(t => (
          <button key={t.id} onClick={() => setTopicId(topicId === t.id ? '' : t.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${topicId === t.id ? 'border-[var(--accent-primary)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>{t.name}</button>
        ))}
        {showNewTopic ? (
          <div className="flex items-center gap-1">
            <input type="text" value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Tên" autoFocus
              className="w-20 bg-[var(--bg-surface)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none border border-[var(--border-subtle)]"
              onKeyDown={e => { if (e.key === 'Enter' && newTopic.trim()) { const id = addTopic(newTopic.trim()); setTopicId(id); setNewTopic(''); setShowNewTopic(false); } }} />
            <button onClick={() => { if (newTopic.trim()) { const id = addTopic(newTopic.trim()); setTopicId(id); setNewTopic(''); setShowNewTopic(false); } }} className="size-6 rounded-lg bg-[var(--accent-primary)] text-white"><Check size={10} /></button>
          </div>
        ) : <button onClick={() => setShowNewTopic(true)} className="px-2 py-1 rounded-full text-[10px] border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)]">+ Mới</button>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {toggles.map(opt => (
          <button key={opt.key} onClick={opt.toggle}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium min-h-[34px] border ${opt.active ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
            <div className={`size-3.5 rounded border flex items-center justify-center ${opt.active ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>{opt.active && <Check size={8} className="text-white" />}</div>
            {opt.label}
          </button>
        ))}
        <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <span className="text-[9px] text-[var(--text-muted)]">XP</span>
          <input type="number" value={xpReward || ''} onChange={e => setXpReward(parseInt(e.target.value) || 0)} placeholder="0" className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none font-mono" />
        </div>
      </div>

      {showFinance && finance && (
        <div className="flex gap-2 p-2 rounded-lg bg-[var(--bg-surface)]">
          <select value={finance.type} onChange={e => setFinance({ ...finance, type: e.target.value as any })} className="bg-transparent text-xs text-[var(--text-primary)] outline-none border-r pr-2">
            <option value="income">Thu</option><option value="expense">Chi</option>
          </select>
          <input type="number" value={finance.amount || ''} onChange={e => setFinance({ ...finance, amount: parseInt(e.target.value) || 0 })} placeholder="Số tiền" className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none font-mono" />
        </div>
      )}

      {showNotes && (
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú hướng dẫn..." rows={2}
          className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] resize-none" />
      )}

      {showMedia && (
        <div className="space-y-2">
          {media.map(block => (
            <div key={block.id} className="relative rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              {block.type === 'youtube' && <div className="aspect-video"><iframe src={block.content} className="w-full h-full" /></div>}
              {block.type === 'image' && <img src={block.content} className="w-full max-h-40 object-cover" />}
              {block.type === 'text' && <p className="px-3 py-2 text-xs">{block.content}</p>}
              <button onClick={() => setMedia(media.filter(m => m.id !== block.id))} className="absolute top-1 right-1 size-6 rounded bg-black/60 text-white"><X size={10} /></button>
            </div>
          ))}
          <div className="flex gap-1.5">
            <button onClick={() => setMediaType('auto')} className={`px-2 py-1 rounded-lg text-[9px] ${mediaType === 'auto' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)]'}`}>Link</button>
            <button onClick={() => setMediaType('text')} className={`px-2 py-1 rounded-lg text-[9px] ${mediaType === 'text' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)]'}`}>Văn bản</button>
          </div>
          <div className="flex gap-2">
            <input type="text" value={mediaInput} onChange={e => setMediaInput(e.target.value)} placeholder="Dán link hoặc nhập text..." className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs outline-none border border-[var(--border-subtle)]" />
            <button onClick={handleAddMedia} className="size-8 rounded-lg bg-[var(--accent-dim)] text-[var(--accent-primary)] flex items-center justify-center"><Plus size={12} /></button>
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] text-[var(--text-muted)] mb-1">Nội dung bài viết (HTML)</p>
        <div contentEditable suppressContentEditableWarning onBlur={e => setRichContent(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: richContent }}
          className="w-full min-h-[60px] bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] overflow-y-auto max-h-40" />
      </div>

      <button onClick={handleSave} disabled={!title.trim()} className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 flex items-center justify-center gap-2"><Save size={14} /> Lưu Việc Đơn</button>
    </div>
  );
}

// ── Group Template Editor ──
function GroupTemplateEditor({ template, onSave, onCancel }: {
  template?: TaskTemplate;
  onSave: (data: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const allTemplates = useTemplateStore(s => s.templates);
  const singleTemplates = useMemo(() => allTemplates.filter(t => t.type === 'single'), [allTemplates]);
  const [title, setTitle] = useState(template?.title || '');
  const [selectedIds, setSelectedIds] = useState<string[]>(template?.templateIds || []);

  const totals = useMemo(() => {
    let xp = 0; let inc = 0; let exp = 0;
    selectedIds.forEach(id => {
      const t = singleTemplates.find(st => st.id === id);
      if (t) {
        xp += t.xpReward || 0;
        if (t.finance) {
          if (t.finance.type === 'income') inc += t.finance.amount;
          else exp += t.finance.amount;
        }
      }
    });
    return { xp, inc, exp };
  }, [selectedIds, singleTemplates]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), type: 'group', templateIds: selectedIds });
  };

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-accent)] p-4 space-y-4 animate-slide-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{template ? 'Sửa Nhóm Việc' : 'Tạo Nhóm Việc'}</h3>
        <button onClick={onCancel} className="text-[var(--text-muted)]"><X size={16} /></button>
      </div>

      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên nhóm (Vd: Buổi sáng, Cuối tuần...)"
        className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[44px]" />

      <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--bg-surface)] rounded-xl border border-dashed border-[var(--border-subtle)]">
        <div className="text-center"><p className="text-[8px] text-[var(--text-muted)] uppercase">Tổng XP</p><p className="text-xs font-bold text-[var(--accent-primary)]">+{totals.xp}</p></div>
        <div className="text-center"><p className="text-[8px] text-[var(--text-muted)] uppercase">Tổng Thu</p><p className="text-xs font-bold text-[var(--success)]">+{totals.inc.toLocaleString()}đ</p></div>
        <div className="text-center"><p className="text-[8px] text-[var(--text-muted)] uppercase">Tổng Chi</p><p className="text-xs font-bold text-[var(--error)]">-{totals.exp.toLocaleString()}đ</p></div>
      </div>

      <div>
        <p className="text-[10px] text-[var(--text-muted)] font-bold mb-2 uppercase">Chọn việc đơn để add vào nhóm ({selectedIds.length}):</p>
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {singleTemplates.map(st => (
            <button key={st.id} onClick={() => handleToggle(st.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${selectedIds.includes(st.id) ? 'border-[var(--accent-primary)] bg-[var(--accent-dim)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'}`}>
              <div className="min-w-0">
                <p className={`text-xs font-medium ${selectedIds.includes(st.id) ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>{st.title}</p>
                <p className="text-[9px] text-[var(--text-muted)]">XP: {st.xpReward || 0} | {st.finance ? `${st.finance.type === 'income' ? '+' : '-'}${st.finance.amount.toLocaleString()}đ` : 'Không thu/chi'}</p>
              </div>
              <div className={`size-5 rounded-full border-2 flex items-center justify-center ${selectedIds.includes(st.id) ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
                {selectedIds.includes(st.id) && <Check size={12} className="text-white" />}
              </div>
            </button>
          ))}
          {singleTemplates.length === 0 && <p className="text-[10px] text-center py-4 text-[var(--text-muted)] italic">Chưa có việc đơn nào để chọn</p>}
        </div>
      </div>

      <button onClick={handleSave} disabled={!title.trim() || selectedIds.length === 0}
        className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 flex items-center justify-center gap-2"><Save size={14} /> Lưu Nhóm Việc</button>
    </div>
  );
}

// ── Main Templates Page ──
export default function TemplatesPage() {
  const { templates, addTemplate, updateTemplate, removeTemplate, exportTemplates, importTemplates } = useTemplateStore();
  const topics = useTopicStore(s => s.topics);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [addingToTodo, setAddingToTodo] = useState<TaskTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<TaskTemplate | null>(null);
  const [tab, setTab] = useState<'single' | 'group'>('single');

  const displayTemplates = useMemo(() => templates.filter(t => t.type === tab), [templates, tab]);

  const handleSave = (data: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
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
      alert(count > 0 ? `Đã nhập ${count} mẫu` : 'Không nhập được mẫu nào');
    });
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full px-4 pt-3 pb-24 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Kho Việc Mẫu</h1>
        <div className="flex gap-1.5">
          <button onClick={handleExport} className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]"><Download size={14} /></button>
          <label className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] cursor-pointer">
            <Upload size={14} /><input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={() => { setEditingTemplate(null); setShowEditor(!showEditor); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-primary)] text-white min-h-[32px]"><Plus size={12} /> Tạo mới</button>
        </div>
      </div>

      <div className="flex gap-0.5 p-0.5 bg-[var(--bg-elevated)] rounded-xl mb-3">
        <button onClick={() => setTab('single')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] flex items-center justify-center gap-1.5 ${tab === 'single' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
          <FileText size={14} /> Việc Đơn <span className="text-[9px] font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded ml-1">{templates.filter(t => t.type === 'single').length}</span>
        </button>
        <button onClick={() => setTab('group')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] flex items-center justify-center gap-1.5 ${tab === 'group' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
          <ListTree size={14} /> Nhóm Việc <span className="text-[9px] font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded ml-1">{templates.filter(t => t.type === 'group').length}</span>
        </button>
      </div>

      {showEditor && (
        <div className="mb-4">
          {tab === 'single' ? (
            <SingleTemplateEditor template={editingTemplate || undefined} onSave={handleSave} onCancel={() => { setShowEditor(false); setEditingTemplate(null); }} />
          ) : (
            <GroupTemplateEditor template={editingTemplate || undefined} onSave={handleSave} onCancel={() => { setShowEditor(false); setEditingTemplate(null); }} />
          )}
        </div>
      )}

      <div className="space-y-2">
        {displayTemplates.map(template => (
          <div key={template.id} className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-3 active:border-[var(--border-accent)]">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingTemplate(template)}>
                <p className="text-sm font-medium text-[var(--text-primary)]">{template.title}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {template.type === 'group' && <span className="text-[9px] text-[var(--text-muted)]">📦 {template.templateIds?.length || 0} việc</span>}
                  {template.xpReward && <span className="text-[9px] text-[var(--accent-primary)] font-mono">+{template.xpReward}XP</span>}
                  {template.finance && <span className={`text-[9px] font-mono ${template.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{template.finance.type === 'income' ? '+' : '-'}{template.finance.amount.toLocaleString()}đ</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setAddingToTodo(template)} className="px-2.5 py-1.5 rounded-lg bg-[var(--accent-dim)] text-[9px] font-bold text-[var(--accent-primary)]">+ Load</button>
                <button onClick={() => { setEditingTemplate(template); setShowEditor(true); }} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><Edit3 size={12} /></button>
                <button onClick={() => removeTemplate(template.id)} className="size-7 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]"><Trash2 size={12} /></button>
              </div>
            </div>
          </div>
        ))}
        {displayTemplates.length === 0 && !showEditor && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
            <FileText size={32} className="opacity-20 mb-2" />
            <p className="text-xs italic">Chưa có dữ liệu ở tab này</p>
          </div>
        )}
      </div>

      {addingToTodo && <AddToTodoDialog template={addingToTodo} onClose={() => setAddingToTodo(null)} />}
      {viewingTemplate && <TemplateInfoModal template={viewingTemplate} onClose={() => setViewingTemplate(null)} />}
    </div>
  );
}
