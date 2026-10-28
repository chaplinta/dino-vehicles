// Rocket: countdown on the launch pad, a trip to space, then a parachute landing.
defVehicle('rocket', {
  name: 'Rocket', iconScale: 0.55, say: 'Rocket! Press the button to blast off!', icon: '🚀', w: 70, h: 150, mover: 'rocket', unlock: 30, look: 0, camY: -120,
  init(v) { v.s.state = 'idle'; v.s.t = 0; },
  reset(v) { v.s.state = 'idle'; },
  canExit(v) { return v.s.state === 'idle'; },
  move(v, dt, inp, dir) {
    const b = v.body, s = v.s;
    s.t += dt;
    if (s.state === 'idle') { b.vx = 0; moveBody(b, dt, {}); }
    else if (s.state === 'count') {
      b.vx = 0; moveBody(b, dt, {});
      // 10 seconds to blast off; just 3 if the asteroid is about to hit, so you can still escape.
      const n = s.count - Math.floor(s.t);
      if (n !== s.lastN && n > 0) { s.lastN = n; Sound.tone(n <= 3 ? 660 : 440, 0.2, 'square', 0.08); }
      if (s.t > s.count) { s.state = 'launch'; s.t = 0; Sound.noise(3, 0.4, 'lowpass', 400, 0, 1500); }
      if (n <= 3 && Math.random() < 0.5) { this.smoke(v, 0.3); if (Math.random() < 0.2) Sound.noise(0.2, 0.08, 'lowpass', 200); }
    } else if (s.state === 'launch') {
      b.vy = Math.max(-900, b.vy - 700 * dt);
      b.x += (dir * 120) * dt;
      b.y += b.vy * dt;
      this.smoke(v, 1);
      if (b.y < -900) {
        if (Game.onMoon) Moon.leave(v);   // from the Moon: straight home
        else { s.state = 'space'; Space.start(v); }
      }
    } else if (s.state === 'space') {
      // Space trip runs as an overlay; rocket waits up high.
    } else if (s.state === 'chute') {
      b.vx = lerp(b.vx, dir * 100, dt * 2);
      b.vy = lerp(b.vy, 140, dt * 2);
      moveBody(b, dt, { gravity: 0 });
      if (b.onGround) {
        s.state = 'idle';
        if (Game.onMoon) Moon.landed(v);
        else { Sound.land(); Game.celebrate('Welcome home!'); }
      }
    }
  },
  // The countdown, in big numbers over the rocket.
  drawWorld(c, v) {
    const s = v.s;
    if (s.state !== 'count') return;
    const n = Math.max(1, s.count - Math.floor(s.t)), k = 1 + (1 - (s.t % 1)) * 0.4;
    bigText(c, String(n), v.body.x, v.body.y - 300, Math.round(70 * k), n <= 3 ? '#ff6b6b' : '#fff');
  },
  smoke(v, k) {
    const b = v.body;
    for (let i = 0; i < 2; i++) Fx.add({ x: b.x + rand(-16, 16), y: b.y + 4, vx: rand(-120, 120) * k, vy: rand(40, 160), life: 1.4, r: 14, color: pick(['rgba(240,240,240,0.9)', 'rgba(255,200,120,0.9)']), shape: 'grow' });
  },
  act(v, dt, inp) {
    if (inp.actionP && v.s.state === 'idle') {
      v.s.state = 'count'; v.s.t = 0; v.s.count = Asteroid.left < 30 ? 3 : 10; v.s.lastN = v.s.count + 1;
    }
  },
  draw(c, v) {
    const s = v.s;
    if (s.state === 'launch' || (s.state === 'count' && s.count - s.t < 3)) {
      const f = s.state === 'launch' ? 1 : 0.3;
      const fl = 30 + Math.random() * 30 * f + 40 * f;
      poly(c, [-18, -6, 18, -6, 0, fl], '#ff922b', 0);
      poly(c, [-10, -6, 10, -6, 0, fl * 0.6], '#ffe066', 0);
    }
    if (s.state === 'chute') {
      c.strokeStyle = OUT; c.lineWidth = 2;
      for (const x of [-60, 0, 60]) { c.beginPath(); c.moveTo(0, -150); c.lineTo(x, -250); c.stroke(); }
      c.beginPath(); c.arc(0, -250, 70, Math.PI, TAU); c.closePath(); fillStroke(c, '#ff6b6b');
      c.beginPath(); c.arc(0, -250, 70, Math.PI * 1.33, Math.PI * 1.66); c.lineTo(0, -250); c.fillStyle = '#fff'; c.fill();
    }
    poly(c, [-26, -40, -50, 0, -26, -10], '#e8262b', 4);
    poly(c, [26, -40, 50, 0, 26, -10], '#e8262b', 4);
    c.beginPath(); c.moveTo(0, -150); c.quadraticCurveTo(38, -110, 30, -10); c.lineTo(-30, -10); c.quadraticCurveTo(-38, -110, 0, -150); c.closePath();
    fillStroke(c, '#f8f9fa');
    c.save(); c.beginPath(); c.moveTo(0, -150); c.quadraticCurveTo(38, -110, 30, -10); c.lineTo(-30, -10); c.quadraticCurveTo(-38, -110, 0, -150); c.clip();
    c.fillStyle = '#e8262b'; c.fillRect(-40, -160, 80, 40); c.restore();
    c.beginPath(); c.moveTo(0, -150); c.quadraticCurveTo(38, -110, 30, -10); c.lineTo(-30, -10); c.quadraticCurveTo(-38, -110, 0, -150); c.closePath(); fillStroke(c, null);
    c.beginPath(); c.arc(0, -78, 22, 0, TAU); c.fillStyle = '#bdf3ff'; c.fill();
    c.save(); c.beginPath(); c.arc(0, -78, 22, 0, TAU); c.clip(); v.drawDriver(c, -2, -50, 0.4); c.restore();
    c.beginPath(); c.arc(0, -78, 22, 0, TAU); c.lineWidth = 7; c.strokeStyle = '#868e96'; c.stroke();
    rbox(c, -18, -12, 36, 12, 4, '#868e96');
  },
});

// The space mini-game: steer the rocket, collect stars, bump into friendly asteroids.
const Space = {
  rocket: null,
  start(rocket) {
    this.rocket = rocket;
    this.t = 0; this.x = W / 2; this.y = 400; this.got = 0;
    this.items = []; this.spawnD = 0; this.wob = 0;
    this.bg = Array.from({ length: 120 }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.3, 1.2) }));
    this.planets = [{ x: 200, y: -100, r: 70, c: '#9775fa', ring: true }];
    Game.overlay = this;
    UI.configure({ dirs: 'all', action: '🔥', roar: false, home: false });
    Sound.say('We are in space! Catch the stars!');
  },
  update(dt) {
    this.t += dt;
    const boost = Input.held.action ? 2.2 : 1;
    const speed = 160 * boost;
    const dx = (Input.held.right ? 1 : 0) - (Input.held.left ? 1 : 0);
    const dy = (Input.held.down ? 1 : 0) - (Input.held.up ? 1 : 0);
    this.x = clamp(this.x + dx * 380 * dt, 50, W - 50);
    this.y = clamp(this.y + dy * 260 * dt, 160, H - 80);
    this.wob = Math.max(0, this.wob - dt);
    for (const s of this.bg) { s.y += speed * s.z * dt; if (s.y > H) { s.y = 0; s.x = rand(0, W); } }
    for (const p of this.planets) p.y += speed * 0.3 * dt;
    if (this.planets[this.planets.length - 1].y > 200 && this.t < 26) this.planets.push({ x: rand(100, W - 100), y: -200, r: rand(40, 90), c: pick(['#ff8787', '#4dabf7', '#69db7c', '#ffa94d']), ring: Math.random() < 0.4 });
    this.planets = this.planets.filter(p => p.y < H + 200);
    this.spawnD += speed * dt;
    if (this.spawnD > 110 && this.t < 28) {
      this.spawnD = 0;
      const r = Math.random();
      this.items.push({ x: rand(40, W - 40), y: -40, kind: r < 0.65 ? 'star' : r < 0.9 ? 'rock' : 'ufo', rot: 0, vx: 0, pts: rockShape() });
    }
    for (const it of this.items) {
      it.y += speed * dt; it.x += it.vx * dt; it.rot += dt * 2;
      if (it.gone) continue;
      const d = dist(it.x, it.y, this.x, this.y - 30);
      if (it.kind === 'star' && d < 50) { it.gone = true; this.got++; Game.addStars(1); Sound.collect(); }
      else if (it.kind === 'ufo' && d < 60) { it.gone = true; it.vx = 500; Game.addStars(2); Sound.squeak(); Sound.say('Hello alien!'); }
      else if (it.kind === 'rock' && d < 56 && !it.hit) { it.hit = true; it.vx = Math.sign(it.x - this.x || 1) * 300; this.wob = 0.6; Sound.bonk(); }
    }
    this.items = this.items.filter(it => it.y < H + 60 && !(it.gone && it.kind === 'star'));
    if (this.t > 30) this.finish();
  },
  finish() {
    Game.overlay = null;
    if (!this.rocket) return;
    // Next stop: the Moon.
    Moon.enter(this.rocket);
    if (this.got > 0) Hud.celebrate(`${this.got} stars!`);
    Sound.say('Look! The Moon! Landing now.');
  },
  tap() { return true; },
  close() { this.finish(); },
  draw(c) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b0b2b'); g.addColorStop(1, '#1b1f5c');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const s of this.bg) { c.fillStyle = `rgba(255,255,255,${0.4 + s.z * 0.4})`; c.fillRect(s.x, s.y, s.z * 3, s.z * 3); }
    for (const p of this.planets) {
      ell(c, p.x, p.y, p.r, p.r, p.c, 4);
      ell(c, p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.25, p.r * 0.2, 'rgba(255,255,255,0.3)', 0);
      if (p.ring) ell(c, p.x, p.y, p.r * 1.6, p.r * 0.3, null, 5, -0.2);
    }
    for (const it of this.items) {
      if (it.kind === 'star') drawStar(c, it.x, it.y, 22, it.rot * 0.3, '#ffd43b', 3);
      else if (it.kind === 'rock') drawSpaceRock(c, it);
      else {
        ell(c, it.x, it.y - 12, 20, 18, '#bdf3ff', 3);
        drawDinoSeated(c, it.x - 2, it.y + 6, 0.25, 'raptor', { t: this.t });
        ell(c, it.x, it.y + 2, 46, 14, '#69db7c', 4);
        for (let i = 0; i < 3; i++) ell(c, it.x - 24 + i * 24, it.y + 4, 4, 4, Math.floor(this.t * 6 + i) % 2 ? '#ffd43b' : '#fff', 2);
      }
    }
    c.save(); c.translate(this.x, this.y + 60);
    c.rotate(Math.sin(this.t * 20) * this.wob * 0.4);
    const fake = { s: { state: 'launch' }, t: this.t, driver: Player, drawDriver: Vehicle.prototype.drawDriver, def: VEHICLE_DEFS.rocket };
    VEHICLE_DEFS.rocket.draw(c, fake);
    c.restore();
    bigText(c, String(Math.max(0, Math.ceil(30 - this.t))), 60, 60, 40, '#fff');
  },
};

// A lumpy, cratered space rock (not a smooth egg): a jagged outline made once per rock.
function rockShape() {
  const n = randi(9, 12), pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU + rand(-0.15, 0.15), r = rand(22, 36); pts.push(Math.cos(a) * r, Math.sin(a) * r * 0.85); }
  const craters = Array.from({ length: randi(2, 3) }, () => [rand(-14, 12), rand(-12, 10), rand(4, 8)]);
  return { pts, craters, spin: rand(-1.5, 1.5) };
}
function drawSpaceRock(c, it) {
  const s = it.pts || (it.pts = rockShape());
  c.save(); c.translate(it.x, it.y); c.rotate((it.rot || 0) + Space.t * s.spin);
  poly(c, s.pts, '#7c7468', 4);
  // Shadow on one side, a lit edge on the other.
  c.save(); c.beginPath(); for (let i = 0; i < s.pts.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, s.pts[i], s.pts[i + 1]); c.closePath(); c.clip();
  c.fillStyle = 'rgba(30,25,20,0.35)'; c.beginPath(); c.arc(16, 14, 36, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(-18, -16, 20, 0, TAU); c.fill();
  for (const [x, y, r] of s.craters) { ell(c, x, y, r, r * 0.8, '#5f574d', 0); ell(c, x - r * 0.25, y - r * 0.25, r * 0.6, r * 0.45, '#4a433b', 0); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.8); c.stroke(); }
  c.fillStyle = '#9a9184'; for (let i = 0; i < 5; i++) c.fillRect(s.pts[i * 2] * 0.5, s.pts[i * 2 + 1] * 0.5, 2, 2);
  c.restore();
  poly(c, s.pts, null, 4);
  c.restore();
}
