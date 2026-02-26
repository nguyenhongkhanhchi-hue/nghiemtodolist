import { useMemo } from 'react';
import { useTaskStore } from '@/stores';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, Award, BarChart3, Target, Flame } from 'lucide-react';
import type { EisenhowerQuadrant } from '@/types';

const QUADRANT_COLORS: Record<EisenhowerQuadrant, string> = {
  do_first: 'var(--error)',
  schedule: 'var(--accent-primary)',
  delegate: 'var(--warning)',
  eliminate: 'var(--text-muted)',
};

const QUADRANT_NAMES: Record<EisenhowerQuadrant, string> = {
  do_first: 'Q1 Làm ngay',
  schedule: 'Q2 Lên lịch',
  delegate: 'Q3 Ủy thác',
  eliminate: 'Q4 Loại bỏ',
};

const PIE_COLORS = ['#F87171', '#00E5CC', '#FBBF24', '#5A5A6E'];

export default function StatsPage() {
  const tasks = useTaskStore((s) => s.tasks);

  const stats = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.status === 'overdue').length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    const totalTime = tasks.filter(t => t.status === 'done' && t.duration).reduce((sum, t) => sum + (t.duration || 0), 0);
    const avgTime = done > 0 ? Math.round(totalTime / done) : 0;

    const byQuadrant = [
      { name: QUADRANT_NAMES.do_first, value: tasks.filter(t => t.quadrant === 'do_first').length },
      { name: QUADRANT_NAMES.schedule, value: tasks.filter(t => t.quadrant === 'schedule').length },
      { name: QUADRANT_NAMES.delegate, value: tasks.filter(t => t.quadrant === 'delegate').length },
      { name: QUADRANT_NAMES.eliminate, value: tasks.filter(t => t.quadrant === 'eliminate').length },
    ].filter(d => d.value > 0);

    return { pending, done, overdue, total, completionRate, totalTime, avgTime, byQuadrant };
  }, [tasks]);

  const recurringStats = useMemo(() => {
    const recurring = tasks.filter(t => t.recurring.type !== 'none' && t.status === 'done' && t.duration);
    const grouped: Record<string, { label: string; completions: { date: string; duration: number }[] }> = {};

    recurring.forEach(t => {
      const label = t.recurringLabel || t.title;
      if (!grouped[label]) {
        grouped[label] = { label, completions: [] };
      }
      grouped[label].completions.push({
        date: new Date(t.completedAt || t.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        duration: t.duration || 0,
      });
    });

    return Object.values(grouped);
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

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24 overflow-y-auto">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Thống kê</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[var(--bg-elevated)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
            <Icon size={18} style={{ color }} className="mb-2" />
            <p className="text-xl font-bold text-[var(--text-primary)] font-mono tabular-nums">{value}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Eisenhower distribution */}
      {stats.byQuadrant.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
            <Flame size={16} className="text-[var(--warning)]" />
            Ma trận Eisenhower
          </h2>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.byQuadrant}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {stats.byQuadrant.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
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
        <BarChart3 size={16} className="text-[var(--accent-primary)]" />
        Biểu đồ việc lặp lại
      </h2>

      {recurringStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
          <div className="size-12 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mb-3">
            <BarChart3 size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-1">Chưa có dữ liệu</p>
          <p className="text-xs text-[var(--text-muted)]">Chọn "Lặp lại" khi thêm việc để thống kê</p>
        </div>
      ) : (
        recurringStats.map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{stat.label}</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stat.completions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v) => formatTime(v)} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatTime(value), 'Thời gian']}
                  />
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
