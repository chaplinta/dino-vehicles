// Dinosaur types and their parametric cartoon drawing.
const DINO_TYPES = {
  rex:     { name: 'T-Rex', say: 'T-Rex!', body: '#5ccf4a', dark: '#3b9b2f', belly: '#e3f7a6', legs: 2, attack: 'bite' },
  tri:     { name: 'Triceratops', say: 'Triceratops!', body: '#ff9f40', dark: '#e0761b', belly: '#ffe2b0', legs: 4, horn: '#fff3d6', attack: 'headbutt' },
  stego:   { name: 'Stegosaurus', say: 'Stegosaurus!', body: '#6f8dff', dark: '#4a63d8', belly: '#d6e2ff', legs: 4, accent: '#ff6b81', attack: 'tail' },
  brachio: { name: 'Brachiosaurus', say: 'Brachiosaurus!', body: '#c77dff', dark: '#9b4fd9', belly: '#f1d9ff', legs: 4, attack: 'tail' },
  raptor:  { name: 'Raptor', say: 'Velociraptor!', body: '#20c9b5', dark: '#139a8a', belly: '#d5fff8', legs: 2, accent: '#ffd43b', attack: 'bite' },
  ankylo:  { name: 'Ankylosaurus', say: 'Ankylosaurus!', body: '#c49a62', dark: '#93703f', belly: '#f3dfc2', legs: 4, accent: '#e9c46a', attack: 'tail' },
  ptero:   { name: 'Pterodactyl', say: 'Pterodactyl! I can fly!', body: '#ff6b6b', dark: '#d64545', belly: '#ffe3e3', legs: 2, accent: '#ffd43b', flies: true, attack: 'bite' },
};
const DINO_KEYS = Object.keys(DINO_TYPES);
const ATTACK_ICON = { bite: '🦷', headbutt: '💥', tail: '🌀' };

function drawEye(c, x, y, r, blink, look = 1.5) {
  if (blink) {
    c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y + r * 0.6, x + r, y);
    c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    return;
  }
  ell(c, x, y, r, r, '#fff', 3);
  ell(c, x + look, y, r * 0.5, r * 0.55, OUT, 0);
  ell(c, x + look + r * 0.2, y - r * 0.25, r * 0.18, r * 0.18, '#fff', 0);
}
function drawMouth(c, x, y, roar, w = 8) {
  if (roar) { ell(c, x, y + 2, w * 0.9, w * 0.75, '#8b1e2d', 3); ell(c, x, y + 4, w * 0.5, w * 0.3, '#ff8fa3', 0); }
  else { c.beginPath(); c.arc(x - 2, y - 4, w, 0.35, Math.PI - 0.7); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke(); }
}

function drawDinoHead(c, type, hx, hy, d, o) {
  const roar = o.roar > 0, blink = o.blink;
  switch (type) {
    case 'rex': {
      if (roar) ell(c, hx + 10, hy + 12, 18, 10, '#8b1e2d', 0);
      c.save(); c.translate(hx - 14, hy + 6); c.rotate(roar ? 0.45 : 0.06);
      rbox(c, 0, -6, 46, 14, 7, d.body);
      if (roar) for (let i = 0; i < 4; i++) poly(c, [12 + i * 8, -6, 16 + i * 8, -12, 20 + i * 8, -6], '#fff', 2);
      c.restore();
      rbox(c, hx - 24, hy - 20, 56, 30, 13, d.body);
      for (let i = 0; i < 4; i++) poly(c, [hx + 4 + i * 7, hy + 9, hx + 7 + i * 7, hy + 15, hx + 10 + i * 7, hy + 9], '#fff', 2);
      drawEye(c, hx - 4, hy - 8, 7.5, blink);
      limb(c, [hx - 12, hy - 18, hx + 4, hy - 19], 3, d.dark, 0);
      ell(c, hx + 25, hy - 10, 2, 2, OUT, 0);
      break;
    }
    case 'raptor': {
      for (let i = 0; i < 3; i++) poly(c, [hx - 16 + i * 7, hy - 10, hx - 22 + i * 7, hy - 24, hx - 10 + i * 7, hy - 11], d.accent, 2);
      if (roar) ell(c, hx + 12, hy + 8, 16, 8, '#8b1e2d', 0);
      c.save(); c.translate(hx - 10, hy + 4); c.rotate(roar ? 0.4 : 0.05);
      rbox(c, 0, -4, 40, 10, 5, d.body); c.restore();
      rbox(c, hx - 20, hy - 13, 50, 20, 9, d.body);
      for (let i = 0; i < 4; i++) poly(c, [hx + 6 + i * 6, hy + 6, hx + 8 + i * 6, hy + 11, hx + 10 + i * 6, hy + 6], '#fff', 2);
      drawEye(c, hx - 2, hy - 5, 6.5, blink);
      break;
    }
    case 'tri': {
      ell(c, hx - 16, hy - 6, 24, 30, d.dark);
      for (let i = 0; i < 5; i++) {
        const a = -1.9 + i * 0.75;
        ell(c, hx - 16 + Math.cos(a) * 22, hy - 6 + Math.sin(a) * 27, 4, 4, d.horn, 2);
      }
      ell(c, hx + 4, hy, 24, 17, d.body);
      poly(c, [hx + 22, hy - 6, hx + 37, hy + 2, hx + 22, hy + 10], d.horn, 3);
      poly(c, [hx - 6, hy - 12, hx + 2, hy - 15, hx + 16, hy - 42], d.horn, 3);
      poly(c, [hx + 6, hy - 13, hx + 13, hy - 15, hx + 26, hy - 38], d.horn, 3);
      poly(c, [hx + 18, hy - 11, hx + 25, hy - 11, hx + 27, hy - 25], d.horn, 3);
      drawEye(c, hx + 2, hy - 4, 6.5, blink);
      drawMouth(c, hx + 14, hy + 8, roar, 7);
      break;
    }
    case 'ptero': {
      poly(c, [hx - 10, hy - 6, hx - 40, hy - 20, hx - 8, hy - 14], d.accent, 3);
      if (roar) poly(c, [hx + 10, hy + 2, hx + 44, hy + 10, hx + 10, hy + 14], '#8b1e2d', 3);
      poly(c, [hx + 8, hy - 6, hx + 48, hy + 2, hx + 8, hy + 6], d.accent, 3);
      ell(c, hx, hy, 16, 13, d.body);
      drawEye(c, hx + 1, hy - 3, 6, blink);
      break;
    }
    default: { // stego, brachio, ankylo
      if (type === 'brachio') ell(c, hx - 4, hy - 12, 10, 8, d.body);
      if (type === 'ankylo') { poly(c, [hx - 14, hy - 8, hx - 26, hy - 18, hx - 10, hy - 14], d.accent, 2); }
      ell(c, hx + 4, hy, 21, 14, d.body);
      if (type === 'ankylo') poly(c, [hx + 18, hy - 4, hx + 30, hy + 2, hx + 18, hy + 8], d.belly, 3);
      drawEye(c, hx + 1, hy - 4, 6.5, blink);
      drawMouth(c, hx + 14, hy + 6, roar, 7);
      ell(c, hx + 21, hy - 4, 1.8, 1.8, OUT, 0);
    }
  }
}

// Full body, feet at (x,y). o: { t, walk, flip, roar, flap, blinkSeed }
function drawDino(c, x, y, s, type, o = {}) {
  const d = DINO_TYPES[type] || DINO_TYPES.rex;
  const t = o.t || 0;
  const blink = ((t + (o.blinkSeed || 0)) % 3.7) < 0.13;
  const sw = Math.sin(o.walk || 0) * 9;
  const bob = Math.abs(Math.cos(o.walk || 0)) * (o.walk ? 3 : 0);
  const oo = { roar: o.roar, blink };
  c.save(); c.translate(x, y); c.scale(o.flip ? -s : s, s);
  c.translate(0, -bob);
  const tailWag = Math.sin(t * 3) * 4;

  if (type === 'ptero') {
    const flap = o.flap || 0;
    const wingY = -52 + Math.sin(flap) * 30;
    poly(c, [-2, -54, -46, wingY - 8, -24, wingY + 14, 0, -40], d.dark, 3);
    limb(c, [-6, -24, -8 + sw * 0.4, 0], 6, d.dark);
    ell(c, 0, -38, 16, 22, d.body);
    ell(c, 4, -34, 8, 13, d.belly, 0);
    limb(c, [6, -24, 6 - sw * 0.4, 0], 6, d.body);
    limb(c, [4, -54, 10, -66], 12, d.body);
    drawDinoHead(c, type, 14, -72, d, oo);
    poly(c, [2, -54, 46, wingY - 6, 26, wingY + 16, 4, -40], d.body, 3);
    c.restore();
    return;
  }

  if (d.legs === 2) {
    const slim = type === 'raptor';
    c.beginPath(); c.moveTo(-8, -60); c.quadraticCurveTo(-50, -60, -78, -46 + tailWag);
    c.quadraticCurveTo(-46, -44, -6, -36); c.closePath(); fillStroke(c, d.body);
    if (slim) poly(c, [-74, -46 + tailWag, -86, -52 + tailWag, -82, -42 + tailWag], d.accent, 2);
    limb(c, [-4, -40, 2 - sw, -18, 8 - sw * 1.2, -2], slim ? 9 : 13, d.dark);
    ell(c, 14 - sw * 1.2, -4, slim ? 10 : 13, 6, d.dark);
    ell(c, 2, -52, slim ? 22 : 27, slim ? 19 : 23, d.body, 4, -0.35);
    ell(c, 12, -48, slim ? 9 : 12, slim ? 11 : 14, d.belly, 0, -0.35);
    limb(c, [-2, -42, 4 + sw, -18, 10 + sw * 1.2, -2], slim ? 10 : 15, d.body);
    ell(c, 16 + sw * 1.2, -4, slim ? 11 : 14, 6, d.body);
    limb(c, [14, -64, 22, -76, 26, -84], slim ? 14 : 20, d.body);
    drawDinoHead(c, type, slim ? 34 : 32, slim ? -88 : -90, d, oo);
    limb(c, [18, -56, 28, -50, 33, -55], 6, d.body);
    if (slim) poly(c, [18, -56, 24, -46, 28, -52], d.accent, 2);
  } else {
    const brach = type === 'brachio';
    c.beginPath(); c.moveTo(-28, -56); c.quadraticCurveTo(-64, -50, -92, -30 + tailWag);
    c.quadraticCurveTo(-60, -34, -28, -32); c.closePath(); fillStroke(c, d.body);
    if (type === 'stego') {
      poly(c, [-86, -32 + tailWag, -96, -44 + tailWag, -90, -28 + tailWag], '#fff3d6', 2);
      poly(c, [-78, -36 + tailWag, -84, -50 + tailWag, -74, -34 + tailWag], '#fff3d6', 2);
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + 0.35 + i * 0.5, px = Math.cos(a) * 36, py = -48 + Math.sin(a) * 22;
        const ox = Math.cos(a) * 18, oy = Math.sin(a) * 18;
        poly(c, [px - 8, py + 4, px + ox, py + oy - 4, px + 8, py + 2], d.accent, 3);
      }
    }
    if (type === 'ankylo') ell(c, -92, -30 + tailWag, 11, 9, d.accent);
    limb(c, [-22, -36, -22 - sw * 0.7, 0], 13, d.dark);
    limb(c, [22, -36, 22 + sw * 0.7, 0], 13, d.dark);
    ell(c, 0, -46, 40, brach ? 26 : 24, d.body);
    ell(c, 6, -36, 26, 10, d.belly, 0);
    if (type === 'ankylo') {
      for (let i = 0; i < 6; i++) ell(c, -28 + i * 11, -64 + Math.abs(i - 2.5) * 2, 6, 5, d.accent, 2);
    }
    limb(c, [-14, -34, -14 + sw * 0.7, 0], 14, d.body);
    limb(c, [28, -34, 28 - sw * 0.7, 0], 14, d.body);
    if (brach) {
      limb(c, [28, -58, 50, -96, 50, -128], 20, d.body);
      drawDinoHead(c, type, 58, -134, d, oo);
    } else {
      limb(c, [26, -54, 40, -60], 22, d.body);
      drawDinoHead(c, type, type === 'tri' ? 52 : 50, -62, d, oo);
    }
  }
  c.restore();
}

// Upper body only, for sitting in vehicles. Seat point at (x,y), facing right.
function drawDinoSeated(c, x, y, s, type, o = {}) {
  const d = DINO_TYPES[type] || DINO_TYPES.rex;
  const t = o.t || 0;
  const blink = ((t + (o.blinkSeed || 0)) % 3.7) < 0.13;
  const oo = { roar: o.roar, blink };
  const neck = type === 'brachio' ? 40 : 0;
  const hx = 20, hy = -52 - neck;
  c.save(); c.translate(x, y); c.scale(o.flip ? -s : s, s);
  if (type === 'stego') {
    [[-22, -14], [-22, -32], [-14, -46], [-2, -56]].forEach(([px, py]) =>
      poly(c, [px - 6, py + 8, px - 20, py - 12, px + 6, py - 2], d.accent, 3));
  }
  if (type === 'ankylo') for (let i = 0; i < 4; i++) ell(c, -20 + i * 3, -36 + i * 9, 6, 5, d.accent, 2);
  if (type === 'ptero') poly(c, [-4, -34, -40, -18, -20, 0, 0, -10], d.dark, 3);
  if (type === 'raptor') for (let i = 0; i < 3; i++) poly(c, [-14, -34 + i * 10, -28, -40 + i * 10, -16, -26 + i * 10], d.accent, 2);
  limb(c, [2, -30, hx - 8, hy + 10], type === 'brachio' ? 18 : 20, d.body);
  ell(c, 0, -12, 24, 30, d.body);
  ell(c, 9, -8, 12, 20, d.belly, 0);
  const hxx = type === 'tri' ? hx + 2 : hx;
  drawDinoHead(c, type, hxx, type === 'ptero' ? hy + 8 : hy, d, oo);
  limb(c, [8, -20, 24, -10, 34, -14], 9, d.body);
  c.restore();
}
