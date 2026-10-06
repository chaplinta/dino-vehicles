// Town vehicles: fire truck, ambulance, police car, garbage truck.

function drawPassengers(c, v, spots) {
  (v.passengers || []).forEach((n, i) => {
    const sp = spots[i];
    if (sp) drawDinoSeated(c, sp[0], sp[1], sp[2], n.type, { t: v.t + i, blinkSeed: n.blinkSeed });
  });
}
function lightBar(c, x, y, t, on) {
  const a = on && Math.floor(t * 6) % 2 === 0;
  rbox(c, x - 14, y - 8, 14, 9, 4, on ? (a ? '#ff4d4d' : '#ffb3b3') : '#e9ecef', 3);
  rbox(c, x, y - 8, 14, 9, 4, on ? (a ? '#a5d8ff' : '#339af0') : '#e9ecef', 3);
  if (on) { c.fillStyle = a ? 'rgba(255,80,80,0.25)' : 'rgba(80,160,255,0.25)'; c.beginPath(); c.arc(x, y - 4, 30, 0, TAU); c.fill(); }
}

// Best hose angle to land water on (tx,ty) from a truck at (x,y) facing `face`.
// Tries angles and checks where each water arc passes the target column.
function fireAim(x, y, face, tx, ty) {
  let best = { aim: 0.5, err: Infinity };
  for (let a = -0.1; a <= 1.5; a += 0.03) {
    const nx = x + face * (-10 + Math.cos(a) * 76), ny = y - 78 - Math.sin(a) * 76;
    const vx = Math.cos(a) * 660, vy = -Math.sin(a) * 660;
    const dx = (tx - nx) * face;
    if (dx < 0) continue;
    const t = dx / vx;
    const err = Math.abs(ny + vy * t + 450 * t * t - ty);
    if (err < best.err) best = { aim: a, err };
  }
  return best;
}

// ---------- Fire truck ----------
defVehicle('firetruck', {
  name: 'Fire truck', say: 'Fire truck! Nee naw nee naw!', icon: '💦', dirs: 'all', w: 130, h: 72, speed: 260, horn: 'siren', unlock: 0,
  init(v) { v.s.aim = 0.5; v.s.spray = 0; },
  act(v, dt, inp) {
    const s = v.s;
    if (inp.up) s.aim = Math.min(1.5, s.aim + dt * 1.4);
    if (inp.down) s.aim = Math.max(-0.1, s.aim - dt * 1.4);
    if (!inp.up && !inp.down) {
      // Auto-aim at the nearest fire in front, so little hands only need the spray button.
      // Turns to face a fire behind it while spraying (if not being steered).
      let best = null, bd = 700;
      for (const f of Fire.cells.values()) {
        const ad = Math.abs(f.x * TS + 16 - v.body.x);
        if (ad < bd) { bd = ad; best = f; }
      }
      if (best) {
        const tx = best.x * TS + 16, ty = best.y * TS + 16;
        let pick = null;
        for (const face of [v.facing, -v.facing]) {
          if (face !== v.facing && (!inp.action || inp.left || inp.right)) continue;
          const sol = fireAim(v.body.x, v.body.y, face, tx, ty);
          if (!pick || sol.err < pick.err - 8) pick = Object.assign(sol, { face });
        }
        if (pick.face !== v.facing) v.facing = pick.face;
        s.aim = lerp(s.aim, pick.aim, Math.min(1, dt * 5));
      }
    }
    if (!inp.action) s.spray = 0;
    if (inp.action) {
      s.spray += dt;
      const L = 76, px = -10, py = -78;
      const nx = px + Math.cos(s.aim) * L, ny = py - Math.sin(s.aim) * L;
      const wx = v.body.x + v.facing * nx, wy = v.body.y + ny;
      Fire.douse(wx, wy + 16, dt * 0.5);   // point-blank: the hose end puts out fire it touches
      for (let k = 0; k < 3; k++) {
        const a = s.aim + rand(-0.05, 0.05), sp = rand(620, 700);
        Water.spray(wx, wy, v.facing * Math.cos(a) * sp + v.body.vx, -Math.sin(a) * sp);
      }
      if (Math.random() < 0.25) Sound.noise(0.08, 0.05, 'highpass', 2500);
    }
    s.lights = v.driver ? 1 : 0;
  },
  draw(c, v) {
    const s = v.s;
    v.s.legs = lerp(v.s.legs || 0, s.spray > 0 && Math.abs(v.body.vx) < 20 ? 1 : 0, 0.1);
    drawOutrigger(c, -58, -24, v.s.legs); drawOutrigger(c, 22, -24, v.s.legs);
    rbox(c, -64, -54, 128, 36, 8, '#e8262b');
    rbox(c, 26, -84, 40, 36, 8, '#e8262b');
    drawHeadlight(c, 64, -30);
    cabWindow(c, v, 32, -80, 26, 26, 6, [40, -50, 0.42]);
    c.fillStyle = '#ffd43b'; c.fillRect(-60, -34, 84, 6);
    for (let i = 0; i < 3; i++) rbox(c, -56 + i * 26, -50, 20, 12, 3, '#c92a2a', 2);
    ell(c, 2, -42, 9, 9, '#ced4da', 3);
    // Ladder/hose boom.
    const L = 76, a = s.aim || 0.5;
    c.save(); c.translate(-10, -60); c.rotate(-a);
    rbox(c, -10, -6, L + 16, 12, 4, '#ced4da', 3);
    c.strokeStyle = OUT; c.lineWidth = 2;
    for (let x = 0; x < L; x += 10) { c.beginPath(); c.moveTo(x, -6); c.lineTo(x, 6); c.stroke(); }
    rbox(c, L + 2, -5, 12, 10, 3, '#ffd43b', 3);
    c.restore();
    ell(c, -10, -60, 8, 8, '#868e96', 3);
    lightBar(c, 46, -84, v.t, s.lights);
    drawWheel(c, -38, -14, 16, v.wheel); drawWheel(c, 40, -14, 16, v.wheel);
  },
});

// ---------- Ambulance ----------
defVehicle('ambulance', {
  name: 'Ambulance', say: 'Ambulance! To the hospital!', icon: '🚨', w: 110, h: 70, speed: 280, horn: 'siren', unlock: 5, seats: 2,
  act(v, dt, inp) { if (inp.actionP) { v.s.lights = !v.s.lights; if (v.s.lights) v.hornSound(); } },
  draw(c, v) {
    rbox(c, -55, -70, 82, 54, 8, '#ffffff');
    rbox(c, 24, -54, 32, 38, 8, '#ffffff');
    cabWindow(c, v, 28, -50, 20, 18, 5, [34, -26, 0.36]);
    rbox(c, -46, -62, 44, 26, 6, '#bdf3ff', 3);
    c.save(); rrPath(c, -46, -62, 44, 26, 6); c.clip();
    drawPassengers(c, v, [[-34, -30, 0.32], [-14, -30, 0.32]]);
    c.restore();
    c.fillStyle = '#e8262b'; c.fillRect(-55, -32, 111, 6);
    c.fillRect(6, -64, 6, 18); c.fillRect(0, -58, 18, 6);
    lightBar(c, -10, -70, v.t, v.s.lights);
    drawWheel(c, -30, -14, 15, v.wheel); drawWheel(c, 34, -14, 15, v.wheel);
  },
});

// ---------- Police car ----------
defVehicle('police', {
  name: 'Police car', say: 'Police car! Woo woo!', icon: '🚨', w: 108, h: 58, speed: 320, horn: 'siren', unlock: 8, seats: 2,
  act(v, dt, inp) { if (inp.actionP) { v.s.lights = !v.s.lights; if (v.s.lights) v.hornSound(); } },
  draw(c, v) {
    c.beginPath(); c.moveTo(-54, -18); c.lineTo(-54, -38); c.lineTo(-30, -40); c.lineTo(-18, -62); c.lineTo(22, -62);
    c.lineTo(34, -40); c.lineTo(54, -36); c.lineTo(54, -18); c.closePath(); fillStroke(c, '#ffffff');
    c.fillStyle = '#3b5bdb'; c.fillRect(-52, -36, 104, 14);
    c.save(); c.beginPath(); c.moveTo(-14, -40); c.lineTo(-6, -58); c.lineTo(18, -58); c.lineTo(28, -40); c.closePath();
    c.fillStyle = '#bdf3ff'; c.fill(); c.clip(); v.drawDriver(c, 12, -24, 0.34); c.restore();
    c.beginPath(); c.moveTo(-14, -40); c.lineTo(-6, -58); c.lineTo(18, -58); c.lineTo(28, -40); c.closePath(); fillStroke(c, null, 3);
    c.save(); c.beginPath(); c.moveTo(-26, -40); c.lineTo(-17, -58); c.lineTo(-9, -58); c.lineTo(-17, -40); c.closePath(); c.fillStyle = '#bdf3ff'; c.fill(); c.clip();
    drawPassengers(c, v, [[-18, -24, 0.3]]); c.restore();
    drawStar(c, -2, -29, 7, 0, '#ffd43b', 2);
    lightBar(c, 4, -62, v.t, v.s.lights);
    drawWheel(c, -30, -16, 15, v.wheel); drawWheel(c, 32, -16, 15, v.wheel);
  },
});

// ---------- Garbage truck ----------
defVehicle('garbage', {
  name: 'Garbage truck', say: 'Garbage truck! Clean up time!', icon: '🗑️', w: 120, h: 72, speed: 220, unlock: 18,
  init(v) { v.s.lift = 0; v.s.full = 0; },
  act(v, dt, inp) {
    const s = v.s;
    if (inp.actionP && s.lift <= 0) {
      const bin = World.props.find(p => p.type === 'bin' && p.full && Math.abs(p.x * TS - v.body.x) < 110);
      s.lift = 1.2;
      if (bin) {
        bin.full = false; bin.refill = rand(40, 80); s.full = Math.min(10, s.full + 1);
        Sound.noise(0.4, 0.2, 'lowpass', 600); Sound.collect();
        if (v.driver === Player) { Game.addStars(1); Game.popupStar(bin.x * TS, bin.y * TS - 40); }
      } else Sound.tone(200, 0.4, 'sawtooth', 0.05, 280);
    }
    s.lift = Math.max(0, s.lift - dt);
    s.slow = s.lift > 0 ? 0.2 : 1;
  },
  draw(c, v) {
    const s = v.s;
    rbox(c, -60, -76, 82, 58, 10, '#40c057');
    c.fillStyle = '#2f9e44'; for (let i = 0; i < 3; i++) c.fillRect(-52 + i * 26, -70, 6, 46);
    rbox(c, 20, -60, 40, 42, 8, '#ffffff');
    cabWindow(c, v, 28, -56, 24, 20, 5, [36, -30, 0.38]);
    const k = Math.sin(Math.min(1, (1.2 - s.lift) / 1.2) * Math.PI) * (s.lift > 0 ? 1 : 0);
    c.save(); c.translate(-62, -40); c.rotate(k * 1.6);
    rbox(c, -26, -6, 26, 28, 4, '#adb5bd', 3);
    c.restore();
    drawWheel(c, -36, -14, 15, v.wheel); drawWheel(c, 36, -14, 15, v.wheel);
  },
});
