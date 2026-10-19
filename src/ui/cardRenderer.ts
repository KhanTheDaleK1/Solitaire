import { Card } from '../game/types';
import { SUIT_SYMBOLS, getSuitColor, getRankLabel } from '../game/deck';

export class CardRenderer {
  private static getRoyalPortraitSvg(rank: number, symbol: string, color: 'red' | 'black'): string {
    const primary = color === 'red' ? '#dc2626' : '#1e293b';
    const gold = '#f59e0b';
    const accent = color === 'red' ? '#1e3a8a' : '#b91c1c';

    if (rank === 13) {
      // KING: Sovereign Crown, Robe & Scepter
      return `
        <div class="card-royal-frame">
          <svg viewBox="0 0 60 76" class="royal-svg">
            <rect x="3" y="3" width="54" height="70" rx="4" fill="none" stroke="${gold}" stroke-width="1.5" opacity="0.75"/>
            <!-- Crown -->
            <path d="M14 26 L18 13 L25 21 L30 11 L35 21 L42 13 L46 26 Z" fill="${gold}" stroke="${primary}" stroke-width="1.2"/>
            <circle cx="18" cy="12" r="2" fill="${accent}"/>
            <circle cx="30" cy="9.5" r="2.3" fill="${accent}"/>
            <circle cx="42" cy="12" r="2" fill="${accent}"/>
            <!-- Head & Beard -->
            <circle cx="30" cy="34" r="7.5" fill="#fde68a" stroke="${primary}" stroke-width="1.2"/>
            <path d="M23 36 Q30 45 37 36" fill="${primary}" opacity="0.85"/>
            <!-- Royal Tunic -->
            <path d="M13 66 C13 48 47 48 47 66 Z" fill="${primary}"/>
            <path d="M22 49 L30 62 L38 49" fill="${gold}"/>
            <text x="46" y="42" font-size="12" text-anchor="middle" fill="${primary}">${symbol}</text>
          </svg>
        </div>
      `;
    }

    if (rank === 12) {
      // QUEEN: Royal Diadem, Collar & Rose
      return `
        <div class="card-royal-frame">
          <svg viewBox="0 0 60 76" class="royal-svg">
            <rect x="3" y="3" width="54" height="70" rx="4" fill="none" stroke="${gold}" stroke-width="1.5" opacity="0.75"/>
            <!-- Tiara / Diadem -->
            <path d="M16 25 Q23 12 30 19 Q37 12 44 25 Z" fill="${gold}" stroke="${primary}" stroke-width="1.2"/>
            <circle cx="30" cy="14" r="2.2" fill="${accent}"/>
            <!-- Hair & Face -->
            <path d="M18 35 Q16 24 30 24 Q44 24 42 35" fill="${primary}" opacity="0.25"/>
            <circle cx="30" cy="34" r="7" fill="#fef3c7" stroke="${primary}" stroke-width="1.2"/>
            <!-- Royal Gown -->
            <path d="M14 66 C15 48 45 48 46 66 Z" fill="${accent}"/>
            <path d="M21 48 Q30 57 39 48" fill="none" stroke="${gold}" stroke-width="2.5"/>
            <text x="45" y="42" font-size="12" text-anchor="middle" fill="${primary}">${symbol}</text>
          </svg>
        </div>
      `;
    }

    // JACK: Noble Squire Crest & Plumed Cap
    return `
      <div class="card-royal-frame">
        <svg viewBox="0 0 60 76" class="royal-svg">
          <rect x="3" y="3" width="54" height="70" rx="4" fill="none" stroke="${gold}" stroke-width="1.5" opacity="0.75"/>
          <!-- Cap & Feather -->
          <path d="M16 26 Q30 16 44 24 L40 28 L20 28 Z" fill="${primary}"/>
          <path d="M38 22 Q46 11 48 18" fill="none" stroke="${gold}" stroke-width="2.2" stroke-linecap="round"/>
          <!-- Face -->
          <circle cx="30" cy="35" r="7" fill="#fde68a" stroke="${primary}" stroke-width="1.2"/>
          <!-- Doublet & Sash -->
          <path d="M15 66 C16 49 44 49 45 66 Z" fill="${primary}"/>
          <path d="M20 50 L38 65" stroke="${gold}" stroke-width="3.5"/>
          <text x="45" y="42" font-size="12" text-anchor="middle" fill="${primary}">${symbol}</text>
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
        <div class="ace-spades-crest">
          <span class="card-center-suit ace-spade-glyph">♠</span>
          <span class="ace-wreath">✦ SOLITAIRE ✦</span>
        </div>
      `;
    }

    // Pip cards (2 - 10): subtle mini pip cluster + bold MobilityWare center suit
    if (card.rank >= 2 && card.rank <= 10) {
      return `
        <div class="card-pip-center">
          <span class="card-center-suit">${symbol}</span>
        </div>
      `;
    }

    return `<span class="card-center-suit">${symbol}</span>`;
  }

  private static getFantasySuitSvg(suit: string): string {
    if (suit === 'hearts') {
      return `
        <svg class="suit-svg" viewBox="0 0 100 100">
          <path fill="currentColor" d="M50 88 C20 65 5 45 5 28 A22 22 0 0 1 50 18 A22 22 0 0 1 95 28 C95 45 80 65 50 88 Z" />
          <path fill="#f7f2e4" d="M50 35 L47 45 L50 65 L53 45 Z" />
          <circle cx="50" cy="28" r="4" fill="#f7f2e4" />
          <path fill="#f7f2e4" d="M35 32 C35 38 42 42 47 45 C43 40 40 33 35 32 Z" />
          <path fill="#f7f2e4" d="M65 32 C65 38 58 42 53 45 C57 40 60 33 65 32 Z" />
        </svg>
      `;
    }
    if (suit === 'spades') {
      return `
        <svg class="suit-svg" viewBox="0 0 100 100">
          <path fill="currentColor" d="M50 10 C50 10 90 45 90 62 C90 75 80 82 68 82 C56 82 52 74 50 70 C48 74 44 82 32 82 C20 82 10 75 10 62 C10 45 50 10 50 10 Z" />
          <path fill="currentColor" d="M45 75 L40 92 L60 92 L55 75 Z" />
          <path fill="#f7f2e4" d="M50 25 L47 45 L50 62 L53 45 Z" />
          <path fill="#f7f2e4" d="M35 60 C35 52 42 46 47 45 C43 52 40 58 35 60 Z" />
          <path fill="#f7f2e4" d="M65 60 C65 52 58 46 53 45 C57 52 60 58 65 60 Z" />
        </svg>
      `;
    }
    if (suit === 'diamonds') {
      return `
        <svg class="suit-svg" viewBox="0 0 100 100">
          <polygon points="50,8 90,50 50,92 10,50" fill="currentColor" />
          <path fill="#f7f2e4" d="M50 25 L47 50 L50 75 L53 50 Z" />
          <circle cx="50" cy="50" r="4" fill="#f7f2e4" />
          <path fill="#f7f2e4" d="M35 50 Q43 45 47 50 Q43 55 35 50 Z" />
          <path fill="#f7f2e4" d="M65 50 Q57 45 53 50 Q57 55 65 50 Z" />
        </svg>
      `;
    }
    // Clubs
    return `
      <svg class="suit-svg" viewBox="0 0 100 100">
        <circle cx="50" cy="35" r="20" fill="currentColor"/>
        <circle cx="32" cy="60" r="20" fill="currentColor"/>
        <circle cx="68" cy="60" r="20" fill="currentColor"/>
        <path d="M45 60 L40 90 L60 90 L55 60 Z" fill="currentColor"/>
        <circle cx="50" cy="50" r="6" fill="#f7f2e4"/>
      </svg>
    `;
  }

  private static getFantasyCharacterSvg(rank: number): string {
    if (rank === 11) {
      // Jack (Warrior in steel armor & red cloak)
      return `
        <svg viewBox="0 0 130 150">
          <path fill="#7c2d2d" d="M10 60 C-5 95 20 145 35 150 C25 125 15 100 25 75 Z"/>
          <path fill="#8b3a3a" d="M20 50 C2 85 8 130 25 145 C15 110 20 80 35 60 Z"/>
          <path fill="#991b1b" d="M15 150 C20 110 35 90 65 90 C95 90 115 110 120 150 Z" />
          <path fill="#cbd5e1" stroke="#475569" stroke-width="2" d="M35 150 L40 105 L65 100 L90 105 L95 150 Z" />
          <path fill="#e2e8f0" d="M50 115 L65 110 L80 115 L65 140 Z" />
          <polygon points="65,118 71,128 65,138 59,128" fill="#dc2626" stroke="#fbbf24" stroke-width="1"/>
          <path fill="#d97706" stroke="#92400e" stroke-width="1.5" d="M85 95 C105 95 118 105 115 125 C105 125 90 115 85 95 Z"/>
          <circle cx="102" cy="112" r="4" fill="#2563eb" />
          <path fill="#fed7aa" d="M48 55 C48 40 60 30 72 30 C82 30 88 40 88 55 C88 72 75 80 68 80 C60 80 48 72 48 55 Z"/>
          <path fill="#f59e0b" d="M50 42 Q68 35 86 42 Q68 39 50 42 Z"/>
          <polygon points="68,36 71,40 65,40" fill="#dc2626"/>
          <path stroke="#7c2d2d" stroke-width="1.5" fill="none" d="M56 52 Q62 50 65 52"/>
          <path stroke="#7c2d2d" stroke-width="1.5" fill="none" d="M72 52 Q77 50 82 52"/>
          <ellipse cx="61" cy="54" rx="2" ry="1.5" fill="#451a03"/>
          <ellipse cx="76" cy="54" rx="2" ry="1.5" fill="#451a03"/>
          <path stroke="#b45309" stroke-width="1.5" fill="none" d="M68 56 L67 65 L71 65"/>
          <path stroke="#991b1b" stroke-width="1.5" fill="none" d="M62 72 Q68 75 74 72"/>
        </svg>
      `;
    }
    if (rank === 12) {
      // Queen (Turquoise waves, gold crown, royal gown)
      return `
        <svg viewBox="0 0 130 150">
          <path fill="#14b8a6" d="M10 75 C-10 110 15 140 35 150 C15 125 15 95 30 75 Z"/>
          <path fill="#0d9488" d="M25 60 C5 95 10 130 25 145 C15 110 25 80 40 60 Z"/>
          <path fill="#2dd4bf" d="M85 60 C115 80 125 110 115 140 C110 110 100 90 85 70 Z"/>
          <path fill="#1e3a8a" stroke="#fbbf24" stroke-width="1.5" d="M30 150 C35 110 45 100 70 100 C95 100 105 110 115 150 Z" />
          <path fill="#ffffff" d="M50 108 Q70 118 90 108 Q70 102 50 108 Z"/>
          <ellipse cx="70" cy="115" rx="5" ry="5" fill="#2563eb" stroke="#fbbf24" stroke-width="1.5"/>
          <path fill="#ffedd5" d="M50 55 C50 40 60 32 70 32 C80 32 88 40 88 55 C88 72 78 78 70 78 C62 78 50 72 50 55 Z"/>
          <path fill="#f59e0b" stroke="#b45309" stroke-width="1" d="M52 35 L50 20 L60 27 L70 15 L80 27 L90 20 L88 35 Z"/>
          <circle cx="70" cy="19" r="2.5" fill="#dc2626"/>
          <circle cx="53" cy="24" r="2" fill="#2563eb"/>
          <circle cx="87" cy="24" r="2" fill="#2563eb"/>
          <path stroke="#0f766e" stroke-width="1.5" fill="none" d="M58 52 Q63 50 66 52"/>
          <path stroke="#0f766e" stroke-width="1.5" fill="none" d="M74 52 Q78 50 82 52"/>
          <ellipse cx="62" cy="54" rx="2" ry="1.5" fill="#0d9488"/>
          <ellipse cx="78" cy="54" rx="2" ry="1.5" fill="#0d9488"/>
          <path stroke="#ea580c" stroke-width="1.5" fill="none" d="M64 70 Q70 73 76 70"/>
        </svg>
      `;
    }
    if (rank === 13) {
      // King (Ermine fur collar, dark hair & full beard, royal crown)
      return `
        <svg viewBox="0 0 130 150">
          <path fill="#7f1d1d" d="M15 150 C20 100 35 85 70 85 C105 85 115 100 120 150 Z" />
          <path fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" d="M30 150 C32 110 45 92 65 92 C85 92 98 110 100 150 L88 150 C85 115 78 105 65 105 C52 105 45 115 42 150 Z"/>
          <ellipse cx="40" cy="120" rx="2" ry="4" fill="#1e293b"/>
          <ellipse cx="90" cy="120" rx="2" ry="4" fill="#1e293b"/>
          <path fill="#451a03" d="M42 55 C35 75 40 105 50 115 C60 125 78 125 88 115 C98 105 102 75 95 55 Z"/>
          <path fill="#fed7aa" d="M52 50 C52 40 60 32 70 32 C80 32 88 40 88 50 C88 65 80 75 70 75 C60 75 52 65 52 50 Z"/>
          <path fill="#451a03" d="M58 68 Q70 74 82 68 Q70 82 58 68 Z"/>
          <path fill="#d97706" stroke="#78350f" stroke-width="1.5" d="M50 34 L48 18 L58 26 L70 12 L82 26 L92 18 L90 34 Z"/>
          <polygon points="70,16 73,22 67,22" fill="#dc2626"/>
          <circle cx="58" cy="28" r="2.5" fill="#2563eb"/>
          <circle cx="82" cy="28" r="2.5" fill="#2563eb"/>
          <ellipse cx="61" cy="50" rx="2" ry="1.5" fill="#1c1917"/>
          <ellipse cx="79" cy="50" rx="2" ry="1.5" fill="#1c1917"/>
        </svg>
      `;
    }
    return '';
  }

  private static getFantasyAcePipSvg(suit: string): string {
    if (suit === 'clubs') {
      return `
        <svg class="ace-pip-svg" viewBox="0 0 100 120">
          <circle cx="50" cy="38" r="24" fill="currentColor"/>
          <circle cx="28" cy="70" r="24" fill="currentColor"/>
          <circle cx="72" cy="70" r="24" fill="currentColor"/>
          <path d="M42 70 L35 110 L65 110 L58 70 Z" fill="currentColor"/>
          <path fill="#40648c" d="M50 18 C55 28 62 35 62 45 C62 55 50 62 50 62 C50 62 38 55 38 45 C38 35 45 28 50 18 Z"/>
          <path fill="#40648c" d="M15 70 C25 65 35 60 45 62 C38 72 25 80 15 70 Z"/>
          <path fill="#40648c" d="M85 70 C75 65 65 60 55 62 C62 72 75 80 85 70 Z"/>
          <path fill="#f7f2e4" d="M50 40 L46 55 L50 70 L54 55 Z"/>
          <circle cx="50" cy="55" r="4" fill="#f7f2e4"/>
        </svg>
      `;
    }
    if (suit === 'spades') {
      return `
        <svg class="ace-pip-svg" viewBox="0 0 100 120">
          <path fill="currentColor" d="M50 8 C50 8 92 45 92 65 C92 80 82 88 68 88 C56 88 52 80 50 76 C48 80 44 88 32 88 C18 88 8 80 8 65 C8 45 50 8 50 8 Z" />
          <path fill="currentColor" d="M45 80 L38 112 L62 112 L55 80 Z" />
          <path fill="#40648c" d="M50 24 L46 48 L50 70 L54 48 Z" />
          <path fill="#40648c" d="M32 66 C32 56 42 48 48 47 C43 56 38 64 32 66 Z" />
          <path fill="#40648c" d="M68 66 C68 56 58 48 52 47 C57 56 62 64 68 66 Z" />
          <circle cx="50" cy="55" r="4.5" fill="#f7f2e4"/>
        </svg>
      `;
    }
    if (suit === 'hearts') {
      return `
        <svg class="ace-pip-svg" viewBox="0 0 100 120">
          <path fill="currentColor" d="M50 105 C15 75 2 52 2 32 A24 24 0 0 1 50 20 A24 24 0 0 1 98 32 C98 52 85 75 50 105 Z" />
          <path fill="#f7f2e4" d="M50 38 L46 52 L50 78 L54 52 Z" />
          <circle cx="50" cy="30" r="5" fill="#f7f2e4" />
          <path fill="#f7f2e4" d="M32 38 C32 46 41 52 46 56 C41 50 38 40 32 38 Z" />
          <path fill="#f7f2e4" d="M68 38 C68 46 59 52 54 56 C59 50 62 40 68 38 Z" />
        </svg>
      `;
    }
    // Diamonds
    return `
      <svg class="ace-pip-svg" viewBox="0 0 100 120">
        <polygon points="50,6 94,58 50,110 6,58" fill="currentColor" />
        <path fill="#f7f2e4" d="M50 26 L46 58 L50 90 L54 58 Z" />
        <circle cx="50" cy="58" r="5" fill="#f7f2e4" />
        <path fill="#f7f2e4" d="M30 58 Q42 50 46 58 Q42 66 30 58 Z" />
        <path fill="#f7f2e4" d="M70 58 Q58 50 54 58 Q58 66 70 58 Z" />
      </svg>
    `;
  }

  public static createCardElement(
    card: Card,
    isDragging: boolean = false,
    animState?: { isFlipping?: boolean; isDealing?: boolean; dealDelayMs?: number; isMoving?: boolean }
  ): HTMLElement {
    const el = document.createElement('div');
    const classes = ['card', card.faceUp ? 'face-up' : 'face-down'];
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
    const filigreeSuit = this.getFantasySuitSvg(card.suit);
    const fantasyCharacter = card.rank >= 11 && card.rank <= 13 ? this.getFantasyCharacterSvg(card.rank) : '';
    const fantasyAcePip = card.rank === 1 ? this.getFantasyAcePipSvg(card.suit) : '';
    const fantasyCenterPip = card.rank >= 2 && card.rank <= 10 ? this.getFantasySuitSvg(card.suit) : '';

    const frontMarkup = `
      <div class="card-inner">
        <!-- Top-left index -->
        <div class="card-corner corner-top">
          <span class="corner-rank">${rankLabel}</span>
          <span class="corner-suit">${symbol}</span>
          <span class="fantasy-suit-pip">${filigreeSuit}</span>
        </div>

        <!-- Top-right suit pip (MobilityWare header layout) -->
        <div class="card-top-pip">${symbol}</div>

        <!-- Center art -->
        <div class="card-center">
          ${centerContent}
        </div>

        <!-- Fantasy character portrait layer (for J, Q, K in Fantasy theme) -->
        ${fantasyCharacter ? `<div class="fantasy-character-layer">${fantasyCharacter}</div>` : ''}

        <!-- Fantasy Giant Ace Pip (for Aces in Fantasy theme) -->
        ${fantasyAcePip ? `<div class="fantasy-ace-pip">${fantasyAcePip}</div>` : ''}

        <!-- Fantasy Number Pip (for 2-10 in Fantasy theme) -->
        ${fantasyCenterPip ? `<div class="fantasy-center-pip">${fantasyCenterPip}</div>` : ''}

        <!-- Bottom-right inverted index -->
        <div class="card-corner corner-bottom">
          <span class="corner-rank">${rankLabel}</span>
          <span class="corner-suit">${symbol}</span>
        </div>
      </div>
    `;

    // If flipping face-up, wrap both front and back in a 3D flipper so the back visibly turns over!
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
