import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/stores';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Plus, Mic, MicOff, X, Calendar, Flag, RotateCcw, ChevronDown } from 'lucide-react';
import type { Priority, RecurringConfig, RecurringType } from '@/types';

const PRIORITY_CONFIG: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Thấp', color: 'var(--text-muted)' },
  { value: 'medium', label: 'Trung bình', color: 'var(--accent-primary)' },
  { value: 'high', label: 'Cao', color: 'var(--warning)' },
  { value: 'urgent', label: 'Khẩn cấp', color: 'var(--error)' },
];

const RECURRING_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: 'none', label: 'Không lặp' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekdays', label: 'Thứ 2-6' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'custom', label: 'Tùy chọn' },
];

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function AddTaskInput() {
  const [value, setValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadlineStr, setDeadlineStr] = useState('');
  const [recurringType, setRecurringType] = useState<RecurringType>('none');
  const [customDays, setCustomDays] = useState<number[]>([]);

  const addTask = useTaskStore((s) => s.addTask);
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
    if (deadlineStr) {
      deadline = new Date(deadlineStr).getTime();
    }

    const recurring: RecurringConfig = {
      type: recurringType,
      customDays: recurringType === 'custom' ? customDays : undefined,
      label: recurringType !== 'none' ? trimmed : undefined,
    };

    addTask(trimmed, priority, deadline, recurring);
    setValue('');
    resetTranscript();
    setPriority('medium');
    setDeadlineStr('');
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

  // Get minimum datetime for deadline (now)
  const getMinDatetime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
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
            {/* Priority */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
                <Flag size={12} /> Ưu tiên
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PRIORITY_CONFIG.map(({ value: pv, label, color }) => (
                  <button
                    key={pv}
                    onClick={() => setPriority(pv)}
                    className={`py-2 rounded-lg text-[11px] font-medium min-h-[36px] transition-colors border ${
                      priority === pv
                        ? 'border-current'
                        : 'border-transparent bg-[var(--bg-surface)]'
                    }`}
                    style={priority === pv ? { color, backgroundColor: `${color}15` } : {}}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1.5">
                <Calendar size={12} /> Hạn chót
              </label>
              <input
                type="datetime-local"
                value={deadlineStr}
                onChange={(e) => setDeadlineStr(e.target.value)}
                min={getMinDatetime()}
                className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[40px]"
              />
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

              {/* Custom days selector */}
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
