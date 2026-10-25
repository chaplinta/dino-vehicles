// Everyday vehicles: a hatchback, a ute, a town bus and a delivery van. Dinos drive them about
// as traffic, and a few are parked around the world for you to hop in.

const CAR_COLOURS = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ff922b', '#f8f9fa'];

// Lights flash and a toot: what the car and van buttons do.
function flashToot(v, inp, dt) {
  v.s.flash = Math.max(0, (v.s.flash || 0) - dt);
  if (inp.actionP) { v.s.flash = 1.2; v.hornSound(); }
}

// ---------- Hatchback ----------
defVehicle('car', {
  name: 'Car', say: 'Beep beep! A little car!', icon: '💡', w: 96, h: 54, speed: 300, exhaust: [-48, -12],
  init(v) { v.s.col = pick(CAR_COLOURS); },
  act(v, dt, inp) { flashToot(v, inp, dt); },
  draw(c, v) {
    c.beginPath(); c.moveTo(-48, -14); c.lineTo(-48, -36); c.lineTo(-30, -38); c.lineTo(-18, -58); c.lineTo(20, -58);
    c.lineTo(34, -38); c.lineTo(48, -34); c.lineTo(48, -14); c.closePath(); fillStroke(c, v.s.col);
    c.save(); c.beginPath(); c.moveTo(-12, -38); c.lineTo(-6, -54); c.lineTo(16, -54); c.lineTo(28, -38); c.closePath();
    c.fillStyle = '#bdf3ff'; c.fill(); c.clip(); v.drawDriver(c, 10, -22, 0.32); c.restore();
    c.beginPath(); c.moveTo(-12, -38); c.lineTo(-6, -54); c.lineTo(16, -54); c.lineTo(28, -38); c.closePath(); fillStroke(c, null, 3);
    c.save(); c.beginPath(); c.moveTo(-28, -38); c.lineTo(-18, -54); c.lineTo(-10, -54); c.lineTo(-16, -38); c.closePath(); c.fillStyle = '#bdf3ff'; c.fill(); c.clip();
    drawPassengers(c, v, [[-16, -22, 0.28]]); c.restore();
    const lit = v.s.flash > 0 && Math.floor(v.s.flash * 8) % 2;
    ell(c, 44, -26, 5, 4, lit ? '#fff' : '#fff3bf', 2);
    if (lit) { c.fillStyle = 'rgba(255,250,200,0.5)'; c.beginPath(); c.moveTo(48, -26); c.lineTo(110, -40); c.lineTo(110, -10); c.closePath(); c.fill(); }
    rbox(c, -48, -22, 8, 6, 2, '#e8262b', 2);
    drawWheel(c, -28, -14, 14, v.wheel); drawWheel(c, 30, -14, 14, v.wheel);
  },
});

// ---------- Ute ----------
defVehicle('ute', {
  name: 'Ute', say: 'A ute! The Aussie farm truck!', icon: '🐕', w: 112, h: 60, speed: 270, seats: 1, exhaust: [-56, -12],
  init(v) { v.s.col = pick(['#f8f9fa', '#e8590c', '#1c7ed6', '#2b8a3e', '#c92a2a']); v.s.dog = Math.random() < 0.6; v.s.gate = 0; v.s.out = 0; },
  act(v, dt, inp) {
    const s = v.s;
    // Drop the tailgate: the dog jumps out for a run round and hops back in.
    if (inp.actionP && !s.out) { s.out = 2.4; s.dog = true; Sound.tone(700, 0.08, 'square', 0.08); Sound.tone(900, 0.08, 'square', 0.08, null, 0.12); }
    s.out = Math.max(0, s.out - dt);
    s.gate = lerp(s.gate, s.out > 0 ? 1 : 0, Math.min(1, dt * 8));
  },
  draw(c, v) {
    const s = v.s;
    // Tray and tailgate.
    rbox(c, -56, -40, 60, 26, 4, '#adb5bd', 4);
    c.save(); c.translate(-56, -14); c.rotate(-s.gate * 1.5); rbox(c, -4, -26, 6, 26, 2, '#868e96', 3); c.restore();
    if (s.dog) {
      // Kelpie in the back (or bounding about behind when the gate's down).
      const k = s.out > 0 ? Math.sin((2.4 - s.out) / 2.4 * Math.PI) : 0;
      const dx = -30 - k * 60, dy = -46 + k * 30 - Math.abs(Math.sin(v.t * 10)) * k * 16;
      ell(c, dx, dy, 14, 8, '#8b5a2b', 3); ell(c, dx + 12, dy - 8, 7, 6, '#8b5a2b', 3);
      poly(c, [dx + 10, dy - 13, dx + 13, dy - 21, dx + 16, dy - 13], '#6e4520', 2);
      ell(c, dx + 14, dy - 9, 1.6, 1.6, OUT, 0);
      limb(c, [dx - 14, dy - 2, dx - 20, dy - 10 + Math.sin(v.t * 14) * 4], 3, '#8b5a2b');
    } else rbox(c, -46, -52, 26, 14, 4, '#4dabf7', 3);   // an esky
    // Cab.
    c.beginPath(); c.moveTo(4, -14); c.lineTo(4, -62); c.lineTo(30, -62); c.lineTo(42, -40); c.lineTo(56, -36); c.lineTo(56, -14); c.closePath(); fillStroke(c, s.col);
    cabWindow(c, v, 10, -58, 26, 20, 5, [24, -30, 0.32]);
    rbox(c, 50, -32, 8, 10, 2, '#adb5bd', 2);   // roo bar
    ell(c, 52, -28, 4, 3, '#fff3bf', 2);
    drawWheel(c, -34, -14, 15, v.wheel); drawWheel(c, 34, -14, 15, v.wheel);
  },
});

// ---------- Town bus ----------
defVehicle('bus', {
  name: 'Bus', say: 'The bus! Hop on!', icon: '🚪', w: 190, h: 84, speed: 220, seats: 6, look: 220, exhaust: [-92, -14],
  init(v) { v.s.door = 0; v.s.riders = Array.from({ length: 4 }, () => Math.random() < 0.6 ? pick(DINO_KEYS) : null); },
  act(v, dt, inp) {
    const s = v.s;
    if (inp.actionP) {
      s.doorT = 2.5;
      Sound.noise(0.25, 0.1, 'highpass', 1500);
      // A dino waiting nearby hops on for a ride to the next stop along.
      if (v.driver === Player) {
        const n = NPCs.list.find(n => !n.vehicle && !n.ride && !n.need && !n.angry && !n.baby && !n.leaving && Math.abs(n.body.x - v.body.x) < 160 && Math.abs(n.body.y - v.body.y) < 80);
        if (n) {
          const to = v.body.x + v.facing * rand(25, 45) * TS;
          n.need = { kinds: ['bus'], destX: clamp(to, 8 * TS, ((World.limitW || WORLD_W) - 8) * TS), destR: 140, board: 'Ding! Thanks!', done: m => { Game.addStars(1); Game.popupStar(m.body.x, m.body.y - 80); Sound.collect(); } };
          n.bubble = '🚏'; n.stuck = true;
        }
      }
    }
    s.doorT = Math.max(0, (s.doorT || 0) - dt);
    s.door = lerp(s.door, s.doorT > 0 ? 1 : 0, Math.min(1, dt * 8));
  },
  draw(c, v) {
    const s = v.s;
    rbox(c, -94, -86, 188, 72, 12, '#fcc419');
    c.fillStyle = '#1c7ed6'; c.fillRect(-92, -40, 184, 8);
    // Passengers: your riders first, then the regulars.
    const ps = v.passengers || [];
    for (let i = 0; i < 5; i++) {
      const wx = -84 + i * 30;
      rbox(c, wx, -78, 24, 28, 6, '#bdf3ff', 3);
      c.save(); rrPath(c, wx, -78, 24, 28, 6); c.clip();
      const n = ps[i], t = n ? n.type : s.riders[i];
      if (t) drawDinoSeated(c, wx + 10, -52, 0.27, t, { t: v.t + i, blinkSeed: n ? n.blinkSeed : i });
      c.restore();
      rrPath(c, wx, -78, 24, 28, 6); fillStroke(c, null, 3);
    }
    // Front door slides open, then the driver's window and the route sign.
    rbox(c, 64 - s.door * 12, -74, 16, 58, 3, '#495057', 3);
    cabWindow(c, v, 72, -78, 18, 28, 6, [80, -50, 0.3]);
    rbox(c, -40, -98, 80, 14, 4, '#212529', 2);
    c.font = `800 11px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffd43b'; c.fillText('TOWN', 0, -91);
    ell(c, 90, -26, 4, 4, '#fff3bf', 2);
    drawWheel(c, -60, -14, 15, v.wheel); drawWheel(c, 58, -14, 15, v.wheel);
  },
});

// ---------- Delivery van ----------
defVehicle('van', {
  name: 'Van', say: 'Delivery van! Parcels for everyone!', icon: '💡', w: 116, h: 74, speed: 250, exhaust: [-58, -12],
  init(v) { v.s.col = pick(['#f8f9fa', '#ffd43b', '#74c0fc']); },
  act(v, dt, inp) { flashToot(v, inp, dt); },
  draw(c, v) {
    rbox(c, -58, -76, 86, 62, 8, v.s.col);
    // Parcel logo on the side.
    rbox(c, -36, -62, 34, 26, 3, '#c98a4b', 3); c.fillStyle = '#8a5524'; c.fillRect(-21, -62, 4, 26);
    c.beginPath(); c.moveTo(24, -14); c.lineTo(24, -66); c.lineTo(44, -66); c.lineTo(58, -40); c.lineTo(58, -14); c.closePath(); fillStroke(c, v.s.col);
    cabWindow(c, v, 30, -62, 18, 20, 5, [40, -34, 0.3]);
    const lit = v.s.flash > 0 && Math.floor(v.s.flash * 8) % 2;
    ell(c, 54, -26, 4, 4, lit ? '#fff' : '#fff3bf', 2);
    if (lit) { c.fillStyle = 'rgba(255,250,200,0.5)'; c.beginPath(); c.moveTo(58, -26); c.lineTo(120, -40); c.lineTo(120, -10); c.closePath(); c.fill(); }
    drawWheel(c, -34, -14, 15, v.wheel); drawWheel(c, 36, -14, 15, v.wheel);
  },
});
