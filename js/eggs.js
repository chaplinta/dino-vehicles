// Hidden surprises (Easter eggs). Not explained in the game; they're for finding.
//  Earth: roar 5 times fast for shooting stars; tap the sun 3 times; a golden egg at the very
//         bottom under the farm hatches a pet; Nessie sleeps on the sea floor.
//  Moon:  dig deep to find the cheese core; tap the flying saucer.
const Eggs = {
  found: {},          // saved: which one-off rewards are claimed
  roars: [], showerT: 0, sunTaps: 0, sunCool: false,
  pet: null,          // saved: the hatched baby dino's type

  save() { return { found: this.found, pet: this.pet && this.pet.type }; },
  load(e) {
    this.found = (e && e.found) || {};
    this.pet = null;
    if (e && e.pet) this.hatch(e.pet, true);
  },
  reward(key, stars, say, banner) {
    if (this.found[key]) return false;
    this.found[key] = true;
    Game.addStars(stars);
    Game.popupStar(Player.cx, Player.cy - 60);
    Hud.celebrate(banner || 'Surprise!');
    Sound.say(say);
    return true;
  },

  // Roar 5 times within 4 seconds: shooting stars rain down.
  onRoar() {
    this.roars = this.roars.filter(t => Game.t - t < 4).concat(Game.t);
    if (this.roars.length >= 5 && this.showerT <= 0) {
      this.roars = [];
      this.showerT = 20;
      Pickups.shower(Player.cx, Game.cam.y - 40, 16);
      Sound.fanfare();
      Sound.say('Shooting stars! Catch them!');
    }
  },
  // Tap the sun 3 times: sunglasses.
  tapSun() {
    this.sunTaps++;
    Sound.tone(600 + this.sunTaps * 150, 0.12, 'triangle', 0.12);
    if (this.sunTaps >= 3) {
      this.sunTaps = 0;
      this.sunCool = !this.sunCool;
      if (this.sunCool) { Sound.say('Too sunny! Cool shades!'); this.reward('sun', 2, 'Too sunny! Cool shades!', 'Cool!'); }
    }
  },
  // Something special was dug up.
  onDig(tx, ty, id) {
    if (id === T.GOLDEGG) this.hatch(pick(DINO_KEYS));
    if (id === T.CHEESE && Game.onMoon && ty >= 58) this.reward('cheese', 5, 'The Moon really IS made of cheese!', 'Cheese!');
  },
  hatch(type, quiet) {
    const b = makeBody(Player.body.x - Player.facing * 40, Player.body.y - 10, 20, 34);
    this.pet = { type, body: b, t: 0, walk: 0, facing: 1, heartT: quiet ? 0 : 4 };
    if (!quiet) {
      Fx.burst(b.x, b.y - 20, 30, { speed: 220, life: 1.2, r: 10, color: ['#ffd43b', '#fff3bf', '#ffffff'], shape: 'star' });
      Hud.celebrate('A baby dino!');
      Sound.squeak();
      setTimeout(() => Sound.say('The golden egg hatched! A baby dino will follow you everywhere!'), 600);
      Save.write();
    }
  },

  update(dt) {
    this.showerT = Math.max(0, this.showerT - dt);
    this.updatePet(dt);
    if (Game.onMoon) this.updateSaucer(dt);
    else this.updateNessie(dt);
  },

  // The pet follows the player; while the player drives it rides along out of sight.
  updatePet(dt) {
    const p = this.pet;
    if (!p) return;
    p.t += dt; p.heartT = Math.max(0, p.heartT - dt);
    const b = p.body;
    if (Player.vehicle) { b.x = Player.cx; b.y = Player.vehicle.body.y; b.vx = b.vy = 0; p.hidden = true; return; }
    if (p.hidden || dist(b.x, b.y, Player.body.x, Player.body.y) > 700) {
      p.hidden = false; b.x = Player.body.x - Player.facing * 40; b.y = Player.body.y - 4; b.vx = b.vy = 0;
      for (let k = 0; k < 10 && bodySolidAt(b, b.x, b.y); k++) b.y -= TS;
    }
    const target = Player.body.x - Player.facing * 50, dx = target - b.x;
    const dir = Math.abs(dx) > 24 ? Math.sign(dx) : 0;
    b.vx = lerp(b.vx, dir * Math.min(260, Math.abs(dx) * 3), Math.min(1, dt * 8));
    if (dir) p.facing = dir;
    moveBody(b, dt, { step: 1 });
    if (b.hitWall && b.onGround) b.vy = -560;
    if (b.onGround && Player.body.y < b.y - TS * 1.5 && Math.abs(dx) < 120) b.vy = -560;   // keep up with jumps
    p.walk = b.onGround && Math.abs(b.vx) > 15 ? p.walk + dt * Math.abs(b.vx) * 0.07 : 0;
    if (Player.roarT > 0.85) { p.heartT = 1.5; if (b.onGround) b.vy = -320; }
  },
  drawPet(c) {
    const p = this.pet;
    if (!p || p.hidden) return;
    const b = p.body;
    drawDino(c, b.x, b.y + 1, 0.34, p.type, { t: p.t, walk: p.walk, flip: p.facing < 0, roar: Player.roarT > 0.3 ? 1 : 0 });
    if (p.heartT > 0) bubble(c, b.x, b.y - 36, '❤️', p.t);
  },

  // Nessie wakes when you come close (swimming or in a boat/submarine), pops up and waves.
  updateNessie(dt) {
    const n = World.props.find(p => p.type === 'nessie');
    if (!n) return;
    const nx = n.x * TS, ny = n.y * TS;
    const near = Math.abs(Player.cx - nx) < 160 && Player.cy > SEA_LEVEL * TS - 120;
    if (near && !n.awakeT) {
      n.awakeT = 12;
      Sound.tone(110, 1.2, 'sine', 0.15, 160);
      this.reward('nessie', 5, 'Hello! I am Nessie, the friendly sea monster!', 'Nessie!');
    }
    n.awakeT = Math.max(0, (n.awakeT || 0) - dt);
    n.rise = lerp(n.rise || 0, n.awakeT > 0 ? 1 : 0, Math.min(1, dt * 1.5));
  },
  // Tap the parked saucer: it takes off, loops, sprinkles stars, and lands again.
  tapSaucer(wx, wy) {
    const s = World.props.find(p => p.type === 'saucer');
    if (!s || s.flyT > 0 || Math.abs(wx - s.x * TS) > 90 || Math.abs(wy - (s.y * TS - 30)) > 70) return false;
    s.flyT = 8; s.dropped = false;
    Sound.squeak(); Sound.tone(300, 1.5, 'sine', 0.08, 1200);
    Sound.say('Whee! The flying saucer!');
    return true;
  },
  updateSaucer(dt) {
    const s = World.props.find(p => p.type === 'saucer');
    if (!s || !(s.flyT > 0)) { if (s) { s.fx = 0; s.fy = 0; } return; }
    s.flyT -= dt;
    const k = 8 - s.flyT;   // seconds into the flight
    const up = Math.min(1, k / 1.5) * Math.min(1, Math.max(0, s.flyT) / 1.5);
    s.fy = -up * 150 + Math.sin(k * 3) * 20 * up;
    s.fx = Math.sin(k * 1.4) * 200 * up;
    if (k > 3 && !s.dropped) { s.dropped = true; Pickups.shower(s.x * TS + s.fx, s.y * TS + s.fy, 6); this.reward('saucer', 2, 'The aliens left you stars!', 'Wow!'); }
  },
};
