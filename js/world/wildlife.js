// Wild animals on the jet trips: lions, elephants and hippos in Africa, penguins and seals in Antarctica.
// They aren't dinos: they wander, graze and react to you, and you photograph them for stars.
const WILD_ANIMALS = {
  lion: { word: 'LION', icon: '🦁', speed: 45, h: 70 },
  elephant: { word: 'ELEPHANT', icon: '🐘', speed: 40, h: 150 },
  hippo: { word: 'HIPPO', icon: '🦛', speed: 25, h: 70, amphib: true },
  giraffe: { word: 'GIRAFFE', icon: '🦒', speed: 35, h: 230 },
  zebra: { word: 'ZEBRA', icon: '🦓', speed: 40, h: 90 },
  rhino: { word: 'RHINO', icon: '🦏', speed: 30, h: 80 },
  warthog: { word: 'WARTHOG', icon: '🐗', speed: 70, h: 45 },
  meerkat: { word: 'MEERKAT', icon: '🐿️', speed: 0, h: 80 },
  flamingo: { word: 'FLAMINGO', icon: '🦩', speed: 12, h: 100 },
  penguin: { word: 'PENGUIN', icon: '🐧', speed: 40, h: 75 },
  chick: { word: 'CHICK', icon: '🐣', speed: 30, h: 40 },
  adelie: { word: 'ADELIE', icon: '🐧', speed: 50, h: 50 },
  seal: { word: 'SEAL', icon: '🦭', speed: 0, h: 40 },
  orca: { word: 'ORCA', icon: '🐋', speed: 90, h: 40, water: true },
  whale: { word: 'WHALE', icon: '🐳', speed: 12, h: 40, water: true },
  skua: { word: 'SKUA', icon: '🐦', speed: 110, h: 30, fly: true },
  // From the ice age, in Antarctica's hidden valley.
  mammoth: { word: 'MAMMOTH', icon: '🦣', speed: 30, h: 170 },
  sabretooth: { word: 'SABRE-TOOTH', icon: '🐯', speed: 45, h: 75 },
};
// What there is to photograph in each place, in the order the HUD shows them.
const WILD_SETS = {
  africa: ['lion', 'elephant', 'hippo', 'giraffe', 'zebra', 'rhino', 'warthog', 'meerkat', 'flamingo'],
  antarctica: ['penguin', 'chick', 'adelie', 'seal', 'orca', 'whale', 'skua', 'mammoth', 'sabretooth'],
};

const Wildlife = {
  list: [], got: {}, flash: 0, card: null,
  add(kind, tx, o = {}) {
    const a = Object.assign({ kind, x: tx * TS + 16, home: tx * TS + 16, range: 4, dir: Math.random() < 0.5 ? -1 : 1, t: rand(0, 9), state: 'idle', st: rand(1, 4), scale: 1 }, o);
    a.y = this.groundY(a.x, a);
    this.list.push(a);
    return a;
  },
  reset() { this.list = []; this.got = {}; this.flash = 0; this.card = null; },
  // Where its feet go: on the ground, or at the top of the water for swimmers and anything over the sea.
  groundY(x, a) {
    const tx = Math.floor(x / TS);
    if (World.get(tx, SURF) === T.WATER || (a && WILD_ANIMALS[a.kind].water)) return SURF * TS + (a && (a.kind === 'whale' || a.kind === 'orca') ? 0 : a && a.kind === 'hippo' ? 34 : 12);
    return World.surfaceAt(tx) * TS;
  },
  overWater(x) { return World.get(Math.floor(x / TS), SURF) === T.WATER; },

  update(dt) {
    const pb = Player.vehicle ? Player.vehicle.body : Player.body, fast = Math.abs(pb.vx) > 150;
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.card && (this.card.t += dt) > 2.6) this.card = null;
    let rank = 0;
    for (const a of this.list) {
      const def = WILD_ANIMALS[a.kind];
      a.t += dt; a.st -= dt;
      const near = Math.abs(pb.x - a.x) < 200 && Math.abs(pb.y - a.y) < 160;
      let speed = def.speed;
      switch (a.kind) {
        case 'lion':
          if (a.state === 'roar') { if (a.st <= 0) { a.state = 'rest'; a.st = rand(4, 8); } speed = 0; break; }
          if (a.st <= 0) { a.state = a.state === 'rest' ? 'walk' : 'rest'; a.st = a.state === 'rest' ? rand(5, 10) : rand(2, 4); if (a.state === 'walk') a.dir = pick([-1, 1]); }
          if (a.state === 'rest') speed = 0;
          break;
        case 'elephant':
          if (a.mum) {   // a baby trots along behind its mum
            const m = a.mum, goal = m.x - m.dir * 90;
            a.dir = Math.sign(goal - a.x) || a.dir; speed = Math.abs(goal - a.x) > 20 ? 60 : 0; a.state = m.state === 'spray' ? 'spray' : 'walk';
            break;
          }
          if (a.state === 'spray') { speed = 0; if (Math.random() < 0.5) this.drop(a.x + a.dir * 110, a.y - 150, a.dir); if (a.st <= 0) { a.state = 'walk'; a.dir = -a.dir; a.st = rand(6, 10); } break; }
          // Off to the waterhole for a spray, now and then.
          if (a.st <= 0 && a.water !== undefined) { a.dir = Math.sign(a.water - a.x); if (Math.abs(a.water - a.x) < 20) { a.state = 'spray'; a.st = 3.5; a.dir = 1; Sound.tone(260, 0.5, 'sawtooth', 0.05, 420); } }
          break;
        case 'hippo': {
          // Wallow in the water, yawn now and then, climb out to graze on the bank, then back in.
          const wet = this.overWater(a.x);
          if (a.state === 'yawn') { speed = 0; if (a.st <= 0) { a.state = 'swim'; a.st = rand(5, 9); } break; }
          if (a.state === 'out') { a.dir = Math.sign(a.bank - a.x) || 1; speed = 35; if (Math.abs(a.bank - a.x) < 16) { a.state = 'graze'; a.st = rand(6, 10); } break; }
          if (a.state === 'graze') {
            speed = Math.sin(a.t * 0.7) > 0.3 ? 18 : 0; a.dir = Math.sign(a.bank - a.x) || a.dir;
            if (Math.abs(a.bank - a.x) < 8) a.dir = -a.dir;
            if (a.st <= 0) a.state = 'in';
            break;
          }
          if (a.state === 'in') { a.dir = Math.sign(a.home - a.x) || 1; speed = 35; if (wet && Math.abs(a.home - a.x) < 40) { a.state = 'swim'; a.st = rand(6, 10); } break; }
          a.state = 'swim'; speed = 20;
          if (!this.overWater(a.x + a.dir * 60)) a.dir = -a.dir;
          if (a.st <= 0) {
            if (Math.random() < 0.4) { a.state = 'yawn'; a.st = 2; Sound.tone(110, 0.6, 'sawtooth', 0.05, 70); }
            else { a.state = 'out'; a.bank = pick(a.banks); }
          }
          break;
        }
        case 'zebra':
          // Rush at the herd and they all gallop off.
          if (a.state !== 'run' && near && fast) { a.state = 'run'; a.st = 2.5; a.dir = Math.sign(a.x - pb.x) || 1; }
          if (a.state === 'run') { speed = 240; if (a.st <= 0) { a.state = 'idle'; a.st = rand(2, 4); } }
          else if (a.st <= 0) { a.state = a.state === 'idle' ? 'walk' : 'idle'; a.st = rand(2, 5); if (a.state === 'walk') a.dir = pick([-1, 1]); }
          if (a.state === 'idle') speed = 0;
          break;
        case 'meerkat':
          // Pops up to look about, and ducks down when you come close.
          if (near && a.state === 'up') { a.state = 'down'; a.st = rand(2, 3); Sound.tone(1400, 0.06, 'square', 0.04); }
          if (a.st <= 0) { a.state = a.state === 'up' ? 'down' : 'up'; a.st = a.state === 'up' ? rand(2, 5) : rand(1, 3); }
          a.pop = lerp(a.pop || 0, a.state === 'up' ? 1 : 0, Math.min(1, dt * 8));
          speed = 0;
          break;
        case 'penguin':
          if (a.slider) { speed = this.slide(a, dt); break; }
          // Close by on foot and moving? Penguins follow you in a line.
          if (!Player.vehicle && Math.abs(Player.body.x - a.x) < 140 && Math.abs(Player.body.vx) > 30) a.follow = true;
          if (a.follow && (Player.vehicle || Math.abs(Player.body.x - a.x) > 900)) a.follow = false;
          if (a.follow) {
            const goal = Player.body.x - Player.facing * (70 + rank++ * 55);
            a.dir = Math.sign(goal - a.x) || a.dir; speed = Math.abs(goal - a.x) > 20 ? 150 : 0; a.state = speed ? 'walk' : 'idle';
            break;
          }
          if (a.st <= 0) { a.state = a.state === 'idle' ? 'walk' : 'idle'; a.st = rand(2, 5); if (a.state === 'walk') a.dir = pick([-1, 1]); }
          if (a.state === 'idle') speed = 0;
          break;
        case 'chick':
          if (a.mum) { const goal = a.mum.x + 30; a.dir = Math.sign(goal - a.x) || a.dir; speed = Math.abs(goal - a.x) > 16 ? Math.max(60, Math.abs(a.mum.vx || 0)) : 0; }
          break;
        case 'skua':
          a.x += a.dir * def.speed * dt;
          if (Math.abs(a.x - a.home) > a.range * TS) a.dir = Math.sign(a.home - a.x);
          a.y = a.y0 + Math.sin(a.t * 1.3) * 30;
          continue;
        case 'whale':
          // A humpback: rolls along the surface, blows, raises its tail to dive, and now and then breaches.
          if (a.st <= 0) {
            const was = a.state;
            a.state = was === 'swim' || was === 'idle' ? pick(['blow', 'blow', 'fluke', 'breach']) : 'swim';
            a.st = { swim: rand(4, 7), blow: 2, fluke: 3, breach: 2.2 }[a.state];
            if (a.state === 'blow') Sound.noise(0.8, 0.08, 'highpass', 1500);
            if (was === 'breach') this.splash(a.x, 30, 0.8);
          }
          if (a.state === 'breach' || a.state === 'fluke') speed = 4;
          break;
        case 'orca':
          // Killer whales porpoise along, rolling up through the surface; sometimes one leaps right out.
          if (a.st <= 0) {
            if (a.state === 'leap') this.splash(a.x + a.dir * 60, 22, 0.6);
            a.state = a.state === 'leap' ? 'swim' : Math.random() < 0.3 ? 'leap' : 'swim'; a.st = a.state === 'leap' ? 1.4 : rand(3, 6);
            if (a.state === 'leap') Sound.noise(0.4, 0.1, 'lowpass', 800);
          }
          break;
        case 'mammoth':
          if (a.mum) {   // a baby mammoth sticks close to a grown-up
            const m = a.mum, goal = m.x - m.dir * 110;
            a.dir = Math.sign(goal - a.x) || a.dir; speed = Math.abs(goal - a.x) > 20 ? 55 : 0; a.state = speed ? 'walk' : 'idle';
            break;
          }
          if (a.st <= 0) { a.state = a.state === 'idle' ? 'walk' : 'idle'; a.st = rand(3, 7); if (a.state === 'walk') a.dir = pick([-1, 1]); }
          if (a.state === 'idle') speed = 0;
          break;
        case 'sabretooth':
          if (a.state === 'snarl') { speed = 0; if (a.st <= 0) { a.state = 'idle'; a.st = rand(3, 6); } break; }
          if (a.st <= 0) { a.state = a.state === 'idle' ? 'walk' : 'idle'; a.st = rand(2, 5); if (a.state === 'walk') a.dir = pick([-1, 1]); }
          if (a.state === 'idle') speed = 0;
          break;
        case 'seal':
          speed = 0;
          if (a.st <= 0) { a.st = rand(3, 6); a.bark = 0.6; Sound.tone(500, 0.12, 'square', 0.04, 350); }
          a.bark = Math.max(0, (a.bark || 0) - dt);
          break;
        default:   // rhino, warthog, giraffe, flamingo, adelie: wander and stop
          if (a.st <= 0) { a.state = a.state === 'idle' ? 'walk' : 'idle'; a.st = rand(2, 6); if (a.state === 'walk') a.dir = pick([-1, 1]); }
          if (a.state === 'idle') speed = 0;
      }
      a.vx = a.dir * speed;
      let nx = a.x + a.vx * dt;
      // Stay near home (unless following you or sliding), never walk into the sea unless a swimmer, never off the world.
      if (!a.follow && !a.slider && !a.mum && Math.abs(nx - a.home) > a.range * TS) { a.dir = Math.sign(a.home - a.x); nx = a.x; }
      if (!def.water && !def.amphib && !a.slider && !a.follow && this.overWater(nx) !== this.overWater(a.x)) { a.dir = -a.dir; nx = a.x; }
      if (def.water && !this.overWater(nx)) { a.dir = -a.dir; nx = a.x; }
      a.x = clamp(nx, 3 * TS, ((World.limitW || WORLD_W) - 3) * TS);
      a.y = lerp(a.y, this.groundY(a.x, a), Math.min(1, dt * 12));
      if (a.kind === 'adelie' && speed) a.hop = Math.abs(Math.sin(a.t * 9)) * 8; else a.hop = 0;
    }
  },
  // A tobogganing penguin: up the hill, belly-slide down into the sea, swim back, waddle home, again.
  slide(a, dt) {
    const L = a.loop;
    if (a.state === 'idle' || a.state === 'walk') a.state = 'uphill';
    if (a.state === 'uphill') { a.dir = 1; if (a.x >= L.top) { a.state = 'slide'; Sound.tone(900, 0.3, 'triangle', 0.05, 1500); } return 45; }
    if (a.state === 'slide') {
      a.dir = 1;
      if (this.overWater(a.x)) { a.state = 'swim'; a.swimT = 0; Fx.burst(a.x, SURF * TS, 16, { speed: 160, up: 260, g: 700, life: 0.8, r: 7, color: ['#a5d8ff', '#e7f5ff'] }); Sound.noise(0.3, 0.2, 'lowpass', 800); }
      return 300;
    }
    if (a.state === 'swim') { a.swimT += dt; a.dir = a.swimT < 3 ? 1 : -1; if (a.swimT > 3 && !this.overWater(a.x)) a.state = 'home'; return 90; }
    if (a.state === 'home') { a.dir = -1; if (a.x < L.back) a.state = 'uphill'; return 55; }
    return 0;
  },
  // A big splash where something crashed back into the sea.
  splash(x, n, k) { Fx.burst(x, SURF * TS, n, { speed: 220 * k, up: 380 * k, g: 700, life: 1.1, r: 9, color: ['#a5d8ff', '#e7f5ff', '#fff'] }); Sound.noise(0.6, 0.3 * k, 'lowpass', 600); },
  drop(x, y, dir) { Fx.add({ x, y, vx: dir * rand(60, 160), vy: rand(-260, -120), g: 700, life: 1, r: 5, color: 'rgba(116,192,252,0.9)' }); },

  // You roared: lions roar right back, zebras bolt, penguins flap and squawk.
  heardRoar(x, y) {
    let lions = 0;
    for (const a of this.list) {
      if (Math.abs(a.x - x) > 700) continue;
      if (a.kind === 'lion') { a.state = 'roar'; a.st = 1.4; lions++; Pow.add(a.x, a.y - 100, 'ROAR!'); }
      else if (a.kind === 'zebra') { a.state = 'run'; a.st = 2.5; a.dir = Math.sign(a.x - x) || 1; }
      else if (a.kind === 'penguin' || a.kind === 'adelie' || a.kind === 'chick') { a.flap = 1; }
      else if (a.kind === 'mammoth' && !a.trumpet) { a.trumpet = true; setTimeout(() => { a.trumpet = false; Pow.add(a.x, a.y - 200, 'TOOT!'); Sound.tone(300, 0.7, 'sawtooth', 0.06, 560); }, 400); }
      else if (a.kind === 'sabretooth') { a.state = 'snarl'; a.st = 1.4; Pow.add(a.x, a.y - 100, 'GRR!'); Sound.noise(0.6, 0.2, 'lowpass', 300); }
    }
    if (lions) setTimeout(() => { Sound.roar(); Sound.noise(1, 0.25, 'lowpass', 180); }, 500);
  },

  // Photos: the nearest animal in front of you, within reach.
  photoTarget(x, y, facing, reach = 280) {
    let best = null, bd = reach;
    for (const a of this.list) {
      const dx = a.x - x;
      if (dx * facing < -60) continue;
      const d = dist(x, y, a.x, a.y - WILD_ANIMALS[a.kind].h / 2);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  },
  snap(a) {
    this.flash = 1;
    Sound.noise(0.06, 0.3, 'highpass', 3000); Sound.tone(1800, 0.05, 'square', 0.05, null, 0.05);
    if (!a) return;
    this.card = { kind: a.kind, t: 0, fresh: !this.got[a.kind] };
    if (this.got[a.kind]) return;
    this.got[a.kind] = true;
    Game.addStars(1); Game.popupStar(a.x, a.y - WILD_ANIMALS[a.kind].h - 30);
    const set = WILD_SETS[Game.away] || [];
    if (set.length && set.every(k => this.got[k])) {
      Game.addStars(5); Game.celebrate(Game.away === 'africa' ? 'Safari complete!' : 'Antarctica complete!', 'You took a photo of every animal!');
    }
  },
  tapWorld(wx, wy) {
    const a = this.list.find(a => Math.abs(a.x - wx) < 70 && wy > a.y - WILD_ANIMALS[a.kind].h - 20 && wy < a.y + 20);
    if (!a || dist(a.x, a.y, Player.cx, Player.cy) > 500) return false;
    this.snap(a);
    return true;
  },

  draw(c) {
    const cam = Game.cam, wet = new Set();
    for (const a of this.list) {
      if (a.x < cam.x - 300 || a.x > cam.x + Game.viewW + 300) continue;
      c.save(); c.translate(a.x, a.y - (a.hop || 0));
      if (a.dir < 0) c.scale(-1, 1);
      c.scale(a.scale, a.scale);
      drawAnimal(c, a);
      c.restore();
      // In the water: the part below the surface is seen through the water.
      if (this.overWater(a.x) && !WILD_ANIMALS[a.kind].fly) { const span = (a.kind === 'whale' ? 200 : a.kind === 'orca' ? 130 : 110) * a.scale; for (let tx = Math.floor((a.x - span) / TS); tx <= Math.floor((a.x + span) / TS); tx++) wet.add(tx); }
    }
    c.fillStyle = 'rgba(64,156,255,0.7)';
    for (const tx of wet) for (let ty = SURF; World.get(tx, ty) === T.WATER; ty++) c.fillRect(tx * TS, ty * TS + (ty === SURF ? 4 : 0), TS, ty === SURF ? TS - 4 : TS);
  },
  // The row of animals to find, and the photo you just took.
  drawHud(c) {
    const set = WILD_SETS[Game.away];
    if (!set) return;
    const n = set.length, sz = 34, x0 = W / 2 - (n * (sz + 6)) / 2, y = 128;
    c.font = `24px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    set.forEach((k, i) => {
      const x = x0 + i * (sz + 6) + sz / 2, got = this.got[k];
      ell(c, x, y, sz / 2, sz / 2, got ? '#fff3bf' : 'rgba(255,255,255,0.55)', 2.5);
      c.globalAlpha = got ? 1 : 0.3; c.fillText(WILD_ANIMALS[k].icon, x, y + 1); c.globalAlpha = 1;
    });
    if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash * 0.8})`; c.fillRect(0, 0, W, H); }
    const cd = this.card;
    if (cd) {
      // A polaroid slides in with the animal and its name.
      const k = Math.min(1, cd.t * 4), out = Math.max(0, (cd.t - 2.2) * 3), cx = W - 150 + out * 300, cy = 300 - (1 - k) * 60;
      c.save(); c.translate(cx, cy); c.rotate(0.06);
      rbox(c, -110, -120, 220, 250, 6, '#fff', 4);
      c.fillStyle = Game.away === 'africa' ? '#ffd8a8' : '#d0ebff'; c.fillRect(-94, -104, 188, 170);
      c.save(); c.beginPath(); c.rect(-94, -104, 188, 170); c.clip();
      const h = WILD_ANIMALS[cd.kind].h, s = Math.min(1.2, 140 / Math.max(60, h));
      c.translate(0, 50); c.scale(s, s); drawAnimal(c, { kind: cd.kind, t: Game.t, state: 'idle', pop: 1, spout: 1 });
      c.restore();
      bigText(c, WILD_ANIMALS[cd.kind].word, 0, 98, WILD_ANIMALS[cd.kind].word.length > 6 ? 28 : 36, cd.fresh ? '#e8590c' : OUT);
      c.restore();
    }
  },
};

// Each animal drawn facing right with its feet at (0, 0).
function drawAnimal(c, a) {
  const t = a.t || 0, st = a.state, walk = (st === 'walk' || st === 'run' || st === 'uphill' || st === 'home' || st === 'out' || st === 'in' || (st === 'graze' && Math.abs(a.vx || 0) > 1)) ? Math.sin(t * (st === 'run' ? 18 : 8)) : 0;
  const legs = (xs, top, len, w, col) => xs.forEach((x, i) => limb(c, [x, top, x + walk * (i % 2 ? -8 : 8), top + len], w, col));
  switch (a.kind) {
    case 'lion': {
      const cub = a.cub, male = a.male, rest = st === 'rest';
      if (cub) c.scale(0.55, 0.55);
      const dy = rest ? 18 : 0;
      limb(c, [-46, -40 + dy, -70, -54 + dy + Math.sin(t * 2) * 6], 5, '#d69a35');
      ell(c, -72, -56 + dy + Math.sin(t * 2) * 6, 6, 6, '#8a5a1e', 2);
      if (!rest) legs([-30, -14, 18, 32], -34, 34, 11, '#d69a35');
      else { ell(c, 30, -4, 18, 7, '#e8a93b', 3); ell(c, -26, -4, 16, 7, '#e8a93b', 3); }
      ell(c, 0, -34 + dy, 46, 22, '#e8a93b');
      const hx = 44, hy = -52 + dy, roar = st === 'roar';
      if (male) { for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU; ell(c, hx - 4 + Math.cos(ang) * 20, hy + Math.sin(ang) * 20, 12, 12, '#a0521d', 0); } ell(c, hx - 4, hy, 26, 26, '#a0521d', 3); }
      ell(c, hx - 8, hy - 14, 6, 6, '#d69a35', 2);
      ell(c, hx, hy, 18, 17, '#f0b445');
      ell(c, hx + 14, hy + 6, 9, 7, '#f7d08a', 2);
      poly(c, [hx + 18, hy, hx + 24, hy, hx + 21, hy + 4], '#5c3d1e', 1.5);
      drawEye(c, hx + 6, hy - 6, 4, rest && !roar && Math.sin(t) > 0.3);
      if (roar) { ell(c, hx + 16, hy + 12, 9, 8, '#5c1f1f', 2); for (const tx of [-5, 5]) poly(c, [hx + 16 + tx, hy + 5, hx + 18 + tx, hy + 9, hx + 14 + tx, hy + 9], '#fff', 0); }
      break;
    }
    case 'elephant': {
      const spray = st === 'spray';
      limb(c, [-66, -86, -76, -50 + Math.sin(t * 2) * 4], 4, '#868e96');
      legs([-44, -20, 20, 42], -60, 60, 22, '#868e96');
      ell(c, 0, -84, 70, 46, '#9aa1a9');
      ell(c, 62, -104, 32, 30, '#9aa1a9');
      // Trunk: hanging down, or curled up high to spray.
      if (spray) limb(c, [86, -100, 104, -130, 112, -160], 13, '#9aa1a9');
      else limb(c, [86, -96, 100, -60, 98, -24 + Math.sin(t * 3) * 4], 13, '#9aa1a9');
      poly(c, [80, -88, 104, -78, 82, -80], '#f8f9fa', 2);   // tusk
      ell(c, 42, -100, 24 + Math.sin(t * 2) * 2, 32, '#adb5bd', 3);   // big flappy ear
      ell(c, 44, -98, 14, 20, '#d0b8b8', 0);
      drawEye(c, 72, -112, 4.5, false);
      if (spray) for (let i = 0; i < 5; i++) { const k = (t * 2 + i / 5) % 1; ell(c, 112 + k * 60, -160 - Math.sin(k * Math.PI) * 50, 5, 5, 'rgba(116,192,252,0.85)', 0); }
      break;
    }
    case 'hippo': {
      // A big barrel body on four stumpy legs. In the water it sits low, so just the back and head show.
      const yawn = st === 'yawn' ? Math.min(1, Math.sin(Math.min(1, (2 - a.st) / 2) * Math.PI) * 1.4) : 0;
      limb(c, [-70, -40, -80, -34 + Math.sin(t * 4) * 3], 4, '#7e6a86');   // little tail
      [-48, -26, 18, 38].forEach((lx, i) => {
        const x = lx + walk * (i % 2 ? -5 : 5);
        rbox(c, x - 10, -26, 20, 26, 7, '#7e6a86', 3);
        for (const tx of [-5, 0, 5]) ell(c, x + tx, -2, 3, 2.5, '#d7c8db', 0);   // toes
      });
      ell(c, -10, -40, 64, 30, '#8f7a96');
      ell(c, -8, -26, 50, 12, '#a893ad', 0);   // paler tummy
      if (yawn > 0.05) {
        poly(c, [36, -36, 94, -44, 92, -32, 40, -26], '#8f7a96', 3);   // lower jaw
        c.save(); c.translate(40, -38); c.rotate(-yawn * 0.9);
        poly(c, [0, 0, 54, -4, 52, 10, 0, 8], '#ffa8a8', 3);
        poly(c, [-2, -12, 56, -16, 56, -2, 0, 0], '#8f7a96', 3);
        for (const tx of [44, 30]) poly(c, [tx, -2, tx + 4, 8, tx + 8, -2], '#fff', 1.5);
        c.restore();
      } else {
        ell(c, 56, -42, 36, 20, '#8f7a96');
        ell(c, 82, -48, 4, 3, OUT, 0); ell(c, 74, -49, 4, 3, OUT, 0);
        c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(70, -38, 10, 0.3, 1.4); c.stroke();
      }
      ell(c, 30, -58, 6, 6, '#8f7a96', 2.5); ell(c, 40, -60, 6, 6, '#8f7a96', 2.5);
      drawEye(c, 44, -52, 4, false);
      break;
    }
    case 'giraffe': {
      legs([-28, -12, 18, 30], -120, 120, 9, '#e9b949');
      ell(c, 0, -128, 44, 24, '#f4c24f');
      for (const [px, py] of [[-20, -132], [0, -122], [18, -136], [-30, -120]]) ell(c, px, py, 8, 6, '#b5651d', 0);
      const reach = Math.sin(t * 0.8) * 6;
      limb(c, [30, -138, 46, -196, 56 + reach, -244], 15, '#f4c24f');
      for (let i = 0; i < 4; i++) ell(c, 36 + i * 5, -160 - i * 20, 5, 4, '#b5651d', 0);
      ell(c, 62 + reach, -248, 16, 10, '#f4c24f');
      limb(c, [56 + reach, -256, 54 + reach, -268], 3, '#8a5a2b'); limb(c, [62 + reach, -256, 64 + reach, -268], 3, '#8a5a2b');
      drawEye(c, 64 + reach, -252, 3.5, false);
      limb(c, [-44, -132, -52, -96], 3, '#e9b949');
      break;
    }
    case 'zebra': {
      // Striped legs with black hooves.
      [-26, -10, 16, 28].forEach((lx, i) => {
        const x2 = lx + walk * (i % 2 ? -8 : 8);
        limb(c, [lx, -50, x2, 0], 8, '#f8f9fa');
        for (const k of [0.3, 0.55, 0.8]) limb(c, [lerp(lx, x2, k) - 4, -50 * (1 - k), lerp(lx, x2, k) + 4, -50 * (1 - k)], 2, '#212529', 0);
        ell(c, x2, -2, 5, 4, '#212529', 0);
      });
      limb(c, [-38, -64, -44, -34], 3, '#f8f9fa'); ell(c, -44, -32, 4, 7, '#212529', 0);   // tail with a black tuft
      // Body with curved stripes.
      c.save(); c.beginPath(); c.ellipse(0, -60, 40, 21, 0, 0, TAU); c.clip();
      c.fillStyle = '#fff'; c.fillRect(-42, -84, 84, 48);
      c.strokeStyle = '#212529'; c.lineWidth = 5;
      for (let x = -36; x < 40; x += 10) { c.beginPath(); c.moveTo(x, -84); c.quadraticCurveTo(x + 9, -62, x - 2, -38); c.stroke(); }
      c.restore(); c.beginPath(); c.ellipse(0, -60, 40, 21, 0, 0, TAU); fillStroke(c, null, 3);
      // Thick striped neck with a short stiff mane.
      c.save();
      c.beginPath(); c.moveTo(20, -74); c.lineTo(36, -110); c.lineTo(52, -104); c.lineTo(40, -60); c.closePath(); fillStroke(c, '#fff', 3);
      c.clip(); c.strokeStyle = '#212529'; c.lineWidth = 4;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(18 + k * 6, -70 - k * 11); c.lineTo(48 + k * 2, -70 - k * 9); c.stroke(); }
      c.restore();
      for (let k = 0; k < 6; k++) limb(c, [22 + k * 3, -76 - k * 7, 17 + k * 3, -82 - k * 7], 5, k % 2 ? '#fff' : '#212529');
      // Long horse face angled down to a black muzzle, eye up high, upright ears.
      poly(c, [42, -102, 50, -116, 60, -112, 86, -86, 84, -76, 72, -74], '#fff', 3);
      c.save(); c.beginPath(); c.moveTo(42, -102); c.lineTo(50, -116); c.lineTo(60, -112); c.lineTo(86, -86); c.lineTo(84, -76); c.lineTo(72, -74); c.closePath(); c.clip();
      c.strokeStyle = '#212529'; c.lineWidth = 3;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(48 + k * 8, -92 + k * 6); c.lineTo(62 + k * 8, -110 + k * 8); c.stroke(); }
      c.restore();
      ell(c, 80, -81, 9, 8, '#343a40', 2);
      ell(c, 84, -84, 2, 2, '#000', 0);
      poly(c, [48, -112, 46, -128, 54, -114], '#fff', 2.5); poly(c, [54, -114, 58, -130, 60, -112], '#fff', 2.5);
      drawEye(c, 56, -104, 3.5, false);
      break;
    }
    case 'rhino': {
      legs([-36, -14, 18, 36], -36, 36, 15, '#868e96');
      ell(c, 0, -44, 56, 30, '#9aa1a9');
      ell(c, 58, -42, 26, 20, '#9aa1a9');
      poly(c, [72, -56, 90, -88, 84, -54], '#e9ecef', 2.5); poly(c, [62, -60, 68, -78, 70, -58], '#e9ecef', 2);
      ell(c, 44, -62, 6, 8, '#9aa1a9', 2);
      drawEye(c, 56, -48, 3.5, false);
      break;
    }
    case 'warthog': {
      legs([-16, -6, 10, 18], -18, 18, 6, '#6d4c41');
      limb(c, [-24, -26, -26, -52], 3, '#6d4c41'); ell(c, -26, -54, 4, 6, '#3e2723', 0);   // tail up like an aerial
      ell(c, 0, -24, 28, 15, '#8d6e63');
      limb(c, [-14, -38, 14, -40], 5, '#3e2723', 0);   // mane
      ell(c, 28, -22, 14, 12, '#8d6e63');
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(38, -18, 8, Math.PI * 0.6, Math.PI * 1.6); c.stroke();
      drawEye(c, 30, -28, 3, false);
      break;
    }
    case 'meerkat': {
      // Standing up on sentry duty: big eyes in dark patches, little round ears, paws held up.
      const up = a.pop === undefined ? 1 : a.pop, blink = (t % 4) < 0.12;
      ell(c, 0, 4, 22, 8, '#5c3d1e', 0);   // the hole
      c.save(); c.beginPath(); c.rect(-40, -110, 80, 112); c.clip(); c.translate(0, (1 - up) * 82); c.scale(1.3, 1.3);
      limb(c, [-6, -6, -16, -2, -20, -14], 3, '#c8a27a'); ell(c, -20, -16, 3, 4, '#3e2723', 0);   // tail with a dark tip
      ell(c, 0, -24, 11, 21, '#d4b48c');
      ell(c, 2, -21, 7, 15, '#f1e3c8', 0);   // pale tummy
      ell(c, -3, -36, 4, 4, '#d4b48c', 2); ell(c, 6, -36, 4, 4, '#d4b48c', 2);   // paws up in front
      ell(c, 2, -52, 11, 10, '#d4b48c');
      for (const ex of [-7, 8]) { ell(c, ex, -60, 4, 4, '#c8a27a', 2); ell(c, ex, -60, 2, 2, '#ffa8a8', 0); }   // ears
      for (const ex of [-2, 7]) {
        ell(c, ex, -53, 4.5, 4, '#6d4c41', 0);
        if (blink) limb(c, [ex - 3, -53, ex + 3, -53], 1.5, OUT, 0);
        else { ell(c, ex, -53, 2.6, 2.8, OUT, 0); ell(c, ex + 1, -54.5, 1, 1, '#fff', 0); }
      }
      ell(c, 12, -49, 2.5, 2, '#f783ac', 0);   // nose
      c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.arc(9, -47, 3, 0.3, Math.PI - 0.3); c.stroke();   // smile
      c.restore();
      break;
    }
    case 'flamingo': {
      limb(c, [0, 0, 0, -52], 3, '#f783ac');
      limb(c, [0, -40, 8, -46, 2, -52], 3, '#f783ac');   // the other leg tucked up
      ell(c, 0, -62, 18, 11, '#ff8fab');
      const bob = Math.sin(t * 1.5) * 4;
      limb(c, [12, -66, 22, -84, 12, -96 + bob], 4, '#ff8fab');
      ell(c, 14, -98 + bob, 6, 5, '#ff8fab');
      poly(c, [18, -100 + bob, 30, -96 + bob, 22, -92 + bob], '#212529', 1.5);
      drawEye(c, 14, -100 + bob, 2, false);
      break;
    }
    case 'penguin': case 'chick': case 'adelie': {
      const belly = st === 'slide', chick = a.kind === 'chick', adelie = a.kind === 'adelie';
      if (belly) { c.translate(0, -10); c.rotate(Math.PI / 2 - 0.1); c.translate(30, 0); }
      const sw = st === 'walk' || st === 'uphill' || st === 'home' ? Math.sin(t * 10) * 0.12 : 0;
      c.rotate(sw);
      if (st === 'swim') { c.translate(0, 6); c.rotate(1.2); }
      const s = chick ? 0.6 : adelie ? 0.75 : 1;
      c.scale(s, s);
      const flap = (a.flap > 0 || st === 'slide') ? Math.sin(t * 20) * 0.6 : 0.2;
      if (a.flap) a.flap = Math.max(0, a.flap - 1 / 60);
      ell(c, -4, -4, 9, 4, '#fd7e14', 2); ell(c, 8, -4, 9, 4, '#fd7e14', 2);
      ell(c, 0, -34, 18, 32, chick ? '#adb5bd' : '#212529');
      if (!chick) ell(c, 5, -30, 12, 24, '#fff', 0);
      c.save(); c.translate(-8, -44); c.rotate(-0.4 - flap); ell(c, 0, 14, 6, 18, chick ? '#adb5bd' : '#212529', 2); c.restore();
      ell(c, 4, -64, 12, 11, chick ? '#adb5bd' : '#212529');
      if (chick) ell(c, 6, -63, 8, 7, '#fff', 0);
      else if (!adelie) ell(c, 9, -56, 6, 5, '#ffd43b', 0);   // emperor's yellow neck patch
      poly(c, [12, -66, 22, -62, 12, -60], adelie ? '#212529' : '#fd7e14', 1.5);
      if (adelie) ell(c, 8, -67, 5, 5, '#fff', 0);
      drawEye(c, 8, -67, 2.6, false);
      break;
    }
    case 'seal': {
      const lift = a.bark > 0 ? -10 : 0;
      ell(c, -10, -14, 54, 15, '#6c757d');
      for (const [px, py] of [[-30, -18], [-8, -10], [12, -20], [-46, -10]]) ell(c, px, py, 4, 3, '#343a40', 0);
      poly(c, [-62, -14, -80, -24, -78, -4], '#6c757d', 2.5);
      ell(c, 42, -24 + lift, 16, 12, '#6c757d');
      ell(c, 56, -22 + lift, 6, 4, '#495057', 0);
      drawEye(c, 46, -28 + lift, 3, false);
      limb(c, [52, -20 + lift, 66, -24 + lift], 1, '#212529', 0); limb(c, [52, -18 + lift, 66, -16 + lift], 1, '#212529', 0);
      ell(c, 18, -4, 12, 5, '#495057', 2);
      break;
    }
    case 'orca': {
      // A killer whale. Origin is the water surface; it rolls up through it, or leaps right out.
      const bull = a.bull;
      if (st === 'leap') {
        const k = 1 - Math.max(0, a.st) / 1.4, h = Math.sin(k * Math.PI) * 120;
        c.translate(0, -h); c.rotate((k - 0.5) * 1.4);
      } else c.translate(0, 26 - Math.max(0, Math.sin(t * 1.6)) * 30);
      limb(c, [-60, 0, -92, -2], 12, '#212529');
      poly(c, [-90, -2, -112, -16, -104, -2, -112, 12], '#212529', 2.5);   // notched tail flukes
      c.beginPath(); c.moveTo(-70, 0); c.quadraticCurveTo(-40, -24, 30, -20); c.quadraticCurveTo(76, -14, 80, 2); c.quadraticCurveTo(60, 20, 0, 20); c.quadraticCurveTo(-50, 18, -70, 0); c.closePath();
      fillStroke(c, '#212529', 3);
      c.save(); c.clip();
      ell(c, 20, 18, 52, 10, '#f8f9fa', 0);   // white belly
      ell(c, -30, 10, 20, 7, '#f8f9fa', 0);   // white flank sweep
      ell(c, 46, -10, 11, 5, '#f8f9fa', 0);   // eye patch
      ell(c, -18, -18, 16, 6, '#adb5bd', 0);   // grey saddle
      c.restore();
      poly(c, [-14, -20, 0, bull ? -96 : -60, 14, -20], '#212529', 3);   // dorsal fin, the bull's is very tall
      c.save(); c.translate(36, 14); c.rotate(0.5); ell(c, 0, 8, 7, 14, '#212529', 2); c.restore();   // flipper
      ell(c, 54, -4, 2, 2, '#495057', 0);
      break;
    }
    case 'whale': {
      // A humpback whale: long and dark, knobbly head, long white-edged flippers.
      const blow = st === 'blow' ? Math.min(1, (2 - a.st) * 2) * Math.min(1, a.st) : 0;
      if (st === 'fluke') {
        // Tail up high as it dives, white underneath, water streaming off.
        const k = Math.sin(Math.min(1, (3 - a.st) / 3) * Math.PI);
        c.save(); c.translate(-30, 10 - k * 80);
        limb(c, [0, 80, 0, 10], 22, '#3d4a5c');
        poly(c, [0, 10, -60, -20, -50, 0, 0, 4, 50, 0, 60, -20], '#3d4a5c', 3);
        poly(c, [-4, 6, -48, -10, 0, 0, 48, -10, 4, 6], '#f1f3f5', 0);
        for (let i = 0; i < 4; i++) ell(c, -40 + i * 26, ((t * 80 + i * 20) % 60), 3, 5, 'rgba(231,245,255,0.8)', 0);
        c.restore();
        break;
      }
      if (st === 'breach') {
        const k = 1 - Math.max(0, a.st) / 2.2, h = Math.sin(k * Math.PI) * 140;
        c.translate(40, 40 - h); c.rotate(-1.1 + k * 0.9);
      } else c.translate(0, st === 'blow' ? 10 : 34 - Math.max(0, Math.sin(t * 0.9)) * 22);   // up at the surface to breathe
      limb(c, [-120, 0, -160, -4], 16, '#3d4a5c');
      poly(c, [-158, -4, -190, -24, -178, -4, -190, 16], '#3d4a5c', 3);
      c.beginPath(); c.moveTo(-130, 0); c.quadraticCurveTo(-60, -34, 60, -28); c.quadraticCurveTo(140, -20, 150, 4); c.quadraticCurveTo(120, 30, 20, 30); c.quadraticCurveTo(-90, 26, -130, 0); c.closePath();
      fillStroke(c, '#3d4a5c', 3);
      c.save(); c.clip(); for (let i = 0; i < 6; i++) limb(c, [30 + i * 18, 22, 46 + i * 18, 30], 2, '#adb5bd', 0); c.restore();   // throat grooves
      for (const [bx, by] of [[100, -20], [116, -16], [128, -10], [108, -12]]) ell(c, bx, by, 3.5, 3, '#2b3442', 0);   // knobbly bumps
      poly(c, [-56, -26, -44, -40, -30, -28], '#3d4a5c', 2.5);   // small dorsal hump
      c.save(); c.translate(70, 20); c.rotate(0.45); ell(c, -30, 6, 46, 8, '#e9ecef', 3); c.restore();   // long white-edged flipper
      ell(c, 112, 2, 2.5, 2.5, '#f8f9fa', 0);
      if (blow > 0) {
        // The blow: a bushy V of mist from the blowhole.
        for (let i = 0; i < 10; i++) { const sx = 60 + (i % 2 ? 1 : -1) * (6 + i * 5) * blow; ell(c, sx, -34 - i * 14 * blow, 9 + i * 1.5, 9 + i * 1.5, `rgba(255,255,255,${0.95 - i * 0.07})`, 0); }
      }
      break;
    }
    case 'mammoth': {
      // Woolly mammoth: shaggy brown coat, high domed head, little ear, long curling tusks.
      const baby = a.baby;
      limb(c, [-62, -100, -72, -70], 4, '#5d4037'); ell(c, -72, -66, 5, 7, '#3e2723', 0);
      legs([-40, -16, 22, 44], -66, 66, 24, '#5d4037');
      ell(c, 0, -100, 70, 50, '#6d4c41');
      c.fillStyle = '#6d4c41'; c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(-62, -82);
      for (let x = -62; x <= 56; x += 12) { c.lineTo(x + 6, -54 + (x % 24 ? 6 : 0)); c.lineTo(x + 12, -74); }
      c.closePath(); c.fill();   // shaggy fringe of fur hanging down
      ell(c, 64, -132, 30, 32, '#6d4c41');
      ell(c, 54, -160, 22, 16, '#6d4c41');   // the high dome
      ell(c, 44, -128, 10, 13, '#5d4037', 2.5);   // small furry ear
      limb(c, [86, -120, 98, -80, 94, -30 + Math.sin(t * 2) * 4], 12, '#6d4c41');   // trunk
      if (!baby) { c.strokeStyle = OUT; c.lineWidth = 9; c.beginPath(); c.moveTo(82, -110); c.quadraticCurveTo(150, -70, 128, -140); c.stroke(); c.strokeStyle = '#f3ead2'; c.lineWidth = 6; c.stroke(); }
      drawEye(c, 72, -140, 4, false);
      for (let i = 0; i < 6; i++) limb(c, [-40 + i * 16, -136, -44 + i * 16, -126], 2, '#4e342e', 0);   // shaggy texture
      break;
    }
    case 'sabretooth': {
      // Smilodon: a stocky tan cat with a stubby tail and two huge fangs.
      const snarl = st === 'snarl';
      limb(c, [-46, -46, -56, -40], 7, '#c9a36b');
      legs([-30, -14, 18, 32], -36, 36, 13, '#b8925c');
      ell(c, 0, -40, 48, 24, '#c9a36b');
      for (const [px, py] of [[-20, -48], [0, -54], [-30, -38], [14, -44]]) ell(c, px, py, 5, 3, '#a07a46', 0);
      const hx = 48, hy = -56;
      ell(c, hx - 10, hy - 14, 6, 6, '#b8925c', 2);
      ell(c, hx, hy, 19, 17, '#c9a36b');
      ell(c, hx + 14, hy + 6, 10, 7, '#e3c79a', 2);
      poly(c, [hx + 20, hy - 1, hx + 26, hy - 1, hx + 23, hy + 3], '#5c3d1e', 1.5);
      if (snarl) ell(c, hx + 16, hy + 14, 8, 6, '#5c1f1f', 2);
      for (const fx of [hx + 10, hx + 18]) poly(c, [fx, hy + 8, fx + 2, hy + (snarl ? 34 : 30), fx + 5, hy + 8], '#fff8e7', 2);   // the sabre teeth
      drawEye(c, hx + 6, hy - 6, 4, false);
      break;
    }
    case 'skua': {
      const f = Math.sin(t * 10) * 14;
      poly(c, [-6, 0, -34, -10 - f, -10, -4], '#7a5c48', 2); poly(c, [6, 0, 34, -10 - f, 10, -4], '#7a5c48', 2);
      ell(c, 0, 0, 14, 7, '#8d6e63');
      ell(c, 14, -4, 6, 5, '#8d6e63', 2);
      poly(c, [19, -5, 26, -3, 19, -1], '#343a40', 1);
      break;
    }
  }
}
