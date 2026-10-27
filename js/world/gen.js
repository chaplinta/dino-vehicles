// World generator. Biomes left to right: farm, town, building site, beach and sea, mountains, speedway, launch pad.
const SURF = 40;                  // normal ground row
const SEA_LEVEL = SURF + 1;       // first water row
const BIOMES = [
  { key: 'farm', x0: 0, x1: 100 },
  { key: 'town', x0: 100, x1: 215 },
  { key: 'site', x0: 215, x1: 300 },
  { key: 'beach', x0: 300, x1: 420 },
  { key: 'mount', x0: 420, x1: 560 },
  { key: 'speed', x0: 560, x1: 720 },
  { key: 'pad', x0: 720, x1: WORLD_W },
];
// Speedway: drag strip with a start gantry and finish line, pit garage, then a dirt bike park.
const SPEEDWAY = { X0: 560, START: 572, FINISH: 668, STAND: [598, 628], GARAGE: 640, BIKES: [680, 718] };
const PAD_X0 = 720, ROCKET_X = 738;   // launch pad, right at the far end
const CHESS_X = 490.5;                // chess table on a mountain lookout
const SEA_X0 = 330, SEA_X1 = 395;
function biomeAt(tx) {
  for (const b of BIOMES) if (tx >= b.x0 && tx < b.x1) return b.key;
  return 'pad';
}

function generateWorld(world, seed) {
  const rng = mulberry32(seed);
  const n1 = makeNoise1D(seed + 1), n2 = makeNoise1D(seed + 2);
  const Wt = world.w, Ht = world.h;
  const surf = world.surf;
  const props = world.props = [];

  // Height map.
  for (let x = 0; x < Wt; x++) {
    let h = SURF;
    const b = biomeAt(x);
    if (b === 'farm') h = SURF + Math.round(n1(x * 0.08) * 1.4);
    else if (b === 'beach') {
      if (x < SEA_X0) h = SURF + Math.round((x - 300) / (SEA_X0 - 300) * 3);
      else if (x < SEA_X1) h = SURF + 9 + Math.round(n2(x * 0.15) * 1.5);
      else h = SURF + 3 - Math.round((x - SEA_X1) / (420 - SEA_X1) * 3);
      if (x >= SEA_X0 && x < SEA_X0 + 6) h = Math.min(h, SURF + 3 + (x - SEA_X0) * 1.2 | 0);
      if (x < SEA_X1 && x >= SEA_X1 - 6) h = Math.min(h, SURF + 3 + (SEA_X1 - x) * 1.2 | 0);
    } else if (b === 'mount') {
      const u = (x - 420) / 140;                       // 0..1 across the range
      const env = Math.sin(u * Math.PI);               // rise and fall
      const peaks = 0.65 + 0.35 * Math.abs(Math.sin(u * Math.PI * 2.2));
      h = SURF - Math.round(env * peaks * 16 + n1(x * 0.12) * 1.5 * env);
    }
    surf[x] = clamp(h, 6, Ht - 6);
  }
  // Smooth to max one-tile steps so dinos and wheels can climb.
  for (let pass = 0; pass < 4; pass++) {
    for (let x = 1; x < Wt; x++) {
      if (surf[x] - surf[x - 1] > 1) surf[x] = surf[x - 1] + 1;
      if (surf[x - 1] - surf[x] > 1) surf[x] = surf[x - 1] - 1;
    }
  }
  // Re-carve the sea after smoothing.
  for (let x = SEA_X0 + 4; x < SEA_X1 - 4; x++) surf[x] = Math.max(surf[x], SURF + 7);

  // Fill columns.
  for (let x = 0; x < Wt; x++) {
    const h = surf[x], b = biomeAt(x);
    const sandy = b === 'beach';
    const rocky = b === 'mount' && h < SURF - 9;
    const dirtDepth = 4 + Math.floor(rng() * 3);
    for (let y = 0; y < Ht; y++) {
      let id = T.AIR;
      if (y >= Ht - 2) id = T.BEDROCK;
      else if (y === h) id = sandy ? T.SAND : rocky ? T.STONE : T.GRASS;
      else if (y > h && y <= h + dirtDepth) id = sandy ? T.SAND : rocky ? T.STONE : T.DIRT;
      else if (y > h) id = T.STONE;
      else if (b === 'beach' && x >= SEA_X0 - 2 && x < SEA_X1 + 2 && y >= SEA_LEVEL) id = T.WATER;
      if (id === T.DIRT && rng() < 0.025) id = rng() < 0.55 ? T.BONE : T.EGG;
      else if (id === T.STONE && y > h + 5 && rng() < 0.02) id = rng() < 0.5 ? T.GEM : T.FOSSIL;
      world.t[y * Wt + x] = id;
    }
  }

  const put = (x, y, id) => { if (x >= 0 && x < Wt && y >= 0 && y < Ht) world.t[y * Wt + x] = id; };
  // Deep down there's hot rock. Not under the farm, where the golden egg is buried.
  for (let x = 1; x < Wt - 1; x++) if (x < 44 || x > 60) for (let y = Ht - 8; y < Ht - 2; y++) put(x, y, T.MAGMA);
  const putBg = (x, y, id) => { if (x >= 0 && x < Wt && y >= 0 && y < Ht) world.bg[y * Wt + x] = id; };
  const get = (x, y) => world.t[y * Wt + x];

  function tree(x) {
    const h = surf[x];
    if (get(x, h) !== T.GRASS) return;
    const th = 3 + Math.floor(rng() * 2);
    for (let i = 1; i <= th; i++) put(x, h - i, T.TRUNK);
    const top = h - th;
    for (let dx = -2; dx <= 2; dx++) for (let dy = -3; dy <= 0; dy++) {
      if (Math.abs(dx) + Math.abs(dy + 1.5) > 3.2) continue;
      if (get(x + dx, top + dy) === T.AIR) put(x + dx, top + dy, T.LEAVES);
    }
  }
  function flowers(x0, x1, p) {
    for (let x = x0; x < x1; x++) {
      const h = surf[x];
      if (get(x, h) === T.GRASS && get(x, h - 1) === T.AIR && rng() < p) put(x, h - 1, T.FLOWER);
    }
  }

  // Farm: barn, fields, trees.
  for (let x = 6; x < 14; x += 9 + Math.floor(rng() * 8)) tree(x);
  const fields = [[18, 34], [42, 58]];
  for (const [a, b] of fields) {
    for (let x = a; x < b; x++) {
      surf[x] = SURF; for (let y = SURF; y < SURF + 4; y++) put(x, y, T.DIRT);
      for (let y = SURF - 4; y < SURF; y++) put(x, y, T.AIR);
      put(x, SURF - 1, T.CROP); world.meta[(SURF - 1) * Wt + x] = Math.floor(rng() * 4);
    }
    props.push({ type: 'field', x0: a, x1: b });
  }
  building(world, 62, SURF, 9, 6, { wall: T.WOOD, roof: T.ROOF, sign: 'barn', windows: false });
  flowers(4, 96, 0.12);

  // Airport: a concrete apron and a terminal. The FIFO jet flies from here to the Pilbara.
  for (let x = 72; x < 92; x++) {
    surf[x] = SURF;
    for (let y = SURF - 10; y < SURF; y++) put(x, y, T.AIR);
    put(x, SURF, T.CONCRETE); put(x, SURF + 1, T.DIRT);
  }
  building(world, 92, SURF, 7, 5, { wall: T.CONCRETE, roof: T.ROOF, sign: 'airport' });
  props.push({ type: 'windsock', x: 73, y: SURF });

  // Town: road, houses, fire station, hospital, police.
  for (let x = 100; x < 215; x++) { surf[x] = SURF; put(x, SURF, T.ROAD); for (let y = SURF - 8; y < SURF; y++) put(x, y, T.AIR); }
  building(world, 106, SURF, 8, 5, { wall: T.BRICK, roof: T.ROOF });
  building(world, 120, SURF, 12, 6, { wall: T.BRICK, roof: T.ROOF, sign: 'fire', door: 4 });
  building(world, 138, SURF, 7, 7, { wall: T.WOOD, roof: T.ROOF });
  building(world, 150, SURF, 12, 7, { wall: T.CONCRETE, roof: T.CONCRETE, sign: 'hospital', door: 3 });
  building(world, 168, SURF, 8, 5, { wall: T.BRICK, roof: T.ROOF });
  building(world, 182, SURF, 10, 6, { wall: T.CONCRETE, roof: T.ROOF, sign: 'police', door: 3 });
  building(world, 198, SURF, 8, 9, { wall: T.BRICK, roof: T.ROOF });

  for (const bx of [113, 134, 147, 166, 179, 196, 211]) props.push({ type: 'bin', x: bx, y: SURF, full: true, refill: 0 });

  // Building site: concrete pad, dirt piles, half-built wooden frame.
  for (let x = 215; x < 300; x++) { surf[x] = SURF; }
  for (let x = 218; x < 232; x++) put(x, SURF, T.CONCRETE);
  const pile = (cx, r) => { for (let x = cx - r; x <= cx + r; x++) { const hh = r - Math.abs(x - cx); for (let i = 1; i <= hh; i++) put(x, SURF - i, T.DIRT); } };
  pile(241, 3); pile(251, 2);
  for (let x = 262; x < 272; x++) put(x, SURF, T.CONCRETE);
  for (let y = SURF - 5; y < SURF; y++) { put(262, y, T.WOOD); put(271, y, T.WOOD); }
  for (let x = 278; x < 296; x++) for (let y = SURF; y < SURF + 4; y++) if (x > 280 && x < 294) put(x, y, y === SURF + 3 ? T.DIRT : T.AIR);
  props.push({ type: 'sign', x: 216, y: SURF, kind: 'site' });

  // A dino playing chess at a picnic table on a mountain lookout (flattened for it).
  {
    const cx = Math.floor(CHESS_X), h = surf[cx];
    for (let x = cx - 4; x <= cx + 4; x++) {
      for (let y = 0; y < h; y++) if (get(x, y) !== T.BEDROCK) put(x, y, T.AIR);
      for (let y = h; y <= Math.max(h, surf[x]) + 1; y++) put(x, y, y === h ? T.GRASS : T.STONE);
      surf[x] = h;
    }
    props.push({ type: 'chess', x: CHESS_X, y: h });
  }

  // Secrets: a golden egg at the very bottom under the farm, Nessie asleep on the sea floor.
  put(52, Ht - 3, T.GOLDEGG);
  props.push({ type: 'nessie', x: SEA_X1 - 12, y: surf[SEA_X1 - 12] });

  // Sunken treasure on the sea floor.
  for (const cx of [345, 362, 384]) props.push({ type: 'chest', x: cx + 0.5, y: surf[cx], open: false });
  // Floating barrels and a bell buoy to fire the pirate ship's cannon at.
  for (const bx of [342, 356, 376]) props.push({ type: 'seabarrel', x: bx + 0.5, y: SEA_LEVEL });
  props.push({ type: 'buoy', x: 366.5, y: SEA_LEVEL });

  // Mountains: trees on lower slopes, a few flowers.
  for (let x = 424; x < 556; x += 6 + Math.floor(rng() * 7)) if (surf[x] > SURF - 9) tree(x);
  flowers(420, 556, 0.06);
  flowers(300, 330, 0.0);

  // Speedway: flat ground, an asphalt drag strip, grandstand, pit garage and a bike park with jumps.
  for (let x = SPEEDWAY.X0; x < PAD_X0; x++) { surf[x] = SURF; for (let y = SURF - 12; y < SURF; y++) put(x, y, T.AIR); put(x, SURF, x < SPEEDWAY.BIKES[0] - 2 ? T.ROAD : T.GRASS); }
  props.push({ type: 'gantry', x: SPEEDWAY.START, y: SURF });
  props.push({ type: 'finish', x: SPEEDWAY.FINISH, y: SURF });
  props.push({ type: 'stand', x: (SPEEDWAY.STAND[0] + SPEEDWAY.STAND[1]) / 2, w: SPEEDWAY.STAND[1] - SPEEDWAY.STAND[0], y: SURF });
  building(world, SPEEDWAY.GARAGE, SURF, 12, 5, { wall: T.CONCRETE, roof: T.CONCRETE, sign: 'garage', door: 4 });
  for (let x = SPEEDWAY.GARAGE; x < SPEEDWAY.GARAGE + 12; x++) put(x, SURF, T.ROAD);
  for (let x = SPEEDWAY.BIKES[0]; x < SPEEDWAY.BIKES[1]; x++) put(x, SURF, T.DIRT);
  props.push({ type: 'ramp', x: 684, w: 4, h: 2, dir: 1 });   // jump...
  props.push({ type: 'ramp', x: 693, w: 5, h: 2, dir: -1 });  // ...land on the far side
  props.push({ type: 'ramp', x: 702, w: 4, h: 3, dir: 1 });   // the big kicker
  // A little skate ramp at the end of town.
  props.push({ type: 'ramp', x: 208, w: 3, h: 1, dir: 1 });

  // Launch pad.
  for (let x = PAD_X0; x < WORLD_W; x++) { surf[x] = SURF; for (let y = SURF - 12; y < SURF; y++) put(x, y, T.AIR); put(x, SURF, x >= PAD_X0 + 6 && x < PAD_X0 + 30 ? T.CONCRETE : T.GRASS); }
  props.push({ type: 'tower', x: PAD_X0 + 28, y: SURF });

  // Edges: tall walls so nobody walks off the world.
  for (let y = 0; y < Ht; y++) { put(0, y, T.BEDROCK); put(Wt - 1, y, T.BEDROCK); }

  // Train stations along the background track.
  props.push({ type: 'station', x: 30, name: 'farm' });
  props.push({ type: 'station', x: 140, name: 'town' });
  props.push({ type: 'station', x: 256, name: 'site' });
  props.push({ type: 'station', x: 470, name: 'mount' });
  props.push({ type: 'station', x: 620, name: 'speedway' });
  props.push({ type: 'station', x: PAD_X0 + 4, name: 'pad' });

  // Record generated surface for underground backdrop.
  world.genSurf = Int16Array.from(surf);

  // Reading signs: three and four word labels to read along with.
  for (const [x, text] of [[8, 'FARM'], [26, 'CORN'], [58, 'BARN'], [84, 'FLY'], [109, 'ROAD'], [117, 'FIRE'], [145, 'SICK'], [180, 'COP'],
    [224, 'DIG'], [306, 'SAND'], [325, 'FISH'], [399, 'LOOK'], [430, 'HILL'], [Math.floor(CHESS_X) - 6, 'PLAY'], [566, 'RACE'], [664, 'ZOOM'], [684, 'BIKE'],
    [PAD_X0 + 2, 'SKY'], [WORLD_W - 6, 'END']]) addLabel(world, x, text);

  function building(world, x0, base, w, h, o) {
    const top = base - h;
    // Level the ground for a few tiles either side, so vehicles can drive in and out of the doors.
    for (const x of [-6, -5, -4, -3, -2, -1].map(d => x0 + d).concat([0, 1, 2, 3, 4, 5].map(d => x0 + w + d))) {
      if (x < 1 || x >= Wt - 1) continue;
      for (let y = base - 8; y < base; y++) if (get(x, y) !== T.ROAD) put(x, y, T.AIR);
      for (let y = base; y < base + 3; y++) if (get(x, y) === T.AIR || get(x, y) === T.WATER) put(x, y, y === base ? T.GRASS : T.DIRT);
      surf[x] = base;
    }
    for (let x = x0; x < x0 + w; x++) {
      surf[x] = base;
      for (let y = top - 3; y < base; y++) put(x, y, T.AIR);
      if (get(x, base) === T.AIR || get(x, base) === T.GRASS) put(x, base, T.CONCRETE);
      for (let y = top; y < base; y++) putBg(x, y, o.wall);
    }
    for (let y = top; y < base; y++) { put(x0, y, o.wall); put(x0 + w - 1, y, o.wall); }
    for (let x = x0; x < x0 + w; x++) put(x, top, o.roof);
    for (let x = x0 + 1; x < x0 + w - 1; x++) put(x, top - 1, o.roof);
    // Upper floor.
    if (h >= 7) for (let x = x0 + 1; x < x0 + w - 1; x++) if (x > x0 + 2) put(x, top + 3, T.WOOD);
    // Doors: 2-tile gaps in both side walls.
    const door = Math.max(3, o.door || 3);   // tall enough for vehicles to drive through
    for (let y = base - door; y < base; y++) { put(x0, y, T.AIR); put(x0 + w - 1, y, T.AIR); }
    if (o.windows !== false) for (let x = x0 + 2; x < x0 + w - 2; x += 3) putBg(x, top + 2, T.GLASS);
    if (o.sign) props.push({ type: 'sign', x: x0 + w / 2, y: top - 1, kind: o.sign });
  }
}
