// Title screen and dinosaur picker. Pictures and voice only; no reading needed.
const Title = {
  t: 0,
  enter() {
    this.t = 0;
    UI.configure({ dirs: 'none', action: '▶', roar: true, home: false });
  },
  update(dt) {
    this.t += dt;
    if (Input.pressed.action || Input.pressed.enter) this.go();
    if (Input.pressed.roar) Sound.roar();
  },
  go() { Sound.click(); Game.setMode('pick'); },
  tap() { this.go(); },
  draw(c) {
    drawBackdrop(c, this.t * 60, 0, this.t);
    c.fillStyle = '#5cc84a'; c.fillRect(0, 430, W, H - 430);
    c.fillStyle = '#a0662e'; c.fillRect(0, 456, W, H - 456);
    c.fillStyle = OUT; c.fillRect(0, 430, W, 4);
    // Parade of dinos walking across.
    DINO_KEYS.forEach((k, i) => {
      const x = ((this.t * 70 + i * 150) % (W + 300)) - 150;
      drawDino(c, x, 432, 0.7, k, { t: this.t + i, walk: this.t * 9 + i, roar: (Math.floor(this.t + i * 0.7) % 7 === 0) ? 1 : 0 });
    });
    const bounce = Math.sin(this.t * 3) * 6;
    c.save(); c.translate(W / 2, 120 + bounce); c.rotate(Math.sin(this.t * 1.5) * 0.02);
    bigText(c, 'DINO', -10, -30, 96, '#5ccf4a');
    bigText(c, 'VEHICLES', 0, 50, 84, '#ffd43b');
    c.restore();
    // Play button.
    const s = 1 + Math.sin(this.t * 5) * 0.06;
    c.save(); c.translate(W / 2, 300); c.scale(s, s);
    ell(c, 0, 0, 62, 62, '#ff6b6b', 6);
    poly(c, [-16, -28, 32, 0, -16, 28], '#fff', 5);
    c.restore();
    // Lets grown-ups see the game is saved on this device and will work with no internet.
    if (Game.offlineReady) {
      rbox(c, 16, H - 52, 250, 38, 19, 'rgba(255,255,255,0.85)', 3);
      c.font = `800 19px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#2b8a3e';
      c.fillText('✈️ ✔ Ready to play offline', 30, H - 33);
    }
    c.font = `800 16px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillText(`Version ${GAME_VERSION} · ${RELEASE_DATE}`, W / 2, H - 22);
  },
};

const Picker = {
  t: 0, sel: 0, chosenT: 0,
  slots() {
    return DINO_KEYS.map((k, i) => {
      const row = i < 4 ? 0 : 1, col = row ? i - 4 : i;
      const n = row ? 3 : 4;
      return { k, x: W / 2 + (col - (n - 1) / 2) * 210, y: row ? 470 : 280 };
    });
  },
  enter() {
    this.t = 0; this.chosenT = 0;
    this.sel = Math.max(0, DINO_KEYS.indexOf(Player.type));
    UI.configure({ dirs: 'lr', action: '✔', roar: true });
    Sound.say('Pick your dinosaur!');
  },
  update(dt) {
    this.t += dt;
    if (this.chosenT > 0) {
      this.chosenT -= dt;
      if (this.chosenT <= 0) Game.startPlay(DINO_KEYS[this.sel]);
      return;
    }
    if (Input.pressed.left) this.move(-1);
    if (Input.pressed.right) this.move(1);
    if (Input.pressed.up) this.move(-4);
    if (Input.pressed.down) this.move(4);
    if (Input.pressed.action || Input.pressed.enter) this.choose(this.sel);
    if (Input.pressed.roar) Sound.roar();
  },
  move(d) {
    this.sel = clamp(this.sel + d, 0, DINO_KEYS.length - 1);
    Sound.click(); Sound.say(DINO_TYPES[DINO_KEYS[this.sel]].name);
  },
  choose(i) {
    this.sel = i; this.chosenT = 1.1;
    Sound.roar(); Sound.say(DINO_TYPES[DINO_KEYS[i]].say);
  },
  tap(x, y) {
    if (this.chosenT > 0) return;
    let best = -1, bd = 120;
    this.slots().forEach((s, i) => { const d = dist(x, y, s.x, s.y - 50); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) this.choose(best);
  },
  draw(c) {
    drawBackdrop(c, this.t * 20, 0, this.t);
    c.fillStyle = 'rgba(92,200,74,0.9)'; c.fillRect(0, 500, W, 40);
    bigText(c, 'Pick your dino!', W / 2, 70, 56, '#fff');
    this.slots().forEach((s, i) => {
      const on = i === this.sel;
      const jump = on ? Math.abs(Math.sin(this.t * 6)) * (this.chosenT > 0 ? 40 : 12) : 0;
      ell(c, s.x, s.y + 4, 80, 16, on ? '#ffd43b' : 'rgba(0,0,0,0.15)', on ? 4 : 0);
      drawDino(c, s.x + 10, s.y - jump, s.k === 'brachio' ? 0.95 : 1.05, s.k, {
        t: this.t + i, roar: on && this.chosenT > 0 ? 1 : 0, flap: s.k === 'ptero' ? this.t * 6 : 0,
      });
    });
  },
};
