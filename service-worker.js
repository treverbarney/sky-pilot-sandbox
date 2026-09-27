/* Sky Pilot Sandbox — network-first app shell + CDN; cache fallback offline */
const CACHE = 'sky-pilot-sandbox-v9';
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
  './js/materials.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isCdn(url) {
  return (
    url.origin.includes('jsdelivr') ||
    url.origin.includes('unpkg') ||
    url.origin.includes('fonts.googleapis') ||
    url.origin.includes('fonts.gstatic') ||
    url.pathname.includes('three')
  );
}

/** App HTML/CSS/JS (and root) — always prefer network so hangar upgrades show */
function isAppShell(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  if (p.endsWith('/') || p.endsWith('/index.html') || p.endsWith('index.html')) return true;
  if (p.includes('/css/') || p.includes('/js/') || p.includes('/assets/')) return true;
  if (/\.(html|css|js|webmanifest)$/i.test(p)) return true;
  return false;
}

function networkFirst(request) {
  return fetch(request)
    .then((res) => {
      if (request.method === 'GET' && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    })
    .catch(() => caches.match(request));
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (isCdn(url) || isAppShell(url)) {
    e.respondWith(networkFirst(e.request));
    return;
  }
  // Icons / other same-origin: cache-first, then network
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((res) => {
          if (e.request.method === 'GET' && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
    )
  );
});
