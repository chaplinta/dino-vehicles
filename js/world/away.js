// Trips away from home (the Moon, the Pilbara). Earth's world, vehicles, dinos and pickups
// are put aside while away and swapped back on the way home. Nothing is saved while away.
const Away = {
  earth: null,

  // Swap in a fresh world made by gen(world, seed).
  go(place, gen, o = {}) {
    const cam = Game.cam;
    if (!this.earth) {
      this.earth = {
        t: World.t, bg: World.bg, meta: World.meta, surf: World.surf, genSurf: World.genSurf, props: World.props,
        diff: World.diff, seed: World.seed, vehicles: Vehicles.list, npcs: NPCs.list, fish: Fish.list,
        fires: Fire.cells, pickups: Pickups.list, cam: { x: cam.x, y: cam.y },
      };
    }
    const N = WORLD_W * WORLD_H;
    World.t = new Uint8Array(N); World.bg = new Uint8Array(N); World.meta = new Uint8Array(N);
    World.surf = new Int16Array(WORLD_W);
    World.diff = new Map();
    World.gravity = o.gravity || 1;
    World.limitW = o.limitW || WORLD_W;
    Game.away = place;
    gen(World, this.earth.seed);
    Render.clear();
    Water.drops = []; Falling.list = []; Fx.list = [];
    Fish.list = []; Fire.cells = new Map();
    Vehicles.list = []; NPCs.list = [];
    Pickups.generate(this.earth.seed + 1);
  },

  // Back to Earth as it was left.
  home() {
    const e = this.earth;
    if (!e) return;
    World.t = e.t; World.bg = e.bg; World.meta = e.meta; World.surf = e.surf; World.genSurf = e.genSurf;
    World.props = e.props; World.diff = e.diff; World.seed = e.seed;
    World.gravity = 1;
    World.limitW = WORLD_W;
    Vehicles.list = e.vehicles; NPCs.list = e.npcs; Fish.list = e.fish; Fire.cells = e.fires; Pickups.list = e.pickups;
    Water.drops = []; Falling.list = []; Fx.list = [];
    this.earth = null;
    Game.away = null;
    Render.clear();
  },

  // Start a new world from anywhere: drop the trip quietly first.
  abandon() {
    if (Game.onMoon) Moon.leave(null, true);
    else if (Game.away) this.home();
  },
};
