import { useEffect, useState } from 'react';
import { useSettingsStore, useAuthStore, useTaskStore, useChatStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/layout/BottomNav';
import { InstallPrompt } from '@/components/features/InstallPrompt';
import { TaskTimer } from '@/components/features/TaskTimer';
import TasksPage from '@/pages/TasksPage';
import StatsPage from '@/pages/StatsPage';
import AIPage from '@/pages/AIPage';
import SettingsPage from '@/pages/SettingsPage';
import AuthPage from '@/pages/AuthPage';

export default function App() {
  const currentPage = useSettingsStore((s) => s.currentPage);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const initTasks = useTaskStore((s) => s.initForUser);
  const initChat = useChatStore((s) => s.initForUser);

  // Apply font scale on mount and when it changes
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale));
  }, [fontScale]);

  // Load speech synthesis voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Auth session check
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email!,
          username: u.user_metadata?.username || u.user_metadata?.full_name || u.email!.split('@')[0],
        });
      } else if (mounted) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          const u = session.user;
          setUser({
            id: u.id,
            email: u.email!,
            username: u.user_metadata?.username || u.user_metadata?.full_name || u.email!.split('@')[0],
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const u = session.user;
          setUser({
            id: u.id,
            email: u.email!,
            username: u.user_metadata?.username || u.user_metadata?.full_name || u.email!.split('@')[0],
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Initialize user-specific data when user changes
  useEffect(() => {
    if (user) {
      const userId = user.id === 'guest' ? undefined : user.id;
      initTasks(userId);
      initChat(userId);
    }
  }, [user?.id]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center border border-[var(--border-accent)] animate-pulse">
            <span className="text-xl font-bold text-[var(--accent-primary)]">T</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'tasks': return <TasksPage />;
      case 'stats': return <StatsPage />;
      case 'ai': return <AIPage />;
      case 'settings': return <SettingsPage />;
      default: return <TasksPage />;
    }
  };

  return (
    <div className="min-h-[100dvh] max-w-lg mx-auto flex flex-col bg-[var(--bg-base)] overflow-x-hidden">
      <InstallPrompt />
      <TaskTimer />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {renderPage()}
      </main>
      <BottomNav />
    </div>
  );
}
