import { UserStats, AuthUser } from '../game/types';

const STATS_STORAGE_KEY = 'solitaire_stats_v1';

export interface JigsawPuzzleDef {
  id: string;
  name: string;
  theme: string;
  badgeEmoji: string;
  colors: [string, string, string];
  icon: string;
  pieceCount: number;
  piecesPerWin: number;
}

type MonthlyPuzzleTheme = Omit<JigsawPuzzleDef, 'id' | 'pieceCount' | 'piecesPerWin'> & { slug: string };

const MONTHLY_THEMES: MonthlyPuzzleTheme[][] = [
  [
    { slug: 'snowy-cabin', name: 'Snowy Cabin', theme: 'Winter Retreat', badgeEmoji: '❄️', colors: ['#164e63', '#38bdf8', '#e0f2fe'], icon: '🏡' },
    { slug: 'aurora-lake', name: 'Aurora Lake', theme: 'Northern Lights', badgeEmoji: '🌌', colors: ['#172554', '#0f766e', '#a7f3d0'], icon: '🌲' },
    { slug: 'ice-castle', name: 'Ice Castle', theme: 'Frozen Kingdom', badgeEmoji: '🏰', colors: ['#1e3a8a', '#93c5fd', '#f8fafc'], icon: '🧊' },
    { slug: 'winter-wolves', name: 'Winter Wolves', theme: 'Moonlit Wilds', badgeEmoji: '🐺', colors: ['#334155', '#64748b', '#cbd5e1'], icon: '🌙' },
    { slug: 'ski-village', name: 'Ski Village', theme: 'Alpine Adventure', badgeEmoji: '🎿', colors: ['#075985', '#f97316', '#fef3c7'], icon: '⛷️' },
    { slug: 'frosted-garden', name: 'Frosted Garden', theme: 'Winter Bloom', badgeEmoji: '🌹', colors: ['#312e81', '#be185d', '#bae6fd'], icon: '🌿' },
    { slug: 'new-year-fireworks', name: 'New Year Fireworks', theme: 'Midnight Celebration', badgeEmoji: '🎆', colors: ['#111827', '#4338ca', '#facc15'], icon: '🎇' },
    { slug: 'snow-globe', name: 'Snow Globe', theme: 'Tiny Winter World', badgeEmoji: '🔮', colors: ['#0c4a6e', '#67e8f9', '#fef9c3'], icon: '⛄' }
  ],
  [
    { slug: 'valentine-courtyard', name: 'Valentine Courtyard', theme: 'Romantic Escape', badgeEmoji: '💌', colors: ['#881337', '#fb7185', '#ffe4e6'], icon: '💞' },
    { slug: 'rose-garden', name: 'Rose Garden', theme: 'Garden Romance', badgeEmoji: '🌹', colors: ['#14532d', '#e11d48', '#fecdd3'], icon: '🌹' },
    { slug: 'chocolate-shop', name: 'Chocolate Shop', theme: 'Sweetheart Treats', badgeEmoji: '🍫', colors: ['#431407', '#a16207', '#fde68a'], icon: '🍬' },
    { slug: 'lovebirds', name: 'Lovebirds', theme: 'Woodland Hearts', badgeEmoji: '💗', colors: ['#166534', '#f43f5e', '#fef2f2'], icon: '🐦' },
    { slug: 'moonlit-promenade', name: 'Moonlit Promenade', theme: 'Evening Stroll', badgeEmoji: '🌙', colors: ['#312e81', '#c026d3', '#fbcfe8'], icon: '✨' },
    { slug: 'heart-shaped-lake', name: 'Heart-Shaped Lake', theme: 'Mountain Romance', badgeEmoji: '💖', colors: ['#075985', '#ec4899', '#fce7f3'], icon: '🏔️' },
    { slug: 'wedding-chapel', name: 'Wedding Chapel', theme: 'Fairytale Vows', badgeEmoji: '💍', colors: ['#713f12', '#f59e0b', '#fff7ed'], icon: '⛪' },
    { slug: 'cupid-clouds', name: 'Cupid Clouds', theme: 'Love in the Sky', badgeEmoji: '🏹', colors: ['#0369a1', '#f472b6', '#fdf2f8'], icon: '☁️' }
  ],
  [
    { slug: 'spring-meadow', name: 'Spring Meadow', theme: 'First Bloom', badgeEmoji: '🌱', colors: ['#14532d', '#4ade80', '#fef08a'], icon: '🌼' },
    { slug: 'rainbow-cottage', name: 'Rainbow Cottage', theme: 'April Showers', badgeEmoji: '🌈', colors: ['#075985', '#22c55e', '#facc15'], icon: '🏠' },
    { slug: 'cherry-blossom', name: 'Cherry Blossom', theme: 'Blossom Festival', badgeEmoji: '🌸', colors: ['#4c1d95', '#f472b6', '#fce7f3'], icon: '🌳' },
    { slug: 'garden-pond', name: 'Garden Pond', theme: 'Fresh Waters', badgeEmoji: '🐸', colors: ['#064e3b', '#14b8a6', '#fde68a'], icon: '🪷' },
    { slug: 'butterfly-grove', name: 'Butterfly Grove', theme: 'Spring Wings', badgeEmoji: '🦋', colors: ['#166534', '#f97316', '#fde68a'], icon: '🌿' },
    { slug: 'easter-village', name: 'Easter Village', theme: 'Easter Morning', badgeEmoji: '🐣', colors: ['#713f12', '#facc15', '#dcfce7'], icon: '🥚' },
    { slug: 'rainy-city', name: 'Rainy City', theme: 'Neon Drizzle', badgeEmoji: '☔', colors: ['#1e293b', '#0ea5e9', '#f0abfc'], icon: '🌧️' },
    { slug: 'spring-fair', name: 'Spring Fair', theme: 'Festival Lights', badgeEmoji: '🎡', colors: ['#9f1239', '#f59e0b', '#fef3c7'], icon: '🎠' }
  ],
  [
    { slug: 'maypole-green', name: 'Maypole Green', theme: 'May Day', badgeEmoji: '🎀', colors: ['#166534', '#84cc16', '#fef08a'], icon: '🌳' },
    { slug: 'enchanted-forest', name: 'Enchanted Forest', theme: 'Forest Magic', badgeEmoji: '🧚', colors: ['#052e16', '#16a34a', '#d9f99d'], icon: '🍄' },
    { slug: 'garden-party', name: 'Garden Party', theme: 'Blooming Afternoon', badgeEmoji: '🫖', colors: ['#14532d', '#f43f5e', '#fef3c7'], icon: '🌺' },
    { slug: 'lilac-lane', name: 'Lilac Lane', theme: 'Soft Spring', badgeEmoji: '💜', colors: ['#581c87', '#c084fc', '#f3e8ff'], icon: '🏘️' },
    { slug: 'bees-and-honey', name: 'Bees and Honey', theme: 'Golden Garden', badgeEmoji: '🍯', colors: ['#713f12', '#eab308', '#fef9c3'], icon: '🐝' },
    { slug: 'forest-waterfall', name: 'Forest Waterfall', theme: 'Wild Spring', badgeEmoji: '💧', colors: ['#064e3b', '#0891b2', '#bae6fd'], icon: '🏞️' },
    { slug: 'storybook-garden', name: 'Storybook Garden', theme: 'Fairytale Spring', badgeEmoji: '📖', colors: ['#7c2d12', '#f97316', '#fef3c7'], icon: '📚' },
    { slug: 'mother-daughter-tea', name: 'Tea in Bloom', theme: 'Mother\'s Day', badgeEmoji: '💐', colors: ['#701a75', '#ec4899', '#fce7f3'], icon: '🫖' }
  ],
  [
    { slug: 'sunlit-beach', name: 'Sunlit Beach', theme: 'Summer Shores', badgeEmoji: '☀️', colors: ['#075985', '#06b6d4', '#fef08a'], icon: '🏖️' },
    { slug: 'tropical-cove', name: 'Tropical Cove', theme: 'Island Paradise', badgeEmoji: '🏝️', colors: ['#0369a1', '#06b6d4', '#fef08a'], icon: '⛵' },
    { slug: 'lemonade-stand', name: 'Lemonade Stand', theme: 'Summer Fair', badgeEmoji: '🍋', colors: ['#166534', '#eab308', '#fef9c3'], icon: '🍹' },
    { slug: 'pride-parade', name: 'Pride Parade', theme: 'Color and Joy', badgeEmoji: '🌈', colors: ['#9f1239', '#7c3aed', '#facc15'], icon: '🎈' },
    { slug: 'firefly-evening', name: 'Firefly Evening', theme: 'Midsummer Night', badgeEmoji: '✨', colors: ['#14532d', '#ca8a04', '#fef08a'], icon: '🪲' },
    { slug: 'wildflower-hike', name: 'Wildflower Hike', theme: 'Mountain Summer', badgeEmoji: '🥾', colors: ['#166534', '#f97316', '#fef3c7'], icon: '🥾' },
    { slug: 'fathers-day-lodge', name: 'Lakeside Lodge', theme: 'Father\'s Day', badgeEmoji: '🎣', colors: ['#164e63', '#0e7490', '#fde68a'], icon: '🎣' },
    { slug: 'summer-carnival', name: 'Summer Carnival', theme: 'Bright Nights', badgeEmoji: '🎪', colors: ['#9f1239', '#ea580c', '#fef08a'], icon: '🎠' }
  ],
  [
    { slug: 'independence-fireworks', name: 'Independence Fireworks', theme: 'Summer Celebration', badgeEmoji: '🎆', colors: ['#172554', '#dc2626', '#fef2f2'], icon: '🗽' },
    { slug: 'seaside-boardwalk', name: 'Seaside Boardwalk', theme: 'Ocean Holiday', badgeEmoji: '🎡', colors: ['#075985', '#f97316', '#fef3c7'], icon: '🌊' },
    { slug: 'red-white-blue', name: 'Red, White and Blue', theme: 'Patriotic Picnic', badgeEmoji: '⭐', colors: ['#1e3a8a', '#dc2626', '#f8fafc'], icon: '🇺🇸' },
    { slug: 'coral-reef', name: 'Coral Reef', theme: 'Underwater Summer', badgeEmoji: '🐠', colors: ['#0c4a6e', '#14b8a6', '#fb923c'], icon: '🐚' },
    { slug: 'orchard-sun', name: 'Orchard Sun', theme: 'Summer Harvest', badgeEmoji: '🍎', colors: ['#7c2d12', '#ea580c', '#fef08a'], icon: '🍎' },
    { slug: 'lakehouse-weekend', name: 'Lakehouse Weekend', theme: 'Long Summer Days', badgeEmoji: '🛶', colors: ['#164e63', '#0284c7', '#fde68a'], icon: '🛶' },
    { slug: 'sunflower-field', name: 'Sunflower Field', theme: 'Golden Summer', badgeEmoji: '🌻', colors: ['#365314', '#eab308', '#fef9c3'], icon: '🌻' },
    { slug: 'night-market', name: 'Night Market', theme: 'Lantern Festival', badgeEmoji: '🏮', colors: ['#581c87', '#db2777', '#facc15'], icon: '🏮' }
  ],
  [
    { slug: 'late-summer-camp', name: 'Late Summer Camp', theme: 'Last Campfire', badgeEmoji: '🔥', colors: ['#431407', '#ea580c', '#fde68a'], icon: '🏕️' },
    { slug: 'harvest-orchard', name: 'Harvest Orchard', theme: 'First Harvest', badgeEmoji: '🍎', colors: ['#7c2d12', '#d97706', '#fde68a'], icon: '🍏' },
    { slug: 'sunset-sail', name: 'Sunset Sail', theme: 'Golden Horizon', badgeEmoji: '⛵', colors: ['#7c2d12', '#f97316', '#fef08a'], icon: '⛵' },
    { slug: 'back-to-school', name: 'Back to School', theme: 'New Beginnings', badgeEmoji: '📚', colors: ['#1e3a8a', '#2563eb', '#facc15'], icon: '✏️' },
    { slug: 'lavender-hills', name: 'Lavender Hills', theme: 'Endless Summer', badgeEmoji: '💜', colors: ['#581c87', '#a78bfa', '#fef3c7'], icon: '🌾' },
    { slug: 'county-fair', name: 'County Fair', theme: 'August Nights', badgeEmoji: '🎟️', colors: ['#9f1239', '#f97316', '#fef08a'], icon: '🎪' },
    { slug: 'starry-campground', name: 'Starry Campground', theme: 'Meteor Showers', badgeEmoji: '🌠', colors: ['#172554', '#4338ca', '#facc15'], icon: '🔭' },
    { slug: 'peach-picnic', name: 'Peach Picnic', theme: 'Orchard Days', badgeEmoji: '🍑', colors: ['#9a3412', '#fb923c', '#fef3c7'], icon: '🧺' }
  ],
  [
    { slug: 'autumn-cabin', name: 'Autumn Cabin', theme: 'Mountain Retreat', badgeEmoji: '🍁', colors: ['#7c2d12', '#d97706', '#fde68a'], icon: '🏡' },
    { slug: 'apple-orchard', name: 'Apple Orchard', theme: 'Harvest Season', badgeEmoji: '🍎', colors: ['#7f1d1d', '#ea580c', '#fef08a'], icon: '🍏' },
    { slug: 'pumpkin-patch', name: 'Pumpkin Patch', theme: 'Autumn Harvest', badgeEmoji: '🎃', colors: ['#7c2d12', '#f97316', '#fef3c7'], icon: '🎃' },
    { slug: 'halloween-haunt', name: 'Halloween Haunt', theme: 'Spooky Night', badgeEmoji: '🕸️', colors: ['#18181b', '#7e22ce', '#f97316'], icon: '🦇' },
    { slug: 'harvest-moon', name: 'Harvest Moon', theme: 'October Moonlight', badgeEmoji: '🌕', colors: ['#431407', '#b45309', '#fde68a'], icon: '🌙' },
    { slug: 'maple-lane', name: 'Maple Lane', theme: 'Falling Leaves', badgeEmoji: '🍂', colors: ['#713f12', '#dc2626', '#fbbf24'], icon: '🍁' },
    { slug: 'witches-cottage', name: 'Witch\'s Cottage', theme: 'Enchanted October', badgeEmoji: '🧙', colors: ['#312e81', '#7e22ce', '#a3e635'], icon: '🧹' },
    { slug: 'cozy-bookshop', name: 'Cozy Bookshop', theme: 'Crisp Evenings', badgeEmoji: '📖', colors: ['#451a03', '#92400e', '#fde68a'], icon: '📚' }
  ],
  [
    { slug: 'thanksgiving-table', name: 'Thanksgiving Table', theme: 'Grateful Harvest', badgeEmoji: '🦃', colors: ['#451a03', '#b45309', '#fde68a'], icon: '🍽️' },
    { slug: 'autumn-village', name: 'Autumn Village', theme: 'Golden Leaves', badgeEmoji: '🍂', colors: ['#7c2d12', '#d97706', '#fef3c7'], icon: '🏘️' },
    { slug: 'cranberry-marsh', name: 'Cranberry Marsh', theme: 'November Wetlands', badgeEmoji: '🦆', colors: ['#3f0d12', '#be123c', '#fed7aa'], icon: '🪶' },
    { slug: 'cozy-fireplace', name: 'Cozy Fireplace', theme: 'Warm Indoors', badgeEmoji: '🔥', colors: ['#431407', '#ea580c', '#fde68a'], icon: '🛋️' },
    { slug: 'misty-mountain', name: 'Misty Mountain', theme: 'Quiet November', badgeEmoji: '🌫️', colors: ['#334155', '#64748b', '#cbd5e1'], icon: '🏔️' },
    { slug: 'harvest-market', name: 'Harvest Market', theme: 'Local Bounty', badgeEmoji: '🧺', colors: ['#365314', '#ca8a04', '#fef3c7'], icon: '🥕' },
    { slug: 'first-snow', name: 'First Snow', theme: 'Winter Arrives', badgeEmoji: '❄️', colors: ['#164e63', '#38bdf8', '#f8fafc'], icon: '🌨️' },
    { slug: 'thankful-gathering', name: 'Thankful Gathering', theme: 'Friends and Family', badgeEmoji: '🤎', colors: ['#713f12', '#92400e', '#fed7aa'], icon: '🫶' }
  ],
  [
    { slug: 'christmas-village', name: 'Christmas Village', theme: 'Holiday Lights', badgeEmoji: '🎄', colors: ['#14532d', '#dc2626', '#fef08a'], icon: '🏘️' },
    { slug: 'santas-workshop', name: 'Santa\'s Workshop', theme: 'North Pole', badgeEmoji: '🎅', colors: ['#7f1d1d', '#dc2626', '#fef3c7'], icon: '🎁' },
    { slug: 'hanukkah-lights', name: 'Hanukkah Lights', theme: 'Festival of Lights', badgeEmoji: '🕎', colors: ['#1e3a8a', '#38bdf8', '#fef08a'], icon: '🕎' },
    { slug: 'gingerbread-house', name: 'Gingerbread House', theme: 'Holiday Sweets', badgeEmoji: '🍪', colors: ['#78350f', '#b45309', '#fef3c7'], icon: '🍬' },
    { slug: 'winter-wonderland', name: 'Winter Wonderland', theme: 'Snowy Holiday', badgeEmoji: '⛄', colors: ['#0c4a6e', '#67e8f9', '#f8fafc'], icon: '⛄' },
    { slug: 'holiday-market', name: 'Holiday Market', theme: 'Festive Streets', badgeEmoji: '🎁', colors: ['#064e3b', '#b91c1c', '#facc15'], icon: '🛍️' },
    { slug: 'christmas-morning', name: 'Christmas Morning', theme: 'Cozy Celebration', badgeEmoji: '🎀', colors: ['#14532d', '#b91c1c', '#fef3c7'], icon: '🧦' },
    { slug: 'new-years-eve', name: 'New Year\'s Eve', theme: 'Midnight Countdown', badgeEmoji: '🥂', colors: ['#111827', '#4338ca', '#facc15'], icon: '🎆' }
  ]
];

export function getMonthlyPuzzles(date: Date = new Date()): JigsawPuzzleDef[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  return MONTHLY_THEMES[month].map((theme) => ({
    ...theme,
    id: `${year}-${String(month + 1).padStart(2, '0')}-${theme.slug}`,
    pieceCount: 12,
    piecesPerWin: 4
  }));
}

export const MOBILITYWARE_PUZZLES = getMonthlyPuzzles();

function getPuzzleDefinition(puzzleId: string): JigsawPuzzleDef {
  return MOBILITYWARE_PUZZLES.find(puzzle => puzzle.id === puzzleId)
    || { id: puzzleId, name: 'Legacy Puzzle', theme: 'Classic Collection', badgeEmoji: '🧩', colors: ['#334155', '#64748b', '#cbd5e1'], icon: '🧩', pieceCount: 12, piecesPerWin: 4 };
}

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
    currentPuzzle: MOBILITYWARE_PUZZLES[0].id,
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
    if (!MOBILITYWARE_PUZZLES.some(puzzle => puzzle.id === this.stats.meta.currentPuzzle)) {
      this.stats.meta.currentPuzzle = MOBILITYWARE_PUZZLES[0].id;
    }
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

  public unlockNextPuzzlePiece(
    puzzleId?: string,
    user?: AuthUser | null,
    requestedPieces: number = 1
  ): { unlockedIndex: number | null; completedPuzzle: boolean } {
    const targetId = puzzleId || this.stats.meta.currentPuzzle || 'autumn_cabin';
    const puzzle = getPuzzleDefinition(targetId);
    if (!this.stats.meta.puzzleProgress) {
      this.stats.meta.puzzleProgress = {};
    }
    if (!this.stats.meta.puzzleProgress[targetId]) {
      this.stats.meta.puzzleProgress[targetId] = [];
    }

    const unlocked = this.stats.meta.puzzleProgress[targetId];
    const missing: number[] = [];
    for (let i = 0; i < puzzle.pieceCount; i++) {
      if (!unlocked.includes(i)) missing.push(i);
    }

    if (missing.length === 0) {
      return { unlockedIndex: null, completedPuzzle: false };
    }

    const piecesToUnlock = Math.min(requestedPieces, missing.length);
    const nextPiece = missing[0];
    unlocked.push(...missing.slice(0, piecesToUnlock));
    unlocked.sort((a, b) => a - b);
    this.stats.meta.piecesCollected += piecesToUnlock;

    let completedPuzzle = false;
    if (unlocked.length === puzzle.pieceCount) {
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
  ): { stats: UserStats; xpEarned: number; leveledUp: boolean; unlockedPiece: number | null; unlockedPieceCount: number } {
    this.stats.gamesPlayed++;
    let xpEarned = 0;
    let leveledUp = false;
    let unlockedPiece: number | null = null;
    let unlockedPieceCount = 0;

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
        const puzzleRes = this.unlockNextPuzzlePiece(
          this.stats.meta.currentPuzzle,
          user,
          getPuzzleDefinition(this.stats.meta.currentPuzzle).piecesPerWin
        );
        unlockedPiece = puzzleRes.unlockedIndex;
        unlockedPieceCount = puzzleRes.unlockedIndex === null ? 0 : getPuzzleDefinition(this.stats.meta.currentPuzzle).piecesPerWin;
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
    return { stats: this.getStats(), xpEarned, leveledUp, unlockedPiece, unlockedPieceCount };
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
