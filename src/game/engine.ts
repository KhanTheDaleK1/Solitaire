import { Card, GameState, PileLocation, CardMove, DrawMode, ScoringMode } from './types';
import { createDeck, dealKlondike, dealWinningKlondike, getSuitColor, SUITS } from './deck';
import { dealDailyChallenge, formatDate } from './dailyChallenge';

export class SolitaireEngine {
  public state: GameState;
  private onStateChange?: (state: GameState) => void;
  private initialDeal?: { stock: Card[]; tableau: Card[][] };

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

  public createNewGame(
    drawMode: DrawMode = this.state?.drawMode || 1,
    isDailyChallenge: boolean = false,
    dailyDate?: string,
    isWinningDeal: boolean = this.state?.isWinningDeal ?? true,
    scoringMode: ScoringMode = this.state?.scoringMode || 'standard'
  ): GameState {
    const deal = isDailyChallenge
      ? dealDailyChallenge(dailyDate)
      : isWinningDeal
      ? dealWinningKlondike()
      : dealKlondike();

    this.initialDeal = {
      stock: deal.stock.map(c => ({ ...c })),
      tableau: deal.tableau.map(col => col.map(c => ({ ...c })))
    };

    const topTableauIds = deal.tableau
      .map(col => col[col.length - 1]?.id)
      .filter((id): id is string => Boolean(id));

    this.state = {
      stock: deal.stock,
      waste: deal.waste,
      foundations: deal.foundations,
      tableau: deal.tableau,
      history: [],
      score: scoringMode === 'vegas' ? -52 : 0,
      moves: 0,
      startTime: null,
      elapsedTime: 0,
      isWon: false,
      isStarted: false,
      drawMode,
      scoringMode,
      isWinningDeal,
      isDailyChallenge,
      dailyDate: isDailyChallenge ? (dailyDate || formatDate()) : undefined,
      stockPasses: 0,
      lastAction: {
        type: 'deal',
        flippedCardIds: topTableauIds,
        movedCardIds: [],
        timestamp: Date.now()
      }
    };
    this.notify();
    return this.state;
  }

  public restartCurrentDeal(): GameState {
    if (!this.initialDeal) {
      return this.createNewGame(this.state.drawMode, this.state.isDailyChallenge, this.state.dailyDate, this.state.isWinningDeal, this.state.scoringMode);
    }
    const stock = this.initialDeal.stock.map(c => ({ ...c, faceUp: false }));
    const tableau = this.initialDeal.tableau.map(col =>
      col.map((c, idx) => ({ ...c, faceUp: idx === col.length - 1 }))
    );
    const topTableauIds = tableau
      .map(col => col[col.length - 1]?.id)
      .filter((id): id is string => Boolean(id));

    this.state = {
      ...this.state,
      stock,
      waste: [],
      foundations: [[], [], [], []],
      tableau,
      history: [],
      score: this.state.scoringMode === 'vegas' ? -52 : 0,
      moves: 0,
      startTime: null,
      elapsedTime: 0,
      isWon: false,
      isStarted: false,
      stockPasses: 0,
      lastAction: {
        type: 'deal',
        flippedCardIds: topTableauIds,
        movedCardIds: [],
        timestamp: Date.now()
      }
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

      // Vegas mode pass limit check (1 pass for Draw 1, 3 passes for Draw 3)
      if (this.state.scoringMode === 'vegas') {
        const maxPasses = this.state.drawMode === 1 ? 0 : 2;
        if (this.state.stockPasses >= maxPasses) {
          return false;
        }
      }

      // Recycle waste into stock (reversed, face-down)
      const recycledCards = [...this.state.waste].reverse().map(c => {
        c.faceUp = false;
        return c;
      });

      const scoreChange = this.state.scoringMode === 'vegas'
        ? 0
        : (this.state.drawMode === 1 ? -100 : -20);

      const move: CardMove = {
        cards: [...this.state.waste],
        from: { type: 'waste', index: 0 },
        to: { type: 'stock', index: 0 },
        cardFlipped: false,
        scoreChange,
        stockRecycled: true
      };

      this.state.stock = recycledCards;
      this.state.waste = [];
      if (this.state.scoringMode === 'standard') {
        this.state.score = Math.max(0, this.state.score + move.scoreChange);
      }
      this.state.stockPasses++;
      this.state.moves++;
      this.state.history.push(move);
      this.state.lastAction = {
        type: 'recycle',
        flippedCardIds: [],
        movedCardIds: recycledCards.map(c => c.id),
        timestamp: Date.now()
      };
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

    this.state.lastAction = {
      type: 'draw',
      flippedCardIds: drawn.map(c => c.id),
      movedCardIds: drawn.map(c => c.id),
      targetPile: { type: 'waste', index: 0 },
      timestamp: Date.now()
    };

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
    if (!pile) return false;

    // Never allow a card that is already in a foundation pile to be placed again
    for (const f of this.state.foundations) {
      if (f.some(c => c.id === card.id)) {
        return false;
      }
    }

    if (pile.length === 0) {
      // Must start with Ace (rank 1), and no other foundation should already hold this suit
      if (card.rank !== 1) return false;
      const suitAlreadyStarted = this.state.foundations.some(f => f.length > 0 && f[0].suit === card.suit);
      return !suitAlreadyStarted;
    }

    const topCard = pile[pile.length - 1];
    // Same suit and rank increment of +1
    return topCard.suit === card.suit && card.rank === topCard.rank + 1;
  }

  // Finds the best foundation index for a card, preferring the matching suit slot for Aces
  public findBestFoundationIndex(card: Card): number {
    if (card.rank === 1) {
      const preferredIdx = SUITS.indexOf(card.suit);
      if (preferredIdx >= 0 && this.isValidFoundationMove(card, preferredIdx)) {
        return preferredIdx;
      }
    }
    for (let f = 0; f < 4; f++) {
      if (this.isValidFoundationMove(card, f)) {
        return f;
      }
    }
    return -1;
  }

  // Execute a valid card move with strict source & destination verification
  public moveCards(cards: Card[], from: PileLocation, to: PileLocation): boolean {
    if (!cards || cards.length === 0) return false;
    if (from.type === to.type && from.index === to.index) return false;

    // 1. Strictly verify that `cards` are currently at the top/end of the `from` pile
    if (from.type === 'waste') {
      if (cards.length !== 1 || this.state.waste.length === 0) return false;
      const topWaste = this.state.waste[this.state.waste.length - 1];
      if (!topWaste || topWaste.id !== cards[0].id) return false;
    } else if (from.type === 'tableau') {
      const sourceCol = this.state.tableau[from.index];
      if (!sourceCol || sourceCol.length < cards.length) return false;
      const startIdx = sourceCol.length - cards.length;
      for (let i = 0; i < cards.length; i++) {
        const colCard = sourceCol[startIdx + i];
        if (!colCard || colCard.id !== cards[i].id || !colCard.faceUp) {
          return false;
        }
      }
      // Verify multi-card stack integrity
      for (let i = 0; i < cards.length - 1; i++) {
        if (
          cards[i].rank !== cards[i + 1].rank + 1 ||
          getSuitColor(cards[i].suit) === getSuitColor(cards[i + 1].suit)
        ) {
          return false;
        }
      }
    } else if (from.type === 'foundation') {
      const sourcePile = this.state.foundations[from.index];
      if (cards.length !== 1 || !sourcePile || sourcePile.length === 0) return false;
      const topFound = sourcePile[sourcePile.length - 1];
      if (!topFound || topFound.id !== cards[0].id) return false;
    } else {
      return false;
    }

    this.startTimer();
    let scoreChange = 0;
    let cardFlipped = false;
    let flippedCardId: string | undefined;

    // 2. Validate destination
    if (to.type === 'foundation') {
      if (cards.length !== 1 || !this.isValidFoundationMove(cards[0], to.index)) {
        return false;
      }
      scoreChange += this.state.scoringMode === 'vegas' ? 5 : 10;
    } else if (to.type === 'tableau') {
      if (!this.isValidTableauMove(cards, to.index)) {
        return false;
      }
      if (this.state.scoringMode === 'standard') {
        if (from.type === 'waste') {
          scoreChange += 5;
        } else if (from.type === 'foundation') {
          scoreChange -= 15;
        }
      } else {
        if (from.type === 'foundation') {
          scoreChange -= 5;
        }
      }
    } else {
      return false;
    }

    // 3. Remove cards from source
    if (from.type === 'waste') {
      this.state.waste.pop();
    } else if (from.type === 'tableau') {
      const sourceCol = this.state.tableau[from.index];
      sourceCol.splice(sourceCol.length - cards.length, cards.length);
      // Flip up the new top card if face-down
      if (sourceCol.length > 0 && !sourceCol[sourceCol.length - 1].faceUp) {
        const revealedCard = sourceCol[sourceCol.length - 1];
        revealedCard.faceUp = true;
        cardFlipped = true;
        flippedCardId = revealedCard.id;
        if (this.state.scoringMode === 'standard') {
          scoreChange += 5;
        }
      }
    } else if (from.type === 'foundation') {
      this.state.foundations[from.index].pop();
    }

    // 4. Add cards to destination
    if (to.type === 'foundation') {
      this.state.foundations[to.index].push(cards[0]);
    } else if (to.type === 'tableau') {
      this.state.tableau[to.index].push(...cards);
    }

    if (this.state.scoringMode === 'standard') {
      this.state.score = Math.max(0, this.state.score + scoreChange);
    } else {
      this.state.score += scoreChange;
    }
    this.state.moves++;

    this.state.history.push({
      cards,
      from,
      to,
      cardFlipped,
      flippedCardId,
      scoreChange
    });

    this.state.lastAction = {
      type: 'move',
      flippedCardIds: flippedCardId ? [flippedCardId] : [],
      movedCardIds: cards.map(c => c.id),
      targetPile: to,
      timestamp: Date.now()
    };

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
      if (!isTopCard) return false;
    } else if (from.type === 'tableau') {
      const col = this.state.tableau[from.index];
      if (!col || !col.some(c => c.id === card.id)) return false;
      isTopCard = col[col.length - 1]?.id === card.id;
    } else {
      return false;
    }

    if (isTopCard) {
      const fIdx = this.findBestFoundationIndex(card);
      if (fIdx !== -1) {
        return this.moveCards([card], from, { type: 'foundation', index: fIdx });
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
      this.state.stockPasses = Math.max(0, this.state.stockPasses - 1);
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
        if (lastMove.wasteIndex !== undefined && lastMove.wasteIndex <= this.state.waste.length) {
          this.state.waste.splice(lastMove.wasteIndex, 0, ...cards);
        } else {
          this.state.waste.push(...cards);
        }
      } else if (lastMove.from.type === 'tableau') {
        const sourceCol = this.state.tableau[lastMove.from.index];
        if (lastMove.tableauRowIndex !== undefined && lastMove.tableauRowIndex <= sourceCol.length) {
          sourceCol.splice(lastMove.tableauRowIndex, 0, ...cards);
        } else {
          sourceCol.push(...cards);
        }
      } else if (lastMove.from.type === 'foundation') {
        this.state.foundations[lastMove.from.index].push(...cards);
      }
    }

    if (this.state.scoringMode === 'standard') {
      this.state.score = Math.max(0, this.state.score - lastMove.scoreChange);
    } else {
      this.state.score -= lastMove.scoreChange;
    }
    this.state.moves = Math.max(0, this.state.moves - 1);
    this.state.isWon = false;
    this.state.lastAction = {
      type: 'undo',
      flippedCardIds: [],
      movedCardIds: lastMove.cards.map(c => c.id),
      timestamp: Date.now()
    };
    this.notify();
    return true;
  }

  // Hint solver: finds one high-value legal move
  public getHint(): { cards: Card[]; from: PileLocation; to: PileLocation } | null {
    // 1. Check waste to foundation
    if (this.state.waste.length > 0) {
      const topWaste = this.state.waste[this.state.waste.length - 1];
      const fIdx = this.findBestFoundationIndex(topWaste);
      if (fIdx !== -1) {
        return { cards: [topWaste], from: { type: 'waste', index: 0 }, to: { type: 'foundation', index: fIdx } };
      }
    }

    // 2. Check tableau to foundation
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const col = this.state.tableau[colIdx];
      if (col.length > 0) {
        const topCard = col[col.length - 1];
        if (topCard.faceUp) {
          const fIdx = this.findBestFoundationIndex(topCard);
          if (fIdx !== -1) {
            return { cards: [topCard], from: { type: 'tableau', index: colIdx }, to: { type: 'foundation', index: fIdx } };
          }
        }
      }
    }

    // 3. Check tableau to tableau moves that reveal a face-down card
    for (let srcCol = 0; srcCol < 7; srcCol++) {
      const col = this.state.tableau[srcCol];
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

  // Check if auto-finish is available (stock stack is empty and all tableau cards have been flipped face-up)
  public canAutoFinish(): boolean {
    if (this.state.isWon) {
      return false;
    }
    if (this.state.stock.length > 0) {
      return false;
    }
    for (const col of this.state.tableau) {
      if (col.some(card => !card.faceUp)) {
        return false;
      }
    }
    const totalFoundationCards = this.state.foundations.reduce((acc, f) => acc + f.length, 0);
    return totalFoundationCards < 52;
  }

  /**
   * Ensures all 52 deck cards are uniquely accounted for without duplicates when auto-finishing.
   * If a duplicate card exists in tableau/waste that is already in foundations, removes the duplicate;
   * if any card was lost, restores it so auto-finish can never deadlock.
   */
  private reconcileDeckState(): void {
    const seenIds = new Set<string>();

    // 1. Validate foundations first (strictly sequential 1..k per suit)
    for (let f = 0; f < 4; f++) {
      const pile = this.state.foundations[f];
      const validPile: Card[] = [];
      for (const card of pile) {
        const expectedRank = validPile.length + 1;
        const expectedSuit = validPile.length === 0 ? card.suit : validPile[0].suit;
        if (card.rank === expectedRank && card.suit === expectedSuit && !seenIds.has(card.id)) {
          card.faceUp = true;
          validPile.push(card);
          seenIds.add(card.id);
        }
      }
      this.state.foundations[f] = validPile;
    }

    // 2. Deduplicate tableau columns against foundations & earlier columns
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      this.state.tableau[colIdx] = this.state.tableau[colIdx].filter(card => {
        if (seenIds.has(card.id)) return false;
        seenIds.add(card.id);
        return true;
      });
    }

    // 3. Deduplicate waste pile
    this.state.waste = this.state.waste.filter(card => {
      if (seenIds.has(card.id)) return false;
      seenIds.add(card.id);
      return true;
    });

    // 4. Deduplicate stock pile
    this.state.stock = this.state.stock.filter(card => {
      if (seenIds.has(card.id)) return false;
      seenIds.add(card.id);
      return true;
    });

    // 5. If any of the 52 canonical cards is missing, restore it to waste face-up so the game never freezes
    if (seenIds.size < 52) {
      const fullDeck = createDeck();
      for (const canonical of fullDeck) {
        if (!seenIds.has(canonical.id)) {
          canonical.faceUp = true;
          this.state.waste.push(canonical);
          seenIds.add(canonical.id);
        }
      }
    }
  }

  // Run a single auto-finish step: strictly moves the globally lowest-rank eligible card across all piles
  public autoFinishStep(): boolean {
    this.reconcileDeckState();

    interface AutoFinishCandidate {
      card: Card;
      from: PileLocation;
      foundationIdx: number;
      priority: number; // 0 = exposed tableau/waste top, 1 = deeper waste, 2 = deeper tableau
      wasteArrayIdx?: number;
      tableauRowIdx?: number;
    }

    let best: AutoFinishCandidate | null = null;

    const consider = (candidate: AutoFinishCandidate) => {
      if (
        !best ||
        candidate.card.rank < best.card.rank ||
        (candidate.card.rank === best.card.rank && candidate.priority < best.priority)
      ) {
        best = candidate;
      }
    };

    // 1. Check exposed top waste card (priority 0)
    if (this.state.waste.length > 0) {
      const topIdx = this.state.waste.length - 1;
      const topWaste = this.state.waste[topIdx];
      const fIdx = this.findBestFoundationIndex(topWaste);
      if (fIdx !== -1) {
        consider({
          card: topWaste,
          from: { type: 'waste', index: 0 },
          foundationIdx: fIdx,
          priority: 0
        });
      }
    }

    // 2. Check exposed bottom card of each tableau column (priority 0)
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const col = this.state.tableau[colIdx];
      if (col.length > 0) {
        const card = col[col.length - 1];
        const fIdx = this.findBestFoundationIndex(card);
        if (fIdx !== -1) {
          consider({
            card,
            from: { type: 'tableau', index: colIdx },
            foundationIdx: fIdx,
            priority: 0
          });
        }
      }
    }

    // 3. Check deeper cards in waste pile (priority 1) so low cards in waste are never skipped
    for (let wIdx = this.state.waste.length - 2; wIdx >= 0; wIdx--) {
      const card = this.state.waste[wIdx];
      const fIdx = this.findBestFoundationIndex(card);
      if (fIdx !== -1) {
        consider({
          card,
          from: { type: 'waste', index: 0 },
          foundationIdx: fIdx,
          priority: 1,
          wasteArrayIdx: wIdx
        });
      }
    }

    // 4. Check deeper cards in tableau columns (priority 2) so no buried card can ever deadlock auto-complete
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const col = this.state.tableau[colIdx];
      for (let rIdx = col.length - 2; rIdx >= 0; rIdx--) {
        const card = col[rIdx];
        if (!card.faceUp) continue;
        const fIdx = this.findBestFoundationIndex(card);
        if (fIdx !== -1) {
          consider({
            card,
            from: { type: 'tableau', index: colIdx },
            foundationIdx: fIdx,
            priority: 2,
            tableauRowIdx: rIdx
          });
        }
      }
    }

    if (!best) {
      return false;
    }

    const chosen = best as AutoFinishCandidate;

    // Standard top-of-pile move
    if (chosen.priority === 0) {
      return this.moveCards([chosen.card], chosen.from, { type: 'foundation', index: chosen.foundationIdx });
    }

    // Extraction move from deeper in waste or tableau
    this.startTimer();
    let removedCard: Card;
    if (chosen.from.type === 'waste' && chosen.wasteArrayIdx !== undefined) {
      [removedCard] = this.state.waste.splice(chosen.wasteArrayIdx, 1);
    } else if (chosen.from.type === 'tableau' && chosen.tableauRowIdx !== undefined) {
      [removedCard] = this.state.tableau[chosen.from.index].splice(chosen.tableauRowIdx, 1);
    } else {
      return false;
    }

    removedCard.faceUp = true;
    this.state.foundations[chosen.foundationIdx].push(removedCard);
    const scoreChange = this.state.scoringMode === 'vegas' ? 5 : 10;
    if (this.state.scoringMode === 'standard') {
      this.state.score = Math.max(0, this.state.score + scoreChange);
    } else {
      this.state.score += scoreChange;
    }
    this.state.moves++;
    this.state.history.push({
      cards: [removedCard],
      from: chosen.from,
      to: { type: 'foundation', index: chosen.foundationIdx },
      cardFlipped: false,
      scoreChange,
      wasteIndex: chosen.wasteArrayIdx,
      tableauRowIndex: chosen.tableauRowIdx
    });
    this.state.lastAction = {
      type: 'move',
      flippedCardIds: [],
      movedCardIds: [removedCard.id],
      targetPile: { type: 'foundation', index: chosen.foundationIdx },
      timestamp: Date.now()
    };
    this.checkWinCondition();
    this.notify();
    return true;
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
