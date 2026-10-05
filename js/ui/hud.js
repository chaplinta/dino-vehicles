// In-game overlay: star counter, treasure popups, celebration confetti.
const Hud = {
  starBump: 0,
  popups: [],
  confetti: [],
  bannerT: 0, bannerText: '',

  update(dt) {
    this.starBump = Math.max(0, this.starBump - dt * 3);
    this.bannerT = Math.max(0, this.bannerT - dt);
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.t += dt;
      if (p.t > 1.6) this.popups.splice(i, 1);
    }
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const p = this.confetti[i];
      p.vy += 300 * dt; p.vx *= 1 - dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.y > H + 20) this.confetti.splice(i, 1);
    }
  },
  celebrate(text) {
    this.bannerT = 2.6; this.bannerText = text || 'Hooray!';
    for (let i = 0; i < 140; i++) {
      this.confetti.push({ x: rand(0, W), y: rand(-200, -10), vx: rand(-80, 80), vy: rand(0, 200),
        rot: rand(0, TAU), vr: rand(-8, 8), color: pick(['#ff6b6b', '#ffd43b', '#5ccf4a', '#4dabf7', '#c77dff', '#ff9f40']) });
    }
    Sound.fanfare();
  },
  draw(c) {
    // Stars.
    const s = 1 + this.starBump * 0.4;
    c.save(); c.translate(W - 205, 44); c.scale(s, s);
    drawStar(c, 0, 0, 24, 0, '#ffd43b', 4);
    c.restore();
    bigText(c, String(Game.stars), W - 176, 46, 36, '#fff', 'left');
    // Treasure popups.
    for (const p of this.popups) {
      const k = Math.min(1, p.t / 1.2);
      const x = lerp(p.sx, W - 205, k * k), y = lerp(p.sy, 44, k * k) - Math.sin(k * Math.PI) * 80;
      const sc = 2 - k;
      c.save(); c.translate(x, y); c.scale(sc, sc);
      if (p.id === 'star') drawStar(c, 0, 0, 18, p.t * 4, '#ffd43b', 3);
      else TILES[p.id].draw(c, -TS / 2, -TS / 2, 3, 3);
      c.restore();
    }
    // Confetti and banner.
    for (const p of this.confetti) {
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color; c.fillRect(-6, -3, 12, 6); c.restore();
    }
    if (this.bannerT > 0) {
      const k = Math.min(1, (2.6 - this.bannerT) * 4);
      c.save(); c.translate(W / 2, 170); c.scale(k, k); c.rotate(Math.sin(this.bannerT * 6) * 0.05);
      bigText(c, this.bannerText, 0, 0, 84, '#ffd43b');
      c.restore();
    }
  },
};
