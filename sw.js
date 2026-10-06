// Offline support: cache every game file on first visit, then play with no connection.
// Serves from the cache first; when online it refreshes the cache in the background,
// so a new version shows up on the next launch. Bump VERSION when files are added or removed.
const VERSION = 'dino-vehicles-v14';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/core.js', 'js/audio.js', 'js/input.js', 'js/draw.js',
  'js/world/tiles.js', 'js/world/gen.js', 'js/world/world.js', 'js/world/render.js', 'js/world/sim.js', 'js/world/fire.js', 'js/world/pickups.js', 'js/world/away.js', 'js/world/moon.js', 'js/world/pilbara.js',
  'js/entities/physics.js', 'js/entities/dino.js', 'js/entities/player.js', 'js/entities/vehicle.js',
  'js/entities/vehicles/construction.js', 'js/entities/vehicles/emergency.js', 'js/entities/vehicles/farm.js',
  'js/entities/vehicles/water.js', 'js/entities/vehicles/air.js', 'js/entities/vehicles/rail.js',
  'js/entities/vehicles/rocket.js', 'js/entities/vehicles/moonbuggy.js', 'js/entities/vehicles/fifo.js', 'js/entities/vehicles/facts.js', 'js/entities/vehicles/registry.js',
  'js/entities/npcs.js', 'js/jobs.js', 'js/eggs.js', 'js/asteroid.js', 'js/chess.js', 'js/ui/menus.js', 'js/ui/hud.js', 'js/ui/install.js', 'js/save.js', 'js/main.js',
];

// Fetch fresh from the network (skip the HTTP cache) and store a clean copy.
// Redirected responses are re-wrapped, because Safari won't use them for page loads.
async function store(cache, url) {
  const res = await fetch(new Request(url, { cache: 'reload' }));
  if (!res.ok) throw new Error(url + ' ' + res.status);
  const clean = res.redirected ? new Response(await res.blob(), { status: 200, headers: res.headers }) : res;
  await cache.put(url, clean);
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // One file at a time with a retry, so one flaky download doesn't spoil the lot.
    for (const f of FILES) {
      try { await store(cache, f); } catch (err) { try { await store(cache, f); } catch (err2) { /* refreshed later when online */ } }
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Only drop old caches once the new one has the game page itself.
    const cache = await caches.open(VERSION);
    if (await cache.match('index.html')) {
      for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

// Which game files are saved, so the page can show "Ready offline".
self.addEventListener('message', e => {
  if (e.data !== 'offline-status') return;
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    let have = 0;
    for (const f of FILES) if (await cache.match(f)) have++;
    e.source.postMessage({ type: 'offline-status', have, total: FILES.length });
  })());
});

async function fromAnyCache(req) {
  const own = await (await caches.open(VERSION)).match(req, { ignoreSearch: true });
  return own || caches.match(req, { ignoreSearch: true });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope);
  // Opening the game's address without the final slash: send it to the right place, even offline.
  if (req.mode === 'navigate' && url.pathname + '/' === scope.pathname) {
    e.respondWith(Response.redirect(scope.href, 302));
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await fromAnyCache(req);
    const fresh = fetch(req).then(res => {
      if (res.ok && !res.redirected) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    const net = await fresh;
    if (net) return net;
    // Offline and not saved: any page load gets the game page.
    if (req.mode === 'navigate') return (await fromAnyCache('index.html')) || (await fromAnyCache('./')) || Response.error();
    return Response.error();
  })());
});
