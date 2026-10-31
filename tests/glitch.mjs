// Glitch hunt: mashes buttons like a kid with every dino and every vehicle, jumps between
// places mid-action, reloads mid-game and resizes the screen, checking after every frame for
// strange behaviour (NaN positions, stuck in walls, fallen out of the world, runaway effects,
// camera losing you, broken vehicle seats, slow frames).
// Run: node tests/glitch.mjs   (exits non-zero if anything is found)
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = pw.chromium || pw.default.chromium;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// The checker and the button-masher, installed in the page.
async function install() {
  await page.goto(url); await page.waitForTimeout(300);
  await page.evaluate(() => {
    Game.loop = () => {}; Sound.say = () => {};
    window.G = {
      issues: [], times: [], scene: '',
      solidT: 0, offT: 0, npcSolid: new Map(), keys: {},
      issue(kind, extra) {
        if (this.issues.filter(i => i.kind === kind && i.scene === this.scene).length >= 2) return;
        this.issues.push(Object.assign({ scene: this.scene, kind, x: Math.round(Player.cx / TS), y: Math.round(Player.cy / TS), veh: Player.vehicle && Player.vehicle.kind, away: Game.away }, extra));
      },
      key(k, on) { if (!!this.keys[k] !== on) { Input.set(k, on); this.keys[k] = on; } },
      release() { for (const k in this.keys) this.key(k, false); },
      frame(dt = 1 / 60) {
        const t0 = performance.now();
        Game.update(dt); Input.endFrame();
        ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx);
        ctx.getImageData(0, 0, 1, 1);   // make the canvas really draw this frame, like a screen would
        this.times.push(performance.now() - t0);
        this.check(dt);
      },
      run(n, mash) { for (let i = 0; i < n; i++) { if (mash) mash(i); this.frame(); } },
      check(dt) {
        if (Game.mode !== 'play') return;
        const lim = (World.limitW || WORLD_W) * TS, p = Player, b = p.body;
        const fin = v => Number.isFinite(v);
        if (![b.x, b.y, b.vx, b.vy, Game.cam.x, Game.cam.y, Game.zoom].every(fin)) this.issue('player or camera NaN');
        for (const v of Vehicles.list) {
          if (![v.body.x, v.body.y, v.body.vx, v.body.vy].every(fin)) this.issue('vehicle NaN', { k: v.kind });
          if (v.body.y > WORLD_H * TS + 50 || v.body.x < -10 || v.body.x > lim + 10) this.issue('vehicle out of world', { k: v.kind, vx: Math.round(v.body.x / TS), vy: Math.round(v.body.y / TS) });
          if (v.driver === p && p.vehicle !== v) this.issue('seat mix-up: vehicle thinks you drive it', { k: v.kind });
          if (v.driver && v.driver !== p && v.driver.vehicle !== v) this.issue('seat mix-up: dino driver', { k: v.kind });
        }
        if (p.vehicle && p.vehicle.driver !== p) this.issue('seat mix-up: you are in a vehicle with no driver', { k: p.vehicle.kind });
        if (p.vehicle && !Vehicles.list.includes(p.vehicle)) this.issue('in a vehicle that is not in the world', { k: p.vehicle.kind });
        for (const n of NPCs.list) {
          if (![n.body.x, n.body.y].every(fin)) { this.issue('dino NaN', { t: n.type }); continue; }
          if (n.body.y > WORLD_H * TS + 50 || n.body.x < -10 || n.body.x > lim + 10) this.issue('dino out of world', { t: n.type, nx: Math.round(n.body.x / TS) });
          if (!n.vehicle && !n.ride && !n.grabbedT && bodySolidAt(n.body, n.body.x, n.body.y)) {
            const s = (this.npcSolid.get(n) || 0) + dt; this.npcSolid.set(n, s);
            if (s > 2) this.issue('dino stuck in a wall', { t: n.type, nx: Math.round(n.body.x / TS), ny: Math.round(n.body.y / TS) });
          } else this.npcSolid.delete(n);
        }
        if (!p.vehicle) {
          if (b.y > WORLD_H * TS + 50 || b.x < -10 || b.x > lim + 10) this.issue('player out of world');
          if (bodySolidAt(b, b.x, b.y)) { this.solidT += dt; if (this.solidT > 0.6) this.issue('player stuck inside a wall'); } else this.solidT = 0;
        } else this.solidT = 0;
        // Camera keeps you in view (after a moment to catch up).
        if (!Game.overlay) {
          const sx = (p.cx - Game.cam.x) * Game.zoom, sy = (p.cy - Game.cam.y) * Game.zoom;
          if (sx < -40 || sx > W + 40 || sy < -200 || sy > H + 60) { this.offT += dt; if (this.offT > 1.5) this.issue('camera lost you', { sx: Math.round(sx), sy: Math.round(sy) }); } else this.offT = 0;
        } else this.offT = 0;
        if (Fx.list.length > 3000) this.issue('runaway effects', { n: Fx.list.length });
        if (Pow.list.length > 40) this.issue('runaway POWs', { n: Pow.list.length });
        if (Falling.list.length > 500) this.issue('runaway falling blocks', { n: Falling.list.length });
        if (NPCs.list.length > 70) this.issue('runaway dinos', { n: NPCs.list.length });
        if (Vehicles.list.length > 80) this.issue('runaway vehicles', { n: Vehicles.list.length });
        if (Game.away && Jobs.list.length && Jobs.list.some(j => j.t < 0.1)) this.issue('job started while away');
      },
      // A kid mashing: hold a direction for a while, jump, spam action, now and then something wild.
      masher(rng, opts = {}) {
        let dir = 0, until = 0;
        return i => {
          if (i >= until) { dir = rng() < 0.15 ? 0 : rng() < 0.5 ? -1 : 1; until = i + 20 + Math.floor(rng() * 120); }
          this.key('left', dir < 0); this.key('right', dir > 0);
          this.key('up', rng() < (opts.up || 0.08));
          this.key('down', rng() < (opts.down || 0.04));
          this.key('action', rng() < (opts.action || 0.3));
          if (rng() < 0.01) { Input.set('attack', true); Input.set('attack', false); }
          if (rng() < 0.005) { Input.set('lick', true); Input.set('lick', false); }
          if (rng() < 0.005) { Input.set('roar', true); Input.set('roar', false); }
          if (opts.enter && rng() < opts.enter) { Input.set('enter', true); Input.set('enter', false); }
          if (opts.whistle && rng() < opts.whistle) { Input.set('whistle', true); Input.set('whistle', false); }
          if (Game.overlay === Whistle && rng() < 0.3) { Input.set('home', true); Input.set('home', false); }
        };
      },
      fresh(type, seed) {
        Math.random = mulberry32(seed);
        Away.abandon(); Game.overlay = null; if (Player.vehicle) Vehicles.exit(Player);
        localStorage.clear(); Game.found = {}; Game.newWorld(); Game.startPlay(type); Jobs.t = 20;
        this.release(); this.solidT = 0; this.offT = 0; this.npcSolid.clear();
      },
    };
  });
}
await install();
const scene = async (name, fn, arg) => {
  const t0 = Date.now();
  try { await page.evaluate(([n, f, a]) => { G.scene = n; return (0, eval)('(' + f + ')')(a); }, [name, fn.toString(), arg]); }
  catch (e) { errors.push(`[${name}] ${e.message.split('\n')[0]}`); }
  console.log(`  ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
};

console.log('Glitch hunt:');
// 1. Every dino on foot, mashing everything, all over the world.
for (const type of await page.evaluate(() => DINO_KEYS)) {
  await scene(`on foot: ${type}`, type => {
    G.fresh(type, type.length * 977);
    const rng = mulberry32(type.length * 31);
    const m = G.masher(rng, { up: type === 'ptero' ? 0.3 : 0.08, enter: 0.004, whistle: 0.002 });
    for (let leg = 0; leg < 4; leg++) {
      // Drop in somewhere new each leg: farm, town, sea, mountains, speedway, bike park, jungle, volcano,
      // desert, canyon floor, snowy mountain, launch pad.
      const tx = [12, 150, 360, 470, 600, 690, 790, 880, 1000, 1025, 1150, 1230][(leg * 3 + type.length) % 12];
      if (!Player.vehicle && !Game.away) { Player.body.x = tx * TS + 16; Player.body.y = World.surfaceAt(tx) * TS - 0.01; Game.snapCamera(); }
      G.run(60 * 10, m);
    }
    G.release();
  }, type);
}

// 2. Every vehicle: get in, drive and mash every button, spam in and out.
await scene('every vehicle', () => {
  G.fresh('rex', 4242); Game.stars = 200; Vehicles.spawnMissing();
  const rng = mulberry32(99);
  const kinds = VEHICLE_ORDER.filter(k => VEHICLE_DEFS[k]).concat(['pirateship']);
  for (const k of kinds) {
    callVehicle(k);
    const v = Vehicles.list.find(v => v.kind === k && !v.driver);
    if (!v) { G.issue('could not call vehicle', { k }); continue; }
    if (Player.vehicle) Vehicles.exit(Player);
    Player.body.x = v.body.x; Player.body.y = v.body.y - 10; Vehicles.enter(Player, v);
    const m = G.masher(rng, { up: 0.2, down: 0.1, action: 0.25 });
    G.run(60 * 8, i => { if (Game.overlay) { Input.set('home', true); Input.set('home', false); } m(i); });
    G.release();
    for (let i = 0; i < 6; i++) { Input.set('enter', true); G.frame(); Input.set('enter', false); G.run(3); }   // in, out, in, out...
    if (Player.vehicle && Player.vehicle.def.canExit && !Player.vehicle.def.canExit(Player.vehicle)) G.run(60 * 6);
    if (Player.vehicle) Vehicles.exit(Player);
    if (Game.away === 'moon') Moon.leave(null, true); else if (Game.away) Away.abandon();
    G.run(30);
  }
});

// 3. Button spam: whistle menu, home and back, the new-world button mid-everything.
await scene('button spam', () => {
  G.fresh('tri', 777);
  for (let i = 0; i < 25; i++) { Input.set('whistle', true); G.frame(); Input.set('whistle', false); G.run(2); Input.set('home', true); G.frame(); Input.set('home', false); }
  for (let i = 0; i < 40; i++) { Input.set('attack', true); G.frame(); Input.set('attack', false); Input.set('lick', true); G.frame(); Input.set('lick', false); }
  for (let i = 0; i < 5; i++) { Game.home(); G.frame(); Game.startPlay(DINO_KEYS[i]); G.run(20); }
  for (let i = 0; i < 4; i++) { callVehicle('digger'); const v = Vehicles.list.find(v => v.kind === 'digger' && !v.driver); Player.body.x = v.body.x; Vehicles.enter(Player, v); G.run(10); Game.resetWorld(); G.run(30); }
});

// 4. Leaving mid-trip: new world or game over in the middle of flights, voyages and blasts.
await scene('trips interrupted', () => {
  const into = v => { if (Player.vehicle) Vehicles.exit(Player); Player.body.x = v.body.x; Player.body.y = v.body.y - 10; Vehicles.enter(Player, v); };
  G.fresh('rex', 31337); Game.stars = 200; Vehicles.spawnMissing();
  const jet = dest => { into(Vehicles.list.find(v => v.kind === 'jet')); if (Game.overlay === JetPick) JetPick.pick(dest); };
  // FIFO jet: new world while picking, mid-climb, then mid-flight.
  into(Vehicles.list.find(v => v.kind === 'jet')); G.run(30); Game.resetWorld(); G.run(60);
  if (Game.overlay || Player.vehicle) G.issue('jet picker still up after a new world');
  jet('pilbara'); G.run(60 * 6); Game.resetWorld(); G.run(60);
  jet('melbourne'); G.run(60 * 9); Game.resetWorld(); G.run(60);
  // Melbourne: mash about on the tram and bikes, then new world mid-tram with a passenger aboard.
  jet('melbourne'); Flight.start(Player.vehicle); Flight.finish(); G.run(60 * 6);
  if (Game.away !== 'melbourne') G.issue('did not get to Melbourne');
  for (const k of ['tram', 'citybike']) {
    const v = Vehicles.list.find(v => v.kind === k); if (!v) { G.issue('missing in Melbourne', { k }); continue; }
    into(v); G.run(60 * 10, G.masher(mulberry32(k.length), { action: 0.2 })); G.release();
  }
  if (Game.away === 'melbourne') {
    const tram = Vehicles.list.find(v => v.kind === 'tram'), n = NPCs.list.find(n => n.need);
    into(tram); if (n) { tram.body.x = n.body.x; G.run(30); } Game.resetWorld(); G.run(60);
    if (Vehicles.list.some(v => v.kind === 'tram') || NPCs.list.some(n => n.ride)) G.issue('Melbourne left behind after a new world');
  }
  // Rocket: new world during the space trip, then on the Moon.
  let r = Vehicles.list.find(v => v.kind === 'rocket'); into(r); Input.set('action', true); G.frame(); Input.set('action', false); G.run(60 * 7); Game.resetWorld(); G.run(60);
  r = Vehicles.list.find(v => v.kind === 'rocket'); into(r); Moon.enter(r); G.run(60 * 3); Game.resetWorld(); G.run(60);
  // Pirate ship: new world mid-voyage, then on the island carrying treasure.
  let s = Vehicles.list.find(v => v.kind === 'pirateship'); into(s); Input.set('up', true); G.frame(); Input.set('up', false); G.run(60 * 4); Game.resetWorld(); G.run(60);
  s = Vehicles.list.find(v => v.kind === 'pirateship'); into(s); Voyage.start(s); Voyage.finish(); G.run(60); Vehicles.exit(Player); Player.carry = true; G.run(30); Game.resetWorld(); G.run(60);
  if (Player.carry) G.issue('still carrying treasure after a new world');
  // Mine: asteroid hits during the blast countdown.
  jet('pilbara'); const j = Player.vehicle; Flight.start(j); Flight.finish(); G.run(60 * 5);
  Mine.holes.push({ x: 80, y: PIL.FLOOR, charged: true }); Vehicles.exit(Player); Player.body.x = PIL.DET * TS; Player.body.y = SURF * TS - 0.01; Mine.blast(); G.run(60);
  Asteroid.left = 0.5; G.run(60 * 3);
  if (Game.overlay !== Doom) G.issue('asteroid did not end the game at the mine');
  G.run(60 * 4); Game.tap(W / 2, H * 0.78); G.run(60);
  if (Game.away || Game.overlay) G.issue('not back on a fresh Earth after game over', { overlay: !!Game.overlay });
});

// 5. Fighting: provoke fighters, a swarm, hide in a vehicle, get out mid-swarm.
await scene('fights and swarm', () => {
  G.fresh('pachy', 2024);
  const rng = mulberry32(5);
  for (let i = 0; i < 25; i++) {
    const n = NPCs.list.find(n => !n.vehicle && !n.ride && !n.leaving && Math.abs(n.body.x - Player.body.x) < 40 * TS) || NPCs.list.find(n => !n.vehicle);
    if (!n) break;
    Player.body.x = n.body.x - 70; Player.body.y = n.body.y; Player.facing = 1; Player.attackCool = 0; Player.attack();
    G.run(40 + Math.floor(rng() * 30));
  }
  G.run(60 * 6, G.masher(rng, { action: 0.2 }));
  const v = Vehicles.list.find(v => v.kind === 'firetruck'); Player.body.x = v.body.x; Vehicles.enter(Player, v); G.run(60 * 4); Vehicles.exit(Player);
  G.run(60 * 10, G.masher(rng, {}));
  G.release();
});

// 6. Building and smashing: towers, digging under yourself, the wrecking ball on everything.
await scene('build and smash', () => {
  G.fresh('rex', 555); Game.stars = 200; Vehicles.spawnMissing();
  const tx = 150; Player.body.x = tx * TS + 16; Player.body.y = World.surfaceAt(tx) * TS - 0.01;
  for (let i = 0; i < 12; i++) { placeBlock(tx + 1, World.surfaceAt(tx + 1) - 1, BUILD_BLOCKS[i % 6]); }
  for (let i = 0; i < 12; i++) G.run(30, () => { G.key('down', true); G.key('action', true); });
  G.release(); G.run(60);
  callVehicle('wrecker'); const w = Vehicles.list.find(v => v.kind === 'wrecker' && !v.driver); Player.body.x = w.body.x; Vehicles.enter(Player, w);
  const rng = mulberry32(8);
  G.run(60 * 15, i => { G.key('right', (i % 200) < 120); G.key('left', (i % 200) >= 160); if (rng() < 0.05) { Input.set('action', true); Input.set('action', false); } });
  G.release();
});

// 6b. Volcanoes, riding a Brachiosaurus, flying the saucer on the Moon.
await scene('volcano', () => {
  G.fresh('raptor', 8080);
  const tx = 470;
  for (let y = World.surfaceAt(tx) - 1; y < WORLD_H - 8; y++) World.set(tx, y, T.AIR);
  Player.body.x = tx * TS + 16; Player.body.y = (WORLD_H - 8) * TS - 0.01; G.run(10);
  G.run(60 * 2, () => { G.key('down', true); G.key('action', true); });   // dig into the hot rock
  G.release();
  if (!Volcano.active) G.issue('digging into hot rock did nothing');
  G.run(60 * 28, G.masher(mulberry32(4), {}));
  if (Volcano.active) G.issue('volcano never cooled');
  G.release();
});
await scene('canyon jump', () => {
  G.fresh('rex', 1313); Game.stars = 200; Vehicles.spawnMissing();
  for (const kind of ['racecar', 'monster', 'plough']) {
    if (Player.vehicle) Vehicles.exit(Player);
    const v = Vehicles.list.find(v => v.kind === kind) || Vehicles.spawnAtGround(kind, 990, 1);
    v.body.x = 985 * TS; v.body.y = SURF * TS - 0.01; v.facing = 1; Player.body.x = v.body.x; Vehicles.enter(Player, v);
    G.run(60 * 12, () => G.key('right', true));
    G.release();
    if (Player.vehicle && Player.vehicle.body.y > (SURF + 2) * TS) G.issue(kind + ' stuck down the canyon');
  }
  // The volcano mountain erupting with you on it.
  if (Player.vehicle) Vehicles.exit(Player);
  Player.body.x = (WILD.CONE + 8) * TS; Player.body.y = World.surfaceAt(WILD.CONE + 8) * TS - 0.01; Game.snapCamera();
  Wild.volcT = 0.01; G.run(60 * 18, G.masher(mulberry32(13), {}));
  if (Volcano.active) G.issue('volcano mountain never cooled');
  G.release();
});

await scene('voyage battle', () => {
  G.fresh('rex', 4545); Game.stars = 200; Vehicles.spawnMissing();
  for (let k = 0; k < 2; k++) {
    let ship = Player.vehicle && Player.vehicle.kind === 'pirateship' ? Player.vehicle : Vehicles.list.find(v => v.kind === 'pirateship');
    if (!ship) { G.issue('no pirate ship for the voyage'); break; }
    if (Player.vehicle !== ship) { if (Player.vehicle) Vehicles.exit(Player); Player.body.x = ship.body.x; Player.body.y = ship.body.y - 10; Vehicles.enter(Player, ship); }
    Voyage.start(ship);
    for (let i = 0; i < 70 && Game.overlay === Voyage; i++) G.run(60, G.masher(mulberry32(k * 100 + i), {}));
    if (Game.overlay === Voyage) G.issue('voyage battle never ended');
    G.release();
  }
});

await scene('brachio ride', () => {
  G.fresh('rex', 6161);
  const n = NPCs.list.find(n => n.type === 'brachio' && !n.baby);
  Player.body.x = n.body.x - 40; Player.body.y = n.body.y; G.run(2);
  Input.set('enter', true); G.frame(); Input.set('enter', false);
  if (!Player.vehicle || Player.vehicle.kind !== 'brachioride') { G.issue('could not climb on the Brachiosaurus'); return; }
  G.run(60 * 12, G.masher(mulberry32(12), { action: 0.15, enter: 0.01 }));
  G.release();
  if (Player.vehicle) Vehicles.exit(Player);
  G.run(30);
  if (Vehicles.list.some(v => v.kind === 'brachioride' && !v.driver)) G.issue('empty Brachiosaurus ride left behind');
});
await scene('flying saucer', () => {
  G.fresh('ptero', 7171); Game.stars = 200; Vehicles.spawnMissing();
  const r = Vehicles.list.find(v => v.kind === 'rocket'); Player.body.x = r.body.x; Vehicles.enter(Player, r); Moon.enter(r);
  for (let i = 0; i < 60 * 15 && Player.vehicle; i++) { Vehicles.exit(Player); G.frame(); }   // wait for the landing, then out
  const u = Vehicles.list.find(v => v.kind === 'ufo');
  Player.body.x = u.body.x; Player.body.y = u.body.y - 5; Vehicles.enter(Player, u);
  G.run(60 * 12, G.masher(mulberry32(21), { up: 0.3, down: 0.2, action: 0.1 }));
  G.release(); Game.resetWorld(); G.run(60);
});

// 7. Save and reload mid-game, several times, in awkward places.
for (const where of [['in a vehicle', 1], ['underground', 2], ['high up', 3]]) {
  await scene(`reload: ${where[0]}`, k => {
    G.fresh('raptor', 900 + k);
    if (k === 1) { const v = Vehicles.list.find(v => v.kind === 'tractor'); Player.body.x = v.body.x; Vehicles.enter(Player, v); G.run(60, () => G.key('right', true)); G.release(); }
    if (k === 2) { G.run(60 * 6, () => { G.key('down', true); G.key('action', true); }); G.release(); }
    if (k === 3) { Player.body.x = 470 * TS; Player.body.y = (World.surfaceAt(470) - 1) * TS; G.run(30); }
    Save.write();
  }, where[1]);
  const keep = await page.evaluate(() => ({ issues: G.issues, times: G.times }));
  await page.reload(); await page.waitForTimeout(300);
  const saveIssues = await page.evaluate(() => {
    const out = [];
    if (!(Number.isFinite(Player.body.x) && Number.isFinite(Player.body.y))) out.push('NaN after reload');
    Game.loop = () => {}; Sound.say = () => {}; Game.startPlay(Player.type);
    for (let i = 0; i < 120; i++) { Game.update(1 / 60); Input.endFrame(); }
    if (bodySolidAt(Player.body, Player.body.x, Player.body.y)) out.push('inside a wall after reload');
    if (Player.body.y > WORLD_H * TS) out.push('fell out of the world after reload');
    return out;
  });
  await install();
  await page.evaluate(([prev, si, w]) => { G.times = prev.times; G.issues = prev.issues.concat(si.map(kind => ({ scene: 'reload: ' + w, kind }))); }, [keep, saveIssues, where[0]]);
  console.log(`  reload: ${where[0]} -> ${saveIssues.length ? saveIssues.join(', ') : 'ok'}`);
}

// 8. Screen size changes mid-play: phone landscape, wide, tablet.
await scene('screen sizes', () => { G.fresh('stego', 66); G.run(60); });
for (const vp of [{ width: 667, height: 375 }, { width: 1280, height: 540 }, { width: 1024, height: 768 }, { width: 960, height: 540 }]) {
  await page.setViewportSize(vp); await page.waitForTimeout(150);
  await scene(`screen ${vp.width}x${vp.height}`, () => { G.run(60 * 3, G.masher(mulberry32(3), {})); G.release(); });
}

const r = await page.evaluate(() => {
  const t = G.times.slice().sort((a, b) => a - b);
  return { issues: G.issues, frames: t.length, avg: t.reduce((a, b) => a + b, 0) / t.length, p99: t[Math.floor(t.length * 0.99)], max: t[t.length - 1] };
});
console.log(`\n${r.frames} frames: average ${r.avg.toFixed(2)}ms, 99% under ${r.p99.toFixed(1)}ms, worst ${r.max.toFixed(1)}ms`);
// Headless Chrome draws without a GPU, so allow two frames' worth (a phone does far better).
if (r.p99 > 33) r.issues.push({ scene: 'all', kind: 'slow frames', p99: r.p99 });
for (const i of r.issues) console.log('ISSUE', JSON.stringify(i));
for (const e of errors) console.log('ERROR', e);
console.log(`${r.issues.length} issue(s), ${errors.length} page error(s)`);
await browser.close();
process.exit(r.issues.length || errors.length ? 1 : 0);
