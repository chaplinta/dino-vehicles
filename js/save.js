// Auto-save to localStorage: world seed + changed tiles + player + stars + vehicles.
const SAVE_KEY = 'dinoVehicles.save.v1';
const Save = {
  timer: 0,
  exists() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
  read() {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  },
  write() {
    if (!Game.worldReady || Game.onMoon) return;   // the Moon isn't saved; Earth's save stays as it was
    const data = {
      v: 1, seed: World.seed, diff: World.serializeDiff(), stars: Game.stars,
      player: { type: Player.type, x: Player.cx, y: Player.vehicle ? Player.vehicle.body.y : Player.body.y },
      vehicles: typeof Vehicles !== 'undefined' ? Vehicles.serialize() : null,
      extra: Game.saveExtra ? Game.saveExtra() : null,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage full or blocked */ }
  },
  update(dt) {
    this.timer += dt;
    if (this.timer > 10) { this.timer = 0; this.write(); }
  },
};
addEventListener('visibilitychange', () => { if (document.hidden) Save.write(); });
addEventListener('pagehide', () => Save.write());
