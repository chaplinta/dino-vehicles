// Snow plough: a truck with a big angled blade that throws the snow off the road as it drives.
defVehicle('plough', {
  name: 'Snow plough', say: 'Snow plough! Clear the road!', icon: '🟠', w: 120, h: 62, speed: 220, exhaust: [-52, -20],
  init(v) { v.s.flash = 0; },
  move(v, dt, inp, dir) {
    const b = v.body;
    // The blade scoops any snow sitting on top of the ground in front.
    if (dir === v.facing) {
      const tx = Math.floor(v.frontX(16) / TS), fr = v.feetRow();
      for (const ty of [fr - 1, fr]) {
        if (World.get(tx, ty) !== T.SNOW) continue;
        World.set(tx, ty, T.AIR);
        Fx.burst(tx * TS + 16, ty * TS + 10, 8, { speed: 160, up: 220, g: 600, life: 0.8, r: 7, color: ['#fff', '#e7f5ff'] });
        Sound.noise(0.12, 0.1, 'highpass', 1200);
      }
    }
    b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * (dir ? 2.5 : 5)));
    if (dir) v.facing = dir;
    moveBody(b, dt, { step: 1 });
    vehicleHop(v, dir, dt);
    v.wheel += b.vx * dt / 16;
  },
  // Button: the orange light flashes and the horn goes.
  act(v, dt, inp) { flashToot(v, inp, dt); },
  draw(c, v) {
    const s = v.s, lit = Math.floor(v.t * 6) % 2 || s.flash > 0;
    rbox(c, -58, -40, 88, 26, 6, '#ff922b');
    rbox(c, -10, -84, 40, 46, 8, '#ff922b');
    c.save(); rbox(c, -4, -78, 28, 22, 5, '#bdf3ff', 3); c.clip(); v.drawDriver(c, 10, -46, 0.3); c.restore();
    rbox(c, 2, -96, 16, 12, 4, lit ? '#ffd43b' : '#e8590c', 3);
    if (lit) { c.fillStyle = 'rgba(255,212,59,0.35)'; c.beginPath(); c.arc(10, -90, 26, 0, TAU); c.fill(); }
    rbox(c, -54, -60, 40, 22, 4, '#495057', 3);   // grit spreader
    for (let i = 0; i < 3; i++) ell(c, -46 + i * 12, -62, 4, 3, '#adb5bd', 1.5);
    limb(c, [30, -26, 46, -20], 7, '#555');
    c.beginPath(); c.moveTo(44, -52); c.quadraticCurveTo(66, -30, 52, 0); c.lineTo(62, 0); c.quadraticCurveTo(78, -30, 52, -54); c.closePath(); fillStroke(c, '#fab005');
    for (let i = 0; i < 3; i++) { c.fillStyle = OUT; c.fillRect(52 + i * 3, -44 + i * 14, 8, 5); }
    drawWheel(c, -38, -14, 15, v.wheel); drawWheel(c, 14, -14, 15, v.wheel);
  },
});
