// Riding a Brachiosaurus: climb on a grown-up one and it carries you about, munching treetops.
const RIDES = { brachio: 'brachioride' };
// Is there a dino here you could climb on?
function rideableNear(x, y) {
  return NPCs.list.find(n => RIDES[n.type] && !n.baby && !n.vehicle && !n.ride && !n.need && !(n.angry > 0) && !n.leaving && !(n.scaredT > 0) && !n.crew
    && Math.abs(n.body.x - x) < 120 && Math.abs(n.body.y - y) < 90);
}
// Swap the dino for a rideable "vehicle" and climb on.
function mountDino(p, n) {
  NPCs.remove(n);
  const v = Vehicles.spawn(RIDES[n.type], n.body.x, n.body.y, n.facing || 1);
  v.s.npc = n;
  Vehicles.enter(p, v);
  Sound.tone(220, 0.3, 'sawtooth', 0.06, 160);
  return v;
}

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
