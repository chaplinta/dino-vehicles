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
