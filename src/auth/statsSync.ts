import { UserStats, AuthUser } from '../game/types';

const STATS_STORAGE_KEY = 'solitaire_stats_v1';

export class StatsManager {
  private stats: UserStats;

  constructor() {
    this.stats = this.loadStats();
  }

  private loadStats(): UserStats {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fall back to default
      }
    }
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      bestScore: 0,
      bestTime: null
    };
  }

  private saveStats(): void {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.stats));
  }

  public getStats(): UserStats {
    return { ...this.stats };
  }

  public recordGame(isWon: boolean, score: number, timeSeconds: number, _user?: AuthUser | null): UserStats {
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
      bestTime: null
    };
    this.saveStats();
  }
}
