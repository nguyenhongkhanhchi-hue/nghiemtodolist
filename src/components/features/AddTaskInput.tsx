import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/stores';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Plus, Mic, MicOff, RotateCcw, X } from 'lucide-react';

export function AddTaskInput() {
  const [value, setValue] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const addTask = useTaskStore((s) => s.addTask);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setValue(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    addTask(trimmed, isRecurring, isRecurring ? trimmed : undefined);
    setValue('');
    resetTranscript();
    setIsRecurring(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
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
      <div className="glass-strong rounded-2xl p-3 border border-[var(--border-accent)]">
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

        <div className="flex items-center gap-2">
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
            onClick={() => setIsRecurring(!isRecurring)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] transition-colors ${
              isRecurring
                ? 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
            }`}
          >
            <RotateCcw size={14} />
            Lặp lại
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
      </div>
    </div>
  );
}
