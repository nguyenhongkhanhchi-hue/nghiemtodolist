import { useState } from 'react';
import { useGamificationStore } from '@/stores';
import { calculateLevel, xpForNextLevel, xpForCurrentLevel } from '@/lib/gamification';
import { Trophy, Star, Gift, Flame, Plus, X, Trash2, Edit3, Save } from 'lucide-react';

export default function AchievementsPage() {
  const { state, claimReward, addCustomReward, removeReward, updateReward, addCustomAchievement, removeAchievement, updateAchievement, unlockAchievement } = useGamificationStore();
  const [showAddReward, setShowAddReward] = useState(false);
  const [showAddAchievement, setShowAddAchievement] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardIcon, setRewardIcon] = useState('🎁');
  const [rewardXp, setRewardXp] = useState(100);
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achIcon, setAchIcon] = useState('🏆');
  const [achXp, setAchXp] = useState(50);
  const [editingReward, setEditingReward] = useState<string | null>(null);
  const [editingAch, setEditingAch] = useState<string | null>(null);

  const currentLevelXp = xpForCurrentLevel(state.level);
  const nextLevelXp = xpForNextLevel(state.level);
  const progress = nextLevelXp > currentLevelXp ? ((state.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100 : 100;

  const unlocked = state.achievements.filter(a => a.unlockedAt).sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
  const locked = state.achievements.filter(a => !a.unlockedAt);

  const handleAddReward = () => {
    if (!rewardTitle.trim()) return;
    addCustomReward({ title: rewardTitle, description: rewardDesc || 'Phần thưởng tùy chọn', icon: rewardIcon, xpCost: rewardXp });
    setRewardTitle(''); setRewardDesc(''); setRewardIcon('🎁'); setRewardXp(100); setShowAddReward(false);
  };

  const handleAddAchievement = () => {
    if (!achTitle.trim()) return;
    addCustomAchievement({
      title: achTitle, description: achDesc || 'Thành tích tùy chỉnh', icon: achIcon, xpReward: achXp,
      condition: { type: 'custom', description: achDesc || '' }, isCustom: true,
    });
    setAchTitle(''); setAchDesc(''); setAchIcon('🏆'); setAchXp(50); setShowAddAchievement(false);
  };

  const ICON_OPTIONS = ['🎁', '☕', '🍰', '🎬', '🏖️', '🎮', '🎵', '📱', '👟', '💆', '🍕', '🎊'];
  const ACH_ICONS = ['🏆', '⭐', '🔥', '💎', '🎯', '⚡', '🌟', '👑', '🎖️', '🏅', '💪', '🧠'];

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-24 overflow-y-auto">
      {/* Level & XP Header */}
      <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-accent)] mb-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,229,204,0.05)] to-transparent" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center border border-[var(--border-accent)]">
                <span className="text-2xl font-bold text-[var(--accent-primary)]">{state.level}</span>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Cấp độ</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  {state.level <= 5 ? 'Người mới' : state.level <= 10 ? 'Thợ việc' : state.level <= 20 ? 'Chiến binh' : 'Huyền thoại'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-[var(--accent-primary)] font-mono tabular-nums">{state.xp}</p>
              <p className="text-[10px] text-[var(--text-muted)]">XP tổng cộng</p>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[var(--text-muted)] font-mono">{state.xp - currentLevelXp} / {nextLevelXp - currentLevelXp} XP</span>
            <span className="text-[10px] text-[var(--text-muted)]">Lên cấp {state.level + 1}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
          <Flame size={18} className="text-[var(--warning)] mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--text-primary)] font-mono tabular-nums">{state.streak}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Streak</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
          <Trophy size={18} className="text-[var(--accent-primary)] mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--text-primary)] font-mono tabular-nums">{unlocked.length}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Thành tích</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
          <Star size={18} className="text-[var(--success)] mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--text-primary)] font-mono tabular-nums">{state.totalTasksCompleted}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Việc xong</p>
        </div>
      </div>

      {/* Achievements */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
          <Trophy size={16} className="text-[var(--accent-primary)]" /> Thành tích ({unlocked.length}/{state.achievements.length})
        </h2>
        <button onClick={() => setShowAddAchievement(!showAddAchievement)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--accent-dim)] text-[var(--accent-primary)] active:opacity-70 min-h-[32px]">
          <Plus size={12} /> Thêm
        </button>
      </div>

      {showAddAchievement && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-accent)] mb-3 animate-slide-up">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {ACH_ICONS.map(icon => (
              <button key={icon} onClick={() => setAchIcon(icon)}
                className={`size-8 rounded-lg flex items-center justify-center text-lg ${achIcon === icon ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)]'}`}>{icon}</button>
            ))}
          </div>
          <input type="text" value={achTitle} onChange={e => setAchTitle(e.target.value)} placeholder="Tên thành tích"
            className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none mb-2 min-h-[40px]" />
          <input type="text" value={achDesc} onChange={e => setAchDesc(e.target.value)} placeholder="Mô tả"
            className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none mb-2 min-h-[40px]" />
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-[var(--text-muted)]">XP:</label>
            <input type="number" value={achXp} onChange={e => setAchXp(Math.max(5, parseInt(e.target.value) || 5))}
              className="w-24 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none min-h-[40px] font-mono" />
          </div>
          <button onClick={handleAddAchievement} disabled={!achTitle.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 active:opacity-80 min-h-[44px]">
            Thêm thành tích
          </button>
        </div>
      )}

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="space-y-2 mb-4">
          {unlocked.map(ach => (
            <div key={ach.id} className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-accent)]">
              <span className="text-2xl">{ach.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{ach.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{ach.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-[var(--accent-primary)] font-mono">+{ach.xpReward}</span>
                {ach.isCustom && (
                  <button onClick={() => removeAchievement(ach.id)} className="size-7 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]">
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="space-y-2 mb-6">
          {locked.map(ach => (
            <div key={ach.id} className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] opacity-60">
              <span className="text-2xl grayscale">🔒</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-secondary)]">{ach.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{ach.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--text-muted)] font-mono">+{ach.xpReward}</span>
                {ach.isCustom && (
                  <>
                    <button onClick={() => unlockAchievement(ach.id)}
                      className="px-2 py-1 rounded-lg text-[10px] bg-[var(--accent-dim)] text-[var(--accent-primary)]">Mở khóa</button>
                    <button onClick={() => removeAchievement(ach.id)} className="size-7 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]">
                      <Trash2 size={10} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rewards */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-2">
          <Gift size={16} className="text-[var(--warning)]" /> Phần thưởng
        </h2>
        <button onClick={() => setShowAddReward(!showAddReward)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--accent-dim)] text-[var(--accent-primary)] active:opacity-70 min-h-[32px]">
          <Plus size={12} /> Thêm
        </button>
      </div>

      {showAddReward && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-accent)] mb-3 animate-slide-up">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {ICON_OPTIONS.map(icon => (
              <button key={icon} onClick={() => setRewardIcon(icon)}
                className={`size-8 rounded-lg flex items-center justify-center text-lg ${rewardIcon === icon ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)]'}`}>{icon}</button>
            ))}
          </div>
          <input type="text" value={rewardTitle} onChange={e => setRewardTitle(e.target.value)} placeholder="Tên phần thưởng"
            className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none mb-2 min-h-[40px]" />
          <input type="text" value={rewardDesc} onChange={e => setRewardDesc(e.target.value)} placeholder="Mô tả (tùy chọn)"
            className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none mb-2 min-h-[40px]" />
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-[var(--text-muted)]">XP:</label>
            <input type="number" value={rewardXp} onChange={e => setRewardXp(Math.max(10, parseInt(e.target.value) || 10))}
              className="w-24 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none min-h-[40px] font-mono" />
          </div>
          <button onClick={handleAddReward} disabled={!rewardTitle.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 active:opacity-80 min-h-[44px]">
            Thêm phần thưởng
          </button>
        </div>
      )}

      <div className="space-y-2 pb-4">
        {state.rewards.map(reward => {
          const canClaim = !reward.claimed && state.xp >= reward.xpCost;
          return (
            <div key={reward.id} className={`flex items-center gap-3 bg-[var(--bg-elevated)] rounded-xl p-3 border ${reward.claimed ? 'border-[var(--success)] opacity-60' : 'border-[var(--border-subtle)]'}`}>
              <span className="text-2xl">{reward.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${reward.claimed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{reward.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{reward.description}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {!reward.claimed && (
                  <button onClick={() => claimReward(reward.id)} disabled={!canClaim}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] ${canClaim ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                    {reward.xpCost} XP
                  </button>
                )}
                {reward.claimed && <span className="text-xs text-[var(--success)] font-medium">Đã nhận</span>}
                {reward.id.startsWith('custom_') && (
                  <button onClick={() => removeReward(reward.id)} className="size-8 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
