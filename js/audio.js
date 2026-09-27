/** Tiny Web Audio “console game” juice — no asset files. */

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.eng = null;
    this.wind = null;
    this._unlocked = false;
    this._stallOn = false;
  }

  unlock() {
    if (this._unlocked) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
    this._unlocked = true;
    this._startLoops();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  _startLoops() {
    const ctx = this.ctx;
    // Engine: two detuned saws through a light filter
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.value = 70;
    oscB.frequency.value = 74;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 400;
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    oscA.connect(filt);
    oscB.connect(filt);
    filt.connect(this.engGain);
    this.engGain.connect(this.master);
    oscA.start();
    oscB.start();
    this.eng = { oscA, oscB, filt };

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    noise.loop = true;
    const nFilt = ctx.createBiquadFilter();
    nFilt.type = 'bandpass';
    nFilt.frequency.value = 800;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    noise.connect(nFilt);
    nFilt.connect(this.windGain);
    this.windGain.connect(this.master);
    noise.start();
    this.wind = { nFilt };
  }

  setFlight(throttle = 0, speed = 0, stalling = false, grounded = true) {
    if (!this._unlocked || !this.eng) return;
    const n1 = grounded ? throttle * 0.55 : 0.2 + throttle * 0.8 + Math.min(0.4, speed / 220);
    this.eng.oscA.frequency.setTargetAtTime(55 + n1 * 140, this.ctx.currentTime, 0.08);
    this.eng.oscB.frequency.setTargetAtTime(58 + n1 * 148, this.ctx.currentTime, 0.08);
    this.eng.filt.frequency.setTargetAtTime(280 + n1 * 1400, this.ctx.currentTime, 0.1);
    this.engGain.gain.setTargetAtTime(stalling ? 0.04 : n1 * 0.22, this.ctx.currentTime, 0.08);
    this.windGain.gain.setTargetAtTime(grounded ? 0.01 : Math.min(0.18, speed / 280), this.ctx.currentTime, 0.12);
    if (stalling && !this._stallOn) this.beep(880, 0.09, 'square', 0.08);
    this._stallOn = stalling;
  }

  hush() {
    if (!this._unlocked) return;
    this.engGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    this.windGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
  }

  beep(freq, dur = 0.12, type = 'square', vol = 0.12) {
    if (!this._unlocked) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }

  ring() {
    this.beep(880, 0.1, 'triangle', 0.14);
    setTimeout(() => this.beep(1320, 0.12, 'triangle', 0.1), 70);
  }

  land(soft = true) {
    this.beep(soft ? 220 : 90, 0.18, 'sine', soft ? 0.1 : 0.18);
  }

  crash() {
    this.beep(70, 0.35, 'sawtooth', 0.2);
    setTimeout(() => this.beep(40, 0.4, 'square', 0.12), 80);
  }

  medal() {
    this.beep(523, 0.1, 'triangle', 0.12);
    setTimeout(() => this.beep(659, 0.1, 'triangle', 0.12), 90);
    setTimeout(() => this.beep(784, 0.18, 'triangle', 0.14), 180);
  }
}
