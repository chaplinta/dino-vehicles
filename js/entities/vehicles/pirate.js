// The pirate ship: sails the sea, fires its cannon, and hoists its sails for Skull Island.
defVehicle('pirateship', {
  name: 'Pirate ship', iconScale: 0.24, say: 'The pirate ship! Arrr! Press up to hoist the sails.', icon: '💣', dirs: 'all',
  w: 210, h: 90, speed: 190, horn: 'boat', unlock: 0, draft: 34, look: 260, camY: -80,
  init(v) { Object.assign(v.s, { sail: 0.3, anchor: false, hoist: false, cool: 0, t: 0, balls: [] }); },
  reset(v) { v.s.hoist = false; v.s.anchor = false; },
  canExit(v) { return !v.s.hoist; },
  move(v, dt, inp, dir) {
    const s = v.s;
    if (s.anchor || s.hoist) dir = 0;
    boatMove(v, dt, inp, dir, this.speed * (0.6 + 0.4 * s.sail));
    if (s.hoist) {
      // Sails up, off to sea: it sails away by itself.
      v.facing = -1;
      v.body.vx = lerp(v.body.vx, -170, Math.min(1, dt * 1.5));
    }
  },
  act(v, dt, inp) {
    const s = v.s, b = v.body;
    s.cool -= dt;
    if (inp.downP && !s.hoist) {
      s.anchor = !s.anchor;
      Sound.noise(0.5, 0.15, 'bandpass', 1200);
      if (v.driver === Player) Sound.say(s.anchor ? 'Drop the anchor! The anchor holds the ship still.' : 'Anchor up!');
    }
    if (inp.upP && !s.hoist) {
      s.hoist = true; s.anchor = false; s.t = 0;
      if (v.driver === Player) Sound.say(Game.away === 'pirate' ? 'Hoist the sails! Home we go!' : 'Hoist the sails! Set sail for Skull Island!');
    }
    if (s.hoist) {
      s.sail = Math.min(1, s.sail + dt * 0.9);
      s.t += dt;
      if (s.t > 2.4 && v.driver === Player && Game.overlay !== Voyage) { s.hoist = false; Voyage.start(v); }
    } else if (!s.anchor) s.sail = lerp(s.sail, 0.3, dt);
    // Cannon: an arcing ball that splashes in the sea or knocks out sand and wood.
    if (inp.actionP && s.cool <= 0) {
      s.cool = 0.9;
      const bx = b.x + v.facing * 115, by = b.y - 46;
      s.balls.push({ x: bx, y: by, vx: v.facing * 560 + b.vx, vy: -330, t: 0 });
      b.vx -= v.facing * 60;
      Fx.burst(bx, by, 10, { speed: 140, life: 0.8, r: 12, color: ['rgba(230,230,230,0.9)', 'rgba(180,180,180,0.8)'], shape: 'grow' });
      Sound.noise(0.5, 0.4, 'lowpass', 300); Sound.tone(90, 0.3, 'sawtooth', 0.08, 50);
    }
    for (const ball of s.balls) {
      ball.t += dt; ball.vy += 900 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      const tx = Math.floor(ball.x / TS), ty = Math.floor(ball.y / TS), id = World.get(tx, ty);
      if (SeaTargets.hit(ball)) { ball.done = true; continue; }
      if (id === T.WATER) {
        ball.done = true;
        Fx.burst(ball.x, ball.y, 20, { speed: 220, up: 240, g: 700, life: 0.9, r: 8, color: ['#a5d8ff', '#e7f5ff', '#74c0fc'], shape: 'grow' });
        Sound.noise(0.4, 0.2, 'lowpass', 800);
        if (Game.away === 'pirate') Kraken.hit(ball.x, ball.y);
      } else if (TILES[id].solid) {
        ball.done = true;
        for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
          const k = World.get(x, y);
          if (k !== T.BEDROCK && TILES[k].dig && dist(x, y, tx, ty) < 1.5) vehicleDig(x, y, true);
        }
        Pow.add(ball.x, ball.y - 20, 'BOOM!');
        Fx.burst(ball.x, ball.y, 16, { speed: 260, up: 160, g: 500, life: 0.9, r: 10, color: ['#ffa94d', '#ffe066', 'rgba(120,120,120,0.8)'], shape: 'grow' });
        Sound.noise(0.6, 0.45, 'lowpass', 400);
      } else if (ball.t > 4) ball.done = true;
    }
    s.balls = s.balls.filter(q => !q.done);
  },
  draw(c, v) {
    const s = v.s, t = v.t || 0;
    // Mast, sail and the Jolly Roger.
    limb(c, [0, -50, 0, -250], 8, '#6e4520');
    limb(c, [-70, -220, 70, -220], 5, '#6e4520');
    const sh = 40 + 130 * (s.sail === undefined ? 0.3 : s.sail), billow = Math.sin(t * 2) * 4 + (s.hoist ? 14 : 4);
    c.beginPath(); c.moveTo(-66, -218); c.lineTo(66, -218); c.quadraticCurveTo(66 + billow, -218 + sh / 2, 60, -218 + sh); c.lineTo(-60, -218 + sh); c.quadraticCurveTo(-66 + billow, -218 + sh / 2, -66, -218); c.closePath();
    fillStroke(c, '#fff4e0', 4);
    if (sh > 90) { ell(c, 0, -218 + sh * 0.45, 16, 15, '#212529', 0); ell(c, -5, -220 + sh * 0.45, 4, 4, '#fff4e0', 0); ell(c, 5, -220 + sh * 0.45, 4, 4, '#fff4e0', 0); }
    const wv = Math.sin(t * 5) * 4;
    poly(c, [2, -250, 42, -246 + wv, 42, -224 + wv, 2, -228], '#212529', 3);
    ell(c, 20, -238 + wv * 0.5, 5, 5, '#fff', 0);
    // Bowsprit and rigging.
    limb(c, [96, -60, 150, -86], 5, '#6e4520');
    c.strokeStyle = '#6e4520'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -250); c.lineTo(150, -86); c.moveTo(0, -250); c.lineTo(-100, -70); c.stroke();
    // Stern cabin with the captain's windows.
    rbox(c, -112, -104, 62, 54, 6, '#8b5a2b', 4);
    for (let i = 0; i < 2; i++) rbox(c, -104 + i * 26, -94, 18, 16, 3, '#ffe066', 2);
    // Hull.
    c.beginPath(); c.moveTo(-118, -104); c.lineTo(-104, -10); c.quadraticCurveTo(0, 14, 96, -10); c.lineTo(118, -64); c.lineTo(-50, -50); c.lineTo(-50, -104); c.closePath();
    fillStroke(c, '#8b5a2b', 5);
    c.fillStyle = '#fcc419'; c.fillRect(-100, -44, 196, 5);
    for (const cx of [-20, 20, 60]) { ell(c, cx, -28, 8, 8, '#212529', 2); }
    // Ship's wheel with the driver at it.
    v.drawDriver(c, -32, -64, 0.42);
    c.save(); c.translate(-12, -66); c.rotate(t * 0.5);
    ell(c, 0, 0, 13, 13, null, 4);
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 4); limb(c, [-17, 0, 17, 0], 2, '#6e4520', 0); }
    c.restore();
    if (s.anchor) {
      c.strokeStyle = '#495057'; c.lineWidth = 3; c.beginPath(); c.moveTo(100, -40); c.lineTo(104, 70); c.stroke();
      limb(c, [92, 80, 104, 92, 116, 80], 5, '#495057'); limb(c, [104, 70, 104, 92], 5, '#495057');
    }
  },
  drawWorld(c, v) {
    for (const ball of v.s.balls) ell(c, ball.x, ball.y, 9, 9, '#212529', 2);
  },
});

// The voyage: sail across the sea between home and Skull Island, compass spinning.
const Voyage = {
  ship: null,
  start(ship) {
    this.ship = ship; this.t = 0;
    this.toIsland = Game.away !== 'pirate';
    Game.overlay = this;
    UI.configure({ dirs: 'none', action: null, roar: false, home: false });
    Sound.say(this.toIsland
      ? 'Sails catch the wind and push the ship along. On a ship, left is called port and right is called starboard!'
      : 'Sailing home. A compass needle always points north, so sailors know which way to go.');
  },
  update(dt) { this.t += dt; if (this.t > 9) this.finish(); },
  tap() { if (this.t > 2) this.finish(); return true; },
  close() { this.finish(); },
  finish() {
    if (Game.overlay !== this) return;
    Game.overlay = null;
    if (this.toIsland) Pirate.enter(this.ship); else Pirate.leave(this.ship);
  },
  draw(c) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#74c0fc'); g.addColorStop(0.35, '#d0ebff'); g.addColorStop(0.36, '#1c7ed6'); g.addColorStop(1, '#1864ab');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawCloud(c, 160 - this.t * 10, 70, 0.8); drawCloud(c, W - 300 - this.t * 6, 50, 0.6);
    // Waves rolling past.
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 4;
    for (let i = 0; i < 18; i++) {
      const x = ((i * 137 - this.t * 90) % (W + 100) + W + 100) % (W + 100) - 50, y = 220 + (i * 53) % 300;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 18, y - 9, x + 36, y); c.stroke();
    }
    // Home on the left, Skull Island on the right, a dotted course between.
    const home = { x: 120, y: 205 }, isle = { x: W - 130, y: 205 };
    ell(c, home.x, home.y, 90, 22, '#69db7c', 4); c.font = `34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🏘️', home.x, home.y - 26);
    ell(c, isle.x, isle.y, 90, 22, '#f4c27a', 4); c.fillText('🌴', isle.x - 30, isle.y - 30); c.fillText('💀', isle.x + 26, isle.y - 26);
    const [a, b] = this.toIsland ? [home, isle] : [isle, home];
    c.setLineDash([8, 10]); c.strokeStyle = '#fff'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(a.x, a.y + 40); c.quadraticCurveTo(W / 2, 470, b.x, b.y + 40); c.stroke(); c.setLineDash([]);
    const u = Math.min(1, this.t / 8.5), mx = W / 2, my = 470;
    const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * mx + u * u * b.x;
    const y = (1 - u) * (1 - u) * (a.y + 40) + 2 * (1 - u) * u * my + u * u * (b.y + 40);
    c.save(); c.translate(x, y + 30); c.scale(this.toIsland ? 0.42 : -0.42, 0.42); c.rotate(Math.sin(this.t * 2) * 0.05);
    VEHICLE_DEFS.pirateship.draw(c, { s: { sail: 1, hoist: true }, t: this.t, driver: Player, drawDriver: Vehicle.prototype.drawDriver });
    c.restore();
    // Compass rose, needle wobbling to north.
    const cx = 90, cy = H - 90;
    ell(c, cx, cy, 52, 52, '#fff3d6', 4);
    c.font = `800 18px ${FONT}`; c.fillStyle = OUT; c.fillText('N', cx, cy - 38);
    c.save(); c.translate(cx, cy); c.rotate(Math.sin(this.t * 3) * 0.15);
    poly(c, [0, -34, 8, 0, 0, 34, -8, 0], '#495057', 2); poly(c, [0, -34, 8, 0, -8, 0], '#e03131', 2);
    c.restore();
    bigText(c, this.toIsland ? 'Set sail for Skull Island!' : 'Sailing home!', W / 2, 60, 40, '#fff');
    if (this.t > 2) bigText(c, 'tap to land', W / 2, H - 30, 24, 'rgba(255,255,255,0.85)');
  },
};
