// Sea vehicles: tugboat, fishing boat, submarine. Plus fish and sunken treasure chests.

// Screen-independent: y px of the water surface in this column near py, or null.
function waterSurfaceY(px, py) {
  const tx = Math.floor(px / TS);
  let ty = Math.floor((py + 8) / TS);
  if (World.get(tx, ty) !== T.WATER) {
    if (World.get(tx, ty + 1) === T.WATER) ty += 1;
    else if (World.get(tx, ty + 2) === T.WATER) ty += 2;
    else return null;
  }
  for (let k = 0; k < 40 && ty > 0 && World.get(tx, ty - 1) === T.WATER; k++) ty--;
  return ty * TS;
}
function boatMove(v, dt, inp, dir, speed) {
  const b = v.body;
  const surf = waterSurfaceY(b.x, b.y);
  const floating = surf !== null;
  if (floating) {
    const target = surf + v.def.draft + Math.sin(v.t * 2) * 2;
    b.vy += ((target - b.y) * 30 - b.vy * 6) * dt;
  } else b.vy += GRAVITY * dt;
  const sp = floating ? speed : speed * 0.15;
  b.vx = lerp(b.vx, dir * sp, Math.min(1, dt * (dir ? 2 : 1.2)));
  if (dir) v.facing = dir;
  moveBody(b, dt, { gravity: 0, step: floating ? 1 : 0 });
  v.floating = floating;
}

// Fish swim in the sea; boats with nets catch them.
const Fish = {
  list: [],
  reset() {
    this.list = [];
    for (let i = 0; i < 18; i++) this.spawn();
  },
  spawn() {
    const x = rand(SEA_X0 + 3, SEA_X1 - 3) * TS;
    const floor = World.groundBelow(Math.floor(x / TS), SEA_LEVEL) * TS;
    this.list.push({ x, y: rand(SEA_LEVEL * TS + 40, Math.max(SEA_LEVEL * TS + 60, floor - 30)), vx: pick([-1, 1]) * rand(30, 70), t: rand(0, 9),
      color: pick(['#ff922b', '#f783ac', '#ffd43b', '#74c0fc', '#b197fc']), caught: null });
  },
  update(dt) {
    for (const f of this.list) {
      f.t += dt;
      if (f.caught) continue;
      f.x += f.vx * dt;
      f.y += Math.sin(f.t * 2) * 10 * dt;
      const tx = Math.floor((f.x + Math.sign(f.vx) * 16) / TS), ty = Math.floor(f.y / TS);
      if (World.get(tx, ty) !== T.WATER || World.get(tx, ty - 1) === T.AIR) f.vx = -f.vx;
    }
  },
  draw(c) {
    for (const f of this.list) {
      if (f.caught) continue;
      c.save(); c.translate(f.x, f.y); if (f.vx < 0) c.scale(-1, 1);
      poly(c, [-14, 0, -24, -9, -24, 9], f.color, 3);
      ell(c, 0, 0, 16, 10, f.color, 3);
      ell(c, 7, -2, 3, 3, OUT, 0);
      c.restore();
    }
  },
};

defVehicle('tugboat', {
  name: 'Tugboat', say: 'Tugboat! Toot toot!', icon: '🪢', w: 110, h: 56, speed: 220, horn: 'boat', unlock: 10, draft: 18,
  move(v, dt, inp, dir) { boatMove(v, dt, inp, dir, this.speed); },
  act(v, dt, inp) {
    const s = v.s;
    if (inp.actionP) {
      if (s.tow) { s.tow = null; Sound.click(); }
      else {
        const other = Vehicles.nearest(v.body.x, v.body.y, 260, o => o !== v && (o.def.mover === 'boat' || o.kind === 'fishboat' || o.kind === 'submarine' || o.def.draft));
        if (other) { s.tow = other; v.hornSound(); if (v.driver === Player) Sound.say('Got it! Tow it home!'); }
        else Sound.bonk();
      }
    }
    const o = s.tow;
    if (o) {
      const tx = v.body.x - v.facing * 150;
      const dx = tx - o.body.x;
      if (Math.abs(dx) > 400) { s.tow = null; return; }
      o.body.vx = lerp(o.body.vx, dx * 2.5, Math.min(1, dt * 3));
      if (Math.abs(o.body.vx) > 10) o.facing = Math.sign(o.body.vx);
    }
  },
  draw(c, v) {
    c.beginPath(); c.moveTo(-56, -36); c.lineTo(56, -40); c.lineTo(44, -4); c.lineTo(-48, -4); c.closePath(); fillStroke(c, '#e8590c');
    c.fillStyle = '#fff'; c.fillRect(-54, -30, 106, 5);
    rbox(c, -26, -76, 46, 40, 8, '#ffffff');
    cabWindow(c, v, -18, -70, 30, 22, 6, [-4, -42, 0.4]);
    rbox(c, -40, -96, 16, 40, 3, '#ffd43b', 3); c.fillStyle = OUT; c.fillRect(-40, -92, 16, 6);
    for (let i = 0; i < 3; i++) ell(c, -40 + i * 40, -18, 7, 7, '#adb5bd', 3);
    for (const fx of [-48, -16, 16, 44]) { ell(c, fx, -10, 8, 8, '#343a40', 3); ell(c, fx, -10, 3, 3, '#868e96', 0); }   // tyre fenders
    if (Math.random() < 0.08 && v.floating) Fx.add({ x: v.body.x - v.facing * 32, y: v.body.y - 96, vx: rand(-10, 10), vy: -40, life: 1.5, r: 9, color: 'rgba(240,240,240,0.8)', shape: 'grow' });
  },
  drawWorld(c, v) {
    const o = v.s.tow;
    if (!o) return;
    c.strokeStyle = '#8a5a2b'; c.lineWidth = 4; c.beginPath();
    const ax = v.body.x - v.facing * 54, ay = v.body.y - 30, bx = o.body.x, by = o.body.y - 30;
    c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 30, bx, by); c.stroke();
  },
});

defVehicle('fishboat', {
  name: 'Fishing boat', say: 'Fishing boat! Let us catch some fish!', icon: '🎣', w: 104, h: 56, speed: 200, horn: 'boat', unlock: 8, draft: 18,
  init(v) { v.s.net = 0; v.s.netDown = false; v.s.catch = []; },
  move(v, dt, inp, dir) { boatMove(v, dt, inp, dir, this.speed); },
  act(v, dt, inp) {
    const s = v.s;
    if (inp.actionP) {
      s.netDown = !s.netDown;
      Sound.tone(s.netDown ? 400 : 250, 0.3, 'sine', 0.08, s.netDown ? 200 : 500);
      if (!s.netDown && s.catch.length) {
        const n = s.catch.length;
        if (v.driver === Player) { Game.addStars(n); Game.popupStar(v.body.x, v.body.y - 80); Sound.collect(); Sound.say(n > 1 ? `${n} fish!` : 'A fish!'); }
        for (const f of s.catch) { f.caught = null; Object.assign(f, { x: rand(SEA_X0 + 4, SEA_X1 - 4) * TS }); }
        s.catch = [];
      }
    }
    s.net = clamp(s.net + (s.netDown ? dt : -dt) * 1.5, 0, 1);
    const nx = v.body.x - v.facing * 30, ny = v.body.y + s.net * 110;
    if (s.net > 0.5) {
      for (const f of Fish.list) {
        if (!f.caught && dist(f.x, f.y, nx, ny) < 40 && s.catch.length < 5) { f.caught = v; s.catch.push(f); Sound.pop(); }
      }
    }
    s.netPos = { x: nx, y: ny };
  },
  draw(c, v) {
    c.beginPath(); c.moveTo(-52, -34); c.lineTo(52, -38); c.lineTo(40, -4); c.lineTo(-44, -4); c.closePath(); fillStroke(c, '#1c7ed6');
    c.fillStyle = '#fff'; c.fillRect(-50, -28, 98, 5);
    rbox(c, 4, -76, 40, 40, 8, '#ffffff');
    cabWindow(c, v, 10, -70, 28, 22, 6, [22, -42, 0.4]);
    limb(c, [-30, -36, -30, -110], 5, '#8a5a2b');
    limb(c, [-30, -110, -60, -80], 4, '#8a5a2b');
  },
  drawWorld(c, v) {
    const s = v.s;
    if (s.net <= 0.02 || !s.netPos) return;
    const top = { x: v.body.x - v.facing * 60, y: v.body.y - 80 };
    c.strokeStyle = '#555'; c.lineWidth = 2; c.beginPath(); c.moveTo(top.x, top.y); c.lineTo(s.netPos.x, s.netPos.y - 20); c.stroke();
    c.save(); c.translate(s.netPos.x, s.netPos.y);
    c.beginPath(); c.arc(0, 0, 26, 0, Math.PI); c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.2)'; c.fill(); c.strokeStyle = '#f1f3f5'; c.lineWidth = 2;
    for (let i = -20; i <= 20; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i * 0.5, 24); c.stroke(); }
    c.beginPath(); c.moveTo(-26, 0); c.lineTo(26, 0); c.lineWidth = 4; c.strokeStyle = '#8a5a2b'; c.stroke();
    s.catch.forEach((f, i) => { ell(c, -12 + i * 7, 10, 8, 5, f.color, 2); });
    c.restore();
  },
});

defVehicle('submarine', {
  name: 'Submarine', say: 'Submarine! Down under the sea!', icon: '💡', dirs: 'all', w: 120, h: 56, speed: 170, horn: 'boat', unlock: 25, draft: 30, look: 80,
  init(v) { v.s.light = true; },
  move(v, dt, inp, dir) {
    const b = v.body;
    const inW = World.waterPx(b.x, b.y - b.h / 2);
    if (inW) {
      const vdir = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * 2));
      b.vy = lerp(b.vy, vdir * 120, Math.min(1, dt * 2));
      // Don't leap out of the sea: stay at least half under the surface.
      if (!World.waterPx(b.x, b.y - b.h + 6) && b.vy < 0) b.vy = 0;
      moveBody(b, dt, { gravity: 0 });
    } else {
      b.vx = lerp(b.vx, dir * this.speed * 0.15, Math.min(1, dt * 2));
      moveBody(b, dt, {});
    }
    if (dir) v.facing = dir;
    v.wheel += dt * (Math.abs(b.vx) + 20) * 0.1;
  },
  act(v, dt, inp) {
    if (inp.actionP) { v.s.light = !v.s.light; Sound.tone(1200, 0.4, 'sine', 0.08, 900); }
    // Pick up treasure chests by touching them.
    for (const p of World.props) {
      if (p.type === 'chest' && !p.open && dist(p.x * TS, p.y * TS - 16, v.body.x, v.body.y - 28) < 80) {
        p.open = true;
        if (v.driver === Player) { Game.addStars(3); Game.popupStar(p.x * TS, p.y * TS - 40); Sound.collect(); Sound.say('Treasure!'); }
        Fx.burst(p.x * TS, p.y * TS - 20, 16, { speed: 160, life: 1, r: 8, color: ['#ffd43b', '#fff3bf'], shape: 'star' });
      }
    }
  },
  draw(c, v) {
    rbox(c, -60, -50, 116, 44, 22, '#ffd43b');
    rbox(c, -14, -72, 36, 26, 8, '#ffd43b');
    limb(c, [8, -72, 8, -90, 18, -90], 4, '#868e96');
    cabWindow(c, v, 22, -42, 26, 26, 13, [34, -16, 0.36]);
    for (let i = 0; i < 2; i++) ell(c, -34 + i * 26, -28, 8, 8, '#bdf3ff', 3);
    c.save(); c.translate(-62, -28); c.rotate(v.wheel);
    for (let i = 0; i < 3; i++) { c.rotate(TAU / 3); rbox(c, -3, 0, 6, 14, 3, '#868e96', 2); }
    c.restore();
    if (v.s.light) {
      const g = c.createRadialGradient(60, -28, 4, 140, -28, 120);
      g.addColorStop(0, 'rgba(255,250,200,0.55)'); g.addColorStop(1, 'rgba(255,250,200,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(56, -34); c.lineTo(220, -90); c.lineTo(220, 34); c.lineTo(56, -22); c.closePath(); c.fill();
    }
  },
});
