import { supabase } from '@/lib/supabase';
import type { Task } from '@/types';

interface TaskContext {
  pending: Partial<Task>[];
  done: Partial<Task>[];
  overdue: Partial<Task>[];
  inProgress: Partial<Task>[];
  timerRunning: boolean;
  timerPaused: boolean;
  timerTask?: string;
  timerElapsed?: number;
  templates?: { id: string; title: string; xpReward?: number }[];
  gamification?: {
    xp: number;
    level: number;
    streak: number;
    rewards: { id: string; title: string; xpCost: number; claimed: boolean }[];
    achievements: { id: string; title: string; unlockedAt?: number; isCustom?: boolean }[];
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIAction {
  type: string;
  title?: string;
  search?: string;
  page?: string;
  recurring?: boolean;
  quadrant?: string;
  subtasks?: string[];
  notes?: string;
  description?: string;
  icon?: string;
  xpCost?: number;
  xpReward?: number;
}

export function parseAIResponse(content: string): { text: string; actions: AIAction[] } {
  const actions: AIAction[] = [];
  let text = content;
  const actionRegex = /:::ACTION\s*\n?([\s\S]*?)\n?:::END/g;
  let match;
  while ((match = actionRegex.exec(content)) !== null) {
    try {
      actions.push(JSON.parse(match[1].trim()));
    } catch (e) {
      console.error('Failed to parse AI action:', match[1], e);
    }
  }
  text = text.replace(/:::ACTION\s*\n?[\s\S]*?\n?:::END/g, '').trim();
  return { text, actions };
}

export async function streamAIChat(
  messages: ChatMessage[],
  taskContext: TaskContext,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, taskContext }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI stream error:', response.status, errText);
      onError(`Lỗi kết nối AI (${response.status})`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError('Không thể đọc phản hồi từ AI'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch { /* skip */ }
      }
    }
    onDone();
  } catch (err) {
    console.error('AI streaming error:', err);
    onError('Mất kết nối với AI. Vui lòng thử lại.');
  }
}
