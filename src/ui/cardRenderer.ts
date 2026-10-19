import { Card } from '../game/types';
import { SUIT_SYMBOLS, getSuitColor, getRankLabel } from '../game/deck';

export class CardRenderer {
  public static createCardElement(card: Card, isDragging: boolean = false): HTMLElement {
    const el = document.createElement('div');
    el.className = `card ${card.faceUp ? 'face-up' : 'face-down'} ${isDragging ? 'is-dragging' : ''}`;
    el.dataset.id = card.id;
    el.dataset.suit = card.suit;
    el.dataset.rank = card.rank.toString();

    if (!card.faceUp) {
      el.innerHTML = `
        <div class="card-back">
          <div class="card-back-pattern">
            <span class="card-back-emblem"></span>
          </div>
        </div>
      `;
      return el;
    }

    const color = getSuitColor(card.suit);
    const rankLabel = getRankLabel(card.rank);
    const symbol = SUIT_SYMBOLS[card.suit];

    el.classList.add(`color-${color}`);

    // Royal face card representation or Pip count representation
    let centerContent = `<span class="card-center-suit">${symbol}</span>`;
    if (card.rank >= 11 && card.rank <= 13) {
      centerContent = `
        <div class="card-royal-badge">
          <span class="royal-letter">${rankLabel}</span>
          <span class="royal-suit">${symbol}</span>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="card-inner">
        <!-- Top-left index -->
        <div class="card-corner corner-top">
          <span class="corner-rank">${rankLabel}</span>
          <span class="corner-suit">${symbol}</span>
        </div>

        <!-- Center art -->
        <div class="card-center">
          ${centerContent}
        </div>

        <!-- Bottom-right inverted index -->
        <div class="card-corner corner-bottom">
          <span class="corner-rank">${rankLabel}</span>
          <span class="corner-suit">${symbol}</span>
        </div>
      </div>
    `;

    return el;
  }
}
