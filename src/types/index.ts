// Eisenhower Matrix Quadrants
export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue' | 'paused';
export type RecurringType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom';
export type TabType = 'pending' | 'done' | 'overdue';
export type PageType = 'tasks' | 'stats' | 'ai' | 'settings' | 'achievements' | 'templates' | 'finance' | 'weekly_review';

export interface RecurringConfig {
  type: RecurringType;
  customDays?: number[];
  label?: string;
}

// Media content blocks for rich task content
export type MediaBlockType = 'text' | 'image' | 'youtube';
export interface MediaBlock {
  id: string;
  type: MediaBlockType;
  content: string;
  caption?: string;
}

// Financial tracking
export interface TaskFinance {
  type: 'income' | 'expense';
  amount: number;
  note?: string;
}

// Pomodoro settings
export interface PomodoroSettings {
  enabled: boolean;
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  quadrant: EisenhowerQuadrant;
  createdAt: number;
  completedAt?: number;
  deadline?: number;
  deadlineDate?: string;
  deadlineTime?: string;
  duration?: number;
  totalPausedTime?: number;
  order: number;
  recurring: RecurringConfig;
  recurringLabel?: string;
  timerSessions?: { start: number; end: number; elapsed: number }[];
  notes?: string;
  // Subtasks / hierarchy
  parentId?: string;
  children?: string[];
  // Financial - per task instance (can override template)
  finance?: TaskFinance;
  // Template source
  templateId?: string;
  // Dependencies
  dependsOn?: string[]; // task IDs this task depends on
  // EXP from template
  xpReward?: number;
}

export interface TaskTemplate {
  id: string;
  title: string;
  quadrant: EisenhowerQuadrant;
  recurring: RecurringConfig;
  notes?: string;
  media?: MediaBlock[];
  subtasks?: { title: string; quadrant: EisenhowerQuadrant }[];
  finance?: TaskFinance;
  xpReward?: number; // EXP gained when completing task from this template
  createdAt: number;
  updatedAt?: number;
}

export interface TimerState {
  taskId: string | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsed: number;
  startTime: number | null;
  pausedAt: number | null;
  totalPausedDuration: number;
  // Pomodoro
  pomodoroSession: number; // current session number
  pomodoroPhase: 'work' | 'break' | 'longBreak' | 'none';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface TaskStats {
  label: string;
  completions: { date: string; duration: number }[];
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
}

// Gamification
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  unlockedAt?: number;
  xpReward: number;
  isCustom?: boolean;
}

export type AchievementCondition =
  | { type: 'tasks_completed'; count: number }
  | { type: 'streak_days'; count: number }
  | { type: 'timer_total'; seconds: number }
  | { type: 'early_bird'; count: number }
  | { type: 'quadrant_master'; quadrant: EisenhowerQuadrant; count: number }
  | { type: 'perfect_day'; count: number }
  | { type: 'speed_demon'; seconds: number }
  | { type: 'consistency'; days: number }
  | { type: 'custom'; description: string };

export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpCost: number;
  claimed: boolean;
  claimedAt?: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  totalTasksCompleted: number;
  totalTimerSeconds: number;
  earlyBirdCount: number;
  perfectDays: number;
  activeDays: number;
  dailyCompletionDates: string[];
  achievements: Achievement[];
  rewards: Reward[];
}

// Notification
export interface NotificationSettings {
  enabled: boolean;
  beforeDeadline: number;
  dailyReminder: boolean;
  dailyReminderTime: string;
}

// Quadrant display config
export const QUADRANT_LABELS: Record<EisenhowerQuadrant, { label: string; icon: string; color: string; desc: string }> = {
  do_first: { label: 'Làm ngay', icon: '🔴', color: 'var(--error)', desc: 'Gấp + Quan trọng' },
  schedule: { label: 'Lên lịch', icon: '🔵', color: 'var(--accent-primary)', desc: 'Quan trọng' },
  delegate: { label: 'Ủy thác', icon: '🟡', color: 'var(--warning)', desc: 'Gấp' },
  eliminate: { label: 'Loại bỏ', icon: '⚪', color: 'var(--text-muted)', desc: 'Không gấp, không QT' },
};
