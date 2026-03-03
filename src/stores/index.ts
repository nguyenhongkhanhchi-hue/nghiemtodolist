import { create } from 'zustand';
import type {
  Task, ChatMessage, TimerState, TabType, PageType,
  EisenhowerQuadrant, RecurringConfig, UserProfile,
  GamificationState, NotificationSettings, Reward,
  TaskTemplate, TaskFinance, Achievement, Topic,
} from '@/types';
import { calculateLevel, checkAchievement, getDefaultGamificationState } from '@/lib/gamification';
import { getNowInTimezone } from '@/lib/notifications';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function getUserKey(base: string, userId?: string): string {
  return userId ? `${base}_${userId}` : base;
}
function loadFromStorage<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
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
  addTask: (title: string, quadrant?: EisenhowerQuadrant, deadline?: number, recurring?: RecurringConfig, deadlineDate?: string, deadlineTime?: string, parentId?: string, finance?: TaskFinance, templateId?: string, xpReward?: number, isGroup?: boolean) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
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
  assignAsSubtask: (taskId: string, parentId: string) => void;
  unassignSubtask: (taskId: string) => void;
  canStartTask: (taskId: string) => boolean;
  hasChildren: (taskId: string) => boolean;
  getGroupProgress: (taskId: string) => { total: number; done: number; percent: number };
}

const defaultTimer: TimerState = {
  taskId: null, isRunning: false, isPaused: false, elapsed: 0,
  startTime: null, pausedAt: null, totalPausedDuration: 0,
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  activeTab: 'pending',
  timer: { ...defaultTimer },
  searchQuery: '',
  _userId: undefined,

  initForUser: (userId) => {
    const key = getUserKey('nw_tasks', userId);
    set({ tasks: loadFromStorage<Task[]>(key, []), _userId: userId, timer: { ...defaultTimer } });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  addTask: (title, quadrant = 'do_first', deadline, recurring = { type: 'none' }, deadlineDate, deadlineTime, parentId, finance, templateId, xpReward, isGroup) => {
    const tasks = get().tasks;
    const id = generateId();
    const newTask: Task = {
      id, title, status: 'pending', quadrant,
      createdAt: Date.now(), deadline, deadlineDate, deadlineTime,
      order: tasks.filter(t => (t.status === 'pending' || t.status === 'in_progress') && !t.parentId).length,
      recurring: recurring || { type: 'none' },
      recurringLabel: recurring && recurring.type !== 'none' ? title : undefined,
      parentId, finance, templateId, xpReward, isGroup,
    };
    let updated = [...tasks, newTask];
    if (parentId) {
      updated = updated.map(t => t.id === parentId ? { ...t, children: [...(t.children || []), id] } : t);
    }
    const key = getUserKey('nw_tasks', get()._userId);
    saveToStorage(key, updated);
    set({ tasks: updated });
    return id;
  },

  updateTask: (id, updates) => {
    const updated = get().tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
  },

  removeTask: (id) => {
    const tasks = get().tasks;
    const taskToRemove = tasks.find(t => t.id === id);
    const idsToRemove = new Set<string>();
    const collectIds = (tid: string) => {
      idsToRemove.add(tid);
      tasks.filter(t => t.parentId === tid).forEach(t => collectIds(t.id));
    };
    collectIds(id);
    let updated = tasks.filter(t => !idsToRemove.has(t.id));
    if (taskToRemove?.parentId) {
      updated = updated.map(t => t.id === taskToRemove.parentId ? { ...t, children: (t.children || []).filter(c => c !== id) } : t);
    }
    updated = updated.map(t => t.dependsOn?.includes(id) ? { ...t, dependsOn: t.dependsOn.filter(d => d !== id) } : t);
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
  },

  completeTask: (id, duration) => {
    const timer = get().timer;
    const timerElapsed = timer.taskId === id ? timer.elapsed : 0;
    const finalDuration = duration || timerElapsed || 0;
    let updated = get().tasks.map(t =>
      t.id === id ? { ...t, status: 'done' as const, completedAt: Date.now(), duration: (t.duration || 0) + finalDuration } : t
    );
    // If group completed, complete all children
    const task = get().tasks.find(t => t.id === id);
    if (task?.isGroup || task?.children?.length) {
      const childIds = new Set(task.children || []);
      updated = updated.map(t => childIds.has(t.id) && t.status !== 'done' ? { ...t, status: 'done' as const, completedAt: Date.now() } : t);
    }
    // If child completed, check if all siblings done -> complete parent
    if (task?.parentId) {
      const parent = get().tasks.find(t => t.id === task.parentId);
      if (parent) {
        const siblings = updated.filter(t => t.parentId === parent.id);
        if (siblings.every(s => s.status === 'done')) {
          updated = updated.map(t => t.id === parent.id ? { ...t, status: 'done' as const, completedAt: Date.now() } : t);
        }
      }
    }
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated, timer: timer.taskId === id ? { ...defaultTimer } : get().timer });
    // Gamification
    if (task) {
      const tz = useSettingsStore.getState().timezone;
      useGamificationStore.getState().onTaskCompleted(task.quadrant, finalDuration, tz, task.xpReward || 0);
    }
  },

  restoreTask: (id) => {
    const updated = get().tasks.map(t => t.id === id ? { ...t, status: 'pending' as const, completedAt: undefined } : t);
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
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
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
  },

  startTimer: (taskId) => {
    const updated = get().tasks.map(t => t.id === taskId ? { ...t, status: 'in_progress' as const } : t);
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({
      tasks: updated,
      timer: { taskId, isRunning: true, isPaused: false, elapsed: 0, startTime: Date.now(), pausedAt: null, totalPausedDuration: 0 },
    });
  },
  pauseTimer: () => {
    const t = get().timer;
    if (t.isRunning && !t.isPaused) set({ timer: { ...t, isPaused: true, isRunning: false, pausedAt: Date.now() } });
  },
  resumeTimer: () => {
    const t = get().timer;
    if (t.isPaused && t.pausedAt) {
      const pd = Math.floor((Date.now() - t.pausedAt) / 1000);
      set({ timer: { ...t, isPaused: false, isRunning: true, pausedAt: null, totalPausedDuration: t.totalPausedDuration + pd } });
    }
  },
  stopTimer: () => {
    const t = get().timer;
    if (t.taskId) {
      const updated = get().tasks.map(tk => tk.id === t.taskId && tk.status === 'in_progress' ? { ...tk, status: 'pending' as const } : tk);
      saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
      set({ tasks: updated, timer: { ...defaultTimer } });
    } else set({ timer: { ...defaultTimer } });
  },
  tickTimer: () => {
    const t = get().timer;
    if (t.isRunning && t.startTime && !t.isPaused) {
      set({ timer: { ...t, elapsed: Math.floor((Date.now() - t.startTime) / 1000) - t.totalPausedDuration } });
    }
  },
  clearAllData: () => {
    const u = get()._userId;
    ['nw_tasks', 'nw_chat', 'nw_gamification', 'nw_templates', 'nw_topics'].forEach(k => localStorage.removeItem(getUserKey(k, u)));
    localStorage.removeItem('nw_settings');
    set({ tasks: [], timer: { ...defaultTimer } });
  },
  markOverdue: () => {
    const tz = useSettingsStore.getState().timezone;
    const now = getNowInTimezone(tz).getTime();
    let changed = false;
    const updated = get().tasks.map(t => {
      if (t.status === 'pending' && t.deadline && t.deadline < now) {
        changed = true;
        // Auto move schedule -> do_first if deadline is today
        return { ...t, status: 'overdue' as const };
      }
      // Auto move schedule to do_first if deadline is today
      if (t.status === 'pending' && t.quadrant === 'schedule' && t.deadline) {
        const deadlineDate = new Date(t.deadline);
        const nowDate = new Date(now);
        if (deadlineDate.toDateString() === nowDate.toDateString()) {
          changed = true;
          return { ...t, quadrant: 'do_first' as const };
        }
      }
      return t;
    });
    if (changed) {
      saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
      set({ tasks: updated });
    }
  },
  assignAsSubtask: (taskId, parentId) => {
    let updated = get().tasks.map(t => {
      if (t.id === taskId) return { ...t, parentId };
      if (t.id === parentId) return { ...t, children: [...(t.children || []), taskId], isGroup: true };
      return t;
    });
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
  },
  unassignSubtask: (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task?.parentId) return;
    const pid = task.parentId;
    let updated = get().tasks.map(t => {
      if (t.id === taskId) return { ...t, parentId: undefined };
      if (t.id === pid) return { ...t, children: (t.children || []).filter(c => c !== taskId) };
      return t;
    });
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
  },
  canStartTask: (taskId) => {
    const tasks = get().tasks;
    const task = tasks.find(t => t.id === taskId);
    if (!task?.dependsOn?.length) return true;
    return task.dependsOn.every(d => tasks.find(t => t.id === d)?.status === 'done');
  },
  hasChildren: (taskId) => get().tasks.some(t => t.parentId === taskId),
  getGroupProgress: (taskId) => {
    const children = get().tasks.filter(t => t.parentId === taskId);
    const total = children.length;
    const done = children.filter(c => c.status === 'done').length;
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  },
}));

// ──────────── TOPIC STORE ────────────
interface TopicStore {
  topics: Topic[];
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  addTopic: (name: string) => string;
  removeTopic: (id: string) => void;
  addTopicParam: (topicId: string, paramName: string) => void;
  removeTopicParam: (topicId: string, paramId: string) => void;
}

export const useTopicStore = create<TopicStore>((set, get) => ({
  topics: [],
  _userId: undefined,
  initForUser: (userId) => {
    set({ topics: loadFromStorage<Topic[]>(getUserKey('nw_topics', userId), []), _userId: userId });
  },
  addTopic: (name) => {
    const id = generateId();
    const updated = [...get().topics, { id, name, params: [] }];
    saveToStorage(getUserKey('nw_topics', get()._userId), updated);
    set({ topics: updated });
    return id;
  },
  removeTopic: (id) => {
    const updated = get().topics.filter(t => t.id !== id);
    saveToStorage(getUserKey('nw_topics', get()._userId), updated);
    set({ topics: updated });
  },
  addTopicParam: (topicId, paramName) => {
    const updated = get().topics.map(t =>
      t.id === topicId ? { ...t, params: [...t.params, { id: generateId(), name: paramName, value: '' }] } : t
    );
    saveToStorage(getUserKey('nw_topics', get()._userId), updated);
    set({ topics: updated });
  },
  removeTopicParam: (topicId, paramId) => {
    const updated = get().topics.map(t =>
      t.id === topicId ? { ...t, params: t.params.filter(p => p.id !== paramId) } : t
    );
    saveToStorage(getUserKey('nw_topics', get()._userId), updated);
    set({ topics: updated });
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
  createTaskFromTemplate: (templateId: string, financeOverride?: TaskFinance, deadlineDate?: string, deadlineTime?: string, quadrantOverride?: EisenhowerQuadrant, recurringOverride?: RecurringConfig, notesOverride?: string) => void;
  exportTemplates: () => string;
  importTemplates: (json: string) => number;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  _userId: undefined,
  initForUser: (userId) => {
    set({ templates: loadFromStorage<TaskTemplate[]>(getUserKey('nw_templates', userId), []), _userId: userId });
  },
  addTemplate: (template) => {
    const id = generateId();
    const newT: TaskTemplate = { ...template, id, createdAt: Date.now() };
    const updated = [...get().templates, newT];
    saveToStorage(getUserKey('nw_templates', get()._userId), updated);
    set({ templates: updated });
    return id;
  },
  updateTemplate: (id, updates) => {
    const updated = get().templates.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t);
    saveToStorage(getUserKey('nw_templates', get()._userId), updated);
    set({ templates: updated });
  },
  removeTemplate: (id) => {
    const updated = get().templates.filter(t => t.id !== id);
    saveToStorage(getUserKey('nw_templates', get()._userId), updated);
    set({ templates: updated });
  },
  createTaskFromTemplate: (templateId, financeOverride, deadlineDate, deadlineTime, quadrantOverride, recurringOverride, notesOverride) => {
    const template = get().templates.find(t => t.id === templateId);
    if (!template) return;
    const taskStore = useTaskStore.getState();
    const quadrant = quadrantOverride || template.quadrant;
    const recurring = recurringOverride || template.recurring;
    let deadline: number | undefined;
    if (deadlineDate) {
      const timeStr = deadlineTime || '23:59';
      deadline = new Date(`${deadlineDate}T${timeStr}:00`).getTime();
    }
    const finance = financeOverride || template.finance;
    const isGroup = template.isGroup || (template.subtasks && template.subtasks.length > 0);
    const parentId = taskStore.addTask(
      template.title, quadrant, deadline, recurring,
      deadlineDate, deadlineTime, undefined, finance, templateId, template.xpReward, isGroup,
    );
    if (notesOverride) taskStore.updateTask(parentId, { notes: notesOverride });
    else if (template.notes) taskStore.updateTask(parentId, { notes: template.notes });
    if (template.subtasks) {
      template.subtasks.forEach(sub => {
        taskStore.addTask(sub.title, sub.quadrant, deadline, { type: 'none' }, deadlineDate, deadlineTime, parentId);
      });
    }
  },
  exportTemplates: () => {
    const templates = get().templates;
    const topics = useTopicStore.getState().topics;
    return JSON.stringify({ version: 3, templates, topics }, null, 2);
  },
  importTemplates: (json) => {
    try {
      const data = JSON.parse(json);
      if (!data.templates) return 0;
      const existing = get().templates;
      const newTemplates = data.templates.map((t: any) => ({ ...t, id: generateId(), createdAt: Date.now() }));
      const updated = [...existing, ...newTemplates];
      saveToStorage(getUserKey('nw_templates', get()._userId), updated);
      set({ templates: updated });
      if (data.topics) {
        const topicStore = useTopicStore.getState();
        const existingTopics = topicStore.topics;
        data.topics.forEach((t: any) => {
          if (!existingTopics.find(et => et.name === t.name)) {
            topicStore.addTopic(t.name);
          }
        });
      }
      return newTemplates.length;
    } catch { return 0; }
  },
}));

// ──────────── CHAT STORE ────────────
interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setLoading: (loading: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  _userId: undefined,
  initForUser: (userId) => {
    set({ messages: loadFromStorage<ChatMessage[]>(getUserKey('nw_chat', userId), []), _userId: userId });
  },
  addMessage: (role, content) => {
    const msg: ChatMessage = { id: generateId(), role, content, timestamp: Date.now() };
    const updated = [...get().messages, msg];
    saveToStorage(getUserKey('nw_chat', get()._userId), updated);
    set({ messages: updated });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  clearChat: () => {
    localStorage.removeItem(getUserKey('nw_chat', get()._userId));
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
    const saved = loadFromStorage<GamificationState | null>(getUserKey('nw_gamification', userId), null);
    if (saved) {
      const def = getDefaultGamificationState();
      const ids = new Set(saved.achievements.map(a => a.id));
      saved.achievements = [...saved.achievements, ...def.achievements.filter(a => !ids.has(a.id))];
      set({ state: saved, _userId: userId });
    } else set({ state: getDefaultGamificationState(), _userId: userId });
  },
  _save: () => saveToStorage(getUserKey('nw_gamification', get()._userId), get().state),
  onTaskCompleted: (quadrant, duration, timezone, bonusXp = 0) => {
    const s = { ...get().state };
    const now = getNowInTimezone(timezone);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let xp = quadrant === 'do_first' ? 20 : quadrant === 'schedule' ? 15 : quadrant === 'delegate' ? 10 : 5;
    xp += bonusXp;
    s.totalTasksCompleted += 1;
    s.totalTimerSeconds += duration;
    s.xp += xp;
    if (now.getHours() < 9) s.earlyBirdCount += 1;
    if (s.lastActiveDate !== todayStr) {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const ys = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      s.streak = s.lastActiveDate === ys ? s.streak + 1 : 1;
      s.lastActiveDate = todayStr;
      s.activeDays += 1;
    }
    s.level = calculateLevel(s.xp);
    const tasks = useTaskStore.getState().tasks;
    const qc = { do_first: 0, schedule: 0, delegate: 0, eliminate: 0 } as Record<EisenhowerQuadrant, number>;
    tasks.filter(t => t.status === 'done').forEach(t => { qc[t.quadrant] = (qc[t.quadrant] || 0) + 1; });
    let achXp = 0;
    s.achievements = s.achievements.map(a => {
      if (!a.unlockedAt && checkAchievement(a, s, qc, duration)) {
        achXp += a.xpReward;
        return { ...a, unlockedAt: Date.now() };
      }
      return a;
    });
    s.xp += achXp;
    s.level = calculateLevel(s.xp);
    set({ state: s });
    get()._save();
  },
  claimReward: (rewardId) => {
    const s = { ...get().state };
    const r = s.rewards.find(r => r.id === rewardId);
    if (!r || r.claimed || s.xp < r.xpCost) return;
    s.xp -= r.xpCost;
    s.level = calculateLevel(s.xp);
    s.rewards = s.rewards.map(r => r.id === rewardId ? { ...r, claimed: true, claimedAt: Date.now() } : r);
    set({ state: s }); get()._save();
  },
  addCustomReward: (reward) => {
    const s = { ...get().state };
    s.rewards = [...s.rewards, { ...reward, id: `cr_${generateId()}`, claimed: false }];
    set({ state: s }); get()._save();
  },
  removeReward: (id) => {
    const s = { ...get().state }; s.rewards = s.rewards.filter(r => r.id !== id);
    set({ state: s }); get()._save();
  },
  updateReward: (id, updates) => {
    const s = { ...get().state }; s.rewards = s.rewards.map(r => r.id === id ? { ...r, ...updates } : r);
    set({ state: s }); get()._save();
  },
  addCustomAchievement: (ach) => {
    const s = { ...get().state };
    s.achievements = [...s.achievements, { ...ach, id: `ca_${generateId()}`, isCustom: true }];
    set({ state: s }); get()._save();
  },
  removeAchievement: (id) => {
    const s = { ...get().state }; s.achievements = s.achievements.filter(a => a.id !== id);
    set({ state: s }); get()._save();
  },
  updateAchievement: (id, updates) => {
    const s = { ...get().state }; s.achievements = s.achievements.map(a => a.id === id ? { ...a, ...updates } : a);
    set({ state: s }); get()._save();
  },
  unlockAchievement: (id) => {
    const s = { ...get().state };
    const a = s.achievements.find(a => a.id === id);
    if (!a || a.unlockedAt) return;
    s.achievements = s.achievements.map(a => a.id === id ? { ...a, unlockedAt: Date.now() } : a);
    s.xp += a.xpReward;
    s.level = calculateLevel(s.xp);
    set({ state: s }); get()._save();
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

export const useSettingsStore = create<SettingsStore>((set) => ({
  fontScale: loadFromStorage<number>('nw_fontscale', 1),
  tickSoundEnabled: loadFromStorage<boolean>('nw_tick', true),
  voiceEnabled: loadFromStorage<boolean>('nw_voice', true),
  timezone: loadFromStorage<string>('nw_timezone', 'Asia/Ho_Chi_Minh'),
  notificationSettings: loadFromStorage<NotificationSettings>('nw_notifications', { enabled: true, beforeDeadline: 15, dailyReminder: false, dailyReminderTime: '08:00' }),
  currentPage: 'tasks',
  setFontScale: (scale) => {
    const safe = Math.max(0.75, Math.min(1.5, scale));
    saveToStorage('nw_fontscale', safe);
    document.documentElement.style.setProperty('--font-scale', String(safe));
    set({ fontScale: safe });
  },
  setTickSound: (e) => { saveToStorage('nw_tick', e); set({ tickSoundEnabled: e }); },
  setVoiceEnabled: (e) => { saveToStorage('nw_voice', e); set({ voiceEnabled: e }); },
  setCurrentPage: (page) => set({ currentPage: page }),
  setTimezone: (tz) => { saveToStorage('nw_timezone', tz); set({ timezone: tz }); },
  setNotificationSettings: (partial) => {
    set((prev) => {
      const updated = { ...prev.notificationSettings, ...partial };
      saveToStorage('nw_notifications', updated);
      return { notificationSettings: updated };
    });
  },
}));
