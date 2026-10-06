// Synthesised sound effects and spoken prompts. No audio files needed.
const Sound = {
  ac: null, master: null, muted: false, voice: null,

  unlock() {
    try {
      if (!this.ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ac = new AC();
        this.master = this.ac.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(this.ac.destination);
      }
      if (this.ac.state === 'suspended') this.ac.resume();
    } catch (e) { /* no audio available */ }
  },
  ok() { return this.ac && !this.muted; },

  tone(f, dur, type = 'square', vol = 0.12, f2 = null, delay = 0) {
    if (!this.ok()) return;
    const t = this.ac.currentTime + delay;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.2, type = 'lowpass', freq = 800, delay = 0, freq2 = null) {
    if (!this.ok()) return;
    const t = this.ac.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ac.sampleRate * dur));
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ac.createBufferSource(); src.buffer = buf;
    const f = this.ac.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  },

  collect() { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.18, null, i * 0.07)); },
  jump() { this.tone(260, 0.22, 'sine', 0.18, 620); },
  flap() { this.noise(0.15, 0.12, 'bandpass', 600, 0, 300); },
  land() { this.noise(0.08, 0.1, 'lowpass', 300); },
  bonk() { this.tone(180, 0.2, 'square', 0.1, 70); this.noise(0.12, 0.12, 'lowpass', 400); },
  dig() { this.noise(0.18, 0.22, 'lowpass', 700, 0, 200); },
  place() { this.tone(200, 0.08, 'square', 0.1, 120); this.noise(0.06, 0.1, 'lowpass', 900); },
  pop() { this.tone(500, 0.08, 'sine', 0.15, 900); },
  click() { this.tone(660, 0.06, 'triangle', 0.12); },
  honk() { this.tone(330, 0.3, 'sawtooth', 0.08); this.tone(415, 0.3, 'sawtooth', 0.07); },
  roar() {
    this.noise(0.9, 0.45, 'lowpass', 1000, 0, 180);
    this.tone(150, 0.9, 'sawtooth', 0.12, 55);
    this.tone(98, 0.9, 'square', 0.05, 45);
  },
  chomp() { this.tone(300, 0.06, 'square', 0.12, 120); this.noise(0.06, 0.15, 'lowpass', 900, 0.07); this.tone(260, 0.06, 'square', 0.1, 100, 0.08); },
  whoosh() { this.noise(0.25, 0.12, 'bandpass', 400, 0, 2000); this.noise(0.08, 0.2, 'lowpass', 500, 0.22); },
  yelp() { this.tone(500, 0.25, 'sine', 0.1, 1100); },
  squeak() { this.tone(900, 0.25, 'sine', 0.12, 1500); this.tone(1200, 0.2, 'sine', 0.08, 1800, 0.12); },
  fanfare() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i === 3 ? 0.5 : 0.16, 'square', 0.09, null, i * 0.15));
    [262, 330, 392, 523].forEach((f, i) => this.tone(f, i === 3 ? 0.5 : 0.16, 'triangle', 0.12, null, i * 0.15));
  },

  pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    this.voice = vs.find(v => /en-AU/i.test(v.lang)) || vs.find(v => /en-GB/i.test(v.lang)) ||
      vs.find(v => /^en/i.test(v.lang)) || null;
  },
  say(text) {
    if (this.muted || !('speechSynthesis' in window)) return;
    try {
      if (!this.voice) this.pickVoice();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      u.rate = 0.95; u.pitch = 1.25;
      speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  },
};
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => Sound.pickVoice();
