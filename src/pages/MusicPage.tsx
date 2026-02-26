import { useState, useRef, useEffect, useCallback } from 'react';
import { useMusicStore } from '@/stores';
import { Plus, Play, Pause, SkipBack, SkipForward, Trash2, Music, X, Volume2 } from 'lucide-react';

function MusicPlayer() {
  const { tracks, currentTrackIndex, isPlaying, togglePlay, nextTrack, prevTrack, setCurrentTrack } = useMusicStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);

  const currentTrack = tracks[currentTrackIndex];

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = currentTrack.url;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentTrackIndex, currentTrack]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime, duration } = audioRef.current;
    setProgress(duration ? (currentTime / duration) * 100 : 0);
  };

  if (!currentTrack) return null;

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-4">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={nextTrack}
      />

      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center">
          <Volume2 size={18} className="text-[var(--accent-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{currentTrack.title}</p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {currentTrackIndex + 1} / {tracks.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-[var(--bg-surface)] rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevTrack} className="size-11 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] active:opacity-70" aria-label="Bài trước">
          <SkipBack size={18} />
        </button>
        <button onClick={togglePlay} className="size-14 rounded-2xl bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)] active:opacity-80" aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}>
          {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </button>
        <button onClick={nextTrack} className="size-11 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] active:opacity-70" aria-label="Bài tiếp">
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  );
}

export default function MusicPage() {
  const { tracks, addTrack, removeTrack, setCurrentTrack } = useMusicStore();
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (!title.trim() || !url.trim()) return;
    addTrack(title.trim(), url.trim());
    setTitle('');
    setUrl('');
    setShowAddForm(false);
  };

  const handlePlayTrack = (index: number) => {
    setCurrentTrack(index);
    togglePlay();
  };

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Playlist</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="size-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)] active:opacity-70"
          aria-label="Thêm nhạc"
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-accent)] mb-4 animate-slide-up">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên bài hát"
            className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] mb-2 min-h-[44px]"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link .mp3"
            className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] mb-3 min-h-[44px]"
          />
          <button
            onClick={handleAdd}
            disabled={!title.trim() || !url.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 active:opacity-80 min-h-[44px]"
          >
            Thêm vào playlist
          </button>
        </div>
      )}

      <MusicPlayer />

      {/* Track list */}
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
          <div className="size-12 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center mb-3">
            <Music size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-1">Playlist trống</p>
          <p className="text-xs text-[var(--text-muted)]">Thêm link .mp3 để nghe nhạc khi làm việc</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <div
              key={track.id}
              className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]"
            >
              <button
                onClick={() => handlePlayTrack(index)}
                className="size-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0 active:opacity-70"
                aria-label="Phát"
              >
                <Play size={14} fill="currentColor" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{track.title}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{track.url}</p>
              </div>
              <button
                onClick={() => removeTrack(track.id)}
                className="size-9 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)] active:opacity-70"
                aria-label="Xóa"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
