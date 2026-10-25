// Melbourne: a green and gold W-class tram, and the bike-share bikes.

// ---------- Tram ----------
defVehicle('tram', {
  name: 'Tram', say: 'Ding ding! The Melbourne tram!', icon: '🔔', w: 170, h: 96, mover: 'rail', speed: 260, seats: 6, look: 240, noSave: true,
  canExit() { return true; },
  move(v, dt, inp, dir) {
    const b = v.body;
    b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * (dir ? 0.9 : 2)));
    if (dir) v.facing = dir;
    b.x = clamp(b.x + b.vx * dt, MEL.TRAM[0] * TS, MEL.TRAM[1] * TS);
    if (b.x <= MEL.TRAM[0] * TS || b.x >= MEL.TRAM[1] * TS) b.vx = 0;   // end of the line
    b.y = TRACK_Y - 4;
    v.wheel += b.vx * dt / 12;
    // Sparks off the wire now and then.
    if (Math.abs(b.vx) > 120 && Math.random() < 0.03) Fx.burst(b.x - v.facing * 10, b.y - 196, 4, { speed: 80, life: 0.3, r: 3, color: ['#fff3bf', '#74c0fc'] });
  },
  act(v, dt, inp) {
    if (inp.actionP) { Sound.tone(1568, 0.25, 'sine', 0.12); Sound.tone(1568, 0.25, 'sine', 0.12, null, 0.28); }   // ding ding
    const st = World.props.find(p => p.type === 'tramstop' && Math.abs(p.x * TS - v.body.x) < 90);
    if (st && Math.abs(v.body.vx) < 20 && v.lastStop !== st) {
      v.lastStop = st;
      if (v.driver === Player) { Sound.tone(660, 0.2, 'triangle', 0.1); Sound.tone(880, 0.3, 'triangle', 0.1, null, 0.22); }
    }
    if (!st) v.lastStop = null;
  },
  draw(c, v) {
    // Trolley pole up to the overhead wire.
    limb(c, [-20, -92, 30, -192], 4, '#343a40');
    ell(c, 30, -192, 5, 4, '#343a40', 0);
    // Long body: green below, gold band, cream windows.
    rbox(c, -84, -94, 168, 78, 14, '#2b8a3e');
    c.fillStyle = '#ffd43b'; c.fillRect(-82, -46, 164, 8);
    rbox(c, -88, -100, 176, 10, 5, '#5c3d1e', 3);
    for (let i = 0; i < 5; i++) {
      const wx = -74 + i * 30;
      rbox(c, wx, -84, 24, 30, 6, '#fff9db', 3);
      c.save(); rrPath(c, wx, -84, 24, 30, 6); c.clip();
      if (i === 4) v.drawDriver(c, wx + 12, -56, 0.3);
      else { const n = (v.passengers || [])[i]; if (n) drawDinoSeated(c, wx + 10, -56, 0.28, n.type, { t: v.t + i, blinkSeed: n.blinkSeed }); }
      c.restore();
      rrPath(c, wx, -84, 24, 30, 6); fillStroke(c, null, 3);
    }
    // Route number box up front, a door, and the bogies.
    rbox(c, 58, -88, 22, 16, 3, '#212529', 2);
    c.font = `800 11px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffd43b'; c.fillText('35', 69, -80);
    rbox(c, 60, -66, 18, 44, 4, '#1e6b34', 3);
    ell(c, 82, -30, 5, 4, '#fff3bf', 2);
    for (const bx of [-52, 52]) { rbox(c, bx - 26, -22, 52, 10, 4, '#343a40', 2); drawWheel(c, bx - 14, -10, 10, v.wheel); drawWheel(c, bx + 14, -10, 10, v.wheel); }
  },
});

// ---------- City bike ----------
defVehicle('citybike', {
  name: 'Bike', say: 'Bike ride! Pedal pedal!', icon: '⤴️', w: 60, h: 52, speed: 270, accel: 3, look: 200,
  act(v, dt, inp) {
    const b = v.body;
    if (inp.actionP && b.onGround) { b.vy = -560; Sound.jump(); }
    if (inp.roar) { /* the horn button rings the bell, below */ }
  },
  draw(c, v) {
    for (const wx of [-22, 22]) {
      ell(c, wx, -14, 14, 14, null, 3);
      c.save(); c.translate(wx, -14); c.rotate(v.wheel); c.strokeStyle = '#adb5bd'; c.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(13, 0); c.stroke(); }
      c.restore();
    }
    // Step-through frame, basket, pedals going round.
    limb(c, [-22, -14, -2, -14, 14, -38], 4, '#1c7ed6');
    limb(c, [-6, -38, -2, -14], 4, '#1c7ed6');
    limb(c, [22, -14, 14, -38, 18, -46], 4, '#1c7ed6');
    rbox(c, 18, -44, 16, 12, 3, '#ffe066', 2);
    rbox(c, -14, -42, 16, 5, 3, '#343a40', 2);
    const a = v.wheel * 1.3;
    limb(c, [-2 + Math.cos(a) * 7, -14 + Math.sin(a) * 7, -2 - Math.cos(a) * 7, -14 - Math.sin(a) * 7], 3, '#495057');
    v.drawDriver(c, -6, -40, 0.4);
  },
});
