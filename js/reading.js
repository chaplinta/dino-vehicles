// Reading signs: short three and four word labels around the world. Walk up to one (or tap it)
// and it reads itself out slowly, lighting up each word as it's said, so kids can read along.
const READ_WORD = 1.4;   // how long a sign stays lit up while it's read out
const Reading = {
  current: null, card: null,
  update(dt) {
    const p = Player;
    if (this.current) { this.current.readT += dt; if (this.current.readT > READ_WORD) this.current = null; }
    if (this.card) { this.card.t += dt; if (this.card.t > 3) this.card = null; }
    if (Game.overlay) return;
    for (const s of World.props) {
      if (s.type !== 'label') continue;
      const dx = Math.abs(s.x * TS - p.cx);
      // On foot, coming up to a sign reads it once; walk well away and it'll read again next time.
      if (!s.heard && !p.vehicle && dx < 2.2 * TS && Math.abs(s.y * TS - p.body.y) < 4 * TS && !this.current) this.read(s);
      if (dx > 14 * TS) s.heard = false;
    }
  },
  // Said in lower case, so the voice reads the word rather than spelling it.
  read(s) { s.heard = true; s.readT = 0; this.current = s; Sound.say(s.text.toLowerCase(), 0.7); },
  // A word card for the vehicle you just got in.
  show(word) { this.card = { word, t: 0 }; Sound.say(word.toLowerCase(), 0.7); },
  tapWorld(wx, wy) {
    for (const s of World.props) {
      if (s.type !== 'label') continue;
      const w = (s.w || 120) / 2 + 10;
      if (Math.abs(s.x * TS - wx) < w && wy > s.y * TS - 120 && wy < s.y * TS - 40) { this.read(s); return true; }
    }
    return false;
  },
  drawWord(c, word, cx, cy, size, lit) {
    c.font = `900 ${size}px ${FONT}`;
    const w = c.measureText(word).width + size * 0.9, h = size * 1.5;
    rbox(c, cx - w / 2, cy - h / 2, w, h, 12, lit ? '#ffd43b' : '#fff8e1', 4);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = lit ? '#c92a2a' : '#2b2233';
    c.fillText(word, cx, cy + 2);
    return w;
  },
  draw(c, s, sx, sy) {
    const lit = this.current === s && Math.floor(s.readT * 4) % 2 === 0;
    limb(c, [sx, sy, sx, sy - 70], 6, '#8a5a2b');
    s.w = this.drawWord(c, s.text, sx, sy - 92, 32, lit);
  },
  drawHud(c) {
    if (!this.card) return;
    const k = Math.min(1, this.card.t * 5), fade = this.card.t > 2.6 ? (3 - this.card.t) / 0.4 : 1;
    c.save(); c.globalAlpha = Math.max(0, fade); c.translate(W / 2, 175); c.scale(k, k);
    this.drawWord(c, this.card.word, 0, 0, 56, this.card.t < 1.2);
    c.restore();
  },
};
// Put a reading sign on the ground at column x.
function addLabel(world, x, text) { world.props.push({ type: 'label', x: x + 0.5, y: world.surf[x], text }); }
