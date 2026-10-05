// Flying vehicles: helicopter (rope hook carries blocks and rescues), plane (waters crops).

// Blocks falling through the air until they land in a column.
const Falling = {
  list: [],
  add(id, x, y) { this.list.push({ id, x, y, vy: 0 }); },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.vy += 1400 * dt; f.y += f.vy * dt;
      const tx = Math.floor(f.x / TS), ty = Math.floor((f.y + TS) / TS);
      if (World.solid(tx, ty) || ty >= WORLD_H - 1) {
        if (!dropTileInColumn(tx, f.id, Math.floor(f.y / TS) - 1)) Fx.burst(f.x, f.y, 8, { speed: 120, life: 0.4, r: 5, color: DUST[f.id] || '#fff', shape: 'rect' });
        else Sound.place();
        this.list.splice(i, 1);
      }
    }
  },
  draw(c) {
    for (const f of this.list) {
      TILES[f.id].draw(c, f.x - TS / 2, f.y, 3, 3);
      c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(f.x - TS / 2, f.y, TS, TS);
    }
  },
};

defVehicle('helicopter', {
  name: 'Helicopter', say: 'Helicopter! Up up and away!', icon: '🪝', dirs: 'all', w: 110, h: 64, mover: 'air', speed: 300, unlock: 12, seats: 2, look: 60, camY: 60,
  init(v) { v.s.rope = 0; v.s.down = false; v.s.carry = null; v.s.rotor = 0; },
  move(v, dt, inp, dir) {
    const b = v.body, s = v.s;
    const vdir = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    const flying = v.driver != null;
    s.spin = lerp(s.spin || 0, flying ? 1 : 0, dt * 1.5);
    s.rotor += dt * 30 * s.spin;
    if (s.spin > 0.6) {
      b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * 2));
      b.vy = lerp(b.vy, vdir * 220 + Math.sin(v.t * 2) * 10, Math.min(1, dt * 2.5));
      moveBody(b, dt, { gravity: 0 });
      if (b.y < -300) b.y = -300;
    } else {
      b.vx = lerp(b.vx, 0, dt * 3);
      moveBody(b, dt, {});
    }
    if (dir) v.facing = dir;
    v.tilt = lerp(v.tilt || 0, b.vx / this.speed * 0.2, dt * 4);
  },
  hookPos(v) { return { x: v.body.x, y: v.body.y + v.s.rope }; },
  act(v, dt, inp) {
    const s = v.s;
    if (inp.actionP) {
      if (s.carry) {
        const h = this.hookPos(v);
        Falling.add(s.carry, h.x, h.y);
        s.carry = null; Sound.tone(400, 0.2, 'sine', 0.08, 200);
      } else s.down = !s.down;
    }
    // Rope reels out until it touches something.
    const h = this.hookPos(v);
    const blocked = World.solid(Math.floor(h.x / TS), Math.floor((h.y + 10) / TS));
    if (s.down && !blocked && s.rope < 220) s.rope += 260 * dt;
    else if (!s.down && s.rope > 0) s.rope = Math.max(0, s.rope - 300 * dt);
    if (s.down && blocked && !s.carry) {
      const tx = Math.floor(h.x / TS), ty = Math.floor((h.y + 10) / TS);
      const id = World.get(tx, ty);
      if (TILES[id].dig && !TILES[id].treasure) {
        World.set(tx, ty, T.AIR);
        s.carry = LOOSE(id) >= 0 ? LOOSE(id) : T.DIRT;
        Sound.pop();
      } else if (TILES[id].treasure) {
        vehicleDig(tx, ty, true);
      }
      s.down = false;
    }
  },
  draw(c, v) {
    const s = v.s;
    c.save(); c.translate(0, -36); c.rotate(v.tilt || 0);
    limb(c, [-30, -2, -100, -14], 12, '#2f9e44');
    poly(c, [-96, -14, -110, -40, -100, -40, -88, -14], '#2f9e44', 3);
    const tr = Math.abs(Math.cos(s.rotor * 1.3)) * 18;
    ell(c, -104, -16, 4, tr + 2, 'rgba(80,80,80,0.6)', 0);
    limb(c, [-36, 30, 36, 30], 4, '#555'); limb(c, [-20, 18, -24, 30], 4, '#555'); limb(c, [20, 18, 24, 30], 4, '#555');
    ell(c, 0, 0, 52, 30, '#40c057');
    c.save(); c.beginPath(); c.ellipse(20, -6, 28, 22, 0, 0, TAU); c.fillStyle = '#bdf3ff'; c.fill(); c.clip();
    v.drawDriver(c, 18, 18, 0.42);
    drawPassengers(c, v, [[-2, 18, 0.34]]);
    c.restore();
    c.beginPath(); c.ellipse(20, -6, 28, 22, 0, 0, TAU); fillStroke(c, null, 4);
    limb(c, [0, -30, 0, -40], 6, '#555');
    const k = Math.cos(s.rotor);
    ell(c, 0, -42, 120 * (0.2 + 0.8 * (s.spin || 0)), 5, 'rgba(70,70,70,0.25)', 0);
    rbox(c, -110 * Math.abs(k), -45, 220 * Math.abs(k) + 1, 6, 3, '#495057', 2);
    c.restore();
  },
  drawWorld(c, v) {
    const s = v.s;
    if (s.rope <= 1 && !s.carry) return;
    const h = this.hookPos(v);
    c.strokeStyle = '#555'; c.lineWidth = 3; c.beginPath(); c.moveTo(v.body.x, v.body.y - 6); c.lineTo(h.x, h.y); c.stroke();
    if (s.carry) {
      TILES[s.carry].draw(c, h.x - TS / 2, h.y, 3, 3);
      c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(h.x - TS / 2, h.y, TS, TS);
    }
    c.beginPath(); c.arc(h.x, h.y + 4, 7, 0, Math.PI); c.strokeStyle = '#868e96'; c.lineWidth = 4; c.stroke();
  },
});

defVehicle('plane', {
  name: 'Plane', say: 'Plane! Zoom!', icon: '💧', dirs: 'all', w: 130, h: 50, mover: 'air', speed: 330, unlock: 25, look: 220,
  init(v) { v.s.flying = false; v.s.prop = 0; },
  move(v, dt, inp, dir) {
    const b = v.body, s = v.s;
    const vdir = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    s.prop += dt * (v.driver ? 40 : 0);
    if (!s.flying) {
      b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * 1.2));
      if (dir) v.facing = dir;
      moveBody(b, dt, { step: 1 });
      if (Math.abs(b.vx) > 220 && inp.up) { s.flying = true; b.vy = -160; Sound.tone(300, 0.5, 'sawtooth', 0.05, 500); }
      v.tilt = lerp(v.tilt || 0, 0, dt * 4);
    } else {
      if (dir && dir !== v.facing) { v.facing = dir; b.vx = -b.vx * 0.5; }
      b.vx = lerp(b.vx, v.facing * this.speed, Math.min(1, dt * 1.5));
      b.vy = lerp(b.vy, vdir * 200, Math.min(1, dt * 2.5));
      if (b.y < -300) b.y = -300;
      moveBody(b, dt, { gravity: 0 });
      if (b.hitWall) { v.facing = -v.facing; b.vx = v.facing * 100; Sound.bonk(); }
      if (b.onGround) { s.flying = false; Sound.land(); }
      v.tilt = lerp(v.tilt || 0, b.vy / 200 * 0.25, dt * 4);
    }
    if (b.inWater) { b.vy -= 2000 * dt; }
  },
  act(v, dt, inp) {
    if (inp.action && v.s.flying) {
      Water.spray(v.body.x - v.facing * 30, v.body.y - 10, v.body.vx * 0.3 + rand(-30, 30), rand(40, 120), { crops: true });
      if (Math.random() < 0.15) Sound.noise(0.05, 0.03, 'highpass', 3000);
    }
  },
  draw(c, v) {
    c.save(); c.rotate(v.tilt || 0);
    if (!v.s.flying) { limb(c, [-6, -24, -10, -8], 4, '#555'); drawWheel(c, -10, -8, 8, v.wheel); drawWheel(c, -54, -14, 6, v.wheel); }
    c.beginPath(); c.moveTo(-64, -40); c.quadraticCurveTo(-10, -52, 46, -40); c.quadraticCurveTo(62, -32, 46, -22);
    c.quadraticCurveTo(-10, -14, -64, -30); c.closePath(); fillStroke(c, '#ff6b6b');
    poly(c, [-62, -38, -74, -68, -56, -66, -46, -40], '#ff6b6b', 3);
    rbox(c, -30, -36, 70, 10, 5, '#ffd43b', 3);
    c.save(); c.beginPath(); c.ellipse(4, -46, 18, 14, 0, Math.PI, TAU); c.closePath(); c.fillStyle = '#bdf3ff'; c.fill(); c.clip();
    v.drawDriver(c, 0, -26, 0.34); c.restore();
    c.beginPath(); c.ellipse(4, -46, 18, 14, 0, Math.PI, TAU); c.closePath(); fillStroke(c, null, 3);
    const k = Math.cos(v.s.prop || 0);
    rbox(c, 54, -32 - 20 * Math.abs(k), 6, 40 * Math.abs(k) + 2, 3, '#495057', 2);
    ell(c, 50, -31, 6, 6, '#868e96', 3);
    c.restore();
  },
});
