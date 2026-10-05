// Keyboard, on-screen touch buttons and world taps.
const Input = {
  held: {}, pressed: {},
  set(k, v) {
    if (v && !this.held[k]) this.pressed[k] = true;
    this.held[k] = v;
  },
  endFrame() { this.pressed = {}; },
  any() { return Object.keys(this.pressed).length > 0; },
};

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'action', KeyE: 'enter', Enter: 'enter', KeyR: 'roar', KeyQ: 'whistle',
  Escape: 'home', KeyM: 'mute',
  Digit1: 'b1', Digit2: 'b2', Digit3: 'b3', Digit4: 'b4', Digit5: 'b5', Digit6: 'b6',
};

addEventListener('keydown', e => {
  Sound.unlock();
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  Input.set(k, true);
});
addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (k) Input.set(k, false);
});
addEventListener('blur', () => { Input.held = {}; });

const UI = {
  palette: null,
  init() {
    document.querySelectorAll('[data-key]').forEach(btn => {
      const key = btn.dataset.key;
      const down = e => {
        e.preventDefault(); e.stopPropagation();
        Sound.unlock();
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        Input.set(key, true);
        btn.classList.add('on');
      };
      const up = () => { Input.set(key, false); btn.classList.remove('on'); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
      btn.addEventListener('contextmenu', e => e.preventDefault());
    });
    document.getElementById('btn-home').addEventListener('pointerdown', e => {
      e.preventDefault(); Sound.unlock(); Sound.click(); Game.home();
    });
    document.getElementById('btn-mute').addEventListener('pointerdown', e => {
      e.preventDefault(); Sound.unlock(); Game.toggleMute();
    });
    const canvas = document.getElementById('game');
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      Sound.unlock();
      const r = canvas.getBoundingClientRect();
      Game.tap((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.palette = document.getElementById('palette');
  },

  // cfg: { dirs: 'none'|'lr'|'all', action: icon|null, roar, enter, whistle, palette, home }
  configure(cfg) {
    const show = (id, on) => document.getElementById(id).classList.toggle('hidden', !on);
    const pad = document.getElementById('pad-left');
    show('pad-left', cfg.dirs && cfg.dirs !== 'none');
    pad.classList.toggle('lr', cfg.dirs === 'lr');
    const act = document.querySelector('[data-key=action]');
    act.classList.toggle('hidden', !cfg.action);
    if (cfg.action) act.textContent = cfg.action;
    const roarBtn = document.querySelector('[data-key=roar]');
    roarBtn.classList.toggle('hidden', !cfg.roar);
    roarBtn.textContent = cfg.roarIcon || '🦖';
    document.querySelector('[data-key=enter]').classList.toggle('hidden', !cfg.enter);
    document.querySelector('[data-key=whistle]').classList.toggle('hidden', !cfg.whistle);
    show('palette', !!cfg.palette);
    show('btn-home', cfg.home !== false);
  },
  setEnter(visible, icon) {
    const b = document.querySelector('[data-key=enter]');
    b.classList.toggle('hidden', !visible);
    if (icon) b.textContent = icon;
  },
  setAction(icon) { document.querySelector('[data-key=action]').textContent = icon; },
  buildPalette(blocks, selected, onPick) {
    const p = this.palette;
    p.innerHTML = '';
    blocks.forEach((id, i) => {
      const b = document.createElement('button');
      b.className = 'blk' + (i === selected ? ' sel' : '');
      b.setAttribute('aria-label', TILES[id].name);
      const cv = document.createElement('canvas');
      cv.width = cv.height = TS;
      drawTileIcon(cv.getContext('2d'), id);
      b.appendChild(cv);
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); Sound.unlock(); onPick(i); });
      p.appendChild(b);
    });
  },
  markPalette(selected) {
    [...this.palette.children].forEach((b, i) => b.classList.toggle('sel', i === selected));
  },
};
