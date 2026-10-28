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
    show('stick-zone', cfg.dirs && cfg.dirs !== 'none');
    Stick.mode = cfg.dirs;
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

// Thumb joystick: touch anywhere in the left zone and a stick appears under your thumb. Slide to move
// (further = faster), up to jump, climb or fly, down to dig down. A quick tap there still taps the world.
const Stick = {
  mode: 'all', id: null, ox: 0, oy: 0, t0: 0, moved: 0,
  radius() { return 56 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1); },
  init() {
    const zone = document.getElementById('stick-zone'), base = document.getElementById('stick'), knob = document.getElementById('stick-knob');
    this.base = base; this.knob = knob;
    zone.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); Sound.unlock();
      if (this.id !== null) return;
      try { zone.setPointerCapture(e.pointerId); } catch (_) {}
      this.id = e.pointerId; this.ox = e.clientX; this.oy = e.clientY; this.t0 = performance.now(); this.moved = 0;
      this.zone = zone.getBoundingClientRect();
      document.getElementById('stick-hint').classList.add('hidden');
      base.style.left = (e.clientX - this.zone.left) + 'px'; base.style.top = (e.clientY - this.zone.top) + 'px';
      knob.style.transform = '';
      base.classList.remove('hidden');
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== this.id) return;
      const R = this.radius();
      let dx = e.clientX - this.ox, dy = e.clientY - this.oy;
      this.moved = Math.max(this.moved, Math.hypot(dx, dy));
      const d = Math.hypot(dx, dy);
      if (d > R) {
        // Past the edge: drag the stick along so it never runs out.
        this.ox += dx * (1 - R / d); this.oy += dy * (1 - R / d);
        dx = e.clientX - this.ox; dy = e.clientY - this.oy;
        base.style.left = (this.ox - this.zone.left) + 'px'; base.style.top = (this.oy - this.zone.top) + 'px';
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.apply(dx / R, dy / R);
    });
    const up = e => {
      if (e.pointerId !== this.id) return;
      // A quick tap that didn't move: tap the world there instead (dig, build, tap things).
      if (performance.now() - this.t0 < 220 && this.moved < 12) {
        const r = document.getElementById('game').getBoundingClientRect();
        Game.tap((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
      }
      this.release();
    };
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
    if (this.base) this.base.classList.add('hidden');
  },
};
