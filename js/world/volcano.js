// Deep down there's warm rock, then glowing hot rock. Dig into the hot rock and it rumbles, then lava
// wells up and fills the holes you dug like a liquid, from the bottom up. If it reaches the surface it
// erupts: KABOOM, anyone in the lava is blasted out, and it spills down the ground. Later it all cools
// back into rock and dirt.
const Volcano = {
  active: null,   // the lava flow happening now
  shake: 0,
  hotCool: 0,
  emberT: 0,

  erupt(tx, ty) {
    if (Game.away || this.active || !World.genSurf) return;
    // How much room is there? Fill the dug-out space connected to the hole; note if it reaches the open air.
    const gs = World.genSurf, seen = new Set(), q = [[tx, ty]];
    let room = 0, open = false;
    seen.add(ty * World.w + tx);
    while (q.length && room < 300) {
      const [x, y] = q.shift();
      if (y <= gs[x] - 1) { open = true; continue; }   // up out of the ground
      room++;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy, k = ny * World.w + nx;
        if (seen.has(k) || !World.inside(nx, ny) || TILES[World.get(nx, ny)].solid) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    const budget = room + (open ? 14 : 0);
    this.active = { tx, ty, t: 0, phase: 'rumble', lava: new Set(), cooled: [], budget, open, interval: clamp(7 / budget, 0.05, 0.18), acc: 0, flowAcc: 0, erupted: false };
    Sound.noise(1.6, 0.3, 'lowpass', 120); Sound.tone(50, 1.4, 'sawtooth', 0.08, 40);
    Pow.add(tx * TS + 16, ty * TS - 40, 'RUMBLE!');
  },

  // Lava goes into the lowest empty space touching the lava already there, so it fills up like a liquid.
  nextCell(e) {
    const src = [e.tx, e.ty];
    if (!TILES[World.get(src[0], src[1])].solid && World.get(src[0], src[1]) !== T.LAVA) return src;
    let best = null;
    for (const i of e.lava) {
      const x = i % World.w, y = Math.floor(i / World.w);
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!World.inside(nx, ny) || World.get(nx, ny) !== T.AIR) continue;
        if (ny < World.genSurf[nx] - 1) continue;   // no piling up into the sky
        if (!best || ny > best[1] || (ny === best[1] && Math.abs(nx - e.tx) < Math.abs(best[0] - e.tx))) best = [nx, ny];
      }
    }
    return best;
  },
  place(e, x, y) { World.set(x, y, T.LAVA); e.lava.add(y * World.w + x); },

  // Lava runs downhill: anything with empty space below drops a tile. Lava that meets water sets into rock.
  flow(e) {
    const tiles = [...e.lava].sort((a, b) => b - a);   // bottom rows first
    for (const i of tiles) {
      const x = i % World.w, y = Math.floor(i / World.w);
      if (World.get(x, y) !== T.LAVA) { e.lava.delete(i); continue; }
      if ([[0, 1], [-1, 0], [1, 0], [0, -1]].some(([dx, dy]) => World.get(x + dx, y + dy) === T.WATER)) {
        World.set(x, y, T.STONE); e.lava.delete(i);
        Fx.add({ x: x * TS + 16, y: y * TS, vx: rand(-30, 30), vy: rand(-90, -50), life: 1.4, r: 12, color: 'rgba(240,240,240,0.75)', shape: 'grow' });
        Sound.noise(0.3, 0.08, 'highpass', 2000);
        continue;
      }
      if (World.get(x, y + 1) === T.AIR) { World.set(x, y, T.AIR); this.place(e, x, y + 1); e.lava.delete(i); }
    }
  },

  // Who's in the lava: you (or your vehicle) and any dinos.
  bodiesIn() {
    const list = [];
    const inLava = b => [[0, -4], [0, -b.h / 2], [-b.w / 3, -4], [b.w / 3, -4], [0, 4]].some(([dx, dy]) => World.get(Math.floor((b.x + dx) / TS), Math.floor((b.y + dy) / TS)) === T.LAVA);
    if (Player.vehicle) { if (Player.vehicle.def.mover !== 'air' && inLava(Player.vehicle.body)) list.push(Player.vehicle.body); }
    else if (inLava(Player.body)) list.push(Player.body);
    for (const n of NPCs.list) if (!n.vehicle && !n.ride && inLava(n.body)) list.push(n.body);
    return list;
  },

  // The lava reaches the top: KABOOM, and anyone in it is blasted out of the ground.
  blowTop(e, mx, my) {
    e.erupted = true; e.mouth = [mx, my]; e.t = 0;
    this.shake = 1;
    Sound.noise(1.5, 0.5, 'lowpass', 220); Sound.tone(80, 0.8, 'sawtooth', 0.1, 40);
    Pow.add(mx * TS + 16, (my - 3) * TS, 'KABOOM!');
    // Anyone in the lava, or bobbing about on top of it at the hole, gets blasted out.
    const atMouth = b => Math.abs(b.x - (mx * TS + 16)) < 3 * TS && b.y > (World.genSurf[mx] - 5) * TS && b.y < (World.genSurf[mx] + 3) * TS;
    const bodies = [...new Set(this.bodiesIn().concat([Player.vehicle ? Player.vehicle.body : Player.body].filter(atMouth)))];
    for (const b of bodies) {
      b.x = mx * TS + 16; b.y = Math.min(b.y, my * TS - 0.01); b.vx = 0;
      b.launchTo = (World.genSurf[mx] - 6) * TS;
    }
    if (bodies.length) Eggs.reward('volcano', 3, 'Kaboom! A volcano! It blasted you right out of the ground!', 'VOLCANO!');
  },

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 0.8);
    this.hotCool = Math.max(0, this.hotCool - dt);
    const e = this.active;
    if (e) {
      e.t += dt;
      if (e.phase === 'rumble') {
        this.shake = 0.4;
        if (Math.random() < 0.35) Fx.add({ x: e.tx * TS + rand(0, 32), y: e.ty * TS, vx: rand(-40, 40), vy: rand(-120, -40), life: 0.6, r: 5, color: 'rgba(255,146,43,0.8)' });
        if (e.t > 1.5) { e.phase = 'fill'; e.t = 0; }
      } else if (e.phase === 'fill') {
        e.acc += dt;
        while (e.acc > e.interval && e.budget > 0) {
          e.acc -= e.interval;
          const cell = this.nextCell(e);
          if (!cell) { e.budget = 0; break; }
          this.place(e, cell[0], cell[1]); e.budget--;
          if (Math.random() < 0.3) Sound.noise(0.08, 0.05, 'lowpass', 300);
          // Up to the ground: it blows.
          if (!e.erupted && e.open && cell[1] <= World.genSurf[cell[0]]) this.blowTop(e, cell[0], cell[1]);
        }
        e.flowAcc += dt;
        if (e.flowAcc > 0.06) { e.flowAcc = 0; this.flow(e); }
        if (e.erupted && e.t < 3 && Math.random() < 0.5) {
          const [mx, my] = e.mouth;
          Fx.add({ x: mx * TS + 16, y: (my - 1) * TS, vx: rand(-260, 260), vy: rand(-700, -400), g: 900, life: 1.4, r: rand(5, 9), color: pick(['#ff922b', '#ffd43b', '#e8590c']) });
        }
        if (e.budget <= 0) { e.phase = 'set'; e.t = 0; }
      } else if (e.phase === 'set') {
        e.flowAcc += dt;
        if (e.flowAcc > 0.06) { e.flowAcc = 0; this.flow(e); }
        if (e.t > (e.erupted ? 10 : 6)) { this.cool(e); this.active = null; }
      }
      // Lava is hot: it pushes you (and dinos) up and out. Rising lava carries you up the hole.
      for (const b of this.bodiesIn()) {
        b.vy = Math.min(b.vy, -650);
        if (b === Player.body || (Player.vehicle && b === Player.vehicle.body)) {
          if (!this.hotCool) { this.hotCool = 0.6; Pow.add(b.x, b.y - b.h - 20, 'HOT!'); Sound.tone(900, 0.15, 'square', 0.08, 1400); }
        }
      }
    }
    this.emberT -= dt;
  },

  // Lava sets: below the old ground line it turns to rock, at the top to dirt.
  cool(e) {
    for (const i of e.lava) {
      const x = i % World.w, y = Math.floor(i / World.w);
      if (World.get(x, y) !== T.LAVA) continue;
      World.set(x, y, y > World.genSurf[x] ? T.STONE : T.DIRT);
      if (Math.random() < 0.4) Fx.add({ x: x * TS + 16, y: y * TS, vx: rand(-20, 20), vy: rand(-80, -40), life: 1.6, r: 10, color: 'rgba(240,240,240,0.7)', shape: 'grow' });
    }
    Sound.noise(1, 0.15, 'highpass', 1500);
  },
  // Leaving, a new world, or loading a save: cool everything at once.
  reset() {
    if (this.active) this.cool(this.active);
    this.active = null; this.shake = 0;
  },
  coolSaved() { for (const [i, id] of World.diff) if (id === T.LAVA) World.set(i % World.w, Math.floor(i / World.w), T.STONE); },

  // The hot rock glows, warm rock above it, and embers drift up, so you can see it coming as you dig down.
  drawLayer(c) {
    const cam = Game.cam, Ht = World.h;
    const y0 = Math.max(Ht - 12, Math.floor(cam.y / TS)), y1 = Math.min(Ht - 2, Math.ceil((cam.y + Game.viewH) / TS));
    if (y1 < y0) return;
    const x0 = Math.max(0, Math.floor(cam.x / TS)), x1 = Math.min(World.w - 1, Math.ceil((cam.x + Game.viewW) / TS));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const id = World.get(x, y);
      if (id === T.MAGMA) {
        c.fillStyle = `rgba(255,${120 + Math.round(Math.sin(Game.t * 2.5 + x * 0.7 + y) * 40)},40,${0.22 + 0.12 * Math.sin(Game.t * 3 + x)})`;
        c.fillRect(x * TS, y * TS, TS, TS);
      } else if (id === T.WARMROCK) {
        c.fillStyle = `rgba(255,120,40,${0.06 + (y - (Ht - 12)) * 0.04})`;
        c.fillRect(x * TS, y * TS, TS, TS);
      }
    }
    // Embers floating up from the hot rock's top.
    if (this.emberT <= 0) {
      this.emberT = 0.08;
      const ex = rand(x0, x1), ey = Ht - 8;
      if (World.get(Math.floor(ex), ey) === T.MAGMA && ey * TS > cam.y && ey * TS < cam.y + Game.viewH + 40)
        Fx.add({ x: ex * TS, y: ey * TS, vx: rand(-15, 15), vy: rand(-60, -30), life: 1.8, r: 3, color: pick(['#ffa94d', '#ffd43b']) });
    }
  },
  // Flowing lava glows and bubbles (the tiles themselves are cached, so the glow goes on top).
  drawWorld(c) {
    this.drawLayer(c);
    const e = this.active;
    if (!e) return;
    const cam = Game.cam;
    for (const i of e.lava) {
      const x = i % World.w, y = Math.floor(i / World.w), px = x * TS, py = y * TS;
      if (px < cam.x - 40 || px > cam.x + Game.viewW + 40 || py < cam.y - 40 || py > cam.y + Game.viewH + 40) continue;
      if (World.get(x, y) !== T.LAVA) continue;
      c.fillStyle = `rgba(255,${180 + Math.round(Math.sin(Game.t * 4 + x + y) * 40)},60,0.35)`;
      c.fillRect(px, py, TS, TS);
      const k = (Game.t * 1.5 + x * 0.37 + y * 0.61) % 1;
      ell(c, px + 8 + ((x * 13 + y * 7) % 16), py + TS - k * TS, 3 + k * 2, 3 + k * 2, 'rgba(255,230,120,0.8)', 0);
    }
  },
};
