import { Card, Suit } from '../game/types';
import { getSuitColor, getRankLabel } from '../game/deck';

export class CardRenderer {
  private static frontMarkupCache = new Map<string, string>();
  private static backMarkupCache = `
    <div class="card-back">
      <div class="card-back-pattern">
        <span class="card-back-emblem"></span>
      </div>
    </div>
  `;

  /**
   * Renders the gold-rimmed SVG suit glyph for corner indices & center pips
   * Hearts & Diamonds: Deep ruby fill (#b91c1c) with gold perimeter stroke (#f7d774)
   * Spades & Clubs: Metallic gold gradient fill (url(#goldGrad)) with bright gold stroke (#fce082)
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
            <circle class="suit-gold-fill" cx="50" cy="34" r="19" />
            <circle class="suit-gold-fill" cx="31" cy="61" r="19" />
            <circle class="suit-gold-fill" cx="69" cy="61" r="19" />
            <path class="suit-gold-fill" d="M44 64 L37 94 L63 94 L56 64 Z" />
          </svg>
        `;
      case 'spades':
      default:
        return `
          <svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">
            <path class="suit-gold-fill" d="M50 15 C50 15 88 50 88 68 C88 80 78 86 66 86 C54 86 51 78 50 74 C49 78 46 86 34 86 C22 86 12 80 12 68 C12 50 50 15 50 15 Z" />
            <path class="suit-gold-fill" d="M44 78 L38 94 L62 94 L56 78 Z" />
          </svg>
        `;
    }
  }

  /**
   * Reusable Celtic / Filigree Knotwork SVG Frame Overlay
   */
  private static getFiligreeFrameSvg(): string {
    return `
      <svg class="filigree-overlay filigree-frame" viewBox="0 0 133 208" preserveAspectRatio="none" aria-hidden="true">
        <rect x="2" y="2" width="129" height="204" rx="6" fill="none" stroke="url(#goldGrad)" stroke-width="1.2" stroke-dasharray="5 2 1.5 2" opacity="0.88" />
        <path d="M6 18 L18 6 M6 6 L6 14 M6 6 L14 6" stroke="url(#goldGrad)" stroke-width="1.6" fill="none" />
        <path d="M127 18 L115 6 M127 6 L127 14 M127 6 L119 6" stroke="url(#goldGrad)" stroke-width="1.6" fill="none" />
        <path d="M6 190 L18 202 M6 202 L6 194 M6 202 L14 202" stroke="url(#goldGrad)" stroke-width="1.6" fill="none" />
        <path d="M127 190 L115 202 M127 202 L127 194 M127 202 L119 202" stroke="url(#goldGrad)" stroke-width="1.6" fill="none" />
      </svg>
    `;
  }

  /**
   * Suit-Specific Four Queens:
   * - Queen of Hearts: Crimson Scepter Empress (heartRedAura, ruby scepter, ermine collar, platinum hair)
   * - Queen of Spades: Sorceress of Shadows (sorceressGlow, violet arcane sphere, gothic tiara, dark curls)
   * - Queen of Diamonds: Golden Sun Empress (solarAura, floating crystal prism star, gilded corset, honey hair)
   * - Queen of Clubs: Verdant Huntress Queen (forestAura, glowing emerald spear/bow, leaf cuirass, antler crown)
   */
  private static getQueenPortraitSvg(suit: Suit): string {
    if (suit === 'hearts') {
      return `
        <div class="art-layer character-art court-portrait">
          <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
            <rect width="140" height="215" fill="url(#heartRedAura)" />
            <!-- Glowing Ruby Scepter -->
            <line x1="22" y1="65" x2="40" y2="195" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" />
            <circle cx="20" cy="62" r="10" fill="#dc2626" opacity="0.6" />
            <polygon points="20,53 27,62 20,71 13,62" fill="#ef4444" stroke="#fef08a" stroke-width="1" />
            <!-- Royal Fur Cloak & Corset -->
            <path d="M26 215 C30 145 45 125 72 125 C98 125 116 145 122 215 Z" fill="#7f1d1d" />
            <path d="M42 215 C48 160 56 140 72 140 C88 140 96 160 102 215 Z" fill="#b91c1c" stroke="url(#goldGrad)" stroke-width="1.5" />
            <!-- Ermine Fur Collar -->
            <path d="M38 150 C44 125 56 120 72 120 C88 120 100 125 106 150 L96 150 C92 135 84 130 72 130 C60 130 52 135 48 150 Z" fill="#f8fafc" />
            <!-- Platinum Blonde Swept Hair -->
            <path d="M40 70 C30 100 32 140 45 160 C32 125 40 85 50 68 Z" fill="#f1f5f9" />
            <path d="M102 70 C112 100 110 140 98 160 C110 125 102 85 92 68 Z" fill="#f1f5f9" />
            <!-- Crown & Face -->
            <path d="M52 56 C52 42 60 36 71 36 C82 36 90 42 90 56 C90 74 80 84 71 84 C62 84 52 74 52 56 Z" fill="#fed7aa" />
            <ellipse cx="63" cy="58" rx="2" ry="1.4" fill="#7f1d1d" />
            <ellipse cx="79" cy="58" rx="2" ry="1.4" fill="#7f1d1d" />
            <path d="M65 71 Q71 74 77 71" stroke="#dc2626" stroke-width="1.5" fill="none" />
            <path d="M50 48 L46 26 L58 36 L71 18 L84 36 L96 26 L92 48 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1" />
            <circle cx="71" cy="24" r="2.5" fill="#dc2626" />
          </svg>
        </div>
      `;
    }

    if (suit === 'diamonds') {
      return `
        <div class="art-layer character-art court-portrait">
          <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
            <rect width="140" height="215" fill="url(#solarAura)" />
            <!-- Floating Radiant Crystal Prism -->
            <polygon points="106,85 116,70 126,85 116,100" fill="#fef08a" stroke="#d97706" stroke-width="1.5" />
            <line x1="96" y1="85" x2="136" y2="85" stroke="#fde047" stroke-width="1" opacity="0.6" />
            <line x1="116" y1="60" x2="116" y2="110" stroke="#fde047" stroke-width="1" opacity="0.6" />
            <!-- Gilded Filigree Corset Armor -->
            <path d="M26 215 C30 145 46 125 72 125 C98 125 114 145 118 215 Z" fill="#78350f" />
            <path d="M40 215 C48 160 56 138 72 138 C88 138 96 160 104 215 Z" fill="url(#goldGrad)" stroke="#b45309" stroke-width="1.5" />
            <!-- Radiant Tiara & Honey Hair -->
            <path d="M36 68 C26 95 30 135 44 155 C30 120 38 85 48 68 Z" fill="#d97706" />
            <path d="M106 68 C116 95 112 135 98 155 C112 120 104 85 94 68 Z" fill="#d97706" />
            <path d="M52 56 C52 42 60 36 71 36 C82 36 90 42 90 56 C90 74 80 84 71 84 C62 84 52 74 52 56 Z" fill="#fed7aa" />
            <ellipse cx="63" cy="58" rx="2" ry="1.4" fill="#92400e" />
            <ellipse cx="79" cy="58" rx="2" ry="1.4" fill="#92400e" />
            <path d="M65 71 Q71 74 77 71" stroke="#b45309" stroke-width="1.5" fill="none" />
            <path d="M50 48 L46 22 L56 34 L71 14 L86 34 L96 22 L92 48 Z" fill="url(#goldGrad)" stroke="#92400e" stroke-width="1" />
            <circle cx="71" cy="20" r="2.5" fill="#f59e0b" />
          </svg>
        </div>
      `;
    }

    if (suit === 'clubs') {
      return `
        <div class="art-layer character-art court-portrait">
          <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
            <rect width="140" height="215" fill="url(#forestAura)" />
            <!-- Glowing Verdant Spear / Bow -->
            <line x1="120" y1="50" x2="65" y2="200" stroke="#86efac" stroke-width="2.5" stroke-linecap="round" />
            <polygon points="120,45 125,58 115,58" fill="#4ade80" stroke="#fef08a" stroke-width="1" />
            <!-- Leaf & Cuirass Armor -->
            <path d="M26 215 C28 150 44 130 70 130 C96 130 114 150 116 215 Z" fill="#14532d" />
            <path d="M38 215 C46 165 54 142 70 142 C86 142 94 165 102 215 Z" fill="#854d0e" stroke="#22c55e" stroke-width="1.2" />
            <!-- Antler / Bramble Foliage Crown -->
            <path d="M48 68 C36 95 34 135 46 155 C32 120 40 85 48 68 Z" fill="#451a03" />
            <path d="M94 68 C106 95 104 135 92 155 C106 120 98 85 94 68 Z" fill="#451a03" />
            <path d="M52 56 C52 42 60 36 70 36 C80 36 88 42 88 56 C88 74 78 84 70 84 C62 84 52 74 52 56 Z" fill="#fed7aa" />
            <ellipse cx="62" cy="58" rx="2" ry="1.4" fill="#14532d" />
            <ellipse cx="78" cy="58" rx="2" ry="1.4" fill="#14532d" />
            <path d="M64 71 Q70 74 76 71" stroke="#b91c1c" stroke-width="1.5" fill="none" />
            <path d="M48 50 L42 28 L54 38 L70 20 L86 38 L98 28 L92 50 Z" fill="#15803d" stroke="url(#goldGrad)" stroke-width="1.2" />
          </svg>
        </div>
      `;
    }

    // QUEEN OF SPADES (Sorceress of Shadows)
    return `
      <div class="art-layer character-art court-portrait">
        <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
          <rect width="140" height="215" fill="url(#sorceressGlow)" />
          <!-- Arcane Sphere with Violet Trails -->
          <circle cx="108" cy="90" r="16" fill="#c084fc" opacity="0.5" />
          <circle cx="108" cy="90" r="8" fill="#fdf4ff" opacity="0.9" />
          <!-- Gown & Lace Brocade -->
          <path d="M22 215 C26 150 44 125 70 125 C96 125 114 150 118 215 Z" fill="#240e3b" />
          <path d="M36 215 C44 165 54 140 70 140 C86 140 96 165 104 215 Z" fill="#f5d0fe" stroke="#a855f7" stroke-width="1" />
          <!-- Gothic Crown & Cascading Dark Curls -->
          <path d="M28 65 C18 100 24 145 38 165 C26 130 32 90 46 70 Z" fill="#1c1917" />
          <path d="M112 65 C122 100 116 145 102 165 C114 130 108 90 94 70 Z" fill="#1c1917" />
          <path d="M52 56 C52 42 60 36 70 36 C80 36 88 42 88 56 C88 74 78 84 70 84 C62 84 52 74 52 56 Z" fill="#ffedd5" />
          <ellipse cx="62" cy="58" rx="2" ry="1.4" fill="#4c1d95" />
          <ellipse cx="78" cy="58" rx="2" ry="1.4" fill="#4c1d95" />
          <path d="M64 71 Q70 74 76 71" stroke="#a855f7" stroke-width="1.5" fill="none" />
          <path d="M50 52 L48 30 L58 40 L70 22 L82 40 L92 30 L90 52 Z" fill="url(#goldGrad)" stroke="#4c1d95" stroke-width="1" />
        </svg>
      </div>
    `;
  }

  /**
   * Suit-Specific Dark Fantasy Court Portraits (King, Queen, Jack)
   */
  private static getCourtPortraitSvg(rank: number, suit: Suit, color: 'red' | 'black'): string {
    if (rank === 12) {
      return this.getQueenPortraitSvg(suit);
    }

    const auraMap: Record<Suit, string> = {
      hearts: 'heartRedAura',
      spades: 'sorceressGlow',
      diamonds: 'solarAura',
      clubs: 'forestAura'
    };
    const auraId = auraMap[suit];
    const isRed = color === 'red';

    if (rank === 13) {
      // KING: Flowing Ermine Robe, Glowing Crystalline Magic Blade, Sovereign Gold Crown & Bearded Face
      const robeFill = suit === 'hearts' ? '#450a0a' : suit === 'diamonds' ? '#78350f' : suit === 'clubs' ? '#14532d' : '#172554';
      const bladeColor = suit === 'hearts' ? '#f87171' : suit === 'diamonds' ? '#fde047' : suit === 'clubs' ? '#4ade80' : '#38bdf8';
      return `
        <div class="art-layer character-art court-portrait">
          <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
            <rect width="140" height="215" fill="url(#${auraId})" />
            <!-- Flowing Ermine Robe -->
            <path d="M10 215 C15 130 30 110 70 110 C110 110 125 130 130 215 Z" fill="${robeFill}" />
            <path d="M25 215 C35 140 50 120 70 120 C90 120 105 140 115 215 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
            <ellipse cx="46" cy="168" rx="2.2" ry="4.5" fill="#1e293b" />
            <ellipse cx="94" cy="168" rx="2.2" ry="4.5" fill="#1e293b" />
            <circle cx="70" cy="138" r="5" fill="#b91c1c" stroke="url(#goldGrad)" stroke-width="1.8" />
            <!-- Glowing Crystalline Magic Blade -->
            <line x1="124" y1="54" x2="60" y2="188" stroke="${bladeColor}" stroke-width="4.5" stroke-linecap="round" opacity="0.85" />
            <line x1="124" y1="54" x2="60" y2="188" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" />
            <!-- Bearded King Hair & Face -->
            <path d="M44 65 C42 98 54 118 70 118 C86 118 98 98 96 65 Z" fill="#3e2723" />
            <path d="M52 62 C52 49 60 41 70 41 C80 41 88 49 88 62 C88 80 78 94 70 94 C62 94 52 80 52 62 Z" fill="#fed7aa" />
            <path d="M48 76 C50 104 60 116 70 116 C80 116 90 104 92 76 C84 84 77 86 70 86 C63 86 56 84 48 76 Z" fill="#3e2723" />
            <ellipse cx="62" cy="61" rx="2.2" ry="1.6" fill="#1c1917" />
            <ellipse cx="78" cy="61" rx="2.2" ry="1.6" fill="#1c1917" />
            <!-- Sovereign Gold Crown -->
            <path d="M48 56 L45 33 L58 45 L70 27 L82 45 L95 33 L92 56 Z" fill="url(#goldGrad)" stroke="#92400e" stroke-width="1.2" />
            <circle cx="70" cy="44" r="2.8" fill="#dc2626" />
          </svg>
        </div>
      `;
    }

    // JACK: Rogue Concealed Dagger, Crimson/Forest/Midnight Leather Armor Tunic & Gold Circlet
    const cloakFill = isRed ? '#5c1d1d' : suit === 'clubs' ? '#14532d' : '#1e293b';
    return `
      <div class="art-layer character-art court-portrait">
        <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
          <rect width="140" height="215" fill="url(#${auraId})" />
          <!-- Rogue Gleaming Dagger -->
          <line x1="110" y1="126" x2="118" y2="194" stroke="#cbd5e1" stroke-width="3.2" stroke-linecap="round" />
          <line x1="101" y1="143" x2="119" y2="143" stroke="url(#goldGrad)" stroke-width="2.4" stroke-linecap="round" />
          <!-- Leather Armor & Tunic -->
          <path d="M20 215 C25 144 40 122 70 122 C100 122 115 144 120 215 Z" fill="${cloakFill}" />
          <path d="M35 215 L45 135 L95 135 L105 215 Z" fill="#78350f" stroke="url(#goldGrad)" stroke-width="1.4" />
          <polygon points="70,142 77,154 70,166 63,154" fill="#b91c1c" stroke="url(#goldGrad)" stroke-width="1.2" />
          <!-- Face -->
          <path d="M52 58 C52 45 60 38 70 38 C80 38 88 45 88 58 C88 76 78 85 70 85 C62 85 52 76 52 58 Z" fill="#fed7aa" />
          <ellipse cx="62" cy="59" rx="2" ry="1.5" fill="#451a03" />
          <ellipse cx="78" cy="59" rx="2" ry="1.5" fill="#451a03" />
          <path d="M64 73 Q71 76 77 72" stroke="#7c2d12" stroke-width="1.5" fill="none" />
          <!-- Tousled Hair & Gold Circlet -->
          <path d="M44 50 C42 29 58 24 70 24 C84 24 96 29 94 50 C88 41 82 43 78 40 C70 38 60 42 54 45 Z" fill="#451a03" />
          <path d="M50 47 Q70 41 90 47" stroke="url(#goldGrad)" stroke-width="2.5" fill="none" />
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
      return this.getCourtPortraitSvg(card.rank, card.suit, color);
    }

    // ACE: Glowing Stellar Nebula + Sparkling Particles + Ornate Gold Filigree Suit Crest
    if (card.rank === 1) {
      const nebulaId = color === 'red' ? 'rubyNebula' : 'nebulaGlow';
      const innerKnotStroke = color === 'red' ? '#fda4af' : '#7dd3fc';
      return `
        <div class="art-layer ace-art-layer">
          <svg viewBox="0 0 140 215" class="ace-crest-svg" aria-hidden="true">
            <circle cx="70" cy="110" r="62" fill="url(#${nebulaId})" />
            <circle cx="48" cy="72" r="1.5" fill="#e0f2fe" opacity="0.85" />
            <circle cx="95" cy="85" r="1.3" fill="#fce082" opacity="0.9" />
            <circle cx="45" cy="135" r="1.2" fill="#e0f2fe" opacity="0.75" />
            <circle cx="86" cy="145" r="1.8" fill="#fce082" opacity="0.85" />
            <circle cx="70" cy="110" r="34" fill="none" stroke="url(#goldGrad)" stroke-width="1.2" stroke-dasharray="4 2" opacity="0.78" />
            <path d="M70 68 Q82 88 88 110 Q70 120 70 98 Q70 120 52 110 Q58 88 70 68 Z" fill="none" stroke="${innerKnotStroke}" stroke-width="1.4" opacity="0.75" />
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

  private static getFrontMarkup(card: Card): string {
    const cached = this.frontMarkupCache.get(card.id);
    if (cached) return cached;

    const color = getSuitColor(card.suit);
    const rankLabel = getRankLabel(card.rank);
    const suitGlyphMarkup = this.getSuitGlyphSvg(card.suit, 'suit-glyph');
    const topRightPipMarkup = this.getSuitGlyphSvg(card.suit, 'top-pip-svg');
    const artLayerMarkup = this.getArtLayer(card, color);
    const filigreeFrameMarkup = this.getFiligreeFrameSvg();

    const markup = `
      <div class="card-inner">
        <!-- 1. Top-Left Corner Index -->
        <div class="card-corner corner-top index-corner index-top">
          <span class="corner-rank rank-glyph">${rankLabel}</span>
          <span class="corner-suit">${suitGlyphMarkup}</span>
        </div>

        <!-- Top-Right Suit Pip for Tableau Cascade Visibility -->
        <div class="card-top-pip">${topRightPipMarkup}</div>

        <!-- 2. Character Portrait & Elemental Lighting Layer -->
        ${artLayerMarkup}

        <!-- Vignette & Atmospheric Glow -->
        <div class="art-vignette"></div>

        <!-- 3. Gilded Celtic Filigree Frame Overlay -->
        ${filigreeFrameMarkup}

        <!-- 4. Bottom-Right Inverted Index -->
        <div class="card-corner corner-bottom index-corner index-bottom">
          <span class="corner-rank rank-glyph">${rankLabel}</span>
          <span class="corner-suit">${suitGlyphMarkup}</span>
        </div>
      </div>
    `;

    this.frontMarkupCache.set(card.id, markup);
    return markup;
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

    if (!card.faceUp) {
      el.innerHTML = this.backMarkupCache;
      return el;
    }

    const color = getSuitColor(card.suit);
    el.classList.add(`color-${color}`);

    const frontMarkup = this.getFrontMarkup(card);

    if (animState?.isFlipping) {
      el.innerHTML = `
        <div class="card-flipper">
          <div class="card-flip-front">${frontMarkup}</div>
          <div class="card-flip-back">${this.backMarkupCache}</div>
        </div>
      `;
    } else {
      el.innerHTML = frontMarkup;
    }

    return el;
  }
}
