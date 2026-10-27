// The flying saucer on the Moon: hop in, fly anywhere, and beam things up with the tractor beam.
defVehicle('ufo', {
  name: 'Flying saucer', say: 'A real flying saucer! Beam me up!', icon: '🛸', dirs: 'all', w: 140, h: 60, mover: 'air', speed: 320, look: 80, camY: 60, noSave: true,
  init(v) { v.s.beam = 0; v.s.spin = 0; },
  onEnter(v) { if (v.driver === Player) Eggs.reward('saucer', 2, 'You found the flying saucer! Up you go!', 'UFO!'); },
  move(v, dt, inp, dir) {
    const b = v.body, s = v.s;
    const vdir = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    s.spin = lerp(s.spin, v.driver ? 1 : 0, dt * 3);
    if (s.spin > 0.35) {
      // Hovers wherever you leave it: no gravity, a gentle bob.
      b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * 2.5));
      b.vy = lerp(b.vy, vdir * 260 + Math.sin(v.t * 2.5) * 12, Math.min(1, dt * 3));
      moveBody(b, dt, { gravity: 0 });
      if (b.y < -300) b.y = -300;
    } else { b.vx = lerp(b.vx, 0, dt * 3); moveBody(b, dt, {}); }
    if (dir) v.facing = dir;
    v.tilt = lerp(v.tilt || 0, b.vx / this.speed * 0.25, dt * 4);
  },
  // Tractor beam: pulls up the first block below, and floats any Moon dino underneath.
  beamTarget(v) {
    const tx = Math.floor(v.body.x / TS);
    for (let ty = Math.floor(v.body.y / TS) + 1, n = 0; n < 9; ty++, n++) {
      const id = World.get(tx, ty);
      if (id !== T.AIR && TILES[id].solid) return TILES[id].dig && id !== T.BEDROCK ? { tx, ty } : null;
    }
    return null;
  },
  act(v, dt, inp) {
    const s = v.s;
    s.beam = Math.max(0, s.beam - dt);
    if (inp.actionP && s.beam <= 0) {
      s.beam = 0.9;
      Sound.tone(500, 0.8, 'sine', 0.07, 1400);
      const t = this.beamTarget(v);
      if (t) setTimeout(() => { if (Vehicles.list.includes(v)) { vehicleDig(t.tx, t.ty, true); Fx.burst(t.tx * TS + 16, t.ty * TS + 16, 10, { speed: 60, up: 160, g: -100, life: 0.8, r: 6, color: ['#b2f2bb', '#fff'] }); } }, 450);
      for (const n of NPCs.list) if (!n.vehicle && Math.abs(n.body.x - v.body.x) < 60 && n.body.y > v.body.y) { n.body.vy = -420; n.heartT = 2; }
    }
  },
  draw(c, v) {
    const s = v.s, t = v.t;
    c.save(); c.rotate(v.tilt || 0);
    if (s.beam > 0) {
      c.fillStyle = `rgba(180,255,190,${0.35 * Math.min(1, s.beam * 2)})`;
      c.beginPath(); c.moveTo(-22, -12); c.lineTo(22, -12); c.lineTo(56, 280); c.lineTo(-56, 280); c.closePath(); c.fill();
    }
    ell(c, 0, -40, 32, 28, 'rgba(190,240,255,0.8)', 3);
    v.drawDriver(c, 8, -20, 0.3);
    drawDinoSeated(c, -12, -20, 0.24, 'alien', { t });
    ell(c, 0, -20, 70, 18, '#69db7c', 4);
    for (let i = 0; i < 5; i++) ell(c, -48 + i * 24, -18, 5, 5, Math.floor(t * 6 + i) % 2 ? '#ffd43b' : '#fff', 2);
    if (!v.driver) { limb(c, [-34, -8, -44, 2], 4, '#868e96'); limb(c, [34, -8, 44, 2], 4, '#868e96'); }
    c.restore();
  },
});
