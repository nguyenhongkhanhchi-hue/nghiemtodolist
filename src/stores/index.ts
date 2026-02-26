import { create } from 'zustand';
import type { Task, MusicTrack, ChatMessage, TimerState, TabType, PageType } from '@/types';
import { isGDriveLink, convertGDriveToDirectUrl } from '@/lib/driveUtils';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (saved) return JSON.parse(saved);
  return fallback;
}

function saveToStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ──────────── TASK STORE ────────────
interface TaskStore {
  tasks: Task[];
  activeTab: TabType;
  timer: TimerState;
  setActiveTab: (tab: TabType) => void;
  addTask: (title: string, isRecurring?: boolean, recurringLabel?: string) => void;
  removeTask: (id: string) => void;
  completeTask: (id: string, duration?: number) => void;
  restoreTask: (id: string) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  startTimer: (taskId: string) => void;
  stopTimer: () => void;
  tickTimer: () => void;
  clearAllData: () => void;
  markOverdue: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: loadFromStorage<Task[]>('taskflow_tasks', []),
  activeTab: 'pending',
  timer: { taskId: null, isRunning: false, elapsed: 0, startTime: null },

  setActiveTab: (tab) => set({ activeTab: tab }),

  addTask: (title, isRecurring = false, recurringLabel) => {
    const tasks = get().tasks;
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const newTask: Task = {
      id: generateId(),
      title,
      status: 'pending',
      createdAt: Date.now(),
      order: pendingTasks.length,
      isRecurring,
      recurringLabel: recurringLabel || (isRecurring ? title : undefined),
    };
    const updated = [...tasks, newTask];
    saveToStorage('taskflow_tasks', updated);
    set({ tasks: updated });
  },

  removeTask: (id) => {
    const updated = get().tasks.filter(t => t.id !== id);
    saveToStorage('taskflow_tasks', updated);
    set({ tasks: updated });
  },

  completeTask: (id, duration) => {
    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, status: 'done' as const, completedAt: Date.now(), duration: duration || t.duration || 0 } : t
    );
    saveToStorage('taskflow_tasks', updated);
    const timer = get().timer;
    if (timer.taskId === id) {
      set({ tasks: updated, timer: { taskId: null, isRunning: false, elapsed: 0, startTime: null } });
    } else {
      set({ tasks: updated });
    }
  },

  restoreTask: (id) => {
    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, status: 'pending' as const, completedAt: undefined, duration: undefined } : t
    );
    saveToStorage('taskflow_tasks', updated);
    set({ tasks: updated });
  },

  reorderTasks: (fromIndex, toIndex) => {
    const tasks = [...get().tasks];
    const pending = tasks.filter(t => t.status === 'pending').sort((a, b) => a.order - b.order);
    const [moved] = pending.splice(fromIndex, 1);
    pending.splice(toIndex, 0, moved);
    pending.forEach((t, i) => { t.order = i; });
    const nonPending = tasks.filter(t => t.status !== 'pending');
    const updated = [...pending, ...nonPending];
    saveToStorage('taskflow_tasks', updated);
    set({ tasks: updated });
  },

  startTimer: (taskId) => {
    set({ timer: { taskId, isRunning: true, elapsed: 0, startTime: Date.now() } });
  },

  stopTimer: () => {
    set({ timer: { taskId: null, isRunning: false, elapsed: 0, startTime: null } });
  },

  tickTimer: () => {
    const timer = get().timer;
    if (timer.isRunning && timer.startTime) {
      const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
      set({ timer: { ...timer, elapsed } });
    }
  },

  clearAllData: () => {
    localStorage.removeItem('taskflow_tasks');
    localStorage.removeItem('taskflow_music');
    localStorage.removeItem('taskflow_chat');
    localStorage.removeItem('taskflow_settings');
    set({ tasks: [], timer: { taskId: null, isRunning: false, elapsed: 0, startTime: null } });
  },

  markOverdue: () => {
    const now = new Date();
    const today = now.toDateString();
    const updated = get().tasks.map(t => {
      if (t.status === 'pending') {
        const taskDate = new Date(t.createdAt).toDateString();
        if (taskDate !== today && new Date(t.createdAt) < now) {
          return { ...t, status: 'overdue' as const };
        }
      }
      return t;
    });
    saveToStorage('taskflow_tasks', updated);
    set({ tasks: updated });
  },
}));

// ──────────── MUSIC STORE ────────────
interface MusicStore {
  tracks: MusicTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  addTrack: (title: string, url: string) => void;
  removeTrack: (id: string) => void;
  setCurrentTrack: (index: number) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  tracks: loadFromStorage<MusicTrack[]>('taskflow_music', []),
  currentTrackIndex: 0,
  isPlaying: false,

  addTrack: (title, url) => {
    // Auto-convert Google Drive share links to direct streamable URLs
    const streamUrl = isGDriveLink(url) ? convertGDriveToDirectUrl(url) : url;
    const track: MusicTrack = {
      id: generateId(),
      title,
      url: streamUrl,
      originalUrl: url,
      source: isGDriveLink(url) ? 'gdrive' : 'direct',
      addedAt: Date.now(),
    };
    const updated = [...get().tracks, track];
    saveToStorage('taskflow_music', updated);
    set({ tracks: updated });
  },

  removeTrack: (id) => {
    const updated = get().tracks.filter(t => t.id !== id);
    saveToStorage('taskflow_music', updated);
    set({ tracks: updated });
  },

  setCurrentTrack: (index) => set({ currentTrackIndex: index }),
  togglePlay: () => set({ isPlaying: !get().isPlaying }),
  nextTrack: () => {
    const { tracks, currentTrackIndex } = get();
    if (tracks.length > 0) {
      set({ currentTrackIndex: (currentTrackIndex + 1) % tracks.length });
    }
  },
  prevTrack: () => {
    const { tracks, currentTrackIndex } = get();
    if (tracks.length > 0) {
      set({ currentTrackIndex: (currentTrackIndex - 1 + tracks.length) % tracks.length });
    }
  },
}));

// ──────────── CHAT STORE ────────────
interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setLoading: (loading: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: loadFromStorage<ChatMessage[]>('taskflow_chat', []),
  isLoading: false,

  addMessage: (role, content) => {
    const msg: ChatMessage = { id: generateId(), role, content, timestamp: Date.now() };
    const updated = [...get().messages, msg];
    saveToStorage('taskflow_chat', updated);
    set({ messages: updated });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  clearChat: () => {
    localStorage.removeItem('taskflow_chat');
    set({ messages: [] });
  },
}));

// ──────────── SETTINGS STORE ────────────
interface SettingsStore {
  fontScale: number;
  tickSoundEnabled: boolean;
  voiceEnabled: boolean;
  currentPage: PageType;
  setFontScale: (scale: number) => void;
  setTickSound: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setCurrentPage: (page: PageType) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  fontScale: loadFromStorage<number>('taskflow_fontscale', 1),
  tickSoundEnabled: loadFromStorage<boolean>('taskflow_tick', true),
  voiceEnabled: loadFromStorage<boolean>('taskflow_voice', true),
  currentPage: 'tasks',

  setFontScale: (scale) => {
    saveToStorage('taskflow_fontscale', scale);
    document.documentElement.style.setProperty('--font-scale', String(scale));
    set({ fontScale: scale });
  },

  setTickSound: (enabled) => {
    saveToStorage('taskflow_tick', enabled);
    set({ tickSoundEnabled: enabled });
  },

  setVoiceEnabled: (enabled) => {
    saveToStorage('taskflow_voice', enabled);
    set({ voiceEnabled: enabled });
  },

  setCurrentPage: (page) => set({ currentPage: page }),
}));
