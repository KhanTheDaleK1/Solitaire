import { Card } from './types';
import { createDeck } from './deck';

/**
 * Deterministic 32-bit PRNG for Daily Challenges (Mulberry32).
 */
export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296.0;
  }

  public randbelow(n: number): number {
    return Math.floor(this.nextFloat() * n);
  }

  public shuffle<T>(seq: T[]): T[] {
    const arr = [...seq];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.randbelow(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/**
 * Converts a YYYY-MM-DD or Date object into a deterministic numeric seed (e.g. 20261019)
 */
export function getDateSeed(dateStr?: string): number {
  if (dateStr) {
    const clean = dateStr.replace(/[^0-9]/g, '');
    return parseInt(clean, 10);
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return parseInt(`${y}${m}${d}`, 10);
}

/**
 * Formats a Date to "YYYY-MM-DD"
 */
export function formatDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Generates deterministic Klondike Solitaire deal for a given calendar date
 */
export function dealDailyChallenge(dateStr?: string) {
  const seed = getDateSeed(dateStr);
  const prng = new Mulberry32(seed);
  const deck = prng.shuffle(createDeck());

  const tableau: Card[][] = Array.from({ length: 7 }, () => []);

  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck.pop()!;
      card.faceUp = row === col;
      tableau[col].push(card);
    }
  }

  const stock = deck.map((c) => {
    c.faceUp = false;
    return c;
  });

  return {
    tableau,
    stock,
    waste: [],
    foundations: [[], [], [], []],
    seed,
    dateStr: dateStr || formatDate()
  };
}
