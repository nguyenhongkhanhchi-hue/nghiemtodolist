import { useState, useRef, useEffect, useCallback } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { useTickSound } from '@/hooks/useTickSound';
import { useVietnameseVoice } from '@/hooks/useVietnameseVoice';
import { playChime, playCompletionSound, getEncouragement } from '@/lib/soundEffects';
import { Pause, Play, Square, Clock } from 'lucide-react';

export function TaskTimer() {
  const timer = useTaskStore(s => s.timer);
  const tasks = useTaskStore(s => s.tasks);
  const tickTimer = useTaskStore(s => s.tickTimer);
  const stopTimer = useTaskStore(s => s.stopTimer);
  const pauseTimer = useTaskStore(s => s.pauseTimer);
  const resumeTimer = useTaskStore(s => s.resumeTimer);
  const tickSoundEnabled = useSettingsStore(s => s.tickSoundEnabled);
  const voiceEnabled = useSettingsStore(s => s.voiceEnabled);
  const { playTick } = useTickSound();
  const { speak, announceTime } = useVietnameseVoice();
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

  // Chime every 30s + voice + encouragement with task info
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused || timer.elapsed === 0) return;
    if (timer.elapsed % 30 === 0 && timer.elapsed !== lastAnnounced.current) {
      lastAnnounced.current = timer.elapsed;
      playChime();
      if (voiceEnabled) setTimeout(() => announceTime(timer.elapsed), 600);
    }
    // Encouragement with task details every ~2 min
    if (timer.elapsed - lastEncourage.current >= 90 + Math.floor(Math.random() * 60)) {
      lastEncourage.current = timer.elapsed;
      if (voiceEnabled && currentTask) {
        const taskInfo = currentTask.deadline
          ? `Hạn chót ${new Date(currentTask.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`
          : '';
        const notesInfo = currentTask.notes ? `Lưu ý: ${currentTask.notes.slice(0, 50)}.` : '';
        setTimeout(() => speak(`Đang làm "${currentTask.title}". ${taskInfo} ${notesInfo} ${getEncouragement()}`), 800);
      }
    }
  }, [timer.elapsed, timer.isRunning, timer.isPaused, voiceEnabled, currentTask]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if ((!timer.isRunning && !timer.isPaused) || !currentTask) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[80] glass-strong border-b ${timer.isPaused ? 'border-[var(--warning)]' : 'border-[var(--border-accent)]'}`}>
      <div className="flex items-center gap-3 px-4 py-2 w-full">
        <Clock size={14} className={timer.isPaused ? 'text-[var(--warning)]' : 'text-[var(--accent-primary)]'} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{currentTask.title}</p>
          {currentTask.duration && currentTask.duration > 0 && (
            <p className="text-[9px] text-[var(--text-muted)] font-mono">Tổng: {formatTime(currentTask.duration + timer.elapsed)}</p>
          )}
        </div>
        <div className={`font-mono text-lg font-bold tabular-nums ${timer.isPaused ? 'text-[var(--warning)]' : 'text-[var(--accent-primary)] animate-timer-pulse'}`}>
          {formatTime(timer.elapsed)}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => timer.isPaused ? resumeTimer() : pauseTimer()}
            className={`size-9 rounded-xl flex items-center justify-center ${timer.isPaused ? 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)]' : 'bg-[rgba(251,191,36,0.2)] text-[var(--warning)]'}`}>
            {timer.isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button onClick={stopTimer} className="size-9 rounded-xl bg-[rgba(248,113,113,0.15)] flex items-center justify-center text-[var(--error)]">
            <Square size={14} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}
