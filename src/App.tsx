import { useEffect } from 'react';
import { useSettingsStore } from '@/stores';
import { BottomNav } from '@/components/layout/BottomNav';
import { InstallPrompt } from '@/components/features/InstallPrompt';
import { TaskTimer } from '@/components/features/TaskTimer';
import TasksPage from '@/pages/TasksPage';
import StatsPage from '@/pages/StatsPage';
import MusicPage from '@/pages/MusicPage';
import AIPage from '@/pages/AIPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  const currentPage = useSettingsStore((s) => s.currentPage);
  const fontScale = useSettingsStore((s) => s.fontScale);

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

  const renderPage = () => {
    switch (currentPage) {
      case 'tasks': return <TasksPage />;
      case 'stats': return <StatsPage />;
      case 'music': return <MusicPage />;
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
