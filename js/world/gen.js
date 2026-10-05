// World generator. Biomes left to right: farm, town, building site, beach and sea, mountains, launch pad.
const SURF = 40;                  // normal ground row
const SEA_LEVEL = SURF + 1;       // first water row
const BIOMES = [
  { key: 'farm', x0: 0, x1: 100 },
  { key: 'town', x0: 100, x1: 215 },
  { key: 'site', x0: 215, x1: 300 },
  { key: 'beach', x0: 300, x1: 420 },
  { key: 'mount', x0: 420, x1: 560 },
  { key: 'pad', x0: 560, x1: WORLD_W },
];
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
      if (id === T.DIRT && rng() < 0.012) id = rng() < 0.55 ? T.BONE : T.EGG;
      else if (id === T.STONE && y > h + 6 && rng() < 0.014) id = rng() < 0.5 ? T.GEM : T.FOSSIL;
      world.t[y * Wt + x] = id;
    }
  }

  const put = (x, y, id) => { if (x >= 0 && x < Wt && y >= 0 && y < Ht) world.t[y * Wt + x] = id; };
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
  for (let x = 6; x < 96; x += 9 + Math.floor(rng() * 8)) if (x < 14 || x > 70) tree(x);
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

  // Town: road, houses, fire station, hospital, police.
  for (let x = 100; x < 215; x++) { surf[x] = SURF; put(x, SURF, T.ROAD); for (let y = SURF - 8; y < SURF; y++) put(x, y, T.AIR); }
  building(world, 106, SURF, 8, 5, { wall: T.BRICK, roof: T.ROOF });
  building(world, 120, SURF, 12, 6, { wall: T.BRICK, roof: T.ROOF, sign: 'fire', door: 4 });
  building(world, 138, SURF, 7, 7, { wall: T.WOOD, roof: T.ROOF });
  building(world, 150, SURF, 12, 7, { wall: T.CONCRETE, roof: T.CONCRETE, sign: 'hospital', door: 3 });
  building(world, 168, SURF, 8, 5, { wall: T.BRICK, roof: T.ROOF });
  building(world, 182, SURF, 10, 6, { wall: T.CONCRETE, roof: T.ROOF, sign: 'police', door: 3 });
  building(world, 198, SURF, 8, 9, { wall: T.BRICK, roof: T.ROOF });

  // Building site: concrete pad, dirt piles, half-built wooden frame.
  for (let x = 215; x < 300; x++) { surf[x] = SURF; }
  for (let x = 218; x < 232; x++) put(x, SURF, T.CONCRETE);
  const pile = (cx, r) => { for (let x = cx - r; x <= cx + r; x++) { const hh = r - Math.abs(x - cx); for (let i = 1; i <= hh; i++) put(x, SURF - i, T.DIRT); } };
  pile(240, 3); pile(252, 2);
  for (let x = 262; x < 272; x++) put(x, SURF, T.CONCRETE);
  for (let y = SURF - 5; y < SURF; y++) { put(262, y, T.WOOD); put(271, y, T.WOOD); }
  for (let x = 262; x < 272; x++) put(x, SURF - 5, T.WOOD);
  for (let x = 278; x < 296; x++) for (let y = SURF; y < SURF + 4; y++) if (x > 280 && x < 294) put(x, y, y === SURF + 3 ? T.DIRT : T.AIR);
  props.push({ type: 'sign', x: 216, y: SURF, kind: 'site' });

  // Mountains: trees on lower slopes, a few flowers.
  for (let x = 424; x < 556; x += 6 + Math.floor(rng() * 7)) if (surf[x] > SURF - 9) tree(x);
  flowers(420, 556, 0.06);
  flowers(300, 330, 0.0);

  // Launch pad.
  for (let x = 560; x < WORLD_W; x++) { surf[x] = SURF; for (let y = SURF - 12; y < SURF; y++) put(x, y, T.AIR); put(x, SURF, x >= 566 && x < 590 ? T.CONCRETE : T.GRASS); }
  props.push({ type: 'tower', x: 572, y: SURF });

  // Edges: tall walls so nobody walks off the world.
  for (let y = 0; y < Ht; y++) { put(0, y, T.BEDROCK); put(Wt - 1, y, T.BEDROCK); }

  // Train stations along the background track.
  props.push({ type: 'station', x: 30, name: 'farm' });
  props.push({ type: 'station', x: 140, name: 'town' });
  props.push({ type: 'station', x: 256, name: 'site' });
  props.push({ type: 'station', x: 470, name: 'mount' });
  props.push({ type: 'station', x: 578, name: 'pad' });

  // Record generated surface for underground backdrop.
  world.genSurf = Int16Array.from(surf);

  function building(world, x0, base, w, h, o) {
    const top = base - h;
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
    const door = o.door || 2;
    for (let y = base - door; y < base; y++) { put(x0, y, T.AIR); put(x0 + w - 1, y, T.AIR); }
    if (o.windows !== false) for (let x = x0 + 2; x < x0 + w - 2; x += 3) putBg(x, top + 2, T.GLASS);
    if (o.sign) props.push({ type: 'sign', x: x0 + w / 2, y: top - 1, kind: o.sign });
  }
}
