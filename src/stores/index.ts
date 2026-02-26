import { create } from 'zustand';
import type {
  Task, ChatMessage, TimerState, TabType, PageType,
  EisenhowerQuadrant, RecurringConfig, UserProfile,
  GamificationState, NotificationSettings, Reward,
  TaskTemplate, MediaBlock, TaskFinance, Achievement,
  PomodoroSettings,
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
  searchQuery: string;
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  setActiveTab: (tab: TabType) => void;
  setSearchQuery: (q: string) => void;
  addTask: (title: string, quadrant?: EisenhowerQuadrant, deadline?: number, recurring?: RecurringConfig, deadlineDate?: string, deadlineTime?: string, parentId?: string, media?: MediaBlock[], finance?: TaskFinance, templateId?: string, xpReward?: number) => string;
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'quadrant' | 'deadline' | 'recurring' | 'notes' | 'deadlineDate' | 'deadlineTime' | 'finance' | 'parentId' | 'dependsOn' | 'xpReward'>>) => void;
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
  getSubtasks: (parentId: string) => Task[];
  addSubtask: (parentId: string, title: string, quadrant?: EisenhowerQuadrant) => string;
  assignAsSubtask: (taskId: string, parentId: string) => void;
  unassignSubtask: (taskId: string) => void;
  canStartTask: (taskId: string) => boolean;
  hasChildren: (taskId: string) => boolean;
}

const defaultTimer: TimerState = {
  taskId: null, isRunning: false, isPaused: false, elapsed: 0,
  startTime: null, pausedAt: null, totalPausedDuration: 0,
  pomodoroSession: 0, pomodoroPhase: 'none',
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: loadFromStorage<Task[]>('nw_tasks', []),
  activeTab: 'pending',
  timer: { ...defaultTimer },
  searchQuery: '',
  _userId: undefined,

  initForUser: (userId) => {
    const key = getUserKey('nw_tasks', userId);
    const tasks = loadFromStorage<Task[]>(key, []);
    set({ tasks, _userId: userId, timer: { ...defaultTimer } });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  addTask: (title, quadrant = 'do_first', deadline, recurring = { type: 'none' }, deadlineDate, deadlineTime, parentId, _media, finance, templateId, xpReward) => {
    const tasks = get().tasks;
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    const id = generateId();
    const newTask: Task = {
      id, title, status: 'pending', quadrant,
      createdAt: Date.now(), deadline, deadlineDate, deadlineTime,
      order: pendingTasks.length,
      recurring: recurring || { type: 'none' },
      recurringLabel: recurring && recurring.type !== 'none' ? title : undefined,
      parentId, finance, templateId, xpReward,
    };

    let updated = [...tasks, newTask];
    if (parentId) {
      updated = updated.map(t => {
        if (t.id === parentId) {
          return { ...t, children: [...(t.children || []), id] };
        }
        return t;
      });
    }

    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
    return id;
  },

  updateTask: (id, updates) => {
    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  removeTask: (id) => {
    const tasks = get().tasks;
    const taskToRemove = tasks.find(t => t.id === id);
    const idsToRemove = new Set<string>();
    const collectIds = (taskId: string) => {
      idsToRemove.add(taskId);
      const task = tasks.find(t => t.id === taskId);
      if (task?.children) {
        task.children.forEach(childId => collectIds(childId));
      }
    };
    collectIds(id);

    let updated = tasks.filter(t => !idsToRemove.has(t.id));
    if (taskToRemove?.parentId) {
      updated = updated.map(t => {
        if (t.id === taskToRemove.parentId) {
          return { ...t, children: (t.children || []).filter(cid => cid !== id) };
        }
        return t;
      });
    }
    // Remove from dependsOn of other tasks
    updated = updated.map(t => {
      if (t.dependsOn?.includes(id)) {
        return { ...t, dependsOn: t.dependsOn.filter(d => d !== id) };
      }
      return t;
    });

    const key = getUserKey('nw_tasks', get()._userId);
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
    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);

    if (timer.taskId === id) {
      set({ tasks: updated, timer: { ...defaultTimer } });
    } else {
      set({ tasks: updated });
    }

    const settingsStore = useSettingsStore.getState();
    const task = get().tasks.find(t => t.id === id);
    if (task) {
      const gamStore = useGamificationStore.getState();
      const xpFromTemplate = task.xpReward || 0;
      gamStore.onTaskCompleted(task.quadrant, finalDuration, settingsStore.timezone, xpFromTemplate);
    }
  },

  restoreTask: (id) => {
    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, status: 'pending' as const, completedAt: undefined } : t
    );
    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  reorderTasks: (fromIndex, toIndex) => {
    const tasks = [...get().tasks];
    const pending = tasks.filter(t => (t.status === 'pending' || t.status === 'in_progress') && !t.parentId).sort((a, b) => a.order - b.order);
    if (fromIndex < 0 || fromIndex >= pending.length || toIndex < 0 || toIndex >= pending.length) return;
    const [moved] = pending.splice(fromIndex, 1);
    pending.splice(toIndex, 0, moved);
    pending.forEach((t, i) => { t.order = i; });
    const rest = tasks.filter(t => (t.status !== 'pending' && t.status !== 'in_progress') || t.parentId);
    const updated = [...pending, ...rest];
    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  startTask: (id) => {
    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, status: 'in_progress' as const } : t
    );
    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  startTimer: (taskId) => {
    const pomodoroSettings = useSettingsStore.getState().pomodoroSettings;
    const updated = get().tasks.map(t =>
      t.id === taskId ? { ...t, status: 'in_progress' as const } : t
    );
    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);
    set({
      tasks: updated,
      timer: {
        taskId, isRunning: true, isPaused: false, elapsed: 0,
        startTime: Date.now(), pausedAt: null, totalPausedDuration: 0,
        pomodoroSession: pomodoroSettings.enabled ? 1 : 0,
        pomodoroPhase: pomodoroSettings.enabled ? 'work' : 'none',
      },
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
      set({ timer: { ...timer, isPaused: false, isRunning: true, pausedAt: null, totalPausedDuration: timer.totalPausedDuration + pausedDuration } });
    }
  },

  stopTimer: () => {
    const timer = get().timer;
    if (timer.taskId) {
      const updated = get().tasks.map(t =>
        t.id === timer.taskId && t.status === 'in_progress' ? { ...t, status: 'pending' as const } : t
      );
      const key = getUserKey('nw_tasks', get()._userId);
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
    localStorage.removeItem(getUserKey('nw_tasks', userId));
    localStorage.removeItem(getUserKey('nw_chat', userId));
    localStorage.removeItem(getUserKey('nw_gamification', userId));
    localStorage.removeItem(getUserKey('nw_templates', userId));
    localStorage.removeItem('nw_settings');
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
      const key = getUserKey('nw_tasks', get()._userId);
      saveToStorage(key, updated);
      set({ tasks: updated });
    }
  },

  getSubtasks: (parentId) => {
    return get().tasks.filter(t => t.parentId === parentId).sort((a, b) => a.order - b.order);
  },

  addSubtask: (parentId, title, quadrant = 'do_first') => {
    return get().addTask(title, quadrant, undefined, { type: 'none' }, undefined, undefined, parentId);
  },

  assignAsSubtask: (taskId, parentId) => {
    let updated = get().tasks.map(t => {
      if (t.id === taskId) return { ...t, parentId };
      if (t.id === parentId) return { ...t, children: [...(t.children || []), taskId] };
      return t;
    });
    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  unassignSubtask: (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task?.parentId) return;
    const parentId = task.parentId;
    let updated = get().tasks.map(t => {
      if (t.id === taskId) return { ...t, parentId: undefined };
      if (t.id === parentId) return { ...t, children: (t.children || []).filter(c => c !== taskId) };
      return t;
    });
    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
  },

  canStartTask: (taskId) => {
    const tasks = get().tasks;
    const task = tasks.find(t => t.id === taskId);
    if (!task?.dependsOn || task.dependsOn.length === 0) return true;
    return task.dependsOn.every(depId => {
      const dep = tasks.find(t => t.id === depId);
      return dep?.status === 'done';
    });
  },

  hasChildren: (taskId) => {
    return get().tasks.some(t => t.parentId === taskId);
  },
}));

// ──────────── TEMPLATE STORE ────────────
interface TemplateStore {
  templates: TaskTemplate[];
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  addTemplate: (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => string;
  updateTemplate: (id: string, updates: Partial<TaskTemplate>) => void;
  removeTemplate: (id: string) => void;
  createTaskFromTemplate: (templateId: string, financeOverride?: TaskFinance) => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  _userId: undefined,

  initForUser: (userId) => {
    const key = getUserKey('nw_templates', userId);
    const templates = loadFromStorage<TaskTemplate[]>(key, []);
    set({ templates, _userId: userId });
  },

  addTemplate: (template) => {
    const id = generateId();
    const newTemplate: TaskTemplate = { ...template, id, createdAt: Date.now() };
    const updated = [...get().templates, newTemplate];
    const key = getUserKey('nw_templates', get()._userId);
    saveToStorage(key, updated);
    set({ templates: updated });
    return id;
  },

  updateTemplate: (id, updates) => {
    const updated = get().templates.map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
    );
    const key = getUserKey('nw_templates', get()._userId);
    saveToStorage(key, updated);
    set({ templates: updated });
  },

  removeTemplate: (id) => {
    const updated = get().templates.filter(t => t.id !== id);
    const key = getUserKey('nw_templates', get()._userId);
    saveToStorage(key, updated);
    set({ templates: updated });
  },

  createTaskFromTemplate: (templateId, financeOverride) => {
    const template = get().templates.find(t => t.id === templateId);
    if (!template) return;
    const taskStore = useTaskStore.getState();
    const finance = financeOverride || template.finance;
    const parentId = taskStore.addTask(
      template.title, template.quadrant, undefined, template.recurring,
      undefined, undefined, undefined, undefined, finance, templateId, template.xpReward,
    );
    if (template.subtasks) {
      template.subtasks.forEach(sub => {
        taskStore.addSubtask(parentId, sub.title, sub.quadrant);
      });
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
  messages: loadFromStorage<ChatMessage[]>('nw_chat', []),
  isLoading: false,
  _userId: undefined,

  initForUser: (userId) => {
    const key = getUserKey('nw_chat', userId);
    const messages = loadFromStorage<ChatMessage[]>(key, []);
    set({ messages, _userId: userId });
  },

  addMessage: (role, content) => {
    const msg: ChatMessage = { id: generateId(), role, content, timestamp: Date.now() };
    const updated = [...get().messages, msg];
    const key = getUserKey('nw_chat', get()._userId);
    saveToStorage(key, updated);
    set({ messages: updated });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  clearChat: () => {
    const key = getUserKey('nw_chat', get()._userId);
    localStorage.removeItem(key);
    set({ messages: [] });
  },
}));

// ──────────── GAMIFICATION STORE ────────────
interface GamificationStore {
  state: GamificationState;
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  onTaskCompleted: (quadrant: EisenhowerQuadrant, duration: number, timezone: string, bonusXp?: number) => void;
  claimReward: (rewardId: string) => void;
  addCustomReward: (reward: Omit<Reward, 'id' | 'claimed'>) => void;
  removeReward: (rewardId: string) => void;
  updateReward: (rewardId: string, updates: Partial<Omit<Reward, 'id'>>) => void;
  addCustomAchievement: (achievement: Omit<Achievement, 'id' | 'unlockedAt'>) => void;
  removeAchievement: (achievementId: string) => void;
  updateAchievement: (achievementId: string, updates: Partial<Omit<Achievement, 'id'>>) => void;
  unlockAchievement: (achievementId: string) => void;
  _save: () => void;
}

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  state: getDefaultGamificationState(),
  _userId: undefined,

  initForUser: (userId) => {
    const key = getUserKey('nw_gamification', userId);
    const saved = loadFromStorage<GamificationState | null>(key, null);
    if (saved) {
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
    const key = getUserKey('nw_gamification', get()._userId);
    saveToStorage(key, get().state);
  },

  onTaskCompleted: (quadrant, duration, timezone, bonusXp = 0) => {
    const s = { ...get().state };
    const now = getNowInTimezone(timezone);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const hour = now.getHours();

    let xpGain = 10;
    if (quadrant === 'do_first') xpGain = 20;
    else if (quadrant === 'schedule') xpGain = 15;
    else if (quadrant === 'delegate') xpGain = 10;
    else xpGain = 5;

    xpGain += bonusXp;

    s.totalTasksCompleted += 1;
    s.totalTimerSeconds += duration;
    s.xp += xpGain;

    if (hour < 9) s.earlyBirdCount += 1;

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

    s.level = calculateLevel(s.xp);

    const tasks = useTaskStore.getState().tasks;
    const quadrantCounts = {
      do_first: tasks.filter(t => t.status === 'done' && t.quadrant === 'do_first').length,
      schedule: tasks.filter(t => t.status === 'done' && t.quadrant === 'schedule').length,
      delegate: tasks.filter(t => t.status === 'done' && t.quadrant === 'delegate').length,
      eliminate: tasks.filter(t => t.status === 'done' && t.quadrant === 'eliminate').length,
    };

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
    s.rewards = [...s.rewards, { ...reward, id: `custom_${Date.now().toString(36)}`, claimed: false }];
    set({ state: s });
    get()._save();
  },

  removeReward: (rewardId) => {
    const s = { ...get().state };
    s.rewards = s.rewards.filter(r => r.id !== rewardId);
    set({ state: s });
    get()._save();
  },

  updateReward: (rewardId, updates) => {
    const s = { ...get().state };
    s.rewards = s.rewards.map(r => r.id === rewardId ? { ...r, ...updates } : r);
    set({ state: s });
    get()._save();
  },

  addCustomAchievement: (achievement) => {
    const s = { ...get().state };
    const id = `custom_ach_${Date.now().toString(36)}`;
    s.achievements = [...s.achievements, { ...achievement, id, isCustom: true }];
    set({ state: s });
    get()._save();
  },

  removeAchievement: (achievementId) => {
    const s = { ...get().state };
    s.achievements = s.achievements.filter(a => a.id !== achievementId);
    set({ state: s });
    get()._save();
  },

  updateAchievement: (achievementId, updates) => {
    const s = { ...get().state };
    s.achievements = s.achievements.map(a => a.id === achievementId ? { ...a, ...updates } : a);
    set({ state: s });
    get()._save();
  },

  unlockAchievement: (achievementId) => {
    const s = { ...get().state };
    const ach = s.achievements.find(a => a.id === achievementId);
    if (!ach || ach.unlockedAt) return;
    s.achievements = s.achievements.map(a =>
      a.id === achievementId ? { ...a, unlockedAt: Date.now() } : a
    );
    s.xp += ach.xpReward;
    s.level = calculateLevel(s.xp);
    set({ state: s });
    get()._save();
  },
}));

// ──────────── SETTINGS STORE ────────────
const defaultPomodoroSettings: PomodoroSettings = {
  enabled: false,
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

interface SettingsStore {
  fontScale: number;
  tickSoundEnabled: boolean;
  voiceEnabled: boolean;
  currentPage: PageType;
  timezone: string;
  notificationSettings: NotificationSettings;
  pomodoroSettings: PomodoroSettings;
  setFontScale: (scale: number) => void;
  setTickSound: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setCurrentPage: (page: PageType) => void;
  setTimezone: (tz: string) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setPomodoroSettings: (settings: Partial<PomodoroSettings>) => void;
}

const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  beforeDeadline: 15,
  dailyReminder: false,
  dailyReminderTime: '08:00',
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  fontScale: loadFromStorage<number>('nw_fontscale', 1),
  tickSoundEnabled: loadFromStorage<boolean>('nw_tick', true),
  voiceEnabled: loadFromStorage<boolean>('nw_voice', true),
  timezone: loadFromStorage<string>('nw_timezone', 'Asia/Ho_Chi_Minh'),
  notificationSettings: loadFromStorage<NotificationSettings>('nw_notifications', defaultNotificationSettings),
  pomodoroSettings: loadFromStorage<PomodoroSettings>('nw_pomodoro', defaultPomodoroSettings),
  currentPage: 'tasks',

  setFontScale: (scale) => {
    saveToStorage('nw_fontscale', scale);
    document.documentElement.style.setProperty('--font-scale', String(scale));
    set({ fontScale: scale });
  },
  setTickSound: (enabled) => { saveToStorage('nw_tick', enabled); set({ tickSoundEnabled: enabled }); },
  setVoiceEnabled: (enabled) => { saveToStorage('nw_voice', enabled); set({ voiceEnabled: enabled }); },
  setCurrentPage: (page) => set({ currentPage: page }),
  setTimezone: (tz) => { saveToStorage('nw_timezone', tz); set({ timezone: tz }); },
  setNotificationSettings: (partial) => {
    set((prev) => {
      const updated = { ...prev.notificationSettings, ...partial };
      saveToStorage('nw_notifications', updated);
      return { notificationSettings: updated };
    });
  },
  setPomodoroSettings: (partial) => {
    set((prev) => {
      const updated = { ...prev.pomodoroSettings, ...partial };
      saveToStorage('nw_pomodoro', updated);
      return { pomodoroSettings: updated };
    });
  },
}));
