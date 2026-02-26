// Eisenhower Matrix Quadrants
export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue' | 'paused';
export type RecurringType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom';
export type TabType = 'pending' | 'done' | 'overdue';
export type PageType = 'tasks' | 'stats' | 'ai' | 'settings' | 'achievements';

export interface RecurringConfig {
  type: RecurringType;
  customDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  label?: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  quadrant: EisenhowerQuadrant;
  createdAt: number;
  completedAt?: number;
  deadline?: number; // timestamp
  deadlineDate?: string; // YYYY-MM-DD
  deadlineTime?: string; // HH:mm
  duration?: number; // seconds spent on timer
  totalPausedTime?: number;
  order: number;
  recurring: RecurringConfig;
  recurringLabel?: string;
  timerSessions?: { start: number; end: number; elapsed: number }[];
  notes?: string;
}

export interface TimerState {
  taskId: string | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsed: number; // seconds
  startTime: number | null;
  pausedAt: number | null;
  totalPausedDuration: number;
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
}

export type AchievementCondition =
  | { type: 'tasks_completed'; count: number }
  | { type: 'streak_days'; count: number }
  | { type: 'timer_total'; seconds: number }
  | { type: 'early_bird'; count: number } // completed before 9am
  | { type: 'quadrant_master'; quadrant: EisenhowerQuadrant; count: number }
  | { type: 'perfect_day'; count: number } // all tasks done in a day
  | { type: 'speed_demon'; seconds: number } // task completed under X seconds
  | { type: 'consistency'; days: number }; // used app X days

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
  lastActiveDate: string; // YYYY-MM-DD
  totalTasksCompleted: number;
  totalTimerSeconds: number;
  earlyBirdCount: number;
  perfectDays: number;
  activeDays: number;
  dailyCompletionDates: string[]; // dates where all tasks completed
  achievements: Achievement[];
  rewards: Reward[];
}

// Notification
export interface NotificationSettings {
  enabled: boolean;
  beforeDeadline: number; // minutes before deadline
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:mm
}
