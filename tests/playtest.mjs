// Kid-style playtest bot: plays the real game at fast-forward like a 5-year-old would
// (mashing buttons, wandering, calling vehicles, sometimes chasing jobs) and reports
// bugs, stuck spots and how often fun things happen.
// Run: node tests/playtest.mjs [minutesPerSession] [shotDir]
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = pw.chromium || pw.default.chromium;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const minutes = +(process.argv[2] || 5);
const shotDir = process.argv[3] || null;
if (shotDir) fs.mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
await page.waitForTimeout(300);

// Everything below runs inside the page.
await page.evaluate(() => {
  Game.loop = () => {};   // stop the real-time loop; the bot drives updates itself
  Sound.say = () => {};
  window.Bot = {
    start(seed, type, goalBias) {
      const rng = mulberry32(seed);
      Math.random = rng;
      localStorage.clear();
      Game.newWorld();
      Game.stars = 0;
      Game.startPlay(type);
      Object.assign(this, {
        rng, goalBias, t: 0, steps: 0,
        hold: {}, plan: { dir: 0, until: 0 }, mashUntil: 0, upUntil: 0, downUntil: 0,
        nextWhistle: 20 + rng() * 30, exitAt: 0,
        events: [], issues: [], frame: [], firstStar: null, lastReward: 0, longestGap: 0,
        lastStars: 0, jobsSeen: {}, jobsDone: {}, unlocks: {}, vehiclesUsed: {},
        stuck: { x: 0, t: 0, dir: 0 }, maxDepth: 0, pickups: 0,
      });
      if (!this.wrapped) {
        this.wrapped = true;
        const origFinish = Jobs.finish.bind(Jobs);
        Jobs.finish = job => { this.jobsDone[job.kind] = (this.jobsDone[job.kind] || 0) + 1; this.reward('job ' + job.kind); origFinish(job); };
        const origSpawn = Jobs.spawn.bind(Jobs);
        Jobs.spawn = kind => { const j = origSpawn(kind); if (j) this.jobsSeen[kind] = (this.jobsSeen[kind] || 0) + 1; return j; };
      }
    },
    reward(what) {
      const gap = this.t - this.lastReward;
      if (gap > this.longestGap) { this.longestGap = gap; this.longestGapAt = Math.round(this.lastReward); }
      this.lastReward = this.t;
    },
    key(k, on) { if (!!this.hold[k] !== on) { Input.set(k, on); this.hold[k] = on; } },
    issue(kind, extra) {
      if (this.issues.filter(i => i.kind === kind).length >= 3) return;
      this.issues.push(Object.assign({ kind, t: Math.round(this.t), x: Math.round(Player.cx / TS), y: Math.round(Player.cy / TS), veh: Player.vehicle && Player.vehicle.kind }, extra));
    },
    goalX() {
      const job = Jobs.list[0];
      if (!job) return null;
      return Jobs.goal(job).x;
    },
    decide() {
      const r = this.rng, t = this.t;
      if (Game.overlay === Whistle) {
        const kinds = Whistle.kinds();
        Whistle.pick(kinds[Math.floor(r() * kinds.length)]);
        return;
      }
      if (t > this.plan.until) {
        const g = this.goalX();
        let dir;
        if (g !== null && r() < this.goalBias) dir = Math.sign(g - Player.cx) || 1;
        else dir = r() < 0.15 ? 0 : r() < 0.5 ? -1 : 1;
        this.plan = { dir, until: t + 0.5 + r() * 3.5 };
      }
      if (r() < 0.02) this.mashUntil = t + 0.1 + r() * 2;
      if (r() < 0.01) this.upUntil = t + 0.2 + r() * 2.5;
      if (r() < 0.006) this.downUntil = t + 0.2 + r() * 1.5;
      if (r() < 0.004) Input.set('roar', true), Input.set('roar', false);
      if (r() < 0.004) Game.tap(r() * W, 80 + r() * (H - 160));
      // Call a vehicle now and then, hop in, and later hop out.
      if (!Player.vehicle && t > this.nextWhistle && !Game.overlay) {
        this.nextWhistle = t + 30 + r() * 40;
        Whistle.open();
      }
      if (!Player.vehicle && !Game.overlay) {
        const near = Vehicles.nearest(Player.body.x, Player.body.y - 28, 120, v => !v.driver);
        if (near && r() < 0.05) { Vehicles.enter(Player, near); this.exitAt = t + 15 + r() * 40; this.vehiclesUsed[near.kind] = (this.vehiclesUsed[near.kind] || 0) + 1; }
      }
      if (Player.vehicle && t > this.exitAt && !Game.overlay && r() < 0.05) Vehicles.exit(Player);
      // A kid who follows the jobs: taps the job arrow (which brings the right vehicle), hops in,
      // drives toward the goal and presses the action button when close.
      const job = Jobs.list[0];
      if (job && r() < this.goalBias * 0.02 && !Game.overlay && !(Player.vehicle && Player.vehicle.kind === job.def.vehicle)) {
        Jobs.callFor(job);
        const v = Vehicles.nearest(Player.body.x, Player.body.y - 28, 400, v => v.kind === job.def.vehicle && !v.driver);
        if (v) { Player.body.x = v.body.x; Vehicles.enter(Player, v); this.exitAt = t + 60; this.vehiclesUsed[v.kind] = (this.vehiclesUsed[v.kind] || 0) + 1; }
      }
      if (job && Player.vehicle && Player.vehicle.kind === job.def.vehicle && r() < this.goalBias) {
        const g = Jobs.goal(job), dx = g.x - Player.cx;
        this.plan = { dir: Math.abs(dx) < 60 ? 0 : Math.sign(dx), until: t + 0.3 };
        if (Math.abs(dx) < 400) this.mashUntil = t + 0.5;
        if (Player.vehicle.def.mover === 'air') { this.upUntil = g.y < Player.cy - 40 ? t + 0.2 : 0; this.downUntil = g.y > Player.cy + 40 ? t + 0.2 : 0; }
      }
      // Rocket: always blast off once inside.
      if (Player.vehicle && Player.vehicle.kind === 'rocket' && Player.vehicle.s.state === 'idle' && r() < 0.05) { Input.set('action', true); Input.set('action', false); }
    },
    check() {
      const nums = [Player.cx, Player.cy, Game.cam.x, Game.cam.y, Game.zoom];
      for (const v of Vehicles.list) nums.push(v.body.x, v.body.y);
      for (const n of NPCs.list) nums.push(n.body.x, n.body.y);
      if (nums.some(v => !Number.isFinite(v))) this.issue('nan');
      if (Player.cy > (WORLD_H - 1) * TS) this.issue('fell out of world');
      if (!Player.vehicle && bodySolidAt(Player.body, Player.body.x, Player.body.y)) this.issue('inside solid');
      for (const v of Vehicles.list) {
        if (v.body.y > (WORLD_H - 1) * TS || v.body.x < 0 || v.body.x > WORLD_W * TS) this.issue('vehicle out of world', { k: v.kind });
      }
      this.maxDepth = Math.max(this.maxDepth, Math.round(Player.cy / TS) - SURF);
      // Stuck: holding one direction on foot for 15s without getting anywhere.
      const dir = this.plan.dir;
      if (!Player.vehicle && dir && !Game.overlay) {
        if (dir !== this.stuck.dir || Math.abs(Player.cx - this.stuck.x) > TS * 1.5) this.stuck = { x: Player.cx, t: this.t, dir };
        else if (this.t - this.stuck.t > 15) {
          const b = Player.body, fx = Math.floor((b.x + dir * 20) / TS), fy = Math.floor(b.y / TS);
          let wall = 0; for (let k = 1; k < 12 && World.solid(fx, fy - k); k++) wall = k;
          this.issue('stuck on foot', { dir, wall, depth: fy - (World.genSurf[fx] || SURF) });
          this.stuck.t = this.t;
        }
      } else this.stuck = { x: Player.cx, t: this.t, dir: 0 };
      this.pickups = Pickups.list.filter(p => p.gone > 0).length > this.pickups ? Pickups.list.filter(p => p.gone > 0).length : this.pickups;
      if (Game.stars > this.lastStars) {
        if (this.firstStar === null) this.firstStar = Math.round(this.t);
        for (const k of VEHICLE_ORDER) { const u = VEHICLE_DEFS[k].unlock; if (u > this.lastStars && u <= Game.stars) this.unlocks[k] = Math.round(this.t); }
        this.lastStars = Game.stars;
        this.reward('star');
      }
    },
    run(seconds) {
      const end = this.t + seconds;
      while (this.t < end) {
        this.decide();
        const t = this.t;
        this.key('left', this.plan.dir < 0);
        this.key('right', this.plan.dir > 0);
        this.key('action', t < this.mashUntil && Math.floor(t * 6) % 3 !== 0);
        this.key('up', t < this.upUntil);
        this.key('down', t < this.downUntil);
        const a = performance.now();
        Game.update(1 / 60);
        if (this.steps % 4 === 0) { ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); }
        this.frame.push(performance.now() - a);
        Input.endFrame();
        this.t += 1 / 60; this.steps++;
        if (this.steps % 30 === 0) this.check();
      }
    },
    report() {
      const f = this.frame.slice().sort((a, b) => a - b);
      const gapEnd = this.t - this.lastReward;
      if (gapEnd > this.longestGap) { this.longestGap = gapEnd; this.longestGapAt = Math.round(this.lastReward); }
      let saveBytes = 0; try { Save.write(); saveBytes = (localStorage.getItem(SAVE_KEY) || '').length; } catch (e) {}
      return {
        stars: Game.stars, firstStar: this.firstStar, longestGap: Math.round(this.longestGap), longestGapAt: this.longestGapAt,
        unlocks: this.unlocks, jobsSeen: this.jobsSeen, jobsDone: this.jobsDone, vehiclesUsed: this.vehiclesUsed,
        floatingStarsCaughtAtOnce: this.pickups, issues: this.issues, maxDepth: this.maxDepth, saveKB: Math.round(saveBytes / 1024),
        frameAvg: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(2), frameP99: +f[Math.floor(f.length * 0.99)].toFixed(1),
      };
    },
  };
});

const sessions = [];
const types = await page.evaluate(() => DINO_KEYS);
types.forEach((type, i) => sessions.push({ name: type, seed: 1000 + i, type, goalBias: 0.35 }));
sessions.push({ name: 'job-chaser', seed: 77, type: 'rex', goalBias: 0.85 });

const totals = { issues: 0, errors: 0 };
for (const s of sessions) {
  await page.evaluate(s => Bot.start(s.seed, s.type, s.goalBias), s);
  const chunks = Math.round(minutes * 2);
  for (let i = 0; i < chunks; i++) {
    await page.evaluate(() => Bot.run(30));
    if (shotDir && i % 2 === 1) {
      await page.evaluate(() => { ctx.setTransform(viewK, 0, 0, viewK, 0, 0); Game.draw(ctx); });
      await page.screenshot({ path: path.join(shotDir, `${s.name}-${String((i + 1) * 30).padStart(4, '0')}s.png`) });
    }
  }
  const r = await page.evaluate(() => Bot.report());
  totals.issues += r.issues.length;
  console.log(`\n== ${s.name} (${minutes} min) ==`);
  console.log(JSON.stringify(r, null, 1).replace(/\n\s*/g, ' '));
}
totals.errors = errors.length;
if (errors.length) console.log('\nPAGE ERRORS:\n' + [...new Set(errors)].slice(0, 10).join('\n'));
console.log(`\n${totals.issues} issue(s), ${totals.errors} page error(s)`);
await browser.close();
process.exit(totals.issues || totals.errors ? 1 : 0);
