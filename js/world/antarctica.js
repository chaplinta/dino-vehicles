// Antarctica: an icy runway by a research station, a big colony of emperor penguins, a long icy slide
// hill down to a sea full of ice floes with seals, an orca, a whale, and the southern lights overhead.
const ANT = {
  W: 300,
  STRIP: [4, 34],
  HUT: 46,
  COLONY: [62, 134],
  HILL: [136, 156, 162, 214],   // up from, top from, top to, down to
  SEA: [220, 288],               // open water (an iceberg closes it off)
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
    if (x >= s1) h = SURF - 9;   // a big iceberg at the end
    surf[x] = h;
    const slide = x >= t1 && x < d1;
    for (let y = 0; y < Ht; y++) {
      let id = T.AIR;
      if (x === 0 || x >= ANT.W || y >= Ht - 2) id = T.BEDROCK;
      else if (y === h) id = slide || x >= s1 ? T.ICE : x >= s0 && x < s1 ? T.STONE : T.SNOW;
      else if (y > h) id = x >= s1 && y < SURF + 2 ? T.ICE : y < h + 4 ? T.SNOW : T.STONE;
      else if (x >= s0 && x < s1 && y >= SURF) id = T.WATER;
      world.t[y * Wt + x] = id;
    }
  }
  // Ice floes floating on the sea, and an icy runway.
  for (const [a, b] of ANT.FLOES) for (let x = a; x < b; x++) world.t[SURF * Wt + x] = T.ICE;
  for (let x = ANT.STRIP[0]; x < ANT.STRIP[1]; x++) world.t[SURF * Wt + x] = T.ICE;
  world.genSurf = Int16Array.from(surf);
  const P = world.props;
  P.push({ type: 'windsock', x: 31, y: SURF });
  P.push({ type: 'an_hut', x: ANT.HUT + 0.5, y: SURF });
  for (const [x, text] of [[24, 'JET'], [42, 'HUT'], [96, 'HUG'], [168, 'SLIP'], [216, 'SEA']]) addLabel(world, x, text);
}

const Antarctica = {
  visits: 0, splashCool: 0,
  enter(jet) {
    Away.go('antarctica', generateAntarctica, { limitW: ANT.W });
    Vehicles.list = [jet];
    Vehicles.spawnAtGround('snowmobile', ANT.HUT + 7, 1);
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
    W_.add('orca', 244, { range: 18 });
    W_.add('whale', 268, { range: 6 });
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
  drawHills(c, camX, 0.3, 420 + off * 0.6, 18, '#e7f5ff', 1.1);
  drawHills(c, camX, 0.5, 450 + off * 0.75, 12, '#f8f9fa', 2.7);
}

const ANTARCTICA_PROPS = new Set(['an_hut']);
function drawAntarcticaProp(c, p, sx, sy) {
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
