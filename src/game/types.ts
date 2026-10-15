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
  scoreChange: number;
  stockRecycled?: boolean;
}

export type DrawMode = 1 | 3;

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
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  bestScore: number;
  bestTime: number | null; // seconds
}

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  provider: 'google' | 'github' | 'guest';
}
