// Other dinosaurs: wanderers, workers driving their own vehicles, and dinos who need help.
let npcId = 1;
function makeNPC(o) {
  const baby = !!o.baby;
  const n = Object.assign({
    id: npcId++, type: pick(DINO_KEYS), baby, facing: pick([-1, 1]), walk: 0, t: rand(0, 9), blinkSeed: rand(0, 9),
    roarT: 0, state: 'idle', timer: rand(1, 3), dir: 0, home: o.x, range: 6 * TS, bubble: null, hop: 0,
    fighter: !o.baby && Math.random() < 0.5, hits: 0, angry: 0, atk: null, atkCool: 0,   // about half fight back
    vehicle: null, ride: null, need: null, input: null, script: null, heartT: 0,
  }, o);
  const box = dinoBox(n.type, baby);
  n.body = makeBody(o.x, o.y, box.w, box.h);
  return n;
}
// Dinos climb walls like you do, so nobody stays stuck down a hole (pirates chasing you out of the
// treasure hole, dinos that fell into a dug pit). Fighting dinos that haven't moved for 2 s get a big hop.
function climbOut(n, dt, chasing) {
  const b = n.body;
  n.pushT = b.hitWall ? (n.pushT || 0) + dt : 0;   // walking into a wall too tall to hop
  if (n.pushT > 0.3) {
    // Find the lip in front and hop just high enough to clear it (up to 6 tiles).
    const fx = Math.floor((b.x + b.hitWall * (b.w / 2 + 4)) / TS);
    let ty = Math.floor((b.y - 1) / TS);
    while (ty > b.y / TS - 7 && World.solid(fx, ty)) ty--;
    const h = b.y - (ty + 1) * TS;
    if (h > 0 && h < 6 * TS) { b.vy = -Math.sqrt(2 * GRAVITY * (World.gravity || 1) * (h + 20)); n.pushT = 0; }
  }
  if (!chasing) return;
  n.stillT = Math.abs(b.x - (n.lastX ?? b.x)) < 3 ? (n.stillT || 0) + dt : 0;
  n.lastX = b.x;
  if (n.stillT > 2 && b.onGround) { b.vy = -760; n.stillT = 0; }
}
function bubble(c, x, y, icon, t) {
  const b = Math.sin(t * 4) * 4;
  rbox(c, x - 26, y - 56 + b, 52, 44, 14, '#fff', 4);
  poly(c, [x - 8, y - 14 + b, x + 8, y - 14 + b, x, y - 2 + b], '#fff', 0);
  c.beginPath(); c.moveTo(x - 8, y - 12 + b); c.lineTo(x, y - 2 + b); c.lineTo(x + 8, y - 12 + b); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
  c.font = `28px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = OUT; c.fillText(icon, x, y - 33 + b);
}

// Comic-book burst where a blow lands.
const Pow = {
  list: [],
  add(x, y, text) { this.list.push({ x, y, text, t: 0, rot: rand(-0.3, 0.3) }); },
  update(dt) { for (const p of this.list) p.t += dt; this.list = this.list.filter(p => p.t < 0.75); },
  draw(c) {
    for (const p of this.list) {
      const k = p.t < 0.12 ? p.t / 0.12 * 1.25 : p.t < 0.22 ? 1.25 - (p.t - 0.12) * 2.5 : 1;
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(k, k);
      c.globalAlpha = p.t > 0.55 ? 1 - (p.t - 0.55) / 0.2 : 1;
      const pts = [];
      for (let i = 0; i < 24; i++) { const r = i % 2 ? 34 : 62 + (i % 4 === 0 ? 10 : 0), a = i / 24 * TAU; pts.push(Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.85); }
      poly(c, pts, '#ff6b6b', 5);
      const inner = pts.map((v, i) => v * 0.72);
      poly(c, inner, '#ffd43b', 0);
      c.font = `900 26px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 6; c.strokeStyle = OUT; c.strokeText(p.text, 0, 2); c.fillStyle = '#fff'; c.fillText(p.text, 0, 2);
      c.restore();
    }
  },
};

// Pick on too many dinos and they all come for you: a swarm for 10 seconds.
const Swarm = {
  LIMIT: 20, TIME: 10, SIZE: 8,
  active: false, t: 0, hits: 0,
  reset() { this.active = false; this.t = 0; this.hits = 0; },
  counted() {
    this.hits++;
    if (this.hits === this.LIMIT - 5 && !this.active) setTimeout(() => Sound.say('Careful! The dinos are getting cross.'), 900);
    if (this.hits >= this.LIMIT && !this.active) this.start();
  },
  start() {
    this.active = true; this.t = this.TIME; this.hits = 0;
    const pb = Player.vehicle ? Player.vehicle.body : Player.body;
    const lim = (World.limitW || WORLD_W) - 3;
    for (let i = 0; i < this.SIZE; i++) {
      const side = i % 2 ? 1 : -1;
      const tx = clamp(Math.floor((pb.x + side * (Game.viewW / 2 + 60 + Math.floor(i / 2) * 90)) / TS), 2, lim);
      const y = World.groundBelow(tx, Math.max(0, Math.floor(pb.y / TS) - 8)) * TS - 0.01;
      const n = NPCs.add({ x: tx * TS + 16, y, type: pick(DINO_KEYS), baby: false });
      Object.assign(n, { fighter: true, swarm: true, angry: this.TIME + 1, atkCool: rand(0.2, 1.2), facing: -side, greeted: true });
    }
    Sound.noise(1.6, 0.35, 'lowpass', 180); Sound.roar();
    Game.celebrate('DINO SWARM!', 'Uh oh! You made the dinos cross. Here they come! Hide in a vehicle!');
  },
  update(dt) {
    if (!this.active) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.active = false;
    for (const n of NPCs.list) if (n.swarm && !n.leaving) {
      n.angry = 0; n.atk = null; n.leaving = true; n.scaredT = 6; n.fleeDir = Math.sign(n.body.x - Player.cx) || 1;
    }
    Game.addStars(3); Game.popupStar(Player.cx, Player.cy - 100);
    Game.celebrate('Phew!', 'Phew! The dinos calmed down and went home.');
  },
  // Red pulsing edges and a countdown while it lasts.
  drawHud(c) {
    if (!this.active) return;
    const a = 0.25 + 0.2 * Math.sin(Game.t * 10);
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(230,30,30,${a})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    bigText(c, `😡 ${Math.ceil(this.t)}`, W / 2, 150, 40, '#ff6b6b');
  },
};

const NPCs = {
  list: [],
  spawnDefaults() {
    this.list = [];
    Vehicles.list = Vehicles.list.filter(v => !v.def.noSave && !v.npcOwned);
    const g = tx => World.groundBelow(tx, World.genSurf[tx] - 3) * TS - 0.01;
    const walker = (tx, extra = {}) => this.add(Object.assign({ x: tx * TS + 16, y: g(tx) }, extra));
    // Wanderers.
    // Wanderers all over: farm, town, building site, beach, mountains, launch pad.
    walker(8, { type: 'tri' }); walker(40, { type: 'stego', baby: true }); walker(52, { type: 'iguano' }); walker(72, {});
    walker(110, {}); walker(128, { baby: true }); walker(146, { type: 'brachio' }); walker(165, {}); walker(178, { baby: true, type: 'tri' });
    walker(206, { type: 'styraco' });
    walker(236, { type: 'ankylo' }); walker(262, { type: 'pachy' }); walker(286, {});
    walker(308, { type: 'raptor', baby: true }); walker(318, { type: 'bary' }); walker(404, { baby: true });
    walker(448, {}); walker(480, { type: 'ptero' }); walker(520, { type: 'ptero', baby: true });
    walker(572, { type: 'megalo' }); walker(604, { type: 'carno' }); walker(658, {}); walker(696, { type: 'raptor', baby: true });
    // The wild end: jungle, volcano, desert, snow, and the launch pad.
    walker(750, { type: 'raptor' }); walker(796, { type: 'iguano' }); walker(838, { type: 'ptero', baby: true });
    walker(874, { type: 'ankylo' }); walker(958, { type: 'megalo' }); walker(1000, { type: 'styraco' }); walker(1072, { type: 'tri' });
    walker(1150, { type: 'pachy' }); walker(1178, { baby: true }); walker(1232, { type: 'allo' });
    // Half the grown-ups fight back, chosen at random.
    const adults = this.list.filter(n => !n.baby);
    for (const n of adults) n.fighter = false;
    const fighters = Math.round(adults.length / 2);
    for (let k = 0; k < fighters && adults.length; k++) adults.splice(Math.floor(Math.random() * adults.length), 1)[0].fighter = true;
    // Workers with vehicles.
    this.worker('tractor', 20, 'rex', farmerScript);
    this.worker('digger', 246, 'tri', diggerScript, -1);
    this.worker('crane', 258, 'brachio', builderScript, 1);
    this.worker('police', 120, 'raptor', patrolScript(104, 212));
    this.worker('fishboat', 372, 'ptero', fisherScript);
    this.worker('plane', 30, 'ptero', dusterScript);
    for (const [kind, stops, pause] of TRAFFIC) this.worker(kind, stops[0], pick(DINO_KEYS.filter(k => k !== 'brachio')), routeScript(stops, pause), stops[1] > stops[0] ? 1 : -1);
  },
  worker(kind, tx, type, script, facing = 1) {
    if (!VEHICLE_DEFS[kind]) return;
    const v = Vehicles.spawnAtGround(kind, tx, facing);
    v.npcOwned = true;
    const n = makeNPC({ x: v.body.x, y: v.body.y, type, role: 'worker' });
    n.vehicle = v; v.driver = n; n.script = script; n.input = Object.assign({}, IDLE_INPUT); n.mem = {};
    if (kind === 'plane') { v.s.flying = true; v.body.y = (SURF - 9) * TS; }
    this.list.push(n);
    return n;
  },
  add(o) { const n = makeNPC(o); liftOut(n.body); this.list.push(n); return n; },
  remove(n) {
    if (n.ride) { const ps = n.ride.passengers; ps.splice(ps.indexOf(n), 1); }
    this.list.splice(this.list.indexOf(n), 1);
  },

  // The player bit, headbutted or tail-whacked this dino: stars, a hop, and off it runs.
  hit(n, fromX, kind = 'bite') {
    const b = n.body, away = Math.sign(b.x - fromX) || 1;
    n.grabbedT = 0;
    Pow.add(b.x - away * 18, b.y - b.h * 0.6, POW_WORD[kind] || 'POW!');
    n.atk = null;
    Swarm.counted();
    Fx.burst(b.x, b.y - b.h, 14, { speed: 260, up: 120, g: 300, life: 0.9, r: 10, color: ['#ffd43b', '#fff3bf'], shape: 'star' });
    Sound.noise(0.12, 0.25, 'lowpass', 700);
    b.vy = kind === 'kick' ? -620 : kind === 'peck' ? -420 : -520; b.vx = away * (kind === 'kick' ? 520 : kind === 'peck' ? 380 : 460);
    n.tumble = away * 0.01;   // spins head over tail while flying
    if (n.need) { n.angryT = 1.5; return; }   // dinos waiting for help stay put
    n.hits++;
    if (n.fighter && n.hits < 3) {
      // A tough one: knocked back, but it comes straight back at you.
      b.vy = -380; b.vx = away * 300;
      n.angry = 10; n.atkCool = 0.8; n.scaredT = 0; n.facing = -away;
      Sound.tone(110, 0.45, 'sawtooth', 0.09, 70); Sound.tone(90, 0.45, 'square', 0.04, 60);
      return;
    }
    n.angry = 0; n.fighter = false;
    if (n.swarm) n.leaving = true;
    n.scaredT = 3.5; n.fleeDir = away; n.facing = away; n.greeted = true;
    if (n.type === 'ptero') n.flyMax = n.flyT = 3;
    if (n.baby) { Sound.squeak(); Sound.tone(1300, 0.15, 'sine', 0.08, 1700, 0.3); }
    else { Sound.yelp(); Sound.tone(650, 0.22, 'sine', 0.09, 1300, 0.35); Sound.tone(600, 0.22, 'sine', 0.08, 1250, 0.75); }
  },
  // On-foot dinos the player can reach: in front, or either side for a tail whack.
  inReach(x, y, facing, kind) {
    return this.list.filter(n => {
      if (n.vehicle || n.ride) return false;
      const dx = (n.body.x - x) * facing, dy = Math.abs(n.body.y - y);
      return dy < 70 && (kind === 'tail' ? Math.abs(dx) < 95 : kind === 'charge' ? dx > -15 && dx < 230 : dx > -15 && dx < 95);
    });
  },
  heardRoar(x, y) {
    for (const n of this.list) {
      if (n.ride || dist(n.body.x, n.body.y, x, y) > 500) continue;
      const delay = rand(0.3, 0.9);
      setTimeout(() => {
        if (n.vehicle) { n.vehicle.hornSound(); return; }
        n.roarT = 0.8; n.body.vy = -380; n.heartT = 1.5;
        if (n.baby) Sound.squeak(); else Sound.tone(rand(180, 260), 0.4, 'sawtooth', 0.05, 90);
      }, delay * 1000);
    }
  },

  update(dt) {
    const cam = Game.cam;
    Pow.update(dt);
    for (const n of [...this.list]) {
      n.t += dt;
      n.roarT = Math.max(0, n.roarT - dt);
      n.heartT = Math.max(0, n.heartT - dt);
      n.angryT = Math.max(0, (n.angryT || 0) - dt);
      if (n.vehicle) { if (n.script) n.script(n, n.vehicle, dt); continue; }
      if (n.beamedBy) { n.walk += dt * 12; continue; }   // carried by the saucer's beam: legs going
      if (n.ride) { this.updateRider(n, dt); continue; }
      const far = Math.abs(n.body.x - (cam.x + Game.viewW / 2)) > Game.viewW * 1.6;
      if (far) continue;
      if (n.need) this.checkBoard(n);
      if (n.leaving && (n.scaredT <= 0 || Math.abs(n.body.x - Player.cx) > Game.viewW * 1.2)) { this.remove(n); continue; }
      if (n.grabbedT > 0) { n.grabbedT -= dt; n.body.vx = 0; n.scaredT = 0; n.heartT = 0; continue; }
      if (n.tumble) { n.tumble += Math.sign(n.tumble) * dt * 14; if (n.body.onGround && Math.abs(n.tumble) > 1) n.tumble = 0; }
      if (n.angry > 0 && !n.grabbedT) { this.fight(n, dt); continue; }
      this.wander(n, dt);
    }
  },
  // A cross dino: run at the player and use its own move on them.
  fight(n, dt) {
    const b = n.body, p = Player, pb = p.vehicle ? p.vehicle.body : p.body;
    n.angry -= dt; n.atkCool -= dt;
    if (n.angry <= 0) { n.home = b.x; n.range = 6 * TS; n.state = 'idle'; n.dir = 0; n.timer = rand(1, 3); n.atk = null; return; }
    const dx = pb.x - b.x;
    if (n.atk) {
      const A = ATTACKS[n.atk.kind];
      n.atk.t += dt;
      const charging = A.charge && !n.atk.hit && n.atk.t >= A.charge[0] && n.atk.t < A.charge[1];
      if (charging) {
        // Run at you head down; the BONK lands when it reaches you.
        b.vx = n.facing * 440;
        if (b.onGround && Math.random() < 0.5) Fx.add({ x: b.x - n.facing * 14, y: b.y - 4, vx: -n.facing * rand(40, 100), vy: rand(-60, -20), life: 0.5, r: 7, color: 'rgba(200,180,150,0.7)', shape: 'grow' });
        if (!p.vehicle && this.reachesPlayer(n, n.atk.kind) && (pb.x - b.x) * n.facing < 60) {
          n.atk.hit = true; p.hurt(b, n.atk.kind); b.vx = -n.facing * 150; n.atk.t = Math.max(n.atk.t, A.len - 0.25);
        }
      } else {
        if (!n.atk.hit && n.atk.t >= A.hitAt) { n.atk.hit = true; if (!A.charge && !p.vehicle && this.reachesPlayer(n, n.atk.kind)) p.hurt(b, n.atk.kind); }
        b.vx = lerp(b.vx, 0, Math.min(1, dt * 8));
      }
      if (n.atk.t >= A.len) n.atk = null;
    } else {
      if (Math.abs(dx) > 8) n.facing = Math.sign(dx);
      const charger = !!ATTACKS[n.attackKind || DINO_TYPES[n.type].attack].charge;
      const close = !p.vehicle && Math.abs(dx) < (charger ? 200 : 70) && Math.abs(pb.y - b.y) < 60;
      if (close && n.atkCool <= 0 && b.onGround && !(p.hurtT > 0)) {
        n.atk = { kind: n.attackKind || DINO_TYPES[n.type].attack, t: 0, hit: false };
        n.atkCool = rand(0.9, 1.6);
        attackSound(n.atk.kind);
      } else b.vx = lerp(b.vx, close ? 0 : n.facing * (n.swarm ? 250 : 230), Math.min(1, dt * 6));
    }
    moveBody(b, dt, { step: 1 });
    if (b.hitWall && b.onGround) b.vy = -560;
    climbOut(n, dt, true);
    n.walk = b.onGround && Math.abs(b.vx) > 15 ? n.walk + dt * Math.abs(b.vx) * 0.06 : 0;
  },
  reachesPlayer(n, kind) {
    const b = n.body, pb = Player.body;
    const dx = (pb.x - b.x) * n.facing, dy = Math.abs(pb.y - b.y);
    return dy < 70 && (kind === 'tail' ? Math.abs(dx) < 95 : dx > -15 && dx < 95);
  },
  wander(n, dt) {
    const b = n.body;
    if (n.scaredT > 0) {
      // Running away from the player.
      n.scaredT -= dt;
      if (!n.fleeDir) n.fleeDir = n.facing || 1;
      b.vx = lerp(b.vx, n.fleeDir * (n.baby ? 340 : 400), Math.min(1, dt * 6));
      if (b.onGround && Math.random() < 0.4) Fx.add({ x: b.x - n.fleeDir * 16, y: b.y - 4, vx: -n.fleeDir * rand(30, 80), vy: rand(-40, -10), life: 0.5, r: 7, color: 'rgba(200,180,150,0.6)', shape: 'grow' });
      n.facing = n.fleeDir; n.dir = n.fleeDir; n.state = 'walk';
      if (n.scaredT <= 0) { n.home = b.x; n.range = 6 * TS; n.state = 'idle'; n.dir = 0; n.timer = rand(1, 3); }
    } else if (n.need || n.stuck) { b.vx = n.angryT > 0 ? b.vx * 0.9 : 0; }
    else {
      n.timer -= dt;
      if (n.timer <= 0) {
        if (n.state === 'idle') { n.state = 'walk'; n.dir = b.x < n.home - n.range ? 1 : b.x > n.home + n.range ? -1 : pick([-1, 1]); n.timer = rand(1.5, 4); }
        else { n.state = 'idle'; n.dir = 0; n.timer = rand(1, 4); }
      }
      // Say hello when the player comes close.
      const pd = dist(Player.cx, Player.cy, b.x, b.y);
      if (pd < 140 && !n.greeted) { n.greeted = true; n.heartT = 1.2; n.state = 'idle'; n.timer = 1.5; n.dir = 0; b.vy = b.onGround ? -300 : b.vy; n.facing = Player.cx < b.x ? -1 : 1; }
      if (pd > 400) n.greeted = false;
      const sp = n.baby ? 90 : 110;
      b.vx = lerp(b.vx, n.dir * sp, Math.min(1, dt * 8));
      if (n.dir) n.facing = n.dir;
    }
    // Pterodactyls take off now and then and flutter about.
    let gravity = 1;
    if (n.type === 'ptero' && !n.need) {
      if (n.flyT > 0) {
        n.flyT -= dt; gravity = 0;
        const climbing = n.flyT > n.flyMax - 1.2;
        b.vy = lerp(b.vy, climbing ? -220 : Math.sin(n.t * 2) * 60, Math.min(1, dt * 3));
        if (!n.dir) n.dir = pick([-1, 1]);
      } else if (!b.onGround) { gravity = 0; b.vy = lerp(b.vy, 90, Math.min(1, dt * 3)); }
      else if (n.state === 'walk' && Math.random() < dt * 0.3) n.flyMax = n.flyT = rand(4, 7);
    }
    moveBody(b, dt, { step: 1, gravity });
    if (b.hitWall && b.onGround) { if (n.scaredT > 0 || Math.random() < 0.5) b.vy = -560; else { n.dir = -n.dir; } }
    climbOut(n, dt, n.scaredT > 0);
    n.walk = b.onGround && Math.abs(b.vx) > 15 ? n.walk + dt * Math.abs(b.vx) * 0.06 : 0;
  },
  // A dino who needs a lift hops in when the right vehicle stops nearby.
  checkBoard(n) {
    const need = n.need;
    const v = Vehicles.nearest(n.body.x, n.body.y - 20, need.kinds.includes('helicopter') ? 150 : 120,
      o => need.kinds.includes(o.kind) && o.driver === Player);
    if (!v) return;
    if (Math.abs(v.body.vx) > 90) return;
    v.passengers = v.passengers || [];
    if (v.passengers.length >= (v.def.seats || 1)) return;
    v.passengers.push(n);
    n.ride = v;
    Sound.pop(); Sound.say(need.board || 'Thank you!');
    Fx.burst(n.body.x, n.body.y - 20, 8, { speed: 120, life: 0.5, r: 6, color: '#fff' });
  },
  updateRider(n, dt) {
    const v = n.ride, need = n.need;
    n.body.x = v.body.x; n.body.y = v.body.y;
    if (!need) return;
    const there = Math.abs(v.body.x - need.destX) < (need.destR || 160) && (need.destY === undefined || Math.abs(v.body.y - need.destY) < 200);
    const ok = there && Math.abs(v.body.vx) < 90 && (v.def.mover !== 'air' || v.body.onGround || need.anyHeight);
    if (!ok) return;
    // Hop out.
    const ps = v.passengers;
    ps.splice(ps.indexOf(n), 1);
    n.ride = null;
    n.body.x = v.body.x - v.facing * (v.body.w / 2 + 24);
    n.body.y = v.body.y - 4; n.body.vy = -300;
    for (let k = 0; k < 8 && bodySolidAt(n.body, n.body.x, n.body.y); k++) n.body.y -= TS;
    n.heartT = 3; n.home = n.body.x; n.range = 3 * TS;
    const done = need.done; n.need = null; n.bubble = null; n.stuck = false;
    if (done) done(n);
  },

  draw(c) {
    const cam = Game.cam;
    for (const n of this.list) {
      if (n.vehicle || n.ride) continue;
      const b = n.body;
      if (b.x < cam.x - 120 || b.x > cam.x + Game.viewW + 120 || b.y < cam.y - 100 || b.y > cam.y + Game.viewH + 200) continue;
      const s = dinoScale(n.type, n.baby);
      const shake = n.grabbedT > 0 ? Math.sin(n.t * 70) * 5 : 0;
      if (n.scaredT > 0 && Math.abs(b.vx) > 200) {
        c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 4; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const ly = b.y - 14 - i * 14, lx = b.x - n.fleeDir * (34 + (i % 2) * 10); c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx - n.fleeDir * 30, ly); c.stroke(); }
      }
      if (n.tumble) { c.save(); c.translate(b.x, b.y - b.h / 2); c.rotate(n.tumble); c.translate(-b.x, -(b.y - b.h / 2)); }
      const ap = n.atk ? attackPose(n.atk.kind, Math.min(1, n.atk.t / ATTACKS[n.atk.kind].len), n.facing) : null;
      if (ap) drawAttackFx(c, ap, b.x, b.y, n.facing);
      c.save(); c.translate(b.x + shake + (ap ? ap.dx : 0), b.y + 1 + (ap ? ap.dy : 0)); if (ap) c.rotate(ap.rot);
      drawDino(c, 0, 0, s, n.type, { t: n.t, walk: ap && ap.pose ? 0 : n.walk, flip: (n.facing < 0) !== !!(ap && ap.flip), roar: ap && ap.roar !== null ? ap.roar : n.roarT, blinkSeed: n.blinkSeed, flap: n.type === 'ptero' && !b.onGround ? n.t * 14 : 0, pose: ap ? ap.pose : null, captain: n.captain, cutlass: n.crew && !n.captain });
      c.restore();
      if (n.tumble) c.restore();
      const top = b.y - dinoTop(n.type, s) + 4;
      if (n.grabbedT > 0) bubble(c, b.x, top, '😫', n.t);
      else if (n.angry > 0) bubble(c, b.x, top, '😡', n.t);
      else if (n.scaredT > 0) bubble(c, b.x, top, '😱', n.t);
      else if (n.angryT > 0) bubble(c, b.x, top, '😠', n.t);
      else if (n.need && n.bubble) bubble(c, b.x, top, n.bubble, n.t);
      else if (n.heartT > 0) bubble(c, b.x, top, '❤️', n.t);
      if (n.need && n.need.sore) { rbox(c, b.x - 10 * n.facing - 7, b.y - 9, 14, 8, 3, '#fff', 2); c.fillStyle = '#ff6b6b'; c.fillRect(b.x - 10 * n.facing - 2, b.y - 8, 4, 6); }
    }
  },
};

// ---------- Worker scripts: they set n.input for their vehicle each frame ----------
function steerTo(n, v, x, slack = 20) {
  const dx = x - v.body.x;
  n.input.left = dx < -slack; n.input.right = dx > slack;
  return Math.abs(dx) <= slack;
}
function farmerScript(n, v, dt) {
  const m = n.mem;
  if (m.goal === undefined) { m.goal = 34 * TS; v.s.sow = true; }
  if (steerTo(n, v, m.goal)) m.goal = m.goal > 26 * TS ? 18 * TS : 34 * TS;
}
function patrolScript(x0, x1) {
  return function (n, v, dt) {
    const m = n.mem;
    m.pause = (m.pause || 0) - dt;
    if (m.pause > 0) { n.input.left = n.input.right = false; return; }
    if (m.goal === undefined) m.goal = x1 * TS;
    if (steerTo(n, v, m.goal, 30)) { m.goal = m.goal > (x0 + x1) / 2 * TS ? x0 * TS : x1 * TS; m.pause = rand(2, 5); if (Math.random() < 0.5) v.hornSound && dist(v.body.x, v.body.y, Player.cx, Player.cy) < 500 && v.hornSound(); }
    v.s.lights = v.kind === 'police' && Math.floor(n.t / 6) % 3 === 0;
  };
}
// Traffic: drive from stop to stop along a route and back, pausing at each one. Gives way to you.
function routeScript(stops, pause = [1, 4]) {
  return function (n, v, dt) {
    const m = n.mem;
    if (m.i === undefined) { m.i = 1; m.dir = 1; }
    m.pause = (m.pause || 0) - dt;
    n.input.actionP = false;
    if (m.pause > 0) { n.input.left = n.input.right = false; return; }
    const goal = stops[m.i] * TS + 16, pb = Player.vehicle ? null : Player.body;
    const ahead = pb ? Math.sign(goal - v.body.x) * (pb.x - v.body.x) : -1;
    if (ahead > 0 && ahead < v.body.w / 2 + 60 && Math.abs(pb.y - v.body.y) < 70) {
      n.input.left = n.input.right = false;
      if (!m.tooted) { m.tooted = true; v.hornSound(); }
      return;
    }
    m.tooted = false;
    if (steerTo(n, v, goal, 30)) {
      m.pause = rand(pause[0], pause[1]);
      if (v.kind === 'bus') n.input.actionP = true;   // doors open at the stop
      else if (Math.random() < 0.3 && dist(v.body.x, v.body.y, Player.cx, Player.cy) < 500) v.hornSound();
      if (m.i + m.dir < 0 || m.i + m.dir >= stops.length) m.dir = -m.dir;
      m.i += m.dir;
    }
  };
}
// Dinos out and about in cars, utes, vans, the bus and on bikes: [kind, route of tile x stops, pause range].
const TRAFFIC = [
  ['ute', [8, 60, 95]], ['van', [20, 90]],
  ['car', [102, 212]], ['car', [212, 150, 102]], ['bus', [104, 140, 156, 200, 212], [3, 3]], ['citybike', [110, 205]],
  ['ute', [218, 276]], ['car', [300, 328]], ['car', [575, 668], [1, 2]], ['van', [722, 754]],
  ['citybike', [724, 776]], ['ute', [975, 1008]], ['car', [1058, 1090], [2, 2]],
];
function topSolidRow(tx, y0) { return World.groundBelow(tx, y0); }
function diggerScript(n, v, dt) {
  const m = n.mem;
  m.wait = (m.wait || 0) - dt;
  n.input.actionP = false;
  if (m.wait > 0 || v.s.anim > 0) return;
  if (m.from === undefined) { m.from = -1; }
  const s = v.s;
  if (!s.load.length) {
    v.facing = m.from;
    const cols = VEHICLE_DEFS.digger.targetCols(v);
    const top = Math.min(...cols.map(tx => topSolidRow(tx, SURF - 8)));
    if (top >= SURF) { m.from = -m.from; m.wait = 1; return; }   // pile used up: work the other way
    s.aim = clamp(top - v.groundRow(), -3, 0);
    n.input.actionP = true; m.wait = 1.6;
  } else {
    v.facing = -m.from;
    s.aim = -2;
    n.input.actionP = true; m.wait = 1.6;
  }
}
const BLUEPRINT = (() => {
  const out = [];
  for (let col = 263; col <= 270; col++) {
    for (let k = 1; k <= 4; k++) {
      const edge = col <= 264 || col >= 269;
      const id = edge || k === 1 || k === 4 ? T.BRICK : T.GLASS;
      out.push({ col, row: SURF - k, id });
    }
  }
  return out;
})();
function builderScript(n, v, dt) {
  const m = n.mem;
  m.wait = (m.wait || 2) - dt;
  if (m.wait > 0 || v.s.falling) return;
  v.facing = 1;
  steerTo(n, v, 258 * TS + 16, 10);
  const next = BLUEPRINT.find(p => World.get(p.col, p.row) === T.AIR && World.groundBelow(p.col, p.row) === p.row + 1);
  if (!next) { m.wait = 8; return; }
  const reach = clamp(Math.round(((next.col * TS + TS / 2) - v.body.x) / TS - v.body.w / 2 / TS + 0.5), 1, 8);
  v.s.reach = reach;
  VEHICLE_DEFS.crane.release(v, next.id, next.col);
  m.wait = 3.5;
}
function fisherScript(n, v, dt) {
  const m = n.mem;
  m.t = (m.t || 0) - dt;
  n.input.actionP = false;
  if (m.goal === undefined) m.goal = 360 * TS;
  if (steerTo(n, v, m.goal, 40) && m.t <= 0) { m.goal = rand(SEA_X0 + 8, SEA_X1 - 8) * TS; m.t = 6; n.input.actionP = true; }
  if (m.t > 0 && m.t < 3 && v.s.netDown) n.input.actionP = true;
  v.s.catch = [];
}
function dusterScript(n, v, dt) {
  const m = n.mem;
  if (m.dir === undefined) m.dir = 1;
  v.s.flying = true;
  if (v.body.x > 95 * TS) m.dir = -1;
  if (v.body.x < 10 * TS) m.dir = 1;
  n.input.right = m.dir > 0; n.input.left = m.dir < 0;
  const alt = (SURF - 9) * TS;
  n.input.up = v.body.y > alt + 20; n.input.down = v.body.y < alt - 20;
  const fx = v.body.x / TS;
  n.input.action = (fx > 18 && fx < 34) || (fx > 42 && fx < 58);
}
