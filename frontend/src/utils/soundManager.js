// ─── Synthesized Sound Manager (Web Audio API) ──────────────────────────────
class SoundManager {
  constructor() {
    this._ctx = null;
    this.enabled = true;
  }

  _ctx_get() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  _tone(freq, dur, type = 'sine', vol = 0.25, delay = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this._ctx_get();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur + 0.05);
    } catch (_) {}
  }

  _noise(dur, vol = 0.08, delay = 0, hpFreq = 800) {
    if (!this.enabled) return;
    try {
      const ctx = this._ctx_get();
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = hpFreq;
      src.connect(hp); hp.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      src.start(ctx.currentTime + delay);
      src.stop(ctx.currentTime + delay + dur + 0.05);
    } catch (_) {}
  }

  // 🔔 Player joins — gentle two-note chime
  playerJoin() {
    this._tone(660, 0.18, 'sine', 0.22);
    this._tone(880, 0.22, 'sine', 0.18, 0.14);
  }

  // 🚀 Game starts — ascending arpeggio
  gameStart() {
    [261, 330, 392, 523].forEach((f, i) => this._tone(f, 0.28, 'triangle', 0.22, i * 0.11));
    this._noise(0.12, 0.07, 0.38);
  }

  // ✅ Correct guess — bright success fanfare
  correctGuess() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.22, 'sine', 0.28, i * 0.08));
    this._noise(0.08, 0.1, 0.28);
  }

  // 🎯 Someone else guessed — softer version
  otherGuess() {
    this._tone(523, 0.15, 'sine', 0.18);
    this._tone(659, 0.18, 'sine', 0.15, 0.1);
  }

  // 🎯 Close guess — "almost" descending bloop
  closeGuess() {
    this._tone(440, 0.12, 'triangle', 0.18);
    this._tone(392, 0.16, 'triangle', 0.14, 0.1);
  }

  // 👁️ Word revealed — mystery swoosh
  roundReveal() {
    this._tone(220, 0.12, 'sawtooth', 0.08);
    this._tone(330, 0.18, 'sine', 0.18, 0.08);
    this._tone(440, 0.22, 'sine', 0.2, 0.18);
    this._tone(660, 0.3, 'sine', 0.18, 0.28);
  }

  // ⏱️ Timer tick — urgent click for <10s
  timerTick() {
    this._tone(1200, 0.04, 'square', 0.1);
    this._noise(0.04, 0.05, 0.02, 2000);
  }

  // 🏆 Winner — full victory melody
  gameWinner() {
    [392, 523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.38, 'triangle', 0.22, i * 0.13));
    this._noise(0.25, 0.1, 0.62);
    this._tone(1046, 0.55, 'sine', 0.28, 0.68);
  }

  // 🔄 New round / choosing — quick double ping
  roundStart() {
    this._tone(523, 0.14, 'sine', 0.2);
    this._tone(659, 0.18, 'sine', 0.18, 0.14);
  }

  // 🚫 Room full / error
  error() {
    this._tone(220, 0.12, 'sawtooth', 0.2);
    this._tone(185, 0.2, 'sawtooth', 0.18, 0.1);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = val;
  }
}

export const soundManager = new SoundManager();
