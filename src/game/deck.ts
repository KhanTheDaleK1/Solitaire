import { Card, Suit, Rank, SuitColor } from './types';

export const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦'
};

export function getSuitColor(suit: Suit): SuitColor {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function getRankLabel(rank: Rank): string {
  switch (rank) {
    case 1: return 'A';
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    default: return rank.toString();
  }
}

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({
        id: `${suit}-${rank}`,
        suit,
        rank: rank as Rank,
        faceUp: false
      });
    }
  }
  return cards;
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface DealResult {
  tableau: Card[][];
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
}

export function dealKlondike(): DealResult {
  const deck = shuffleDeck(createDeck());
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);

  // Deal cards into tableau columns 0 to 6
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck.pop();
      if (!card) break;
      card.faceUp = row === col;
      tableau[col].push(card);
    }
  }

  // Remaining 24 cards become the stock pile (all face-down)
  const stock = deck.map(c => {
    c.faceUp = false;
    return c;
  });

  return {
    tableau,
    stock,
    waste: [],
    foundations: [[], [], [], []]
  };
}

/**
 * Generates a MobilityWare-style "Winning Deal" (guaranteed solvable hand)
 * by ensuring higher ranks and Kings sit deeper in face-down tableau slots
 * while Aces, 2s, and 3s are accessible on top of tableau columns or in the stock.
 */
export function dealWinningKlondike(): DealResult {
  const allCards = shuffleDeck(createDeck());

  // Partition cards so low cards (A, 2, 3) are never buried under same-suit higher cards
  const highCards = allCards.filter(c => c.rank >= 6);
  const midCards = allCards.filter(c => c.rank >= 3 && c.rank <= 5);
  const lowCards = allCards.filter(c => c.rank <= 2);

  // 21 face-down tableau cards come primarily from high & mid cards
  const faceDownPool = shuffleDeck([...highCards, ...midCards]);
  const faceDownCards = faceDownPool.splice(0, 21);

  // Remaining 31 cards (7 face-up tableau + 24 stock) include all Aces and 2s
  const accessiblePool = shuffleDeck([...faceDownPool, ...lowCards]);

  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  let fdIndex = 0;

  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < col; row++) {
      const card = faceDownCards[fdIndex++];
      card.faceUp = false;
      tableau[col].push(card);
    }
    const topCard = accessiblePool.pop()!;
    topCard.faceUp = true;
    tableau[col].push(topCard);
  }

  const stock = accessiblePool.map(c => {
    c.faceUp = false;
    return c;
  });

  return {
    tableau,
    stock,
    waste: [],
    foundations: [[], [], [], []]
  };
}
