import { create } from 'zustand';
import type {
  Task, ChatMessage, TimerState, TabType, PageType,
  EisenhowerQuadrant, RecurringConfig, UserProfile,
  GamificationState, NotificationSettings, Reward,
} from '@/types';
import { calculateLevel, checkAchievement, getDefaultGamificationState } from '@/lib/gamification';
import { getNowInTimezone } from '@/lib/notifications';

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
  addTask: (title: string, quadrant?: EisenhowerQuadrant, deadline?: number, recurring?: RecurringConfig, deadlineDate?: string, deadlineTime?: string) => void;
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'quadrant' | 'deadline' | 'recurring' | 'notes' | 'deadlineDate' | 'deadlineTime'>>) => void;
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

  addTask: (title, quadrant = 'do_first', deadline, recurring = { type: 'none' }, deadlineDate, deadlineTime) => {
    const tasks = get().tasks;
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const newTask: Task = {
      id: generateId(),
      title,
      status: 'pending',
      quadrant,
      createdAt: Date.now(),
      deadline,
      deadlineDate,
      deadlineTime,
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

    // Update gamification
    const settingsStore = useSettingsStore.getState();
    const task = get().tasks.find(t => t.id === id);
    if (task) {
      const gamStore = useGamificationStore.getState();
      gamStore.onTaskCompleted(task.quadrant, finalDuration, settingsStore.timezone);
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
      set({ timer: { ...timer, isPaused: true, isRunning: false, pausedAt: Date.now() } });
    }
  },

  resumeTimer: () => {
    const timer = get().timer;
    if (timer.isPaused && timer.pausedAt) {
      const pausedDuration = Math.floor((Date.now() - timer.pausedAt) / 1000);
      set({
        timer: { ...timer, isPaused: false, isRunning: true, pausedAt: null, totalPausedDuration: timer.totalPausedDuration + pausedDuration },
      });
    }
  },

  stopTimer: () => {
    const timer = get().timer;
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
    localStorage.removeItem(getUserKey('taskflow_gamification', userId));
    localStorage.removeItem('taskflow_settings');
    set({ tasks: [], timer: { ...defaultTimer } });
  },

  markOverdue: () => {
    const timezone = useSettingsStore.getState().timezone;
    const now = getNowInTimezone(timezone).getTime();
    let changed = false;
    const updated = get().tasks.map(t => {
      if ((t.status === 'pending') && t.deadline && t.deadline < now) {
        changed = true;
        return { ...t, status: 'overdue' as const };
      }
      return t;
    });
    if (changed) {
      const key = getUserKey('taskflow_tasks', get()._userId);
      saveToStorage(key, updated);
      set({ tasks: updated });
    }
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

// ──────────── GAMIFICATION STORE ────────────
interface GamificationStore {
  state: GamificationState;
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  onTaskCompleted: (quadrant: EisenhowerQuadrant, duration: number, timezone: string) => void;
  claimReward: (rewardId: string) => void;
  addCustomReward: (reward: Omit<Reward, 'id' | 'claimed'>) => void;
  removeReward: (rewardId: string) => void;
  _save: () => void;
}

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  state: getDefaultGamificationState(),
  _userId: undefined,

  initForUser: (userId) => {
    const key = getUserKey('taskflow_gamification', userId);
    const saved = loadFromStorage<GamificationState | null>(key, null);
    if (saved) {
      // Merge saved achievements with defaults (in case new ones were added)
      const defaultState = getDefaultGamificationState();
      const existingIds = new Set(saved.achievements.map(a => a.id));
      const newAchievements = defaultState.achievements.filter(a => !existingIds.has(a.id));
      saved.achievements = [...saved.achievements, ...newAchievements];
      set({ state: saved, _userId: userId });
    } else {
      set({ state: getDefaultGamificationState(), _userId: userId });
    }
  },

  _save: () => {
    const key = getUserKey('taskflow_gamification', get()._userId);
    saveToStorage(key, get().state);
  },

  onTaskCompleted: (quadrant, duration, timezone) => {
    const s = { ...get().state };
    const now = getNowInTimezone(timezone);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hour = now.getHours();

    // Base XP
    let xpGain = 10;
    if (quadrant === 'do_first') xpGain = 20;
    else if (quadrant === 'schedule') xpGain = 15;
    else if (quadrant === 'delegate') xpGain = 10;
    else xpGain = 5;

    s.totalTasksCompleted += 1;
    s.totalTimerSeconds += duration;
    s.xp += xpGain;

    if (hour < 9) s.earlyBirdCount += 1;

    // Streak logic
    if (s.lastActiveDate !== todayStr) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      if (s.lastActiveDate === yesterdayStr) {
        s.streak += 1;
      } else {
        s.streak = 1;
      }
      s.lastActiveDate = todayStr;
      s.activeDays += 1;
    }

    // Level
    s.level = calculateLevel(s.xp);

    // Quadrant counts for achievement checking
    const tasks = useTaskStore.getState().tasks;
    const quadrantCounts = {
      do_first: tasks.filter(t => t.status === 'done' && t.quadrant === 'do_first').length,
      schedule: tasks.filter(t => t.status === 'done' && t.quadrant === 'schedule').length,
      delegate: tasks.filter(t => t.status === 'done' && t.quadrant === 'delegate').length,
      eliminate: tasks.filter(t => t.status === 'done' && t.quadrant === 'eliminate').length,
    };

    // Check all achievements
    let achievementXp = 0;
    const newUnlocked: string[] = [];
    s.achievements = s.achievements.map(ach => {
      if (!ach.unlockedAt && checkAchievement(ach, s, quadrantCounts, duration)) {
        achievementXp += ach.xpReward;
        newUnlocked.push(ach.title);
        return { ...ach, unlockedAt: Date.now() };
      }
      return ach;
    });

    s.xp += achievementXp;
    s.level = calculateLevel(s.xp);

    set({ state: s });
    get()._save();

    // Notify achievements
    if (newUnlocked.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      newUnlocked.forEach(title => {
        try {
          new Notification('🏆 Thành tích mới!', { body: title, icon: '/og-image.jpg' });
        } catch { /* silent */ }
      });
    }
  },

  claimReward: (rewardId) => {
    const s = { ...get().state };
    const reward = s.rewards.find(r => r.id === rewardId);
    if (!reward || reward.claimed || s.xp < reward.xpCost) return;

    s.xp -= reward.xpCost;
    s.level = calculateLevel(s.xp);
    s.rewards = s.rewards.map(r =>
      r.id === rewardId ? { ...r, claimed: true, claimedAt: Date.now() } : r
    );

    set({ state: s });
    get()._save();
  },

  addCustomReward: (reward) => {
    const s = { ...get().state };
    s.rewards = [...s.rewards, {
      ...reward,
      id: `custom_${Date.now().toString(36)}`,
      claimed: false,
    }];
    set({ state: s });
    get()._save();
  },

  removeReward: (rewardId) => {
    const s = { ...get().state };
    s.rewards = s.rewards.filter(r => r.id !== rewardId);
    set({ state: s });
    get()._save();
  },
}));

// ──────────── SETTINGS STORE ────────────
interface SettingsStore {
  fontScale: number;
  tickSoundEnabled: boolean;
  voiceEnabled: boolean;
  currentPage: PageType;
  timezone: string;
  notificationSettings: NotificationSettings;
  setFontScale: (scale: number) => void;
  setTickSound: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setCurrentPage: (page: PageType) => void;
  setTimezone: (tz: string) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}

const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  beforeDeadline: 15,
  dailyReminder: false,
  dailyReminderTime: '08:00',
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  fontScale: loadFromStorage<number>('taskflow_fontscale', 1),
  tickSoundEnabled: loadFromStorage<boolean>('taskflow_tick', true),
  voiceEnabled: loadFromStorage<boolean>('taskflow_voice', true),
  timezone: loadFromStorage<string>('taskflow_timezone', 'Asia/Ho_Chi_Minh'),
  notificationSettings: loadFromStorage<NotificationSettings>('taskflow_notifications', defaultNotificationSettings),
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

  setTimezone: (tz) => {
    saveToStorage('taskflow_timezone', tz);
    set({ timezone: tz });
  },

  setNotificationSettings: (partial) => {
    set((prev) => {
      const updated = { ...prev.notificationSettings, ...partial };
      saveToStorage('taskflow_notifications', updated);
      return { notificationSettings: updated };
    });
  },
}));
