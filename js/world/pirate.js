// Skull Island: sail the pirate ship here, read the treasure map, dig where X marks the spot,
// fend off the pirate crew and carry the chest back to the ship.
const PR = {
  W: 258,                 // open columns; past that is a wall
  SEABED: SURF + 10,      // sea floor row on the left
  JETTY: [46, 58],        // wooden jetty out over the water
  DOCK: 38,               // where the ship ties up
  KRAKEN: 14,
  WRECK: 24,
  FORT: [104, 112],
  CAVE: [158, 192],       // inside Skull Cave
  CAMP: 226,
  SPOTS: [88, 117, 131, 145, 222],   // places X can mark (not on loose sand, it slides back in)
  PALMS: [66, 84, 96, 124, 138, 214],
};

function pirateHeight(x) {
  if (x < 50) return PR.SEABED;
  if (x < 58) return Math.round(PR.SEABED - (x - 50) * 1.25);
  if (x >= 150 && x < 200) {
    if (x < 158) return SURF - Math.round((x - 150) * 1.2);
    if (x >= 192) return SURF - Math.round((200 - x) * 1.2);
    return SURF - 9;
  }
  return SURF;
}

function generatePirate(world, seed) {
  const rng = mulberry32(seed + 777);
  const Wt = world.w, Ht = world.h, surf = world.surf;
  world.props = [];
  const put = (x, y, id) => { if (x >= 0 && y >= 0 && x < Wt && y < Ht) world.t[y * Wt + x] = id; };
  for (let x = 0; x < Wt; x++) {
    const h = pirateHeight(x);
    surf[x] = h;
    for (let y = 0; y < Ht; y++) {
      let id = T.AIR;
      if (x === 0 || x >= PR.W || y >= Ht - 2) id = T.BEDROCK;
      else if (x < 58 && y >= SEA_LEVEL && y < h) id = T.WATER;
      else if (y >= h) {
        const sandy = x < 82 || (x >= 200 && x < 214);
        if (y === h) id = sandy || x < 150 ? (sandy ? T.SAND : T.GRASS) : T.GRASS;
        else if (y < h + 4) id = sandy ? T.SAND : (x >= 150 && x < 200 ? T.STONE : T.DIRT);
        else id = T.STONE;
        if (x >= 150 && x < 200 && y > h) id = T.STONE;
      }
      put(x, y, id);
    }
  }
  // Skull Cave: a tunnel into the hill and a room inside.
  for (let x = 152; x < PR.CAVE[1]; x++) for (let y = SURF - (x < PR.CAVE[0] ? 4 : 6); y < SURF; y++) put(x, y, T.AIR);
  // Jetty out over the water, on posts.
  for (let x = PR.JETTY[0]; x < PR.JETTY[1]; x++) {
    put(x, SURF, T.WOOD);
    if (x % 4 === 0) for (let y = SURF + 1; y < pirateHeight(x); y++) world.bg[y * Wt + x] = T.WOOD;
  }
  // Sandcastle fort, for the cannon.
  const [f0, f1] = PR.FORT;
  for (let x = f0; x <= f1; x++) {
    const tower = x <= f0 + 1 || x >= f1 - 1;
    const top = tower ? 5 : 3;
    for (let k = 1; k <= top; k++) put(x, SURF - k, T.SAND);
    if (tower && x % 2 === 0) put(x, SURF - top - 1, T.SAND);
  }
  // Treasure in the shipwreck and at the back of the cave.
  put(PR.WRECK + 2, PR.SEABED - 1, T.TREASURE);
  put(PR.CAVE[1] - 2, SURF - 1, T.TREASURE);
  world.genSurf = Int16Array.from(surf);
  for (const [x, text] of [[52, 'Walk the plank'], [70, 'Welcome to Skull Island'], [101, 'Palm trees have coconuts'], [149, 'Skull Cave is spooky'], [201, 'Pirate camp keep out']]) addLabel(world, x, text);
  const P = world.props;
  for (const x of PR.PALMS) P.push({ type: 'palm', x: x + 0.5, y: SURF, coco: 2, lean: (rng() - 0.5) * 0.5 });
  P.push({ type: 'plank', x: PR.JETTY[0], y: SURF });
  P.push({ type: 'bottle', x: 62.5, y: SURF, got: false });
  P.push({ type: 'wreck', x: PR.WRECK, y: PR.SEABED });
  P.push({ type: 'kraken', x: PR.KRAKEN, y: SEA_LEVEL });
  P.push({ type: 'skullrock', x: 155, y: SURF - 4 });
  P.push({ type: 'torch', x: 172, y: SURF - 4 });
  P.push({ type: 'ghost', x: 182.5, y: SURF - 1, boo: 0 });
  P.push({ type: 'jolly', x: 236, y: SURF });
  for (const x of [210, 216, 246]) P.push({ type: 'barrel', x: x + 0.5, y: SURF });
  P.push({ type: 'fortflag', x: f0 + 1, y: SURF - 7 });
  P.push({ type: 'xmark', x: 0, y: 0, hidden: true });
}

const Pirate = {
  visits: 0,
  enter(ship) {
    Away.go('pirate', generatePirate, { limitW: PR.W });
    Vehicles.list = [ship];
    ship.body.x = PR.DOCK * TS; ship.body.y = SEA_LEVEL * TS + ship.def.draft; ship.body.vx = 0; ship.body.vy = 0;
    ship.facing = 1; ship.s.hoist = false; ship.s.anchor = false; ship.s.sail = 0.3;
    // The crew: a captain with a hook, and pirates with cutlasses (about half of them fight back).
    NPCs.list = [];
    const g = tx => World.surfaceAt(tx) * TS - 0.01;
    NPCs.add({ x: PR.CAMP * TS + 16, y: g(PR.CAMP), type: 'rex', captain: true, crew: true, fighter: false, range: 3 * TS });
    const crew = ['raptor', 'allo', 'megalo', 'iguano', 'carno', 'bary'];
    [208, 220, 244].forEach((tx, i) => NPCs.add({ x: tx * TS + 16, y: g(tx), type: pick(crew), crew: true, attackKind: 'cutlass', fighter: i !== 1, range: 4 * TS }));
    Hunt.reset();
    Kraken.reset();
    Game.overlay = null;
    Game.snapCamera();
    Game.configurePlay();
    this.visits++;
    Game.celebrate('Skull Island!', this.visits === 1
      ? 'Land ho! Skull Island! You are a pirate now. Arrr! Tap the map to find the treasure.'
      : 'Back to Skull Island! Arrr!');
    if (this.visits === 1) { Game.addStars(3); Game.popupStar(ship.body.x, ship.body.y - 200); }
  },
  leave(ship) {
    Away.home();
    if (ship) {
      if (!Vehicles.list.includes(ship)) Vehicles.list.push(ship);
      Vehicles.list = Vehicles.list.filter(v => v === ship || v.kind !== 'pirateship');
      ship.body.x = 386 * TS + 16; ship.body.y = SEA_LEVEL * TS + ship.def.draft; ship.body.vx = 0; ship.body.vy = 0;
      ship.facing = -1; ship.s.hoist = false; ship.s.sail = 0.3;
    }
    Game.overlay = null;
    Game.snapCamera();
    Game.configurePlay();
    Game.celebrate('Home port!', 'Home port! What an adventure.');
  },

  update(dt) {
    Hunt.update(dt);
    Kraken.update(dt);
    const p = Player, b = p.body;
    // Headbutt (or bite, or kick...) a palm tree: a coconut drops.
    if (Input.pressed.action && !p.vehicle) {
      const palm = World.props.find(q => q.type === 'palm' && q.coco > 0 && Math.abs(q.x * TS - b.x) < 56 && Math.abs(q.y * TS - b.y) < 40);
      if (palm && !NPCs.inReach(b.x, b.y, p.facing, DINO_TYPES[p.type].attack).length) {
        palm.coco--; palm.shake = 0.5;
        const k = DINO_TYPES[p.type].attack, a = ATTACKS[k];
        p.attackKind = k; p.attackLen = a.len; p.attackT = a.len; p.attackCool = a.len; p.attackHit = true; p.attackTargets = [];
        Fx.burst(palm.x * TS, (palm.y - 6) * TS, 3, { speed: 60, up: 0, g: 900, life: 1, r: 9, color: '#7a4a24' });   // coconut drops
        Pow.add(palm.x * TS, (palm.y - 5) * TS, 'BONK!');
        Sound.bonk(); Game.addStars(1); Game.popupStar(palm.x * TS, (palm.y - 6) * TS);
        Sound.say(this.cocoSaid ? 'Coconut!' : 'Coconut! Coconuts float, so they can sail across the sea to new islands.');
        this.cocoSaid = true;
      }
    }
    // Message in a bottle.
    const bottle = World.props.find(q => q.type === 'bottle' && !q.got);
    if (bottle && !p.vehicle && Math.abs(bottle.x * TS - b.x) < 40 && Math.abs(bottle.y * TS - b.y) < 50) {
      bottle.got = true; Sound.collect(); Game.addStars(1); Game.popupStar(b.x, b.y - 80);
      Sound.say('A message in a bottle! It says: Arrr, the treasure be buried where X marks the spot!');
    }
    // The friendly ghost in Skull Cave.
    const ghost = World.props.find(q => q.type === 'ghost');
    if (ghost && !ghost.boo && Math.abs(ghost.x * TS - b.x) < 5 * TS && Math.abs(ghost.y * TS - b.y) < 3 * TS) {
      ghost.boo = 0.01; Sound.tone(300, 1.2, 'sine', 0.08, 600); Sound.tone(450, 1.2, 'sine', 0.05, 900, 0.1);
      Sound.say('Boo! Oh, it is just a friendly ghost pirate.'); Game.addStars(1); Game.popupStar(ghost.x * TS, ghost.y * TS - 100);
    }
    if (ghost && ghost.boo > 0) ghost.boo += dt;
    // Walk the plank: a big splash off the end of the jetty.
    const wet = !p.vehicle && b.inWater;
    if (wet && !this.wasWet && b.x < (PR.JETTY[0] + 1) * TS && b.x > (PR.JETTY[0] - 6) * TS && (this.splashT || 0) <= 0) {
      this.splashT = 4;
      Fx.burst(b.x, SEA_LEVEL * TS, 30, { speed: 320, up: 260, g: 700, life: 1.1, r: 9, color: ['#a5d8ff', '#e7f5ff', '#74c0fc'], shape: 'grow' });
      Pow.add(b.x, SEA_LEVEL * TS - 60, 'SPLASH!');
      Sound.noise(0.6, 0.3, 'lowpass', 900); Sound.say('You walked the plank! Splash!');
    }
    this.splashT = (this.splashT || 0) - dt;
    this.wasWet = wet;
    for (const q of World.props) if (q.shake > 0) q.shake -= dt;
  },
  inCave(x, y) { return x > (PR.CAVE[0] - 2) * TS && x < PR.CAVE[1] * TS && y > (SURF - 7) * TS && y <= SURF * TS + 4; },
  drawWorld(c) {
    // Skull Cave is dark; a torch and your own glow light it up.
    const x0 = (PR.CAVE[0] - 6) * TS, x1 = PR.CAVE[1] * TS, y0 = (SURF - 7) * TS, y1 = SURF * TS;
    const inside = this.inCave(Player.cx, Player.body.y);
    c.fillStyle = `rgba(10,5,25,${inside ? 0.55 : 0.75})`; c.fillRect(x0 + 6 * TS, y0, x1 - x0 - 6 * TS, y1 - y0);
    c.fillStyle = 'rgba(10,5,25,0.4)'; c.fillRect(x0, y0 + 2 * TS, 6 * TS, y1 - y0 - 2 * TS);
    c.save(); c.globalCompositeOperation = 'lighter';
    const glow = (gx, gy, r, a) => { const g = c.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, `rgba(255,170,70,${a})`); g.addColorStop(1, 'rgba(255,170,70,0)'); c.fillStyle = g; c.fillRect(gx - r, gy - r, r * 2, r * 2); };
    glow(172 * TS, (SURF - 4) * TS, 150 + Math.sin(Game.t * 9) * 8, 0.35);
    if (inside) glow(Player.cx, Player.cy, 110, 0.25);
    c.restore();
    Kraken.draw(c);
    Hunt.drawWorld(c);
  },
  drawHud(c) { Hunt.drawHud(c); },
  tap(x, y) { return Hunt.tap(x, y); },
  tapWorld(wx, wy) {
    const map = World.props.find(q => q.type === 'xmark' && !q.hidden && Math.abs(q.x * TS - wx) < 40 && Math.abs(q.y * TS - wy) < 60);
    if (map) { Sound.say('X marks the spot! Dig here!'); return true; }
    return false;
  },
};

// ---------- The treasure hunt ----------
const HUNT_STEPS = [
  { key: 'map', icon: '🗺️', say: 'Tap the treasure map to see where the treasure is buried.' },
  { key: 'dig', icon: '⛏️', say: 'Go to the red X and dig down to find the treasure chest!' },
  { key: 'fight', icon: '⚔️', say: 'The pirates want their treasure back! Fight them off, or run to the ship!' },
  { key: 'carry', icon: '💰', say: 'Carry the treasure chest back to the pirate ship!' },
];
const Hunt = {
  step: 'map', x: 0, y: 0, mapRead: false, crew: [], found: 0, spot: -1,
  reset() {
    this.mapRead = false; this.crew = []; this.said = null; Player.carry = false;
    this.pickSpot();
    this.step = 'map';
  },
  // Bury a chest under a new X.
  pickSpot() {
    const opts = PR.SPOTS.filter(x => x !== this.x);
    this.x = pick(opts);
    const top = World.surfaceAt(this.x);
    this.y = top + 3;
    for (let x = this.x - 1; x <= this.x + 1; x++) for (let y = top; y < this.y + 1; y++) if (World.get(x, y) === T.SAND) World.set(x, y, T.DIRT);
    for (let y = top + 1; y < this.y; y++) World.set(this.x, y, T.DIRT);
    World.set(this.x, this.y, T.TREASURE);
    const xm = World.props.find(q => q.type === 'xmark');
    if (xm) { xm.x = this.x + 0.5; xm.y = top; xm.hidden = false; }
  },
  currentStep() {
    if (Player.carry) return this.crew.some(n => n.angry > 0 && NPCs.list.includes(n)) ? 'fight' : 'carry';
    return this.mapRead ? 'dig' : 'map';
  },
  sayStep(force) {
    const st = HUNT_STEPS.find(s => s.key === this.step);
    if (force || this.said !== this.step) { this.said = this.step; Sound.say(st.say); }
  },
  onDig(tx, ty, id) {
    if (Game.away !== 'pirate' || id !== T.TREASURE || tx !== this.x || ty !== this.y) return;
    // Found it! Carry it to the ship, and here come the pirates.
    Player.carry = true;
    const xm = World.props.find(q => q.type === 'xmark'); if (xm) xm.hidden = true;
    setTimeout(() => Sound.say('You found the treasure! Uh oh, here come the pirates! Run to the ship!'), 1200);
    const crew = ['raptor', 'allo', 'megalo', 'iguano', 'carno'];
    const pb = Player.body;
    this.crew = [];
    for (let i = 0; i < 3; i++) {
      const tx = clamp(Math.floor(pb.x / TS) + 18 + i * 3, 60, PR.W - 3);
      const n = NPCs.add({ x: tx * TS + 16, y: World.groundBelow(tx, SURF - 12) * TS - 0.01, type: pick(crew), baby: false });
      Object.assign(n, { crew: true, attackKind: 'cutlass', fighter: true, angry: 40, atkCool: 0.8 + i * 0.5, facing: -1, greeted: true });
      this.crew.push(n);
    }
    Sound.tone(110, 0.6, 'sawtooth', 0.08, 80);
  },
  deliver() {
    Player.carry = false;
    this.found++;
    const v = Player.vehicle || Vehicles.list.find(v => v.kind === 'pirateship');
    const x = v ? v.body.x : Player.cx, y = v ? v.body.y - 120 : Player.cy - 80;
    Fx.burst(x, y, 40, { speed: 340, up: 200, g: 500, life: 1.6, r: 10, color: ['#fcc419', '#ffe066', '#fff3bf'], shape: 'star' });
    Game.addStars(10); Game.popupStar(x, y);
    Game.celebrate('Ahoy, treasure!', 'Ahoy! Treasure on board! Pirate treasure had silver coins called pieces of eight. Tap the map for the next treasure!');
    for (const n of this.crew) if (NPCs.list.includes(n)) { n.angry = 0; n.atk = null; n.leaving = true; n.scaredT = 6; n.fleeDir = Math.sign(n.body.x - Player.cx) || 1; }
    this.crew = [];
    this.mapRead = false;
    this.pickSpot();
  },
  update(dt) {
    if (Player.carry) {
      const ship = Vehicles.list.find(v => v.kind === 'pirateship');
      const onShip = Player.vehicle && Player.vehicle.kind === 'pirateship';
      const nearShip = ship && !Player.vehicle && Math.abs(ship.body.x - Player.body.x) < ship.body.w / 2 + 30 && Math.abs(ship.body.y - Player.body.y) < 120;
      const onJetty = !Player.vehicle && Player.body.x < (PR.JETTY[0] + 3) * TS && Player.body.y <= SURF * TS + 4;
      if (onShip || nearShip || onJetty) this.deliver();
    }
    const step = this.currentStep();
    if (step !== this.step) {
      this.step = step;
      setTimeout(() => { if (Game.away === 'pirate' && this.step === step) this.sayStep(); }, 1500);
    }
  },
  target() {
    switch (this.step) {
      case 'dig': return { x: this.x * TS + 16, y: (World.surfaceAt(this.x) - 2) * TS, icon: '❌' };
      case 'fight': case 'carry': {
        const ship = Vehicles.list.find(v => v.kind === 'pirateship');
        return ship ? { x: ship.body.x, y: ship.body.y - 200, icon: '🏴‍☠️' } : null;
      }
    }
    return null;
  },
  drawWorld(c) {
    const g = this.target();
    if (g) {
      const b = Math.abs(Math.sin(Game.t * 4)) * 12;
      poly(c, [g.x - 16, g.y - 30 - b, g.x + 16, g.y - 30 - b, g.x, g.y - 8 - b], '#ffd43b', 4);
    }
  },
  drawHud(c) {
    const cur = HUNT_STEPS.findIndex(s => s.key === this.step);
    const x0 = 24, y = 112;
    rbox(c, x0 - 8, y - 26, HUNT_STEPS.length * 48 + 10, 52, 22, 'rgba(255,248,225,0.85)', 3);
    HUNT_STEPS.forEach((s, i) => {
      const x = x0 + 20 + i * 48;
      const pulse = i === 0 && this.step === 'map' ? 1 + Math.sin(Game.t * 6) * 0.12 : 1;
      if (i === cur) ell(c, x, y, 22 * pulse, 22 * pulse, '#ffd43b', 3);
      c.globalAlpha = i === cur ? 1 : i < cur ? 0.55 : 0.35;
      c.font = `${Math.round(24 * pulse)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT;
      c.fillText(s.icon, x, y + 1);
      c.globalAlpha = 1;
    });
    this.stepsBox = { x: x0 - 8, y: y - 26, w: HUNT_STEPS.length * 48 + 10, h: 52 };
    if (this.found) { c.font = `800 18px ${FONT}`; c.textAlign = 'left'; c.fillStyle = OUT; c.fillText(`💰 × ${this.found}`, x0, y + 44); }
    // Edge arrow to the X or the ship.
    const g = this.target();
    this.arrow = null;
    if (!g) return;
    const sx = (g.x - Game.cam.x) * Game.zoom, sy = (g.y - Game.cam.y) * Game.zoom;
    if (sx > 30 && sx < W - 30 && sy > 30 && sy < H - 30) return;
    const ax = clamp(sx, 70, W - 70), ay = clamp(sy, 170, H - 160);
    const ang = Math.atan2(sy - ay, sx - ax), bob = Math.sin(Game.t * 6) * 6;
    c.save(); c.translate(ax + Math.cos(ang) * bob, ay + Math.sin(ang) * bob);
    ell(c, 0, 0, 34, 34, '#fff', 4);
    c.save(); c.rotate(ang); poly(c, [36, 0, 22, -14, 22, 14], '#e03131', 4); c.restore();
    c.font = `28px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText(g.icon, 0, 2);
    c.restore();
    this.arrow = { x: ax, y: ay };
  },
  tap(x, y) {
    const b = this.stepsBox;
    if (b && x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
      if (!Player.carry) TreasureMap.open(); else this.sayStep(true);
      return true;
    }
    if (this.arrow && dist(x, y, this.arrow.x, this.arrow.y) < 44) { this.sayStep(true); return true; }
    return false;
  },
};

// The treasure map: an old parchment of Skull Island with a big red X.
const TreasureMap = {
  open() {
    Game.overlay = this; this.t = 0;
    UI.configure({ dirs: 'none', action: null, roar: false, home: true });
    Sound.tone(500, 0.2, 'triangle', 0.08, 700);
    Sound.say('The treasure map! X marks the spot. The compass shows which way is north.');
  },
  update(dt) { this.t += dt; if (Input.pressed.action || Input.pressed.enter) this.close(); },
  tap() { if (this.t > 0.4) this.close(); return true; },
  close() {
    Game.overlay = null; Game.configurePlay();
    if (!Hunt.mapRead) { Hunt.mapRead = true; Sound.say('Dig where the red X is!'); }
  },
  draw(c) {
    c.fillStyle = 'rgba(20,30,50,0.6)'; c.fillRect(0, 0, W, H);
    const mx = W / 2 - 380, my = 50, mw = 760, mh = 440;
    // Torn parchment.
    c.beginPath(); c.moveTo(mx, my);
    for (let i = 0; i <= 20; i++) c.lineTo(mx + mw * i / 20, my + (i % 2 ? 6 : 0));
    for (let i = 0; i <= 12; i++) c.lineTo(mx + mw + (i % 2 ? -6 : 0), my + mh * i / 12);
    for (let i = 20; i >= 0; i--) c.lineTo(mx + mw * i / 20, my + mh + (i % 2 ? -6 : 0));
    for (let i = 12; i >= 0; i--) c.lineTo(mx + (i % 2 ? 6 : 0), my + mh * i / 12);
    c.closePath(); fillStroke(c, '#f4e1b0', 5);
    // The island from the real ground, sea on the left.
    const sx = x => mx + 40 + (x - 30) / (PR.W - 30) * (mw - 80);
    const sy = y => my + 90 + (y - (SURF - 14)) * 9;
    c.fillStyle = '#9ec5e8'; c.fillRect(mx + 30, sy(SEA_LEVEL), sx(58) - mx - 30, sy(PR.SEABED) - sy(SEA_LEVEL));
    c.beginPath(); c.moveTo(sx(50), sy(PR.SEABED + 4));
    for (let x = 50; x < PR.W; x += 2) c.lineTo(sx(x), sy(World.genSurf[x]));
    c.lineTo(sx(PR.W - 1), sy(PR.SEABED + 4)); c.closePath(); fillStroke(c, '#d9b26f', 3);
    c.font = `30px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const x of PR.PALMS) c.fillText('🌴', sx(x), sy(SURF) - 18);
    c.fillText('💀', sx(175), sy(SURF - 9) - 18);
    c.fillText('🏴‍☠️', sx(PR.CAMP), sy(SURF) - 18);
    c.fillText('⛵', sx(PR.DOCK), sy(SEA_LEVEL) - 16);
    // Dotted path from the ship to the X.
    c.setLineDash([8, 10]); c.strokeStyle = '#8a5524'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(sx(PR.DOCK + 6), sy(SEA_LEVEL) - 6); c.quadraticCurveTo((sx(PR.DOCK) + sx(Hunt.x)) / 2, sy(SURF) - 80, sx(Hunt.x), sy(SURF) - 10); c.stroke(); c.setLineDash([]);
    const xx = sx(Hunt.x), xy = sy(SURF) - 8, wob = Math.sin(this.t * 5) * 2;
    c.strokeStyle = '#e03131'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(xx - 18, xy - 18 + wob); c.lineTo(xx + 18, xy + 18 + wob); c.moveTo(xx + 18, xy - 18 + wob); c.lineTo(xx - 18, xy + 18 + wob); c.stroke();
    // Compass rose.
    const cx = mx + mw - 90, cy = my + mh - 90;
    ell(c, cx, cy, 46, 46, '#fff3d6', 3);
    poly(c, [cx, cy - 42, cx + 9, cy, cx, cy + 42, cx - 9, cy], '#495057', 2);
    poly(c, [cx, cy - 42, cx + 9, cy, cx - 9, cy], '#e03131', 2);
    c.font = `800 20px ${FONT}`; c.fillStyle = OUT; c.fillText('N', cx, cy - 58);
    bigText(c, 'X marks the spot!', W / 2, my + 44, 40, '#8a5524');
    if (this.t > 0.4) bigText(c, 'tap to close', W / 2, my + mh - 24, 22, '#fff');
  },
};

// ---------- The Kraken: a big friendly octopus in the bay ----------
const Kraken = {
  reset() { this.t = 0; this.up = 0; this.wave = 0; this.cool = 0; },
  update(dt) {
    this.t += dt; this.cool -= dt; this.wave = Math.max(0, this.wave - dt);
    const rising = (this.t % 9) > 5 || this.wave > 0;
    const before = this.up;
    this.up = clamp(this.up + (rising ? dt : -dt) * 0.8, 0, 1);
    if (before < 0.1 && this.up >= 0.1) {
      Fx.burst(PR.KRAKEN * TS, SEA_LEVEL * TS, 16, { speed: 220, up: 200, g: 600, life: 0.9, r: 8, color: ['#a5d8ff', '#e7f5ff'], shape: 'grow' });
      Sound.noise(0.4, 0.15, 'lowpass', 700);
    }
  },
  // A cannonball splashed down at (x, y).
  hit(x, y) {
    if (this.cool > 0 || Math.abs(x - PR.KRAKEN * TS) > 170) return false;
    this.wave = 3; this.cool = 12; this.t = 5.5;
    Pickups.shower(PR.KRAKEN * TS, SEA_LEVEL * TS - 300, 6);
    Game.addStars(2); Game.popupStar(PR.KRAKEN * TS, SEA_LEVEL * TS - 160);
    Sound.say('The Kraken waves hello! Look, it threw you some stars!');
    return true;
  },
  draw(c) {
    if (this.up <= 0) return;
    const bx = PR.KRAKEN * TS, by = SEA_LEVEL * TS + 10;
    for (let i = 0; i < 4; i++) {
      const ox = (i - 1.5) * 46, h = (110 + i % 2 * 30) * this.up;
      const sw = Math.sin(this.t * (this.wave ? 9 : 2.5) + i) * (this.wave ? 30 : 14);
      const pts = [bx + ox, by, bx + ox + sw * 0.5, by - h * 0.5, bx + ox + sw, by - h];
      limb(c, pts, 16 - i % 2 * 2, '#9c36b5');
      for (let k = 1; k < 4; k++) ell(c, lerp(bx + ox, bx + ox + sw, k / 4) + 6, by - h * k / 4, 3, 3, '#e599f7', 0);
    }
    if (this.up > 0.6) {
      ell(c, bx, by - 6, 46, 26 * this.up, '#ae3ec9', 4);
      drawEye(c, bx - 14, by - 14, 7, false); drawEye(c, bx + 14, by - 14, 7, false);
    }
  },
};

// ---------- Island scenery ----------
const PIRATE_PROPS = new Set(['palm', 'plank', 'bottle', 'wreck', 'kraken', 'skullrock', 'torch', 'ghost', 'jolly', 'barrel', 'fortflag', 'xmark']);
function drawPirateProp(c, p, sx, sy) {
  const t = Game.t;
  if (p.type === 'palm') {
    const sh = p.shake > 0 ? Math.sin(t * 50) * 4 : 0, lean = p.lean;
    const tx = sx + lean * 120 + sh, ty = sy - 190;
    c.beginPath(); c.moveTo(sx - 9, sy); c.quadraticCurveTo(sx + lean * 40, sy - 100, tx - 6, ty); c.lineTo(tx + 6, ty); c.quadraticCurveTo(sx + lean * 40 + 12, sy - 100, sx + 9, sy); c.closePath(); fillStroke(c, '#b08150', 3);
    for (let k = 1; k < 7; k++) { const y = lerp(sy, ty, k / 7); c.fillStyle = '#8a5a2b'; c.fillRect(lerp(sx, tx, k / 7) - 8, y, 16, 3); }
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + i * Math.PI / 5 + Math.sin(t * 1.5 + i) * 0.05;
      limb(c, [tx, ty, tx + Math.cos(a) * 50, ty + Math.sin(a) * 26 - 14, tx + Math.cos(a) * 92, ty + Math.sin(a) * 40 + 16], 13, i % 2 ? '#2f9e44' : '#40c057', 3);
    }
    for (let i = 0; i < p.coco; i++) ell(c, tx - 8 + i * 14, ty + 10, 8, 8, '#7a4a24', 3);
  } else if (p.type === 'plank') {
    rbox(c, sx - 60, sy - 6, 66, 10, 3, '#c98a4b', 3);
    c.font = `800 14px ${FONT}`; c.textAlign = 'center'; c.fillStyle = OUT; c.fillText('PLANK', sx - 28, sy - 16);
  } else if (p.type === 'bottle') {
    if (p.got) return;
    const bob = Math.sin(t * 2) * 3;
    c.save(); c.translate(sx, sy - 8 + bob); c.rotate(-0.4);
    rbox(c, -14, -7, 26, 14, 6, 'rgba(140,220,160,0.75)', 3); rbox(c, 10, -4, 9, 8, 2, '#a86d35', 2);
    rbox(c, -8, -4, 14, 8, 1, '#fff3d6', 0);
    c.restore();
    if (Math.floor(t * 2) % 3 === 0) drawStar(c, sx + 14, sy - 26, 6, t, '#fff', 0);
  } else if (p.type === 'wreck') {
    c.save(); c.translate(sx, sy); c.rotate(-0.15);
    c.beginPath(); c.moveTo(-110, -10); c.quadraticCurveTo(-100, 26, 0, 26); c.lineTo(80, 20); c.lineTo(120, -50); c.lineTo(60, -20); c.lineTo(20, -46); c.lineTo(-30, -18); c.lineTo(-70, -40); c.closePath(); fillStroke(c, '#6e4520', 4);
    for (let i = 0; i < 4; i++) c.fillRect(-90 + i * 40, -4, 26, 4);
    limb(c, [-10, -20, 20, -150], 8, '#6e4520'); poly(c, [20, -150, 70, -120, 18, -100], 'rgba(255,244,224,0.6)', 3);
    c.restore();
  } else if (p.type === 'skullrock') {
    // A skull carved over the cave mouth.
    ell(c, sx, sy - 40, 44, 40, '#e9ecef', 4);
    rbox(c, sx - 22, sy - 12, 44, 22, 6, '#e9ecef', 4);
    ell(c, sx - 16, sy - 44, 11, 13, '#212529', 0); ell(c, sx + 16, sy - 44, 11, 13, '#212529', 0);
    poly(c, [sx - 5, sy - 22, sx + 5, sy - 22, sx, sy - 32], '#212529', 0);
    for (let i = -2; i <= 2; i++) c.fillRect(sx + i * 8 - 1, sy - 10, 2, 16);
  } else if (p.type === 'torch') {
    limb(c, [sx, sy + 20, sx + 8, sy - 10], 6, '#7a4a24');
    const f = Math.sin(t * 13) * 3;
    poly(c, [sx + 1, sy - 8, sx + 15, sy - 8, sx + 8 + f, sy - 36], '#ff922b', 0);
    poly(c, [sx + 4, sy - 8, sx + 12, sy - 8, sx + 8 - f * 0.5, sy - 24], '#ffe066', 0);
  } else if (p.type === 'ghost') {
    if (p.boo > 3) return;
    const k = p.boo > 0 ? p.boo / 3 : 0, gy = sy - 40 - k * 160 + Math.sin(t * 3) * 6;
    c.globalAlpha = (p.boo > 0 ? 1 - k : 0.55) * 0.9;
    c.beginPath(); c.arc(sx, gy - 20, 24, Math.PI, 0); c.lineTo(sx + 24, gy + 20);
    for (let i = 0; i < 4; i++) c.lineTo(sx + 24 - (i + 0.5) * 12, gy + (i % 2 ? 20 : 10));
    c.lineTo(sx - 24, gy + 20); c.closePath(); fillStroke(c, '#f8f9fa', 3);
    ell(c, sx - 8, gy - 22, 4, 5, '#212529', 0); ell(c, sx + 8, gy - 22, 4, 5, '#212529', 0); ell(c, sx, gy - 6, 5, p.boo > 0 ? 7 : 3, '#212529', 0);
    poly(c, [sx - 22, gy - 38, sx - 6, gy - 54, sx + 10, gy - 54, sx + 24, gy - 38, sx, gy - 42], '#212529', 2);
    c.globalAlpha = 1;
  } else if (p.type === 'jolly' || p.type === 'fortflag') {
    const h = p.type === 'jolly' ? 170 : 70;
    limb(c, [sx, sy, sx, sy - h], 5, '#7a4a24');
    const wv = Math.sin(t * 4) * 5, fw = p.type === 'jolly' ? 80 : 44, fh = p.type === 'jolly' ? 54 : 30;
    poly(c, [sx + 2, sy - h, sx + fw, sy - h + 4 + wv, sx + fw, sy - h + fh + wv, sx + 2, sy - h + fh], '#212529', 3);
    const fx = sx + fw / 2, fy = sy - h + fh / 2 + wv * 0.5;
    ell(c, fx, fy - 3, fh * 0.2, fh * 0.2, '#fff', 0);
    limb(c, [fx - fh * 0.3, fy + fh * 0.25, fx + fh * 0.3, fy - fh * 0.05], 3, '#fff', 0); limb(c, [fx + fh * 0.3, fy + fh * 0.25, fx - fh * 0.3, fy - fh * 0.05], 3, '#fff', 0);
  } else if (p.type === 'barrel') {
    rbox(c, sx - 18, sy - 44, 36, 44, 10, '#a86d35', 3);
    c.fillStyle = '#495057'; c.fillRect(sx - 18, sy - 36, 36, 4); c.fillRect(sx - 18, sy - 12, 36, 4);
  } else if (p.type === 'xmark') {
    if (p.hidden) return;
    c.strokeStyle = '#e03131'; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx - 16, sy - 6); c.lineTo(sx + 16, sy + 6); c.moveTo(sx + 16, sy - 6); c.lineTo(sx - 16, sy + 6); c.stroke();
  }
}
