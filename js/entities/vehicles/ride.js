// Riding a Brachiosaurus: climb on a grown-up one and it carries you about, munching treetops.
const RIDES = { brachio: 'brachioride' };
// Is there a dino here you could climb on?
function rideableNear(x, y) {
  const n = NPCs.list.find(n => RIDES[n.type] && !n.baby && !n.vehicle && !n.ride && !n.need && !(n.angry > 0) && !n.leaving && !(n.scaredT > 0) && !n.crew
    && Math.abs(n.body.x - x) < 120 && Math.abs(n.body.y - y) < 90);
  if (n) return n;
  // A grown-up woolly mammoth on the Antarctica trip.
  const m = Wildlife.list.find(a => a.kind === 'mammoth' && !a.baby && Math.abs(a.x - x) < 130 && Math.abs(a.y - y) < 120);
  return m ? { wild: m, body: { x: m.x, y: m.y } } : null;
}
// Swap the dino for a rideable "vehicle" and climb on.
function mountDino(p, n) {
  if (n.wild) {
    const a = n.wild, v = Vehicles.spawn('mammothride', a.x, a.y - 0.01, a.dir || 1);
    Wildlife.list.splice(Wildlife.list.indexOf(a), 1);
    v.s.wild = a; a.ridden = v;
    Vehicles.enter(p, v);
    Sound.tone(300, 0.6, 'sawtooth', 0.06, 520);
    return v;
  }
  NPCs.remove(n);
  const v = Vehicles.spawn(RIDES[n.type], n.body.x, n.body.y, n.facing || 1);
  v.s.npc = n;
  Vehicles.enter(p, v);
  Sound.tone(220, 0.3, 'sawtooth', 0.06, 160);
  return v;
}

// Riding a woolly mammoth: big, slow and shaggy. The button gives a mighty TOOT and a stomp.
defVehicle('mammothride', {
  name: 'Woolly mammoth', say: 'Up on a woolly mammoth!', icon: '🎺', w: 150, h: 120, speed: 140, accel: 2, step: 2, look: 200, camY: -50, noSave: true,
  init(v) { v.s.toot = 0; },
  act(v, dt, inp) {
    const s = v.s, b = v.body;
    s.toot = Math.max(0, s.toot - dt);
    if (!inp.actionP || s.toot > 0) return;
    s.toot = 1.2;
    Sound.tone(300, 0.7, 'sawtooth', 0.07, 560); Sound.noise(0.3, 0.3, 'lowpass', 160, 0.3);
    Pow.add(b.x + v.facing * 120, b.y - 190, 'TOOT!');
    Fx.burst(b.x, b.y, 16, { speed: 200, up: 120, g: 500, life: 0.8, r: 8, color: ['#f8f9fa', '#e7f5ff'] });
    for (const a of Wildlife.list) if (Math.abs(a.x - b.x) < 360) { a.hop = 14; if (a.kind === 'penguin' || a.kind === 'adelie' || a.kind === 'chick') a.flap = 1; }
  },
  onExit(v) {
    // Hop off: it wanders the valley again from here.
    const a = v.s.wild;
    Vehicles.list = Vehicles.list.filter(o => o !== v);
    if (!a) return;
    a.ridden = null; a.x = v.body.x; a.y = v.body.y; a.home = a.x; a.dir = v.facing; a.state = 'idle'; a.st = 2;
    Wildlife.list.push(a);
  },
  draw(c, v) {
    const a = v.s.wild || { scale: 1 }, moving = Math.abs(v.body.vx) > 10;
    c.save(); c.scale(a.scale || 1, a.scale || 1);
    drawAnimal(c, { kind: 'mammoth', t: v.t, state: moving ? 'walk' : 'idle' });
    if (v.s.toot > 0.4) limb(c, [86, -120, 112, -150, 126, -170], 11, '#6d4c41');   // trunk up for the toot
    v.drawDriver(c, -6, -150, 0.42);
    c.restore();
  },
});

defVehicle('brachioride', {
  name: 'Brachiosaurus', say: 'Up you go! Riding a Brachiosaurus!', icon: '🌿', w: 100, h: 60, speed: 150, accel: 2, step: 2, look: 200, camY: -40, noSave: true,
  init(v) { v.s.walk = 0; v.s.munch = 0; v.s.eaten = 0; },
  act(v, dt, inp) {
    const s = v.s, b = v.body;
    s.walk += Math.abs(b.vx) * dt * 0.05;
    s.munch = Math.max(0, s.munch - dt);
    if (!inp.actionP) return;
    // Head height: a long neck up and forward. Eat any leaves up there.
    const sc = dinoScale('brachio'), hx = b.x + v.facing * 60 * sc, hy = b.y - 134 * sc;
    let ate = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const tx = Math.floor(hx / TS) + dx, ty = Math.floor(hy / TS) + dy;
      if (World.get(tx, ty) === T.LEAVES && ate < 3) { World.set(tx, ty, T.AIR); ate++; Fx.burst(tx * TS + 16, ty * TS + 16, 6, { speed: 80, up: 40, g: 300, life: 0.7, r: 6, color: ['#51cf66', '#2f9e44'] }); }
    }
    if (ate) {
      s.munch = 0.8; s.eaten += ate;
      Sound.noise(0.12, 0.2, 'lowpass', 900); Sound.noise(0.12, 0.2, 'lowpass', 900, 0.2);
      if (v.driver === Player && Math.floor(s.eaten / 5) > Math.floor((s.eaten - ate) / 5)) { Game.addStars(1); Game.popupStar(hx, hy - 40); Pow.add(hx, hy - 30, 'MUNCH!'); }
    } else {
      // A big stomp: the ground shakes and the dinos nearby jump.
      Sound.noise(0.3, 0.35, 'lowpass', 160);
      Fx.burst(b.x, b.y, 12, { speed: 180, up: 40, g: 400, life: 0.6, r: 9, color: 'rgba(200,180,150,0.7)' });
      for (const n of NPCs.list) if (!n.vehicle && !n.ride && Math.abs(n.body.x - b.x) < 300 && n.body.onGround) n.body.vy = -380;
    }
  },
  onExit(v) {
    // Hop off: it's an ordinary Brachiosaurus again.
    const n = v.s.npc;
    Vehicles.list = Vehicles.list.filter(o => o !== v);
    if (!n) return;
    n.body.x = v.body.x; n.body.y = v.body.y; n.body.vx = 0; n.body.vy = 0; n.facing = v.facing;
    n.state = 'idle'; n.timer = 2; n.home = n.body.x; n.heartT = 2; n.greeted = true;
    liftOut(n.body);
    NPCs.list.push(n);
  },
  draw(c, v) {
    const sc = dinoScale('brachio'), s = v.s;
    const type = s.npc ? s.npc.type : 'brachio';
    drawDino(c, 0, 0, sc, type, { t: v.t, walk: Math.abs(v.body.vx) > 10 ? s.walk : 0, roar: s.munch > 0 ? 1 : 0, blinkSeed: s.npc ? s.npc.blinkSeed : 0 });
    v.drawDriver(c, -4 * sc, -68 * sc, 0.4);
  },
});
