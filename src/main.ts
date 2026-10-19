import { SolitaireEngine } from './game/engine';
import { SoundManager } from './game/sound';
import { WinAnimator } from './game/animator';
import { CardRenderer } from './ui/cardRenderer';
import { DragDropManager } from './game/dragDrop';
import { AuthService } from './auth/authService';
import { StatsManager, MOBILITYWARE_PUZZLES, getPlayerRank } from './auth/statsSync';
import { MobilityWareImporter } from './auth/importer';
import { GameState, DrawMode, ScoringMode, UserStats } from './game/types';
import { formatDate } from './game/dailyChallenge';

class SolitaireApp {
  private engine: SolitaireEngine;
  private sound: SoundManager;
  private animator: WinAnimator;
  private dragDrop: DragDropManager;
  private auth: AuthService;
  private statsManager: StatsManager;
  private timerInterval: number | null = null;
  private autoFinishInterval: number | null = null;
  private autoFinishTimeout: number | null = null;

  // DOM Elements
  private stockPileEl: HTMLElement;
  private stockCountBadgeEl: HTMLElement;
  private wastePileEl: HTMLElement;
  private foundationEls: HTMLElement[];
  private tableauEls: HTMLElement[];
  private scoreEl: HTMLElement;
  private timeEl: HTMLElement;
  private movesEl: HTMLElement;
  private autoFinishBtn: HTMLElement;
  private modalContainer: HTMLElement;
  private playMenuModal: HTMLElement;
  private winModal: HTMLElement;
  private settingsModal: HTMLElement;
  private statsModal: HTMLElement;
  private authModal: HTMLElement;
  private importModal: HTMLElement;
  private calendarModal: HTMLElement;
  private puzzlesModal: HTMLElement;
  private pendingImportStats: UserStats | null = null;

  // Calendar & Puzzle State
  private calYear: number = 2026;
  private calMonth: number = 9; // 0-indexed (9 = October)
  private selectedDate: string = '2026-10-19';
  private activePuzzleId: string = 'autumn_cabin';
  private lastAnimatedTimestamp: number = 0;

  constructor() {
    this.engine = new SolitaireEngine(1);
    this.sound = new SoundManager();
    this.auth = new AuthService();
    this.statsManager = new StatsManager();

    const canvas = document.getElementById('win-canvas') as HTMLCanvasElement;
    this.animator = new WinAnimator(canvas, (pitchIdx) => this.sound.playBounceChime(pitchIdx));

    const dragLayer = document.getElementById('drag-layer') as HTMLElement;
    this.dragDrop = new DragDropManager(this.engine, this.sound, dragLayer);

    // Cache DOM
    this.stockPileEl = document.getElementById('pile-stock')!;
    this.stockCountBadgeEl = document.getElementById('stock-count-badge')!;
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
    this.playMenuModal = document.getElementById('modal-play-menu')!;
    this.winModal = document.getElementById('modal-victory')!;
    this.settingsModal = document.getElementById('modal-settings')!;
    this.statsModal = document.getElementById('modal-stats')!;
    this.authModal = document.getElementById('modal-auth')!;
    this.importModal = document.getElementById('modal-import')!;
    this.calendarModal = document.getElementById('modal-calendar')!;
    this.puzzlesModal = document.getElementById('modal-puzzles')!;

    this.initEventListeners();
    this.initSavedPreferences();
    this.initTimer();
    this.initPWA();
    this.updateHudRankBadge();

    // Subscribe to engine state
    this.engine.subscribe((state) => this.render(state));

    // Subscribe to auth state & sync cloud stats
    this.auth.subscribe((user) => {
      this.renderAuth(user);
      if (user) {
        this.statsManager.syncWithCloud(user).then(() => {
          this.updateHudRankBadge();
        });
      }
    });

    window.addEventListener('resize', () => {
      this.animator.resize();
      this.render(this.engine.state);
    });
  }

  private get allModals(): HTMLElement[] {
    return [
      this.playMenuModal,
      this.winModal,
      this.settingsModal,
      this.statsModal,
      this.authModal,
      this.importModal,
      this.calendarModal,
      this.puzzlesModal
    ];
  }

  private initEventListeners(): void {
    // Stock draw
    this.stockPileEl.addEventListener('click', () => {
      const wasEmpty = this.engine.state.stock.length === 0;
      if (this.engine.drawCards()) {
        if (wasEmpty) {
          this.sound.playStockRecycle();
        } else {
          this.sound.playCardFlip();
        }
      } else {
        this.sound.playInvalid();
      }
    });

    // Bottom Toolbar: Themes & Play Menu
    document.getElementById('btn-open-themes')?.addEventListener('click', () => {
      this.openModal(this.settingsModal);
    });

    document.getElementById('btn-new-game')?.addEventListener('click', () => {
      this.openModal(this.playMenuModal);
    });

    // MobilityWare Play Menu Options
    document.getElementById('btn-deal-winning')?.addEventListener('click', () => {
      this.stopAutoFinish();
      this.recordUnfinishedIfStarted();
      this.closeModals();
      this.animator.stop();
      document.getElementById('daily-banner')?.classList.add('hidden');
      this.engine.createNewGame(this.engine.state.drawMode, false, undefined, true, this.engine.state.scoringMode);
      this.sound.playDealRiffle();
    });

    document.getElementById('btn-deal-random')?.addEventListener('click', () => {
      this.stopAutoFinish();
      this.recordUnfinishedIfStarted();
      this.closeModals();
      this.animator.stop();
      document.getElementById('daily-banner')?.classList.add('hidden');
      this.engine.createNewGame(this.engine.state.drawMode, false, undefined, false, this.engine.state.scoringMode);
      this.sound.playDealRiffle();
    });

    document.getElementById('btn-deal-replay')?.addEventListener('click', () => {
      this.stopAutoFinish();
      this.closeModals();
      this.animator.stop();
      this.engine.restartCurrentDeal();
      this.sound.playDealRiffle();
    });

    document.getElementById('btn-deal-daily')?.addEventListener('click', () => {
      this.stopAutoFinish();
      this.recordUnfinishedIfStarted();
      this.startDailyChallenge(formatDate());
    });

    document.getElementById('btn-undo')?.addEventListener('click', () => {
      this.stopAutoFinish();
      if (this.engine.undo()) {
        this.sound.playCardFlip();
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
        if (this.engine.state.stock.length > 0 || this.engine.state.waste.length > 0) {
          this.stockPileEl.classList.add('hint-glow');
          setTimeout(() => this.stockPileEl.classList.remove('hint-glow'), 1200);
        }
      }
    });

    this.autoFinishBtn.addEventListener('click', () => {
      this.startAutoFinish();
    });

    // Victory modal Play Again button
    document.getElementById('btn-victory-again')?.addEventListener('click', () => {
      this.stopAutoFinish();
      this.closeModals();
      this.animator.stop();
      if (this.engine.state.isDailyChallenge) {
        document.getElementById('daily-banner')?.classList.add('hidden');
      }
      this.engine.createNewGame(this.engine.state.drawMode, false, undefined, true, this.engine.state.scoringMode);
      this.sound.playDealRiffle();
    });

    // Header buttons (Modals)
    document.getElementById('btn-menu')?.addEventListener('click', () => this.openModal(this.settingsModal));
    document.getElementById('btn-stats')?.addEventListener('click', () => {
      this.renderStatsModal();
      this.openModal(this.statsModal);
    });
    document.getElementById('btn-rank-badge')?.addEventListener('click', () => {
      this.renderStatsModal();
      this.openModal(this.statsModal);
    });
    document.getElementById('btn-daily')?.addEventListener('click', () => {
      this.renderCalendarModal();
      this.openModal(this.calendarModal);
    });
    document.getElementById('btn-puzzles')?.addEventListener('click', () => {
      this.renderPuzzlesModal();
      this.openModal(this.puzzlesModal);
    });
    document.getElementById('btn-auth')?.addEventListener('click', () => this.openModal(this.authModal));

    // Puzzle Bonus Piece Claim
    document.getElementById('btn-claim-free-piece')?.addEventListener('click', () => {
      const res = this.statsManager.unlockNextPuzzlePiece(this.activePuzzleId, this.auth.getCurrentUser());
      if (res.unlockedIndex !== null) {
        this.sound.playFoundationPlaced(10);
        this.renderPuzzlesModal(res.unlockedIndex);
        this.updateHudRankBadge();
      } else {
        this.sound.playWinFanfare();
        // Switch to next incomplete puzzle if current is complete
        const stats = this.statsManager.getStats();
        const nextIncomplete = MOBILITYWARE_PUZZLES.find(
          p => (stats.meta.puzzleProgress?.[p.id]?.length || 0) < 16
        );
        if (nextIncomplete) {
          this.activePuzzleId = nextIncomplete.id;
          const nextRes = this.statsManager.unlockNextPuzzlePiece(this.activePuzzleId, this.auth.getCurrentUser());
          this.renderPuzzlesModal(nextRes.unlockedIndex ?? undefined);
        }
      }
    });

    // Calendar navigation & actions
    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
      this.calMonth--;
      if (this.calMonth < 0) {
        this.calMonth = 11;
        this.calYear--;
      }
      this.renderCalendarModal();
    });

    document.getElementById('cal-next-month')?.addEventListener('click', () => {
      this.calMonth++;
      if (this.calMonth > 11) {
        this.calMonth = 0;
        this.calYear++;
      }
      this.renderCalendarModal();
    });

    document.getElementById('btn-play-daily-selected')?.addEventListener('click', () => {
      this.startDailyChallenge(this.selectedDate);
    });

    document.getElementById('btn-exit-daily')?.addEventListener('click', () => {
      document.getElementById('daily-banner')?.classList.add('hidden');
      this.animator.stop();
      this.engine.createNewGame(this.engine.state.drawMode, false, undefined, true, this.engine.state.scoringMode);
      this.sound.playDealRiffle();
    });

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeModals());
    });
    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) {
        this.closeModals();
      }
    });

    // Draw Mode (Turn 1 / Turn 3)
    document.querySelectorAll('[data-draw]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-draw]').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const drawMode = parseInt(target.dataset.draw || '1', 10) as DrawMode;
        this.engine.state.drawMode = drawMode;
        localStorage.setItem('solitaire_draw_mode', String(drawMode));
      });
    });

    // Scoring Mode (Standard / Vegas)
    document.querySelectorAll('[data-scoring]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-scoring]').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const scoringMode = (target.dataset.scoring || 'standard') as ScoringMode;
        this.engine.state.scoringMode = scoringMode;
        localStorage.setItem('solitaire_scoring_mode', scoringMode);
        this.render(this.engine.state);
      });
    });

    // Handedness (Left / Right)
    document.querySelectorAll('[data-hand]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-hand]').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const hand = target.dataset.hand || 'right';
        document.body.classList.toggle('left-handed', hand === 'left');
        localStorage.setItem('solitaire_handedness', hand);
      });
    });

    // Card Face Style (Classic / Modern / Midnight / Crown)
    document.querySelectorAll('[data-deck]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-deck]').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const deck = target.dataset.deck || 'classic';
        document.body.classList.remove('deck-classic', 'deck-modern', 'deck-midnight', 'deck-crown', 'card-faces-classic', 'card-faces-modern');
        document.body.classList.add(`deck-${deck}`);
        localStorage.setItem('solitaire_card_style', deck);
      });
    });

    // Card Back Design (6 MobilityWare Backs)
    document.querySelectorAll('[data-cardback]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-cardback]').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const cb = target.dataset.cardback || 'blue-lattice';
        this.applyCardBack(cb);
        localStorage.setItem('solitaire_card_back', cb);
      });
    });

    // Table Background Swatches (8 MobilityWare Backgrounds)
    document.querySelectorAll('[data-theme]').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('[data-theme]').forEach(c => c.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const theme = target.dataset.theme || 'classic';
        this.applyTableTheme(theme);
        localStorage.setItem('solitaire_theme', theme);
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

    // OAuth & Profile buttons
    document.getElementById('btn-google-login')?.addEventListener('click', async () => {
      try {
        await this.auth.signInGoogle();
        this.sound.playWinFanfare();
      } catch (err) {
        if ((err as Error).message !== 'POPUP_CLOSED') {
          // Fallback to quick Google input in modal
          const emailInput = document.getElementById('input-google-email') as HTMLInputElement;
          emailInput?.focus();
        }
      }
    });

    document.getElementById('btn-github-login')?.addEventListener('click', async () => {
      try {
        await this.auth.signInGitHub();
        this.sound.playWinFanfare();
      } catch (err) {
        if ((err as Error).message !== 'POPUP_CLOSED') {
          const ghInput = document.getElementById('input-github-username') as HTMLInputElement;
          ghInput?.focus();
        }
      }
    });

    // Quick GitHub username sign-in
    document.getElementById('btn-save-username')?.addEventListener('click', async () => {
      const input = document.getElementById('input-github-username') as HTMLInputElement;
      const username = input?.value.trim();
      if (!username) {
        alert('Please enter your GitHub username.');
        return;
      }
      try {
        await this.auth.signInWithUsername(username);
        this.sound.playWinFanfare();
      } catch (err) {
        alert((err as Error).message);
      }
    });

    // Quick Google email sign-in
    document.getElementById('btn-save-google')?.addEventListener('click', async () => {
      const input = document.getElementById('input-google-email') as HTMLInputElement;
      const email = input?.value.trim();
      if (!email) {
        alert('Please enter your Google email.');
        return;
      }
      try {
        await this.auth.signInWithGoogleProfile(email);
        this.sound.playWinFanfare();
      } catch (err) {
        alert((err as Error).message);
      }
    });

    // Manual Cloud Sync button
    document.getElementById('btn-sync-now')?.addEventListener('click', async () => {
      const statusText = document.getElementById('sync-status-text');
      if (statusText) statusText.textContent = 'Syncing with cloud server...';
      await this.statsManager.syncWithCloud(this.auth.getCurrentUser());
      this.updateHudRankBadge();
      this.sound.playFoundationPlaced(8);
      if (statusText) statusText.textContent = '✓ Cloud stats synchronized just now';
    });

    // Toggle OAuth setup fields
    document.getElementById('btn-toggle-oauth-setup')?.addEventListener('click', () => {
      document.getElementById('oauth-setup-fields')?.classList.toggle('hidden');
    });

    // Save OAuth credentials to .env
    document.getElementById('btn-save-oauth-config')?.addEventListener('click', async () => {
      const clientId = (document.getElementById('setup-client-id') as HTMLInputElement)?.value.trim();
      const secret = (document.getElementById('setup-client-secret') as HTMLInputElement)?.value.trim();
      const googleClientId = (document.getElementById('setup-google-client-id') as HTMLInputElement)?.value.trim();
      const googleSecret = (document.getElementById('setup-google-client-secret') as HTMLInputElement)?.value.trim();
      const feedback = document.getElementById('setup-save-feedback');

      if ((!clientId || !secret) && (!googleClientId || !googleSecret)) {
        alert('Please enter GitHub or Google Client ID and Client Secret.');
        return;
      }

      const success = await this.auth.saveBackendCredentials({
        githubClientId: clientId,
        githubClientSecret: secret,
        googleClientId,
        googleClientSecret: googleSecret
      });
      if (success) {
        feedback?.classList.remove('hidden');
        setTimeout(() => feedback?.classList.add('hidden'), 3500);
      } else {
        alert('Failed to save credentials.');
      }
    });

    // Fetch and populate backend OAuth callback URLs
    this.auth.getBackendStatus().then(status => {
      const urlEl = document.getElementById('setup-callback-url');
      if (urlEl && status.callbackUrl) {
        urlEl.textContent = status.callbackUrl;
      }
      const gUrlEl = document.getElementById('setup-google-callback-url');
      if (gUrlEl && status.googleCallbackUrl) {
        gUrlEl.textContent = status.googleCallbackUrl;
      }
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await this.auth.signOut();
    });

    // Import & Export buttons
    document.getElementById('btn-open-import')?.addEventListener('click', () => {
      this.openModal(this.importModal);
    });

    document.getElementById('btn-export-stats')?.addEventListener('click', () => {
      this.exportStats();
    });

    this.initImportListeners();
  }

  private recordUnfinishedIfStarted(): void {
    if (this.engine.state.isStarted && !this.engine.state.isWon && this.engine.state.moves > 2) {
      this.statsManager.recordGame(
        false,
        this.engine.state.score,
        this.engine.state.elapsedTime,
        this.auth.getCurrentUser()
      );
    }
  }

  private applyTableTheme(theme: string): void {
    const allThemes = [
      'theme-classic', 'theme-royal', 'theme-crimson', 'theme-midnight',
      'theme-wood', 'theme-ocean', 'theme-starlight', 'theme-amethyst'
    ];
    document.body.classList.remove(...allThemes);
    document.body.classList.add(`theme-${theme}`);
  }

  private applyCardBack(cardBack: string): void {
    const allBacks = [
      'back-blue-lattice', 'back-red-lattice', 'back-gold-crown',
      'back-ocean-wave', 'back-emerald-crest', 'back-galaxy-night'
    ];
    document.body.classList.remove(...allBacks);
    document.body.classList.add(`back-${cardBack}`);
  }

  private updateHudRankBadge(): void {
    const stats = this.statsManager.getStats();
    const level = stats.meta?.level || 75;
    const rank = getPlayerRank(level);
    const iconEl = document.getElementById('hud-rank-icon');
    const textEl = document.getElementById('hud-level-text');
    if (iconEl) iconEl.textContent = rank.badge;
    if (textEl) textEl.textContent = `Lv.${level}`;
  }

  private initImportListeners(): void {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
    const btnTogglePaste = document.getElementById('btn-toggle-paste');
    const pasteBox = document.getElementById('paste-area-box');
    const btnParsePaste = document.getElementById('btn-parse-paste');
    const pasteTextarea = document.getElementById('import-paste-text') as HTMLTextAreaElement;
    const btnConfirmImport = document.getElementById('btn-confirm-import');

    if (btnTogglePaste && pasteBox) {
      btnTogglePaste.addEventListener('click', () => {
        pasteBox.classList.toggle('hidden');
      });
    }

    if (btnParsePaste && pasteTextarea) {
      btnParsePaste.addEventListener('click', () => {
        const text = pasteTextarea.value.trim();
        if (!text) {
          alert('Please paste MobilityWare XML, plist, or JSON save text first.');
          return;
        }
        const parsed = MobilityWareImporter.parse(text);
        this.displayImportPreview(parsed);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (file) {
          this.processImportFile(file);
        }
      });
    }

    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer?.files?.[0];
        if (file) {
          this.processImportFile(file);
        }
      });
    }

    if (btnConfirmImport) {
      btnConfirmImport.addEventListener('click', () => {
        if (!this.pendingImportStats) return;
        this.statsManager.importStats(this.pendingImportStats, false, this.auth.getCurrentUser());
        this.sound.playWinFanfare();
        this.updateHudRankBadge();
        this.renderStatsModal();
        this.openModal(this.statsModal);
      });
    }
  }

  private processImportFile(file: File): void {
    const reader = new FileReader();
    const isBinary = file.name.endsWith('.sqlite') || file.name.endsWith('.db');

    reader.onload = () => {
      const result = reader.result;
      if (result) {
        const parsed = MobilityWareImporter.parse(result);
        this.displayImportPreview(parsed);
      }
    };

    if (isBinary) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  private displayImportPreview(parsed: ReturnType<typeof MobilityWareImporter.parse>): void {
    if (parsed.stats.gamesPlayed === 0 && parsed.stats.gamesWon === 0) {
      alert('Could not find any Solitaire statistics in the provided text/file. Please make sure it contains <statistics> or <category> tags.');
      return;
    }

    this.pendingImportStats = parsed.stats;
    const previewBox = document.getElementById('import-preview-box');
    const badge = document.getElementById('import-source-badge');

    if (badge) {
      badge.textContent = parsed.sourceType.replace(/-/g, ' ').toUpperCase();
    }

    document.getElementById('prev-played')!.textContent = parsed.stats.gamesPlayed.toString();
    document.getElementById('prev-won')!.textContent = parsed.stats.gamesWon.toString();
    const rate = parsed.stats.gamesPlayed > 0 ? Math.round((parsed.stats.gamesWon / parsed.stats.gamesPlayed) * 100) : 0;
    document.getElementById('prev-rate')!.textContent = `${rate}%`;
    document.getElementById('prev-streak')!.textContent = parsed.stats.bestStreak.toString();
    document.getElementById('prev-score')!.textContent = parsed.stats.bestScore.toString();

    if (parsed.stats.bestTime !== null) {
      const mins = Math.floor(parsed.stats.bestTime / 60);
      const secs = parsed.stats.bestTime % 60;
      document.getElementById('prev-time')!.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      document.getElementById('prev-time')!.textContent = '--:--';
    }

    previewBox?.classList.remove('hidden');
    previewBox?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private exportStats(): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(this.statsManager.exportStatsJson());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `solitaire-stats-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
    // Score & Moves (format Vegas with $ sign)
    if (state.scoringMode === 'vegas') {
      this.scoreEl.textContent = state.score < 0 ? `-$${Math.abs(state.score)}` : `$${state.score}`;
    } else {
      this.scoreEl.textContent = state.score.toString();
    }
    this.movesEl.textContent = state.moves.toString();
    this.updateTimeDisplay();

    // Check if there is a fresh animation action to play
    const action = state.lastAction;
    const shouldAnimate = Boolean(action && action.timestamp !== this.lastAnimatedTimestamp);
    if (action && shouldAnimate) {
      this.lastAnimatedTimestamp = action.timestamp;
    }

    const flippedSet = new Set(shouldAnimate && action ? action.flippedCardIds : []);
    const movedSet = new Set(shouldAnimate && action ? action.movedCardIds : []);
    const isDealAction = Boolean(shouldAnimate && action?.type === 'deal');

    // Capture previous card screen positions before re-rendering for smooth FLIP flight to foundations
    const prevCardRects = new Map<string, DOMRect>();
    if (movedSet.size > 0) {
      document.querySelectorAll<HTMLElement>('.playfield .card[data-id]').forEach(el => {
        const id = el.dataset.id;
        if (id && movedSet.has(id)) {
          prevCardRects.set(id, el.getBoundingClientRect());
        }
      });
    }

    // 1. Stock Pile & Remaining Card Badge
    const stockPlaceholder = this.stockPileEl.querySelector('.card-placeholder') as HTMLElement;
    const existingStockCards = this.stockPileEl.querySelectorAll('.card');
    existingStockCards.forEach(c => c.remove());

    if (this.stockCountBadgeEl) {
      this.stockCountBadgeEl.textContent = state.stock.length.toString();
      this.stockCountBadgeEl.classList.toggle('hidden', state.stock.length === 0);
    }

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
      const visibleCount = state.drawMode === 3 ? Math.min(3, state.waste.length) : 1;
      const startIndex = state.waste.length - visibleCount;

      for (let i = startIndex; i < state.waste.length; i++) {
        const card = state.waste[i];
        const isTop = i === state.waste.length - 1;
        const isNewlyDrawn = flippedSet.has(card.id);
        const cardEl = CardRenderer.createCardElement(card, false, {
          isFlipping: isNewlyDrawn
        });
        const offset = (i - startIndex) * (window.innerWidth < 640 ? 14 : 18);
        cardEl.style.left = `${offset}px`;
        cardEl.style.zIndex = `${i - startIndex + 1}`;

        if (isTop) {
          this.dragDrop.registerCard(cardEl, card, { type: 'waste', index: 0 });
        }
        this.wastePileEl.appendChild(cardEl);
      }
    } else {
      wastePlaceholder.classList.remove('hidden');
    }

    // 3. Foundations (render top 2 cards so beneath card stays visible while newly moved card glides in)
    for (let f = 0; f < 4; f++) {
      const fEl = this.foundationEls[f];
      const placeholder = fEl.querySelector('.card-placeholder') as HTMLElement;
      const existingCards = fEl.querySelectorAll('.card');
      existingCards.forEach(c => c.remove());

      const pile = state.foundations[f];
      if (pile.length > 0) {
        placeholder.classList.add('hidden');
        const startIdx = Math.max(0, pile.length - 2);
        for (let i = startIdx; i < pile.length; i++) {
          const card = pile[i];
          const isTop = i === pile.length - 1;
          const isMovedHere = isTop && movedSet.has(card.id) && action?.targetPile?.type === 'foundation' && action.targetPile.index === f;
          const cardEl = CardRenderer.createCardElement(card, false, {
            isMoving: isMovedHere && !prevCardRects.has(card.id)
          });
          cardEl.style.zIndex = isTop ? '2' : '1';

          if (isTop) {
            this.dragDrop.registerCard(cardEl, card, { type: 'foundation', index: f });
          }
          fEl.appendChild(cardEl);

          if (isMovedHere && prevCardRects.has(card.id) && typeof cardEl.animate === 'function') {
            const prevRect = prevCardRects.get(card.id)!;
            const targetRect = fEl.getBoundingClientRect();
            const dx = prevRect.left - targetRect.left;
            const dy = prevRect.top - targetRect.top;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
              cardEl.style.zIndex = '400';
              const anim = cardEl.animate(
                [
                  { transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.05)` },
                  { transform: 'translate3d(0, 0, 0) scale(1)' }
                ],
                { duration: 165, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
              );
              anim.onfinish = () => {
                cardEl.style.zIndex = '2';
              };
            }
          }
        }
      } else {
        placeholder.classList.remove('hidden');
      }
    }

    // 4. Tableau Columns (Optimized for Google Pixel 9 Pro XL 20:9 tall viewport & responsive compression)
    const isMobile = window.innerWidth < 640;
    const isTallViewport = window.innerHeight >= 820; // Pixel 9 Pro XL (~915px CSS height)
    const baseDownOffset = isMobile ? (isTallViewport ? 13 : 11) : 15;
    const baseUpOffset = isMobile ? (isTallViewport ? 29 : 25) : 32;
    const maxColHeight = Math.max(280, window.innerHeight - 265);

    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const colEl = this.tableauEls[colIdx];
      colEl.innerHTML = '';
      const cards = state.tableau[colIdx];
      let currentTop = 0;

      // Dynamically scale offsets if a column gets very long so cards never clip into bottom toolbar
      const downCount = cards.filter(c => !c.faceUp).length;
      const upCount = Math.max(0, cards.filter(c => c.faceUp).length - 1);
      const rawSpan = downCount * baseDownOffset + upCount * baseUpOffset;
      const scale = rawSpan > maxColHeight ? maxColHeight / rawSpan : 1;
      const downOffset = Math.max(8, Math.floor(baseDownOffset * scale));
      const upOffset = Math.max(19, Math.floor(baseUpOffset * scale));

      cards.forEach((card, rowIdx) => {
        const isFlippedNow = flippedSet.has(card.id);
        const isMovedNow = movedSet.has(card.id);
        const cardEl = CardRenderer.createCardElement(card, false, {
          isFlipping: isFlippedNow,
          isDealing: isDealAction,
          dealDelayMs: isDealAction ? (colIdx * 38 + rowIdx * 16) : 0,
          isMoving: isMovedNow && !isFlippedNow
        });
        cardEl.style.top = `${currentTop}px`;
        cardEl.style.zIndex = `${rowIdx + 1}`;

        if (card.faceUp) {
          this.dragDrop.registerCard(cardEl, card, { type: 'tableau', index: colIdx });
          currentTop += upOffset;
        } else {
          currentTop += downOffset;
        }

        colEl.appendChild(cardEl);
      });
    }

    // 5. Auto-Complete when stock stack is empty and all cards have been flipped
    if (this.engine.canAutoFinish()) {
      this.autoFinishBtn.classList.remove('hidden');
      if (!this.autoFinishInterval && !this.autoFinishTimeout && action?.type !== 'undo') {
        const delayMs = flippedSet.size > 0 ? 230 : 120;
        this.autoFinishTimeout = window.setTimeout(() => {
          this.autoFinishTimeout = null;
          if (this.engine.canAutoFinish() && !this.autoFinishInterval) {
            this.startAutoFinish();
          }
        }, delayMs);
      }
    } else {
      this.autoFinishBtn.classList.add('hidden');
    }

    // 6. Win check
    if (state.isWon) {
      this.stopAutoFinish();
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

    if (fromEl) fromEl.style.filter = 'drop-shadow(0 0 12px #f59e0b) brightness(1.2)';
    if (toEl) toEl.style.filter = 'drop-shadow(0 0 12px #10b981) brightness(1.2)';

    setTimeout(() => {
      if (fromEl) fromEl.style.filter = '';
      if (toEl) toEl.style.filter = '';
    }, 1200);
  }

  private stopAutoFinish(): void {
    if (this.autoFinishTimeout !== null) {
      clearTimeout(this.autoFinishTimeout);
      this.autoFinishTimeout = null;
    }
    if (this.autoFinishInterval !== null) {
      clearInterval(this.autoFinishInterval);
      this.autoFinishInterval = null;
    }
  }

  private startAutoFinish(): void {
    this.stopAutoFinish();
    const runStep = () => {
      if (!this.engine.canAutoFinish()) {
        this.stopAutoFinish();
        return;
      }
      const moved = this.engine.autoFinishStep();
      if (moved) {
        const last = this.engine.state.history[this.engine.state.history.length - 1];
        const rank = last?.cards[0]?.rank || 5;
        this.sound.playCardPlace();
        this.sound.playFoundationPlaced(rank);
      } else {
        this.stopAutoFinish();
      }
    };

    runStep();
    if (this.engine.canAutoFinish()) {
      this.autoFinishInterval = window.setInterval(runStep, 85);
    }
  }

  private handleGameWon(): void {
    if (this.winModal.classList.contains('hidden') === false) return;

    this.sound.playWinFanfare();
    const foundationRects = this.foundationEls.map(el => el.getBoundingClientRect());
    this.animator.startCascade(this.engine.state.foundations, foundationRects);

    const dailyDate = this.engine.state.isDailyChallenge ? this.engine.state.dailyDate : undefined;
    const reward = this.statsManager.recordGame(
      true,
      this.engine.state.score,
      this.engine.state.elapsedTime,
      this.auth.getCurrentUser(),
      dailyDate
    );
    this.updateHudRankBadge();

    const mins = Math.floor(this.engine.state.elapsedTime / 60);
    const secs = this.engine.state.elapsedTime % 60;
    document.getElementById('v-time')!.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('v-score')!.textContent = this.engine.state.score.toString();
    document.getElementById('v-moves')!.textContent = this.engine.state.moves.toString();

    const xpEl = document.getElementById('v-xp-earned');
    if (xpEl) {
      xpEl.textContent = reward.leveledUp
        ? `🎉 LEVEL UP! Lv.${reward.stats.meta.level} (+${reward.xpEarned} ★)`
        : `+${reward.xpEarned} ★ XP Earned`;
    }

    const puzEl = document.getElementById('v-puzzle-reward');
    if (puzEl) {
      puzEl.textContent = reward.unlockedPiece !== null
        ? `🧩 Puzzle Piece #${reward.unlockedPiece + 1} Unlocked!`
        : `🏅 All Puzzle Pieces Collected!`;
    }

    const winSub = this.winModal.querySelector('.victory-sub') as HTMLElement;
    if (winSub) {
      if (this.engine.state.isDailyChallenge) {
        winSub.textContent = `👑 Crown Earned for ${this.engine.state.dailyDate}!`;
      } else {
        winSub.textContent = 'You solved the deck!';
      }
    }

    setTimeout(() => {
      this.openModal(this.winModal);
    }, 1500);
  }

  private openModal(modal: HTMLElement): void {
    this.modalContainer.classList.remove('hidden');
    this.allModals.forEach(m => m.classList.add('hidden'));
    modal.classList.remove('hidden');
  }

  private closeModals(): void {
    this.modalContainer.classList.add('hidden');
    this.allModals.forEach(m => m.classList.add('hidden'));
  }

  private startDailyChallenge(dateStr: string): void {
    this.closeModals();
    this.animator.stop();
    this.engine.createNewGame(this.engine.state.drawMode, true, dateStr, true, this.engine.state.scoringMode);
    this.sound.playDealRiffle();

    const banner = document.getElementById('daily-banner')!;
    const bannerDate = document.getElementById('daily-banner-date')!;
    banner.classList.remove('hidden');

    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    bannerDate.textContent = `DAILY CHALLENGE: ${formatted.toUpperCase()}`;
  }

  private renderCalendarModal(): void {
    const stats = this.statsManager.getStats();
    const crownsData = stats.crowns || {};

    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];

    const monthKey = `${this.calYear}-${(this.calMonth + 1).toString().padStart(2, '0')}`;
    document.getElementById('cal-month-title')!.textContent = `${monthNames[this.calMonth]} ${this.calYear}`;

    const monthCrowns = crownsData[monthKey] || { daysCompleted: [], trophyUnlocked: 'NONE' };
    const crownCount = monthCrowns.daysCompleted.length;
    document.getElementById('cal-crown-count')!.textContent = crownCount.toString();

    const fillEl = document.getElementById('cal-trophy-fill');
    if (fillEl) {
      fillEl.style.width = `${Math.min(100, Math.round((crownCount / 20) * 100))}%`;
    }

    let trophyTitle = 'CURRENT TROPHY: NONE';
    let trophyIcon = '🏆';
    if (crownCount >= 20 || monthCrowns.trophyUnlocked === 'GOLD') {
      trophyTitle = 'CURRENT TROPHY: ★ GOLD TROPHY UNLOCKED ★';
      trophyIcon = '🥇';
    } else if (crownCount >= 10 || monthCrowns.trophyUnlocked === 'SILVER') {
      trophyTitle = 'CURRENT TROPHY: ★ SILVER TROPHY UNLOCKED ★';
      trophyIcon = '🥈';
    } else if (crownCount >= 5 || monthCrowns.trophyUnlocked === 'BRONZE') {
      trophyTitle = 'CURRENT TROPHY: ★ BRONZE TROPHY UNLOCKED ★';
      trophyIcon = '🥉';
    } else {
      trophyTitle = `CURRENT TROPHY: ${crownCount}/5 CROWNS FOR BRONZE`;
    }
    document.getElementById('cal-trophy-title')!.textContent = trophyTitle;
    document.getElementById('cal-trophy-icon')!.textContent = trophyIcon;

    const calGrid = document.getElementById('cal-grid')!;
    calGrid.innerHTML = '';

    const firstDayOfWeek = new Date(this.calYear, this.calMonth, 1).getDay();
    const daysInMonth = new Date(this.calYear, this.calMonth + 1, 0).getDate();

    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day empty';
      calGrid.appendChild(emptyCell);
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === this.calYear && today.getMonth() === this.calMonth;
    const todayDate = today.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'cal-day';
      const dateStr = `${this.calYear}-${(this.calMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      const hasCrown = monthCrowns.daysCompleted.includes(day);
      if (hasCrown) {
        dayCell.classList.add('has-crown');
      }

      if (isCurrentMonth && day === todayDate) {
        dayCell.classList.add('today');
      }

      if (dateStr === this.selectedDate) {
        dayCell.classList.add('selected');
      }

      if (isCurrentMonth && day > todayDate) {
        dayCell.classList.add('future');
      }

      if (hasCrown) {
        dayCell.innerHTML = `<span class="day-num">${day}</span><span class="day-crown-icon">👑</span>`;
      } else {
        dayCell.innerHTML = `<span class="day-num">${day}</span>`;
      }

      dayCell.addEventListener('click', () => {
        this.selectedDate = dateStr;
        document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
        dayCell.classList.add('selected');
        document.getElementById('btn-play-daily-text')!.textContent = `Play Challenge (${dateStr})`;
      });

      calGrid.appendChild(dayCell);
    }

    document.getElementById('btn-play-daily-text')!.textContent = `Play Challenge (${this.selectedDate})`;
  }

  /**
   * Renders the MobilityWare Jigsaw Puzzle Events Gallery & Interactive 4x4 Board
   */
  private renderPuzzlesModal(newlyUnlockedIndex?: number): void {
    const stats = this.statsManager.getStats();
    const meta = stats.meta;

    document.getElementById('puz-total-pieces')!.textContent = meta.piecesCollected.toString();
    document.getElementById('puz-total-solved')!.textContent = meta.puzzlesCompleted.toString();
    document.getElementById('puz-total-badges')!.textContent = `${meta.badgesEarned} 🏅`;

    // Render Puzzle Selector Tabs
    const selectorEl = document.getElementById('puzzle-selector')!;
    selectorEl.innerHTML = '';

    MOBILITYWARE_PUZZLES.forEach((puz) => {
      const unlockedArr = meta.puzzleProgress?.[puz.id] || [];
      const isComplete = unlockedArr.length >= 16;
      const btn = document.createElement('button');
      btn.className = `puzzle-tab-btn ${puz.id === this.activePuzzleId ? 'active' : ''} ${isComplete ? 'completed' : ''}`;
      btn.innerHTML = `
        <span class="puz-tab-icon">${puz.icon}</span>
        <span class="puz-tab-name">${puz.name}</span>
        <span class="puz-tab-count">${unlockedArr.length}/16</span>
      `;
      btn.addEventListener('click', () => {
        this.activePuzzleId = puz.id;
        this.sound.playCardPlace();
        this.renderPuzzlesModal();
      });
      selectorEl.appendChild(btn);
    });

    const activeDef = MOBILITYWARE_PUZZLES.find(p => p.id === this.activePuzzleId) || MOBILITYWARE_PUZZLES[0];
    const unlockedPieces = meta.puzzleProgress?.[activeDef.id] || [];

    document.getElementById('jigsaw-active-title')!.textContent = `${activeDef.icon} ${activeDef.name} (${activeDef.theme})`;
    document.getElementById('jigsaw-active-progress')!.textContent = unlockedPieces.length >= 16
      ? `${activeDef.badgeEmoji} COMPLETED!`
      : `${unlockedPieces.length} / 16 Pieces`;

    const boardEl = document.getElementById('jigsaw-board')!;
    boardEl.innerHTML = '';
    boardEl.style.background = `linear-gradient(135deg, ${activeDef.colors[0]} 0%, ${activeDef.colors[1]} 60%, ${activeDef.colors[2]} 100%)`;

    for (let idx = 0; idx < 16; idx++) {
      const isUnlocked = unlockedPieces.includes(idx);
      const isNew = idx === newlyUnlockedIndex;
      const cell = document.createElement('div');
      cell.className = `jigsaw-cell ${isUnlocked ? 'unlocked' : 'locked'} ${isNew ? 'just-unlocked' : ''}`;

      const row = Math.floor(idx / 4);
      const col = idx % 4;

      if (isUnlocked) {
        // Show scenic SVG mosaic tile with central emblem on center pieces
        let centerDecor = '';
        if (row === 1 && col === 1) centerDecor = `<span class="jigsaw-art-emblem">${activeDef.icon}</span>`;
        if (row === 2 && col === 2) centerDecor = `<span class="jigsaw-art-emblem">${activeDef.badgeEmoji}</span>`;
        cell.innerHTML = `
          ${centerDecor}
          <span class="jigsaw-piece-num">#${idx + 1}</span>
        `;
      } else {
        cell.innerHTML = `
          <span class="jigsaw-lock-icon">🧩</span>
          <span class="jigsaw-piece-num">#${idx + 1}</span>
        `;
        cell.addEventListener('click', () => {
          const res = this.statsManager.unlockNextPuzzlePiece(activeDef.id, this.auth.getCurrentUser());
          if (res.unlockedIndex !== null) {
            this.sound.playFoundationPlaced(11);
            this.renderPuzzlesModal(res.unlockedIndex);
          }
        });
      }

      boardEl.appendChild(cell);
    }
  }

  private renderStatsModal(): void {
    const s = this.statsManager.getStats();
    const level = s.meta?.level || 75;
    const rank = getPlayerRank(level);

    // Rank & XP progression header
    document.getElementById('stats-rank-icon')!.textContent = rank.badge;
    document.getElementById('stats-rank-title')!.textContent = rank.title.toUpperCase();
    document.getElementById('stats-level-num')!.textContent = level.toString();
    document.getElementById('stats-total-stars')!.textContent = `${(s.meta?.totalStars || 0).toLocaleString()} ★`;

    const nextStars = s.meta?.starsToNextLevel || 890;
    const pct = Math.max(8, Math.min(96, Math.round(((1000 - (nextStars % 1000)) / 1000) * 100)));
    const xpFill = document.getElementById('stats-xp-fill');
    if (xpFill) xpFill.style.width = `${pct}%`;
    document.getElementById('stats-xp-next')!.textContent = `${nextStars} ★ to Level ${level + 1}`;

    // Core stats boxes
    document.getElementById('stats-played')!.textContent = s.gamesPlayed.toString();
    document.getElementById('stats-won')!.textContent = s.gamesWon.toString();
    const rate = s.gamesPlayed > 0 ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0;
    document.getElementById('stats-win-rate')!.textContent = `${rate}%`;
    document.getElementById('stats-streak')!.textContent = `${s.currentStreak} (Best: ${s.bestStreak})`;
    document.getElementById('stats-best-score')!.textContent = s.bestScore.toLocaleString();
    if (s.bestTime !== null) {
      const mins = Math.floor(s.bestTime / 60);
      const secs = s.bestTime % 60;
      document.getElementById('stats-best-time')!.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      document.getElementById('stats-best-time')!.textContent = '--:--';
    }

    // MobilityWare Leaderboard
    const user = this.auth.getCurrentUser();
    const playerName = user?.displayName || 'You (Evan)';
    const entries = [
      { name: 'KlondikeKing99', level: 112, badge: '👑', score: 16420, time: '00:44', isUser: false },
      { name: 'VegasQueen_MW', level: 94, badge: '💎', score: 14890, time: '00:48', isUser: false },
      {
        name: playerName,
        level,
        badge: rank.badge,
        score: s.bestScore,
        time: s.bestTime ? `${String(Math.floor(s.bestTime / 60)).padStart(2, '0')}:${String(s.bestTime % 60).padStart(2, '0')}` : '00:52',
        isUser: true
      },
      { name: 'CardShark_TX', level: 68, badge: '♠️', score: 12350, time: '01:02', isUser: false },
      { name: 'SolitaireAce', level: 51, badge: '♥️', score: 10940, time: '01:15', isUser: false }
    ].sort((a, b) => b.score - a.score);

    const lbList = document.getElementById('leaderboard-list')!;
    lbList.innerHTML = entries
      .map((entry, idx) => `
        <div class="lb-row ${entry.isUser ? 'lb-row-user' : ''}">
          <span class="lb-rank">#${idx + 1}</span>
          <span class="lb-badge">${entry.badge}</span>
          <div class="lb-info">
            <span class="lb-name">${entry.name}</span>
            <span class="lb-sub">Lv.${entry.level} &bull; Fastest ${entry.time}</span>
          </div>
          <span class="lb-score">${entry.score.toLocaleString()}</span>
        </div>
      `)
      .join('');
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
      document.getElementById('user-provider')!.textContent = `${user.provider.toUpperCase()} VERIFIED`;
      const userImg = document.getElementById('user-avatar') as HTMLImageElement;
      if (user.photoURL) userImg.src = user.photoURL;
    } else {
      labelEl.textContent = 'Sign In';
      avatarEl.innerHTML = `<svg viewBox="0 0 24 24" class="icon"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
      loggedInView.classList.add('hidden');
      loggedOutView.classList.remove('hidden');
    }
  }

  private initSavedPreferences(): void {
    // 0. Table Background Theme
    const savedTheme = localStorage.getItem('solitaire_theme') || 'classic';
    this.applyTableTheme(savedTheme);
    document.querySelectorAll('[data-theme]').forEach(c => {
      c.classList.toggle('active', (c as HTMLElement).dataset.theme === savedTheme);
    });

    // 1. Handedness
    const savedHand = localStorage.getItem('solitaire_handedness') || 'right';
    if (savedHand === 'left') {
      document.body.classList.add('left-handed');
      document.getElementById('btn-hand-right')?.classList.remove('active');
      document.getElementById('btn-hand-left')?.classList.add('active');
    }

    // 2. Deck Face Theme
    const savedDeck = localStorage.getItem('solitaire_card_style') || 'classic';
    document.body.classList.remove('deck-classic', 'deck-modern', 'deck-midnight', 'deck-crown');
    document.body.classList.add(`deck-${savedDeck}`);
    document.querySelectorAll('[data-deck]').forEach(b => {
      b.classList.toggle('active', (b as HTMLElement).dataset.deck === savedDeck);
    });

    // 3. Card Back Design
    const savedBack = localStorage.getItem('solitaire_card_back') || 'blue-lattice';
    this.applyCardBack(savedBack);
    document.querySelectorAll('[data-cardback]').forEach(b => {
      b.classList.toggle('active', (b as HTMLElement).dataset.cardback === savedBack);
    });

    // 4. Draw Mode & Scoring Mode
    const savedDraw = parseInt(localStorage.getItem('solitaire_draw_mode') || '1', 10) as DrawMode;
    this.engine.state.drawMode = savedDraw === 3 ? 3 : 1;
    document.querySelectorAll('[data-draw]').forEach(b => {
      b.classList.toggle('active', parseInt((b as HTMLElement).dataset.draw || '1', 10) === this.engine.state.drawMode);
    });

    const savedScoring = (localStorage.getItem('solitaire_scoring_mode') || 'standard') as ScoringMode;
    this.engine.state.scoringMode = savedScoring === 'vegas' ? 'vegas' : 'standard';
    document.querySelectorAll('[data-scoring]').forEach(b => {
      b.classList.toggle('active', (b as HTMLElement).dataset.scoring === this.engine.state.scoringMode);
    });
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
