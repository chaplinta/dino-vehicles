// Fires (never destroy anything, just need putting out) and water drops from hoses and planes.
const Fire = {
  cells: new Map(),   // tile index -> { x, y, hp, t }
  spreadT: 0,
  burnable(x, y) {
    const id = World.get(x, y);
    if (id === T.WATER) return false;
    if (id === T.AIR) return World.getBg(x, y) !== 0;
    return [T.WOOD, T.ROOF, T.LEAVES, T.CROP, T.TRUNK].includes(id);
  },
  start(x, y) {
    if (!World.inside(x, y) || !this.burnable(x, y)) return false;
    const i = y * WORLD_W + x;
    if (!this.cells.has(i)) this.cells.set(i, { x, y, hp: 0.6, t: rand(0, 5), max: 1 });
    return true;
  },
  count() { return this.cells.size; },
  near(x0, x1) { let n = 0; for (const f of this.cells.values()) if (f.x >= x0 && f.x <= x1) n++; return n; },
  douse(px, py, amount) {
    let f = null, i = -1;
    for (const [k, c] of this.cells) {
      if (Math.abs(c.x * TS + TS / 2 - px) < 40 && Math.abs(c.y * TS + TS / 2 - py) < 40) { f = c; i = k; break; }
    }
    if (!f) return false;
    f.hp -= amount;
    if (f.hp <= 0) {
      this.cells.delete(i);
      Fx.burst(f.x * TS + 16, f.y * TS + 16, 8, { speed: 60, up: 60, life: 1.2, r: 12, color: ['#e9ecef', '#dee2e6'], shape: 'grow' });
      Sound.tone(900, 0.2, 'sine', 0.06, 300);
      if (typeof Jobs !== 'undefined') Jobs.onFireOut(f.x, f.y);
    }
    return true;
  },
  update(dt) {
    for (const f of this.cells.values()) {
      f.t += dt;
      f.hp = Math.min(f.max, f.hp + dt * 0.02);
      if (!this.burnable(f.x, f.y)) f.hp -= dt;   // its fuel was dug away
    }
    for (const [i, f] of this.cells) if (f.hp <= 0) this.cells.delete(i);
    // Slow spread, capped so it never gets scary.
    this.spreadT += dt;
    if (this.spreadT > 7 && this.cells.size > 0 && this.cells.size < 14) {
      this.spreadT = 0;
      const arr = [...this.cells.values()];
      const f = pick(arr);
      const [dx, dy] = pick([[1, 0], [-1, 0], [0, -1], [0, 1]]);
      this.start(f.x + dx, f.y + dy);
    }
    Water.update(dt);
  },
  draw(c) {
    const cam = Game.cam;
    for (const f of this.cells.values()) {
      const x = f.x * TS + TS / 2, y = f.y * TS + TS;
      if (x < cam.x - 60 || x > cam.x + Game.viewW + 60 || y < cam.y - 60 || y > cam.y + Game.viewH + 60) continue;
      const s = 0.6 + f.hp * 0.6;
      const fl = Math.sin(f.t * 12) * 3;
      c.save(); c.translate(x, y); c.scale(s, s);
      c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(-20, -24, -2 + fl, -46); c.quadraticCurveTo(6, -26, 12, -32 - fl);
      c.quadraticCurveTo(22, -14, 16, 0); c.closePath(); fillStroke(c, '#ff6b35', 3);
      c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(-10, -16, 0 - fl, -28); c.quadraticCurveTo(10, -14, 9, 0); c.closePath();
      c.fillStyle = '#ffd43b'; c.fill();
      c.restore();
    }
    Water.draw(c);
  },
};

const BUILDING_TILES = new Set([T.BRICK, T.WOOD, T.GLASS, T.ROOF, T.CONCRETE]);

const Water = {
  drops: [],
  spray(x, y, vx, vy, opts = {}) {
    if (this.drops.length > 400) return;
    this.drops.push({ x, y, vx, vy, life: 2.5, crops: !!opts.crops });
  },
  update(dt) {
    const d = this.drops;
    for (let i = d.length - 1; i >= 0; i--) {
      const p = d[i];
      p.life -= dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      let dead = p.life <= 0;
      if (!dead && Fire.douse(p.x, p.y, 0.008)) dead = true;
      const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
      const id = World.get(tx, ty);
      if (!dead && id === T.CROP) {
        if (Math.random() < 0.08) { const st = World.getMeta(tx, ty); if (st < 3) World.setMeta(tx, ty, st + 1); }
        dead = true;
      }
      // Water goes through building walls (in at the windows) but stops at the ground.
      if (!dead && ((TILES[id].solid && !BUILDING_TILES.has(id)) || id === T.WATER)) dead = true;
      if (dead) {
        d.splice(i, 1);
        if (Math.random() < 0.3) Fx.add({ x: p.x, y: p.y, vx: rand(-40, 40), vy: rand(-80, -20), g: 400, life: 0.3, r: 3, color: '#a5d8ff' });
      }
    }
  },
  draw(c) {
    c.fillStyle = '#4dabf7';
    for (const p of this.drops) { c.beginPath(); c.arc(p.x, p.y, 4, 0, TAU); c.fill(); }
  },
};
