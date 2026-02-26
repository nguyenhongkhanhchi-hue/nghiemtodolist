import { useSettingsStore, useTaskStore } from '@/stores';
import { CheckSquare, BarChart3, Sparkles, Settings, Trophy, FileText, DollarSign, CalendarDays } from 'lucide-react';
import type { PageType } from '@/types';

const NAV_ITEMS: { page: PageType; icon: typeof CheckSquare; label: string }[] = [
  { page: 'tasks', icon: CheckSquare, label: 'Việc' },
  { page: 'templates', icon: FileText, label: 'Mẫu' },
  { page: 'stats', icon: BarChart3, label: 'Thống kê' },
  { page: 'finance', icon: DollarSign, label: 'Thu chi' },
  { page: 'ai', icon: Sparkles, label: 'Lucy' },
  { page: 'achievements', icon: Trophy, label: 'Thành tích' },
  { page: 'weekly_review', icon: CalendarDays, label: 'Tuần' },
  { page: 'settings', icon: Settings, label: 'Cài đặt' },
];

export function BottomNav() {
  const currentPage = useSettingsStore(s => s.currentPage);
  const setCurrentPage = useSettingsStore(s => s.setCurrentPage);
  const overdueCount = useTaskStore(s => s.tasks.filter(t => t.status === 'overdue').length);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-[var(--border-subtle)]">
      <div className="max-w-lg mx-auto flex items-center">
        {NAV_ITEMS.map(({ page, icon: Icon, label }) => {
          const isActive = currentPage === page;
          return (
            <button key={page} onClick={() => setCurrentPage(page)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px] relative transition-colors ${
                isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'
              }`} aria-label={label}>
              <div className="relative">
                <Icon size={16} />
                {page === 'tasks' && overdueCount > 0 && (
                  <div className="absolute -top-1.5 -right-2 size-4 rounded-full bg-[var(--error)] flex items-center justify-center">
                    <span className="text-[7px] font-bold text-white">{overdueCount > 9 ? '9+' : overdueCount}</span>
                  </div>
                )}
              </div>
              <span className="text-[8px] font-medium leading-tight">{label}</span>
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--accent-primary)]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
