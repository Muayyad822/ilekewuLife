// Sound Engine & Background Nasheed Player for Ile-Kewu

/**
 * Place your Nasheed MP3 at `public/audio/nasheed.mp3` (or add more track URLs here).
 * It will loop automatically in the background whenever the game is unmuted.
 */
export const NASHEED_SOURCES: string[] = [
  '/audio/nasheed.mp3',
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgStarted: boolean = false;
  private htmlAudio: HTMLAudioElement | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isPlaying(): boolean {
    return Boolean(this.htmlAudio && !this.htmlAudio.paused && !this.htmlAudio.ended);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      if (this.htmlAudio) this.htmlAudio.pause();
    } else {
      this.startBgNasheed();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Starts continuous background Nasheed audio from `public/audio/nasheed.mp3`.
   */
  public startBgNasheed() {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    this.initContext();

    if (!this.htmlAudio) {
      if (NASHEED_SOURCES.length === 0) return;
      const audio = new Audio(NASHEED_SOURCES[0]);
      audio.loop = true;
      audio.volume = 0.12;
      this.htmlAudio = audio;
    }

    this.bgStarted = true;

    if (!this.isMuted) {
      const p = this.htmlAudio.play();
      if (p !== undefined) {
        p.catch(() => {
          // Playback rejected (e.g., user hasn't interacted or browser blocked)
          // We keep bgStarted true so any subsequent tap automatically retries
        });
      }
    }
  }

  // Pasan (Cane / Whip) Swoosh sound
  public playPasan() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Wooden Slate (Walaah) tap / clapper sound
  public playWalaahTap() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Coin / Sadaqah / Naira reward sound
  public playCoin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // Takbeer / Victory / Walimah celebratory chime
  public playTakbeer() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.1);

      gain.gain.setValueAtTime(0.12, this.ctx!.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(this.ctx!.currentTime + idx * 0.1);
      osc.stop(this.ctx!.currentTime + idx * 0.1 + 0.4);
    });
  }

  // Soft Slate Water Washing Sound
  public playWaterWash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.3);
  }
}

export const sound = new SoundEngine();
