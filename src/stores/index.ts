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
  timer: TimerState & { lastHeartbeat?: number };
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  setActiveTab: (tab: TabType) => void;
  addTask: (title: string, quadrant?: EisenhowerQuadrant, deadline?: number, recurring?: RecurringConfig, deadlineDate?: string, deadlineTime?: string, finance?: TaskFinance, templateId?: string, isGroup?: boolean, opts?: { showDeadline?: boolean; showRecurring?: boolean; showFinance?: boolean; showNotes?: boolean; notes?: string }) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  completeTask: (id: string) => void;
  restoreTask: (id: string) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  startTimer: (taskId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tickTimer: () => void;
  clearAllData: () => void;
  markOverdue: () => void;
}

const defaultTimer: TimerState & { lastHeartbeat?: number } = {
  taskId: null, isRunning: false, isPaused: false, elapsed: 0,
  startTime: null, pausedAt: null, totalPausedDuration: 0,
  lastHeartbeat: undefined
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  activeTab: 'pending',
  timer: { ...defaultTimer },
  _userId: undefined,

  initForUser: (userId) => {
    const key = getUserKey('nw_tasks', userId);
    const savedTasks = loadFromStorage<Task[]>(key, []);
    
    // Recovery Logic: If app was closed while running
    let savedTimer = loadFromStorage<TimerState & { lastHeartbeat?: number }>(getUserKey('nw_timer', userId), { ...defaultTimer });
    if (savedTimer.isRunning && savedTimer.lastHeartbeat) {
        // App crashed/closed. Calculate elapsed up to last heartbeat
        const recoveredElapsed = Math.max(0, Math.floor((savedTimer.lastHeartbeat - (savedTimer.startTime || 0)) / 1000) - (savedTimer.totalPausedDuration || 0));
        savedTimer = {
            ...savedTimer,
            isRunning: false,
            isPaused: true,
            elapsed: recoveredElapsed,
            pausedAt: Date.now()
        };
    }

    set({ tasks: savedTasks, _userId: userId, timer: savedTimer });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),

  addTask: (title, quadrant = 'do_first', deadline, recurring = { type: 'none' }, deadlineDate, deadlineTime, finance, templateId, isGroup, opts) => {
    const tasks = get().tasks;
    const id = generateId();
    const newTask: Task = {
      id, title, status: 'pending', quadrant,
      createdAt: Date.now(), deadline, deadlineDate, deadlineTime,
      order: tasks.filter(t => t.status === 'pending').length,
      recurring: recurring || { type: 'none' },
      recurringLabel: recurring && recurring.type !== 'none' ? title : undefined,
      finance, templateId, isGroup,
      showDeadline: opts?.showDeadline ?? !!deadline,
      showRecurring: opts?.showRecurring ?? (recurring?.type !== 'none'),
      showFinance: opts?.showFinance ?? !!finance,
      showNotes: opts?.showNotes ?? !!opts?.notes,
      notes: opts?.notes,
    };
    const updated = [...tasks, newTask];
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
    return id;
  },

  updateTask: (id, updates) => {
    const updated = get().tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
  },

  removeTask: (id) => {
    const updated = get().tasks.filter(t => t.id !== id);
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
  },

  completeTask: (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const tz = useSettingsStore.getState().timezone;
    const now = getNowInTimezone(tz).getTime();
    const isOnTime = !task.deadline || now <= task.deadline;
    const xpEarned = isOnTime ? 10 : 5;

    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, status: 'done' as const, completedAt: Date.now() } : t
    );
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    
    // Stop timer
    const timer = { ...defaultTimer };
    saveToStorage(getUserKey('nw_timer', get()._userId), timer);
    set({ tasks: updated, timer });
    
    useGamificationStore.getState().onTaskCompleted(task.quadrant, task.duration || 0, tz, xpEarned);
  },

  restoreTask: (id) => {
    const updated = get().tasks.map(t => t.id === id ? { ...t, status: 'pending' as const, completedAt: undefined } : t);
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
  },

  reorderTasks: (fromIndex, toIndex) => {
    const tasks = [...get().tasks];
    const pending = tasks.filter(t => t.status === 'pending').sort((a, b) => a.order - b.order);
    if (fromIndex < 0 || fromIndex >= pending.length || toIndex < 0 || toIndex >= pending.length) return;
    const [moved] = pending.splice(fromIndex, 1);
    pending.splice(toIndex, 0, moved);
    pending.forEach((t, i) => { t.order = i; });
    const rest = tasks.filter(t => t.status !== 'pending');
    const updated = [...pending, ...rest];
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    set({ tasks: updated });
  },

  startTimer: (taskId) => {
    const updated = get().tasks.map(t => t.id === taskId ? { ...t, status: 'in_progress' as const } : t);
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    const newTimer = { taskId, isRunning: true, isPaused: false, elapsed: 0, startTime: Date.now(), pausedAt: null, totalPausedDuration: 0, lastHeartbeat: Date.now() };
    saveToStorage(getUserKey('nw_timer', get()._userId), newTimer);
    set({ tasks: updated, timer: newTimer });
  },

  pauseTimer: () => {
    const t = get().timer;
    if (t.isRunning && !t.isPaused) {
        const newTimer = { ...t, isPaused: true, isRunning: false, pausedAt: Date.now() };
        saveToStorage(getUserKey('nw_timer', get()._userId), newTimer);
        set({ timer: newTimer });
    }
  },

  resumeTimer: () => {
    const t = get().timer;
    if (t.isPaused && t.pausedAt) {
      const pd = Math.floor((Date.now() - t.pausedAt) / 1000);
      const newTimer = { ...t, isPaused: false, isRunning: true, pausedAt: null, totalPausedDuration: t.totalPausedDuration + pd, lastHeartbeat: Date.now() };
      saveToStorage(getUserKey('nw_timer', get()._userId), newTimer);
      set({ timer: newTimer });
    }
  },

  stopTimer: () => {
    const t = get().timer;
    if (t.taskId) {
      const elapsed = t.elapsed;
      const updated = get().tasks.map(tk => {
        if (tk.id === t.taskId) {
          const newDuration = (tk.duration || 0) + elapsed;
          const newStatus = tk.status === 'in_progress' ? 'paused' as const : tk.status;
          return { ...tk, duration: newDuration, status: newStatus };
        }
        return tk;
      });
      saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
      const stoppedTimer = { ...defaultTimer };
      saveToStorage(getUserKey('nw_timer', get()._userId), stoppedTimer);
      set({ tasks: updated, timer: stoppedTimer });
    } else {
        set({ timer: { ...defaultTimer } });
    }
  },

  tickTimer: () => {
    const t = get().timer;
    if (t.isRunning && t.startTime && !t.isPaused) {
      const now = Date.now();
      const elapsed = Math.floor((now - t.startTime) / 1000) - t.totalPausedDuration;
      const updatedTimer = { ...t, elapsed, lastHeartbeat: now };
      
      // Heartbeat saving every tick to survive unexpected closure
      saveToStorage(getUserKey('nw_timer', get()._userId), updatedTimer);
      set({ timer: updatedTimer });
    }
  },

  clearAllData: () => {
    const u = get()._userId;
    ['nw_tasks', 'nw_chat', 'nw_gamification', 'nw_templates', 'nw_topics', 'nw_timer'].forEach(k => localStorage.removeItem(getUserKey(k, u)));
    localStorage.removeItem('nw_settings');
    set({ tasks: [], timer: { ...defaultTimer } });
  },

  markOverdue: () => {
    const tz = useSettingsStore.getState().timezone;
    const now = getNowInTimezone(tz).getTime();
    let changed = false;
    const updated = get().tasks.map(t => {
      if ((t.status === 'pending' || t.status === 'paused') && t.deadline && t.deadline < now) {
        changed = true;
        return { ...t, status: 'overdue' as const };
      }
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
  hasTemplateForTitle: (title: string) => boolean;
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

    if (template.type === 'group' && template.templateIds) {
      template.templateIds.forEach(id => {
        const subT = get().templates.find(st => st.id === id);
        if (subT) {
          taskStore.addTask(
            subT.title, quadrantOverride || 'do_first', undefined, recurringOverride || subT.recurring,
            deadlineDate, deadlineTime, financeOverride || subT.finance, subT.id, false,
            { notes: notesOverride || subT.notes, showDeadline: !!deadlineDate, showRecurring: (recurringOverride || subT.recurring)?.type !== 'none', showFinance: !!(financeOverride || subT.finance), showNotes: !!(notesOverride || subT.notes) }
          );
        }
      });
    } else {
      const quadrant = quadrantOverride || 'do_first';
      const recurring = recurringOverride || template.recurring;
      let deadline: number | undefined;
      if (deadlineDate) {
        const timeStr = deadlineTime || '23:59';
        deadline = new Date(`${deadlineDate}T${timeStr}:00`).getTime();
      }
      const finance = financeOverride || template.finance;
      taskStore.addTask(
        template.title, quadrant, deadline, recurring,
        deadlineDate, deadlineTime, finance, template.id, false,
        { notes: notesOverride || template.notes, showDeadline: !!deadline, showRecurring: recurring?.type !== 'none', showFinance: !!finance, showNotes: !!(notesOverride || template.notes) },
      );
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
          if (!existingTopics.find(et => et.name === t.name)) topicStore.addTopic(t.name);
        });
      }
      return newTemplates.length;
    } catch { return 0; }
  },
  hasTemplateForTitle: (title) => {
    return get().templates.some(t => t.title.toLowerCase() === title.toLowerCase());
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
  onTaskCompleted: (quadrant: EisenhowerQuadrant, duration: number, timezone: string, xpEarned: number) => void;
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
  onTaskCompleted: (quadrant, duration, timezone, xpEarned = 10) => {
    const s = { ...get().state };
    const now = getNowInTimezone(timezone);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    s.totalTasksCompleted += 1;
    s.totalTimerSeconds += duration;
    s.xp += xpEarned;
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
    s.rewards = [...s.rewards, { ...reward, id: `cr_${Date.now().toString(36)}`, claimed: false }];
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
    s.achievements = [...s.achievements, { ...ach, id: `ca_${Date.now().toString(36)}`, isCustom: true }];
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
  uiScale: number;
  tickSoundEnabled: boolean;
  voiceEnabled: boolean;
  voiceCountdownEnabled: boolean;
  voiceTickEnabled: boolean;
  voiceSpeed: number;
  currentPage: PageType;
  timezone: string;
  notificationSettings: NotificationSettings;
  setUiScale: (scale: number) => void;
  setTickSound: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setVoiceCountdown: (enabled: boolean) => void;
  setVoiceTick: (enabled: boolean) => void;
  setVoiceSpeed: (speed: number) => void;
  setCurrentPage: (page: PageType) => void;
  setTimezone: (tz: string) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  uiScale: loadFromStorage<number>('nw_uiscale', 1),
  tickSoundEnabled: loadFromStorage<boolean>('nw_tick', true),
  voiceEnabled: loadFromStorage<boolean>('nw_voice', true),
  voiceCountdownEnabled: loadFromStorage<boolean>('nw_voice_countdown', true),
  voiceTickEnabled: loadFromStorage<boolean>('nw_voice_tick', false),
  voiceSpeed: loadFromStorage<number>('nw_voice_speed', 1),
  timezone: loadFromStorage<string>('nw_timezone', 'Asia/Ho_Chi_Minh'),
  notificationSettings: loadFromStorage<NotificationSettings>('nw_notifications', { enabled: true, beforeDeadline: 15, dailyReminder: false, dailyReminderTime: '08:00' }),
  currentPage: 'tasks',
  setUiScale: (scale) => {
    const safe = Math.max(1, Math.min(2, scale));
    saveToStorage('nw_uiscale', safe);
    document.documentElement.style.setProperty('--ui-scale', String(safe));
    set({ uiScale: safe });
  },
  setTickSound: (e) => { saveToStorage('nw_tick', e); set({ tickSoundEnabled: e }); },
  setVoiceEnabled: (e) => { saveToStorage('nw_voice', e); set({ voiceEnabled: e }); },
  setVoiceCountdown: (e) => { saveToStorage('nw_voice_countdown', e); set({ voiceCountdownEnabled: e }); },
  setVoiceTick: (e) => { saveToStorage('nw_voice_tick', e); set({ voiceTickEnabled: e }); },
  setVoiceSpeed: (s) => { saveToStorage('nw_voice_speed', s); set({ voiceSpeed: s }); },
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
