import { useMemo, useState } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { getNowInTimezone } from '@/lib/notifications';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, ArrowLeftRight, Calendar } from 'lucide-react';

type Period = 'week' | 'month' | 'all';

export default function FinancePage() {
  const tasks = useTaskStore(s => s.tasks);
  const timezone = useSettingsStore(s => s.timezone);
  const [period, setPeriod] = useState<Period>('month');

  const now = getNowInTimezone(timezone);

  const filtered = useMemo(() => {
    const cutoff = period === 'week' ? 7 : period === 'month' ? 30 : 9999;
    const cutoffTime = now.getTime() - cutoff * 86400000;
    return tasks.filter(t => t.status === 'done' && t.finance && t.completedAt && t.completedAt >= cutoffTime);
  }, [tasks, period, now]);

  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    filtered.forEach(t => {
      if (t.finance?.type === 'income') totalIncome += t.finance.amount;
      else if (t.finance?.type === 'expense') totalExpense += t.finance.amount;
    });
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [filtered]);

  const dailyData = useMemo(() => {
    const days: Record<string, { date: string; income: number; expense: number }> = {};
    filtered.forEach(t => {
      if (!t.completedAt || !t.finance) return;
      const d = new Date(t.completedAt);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      if (!days[key]) days[key] = { date: key, income: 0, expense: 0 };
      if (t.finance.type === 'income') days[key].income += t.finance.amount;
      else days[key].expense += t.finance.amount;
    });
    return Object.values(days).slice(-14);
  }, [filtered]);

  const formatMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24 overflow-y-auto">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Thu Chi</h1>

      {/* Period selector */}
      <div className="flex gap-1.5 mb-4">
        {(['week', 'month', 'all'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[40px] ${
              period === p
                ? 'bg-[rgba(0,229,204,0.15)] text-[var(--accent-primary)] border border-[var(--border-accent)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
            }`}
          >
            {p === 'week' ? '7 ngày' : p === 'month' ? '30 ngày' : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
          <TrendingUp size={16} className="text-[var(--success)] mb-1" />
          <p className="text-sm font-bold text-[var(--success)] font-mono tabular-nums">{formatMoney(stats.totalIncome)}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Tổng thu</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
          <TrendingDown size={16} className="text-[var(--error)] mb-1" />
          <p className="text-sm font-bold text-[var(--error)] font-mono tabular-nums">{formatMoney(stats.totalExpense)}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Tổng chi</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
          <ArrowLeftRight size={16} className={stats.net >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'} />
          <p className={`text-sm font-bold font-mono tabular-nums ${stats.net >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            {stats.net >= 0 ? '+' : ''}{formatMoney(stats.net)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">Ròng</p>
        </div>
      </div>

      {/* Chart */}
      {dailyData.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-4">
          <h2 className="text-xs font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
            <Calendar size={14} /> Biểu đồ thu chi
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number, name: string) => [formatMoney(value), name === 'income' ? 'Thu' : 'Chi']}
                />
                <Bar dataKey="income" fill="#34D399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#F87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <h2 className="text-xs font-medium text-[var(--text-secondary)] mb-2">Giao dịch ({filtered.length})</h2>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
          <DollarSign size={28} className="text-[var(--text-muted)] mb-2" />
          <p className="text-sm text-[var(--text-muted)]">Chưa có giao dịch</p>
          <p className="text-xs text-[var(--text-muted)]">Thêm thu chi khi chỉnh sửa việc</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).map(task => (
            <div key={task.id} className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
              <div className={`size-8 rounded-lg flex items-center justify-center ${
                task.finance?.type === 'income' ? 'bg-[rgba(52,211,153,0.15)]' : 'bg-[rgba(248,113,113,0.15)]'
              }`}>
                {task.finance?.type === 'income' ? <TrendingUp size={14} className="text-[var(--success)]" /> : <TrendingDown size={14} className="text-[var(--error)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{task.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {task.completedAt ? new Date(task.completedAt).toLocaleDateString('vi-VN') : ''}
                  {task.finance?.note ? ` • ${task.finance.note}` : ''}
                </p>
              </div>
              <p className={`text-sm font-bold font-mono tabular-nums ${task.finance?.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                {task.finance?.type === 'income' ? '+' : '-'}{(task.finance?.amount || 0).toLocaleString('vi-VN')}đ
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
