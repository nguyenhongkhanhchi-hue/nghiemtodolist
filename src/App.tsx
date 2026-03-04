import { useEffect, useState } from 'react';
import { useSettingsStore, useAuthStore, useTaskStore, useChatStore, useGamificationStore, useTemplateStore, useTopicStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { checkDeadlineNotifications } from '@/lib/notifications';
import { BottomNav } from '@/components/layout/BottomNav';
import { TaskTimer } from '@/components/features/TaskTimer';
import { LucyChatFAB } from '@/pages/AIPage';
import TasksPage from '@/pages/TasksPage';
import StatsPage from '@/pages/StatsPage';
import SettingsPage from '@/pages/SettingsPage';
import AchievementsPage from '@/pages/AchievementsPage';
import AuthPage from '@/pages/AuthPage';
import TemplatesPage from '@/pages/TemplatesPage';
import FinancePage from '@/pages/FinancePage';

export default function App() {
  const currentPage = useSettingsStore(s => s.currentPage);
  const uiScale = useSettingsStore(s => s.uiScale);
  const timezone = useSettingsStore(s => s.timezone);
  const notificationSettings = useSettingsStore(s => s.notificationSettings);
  const user = useAuthStore(s => s.user);
  const isLoading = useAuthStore(s => s.isLoading);
  const setUser = useAuthStore(s => s.setUser);
  const setLoading = useAuthStore(s => s.setLoading);
  const initTasks = useTaskStore(s => s.initForUser);
  const initChat = useChatStore(s => s.initForUser);
  const initGam = useGamificationStore(s => s.initForUser);
  const initTemplates = useTemplateStore(s => s.initForUser);
  const initTopics = useTopicStore(s => s.initForUser);
  const tasks = useTaskStore(s => s.tasks);
  const markOverdue = useTaskStore(s => s.markOverdue);
  const [isLandscape, setIsLandscape] = useState(false);

  // UI scale
  useEffect(() => { document.documentElement.style.setProperty('--ui-scale', String(uiScale)); }, [uiScale]);

  // Detect orientation
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth > 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Set landscape class on body
  useEffect(() => {
    document.body.classList.toggle('landscape', isLandscape);
    document.body.classList.toggle('portrait', !isLandscape);
  }, [isLandscape]);

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
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session?.user) {
          const u = session.user;
          setUser({ id: u.id, email: u.email!, username: u.user_metadata?.username || u.email!.split('@')[0] });
        }
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, username: u.user_metadata?.username || u.email!.split('@')[0] });
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Init stores
  useEffect(() => {
    if (user) {
      const uid = user.id === 'admin' ? 'admin' : user.id;
      initTasks(uid); initChat(uid); initGam(uid); initTemplates(uid); initTopics(uid);
    }
  }, [user?.id]);

  // Mark overdue + notifications
  useEffect(() => {
    if (!user) return;
    const notified = new Set<string>();
    const check = () => {
      markOverdue();
      if (notificationSettings.enabled) checkDeadlineNotifications(tasks, timezone, notificationSettings.beforeDeadline, notified);
    };
    check();
    const i = setInterval(check, 30000);
    return () => clearInterval(i);
  }, [user?.id, tasks.length, timezone, notificationSettings.enabled]);

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
      case 'settings': return <SettingsPage />;
      case 'templates': return <TemplatesPage />;
      case 'finance': return <FinancePage />;
      default: return <TasksPage />;
    }
  };

  return (
    <div className={`min-h-[100dvh] flex bg-[var(--bg-base)] overflow-x-hidden ${isLandscape ? 'flex-row' : 'flex-col'}`}>
      <TaskTimer />
      <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isLandscape ? 'ml-16' : ''}`}
        style={{ paddingBottom: isLandscape ? '0' : 'calc(56px + env(safe-area-inset-bottom, 0px))' }}>
        {renderPage()}
      </main>
      <BottomNav />
      <LucyChatFAB />
    </div>
  );
}
