import { useMemo, useState } from 'react';
import { useTaskStore, useGamificationStore, useSettingsStore } from '@/stores';
import { getNowInTimezone } from '@/lib/notifications';
import { BarChart3, TrendingUp, TrendingDown, Award, Target, Clock, Flame, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import type { EisenhowerQuadrant } from '@/types';
import { QUADRANT_LABELS } from '@/types';

export default function WeeklyReviewPage() {
  const tasks = useTaskStore(s => s.tasks);
  const gamState = useGamificationStore(s => s.state);
  const timezone = useSettingsStore(s => s.timezone);
  const [weekOffset, setWeekOffset] = useState(0);

  const now = getNowInTimezone(timezone);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${new Date(weekEnd.getTime() - 86400000).getDate()}/${new Date(weekEnd.getTime() - 86400000).getMonth() + 1}`;

  const weekTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= weekStart.getTime() && t.completedAt < weekEnd.getTime());
  }, [tasks, weekStart, weekEnd]);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= prevWeekStart.getTime() && t.completedAt < weekStart.getTime());
  }, [tasks, prevWeekStart, weekStart]);

  const totalTime = weekTasks.reduce((s, t) => s + (t.duration || 0), 0);
  const prevTotalTime = prevWeekTasks.reduce((s, t) => s + (t.duration || 0), 0);
  const totalIncome = weekTasks.filter(t => t.finance?.type === 'income').reduce((s, t) => s + (t.finance?.amount || 0), 0);
  const totalExpense = weekTasks.filter(t => t.finance?.type === 'expense').reduce((s, t) => s + (t.finance?.amount || 0), 0);

  const dailyData = useMemo(() => {
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    return days.map((label, i) => {
      const dayStart = new Date(weekStart);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayTasks = weekTasks.filter(t => t.completedAt! >= dayStart.getTime() && t.completedAt! < dayEnd.getTime());
      return { name: label, tasks: dayTasks.length, time: Math.round(dayTasks.reduce((s, t) => s + (t.duration || 0), 0) / 60) };
    });
  }, [weekTasks, weekStart]);

  const quadrantData = useMemo(() => {
    return (Object.keys(QUADRANT_LABELS) as EisenhowerQuadrant[]).map(q => ({
      name: QUADRANT_LABELS[q].label,
      value: weekTasks.filter(t => t.quadrant === q).length,
    })).filter(d => d.value > 0);
  }, [weekTasks]);

  const PIE_COLORS = ['#F87171', '#00E5CC', '#FBBF24', '#5A5A6E'];

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const weekAchievements = gamState.achievements.filter(a =>
    a.unlockedAt && a.unlockedAt >= weekStart.getTime() && a.unlockedAt < weekEnd.getTime()
  );

  const taskDiff = weekTasks.length - prevWeekTasks.length;
  const timeDiff = totalTime - prevTotalTime;

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Đánh giá tuần</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(p => p - 1)}
            className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] text-sm">←</button>
          <span className="text-xs text-[var(--text-secondary)] px-2 font-medium">{weekLabel}</span>
          <button onClick={() => setWeekOffset(p => Math.min(p + 1, 0))} disabled={weekOffset >= 0}
            className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] text-sm disabled:opacity-30">→</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
          <Award size={18} className="text-[var(--success)] mb-2" />
          <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{weekTasks.length}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Việc hoàn thành</p>
          {taskDiff !== 0 && (
            <p className={`text-[10px] font-medium mt-1 ${taskDiff > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {taskDiff > 0 ? '↑' : '↓'} {Math.abs(taskDiff)} so tuần trước
            </p>
          )}
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
          <Clock size={18} className="text-[var(--accent-primary)] mb-2" />
          <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{formatTime(totalTime)}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Thời gian tập trung</p>
          {timeDiff !== 0 && (
            <p className={`text-[10px] font-medium mt-1 ${timeDiff > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {timeDiff > 0 ? '↑' : '↓'} {formatTime(Math.abs(timeDiff))}
            </p>
          )}
        </div>
      </div>

      {/* Finance summary */}
      {(totalIncome > 0 || totalExpense > 0) && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] text-center">
            <TrendingUp size={14} className="text-[var(--success)] mx-auto mb-1" />
            <p className="text-sm font-bold text-[var(--success)] font-mono">{totalIncome.toLocaleString('vi-VN')}đ</p>
            <p className="text-[9px] text-[var(--text-muted)]">Thu</p>
          </div>
          <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] text-center">
            <TrendingDown size={14} className="text-[var(--error)] mx-auto mb-1" />
            <p className="text-sm font-bold text-[var(--error)] font-mono">{totalExpense.toLocaleString('vi-VN')}đ</p>
            <p className="text-[9px] text-[var(--text-muted)]">Chi</p>
          </div>
          <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] text-center">
            <p className={`text-sm font-bold font-mono ${(totalIncome - totalExpense) >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
              {(totalIncome - totalExpense).toLocaleString('vi-VN')}đ
            </p>
            <p className="text-[9px] text-[var(--text-muted)]">Ròng</p>
          </div>
        </div>
      )}

      {/* Daily chart */}
      {weekTasks.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-[var(--accent-primary)]" /> Biểu đồ tuần
          </h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="tasks" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} name="Việc" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Quadrant breakdown */}
      {quadrantData.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Target size={14} className="text-[var(--warning)]" /> Phân bổ Eisenhower
          </h2>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={quadrantData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0}>
                  {quadrantData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {quadrantData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[10px] text-[var(--text-muted)]">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements this week */}
      {weekAchievements.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-accent)] mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Flame size={14} className="text-[var(--warning)]" /> Thành tích tuần này
          </h2>
          <div className="space-y-2">
            {weekAchievements.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="text-lg">{a.icon}</span>
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)]">{a.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">+{a.xpReward} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {weekTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar size={28} className="text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu tuần này</p>
        </div>
      )}
    </div>
  );
}
