// The player's dinosaur on foot. In a vehicle, the vehicle takes over movement.
const TREASURE_INFO = {
  [T.BONE]: { say: 'A dinosaur bone!', stars: 1 },
  [T.EGG]: { say: 'An egg!', stars: 1 },
  [T.GEM]: { say: 'A shiny gem!', stars: 2 },
  [T.FOSSIL]: { say: 'A fossil!', stars: 2 },
  [T.CRYSTAL]: { say: 'A moon crystal!', stars: 2 },
  [T.CHEESE]: { say: 'Moon cheese!', stars: 1 },
  [T.GOLDEGG]: { say: 'A golden egg!', stars: 5 },
};
// Attack timings: how long it lasts and when the blow lands.
const ATTACKS = { bite: { len: 0.6, hitAt: 0.48 }, headbutt: { len: 0.45, hitAt: 0.22 }, tail: { len: 0.5, hitAt: 0.27 } };
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
  }
}

const Player = {
  type: 'rex', body: null, facing: 1, walk: 0, t: 0,
  roarT: 0, flap: 0, digT: 0, digKey: -1, digAnim: 0,
  vehicle: null, block: 0, placeCool: 0, slideTo: null, attackT: 0, attackCool: 0, attackHeld: false, actIcon: '',

  init(type, x, y) {
    this.type = type;
    this.body = makeBody(x, y, 28, 56);
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
    if (Input.pressed.roar && !this.vehicle) this.roar();
    if (this.vehicle) return;

    const b = this.body;
    const dinoDef = DINO_TYPES[this.type];
    const dir = (Input.held.right ? 1 : 0) - (Input.held.left ? 1 : 0);
    const speed = 230;
    b.vx = lerp(b.vx, dir * speed, Math.min(1, dt * (b.onGround || dinoDef.flies ? 12 : 5)));
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
    if (!flier && (Input.held.up || (pushing && this.pushT > 0.35)) && wall && (!b.onGround || pushing) && b.vy > -260) { b.vy = -260; this.climbing = true; } else this.climbing = false;
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
    const targets = NPCs.inReach(b.x, b.y, this.facing, kind);
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
    this.attackTargets = NPCs.inReach(this.body.x, this.body.y, this.facing, kind);
    if (kind === 'bite') {
      for (const n of this.attackTargets) n.grabbedT = a.hitAt;   // held still while being mauled
      [0, 0.14, 0.28, 0.42].forEach(d => setTimeout(() => Sound.chomp(), d * 1000));
    } else if (kind === 'tail') Sound.whoosh();
    else Sound.tone(140, 0.25, 'sawtooth', 0.08, 90);
  },
  updateAttack(dt) {
    if (this.attackT <= 0) return;
    this.attackT = Math.max(0, this.attackT - dt);
    const a = ATTACKS[this.attackKind];
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
    let y = b.y + 1, arc = 0;
    if (this.attackT > 0) {
      const k = 1 - this.attackT / this.attackLen, f = this.facing;
      const kind = this.attackKind;
      if (kind === 'bite') {
        // Lunge, then shake the head side to side with jaws snapping.
        x += f * 22 * Math.min(1, k * 5) * (k > 0.85 ? (1 - k) / 0.15 : 1);
        y -= Math.sin(Math.min(1, k * 3) * Math.PI) * 10;
        rot = Math.sin(k * Math.PI * 10) * 0.16 * (k < 0.8 ? 1 : 0);
        roar = Math.floor(k * 12) % 2 ? 1 : 0;
      } else if (kind === 'headbutt') {
        // Rock back, then charge in head down.
        if (k < 0.35) { x -= f * 14 * (k / 0.35); rot = -f * 0.18 * (k / 0.35); }
        else if (k < 0.6) { const q = (k - 0.35) / 0.25; x += f * lerp(-14, 34, q); rot = f * lerp(-0.18, 0.4, q); }
        else { const q = (k - 0.6) / 0.4; x += f * 34 * (1 - q); rot = f * 0.4 * (1 - q); }
      } else {
        // Spin round so the tail sweeps through, then back.
        if (k > 0.15 && k < 0.75) flip = !flip;
        x -= f * Math.sin(k * Math.PI) * 10;
        y -= Math.sin(k * Math.PI) * 8;
        arc = k > 0.2 && k < 0.8 ? 1 - Math.abs(k - 0.5) / 0.3 : 0;
      }
    }
    if (arc > 0) {
      // Whoosh lines where the tail swings.
      c.strokeStyle = `rgba(255,255,255,${arc * 0.9})`; c.lineWidth = 5; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(b.x, b.y - 30, 50 + i * 12, Math.PI * 0.75, Math.PI * 1.25); c.stroke(); c.beginPath(); c.arc(b.x, b.y - 30, 50 + i * 12, -Math.PI * 0.25, Math.PI * 0.25); c.stroke(); }
    }
    c.save(); c.translate(x, y); c.rotate(rot);
    drawDino(c, 0, 0, 0.56, this.type, { t: this.t, walk, flip, roar, flap: this.flap });
    c.restore();
  },
};

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
