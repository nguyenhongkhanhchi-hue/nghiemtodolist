import { useEffect } from 'react';
import { useSettingsStore, useAuthStore, useTaskStore, useChatStore, useGamificationStore, useTemplateStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { checkDeadlineNotifications } from '@/lib/notifications';
import { BottomNav } from '@/components/layout/BottomNav';
import { InstallPrompt } from '@/components/features/InstallPrompt';
import { TaskTimer } from '@/components/features/TaskTimer';
import TasksPage from '@/pages/TasksPage';
import StatsPage from '@/pages/StatsPage';
import AIPage from '@/pages/AIPage';
import SettingsPage from '@/pages/SettingsPage';
import AchievementsPage from '@/pages/AchievementsPage';
import AuthPage from '@/pages/AuthPage';
import TemplatesPage from '@/pages/TemplatesPage';
import FinancePage from '@/pages/FinancePage';
import WeeklyReviewPage from '@/pages/WeeklyReviewPage';

export default function App() {
  const currentPage = useSettingsStore(s => s.currentPage);
  const fontScale = useSettingsStore(s => s.fontScale);
  const timezone = useSettingsStore(s => s.timezone);
  const notificationSettings = useSettingsStore(s => s.notificationSettings);
  const user = useAuthStore(s => s.user);
  const isLoading = useAuthStore(s => s.isLoading);
  const setUser = useAuthStore(s => s.setUser);
  const setLoading = useAuthStore(s => s.setLoading);
  const initTasks = useTaskStore(s => s.initForUser);
  const initChat = useChatStore(s => s.initForUser);
  const initGamification = useGamificationStore(s => s.initForUser);
  const initTemplates = useTemplateStore(s => s.initForUser);
  const tasks = useTaskStore(s => s.tasks);
  const markOverdue = useTaskStore(s => s.markOverdue);

  // Font scale — set on html root for rem-based sizing
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale));
  }, [fontScale]);

  // Preload voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Auth session
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, username: u.user_metadata?.username || u.email!.split('@')[0] });
      } else if (mounted) {
        setLoading(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, username: u.user_metadata?.username || u.email!.split('@')[0] });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, username: u.user_metadata?.username || u.email!.split('@')[0] });
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Init stores per user
  useEffect(() => {
    if (user) {
      const userId = user.id === 'guest' ? undefined : user.id;
      initTasks(userId);
      initChat(userId);
      initGamification(userId);
      initTemplates(userId);
    }
  }, [user?.id]);

  // Mark overdue + notifications
  useEffect(() => {
    if (!user) return;
    const notifiedSet = new Set<string>();
    const check = () => {
      markOverdue();
      if (notificationSettings.enabled) {
        checkDeadlineNotifications(tasks, timezone, notificationSettings.beforeDeadline, notifiedSet);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user?.id, tasks.length, timezone, notificationSettings.enabled, notificationSettings.beforeDeadline]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center border border-[var(--border-accent)] animate-pulse">
            <span className="text-xl font-bold text-[var(--accent-primary)]">N</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const renderPage = () => {
    switch (currentPage) {
      case 'tasks': return <TasksPage />;
      case 'stats': return <StatsPage />;
      case 'achievements': return <AchievementsPage />;
      case 'ai': return <AIPage />;
      case 'settings': return <SettingsPage />;
      case 'templates': return <TemplatesPage />;
      case 'finance': return <FinancePage />;
      case 'weekly_review': return <WeeklyReviewPage />;
      default: return <TasksPage />;
    }
  };

  return (
    <div className="min-h-[100dvh] max-w-lg mx-auto flex flex-col bg-[var(--bg-base)] overflow-x-hidden">
      <InstallPrompt />
      <TaskTimer />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">{renderPage()}</main>
      <BottomNav />
    </div>
  );
}
