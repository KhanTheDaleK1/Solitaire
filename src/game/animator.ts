import confetti from 'canvas-confetti';
import { Card } from './types';
import { SUIT_SYMBOLS, getSuitColor, getRankLabel } from './deck';

interface BouncingCard {
  card: Card;
  x: number;
  y: number;
  dx: number;
  dy: number;
  width: number;
  height: number;
}

export class WinAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private animationFrameId: number | null = null;
  private activeBouncers: BouncingCard[] = [];
  private cardQueue: { card: Card; startX: number; startY: number }[] = [];
  private isRunning: boolean = false;
  private onBounce?: (pitchIdx: number) => void;
  private bounceCount: number = 0;

  constructor(canvas: HTMLCanvasElement, onBounce?: (pitchIdx: number) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onBounce = onBounce;
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  public startCascade(foundationCards: Card[][], foundationRects: DOMRect[]): void {
    this.stop();
    this.canvas.classList.remove('hidden');
    this.resize();
    this.isRunning = true;
    this.bounceCount = 0;

    // Trigger celebratory confetti burst
    this.triggerConfetti();

    // Collect cards from foundation top-down (Kings down to Aces)
    this.cardQueue = [];
    for (let rank = 13; rank >= 1; rank--) {
      for (let f = 0; f < 4; f++) {
        const pile = foundationCards[f];
        const card = pile.find(c => c.rank === rank);
        if (card && foundationRects[f]) {
          this.cardQueue.push({
            card,
            startX: foundationRects[f].left,
            startY: foundationRects[f].top
          });
        }
      }
    }

    // Launch first card
    this.launchNextCard();
    this.loop();
  }

  private launchNextCard(): void {
    if (this.cardQueue.length === 0) return;
    const item = this.cardQueue.shift()!;
    const cardWidth = Math.min(window.innerWidth * 0.12, 70);
    const cardHeight = cardWidth * 1.4;

    this.activeBouncers.push({
      card: item.card,
      x: item.startX,
      y: item.startY,
      dx: (Math.random() - 0.5) * 8 + (Math.random() > 0.5 ? 4 : -4),
      dy: -(Math.random() * 4 + 2),
      width: cardWidth,
      height: cardHeight
    });
  }

  private triggerConfetti(): void {
    const end = Date.now() + 3000;
    const colors = ['#fbbf24', '#22c55e', '#ef4444', '#3b82f6', '#f8fafc'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }

  private loop = (): void => {
    if (!this.isRunning || !this.ctx) return;

    // 2D kinematic loop: x_{t+1} = x_t + v_x, y_{t+1} = y_t + v_y, v_y = v_y + g
    // With floor restitution e = -0.75
    const gravity = 0.5;
    const restitution = 0.75;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    for (let i = this.activeBouncers.length - 1; i >= 0; i--) {
      const b = this.activeBouncers[i];

      // Draw the card without clearing buffer (creating classic trail painting waterfall effect)
      this.drawCard(b);

      b.x += b.dx;
      b.y += b.dy;
      b.dy += gravity;

      // Bounce off floor
      if (b.y + b.height >= screenH) {
        b.y = screenH - b.height;
        b.dy = -b.dy * restitution;

        // Trigger arpeggio chime synced to bounce
        this.bounceCount++;
        this.onBounce?.(this.bounceCount);

        // Launch next card on bounce
        if (this.cardQueue.length > 0 && this.activeBouncers.length < 6) {
          this.launchNextCard();
        }
      }

      // Remove when off sides
      if (b.x < -b.width || b.x > screenW + b.width) {
        this.activeBouncers.splice(i, 1);
        if (this.cardQueue.length > 0) {
          this.launchNextCard();
        }
      }
    }

    if (this.activeBouncers.length > 0 || this.cardQueue.length > 0) {
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  };

  private drawCard(b: BouncingCard): void {
    if (!this.ctx) return;
    const { x, y, width, height, card } = b;
    const radius = 6;
    // MobilityWare color palette: #e60000 crimson, #121212 deep onyx
    const color = getSuitColor(card.suit) === 'red' ? '#e60000' : '#121212';

    this.ctx.save();
    // Card stock: #F8F9FA with drop shadow #1A1A1A
    this.ctx.shadowColor = 'rgba(26, 26, 26, 0.4)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetY = 2;

    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.strokeStyle = '#d1d5db';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
    this.ctx.fill();
    this.ctx.stroke();

    // Reset shadow for text rendering
    this.ctx.shadowColor = 'transparent';

    // Corner label & suit
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${Math.max(10, width * 0.22)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.fillText(getRankLabel(card.rank), x + 4, y + width * 0.25);
    this.ctx.fillText(SUIT_SYMBOLS[card.suit], x + 4, y + width * 0.48);

    // Center Suit Symbol
    this.ctx.font = `${width * 0.45}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(SUIT_SYMBOLS[card.suit], x + width / 2, y + height / 2 + width * 0.15);

    this.ctx.restore();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.activeBouncers = [];
    this.cardQueue = [];
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.canvas.classList.add('hidden');
  }
}
