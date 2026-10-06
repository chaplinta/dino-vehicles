// Light world simulation near the camera: falling sand, flowing water, growing crops.
const Sim = {
  acc: 0, tick: 0, cropAcc: 0,
  stamp: new Uint32Array(WORLD_W * WORLD_H),

  update(dt, camX, camY) {
    this.acc += dt;
    if (this.acc < 0.07) return;
    this.acc = 0;
    this.tick++;
    const x0 = clamp(Math.floor(camX / TS) - 30, 1, WORLD_W - 2);
    const x1 = clamp(Math.floor((camX + Game.viewW) / TS) + 30, 1, WORLD_W - 2);
    const y0 = clamp(Math.floor(camY / TS) - 20, 0, WORLD_H - 2);
    const y1 = clamp(Math.floor((camY + Game.viewH) / TS) + 20, 0, WORLD_H - 2);
    const ltr = this.tick % 2 === 0;
    for (let y = y1; y >= y0; y--) {
      for (let k = x0; k <= x1; k++) {
        const x = ltr ? k : x1 - (k - x0);
        const i = y * WORLD_W + x;
        if (this.stamp[i] === this.tick) continue;
        const id = World.t[i];
        if (id === T.SAND) this.fallSand(x, y);
        else if (id === T.WATER) this.flowWater(x, y);
        else if (id === T.CROP) {
          const st = World.meta[i];
          if (!TILES[World.get(x, y + 1)].solid) World.set(x, y, T.AIR);
          else if (st < 3 && Math.random() < 0.004) World.setMeta(x, y, st + 1);
        }
      }
    }
  },
  move(x, y, nx, ny, id, record) {
    const other = World.get(nx, ny);
    World.set(nx, ny, id, record);
    World.set(x, y, other, record);
    this.stamp[ny * WORLD_W + nx] = this.tick;
  },
  fallSand(x, y) {
    const below = World.get(x, y + 1);
    if (below === T.AIR || below === T.WATER) { this.move(x, y, x, y + 1, T.SAND, true); return; }
    const dir = Math.random() < 0.5 ? -1 : 1;
    for (const dx of [dir, -dir]) {
      const side = World.get(x + dx, y), diag = World.get(x + dx, y + 1);
      if ((side === T.AIR || side === T.WATER) && (diag === T.AIR || diag === T.WATER)) {
        this.move(x, y, x + dx, y + 1, T.SAND, true); return;
      }
    }
  },
  flowWater(x, y) {
    if (World.get(x, y + 1) === T.AIR) { this.move(x, y, x, y + 1, T.WATER, false); return; }
    const dir = Math.random() < 0.5 ? -1 : 1;
    // Flow downhill diagonally.
    for (const dx of [dir, -dir]) {
      if (World.get(x + dx, y) === T.AIR && World.get(x + dx, y + 1) === T.AIR) {
        this.move(x, y, x + dx, y + 1, T.WATER, false); return;
      }
    }
    // Spread sideways only under pressure (water above), so lone drops settle.
    if (World.get(x, y - 1) === T.WATER) {
      for (const dx of [dir, -dir]) {
        if (World.get(x + dx, y) === T.AIR) { this.move(x, y, x + dx, y, T.WATER, false); return; }
      }
    }
  },
};
