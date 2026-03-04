export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate';
export type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'done' | 'overdue';
export type RecurringType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom';
export type TabType = 'pending' | 'in_progress' | 'paused' | 'done' | 'overdue';
export type PageType = 'tasks' | 'stats' | 'settings' | 'achievements' | 'templates' | 'finance';

export interface RecurringConfig {
  type: RecurringType;
  customDays?: number[];
  label?: string;
}

export type MediaBlockType = 'text' | 'image' | 'youtube';
export interface MediaBlock {
  id: string;
  type: MediaBlockType;
  content: string;
  caption?: string;
}

export interface TaskFinance {
  type: 'income' | 'expense';
  amount: number;
  note?: string;
}

export interface TopicParam {
  id: string;
  name: string;
  value: string;
}

export interface Topic {
  id: string;
  name: string;
  params: TopicParam[];
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
  duration?: number; // cumulative total seconds
  order: number;
  recurring: RecurringConfig;
  recurringLabel?: string;
  notes?: string;
  finance?: TaskFinance;
  templateId?: string;
  isGroup?: boolean;
  showDeadline?: boolean;
  showRecurring?: boolean;
  showFinance?: boolean;
  showNotes?: boolean;
}

export interface TaskTemplate {
  id: string;
  title: string;
  type: 'single' | 'group';
  createdAt: number;
  updatedAt?: number;

  // Fields for 'single' type
  notes?: string;
  media?: MediaBlock[];
  richContent?: string;
  subtasks?: { title: string }[];
  finance?: TaskFinance;
  xpReward?: number;
  topicId?: string;
  topicParams?: TopicParam[];
  recurring?: RecurringConfig;

  // Fields for 'group' type
  templateIds?: string[];
}

export interface TimerState {
  taskId: string | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsed: number;
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

export interface UserProfile {
  id: string;
  email: string;
  username: string;
}

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

export interface NotificationSettings {
  enabled: boolean;
  beforeDeadline: number;
  dailyReminder: boolean;
  dailyReminderTime: string;
}

export const QUADRANT_LABELS: Record<EisenhowerQuadrant, { label: string; icon: string; color: string; desc: string }> = {
  do_first: { label: 'Làm ngay', icon: '🔴', color: '#F87171', desc: 'Gấp + Quan trọng' },
  schedule: { label: 'Lên lịch', icon: '🔵', color: '#60A5FA', desc: 'Quan trọng' },
  delegate: { label: 'Ủy thác', icon: '🟡', color: '#FBBF24', desc: 'Gấp' },
  eliminate: { label: 'Loại bỏ', icon: '⚪', color: '#5A5A6E', desc: 'Không gấp, không QT' },
};
