// Offline support: cache every game file on first visit, then play with no connection.
// Serves from the cache first; when online it refreshes the cache in the background,
// so a new version shows up on the next launch. Bump VERSION when files are added or removed.
const VERSION = 'dino-vehicles-v9';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/core.js', 'js/audio.js', 'js/input.js', 'js/draw.js',
  'js/world/tiles.js', 'js/world/gen.js', 'js/world/world.js', 'js/world/render.js', 'js/world/sim.js', 'js/world/fire.js', 'js/world/pickups.js', 'js/world/moon.js',
  'js/entities/physics.js', 'js/entities/dino.js', 'js/entities/player.js', 'js/entities/vehicle.js',
  'js/entities/vehicles/construction.js', 'js/entities/vehicles/emergency.js', 'js/entities/vehicles/farm.js',
  'js/entities/vehicles/water.js', 'js/entities/vehicles/air.js', 'js/entities/vehicles/rail.js',
  'js/entities/vehicles/rocket.js', 'js/entities/vehicles/moonbuggy.js', 'js/entities/vehicles/registry.js',
  'js/entities/npcs.js', 'js/jobs.js', 'js/eggs.js', 'js/ui/menus.js', 'js/ui/hud.js', 'js/ui/install.js', 'js/save.js', 'js/main.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(res => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || cache.match('index.html');
  }));
});
