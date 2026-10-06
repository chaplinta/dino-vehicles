// Chunked tile renderer. Each chunk is cached on an offscreen canvas and redrawn only when changed.
const CHUNK = 16;
const CHUNK_PX = CHUNK * TS;
const Render = {
  cache: new Map(),   // key -> { canvas, dirty, used }
  frame: 0,
  maxChunks: 36,

  key(cx, cy) { return cy * 1000 + cx; },
  dirtyTile(x, y) {
    // A tile change can alter edge outlines of neighbours, so dirty adjacent chunks too.
    for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const k = this.key(Math.floor((x + dx) / CHUNK), Math.floor((y + dy) / CHUNK));
      const ch = this.cache.get(k);
      if (ch) ch.dirty = true;
    }
  },
  clear() { this.cache.clear(); },

  getChunk(cx, cy) {
    const k = this.key(cx, cy);
    let ch = this.cache.get(k);
    if (!ch) {
      if (this.cache.size >= this.maxChunks) this.evict();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = CHUNK_PX;
      ch = { canvas, dirty: true, used: 0 };
      this.cache.set(k, ch);
    }
    ch.used = this.frame;
    if (ch.dirty) { this.paint(ch.canvas.getContext('2d'), cx, cy); ch.dirty = false; }
    return ch;
  },
  evict() {
    let oldK = null, oldF = Infinity;
    for (const [k, ch] of this.cache) if (ch.used < oldF) { oldF = ch.used; oldK = k; }
    if (oldK !== null) this.cache.delete(oldK);
  },

  paint(c, cx, cy) {
    c.clearRect(0, 0, CHUNK_PX, CHUNK_PX);
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    const gs = World.genSurf;
    // Back layer: building walls and underground earth.
    for (let ty = y0; ty < y0 + CHUNK; ty++) {
      for (let tx = x0; tx < x0 + CHUNK; tx++) {
        if (!World.inside(tx, ty)) continue;
        const id = World.get(tx, ty);
        const d = TILES[id];
        if (d.solid && !d.treasure && id !== T.GLASS) continue;
        let bg = World.getBg(tx, ty);
        if (!bg && gs && ty > gs[tx]) bg = Game.onMoon ? (ty > gs[tx] + 4 ? T.MOONROCK : T.MOONDUST) : Game.away === 'pilbara' ? (ty > gs[tx] + 5 ? T.WASTE : T.REDDIRT) : (ty > gs[tx] + 6 ? T.STONE : T.DIRT);
        if (!bg) continue;
        const px = (tx - x0) * TS, py = (ty - y0) * TS;
        TILES[bg].draw(c, px, py, tx, ty);
        c.fillStyle = bg === T.GLASS ? 'rgba(20,30,60,0.25)' : 'rgba(25,15,30,0.45)';
        c.fillRect(px, py, TS, TS);
      }
    }
    // Front tiles.
    for (let ty = y0; ty < y0 + CHUNK; ty++) {
      for (let tx = x0; tx < x0 + CHUNK; tx++) {
        if (!World.inside(tx, ty)) continue;
        const id = World.get(tx, ty);
        if (id === T.AIR) continue;
        const d = TILES[id];
        const px = (tx - x0) * TS, py = (ty - y0) * TS;
        if (id === T.CROP) drawCrop(c, px, py, World.getMeta(tx, ty));
        else d.draw(c, px, py, tx, ty);
        if (id === T.WATER && World.get(tx, ty - 1) !== T.WATER) {
          c.fillStyle = 'rgba(220,240,255,0.9)'; c.fillRect(px, py, TS, 4);
        }
        // Cartoon outline on exposed solid edges.
        if (d.solid) {
          c.fillStyle = 'rgba(43,34,51,0.75)';
          if (!World.solid(tx, ty - 1)) c.fillRect(px, py, TS, 3);
          if (!World.solid(tx, ty + 1)) c.fillRect(px, py + TS - 2, TS, 2);
          if (!World.solid(tx - 1, ty)) c.fillRect(px, py, 2, TS);
          if (!World.solid(tx + 1, ty)) c.fillRect(px + TS - 2, py, 2, TS);
        }
      }
    }
  },

  draw(c, camX, camY, viewW = W, viewH = H) {
    this.frame++;
    const cx0 = Math.floor(camX / CHUNK_PX), cx1 = Math.floor((camX + viewW) / CHUNK_PX);
    const cy0 = Math.floor(camY / CHUNK_PX), cy1 = Math.floor((camY + viewH) / CHUNK_PX);
    const maxCx = Math.ceil(WORLD_W / CHUNK) - 1, maxCy = Math.ceil(WORLD_H / CHUNK) - 1;
    for (let cy = Math.max(0, cy0); cy <= Math.min(maxCy, cy1); cy++) {
      for (let cx = Math.max(0, cx0); cx <= Math.min(maxCx, cx1); cx++) {
        const ch = this.getChunk(cx, cy);
        // 1px overlap hides seams between chunks when zoomed out.
        c.drawImage(ch.canvas, Math.round(cx * CHUNK_PX - camX), Math.round(cy * CHUNK_PX - camY), CHUNK_PX + 1, CHUNK_PX + 1);
      }
    }
  },
};

// Crop growth stages 0..3 (3 = ripe). Stage is kept in World.meta.
function drawCrop(c, x, y, stage) {
  const hgt = [6, 12, 20, 26][clamp(stage, 0, 3)];
  c.fillStyle = '#4caf50';
  c.fillRect(x + 6, y + TS - hgt, 4, hgt); c.fillRect(x + 22, y + TS - hgt, 4, hgt);
  c.fillRect(x + 14, y + TS - hgt - 2, 4, hgt + 2);
  if (stage >= 2) {
    c.fillStyle = stage === 3 ? '#ffd43b' : '#c0eb75';
    for (const ox of [8, 16, 24]) {
      c.beginPath(); c.ellipse(x + ox, y + TS - hgt, 4, 7, 0, 0, TAU); c.fill();
    }
  }
}
