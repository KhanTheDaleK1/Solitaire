import { SolitaireEngine } from './engine';
import { Card, PileLocation } from './types';
import { CardRenderer } from '../ui/cardRenderer';
import { SoundManager } from './sound';

interface DragSession {
  pointerId: number;
  cards: Card[];
  from: PileLocation;
  startPointerX: number;
  startPointerY: number;
  initialElementRects: DOMRect[];
  ghostElements: HTMLElement[];
  sourceElements: HTMLElement[];
  hasMoved: boolean;
  touchOffsetX: number;
  touchOffsetY: number;
}

export class DragDropManager {
  private engine: SolitaireEngine;
  private sound: SoundManager;
  private dragLayer: HTMLElement;
  private currentSession: DragSession | null = null;
  private isPointerDown: boolean = false;
  private disabled: boolean = false;

  constructor(engine: SolitaireEngine, sound: SoundManager, dragLayer: HTMLElement) {
    this.engine = engine;
    this.sound = sound;
    this.dragLayer = dragLayer;

    this.initEvents();
  }

  public setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) {
      this.cancelActiveDrag();
    }
  }

  public cancelActiveDrag(): void {
    if (this.currentSession) {
      this.dragLayer.innerHTML = '';
      this.currentSession.sourceElements.forEach(el => el.classList.remove('is-dragging-source'));
      this.currentSession = null;
    }
    this.isPointerDown = false;
  }

  private initEvents(): void {
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
  }

  public registerCard(cardEl: HTMLElement, card: Card, from: PileLocation): void {
    if (!card.faceUp) return;

    cardEl.addEventListener('pointerdown', (e: PointerEvent) => {
      // Primary button or touch only; ignore if disabled or another pointer is already active
      if (this.disabled || this.isPointerDown || e.button !== 0) return;
      e.stopPropagation();

      // Find all cards from this card downwards in the same pile
      let cardsToDrag: Card[] = [];
      const sourceElements: HTMLElement[] = [];

      if (from.type === 'waste') {
        const topWaste = this.engine.state.waste[this.engine.state.waste.length - 1];
        if (topWaste?.id !== card.id) return;
        cardsToDrag = [card];
        sourceElements.push(cardEl);
      } else if (from.type === 'tableau') {
        const col = this.engine.state.tableau[from.index];
        const cardIndex = col.findIndex(c => c.id === card.id);
        if (cardIndex === -1) return;
        cardsToDrag = col.slice(cardIndex);

        // Collect matching DOM elements
        const parentColEl = cardEl.parentElement;
        if (parentColEl) {
          const allColCards = Array.from(parentColEl.querySelectorAll<HTMLElement>('.card'));
          const startElIdx = allColCards.indexOf(cardEl);
          if (startElIdx !== -1) {
            sourceElements.push(...allColCards.slice(startElIdx));
          }
        }
      } else if (from.type === 'foundation') {
        const pile = this.engine.state.foundations[from.index];
        if (pile[pile.length - 1]?.id !== card.id) return;
        cardsToDrag = [card];
        sourceElements.push(cardEl);
      }

      if (cardsToDrag.length === 0) return;

      const rect = cardEl.getBoundingClientRect();
      this.isPointerDown = true;

      this.currentSession = {
        pointerId: e.pointerId,
        cards: cardsToDrag,
        from,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        initialElementRects: sourceElements.map(el => el.getBoundingClientRect()),
        ghostElements: [],
        sourceElements,
        hasMoved: false,
        touchOffsetX: e.clientX - rect.left,
        touchOffsetY: e.clientY - rect.top
      };

      try {
        cardEl.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for older browsers
      }
    });
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (this.disabled || !this.isPointerDown || !this.currentSession) return;
    if (e.pointerId !== this.currentSession.pointerId) return;

    const dx = e.clientX - this.currentSession.startPointerX;
    const dy = e.clientY - this.currentSession.startPointerY;
    const distance = Math.hypot(dx, dy);

    // If moved past threshold, transition to dragging
    if (!this.currentSession.hasMoved && distance > 6) {
      this.currentSession.hasMoved = true;
      e.preventDefault();

      // Hide original source elements and spawn ghost elements in drag layer
      this.currentSession.sourceElements.forEach(el => el.classList.add('is-dragging-source'));

      this.dragLayer.innerHTML = '';
      this.currentSession.ghostElements = this.currentSession.cards.map((c, idx) => {
        const ghost = CardRenderer.createCardElement(c, true);
        const origRect = this.currentSession!.initialElementRects[idx];
        ghost.style.width = `${origRect.width}px`;
        ghost.style.height = `${origRect.height}px`;
        ghost.style.position = 'absolute';
        ghost.style.pointerEvents = 'none';
        this.dragLayer.appendChild(ghost);
        return ghost;
      });

      this.sound.vibrate(10);
    }

    if (this.currentSession.hasMoved) {
      e.preventDefault();
      // Position ghost stack under pointer with cascading offset
      const baseX = e.clientX - this.currentSession.touchOffsetX;
      const baseY = e.clientY - this.currentSession.touchOffsetY - 10; // Lift up slightly above thumb

      this.currentSession.ghostElements.forEach((ghost, idx) => {
        const cascadeOffset = idx * (window.innerWidth < 640 ? 22 : 30);
        ghost.style.transform = `translate3d(${baseX}px, ${baseY + cascadeOffset}px, 0)`;
      });
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.disabled || !this.isPointerDown || !this.currentSession) return;
    if (e.pointerId !== this.currentSession.pointerId) return;
    this.isPointerDown = false;

    const session = this.currentSession;
    this.currentSession = null;

    // 1. If it was a quick tap (no drag movement)
    if (!session.hasMoved) {
      const moved = this.engine.tryAutoMove(session.cards[0], session.from);
      if (moved) {
        const last = this.engine.state.history[this.engine.state.history.length - 1];
        if (last && last.to.type === 'foundation') {
          this.sound.playFoundationPlaced(session.cards[0].rank);
        } else if (last && last.cardFlipped) {
          this.sound.playCardFlip();
        } else {
          this.sound.playCardPlace();
        }
      } else {
        this.sound.playInvalid();
        this.shakeRejectedCards(session.sourceElements);
      }
      return;
    }

    // 2. Drag drop resolution
    // Clean up drag layer
    this.dragLayer.innerHTML = '';
    session.sourceElements.forEach(el => el.classList.remove('is-dragging-source'));

    // Detect target element under pointer
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    let targetPileLocation: PileLocation | null = null;

    for (const el of elements) {
      const tableauCol = el.closest<HTMLElement>('.tableau-col');
      if (tableauCol && tableauCol.dataset.col !== undefined) {
        targetPileLocation = { type: 'tableau', index: parseInt(tableauCol.dataset.col, 10) };
        break;
      }

      const foundationPile = el.closest<HTMLElement>('.foundation-pile');
      if (foundationPile && foundationPile.id.startsWith('foundation-')) {
        const fIndex = parseInt(foundationPile.id.replace('foundation-', ''), 10);
        targetPileLocation = { type: 'foundation', index: fIndex };
        break;
      }
    }

    if (targetPileLocation) {
      const success = this.engine.moveCards(session.cards, session.from, targetPileLocation);
      if (success) {
        const last = this.engine.state.history[this.engine.state.history.length - 1];
        if (targetPileLocation.type === 'foundation') {
          this.sound.playFoundationPlaced(session.cards[0].rank);
        } else if (last && last.cardFlipped) {
          this.sound.playCardFlip();
        } else {
          this.sound.playCardPlace();
        }
        return;
      }
    }

    // Drop failed or invalid
    this.sound.playInvalid();
    this.shakeRejectedCards(session.sourceElements);
  };

  private shakeRejectedCards(elements: HTMLElement[]): void {
    elements.forEach((el) => {
      el.classList.remove('card-reject-shake');
      void el.offsetWidth;
      el.classList.add('card-reject-shake');
      setTimeout(() => el.classList.remove('card-reject-shake'), 220);
    });
  }

  private onPointerCancel = (e: PointerEvent): void => {
    if (this.currentSession && e.pointerId === this.currentSession.pointerId) {
      this.cancelActiveDrag();
    }
  };
}
