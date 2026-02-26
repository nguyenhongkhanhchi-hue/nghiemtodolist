export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue' | 'paused';
export type RecurringType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom';
export type TabType = 'pending' | 'done' | 'overdue';
export type PageType = 'tasks' | 'stats' | 'ai' | 'settings';

export interface RecurringConfig {
  type: RecurringType;
  customDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  label?: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: number;
  completedAt?: number;
  deadline?: number; // timestamp
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
