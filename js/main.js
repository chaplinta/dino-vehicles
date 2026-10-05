// Game loop, camera, modes and the world scene.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let viewK = 1;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = Math.min(innerWidth / W, innerHeight / H);
  const wrap = document.getElementById('wrap');
  wrap.style.width = W * scale + 'px'; wrap.style.height = H * scale + 'px';
  wrap.style.setProperty('--s', scale);
  canvas.style.width = W * scale + 'px'; canvas.style.height = H * scale + 'px';
  canvas.width = Math.round(W * scale * dpr); canvas.height = Math.round(H * scale * dpr);
  viewK = scale * dpr;
}
addEventListener('resize', resize);

// Sky, sun, clouds and parallax hills. Darkens as the camera goes underground.
function drawBackdrop(c, camX, camY, t) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#6cc6ff'); g.addColorStop(1, '#d4f1ff');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const surfY = SURF * TS - camY;   // screen y of normal ground level
  const off = surfY - 440;          // shift scenery with vertical camera
  drawSun(c, W - 260, 110 + off * 0.1, t);
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
  if (y < -40 || y > H + 300) return;
  const x0 = Math.floor(camX / 24) * 24;
  // Bridge pylons over the sea.
  for (let tx = SEA_X0 - 2; tx <= SEA_X1 + 2; tx += 6) {
    const px = tx * TS - camX;
    if (px < -60 || px > W + 60) continue;
    c.fillStyle = '#9aa0aa'; c.fillRect(px - 10, y, 20, 12 * TS);
    c.fillStyle = 'rgba(43,34,51,0.6)'; c.fillRect(px - 10, y, 3, 12 * TS); c.fillRect(px + 7, y, 3, 12 * TS);
  }
  c.fillStyle = '#7a4a24';
  for (let x = x0; x < camX + W + 24; x += 24) c.fillRect(x - camX, y - 6, 14, 6);
  c.fillStyle = '#5b6170'; c.fillRect(0, y - 11, W, 5);
}

function drawProps(c, camX, camY) {
  for (const p of World.props) {
    const sx = p.x * TS - camX;
    if (p.type === 'sign') {
      const sy = p.y * TS - camY;
      if (sx < -100 || sx > W + 100) continue;
      const icon = { fire: '🚒', hospital: '🏥', police: '🚓', barn: '🐄', site: '🚧' }[p.kind] || '⭐';
      const col = { fire: '#e8262b', hospital: '#ffffff', police: '#3b5bdb', barn: '#c0392b', site: '#ffd43b' }[p.kind];
      if (p.kind === 'site') { limb(c, [sx, sy, sx, sy - 70], 6, '#777'); }
      rbox(c, sx - 34, sy - (p.kind === 'site' ? 110 : 64), 68, 52, 12, col, 4);
      c.font = `34px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(icon, sx, sy - (p.kind === 'site' ? 83 : 37));
    } else if (p.type === 'station') {
      const sy = TRACK_Y - camY;
      if (sx < -150 || sx > W + 150) continue;
      limb(c, [sx - 60, sy - 12, sx - 60, sy - 110], 6, '#777');
      limb(c, [sx + 60, sy - 12, sx + 60, sy - 110], 6, '#777');
      poly(c, [sx - 80, sy - 110, sx + 80, sy - 110, sx + 64, sy - 132, sx - 64, sy - 132], '#ff922b', 4);
      rbox(c, sx - 26, sy - 104, 52, 34, 8, '#fff', 3);
      c.font = `24px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('🚂', sx, sy - 86);
    } else if (p.type === 'tower') {
      const sy = p.y * TS - camY;
      if (sx < -200 || sx > W + 300) continue;
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
    if (typeof Vehicles !== 'undefined') Vehicles.spawnDefaults();
    if (typeof NPCs !== 'undefined') NPCs.spawnDefaults();
    if (typeof Jobs !== 'undefined') Jobs.reset();
    this.worldReady = true;
    this.snapCamera();
  },
  loadWorld(s) {
    World.generate(s.seed);
    World.applyDiff(s.diff || []);
    Render.clear();
    this.stars = s.stars || 0;
    const p = s.player || {};
    Player.init(DINO_TYPES[p.type] ? p.type : 'rex', p.x || 12 * TS, p.y || SURF * TS);
    if (typeof Vehicles !== 'undefined') { if (s.vehicles) Vehicles.load(s.vehicles); else Vehicles.spawnDefaults(); }
    if (typeof NPCs !== 'undefined') NPCs.spawnDefaults();
    if (typeof Jobs !== 'undefined') Jobs.reset();
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
  },
  configurePlay() {
    const v = Player.vehicle;
    if (v) UI.configure({ dirs: v.dirs || 'lr', action: v.icon, roar: true, enter: true, whistle: false, palette: !!v.builds });
    else UI.configure({ dirs: DINO_TYPES[Player.type].flies ? 'all' : 'all', action: '⛏️', roar: true, enter: false, whistle: typeof Vehicles !== 'undefined', palette: true });
    if (!v) UI.buildPalette(BUILD_BLOCKS, Player.block, i => { Player.block = i; UI.markPalette(i); Sound.click(); });
    if (v && v.builds) UI.buildPalette(BUILD_BLOCKS, Player.block, i => { Player.block = i; UI.markPalette(i); Sound.click(); });
    if (!v) UI.setEnter(false);
  },
  home() {
    if (this.mode === 'play') { if (this.overlay) { this.overlay = null; return; } Save.write(); this.setMode('pick'); }
    else if (this.mode === 'pick') this.setMode('title');
  },
  toggleMute() {
    Sound.muted = !Sound.muted;
    document.getElementById('btn-mute').textContent = Sound.muted ? '🔇' : '🔊';
    if (Sound.muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  },
  addStars(n, wx, wy) {
    this.stars += n;
    Hud.starBump = 1;
  },
  popup(id, wx, wy) { Hud.popups.push({ id, sx: wx - this.cam.x, sy: wy - this.cam.y, t: 0 }); },
  celebrate(text, say) { Hud.celebrate(text); Sound.say(say || text); },
  bodies() {
    const list = [Player.body];
    if (typeof Vehicles !== 'undefined') for (const v of Vehicles.list) list.push(v.body);
    if (typeof NPCs !== 'undefined') for (const n of NPCs.list) if (!n.vehicle) list.push(n.body);
    return list;
  },

  tap(x, y) {
    if (this.mode !== 'play') { this.modes[this.mode].tap(x, y); return; }
    if (this.overlay && this.overlay.tap(x, y)) return;
    const wx = x + this.cam.x, wy = y + this.cam.y;
    Player.tapTile(Math.floor(wx / TS), Math.floor(wy / TS));
  },

  snapCamera() { this.updateCamera(1, true); },
  updateCamera(dt, snap) {
    const v = Player.vehicle;
    const look = v ? v.look || 140 : 90;
    const facing = v ? v.facing : Player.facing;
    const tx = Player.cx + facing * look - W / 2;
    const ty = Player.cy - H * 0.6 + (v && v.camY ? v.camY : 0);
    const k = snap ? 1 : Math.min(1, dt * 4);
    this.cam.x = clamp(lerp(this.cam.x, tx, k), 0, WORLD_W * TS - W);
    this.cam.y = clamp(lerp(this.cam.y, ty, k), -400, WORLD_H * TS - H);
  },

  loop(ts) {
    const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
    this.last = ts;
    this.t += dt;
    this.update(dt);
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
    if (this.overlay) { this.overlay.update(dt); }
    else {
      Player.update(dt);
      if (typeof Vehicles !== 'undefined') Vehicles.update(dt);
    }
    if (typeof NPCs !== 'undefined') NPCs.update(dt);
    if (typeof Jobs !== 'undefined') Jobs.update(dt);
    if (typeof Fire !== 'undefined') Fire.update(dt);
    Sim.update(dt, this.cam.x, this.cam.y);
    Fx.update(dt);
    this.updateCamera(dt);
    Save.update(dt);
  },
  draw(c) {
    if (this.mode !== 'play') { this.modes[this.mode].draw(c); Hud.draw(c); return; }
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    drawBackdrop(c, cx, cy, this.t);
    drawTrack(c, cx, cy);
    if (typeof Train !== 'undefined') Train.drawAll(c, cx, cy);
    Render.draw(c, cx, cy);
    drawProps(c, cx, cy);
    c.save(); c.translate(-cx, -cy);
    if (typeof Fire !== 'undefined') Fire.draw(c);
    if (typeof NPCs !== 'undefined') NPCs.draw(c);
    if (typeof Vehicles !== 'undefined') Vehicles.draw(c);
    Player.draw(c);
    if (typeof Jobs !== 'undefined') Jobs.drawWorld(c);
    Fx.draw(c);
    this.drawDigHint(c);
    c.restore();
    // Underground gloom.
    const depth = (cy + H / 2) / TS - SURF - 6;
    if (depth > 0) { c.fillStyle = `rgba(10,5,20,${Math.min(0.35, depth * 0.03)})`; c.fillRect(0, 0, W, H); }
    if (typeof Jobs !== 'undefined') Jobs.drawHud(c);
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
