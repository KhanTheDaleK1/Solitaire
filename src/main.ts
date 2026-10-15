import { SolitaireEngine } from './game/engine';
import { SoundManager } from './game/sound';
import { WinAnimator } from './game/animator';
import { CardRenderer } from './ui/cardRenderer';
import { DragDropManager } from './game/dragDrop';
import { AuthService } from './auth/authService';
import { StatsManager } from './auth/statsSync';
import { GameState, DrawMode } from './game/types';

class SolitaireApp {
  private engine: SolitaireEngine;
  private sound: SoundManager;
  private animator: WinAnimator;
  private dragDrop: DragDropManager;
  private auth: AuthService;
  private statsManager: StatsManager;
  private timerInterval: number | null = null;
  private autoFinishInterval: number | null = null;

  // DOM Elements
  private stockPileEl: HTMLElement;
  private wastePileEl: HTMLElement;
  private foundationEls: HTMLElement[];
  private tableauEls: HTMLElement[];
  private scoreEl: HTMLElement;
  private timeEl: HTMLElement;
  private movesEl: HTMLElement;
  private autoFinishBtn: HTMLElement;
  private modalContainer: HTMLElement;
  private winModal: HTMLElement;
  private settingsModal: HTMLElement;
  private statsModal: HTMLElement;
  private authModal: HTMLElement;

  constructor() {
    this.engine = new SolitaireEngine(1);
    this.sound = new SoundManager();
    this.auth = new AuthService();
    this.statsManager = new StatsManager();

    const canvas = document.getElementById('win-canvas') as HTMLCanvasElement;
    this.animator = new WinAnimator(canvas);

    const dragLayer = document.getElementById('drag-layer') as HTMLElement;
    this.dragDrop = new DragDropManager(this.engine, this.sound, dragLayer);

    // Cache DOM
    this.stockPileEl = document.getElementById('pile-stock')!;
    this.wastePileEl = document.getElementById('pile-waste')!;
    this.foundationEls = [
      document.getElementById('foundation-0')!,
      document.getElementById('foundation-1')!,
      document.getElementById('foundation-2')!,
      document.getElementById('foundation-3')!
    ];
    this.tableauEls = Array.from({ length: 7 }, (_, i) => document.getElementById(`tableau-${i}`)!);
    this.scoreEl = document.getElementById('stat-score')!;
    this.timeEl = document.getElementById('stat-time')!;
    this.movesEl = document.getElementById('stat-moves')!;
    this.autoFinishBtn = document.getElementById('btn-auto-finish')!;
    this.modalContainer = document.getElementById('modal-container')!;
    this.winModal = document.getElementById('modal-victory')!;
    this.settingsModal = document.getElementById('modal-settings')!;
    this.statsModal = document.getElementById('modal-stats')!;
    this.authModal = document.getElementById('modal-auth')!;

    this.initEventListeners();
    this.initTimer();
    this.initPWA();

    // Subscribe to engine state
    this.engine.subscribe((state) => this.render(state));

    // Subscribe to auth state
    this.auth.subscribe((user) => this.renderAuth(user));

    window.addEventListener('resize', () => {
      this.animator.resize();
      this.render(this.engine.state);
    });
  }

  private initEventListeners(): void {
    // Stock draw
    this.stockPileEl.addEventListener('click', () => {
      if (this.engine.drawCards()) {
        this.sound.playCardFlip();
      }
    });

    // Toolbar buttons
    document.getElementById('btn-new-game')?.addEventListener('click', () => {
      if (this.engine.state.isStarted && !this.engine.state.isWon && this.engine.state.moves > 2) {
        if (!confirm('Start a new game hand? Current progress will count as an unfinished hand.')) {
          return;
        }
        this.statsManager.recordGame(false, this.engine.state.score, this.engine.state.elapsedTime, this.auth.getCurrentUser());
      }
      this.animator.stop();
      this.engine.createNewGame();
      this.sound.playCardFlip();
    });

    document.getElementById('btn-undo')?.addEventListener('click', () => {
      if (this.engine.undo()) {
        this.sound.playCardPlace();
      } else {
        this.sound.playInvalid();
      }
    });

    document.getElementById('btn-hint')?.addEventListener('click', () => {
      const hint = this.engine.getHint();
      if (hint) {
        this.sound.playCardPlace();
        this.highlightHint(hint);
      } else {
        this.sound.playInvalid();
        alert('No obvious moves available. Try drawing cards from the stock pile!');
      }
    });

    this.autoFinishBtn.addEventListener('click', () => {
      this.startAutoFinish();
    });

    // Victory modal Play Again button
    document.getElementById('btn-victory-again')?.addEventListener('click', () => {
      this.closeModals();
      this.animator.stop();
      this.engine.createNewGame();
    });

    // Header buttons (Modals)
    document.getElementById('btn-menu')?.addEventListener('click', () => this.openModal(this.settingsModal));
    document.getElementById('btn-stats')?.addEventListener('click', () => {
      this.renderStatsModal();
      this.openModal(this.statsModal);
    });
    document.getElementById('btn-auth')?.addEventListener('click', () => this.openModal(this.authModal));

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeModals());
    });
    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) {
        this.closeModals();
      }
    });

    // Settings listeners
    document.querySelectorAll('[data-draw]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-draw]').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const drawMode = parseInt(target.dataset.draw || '1', 10) as DrawMode;
        this.engine.state.drawMode = drawMode;
      });
    });

    const toggleSound = document.getElementById('toggle-sound') as HTMLInputElement;
    if (toggleSound) {
      toggleSound.addEventListener('change', () => {
        this.sound.soundEnabled = toggleSound.checked;
      });
    }

    const toggleHaptics = document.getElementById('toggle-haptics') as HTMLInputElement;
    if (toggleHaptics) {
      toggleHaptics.addEventListener('change', () => {
        this.sound.hapticsEnabled = toggleHaptics.checked;
      });
    }

    // Theme pickers
    document.querySelectorAll('.theme-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const theme = target.dataset.theme;
        document.body.className = `theme-${theme}`;
      });
    });

    // OAuth buttons
    document.getElementById('btn-google-login')?.addEventListener('click', async () => {
      try {
        await this.auth.signInGoogle();
      } catch (err) {
        alert('Google Sign-In: ' + (err as Error).message);
      }
    });

    document.getElementById('btn-github-login')?.addEventListener('click', async () => {
      try {
        await this.auth.signInGitHub();
      } catch (err) {
        alert('GitHub Sign-In: ' + (err as Error).message);
      }
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await this.auth.signOut();
    });
  }

  private initTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      if (this.engine.state.isStarted && !this.engine.state.isWon) {
        this.engine.state.elapsedTime++;
        this.updateTimeDisplay();
      }
    }, 1000);
  }

  private updateTimeDisplay(): void {
    const mins = Math.floor(this.engine.state.elapsedTime / 60);
    const secs = this.engine.state.elapsedTime % 60;
    this.timeEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private render(state: GameState): void {
    // Score & Moves
    this.scoreEl.textContent = state.score.toString();
    this.movesEl.textContent = state.moves.toString();
    this.updateTimeDisplay();

    // 1. Stock Pile
    const stockPlaceholder = this.stockPileEl.querySelector('.card-placeholder') as HTMLElement;
    const existingStockCards = this.stockPileEl.querySelectorAll('.card');
    existingStockCards.forEach(c => c.remove());

    if (state.stock.length > 0) {
      stockPlaceholder.classList.add('hidden');
      const topStock = state.stock[state.stock.length - 1];
      const cardEl = CardRenderer.createCardElement(topStock);
      this.stockPileEl.appendChild(cardEl);
    } else {
      stockPlaceholder.classList.remove('hidden');
    }

    // 2. Waste Pile
    const wastePlaceholder = this.wastePileEl.querySelector('.card-placeholder') as HTMLElement;
    const existingWasteCards = this.wastePileEl.querySelectorAll('.card');
    existingWasteCards.forEach(c => c.remove());

    if (state.waste.length > 0) {
      wastePlaceholder.classList.add('hidden');
      // Show top card (or top 3 if Draw 3)
      const visibleCount = state.drawMode === 3 ? Math.min(3, state.waste.length) : 1;
      const startIndex = state.waste.length - visibleCount;

      for (let i = startIndex; i < state.waste.length; i++) {
        const card = state.waste[i];
        const isTop = i === state.waste.length - 1;
        const cardEl = CardRenderer.createCardElement(card);
        const offset = (i - startIndex) * (window.innerWidth < 640 ? 12 : 16);
        cardEl.style.transform = `translateX(${offset}px)`;

        if (isTop) {
          this.dragDrop.registerCard(cardEl, card, { type: 'waste', index: 0 });
        }
        this.wastePileEl.appendChild(cardEl);
      }
    } else {
      wastePlaceholder.classList.remove('hidden');
    }

    // 3. Foundations
    for (let f = 0; f < 4; f++) {
      const fEl = this.foundationEls[f];
      const placeholder = fEl.querySelector('.card-placeholder') as HTMLElement;
      const existingCards = fEl.querySelectorAll('.card');
      existingCards.forEach(c => c.remove());

      const pile = state.foundations[f];
      if (pile.length > 0) {
        placeholder.classList.add('hidden');
        const topCard = pile[pile.length - 1];
        const cardEl = CardRenderer.createCardElement(topCard);
        this.dragDrop.registerCard(cardEl, topCard, { type: 'foundation', index: f });
        fEl.appendChild(cardEl);
      } else {
        placeholder.classList.remove('hidden');
      }
    }

    // 4. Tableau Columns
    const isMobile = window.innerWidth < 640;
    const downOffset = isMobile ? 12 : 16;
    const upOffset = isMobile ? 22 : 28;

    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const colEl = this.tableauEls[colIdx];
      colEl.innerHTML = '';
      const cards = state.tableau[colIdx];
      let currentTop = 0;

      cards.forEach((card) => {
        const cardEl = CardRenderer.createCardElement(card);
        cardEl.style.top = `${currentTop}px`;

        if (card.faceUp) {
          this.dragDrop.registerCard(cardEl, card, { type: 'tableau', index: colIdx });
          currentTop += upOffset;
        } else {
          currentTop += downOffset;
        }

        colEl.appendChild(cardEl);
      });
    }

    // 5. Auto-Finish availability
    if (this.engine.canAutoFinish()) {
      this.autoFinishBtn.classList.remove('hidden');
    } else {
      this.autoFinishBtn.classList.add('hidden');
    }

    // 6. Win check
    if (state.isWon) {
      this.handleGameWon();
    }
  }

  private highlightHint(hint: { from: { type: string; index: number }; to: { type: string; index: number } }): void {
    let fromEl: HTMLElement | null = null;
    let toEl: HTMLElement | null = null;

    if (hint.from.type === 'waste') fromEl = this.wastePileEl.querySelector('.card:last-child');
    if (hint.from.type === 'tableau') fromEl = this.tableauEls[hint.from.index].querySelector('.card:last-child');
    if (hint.to.type === 'foundation') toEl = this.foundationEls[hint.to.index];
    if (hint.to.type === 'tableau') toEl = this.tableauEls[hint.to.index];

    if (fromEl) fromEl.style.filter = 'drop-shadow(0 0 10px #f59e0b) brightness(1.2)';
    if (toEl) toEl.style.filter = 'drop-shadow(0 0 10px #10b981) brightness(1.2)';

    setTimeout(() => {
      if (fromEl) fromEl.style.filter = '';
      if (toEl) toEl.style.filter = '';
    }, 1200);
  }

  private startAutoFinish(): void {
    if (this.autoFinishInterval) clearInterval(this.autoFinishInterval);
    this.autoFinishInterval = window.setInterval(() => {
      const moved = this.engine.autoFinishStep();
      if (moved) {
        this.sound.playCardPlace();
      } else {
        if (this.autoFinishInterval) {
          clearInterval(this.autoFinishInterval);
          this.autoFinishInterval = null;
        }
      }
    }, 120);
  }

  private handleGameWon(): void {
    if (this.winModal.classList.contains('hidden') === false) return; // already showing

    this.sound.playWinFanfare();
    const foundationRects = this.foundationEls.map(el => el.getBoundingClientRect());
    this.animator.startCascade(this.engine.state.foundations, foundationRects);

    // Record stats
    this.statsManager.recordGame(true, this.engine.state.score, this.engine.state.elapsedTime, this.auth.getCurrentUser());

    // Update win modal
    const mins = Math.floor(this.engine.state.elapsedTime / 60);
    const secs = this.engine.state.elapsedTime % 60;
    document.getElementById('v-time')!.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('v-score')!.textContent = this.engine.state.score.toString();
    document.getElementById('v-moves')!.textContent = this.engine.state.moves.toString();

    setTimeout(() => {
      this.openModal(this.winModal);
    }, 1500);
  }

  private openModal(modal: HTMLElement): void {
    this.modalContainer.classList.remove('hidden');
    [this.winModal, this.settingsModal, this.statsModal, this.authModal].forEach(m => m.classList.add('hidden'));
    modal.classList.remove('hidden');
  }

  private closeModals(): void {
    this.modalContainer.classList.add('hidden');
    [this.winModal, this.settingsModal, this.statsModal, this.authModal].forEach(m => m.classList.add('hidden'));
  }

  private renderStatsModal(): void {
    const s = this.statsManager.getStats();
    document.getElementById('stats-played')!.textContent = s.gamesPlayed.toString();
    document.getElementById('stats-won')!.textContent = s.gamesWon.toString();
    const rate = s.gamesPlayed > 0 ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0;
    document.getElementById('stats-win-rate')!.textContent = `${rate}%`;
    document.getElementById('stats-streak')!.textContent = s.currentStreak.toString();
    document.getElementById('stats-best-score')!.textContent = s.bestScore.toString();
    if (s.bestTime !== null) {
      const mins = Math.floor(s.bestTime / 60);
      const secs = s.bestTime % 60;
      document.getElementById('stats-best-time')!.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      document.getElementById('stats-best-time')!.textContent = '--:--';
    }
  }

  private renderAuth(user: ReturnType<typeof this.auth.getCurrentUser>): void {
    const labelEl = document.getElementById('auth-label')!;
    const avatarEl = document.getElementById('auth-avatar')!;
    const loggedInView = document.getElementById('auth-logged-in')!;
    const loggedOutView = document.getElementById('auth-logged-out')!;

    if (user) {
      labelEl.textContent = user.displayName?.split(' ')[0] || 'Player';
      if (user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" />`;
      }
      loggedOutView.classList.add('hidden');
      loggedInView.classList.remove('hidden');

      document.getElementById('user-name')!.textContent = user.displayName || 'Player';
      document.getElementById('user-email')!.textContent = user.email || '';
      document.getElementById('user-provider')!.textContent = user.provider.toUpperCase();
      const userImg = document.getElementById('user-avatar') as HTMLImageElement;
      if (user.photoURL) userImg.src = user.photoURL;
    } else {
      labelEl.textContent = 'Sign In';
      avatarEl.innerHTML = `<svg viewBox="0 0 24 24" class="icon"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
      loggedInView.classList.add('hidden');
      loggedOutView.classList.remove('hidden');
    }
  }

  private initPWA(): void {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new SolitaireApp();
});
