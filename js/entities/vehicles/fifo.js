// Fly in, fly out: the FIFO jet to the Pilbara, and the mine's machines once you get there.

// ---------- FIFO jet ----------
defVehicle('jet', {
  name: 'FIFO jet', iconScale: 0.36, iconX: 0, say: 'The FIFO jet! Press the button to take off.', icon: '🛫', w: 210, h: 74, speed: 110, unlock: 0, look: 220, camY: -40,
  init(v) { Object.assign(v.s, { state: 'idle', t: 0, pitch: 0, gear: 1 }); },
  reset(v) { v.s.state = 'idle'; v.s.pitch = 0; v.s.gear = 1; },
  canExit(v) { return v.s.state === 'idle'; },
  // Glide down onto column tx from the side the jet faces away from.
  landAt(v, tx) {
    const x1 = tx * TS + 16;
    Object.assign(v.s, { state: 'land', t: 0, pitch: 0.12, gear: 1, land: { x0: x1 - v.facing * 1300, y0: (SURF - 18) * TS, x1, y1: World.surfaceAt(tx) * TS - 0.01 } });
    v.body.x = v.s.land.x0; v.body.y = v.s.land.y0; v.body.vx = v.facing * 300; v.body.vy = 0;
  },
  move(v, dt, inp, dir) {
    const b = v.body, s = v.s;
    s.t += dt;
    if (s.state === 'idle') {
      b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * 2));
      if (dir) v.facing = dir;
      moveBody(b, dt, { step: 1 });
      v.wheel += b.vx * dt / 12;
      s.pitch = lerp(s.pitch, 0, dt * 4);
    } else if (s.state === 'roll') {
      // Take-off run: engines roar, wheels spin, the nose lifts.
      b.vx += v.facing * 650 * dt;
      b.x += b.vx * dt;
      v.wheel += b.vx * dt / 12;
      if (s.t > 0.6) s.pitch = lerp(s.pitch, -0.25, dt * 4);
      if (s.t > 0.8) { s.state = 'climb'; s.t = 0; Sound.say('Wheels up!'); }
    } else if (s.state === 'climb') {
      b.vx = v.facing * Math.min(720, Math.abs(b.vx) + 300 * dt);
      b.vy = Math.max(-620, b.vy - 1400 * dt);
      b.x = clamp(b.x + b.vx * dt, 4 * TS, ((World.limitW || WORLD_W) - 4) * TS);
      b.y += b.vy * dt;
      s.pitch = lerp(s.pitch, -0.35, dt * 3);
      s.gear = Math.max(0, s.gear - dt * 1.5);
      if (b.y < -700) { s.state = 'away'; Flight.start(v); }
    } else if (s.state === 'land') {
      const L = s.land, k = Math.min(1, s.t / 4);
      b.x = lerp(L.x0, L.x1, 1 - (1 - k) * (1 - k));
      b.y = L.y1 - (L.y1 - L.y0) * Math.pow(1 - k, 1.6);
      s.pitch = lerp(s.pitch, k > 0.8 ? 0 : -0.08, dt * 3);
      v.wheel += 300 * dt / 12;
      if (k >= 1) {
        s.state = 'idle'; b.vx = 0; b.vy = 0; s.pitch = 0;
        Sound.land(); Sound.noise(0.6, 0.1, 'lowpass', 600);
        if (Game.away === 'pilbara') Pilbara.landed();
        else Game.celebrate('Home!', 'Home again! That was a long swing. Time to rest.');
      }
    }
    if (s.state !== 'idle' && s.state !== 'away' && Math.random() < 0.5) {
      Fx.add({ x: b.x - v.facing * 30, y: b.y - 22, vx: -v.facing * rand(60, 140), vy: rand(-10, 10), life: 0.8, r: 7, color: 'rgba(230,230,240,0.6)', shape: 'grow' });
    }
  },
  act(v, dt, inp) {
    if (inp.actionP && v.s.state === 'idle') {
      v.s.state = 'roll'; v.s.t = 0;
      v.body.vx = 0;
      Sound.noise(2.5, 0.3, 'lowpass', 700, 0, 1800);
      Sound.say(Game.away === 'pilbara' ? 'Flying home! Buckle up.' : 'Off to the Pilbara! Buckle up.');
    }
  },
  draw(c, v) {
    const s = v.s;
    c.save(); c.translate(0, -40); c.rotate(s.pitch || 0); c.translate(0, 40);
    // Gear first, so it tucks up under the body.
    const g = s.gear === undefined ? 1 : s.gear;
    if (g > 0.05) {
      for (const gx of [-36, 64]) {
        limb(c, [gx, -26, gx, -26 + 16 * g], 4, '#868e96', 2);
        drawWheel(c, gx, -8 - 16 * (1 - g) + 0, 9 * Math.max(0.5, g), v.wheel, '#adb5bd');
      }
    }
    poly(c, [-104, -48, -126, -112, -100, -112, -70, -52], '#1971c2', 4);            // tail fin
    poly(c, [-110, -46, -132, -40, -110, -34], '#1971c2', 3);                           // tail plane
    c.beginPath(); c.moveTo(-108, -60); c.lineTo(80, -62); c.quadraticCurveTo(116, -58, 112, -40);
    c.quadraticCurveTo(108, -26, 80, -24); c.lineTo(-90, -24); c.quadraticCurveTo(-112, -30, -108, -60); c.closePath();
    fillStroke(c, '#f8f9fa');
    c.fillStyle = '#1971c2'; c.fillRect(-100, -38, 180, 5);
    // Passenger windows with dinos heading to site in hi-vis.
    for (let i = 0; i < 6; i++) {
      const wx = -70 + i * 22;
      ell(c, wx, -48, 7, 8, '#bdf3ff', 2.5);
      if (i % 2 === 0) { ell(c, wx, -46, 4, 4, ['#5ccf4a', '#ff9f40', '#6f8dff'][i / 2], 0); c.fillStyle = '#ff7a1a'; c.fillRect(wx - 4, -43, 8, 3); }
    }
    // Cockpit with the driver.
    c.save(); rrPath(c, 74, -60, 30, 20, 8); c.clip(); c.fillStyle = '#bdf3ff'; c.fillRect(74, -60, 30, 20); v.drawDriver(c, 84, -34, 0.32); c.restore();
    rrPath(c, 74, -60, 30, 20, 8); fillStroke(c, null, 3);
    // Wing and engine.
    poly(c, [-20, -34, 40, -34, 10, -4, -30, -6], '#adb5bd', 4);
    rbox(c, 0, -26, 40, 16, 8, '#495057', 3);
    ell(c, 38, -18, 4, 7, '#212529', 0);
    c.restore();
  },
});

// The flight overlay: a map of Western Australia with the jet flying between Perth and the Pilbara.
const AUS = [[113.6, -22], [114.2, -21.8], [116.7, -20.6], [118.6, -20.3], [121, -19.5], [122.2, -18], [123.6, -16.5], [125.5, -14.5], [127.5, -14], [129, -14.9],
  [130.3, -12.4], [132.5, -11.5], [135.5, -12.2], [136.8, -12.3], [135.9, -13.8], [135.5, -15], [137.7, -16.2], [139.3, -17.4], [140.8, -17.4], [141.6, -15], [141.6, -12.6],
  [142.5, -10.7], [143.5, -14], [145.3, -15], [145.9, -17], [146.3, -19], [148.9, -20.5], [150.5, -22.5], [153.1, -25.5], [153.6, -28.6], [153.1, -31], [152, -32.8],
  [150.9, -34.4], [150, -37.5], [148.2, -37.8], [146.4, -39], [144.9, -37.9], [143.5, -38.8], [141.6, -38.3], [140, -37.6], [139.6, -36.5], [138.1, -34.2], [137.8, -33.2],
  [136.2, -34.6], [135.9, -34.8], [134.2, -32.7], [131.2, -31.5], [128.9, -31.7], [126, -32.3], [124, -33], [123.6, -33.9], [121.9, -33.8], [119.9, -34], [117.9, -35.1],
  [116.6, -35], [115.1, -34.3], [115.7, -33.3], [115.7, -31.9], [115, -30], [114.9, -29], [114, -27.5], [113.4, -26.3], [113.6, -24.5]];
const TAS = [[144.6, -40.7], [148.3, -40.9], [148, -43.2], [146, -43.6], [144.7, -41.5]];
const PERTH = [115.86, -31.95], PILBARA = [119.2, -22.3];

const Flight = {
  jet: null,
  start(jet) {
    this.jet = jet;
    this.t = 0;
    this.toPilbara = Game.away !== 'pilbara';
    Game.overlay = this;
    UI.configure({ dirs: 'none', action: null, roar: false, home: false });
    Sound.say(this.toPilbara
      ? 'Fly in, fly out! Miners fly from Perth up to the Pilbara. They work for two weeks, then fly home again.'
      : 'Flying home to Perth. Fly in, fly out!');
  },
  update(dt) {
    this.t += dt;
    if (this.t > 10) this.finish();
  },
  tap() { if (this.t > 2) this.finish(); return true; },
  close() { this.finish(); },
  finish() {
    if (Game.overlay !== this) return;
    Game.overlay = null;
    if (this.toPilbara) Pilbara.enter(this.jet);
    else Pilbara.leave(this.jet);
  },
  draw(c) {
    c.fillStyle = '#4dabf7'; c.fillRect(0, 0, W, H);
    // Gentle waves.
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
    for (let i = 0; i < 14; i++) { const y = (i * 47 + this.t * 10) % H; c.beginPath(); c.moveTo((i * 97) % W, y); c.quadraticCurveTo((i * 97) % W + 20, y - 8, (i * 97) % W + 40, y); c.stroke(); }
    const k = Math.min(W / 50, H / 30) * 1.25;
    const map = ([lo, la]) => [W / 2 + (lo - 124) * k, H / 2 + (-la - 25) * k];
    const shape = (pts, fill) => { c.beginPath(); pts.forEach((p, i) => { const [x, y] = map(p); if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); fillStroke(c, fill, 4); };
    shape(AUS, '#f4c27a'); shape(TAS, '#f4c27a');
    // The Pilbara's red country.
    const [px, py] = map(PILBARA);
    ell(c, px, py, 70, 44, '#d9653b', 0);
    const lab = (txt, [x, y], dy) => { c.font = `800 20px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText(txt, x, y + dy); };
    const pe = map(PERTH);
    ell(c, pe[0], pe[1], 7, 7, '#e8262b', 3); lab('Perth', pe, 22);
    ell(c, px, py, 7, 7, '#e8262b', 3); lab('Pilbara', [px, py], -24);
    // Dotted path and the jet along it.
    const [a, b] = this.toPilbara ? [pe, [px, py]] : [[px, py], pe];
    c.setLineDash([8, 10]); c.strokeStyle = '#fff'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + b[0]) / 2 - 90, (a[1] + b[1]) / 2, b[0], b[1]); c.stroke(); c.setLineDash([]);
    const u = Math.min(1, this.t / 9), mx = (a[0] + b[0]) / 2 - 90, my = (a[1] + b[1]) / 2;
    const x = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * mx + u * u * b[0];
    const y = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * my + u * u * b[1];
    const dx = 2 * (1 - u) * (mx - a[0]) + 2 * u * (b[0] - mx), dy = 2 * (1 - u) * (my - a[1]) + 2 * u * (b[1] - my);
    c.save(); c.translate(x, y); c.rotate(Math.atan2(dy, dx)); c.scale(0.4, 0.4);
    if (Math.atan2(dy, dx) > Math.PI / 2 || Math.atan2(dy, dx) < -Math.PI / 2) c.scale(1, -1);
    VEHICLE_DEFS.jet.draw(c, { s: { pitch: 0, gear: 0 }, wheel: 0, t: this.t, driver: Player, drawDriver: Vehicle.prototype.drawDriver });
    c.restore();
    bigText(c, this.toPilbara ? 'Off to the mine!' : 'Going home!', W / 2, 60, 40, '#fff');
    if (this.t > 2) bigText(c, 'tap to land', W / 2, H - 40, 24, 'rgba(255,255,255,0.85)');
  },
};

// ---------- Blast hole drill ----------
defVehicle('blastrig', {
  name: 'Blast hole drill', iconScale: 0.45, say: 'Blast hole drill!', icon: '🛠️', w: 96, h: 70, speed: 150, unlock: 0, noSave: true, exhaust: [-30, -64],
  init(v) { Object.assign(v.s, { drill: 0, held: false, sayT: 0 }); },
  col(v) { return Math.floor(v.frontX(14) / TS); },
  act(v, dt, inp) {
    const s = v.s;
    s.sayT -= dt;
    if (!inp.action) { s.held = false; s.drill = Math.max(0, s.drill - dt * 2); }
    else if (!s.held && Math.abs(v.body.vx) < 30 && v.body.onGround) {
      const tx = this.col(v), ty = World.groundBelow(tx, v.feetRow() - 2);
      const id = World.get(tx, ty);
      const inPit = Game.away === 'pilbara' && tx >= PIL.PIT[0] && tx < PIL.PIT[1];
      if (!inPit || !(id === T.IRONORE || id === T.WASTE || id === T.REDDIRT)) {
        if (s.sayT <= 0) { s.sayT = 3; Sound.bonk(); Sound.say('Drive down into the pit and drill the dark red rock.'); }
        s.held = true;
      } else {
        s.drill += dt;
        if (Math.random() < 0.4) Sound.noise(0.05, 0.08, 'bandpass', 1100);
        if (Math.random() < 0.5) Fx.add({ x: tx * TS + 16 + rand(-12, 12), y: ty * TS, vx: rand(-80, 80), vy: rand(-140, -60), life: 0.6, r: 6, color: pick(['#c4532a', '#7a2e22', '#e9c4a6']), shape: 'grow' });
        if (s.drill >= 1.6) { s.drill = 0; s.held = true; Mine.addHole(tx, ty); }
      }
    }
    s.slow = s.drill > 0 ? 0 : 1;
    s.spin = (s.spin || 0) + (s.drill > 0 ? dt * 20 : 0);
  },
  draw(c, v) {
    const s = v.s;
    drawTracks(c, -46, 42, 0, 22, v.wheel);
    rbox(c, -44, -50, 66, 30, 8, '#fab005');
    drawStack(c, -30, -48, 14);
    cabWindow(c, v, -38, -86, 36, 36, 9, [-18, -50, 0.46]);
    rbox(c, -42, -92, 44, 9, 4, '#fab005');
    // Tall mast at the front with the drill rod going down into the hole.
    rbox(c, 26, -170, 18, 152, 4, '#fab005');
    c.strokeStyle = '#e67700'; c.lineWidth = 2;
    for (let y = -166; y < -26; y += 14) { c.beginPath(); c.moveTo(28, y); c.lineTo(42, y + 12); c.stroke(); }
    const d = (s.drill || 0) / 1.6;
    rbox(c, 31, -170 + d * 130, 8, 50 + d * 50, 2, '#9aa0aa', 2);
    rbox(c, 24, -176 + d * 130, 22, 12, 3, '#495057', 3);   // rotary head slides down the mast
    if (d > 0) { c.save(); c.translate(35, 2 + d * 30); c.rotate(s.spin || 0); poly(c, [-8, 0, 8, 0, 0, 12], '#c9cdd4', 2); c.restore(); }
  },
});

// ---------- Haul truck and the dump truck's shared tipping ----------
function truckTip(v, dt, inp) {
  const s = v.s;
  if (inp.actionP && !s.tipping) {
    if (s.load > 0) { s.tipping = true; Sound.tone(150, 0.6, 'sawtooth', 0.06, 90); }
    else { Sound.bonk(); }
  }
  if (s.tipping) {
    s.tip = Math.min(1, s.tip + dt * 1.6);
    if (s.tip >= 1 && s.load > 0) {
      if (typeof Mine !== 'undefined' && Mine.hopperNear(v)) Mine.toHopper(s.ore || 0, v);
      else {
        const back = Math.floor((v.body.x - v.facing * (v.body.w / 2 + 6)) / TS);
        const cols = [back, back - v.facing, back - 2 * v.facing];
        const row = v.feetRow() - 6;
        const dirt = Game.away === 'pilbara' ? T.REDDIRT : T.DIRT;
        let k = 0, ore = s.ore || 0;
        while (s.load > 0 && k < 40) { dropTileInColumn(cols[k % 3], ore > 0 ? T.BROKENORE : dirt, row); ore--; s.load--; k++; }
        Sound.dig(); Sound.place();
        Fx.burst(v.body.x - v.facing * v.body.w * 0.6, v.body.y - 20, 14, { speed: 160, up: 50, g: 500, life: 0.7, r: 6, color: ['#a0662e', '#8a5524'], shape: 'rect' });
      }
      s.load = 0; s.ore = 0;
    }
    if (s.load === 0 && s.tip >= 1) s.tipping = false;
  } else s.tip = Math.max(0, s.tip - dt * 1.2);
  s.slow = s.tip > 0 ? 0.3 : 1;
}

defVehicle('haultruck', {
  name: 'Haul truck', iconScale: 0.36, say: 'Giant haul truck!', icon: '⤵️', w: 170, h: 110, speed: 210, accel: 2, unlock: 0, noSave: true,
  hauls: true, cap: 18, exhaust: [10, -128], look: 200,
  init(v) { Object.assign(v.s, { load: 0, ore: 0, tip: 0, tipping: false }); },
  act(v, dt, inp) { truckTip(v, dt, inp); },
  draw(c, v) {
    const s = v.s;
    rbox(c, -82, -52, 164, 20, 6, '#495057', 4);
    // Huge tray, hinged at the back.
    c.save(); c.translate(-84, -50); c.rotate(-(s.tip || 0) * 0.75);
    poly(c, [0, 0, 112, 0, 124, -48, 112, -58, -6, -58], '#fab005', 4);
    const fill = Math.min(1, (s.load || 0) / this.cap);
    if (fill > 0) ell(c, 58, -58, 54 * Math.max(0.5, fill), 18 * fill + 4, s.ore ? '#7a2e22' : '#c4532a', 3);
    c.fillStyle = '#e67700'; c.fillRect(10, -40, 96, 5); c.fillRect(10, -22, 96, 5);
    c.restore();
    drawRam(c, 10, -50, 10 - Math.sin((s.tip || 0) * 0.75) * 60, -56 - (s.tip || 0) * 50);
    // Cab perched up top with a ladder: real ones are as tall as a house.
    rbox(c, 34, -96, 54, 46, 6, '#fab005');
    cabWindow(c, v, 48, -126, 34, 30, 6, [58, -96, 0.42]);
    rbox(c, 30, -132, 62, 8, 3, '#fab005', 3);
    for (let i = 0; i < 4; i++) limb(c, [82, -48 + i * -12, 92, -48 + i * -12], 2, '#343a40', 0);
    limb(c, [82, -96, 82, -48], 2, '#343a40', 0); limb(c, [92, -96, 92, -48], 2, '#343a40', 0);
    drawStack(c, 10, -96, 22);
    drawHeadlight(c, 86, -70);
    // Tyres taller than a dino.
    drawWheel(c, -50, -24, 26, v.wheel, '#fab005'); drawWheel(c, 54, -24, 26, v.wheel, '#fab005');
  },
});

// ---------- Ore train ----------
defVehicle('oretrain', {
  name: 'Ore train', iconScale: 0.3, iconX: 50, say: 'The ore train!', icon: '📯', w: 130, h: 86, mover: 'rail', speed: 320, horn: 'boat', unlock: 0, back: true, look: 260, noSave: true,
  init(v) { v.s.ore = [0, 0, 0]; },
  canExit() { return true; },
  move(v, dt, inp, dir) {
    const b = v.body;
    b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * (dir ? 0.7 : 1.4)));
    if (dir) v.facing = dir;
    const lo = (PIL.TRACK[0] + 6) * TS, hi = (PIL.TRACK[1] - 4) * TS;
    b.x = clamp(b.x + b.vx * dt, lo, hi);
    if (b.x === lo || b.x === hi) b.vx = 0;
    b.y = TRACK_Y - 6;
    v.wheel += b.vx * dt / 14;
    if (Math.abs(b.vx) > 40 && Math.random() < 0.15) Fx.add({ x: b.x + v.facing * 20, y: b.y - 92, vx: -b.vx * 0.2, vy: rand(-40, -20), life: 1, r: 6, color: 'rgba(90,90,100,0.4)', shape: 'grow' });
  },
  act(v, dt, inp) {
    if (inp.actionP) v.hornSound();
    Mine.updateTrain(v, dt);
  },
  draw(c, v) {
    const s = v.s;
    for (let k = 1; k <= 3; k++) {
      const ox = -k * 124;
      const tipped = s.tipShow > 0 && s.tipWagon === k - 1;
      c.save(); c.translate(ox, -46); if (tipped) c.rotate(Math.sin(s.tipShow * Math.PI) * 0.9);
      poly(c, [-54, -36, 54, -36, 46, 22, -46, 22], '#c92a2a', 4);
      c.fillStyle = '#a61e1e'; for (let i = 0; i < 4; i++) c.fillRect(-44 + i * 24, -28, 4, 46);
      const f = (s.ore ? s.ore[k - 1] : 0) / Mine.CAP;
      if (f > 0 && !tipped) ell(c, 0, -36, 50 * Math.max(0.4, f), 6 + 16 * f, '#7a2e22', 3);
      c.restore();
      drawWheel(c, ox - 34, -12, 12, v.wheel); drawWheel(c, ox + 34, -12, 12, v.wheel);
      limb(c, [ox + 54, -26, ox + 70, -26], 4, '#555');
    }
    // Big diesel locomotive.
    rbox(c, -64, -84, 128, 64, 6, '#ff922b');
    c.fillStyle = '#1c4e80'; c.fillRect(-60, -48, 120, 10);
    cabWindow(c, v, 20, -80, 36, 26, 5, [36, -46, 0.4]);
    rbox(c, -50, -100, 50, 16, 4, '#495057', 3);
    drawHeadlight(c, 62, -66);
    for (const wx of [-42, -16, 18, 44]) drawWheel(c, wx, -14, 12, v.wheel, '#ffd43b');
  },
});

// ---------- Ship loader ----------
const LOADER_BOOM = 19 * TS;
defVehicle('shiploader', {
  name: 'Ship loader', iconScale: 0.3, say: 'Ship loader!', icon: '⬇️', w: 90, h: 80, speed: 110, unlock: 0, look: 380, noSave: true, horn: 'boat',
  init(v) { v.s.sayT = 0; v.s.pour = 0; },
  tipX(v) { return v.body.x + LOADER_BOOM; },
  move(v, dt, inp, dir) {
    const b = v.body;
    b.vx = lerp(b.vx, dir * this.speed, Math.min(1, dt * 3));
    v.facing = 1;
    b.x = clamp(b.x + b.vx * dt, (PIL.WHARF[0] + 2) * TS + 16, (PIL.WHARF[1] - 1) * TS + 16);
    b.y = SURF * TS - 0.01;
    v.wheel += b.vx * dt / 10;
  },
  act(v, dt, inp) {
    const s = v.s;
    s.sayT -= dt;
    s.pour = 0;
    if (!inp.action) return;
    const i = Mine.holdUnder(this.tipX(v));
    if (Mine.ship.state !== 'berth') return;
    if (Mine.port <= 0) { if (s.sayT <= 0) { s.sayT = 4; Sound.bonk(); Sound.say('No ore at the port yet. Bring it on the train!'); } return; }
    if (i < 0) { if (s.sayT <= 0) { s.sayT = 3; Sound.say('Move along until the chute is over a hatch on the ship.'); } return; }
    if (Mine.pour(i, dt)) s.pour = 1;
  },
  draw(c, v) {
    const s = v.s;
    // Rail-mounted gantry with a long boom out over the ship.
    for (const lx of [-36, 36]) { limb(c, [lx, -8, lx * 0.5, -150], 8, '#ffd43b'); drawWheel(c, lx, -8, 9, v.wheel); }
    rbox(c, -44, -190, 88, 44, 6, '#ffd43b');
    cabWindow(c, v, -30, -184, 34, 30, 6, [-16, -154, 0.4]);
    const L = LOADER_BOOM;
    limb(c, [20, -170, L, -150], 12, '#ffd43b');
    c.strokeStyle = '#e8a400'; c.lineWidth = 2;
    for (let x = 40; x < L - 10; x += 26) { c.beginPath(); c.moveTo(x, -175 + (x / L) * 20); c.lineTo(x + 13, -160 + (x / L) * 20); c.stroke(); }
    limb(c, [0, -190, 0, -230, L * 0.6, -160], 3, '#495057', 0);   // stay cable
    // Chute at the end of the boom.
    rbox(c, L - 12, -150, 24, 40, 4, '#495057', 3);
    if (s.pour) for (let i = 0; i < 4; i++) ell(c, L + rand(-6, 6), -100 + ((Game.t * 260 + i * 22) % 80), 6, 5, '#7a2e22', 2);
  },
});
