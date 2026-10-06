// Optional jobs: a voice prompt, a bubble in the world, an arrow at the screen edge, stars when done.
const STATION_ICON = { farm: '🌽', town: '🏠', site: '🚧', mount: '⛰️', pad: '🚀' };
const HOSPITAL_X = 155.5 * TS, TOWN_X = 160 * TS;

const JOB_TYPES = {
  fire: {
    icon: '🔥', vehicle: 'firetruck', weight: 3,
    start(job) {
      const houses = [[106, 8, 5], [138, 7, 7], [168, 8, 5], [198, 8, 9]];
      const [x0, w, h] = pick(houses);
      let lit = 0;
      for (let k = 0; k < 20 && lit < 3; k++) if (Fire.start(randi(x0 + 1, x0 + w - 2), randi(SURF - h + 1, SURF - 2))) lit++;
      if (!lit) return false;
      job.x0 = x0; job.x1 = x0 + w; job.x = (x0 + w / 2) * TS; job.y = (SURF - h) * TS;
      job.say = 'Oh no! A fire in town! Get the fire truck!';
    },
    check(job) { return Fire.near(job.x0 - 1, job.x1 + 1) === 0; },
    doneSay: 'The fire is out! You are a hero!',
  },
  patient: {
    icon: '🤕', vehicle: 'ambulance', weight: 2,
    start(job) {
      const tx = pick([randi(20, 90), randi(220, 300), randi(300, 325)]);
      job.npc = NPCs.add({ x: tx * TS + 16, y: World.surfaceAt(tx) * TS - 0.01, type: pick(DINO_KEYS), bubble: '🤕' });
      job.npc.need = { kinds: ['ambulance'], destX: HOSPITAL_X, sore: true, board: 'Ouch, my toe! To the hospital please!', done: () => { job.complete = true; } };
      job.say = 'A dino hurt their toe! Get the ambulance!';
    },
    check(job) { return job.complete; },
    target(job) { return job.npc.ride ? { x: HOSPITAL_X, y: SURF * TS - 200, icon: '🏥' } : null; },
    doneSay: 'All better! Thank you doctor!',
  },
  lostbaby: {
    icon: '😢', vehicle: 'police', weight: 2,
    start(job) {
      const tx = pick([randi(300, 326), randi(430, 470), randi(540, 556)]);
      const type = pick(DINO_KEYS);
      job.npc = NPCs.add({ x: tx * TS + 16, y: World.surfaceAt(tx) * TS - 0.01, type, baby: true, bubble: '😢' });
      const px = randi(108, 208);
      job.parent = NPCs.add({ x: px * TS + 16, y: World.groundBelow(px, SURF - 3) * TS - 0.01, type, bubble: '😟' });
      job.parent.need = { kinds: [] }; job.parent.stuck = true;
      job.npc.need = { kinds: ['police', 'ambulance', 'helicopter'], destX: job.parent.body.x, board: 'I want my mummy!', done: () => { job.complete = true; } };
      job.say = 'A baby dino is lost! Use the police car to take them home!';
    },
    check(job) { return job.complete; },
    target(job) { return job.npc.ride ? { x: job.parent.body.x, y: job.parent.body.y - 60, icon: '👪' } : null; },
    finish(job) { job.parent.need = null; job.parent.stuck = false; job.parent.bubble = null; job.parent.heartT = 4; job.npc.heartT = 4; },
    doneSay: 'Hooray! Back with mummy!',
  },
  stranded: {
    icon: '🆘', vehicle: 'helicopter', weight: 2,
    start(job) {
      let best = 440, by = 99;
      for (let i = 0; i < 30; i++) { const tx = randi(430, 550); const y = World.surfaceAt(tx); if (y < by) { by = y; best = tx; } }
      job.npc = NPCs.add({ x: best * TS + 16, y: by * TS - 0.01, type: pick(['brachio', 'stego', 'tri', 'ankylo']), bubble: '🆘' });
      job.npc.need = { kinds: ['helicopter'], destX: TOWN_X, destR: 2000, board: 'Thank you! Please fly me home!', done: () => { job.complete = true; } };
      job.npc.stuck = true;
      job.say = 'Someone is stuck on the mountain! Fly the helicopter to rescue them!';
    },
    check(job) { return job.complete; },
    target(job) { return job.npc.ride ? { x: TOWN_X, y: SURF * TS - 200, icon: '🏠' } : null; },
    doneSay: 'Rescued! Great flying!',
  },
  traveler: {
    icon: '🚂', vehicle: 'train', weight: 2,
    start(job) {
      const stations = World.props.filter(p => p.type === 'station');
      const a = pick(stations); let b = pick(stations); while (b === a) b = pick(stations);
      job.npc = NPCs.add({ x: a.x * TS + rand(-40, 40), y: World.groundBelow(Math.floor(a.x), SURF - 3) * TS - 0.01, type: pick(DINO_KEYS), bubble: STATION_ICON[b.name] });
      job.npc.need = { kinds: ['train'], destX: b.x * TS, destR: 120, board: 'All aboard! Choo choo!', done: () => { job.complete = true; } };
      job.npc.stuck = true;
      job.destX = b.x * TS; job.destIcon = STATION_ICON[b.name];
      job.say = 'A dino wants to ride the train! Pick them up at the station!';
    },
    check(job) { return job.complete; },
    target(job) { return job.npc.ride ? { x: job.destX, y: SURF * TS - 160, icon: job.destIcon } : null; },
    doneSay: 'Thank you for the ride!',
  },
  harvest: {
    icon: '🌽', vehicle: 'harvester', weight: 1,
    ripe() { let n = 0; for (let x = 42; x < 58; x++) for (let y = SURF - 2; y < SURF; y++) if (World.get(x, y) === T.CROP && World.getMeta(x, y) >= 3) n++; return n; },
    start(job) {
      if (this.ripe() < 8) return false;
      job.x = 50 * TS; job.y = (SURF - 2) * TS;
      job.say = 'The corn is ready! Use the combine harvester!';
    },
    check(job) { return this.ripe() < 3; },
    doneSay: 'Yum! What a lot of corn!',
  },
  fossil: {
    icon: '🦴', vehicle: 'digger', weight: 2,
    start(job) {
      const tx = pick([randi(222, 236), randi(300, 326), randi(560, 594), randi(70, 96)]);
      const top = World.surfaceAt(tx);
      job.tx = tx; job.ty = top + randi(3, 5);
      World.set(job.tx, job.ty, pick([T.FOSSIL, T.GEM]), true);
      job.x = tx * TS + 16; job.y = top * TS - 10; job.marker = true;
      job.say = 'Something is buried here! Dig it up!';
    },
    check(job) { return !TILES[World.get(job.tx, job.ty)].treasure; },
    doneSay: 'You found it! Amazing!',
  },
  build: {
    icon: '🏗️', vehicle: 'crane', weight: 1,
    start(job) {
      const tx = randi(560, 586);
      const g = World.surfaceAt(tx);
      if (World.surfaceAt(tx + 5) !== g) return false;
      job.tiles = [];
      for (let x = 0; x < 6; x++) for (let k = 1; k <= 4; k++) if (x === 0 || x === 5 || k === 4 || (k === 1 && x !== 2)) job.tiles.push([tx + x, g - k]);
      job.x = (tx + 3) * TS; job.y = (g - 5) * TS;
      job.say = 'Can you build a house here? Fill in the shape!';
    },
    check(job) { return job.tiles.every(([x, y]) => World.solid(x, y)); },
    doneSay: 'What a great house!',
  },
  tow: {
    icon: '🛟', vehicle: 'tugboat', weight: 1,
    start(job) {
      const v = Vehicles.spawn('fishboat', rand(375, 390) * TS, SEA_LEVEL * TS + 18, -1);
      v.npcOwned = true;
      const n = NPCs.add({ x: v.body.x, y: v.body.y, type: pick(DINO_KEYS) });
      n.vehicle = v; v.driver = n; n.input = Object.assign({}, IDLE_INPUT); n.script = null; n.mem = {};
      job.boat = v; job.npc = n;
      job.say = 'A boat has broken down! Tow it back to the beach with the tugboat!';
    },
    check(job) { return job.boat.body.x < 338 * TS; },
    where(job) { return { x: job.boat.body.x, y: job.boat.body.y - 90 }; },
    finish(job) { job.npc.script = fisherScript; job.npc.mem = {}; },
    doneSay: 'Safe and sound! Toot toot!',
  },
  garbage: {
    icon: '🗑️', vehicle: 'garbage', weight: 1,
    full() { return World.props.filter(p => p.type === 'bin' && p.full).length; },
    start(job) {
      if (this.full() < 5) return false;
      job.x = 160 * TS; job.y = (SURF - 3) * TS;
      job.say = 'The bins are full! Bring the garbage truck!';
    },
    check(job) { return this.full() <= 1; },
    doneSay: 'So clean! Thank you!',
  },
};

const Jobs = {
  list: [],
  t: 0,
  reset() { this.list = []; this.t = 14; },
  available() {
    return Object.keys(JOB_TYPES).filter(k => {
      const def = JOB_TYPES[k];
      if (this.list.some(j => j.kind === k)) return false;
      return VEHICLE_DEFS[def.vehicle] && Game.stars >= VEHICLE_DEFS[def.vehicle].unlock;
    });
  },
  spawn(kind) {
    const def = JOB_TYPES[kind];
    const job = { kind, def, t: 0 };
    if (def.start(job) === false) return null;
    this.list.push(job);
    Sound.tone(880, 0.12, 'triangle', 0.12); Sound.tone(1175, 0.2, 'triangle', 0.12, null, 0.12);
    setTimeout(() => Sound.say(job.say), 300);
    return job;
  },
  update(dt) {
    this.t -= dt;
    if (this.t <= 0 && this.list.length < 2 && Game.mode === 'play') {
      const avail = this.available();
      const bag = avail.flatMap(k => Array(JOB_TYPES[k].weight).fill(k));
      if (bag.length) this.spawn(pick(bag));
      this.t = this.list.length >= 2 ? 10 : rand(15, 30);
    }
    for (const job of [...this.list]) {
      job.t += dt;
      if (job.def.check(job)) this.finish(job);
    }
  },
  finish(job) {
    this.list.splice(this.list.indexOf(job), 1);
    if (job.def.finish) job.def.finish(job);
    const pos = this.where(job);
    Game.addStars(3);
    Game.popupStar(pos.x, pos.y);
    Game.celebrate('Hooray!', job.def.doneSay);
    Fx.burst(pos.x, pos.y, 30, { speed: 300, life: 1.2, r: 10, color: ['#ffd43b', '#fff3bf', '#ff922b'], shape: 'star', g: 200 });
    this.t = Math.min(this.t, 15);
  },
  onFireOut() {},
  where(job) {
    if (job.def.where) return job.def.where(job);
    if (job.npc && !job.npc.ride) return { x: job.npc.body.x, y: job.npc.body.y - 70 };
    if (job.npc && job.npc.ride) return { x: job.npc.ride.body.x, y: job.npc.ride.body.y - 120 };
    return { x: job.x, y: job.y };
  },
  // Where the arrow should point right now.
  goal(job) {
    if (job.def.target) { const t = job.def.target(job); if (t) return t; }
    const w = this.where(job);
    return { x: w.x, y: w.y, icon: job.def.icon };
  },
  drawWorld(c) {
    for (const job of this.list) {
      if (job.marker) {
        const x = job.x, y = job.y;
        c.strokeStyle = '#e8262b'; c.lineWidth = 8; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - 14, y - 14); c.lineTo(x + 14, y + 14); c.moveTo(x + 14, y - 14); c.lineTo(x - 14, y + 14); c.stroke();
      }
      if (job.tiles) {
        c.setLineDash([6, 6]); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.95)';
        for (const [x, y] of job.tiles) if (!World.solid(x, y)) { c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x * TS + 2, y * TS + 2, TS - 4, TS - 4); c.strokeRect(x * TS + 2, y * TS + 2, TS - 4, TS - 4); }
        c.setLineDash([]);
      }
      if (!job.npc && job.kind !== 'fossil' && job.kind !== 'build') {
        const w = this.where(job);
        bubble(c, w.x, w.y, job.def.icon, Game.t);
      } else if (job.kind === 'fossil' || job.kind === 'build') bubble(c, job.x, job.y - 20, job.def.icon, Game.t);
      if (job.kind === 'tow') bubble(c, job.boat.body.x, job.boat.body.y - 80, '🛟', Game.t);
      const g = this.goal(job);
      if (g.icon !== job.def.icon) {
        // Destination flag.
        const fx = g.x, fy = g.y + 140;
        const b = Math.abs(Math.sin(Game.t * 4)) * 10;
        poly(c, [fx - 14, fy - 40 - b, fx + 14, fy - 40 - b, fx, fy - 20 - b], '#ffd43b', 4);
      }
    }
  },
  drawHud(c) {
    const cam = Game.cam;
    this.arrows = [];
    for (const job of this.list) {
      const g = this.goal(job);
      const sx = (g.x - cam.x) * Game.zoom, sy = (g.y - cam.y) * Game.zoom;
      if (sx > 30 && sx < W - 30 && sy > 30 && sy < H - 30) continue;
      const ax = clamp(sx, 70, W - 70);
      let ay = clamp(sy, 110, H - 160);
      // Don't stack two arrows on the same spot.
      for (const o of this.arrows) if (Math.abs(o.x - ax) < 70 && Math.abs(o.y - ay) < 76) ay = o.y + (o.y > H - 240 ? -80 : 80);
      const ang = Math.atan2(sy - ay, sx - ax);
      const bob = Math.sin(Game.t * 6) * 6;
      c.save(); c.translate(ax + Math.cos(ang) * bob, ay + Math.sin(ang) * bob);
      ell(c, 0, 0, 34, 34, '#fff', 4);
      c.save(); c.rotate(ang); poly(c, [36, 0, 22, -14, 22, 14], '#ff6b6b', 4); c.restore();
      c.font = `30px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT;
      c.fillText(g.icon, 0, 2);
      c.restore();
      this.arrows.push({ x: ax, y: ay, job });
    }
  },
  // Tapping a job's arrow or bubble brings the vehicle that job needs.
  tap(x, y) {
    const a = (this.arrows || []).find(a => dist(a.x, a.y, x, y) < 44);
    if (!a) return false;
    this.callFor(a.job);
    return true;
  },
  tapWorld(wx, wy) {
    const job = this.list.find(j => { const w = this.where(j); return dist(w.x, w.y - 30, wx, wy) < 50; });
    if (!job) return false;
    this.callFor(job);
    return true;
  },
  callFor(job) {
    const kind = job.def.vehicle, def = VEHICLE_DEFS[kind];
    if (Player.vehicle && Player.vehicle.kind === kind) { Sound.say(job.say); return; }
    if (!def || Game.stars < def.unlock) { Sound.say(job.say); return; }
    if (Player.vehicle) Vehicles.exit(Player);
    callVehicle(kind);
  },
};
