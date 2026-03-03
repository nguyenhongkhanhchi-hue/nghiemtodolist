import { useState, useRef, useEffect, useCallback } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { useTickSound } from '@/hooks/useTickSound';
import { useVietnameseVoice } from '@/hooks/useVietnameseVoice';
import { playChime, playCompletionSound, getEncouragement } from '@/lib/soundEffects';
import { Pause, Play, CheckCircle2, X } from 'lucide-react';

export function TaskTimer() {
  const timer = useTaskStore(s => s.timer);
  const tasks = useTaskStore(s => s.tasks);
  const tickTimer = useTaskStore(s => s.tickTimer);
  const stopTimer = useTaskStore(s => s.stopTimer);
  const pauseTimer = useTaskStore(s => s.pauseTimer);
  const resumeTimer = useTaskStore(s => s.resumeTimer);
  const completeTask = useTaskStore(s => s.completeTask);
  const tickSoundEnabled = useSettingsStore(s => s.tickSoundEnabled);
  const voiceEnabled = useSettingsStore(s => s.voiceEnabled);
  const { playTick } = useTickSound();
  const { speak, announceTime, announceCompletion } = useVietnameseVoice();
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionInfo, setCompletionInfo] = useState({ title: '', duration: 0 });
  const lastAnnounced = useRef(0);
  const lastEncourage = useRef(0);
  const currentTask = tasks.find(t => t.id === timer.taskId);

  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) return;
    const i = setInterval(() => tickTimer(), 1000);
    return () => clearInterval(i);
  }, [timer.isRunning, timer.isPaused]);

  useEffect(() => {
    if (!timer.isRunning || timer.isPaused || !tickSoundEnabled) return;
    const i = setInterval(() => playTick(), 1000);
    return () => clearInterval(i);
  }, [timer.isRunning, timer.isPaused, tickSoundEnabled]);

  // Chime every 30s + voice + encouragement
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused || timer.elapsed === 0) return;
    if (timer.elapsed % 30 === 0 && timer.elapsed !== lastAnnounced.current) {
      lastAnnounced.current = timer.elapsed;
      playChime();
      if (voiceEnabled) setTimeout(() => announceTime(timer.elapsed), 600);
    }
    if (timer.elapsed - lastEncourage.current >= 120 + Math.floor(Math.random() * 60)) {
      lastEncourage.current = timer.elapsed;
      if (voiceEnabled && currentTask) {
        setTimeout(() => speak(`Đang làm "${currentTask.title}". ${getEncouragement()}`), 800);
      }
    }
  }, [timer.elapsed, timer.isRunning, timer.isPaused, voiceEnabled, currentTask]);

  const handleComplete = useCallback(() => {
    if (!currentTask) return;
    setCompletionInfo({ title: currentTask.title, duration: timer.elapsed });
    completeTask(currentTask.id, timer.elapsed);
    playCompletionSound();
    if (voiceEnabled) setTimeout(() => announceCompletion(currentTask.title, timer.elapsed), 300);
    setShowCompletion(true);
    setTimeout(() => setShowCompletion(false), 3000);
  }, [currentTask, timer.elapsed, completeTask, voiceEnabled]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (showCompletion) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/80">
        <div className="w-full max-w-sm glass-strong rounded-2xl p-6 text-center animate-slide-up">
          <CheckCircle2 size={32} className="text-[var(--success)] mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Hoàn thành!</h3>
          <p className="text-sm text-[var(--text-secondary)]">{completionInfo.title}</p>
          <p className="text-2xl font-mono font-bold text-[var(--accent-primary)] mt-2 tabular-nums">{formatTime(completionInfo.duration)}</p>
        </div>
      </div>
    );
  }

  if ((!timer.isRunning && !timer.isPaused) || !currentTask) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[80] glass-strong border-b ${timer.isPaused ? 'border-[var(--warning)]' : 'border-[var(--border-accent)]'}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 w-full">
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-medium ${timer.isPaused ? 'text-[var(--warning)]' : 'text-[var(--accent-primary)]'}`}>
            {timer.isPaused ? 'Tạm dừng' : 'Đang đếm giờ'}
          </p>
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{currentTask.title}</p>
        </div>
        <div className={`font-mono text-lg font-bold tabular-nums ${timer.isPaused ? 'text-[var(--warning)]' : 'text-[var(--accent-primary)] animate-timer-pulse'}`}>
          {formatTime(timer.elapsed)}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => timer.isPaused ? resumeTimer() : pauseTimer()}
            className={`size-9 rounded-xl flex items-center justify-center ${timer.isPaused ? 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)]' : 'bg-[rgba(251,191,36,0.2)] text-[var(--warning)]'}`}>
            {timer.isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button onClick={handleComplete} className="size-9 rounded-xl bg-[rgba(52,211,153,0.2)] flex items-center justify-center text-[var(--success)]">
            <CheckCircle2 size={18} />
          </button>
          <button onClick={stopTimer} className="size-9 rounded-xl bg-[rgba(248,113,113,0.2)] flex items-center justify-center text-[var(--error)]">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
