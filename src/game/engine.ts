import { Card, GameState, PileLocation, CardMove, DrawMode } from './types';
import { dealKlondike, getSuitColor } from './deck';

export class SolitaireEngine {
  public state: GameState;
  private onStateChange?: (state: GameState) => void;

  constructor(drawMode: DrawMode = 1) {
    this.state = this.createNewGame(drawMode);
  }

  public subscribe(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
    callback(this.state);
  }

  private notify(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  public createNewGame(drawMode: DrawMode = this.state?.drawMode || 1): GameState {
    const deal = dealKlondike();
    this.state = {
      stock: deal.stock,
      waste: deal.waste,
      foundations: deal.foundations,
      tableau: deal.tableau,
      history: [],
      score: 0,
      moves: 0,
      startTime: null,
      elapsedTime: 0,
      isWon: false,
      isStarted: false,
      drawMode
    };
    this.notify();
    return this.state;
  }

  public startTimer(): void {
    if (!this.state.isStarted) {
      this.state.isStarted = true;
      this.state.startTime = Date.now();
    }
  }

  // Draw card(s) from Stock to Waste
  public drawCards(): boolean {
    this.startTimer();
    const count = this.state.drawMode;

    if (this.state.stock.length === 0) {
      if (this.state.waste.length === 0) {
        return false;
      }
      // Recycle waste into stock (reversed, face-down)
      const recycledCards = [...this.state.waste].reverse().map(c => {
        c.faceUp = false;
        return c;
      });

      const move: CardMove = {
        cards: [...this.state.waste],
        from: { type: 'waste', index: 0 },
        to: { type: 'stock', index: 0 },
        cardFlipped: false,
        scoreChange: this.state.drawMode === 1 ? -100 : -20, // standard recycle penalty
        stockRecycled: true
      };

      this.state.stock = recycledCards;
      this.state.waste = [];
      this.state.score = Math.max(0, this.state.score + move.scoreChange);
      this.state.moves++;
      this.state.history.push(move);
      this.notify();
      return true;
    }

    const drawn: Card[] = [];
    const drawCount = Math.min(count, this.state.stock.length);
    for (let i = 0; i < drawCount; i++) {
      const card = this.state.stock.pop()!;
      card.faceUp = true;
      drawn.push(card);
    }

    this.state.waste.push(...drawn);
    this.state.moves++;

    this.state.history.push({
      cards: drawn,
      from: { type: 'stock', index: 0 },
      to: { type: 'waste', index: 0 },
      cardFlipped: false,
      scoreChange: 0
    });

    this.notify();
    return true;
  }

  // Check if moving cards onto target tableau column is legal
  public isValidTableauMove(cards: Card[], colIndex: number): boolean {
    if (cards.length === 0) return false;
    const targetCol = this.state.tableau[colIndex];
    const movingCard = cards[0];

    if (targetCol.length === 0) {
      // Only a King (rank 13) can be placed on an empty column
      return movingCard.rank === 13;
    }

    const topCard = targetCol[targetCol.length - 1];
    if (!topCard.faceUp) return false;

    // Must be descending rank and alternating suit color
    const isRankDescending = topCard.rank === movingCard.rank + 1;
    const isOppositeColor = getSuitColor(topCard.suit) !== getSuitColor(movingCard.suit);

    return isRankDescending && isOppositeColor;
  }

  // Check if moving card onto foundation pile is legal
  public isValidFoundationMove(card: Card, foundationIndex: number): boolean {
    const pile = this.state.foundations[foundationIndex];

    if (pile.length === 0) {
      // Must start with Ace (rank 1)
      return card.rank === 1;
    }

    const topCard = pile[pile.length - 1];
    // Same suit and rank increment of +1
    return topCard.suit === card.suit && card.rank === topCard.rank + 1;
  }

  // Execute a valid card move
  public moveCards(cards: Card[], from: PileLocation, to: PileLocation): boolean {
    this.startTimer();
    let scoreChange = 0;
    let cardFlipped = false;

    // Validate destination
    if (to.type === 'foundation') {
      if (cards.length !== 1 || !this.isValidFoundationMove(cards[0], to.index)) {
        return false;
      }
      scoreChange += 10;
    } else if (to.type === 'tableau') {
      if (!this.isValidTableauMove(cards, to.index)) {
        return false;
      }
      if (from.type === 'waste') {
        scoreChange += 5;
      } else if (from.type === 'foundation') {
        scoreChange -= 15;
      }
    } else {
      return false;
    }

    // Remove cards from source
    if (from.type === 'waste') {
      this.state.waste.splice(this.state.waste.length - cards.length, cards.length);
    } else if (from.type === 'tableau') {
      const sourceCol = this.state.tableau[from.index];
      sourceCol.splice(sourceCol.length - cards.length, cards.length);
      // Flip up the new top card if face-down
      if (sourceCol.length > 0 && !sourceCol[sourceCol.length - 1].faceUp) {
        sourceCol[sourceCol.length - 1].faceUp = true;
        cardFlipped = true;
        scoreChange += 5;
      }
    } else if (from.type === 'foundation') {
      this.state.foundations[from.index].pop();
    }

    // Add cards to destination
    if (to.type === 'foundation') {
      this.state.foundations[to.index].push(cards[0]);
    } else if (to.type === 'tableau') {
      this.state.tableau[to.index].push(...cards);
    }

    this.state.score = Math.max(0, this.state.score + scoreChange);
    this.state.moves++;

    this.state.history.push({
      cards,
      from,
      to,
      cardFlipped,
      scoreChange
    });

    this.checkWinCondition();
    this.notify();
    return true;
  }

  // Quick move / tap on card: automatically finds best legal destination
  public tryAutoMove(card: Card, from: PileLocation): boolean {
    if (!card.faceUp) return false;

    // First, try foundation if it's the top card of its pile
    let isTopCard = false;
    if (from.type === 'waste') {
      isTopCard = this.state.waste[this.state.waste.length - 1]?.id === card.id;
    } else if (from.type === 'tableau') {
      isTopCard = this.state.tableau[from.index][this.state.tableau[from.index].length - 1]?.id === card.id;
    }

    if (isTopCard) {
      for (let f = 0; f < 4; f++) {
        if (this.isValidFoundationMove(card, f)) {
          return this.moveCards([card], from, { type: 'foundation', index: f });
        }
      }
    }

    // If not foundation or foundation not valid, try tableau
    if (from.type === 'waste' || from.type === 'tableau') {
      let cardsToMove: Card[] = [];
      if (from.type === 'waste') {
        cardsToMove = [card];
      } else {
        const col = this.state.tableau[from.index];
        const cardIdx = col.findIndex(c => c.id === card.id);
        if (cardIdx === -1) return false;
        cardsToMove = col.slice(cardIdx);
      }

      // Find valid tableau columns
      for (let colIdx = 0; colIdx < 7; colIdx++) {
        if (from.type === 'tableau' && colIdx === from.index) continue;
        if (this.isValidTableauMove(cardsToMove, colIdx)) {
          // If it's a King on an empty column and already at bottom of its column, skip redundant move
          if (cardsToMove[0].rank === 13 && this.state.tableau[colIdx].length === 0 && from.type === 'tableau') {
            const currentCol = this.state.tableau[from.index];
            if (currentCol.findIndex(c => c.id === card.id) === 0) {
              continue;
            }
          }
          return this.moveCards(cardsToMove, from, { type: 'tableau', index: colIdx });
        }
      }
    }

    return false;
  }

  // Undo the last move
  public undo(): boolean {
    if (this.state.history.length === 0) return false;
    const lastMove = this.state.history.pop()!;

    if (lastMove.stockRecycled) {
      // Revert stock recycle
      this.state.waste = [...this.state.stock].reverse().map(c => {
        c.faceUp = true;
        return c;
      });
      this.state.stock = [];
    } else if (lastMove.from.type === 'stock' && lastMove.to.type === 'waste') {
      // Revert draw from stock
      const drawnCards = lastMove.cards;
      for (let i = 0; i < drawnCards.length; i++) {
        const c = this.state.waste.pop();
        if (c) {
          c.faceUp = false;
          this.state.stock.push(c);
        }
      }
    } else {
      // Revert card move from `to` back to `from`
      const cards = lastMove.cards;

      // Remove from destination
      if (lastMove.to.type === 'foundation') {
        this.state.foundations[lastMove.to.index].pop();
      } else if (lastMove.to.type === 'tableau') {
        const targetCol = this.state.tableau[lastMove.to.index];
        targetCol.splice(targetCol.length - cards.length, cards.length);
      }

      // If a card was flipped up in the source column, flip it back down
      if (lastMove.cardFlipped && lastMove.from.type === 'tableau') {
        const sourceCol = this.state.tableau[lastMove.from.index];
        if (sourceCol.length > 0) {
          sourceCol[sourceCol.length - 1].faceUp = false;
        }
      }

      // Restore to source
      if (lastMove.from.type === 'waste') {
        this.state.waste.push(...cards);
      } else if (lastMove.from.type === 'tableau') {
        this.state.tableau[lastMove.from.index].push(...cards);
      } else if (lastMove.from.type === 'foundation') {
        this.state.foundations[lastMove.from.index].push(...cards);
      }
    }

    this.state.score = Math.max(0, this.state.score - lastMove.scoreChange);
    this.state.moves = Math.max(0, this.state.moves - 1);
    this.state.isWon = false;
    this.notify();
    return true;
  }

  // Hint solver: finds one high-value legal move
  public getHint(): { cards: Card[]; from: PileLocation; to: PileLocation } | null {
    // 1. Check waste to foundation
    if (this.state.waste.length > 0) {
      const topWaste = this.state.waste[this.state.waste.length - 1];
      for (let f = 0; f < 4; f++) {
        if (this.isValidFoundationMove(topWaste, f)) {
          return { cards: [topWaste], from: { type: 'waste', index: 0 }, to: { type: 'foundation', index: f } };
        }
      }
    }

    // 2. Check tableau to foundation
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const col = this.state.tableau[colIdx];
      if (col.length > 0) {
        const topCard = col[col.length - 1];
        if (topCard.faceUp) {
          for (let f = 0; f < 4; f++) {
            if (this.isValidFoundationMove(topCard, f)) {
              return { cards: [topCard], from: { type: 'tableau', index: colIdx }, to: { type: 'foundation', index: f } };
            }
          }
        }
      }
    }

    // 3. Check tableau to tableau moves that reveal a face-down card
    for (let srcCol = 0; srcCol < 7; srcCol++) {
      const col = this.state.tableau[srcCol];
      // Find first face-up card
      const firstFaceUpIdx = col.findIndex(c => c.faceUp);
      if (firstFaceUpIdx > 0) {
        const movingStack = col.slice(firstFaceUpIdx);
        for (let destCol = 0; destCol < 7; destCol++) {
          if (srcCol === destCol) continue;
          if (this.isValidTableauMove(movingStack, destCol)) {
            return { cards: movingStack, from: { type: 'tableau', index: srcCol }, to: { type: 'tableau', index: destCol } };
          }
        }
      }
    }

    // 4. Check waste to tableau
    if (this.state.waste.length > 0) {
      const topWaste = this.state.waste[this.state.waste.length - 1];
      for (let destCol = 0; destCol < 7; destCol++) {
        if (this.isValidTableauMove([topWaste], destCol)) {
          return { cards: [topWaste], from: { type: 'waste', index: 0 }, to: { type: 'tableau', index: destCol } };
        }
      }
    }

    // 5. Any other tableau to tableau move
    for (let srcCol = 0; srcCol < 7; srcCol++) {
      const col = this.state.tableau[srcCol];
      const faceUpCards = col.filter(c => c.faceUp);
      if (faceUpCards.length > 0) {
        for (let i = 0; i < faceUpCards.length; i++) {
          const movingStack = faceUpCards.slice(i);
          // Don't move a King if it's already at the base of an empty column
          if (movingStack[0].rank === 13 && col.findIndex(c => c.id === movingStack[0].id) === 0) {
            continue;
          }
          for (let destCol = 0; destCol < 7; destCol++) {
            if (srcCol === destCol) continue;
            if (this.isValidTableauMove(movingStack, destCol)) {
              return { cards: movingStack, from: { type: 'tableau', index: srcCol }, to: { type: 'tableau', index: destCol } };
            }
          }
        }
      }
    }

    return null;
  }

  // Check if auto-finish is available (all cards revealed and stock/waste empty)
  public canAutoFinish(): boolean {
    if (this.state.stock.length > 0 || this.state.waste.length > 0) {
      return false;
    }
    // Check if any face-down cards remain in tableau
    for (const col of this.state.tableau) {
      if (col.some(card => !card.faceUp)) {
        return false;
      }
    }
    return !this.state.isWon;
  }

  // Run a single auto-finish step
  public autoFinishStep(): boolean {
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const col = this.state.tableau[colIdx];
      if (col.length > 0) {
        const card = col[col.length - 1];
        for (let f = 0; f < 4; f++) {
          if (this.isValidFoundationMove(card, f)) {
            return this.moveCards([card], { type: 'tableau', index: colIdx }, { type: 'foundation', index: f });
          }
        }
      }
    }
    return false;
  }

  // Win condition: All 4 foundations have 13 cards (total 52)
  public checkWinCondition(): boolean {
    const totalFoundationCards = this.state.foundations.reduce((acc, f) => acc + f.length, 0);
    if (totalFoundationCards === 52) {
      this.state.isWon = true;
      return true;
    }
    return false;
  }
}
