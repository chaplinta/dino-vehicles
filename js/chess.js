// Chess with a dino who is really bad at it. Full rules; you play white from your own seat,
// looking across the table. Dino hands reach out and move the pieces.

// ---------- Rules ----------
// Board: 64 squares, index = rank * 8 + file, rank 0 is white's back rank. Pieces: { c: 'w'|'b', t: 'p'|'n'|'b'|'r'|'q'|'k' }.
const ChessRules = {
  start() {
    const b = new Array(64).fill(null);
    const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let f = 0; f < 8; f++) {
      b[f] = { c: 'w', t: back[f] }; b[8 + f] = { c: 'w', t: 'p' };
      b[48 + f] = { c: 'b', t: 'p' }; b[56 + f] = { c: 'b', t: back[f] };
    }
    return { b, turn: 'w', castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: -1 };
  },
  attacked(b, sq, by) {
    const r = sq >> 3, f = sq & 7;
    const at = (rr, ff) => (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) ? b[rr * 8 + ff] : undefined;
    const pr = by === 'w' ? r - 1 : r + 1;
    for (const df of [-1, 1]) { const p = at(pr, f + df); if (p && p.c === by && p.t === 'p') return true; }
    for (const [dr, df] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const p = at(r + dr, f + df); if (p && p.c === by && p.t === 'n') return true; }
    for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) { if (!dr && !df) continue; const p = at(r + dr, f + df); if (p && p.c === by && p.t === 'k') return true; }
    const rays = [[1, 0, 'rq'], [-1, 0, 'rq'], [0, 1, 'rq'], [0, -1, 'rq'], [1, 1, 'bq'], [1, -1, 'bq'], [-1, 1, 'bq'], [-1, -1, 'bq']];
    for (const [dr, df, kinds] of rays) {
      let rr = r + dr, ff = f + df;
      while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
        const p = b[rr * 8 + ff];
        if (p) { if (p.c === by && kinds.includes(p.t)) return true; break; }
        rr += dr; ff += df;
      }
    }
    return false;
  },
  kingSq(b, c) { return b.findIndex(p => p && p.c === c && p.t === 'k'); },
  inCheck(st, c) { return this.attacked(st.b, this.kingSq(st.b, c), c === 'w' ? 'b' : 'w'); },
  pseudo(st) {
    const b = st.b, c = st.turn, them = c === 'w' ? 'b' : 'w', out = [];
    const add = (from, to, extra) => out.push(Object.assign({ from, to }, extra));
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p || p.c !== c) continue;
      const r = sq >> 3, f = sq & 7;
      const slide = (dirs, once) => {
        for (const [dr, df] of dirs) {
          let rr = r + dr, ff = f + df;
          while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
            const t = b[rr * 8 + ff];
            if (!t) add(sq, rr * 8 + ff); else { if (t.c === them) add(sq, rr * 8 + ff); break; }
            if (once) break;
            rr += dr; ff += df;
          }
        }
      };
      if (p.t === 'p') {
        const dir = c === 'w' ? 1 : -1, startR = c === 'w' ? 1 : 6, lastR = c === 'w' ? 7 : 0;
        const one = (r + dir) * 8 + f;
        if (r + dir >= 0 && r + dir < 8 && !b[one]) {
          add(sq, one, r + dir === lastR ? { promo: 'q' } : null);
          const two = (r + 2 * dir) * 8 + f;
          if (r === startR && !b[two]) add(sq, two, { double: true });
        }
        for (const df of [-1, 1]) {
          const ff = f + df, rr = r + dir;
          if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue;
          const to = rr * 8 + ff, t = b[to];
          if (t && t.c === them) add(sq, to, rr === lastR ? { promo: 'q' } : null);
          if (to === st.ep) add(sq, to, { ep: true });
        }
      } else if (p.t === 'n') slide([[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]], true);
      else if (p.t === 'b') slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      else if (p.t === 'r') slide([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      else if (p.t === 'q') slide([[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]);
      else if (p.t === 'k') {
        slide([[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], true);
        const home = c === 'w' ? 0 : 56;
        if (sq === home + 4 && !this.attacked(b, sq, them)) {
          if (st.castle[c + 'K'] && !b[home + 5] && !b[home + 6] && b[home + 7] && b[home + 7].t === 'r' &&
            !this.attacked(b, home + 5, them) && !this.attacked(b, home + 6, them)) add(sq, home + 6, { castle: 'K' });
          if (st.castle[c + 'Q'] && !b[home + 3] && !b[home + 2] && !b[home + 1] && b[home] && b[home].t === 'r' &&
            !this.attacked(b, home + 3, them) && !this.attacked(b, home + 2, them)) add(sq, home + 2, { castle: 'Q' });
        }
      }
    }
    return out;
  },
  make(st, m) {
    const b = st.b.slice(), c = st.turn, p = b[m.from];
    const castle = Object.assign({}, st.castle);
    let captured = b[m.to];
    b[m.to] = m.promo ? { c, t: m.promo } : p;
    b[m.from] = null;
    if (m.ep) { const cap = m.to + (c === 'w' ? -8 : 8); captured = b[cap]; b[cap] = null; }
    if (m.castle) {
      const home = c === 'w' ? 0 : 56;
      if (m.castle === 'K') { b[home + 5] = b[home + 7]; b[home + 7] = null; }
      else { b[home + 3] = b[home]; b[home] = null; }
    }
    if (p.t === 'k') { castle[c + 'K'] = false; castle[c + 'Q'] = false; }
    for (const [sq, key] of [[0, 'wQ'], [7, 'wK'], [56, 'bQ'], [63, 'bK']]) if (m.from === sq || m.to === sq) castle[key] = false;
    return { b, turn: c === 'w' ? 'b' : 'w', castle, ep: m.double ? (m.from + m.to) / 2 : -1, captured };
  },
  legal(st) {
    return this.pseudo(st).filter(m => !this.inCheck(Object.assign(this.make(st, m), { turn: st.turn }), st.turn));
  },
  // 'play', 'checkmate', 'stalemate' or 'draw' (just kings left).
  status(st) {
    if (st.b.filter(Boolean).length === 2) return 'draw';
    if (this.legal(st).length) return 'play';
    return this.inCheck(st, st.turn) ? 'checkmate' : 'stalemate';
  },
};
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// A really bad chess player: mostly random moves, and often the move that gives away the most.
function badChessMove(st) {
  const moves = ChessRules.legal(st);
  if (Math.random() < 0.55) return pick(moves);
  let worst = null, worstScore = Infinity;
  for (const m of moves) {
    const s2 = ChessRules.make(st, m);
    const gain = s2.captured ? PIECE_VALUE[s2.captured.t] : 0;
    let loss = 0;
    for (const r of ChessRules.pseudo(s2)) { const t = s2.b[r.to]; if (t) loss = Math.max(loss, PIECE_VALUE[t.t]); }
    const score = gain - loss + Math.random() * 0.5;
    if (score < worstScore) { worstScore = score; worst = m; }
  }
  return worst;
}

// ---------- The table, seen from your seat ----------
const Chess = {
  st: null, sel: -1, targets: [], anim: null, over: null, t: 0, thinkT: 0, opp: 'tri', lastMove: null,
  P: 0.45,   // perspective strength
  open() {
    if (!this.st || this.over) this.newGame();
    Game.overlay = this;
    this.t = 0;
    UI.configure({ dirs: 'none', action: null, roar: false, home: true });
    Sound.say(this.st.turn === 'w' && !this.lastMove ? 'Let\'s play chess! You go first. Tap a piece, then tap where it goes.' : 'Back to our chess game!');
  },
  newGame() {
    this.st = ChessRules.start(); this.sel = -1; this.targets = []; this.anim = null; this.over = null; this.lastMove = null;
  },
  close() { Game.overlay = null; Game.configurePlay(); },

  // Geometry: near edge (rank 0) at the bottom, far edge (rank 7) up by the other dino.
  geo() {
    return { cx: W / 2, yNear: H - 30, yFar: 250, wNear: Math.min(W - 160, 700), wFar: Math.min(W - 160, 700) * 0.62 };
  },
  sOf(t) { return t * (1 + this.P) / (1 + this.P * t); },          // depth 0..1 -> screen fraction
  tOf(s) { return s / (1 + this.P - this.P * s); },
  point(f, r) {   // board coords (0..8) to screen
    const g = this.geo(), s = this.sOf(r / 8);
    const y = lerp(g.yNear, g.yFar, s), w = lerp(g.wNear, g.wFar, s);
    return { x: g.cx - w / 2 + (f / 8) * w, y, k: w / g.wNear };
  },
  squareAt(x, y) {
    const g = this.geo();
    const s = (y - g.yNear) / (g.yFar - g.yNear);
    if (s < 0 || s > 1) return -1;
    const r = Math.floor(this.tOf(s) * 8), w = lerp(g.wNear, g.wFar, s);
    const f = Math.floor((x - (g.cx - w / 2)) / w * 8);
    return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1;
  },
  centre(sq) { const f = sq & 7, r = sq >> 3; const a = this.point(f + 0.5, r + 0.5); return a; },

  tap(x, y) {
    if (x > W - 90 && y > 90 && y < 170) { this.close(); return true; }   // ✖
    if (this.over) { if (this.t > 1) { this.newGame(); Sound.say('New game!'); } return true; }
    if (this.anim || this.st.turn !== 'w') return true;
    const sq = this.squareAt(x, y);
    if (sq < 0) return true;
    const p = this.st.b[sq];
    const m = this.targets.find(m => m.to === sq);
    if (m) { this.startMove(m, 'w'); return true; }
    if (p && p.c === 'w') {
      this.sel = sq;
      this.targets = ChessRules.legal(this.st).filter(m => m.from === sq);
      Sound.click();
      if (!this.targets.length) Sound.bonk();
    } else { this.sel = -1; this.targets = []; }
    return true;
  },
  startMove(m, who) {
    this.anim = { m, who, t: 0, piece: this.st.b[m.from] };
    this.sel = -1; this.targets = [];
  },
  update(dt) {
    this.t += dt;
    if (Input.pressed.home) { this.close(); return; }
    const a = this.anim;
    if (a) {
      a.t += dt;
      if (a.t >= 1.0 && !a.done) {
        a.done = true;
        const before = this.st;
        this.st = ChessRules.make(this.st, a.m);
        this.lastMove = a.m;
        Sound.place();
        if (this.st.captured) Sound.bonk();
        this.afterMove(before, a);
      }
      if (a.t >= 1.4) this.anim = null;
      return;
    }
    if (!this.over && this.st.turn === 'b') {
      this.thinkT += dt;
      if (this.thinkT > 1.2) { this.thinkT = 0; this.startMove(badChessMove(this.st), 'b'); }
    }
  },
  afterMove(before, a) {
    const status = ChessRules.status(this.st);
    const capt = this.st.captured;
    if (status === 'checkmate') {
      this.over = this.st.turn === 'b' ? 'win' : 'lose'; this.t = 0;
      if (this.over === 'win') { Game.addStars(10); Hud.celebrate('Checkmate!'); Sound.say('Checkmate! You win! Good game!'); }
      else Sound.say('Oh! I won? I never win! Good game!');
    } else if (status !== 'play') {
      this.over = 'draw'; this.t = 0; Sound.say('It\'s a draw! Good game!');
    } else if (ChessRules.inCheck(this.st, this.st.turn)) Sound.say(this.st.turn === 'b' ? 'Check! Uh oh!' : 'Check!');
    else if (capt && a.who === 'w') Sound.say(pick(['Oh no, my ' + this.pieceName(capt.t) + '!', 'Hey! I needed that!', 'Oops!']));
    else if (capt && a.who === 'b') Sound.say('Ha! Got one!');
  },
  pieceName(t) { return { p: 'pawn', n: 'knight', b: 'bishop', r: 'castle', q: 'queen', k: 'king' }[t]; },

  // ---------- Drawing ----------
  drawPiece(c, x, y, p, k) {
    const fill = p.c === 'w' ? '#fff8e7' : '#4a3426', lw = Math.max(1.5, 3 * k);
    c.save(); c.translate(x, y); c.scale(k * 1.15, k * 1.15);
    ell(c, 0, 0, 20, 7, fill, lw);
    switch (p.t) {
      case 'p': poly(c, [-12, -2, 12, -2, 6, -26, -6, -26], fill, lw); ell(c, 0, -32, 9, 9, fill, lw); break;
      case 'r': poly(c, [-13, -2, 13, -2, 11, -38, -11, -38], fill, lw);
        poly(c, [-14, -38, 14, -38, 14, -50, 8, -50, 8, -44, 3, -44, 3, -50, -3, -50, -3, -44, -8, -44, -8, -50, -14, -50], fill, lw); break;
      case 'n': poly(c, [-13, -2, 13, -2, 10, -24, 14, -40, 4, -54, -12, -46, -16, -36, -6, -34, -10, -24], fill, lw);
        ell(c, 2, -44, 2.5, 2.5, p.c === 'w' ? OUT : '#fff', 0); break;
      case 'b': poly(c, [-12, -2, 12, -2, 6, -30, -6, -30], fill, lw); ell(c, 0, -40, 10, 14, fill, lw); ell(c, 0, -56, 3.5, 3.5, fill, lw);
        c.beginPath(); c.moveTo(3, -48); c.lineTo(-4, -38); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke(); break;
      case 'q': poly(c, [-13, -2, 13, -2, 8, -36, -8, -36], fill, lw);
        poly(c, [-14, -36, 14, -36, 16, -54, 8, -44, 0, -58, -8, -44, -16, -54], fill, lw); break;
      case 'k': poly(c, [-13, -2, 13, -2, 8, -38, -8, -38], fill, lw); rbox(c, -12, -48, 24, 10, 4, fill, lw);
        rbox(c, -3, -64, 6, 16, 2, fill, lw); rbox(c, -8, -59, 16, 5, 2, fill, lw); break;
    }
    c.restore();
  },
  // A dino arm reaching to (x, y): from the opponent's shoulder or from the bottom of your screen.
  drawArm(c, who, x, y, holding) {
    const d = DINO_TYPES[who === 'b' ? this.opp : Player.type];
    const sx = who === 'b' ? W / 2 + 80 : W / 2 + 180, sy = who === 'b' ? 230 : H + 40;
    limb(c, [sx, sy, (sx + x) / 2 + 30, (sy + y) / 2 - (who === 'b' ? 20 : 40), x, y - 6], who === 'b' ? 26 : 40, d.body);
    // Claws.
    for (const dx of [-12, 0, 12]) poly(c, [x + dx - 5, y - 4, x + dx + 5, y - 4, x + dx, y + 10], '#fff3d6', 2);
    ell(c, x, y - 8, who === 'b' ? 18 : 24, who === 'b' ? 14 : 18, d.body, 4);
    if (holding) this.drawPiece(c, x, y + 6, holding, who === 'b' ? 0.8 : 1);
  },
  armPos(a) {
    // 0..0.4 reach, 0.4..1.0 carry, 1.0..1.4 back.
    const from = this.centre(a.m.from), to = this.centre(a.m.to);
    const rest = a.who === 'b' ? { x: W / 2 + 120, y: 230 } : { x: W / 2 + 220, y: H + 30 };
    const lift = 40;
    if (a.t < 0.4) { const k = a.t / 0.4; return { x: lerp(rest.x, from.x, k), y: lerp(rest.y, from.y, k), hold: false }; }
    if (a.t < 1.0) { const k = (a.t - 0.4) / 0.6; return { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * lift, hold: true }; }
    const k = (a.t - 1.0) / 0.4; return { x: lerp(to.x, rest.x, k), y: lerp(to.y, rest.y, k), hold: false };
  },
  draw(c) {
    const g = this.geo(), t = Game.t;
    // The park around the table.
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#9ad8ff'); bg.addColorStop(0.45, '#d8f3ff'); bg.addColorStop(0.46, '#7fcf6d'); bg.addColorStop(1, '#5cb84a');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    drawCloud(c, 120, 80, 0.9); drawCloud(c, W - 260, 60, 0.7);
    // The other dino, sitting across the table.
    const think = this.st.turn === 'b' && !this.anim && !this.over;
    const bob = Math.sin(t * 1.5) * 3;
    c.save();
    drawDinoSeated(c, W / 2 - 40, 300 + bob, 2.4, this.opp, { t, roar: this.over === 'win' ? 0.6 : 0 });
    c.restore();
    if (think) bubble(c, W / 2 + 40, 110, '🤔', t);
    if (this.over === 'win') bubble(c, W / 2 + 40, 110, '😭', t);
    // Table and board.
    poly(c, [g.cx - g.wNear / 2 - 60, g.yNear + 30, g.cx + g.wNear / 2 + 60, g.yNear + 30, g.cx + g.wFar / 2 + 50, g.yFar - 20, g.cx - g.wFar / 2 - 50, g.yFar - 20], '#a0662e', 4);
    for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) {
      const a = this.point(f, r), b = this.point(f + 1, r), cc = this.point(f + 1, r + 1), d = this.point(f, r + 1);
      const sq = r * 8 + f;
      let col = (r + f) % 2 ? '#f1d9b5' : '#b58863';
      if (this.lastMove && (sq === this.lastMove.from || sq === this.lastMove.to)) col = (r + f) % 2 ? '#f6f39a' : '#d8cc5a';
      if (sq === this.sel) col = '#8ce99a';
      poly(c, [a.x, a.y, b.x, b.y, cc.x, cc.y, d.x, d.y], col, 0);
    }
    const n0 = this.point(0, 0), n1 = this.point(8, 0), f1 = this.point(8, 8), f0 = this.point(0, 8);
    poly(c, [n0.x, n0.y, n1.x, n1.y, f1.x, f1.y, f0.x, f0.y], null, 4);
    // Where the selected piece can go.
    for (const m of this.targets) { const p = this.centre(m.to); ell(c, p.x, p.y, 11 * p.k, 7 * p.k, 'rgba(47,158,68,0.75)', 0); }
    // Pieces, far rows first.
    const a = this.anim;
    for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) {
      const sq = r * 8 + f, p = this.st.b[sq];
      if (!p) continue;
      if (a && !a.done && a.t >= 0.4 && sq === a.m.from) continue;   // in the hand
      const pc = this.centre(sq);
      this.drawPiece(c, pc.x, pc.y + 4 * pc.k, p, pc.k);
    }
    // Hands.
    if (a) { const h = this.armPos(a); this.drawArm(c, a.who, h.x, h.y, h.hold ? a.piece : null); }
    else {
      // Resting hands at the edge of the table.
      this.drawArm(c, 'b', W / 2 + 120 + Math.sin(t) * 4, 232, null);
    }
    // Close button and messages.
    ell(c, W - 50, 130, 30, 30, '#ffe3e3', 4);
    c.font = `28px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = OUT; c.fillText('✖', W - 50, 131);
    if (this.over) {
      const msg = { win: 'You win! 🏆', lose: 'He won!', draw: 'Draw!' }[this.over];
      bigText(c, msg, W / 2, 200, 64, '#ffd43b');
      if (this.t > 1) bigText(c, 'tap for a new game', W / 2, 250, 26, '#fff');
    } else if (this.st.turn === 'w' && ChessRules.inCheck(this.st, 'w')) bigText(c, 'Check!', 140, 200, 44, '#ff6b6b');
  },
};
