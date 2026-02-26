import { useMemo } from 'react';
import { useTaskStore } from '@/stores';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Clock, Award, BarChart3 } from 'lucide-react';

export default function StatsPage() {
  const tasks = useTaskStore((s) => s.tasks);

  const recurringStats = useMemo(() => {
    const recurring = tasks.filter(t => t.isRecurring && t.status === 'done' && t.duration);
    const grouped: Record<string, { label: string; completions: { date: string; duration: number }[] }> = {};

    recurring.forEach(t => {
      const label = t.recurringLabel || t.title;
      if (!grouped[label]) {
        grouped[label] = { label, completions: [] };
      }
      grouped[label].completions.push({
        date: new Date(t.completedAt || t.createdAt).toLocaleDateString('vi-VN'),
        duration: t.duration || 0,
      });
    });

    return Object.values(grouped);
  }, [tasks]);

  const totalCompleted = tasks.filter(t => t.status === 'done').length;
  const totalTime = tasks.filter(t => t.status === 'done' && t.duration).reduce((sum, t) => sum + (t.duration || 0), 0);
  const avgTime = totalCompleted > 0 ? Math.round(totalTime / totalCompleted) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const statCards = [
    { icon: Award, label: 'Đã hoàn thành', value: totalCompleted.toString(), color: 'var(--success)' },
    { icon: Clock, label: 'Tổng thời gian', value: formatTime(totalTime), color: 'var(--accent-primary)' },
    { icon: TrendingUp, label: 'TB mỗi việc', value: formatTime(avgTime), color: 'var(--warning)' },
  ];

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24 overflow-y-auto">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Thống kê</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
            <Icon size={18} style={{ color }} className="mb-2" />
            <p className="text-lg font-bold text-[var(--text-primary)] font-mono tabular-nums">{value}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recurring task charts */}
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
          <p className="text-xs text-[var(--text-muted)]">Đánh dấu "Lặp lại" khi thêm việc để thống kê</p>
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
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    tickFormatter={(v) => formatTime(v)}
                  />
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
