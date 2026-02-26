import { useCallback } from 'react';

export function useVietnameseVoice() {
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.1;
    utterance.pitch = 1.2;

    const voices = window.speechSynthesis.getVoices();
    // Prefer female Vietnamese voice (Lucy)
    const viVoice = voices.find(v => v.lang.startsWith('vi') && v.name.toLowerCase().includes('female'))
      || voices.find(v => v.lang.startsWith('vi'))
      || voices.find(v => v.lang.startsWith('vi-VN'));

    if (viVoice) {
      utterance.voice = viVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  const announceTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    let text = '';
    if (mins === 0) {
      text = `${secs} giây`;
    } else if (secs === 0) {
      text = `${mins} phút`;
    } else {
      text = `${mins} phút ${secs} giây`;
    }
    speak(text);
  }, [speak]);

  const announceCompletion = useCallback((taskTitle: string, seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    let timeText = '';
    if (mins === 0) {
      timeText = `${secs} giây`;
    } else if (secs === 0) {
      timeText = `${mins} phút`;
    } else {
      timeText = `${mins} phút ${secs} giây`;
    }
    speak(`Tuyệt vời! Đã hoàn thành ${taskTitle} trong ${timeText}`);
  }, [speak]);

  return { speak, announceTime, announceCompletion };
}
