// Dinosaur types and their parametric cartoon drawing.
const DINO_TYPES = {
  rex:     { name: 'T-Rex', say: 'T-Rex!', body: '#339af0', dark: '#1971c2', belly: '#d0ebff', legs: 2, heavy: true, attack: 'bite' },
  tri:     { name: 'Triceratops', say: 'Triceratops!', body: '#51cf66', dark: '#2f9e44', belly: '#d3f9d8', legs: 4, horn: '#fff3d6', attack: 'headbutt' },
  stego:   { name: 'Stegosaurus', say: 'Stegosaurus!', body: '#40c057', dark: '#2b8a3e', belly: '#d3f9d8', legs: 4, accent: '#ff6b81', attack: 'tail' },
  brachio: { name: 'Brachiosaurus', say: 'Brachiosaurus!', body: '#c77dff', dark: '#9b4fd9', belly: '#f1d9ff', legs: 4, attack: 'tail' },
  raptor:  { name: 'Deinonychus', say: 'Deinonychus! Sickle claw kick!', body: '#4263eb', dark: '#2b3fb0', belly: '#dbe4ff', legs: 2, accent: '#74c0fc', feathers: true, attack: 'kick' },
  ankylo:  { name: 'Ankylosaurus', say: 'Ankylosaurus!', body: '#8b5a2b', dark: '#6e4520', belly: '#f3dfc2', legs: 4, accent: '#fcc419', attack: 'tail' },
  ptero:   { name: 'Pterodactyl', say: 'Pterodactyl! I can fly!', body: '#ff6b6b', dark: '#d64545', belly: '#ffe3e3', legs: 2, accent: '#ffd43b', flies: true, attack: 'peck' },
  styraco: { name: 'Styracosaurus', say: 'Styracosaurus! Look at my spiky frill!', body: '#f06595', dark: '#c2255c', belly: '#ffdeeb', legs: 4, horn: '#fff3d6', attack: 'headbutt' },
  pachy:   { name: 'Pachycephalosaurus', say: 'Pachycephalosaurus! I have a hard head!', body: '#e8590c', dark: '#a33d08', belly: '#ffe8cc', legs: 2, dome: '#7f4f24', horn: '#fff3d6', attack: 'headbutt' },
  iguano:  { name: 'Iguanodon', say: 'Iguanodon! I have spiky thumbs!', body: '#228be6', dark: '#1864ab', belly: '#ffe066', legs: 2, heavy: true, spike: '#ffe066', attack: 'thumb' },
  megalo:  { name: 'Megalosaurus', say: 'Megalosaurus! The first dinosaur ever named!', body: '#fa5252', dark: '#c92a2a', belly: '#ffe3e3', legs: 2, attack: 'bite' },
  carno:   { name: 'Carnotaurus', say: 'Carnotaurus! The bull with horns!', body: '#e03131', dark: '#a51111', belly: '#ffc9c9', legs: 2, horn: '#fff3d6', attack: 'bite' },
  allo:    { name: 'Allosaurus', say: 'Allosaurus!', body: '#fd7e14', dark: '#d9480f', belly: '#ffe8cc', legs: 2, accent: '#e03131', stripes: true, attack: 'bite' },
  bary:    { name: 'Baryonyx', say: 'Baryonyx! Big claws for catching fish!', body: '#1c7ed6', dark: '#1864ab', belly: '#d0ebff', legs: 2, accent: '#fd7e14', stripes: true, attack: 'claw' },
};
DINO_TYPES.alien = { name: 'Moon dino', say: 'Hello Moon dino!', body: '#94e044', dark: '#5fae2e', belly: '#e6ffd0', legs: 2, accent: '#ff6bd6', antenna: true, hidden: true, attack: 'bite' };
const DINO_KEYS = Object.keys(DINO_TYPES).filter(k => !DINO_TYPES[k].hidden);
// Relative sizes (T-Rex = 1), in the real order by body length but squashed so the small ones
// are still easy to see and the big ones still fit through tunnels and doors.
const DINO_SIZE = { brachio: 1.5, rex: 1, iguano: 0.9, allo: 0.9, tri: 0.88, stego: 0.88, bary: 0.86, megalo: 0.86,
  carno: 0.82, ankylo: 0.78, styraco: 0.7, alien: 0.7, pachy: 0.6, ptero: 0.55, raptor: 0.5 };
const DINO_BASE = 0.62;
function dinoScale(type, baby) { return DINO_BASE * (DINO_SIZE[type] || 1) * (baby ? 0.65 : 1); }
// Collision box: grows with size, but never 2 tiles tall, so everyone fits a dug tunnel.
function dinoBox(type, baby) {
  const k = clamp(DINO_SIZE[type] || 1, 0.62, 1.12) * (baby ? 0.65 : 1);
  return { w: k < 0.7 ? 22 : 28, h: Math.min(62, Math.round(56 * k)) };
}
// Height of the top of the head above the feet, in drawing units (multiply by the scale).
const HEAD_TOP = { brachio: 150, tri: 100, styraco: 108, stego: 84, ankylo: 80, ptero: 90, raptor: 100 };
function dinoTop(type, s) { return (HEAD_TOP[type] || 112) * s; }
const ATTACK_ICON = { bite: '🦷', headbutt: '💥', tail: '🌀', peck: '🐦', thumb: '👍', claw: '🐾', kick: '🦶' };
const THEROPOD_HEADS = new Set(['rex', 'megalo', 'allo', 'carno']);
// The big meat-eaters, each built like its species. Skull box (x, top, w, h, corner), lower jaw
// (length, thickness), teeth (count, size), eye (x, y, r), brow thickness, arms [upper, lower, thickness], claws.
const THEROPOD = {
  // Huge deep boxy skull, banana teeth, small eye set back under a heavy brow; tiny two-fingered arms.
  rex:    { x: -28, top: -27, w: 66, h: 38, r: 14, jaw: 56, jawT: 16, teeth: 5, tooth: 4, ex: -8, ey: -13, er: 6.5, brow: 5, arm: [6, 5, 5], claws: 2, claw: 5 },
  // Long, low, narrow skull with little horns in front of the eyes; long arms with three big hooks.
  allo:   { x: -22, top: -17, w: 64, h: 25, r: 11, jaw: 54, jawT: 11, teeth: 6, tooth: 3, ex: -6, ey: -8, er: 7, brow: 3, arm: [14, 12, 6], claws: 3, claw: 9 },
  // Long skull with a curved top and a brow bump; strong arms with three claws.
  megalo: { x: -22, top: -19, w: 60, h: 28, r: 14, jaw: 50, jawT: 12, teeth: 5, tooth: 3.5, ex: -4, ey: -8, er: 7, brow: 4, arm: [13, 10, 7], claws: 3, claw: 8 },
  // Short, deep, blunt face under thick bull horns; arms so small they're just stubs.
  carno:  { x: -24, top: -24, w: 46, h: 34, r: 12, jaw: 36, jawT: 14, teeth: 3, tooth: 3.5, ex: -6, ey: -10, er: 7, brow: 4, arm: [4, 3, 5], claws: 0, claw: 0 },
};

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

// On a mine site everyone wears hi-vis and a hard hat.
function onSite() { return outfit() === 'hivis'; }
// What everyone wears where: hi-vis at the mine, pirate gear on the island, space suits on the Moon,
// a footy jumper and beanie in Melbourne.
function outfit() {
  if (typeof Game === 'undefined') return null;
  return { pilbara: 'hivis', pirate: 'pirate', moon: 'space', melbourne: 'footy' }[Game.away] || null;
}
function pickOutfit(o, type) {
  if (type === 'alien') return null;   // Moon dinos live there
  if (o.outfit !== undefined) return o.outfit;
  if (o.hivis !== undefined) return o.hivis ? 'hivis' : null;
  return outfit();
}
function drawVest(c, x, y, rx, ry, rot, bands, fill = '#ff7a1a', band = '#e9ecef') {
  c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.clip();
  c.fillStyle = fill; c.fillRect(x - rx - 4, y - ry - 4, rx * 2 + 8, ry * 2 + 8);
  c.fillStyle = band; for (const by of bands) c.fillRect(x - rx - 4, by, rx * 2 + 8, 5);
  c.restore();
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); fillStroke(c, null, 4);
}
// The body part of an outfit: hi-vis vest, space suit or stripy pirate shirt.
function drawSuit(c, fit, x, y, rx, ry, rot, bands) {
  if (fit === 'hivis') drawVest(c, x, y, rx, ry, rot, bands);
  else if (fit === 'space') { drawVest(c, x, y, rx, ry, rot, bands, '#f1f3f5', '#adb5bd'); ell(c, x + rx * 0.35, y - ry * 0.3, 5, 4, '#4dabf7', 2); }
  else if (fit === 'pirate') drawVest(c, x, y, rx, ry, rot, [bands[0] - 6, bands[0] + 4, bands[1] + 4], '#f8f9fa', '#e03131');
  else if (fit === 'footy') drawVest(c, x, y, rx, ry, rot, [bands[0] - 2, bands[1] + 2], '#1c3f8f', '#e03131');
}
// Woolly beanie with a pom-pom, in footy colours.
function drawBeanie(c, cx, top) {
  c.beginPath(); c.moveTo(cx - 20, top + 6); c.quadraticCurveTo(cx - 20, top - 20, cx, top - 20); c.quadraticCurveTo(cx + 20, top - 20, cx + 20, top + 6); c.closePath();
  fillStroke(c, '#1c3f8f', 3);
  rbox(c, cx - 22, top, 44, 9, 4, '#e03131', 3);
  ell(c, cx, top - 22, 7, 7, '#fff', 3);
}
function drawTricorn(c, cx, top, captain) {
  if (captain) poly(c, [cx - 4, top - 10, cx - 20, top - 34, cx - 8, top - 12], '#e03131', 2);   // feather
  poly(c, [cx - 26, top + 5, cx - 12, top - 16, cx + 12, top - 16, cx + 26, top + 5, cx, top - 1], '#212529', 3);
  c.strokeStyle = '#fcc419'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 22, top + 2); c.lineTo(cx, top - 3); c.lineTo(cx + 22, top + 2); c.stroke();
  ell(c, cx, top - 8, 4, 3.5, '#fff', 0); c.fillStyle = '#212529'; c.fillRect(cx - 2, top - 9, 1.5, 1.5); c.fillRect(cx + 1, top - 9, 1.5, 1.5);
}
function drawHelmet(c, x, y, r) {
  ell(c, x, y, r, r, 'rgba(190,235,255,0.35)', 4);
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, r * 0.75, -2.6, -1.9); c.stroke();
  rbox(c, x - r * 0.6, y + r * 0.85, r * 1.2, 7, 3, '#adb5bd', 3);
}
function drawHardHat(c, cx, top) {
  c.beginPath(); c.arc(cx, top + 3, 15, Math.PI, 0); c.closePath(); fillStroke(c, '#f8f9fa', 3);
  rbox(c, cx - 21, top, 42, 6, 3, '#f8f9fa', 3);
  limb(c, [cx - 2, top - 10, cx + 8, top - 8], 3, '#dee2e6', 0);
}

// A claw or spike from (x, y) pointing at angle a; curl bends the tip round like a hook.
function drawSpike(c, x, y, a, len, w, curl, fill = '#fff3d6') {
  const px = -Math.sin(a) * w, py = Math.cos(a) * w;
  const tx = x + Math.cos(a + curl) * len, ty = y + Math.sin(a + curl) * len;
  const mx = x + Math.cos(a) * len * 0.6, my = y + Math.sin(a) * len * 0.6;
  c.beginPath(); c.moveTo(x + px, y + py); c.quadraticCurveTo(mx + px * 0.6, my + py * 0.6, tx, ty);
  c.quadraticCurveTo(mx - px * 0.3, my - py * 0.3, x - px, y - py); c.closePath(); fillStroke(c, fill, 2.5);
}
// A big pink tongue poking out and wiggling (k: 0..1 through the lick).
function drawTongue(c, x, y, k, t) {
  const out = Math.sin(k * Math.PI) * (0.7 + 0.3 * Math.abs(Math.sin(k * Math.PI * 3)));
  const L = 30 * out, wig = Math.sin(t * 28) * 0.35;
  const mx = x + Math.cos(wig * 0.5) * L * 0.5, my = y + 4 + Math.sin(wig * 0.5) * L * 0.5;
  const ex = x + Math.cos(wig) * L, ey = y + 8 + Math.sin(wig) * L - Math.sin(k * Math.PI * 4) * 6;
  limb(c, [x, y, mx, my, ex, ey], 11, '#ff8fab', 3);
  ell(c, ex, ey, 7, 6, '#ff8fab', 3);
  c.strokeStyle = '#e64980'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 2, y + 1); c.lineTo(mx, my); c.stroke();
}
const TONGUE_AT = { pachy: [24, 10], rex: [28, 10], megalo: [28, 7], allo: [32, 6], carno: [14, 10], raptor: [26, 5], tri: [26, 6], styraco: [26, 6], ptero: [30, 4], stego: [18, 6], brachio: [18, 6], ankylo: [20, 6], alien: [26, 8], bary: [40, 6], iguano: [32, 4] };

function drawDinoHead(c, type, hx, hy, d, o) {
  const roar = o.roar > 0 || o.lick > 0, blink = o.blink;
  if (d.antenna) {
    // Bobbing antenna for Moon dinos.
    const wob = Math.sin((o.t || 0) * 5) * 4;
    limb(c, [hx - 4, hy - 16, hx - 8 + wob, hy - 34, hx - 4 + wob, hy - 44], 3, d.dark, 2);
    ell(c, hx - 4 + wob, hy - 46, 6, 6, d.accent, 3);
  }
  switch (type) {
    case 'rex': case 'megalo': case 'allo': case 'carno': {
      const P = THEROPOD[type], x0 = hx + P.x, y0 = hy + P.top, bot = y0 + P.h;
      if (roar) ell(c, x0 + P.w * 0.55, bot + 2, P.w * 0.32, P.jawT * 0.7, '#8b1e2d', 0);
      // Lower jaw, swinging open to roar.
      c.save(); c.translate(x0 + 10, bot - P.jawT * 0.45); c.rotate(roar ? 0.45 : 0.06);
      rbox(c, 0, -P.jawT / 2, P.jaw, P.jawT, P.jawT / 2, d.body);
      if (roar) for (let i = 0; i < P.teeth; i++) { const tx = P.jaw * 0.3 + i * (P.jaw * 0.6 / P.teeth); poly(c, [tx, -P.jawT / 2, tx + P.tooth, -P.jawT / 2 - P.tooth * 1.6, tx + P.tooth * 2, -P.jawT / 2], '#fff', 2); }
      c.restore();
      if (type === 'megalo') ell(c, x0 + P.w * 0.45, y0 + 4, P.w * 0.42, 8, d.body, 4);   // curved top of the skull
      rbox(c, x0, y0, P.w, P.h, P.r, d.body);
      // Upper teeth along the front half of the jaw.
      for (let i = 0; i < P.teeth; i++) { const tx = x0 + P.w * 0.4 + i * (P.w * 0.55 / P.teeth); poly(c, [tx, bot - 1, tx + P.tooth, bot - 1 + P.tooth * 1.6, tx + P.tooth * 2, bot - 1], '#fff', 2); }
      drawEye(c, hx + P.ex, hy + P.ey, P.er, blink);
      limb(c, [hx + P.ex - 9, hy + P.ey - P.er - 3, hx + P.ex + 8, hy + P.ey - P.er - 4], P.brow, d.dark, 0);
      ell(c, x0 + P.w - 7, y0 + 8, type === 'rex' ? 3 : 2, 2, OUT, 0);
      if (type === 'rex') {
        // Bumpy brow and cheek: a really heavy head.
        ell(c, hx + P.ex + 2, y0 + 1, 7, 4, d.dark, 0);
        ell(c, x0 + 12, bot - 9, 9, 6, d.dark, 0);
      } else if (type === 'allo') {
        // Little horns in front of the eyes and a bumpy ridge down the snout.
        poly(c, [hx + P.ex - 6, y0 + 1, hx + P.ex - 1, y0 - 12, hx + P.ex + 5, y0 + 1], d.accent, 3);
        for (let i = 0; i < 5; i++) ell(c, hx + 6 + i * 6, y0 - 1, 3, 2.5, d.dark, 0);
      } else if (type === 'carno') {
        // Two thick bull horns over the eyes, sticking out sideways.
        poly(c, [x0 + 2, y0 + 4, x0 - 14, y0 - 12, x0 + 4, y0 - 4], d.horn, 3);
        poly(c, [x0 + 14, y0 + 2, x0 + 18, y0 - 18, x0 + 26, y0 + 2], d.horn, 3);
      } else if (type === 'megalo') {
        poly(c, [hx + P.ex - 6, y0 - 1, hx + P.ex, y0 - 8, hx + P.ex + 6, y0 - 1], d.dark, 2);   // brow bump
        for (const [sx, sy] of [[12, -10], [22, -3], [4, 2]]) ell(c, hx + sx, hy + sy, 3.5, 2.5, d.dark, 0);
      }
      break;
    }
    case 'bary': {
      // Long, low crocodile snout full of teeth, rosette at the tip, little crest.
      if (roar) { c.save(); c.translate(hx + 4, hy + 6); c.rotate(0.35); rbox(c, 0, -3, 46, 8, 4, d.body); c.restore(); }
      rbox(c, hx - 18, hy - 15, 32, 24, 11, d.body);
      rbox(c, hx + 6, hy - 6, 42, 12, 6, d.body);
      ell(c, hx + 46, hy, 7, 7, d.body, 4);
      poly(c, [hx + 12, hy - 6, hx + 18, hy - 15, hx + 24, hy - 6], d.dark, 3);
      for (let i = 0; i < 5; i++) poly(c, [hx + 12 + i * 7, hy + 5, hx + 14 + i * 7, hy + 10, hx + 16 + i * 7, hy + 5], '#fff', 1.5);
      drawEye(c, hx - 4, hy - 6, 6.5, blink);
      break;
    }
    case 'iguano': {
      // Long horse-like head ending in a toothless beak.
      ell(c, hx - 2, hy - 2, 20, 15, d.body);
      rbox(c, hx + 4, hy - 8, 30, 16, 8, d.body);
      poly(c, [hx + 30, hy - 7, hx + 40, hy + 1, hx + 30, hy + 8], '#e9c46a', 3);
      drawEye(c, hx - 2, hy - 6, 6.5, blink);
      drawMouth(c, hx + 22, hy + 4, roar, 7);
      ell(c, hx + 31, hy - 3, 1.8, 1.8, OUT, 0);
      break;
    }
    case 'styraco': {
      // Frill ringed with long spikes, one big horn on the nose.
      for (let i = 0; i < 6; i++) {
        const a = -2.6 + i * 0.42, bx = hx - 16 + Math.cos(a) * 20, by = hy - 6 + Math.sin(a) * 24;
        poly(c, [bx - Math.sin(a) * 6, by + Math.cos(a) * 6, bx + Math.cos(a) * 26, by + Math.sin(a) * 26, bx + Math.sin(a) * 6, by - Math.cos(a) * 6], d.horn, 2.5);
      }
      ell(c, hx - 16, hy - 6, 24, 28, d.dark);
      ell(c, hx + 4, hy, 24, 17, d.body);
      poly(c, [hx + 22, hy - 6, hx + 37, hy + 2, hx + 22, hy + 10], d.horn, 3);
      poly(c, [hx + 10, hy - 14, hx + 20, hy - 15, hx + 30, hy - 50], d.horn, 3);
      drawEye(c, hx + 2, hy - 4, 6.5, blink);
      drawMouth(c, hx + 14, hy + 8, roar, 7);
      break;
    }
    case 'pachy': {
      // A thick bony dome for head-butting, ringed with little knobs.
      ell(c, hx + 6, hy + 4, 20, 12, d.body);
      ell(c, hx - 2, hy - 13, 19, 16, d.dome);
      ell(c, hx - 6, hy - 19, 6, 4, 'rgba(255,255,255,0.25)', 0);
      for (let i = 0; i < 6; i++) { const a = Math.PI * 0.8 + i * 0.32; ell(c, hx - 2 + Math.cos(a) * 20, hy - 6 + Math.sin(a) * 6 + 6, 3.5, 3.5, d.horn, 2); }
      drawEye(c, hx + 6, hy + 2, 6, blink);
      drawMouth(c, hx + 18, hy + 10, roar, 6);
      break;
    }
    case 'raptor': {
      if (d.feathers) for (let i = 0; i < 4; i++) ell(c, hx - 20 + i * 6, hy - 14 - (i % 2) * 3, 3.5, 10, i % 2 ? d.accent : d.dark, 2, -0.6);
      else for (let i = 0; i < 3; i++) poly(c, [hx - 16 + i * 7, hy - 10, hx - 22 + i * 7, hy - 24, hx - 10 + i * 7, hy - 11], d.accent, 2);
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
  if (o.lick > 0) { const m = TONGUE_AT[type] || [22, 6]; drawTongue(c, hx + m[0], hy + m[1], o.lick, o.t || 0); }
  const fit = o.outfit;
  if (fit === 'hivis' || fit === 'pirate' || fit === 'footy') {
    const at = { pachy: [-2, -27], rex: [0, -27], megalo: [2, -22], allo: [4, -18], carno: [6, -24], raptor: [4, -13], tri: [4, -16], styraco: [4, -16], ptero: [0, -12], bary: [-2, -15], iguano: [0, -17] }[type] || [4, -13];
    if (fit === 'hivis') drawHardHat(c, hx + at[0], hy + at[1] - 2);
    else if (fit === 'footy') drawBeanie(c, hx + at[0], hy + at[1] + 2);
    else {
      // Eye patch over the eye, strap round the head, tricorn on top.
      const e = EYE_AT[type] || [1, -4];
      limb(c, [hx + e[0] - 16, hy + e[1] - 10, hx + e[0], hy + e[1], hx + e[0] + 14, hy + e[1] + 8], 2.5, '#212529', 0);
      ell(c, hx + e[0], hy + e[1], 7.5, 7, '#212529', 0);
      drawTricorn(c, hx + at[0], hy + at[1] - 2, o.captain);
    }
  } else if (fit === 'space') {
    const h = HELMET_AT[type] || [6, -2, 30];
    drawHelmet(c, hx + h[0], hy + h[1], h[2]);
  }
}
const EYE_AT = { pachy: [6, 2], rex: [-8, -13], megalo: [-4, -8], allo: [-6, -8], carno: [-6, -10], raptor: [-2, -5], tri: [2, -4], styraco: [2, -4], ptero: [1, -3], bary: [-4, -6], iguano: [-2, -6], stego: [1, -4], brachio: [1, -4], ankylo: [1, -4] };
const HELMET_AT = { pachy: [2, -6, 34], rex: [4, -6, 40], megalo: [6, -2, 36], allo: [8, -2, 37], carno: [0, -8, 34], raptor: [6, -3, 31], tri: [0, -6, 38], styraco: [2, -8, 42], ptero: [10, -4, 32], bary: [12, -4, 38], iguano: [10, -2, 32] };

// Full body, feet at (x,y). o: { t, walk, flip, roar, flap, blinkSeed }
function drawDino(c, x, y, s, type, o = {}) {
  const d = DINO_TYPES[type] || DINO_TYPES.rex;
  const t = o.t || 0;
  const blink = ((t + (o.blinkSeed || 0)) % 3.7) < 0.13;
  const sw = Math.sin(o.walk || 0) * 9;
  const bob = Math.abs(Math.cos(o.walk || 0)) * (o.walk ? 3 : 0);
  const fit = pickOutfit(o, type), hv = !!fit;
  const oo = { roar: o.roar, blink, t, outfit: fit, captain: o.captain, lick: o.lick || 0 };
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
    if (hv) drawSuit(c, fit, 0, -38, 16, 22, 0, [-44, -32]);
    limb(c, [6, -24, 6 - sw * 0.4, 0], 6, d.body);
    limb(c, [4, -54, 10, -66], 12, d.body);
    drawDinoHead(c, type, 14, -72, d, oo);
    poly(c, [2, -54, 46, wingY - 6, 26, wingY + 16, 4, -40], d.body, 3);
    c.restore();
    return;
  }

  if (d.legs === 2) {
    const slim = type === 'raptor', heavy = !!d.heavy, T = THEROPOD[type], lean = type === 'carno';
    const pose = o.pose || {};
    c.beginPath(); c.moveTo(-8, -60); c.quadraticCurveTo(-50, -60, -78, -46 + tailWag);
    c.quadraticCurveTo(-46, -44, -6, -36); c.closePath(); fillStroke(c, d.body);
    if (d.feathers) {
      // A fan of feathers on the end of the tail.
      for (let i = 0; i < 5; i++) { const a = Math.PI + (i - 2) * 0.28; ell(c, -78 + Math.cos(a) * 12, -46 + tailWag + Math.sin(a) * 12, 13, 4.5, i % 2 ? d.accent : d.dark, 2, a); }
    } else if (slim) poly(c, [-74, -46 + tailWag, -86, -52 + tailWag, -82, -42 + tailWag], d.accent, 2);
    limb(c, [-4, -40, 2 - sw, -18, 8 - sw * 1.2, -2], slim ? 9 : lean ? 10 : 13, d.dark);
    ell(c, 14 - sw * 1.2, -4, slim ? 10 : 13, 6, d.dark);
    const brx = slim ? 22 : heavy ? 31 : lean ? 23 : 27, bry = slim ? 19 : heavy ? 26 : lean ? 20 : 23;
    ell(c, 2, -52, brx, bry, d.body, 4, -0.35);
    if (d.stripes) {
      c.save(); c.beginPath(); c.ellipse(2, -52, brx, bry, -0.35, 0, TAU); c.clip();
      c.fillStyle = d.accent; for (let i = 0; i < 3; i++) c.fillRect(-20 + i * 12, -80, 5, 50);
      c.restore(); c.beginPath(); c.ellipse(2, -52, brx, bry, -0.35, 0, TAU); fillStroke(c, null, 4);
    }
    if (type === 'carno') for (let i = 0; i < 5; i++) ell(c, -16 + i * 8, -72 + Math.abs(i - 2) * 2, 3.5, 3, d.dark, 0);
    ell(c, 12, -48, slim ? 9 : 12, slim ? 11 : 14, d.belly, 0, -0.35);
    if (hv) drawSuit(c, fit, 2, -52, brx, bry, -0.35, [-58, -46]);
    // Front leg: walking, or kicked out with the sickle claw up (raptor kick).
    const kick = pose.kind === 'kick' ? pose.e : 0;
    const kx = lerp(4 + sw, 22, kick), ky = lerp(-18, -50, kick), fx = lerp(10 + sw * 1.2, 46, kick), fy = lerp(-2, -40, kick);
    limb(c, [-2, -42, kx, ky, fx, fy], slim ? 10 : lean ? 12 : 15, d.body);
    ell(c, fx + 6, fy - 2, slim ? 11 : 14, 6, d.body, 4, -kick * 0.6);
    if (slim) {
      const s2 = 1 + kick * 0.8;
      poly(c, [fx + 2, fy - 4, fx + 2 + 6 * s2, fy - 4 - 12 * s2, fx + 9, fy - 2], '#fff3d6', 2);   // sickle claw
    }
    limb(c, [14, -64, 22, -76, 26, -84], slim ? 14 : type === 'rex' ? 25 : 20, d.body);
    drawDinoHead(c, type, slim ? 34 : 32, slim ? -88 : -90, d, oo);
    // Arm: thumb jab (Iguanodon), claw slash (Baryonyx) or just hanging.
    const sx0 = 18, sy0 = -56;
    let ang = 0.5, bend = 0.6, L1 = T ? T.arm[0] : type === 'bary' ? 14 : heavy ? 13 : 11, L2 = T ? T.arm[1] : type === 'bary' ? 15 : heavy ? 10 : 8;
    if (pose.kind === 'thumb') {
      // Cocked back (e < 0), then punched straight out (e = 1).
      const e = pose.e;
      if (e < 0) { ang = 0.5 - e * 2.2; bend = 1.6; }
      else { ang = lerp(0.5, -0.1, e); bend = lerp(0.6, 0, e); L1 += e * 10; L2 += e * 14; }
    }
    if (pose.kind === 'claw') ang = pose.a;
    const ex = sx0 + Math.cos(ang) * L1, ey = sy0 + Math.sin(ang) * L1;
    const ha = ang - bend, hx2 = ex + Math.cos(ha) * L2, hy2 = ey + Math.sin(ha) * L2;
    limb(c, [sx0, sy0, ex, ey, hx2, hy2], T ? T.arm[2] : type === 'bary' ? 9 : heavy ? 8 : 6, d.body);
    if (T) for (let i = 0; i < T.claws; i++) drawSpike(c, hx2, hy2, ha + 0.5 - i * 0.45, T.claw, 3, 0.5);
    if (type === 'iguano') drawSpike(c, hx2, hy2, ha - 0.5, pose.kind === 'thumb' && pose.e > 0.5 ? 20 : 14, 5, 0, d.spike);
    if (d.feathers) for (let i = 0; i < 3; i++) {
      // Long feathers hanging off the arm, like a little wing.
      const fx = lerp(sx0, hx2, 0.3 + i * 0.25), fy = lerp(sy0, hy2, 0.3 + i * 0.25);
      ell(c, fx - 4, fy + 9, 4, 11, i % 2 ? d.accent : d.dark, 2, 0.5);
    }
    if (type === 'bary') drawSpike(c, hx2, hy2, ha + 0.5, 22, 7, 0.5);   // big curved thumb claw
    if (o.captain) {
      // Captain's hook.
      c.strokeStyle = '#ced4da'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(hx2, hy2); c.lineTo(hx2 + Math.cos(ha) * 8, hy2 + Math.sin(ha) * 8); c.arc(hx2 + Math.cos(ha) * 8 + Math.cos(ha + 1.57) * 6, hy2 + Math.sin(ha) * 8 + Math.sin(ha + 1.57) * 6, 6, ha - 1.57, ha + 2.2); c.stroke();
    }
    if (o.cutlass) {
      // A curved pirate cutlass held out along the arm.
      const ba = ha - 0.4, L = 34;
      c.save(); c.translate(hx2, hy2); c.rotate(ba);
      c.beginPath(); c.moveTo(4, -3); c.quadraticCurveTo(L * 0.6, -8, L, -2); c.quadraticCurveTo(L * 0.6, 2, 4, 3); c.closePath(); fillStroke(c, '#dee2e6', 2.5);
      rbox(c, -4, -6, 6, 12, 2, '#fcc419', 2);
      c.restore();
    }
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
    if (hv) drawSuit(c, fit, 0, -46, 40, brach ? 26 : 24, 0, [-54, -42]);
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
      drawDinoHead(c, type, type === 'tri' || type === 'styraco' ? 52 : 50, -62, d, oo);
    }
  }
  c.restore();
}

// Upper body only, for sitting in vehicles. Seat point at (x,y), facing right.
function drawDinoSeated(c, x, y, s, type, o = {}) {
  const d = DINO_TYPES[type] || DINO_TYPES.rex;
  const t = o.t || 0;
  const blink = ((t + (o.blinkSeed || 0)) % 3.7) < 0.13;
  const fit = pickOutfit(o, type), hv = !!fit;
  const oo = { roar: o.roar, blink, t, outfit: fit, captain: o.captain };
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
  if (hv) drawSuit(c, fit, 0, -12, 24, 30, 0, [-22, -6]);
  const hxx = type === 'tri' || type === 'styraco' ? hx + 2 : hx;
  drawDinoHead(c, type, hxx, type === 'ptero' ? hy + 8 : hy, d, oo);
  limb(c, [8, -20, 24, -10, 34, -14], 9, d.body);
  c.restore();
}
