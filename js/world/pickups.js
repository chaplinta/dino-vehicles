// Sparkly stars floating around the world to catch: low ones to jump for, high ones
// for flyers, some underwater. They come back a while after being caught.
const Pickups = {
  list: [],
  RESPAWN: 60,
  generate(seed) {
    const rng = mulberry32(seed + 5);
    this.list = [];
    const free = (tx, ty) => { const id = World.get(tx, ty); return id === T.AIR || id === T.WATER || TILES[id].back || id === T.FLOWER || id === T.CROP; };
    for (let tx = 8; tx < WORLD_W - 8; tx += 6 + Math.floor(rng() * 7)) {
      const top = World.groundBelow(tx, 0);
      let ty;
      const r = rng();
      if (tx >= SEA_X0 + 3 && tx < SEA_X1 - 3 && r < 0.6) ty = SEA_LEVEL + 2 + Math.floor(rng() * Math.max(1, World.groundBelow(tx, SEA_LEVEL) - SEA_LEVEL - 3));
      else if (r < 0.7) ty = top - 2 - Math.floor(rng() * 2);     // jump height
      else ty = top - 6 - Math.floor(rng() * 6);                   // up high, for flying
      if (ty < 2 || !free(tx, ty)) continue;
      this.list.push({ x: tx * TS + TS / 2, y: ty * TS + TS / 2, t: rng() * 10, gone: 0 });
    }
  },
  update(dt) {
    const v = Player.vehicle;
    const cx = v ? v.body.x : Player.body.x;
    const cy = v ? v.body.y - v.body.h / 2 : Player.body.y - Player.body.h / 2;
    const reach = v ? Math.max(v.body.w, v.body.h) / 2 + 24 : 40;
    for (const p of this.list) {
      p.t += dt;
      if (p.gone > 0) { p.gone -= dt; continue; }
      if (Math.abs(p.x - cx) < reach && Math.abs(p.y - cy) < reach + 10) {
        p.gone = this.RESPAWN;
        Game.addStars(1);
        Game.popupStar(p.x, p.y);
        Sound.collect();
        Fx.burst(p.x, p.y, 12, { speed: 200, life: 0.7, r: 7, color: ['#ffd43b', '#fff3bf', '#ffffff'], shape: 'star' });
      }
    }
  },
  draw(c) {
    const cam = Game.cam;
    for (const p of this.list) {
      if (p.gone > 0) continue;
      if (p.x < cam.x - 40 || p.x > cam.x + Game.viewW + 40 || p.y < cam.y - 40 || p.y > cam.y + Game.viewH + 40) continue;
      const pulse = 1 + Math.sin(p.t * 4) * 0.12;
      c.fillStyle = 'rgba(255,240,150,0.35)';
      c.beginPath(); c.arc(p.x, p.y, 22 * pulse, 0, TAU); c.fill();
      drawStar(c, p.x, p.y + Math.sin(p.t * 2) * 4, 15 * pulse, Math.sin(p.t * 1.5) * 0.4, '#ffd43b', 3);
    }
  },
};
