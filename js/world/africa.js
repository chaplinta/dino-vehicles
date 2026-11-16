// Africa: the jet lands on a dusty airstrip in the savanna. Lions on Pride Rock, elephants and hippos
// at the waterhole, giraffes at the acacias, a herd of zebras, meerkats, and Kilimanjaro far off.
const AFR = {
  W: 300,
  STRIP: [4, 34],
  KOPJE: [62, 90],           // Pride Rock: climb up the left, a jutting ledge on the right
  HOLE: [128, 159],          // the waterhole
  ACACIAS: [48, 104, 172, 212, 270],
  BAOBAB: 192,
  MOUNDS: [230, 292],
  MEERKATS: [238, 243, 248],
};

function generateAfrica(world, seed) {
  const Wt = world.w, Ht = world.h, surf = world.surf;
  world.props = [];
  const [k0, k1] = AFR.KOPJE, [h0, h1] = AFR.HOLE;
  for (let x = 0; x < Wt; x++) {
    let h = SURF;
    if (x >= k0 && x < k0 + 7) h = SURF - (x - k0);            // up the rocks
    else if (x >= k0 + 7 && x < k1 - 2) h = SURF - 7;           // the flat top
    if (x > h0 && x < h1) h = SURF + Math.min(3, x - h0, h1 - x); // the waterhole's bowl
    if (x > 176 && x < 228) h = SURF - Math.round(Math.sin((x - 176) / 52 * Math.PI) * 2);   // a gentle rise
    surf[x] = h;
    for (let y = 0; y < Ht; y++) {
      let id = T.AIR;
      if (x === 0 || x >= AFR.W || y >= Ht - 2) id = T.BEDROCK;
      else if (y === h) id = x >= k0 && x < k1 ? T.STONE : x > h0 && x < h1 ? T.SAND : T.SAVANNA;
      else if (y > h) id = x >= k0 && x < k1 && y < SURF + 2 ? T.STONE : y < h + 5 ? T.REDDIRT : T.STONE;
      else if (x > h0 && x < h1 && y >= SURF) id = T.WATER;   // the water's top is level with the land
      if (id === T.REDDIRT && Math.random() < 0.02) id = T.BONE;
      world.t[y * Wt + x] = id;
    }
  }
  // Pride Rock's ledge juts out over the grass.
  for (let x = k1 - 2; x < k1 + 2; x++) { world.t[(SURF - 7) * Wt + x] = T.STONE; world.t[(SURF - 6) * Wt + x] = T.STONE; }
  for (let x = AFR.STRIP[0]; x < AFR.STRIP[1]; x++) world.t[SURF * Wt + x] = T.ROAD;
  world.genSurf = Int16Array.from(surf);
  const P = world.props;
  P.push({ type: 'windsock', x: 31, y: SURF });
  for (const x of AFR.ACACIAS) P.push({ type: 'af_acacia', x: x + 0.5, y: surf[x], s: 0.9 + (x % 3) * 0.12 });
  P.push({ type: 'af_baobab', x: AFR.BAOBAB + 0.5, y: surf[AFR.BAOBAB] });
  for (const x of AFR.MOUNDS) P.push({ type: 'af_mound', x: x + 0.5, y: surf[x] });
  for (const [x, text] of [[24, 'JET'], [66, 'LION'], [114, 'BIG'], [126, 'MUD'], [168, 'TALL'], [234, 'POP'], [258, 'RUN']]) addLabel(world, x, text);
}

const Africa = {
  visits: 0,
  enter(jet) {
    Away.go('africa', generateAfrica, { limitW: AFR.W });
    Vehicles.list = [jet];
    Vehicles.spawnAtGround('safari', 42, 1);
    NPCs.list = [];
    Wildlife.reset();
    const W_ = Wildlife;
    W_.add('lion', 74, { male: true, range: 3, state: 'rest' }); W_.add('lion', 78, { range: 3, state: 'rest' }); W_.add('lion', 80, { cub: true, range: 3, state: 'walk' });
    const mum = W_.add('elephant', 110, { range: 12, water: AFR.HOLE[0] * TS - 40 });
    W_.add('elephant', 106, { mum, scale: 0.55 });
    const banks = [(AFR.HOLE[0] - 4) * TS, (AFR.HOLE[1] + 4) * TS];
    W_.add('hippo', 138, { range: 30, banks, state: 'swim' }); W_.add('hippo', 150, { range: 30, banks, state: 'swim', scale: 0.85 });
    for (const x of [131, 156, 154]) W_.add('flamingo', x, { range: 1 });
    W_.add('giraffe', AFR.ACACIAS[2] + 2, { range: 4 }); W_.add('giraffe', AFR.ACACIAS[3] + 2, { range: 5, scale: 0.85 });
    for (let i = 0; i < 5; i++) W_.add('zebra', 254 + i * 6, { home: 268 * TS, range: 14, scale: i === 4 ? 0.45 : 0.7 });
    W_.add('rhino', 200, { range: 8 });
    W_.add('warthog', 222, { range: 6 }); W_.add('warthog', 226, { range: 6, scale: 0.7 });
    for (const x of AFR.MEERKATS) W_.add('meerkat', x, { range: 0, state: 'up' });
    jet.facing = 1;
    VEHICLE_DEFS.jet.landAt(jet, 18);
    Game.overlay = null;
    Game.snapCamera();
    Game.configurePlay();
  },
  landed() {
    this.visits++;
    Game.celebrate('Africa!', 'Welcome to Africa! Hop in the safari jeep and take photos of the animals.');
    if (this.visits === 1) { Game.addStars(3); Game.popupStar(Player.cx, Player.cy - 120); }
  },
  leave(jet) { tripHome(jet); },
  update(dt) { Wildlife.update(dt); },
};

// Back to the airport at home, the same way from Africa or Antarctica.
function tripHome(jet) {
  Wildlife.reset();
  Away.home();
  Vehicles.spawnMissing();
  if (jet) {
    if (!Vehicles.list.includes(jet)) Vehicles.list.push(jet);
    Vehicles.list = Vehicles.list.filter(v => v === jet || v.kind !== 'jet');
    jet.facing = -1;
    VEHICLE_DEFS.jet.landAt(jet, 86);
  }
  Game.overlay = null;
  Game.snapCamera();
  Game.configurePlay();
}

// A big orange sky, the sun going down, and snow-capped Kilimanjaro far away.
function drawSavannaSky(c, camX, camY, t, zoom) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f76707'); g.addColorStop(0.55, '#ffa94d'); g.addColorStop(1, '#ffe8cc');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const surfY = (SURF * TS - camY) * zoom, off = surfY - 440;
  Game.sunAt = { x: W - 220, y: 250 + off * 0.1 };
  ell(c, W - 220, 250 + off * 0.1, 70, 70, 'rgba(255,224,102,0.9)', 0);
  Asteroid.drawSky(c, t);
  // Kilimanjaro.
  const kx = W * 0.4 - camX * 0.04, ky = 400 + off * 0.35;
  poly(c, [kx - 320, ky + 40, kx - 60, ky - 150, kx + 60, ky - 150, kx + 320, ky + 40], '#9c8aa5', 0);
  poly(c, [kx - 100, ky - 110, kx - 60, ky - 150, kx + 60, ky - 150, kx + 100, ky - 110, kx + 50, ky - 120, kx + 10, ky - 104, kx - 30, ky - 122], '#fff', 0);
  // Birds heading home.
  c.strokeStyle = 'rgba(60,30,20,0.6)'; c.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) {
    const bx = ((i * 140 + t * 25) % (W + 200)) - 100, by = 120 + i * 18 + off * 0.1, f = Math.sin(t * 6 + i) * 4;
    c.beginPath(); c.moveTo(bx - 10, by - f); c.lineTo(bx, by); c.lineTo(bx + 10, by - f); c.stroke();
  }
  drawHills(c, camX, 0.25, 420 + off * 0.6, 14, '#e0a85a', 0.7);
  // Flat-topped acacias along the horizon.
  for (let i = 0; i < 9; i++) {
    const x = ((i * 190 - camX * 0.3) % (W + 300) + W + 300) % (W + 300) - 150, y = 418 + off * 0.6;
    limb(c, [x, y, x, y - 34], 4, '#7a4b2a', 0);
    ell(c, x, y - 38, 42, 9, '#5f6f2d', 0);
  }
  drawHills(c, camX, 0.5, 450 + off * 0.75, 10, '#c98a3b', 2.4);
}

const AFRICA_PROPS = new Set(['af_acacia', 'af_baobab', 'af_mound']);
function drawAfricaProp(c, p, sx, sy) {
  if (p.type === 'af_acacia') {
    // Umbrella thorn: a twisty trunk and a wide flat top.
    const s = p.s || 1;
    limb(c, [sx, sy, sx - 6 * s, sy - 80 * s, sx + 10 * s, sy - 150 * s], 12 * s, '#7a4b2a');
    limb(c, [sx - 4 * s, sy - 90 * s, sx - 50 * s, sy - 140 * s], 7 * s, '#7a4b2a');
    limb(c, [sx + 4 * s, sy - 110 * s, sx + 60 * s, sy - 148 * s], 7 * s, '#7a4b2a');
    ell(c, sx + 4 * s, sy - 160 * s, 110 * s, 24 * s, '#6b8e23', 4);
    ell(c, sx - 30 * s, sy - 168 * s, 46 * s, 12 * s, '#7fa32b', 0);
  } else if (p.type === 'af_baobab') {
    // Fat bottle trunk with stubby root-like branches at the top.
    c.beginPath(); c.moveTo(sx - 48, sy); c.quadraticCurveTo(sx - 64, sy - 90, sx - 30, sy - 150); c.lineTo(sx + 30, sy - 150); c.quadraticCurveTo(sx + 64, sy - 90, sx + 48, sy); c.closePath();
    fillStroke(c, '#a1887f', 4);
    for (const [dx, dy] of [[-40, -190], [-12, -200], [16, -196], [40, -184]]) limb(c, [sx + dx * 0.5, sy - 148, sx + dx, sy + dy], 9, '#8d6e63');
    for (const [dx, dy] of [[-40, -196], [16, -202], [42, -190]]) ell(c, sx + dx, sy + dy, 22, 10, '#7fa32b', 3);
  } else if (p.type === 'af_mound') {
    // A tall termite mound.
    c.beginPath(); c.moveTo(sx - 30, sy); c.quadraticCurveTo(sx - 22, sy - 60, sx - 6, sy - 110); c.lineTo(sx + 4, sy - 104); c.quadraticCurveTo(sx + 26, sy - 50, sx + 30, sy); c.closePath();
    fillStroke(c, '#c4532a', 4);
    for (let i = 0; i < 5; i++) ell(c, sx - 10 + (i % 2) * 14, sy - 20 - i * 18, 3, 2, '#7a2e22', 0);
  }
}
