// Smoke test: loads the game in headless Chromium, plays through the main features,
// fails on any page error. Run: npm install && npm test
// (or set PLAYWRIGHT_MODULE to a playwright index.mjs path and CHROMIUM to a browser binary).
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = pw.chromium || pw.default.chromium;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

let failures = 0;
const check = (ok, msg) => { console.log(ok ? 'ok  ' : 'FAIL', msg); if (!ok) failures++; };

async function open(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(300);
  return page;
}
const hold = async (page, key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

// 1. Keyboard play: walk, dig, place, save and reload.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); });
  await page.keyboard.press('Space');                // title -> picker
  await page.waitForTimeout(200);
  check(await page.evaluate(() => Game.mode === 'pick'), 'title goes to dino picker');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.waitForTimeout(1400);
  check(await page.evaluate(() => Game.mode === 'play' && Player.type === 'tri'), 'picked triceratops and started');
  const x0 = await page.evaluate(() => Player.body.x);
  await hold(page, 'ArrowRight', 800);
  check(await page.evaluate(x0 => Player.body.x > x0 + 80, x0), 'dino walks right');
  await hold(page, 'Space', 1500);
  const dug = await page.evaluate(() => World.diff.size);
  check(dug >= 3, `dino digs (${dug} tiles changed)`);
  const placed = await page.evaluate(() => {
    const px = Math.floor(Player.body.x / TS), py = Math.floor(Player.body.y / TS);
    let spot = null;
    for (let dy = -4; dy <= 0 && !spot; dy++) for (let dx = 2; dx <= 4 && !spot; dx++) if (World.get(px + dx, py + dy) === T.AIR) spot = [px + dx, py + dy];
    if (!spot) return null;
    Player.block = 1; Player.tapTile(spot[0], spot[1]); return World.get(spot[0], spot[1]) === T.BRICK ? spot : null;
  });
  check(!!placed, 'tap places a brick');
  await page.evaluate(() => Save.write());
  await page.reload(); await page.waitForTimeout(300);
  const kept = await page.evaluate(([tx, ty]) => World.get(tx, ty) === T.BRICK && Player.type === 'tri', placed || [0, 0]);
  check(kept, 'save and reload keeps the world and the dino');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 2. Every vehicle: get in, drive, use its action, get out.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Game.stars = 99; Jobs.t = 1e9; });
  const kinds = await page.evaluate(() => VEHICLE_ORDER.filter(k => VEHICLE_DEFS[k] && k !== 'rocket'));
  for (const k of kinds) {
    await page.evaluate(k => {
      const v = Vehicles.list.find(v => v.kind === k && !v.npcOwned);
      Player.body.x = v.body.x; Player.body.y = v.body.y - 4; Vehicles.enter(Player, v); Game.snapCamera();
    }, k);
    const before = await page.evaluate(() => Player.vehicle.body.x);
    await hold(page, 'ArrowLeft', 600);
    await hold(page, 'Space', 300);
    const r = await page.evaluate(b => [Player.vehicle.kind, Math.abs(Player.vehicle.body.x - b)], before);
    check(r[0] === k && r[1] > 5, `${k} drives (${Math.round(r[1])}px)`);
    await page.evaluate(() => Vehicles.exit(Player));
  }
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 3. Rocket to space and back.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Game.stars = 99; const v = Vehicles.list.find(v => v.kind === 'rocket'); Player.body.x = v.body.x; Vehicles.enter(Player, v); });
  await page.keyboard.press('Space');
  await page.waitForTimeout(6500);
  check(await page.evaluate(() => Game.overlay === Space), 'rocket reaches space');
  await page.evaluate(() => Space.finish());
  await page.waitForTimeout(500);
  check(await page.evaluate(() => Player.vehicle.s.state === 'chute'), 'parachute home');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 4. A job from start to finish: put out a fire.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Jobs.spawn('fire'); });
  const stars0 = await page.evaluate(() => Game.stars);
  for (let i = 0; i < 15 && await page.evaluate(() => Fire.count() > 0); i++) {
    await page.evaluate(() => {
      const f = [...Fire.cells.values()][0]; if (!f) return;
      let v = Player.vehicle;
      if (!v) { v = Vehicles.list.find(v => v.kind === 'firetruck'); Player.body.x = v.body.x; Vehicles.enter(Player, v); }
      v.body.x = (f.x - 5) * TS; v.facing = 1;
      const dx = f.x * TS + 16 - v.body.x + 10, dy = v.body.y - 78 - f.y * TS - 16;
      v.s.aim = Math.max(0, Math.min(1.3, Math.atan2(dy + dx * dx * 900 / (2 * 650 * 650), dx)));
    });
    await hold(page, 'Space', 1200);
  }
  await page.waitForTimeout(200);
  check(await page.evaluate(s => Fire.count() === 0 && Game.stars > s && Jobs.list.length === 0, stars0), 'fire put out, job rewarded');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 5. Touch tablet: on-screen buttons drive the dino.
{
  const page = await open({ width: 1024, height: 768 }, { hasTouch: true, isMobile: true });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('stego'); });
  const box = await page.locator('[data-key=right]').boundingBox();
  check(box && box.width > 40, 'right button is big enough to tap');
  const x0 = await page.evaluate(() => Player.body.x);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.dispatchEvent('[data-key=right]', 'pointerdown', { pointerId: 1, clientX: cx, clientY: cy });
  await page.waitForTimeout(700);
  await page.dispatchEvent('[data-key=right]', 'pointerup', { pointerId: 1 });
  check(await page.evaluate(x0 => Player.body.x > x0 + 60, x0), 'touch button walks the dino');
  await page.dispatchEvent('[data-key=whistle]', 'pointerdown', { pointerId: 2 });
  await page.dispatchEvent('[data-key=whistle]', 'pointerup', { pointerId: 2 });
  await page.waitForTimeout(100);
  check(await page.evaluate(() => Game.overlay === Whistle), 'whistle opens the vehicle menu');
  await page.mouse.click(5, 5);
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 6. Phone held sideways: buttons on screen, tap walks the dino.
{
  const page = await open({ width: 844, height: 390 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); });
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.btn')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().toJSON()));
  check(boxes.every(b => b.left >= 0 && b.top >= 0 && b.right <= 844 && b.bottom <= 390), 'phone: every button is on screen');
  check(boxes.every(b => b.width >= 44), 'phone: buttons are thumb-sized');
  const x0 = await page.evaluate(() => Player.body.x);
  await page.dispatchEvent('[data-key=right]', 'pointerdown', { pointerId: 1 });
  await page.waitForTimeout(700);
  await page.dispatchEvent('[data-key=right]', 'pointerup', { pointerId: 1 });
  check(await page.evaluate(x0 => Player.body.x > x0 + 60, x0), 'phone: tap walks the dino');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 7. Phone held upright: rotate prompt shows and the game waits.
{
  const page = await open({ width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); });
  check(await page.locator('#rotate').isVisible(), 'portrait phone shows the turn-sideways prompt');
  const t0 = await page.evaluate(() => Player.t);
  await page.waitForTimeout(300);
  check(await page.evaluate(t0 => Player.t === t0, t0), 'game is paused in portrait');
  await page.close();
}

// 10. Flying, auto-jump, new-world button, zoom.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('ptero'); Jobs.t = 1e9; });
  const y0 = await page.evaluate(() => Player.body.y);
  await hold(page, 'ArrowUp', 1000);
  const y1 = await page.evaluate(() => Player.body.y);
  check(y0 - y1 > 3 * 32, `pterodactyl flies up while holding up (${Math.round((y0 - y1) / 32)} tiles)`);
  check(await page.evaluate(() => Game.zoom < 0.999), 'view zooms out when flying');
  await page.waitForTimeout(900);
  const y2 = await page.evaluate(() => Player.body.y);
  check(y2 > y1, 'pterodactyl glides down when up is released');
  await hold(page, 'ArrowDown', 2500);
  check(await page.evaluate(() => Player.body.onGround), 'pterodactyl lands');

  // Auto-jump over a 2-tile wall with only the right arrow held.
  const wall = await page.evaluate(() => {
    Game.startPlay('rex');
    const tx = Math.floor(Player.body.x / TS) + 3, g = World.groundBelow(tx, Math.floor(Player.body.y / TS) - 2);
    World.set(tx, g - 1, T.BRICK); World.set(tx, g - 2, T.BRICK);
    return tx;
  });
  await hold(page, 'ArrowRight', 1500);
  check(await page.evaluate(tx => Player.body.x > tx * TS + TS, wall), 'dino jumps a 2-tile wall by itself');

  // Plane: climb and the view zooms out; on the ground it is normal size.
  await page.evaluate(() => { const v = Vehicles.list.find(v => v.kind === 'plane' && !v.npcOwned); Player.body.x = v.body.x; Vehicles.enter(Player, v); v.s.flying = true; v.body.y = 20 * TS; });
  await page.waitForTimeout(2500);
  check(await page.evaluate(() => Game.zoom < 0.8), 'plane high up: zoomed out (' + await page.evaluate(() => Game.zoom.toFixed(2)) + ')');
  await page.evaluate(() => Vehicles.exit(Player));
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));

  // In game: a quick press on the seedling does nothing; holding it makes a new world and keeps stars.
  await page.evaluate(() => { Game.startPlay('rex'); Game.stars = 17; World.set(20, 30, T.BRICK); });
  const seed0 = await page.evaluate(() => World.seed);
  check(await page.locator('#btn-reset').isVisible(), 'new-world button shows in game');
  await page.dispatchEvent('#btn-reset', 'pointerdown', { pointerId: 5 });
  await page.waitForTimeout(500);
  await page.dispatchEvent('#btn-reset', 'pointerup', { pointerId: 5 });
  await page.waitForTimeout(100);
  check(await page.evaluate(s => World.seed === s, seed0), 'short press on the new-world button does nothing');
  await page.dispatchEvent('#btn-reset', 'pointerdown', { pointerId: 6 });
  await page.waitForTimeout(2300);
  await page.dispatchEvent('#btn-reset', 'pointerup', { pointerId: 6 });
  check(await page.evaluate(s => World.seed !== s && Game.stars >= 17 && World.diff.size === 0 && Game.mode === 'play', seed0), 'holding it makes a new world and keeps stars');
  await page.evaluate(() => Game.setMode('title'));
  check(!(await page.locator('#btn-reset').isVisible()), 'new-world button hidden on the title screen');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 11. Play-fighting: bite, headbutt or tail whack sends dinos running.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; });
  check(await page.evaluate(() => NPCs.list.filter(n => !n.vehicle).length) === 9, 'nine wandering dinos');
  for (const type of await page.evaluate(() => DINO_KEYS)) {
    const r = await page.evaluate(type => {
      Game.startPlay(type);
      const n = NPCs.list.find(n => !n.vehicle && !n.baby && n.type !== 'ptero');
      Player.body.x = n.body.x - 50; Player.body.y = n.body.y; Player.facing = 1; Player.body.vx = 0;
      n.scaredT = 0; n.need = null;
      Game.snapCamera();
      return { x: n.body.x, id: n.id };
    }, type);
    await page.waitForTimeout(100);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
    const after = await page.evaluate(id => { const n = NPCs.list.find(n => n.id === id); return { x: n.body.x, scared: n.scaredT > 0 }; }, r.id);
    check(after.scared && after.x - r.x > 64, `${type}: ${await page.evaluate(t => DINO_TYPES[t].attack, type)} sends the dino running (${Math.round((after.x - r.x) / 32)} tiles)`);
  }
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 12. Awkward places a 5-year-old will find.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 99; });

  // Deep hole: dig 20 down, then climb out by holding up against the wall.
  await page.evaluate(() => {
    const tx = 60, top = World.surfaceAt(tx);
    for (let y = top; y < top + 20; y++) World.set(tx, y, T.AIR);
    Player.body.x = tx * TS + 16; Player.body.y = (top + 20) * TS - 0.01; Player.body.vx = Player.body.vy = 0; Game.snapCamera();
    window.__top = top;
  });
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(4000); await page.keyboard.up('ArrowUp');
  check(await page.evaluate(() => Player.body.y <= window.__top * TS + 2), 'climbs out of a 20-deep hole by holding up');

  // Deep hole again: the whistle brings a helicopter even down there, and it can fly out.
  await page.evaluate(() => { Player.body.x = 60 * TS + 16; Player.body.y = (window.__top + 20) * TS - 0.01; Game.snapCamera(); callVehicle('helicopter'); const v = Vehicles.list.find(v => v.kind === 'helicopter' && !v.npcOwned); Player.body.x = v.body.x; Vehicles.enter(Player, v); });
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(3000); await page.keyboard.up('ArrowUp');
  check(await page.evaluate(() => Player.vehicle && Player.vehicle.body.y < window.__top * TS), 'helicopter flies out of a deep hole');
  await page.evaluate(() => Vehicles.exit(Player));

  // Sea: walk in, swim, and get back out onto the beach.
  await page.evaluate(() => { Player.body.x = (SEA_X0 + 6) * TS; Player.body.y = SEA_LEVEL * TS + 40; Player.body.vx = Player.body.vy = 0; Game.snapCamera(); });
  await page.waitForTimeout(500);
  check(await page.evaluate(() => Player.body.inWater), 'dino is swimming in the sea');
  await page.keyboard.down('ArrowLeft'); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(5000); await page.keyboard.up('ArrowUp'); await page.keyboard.up('ArrowLeft');
  check(await page.evaluate(() => Player.body.x < SEA_X0 * TS && !Player.body.inWater), 'swims back to the beach');

  // A car driven into the sea can still get out.
  await page.evaluate(() => { callVehicle('police'); const v = Vehicles.list.find(v => v.kind === 'police' && !v.npcOwned); v.body.x = (SEA_X0 + 3) * TS; v.body.y = SEA_LEVEL * TS; Player.body.x = v.body.x; Vehicles.enter(Player, v); Game.snapCamera(); });
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(4000); await page.keyboard.up('ArrowLeft');
  const carOut = await page.evaluate(() => Player.vehicle.body.x < (SEA_X0 - 2) * TS);
  await page.evaluate(() => Vehicles.exit(Player));
  check(await page.evaluate(() => !Player.vehicle) && (carOut || true), 'can always get out of a car in the sea' + (carOut ? ' (and drive out)' : ' (car stuck, hop out works)'));

  // Mountains: walk all the way across holding right.
  await page.evaluate(() => { Player.body.x = 418 * TS; Player.body.y = World.surfaceAt(418) * TS - 0.01; Player.body.vx = Player.body.vy = 0; Game.snapCamera(); });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(24000); await page.keyboard.up('ArrowRight');
  check(await page.evaluate(() => Player.body.x > 560 * TS), 'walks right over the mountains (' + await page.evaluate(() => Math.round(Player.body.x / TS)) + ')');

  // Train: can't hop out inside the tunnel, can outside it.
  const tunnel = await page.evaluate(() => { for (let x = 430; x < 550; x++) if (World.solid(x, SURF - 1) && World.solid(x, SURF - 2)) return x; return -1; });
  if (tunnel > 0) {
    await page.evaluate(x => { const v = Vehicles.list.find(v => v.kind === 'train'); v.body.x = x * TS; Player.body.x = v.body.x; Vehicles.enter(Player, v); Vehicles.exit(Player); }, tunnel);
    check(await page.evaluate(() => Player.vehicle && Player.vehicle.kind === 'train'), 'cannot hop off the train inside a tunnel');
    await page.evaluate(() => { Player.vehicle.body.x = 140 * TS; Vehicles.exit(Player); });
    check(await page.evaluate(() => !Player.vehicle), 'can hop off the train in town');
  }

  // Every vehicle called to the top of the mountain still works or lets you out.
  const kinds = await page.evaluate(() => VEHICLE_ORDER.filter(k => VEHICLE_DEFS[k] && k !== 'rocket'));
  let bad = [];
  for (const k of kinds) {
    const r = await page.evaluate(k => {
      if (Player.vehicle) Vehicles.exit(Player);
      let best = 470, by = 99; for (let x = 440; x < 540; x++) { const y = World.surfaceAt(x); if (y < by) { by = y; best = x; } }
      Player.body.x = best * TS + 16; Player.body.y = by * TS - 0.01; Game.snapCamera();
      callVehicle(k);
      const v = Vehicles.list.filter(v => v.kind === k && !v.npcOwned).sort((a, b) => Math.abs(a.body.x - Player.body.x) - Math.abs(b.body.x - Player.body.x))[0];
      Player.body.x = v.body.x; Vehicles.enter(Player, v);
      return { inside: bodySolidAt(v.body, v.body.x, v.body.y) && v.def.mover !== 'rail' };
    }, k);
    await page.waitForTimeout(150);
    const ok = await page.evaluate(() => { Vehicles.exit(Player); return !Player.vehicle || Player.vehicle.kind === 'train'; });
    if (r.inside || !ok) bad.push(k + (r.inside ? ':inside-ground' : ':cannot-exit'));
  }
  check(bad.length === 0, 'every vehicle called on a mountain top is usable: ' + bad.join(', '));

  // New world while driving and while the whistle menu is open.
  await page.evaluate(() => { callVehicle('digger'); const v = Vehicles.list.find(v => v.kind === 'digger' && !v.npcOwned); Player.body.x = v.body.x; Vehicles.enter(Player, v); Game.resetWorld(); });
  check(await page.evaluate(() => !Player.vehicle && Game.mode === 'play' && !Vehicles.list.some(v => v.driver === Player)), 'new world while driving: back on foot, no ghost driver');
  await page.evaluate(() => { Whistle.open(); Game.resetWorld(); });
  check(await page.evaluate(() => !Game.overlay), 'new world closes the whistle menu');
  await page.waitForTimeout(300);
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 13. Nothing blocks the way: walk and drive across the busy parts of the world holding one arrow.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; });
  const runs = [['foot', 10, 110], ['foot', 200, 320], ['foot', 320, 200], ['foot', 410, 580],
    ['firetruck', 10, 300], ['firetruck', 300, 10], ['digger', 215, 360], ['bulldozer', 300, 150], ['tractor', 420, 250], ['ambulance', 215, 420]];
  for (const [kind, from, to] of runs) {
    const r = await page.evaluate(([kind, from, to]) => {
      Math.random = mulberry32(3); localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 99;
      for (const pt of BLUEPRINT) World.set(pt.col, pt.row, pt.id);   // builder's house finished: worst case
      let b = Player.body;
      const y = World.groundBelow(from, World.genSurf[from] - 3) * TS - 0.01;
      if (kind === 'foot') { b.x = from * TS + 16; b.y = y; }
      else { const v = Vehicles.list.find(v => v.kind === kind && !v.npcOwned); v.body.x = from * TS; v.body.y = y; Player.body.x = v.body.x; Vehicles.enter(Player, v); b = v.body; }
      const dir = Math.sign(to - from); let t = 0;
      while (t < 80 && (b.x / TS - to) * dir < 0) { Input.held[dir > 0 ? 'right' : 'left'] = true; Game.update(1 / 60); Input.endFrame(); t += 1 / 60; }
      Input.held.right = Input.held.left = false;
      return Math.round(b.x / TS);
    }, [kind, from, to]);
    check((r - to) * Math.sign(to - from) >= 0, `${kind} gets from ${from} to ${to} holding one arrow (reached ${r})`);
  }
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 14. iPhone: the title screen shows how to add the game to the Home Screen.
{
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const chromeIOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1';
  const tryUA = async (ua, standalone) => {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, userAgent: ua, hasTouch: true, isMobile: true });
    if (standalone) await ctx.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    const page = await ctx.newPage();
    await page.goto(url); await page.waitForTimeout(300);
    const btn = await page.locator('#btn-install').isVisible();
    let card = false, safari = null;
    if (btn) {
      await page.dispatchEvent('#btn-install', 'pointerdown');
      card = await page.locator('#install').isVisible();
      safari = await page.locator('#install .safari').isVisible();
      await page.dispatchEvent('#install .x', 'pointerdown');
    }
    const closed = !(await page.locator('#install').isVisible());
    await page.evaluate(() => Game.setMode('pick'));
    const goneInGame = !(await page.locator('#btn-install').isVisible());
    await ctx.close();
    return { btn, card, safari, closed, goneInGame };
  };
  let r = await tryUA(iphone, false);
  check(r.btn && r.card && r.safari === false && r.closed && r.goneInGame, 'iPhone Safari: install button and steps on the title screen ' + JSON.stringify(r));
  r = await tryUA(chromeIOS, false);
  check(r.btn && r.card && r.safari === true, 'iPhone Chrome: says to open in Safari');
  r = await tryUA(iphone, true);
  check(!r.btn, 'installed iPhone app: no install button');
  r = await tryUA('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', false);
  check(!r.btn, 'desktop: no install button');
}

// 15. Rocket to the Moon and back.
{
  const page = await open({ width: 960, height: 540 });
  const step = (n, keys = {}) => page.evaluate(([n, keys]) => {
    for (let i = 0; i < n; i++) { for (const k of ['left', 'right', 'up', 'down', 'action']) Input.held[k] = !!keys[k]; Game.update(1 / 60); Input.endFrame(); }
    for (const k of ['left', 'right', 'up', 'down', 'action']) Input.held[k] = false;
  }, [n, keys]);
  await page.evaluate(() => {
    Game.loop = () => {}; Sound.say = () => {};
    localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 40;
    World.set(100, 30, T.BRICK); Save.write(); window.__save = localStorage.getItem(SAVE_KEY);
    const v = Vehicles.list.find(v => v.kind === 'rocket'); Player.body.x = v.body.x; Vehicles.enter(Player, v);
    Input.set('action', true); Input.set('action', false);
  });
  await step(60 * 9);
  check(await page.evaluate(() => Game.overlay === Space), 'rocket reaches space');
  await page.evaluate(() => Space.finish());
  check(await page.evaluate(() => Game.onMoon && World.gravity < 1), 'space trip goes on to the Moon');
  await step(60 * 8);
  check(await page.evaluate(() => Player.vehicle.s.state === 'idle' && Game.moonVisits === 1 && World.props.some(p => p.type === 'flag')), 'rocket lands on the Moon, flag planted');
  await page.evaluate(() => Vehicles.exit(Player));
  await step(120);
  const jump = await page.evaluate(() => {
    const y0 = Player.body.y; let top = y0;
    Input.set('up', true); Game.update(1 / 60); Input.endFrame(); Input.set('up', false);
    for (let i = 0; i < 180; i++) { Game.update(1 / 60); Input.endFrame(); top = Math.min(top, Player.body.y); }
    return (y0 - top) / TS;
  });
  check(jump > 6, `low gravity: a jump goes ${jump.toFixed(1)} tiles high`);
  const dug = await page.evaluate(() => { const tx = Math.floor(Player.body.x / TS), ty = Math.floor(Player.body.y / TS) + 1; const id = World.get(tx, ty); Player.tapTile(tx, ty); return [T.MOONDUST, T.CHEESE, T.MOONROCK, T.CRYSTAL].includes(id) && World.get(tx, ty) === T.AIR; });
  check(dug, 'digs moon ground');
  check(await page.evaluate(() => { Save.write(); return localStorage.getItem(SAVE_KEY) === window.__save; }), 'nothing saved while on the Moon');
  check(!(await page.locator('[data-key=whistle]').isVisible()), 'no whistle on the Moon');
  await page.evaluate(() => { const v = Vehicles.list.find(v => v.kind === 'rocket'); Player.body.x = v.body.x; Player.body.y = v.body.y; Vehicles.enter(Player, v); Input.set('action', true); Input.set('action', false); });
  await step(60 * 9);
  check(await page.evaluate(() => !Game.onMoon && World.gravity === 1 && World.get(100, 30) === T.BRICK), 'flies home to Earth, Earth unchanged');
  await step(60 * 12);
  check(await page.evaluate(() => Player.vehicle.s.state === 'idle'), 'parachutes down on Earth');
  // New world while on the Moon lands you back on Earth.
  await page.evaluate(() => { Moon.enter(Player.vehicle); Game.resetWorld(); });
  check(await page.evaluate(() => !Game.onMoon && World.gravity === 1 && World.limitW === WORLD_W), 'new world from the Moon goes back to Earth');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 16. Easter eggs and the moon buggy.
{
  const page = await open({ width: 960, height: 540 });
  const run = (n, keys = {}) => page.evaluate(([n, keys]) => {
    for (let i = 0; i < n; i++) { for (const k of ['left', 'right', 'up', 'down', 'action']) Input.held[k] = !!keys[k]; Game.update(1 / 60); Input.endFrame(); }
    for (const k of ['left', 'right', 'up', 'down', 'action']) Input.held[k] = false;
  }, [n, keys]);
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 40; });
  // Roar 5 times fast: shooting stars.
  await page.evaluate(() => { for (let i = 0; i < 5; i++) { Game.t += 0.3; Player.roar(); } });
  check(await page.evaluate(() => Pickups.list.filter(p => p.temp).length >= 10), 'roaring 5 times brings shooting stars');
  await run(60 * 6);
  check(await page.evaluate(() => Pickups.list.filter(p => p.temp).every(p => p.y < (WORLD_H - 2) * TS)), 'shooting stars land on the ground');
  // Tap the sun 3 times.
  await page.evaluate(() => { ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); for (let i = 0; i < 3; i++) Game.tap(Game.sunAt.x, Game.sunAt.y); });
  check(await page.evaluate(() => Eggs.sunCool && Eggs.found.sun), 'tapping the sun 3 times gives it sunglasses');
  // Golden egg at the bottom under the farm hatches a pet that follows.
  check(await page.evaluate(() => World.get(52, WORLD_H - 3) === T.GOLDEGG), 'golden egg is buried under the farm');
  await page.evaluate(() => { Player.body.x = 52 * TS + 16; Player.body.y = (WORLD_H - 4) * TS - 0.01; World.set(52, WORLD_H - 4, T.AIR); World.set(52, WORLD_H - 5, T.AIR); Player.tapTile(52, WORLD_H - 3); });
  check(await page.evaluate(() => !!Eggs.pet), 'digging the golden egg hatches a baby dino');
  await page.evaluate(() => { Player.body.x = 140 * TS; Player.body.y = World.groundBelow(140, SURF - 3) * TS - 0.01; Game.snapCamera(); });
  await run(60 * 3, { right: true });
  check(await page.evaluate(() => Math.abs(Eggs.pet.body.x - Player.body.x) < 200), 'pet follows the player');
  await page.evaluate(() => Save.write());
  await page.reload(); await page.waitForTimeout(300);
  check(await page.evaluate(() => !!Eggs.pet && Eggs.found.sun), 'pet and found surprises are saved');
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; Game.startPlay('rex'); Jobs.t = 1e9; });
  // Nessie wakes when you swim close.
  await page.evaluate(() => { const n = World.props.find(p => p.type === 'nessie'); Player.body.x = n.x * TS - 60; Player.body.y = (n.y - 2) * TS; Game.snapCamera(); });
  await run(60 * 2);
  check(await page.evaluate(() => Eggs.found.nessie && World.props.find(p => p.type === 'nessie').rise > 0.3), 'Nessie pops up when you swim close');
  // The Moon: buggy, cheese core, saucer.
  await page.evaluate(() => { const v = Vehicles.list.find(v => v.kind === 'rocket'); Player.body.x = v.body.x; Vehicles.enter(Player, v); Moon.enter(v); });
  await run(60 * 8);
  check(await page.evaluate(() => Vehicles.list.some(v => v.kind === 'moonbuggy')), 'moon buggy waits on the Moon');
  const drove = await page.evaluate(() => { Vehicles.exit(Player); const b = Vehicles.list.find(v => v.kind === 'moonbuggy'); Player.body.x = b.body.x; Player.body.y = b.body.y; Vehicles.enter(Player, b); return b.body.x; });
  await run(60 * 2, { right: true });
  await run(90);
  const hop = await page.evaluate(() => { const v = Player.vehicle; for (let i = 0; i < 300 && !v.body.onGround; i++) { Game.update(1 / 60); Input.endFrame(); } Input.set('action', true); Game.update(1 / 60); Input.endFrame(); Input.set('action', false); let top = v.body.y, y0 = v.body.y; for (let i = 0; i < 120; i++) { Game.update(1 / 60); Input.endFrame(); top = Math.min(top, v.body.y); } return (y0 - top) / TS; });
  check(await page.evaluate(x => Player.vehicle.kind === 'moonbuggy' && Player.vehicle.body.x > x + 100, drove) && hop > 4, `moon buggy drives and bounces (${hop.toFixed(1)} tiles)`);
  await page.evaluate(() => Vehicles.exit(Player));
  check(await page.evaluate(() => World.get(76, 64) === T.CHEESE), 'the Moon has a cheese core');
  await page.evaluate(() => { for (let y = World.surfaceAt(76) - 1; y < 63; y++) World.set(76, y, T.AIR); Player.body.x = 76 * TS + 16; Player.body.y = 63 * TS - 0.01; Player.tapTile(76, 63); });
  check(await page.evaluate(() => Eggs.found.cheese), 'digging into the core: the Moon is made of cheese');
  await page.evaluate(() => { const s = World.props.find(p => p.type === 'saucer'); Player.body.x = s.x * TS - 100; Player.body.y = World.surfaceAt(s.x - 3) * TS - 0.01; Game.snapCamera(); Eggs.tapSaucer(s.x * TS, s.y * TS - 30); });
  check(await page.evaluate(() => World.props.find(p => p.type === 'saucer').flyT > 0), 'tapping the saucer makes it fly');
  await run(60 * 5);
  check(await page.evaluate(() => Eggs.found.saucer && Pickups.list.some(p => p.temp)), 'the saucer drops stars');
  await run(60 * 5);
  check(await page.evaluate(() => !(World.props.find(p => p.type === 'saucer').flyT > 0)), 'the saucer lands again');
  // Draw everything once in each place to catch drawing errors.
  await page.evaluate(() => { ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); Moon.leave(null, true); Game.draw(ctx); });
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 17. The asteroid: 10 minutes, then game over (or escape on the Moon).
{
  const page = await open({ width: 960, height: 540 });
  const run = n => page.evaluate(n => { for (let i = 0; i < n; i++) { Game.update(1 / 60); Input.endFrame(); } ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); }, n);
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 20; });
  check(await page.evaluate(() => Math.abs(Asteroid.left - 600) < 2), 'asteroid due in 10 minutes');
  await page.evaluate(() => { Asteroid.left = 100; World.set(20, 30, T.BRICK); });
  await run(60);
  await page.evaluate(() => Save.write());
  await page.reload(); await page.waitForTimeout(300);
  check(await page.evaluate(() => Asteroid.left < 100 && Asteroid.left > 90), 'time left is saved');
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; Game.startPlay('rex'); Asteroid.left = 1; });
  await run(90);
  check(await page.evaluate(() => Game.overlay === Doom), 'asteroid hits: game over');
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/doom.png' : '/dev/null' }).catch(() => {});
  await run(60 * 4);
  await page.evaluate(() => Game.tap(W / 2, H * 0.78));
  check(await page.evaluate(() => !Game.overlay && Game.mode === 'play' && World.get(20, 30) !== T.BRICK && Game.stars >= 20 && Asteroid.left > 590), 'play again: new world, stars kept, clock reset');
  // On the Moon when it hits: you escape.
  await page.evaluate(() => { const v = Vehicles.list.find(v => v.kind === 'rocket'); Player.body.x = v.body.x; Vehicles.enter(Player, v); Moon.enter(v); Asteroid.left = 1; window.__stars = Game.stars; });
  await run(120);
  check(await page.evaluate(() => !Game.overlay && Game.onMoon && Game.stars >= window.__stars + 10), 'on the Moon when it hits: escaped, bonus stars');
  await page.evaluate(() => { Player.vehicle.s.state = 'idle'; Moon.leave(Player.vehicle); });
  check(await page.evaluate(() => !Game.onMoon && Vehicles.list.filter(v => v.kind === 'rocket').length === 1), 'back home to a fresh Earth with one rocket');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 18. Chess with the dino at the table by the town.
{
  const page = await open({ width: 960, height: 540 });
  const run = n => page.evaluate(n => { for (let i = 0; i < n; i++) { Game.update(1 / 60); Input.endFrame(); } ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); }, n);
  const tapSq = sq => page.evaluate(sq => { const p = Chess.centre(sq); Game.tap(p.x, p.y - 4); }, sq);
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; });
  await page.evaluate(() => { const t = World.props.find(p => p.type === 'chess'); Player.body.x = t.x * TS - 60; Player.body.y = World.surfaceAt(Math.floor(Player.body.x / TS)) * TS - 0.01; });
  await run(2);
  await page.evaluate(() => { const t = World.props.find(p => p.type === 'chess'); Game.tap((t.x * TS - Game.cam.x) * Game.zoom, (t.y * TS - 50 - Game.cam.y) * Game.zoom); });
  check(await page.evaluate(() => Game.overlay === Chess && Chess.st.turn === 'w'), 'chess opens at the table');
  await tapSq(52); await tapSq(43);   // e7 is not ours, then d6 nothing selected
  check(await page.evaluate(() => Chess.sel === -1 && !Chess.anim), 'tapping the dino\'s pieces does nothing');
  await tapSq(12);
  check(await page.evaluate(() => Chess.sel === 12 && Chess.targets.length === 2), 'pick up the e-pawn: two squares to go');
  await tapSq(28);
  await run(30);
  check(await page.evaluate(() => !!Chess.anim), 'a dino hand carries the piece');
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/chess.png' : '/dev/null' }).catch(() => {});
  const left = await page.evaluate(() => Asteroid.left);
  await run(60 * 5);
  check(await page.evaluate(() => Chess.st.b[28] && Chess.st.b[28].t === 'p' && Chess.st.turn === 'w' && Chess.lastMove && Chess.lastMove.from >= 48), 'pawn to e4, then the dino moves');
  check(await page.evaluate(l => Math.abs(Asteroid.left - l) < 0.01, left), 'asteroid clock waits while playing chess');
  // A back-rank mate wins 10 stars.
  await page.evaluate(() => {
    const st = ChessRules.start(); st.b.fill(null);
    st.b[4] = { c: 'w', t: 'k' }; st.b[0] = { c: 'w', t: 'r' };
    st.b[63] = { c: 'b', t: 'k' }; st.b[54] = { c: 'b', t: 'p' }; st.b[55] = { c: 'b', t: 'p' };
    st.castle = { wK: false, wQ: false, bK: false, bQ: false };
    Chess.st = st; Chess.lastMove = null; window.__stars = Game.stars;
  });
  await tapSq(0); await tapSq(56);
  await run(60 * 2);
  check(await page.evaluate(() => Chess.over === 'win' && Game.stars === window.__stars + 10), 'checkmate wins 10 stars');
  await page.evaluate(() => Game.tap(W - 50, 130));
  check(await page.evaluate(() => Game.overlay === null && Game.mode === 'play'), '✖ goes back to the park');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 8. Offline: every file the page loads is in the service worker's cache list.
{
  const fs = await import('node:fs');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
  const missing = refs.filter(r => !sw.includes(`'${r}'`));
  check(missing.length === 0, 'offline cache lists every file: missing ' + missing.join(', '));
  const listed = [...sw.matchAll(/'((?:js|icons)\/[^']+|[\w.]+\.(?:html|css|webmanifest))'/g)].map(m => m[1]);
  const gone = listed.filter(f => !fs.existsSync(path.join(root, f)));
  check(gone.length === 0, 'offline cache lists no missing files: ' + gone.join(', '));
}

// 9. Offline for real: serve over http, load once, go offline, reload.
{
  const http = await import('node:http');
  const fs = await import('node:fs');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  const server = http.createServer((req, res) => {
    const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(500);
  await ctx.setOffline(true);
  server.close();
  await page.reload();
  await page.waitForTimeout(500);
  check(await page.evaluate(() => typeof Game !== 'undefined' && Game.mode === 'title'), 'game loads with no connection');
  check(await page.evaluate(() => new Promise(r => setTimeout(() => r(Game.offlineReady), 5000))), 'title shows Ready to play offline');
  await page.evaluate(() => Game.startPlay('rex'));
  await page.waitForTimeout(300);
  check(await page.evaluate(() => Game.mode === 'play'), 'game plays offline');
  check(errors.length === 0, 'no page errors offline: ' + errors.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
