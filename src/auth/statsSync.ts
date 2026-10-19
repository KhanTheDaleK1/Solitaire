import { UserStats, AuthUser } from '../game/types';

const STATS_STORAGE_KEY = 'solitaire_stats_v1';

export interface JigsawPuzzleDef {
  id: string;
  name: string;
  theme: string;
  badgeEmoji: string;
  colors: [string, string, string];
  icon: string;
}

export const MOBILITYWARE_PUZZLES: JigsawPuzzleDef[] = [
  { id: 'autumn_cabin', name: 'Autumn Cabin', theme: 'Mountain Retreat', badgeEmoji: '🍁', colors: ['#7c2d12', '#d97706', '#fde68a'], icon: '🏡' },
  { id: 'tropical_cove', name: 'Tropical Cove', theme: 'Island Paradise', badgeEmoji: '🏝️', colors: ['#0369a1', '#06b6d4', '#fef08a'], icon: '⛵' },
  { id: 'alpine_express', name: 'Alpine Express', theme: 'Winter Peaks', badgeEmoji: '🏔️', colors: ['#1e3a8a', '#38bdf8', '#f8fafc'], icon: '🚂' },
  { id: 'starlight_castle', name: 'Starlight Castle', theme: 'Royal Kingdom', badgeEmoji: '🏰', colors: ['#311042', '#7e22ce', '#fbbf24'], icon: '👑' },
  { id: 'golden_reef', name: 'Golden Reef', theme: 'Ocean Depths', badgeEmoji: '🐠', colors: ['#064e3b', '#10b981', '#fcd34d'], icon: '🐚' },
  { id: 'royal_gardens', name: 'Royal Gardens', theme: 'Spring Bloom', badgeEmoji: '🌹', colors: ['#14532d', '#22c55e', '#fb7185'], icon: '🦋' }
];

export interface RankTier {
  minLevel: number;
  title: string;
  badge: string;
}

export const MOBILITYWARE_RANKS: RankTier[] = [
  { minLevel: 100, title: 'Grandmaster', badge: '👑' },
  { minLevel: 75, title: 'Solitaire Royalty', badge: '💎' },
  { minLevel: 60, title: 'Spade Champion', badge: '♠️' },
  { minLevel: 45, title: 'Heart Master', badge: '♥️' },
  { minLevel: 30, title: 'Diamond Ace', badge: '♦️' },
  { minLevel: 20, title: 'Club Virtuoso', badge: '♣️' },
  { minLevel: 10, title: 'Card Shark', badge: '🃏' },
  { minLevel: 5, title: 'Dealer', badge: '🎴' },
  { minLevel: 1, title: 'Apprentice', badge: '⭐' }
];

export function getPlayerRank(level: number): RankTier {
  for (const tier of MOBILITYWARE_RANKS) {
    if (level >= tier.minLevel) return tier;
  }
  return MOBILITYWARE_RANKS[MOBILITYWARE_RANKS.length - 1];
}

const DEFAULT_STATS: UserStats = {
  gamesPlayed: 159,
  gamesWon: 97,
  currentStreak: 0,
  bestStreak: 7,
  bestScore: 14061,
  bestTime: 52,
  crowns: {
    '2026-10': {
      daysCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      trophyUnlocked: 'GOLD'
    }
  },
  meta: {
    level: 75,
    totalStars: 62300,
    starsToNextLevel: 890,
    currentPuzzle: 'autumn_cabin',
    piecesCollected: 226,
    puzzlesCompleted: 12,
    badgesEarned: 6,
    puzzleProgress: {
      autumn_cabin: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      tropical_cove: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      alpine_express: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      starlight_castle: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      golden_reef: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      royal_gardens: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    }
  }
};

export class StatsManager {
  private stats: UserStats;

  constructor() {
    this.stats = this.loadStats();
  }

  private loadStats(): UserStats {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_STATS,
          ...parsed,
          crowns: parsed.crowns || DEFAULT_STATS.crowns,
          meta: {
            ...DEFAULT_STATS.meta,
            ...(parsed.meta || {}),
            puzzleProgress: {
              ...DEFAULT_STATS.meta.puzzleProgress,
              ...(parsed.meta?.puzzleProgress || {})
            }
          }
        };
      } catch {
        // Fall back to default
      }
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATS));
  }

  private saveStats(user?: AuthUser | null): void {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.stats));
    if (user?.uid) {
      this.pushCloudStats(user).catch(() => {});
    }
  }

  public async syncWithCloud(user: AuthUser | null): Promise<UserStats> {
    if (!user?.uid) return this.getStats();
    try {
      const res = await fetch(`/api/cloud/sync?uid=${encodeURIComponent(user.uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.stats && typeof data.stats.gamesPlayed === 'number') {
          // Merge highest progress between local and cloud
          const cloud: UserStats = data.stats;
          if (cloud.gamesPlayed > this.stats.gamesPlayed || cloud.bestScore > this.stats.bestScore) {
            this.stats.gamesPlayed = Math.max(this.stats.gamesPlayed, cloud.gamesPlayed);
            this.stats.gamesWon = Math.max(this.stats.gamesWon, cloud.gamesWon);
            this.stats.bestStreak = Math.max(this.stats.bestStreak, cloud.bestStreak || 0);
            this.stats.bestScore = Math.max(this.stats.bestScore, cloud.bestScore || 0);
            if (cloud.bestTime !== null && cloud.bestTime !== undefined) {
              this.stats.bestTime = this.stats.bestTime === null
                ? cloud.bestTime
                : Math.min(this.stats.bestTime, cloud.bestTime);
            }
            if (cloud.meta && cloud.meta.totalStars > this.stats.meta.totalStars) {
              this.stats.meta = { ...this.stats.meta, ...cloud.meta };
            }
          }
        }
      }
      await this.pushCloudStats(user);
    } catch {
      // Offline mode
    }
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.stats));
    return this.getStats();
  }

  private async pushCloudStats(user: AuthUser): Promise<void> {
    await fetch('/api/cloud/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        user: {
          displayName: user.displayName,
          email: user.email,
          provider: user.provider
        },
        stats: this.stats
      })
    });
  }

  public getStats(): UserStats {
    return { ...this.stats };
  }

  public unlockNextPuzzlePiece(puzzleId?: string, user?: AuthUser | null): { unlockedIndex: number | null; completedPuzzle: boolean } {
    const targetId = puzzleId || this.stats.meta.currentPuzzle || 'autumn_cabin';
    if (!this.stats.meta.puzzleProgress) {
      this.stats.meta.puzzleProgress = {};
    }
    if (!this.stats.meta.puzzleProgress[targetId]) {
      this.stats.meta.puzzleProgress[targetId] = [];
    }

    const unlocked = this.stats.meta.puzzleProgress[targetId];
    const missing: number[] = [];
    for (let i = 0; i < 16; i++) {
      if (!unlocked.includes(i)) missing.push(i);
    }

    if (missing.length === 0) {
      return { unlockedIndex: null, completedPuzzle: false };
    }

    const nextPiece = missing[0];
    unlocked.push(nextPiece);
    unlocked.sort((a, b) => a - b);
    this.stats.meta.piecesCollected++;

    let completedPuzzle = false;
    if (unlocked.length === 16) {
      completedPuzzle = true;
      this.stats.meta.puzzlesCompleted++;
      this.stats.meta.badgesEarned++;
    }

    this.saveStats(user);
    return { unlockedIndex: nextPiece, completedPuzzle };
  }

  public recordGame(
    isWon: boolean,
    score: number,
    timeSeconds: number,
    user?: AuthUser | null,
    dailyDate?: string
  ): { stats: UserStats; xpEarned: number; leveledUp: boolean; unlockedPiece: number | null } {
    this.stats.gamesPlayed++;
    let xpEarned = 0;
    let leveledUp = false;
    let unlockedPiece: number | null = null;

    if (isWon) {
      this.stats.gamesWon++;
      this.stats.currentStreak++;
      if (this.stats.currentStreak > this.stats.bestStreak) {
        this.stats.bestStreak = this.stats.currentStreak;
      }

      if (score > this.stats.bestScore) {
        this.stats.bestScore = score;
      }

      if (this.stats.bestTime === null || (timeSeconds > 0 && timeSeconds < this.stats.bestTime)) {
        this.stats.bestTime = timeSeconds;
      }

      // Calculate MobilityWare XP / Stars (Base 150 + Speed bonus + Daily bonus + Streak bonus)
      const speedBonus = Math.max(0, Math.min(200, Math.floor((300 - timeSeconds) * 0.6)));
      const dailyBonus = dailyDate ? 150 : 0;
      const streakBonus = Math.min(100, this.stats.currentStreak * 15);
      xpEarned = 150 + speedBonus + dailyBonus + streakBonus;

      if (this.stats.meta) {
        this.stats.meta.totalStars += xpEarned;
        if (this.stats.meta.starsToNextLevel <= xpEarned) {
          this.stats.meta.level += 1;
          this.stats.meta.starsToNextLevel = 1000 + (this.stats.meta.level * 10);
          leveledUp = true;
        } else {
          this.stats.meta.starsToNextLevel -= xpEarned;
        }

        // Unlock a Jigsaw Puzzle piece on win
        const puzzleRes = this.unlockNextPuzzlePiece(this.stats.meta.currentPuzzle, user);
        unlockedPiece = puzzleRes.unlockedIndex;
      }

      // If this was a Daily Challenge hand, reward Crown
      if (dailyDate) {
        const parts = dailyDate.split('-');
        if (parts.length === 3) {
          const monthKey = `${parts[0]}-${parts[1]}`;
          const day = parseInt(parts[2], 10);

          if (!this.stats.crowns) this.stats.crowns = {};
          if (!this.stats.crowns[monthKey]) {
            this.stats.crowns[monthKey] = { daysCompleted: [], trophyUnlocked: 'NONE' };
          }

          const mData = this.stats.crowns[monthKey];
          if (!mData.daysCompleted.includes(day)) {
            mData.daysCompleted.push(day);
            mData.daysCompleted.sort((a, b) => a - b);
          }

          const count = mData.daysCompleted.length;
          if (count >= 20) mData.trophyUnlocked = 'GOLD';
          else if (count >= 10) mData.trophyUnlocked = 'SILVER';
          else if (count >= 5) mData.trophyUnlocked = 'BRONZE';
        }
      }
    } else {
      this.stats.currentStreak = 0;
    }

    this.saveStats(user);
    return { stats: this.getStats(), xpEarned, leveledUp, unlockedPiece };
  }

  public importStats(imported: UserStats, merge: boolean = false, user?: AuthUser | null): UserStats {
    if (merge) {
      this.stats.gamesPlayed += imported.gamesPlayed;
      this.stats.gamesWon += imported.gamesWon;
      this.stats.bestStreak = Math.max(this.stats.bestStreak, imported.bestStreak);
      this.stats.bestScore = Math.max(this.stats.bestScore, imported.bestScore);
      if (imported.bestTime !== null) {
        this.stats.bestTime = this.stats.bestTime === null
          ? imported.bestTime
          : Math.min(this.stats.bestTime, imported.bestTime);
      }
    } else {
      this.stats = {
        ...imported,
        meta: {
          ...DEFAULT_STATS.meta,
          ...(imported.meta || {}),
          puzzleProgress: {
            ...DEFAULT_STATS.meta.puzzleProgress,
            ...(imported.meta?.puzzleProgress || {})
          }
        }
      };
    }

    this.saveStats(user);
    return this.getStats();
  }

  public exportStatsJson(): string {
    return JSON.stringify(this.stats, null, 2);
  }
}
