import { Card, Suit } from '../game/types';
import { getSuitColor, getRankLabel } from '../game/deck';

export class CardRenderer {
  /**
   * Renders the gold-rimmed SVG suit glyph for corner indices & center pips
   * Hearts & Diamonds: Deep ruby fill (#b91c1c) with gold perimeter stroke (#f6d365)
   * Spades & Clubs: Metallic gold gradient fill (url(#goldLinear)) with bright gold stroke (#f9e27c)
   */
  private static getSuitGlyphSvg(suit: Suit, className: string = 'suit-glyph'): string {
    switch (suit) {
      case 'hearts':
        return `
          <svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">
            <path class="suit-heart-fill" d="M50 88 C20 65 5 45 5 28 A22 22 0 0 1 50 18 A22 22 0 0 1 95 28 C95 45 80 65 50 88 Z" />
          </svg>
        `;
      case 'diamonds':
        return `
          <svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">
            <polygon class="suit-diamond-fill" points="50,10 88,50 50,90 12,50" />
          </svg>
        `;
      case 'clubs':
        return `
          <svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="suit-gold-fill" cx="50" cy="28" r="19" />
            <circle class="suit-gold-fill" cx="29" cy="56" r="19" />
            <circle class="suit-gold-fill" cx="71" cy="56" r="19" />
            <path class="suit-gold-fill" d="M44 62 L36 92 L64 92 L56 62 Z" />
          </svg>
        `;
      case 'spades':
      default:
        return `
          <svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">
            <path class="suit-gold-fill" d="M50 14 C50 14 88 49 88 67 C88 79 78 85 66 85 C54 85 51 77 50 73 C49 77 46 85 34 85 C22 85 12 79 12 67 C12 49 50 14 50 14 Z" />
            <path class="suit-gold-fill" d="M44 76 L37 94 L63 94 L56 76 Z" />
          </svg>
        `;
    }
  }

  /**
   * Reusable Celtic / Filigree Knotwork SVG Frame Overlay
   */
  private static getFiligreeFrameSvg(): string {
    return `
      <svg class="filigree-overlay filigree-frame" viewBox="0 0 132 202" preserveAspectRatio="none" aria-hidden="true">
        <rect x="2" y="2" width="128" height="198" rx="6" fill="none" stroke="url(#goldLinear)" stroke-width="1.2" stroke-dasharray="6 2 2 2" opacity="0.85" />
        <!-- Corner Celtic Filigree Ornaments -->
        <path d="M6 18 L18 6 M6 6 L6 14 M6 6 L14 6" stroke="url(#goldLinear)" stroke-width="1.6" fill="none" />
        <path d="M126 18 L114 6 M126 6 L126 14 M126 6 L118 6" stroke="url(#goldLinear)" stroke-width="1.6" fill="none" />
        <path d="M6 184 L18 196 M6 196 L6 188 M6 196 L14 196" stroke="url(#goldLinear)" stroke-width="1.6" fill="none" />
        <path d="M126 184 L114 196 M126 196 L126 188 M126 196 L118 196" stroke="url(#goldLinear)" stroke-width="1.6" fill="none" />
      </svg>
    `;
  }

  /**
   * Cinematic Dark Fantasy Court Portraits (King, Queen, Jack)
   */
  private static getCourtPortraitSvg(rank: number, color: 'red' | 'black'): string {
    const isRed = color === 'red';

    if (rank === 13) {
      // KING: Flowing Ermine Robe, Glowing Crystalline Magic Blade, Sovereign Gold Crown & Bearded Face
      const robeFill = isRed ? '#450a0a' : '#172554';
      return `
        <div class="art-layer character-art court-portrait">
          <svg viewBox="0 0 140 210" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
            <rect width="140" height="210" fill="url(#redGlow)" />
            <!-- Flowing Ermine Robe -->
            <path d="M10 210 C15 130 30 110 70 110 C110 110 125 130 130 210 Z" fill="${robeFill}" />
            <path d="M25 210 C35 140 50 120 70 120 C90 120 105 140 115 210 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
            <ellipse cx="46" cy="166" rx="2.2" ry="4.5" fill="#1e293b" />
            <ellipse cx="94" cy="166" rx="2.2" ry="4.5" fill="#1e293b" />
            <circle cx="70" cy="138" r="5" fill="#b91c1c" stroke="url(#goldLinear)" stroke-width="1.8" />
            <!-- Glowing Crystalline Magic Blade -->
            <line x1="124" y1="54" x2="60" y2="186" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round" opacity="0.85" />
            <line x1="124" y1="54" x2="60" y2="186" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" />
            <!-- Bearded King Hair & Face -->
            <path d="M44 65 C42 98 54 118 70 118 C86 118 98 98 96 65 Z" fill="#3e2723" />
            <path d="M52 62 C52 49 60 41 70 41 C80 41 88 49 88 62 C88 80 78 94 70 94 C62 94 52 80 52 62 Z" fill="#fed7aa" />
            <!-- Mustache & Full Beard -->
            <path d="M48 76 C50 104 60 116 70 116 C80 116 90 104 92 76 C84 84 77 86 70 86 C63 86 56 84 48 76 Z" fill="#3e2723" />
            <path d="M58 76 Q70 82 82 76" stroke="#5d4037" stroke-width="2" fill="none" />
            <!-- Eyes -->
            <ellipse cx="62" cy="61" rx="2.2" ry="1.6" fill="#1c1917" />
            <ellipse cx="78" cy="61" rx="2.2" ry="1.6" fill="#1c1917" />
            <!-- Sovereign Gold Crown -->
            <path d="M48 56 L45 33 L58 45 L70 27 L82 45 L95 33 L92 56 Z" fill="url(#goldLinear)" stroke="#92400e" stroke-width="1.2" />
            <circle cx="70" cy="44" r="2.8" fill="#dc2626" />
            <circle cx="56" cy="47" r="2" fill="#38bdf8" />
            <circle cx="84" cy="47" r="2" fill="#38bdf8" />
          </svg>
        </div>
      `;
    }

    if (rank === 12) {
      // QUEEN: Sorceress Glowing Arcane Orb, Royal Dark Velvet Gown, Gothic Gold Tiara & Flowing Waves
      const gownFill = isRed ? '#4c0519' : '#2e1065';
      const orbOuter = isRed ? '#fb7185' : '#c084fc';
      return `
        <div class="art-layer character-art court-portrait">
          <svg viewBox="0 0 140 210" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
            <rect width="140" height="210" fill="url(#sorceressGlow)" />
            <!-- Sorceress Glowing Arcane Orb -->
            <circle cx="108" cy="92" r="15" fill="${orbOuter}" opacity="0.55" />
            <circle cx="108" cy="92" r="7.5" fill="#fdf4ff" opacity="0.95" />
            <circle cx="102" cy="72" r="1.5" fill="#f5d0fe" opacity="0.85" />
            <circle cx="116" cy="78" r="1.2" fill="#f5d0fe" opacity="0.75" />
            <!-- Flowing Dark Hair Waves -->
            <path d="M30 65 C18 100 24 142 40 165 C29 132 34 92 48 70 Z" fill="#14b8a6" opacity="0.88" />
            <path d="M110 65 C122 100 116 142 100 165 C111 132 106 92 92 70 Z" fill="#0d9488" opacity="0.88" />
            <!-- Royal Dark Gown -->
            <path d="M20 210 C25 148 45 124 70 124 C95 124 115 148 120 210 Z" fill="${gownFill}" stroke="url(#goldLinear)" stroke-width="1.2" />
            <path d="M36 210 C45 158 55 134 70 134 C85 134 95 158 104 210 Z" fill="#fdf2f8" stroke="#f472b6" stroke-width="1" opacity="0.92" />
            <circle cx="70" cy="134" r="4.5" fill="#38bdf8" stroke="url(#goldLinear)" stroke-width="1.5" />
            <!-- Queen Face -->
            <path d="M52 58 C52 44 60 38 70 38 C80 38 88 44 88 58 C88 76 78 86 70 86 C62 86 52 76 52 58 Z" fill="#ffedd5" />
            <!-- Eyes & Lips -->
            <ellipse cx="62" cy="59" rx="2.1" ry="1.5" fill="#0f766e" />
            <ellipse cx="78" cy="59" rx="2.1" ry="1.5" fill="#0f766e" />
            <path d="M64 73 Q70 76 76 73" stroke="#e11d48" stroke-width="1.6" fill="none" />
            <!-- Gothic Gold Tiara -->
            <path d="M50 50 L48 29 L58 39 L70 21 L82 39 L92 29 L90 50 Z" fill="url(#goldLinear)" stroke="#4c1d95" stroke-width="1" />
            <circle cx="70" cy="37" r="2.5" fill="#c084fc" />
          </svg>
        </div>
      `;
    }

    // JACK: Rogue Concealed Dagger, Crimson & Leather Armor Tunic, Gold Pauldrons & Circlet
    const cloakFill = isRed ? '#5c1d1d' : '#1e293b';
    return `
      <div class="art-layer character-art court-portrait">
        <svg viewBox="0 0 140 210" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
          <rect width="140" height="210" fill="url(#rogueGlow)" />
          <!-- Rogue Gleaming Dagger -->
          <line x1="110" y1="126" x2="118" y2="192" stroke="#cbd5e1" stroke-width="3.2" stroke-linecap="round" />
          <line x1="101" y1="143" x2="119" y2="143" stroke="url(#goldLinear)" stroke-width="2.4" stroke-linecap="round" />
          <!-- Leather Armor & Tunic -->
          <path d="M20 210 C25 144 40 122 70 122 C100 122 115 144 120 210 Z" fill="${cloakFill}" />
          <path d="M35 210 L45 135 L95 135 L105 210 Z" fill="#78350f" stroke="url(#goldLinear)" stroke-width="1.4" />
          <polygon points="70,142 77,154 70,166 63,154" fill="#b91c1c" stroke="url(#goldLinear)" stroke-width="1.2" />
          <!-- Face -->
          <path d="M52 58 C52 45 60 38 70 38 C80 38 88 45 88 58 C88 76 78 85 70 85 C62 85 52 76 52 58 Z" fill="#fed7aa" />
          <!-- Eyes & Smirk -->
          <ellipse cx="62" cy="59" rx="2" ry="1.5" fill="#451a03" />
          <ellipse cx="78" cy="59" rx="2" ry="1.5" fill="#451a03" />
          <path d="M64 73 Q71 76 77 72" stroke="#7c2d12" stroke-width="1.5" fill="none" />
          <!-- Tousled Hair & Gold Circlet -->
          <path d="M44 50 C42 29 58 24 70 24 C84 24 96 29 94 50 C88 41 82 43 78 40 C70 38 60 42 54 45 Z" fill="#451a03" />
          <path d="M50 47 Q70 41 90 47" stroke="url(#goldLinear)" stroke-width="2.5" fill="none" />
          <circle cx="70" cy="44" r="2.3" fill="#ef4444" />
        </svg>
      </div>
    `;
  }

  /**
   * Center Artwork Layer for Aces (Nebula Filigree Crest), Court Cards, and Jewel-Toned Number Pips (2-10)
   */
  private static getArtLayer(card: Card, color: 'red' | 'black'): string {
    if (card.rank >= 11 && card.rank <= 13) {
      return this.getCourtPortraitSvg(card.rank, color);
    }

    // ACE: Glowing Stellar Nebula + Sparkling Particles + Ornate Gold Filigree Suit Crest
    if (card.rank === 1) {
      const nebulaId = color === 'red' ? 'rubyNebula' : 'nebula';
      const innerKnotStroke = color === 'red' ? '#fda4af' : '#7dd3fc';
      return `
        <div class="art-layer ace-art-layer">
          <svg viewBox="0 0 140 210" class="ace-crest-svg" aria-hidden="true">
            <circle cx="70" cy="110" r="58" fill="url(#${nebulaId})" />
            <!-- Sparkling Starlight Particles -->
            <circle cx="48" cy="74" r="1.6" fill="#e0f2fe" opacity="0.85" />
            <circle cx="96" cy="86" r="1.3" fill="#fce082" opacity="0.9" />
            <circle cx="44" cy="134" r="1.2" fill="#e0f2fe" opacity="0.75" />
            <circle cx="88" cy="144" r="1.8" fill="#fce082" opacity="0.85" />
            <!-- Inner Celtic Ring -->
            <circle cx="70" cy="110" r="34" fill="none" stroke="url(#goldLinear)" stroke-width="1.2" stroke-dasharray="4 2" opacity="0.75" />
            <path d="M70 72 Q82 92 86 112 Q70 122 70 102 Q70 122 54 112 Q58 92 70 72 Z" fill="none" stroke="${innerKnotStroke}" stroke-width="1.3" opacity="0.7" />
          </svg>
          <div class="ace-center-glyph">
            ${this.getSuitGlyphSvg(card.suit, 'center-suit-svg ace-suit-svg')}
          </div>
        </div>
      `;
    }

    // NUMBER CARDS (2-10): Jewel-Toned Gold-Rimmed Suit Emblem on Obsidian/Classic Canvas
    return `
      <div class="art-layer pip-art-layer">
        <div class="card-center">
          ${this.getSuitGlyphSvg(card.suit, 'center-suit-svg')}
        </div>
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
    const classes = ['card', 'card-gilded', 'theme-fantasy', card.faceUp ? 'face-up' : 'face-down'];
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
    const suitGlyphMarkup = this.getSuitGlyphSvg(card.suit, 'suit-glyph');
    const topRightPipMarkup = this.getSuitGlyphSvg(card.suit, 'top-pip-svg');

    el.classList.add(`color-${color}`);

    const artLayerMarkup = this.getArtLayer(card, color);
    const filigreeFrameMarkup = this.getFiligreeFrameSvg();

    const frontMarkup = `
      <div class="card-inner">
        <!-- Top-Left Metallic Gold Serif Index & Jewel Suit Pip -->
        <div class="card-corner corner-top index-corner index-top">
          <span class="corner-rank rank-glyph">${rankLabel}</span>
          <span class="corner-suit">${suitGlyphMarkup}</span>
        </div>

        <!-- Top-Right Suit Pip for Tableau Cascade Visibility -->
        <div class="card-top-pip">${topRightPipMarkup}</div>

        <!-- Layer 1: Center Artwork (Court Portrait, Ace Nebula Crest, or Jewel Suit Pip) -->
        ${artLayerMarkup}

        <!-- Layer 2: Soft Radial & Vertical Dark Fantasy Vignette -->
        <div class="art-vignette"></div>

        <!-- Layer 3: Celtic Knot / Metallic Gold Filigree Border Overlay -->
        ${filigreeFrameMarkup}

        <!-- Bottom-Right Inverted Index -->
        <div class="card-corner corner-bottom index-corner index-bottom">
          <span class="corner-rank rank-glyph">${rankLabel}</span>
          <span class="corner-suit">${suitGlyphMarkup}</span>
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
