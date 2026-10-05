// Steam train on the background track. Mountains it passes behind become tunnels.
defVehicle('train', {
  name: 'Train', iconScale: 0.3, iconX: 50, say: 'Train! Choo choo! All aboard!', icon: '💨', w: 120, h: 80, mover: 'rail', speed: 380, horn: 'whistle', unlock: 0, seats: 6, back: true, look: 220,
  canExit(v) { return !World.solid(Math.floor(v.body.x / TS), SURF - 1) && !World.solid(Math.floor(v.body.x / TS), SURF - 2); },
  move(v, dt, inp, dir) {
    const b = v.body;
    b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * (dir ? 0.8 : 1.5)));
    if (dir) v.facing = dir;
    b.x = clamp(b.x + b.vx * dt, 6 * TS, (WORLD_W - 6) * TS);
    b.y = TRACK_Y - 6;
    v.wheel += b.vx * dt / 14;
    if (Math.abs(b.vx) > 40 && Math.random() < Math.abs(b.vx) / 2000) {
      Fx.add({ x: b.x + v.facing * 36, y: b.y - 96, vx: -b.vx * 0.3 + rand(-10, 10), vy: rand(-60, -30), life: 1.6, r: 10, color: 'rgba(245,245,245,0.85)', shape: 'grow' });
      if (Math.random() < 0.3) Sound.noise(0.08, 0.04, 'lowpass', 500);
    }
  },
  act(v, dt, inp) {
    if (inp.actionP) v.hornSound();
    // Station stop announcement.
    const st = World.props.find(p => p.type === 'station' && Math.abs(p.x * TS - v.body.x) < 80);
    if (st && Math.abs(v.body.vx) < 20 && v.lastStation !== st) {
      v.lastStation = st;
      if (v.driver === Player) { Sound.tone(660, 0.2, 'triangle', 0.1); Sound.tone(880, 0.3, 'triangle', 0.1, null, 0.22); }
    }
    if (!st) v.lastStation = null;
  },
  carriages(v) { return [1, 2]; },
  draw(c, v) {
    // Carriages trail behind the engine.
    for (const k of [1, 2]) {
      const ox = -k * 124;
      rbox(c, ox - 56, -84, 112, 66, 10, k === 1 ? '#4dabf7' : '#ffd43b');
      rbox(c, ox - 62, -92, 124, 12, 6, '#e8590c');
      for (let i = 0; i < 3; i++) {
        const wx = ox - 46 + i * 34;
        rbox(c, wx, -74, 26, 26, 6, '#bdf3ff', 3);
        c.save(); rrPath(c, wx, -74, 26, 26, 6); c.clip();
        const n = (v.passengers || [])[(k - 1) * 3 + i];
        if (n) drawDinoSeated(c, wx + 10, -46, 0.3, n.type, { t: v.t + i, blinkSeed: n.blinkSeed });
        c.restore();
        rrPath(c, wx, -74, 26, 26, 6); fillStroke(c, null, 3);
      }
      drawWheel(c, ox - 32, -12, 13, v.wheel); drawWheel(c, ox + 32, -12, 13, v.wheel);
      limb(c, [ox + 56, -26, ox + 68, -26], 4, '#555');
    }
    // Engine.
    rbox(c, -58, -96, 50, 78, 8, '#e8262b');
    rbox(c, -64, -104, 62, 12, 6, OUT, 0);
    cabWindow(c, v, -50, -88, 34, 30, 6, [-34, -56, 0.42]);
    rbox(c, -10, -66, 62, 46, 22, '#2b8a3e');
    rbox(c, 24, -100, 18, 36, 4, '#495057');
    rbox(c, 18, -108, 30, 10, 4, '#495057');
    ell(c, 52, -44, 8, 8, '#ffe066', 3);
    poly(c, [44, -18, 66, -18, 52, -34], '#adb5bd', 3);
    drawWheel(c, -38, -16, 16, v.wheel, '#e8262b'); drawWheel(c, 0, -14, 14, v.wheel, '#e8262b'); drawWheel(c, 32, -14, 14, v.wheel, '#e8262b');
    limb(c, [-38 + Math.cos(v.wheel) * 8, -16 + Math.sin(v.wheel) * 8, 32 + Math.cos(v.wheel) * 8, -14 + Math.sin(v.wheel) * 8], 4, '#adb5bd', 2);
  },
});
