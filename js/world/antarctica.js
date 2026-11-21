// Antarctica: an icy runway by a research station, a big colony of emperor penguins, a long icy slide
// hill down to a sea full of ice floes with seals, orcas, a humpback whale, and the southern lights overhead.
// Across the sea, a small hidden valley where a few ice age animals live, and two are frozen in the ice.
const ANT = {
  W: 372,
  STRIP: [4, 34],
  HUT: 46,
  COLONY: [62, 134],
  HILL: [136, 156, 162, 214],   // up from, top from, top to, down to
  SEA: [220, 288],               // open water, with a sloping shore up to the valley
  VALLEY: [288, 372],
  LAKE: [318, 332],              // a frozen lake
  ROCKS: [342, 356],             // a rocky outcrop with a cave
  FROZEN: [[300, 'mammoth', 4, 3], [362, 'sabretooth', 4, 2]],   // x, animal, width, height of its block of ice
  FLOES: [[232, 238], [252, 259], [272, 278]],
};

function generateAntarctica(world, seed) {
  const Wt = world.w, Ht = world.h, surf = world.surf;
  world.props = [];
  const [u0, t0, t1, d1] = ANT.HILL, [s0, s1] = ANT.SEA;
  for (let x = 0; x < Wt; x++) {
    let h = SURF;
    if (x >= u0 && x < t0) h = SURF - Math.round((x - u0) * 12 / (t0 - u0));
    else if (x >= t0 && x < t1) h = SURF - 12;
    else if (x >= t1 && x < d1) h = SURF - 12 + Math.round((x - t1) * 12 / (d1 - t1));
    if (x >= s0 && x < s1) h = SURF + 8;
    if (x >= s1 - 8 && x < s1) h = SURF + 8 - (x - (s1 - 9));   // the sea bed slopes up to the far shore
    const [r0, r1] = ANT.ROCKS;
    if (x >= r0 && x < r1) h = SURF - Math.min(5, x - r0 + 1, r1 - x);
    surf[x] = h;
    const slide = x >= t1 && x < d1;
    for (let y = 0; y < Ht; y++) {
      let id = T.AIR;
      if (x === 0 || x >= ANT.W || y >= Ht - 2) id = T.BEDROCK;
      else if (y === h) id = slide || (x >= ANT.LAKE[0] && x < ANT.LAKE[1]) ? T.ICE : x >= s0 && x < s1 ? T.STONE : x >= ANT.ROCKS[0] && x < ANT.ROCKS[1] ? T.STONE : T.SNOW;
      else if (y > h) id = x >= ANT.ROCKS[0] && x < ANT.ROCKS[1] && y < SURF ? T.STONE : y < h + 4 ? T.SNOW : T.STONE;
      else if (x >= s0 && x < s1 && y >= SURF) id = T.WATER;
      world.t[y * Wt + x] = id;
    }
  }
  // Ice floes floating on the sea, and an icy runway.
  for (const [a, b] of ANT.FLOES) for (let x = a; x < b; x++) world.t[SURF * Wt + x] = T.ICE;
  for (let x = ANT.STRIP[0]; x < ANT.STRIP[1]; x++) world.t[SURF * Wt + x] = T.ICE;
  // A cave in the rocks.
  for (let x = ANT.ROCKS[0] + 4; x < ANT.ROCKS[1] - 4; x++) for (let y = SURF - 3; y < SURF; y++) world.t[y * Wt + x] = T.AIR;
  world.genSurf = Int16Array.from(surf);
  const P = world.props;
  // Ice age animals frozen in blocks of ice, waiting to be dug out.
  for (const [x0, kind, w, h] of ANT.FROZEN) {
    const tiles = [];
    for (let x = x0; x < x0 + w; x++) for (let y = SURF - h; y < SURF; y++) { world.t[y * Wt + x] = T.ICE; tiles.push(y * Wt + x); }
    P.push({ type: 'an_frozen', x: x0 + w / 2, y: SURF, kind, tiles, h });
  }
  P.push({ type: 'an_berg', x: 266, y: SURF });
  P.push({ type: 'an_pad', x: 38.5, y: SURF });
  P.push({ type: 'windsock', x: 31, y: SURF });
  P.push({ type: 'an_hut', x: ANT.HUT + 0.5, y: SURF });
  for (const [x, text] of [[24, 'JET'], [42, 'HUT'], [96, 'HUG'], [168, 'SLIP'], [216, 'SEA'], [292, 'OLD'], [310, 'FUR'], [334, 'TUSK'], [358, 'DIG']]) addLabel(world, x, text);
}

const Antarctica = {
  visits: 0, splashCool: 0,
  enter(jet) {
    Away.go('antarctica', generateAntarctica, { limitW: ANT.W });
    Vehicles.list = [jet];
    Vehicles.spawnAtGround('snowmobile', ANT.HUT + 7, 1);
    Vehicles.spawnAtGround('hagglunds', ANT.HUT + 12, 1);
    Vehicles.spawnAtGround('helicopter', 38, 1);
    Vehicles.spawnAtGround('icebreaker', ANT.SEA[0] + 6, 1);
    NPCs.list = [];
    Wildlife.reset();
    const W_ = Wildlife, loop = { top: (ANT.HILL[1] + 2) * TS, back: (ANT.COLONY[1] - 6) * TS };
    const mid = (ANT.COLONY[0] + ANT.COLONY[1]) / 2;
    for (let i = 0; i < 8; i++) {
      const p = W_.add('penguin', ANT.COLONY[0] + 6 + i * 8, { home: mid * TS, range: 30 });
      if (i % 2 === 0 && i < 7) W_.add('chick', ANT.COLONY[0] + 7 + i * 8, { mum: p });
    }
    for (const x of [ANT.COLONY[1] - 2, ANT.HILL[0] + 4]) W_.add('penguin', x, { slider: true, loop });
    for (const x of [204, 208, 212]) W_.add('adelie', x, { range: 5 });
    for (const [a, b] of ANT.FLOES) W_.add('seal', (a + b) / 2);
    W_.add('orca', 244, { range: 14, bull: true }); W_.add('orca', 250, { range: 14, scale: 0.8 });
    W_.add('whale', 262, { range: 9, state: 'swim' });
    // The hidden valley: a little mammoth family and a sabre-tooth cat on the rocks.
    const m = W_.add('mammoth', 312, { range: 10 }); W_.add('mammoth', 326, { range: 10, scale: 0.9 }); W_.add('mammoth', 308, { mum: m, baby: true, scale: 0.5 });
    W_.add('sabretooth', ANT.ROCKS[0] + 7, { range: 2 });
    W_.add('squirrel', (ANT.LAKE[0] + ANT.LAKE[1]) / 2, { range: 12, state: 'hold', scale: 1.2 });   // and a little squirrel with its acorn
    W_.add('skua', 120, { range: 70, y0: (SURF - 14) * TS });
    jet.facing = 1;
    VEHICLE_DEFS.jet.landAt(jet, 18);
    Game.overlay = null;
    Game.snapCamera();
    Game.configurePlay();
  },
  landed() {
    this.visits++;
    Game.celebrate('Antarctica!', 'Welcome to Antarctica! Hold down on the snow to slide on your tummy like a penguin.');
    if (this.visits === 1) { Game.addStars(3); Game.popupStar(Player.cx, Player.cy - 120); }
  },
  leave(jet) { tripHome(jet); },
  update(dt) {
    Wildlife.update(dt);
    // Dug all the ice off a frozen animal? It thaws out and off it goes.
    if ((this.thawT = (this.thawT || 0) - dt) <= 0) {
      this.thawT = 0.4;
      for (const p of World.props.filter(p => p.type === 'an_frozen')) {
        if (p.tiles.some(i => World.t[i] === T.ICE)) continue;
        World.props.splice(World.props.indexOf(p), 1);
        const tx = Math.floor(p.x), mum = p.kind === 'mammoth' ? Wildlife.list.find(a => a.kind === 'mammoth' && !a.baby) : null;
        Wildlife.add(p.kind, tx, p.kind === 'mammoth' ? { mum, baby: true, scale: 0.5 } : { range: 6, home: ANT.ROCKS[0] * TS });
        Fx.burst(p.x * TS, (SURF - 1) * TS, 18, { speed: 80, up: 120, g: -40, life: 1.6, r: 12, color: 'rgba(240,240,240,0.7)', shape: 'grow' });
        Pow.add(p.x * TS, (SURF - p.h - 1) * TS, 'FREE!'); Sound.collect();
        Game.addStars(3); Game.popupStar(p.x * TS, (SURF - p.h - 2) * TS);
      }
    }
    // Belly-slide into the sea with the penguins: SPLASH, and a star.
    this.splashCool = Math.max(0, this.splashCool - dt);
    const b = Player.body;
    if (Player.belly && b.inWater && !this.splashCool) {
      this.splashCool = 15;
      Fx.burst(b.x, SURF * TS, 22, { speed: 200, up: 300, g: 700, life: 1, r: 8, color: ['#a5d8ff', '#e7f5ff'] });
      Pow.add(b.x, b.y - 80, 'SPLASH!'); Sound.noise(0.5, 0.3, 'lowpass', 700);
      Game.addStars(1); Game.popupStar(b.x, b.y - 110);
    }
  },
  // Snow falling.
  drawWorld(c) {
    const cam = Game.cam, t = Game.t, vw = Game.viewW, vh = Game.viewH;
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 50; i++) {
      const x = cam.x + ((i * 97.3 + Math.sin(t + i) * 30 + t * 15) % vw + vw) % vw, y = cam.y + ((i * 53.1 + t * (30 + (i % 4) * 12)) % vh);
      c.beginPath(); c.arc(x, y, 1.5 + (i % 3), 0, TAU); c.fill();
    }
  },
};

// A cold blue sky with the southern lights rippling across it, and ice cliffs far off.
function drawPolarSky(c, camX, camY, t, zoom) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#16213e'); g.addColorStop(0.6, '#3b5b8c'); g.addColorStop(1, '#a5d8ff');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const surfY = (SURF * TS - camY) * zoom, off = surfY - 440;
  Game.sunAt = { x: -500, y: -500 };   // no sun to tap down here
  for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(t * 2 + i)})`; c.fillRect((i * 137.5) % W, (i * 61.3) % 220, 2, 2); }
  Asteroid.drawSky(c, t);
  // Aurora australis: wavy green and purple curtains.
  for (const [col, y0, ph] of [['rgba(105,219,124,0.35)', 90, 0], ['rgba(151,117,250,0.3)', 130, 2], ['rgba(56,217,169,0.3)', 60, 4]]) {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, y0 + off * 0.05);
    for (let x = 0; x <= W; x += 20) c.lineTo(x, y0 + off * 0.05 + Math.sin(x * 0.01 + t * 0.6 + ph) * 25);
    for (let x = W; x >= 0; x -= 20) c.lineTo(x, y0 + 70 + off * 0.05 + Math.sin(x * 0.013 + t * 0.5 + ph) * 30);
    c.closePath(); c.fill();
  }
  // Distant ice cliffs and white hills.
  c.fillStyle = '#dbe4ff';
  for (let i = 0; i < 7; i++) {
    const x = ((i * 260 - camX * 0.1) % (W + 400) + W + 400) % (W + 400) - 200, y = 380 + off * 0.4, h = 50 + (i * 37 % 60);
    c.fillRect(x, y - h, 180 + (i * 29 % 80), h + 200);
  }
  // Tall snowy peaks rise behind the hidden valley.
  const near = clamp(((camX + W / 2) / TS - 250) / 60, 0, 1);
  if (near > 0) {
    c.globalAlpha = near;
    for (const [wx, w, h] of [[300, 320, 260], [350, 280, 200], [400, 360, 300]]) {
      const x = W / 2 + (wx * TS - (camX + W / 2)) * 0.2, y = 400 + off * 0.35;
      poly(c, [x - w / 2, y, x, y - h, x + w / 2, y], '#b7c6d8', 0);
      poly(c, [x - w * 0.16, y - h * 0.7, x, y - h, x + w * 0.16, y - h * 0.7, x + w * 0.04, y - h * 0.64, x - w * 0.05, y - h * 0.68], '#fff', 0);
    }
    c.globalAlpha = 1;
  }
  drawHills(c, camX, 0.3, 420 + off * 0.6, 18, '#e7f5ff', 1.1);
  drawHills(c, camX, 0.5, 450 + off * 0.75, 12, '#f8f9fa', 2.7);
}

const ANTARCTICA_PROPS = new Set(['an_hut', 'an_frozen', 'an_berg', 'an_pad']);
function drawAntarcticaProp(c, p, sx, sy) {
  if (p.type === 'an_frozen') {
    // The animal inside the ice, faint and blue, waiting.
    c.save(); c.beginPath(); c.rect(sx - p.h * 40, sy - p.h * TS, p.h * 80, p.h * TS); c.clip();
    c.translate(sx, sy - 4); c.scale(p.kind === 'mammoth' ? 0.5 : 0.75, p.kind === 'mammoth' ? 0.5 : 0.75); c.globalAlpha = 0.6;
    drawAnimal(c, { kind: p.kind, t: 0, state: 'idle', baby: true, dir: 1 });
    c.restore();
    c.fillStyle = 'rgba(165,216,255,0.35)';
    for (const i of p.tiles) if (World.t[i] === T.ICE) { const tx = i % World.w, ty = Math.floor(i / World.w); c.fillRect(tx * TS - Game.cam.x, ty * TS - Game.cam.y, TS, TS); }
    return;
  }
  if (p.type === 'an_berg') {
    // An iceberg drifting out at sea: most of it is under the water.
    const bob = Math.sin(Game.t * 0.8) * 3;
    poly(c, [sx - 90, sy + bob, sx - 60, sy - 70 + bob, sx - 20, sy - 96 + bob, sx + 30, sy - 60 + bob, sx + 70, sy - 80 + bob, sx + 100, sy + bob], '#f1f8ff', 4);
    poly(c, [sx - 20, sy - 96 + bob, sx + 30, sy - 60 + bob, sx - 6, sy - 40 + bob], '#d0ebff', 0);
    c.fillStyle = 'rgba(116,192,252,0.5)'; c.beginPath(); c.moveTo(sx - 90, sy + 4 + bob); c.lineTo(sx + 100, sy + 4 + bob); c.lineTo(sx + 60, sy + 90); c.lineTo(sx - 60, sy + 90); c.closePath(); c.fill();
    return;
  }
  if (p.type === 'an_pad') {
    ell(c, sx, sy - 2, 70, 8, '#495057', 3);
    c.strokeStyle = '#ffd43b'; c.lineWidth = 4; c.beginPath(); c.moveTo(sx - 16, sy - 2); c.lineTo(sx + 16, sy - 2); c.stroke();
    return;
  }
  if (p.type === 'an_hut') {
    // A bright red research station on stilts, with a satellite dish and a flag.
    for (const dx of [-70, -20, 30, 70]) limb(c, [sx + dx, sy, sx + dx, sy - 30], 6, '#495057');
    rbox(c, sx - 90, sy - 120, 180, 90, 10, '#e03131', 4);
    for (let i = 0; i < 3; i++) rbox(c, sx - 70 + i * 50, sy - 100, 30, 26, 5, '#bdf3ff', 3);
    rbox(c, sx - 94, sy - 128, 188, 12, 5, '#f8f9fa', 3);
    limb(c, [sx + 60, sy - 128, sx + 60, sy - 160], 4, '#868e96');
    ell(c, sx + 60, sy - 166, 16, 10, '#dee2e6', 3);
    limb(c, [sx - 70, sy - 128, sx - 70, sy - 200], 4, '#adb5bd');
    const wv = Math.sin(Game.t * 5) * 3;
    poly(c, [sx - 68, sy - 198, sx - 30, sy - 194 + wv, sx - 30, sy - 172 + wv, sx - 68, sy - 176], '#1c7ed6', 3);
  }
}
