// Core constants, maths helpers, seeded RNG, noise and particles.
let W = 960;               // widens on wide screens (phones), see resize()
const H = 540;
const TS = 32;                 // tile size in px
const WORLD_W = 600, WORLD_H = 80;
const GRAVITY = 1800;
const TAU = Math.PI * 2;
const OUT = '#2b2233';         // cartoon outline colour
const FONT = '"Arial Rounded MT Bold","Chalkboard SE","Comic Sans MS",system-ui,sans-serif';

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1D value noise, deterministic per seed.
function makeNoise1D(seed) {
  const rng = mulberry32(seed);
  const vals = new Float32Array(1024);
  for (let i = 0; i < vals.length; i++) vals[i] = rng() * 2 - 1;
  return function (x) {
    const i = Math.floor(x), f = x - i;
    const a = vals[i & 1023], b = vals[(i + 1) & 1023];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

// Simple particle system shared by everything.
const Fx = {
  list: [],
  add(p) {
    const q = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 1, r: 5, color: '#fff',
      shape: 'circle', rot: 0, vr: 0, drag: 0 }, p);
    q.max = q.life;
    this.list.push(q);
  },
  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(o.speed * 0.4, o.speed);
      this.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), g: o.g || 0,
        life: rand(o.life * 0.6, o.life), r: rand(o.r * 0.6, o.r),
        color: Array.isArray(o.color) ? pick(o.color) : o.color,
        shape: o.shape || 'circle', vr: rand(-6, 6), drag: o.drag || 0 });
    }
  },
  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) { l.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
  },
  draw(c) {
    for (const p of this.list) {
      c.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1);
      if (p.shape === 'star') drawStar(c, p.x, p.y, p.r, p.rot, p.color, 0);
      else if (p.shape === 'rect') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillStyle = p.color; c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); c.restore();
      } else {
        const r = p.shape === 'grow' ? p.r * (1 + (1 - p.life / p.max) * 1.5) : p.r;
        c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fillStyle = p.color; c.fill();
      }
    }
    c.globalAlpha = 1;
  },
};
