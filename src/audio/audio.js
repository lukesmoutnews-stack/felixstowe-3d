// Procedural Web Audio: every sound is synthesised at runtime (no third-party recordings).
// Audio only starts after the player clicks "Enter" and defaults to a moderate volume.

export class AudioEngine {
  constructor(settings) {
    this.settings = settings; this.ctx = null; this.ready = false;
  }
  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.ambBus = ctx.createGain(); this.ambBus.connect(this.master);
    this.fxBus = ctx.createGain(); this.fxBus.connect(this.master);
    this.applyVolumes();
    const noise = (seconds = 4, brown = false) => {
      const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = b.getChannelData(0);
      let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
      return b;
    };
    this.whiteBuf = noise(2);
    // sea: brown noise, low-passed, with slow swell modulation
    const sea = ctx.createBufferSource(); sea.buffer = noise(6, true); sea.loop = true;
    const seaLP = ctx.createBiquadFilter(); seaLP.type = 'lowpass'; seaLP.frequency.value = 700;
    this.seaGain = ctx.createGain(); this.seaGain.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const lfoG = ctx.createGain(); lfoG.gain.value = 0.35;
    const seaMod = ctx.createGain(); seaMod.gain.value = 0.65; lfo.connect(lfoG); lfoG.connect(seaMod.gain);
    sea.connect(seaLP); seaLP.connect(seaMod); seaMod.connect(this.seaGain); this.seaGain.connect(this.ambBus);
    sea.start(); lfo.start();
    // wind: band-passed white noise
    const wind = ctx.createBufferSource(); wind.buffer = noise(5); wind.loop = true;
    const wbp = ctx.createBiquadFilter(); wbp.type = 'bandpass'; wbp.frequency.value = 400; wbp.Q.value = 0.6;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.05;
    wind.connect(wbp); wbp.connect(this.windGain); this.windGain.connect(this.ambBus); wind.start();
    const wl = ctx.createOscillator(); wl.frequency.value = 0.07; const wlg = ctx.createGain(); wlg.gain.value = 180; wl.connect(wlg); wlg.connect(wbp.frequency); wl.start();
    // engine
    this.engOsc = ctx.createOscillator(); this.engOsc.type = 'sawtooth'; this.engOsc.frequency.value = 40;
    this.engOsc2 = ctx.createOscillator(); this.engOsc2.type = 'square'; this.engOsc2.frequency.value = 20;
    const elp = ctx.createBiquadFilter(); elp.type = 'lowpass'; elp.frequency.value = 500; this.engLP = elp;
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
    this.engOsc.connect(elp); this.engOsc2.connect(elp); elp.connect(this.engGain); this.engGain.connect(this.fxBus);
    this.engOsc.start(); this.engOsc2.start();
    this.ready = true;
  }
  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.masterVolume, t, 0.05);
    this.ambBus.gain.setTargetAtTime(s.ambienceVolume, t, 0.05);
    this.fxBus.gain.setTargetAtTime(s.effectsVolume, t, 0.05);
  }
  /** seaProximity 0..1, altitude metres above ground, engine {on, speed} */
  update({ seaProximity = 0, altitude = 0, engineOn = false, speed = 0 }) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.seaGain.gain.setTargetAtTime(0.05 + seaProximity * 0.5, t, 0.5);
    this.windGain.gain.setTargetAtTime(0.04 + Math.min(0.25, altitude / 1500) + seaProximity * 0.05, t, 0.8);
    const rpm = 0.25 + Math.min(1, Math.abs(speed) / 22) * 0.75;
    this.engGain.gain.setTargetAtTime(engineOn ? 0.09 + rpm * 0.05 : 0, t, 0.15);
    this.engOsc.frequency.setTargetAtTime(35 + rpm * 90, t, 0.1); this.engOsc2.frequency.setTargetAtTime(17 + rpm * 45, t, 0.1);
    this.engLP.frequency.setTargetAtTime(300 + rpm * 900, t, 0.1);
  }
  step(surface = 'hard', intensity = 1) {
    if (!this.ready) return;
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.whiteBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = surface === 'soft' ? 500 : surface === 'shingle' ? 2600 : 1400; f.Q.value = surface === 'shingle' ? 0.6 : 1.2;
    const g = ctx.createGain(); const t = ctx.currentTime;
    const v = (surface === 'soft' ? 0.12 : 0.2) * Math.min(1.3, intensity);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + (surface === 'shingle' ? 0.16 : 0.09));
    src.connect(f); f.connect(g); g.connect(this.fxBus); src.start(t, Math.random()); src.stop(t + 0.2);
  }
  chime() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [660, 880, 1320].forEach((fr, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr; const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(0.07, t + i * 0.09 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.9);
      o.connect(g); g.connect(this.fxBus); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 1);
    });
  }
  click() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 1200; g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(this.fxBus); o.start(t); o.stop(t + 0.06);
  }
  bump(strength) {
    if (!this.ready) return;
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.whiteBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; const g = ctx.createGain(); const t = ctx.currentTime;
    g.gain.setValueAtTime(Math.min(0.4, 0.1 * strength), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(f); f.connect(g); g.connect(this.fxBus); src.start(t); src.stop(t + 0.3);
  }
  suspend() { this.ctx?.suspend(); } resume() { this.ctx?.resume(); }
}
