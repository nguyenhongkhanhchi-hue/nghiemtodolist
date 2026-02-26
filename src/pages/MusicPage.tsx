import { useState, useRef, useEffect } from 'react';
import { useMusicStore } from '@/stores';
import { isGDriveLink, generateTitleFromUrl } from '@/lib/driveUtils';
import { Plus, Play, Pause, SkipBack, SkipForward, Trash2, Music, X, Volume2, Link, HardDrive } from 'lucide-react';

function MusicPlayer() {
  const { tracks, currentTrackIndex, isPlaying, togglePlay, nextTrack, prevTrack } = useMusicStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  const currentTrack = tracks[currentTrackIndex];

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    setError(false);
    audioRef.current.src = currentTrack.url;
    if (isPlaying) {
      audioRef.current.play().catch(() => setError(true));
    }
  }, [currentTrackIndex, currentTrack?.url]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setError(true));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime: ct, duration: d } = audioRef.current;
    setCurrentTime(ct);
    setDuration(d || 0);
    setProgress(d ? (ct / d) * 100 : 0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-4">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={nextTrack}
        onError={() => setError(true)}
        onLoadedMetadata={() => setError(false)}
      />

      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center flex-shrink-0">
          <Volume2 size={18} className="text-[var(--accent-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{currentTrack.title}</p>
          <div className="flex items-center gap-1.5">
            {currentTrack.source === 'gdrive' && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--accent-primary)]">
                <HardDrive size={9} /> Drive
              </span>
            )}
            <span className="text-[10px] text-[var(--text-muted)]">
              {currentTrackIndex + 1} / {tracks.length}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.2)]">
          <p className="text-xs text-[var(--error)]">Không phát được — kiểm tra link hoặc quyền chia sẻ Google Drive (phải đặt "Mọi người có link")</p>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full mb-1.5 overflow-hidden cursor-pointer"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mb-3">
        <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">{formatTime(currentTime)}</span>
        <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">{formatTime(duration)}</span>
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
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const currentTrackIndex = useMusicStore((s) => s.currentTrackIndex);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [detectedDrive, setDetectedDrive] = useState(false);

  // Auto-detect Google Drive link & auto-fill title
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setDetectedDrive(false);
      return;
    }
    const isDrive = isGDriveLink(trimmed);
    setDetectedDrive(isDrive);

    // Auto-generate title if user hasn't typed one
    if (!title.trim()) {
      setTitle(generateTitleFromUrl(trimmed));
    }
  }, [url]);

  const handleAdd = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    const finalTitle = title.trim() || generateTitleFromUrl(trimmedUrl);
    addTrack(finalTitle, trimmedUrl);
    setTitle('');
    setUrl('');
    setDetectedDrive(false);
    setShowAddForm(false);
  };

  const handlePlayTrack = (index: number) => {
    if (currentTrackIndex === index && isPlaying) {
      togglePlay();
    } else {
      setCurrentTrack(index);
      if (!isPlaying) togglePlay();
    }
  };

  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      // Clipboard API not available
    }
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
          {/* URL input with paste button */}
          <div className="relative mb-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Dán link Google Drive hoặc link .mp3"
              className="w-full bg-[var(--bg-surface)] rounded-xl pl-4 pr-16 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px] transition-colors"
            />
            <button
              onClick={handlePasteUrl}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-[var(--bg-base)] text-[10px] font-medium text-[var(--accent-primary)] active:opacity-70"
            >
              Dán
            </button>
          </div>

          {/* Google Drive detected badge */}
          {detectedDrive && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-[rgba(0,229,204,0.08)] border border-[rgba(0,229,204,0.15)]">
              <HardDrive size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
              <p className="text-xs text-[var(--accent-primary)]">
                Link Google Drive — sẽ tự chuyển đổi để phát nhạc
              </p>
            </div>
          )}

          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên bài hát (tự động nếu bỏ trống)"
            className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] mb-3 min-h-[44px] transition-colors"
          />

          <button
            onClick={handleAdd}
            disabled={!url.trim()}
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
          <p className="text-xs text-[var(--text-muted)] text-center px-6">Dán link chia sẻ từ Google Drive hoặc link .mp3 trực tiếp</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, index) => {
            const isCurrentPlaying = currentTrackIndex === index && isPlaying;
            return (
              <div
                key={track.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isCurrentPlaying
                    ? 'bg-[var(--accent-dim)] border-[var(--border-accent)]'
                    : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)]'
                }`}
              >
                <button
                  onClick={() => handlePlayTrack(index)}
                  className={`size-9 rounded-lg flex items-center justify-center flex-shrink-0 active:opacity-70 ${
                    isCurrentPlaying
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
                      : 'bg-[var(--accent-dim)] text-[var(--accent-primary)]'
                  }`}
                  aria-label={isCurrentPlaying ? 'Tạm dừng' : 'Phát'}
                >
                  {isCurrentPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isCurrentPlaying ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                    {track.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {track.source === 'gdrive' ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--accent-primary)]">
                        <HardDrive size={9} /> Google Drive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                        <Link size={9} /> MP3
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeTrack(track.id)}
                  className="size-9 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)] active:opacity-70"
                  aria-label="Xóa"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
