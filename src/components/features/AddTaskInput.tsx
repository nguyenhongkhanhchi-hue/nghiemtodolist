import { useState, useRef, useEffect } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Plus, Mic, MicOff, X, Calendar, RotateCcw, ChevronDown, Clock } from 'lucide-react';
import type { EisenhowerQuadrant, RecurringConfig, RecurringType } from '@/types';

import { QUADRANT_LABELS } from '@/types';

const RECURRING_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: 'none', label: 'Không lặp' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekdays', label: 'Thứ 2-6' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'custom', label: 'Tùy chọn' },
];

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const QUICK_DEADLINES = [
  { label: 'Hôm nay', hours: 0, setEndOfDay: true },
  { label: '+1 giờ', hours: 1 },
  { label: '+3 giờ', hours: 3 },
  { label: 'Ngày mai', hours: 24 },
  { label: 'Tuần sau', hours: 168 },
];

export function AddTaskInput() {
  const [value, setValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>('do_first');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [recurringType, setRecurringType] = useState<RecurringType>('none');
  const [customDays, setCustomDays] = useState<number[]>([]);

  const addTask = useTaskStore((s) => s.addTask);
  const timezone = useSettingsStore((s) => s.timezone);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setValue(transcript);
  }, [transcript]);

  useEffect(() => {
    if (showInput && inputRef.current) inputRef.current.focus();
  }, [showInput]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    let deadline: number | undefined;
    if (deadlineDate) {
      const timeStr = deadlineTime || '23:59';
      const dtStr = `${deadlineDate}T${timeStr}:00`;
      deadline = new Date(dtStr).getTime();
    }

    const recurring: RecurringConfig = {
      type: recurringType,
      customDays: recurringType === 'custom' ? customDays : undefined,
      label: recurringType !== 'none' ? trimmed : undefined,
    };

    addTask(trimmed, quadrant, deadline, recurring, deadlineDate, deadlineTime);
    setValue('');
    resetTranscript();
    setQuadrant('do_first');
    setDeadlineDate('');
    setDeadlineTime('');
    setRecurringType('none');
    setCustomDays([]);
    setShowMore(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const toggleVoice = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const toggleDay = (day: number) => {
    setCustomDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const applyQuickDeadline = (item: typeof QUICK_DEADLINES[number]) => {
    const now = new Date();
    let target: Date;
    if (item.setEndOfDay) {
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    } else {
      target = new Date(now.getTime() + item.hours * 3600000);
    }
    setDeadlineDate(`${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`);
    setDeadlineTime(`${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`);
  };

  const getMinDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="fixed bottom-20 right-4 z-40 size-14 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-base)] flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-glow-pulse"
        aria-label="Thêm việc mới"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-2 animate-slide-up">
      <div className="glass-strong rounded-2xl p-3 border border-[var(--border-accent)] max-w-lg mx-auto">
        {/* Title input */}
        <div className="flex items-center gap-2 mb-2">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập hoặc nói việc cần làm..."
            className="flex-1 bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] transition-colors min-h-[44px]"
          />
          <button
            onClick={() => { setShowInput(false); setValue(''); resetTranscript(); }}
            className="size-11 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick actions row */}
        <div className="flex items-center gap-2 mb-2">
          {isSupported && (
            <button
              onClick={toggleVoice}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] transition-colors ${
                isListening
                  ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
              aria-label={isListening ? 'Dừng ghi âm' : 'Nhập bằng giọng nói'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              {isListening ? 'Đang nghe...' : 'Giọng nói'}
            </button>
          )}

          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] transition-colors ${
              showMore
                ? 'bg-[rgba(0,229,204,0.15)] text-[var(--accent-primary)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
            }`}
          >
            <ChevronDown size={14} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
            Tùy chọn
          </button>

          <div className="flex-1" />

          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 active:opacity-80 min-h-[44px]"
          >
            Thêm
          </button>
        </div>

        {/* Expanded options */}
        {showMore && (
          <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)] animate-slide-up">
            {/* Eisenhower Quadrant */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
                Ma trận Eisenhower
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(QUADRANT_LABELS) as EisenhowerQuadrant[]).map(qv => {
                  const cfg = QUADRANT_LABELS[qv];
                  return (
                    <button
                      key={qv}
                      onClick={() => setQuadrant(qv)}
                      className={`py-2.5 rounded-lg text-[11px] font-medium min-h-[40px] transition-colors border flex items-center justify-center gap-1.5 ${
                        quadrant === qv ? 'border-current' : 'border-transparent bg-[var(--bg-surface)]'
                      }`}
                      style={quadrant === qv ? { color: cfg.color, backgroundColor: `${cfg.color}15` } : {}}
                    >
                      <span>{cfg.icon}</span>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1 text-[9px] text-[var(--text-muted)]">
                <div className="text-center">Gấp + Quan trọng</div>
                <div className="text-center">Quan trọng</div>
                <div className="text-center">Gấp</div>
                <div className="text-center">Không gấp, không QT</div>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
                <Calendar size={12} /> Hạn chót
              </label>
              {/* Quick picks */}
              <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                {QUICK_DEADLINES.map((qd) => (
                  <button
                    key={qd.label}
                    onClick={() => applyQuickDeadline(qd)}
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] active:bg-[var(--accent-dim)] active:text-[var(--accent-primary)] transition-colors min-h-[32px]"
                  >
                    {qd.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  min={getMinDate()}
                  className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[40px]"
                />
                <div className="relative flex-1">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="w-full bg-[var(--bg-surface)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[40px]"
                  />
                </div>
              </div>
              {deadlineDate && (
                <button
                  onClick={() => { setDeadlineDate(''); setDeadlineTime(''); }}
                  className="mt-1 text-[10px] text-[var(--error)] active:opacity-70"
                >
                  Xóa hạn chót
                </button>
              )}
            </div>

            {/* Recurring */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
                <RotateCcw size={12} /> Lặp lại
              </label>
              <div className="flex flex-wrap gap-1.5">
                {RECURRING_OPTIONS.map(({ value: rv, label }) => (
                  <button
                    key={rv}
                    onClick={() => setRecurringType(rv)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium min-h-[36px] transition-colors ${
                      recurringType === rv
                        ? 'bg-[rgba(0,229,204,0.15)] text-[var(--accent-primary)] border border-[var(--border-accent)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-transparent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {recurringType === 'custom' && (
                <div className="flex gap-1.5 mt-2">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-medium min-h-[36px] transition-colors ${
                        customDays.includes(idx)
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
