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

// The voyage between home and Skull Island. Halfway across, a scary dino pirate ship attacks: fire back
// (it takes three hits, each one smashing a bit of their ship), they can't sink you, and when they sink
// their treasure floats up for you while the crew row off in a little boat.
const SEA_Y = 372;
const Voyage = {
  ship: null,
  start(ship) {
    this.ship = ship; this.t = 0; this.pt = 0; this.phase = 'map';
    this.toIsland = Game.away !== 'pirate';
    this.you = { x: 220, vx: 0, rock: 0, scorch: 0, cool: 0 };
    this.foe = { x: W - 260, base: W - 260, dir: -1, hits: 0, rock: 0, cool: 2.5, sinkT: 0, mastT: 0, flee: false, panic: 0 };
    this.balls = []; this.fx = []; this.chest = null; this.boat = null; this.shake = 0; this.flash = 0; this.won = false;
    Game.overlay = this;
    this.controls();
    Sound.say(this.toIsland ? 'Set sail for Skull Island!' : 'Sailing home!');
  },
  controls() {
    UI.configure(this.phase === 'battle' ? { dirs: 'lr', action: '💣', roar: false, home: false } : { dirs: 'none', action: null, roar: false, home: false });
  },
  go(phase) { this.phase = phase; this.pt = 0; this.controls(); },

  update(dt) {
    this.t += dt; this.pt += dt;
    this.shake = Math.max(0, this.shake - dt * 2); this.flash = Math.max(0, this.flash - dt * 3);
    if (this.phase === 'map') { if (this.pt > 3) this.startBattle(); return; }
    if (this.phase === 'arrive') { if (this.pt > 3) this.finish(); return; }
    this.updateBattle(dt);
  },
  startBattle() {
    this.go('battle');
    Sound.tone(110, 0.5, 'sawtooth', 0.08, 80); Sound.tone(98, 0.6, 'sawtooth', 0.08, 70, 0.4);
    this.pop(this.foe.x, SEA_Y - 230, 'ARRR!');
  },
  pop(x, y, text) { this.fx.push({ x, y, vx: 0, vy: -40, g: 0, t: 0, life: 1.2, text }); },
  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) this.fx.push({ x, y, vx: rand(-1, 1) * o.speed, vy: -rand(0.2, 1) * (o.up || o.speed), g: o.g ?? 600, t: 0, life: o.life * rand(0.6, 1), r: o.r * rand(0.6, 1.2), col: pick(o.color), grow: o.grow });
  },
  fire(from, tx, ty, flight, mine) {
    const sx = from.x + (mine ? 72 : -72), sy = SEA_Y - 40, g = 900;
    this.balls.push({ x: sx, y: sy, vx: (tx - sx) / flight, vy: (ty - sy) / flight - 0.5 * g * flight, mine });
    this.burst(sx, sy, 8, { speed: 90, life: 0.7, r: 12, color: ['rgba(230,230,230,0.9)', 'rgba(170,170,170,0.8)'], g: -40, grow: true });
    Sound.noise(0.5, 0.4, 'lowpass', 300); Sound.tone(90, 0.3, 'sawtooth', 0.08, 50);
  },

  updateBattle(dt) {
    const you = this.you, foe = this.foe;
    you.rock = Math.max(0, you.rock - dt * 1.5); you.scorch = Math.max(0, you.scorch - dt * 0.15); you.cool -= dt;
    foe.rock = Math.max(0, foe.rock - dt * 1.5);
    // Your ship: left and right to dodge, the button (or a tap) fires.
    if (this.phase === 'battle') {
      const dir = (Input.held.right ? 1 : 0) - (Input.held.left ? 1 : 0);
      you.vx = lerp(you.vx, dir * 170, Math.min(1, dt * 3));
      if (Input.pressed.action) this.shoot();
    } else you.vx = lerp(you.vx, 0, dt * 2);
    you.x = clamp(you.x + you.vx * dt, 110, W * 0.46);
    // The pirates bob and weave, and lob cannonballs at you.
    if (!foe.sinkT && !foe.flee && this.phase === 'battle') {
      foe.x += foe.dir * (foe.hits >= 2 ? 30 : 55) * dt;
      if (foe.x < foe.base - 70) foe.dir = 1; else if (foe.x > foe.base + 70) foe.dir = -1;
      if (Math.random() < dt * 0.25) foe.dir = -foe.dir;
      foe.cool -= dt;
      if (foe.cool <= 0 && this.pt > 1.5) { foe.cool = rand(2, 3); this.fire(foe, you.x + rand(-90, 90), SEA_Y - 30, 1.3, false); }
      if (this.pt > 60) {   // too long: they give up and sail off
        foe.flee = true; this.pop(foe.x, SEA_Y - 230, 'They got away!');
      }
    }
    if (foe.flee) { foe.x += 160 * dt; if (foe.x > W + 260 && this.phase === 'battle') this.go('after'); }
    if (foe.hits >= 2 && foe.mastT < 1) foe.mastT = Math.min(1, foe.mastT + dt * 1.4);
    foe.panic += dt * (foe.hits >= 2 ? 1 : 0);
    // Cannonballs.
    for (const b of this.balls) {
      b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.mine && !foe.sinkT && !foe.flee && Math.abs(b.x - foe.x) < 80 && b.y > SEA_Y - 170 && b.y < SEA_Y + 4) { b.done = true; this.hitFoe(b); }
      else if (!b.mine && Math.abs(b.x - you.x) < 72 && b.y > SEA_Y - 150 && b.y < SEA_Y + 4) {
        b.done = true; you.rock = 1; you.scorch = 1; you.vx -= 90; this.shake = 0.5;
        this.pop(b.x, b.y - 40, 'POW!');
        this.burst(b.x, b.y, 12, { speed: 200, up: 160, g: 500, life: 0.8, r: 9, color: ['#ffa94d', '#ffe066', 'rgba(120,120,120,0.8)'] });
        Sound.noise(0.4, 0.35, 'lowpass', 400);
      } else if (b.y > SEA_Y + 6) {
        b.done = true;
        this.burst(b.x, SEA_Y, 14, { speed: 140, up: 260, g: 800, life: 0.8, r: 7, color: ['#a5d8ff', '#e7f5ff', '#74c0fc'] });
        Sound.noise(0.3, 0.15, 'lowpass', 800);
      }
    }
    this.balls = this.balls.filter(b => !b.done);
    // A damaged ship smokes.
    if (foe.hits && !foe.sinkT && Math.random() < dt * 6) this.burst(foe.x + rand(-30, 30), SEA_Y - 120, 1, { speed: 20, up: 50, g: -30, life: 1.6, r: 14, color: ['rgba(80,80,90,0.6)'], grow: true });
    // Sinking: bubbles, then the crew row off and the treasure floats up.
    if (foe.sinkT) {
      foe.sinkT += dt;
      if (foe.sinkT < 3 && Math.random() < dt * 20) this.burst(foe.x + rand(-60, 60), SEA_Y, 1, { speed: 20, up: 80, g: -60, life: 0.8, r: 6, color: ['rgba(255,255,255,0.8)'] });
      if (foe.sinkT > 0.8 && !this.boat) { this.boat = { x: foe.x - 20, t: 0 }; Sound.say('The pirates are rowing away!'); }
      if (foe.sinkT > 1.6 && !this.chest) this.chest = { x: foe.x, y: SEA_Y + 60, state: 'rise', t: 0 };
    }
    if (this.boat) { this.boat.t += dt; this.boat.x += 70 * dt; }
    const ch = this.chest;
    if (ch) {
      ch.t += dt;
      if (ch.state === 'rise') { ch.y = lerp(ch.y, SEA_Y - 8, Math.min(1, dt * 2)); if (ch.t > 1.4) ch.state = 'float'; }
      else if (ch.state === 'float') {
        ch.x -= 150 * dt; ch.y = SEA_Y - 8 + Math.sin(ch.t * 4) * 4;
        if (ch.x < you.x + 90) this.grabTreasure();
      } else if (ch.state === 'got' && ch.t > 2.8 && this.phase === 'battle') this.go('after');
    }
    if (this.phase === 'after' && this.pt > 1.5) this.go('arrive');
    for (const f of this.fx) { f.t += dt; f.vy += (f.g || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
    this.fx = this.fx.filter(f => f.t < f.life);
  },
  shoot() {
    const you = this.you, foe = this.foe;
    if (you.cool > 0 || foe.sinkT || foe.flee) return;
    you.cool = 0.9; you.vx -= 60;
    // Aimed at where they are now; they keep moving, so now and then it splashes past.
    this.fire(you, foe.x, SEA_Y - 70, 1.1, true);
  },
  hitFoe(b) {
    const foe = this.foe;
    foe.hits++; foe.rock = 1; this.shake = 0.6; this.flash = 0.4;
    this.burst(b.x, b.y, 18, { speed: 260, up: 180, g: 500, life: 0.9, r: 10, color: ['#ffa94d', '#ffe066', 'rgba(120,120,120,0.8)'] });
    this.burst(b.x, b.y, 10, { speed: 220, up: 260, g: 700, life: 1.1, r: 6, color: ['#5c3d1e', '#3b2a1a'] });   // splinters
    Sound.noise(0.6, 0.45, 'lowpass', 400);
    if (foe.hits === 1) {
      this.pop(b.x, b.y - 50, 'BOOM!');
      this.fx.push({ x: foe.x - 10, y: SEA_Y - 250, vx: 140, vy: -220, g: 500, t: 0, life: 2.2, flag: true });   // their flag flies off
      Sound.say('Boom! You shot off their flag!');
    } else if (foe.hits === 2) {
      this.pop(b.x, b.y - 50, 'CRACK!'); foe.mastT = 0.01;   // the mast starts to topple
      Sound.noise(0.8, 0.3, 'bandpass', 600); Sound.tone(200, 0.6, 'square', 0.05, 60);
      Sound.say('Crack! Their mast is down!');
    } else {
      this.pop(b.x, b.y - 50, 'SUNK!');
      foe.sinkT = 0.01;
      Sound.tone(300, 1.2, 'sine', 0.08, 80); Sound.noise(1.5, 0.25, 'lowpass', 300);
      Sound.say('You sank the pirate ship!');
    }
  },
  grabTreasure() {
    const ch = this.chest;
    ch.state = 'got'; ch.t = 0; this.won = true;
    Game.addStars(5);
    Eggs.reward('pirateBattle', 3, 'You sank the pirates and got their treasure!', 'TREASURE!');
    Hud.celebrate('Treasure! +5');
    this.burst(ch.x, ch.y - 20, 24, { speed: 200, up: 320, g: 600, life: 1.2, r: 6, color: ['#ffd43b', '#fcc419', '#e64980', '#4dabf7'] });
    [784, 988, 1175, 1568].forEach((f, i) => Sound.tone(f, 0.25, 'triangle', 0.08, null, i * 0.1));
  },
  tap() {
    if (this.phase === 'battle') this.shoot();
    else if (this.phase === 'map' && this.pt > 1) this.startBattle();
    else if (this.phase === 'arrive' && this.pt > 1) this.finish();
    return true;
  },
  close() { this.finish(); },
  finish() {
    if (Game.overlay !== this) return;
    Game.overlay = null;
    if (this.toIsland) Pirate.enter(this.ship); else Pirate.leave(this.ship);
  },

  draw(c) {
    if (this.phase === 'map') this.drawMap(c, Math.min(0.5, this.pt / 6), true);
    else if (this.phase === 'arrive') this.drawMap(c, 0.5 + Math.min(0.5, this.pt / 5.5), false);
    else this.drawBattle(c);
  },
  // The chart: home on the left, Skull Island on the right, the ship along a dotted course.
  drawMap(c, u, pirates) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#74c0fc'); g.addColorStop(0.35, '#d0ebff'); g.addColorStop(0.36, '#1c7ed6'); g.addColorStop(1, '#1864ab');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawCloud(c, 160 - this.t * 10, 70, 0.8); drawCloud(c, W - 300 - this.t * 6, 50, 0.6);
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 4;
    for (let i = 0; i < 18; i++) {
      const x = ((i * 137 - this.t * 90) % (W + 100) + W + 100) % (W + 100) - 50, y = 220 + (i * 53) % 300;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 18, y - 9, x + 36, y); c.stroke();
    }
    const home = { x: 120, y: 205 }, isle = { x: W - 130, y: 205 };
    ell(c, home.x, home.y, 90, 22, '#69db7c', 4); c.font = `34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🏘️', home.x, home.y - 26);
    ell(c, isle.x, isle.y, 90, 22, '#f4c27a', 4); c.fillText('🌴', isle.x - 30, isle.y - 30); c.fillText('💀', isle.x + 26, isle.y - 26);
    const [a, b] = this.toIsland ? [home, isle] : [isle, home];
    c.setLineDash([8, 10]); c.strokeStyle = '#fff'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(a.x, a.y + 40); c.quadraticCurveTo(W / 2, 470, b.x, b.y + 40); c.stroke(); c.setLineDash([]);
    const at = k => ({ x: (1 - k) * (1 - k) * a.x + 2 * (1 - k) * k * (W / 2) + k * k * b.x, y: (1 - k) * (1 - k) * (a.y + 40) + 2 * (1 - k) * k * 470 + k * k * (b.y + 40) });
    if (pirates && this.pt > 0.8) {
      // A black ship waiting on the course ahead.
      const p = at(0.62), k = Math.min(1, (this.pt - 0.8) * 2);
      c.save(); c.globalAlpha = k; c.translate(p.x, p.y + 26); c.scale(this.toIsland ? -0.3 : 0.3, 0.3); c.rotate(Math.sin(this.t * 3) * 0.06);
      this.drawFoeShip(c, { hits: 0, mastT: 0, panic: 0 }, true); c.restore();
      if (this.pt > 1.4) bigText(c, 'Pirates ahead!', W / 2, 130, 44, '#ff6b6b');
    }
    const p = at(u);
    c.save(); c.translate(p.x, p.y + 30); c.scale(this.toIsland ? 0.42 : -0.42, 0.42); c.rotate(Math.sin(this.t * 2) * 0.05);
    VEHICLE_DEFS.pirateship.draw(c, { s: { sail: 1, hoist: true }, t: this.t, driver: Player, drawDriver: Vehicle.prototype.drawDriver });
    c.restore();
    const cx = 90, cy = H - 90;
    ell(c, cx, cy, 52, 52, '#fff3d6', 4);
    c.font = `800 18px ${FONT}`; c.fillStyle = OUT; c.fillText('N', cx, cy - 38);
    c.save(); c.translate(cx, cy); c.rotate(Math.sin(this.t * 3) * 0.15);
    poly(c, [0, -34, 8, 0, 0, 34, -8, 0], '#495057', 2); poly(c, [0, -34, 8, 0, -8, 0], '#e03131', 2);
    c.restore();
    bigText(c, this.toIsland ? 'Set sail for Skull Island!' : 'Sailing home!', W / 2, 60, 40, '#fff');
    if (!pirates && this.pt > 1) bigText(c, 'tap to land', W / 2, H - 30, 24, 'rgba(255,255,255,0.85)');
  },

  drawBattle(c) {
    const t = this.t, you = this.you, foe = this.foe;
    c.save();
    if (this.shake > 0) c.translate(rand(-1, 1) * this.shake * 12, rand(-1, 1) * this.shake * 8);
    // Stormy sky, a dark cloud and a flicker of lightning now and then.
    const g = c.createLinearGradient(0, 0, 0, SEA_Y);
    g.addColorStop(0, '#2b2540'); g.addColorStop(1, '#7b6f96');
    c.fillStyle = g; c.fillRect(-20, -20, W + 40, SEA_Y + 20);
    if (Math.sin(t * 1.7) > 0.995 || this.flash > 0) { c.fillStyle = `rgba(255,255,255,${Math.max(this.flash, 0.3)})`; c.fillRect(-20, -20, W + 40, SEA_Y + 20); }
    for (let i = 0; i < 5; i++) ell(c, W * 0.55 + i * 70 - 140 + Math.sin(t * 0.3 + i) * 10, 70 + (i % 2) * 18, 90, 40, '#3d3550', 0);
    // Sea.
    const sg = c.createLinearGradient(0, SEA_Y, 0, H);
    sg.addColorStop(0, '#1971c2'); sg.addColorStop(1, '#0b2e59');
    c.fillStyle = sg; c.fillRect(-20, SEA_Y, W + 40, H - SEA_Y + 20);
    // Ships, the chest and the rowboat.
    c.save(); c.translate(you.x, SEA_Y + 22 + Math.sin(t * 2) * 3); c.rotate(Math.sin(t * 1.4) * 0.03 + you.rock * Math.sin(t * 25) * 0.07); c.scale(0.62, 0.62);
    VEHICLE_DEFS.pirateship.draw(c, { s: { sail: 0.8, hoist: false }, t, driver: Player, drawDriver: Vehicle.prototype.drawDriver });
    if (you.scorch > 0) { c.globalAlpha = you.scorch; ell(c, 20, -60, 30, 16, '#343a40', 0); ell(c, 34, -64, 12, 8, '#212529', 0); c.globalAlpha = 1; }
    c.restore();
    if (!foe.flee || foe.x < W + 300) {
      const sink = foe.sinkT ? Math.min(1, foe.sinkT / 3) : 0;
      c.save(); c.translate(foe.x, SEA_Y + 26 + sink * 200 + Math.sin(t * 2 + 1) * 3);
      c.rotate(Math.sin(t * 1.3) * 0.04 + foe.rock * Math.sin(t * 25) * 0.08 - sink * 0.5);
      c.scale(-0.7, 0.7);
      this.drawFoeShip(c, foe, false);
      c.restore();
    }
    const ch = this.chest;
    if (ch) {
      c.save(); c.translate(ch.x, ch.y); c.rotate(Math.sin(t * 3) * 0.1);
      rbox(c, -26, -22, 52, 30, 5, '#a86d35', 3);
      if (ch.state === 'got') { poly(c, [-26, -22, 26, -22, 30, -46, -22, -44], '#8a5524', 3); for (let i = 0; i < 5; i++) ell(c, -16 + i * 8, -26 - (i % 2) * 4, 6, 5, '#ffd43b', 2); }
      else { rbox(c, -28, -34, 56, 16, 7, '#8a5524', 3); ell(c, 0, -20, 6, 6, '#ffd43b', 2); drawStar(c, 22, -38, 7, t * 3, '#fff', 0); }
      c.restore();
    }
    if (this.boat) this.drawRowboat(c, this.boat);
    // Waves along the waterline, in front of the hulls.
    c.fillStyle = '#1c7ed6';
    c.beginPath(); c.moveTo(-20, H + 20);
    for (let x = -20; x <= W + 20; x += 20) c.lineTo(x, SEA_Y + 14 + Math.sin(x * 0.03 + t * 3) * 6);
    c.lineTo(W + 20, H + 20); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 4;
    for (let i = 0; i < 14; i++) {
      const x = ((i * 151 - t * 70) % (W + 100) + W + 100) % (W + 100) - 50, y = SEA_Y + 40 + (i * 37) % (H - SEA_Y - 50);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 18, y - 9, x + 36, y); c.stroke();
    }
    for (const b of this.balls) ell(c, b.x, b.y, 9, 9, '#212529', 2);
    for (const f of this.fx) {
      const k = f.t / f.life;
      if (f.text) { c.globalAlpha = 1 - k * k; bigText(c, f.text, f.x, f.y, 40, '#ffd43b'); c.globalAlpha = 1; continue; }
      if (f.flag) { c.save(); c.translate(f.x, f.y); c.rotate(f.t * 6); poly(c, [-18, -12, 18, -8, 18, 10, -18, 6], '#212529', 3); ell(c, 0, 0, 5, 5, '#fff', 0); c.restore(); continue; }
      c.globalAlpha = 1 - k; ell(c, f.x, f.y, f.r * (f.grow ? 1 + k * 1.5 : 1), f.r * (f.grow ? 1 + k * 1.5 : 1), f.col, 0); c.globalAlpha = 1;
    }
    c.restore();
    // Words to read along with.
    if (this.phase === 'battle' && this.pt < 2.5) bigText(c, 'Pirates attack!', W / 2, 70, 48, '#ff6b6b');
    else if (this.phase === 'battle' && this.pt < 7 && !foe.hits) bigText(c, 'Press 💣 to fire!', W / 2, 70, 34, '#fff');
    else if (this.won) bigText(c, 'Treasure!', W / 2, 70, 48, '#ffd43b');
    // Their hits left, as skulls over their ship.
    if (this.phase === 'battle' && !foe.sinkT && !foe.flee) {
      c.font = `30px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) { c.globalAlpha = i < 3 - foe.hits ? 1 : 0.25; c.fillText('💀', foe.x - 40 + i * 40, SEA_Y - 250); }
      c.globalAlpha = 1;
    }
  },
  // The scary pirate ship, facing right (flip it to face left). Each hit smashes another part.
  drawFoeShip(c, f, small) {
    const t = this.t || 0, hits = f.hits;
    // Mast and sail; after two hits the mast snaps and topples over the side.
    c.save();
    if (hits >= 2) { c.translate(0, -130); c.rotate(f.mastT * 1.5); c.translate(0, 130); if (f.mastT >= 1) c.globalAlpha = 0; }
    limb(c, [0, -50, 0, -260], 9, '#2b2118');
    limb(c, [-76, -230, 76, -230], 6, '#2b2118');
    c.beginPath(); c.moveTo(-72, -228); c.lineTo(72, -228);
    for (let i = 0; i <= 6; i++) c.lineTo(66 - i * 22, -92 + (i % 2) * 14);   // tattered bottom edge
    c.closePath(); fillStroke(c, '#25222b', 4);
    // Skull on the sail, glowing red eyes.
    ell(c, 0, -170, 26, 24, '#f1f3f5', 0); rbox(c, -14, -152, 28, 14, 4, '#f1f3f5', 0);
    const glow = 0.7 + 0.3 * Math.sin(t * 6);
    ell(c, -9, -172, 7, 7, `rgba(255,40,40,${glow})`, 0); ell(c, 9, -172, 7, 7, `rgba(255,40,40,${glow})`, 0);
    limb(c, [-30, -134, 30, -116], 5, '#f1f3f5', 0); limb(c, [30, -134, -30, -116], 5, '#f1f3f5', 0);
    if (hits >= 1) for (const [hx, hy, r] of [[-40, -200, 12], [34, -130, 15], [-22, -112, 9]]) ell(c, hx, hy, r, r * 0.8, '#7b6f96', 2);   // shot-through holes
    if (!hits) {   // black flag with crossed bones at the top
      const wv = Math.sin(t * 5) * 4;
      poly(c, [2, -260, 48, -256 + wv, 48, -230 + wv, 2, -234], '#212529', 3);
      ell(c, 24, -246 + wv * 0.5, 6, 6, '#fff', 0);
    }
    c.restore();
    // Hull: black with purple trim, glowing green lanterns, cannon ports.
    c.beginPath(); c.moveTo(-124, -112); c.lineTo(-108, -8); c.quadraticCurveTo(0, 16, 102, -8); c.lineTo(126, -70); c.lineTo(-40, -56); c.lineTo(-40, -112); c.closePath();
    fillStroke(c, '#1b1a21', 5);
    c.fillStyle = '#7048e8'; c.fillRect(-106, -48, 206, 5);
    for (const cx of [-50, -10, 30, 70]) { ell(c, cx, -30, 9, 9, '#212529', 2); ell(c, cx, -30, 4, 4, '#ff6b6b', 0); }
    for (const lx of [-118, 120]) { ell(c, lx, -120, 9, 11, `rgba(105,219,124,${0.6 + 0.3 * Math.sin(t * 4 + lx)})`, 2); }
    if (hits >= 3) { ell(c, 40, -26, 22, 16, '#0b0a0f', 2); limb(c, [24, -40, 56, -12], 3, '#5c3d1e', 0); }   // hole in the hull
    // Captain at the wheel and the crew on deck (they panic once the mast goes).
    const jump = k => (hits >= 2 ? Math.abs(Math.sin(t * 10 + k)) * 14 : 0);
    drawDinoSeated(c, -82, -108 - jump(0), 0.42, 'rex', { t, outfit: 'pirate', captain: true });
    if (!small) { drawDinoSeated(c, 0, -62 - jump(1), 0.3, 'raptor', { t: t + 1, outfit: 'pirate' }); drawDinoSeated(c, 58, -64 - jump(2), 0.3, 'carno', { t: t + 2, outfit: 'pirate' }); }
  },
  // The pirates escaping in their little rowboat, shaking their fists.
  drawRowboat(c, b) {
    const t = this.t, y = SEA_Y + 10 + Math.sin(t * 3) * 3;
    c.save(); c.translate(b.x, y); c.scale(1.5, 1.5);
    for (let i = 0; i < 3; i++) drawDinoSeated(c, -36 + i * 34, -14 - Math.abs(Math.sin(t * 6 + i)) * 3, 0.3, ['rex', 'raptor', 'carno'][i], { t: t + i, outfit: 'pirate', captain: i === 0 });
    c.beginPath(); c.moveTo(-64, -20); c.quadraticCurveTo(0, 18, 64, -20); c.closePath(); fillStroke(c, '#8a5524', 3);
    const row = Math.sin(t * 6) * 0.5;
    for (const ox of [-20, 30]) { c.save(); c.translate(ox, -14); c.rotate(0.6 + row); limb(c, [0, 0, 0, 40], 4, '#c98a4b'); c.restore(); }
    const fy = -44 + Math.sin(t * 12) * 4; limb(c, [-30, -30, -26, fy], 3, '#212529'); ell(c, -26, fy - 2, 4.5, 4.5, '#f8f9fa', 2);   // a shaken fist
    c.restore();
  },
};
