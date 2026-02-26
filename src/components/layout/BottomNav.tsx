import { useSettingsStore } from '@/stores';
import {
  ListTodo,
  BarChart3,
  Music,
  Bot,
  Settings,
} from 'lucide-react';
import type { PageType } from '@/types';

const navItems: { page: PageType; icon: typeof ListTodo; label: string }[] = [
  { page: 'tasks', icon: ListTodo, label: 'Việc' },
  { page: 'stats', icon: BarChart3, label: 'Thống kê' },
  { page: 'music', icon: Music, label: 'Nhạc' },
  { page: 'ai', icon: Bot, label: 'AI' },
  { page: 'settings', icon: Settings, label: 'Cài đặt' },
];

export function BottomNav() {
  const currentPage = useSettingsStore((s) => s.currentPage);
  const setCurrentPage = useSettingsStore((s) => s.setCurrentPage);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ page, icon: Icon, label }) => {
          const isActive = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-[var(--accent-primary)]'
                  : 'text-[var(--text-muted)] active:text-[var(--text-secondary)]'
              }`}
              aria-label={label}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.6}
                className={isActive ? 'drop-shadow-[0_0_6px_rgba(0,229,204,0.4)]' : ''}
              />
              <span className="text-[10px] font-medium leading-none">{label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-[var(--accent-primary)] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
