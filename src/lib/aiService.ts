import { supabase } from '@/lib/supabase';

export interface AIAction {
  type: string;
  title?: string;
  search?: string;
  quadrant?: string;
  notes?: string;
  recurring?: boolean;
  subtasks?: string[];
  page?: string;
  icon?: string;
  description?: string;
  xpCost?: number;
  xpReward?: number;
}

export function parseAIResponse(text: string): { text: string; actions: AIAction[] } {
  const actions: AIAction[] = [];
  const cleaned = text.replace(/:::ACTION\s*\n?([\s\S]*?)\n?:::END/g, (_, json) => {
    try { actions.push(JSON.parse(json.trim())); } catch {}
    return '';
  });
  return { text: cleaned.trim(), actions };
}

export async function streamAIChat(
  messages: { role: string; content: string }[],
  taskContext: Record<string, unknown>,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ messages, taskContext }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      onError(errText || `HTTP ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError('No stream'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') { onDone(); return; }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
          } catch {}
        }
      }
    }
    onDone();
  } catch (e: any) {
    onError(e.message || 'Lỗi kết nối');
  }
}
