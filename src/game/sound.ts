export class SoundManager {
  private ctx: AudioContext | null = null;
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;
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
    if (this.ctx && (!this.whiteNoiseBuffer || !this.pinkNoiseBuffer)) {
      const sampleRate = this.ctx.sampleRate;
      const length = Math.floor(sampleRate * 0.35);

      // 1. White noise buffer (crisp paper edge transients)
      this.whiteNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
      const whiteData = this.whiteNoiseBuffer.getChannelData(0);

      // 2. Pink noise buffer (Paul Kellet's filtering algorithm for natural acoustic paper & felt body)
      this.pinkNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
      const pinkData = this.pinkNoiseBuffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        whiteData[i] = white;

        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return this.ctx;
  }

  public vibrate(pattern: number | number[] = 12): void {
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore haptics errors if blocked by browser policy
      }
    }
  }

  /**
   * Authentic physical playing card flip sound (3-stage acoustic paper foley:
   * 1. Crisp card-edge flick release
   * 2. Velvety paper-through-air brush as the card turns over
   * 3. Soft baize felt landing tap)
   */
  public playCardFlip(): void {
    this.vibrate(8);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.whiteNoiseBuffer || !this.pinkNoiseBuffer) return;

    try {
      const now = ctx.currentTime;
      const pitchJitter = 0.95 + Math.random() * 0.1;

      // Stage 1: Stiff cardstock edge flick (0ms -> 18ms)
      const flickSrc = ctx.createBufferSource();
      flickSrc.buffer = this.whiteNoiseBuffer;
      const flickFilter = ctx.createBiquadFilter();
      flickFilter.type = 'bandpass';
      flickFilter.frequency.setValueAtTime(3100 * pitchJitter, now);
      flickFilter.frequency.exponentialRampToValueAtTime(4600 * pitchJitter, now + 0.016);
      flickFilter.Q.value = 3.0;

      const flickGain = ctx.createGain();
      flickGain.gain.setValueAtTime(0.001, now);
      flickGain.gain.linearRampToValueAtTime(0.26, now + 0.002);
      flickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      flickSrc.connect(flickFilter);
      flickFilter.connect(flickGain);
      flickGain.connect(ctx.destination);
      flickSrc.start(now);
      flickSrc.stop(now + 0.02);

      // Stage 2: Paper brushing air & adjacent card during 180-deg turn (8ms -> 62ms)
      const brushSrc = ctx.createBufferSource();
      brushSrc.buffer = this.pinkNoiseBuffer;
      const brushFilter = ctx.createBiquadFilter();
      brushFilter.type = 'bandpass';
      brushFilter.frequency.setValueAtTime(1100 * pitchJitter, now + 0.008);
      brushFilter.frequency.exponentialRampToValueAtTime(2500 * pitchJitter, now + 0.032);
      brushFilter.frequency.exponentialRampToValueAtTime(1300 * pitchJitter, now + 0.062);
      brushFilter.Q.value = 1.5;

      const brushGain = ctx.createGain();
      brushGain.gain.setValueAtTime(0.001, now + 0.008);
      brushGain.gain.linearRampToValueAtTime(0.22, now + 0.022);
      brushGain.gain.exponentialRampToValueAtTime(0.001, now + 0.064);

      brushSrc.connect(brushFilter);
      brushFilter.connect(brushGain);
      brushGain.connect(ctx.destination);
      brushSrc.start(now + 0.008);
      brushSrc.stop(now + 0.066);

      // Stage 3: Soft card settling onto felt table (44ms -> 84ms)
      const settleSrc = ctx.createBufferSource();
      settleSrc.buffer = this.pinkNoiseBuffer;
      const settleFilter = ctx.createBiquadFilter();
      settleFilter.type = 'bandpass';
      settleFilter.frequency.setValueAtTime(520 * pitchJitter, now + 0.044);
      settleFilter.frequency.exponentialRampToValueAtTime(280 * pitchJitter, now + 0.082);
      settleFilter.Q.value = 2.1;

      const settleGain = ctx.createGain();
      settleGain.gain.setValueAtTime(0.001, now + 0.044);
      settleGain.gain.linearRampToValueAtTime(0.28, now + 0.047);
      settleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.084);

      settleSrc.connect(settleFilter);
      settleFilter.connect(settleGain);
      settleGain.connect(ctx.destination);
      settleSrc.start(now + 0.044);
      settleSrc.stop(now + 0.086);
    } catch {
      // Fallback
    }
  }

  /**
   * Staggered 7-card deal riffle across the tableau (pure acoustic paper snaps)
   */
  public playDealRiffle(): void {
    this.vibrate([8, 22, 8, 22, 10]);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.pinkNoiseBuffer || !this.whiteNoiseBuffer) return;

    try {
      for (let i = 0; i < 7; i++) {
        const start = ctx.currentTime + i * 0.038;
        const pitch = 0.92 + i * 0.03;

        // Crisp paper slide
        const slideSrc = ctx.createBufferSource();
        slideSrc.buffer = this.whiteNoiseBuffer;
        const slideFilter = ctx.createBiquadFilter();
        slideFilter.type = 'bandpass';
        slideFilter.frequency.setValueAtTime(2600 * pitch, start);
        slideFilter.Q.value = 2.4;

        const slideGain = ctx.createGain();
        slideGain.gain.setValueAtTime(0.001, start);
        slideGain.gain.linearRampToValueAtTime(0.18, start + 0.003);
        slideGain.gain.exponentialRampToValueAtTime(0.001, start + 0.034);

        slideSrc.connect(slideFilter);
        slideFilter.connect(slideGain);
        slideGain.connect(ctx.destination);
        slideSrc.start(start);
        slideSrc.stop(start + 0.036);

        // Felt pat
        const patSrc = ctx.createBufferSource();
        patSrc.buffer = this.pinkNoiseBuffer;
        const patFilter = ctx.createBiquadFilter();
        patFilter.type = 'bandpass';
        patFilter.frequency.setValueAtTime(580 * pitch, start + 0.014);
        patFilter.Q.value = 1.9;

        const patGain = ctx.createGain();
        patGain.gain.setValueAtTime(0.22, start + 0.014);
        patGain.gain.exponentialRampToValueAtTime(0.001, start + 0.042);

        patSrc.connect(patFilter);
        patFilter.connect(patGain);
        patGain.connect(ctx.destination);
        patSrc.start(start + 0.014);
        patSrc.stop(start + 0.045);
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Stock recycle shuffle sound (paper deck restack)
   */
  public playStockRecycle(): void {
    this.vibrate([10, 18, 10]);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.pinkNoiseBuffer) return;

    try {
      for (let i = 0; i < 4; i++) {
        const start = ctx.currentTime + i * 0.034;
        const noise = ctx.createBufferSource();
        noise.buffer = this.pinkNoiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400 + i * 320, start);
        filter.Q.value = 1.8;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.24, start + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.042);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(start);
        noise.stop(start + 0.045);
      }
    } catch {
      // Fallback
    }
  }

  /**
   * Crisp paper card sliding & snapping onto felt/card stack
   */
  public playCardPlace(): void {
    this.vibrate(12);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.whiteNoiseBuffer || !this.pinkNoiseBuffer) return;

    try {
      const now = ctx.currentTime;
      const jitter = 0.96 + Math.random() * 0.08;

      // 1. Crisp paper-on-paper snap transient
      const snapSrc = ctx.createBufferSource();
      snapSrc.buffer = this.whiteNoiseBuffer;
      const snapFilter = ctx.createBiquadFilter();
      snapFilter.type = 'bandpass';
      snapFilter.frequency.setValueAtTime(2800 * jitter, now);
      snapFilter.frequency.exponentialRampToValueAtTime(1800 * jitter, now + 0.028);
      snapFilter.Q.value = 2.2;

      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(0.001, now);
      snapGain.gain.linearRampToValueAtTime(0.24, now + 0.002);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      snapSrc.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapSrc.start(now);
      snapSrc.stop(now + 0.032);

      // 2. Warm acoustic card-body pat on felt (no synth oscillator)
      const bodySrc = ctx.createBufferSource();
      bodySrc.buffer = this.pinkNoiseBuffer;
      const bodyFilter = ctx.createBiquadFilter();
      bodyFilter.type = 'bandpass';
      bodyFilter.frequency.setValueAtTime(480 * jitter, now + 0.004);
      bodyFilter.frequency.exponentialRampToValueAtTime(240 * jitter, now + 0.044);
      bodyFilter.Q.value = 2.4;

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.001, now + 0.004);
      bodyGain.gain.linearRampToValueAtTime(0.34, now + 0.007);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.046);

      bodySrc.connect(bodyFilter);
      bodyFilter.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      bodySrc.start(now + 0.004);
      bodySrc.stop(now + 0.048);
    } catch {
      // Fallback
    }
  }

  /**
   * MobilityWare ascending 13-rank Foundation chime + paper card snap (Ace = 1 -> King = 13)
   */
  public playFoundationPlaced(rank: number = 1): void {
    this.vibrate([12, 20, 15]);
    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Play the physical paper card snap first
    this.playCardPlace();

    try {
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

      [baseFreq, baseFreq * 1.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.03;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(idx === 0 ? 0.18 : 0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.23);
      });
    } catch {
      // Fallback
    }
  }

  /**
   * Rejected move sound: tactile double muted paper-on-felt tap ("tuk-tuk")
   * with zero screen flash and zero harsh synth buzzers.
   */
  public playInvalid(): void {
    this.vibrate([15, 35, 15]);

    if (!this.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.pinkNoiseBuffer || !this.whiteNoiseBuffer) return;

    try {
      // Two quick, dampened card-on-felt taps separated by 58ms
      [0, 0.058].forEach((offset, idx) => {
        const start = ctx.currentTime + offset;
        const freq = idx === 0 ? 420 : 310;

        // Muted felt thud
        const thudSrc = ctx.createBufferSource();
        thudSrc.buffer = this.pinkNoiseBuffer!;
        const thudFilter = ctx.createBiquadFilter();
        thudFilter.type = 'bandpass';
        thudFilter.frequency.setValueAtTime(freq, start);
        thudFilter.frequency.exponentialRampToValueAtTime(170, start + 0.038);
        thudFilter.Q.value = 2.6;

        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.001, start);
        thudGain.gain.linearRampToValueAtTime(idx === 0 ? 0.32 : 0.26, start + 0.002);
        thudGain.gain.exponentialRampToValueAtTime(0.001, start + 0.04);

        thudSrc.connect(thudFilter);
        thudFilter.connect(thudGain);
        thudGain.connect(ctx.destination);
        thudSrc.start(start);
        thudSrc.stop(start + 0.042);

        // Subtle dry paper edge rustle
        const paperSrc = ctx.createBufferSource();
        paperSrc.buffer = this.whiteNoiseBuffer!;
        const paperFilter = ctx.createBiquadFilter();
        paperFilter.type = 'bandpass';
        paperFilter.frequency.setValueAtTime(1950 - idx * 300, start);
        paperFilter.Q.value = 2.8;

        const paperGain = ctx.createGain();
        paperGain.gain.setValueAtTime(0.001, start);
        paperGain.gain.linearRampToValueAtTime(0.11, start + 0.002);
        paperGain.gain.exponentialRampToValueAtTime(0.001, start + 0.022);

        paperSrc.connect(paperFilter);
        paperFilter.connect(paperGain);
        paperGain.connect(ctx.destination);
        paperSrc.start(start);
        paperSrc.stop(start + 0.025);
      });
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

        gain.gain.setValueAtTime(0.24, startTime);
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
