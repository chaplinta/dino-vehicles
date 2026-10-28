// The wild end of the world, past the speedway: a jungle with a waterfall, a volcano mountain,
// a desert with a canyon to jump, and a snowy mountain with an ice cave. Layout numbers are in WILD (gen.js).

// ---------- Generation (called from generateWorld) ----------
function wildHeight(x, b, n1) {
  if (b === 'jungle') {
    if (x >= WILD.RIVER[0] - 4 && x < WILD.RIVER[1] + 4) return SURF;
    if (x >= WILD.PLATEAU[0] && x < WILD.PLATEAU[1]) return SURF - Math.min(7, x - WILD.PLATEAU[0] + 1);
    if (x >= WILD.PLATEAU[1] && x < WILD.POOL[1] + 6) return SURF;
    return SURF + Math.round(n1(x * 0.1) * 0.8);
  }
  if (b === 'volc') {
    const d = Math.abs(x - WILD.CONE);
    return d < 56 ? SURF - Math.round(22 * (1 - d / 56)) : SURF;
  }
  if (b === 'desert') {
    if (Math.abs(x - WILD.CANYON[0] - 5) < 24 || x >= WILD.GHOST[0] - 8) return SURF;
    return SURF + Math.round(n1(x * 0.07));
  }
  if (b === 'snow') {
    const up = WILD.PEAK - 1094, down = 1196 - WILD.PEAK;
    if (x < 1094 || x >= 1196) return SURF;
    return x <= WILD.PEAK ? SURF - Math.round(18 * (x - 1094) / up) : SURF - Math.round(18 * (1 - (x - WILD.PEAK) / down));
  }
  return SURF;
}
// Shapes the smoothing pass would round off: the river bed, the cliff and pool, the crater and the canyon.
function wildCarve(surf) {
  for (let x = WILD.RIVER[0]; x < WILD.RIVER[1]; x++) surf[x] = SURF + 3;
  for (let x = WILD.PLATEAU[0]; x < WILD.PLATEAU[1]; x++) surf[x] = SURF - Math.min(7, x - WILD.PLATEAU[0] + 1);
  for (let x = WILD.POOL[0]; x < WILD.POOL[1]; x++) surf[x] = SURF + 4;
  for (let k = 0; k < 3; k++) surf[WILD.POOL[1] + k] = SURF + 3 - k;
  for (let x = WILD.CONE - 4; x <= WILD.CONE + 4; x++) surf[x] = SURF - 15;
  for (let x = WILD.CANYON[0]; x < WILD.CANYON[1]; x++) surf[x] = SURF + 12;
}
// Ground tiles for the wild places: [top, the few rows under it]. Null means the usual grass and dirt.
function wildMaterial(x, h, b) {
  if (b === 'desert') return Math.abs(x - WILD.CANYON[0] - 5) < 20 ? [T.REDDIRT, T.REDDIRT] : [T.SAND, T.REDDIRT];
  if (b === 'snow') return [T.SNOW, h < SURF - 10 ? T.STONE : T.DIRT];
  return null;
}

function genWild(world, rng, g) {
  const { put, get, surf, props, building, tree } = g, Ht = world.h;
  const clear = (x, y) => { if (get(x, y) !== T.BEDROCK) put(x, y, T.AIR); };

  // ----- Jungle -----
  // Giant trees with vines to climb and parrots on top.
  for (const x of WILD.TREES) {
    const h = surf[x];
    if (get(x, h) !== T.GRASS) continue;
    for (let i = 1; i <= 8; i++) put(x, h - i, T.TRUNK);
    for (let dx = -5; dx <= 5; dx++) for (let dy = -3; dy <= 2; dy++) {
      if ((dx / 5.2) ** 2 + (dy / 2.8) ** 2 > 1) continue;
      if (get(x + dx, h - 10 + dy) === T.AIR) put(x + dx, h - 10 + dy, T.LEAVES);
    }
    props.push({ type: 'vine', x: x + 3.5, y0: h - 9, y: h });
    props.push({ type: 'parrot', x: x + 0.5 - 2 + (x % 4), y: h - 13, fly: 0, col: ['#e03131', '#1c7ed6', '#f59f00'][x % 3] });
  }
  for (let x = 724; x < 846; x += 9) if (x < WILD.RIVER[0] - 3 || x > WILD.POOL[1] + 4) if (!WILD.TREES.some(t => Math.abs(t - x) < 4)) tree(x);
  // A river with a rope bridge over it.
  for (let x = WILD.RIVER[0]; x < WILD.RIVER[1]; x++) { put(x, SURF, T.WOOD); put(x, SURF + 1, T.WATER); put(x, SURF + 2, T.WATER); }
  props.push({ type: 'bridge', x: WILD.RIVER[0] - 0.5, x1: WILD.RIVER[1] + 0.5, y: SURF });
  // A rocky plateau ends at a cliff: the waterfall pours into a pool, and there's a cave behind it.
  for (let x = WILD.POOL[0]; x < WILD.POOL[1] + 3; x++) for (let y = SURF; y < surf[x]; y++) put(x, y, T.WATER);
  const cliff = WILD.PLATEAU[1] - 1;
  for (let x = cliff - 6; x <= cliff; x++) for (let y = SURF - 3; y < SURF; y++) clear(x, y);
  for (const [x, y] of [[cliff - 7, SURF - 2], [cliff - 4, SURF - 4], [cliff - 2, SURF - 4]]) put(x, y, T.GEM);
  props.push({ type: 'chest', x: cliff - 3.5, y: SURF, open: false, wild: 'fallscave' });
  props.push({ type: 'waterfall', x: WILD.POOL[0], y0: surf[cliff], y: SURF });

  // ----- Volcano mountain -----
  // Glowing lava in the crater at the top. It's always hot.
  for (let x = WILD.CONE - 4; x <= WILD.CONE + 4; x++) { put(x, SURF - 17, T.LAVA); put(x, SURF - 16, T.LAVA); }
  // A lava tube right through it at ground level, so the road (and the train) go under.
  for (let x = WILD.TUBE[0]; x < WILD.TUBE[1]; x++) {
    if (surf[x] <= SURF - 6) {
      for (let y = SURF - 4; y < SURF; y++) clear(x, y);
      put(x, SURF - 5, T.WARMROCK); put(x, SURF, T.STONE);
    } else {
      for (let y = 0; y < SURF; y++) clear(x, y);
      put(x, SURF, T.GRASS); surf[x] = SURF;
    }
  }
  // Lots of bones, eggs and fossils to dig round the volcano.
  for (let x = WILD.VOLC[0]; x < WILD.VOLC[1]; x++) for (let y = SURF + 1; y < SURF + 14; y++) {
    const id = get(x, y);
    if ((id === T.DIRT || id === T.STONE) && rng() < 0.06) put(x, y, id === T.STONE ? T.FOSSIL : rng() < 0.5 ? T.BONE : T.EGG);
  }
  props.push({ type: 'nest', x: WILD.TUBE[0] + 6.5, y: SURF });

  // ----- Desert and canyon -----
  for (let x = WILD.CANYON[0]; x < WILD.CANYON[1]; x++) for (let y = 0; y < SURF + 12; y++) clear(x, y);
  // A gently sloping tunnel up out of the canyon floor, so nobody is stuck down there.
  for (let k = 0; k <= 24; k++) {
    const x = WILD.CANYON[1] + k, f = SURF + 12 - Math.floor(k / 2);
    for (let y = f - 7; y < f; y++) clear(x, y);   // tall enough for the monster truck
    if (f - 7 <= SURF) surf[x] = f;
  }
  props.push({ type: 'ramp', x: WILD.CANYON[0] - 7, w: 7, h: 4, dir: 1 });    // take off...
  props.push({ type: 'ramp', x: WILD.CANYON[1], w: 7, h: 3, dir: -1 });       // ...and land on the far side
  // A ghost town: old wooden shacks and a water tower.
  building(world, WILD.GHOST[0], SURF, 6, 5, { wall: T.WOOD, roof: T.WOOD, windows: false });
  building(world, WILD.GHOST[1], SURF, 5, 4, { wall: T.WOOD, roof: T.WOOD, windows: false });
  building(world, WILD.GHOST[2], SURF, 6, 5, { wall: T.WOOD, roof: T.WOOD, windows: false });
  props.push({ type: 'watertower', x: WILD.GHOST[2] - 2.5, y: SURF });
  for (const x of [976, 986, 999, 1007, 1058, 1089]) props.push({ type: 'cactus', x: x + 0.5, y: surf[x], big: x % 2 });
  // A whole T-Rex skeleton buried under the sand. Dig it all out for a big bonus.
  const SKEL = [
    '            FFF ',
    '  BBBBBBBBBBFFFF',
    'BB  B B B B  F  ',
    '     BB   BB    ',
    '     B     B    ',
    '    BB    BB    ',
  ];
  world.skeleton = [];
  SKEL.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === ' ') return;
    const x = WILD.BONES[0] + dx, y = WILD.BONES[1] + dy;
    put(x, y, ch === 'F' ? T.FOSSIL : T.BONE); world.skeleton.push(y * world.w + x);
  }));

  // ----- Snowy mountain -----
  // An ice cave at the bottom of the mountain, with crystals in its walls.
  const [c0, c1] = WILD.CAVE, room = c0 + 12;
  for (let x = c0; x < c1; x++) {
    const top = x < room ? SURF - 3 : SURF - 6;
    for (let y = top; y < SURF; y++) clear(x, y);
    if (surf[x] > top - 1) { for (let y = 0; y < SURF; y++) clear(x, y); surf[x] = SURF; }
  }
  const iceAt = [];
  for (let x = c0 - 1; x <= c1; x++) for (let y = SURF - 8; y <= SURF; y++) {
    const id = get(x, y);
    if (id === T.AIR || id === T.BEDROCK) continue;
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => get(x + dx, y + dy) === T.AIR && x + dx >= c0 && x + dx < c1 && y + dy >= SURF - 6);
    if (open) { put(x, y, T.ICE); iceAt.push([x, y]); }
  }
  const walls = iceAt.filter(([, y]) => y < SURF);   // crystals in the walls and roof, not the floor
  for (let k = 0; k < 7 && walls.length; k++) { const [x, y] = walls.splice(Math.floor(rng() * walls.length), 1)[0]; put(x, y, T.CRYSTAL); }
  // Little snow drifts at the bottom of the ski run, for the snow plough.
  for (let x = WILD.DRIFTS[0]; x < WILD.DRIFTS[1]; x++) if (get(x, SURF - 1) === T.AIR && x % 3) put(x, SURF - 1, T.SNOW);

  // Reading signs.
  for (const [x, text] of [[726, 'TREE'], [WILD.TREES[1] + 5, 'VINE'], [WILD.POOL[1] + 3, 'POOL'], [WILD.PLATEAU[1] - 6, 'CAVE'],
    [WILD.TUBE[0] + 2, 'HOT'], [WILD.TUBE[0] + 10, 'EGGS'], [WILD.TUBE[1] - 4, 'LAVA'],
    [974, 'SAND'], [WILD.CANYON[0] - 10, 'JUMP'], [WILD.BONES[0] - 2, 'DIG'],
    [1091, 'SNOW'], [c0 + 2, 'ICE'], [WILD.PEAK + 20, 'SKI']]) addLabel(world, x, text);
}

// ---------- In the game ----------
const WILD_PROPS = new Set(['vine', 'waterfall', 'bridge', 'parrot', 'nest', 'cactus', 'watertower']);
const WILD_SKY = {   // far, middle and near hills
  base: ['#a5d8ff', '#8fd18a', '#6cbf5c'],
  jungle: ['#96d4a0', '#2f9e44', '#237a35'],
  volc: ['#b8a9a9', '#9c6b5e', '#6d4c41'],
  desert: ['#ffd8a8', '#f08c4a', '#d9622b'],
  snow: ['#e7f5ff', '#ffffff', '#dbe4ec'],
};
const WILD_PLACES = [[0, 'base'], [720, 'jungle'], [850, 'volc'], [970, 'desert'], [1090, 'snow'], [1210, 'base']];

function mixHex(a, b, k) {
  const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
}

const Wild = {
  volcT: 30, skelT: 1, smokeT: 0,
  placeAt(tx) { let k = 'base'; for (const [x, key] of WILD_PLACES) if (tx >= x) k = key; return k; },
  camTile() { return (Game.cam.x + Game.viewW / 2) / TS; },
  snowy() { if (!Game.worldReady) return false; const tx = this.camTile(); return tx >= WILD.SNOW[0] && tx < WILD.SNOW[1]; },
  // Hill colours blend from one place to the next as you go.
  palette(tx) {
    for (let i = 1; i < WILD_PLACES.length; i++) {
      const [bx] = WILD_PLACES[i];
      if (Math.abs(tx - bx) < 15) {
        const A = WILD_SKY[WILD_PLACES[i - 1][1]], B = WILD_SKY[WILD_PLACES[i][1]], k = (tx - bx + 15) / 30;
        return A.map((c, j) => mixHex(c, B[j], k));
      }
    }
    return WILD_SKY[this.placeAt(tx)];
  },
  vineAt(b) {
    if (Game.away) return null;
    return World.props.find(p => p.type === 'vine' && Math.abs(b.x - p.x * TS) < 24 && b.y > p.y0 * TS && b.y - b.h < p.y * TS) || null;
  },

  update(dt) {
    if (Game.away) return;
    const pb = Player.vehicle ? Player.vehicle.body : Player.body;
    for (const p of World.props) {
      if (p.type === 'chest' && p.wild && !p.open && dist(p.x * TS, p.y * TS - 16, pb.x, pb.y - 20) < 70) {
        p.open = true; Sound.collect();
        Fx.burst(p.x * TS, p.y * TS - 30, 14, { speed: 160, up: 200, g: 400, life: 1, r: 7, color: ['#ffd43b', '#fff'], shape: 'star' });
        if (!Eggs.reward(p.wild, 3, 'Treasure! Hidden behind the waterfall!', 'TREASURE!')) { Game.addStars(1); Game.popupStar(p.x * TS, p.y * TS - 40); }
      } else if (p.type === 'parrot') {
        if (!p.fly && Math.abs(Player.cx - p.x * TS) < 160 && Math.abs(Player.cy - p.y * TS) < 360) { p.fly = 0.01; Sound.tone(1800, 0.08, 'square', 0.04, 2400); Sound.tone(2200, 0.08, 'square', 0.04, 1600, 0.1); }
        else if (p.fly) { p.fly += dt; if (p.fly > 14) p.fly = 0; }
      }
    }
    // The volcano mountain goes off every minute or so while you're nearby.
    if (Math.abs(this.camTile() - WILD.CONE) < 70) {
      this.volcT -= dt;
      if (this.volcT <= 0 && !Volcano.active) {
        const s = Math.random() < 0.5 ? -1 : 1, x = WILD.CONE + s * 6;
        Volcano.spill(x, World.genSurf[x] - 1, 18, [WILD.CONE, SURF - 18]);
        this.volcT = rand(60, 90);
      }
    }
    // Every last bone of the T-Rex skeleton dug up?
    if ((this.skelT -= dt) <= 0) {
      this.skelT = 1;
      if (World.skeleton && !Eggs.found.skeleton && World.skeleton.every(i => { const id = World.t[i]; return id !== T.BONE && id !== T.FOSSIL; }))
        Eggs.reward('skeleton', 10, 'You dug up a whole T-Rex skeleton!', 'SKELETON!');
    }
  },

  drawProp(c, p, sx, sy) {
    const t = Game.t;
    if (p.type === 'vine') {
      const top = p.y0 * TS - Game.cam.y;
      c.strokeStyle = '#2b8a3e'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();
      for (let y = top; y <= sy - 10; y += 8) c.lineTo(sx + Math.sin(y * 0.05 + t * 1.5) * 4, y);
      c.stroke();
      for (let y = top + 14; y < sy - 10; y += 26) ell(c, sx + (y % 52 ? 7 : -7), y, 7, 4, '#40c057', 2);
    } else if (p.type === 'waterfall') {
      const top = p.y0 * TS - Game.cam.y;
      c.fillStyle = 'rgba(116,192,252,0.8)'; c.fillRect(sx - 4, top, 40, sy - top);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 6; i++) { const y = top + ((t * 260 + i * 53) % (sy - top)); c.fillRect(sx + 2 + i * 5, y, 3, 18); }
      for (let i = 0; i < 4; i++) ell(c, sx + 16 + Math.sin(t * 5 + i * 2) * 22, sy - 2, 10 + i * 2, 5, 'rgba(255,255,255,0.75)', 0);
    } else if (p.type === 'bridge') {
      const w = (p.x1 - p.x) * TS;
      for (const px of [sx, sx + w]) limb(c, [px, sy, px, sy - 50], 6, '#8a5a2b');
      c.strokeStyle = '#c9a66b'; c.lineWidth = 4;
      for (const dy of [44, 24]) { c.beginPath(); c.moveTo(sx, sy - dy); c.quadraticCurveTo(sx + w / 2, sy - dy + 22, sx + w, sy - dy); c.stroke(); }
      c.lineWidth = 2;
      for (let x = 20; x < w; x += 22) { const sag = 22 * (1 - ((x / w) * 2 - 1) ** 2); c.beginPath(); c.moveTo(sx + x, sy - 44 + sag); c.lineTo(sx + x, sy); c.stroke(); }
    } else if (p.type === 'parrot') {
      const k = p.fly, px = sx + k * 120, py = sy - k * 90 + (k ? Math.sin(t * 20) * 4 : 0);
      if (k > 6) return;
      ell(c, px, py, 9, 13, p.col, 2.5);
      ell(c, px + 3, py - 12, 7, 7, p.col, 2.5);
      poly(c, [px + 8, py - 13, px + 15, py - 10, px + 8, py - 8], '#ffd43b', 1.5);
      drawEye(c, px + 5, py - 14, 2.5, false);
      const flap = k ? Math.sin(t * 30) * 12 : 0;
      poly(c, [px - 4, py - 4, px - 18, py + 2 - flap, px - 4, py + 8], k ? '#ffd43b' : p.col, 2);
      limb(c, [px - 2, py + 12, px - 6, py + 26], 4, p.col);
    } else if (p.type === 'nest') {
      ell(c, sx, sy - 8, 46, 12, '#a0662e', 3);
      for (let i = 0; i < 3; i++) ell(c, sx - 18 + i * 18, sy - 18, 8, 11, '#bff0ff', 2);
      drawDinoSeated(c, sx + 50, sy - 6, 0.5, 'iguano', { t, flip: true });
    } else if (p.type === 'cactus') {
      const h = p.big ? 86 : 56;
      rbox(c, sx - 10, sy - h, 20, h, 10, '#2f9e44', 3);
      rbox(c, sx - 30, sy - h * 0.7, 12, h * 0.35, 6, '#2f9e44', 3); limb(c, [sx - 18, sy - h * 0.45, sx - 10, sy - h * 0.45], 8, '#2f9e44', 0);
      if (p.big) { rbox(c, sx + 18, sy - h * 0.85, 12, h * 0.4, 6, '#2f9e44', 3); limb(c, [sx + 18, sy - h * 0.55, sx + 10, sy - h * 0.55], 8, '#2f9e44', 0); }
      ell(c, sx, sy - h - 2, 6, 5, '#f783ac', 2);
    } else if (p.type === 'watertower') {
      for (const dx of [-30, 30]) limb(c, [sx + dx, sy, sx + dx * 0.7, sy - 120], 6, '#8a5a2b');
      limb(c, [sx - 28, sy - 40, sx + 26, sy - 90], 4, '#8a5a2b');
      rbox(c, sx - 40, sy - 190, 80, 72, 8, '#a86d35', 4);
      poly(c, [sx - 46, sy - 190, sx + 46, sy - 190, sx, sy - 222], '#8a5524', 4);
      c.strokeStyle = 'rgba(60,30,10,0.4)'; c.lineWidth = 3;
      for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(sx - 40, sy - 190 + i * 18); c.lineTo(sx + 40, sy - 190 + i * 18); c.stroke(); }
    }
  },

  // Far scenery behind the hills: the smoking volcano, desert mesas, snowy peaks.
  drawFar(c, camX, off, t) {
    const mid = (camX + W / 2) / TS;
    const far = (wx, f) => W / 2 + (wx * TS - (camX + W / 2)) * f;
    const near = (x0, x1, fade) => clamp(1 - Math.max(x0 - mid, mid - x1, 0) / fade, 0, 1);
    let a = near(WILD.VOLC[0], WILD.VOLC[1], 260);
    if (a > 0) {
      const x = far(WILD.CONE, 0.2), y = 360 + off * 0.35;
      c.globalAlpha = a;
      poly(c, [x - 280, y + 60, x - 40, y - 170, x + 40, y - 170, x + 280, y + 60], '#8d7b78', 0);
      poly(c, [x - 40, y - 170, x + 40, y - 170, x + 26, y - 154, x - 26, y - 154], '#ff922b', 0);
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.12 + i / 6) % 1;
        ell(c, x + Math.sin(i * 2 + t * 0.3) * 20 + k * 90, y - 190 - k * 220, 26 + k * 50, 20 + k * 36, `rgba(110,105,110,${0.55 * (1 - k)})`, 0);
      }
      c.globalAlpha = 1;
    }
    a = near(WILD.DESERT[0], WILD.DESERT[1], 120);
    if (a > 0) {
      c.globalAlpha = a;
      for (const [wx, w, h] of [[975, 220, 120], [1040, 300, 90], [1100, 200, 140]]) {
        const x = far(wx, 0.25), y = 400 + off * 0.4;
        poly(c, [x - w / 2, y, x - w / 2 + 30, y - h, x + w / 2 - 30, y - h, x + w / 2, y], '#e8925a', 0);
        c.fillStyle = '#d9773f'; c.fillRect(x - w / 2 + 34, y - h + 14, w - 68, 6);
      }
      c.globalAlpha = 1;
    }
    a = near(WILD.SNOW[0], WILD.SNOW[1], 120);
    if (a > 0) {
      c.globalAlpha = a;
      for (const [wx, w, h] of [[1100, 300, 230], [1170, 360, 280], [1240, 260, 200]]) {
        const x = far(wx, 0.2), y = 400 + off * 0.35;
        poly(c, [x - w / 2, y, x, y - h, x + w / 2, y], '#a5b4c4', 0);
        poly(c, [x - w * 0.14, y - h * 0.72, x, y - h, x + w * 0.14, y - h * 0.72, x + w * 0.05, y - h * 0.66, x - w * 0.05, y - h * 0.7], '#fff', 0);
      }
      c.globalAlpha = 1;
    }
  },

  // Crater glow and smoke, glowing cracks in the lava tube, tumbleweeds, and falling snow.
  drawWorld(c) {
    const cam = Game.cam, t = Game.t, vw = Game.viewW, vh = Game.viewH;
    const seen = (px, py, m = 80) => px > cam.x - m && px < cam.x + vw + m && py > cam.y - m && py < cam.y + vh + m;
    for (let x = WILD.CONE - 4; x <= WILD.CONE + 4; x++) for (const y of [SURF - 17, SURF - 16]) {
      if (World.get(x, y) !== T.LAVA || !seen(x * TS, y * TS)) continue;
      c.fillStyle = `rgba(255,${190 + Math.round(Math.sin(t * 3 + x) * 40)},60,0.4)`; c.fillRect(x * TS, y * TS, TS, TS);
      const k = (t * 1.2 + x * 0.37) % 1;
      ell(c, x * TS + 10 + (x * 7) % 14, y * TS + TS - k * TS, 3 + k * 2, 3 + k * 2, 'rgba(255,230,120,0.8)', 0);
    }
    const sx = WILD.CONE * TS + 16, sy = (SURF - 18) * TS;
    if (Math.abs(sx - (cam.x + vw / 2)) < vw * 1.5 && (this.smokeT -= 1 / 60) <= 0) {
      this.smokeT = 0.25;
      Fx.add({ x: sx + rand(-40, 40), y: sy, vx: rand(5, 30), vy: rand(-70, -40), g: 0, life: 4, r: 18, color: 'rgba(120,115,125,0.45)', shape: 'grow' });
    }
    for (let x = Math.max(WILD.TUBE[0], Math.floor(cam.x / TS)); x < Math.min(WILD.TUBE[1], (cam.x + vw) / TS + 1); x++) {
      if (World.get(x, SURF - 5) !== T.WARMROCK || !seen(x * TS, (SURF - 5) * TS)) continue;
      c.strokeStyle = `rgba(255,${130 + Math.round(Math.sin(t * 2 + x) * 50)},40,0.85)`; c.lineWidth = 3; c.beginPath();
      const y = (SURF - 4) * TS - 3, a = tileHash(x, 7);
      c.moveTo(x * TS, y); c.lineTo(x * TS + 10, y - 6 - a * 6); c.lineTo(x * TS + 20, y - 2); c.lineTo(x * TS + 32, y - 8 * a); c.stroke();
    }
    const d0 = WILD.DESERT[0] * TS, span = (WILD.DESERT[1] - WILD.DESERT[0]) * TS;
    for (let i = 0; i < 3; i++) {
      const x = d0 + ((t * (70 + i * 25) + i * 1300) % span), tx = Math.floor(x / TS);
      if (tx >= WILD.CANYON[0] - 1 && tx <= WILD.CANYON[1]) continue;
      const y = World.surfaceAt(tx) * TS - 16 - Math.abs(Math.sin(t * 4 + i)) * 18;
      if (!seen(x, y)) continue;
      c.save(); c.translate(x, y); c.rotate(t * 5); c.strokeStyle = '#a07a45'; c.lineWidth = 2;
      for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(0, 0, 8 + k * 2, k, k + 3.5); c.stroke(); }
      c.restore();
    }
    if (this.snowy()) {
      c.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 70; i++) {
        const x = cam.x + ((i * 97.3 + Math.sin(t + i) * 30 + t * 20) % vw + vw) % vw, y = cam.y + ((i * 53.1 + t * (40 + (i % 4) * 15)) % vh);
        c.beginPath(); c.arc(x, y, 2 + (i % 3), 0, TAU); c.fill();
      }
    }
  },
};
