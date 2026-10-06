// The player's dinosaur on foot. In a vehicle, the vehicle takes over movement.
const TREASURE_INFO = {
  [T.BONE]: { say: 'A dinosaur bone!', stars: 1 },
  [T.EGG]: { say: 'An egg!', stars: 1 },
  [T.GEM]: { say: 'A shiny gem!', stars: 2 },
  [T.FOSSIL]: { say: 'A fossil!', stars: 2 },
};
const DUST = {
  [T.GRASS]: ['#5cc84a', '#a0662e'], [T.DIRT]: ['#a0662e', '#8a5524'], [T.SAND]: ['#f2d48a', '#e0bd6c'],
  [T.STONE]: ['#8f939c', '#a7abb3'], [T.BRICK]: ['#d9534f', '#e8e0d4'], [T.WOOD]: ['#c98a4b', '#a86d35'],
  [T.GLASS]: ['#bdf3ff', '#ffffff'], [T.LEAVES]: ['#3fae49', '#5cc84a'], [T.ROOF]: ['#4263eb', '#364fc7'],
  [T.CONCRETE]: ['#c9cdd4', '#b3b8c0'], [T.ROAD]: ['#4a4a55', '#ffd43b'],
};

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
    if (typeof NPCs !== 'undefined') NPCs.heardRoar(this.cx, this.cy);
  },

  update(dt) {
    this.t += dt;
    this.roarT = Math.max(0, this.roarT - dt);
    this.digAnim = Math.max(0, this.digAnim - dt * 4);
    this.placeCool = Math.max(0, this.placeCool - dt);
    this.attackT = Math.max(0, this.attackT - dt);
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
    if (!flier && Input.held.up && wall && !b.onGround && b.vy > -260) { b.vy = -260; this.climbing = true; } else this.climbing = false;

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
        const need = TILES[World.get(tgt[0], tgt[1])].hard >= 2 ? 0.45 : 0.18;
        if (this.digT >= need) {
          const id = World.dig(tgt[0], tgt[1]);
          if (id >= 0) { Sound.dig(); digEffects(tgt[0], tgt[1], id); }
          if (tgt[1] * TS >= b.y - 1) this.slideTo = tgt[0] * TS + TS / 2;   // dug below: drop into the hole
          this.digT = 0; this.digKey = -1;
        }
      }
    } else { this.digT = 0; this.digKey = -1; }
  },

  attack() {
    if (this.attackCool > 0) return;
    const kind = DINO_TYPES[this.type].attack;
    this.attackT = 0.35; this.attackCool = 0.4;
    if (kind === 'bite') Sound.chomp(); else if (kind === 'tail') Sound.whoosh(); else Sound.bonk();
    for (const n of NPCs.inReach(this.body.x, this.body.y, this.facing, kind)) NPCs.hit(n, this.body.x);
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
    if (this.attackT > 0) {
      const k = 1 - this.attackT / 0.35, swing = Math.sin(k * Math.PI);   // 0 -> 1 -> 0
      const kind = DINO_TYPES[this.type].attack;
      if (kind === 'bite') { x += this.facing * swing * 14; roar = Math.floor(k * 6) % 2 ? 1 : 0; }
      else if (kind === 'headbutt') { x += this.facing * swing * 22; rot = this.facing * swing * 0.3; }
      else { if (k > 0.2 && k < 0.8) flip = !flip; x -= this.facing * swing * 6; }
    }
    c.save(); c.translate(x, b.y + 1); c.rotate(rot);
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
