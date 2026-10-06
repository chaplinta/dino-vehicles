// Tile types. Draw functions paint one 32px tile at (x,y) in a chunk canvas.
const T = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, BEDROCK: 6, WOOD: 7, BRICK: 8,
  GLASS: 9, ROAD: 10, RAIL: 11, BONE: 12, EGG: 13, GEM: 14, FOSSIL: 15, LEAVES: 16, TRUNK: 17,
  CROP: 18, ROOF: 19, CONCRETE: 20, FLOWER: 21,
  MOONDUST: 22, MOONROCK: 23, CRYSTAL: 24, CHEESE: 25, GOLDEGG: 26,
};

// Per-tile hash so textures look varied but stable.
function tileHash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function speckle(c, x, y, tx, ty, color, n, size) {
  c.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = tileHash(tx * 7 + i, ty * 13 - i), b = tileHash(tx * 3 - i, ty * 5 + i * 11);
    c.fillRect(x + 3 + a * (TS - 6 - size), y + 3 + b * (TS - 6 - size), size, size);
  }
}

function treasureTile(base, draw) {
  return (c, x, y, tx, ty) => { TILES[base].draw(c, x, y, tx, ty); draw(c, x + TS / 2, y + TS / 2); };
}

const TILES = [];
function defTile(id, o) {
  TILES[id] = Object.assign({ solid: true, dig: true, hard: 1, fluid: false, falls: false, back: false,
    treasure: false, name: '', draw: null }, o);
}

defTile(T.AIR, { name: 'air', solid: false, dig: false, draw: null });
defTile(T.GRASS, { name: 'grass', draw(c, x, y, tx, ty) {
  TILES[T.DIRT].draw(c, x, y, tx, ty);
  c.fillStyle = '#5cc84a'; c.fillRect(x, y, TS, 10);
  c.fillStyle = '#48b038';
  for (let i = 0; i < 4; i++) c.fillRect(x + i * 8 + 2, y + 9, 4, 3 + tileHash(tx + i, ty) * 4);
  c.fillStyle = '#7fe06a'; c.fillRect(x, y, TS, 3);
} });
defTile(T.DIRT, { name: 'dirt', draw(c, x, y, tx, ty) {
  c.fillStyle = '#a0662e'; c.fillRect(x, y, TS, TS);
  speckle(c, x, y, tx, ty, '#8a5524', 4, 4);
  speckle(c, x, y, tx + 99, ty, '#b87a3e', 2, 3);
} });
defTile(T.STONE, { name: 'stone', hard: 2, draw(c, x, y, tx, ty) {
  c.fillStyle = '#8f939c'; c.fillRect(x, y, TS, TS);
  speckle(c, x, y, tx, ty, '#7a7e87', 3, 6);
  speckle(c, x, y, tx + 50, ty, '#a7abb3', 2, 4);
} });
defTile(T.SAND, { name: 'sand', falls: true, draw(c, x, y, tx, ty) {
  c.fillStyle = '#f2d48a'; c.fillRect(x, y, TS, TS);
  speckle(c, x, y, tx, ty, '#e0bd6c', 5, 3);
} });
defTile(T.WATER, { name: 'water', solid: false, dig: false, fluid: true, draw(c, x, y) {
  c.fillStyle = 'rgba(64,156,255,0.72)'; c.fillRect(x, y, TS, TS);
} });
defTile(T.BEDROCK, { name: 'bedrock', dig: false, hard: 99, draw(c, x, y, tx, ty) {
  c.fillStyle = '#3d3a45'; c.fillRect(x, y, TS, TS);
  speckle(c, x, y, tx, ty, '#2a2830', 4, 6);
} });
defTile(T.WOOD, { name: 'wood', draw(c, x, y, tx, ty) {
  c.fillStyle = '#c98a4b'; c.fillRect(x, y, TS, TS);
  c.fillStyle = '#a86d35';
  for (let i = 0; i < 4; i++) c.fillRect(x, y + i * 8 + 7, TS, 2);
  c.fillRect(x + (ty % 2 ? 10 : 22), y, 2, TS);
} });
defTile(T.BRICK, { name: 'brick', draw(c, x, y, tx, ty) {
  c.fillStyle = '#e8e0d4'; c.fillRect(x, y, TS, TS);
  c.fillStyle = '#d9534f';
  for (let r = 0; r < 4; r++) {
    const off = (r + ty) % 2 ? 0 : -8;
    for (let k = 0; k < 3; k++) {
      const a = Math.max(x, x + off + k * 16 + 1), b = Math.min(x + TS, x + off + k * 16 + 15);
      if (b > a) c.fillRect(a, y + r * 8 + 1, b - a, 6);
    }
  }
} });
defTile(T.GLASS, { name: 'glass', draw(c, x, y) {
  c.fillStyle = 'rgba(190,240,255,0.55)'; c.fillRect(x, y, TS, TS);
  c.strokeStyle = '#ffffff'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x + 7, y + 20); c.lineTo(x + 18, y + 9); c.stroke();
  c.strokeStyle = '#5b6b7a'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, TS - 2, TS - 2);
} });
defTile(T.ROAD, { name: 'road', hard: 2, draw(c, x, y, tx) {
  c.fillStyle = '#4a4a55'; c.fillRect(x, y, TS, TS);
  c.fillStyle = '#ffd43b'; if (tx % 3 === 0) c.fillRect(x + 4, y + 4, 24, 4);
  c.fillStyle = '#5c5c68'; c.fillRect(x, y + TS - 6, TS, 6);
} });
defTile(T.RAIL, { name: 'rail', solid: false, draw(c, x, y) {
  c.fillStyle = '#7a4a24';
  c.fillRect(x + 2, y + TS - 10, 10, 10); c.fillRect(x + 18, y + TS - 10, 10, 10);
  c.fillStyle = '#9aa0aa'; c.fillRect(x, y + TS - 14, TS, 5);
} });
defTile(T.BONE, { name: 'bone', treasure: true, draw: treasureTile(T.DIRT, (c, cx, cy) => {
  c.save(); c.translate(cx, cy); c.rotate(-0.5);
  rbox(c, -10, -3, 20, 6, 3, '#fffbe8', 2);
  ell(c, -11, -4, 4, 4, '#fffbe8', 2); ell(c, -11, 4, 4, 4, '#fffbe8', 2);
  ell(c, 11, -4, 4, 4, '#fffbe8', 2); ell(c, 11, 4, 4, 4, '#fffbe8', 2);
  c.restore();
}) });
defTile(T.EGG, { name: 'egg', treasure: true, draw: treasureTile(T.DIRT, (c, cx, cy) => {
  ell(c, cx, cy + 1, 9, 12, '#bff0ff', 2);
  ell(c, cx - 3, cy - 3, 2, 2, '#4dabf7', 0); ell(c, cx + 3, cy + 4, 2.5, 2.5, '#4dabf7', 0);
}) });
defTile(T.GEM, { name: 'gem', treasure: true, hard: 2, draw: treasureTile(T.STONE, (c, cx, cy) => {
  poly(c, [cx - 10, cy - 3, cx - 5, cy - 9, cx + 5, cy - 9, cx + 10, cy - 3, cx, cy + 10], '#e64980', 2);
  poly(c, [cx - 5, cy - 7, cx, cy - 7, cx - 4, cy - 2], '#ffc9de', 0);
}) });
defTile(T.FOSSIL, { name: 'fossil', treasure: true, hard: 2, draw: treasureTile(T.STONE, (c, cx, cy) => {
  c.strokeStyle = '#f1e3c4'; c.lineWidth = 3; c.beginPath();
  for (let a = 0; a < 12; a += 0.3) {
    const r = 1 + a * 0.85;
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.stroke();
}) });
defTile(T.LEAVES, { name: 'leaves', solid: false, back: true, draw(c, x, y, tx, ty) {
  c.fillStyle = '#3fae49';
  c.beginPath(); c.arc(x + 16, y + 16, 19, 0, TAU); c.fill();
  c.fillStyle = '#5cc84a';
  c.beginPath(); c.arc(x + 10 + tileHash(tx, ty) * 10, y + 10, 8, 0, TAU); c.fill();
} });
defTile(T.TRUNK, { name: 'trunk', solid: false, back: true, draw(c, x, y) {
  c.fillStyle = '#8a5a2b'; c.fillRect(x + 9, y, 14, TS);
  c.fillStyle = '#6e4520'; c.fillRect(x + 12, y + 4, 3, 10);
} });
defTile(T.CROP, { name: 'crop', solid: false, draw(c, x, y, tx) {
  c.fillStyle = '#4caf50';
  c.fillRect(x + 14, y + 10, 4, 22);
  c.fillStyle = '#ffd43b';
  ell(c, x + 16, y + 10, 6, 10, '#ffd43b', 2);
} });
defTile(T.ROOF, { name: 'roof', draw(c, x, y, tx, ty) {
  c.fillStyle = '#4263eb'; c.fillRect(x, y, TS, TS);
  c.fillStyle = '#364fc7';
  for (let i = 0; i < 4; i++) c.fillRect(x, y + i * 8 + 6, TS, 2);
} });
defTile(T.CONCRETE, { name: 'concrete', hard: 2, draw(c, x, y, tx, ty) {
  c.fillStyle = '#c9cdd4'; c.fillRect(x, y, TS, TS);
  c.fillStyle = '#b3b8c0'; c.fillRect(x, y + TS - 3, TS, 3); c.fillRect(x + TS - 3, y, 3, TS);
} });
defTile(T.FLOWER, { name: 'flower', solid: false, draw(c, x, y, tx, ty) {
  const col = ['#ff6b81', '#ffd43b', '#b197fc', '#ffffff'][Math.floor(tileHash(tx, ty) * 4)];
  c.fillStyle = '#48b038'; c.fillRect(x + 15, y + 16, 3, 16);
  c.fillStyle = col;
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5;
    c.beginPath(); c.arc(x + 16 + Math.cos(a) * 5, y + 14 + Math.sin(a) * 5, 4, 0, TAU); c.fill();
  }
  c.fillStyle = '#ffa94d'; c.beginPath(); c.arc(x + 16, y + 14, 3, 0, TAU); c.fill();
} });

defTile(T.MOONDUST, { name: 'moon dust', draw(c, x, y, tx, ty) {
  c.fillStyle = '#c8c9d2'; c.fillRect(x, y, TS, TS);
  speckle(c, x, y, tx, ty, '#adafba', 4, 4);
  speckle(c, x, y, tx + 31, ty, '#e2e3ea', 2, 3);
} });
defTile(T.MOONROCK, { name: 'moon rock', hard: 2, draw(c, x, y, tx, ty) {
  c.fillStyle = '#8b8d9b'; c.fillRect(x, y, TS, TS);
  speckle(c, x, y, tx, ty, '#737584', 3, 6);
  c.fillStyle = 'rgba(40,40,60,0.25)'; c.beginPath(); c.arc(x + 10 + tileHash(tx, ty) * 12, y + 12, 5, 0, TAU); c.fill();
} });
defTile(T.CRYSTAL, { name: 'moon crystal', treasure: true, hard: 2, draw: treasureTile(T.MOONROCK, (c, cx, cy) => {
  poly(c, [cx - 9, cy + 9, cx - 5, cy - 6, cx, cy - 12, cx + 5, cy - 6, cx + 9, cy + 9], '#cc5de8', 2);
  poly(c, [cx - 3, cy - 5, cx, cy - 10, cx + 2, cy - 4], '#f3d9fa', 0);
}) });
defTile(T.CHEESE, { name: 'moon cheese', treasure: true, draw(c, x, y, tx, ty) {
  c.fillStyle = '#ffd43b'; c.fillRect(x, y, TS, TS);
  c.fillStyle = '#fab005';
  for (let i = 0; i < 3; i++) {
    const a = tileHash(tx * 5 + i, ty * 3 - i), b = tileHash(tx - i * 7, ty + i * 11);
    c.beginPath(); c.arc(x + 5 + a * 22, y + 5 + b * 22, 2.5 + a * 3, 0, TAU); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, y, TS, 3);
} });

defTile(T.GOLDEGG, { name: 'golden egg', treasure: true, hard: 2, draw: treasureTile(T.STONE, (c, cx, cy) => {
  ell(c, cx, cy + 1, 10, 13, '#ffd43b', 2);
  ell(c, cx - 3, cy - 4, 3, 4, '#fff3bf', 0);
  drawStar(c, cx + 4, cy + 4, 4, 0, '#fab005', 0);
}) });

// Blocks the player can build with.
const BUILD_BLOCKS = [T.DIRT, T.BRICK, T.WOOD, T.GLASS, T.STONE, T.ROAD];

function drawTileIcon(c, id) {
  c.clearRect(0, 0, TS, TS);
  c.fillStyle = '#9fd8ff'; c.fillRect(0, 0, TS, TS);
  TILES[id].draw(c, 0, 0, 3, 3);
}
