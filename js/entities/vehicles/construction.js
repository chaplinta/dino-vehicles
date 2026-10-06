// Construction vehicles: digger, dump truck, bulldozer, builder crane, wrecking ball, drill rig.

// Drop a tile into column tx: lands on the first solid tile below row fromRow.
function dropTileInColumn(tx, id, fromRow) {
  const land = World.groundBelow(tx, Math.max(0, fromRow));
  const ty = land - 1;
  if (ty < 0 || ty < fromRow) return false;
  const cur = World.get(tx, ty);
  if (!(cur === T.AIR || cur === T.WATER || TILES[cur].back || cur === T.FLOWER)) return false;
  for (const body of Game.bodies()) {
    const l = tx * TS, t = ty * TS;
    if (l < body.x + body.w / 2 && l + TS > body.x - body.w / 2 && t < body.y && t + TS > body.y - body.h) return false;
  }
  World.set(tx, ty, id);
  return true;
}
// Vehicle digs a tile: dust, treasure rewards. Returns removed id or -1.
function vehicleDig(tx, ty, strong) {
  const id = World.get(tx, ty);
  const d = TILES[id];
  if (id === T.AIR || !d.dig || d.fluid) return -1;
  if (!strong && d.hard >= 3) return -1;
  World.set(tx, ty, T.AIR);
  digEffects(tx, ty, id);
  return id;
}
const LOOSE = id => (id === T.GRASS ? T.DIRT : TILES[id].treasure ? -1 : id);

// ---------- Digger ----------
defVehicle('digger', {
  name: 'Digger', exhaust: [-34, -66], say: 'Digger! Dig dig dig!', icon: '🪣', dirs: 'all', w: 84, h: 64, speed: 170, unlock: 0,
  init(v) { Object.assign(v.s, { aim: 0, load: [], anim: 0, mode: '', bx: 90, by: -70, rep: 0 }); },
  targetCols(v) {
    const c0 = Math.floor(v.frontX(6) / TS);
    return [0, 1, 2].map(i => c0 + i * v.facing);
  },
  act(v, dt, inp) {
    const s = v.s;
    s.rep -= dt; s.hardT = (s.hardT || 0) - dt;
    if (inp.upP || (inp.up && s.rep < 0)) { s.aim = Math.max(-3, s.aim - 1); s.rep = 0.25; }
    if (inp.downP || (inp.down && s.rep < 0)) { s.aim = Math.min(4, s.aim + 1); s.rep = 0.25; }
    const row = v.groundRow() + s.aim;
    if (s.anim > 0) {
      s.anim -= dt;
      if (s.mode === 'scoop' && s.anim < 0.3 && !s.done) {
        s.done = true;
        for (const tx of this.targetCols(v)) {
          const id = vehicleDig(tx, row, false);
          if (id >= 0 && LOOSE(id) >= 0) s.load.push(LOOSE(id));
        }
        if (s.load.length) Sound.dig();
        else {
          Sound.bonk();
          if (Game.away === 'pilbara' && this.targetCols(v).some(tx => World.get(tx, row) === T.IRONORE) && !(s.hardT > 0)) {
            s.hardT = 4; Sound.say('Too hard! Drill and blast the rock first.');
          }
        }
      }
      if (s.mode === 'dump' && s.anim < 0.3 && !s.done) {
        s.done = true;
        const truck = Vehicles.list.find(o => o.def.hauls && Math.abs(o.body.x - (v.body.x + v.facing * 110)) < o.body.w / 2 + 70 && Math.abs(o.body.y - v.body.y) < 100);
        if (truck) {
          const cap = truck.def.cap || 12, ore = s.load.filter(id => id === T.BROKENORE).length;
          truck.s.load = Math.min(cap, truck.s.load + s.load.length);
          truck.s.ore = Math.min(truck.s.load, (truck.s.ore || 0) + ore);
          if (truck.s.load >= cap && v.driver === Player) Sound.say('The truck is full! Drive it away and tip it out.');
          Fx.burst(truck.body.x, truck.body.y - 60, 12, { speed: 140, g: 600, life: 0.6, r: 6, color: ['#a0662e', '#8a5524'], shape: 'rect' });
          Sound.dig(); Sound.collect();
          if (v.driver === Player) { Game.addStars(1); Hud.starBump = 1; }
        } else {
          const cols = this.targetCols(v);
          s.load.forEach((id, i) => dropTileInColumn(cols[i % 3], id, row - 6));
          Sound.place(); Sound.dig();
        }
        s.load = [];
      }
    } else if (inp.actionP) {
      s.mode = s.load.length ? 'dump' : 'scoop';
      s.anim = 0.6; s.done = false;
    }
    // Bucket target in local space.
    const rowY = row * TS + TS / 2 - v.body.y;
    const raised = s.load.length > 0 || (s.anim > 0 && s.anim < 0.3);
    const tx = TS * 1.5 + v.body.w / 2 + 4, ty = raised ? -96 : clamp(rowY, -150, 150);
    s.bx = lerp(s.bx, tx, Math.min(1, dt * 10));
    s.by = lerp(s.by, ty, Math.min(1, dt * 10));
    s.slow = s.anim > 0 ? 0.2 : 1;
  },
  draw(c, v) {
    const s = v.s;
    drawTracks(c, -44, 30, 0, 22, v.wheel);
    drawStack(c, -34, -46, 16);
    rbox(c, -40, -48, 62, 28, 8, '#ffc21a');
    rbox(c, -52, -46, 16, 22, 6, '#495057', 3);   // counterweight
    c.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 3; i++) c.fillRect(-28 + i * 8, -42, 4, 14);   // engine grille
    cabWindow(c, v, -30, -86, 40, 40, 10, [-8, -50, 0.5]);
    rbox(c, -34, -92, 48, 10, 5, '#ffc21a');
    // Arm: boom to elbow to bucket.
    const px = 16, py = -50;
    const bx = s.bx || 90, by = s.by || -70;
    const ex = (px + bx) / 2 + 6, ey = Math.min(py, by) - 46;
    limb(c, [px, py, ex, ey], 13, '#ffc21a');
    limb(c, [ex, ey, bx, by - 10], 10, '#ffc21a');
    drawRam(c, px - 4, py + 8, lerp(px, ex, 0.6), lerp(py, ey, 0.6) + 6);       // boom ram
    drawRam(c, lerp(px, ex, 0.75), lerp(py, ey, 0.75) - 8, lerp(ex, bx, 0.45), lerp(ey, by, 0.45) - 8);   // stick ram
    ell(c, ex, ey, 6, 6, '#555', 3);
    const tilt = (s.anim > 0 && s.mode === 'dump') ? 1.2 : (s.anim > 0.3 ? -0.8 : 0);
    c.save(); c.translate(bx, by); c.rotate(tilt);
    poly(c, [-14, -18, 16, -18, 16, 4, 6, 14, -14, 10], '#6b6f78', 4);
    for (let i = 0; i < 3; i++) poly(c, [-12 + i * 9, 10, -8 + i * 9, 18, -4 + i * 9, 11], '#c9cdd4', 2);
    if (s.load && s.load.length) ell(c, 0, -18, 16, 8, '#a0662e', 3);
    c.restore();
    // Show where the bucket will dig when the player drives.
    if (v.driver === Player && !(s.load && s.load.length)) {
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.setLineDash([6, 6]); c.lineWidth = 3;
      const rowY = (v.groundRow() + s.aim) * TS - v.body.y;
      const fx0 = Math.floor(v.frontX(6) / TS) * TS;
      const lx = v.facing > 0 ? fx0 - v.body.x : v.body.x - (fx0 + TS);
      c.strokeRect(lx, rowY, TS * 3, TS);
      c.setLineDash([]);
    }
  },
});

// ---------- Dump truck ----------
defVehicle('dumptruck', {
  name: 'Dump truck', exhaust: [16, -76], say: 'Dump truck!', icon: '⤵️', w: 112, h: 66, speed: 260, unlock: 0,
  hauls: true, cap: 12,
  init(v) { v.s.load = 0; v.s.ore = 0; v.s.tip = 0; v.s.tipping = false; },
  act(v, dt, inp) { truckTip(v, dt, inp); },
  draw(c, v) {
    const s = v.s;
    rbox(c, -56, -32, 112, 16, 6, '#555', 4);
    drawRam(c, 10, -30, 10 - Math.sin((s.tip || 0) * 0.7) * 50, -32 - (s.tip || 0) * 40);   // tipping ram
    // Tipping bed hinged at the back.
    c.save(); c.translate(-54, -30); c.rotate(-(s.tip || 0) * 0.7);
    poly(c, [0, 0, 70, 0, 74, -40, -4, -40], '#ff8c1a', 4);
    const fill = Math.min(1, (s.load || 0) / 12);
    if (fill > 0) { c.save(); rrPath(c, 2, -40 - 14 * fill, 70, 20 * fill + 2, 10); c.fillStyle = '#a0662e'; c.fill(); c.restore(); ell(c, 36, -40, 34 * Math.max(0.5, fill), 12 * fill, '#a0662e', 3); }
    c.fillStyle = '#e67700'; c.fillRect(8, -34, 54, 4); c.fillRect(8, -22, 54, 4);
    c.restore();
    drawStack(c, 16, -60, 16);
    rbox(c, 18, -64, 38, 44, 8, '#ff8c1a');
    cabWindow(c, v, 24, -60, 26, 22, 6, [30, -30, 0.38]);
    limb(c, [56, -54, 62, -54, 62, -44], 3, '#343a40', 2); rbox(c, 58, -50, 7, 10, 2, '#adb5bd', 2);   // mirror
    drawHeadlight(c, 55, -30);
    rbox(c, -50, -16, 6, 12, 2, '#343a40', 0);   // mudflap
    drawWheel(c, -34, -12, 14, v.wheel); drawWheel(c, -8, -12, 14, v.wheel); drawWheel(c, 38, -12, 14, v.wheel);
  },
});

// ---------- Bulldozer ----------
defVehicle('bulldozer', {
  name: 'Bulldozer', exhaust: [-6, -64], say: 'Bulldozer! Push push!', icon: '⬆️', w: 90, h: 58, speed: 150, unlock: 3,
  init(v) { v.s.pile = 0; v.s.blade = 0; },
  move(v, dt, inp, dir) {
    const b = v.body, s = v.s;
    // Blade knocks over tiles just above the ground in front.
    if (dir === v.facing && s.pile < 10) {
      const tx = Math.floor(v.frontX(14) / TS);
      const fr = v.feetRow();
      // Shave from the top down, only blocks with open sky above, so it never tunnels.
      for (const ty of [fr - 1, fr]) {
        const id = World.get(tx, ty);
        if (World.solid(tx, ty - 1)) continue;
        if (id !== T.AIR && TILES[id].solid && TILES[id].dig) {
          vehicleDig(tx, ty, false);
          if (LOOSE(id) >= 0) s.pile++;
          Sound.dig();
        }
      }
    }
    b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * (dir ? this.accel : 5)));
    if (dir && dir !== v.facing && s.pile > 0) this.drop(v);
    if (dir) v.facing = dir;
    moveBody(b, dt, { step: 1 });
    vehicleHop(v, dir, dt);
    v.wheel += b.vx * dt / 14;
  },
  drop(v) {
    const s = v.s;
    const tx = Math.floor(v.frontX(20) / TS);
    const cols = [tx, tx + v.facing];
    let k = 0;
    while (s.pile > 0 && k < 20) { dropTileInColumn(cols[k % 2], T.DIRT, v.feetRow() - 5); s.pile--; k++; }
    s.pile = 0;
    Sound.place();
  },
  act(v, dt, inp) {
    if (inp.actionP) { if (v.s.pile > 0) this.drop(v); else Sound.tone(200, 0.2, 'square', 0.08, 300); v.s.blade = 1; }
    v.s.blade = Math.max(0, v.s.blade - dt * 3);
  },
  draw(c, v) {
    const s = v.s;
    drawTracks(c, -44, 30, 0, 22, v.wheel);
    drawStack(c, -6, -46, 14);
    rbox(c, -42, -46, 70, 26, 8, '#ffc21a');
    cabWindow(c, v, -32, -84, 40, 40, 10, [-10, -50, 0.5]);
    rbox(c, -36, -90, 48, 10, 5, '#ffc21a');
    limb(c, [24, -30, 40, -18], 8, '#555');
    drawRam(c, 18, -44, 42, -30 - (s.blade || 0) * 10);       // blade lift ram
    limb(c, [-44, -30, -56, -26, -58, -10], 6, '#6b6f78');   // ripper tooth at the back
    const lift = (s.blade || 0) * 10;
    if (s.pile > 0) ell(c, 58, -14 - lift, 10 + s.pile * 1.8, 8 + s.pile * 1.4, '#a0662e', 3);
    c.beginPath(); c.moveTo(40, -48 - lift); c.quadraticCurveTo(54, -24 - lift, 44, 0 - lift); c.lineTo(50, 0 - lift);
    c.quadraticCurveTo(62, -24 - lift, 46, -50 - lift); c.closePath(); fillStroke(c, '#6b6f78');
  },
});

// ---------- Builder crane ----------
defVehicle('crane', {
  name: 'Crane', iconScale: 0.36, iconX: -25, say: 'Crane! Let us build!', icon: '🧱', dirs: 'all', w: 110, h: 70, speed: 180, unlock: 5, builds: true,
  init(v) { v.s.reach = 3; v.s.falling = null; v.s.rep = 0; },
  hook(v) {
    const col = Math.floor((v.body.x + v.facing * (v.body.w / 2 + v.s.reach * TS - TS / 2)) / TS);
    const hookRow = v.feetRow() - 8;
    return { col, hookRow };
  },
  act(v, dt, inp) {
    const s = v.s;
    s.rep -= dt;
    if (inp.upP || (inp.up && s.rep < 0)) { s.reach = Math.min(8, s.reach + 1); s.rep = 0.2; }
    if (inp.downP || (inp.down && s.rep < 0)) { s.reach = Math.max(1, s.reach - 1); s.rep = 0.2; }
    if (inp.actionP && !s.falling) this.release(v, BUILD_BLOCKS[v.driver === Player ? Player.block : 1]);
    if (s.falling) {
      const f = s.falling;
      f.vy += 1400 * dt; f.y += f.vy * dt;
      if (f.y >= f.row * TS) {
        if (!dropTileInColumn(f.col, f.id, f.row - 1)) Sound.bonk();
        else { Sound.place(); Fx.burst(f.col * TS + 16, f.row * TS + 30, 6, { speed: 90, life: 0.4, r: 5, color: '#fff' }); }
        s.falling = null;
      }
    }
    s.slow = 1;
  },
  release(v, id, col) {
    const s = v.s;
    const h = this.hook(v);
    if (col !== undefined) h.col = col;
    const land = World.groundBelow(h.col, h.hookRow + 1);
    if (land - 1 <= h.hookRow) { Sound.bonk(); return; }
    s.falling = { id, col: h.col, y: (h.hookRow + 1) * TS, vy: 0, row: land - 1 };
    Sound.tone(500, 0.1, 'triangle', 0.1, 300);
  },
  tapTile(v, tx, ty) {
    const h = this.hook(v);
    const minC = Math.min(h.col, Math.floor(v.frontX(4) / TS)), maxC = Math.max(h.col, Math.floor((v.body.x + v.facing * (v.body.w / 2 + 8 * TS)) / TS));
    if (tx < Math.min(minC, maxC) || tx > Math.max(minC, maxC)) return;
    v.s.reach = clamp(Math.round(((tx * TS + TS / 2) - v.body.x) * v.facing / TS - v.body.w / 2 / TS + 0.5), 1, 8);
    if (!v.s.falling) this.release(v, BUILD_BLOCKS[Player.block]);
  },
  draw(c, v) {
    const s = v.s;
    rbox(c, -56, -36, 112, 18, 6, '#555', 4);
    const legs = Math.abs(v.body.vx) < 10 && v.driver ? 1 : 0;
    v.s.legs = lerp(v.s.legs || 0, legs, 0.08);
    drawOutrigger(c, -52, -26, v.s.legs); drawOutrigger(c, 52, -26, v.s.legs);
    drawWheel(c, -36, -14, 14, v.wheel); drawWheel(c, -6, -14, 14, v.wheel); drawWheel(c, 34, -14, 14, v.wheel);
    rbox(c, -62, -62, 16, 24, 4, '#495057', 3);   // counterweight
    rbox(c, -50, -66, 60, 32, 8, '#ffa94d');
    cabWindow(c, v, 14, -70, 34, 34, 8, [26, -38, 0.42]);
    const reachPx = v.def.w / 2 + (s.reach || 3) * TS - TS / 2;
    const topY = -8 * TS - 6;
    // Lattice boom from cab to the hook position.
    const bx0 = -20, by0 = -64, bx1 = reachPx, by1 = topY + 4;
    limb(c, [bx0, by0, bx1, by1], 12, '#ffd43b');
    c.strokeStyle = '#e8a400'; c.lineWidth = 2;
    for (let k = 0; k < 1; k += 0.1) {
      const x = lerp(bx0, bx1, k), y = lerp(by0, by1, k);
      c.beginPath(); c.moveTo(x - 4, y - 4); c.lineTo(x + 4, y + 4); c.stroke();
    }
    // Hook line and block.
    c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(bx1, by1); c.lineTo(bx1, by1 + 28); c.stroke();
    if (!s.falling) {
      c.save(); c.translate(bx1 - TS / 2, by1 + 28);
      const id = BUILD_BLOCKS[v.driver === Player ? Player.block : 1];
      TILES[id].draw(c, 0, 0, 3, 3); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(0, 0, TS, TS);
      c.restore();
    }
    poly(c, [bx1 - 6, by1 + 22, bx1 + 6, by1 + 22, bx1, by1 + 30], '#777', 2);
  },
  drawWorld(c, v) {
    const s = v.s;
    if (s.falling) {
      TILES[s.falling.id].draw(c, s.falling.col * TS, s.falling.y, 3, 3);
      c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(s.falling.col * TS, s.falling.y, TS, TS);
    } else if (v.driver === Player) {
      // Ghost of where the block will land.
      const h = this.hook(v);
      const land = World.groundBelow(h.col, h.hookRow + 1);
      if (land - 1 > h.hookRow) {
        c.strokeStyle = 'rgba(255,255,255,0.9)'; c.setLineDash([5, 5]); c.lineWidth = 3;
        c.strokeRect(h.col * TS + 2, (land - 1) * TS + 2, TS - 4, TS - 4); c.setLineDash([]);
      }
    }
  },
});

// ---------- Wrecking ball ----------
defVehicle('wrecker', {
  name: 'Wrecking ball', iconScale: 0.4, iconX: -10, say: 'Wrecking ball! Smash!', icon: '💥', w: 104, h: 66, speed: 160, accel: 2, unlock: 15,
  init(v) { v.s.th = 0; v.s.om = 0; v.s.lastVx = 0; },
  tip(v) { return { x: v.body.x + v.facing * 70, y: v.body.y - 210 }; },
  act(v, dt, inp) {
    const s = v.s, L = 160;
    const ax = (v.body.vx - s.lastVx) / Math.max(dt, 1e-3);
    s.lastVx = v.body.vx;
    if (inp.actionP) { s.om += v.facing * 3.2; Sound.tone(160, 0.3, 'sawtooth', 0.06, 260); }
    s.om += (-(GRAVITY / L) * Math.sin(s.th) - ax / L * Math.cos(s.th) * 0.6) * dt;
    s.om *= 1 - 0.25 * dt;
    s.th += s.om * dt;
    const tip = this.tip(v);
    const bx = tip.x + Math.sin(s.th) * L, by = tip.y + Math.cos(s.th) * L;
    const speed = Math.abs(s.om) * L;
    // Hit tiles around the ball.
    const r = 26;
    let hit = false;
    for (let ty = Math.floor((by - r) / TS); ty <= Math.floor((by + r) / TS); ty++) {
      for (let tx = Math.floor((bx - r) / TS); tx <= Math.floor((bx + r) / TS); tx++) {
        if (!World.solid(tx, ty)) continue;
        const cx = clamp(bx, tx * TS, tx * TS + TS), cy = clamp(by, ty * TS, ty * TS + TS);
        if (dist(cx, cy, bx, by) > r) continue;
        if (speed > 140 && TILES[World.get(tx, ty)].dig) { vehicleDig(tx, ty, true); hit = true; }
        else if (!hit) { s.om = -s.om * 0.4; s.th += s.om * dt * 2; Sound.bonk(); hit = true; }
      }
    }
    if (hit && speed > 140) { s.om *= 0.8; Sound.bonk(); Sound.dig(); }
    s.ball = { x: bx, y: by };
  },
  draw(c, v) {
    rbox(c, -52, -36, 104, 18, 6, '#555', 4);
    drawWheel(c, -32, -14, 14, v.wheel); drawWheel(c, 0, -14, 14, v.wheel); drawWheel(c, 32, -14, 14, v.wheel);
    rbox(c, -46, -70, 60, 36, 8, '#ff6b6b');
    cabWindow(c, v, 12, -72, 34, 36, 8, [24, -40, 0.42]);
    limb(c, [-20, -66, 70, -210], 12, '#ffd43b');
    ell(c, -36, -46, 12, 12, '#555', 3);
  },
  drawWorld(c, v) {
    const s = v.s;
    const tip = this.tip(v);
    const ball = s.ball || { x: tip.x, y: tip.y + 160 };
    c.strokeStyle = '#555'; c.lineWidth = 4; c.beginPath(); c.moveTo(tip.x, tip.y); c.lineTo(ball.x, ball.y); c.stroke();
    ell(c, ball.x, ball.y, 26, 26, '#3a3a44', 4);
    ell(c, ball.x - 8, ball.y - 9, 7, 5, 'rgba(255,255,255,0.35)', 0);
  },
});

// ---------- Drill rig ----------
defVehicle('drill', {
  name: 'Drill', iconScale: 0.5, say: 'Drill! Down down down!', icon: '🌀', w: 92, h: 70, speed: 170, unlock: 20,
  init(v) { v.s.depth = 0; },
  col(v) { return Math.floor(v.frontX(18) / TS); },
  act(v, dt, inp) {
    const s = v.s;
    const top = v.body.y - 4;
    if (inp.action) {
      const tipY = top + s.depth + 20;
      const ty = Math.floor(tipY / TS), tx = this.col(v);
      const id = World.get(tx, ty);
      if (TILES[id].solid) {
        if (TILES[id].dig) { s.grind = (s.grind || 0) + dt; if (s.grind > 0.15) { vehicleDig(tx, ty, true); s.grind = 0; } }
      } else s.depth = Math.min(40 * TS, s.depth + 260 * dt);
      if (Math.random() < 0.3) Sound.noise(0.05, 0.08, 'bandpass', 900);
    } else s.depth = Math.max(0, s.depth - 500 * dt);
    s.slow = s.depth > 0 ? 0 : 1;
    s.spin = (s.spin || 0) + (inp.action ? dt * 20 : 0);
  },
  draw(c, v) {
    drawTracks(c, -46, 40, 0, 22, v.wheel);
    rbox(c, -44, -50, 60, 30, 8, '#4dabf7');
    cabWindow(c, v, -36, -86, 38, 38, 10, [-16, -50, 0.48]);
    rbox(c, -40, -92, 46, 10, 5, '#4dabf7');
    rbox(c, 30, -150, 16, 130, 4, '#ffd43b');
    c.strokeStyle = '#e8a400'; c.lineWidth = 2;
    for (let y = -146; y < -24; y += 14) { c.beginPath(); c.moveTo(32, y); c.lineTo(44, y + 12); c.stroke(); }
  },
  drawWorld(c, v) {
    const s = v.s;
    const x = this.col(v) * TS + TS / 2, y0 = v.body.y - 24;
    const len = s.depth + 44;
    rbox(c, x - 6, y0 - 4, 12, len - 10, 3, '#9aa0aa', 3);
    c.save(); c.translate(x, y0 + len - 14);
    const sp = s.spin || 0;
    poly(c, [-12, -12, 12, -12, 0, 16], '#c9cdd4', 3);
    c.strokeStyle = OUT; c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const yy = -10 + ((i * 8 + sp * 6) % 24); c.beginPath(); c.moveTo(-10 + Math.abs(yy) * 0.1, yy); c.lineTo(10, yy + 4); c.stroke(); }
    c.restore();
  },
});
