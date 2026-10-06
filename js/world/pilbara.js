// The Pilbara: an iron ore mine in the red outback of Western Australia. The dino flies in on
// the FIFO jet, puts on hi-vis, then drills, blasts, digs, hauls, trains it to port and loads a ship.
const PIL = {
  W: 344,                   // open columns; past that is a wall
  STRIP: [4, 34],           // camp airstrip
  PIT: [40, 124],           // open pit (ramps down 40-64, floor 64-100, ramps up 100-124)
  FLOOR: SURF + 12,         // pit floor row
  DET: 129,                 // blast detonator (safe, outside the pit)
  HOPPER: 136,              // haul trucks tip in here
  OPF: 143,                 // ore processing facility: crusher and screens
  STOCK: 152,               // stockpile after the crusher
  LOADOUT: 166,             // train loads under here
  TRACK: [156, 300],        // ore railway
  DUMPER: 290,              // car dumper at the port
  PORTSTOCK: 296,           // port stockpile
  WHARF: [298, 312],
  SHIP: 327,                // ship's middle
  HOLDS: [320, 325, 330],   // ship's holds
};

function pitDepth(x) {
  const [a, b] = PIL.PIT;
  if (x < a || x >= b) return 0;
  if (x < a + 24) return Math.floor((x - a) / 2);
  if (x >= b - 24) return Math.floor((b - x) / 2);
  return 12;
}

function generatePilbara(world, seed) {
  const rng = mulberry32(seed + 311);
  const Wt = world.w, Ht = world.h, surf = world.surf;
  world.props = [];
  for (let x = 0; x < Wt; x++) {
    let h = SURF + pitDepth(x);
    if (x >= PIL.WHARF[1]) h = SURF + 11;   // sea floor
    surf[x] = h;
    for (let y = 0; y < Ht; y++) {
      let id = T.AIR;
      if (x === 0 || x >= PIL.W || y >= Ht - 2) id = T.BEDROCK;
      else if (x >= PIL.WHARF[1] && y >= SEA_LEVEL && y < h) id = T.WATER;
      else if (y >= h) {
        const ore = x >= 48 && x < 116 && y >= SURF + 5 && y < SURF + 24;
        if (ore) id = T.IRONORE;
        else if (y < h + 4 && y < SURF + 5) id = T.REDDIRT;
        else id = T.WASTE;
        if (x >= PIL.WHARF[1] && y < h + 2) id = T.SAND;
      }
      world.t[y * Wt + x] = id;
    }
  }
  const put = (x, y, id) => { world.t[y * Wt + x] = id; };
  // Airstrip, haul road surface and wharf.
  for (let x = PIL.STRIP[0]; x < PIL.STRIP[1]; x++) put(x, SURF, T.ROAD);
  for (let x = PIL.WHARF[0]; x < PIL.WHARF[1]; x++) { put(x, SURF, T.CONCRETE); put(x, SURF + 1, T.CONCRETE); }
  // Spinifex dotted over the plains (not on roads, the pit or the railway yards).
  for (let x = 2; x < PIL.WHARF[0] - 2; x++) {
    const free = (x > PIL.STRIP[1] && x < PIL.PIT[0] - 1) || (x > 176 && x < 284 && x % 3 !== 0);
    if (free && rng() < 0.35) put(x, SURF - 1, T.SPINIFEX);
  }
  world.genSurf = Int16Array.from(surf);
  const P = world.props;
  P.push({ type: 'donga', x: 8, y: SURF }, { type: 'donga', x: 14, y: SURF }, { type: 'windsock', x: 31, y: SURF });
  P.push({ type: 'pilsign', x: 37, y: SURF });
  P.push({ type: 'detonator', x: PIL.DET + 0.5, y: SURF });
  P.push({ type: 'opf', x: PIL.HOPPER, y: SURF });
  P.push({ type: 'loadout', x: PIL.LOADOUT, y: SURF });
  for (const tx of [196, 231, 268]) P.push({ type: 'termite', x: tx + 0.5, y: SURF, h: 50 + rng() * 40 });
  P.push({ type: 'dumper', x: PIL.DUMPER, y: SURF });
  P.push({ type: 'ship', x: PIL.SHIP, y: SEA_LEVEL });
}

// Ore railway along the ground from the mine to the port.
function drawOreTrack(c, camX, camY) {
  const y = TRACK_Y - camY;
  if (y < -40 || y > Game.viewH + 300) return;
  const xa = Math.max(camX, PIL.TRACK[0] * TS), xb = Math.min(camX + Game.viewW, PIL.TRACK[1] * TS);
  if (xb <= xa) return;
  c.fillStyle = '#5b3a24';
  for (let x = Math.floor(xa / 24) * 24; x < xb; x += 24) c.fillRect(x - camX, y - 6, 14, 6);
  c.fillStyle = '#5b6170'; c.fillRect(xa - camX, y - 11, xb - xa, 5);
}

const Pilbara = {
  visits: 0,
  enter(jet) {
    Away.go('pilbara', generatePilbara, { limitW: PIL.W });
    Mine.reset();
    Vehicles.list = [jet];
    const sp = (kind, tx, f) => { const v = Vehicles.spawnAtGround(kind, tx, f); return v; };
    sp('blastrig', 46, 1);
    sp('digger', 60, 1);
    sp('haultruck', 104, -1);
    const tr = Vehicles.spawn('oretrain', (PIL.LOADOUT + 4) * TS, TRACK_Y - 6, 1);
    tr.facing = -1;
    sp('shiploader', 304, 1);
    // Miners about the place, all in hi-vis.
    NPCs.list = [];
    const g = tx => World.groundBelow(tx, World.genSurf[tx] - 3) * TS - 0.01;
    for (const [tx, type] of [[20, 'tri'], [126, 'stego'], [150, 'raptor'], [294, 'ankylo']]) NPCs.add({ x: tx * TS + 16, y: g(tx), type, range: 4 * TS });
    // Land on the camp strip.
    jet.facing = 1;
    VEHICLE_DEFS.jet.landAt(jet, 18);
    Game.overlay = null;
    Game.snapCamera();
    Game.configurePlay();
  },
  landed() {
    this.visits++;
    Game.celebrate('The Pilbara!', this.visits === 1
      ? 'Welcome to the Pilbara! Put on your hi-vis and hard hat. Time to mine some iron ore!'
      : 'Back on site in the Pilbara!');
    if (this.visits === 1) { Game.addStars(3); Game.popupStar(Player.cx, Player.cy - 120); }
    setTimeout(() => { if (Game.away === 'pilbara') Mine.sayStep(true); }, 5200);
  },
  leave(jet) {
    Away.home();
    if (jet) {
      if (!Vehicles.list.includes(jet)) Vehicles.list.push(jet);
      Vehicles.list = Vehicles.list.filter(v => v === jet || v.kind !== 'jet');
      jet.facing = -1;
      VEHICLE_DEFS.jet.landAt(jet, 86);
    }
    Game.overlay = null;
    Game.snapCamera();
    Game.configurePlay();
  },
};

// ---------- The mine: what's been done and what to do next ----------
const MINE_STEPS = [
  { key: 'drill', icon: '🛠️', say: 'Step one: drive the drill rig into the pit and hold the button to drill blast holes in the rock.' },
  { key: 'blast', icon: '💥', say: 'Step two: go to the red blast button and set off the blast!' },
  { key: 'dig', icon: '🦖', say: 'Step three: use the digger to scoop up the broken ore and load the big haul truck.' },
  { key: 'haul', icon: '🚚', say: 'Step four: drive the haul truck up out of the pit and tip the ore into the crusher.' },
  { key: 'train', icon: '🚂', say: 'Step five: drive the ore train under the loader to fill it, then take it to the port.' },
  { key: 'ship', icon: '🚢', say: 'Step six: use the ship loader to pour the ore into the ship!' },
];
const MINE_FACTS = {
  drill: 'Blast hole drills make deep holes. Then the holes are filled with explosives.',
  blast: 'Blasting breaks up the hard rock so the diggers can scoop it up.',
  dig: 'Real mining diggers can lift as much as four cars in one scoop!',
  haul: 'Real haul trucks are as tall as a house. Their tyres are taller than a grown up!',
  train: 'Pilbara ore trains are the longest in the world. Some are over two kilometres long!',
  ship: 'The ship takes the iron ore across the sea, where it is made into steel.',
};

const Mine = {
  stock: 0, port: 0, holes: [], broken: 0, step: 'drill', scanT: 0, blastT: -1, shake: 0,
  ship: { fill: [0, 0, 0], state: 'berth', t: 0, dx: 0 },
  CAP: 6,   // ore in each wagon and each ship hold
  reset() {
    this.stock = 0; this.port = 0; this.holes = []; this.broken = 0; this.blastT = -1; this.shake = 0;
    this.ship = { fill: [0, 0, 0], state: 'berth', t: 0, dx: 0 };
    this.step = 'drill'; this.said = null; this.scanT = 0; this.crushT = 0;
  },
  vehicle(kind) { return Vehicles.list.find(v => v.kind === kind); },
  train() { return this.vehicle('oretrain'); },
  haulers() { return Vehicles.list.filter(v => v.def.hauls); },

  // Count broken ore lying around the pit (for "what next").
  scan() {
    let n = 0;
    for (let x = PIL.PIT[0] - 4; x < PIL.HOPPER + 4; x++) for (let y = SURF - 8; y < SURF + 30; y++) if (World.get(x, y) === T.BROKENORE) n++;
    this.broken = n;
  },
  currentStep() {
    const tr = this.train();
    if (this.ship.state !== 'berth') return 'ship';
    if (this.port > 0) return 'ship';
    if (tr && tr.s.ore.some(o => o > 0)) return 'train';
    if (this.stock > 0) return 'train';
    if (this.haulers().some(h => h.s.ore > 0)) return 'haul';
    const dg = this.vehicle('digger');
    if (this.broken > 0 || (dg && dg.s.load.length)) return 'dig';
    if (this.holes.length) return 'blast';
    return 'drill';
  },
  sayStep(force) {
    const st = MINE_STEPS.find(s => s.key === this.step);
    if (force || this.said !== this.step) { this.said = this.step; Sound.say(st.say); }
  },

  update(dt) {
    this.scanT -= dt;
    if (this.scanT <= 0) { this.scanT = 0.5; this.scan(); }
    const step = this.currentStep();
    if (step !== this.step) {
      this.step = step;
      setTimeout(() => { if (Game.away === 'pilbara' && this.step === step) this.sayStep(); }, 1800);
    }
    this.shake = Math.max(0, this.shake - dt);
    this.crushT = Math.max(0, (this.crushT || 0) - dt);
    if (this.blastT >= 0) this.updateBlast(dt);
    this.updateShip(dt);
    // Enter button at the blast button.
    if (!Player.vehicle && !Game.overlay && !Vehicles.nearest(Player.body.x, Player.body.y - 28, 120, v => !v.driver)) {
      const det = this.nearDetonator();
      if (det) { UI.setEnter(true, '💥'); if (Input.pressed.enter) this.blast(); }
    }
  },
  nearDetonator() {
    return World.props.find(p => p.type === 'detonator' && Math.abs(p.x * TS - Player.body.x) < 110 && Math.abs(p.y * TS - Player.body.y) < 90);
  },

  // ---------- Drilling and blasting ----------
  addHole(tx, ty) {
    if (this.holes.some(h => Math.abs(h.x - tx) < 2)) { Sound.bonk(); Sound.say('There is already a hole here. Move along a bit!'); return false; }
    if (this.holes.length >= 6) { Sound.bonk(); Sound.say('That is plenty of holes. Time to blast!'); return false; }
    this.holes.push({ x: tx, y: ty });
    Sound.collect();
    if (this.holes.length === 1) { Game.addStars(1); Game.popupStar(tx * TS, ty * TS - 60); Sound.say('A blast hole! ' + MINE_FACTS.drill + ' Drill some more, then blast!'); }
    else Sound.say(pick(['Another hole!', 'Good drilling!', 'Nice and deep!']));
    return true;
  },
  blast() {
    if (this.blastT >= 0) return;
    if (!this.holes.length) { Sound.bonk(); Sound.say('Drill some blast holes in the pit first!'); return; }
    if (this.holes.some(h => Math.abs(h.x * TS - Player.cx) < 8 * TS)) { Sound.bonk(); Sound.say('Too close! Everyone out of the blast zone first!'); return; }
    this.blastT = 0; this.lastN = 5;
    Sound.say('Fire in the hole! Everyone clear!');
    for (const n of NPCs.list) if (Math.abs(n.body.x - PIL.PIT[0] * TS - 40 * TS) < 50 * TS) n.scaredT = 4;
  },
  updateBlast(dt) {
    const before = this.blastT;
    this.blastT += dt;
    // Siren, then 3, 2, 1.
    if (Math.floor(before * 2) !== Math.floor(this.blastT * 2) && this.blastT < 2) Sound.tone(this.blastT % 1 < 0.5 ? 700 : 900, 0.4, 'square', 0.06);
    const n = 5 - Math.floor(this.blastT);
    if (this.blastT >= 2 && n !== this.lastN && n > 0) { this.lastN = n; Sound.say(String(n)); }
    if (this.blastT >= 5) { this.blastT = -1; this.boom(); }
  },
  boom() {
    let made = 0;
    for (const h of this.holes) {
      const cx = h.x, cy = h.y + 2;
      for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) {
        if (dist(x, y, cx, cy) > 3.6) continue;
        const id = World.get(x, y);
        if (id === T.IRONORE) { World.set(x, y, T.BROKENORE); made++; }
        else if (id === T.WASTE || id === T.REDDIRT) World.set(x, y, T.REDDIRT);
      }
      const px = cx * TS + 16, py = h.y * TS;
      Fx.burst(px, py, 30, { speed: 420, up: 300, g: 700, life: 1.6, r: 12, color: ['#c4532a', '#8a3a2a', '#ffd8a8', '#ffa94d'], shape: 'grow' });
      Fx.burst(px, py, 14, { speed: 260, up: 360, g: 900, life: 1.2, r: 7, color: ['#5a2a22', '#7a2e22'], shape: 'rect' });
    }
    this.holes = [];
    this.shake = 1.2;
    Sound.noise(1.6, 0.5, 'lowpass', 300); Sound.noise(0.5, 0.4, 'bandpass', 900);
    Game.addStars(2); Game.popupStar(Player.cx, Player.cy - 100);
    Hud.celebrate('BOOM!');
    this.scan();
    setTimeout(() => Sound.say(made ? 'Boom! ' + MINE_FACTS.blast + ' Now get the digger!' : 'Boom! Hmm, not much ore there. Drill on the dark red rock.'), 900);
  },

  // ---------- Haul truck tips into the crusher ----------
  hopperNear(v) {
    const h = PIL.HOPPER * TS + 16;
    return Game.away === 'pilbara' && Math.abs(v.body.x - h) < v.body.w / 2 + 2 * TS && Math.abs(v.body.y - SURF * TS) < 3 * TS;
  },
  toHopper(ore, v) {
    this.stock += ore;
    this.crushT = 3;
    Sound.noise(1.5, 0.15, 'bandpass', 400);
    if (ore > 0) {
      Game.addStars(2); Game.popupStar(v.body.x, v.body.y - 140);
      Sound.say('Into the crusher! It smashes the ore into little pieces. Now load the ore train!');
    } else Sound.say('That was just dirt! The crusher wants iron ore.');
  },

  // ---------- Train: loadout and car dumper ----------
  trainAt(tr, tx) { return Math.abs(tr.body.x - tx * TS) < 9 * TS && Math.abs(tr.body.vx) < 30; },
  updateTrain(tr, dt) {
    const s = tr.s;
    if (Game.away !== 'pilbara') return;
    s.pour = 0;
    if (this.trainAt(tr, PIL.LOADOUT) && this.stock > 0) {
      const i = s.ore.findIndex(o => o < this.CAP);
      if (i >= 0) {
        s.acc = (s.acc || 0) + dt * 5;
        while (s.acc >= 1 && this.stock > 0 && s.ore[i] < this.CAP) { s.acc -= 1; s.ore[i]++; this.stock--; }
        s.pour = 1;
        if (Math.random() < 0.2) Sound.noise(0.1, 0.05, 'bandpass', 500);
        if (this.stock === 0 || s.ore.every(o => o >= this.CAP)) {
          Sound.collect();
          Sound.say('The ore train is loaded! Drive it all the way to the port.');
        }
      }
    }
    if (this.trainAt(tr, PIL.DUMPER) && s.ore.some(o => o > 0)) {
      s.tipT = (s.tipT || 0) + dt;
      if (s.tipT > 1.2) {
        s.tipT = 0;
        const i = s.ore.findIndex(o => o > 0);
        this.port += s.ore[i]; s.ore[i] = 0; s.tipWagon = i; s.tipShow = 1;
        Sound.noise(0.8, 0.2, 'lowpass', 500);
        if (s.ore.every(o => o === 0)) {
          Game.addStars(2); Game.popupStar(tr.body.x, tr.body.y - 140);
          Sound.say('The car dumper flips each wagon upside down to empty it! Now use the ship loader.');
        }
      }
    } else s.tipT = 0;
    s.tipShow = Math.max(0, (s.tipShow || 0) - dt);
  },

  // ---------- Ship ----------
  holdUnder(x) { return PIL.HOLDS.findIndex(h => Math.abs(x - (h * TS + 16)) < 2 * TS); },
  pour(i, dt) {
    if (this.ship.state !== 'berth' || this.port <= 0 || i < 0) return false;
    const f = this.ship.fill;
    if (f[i] >= this.CAP) return false;
    this.pourAcc = (this.pourAcc || 0) + dt * 4;
    while (this.pourAcc >= 1 && this.port > 0 && f[i] < this.CAP) { this.pourAcc -= 1; f[i]++; this.port--; }
    if (f[i] >= this.CAP) { Sound.collect(); if (!f.every(x => x >= this.CAP)) Sound.say('That hold is full! Move along to the next one.'); }
    if (f.every(x => x >= this.CAP)) this.sail();
    else if (this.port <= 0) Sound.say('All the ore is on the ship. Go and get some more!');
    return true;
  },
  sail() {
    this.ship.state = 'leave'; this.ship.t = 0;
    Sound.tone(110, 1.4, 'sawtooth', 0.1); Sound.tone(165, 1.4, 'sawtooth', 0.06);
    Game.addStars(10); Game.popupStar(PIL.SHIP * TS, SURF * TS - 200);
    Pickups.shower(PIL.SHIP * TS - 300, SURF * TS - 300, 6);
    Game.celebrate('Ship full!', 'The ship is full! ' + MINE_FACTS.ship + ' You are a real Pilbara miner!');
  },
  updateShip(dt) {
    const sh = this.ship;
    sh.t += dt;
    if (sh.state === 'leave') { sh.dx += dt * (60 + sh.t * 40); if (sh.t > 9) { sh.state = 'arrive'; sh.t = 0; sh.fill = [0, 0, 0]; sh.dx = 900; } }
    else if (sh.state === 'arrive') { sh.dx = Math.max(0, 900 - sh.t * 150); if (sh.dx === 0) { sh.state = 'berth'; Sound.tone(110, 0.8, 'sawtooth', 0.08); } }
  },

  // ---------- Guidance ----------
  target() {
    const pv = Player.vehicle, k = pv ? pv.kind : '';
    const at = (v, icon) => v ? { x: v.body.x, y: v.body.y - v.body.h - 30, icon } : null;
    switch (this.step) {
      case 'drill': return k === 'blastrig' ? { x: 84 * TS, y: (PIL.FLOOR - 2) * TS, icon: '🛠️' } : at(this.vehicle('blastrig'), '🛠️');
      case 'blast': return { x: PIL.DET * TS + 16, y: (SURF - 3) * TS, icon: '💥' };
      case 'dig': {
        const dg = this.vehicle('digger');
        if (k !== 'digger') return at(dg, '🦖');
        if (dg.s.load.length) return at(this.haulers()[0], '🚚');
        return { x: 84 * TS, y: (PIL.FLOOR - 3) * TS, icon: '⛏️' };
      }
      case 'haul': {
        const h = this.haulers().find(h => h.s.ore > 0);
        return pv && pv.def.hauls ? { x: PIL.HOPPER * TS + 16, y: (SURF - 4) * TS, icon: '⤵️' } : at(h, '🚚');
      }
      case 'train': {
        const tr = this.train();
        if (k !== 'oretrain') return at(tr, '🚂');
        return tr.s.ore.some(o => o > 0) && (this.stock === 0 || tr.s.ore.every(o => o >= this.CAP))
          ? { x: PIL.DUMPER * TS, y: (SURF - 5) * TS, icon: '⚓' } : { x: PIL.LOADOUT * TS, y: (SURF - 7) * TS, icon: '⬇️' };
      }
      case 'ship': {
        if (this.ship.state !== 'berth') return null;
        if (k !== 'shiploader') return at(this.vehicle('shiploader'), '🏗️');
        const i = this.ship.fill.findIndex(f => f < this.CAP);
        return i >= 0 ? { x: PIL.HOLDS[i] * TS + 16, y: (SURF - 6) * TS, icon: '🚢' } : null;
      }
    }
    return null;
  },
  drawWorld(c) {
    // Blast holes: a dark hole with an orange marker cone.
    for (const h of this.holes) {
      const x = h.x * TS + 16, y = h.y * TS;
      ell(c, x, y + 2, 9, 4, '#2b2233', 2);
      poly(c, [x + 10, y, x + 22, y, x + 16, y - 18], '#ff922b', 2);
      c.fillStyle = '#fff'; c.fillRect(x + 13, y - 10, 6, 3);
    }
    const g = this.target();
    if (g) {
      const b = Math.abs(Math.sin(Game.t * 4)) * 12;
      poly(c, [g.x - 16, g.y - 30 - b, g.x + 16, g.y - 30 - b, g.x, g.y - 8 - b], '#ffd43b', 4);
    }
  },
  drawHud(c) {
    // Steps across the top, the current one lit up.
    const cur = MINE_STEPS.findIndex(s => s.key === this.step);
    const x0 = 24, y = 112;
    rbox(c, x0 - 8, y - 26, MINE_STEPS.length * 48 + 10, 52, 22, 'rgba(255,255,255,0.75)', 3);
    MINE_STEPS.forEach((s, i) => {
      const x = x0 + 20 + i * 48;
      if (i === cur) ell(c, x, y, 22, 22, '#ffd43b', 3);
      c.globalAlpha = i === cur ? 1 : i < cur ? 0.55 : 0.35;
      c.font = `24px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT;
      c.fillText(s.icon, x, y + 1);
      c.globalAlpha = 1;
    });
    this.stepsBox = { x: x0 - 8, y: y - 26, w: MINE_STEPS.length * 48 + 10, h: 52 };
    // Arrow at the screen edge when the next thing is off screen.
    const g = this.target();
    this.arrow = null;
    if (!g) return;
    const cam = Game.cam;
    const sx = (g.x - cam.x) * Game.zoom, sy = (g.y - cam.y) * Game.zoom;
    if (sx > 30 && sx < W - 30 && sy > 30 && sy < H - 30) return;
    const ax = clamp(sx, 70, W - 70), ay = clamp(sy, 170, H - 160);
    const ang = Math.atan2(sy - ay, sx - ax), bob = Math.sin(Game.t * 6) * 6;
    c.save(); c.translate(ax + Math.cos(ang) * bob, ay + Math.sin(ang) * bob);
    ell(c, 0, 0, 34, 34, '#fff', 4);
    c.save(); c.rotate(ang); poly(c, [36, 0, 22, -14, 22, 14], '#ff922b', 4); c.restore();
    c.font = `30px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT;
    c.fillText(g.icon, 0, 2);
    c.restore();
    this.arrow = { x: ax, y: ay };
  },
  // Tapping the steps or the arrow says what to do again.
  tap(x, y) {
    const b = this.stepsBox;
    if ((b && x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) || (this.arrow && dist(x, y, this.arrow.x, this.arrow.y) < 44)) { this.sayStep(true); return true; }
    return false;
  },
  tapWorld(wx, wy) {
    const det = World.props.find(p => p.type === 'detonator' && Math.abs(p.x * TS - wx) < 60 && wy > p.y * TS - 110 && wy < p.y * TS + 10);
    if (det && !Player.vehicle && Math.abs(det.x * TS - Player.body.x) < 260) { this.blast(); return true; }
    return false;
  },
};

// ---------- Pilbara scenery ----------
function drawPilbaraProp(c, p, sx, sy) {
  const t = Game.t;
  if (p.type === 'donga') {
    // Transportable site huts where FIFO workers sleep.
    rbox(c, sx - 80, sy - 70, 160, 62, 4, '#f1f3f5', 4);
    for (let i = 0; i < 3; i++) rbox(c, sx - 62 + i * 46, sy - 56, 26, 20, 3, '#bdf3ff', 3);
    rbox(c, sx - 84, sy - 78, 168, 10, 3, '#adb5bd', 3);
    rbox(c, sx - 70, sy - 8, 20, 8, 0, '#868e96', 2); rbox(c, sx + 50, sy - 8, 20, 8, 0, '#868e96', 2);
    rbox(c, sx + 60, sy - 98, 22, 20, 3, '#dee2e6', 3);   // air conditioner
  } else if (p.type === 'windsock') {
    limb(c, [sx, sy, sx, sy - 120], 4, '#adb5bd');
    const wv = Math.sin(t * 4) * 4;
    poly(c, [sx, sy - 120, sx + 60, sy - 112 + wv, sx + 60, sy - 102 + wv, sx, sy - 96], '#ff922b', 3);
    c.fillStyle = '#fff'; c.fillRect(sx + 18, sy - 115 + wv * 0.3, 10, 18); c.fillRect(sx + 40, sy - 112 + wv * 0.7, 8, 12);
  } else if (p.type === 'pilsign') {
    limb(c, [sx - 40, sy, sx - 40, sy - 60], 5, '#777'); limb(c, [sx + 40, sy, sx + 40, sy - 60], 5, '#777');
    rbox(c, sx - 66, sy - 120, 132, 64, 8, '#2b8a3e', 4);
    c.font = `800 18px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    c.fillText('IRON ORE MINE', sx, sy - 100); c.fillText('⛑️ HI-VIS ON', sx, sy - 74);
  } else if (p.type === 'detonator') {
    const on = Mine.blastT >= 0;
    rbox(c, sx - 26, sy - 44, 52, 44, 6, '#ffd43b', 4);
    c.fillStyle = OUT; for (let i = 0; i < 4; i++) c.fillRect(sx - 22 + i * 12, sy - 40, 6, 4);
    ell(c, sx, sy - 22, 14, 14, on && Math.floor(t * 6) % 2 ? '#ffe066' : '#e8262b', 4);
    if (!on && Mine.holes.length && Math.floor(t / 1.5) % 2 === 0) bubble(c, sx, sy - 52, '💥', t);
    if (on) { const n = Math.max(1, 5 - Math.floor(Mine.blastT)); if (Mine.blastT >= 2) bigText(c, String(n), sx, sy - 110, 60, '#ff6b6b'); }
    limb(c, [sx - 26, sy - 6, sx - 120, sy - 4], 2, '#e8262b', 0);
  } else if (p.type === 'opf') {
    // Hopper the trucks tip into, a crusher, a conveyor up to the stockpile.
    const crush = Mine.crushT > 0;
    poly(c, [sx - 30, sy - 46, sx + 62, sy - 46, sx + 40, sy, sx - 8, sy], '#868e96', 4);
    rbox(c, sx - 34, sy - 52, 100, 10, 3, '#ffd43b', 3);
    const ox = (PIL.OPF - PIL.HOPPER) * TS;
    rbox(c, sx + ox - 50, sy - 150, 130, 150, 6, '#4dabf7', 4);
    rbox(c, sx + ox - 36, sy - 130, 34, 30, 4, '#bdf3ff', 3);
    c.font = `800 18px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText('OPF', sx + ox + 30, sy - 116);
    // Crusher jaws.
    const j = crush ? Math.sin(t * 30) * 4 : 0;
    poly(c, [sx + ox - 30, sy - 70, sx + ox - 4 + j, sy - 70, sx + ox - 14, sy - 20], '#495057', 3);
    poly(c, [sx + ox + 30, sy - 70, sx + ox + 4 - j, sy - 70, sx + ox + 14, sy - 20], '#495057', 3);
    // Conveyor to the stockpile.
    const sx2 = (PIL.STOCK - PIL.HOPPER) * TS + sx;
    limb(c, [sx + ox + 80, sy - 40, sx2, sy - 130], 10, '#343a40');
    if (crush || Mine.stock > 0) for (let i = 0; i < 4; i++) {
      const k = ((t * 0.6 + i / 4) % 1);
      ell(c, lerp(sx + ox + 80, sx2, k), lerp(sy - 48, sy - 138, k), 5, 4, '#7a2e22', 2);
    }
    // Stockpile grows with the ore waiting for the train.
    const h = Math.min(120, 16 + Mine.stock * 5);
    c.beginPath(); c.moveTo(sx2 - h * 1.1, sy); c.quadraticCurveTo(sx2, sy - h * 1.9, sx2 + h * 1.1, sy); c.closePath(); fillStroke(c, Mine.stock ? '#7a2e22' : 'rgba(122,46,34,0.25)', 3);
    if (crush && Math.random() < 0.3) Fx.add({ x: sx + ox + rand(-20, 20) + Game.cam.x, y: sy - 60 + Game.cam.y, vx: rand(-20, 20), vy: rand(-60, -30), life: 1, r: 8, color: 'rgba(200,120,90,0.4)', shape: 'grow' });
  } else if (p.type === 'loadout') {
    const s = Mine.train();
    limb(c, [sx - 50, sy - 12, sx - 50, sy - 170], 8, '#868e96'); limb(c, [sx + 50, sy - 12, sx + 50, sy - 170], 8, '#868e96');
    poly(c, [sx - 60, sy - 210, sx + 60, sy - 210, sx + 20, sy - 150, sx - 20, sy - 150], '#ff922b', 4);
    rbox(c, sx - 14, sy - 152, 28, 26, 3, '#495057', 3);
    if (s && s.s.pour) for (let i = 0; i < 3; i++) ell(c, sx + rand(-8, 8), sy - 120 + ((t * 300 + i * 20) % 50), 6, 5, '#7a2e22', 2);
    limb(c, [(PIL.STOCK - PIL.LOADOUT) * TS + sx + 40, sy - 20, sx - 50, sy - 200], 8, '#343a40');   // conveyor from the stockpile
  } else if (p.type === 'termite') {
    const h = p.h;
    c.beginPath(); c.moveTo(sx - 24, sy); c.quadraticCurveTo(sx - 20, sy - h * 0.7, sx - 6, sy - h); c.quadraticCurveTo(sx + 4, sy - h - 10, sx + 10, sy - h * 0.8);
    c.quadraticCurveTo(sx + 22, sy - h * 0.4, sx + 26, sy); c.closePath(); fillStroke(c, '#d9773f', 3);
  } else if (p.type === 'dumper') {
    // Car dumper: a big rotating ring the wagons roll into.
    const tr = Mine.train(), tip = tr && tr.s.tipShow > 0 ? tr.s.tipShow : 0;
    rbox(c, sx - 70, sy - 170, 140, 170, 6, '#ced4da', 4);
    c.save(); c.translate(sx, sy - 70); c.rotate(tip * Math.PI);
    ell(c, 0, 0, 56, 56, null, 8);
    rbox(c, -40, -26, 80, 40, 4, '#ff922b', 3);
    c.restore();
    c.font = `800 16px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText('CAR DUMPER', sx, sy - 150);
    // Port stockpile and conveyor to the ship loader.
    const px = (PIL.PORTSTOCK - PIL.DUMPER) * TS + sx;
    const h = Math.min(110, 12 + Mine.port * 5);
    c.beginPath(); c.moveTo(px - h * 1.1, sy); c.quadraticCurveTo(px, sy - h * 1.9, px + h * 1.1, sy); c.closePath(); fillStroke(c, Mine.port ? '#7a2e22' : 'rgba(122,46,34,0.25)', 3);
  } else if (p.type === 'ship') {
    const sh = Mine.ship, x = sx + sh.dx;
    const y = sy + Math.sin(t * 1.5) * 3 + 6;
    // Hull, deck house at the back, holds along the deck.
    const L = 250;
    c.beginPath(); c.moveTo(x - L, y - 60); c.lineTo(x + L, y - 60); c.lineTo(x + L - 30, y + 40); c.lineTo(x - L + 20, y + 40); c.closePath(); fillStroke(c, '#1c4e80', 5);
    c.fillStyle = '#c92a2a'; c.fillRect(x - L + 14, y + 14, 2 * L - 46, 22);
    c.fillStyle = '#fff'; c.font = `800 22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DINO ORE', x - 40, y - 26);
    rbox(c, x + L - 90, y - 160, 70, 100, 6, '#f8f9fa', 4);
    for (let i = 0; i < 3; i++) rbox(c, x + L - 80 + i * 22, y - 146, 14, 12, 2, '#bdf3ff', 2);
    rbox(c, x + L - 70, y - 190, 26, 30, 4, '#ffd43b', 3);
    PIL.HOLDS.forEach((hx, i) => {
      const cx = (hx - PIL.SHIP) * TS + x + 16;
      rbox(c, cx - 30, y - 74, 60, 16, 3, '#495057', 3);
      const f = sh.fill[i] / Mine.CAP;
      if (f > 0) ell(c, cx, y - 74, 28 * Math.max(0.4, f), 6 + 14 * f, '#7a2e22', 3);
    });
  }
}
