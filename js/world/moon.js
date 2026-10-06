// The Moon: a small grey world the rocket lands on after its trip to space.
// While there, the Earth world, vehicles, dinos and pickups are put aside and swapped back on leaving.
const MOON_W = 150;            // open columns; the rest is a bedrock wall
const MOON_PAD = [18, 30];     // flat landing pad

function generateMoon(world, seed) {
  const rng = mulberry32(seed + 99);
  const n = makeNoise1D(seed + 7);
  const Wt = world.w, Ht = world.h, surf = world.surf;
  world.props = [];
  const craters = [];
  for (let k = 0; k < 7; k++) craters.push({ x: 40 + k * 15 + Math.floor(rng() * 8), r: 3 + Math.floor(rng() * 4) });
  for (let x = 0; x < Wt; x++) {
    let h = SURF + Math.round(n(x * 0.07) * 3);
    for (const c of craters) {
      const d = Math.abs(x - c.x);
      if (d <= c.r) h += Math.round(Math.sqrt(c.r * c.r - d * d) * 0.6);   // bowl
      else if (d <= c.r + 1) h -= 1;                                     // rim
    }
    if (x >= MOON_PAD[0] - 2 && x <= MOON_PAD[1] + 2) h = SURF;
    surf[x] = clamp(h, 10, Ht - 8);
  }
  for (let pass = 0; pass < 3; pass++) for (let x = 1; x < Wt; x++) {
    if (surf[x] - surf[x - 1] > 2) surf[x] = surf[x - 1] + 2;
    if (surf[x - 1] - surf[x] > 2) surf[x] = surf[x - 1] - 2;
  }
  for (let x = 0; x < Wt; x++) {
    const h = surf[x], depth = 3 + Math.floor(rng() * 3);
    for (let y = 0; y < Ht; y++) {
      let id = T.AIR;
      if (x === 0 || x >= MOON_W || y >= Ht - 2) id = T.BEDROCK;
      else if (y >= h && y <= h + depth) id = T.MOONDUST;
      else if (y > h) id = T.MOONROCK;
      if (id === T.MOONDUST && y > h && rng() < 0.03) id = T.CHEESE;
      else if (id === T.MOONROCK && rng() < 0.03) id = T.CRYSTAL;
      world.t[y * Wt + x] = id;
    }
  }
  // Deep down, the Moon's secret cheese core.
  for (let y = 58; y < 70; y++) for (let x = 66; x < 86; x++) {
    if (((x - 76) / 10) ** 2 + ((y - 64) / 6) ** 2 <= 1) world.t[y * Wt + x] = T.CHEESE;
  }
  world.genSurf = Int16Array.from(surf);
  world.props.push({ type: 'saucer', x: 110, y: surf[110] });
}

const Moon = {
  earth: null,
  firstFlag: false,

  enter(rocket) {
    const cam = Game.cam;
    this.earth = {
      t: World.t, bg: World.bg, meta: World.meta, surf: World.surf, genSurf: World.genSurf, props: World.props,
      diff: World.diff, seed: World.seed, vehicles: Vehicles.list, npcs: NPCs.list, fish: Fish.list,
      fires: Fire.cells, pickups: Pickups.list, cam: { x: cam.x, y: cam.y },
    };
    const N = WORLD_W * WORLD_H;
    World.t = new Uint8Array(N); World.bg = new Uint8Array(N); World.meta = new Uint8Array(N);
    World.surf = new Int16Array(WORLD_W);
    World.diff = new Map();
    generateMoon(World, World.seed);
    World.gravity = 0.3;
    World.limitW = MOON_W;
    Game.onMoon = true;
    Render.clear();
    Water.drops = []; Falling.list = []; Fx.list = [];
    Fish.list = []; Fire.cells = new Map();
    Pickups.generate(World.seed + 1);
    // Rocket floats down onto the pad.
    rocket.body.x = (MOON_PAD[0] + MOON_PAD[1]) / 2 * TS;
    rocket.body.y = (SURF - 30) * TS;
    rocket.body.vx = 0; rocket.body.vy = 100;
    rocket.s.state = 'chute';
    Vehicles.list = [rocket];
    Vehicles.spawn('moonbuggy', 38 * TS, World.surfaceAt(38) * TS - 0.01, 1);
    // Friendly Moon dinos.
    NPCs.list = [];
    for (const tx of [52, 80, 116]) {
      NPCs.add({ x: tx * TS + 16, y: World.surfaceAt(tx) * TS - 0.01, type: 'alien', baby: tx === 80 });
    }
    Game.overlay = null;
    Game.snapCamera();
    Game.configurePlay();
  },

  // Rocket landed on the Moon.
  landed(rocket) {
    Sound.land();
    if (!Game.moonVisits) {
      Game.addStars(3);
      Game.popupStar(rocket.body.x, rocket.body.y - 160);
      Hud.celebrate('The Moon!');
      Sound.say('First dino on the Moon! Hop out and bounce around!');
    } else {
      Hud.celebrate('The Moon!');
      Sound.say('We made it to the Moon!');
    }
    Game.moonVisits = (Game.moonVisits || 0) + 1;
    const fx = MOON_PAD[0] + 2;
    if (!World.props.some(p => p.type === 'flag')) World.props.push({ type: 'flag', x: fx, y: World.surfaceAt(fx) });
  },

  leave(rocket, quiet) {
    const e = this.earth;
    if (!e) return;
    World.t = e.t; World.bg = e.bg; World.meta = e.meta; World.surf = e.surf; World.genSurf = e.genSurf;
    World.props = e.props; World.diff = e.diff; World.seed = e.seed;
    World.gravity = 1;
    World.limitW = WORLD_W;
    Vehicles.list = e.vehicles; NPCs.list = e.npcs; Fish.list = e.fish; Fire.cells = e.fires; Pickups.list = e.pickups;
    Water.drops = []; Falling.list = []; Fx.list = [];
    this.earth = null;
    Game.onMoon = false;
    Render.clear();
    if (rocket) {
      if (!Vehicles.list.includes(rocket)) Vehicles.list.push(rocket);
      rocket.body.x = 578 * TS + rand(-200, 200);
      rocket.body.y = (SURF - 30) * TS;
      rocket.body.vx = 0; rocket.body.vy = 100;
      rocket.s.state = 'chute';
    }
    Game.overlay = null;
    Game.snapCamera();
    if (!quiet) { Game.configurePlay(); Save.write(); }
  },
};
