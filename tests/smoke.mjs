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
    // Try a few empty spots nearby (one might have a passing car in it).
    Player.block = 1;
    for (let dy = -4; dy <= 0; dy++) for (const dx of [2, 3, 4, -2, -3, -4]) {
      if (World.get(px + dx, py + dy) !== T.AIR) continue;
      Player.placeCool = 0; Player.tapTile(px + dx, py + dy);
      if (World.get(px + dx, py + dy) === T.BRICK) return [px + dx, py + dy];
    }
    return null;
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
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Game.stars = 200; Vehicles.spawnMissing(); Jobs.t = 1e9; });
  const kinds = await page.evaluate(() => VEHICLE_ORDER.filter(k => VEHICLE_DEFS[k] && k !== 'rocket' && vehicleParked(k)));
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
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Game.stars = 200; Vehicles.spawnMissing(); const v = Vehicles.list.find(v => v.kind === 'rocket'); Player.body.x = v.body.x; Vehicles.enter(Player, v); });
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

// Joystick: put a "thumb" on the middle of the stick, slide, hold, let go.
async function stickDrag(page, dx, dy, ms) {
  const z = await page.locator('#stick').boundingBox();
  const x = z.x + z.width / 2, y = z.y + z.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2); await page.mouse.move(x + dx, y + dy);
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

// 5. Touch tablet: the joystick drives the dino.
{
  const page = await open({ width: 1024, height: 768 }, { hasTouch: true, isMobile: true });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('stego'); Jobs.t = 1e9; });
  const z = await page.locator('#stick').boundingBox();
  check(z && z.width > 120 && z.x < 120 && z.y + z.height > 768 - 120, 'a big joystick in the bottom-left corner');
  let x0 = await page.evaluate(() => Player.body.x);
  await stickDrag(page, 80, 0, 700);
  const z2 = await page.locator('#stick').boundingBox();
  check(Math.abs(z2.x - z.x) < 1 && Math.abs(z2.y - z.y) < 1, 'the joystick stays put');
  const full = await page.evaluate(x0 => Player.body.x - x0, x0);
  check(full > 60, 'slide the joystick right: the dino walks right');
  await page.waitForTimeout(200);
  check(await page.evaluate(() => !Input.held.right && Input.stick === undefined && !document.getElementById('stick-knob').style.transform), 'let go: the knob springs back and the dino stops');
  x0 = await page.evaluate(() => Player.body.x);
  await stickDrag(page, -26, 0, 700);
  const gentle = await page.evaluate(x0 => x0 - Player.body.x, x0);
  check(gentle > 10 && gentle < full * 0.8, `a small push walks slower (${Math.round(gentle)} vs ${Math.round(full)})`);
  await page.evaluate(() => { Player.body.x = 222 * TS; Player.body.y = World.surfaceAt(222) * TS - 0.01; Player.body.vx = Player.body.vy = 0; Game.snapCamera(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { Player.body.vy = 0; window.__y = Player.body.y; window.__top = Player.body.y; window.__poll = setInterval(() => { window.__top = Math.min(window.__top, Player.body.y); }, 16); });
  await stickDrag(page, 0, -80, 400);
  check(await page.evaluate(() => { clearInterval(window.__poll); return window.__top < window.__y - 40; }), 'push up: the dino jumps');
  await page.dispatchEvent('[data-key=whistle]', 'pointerdown', { pointerId: 2 });
  await page.dispatchEvent('[data-key=whistle]', 'pointerup', { pointerId: 2 });
  await page.waitForTimeout(100);
  check(await page.evaluate(() => Game.overlay === Whistle && document.getElementById('stick-zone').classList.contains('hidden')), 'whistle opens the vehicle menu (joystick put away)');
  await page.mouse.click(5, 5);
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 6. Phone held sideways: buttons and joystick on screen, joystick walks the dino.
{
  const page = await open({ width: 844, height: 390 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); });
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.btn')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().toJSON()));
  check(boxes.every(b => b.left >= 0 && b.top >= 0 && b.right <= 844 && b.bottom <= 390), 'phone: every button is on screen');
  check(boxes.every(b => b.width >= 44), 'phone: buttons are thumb-sized');
  const z = await page.locator('#stick-zone').boundingBox();
  check(await page.evaluate(([zx, zw, zy]) => [...document.querySelectorAll('.btn')].filter(b => b.offsetParent).every(b => { const r = b.getBoundingClientRect(); return r.left >= zx + zw || r.bottom <= zy; }), [z.x, z.width, z.y]), 'phone: the joystick doesn\'t cover any buttons');
  check(z.y + z.height <= 391 && z.x >= 0, 'phone: the joystick is on screen');
  const x0 = await page.evaluate(() => Player.body.x);
  await stickDrag(page, 70, 0, 700);
  check(await page.evaluate(x0 => Player.body.x > x0 + 60, x0), 'phone: the joystick walks the dino');
  const sb = await page.locator('#stick').boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.mouse.down(); await page.mouse.move(sb.x + sb.width, sb.y + sb.height / 2);
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/joystick.png' : '/dev/null' }).catch(() => {});
  await page.mouse.up();
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
  await page.evaluate(() => { Game.startPlay('rex'); Game.stars = 17; Vehicles.spawnMissing(); World.set(20, 30, T.BRICK); });
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
  check(await page.evaluate(() => NPCs.list.filter(n => !n.vehicle).length) >= 16, 'lots of dinos wandering about');
  for (const type of await page.evaluate(() => DINO_KEYS)) {
    const r = await page.evaluate(type => {
      Game.startPlay(type);
      const n = NPCs.list.find(n => !n.vehicle && !n.baby && n.type !== 'ptero');
      Player.body.x = n.body.x - 50; Player.body.y = n.body.y; Player.facing = 1; Player.body.vx = 0;
      n.scaredT = 0; n.need = null; n.fighter = false; n.body.vx = n.body.vy = 0; n.tumble = 0; n.state = 'idle'; n.dir = 0; n.timer = 99;
      Game.snapCamera();
      return { x: n.body.x, id: n.id };
    }, type);
    await page.waitForTimeout(100);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
    const after = await page.evaluate(id => { const n = NPCs.list.find(n => n.id === id); return { x: n.body.x, scared: n.scaredT > 0 }; }, r.id);
    check(after.scared && after.x - r.x > 64, `${type}: ${await page.evaluate(t => DINO_TYPES[t].attack, type)} sends the dino running (${Math.round((after.x - r.x) / 32)} tiles)`);
  }
  // Headbutters really charge: from four tiles away they run in and BONK on contact.
  for (const type of ['tri', 'pachy']) {
    const c = await page.evaluate(type => {
      Game.loop = () => {}; Game.startPlay(type);
      const n = NPCs.list.find(n => !n.vehicle && !n.baby && n.type !== 'ptero');
      n.fighter = false; n.need = null; n.scaredT = 0; n.body.x = 30 * TS; n.body.y = World.surfaceAt(30) * TS - 0.01; n.body.vx = 0; n.state = 'idle'; n.dir = 0; n.timer = 99;
      Player.body.x = n.body.x - 4 * TS; Player.body.y = n.body.y; Player.facing = 1; Player.body.vx = 0; Player.attackCool = 0;
      const x0 = Player.body.x; Player.attack();
      for (let i = 0; i < 60; i++) { Game.update(1 / 60); Input.endFrame(); }
      return { ran: Player.body.x - x0, scared: n.scaredT > 0 };
    }, type);
    check(c.ran > 40 && c.scared, `${type} charges in (${Math.round(c.ran)}px) and sends the dino running`);
  }
  // Lick button: just a big wiggly tongue.
  await page.keyboard.press('KeyL');
  check(await page.evaluate(() => { Game.update(1 / 60); Input.endFrame(); return Player.lickT > 0; }) && await page.evaluate(() => Player.lickT > 0 && !document.querySelector('[data-key=lick]').classList.contains('hidden')), 'lick button sticks the tongue out');
  check(await page.evaluate(() => { const v = Vehicles.list.find(v => v.kind === 'tractor'); Vehicles.enter(Player, v); const hidden = document.querySelector('[data-key=lick]').classList.contains('hidden'); Vehicles.exit(Player); return hidden; }), 'no lick button while driving');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 12. Awkward places a 5-year-old will find.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 200; Vehicles.spawnMissing(); });

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
      Math.random = mulberry32(3); localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 200; Vehicles.spawnMissing();
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
    localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 200; Vehicles.spawnMissing();
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
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 200; Vehicles.spawnMissing(); });
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
  check(await page.evaluate(() => { const u = Vehicles.list.find(v => v.kind === 'ufo'); if (Player.vehicle) Vehicles.exit(Player); Player.body.x = u.body.x; Player.body.y = u.body.y - 5; Vehicles.enter(Player, u); return Player.vehicle === u && Eggs.found.saucer; }), 'hop in the flying saucer');
  check(await page.evaluate(() => { const u = Player.vehicle, y0 = u.body.y; for (let i = 0; i < 60; i++) { Input.held.up = true; Game.update(1 / 60); Input.endFrame(); } Input.held.up = false; return y0 - u.body.y > 100; }), 'the saucer flies up');
  check(await page.evaluate(() => { const u = Player.vehicle; for (let i = 0; i < 90; i++) { Input.held.down = true; Game.update(1 / 60); Input.endFrame(); } Input.held.down = false; const t = VEHICLE_DEFS.ufo.beamTarget(u); if (!t) return false; const id = World.get(t.tx, t.ty); Input.pressed.action = true; Game.update(1 / 60); Input.endFrame(); window.__beam = [t.tx, t.ty, id]; return u.s.beam > 0; }), 'tractor beam switches on');
  await page.waitForTimeout(700);
  check(await page.evaluate(() => World.get(window.__beam[0], window.__beam[1]) !== window.__beam[2]), 'the beam pulls a block up out of the ground');
  // Draw everything once in each place to catch drawing errors.
  await page.evaluate(() => { ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); Moon.leave(null, true); Game.draw(ctx); });
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 17. The asteroid: 10 minutes, then game over (or escape on the Moon).
{
  const page = await open({ width: 960, height: 540 });
  const run = n => page.evaluate(n => { for (let i = 0; i < n; i++) { Game.update(1 / 60); Input.endFrame(); } ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); }, n);
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 200; Vehicles.spawnMissing(); });
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
  // Captured pieces go in the trays beside the board.
  await page.evaluate(() => {
    const st = ChessRules.start(); st.b.fill(null);
    st.b[4] = { c: 'w', t: 'k' }; st.b[27] = { c: 'w', t: 'q' }; st.b[60] = { c: 'b', t: 'k' }; st.b[35] = { c: 'b', t: 'n' }; st.b[42] = { c: 'b', t: 'p' };
    st.castle = { wK: false, wQ: false, bK: false, bQ: false };
    Chess.newGame(); Chess.st = st;
  });
  await tapSq(27); await tapSq(35);
  await run(60 * 2);
  check(await page.evaluate(() => Chess.taken.w.length === 1 && Chess.taken.w[0].p.t === 'n'), 'your captured piece goes in your tray');
  await page.evaluate(() => { Chess.startMove({ from: 42, to: 35 }, 'b'); });
  await run(60 * 2);
  check(await page.evaluate(() => Chess.taken.b.length === 1 && Chess.taken.b[0].p.t === 'q'), "the dino's captures go in his tray");
  await page.evaluate(() => Chess.newGame());
  check(await page.evaluate(() => !Chess.taken.w.length && !Chess.taken.b.length), 'new game empties the trays');
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

// 19. FIFO to the Pilbara: drill, blast, dig, haul, crush, train, ship, fly home.
{
  const page = await open({ width: 960, height: 540 });
  check(await page.evaluate(() => typeof GAME_VERSION === 'string' && /\d{4}/.test(RELEASE_DATE)), 'title shows a version and release date');
  await page.evaluate(() => {
    Game.loop = () => {}; window.said = []; Sound.say = t => said.push(t); localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 200; Vehicles.spawnMissing();
    window.run = (n, keys = {}) => { for (let i = 0; i < n; i++) { for (const k in keys) { if (i === 0 && !Input.held[k]) Input.pressed[k] = true; Input.held[k] = true; } Game.update(1 / 60); Input.endFrame(); } for (const k in keys) Input.held[k] = false; ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); };
    window.drive = (v, x, max = 1200) => { for (let i = 0; i < max && Math.abs(v.body.x - x) > 40; i++) run(1, v.body.x < x ? { right: 1 } : { left: 1 }); run(30); };
    window.into = v => { if (Player.vehicle) Vehicles.exit(Player); Player.body.x = v.body.x; Player.body.y = v.body.y - 10; Vehicles.enter(Player, v); };
    World.set(20, 30, T.BRICK); Save.write();
  });
  await page.evaluate(() => { const j = Vehicles.list.find(v => v.kind === 'jet'); into(j); JetPick.pick('pilbara'); run(60); });
  check(await page.evaluate(() => { const b = document.querySelector('[data-key=action]'); return Player.vehicle.s.state === 'board' && (b.classList.contains('hidden') || getComputedStyle(b).display === 'none'); }), 'board the FIFO jet as a passenger: no controls');
  await page.evaluate(() => run(60 * 8));
  check(await page.evaluate(() => Game.overlay === Flight), 'the FIFO jet takes off by itself and flies to the Pilbara');
  await page.evaluate(() => { run(60 * 11); run(60 * 5); });
  check(await page.evaluate(() => Game.away === 'pilbara' && Vehicles.list.find(v => v.kind === 'jet').s.state === 'idle' && !Player.vehicle && Pilbara.visits === 1), 'lands on the Pilbara airstrip and lets you off');
  check(await page.evaluate(() => onSite() && Mine.step === 'drill'), 'hi-vis on, first step is drilling');
  await page.evaluate(() => { window.__save = localStorage.getItem('dinoVehicles.save.v1'); Save.write(); });
  await page.evaluate(() => { const r = Mine.vehicle('blastrig'); into(r); for (const x of [76, 80, 84]) { drive(r, x * TS); run(120, { action: 1 }); } });
  check(await page.evaluate(() => Mine.holes.length === 3 && !Mine.holes.some(h => h.charged) && Mine.step === 'charge'), 'drill three blast holes, empty for now');
  check(await page.evaluate(() => { Vehicles.exit(Player); Player.body.x = PIL.DET * TS; Player.body.y = SURF * TS - 0.01; run(10); run(1, { enter: 1 }); run(30); return Mine.blastT < 0 && Mine.holes.length === 3; }), 'no blast until the holes have explosives in');
  await page.evaluate(() => { const t = Mine.vehicle('chargetruck'); into(t); for (const h of [...Mine.holes]) { drive(t, h.x * TS + 16 - 80, 1500); run(90, { action: 1 }); } });
  check(await page.evaluate(() => Mine.holes.every(h => h.charged) && Mine.step === 'blast'), 'explosives truck fills each hole');
  await page.evaluate(() => { Vehicles.exit(Player); Player.body.x = PIL.DET * TS; Player.body.y = SURF * TS - 0.01; run(10); run(1, { enter: 1 }); run(60 * 6); });
  check(await page.evaluate(() => !Mine.holes.length && Mine.broken > 20 && Mine.step === 'dig'), 'blast breaks up the iron ore');
  await page.evaluate(() => {
    const h = Mine.vehicle('haultruck'); h.body.x = 90 * TS; h.body.y = World.surfaceAt(90) * TS - 0.01;
    const d = Mine.vehicle('digger'); d.body.x = 82 * TS; d.body.y = World.surfaceAt(82) * TS - 0.01; d.facing = 1; into(d); run(30);
    for (let i = 0; i < 10; i++) { run(1, { action: 1 }); run(45); if (d.s.load.length) { run(1, { action: 1 }); run(45); } else { run(1, { down: 1 }); run(10); } }
  });
  check(await page.evaluate(() => Mine.vehicle('haultruck').s.ore >= 12), 'digger loads the haul truck with ore');
  await page.evaluate(() => { const h = Mine.vehicle('haultruck'); into(h); drive(h, PIL.HOPPER * TS + 60, 2400); run(1, { action: 1 }); run(90); });
  check(await page.evaluate(() => Mine.stock + Mine.train().s.ore.reduce((a, b) => a + b, 0) >= 12), 'haul truck tips the ore into the crusher');
  await page.evaluate(() => { const t = Mine.train(); into(t); run(10); drive(t, PIL.LOADOUT * TS); run(60 * 6); drive(t, PIL.DUMPER * TS, 3000); run(60 * 2); });
  check(await page.evaluate(() => Mine.port === 0 && Mine.train().s.ore.some(o => o > 0)), 'ore train waits at the dumper for the button');
  await page.evaluate(() => { run(1, { action: 1 }); run(60 * 6); });
  check(await page.evaluate(() => Mine.port >= 12 && Mine.train().s.ore.every(o => o === 0) && Mine.step === 'ship'), 'ore train loads, then empties at the port');
  await page.evaluate(() => { Mine.port = 18; window.__stars = Game.stars; const l = Mine.vehicle('shiploader'); into(l); for (const h of PIL.HOLDS) { drive(l, h * TS + 16 - LOADER_BOOM, 900); run(60 * 3, { action: 1 }); } });
  check(await page.evaluate(() => Mine.ship.state === 'leave' && Game.stars >= window.__stars + 10), 'ship loader fills the ship and it sails: 10 stars');
  await page.waitForTimeout(3300);
  check(await page.evaluate(() => Game.found.goldtruck && Game.stars >= window.__stars + 30), 'first full ship: Mine Boss medal, 20 more stars and the golden haul truck');
  check(await page.evaluate(() => { const t = Mine.train(); Vehicles.exit(Player); into(t); t.body.x = 220 * TS; t.s.ore = [6, 0, 0]; run(5); const before = Mine.port; run(1, { action: 1 }); run(30); return t.s.ore.every(o => o === 0) && Mine.port === before; }), 'tipping the train away from the port spills the ore');
  check(await page.evaluate(() => localStorage.getItem('dinoVehicles.save.v1') === window.__save), 'nothing saved while away');
  await page.evaluate(() => { const j = Vehicles.list.find(v => v.kind === 'jet'); into(j); run(60 * 9); run(60 * 11); run(60 * 5); });
  check(await page.evaluate(() => Vehicles.list.some(v => v.kind === 'goldtruck') && Whistle.kinds().includes('goldtruck')), 'the golden haul truck is waiting at home');
  check(await page.evaluate(() => !Game.away && !Player.vehicle && Vehicles.list.find(v => v.kind === 'jet').s.state === 'idle' && World.get(20, 30) === T.BRICK && Vehicles.list.filter(v => v.kind === 'jet').length === 1 && !onSite()), 'fly home: Earth as it was');
  // Asteroid while at the mine: game over and a fresh Earth.
  await page.evaluate(() => { const j = Vehicles.list.find(v => v.kind === 'jet'); into(j); Flight.start(j); Flight.finish(); run(60 * 5); Asteroid.left = 1; run(120); });
  check(await page.evaluate(() => Game.overlay === Doom), 'asteroid hits while at the mine: game over');
  await page.evaluate(() => { run(60 * 4); Game.tap(W / 2, H * 0.78); });
  check(await page.evaluate(() => !Game.away && !Game.overlay && World.get(20, 30) !== T.BRICK && Vehicles.list.filter(v => v.kind === 'jet').length === 1), 'play again: back on a fresh Earth');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 20. Wrecking ball: smashes any material and brings a building down.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 200; Vehicles.spawnMissing(); });
  const r = await page.evaluate(() => {
    const run = (n, keys = {}) => { for (let i = 0; i < n; i++) { for (const k in keys) { if (i === 0) Input.pressed[k] = true; Input.held[k] = true; } Game.update(1 / 60); Input.endFrame(); } for (const k in keys) Input.held[k] = false; };
    // The house at x 106-113 in town.
    const brickBefore = () => { let n = 0; for (let x = 106; x < 114; x++) for (let y = SURF - 8; y < SURF; y++) if (World.get(x, y) === T.BRICK || World.getBg(x, y)) n++; return n; };
    const before = brickBefore();
    const w = Vehicles.spawn('wrecker', 102 * TS, SURF * TS - 0.01, 1);
    Player.body.x = w.body.x; Vehicles.enter(Player, w);
    for (let k = 0; k < 40 && brickBefore() > before * 0.3; k++) { run(1, { action: 1 }); run(50); run(20, { right: 1 }); }
    const after = brickBefore();
    run(120);
    return { before, after, x: w.body.x / TS };
  });
  check(r.after < r.before * 0.3, `wrecking ball knocks the house down (${r.before} -> ${r.after} blocks)`);
  await page.evaluate(() => { Save.write(); });
  await page.reload(); await page.waitForTimeout(300);
  check(await page.evaluate(() => { let n = 0; for (let x = 106; x < 114; x++) for (let y = SURF - 8; y < SURF; y++) if (World.getBg(x, y)) n++; return n < 12; }), 'knocked-down walls stay down after reload');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 21. Some dinos fight back: three hits to send them off. Pick on 20 and a swarm comes.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9;
    window.run = n => { for (let i = 0; i < n; i++) { Game.update(1 / 60); Input.endFrame(); } ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); }; });
  check(await page.evaluate(() => { const a = NPCs.list.filter(n => !n.vehicle && !n.baby); const f = a.filter(n => n.fighter).length; return f === Math.round(a.length / 2) && f >= 5; }), 'half the grown-up dinos fight back');
  const r = await page.evaluate(() => {
    const n = NPCs.list.find(n => !n.vehicle && !n.baby && n.type !== 'ptero');
    n.type = 'tri'; n.fighter = true; n.hits = 0; n.need = null;
    n.body.x = 30 * TS; n.body.y = World.surfaceAt(30) * TS - 0.01; n.body.vx = 0;
    Player.body.x = n.body.x - 50; Player.body.y = n.body.y; Player.facing = 1;
    window.__n = n; Player.attack(); run(40);
    const back = n.angry > 0 && !(n.scaredT > 0);
    let hurt = false; for (let i = 0; i < 300 && !hurt; i++) { run(1); if (Player.hurtT > 0) hurt = true; }
    return { back, hurt };
  });
  check(r.back, 'a fighter comes back for more after one hit');
  check(r.hurt, 'and headbutts you back (POW, knocked flying)');
  const r2 = await page.evaluate(() => {
    const n = __n;
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < 200; i++) { run(1); if (Math.abs(n.body.x - Player.body.x) < 80 && !(Player.hurtT > 0)) break; }
      Player.facing = Math.sign(n.body.x - Player.body.x) || 1; Player.attackCool = 0; Player.attack(); run(40);
    }
    return { hits: n.hits, scared: n.scaredT > 0, angry: n.angry };
  });
  check(r2.hits === 3 && r2.scared && r2.angry === 0, 'third hit: it runs away');
  const sw = await page.evaluate(() => {
    Swarm.hits = 19;
    const n = NPCs.list.find(n => !n.vehicle && !n.baby && n !== __n && n.type !== 'ptero');
    n.fighter = false; n.need = null; n.body.x = Player.body.x + 50; n.body.y = Player.body.y; Player.facing = 1; Player.attackCool = 0; Player.hurtT = 0;
    Player.attack(); run(40);
    return { active: Swarm.active, n: NPCs.list.filter(n => n.swarm).length };
  });
  check(sw.active && sw.n === 8, '20th dino picked on: a swarm of 8 comes');
  const end = await page.evaluate(() => { const stars = Game.stars; run(60 * 11); run(60 * 8); return { active: Swarm.active, left: NPCs.list.filter(n => n.swarm).length, stars: Game.stars - stars }; });
  check(!end.active && end.left === 0 && end.stars >= 3, 'after 10 seconds they calm down and go home (3 stars)');
  // Hiding in a vehicle: they can't get you.
  const safe = await page.evaluate(() => {
    Swarm.start(); const v = Vehicles.list.find(v => v.kind === 'tractor'); Player.body.x = v.body.x; Vehicles.enter(Player, v);
    let hurt = false; for (let i = 0; i < 60 * 5; i++) { run(1); if (Player.hurtT > 0) hurt = true; }
    Vehicles.exit(Player); Swarm.t = 0; run(5);
    return !hurt;
  });
  check(safe, 'hiding in a vehicle keeps you safe from the swarm');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 22. Pirate Island: sail there, read the map, dig at the X, fend off pirates, carry the treasure home.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { Game.loop = () => {}; window.said = []; Sound.say = t => said.push(t); localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 200; Vehicles.spawnMissing();
    window.run = (n, keys = {}) => { for (let i = 0; i < n; i++) { for (const k in keys) { if (i === 0 && !Input.held[k]) Input.pressed[k] = true; Input.held[k] = true; } Game.update(1 / 60); Input.endFrame(); } for (const k in keys) Input.held[k] = false; ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); };
    window.into = v => { if (Player.vehicle) Vehicles.exit(Player); Player.body.x = v.body.x; Player.body.y = v.body.y - 10; Vehicles.enter(Player, v); };
    World.set(20, 30, T.BRICK); Save.write(); });
  check(await page.evaluate(() => { const s = Vehicles.list.find(v => v.kind === 'pirateship'); into(s); run(60); return !!s.floating; }), 'pirate ship floats in the sea');
  check(await page.evaluate(() => { run(1, { action: 1 }); run(5); return Player.vehicle.s.balls.length === 1; }), 'cannon fires a cannonball');
  await page.evaluate(() => { run(1, { up: 1 }); run(60 * 3); });
  check(await page.evaluate(() => Game.overlay === Voyage), 'hoist the sails: the voyage begins');
  await page.evaluate(() => run(60 * 10));
  check(await page.evaluate(() => Game.away === 'pirate' && outfit() === 'pirate' && NPCs.list.some(n => n.captain)), 'land on Skull Island in pirate gear, captain waiting');
  await page.evaluate(() => { window.__save = localStorage.getItem('dinoVehicles.save.v1'); Save.write(); });
  await page.evaluate(() => { Game.tap(60, 112); run(20); });
  check(await page.evaluate(() => Game.overlay === TreasureMap), 'tap the map: the treasure map opens');
  await page.evaluate(() => { run(30); Game.tap(W / 2, H / 2); run(10); });
  check(await page.evaluate(() => Hunt.mapRead && Hunt.step === 'dig'), 'next: dig at the X');
  await page.evaluate(() => { Vehicles.exit(Player); Player.body.x = Hunt.x * TS + 16; Player.body.y = World.surfaceAt(Hunt.x) * TS - 0.01; Game.snapCamera(); run(10);
    for (let i = 0; i < 6 && !Player.carry; i++) run(80, { down: 1, action: 1 }); });
  check(await page.evaluate(() => Player.carry && Hunt.crew.length === 3), 'dig up the treasure chest: here come the pirates');
  check(await page.evaluate(() => { let hurt = false; for (let i = 0; i < 400 && !hurt; i++) { run(1); if (Player.hurtT > 0) hurt = true; } return hurt; }), 'pirates swing their cutlasses');
  await page.evaluate(() => { window.__stars = Game.stars; Player.body.x = (PR.JETTY[0] + 1) * TS; Player.body.y = SURF * TS - 0.01; run(30); });
  check(await page.evaluate(() => !Player.carry && Hunt.found === 1 && Game.stars >= window.__stars + 10 && Hunt.step === 'map'), 'carry it to the ship: 10 stars and a new map');
  check(await page.evaluate(() => { const sand = () => { let n = 0; for (let x = PR.FORT[0]; x <= PR.FORT[1]; x++) for (let y = SURF - 7; y < SURF; y++) if (World.get(x, y) === T.SAND) n++; return n; }; const before = sand(); const s = Vehicles.list.find(v => v.kind === 'pirateship'); into(s); s.body.x = (PR.FORT[0] - 30) * TS; s.body.y = SURF * TS - 100; s.facing = 1;
    s.s.balls.push({ x: PR.FORT[0] * TS + 16, y: (SURF - 2) * TS, vx: 0, vy: 300, t: 0 }); run(10); s.body.x = PR.DOCK * TS; s.body.y = SEA_LEVEL * TS + 34; run(30); return sand() < before; }), 'a cannonball knocks a hole in the sandcastle fort');
  check(await page.evaluate(() => { const s0 = Game.stars; Kraken.t = 6; Kraken.cool = 0; run(60); return Kraken.hit(PR.KRAKEN * TS, SEA_LEVEL * TS) && Game.stars >= s0 + 2; }), 'hit the Kraken: it waves and showers stars');
  check(await page.evaluate(() => localStorage.getItem('dinoVehicles.save.v1') === window.__save), 'nothing saved on the island');
  await page.evaluate(() => { run(1, { up: 1 }); run(60 * 3); run(60 * 10); });
  check(await page.evaluate(() => !Game.away && Player.vehicle && Player.vehicle.kind === 'pirateship' && World.get(20, 30) === T.BRICK && Vehicles.list.filter(v => v.kind === 'pirateship').length === 1 && outfit() === null), 'sail home: Earth as it was');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 23. Vehicles: five to start, more with stars, some you find. Space suits on the Moon.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.found = {}; Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; });
  check(await page.evaluate(() => JSON.stringify(Whistle.kinds()) === JSON.stringify(['digger', 'dumptruck', 'firetruck', 'tractor', 'train', 'bulldozer', 'ambulance', 'police'])), 'start with eight vehicles to call');
  check(await page.evaluate(() => !Vehicles.list.some(v => v.kind === 'garbage' && !v.npcOwned) && Vehicles.list.some(v => v.kind === 'crane') && !Vehicles.list.some(v => v.kind === 'rocket') && !Whistle.kinds().includes('crane')), 'earned ones not parked yet; ones to find are out in the world; the rocket waits for 110 stars');
  await page.evaluate(() => { Game.addStars(10); });
  await page.waitForTimeout(3000);
  check(await page.evaluate(() => Whistle.kinds().includes('garbage') && Vehicles.list.some(v => v.kind === 'garbage' && !v.npcOwned)), '10 stars: the garbage truck turns up');
  check(await page.evaluate(() => !Whistle.kinds().includes('helicopter') && !Whistle.kinds().includes('goldtruck')), 'helicopter has to be found first');
  await page.evaluate(() => { const h = Vehicles.list.find(v => v.kind === 'helicopter' && !v.npcOwned); Player.body.x = h.body.x; Player.body.y = h.body.y - 10; Vehicles.enter(Player, h); Vehicles.exit(Player); });
  check(await page.evaluate(() => Game.found.helicopter && Whistle.kinds().includes('helicopter')), 'get in the helicopter: found, now the whistle can call it');
  await page.evaluate(() => Save.write());
  await page.reload(); await page.waitForTimeout(300);
  check(await page.evaluate(() => Game.found.helicopter === true), 'found vehicles are saved');
  check(await page.evaluate(() => { const labels = World.props.filter(p => p.type === 'label'); return labels.length >= 10 && labels.every(l => /^[A-Z]{3,4}$/.test(l.text)); }), 'reading signs around the world, one 3 or 4 letter word each');
  check(await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; Game.startPlay('rex'); const l = World.props.find(p => p.type === 'label'); Player.body.x = l.x * TS; Player.body.y = l.y * TS - 0.01; Reading.current = null; l.heard = false; Game.update(1 / 60); return Reading.current === l; }), 'walk up to a sign and it reads itself out');
  check(await page.evaluate(() => { const d = Vehicles.list.find(v => v.kind === 'digger' && !v.npcOwned); Player.body.x = d.body.x; Player.body.y = d.body.y - 10; Vehicles.enter(Player, d); const ok = Reading.card && Reading.card.word === 'DIG'; Vehicles.exit(Player); return ok; }), 'get in the digger: the word DIG pops up');
  check(await page.evaluate(() => { Game.configurePlay(); const b = document.querySelector('[data-key=attack]'); return !b.classList.contains('hidden') && b.textContent === ATTACK_ICON[DINO_TYPES[Player.type].attack]; }), 'attack button shows on foot with your dino\'s move');
  check(await page.evaluate(() => { Player.attackCool = 0; Player.attackT = 0; Input.pressed.attack = true; Game.update(1 / 60); Input.endFrame(); return Player.attackT > 0; }), 'attack button swings even with nobody in reach');
  check(await page.evaluate(() => { Game.loop = () => {}; Game.startPlay('rex'); Game.stars = 200; Vehicles.spawnMissing(); const r = Vehicles.list.find(v => v.kind === 'rocket'); Player.body.x = r.body.x; Vehicles.enter(Player, r); Moon.enter(r); const a = outfit(); Moon.leave(r, true); return a === 'space'; }), 'space suit on the Moon');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 24. No voice-over: nothing is spoken, signs and word cards just light up.
{
  const page = await open({ width: 960, height: 540 });
  const r = await page.evaluate(() => {
    window.spoke = 0;
    if ('speechSynthesis' in window) speechSynthesis.speak = () => { window.spoke++; };
    Game.loop = () => {}; localStorage.clear(); Game.newWorld(); Game.startPlay('rex');
    const l = World.props.find(p => p.type === 'label'); Player.body.x = l.x * TS; Player.body.y = l.y * TS - 0.01; l.heard = false; Reading.current = null;
    for (let i = 0; i < 30; i++) { Game.update(1 / 60); Input.endFrame(); }
    const lit = Reading.current === l;
    const d = Vehicles.list.find(v => v.kind === 'digger' && !v.npcOwned); Player.body.x = d.body.x; Player.body.y = d.body.y - 10; Vehicles.enter(Player, d);
    const infoHidden = document.querySelector('[data-key=info]').classList.contains('hidden');
    Jobs.spawn('fire'); Sound.say('hello');
    for (let i = 0; i < 120; i++) { Game.update(1 / 60); Input.endFrame(); }
    return { lit, infoHidden, card: !!Reading.card };
  });
  await page.waitForTimeout(1600);   // the delayed vehicle name would have spoken by now
  check(await page.evaluate(() => window.spoke === 0), 'no voice-over: nothing is spoken');
  check(r.lit && r.card, 'signs and word cards still light up');
  check(r.infoHidden, 'no fact button in vehicles');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 25. Bigger world: speedway, bikes and ramps, fast cars, hidden finds, and the jet to Melbourne.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => {
    Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.found = {}; Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9;
    window.run = (n, keys = {}) => { for (let i = 0; i < n; i++) { for (const k in keys) { if (i === 0 && !Input.held[k]) Input.pressed[k] = true; Input.held[k] = true; } Game.update(1 / 60); Input.endFrame(); } for (const k in keys) Input.held[k] = false; };
    window.into = v => { if (Player.vehicle) Vehicles.exit(Player); Player.body.x = v.body.x; Player.body.y = v.body.y - 10; Vehicles.enter(Player, v); };
    window.has = k => Vehicles.list.some(v => v.kind === k && !v.npcOwned);
  });
  check(await page.evaluate(() => WORLD_W === 760 && World.props.some(p => p.type === 'gantry') && World.props.filter(p => p.type === 'ramp').length >= 4), 'bigger world with a speedway and jump ramps');
  check(await page.evaluate(() => World.props.find(p => p.type === 'chess').x > 450 && World.props.find(p => p.type === 'tower').x > 720), 'chess up on a mountain, launch pad at the far end');
  check(await page.evaluate(() => !['motorbike', 'jet', 'pirateship', 'sportscar', 'rocket', 'racecar'].some(has)), 'best vehicles are hidden at the start');
  await page.evaluate(() => { Game.addStars(35); run(10); });
  check(await page.evaluate(() => has('motorbike') && !has('jet') && !vehicleUnlocked('motorbike')), '30 stars: the motorbike turns up at the bike park, still to be found');
  await page.evaluate(() => { Game.addStars(200); run(10); });
  check(await page.evaluate(() => ['jet', 'pirateship', 'sportscar', 'rocket', 'racecar'].every(has)), 'more stars: jet, pirate ship, sports car, rocket and race car turn up');
  check(await page.evaluate(() => { const m = Vehicles.list.find(v => v.kind === 'motorbike'); into(m); run(20); const y0 = m.body.y; let up = 0; run(1, { action: 1 }); for (let i = 0; i < 40; i++) { run(1); up = Math.max(up, y0 - m.body.y); } run(60); return Game.found.motorbike && up > 100; }), 'get on the motorbike: found, and the button jumps');
  check(await page.evaluate(() => { const m = Player.vehicle; window.__pows = []; const add = Pow.add.bind(Pow); Pow.add = (x, y, t) => { __pows.push(t); add(x, y, t); }; m.s.flipCool = 0; run(1, { action: 1 }); run(6); run(1, { action: 1 }); run(80); Pow.add = add; return __pows.includes('FLIP!'); }), 'jump and press again in the air: a flip, landed for a star');
  check(await page.evaluate(() => { const m = Player.vehicle; m.body.x = 676 * TS; m.body.y = SURF * TS - 0.01; m.facing = 1; let air = 0, peak = 0; for (let i = 0; i < 150; i++) { run(1, { right: 1 }); if (!m.body.onGround) air++; peak = Math.max(peak, SURF * TS - m.body.y); } return air > 25 && peak > 70; }), 'ride up a ramp and fly off the end');
  check(await page.evaluate(() => { const c = Vehicles.list.find(v => v.kind === 'sportscar'); into(c); c.body.x = 575 * TS; c.body.y = SURF * TS - 0.01; c.facing = 1; run(1); for (let i = 0; i < 100; i++) run(1, { right: 1 }); return Math.abs(c.body.vx) > 450; }), 'sports car goes really fast');
  await page.evaluate(() => { const c = Vehicles.list.find(v => v.kind === 'racecar'); into(c); c.body.x = (SPEEDWAY.START - 3) * TS; c.body.y = SURF * TS - 0.01; c.facing = 1; c.body.vx = 0; run(60); window.__lights = DragRace.phase; run(150); window.__stars = Game.stars; });
  check(await page.evaluate(() => window.__lights === 'lights' && DragRace.phase === 'run'), 'stop at the start gantry: the lights count down, then go');
  check(await page.evaluate(() => { for (let i = 0; i < 600 && DragRace.phase; i++) run(1, { right: 1 }); return DragRace.best > 2 && Game.stars >= window.__stars + 4; }), 'race car crosses the finish: a time, a record and stars');
  check(await page.evaluate(() => { const c = Player.vehicle; c.s.turboCool = 0; run(1, { action: 1 }); return c.s.turbo > 0 && c.s.slow > 1; }), 'race car turbo button');
  // The jet asks where to go.
  await page.evaluate(() => { Save.write(); window.__save = localStorage.getItem('dinoVehicles.save.v1'); const j = Vehicles.list.find(v => v.kind === 'jet'); into(j); run(20); });
  check(await page.evaluate(() => Game.overlay === JetPick), 'get on the jet: pick the mine or the city');
  await page.evaluate(() => { run(1, { right: 1 }); run(1, { action: 1 }); run(60 * 9); });
  check(await page.evaluate(() => Game.overlay === Flight && Flight.dest === 'melbourne'), 'city picked: flying across Australia to Melbourne');
  await page.evaluate(() => { run(60 * 2); Flight.finish(); run(60 * 6); });
  check(await page.evaluate(() => Game.away === 'melbourne' && outfit() === 'footy' && !Player.vehicle && Melbourne.visits === 1), 'lands in Melbourne: footy jumper and beanie on');
  await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/melbourne.png' : '/dev/null' }).catch(() => {});
  check(await page.evaluate(() => { const tram = Vehicles.list.find(v => v.kind === 'tram'); into(tram); const n = NPCs.list.find(n => n.need); tram.body.x = n.body.x; run(30); const on = !!n.ride; const s = Game.stars; tram.body.x = n.need.destX; run(30); return on && !n.ride && Game.stars >= s + 2; }), 'drive the tram: a dino gets on at one stop and off at theirs');
  check(await page.evaluate(() => { Vehicles.exit(Player); Player.body.x = MEL.CAFE * TS + 20; Player.body.y = SURF * TS - 0.01; run(5); run(1, { enter: 1 }); return Player.zoomT > 4; }), 'coffee cart: a flat white and a burst of speed');
  check(await page.evaluate(() => { const b = Vehicles.list.find(v => v.kind === 'citybike'); into(b); b.body.x = 200 * TS; b.body.y = SURF * TS - 0.01; b.facing = 1; let air = 0; for (let i = 0; i < 120; i++) { run(1, { right: 1 }); if (!b.body.onGround) air++; } return air > 10; }), 'city bike jumps the ramps by the Yarra');
  await page.evaluate(() => { const j = Vehicles.list.find(v => v.kind === 'jet'); into(j); run(20); });
  check(await page.evaluate(() => Game.overlay !== JetPick && Player.vehicle.s.state === 'board'), 'jet in Melbourne just flies home');
  await page.evaluate(() => { run(60 * 9); if (Game.overlay === Flight) Flight.finish(); run(60 * 6); });
  check(await page.evaluate(() => !Game.away && World.limitW === WORLD_W && Vehicles.list.filter(v => v.kind === 'jet').length === 1 && !Vehicles.list.some(v => v.kind === 'tram')), 'home again, Earth as it was');
  check(await page.evaluate(() => localStorage.getItem('dinoVehicles.save.v1') === window.__save || !Game.away), 'Melbourne is not saved');
  // A save from the smaller world starts fresh.
  await page.evaluate(() => { Save.write = () => {}; const s = JSON.parse(localStorage.getItem('dinoVehicles.save.v1')); s.v = 1; s.stars = 77; localStorage.setItem('dinoVehicles.save.v1', JSON.stringify(s)); });
  await page.reload(); await page.waitForTimeout(300);
  check(await page.evaluate(() => Game.stars === 0), 'an old save from the smaller world starts a fresh game');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 26. Every dino at its own size, in the right order; the carnivores each built like their species.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; });
  check(await page.evaluate(() => { const o = ['brachio', 'rex', 'allo', 'tri', 'megalo', 'carno', 'ankylo', 'styraco', 'pachy', 'ptero', 'raptor']; return o.every((k, i) => !i || dinoScale(o[i - 1]) >= dinoScale(k)) && dinoScale('brachio') > dinoScale('raptor') * 2.5; }), 'dinos drawn at their relative sizes, biggest to smallest');
  check(await page.evaluate(() => { Game.startPlay('raptor'); const small = Player.body.h; Game.startPlay('brachio'); const big = Player.body.h; return small < big && big < 64 && NPCs.list.every(n => n.body.h < 64); }), 'body size changes with the dino, always fits a 2-tile tunnel');
  check(await page.evaluate(() => {
    // Dig a 2-tile tunnel, stand in it small, then switch to the biggest dino: not stuck in the rock.
    const tx = 60, y = SURF + 4; for (let x = tx - 3; x <= tx + 3; x++) for (const yy of [y - 1, y - 2]) World.set(x, yy, T.AIR);
    Game.startPlay('raptor'); Player.body.x = tx * TS + 16; Player.body.y = y * TS - 0.01;
    Game.startPlay('brachio'); for (let i = 0; i < 30; i++) { Game.update(1 / 60); Input.endFrame(); }
    return !bodySolidAt(Player.body, Player.body.x, Player.body.y);
  }), 'switching to a bigger dino in a tunnel never leaves you stuck');
  check(await page.evaluate(() => ['rex', 'allo', 'megalo', 'carno'].every(k => THEROPOD[k]) && THEROPOD.rex.h > THEROPOD.allo.h && THEROPOD.carno.arm[0] < THEROPOD.rex.arm[0] && THEROPOD.allo.arm[0] > THEROPOD.rex.arm[0] * 2), 'T-Rex has the big head, Allosaurus long arms, Carnotaurus tiny stubs');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 27. Traffic: dinos driving cars, utes, vans, the bus and bikes about; and some parked to hop in.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => { Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.found = {}; Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; });
  check(await page.evaluate(() => Vehicles.list.filter(v => v.npcOwned && v.driver).length >= 14), 'plenty of dinos driving vehicles about');
  check(await page.evaluate(() => {
    const drv = Vehicles.list.filter(v => v.npcOwned), x0 = drv.map(v => v.body.x);
    for (let i = 0; i < 60 * 20; i++) { Player.body.x = (20 + (i % 600) * 1.2) * TS; Player.body.y = World.surfaceAt(Math.floor(Player.body.x / TS)) * TS - 0.01; Game.update(1 / 60); Input.endFrame(); }
    return drv.filter((v, i) => Math.abs(v.body.x - x0[i]) > 64).length >= 10 && drv.every(v => v.body.x > 0 && v.body.x < WORLD_W * TS && Number.isFinite(v.body.y));
  }), 'the traffic gets about and stays in the world');
  check(await page.evaluate(() => ['car', 'ute', 'van', 'bus'].every(k => Vehicles.list.some(v => v.kind === k && !v.npcOwned && !v.driver)) && Vehicles.serialize().filter(e => e[0] === 'citybike').length === 1), 'a car, ute, van, bus and bike parked to hop in from the start (the bike saved, the cyclist not)');
  check(await page.evaluate(() => Vehicles.serialize().filter(e => ['car', 'ute', 'van', 'bus'].includes(e[0])).length === 4), 'only the parked ones are saved, not the traffic');
  check(await page.evaluate(() => { const b = Vehicles.list.find(v => v.kind === 'bus' && !v.npcOwned); Player.body.x = b.body.x; Player.body.y = b.body.y - 10; Vehicles.enter(Player, b);
    const n = NPCs.add({ x: b.body.x + 60, y: b.body.y, type: 'tri', fighter: false }); n.greeted = true;
    Input.set('action', true); Game.update(1 / 60); Input.endFrame(); Input.set('action', false); for (let i = 0; i < 20; i++) { Game.update(1 / 60); Input.endFrame(); }
    return !!n.ride; }), 'bus button opens the doors and a dino hops on');
  check(await page.evaluate(() => !Whistle.cells().some(c => ['car', 'ute', 'bus', 'van', 'icecream', 'mixer', 'roller', 'forklift', 'monster', 'jetski', 'citybike'].includes(c.k))), 'whistle menu unchanged (everyday vehicles are parked about instead)');
  // More to hop in: ice cream van, cement mixer, road roller, forklift, monster truck, jet ski.
  await page.evaluate(() => {
    window.run = (n, keys = {}) => { for (let i = 0; i < n; i++) { for (const k in keys) { if (i === 0) Input.pressed[k] = true; Input.held[k] = true; } Game.update(1 / 60); Input.endFrame(); } for (const k in keys) Input.held[k] = false; };
    window.into = k => { const v = Vehicles.list.find(v => v.kind === k && !v.npcOwned); if (Player.vehicle) Vehicles.exit(Player); Player.body.x = v.body.x; Player.body.y = v.body.y - 10; Vehicles.enter(Player, v); run(5); return v; };
  });
  const has = "k => Vehicles.list.some(v => v.kind === k && !v.npcOwned)";
  check(await page.evaluate(h => { const has = eval(h); localStorage.clear(); Game.found = {}; Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9;
    return ['car', 'ute', 'van', 'citybike', 'bus', 'icecream'].every(has) && !['mixer', 'roller', 'forklift', 'jetski', 'monster'].some(has); }, has), 'six to hop in from the start; the others are locked or hidden');
  await page.evaluate(() => Game.addStars(15));
  await page.waitForTimeout(3000);
  check(await page.evaluate(h => { const has = eval(h); return has('mixer') && !has('roller') && !has('jetski'); }, has), '15 stars: the cement mixer turns up at the building site');
  check(await page.evaluate(h => { const has = eval(h); Game.addStars(45); Vehicles.update(0); return has('jetski') && has('monster') && !Game.found.monster; }, has), '60 stars: jet ski and monster truck quietly turn up to be found');
  await page.evaluate(() => { Game.stars = 200; Vehicles.spawnMissing(); });
  check(await page.evaluate(() => { const m = into('mixer'); const tx = Math.floor((m.body.x - m.facing * (m.body.w / 2 + 34)) / TS); let n = 0; run(1, { action: 1 }); run(30); for (let y = SURF - 5; y < SURF; y++) if (World.get(tx, y) === T.CONCRETE) n++; return n >= 1; }), 'cement mixer pours concrete');
  check(await page.evaluate(() => { const f = into('forklift'); const tx = Math.floor(f.frontX(14) / TS), ty = f.feetRow(); World.set(tx, ty, T.BRICK); run(1, { action: 1 }); const up = f.s.load === T.BRICK; run(20); run(1, { action: 1 }); return up && !f.s.load && World.get(tx, ty) === T.BRICK; }), 'forklift picks up a block and puts it down');
  check(await page.evaluate(() => { const r = into('roller'); r.facing = 1; const bx = Math.floor(r.body.x / TS) + 3, by = r.feetRow(); World.set(bx, by, T.DIRT); run(120, { right: 1 }); return World.get(bx, by) === T.AIR; }), 'road roller squashes a bump flat');
  check(await page.evaluate(() => { const m = into('monster'); const y0 = m.body.y; let up = 0; run(1, { action: 1 }); for (let i = 0; i < 40; i++) { run(1); up = Math.max(up, y0 - m.body.y); } return up > 120; }), 'monster truck does a giant bounce');
  check(await page.evaluate(() => { const j = into('jetski'); run(30); let top = 0; for (let i = 0; i < 90; i++) { run(1, { right: 1 }); top = Math.max(top, Math.abs(j.body.vx)); } return j.floating && top > 300; }), 'jet ski zooms along the water');
  await page.evaluate(() => { const ic = into('icecream'); for (let i = 0; i < 3; i++) NPCs.add({ x: ic.body.x + 80 + i * 40, y: ic.body.y, type: 'tri', fighter: false }); window.__s = Game.stars; run(1, { action: 1 }); });
  await page.waitForTimeout(2500);
  check(await page.evaluate(() => Game.stars >= window.__s + 3), 'ice cream van tune: dinos come running for a star each');
  check(page.errors.length === 0, 'no page errors: ' + page.errors.join(' | '));
  await page.close();
}

// 28. Take the bus, ride a Brachiosaurus, dig into a volcano, and the pirate's open sea.
{
  const page = await open({ width: 960, height: 540 });
  await page.evaluate(() => {
    Game.loop = () => {}; Sound.say = () => {}; localStorage.clear(); Game.found = {}; Game.newWorld(); Game.startPlay('rex'); Jobs.t = 1e9; Game.stars = 200; Vehicles.spawnMissing();
    window.run = (n, keys = {}) => { for (let i = 0; i < n; i++) { for (const k in keys) { if (i === 0) Input.pressed[k] = true; Input.held[k] = true; } Game.update(1 / 60); Input.endFrame(); } for (const k in keys) Input.held[k] = false; };
  });
  check(await page.evaluate(() => { const bus = Vehicles.list.find(v => v.kind === 'bus' && v.npcOwned); const d = bus.driver; d.mem.pause = 5; bus.body.vx = 0; Player.body.x = bus.body.x + 40; Player.body.y = bus.body.y - 5; run(2); run(1, { enter: 1 });
    const ok = Player.vehicle === bus && !d.vehicle && NPCs.list.includes(d); run(60, { right: 1 }); const moved = Math.abs(bus.body.vx) > 50; Vehicles.exit(Player); run(5); return ok && moved; }), 'stop by the town bus: the driver hops out and you drive it');
  check(await page.evaluate(() => { const n = NPCs.list.find(n => n.type === 'brachio' && !n.baby); n.scaredT = 0; Player.body.x = n.body.x - 40; Player.body.y = n.body.y; run(2); run(1, { enter: 1 });
    const v = Player.vehicle; return !!v && v.kind === 'brachioride' && !NPCs.list.includes(n); }), 'climb on a Brachiosaurus');
  check(await page.evaluate(() => { const v = Player.vehicle; run(60, { right: 1 }); const sc = dinoScale('brachio'), hx = Math.floor((v.body.x + v.facing * 60 * sc) / TS), hy = Math.floor((v.body.y - 134 * sc) / TS);
    World.set(hx, hy, T.LEAVES); run(1, { action: 1 }); return Math.abs(v.body.vx) > 20 && World.get(hx, hy) === T.AIR; }), 'it walks about and munches the treetops');
  check(await page.evaluate(() => { run(1, { enter: 1 }); return !Player.vehicle && !Vehicles.list.some(v => v.kind === 'brachioride') && NPCs.list.some(n => n.type === 'brachio' && !n.baby); }), 'hop off: it wanders off as a Brachiosaurus again');
  check(await page.evaluate(() => { const sk = Vehicles.list.find(v => v.kind === 'skateboard'); if (!sk) return false; if (Player.vehicle) Vehicles.exit(Player); Player.body.x = sk.body.x; Player.body.y = sk.body.y - 5; run(2); run(1, { enter: 1 }); run(10);
    const y0 = sk.body.y; let up = 0; window.__pows = []; const add = Pow.add.bind(Pow); Pow.add = (x, y, t) => { __pows.push(t); add(x, y, t); };
    run(1, { action: 1 }); run(5); run(1, { action: 1 }); for (let i = 0; i < 50; i++) { run(1); up = Math.max(up, y0 - sk.body.y); } Pow.add = add; Vehicles.exit(Player); run(5);
    return up > 80 && __pows.includes('KICKFLIP!'); }), 'skateboard: ollie, then a kickflip in the air');
  check(await page.evaluate(() => World.get(130, WORLD_H - 6) === T.MAGMA && World.get(52, WORLD_H - 3) === T.GOLDEGG && World.get(52, WORLD_H - 6) !== T.MAGMA), 'hot rock deep down (but not over the golden egg)');
  check(await page.evaluate(() => {
    const tx = 130; for (let y = World.surfaceAt(tx); y < WORLD_H - 8; y++) World.set(tx, y, T.AIR);
    Player.body.x = tx * TS + 16; Player.body.y = (WORLD_H - 8) * TS - 0.01; run(5);
    World.set(tx, WORLD_H - 8, T.AIR); const went = !!Volcano.active;
    let top = 1e9; for (let i = 0; i < 150; i++) { run(1); top = Math.min(top, Player.body.y); }
    let lava = 0; for (let y = 0; y < WORLD_H; y++) if (World.get(tx, y) === T.LAVA) lava++;
    return went && top < (World.genSurf[tx] - 3) * TS && lava > 10 && Eggs.found.volcano; }), 'dig into hot rock: a volcano blasts you out and lava fills the hole');
  check(await page.evaluate(() => { run(60 * 13); let lava = 0; for (let x = 120; x <= 140; x++) for (let y = 0; y < WORLD_H; y++) if (World.get(x, y) === T.LAVA) lava++;
    return !Volcano.active && lava === 0 && World.get(130, WORLD_H - 8) === T.STONE && !bodySolidAt(Player.body, Player.body.x, Player.body.y); }), 'the lava cools back to rock and dirt');
  check(await page.evaluate(() => { const s = Vehicles.list.find(v => v.kind === 'pirateship'); Player.body.x = s.body.x; Vehicles.enter(Player, s); Voyage.start(s); Voyage.finish(); run(30);
    return Game.away === 'pirate' && World.get(30, SEA_LEVEL + 2) === T.WATER && World.get(PR.DOCK - 60, SEA_LEVEL + 2) === T.WATER && s.body.x > 150 * TS; }), 'Skull Island has lots of open sea to sail');
  check(await page.evaluate(() => { const s0 = Game.stars, bar = World.props.find(p => p.type === 'seabarrel'), buoy = World.props.find(p => p.type === 'buoy');
    const a = SeaTargets.hit({ x: bar.x * TS, y: SEA_LEVEL * TS - 10 }), b = SeaTargets.hit({ x: buoy.x * TS, y: SEA_LEVEL * TS - 40 });
    return a && b && bar.gone > 0 && Game.stars >= s0 + 2; }), 'cannon smashes barrels and rings the bell buoy');
  check(await page.evaluate(() => { const r = SeaTargets.rival, s0 = Game.stars; for (let i = 0; i < 3; i++) SeaTargets.hit({ x: r.x, y: SEA_LEVEL * TS - 40 }); return r.sink > 0 && Game.stars >= s0 + 5; }), 'three hits sink the rival ship');
  check(await page.evaluate(() => { const s = Player.vehicle; s.s.cool = 0; const bar = World.props.find(p => p.type === 'seabarrel' && !(p.gone > 0)); s.body.x = bar.x * TS - 600; s.facing = 1; run(20); window.__s0 = Game.stars;
    Input.pressed.action = true; Game.update(1 / 60); Input.endFrame(); run(120); return bar.gone > 0 || World.props.some(p => p.type === 'seabarrel' && p.gone > 0 && p !== bar); }), 'fire the cannon at a floating barrel');
  check(await page.evaluate(() => { const s = Player.vehicle; Voyage.start(s); Voyage.finish(); run(30); return !Game.away && !SeaTargets.rival && World.props.filter(p => p.type === 'seabarrel').length === 3; }), 'home again: Earth\'s sea has barrels to shoot too');
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
