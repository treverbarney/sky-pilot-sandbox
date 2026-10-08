/* Sky Pilot Sandbox — network-first app shell + CDN; cache fallback offline */
const CACHE = 'sky-pilot-sandbox-v22';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/main.js',
  './js/aircraft-data.js',
  './js/aircraft-info.js',
  './js/hangar-ui.js',
  './js/flight-model.js',
  './js/checklist.js',
  './js/meshes.js',
  './js/world.js',
  './js/controls.js',
  './js/modes.js',
  './js/effects.js',
  './js/hud.js',
  './js/materials.js',
  './js/craft-details.js',
  './js/missions.js',
  './js/weather.js',
  './js/water-ops.js',
  './js/marine.js',
  './js/field-ops.js',
  './js/career.js',
  './js/audio.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
