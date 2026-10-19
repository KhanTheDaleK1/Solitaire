export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds';
export type SuitColor = 'red' | 'black';

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string; // e.g. "hearts-13"
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau';

export interface PileLocation {
  type: PileType;
  index: number; // 0-3 for foundations, 0-6 for tableau, 0 for stock/waste
}

export interface CardMove {
  cards: Card[];
  from: PileLocation;
  to: PileLocation;
  cardFlipped: boolean;
  flippedCardId?: string;
  scoreChange: number;
  stockRecycled?: boolean;
  wasteIndex?: number;
  tableauRowIndex?: number;
}

export type DrawMode = 1 | 3;
export type ScoringMode = 'standard' | 'vegas';

export interface LastActionAnimation {
  type: 'deal' | 'draw' | 'recycle' | 'move' | 'undo';
  flippedCardIds: string[];
  movedCardIds: string[];
  targetPile?: PileLocation;
  timestamp: number;
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][]; // 4 suit foundations: [spades, hearts, clubs, diamonds]
  tableau: Card[][];     // 7 tableau columns
  history: CardMove[];
  score: number;
  moves: number;
  startTime: number | null;
  elapsedTime: number; // in seconds
  isWon: boolean;
  isStarted: boolean;
  drawMode: DrawMode;
  scoringMode: ScoringMode;
  isWinningDeal: boolean;
  isDailyChallenge?: boolean;
  dailyDate?: string; // YYYY-MM-DD
  stockPasses: number;
  lastAction?: LastActionAnimation;
}

export interface MonthCrownData {
  daysCompleted: number[];
  trophyUnlocked: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
}

export interface MetaProgression {
  level: number;
  totalStars: number;
  starsToNextLevel: number;
  currentPuzzle: string;
  piecesCollected: number;
  puzzlesCompleted: number;
  badgesEarned: number;
  puzzleProgress?: Record<string, number[]>; // puzzleId -> array of unlocked piece indices (0..15)
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  bestScore: number;
  bestTime: number | null; // seconds
  crowns: Record<string, MonthCrownData>; // e.g. "2026-10": {...}
  meta: MetaProgression;
}

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  provider: 'google' | 'github' | 'guest';
}
