// Dig deep enough and you hit hot rock. It rumbles, then a volcano blasts you straight up and out of
// the ground, lava fills the hole and spills into a little cone, and after a while it all cools to rock and dirt.
const Volcano = {
  active: null,   // the eruption happening now
  shake: 0,
  hotCool: 0,

  erupt(tx, ty) {
    if (Game.away || this.active || !World.genSurf) return;
    const top = World.genSurf[tx];
    this.active = { tx, ty, top, t: 0, phase: 'rumble', fill: ty, acc: 0, tiles: [], half: 0 };
    Sound.noise(1.2, 0.3, 'lowpass', 120); Sound.tone(50, 1, 'sawtooth', 0.08, 40);
    Pow.add(tx * TS + 16, ty * TS - 40, 'RUMBLE!');
  },

  // Who gets blasted out: you (or your vehicle), and any dino down in the hole near the vent.
  riders(e) {
    const near = b => Math.abs(b.x - (e.tx * TS + 16)) < 4 * TS && b.y > e.top * TS;
    const list = [];
    if (Player.vehicle) { if (near(Player.vehicle.body)) list.push(Player.vehicle.body); }
    else if (near(Player.body)) list.push(Player.body);
    for (const n of NPCs.list) if (!n.vehicle && !n.ride && near(n.body)) list.push(n.body);
    return list;
  },

  blast(e) {
    const bodies = this.riders(e);
    // Carve a straight vent up to the surface, wide enough for whoever's going up it.
    e.half = Math.max(0, ...bodies.map(b => Math.ceil((b.w / 2 - 14) / TS)));
    for (let y = e.ty; y >= e.top - 1; y--) for (let x = e.tx - e.half; x <= e.tx + e.half; x++) if (World.get(x, y) !== T.BEDROCK) World.set(x, y, T.AIR);
    for (const b of bodies) { b.x = e.tx * TS + 16; b.vx = 0; b.launchTo = (e.top - 6) * TS; }
    e.phase = 'rise'; e.t = 0;
    this.shake = 1;
    Sound.noise(1.5, 0.5, 'lowpass', 220); Sound.tone(80, 0.8, 'sawtooth', 0.1, 40);
    Pow.add(e.tx * TS + 16, (e.top - 3) * TS, 'KABOOM!');
    if (bodies.length) Eggs.reward('volcano', 3, 'Kaboom! A volcano! It blasted you right out of the ground!', 'VOLCANO!');
  },

  lava(e, x, y, cooled) {
    const id = World.get(x, y);
    if (id === T.BEDROCK || id === T.LAVA) return;
    if (id !== T.AIR && y < e.top) return;   // the cone only goes where there's room
    e.tiles.push([x, y, cooled]);
    World.set(x, y, T.LAVA);
  },

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 0.8);
    this.hotCool = Math.max(0, this.hotCool - dt);
    const e = this.active;
    if (e) {
      e.t += dt;
      if (e.phase === 'rumble') {
        this.shake = 0.5;
        if (Math.random() < 0.3) Fx.add({ x: e.tx * TS + rand(0, 32), y: e.ty * TS, vx: rand(-40, 40), vy: rand(-120, -40), life: 0.6, r: 5, color: 'rgba(255,146,43,0.8)' });
        if (e.t > 0.9) this.blast(e);
      } else if (e.phase === 'rise') {
        // Lava follows you up the vent, a row at a time.
        e.acc += dt;
        while (e.t > 0.3 && e.acc > 0.04 && e.fill >= e.top) {
          e.acc -= 0.04;
          for (let x = e.tx - e.half; x <= e.tx + e.half; x++) this.lava(e, x, e.fill, e.fill < e.top + 3 ? T.DIRT : T.STONE);
          e.fill--;
        }
        if (e.fill < e.top) {
          // Over the top: spill into a little cone.
          for (let dx = -e.half - 2; dx <= e.half + 2; dx++) this.lava(e, e.tx + dx, e.top - 1, T.DIRT);
          for (let dx = -e.half - 1; dx <= e.half + 1; dx++) this.lava(e, e.tx + dx, e.top - 2, T.DIRT);
          e.phase = 'flow'; e.t = 0;
        }
      } else if (e.phase === 'flow') {
        if (e.t < 3 && Math.random() < 0.5) {
          const x = e.tx * TS + 16, y = (e.top - 2) * TS;
          Fx.add({ x, y, vx: rand(-260, 260), vy: rand(-700, -400), g: 900, life: 1.4, r: rand(5, 9), color: pick(['#ff922b', '#ffd43b', '#e8590c']) });
        }
        if (e.t > 12) { this.cool(e); this.active = null; }
      }
    }
    // Hot feet: stand on lava and you hop straight off it.
    const b = Player.vehicle ? (Player.vehicle.def.mover === 'ground' ? Player.vehicle.body : null) : Player.body;
    if (b && b.onGround && !this.hotCool) {
      const under = [b.x - b.w / 2 + 2, b.x, b.x + b.w / 2 - 2].some(x => World.get(Math.floor(x / TS), Math.floor((b.y + 2) / TS)) === T.LAVA);
      if (under) {
        b.vy = -750; this.hotCool = 0.4;
        Pow.add(b.x, b.y - b.h - 20, 'HOT!');
        Sound.tone(900, 0.15, 'square', 0.08, 1400);
      }
    }
  },

  // Lava sets: the vent turns to rock, the cone to dirt.
  cool(e) {
    for (const [x, y, to] of e.tiles) if (World.get(x, y) === T.LAVA) {
      World.set(x, y, to);
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

  // Lava glows and bubbles (the tiles themselves are cached, so the glow goes on top).
  drawWorld(c) {
    const e = this.active;
    if (!e) return;
    const cam = Game.cam;
    for (const [x, y] of e.tiles) {
      const px = x * TS, py = y * TS;
      if (px < cam.x - 40 || px > cam.x + Game.viewW + 40 || py < cam.y - 40 || py > cam.y + Game.viewH + 40) continue;
      if (World.get(x, y) !== T.LAVA) continue;
      c.fillStyle = `rgba(255,${180 + Math.round(Math.sin(Game.t * 4 + x + y) * 40)},60,0.35)`;
      c.fillRect(px, py, TS, TS);
      const k = (Game.t * 1.5 + x * 0.37 + y * 0.61) % 1;
      ell(c, px + 8 + ((x * 13 + y * 7) % 16), py + TS - k * TS, 3 + k * 2, 3 + k * 2, 'rgba(255,230,120,0.8)', 0);
    }
  },
};
