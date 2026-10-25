// More to hop in, parked around the world from the start: ice cream van, cement mixer, road roller,
// forklift, monster truck and jet ski.

// ---------- Ice cream van ----------
defVehicle('icecream', {
  name: 'Ice cream van', say: 'Ice cream! Who wants ice cream?', icon: '🍦', w: 112, h: 78, speed: 220, exhaust: [-56, -12],
  init(v) { v.s.cool = 0; },
  act(v, dt, inp) {
    const s = v.s;
    s.cool = Math.max(0, s.cool - dt);
    s.tune = Math.max(0, (s.tune || 0) - dt);
    if (!inp.actionP) return;
    // The jingle, and every dino nearby comes for a cone.
    [659, 784, 880, 784, 659, 523, 587, 659].forEach((f, i) => Sound.tone(f, 0.16, 'triangle', 0.09, null, i * 0.17));
    s.tune = 1.5;
    if (s.cool > 0) return;
    s.cool = 15;
    let n = 0;
    for (const d of NPCs.list) {
      if (d.vehicle || d.ride || d.need || d.angry > 0 || Math.abs(d.body.x - v.body.x) > 360 || Math.abs(d.body.y - v.body.y) > 120) continue;
      d.heartT = 3; d.scaredT = 0; d.home = v.body.x; d.range = TS; d.state = 'walk'; d.dir = Math.sign(v.body.x - d.body.x) || 1; d.timer = 2;
      if (v.driver === Player && n < 3) { n++; setTimeout(() => { Game.addStars(1); Game.popupStar(d.body.x, d.body.y - 90); Sound.collect(); }, 900 + n * 400); }
    }
  },
  draw(c, v) {
    rbox(c, -56, -76, 112, 62, 10, '#fff0f6');
    c.fillStyle = '#f783ac'; for (let i = 0; i < 7; i++) c.fillRect(-52 + i * 16, -76, 8, 10);
    rbox(c, -46, -64, 50, 30, 6, '#bdf3ff', 3);   // serving window
    if (v.s.tune > 0) { ell(c, -21, -40, 8, 8, '#ffe066', 2); poly(c, [-27, -36, -15, -36, -21, -22], '#d9a066', 2); }
    cabWindow(c, v, 16, -66, 24, 24, 6, [28, -36, 0.32]);
    // A giant cone on the roof.
    poly(c, [-14, -80, 4, -80, -5, -108], '#d9a066', 3);
    ell(c, -5, -88, 13, 11, '#ffd8e8', 3); ell(c, -5, -98, 9, 8, '#fff', 3);
    drawWheel(c, -32, -14, 15, v.wheel); drawWheel(c, 32, -14, 15, v.wheel);
  },
});

// ---------- Cement mixer ----------
defVehicle('mixer', {
  name: 'Cement mixer', say: 'Cement mixer! Round and round!', icon: '🧱', w: 124, h: 82, speed: 200, exhaust: [20, -78],
  init(v) { v.s.drum = 0; v.s.cool = 0; },
  act(v, dt, inp) {
    const s = v.s, b = v.body;
    s.drum += dt * 3; s.cool = Math.max(0, s.cool - dt);
    if (!inp.actionP || s.cool > 0) return;
    s.cool = 0.35;
    // Pour a block of concrete out of the chute at the back, stacking up if there's one there.
    const tx = Math.floor((b.x - v.facing * (b.w / 2 + 34)) / TS);   // clear of the truck itself
    for (let ty = v.feetRow(); ty > v.feetRow() - 4; ty--) {
      if (placeBlock(tx, ty, T.CONCRETE)) { Fx.burst(tx * TS + 16, ty * TS + 16, 8, { speed: 90, life: 0.5, r: 6, color: ['#adb5bd', '#ced4da'] }); return; }
      if (World.get(tx, ty) === T.AIR) break;
    }
    Sound.bonk();
  },
  draw(c, v) {
    // Spinning striped drum on the back, chute behind it.
    c.save(); c.translate(-20, -50); c.rotate(-0.25);
    c.beginPath(); c.ellipse(0, 0, 44, 26, 0, 0, TAU); fillStroke(c, '#f1f3f5');
    c.save(); c.beginPath(); c.ellipse(0, 0, 44, 26, 0, 0, TAU); c.clip();
    c.fillStyle = '#e8590c'; for (let i = -3; i < 4; i++) { const x = ((i * 22 + v.s.drum * 14) % 88 + 88) % 88 - 44; c.fillRect(x, -30, 9, 60); }
    c.restore(); c.beginPath(); c.ellipse(0, 0, 44, 26, 0, 0, TAU); fillStroke(c, null, 4);
    c.restore();
    limb(c, [-62, -40, -74, -24], 6, '#868e96');
    rbox(c, -60, -28, 90, 14, 4, '#495057', 3);
    c.beginPath(); c.moveTo(30, -14); c.lineTo(30, -66); c.lineTo(48, -66); c.lineTo(62, -42); c.lineTo(62, -14); c.closePath(); fillStroke(c, '#ffd43b');
    cabWindow(c, v, 34, -62, 18, 20, 5, [44, -34, 0.3]);
    drawWheel(c, -42, -14, 14, v.wheel); drawWheel(c, -10, -14, 14, v.wheel); drawWheel(c, 44, -14, 14, v.wheel);
  },
});

// ---------- Road roller ----------
// Squashes little bumps of dirt, sand and grass flat as it rolls over them.
const ROLLS_FLAT = new Set([T.DIRT, T.SAND, T.GRASS]);
defVehicle('roller', {
  name: 'Road roller', say: 'Road roller! Squash it flat!', icon: '📢', w: 104, h: 72, speed: 140, step: 0, exhaust: [-30, -76],   // no stepping up: it squashes instead
  act(v, dt, inp) {
    const b = v.body;
    if (inp.actionP) v.hornSound();
    if (!b.onGround) return;
    const tx = Math.floor(v.frontX(4) / TS), ty = v.feetRow();
    const id = World.get(tx, ty);
    if (ROLLS_FLAT.has(id) && World.get(tx, ty - 1) === T.AIR) {
      World.dig(tx, ty);
      if (v.hopT > 0) { v.hopT = 0; b.vy = 0; }   // no need to hop over it now
      Fx.burst(tx * TS + 16, ty * TS + 24, 8, { speed: 100, up: 40, life: 0.5, r: 6, color: ['#c9a27a', '#e9d8a6'] });
      Sound.noise(0.15, 0.15, 'lowpass', 300);
      if (v.driver === Player) { v.s.flat = (v.s.flat || 0) + 1; if (v.s.flat % 10 === 0) { Game.addStars(1); Game.popupStar(b.x, b.y - 100); } }
    }
  },
  draw(c, v) {
    // Big front drum, cab with a roof on posts, chunky back wheel.
    ell(c, 30, -26, 26, 26, '#495057', 4);
    c.save(); c.translate(30, -26); c.rotate(v.wheel * 0.6); c.strokeStyle = '#868e96'; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) { c.rotate(TAU / 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(20, 0); c.stroke(); }
    c.restore();
    rbox(c, -50, -50, 74, 30, 6, '#fcc419');
    limb(c, [-40, -50, -40, -86], 4, '#495057'); limb(c, [12, -50, 12, -86], 4, '#495057');
    rbox(c, -48, -92, 66, 8, 3, '#fcc419', 3);
    v.drawDriver(c, -14, -50, 0.36);
    drawWheel(c, -30, -18, 18, v.wheel);
  },
});

// ---------- Forklift ----------
// Forks pick up the block in front, carry it, and put it down somewhere else.
defVehicle('forklift', {
  name: 'Forklift', say: 'Forklift! Up we go!', icon: '⬆️', w: 82, h: 70, speed: 180,
  init(v) { v.s.lift = 0; v.s.load = 0; },
  act(v, dt, inp) {
    const s = v.s;
    s.lift = lerp(s.lift, s.load ? 1 : 0, Math.min(1, dt * 5));
    if (!inp.actionP) return;
    const tx = Math.floor(v.frontX(14) / TS), ty = v.feetRow();
    if (!s.load) {
      const id = World.get(tx, ty);
      if (id !== T.AIR && id !== T.WATER && TILES[id].solid && TILES[id].dig && World.dig(tx, ty) > 0) {
        s.load = id; Sound.tone(300, 0.2, 'square', 0.06, 500);
      } else Sound.bonk();
    } else {
      // Put it down in front: on the ground, or on top of what's already there.
      for (let y = ty; y > ty - 4; y--) {
        if (placeBlock(tx, y, s.load)) { s.load = 0; Sound.tone(500, 0.2, 'square', 0.06, 300); return; }
        if (World.get(tx, y) === T.AIR) break;
      }
      Sound.bonk();
    }
  },
  draw(c, v) {
    const s = v.s, fy = -8 - s.lift * 30;
    // Mast and forks out front, with the load on them.
    limb(c, [36, -4, 36, -80], 6, '#495057');
    limb(c, [36, fy, 64, fy], 5, '#adb5bd');
    if (s.load && TILES[s.load]) { c.save(); c.translate(38, fy - 32); TILES[s.load].draw(c, 0, 0, 0, 0); c.restore(); c.lineWidth = 3; c.strokeStyle = OUT; c.strokeRect(38, fy - 32, 32, 32); }
    rbox(c, -38, -44, 68, 30, 8, '#fd7e14');
    rbox(c, -40, -36, 16, 22, 5, '#495057', 3);   // counterweight
    limb(c, [-20, -44, -20, -78], 4, '#495057'); limb(c, [24, -44, 24, -78], 4, '#495057');
    rbox(c, -26, -84, 56, 8, 3, '#fd7e14', 3);
    v.drawDriver(c, 2, -44, 0.34);
    drawWheel(c, -22, -12, 12, v.wheel); drawWheel(c, 20, -12, 12, v.wheel);
  },
});

// ---------- Monster truck ----------
defVehicle('monster', {
  name: 'Monster truck', say: 'Monster truck! Giant wheels!', icon: '⤴️', w: 128, h: 104, speed: 320, accel: 2.4, step: 2, look: 260, exhaust: [-50, -60],
  init(v) { v.s.air = 0; },
  act(v, dt, inp) {
    const b = v.body, s = v.s;
    if (inp.actionP && b.onGround) { b.vy = -820; Sound.jump(); Sound.tone(90, 0.4, 'sawtooth', 0.1, 160); }
    if (!b.onGround) s.air += dt;
    else {
      if (s.air > 0.5) {
        // Big landing: CRUNCH, a bounce on the springs and a dust cloud.
        Pow.add(b.x, b.y - 70, 'CRUNCH!'); s.squash = 1;
        Fx.burst(b.x, b.y, 14, { speed: 200, up: 60, g: 400, life: 0.7, r: 9, color: 'rgba(200,180,150,0.75)' });
        Sound.noise(0.25, 0.25, 'lowpass', 220);
      }
      s.air = 0;
    }
    s.squash = Math.max(0, (s.squash || 0) - dt * 3);
  },
  draw(c, v) {
    const sq = Math.sin((v.s.squash || 0) * Math.PI) * 10;
    // Body high up on springs over enormous wheels.
    for (const wx of [-36, 38]) limb(c, [wx, -30, wx, -62 + sq], 6, '#adb5bd');
    c.beginPath(); c.moveTo(-64, -60 + sq); c.lineTo(-64, -84 + sq); c.lineTo(-10, -86 + sq); c.lineTo(4, -108 + sq); c.lineTo(36, -108 + sq);
    c.lineTo(48, -86 + sq); c.lineTo(64, -82 + sq); c.lineTo(64, -60 + sq); c.closePath(); fillStroke(c, '#7048e8');
    c.fillStyle = '#ffd43b'; for (let i = 0; i < 3; i++) poly(c, [-56 + i * 30, -62 + sq, -44 + i * 30, -82 + sq, -40 + i * 30, -62 + sq], '#ffd43b', 0);
    cabWindow(c, v, 8, -104 + sq, 26, 20, 5, [22, -76 + sq, 0.32]);
    for (const wx of [-36, 38]) {
      ell(c, wx, -28, 28, 28, '#212529', 4);
      c.save(); c.translate(wx, -28); c.rotate(v.wheel * 0.6); c.fillStyle = '#495057';
      for (let i = 0; i < 10; i++) { c.rotate(TAU / 10); c.fillRect(24, -4, 7, 8); }
      c.restore();
      ell(c, wx, -28, 11, 11, '#ced4da', 3);
    }
  },
});

// ---------- Jet ski ----------
defVehicle('jetski', {
  name: 'Jet ski', say: 'Jet ski! Whoosh!', icon: '💦', w: 76, h: 44, speed: 400, horn: 'honk', draft: 10, look: 240,
  move(v, dt, inp, dir) { boatMove(v, dt, inp, dir, this.speed); },
  act(v, dt, inp) {
    const b = v.body;
    // A spray of wake behind when going fast.
    if (v.floating && Math.abs(b.vx) > 150 && Math.random() < 0.6) Fx.add({ x: b.x - v.facing * 34, y: b.y - 8, vx: -v.facing * rand(60, 140), vy: rand(-160, -60), life: 0.5, r: 5, color: 'rgba(255,255,255,0.85)' });
    if (inp.actionP && v.floating) {
      b.vy = -520; Sound.jump();
      Fx.burst(b.x, b.y, 12, { speed: 160, up: 120, g: 500, life: 0.7, r: 6, color: ['#fff', '#a5d8ff'] });
    }
  },
  draw(c, v) {
    poly(c, [-38, -12, 38, -12, 30, 2, -32, 2], '#fa5252', 3);
    poly(c, [-30, -12, -20, -26, 14, -26, 30, -12], '#fff', 3);
    limb(c, [14, -26, 22, -42], 4, '#343a40'); limb(c, [16, -42, 28, -42], 4, '#343a40');
    v.drawDriver(c, -4, -24, 0.38);
  },
});
