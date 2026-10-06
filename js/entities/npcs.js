// Other dinosaurs: wanderers, workers driving their own vehicles, and dinos who need help.
let npcId = 1;
function makeNPC(o) {
  const baby = !!o.baby;
  const n = Object.assign({
    id: npcId++, type: pick(DINO_KEYS), baby, facing: pick([-1, 1]), walk: 0, t: rand(0, 9), blinkSeed: rand(0, 9),
    roarT: 0, state: 'idle', timer: rand(1, 3), dir: 0, home: o.x, range: 6 * TS, bubble: null, hop: 0,
    vehicle: null, ride: null, need: null, input: null, script: null, heartT: 0,
  }, o);
  n.body = makeBody(o.x, o.y, baby ? 20 : 28, baby ? 34 : 52);
  return n;
}
function bubble(c, x, y, icon, t) {
  const b = Math.sin(t * 4) * 4;
  rbox(c, x - 26, y - 56 + b, 52, 44, 14, '#fff', 4);
  poly(c, [x - 8, y - 14 + b, x + 8, y - 14 + b, x, y - 2 + b], '#fff', 0);
  c.beginPath(); c.moveTo(x - 8, y - 12 + b); c.lineTo(x, y - 2 + b); c.lineTo(x + 8, y - 12 + b); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
  c.font = `28px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = OUT; c.fillText(icon, x, y - 33 + b);
}

const NPCs = {
  list: [],
  spawnDefaults() {
    this.list = [];
    Vehicles.list = Vehicles.list.filter(v => !v.def.noSave && !v.npcOwned);
    const g = tx => World.groundBelow(tx, World.genSurf[tx] - 3) * TS - 0.01;
    const walker = (tx, extra = {}) => this.list.push(makeNPC(Object.assign({ x: tx * TS + 16, y: g(tx) }, extra)));
    // Wanderers.
    walker(8, { type: 'tri' }); walker(40, { type: 'stego', baby: true });
    walker(128, { baby: true }); walker(146, { type: 'brachio' }); walker(165, {}); walker(178, { baby: true, type: 'tri' });
    walker(236, { type: 'ankylo' }); walker(318, { type: 'raptor', baby: true });
    walker(480, { type: 'ptero' });
    // Workers with vehicles.
    this.worker('tractor', 20, 'rex', farmerScript);
    this.worker('digger', 246, 'tri', diggerScript, -1);
    this.worker('crane', 258, 'brachio', builderScript, 1);
    this.worker('police', 120, 'raptor', patrolScript(104, 212));
    this.worker('fishboat', 372, 'ptero', fisherScript);
    this.worker('plane', 30, 'ptero', dusterScript);
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
  add(o) { const n = makeNPC(o); this.list.push(n); return n; },
  remove(n) {
    if (n.ride) { const ps = n.ride.passengers; ps.splice(ps.indexOf(n), 1); }
    this.list.splice(this.list.indexOf(n), 1);
  },

  // The player bit, headbutted or tail-whacked this dino: stars, a hop, and off it runs.
  hit(n, fromX) {
    const b = n.body, away = Math.sign(b.x - fromX) || 1;
    Fx.burst(b.x, b.y - b.h, 10, { speed: 160, up: 60, g: 300, life: 0.8, r: 9, color: ['#ffd43b', '#fff3bf'], shape: 'star' });
    b.vy = -360; b.vx = away * 260;
    if (n.need) { n.angryT = 1.5; return; }   // dinos waiting for help stay put
    n.scaredT = 3; n.fleeDir = away; n.facing = away; n.greeted = true;
    if (n.type === 'ptero') n.flyMax = n.flyT = 3;
    if (n.baby) Sound.squeak(); else Sound.yelp();
  },
  // On-foot dinos the player can reach: in front, or either side for a tail whack.
  inReach(x, y, facing, kind) {
    return this.list.filter(n => {
      if (n.vehicle || n.ride) return false;
      const dx = (n.body.x - x) * facing, dy = Math.abs(n.body.y - y);
      return dy < 70 && (kind === 'tail' ? Math.abs(dx) < 95 : dx > -15 && dx < 95);
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
    for (const n of [...this.list]) {
      n.t += dt;
      n.roarT = Math.max(0, n.roarT - dt);
      n.heartT = Math.max(0, n.heartT - dt);
      n.angryT = Math.max(0, (n.angryT || 0) - dt);
      if (n.vehicle) { if (n.script) n.script(n, n.vehicle, dt); continue; }
      if (n.ride) { this.updateRider(n, dt); continue; }
      const far = Math.abs(n.body.x - (cam.x + Game.viewW / 2)) > Game.viewW * 1.6;
      if (far) continue;
      if (n.need) this.checkBoard(n);
      this.wander(n, dt);
    }
  },
  wander(n, dt) {
    const b = n.body;
    if (n.scaredT > 0) {
      // Running away from the player.
      n.scaredT -= dt;
      b.vx = lerp(b.vx, n.fleeDir * (n.baby ? 200 : 230), Math.min(1, dt * 8));
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
      const s = n.baby ? 0.36 : 0.52;
      drawDino(c, b.x, b.y + 1, s, n.type, { t: n.t, walk: n.walk, flip: n.facing < 0, roar: n.roarT, blinkSeed: n.blinkSeed, flap: n.type === 'ptero' && !b.onGround ? n.t * 14 : 0 });
      const top = b.y - (n.type === 'brachio' ? (n.baby ? 50 : 72) : n.baby ? 38 : 56);
      if (n.scaredT > 0) bubble(c, b.x, top, '😱', n.t);
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
