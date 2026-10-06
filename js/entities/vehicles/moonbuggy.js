// Moon buggy: lives on the Moon, parked by the landing pad. Big bouncy hops in low gravity.
defVehicle('moonbuggy', {
  name: 'Moon buggy', say: 'Moon buggy! Bounce bounce!', icon: '⬆️', w: 104, h: 60, speed: 280, accel: 2.5, noSave: true, look: 200,
  act(v, dt, inp) {
    if (inp.actionP && v.body.onGround) {
      v.body.vy = -560;
      Sound.jump();
      Fx.burst(v.body.x, v.body.y, 12, { speed: 120, up: 40, g: 120, life: 1.2, r: 7, color: ['#c8c9d2', '#e2e3ea'] });
    }
  },
  draw(c, v) {
    const bob = v.body.onGround ? 0 : -3;
    // Chassis and frame.
    limb(c, [-46, -26 + bob, 46, -26 + bob], 8, '#ced4da');
    limb(c, [-30, -26 + bob, -20, -52 + bob, 18, -52 + bob, 30, -26 + bob], 5, '#adb5bd');
    // Driver in a space helmet.
    c.save(); c.beginPath(); c.arc(0, -66 + bob, 24, 0, TAU); c.fillStyle = 'rgba(190,240,255,0.5)'; c.fill(); c.clip();
    v.drawDriver(c, -4, -36 + bob, 0.4); c.restore();
    c.beginPath(); c.arc(0, -66 + bob, 24, 0, TAU); c.lineWidth = 4; c.strokeStyle = '#fff'; c.stroke();
    c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    // Dish antenna and a little flag.
    limb(c, [-38, -28 + bob, -40, -70 + bob], 3, '#868e96');
    c.beginPath(); c.arc(-40, -74 + bob, 10, Math.PI * 0.15, Math.PI * 1.15); c.closePath(); fillStroke(c, '#e9ecef', 3);
    limb(c, [40, -28 + bob, 40, -78 + bob], 3, '#868e96');
    poly(c, [40, -78 + bob, 60, -72 + bob, 40, -66 + bob], '#ff6b6b', 2);
    // Big wire wheels.
    for (const wx of [-36, 36]) {
      ell(c, wx, -18, 18, 18, '#495057', 4);
      c.save(); c.translate(wx, -18); c.rotate(v.wheel);
      c.strokeStyle = '#ced4da'; c.lineWidth = 2;
      for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(15, 0); c.stroke(); }
      c.restore();
      ell(c, wx, -18, 4, 4, '#ffd43b', 2);
    }
  },
});
