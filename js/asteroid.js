// The asteroid: 10 minutes after a world starts it hits Earth and it's game over.
// Hidden escape: be on the Moon when it hits.
const DOOM_TIME = 600;
const Asteroid = {
  left: DOOM_TIME,
  said: {},
  reset() { this.left = DOOM_TIME; this.said = {}; },
  save() { return Math.round(this.left); },
  load(v) { this.left = typeof v === 'number' && v > 0 ? Math.min(v, DOOM_TIME) : DOOM_TIME; this.said = {}; },
  get k() { return 1 - this.left / DOOM_TIME; },   // 0 at the start, 1 at impact

  update(dt) {
    if ((typeof Chess !== 'undefined' && Game.overlay === Chess) || Game.overlay === Doom) return;   // time stands still at the chess table
    this.left -= dt;
    const warn = (key, at, text) => { if (this.left <= at && !this.said[key]) { this.said[key] = true; Sound.say(text); Sound.tone(220, 0.5, 'sawtooth', 0.08, 110); } };
    warn('2m', 120, 'The asteroid is getting close! Two minutes left!');
    warn('1m', 60, 'One minute until the asteroid hits! Can you fly the rocket to the Moon?');
    for (let s = 10; s >= 1; s--) if (this.left <= s && !this.said['c' + s]) { this.said['c' + s] = true; Sound.say(String(s)); }
    if (this.left > 0) return;
    this.reset();
    if (Game.onMoon) {
      // Watched from the Moon: the dinos who flew away are safe.
      Hud.celebrate('You escaped!');
      Sound.noise(2, 0.3, 'lowpass', 300, 0, 80);
      Sound.say('The asteroid hit Earth! But you escaped to the Moon! Well done!');
      Game.addStars(10);
      Moon.earthHit = 3;
      Moon.earthWasHit = true;   // a fresh Earth waits back home
    } else Doom.start();
  },

  // Growing in the sky as the time runs out.
  drawSky(c, t) {
    const k = this.k;
    if (k < 0.05) return;
    const x = W * 0.62 - k * 120, y = 70 + k * 40, r = 4 + k * k * 70;
    c.save(); c.translate(x, y); c.rotate(-0.6);
    c.fillStyle = 'rgba(255,170,80,0.35)';
    c.beginPath(); c.moveTo(-r * 0.6, -r * 0.6); c.lineTo(r * 3.2, -r * 0.2); c.lineTo(r * 3.2, r * 0.2); c.lineTo(-r * 0.6, r * 0.6); c.fill();
    c.restore();
    ell(c, x, y, r, r * 0.9, '#7a5c4a', Math.max(2, r / 10));
    ell(c, x - r * 0.3, y - r * 0.2, r * 0.25, r * 0.2, '#5c4033', 0);
    ell(c, x + r * 0.25, y + r * 0.3, r * 0.18, r * 0.15, '#5c4033', 0);
    if (this.left < 60) { c.fillStyle = `rgba(255,80,40,${0.12 * (1 - this.left / 60)})`; c.fillRect(0, 0, W, H); }
  },
  // HUD: a little track from the asteroid to Earth, with minutes:seconds.
  drawHud(c) {
    const x0 = W - 300, y = 88, len = 200;
    rbox(c, x0 - 18, y - 16, len + 36, 32, 16, 'rgba(255,255,255,0.7)', 3);
    c.fillStyle = '#ffa8a8'; c.fillRect(x0, y - 3, len * this.k, 6);
    c.font = `22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🌍', x0 + len, y + 1);
    c.fillText('☄️', x0 + len * this.k, y + 1);
    const m = Math.floor(Math.max(0, this.left) / 60), s = Math.floor(Math.max(0, this.left) % 60);
    c.font = `800 16px ${FONT}`; c.fillStyle = this.left < 60 ? '#e03131' : OUT;
    c.fillText(`${m}:${String(s).padStart(2, '0')}`, x0 - 34, y + 1);
  },
};

// Impact on Earth: the asteroid streaks down, flash, shake, then GAME OVER and play again.
const Doom = {
  t: 0,
  start() {
    this.t = 0;
    Game.overlay = this;
    UI.configure({ dirs: 'none', action: null, roar: false, home: false });
    Sound.noise(3, 0.5, 'lowpass', 1200, 0, 60);
    Sound.tone(80, 2.5, 'sawtooth', 0.15, 30);
  },
  update(dt) {
    this.t += dt;
    if (this.t > 3.5 && (Input.pressed.action || Input.pressed.enter)) this.again();
  },
  tap() { if (this.t > 3.5) this.again(); return true; },
  again() {
    Game.overlay = null;
    Game.resetWorld();
    Sound.say('A brand new world! Ten more minutes!');
  },
  draw(c) {
    const t = this.t;
    if (t < 1.6) {
      // Streaking in.
      const k = t / 1.6, x = lerp(W * 0.9, W * 0.45, k), y = lerp(-80, H * 0.75, k);
      c.save(); c.translate(x, y); c.rotate(-0.6);
      c.fillStyle = 'rgba(255,170,80,0.6)';
      c.beginPath(); c.moveTo(-40, -40); c.lineTo(400, -12); c.lineTo(400, 12); c.lineTo(-40, 40); c.fill();
      c.restore();
      ell(c, x, y, 60, 54, '#7a5c4a', 6);
      return;
    }
    const shake = t < 3 ? (Math.random() - 0.5) * 30 * (3 - t) : 0;
    c.save(); c.translate(shake, shake);
    const flash = clamp(1 - (t - 1.6) / 1.2, 0, 1);
    c.fillStyle = `rgba(255,${200 - flash * 60},${120 - flash * 100},${0.55 + flash * 0.45})`;
    c.fillRect(-40, -40, W + 80, H + 80);
    c.restore();
    if (t > 2.2) {
      c.fillStyle = `rgba(30,20,40,${Math.min(0.75, (t - 2.2) * 0.6)})`; c.fillRect(0, 0, W, H);
      const s = Math.min(1, (t - 2.2) * 2);
      c.save(); c.translate(W / 2, H * 0.38); c.scale(s, s);
      bigText(c, 'GAME OVER', 0, 0, 88, '#ff6b6b');
      c.restore();
      c.font = `46px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('☄️💥🌍', W / 2, H * 0.55);
    }
    if (t > 3.5) {
      const p = 1 + Math.sin(t * 5) * 0.06;
      c.save(); c.translate(W / 2, H * 0.78); c.scale(p, p);
      ell(c, 0, 0, 52, 52, '#5ccf4a', 6);
      poly(c, [-14, -24, 28, 0, -14, 24], '#fff', 5);
      c.restore();
    }
  },
};
