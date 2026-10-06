// Game loop, camera, modes and the world scene.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let viewK = 1;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.visualViewport ? visualViewport.width : innerWidth;
  const vh = window.visualViewport ? visualViewport.height : innerHeight;
  W = Math.round(clamp(H * vw / vh, 960, 1280));   // show more world on wide phones instead of black bars
  const scale = Math.min(vw / W, vh / H);
  const wrap = document.getElementById('wrap');
  wrap.style.width = W * scale + 'px'; wrap.style.height = H * scale + 'px';
  // Buttons grow a bit on small phone screens so thumbs can hit them.
  const btn = scale * (H * scale < 440 ? 1.25 : 1);
  document.documentElement.style.setProperty('--s', btn);
  canvas.style.width = W * scale + 'px'; canvas.style.height = H * scale + 'px';
  canvas.width = Math.round(W * scale * dpr); canvas.height = Math.round(H * scale * dpr);
  viewK = scale * dpr;
}
addEventListener('resize', resize);
if (window.visualViewport) visualViewport.addEventListener('resize', resize);
const portraitPhone = matchMedia('(orientation: portrait) and (pointer: coarse)');

// Sky, sun, clouds and parallax hills. Darkens as the camera goes underground.
function drawBackdrop(c, camX, camY, t, zoom = 1) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#6cc6ff'); g.addColorStop(1, '#d4f1ff');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const surfY = (SURF * TS - camY) * zoom;   // screen y of normal ground level
  const off = surfY - 440;          // shift scenery with vertical camera
  drawSun(c, 170, 130 + off * 0.1, t);
  for (let i = 0; i < 6; i++) {
    const x = ((i * 260 + 40 - camX * 0.08 - t * 6) % (W + 300) + W + 300) % (W + 300) - 150;
    drawCloud(c, x, 70 + (i * 37 % 90) + off * 0.15, 0.8 + (i % 3) * 0.2);
  }
  drawHills(c, camX, 0.15, 330 + off * 0.3, 40, '#a5d8ff', 1.3);
  drawHills(c, camX, 0.3, 380 + off * 0.5, 35, '#8fd18a', 0.2);
  drawHills(c, camX, 0.5, 420 + off * 0.7, 25, '#6cbf5c', 2.1);
}

// Background train track. Drawn behind tiles, so mountains become tunnels.
const TRACK_Y = SURF * TS;
function drawTrack(c, camX, camY) {
  const y = TRACK_Y - camY;
  if (y < -40 || y > Game.viewH + 300) return;
  const x0 = Math.floor(camX / 24) * 24;
  // Bridge pylons over the sea.
  for (let tx = SEA_X0 - 2; tx <= SEA_X1 + 2; tx += 6) {
    const px = tx * TS - camX;
    if (px < -60 || px > Game.viewW + 60) continue;
    c.fillStyle = '#9aa0aa'; c.fillRect(px - 10, y, 20, 12 * TS);
    c.fillStyle = 'rgba(43,34,51,0.6)'; c.fillRect(px - 10, y, 3, 12 * TS); c.fillRect(px + 7, y, 3, 12 * TS);
  }
  c.fillStyle = '#7a4a24';
  for (let x = x0; x < camX + Game.viewW + 24; x += 24) c.fillRect(x - camX, y - 6, 14, 6);
  c.fillStyle = '#5b6170'; c.fillRect(0, y - 11, Game.viewW, 5);
}

function drawProps(c, camX, camY) {
  for (const p of World.props) {
    const sx = p.x * TS - camX;
    if (p.type === 'sign') {
      const sy = p.y * TS - camY;
      if (sx < -100 || sx > Game.viewW + 100) continue;
      const icon = { fire: '🚒', hospital: '🏥', police: '🚓', barn: '🐄', site: '🚧' }[p.kind] || '⭐';
      const col = { fire: '#e8262b', hospital: '#ffffff', police: '#3b5bdb', barn: '#c0392b', site: '#ffd43b' }[p.kind];
      if (p.kind === 'site') { limb(c, [sx, sy, sx, sy - 70], 6, '#777'); }
      rbox(c, sx - 34, sy - (p.kind === 'site' ? 110 : 64), 68, 52, 12, col, 4);
      c.font = `34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(icon, sx, sy - (p.kind === 'site' ? 83 : 37));
    } else if (p.type === 'station') {
      const sy = TRACK_Y - camY;
      if (sx < -150 || sx > Game.viewW + 150) continue;
      limb(c, [sx - 60, sy - 12, sx - 60, sy - 110], 6, '#777');
      limb(c, [sx + 60, sy - 12, sx + 60, sy - 110], 6, '#777');
      poly(c, [sx - 80, sy - 110, sx + 80, sy - 110, sx + 64, sy - 132, sx - 64, sy - 132], '#ff922b', 4);
      rbox(c, sx - 26, sy - 104, 52, 34, 8, '#fff', 3);
      c.font = `24px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('🚂', sx, sy - 86);
    } else if (p.type === 'bin') {
      const sy = p.y * TS - camY;
      if (sx < -60 || sx > W + 60) continue;
      rbox(c, sx - 14, sy - 40, 28, 40, 4, '#2f9e44', 3);
      rbox(c, sx - 17, sy - 46, 34, 8, 3, '#2b8a3e', 3);
      if (p.full) {
        ell(c, sx - 6, sy - 48, 7, 5, '#ffd43b', 2); ell(c, sx + 6, sy - 50, 6, 5, '#f783ac', 2);
        const fx = Math.sin(Game.t * 7) * 10, fy = Math.cos(Game.t * 9) * 6;
        ell(c, sx + fx, sy - 70 + fy, 3, 3, OUT, 0);
      }
    } else if (p.type === 'chest') {
      const sy = p.y * TS - camY;
      if (sx < -60 || sx > W + 60) continue;
      rbox(c, sx - 22, sy - 26, 44, 26, 4, '#c98a4b', 3);
      if (p.open) { poly(c, [sx - 22, sy - 26, sx + 22, sy - 26, sx + 26, sy - 46, sx - 18, sy - 44], '#a86d35', 3); }
      else { rbox(c, sx - 24, sy - 36, 48, 14, 7, '#a86d35', 3); ell(c, sx, sy - 24, 5, 5, '#ffd43b', 2);
        if (Math.floor(Game.t * 2) % 3 === 0) drawStar(c, sx + 18, sy - 40, 6, Game.t, '#fff', 0); }
    } else if (p.type === 'tower') {
      const sy = p.y * TS - camY;
      if (sx < -200 || sx > Game.viewW + 300) continue;
      c.strokeStyle = '#e8262b'; c.lineWidth = 6;
      rbox(c, sx - 20, sy - 380, 40, 380, 4, null, 4);
      c.strokeStyle = '#e8262b'; c.lineWidth = 5;
      for (let i = 0; i < 9; i++) {
        c.beginPath(); c.moveTo(sx - 18, sy - i * 42); c.lineTo(sx + 18, sy - i * 42 - 42); c.stroke();
        c.beginPath(); c.moveTo(sx + 18, sy - i * 42); c.lineTo(sx - 18, sy - i * 42 - 42); c.stroke();
      }
      rbox(c, sx - 30, sy - 396, 60, 18, 6, '#ffd43b', 4);
    }
  }
}

const Game = {
  mode: 'title', t: 0, stars: 0, worldReady: false,
  cam: { x: 0, y: 0 },
  zoom: 1,
  get viewW() { return W / this.zoom; },
  get viewH() { return H / this.zoom; },
  modes: {},

  init() {
    resize();
    UI.init();
    this.modes = { title: Title, pick: Picker };
    const save = Save.read();
    if (save && save.v === 1) this.loadWorld(save);
    else this.newWorld();
    this.setMode('title');
    requestAnimationFrame(ts => this.loop(ts));
  },
  newWorld() {
    World.generate((Math.random() * 1e9) | 0);
    Render.clear();
    this.stars = 0;
    Player.init(Player.type || 'rex', 12 * TS, World.surfaceAt(12) * TS);
    Vehicles.spawnDefaults();
    Fish.reset(); Fire.cells.clear();
    NPCs.spawnDefaults();
    Jobs.reset();
    this.worldReady = true;
    this.snapCamera();
  },
  // New world but keep stars and unlocks (title screen hold button).
  resetWorld() {
    const stars = this.stars;
    if (Player.vehicle) { Player.vehicle.driver = null; Player.vehicle = null; }
    this.overlay = null;
    this.newWorld();
    this.stars = stars;
    if (this.mode === 'play') this.configurePlay();
    Save.write();
    Hud.celebrate('New world!');
    Sound.say('A brand new world!');
  },
  resetHold: null,
  updateResetHold(dt) {
    if (Input.pressed.reset) { this.resetHold = 0; this.resetKey = true; }
    if (this.resetHold !== null && this.resetKey && !Input.held.reset) this.resetHold = null;
    const btn = document.getElementById('btn-reset');
    if (this.resetHold === null) { btn.style.setProperty('--p', 0); return; }
    const before = this.resetHold;
    this.resetHold += dt;
    if (Math.floor(this.resetHold * 4) !== Math.floor(before * 4)) Sound.tone(300 + this.resetHold * 200, 0.08, 'triangle', 0.08);
    btn.style.setProperty('--p', Math.min(1, this.resetHold / 2));
    if (this.resetHold >= 2) { this.resetHold = null; btn.style.setProperty('--p', 0); this.resetWorld(); }
  },
  loadWorld(s) {
    World.generate(s.seed);
    World.applyDiff(s.diff || []);
    Render.clear();
    this.stars = s.stars || 0;
    const p = s.player || {};
    Player.init(DINO_TYPES[p.type] ? p.type : 'rex', p.x || 12 * TS, p.y || SURF * TS);
    if (s.vehicles) Vehicles.load(s.vehicles); else Vehicles.spawnDefaults();
    Fish.reset(); Fire.cells.clear();
    NPCs.spawnDefaults();
    Jobs.reset();
    if (this.loadExtra) this.loadExtra(s.extra);
    this.worldReady = true;
    this.snapCamera();
  },
  setMode(m) {
    this.mode = m;
    if (m === 'play') this.configurePlay();
    else this.modes[m].enter();
  },
  startPlay(type) {
    if (Player.vehicle && Player.vehicle.exit) Player.vehicle.exit(true);
    Player.type = type;
    this.setMode('play');
    this.snapCamera();
    Save.write();
    if (!this.hinted) {
      this.hinted = true;
      setTimeout(() => Sound.say('Walk with the arrows. Press the yellow button to dig. Press the horn to call a vehicle!'), 1800);
    }
  },
  configurePlay() {
    const v = Player.vehicle;
    if (v) UI.configure({ dirs: v.dirs || 'lr', action: v.icon, roar: true, roarIcon: '📢', reset: true, enter: true, whistle: false, palette: !!v.builds });
    else UI.configure({ dirs: DINO_TYPES[Player.type].flies ? 'all' : 'all', action: '⛏️', roar: true, enter: false, whistle: true, palette: true, reset: true });
    if (!v) UI.buildPalette(BUILD_BLOCKS, Player.block, i => { Player.block = i; UI.markPalette(i); Sound.click(); });
    if (v && v.builds) UI.buildPalette(BUILD_BLOCKS, Player.block, i => { Player.block = i; UI.markPalette(i); Sound.click(); });
    if (!v) UI.setEnter(false);
    Player.actIcon = '';
  },
  home() {
    if (this.mode === 'play') { if (this.overlay) { if (this.overlay.close) this.overlay.close(); else this.overlay = null; return; } Save.write(); this.setMode('pick'); }
    else if (this.mode === 'pick') this.setMode('title');
  },
  toggleMute() {
    Sound.muted = !Sound.muted;
    document.getElementById('btn-mute').textContent = Sound.muted ? '🔇' : '🔊';
    if (Sound.muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  },
  addStars(n) {
    const before = this.stars;
    this.stars += n;
    Hud.starBump = 1;
    for (const k of VEHICLE_ORDER) {
      const def = VEHICLE_DEFS[k];
      if (def && def.unlock > before && def.unlock <= this.stars) {
        setTimeout(() => {
          Hud.celebrate('New: ' + def.name + '!');
          Sound.say(`You can now drive the ${def.name}! Press the whistle to call it.`);
        }, 2600);
      }
    }
  },
  popupStar(wx, wy) { Hud.popups.push({ id: 'star', sx: (wx - this.cam.x) * this.zoom, sy: (wy - this.cam.y) * this.zoom, t: 0 }); Hud.starBump = 1; },
  popup(id, wx, wy) { Hud.popups.push({ id, sx: (wx - this.cam.x) * this.zoom, sy: (wy - this.cam.y) * this.zoom, t: 0 }); },
  celebrate(text, say) { Hud.celebrate(text); Sound.say(say || text); },
  bodies() {
    const list = Player.vehicle ? [] : [Player.body];
    for (const v of Vehicles.list) list.push(v.body);
    for (const n of NPCs.list) if (!n.vehicle && !n.ride) list.push(n.body);
    return list;
  },

  tap(x, y) {
    if (this.mode !== 'play') { this.modes[this.mode].tap(x, y); return; }
    if (this.overlay && this.overlay.tap(x, y)) return;
    if (Jobs.tap(x, y)) return;
    const wx = x / this.zoom + this.cam.x, wy = y / this.zoom + this.cam.y;
    if (!Player.vehicle) {
      const pb = Player.body;
      const dino = NPCs.list.find(n => !n.vehicle && !n.ride && Math.abs(n.body.x - wx) < 30 && wy > n.body.y - n.body.h - 20 && wy < n.body.y + 6);
      if (dino && Math.abs(dino.body.x - pb.x) < 110 && Math.abs(dino.body.y - pb.y) < 80) {
        Player.facing = dino.body.x < pb.x ? -1 : 1; Player.attack(); return;
      }
      const v = Vehicles.at(wx, wy);
      if (v && !v.driver && dist(v.body.x, v.body.y, Player.body.x, Player.body.y) < 220) { Vehicles.enter(Player, v); return; }
    }
    Player.tapTile(Math.floor(wx / TS), Math.floor(wy / TS));
  },

  snapCamera() { this.updateCamera(1, true); },
  updateCamera(dt, snap) {
    const v = Player.vehicle;
    const look = v ? v.look || 140 : 90;
    const facing = v ? v.facing : Player.facing;
    // Zoom out when flying high, so the ground stays in view.
    let target = 1, ground = null;
    const flying = v ? (v.kind === 'plane' && v.s.flying) || v.kind === 'helicopter'
      : DINO_TYPES[Player.type].flies && !Player.body.onGround;
    if (flying) {
      const y = v ? v.body.y : Player.body.y;
      ground = World.groundBelow(Math.floor(Player.cx / TS), Math.max(0, Math.floor(y / TS))) * TS;
      target = clamp(H * 0.45 / (ground - y + 60), 0.4, 1);
    }
    this.zoom = snap ? target : lerp(this.zoom, target, Math.min(1, dt * 1.5));
    const tx = Player.cx + facing * look - this.viewW / 2;
    let ty = Player.cy - this.viewH * 0.6 + (v && v.camY ? v.camY : 0);
    // Flying: keep the ground near the bottom of the screen, flyer still in view.
    if (ground !== null) ty = Math.min(ground - this.viewH * 0.8, Player.cy - this.viewH * 0.3);
    const k = snap ? 1 : Math.min(1, dt * 4);
    this.cam.x = clamp(lerp(this.cam.x, tx, k), 0, Math.max(0, WORLD_W * TS - this.viewW));
    this.cam.y = clamp(lerp(this.cam.y, ty, k), -400, WORLD_H * TS - this.viewH);
  },

  loop(ts) {
    const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    this.t += dt;
    if (!portraitPhone.matches) this.update(dt);   // paused while the rotate prompt shows
    ctx.setTransform(viewK, 0, 0, viewK, 0, 0);
    this.draw(ctx);
    Input.endFrame();
    requestAnimationFrame(t => this.loop(t));
  },
  update(dt) {
    if (Input.pressed.mute) this.toggleMute();
    if (Input.pressed.home) this.home();
    Hud.update(dt);
    if (this.mode !== 'play') { this.modes[this.mode].update(dt); return; }
    this.updateResetHold(dt);
    if (this.overlay) { this.overlay.update(dt); }
    else {
      Player.update(dt);
      Vehicles.update(dt);
    }
    NPCs.update(dt);
    if (!this.overlay) Jobs.update(dt);
    Fire.update(dt);
    Fish.update(dt);
    Falling.update(dt);
    for (const p of World.props) if (p.type === 'bin' && !p.full && (p.refill -= dt) <= 0) p.full = true;
    Sim.update(dt, this.cam.x, this.cam.y);
    Fx.update(dt);
    this.updateCamera(dt);
    Save.update(dt);
  },
  draw(c) {
    if (this.mode !== 'play') { this.modes[this.mode].draw(c); Hud.draw(c); return; }
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    drawBackdrop(c, cx, cy, this.t, this.zoom);
    c.save();
    c.scale(this.zoom, this.zoom);   // world layer; zooms out when flying high
    drawTrack(c, cx, cy);
    c.save(); c.translate(-cx, -cy); Vehicles.drawBack(c); c.restore();
    Render.draw(c, cx, cy, this.viewW, this.viewH);
    drawProps(c, cx, cy);
    c.translate(-cx, -cy);
    Fish.draw(c);
    Fire.draw(c);
    Falling.draw(c);
    NPCs.draw(c);
    Vehicles.draw(c);
    Player.draw(c);
    Jobs.drawWorld(c);
    Fx.draw(c);
    this.drawDigHint(c);
    c.restore();
    // Underground gloom.
    const depth = (cy + this.viewH / 2) / TS - SURF - 6;
    if (depth > 0) { c.fillStyle = `rgba(10,5,20,${Math.min(0.35, depth * 0.03)})`; c.fillRect(0, 0, W, H); }
    Jobs.drawHud(c);
    if (this.overlay) this.overlay.draw(c);
    Hud.draw(c);
  },
  drawDigHint(c) {
    if (Player.vehicle || !Input.held.action) return;
    const tgt = Player.digTarget();
    if (!tgt) return;
    const x = tgt[0] * TS, y = tgt[1] * TS;
    c.lineWidth = 3; c.strokeStyle = '#fff'; c.strokeRect(x + 1, y + 1, TS - 2, TS - 2);
    const need = TILES[World.get(tgt[0], tgt[1])].hard >= 2 ? 0.45 : 0.18;
    const k = clamp(Player.digT / need, 0, 1);
    c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath();
    c.moveTo(x + 16, y + 4); c.lineTo(x + 16 - 10 * k, y + 16); c.lineTo(x + 18, y + 20 + 8 * k); c.stroke();
  },
};

Game.init();

// Offline play: cache the whole game (needs http/https; skipped when opened as a local file).
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // When an update arrives, reload once so it shows straight away (not on the launch after).
  const hadWorker = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadWorker || reloading) return;
    reloading = true;
    Save.write();
    location.reload();
  });
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
