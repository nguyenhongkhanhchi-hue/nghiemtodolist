export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'done' | 'overdue';
  createdAt: number;
  completedAt?: number;
  dueTime?: string;
  duration?: number; // seconds spent on timer
  order: number;
  isRecurring?: boolean;
  recurringLabel?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  url: string;
  addedAt: number;
}

export interface TimerState {
  taskId: string | null;
  isRunning: boolean;
  elapsed: number; // seconds
  startTime: number | null;
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

export type TabType = 'pending' | 'done' | 'overdue';
export type PageType = 'tasks' | 'stats' | 'music' | 'ai' | 'settings';
