// Box physics against the tile grid. Bodies use x = centre, y = bottom (feet).
function makeBody(x, y, w, h) {
  return { x, y, w, h, vx: 0, vy: 0, onGround: false, inWater: false, hitWall: 0, stepped: 0 };
}

function boxSolid(l, t, r, b) {
  const x0 = Math.floor(l / TS), x1 = Math.floor((r - 0.01) / TS);
  const y0 = Math.floor(t / TS), y1 = Math.floor((b - 0.01) / TS);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (World.solid(x, y)) return true;
  return false;
}
function bodySolidAt(b, x, y) { return boxSolid(x - b.w / 2, y - b.h, x + b.w / 2, y); }

// opts: { step: max tiles to auto-climb, gravity: multiplier, float: true to bob in water }
function moveBody(b, dt, opts = {}) {
  const g = opts.gravity === undefined ? 1 : opts.gravity;
  b.inWater = World.waterPx(b.x, b.y - b.h * 0.4);
  if (b.inWater) {
    b.vy += GRAVITY * g * 0.35 * dt;
    b.vx *= 1 - 2.5 * dt; b.vy *= 1 - 3 * dt;
    if (opts.float) b.vy -= GRAVITY * 0.7 * dt;
  } else b.vy += GRAVITY * g * dt;
  b.vy = clamp(b.vy, -1400, 1400);

  b.hitWall = 0;
  b.stepped = 0;
  // Horizontal, in small sub-steps.
  let dx = b.vx * dt;
  const sx = Math.sign(dx);
  while (dx !== 0) {
    const s = Math.abs(dx) > 8 ? 8 * sx : dx;
    const nx = b.x + s;
    if (!bodySolidAt(b, nx, b.y)) { b.x = nx; dx -= s; continue; }
    // Try to climb a ledge.
    let climbed = false;
    const steps = opts.step || 0;
    if (steps && (b.onGround || b.inWater)) {
      for (let k = 1; k <= steps; k++) {
        const ny = Math.floor(b.y / TS) * TS - (k - 1) * TS - 0.01;
        if (!bodySolidAt(b, nx, ny) && !bodySolidAt(b, b.x, ny)) {
          b.stepped = b.y - ny; b.y = ny; b.x = nx; dx -= s; climbed = true; break;
        }
      }
    }
    if (climbed) continue;
    b.hitWall = sx; b.vx = 0;
    // Snap flush to the wall.
    if (sx > 0) b.x = Math.floor((b.x + b.w / 2 + s) / TS) * TS - b.w / 2 - 0.01;
    else b.x = Math.floor((b.x - b.w / 2 + s) / TS) * TS + TS + b.w / 2 + 0.01;
    if (bodySolidAt(b, b.x, b.y)) b.x -= s;   // safety: never end inside a wall
    break;
  }

  // Vertical.
  let dy = b.vy * dt;
  const sy = Math.sign(dy);
  b.onGround = false;
  while (dy !== 0) {
    const s = Math.abs(dy) > 8 ? 8 * sy : dy;
    const ny = b.y + s;
    if (!bodySolidAt(b, b.x, ny)) { b.y = ny; dy -= s; continue; }
    if (sy > 0) { b.y = Math.floor(ny / TS) * TS - 0.01; b.onGround = true; }
    else b.y = Math.floor((ny - b.h) / TS) * TS + TS + b.h + 0.01;
    b.vy = 0;
    break;
  }
  if (!b.onGround && sy >= 0 && bodySolidAt(b, b.x, b.y + 1)) b.onGround = true;

  // Unstick if a tile was placed on us.
  if (bodySolidAt(b, b.x, b.y)) {
    for (let k = 1; k < 40; k++) if (!bodySolidAt(b, b.x, b.y - k * 4)) { b.y -= k * 4; break; }
  }
  b.x = clamp(b.x, TS + b.w / 2, (WORLD_W - 1) * TS - b.w / 2);
}
