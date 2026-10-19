// Reading signs: short three and four word labels around the world. Walk up to one (or tap it)
// and it reads itself out slowly, lighting up each word as it's said, so kids can read along.
const READ_WORD = 0.6;   // seconds per word while reading aloud
const Reading = {
  current: null,
  update(dt) {
    const p = Player;
    if (this.current) {
      this.current.readT += dt;
      if (this.current.readT > this.current.text.split(' ').length * READ_WORD + 0.8) this.current = null;
    }
    if (Game.overlay) return;
    for (const s of World.props) {
      if (s.type !== 'label') continue;
      const dx = Math.abs(s.x * TS - p.cx);
      // On foot, coming up to a sign reads it once; walk well away and it'll read again next time.
      if (!s.heard && !p.vehicle && dx < 2.2 * TS && Math.abs(s.y * TS - p.body.y) < 4 * TS && !this.current) this.read(s);
      if (dx > 14 * TS) s.heard = false;
    }
  },
  read(s) {
    s.heard = true; s.readT = 0; this.current = s;
    Sound.say(s.text, 0.72);
  },
  tapWorld(wx, wy) {
    for (const s of World.props) {
      if (s.type !== 'label') continue;
      const w = (s.w || 200) / 2 + 10;
      if (Math.abs(s.x * TS - wx) < w && wy > s.y * TS - 110 && wy < s.y * TS - 40) { this.read(s); return true; }
    }
    return false;
  },
  draw(c, s, sx, sy) {
    const words = s.text.split(' ');
    c.font = `800 22px ${FONT}`;
    const widths = words.map(w => c.measureText(w).width), gap = 9;
    const tw = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
    s.w = tw + 30;
    const top = sy - 104, h = 40;
    limb(c, [sx, sy, sx, top + h], 6, '#8a5a2b');
    rbox(c, sx - s.w / 2, top, s.w, h, 10, '#fff8e1', 4);
    const now = this.current === s ? Math.floor(s.readT / READ_WORD) : -1;
    let x = sx - tw / 2;
    c.textAlign = 'left'; c.textBaseline = 'middle';
    words.forEach((w, i) => {
      if (i === now) rbox(c, x - 4, top + 5, widths[i] + 8, h - 10, 8, '#ffd43b', 0);
      c.fillStyle = i === now ? '#c92a2a' : '#2b2233';
      c.fillText(w, x, top + h / 2 + 1);
      x += widths[i] + gap;
    });
  },
};
// Put a reading sign on the ground at column x.
function addLabel(world, x, text) { world.props.push({ type: 'label', x: x + 0.5, y: world.surf[x], text }); }
