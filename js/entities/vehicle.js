// Vehicle base: shared movement, driver seat, enter/exit, and the vehicle registry.
const VEHICLE_DEFS = {};
// def: { name, say, icon, dirs, w, h, mover: 'ground'|'boat'|'air'|'rail'|'sub'|'rocket',
//        speed, accel, step, horn, unlock, draw(c,v), act(v,dt,inp), init(v), seat:[x,y,scale] }
function defVehicle(kind, def) {
  VEHICLE_DEFS[kind] = Object.assign({ dirs: 'lr', w: 80, h: 56, mover: 'ground', speed: 240, accel: 3,
    step: 1, horn: 'honk', unlock: 0, look: 160, seat: [0, -40, 0.5] }, def, { kind });
}

const IDLE_INPUT = { left: false, right: false, up: false, down: false, action: false, actionP: false };

class Vehicle {
  constructor(kind, x, y) {
    this.kind = kind;
    this.def = VEHICLE_DEFS[kind];
    this.body = makeBody(x, y, this.def.w, this.def.h);
    this.facing = 1;
    this.t = 0;
    this.wheel = 0;
    this.driver = null;      // Player, or an NPC object
    this.s = {};             // per-kind state
    this.honkT = 0;
    if (this.def.init) this.def.init(this);
  }
  get dirs() { return this.def.dirs; }
  get icon() { return this.def.icon; }
  get look() { return this.def.look; }
  get builds() { return !!this.def.builds; }
  get camY() { return this.def.camY || 0; }
  get driverType() { return this.driver ? this.driver.type : null; }
  tapTile(tx, ty) { if (this.def.tapTile) this.def.tapTile(this, tx, ty); }

  update(dt, inp) {
    const d = this.def, b = this.body;
    this.t += dt;
    this.honkT = Math.max(0, this.honkT - dt);
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (d.move) d.move(this, dt, inp, dir);
    else if (d.mover === 'ground') {
      const sp = d.speed * (this.s.slow || 1);
      b.vx = lerp(b.vx, dir * sp, Math.min(1, dt * (dir ? d.accel : 5)));
      if (dir && !this.s.lockFacing) this.facing = dir;
      moveBody(b, dt, { step: d.step });
      this.wheel += b.vx * dt / 16;
    }
    if (d.act) d.act(this, dt, inp);
  }
  hornSound() {
    const h = this.def.horn;
    if (h === 'siren') { [0, 0.3, 0.6, 0.9].forEach((dl, i) => Sound.tone(i % 2 ? 587 : 784, 0.28, 'triangle', 0.1, null, dl)); }
    else if (h === 'whistle') { Sound.tone(880, 0.6, 'sine', 0.12, 840); Sound.tone(1100, 0.6, 'sine', 0.08, 1060); }
    else if (h === 'boat') { Sound.tone(110, 0.9, 'sawtooth', 0.1); Sound.tone(165, 0.9, 'sawtooth', 0.06); }
    else if (h === 'tractor') { Sound.tone(220, 0.15, 'square', 0.1); Sound.tone(220, 0.15, 'square', 0.1, null, 0.2); }
    else Sound.honk();
  }
  draw(c) {
    const b = this.body;
    c.save();
    c.translate(Math.round(b.x), Math.round(b.y));
    if (this.facing < 0) c.scale(-1, 1);
    this.def.draw(c, this);
    c.restore();
  }
  // Draw whoever is driving at local seat position.
  drawDriver(c, sx, sy, s) {
    const dr = this.driver;
    if (!dr) return;
    drawDinoSeated(c, sx, sy, s, dr.type, { t: this.t + (dr.blinkSeed || 0), roar: dr.roarT || 0 });
  }
  // Front edge in world px, and the tile row the wheels stand on.
  frontX(extra = 0) { return this.body.x + this.facing * (this.body.w / 2 + extra); }
  groundRow() { return Math.floor((this.body.y + 4) / TS); }
  feetRow() { return Math.floor((this.body.y - 4) / TS); }
}

// Wheels, used by lots of vehicles.
function drawWheel(c, x, y, r, rot, hub = '#d0d4dc') {
  ell(c, x, y, r, r, '#333', 4);
  ell(c, x, y, r * 0.55, r * 0.55, hub, 3);
  c.save(); c.translate(x, y); c.rotate(rot);
  c.strokeStyle = '#7a7f8a'; c.lineWidth = 3;
  for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(r * 0.5, 0); c.stroke(); }
  c.restore();
  ell(c, x, y, r * 0.15, r * 0.15, '#555', 0);
}
function drawTracks(c, x0, x1, y, h, rot) {
  rbox(c, x0, y - h, x1 - x0, h, h / 2, '#3a3a44', 4);
  const n = Math.max(2, Math.round((x1 - x0) / 26));
  for (let i = 0; i < n; i++) {
    const wx = x0 + h / 2 + i * ((x1 - x0 - h) / (n - 1));
    drawWheel(c, wx, y - h / 2, h * 0.32, rot, '#9aa0aa');
  }
  c.fillStyle = '#55555f';
  const off = ((rot * 8) % 12 + 12) % 12;
  for (let x = x0 + 8 + off; x < x1 - 8; x += 12) c.fillRect(x, y - h + 1, 5, 4);
}
// Window with the driver clipped inside it.
function cabWindow(c, v, x, y, w, h, r, seat) {
  rrPath(c, x, y, w, h, r); c.fillStyle = '#bdf3ff'; c.fill();
  c.save(); rrPath(c, x, y, w, h, r); c.clip();
  v.drawDriver(c, seat[0], seat[1], seat[2]);
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x, y, w, h);
  c.restore();
  rrPath(c, x, y, w, h, r); fillStroke(c, null, 4);
}

const Vehicles = {
  list: [],
  spawn(kind, x, y, facing = 1) {
    const v = new Vehicle(kind, x, y);
    v.facing = facing;
    this.list.push(v);
    return v;
  },
  spawnAtGround(kind, tx, facing = 1) {
    const def = VEHICLE_DEFS[kind];
    if (def.draft) return this.spawn(kind, tx * TS + TS / 2, SEA_LEVEL * TS + def.draft, facing);
    const from = World.genSurf ? World.genSurf[tx] - 2 : 0;
    return this.spawn(kind, tx * TS + TS / 2, World.groundBelow(tx, from) * TS - 0.01, facing);
  },
  spawnDefaults() {
    this.list = [];
    for (const [kind, tx, f] of DEFAULT_VEHICLES) if (VEHICLE_DEFS[kind]) this.spawnAtGround(kind, tx, f || 1);
  },
  serialize() { return this.list.filter(v => !v.def.noSave && !v.npcOwned).map(v => [v.kind, Math.round(v.body.x), Math.round(v.body.y), v.facing]); },
  load(arr) {
    this.list = [];
    for (const [kind, x, y, f] of arr) if (VEHICLE_DEFS[kind]) this.spawn(kind, x, y, f);
    for (const [kind, tx, f] of DEFAULT_VEHICLES) if (VEHICLE_DEFS[kind] && !this.list.some(v => v.kind === kind)) this.spawnAtGround(kind, tx, f || 1);
  },
  nearest(x, y, r, filter) {
    let best = null, bd = r;
    for (const v of this.list) {
      if (filter && !filter(v)) continue;
      const d = dist(x, y, v.body.x, v.body.y - v.body.h / 2);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  },
  at(wx, wy) {
    return this.list.find(v => Math.abs(wx - v.body.x) < v.body.w / 2 + 10 && wy < v.body.y + 6 && wy > v.body.y - v.body.h - 30);
  },
  playerInput() {
    return { left: Input.held.left, right: Input.held.right, up: Input.held.up, down: Input.held.down,
      action: Input.held.action, actionP: Input.pressed.action, upP: Input.pressed.up, downP: Input.pressed.down };
  },
  update(dt) {
    const p = Player;
    const camMid = Game.cam.x + W / 2;
    for (const v of this.list) {
      if (v.driver !== p && Math.abs(v.body.x - camMid) > W * 1.6) continue;   // frozen off screen
      let inp = IDLE_INPUT;
      if (v.driver === p) inp = this.playerInput();
      else if (v.driver && v.driver.input) inp = v.driver.input;
      else if (v.autoTarget !== undefined) inp = this.autoDrive(v);
      v.update(dt, inp);
    }
    if (p.vehicle) {
      const v = p.vehicle;
      v.engT = (v.engT || 0) - dt;
      const sp = Math.abs(v.body.vx) + (v.def.mover === 'air' ? 120 : 0);
      if (v.engT <= 0 && sp > 25 && v.kind !== 'rocket') {
        if (v.kind === 'helicopter') { Sound.noise(0.06, 0.05, 'lowpass', 300); v.engT = 0.09; }
        else if (v.kind === 'train') { Sound.noise(0.07, 0.04, 'bandpass', 700); v.engT = clamp(30 / sp, 0.1, 0.5); }
        else { Sound.tone(55 + sp * 0.12, 0.09, 'sawtooth', 0.025); v.engT = 0.11; }
      }
      if (Input.pressed.enter) this.exit(p);
      else if (Input.pressed.roar) { p.vehicle.hornSound(); }
    } else {
      const near = this.nearest(p.body.x, p.body.y - 28, 120, v => !v.driver);
      UI.setEnter(!!near, '🚪');
      if (near && !this.doorHint) { this.doorHint = true; Sound.say('Press the door button to get in!'); }
      if (near && Input.pressed.enter) this.enter(p, near);
      else if (Input.pressed.whistle) Whistle.open();
    }
  },
  // Called vehicles drive themselves to the player.
  autoDrive(v) {
    const dx = v.autoTarget - v.body.x;
    if (Math.abs(dx) < 70 || v.autoT > 12) { delete v.autoTarget; return IDLE_INPUT; }
    v.autoT = (v.autoT || 0) + 1 / 60;
    return { left: dx < 0, right: dx > 0, up: false, down: false, action: false, actionP: false };
  },
  enter(p, v) {
    if (v.driver) return;
    p.vehicle = v;
    v.driver = p;
    v.facing = v.facing || 1;
    delete v.autoTarget;
    Sound.click(); v.hornSound();
    Sound.say(v.def.say || v.def.name);
    Fx.burst(v.body.x, v.body.y - v.body.h / 2, 10, { speed: 160, life: 0.5, r: 7, color: '#fff' });
    if (v.def.onEnter) v.def.onEnter(v);
    Game.configurePlay();
  },
  exit(p) {
    const v = p.vehicle;
    if (!v) return;
    if (v.def.canExit && !v.def.canExit(v)) { Sound.bonk(); return; }
    p.vehicle = null;
    v.driver = null;
    // Find a free spot beside the vehicle.
    const b = p.body, vb = v.body;
    const tries = [-1, 1].flatMap(side => [0, 1, 2, 3].map(up => [vb.x + side * (vb.w / 2 + 20), vb.y - up * TS]));
    tries.push([vb.x, vb.y - vb.h - 4]);
    let spot = tries.find(([x, y]) => !bodySolidAt(b, x, y));
    if (!spot) spot = [vb.x, vb.y - vb.h - 4];
    b.x = spot[0]; b.y = spot[1]; b.vx = 0; b.vy = -200;
    p.facing = v.facing;
    Sound.click();
    if (v.def.onExit) v.def.onExit(v);
    Game.configurePlay();
  },
  drawBack(c) { for (const v of this.list) if (v.def.back) v.draw(c); },
  draw(c) {
    for (const v of this.list) if (!v.def.back) v.draw(c);
    for (const v of this.list) if (v.def.drawWorld) v.def.drawWorld(c, v);
    // Bouncing arrow over a vehicle you can hop into.
    const p = Player;
    if (!p.vehicle) {
      const near = this.nearest(p.body.x, p.body.y - 28, 120, v => !v.driver);
      if (near) {
        const y = near.body.y - near.body.h - 40 - Math.abs(Math.sin(Game.t * 5)) * 12;
        poly(c, [near.body.x - 14, y, near.body.x + 14, y, near.body.x, y + 18], '#ffd43b', 4);
      }
    }
  },
};

// Whistle menu: a picture grid of vehicles. Picking one brings it to you.
const Whistle = {
  open() {
    Game.overlay = this;
    this.t = 0;
    this.sel = 0;
    UI.configure({ dirs: 'none', action: null, roar: false, home: true });
    Sound.tone(1400, 0.15, 'sine', 0.15, 1800); Sound.tone(1800, 0.25, 'sine', 0.12, 1400, 0.15);
    Sound.say('Which vehicle?');
  },
  kinds() { return VEHICLE_ORDER.filter(k => VEHICLE_DEFS[k] && Game.stars >= VEHICLE_DEFS[k].unlock); },
  cells() {
    const ks = VEHICLE_ORDER.filter(k => VEHICLE_DEFS[k]);
    const cols = 7, cw = 132, ch = 124;
    const rows = Math.ceil(ks.length / cols);
    const x0 = W / 2 - (cols * cw) / 2 + 5, y0 = H / 2 - (rows * ch) / 2 + 30;
    return ks.map((k, i) => ({ k, x: x0 + (i % cols) * cw, y: y0 + Math.floor(i / cols) * ch, w: cw - 10, h: ch - 10 }));
  },
  update(dt) {
    this.t += dt;
    const n = this.cells().length;
    if (Input.pressed.left) this.sel = (this.sel + n - 1) % n;
    if (Input.pressed.right) this.sel = (this.sel + 1) % n;
    if (Input.pressed.up) this.sel = (this.sel + n - 7) % n;
    if (Input.pressed.down) this.sel = (this.sel + 7) % n;
    if (Input.pressed.action || Input.pressed.enter) this.pick(this.cells()[this.sel].k);
    if (Input.pressed.whistle) this.close();
  },
  tap(x, y) {
    const cell = this.cells().find(c => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h);
    if (cell) this.pick(cell.k);
    else this.close();
    return true;
  },
  pick(kind) {
    const def = VEHICLE_DEFS[kind];
    if (Game.stars < def.unlock) { Sound.bonk(); Sound.say(`Collect ${def.unlock} stars to unlock`); return; }
    this.close();
    callVehicle(kind);
  },
  close() { Game.overlay = null; Game.configurePlay(); },
  draw(c) {
    c.fillStyle = 'rgba(20,30,50,0.7)'; c.fillRect(0, 0, W, H);
    for (const [i, cell] of this.cells().entries()) {
      const def = VEHICLE_DEFS[cell.k];
      const locked = Game.stars < def.unlock;
      const on = i === this.sel;
      rbox(c, cell.x, cell.y, cell.w, cell.h, 16, on ? '#fff3bf' : '#ffffff', on ? 6 : 4);
      c.save();
      rrPath(c, cell.x, cell.y, cell.w, cell.h, 16); c.clip();
      c.translate(cell.x + cell.w / 2 + (def.iconX || 0), cell.y + cell.h - 14);
      const sc = def.iconScale || 0.55;
      c.scale(sc, sc);
      if (locked) c.globalAlpha = 0.35;
      const fake = { def, t: Game.t, wheel: 0, s: def.iconState ? def.iconState() : {}, facing: 1, body: { x: 0, y: 0, w: def.w, h: def.h, vx: 0 },
        driver: locked ? null : { type: Player.type }, drawDriver: Vehicle.prototype.drawDriver };
      def.draw(c, fake);
      c.restore();
      if (locked) {
        drawStar(c, cell.x + cell.w / 2 - 22, cell.y + cell.h / 2, 18, 0, '#ffd43b', 3);
        bigText(c, String(def.unlock), cell.x + cell.w / 2 + 14, cell.y + cell.h / 2 + 2, 28, '#fff');
      }
    }
  },
};

function callVehicle(kind) {
  const p = Player;
  let v = Vehicles.list.find(v => v.kind === kind && !v.driver);
  const side = p.facing;
  const def = VEHICLE_DEFS[kind];
  if (!v) v = Vehicles.spawn(kind, 0, 0);
  // Pick a spot beside the player that isn't on top of another vehicle.
  let tx = 0;
  for (let k = 0; k < 24; k++) {
    const sd = k % 2 ? -side : side;
    const cand = clamp(Math.floor((p.body.x + sd * (100 + def.w / 2 + Math.floor(k / 2) * 64)) / TS), 4, WORLD_W - 5);
    const cx = cand * TS + TS / 2;
    if (!Vehicles.list.some(o => o !== v && !o.def.back && Math.abs(o.body.x - cx) < (o.body.w + def.w) / 2 + 8 && Math.abs(o.body.y - p.body.y) < 200)) { tx = cand; break; }
    if (k === 23) tx = cand;
  }
  // Find standing room near the player.
  let y = World.groundBelow(tx, Math.floor((p.body.y - TS * 4) / TS)) * TS - 0.01;
  if (def.mover === 'rail') { v.body.x = p.body.x + side * 120; v.body.y = TRACK_Y; }
  else {
    v.body.x = tx * TS + TS / 2; v.body.y = y;
    for (let k = 0; k < 12 && bodySolidAt(v.body, v.body.x, v.body.y); k++) v.body.y -= TS;
    if (def.mover === 'air' || def.mover === 'sub') v.body.y = Math.min(v.body.y, p.body.y - 20);
  }
  v.body.vx = v.body.vy = 0;
  v.facing = -side;
  if (v.def.reset) v.def.reset(v);
  Fx.burst(v.body.x, v.body.y - v.body.h / 2, 24, { speed: 260, life: 0.8, r: 12, color: ['#ffffff', '#e8f4ff', '#ffd43b'], shape: 'grow' });
  Sound.pop(); v.hornSound();
  Sound.say(def.name + '!');
}
