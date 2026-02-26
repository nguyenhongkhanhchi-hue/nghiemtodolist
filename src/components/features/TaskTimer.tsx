import { useState, useRef, useEffect, useCallback } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { useTickSound } from '@/hooks/useTickSound';
import { useVietnameseVoice } from '@/hooks/useVietnameseVoice';
import { Pause, Play, Square, CheckCircle2, X } from 'lucide-react';

export function TaskTimer() {
  const timer = useTaskStore((s) => s.timer);
  const tasks = useTaskStore((s) => s.tasks);
  const tickTimer = useTaskStore((s) => s.tickTimer);
  const stopTimer = useTaskStore((s) => s.stopTimer);
  const pauseTimer = useTaskStore((s) => s.pauseTimer);
  const resumeTimer = useTaskStore((s) => s.resumeTimer);
  const completeTask = useTaskStore((s) => s.completeTask);
  const tickSoundEnabled = useSettingsStore((s) => s.tickSoundEnabled);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);

  const { playTick } = useTickSound();
  const { announceTime, announceCompletion } = useVietnameseVoice();

  const [showCompletion, setShowCompletion] = useState(false);
  const [completionInfo, setCompletionInfo] = useState({ title: '', duration: 0 });
  const lastAnnounced = useRef(0);

  const currentTask = tasks.find((t) => t.id === timer.taskId);

  // Tick every second
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused, tickTimer]);

  // Tick sound
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused || !tickSoundEnabled) return;
    const interval = setInterval(() => {
      playTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused, tickSoundEnabled, playTick]);

  // Voice announcement every 30 seconds
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused || !voiceEnabled) return;
    if (timer.elapsed > 0 && timer.elapsed % 30 === 0 && timer.elapsed !== lastAnnounced.current) {
      lastAnnounced.current = timer.elapsed;
      announceTime(timer.elapsed);
    }
  }, [timer.elapsed, timer.isRunning, timer.isPaused, voiceEnabled, announceTime]);

  const handleComplete = useCallback(() => {
    if (!currentTask) return;
    setCompletionInfo({ title: currentTask.title, duration: timer.elapsed });
    completeTask(currentTask.id, timer.elapsed);
    if (voiceEnabled) {
      announceCompletion(currentTask.title, timer.elapsed);
    }
    setShowCompletion(true);
    setTimeout(() => setShowCompletion(false), 4000);
  }, [currentTask, timer.elapsed, completeTask, voiceEnabled, announceCompletion]);

  const handleStop = useCallback(() => {
    stopTimer();
  }, [stopTimer]);

  const handlePauseResume = useCallback(() => {
    if (timer.isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  }, [timer.isPaused, pauseTimer, resumeTimer]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Completion banner
  if (showCompletion) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/80">
        <div className="w-full max-w-sm glass-strong rounded-2xl p-6 text-center animate-slide-up">
          <div className="size-16 mx-auto mb-4 rounded-full bg-[rgba(52,211,153,0.2)] flex items-center justify-center">
            <CheckCircle2 size={32} className="text-[var(--success)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Hoàn thành!</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-2">{completionInfo.title}</p>
          <p className="text-2xl font-mono font-bold text-[var(--accent-primary)] tabular-nums">
            {formatTime(completionInfo.duration)}
          </p>
        </div>
      </div>
    );
  }

  // Timer bar when running or paused
  if ((!timer.isRunning && !timer.isPaused) || !currentTask) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[80] glass-strong border-b ${timer.isPaused ? 'border-[var(--warning)]' : 'border-[var(--border-accent)]'}`}>
      <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${timer.isPaused ? 'text-[var(--warning)]' : 'text-[var(--accent-primary)]'}`}>
            {timer.isPaused ? 'Tạm dừng' : 'Đang đếm giờ'}
          </p>
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {currentTask.title}
          </p>
        </div>
        <div className={`font-mono text-xl font-bold tabular-nums ${timer.isPaused ? 'text-[var(--warning)]' : 'text-[var(--accent-primary)] animate-timer-pulse'}`}>
          {formatTime(timer.elapsed)}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePauseResume}
            className={`size-10 rounded-xl flex items-center justify-center active:opacity-70 ${
              timer.isPaused
                ? 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)]'
                : 'bg-[rgba(251,191,36,0.2)] text-[var(--warning)]'
            }`}
            aria-label={timer.isPaused ? 'Tiếp tục' : 'Tạm dừng'}
          >
            {timer.isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            onClick={handleComplete}
            className="size-10 rounded-xl bg-[rgba(52,211,153,0.2)] flex items-center justify-center text-[var(--success)] active:opacity-70"
            aria-label="Hoàn thành"
          >
            <CheckCircle2 size={20} />
          </button>
          <button
            onClick={handleStop}
            className="size-10 rounded-xl bg-[rgba(248,113,113,0.2)] flex items-center justify-center text-[var(--error)] active:opacity-70"
            aria-label="Dừng"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
