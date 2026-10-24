// Jump ramps: wedges any wheeled vehicle can drive up. Off the lip at speed, you fly.
// A ramp prop is { type: 'ramp', x, w, h, dir, y? }: x is its left tile, w and h in tiles, dir 1 rises to the right.
const Ramps = {
  geom(p) {
    const base = (p.y || SURF) * TS, x0 = p.x * TS, x1 = (p.x + p.w) * TS;
    return { base, x0, x1, h: p.h * TS, lip: p.dir > 0 ? x1 : x0 };
  },
  // Height of the ramp surface above its base at world x (0 at the low end).
  heightAt(p, g, x) { const k = clamp((x - g.x0) / (g.x1 - g.x0), 0, 1); return g.h * (p.dir > 0 ? k : 1 - k); },

  // Called after a ground vehicle moves: ride up the slope, launch off the lip, reward big jumps.
  ride(v, dt) {
    const b = v.body, s = v.s;
    s.airCool = Math.max(0, (s.airCool || 0) - dt);
    let on = null;
    for (const p of World.props) {
      if (p.type !== 'ramp') continue;
      const g = this.geom(p);
      if (b.x < g.x0 || b.x > g.x1) continue;
      const top = g.base - this.heightAt(p, g, b.x);
      // Drive up from the low end, or land on it from above; never snap up the steep back.
      if (b.vy >= 0 && b.y >= top - 2 && b.y - top < (s.ramp === p ? 60 : 26)) { b.y = top; b.vy = 0; b.onGround = true; on = p; }
    }
    if (s.ramp && !on) {
      // Just left a ramp: off the lip going the way it rises means take-off.
      const p = s.ramp, g = this.geom(p);
      if (Math.sign(b.vx) === p.dir && Math.abs(b.x - g.lip) < 40 && Math.abs(b.vx) > 120) {
        b.vy = -(Math.abs(b.vx) * (p.h / p.w) * 1.15 + 160);
        s.launched = true; s.airT = 0; v.flip = 0;
        Sound.jump();
        Fx.burst(b.x, b.y, 8, { speed: 120, up: 60, g: 300, life: 0.6, r: 7, color: ['#d9b38c', '#fff'] });
      }
    }
    s.ramp = on;
    if (s.launched) {
      if (!b.onGround) s.airT += dt;
      else {
        s.launched = false;
        if (s.airT > 0.7 && v.driver === Player && !s.airCool) {
          s.airCool = 3;
          Game.addStars(1); Game.popupStar(b.x, b.y - b.h - 30);
          Pow.add(b.x, b.y - b.h - 20, s.airT > 1.3 ? 'HUGE AIR!' : 'BIG AIR!');
          Sound.tone(660, 0.12, 'square', 0.08); Sound.tone(990, 0.2, 'square', 0.07, null, 0.1);
        }
        Fx.burst(b.x, b.y, 10, { speed: 160, up: 40, g: 400, life: 0.5, r: 8, color: 'rgba(200,180,150,0.7)' });
        Sound.noise(0.1, 0.18, 'lowpass', 300);
      }
    }
  },

  draw(c, p, sx, sy) {
    const w = p.w * TS, h = p.h * TS, x0 = sx, x1 = sx + w;
    const lowX = p.dir > 0 ? x0 : x1, highX = p.dir > 0 ? x1 : x0;
    const dirt = p.dirt !== false && World.get(Math.floor(p.x + p.w / 2), Math.round(p.y || SURF)) === T.DIRT;
    poly(c, [lowX, sy, highX, sy - h, highX, sy], dirt ? '#b07a45' : '#d9a066', 4);
    // Planks or ruts across the slope, and a stripy lip.
    c.strokeStyle = dirt ? 'rgba(90,55,25,0.5)' : 'rgba(120,70,30,0.55)'; c.lineWidth = 3;
    for (let i = 1; i < p.w * 2; i++) {
      const k = i / (p.w * 2), x = lerp(lowX, highX, k), y = sy - h * k;
      c.beginPath(); c.moveTo(x, y + 2); c.lineTo(x, sy - 2); c.stroke();
    }
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#fff' : '#e8262b'; c.fillRect(highX - (p.dir > 0 ? 8 : 0), sy - h + i * (h / 4), 8, h / 4); }
    c.lineWidth = 3; c.strokeStyle = OUT; c.strokeRect(highX - (p.dir > 0 ? 8 : 0), sy - h, 8, h);
  },
};
