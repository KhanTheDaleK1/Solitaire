import { Card } from '../game/types';
import { SUIT_SYMBOLS, getSuitColor, getRankLabel } from '../game/deck';

export class CardRenderer {
  private static getRoyalPortraitSvg(rank: number, symbol: string, color: 'red' | 'black'): string {
    const primary = color === 'red' ? '#991b1b' : '#1e3a8a';

    if (rank === 13) {
      // KING: Ermine Fur Collar, Royal Robes, Full Beard & Regal Pointed Crown
      return `
        <div class="court-portrait character-art">
          <svg viewBox="0 0 130 140" preserveAspectRatio="xMidYMax meet" class="royal-svg">
            <!-- Ermine Fur Collar & Robes anchored at y=140 -->
            <path fill="${primary}" d="M12 140 C18 96 34 82 65 82 C96 82 112 96 118 140 Z" />
            <path fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" d="M28 140 C30 104 43 88 65 88 C87 88 100 104 102 140 L89 140 C86 110 78 100 65 100 C52 100 44 110 41 140 Z"/>
            <!-- Ermine Spots -->
            <ellipse cx="38" cy="116" rx="2" ry="4" fill="#1e293b"/>
            <ellipse cx="92" cy="116" rx="2" ry="4" fill="#1e293b"/>
            <!-- Head, Dark Hair & Full Beard -->
            <path fill="#451a03" d="M40 50 C34 68 38 96 48 106 C58 115 72 115 82 106 C92 96 96 68 90 50 Z"/>
            <path fill="#fed7aa" d="M49 46 C49 36 56 28 65 28 C74 28 81 36 81 46 C81 60 74 70 65 70 C56 70 49 60 49 46 Z"/>
            <!-- Mustache and Beard -->
            <path fill="#451a03" d="M54 63 Q65 69 76 63 Q65 76 54 63 Z"/>
            <!-- Regal Pointed Crown -->
            <path fill="#d97706" stroke="#78350f" stroke-width="1.5" d="M46 31 L44 15 L55 23 L65 9 L75 23 L86 15 L84 31 Z"/>
            <polygon points="65,13 68,19 62,19" fill="#dc2626"/>
            <circle cx="54" cy="24" r="2.3" fill="#2563eb"/>
            <circle cx="76" cy="24" r="2.3" fill="#2563eb"/>
            <!-- Eyes -->
            <ellipse cx="58" cy="46" rx="2" ry="1.5" fill="#1c1917"/>
            <ellipse cx="72" cy="46" rx="2" ry="1.5" fill="#1c1917"/>
            <text x="104" y="54" font-size="18" font-weight="bold" text-anchor="middle" fill="${color === 'red' ? '#dc2626' : '#1e293b'}" opacity="0.35">${symbol}</text>
          </svg>
        </div>
      `;
    }

    if (rank === 12) {
      // QUEEN: Flowing Teal Hair, Royal Gown & Ornate Gold Crown
      return `
        <div class="court-portrait character-art">
          <svg viewBox="0 0 130 140" preserveAspectRatio="xMidYMax meet" class="royal-svg">
            <!-- Flowing Turquoise Hair clamped inside 0..130 x 0..140 -->
            <path fill="#14b8a6" d="M16 68 C6 98 20 128 36 140 C22 118 22 90 34 68 Z"/>
            <path fill="#0d9488" d="M28 54 C12 86 16 120 30 136 C20 104 28 74 42 54 Z"/>
            <path fill="#2dd4bf" d="M82 54 C108 72 116 102 108 132 C102 104 94 84 82 64 Z"/>
            <!-- Royal Gown / Bustier anchored at y=140 -->
            <path fill="${primary}" stroke="#fbbf24" stroke-width="1.5" d="M28 140 C34 102 44 92 65 92 C86 92 96 102 104 140 Z" />
            <path fill="#ffffff" d="M46 100 Q65 110 84 100 Q65 94 46 100 Z"/>
            <ellipse cx="65" cy="107" rx="4.5" ry="4.5" fill="#2563eb" stroke="#fbbf24" stroke-width="1.5"/>
            <!-- Head / Face -->
            <path fill="#ffedd5" d="M47 50 C47 36 56 28 65 28 C74 28 83 36 83 50 C83 66 74 72 65 72 C56 72 47 66 47 50 Z"/>
            <!-- Ornate Gold Crown -->
            <path fill="#f59e0b" stroke="#b45309" stroke-width="1" d="M48 31 L46 16 L56 23 L65 11 L74 23 L84 16 L82 31 Z"/>
            <circle cx="65" cy="15" r="2.5" fill="#dc2626"/>
            <circle cx="50" cy="20" r="2" fill="#2563eb"/>
            <circle cx="80" cy="20" r="2" fill="#2563eb"/>
            <!-- Eyes & Smile -->
            <path stroke="#0f766e" stroke-width="1.5" fill="none" d="M54 47 Q59 45 62 47"/>
            <path stroke="#0f766e" stroke-width="1.5" fill="none" d="M69 47 Q73 45 77 47"/>
            <ellipse cx="58" cy="49" rx="2" ry="1.5" fill="#0d9488"/>
            <ellipse cx="73" cy="49" rx="2" ry="1.5" fill="#0d9488"/>
            <path stroke="#ea580c" stroke-width="1.5" fill="none" d="M59 64 Q65 67 71 64"/>
          </svg>
        </div>
      `;
    }

    // JACK: Flowing Auburn Hair, Plate Armor, Gold Pauldrons & Red Cloak
    return `
      <div class="court-portrait character-art">
        <svg viewBox="0 0 130 140" preserveAspectRatio="xMidYMax meet" class="royal-svg">
          <!-- Flowing Auburn Hair clamped inside viewBox -->
          <path fill="#7c2d2d" d="M16 54 C6 86 22 132 36 140 C26 116 18 92 28 68 Z"/>
          <path fill="#8b3a3a" d="M24 46 C10 78 14 120 28 134 C18 102 24 74 38 54 Z"/>
          <!-- Body / Plate Armor & Cloak anchored at y=140 -->
          <path fill="${primary}" d="M16 140 C22 102 36 84 65 84 C94 84 110 102 114 140 Z" />
          <path fill="#cbd5e1" stroke="#475569" stroke-width="2" d="M36 140 L41 98 L65 93 L89 98 L94 140 Z" />
          <path fill="#e2e8f0" d="M50 107 L65 102 L80 107 L65 132 Z" />
          <polygon points="65,110 71,120 65,130 59,120" fill="#dc2626" stroke="#fbbf24" stroke-width="1"/>
          <!-- Gold Pauldrons -->
          <path fill="#d97706" stroke="#92400e" stroke-width="1.5" d="M84 88 C102 88 112 98 110 116 C100 116 88 106 84 88 Z"/>
          <circle cx="99" cy="104" r="3.5" fill="#2563eb" />
          <!-- Head / Face -->
          <path fill="#fed7aa" d="M46 50 C46 36 56 26 67 26 C77 26 84 36 84 50 C84 66 72 74 65 74 C57 74 46 66 46 50 Z"/>
          <!-- Royal Circlet -->
          <path fill="#f59e0b" d="M48 38 Q65 31 82 38 Q65 35 48 38 Z"/>
          <polygon points="65,32 68,36 62,36" fill="#dc2626"/>
          <!-- Eyes & Expression -->
          <path stroke="#7c2d2d" stroke-width="1.5" fill="none" d="M54 47 Q60 45 63 47"/>
          <path stroke="#7c2d2d" stroke-width="1.5" fill="none" d="M69 47 Q74 45 79 47"/>
          <ellipse cx="59" cy="49" rx="2" ry="1.5" fill="#451a03"/>
          <ellipse cx="73" cy="49" rx="2" ry="1.5" fill="#451a03"/>
          <path stroke="#b45309" stroke-width="1.5" fill="none" d="M65 51 L64 59 L68 59"/>
          <path stroke="#991b1b" stroke-width="1.5" fill="none" d="M59 66 Q65 69 71 66"/>
        </svg>
      </div>
    `;
  }

  private static getCenterArt(card: Card, symbol: string, color: 'red' | 'black'): string {
    if (card.rank >= 11 && card.rank <= 13) {
      return this.getRoyalPortraitSvg(card.rank, symbol, color);
    }

    // Ornate Ace of Spades medallion
    if (card.rank === 1 && card.suit === 'spades') {
      return `
        <div class="card-center">
          <div class="ace-spades-crest">
            <span class="card-center-suit ace-spade-glyph">♠</span>
            <span class="ace-wreath">✦ SOLITAIRE ✦</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="card-center">
        <span class="card-center-suit">${symbol}</span>
      </div>
    `;
  }

  public static createCardElement(
    card: Card,
    isDragging: boolean = false,
    animState?: { isFlipping?: boolean; isDealing?: boolean; dealDelayMs?: number; isMoving?: boolean }
  ): HTMLElement {
    const el = document.createElement('div');
    const isCourtCard = card.rank >= 11 && card.rank <= 13;
    const classes = ['card', 'theme-fantasy', card.faceUp ? 'face-up' : 'face-down'];
    if (isCourtCard) classes.push('court-card');
    if (isDragging) classes.push('is-dragging');
    if (animState?.isFlipping) classes.push('is-flipping');
    if (animState?.isDealing) classes.push('is-dealing');
    if (animState?.isMoving) classes.push('is-moving');

    el.className = classes.join(' ');
    el.dataset.id = card.id;
    el.dataset.suit = card.suit;
    el.dataset.rank = card.rank.toString();

    if (animState?.dealDelayMs) {
      el.style.animationDelay = `${animState.dealDelayMs}ms`;
    }

    const backMarkup = `
      <div class="card-back">
        <div class="card-back-pattern">
          <span class="card-back-emblem"></span>
        </div>
      </div>
    `;

    if (!card.faceUp) {
      el.innerHTML = backMarkup;
      return el;
    }

    const color = getSuitColor(card.suit);
    const rankLabel = getRankLabel(card.rank);
    const symbol = SUIT_SYMBOLS[card.suit];

    el.classList.add(`color-${color}`);

    const centerContent = this.getCenterArt(card, symbol, color);
    const frontMarkup = `
      <div class="card-inner">
        <!-- Top-Left Index -->
        <div class="card-corner corner-top index-top">
          <span class="corner-rank">${rankLabel}</span>
          <span class="corner-suit">${symbol}</span>
        </div>

        <!-- Top-Right Suit Pip (MobilityWare visible cascade header) -->
        <div class="card-top-pip">${symbol}</div>

        <!-- Center / Court Character Art -->
        ${centerContent}

        <!-- Bottom-Right Inverted Index (hidden on fantasy/court cards to prevent clipping) -->
        <div class="card-corner corner-bottom index-bottom">
          <span class="corner-rank">${rankLabel}</span>
          <span class="corner-suit">${symbol}</span>
        </div>
      </div>
    `;

    if (animState?.isFlipping) {
      el.innerHTML = `
        <div class="card-flipper">
          <div class="card-flip-front">${frontMarkup}</div>
          <div class="card-flip-back">${backMarkup}</div>
        </div>
      `;
    } else {
      el.innerHTML = frontMarkup;
    }

    return el;
  }
}
