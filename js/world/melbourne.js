// Melbourne: the FIFO jet's other stop. Trams down the street, Flinders Street Station, the Yarra
// with a bike path and jumps, the MCG, a coffee cart, and four seasons in one day.
const MEL = {
  W: 320,                    // open columns; past that is a wall
  STRIP: [4, 34],            // Tullamarine airstrip
  TRAM: [42, 298],           // tram line along the street
  RIVER: [150, 186],         // the Yarra, under Princes Bridge
  RACK: 190,                 // bike-share rack
  CAFE: 199,                 // coffee cart (clear of the bike rack, so the door button means coffee)
  PARK: [188, 242],          // Southbank park with the bike path
  STOPS: [[60, '🏙️'], [128, '🚉'], [214, '🌳'], [282, '🏉']],
};

function generateMelbourne(world, seed) {
  const rng = mulberry32(seed + 733);
  const Wt = world.w, Ht = world.h, surf = world.surf;
  world.props = [];
  const river = x => x > MEL.RIVER[0] + 1 && x < MEL.RIVER[1] - 1;
  const park = x => x >= MEL.PARK[0] && x < MEL.PARK[1];
  const bed = new Int16Array(Wt);
  for (let x = 0; x < Wt; x++) {
    surf[x] = SURF;
    bed[x] = river(x) ? SURF + 7 : SURF;
    for (let y = 0; y < Ht; y++) {
      let id = T.AIR;
      if (x === 0 || x >= MEL.W || y >= Ht - 2) id = T.BEDROCK;
      else if (river(x) && y > SURF && y >= SEA_LEVEL && y < bed[x]) id = T.WATER;
      else if (river(x) && y === SURF) id = T.CONCRETE;   // Princes Bridge deck
      else if (y === bed[x]) id = river(x) ? T.SAND : park(x) || x > 242 ? T.GRASS : T.ROAD;
      else if (y > bed[x]) id = y < bed[x] + 5 ? T.DIRT : T.STONE;
      if (id === T.DIRT && rng() < 0.02) id = T.BONE;
      world.t[y * Wt + x] = id;
    }
  }
  // The bike path through the park is smooth concrete.
  for (let x = MEL.PARK[0]; x < MEL.PARK[1]; x++) world.t[SURF * Wt + x] = T.CONCRETE;
  for (let x = MEL.STRIP[0]; x < MEL.STRIP[1]; x++) world.t[SURF * Wt + x] = T.ROAD;
  world.genSurf = bed;
  const P = world.props;
  P.push({ type: 'windsock', x: 31, y: SURF });
  // City towers, a laneway full of street art, the station, Eureka, the MCG.
  for (const [x, w, h, col] of [[38, 5, 12, '#adb5bd'], [44, 4, 16, '#74c0fc'], [49, 6, 10, '#ced4da'], [78, 5, 18, '#495057'], [84, 6, 13, '#a5d8ff'],
    [91, 4, 20, '#868e96'], [96, 6, 11, '#dee2e6'], [104, 5, 15, '#4dabf7']]) P.push({ type: 'cbd', x, y: SURF, w, h, col });
  P.push({ type: 'laneway', x: 64, w: 12, y: SURF });
  P.push({ type: 'bridge', x: MEL.RIVER[0] + 2, w: MEL.RIVER[1] - MEL.RIVER[0] - 4, y: SURF });
  P.push({ type: 'flinders', x: 130, y: SURF });
  P.push({ type: 'eureka', x: 236, y: SURF });
  P.push({ type: 'mcg', x: 270, y: SURF });
  P.push({ type: 'bikerack', x: MEL.RACK, y: SURF });
  P.push({ type: 'coffee', x: MEL.CAFE + 0.5, y: SURF });
  for (const [x, icon] of MEL.STOPS) P.push({ type: 'tramstop', x, y: SURF, icon });
  P.push({ type: 'ramp', x: 205, w: 4, h: 3, dir: 1, y: SURF });
  P.push({ type: 'ramp', x: 226, w: 4, h: 3, dir: 1, y: SURF });
  for (const [x, text] of [[24, 'JET'], [48, 'CITY'], [69, 'ART'], [124, 'TRAM'], [166, 'BOAT'], [195, 'CAFE'], [210, 'BIKE'], [262, 'GOAL'], [286, 'STOP']]) addLabel(world, x, text);
}

// Tram rails in the road and the overhead wire on poles.
function drawTramLine(c, camX, camY) {
  const y = TRACK_Y - camY;
  if (y < -260 || y > Game.viewH + 300) return;
  const xa = Math.max(camX, (MEL.TRAM[0] - 3) * TS), xb = Math.min(camX + Game.viewW, (MEL.TRAM[1] + 3) * TS);
  if (xb <= xa) return;
  c.fillStyle = '#868e96'; c.fillRect(xa - camX, y - 3, xb - xa, 3);
  c.strokeStyle = '#343a40'; c.lineWidth = 2; c.beginPath(); c.moveTo(xa - camX, y - 194); c.lineTo(xb - camX, y - 194); c.stroke();
  for (let tx = MEL.TRAM[0] - 2; tx <= MEL.TRAM[1] + 2; tx += 12) {
    const px = tx * TS - camX;
    if (px < -20 || px > Game.viewW + 20) continue;
    limb(c, [px, y, px, y - 210], 5, '#495057'); limb(c, [px, y - 200, px + 26, y - 194], 3, '#495057');
  }
}

// City sky: blue on a good day, grey and drizzly when the weather turns.
function drawCitySky(c, camX, camY, t, zoom) {
  const r = Melbourne.rain;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, r > 0.5 ? '#8a99a8' : '#5fb4f5'); g.addColorStop(1, r > 0.5 ? '#ced4da' : '#d8f0ff');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const surfY = (SURF * TS - camY) * zoom, off = surfY - 440;
  Game.sunAt = { x: 170, y: 130 + off * 0.1 };
  if (r < 0.5) drawSun(c, 170, 130 + off * 0.1, t, Eggs.sunCool);
  Asteroid.drawSky(c, t);
  for (let i = 0; i < (r > 0.5 ? 9 : 4); i++) {
    const x = ((i * 220 + 40 - camX * 0.08 - t * 8) % (W + 300) + W + 300) % (W + 300) - 150;
    drawCloud(c, x, 60 + (i * 37 % 80) + off * 0.15, 0.9 + (i % 3) * 0.2);
  }
  // Far skyline.
  const base = 420 + off * 0.6;
  c.fillStyle = r > 0.5 ? '#9aa6b2' : '#a9c9e8';
  for (let i = 0; i < 26; i++) {
    const x = ((i * 74 - camX * 0.12) % (W + 200) + W + 200) % (W + 200) - 100, h = 60 + (i * 53 % 130);
    c.fillRect(x, base - h, 46 + (i * 17 % 30), h + 200);
  }
}

const MELBOURNE_PROPS = new Set(['bridge', 'cbd', 'laneway', 'flinders', 'eureka', 'mcg', 'bikerack', 'coffee', 'tramstop']);
function drawMelbProp(c, p, sx, sy) {
  if (p.type === 'cbd') {
    const w = p.w * TS, h = p.h * TS;
    rbox(c, sx, sy - h, w, h, 4, p.col, 4);
    c.fillStyle = 'rgba(255,255,255,0.45)';
    for (let y = sy - h + 14; y < sy - 30; y += 26) for (let x = sx + 10; x < sx + w - 14; x += 22) c.fillRect(x, y, 12, 14);
  } else if (p.type === 'bridge') {
    // Princes Bridge: stone railing and old lamps.
    const w = p.w * TS;
    rbox(c, sx, sy - 34, w, 10, 4, '#ced4da', 3);
    for (let x = sx + 8; x < sx + w; x += 24) limb(c, [x, sy - 24, x, sy], 4, '#adb5bd', 2);
    for (let x = sx + 40; x < sx + w; x += 200) { limb(c, [x, sy - 34, x, sy - 120], 5, '#343a40'); ell(c, x, sy - 128, 10, 12, '#fff3bf', 3); }
    // A rowing boat on the Yarra.
    const bx = sx + w / 2 + Math.sin(Game.t * 0.3) * w * 0.35, by = (SEA_LEVEL * TS - Game.cam.y) + 6;
    poly(c, [bx - 50, by - 10, bx + 50, by - 10, bx + 38, by + 4, bx - 38, by + 4], '#e8590c', 3);
    for (const k of [-1, 1]) limb(c, [bx + k * 20, by - 8, bx + k * 34 + Math.sin(Game.t * 3) * 10, by + 8], 3, '#8a5a2b');
  } else if (p.type === 'laneway') {
    // Brick walls covered in street art: a big dino mural, splats and stars.
    const w = p.w * TS;
    rbox(c, sx, sy - 220, w, 220, 0, '#b35c44', 4);
    c.fillStyle = 'rgba(70,30,20,0.25)';
    for (let y = sy - 210; y < sy; y += 14) for (let x = sx + ((y / 14) % 2 ? 0 : 14); x < sx + w; x += 28) c.fillRect(x, y, 24, 2);
    const cols = ['#ff6b6b', '#51cf66', '#ffd43b', '#4dabf7', '#cc5de8', '#ff922b'];
    for (let i = 0; i < 7; i++) ell(c, sx + 30 + i * 50, sy - 60 - (i * 37 % 90), 22 + (i % 3) * 8, 16 + (i % 2) * 8, cols[i % cols.length], 0);
    drawDinoSeated(c, sx + w / 2, sy - 70, 0.9, DINO_KEYS[Math.floor(Game.t / 6) % DINO_KEYS.length], { t: Game.t, outfit: null });
    for (let i = 0; i < 4; i++) drawStar(c, sx + 40 + i * 90, sy - 180 + (i % 2) * 24, 12, i, cols[(i + 2) % cols.length], 2);
  } else if (p.type === 'flinders') {
    // Flinders Street Station: yellow walls, a green copper dome and the row of clocks.
    rbox(c, sx - 300, sy - 170, 600, 170, 6, '#f2c14e', 4);
    for (let x = sx - 280; x < sx + 280; x += 50) rbox(c, x, sy - 120, 30, 50, 14, '#a8641e', 3);
    poly(c, [sx - 70, sy - 170, sx + 70, sy - 170, sx + 50, sy - 230, sx - 50, sy - 230], '#f2c14e', 4);
    c.beginPath(); c.arc(sx, sy - 230, 54, Math.PI, 0); c.closePath(); fillStroke(c, '#3fae8c', 4);
    ell(c, sx, sy - 290, 6, 10, '#3fae8c', 3);
    rbox(c, sx - 130, sy - 62, 260, 62, 6, '#5c3d1e', 4);
    for (let i = 0; i < 6; i++) {
      const cx = sx - 100 + i * 40;
      ell(c, cx, sy - 40, 13, 13, '#fff', 3);
      limb(c, [cx, sy - 40, cx + Math.cos(Game.t + i) * 8, sy - 40 + Math.sin(Game.t + i) * 8], 2, OUT, 0);
    }
  } else if (p.type === 'eureka') {
    rbox(c, sx - 40, sy - 560, 80, 560, 6, '#495057', 4);
    c.fillStyle = 'rgba(255,255,255,0.3)'; for (let y = sy - 540; y < sy - 20; y += 20) c.fillRect(sx - 30, y, 60, 6);
    rbox(c, sx - 40, sy - 600, 80, 50, 6, '#fcc419', 4);
    c.fillStyle = '#e03131'; c.fillRect(sx + 10, sy - 300, 30, 40);
  } else if (p.type === 'mcg') {
    // The 'G: a huge stadium wall, light towers and a roaring crowd behind it.
    rbox(c, sx - 360, sy - 160, 720, 160, 20, '#dee2e6', 4);
    c.fillStyle = '#adb5bd'; for (let x = sx - 340; x < sx + 340; x += 40) c.fillRect(x, sy - 150, 20, 120);
    for (const lx of [-330, 330]) {
      limb(c, [sx + lx, sy - 150, sx + lx, sy - 400], 8, '#868e96');
      rbox(c, sx + lx - 40, sy - 440, 80, 46, 6, '#343a40', 4);
      for (let i = 0; i < 6; i++) ell(c, sx + lx - 28 + (i % 3) * 28, sy - 428 + Math.floor(i / 3) * 20, 7, 6, '#fff3bf', 0);
    }
    bigText(c, 'MCG', sx, sy - 190, 44, '#1c3f8f');
    // A footy goes up now and then.
    const k = (Game.t % 5) / 5;
    if (k < 0.6) { const u = k / 0.6; ell(c, sx - 200 + u * 400, sy - 200 - Math.sin(u * Math.PI) * 220, 12, 8, '#a0522d', 3); }
  } else if (p.type === 'bikerack') {
    rbox(c, sx - 10, sy - 64, 150, 10, 4, '#1c7ed6', 3);
    for (let i = 0; i < 5; i++) limb(c, [sx + i * 30, sy, sx + i * 30, sy - 54], 4, '#adb5bd');
  } else if (p.type === 'coffee') {
    // Coffee cart with an awning and a steaming cup.
    rbox(c, sx - 44, sy - 70, 88, 52, 8, '#5c3d1e', 4);
    poly(c, [sx - 56, sy - 80, sx + 56, sy - 80, sx + 46, sy - 104, sx - 46, sy - 104], '#e03131', 4);
    for (let i = 0; i < 4; i++) { c.fillStyle = '#fff'; c.fillRect(sx - 40 + i * 24, sy - 103, 12, 22); }
    drawWheel(c, sx - 26, sy - 12, 12, 0); drawWheel(c, sx + 26, sy - 12, 12, 0);
    c.font = `30px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('☕', sx, sy - 46);
    for (let i = 0; i < 3; i++) { const k = (Game.t * 0.6 + i / 3) % 1; ell(c, sx + Math.sin(k * 6 + i) * 6, sy - 66 - k * 40, 4 + k * 4, 4 + k * 4, `rgba(255,255,255,${0.7 - k * 0.7})`, 0); }
  } else if (p.type === 'tramstop') {
    limb(c, [sx, sy, sx, sy - 120], 5, '#1e6b34');
    rbox(c, sx - 28, sy - 160, 56, 46, 10, '#2b8a3e', 4);
    c.font = `26px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.icon, sx, sy - 137);
    rbox(c, sx - 60, sy - 8, 120, 8, 3, '#ced4da', 3);   // platform
  }
}

const Melbourne = {
  visits: 0, rain: 0, rainT: 0,
  enter(jet) {
    Away.go('melbourne', generateMelbourne, { limitW: MEL.W });
    Vehicles.list = [jet];
    Vehicles.spawn('tram', 100 * TS, TRACK_Y - 4, 1);
    Vehicles.spawnAtGround('citybike', MEL.RACK + 1, 1);
    Vehicles.spawnAtGround('citybike', MEL.RACK + 4, 1);
    NPCs.list = [];
    const g = tx => World.groundBelow(tx, SURF - 3) * TS - 0.01;
    for (const [tx, type] of [[40, 'raptor'], [90, 'stego'], [140, 'tri'], [200, 'pachy'], [250, 'brachio'], [300, 'iguano']]) NPCs.add({ x: tx * TS + 16, y: g(tx), type, range: 5 * TS, fighter: false });
    for (let i = 0; i < 3; i++) this.addPassenger();
    // City traffic.
    for (const [kind, stops] of [['car', [44, 140]], ['car', [300, 190]], ['citybike', [100, 240]], ['van', [36, 120]]]) NPCs.worker(kind, stops[0], pick(DINO_KEYS.filter(k => k !== 'brachio')), routeScript(stops), stops[1] > stops[0] ? 1 : -1);
    this.rain = 0; this.rainT = rand(25, 40);
    jet.facing = 1;
    VEHICLE_DEFS.jet.landAt(jet, 18);
    Game.overlay = null;
    Game.snapCamera();
    Game.configurePlay();
  },
  // A dino waits at a tram stop wanting to go to another; the bubble shows which.
  addPassenger() {
    if (Game.away !== 'melbourne') return;
    const busy = new Set(NPCs.list.filter(n => n.melFrom !== undefined && n.need).map(n => n.melFrom));
    const free = MEL.STOPS.map((s, i) => i).filter(i => !busy.has(i));
    if (!free.length) return;
    const a = pick(free); let b = randi(0, MEL.STOPS.length - 1); while (b === a) b = randi(0, MEL.STOPS.length - 1);
    const [ax] = MEL.STOPS[a], [bx, icon] = MEL.STOPS[b];
    const n = NPCs.add({ x: ax * TS + rand(-30, 30), y: World.groundBelow(ax, SURF - 3) * TS - 0.01, type: pick(DINO_KEYS), bubble: icon, fighter: false, melFrom: a });
    n.need = { kinds: ['tram'], destX: bx * TS, destR: 110, board: 'Ding ding!', done: () => this.delivered(n) };
    n.stuck = true;
  },
  delivered(n) {
    if (Game.away !== 'melbourne') return;
    n.melFrom = undefined;
    Game.addStars(2); Game.popupStar(n.body.x, n.body.y - 90);
    Hud.celebrate('Thanks for the ride!');
    Sound.collect();
    setTimeout(() => this.addPassenger(), 3000);
  },
  landed() {
    this.visits++;
    Game.celebrate('Melbourne!', 'Welcome to Melbourne! Ride the tram, go for a bike ride, and grab a coffee.');
    if (this.visits === 1) { Game.addStars(3); Game.popupStar(Player.cx, Player.cy - 120); }
  },
  leave(jet) {
    Away.home();
    Player.zoomT = 0;
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
  },
  nearCafe() { return !Player.vehicle && Math.abs(MEL.CAFE * TS + 16 - Player.body.x) < 110 && Math.abs(SURF * TS - Player.body.y) < 80; },
  // A flat white: hearts, a happy wiggle, then five seconds of zooming about.
  coffee() {
    if (Player.zoomT > 1) return;
    Player.zoomT = 5;
    Sound.tone(523, 0.12, 'triangle', 0.1); Sound.tone(784, 0.18, 'triangle', 0.1, null, 0.12);
    Fx.burst(Player.body.x, Player.body.y - 70, 8, { speed: 90, up: 80, g: -40, life: 1, r: 9, color: '#ff6b81', shape: 'heart' });
    Pow.add(Player.body.x, Player.body.y - 90, 'ZOOM!');
  },
  // Four seasons in one day: sunny, then a quick shower, then sunny again.
  update(dt) {
    this.rainT -= dt;
    if (this.rainT <= 0) { this.rain = this.rain ? 0 : 1; this.rainT = this.rain ? rand(10, 15) : rand(30, 45); if (this.rain) Sound.noise(1.2, 0.05, 'highpass', 2000); }
    if (this.rain) for (let i = 0; i < 3; i++) Fx.add({ x: Game.cam.x + rand(0, Game.viewW), y: Game.cam.y + rand(-40, 0), vx: -60, vy: 900, life: 0.7, r: 2, color: 'rgba(200,220,255,0.75)' });
  },
  tap() { return false; },
  tapWorld(wx, wy) {
    if (Math.abs(wx - (MEL.CAFE * TS + 16)) < 60 && wy > SURF * TS - 110 && wy < SURF * TS + 10 && this.nearCafe()) { this.coffee(); return true; }
    return false;
  },
};
