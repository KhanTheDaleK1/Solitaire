export class SoundManager {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  public soundEnabled: boolean = true;
  public hapticsEnabled: boolean = true;

  constructor() {
    const initAudio = () => {
      this.ensureContext();
      window.removeEventListener('pointerdown', initAudio);
      window.removeEventListener('keydown', initAudio);
    };

    window.addEventListener('pointerdown', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
  }

  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.noiseBuffer) {
      // Create a 0.25s white noise buffer for realistic paper card foley
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 0.25);
      this.noiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.ctx;
  }

  public vibrate(pattern: number | number[] = 15): void {
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore haptics errors if blocked by browser policy
      }
    }
  }

  /**
   * MobilityWare-style tactile paper card flip foley (bandpass noise swoosh + crisp snap)
   */
  public playCardFlip(): void {
    this.vibrate(10);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    try {
      const now = ctx.currentTime;

      // 1. Paper friction noise swoosh
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.065);
      filter.Q.value = 1.8;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.28, now + 0.015);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.08);

      // 2. Subtle card body pop
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, now + 0.01);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.065);

      oscGain.gain.setValueAtTime(0.14, now + 0.01);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now + 0.01);
      osc.stop(now + 0.07);
    } catch {
      // Fallback
    }
  }

  /**
   * MobilityWare-style deal riffle sound when dealing a new hand across the 7 columns
   */
  public playDealRiffle(): void {
    this.vibrate([10, 25, 10, 25, 12]);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    try {
      for (let i = 0; i < 7; i++) {
        const delay = i * 0.042;
        const start = ctx.currentTime + delay;

        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2100 + i * 160, start);
        filter.Q.value = 2.2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(start);
        noise.stop(start + 0.05);
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Stock recycle shuffle sound
   */
  public playStockRecycle(): void {
    this.vibrate([12, 20, 12]);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    try {
      for (let i = 0; i < 3; i++) {
        const start = ctx.currentTime + i * 0.045;
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400 + i * 400, start);
        filter.Q.value = 1.6;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.22, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(start);
        noise.stop(start + 0.055);
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Crisp card-on-felt snap sound
   */
  public playCardPlace(): void {
    this.vibrate(16);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Crisp paper tap transient
      if (this.noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1600, now);
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.2, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.04);
      }

      // Warm felt thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.045);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Fallback
    }
  }

  /**
   * MobilityWare ascending 13-rank Foundation chime (Ace = 1 -> King = 13)
   */
  public playFoundationPlaced(rank: number = 1): void {
    this.vibrate([15, 25, 20]);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      // 13-note ascending C-major scale from C5 (Ace) to A6 (King)
      const scaleFreqs = [
        523.25,  // A  - C5
        587.33,  // 2  - D5
        659.25,  // 3  - E5
        698.46,  // 4  - F5
        783.99,  // 5  - G5
        880.00,  // 6  - A5
        987.77,  // 7  - B5
        1046.50, // 8  - C6
        1174.66, // 9  - D6
        1318.51, // 10 - E6
        1396.91, // J  - F6
        1567.98, // Q  - G6
        1760.00  // K  - A6
      ];
      const clampedIdx = Math.max(0, Math.min(12, rank - 1));
      const baseFreq = scaleFreqs[clampedIdx];
      const now = ctx.currentTime;

      // Fundamental bell tone + harmonic fifth shimmer
      [baseFreq, baseFreq * 1.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.035;

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(idx === 0 ? 0.24 : 0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch {
      // Fallback
    }
  }

  public playInvalid(): void {
    this.vibrate([25, 45, 25]);

    try {
      document.body.classList.add('flash-invalid');
      setTimeout(() => {
        document.body.classList.remove('flash-invalid');
      }, 90);
    } catch {
      // Ignore
    }

    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.setValueAtTime(85, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.16, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // Fallback
    }
  }

  public playWinFanfare(): void {
    this.vibrate([50, 60, 50, 60, 150]);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      // MobilityWare triumphant royal brass & bell fanfare
      const notes = [
        { freq: 523.25, delay: 0.00, dur: 0.18 }, // C5
        { freq: 659.25, delay: 0.11, dur: 0.18 }, // E5
        { freq: 783.99, delay: 0.22, dur: 0.18 }, // G5
        { freq: 1046.50, delay: 0.34, dur: 0.32 }, // C6
        { freq: 783.99, delay: 0.52, dur: 0.16 }, // G5
        { freq: 1046.50, delay: 0.66, dur: 0.55 }  // C6
      ];
      notes.forEach(({ freq, delay, dur }) => {
        const startTime = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.26, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + dur + 0.02);
      });
    } catch {
      // Fallback
    }
  }

  public playBounceChime(pitchIdx: number = 0): void {
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
      const freq = pentatonic[pitchIdx % pentatonic.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.11, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Fallback
    }
  }
}
