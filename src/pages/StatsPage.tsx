import { useMemo, useState } from 'react';
import { useTaskStore, useGamificationStore, useSettingsStore } from '@/stores';
import { getNowInTimezone } from '@/lib/notifications';
import { generateDailySummary } from '@/lib/dataUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, Award, BarChart3, Target, Flame, Share2, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EisenhowerQuadrant } from '@/types';

import { QUADRANT_LABELS } from '@/types';
const QUADRANT_NAMES: Record<EisenhowerQuadrant, string> = {
  do_first: 'Làm ngay', schedule: 'Lên lịch', delegate: 'Ủy thác', eliminate: 'Loại bỏ',
};
const PIE_COLORS = ['#F87171', '#00E5CC', '#FBBF24', '#5A5A6E'];
const HEATMAP_COLORS = ['var(--bg-surface)', 'rgba(0,229,204,0.2)', 'rgba(0,229,204,0.4)', 'rgba(0,229,204,0.6)', 'rgba(0,229,204,0.9)'];

function CalendarHeatmap() {
  const tasks = useTaskStore(s => s.tasks);
  const timezone = useSettingsStore(s => s.timezone);
  const now = getNowInTimezone(timezone);
  const [monthOffset, setMonthOffset] = useState(0);

  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = viewDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const dailyCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    tasks.forEach(t => {
      if (t.status === 'done' && t.completedAt) {
        const d = new Date(t.completedAt);
        if (d.getFullYear() === year && d.getMonth() === month) {
          counts[d.getDate()] = (counts[d.getDate()] || 0) + 1;
        }
      }
    });
    return counts;
  }, [tasks, year, month]);

  const maxCount = Math.max(...Object.values(dailyCounts), 1);
  const getColor = (count: number) => {
    if (count === 0) return HEATMAP_COLORS[0];
    const level = Math.min(4, Math.ceil((count / maxCount) * 4));
    return HEATMAP_COLORS[level];
  };

  const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonthOffset(p => p - 1)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
          <ChevronLeft size={14} />
        </button>
        <h2 className="text-sm font-semibold text-[var(--text-primary)] capitalize">{monthName}</h2>
        <button onClick={() => setMonthOffset(p => Math.min(p + 1, 0))} disabled={monthOffset >= 0}
          className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] disabled:opacity-30">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map(d => <div key={d} className="text-center text-[9px] text-[var(--text-muted)] pb-1">{d}</div>)}
        {cells.map((day, i) => (
          <div key={i} className="aspect-square flex items-center justify-center rounded-md text-[10px] relative"
            style={{ backgroundColor: day ? getColor(dailyCounts[day] || 0) : 'transparent' }}
            title={day ? `${day}/${month + 1}: ${dailyCounts[day] || 0} việc` : ''}>
            {day && <span className={`${dailyCounts[day] ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>{day}</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[9px] text-[var(--text-muted)]">Ít</span>
        {HEATMAP_COLORS.map((c, i) => <div key={i} className="size-3 rounded-sm" style={{ backgroundColor: c }} />)}
        <span className="text-[9px] text-[var(--text-muted)]">Nhiều</span>
      </div>
    </div>
  );
}

function DailySummary() {
  const tasks = useTaskStore(s => s.tasks);
  const gamState = useGamificationStore(s => s.state);
  const timezone = useSettingsStore(s => s.timezone);
  const [copied, setCopied] = useState(false);

  const now = getNowInTimezone(timezone);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86400000;

  const todayDone = tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= todayStart && t.completedAt < todayEnd);
  const todayPending = tasks.filter(t => (t.status === 'pending' || t.status === 'in_progress') && !t.parentId);
  const totalTime = todayDone.reduce((s, t) => s + (t.duration || 0), 0);
  const incomeToday = todayDone.filter(t => t.finance?.type === 'income').reduce((s, t) => s + (t.finance?.amount || 0), 0);
  const expenseToday = todayDone.filter(t => t.finance?.type === 'expense').reduce((s, t) => s + (t.finance?.amount || 0), 0);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} phút`;
  };

  const handleShare = async () => {
    const text = generateDailySummary(tasks, gamState, timezone);
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-accent)] mb-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,229,204,0.04)] to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Tổng kết hôm nay</h2>
          <button onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[var(--accent-dim)] text-[var(--accent-primary)] active:opacity-70 min-h-[32px]">
            {copied ? <Check size={12} /> : <Share2 size={12} />}
            {copied ? 'Đã sao chép' : 'Chia sẻ'}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--accent-primary)] font-mono tabular-nums">{todayDone.length}</p>
            <p className="text-[9px] text-[var(--text-muted)]">Xong</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--warning)] font-mono tabular-nums">{todayPending.length}</p>
            <p className="text-[9px] text-[var(--text-muted)]">Còn lại</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--text-primary)] font-mono tabular-nums">{formatTime(totalTime)}</p>
            <p className="text-[9px] text-[var(--text-muted)]">Thời gian</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--success)] font-mono tabular-nums">{gamState.streak}</p>
            <p className="text-[9px] text-[var(--text-muted)]">Streak</p>
          </div>
        </div>
        {(incomeToday > 0 || expenseToday > 0) && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--border-subtle)]">
            {incomeToday > 0 && <span className="text-[10px] text-[var(--success)] font-mono">+{incomeToday.toLocaleString('vi-VN')}đ</span>}
            {expenseToday > 0 && <span className="text-[10px] text-[var(--error)] font-mono">-{expenseToday.toLocaleString('vi-VN')}đ</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const tasks = useTaskStore(s => s.tasks);

  const stats = useMemo(() => {
    const pending = tasks.filter(t => (t.status === 'pending' || t.status === 'in_progress') && !t.parentId).length;
    const done = tasks.filter(t => t.status === 'done' && !t.parentId).length;
    const overdue = tasks.filter(t => t.status === 'overdue' && !t.parentId).length;
    const total = pending + done + overdue;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const totalTime = tasks.filter(t => t.status === 'done' && t.duration).reduce((sum, t) => sum + (t.duration || 0), 0);
    const avgTime = done > 0 ? Math.round(totalTime / done) : 0;
    const byQuadrant = [
      { name: QUADRANT_NAMES.do_first, value: tasks.filter(t => t.quadrant === 'do_first' && !t.parentId).length },
      { name: QUADRANT_NAMES.schedule, value: tasks.filter(t => t.quadrant === 'schedule' && !t.parentId).length },
      { name: QUADRANT_NAMES.delegate, value: tasks.filter(t => t.quadrant === 'delegate' && !t.parentId).length },
      { name: QUADRANT_NAMES.eliminate, value: tasks.filter(t => t.quadrant === 'eliminate' && !t.parentId).length },
    ].filter(d => d.value > 0);
    return { pending, done, overdue, total, completionRate, totalTime, avgTime, byQuadrant };
  }, [tasks]);

  const formatTime = (secs: number) => {
    if (secs === 0) return '0s';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const statCards = [
    { icon: Award, label: 'Hoàn thành', value: stats.done.toString(), color: 'var(--success)' },
    { icon: Clock, label: 'Tổng thời gian', value: formatTime(stats.totalTime), color: 'var(--accent-primary)' },
    { icon: TrendingUp, label: 'TB mỗi việc', value: formatTime(stats.avgTime), color: 'var(--warning)' },
    { icon: Target, label: 'Tỷ lệ', value: `${stats.completionRate}%`, color: 'var(--info)' },
  ];

  const recurringStats = useMemo(() => {
    const recurring = tasks.filter(t => t.recurring.type !== 'none' && t.status === 'done' && t.duration);
    const grouped: Record<string, { label: string; completions: { date: string; duration: number }[] }> = {};
    recurring.forEach(t => {
      const label = t.recurringLabel || t.title;
      if (!grouped[label]) grouped[label] = { label, completions: [] };
      grouped[label].completions.push({
        date: new Date(t.completedAt || t.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        duration: t.duration || 0,
      });
    });
    return Object.values(grouped);
  }, [tasks]);

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24 overflow-y-auto">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Thống kê</h1>

      <DailySummary />
      <CalendarHeatmap />

      <div className="grid grid-cols-2 gap-3 mb-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[var(--bg-elevated)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
            <Icon size={18} style={{ color }} className="mb-2" />
            <p className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">{value}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {stats.byQuadrant.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Flame size={16} className="text-[var(--warning)]" /> Ma trận Eisenhower
          </h2>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.byQuadrant} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0}>
                  {stats.byQuadrant.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {stats.byQuadrant.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[10px] text-[var(--text-muted)]">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
        <BarChart3 size={16} className="text-[var(--accent-primary)]" /> Biểu đồ việc lặp lại
      </h2>

      {recurringStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
          <BarChart3 size={24} className="text-[var(--text-muted)] mb-2" />
          <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
        </div>
      ) : (
        recurringStats.map(stat => (
          <div key={stat.label} className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{stat.label}</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stat.completions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => formatTime(v)} />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => [formatTime(value), 'Thời gian']} />
                  <Bar dataKey="duration" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
