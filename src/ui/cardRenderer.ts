import { Card, Suit } from '../game/types';
import { getSuitColor, getRankLabel } from '../game/deck';

export type DeckPackId =
  | 'fantasy'
  | 'greek'
  | 'pinup'
  | 'hentai'
  | 'kamasutra'
  | 'classic'
  | 'modern'
  | 'midnight'
  | 'crown';

const CUSTOM_ART_PACKS = new Set<string>(['greek', 'pinup', 'hentai', 'kamasutra']);

export class CardRenderer {
  private static frontMarkupCache = new Map<string, string>();
  private static preloadedDecks = new Set<string>();
  private static preloadedImages: HTMLImageElement[] = [];
  private static currentDeck: DeckPackId =
    ((typeof localStorage !== 'undefined' && localStorage.getItem('solitaire_card_style_v2')) as DeckPackId) || 'fantasy';

  private static backMarkupCache = `
    <div class="card-back">
      <div class="card-back-pattern">
        <span class="card-back-emblem"></span>
      </div>
    </div>
  `;

  static {
    if (typeof window !== 'undefined') {
      this.preloadDeck(this.currentDeck);
    }
  }

  public static setDeck(deck: string): void {
    const normalized = (deck || 'fantasy') as DeckPackId;
    if (this.currentDeck !== normalized) {
      this.currentDeck = normalized;
      this.frontMarkupCache.clear();
    }
    this.preloadDeck(normalized);
  }

  public static getDeck(): DeckPackId {
    return this.currentDeck;
  }

  private static getCourtImageSrc(deck: string, role: string, suit: Suit): string {
    if (CUSTOM_ART_PACKS.has(deck)) {
      return `/cards/${deck}/${role}-${suit}.jpg`;
    }
    return `/cards/${role}-${suit}.jpg`;
  }

  public static preloadDeck(deck: string): void {
    if (typeof window === 'undefined') return;
    const packKey = CUSTOM_ART_PACKS.has(deck) ? deck : 'fantasy';
    if (this.preloadedDecks.has(packKey)) return;
    this.preloadedDecks.add(packKey);

    const roles = ['king', 'queen', 'jack'];
    const suits: Suit[] = ['hearts', 'spades', 'diamonds', 'clubs'];
    for (const role of roles) {
      for (const suit of suits) {
        const img = new Image();
        img.decoding = 'async';
        img.src = this.getCourtImageSrc(packKey, role, suit);
        this.preloadedImages.push(img);
      }
    }
  }

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

  private static getCourtPortraitMarkup(rank: number, suit: Suit): string {
    const role = rank === 13 ? 'king' : rank === 12 ? 'queen' : 'jack';
    const src = this.getCourtImageSrc(this.currentDeck, role, suit);
    return `
      <div class="art-layer character-art court-portrait">
        <img class="court-oil-painting" src="${src}" alt="" decoding="async" draggable="false" />
      </div>
    `;
  }

  private static getArtLayer(card: Card, color: 'red' | 'black'): string {
    if (card.rank >= 11 && card.rank <= 13) {
      return this.getCourtPortraitMarkup(card.rank, card.suit);
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
    const cacheKey = `${this.currentDeck}:${card.id}`;
    const cached = this.frontMarkupCache.get(cacheKey);
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

    this.frontMarkupCache.set(cacheKey, markup);
    return markup;
  }

  public static createCardElement(
    card: Card,
    isDragging: boolean = false,
    animState?: { isFlipping?: boolean; isDealing?: boolean; dealDelayMs?: number; isMoving?: boolean }
  ): HTMLElement {
    const el = document.createElement('div');
    const isCourtCard = card.rank >= 11 && card.rank <= 13;
    const classes = [
      'card',
      'card-gilded',
      'theme-fantasy',
      `pack-${this.currentDeck}`,
      card.faceUp ? 'face-up' : 'face-down'
    ];
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
