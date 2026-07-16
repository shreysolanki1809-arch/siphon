// audio.js
// All sound here is generated procedurally with the Web Audio API so the
// prototype makes noise with zero asset files. When you have real 3D sound
// files, replace the bodies of these methods with an <audio>/AudioBuffer
// player — the method names/signatures are the "interface" the rest of the
// game calls, so nothing else needs to change. See README for the swap-in guide.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.humGain = null;
    this.unlocked = false;
  }

  // Browsers block audio until a user gesture — call this from the "start" click.
  unlock() {
    if (this.unlocked) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.unlocked = true;
    this._startAmbientHum();
  }

  _tone({ freq = 440, duration = 0.15, type = 'sine', volume = 0.3, sweepTo = null }) {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  _startAmbientHum() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 55; // low electrical hum
    gain.gain.value = 0.035;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.humGain = gain;

    // subtle slow beat/flicker on the hum
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
  }

  footstep(running) {
    this._tone({
      freq: running ? 160 : 120,
      duration: 0.06,
      type: 'square',
      volume: running ? 0.05 : 0.03,
    });
  }

  disguiseOn() {
    this._tone({ freq: 300, duration: 0.35, type: 'sine', sweepTo: 900, volume: 0.25 });
  }

  disguiseOff() {
    this._tone({ freq: 900, duration: 0.3, type: 'sine', sweepTo: 200, volume: 0.25 });
  }

  taskOpen() {
    this._tone({ freq: 500, duration: 0.12, type: 'triangle', volume: 0.2 });
  }

  wireCorrect() {
    this._tone({ freq: 700, duration: 0.12, type: 'sine', sweepTo: 1100, volume: 0.25 });
  }

  wireWrong() {
    this._tone({ freq: 200, duration: 0.25, type: 'sawtooth', sweepTo: 80, volume: 0.3 });
  }

  taskComplete() {
    if (!this.unlocked) return;
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this._tone({ freq: f, duration: 0.25, type: 'sine', volume: 0.25 }), i * 90);
    });
  }

  wardenAlert() {
    this._tone({ freq: 620, duration: 0.5, type: 'sawtooth', sweepTo: 900, volume: 0.3 });
  }

  wardenLost() {
    this._tone({ freq: 500, duration: 0.4, type: 'sine', sweepTo: 250, volume: 0.2 });
  }

  win() {
    if (!this.unlocked) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._tone({ freq: f, duration: 0.3, type: 'sine', volume: 0.3 }), i * 130);
    });
  }

  lose() {
    if (!this.unlocked) return;
    [300, 250, 180, 100].forEach((f, i) => {
      setTimeout(() => this._tone({ freq: f, duration: 0.4, type: 'sawtooth', volume: 0.3 }), i * 150);
    });
  }
}
