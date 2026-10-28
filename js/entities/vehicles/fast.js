// Fast things: the dirt bike (jumps and flips), the sports car and the race car, plus the drag strip.

// ---------- Motorbike ----------
defVehicle('motorbike', {
  name: 'Motorbike', say: 'Motorbike! Brrm brrm!', icon: '⤴️', w: 72, h: 54, speed: 430, accel: 2.6, look: 260, exhaust: [-30, -20],
  init(v) { v.s.flip = 0; v.s.lean = 0; v.s.flipCool = 0; },
  act(v, dt, inp) {
    const b = v.body, s = v.s;
    s.flipCool = Math.max(0, s.flipCool - dt);
    if (inp.actionP) {
      if (b.onGround) {
        // Big bunny-hop off the back wheel.
        b.vy = -720; Sound.jump(); Sound.tone(150, 0.25, 'sawtooth', 0.07, 260);
        Fx.burst(b.x - v.facing * 24, b.y, 8, { speed: 110, up: 50, g: 300, life: 0.5, r: 7, color: 'rgba(200,180,150,0.7)' });
      } else if (!s.flipping) { s.flipping = true; s.flip = 0; Sound.tone(500, 0.35, 'triangle', 0.08, 900); }
    }
    if (s.flipping) {
      s.flip += dt * 11;
      if (s.flip >= TAU) { s.flip = 0; s.flipping = false; s.flips = (s.flips || 0) + 1; }
    }
    if (b.onGround) {
      if (s.flipping) { s.flipping = false; s.flip = 0; s.flips = 0; Sound.bonk(); }   // landed mid-flip: bump, no prize
      if (s.flips) {
        if (v.driver === Player && !s.flipCool) {
          s.flipCool = 4;
          Game.addStars(1); Game.popupStar(b.x, b.y - 90);
          Pow.add(b.x, b.y - 80, s.flips > 1 ? 'DOUBLE FLIP!' : 'FLIP!');
          Sound.collect();
        }
        s.flips = 0;
      }
      // Pull a little wheelie when pulling away.
      const pulling = v.driver && Math.abs(b.vx) > 40 && Math.abs(b.vx) < 260 && Math.sign(b.vx) === v.facing;
      s.lean = lerp(s.lean, pulling ? 0.22 : 0, Math.min(1, dt * 6));
    } else s.lean = lerp(s.lean, 0.1, Math.min(1, dt * 3));
  },
  draw(c, v) {
    const s = v.s;
    c.save();
    // Spin round the middle for flips; wheelie pivots on the back wheel.
    if (s.flip) { c.translate(0, -30); c.rotate(-s.flip); c.translate(0, 30); }
    if (s.lean) { c.translate(-26, -16); c.rotate(-s.lean); c.translate(26, 16); }
    // Knobbly wheels.
    for (const wx of [-26, 27]) {
      ell(c, wx, -16, 16, 16, '#2b2b33', 4);
      c.save(); c.translate(wx, -16); c.rotate(v.wheel);
      c.strokeStyle = '#adb5bd'; c.lineWidth = 2;
      for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(11, 0); c.stroke(); }
      c.restore();
      ell(c, wx, -16, 4, 4, '#ced4da', 2);
    }
    // Frame, forks, exhaust, seat, tank, number plate.
    limb(c, [-26, -16, -4, -30, 18, -30], 5, '#495057');
    limb(c, [27, -16, 18, -46], 5, '#adb5bd');
    limb(c, [-30, -24, -8, -24], 5, '#868e96');
    poly(c, [-14, -32, 16, -32, 22, -40, 4, -46, -10, -42], '#ff922b', 3);
    rbox(c, -26, -42, 22, 8, 4, '#343a40', 3);
    poly(c, [-34, -28, -16, -30, -24, -40], '#ff922b', 3);
    limb(c, [14, -50, 24, -48], 4, '#343a40');
    rbox(c, 18, -38, 14, 12, 3, '#fff', 2);
    c.font = `10px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; vehicleText(c, v, '1', 25, -31);
    v.drawDriver(c, -8, -44, 0.42);
    c.restore();
  },
});

// Low, fast cars share a shape-maker: body outline points and a bubble cockpit.
function drawFlame(c, x, y, t, len) {
  const f = len * (0.8 + 0.3 * Math.sin(t * 40));
  poly(c, [x, y - 6, x - f, y, x, y + 6], '#ff922b', 0);
  poly(c, [x, y - 3, x - f * 0.55, y, x, y + 3], '#ffe066', 0);
}
// Turbo: the button gives a burst of speed with flames, then needs a moment to recharge.
function turbo(v, dt, inp, boost, len) {
  const s = v.s;
  s.turboCool = Math.max(0, (s.turboCool || 0) - dt);
  s.turbo = Math.max(0, (s.turbo || 0) - dt);
  if (inp.actionP && !s.turboCool) {
    s.turbo = len; s.turboCool = len + 1.5;
    Sound.noise(0.6, 0.18, 'bandpass', 900, 0, 300); Sound.tone(120, 0.6, 'sawtooth', 0.08, 320);
  }
  s.slow = s.turbo > 0 ? boost : 1;
  if (s.turbo > 0 && v.body.onGround && Math.abs(v.body.vx) > 100 && Math.random() < 0.5)
    Fx.add({ x: v.body.x - v.facing * v.body.w * 0.45, y: v.body.y - 6, vx: -v.facing * rand(60, 140), vy: rand(-40, -10), life: 0.4, r: 6, color: 'rgba(200,200,210,0.6)', shape: 'grow' });
}

// ---------- Sports car ----------
defVehicle('sportscar', {
  name: 'Sports car', say: 'Sports car! Super fast!', icon: '🔥', w: 116, h: 46, speed: 540, accel: 2.2, look: 320, exhaust: [-56, -14],
  act(v, dt, inp) { turbo(v, dt, inp, 1.25, 1); },
  draw(c, v) {
    if (v.s.turbo > 0) drawFlame(c, -58, -16, v.t, 30);
    c.beginPath(); c.moveTo(-58, -14); c.lineTo(-58, -28); c.lineTo(-30, -32); c.lineTo(-12, -48); c.lineTo(14, -48);
    c.lineTo(34, -32); c.lineTo(58, -26); c.lineTo(58, -14); c.closePath(); fillStroke(c, '#e8262b');
    c.save(); c.beginPath(); c.moveTo(-8, -33); c.lineTo(-2, -45); c.lineTo(12, -45); c.lineTo(26, -33); c.closePath();
    c.fillStyle = '#bdf3ff'; c.fill(); c.clip(); v.drawDriver(c, 8, -20, 0.3); c.restore();
    c.beginPath(); c.moveTo(-8, -33); c.lineTo(-2, -45); c.lineTo(12, -45); c.lineTo(26, -33); c.closePath(); fillStroke(c, null, 3);
    poly(c, [-58, -30, -46, -40, -36, -32], '#c92a2a', 3);   // spoiler
    c.fillStyle = '#fff'; c.fillRect(-50, -24, 96, 3);
    ell(c, 52, -24, 5, 3, '#fff3bf', 2);
    drawWheel(c, -34, -14, 14, v.wheel, '#ffd43b'); drawWheel(c, 36, -14, 14, v.wheel, '#ffd43b');
  },
});

// ---------- Race car ----------
defVehicle('racecar', {
  name: 'Race car', say: 'Race car! The fastest of all!', icon: '🚀', w: 124, h: 42, speed: 640, accel: 2, look: 340,
  act(v, dt, inp) { turbo(v, dt, inp, 1.4, 1.5); },
  draw(c, v) {
    if (v.s.turbo > 0) drawFlame(c, -60, -22, v.t, 44);
    // Long nose, big rear wing, open cockpit, chunky slicks.
    poly(c, [-56, -14, -56, -30, -20, -34, 30, -24, 62, -18, 62, -12], '#1c7ed6', 4);
    rbox(c, -64, -50, 12, 22, 3, '#1864ab', 3); rbox(c, -70, -54, 26, 8, 3, '#ffd43b', 3);
    rbox(c, 54, -20, 14, 6, 2, '#ffd43b', 2);
    c.save(); c.beginPath(); c.arc(-12, -34, 16, Math.PI, 0); c.closePath(); c.clip();
    v.drawDriver(c, -12, -22, 0.3); c.restore();
    limb(c, [-30, -34, -4, -44], 4, '#343a40');   // halo bar
    c.fillStyle = '#fff'; c.beginPath(); c.arc(16, -24, 7, 0, TAU); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    c.font = `10px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; vehicleText(c, v, '1', 16, -24);
    ell(c, -38, -17, 17, 17, '#212529', 4); ell(c, -38, -17, 7, 7, '#adb5bd', 2);
    ell(c, 40, -15, 15, 15, '#212529', 4); ell(c, 40, -15, 6, 6, '#adb5bd', 2);
  },
});

// ---------- Drag strip ----------
// Stop behind the start gantry, wait for the lights, then floor it to the finish line.
const DragRace = {
  phase: null, t: 0, best: 0, last: 0, holdT: 0, msgT: 0,
  reset() { this.phase = null; this.t = 0; this.holdT = 0; },
  update(dt) {
    this.msgT = Math.max(0, this.msgT - dt);
    const v = Player.vehicle;
    if (!v || v.def.mover !== 'ground' || Game.away) { this.phase = null; return; }
    const b = v.body, start = SPEEDWAY.START * TS, finish = SPEEDWAY.FINISH * TS;
    if (!this.phase) {
      const waiting = b.x > start - 160 && b.x < start - 10 && Math.abs(b.vx) < 40 && v.facing > 0 && b.onGround;
      this.holdT = waiting ? this.holdT + dt : 0;
      if (this.holdT > 0.5) { this.phase = 'lights'; this.t = 0; }
      return;
    }
    this.t += dt;
    if (this.phase === 'lights') {
      const lit = Math.min(4, Math.floor(this.t / 0.8) + 1), before = Math.min(4, Math.floor((this.t - dt) / 0.8) + 1);
      if (lit !== before || this.t === dt) Sound.tone(lit >= 4 ? 880 : 440, lit >= 4 ? 0.5 : 0.2, 'square', 0.1);
      if (b.x > start + 4) { this.phase = null; this.msg = 'Too early!'; this.msgT = 2; Sound.bonk(); return; }
      if (this.t >= 2.4) { this.phase = 'run'; this.t = 0; }
      return;
    }
    // Racing.
    if (b.x < start - 200 || v.facing < 0 && b.vx < -50) { this.phase = null; return; }
    if (b.x >= finish) {
      const time = this.t, record = !this.best || time < this.best;
      this.phase = null; this.last = time;
      Game.addStars(1);
      if (record) { this.best = time; Game.addStars(3); Game.celebrate('NEW RECORD! ' + time.toFixed(2) + 's'); Sound.fanfare(); }
      else { Hud.celebrate(time.toFixed(2) + ' seconds!'); Sound.collect(); }
      Game.popupStar(b.x, b.y - 100);
      Fx.burst(b.x, b.y - 80, 24, { speed: 300, up: 200, g: 400, life: 1.2, r: 8, color: ['#fff', '#212529', '#ffd43b'], shape: 'star' });
    }
  },
  // How many lights are lit (1-3 red, 4 = green).
  lights() { return this.phase === 'lights' ? Math.min(4, Math.floor(this.t / 0.8) + 1) : this.phase === 'run' ? 4 : 0; },
  drawHud(c) {
    if (this.phase === 'run' || this.msgT > 0) {
      rbox(c, W / 2 - 110, 70, 220, 56, 16, 'rgba(255,255,255,0.92)', 4);
      bigText(c, this.phase === 'run' ? '⏱️ ' + this.t.toFixed(2) : this.msg, W / 2, 99, 30, '#ffd43b');
    } else if (this.phase === 'lights') {
      rbox(c, W / 2 - 110, 70, 220, 56, 16, 'rgba(30,30,40,0.9)', 4);
      for (let i = 0; i < 4; i++) ell(c, W / 2 - 75 + i * 50, 98, 16, 16, i < this.lights() ? (this.lights() >= 4 ? '#51cf66' : '#ff4040') : '#495057', 3);
    }
  },
};

// Speedway props: start gantry with its lights, finish banner, grandstand full of dinos.
function drawSpeedwayProp(c, p, sx, sy) {
  if (p.type === 'gantry') {
    limb(c, [sx - 70, sy, sx - 70, sy - 170], 8, '#868e96'); limb(c, [sx + 70, sy, sx + 70, sy - 170], 8, '#868e96');
    rbox(c, sx - 80, sy - 190, 160, 36, 8, '#343a40', 4);
    const lit = DragRace.lights();
    for (let i = 0; i < 4; i++) ell(c, sx - 54 + i * 36, sy - 172, 11, 11, i < lit ? (lit >= 4 ? '#51cf66' : '#ff4040') : '#495057', 3);
    c.font = `22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🏁', sx, sy - 210);
    c.fillStyle = '#fff'; c.fillRect(sx - 4, sy - 4, 8, 4);   // start line
  } else if (p.type === 'finish') {
    limb(c, [sx - 70, sy, sx - 70, sy - 170], 8, '#868e96'); limb(c, [sx + 70, sy, sx + 70, sy - 170], 8, '#868e96');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 3; j++) { c.fillStyle = (i + j) % 2 ? '#fff' : '#212529'; c.fillRect(sx - 80 + i * 10, sy - 190 + j * 10, 10, 10); }
    c.lineWidth = 4; c.strokeStyle = OUT; c.strokeRect(sx - 80, sy - 190, 160, 30);
    for (let i = 0; i < 2; i++) { c.fillStyle = i % 2 ? '#fff' : '#212529'; c.fillRect(sx - 8 + i * 8, sy - 4, 8, 4); }
  } else if (p.type === 'stand') {
    const w = p.w * TS;
    for (let r = 0; r < 4; r++) {
      rbox(c, sx - w / 2 + r * 20, sy - 50 - r * 34, w - r * 40, 34, 4, r % 2 ? '#74c0fc' : '#4dabf7', 3);
      // A crowd of dino heads, bouncing when there's a race on.
      for (let i = 0; i < (w - r * 40 - 40) / 40; i++) {
        const dx = sx - w / 2 + r * 20 + 30 + i * 40, bob = Math.abs(Math.sin(Game.t * 6 + i + r * 2)) * (DragRace.phase === 'run' ? 8 : 2);
        const d = DINO_TYPES[DINO_KEYS[(i * 3 + r * 5) % DINO_KEYS.length]], hy = sy - 64 - r * 34 - bob;
        ell(c, dx, hy, 13, 11, d.body, 3);
        ell(c, dx + 4, hy - 3, 3, 3, '#fff', 0); ell(c, dx + 5, hy - 3, 1.6, 1.6, OUT, 0);
      }
    }
    limb(c, [sx - w / 2, sy, sx - w / 2, sy - 200], 6, '#868e96'); limb(c, [sx + w / 2, sy, sx + w / 2, sy - 200], 6, '#868e96');
    poly(c, [sx - w / 2 - 20, sy - 196, sx + w / 2 + 20, sy - 196, sx + w / 2, sy - 216, sx - w / 2, sy - 216], '#e8262b', 4);
  }
}
const SPEEDWAY_PROPS = new Set(['gantry', 'finish', 'stand']);
