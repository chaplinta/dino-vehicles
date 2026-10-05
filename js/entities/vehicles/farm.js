// Farm vehicles: tractor (plough and sow), combine harvester.

defVehicle('tractor', {
  name: 'Tractor', say: 'Tractor! Let us plant some corn!', icon: '🌱', w: 96, h: 70, speed: 200, horn: 'tractor', unlock: 0,
  init(v) { v.s.sow = false; v.s.planted = 0; },
  act(v, dt, inp) {
    const s = v.s;
    if (inp.actionP) {
      s.sow = !s.sow;
      Sound.tone(s.sow ? 300 : 500, 0.15, 'square', 0.08, s.sow ? 500 : 300);
      if (s.sow && v.driver === Player) Sound.say('Planting!');
    }
    if (!s.sow || Math.abs(v.body.vx) < 20) return;
    const tx = Math.floor((v.body.x - v.facing * (v.body.w / 2 + 14)) / TS);
    const gr = v.groundRow();
    const g = World.get(tx, gr), above = World.get(tx, gr - 1);
    if ((g === T.DIRT || g === T.GRASS) && (above === T.AIR || above === T.FLOWER)) {
      if (g === T.GRASS) World.set(tx, gr, T.DIRT);
      World.set(tx, gr - 1, T.CROP);
      World.setMeta(tx, gr - 1, 0);
      Fx.burst(tx * TS + 16, gr * TS, 5, { speed: 80, up: 60, g: 400, life: 0.4, r: 4, color: ['#a0662e', '#5cc84a'] });
      Sound.tone(700, 0.05, 'triangle', 0.06);
      s.planted++;
      if (s.planted % 8 === 0 && v.driver === Player) { Game.addStars(1); Game.popupStar(tx * TS, gr * TS - 40); Sound.collect(); }
    }
  },
  draw(c, v) {
    const s = v.s;
    // Plough at the back.
    c.save(); c.translate(-52, -18); c.rotate(s.sow ? 0.35 : -0.1);
    limb(c, [0, 0, -16, 8], 6, '#868e96');
    for (let i = 0; i < 3; i++) poly(c, [-14 - i * 6, 6, -10 - i * 6, 18, -6 - i * 6, 6], '#adb5bd', 2);
    c.restore();
    rbox(c, -34, -54, 74, 30, 8, '#2f9e44');
    rbox(c, 10, -46, 36, 24, 6, '#40c057');
    rbox(c, 34, -64, 6, 18, 2, '#555', 3);
    // Open cab with roof.
    limb(c, [-30, -54, -30, -104], 4, '#555'); limb(c, [6, -54, 6, -104], 4, '#555');
    v.drawDriver(c, -14, -56, 0.5);
    rbox(c, -38, -112, 52, 10, 4, '#2f9e44');
    drawWheel(c, -18, -26, 26, v.wheel, '#ffd43b');
    drawWheel(c, 30, -14, 14, v.wheel * 1.8, '#ffd43b');
  },
});

defVehicle('harvester', {
  name: 'Combine harvester', say: 'Combine harvester! Munch munch!', icon: '🌽', w: 130, h: 84, speed: 170, horn: 'tractor', unlock: 15,
  init(v) { v.s.grain = 0; v.s.spin = 0; v.s.unload = 0; },
  act(v, dt, inp) {
    const s = v.s;
    s.spin += dt * (Math.abs(v.body.vx) > 10 ? 8 : 2);
    const fr = v.feetRow();
    const tx = Math.floor(v.frontX(16) / TS);
    for (const ty of [fr, fr - 1]) {
      if (World.get(tx, ty) === T.CROP && World.getMeta(tx, ty) >= 3) {
        World.set(tx, ty, T.AIR);
        s.grain++;
        Fx.burst(tx * TS + 16, ty * TS + 16, 8, { speed: 140, up: 80, g: 500, life: 0.6, r: 5, color: ['#ffd43b', '#fab005', '#69db7c'], shape: 'rect' });
        Sound.tone(500 + (s.grain % 5) * 80, 0.08, 'triangle', 0.08);
        if (s.grain % 6 === 0 && v.driver === Player) { Game.addStars(1); Game.popupStar(tx * TS, ty * TS - 40); Sound.collect(); }
      }
    }
    if (inp.actionP && s.grain > 0) { s.unload = 1.5; Sound.noise(1.2, 0.12, 'bandpass', 1200); }
    if (s.unload > 0) {
      s.unload -= dt;
      const sx = v.body.x - v.facing * 70, sy = v.body.y - 104;
      Fx.add({ x: sx, y: sy, vx: -v.facing * rand(60, 120), vy: rand(-20, 40), g: 600, life: 0.8, r: 4, color: '#ffd43b' });
      if (s.unload <= 0) s.grain = 0;
    }
  },
  draw(c, v) {
    const s = v.s;
    // Spinning reel at the front.
    ell(c, 72, -30, 26, 26, null, 0);
    rbox(c, 50, -24, 30, 20, 4, '#ffd43b', 3);
    c.save(); c.translate(70, -44);
    for (let i = 0; i < 5; i++) {
      const a = s.spin + i * TAU / 5;
      limb(c, [0, 0, Math.cos(a) * 20, Math.sin(a) * 20], 3, '#e8590c', 2);
    }
    ell(c, 0, 0, 6, 6, '#868e96', 3);
    c.restore();
    rbox(c, -64, -74, 112, 52, 10, '#2f9e44');
    rbox(c, -16, -104, 44, 32, 8, '#40c057');
    cabWindow(c, v, -10, -100, 32, 26, 6, [2, -70, 0.42]);
    // Grain spout.
    limb(c, [-40, -74, -60, -100, -72, -104], 8, '#40c057');
    if (s.grain > 0) ell(c, -40, -74, 18, 6 + Math.min(10, s.grain), '#ffd43b', 3);
    drawWheel(c, -36, -22, 22, v.wheel, '#ffd43b');
    drawWheel(c, 26, -16, 16, v.wheel * 1.4, '#ffd43b');
  },
});
