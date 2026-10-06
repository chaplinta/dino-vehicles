// The tile world: storage, queries, edits and a record of player changes for saving.
const World = {
  w: WORLD_W, h: WORLD_H,
  t: new Uint8Array(WORLD_W * WORLD_H),    // foreground tiles
  bg: new Uint8Array(WORLD_W * WORLD_H),   // back walls (buildings)
  meta: new Uint8Array(WORLD_W * WORLD_H), // per-tile state: crop growth, fire
  surf: new Int16Array(WORLD_W),
  genSurf: null,
  props: [],
  seed: 1,
  diff: new Map(),
  onChange: null,

  generate(seed) {
    this.seed = seed;
    this.t.fill(0); this.bg.fill(0); this.meta.fill(0);
    this.diff.clear();
    generateWorld(this, seed);
  },
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; },
  get(x, y) {
    if (x < 0 || x >= this.w || y >= this.h) return T.BEDROCK;
    if (y < 0) return T.AIR;
    return this.t[y * this.w + x];
  },
  getBg(x, y) { return this.inside(x, y) ? this.bg[y * this.w + x] : 0; },
  def(x, y) { return TILES[this.get(x, y)]; },
  solid(x, y) { return TILES[this.get(x, y)].solid; },
  solidPx(px, py) { return this.solid(Math.floor(px / TS), Math.floor(py / TS)); },
  waterPx(px, py) { return this.get(Math.floor(px / TS), Math.floor(py / TS)) === T.WATER; },

  // record=false for simulation moves (water) that should not bloat the save.
  set(x, y, id, record = true) {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    if (this.t[i] === id) return;
    this.t[i] = id;
    this.meta[i] = 0;
    if (record) this.diff.set(i, id);
    Render.dirtyTile(x, y);
    if (this.onChange) this.onChange(x, y, id);
  },
  setMeta(x, y, v) {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    if (this.meta[i] === v) return;
    this.meta[i] = v;
    Render.dirtyTile(x, y);
  },
  getMeta(x, y) { return this.inside(x, y) ? this.meta[y * this.w + x] : 0; },

  // Top-most solid tile row at or below row y0 in column x.
  groundBelow(x, y0) {
    for (let y = Math.max(0, y0); y < this.h; y++) if (this.solid(x, y)) return y;
    return this.h;
  },
  surfaceAt(x) { return this.groundBelow(x, 0); },

  // Remove a tile like a dig: returns the tile id removed (or -1).
  dig(x, y) {
    const id = this.get(x, y);
    const d = TILES[id];
    if (!d.dig || id === T.AIR) return -1;
    this.set(x, y, T.AIR);
    return id;
  },

  serializeDiff() {
    const out = [];
    for (const [i, id] of this.diff) out.push(i, id);
    return out;
  },
  applyDiff(arr) {
    for (let k = 0; k + 1 < arr.length; k += 2) {
      const i = arr[k], id = arr[k + 1];
      if (i >= 0 && i < this.t.length && TILES[id]) { this.t[i] = id; this.diff.set(i, id); }
      else if (i < 0 && -i - 1 < this.bg.length) { this.bg[-i - 1] = 0; this.diff.set(i, 0); }   // knocked-down back wall
    }
  },
  // Knock out a building's back wall (saved as a negative index in the diff).
  clearBg(x, y) {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    if (!this.bg[i]) return;
    this.bg[i] = 0;
    this.diff.set(-i - 1, 0);
    Render.dirtyTile(x, y);
  },
};
