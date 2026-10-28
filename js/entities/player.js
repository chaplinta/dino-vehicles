// The player's dinosaur on foot. In a vehicle, the vehicle takes over movement.
const TREASURE_INFO = {
  [T.BONE]: { say: 'A dinosaur bone!', stars: 1 },
  [T.EGG]: { say: 'An egg!', stars: 1 },
  [T.GEM]: { say: 'A shiny gem!', stars: 2 },
  [T.FOSSIL]: { say: 'A fossil!', stars: 2 },
  [T.CRYSTAL]: { say: 'A moon crystal!', stars: 2 },
  [T.CHEESE]: { say: 'Moon cheese!', stars: 1 },
  [T.GOLDEGG]: { say: 'A golden egg!', stars: 5 },
  [T.TREASURE]: { say: 'A treasure chest! Gold coins!', stars: 3 },
};
// Attack timings: how long it lasts and when the blow lands.
const ATTACKS = {
  bite: { len: 0.6, hitAt: 0.48 },       // big meat-eaters: lunge, grab, shake
  headbutt: { len: 0.85, hitAt: 0.6, charge: [0.15, 0.6] },   // horned and dome-headed dinos: paw, charge, BONK on contact
  tail: { len: 0.5, hitAt: 0.27 },       // spin and swing the tail
  peck: { len: 0.5, hitAt: 0.36 },       // pterodactyl: three quick jabs of the beak
  thumb: { len: 0.5, hitAt: 0.27 },      // Iguanodon: rear up, stab with the thumb spike
  claw: { len: 0.5, hitAt: 0.28 },       // Baryonyx: raise the arm, slash down
  kick: { len: 0.5, hitAt: 0.25 },       // Velociraptor: hop and kick with the sickle claw
  cutlass: { len: 0.5, hitAt: 0.28 },    // pirate crew: swing the cutlass
};
const POW_WORD = { bite: 'CHOMP!', headbutt: 'BONK!', tail: 'WHACK!', peck: 'PECK!', thumb: 'JAB!', claw: 'SLASH!', kick: 'KICK!', cutlass: 'SWISH!' };
// The noise each move makes, for you and for dinos who fight back.
function attackSound(kind) {
  if (kind === 'bite') [0, 0.14, 0.28, 0.42].forEach(d => { Sound.tone(300, 0.06, 'square', 0.12, 120, d); Sound.noise(0.06, 0.15, 'lowpass', 900, d + 0.07); });
  else if (kind === 'tail') Sound.whoosh();
  else if (kind === 'peck') [0, 0.12, 0.24].forEach(d => Sound.tone(1400, 0.04, 'square', 0.07, 900, d));
  else if (kind === 'claw' || kind === 'cutlass') { Sound.noise(0.1, 0.12, 'bandpass', 2500, 0.08); Sound.noise(0.14, 0.15, 'highpass', 3000, 0.12); }
  else if (kind === 'thumb' || kind === 'kick') { Sound.noise(0.12, 0.1, 'bandpass', 900); Sound.tone(220, 0.1, 'square', 0.06, 120, 0.1); }
  else Sound.tone(140, 0.25, 'sawtooth', 0.08, 90);
}
const LICK_TIME = 0.9;   // lick, lick, slurp
const DUST = {
  [T.GRASS]: ['#5cc84a', '#a0662e'], [T.DIRT]: ['#a0662e', '#8a5524'], [T.SAND]: ['#f2d48a', '#e0bd6c'],
  [T.STONE]: ['#8f939c', '#a7abb3'], [T.BRICK]: ['#d9534f', '#e8e0d4'], [T.WOOD]: ['#c98a4b', '#a86d35'],
  [T.GLASS]: ['#bdf3ff', '#ffffff'], [T.LEAVES]: ['#3fae49', '#5cc84a'], [T.ROOF]: ['#4263eb', '#364fc7'],
  [T.CONCRETE]: ['#c9cdd4', '#b3b8c0'], [T.ROAD]: ['#4a4a55', '#ffd43b'],
  [T.MOONDUST]: ['#c8c9d2', '#e2e3ea'], [T.MOONROCK]: ['#8b8d9b', '#737584'],
  [T.REDDIRT]: ['#c4532a', '#dc6b3c'], [T.IRONORE]: ['#7a2e22', '#4b3b47'], [T.BROKENORE]: ['#5a2a22', '#8a3a2a'], [T.WASTE]: ['#9a6a52', '#b5866c'],
};

// Seconds of digging a tile takes by hand.
function digTime(id) { const h = TILES[id].hard; return h >= 3 ? 0.9 : h >= 2 ? 0.45 : 0.18; }

function digEffects(tx, ty, id) {
  const cx = tx * TS + TS / 2, cy = ty * TS + TS / 2;
  Fx.burst(cx, cy, 10, { speed: 220, up: 120, g: 900, life: 0.7, r: 6, color: DUST[id] || ['#a0662e', '#8a5524'], shape: 'rect' });
  if (TILES[id].treasure) {
    const info = TREASURE_INFO[id];
    Fx.burst(cx, cy, 14, { speed: 260, up: 80, g: 300, life: 1.1, r: 9, color: ['#ffd43b', '#fff3bf'], shape: 'star' });
    Game.addStars(info.stars, cx, cy);
    Game.popup(id, cx, cy);
    Sound.collect();
    Sound.say(info.say);
    Eggs.onDig(tx, ty, id);
    if (typeof Hunt !== 'undefined') Hunt.onDig(tx, ty, id);
  }
}

const Player = {
  type: 'rex', body: null, facing: 1, walk: 0, t: 0,
  roarT: 0, flap: 0, digT: 0, digKey: -1, digAnim: 0,
  vehicle: null, block: 0, placeCool: 0, slideTo: null, attackT: 0, attackCool: 0, attackHeld: false, actIcon: '',

  init(type, x, y) {
    this.type = type;
    const box = dinoBox(type);
    this.body = makeBody(x, y, box.w, box.h);
    this.vehicle = null;
  },
  get cx() { return this.vehicle ? this.vehicle.body.x : this.body.x; },
  get cy() { return this.vehicle ? this.vehicle.body.y - this.vehicle.body.h / 2 : this.body.y - this.body.h / 2; },

  roar() {
    this.roarT = 0.9;
    Sound.roar();
    Eggs.onRoar();
    if (typeof NPCs !== 'undefined') NPCs.heardRoar(this.cx, this.cy);
  },

  update(dt) {
    this.t += dt;
    this.roarT = Math.max(0, this.roarT - dt);
    this.digAnim = Math.max(0, this.digAnim - dt * 4);
    this.placeCool = Math.max(0, this.placeCool - dt);
    this.updateAttack(dt);
    this.attackCool = Math.max(0, this.attackCool - dt);
    this.hurtCool = Math.max(0, (this.hurtCool || 0) - dt);
    if (this.hurtT > 0) { this.hurtT = Math.max(0, this.hurtT - dt); this.hurtSpin = -this.hurtDir * Math.sin((1 - this.hurtT / 0.6) * Math.PI) * 0.7; }
    if (Input.pressed.roar && !this.vehicle) this.roar();
    this.lickT = Math.max(0, (this.lickT || 0) - dt);
    if (Input.pressed.lick && !this.vehicle && !this.lickT) { this.lickT = LICK_TIME; Sound.lick(); }
    if (Input.pressed.attack && !this.vehicle && !Game.overlay) this.attack();   // the attack button: swings even at thin air
    if (this.vehicle) return;

    const b = this.body;
    const dinoDef = DINO_TYPES[this.type];
    const dir = (Input.held.right ? 1 : 0) - (Input.held.left ? 1 : 0);
    this.zoomT = Math.max(0, (this.zoomT || 0) - dt);
    const speed = (this.zoomT > 0 ? 400 : 230) * (Input.stick || 1);   // a Melbourne coffee makes you zoom; a gentle push on the stick walks
    if (this.hurtT > 0) b.vx = lerp(b.vx, 0, Math.min(1, dt * 2));   // knocked flying
    else if (this.charging) { /* charging: keep running */ }
    else b.vx = lerp(b.vx, dir * speed, Math.min(1, dt * (b.onGround || dinoDef.flies ? 12 : 5)));
    if (dir) this.facing = dir;

    const flier = dinoDef.flies;
    let gravity = 1;
    if (flier && !b.inWater && (Input.held.up || !b.onGround)) {
      // Real flight: hold up to climb, let go to glide down, hold down to dive.
      gravity = 0;
      const target = Input.held.up ? -300 : Input.held.down ? 350 : 80;
      b.vy = lerp(b.vy, target, Math.min(1, dt * (Input.held.up ? 4 : 6)));
      if (Input.held.up && b.onGround) b.vy = -300;
      if (b.y < -300) { b.y = -300; b.vy = Math.max(0, b.vy); }
      this.flapSnd = (this.flapSnd || 0) - dt;
      if (Input.held.up && this.flapSnd <= 0) { Sound.flap(); this.flapSnd = 0.25; }
      this.flap += dt * (Input.held.up ? 16 : 5);
    } else {
      if (Input.pressed.up) {
        if (b.onGround) { b.vy = -640; Sound.jump(); }
        else if (b.inWater) { b.vy = -420; }
      }
      this.flap = lerp(this.flap, 0, dt * 6);
    }
    if (b.inWater && Input.held.up) b.vy -= 1200 * dt;
    // Climb walls while holding up, so no one gets stuck at the bottom of a hole.
    const wall = bodySolidAt(b, b.x - 3, b.y - 2) || bodySolidAt(b, b.x + 3, b.y - 2);
    // Climb walls: hold up, or just keep walking into a wall too tall to jump.
    const pushing = dir && bodySolidAt(b, b.x + dir * 3, b.y - 2);
    // Jungle vines: hold up to climb, let go to hang on.
    const vine = !flier && Wild.vineAt(b);
    if (vine && Input.held.up) { if (b.vy > -220) b.vy = -220; this.climbing = true; }
    else if (!flier && (Input.held.up || (pushing && this.pushT > 0.35)) && wall && (!b.onGround || pushing) && b.vy > -260) { b.vy = -260; this.climbing = true; } else this.climbing = false;
    if (vine && !Input.held.up && !b.onGround && !Input.held.down) b.vy = Math.min(b.vy, 0);
    this.pushT = pushing && b.hitWall === dir ? (this.pushT || 0) + dt : 0;

    if (this.slideTo !== null && !dir) {
      b.vx = (this.slideTo - b.x) * 10;
      if (Math.abs(this.slideTo - b.x) < 2) this.slideTo = null;
    } else this.slideTo = null;
    const wasGround = b.onGround, vyBefore = b.vy;
    moveBody(b, dt, { step: 1, gravity });
    // Auto-jump: walking into a wall up to 3 tiles high hops over it.
    if (!flier && dir && b.hitWall === dir && b.onGround) {
      for (let k = 1; k <= 3; k++) {
        if (!bodySolidAt(b, b.x + dir * 6, b.y - k * TS)) { b.vy = k === 1 ? -480 : -640; Sound.jump(); break; }
      }
    }
    if (!wasGround && b.onGround && vyBefore > 500) {
      Sound.land();
      Fx.burst(b.x, b.y, 6, { speed: 90, up: 40, g: 200, life: 0.4, r: 5, color: '#e8dcc8' });
    }
    this.walk = b.onGround && Math.abs(b.vx) > 20 ? this.walk + dt * Math.abs(b.vx) * 0.05 : 0;

    // The action button attacks a dino in reach, otherwise digs.
    const kind = dinoDef.attack;
    const targets = NPCs.inReach(b.x, b.y, this.facing, ATTACKS[kind].charge ? 'charge' : kind);
    const icon = targets.length ? ATTACK_ICON[kind] : '⛏️';
    if (icon !== this.actIcon && !Game.overlay) { this.actIcon = icon; UI.setAction(icon); }
    if (Input.pressed.action && targets.length) { this.attack(); this.attackHeld = true; }
    if (!Input.held.action) this.attackHeld = false;
    // Digging with the action button.
    if (Input.held.action && !this.attackHeld) {
      const tgt = this.digTarget();
      if (tgt) {
        const k = tgt[1] * WORLD_W + tgt[0];
        if (k !== this.digKey) { this.digKey = k; this.digT = 0; }
        this.digT += dt;
        this.digAnim = 1;
        const need = digTime(World.get(tgt[0], tgt[1]));
        if (this.digT >= need) {
          const id = World.dig(tgt[0], tgt[1]);
          if (id >= 0) { Sound.dig(); digEffects(tgt[0], tgt[1], id); }
          if (tgt[1] * TS >= b.y - 1) this.slideTo = tgt[0] * TS + TS / 2;   // dug below: drop into the hole
          this.digT = 0; this.digKey = -1;
        }
      }
    } else { this.digT = 0; this.digKey = -1; }
  },

  // Meat-eaters maul (grab, shake, chomp chomp), Triceratops charges and headbutts,
  // the others spin round and whack with their tail. The hit lands partway through.
  attack() {
    if (this.attackCool > 0) return;
    const kind = DINO_TYPES[this.type].attack;
    const a = ATTACKS[kind];
    this.attackKind = kind; this.attackLen = a.len; this.attackT = a.len; this.attackCool = a.len + 0.1;
    this.attackHit = false;
    this.attackTargets = ATTACKS[kind].charge ? [] : NPCs.inReach(this.body.x, this.body.y, this.facing, kind);   // a charge hits whoever it runs into
    if (kind === 'bite') for (const n of this.attackTargets) n.grabbedT = a.hitAt;   // held still while being mauled
    attackSound(kind);
  },
  // Another dino got you: POW, knocked back with a wobble. No damage, it's play-fighting.
  hurt(by, kind) {
    if (this.vehicle || this.hurtCool > 0) return false;
    const b = this.body, away = Math.sign(b.x - by.x) || 1;
    this.hurtT = 0.6; this.hurtCool = 0.9; this.hurtDir = away; this.hurtSpin = 0;
    this.attackT = 0;
    b.vx = away * 420; b.vy = -460;
    Pow.add(b.x - away * 14, b.y - 40, POW_WORD[kind] || 'POW!');
    Fx.burst(b.x, b.y - 40, 10, { speed: 220, up: 100, g: 300, life: 0.8, r: 9, color: ['#ffd43b', '#fff3bf'], shape: 'star' });
    Sound.tone(700, 0.25, 'square', 0.07, 280); Sound.noise(0.12, 0.2, 'lowpass', 600);
    this.owT = (this.owT || 0) - 1;
    if (this.owT <= 0) { this.owT = 3; Sound.say(pick(['Ow!', 'Hey!', 'Ouch!', 'Oof!'])); }
    return true;
  },
  updateAttack(dt) {
    this.charging = false;
    if (this.attackT <= 0) return;
    this.attackT = Math.max(0, this.attackT - dt);
    const a = ATTACKS[this.attackKind], k = this.attackLen - this.attackT, b = this.body;
    if (a.charge && !this.attackHit && k >= a.charge[0] && k < a.charge[1]) {
      // Charge! Run flat out, head down, and BONK whoever you run into.
      this.charging = true;
      b.vx = this.facing * 520;
      if (b.onGround && Math.random() < 0.6) Fx.add({ x: b.x - this.facing * 14, y: b.y - 4, vx: -this.facing * rand(40, 100), vy: rand(-60, -20), life: 0.5, r: 7, color: 'rgba(200,180,150,0.7)', shape: 'grow' });
      this.drumT = (this.drumT || 0) - dt;
      if (this.drumT <= 0) { this.drumT = 0.11; Sound.noise(0.07, 0.12, 'lowpass', 180); }
      const hit = NPCs.inReach(b.x, b.y, this.facing, this.attackKind).filter(n => (n.body.x - b.x) * this.facing < 60);
      if (hit.length) {
        this.attackHit = true;
        for (const n of hit) NPCs.hit(n, b.x, this.attackKind);
        b.vx = -this.facing * 160; b.vy = -180;
        this.attackT = Math.min(this.attackT, 0.25);   // straight to the bounce-back
        return;
      }
    }
    if (!this.attackHit && this.attackLen - this.attackT >= a.hitAt) {
      this.attackHit = true;
      for (const n of this.attackTargets || []) NPCs.hit(n, this.body.x, this.attackKind);
    }
  },

  // Which tile the dino would dig: in front at feet, then head height, then down.
  digTarget() {
    const b = this.body;
    const ok = (x, y) => TILES[World.get(x, y)].dig && World.get(x, y) !== T.AIR;
    const fx = Math.floor((b.x + this.facing * (b.w / 2 + 8)) / TS);
    const feet = Math.floor((b.y - 8) / TS), head = Math.floor((b.y - b.h + 8) / TS);
    const below = Math.floor((b.y + 8) / TS);
    const cols = [Math.floor(b.x / TS), Math.floor((b.x - b.w / 2 + 2) / TS), Math.floor((b.x + b.w / 2 - 2) / TS)];
    const down = () => { for (const cx of cols) if (ok(cx, below)) return [cx, below]; return null; };
    if (Input.held.down) { const d = down(); if (d) return d; }
    if (ok(fx, feet)) return [fx, feet];
    if (ok(fx, head)) return [fx, head];
    return down();
  },

  // Tap on the world: dig a solid tile or place a block into empty space.
  tapTile(tx, ty) {
    if (this.vehicle) { if (this.vehicle.tapTile) this.vehicle.tapTile(tx, ty); return; }
    const b = this.body;
    const px = tx * TS + TS / 2, py = ty * TS + TS / 2;
    if (dist(px, py, b.x, b.y - b.h / 2) > TS * 8) return false;
    this.facing = px < b.x ? -1 : 1;
    const id = World.get(tx, ty);
    const d = TILES[id];
    if (d.solid || d.treasure) {
      if (!d.dig) { Sound.bonk(); return true; }
      World.dig(tx, ty); Sound.dig(); digEffects(tx, ty, id); this.digAnim = 1;
      return true;
    }
    if (this.placeCool > 0) return true;
    return placeBlock(tx, ty, BUILD_BLOCKS[this.block]);
  },

  draw(c) {
    if (this.vehicle) return;
    const b = this.body;
    let walk = this.walk;
    if (this.digAnim > 0) walk = Math.sin(this.t * 30) * 0.6;
    let flip = this.facing < 0, roar = this.roarT, x = b.x, rot = 0;
    let y = b.y + 1;
    const ap = this.attackT > 0 ? attackPose(this.attackKind, 1 - this.attackT / this.attackLen, this.facing) : null;
    let pose = null;
    if (ap) { x += ap.dx; y += ap.dy; rot = ap.rot; if (ap.flip) flip = !flip; if (ap.roar !== null) roar = ap.roar; pose = ap.pose; drawAttackFx(c, ap, b.x, b.y, this.facing); }
    if (this.hurtT > 0) { rot += this.hurtSpin; if (Math.floor(this.hurtT * 20) % 2) c.globalAlpha = 0.55; }
    c.save(); c.translate(x, y); c.rotate(rot);
    const lick = this.lickT > 0 ? 1 - this.lickT / LICK_TIME : 0;
    const sc = dinoScale(this.type);
    drawDino(c, 0, 0, sc, this.type, { t: this.t, walk: pose ? 0 : walk, flip, roar, flap: this.flap, lick, pose });
    c.restore();
    c.globalAlpha = 1;
    const top = y - dinoTop(this.type, sc);   // top of the head
    if (outfit() === 'pirate') {
      // A parrot riding along on your back.
      const px = x - this.facing * 8, py = top + 6 + Math.sin(this.t * 4) * 2;
      c.save(); c.translate(px, py); c.scale(this.facing, 1);
      ell(c, 0, 0, 9, 12, '#e03131', 3);
      poly(c, [-2, -4, -16, 4, -4, 8], '#1c7ed6', 2);
      ell(c, 3, -12, 7, 7, '#e03131', 3);
      poly(c, [8, -14, 15, -10, 8, -8], '#fcc419', 2);
      ell(c, 4, -14, 1.8, 1.8, OUT, 0);
      c.restore();
    }
    if (this.carry) {
      // The treasure chest held up over your head.
      const cx = x, cy = top - 22 + Math.sin(this.walk) * 2;
      rbox(c, cx - 24, cy - 6, 48, 26, 5, '#a86d35', 3);
      rbox(c, cx - 26, cy - 16, 52, 14, 6, '#8a5524', 3);
      c.fillStyle = '#fcc419'; c.fillRect(cx - 4, cy - 6, 8, 10);
      for (let i = 0; i < 3; i++) ell(c, cx - 12 + i * 12, cy - 18, 5, 3, '#ffd43b', 1.5);
      if (Math.floor(this.t * 3) % 2) drawStar(c, cx + 20, cy - 22, 6, this.t, '#fff', 0);
    }
  },
};

// How a dino's body moves through each attack (k: 0..1), shared by you and by dinos who fight back.
function attackPose(kind, k, f) {
  let x = 0, y = 0, rot = 0, flip = false, roar = null, pose = null, arc = 0, slash = 0;
  if (kind === 'bite') {
    // Lunge, then shake the head side to side with jaws snapping.
    x += f * 22 * Math.min(1, k * 5) * (k > 0.85 ? (1 - k) / 0.15 : 1);
    y -= Math.sin(Math.min(1, k * 3) * Math.PI) * 10;
    rot = Math.sin(k * Math.PI * 10) * 0.16 * (k < 0.8 ? 1 : 0);
    roar = Math.floor(k * 12) % 2 ? 1 : 0;
  } else if (kind === 'headbutt') {
    // Paw the ground and rear back, then run in head down; after the BONK, back up.
    if (k < 0.18) { rot = -f * 0.22 * (k / 0.18); x -= f * 6 * Math.sin(k * 60); }
    else if (k < 0.7) rot = f * 0.35;
    else rot = f * 0.35 * (1 - (k - 0.7) / 0.3);
  } else if (kind === 'peck') {
    // Three quick stabs of the beak, leaning right in.
    const jab = Math.abs(Math.sin(k * Math.PI * 3));
    x += f * 14 * jab; rot = f * 0.5 * jab;
  } else if (kind === 'thumb') {
    // Rear up with the arm cocked, then lunge and stab with the thumb spike.
    if (k < 0.4) { const q = k / 0.4; rot = -f * 0.22 * q; x -= f * 8 * q; pose = { kind, e: -0.5 * q }; }
    else if (k < 0.7) { const q = Math.min(1, (k - 0.4) / 0.12); rot = f * lerp(-0.22, 0.15, q); x += f * lerp(-8, 26, q); pose = { kind, e: q }; }
    else { const q = (k - 0.7) / 0.3; rot = f * 0.15 * (1 - q); x += f * 26 * (1 - q); pose = { kind, e: 1 - q }; }
  } else if (kind === 'claw' || kind === 'cutlass') {
    // Arm up high, then a big slash down across the front, three claw marks.
    let a;
    if (k < 0.35) a = lerp(0.5, -1.5, k / 0.35);
    else if (k < 0.6) a = lerp(-1.5, 1.2, (k - 0.35) / 0.25);
    else a = lerp(1.2, 0.5, (k - 0.6) / 0.4);
    pose = { kind: 'claw', a };
    x += f * (k > 0.35 && k < 0.8 ? 16 : 0); rot = f * (k > 0.35 && k < 0.7 ? 0.12 : -0.06);
    slash = k > 0.45 && k < 0.95 ? 1 - Math.abs(k - 0.62) / 0.33 : 0;
  } else if (kind === 'kick') {
    // Hop, lean back and shoot the leg out with the sickle claw up.
    const e = k < 0.2 ? 0 : k < 0.45 ? (k - 0.2) / 0.25 : k < 0.65 ? 1 : Math.max(0, 1 - (k - 0.65) / 0.25);
    y -= Math.sin(Math.min(1, k / 0.7) * Math.PI) * 22; rot = -f * 0.25 * e; x += f * 10 * e;
    pose = { kind, e };
  } else {
    // Spin round so the tail sweeps through, then back.
    flip = k > 0.15 && k < 0.75;
    x -= f * Math.sin(k * Math.PI) * 10;
    y -= Math.sin(k * Math.PI) * 8;
    arc = k > 0.2 && k < 0.8 ? 1 - Math.abs(k - 0.5) / 0.3 : 0;
  }
  return { dx: x, dy: y, rot, flip, roar, pose, arc, slash };
}
// Whoosh lines for a tail swing, claw marks for a slash.
function drawAttackFx(c, ap, bx, by, f) {
  if (ap.arc > 0) {
    c.strokeStyle = `rgba(255,255,255,${ap.arc * 0.9})`; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(bx, by - 30, 50 + i * 12, Math.PI * 0.75, Math.PI * 1.25); c.stroke(); c.beginPath(); c.arc(bx, by - 30, 50 + i * 12, -Math.PI * 0.25, Math.PI * 0.25); c.stroke(); }
  }
  if (ap.slash > 0) {
    const cx = bx + f * 62, cy = by - 44;
    c.strokeStyle = `rgba(255,255,255,${ap.slash})`; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(cx - f * 16 + i * 10, cy - 24); c.lineTo(cx + f * 14 + i * 10, cy + 24); c.stroke(); }
  }
}

// Put a block into an empty tile if no one is standing there.
function placeBlock(tx, ty, id) {
  const cur = World.get(tx, ty);
  if (!(cur === T.AIR || cur === T.WATER || TILES[cur].back || cur === T.FLOWER)) return false;
  const l = tx * TS, t = ty * TS;
  for (const body of Game.bodies()) {
    if (l < body.x + body.w / 2 && l + TS > body.x - body.w / 2 && t < body.y && t + TS > body.y - body.h) return false;
  }
  World.set(tx, ty, id);
  Sound.place();
  Fx.burst(l + TS / 2, t + TS / 2, 5, { speed: 80, life: 0.3, r: 4, color: '#fff' });
  return true;
}
