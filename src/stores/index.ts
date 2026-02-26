import { create } from 'zustand';
import type { Task, ChatMessage, TimerState, TabType, PageType, Priority, RecurringConfig, UserProfile } from '@/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getUserKey(base: string, userId?: string): string {
  if (userId) return `${base}_${userId}`;
  return base;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch { return fallback; }
  }
  return fallback;
}

function saveToStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ──────────── AUTH STORE ────────────
interface AuthStore {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null }),
}));

// ──────────── TASK STORE ────────────
interface TaskStore {
  tasks: Task[];
  activeTab: TabType;
  timer: TimerState;
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  setActiveTab: (tab: TabType) => void;
  addTask: (title: string, priority?: Priority, deadline?: number, recurring?: RecurringConfig) => void;
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'priority' | 'deadline' | 'recurring' | 'notes'>>) => void;
  removeTask: (id: string) => void;
  completeTask: (id: string, duration?: number) => void;
  restoreTask: (id: string) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  startTimer: (taskId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tickTimer: () => void;
  clearAllData: () => void;
  markOverdue: () => void;
  startTask: (id: string) => void;
}

const defaultTimer: TimerState = { taskId: null, isRunning: false, isPaused: false, elapsed: 0, startTime: null, pausedAt: null, totalPausedDuration: 0 };

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: loadFromStorage<Task[]>('taskflow_tasks', []),
  activeTab: 'pending',
  timer: { ...defaultTimer },
  _userId: undefined,

  initForUser: (userId) => {
    const key = getUserKey('taskflow_tasks', userId);
    const tasks = loadFromStorage<Task[]>(key, []);
    set({ tasks, _userId: userId, timer: { ...defaultTimer } });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  addTask: (title, priority = 'medium', deadline, recurring = { type: 'none' }) => {
    const tasks = get().tasks;
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const newTask: Task = {
      id: generateId(),
      title,
      status: 'pending',
      priority,
      createdAt: Date.now(),
      deadline,
      order: pendingTasks.length,
      recurring,
      recurringLabel: recurring.type !== 'none' ? title : undefined,
    };
    const updated = [...tasks, newTask];
    const key = getUserKey('taskflow_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  updateTask: (id, updates) => {
    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    const key = getUserKey('taskflow_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  removeTask: (id) => {
    const updated = get().tasks.filter(t => t.id !== id);
    const key = getUserKey('taskflow_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  completeTask: (id, duration) => {
    const timer = get().timer;
    const timerElapsed = timer.taskId === id ? timer.elapsed : 0;
    const finalDuration = duration || timerElapsed || 0;

    const updated = get().tasks.map(t =>
      t.id === id ? {
        ...t,
        status: 'done' as const,
        completedAt: Date.now(),
        duration: (t.duration || 0) + finalDuration,
      } : t
    );
    const key = getUserKey('taskflow_tasks', get()._userId);
    saveToStorage(key, updated);

    if (timer.taskId === id) {
      set({ tasks: updated, timer: { ...defaultTimer } });
    } else {
      set({ tasks: updated });
    }
  },

  restoreTask: (id) => {
    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, status: 'pending' as const, completedAt: undefined } : t
    );
    const key = getUserKey('taskflow_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  reorderTasks: (fromIndex, toIndex) => {
    const tasks = [...get().tasks];
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').sort((a, b) => a.order - b.order);
    const [moved] = pending.splice(fromIndex, 1);
    pending.splice(toIndex, 0, moved);
    pending.forEach((t, i) => { t.order = i; });
    const rest = tasks.filter(t => t.status !== 'pending' && t.status !== 'in_progress');
    const updated = [...pending, ...rest];
    const key = getUserKey('taskflow_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  startTask: (id) => {
    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, status: 'in_progress' as const } : t
    );
    const key = getUserKey('taskflow_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  startTimer: (taskId) => {
    // Also mark task as in_progress
    const updated = get().tasks.map(t =>
      t.id === taskId ? { ...t, status: 'in_progress' as const } : t
    );
    const key = getUserKey('taskflow_tasks', get()._userId);
    saveToStorage(key, updated);
    set({
      tasks: updated,
      timer: { taskId, isRunning: true, isPaused: false, elapsed: 0, startTime: Date.now(), pausedAt: null, totalPausedDuration: 0 },
    });
  },

  pauseTimer: () => {
    const timer = get().timer;
    if (timer.isRunning && !timer.isPaused) {
      set({
        timer: { ...timer, isPaused: true, isRunning: false, pausedAt: Date.now() },
      });
    }
  },

  resumeTimer: () => {
    const timer = get().timer;
    if (timer.isPaused && timer.pausedAt) {
      const pausedDuration = Math.floor((Date.now() - timer.pausedAt) / 1000);
      set({
        timer: {
          ...timer,
          isPaused: false,
          isRunning: true,
          pausedAt: null,
          totalPausedDuration: timer.totalPausedDuration + pausedDuration,
        },
      });
    }
  },

  stopTimer: () => {
    const timer = get().timer;
    // Revert task to pending if stopping without completing
    if (timer.taskId) {
      const updated = get().tasks.map(t =>
        t.id === timer.taskId && t.status === 'in_progress' ? { ...t, status: 'pending' as const } : t
      );
      const key = getUserKey('taskflow_tasks', get()._userId);
      saveToStorage(key, updated);
      set({ tasks: updated, timer: { ...defaultTimer } });
    } else {
      set({ timer: { ...defaultTimer } });
    }
  },

  tickTimer: () => {
    const timer = get().timer;
    if (timer.isRunning && timer.startTime && !timer.isPaused) {
      const totalElapsed = Math.floor((Date.now() - timer.startTime) / 1000);
      const elapsed = totalElapsed - timer.totalPausedDuration;
      set({ timer: { ...timer, elapsed } });
    }
  },

  clearAllData: () => {
    const userId = get()._userId;
    localStorage.removeItem(getUserKey('taskflow_tasks', userId));
    localStorage.removeItem(getUserKey('taskflow_chat', userId));
    localStorage.removeItem('taskflow_settings');
    set({ tasks: [], timer: { ...defaultTimer } });
  },

  markOverdue: () => {
    const now = Date.now();
    const updated = get().tasks.map(t => {
      if ((t.status === 'pending') && t.deadline && t.deadline < now) {
        return { ...t, status: 'overdue' as const };
      }
      return t;
    });
    const key = getUserKey('taskflow_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },
}));

// ──────────── CHAT STORE ────────────
interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  initForUser: (userId?: string) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setLoading: (loading: boolean) => void;
  clearChat: () => void;
  _userId: string | undefined;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: loadFromStorage<ChatMessage[]>('taskflow_chat', []),
  isLoading: false,
  _userId: undefined,

  initForUser: (userId) => {
    const key = getUserKey('taskflow_chat', userId);
    const messages = loadFromStorage<ChatMessage[]>(key, []);
    set({ messages, _userId: userId });
  },

  addMessage: (role, content) => {
    const msg: ChatMessage = { id: generateId(), role, content, timestamp: Date.now() };
    const updated = [...get().messages, msg];
    const key = getUserKey('taskflow_chat', get()._userId);
    saveToStorage(key, updated);
    set({ messages: updated });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  clearChat: () => {
    const key = getUserKey('taskflow_chat', get()._userId);
    localStorage.removeItem(key);
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
