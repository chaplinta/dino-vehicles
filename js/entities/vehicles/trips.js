// Vehicles waiting at the jet's far-away stops: a safari jeep in Africa and a snowmobile in Antarctica.

// ---------- Safari jeep ----------
defVehicle('safari', {
  name: 'Safari jeep', say: 'Safari jeep! Let\'s find some animals!', icon: '📷', w: 120, h: 70, speed: 280, step: 1, noSave: true, exhaust: [-60, -16],
  init(v) { v.s.flash = 0; },
  // The button takes a photo of the nearest animal ahead.
  act(v, dt, inp) {
    v.s.flash = Math.max(0, v.s.flash - dt * 3);
    if (inp.actionP) { v.s.flash = 1; Wildlife.snap(Wildlife.photoTarget(v.body.x, v.body.y - 50, v.facing, 460)); }
  },
  draw(c, v) {
    const s = v.s;
    // Roll bar and striped sun roof.
    limb(c, [-40, -40, -40, -96], 5, '#495057'); limb(c, [26, -40, 26, -96], 5, '#495057');
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fff' : '#212529'; c.fillRect(-46 + i * 13, -104, 13, 10); }
    c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(-46, -104, 78, 10);
    // Body: open-top 4x4, sand coloured, with a spare wheel on the back.
    c.beginPath(); c.moveTo(-60, -14); c.lineTo(-60, -48); c.lineTo(36, -48); c.lineTo(46, -40); c.lineTo(60, -38); c.lineTo(60, -14); c.closePath(); fillStroke(c, '#c2a46b');
    rbox(c, 30, -66, 6, 22, 2, '#bdf3ff', 2);   // windscreen
    v.drawDriver(c, 4, -44, 0.32);
    drawWheel(c, -64, -34, 12, 0, '#868e96');
    // A camera on a stand: flashes when you take a photo.
    limb(c, [-20, -48, -20, -70], 3, '#212529');
    rbox(c, -32, -86, 24, 16, 3, '#343a40', 2); ell(c, -10, -78, 5, 5, '#74c0fc', 2);
    if (s.flash > 0) { c.fillStyle = `rgba(255,255,220,${s.flash * 0.8})`; c.beginPath(); c.arc(-8, -78, 10 + s.flash * 30, 0, TAU); c.fill(); }
    ell(c, 56, -30, 5, 4, '#fff3bf', 2);
    drawWheel(c, -34, -14, 15, v.wheel); drawWheel(c, 34, -14, 15, v.wheel);
  },
});

// ---------- Snowmobile ----------
defVehicle('snowmobile', {
  name: 'Snowmobile', say: 'Snowmobile! Zoom across the ice!', icon: '💡', w: 100, h: 56, speed: 380, step: 1, noSave: true, exhaust: [-50, -18],
  init(v) { v.s.flash = 0; },
  act(v, dt, inp) { flashToot(v, inp, dt); },
  draw(c, v) {
    const lit = v.s.flash > 0;
    // Skis at the front, a rubber track at the back.
    limb(c, [10, -14, 54, -6], 4, '#495057');
    c.beginPath(); c.moveTo(4, -2); c.lineTo(52, -2); c.quadraticCurveTo(64, -2, 62, -12); c.stroke();
    rbox(c, -50, -24, 56, 18, 8, '#343a40', 3);
    for (let i = 0; i < 5; i++) ell(c, -42 + i * 11, -15, 3, 3, '#868e96', 0);
    // Body and seat.
    c.beginPath(); c.moveTo(-48, -24); c.lineTo(-40, -42); c.lineTo(20, -46); c.lineTo(50, -30); c.lineTo(40, -20); c.lineTo(-48, -20); c.closePath(); fillStroke(c, '#e03131');
    rbox(c, -40, -52, 40, 10, 4, '#212529', 2);
    poly(c, [20, -46, 30, -66, 36, -64, 32, -44], 'rgba(189,243,255,0.8)', 2);   // windscreen
    v.drawDriver(c, -18, -48, 0.32);
    ell(c, 48, -30, 5, 4, lit ? '#fff' : '#fff3bf', 2);
    if (lit) { c.fillStyle = 'rgba(255,250,200,0.5)'; c.beginPath(); c.moveTo(52, -30); c.lineTo(130, -46); c.lineTo(130, -12); c.closePath(); c.fill(); }
  },
});

// ---------- Hägglunds ----------
// The two-cabin tracked carrier scientists use in Antarctica. It floats, so it drives straight into the sea and paddles across.
defVehicle('hagglunds', {
  name: 'Hägglunds', say: 'Hägglunds! It can even swim!', icon: '🟠', w: 150, h: 72, speed: 220, draft: 30, noSave: true, exhaust: [-74, -40],
  init(v) { v.s.flash = 0; },
  move(v, dt, inp, dir) {
    const b = v.body;
    if (waterSurfaceY(b.x, b.y) !== null) boatMove(v, dt, inp, dir, 260);
    else {
      b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * (dir ? 2.5 : 5)));
      if (dir) v.facing = dir;
      moveBody(b, dt, { step: 1 });
      vehicleHop(v, dir, dt);
      v.floating = false;
    }
    v.wheel += b.vx * dt / 14;
  },
  act(v, dt, inp) { flashToot(v, inp, dt); },
  draw(c, v) {
    const lit = v.s.flash > 0 && Math.floor(v.s.flash * 8) % 2;
    // Two orange cabins on rubber tracks, joined in the middle.
    for (const [x0, w] of [[-74, 66], [6, 70]]) {
      rbox(c, x0, -24, w, 18, 9, '#343a40', 3);
      for (let i = 0; i < 4; i++) ell(c, x0 + 10 + i * (w - 20) / 3, -15, 5, 5, '#868e96', 2);
      rbox(c, x0 + 2, -66, w - 4, 44, 8, '#ff922b', 4);
    }
    rbox(c, -10, -40, 18, 12, 3, '#495057', 2);   // the joint
    for (const x of [-64, -40]) rbox(c, x, -58, 18, 16, 4, '#bdf3ff', 2);
    c.save(); rbox(c, 40, -60, 30, 22, 5, '#bdf3ff', 2); c.clip(); v.drawDriver(c, 54, -36, 0.3); c.restore();
    rbox(c, 40, -60, 30, 22, 5, null, 2);
    rbox(c, 18, -76, 10, 10, 3, lit ? '#ffd43b' : '#e8590c', 2);   // beacon
    if (lit) { c.fillStyle = 'rgba(255,212,59,0.35)'; c.beginPath(); c.arc(23, -72, 22, 0, TAU); c.fill(); }
  },
});

// ---------- Icebreaker ----------
// A red research ship with a strong bow that smashes through the sea ice.
defVehicle('icebreaker', {
  name: 'Icebreaker', say: 'The icebreaker! Crunch through the ice!', icon: '📯', w: 240, h: 110, speed: 300, draft: 46, horn: 'boat', noSave: true, look: 260, camY: -60,
  move(v, dt, inp, dir) { boatMove(v, dt, inp, dir, this.speed); },
  act(v, dt, inp) {
    const b = v.body;
    if (inp.actionP) v.hornSound();
    // Floe ice at the bow breaks up.
    for (let k = -1; k <= 2; k++) {
    const tx = Math.floor(v.frontX(k * TS) / TS);
    if (World.get(tx, SURF) === T.ICE && World.get(tx, SURF + 1) === T.WATER) {
      World.set(tx, SURF, T.WATER);
      Fx.burst(tx * TS + 16, SURF * TS, 12, { speed: 160, up: 200, g: 600, life: 0.9, r: 7, color: ['#e7f5ff', '#a5d8ff', '#fff'], shape: 'rect' });
      Sound.noise(0.25, 0.25, 'bandpass', 1200);
      Pow.add(tx * TS + 16, SURF * TS - 60, 'CRUNCH!');
    }
    }
    if (v.driver && Math.random() < 0.15) Fx.add({ x: b.x - v.facing * 10, y: b.y - 150, vx: rand(-10, 10), vy: -40, life: 1.4, r: 10, color: 'rgba(230,230,230,0.7)', shape: 'grow' });
  },
  draw(c, v) {
    // Hull: red with a raised ice-breaking bow.
    c.beginPath(); c.moveTo(-120, -64); c.lineTo(-112, -6); c.quadraticCurveTo(0, 10, 100, -6); c.lineTo(122, -60); c.closePath();
    fillStroke(c, '#e03131', 5);
    c.fillStyle = '#fff'; c.fillRect(-110, -36, 216, 5);
    // White superstructure, bridge windows, a funnel and a helideck at the back.
    rbox(c, -40, -118, 90, 56, 6, '#f8f9fa', 4);
    rbox(c, -20, -142, 60, 26, 5, '#f8f9fa', 4);
    for (let i = 0; i < 4; i++) rbox(c, -14 + i * 13, -136, 9, 12, 2, '#74c0fc', 2);
    c.save(); rbox(c, -30, -104, 70, 22, 4, '#bdf3ff', 2); c.clip(); v.drawDriver(c, 20, -84, 0.3); c.restore();
    rbox(c, -76, -126, 22, 58, 4, '#e03131', 3); c.fillStyle = '#212529'; c.fillRect(-76, -126, 22, 8);
    rbox(c, -118, -72, 60, 8, 3, '#495057', 3); c.font = `800 12px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffd43b';
    vehicleText(c, v, 'H', -88, -68);
    limb(c, [10, -142, 10, -170], 3, '#495057'); ell(c, 10, -172, 6, 4, '#ced4da', 2);
  },
});
