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
  Escape: 'home', KeyM: 'mute', KeyN: 'reset', KeyI: 'info', KeyL: 'lick', KeyF: 'attack',
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
  touch: matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0,
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
    // New world: hold the seedling for 2 seconds (ring fills); letting go early cancels.
    const rb = document.getElementById('btn-reset');
    rb.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); Sound.unlock();
      try { rb.setPointerCapture(e.pointerId); } catch (_) {}
      Game.resetHold = 0; Game.resetKey = false;
    });
    const stop = () => { Game.resetHold = null; rb.style.setProperty('--p', 0); };
    rb.addEventListener('pointerup', stop);
    rb.addEventListener('pointercancel', stop);
    rb.addEventListener('lostpointercapture', stop);
    rb.addEventListener('contextmenu', e => e.preventDefault());
    document.getElementById('btn-mute').addEventListener('pointerdown', e => {
      e.preventDefault(); Sound.unlock(); Game.toggleMute();
    });
    // First touch on a phone: go full screen and lock landscape where the browser allows it.
    const goFull = () => {
      removeEventListener('pointerdown', goFull, true);
      if (!matchMedia('(pointer: coarse)').matches) return;
      try {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        const p = req && req.call(el, { navigationUI: 'hide' });
        if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      } catch (e) { /* not supported (iPhone): Add to Home Screen instead */ }
    };
    addEventListener('pointerdown', goFull, true);
    const canvas = document.getElementById('game');
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      Sound.unlock();
      const r = canvas.getBoundingClientRect();
      Game.tap((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.palette = document.getElementById('palette');
    Stick.init();
  },

  // cfg: { dirs: 'none'|'lr'|'all', action: icon|null, roar, enter, whistle, palette, home }
  configure(cfg) {
    const show = (id, on) => document.getElementById(id).classList.toggle('hidden', !on);
    show('stick-zone', UI.touch && cfg.dirs && cfg.dirs !== 'none');   // touch screens only: on desktop the keys move you
    Stick.mode = cfg.dirs;
    document.getElementById('stick-zone').classList.toggle('lr', cfg.dirs === 'lr');
    Stick.release();
    const act = document.querySelector('[data-key=action]');
    act.classList.toggle('hidden', !cfg.action);
    if (cfg.action) act.textContent = cfg.action;
    const roarBtn = document.querySelector('[data-key=roar]');
    roarBtn.classList.toggle('hidden', !cfg.roar);
    roarBtn.textContent = cfg.roarIcon || '🦖';
    document.querySelector('[data-key=enter]').classList.toggle('hidden', !cfg.enter);
    document.querySelector('[data-key=whistle]').classList.toggle('hidden', !cfg.whistle);
    document.querySelector('[data-key=info]').classList.toggle('hidden', !cfg.info);
    document.querySelector('[data-key=lick]').classList.toggle('hidden', !cfg.lick);
    const atk = document.querySelector('[data-key=attack]');
    atk.classList.toggle('hidden', !cfg.attack);
    if (cfg.attack) atk.textContent = cfg.attack;
    show('palette', !!cfg.palette);
    show('btn-home', cfg.home !== false);
    show('btn-reset', !!cfg.reset);
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

// Joystick, fixed in the bottom-left corner. Touch it and slide (further = faster), up to jump, climb
// or fly, down to dig down. The ring never moves; the knob springs back to the middle when you let go.
const Stick = {
  mode: 'all', id: null,
  init() {
    const zone = document.getElementById('stick-zone'), base = document.getElementById('stick'), knob = document.getElementById('stick-knob');
    this.zone = zone; this.knob = knob;
    const move = e => {
      const r = base.getBoundingClientRect(), R = r.width * 0.38;
      let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (this.mode === 'lr') dy = 0;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.apply(dx / R, dy / R);
    };
    zone.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); Sound.unlock();
      if (this.id !== null) return;
      try { zone.setPointerCapture(e.pointerId); } catch (_) {}
      this.id = e.pointerId; zone.classList.add('on');
      move(e);
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === this.id) move(e); });
    const up = e => { if (e.pointerId === this.id) this.release(); };
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
    zone.addEventListener('lostpointercapture', up);
    zone.addEventListener('contextmenu', e => e.preventDefault());
  },
  apply(x, y) {
    Input.set('left', x < -0.28); Input.set('right', x > 0.28);
    const all = this.mode === 'all';
    Input.set('up', all && y < -0.5); Input.set('down', all && y > 0.5);
    Input.stick = Math.abs(x) > 0.28 ? clamp(Math.abs(x), 0.35, 1) : undefined;
  },
  release() {
    if (this.id !== null) for (const k of ['left', 'right', 'up', 'down']) Input.set(k, false);
    this.id = null; Input.stick = undefined;
    if (this.zone) { this.zone.classList.remove('on'); this.knob.style.transform = ''; }
  },
};
