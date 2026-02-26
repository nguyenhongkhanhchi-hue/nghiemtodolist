import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore, useTaskStore, useSettingsStore, useGamificationStore, useTemplateStore } from '@/stores';
import { streamAIChat, parseAIResponse, type AIAction } from '@/lib/aiService';
import { Send, Bot, User, Trash2, Sparkles, Zap, Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import type { EisenhowerQuadrant } from '@/types';

function ActionBadge({ action, result }: { action: AIAction; result: string }) {
  const icons: Record<string, string> = {
    ADD_TASK: '➕', COMPLETE_TASK: '✅', DELETE_TASK: '🗑️', RESTORE_TASK: '↩️',
    START_TIMER: '⏱️', NAVIGATE: '📍', ADD_TEMPLATE: '📋', USE_TEMPLATE: '📄',
    ADD_REWARD: '🎁', REMOVE_REWARD: '🗑️', UPDATE_REWARD: '✏️',
    ADD_ACHIEVEMENT: '🏆', REMOVE_ACHIEVEMENT: '🗑️', UPDATE_ACHIEVEMENT: '✏️', UNLOCK_ACHIEVEMENT: '🔓',
  };
  const isError = result.startsWith('⚠️');
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isError ? 'bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.15)]' : 'bg-[rgba(0,229,204,0.06)] border border-[rgba(0,229,204,0.12)]'}`}>
      <span className="text-sm">{icons[action.type] || '⚡'}</span>
      <span className={isError ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}>{result}</span>
    </div>
  );
}

export default function AIPage() {
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
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent, actionResults]);

  const executeAction = useCallback((action: AIAction): string => {
    switch (action.type) {
      case 'ADD_TASK': {
        if (!action.title) return '⚠️ Thiếu tên việc';
        const q = (action.quadrant as EisenhowerQuadrant) || 'do_first';
        addTask(action.title, q, undefined, action.recurring ? { type: 'daily' } : { type: 'none' });
        return `Đã thêm "${action.title}" [${q}]`;
      }
      case 'COMPLETE_TASK': {
        const s = (action.search || '').toLowerCase();
        const t = tasks.find(t => (t.status === 'pending' || t.status === 'in_progress') && t.title.toLowerCase().includes(s));
        if (t) { completeTask(t.id); return `Đã hoàn thành "${t.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'DELETE_TASK': {
        const s = (action.search || '').toLowerCase();
        const t = tasks.find(t => t.title.toLowerCase().includes(s));
        if (t) { removeTask(t.id); return `Đã xóa "${t.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'RESTORE_TASK': {
        const s = (action.search || '').toLowerCase();
        const t = tasks.find(t => (t.status === 'done' || t.status === 'overdue') && t.title.toLowerCase().includes(s));
        if (t) { restoreTask(t.id); return `Đã khôi phục "${t.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'START_TIMER': {
        if (timer.isRunning || timer.isPaused) return '⚠️ Timer đang chạy';
        const s = (action.search || '').toLowerCase();
        const t = tasks.find(t => (t.status === 'pending' || t.status === 'in_progress') && t.title.toLowerCase().includes(s));
        if (t) { startTimer(t.id); return `Đang đếm giờ "${t.title}"`; }
        return `⚠️ Không tìm thấy "${action.search}"`;
      }
      case 'NAVIGATE': {
        const p = action.page as any;
        if (['tasks', 'stats', 'settings', 'achievements', 'templates', 'finance', 'weekly_review'].includes(p)) {
          setCurrentPage(p);
          return `Đã chuyển trang ${p}`;
        }
        return `⚠️ Trang "${action.page}" không tồn tại`;
      }
      case 'ADD_TEMPLATE': {
        if (!action.title) return '⚠️ Thiếu tên mẫu';
        addTemplate({
          title: action.title,
          quadrant: (action.quadrant as EisenhowerQuadrant) || 'do_first',
          recurring: { type: 'none' },
          notes: action.notes,
          subtasks: action.subtasks?.map(s => ({ title: s, quadrant: (action.quadrant as EisenhowerQuadrant) || 'do_first' })),
          xpReward: action.xpReward,
        });
        return `Đã tạo mẫu "${action.title}"${action.subtasks ? ` với ${action.subtasks.length} việc con` : ''}${action.xpReward ? ` (+${action.xpReward} XP)` : ''}`;
      }
      case 'USE_TEMPLATE': {
        const s = (action.search || '').toLowerCase();
        const t = templates.find(t => t.title.toLowerCase().includes(s));
        if (t) { createTaskFromTemplate(t.id); return `Đã tạo việc từ mẫu "${t.title}"`; }
        return `⚠️ Không tìm thấy mẫu "${action.search}"`;
      }
      case 'ADD_REWARD': {
        if (!action.title) return '⚠️ Thiếu tên phần thưởng';
        addCustomReward({
          title: action.title,
          description: action.description || 'Phần thưởng tùy chọn',
          icon: action.icon || '🎁',
          xpCost: action.xpCost || 100,
        });
        return `Đã thêm phần thưởng "${action.title}" (${action.xpCost || 100} XP)`;
      }
      case 'REMOVE_REWARD': {
        const s = (action.search || '').toLowerCase();
        const r = gamState.rewards.find(r => r.title.toLowerCase().includes(s));
        if (r) { removeReward(r.id); return `Đã xóa phần thưởng "${r.title}"`; }
        return `⚠️ Không tìm thấy phần thưởng "${action.search}"`;
      }
      case 'UPDATE_REWARD': {
        const s = (action.search || '').toLowerCase();
        const r = gamState.rewards.find(r => r.title.toLowerCase().includes(s));
        if (r) {
          const updates: any = {};
          if (action.title) updates.title = action.title;
          if (action.xpCost) updates.xpCost = action.xpCost;
          if (action.description) updates.description = action.description;
          if (action.icon) updates.icon = action.icon;
          updateReward(r.id, updates);
          return `Đã cập nhật phần thưởng "${r.title}"`;
        }
        return `⚠️ Không tìm thấy phần thưởng "${action.search}"`;
      }
      case 'ADD_ACHIEVEMENT': {
        if (!action.title) return '⚠️ Thiếu tên thành tích';
        addCustomAchievement({
          title: action.title,
          description: action.description || 'Thành tích tùy chỉnh',
          icon: action.icon || '🏆',
          xpReward: action.xpReward || 50,
          condition: { type: 'custom', description: action.description || '' },
          isCustom: true,
        });
        return `Đã thêm thành tích "${action.title}" (+${action.xpReward || 50} XP)`;
      }
      case 'REMOVE_ACHIEVEMENT': {
        const s = (action.search || '').toLowerCase();
        const a = gamState.achievements.find(a => a.title.toLowerCase().includes(s));
        if (a) { removeAchievement(a.id); return `Đã xóa thành tích "${a.title}"`; }
        return `⚠️ Không tìm thấy thành tích "${action.search}"`;
      }
      case 'UPDATE_ACHIEVEMENT': {
        const s = (action.search || '').toLowerCase();
        const a = gamState.achievements.find(a => a.title.toLowerCase().includes(s));
        if (a) {
          const updates: any = {};
          if (action.title) updates.title = action.title;
          if (action.xpReward) updates.xpReward = action.xpReward;
          if (action.description) updates.description = action.description;
          if (action.icon) updates.icon = action.icon;
          updateAchievement(a.id, updates);
          return `Đã cập nhật thành tích "${a.title}"`;
        }
        return `⚠️ Không tìm thấy thành tích "${action.search}"`;
      }
      case 'UNLOCK_ACHIEVEMENT': {
        const s = (action.search || '').toLowerCase();
        const a = gamState.achievements.find(a => a.title.toLowerCase().includes(s) && !a.unlockedAt);
        if (a) { unlockAchievement(a.id); return `Đã mở khóa thành tích "${a.title}" (+${a.xpReward} XP)`; }
        return `⚠️ Không tìm thấy thành tích chưa đạt "${action.search}"`;
      }
      default:
        return '⚠️ Lệnh không được hỗ trợ';
    }
  }, [tasks, timer, templates, gamState, addTask, completeTask, removeTask, restoreTask, startTimer, setCurrentPage, addTemplate, createTaskFromTemplate, addCustomReward, removeReward, updateReward, addCustomAchievement, removeAchievement, updateAchievement, unlockAchievement]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || isStreamingRef.current) return;

    addMessage('user', trimmed);
    setInput('');
    resetTranscript();
    setLoading(true);
    setStreamingContent('');
    setActionResults([]);
    isStreamingRef.current = true;

    const taskContext = {
      pending: tasks.filter(t => t.status === 'pending' && !t.parentId).map(t => ({ id: t.id, title: t.title, quadrant: t.quadrant, deadline: t.deadline, recurring: t.recurring, finance: t.finance, xpReward: t.xpReward })),
      inProgress: tasks.filter(t => t.status === 'in_progress').map(t => ({ id: t.id, title: t.title })),
      done: tasks.filter(t => t.status === 'done' && !t.parentId).slice(0, 10).map(t => ({ id: t.id, title: t.title, duration: t.duration })),
      overdue: tasks.filter(t => t.status === 'overdue').map(t => ({ id: t.id, title: t.title })),
      timerRunning: timer.isRunning,
      timerPaused: timer.isPaused,
      timerTask: tasks.find(t => t.id === timer.taskId)?.title,
      timerElapsed: timer.elapsed,
      templates: templates.map(t => ({ id: t.id, title: t.title, xpReward: t.xpReward })),
      gamification: {
        xp: gamState.xp,
        level: gamState.level,
        streak: gamState.streak,
        rewards: gamState.rewards.map(r => ({ id: r.id, title: r.title, xpCost: r.xpCost, claimed: r.claimed })),
        achievements: gamState.achievements.map(a => ({ id: a.id, title: a.title, unlockedAt: a.unlockedAt, isCustom: a.isCustom })),
      },
    };

    const chatHistory = [...messages.slice(-20).map(m => ({ role: m.role, content: m.content })), { role: 'user' as const, content: trimmed }];

    let fullContent = '';
    await streamAIChat(
      chatHistory,
      taskContext,
      (chunk) => { fullContent += chunk; setStreamingContent(fullContent); },
      () => {
        const { text, actions } = parseAIResponse(fullContent);
        const results = actions.map(action => ({ action, result: executeAction(action) }));
        setActionResults(results);
        const actionSummary = results.map(r => r.result).join('\n');
        addMessage('assistant', text + (actionSummary ? '\n\n' + actionSummary : ''));
        setStreamingContent('');
        setLoading(false);
        isStreamingRef.current = false;
      },
      (error) => {
        addMessage('assistant', `Xin lỗi, có lỗi: ${error}`);
        setStreamingContent('');
        setLoading(false);
        isStreamingRef.current = false;
      },
    );
  };

  const toggleVoice = () => { if (isListening) stopListening(); else startListening(); };

  const suggestions = [
    { text: 'Tạo mẫu "Routine buổi sáng"', icon: '📋' },
    { text: 'Tạo 5 thành tích cho tuần này', icon: '🏆' },
    { text: 'Gợi ý phần thưởng phù hợp', icon: '🎁' },
    { text: 'Hoàn thành tất cả việc Loại bỏ', icon: '✅' },
  ];

  const pendingCount = tasks.filter(t => (t.status === 'pending' || t.status === 'in_progress') && !t.parentId).length;
  const doneCount = tasks.filter(t => t.status === 'done' && !t.parentId).length;
  const displayStreaming = streamingContent.replace(/:::ACTION\s*\n?[\s\S]*?\n?:::END/g, '').trim();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center relative">
            <Sparkles size={18} className="text-[var(--accent-primary)]" />
            <div className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[var(--success)] border-2 border-[var(--bg-base)]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">Lucy</h1>
            <p className="text-[10px] text-[var(--text-muted)]">Trợ lý AI • NghiemWork</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-elevated)] text-[10px]">
            <span className="text-[var(--accent-primary)] font-bold tabular-nums">{pendingCount}</span>
            <span className="text-[var(--text-muted)]">việc</span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="text-[var(--success)] font-bold tabular-nums">{doneCount}</span>
            <span className="text-[var(--text-muted)]">xong</span>
          </div>
          <button onClick={clearChat} className="size-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] active:opacity-70">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="px-4 mb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(0,229,204,0.05)] border border-[rgba(0,229,204,0.1)]">
            <Zap size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
            <p className="text-[11px] text-[var(--text-secondary)]">
              Thao tác việc, mẫu, thành tích, phần thưởng — chỉ cần nói
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 && !streamingContent ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="size-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
              <Bot size={28} className="text-[var(--accent-primary)]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-1 text-center font-medium">Xin chào! Mình là Lucy</p>
            <p className="text-xs text-[var(--text-muted)] mb-5 text-center px-8">Mình giúp bạn quản lý việc, mẫu, thành tích, phần thưởng, thu chi</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {suggestions.map(s => (
                <button key={s.text} onClick={() => setInput(s.text)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] active:border-[var(--border-accent)] transition-colors text-left">
                  <span className="text-base">{s.icon}</span>
                  <span className="leading-tight">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-2 mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="size-7 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={14} className="text-[var(--accent-primary)]" />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] rounded-br-md'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border-subtle)]'
              }`}>{msg.content}</div>
              {msg.role === 'user' && (
                <div className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={14} className="text-[var(--text-secondary)]" />
                </div>
              )}
            </div>
          ))
        )}

        {displayStreaming && (
          <div className="flex gap-2 mb-3 justify-start">
            <div className="size-7 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={14} className="text-[var(--accent-primary)]" />
            </div>
            <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-[var(--bg-elevated)] border border-[var(--border-accent)] text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {displayStreaming}
              <span className="inline-block w-1.5 h-4 bg-[var(--accent-primary)] ml-0.5 animate-pulse rounded-sm" />
            </div>
          </div>
        )}

        {actionResults.length > 0 && (
          <div className="flex gap-2 mb-3 justify-start">
            <div className="size-7 flex-shrink-0" />
            <div className="space-y-1.5 max-w-[80%]">
              {actionResults.map((r, i) => <ActionBadge key={i} action={r.action} result={r.result} />)}
            </div>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="flex gap-2 mb-3">
            <div className="size-7 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-[var(--accent-primary)]" />
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-2xl rounded-bl-md px-4 py-3 border border-[var(--border-subtle)]">
              <div className="flex gap-1.5">
                <div className="size-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="size-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="size-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pb-20 pt-2 glass-strong border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          {isSupported && (
            <button onClick={toggleVoice}
              className={`size-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isListening ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? 'Đang nghe...' : 'Nhắn tin hoặc ra lệnh...'}
            className="flex-1 bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px] transition-colors" />
          <button onClick={handleSend} disabled={!input.trim() || isLoading}
            className="size-11 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)] disabled:opacity-30 active:opacity-80 flex-shrink-0">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
