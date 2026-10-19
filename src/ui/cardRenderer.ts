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
   * HIGH-DETAIL REALISTIC DARK FANTASY QUEEN PORTRAITS
   */
  private static getQueenPortraitSvg(suit: Suit): string {
    if (suit === 'hearts') {
      return `
        <div class="art-layer character-art court-portrait">
          <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
            <rect width="140" height="215" fill="url(#heartRedAura)" />
            <!-- Glowing Ruby Staff -->
            <line x1="24" y1="50" x2="35" y2="200" stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" />
            <circle cx="24" cy="46" r="11" fill="#dc2626" opacity="0.8" />
            <polygon points="24,35 32,46 24,57 16,46" fill="#ef4444" stroke="#fef08a" stroke-width="1.2" />
            
            <!-- Realistic Empress Gown & Ermine Trim -->
            <path d="M22 215 C26 145 42 120 70 120 C98 120 114 145 118 215 Z" fill="#581c87" />
            <path d="M36 215 C44 155 52 132 70 132 C88 132 96 155 104 215 Z" fill="#991b1b" stroke="url(#goldGrad)" stroke-width="1.6" />
            <path d="M34 148 C42 122 56 116 70 116 C84 116 98 122 106 148 L96 148 C90 134 82 128 70 128 C58 128 50 134 44 148 Z" fill="#f8fafc" />
            
            <!-- Detailed Face & Expression -->
            <path d="M50 54 C50 38 58 30 70 30 C82 30 90 38 90 54 C90 74 80 84 70 84 C60 84 50 74 50 54 Z" fill="#fcd34d" opacity="0.3" />
            <path d="M52 56 C52 42 60 34 70 34 C80 34 88 42 88 56 C88 74 78 82 70 82 C62 82 52 74 52 56 Z" fill="#ffedd5" />
            <path d="M56 46 Q62 43 66 47" stroke="#b91c1c" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <path d="M74 47 Q78 43 84 46" stroke="#b91c1c" stroke-width="1.5" fill="none" stroke-linecap="round" />
            <ellipse cx="61" cy="53" rx="2.2" ry="1.6" fill="#7f1d1d" />
            <ellipse cx="79" cy="53" rx="2.2" ry="1.6" fill="#7f1d1d" />
            <path d="M64 68 Q70 73 76 68" stroke="#991b1b" stroke-width="1.6" fill="none" stroke-linecap="round" />
            
            <!-- Platinum Waves & Ornate Ruby Tiara -->
            <path d="M38 66 C28 95 32 140 45 160 C32 125 40 85 50 64 Z" fill="#f1f5f9" />
            <path d="M102 66 C112 95 110 140 98 160 C110 125 102 85 90 64 Z" fill="#f1f5f9" />
            <path d="M48 44 L44 20 L56 32 L70 12 L84 32 L96 20 L92 44 Z" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1.2" />
            <circle cx="70" cy="18" r="3" fill="#dc2626" />
          </svg>
        </div>
      `;
    }

    if (suit === 'spades') {
      return `
        <div class="art-layer character-art court-portrait">
          <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
            <rect width="140" height="215" fill="url(#sorceressGlow)" />
            <!-- Arcane Levitating Sphere -->
            <circle cx="106" cy="84" r="18" fill="#c084fc" opacity="0.55" />
            <circle cx="106" cy="84" r="8" fill="#fdf4ff" opacity="0.95" />
            
            <!-- Gothic Gown & Lace Brocade -->
            <path d="M20 215 C25 145 42 120 70 120 C98 120 115 145 120 215 Z" fill="#1e1b4b" />
            <path d="M34 215 C42 160 52 136 70 136 C88 136 98 160 106 215 Z" fill="#311042" stroke="#a855f7" stroke-width="1.2" />
            
            <!-- Face & Mysterious Gaze -->
            <path d="M52 56 C52 42 60 34 70 34 C80 34 88 42 88 56 C88 74 78 82 70 82 C62 82 52 74 52 56 Z" fill="#fed7aa" />
            <ellipse cx="61" cy="55" rx="2.2" ry="1.6" fill="#581c87" />
            <ellipse cx="79" cy="55" rx="2.2" ry="1.6" fill="#581c87" />
            <path d="M64 69 Q70 73 76 69" stroke="#6b21a8" stroke-width="1.6" fill="none" stroke-linecap="round" />
            
            <!-- Gothic Crown & Cascading Raven Hair -->
            <path d="M26 62 C16 95 22 140 36 162 C24 125 30 85 44 62 Z" fill="#09090b" />
            <path d="M114 62 C124 95 118 140 104 162 C116 125 110 85 96 62 Z" fill="#09090b" />
            <path d="M48 48 L46 26 L56 36 L70 18 L84 36 L94 26 L92 48 Z" fill="url(#goldGrad)" stroke="#4c1d95" stroke-width="1.2" />
          </svg>
        </div>
      `;
    }

    if (suit === 'diamonds') {
      return `
        <div class="art-layer character-art court-portrait">
          <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
            <rect width="140" height="215" fill="url(#solarAura)" />
            <!-- Radiant Floating Crystal Prism -->
            <polygon points="106,82 116,66 126,82 116,98" fill="#fef08a" stroke="#d97706" stroke-width="1.8" />
            <line x1="94" y1="82" x2="138" y2="82" stroke="#fde047" stroke-width="1.2" opacity="0.75" />
            <line x1="116" y1="56" x2="116" y2="108" stroke="#fde047" stroke-width="1.2" opacity="0.75" />
            
            <!-- Gilded Filigree Corset Armor -->
            <path d="M24 215 C28 145 44 120 70 120 C96 120 112 145 116 215 Z" fill="#78350f" />
            <path d="M38 215 C46 158 54 135 70 135 C86 135 94 158 102 215 Z" fill="url(#goldGrad)" stroke="#b45309" stroke-width="1.6" />
            
            <!-- Face -->
            <path d="M52 56 C52 42 60 34 70 34 C80 34 88 42 88 56 C88 74 78 82 70 82 C62 82 52 74 52 56 Z" fill="#fed7aa" />
            <ellipse cx="61" cy="55" rx="2.2" ry="1.6" fill="#78350f" />
            <ellipse cx="79" cy="55" rx="2.2" ry="1.6" fill="#78350f" />
            <path d="M64 69 Q70 73 76 69" stroke="#b45309" stroke-width="1.6" fill="none" stroke-linecap="round" />
            
            <!-- Honey Waves & Radiant Sun Tiara -->
            <path d="M34 66 C24 95 28 138 42 158 C28 120 36 85 46 66 Z" fill="#d97706" />
            <path d="M106 66 C116 95 112 138 98 158 C112 120 104 85 94 66 Z" fill="#d97706" />
            <path d="M48 46 L44 20 L54 32 L70 12 L86 32 L96 20 L92 46 Z" fill="url(#goldGrad)" stroke="#92400e" stroke-width="1.2" />
            <circle cx="70" cy="18" r="3" fill="#f59e0b" />
          </svg>
        </div>
      `;
    }

    // Clubs
    return `
      <div class="art-layer character-art court-portrait">
        <svg viewBox="0 0 140 215" preserveAspectRatio="xMidYMax meet" class="royal-svg" aria-hidden="true">
          <rect width="140" height="215" fill="url(#forestAura)" />
          <!-- Glowing Verdant Spear -->
          <line x1="120" y1="46" x2="62" y2="204" stroke="#86efac" stroke-width="3" stroke-linecap="round" />
          <polygon points="120,40 126,55 114,55" fill="#4ade80" stroke="#fef08a" stroke-width="1.2" />
          
          <!-- Leaf & Cuirass Armor -->
          <path d="M24 215 C26 145 42 120 70 120 C98 120 114 145 116 215 Z" fill="#14532d" />
          <path d="M36 215 C44 158 52 136 70 136 C88 136 96 158 104 215 Z" fill="#854d0e" stroke="#22c55e" stroke-width="1.4" />
          
          <!-- Face -->
          <path d="M52 56 C52 42 60 34 70 34 C80 34 88 42 88 56 C88 74 78 82 70 82 C62 82 52 74 52 56 Z" fill="#fed7aa" />
          <ellipse cx="61" cy="55" rx="2.2" ry="1.6" fill="#14532d" />
          <ellipse cx="79" cy="55" rx="2.2" ry="1.6" fill="#14532d" />
          <path d="M64 69 Q70 73 76 69" stroke="#15803d" stroke-width="1.6" fill="none" stroke-linecap="round" />
          
          <!-- Antler / Bramble Foliage Crown -->
          <path d="M46 66 C34 95 32 138 44 158 C30 120 38 85 46 66 Z" fill="#451a03" />
          <path d="M94 66 C106 95 104 138 92 158 C106 120 98 85 94 66 Z" fill="#451a03" />
          <path d="M46 48 L40 24 L52 36 L70 16 L88 36 L100 24 L94 48 Z" fill="#15803d" stroke="url(#goldGrad)" stroke-width="1.2" />
        </svg>
      </div>
    `;
  }

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

    // JACK: Rogue Concealed Dagger, Leather Armor & Gold Circlet
    const cloakFill = color === 'red' ? '#5c1d1d' : suit === 'clubs' ? '#14532d' : '#1e293b';
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

  private static getArtLayer(card: Card, color: 'red' | 'black'): string {
    if (card.rank >= 11 && card.rank <= 13) {
      return this.getCourtPortraitSvg(card.rank, card.suit, color);
    }

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
        <div class="card-corner corner-top index-corner index-top">
          <span class="corner-rank rank-glyph">${rankLabel}</span>
          <span class="corner-suit">${suitGlyphMarkup}</span>
        </div>
        <div class="card-top-pip">${topRightPipMarkup}</div>
        ${artLayerMarkup}
        <div class="art-vignette"></div>
        ${filigreeFrameMarkup}
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
