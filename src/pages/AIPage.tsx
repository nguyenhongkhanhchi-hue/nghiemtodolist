import { useState, useRef, useEffect } from 'react';
import { useChatStore, useTaskStore } from '@/stores';
import { Send, Bot, User, Trash2, Sparkles } from 'lucide-react';

const GEMINI_SYSTEM = `Bạn là TaskFlow AI - trợ lý thông minh quản lý công việc. Bạn có thể:
- Thêm việc mới (trả lời bắt đầu bằng [ADD_TASK:tên việc])
- Hoàn thành việc (trả lời bắt đầu bằng [COMPLETE_TASK:tên việc])
- Xóa việc (trả lời bắt đầu bằng [DELETE_TASK:tên việc])
- Gợi ý cách quản lý thời gian
- Trả lời mọi câu hỏi bằng tiếng Việt
Luôn thân thiện, ngắn gọn, hữu ích.`;

function processAICommands(content: string, tasks: any[], addTask: any, completeTask: any, removeTask: any): string {
  let displayContent = content;

  const addMatch = content.match(/\[ADD_TASK:(.+?)\]/g);
  if (addMatch) {
    addMatch.forEach(match => {
      const taskName = match.replace('[ADD_TASK:', '').replace(']', '');
      addTask(taskName);
      displayContent = displayContent.replace(match, `✅ Đã thêm: "${taskName}"`);
    });
  }

  const completeMatch = content.match(/\[COMPLETE_TASK:(.+?)\]/g);
  if (completeMatch) {
    completeMatch.forEach(match => {
      const taskName = match.replace('[COMPLETE_TASK:', '').replace(']', '').toLowerCase();
      const task = tasks.find(t => t.status === 'pending' && t.title.toLowerCase().includes(taskName));
      if (task) {
        completeTask(task.id);
        displayContent = displayContent.replace(match, `✅ Đã hoàn thành: "${task.title}"`);
      } else {
        displayContent = displayContent.replace(match, `⚠️ Không tìm thấy việc: "${taskName}"`);
      }
    });
  }

  const deleteMatch = content.match(/\[DELETE_TASK:(.+?)\]/g);
  if (deleteMatch) {
    deleteMatch.forEach(match => {
      const taskName = match.replace('[DELETE_TASK:', '').replace(']', '').toLowerCase();
      const task = tasks.find(t => t.title.toLowerCase().includes(taskName));
      if (task) {
        removeTask(task.id);
        displayContent = displayContent.replace(match, `🗑️ Đã xóa: "${task.title}"`);
      } else {
        displayContent = displayContent.replace(match, `⚠️ Không tìm thấy việc: "${taskName}"`);
      }
    });
  }

  return displayContent;
}

async function callGemini(messages: { role: string; content: string }[], apiKey: string, tasks: any[]): Promise<string> {
  const taskList = tasks.filter(t => t.status === 'pending').map(t => t.title).join(', ');
  const systemMsg = GEMINI_SYSTEM + `\nDanh sách việc hiện tại: ${taskList || 'Trống'}`;

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  contents.unshift({
    role: 'user',
    parts: [{ text: systemMsg }]
  });

  if (contents.length > 1 && contents[0].role === contents[1].role) {
    contents.splice(1, 0, { role: 'model', parts: [{ text: 'Tôi hiểu. Tôi sẵn sàng giúp bạn quản lý công việc!' }] });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  );

  if (!response.ok) {
    throw new Error('Lỗi kết nối Gemini API');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không hiểu yêu cầu.';
}

export default function AIPage() {
  const { messages, isLoading, addMessage, setLoading, clearChat } = useChatStore();
  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const completeTask = useTaskStore((s) => s.completeTask);
  const removeTask = useTaskStore((s) => s.removeTask);

  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('taskflow_gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    addMessage('user', trimmed);
    setInput('');
    setLoading(true);

    const allMessages = [...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: trimmed }];

    try {
      const response = await callGemini(allMessages, apiKey, tasks);
      const processed = processAICommands(response, tasks, addTask, completeTask, removeTask);
      addMessage('assistant', processed);
    } catch {
      addMessage('assistant', 'Xin lỗi, có lỗi xảy ra. Vui lòng kiểm tra API key và thử lại.');
    }

    setLoading(false);
  };

  const handleSaveKey = () => {
    localStorage.setItem('taskflow_gemini_key', apiKey);
    setShowKeyInput(false);
  };

  const suggestions = [
    'Thêm việc "Họp team lúc 10h"',
    'Danh sách việc hôm nay',
    'Gợi ý cách quản lý thời gian',
    'Hoàn thành tất cả việc',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center">
            <Sparkles size={18} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">Trợ lý AI</h1>
            <p className="text-[10px] text-[var(--text-muted)]">Gemini • Quản lý công việc</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)] active:opacity-70"
          >
            API Key
          </button>
          <button
            onClick={clearChat}
            className="size-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] active:opacity-70"
            aria-label="Xóa chat"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* API Key input */}
      {showKeyInput && (
        <div className="px-4 mb-3 animate-slide-up">
          <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-accent)]">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Nhập Gemini API Key để sử dụng</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px]"
              />
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] active:opacity-80 min-h-[44px]"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="size-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
              <Bot size={28} className="text-[var(--accent-primary)]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4 text-center">
              Xin chào! Tôi có thể giúp bạn thêm, hoàn thành, xóa việc và gợi ý cách quản lý thời gian.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] active:opacity-70"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="size-7 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-[var(--accent-primary)]" />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] rounded-br-md'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border-subtle)]'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={14} className="text-[var(--text-secondary)]" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-2 mb-3">
            <div className="size-7 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-[var(--accent-primary)]" />
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-2xl rounded-bl-md px-4 py-3 border border-[var(--border-subtle)]">
              <div className="flex gap-1">
                <div className="size-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="size-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="size-2 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-20 pt-2 glass-strong border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Nhắn tin cho trợ lý AI..."
            className="flex-1 bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="size-11 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)] disabled:opacity-30 active:opacity-80"
            aria-label="Gửi"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
