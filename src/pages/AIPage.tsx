import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore, useTaskStore, useSettingsStore, useGamificationStore, useTemplateStore } from '@/stores';
import { streamAIChat, parseAIResponse, type AIAction } from '@/lib/aiService';
import { Send, Bot, User, Trash2, Sparkles, Zap, Mic, MicOff, X } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import type { EisenhowerQuadrant } from '@/types';

function ActionBadge({ result }: { result: string }) {
  const isError = result.startsWith('⚠️');
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${isError ? 'bg-[rgba(248,113,113,0.1)]' : 'bg-[rgba(0,229,204,0.06)]'}`}>
      <span className={isError ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}>{result}</span>
    </div>
  );
}

export function LucyChatFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <button onClick={() => setOpen(!open)}
        className="fixed z-[60] size-12 rounded-full bg-[var(--accent-primary)] text-[var(--bg-base)] flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-glow-pulse"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)', right: '16px' }}
        aria-label="Lucy AI">
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed inset-0 z-[55] flex flex-col bg-[var(--bg-base)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <LucyChat onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

function LucyChat({ onClose }: { onClose: () => void }) {
  const { messages, isLoading, addMessage, setLoading, clearChat } = useChatStore();
  const tasks = useTaskStore(s => s.tasks);
  const addTask = useTaskStore(s => s.addTask);
  const completeTask = useTaskStore(s => s.completeTask);
  const removeTask = useTaskStore(s => s.removeTask);
  const restoreTask = useTaskStore(s => s.restoreTask);
  const startTimer = useTaskStore(s => s.startTimer);
  const timer = useTaskStore(s => s.timer);
  const setCurrentPage = useSettingsStore(s => s.setCurrentPage);
  const templates = useTemplateStore(s => s.templates);
  const addTemplate = useTemplateStore(s => s.addTemplate);
  const createTaskFromTemplate = useTemplateStore(s => s.createTaskFromTemplate);
  const gamState = useGamificationStore(s => s.state);
  const { addCustomReward, removeReward, updateReward, addCustomAchievement, removeAchievement, updateAchievement, unlockAchievement } = useGamificationStore();

  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [actionResults, setActionResults] = useState<{ action: AIAction; result: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isStreamingRef = useRef(false);
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useSpeechRecognition();

  useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent]);

  const executeAction = useCallback((action: AIAction): string => {
    switch (action.type) {
      case 'ADD_TASK': {
        if (!action.title) return '⚠️ Thiếu tên việc';
        addTask(action.title, (action.quadrant as EisenhowerQuadrant) || 'do_first', undefined, action.recurring ? { type: 'daily' } : { type: 'none' });
        return `✅ Đã thêm "${action.title}"`;
      }
      case 'COMPLETE_TASK': {
        const s = (action.search || '').toLowerCase();
        const t = tasks.find(t => (t.status === 'pending' || t.status === 'in_progress') && t.title.toLowerCase().includes(s));
        if (t) { completeTask(t.id); return `✅ Hoàn thành "${t.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'DELETE_TASK': {
        const s = (action.search || '').toLowerCase();
        const t = tasks.find(t => t.title.toLowerCase().includes(s));
        if (t) { removeTask(t.id); return `✅ Đã xóa "${t.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'RESTORE_TASK': {
        const s = (action.search || '').toLowerCase();
        const t = tasks.find(t => (t.status === 'done' || t.status === 'overdue') && t.title.toLowerCase().includes(s));
        if (t) { restoreTask(t.id); return `✅ Khôi phục "${t.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'START_TIMER': {
        if (timer.isRunning || timer.isPaused) return '⚠️ Timer đang chạy';
        const s = (action.search || '').toLowerCase();
        const t = tasks.find(t => (t.status === 'pending' || t.status === 'in_progress') && t.title.toLowerCase().includes(s));
        if (t) { startTimer(t.id); return `⏱️ Đếm giờ "${t.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'NAVIGATE': {
        const p = action.page as any;
        if (['tasks', 'stats', 'settings', 'achievements', 'templates', 'finance'].includes(p)) {
          setCurrentPage(p); onClose();
          return `📍 Chuyển trang ${p}`;
        }
        return `⚠️ Trang không tồn tại`;
      }
      case 'ADD_TEMPLATE': {
        if (!action.title) return '⚠️ Thiếu tên mẫu';
        addTemplate({
          title: action.title, quadrant: (action.quadrant as EisenhowerQuadrant) || 'do_first',
          recurring: { type: 'none' }, notes: action.notes,
          subtasks: action.subtasks?.map(s => ({ title: s, quadrant: (action.quadrant as EisenhowerQuadrant) || 'do_first' })),
          xpReward: action.xpReward,
        });
        return `📋 Đã tạo mẫu "${action.title}"`;
      }
      case 'USE_TEMPLATE': {
        const s = (action.search || '').toLowerCase();
        const t = templates.find(t => t.title.toLowerCase().includes(s));
        if (t) { createTaskFromTemplate(t.id); return `📄 Tạo việc từ mẫu "${t.title}"`; }
        return `⚠️ Không tìm thấy mẫu "${action.search}"`;
      }
      case 'ADD_REWARD': {
        if (!action.title) return '⚠️ Thiếu tên phần thưởng';
        addCustomReward({ title: action.title, description: action.description || '', icon: action.icon || '🎁', xpCost: action.xpCost || 100 });
        return `🎁 Đã thêm "${action.title}"`;
      }
      case 'REMOVE_REWARD': {
        const s = (action.search || '').toLowerCase();
        const r = gamState.rewards.find(r => r.title.toLowerCase().includes(s));
        if (r) { removeReward(r.id); return `✅ Đã xóa "${r.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'UPDATE_REWARD': {
        const s = (action.search || '').toLowerCase();
        const r = gamState.rewards.find(r => r.title.toLowerCase().includes(s));
        if (r) { updateReward(r.id, { ...(action.title && { title: action.title }), ...(action.xpCost && { xpCost: action.xpCost }) }); return `✅ Cập nhật "${r.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'ADD_ACHIEVEMENT': {
        if (!action.title) return '⚠️ Thiếu tên thành tích';
        addCustomAchievement({ title: action.title, description: action.description || '', icon: action.icon || '🏆', xpReward: action.xpReward || 50, condition: { type: 'custom', description: action.description || '' }, isCustom: true });
        return `🏆 Đã thêm "${action.title}"`;
      }
      case 'REMOVE_ACHIEVEMENT': {
        const s = (action.search || '').toLowerCase();
        const a = gamState.achievements.find(a => a.title.toLowerCase().includes(s));
        if (a) { removeAchievement(a.id); return `✅ Đã xóa "${a.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'UPDATE_ACHIEVEMENT': {
        const s = (action.search || '').toLowerCase();
        const a = gamState.achievements.find(a => a.title.toLowerCase().includes(s));
        if (a) { updateAchievement(a.id, { ...(action.title && { title: action.title }), ...(action.xpReward && { xpReward: action.xpReward }) }); return `✅ Cập nhật "${a.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'UNLOCK_ACHIEVEMENT': {
        const s = (action.search || '').toLowerCase();
        const a = gamState.achievements.find(a => a.title.toLowerCase().includes(s) && !a.unlockedAt);
        if (a) { unlockAchievement(a.id); return `🔓 Mở khóa "${a.title}"`; }
        return `⚠️ Không tìm thấy thành tích "${action.search}"`;
      }
      default: return `⚠️ Lệnh không hỗ trợ`;
    }
  }, [tasks, timer, templates, gamState]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || isStreamingRef.current) return;
    addMessage('user', trimmed);
    setInput(''); resetTranscript();
    setLoading(true); setStreamingContent(''); setActionResults([]);
    isStreamingRef.current = true;

    const taskContext = {
      pending: tasks.filter(t => t.status === 'pending' && !t.parentId).map(t => ({ id: t.id, title: t.title, quadrant: t.quadrant, deadline: t.deadline, finance: t.finance, xpReward: t.xpReward })),
      inProgress: tasks.filter(t => t.status === 'in_progress').map(t => ({ id: t.id, title: t.title })),
      done: tasks.filter(t => t.status === 'done' && !t.parentId).slice(0, 10).map(t => ({ id: t.id, title: t.title, duration: t.duration })),
      overdue: tasks.filter(t => t.status === 'overdue').map(t => ({ id: t.id, title: t.title })),
      timerRunning: timer.isRunning, timerPaused: timer.isPaused,
      timerTask: tasks.find(t => t.id === timer.taskId)?.title, timerElapsed: timer.elapsed,
      templates: templates.map(t => ({ id: t.id, title: t.title, xpReward: t.xpReward })),
      gamification: { xp: gamState.xp, level: gamState.level, streak: gamState.streak, rewards: gamState.rewards.map(r => ({ id: r.id, title: r.title, xpCost: r.xpCost, claimed: r.claimed })), achievements: gamState.achievements.map(a => ({ id: a.id, title: a.title, unlockedAt: a.unlockedAt, isCustom: a.isCustom })) },
    };

    const chatHistory = [...messages.slice(-20).map(m => ({ role: m.role, content: m.content })), { role: 'user' as const, content: trimmed }];
    let fullContent = '';
    await streamAIChat(chatHistory, taskContext,
      (chunk) => { fullContent += chunk; setStreamingContent(fullContent); },
      () => {
        const { text, actions } = parseAIResponse(fullContent);
        const results = actions.map(a => ({ action: a, result: executeAction(a) }));
        setActionResults(results);
        addMessage('assistant', text + (results.length ? '\n\n' + results.map(r => r.result).join('\n') : ''));
        setStreamingContent(''); setLoading(false); isStreamingRef.current = false;
      },
      (error) => { addMessage('assistant', `Xin lỗi, có lỗi: ${error}`); setStreamingContent(''); setLoading(false); isStreamingRef.current = false; },
    );
  };

  const displayStreaming = streamingContent.replace(/:::ACTION\s*\n?[\s\S]*?\n?:::END/g, '').trim();
  const suggestions = [
    { text: 'Tạo mẫu "Routine sáng"', icon: '📋' },
    { text: 'Gợi ý phần thưởng', icon: '🎁' },
    { text: 'Hoàn thành tất cả', icon: '✅' },
    { text: 'Thống kê hôm nay', icon: '📊' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center">
            <Sparkles size={16} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--text-primary)]">Lucy</h1>
            <p className="text-[9px] text-[var(--text-muted)]">Trợ lý AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={clearChat} className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]"><Trash2 size={14} /></button>
          <button onClick={onClose} className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Bot size={28} className="text-[var(--accent-primary)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)] mb-1 font-medium">Xin chào! Mình là Lucy</p>
            <p className="text-xs text-[var(--text-muted)] mb-4 text-center px-6">Quản lý việc, mẫu, thành tích, phần thưởng</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {suggestions.map(s => (
                <button key={s.text} onClick={() => setInput(s.text)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] active:border-[var(--border-accent)] text-left">
                  <span>{s.icon}</span><span className="leading-tight">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-2 mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && <div className="size-6 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0 mt-0.5"><Bot size={12} className="text-[var(--accent-primary)]" /></div>}
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] rounded-br-md' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border-subtle)]'}`}>
                {msg.content}
              </div>
              {msg.role === 'user' && <div className="size-6 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 mt-0.5"><User size={12} className="text-[var(--text-secondary)]" /></div>}
            </div>
          ))
        )}
        {displayStreaming && (
          <div className="flex gap-2 mb-3">
            <div className="size-6 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0 mt-0.5"><Bot size={12} className="text-[var(--accent-primary)]" /></div>
            <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-md bg-[var(--bg-elevated)] border border-[var(--border-accent)] text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {displayStreaming}<span className="inline-block w-1.5 h-4 bg-[var(--accent-primary)] ml-0.5 animate-pulse rounded-sm" />
            </div>
          </div>
        )}
        {actionResults.length > 0 && (
          <div className="flex gap-2 mb-3"><div className="size-6 flex-shrink-0" /><div className="space-y-1 max-w-[80%]">{actionResults.map((r, i) => <ActionBadge key={i} result={r.result} />)}</div></div>
        )}
        {isLoading && !streamingContent && (
          <div className="flex gap-2 mb-3">
            <div className="size-6 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0"><Bot size={12} className="text-[var(--accent-primary)]" /></div>
            <div className="bg-[var(--bg-elevated)] rounded-2xl rounded-bl-md px-4 py-3 border border-[var(--border-subtle)]">
              <div className="flex gap-1.5"><div className="size-2 rounded-full bg-[var(--accent-primary)] animate-bounce" /><div className="size-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '150ms' }} /><div className="size-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '300ms' }} /></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          {isSupported && (
            <button onClick={() => isListening ? stopListening() : startListening()}
              className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isListening ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? 'Đang nghe...' : 'Nhắn Lucy...'}
            className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[42px]" />
          <button onClick={handleSend} disabled={!input.trim() || isLoading}
            className="size-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)] disabled:opacity-30 flex-shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
