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

await browser.close();
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
