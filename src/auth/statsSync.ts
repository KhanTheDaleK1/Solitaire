import { UserStats, AuthUser } from '../game/types';

const STATS_STORAGE_KEY = 'solitaire_stats_v1';

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
    badgesEarned: 6
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
          meta: parsed.meta || DEFAULT_STATS.meta
        };
      } catch {
        // Fall back to default
      }
    }
    return { ...DEFAULT_STATS };
  }

  private saveStats(): void {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.stats));
  }

  public getStats(): UserStats {
    return { ...this.stats };
  }

  public recordGame(
    isWon: boolean,
    score: number,
    timeSeconds: number,
    _user?: AuthUser | null,
    dailyDate?: string
  ): UserStats {
    this.stats.gamesPlayed++;

    if (isWon) {
      this.stats.gamesWon++;
      this.stats.currentStreak++;
      if (this.stats.currentStreak > this.stats.bestStreak) {
        this.stats.bestStreak = this.stats.currentStreak;
      }

      if (score > this.stats.bestScore) {
        this.stats.bestScore = score;
      }

      if (this.stats.bestTime === null || timeSeconds < this.stats.bestTime) {
        this.stats.bestTime = timeSeconds;
      }

      // Add stars & leveling
      if (this.stats.meta) {
        this.stats.meta.totalStars += 150;
        if (this.stats.meta.starsToNextLevel <= 150) {
          this.stats.meta.level += 1;
          this.stats.meta.starsToNextLevel = 1000;
        } else {
          this.stats.meta.starsToNextLevel -= 150;
        }
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

    this.saveStats();
    return this.getStats();
  }

  public importStats(imported: UserStats, merge: boolean = false): UserStats {
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
      this.stats = { ...imported };
    }

    this.saveStats();
    return this.getStats();
  }

  public exportStatsJson(): string {
    return JSON.stringify(this.stats, null, 2);
  }

  public resetStats(): void {
    this.stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestScore: 0,
      bestTime: null,
      crowns: {},
      meta: {
        level: 1,
        totalStars: 0,
        starsToNextLevel: 1000,
        currentPuzzle: 'autumn_cabin',
        piecesCollected: 0,
        puzzlesCompleted: 0,
        badgesEarned: 0
      }
    };
    this.saveStats();
  }
}
